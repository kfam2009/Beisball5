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

function teamMark(team) {
  if (team.logo) {
    return `<span class="team-logo"><img src="${esc(team.logo)}" alt=""></span>`;
  }
  return `<span class="team-bar" style="background:${esc(team.color)}; color:${esc(team.color)}"></span>`;
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

function teamRow(team, side) {
  const firstSetWon = Number(team.setsWon || 0) >= 1;
  return `
    <div class="team ${side}">${teamMark(team)}${esc(team.short)}</div>
    <div class="set-winner ${side} ${firstSetWon ? "on" : ""}"><span></span></div>
    <div class="score ${side}">${esc(team.score)}</div>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const match = state.match;
  const bases = match.bases || {};
  const outs = [1, 2].map(i => `<span class="out ${match.outs >= i ? "on" : ""}"></span>`).join("");

  stage.innerHTML = `
    <section class="scorebug ${graphicClass(state, "scorebug")}">
      <div class="score-grid">
        ${teamRow(match.teams.away, "away")}
        <div class="set-box"><span>SET</span><strong>${esc(match.set || 1)}</strong></div>
        ${teamRow(match.teams.home, "home")}
      </div>
      <div class="footer">
        <span class="inning-indicator">
          <span class="half-triangle ${match.half === "TOP" ? "top" : "bottom"}"></span>
          <span>${esc(match.inning)}</span>
          ${match.gameId ? `<span class="game-id">| ${esc(match.gameId)}</span>` : ""}
        </span>
        <span class="game-indicators">
          <span class="bases">
            <span class="base first ${bases.first ? "on" : ""}"></span>
            <span class="base second ${bases.second ? "on" : ""}"></span>
            <span class="base third ${bases.third ? "on" : ""}"></span>
          </span>
          <span class="outs">${outs}</span>
        </span>
      </div>
    </section>
    <section class="live ${hiddenClass(state, "scorebug")}"><span class="live-dot"></span>${esc(state.event.status)}</section>
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
