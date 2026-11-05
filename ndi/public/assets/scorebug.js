const stage = document.getElementById("stage");
let fingerprint = "";
let hasRendered = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function setTheme(theme) {
  for (const [key, value] of Object.entries(theme || {})) {
    document.documentElement.style.setProperty(`--${key}`, value);
  }
}

function gameIdText(match) {
  return String(match.gameId || "").trim();
}

function scaleStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = `scale(${scale})`;
}

function teamMark(team) {
  if (team.logo) {
    return `<span class="team-logo"><img src="${esc(team.logo)}" alt=""></span>`;
  }
  return `<span class="team-logo team-logo-empty">${esc(team.short || "")}</span>`;
}

function teamRow(team, side) {
  const setWon = Number(team.setsWon || 0) >= 1;
  return `
    <div class="team ${side}">${teamMark(team)}${esc(team.short)}</div>
    <div class="set-winner ${side} ${setWon ? "on" : ""}"><span></span></div>
    <div class="score ${side}">${esc(team.score)}</div>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const match = state.match;
  const gameId = gameIdText(match);
  const bases = match.bases || {};
  const outs = [1, 2].map(i => `<span class="out ${match.outs >= i ? "on" : ""}"></span>`).join("");
  const enteringClass = hasRendered ? "" : "is-entering";

  stage.innerHTML = `
    <section class="scorebug ${enteringClass}">
      <div class="score-grid">
        ${teamRow(match.teams.away, "away")}
        <div class="set-box"><span>SET</span><strong>${esc(match.set || 1)}</strong></div>
        ${teamRow(match.teams.home, "home")}
      </div>
      <div class="footer">
        <span class="inning-indicator">
          <span class="half-triangle ${match.half === "TOP" ? "top" : "bottom"}"></span>
          <span>${esc(match.inning)}</span>
          ${gameId ? `<span class="game-id">| ${esc(gameId)}</span>` : ""}
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
    <section class="live"><span class="live-dot"></span>${esc(state.event.status)}</section>
  `;
  hasRendered = true;
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
setInterval(() => loadState().catch(() => {}), 1000);
