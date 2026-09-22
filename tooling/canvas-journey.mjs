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
// WHAT IT CANNOT REACH: the page's pixels (no baseline — the portal is not in the VR set), a real
// Brilliant import (#311), and two-tab behaviour beyond the 409 the server returns.
//
// Run it:
//   (cd portal && npm ci)                                   # server.mjs imports the Agent SDK
//   node tooling/canvas-journey.mjs [chromium|firefox|webkit|all]   # default: all

import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { foldLedger, loadBuild, verifyBuild } from "../portal/lib/canvas-store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const ENGINES = ["chromium", "firefox", "webkit"];
const arg = process.argv[2] || "all";
const toRun = arg === "all" ? ENGINES : [arg];
if (!toRun.every((e) => ENGINES.includes(e))) {
  console.error(`canvas-journey: unknown engine "${arg}" — chromium, firefox, webkit or all`);
  process.exit(2);
}

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

async function boot(attempt = 1) {
  const port = await freePort();
  const fd = openSync(LOG, "a");
  childExit = null;
  child = spawn(process.execPath, [path.join(REPO, "portal/server.mjs")], {
    cwd: path.join(REPO, "portal"),
    env: { ...process.env, PORT: String(port), JOBS_DIR: scratch },
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

async function teardown() {
  if (child && childExit === null) {
    child.kill("SIGTERM");
    const until = Date.now() + 3000;
    while (childExit === null && Date.now() < until) await sleep(100);
    if (childExit === null) child.kill("SIGKILL");
  }
  rmSync(scratch, { recursive: true, force: true });
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { teardown().then(() => process.exit(130)); });

// ---- the scratch packages ---------------------------------------------------------------------------
// Rebuilt per engine so every leg starts identical. fp-journey is a copy of the fictional Faster
// Payment package; its run.json keeps provenance "fictional" ON PURPOSE — step 3 asserts the page
// labels it fictional and flags the root. fp-stand-in carries no transcript.jsonl.
const DISC = () => path.join(scratch, "_discovery");
function seed() {
  rmSync(DISC(), { recursive: true, force: true });
  mkdirSync(DISC(), { recursive: true });
  const src = path.join(REPO, "discovery/faster-payment");
  const j = path.join(DISC(), "fp-journey");
  mkdirSync(j);
  for (const f of ["run.json", "answers.jsonl", "transcript.jsonl"]) cpSync(path.join(src, f), path.join(j, f));
  cpSync(path.join(src, "build"), path.join(j, "build"), { recursive: true });
  const s = path.join(DISC(), "fp-stand-in");
  mkdirSync(s);
  cpSync(path.join(src, "run.json"), path.join(s, "run.json"));
  cpSync(path.join(src, "build"), path.join(s, "build"), { recursive: true });
}
const buildDir = (slug) => path.join(DISC(), slug, "build");
const ledger = (slug) => readFileSync(path.join(buildDir(slug), "ops.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
async function waitLines(slug, n, ms = 6000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (ledger(slug).length >= n) return ledger(slug); await sleep(100); }
  return ledger(slug);
}
const gitDiscovery = () => execFileSync("git", ["status", "--porcelain", "--", "discovery/"], { cwd: REPO, encoding: "utf8" });

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
        const ctx2 = await browser.newContext({ viewport: { width: 1000, height: 800 } });
        const p2 = await ctx2.newPage();
        watch(p2);
        await p2.addInitScript(() => {
          const real = CSS.supports.bind(CSS);
          CSS.supports = (...a) => (String(a.join(" ")).includes("anchor-name") ? false : real(...a));
        });
        await openCanvas(p2, base, "real", "fp-journey");
        const rightmost = await p2.evaluate(() => [...document.querySelectorAll(".stx-frame")]
          .sort((a, b) => parseFloat(b.style.getPropertyValue("--x")) - parseFloat(a.style.getPropertyValue("--x")))[0]?.dataset.stxId);
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
      const disk = foldLedger(pkg.ops).doc;
      t("12 · the document folded from disk deep-equals the page's", canon(disk) === canon(await pageDoc(page)));
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
        (await page.locator('#cv-inspector input[type="checkbox"]').count()) === 0 && (await page.locator("#cv-no-transcript").count()) === 1
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

    await step("15 · 44×44 targets", async () => {
      await openCanvas(page, base, "real", "fp-journey");
      const measure = async (loc, label) => {
        await loc.scrollIntoViewIfNeeded();
        await settleScroll(page);
        const b = await loc.boundingBox();
        return { label, w: b?.width ?? 0, h: b?.height ?? 0 };
      };
      const sizes = [await measure(page.locator("[data-canvas-verb=annotate]"), "Add note"), await measure(page.locator('[data-cv-details="f1"]'), "Details")];
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

    t("16 · no page errors or console errors across the leg", errors.length === 0, errors.slice(0, 3).join(" | "));
    const gitAfter = gitDiscovery();
    t("the leg changed nothing under discovery/ (git status identical before and after)", gitAfter === gitBefore, gitAfter);
    await ctx.close();
  } finally {
    await browser.close();
  }
}

// ---- run -------------------------------------------------------------------------------------------------
let totalFails = 0;
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
  : `\ncanvas-journey ✓  the run list · the in-repo spine opened with ZERO saves and its save notice · run.json's provenance label with the root flagged · frames, the arrow and decision cards rendered from the ledger and the transcript with no overlap · a note, a decision link, a refused remove, a remove and its undo, a numeric width and a pointer resize each ONE ledger entry and ONE undo · a reload that keeps them · verifyBuild [] on disk and the disk document equal to the page's · 403 cross-origin and 409 stale · the stand-in flagged, not blocked · the inspector in the viewport on both branches · 44×44 targets · no page errors · nothing under discovery/ changed (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
