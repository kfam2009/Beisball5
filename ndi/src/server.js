const http = require("http");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");
const dataRoot = path.join(root, "data");
const statePath = path.join(dataRoot, "state.json");
const excelPath = "C:\\Users\\claud\\Videos\\Baseball5\\Datos.xlsx";
const pythonPath = "C:\\Users\\claud\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const replayPanelRoot = process.env.REPLAY_PANEL_ROOT || "C:\\Users\\claud\\Videos\\Panel Replay";
const replayPanelPort = Number(process.env.REPLAY_PANEL_PORT || 3001);
const electronPath = path.join(root, "node_modules", "electron", "dist", "electron.exe");
const replayKioskPath = path.join(root, "src", "replay-kiosk-main.js");
const clients = new Set();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

function ensureState() {
  if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot, { recursive: true });
  if (!fs.existsSync(statePath)) {
    const defaultState = require("./defaultState");
    fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2));
  }
}

function readState() {
  ensureState();
  return normalizeState(JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, "")));
}

function writeState(state) {
  ensureState();
  fs.writeFileSync(statePath, JSON.stringify(normalizeState(state), null, 2));
}

function normalizeState(state) {
  state.event ||= { name: "Panamericano de Clubes", status: "LIVE" };
  state.theme ||= {
    ink: "#10151b",
    panel: "#17222c",
    teal: "#00a78e",
    mint: "#9df1d7",
    coral: "#ff4f5e",
    gold: "#ffc83d",
    paper: "#f7f3ea",
    white: "#ffffff"
  };
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
  return state;
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function broadcast(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(payload);
}

function safeFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const requested = clean === "/" ? "/control.html" : clean;
  const file = path.resolve(path.join(publicRoot, requested));
  return file.startsWith(publicRoot) ? file : null;
}

function handleStatePost(req, res) {
  let raw = "";
  req.on("data", chunk => raw += chunk);
  req.on("end", () => {
    try {
      const state = JSON.parse(raw || "{}");
      writeState(state);
      broadcast(state);
      sendJson(res, { ok: true, state });
    } catch (error) {
      sendJson(res, { ok: false, error: error.message }, 400);
    }
  });
}

function isHttpServiceRunning(port, requestPath = "/") {
  return new Promise((resolve) => {
    const checkReq = http.request(
      {
        host: "127.0.0.1",
        port,
        method: "GET",
        path: requestPath,
        timeout: 900
      },
      (checkRes) => {
        checkRes.resume();
        resolve(checkRes.statusCode >= 200 && checkRes.statusCode < 500);
      }
    );

    checkReq.on("timeout", () => {
      checkReq.destroy();
      resolve(false);
    });
    checkReq.on("error", () => resolve(false));
    checkReq.end();
  });
}

