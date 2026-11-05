const stage = document.getElementById("stage");
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

function parseCrew(text) {
  return String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 3) return { code: parts[0], name: parts[1], role: parts.slice(2).join(" ") };
    const loose = line.split(/\s+/);
    return {
      code: loose.shift() || "",
      role: loose.length > 2 ? loose.slice(-2).join(" ") : "Official",
      name: loose.length > 2 ? loose.slice(0, -2).join(" ") : loose.join(" "),
    };
  });
}

function renderCrew(rows) {
  return rows.slice(0, 8).map(row => `
    <div class="umpire-row">
      <span class="umpire-code">${esc(row.code)}</span>
      <span class="umpire-name">${esc(row.name)}</span>
      <span class="umpire-role">${esc(row.role)}</span>
    </div>
  `).join("");
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const umpires = state.umpires || {};
  const rows = parseCrew(umpires.crewText);
  stage.innerHTML = `
    <section class="umpires-card ${graphicClass(state, "umpires")}">
      <header class="umpires-topbar">
        <span>${esc(umpires.subtitle || state.event.name)}</span>
        <strong>${esc(umpires.title || "OFFICIALS")}</strong>
      </header>
      <div class="umpires-panel">
        <div class="umpires-heading">Game Crew</div>
        <div class="umpires-list">
          ${renderCrew(rows)}
        </div>
        <div class="umpires-footer">
          <span>${esc(state.event.status || "")}</span>
          <span>${esc(state.match.gameId || "BASEBALL5")}</span>
        </div>
      </div>
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
