let state = null;
let saveTimer = null;
let monitorOverride = null;
let events = null;
let lastKnownSet = null;

const fields = [...document.querySelectorAll("[data-path]")];
const statusEl = document.getElementById("status");
const playerPicker = document.getElementById("player-picker");
const baseToggles = [...document.querySelectorAll("[data-base-toggle]")];
const setWinnerToggles = [...document.querySelectorAll("[data-set-winner]")];
const teamLogoOptions = [
  { value: "", label: "No logo" },
  {
    value: "assets/logos/cultural-avellaneda.png",
    label: "Club Avellaneda",
    name: "Club Avellaneda",
    short: "AVE",
    color: "#e42f25"
  },
  {
    value: "assets/logos/ncm.png",
    label: "Midland",
    name: "Midland",
    short: "MID",
    color: "#123f9d"
  },
  {
    value: "assets/logos/club-winners.png",
    label: "El Propio - Winners",
    name: "El Propio - Winners",
    short: "WIN",
    color: "#173b7a"
  },
  {
    value: "assets/logos/club-san-pedro.png",
    label: "Club San Pedro",
    name: "Club San Pedro",
    short: "SP",
    color: "#20a8b4"
  }
];
let currentTab = "scorebug";

const graphics = {
  scorebug: { label: "Scorebug" },
  scoreboard: { label: "Scoreboard" },
  matchup: { label: "Matchup" },
  rosterAway: { label: "Away Roster" },
  rosterHome: { label: "Home Roster" },
  umpires: { label: "Umpires" },
  player: { label: "Player" },
  commentators: { label: "Commentators" },
  upcoming: { label: "Upcoming" }
};
const tabPreviewGraphic = {
  scorebug: "scorebug",
  scoreboard: "scoreboard",
  matchup: "matchup",
  rosters: "rosterHome",
  umpires: "umpires",
  player: "player",
  commentators: "commentators",
  upcoming: "upcoming"
};
const openReplayPanelButton = document.getElementById("open-replay-panel");
const openRenderLink = document.getElementById("open-render");
const previewMonitor = document.getElementById("preview-monitor");
const previewFrame = document.getElementById("preview-frame");
const previewClose = document.getElementById("preview-close");
const previewTitle = document.getElementById("preview-monitor-title");

document.querySelectorAll("[data-url]").forEach(element => {
  element.textContent = `${location.origin}/graphics.html`;
});

document.querySelectorAll('select[data-path$=".logo"]').forEach(select => {
  select.innerHTML = teamLogoOptions
    .map(option => `<option value="${option.value}">${option.label}</option>`)
    .join("");
});

document.querySelectorAll("[data-overlay-in]").forEach(button => button.textContent = "In");
document.querySelectorAll("[data-overlay-out]").forEach(button => button.textContent = "Out");
document.querySelectorAll("[data-path^='vmix.']").forEach(field => {
  const label = field.closest("label");
  if (label) label.style.display = "none";
});
document.querySelectorAll("h2").forEach(title => {
  title.textContent = title.textContent.replace("vMix Setup", "NDI Output");
});

document.querySelectorAll("[data-window-action]").forEach(button => {
  button.addEventListener("click", () => {
    const api = window.b5PanelWindow;
    if (!api) {
      setStatus("Window controls are available in kiosk panel mode.", true);
      return;
    }
    const action = button.dataset.windowAction;
    if (action === "prev") api.movePrev();
    if (action === "next") api.moveNext();
    if (action === "fullscreen") api.toggleFullscreen();
    if (action === "close") api.close();
  });
});

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function getPath(object, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], object);
}

function setPath(object, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!acc[part] || typeof acc[part] !== "object") acc[part] = {};
    return acc[part];
  }, object);
  target[last] = value;
}

function parseValue(path, value, type) {
  if (type === "number") return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (path.endsWith(".line")) {
    return String(value).split(",").map(item => Number(item.trim()) || 0);
  }
  return value;
}

function formatValue(path, value) {
  if (value === undefined || value === null) return "";
  if (path.endsWith(".line") && Array.isArray(value)) return value.join(",");
  return value;
}