async function openReplayPanel(res) {
  try {
    const url = `http://localhost:${replayPanelPort}/`;
    if (!fs.existsSync(electronPath)) {
      sendJson(res, { ok: false, error: `No encuentro Electron: ${electronPath}` }, 404);
      return;
    }

    const child = childProcess.spawn(electronPath, [replayKioskPath], {
      cwd: root,
      env: {
        ...process.env,
        REPLAY_PANEL_ROOT: replayPanelRoot,
        REPLAY_PANEL_PORT: String(replayPanelPort)
      },
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    sendJson(res, { ok: true, mode: "kiosk", url });
  } catch (error) {
    sendJson(res, { ok: false, error: error.message }, 500);
  }
}

function readExcelData() {
  return new Promise((resolve, reject) => {
    const script = path.join(root, "excel_import.py");
    childProcess.execFile(pythonPath, [script, excelPath], { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function applyExcelToState(state, excel) {
  state = normalizeState(state);
  state.rosters.home.playersText = excel.homeText;
  state.rosters.away.playersText = excel.awayText;
  state.umpires.crewText = excel.umpiresText;
  state.excel = {
    source: excel.source,
    updatedAt: new Date().toISOString(),
    home: excel.home,
    away: excel.away,
    umpires: excel.umpires
  };

  const side = state.player.teamSide === "away" ? "away" : "home";
  const currentPlayerStillExists = excel[side]?.some(row => (
    String(row.number) === String(state.player.number) && row.name === state.player.name
  ));
  const firstPlayer = excel[side]?.find(row => String(row.role || "").toLowerCase() !== "head coach") || excel[side]?.[0];
  if (firstPlayer && (!state.player.name || !currentPlayerStillExists)) {
    state.player.number = firstPlayer.number;
    state.player.name = firstPlayer.name;
    state.player.detail = state.match.teams[side].name || firstPlayer.role;
  }

  return state;
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

function resetSetScore(match) {
  match.inning = 1;
  match.half = "TOP";
  match.outs = 0;
  match.bases = { first: false, second: false, third: false };
  match.teams.away.score = 0;
  match.teams.home.score = 0;
  match.teams.away.line = [0, 0, 0, 0, 0];
  match.teams.home.line = [0, 0, 0, 0, 0];
}

function applyScorebugAction(state, action) {
  state = normalizeState(state);
  const match = state.match;
  const away = match.teams.away;
  const home = match.teams.home;

  if (action === "away-plus") changeTeamScoreForInning(away, match.inning, 1);
  else if (action === "away-minus") changeTeamScoreForInning(away, match.inning, -1);
  else if (action === "home-plus") changeTeamScoreForInning(home, match.inning, 1);
  else if (action === "home-minus") changeTeamScoreForInning(home, match.inning, -1);
  else if (action === "out-plus") match.outs = clamp(Number(match.outs || 0) + 1, 0, 2);
  else if (action === "out-minus") match.outs = clamp(Number(match.outs || 0) - 1, 0, 2);
  else if (action === "outs-clear") match.outs = 0;
  else if (action === "inning-plus") match.inning = Number(match.inning || 1) + 1;
  else if (action === "inning-minus") match.inning = Math.max(1, Number(match.inning || 1) - 1);
  else if (action === "set-plus") {
    match.set = Number(match.set || 1) + 1;
    resetSetScore(match);
  }
  else if (action === "set-minus") {
    match.set = Math.max(1, Number(match.set || 1) - 1);
    resetSetScore(match);
  }
  else if (action === "half-toggle") match.half = match.half === "TOP" ? "BOTTOM" : "TOP";
  else if (action === "base-first") match.bases.first = !match.bases.first;
  else if (action === "base-second") match.bases.second = !match.bases.second;
  else if (action === "base-third") match.bases.third = !match.bases.third;
  else if (action === "bases-clear") match.bases = { first: false, second: false, third: false };
  else if (action === "scorebug-in") {
    state.ndi.activeGraphic = "scorebug";
    state.ndi.scorebugVisible = true;
    state.ndi.visible = true;
  } else if (action === "scorebug-out") {
    state.ndi.scorebugVisible = false;
    if (state.ndi.activeGraphic === "scorebug") {
      state.ndi.visible = Boolean(state.ndi.playerVisible);
      if (state.ndi.playerVisible) state.ndi.activeGraphic = "player";
    }
  } else {
    throw new Error(`Unknown scorebug action: ${action}`);
  }

  return state;
}

function createServer() {
  ensureState();
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/api/state") {
      return sendJson(res, readState());
    }

    if (req.method === "GET" && url.pathname === "/api/excel-data") {
      (async () => {
        try {
          sendJson(res, { ok: true, data: await readExcelData() });
        } catch (error) {
          sendJson(res, { ok: false, error: error.message }, 500);
        }
      })();
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/import-excel") {
      (async () => {
        try {
          const state = applyExcelToState(readState(), await readExcelData());
          writeState(state);
          broadcast(state);
          sendJson(res, { ok: true, state });
        } catch (error) {
          sendJson(res, { ok: false, error: error.message }, 500);
        }
      })();
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/state") {
      return handleStatePost(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/replay/open") {
      return openReplayPanel(res);
    }

    if ((req.method === "GET" || req.method === "POST") && url.pathname.startsWith("/api/scorebug/")) {
      try {
        const action = decodeURIComponent(url.pathname.slice("/api/scorebug/".length));
        const state = applyScorebugAction(readState(), action);
        writeState(state);
        broadcast(state);
        sendJson(res, { ok: true, action, state });
      } catch (error) {
        sendJson(res, { ok: false, error: error.message }, 400);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "Connection": "keep-alive"
      });
      clients.add(res);
      res.write(`data: ${JSON.stringify(readState())}\n\n`);
      req.on("close", () => clients.delete(res));
      return;
    }

    const file = safeFile(url.pathname);
    if (!file) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  });
}

if (process.argv.includes("--check")) {
  ensureState();
  console.log("OK: Baseball5 NDI server files are ready.");
} else if (require.main === module) {
  const port = Number(process.env.PORT || 8135);
  createServer().listen(port, () => {
    console.log(`Baseball5 NDI Panel: http://localhost:${port}/control.html`);
    console.log(`Baseball5 NDI Scorebug: http://localhost:${port}/scorebug.html`);
  });
}

module.exports = { createServer, readState };
