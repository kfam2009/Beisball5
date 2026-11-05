const stage = document.getElementById("stage");
const side = new URLSearchParams(location.search).get("side") === "home" ? "home" : "away";
const graphicKey = side === "home" ? "rosterHome" : "rosterAway";
let fingerprint = "";
let wasVisible = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function setTheme(theme) {
  for (const [key, value] of Object.entries(theme || {})) {
    document.documentElement.style.setProperty(`--${key}`, value);
  }
}

function scaleStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = `scale(${scale})`;
}

function hiddenClass(state, key) {
  return "";
}

function graphicClass(state, key) {
  const classes = [];
  if (wasVisible !== true) classes.push("is-entering");
  wasVisible = true;
  return classes.join(" ");
}

function settleHidden() {
  requestAnimationFrame(() => {
    stage.querySelectorAll(".is-exiting").forEach(element => element.classList.add("is-hidden"));
  });
}

function parseRows(text) {
  return String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 3) return { number: parts[0], name: parts[1], role: parts.slice(2).join(" ") };
    const loose = line.split(/\s+/);
    return {
      number: loose.shift() || "",
      role: loose.length > 2 ? loose.pop() : "Player",
      name: loose.join(" "),
    };
  });
}

function renderRows(rows) {
  return rows.slice(0, 12).map(row => `
    <div class="roster-row">
      <span class="roster-number">${esc(row.number)}</span>
      <span class="roster-name">${esc(row.name)}</span>
      <span class="roster-role">${esc(row.role)}</span>
    </div>
  `).join("");
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const team = state.match.teams[side];
  const roster = state.rosters?.[side] || {};
  const rows = parseRows(roster.playersText);
  stage.innerHTML = `
    <section class="roster-card ${side} ${graphicClass(state, graphicKey)}">
      <header class="roster-header">
        <div>
          <div class="roster-kicker">${esc(state.rosters?.subtitle || state.event.name)}</div>
          <div class="roster-title">${esc(state.rosters?.title || "TEAM ROSTER")}</div>
        </div>
        <div class="roster-side">${side === "home" ? "HOME" : "AWAY"}</div>
      </header>
      <div class="roster-team-band" style="--team-color:${esc(team.color)}">
        <span class="roster-team-short">${esc(team.short)}</span>
        <strong>${esc(team.name)}</strong>
      </div>
      <div class="roster-table">
        <div class="roster-table-head">
          <span>#</span>
          <span>Name</span>
          <span></span>
        </div>
        ${renderRows(rows)}
      </div>
      <footer class="roster-footer">
        <span>${esc(state.event.status || "")}</span>
        <span>${esc(state.match.gameId || "BASEBALL5")}</span>
      </footer>
    </section>
  `;
  settleHidden();
}

async function loadState() {
  const response = await fetch(`/api/state?t=${Date.now()}`, { cache: "no-store" });
  render(await response.json());
}

function connectEvents() {
  const source = new EventSource("/events");
  source.onmessage = event => render(JSON.parse(event.data));
  source.onerror = () => {
    source.close();
    setTimeout(connectEvents, 1200);
  };
}

window.addEventListener("resize", scaleStage);
scaleStage();
loadState().then(connectEvents);
setInterval(() => loadState().catch(() => {}), 700);
