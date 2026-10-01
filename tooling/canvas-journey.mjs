// tooling/canvas-journey.mjs — hand-written canon (this repo; not generated). The build canvas page on
// three engines (epic #295 ticket #306; .claude/plans/canvas-page-run-list-arrangement-ops-306.md,
// Task 6.1).
//
// WHAT IT PROVES. The ticket's own sequence on a real browser — open a run → add a note → link a frame
// to a decision → remove a frame → undo → reload — ending in the Node side: the package on disk passes
// canvas-store's verifyBuild, and the document folded from disk equals the one the page holds. Around
// it: the run list, the provenance label and its mismatch flag, the in-repo save notice, zero saves on
// load, one ledger entry per gesture (a numeric resize and a pointer resize each undo as ONE entry),
// the origin guard and the 409, the stand-in's flags, the inspector inside the viewport on the anchor
// AND the forced fallback branch, 44×44 targets, and no page errors.
//
// OPERATOR-RUN, NOT IN CI, like every journey driver here (studio-journey.mjs's header says why): it
// needs three browsers, and CI's verify job has none.
//
// THE FIRST DRIVER THAT BOOTS THE PORTAL. canvas.html needs /api/canvas/*, so a static server cannot
// serve it. The portal is one process name across every session on this machine, so the driver spawns
// its OWN — this worktree's server.mjs, resolved from this file's location, on a free port, with
// JOBS_DIR pointed at a scratch directory — and asserts /api/health reports that jobsDir, this
// worktree's HEAD and stale:false before any leg runs (R3). The real jobs folder is never read or
// written. Teardown kills the child BY PID (never a name pattern) and removes the scratch directory,
// in `finally` and on SIGINT/SIGTERM.
//
// NOTHING UNDER discovery/ MAY CHANGE. Step 2 opens the in-repo spine and asserts zero save requests;
// `git status --porcelain -- discovery/` is compared before and after every leg.
//
// THE IMPORT PASS (#311). The portal child runs with UXF_BRILLIANT_MCP pointing at a server that exits
// at once, so "Import selection" meets the real stdio client and gets the not-running refusal with ONE
// action (there is no model on this path, so there is no spend to label); then the Brilliant fixture
// and the Figma fixture are DROPPED through the page, each writing a record, its markdown, a transcript,
// a proposal and one component.propose line; the two records share one shape; a mapping edit rewrites
// mapping.json, re-derives the record and re-renders the view; and a SECOND portal child, whose fake
// bridge never answers a tools/call, holds the run lock while a drop is refused "already in flight", and
// its read resolves to stale-binding whose one action routes to the binding check (I5); a stale drop's
// one action reloads the page (I7), an oversize drop is a refusal and a traversal name a 400 (I8).
// Then side children over tooling/fake-brilliant-bridge.mjs (#311 PR B, Task 7.1): `paired` — Check
// binding names "this tab's project (name not exposed) · web", Import selection writes a record whose
// source.ids is the one selected id, a reference.png the Original pane shows, and a mapping edit
// rewrites mapping.json (I9); Browse shows two thumbnail tiles, both picked import as one record with
// both ids, and Browse again is served from the session cache (I11); `unpaired` — the not-paired
// refusal with ONE action "Import again", the bridge's own words as the detail line, and the click
// sends the import again (I10); `hang-call` — Re-bind's click posts the binding check and the line
// updates (I10b). Inside the paired child, #475's exhibit (X1–X7): a Mode 2 Import selection places one
// exhibit where placeExhibit recomputed in Node says, its PNG loaded and labelled, measured clear of
// every frame; on a 2400-px page a drag onto f1 and a redo after it are refused and put back with no
// ledger line; f2 → desktop and a pointer resize of f2 into it are refused (no line, no height written)
// while f1 → desktop is accepted; a vertical resize authors f1's
// height and the exhibit may then sit below it; a Mode 2 drop is flagged as having no image. THE MEASUREMENT (#474): the owner's faithful frame (import/fixtures/measure-live/) is
// seeded in-process into fp-measure, measured through the page by the spawned tooling/measure-render.mjs
// — worst ΔE under THRESHOLD, the derived verdict and that verdict GREEN at 12/12 WCAG (#482), the candidate at the reference's size — and a rename
// returns it to missing and deletes the candidate (I12); a side child with UXF_MEASURE_VRDIR at a missing
// directory shows the no-renderer refusal IN THE VIEW with the panel closed, the record unchanged (I12b).
// Every side child is on a free port, is asserted to be THIS worktree's portal before
// use, and is killed by its own handle. git status over system/, handoff/, discovery/ and
// import/overrides/ is compared across the pass (AC #4).
//
// THE LANES PASS (#314, L1–L9) over its own copy, fp-lanes: the lane select holds A only with Keep and Discard
// display:none; New lane refuses key a naming lane A and drafts b while writing nothing; f1's Continue relabelled
// and f2 left out IN THE DRAFT (still six lines), f1's missing error a plain chip, never an ask, and the flow panel
// without f2; Keep lane writes ONE variant.add carrying the whole override map, and that save regenerates the
// scratch package's pack (## Lane b); switching to A and back swaps f1's text, the asks, the diagram and the
// missing list and writes nothing; Write handoff pack rewrites a removed flow.md equal to renderPack, and a
// cross-origin POST is a 403 that writes nothing; Cmd+Z writes an undone line and the select loses b;
// verifyBuild [] and the page equal to the disk fold. The lane buttons are measured at 44×44 in L3, the new
// toolbar controls in 15.
//
// THE GROUPS PASS (#315, G1–G8) over its own copy, fp-groups, whose f3 (the header case: screen-header, ghost-button,
// icon) is seeded in-process as one owner screen.compose: f3's Details save the three parts as app-header (ONE
// group.define line, build/groups/g1.json with three parts); f1's Details place g1 into screen (ONE group.place, the
// copy rendered as g1-1/header "Home"); the copy's title overridden to "Add a payee" (ONE group.place with
// instanceId) while f3 still reads Home; Promote reloads at ?promoted=app-header with source.json deep-equal to
// groups/g1.json, the ledger's last line component.propose {app-header, g1, mode 1} and the ratify form mounted;
// verifyBuild [] and the pack's flow.md counting 1 group, 1 placed copy; git status over system/, handoff/,
// discovery/ and import/overrides/ unchanged (AC #4); five group controls at 44×44 and no page errors. WHAT IT
// CANNOT REACH: two copies of one group (35.17a/c prove the namespacing), and whether a group is a good reuse.
//
// THE BLAST-RADIUS PASS (#318, B1–B7) over its own copy, fp-stale: f1 shows Decision 7 and 8, none stale, and card d7
// reads "Embodied by: add-payee" (AC #4), with no save on load; f1 is linked to 7, 8 and 10 by keyboard — the FIRST
// frame.link, since the spine links f1 through screen.compose. Then a decision superseding 7 is SEEDED into the
// scratch copy through discovery/ops.mjs's REAL applier (seedSupersede), because a closed session refuses turns and
// the drawer has no scripted-agent seam. On reload f1's chip says "changed since linked — now S", a Re-confirm button
// measures 44×44, card d7 and the flow panel say so, and nothing saves; Re-confirm by keyboard writes the SECOND
// frame.link, re-pinning 7 to S and keeping 8 and 10, and the flag, the card and the flow line clear; Cmd+Z writes an
// undone line and the flag returns (stale is derived, never stored); the pack the portal wrote reads decision 7 stale
// with latest S and flow.md names add-payee (polled, because withPack writes after the append); verifyBuild [] and
// the page equal to the disk fold. WHAT IT CANNOT REACH: re-recording a decision in the discovery drawer (the
// follow-up ticket), and a dangling ref on the page (saveRun refuses an unknown frame.link ref, so 35.19/49.13 hold it).
//
// THE COMPOSE PASS (#312). A side portal whose UXF_COMPOSE_TRANSPORT names tooling/fake-compose-agent.mjs —
// a SCRIPTED stand-in for the model driving the REAL handler and fence; the main portal child never gets
// it — over fp-compose, the stand-in shape (no transcript.jsonl). Through the page: a briefed turn's card
// shows the brief and its why quotes it, the owner's line before the turn's init (C2); Accept lands an
// accepted line with fromStep and flags f3's missing states (C3); the error: missing button asks for
// exactly that state (C4); Refuse records the verdict and places nothing (C5); the four lines read
// proposed, accepted, proposed, refused from agent, owner, agent, owner (C6); Cmd+Z writes an undone line
// restating the accepted op, f3 leaves the stage and the disk fold, and the proposal stays byte-identical
// (C7); an un-briefed turn records briefed:false (C8); an impossible screen is a not-covered line and
// "Not covered: …" (C9); the fence fed through a turn writes six denied lines (C10); verifyBuild [] and the
// page's document equal to the disk fold (C11); 44×44 compose controls (C12). WHAT IT CANNOT REACH: a
// model — whether one yields, names the brief or escapes is --live-compose's, never the fake's.
//
// WHAT IT CANNOT REACH: the page's pixels (no baseline — the portal is not in the VR set); a REAL
// Brilliant tab and its pairing — only `--live-brilliant` meets the real bridge; the real ~46–60 s
// unpaired wait, which the fake answers at once; and two-tab behaviour beyond the 409 and the reload
// its one action performs (I7).
//
// --live-brilliant (#311 PR B, Task 7.2; chromium only, OWNER-RUN, $0 — no model anywhere): a portal
// child with NO UXF_BRILLIANT_MCP override, so the read spawns the real @brilliant-hq/mcp. It never
// waits on a keypress: it prints what to do, then polls POST /api/canvas/import/binding every 5 s until
// a paired tab has at least one element selected, and FAILS naming "no paired selection within 180 s"
// otherwise. Each poll spawns a fresh bridge, and an unpaired one may open a pairing tab. Then Check
// binding, Import selection (record + reference.png + a component.propose line), one mapping edit, and
// Browse (≥ 1 tile). It asserts SHAPES (16-hex ids, a PNG signature), never the owner's content.
//
// --live-compose (#312, Task 6.2; chromium only, OWNER-RUN, PAID ~$0.40–0.60, capped at $1.00): a side
// portal with the REAL transport over a fresh fp-compose — L1 a briefed screen (accepted; a refused turn is
// re-asked as a fresh turn at most twice), L2 its error state (refused), L3 an impossible screen, L4 an
// un-briefed screen (refused). Asserts SHAPES (ok, transport sdk, maxTurns 4, one session id, each init
// advertising exactly its turn's tool, the owner line before L1's init, verifyBuild []), REPORTS the rest,
// and writes the receipt to .claude/plans/canvas-compose-loop-312/raw/live-1/, which must not exist yet.
//
// Run it:
//   (cd portal && npm ci)                                   # server.mjs imports the Agent SDK (chat)
//   node tooling/canvas-journey.mjs [chromium|firefox|webkit|all]   # default: all
//   node tooling/canvas-journey.mjs chromium --live-brilliant       # a paired brilliant.design tab
//   node tooling/canvas-journey.mjs chromium --live-compose         # PAID: four real compose turns

