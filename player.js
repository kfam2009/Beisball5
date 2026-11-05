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

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const player = state.player || {};
  const teamSide = player.teamSide === "away" ? "away" : "home";
  const team = state.match.teams[teamSide];
  stage.innerHTML = `
    <section class="player-card ${graphicClass(state, "player")}" style="--team-color:${esc(team.color)}">
      <div class="player-id">
        <div class="player-team">${esc(team.name)}</div>
        <div class="player-main">
          <div class="player-number">${esc(player.number)}</div>
          <div>
            <div class="player-name">${esc(player.name || "Player Name")}</div>
            <div class="player-detail">${esc(player.detail || team.short)}</div>
          </div>
        </div>
        <div class="player-strip"></div>
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