function ensureStateDefaults() {
  state.event ||= { name: "Panamericano de Clubes", status: "LIVE" };
  state.match ||= {};
  state.match.gameId ||= "";
  state.match.gameId = String(state.match.gameId || "").trim();
  state.match.set ||= 1;
  state.match.inning ||= 1;
  state.match.half ||= "TOP";
  state.match.outs ||= 0;
  state.match.bases ||= { first: false, second: false, third: false };
  state.match.teams ||= {};
  state.match.teams.away ||= {};
  state.match.teams.home ||= {};
  state.match.teams.away.name ||= "Brazil";
  state.match.teams.away.short ||= "BRA";
  state.match.teams.away.color ||= "#1f9d55";
  state.match.teams.away.logo ||= "";
  state.match.teams.away.score ||= 0;
  state.match.teams.away.line ||= [0, 0, 0, 0, 0];
  state.match.teams.away.setsWon ||= 0;
  state.match.teams.home.name ||= "Argentina";
  state.match.teams.home.short ||= "ARG";
  state.match.teams.home.color ||= "#62b5e5";
  state.match.teams.home.logo ||= "";
  state.match.teams.home.score ||= 0;
  state.match.teams.home.line ||= [0, 0, 0, 0, 0];
  state.match.teams.home.setsWon ||= 0;
  state.scoreboard ||= { title: "LINE SCORE", subtitle: state.event.name };
  state.matchup ||= { title: "MATCHUP", subtitle: state.event.name, round: "Group Stage", venue: "Buenos Aires, Argentina", titleScale: 1 };
  state.rosters ||= { title: "TEAM ROSTER", subtitle: state.event.name, away: { playersText: "" }, home: { playersText: "" } };
  state.rosters.away ||= { playersText: "" };
  state.rosters.home ||= { playersText: "" };
  state.umpires ||= { title: "OFFICIALS", subtitle: state.event.name, crewText: "" };
  state.player ||= { title: "PLAYER", subtitle: state.event.name, teamSide: "home", number: "", name: "", detail: "" };
  state.commentators ||= { title: "COMMENTATORS", subtitle: state.event.name, layout: "two", name1: "", role1: "Play-by-play", name2: "", role2: "Analyst" };
  state.upcoming ||= {
    title: "UPCOMING GAMES",
    subtitle: state.event.name,
    count: "3",
    games: [
      { away: "Brazil", home: "Argentina", time: "18:00", court: "Court 1", round: "Group Stage", status: "Next" },
      { away: "Chile", home: "Uruguay", time: "19:00", court: "Court 1", round: "Group Stage", status: "Game 2" },
      { away: "Peru", home: "Colombia", time: "20:00", court: "Court 1", round: "Group Stage", status: "Game 3" }
    ]
  };
  state.upcoming.games ||= [];
  while (state.upcoming.games.length < 3) state.upcoming.games.push({ away: "", home: "", time: "", court: "", round: "", status: "" });
  state.ndi ||= {};
  state.ndi.sourceName ||= "B5 Scorebug";
  state.ndi.width ||= 1920;
  state.ndi.height ||= 1080;
  state.ndi.fps ||= 30;
  state.ndi.alpha = state.ndi.alpha !== false;
  state.ndi.activeGraphic ||= "scorebug";
  if (state.ndi.scorebugVisible === undefined) state.ndi.scorebugVisible = state.ndi.activeGraphic === "scorebug" && state.ndi.visible !== false;
  if (state.ndi.playerVisible === undefined) state.ndi.playerVisible = state.ndi.activeGraphic === "player" && state.ndi.visible !== false;
  if (state.ndi.visible === undefined) state.ndi.visible = true;
  state.excel ||= { home: [], away: [] };
}

function fillForm() {
  if (!state) return;
  lastKnownSet = Number(state.match?.set || 1);
  for (const field of fields) {
    const path = field.dataset.path;
    const value = formatValue(path, getPath(state, path));
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
    if (path.endsWith(".logo")) renderLogoPreview(field);
  }
  fillPlayerPicker();
  renderBaseControl();
  renderSetWinnerControl();
  renderNdiButtons();
}

function renderLogoPreview(field) {
  if (!field.dataset.path.endsWith(".logo")) return;
  const label = field.closest("label");
  if (!label) return;
  let preview = label.querySelector(".logo-picker-preview");
  if (!preview) {
    preview = document.createElement("span");
    preview.className = "logo-picker-preview";
    label.appendChild(preview);
  }
  preview.innerHTML = field.value ? `<img src="${field.value}" alt="">` : "<b>No logo</b>";
}

