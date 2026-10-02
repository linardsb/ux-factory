// Verdant mock API — zero-dependency Node service for the components in ./pack.
// Every record served is validated against the pack's own JSON Schema contracts.
// Run: node server.mjs   →   http://127.0.0.1:4800
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";

const HOST = "127.0.0.1";
const PORT = 4800;
const ROOT = new URL(".", import.meta.url).pathname;
const PACK = join(ROOT, "pack");

// ---------------------------------------------------------------------------
// Scenario constants (questions.md Q1, Q3, Q19)
// ---------------------------------------------------------------------------
const TODAY = "2026-07-15"; // fixed fictional today — never the wall clock
const TODAY_WINDOW_DAYS = 7; // open tasks due within this window make the Today list
const FICTIONAL_NOTICE =
  "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved.";

// ---------------------------------------------------------------------------
// Contracts: loaded from the pack, used to validate fixtures and responses (Q28)
// ---------------------------------------------------------------------------
const contract = (name) => JSON.parse(readFileSync(join(PACK, "contracts", `${name}.contract.json`), "utf8"));
const SCHEMAS = {
  Plant: contract("plant-card"),
  CareTask: contract("care-task-row"),
  Reading: contract("stat-tile"),
};

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

// Minimal JSON Schema subset: exactly what the four contracts use.
function validate(schema, rec, path = "$") {
  const errs = [];
  if (typeof rec !== "object" || rec === null || Array.isArray(rec)) return [`${path}: expected object`];
  for (const k of schema.required ?? []) if (!(k in rec)) errs.push(`${path}.${k}: required`);
  for (const [k, v] of Object.entries(rec)) {
    const prop = schema.properties?.[k];
    if (!prop) { if (schema.additionalProperties === false) errs.push(`${path}.${k}: not allowed`); continue; }
    const p = `${path}.${k}`;
    if (prop.type === "string" && typeof v !== "string") errs.push(`${p}: expected string`);
    if (prop.type === "integer" && !Number.isInteger(v)) errs.push(`${p}: expected integer`);
    if (prop.type === "number" && typeof v !== "number") errs.push(`${p}: expected number`);
    if (prop.type === "boolean" && typeof v !== "boolean") errs.push(`${p}: expected boolean`);
    if (prop.enum && !prop.enum.includes(v)) errs.push(`${p}: not in ${JSON.stringify(prop.enum)}`);
    if (prop.minLength != null && typeof v === "string" && v.length < prop.minLength) errs.push(`${p}: too short`);
    if (prop.minimum != null && typeof v === "number" && v < prop.minimum) errs.push(`${p}: below ${prop.minimum}`);
    if (prop.format === "date" && typeof v === "string" && !isDate(v)) errs.push(`${p}: not a date`);
  }
  return errs;
}

function assertValid(kind, rec) {
  const errs = validate(SCHEMAS[kind], rec);
  if (errs.length) throw new Error(`${kind} ${rec?.id ?? "?"} violates contract: ${errs.join("; ")}`);
  return rec;
}

// ---------------------------------------------------------------------------
// Fixtures (invented). Derived fields (status) are computed below, not typed here.
// plant-03 / task-03 / read-03 are the pack's own sample records, verbatim.
// ---------------------------------------------------------------------------
const plants = [
  { id: "plant-01", name: "Monstera", species: "Monstera deliciosa", location: "living room", acquired: "2025-03-14", wateringIntervalDays: 7, lastWatered: "2026-07-08", lastFertilized: "2026-06-20", health: "thriving", notes: "New leaf unfurling near the moss pole." },
  { id: "plant-02", name: "Snake plant", species: "Dracaena trifasciata", location: "bedroom", acquired: "2024-11-02", wateringIntervalDays: 14, lastWatered: "2026-07-06", lastFertilized: "2026-05-30", health: "stable", notes: "Tolerates the dim corner; water sparingly." },
  { id: "plant-03", name: "Fiddle-leaf fig", species: "Ficus lyrata", location: "living room", acquired: "2025-12-02", wateringIntervalDays: 7, lastWatered: "2026-07-05", lastFertilized: "2026-06-12", health: "struggling", notes: "Dropped two leaves after the move away from the window." },
  { id: "plant-04", name: "Pothos", species: "Epipremnum aureum", location: "kitchen", acquired: "2025-08-21", wateringIntervalDays: 5, lastWatered: "2026-07-11", lastFertilized: "2026-06-28", health: "thriving", notes: "Trailing over the shelf edge; trim in August." },
  { id: "plant-05", name: "Peace lily", species: "Spathiphyllum wallisii", location: "office", acquired: "2026-01-09", wateringIntervalDays: 4, lastWatered: "2026-07-10", lastFertilized: "2026-06-15", health: "struggling", notes: "Wilts fast when dry; brown tips from tap water." },
  { id: "plant-06", name: "Rubber plant", species: "Ficus elastica", location: "hallway", acquired: "2025-05-30", wateringIntervalDays: 10, lastWatered: "2026-07-09", lastFertilized: "2026-06-01", health: "stable", notes: "Root-bound; a bigger pot is on the list." },
];

