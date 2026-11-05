let state = null;
let saveTimer = null;
const fields = [...document.querySelectorAll("[data-path]")];
const statusEl = document.getElementById("status");
const playerPicker = document.getElementById("player-picker");
const baseToggles = [...document.querySelectorAll("[data-base-toggle]")];
const setWinnerToggles = [...document.querySelectorAll("[data-set-winner]")];
const teamLogoOptions = [
  { value: "", label: "No logo" },
  { value: "assets/logos/cas-softbol.png", label: "CAS Softbol" },
  { value: "assets/logos/cultural-avellaneda.png", label: "C.D.Y Cultural" },
  { value: "assets/logos/db5cas.png", label: "DB5CAS" },
  { value: "assets/logos/ncm.png", label: "NCM" },
  { value: "assets/logos/panamericas.png", label: "Panamericas" },
];
const graphics = {
  scorebug: {
    label: "Scorebug",
    url: `${location.origin}/scorebug.html`,
    inputPath: "vmix.input",
  },
  scoreboard: {
    label: "Scoreboard",
    url: `${location.origin}/scoreboard.html`,
    inputPath: "vmix.scoreboardInput",
  },
  matchup: {
    label: "Matchup",
    url: `${location.origin}/matchup.html`,
    inputPath: "vmix.matchupInput",
  },
  rosterAway: {
    label: "Away Roster",
    url: `${location.origin}/roster.html?side=away`,
    inputPath: "vmix.rosterAwayInput",
  },
  rosterHome: {
    label: "Home Roster",
    url: `${location.origin}/roster.html?side=home`,
    inputPath: "vmix.rosterHomeInput",
  },
  umpires: {
    label: "Umpires",
    url: `${location.origin}/umpires.html`,
    inputPath: "vmix.umpiresInput",
  },
  player: {
    label: "Player",
    url: `${location.origin}/player.html`,
    inputPath: "vmix.playerInput",
  },
  commentators: {
    label: "Commentators",
    url: `${location.origin}/commentators.html`,
    inputPath: "vmix.commentatorsInput",
  },
  upcoming: {
    label: "Upcoming",
    url: `${location.origin}/upcoming.html`,
    inputPath: "vmix.upcomingInput",
  },
};

document.querySelectorAll("[data-url]").forEach(element => {
  element.textContent = graphics[element.dataset.url].url;
});

document.querySelectorAll('select[data-path$=".logo"]').forEach(select => {
  select.innerHTML = teamLogoOptions
    .map(option => `<option value="${option.value}">${option.label}</option>`)
    .join("");
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
    return value.split(",").map(item => Number(item.trim()) || 0);
  }
  return value;
}

function formatValue(path, value) {
  if (value === undefined || value === null) return "";
  if (path.endsWith(".line") && Array.isArray(value)) return value.join(",");
  return value;
}

function fillForm() {
  for (const field of fields) {
    const path = field.dataset.path;
    field.value = formatValue(path, getPath(state, path));
    if (path.endsWith(".logo")) renderLogoPreview(field);
  }
  fillPlayerPicker();
  renderBaseControl();
  renderSetWinnerControl();
}

function readForm() {
  for (const field of fields) {
    const path = field.dataset.path;
    setPath(state, path, parseValue(path, field.value, field.type));
  }
}

function renderBaseControl() {
  if (!state?.match?.bases) return;
  for (const button of baseToggles) {
    const base = button.dataset.baseToggle;
    const isOn = Boolean(state.match.bases[base]);
    button.classList.toggle("on", isOn);
    button.setAttribute("aria-pressed", String(isOn));
    button.title = `${base[0].toUpperCase()}${base.slice(1)} base: ${isOn ? "Occupied" : "Empty"}`;
  }
}

