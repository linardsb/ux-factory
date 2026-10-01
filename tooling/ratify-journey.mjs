// tooling/ratify-journey.mjs — hand-written canon (this repo; not generated). RATIFY end to end: an import
// proposal admitted through the portal page, every gate run for real, the diff returned, and the admitted part
// rendered on /components and on the canvas on three engines (epic #295 ticket #313; .claude/plans/
// ratify-write-gate-diff-313.md Task 4.3).
//
// WHAT IT PROVES. Over spike C's fixture: the Ratify section appears for a Mode 1 proposal and not for a Mode 2
// one (R1); the form is prefilled from the drafts (R2); filled (R3) and previewed, it lists the six writes, the
// pin 3/23 → 3/24 and ten steps while the tree stays clean (R4); a confirm whose form changed after the preview is
// refused `stale` ON A CLEAN TREE — so the hash is what refused it, not the dirt (R5); a cross-origin confirm is a
// 403 (R6); the page's confirm runs ten steps green and reloads onto the result (R7); `git status` is exactly the
// writes plus the named regenerations (R8); the ledger, the record's elapsed.ratify and licence, and the view
// agree (R9); the now-dirty tree refuses a second preview and confirm (R10); the page cannot undo the ratify and a
// crafted undo line is a 500 naming it (R11); every Ratify control is 44×44 (R12). Then the RENDER PROOF (AC #3):
// /components#person-row and a stack holding the part on the canvas, on chromium, firefox and webkit, with
// system/agentic-renderer.mjs untouched. Then a PROMOTED GROUP (#315): three parts saved as journey-header, promoted
// through the route and ratified with children "none" — ten steps exit 0, D8's Usage line in the spec, the registry
// provenance from group g1, and no import record touched.
//
// OPERATOR-RUN, NOT IN CI, like every journey driver here: it needs three browsers and runs the real chain.
//
// THE SCRATCH TREE IS A CLONE, NEVER A WORKTREE (D12). A linked worktree shares this repo's .git/info/exclude,
// and the node_modules line the tree needs would land in THIS repo's. The clone is made from the working tree
// (HEAD + `git diff HEAD` + the untracked files outside .claude/ and .agents/), committed as one scratch commit so
// its `git status` starts empty, and deleted in `finally` and on SIGINT/SIGTERM. The main tree's `git status` and
// info/exclude bytes are compared before and after. The package lives in a scratch JOBS_DIR under the `real`
// provenance, so its writes never show in the clone's git status. Nothing admitted here reaches the repo (D3).
//
// WHAT IT CANNOT REACH: pixels (the portal is not in the VR set; /components' baselines move per admission and are
// the owner's regen after a real commit), a real Brilliant tab (the fixture is dropped through the API), and a
// human reading the diff.
//
// Run it:
//   (cd portal && npm ci) && (cd tooling/icons && npm ci) && (cd tooling/visual-regression && npm ci)
//   node tooling/ratify-journey.mjs [chromium|firefox|webkit|all]    # default: all (the page pass is chromium's)

import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, symlinkSync, appendFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedSpine } from "../portal/lib/canvas-store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const require = createRequire(`${path.join(HERE, "visual-regression")}${path.sep}`);
const pw = require("@playwright/test");

const ENGINES = ["chromium", "firefox", "webkit"];
const arg = process.argv[2] || "all";
const toRun = arg === "all" ? ENGINES : [arg];
if (!toRun.every((e) => ENGINES.includes(e))) { console.error(`ratify-journey: unknown engine "${arg}" — chromium, firefox, webkit or all`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const NODE_MODULES = ["portal", "tooling/icons", "tooling/style-dictionary", "tooling/visual-regression"];
for (const d of ["portal/node_modules/@anthropic-ai/claude-agent-sdk", "tooling/icons/node_modules/@phosphor-icons", "tooling/visual-regression/node_modules/@playwright"]) {
  if (!existsSync(path.join(REPO, d))) { console.error(`ratify-journey: ${d} is missing — run the npm ci commands in this file's header first. Nothing was spawned.`); process.exit(1); }
}

// ---- results ------------------------------------------------------------------------------------------
let passes = 0;
let fails = 0;
const t = (name, cond, extra = "") => {
  if (cond) { passes += 1; console.log(`  ✓ ${name}`); } else { fails += 1; console.log(`  ✗ ${name}  ${extra}`); }
};

// ---- scratch dirs, children, teardown -------------------------------------------------------------------
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "ratify-journey-")));
if (root.startsWith(REPO + path.sep)) { console.error(`ratify-journey: scratch ${root} is inside the repo — refusing`); process.exit(1); }
const T = path.join(root, "tree");
const J = path.join(root, "jobs");
const LOG = path.join(root, "children.log");
const children = new Set();
const EXCLUDE = path.resolve(REPO, git(REPO, "rev-parse", "--git-common-dir").trim(), "info/exclude");
const exclude = () => (existsSync(EXCLUDE) ? readFileSync(EXCLUDE) : Buffer.alloc(0));
const MAIN_BEFORE = { status: git(REPO, "status", "--porcelain"), exclude: exclude() };

