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
    return `<span class="sb-team-logo"><img src="${esc(team.logo)}" alt=""></span>`;
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

function innings(match) {
  const max = Math.max(match.teams.away.line.length, match.teams.home.line.length, Number(match.inning || 1), 5);
  return Array.from({ length: max }, (_, index) => index + 1);
}

function row(team, inningList) {
  const firstSetWon = Number(team.setsWon || 0) >= 1;
  return `
    <tr>
      <td class="sb-team">${teamMark(team)}${esc(team.short)}</td>
      <td class="sb-set-winner ${firstSetWon ? "on" : ""}"><span></span></td>
      ${inningList.map((_, index) => `<td>${esc(team.line[index] ?? "")}</td>`).join("")}
      <td class="sb-total">${esc(team.score)}</td>
    </tr>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const match = state.match;
  const inningList = innings(match);
  stage.innerHTML = `
    <section class="scoreboard-card ${graphicClass(state, "scoreboard")}">
      <header class="scoreboard-header">
        <div>
          <div class="scoreboard-kicker">${esc(state.scoreboard?.subtitle || state.event.name)}</div>
          <div class="scoreboard-title">${esc(state.scoreboard?.title || "LINE SCORE")}</div>
        </div>
        <div class="scoreboard-meta">
          <span>SET ${esc(match.set || 1)}</span>
          <b><i class="half-triangle ${match.half === "TOP" ? "top" : "bottom"}"></i>${esc(match.inning)}${match.gameId ? ` | ${esc(match.gameId)}` : ""}</b>
        </div>
      </header>
      <table class="scoreboard-table">
        <thead>
          <tr>
            <th>TEAM</th>
            <th>SET</th>
            ${inningList.map(i => `<th>${esc(i)}</th>`).join("")}
            <th>R</th>
          </tr>
        </thead>
        <tbody>
          ${row(match.teams.away, inningList)}
          ${row(match.teams.home, inningList)}
        </tbody>
      </table>
      <footer class="scoreboard-footer"></footer>
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