import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { foldLedger, loadBuild, loadDecisions, placeExhibit, positionsOf, saveRun, seedSpine, verifyBuild } from "../portal/lib/canvas-store.mjs";
import { checkRecord, fidelityVerdict } from "../import/report.mjs";
import { THRESHOLD } from "../import/fidelity.mjs";
import { editMapping, runImport } from "../portal/lib/import-run.mjs";
import { readBuildPackage, renderPack } from "../agent-layer/gen-build-handoff.mjs";
import { applyOp as applyDiscoveryOp, applyOps as applyDiscoveryOps } from "../discovery/ops.mjs";
import { QUESTIONS as BANK } from "../discovery/bank.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const ENGINES = ["chromium", "firefox", "webkit"];
const argv = process.argv.slice(2);
const LIVE = argv.includes("--live-brilliant");
const LIVE_COMPOSE = argv.includes("--live-compose");
const badFlag = argv.find((a) => a.startsWith("--") && a !== "--live-brilliant" && a !== "--live-compose");
if (badFlag) { console.error(`canvas-journey: unknown flag "${badFlag}" — the flags are --live-brilliant and --live-compose`); process.exit(2); }
if (LIVE && LIVE_COMPOSE) { console.error("canvas-journey: --live-brilliant and --live-compose are separate legs — run one"); process.exit(2); }
const arg = argv.find((a) => !a.startsWith("--")) || (LIVE || LIVE_COMPOSE ? "chromium" : "all");
const toRun = arg === "all" ? ENGINES : [arg];
if (!toRun.every((e) => ENGINES.includes(e))) {
  console.error(`canvas-journey: unknown engine "${arg}" — chromium, firefox, webkit or all`);
  process.exit(2);
}
if (LIVE && arg !== "chromium") { console.error("canvas-journey: --live-brilliant runs on chromium only"); process.exit(2); }
if (LIVE_COMPOSE && arg !== "chromium") { console.error("canvas-journey: --live-compose runs on chromium only"); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const canon = (v) => (v && typeof v === "object" && !Array.isArray(v)
  ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`
  : (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v)));

// ---- preflight (R3) -----------------------------------------------------------------------------
if (!existsSync(path.join(REPO, "portal/node_modules/@anthropic-ai/claude-agent-sdk"))) {
  console.error("canvas-journey: portal/node_modules/@anthropic-ai/claude-agent-sdk is missing — run `cd portal && npm ci` first (server.mjs imports the SDK through lib/chat.mjs). Nothing was spawned.");
  process.exit(1);
}
const scratch = realpathSync(mkdtempSync(path.join(os.tmpdir(), "canvas-journey-")));
const DEFAULT_JOBS = path.resolve(REPO, "..", "Linards jobs folder");
if (scratch === REPO || scratch.startsWith(REPO + path.sep) || scratch === DEFAULT_JOBS) {
  console.error(`canvas-journey: the scratch dir ${scratch} is inside the repo or is the default jobs folder — refusing`);
  process.exit(1);
}
const HEAD = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
const LOG = path.join(scratch, "portal.log");

// ---- the portal child ------------------------------------------------------------------------------
let child = null;
let childExit = null;
const logTail = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").slice(-40).join("\n") : "(no log)");
const bail = (why) => { console.error(`\ncanvas-journey ✗  ${why}\n--- portal.log (last 40 lines) ---\n${logTail()}`); return teardown().then(() => process.exit(1)); };

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.on("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// A Brilliant MCP server that exits at once: the import's reach check meets a real failed server.
const MCP_DOWN = JSON.stringify({ type: "stdio", command: process.execPath, args: ["-e", "process.exit(1)"] });
// The fake bridge in one of its modes (tooling/fake-brilliant-bridge.mjs), by absolute path.
const FAKE = (mode) => JSON.stringify({ type: "stdio", command: process.execPath, args: [path.join(REPO, "tooling/fake-brilliant-bridge.mjs"), mode] });

async function boot(attempt = 1) {
  const port = await freePort();
  const fd = openSync(LOG, "a");
  childExit = null;
  child = spawn(process.execPath, [path.join(REPO, "portal/server.mjs")], {
    cwd: path.join(REPO, "portal"),
    env: { ...process.env, PORT: String(port), JOBS_DIR: scratch, UXF_BRILLIANT_MCP: MCP_DOWN, UXF_IMPORT_TIMEOUT_MS: "8000", UXF_IMPORT_SUGGEST: "off" },
    stdio: ["ignore", fd, fd],
  });
  child.on("exit", (code, signal) => { childExit = { code, signal }; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (childExit) {
      if (attempt === 1 && /EADDRINUSE/.test(readFileSync(LOG, "utf8"))) return boot(2);
      await bail(`portal exited (code ${childExit.code}) before answering /api/health`);
    }
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return { base, health: await r.json() };
    } catch { /* not listening yet */ }
    await sleep(200);
  }
  await bail("portal did not answer /api/health within 15 s");
}

// A SIDE portal child (I5, I9–I11, the live leg): its own free port and Brilliant server, the same
// scratch JOBS_DIR, asserted to be THIS worktree's portal before use, killed by its own handle.
// `mcp === null` leaves the real bridge (no override); `timeoutMs === null` keeps the reader's default.
const sides = new Set();
async function withPortal(mcp, fn, { timeoutMs = "8000", extraEnv = {} } = {}) {
  const port = await freePort();
  const fd = openSync(LOG, "a");
  const env = { ...process.env, PORT: String(port), JOBS_DIR: scratch, UXF_IMPORT_SUGGEST: "off", ...extraEnv };
  if (mcp === null) delete env.UXF_BRILLIANT_MCP; else env.UXF_BRILLIANT_MCP = mcp;
  if (timeoutMs === null) delete env.UXF_IMPORT_TIMEOUT_MS; else env.UXF_IMPORT_TIMEOUT_MS = timeoutMs;
  const proc = spawn(process.execPath, [path.join(REPO, "portal/server.mjs")], { cwd: path.join(REPO, "portal"), env, stdio: ["ignore", fd, fd] });
  let exit = null;
  proc.on("exit", (code, signal) => { exit = { code, signal }; });
  sides.add(proc);
  const b = `http://127.0.0.1:${port}`;
  try {
    let health = null;
    for (let i = 0; i < 75 && !health; i += 1) {
      if (exit) throw new Error(`the side portal exited (code ${exit.code}) before answering /api/health`);
      try { const r = await fetch(`${b}/api/health`); if (r.ok) health = await r.json(); } catch { /* not listening yet */ }
      if (!health) await sleep(200);
    }
    if (!health) throw new Error("the side portal did not answer /api/health within 15 s");
    if (path.resolve(health.jobsDir) !== scratch || health.bootSha !== HEAD || health.stale !== false) {
      throw new Error(`the side portal is not this run's: jobsDir ${health.jobsDir}, bootSha ${health.bootSha} (HEAD ${HEAD}), stale ${health.stale}`);
    }
    return await fn(b, () => exit);
  } finally {
    if (exit === null) {
      proc.kill("SIGTERM");
      const until = Date.now() + 3000;
      while (exit === null && Date.now() < until) await sleep(100);
      if (exit === null) proc.kill("SIGKILL");
    }
    sides.delete(proc);
  }
}

async function teardown() {
  for (const p of sides) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  if (child && childExit === null) {
    child.kill("SIGTERM");
    const until = Date.now() + 3000;
    while (childExit === null && Date.now() < until) await sleep(100);
    if (childExit === null) child.kill("SIGKILL");
  }
  rmSync(scratch, { recursive: true, force: true });
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { teardown().then(() => process.exit(130)); });
// A driver crash must not orphan a portal child or its scratch dir (it did once, before `quiet`).
process.on("unhandledRejection", (e) => { console.error(`\ncanvas-journey ✗  unhandled rejection: ${e?.message ?? e}`); teardown().then(() => process.exit(1)); });

// ---- the scratch packages ---------------------------------------------------------------------------
// Rebuilt per engine so every leg starts identical. fp-journey is a copy of the fictional Faster
// Payment package; its run.json keeps provenance "fictional" ON PURPOSE — step 3 asserts the page
// labels it fictional and flags the root. fp-stand-in carries no transcript.jsonl. Every copy is SEEDED from the
// spine (#316, the store's seedSpine): the committed package grows with a real run, and the steps below count lines
// and mint ids from the spine's six. A seed carries no handoff/, so #314's pack is written HERE, never into the spine.
const DISC = () => path.join(scratch, "_discovery");
function seed() {
  rmSync(DISC(), { recursive: true, force: true });
  mkdirSync(DISC(), { recursive: true });
  const src = path.join(REPO, "discovery/faster-payment");
  seedSpine(src, path.join(DISC(), "fp-journey"), { discovery: true });
  seedSpine(src, path.join(DISC(), "fp-stand-in"));
  // #311's import pass works on its own copy, so the steps above keep their line counts.
  seedSpine(src, path.join(DISC(), "fp-import"), { discovery: true });
  // #312's compose pass: the stand-in shape — run.json, prd.md and build/, no transcript.jsonl.
  seedSpine(src, path.join(DISC(), "fp-compose"));
  // #474's measurement pass, #314's lanes pass, #315's groups pass (its f3 seeded in-process by seedGroups) and #318's
  // blast-radius pass (its superseding decision seeded in-process by seedSupersede), likewise.
  for (const slug of ["fp-measure", "fp-lanes", "fp-groups", "fp-stale"]) seedSpine(src, path.join(DISC(), slug), { discovery: true });
}
const buildDir = (slug) => path.join(DISC(), slug, "build");
const ledger = (slug) => readFileSync(path.join(buildDir(slug), "ops.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
async function waitLines(slug, n, ms = 6000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (ledger(slug).length >= n) return ledger(slug); await sleep(100); }
  return ledger(slug);
}
const gitDiscovery = () => execFileSync("git", ["status", "--porcelain", "--", "discovery/"], { cwd: REPO, encoding: "utf8" });
const gitImportScope = () => execFileSync("git", ["status", "--porcelain", "--", "system/", "handoff/", "discovery/", "import/overrides/"], { cwd: REPO, encoding: "utf8" });

// ---- page helpers -------------------------------------------------------------------------------------
async function openCanvas(page, base, provenance, slug) {
  await page.goto(`${base}/canvas.html?provenance=${provenance}&slug=${slug}`, { waitUntil: "load" });
  await page.waitForSelector('html[data-canvas-page="ready"]', { timeout: 20000 });
  await page.waitForSelector('[data-canvas-verbs="ready"]', { timeout: 20000 });
}
const said = (page) => page.locator(".stx-live").textContent();
const waitSaid = (page, text, timeout = 4000) => page.waitForFunction((t) => (document.querySelector(".stx-live")?.textContent ?? "").includes(t), text, { timeout });
const node = (page, id) => page.locator(`[data-stx-id="${id}"]`);
const pageDoc = (page) => page.evaluate(() => import("/canvas.mjs").then((m) => m.getCanvasPage().doc));
const wOf = (page, id) => node(page, id).evaluate((n) => parseFloat(n.style.getPropertyValue("--w")));
const settleScroll = async (page) => {
  let last = null;
  for (let i = 0; i < 20; i += 1) {
    const now = await page.evaluate(() => `${scrollX},${scrollY},${document.querySelector(".stx-scroll")?.scrollLeft},${document.querySelector(".stx-scroll")?.scrollTop}`);
    if (now === last) return;
    last = now;
    await sleep(60);
  }
};
// Every node's rendered box, read with getBoundingClientRect, overlapping no other.
const overlaps = (page) => page.evaluate(() => {
  const rs = [...document.querySelectorAll("[data-stx-id]")].map((n) => ({ id: n.dataset.stxId, r: n.getBoundingClientRect() }));
  const out = [];
  for (let i = 0; i < rs.length; i += 1) for (let j = i + 1; j < rs.length; j += 1) {
    const a = rs[i].r; const b = rs[j].r;
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push(`${rs[i].id}×${rs[j].id}`);
  }
  return out;
});
const popRect = (page) => page.evaluate(() => {
  const p = document.getElementById("cv-inspector");
  const r = p.getBoundingClientRect();
  return { pos: p.dataset.cvPos, open: p.matches(":popover-open"), l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight };
});
const inView = (r) => r.open && r.l >= 0 && r.t >= 0 && r.r <= r.vw && r.b <= r.vh;
async function openDetails(page, id, how = "click") {
  const btn = page.locator(`[data-cv-details="${id}"]`);
  await btn.scrollIntoViewIfNeeded();
  await settleScroll(page);
  if (how === "keyboard") { await btn.focus(); await page.keyboard.press("Enter"); }
  else await btn.click();
  await page.waitForFunction(() => document.getElementById("cv-inspector")?.matches(":popover-open"), null, { timeout: 4000 });
}
async function undo(page) {
  await page.locator(".stx-scroll").focus();
  await page.keyboard.press("ControlOrMeta+z");
}

// ---- one engine, one leg ---------------------------------------------------------------------------------
async function leg(engine, base, results) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name}  ${extra}`); }
  };
  // A throw becomes a failed, NAMED step rather than a silent abort of the leg; a dead portal is named
  // as such rather than as whatever timeout it caused.
  const step = async (name, fn) => {
    try { await fn(); }
    catch (e) {
      t(`${name} — threw`, false, childExit ? `portal exited (code ${childExit.code})` : e.message.split("\n")[0]);
    }
    if (childExit) throw new Error(`portal exited (code ${childExit.code}) during ${name}`);
  };

  seed();
  const gitBefore = gitDiscovery();
  const browser = await pw[engine].launch();
  const errors = [];
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    watch(page);

    await step("1 · the run list", async () => {
      await page.goto(`${base}/#/canvas`, { waitUntil: "load" });
      await page.waitForSelector(".cv-run", { timeout: 10000 });
      const rows = await page.locator(".cv-run").evaluateAll((els) => els.map((e) => ({ run: e.dataset.run, text: e.textContent })));
      const ids = rows.map((r) => r.run);
      t("1 · #/canvas lists faster-payment (fictional), fp-journey and fp-stand-in (real)",
        ["fictional/faster-payment", "real/fp-journey", "real/fp-stand-in"].every((x) => ids.includes(x)), JSON.stringify(ids));
      t("1 · …the stand-in row says it has no transcript",
        rows.find((r) => r.run === "real/fp-stand-in")?.text.includes("stand-in: no transcript"), JSON.stringify(rows));
    });

    await step("2 · the in-repo spine, opened", async () => {
      const saves = [];
      const onReq = (r) => { if (r.url().includes("/api/canvas/save")) saves.push(r.url()); };
      page.on("request", onReq);
      await openCanvas(page, base, "fictional", "faster-payment");
      await sleep(1000);
      page.off("request", onReq);
      const label = await page.locator("[data-canvas-label]").textContent();
      t("2 · the in-repo package reads \"Fictional flow, neutral skin\" with NO mismatch flag",
        label.includes("Fictional flow, neutral skin") && (await page.locator("[data-canvas-mismatch]").count()) === 0, label);
      const where = await page.locator("[data-canvas-where]").textContent();
      t("2 · the save notice names discovery/faster-payment/build/ (R2)", where.includes("discovery/faster-payment/build/") && where.includes("git checkout"), where);
      t("2 · ZERO save requests across load and a 1 s idle (D11)", saves.length === 0, `${saves.length} request(s)`);
      const o = await overlaps(page);
      t("2 · no two nodes' rendered boxes overlap", o.length === 0, o.join(", "));
    });

    await step("3 · a copied run in the jobs folder", async () => {
      await openCanvas(page, base, "real", "fp-journey");
      const label = await page.locator("[data-canvas-label]").textContent();
      t("3 · run.json's provenance wins: \"Fictional flow, neutral skin\" WITH the root flagged",
        label.includes("Fictional flow, neutral skin") && (await page.locator("[data-canvas-mismatch]").count()) === 1, label);
      t("3 · frames f1 and f2 on the stage", (await node(page, "f1").count()) === 1 && (await node(page, "f2").count()) === 1);
      t("3 · f1 renders its screen.set hint", (await node(page, "f1").textContent()).includes("We check this against the name you gave."));
      t("3 · f2 renders its state's override", (await node(page, "f2").textContent()).includes("Send anyway"));
      t("3 · arrow a1 is drawn", (await page.locator('.stx-arrow[data-stx-arrow="a1"]').count()) === 1);
      const q = "What would have to be true for this option to work?";
      t("3 · cards d7 and d8 render from the transcript (d7 carries its question)",
        (await node(page, "d7").textContent()).includes(q) && (await node(page, "d8").count()) === 1);
      const o = await overlaps(page);
      t("3b · every node's rendered box overlaps no other (the default placement, on real heights)", o.length === 0, o.join(", "));
    });

    await step("4 · a note by keyboard", async () => {
      await page.locator("[data-canvas-verb=annotate]").focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.activeElement?.classList.contains("cv-note-editor"), null, { timeout: 4000 });
      await page.keyboard.type("Check the CoP copy with legal");
      await page.keyboard.press("Tab");
      await waitSaid(page, "Note n1 added.").catch(() => {});
      t("4 · the live region says \"Note n1 added.\"", (await said(page)).includes("Note n1 added."), await said(page));
      const l = await waitLines("fp-journey", 7);
      const line = l[6];
      t("4 · ledger line 7 is annotate {text}, applied, owner",
        line?.op === "annotate" && line.params?.text === "Check the CoP copy with legal" && !("noteId" in (line.params ?? {})) && line.status === "applied" && line.source === "owner",
        JSON.stringify(line));
    });

    await step("5 · link a decision by keyboard", async () => {
      await openDetails(page, "f1", "keyboard");
      const box = page.locator('#cv-inspector input[type="checkbox"][value="10"]');
      await box.scrollIntoViewIfNeeded();
      await box.focus();
      await page.keyboard.press("Space");
      await page.getByRole("button", { name: "Link decisions" }).focus();
      await page.keyboard.press("Enter");
      await waitSaid(page, "now embodies").catch(() => {});
      t("5 · the link is announced", (await said(page)).includes("add-payee (f1) now embodies decisions 7, 8, 10."), await said(page));
      const l = await waitLines("fp-journey", 8);
      t("5 · ledger line 8 is frame.link {f1, [7, 8, 10]}",
        canon(l[7]?.params) === canon({ frameId: "f1", decisionRefs: ["7", "8", "10"] }) && l[7]?.op === "frame.link" && l[7]?.status === "applied", JSON.stringify(l[7]));
      t("5 · card d10 is on the stage", (await node(page, "d10").count()) === 1);
    });

    await step("5b · the inspector inside the viewport", async () => {
      await openDetails(page, "f2");
      const r = await popRect(page);
      t(`5b · the open inspector lies inside the viewport (branch: ${r.pos})`, inView(r), JSON.stringify(r));
      await page.keyboard.press("Escape");
      if (engine === "chromium") {
        // NARROW ON PURPOSE: at 760 px the layout is one column and the rightmost frame's Details
        // button sits within a popover's width of the right edge, so an unclamped fallback overflows.
        // At 1000 px it did not, and removing the clamp stayed green — found by running the mutation.
        const ctx2 = await browser.newContext({ viewport: { width: 760, height: 700 } });
        const p2 = await ctx2.newPage();
        watch(p2);
        await p2.addInitScript(() => {
          const real = CSS.supports.bind(CSS);
          CSS.supports = (...a) => (String(a.join(" ")).includes("anchor-name") ? false : real(...a));
        });
        await openCanvas(p2, base, "real", "fp-journey");
        const rightmost = await p2.evaluate(() => [...document.querySelectorAll(".stx-frame")]
          .sort((a, b) => parseFloat(b.style.getPropertyValue("--x")) - parseFloat(a.style.getPropertyValue("--x")))[0]?.dataset.stxId);
        // Scroll the canvas so the button's right edge sits at the scroller's right edge: the case an
        // unclamped fallback gets wrong. Left to scrollIntoView, the button lands mid-view and a
        // popover's width fits beside it either way — the clamp mutation stayed green until this.
        await p2.evaluate((id) => {
          const sc = document.querySelector(".stx-scroll");
          const b = document.querySelector(`[data-cv-details="${id}"]`).getBoundingClientRect();
          sc.scrollLeft += b.right - (sc.getBoundingClientRect().right - 6);
        }, rightmost);
        await settleScroll(p2);
        await openDetails(p2, rightmost);
        const r2 = await popRect(p2);
        t(`5b · FORCED fallback (chromium, CSS.supports stubbed): data-cv-pos="fallback" and inside the viewport on the rightmost frame (${rightmost})`,
          r2.pos === "fallback" && inView(r2), JSON.stringify(r2));
        await ctx2.close();
      }
    });

    await step("6 · removing a base is refused", async () => {
      await openDetails(page, "f1");
      await page.getByRole("button", { name: "Remove frame" }).click();
      await waitSaid(page, "error (f2)").catch(() => {});
      t("6 · the refusal names the blocking state, error (f2)", (await said(page)).includes("error (f2)"), await said(page));
      await sleep(400);
      t("6 · a refused op records nothing — still 8 lines", ledger("fp-journey").length === 8, String(ledger("fp-journey").length));
    });

    await step("7 · removing the state", async () => {
      await openDetails(page, "f2");
      await page.getByRole("button", { name: "Remove frame" }).click();
      await waitSaid(page, "Removed").catch(() => {});
      t("7 · f2 and a1 are gone", (await node(page, "f2").count()) === 0 && (await page.locator('.stx-arrow[data-stx-arrow="a1"]').count()) === 0);
      t("7 · the announcement counts the arrow", (await said(page)).includes("and 1 arrow"), await said(page));
      const l = await waitLines("fp-journey", 9);
      t("7 · ledger line 9 is frame.remove {f2}", l[8]?.op === "frame.remove" && canon(l[8]?.params) === canon({ frameId: "f2" }), JSON.stringify(l[8]));
    });

    await step("8 · undo by keyboard", async () => {
      await undo(page);
      await page.waitForSelector('[data-stx-id="f2"]', { timeout: 4000 }).catch(() => {});
      await page.waitForSelector('.stx-arrow[data-stx-arrow="a1"]', { timeout: 4000 }).catch(() => {});
      t("8 · f2 and a1 are back", (await node(page, "f2").count()) === 1 && (await page.locator('.stx-arrow[data-stx-arrow="a1"]').count()) === 1);
      const l = await waitLines("fp-journey", 10);
      t("8 · ledger line 10 is undone, restating line 9 (D1)",
        l[9]?.status === "undone" && l[9]?.op === l[8]?.op && canon(l[9]?.params) === canon(l[8]?.params), JSON.stringify(l[9]));
    });

    await step("9 · a numeric width, then one undo", async () => {
      await openDetails(page, "f1");
      await page.locator("#cv-size-width").fill("600");
      await page.getByRole("button", { name: "Apply size" }).click();
      const l = await waitLines("fp-journey", 11);
      t("9 · ledger line 11 is frame.size {f1, width 600}", l[10]?.op === "frame.size" && canon(l[10]?.params) === canon({ frameId: "f1", width: 600 }), JSON.stringify(l[10]));
      t("9 · f1 is 600 wide on the stage", (await wOf(page, "f1")) === 600, String(await wOf(page, "f1")));
      await undo(page);
      const l2 = await waitLines("fp-journey", 12);
      t("9 · ONE undo puts f1 back at 390", (await wOf(page, "f1")) === 390, String(await wOf(page, "f1")));
      t("9 · …and ledger line 12 is undone, restating line 11 (one gesture, one entry)",
        l2[11]?.status === "undone" && canon(l2[11]?.params) === canon(l2[10]?.params) && l2.length === 12, JSON.stringify(l2.slice(10)));
    });

    await step("10 · a pointer resize, then one undo", async () => {
      const grip = page.locator('[data-stx-id="f1"] > .stx-resize');
      await grip.scrollIntoViewIfNeeded();
      await settleScroll(page);
      const g = await grip.boundingBox();
      const before = ledger("fp-journey").length;
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.down();
      for (let i = 1; i <= 8; i += 1) await page.mouse.move(g.x + g.width / 2 + i * 10, g.y + g.height / 2);
      await page.mouse.up();
      const l = await waitLines("fp-journey", before + 1);
      const added = l.slice(before);
      t("10 · exactly one new frame.size line from the drag (the resized hook, D8)",
        added.length === 1 && added[0].op === "frame.size" && added[0].params.frameId === "f1" && Number.isInteger(added[0].params.width) && added[0].params.width > 390,
        JSON.stringify(added));
      await undo(page);
      const l2 = await waitLines("fp-journey", before + 2);
      t("10 · ONE undo restores 390 and appends exactly one undone line",
        (await wOf(page, "f1")) === 390 && l2.length === before + 2 && l2[before + 1]?.status === "undone" && l2[before + 1]?.op === "frame.size",
        `w=${await wOf(page, "f1")} ${JSON.stringify(l2.slice(before))}`);
    });

    await step("10b · a note edited by POINTER", async () => {
      // The editor's tabindex is what keeps a press in it from starting a canvas move (studio-verbs'
      // body-drag guard matches [tabindex] and not [contenteditable]). Step 4 is keyboard-only and
      // cannot see that — removing the tabindex stayed green there — so this step clicks.
      const ed = page.locator('[data-stx-id="n1"] .cv-note-editor');
      await ed.scrollIntoViewIfNeeded();
      await settleScroll(page);
      const before = ledger("fp-journey").length;
      await ed.click();
      await page.keyboard.press("End");
      await page.keyboard.type(" (pointer)");
      await page.keyboard.press("Tab");
      const l = await waitLines("fp-journey", before + 1);
      const line = l[before];
      t("10b · a click-then-type edit lands as ONE annotate {noteId n1} line",
        l.length === before + 1 && line?.op === "annotate" && line.params?.noteId === "n1" && line.params?.text?.endsWith(" (pointer)"), JSON.stringify(l.slice(before)));
    });

    // BEFORE THE RELOAD, and that is the whole point: after one, the page's document IS the server's
    // fold of disk, so comparing it with a Node fold of disk compares a thing with itself. Here the
    // page's document is the one it built through its own applyOp and adapter.restore across ten
    // gestures, and the ledger it sent must fold to exactly that.
    await step("12a · the page's own document equals the ledger it wrote", async () => {
      await page.waitForFunction(() => import("/canvas.mjs").then((m) => m.getCanvasPage().pending.length === 0), null, { timeout: 6000 }).catch(() => {});
      const disk = foldLedger(ledger("fp-journey")).doc;
      t("12a · before any reload, the document the page built equals foldLedger(ops.jsonl)", canon(disk) === canon(await pageDoc(page)));
    });

    await step("11 · reload", async () => {
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector('html[data-canvas-page="ready"]', { timeout: 20000 });
      const n1 = await node(page, "n1").textContent().catch(() => "");
      t("11 · after reload n1 shows its text, d10 and f2 are present, f1 is 390 wide",
        n1.includes("Check the CoP copy with legal") && (await node(page, "d10").count()) === 1 && (await node(page, "f2").count()) === 1 && (await wOf(page, "f1")) === 390,
        `n1=${JSON.stringify(n1)} w=${await wOf(page, "f1")}`);
    });

    await step("12 · disk and page agree", async () => {
      const pkg = loadBuild(buildDir("fp-journey"));
      const fails = verifyBuild(pkg);
      t("12 · verifyBuild over the package on disk → []", fails.length === 0, fails.join(" | "));
      // After the reload this is the server's fold vs a Node fold of the same file — kept as a check
      // that the route serves the fold, NOT as the page-equals-disk claim (that is 12a's).
      t("12 · after reload, the route serves the ledger's fold", canon(foldLedger(pkg.ops).doc) === canon(await pageDoc(page)));
    });

    await step("13 · the origin guard and the 409", async () => {
      const n = ledger("fp-journey").length;
      const evil = await fetch(`${base}/api/canvas/save`, { method: "POST", headers: { origin: "http://evil.example", "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug: "fp-journey", base: n, ops: [], positions: {} }) });
      t("13 · a cross-origin save → 403, ledger unchanged", evil.status === 403 && ledger("fp-journey").length === n, String(evil.status));
      const stale = await fetch(`${base}/api/canvas/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug: "fp-journey", base: n - 1, ops: [], positions: {} }) });
      t("13 · a stale base → 409, ledger unchanged", stale.status === 409 && ledger("fp-journey").length === n, String(stale.status));
    });

    await step("14 · the stand-in", async () => {
      await openCanvas(page, base, "real", "fp-stand-in");
      const flag = "no transcript.jsonl (a stand-in)";
      t("14 · d7 and d8 carry the stand-in flag", (await node(page, "d7").textContent()).includes(flag) && (await node(page, "d8").textContent()).includes(flag));
      await openDetails(page, "f1");
      t("14 · the inspector offers no decision checkboxes, says why, and the link is disabled",
        // #315's "Save parts as a group" checkboxes are not decisions; they are counted out.
        (await page.locator('#cv-inspector input[type="checkbox"]:not([data-group-part])').count()) === 0 && (await page.locator("#cv-no-transcript").count()) === 1
          && (await page.getByRole("button", { name: "Link decisions" }).isDisabled()));
      await page.keyboard.press("Escape");
      const before = readFileSync(path.join(buildDir("fp-stand-in"), "canvas.json"), "utf8");
      const grab = page.locator('[data-stx-id="d7"] > .stx-grab');
      await grab.scrollIntoViewIfNeeded();
      await grab.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      let after = before;
      for (let i = 0; i < 40 && after === before; i += 1) { await sleep(100); after = readFileSync(path.join(buildDir("fp-stand-in"), "canvas.json"), "utf8"); }
      t("14 · moving a card on the stand-in still saves (flagged, not blocked)", after !== before);
    });

    await lanesPass(base, page, t, step);
    await groupsPass(base, page, t, step, errors);
    await blastPass(base, page, t, step);

    await step("15 · 44×44 targets", async () => {
      await openCanvas(page, base, "real", "fp-journey");
      const measure = async (loc, label) => {
        await loc.scrollIntoViewIfNeeded();
        await settleScroll(page);
        const b = await loc.boundingBox();
        return { label, w: b?.width ?? 0, h: b?.height ?? 0 };
      };
      const sizes = [await measure(page.locator("[data-canvas-verb=annotate]"), "Add note"), await measure(page.locator('[data-cv-details="f1"]'), "Details")];
      // #314's toolbar controls (the draft's Keep, Discard and the inspector's lane buttons are measured in L3).
      for (const [sel, label] of [["[data-canvas-lane]", "lane select"], ["[data-canvas-verb=lane-new]", "New lane"], ["[data-canvas-verb=pack]", "Write handoff pack"]]) sizes.push(await measure(page.locator(sel), label));
      await openDetails(page, "f1");
      sizes.push(await measure(page.locator("#cv-size-preset"), "preset select"));
      sizes.push(await measure(page.locator("#cv-size-width"), "width input"));
      for (const name of ["Apply size", "Link decisions", "Remove frame", "Close"]) sizes.push(await measure(page.getByRole("button", { name }), name));
      const labels = page.locator("#cv-inspector .cv-check");
      for (let i = 0; i < Math.min(3, await labels.count()); i += 1) sizes.push(await measure(labels.nth(i), `checkbox label ${i + 1}`));
      const small = sizes.filter((s) => s.w < 44 || s.h < 44);
      t(`15 · every new control measures at least 44×44 (${sizes.length} measured)`, small.length === 0, JSON.stringify(small));
      await page.keyboard.press("Escape");
    });

    await importPass(engine, base, page, t, step, errors);
    await measurePass(base, page, t, step);
    await composePass(base, page, t, step);

    t("16 · no page errors or console errors across the leg", errors.length === 0, errors.slice(0, 3).join(" | "));
    const gitAfter = gitDiscovery();
    t("the leg changed nothing under discovery/ (git status identical before and after)", gitAfter === gitBefore, gitAfter);
    await ctx.close();
  } finally {
    await browser.close();
  }
}

// ---- the lanes pass (#314) ------------------------------------------------------------------------------
// A variant is a LANE: drafted on the page (nothing written), kept as ONE variant.add, and the frames, the
// completeness check and the flow panel switch with it. Runs on its own copy, fp-lanes, whose pack starts absent.
async function lanesPass(base, page, t, step) {
  const pkg = path.join(DISC(), "fp-lanes");
  const flowFile = path.join(buildDir("fp-lanes"), "handoff", "flow.md");
  const flow = () => page.locator("[data-canvas-flow-text]").textContent();
  const hidden = (sel) => page.locator(sel).evaluate((b) => getComputedStyle(b).display === "none");
  await step("L1 · lane A only, Keep and Discard hidden", async () => {
    await openCanvas(page, base, "real", "fp-lanes");
    const opts = await page.locator("[data-canvas-lane] option").allTextContents();
    t("L1 · the lane select holds exactly A (base)", opts.join("|") === "A (base)", JSON.stringify(opts));
    t("L1 · Keep lane and Discard lane are display:none (computed, not the attribute)", (await hidden("[data-canvas-verb=lane-keep]")) && (await hidden("[data-canvas-verb=lane-discard]")));
  });
  await step("L2 · a new lane is a draft; key a is refused", async () => {
    await page.click("[data-canvas-verb=lane-new]");
    await page.fill("[data-canvas-lane-key]", "a");
    await page.click("[data-canvas-verb=lane-create]");
    await waitSaid(page, "Refused:").catch(() => {});
    const refusal = await said(page);
    const draftA = await page.evaluate(() => import("/canvas.mjs").then((m) => m.getCanvasPage().laneDraft));
    t("L2 · key a is refused, naming lane A, and nothing is drafted", refusal.includes("Refused:") && refusal.includes("lane A") && draftA === null, refusal);
    await page.fill("[data-canvas-lane-key]", "b");
    await page.click("[data-canvas-verb=lane-create]");
    const opts = await page.locator("[data-canvas-lane] option").allTextContents();
    t("L2 · the select shows b (draft), selected, with Keep and Discard visible",
      opts.includes("b (draft)") && (await page.locator("[data-canvas-lane]").inputValue()) === "b"
        && !(await hidden("[data-canvas-verb=lane-keep]")) && !(await hidden("[data-canvas-verb=lane-discard]")), JSON.stringify(opts));
    t("L2 · a draft writes nothing (ledger still 6)", ledger("fp-lanes").length === 6, String(ledger("fp-lanes").length));
  });
  await step("L3 · override one text in lane b", async () => {
    await openDetails(page, "f1");
    await page.selectOption("#cv-lane-part", "continue");
    await page.selectOption("#cv-lane-prop", "label");
    await page.fill("#cv-lane-value", "Check the name");
    const sizes = [];
    for (const name of ["Set in lane", "Leave out of lane"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      sizes.push({ name, w: b?.width ?? 0, h: b?.height ?? 0 });
    }
    for (const sel of ["[data-canvas-verb=lane-keep]", "[data-canvas-verb=lane-discard]"]) {
      const b = await page.locator(sel).boundingBox();
      sizes.push({ name: sel, w: b?.width ?? 0, h: b?.height ?? 0 });
    }
    const small = sizes.filter((x) => x.w < 44 || x.h < 44);
    t("L3 · the lane buttons measure at least 44×44", small.length === 0, JSON.stringify(small));
    await page.getByRole("button", { name: "Set in lane" }).click();
    await page.keyboard.press("Escape");
    t("L3 · f1 reads Check the name in lane b, and nothing is written", (await node(page, "f1").textContent()).includes("Check the name") && ledger("fp-lanes").length === 6);
  });
  await step("L4 · leave f2 out of lane b", async () => {
    await openDetails(page, "f2");
    await page.getByRole("button", { name: "Leave out of lane" }).click();
    await page.keyboard.press("Escape");
    t("L4 · f2 shows Not in lane b", (await node(page, "f2").textContent()).includes("Not in lane b"));
    t("L4 · f1's error chip is a plain chip, never an ask button",
      (await node(page, "f1").textContent()).includes("error: missing in lane b") && (await page.locator('[data-cv-ask-state="f1:error"]').count()) === 0);
    const text = await flow();
    t("L4 · the flow panel has no f2 line", !/^\s*f2\b/m.test(text) && !text.includes("--> f2"), JSON.stringify(text));
  });
  await step("L5 · Keep lane writes ONE variant.add, and the save regenerates the pack", async () => {
    await page.click("[data-canvas-verb=lane-keep]");
    const l = await waitLines("fp-lanes", 7);
    const want = { key: "b", overrides: { f1: { set: { continue: { label: "Check the name" } } }, f2: { omit: true } } };
    t("L5 · ledger line 7 is variant.add with the whole override map, applied, owner",
      l.length === 7 && l[6]?.op === "variant.add" && canon(l[6]?.params) === canon(want) && l[6]?.status === "applied" && l[6]?.source === "owner", JSON.stringify(l[6]));
    for (let i = 0; i < 40 && !(existsSync(flowFile) && readFileSync(flowFile, "utf8").includes("## Lane b")); i += 1) await sleep(100);
    t("L5 · the save wrote the pack: build/handoff/flow.md carries ## Lane b", existsSync(flowFile) && readFileSync(flowFile, "utf8").includes("## Lane b"));
  });
  await step("L6 · the frames, the check and the diagram switch with the lane", async () => {
    await page.selectOption("[data-canvas-lane]", "");
    t("L6 · lane A: f1 reads Continue", (await node(page, "f1").textContent()).includes("Continue") && !(await node(page, "f1").textContent()).includes("Check the name"));
    const asks = await page.locator("[data-cv-ask-state^='f1:']").evaluateAll((els) => els.map((e) => e.dataset.cvAskState).sort());
    t("L6 · lane A: f1's missing asks are empty, loading, partial — no error", canon(asks) === canon(["f1:empty", "f1:loading", "f1:partial"]), JSON.stringify(asks));
    t("L6 · lane A: the flow panel has f1 --> f2", (await flow()).includes("f1 --> f2"));
    await page.selectOption("[data-canvas-lane]", "b");
    t("L6 · lane b: the flow panel lacks f1 --> f2 and the missing list names error",
      !(await flow()).includes("f1 --> f2") && (await page.locator("[data-canvas-flow-missing]").textContent()).includes("error"));
    t("L6 · a lane switch writes nothing (ledger still 7)", ledger("fp-lanes").length === 7, String(ledger("fp-lanes").length));
  });
  await step("L7 · Write handoff pack", async () => {
    rmSync(path.join(buildDir("fp-lanes"), "handoff"), { recursive: true, force: true });
    await page.click("[data-canvas-verb=pack]");
    await page.waitForFunction(() => (document.querySelector("[data-canvas-save]")?.textContent ?? "").startsWith("Handoff pack written"), null, { timeout: 6000 }).catch(() => {});
    const status = await page.locator("[data-canvas-save]").textContent();
    t("L7 · the button wrote flow.md (removed first), equal to renderPack and carrying ## Lane b",
      existsSync(flowFile) && readFileSync(flowFile, "utf8") === renderPack(readBuildPackage(pkg))["flow.md"] && readFileSync(flowFile, "utf8").includes("## Lane b"), status);
    rmSync(path.join(buildDir("fp-lanes"), "handoff"), { recursive: true, force: true });
    const evil = await fetch(`${base}/api/canvas/pack`, { method: "POST", headers: { origin: "http://evil.example", "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug: "fp-lanes" }) });
    t("L7 · a cross-origin pack POST → 403 and writes nothing", evil.status === 403 && !existsSync(flowFile), String(evil.status));
  });
  await step("L8 · undo takes the lane away", async () => {
    await undo(page);
    const l = await waitLines("fp-lanes", 8);
    t("L8 · line 8 is an undone line restating the variant.add", l[7]?.status === "undone" && l[7]?.op === "variant.add" && canon(l[7]?.params) === canon(l[6]?.params), JSON.stringify(l[7]));
    const opts = await page.locator("[data-canvas-lane] option").allTextContents();
    t("L8 · the select no longer lists b", opts.join("|") === "A (base)", JSON.stringify(opts));
  });
  await step("L9 · disk and page agree", async () => {
    await page.waitForFunction(() => import("/canvas.mjs").then((m) => m.getCanvasPage().pending.length === 0), null, { timeout: 6000 }).catch(() => {});
    const fails = verifyBuild(loadBuild(buildDir("fp-lanes")));
    t("L9 · verifyBuild over fp-lanes → []", fails.length === 0, fails.join(" | "));
    t("L9 · the page's document equals foldLedger(ops.jsonl)", canon(foldLedger(ledger("fp-lanes")).doc) === canon(await pageDoc(page)));
  });
}

// ---- the blast-radius pass (#318) -----------------------------------------------------------------------
// A decision re-recorded after a frame was linked to it. The superseding line is SEEDED into fp-stale's scratch copy
// through discovery/ops.mjs's REAL applier (a closed session refuses turns, and the drawer has no scripted-agent
// seam), in opLine's exact shape. Never portal/lib/discovery.mjs: it imports env.mjs, which loads portal/.env into
// this process and every portal child after it. The answer line names this driver as its author.
function seedSupersede(slug) {
  const pkg = path.join(DISC(), slug);
  const jl = (f) => readFileSync(path.join(pkg, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const lines = jl("transcript.jsonl");
  const answers = jl("answers.jsonl");
  const state = applyDiscoveryOps(lines.filter((l) => l.type === "op").map((l) => ({ op: l.op, params: l.params, turn: l.turn })), { answers, bank: BANK, turn: null });
  const seven = state.ops.find((r) => r.seq === 7);
  const ts = new Date().toISOString();
  const a = { ref: `a${answers.length + 1}`, ts, turn: "t25", question_id: seven.params.question_id, kind: "banked",
    text: "Seeded by tooling/canvas-journey.mjs (#318) to stand in for a re-recorded decision — not the owner's words." };
  const r = applyDiscoveryOp(state, { op: "record_decision", params: { ...seven.params, answer_ref: a.ref, evidence_refs: [], wrong_if: "Journey fixture (#318)." } }, { answers: [...answers, a], bank: BANK, turn: a.turn }).ops.at(-1);
  if (r.supersedes !== 7) throw new Error(`seedSupersede: the seeded decision supersedes ${r.supersedes}, not 7`);
  appendFileSync(path.join(pkg, "answers.jsonl"), `${JSON.stringify(a)}\n`);
  appendFileSync(path.join(pkg, "transcript.jsonl"), `${JSON.stringify({ type: "op", ts, seq: r.seq, turn: r.turn, op: r.op, params: r.params, closes: r.closes, flagged: r.flagged, supersedes: r.supersedes })}\n`);
  return r.seq;
}

async function blastPass(base, page, t, step) {
  const chips = () => node(page, "f1").locator(".cv-chip").allTextContents();
  const staleChips = () => node(page, "f1").locator(".cv-chip-stale").count();
  const reconfirm = () => page.locator('[data-cv-reconfirm="f1"]');
  const flowList = () => page.locator("[data-canvas-flow-missing]").textContent();
  const handoff = (f) => path.join(buildDir("fp-stale"), "handoff", f);
  let S = null;
  await step("B1 · fp-stale opens current; the card lists its frame; the first frame.link", async () => {
    await openCanvas(page, base, "real", "fp-stale");
    const c = await chips();
    t("B1 · f1 shows Decision 7 and Decision 8, none stale, no Re-confirm",
      c.includes("Decision 7") && c.includes("Decision 8") && (await staleChips()) === 0 && (await reconfirm().count()) === 0, JSON.stringify(c));
    const by = await node(page, "d7").locator(".cv-card-by").textContent().catch(() => null);
    t("B1 · card d7 reads Embodied by: add-payee (AC #4, the reverse index)", by === "Embodied by: add-payee", by);
    t("B1 · no save on load (the ledger is still 6 lines)", ledger("fp-stale").length === 6, String(ledger("fp-stale").length));
    await openDetails(page, "f1", "keyboard");
    const box = page.locator('#cv-inspector input[type="checkbox"][value="10"]');
    await box.scrollIntoViewIfNeeded();
    await box.focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Link decisions" }).focus();
    await page.keyboard.press("Enter");
    const l = await waitLines("fp-stale", 7);
    t("B1 · ledger line 7 is the first frame.link {f1, [7, 8, 10]}",
      l[6]?.op === "frame.link" && canon(l[6]?.params) === canon({ frameId: "f1", decisionRefs: ["7", "8", "10"] }) && l[6]?.status === "applied", JSON.stringify(l[6]));
  });
  await step("B2 · decision 7 is superseded; f1, card d7 and the flow panel say so", async () => {
    S = seedSupersede("fp-stale");
    await openCanvas(page, base, "real", "fp-stale");
    const c = await chips();
    t(`B2 · f1 shows Decision 7 changed since linked — now ${S}`, c.includes(`Decision 7 changed since linked — now ${S}`) && (await staleChips()) === 1, JSON.stringify(c));
    await reconfirm().scrollIntoViewIfNeeded();
    await settleScroll(page);
    const b = await reconfirm().boundingBox();
    t("B2 · a Re-confirm button on f1, at least 44×44", (b?.width ?? 0) >= 44 && (b?.height ?? 0) >= 44, JSON.stringify(b));
    const flag = await node(page, "d7").locator(".cv-flag").allTextContents();
    t(`B2 · card d7 says it was superseded by ${S}`, flag.some((x) => x.startsWith(`Changed since linked — superseded; the latest is decision ${S}`)), JSON.stringify(flag));
    const fl = await flowList();
    t("B2 · the flow panel lists add-payee's changed decision", fl.includes(`add-payee: decision 7 changed since linked (now ${S})`), fl);
    t("B2 · no save on load (the ledger is still 7 lines)", ledger("fp-stale").length === 7, String(ledger("fp-stale").length));
  });
  await step("B3 · Re-confirm by keyboard is the second frame.link", async () => {
    await reconfirm().focus();
    await page.keyboard.press("Enter");
    await waitSaid(page, "now embodies").catch(() => {});
    t("B3 · the live region announces the re-pin", (await said(page)).includes(`add-payee (f1) now embodies decisions ${S}, 8, 10.`), await said(page));
    const l = await waitLines("fp-stale", 8);
    t(`B3 · ledger line 8 is frame.link {f1, [${S}, 8, 10]}, applied, owner`,
      l[7]?.op === "frame.link" && canon(l[7]?.params) === canon({ frameId: "f1", decisionRefs: [String(S), "8", "10"] }) && l[7]?.status === "applied" && l[7]?.source === "owner", JSON.stringify(l[7]));
    const links = l.filter((x) => x.op === "frame.link");
    t("B3 · the ledger holds exactly TWO frame.link lines, the second re-pinning 7 (AC #2)",
      links.length === 2 && links[0].params.decisionRefs.includes("7") && !links[1].params.decisionRefs.includes("7") && links[1].params.decisionRefs.includes(String(S)), JSON.stringify(links.map((x) => x.params)));
  });
  await step("B4 · the flag clears", async () => {
    await page.waitForFunction(() => !document.querySelector('[data-cv-reconfirm="f1"]'), null, { timeout: 4000 }).catch(() => {});
    t("B4 · f1 has no stale chip and no Re-confirm", (await staleChips()) === 0 && (await reconfirm().count()) === 0, JSON.stringify(await chips()));
    t(`B4 · card d${S} is on the stage and card d7 is gone`, (await node(page, `d${S}`).count()) === 1 && (await node(page, "d7").count()) === 0);
    t("B4 · the flow panel no longer lists a changed decision", !(await flowList()).includes("changed since linked"), await flowList());
  });
  await step("B5 · undo brings the flag back (stale is derived, not stored)", async () => {
    await undo(page);
    const l = await waitLines("fp-stale", 9);
    t("B5 · ledger line 9 is undone, restating line 8", l[8]?.status === "undone" && l[8]?.op === "frame.link" && canon(l[8]?.params) === canon(l[7]?.params), JSON.stringify(l[8]));
    await page.waitForFunction(() => !!document.querySelector('[data-cv-reconfirm="f1"]'), null, { timeout: 4000 }).catch(() => {});
    t(`B5 · f1 again shows Decision 7 changed since linked — now ${S}`, (await chips()).includes(`Decision 7 changed since linked — now ${S}`) && (await reconfirm().count()) === 1, JSON.stringify(await chips()));
  });
  await step("B6 · the pack the portal wrote says decision 7 changed (AC #3)", async () => {
    const read = (f) => { try { return readFileSync(handoff(f), "utf8"); } catch { return ""; } };
    let lin = null;
    for (let i = 0; i < 60; i += 1) {
      try { lin = JSON.parse(read("lineage.json")); } catch { lin = null; }
      const d = lin?.decisions?.find((x) => x.id === "7");
      if (d?.stale === true && lin.frames?.find((f) => f.frameId === "f1")?.stale === true) break;
      await sleep(100);
    }
    const d7 = lin?.decisions?.find((x) => x.id === "7");
    t(`B6 · lineage.json: decision 7 reads seq 7, stale true, latest ${S}; f1 reads stale`,
      d7?.seq === 7 && d7?.stale === true && d7?.latest === String(S) && lin.frames.find((f) => f.frameId === "f1")?.stale === true, JSON.stringify(d7));
    const want = `- add-payee (f1): decision 7 changed since linked — now ${S}.`;
    let flow = "";
    for (let i = 0; i < 60 && !flow.includes(want); i += 1) { flow = read("flow.md"); if (!flow.includes(want)) await sleep(100); }
    t("B6 · flow.md lists add-payee under Decisions changed since linked", flow.includes(want), flow.slice(flow.indexOf("## Decisions changed"), flow.indexOf("## Decisions changed") + 200));
  });
  await step("B7 · the package verifies and the page equals the disk fold", async () => {
    const fails = verifyBuild(loadBuild(buildDir("fp-stale")));
    t("B7 · verifyBuild over fp-stale → []", fails.length === 0, fails.join(" | "));
    t("B7 · the page's document equals foldLedger(ops.jsonl)", canon(foldLedger(ledger("fp-stale")).doc) === canon(await pageDoc(page)));
  });
}

// ---- the groups pass (#315) -----------------------------------------------------------------------------
// The owner's header case, seeded as ONE owner screen.compose through saveRun (seedMeasure's precedent — a scratch
// copy, never committed), then defined, placed, overridden and promoted through the page.
function seedGroups() {
  const pkg = path.join(DISC(), "fp-groups");
  const b = loadBuild(buildDir("fp-groups"));
  saveRun(pkg, { base: b.ops.length, positions: { ...positionsOf(b.canvas), f3: { x: 1600, y: 0 } }, decisions: loadDecisions(pkg), ops: [
    { op: "screen.compose", status: "applied", params: { screenId: "home", why: "the header case: a title, a help button and a mark shared by every screen", decisionRefs: [],
      composition: { name: "stack", id: "screen", props: { direction: "column", gap: "md" }, children: [
        { name: "screen-header", id: "header", props: { title: "Home" } },
        { name: "ghost-button", id: "help", props: { label: "Help" } },
        { name: "icon", id: "mark", props: { name: "info", size: "md" } }] } } },
  ] });
}

async function groupsPass(base, page, t, step, errors) {
  const e0 = errors.length;
  const gitBefore = gitImportScope();
  const sizes = [];
  const measure = async (sel, label) => { const b = await page.locator(sel).boundingBox(); sizes.push({ label, w: b?.width ?? 0, h: b?.height ?? 0 }); };
  const partText = (id, part) => node(page, id).locator(`[data-part="${part}"]`).first().textContent().catch(() => null);
  await step("G1 · open fp-groups; f3 renders the header", async () => {
    seedGroups();
    await openCanvas(page, base, "real", "fp-groups");
    t("G1 · f3 renders screen-header Home", (await partText("f3", "header"))?.includes("Home"), await node(page, "f3").textContent().catch(() => "no f3"));
  });
  await step("G2 · save three parts of f3 as app-header", async () => {
    const n = ledger("fp-groups").length;
    await openDetails(page, "f3");
    for (const id of ["header", "help", "mark"]) await page.locator(`#cv-inspector [data-group-part="${id}"]`).check();
    await page.fill("#cv-inspector [data-group-name]", "app-header");
    await measure('#cv-inspector label:has([data-group-part="header"])', "part checkbox label");
    await measure("#cv-inspector [data-group-define]", "Save group");
    await page.locator("#cv-inspector [data-group-define]").click();
    const l = await waitLines("fp-groups", n + 1);
    t("G2 · ledger +1: group.define {app-header, f3, header help mark}", l.length === n + 1 && l.at(-1)?.op === "group.define"
      && canon(l.at(-1)?.params) === canon({ name: "app-header", frameId: "f3", partIds: ["header", "help", "mark"] }), JSON.stringify(l.at(-1)));
    const gFile = path.join(buildDir("fp-groups"), "groups", "g1.json");
    t("G2 · build/groups/g1.json exists with three parts", existsSync(gFile) && JSON.parse(readFileSync(gFile, "utf8")).parts?.length === 3);
  });
  await step("G3 · place g1 into f1's screen", async () => {
    const n = ledger("fp-groups").length;
    await openDetails(page, "f1");
    await page.selectOption("#cv-inspector [data-group-pick]", "g1");
    await page.selectOption("#cv-inspector [data-group-parent]", "screen");
    await measure("#cv-inspector [data-group-place]", "Place copy");
    await measure("#cv-inspector [data-group-promote]", "Promote");
    await page.locator("#cv-inspector [data-group-place]").click();
    const l = await waitLines("fp-groups", n + 1);
    t("G3 · ledger +1: group.place {f1, g1, screen}", l.length === n + 1 && l.at(-1)?.op === "group.place" && canon(l.at(-1)?.params) === canon({ frameId: "f1", groupId: "g1", parentId: "screen" }), JSON.stringify(l.at(-1)));
    t("G3 · f1 renders the copy's header, g1-1/header, reading Home", (await partText("f1", "g1-1/header"))?.includes("Home"));
  });
  await step("G4 · override the copy's title", async () => {
    const n = ledger("fp-groups").length;
    await openDetails(page, "f1");
    await page.selectOption("#cv-inspector [data-group-instance]", "g1-1");
    await page.selectOption("#cv-inspector [data-group-copy-part]", "header title");
    await page.fill("#cv-inspector [data-group-value]", "Add a payee");
    await measure("#cv-inspector [data-group-override]", "Set on this copy");
    await page.locator("#cv-inspector [data-group-override]").click();
    const l = await waitLines("fp-groups", n + 1);
    t("G4 · ledger +1: group.place {instanceId g1-1, overrides.set.header.title}", l.length === n + 1 && l.at(-1)?.op === "group.place"
      && canon(l.at(-1)?.params) === canon({ frameId: "f1", instanceId: "g1-1", overrides: { set: { header: { title: "Add a payee" } } } }), JSON.stringify(l.at(-1)));
    t("G4 · f1 reads Add a payee and f3 still reads Home", (await partText("f1", "g1-1/header"))?.includes("Add a payee") && (await partText("f3", "header"))?.includes("Home"));
  });
  await step("G5 · Promote", async () => {
    await page.waitForFunction(() => import("/canvas.mjs").then((m) => m.getCanvasPage().pending.length === 0), null, { timeout: 6000 }).catch(() => {});
    await openDetails(page, "f1");
    await Promise.all([page.waitForURL(/promoted=app-header/, { timeout: 10000 }), page.locator("#cv-inspector [data-group-promote]").click()]);
    await page.waitForSelector('html[data-canvas-page="ready"]', { timeout: 20000 });
    await page.waitForSelector('[data-ratify="app-header"]', { timeout: 10000 }).catch(() => {});
    const src = path.join(buildDir("fp-groups"), "proposals", "app-header", "source.json");
    const grp = path.join(buildDir("fp-groups"), "groups", "g1.json");
    t("G5 · proposals/app-header/source.json deep-equals groups/g1.json", existsSync(src) && canon(JSON.parse(readFileSync(src, "utf8"))) === canon(JSON.parse(readFileSync(grp, "utf8"))));
    const l = ledger("fp-groups");
    t("G5 · the ledger's last line is component.propose {app-header, g1, mode 1}", l.at(-1)?.op === "component.propose" && canon(l.at(-1)?.params) === canon({ name: "app-header", groupId: "g1", mode: 1 }), JSON.stringify(l.at(-1)));
    t("G5 · the ratify form is mounted for app-header", (await page.locator('[data-ratify="app-header"]').count()) === 1 && !(await page.locator("[data-groups-panel]").isHidden()));
  });
  await step("G6 · disk verifies; the pack counts the group", async () => {
    const fails = verifyBuild(loadBuild(buildDir("fp-groups")));
    t("G6 · verifyBuild over fp-groups → []", fails.length === 0, fails.join(" | "));
    const flowFile = path.join(buildDir("fp-groups"), "handoff", "flow.md");
    t("G6 · the pack's flow.md reads 1 group(s), 1 placed copy", existsSync(flowFile) && readFileSync(flowFile, "utf8").includes("- Composed and named: 1 group(s), 1 placed copy."));
  });
  await step("G7 · nothing under system/, handoff/, discovery/ or import/overrides/ changed", async () => {
    t("G7 · git status identical across the pass (AC #4)", gitImportScope() === gitBefore, gitImportScope());
  });
  await step("G8 · 44×44 and no page errors", async () => {
    const small = sizes.filter((x) => x.w < 44 || x.h < 44);
    t(`G8 · the group controls measure at least 44×44 (${sizes.length} measured)`, sizes.length === 5 && small.length === 0, JSON.stringify(small));
    t("G8 · no page errors during the pass", errors.length === e0, errors.slice(e0, e0 + 3).join(" | "));
  });
}

// ---- the import pass (#311) ---------------------------------------------------------------------------
const importsDir = () => path.join(buildDir("fp-import"), "imports");
const readRec = (id) => JSON.parse(readFileSync(path.join(importsDir(), `${id}.json`), "utf8"));
const keysOf = (r) => canon({ top: Object.keys(r).sort(), ...Object.fromEntries(["source", "fidelity", "provenance", "elapsed"].map((k) => [k, Object.keys(r[k] ?? {}).sort()])) });

async function dropFile(page, file) {
  await page.locator("[data-canvas-verb=import]").click();
  // A CHANGED ?import=, not any: after the first drop the URL already carries one, and a plain match
  // resolved at once on the old page (found on the first run — the second drop's step read i1's view).
  const before = page.url();
  const nav = page.waitForURL((u) => u.toString() !== before && u.searchParams.has("import"), { timeout: 15000 });
  await page.locator("[data-import-file]").setInputFiles(file);
  await nav;
  await page.waitForSelector("[data-import-view]:not([hidden]) [data-import-label]", { timeout: 20000 });
}

async function importPass(engine, base, page, t, step, errors) {
  const gitBefore = gitImportScope();
  await step("I1 · Import selection with the MCP down", async () => {
    await openCanvas(page, base, "real", "fp-import");
    await page.locator("[data-canvas-verb=import]").click();
    const resp = page.waitForResponse((r) => r.url().endsWith("/api/canvas/import") && r.request().method() === "POST", { timeout: 60000 });
    await page.locator("[data-import-selection]").click();
    const body = await (await resp).json();
    await page.waitForSelector("[data-import-refusal] p", { timeout: 5000 });
    const text = await page.locator("[data-import-refusal]").textContent();
    t("I1 · the refusal names \"did not start\" with exactly ONE action", text.includes("did not start") && (await page.locator("[data-import-action]").count()) === 1, text);
    t("I1 · …the refusal is not-running", body.refused?.kind === "not-running", JSON.stringify(body));
    t("I1 · …and wrote nothing under build/imports/", !existsSync(importsDir()));
    const small = [];
    for (const sel of ["[data-canvas-verb=import]", "[data-import-selection]", "[data-import-action]", "[data-import-drop]"]) {
      const b = await page.locator(sel).boundingBox();
      if (!b || b.width < 44 || b.height < 44) small.push(`${sel} ${b?.width}×${b?.height}`);
    }
    t("I1 · the panel's controls measure at least 44×44", small.length === 0, small.join(", "));
  });

  await step("I2 · drop the Brilliant blueprint", async () => {
    await dropFile(page, path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt"));
    const name = new URL(page.url()).searchParams.get("import");
    const pfiles = existsSync(path.join(buildDir("fp-import"), "proposals", name)) ? readdirSync(path.join(buildDir("fp-import"), "proposals", name)).sort() : [];
    t("I2 · imports/i1.json, .md and .transcript.jsonl on disk",
      ["i1.json", "i1.md", "i1.transcript.jsonl"].every((f) => existsSync(path.join(importsDir(), f))), readdirSync(importsDir()).join(","));
    t(`I2 · proposals/${name}/ holds the five files`, canon(pfiles) === canon(["block.css", "mapping.json", "source.json", "spec.md", "template.txt"]), pfiles.join(","));
    let err = null;
    try { checkRecord(readRec("i1")); } catch (e) { err = e.message; }
    t("I2 · the record passes checkRecord", err === null, err ?? "");
    // #455: the spawn inherits the shell's TYPESAFE_API_KEY, so the seam is what keeps the journey free.
    const sugLine = readFileSync(path.join(importsDir(), "i1.transcript.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((l) => l.type === "suggest").at(-1);
    t("I2 · suggestions are off on the journey: the record carries suggestions [] and the transcript's suggest line says so",
      canon(readRec("i1").suggestions) === canon([]) && sugLine?.ran === false && sugLine.reason === "suggestions are off on this call", JSON.stringify({ suggestions: readRec("i1").suggestions, sugLine }));
    const last = ledger("fp-import").at(-1);
    t("I2 · the ledger's last line is component.propose {name, i1, mode 1}", last?.op === "component.propose" && last.params?.recordId === "i1" && last.params?.name === name, JSON.stringify(last));
    const label = await page.locator("[data-import-label]").textContent();
    t("I2 · the view labels it the importer's, and fidelity missing — never a pass", label.includes("not by an agent") && (await page.locator("[data-import-fidelity]").textContent()).includes("missing — not measured, never a pass"), label);
  });

  await step("I3 · drop the Figma export — the same record shape", async () => {
    await dropFile(page, path.join(REPO, "import/fixtures/figma/spike-list-row.export.json"));
    t("I3 · i2 written", existsSync(path.join(importsDir(), "i2.json")));
    t("I3 · i2's record has i1's key set (AC #1b)", keysOf(readRec("i2")) === keysOf(readRec("i1")), `${keysOf(readRec("i2"))} vs ${keysOf(readRec("i1"))}`);
  });

  await step("I4 · edit the mapping", async () => {
    const name = new URL(page.url()).searchParams.get("import");
    const mapFile = path.join(buildDir("fp-import"), "proposals", name, "mapping.json");
    const count = async () => Number((await page.locator("[data-import-drops] h3").textContent()).match(/\((\d+)\)/)?.[1]);
    const editAndWait = async (sel, value) => {
      const resp = page.waitForResponse((r) => r.url().endsWith("/api/canvas/import/mapping"), { timeout: 10000 });
      await page.locator(sel).selectOption(value);
      await resp;
      await page.waitForFunction(() => /re-derived/.test(document.querySelector("[data-import-status]")?.textContent ?? ""), null, { timeout: 5000 });
    };
    // The view's rows are "<path> <slot>: <reason>". The root is a `list`, which build() refuses, so the
    // node is ALREADY on the loss list as build()'s child-loss row (#477); the owner's drop replaces that
    // row with its own, and the total holds. The rows are the claim, not a net count.
    const P = "ir.children[0].children[3]";
    const rowsOf = () => page.locator("[data-import-drops] li").allTextContents();
    const has = (rows, prefix) => rows.some((r) => r.startsWith(prefix));
    const before = readFileSync(mapFile, "utf8");
    const dropsBefore = await count();
    const rowsBefore = await rowsOf();
    await editAndWait(`[data-import-remap="${P}"]`, "drop");
    const after = readFileSync(mapFile, "utf8");
    t("I4 · a drop rewrote mapping.json on disk", after !== before && JSON.parse(after).parts[P]?.drop === true, after);
    const rowsAfter = await rowsOf();
    t("I4 · the view swaps build()'s child-loss row for the owner's drop row, and the total holds (#477)",
      has(rowsBefore, `build ${P}:`) && !has(rowsBefore, `mapping mapping.${P}:`)
        && !has(rowsAfter, `build ${P}:`) && has(rowsAfter, `mapping mapping.${P}:`) && (await count()) === dropsBefore,
      `${dropsBefore} → ${await count()} · before: ${rowsBefore.filter((r) => r.includes(P)).join(" | ")} · after: ${rowsAfter.filter((r) => r.includes(P)).join(" | ")}`);
    let err = null;
    try { checkRecord(readRec("i2")); } catch (e) { err = e.message; }
    t("I4 · imports/i2.json was re-derived and still passes checkRecord", err === null && readRec("i2").drops.some((d) => d.path === "mapping"), err ?? "");
    // The root is `list`, which build() cannot emit; remapping it to stack makes the Mapped pane render,
    // and a rename then shows as data-part — the view re-rendered from the response, not the old DOM.
    await editAndWait('[data-import-remap="ir.children[0]"]', "stack");
    const resp = page.waitForResponse((r) => r.url().endsWith("/api/canvas/import/mapping"), { timeout: 10000 });
    await page.locator('[data-import-rename="ir.children[0]"]').fill("person");
    await page.locator('[data-import-rename="ir.children[0]"]').press("Enter");
    await resp;
    await page.waitForSelector('[data-import-mapped] [data-part="person"]', { timeout: 5000 }).catch(() => {});
    t("I4 · remap to stack + rename → the Mapped pane renders data-part=\"person\"", (await page.locator('[data-import-mapped] [data-part="person"]').count()) === 1);
  });

  await step("I5 · the run lock (a second portal child, the fake bridge never answers a tools/call)", () => withPortal(FAKE("hang-call"), async (b2) => {
      const n = ledger("fp-import").length;
      const first = fetch(`${b2}/api/canvas/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug: "fp-import", base: n, entrance: "selection", mode: 1 }) }).then((r) => r.json());
      await sleep(1500);
      const q = new URLSearchParams({ provenance: "real", slug: "fp-import", base: String(n), mode: "1", name: "spike-c.txt" });
      const second = await (await fetch(`${b2}/api/canvas/import/drop?${q}`, { method: "POST", body: readFileSync(path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt")) })).json();
      t("I5 · a drop during a pending selection read is refused \"already in flight\"", String(second.error ?? "").includes("already in flight"), JSON.stringify(second));
      const firstBody = await first;
      t("I5 · the pending read resolves to the stale-binding refusal (timeout, no retry)", firstBody.refused?.kind === "stale-binding", JSON.stringify(firstBody));
      t("I5 · …its one action is Re-bind, routed to the binding check", firstBody.refused?.action?.route === "binding" && firstBody.refused.action.label === "Re-bind", JSON.stringify(firstBody.refused?.action));
      const third = await (await fetch(`${b2}/api/canvas/import/drop?${q}`, { method: "POST", body: readFileSync(path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt")) })).json();
      t("I5 · after it, a drop succeeds", typeof third.recordId === "string", JSON.stringify(third).slice(0, 200));
  }));

  // PR #462 review F1: the one action a 409 offers must RELOAD, not focus the file input. The page is
  // made stale by a drop straight to the API (a second tab), then the page's own drop meets the 409.
  await step("I7 · a stale drop's one action reloads the page", async () => {
    const blueprint = readFileSync(path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt"));
    const q = new URLSearchParams({ provenance: "real", slug: "fp-import", base: String(ledger("fp-import").length), mode: "1", name: "tab-2.txt" });
    const other = await (await fetch(`${base}/api/canvas/import/drop?${q}`, { method: "POST", body: blueprint })).json();
    await page.locator("[data-canvas-verb=import]").click();
    const e0 = errors.length;
    const resp = page.waitForResponse((r) => r.url().includes("/api/canvas/import/drop"), { timeout: 15000 });
    await page.locator("[data-import-file]").setInputFiles(path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt"));
    const status = (await resp).status();
    await page.waitForSelector("[data-import-refusal] [data-import-action]", { timeout: 5000 });
    // The 409 is this step's own doing, and an engine may log the failed resource. Only those lines
    // leave step 16's list; anything else raised here stays in it.
    errors.push(...errors.splice(e0).filter((e) => !/status of 409/.test(e)));
    const label = await page.locator("[data-import-action]").textContent();
    t("I7 · the page's drop after a second tab's gets a 409 with ONE action, \"Reload the page\"", typeof other.recordId === "string" && status === 409 && label === "Reload the page" && (await page.locator("[data-import-action]").count()) === 1, `${status} ${label}`);
    const load = page.waitForEvent("load", { timeout: 15000 });
    await page.locator("[data-import-action]").click();
    const reloaded = await load.then(() => true, () => false);
    // The page fetches its build after load, so the count is 0 until then: wait for it to settle.
    const want = ledger("fp-import").length;
    const count = reloaded ? await page.waitForFunction(async (w) => ((await import("/canvas.mjs")).getCanvasPage().count === w ? w : false), want, { timeout: 10000 })
      .then((h) => h.jsonValue(), () => page.evaluate(async () => (await import("/canvas.mjs")).getCanvasPage().count)) : null;
    t("I7 · …clicking it reloads, and the page's base is the ledger's length again", reloaded && count === ledger("fp-import").length, `reloaded ${reloaded}, page ${count}, ledger ${ledger("fp-import").length}`);
  });

  // F2: an oversize drop is a refusal the owner reads (200, one action), not a 500. F4: a bad name is a 400.
  await step("I8 · an oversize drop is a refusal; a bad proposal name is a 400", async () => {
    const n = ledger("fp-import").length;
    await page.locator("[data-canvas-verb=import]").click();
    const resp = page.waitForResponse((r) => r.url().includes("/api/canvas/import/drop"), { timeout: 15000 });
    await page.locator("[data-import-file]").setInputFiles({ name: "huge.txt", mimeType: "text/plain", buffer: Buffer.alloc(9_000_000, 97) });
    const r = await resp;
    const body = await r.json();
    await page.waitForSelector("[data-import-refusal] [data-import-action]", { timeout: 5000 });
    const label = await page.locator("[data-import-action]").textContent();
    t("I8 · 9,000,000 bytes → 200 { refused: too-large } with ONE action, and no ledger line", r.status() === 200 && body.refused?.kind === "too-large" && label === "Drop a smaller export" && (await page.locator("[data-import-action]").count()) === 1 && ledger("fp-import").length === n, `${r.status()} ${JSON.stringify(body)} ${label}`);
    const view = await fetch(`${base}/api/canvas/import/view?${new URLSearchParams({ provenance: "real", slug: "fp-import", name: "../../../etc" })}`);
    const map = await fetch(`${base}/api/canvas/import/mapping`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug: "fp-import", name: "../x", edit: {} }) });
    t("I8 · a traversal name → 400 on the view and on the mapping route", view.status === 400 && map.status === 400, `${view.status} ${map.status}`);
  });

  await fakeBridgePass(page, t, step);

  t("I6 · git status over system/, handoff/, discovery/ and import/overrides/ unchanged across the pass (AC #4)", gitImportScope() === gitBefore, gitImportScope());
}

// ---- the fake-bridge pass (#311 PR B, Task 7.1) ---------------------------------------------------------
// Side children only. Each leaves the page on about:blank before its child dies, so a dead origin never
// reaches step 16's error list. I7/I8 above rely on the main child's page, so this pass runs after them.
const SELECTED = "630fe03901352c90";
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isPng = (file) => existsSync(file) && readFileSync(file).subarray(0, 8).equals(PNG_SIG);
const recordOk = (id) => { try { checkRecord(readRec(id)); return null; } catch (e) { return e.message; } };
const importPost = (r) => r.url().endsWith("/api/canvas/import") && r.request().method() === "POST";
// A wait created before a click that then throws must not surface as an unhandled rejection.
const quiet = (p) => { p.catch(() => {}); return p; };
const openPanel = async (page) => { if (await page.locator("[data-import-panel]").isHidden()) await page.locator("[data-canvas-verb=import]").click(); };
const lineOf = (page) => page.locator("[data-import-binding]").textContent();
const settledLine = (page) => page.waitForFunction(() => !/checking/.test(document.querySelector("[data-import-binding]")?.textContent ?? "checking"), null, { timeout: 30000 });
async function sizes(page, sels) {
  const small = [];
  for (const sel of sels) {
    const loc = page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b || b.width < 44 || b.height < 44) small.push(`${sel} ${b?.width}×${b?.height}`);
  }
  return small;
}
// Import selection (or Import N selected) → the response body; navigation awaited only on success, so a
// refusal fails the caller's check by its own words rather than as a timeout. The body is read through a
// route, not waitForResponse: a success reloads the page at once, and the engine drops the body with it.
async function importVia(page, sel, timeout = 30000) {
  const before = page.url();
  let got;
  const captured = new Promise((resolve) => { got = resolve; });
  const handler = async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const r = await route.fetch({ timeout });
    got(await r.json());
    await route.fulfill({ response: r });
  };
  await page.route("**/api/canvas/import", handler);
  const nav = page.waitForURL((u) => u.toString() !== before && u.searchParams.has("import"), { timeout }).then(() => true, () => false);
  await page.locator(sel).click();
  const body = await Promise.race([captured, sleep(timeout).then(() => ({ error: `no response to POST /api/canvas/import within ${timeout} ms` }))]);
  await page.unroute("**/api/canvas/import", handler);
  if (typeof body.recordId === "string") {
    await nav;
    await page.waitForSelector("[data-import-view]:not([hidden]) [data-import-label]", { timeout: 20000 });
  }
  return body;
}
async function dropOnePart(page, name) {
  const mapFile = path.join(buildDir("fp-import"), "proposals", name, "mapping.json");
  const remap = page.locator("[data-import-remap]").first();
  const at = await remap.getAttribute("data-import-remap");
  const count = async () => Number((await page.locator("[data-import-drops] h3").textContent()).match(/\((\d+)\)/)?.[1]);
  // I4's rule (#477): the owner's drop row appears, any build() child-loss row for the same node goes, and
  // the total moves by one only when there was no such row to replace.
  const rowsOf = () => page.locator("[data-import-drops] li").allTextContents();
  const has = (rows, prefix) => rows.some((r) => r.startsWith(prefix));
  const before = readFileSync(mapFile, "utf8");
  const dropsBefore = await count();
  const rowsBefore = await rowsOf();
  const resp = quiet(page.waitForResponse((r) => r.url().endsWith("/api/canvas/import/mapping"), { timeout: 10000 }));
  await remap.selectOption("drop");
  await resp;
  await page.waitForFunction(() => /re-derived/.test(document.querySelector("[data-import-status]")?.textContent ?? ""), null, { timeout: 5000 });
  const after = readFileSync(mapFile, "utf8");
  const rowsAfter = await rowsOf();
  const replaced = has(rowsBefore, `build ${at}:`);
  return {
    ok: after !== before && JSON.parse(after).parts[at]?.drop === true && has(rowsAfter, `mapping mapping.${at}:`) && !has(rowsAfter, `build ${at}:`)
      && (await count()) === dropsBefore + (replaced ? 0 : 1),
    why: `${at}: drops ${dropsBefore} → ${await count()} (${replaced ? "replacing build()'s row" : "a new row"}) · ${after}`,
  };
}

async function fakeBridgePass(page, t, step) {
  await step("I9 + I11 · a paired fake bridge (a third portal child)", () => withPortal(FAKE("paired"), async (b3) => {
    await step("I9 · Check binding, Import selection, the view, one mapping edit", async () => {
      await openCanvas(page, b3, "real", "fp-import");
      await page.locator("[data-canvas-verb=import]").click();
      t("I9 · the binding line waits for a click (nothing talks to Brilliant on load)", (await lineOf(page)) === "Reads: not checked yet", await lineOf(page));
      const bresp = quiet(page.waitForResponse((r) => r.url().endsWith("/api/canvas/import/binding"), { timeout: 30000 }));
      await page.locator("[data-import-binding-check]").click();
      await bresp;
      await settledLine(page);
      const line = await lineOf(page);
      t("I9 · Check binding → \"Reads: this tab's project (name not exposed) · web\"", line.startsWith("Reads: this tab's project (name not exposed) · web"), line);
      const small = await sizes(page, ["[data-import-binding-check]", "[data-import-browse]", "[data-import-selection]"]);
      t("I9 · Check binding and Browse the page measure at least 44×44", small.length === 0, small.join(", "));
      const body = await importVia(page, "[data-import-selection]");
      t("I9 · Import selection → a record, not a refusal", typeof body.recordId === "string", JSON.stringify(body.refused ?? body.error ?? body).slice(0, 300));
      if (typeof body.recordId !== "string") return;
      const rec = readRec(body.recordId);
      const err = recordOk(body.recordId);
      t(`I9 · ${body.recordId}.json's source.ids is exactly ["${SELECTED}"], and it passes checkRecord`, canon(rec.source.ids) === canon([SELECTED]) && err === null, `${JSON.stringify(rec.source.ids)} ${err ?? ""}`);
      t(`I9 · imports/${body.recordId}.reference.png is on disk, a PNG`, isPng(path.join(importsDir(), `${body.recordId}.reference.png`)));
      const last = ledger("fp-import").at(-1);
      t("I9 · the ledger's last line is component.propose for this record", last?.op === "component.propose" && last.params?.recordId === body.recordId, JSON.stringify(last));
      const img = page.locator(".cv-import-col img");
      const shown = (await img.count()) === 1 && await img.evaluate((i) => i.complete && i.naturalWidth > 0);
      t("I9 · the Original pane shows the exported <img>", shown);
      const kept = await lineOf(page);
      t("I9 · after the reload, the binding line is the read's (kept for the session)", kept.includes("this tab's project (name not exposed) · web") && kept.includes("at the last Brilliant read"), kept);
      const d = await dropOnePart(page, body.name);
      t("I9 · dropping a part rewrote mapping.json and the view re-rendered its drop list with the owner's row", d.ok, d.why);
    });

    await step("I11 · Browse, pick two, import them, Browse again (cached)", async () => {
      await openPanel(page);
      const br = quiet(page.waitForResponse((r) => r.url().includes("/api/canvas/import/browse"), { timeout: 30000 }));
      await page.locator("[data-import-browse]").click();
      const bb = await (await br).json();
      await page.waitForSelector("[data-import-tile]", { timeout: 5000 }).catch(() => {});
      const tiles = page.locator("[data-import-tile]");
      const ids = await tiles.evaluateAll((els) => els.map((e) => e.dataset.importTile));
      t("I11 · Browse → 2 tiles, read fresh (not from the cache)", ids.length === 2 && bb.cached === false, JSON.stringify({ ids, cached: bb.cached, refused: bb.refused }));
      const loaded = [];
      for (let i = 0; i < ids.length; i += 1) {
        await tiles.nth(i).scrollIntoViewIfNeeded();
        loaded.push(await page.waitForFunction((id) => { const im = document.querySelector(`[data-import-tile="${id}"] img`); return Boolean(im?.alt) && im.complete && im.naturalWidth > 0; }, ids[i], { timeout: 5000 }).then(() => true, () => false));
      }
      t("I11 · each tile shows its thumbnail <img> (complete, naturalWidth > 0, alt = its name)", loaded.length === 2 && loaded.every(Boolean), JSON.stringify(loaded));
      const importBtn = page.locator("[data-import-browse-import]");
      const disabledAt0 = await importBtn.isDisabled();
      for (let i = 0; i < ids.length; i += 1) await tiles.nth(i).click();
      const pressed = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
      t("I11 · Import is disabled at 0; both tiles pressed → \"Import 2 selected\"", disabledAt0 && canon(pressed) === canon(["true", "true"]) && (await importBtn.textContent()) === "Import 2 selected" && !(await importBtn.isDisabled()), `${disabledAt0} ${pressed} ${await importBtn.textContent()}`);
      const small = await sizes(page, ["[data-import-tile]", "[data-import-browse-import]", "[data-import-browse-refresh]"]);
      t("I11 · the tiles, Import N selected and Refresh measure at least 44×44", small.length === 0, small.join(", "));
      const body = await importVia(page, "[data-import-browse-import]");
      t("I11 · Import 2 selected → a record", typeof body.recordId === "string", JSON.stringify(body.refused ?? body.error ?? body).slice(0, 300));
      if (typeof body.recordId !== "string") return;
      const rec = readRec(body.recordId);
      t(`I11 · ${body.recordId}.json's source.ids holds both picked ids`, canon([...rec.source.ids].sort()) === canon([...ids].sort()) && recordOk(body.recordId) === null, JSON.stringify(rec.source.ids));
      await openPanel(page);
      const br2 = quiet(page.waitForResponse((r) => r.url().includes("/api/canvas/import/browse"), { timeout: 30000 }));
      await page.locator("[data-import-browse]").click();
      const bb2 = await (await br2).json();
      await page.waitForSelector("[data-import-tile]", { timeout: 5000 }).catch(() => {});
      const note = await page.locator("[data-import-browse-count]").textContent().catch(() => "");
      t("I11 · Browse again → the same 2 tiles from the session cache", bb2.cached === true && (await tiles.count()) === 2 && note.includes("cache"), JSON.stringify({ cached: bb2.cached, note }));
    });

    // #475: a Mode 2 import is an exhibit beside the flow (G7). X1–X2 on the import page; X3–X6 on a
    // 2400-px-wide page of the same portal, so f1 and the exhibit are both on screen at scale 1 and a
    // pointer drag between them needs no auto-scroll.
    await step("X1–X7 · a Mode 2 import is an exhibit beside the flow (#475)", async () => {
      const canvasBefore = loadBuild(buildDir("fp-import")).canvas;
      await openCanvas(page, b3, "real", "fp-import");
      await openPanel(page);
      await page.locator('input[name=cv-import-mode][value="2"]').check();
      const body = await importVia(page, "[data-import-selection]");
      const last = ledger("fp-import").at(-1);
      t("X1 · Import selection in Mode 2 → a record and a component.propose line with mode 2", typeof body.recordId === "string" && last?.params?.mode === 2 && last.params.recordId === body.recordId, JSON.stringify(body.refused ?? body.error ?? last));
      if (typeof body.recordId !== "string") return;
      const doc = foldLedger(ledger("fp-import")).doc;
      const exId = doc.proposals.find((p) => p.recordId === body.recordId)?.id;
      const want = placeExhibit(doc, positionsOf(canvasBefore));
      const disk = () => loadBuild(buildDir("fp-import")).canvas.nodes.find((n) => n.id === exId);
      t(`X1 · canvas.json places ${exId} by placeExhibit, recomputed in Node (${JSON.stringify(want)})`, disk()?.type === "exhibit" && disk().x === want.x && disk().y === want.y, JSON.stringify(disk()));
      const ex = page.locator(`[data-stx-component="exhibit"][data-stx-id="${exId}"]`);
      const shown = (await page.locator('[data-stx-component="exhibit"]').count()) === 1 && (await ex.count()) === 1
        && await page.waitForFunction((id) => { const im = document.querySelector(`[data-stx-id="${id}"] img`); return Boolean(im?.alt) && im.complete && im.naturalWidth > 0; }, exId, { timeout: 5000 }).then(() => true, () => false);
      t(`X1 · after the reload, exactly one exhibit on the stage (${exId}), its PNG loaded`, shown);
      t("X1 · …labelled \"Frozen original · Mode 2\"", ((await ex.textContent()) ?? "").includes("Frozen original · Mode 2"), await ex.textContent());
      const hits = await page.evaluate((id) => {
        const e = document.querySelector(`[data-stx-id="${id}"]`).getBoundingClientRect();
        return [...document.querySelectorAll(".stx-frame")].filter((f) => { const r = f.getBoundingClientRect(); return e.left < r.right && r.left < e.right && e.top < r.bottom && r.top < e.bottom; }).map((f) => f.dataset.stxId);
      }, exId);
      t("X2 · measured: the exhibit's rendered box meets no frame's", hits.length === 0, hits.join(", "));

      const wide = await page.context().browser().newContext({ viewport: { width: 2400, height: 1400 } });
      const p = await wide.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
      p.on("console", (m) => { if (m.type() === "error") errs.push(`console: ${m.text()}`); });
      try {
        await openCanvas(p, b3, "real", "fp-import");
        const boxOf = (id) => p.locator(`[data-stx-id="${id}"]`).evaluate((n) => ({ x: parseFloat(n.style.getPropertyValue("--x")), y: parseFloat(n.style.getPropertyValue("--y")), h: parseFloat(n.style.getPropertyValue("--h")) }));
        const saveLine = () => p.locator("[data-canvas-save]").textContent();
        // Drag the exhibit's move handle by (dx, dy) stage px; at scale 1 a screen px is a stage px.
        const drag = async (id, dx, dy) => {
          const g = await p.locator(`[data-stx-id="${id}"] > .stx-grab`).boundingBox();
          const sx = g.x + g.width / 2, sy = g.y + g.height / 2;
          await p.mouse.move(sx, sy);
          await p.mouse.down();
          for (let i = 1; i <= 10; i += 1) await p.mouse.move(sx + (dx * i) / 10, sy + (dy * i) / 10);
          await p.mouse.up();
          await sleep(400);
        };
        const scale = await p.locator('[data-stx-id="f1"]').evaluate((n) => n.getBoundingClientRect().width / parseFloat(n.style.getPropertyValue("--w")));
        t("X3 · precondition: the wide page is at scale 1", Math.abs(scale - 1) < 0.01, String(scale));

        const at0 = await boxOf(exId);
        const f1 = await boxOf("f1");
        const n0 = ledger("fp-import").length;
        await drag(exId, f1.x + 40 - at0.x, f1.y + 40 - at0.y);
        const s3 = await said(p);
        t("X3 · dragging the exhibit onto f1 is announced \"Refused … beside the flow\"", s3.includes("Refused") && s3.includes("beside the flow"), s3);
        const at3 = await boxOf(exId);
        t("X3 · …the exhibit is put back (within 1 px)", Math.abs(at3.x - at0.x) <= 1 && Math.abs(at3.y - at0.y) <= 1, `${JSON.stringify(at0)} → ${JSON.stringify(at3)}`);
        t("X3 · …no ledger line, and the save line is not \"Not saved\"", ledger("fp-import").length === n0 && !(await saveLine()).startsWith("Not saved"), `${ledger("fp-import").length - n0} lines · ${await saveLine()}`);
        // Redo restores a box WITHOUT emitting ui.move, so the refused state sits in the redo tail.
        await p.locator(".stx-scroll").focus();
        await p.keyboard.press("ControlOrMeta+Shift+z");
        await sleep(400);
        const s3b = await said(p);
        const at3b = await boxOf(exId);
        t("X3b · Redo after the refusal is refused again: put back, no ledger line, never \"Not saved\"",
          s3b.includes("Refused") && Math.abs(at3b.x - at0.x) <= 1 && Math.abs(at3b.y - at0.y) <= 1 && ledger("fp-import").length === n0 && !(await saveLine()).startsWith("Not saved"),
          `${s3b} · ${JSON.stringify(at3b)} · ${ledger("fp-import").length - n0} lines · ${await saveLine()}`);

        const cj = loadBuild(buildDir("fp-import")).canvas.nodes;
        const xOf = (id) => cj.find((n) => n.id === id)?.x;
        const [ex4, f1x, f2x] = [xOf(exId), xOf("f1"), xOf("f2")];
        const pre = f1x + 1440 <= ex4 && ex4 < f2x + 1440;
        t(`X4 · precondition: f1 + 1440 ≤ exhibit < f2 + 1440 (${f1x} + 1440 ≤ ${ex4} < ${f2x} + 1440)`, pre);
        if (pre) {
          const size = async (id, preset) => {
            await openDetails(p, id);
            await p.locator("#cv-size-preset").selectOption(preset);
            await p.getByRole("button", { name: "Apply size" }).click();
            await sleep(500);
          };
          const w2 = await wOf(p, "f2");
          const n4 = ledger("fp-import").length;
          await size("f2", "desktop");
          t("X4 · f2 → desktop would grow it into the exhibit: refused, f2 keeps its width", (await said(p)).includes("Refused") && (await wOf(p, "f2")) === w2, `${await said(p)} · w ${await wOf(p, "f2")}`);
          t("X4 · …and no ledger line (no applied + undone pair)", ledger("fp-import").length === n4, JSON.stringify(ledger("fp-import").slice(n4)));
          await size("f1", "desktop");
          const l4 = await waitLines("fp-import", n4 + 1);
          t("X4 · f1 → desktop (0 + 1440 ≤ the exhibit) is ACCEPTED — the guard does not refuse everything", l4.length === n4 + 1 && l4.at(-1).op === "frame.size" && l4.at(-1).params.preset === "desktop", JSON.stringify(l4.slice(n4)));
          await undo(p);
          const l4b = await waitLines("fp-import", n4 + 2);
          t("X4 · …and undone (one undone line)", l4b.length === n4 + 2 && l4b.at(-1).status === "undone", JSON.stringify(l4b.slice(n4)));
        }

        // X4b: a POINTER resize growing f2 into the exhibit is refused too — its width put back, no ledger
        // line, and the height the refused resize would have authored is not written either.
        {
          const g = await p.locator('[data-stx-id="f2"] > .stx-resize').boundingBox();
          const w0 = await wOf(p, "f2");
          const nb = ledger("fp-import").length;
          await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
          await p.mouse.down();
          for (let i = 1; i <= 10; i += 1) await p.mouse.move(g.x + g.width / 2 + i * 70, g.y + g.height / 2);
          await p.mouse.up();
          await sleep(500);
          t("X4b · a pointer resize of f2 into the exhibit is refused and its width put back", (await said(p)).includes("Refused") && (await wOf(p, "f2")) === w0, `${await said(p)} · w ${await wOf(p, "f2")} (was ${w0})`);
          const f2disk = loadBuild(buildDir("fp-import")).canvas.nodes.find((n) => n.id === "f2");
          t("X4b · …no ledger line, and canvas.json carries no height for f2 (the refused resize authored nothing)", ledger("fp-import").length === nb && f2disk && !("height" in f2disk), `${ledger("fp-import").length - nb} lines · ${JSON.stringify(f2disk)}`);
        }

        // X6: resizing f1 authors its height, after which the original may sit below that screen.
        const grip = await p.locator('[data-stx-id="f1"] > .stx-resize').boundingBox();
        const n6 = ledger("fp-import").length;
        await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await p.mouse.down();
        for (let i = 1; i <= 8; i += 1) await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + i * 5);
        await p.mouse.up();
        await sleep(500);
        const f1h = await boxOf("f1");
        const onDisk = () => loadBuild(buildDir("fp-import")).canvas.nodes;
        t("X6 · a vertical resize authors f1's height (canvas.json carries it) and adds no ledger line", Number.isFinite(onDisk().find((n) => n.id === "f1")?.height) && ledger("fp-import").length === n6, JSON.stringify(onDisk().find((n) => n.id === "f1")));
        const from6 = await boxOf(exId);
        const ty = f1h.y + f1h.h + 40;
        await drag(exId, f1h.x + 10 - from6.x, ty - from6.y);
        const at6 = await boxOf(exId);
        const d6 = onDisk().find((n) => n.id === exId);
        t("X6 · the exhibit dragged below f1's authored bottom is ACCEPTED: no refusal, canvas.json has it there, verifyBuild []",
          !(await said(p)).includes("Refused") && at6.y >= f1h.y + f1h.h && d6?.y === at6.y && canon(verifyBuild(loadBuild(buildDir("fp-import")))) === "[]",
          `${await said(p)} · stage ${JSON.stringify(at6)} · disk ${JSON.stringify(d6)} · ${JSON.stringify(verifyBuild(loadBuild(buildDir("fp-import"))))}`);
        await drag(exId, at0.x - at6.x, at0.y - at6.y);
        t("X6 · …and dragged back beside the flow", !(await said(p)).includes("Refused") && Math.abs((await boxOf(exId)).x - at0.x) <= 1, await said(p));

        // X5: a Mode 2 DROP carries no PNG, and the exhibit says so rather than showing an empty box.
        await openPanel(p);
        await p.locator('input[name=cv-import-mode][value="2"]').check();
        const before = p.url();
        const nav = p.waitForURL((u) => u.toString() !== before && u.searchParams.has("import"), { timeout: 15000 });
        await p.locator("[data-import-file]").setInputFiles(path.join(REPO, "import/fixtures/spike-c-instance.blueprint.txt"));
        await nav;
        await p.waitForSelector("[data-import-view]:not([hidden]) [data-import-label]", { timeout: 20000 });
        const d5 = foldLedger(ledger("fp-import")).doc;
        const id5 = d5.proposals.at(-1)?.id;
        const n5 = p.locator(`[data-stx-component="exhibit"][data-stx-id="${id5}"]`);
        t(`X5 · a Mode 2 drop is an exhibit (${id5}) with no <img> and a flag saying there is no reference image`,
          d5.proposals.at(-1)?.mode === 2 && (await n5.count()) === 1 && (await n5.locator("img").count()) === 0 && ((await n5.locator(".cv-flag").textContent()) ?? "").includes("No reference image"),
          await n5.textContent().catch(() => "(no node)"));
        t("X5 · verifyBuild on disk is [] after both Mode 2 imports and every gesture", canon(verifyBuild(loadBuild(buildDir("fp-import")))) === "[]", JSON.stringify(verifyBuild(loadBuild(buildDir("fp-import")))));
        t("X7 · no page errors or console errors on the wide page", errs.length === 0, errs.slice(0, 3).join(" | "));
      } finally {
        await wide.close();
      }
    });
    await page.goto("about:blank");
  }));

  await step("I10 · an unpaired fake bridge: one action, the bridge's words, Import again", () => withPortal(FAKE("unpaired"), async (b4) => {
    await openCanvas(page, b4, "real", "fp-import");
    await page.locator("[data-canvas-verb=import]").click();
    const resp = quiet(page.waitForResponse(importPost, { timeout: 30000 }));
    await page.locator("[data-import-selection]").click();
    const body = await (await resp).json();
    await page.waitForSelector("[data-import-refusal] p", { timeout: 5000 });
    const text = await page.locator("[data-import-refusal]").textContent();
    const label = await page.locator("[data-import-action]").textContent();
    t("I10 · the refusal names \"not paired\" with ONE action, \"Import again\"",
      body.refused?.kind === "not-paired" && text.includes("not paired") && (await page.locator("[data-import-action]").count()) === 1 && label === "Import again", `${text} [${label}]`);
    const detail = await page.locator("[data-import-detail]").textContent().catch(() => "");
    t("I10 · …and the bridge's own words as the detail line", detail.includes("No Brilliant surface is connected") && detail === body.refused?.detail, detail);
    const small = await sizes(page, ["[data-import-action]"]);
    t("I10 · the action measures at least 44×44", small.length === 0, small.join(", "));
    const again = quiet(page.waitForResponse(importPost, { timeout: 10000 })).then(() => true, () => false);
    await page.locator("[data-import-action]").click();
    t("I10 · clicking \"Import again\" sends the import again (one click, one request)", await again, "no POST /api/canvas/import followed the click");
    await page.goto("about:blank");
  }));

  await step("I10b · a hung fake bridge: Re-bind runs the binding check", () => withPortal(FAKE("hang-call"), async (b5) => {
    await openCanvas(page, b5, "real", "fp-import");
    await page.locator("[data-canvas-verb=import]").click();
    const resp = quiet(page.waitForResponse(importPost, { timeout: 30000 }));
    await page.locator("[data-import-selection]").click();
    await resp;
    await page.waitForSelector("[data-import-refusal] p", { timeout: 5000 });
    const text = await page.locator("[data-import-refusal]").textContent();
    const label = await page.locator("[data-import-action]").textContent();
    t("I10b · Import selection → \"did not answer\" with ONE action, \"Re-bind\"", text.includes("did not answer") && label === "Re-bind" && (await page.locator("[data-import-action]").count()) === 1, `${text} [${label}]`);
    const lineBefore = await lineOf(page);
    const req = quiet(page.waitForRequest((r) => r.url().endsWith("/api/canvas/import/binding") && r.method() === "POST", { timeout: 5000 })).then(() => true, () => false);
    const bresp = quiet(page.waitForResponse((r) => r.url().endsWith("/api/canvas/import/binding"), { timeout: 30000 }));
    await page.locator("[data-import-action]").click();
    t("I10b · clicking Re-bind posts the binding check", await req);
    await bresp;
    await settledLine(page);
    const lineAfter = await lineOf(page);
    t("I10b · …and the binding line updates (a hung bridge: the check is refused, and says so)", lineAfter !== lineBefore && lineAfter.includes("unknown"), `${lineBefore} → ${lineAfter}`);
    await page.goto("about:blank");
  }));
}

// ---- the measurement pass (#474) ----------------------------------------------------------------------
// The owner's FAITHFUL frame (import/fixtures/measure-live/, a verbatim live import) seeded in-process into
// fp-measure through the real runImport + the owner's committed mapping, then measured THROUGH THE PAGE:
// the button → the route → the spawned tooling/measure-render.mjs → Playwright's Chromium (whatever engine
// the page runs in) → the record → the view. The ASSERTION is under/over THRESHOLD and the derived
// verdict word, never the digits: a local render may differ from the committed replay by platform.
const MEASURE_FX = path.join(REPO, "import/fixtures/measure-live");
const measureDir = () => path.join(buildDir("fp-measure"), "imports");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const ihdr = (f) => { const b = readFileSync(f); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };

async function seedMeasure() {
  const fx = (f) => readFileSync(path.join(MEASURE_FX, `faithful.${f}`));
  const transcript = fx("transcript.txt").toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const pkg = path.join(DISC(), "fp-measure");
  const overridesDir = path.join(scratch, "_measure-overrides");
  const r = await runImport({ pkgRoot: pkg, provenance: "real", base: ledger("fp-measure").length, entrance: "selection", overridesDir,
    reader: async () => ({ text: fx("blueprint.txt").toString("utf8"), reference: fx("reference.png"), transcript, binding: null }) });
  if (!r?.name) throw new Error(`seeding fp-measure answered ${JSON.stringify(r?.refused ?? r)}`);
  const parts = JSON.parse(readFileSync(path.join(MEASURE_FX, "mapping.json"), "utf8"));
  for (const [p, m] of Object.entries(parts)) {
    for (const k of ["map", "rename", "drop"]) {
      const v = k === "rename" ? m.name : m[k];
      if (v !== undefined) editMapping({ pkgRoot: pkg, provenance: "real", name: r.name, edit: { path: p, [k]: v }, overridesDir });
    }
  }
  return { name: r.name, id: r.recordId };
}

async function measurePass(base, page, t, step) {
  let seeded = null;
  await step("I12 · Measure fidelity renders the candidate; the faithful frame's worst ΔE is under 5", async () => {
    seeded = await seedMeasure();
    const rec = () => JSON.parse(readFileSync(path.join(measureDir(), `${seeded.id}.json`), "utf8"));
    const png = path.join(measureDir(), `${seeded.id}.candidate.png`);
    await page.goto(`${base}/canvas.html?provenance=real&slug=fp-measure&import=${seeded.name}`, { waitUntil: "load" });
    await page.waitForSelector("[data-import-view]:not([hidden]) [data-import-measure]", { timeout: 20000 });
    const b = await page.locator("[data-import-measure]").boundingBox();
    // Rounded to 0.01 px: from a fractional y (471.1 on firefox once #314's rail sat above it) Playwright's box
    // reads 43.99997 for a button whose computed height, client rect and offsetHeight are all exactly 44.
    const px = (v) => Math.round((v ?? 0) * 100) / 100;
    t("I12 · the Measure fidelity button measures at least 44×44", b && px(b.width) >= 44 && px(b.height) >= 44, `${b?.width}×${b?.height}`);
    await page.locator("[data-import-measure]").click();
    const settled = await page.waitForFunction(() => document.querySelector("[data-import-fidelity]")?.dataset.importFidelity !== "missing"
      || (document.querySelector("[data-import-measure-refusal]")?.textContent ?? "") !== "", null, { timeout: 60000 }).then(() => true, () => false);
    const refusal = await page.locator("[data-import-measure-refusal]").textContent();
    const line = await page.locator("[data-import-fidelity]").textContent();
    const r = rec();
    const worst = r.fidelity.deltaEMin?.worst;
    t("I12 · the view left missing, naming a worst region under THRESHOLD", settled && !refusal && Number.isFinite(worst?.value) && worst.value < THRESHOLD && line.includes(`worst ΔE ${worst.value} at ${worst.region}`),
      `${refusal || line} (worst ${JSON.stringify(worst)})`);
    console.log(`    · measured worst ΔE ${worst?.value} at ${worst?.region} (the committed replay: see faithful.measure.json)`);
    let err = null;
    try { checkRecord(r); } catch (e) { err = e.message; }
    const word = await page.locator("[data-import-fidelity]").getAttribute("data-import-fidelity");
    t("I12 · the record passes checkRecord, and the page's verdict word is the DERIVED one", err === null && word === fidelityVerdict(r.fidelity), err ?? line);
    t("I12 · the faithful frame reads GREEN, every WCAG pair passing (#482)", word === "green" && r.fidelity.wcag?.pass === r.fidelity.wcag?.total,
      `${word} at WCAG ${r.fidelity.wcag?.pass}/${r.fidelity.wcag?.total} (failing ${JSON.stringify(r.fidelity.wcag?.failing)}), worst ${JSON.stringify(worst)}`);
    const ref = path.join(measureDir(), `${seeded.id}.reference.png`);
    t("I12 · imports/<id>.candidate.png is a PNG of the reference's size", existsSync(png) && ihdr(png) === ihdr(ref), existsSync(png) ? `${ihdr(png)} vs ${ihdr(ref)}` : "missing");
    // D6: an edit through the page returns the record to missing and deletes the candidate.
    const input = page.locator('[data-import-rename="ir.children[0]"]');
    await input.fill("measured-row");
    await input.dispatchEvent("change");
    const back = await page.waitForFunction(() => document.querySelector("[data-import-fidelity]")?.dataset.importFidelity === "missing", null, { timeout: 15000 }).then(() => true, () => false);
    t("I12 · a rename through the page reads missing — not measured, never a pass, and the PNG is gone",
      back && (await page.locator("[data-import-fidelity]").textContent()).includes("missing — not measured, never a pass") && !existsSync(png), await page.locator("[data-import-fidelity]").textContent());
  });

  await step("I12b · a refusal is visible in the view with the panel closed", () => withPortal(MCP_DOWN, async (b2) => {
    if (!seeded) throw new Error("I12 did not seed fp-measure");
    const recFile = path.join(measureDir(), `${seeded.id}.json`);
    const before = sha(recFile);
    await page.goto(`${b2}/canvas.html?provenance=real&slug=fp-measure&import=${seeded.name}`, { waitUntil: "load" });
    await page.waitForSelector("[data-import-view]:not([hidden]) [data-import-measure]", { timeout: 20000 });
    const panelHidden = await page.locator("[data-import-panel]").isHidden();
    await page.locator("[data-import-measure]").click();
    const box = page.locator("[data-import-measure-refusal]");
    await page.waitForFunction(() => (document.querySelector("[data-import-measure-refusal]")?.textContent ?? "") !== "", null, { timeout: 30000 });
    const text = await box.textContent();
    t("I12b · the no-renderer refusal is VISIBLE with the panel closed and names npm ci", panelHidden && (await box.isVisible()) && text.includes("npm ci"), `${panelHidden ? "" : "panel open; "}${text}`);
    t("I12b · …and the record on disk is unchanged", sha(recFile) === before);
    await page.goto("about:blank");
  }, { extraEnv: { UXF_MEASURE_VRDIR: "/nonexistent" } }));
}

// ---- the compose pass (#312) --------------------------------------------------------------------------
// A side portal whose UXF_COMPOSE_TRANSPORT names tooling/fake-compose-agent.mjs — the main portal child
// never gets the fake — over fp-compose, the stand-in shape (run.json, prd.md and build/, no transcript).
const FAKE_COMPOSE = path.join(REPO, "tooling/fake-compose-agent.mjs");
const composeTx = (slug) => {
  const f = path.join(buildDir(slug), "transcript.jsonl");
  return existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const rawLine = (slug, seq) => readFileSync(path.join(buildDir(slug), "ops.jsonl"), "utf8").split("\n")[seq - 1];

// One turn through the page: type the brief (or clear it), press the ask, wait for the answer.
async function askThrough(page, sel, brief) {
  if (brief !== undefined) await page.locator("#cv-brief").fill(brief);
  const resp = page.waitForResponse((r) => r.url().endsWith("/api/canvas/compose") && r.request().method() === "POST", { timeout: 120000 });
  const btn = page.locator(sel);
  await btn.scrollIntoViewIfNeeded();
  await settleScroll(page);
  await btn.click();
  const body = await (await resp).json();
  await page.waitForFunction(() => !(document.querySelector("[data-compose-status]")?.textContent ?? "").startsWith("Asking"), null, { timeout: 10000 });
  return body;
}

async function composePass(base, page, t, step) {
  const slug = "fp-compose";
  const gitBefore = gitDiscovery();
  await withPortal(MCP_DOWN, async (b2) => {
    let c2 = null;
    await step("C1 · the compose panel on a stand-in", async () => {
      await openCanvas(page, b2, "real", slug);
      const ask = page.locator("[data-compose-ask]");
      t("C1 · the compose panel shows with Ask enabled", (await page.locator("[data-compose-panel]").isVisible()) && (await ask.isEnabled()));
      t("C1 · …and the package carries the stand-in flag", ((await page.locator(".cv-card .cv-flag").allTextContents()).join(" ")).includes("a stand-in"));
    });

    await step("C2 · a briefed turn proposes one screen", async () => {
      const n = ledger(slug).length;
      const brief = "payee form, no dialog, error state inline";
      await askThrough(page, "[data-compose-ask]", brief);
      await page.waitForSelector("[data-compose-card]", { timeout: 10000 });
      const card = await page.locator("[data-compose-card]").textContent();
      const last = ledger(slug).at(-1);
      t("C2 · one proposed agent screen.compose line", ledger(slug).length === n + 1 && last.status === "proposed" && last.source === "agent" && last.op === "screen.compose", JSON.stringify(last).slice(0, 200));
      t("C2 · the card shows the brief, and its why quotes it", card.includes(`Your brief: "${brief}"`) && card.includes(`Why: Serves the owner's brief: "${brief}"`), card.slice(0, 300));
      const tx = composeTx(slug);
      const owner = tx.findIndex((l) => l.type === "text" && l.source === "owner" && l.turn === "c1");
      const init = tx.findIndex((l) => l.type === "init" && l.turn === "c1");
      t("C2 · the owner's line precedes the turn's init", owner >= 0 && init > owner && tx[owner].text === brief, JSON.stringify(tx.map((l) => l.type)));
      const small = [];
      for (const sel of ["[data-compose-ask]", "[data-compose-accept]", "[data-compose-refuse]"]) {
        const bb = await page.locator(sel).boundingBox();
        if (!bb || bb.width < 44 || bb.height < 44) small.push(`${sel} ${bb?.width}×${bb?.height}`);
      }
      t("C12 · the compose buttons measure at least 44×44", small.length === 0, small.join(", "));
      c2 = { seq: last.seq, raw: rawLine(slug, last.seq), op: { op: last.op, params: last.params } };
    });

    await step("C3 · Accept places the frame and flags its missing states", async () => {
      if (!c2) throw new Error("C2 filed nothing");
      const n = ledger(slug).length;
      await page.locator("[data-compose-accept]").click();
      await page.waitForSelector('[data-stx-id="f3"]', { timeout: 5000 });
      const last = (await waitLines(slug, n + 1)).at(-1);
      t("C3 · f3 appears and the last line is accepted/owner with fromStep", last.status === "accepted" && last.source === "owner" && last.fromStep === c2.seq, JSON.stringify(last).slice(0, 200));
      const miss = page.locator('[data-cv-ask-state="f3:error"]');
      t("C3 · the error: missing button shows on f3", (await miss.count()) === 1 && (await miss.textContent()) === "error: missing");
      const bb = await miss.boundingBox();
      t("C12 · the missing-state button measures at least 44×44", bb && bb.width >= 44 && bb.height >= 44, `${bb?.width}×${bb?.height}`);
    });

    await step("C4 · the missing-state ask asks for exactly that state", async () => {
      const n = ledger(slug).length;
      await askThrough(page, '[data-cv-ask-state="f3:error"]');
      await page.waitForSelector("[data-compose-card]", { timeout: 10000 });
      const last = ledger(slug).at(-1);
      t("C4 · the last line is a proposed agent state.add of f3/error", ledger(slug).length === n + 1 && last.status === "proposed" && last.source === "agent" && last.op === "state.add"
        && last.params.baseId === "f3" && last.params.stateKey === "error", JSON.stringify(last).slice(0, 200));
    });

    await step("C5 · Refuse records the verdict and places nothing", async () => {
      const n = ledger(slug).length;
      const seq = ledger(slug).at(-1).seq;
      await page.locator("[data-compose-refuse]").click();
      const last = (await waitLines(slug, n + 1)).at(-1);
      t("C5 · the last line is refused/owner with fromStep, and no new frame", last.status === "refused" && last.source === "owner" && last.fromStep === seq && (await node(page, "f4").count()) === 0, JSON.stringify(last).slice(0, 200));
    });

    await step("C6 · the four lines", async () => {
      const four = ledger(slug).slice(-4);
      t("C6 · proposed, accepted, proposed, refused from agent, owner, agent, owner",
        canon(four.map((l) => `${l.status}/${l.source}`)) === canon(["proposed/agent", "accepted/owner", "proposed/agent", "refused/owner"]), JSON.stringify(four.map((l) => `${l.status}/${l.source}`)));
    });

    await step("C7 · undo takes the accepted frame away", async () => {
      const n = ledger(slug).length;
      await undo(page);
      const last = (await waitLines(slug, n + 1)).at(-1);
      await page.waitForFunction(() => !document.querySelector('[data-stx-id="f3"]'), null, { timeout: 4000 }).catch(() => {});
      t("C7 · an undone line restating C2's op", last.status === "undone" && canon({ op: last.op, params: last.params }) === canon(c2?.op) && last.fromStep === undefined, JSON.stringify(last).slice(0, 200));
      t("C7 · f3 is gone from the stage and the disk fold", (await node(page, "f3").count()) === 0 && !foldLedger(ledger(slug)).doc.frames.some((f) => f.id === "f3"), "undo did not remove f3");
      t("C7 · C2's proposed line is byte-identical on disk", rawLine(slug, c2.seq) === c2.raw);
    });

    await step("C8 · an un-briefed turn", async () => {
      await askThrough(page, "[data-compose-ask]", "");
      const tx = composeTx(slug);
      const turn = tx.filter((l) => l.type === "turn").at(-1);
      t("C8 · briefed:false and no owner line", turn?.briefed === false && !tx.some((l) => l.turn === turn.turn && l.source === "owner"), JSON.stringify(turn));
      const n = ledger(slug).length;
      await page.locator("[data-compose-refuse]").click();
      t("C8 · …then Refuse", (await waitLines(slug, n + 1)).at(-1).status === "refused");
    });

    await step("C9 · an impossible screen escapes", async () => {
      const n = ledger(slug).length;
      await askThrough(page, "[data-compose-ask]", "impossible: a live map of nearby branches");
      const tx = composeTx(slug);
      const turn = tx.filter((l) => l.type === "turn").at(-1).turn;
      const last = (await page.locator("[data-compose-last]").textContent().catch(() => "")) ?? "";
      t("C9 · the ledger does not move, the transcript has a not-covered line, and the page says Not covered",
        ledger(slug).length === n && tx.some((l) => l.turn === turn && l.type === "refused" && l.kind === "not-covered") && last.startsWith("Not covered: a live map"), last);
    });

    await step("C10 · the fence, fed through a turn", async () => {
      const n = ledger(slug).length;
      await askThrough(page, "[data-compose-ask]", "fence: probe");
      const tx = composeTx(slug);
      const turn = tx.filter((l) => l.type === "turn").at(-1).turn;
      const denied = tx.filter((l) => l.turn === turn && l.type === "denied");
      t("C10 · six denied lines and the ledger does not move", denied.length === 6 && ledger(slug).length === n, `${denied.length} denied · ${ledger(slug).length - n} ops`);
    });

    await step("C11 · the disk agrees with the page", async () => {
      await sleep(300);
      const pkg = loadBuild(buildDir(slug));
      const v = verifyBuild(pkg);
      t("C11 · verifyBuild [] on the compose package", v.length === 0, v.join(" | "));
      t("C11 · the page's document equals the disk fold", canon(await pageDoc(page)) === canon(foldLedger(pkg.ops).doc));
    });

    // PR #485 review F3: the compose ROUTE's 409, run rather than grepped (47.14 only pins its source).
    await step("C13 · a stale compose → 409, nothing written", async () => {
      const n = ledger(slug).length;
      const tn = composeTx(slug).length;
      const r = await fetch(`${b2}/api/canvas/compose`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance: "real", slug, base: n - 1, ask: { kind: "screen" }, brief: null }) });
      t("C13 · a stale base on /api/canvas/compose → 409, ledger and transcript unchanged", r.status === 409 && ledger(slug).length === n && composeTx(slug).length === tn, `${r.status} · ${ledger(slug).length - n} ops · ${composeTx(slug).length - tn} transcript`);
    });

    // PR #485 review F4: a turn whose count is not the page's base plus the turn's own lines (a second tab
    // saved during it) breaks the page with a reload, rather than adopting a ledger it never displayed.
    await step("C14 · a count the turn does not explain → reload", async () => {
      await page.route("**/api/canvas/compose", async (route) => {
        const res = await route.fetch();
        const json = await res.json();
        await route.fulfill({ response: res, json: { ...json, count: json.count + 1 } });
      });
      try {
        await askThrough(page, "[data-compose-ask]", "");
        const said = (await page.locator("[data-canvas-save]").textContent()) ?? "";
        t("C14 · the page says another tab saved and asks for a reload", said.includes("another tab or process saved in between. Reload to continue."), said);
      } finally { await page.unroute("**/api/canvas/compose"); }
    });
    await page.goto("about:blank");
  }, { extraEnv: { UXF_COMPOSE_TRANSPORT: FAKE_COMPOSE } });
  t("C12 · the compose pass changed nothing under discovery/", gitDiscovery() === gitBefore, gitDiscovery());
}

// ---- --live-compose (#312, Task 6.2) — owner-run, chromium, PAID: the real Agent SDK turn ------------------
// A side portal with NO transport override (UXF_COMPOSE_TRANSPORT emptied), over a fresh fp-compose. Four
// turns back to back (the prompt cache's 5-minute TTL), capped at $1.00 summed from the stats lines. The
// operator's clicks on Accept and Refuse are SCRIPTED verdicts for a receipt, not the owner's design
// judgement. Asserted: SHAPES only. Reported, never asserted: whether L1's why names the brief, L3's
// outcome, L2's validity. The receipt lands in a directory that must not exist yet, and is never edited.
const LIVE_RECEIPT = path.join(REPO, ".claude/plans/canvas-compose-loop-312/raw/live-1");
const LIVE_CAP_USD = 1.0;
async function liveComposeLeg(results) {
  const out = [];
  const log = (s) => { out.push(s); console.log(s); };
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; log(`  ✓ ${name}`); }
    else { results.fails += 1; log(`  ✗ ${name}  ${extra}`); }
  };
  if (existsSync(LIVE_RECEIPT)) { t("live-compose · the receipt directory is new", false, `${LIVE_RECEIPT} already exists — a receipt is never overwritten`); return; }
  seed();
  const slug = "fp-compose";
  const gitBefore = gitDiscovery();
  const spent = () => composeTx(slug).filter((l) => l.type === "stats").reduce((a, l) => a + (l.costUsd ?? 0), 0);
  const browser = await pw.chromium.launch();
  const report = {};
  try {
    await withPortal(MCP_DOWN, async (b) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await openCanvas(page, b, "real", slug);
      const turnOf = () => composeTx(slug).filter((l) => l.type === "turn").at(-1)?.turn;
      const statsOf = (turn) => composeTx(slug).find((l) => l.type === "stats" && l.turn === turn);
      const verdict = async (sel) => { const n = ledger(slug).length; await page.locator(sel).click(); await waitLines(slug, n + 1); };
      const turn = async (label, sel, brief) => {
        if (spent() > LIVE_CAP_USD) { log(`  budget stop before ${label}: $${spent().toFixed(4)} > $${LIVE_CAP_USD}`); return null; }
        const body = await askThrough(page, sel, brief);
        const id = turnOf();
        const s = statsOf(id);
        log(`  ${label} · ${id} · ${s?.outcome ?? body.refused?.kind ?? body.error} · $${(s?.costUsd ?? 0).toFixed(4)} · numTurns ${s?.numTurns}`);
        return { id, stats: s, open: (await page.locator("[data-compose-card]").count()) === 1 };
      };
      const BRIEF = "payee form, no dialog, error state inline";
      // L1: a briefed screen turn; a refused first call is re-asked as a FRESH turn, at most twice.
      let l1 = null;
      for (let attempt = 1; attempt <= 3 && !l1?.open; attempt += 1) {
        l1 = await turn(`L1 (attempt ${attempt})`, "[data-compose-ask]", BRIEF);
        if (!l1 || l1.stats?.outcome === "failed") break;
      }
      report.l1 = composeTx(slug).find((l) => l.type === "op" && l.status === "proposed" && l.turn === l1?.id)?.args?.why ?? null;
      let accepted = null;
      if (l1?.open) {
        const seq = ledger(slug).at(-1).seq;
        await verdict("[data-compose-accept]");
        accepted = foldLedger(ledger(slug)).doc.frames.at(-1)?.id;
        log(`  L1 accepted seq ${seq} as ${accepted}`);
      } else log("  L1 proposed nothing after three turns — Q6 evidence, not a code failure; L2 skipped");
      // L2: the error state of the accepted frame.
      if (accepted) {
        const l2 = await turn("L2", `[data-cv-ask-state="${accepted}:error"]`);
        report.l2 = l2?.stats?.outcome ?? null;
        if (l2?.open) await verdict("[data-compose-refuse]");
      }
      // L3: an impossible screen. An escape is expected, not guaranteed.
      const l3 = await turn("L3", "[data-compose-ask]", "a live map of the customer's nearby branches with walking directions");
      report.l3 = l3?.stats?.outcome ?? null;
      if (l3?.open) await verdict("[data-compose-refuse]");
      // L4: an un-briefed screen turn, then Refuse.
      const l4 = await turn("L4", "[data-compose-ask]", "");
      if (l4?.open) await verdict("[data-compose-refuse]");
      await ctx.close();
    }, { extraEnv: { UXF_COMPOSE_TRANSPORT: "" } });
  } catch (e) {
    t("live-compose — threw", false, e.message.split("\n")[0]);
  } finally {
    await browser.close();
  }
  const tx = composeTx(slug);
  const stats = tx.filter((l) => l.type === "stats");
  const inits = tx.filter((l) => l.type === "init");
  const turns = tx.filter((l) => l.type === "turn");
  t(`live-compose · every stats line ok, transport sdk, maxTurns 4 (${stats.length} turns)`, stats.length >= 1 && stats.every((s) => s.ok === true && s.transport === "sdk" && s.maxTurns === 4),
    JSON.stringify(stats.map((s) => ({ ok: s.ok, transport: s.transport, maxTurns: s.maxTurns, error: s.error }))));
  t("live-compose · each init advertises exactly its turn's tool", inits.length === turns.length && inits.every((i) => {
    const want = turns.find((x) => x.turn === i.turn)?.ask?.kind === "state" ? "mcp__canvas__state_add" : "mcp__canvas__screen_compose";
    return canon((i.tools ?? []).filter((x) => x.startsWith("mcp__"))) === canon([want]);
  }), JSON.stringify(inits.map((i) => (i.tools ?? []).filter((x) => x.startsWith("mcp__")))));
  t("live-compose · one sessionId across every turn", new Set(inits.map((i) => i.sessionId)).size === 1, JSON.stringify([...new Set(inits.map((i) => i.sessionId))]));
  const o1 = tx.findIndex((l) => l.type === "text" && l.source === "owner" && l.turn === "c1");
  t("live-compose · L1's owner line comes before its init", o1 >= 0 && tx.findIndex((l) => l.type === "init" && l.turn === "c1") > o1);
  const v = existsSync(path.join(buildDir(slug), "ops.jsonl")) ? verifyBuild(loadBuild(buildDir(slug))) : ["no ledger"];
  t("live-compose · verifyBuild []", v.length === 0, v.join(" | "));
  t("live-compose · nothing under discovery/ changed", gitDiscovery() === gitBefore, gitDiscovery());
  log(`  REPORTED, not asserted — L1's why: ${JSON.stringify(report.l1)} · L2's outcome: ${report.l2 ?? "not run"} · L3's outcome: ${report.l3 ?? "not run"} · spent $${spent().toFixed(4)}`);
  mkdirSync(LIVE_RECEIPT, { recursive: true });
  for (const f of ["ops.jsonl", "transcript.jsonl"]) if (existsSync(path.join(buildDir(slug), f))) cpSync(path.join(buildDir(slug), f), path.join(LIVE_RECEIPT, f));
  writeFileSync(path.join(LIVE_RECEIPT, "stdout.txt"), `${out.join("\n")}\n`);
  log(`  receipt → ${path.relative(REPO, LIVE_RECEIPT)}/`);
}