function applyTeamLogoPreset(field) {
  const preset = teamLogoOptions.find(option => option.value === field.value);
  if (!preset?.name) return;
  const side = field.dataset.path.includes(".away.") ? "away" : "home";
  state.match.teams[side].name = preset.name;
  state.match.teams[side].short = preset.short;
  state.match.teams[side].color = preset.color;
  fillForm();
}

function readForm() {
  for (const field of fields) {
    const path = field.dataset.path;
    const value = field.type === "checkbox" ? field.checked : field.value;
    setPath(state, path, parseValue(path, value, field.type));
  }
}

function renderBaseControl() {
  for (const button of baseToggles) {
    const base = button.dataset.baseToggle;
    const isOn = Boolean(state.match.bases[base]);
    button.classList.toggle("on", isOn);
    button.setAttribute("aria-pressed", String(isOn));
  }
}

function renderSetWinnerControl() {
  const awayWon = Number(state.match.teams.away.setsWon || 0) >= 1;
  const homeWon = Number(state.match.teams.home.setsWon || 0) >= 1;
  for (const button of setWinnerToggles) {
    const side = button.dataset.setWinner;
    const team = state.match.teams[side];
    const isOn = side === "away" ? awayWon : homeWon;
    button.classList.toggle("on", isOn);
    button.style.setProperty("--winner-color", team.color || "var(--gold)");
    button.querySelector("b").textContent = team.short || side;
  }
}

function renderNdiButtons() {
  document.querySelectorAll("[data-overlay-in]").forEach(button => {
    const key = button.dataset.overlayIn;
    let isActive = state.ndi.visible && state.ndi.activeGraphic === key;
    if (key === "scorebug") isActive = Boolean(state.ndi.scorebugVisible);
    if (key === "player") isActive = Boolean(state.ndi.playerVisible);
    button.classList.toggle("active-ndi", isActive);
  });
}

function fillPlayerPicker() {
  if (!playerPicker || !state) return;
  const side = state.player.teamSide === "away" ? "away" : "home";
  const players = (state.excel?.[side] || []).filter(row => String(row.role || "").toLowerCase() !== "head coach");
  playerPicker.innerHTML = "";
  if (!players.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Manual entry";
    playerPicker.appendChild(option);
    return;
  }
  for (const player of players) {
    const option = document.createElement("option");
    option.value = JSON.stringify(player);
    option.textContent = `${player.number} | ${player.name} | ${player.role}`;
    option.selected = String(player.number) === String(state.player.number) && player.name === state.player.name;
    playerPicker.appendChild(option);
  }
}

async function load() {
  const response = await fetch("/api/state", { cache: "no-store" });
  state = await response.json();
  ensureStateDefaults();
  fillForm();
  setStatus(`Loaded. NDI active: ${graphics[state.ndi.activeGraphic]?.label || state.ndi.activeGraphic}.`);
}

async function save() {
  readForm();
  ensureStateDefaults();
  const response = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });
  if (!response.ok) throw new Error("Could not save.");
  const payload = await response.json();
  if (payload?.state) {
    state = payload.state;
    ensureStateDefaults();
    fillForm();
  }
  renderNdiButtons();
  setStatus(`Saved. NDI: ${state.ndi.visible ? graphics[state.ndi.activeGraphic]?.label : "Hidden"}.`);
}

function applyRemoteState(nextState, message = "Panel synced.") {
  if (!nextState) return;
  clearTimeout(saveTimer);
  state = nextState;
  ensureStateDefaults();
  fillForm();
  updatePreviewFrame();
  setStatus(message);
}

function connectStateEvents() {
  if (!window.EventSource || events) return;
  events = new EventSource("/events");
  events.onmessage = event => {
    try {
      applyRemoteState(JSON.parse(event.data), "Panel synced.");
    } catch (error) {
      setStatus(`Sync error: ${error.message}`, true);
    }
  };
  events.onerror = () => {
    setStatus("Panel sync reconnecting...", true);
  };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save().catch(error => setStatus(error.message, true)), 180);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLine(team, inning) {
  const requiredLength = Math.max(5, Number(inning || 1));
  team.line = Array.isArray(team.line) ? team.line.map(value => Number(value) || 0) : [];
  while (team.line.length < requiredLength) team.line.push(0);
  return team.line;
}

