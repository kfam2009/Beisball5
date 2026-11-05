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

function graphicClass() {
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

function renderGame(game, index) {
  return `
    <article class="upcoming-game">
      <div class="upcoming-index">${index + 1}</div>
      <div class="upcoming-teams">
        <strong>${esc(game.away || "Away")}</strong>
        <span>vs</span>
        <strong>${esc(game.home || "Home")}</strong>
      </div>
      <div class="upcoming-info">
        <span>${esc(game.time || "TBD")}</span>
        <span>${esc(game.court || "Court")}</span>
      </div>
      <div class="upcoming-note">
        <span>${esc(game.round || "")}</span>
        <b>${esc(game.status || "")}</b>
      </div>
    </article>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const data = state.upcoming || {};
  const count = Math.max(1, Math.min(3, Number(data.count || 3)));
  const games = (data.games || []).slice(0, count);
  while (games.length < count) games.push({});

  stage.innerHTML = `
    <section class="upcoming-card count-${count} ${graphicClass()}">
      <header class="upcoming-header">
        <span>${esc(data.subtitle || state.event?.name || "")}</span>
        <strong>${esc(data.title || "UPCOMING GAMES")}</strong>
      </header>
      <div class="upcoming-list">
        ${games.map(renderGame).join("")}
      </div>
      <footer class="upcoming-footer"></footer>
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