// ---- --live-brilliant (#311 PR B, Task 7.2) — owner-run, chromium, the REAL bridge ---------------------------
async function liveLeg(results) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name}  ${extra}`); }
  };
  seed();
  const gitBefore = gitImportScope();
  const browser = await pw.chromium.launch();
  try {
    await withPortal(null, async (b) => {
      console.log("  select one element in a PAIRED brilliant.design tab — waiting up to 180 s");
      const deadline = Date.now() + 180_000;
      let last = null, ready = false;
      while (!ready && Date.now() < deadline) {
        try {
          const r = await fetch(`${b}/api/canvas/import/binding`, { method: "POST", signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
          last = await r.json();
        } catch (e) { last = { error: e.message }; }
        ready = Boolean(last && !last.refused && !last.error && Object.hasOwn(last, "binding") && last.selected >= 1);
        if (!ready && Date.now() < deadline) await sleep(Math.min(5000, deadline - Date.now()));
      }
      t("L0 · a paired tab answered the binding check with a selection", ready, `no paired selection within 180 s (last: ${JSON.stringify(last).slice(0, 300)})`);
      if (!ready) return;
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await openCanvas(page, b, "real", "fp-import");
      await page.locator("[data-canvas-verb=import]").click();
      await page.locator("[data-import-binding-check]").click();
      await settledLine(page);
      const line = await lineOf(page);
      t("L1 · Check binding → a binding line", line.startsWith("Reads: ") && !line.includes("unknown") && !line.includes("not checked"), line);
      const body = await importVia(page, "[data-import-selection]", 170_000);
      t("L2 · Import selection → a record", typeof body.recordId === "string", JSON.stringify(body.refused ?? body.error ?? body).slice(0, 300));
      if (typeof body.recordId === "string") {
        const rec = readRec(body.recordId);
        t("L2 · …its source.ids are Brilliant element ids (16-hex), and it passes checkRecord",
          rec.source.ids.length >= 1 && rec.source.ids.every((id) => /^[0-9a-f]{16}$/.test(id)) && recordOk(body.recordId) === null, JSON.stringify(rec.source.ids));
        t("L2 · …reference.png carries a PNG signature", isPng(path.join(importsDir(), `${body.recordId}.reference.png`)));
        const lastOp = ledger("fp-import").at(-1);
        t("L2 · …and one component.propose line for it", lastOp?.op === "component.propose" && lastOp.params?.recordId === body.recordId, JSON.stringify(lastOp));
        const d = await dropOnePart(page, body.name);
        t("L3 · one mapping edit rewrote mapping.json and re-rendered the view", d.ok, d.why);
      }
      await openPanel(page);
      const br = quiet(page.waitForResponse((r) => r.url().includes("/api/canvas/import/browse"), { timeout: 170_000 }));
      await page.locator("[data-import-browse]").click();
      const bb = await (await br).json();
      t("L4 · Browse → at least one tile", (await page.locator("[data-import-tile]").count()) >= 1, JSON.stringify(bb.refused ?? { n: bb.elements?.length }));
      await ctx.close();
    }, { timeoutMs: null });
  } catch (e) {
    t("live-brilliant — threw", false, e.message.split("\n")[0]);
  } finally {
    await browser.close();
  }
  t("L5 · git status over system/, handoff/, discovery/ and import/overrides/ unchanged", gitImportScope() === gitBefore, gitImportScope());
}

// ---- run -------------------------------------------------------------------------------------------------
let totalFails = 0;
if (LIVE_COMPOSE) {
  const results = { passes: 0, fails: 0 };
  try { await liveComposeLeg(results); } finally { await teardown(); }
  const tally = `  ── chromium --live-compose: ${results.passes} passed, ${results.fails} failed`;
  const verdict = results.fails
    ? `\ncanvas-journey ✗  ${results.fails} assertion(s) failed · live-compose`
    : "\ncanvas-journey ✓  real compose turns on the subscription: every stats line ok with transport sdk and maxTurns 4 · each init advertising exactly its turn's tool · one session id across the turns · the owner's brief before L1's init · verifyBuild [] · nothing under discovery/ changed · the receipt committed under .claude/plans/canvas-compose-loop-312/raw/live-1/ · live-compose";
  console.log(tally);
  console.log(verdict);
  if (existsSync(path.join(LIVE_RECEIPT, "stdout.txt"))) appendFileSync(path.join(LIVE_RECEIPT, "stdout.txt"), `${tally}\n${verdict}\n`);
  process.exit(results.fails ? 1 : 0);
}
if (LIVE) {
  const results = { passes: 0, fails: 0 };
  try { await liveLeg(results); } finally { await teardown(); }
  console.log(`  ── chromium --live-brilliant: ${results.passes} passed, ${results.fails} failed`);
  console.log(results.fails
    ? `\ncanvas-journey ✗  ${results.fails} assertion(s) failed · live-brilliant`
    : "\ncanvas-journey ✓  a paired selection answered the binding check · Check binding named a binding · Import selection wrote a record (16-hex ids), a PNG reference.png and one component.propose line · one mapping edit rewrote mapping.json and re-rendered · Browse showed a tile · nothing under system/, handoff/, discovery/ or import/overrides/ changed · live-brilliant");
  process.exit(results.fails ? 1 : 0);
}
try {
  const { base, health } = await boot();
  const ok = (cond, what) => { if (!cond) throw new Error(what); };
  try {
    ok(path.resolve(health.jobsDir) === scratch, `the portal's jobsDir is ${health.jobsDir}, not the scratch dir ${scratch} — it is not this run's portal`);
    ok(health.bootSha === HEAD, `the portal booted from ${health.bootSha}, this worktree's HEAD is ${HEAD}`);
    ok(health.stale === false, "the portal reports stale: true");
  } catch (e) { await bail(e.message); }
  console.log(`canvas-journey · portal ${base} · jobsDir ${health.jobsDir} · HEAD ${HEAD.slice(0, 7)}`);
  for (const engine of toRun) {
    console.log(`\n════ ${engine} ════`);
    const results = { passes: 0, fails: 0 };
    try { await leg(engine, base, results); }
    catch (e) { results.fails += 1; console.log(`  ✗ ${engine} threw: ${e.message} — the tally below is "stopped here", not coverage`); }
    console.log(`  ── ${engine}: ${results.passes} passed, ${results.fails} failed`);
    totalFails += results.fails;
    if (childExit) break;
  }
} finally {
  await teardown();
}
console.log(totalFails
  ? `\ncanvas-journey ✗  ${totalFails} assertion(s) failed`
  : `\ncanvas-journey ✓  the run list · the in-repo spine opened with ZERO saves and its save notice · run.json's provenance label with the root flagged · frames, the arrow and decision cards rendered from the ledger and the transcript with no overlap · a note, a decision link, a refused remove, a remove and its undo, a numeric width and a pointer resize each ONE ledger entry and ONE undo · a reload that keeps them · verifyBuild [] on disk and the disk document equal to the page's · 403 cross-origin and 409 stale · the stand-in flagged, not blocked · the inspector in the viewport on both branches · 44×44 targets · the lanes pass: a draft lane b writing nothing, key a refused, Keep lane as ONE variant.add whose save regenerated the pack, the frames, the asks, the diagram and the missing list switching with the lane, Write handoff pack equal to renderPack and 403 cross-origin, undo taking the lane away, verifyBuild [] and the page equal to the disk (L1–L9, #314) · the import pass: the MCP-down refusal with one action, two drops writing record + proposal + one component.propose line each with one record shape, a mapping edit re-deriving the record and the view, the run lock refusing a drop "already in flight" and the hung read's one action routed to Re-bind, a stale drop's one action reloading the page, an oversize drop refused and a traversal name a 400 · over the fake bridge: Check binding naming the tab's project and surface, Import selection writing the one selected id + a reference.png shown in the Original pane + a mapping edit (I9), the unpaired refusal's one action and the bridge's own words with Import again re-sending (I10), Re-bind running the binding check (I10b), Browse's two thumbnail tiles importing as one two-id record and served again from the session cache (I11) · a Mode 2 import as an exhibit beside the flow — placed by rule, its PNG shown, a drag, a redo, a preset change and a pointer resize into a frame each refused and put back with no ledger line, an authored height letting it sit below a screen, a drop flagged as having no image (X1–X7, #475) · the owner's faithful frame measured through the page by the spawned renderer, worst ΔE under THRESHOLD with the derived verdict reading green at 12/12 WCAG (#482), a rename returning it to missing and deleting the candidate (I12), and the no-renderer refusal visible in the view with the panel closed (I12b) · the compose pass over the fake agent: a briefed proposal whose card shows the brief, Accept with fromStep, the missing-state ask for exactly that state, Refuse, the four lines agent/owner/agent/owner, undo removing the frame with the proposal intact, an un-briefed turn, an escape and six fence denials, verifyBuild [] and the page equal to the disk, a stale compose a 409 writing nothing, and a count the turn does not explain breaking the page with a reload (C1–C14, #312) · no page errors · nothing under system/, handoff/, discovery/ or import/overrides/ changed (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