function renderSetWinnerControl() {
  if (!state?.match?.teams) return;
  const awayWon = Number(state.match.teams.away?.setsWon || 0) >= 1;
  const homeWon = Number(state.match.teams.home?.setsWon || 0) >= 1;
  for (const button of setWinnerToggles) {
    const side = button.dataset.setWinner;
    const team = state.match.teams[side];
    const isOn = side === "away" ? awayWon : homeWon;
    button.classList.toggle("on", isOn);
    button.style.setProperty("--winner-color", team?.color || "var(--gold)");
    button.setAttribute("aria-pressed", String(isOn));
    const label = team?.short || (side === "away" ? "Away" : "Home");
    button.querySelector("b").textContent = label;
    button.title = `${label}: ${isOn ? "Won set 1" : "Did not win set 1"}`;
  }
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

function toggleSetWinner(side) {
  readForm();
  state.match.teams.away.setsWon = Number(state.match.teams.away.setsWon || 0);
  state.match.teams.home.setsWon = Number(state.match.teams.home.setsWon || 0);
  const isOn = Number(state.match.teams[side].setsWon || 0) >= 1;
  state.match.teams.away.setsWon = 0;
  state.match.teams.home.setsWon = 0;
  if (!isOn) state.match.teams[side].setsWon = 1;
  renderSetWinnerControl();
  save().catch(error => setStatus(error.message, true));
}

function toggleBase(base) {
  readForm();
  state.match.bases ||= {};
  state.match.bases[base] = !state.match.bases[base];
  renderBaseControl();
  save().catch(error => setStatus(error.message, true));
}

async function load() {
  const response = await fetch("/api/state", { cache: "no-store" });
  state = await response.json();
  state.match ||= {};
  state.match.set ||= 1;
  state.match.teams ||= {};
  state.match.teams.away ||= {};
  state.match.teams.home ||= {};
  state.match.teams.away.logo ||= "";
  state.match.teams.home.logo ||= "";
  state.match.teams.away.setsWon ||= 0;
  state.match.teams.home.setsWon ||= 0;
  state.scoreboard ||= { title: "LINE SCORE", subtitle: state.event?.name || "" };
  state.matchup ||= {
    title: "MATCHUP",
    subtitle: state.event?.name || "",
    round: "Group Stage",
    venue: "Buenos Aires, Argentina",
    titleScale: 1,
  };
  state.matchup.titleScale ||= 1;
  state.rosters ||= {
    title: "TEAM ROSTER",
    subtitle: state.event?.name || "",
    away: { playersText: "" },
    home: { playersText: "" },
  };
  state.rosters.away ||= { playersText: "" };
  state.rosters.home ||= { playersText: "" };
  state.umpires ||= {
    title: "OFFICIALS",
    subtitle: state.event?.name || "",
    crewText: "",
  };
  state.player ||= {
    title: "PLAYER",
    subtitle: state.event?.name || "",
    teamSide: "home",
    number: "",
    name: "",
    detail: "",
  };
  state.commentators ||= {
    title: "COMMENTATORS",
    subtitle: state.event?.name || "",
    layout: "two",
    name1: "Commentator One",
    role1: "Play-by-play",
    name2: "Commentator Two",
    role2: "Analyst",
  };
  state.upcoming ||= {
    title: "UPCOMING GAMES",
    subtitle: state.event?.name || "",
    count: "3",
    games: [
      { away: "Brazil", home: "Argentina", time: "18:00", court: "Court 1", round: "Group Stage", status: "Next" },
      { away: "Chile", home: "Uruguay", time: "19:00", court: "Court 1", round: "Group Stage", status: "Game 2" },
      { away: "Peru", home: "Colombia", time: "20:00", court: "Court 1", round: "Group Stage", status: "Game 3" },
    ],
  };
  state.upcoming.games ||= [];
  while (state.upcoming.games.length < 3) {
    state.upcoming.games.push({ away: "", home: "", time: "", court: "", round: "", status: "" });
  }
  state.excel ||= { home: [], away: [] };
  state.visibility ||= {};
  Object.keys(graphics).forEach(key => {
    if (state.visibility[key] === undefined) state.visibility[key] = true;
  });
  state.vmix ||= {};
  state.vmix.scoreboardInput ||= "";
  state.vmix.matchupInput ||= "";
  state.vmix.rosterAwayInput ||= "";
  state.vmix.rosterHomeInput ||= "";
  state.vmix.umpiresInput ||= "";
  state.vmix.playerInput ||= "";
  state.vmix.commentatorsInput ||= "";
  state.vmix.upcomingInput ||= "";
  let excelOk = false;
  try {
    const importResponse = await fetch("/api/import-excel", { method: "POST" });
    const payload = await importResponse.json();
    if (importResponse.ok && payload.ok) {
      state = payload.state;
      excelOk = true;
    }
  } catch {}
  fillForm();
  if (excelOk) setStatus("Loaded saved data. Excel synced.");
  else setStatus("Loaded saved data. Excel could not be synced.", true);
}

function playerLabel(row) {
  return `${row.number} | ${row.name} | ${row.role}`;
}

function fillPlayerPicker() {
  if (!playerPicker || !state) return;
  const side = state.player?.teamSide === "away" ? "away" : "home";
  const players = (state.excel?.[side] || []).filter(row => String(row.role || "").toLowerCase() !== "head coach");
  playerPicker.innerHTML = "";
  if (!players.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sync Excel first";
    playerPicker.appendChild(option);
    return;
  }
  for (const player of players) {
    const option = document.createElement("option");
    option.value = JSON.stringify(player);
    option.textContent = playerLabel(player);
    option.selected = String(player.number) === String(state.player.number) && player.name === state.player.name;
    playerPicker.appendChild(option);
  }
}

async function importExcelData() {
  const response = await fetch("/api/import-excel", { method: "POST" });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not import Excel data.");
  state = payload.state;
  fillForm();
  setStatus("Excel synced. Rosters, umpires and player lists updated.");
}

function setPlayerFromPicker() {
  if (!playerPicker?.value) return;
  readForm();
  const player = JSON.parse(playerPicker.value);
  const side = state.player.teamSide === "away" ? "away" : "home";
  state.player.number = player.number;
  state.player.name = player.name;
  state.player.detail = state.match?.teams?.[side]?.name || player.role || "";
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

async function save() {
  readForm();
  const response = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error("Could not save.");
  setStatus("Changes saved. Browser graphics updated.");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save().catch(error => setStatus(error.message, true)), 200);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function quick(action) {
  readForm();
  if (action === "out-minus") state.match.outs = clamp(state.match.outs - 1, 0, 2);
  if (action === "out-plus") state.match.outs = clamp(state.match.outs + 1, 0, 2);
  if (action === "inning-plus") state.match.inning += 1;
  if (action === "swap-half") state.match.half = state.match.half === "TOP" ? "BOT" : "TOP";
  if (action === "away-minus") state.match.teams.away.score = Math.max(0, state.match.teams.away.score - 1);
  if (action === "away-plus") state.match.teams.away.score += 1;
  if (action === "home-minus") state.match.teams.home.score = Math.max(0, state.match.teams.home.score - 1);
  if (action === "home-plus") state.match.teams.home.score += 1;
  fillForm();
  save().catch(error => setStatus(error.message, true));
}

async function callVmix(functionName, input, value) {
  readForm();
  await save();
  const response = await fetch("/api/vmix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ function: functionName, input, value }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "vMix command failed.");
  }
  setStatus(`vMix: ${functionName} sent.`);
  return payload;
}

function selectedInput(graphic, required = true) {
  readForm();
  const input = getPath(state, graphics[graphic].inputPath);
  if (required && !input) throw new Error(`Enter the ${graphics[graphic].label} input # from vMix first.`);
  return input;
}

function cacheBustedUrl(graphic) {
  const url = graphics[graphic].url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

async function refreshGraphic(graphic) {
  await save();
  await callVmix("BrowserNavigate", selectedInput(graphic), cacheBustedUrl(graphic));
  setStatus(`${graphics[graphic].label} hard refreshed in vMix.`);
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

document.getElementById("save").addEventListener("click", () => save().catch(error => setStatus(error.message, true)));
document.getElementById("reload").addEventListener("click", () => load().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel-global")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel-umpires")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
document.getElementById("import-excel-player")?.addEventListener("click", () => importExcelData().catch(error => setStatus(error.message, true)));
playerPicker?.addEventListener("change", setPlayerFromPicker);

document.querySelectorAll("[data-add]").forEach(button => button.addEventListener("click", async () => {
  try {
    const graphic = button.dataset.add;
    await save();
    const response = await fetch("/api/vmix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ function: "AddInput", value: `Browser|${cacheBustedUrl(graphic)}` }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `Could not add ${graphics[graphic].label}.`);
    setStatus(`${graphics[graphic].label} added to vMix. Enter the new input number.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}));

document.querySelectorAll("[data-refresh]").forEach(button => button.addEventListener("click", () => {
  try {
    const graphic = button.dataset.refresh;
    refreshGraphic(graphic).catch(error => setStatus(error.message, true));
  } catch (error) {
    setStatus(error.message, true);
  }
}));

document.querySelectorAll("[data-overlay-in]").forEach(button => button.addEventListener("click", () => {
  try {
    const graphic = button.dataset.overlayIn;
    (async () => {
      await save();
      await callVmix(`OverlayInput${Number(state.vmix.overlayChannel || 1)}In`, selectedInput(graphic));
    })().catch(error => setStatus(error.message, true));
  } catch (error) {
    setStatus(error.message, true);
  }
}));

document.querySelectorAll("[data-overlay-out]").forEach(button => button.addEventListener("click", () => {
  try {
    const graphic = button.dataset.overlayOut;
    (async () => {
      await save();
      await callVmix(`OverlayInput${Number(state.vmix.overlayChannel || 1)}Out`, selectedInput(graphic, false));
    })().catch(error => setStatus(error.message, true));
  } catch (error) {
    setStatus(error.message, true);
  }
}));

document.querySelectorAll(".tab-btn").forEach(button => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => quick(button.dataset.action));
});

baseToggles.forEach(button => {
  button.addEventListener("click", () => toggleBase(button.dataset.baseToggle));
});

setWinnerToggles.forEach(button => {
  button.addEventListener("click", () => toggleSetWinner(button.dataset.setWinner));
});

fields.forEach(field => {
  field.addEventListener("input", scheduleSave);
  field.addEventListener("change", () => {
    if (field.dataset.path.endsWith(".logo")) renderLogoPreview(field);
    if (field.dataset.path === "player.teamSide") {
      readForm();
      fillPlayerPicker();
    }
    scheduleSave();
  });
});

load().catch(error => setStatus(error.message, true));

const initialTab = new URLSearchParams(location.search).get("tab");
if (initialTab && document.querySelector(`[data-panel="${initialTab}"]`)) switchTab(initialTab);
