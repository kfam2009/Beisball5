const http = require("http");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const statePath = path.join(root, "data", "state.json");
const excelPath = process.env.B5_EXCEL || "C:\\Users\\claud\\Videos\\Baseball5\\Datos.xlsx";
const codexPython = "C:\\Users\\claud\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const pythonPath = process.env.PYTHON || (fs.existsSync(codexPython) ? codexPython : "python");
const clients = new Set();
const graphicKeys = ["scorebug", "scoreboard", "matchup", "rosterAway", "rosterHome", "umpires", "player", "commentators", "upcoming"];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function readState() {
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.visibility ||= {};
  for (const key of graphicKeys) {
    state.visibility[key] = true;
  }
  return state;
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
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
  const file = path.resolve(path.join(root, requested));
  return file.startsWith(root) ? file : null;
}

function vmixRequest(state, params) {
  const host = state.vmix.host || "127.0.0.1";
  const port = Number(state.vmix.port || 8088);
  const query = new URLSearchParams(params).toString();
  const url = `http://${host}:${port}/api/?${query}`;

  return new Promise((resolve, reject) => {
    const req = http.get(url, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => body += chunk);
      response.on("end", () => resolve({ statusCode: response.statusCode, body, url }));
    });
    req.setTimeout(3000, () => req.destroy(new Error("vMix did not respond. Enable Settings > Web Controller.")));
    req.on("error", reject);
  });
}

function publicBaseUrl(req) {
  const host = req.headers.host || "127.0.0.1:8126";
  return `http://${host}`;
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
  state.rosters ||= {};
  state.rosters.home ||= {};
  state.rosters.away ||= {};
  state.rosters.title ||= "TEAM ROSTER";
  state.rosters.subtitle ||= state.event?.name || "";
  state.rosters.home.playersText = excel.homeText;
  state.rosters.away.playersText = excel.awayText;

  state.umpires ||= {};
  state.umpires.title ||= "OFFICIALS";
  state.umpires.subtitle ||= state.event?.name || "";
  state.umpires.crewText = excel.umpiresText;

  state.excel = {
    source: excel.source,
    updatedAt: new Date().toISOString(),
    home: excel.home,
    away: excel.away,
  };

  state.player ||= {};
  const side = state.player.teamSide === "away" ? "away" : "home";
  const firstPlayer = excel[side]?.find(row => row.role.toLowerCase() !== "head coach") || excel[side]?.[0];
  if (firstPlayer && !state.player.name) {
    state.player.number = firstPlayer.number;
    state.player.name = firstPlayer.name;
    state.player.detail = state.match?.teams?.[side]?.name || firstPlayer.role;
  }
  return state;
}

const server = http.createServer((req, res) => {
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
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      try {
        const state = JSON.parse(raw || "{}");
        writeState(state);
        broadcast(state);
        sendJson(res, { ok: true });
      } catch (error) {
        sendJson(res, { ok: false, error: error.message }, 400);
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
    });
    clients.add(res);
    res.write(`data: ${JSON.stringify(readState())}\n\n`);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/vmix") {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", async () => {
      try {
        const state = readState();
        const payload = JSON.parse(raw || "{}");
        const params = { Function: payload.function };
        if (payload.input) params.Input = payload.input;
        if (payload.value) params.Value = payload.value;
        const result = await vmixRequest(state, params);
        sendJson(res, { ok: result.statusCode >= 200 && result.statusCode < 300, result });
      } catch (error) {
        sendJson(res, { ok: false, error: error.message }, 502);
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/vmix/add-scorebug") {
    (async () => {
      try {
        const state = readState();
        const overlayUrl = `${publicBaseUrl(req)}/scorebug.html?v=${Date.now()}`;
        const result = await vmixRequest(state, {
          Function: "AddInput",
          Value: `Browser|${overlayUrl}`,
        });
        sendJson(res, { ok: true, overlayUrl, result });
      } catch (error) {
        sendJson(res, { ok: false, error: error.message }, 502);
      }
    })();
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
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});

const port = Number(process.env.PORT || 8126);
server.listen(port, () => {
  console.log(`B5 Scorebug Control: http://localhost:${port}/control.html`);
  console.log(`B5 Scorebug Overlay: http://localhost:${port}/scorebug.html`);
});