// due dates for open water tasks = lastWatered + wateringIntervalDays, so the data agrees with itself
const tasks = [
  { id: "task-01", plantId: "plant-01", type: "water", due: "2026-07-15", done: false },
  { id: "task-02", plantId: "plant-02", type: "water", due: "2026-07-20", done: false },
  { id: "task-03", plantId: "plant-03", type: "water", due: "2026-07-12", done: false },
  { id: "task-04", plantId: "plant-03", type: "inspect", due: "2026-07-15", done: false },
  { id: "task-05", plantId: "plant-04", type: "water", due: "2026-07-16", done: false },
  { id: "task-06", plantId: "plant-05", type: "water", due: "2026-07-14", done: false },
  { id: "task-07", plantId: "plant-05", type: "fertilise", due: "2026-07-15", done: false },
  { id: "task-08", plantId: "plant-06", type: "repot", due: "2026-07-25", done: false },
  { id: "task-09", plantId: "plant-06", type: "water", due: "2026-07-19", done: false },
  { id: "task-10", plantId: "plant-01", type: "water", due: "2026-07-08", done: true },
  { id: "task-11", plantId: "plant-03", type: "water", due: "2026-07-05", done: true },
  { id: "task-12", plantId: "plant-01", type: "fertilise", due: "2026-08-10", done: false }, // outside the Today window
];

const readings = [
  { id: "read-01", plantId: "plant-01", kind: "moisture", value: 41, unit: "%", label: "Moisture" },
  { id: "read-02", plantId: "plant-01", kind: "light", value: 820, unit: "lx", label: "Light" },
  { id: "read-03", plantId: "plant-03", kind: "moisture", value: 22, unit: "%", label: "Moisture" },
  { id: "read-04", plantId: "plant-03", kind: "light", value: 310, unit: "lx", label: "Light" },
  { id: "read-05", plantId: "plant-02", kind: "moisture", value: 18, unit: "%", label: "Moisture" },
  { id: "read-06", plantId: "plant-02", kind: "light", value: 140, unit: "lx", label: "Light" },
  { id: "read-07", plantId: "plant-04", kind: "moisture", value: 47, unit: "%", label: "Moisture" },
  { id: "read-08", plantId: "plant-04", kind: "light", value: 560, unit: "lx", label: "Light" },
  { id: "read-09", plantId: "plant-05", kind: "moisture", value: 29, unit: "%", label: "Moisture" },
  { id: "read-10", plantId: "plant-05", kind: "light", value: 260, unit: "lx", label: "Light" },
  { id: "read-11", plantId: "plant-06", kind: "moisture", value: 38, unit: "%", label: "Moisture" },
  { id: "read-12", plantId: "plant-06", kind: "light", value: 450, unit: "lx", label: "Light" },
];

