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

function renderPerson(name, role, index) {
  return `
    <div class="commentator-person commentator-person-${index}">
      <span>${esc(role || "Commentator")}</span>
      <strong>${esc(name || `Commentator ${index}`)}</strong>
    </div>
  `;
}

function render(state) {
  const next = JSON.stringify(state);
  if (next === fingerprint) return;
  fingerprint = next;
  setTheme(state.theme);

  const data = state.commentators || {};
  const people = [renderPerson(data.name1, data.role1, 1)];
  if (data.layout === "two") people.push(renderPerson(data.name2, data.role2, 2));

  stage.innerHTML = `
    <section class="commentators-card ${data.layout === "two" ? "two-up" : "one-up"} ${graphicClass(state, "commentators")}">
      <div class="commentators-head">
        <span>${esc(data.subtitle || state.event?.name || "")}</span>
        <strong>${esc(data.title || "COMMENTATORS")}</strong>
      </div>
      <div class="commentators-body">
        ${people.join("")}
      </div>
      <div class="commentators-strip"></div>
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