async function teardown() {
  for (const c of children) if (c.exitCode === null && c.signalCode === null) c.kill("SIGKILL");
  if (process.env.RATIFY_JOURNEY_KEEP === "1") { console.log(`  (RATIFY_JOURNEY_KEEP=1: the scratch stays at ${root})`); return; }
  rmSync(root, { recursive: true, force: true });
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { teardown().then(() => process.exit(130)); });
process.on("unhandledRejection", (e) => { console.error(`\nratify-journey ✗  unhandled rejection: ${e?.message ?? e}`); teardown().then(() => process.exit(1)); });

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.on("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

function launch(script, { cwd, env }) {
  const fd = openSync(LOG, "a");
  const c = spawn(process.execPath, [script], { cwd, env: { ...process.env, ...env }, stdio: ["ignore", fd, fd] });
  children.add(c);
  return c;
}

// ---- the scratch tree (D12) -------------------------------------------------------------------------------
function buildTree() {
  execFileSync("git", ["clone", "-q", "--no-hardlinks", "--no-checkout", REPO, T]);
  git(T, "checkout", "-q", "--detach", git(REPO, "rev-parse", "HEAD").trim());
  const patch = execFileSync("git", ["diff", "HEAD", "--binary"], { cwd: REPO, maxBuffer: 256 * 1024 * 1024 });
  if (patch.length) execFileSync("git", ["apply"], { cwd: T, input: patch });
  const untracked = git(REPO, "ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean)
    .filter((f) => !f.split("/").includes("node_modules") && !f.startsWith(".claude/") && !f.startsWith(".agents/"));
  for (const f of untracked) { mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); cpSync(path.join(REPO, f), path.join(T, f)); }
  for (const d of NODE_MODULES) if (existsSync(path.join(REPO, d, "node_modules"))) symlinkSync(path.join(REPO, d, "node_modules"), path.join(T, d, "node_modules"));
  appendFileSync(path.join(T, ".git/info/exclude"), "node_modules\n");
  git(T, "add", "-A");
  git(T, "-c", "user.name=ratify-journey", "-c", "user.email=journey@localhost", "commit", "-q", "--allow-empty", "-m", "scratch");
  return untracked.length;
}

// ---- helpers over the scratch package --------------------------------------------------------------------
const PKG = () => path.join(J, "_discovery/fp-ratify");
const ledger = () => readFileSync(path.join(PKG(), "build/ops.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const porcelainSet = () => new Set(git(T, "status", "--porcelain").split("\n").filter(Boolean));
const post = (base, route, body, headers = {}) => fetch(`${base}${route}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const drop = async (base, file, mode) => {
  const bytes = readFileSync(path.join(T, file));
  const q = new URLSearchParams({ provenance: "real", slug: "fp-ratify", base: String(ledger().length), name: path.basename(file), mode: String(mode) });
  const r = await fetch(`${base}/api/canvas/import/drop?${q}`, { method: "POST", headers: { "content-type": "application/octet-stream" }, body: bytes });
  return r.json();
};

// ---- the page pass (chromium) ---------------------------------------------------------------------------
async function pagePass(base) {
  const WHO = { provenance: "real", slug: "fp-ratify" };
  const d1 = await drop(base, "import/fixtures/spike-c-instance.blueprint.txt", 1);
  t("setup · the Mode 1 drop answers spike-list-row, i1", d1.name === "spike-list-row" && d1.recordId === "i1", JSON.stringify(d1).slice(0, 200));
  const d2 = await drop(base, "import/fixtures/spike-c-master.blueprint.txt", 2);
  t("setup · the Mode 2 drop answers its own proposal", typeof d2.name === "string" && d2.recordId === "i2", JSON.stringify(d2).slice(0, 200));
  t("setup · the clone is still clean after both drops (the package is in JOBS_DIR)", porcelainSet().size === 0, [...porcelainSet()].join(" | "));

  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const open = async (name) => {
      await page.goto(`${base}/canvas.html?${new URLSearchParams({ ...WHO, import: name })}`);
      await page.waitForSelector("[data-import-view]:not([hidden]) h2", { timeout: 20000 });
    };

    // R1 — present for Mode 1, absent for Mode 2.
    await open(d2.name);
    t("R1 · a Mode 2 proposal shows NO Ratify section", (await page.locator("[data-ratify]").count()) === 0);
    await open("spike-list-row");
    t("R1 · a Mode 1 proposal shows the Ratify section", (await page.locator("section[data-ratify]").count()) === 1);

    // R2 — the prefill.
    const f = (k) => page.locator(`[data-ratify-field="${k}"]`).first();
    t("R2 · prefilled: component spike-list-row, prefix ds, containers stack",
      (await f("component").inputValue()) === "spike-list-row" && (await f("prefix").inputValue()) === "ds"
      && (await page.locator('[data-ratify-field="containers"][value="stack"]').isChecked()) && !(await page.locator('[data-ratify-field="containers"][value="list"]').isChecked()));

    // R3 — fill.
    await f("component").fill("person-row");
    await f("tag").selectOption("div");
    await f("children").selectOption("none");
    await f("states").fill("default");
    await page.locator('[data-ratify-note="default"]').fill("The only state — a row names a person and is not a control.");
    await f("usage").fill("A row naming one person, with an optional line under the name. Ported from spike C.");
    await f("accessibility").fill("Plain text in a div; the row adds no interaction and no role.");
    await f("licence").fill("the owner's own drawing (spike C fixture)");
    const addRow = async (group, cells) => {
      await page.locator(`[data-ratify-add="${group}"]`).click();
      const row = page.locator(`[data-ratify-row="${group}"]`).last();
      for (const [cell, v] of Object.entries(cells)) {
        const c = row.locator(`[data-ratify-cell="${cell}"]`);
        if (typeof v === "boolean") { if (v) await c.check(); else await c.uncheck(); }
        else if ((await c.evaluate((n) => n.tagName)) === "SELECT") await c.selectOption(v);
        else await c.fill(v);
      }
    };
    await addRow("props", { name: "name", type: "string", required: true, description: "the person's name", example: "Ada Lovelace" });
    await addRow("props", { name: "meta", type: "string", required: false, description: "one line under the name", example: "Payee" });
    await addRow("slots", { prop: "name", as: "text", target: "span", suffix: "-name" });
    await addRow("slots", { prop: "meta", as: "text", target: "span", suffix: "-meta" });
    await addRow("css", { suffix: "", property: "gap", value: "--spacing-sm" });
    await addRow("css", { suffix: "", property: "padding", value: "--spacing-sm" });

    // R4 — preview.
    await page.locator("[data-ratify-preview]").click();
    await page.waitForSelector("[data-ratify-plan], [data-ratify-refusal]:not(:empty)", { timeout: 20000 });
    const refusal = await page.locator("[data-ratify-refusal]").textContent();
    const writes = await page.locator("[data-ratify-write]").evaluateAll((ns) => ns.map((n) => n.dataset.ratifyWrite));
    t("R4 · preview lists the six writes", JSON.stringify(writes) === JSON.stringify(["system/specs/person-row.md", "system/components.css", "system/templates.admitted.mjs", "system/palette.mjs", "tooling/build-checks.mjs", "system/specs/stack.md"]),
      `${JSON.stringify(writes)} ${refusal}`);
    t("R4 · the pin moves 3/23 → 3/24, ten steps", (await page.locator("[data-ratify-pin]").textContent())?.includes("3/23 → 3/24") && (await page.locator("[data-ratify-chain] li").count()) === 10);
    t("R4 · the clone is still clean after the preview", porcelainSet().size === 0, [...porcelainSet()].join(" | "));

    // R12 — 44×44 on the form, measured before the confirm replaces it.
    const small = await page.locator("[data-ratify] button, [data-ratify] select, [data-ratify] input[type=checkbox]").evaluateAll((ns) => ns
      .filter((n) => n.offsetParent !== null)
      .map((n) => { const r = n.getBoundingClientRect(); return { what: n.outerHTML.slice(0, 60), w: r.width, h: r.height }; })
      .filter((r) => r.w < 44 || r.h < 44));
    t("R12 · every visible Ratify button, select and checkbox is at least 44×44", small.length === 0, JSON.stringify(small).slice(0, 300));

    // R5 — a stale hash on a CLEAN tree: the form's own input with one example changed.
    const hash = await page.locator("[data-ratify-confirm]").getAttribute("data-hash");
    const input = await page.evaluate(async () => (await import("/canvas-ratify.mjs")).readForm(document.querySelector("[data-ratify]")));
    const n0 = ledger().length;
    const stale = await post(base, "/api/canvas/ratify/confirm", { ...WHO, name: "spike-list-row", input: { ...input, example: { ...input.example, meta: "Payer" } }, hash, base: n0 });
    t("R5 · a changed form on a clean tree → refused stale", stale.body?.refused?.kind === "stale" && porcelainSet().size === 0 && ledger().length === n0, JSON.stringify(stale.body).slice(0, 200));

    // R6 — cross-origin.
    const evil = await post(base, "/api/canvas/ratify/confirm", { ...WHO, name: "spike-list-row", input, hash, base: n0 }, { origin: "http://evil.example" });
    t("R6 · a cross-origin confirm → 403, the tree clean", evil.status === 403 && porcelainSet().size === 0, String(evil.status));

    // R7 — confirm through the page; it reloads onto the result.
    await page.locator("[data-ratify-confirm]").click();
    // Green reloads onto [data-ratified]; red renders a result in place; a refusal fills the refusal box.
    await page.waitForSelector("[data-ratified], [data-ratify-result], [data-ratify-refusal]:not(:empty)", { timeout: 240000 });
    if (!(await page.locator("[data-ratified]").count())) {
      const red = await page.locator("[data-ratify-step]").evaluateAll((ns) => ns.filter((n) => n.dataset.ratifyExit !== "0")
        .map((n) => `${n.dataset.ratifyStep} exit ${n.dataset.ratifyExit}:\n${n.querySelector("[data-ratify-tail]")?.textContent ?? ""}`));
      const why = red.length ? red.join("\n").split("\n").map((l) => l.slice(0, 300)).join("\n") : (await page.locator("[data-ratify-refusal]").allTextContents()).join(" | ");
      throw new Error(`the confirm did not go green — ${why}`);
    }
    const steps = await page.locator("[data-ratify-step]").evaluateAll((ns) => ns.map((n) => ({ step: n.dataset.ratifyStep, exit: n.dataset.ratifyExit })));
    const lastTail = await page.locator("[data-ratify-tail]").last().textContent();
    t("R7 · ten steps, every exit 0", steps.length === 10 && steps.every((s) => s.exit === "0"), JSON.stringify(steps));
    t("R7 · the last step's tail reads build ✓  all 51 groups pass", (lastTail ?? "").includes("build ✓  all 51 groups pass"), (lastTail ?? "").slice(-200));

    // R8 — git status equals the response's porcelain and exactly the expected set.
    const shown = new Set(await page.locator("[data-ratify-porcelain] li").allTextContents());
    const actual = porcelainSet();
    const locMoved = git(T, "diff", "--name-only", "--", "system/loc-summary.json").trim() !== "";
    const expected = new Set([
      "?? system/specs/person-row.md",
      ...["system/templates.admitted.mjs", "system/components.css", "system/palette.mjs", "system/specs/stack.md", "tooling/build-checks.mjs",
        "handoff/verdant/llms.txt", "handoff/verdant/pack.bundle.json", "handoff/verdant/pack.json", "handoff/verdant/vocabulary.json",
        "system/system-graph.json", "import/fixtures/spike-c-instance.expected.json", "import/fixtures/figma/spike-list-row.expected.json",
        "import/fixtures/records/spike-c-faithful.json", "import/fixtures/records/spike-c-wrong-but-green.json",
        ...(locMoved ? ["system/loc-summary.json"] : [])].map((p) => ` M ${p}`),
    ]);
    const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
    t("R8 · the page's porcelain equals git status in the clone", same(shown, actual), `page ${[...shown].join(" | ")} · git ${[...actual].join(" | ")}`);
    t(`R8 · git status is exactly the six writes plus the regenerations${locMoved ? " (loc-summary moved)" : " (loc-summary unchanged)"}`, same(actual, expected),
      `extra ${[...actual].filter((x) => !expected.has(x)).join(" | ") || "none"} · missing ${[...expected].filter((x) => !actual.has(x)).join(" | ") || "none"}`);

    // R9 — ledger, record, view.
    const L = ledger();
    const last = L.at(-1);
    t("R9 · the ledger's last line is the owner's proposal.ratify pr1 → person-row",
      last.op === "proposal.ratify" && last.source === "owner" && last.status === "applied" && JSON.stringify(last.params) === JSON.stringify({ proposalId: "pr1", component: "person-row" }), JSON.stringify(last));
    const rec = JSON.parse(readFileSync(path.join(PKG(), "build/imports/i1.json"), "utf8"));
    const proposedAt = L.find((l) => l.op === "component.propose" && l.params.recordId === "i1").at;
    const { checkRecord } = await import(pathToFileURL(path.join(T, "import/report.mjs")).href);
    let checked = null;
    try { checkRecord(rec); } catch (e) { checked = e.message; }
    t("R9 · elapsed.ratify is the two server stamps apart, licence set, checkRecord passes",
      rec.elapsed.ratify === Date.parse(last.at) - Date.parse(proposedAt) && rec.elapsed.ratify > 0 && rec.provenance.licence === "the owner's own drawing (spike C fixture)" && checked === null,
      `${JSON.stringify(rec.elapsed)} ${rec.provenance.licence} ${checked ?? ""}`);
    t("R9 · the view says Ratified as person-row and offers no Ratify section",
      (await page.locator("[data-ratified]").textContent()).includes("Ratified as person-row") && (await page.locator("section[data-ratify]").count()) === 0);

    // R10 — the tree is dirty now: preview and confirm both refuse, the ledger unchanged.
    const n1 = ledger().length;
    const p10 = await post(base, "/api/canvas/ratify/preview", { ...WHO, name: "spike-list-row", input });
    const c10 = await post(base, "/api/canvas/ratify/confirm", { ...WHO, name: "spike-list-row", input, hash, base: n1 });
    t("R10 · a dirty tree: preview refused dirty with no hash", p10.body?.refused?.kind === "dirty" && !p10.body.hash, JSON.stringify(p10.body).slice(0, 200));
    t("R10 · a dirty tree: confirm refused dirty, ledger unchanged", c10.body?.refused?.kind === "dirty" && ledger().length === n1, JSON.stringify(c10.body).slice(0, 200));

    // R11 — no undo from the page; a crafted undo line is a 500 naming it.
    const undoBtn = page.locator('[data-stx-verb="undo"]');
    t("R11 · the page's Undo control is disabled after the reload", (await undoBtn.count()) === 1 && await undoBtn.isDisabled());
    await page.locator(".stx-scroll").focus();
    await page.keyboard.press("ControlOrMeta+z");
    await sleep(300);
    t("R11 · Cmd+Z says Nothing to undo.", (await page.locator(".stx-live").first().textContent())?.includes("Nothing to undo."));
    const { loadBuild, positionsOf } = await import(pathToFileURL(path.join(T, "portal/lib/canvas-store.mjs")).href);
    const crafted = await post(base, "/api/canvas/save", { ...WHO, base: n1, ops: [{ op: "proposal.ratify", params: last.params, status: "undone" }],
      positions: positionsOf(loadBuild(path.join(PKG(), "build")).canvas) });
    t("R11 · a crafted undo of the ratify → 500 naming proposal.ratify and git, ledger unchanged",
      crafted.status === 500 && String(crafted.body.error).includes("proposal.ratify") && String(crafted.body.error).includes("git") && ledger().length === n1,
      `${crafted.status} ${JSON.stringify(crafted.body).slice(0, 200)}`);
    t("page · no page errors", errors.length === 0, errors.join(" | "));
  } finally { await browser.close(); }
}

// ---- the render proof (AC #3), three engines --------------------------------------------------------------
async function renderProof(base) {
  const staticPort = await freePort();
  launch(path.join(T, "tooling/visual-regression/serve.mjs"), { cwd: T, env: { PORT: String(staticPort) } });
  const S = `http://127.0.0.1:${staticPort}`;
  let reg = "";
  for (let i = 0; i < 50 && !reg; i += 1) { try { reg = await (await fetch(`${S}/system/templates.admitted.mjs`)).text(); } catch { await sleep(200); } }
  t("render · the static server serves THIS clone's registry (it admits person-row)", reg.includes('"person-row"'));

  // One screen: a stack holding the part, saved once through the portal.
  const { foldLedger, loadBuild, positionsOf } = await import(pathToFileURL(path.join(T, "portal/lib/canvas-store.mjs")).href);
  const pkg = loadBuild(path.join(PKG(), "build"));
  const ids = new Set(foldLedger(pkg.ops).doc.frames.map((fr) => fr.id));
  let n = 1;
  while (ids.has(`f${n}`)) n += 1;
  const positions = { ...positionsOf(pkg.canvas), [`f${n}`]: { x: 3200, y: 0 } };
  const saved = await post(base, "/api/canvas/save", { provenance: "real", slug: "fp-ratify", base: pkg.ops.length, positions, ops: [{ status: "applied", op: "screen.compose", params: {
    screenId: "payee-row", why: "the ratified part, placed in a screen to prove it renders",
    composition: { name: "stack", props: { direction: "column", gap: "md" }, children: [{ name: "person-row", props: { name: "Grace Hopper" } }] } } }] });
  t("render · the screen holding person-row saved", saved.status === 200, `${saved.status} ${JSON.stringify(saved.body).slice(0, 200)}`);

  for (const engine of toRun) {
    const browser = await pw[engine].launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${S}/components.html#person-row`);
      let name = null;
      try {
        await page.waitForSelector("#person-row.cat-component .ds-person-row .ds-person-row-name", { timeout: 20000 });
        name = await page.locator("#person-row.cat-component .ds-person-row .ds-person-row-name").first().textContent();
      } catch (e) { name = `(${e.message.split("\n")[0]})`; }
      t(`render · ${engine} · /components#person-row renders "Ada Lovelace"`, name === "Ada Lovelace", String(name));
      t(`render · ${engine} · /components has no page errors`, errors.length === 0, errors.join(" | "));
      errors.length = 0;
      await page.goto(`${base}/canvas.html?provenance=real&slug=fp-ratify`);
      let grace = null;
      try {
        await page.waitForSelector(".ds-person-row .ds-person-row-name", { timeout: 20000 });
        grace = await page.locator(".ds-person-row .ds-person-row-name").first().textContent();
      } catch (e) { grace = `(${e.message.split("\n")[0]})`; }
      const refused = (await page.locator(".cv-flag").allTextContents()).filter((x) => x.startsWith("Refused"));
      t(`render · ${engine} · the canvas renders "Grace Hopper" inside a stack, no refusal`, grace === "Grace Hopper" && refused.length === 0, `${grace} ${refused.join(" | ")}`);
      t(`render · ${engine} · the canvas has no page errors`, errors.length === 0, errors.join(" | "));
    } finally { await browser.close(); }
  }
  t("render · system/agentic-renderer.mjs is untouched in the clone", git(T, "diff", "HEAD", "--", "system/agentic-renderer.mjs") === "");
}

// ---- a promoted group, admitted end to end (#315, Task 6.6) ----------------------------------------------------
// After person-row, committed in the clone so its tree is clean again: one screen composed in-process (seedMeasure's
// precedent), its three parts saved as a group, the group promoted through POST /api/canvas/promote, then preview and
// confirm through the API with children "none" — the shape proven green; a "many" container reds groups 40/43/46 through
// the matcher (the plan's Out of Scope). The name is journey-header, never app-header: group 50's promote fixtures
// (50.18, 50.19) own that name and refuse it as a vocabulary member, exactly as 50's probe-row does beside person-row.
async function groupAdmission(base) {
  const NAME = "journey-header";
  git(T, "add", "-A");
  git(T, "-c", "user.name=ratify-journey", "-c", "user.email=journey@localhost", "commit", "-q", "-m", "scratch: person-row admitted");
  t("group · the clone is clean again after committing person-row", porcelainSet().size === 0, [...porcelainSet()].join(" | "));
  const { foldLedger, loadBuild, loadDecisions, positionsOf, saveRun } = await import(pathToFileURL(path.join(T, "portal/lib/canvas-store.mjs")).href);
  const b0 = loadBuild(path.join(PKG(), "build"));
  const frames = new Set(foldLedger(b0.ops).doc.frames.map((fr) => fr.id));
  let n = 1;
  while (frames.has(`f${n}`)) n += 1;
  const fid = `f${n}`;
  saveRun(PKG(), { base: b0.ops.length, positions: { ...positionsOf(b0.canvas), [fid]: { x: 4400, y: 0 } }, decisions: loadDecisions(PKG()), ops: [
    { op: "screen.compose", status: "applied", params: { screenId: "home", why: "the header case: a title, a help button and a mark shared by every screen", decisionRefs: [],
      composition: { name: "stack", id: "screen", props: { direction: "column", gap: "md" }, children: [
        { name: "screen-header", id: "header", props: { title: "Home" } },
        { name: "ghost-button", id: "help", props: { label: "Help" } },
        { name: "icon", id: "mark", props: { name: "info", size: "md" } }] } } },
    { op: "group.define", status: "applied", params: { name: NAME, frameId: fid, partIds: ["header", "help", "mark"] } },
  ] });
  const imports = () => git(T, "status", "--porcelain").split("\n").filter(Boolean);
  const importsBefore = readFileSync(path.join(PKG(), "build/imports/i1.json"));
  const WHO = { provenance: "real", slug: "fp-ratify" };
  const pr = await post(base, "/api/canvas/promote", { ...WHO, base: ledger().length, groupId: "g1" });
  t(`group · Promote answers ${NAME} from g1`, pr.status === 200 && pr.body?.name === NAME && pr.body?.groupId === "g1", `${pr.status} ${JSON.stringify(pr.body).slice(0, 200)}`);
  const proposalId = foldLedger(ledger()).doc.proposals.find((p) => p.groupId === "g1")?.id;
  const input = {
    component: NAME, prefix: "ds",
    props: { title: { type: "string", required: true, description: "the screen's title, shown by the header part inside" } },
    states: ["default"], stateNotes: { default: "the only state — the header row holds its parts" },
    usage: "The header shared by every screen: a screen header, a help button and a mark, composed in the run and promoted.",
    accessibility: "A div grouping its title; the row adds no interaction.",
    structure: { tag: "div", slots: [{ prop: "title", as: "text", tag: "span", suffix: "-title" }], children: "none" },
    containers: ["stack"],
    css: [{ suffix: "", decls: [["gap", "var(--spacing-sm)"]] }],
    example: { title: "Home" }, licence: "the owner's own composition", attribution: "",
  };
  const pv = await post(base, "/api/canvas/ratify/preview", { ...WHO, name: NAME, input });
  t("group · the preview plans six writes with a hash", !pv.body?.refused && typeof pv.body?.hash === "string" && pv.body?.plan?.writes?.length === 6, JSON.stringify(pv.body?.refused ?? pv.body).slice(0, 300));
  const cf = await post(base, "/api/canvas/ratify/confirm", { ...WHO, name: NAME, input, hash: pv.body?.hash, base: ledger().length });
  const gates = cf.body?.gates ?? [];
  t("group · the confirm runs ten chain steps, every exit 0", cf.body?.ok === true && gates.length === 10 && gates.every((g) => g.code === 0),
    `${cf.status} ${JSON.stringify(cf.body?.refused ?? cf.body?.error ?? gates.filter((g) => g.code !== 0).map((g) => ({ step: g.step, code: g.code, tail: String(g.tail).slice(-400) })))}`);
  const last = ledger().at(-1);
  t(`group · the ledger's last line is proposal.ratify ${proposalId} → ${NAME}`, last?.op === "proposal.ratify" && JSON.stringify(last.params) === JSON.stringify({ proposalId, component: NAME }), JSON.stringify(last));
  const specPath = path.join(T, `system/specs/${NAME}.md`);
  const usage = `Admitted by ratify (portal/lib/ratify.mjs) from group \`g1\` in run \`fp-ratify\`: composed in run fp-ratify from group g1 (${NAME}), licence: the owner's own composition.`;
  t("group · the spec's Usage line is D8's, verbatim", existsSync(specPath) && readFileSync(specPath, "utf8").split("\n").includes(usage),
    existsSync(specPath) ? readFileSync(specPath, "utf8").split("\n").find((l) => l.startsWith("Admitted by ratify")) : "no spec");
  const reg = readFileSync(path.join(T, "system/templates.admitted.mjs"), "utf8");
  const entry = reg.slice(reg.indexOf(`"${NAME}"`));
  t("group · the registry entry's provenance is from group g1", /"from":\s*"group"/.test(entry.slice(0, 1200)) && /"record":\s*"g1"/.test(entry.slice(0, 1200)), entry.slice(0, 400));
  t("group · no import record changed (a group has none to stamp)", readFileSync(path.join(PKG(), "build/imports/i1.json")).equals(importsBefore) && !imports().some((l) => l.includes("imports/")));
}

// ---- run ----------------------------------------------------------------------------------------------------
try {
  console.log(`ratify-journey — scratch ${root}`);
  const copied = buildTree();
  t(`tree · the clone (HEAD + diff + ${copied} untracked) starts with an empty git status`, git(T, "status", "--porcelain") === "");
  mkdirSync(path.join(J, "_discovery"), { recursive: true });
  // The spine, SEEDED (#316): the committed package grows with a real run, and this journey mints i1/pr1 from the six.
  seedSpine(path.join(T, "discovery/faster-payment"), PKG(), { discovery: true });
  const port = await freePort();
  const portal = launch(path.join(T, "portal/server.mjs"), { cwd: path.join(T, "portal"), env: { PORT: String(port), JOBS_DIR: J, UXF_IMPORT_SUGGEST: "off" } });
  const base = `http://127.0.0.1:${port}`;
  let health = null;
  for (let i = 0; i < 100 && !health; i += 1) {
    if (portal.exitCode !== null) break;
    try { const r = await fetch(`${base}/api/health`); if (r.ok) health = await r.json(); } catch { await sleep(200); }
  }
  const tHead = git(T, "rev-parse", "HEAD").trim();
  t("tree · the portal is the clone's: jobsDir, HEAD, not stale", health && path.resolve(health.jobsDir) === J && health.headSha === tHead && health.stale === false, JSON.stringify(health));
  if (!health) throw new Error(`the portal did not answer — ${readFileSync(LOG, "utf8").slice(-800)}`);
  if (toRun.includes("chromium")) await pagePass(base);
  else console.log("  (the page pass R1–R12 runs on chromium; this run renders only)");
  if (!toRun.includes("chromium")) {
    // The render proof needs an admitted part: without the page pass there is none, so say so.
    t("render · needs the chromium page pass to admit the part first", false, "run `all` or `chromium`");
  } else { await renderProof(base); await groupAdmission(base); }
} catch (e) {
  t("the journey ran to the end", false, e.stack ?? e.message);
} finally {
  await teardown();
  t("main tree · git status unchanged", git(REPO, "status", "--porcelain") === MAIN_BEFORE.status);
  t("main tree · .git/info/exclude byte-identical", exclude().equals(MAIN_BEFORE.exclude));
}

if (fails) { console.log(`\nratify-journey ✗  ${fails} assertion(s) failed (${passes} passed)`); process.exit(1); }
console.log(`\nratify-journey ✓  ${passes} assertions — R1–R12 through the page on chromium, then /components#person-row and the canvas on ${toRun.join(", ")}`);
