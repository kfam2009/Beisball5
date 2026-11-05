const path = require("path");
const { chromium } = require("C:/Users/claud/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const base = "http://localhost:8126";
const outDir = path.join(__dirname, "..", "output", "pdf", "captures");

const shots = [
  ["scorebug", "/scorebug.html"],
  ["scoreboard", "/scoreboard.html"],
  ["matchup", "/matchup.html"],
  ["roster-away", "/roster.html?side=away"],
  ["roster-home", "/roster.html?side=home"],
  ["umpires", "/umpires.html"],
  ["player", "/player.html"],
  ["commentators", "/commentators.html"],
  ["upcoming", "/upcoming.html"],
];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  for (const [name, route] of shots) {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate(() => {
      document.body.style.background = "transparent";
      for (const el of document.querySelectorAll(".is-hidden")) el.classList.remove("is-hidden");
      for (const el of document.querySelectorAll(".scorebug,.live,.scoreboard-card,.matchup-card,.roster-card,.umpires-card,.player-card")) {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.filter = "";
      }
    });
    await page.waitForTimeout(450);
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      omitBackground: true,
      fullPage: false,
    });
  }

  await browser.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