// ---------------------------------------------------------------------------
// Derivation (Q2, Q4, Q27)
// ---------------------------------------------------------------------------
const SEVERITY = { ok: 0, due: 1, overdue: 2 };
const addDays = (date, n) => new Date(Date.parse(date + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const taskStatus = (t) => (t.done ? "ok" : t.due < TODAY ? "overdue" : t.due === TODAY ? "due" : "ok");
const plantById = (id) => plants.find((p) => p.id === id);
const openTasksFor = (plantId) => tasks.filter((t) => t.plantId === plantId && !t.done);
const plantStatus = (p) =>
  openTasksFor(p.id).reduce((worst, t) => (SEVERITY[taskStatus(t)] > SEVERITY[worst] ? taskStatus(t) : worst), "ok");

// Contract-shaped views. Records are built fresh per request so derived fields never go stale.
const viewPlant = (p) => assertValid("Plant", { ...p, status: plantStatus(p) });
const viewTask = (t) => assertValid("CareTask", { id: t.id, plantId: t.plantId, plantName: plantById(t.plantId).name, type: t.type, due: t.due, done: t.done, status: taskStatus(t) });
const viewReading = (r) => assertValid("Reading", { ...r });

const byUrgency = (a, b) => SEVERITY[b.status] - SEVERITY[a.status] || a.due.localeCompare(b.due) || a.id.localeCompare(b.id);

function featuredPlant() {
  return [...plants]
    .map((p) => ({ p, sev: SEVERITY[plantStatus(p)], due: openTasksFor(p.id).map((t) => t.due).sort()[0] ?? "9999-12-31" }))
    .sort((a, b) => b.sev - a.sev || a.due.localeCompare(b.due) || a.p.id.localeCompare(b.p.id))[0].p;
}

function todayList() {
  const limit = addDays(TODAY, TODAY_WINDOW_DAYS);
  return tasks.filter((t) => !t.done && t.due <= limit).map(viewTask).sort(byUrgency);
}

// Boot-time proof that the invented data is contract-valid and internally coherent.
for (const p of plants) viewPlant(p);
for (const t of tasks) viewTask(t);
for (const r of readings) viewReading(r);
for (const t of tasks.filter((t) => t.type === "water" && !t.done)) {
  const p = plantById(t.plantId);
  if (addDays(p.lastWatered, p.wateringIntervalDays) !== t.due) throw new Error(`${t.id} due disagrees with ${p.id} lastWatered + interval`);
}

// ---------------------------------------------------------------------------
// Write path: Log care (Q5, Q6, Q21, Q23, Q26)
// ---------------------------------------------------------------------------
function nextTaskId() {
  const n = Math.max(...tasks.map((t) => Number(t.id.slice(5)))) + 1;
  return `task-${String(n).padStart(2, "0")}`;
}

function logCare(taskIds) {
  const problems = [];
  const targets = [];
  for (const id of taskIds) {
    const t = tasks.find((t) => t.id === id);
    if (!t) problems.push({ id, reason: "unknown task" });
    else if (t.done) problems.push({ id, reason: "already done" });
    else targets.push(t);
  }
  if (problems.length) return { status: 422, body: { error: { code: "unprocessable", message: "batch rejected; nothing was logged", problems } } };

  const created = [];
  for (const t of targets) {
    t.done = true;
    const p = plantById(t.plantId);
    if (t.type === "water") {
      p.lastWatered = TODAY;
      if (!openTasksFor(p.id).some((o) => o.type === "water")) {
        const next = { id: nextTaskId(), plantId: p.id, type: "water", due: addDays(TODAY, p.wateringIntervalDays), done: false };
        tasks.push(next);
        created.push(next);
      }
    } else if (t.type === "fertilise") {
      p.lastFertilized = TODAY;
    }
  }
  const touched = [...new Set(targets.map((t) => t.plantId))];
  return {
    status: 200,
    body: {
      loggedAt: TODAY,
      logged: targets.map(viewTask),
      created: created.map(viewTask),
      plants: touched.map((id) => viewPlant(plantById(id))),
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store", ...headers });
  res.end(json);
}
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 65536) reject(new Error("body too large")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : null); } catch { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}

function serveStatic(res, relPath) {
  const safe = normalize(relPath).replace(/^(\.\.[/\\])+/, "");
  const file = join(ROOT, safe);
  if (!file.startsWith(ROOT) || !existsSync(file)) return fail(res, 404, "not_found", `no file ${relPath}`);
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(file));
}

const bool = (v) => (v === "true" ? true : v === "false" ? false : undefined);

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = url.searchParams;

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" });
    return res.end();
  }

  // static: the demo page and the pack's own assets
  if (path === "/" || path === "/index.html") return req.method === "GET" ? serveStatic(res, "index.html") : fail(res, 405, "method_not_allowed", "GET only");
  if (path.startsWith("/pack/")) return req.method === "GET" ? serveStatic(res, path.slice(1)) : fail(res, 405, "method_not_allowed", "GET only");

  if (!path.startsWith("/api/")) return fail(res, 404, "not_found", `no route ${path}`);

  // write path
  if (path === "/api/care-log") {
    if (req.method !== "POST") return fail(res, 405, "method_not_allowed", "POST only");
    if (!/^application\/json\b/.test(req.headers["content-type"] ?? "")) return fail(res, 415, "unsupported_media_type", "send application/json");
    let body;
    try { body = await readJson(req); } catch (e) { return fail(res, 400, "bad_request", e.message); }
    if (!body || !Array.isArray(body.taskIds) || !body.taskIds.length || !body.taskIds.every((s) => typeof s === "string"))
      return fail(res, 400, "bad_request", "body must be { taskIds: string[] } with at least one id");
    const out = logCare([...new Set(body.taskIds)]);
    return send(res, out.status, out.body);
  }

  if (req.method !== "GET") return fail(res, 405, "method_not_allowed", "GET only");

  if (path === "/api/scenario") return send(res, 200, { scenario: "verdant", today: TODAY, fictionalNotice: FICTIONAL_NOTICE });

  if (path === "/api/plants") return send(res, 200, plants.map(viewPlant));

  if (path === "/api/tasks") {
    const done = bool(q.get("done"));
    const plantId = q.get("plantId");
    let list = tasks;
    if (done !== undefined) list = list.filter((t) => t.done === done);
    if (plantId) list = list.filter((t) => t.plantId === plantId);
    return send(res, 200, list.map(viewTask).sort(byUrgency));
  }

  if (path === "/api/readings") {
    const plantId = q.get("plantId");
    const kind = q.get("kind");
    let list = readings;
    if (plantId) list = list.filter((r) => r.plantId === plantId);
    if (kind) list = list.filter((r) => r.kind === kind);
    return send(res, 200, list.map(viewReading));
  }

  if (path === "/api/today") {
    const p = featuredPlant();
    return send(res, 200, {
      today: TODAY,
      featuredPlantId: p.id,
      featuredPlant: viewPlant(p),
      readings: readings.filter((r) => r.plantId === p.id).map(viewReading),
      tasks: todayList(),
    });
  }

  let m;
  if ((m = path.match(/^\/api\/plants\/([^/]+)$/))) {
    const p = plantById(m[1]);
    return p ? send(res, 200, viewPlant(p)) : fail(res, 404, "not_found", `no plant ${m[1]}`);
  }
  if ((m = path.match(/^\/api\/plants\/([^/]+)\/tasks$/))) {
    if (!plantById(m[1])) return fail(res, 404, "not_found", `no plant ${m[1]}`);
    const done = bool(q.get("done"));
    let list = tasks.filter((t) => t.plantId === m[1]);
    if (done !== undefined) list = list.filter((t) => t.done === done);
    return send(res, 200, list.map(viewTask).sort(byUrgency));
  }
  if ((m = path.match(/^\/api\/plants\/([^/]+)\/readings$/))) {
    if (!plantById(m[1])) return fail(res, 404, "not_found", `no plant ${m[1]}`);
    return send(res, 200, readings.filter((r) => r.plantId === m[1]).map(viewReading));
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)$/))) {
    const t = tasks.find((t) => t.id === m[1]);
    return t ? send(res, 200, viewTask(t)) : fail(res, 404, "not_found", `no task ${m[1]}`);
  }

  return fail(res, 404, "not_found", `no route ${path}`);
}

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) fail(res, 500, "internal", e.message);
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`verdant api on http://${HOST}:${PORT} · today=${TODAY} · ${plants.length} plants, ${tasks.length} tasks, ${readings.length} readings · fixtures validated against pack/contracts`);
});
