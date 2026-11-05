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

function teamLogo(team) {
  if (!team.logo) return "";
  return `<div class="matchup-logo"><img src="${esc(team.logo)}" alt=""></div>`;
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

function teamPanel(team, side) {
  return `
    <article class="matchup-team ${side}">
      <div class="matchup-color" style="background:${esc(team.color)}"></div>
      ${teamLogo(team)}
      <div class="matchup-short">${esc(team.short)}</div>
      <div class="matchup-name">${esc(team.name)}</div>
    </article>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const matchup = state.matchup || {};
  const match = state.match;
  const titleScale = Math.max(.75, Math.min(1.2, Number(matchup.titleScale || 1)));
  stage.innerHTML = `
    <section class="matchup-card ${graphicClass(state, "matchup")}">
      <div class="matchup-ribbon" style="--matchup-title-scale:${titleScale}">
        <span>${esc(matchup.subtitle || state.event.name)}</span>
        <strong>${esc(matchup.title || "MATCHUP")}</strong>
      </div>
      <div class="matchup-main">
        ${teamPanel(match.teams.away, "away")}
        <div class="matchup-vs">
          <span>VS</span>
          <b>${esc(matchup.round || "Group Stage")}</b>
        </div>
        ${teamPanel(match.teams.home, "home")}
      </div>
      <footer class="matchup-footer">
        <span>${esc(matchup.venue || "")}</span>
        <span>${esc(state.event.status || "")}</span>
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