function changeTeamScoreForInning(team, inning, delta) {
  const line = normalizeLine(team, inning);
  const index = Math.max(0, Number(inning || 1) - 1);
  const nextLineValue = Math.max(0, Number(line[index] || 0) + delta);
  const appliedDelta = nextLineValue - Number(line[index] || 0);

  line[index] = nextLineValue;
  team.score = Math.max(0, Number(team.score || 0) + appliedDelta);
}

function resetSetScore() {
  state.match.inning = 1;
  state.match.half = "TOP";
  state.match.outs = 0;
  state.match.bases = { first: false, second: false, third: false };
  state.match.teams.away.score = 0;
  state.match.teams.home.score = 0;
  state.match.teams.away.line = [0, 0, 0, 0, 0];
  state.match.teams.home.line = [0, 0, 0, 0, 0];
}

function quick(action) {
  readForm();
  if (action === "out-minus") state.match.outs = clamp(Number(state.match.outs || 0) - 1, 0, 2);
  if (action === "out-plus") state.match.outs = clamp(Number(state.match.outs || 0) + 1, 0, 2);
  if (action === "inning-plus") state.match.inning = Number(state.match.inning || 1) + 1;
  if (action === "set-plus") {
    state.match.set = Number(state.match.set || 1) + 1;
    resetSetScore();
  }
  if (action === "set-minus") {
    state.match.set = Math.max(1, Number(state.match.set || 1) - 1);
    resetSetScore();
  }
  if (action === "swap-half") state.match.half = state.match.half === "TOP" ? "BOTTOM" : "TOP";
  if (action === "away-minus") changeTeamScoreForInning(state.match.teams.away, state.match.inning, -1);
  if (action === "away-plus") changeTeamScoreForInning(state.match.teams.away, state.match.inning, 1);
  if (action === "home-minus") changeTeamScoreForInning(state.match.teams.home, state.match.inning, -1);
  if (action === "home-plus") changeTeamScoreForInning(state.match.teams.home, state.match.inning, 1);
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

function showGraphic(graphic) {
  readForm();
  if (graphic === "scorebug") {
    state.ndi.scorebugVisible = true;
    state.ndi.visible = true;
    if (state.ndi.activeGraphic !== "player") state.ndi.activeGraphic = "scorebug";
    fillForm();
    save().catch(error => setStatus(error.message, true));
    return;
  }
  if (graphic === "player") {
    state.ndi.playerVisible = true;
    state.ndi.visible = true;
    if (state.ndi.activeGraphic !== "scorebug") state.ndi.activeGraphic = "player";
    fillForm();
    save().catch(error => setStatus(error.message, true));
    return;
  }
  state.ndi.activeGraphic = graphic;
  state.ndi.visible = true;
  state.ndi.scorebugVisible = false;
  state.ndi.playerVisible = false;
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

function hideGraphic(graphic) {
  readForm();
  if (graphic === "scorebug") {
    state.ndi.scorebugVisible = false;
    if (!state.ndi.playerVisible) state.ndi.visible = false;
    else state.ndi.activeGraphic = "player";
    fillForm();
    save().catch(error => setStatus(error.message, true));
    return;
  }
  if (graphic === "player") {
    state.ndi.playerVisible = false;
    if (!state.ndi.scorebugVisible) state.ndi.visible = false;
    else state.ndi.activeGraphic = "scorebug";
    fillForm();
    save().catch(error => setStatus(error.message, true));
    return;
  }
  if (!graphic || state.ndi.activeGraphic === graphic) state.ndi.visible = false;
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

function switchTab(tab) {
  currentTab = tab;
  monitorOverride = null;
  document.querySelectorAll(".tab-btn").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tab));
  updatePreviewFrame();
}

function previewUrl() {
  const previewGraphic = monitorOverride || tabPreviewGraphic[currentTab] || "scorebug";
  return `graphics.html?preview=${encodeURIComponent(previewGraphic)}`;
}

function updatePreviewFrame() {
  if (!previewMonitor || previewMonitor.hidden) return;
  const previewGraphic = monitorOverride || tabPreviewGraphic[currentTab] || "scorebug";
  previewTitle.textContent = `Preview: ${graphics[previewGraphic]?.label || previewGraphic}`;
  const nextUrl = previewUrl();
  if (!previewFrame.src.endsWith(nextUrl)) previewFrame.src = nextUrl;
}

function toggleSetWinner(side) {
  readForm();
  const team = state.match.teams[side];
  const isOn = Number(team.setsWon || 0) >= 1;
  team.setsWon = isOn ? 0 : 1;
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

function toggleBase(base) {
  readForm();
  state.match.bases[base] = !state.match.bases[base];
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

function setPlayerFromPicker() {
  if (!playerPicker?.value) return;
  readForm();
  const player = JSON.parse(playerPicker.value);
  const side = state.player.teamSide === "away" ? "away" : "home";
  state.player.number = player.number;
  state.player.name = player.name;
  state.player.detail = state.match.teams[side].name || player.role || "";
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

document.getElementById("save").addEventListener("click", () => save().catch(error => setStatus(error.message, true)));
document.getElementById("reload").addEventListener("click", () => load().catch(error => setStatus(error.message, true)));
openRenderLink?.addEventListener("click", () => {
  previewMonitor.hidden = false;
  updatePreviewFrame();
});
document.querySelectorAll("[data-monitor]").forEach(button => {
  button.addEventListener("click", () => {
    monitorOverride = button.dataset.monitor;
    previewMonitor.hidden = false;
    updatePreviewFrame();
  });
});
previewClose?.addEventListener("click", () => {
  previewMonitor.hidden = true;
  previewFrame.removeAttribute("src");
});

openReplayPanelButton?.addEventListener("click", async () => {
  try {
    if (window.b5PanelWindow?.openReplay) {
      const payload = await window.b5PanelWindow.openReplay();
      if (!payload?.ok) throw new Error(payload?.error || "Could not open Replay panel.");
      setStatus(payload.mode === "started" ? "Opening Panel Replay." : "Panel Replay opened.");
      return;
    }

    const response = await fetch("/api/replay/open", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not open Replay panel.");
    setStatus(payload.mode === "started" ? "Opening Panel Replay." : "Panel Replay opened.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

async function importExcelData() {
  clearTimeout(saveTimer);
  setStatus("Syncing Excel...");
  const response = await fetch("/api/import-excel", { method: "POST" });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not import Excel data.");
  applyRemoteState(payload.state, "Excel synced. Rosters, umpires and player lists updated.");
  updatePreviewFrame();
  setStatus("Excel synced. Rosters, umpires and player lists updated.");
}

document.getElementById("import-excel-global")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel-umpires")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel-player")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
playerPicker?.addEventListener("change", setPlayerFromPicker);

document.querySelectorAll("[data-overlay-in]").forEach(button => {
  button.addEventListener("click", () => showGraphic(button.dataset.overlayIn));
});

document.querySelectorAll("[data-overlay-out]").forEach(button => {
  button.addEventListener("click", () => hideGraphic(button.dataset.overlayOut));
});

document.querySelectorAll(".tab-btn").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => quick(button.dataset.action)));
baseToggles.forEach(button => button.addEventListener("click", () => toggleBase(button.dataset.baseToggle)));
setWinnerToggles.forEach(button => button.addEventListener("click", () => toggleSetWinner(button.dataset.setWinner)));

fields.forEach(field => {
  field.addEventListener("input", scheduleSave);
  field.addEventListener("change", () => {
    if (field.dataset.path.endsWith(".logo")) {
      readForm();
      applyTeamLogoPreset(field);
      renderLogoPreview(field);
    }
    if (field.dataset.path === "match.set") {
      readForm();
      const nextSet = Number(state.match.set || 1);
      if (lastKnownSet !== null && nextSet !== lastKnownSet) {
        resetSetScore();
        lastKnownSet = nextSet;
        fillForm();
      }
    }
    if (field.dataset.path === "player.teamSide") {
      readForm();
      fillPlayerPicker();
    }
    scheduleSave();
  });
});

load()
  .then(connectStateEvents)
  .catch(error => setStatus(error.message, true));

const initialTab = new URLSearchParams(location.search).get("tab");
if (initialTab && document.querySelector(`[data-panel="${initialTab}"]`)) switchTab(initialTab);
