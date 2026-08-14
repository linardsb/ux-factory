// tooling/studio-journey.mjs — the studio canvas's cross-engine functional driver (epic #202,
// ticket #204; .claude/plans/studio-canvas-stage-204.md).
//
// The fourth of this repo's operator-run drivers, and it exists for the reason the other three do:
// the pixel gate never INTERACTS, so it cannot tell a live control from a dead one. A canvas whose
// zoom buttons stopped doing anything would leave every at-rest screenshot green.
//
// What it asserts that nothing else can:
//   · the BARE-WHEEL RULE. A plain wheel over the stage must not zoom — it scrolls, and then chains
//     to the page. That is the dark pattern the ⌘/Ctrl-only handler exists to not be, and it is a
//     claim about an event that did NOT happen, which no static check can make.
//   · that arrangement really is attributes. system/studio-canvas.mjs is grep-clean of inline-style
//     writes by build-checks group 7, but grep proves the source, not the running page: this reads
//     the mounted stage and every slot and asserts no `style` attribute exists on any of them.
//   · that FIT is arithmetically honest against real layout. --stx-slot-w / --stx-slot-h live in CSS
//     alone and group 12 cannot mirror them, because whether a level fits is a layout fact, not a
//     literal. Asserted as "the next level up does NOT fit" — which holds both when fit found a
//     fitting level and when it floored at the smallest, and goes red the day the slot size drifts
//     away from what fitLevel assumes.
//   · that Tab reaches a component in the FAR column and the browser scrolls it into view. That is
//     the single property pan-by-scroll was chosen for; a transform-translate stage would fail here
//     and nowhere else.
//
// #213 grows this into the full studio journey rather than replacing it.
//
// Playwright is NOT a repo dependency and must never become one — it is resolved out of
// tooling/visual-regression/node_modules, the exact build CI's `visual` job pins, so this driver and
// the pixel gate always agree about which browser "chromium" means. Not registered in verify.yml,
// the same call #138 made for build-journey: three engine downloads per PR buys less than it costs.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
//   node tooling/studio-journey.mjs [chromium|firefox|webkit|all]      # default: all

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
// #213's INP helper: the injected observer source + the pure comparator perfPass self-tests with.
// Driver-side only — nothing from it ever ships (its header carries the argument).
import { OBSERVER_INIT, summarize, violations } from "./inp-observer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "http://127.0.0.1:4757";
const ENGINES = ["chromium", "firefox", "webkit"];
const requested = (process.argv[2] || "all").toLowerCase();
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`studio-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// Imported from the shipped module, never retyped — moving a cap or a level fails this driver
// instead of drifting past it (proto-journey.mjs:54-56's discipline).
const { MAX_COLS, ZOOM_LEVELS, ZOOM_REST } = await import(new URL("../system/studio-canvas.mjs", import.meta.url));
// #214's methodPass computes its expectations IN NODE from the same committed rules the page runs —
// a hardcoded label list would pass a redraft that silently stopped being draftBoard's.
const { draftBoard } = await import(new URL("../system/breadboard.mjs", import.meta.url));
const { DEFAULT_ANSWERS, frequencyVerdictFor, quadrantFor, QUADRANT_MEANINGS } =
  await import(new URL("../system/build-questions.mjs", import.meta.url));
const { decodeBuild, encodeBuild, SHARE_PARAM } = await import(new URL("../system/build-share.mjs", import.meta.url));
// #217's selectPass computes every expected id set IN NODE through the same pure functions the
// page runs — a literal id list would pass a board that silently stopped being the replay's.
const { idsInRange, marqueeRange } = await import(new URL("../system/studio-select.mjs", import.meta.url));
// #218's docsPass asks the SHIPPED module which three artifacts the docs panel loads, so a fourth
// source (or a renamed one) moves the driver with the module instead of drifting past it.
const { DOCS_SOURCES } = await import(new URL("../system/studio-docs.mjs", import.meta.url));

// The stale-serve guard (tooling/catalog-journey.mjs's, copied): a long-lived serve.mjs can belong
// to another session and serve ANOTHER tree, and every assertion below would then be about the
// wrong code. Checked on studio-docs.mjs because that is the file this run is newest about — a
// stale server is exactly how a green run gets reported for code that was never served.
{
  const here = new URL("../system/studio-docs.mjs", import.meta.url);
  const served = await fetch(`${BASE}/system/studio-docs.mjs`).then((r) => r.text()).catch(() => null);
  const { readFile } = await import("node:fs/promises");
  if (served !== await readFile(here, "utf8")) {
    console.error(`studio-journey: ${BASE} is not serving THIS tree's system/studio-docs.mjs — start `
      + "node tooling/visual-regression/serve.mjs from this checkout (or point BASE elsewhere)");
    process.exit(1);
  }
}

const VIEWPORT = "[data-studio-canvas]";
const SCROLL = `${VIEWPORT} .stx-scroll`;
const READOUT = `${VIEWPORT} .stx-zoom-level`;
const LIVE = `${VIEWPORT} .stx-live`;

const pct = (i) => `${Math.round(ZOOM_LEVELS[i] * 100)}%`;

// The state the assertions below read, taken in one round trip so nothing races a re-layout.
const snapshot = (p) => p.evaluate(() => {
  const vp = document.querySelector("[data-studio-canvas]");
  const scroll = vp.querySelector(".stx-scroll");
  const stage = vp.querySelector(".stx-stage");
  const slots = [...stage.querySelectorAll(".stx-slot")];
  return {
    zoom: vp.getAttribute("data-zoom"),
    readout: vp.querySelector(".stx-zoom-level").textContent.trim(),
    live: vp.querySelector(".stx-live").textContent.trim(),
    scrollLeft: Math.round(scroll.scrollLeft),
    scrollTop: Math.round(scroll.scrollTop),
    clientW: scroll.clientWidth,
    clientH: scroll.clientHeight,
    scrollW: scroll.scrollWidth,
    // The UNSCALED layout box — a bounding rect would report the post-transform size and make the
    // fit arithmetic below compute against its own last answer.
    contentW: stage.offsetWidth,
    contentH: stage.offsetHeight,
    panning: scroll.classList.contains("is-panning"),
    slotCount: slots.length,
    // The attribute-not-style claim, read off the RUNNING page rather than out of the source.
    inlineStyled: [...slots, stage, scroll].filter((n) => n.hasAttribute("style")).length,
    outDisabled: vp.querySelector(".stx-zoom-btn").disabled,
  };
});

// The exported driver seam, reached by the SAME specifier the harness imports — a different string
// resolves to a second module record whose `live` is null (vt-verify.mjs:209's idiom).
const viaSeam = (p, col, row) => p.evaluate(([c, r]) =>
  import("/system/studio-canvas.mjs").then((m) => {
    const canvas = m.getCanvas();
    if (!canvas) return { error: "getCanvas() returned nothing — the module record the page mounted is not this one" };
    const node = canvas.stage.querySelector(".stx-slot");
    const slot = canvas.place(node, { col: c, row: r, name: "Driven tile" });
    return { slot, col: node.getAttribute("data-col"), row: node.getAttribute("data-row"), styled: node.hasAttribute("style") };
  }), [col, row]);

const btn = (p, name) => p.locator(VIEWPORT).getByRole("button", { name, exact: true });

// ---- #205's seams and helpers -------------------------------------------------------------------

// The whole arrangement as plain data, read through the MOUNTED module's own snapshot() rather than
// re-derived here — the three-source proof compares model state, and re-implementing the read would
// let a driver bug look like agreement.
const arrangement = (p) => p.evaluate(() => import("/system/studio-verbs.mjs").then((m) => {
  const v = m.getVerbs();
  return v ? v.snapshot() : { error: "getVerbs() returned nothing — the module record the page mounted is not this one" };
}));

const historyDepth = (p) => p.evaluate(() => import("/system/studio-verbs.mjs")
  .then((m) => m.getVerbs().history.depth()));

// A source:"agent" action injected through the exported seam — never a window.__ global. This is
// #209's replay mechanism exactly, so a green here is that handoff proven a wave early.
const inject = (p, action) => p.evaluate((a) => import("/system/studio-verbs.mjs")
  .then((m) => { m.getVerbs().bus.emit(a); }), action);

// Start recording every action on the page's bus, through the same seam. Returns nothing; read it
// back with busSeen().
const busRecord = (p) => p.evaluate(() => import("/system/studio-verbs.mjs").then((m) => {
  window.__busLog = [];
  m.getVerbs().bus.on("*", (a) => window.__busLog.push({
    type: a.type, source: a.source, id: a.target?.id,
    // #232's two fields, recorded whole: `hasComponent` distinguishes an ABSENT component (a node
    // with no vocabulary shape) from one that happens to be empty.
    component: a.target?.component, hasComponent: a.target ? "component" in a.target : false,
    label: a.target?.label, params: a.params,
  }));
}));
const busSeen = (p) => p.evaluate(() => (window.__busLog || []).slice());
const busClear = (p) => p.evaluate(() => { window.__busLog = []; });

// The client-space centre of a grid cell, derived from MEASURED slot boxes — the origin from the
// slot at column 2 row 1, the pitch from its neighbours in column 3 and row 2. Deliberately not
// computed from getComputedStyle(stage).gridTemplateColumns: that is the same read the module's own
// hit-test makes, and a driver that reproduces the implementation's arithmetic agrees with its bugs.
//
// The references are (2,1) (3,1) (2,2) rather than the origin cell, because the node this section
// moves around starts at (1,1) — anchoring on a cell the test itself empties would make the whole
// helper stop resolving halfway through the run.
const cellPoint = (p, col, row) => p.evaluate(([c, r]) => {
  const stage = document.querySelector("[data-studio-canvas] .stx-stage");
  const box = (sel) => { const n = stage.querySelector(sel); return n && n.getBoundingClientRect(); };
  const a = box('.stx-slot[data-col="2"][data-row="1"]');
  const bx = box('.stx-slot[data-col="3"][data-row="1"]');
  const by = box('.stx-slot[data-col="2"][data-row="2"]');
  if (!a || !bx || !by) return { error: "the three reference slots (2,1) (3,1) (2,2) are not all placed" };
  return {
    x: a.left + (c - 2) * (bx.left - a.left) + a.width / 2,
    y: a.top + (r - 1) * (by.top - a.top) + a.height / 2,
  };
}, [col, row]);

// The stable id of whatever currently sits in a cell — so a case can name its start node by where
// it is rather than by which order the harness happened to place things in.
const idAt = (p, col, row) => p.evaluate(([c, r]) =>
  document.querySelector(`.stx-slot[data-col="${c}"][data-row="${r}"]`)?.getAttribute("data-stx-id") ?? null,
[col, row]);

// The measured box of one node, by its stable id.
const nodeBox = (p, id) => p.evaluate((i) => {
  const n = document.querySelector(`.stx-slot[data-stx-id="${i}"]`);
  const r = n && n.getBoundingClientRect();
  return r && { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}, id);

// A pointer drag from a node's own centre to a client point. Body-drag, not the handle, so the
// gesture under test is the one a reader performs without finding the affordance first.
async function dragTo(p, id, to) {
  const from = await nodeBox(p, id);
  await p.mouse.move((from.left + from.right) / 2, (from.top + from.bottom) / 2);
  await p.mouse.down();
  await p.mouse.move(to.x, to.y, { steps: 18 });
  await p.mouse.up();
  await p.waitForTimeout(120);
}

// Records on the live region. textContent ASSIGNMENT replaces the text node, so an identical
// sentence still produces a childList record — measured on all three engines while writing this,
// which is what makes the exact counts below safe for a blocked arrow press that repeats itself.
// Records are stamped ONE BY ONE, inside the callback, not once per callback: two writes coalesced
// into the same task arrive as two records in ONE callback, and a per-callback stamp would give them
// two different-looking times. Stamping per record makes a coalesced pair read as a gap of ~0, which
// is the whole point — an aria-live="polite" region announces only its FINAL value, so two sentences
// in one task are one announcement and the count alone cannot tell that from two (#207 · M2).
const countLive = (p) => p.evaluate(() => {
  window.__liveCount = 0;
  window.__liveLast = "";
  window.__liveAt = [];
  const live = document.querySelector("[data-studio-canvas] .stx-live");
  window.__liveObs?.disconnect();
  window.__liveObs = new MutationObserver((ms) => {
    window.__liveCount += ms.length;
    for (let i = 0; i < ms.length; i += 1) window.__liveAt.push(performance.now());
    window.__liveLast = live.textContent.trim();
  });
  window.__liveObs.observe(live, { childList: true, characterData: true, subtree: true });
});
// What holds focus, as the text a reader would hear — "BODY" when focus has been dropped to the
// document, which is what disabling the active element does in every engine.
const focusedText = (p) => p.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return "BODY";
  return (a.textContent || "").trim() || a.tagName;
});
const liveSeen = (p) => p.evaluate(() => ({
  n: window.__liveCount,
  last: window.__liveLast,
  gaps: (window.__liveAt || []).slice(1).map((t, i) => Math.round(t - window.__liveAt[i])),
}));

// Back to the arrangement the page loaded with, by driving the verb the reader has. Written as a
// loop rather than a fixed number of clicks because the sections below deliberately produce
// different numbers of history entries, and a hardcoded count would either leave the fixture
// half-moved or hang on a disabled button — which is what it did before this existed.
const undoAll = async (p) => {
  for (let i = 0; i < 80; i += 1) {
    const b = p.locator(VIEWPORT).getByRole("button", { name: "Undo", exact: true });
    if (await b.isDisabled()) break;
    await b.click();
    await p.waitForTimeout(60);
  }
  await p.waitForTimeout(200);
};

async function journey(engineName, results, held) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name}  ${extra}`); }
  };

  const browser = held.browser = await pw[engineName].launch();
  const errors = [];
  // The harness fetches only committed files and calls no Worker, so ANY console error or page
  // error is a real failure — there is no expected-noise filter to weaken, unlike proto-journey's.
  async function open(ctx) {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
    await p.goto(`${BASE}/studio.html`, { waitUntil: "load" });
    await p.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
    await p.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 20000 });
    // #205's handle, set in its own `finally` — so a mount that threw fails the next assertion on
    // the missing thing rather than deadlocking this wait to timeout.
    await p.waitForSelector('[data-canvas-verbs="ready"]', { timeout: 20000 });
    return p;
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await open(ctx);

  // ---------------------------------------------------------------- [1] at rest
  const rest = await snapshot(page);
  t(`at rest the canvas is data-zoom=${ZOOM_REST} (scale 1), scrolled to 0,0, readout 100%`,
    rest.zoom === String(ZOOM_REST) && rest.scrollLeft === 0 && rest.scrollTop === 0 && rest.readout === "100%",
    JSON.stringify({ zoom: rest.zoom, l: rest.scrollLeft, t: rest.scrollTop, readout: rest.readout }));
  t(`the stage holds real components (${rest.slotCount} placed)`, rest.slotCount >= 30, `slots=${rest.slotCount}`);
  t("no `style` attribute on the stage, the scroller or any slot — arrangement is attributes, on the running page",
    rest.inlineStyled === 0, `${rest.inlineStyled} element(s) carry one`);
  t("the sizer gives the scroller a real pannable range", rest.scrollW > rest.clientW,
    `scrollWidth=${rest.scrollW} clientWidth=${rest.clientW}`);

  // ---------------------------------------------------------------- [2] the four zoom verbs
  await btn(page, "Zoom in").click();
  await btn(page, "Zoom in").click();
  const zin = await snapshot(page);
  t(`zoom in ×2 tracks ZOOM_LEVELS → ${pct(ZOOM_REST + 2)}`,
    zin.zoom === String(ZOOM_REST + 2) && zin.readout === pct(ZOOM_REST + 2), `${zin.zoom} / ${zin.readout}`);
  t("at the top level the Zoom in button is disabled",
    await btn(page, "Zoom in").isDisabled(), "");

  await btn(page, "Zoom out").click();
  await btn(page, "Zoom out").click();
  const zout = await snapshot(page);
  t("zoom out ×2 comes back to 100%", zout.zoom === String(ZOOM_REST) && zout.readout === "100%", `${zout.zoom} / ${zout.readout}`);

  // Exactly ZOOM_REST clicks from 100% reaches index 0 — clicking past it would hang on the button
  // this very assertion expects to be disabled.
  for (let i = 0; i < ZOOM_REST; i += 1) await btn(page, "Zoom out").click();
  t("at the bottom level the Zoom out button is disabled", (await snapshot(page)).outDisabled, "");

  // FIT — the only check that catches --stx-slot-w / --stx-slot-h drifting away from what fitLevel
  // assumes. Phrased as "the NEXT level up does not fit", which is true both when fit found a
  // fitting level and when it floored at the smallest because nothing fits.
  await btn(page, "Fit").click();
  const fitted = await snapshot(page);
  const chosen = Number(fitted.zoom);
  const fitsAt = (i) => ZOOM_LEVELS[i] * fitted.contentW <= fitted.clientW + 1 && ZOOM_LEVELS[i] * fitted.contentH <= fitted.clientH + 1;
  t("fit picks the largest level that actually fits the measured viewport — the next one up does not",
    chosen === ZOOM_LEVELS.length - 1 || !fitsAt(chosen + 1),
    `chose ${chosen} (${pct(chosen)}); content ${fitted.contentW}×${fitted.contentH} in ${fitted.clientW}×${fitted.clientH}`);
  t("fit is either a fitting level or the floor, never a level nothing could reach",
    fitsAt(chosen) || chosen === 0, `chose ${chosen}, fits=${fitsAt(chosen)}`);
  t("fit announces the level it reached", /^Zoom \d+ percent/.test(fitted.live), fitted.live);

  // The harness's real grid (12 × 220px) is far wider than the scroller, so the check above only
  // ever exercises fit's FLOOR branch — which catches a slot size that grew, but not one that
  // shrank. Shrinking the slots in the page reaches a level fit can genuinely land on, so the
  // "largest level that fits" claim is asserted in the branch where it can be wrong in both
  // directions. The override is the driver's, not the harness's, and it is removed straight after.
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.id = "journey-fit-probe";
    s.textContent = ".stx-viewport { --stx-slot-w: 80px; --stx-slot-h: 60px; }";
    document.head.appendChild(s);
  });
  await btn(page, "Fit").click();
  const small = await snapshot(page);
  const smallChosen = Number(small.zoom);
  const smallFits = (i) => ZOOM_LEVELS[i] * small.contentW <= small.clientW + 1 && ZOOM_LEVELS[i] * small.contentH <= small.clientH + 1;
  t("fit on a grid that genuinely fits lands ABOVE the floor, on the largest fitting level",
    smallChosen > 0 && smallFits(smallChosen) && (smallChosen === ZOOM_LEVELS.length - 1 || !smallFits(smallChosen + 1)),
    `chose ${smallChosen} (${pct(smallChosen)}); content ${small.contentW}×${small.contentH} in ${small.clientW}×${small.clientH}`);
  await page.evaluate(() => document.getElementById("journey-fit-probe").remove());

  await btn(page, "Reset").click();
  const afterReset = await snapshot(page);
  t("reset returns to scale 1 and scroll 0,0",
    afterReset.zoom === String(ZOOM_REST) && afterReset.scrollLeft === 0 && afterReset.scrollTop === 0,
    JSON.stringify({ zoom: afterReset.zoom, l: afterReset.scrollLeft, t: afterReset.scrollTop }));

  // ---------------------------------------------------------------- [2b] #213 · the zoom verbs BY KEYBOARD
  // AC #5's last gap: everything above activates the zoom row by CLICK. Each verb is driven here
  // by focus + Enter and asserted against its OWN live surface — and only the surfaces the module
  // actually writes (studio-canvas.mjs:121, 177, 185): zoom in/out update the aria-live="polite"
  // .stx-zoom-level readout, so asserting the readout IS the announcement assertion — there is no
  // .stx-live sentence to invent for them — while Fit and Reset also announce through .stx-live,
  // counted with countLive so a stale sentence from the click cases above cannot pass for a new one.
  await btn(page, "Zoom in").focus();
  await page.keyboard.press("Enter");
  const kzin = await snapshot(page);
  t(`#213 · Zoom in by Enter steps to ${pct(ZOOM_REST + 1)} and the aria-live readout says so`,
    kzin.zoom === String(ZOOM_REST + 1) && kzin.readout === pct(ZOOM_REST + 1), `${kzin.zoom} / ${kzin.readout}`);

  await btn(page, "Zoom out").focus();
  await page.keyboard.press("Enter");
  const kzout = await snapshot(page);
  t("#213 · Zoom out by Enter returns to 100% and the readout tracks it",
    kzout.zoom === String(ZOOM_REST) && kzout.readout === "100%", `${kzout.zoom} / ${kzout.readout}`);

  await countLive(page);
  await btn(page, "Fit").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kfit = await snapshot(page);
  const kfitSaid = await liveSeen(page);
  const kfits = (i) => ZOOM_LEVELS[i] * kfit.contentW <= kfit.clientW + 1 && ZOOM_LEVELS[i] * kfit.contentH <= kfit.clientH + 1;
  const kchosen = Number(kfit.zoom);
  t("#213 · Fit by Enter lands on a level the measured layout agrees with",
    (kfits(kchosen) || kchosen === 0) && (kchosen === ZOOM_LEVELS.length - 1 || !kfits(kchosen + 1)),
    `chose ${kchosen}; content ${kfit.contentW}×${kfit.contentH} in ${kfit.clientW}×${kfit.clientH}`);
  t("#213 · …and announces the level through .stx-live, once",
    kfitSaid.n === 1 && /^Zoom \d+ percent, fit to the canvas$/.test(kfitSaid.last), `${kfitSaid.n}: ${kfitSaid.last}`);

  await countLive(page);
  await btn(page, "Reset").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kreset = await snapshot(page);
  const kresetSaid = await liveSeen(page);
  t("#213 · Reset by Enter returns to scale 1, scroll 0,0",
    kreset.zoom === String(ZOOM_REST) && kreset.scrollLeft === 0 && kreset.scrollTop === 0,
    JSON.stringify({ zoom: kreset.zoom, l: kreset.scrollLeft, t: kreset.scrollTop }));
  t("#213 · …and announces the return through .stx-live",
    kresetSaid.n === 1 && kresetSaid.last === "Zoom 100 percent, back to the top left", `${kresetSaid.n}: ${kresetSaid.last}`);

  // ---------------------------------------------------------------- [3] the bare-wheel rule
  const box = await page.locator(SCROLL).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(200);
  const bare = await snapshot(page);
  t("a BARE wheel over the stage never zooms — it scrolls, and chains to the page",
    bare.zoom === String(ZOOM_REST), `data-zoom=${bare.zoom}`);
  t("…and it did scroll the canvas", bare.scrollTop > 0, `scrollTop=${bare.scrollTop}`);

  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");
  await page.waitForTimeout(200);
  const held2 = await snapshot(page);
  t("⌘/Ctrl + wheel DOES zoom — the same gesture a trackpad pinch delivers",
    Number(held2.zoom) > ZOOM_REST, `data-zoom=${held2.zoom}`);

  await btn(page, "Reset").click();

  // ---------------------------------------------------------------- [4] pan by pointer
  // The start point is MEASURED, not assumed. Since #205 a press on a component picks it up instead
  // of panning — correctly — so a hardcoded point drifts into a pass or a fail depending on what the
  // harness happens to have placed there. This asks the page for a point over the stage with no slot
  // under it, which is what "dragging the BACKGROUND" has always meant.
  const bg = await page.evaluate(() => {
    const scroll = document.querySelector("[data-studio-canvas] .stx-scroll");
    const r = scroll.getBoundingClientRect();
    // Clamped to the WINDOW as well as to the scroller: the scroller is taller than the viewport
    // here, and elementFromPoint answers null off-screen — read as "nothing is there", null is
    // indistinguishable from empty background, and the scan happily returns an unclickable point.
    const bottom = Math.min(r.bottom, window.innerHeight) - 20;
    for (let y = bottom; y > r.top + 20; y -= 20) {
      for (let x = Math.min(r.right, window.innerWidth) - 40; x > r.left + 40; x -= 40) {
        const hit = document.elementFromPoint(x, y);
        if (hit && scroll.contains(hit) && !hit.closest(".stx-slot")) return { x, y };
      }
    }
    return null;
  });
  t("the stage has background a drag can grab — a canvas with no empty cell cannot test panning",
    bg !== null, "every point in the scroller is covered by a slot");
  await page.mouse.move(bg.x, bg.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, bg.y, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const panned = await snapshot(page);
  t("dragging the background pans the canvas", panned.scrollLeft > 0, `scrollLeft=${panned.scrollLeft}`);
  t("and the drag leaves no is-panning class behind", !panned.panning, "");

  await btn(page, "Reset").click();

  // ---------------------------------------------------------------- [5] keyboard reachability
  // The property pan-by-scroll exists to preserve: a component in the far column is focusable and
  // the browser scrolls it into view natively. A transform-translate stage fails exactly here.
  const reached = await page.evaluate((cols) => {
    const vp = document.querySelector("[data-studio-canvas]");
    const scroll = vp.querySelector(".stx-scroll");
    const far = vp.querySelector(`.stx-slot[data-col="${cols}"]`);
    if (!far) return { ok: false, why: `no slot in column ${cols}` };
    // Scoped PAST the move handle (#205). The slot is now a wrapper whose first child is a
    // .stx-grab button, so a bare querySelector would return the handle and this check would keep
    // passing while its stated subject — "a COMPONENT in the far column is focusable" — had quietly
    // stopped being what it measured.
    const target = far.matches("button, a, input, [tabindex]") ? far
      : [...far.querySelectorAll("button, a, input, [tabindex]")].find((n) => !n.classList.contains("stx-grab"));
    (target || far).focus({ preventScroll: false });
    if (!target) far.scrollIntoView({ block: "nearest", inline: "nearest" });
    return { ok: true, scrollLeft: Math.round(scroll.scrollLeft) };
  }, MAX_COLS);
  t(`focusing a component in column ${MAX_COLS} scrolls it into view`,
    reached.ok && reached.scrollLeft > 0, JSON.stringify(reached));

  await btn(page, "Reset").click();

  // ---------------------------------------------------------------- [6] arrangement via the seam
  const driven = await viaSeam(page, 5, 3);
  t("place() through the exported getCanvas() seam writes data-col / data-row",
    driven.col === "5" && driven.row === "3", JSON.stringify(driven));
  t("…and writes no inline style doing it", driven.styled === false, JSON.stringify(driven));
  const announced = (await page.locator(LIVE).textContent()).trim();
  t("…and the live region announced the placement", /column 5, row 3/.test(announced), announced);

  // #231 L3 · the re-place above passed a NEW name, and the handle's ACCESSIBLE name has to follow
  // it. data-stx-name was written on every call and `aria-label: Move <name>` only on the first, so
  // a re-placed component announced one name and was labelled with another — the exact desync #206
  // walks into when it re-labels. Read as the two strings agreeing, not as "the write happened".
  const relabelled = await page.evaluate(() => {
    // BY NAME, not "the first slot": place() appends, so the re-placed wrapper is at the END of the
    // stage — reading the first one would assert against a component this case never touched, and
    // it passes green whether the fix is there or not.
    const slot = document.querySelector('[data-studio-canvas] .stx-slot[data-stx-name="Driven tile"]');
    if (!slot) return { error: "no wrapper carries the re-placed name" };
    return {
      name: slot.getAttribute("data-stx-name"),
      label: slot.querySelector(":scope > .stx-grab")?.getAttribute("aria-label"),
    };
  });
  t("#231 · re-placing under a new name re-labels the move handle to match it",
    relabelled.name === "Driven tile" && relabelled.label === "Move Driven tile", JSON.stringify(relabelled));

  const clamped = await viaSeam(page, MAX_COLS + 9, -4);
  t("an out-of-range slot is clamped by clampSlot, never written raw",
    clamped.col === String(MAX_COLS) && clamped.row === "1", JSON.stringify(clamped));

  // ------------------------------------------------------- [7] #231 L2 · the canvas mounted ALONE
  // The gate hole this ticket names: build-checks cannot mount a DOM and both existing driver
  // sections mount the canvas AND its verbs, so nothing could see what a canvas without verbs hands
  // a reader — one dead tab stop per component, each pointing aria-describedby at an element that
  // does not exist. Mounted on its OWN page (a second initStudioCanvas takes over the module's
  // `live`, and nothing after this may inherit that) and asserted as what a keyboard reader meets:
  // can focus land on it, and does its description resolve.
  const alone = await ctx.newPage();
  await alone.goto(`${BASE}/studio.html`, { waitUntil: "load" });
  await alone.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
  const lone = await alone.evaluate(() => import("/system/studio-canvas.mjs").then((m) => {
    // A HOST holding the viewport, because initStudioCanvas queries WITHIN the root it is given —
    // an element never matches its own querySelector.
    const host = document.createElement("div");
    const root = document.createElement("div");
    root.setAttribute("data-studio-canvas", "");
    host.appendChild(root);
    document.body.appendChild(host);
    const canvas = m.initStudioCanvas(host);
    canvas.place(document.createElement("p"), { col: 1, row: 1, name: "Lonely" });
    const grab = root.querySelector(".stx-grab");
    grab.focus();
    const describedBy = grab.getAttribute("aria-describedby");
    return {
      focused: document.activeElement === grab,
      describedBy,
      resolves: describedBy ? Boolean(document.getElementById(describedBy)) : null,
      label: grab.getAttribute("aria-label"),
      root: "ok",
    };
  }));
  t("#231 · a canvas mounted WITHOUT the verbs hands out no dead tab stop",
    lone.focused === false, JSON.stringify(lone));
  t("#231 · …and no aria-describedby pointing at instructions that were never created",
    lone.describedBy === null, JSON.stringify(lone));
  t("#231 · …while still naming the component it would move", lone.label === "Move Lonely", JSON.stringify(lone));
  // …and mounting the verbs is what arms it. Same page, same canvas: the handle a reader could not
  // reach a moment ago is now focusable AND described by the element that mount just created.
  const armedNow = await alone.evaluate(async () => {
    // Both handles through their own exported seams — the scratch canvas is the module's `live`
    // because it mounted last, which is exactly what getCanvas() answers with.
    const [canvasMod, verbs, busMod] = await Promise.all([
      import("/system/studio-canvas.mjs"), import("/system/studio-verbs.mjs"), import("/system/action-bus.mjs"),
    ]);
    const canvas = canvasMod.getCanvas();
    verbs.mountCanvasVerbs(canvas, { bus: busMod.createBus() });
    const grab = canvas.stage.querySelector(".stx-grab");
    grab.focus();
    const describedBy = grab.getAttribute("aria-describedby");
    return {
      focused: document.activeElement === grab,
      describedBy,
      resolves: describedBy ? Boolean(document.getElementById(describedBy)) : null,
    };
  });
  t("#231 · mounting the verbs arms every handle already on the stage",
    armedNow.focused === true, JSON.stringify(armedNow));
  t("#231 · …and describes it through the instructions element that mount created",
    armedNow.resolves === true, JSON.stringify(armedNow));
  await alone.close();

  await ctx.close();

  // ================================================================ #205 · the move verbs
  // Everything below needs a running page and a real pointer, and none of it is reachable from
  // build-checks group 13 — which is why group 13's opening comment names this section as the owner
  // of the single-consumer invariant AC #1 actually turns on.
  //
  // ON ITS OWN PAGE, deliberately. Section [6] drives place() through the seam and leaves the first
  // slot parked in a clamped corner, so a section that assumed the at-rest arrangement would be
  // asserting against whatever the previous one happened to leave behind. `page` is shadowed inside
  // this block so the assertions read the same as every other section's.
  //
  // THE FIXTURE, and why it is the one chosen. The harness fills rows 1–3 and leaves rows 4–8 empty,
  // so column 1 gives a free run downward and every target below is a genuinely empty cell. Where a
  // check needs a peer in the way, it says so.
  {
  const mctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await open(mctx);
  const TARGET = "s1"; // the metric-tile at column 1, row 1

  // BRING THE CANVAS TO THE TOP OF THE WINDOW before any pointer work. The harness has a lede and a
  // capability strip above the stage, so at page-scroll 0 the scroller starts around y=474 and the
  // lower rows sit past the window's bottom edge — a drop point the mouse cannot be moved to. It
  // only ever passed on chromium because that engine had incidentally scrolled the page during the
  // sections above; firefox and webkit had not, and every pointer assertion here failed on both.
  await page.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);

  const startArr = await arrangement(page);
  t("the verbs mounted and the arrangement reads back through the getVerbs() seam",
    startArr && !startArr.error && startArr[TARGET] && startArr[TARGET].col === 1 && startArr[TARGET].row === 1,
    JSON.stringify(startArr?.[TARGET] ?? startArr));
  t("every placed component carries a stable id — the snapshot is keyed by something that survives re-slotting",
    Object.keys(startArr).length === rest.slotCount,
    `${Object.keys(startArr).length} ids for ${rest.slotCount} slots`);
  t("every component has a move handle — the unambiguous keyboard target every component type needs",
    await page.locator(`${VIEWPORT} .stx-slot .stx-grab`).count() === rest.slotCount, "");

  // ---------------------------------------------------------------- [AC #1] three sources, one result
  // Pointer, keyboard and an injected source:"agent" action, each moving the SAME node to the SAME
  // cell, compared as RESULTING MODEL STATE. Never "an action was emitted", which would pass with no
  // consumer at all (proto-journey.mjs's discipline, and its stated reason).
  // ROW 4, and the row number is load-bearing rather than arbitrary: at zoom 1 scrolled 0,0 the
  // scroller shows rows 1–4, and a drop point below the WINDOW is a gesture that never starts — the
  // pointer cannot press down on a node it cannot reach. Rows 2 and 3 are OCCUPIED in column 1, so
  // one ArrowDown skips both and lands here, which is what makes the keyboard path reach the same
  // cell the drag does.
  const GOAL = { col: 1, row: 4 };
  const ARROWS_TO_GOAL = 1;
  const goalPoint = await cellPoint(page, GOAL.col, GOAL.row);

  await dragTo(page, TARGET, goalPoint);
  const byPointer = await arrangement(page);
  t(`AC #1 · a pointer drag moved ${TARGET} to column ${GOAL.col}, row ${GOAL.row}`,
    byPointer[TARGET]?.col === GOAL.col && byPointer[TARGET]?.row === GOAL.row, JSON.stringify(byPointer[TARGET]));

  await undoAll(page);
  t("…and undo put it back, so the next source starts from the same place",
    (await arrangement(page))[TARGET]?.row === 1, JSON.stringify((await arrangement(page))[TARGET]));

  // Keyboard only: focus the handle, Enter, three ArrowDowns (rows 2 and 3 are OCCUPIED, so the
  // resolver skips them and the three presses land on 4, 5, 6), Enter.
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < ARROWS_TO_GOAL; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const byKeyboard = await arrangement(page);
  t("AC #1 · the keyboard path produces the IDENTICAL arrangement, deep-compared",
    JSON.stringify(byKeyboard) === JSON.stringify(byPointer),
    `keyboard ${JSON.stringify(byKeyboard[TARGET])} vs pointer ${JSON.stringify(byPointer[TARGET])}`);

  // ---------------------------------------------------------------- [AC #4] the bus is the drive path
  await busRecord(page);
  await busClear(page);
  await undoAll(page);
  await busClear(page);
  await dragTo(page, TARGET, goalPoint);
  const pointerActions = await busSeen(page);
  const pointerMoves = pointerActions.filter((a) => a.type === "ui.move");
  t("AC #4 · a pointer gesture emits EXACTLY ONE ui.move, however many slots it crossed",
    pointerMoves.length === 1, JSON.stringify(pointerActions));
  t("AC #4 · …with an honest source", pointerMoves[0]?.source === "pointer", pointerMoves[0]?.source);
  // #232 · the target's two names, read against what the wrapper actually carries. `component` is
  // the VOCABULARY SHAPE everywhere else on this bus (agentic-renderer, agentic-study, bus-toggles,
  // peak) and this emitter used to put the display label there. Asserted as "the shape, and NOT the
  // label" — equality with the wrapper alone would pass for an emitter that sent the label if the
  // two ever coincided.
  const moved = await page.evaluate((id) => {
    const n = document.querySelector(`.stx-slot[data-stx-id="${id}"]`);
    return { shape: n.getAttribute("data-stx-component"), name: n.getAttribute("data-stx-name") };
  }, TARGET);
  t("#232 · ui.move carries the VOCABULARY SHAPE under target.component",
    moved.shape && pointerMoves[0]?.component === moved.shape && pointerMoves[0]?.component !== moved.name,
    `${JSON.stringify(pointerMoves[0])} vs wrapper ${JSON.stringify(moved)}`);
  t("#232 · …and the display label under target.label, its own key",
    pointerMoves[0]?.label === moved.name, `${JSON.stringify(pointerMoves[0])} vs wrapper ${JSON.stringify(moved)}`);

  await undoAll(page);
  await busClear(page);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < ARROWS_TO_GOAL; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kbMoves = (await busSeen(page)).filter((a) => a.type === "ui.move");
  t("AC #4 · a keyboard gesture emits exactly one ui.move too — an arrow step is a preview, not a verb",
    kbMoves.length === 1, JSON.stringify(await busSeen(page)));
  t("AC #4 · …with source \"keyboard\"", kbMoves[0]?.source === "keyboard", kbMoves[0]?.source);

  // A click that moved nothing is not a move. Pressed and released at the WRAPPER CENTRE, not on
  // .stx-grab — so `fromHandle` is false, pointerup takes the drop("pointer") branch and the gesture
  // ends here. This case is therefore NOT the pick-up half of the single-pointer path (SC 2.5.7);
  // it is the body-press no-op. The single-pointer path has its own section further down, which
  // presses the HANDLE and completes the whole click-move-click gesture (#229).
  await busClear(page);
  const depthBefore = await historyDepth(page);
  const hb = await nodeBox(page, TARGET);
  await page.mouse.move((hb.left + hb.right) / 2, (hb.top + hb.bottom) / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(120);
  t("AC #4 · a press that moved nothing emits NO ui.move and writes no history entry",
    (await busSeen(page)).filter((a) => a.type === "ui.move").length === 0
      && (await historyDepth(page)) === depthBefore,
    `${JSON.stringify(await busSeen(page))} depth ${depthBefore} → ${await historyDepth(page)}`);
  // A NO-OP on today's code — the body press above already ended its gesture — and kept as the
  // cheap guarantee that the next case starts with nothing picked up whichever branch that press
  // took. Not evidence of a sticky gesture; do not read it as one.
  await page.keyboard.press("Escape");

  // ---------------------------------------------------------------- [AC #2] announcements, counted per path
  // Counted SEPARATELY and EXACTLY, because the two paths announce differently ON PURPOSE. A pointer
  // preview needs no announcement — the reader is watching their own hand. A keyboard preview does:
  // a five-arrow move with one announcement at the end leaves the reader blind for four presses,
  // unable to tell a step blocked by a peer from one blocked by the grid edge.
  //
  // If the keyboard count below goes red, the fix is the COUNT, never deleting the per-step
  // announcement. Both a missing and a duplicated announcement fail here, which is the whole point.
  await undoAll(page);
  await countLive(page);
  await dragTo(page, TARGET, goalPoint);
  const pointerSaid = await liveSeen(page);
  t("AC #2 · a POINTER gesture announces exactly ONCE, however many slots it crossed",
    pointerSaid.n === 1, `${pointerSaid.n} announcement(s): ${pointerSaid.last}`);
  t("AC #2 · …and that one announcement names the slot it landed in",
    new RegExp(`moved to column ${GOAL.col}, row ${GOAL.row}`).test(pointerSaid.last), pointerSaid.last);

  await undoAll(page);
  // Three ArrowDowns, each landing on a distinct free row: rows 2 and 3 are occupied, so the presses
  // land on 4, 5 and 6. The keyboard needs no on-screen drop point, so this can go past row 4.
  const N = 3;
  const KB_LANDS = { col: 1, row: 6 };
  await countLive(page);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < N; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kbSaid = await liveSeen(page);
  t(`AC #2 · a KEYBOARD gesture announces once per discrete keypress — pick-up + ${N} arrows + drop = ${N + 2}`,
    kbSaid.n === N + 2, `${kbSaid.n} announcement(s), expected ${N + 2}; last: ${kbSaid.last}`);
  t("AC #2 · …and the FINAL announcement is the drop's, naming the landed slot",
    new RegExp(`moved to column ${KB_LANDS.col}, row ${KB_LANDS.row}`).test(kbSaid.last), kbSaid.last);

  // A BLOCKED press still announces, and still counts. Without this a keyboard user at the grid edge
  // gets silence and cannot tell a dead key from a refused move — and the N + 2 count above would
  // quietly depend on which N was chosen.
  await undoAll(page);
  await countLive(page);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");   // already on row 1 — the grid edge
  await page.keyboard.press("ArrowLeft"); // already on column 1 — the other edge
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  const blocked = await liveSeen(page);
  t("AC #2 · two BLOCKED arrow presses still announce, one each — silence at the edge is not feedback",
    blocked.n === 4, `${blocked.n} announcement(s), expected 4 (pick-up + 2 blocked + cancel); last: ${blocked.last}`);
  t("…and a blocked press says so rather than repeating the slot as if it had moved",
    /Blocked/i.test(blocked.last) || /Cancelled/i.test(blocked.last), blocked.last);

  // ---------------------------------------------------------------- [AC #5] Escape restores, and emits nothing
  for (const [label, gesture] of [
    ["pointer", async () => {
      const b0 = await nodeBox(page, TARGET);
      await page.mouse.move((b0.left + b0.right) / 2, (b0.top + b0.bottom) / 2);
      await page.mouse.down();
      await page.mouse.move(goalPoint.x, goalPoint.y, { steps: 12 });
      await page.keyboard.press("Escape");
      await page.mouse.up();
    }],
    ["keyboard", async () => {
      await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
    }],
  ]) {
    await undoAll(page);
    const origin = (await arrangement(page))[TARGET];
    const depth0 = await historyDepth(page);
    await busClear(page);
    await gesture();
    await page.waitForTimeout(150);
    const after = (await arrangement(page))[TARGET];
    t(`AC #5 · Escape mid-${label}-gesture restores the pre-drag slot`,
      after.col === origin.col && after.row === origin.row,
      `${JSON.stringify(origin)} → ${JSON.stringify(after)}`);
    t(`AC #5 · …and emits no ui.move and adds no history entry (${label})`,
      (await busSeen(page)).filter((a) => a.type === "ui.move").length === 0
        && (await historyDepth(page)) === depth0,
      `${JSON.stringify(await busSeen(page))} depth ${depth0} → ${await historyDepth(page)}`);
  }
  // Escape with nothing picked up must not throw — the no-console-errors assertion at the end is
  // what would catch it, and this is the press that reaches it.
  await page.keyboard.press("Escape");

  // ---------------------------------------------------------------- [AC #3] undo/redo round-trip
  await dragTo(page, TARGET, goalPoint);
  const beforeUndo = await arrangement(page);
  await undoAll(page);
  const undone = await arrangement(page);
  await btn(page, "Redo").click();
  await page.waitForTimeout(250);
  const redone = await arrangement(page);
  t("AC #3 · undo actually changed the arrangement — a round-trip over a no-op cannot fail",
    JSON.stringify(undone) !== JSON.stringify(beforeUndo), JSON.stringify(undone[TARGET]));
  t("AC #3 · undo then redo returns the arrangement deep-equal, read through the seam",
    JSON.stringify(redone) === JSON.stringify(beforeUndo),
    `${JSON.stringify(redone[TARGET])} vs ${JSON.stringify(beforeUndo[TARGET])}`);
  t("AC #3 · the keyboard shortcut drives the same verb — ⌘/Ctrl+Z emits ui.undo",
    await (async () => {
      await busClear(page);
      await page.locator(SCROLL).focus();
      await page.keyboard.press(engineName === "webkit" ? "Meta+z" : "Control+z");
      await page.waitForTimeout(250);
      const seen = await busSeen(page);
      return seen.some((a) => a.type === "ui.undo") && JSON.stringify(await arrangement(page)) === JSON.stringify(undone);
    })(), JSON.stringify(await busSeen(page)));

  // ---------------------------------------------------------------- occupancy
  // Dragged AT an occupied peer, the node keeps the last free slot it crossed and never lands on it.
  // Asserted as "no two slots share a cell", which is the sentence "moved to column 2, row 1" has to
  // be able to keep.
  await undoAll(page);
  await btn(page, "Reset").click();
  await page.waitForTimeout(150);
  const occupiedPoint = await cellPoint(page, 3, 2); // a cell the harness genuinely fills
  await dragTo(page, TARGET, occupiedPoint);
  const afterOcc = await arrangement(page);
  const cells = Object.values(afterOcc).map((s) => `${s.col},${s.row}`);
  t("occupancy · after dragging AT an occupied cell no two components share one",
    new Set(cells).size === cells.length,
    `${cells.length - new Set(cells).size} collision(s)`);
  t("occupancy · …and the dragged node did not land on the peer's cell",
    !(afterOcc[TARGET].col === 3 && afterOcc[TARGET].row === 2), JSON.stringify(afterOcc[TARGET]));

  // ---------------------------------------------------------------- the hit-test, in three conditions
  // THE ASSERTION SHAPE, and it is deliberately independent of the module's arithmetic: drop at a
  // measured point, then assert that point lies inside the landed node's OWN measured box. A driver
  // that re-derived the expected slot from getComputedStyle would be re-running the implementation
  // and would agree with its bugs.
  //
  // RUN THREE TIMES, because each condition is the SOLE detector of a different missing term and
  // each looks correct in the other two. A single at-rest run passes with BOTH terms gone — the
  // check-that-cannot-fail shape arriving in the choice of fixture rather than in the assertion.
  // `from` is the cell whose occupant gets dragged. It is a PARAMETER because a condition can move
  // the at-rest origin out of the window: pan far enough right and column 1 is off-screen to the
  // left, and a node the pointer cannot press down on produces a "drag did nothing" failure that
  // looks exactly like the missing-term bug this case exists to detect.
  const hitCase = async (label, prepare, from, cell) => {
    // Back to the loaded arrangement FIRST. Each case leaves the node wherever it dropped it, and a
    // node parked below the window cannot be pressed down on — the next case would then fail for a
    // reason with nothing to do with the term it exists to catch.
    await undoAll(page);
    await btn(page, "Reset").click();
    await page.waitForTimeout(200);
    await prepare();
    // #196: hover/pointer probes racing a smooth scroll produced a false bug once already. Wait for
    // the scroll offset to stop moving before any geometry is read.
    let last = -1;
    for (let i = 0; i < 20; i += 1) {
      const now = await page.evaluate(() => {
        const s = document.querySelector("[data-studio-canvas] .stx-scroll");
        return `${Math.round(s.scrollLeft)},${Math.round(s.scrollTop)}`;
      });
      if (now === last) break;
      last = now;
      await page.waitForTimeout(60);
    }
    const id = await idAt(page, from.col, from.row);
    const point = await cellPoint(page, cell.col, cell.row);
    const startBox = await nodeBox(page, id);
    const view = await page.locator(SCROLL).boundingBox();
    // Stated rather than assumed, and asserted against the SCROLLER rather than the window: a
    // gesture with either end outside the visible canvas cannot measure what this case claims to,
    // and it fails as "the node did not move" — indistinguishable from the missing-term bug the
    // case exists to detect. A silent pass would be the worst outcome available; a loud
    // fixture failure is the second worst and is what this is.
    // Intersected with the WINDOW: the scroller is taller than the viewport, so its own box is not
    // the reachable region — a point inside it but below the window is one the mouse cannot visit.
    const vp = page.viewportSize();
    const inView = (x, y) => x > view.x && x < Math.min(view.x + view.width, vp.width)
      && y > view.y && y < Math.min(view.y + view.height, vp.height);
    const reachable = Boolean(id && startBox
      && inView((startBox.left + startBox.right) / 2, (startBox.top + startBox.bottom) / 2)
      && inView(point.x, point.y));
    t(`hit-test · ${label} · both ends of the gesture are inside the visible canvas`, reachable,
      `node ${id} at ${JSON.stringify(startBox)}, point ${Math.round(point?.x)},${Math.round(point?.y)}, canvas ${JSON.stringify(view)}`);
    await dragTo(page, id, point);
    const landed = await nodeBox(page, id);
    const inside = point.x >= landed.left && point.x <= landed.right
      && point.y >= landed.top && point.y <= landed.bottom;
    t(`hit-test · ${label} · the node lands under the point it was dropped on`,
      inside, `point ${Math.round(point.x)},${Math.round(point.y)} vs box ${JSON.stringify(landed)} — slot ${JSON.stringify((await arrangement(page))[id])}`);
  };

  await hitCase("at rest (zoom 1, scrolled 0,0)", async () => {}, { col: 1, row: 1 }, { col: 3, row: 4 });
  // SCROLLED — the sole detector of a missing `+ scroll.scrollLeft/scrollTop` in the coordinate
  // chain. At rest that term is zero, so the case above passes without it.
  // The offsets are larger than HALF A TRACK in both axes on purpose: a smaller pan would land the
  // node in the right cell even with the term dropped, and the case would pass with the bug in.
  await hitCase("after panning", async () => {
    await page.evaluate(() => {
      const s = document.querySelector("[data-studio-canvas] .stx-scroll");
      s.scrollLeft = 260;
      s.scrollTop = 170;
    });
    // Row 2, not row 1: a 170px downward pan scrolls a 140px-tall row 1 entirely out of view. And
    // column 3 rather than 5, because column 5 of row 2 holds a plant-card, which renders as a real
    // <a> and so is deliberately handle-only (see the body-drag guard's own check below).
  }, { col: 3, row: 2 }, { col: 6, row: 4 });
  // ZOOM ≠ 1 — the sole detector of a missing `÷ ZOOM_LEVELS[level]`. At scale 1 the divide is
  // identity, so both cases above pass without it. Zoom OUT rather than in: at 1.5× the empty rows
  // sit below the scroller's 640px box and the drop point would be off-screen, which would make this
  // case fail for a reason that has nothing to do with the term it exists to catch.
  await hitCase("at zoom ≠ 1", async () => {
    await btn(page, "Zoom out").click();
    await page.waitForTimeout(200);
  }, { col: 1, row: 1 }, { col: 4, row: 5 });

  // ---------------------------------------------------------------- R3 · the FLIP travels correctly at zoom ≠ 1
  // DO NOT READ THE ANIMATION'S KEYFRAMES. They are the literal the module authored, so comparing
  // them to a re-derivation of dx from the same rects compares a computed value against itself —
  // both sides lose the scale divide together and the check passes with the bug in. That is this
  // register's own preamble arriving inside a detector.
  //
  // Read what the animation DOES. Seek it to time 0 and measure the node: a FLIP starts by putting
  // the element back exactly where the reader last saw it, so at t=0 its box must equal the box it
  // had before the undo. getBoundingClientRect deltas are POST-transform while a translate() on the
  // child applies in the child's UNSCALED local space, so without `÷ ZOOM_LEVELS[level]` the node
  // starts only `scale` of the way back — at 0.75 that is a quarter of the travel missing, and it
  // looks perfect at 100%, which is where it would be tested first.
  await undoAll(page);
  await btn(page, "Reset").click();
  await btn(page, "Zoom out").click(); // scale 0.75 — any level ≠ 1 makes the divide load-bearing
  await page.waitForTimeout(250);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  // The undo is emitted and the animation sampled INSIDE one evaluate: the travel is 160ms, and a
  // round trip back to node would routinely outlast it.
  const flip = await page.evaluate(async (id) => {
    const n = document.querySelector(`.stx-slot[data-stx-id="${id}"]`);
    const rect = () => { const r = n.getBoundingClientRect(); return { l: r.left, t: r.top }; };
    const before = rect();
    const m = await import("/system/studio-verbs.mjs");
    m.getVerbs().bus.emit({ type: "ui.undo", source: "agent" });
    const anims = n.getAnimations();
    if (!anims.length) return { error: "the undo ran no animation on the node — nothing to sample" };
    const a = anims[0];
    a.pause();
    a.currentTime = 0;
    const at0 = rect();
    a.currentTime = Number(a.effect.getTiming().duration) || 160;
    const at1 = rect();
    a.finish();
    return { before, at0, at1 };
  }, TARGET);
  await page.waitForTimeout(250);
  const near = (a, b) => Math.abs(a - b) <= 2; // sub-pixel layout rounding, not a tolerance for a bug
  t("R3 · the undo runs a travel animation on the moved node",
    !flip.error, flip.error || "");
  t("R3 · …and at time 0 it sits exactly where the reader last saw it — the scale divide is applied",
    !flip.error && near(flip.at0.l, flip.before.l) && near(flip.at0.t, flip.before.t),
    JSON.stringify(flip));
  t("R3 · …and it genuinely travels, so the sample above is not of a zero-length animation",
    !flip.error && (!near(flip.at1.l, flip.at0.l) || !near(flip.at1.t, flip.at0.t)),
    JSON.stringify(flip));
  await btn(page, "Reset").click();
  await page.waitForTimeout(200);

  // ---------------------------------------------------------------- a clean drop must STICK (R4)
  // lostpointercapture also fires on a normal release on some engines, so an unguarded cancel path
  // runs after EVERY clean drop and silently undoes it. Its whole symptom is "drag does nothing",
  // which no other assertion here distinguishes from a drag that never started.
  await undoAll(page);
  await btn(page, "Reset").click();
  await page.waitForTimeout(200);
  const stickPoint = await cellPoint(page, 2, 4);
  await dragTo(page, TARGET, stickPoint);
  await page.waitForTimeout(200);
  const stuck = (await arrangement(page))[TARGET];
  t("R4 · after a normal pointerup the node is in the TARGET slot, not back at its origin",
    stuck.row === 4 && stuck.col === 2, JSON.stringify(stuck));

  // ---------------------------------------------------------------- the body-drag guard
  // A component with a control of its own keeps its own events: plant-card renders a real <a>, and a
  // press on it must not start a drag. The HANDLE still moves it, so nothing is unreachable — which
  // is the whole reason the wrapper carries one.
  await undoAll(page);
  await btn(page, "Reset").click();
  await page.waitForTimeout(200);
  const linkId = await page.evaluate(() => [...document.querySelectorAll(".stx-slot")]
    .find((n) => n.querySelector("a"))?.getAttribute("data-stx-id") ?? null);
  t("the harness places a component with a control of its own — otherwise the guard below is untested",
    linkId !== null, "no slot on the stage holds an <a>");
  const linkBefore = (await arrangement(page))[linkId];
  const lb = await nodeBox(page, linkId);
  await page.mouse.move((lb.left + lb.right) / 2, (lb.top + lb.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move((lb.left + lb.right) / 2, (lb.top + lb.bottom) / 2 + 320, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const linkAfter = (await arrangement(page))[linkId];
  t("a body-drag on a component that owns a control does NOT move it — the component keeps its events",
    linkAfter.col === linkBefore.col && linkAfter.row === linkBefore.row,
    `${JSON.stringify(linkBefore)} → ${JSON.stringify(linkAfter)}`);

  // …and the same component IS movable by its handle, so the guard costs nothing in reach. Moved by
  // the keyboard, which is the path that never has to argue about what is under the cursor.
  await page.locator(`.stx-slot[data-stx-id="${linkId}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const linkMoved = (await arrangement(page))[linkId];
  t("…and its move HANDLE still moves it, so the guard costs no reach",
    linkMoved.row !== linkBefore.row, `${JSON.stringify(linkBefore)} → ${JSON.stringify(linkMoved)}`);

  // ---------------------------------------------------------------- [SC 2.5.7] the single-pointer path, COMPLETED (#229)
  // THE CRITERION THE MODULE HEADER IS MOST CAREFUL ABOUT, and until #229 the one criterion nothing
  // ran. WCAG 2.2 SC 2.5.7 Dragging Movements needs a path with NO dragging movement in it: press
  // and release on the handle to pick up, move the pointer with no button held, press and release
  // again to drop. The body-press case above is NOT this — it presses at the wrapper centre, so
  // `fromHandle` is false and pointerup takes the drop branch.
  //
  // Driven against the drag path as its control: the same node, the same destination cell, so a
  // pass means the alternative genuinely reaches what the drag reaches rather than merely not
  // throwing. Asserted as RESULTING ARRANGEMENT plus exactly one ui.move, matching AC #4's shape.
  await undoAll(page);
  const stickyFrom = (await arrangement(page))[TARGET];
  const stickyGoal = { col: 3, row: 4 };
  const stickyPoint = await cellPoint(page, stickyGoal.col, stickyGoal.row);
  await busClear(page);
  await countLive(page);

  const grab = await page.evaluate((i) => {
    const g = document.querySelector(`.stx-slot[data-stx-id="${i}"] .stx-grab`).getBoundingClientRect();
    return { x: (g.left + g.right) / 2, y: (g.top + g.bottom) / 2 };
  }, TARGET);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.up();                                  // click 1 — PICK UP, no travel
  await page.waitForTimeout(80);
  const picked = await page.evaluate(() => import("/system/studio-verbs.mjs")
    .then((m) => { const g = m.getVerbs().gesture; return g && { sticky: g.sticky, fromHandle: g.fromHandle }; }));
  t("SC 2.5.7 · a click on the HANDLE picks the component up and LEAVES it up — no button is held down",
    picked?.sticky === true, JSON.stringify(picked));

  await page.mouse.move(stickyPoint.x, stickyPoint.y, { steps: 18 }); // travel with NO button held
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.mouse.up();                                  // click 2 — DROP
  await page.waitForTimeout(150);

  const stickyArr = (await arrangement(page))[TARGET];
  t(`SC 2.5.7 · …and a second click drops it in column ${stickyGoal.col}, row ${stickyGoal.row} — the drag's destination, reached with no dragging movement`,
    stickyArr.col === stickyGoal.col && stickyArr.row === stickyGoal.row,
    `${JSON.stringify(stickyFrom)} → ${JSON.stringify(stickyArr)}`);
  const stickyMoves = (await busSeen(page)).filter((a) => a.type === "ui.move");
  t("SC 2.5.7 · …emitting exactly ONE ui.move, like the drag and the keyboard paths",
    stickyMoves.length === 1, JSON.stringify(await busSeen(page)));
  t("SC 2.5.7 · …with source \"pointer\" — the same source, because it IS the pointer path",
    stickyMoves[0]?.source === "pointer", stickyMoves[0]?.source);
  t("SC 2.5.7 · …and the gesture is over, so the next press starts cleanly",
    (await page.evaluate(() => import("/system/studio-verbs.mjs").then((m) => m.getVerbs().gesture))) === null, "");

  // ---------------------------------------------------------------- [#230] a component placed AFTER mount
  // studio-canvas.mjs's place() is a NORMAL post-mount call — it is the stated justification for
  // the verbs delegating their listeners on `stage`. But the history is seeded ONCE, at mount, so
  // before #230 a node placed afterwards was in no earlier entry: undo consumed a step, the node
  // did not move, Undo greyed out and the reader was left with a phantom.
  //
  // DRIVEN AS A REAL POINTER DRAG, and that is the whole discriminator. A gesture is a PREVIEW —
  // both input paths write slots live and emit at the drop — so a fix that adopts the node only in
  // the bus consumer records its DESTINATION as its origin and the phantom survives for both paths
  // a human uses. An injected ui.move case passes against that broken design, because nothing
  // previewed. Both are run below; the pointer one is the one that fails if the pick-up call site
  // is removed.
  await undoAll(page);
  // EMPTY *AND* REACHABLE BY THE POINTER, which are two different constraints. The harness fills
  // rows 1–2 across all 12 columns and row 3 to column 7, so the empty cells nearest to hand are in
  // row 3's tail — but at this viewport column 9 sits at x≈2025, well outside the 1440px window,
  // and the mouse cannot be moved to a point off-screen. Row 4 is empty for its whole width and its
  // low columns are the ones every other pointer case here has proven reachable.
  const LATE_FROM = { col: 2, row: 4 };
  const LATE_TO = { col: 3, row: 4 };
  const lateId = await page.evaluate(async ([c, r]) => {
    const canvas = (await import("/system/studio-canvas.mjs")).getCanvas();
    const node = document.createElement("div");
    node.className = "card";
    node.textContent = "Placed after the verbs mounted";
    canvas.place(node, { col: c, row: r, name: "Late arrival" });
    return node.closest(".stx-slot")?.getAttribute("data-stx-id") ?? null;
  }, [LATE_FROM.col, LATE_FROM.row]);
  t("#230 · the harness can place a component AFTER the verbs mounted — otherwise the case below is untested",
    lateId !== null && (await arrangement(page))[lateId]?.col === LATE_FROM.col,
    `${lateId} at ${JSON.stringify((await arrangement(page))[lateId])}`);

  await dragTo(page, lateId, await cellPoint(page, LATE_TO.col, LATE_TO.row));
  const lateMoved = (await arrangement(page))[lateId];
  t(`#230 · a POINTER drag moves it to column ${LATE_TO.col}, row ${LATE_TO.row}`,
    lateMoved.col === LATE_TO.col && lateMoved.row === LATE_TO.row, JSON.stringify(lateMoved));

  await countLive(page);
  await btn(page, "Undo").click();
  await page.waitForTimeout(300);
  const lateUndone = (await arrangement(page))[lateId];
  t("#230 · …and UNDO puts it back where it was placed, rather than consuming a step and moving nothing",
    lateUndone.col === LATE_FROM.col && lateUndone.row === LATE_FROM.row,
    `${JSON.stringify(lateMoved)} → ${JSON.stringify(lateUndone)}`);
  t("#230 · …announcing the restore by name, never \"Nothing to undo.\" on a step it just consumed",
    /Late arrival/.test((await liveSeen(page)).last || ""), (await liveSeen(page)).last);

  // THE OTHER CALL SITE, and it needs its OWN node. The consumer's adopt is the one #209's replay
  // driver depends on — an injected move has no gesture behind it, so nothing picked up and nothing
  // adopted on the way in. Re-using the node above cannot detect it: by then the pick-up has
  // already taught the stack that id, and removing the consumer's adopt leaves the whole run green.
  // Measured, not reasoned about — that mutation passed 88/88 until this case existed.
  //
  // Off-screen cells on purpose: injection needs no pointer, so this is free of the reachability
  // constraint the drag above is bounded by.
  const INJ_FROM = { col: 9, row: 5 };
  const INJ_TO = { col: 10, row: 5 };
  const injId = await page.evaluate(async ([c, r]) => {
    const canvas = (await import("/system/studio-canvas.mjs")).getCanvas();
    const node = document.createElement("div");
    node.className = "card";
    node.textContent = "Placed after the verbs mounted, moved only by an injected action";
    canvas.place(node, { col: c, row: r, name: "Late agent arrival" });
    return node.closest(".stx-slot")?.getAttribute("data-stx-id") ?? null;
  }, [INJ_FROM.col, INJ_FROM.row]);
  await inject(page, { type: "ui.move", source: "agent", target: { component: "card", id: injId }, params: INJ_TO });
  await page.waitForTimeout(150);
  t("#230 · a post-mount component moved ONLY by an injected action moves — no gesture, no pick-up",
    (await arrangement(page))[injId]?.col === INJ_TO.col, JSON.stringify((await arrangement(page))[injId]));
  await btn(page, "Undo").click();
  await page.waitForTimeout(300);
  const injUndone = (await arrangement(page))[injId];
  t("#230 · …and undo returns IT to where it was placed too — the consumer adopts what no pick-up could have",
    injUndone.col === INJ_FROM.col && injUndone.row === INJ_FROM.row, JSON.stringify(injUndone));

  // Leave the stage as the sections below expect to find it.
  await page.evaluate((ids) => { for (const i of ids) document.querySelector(`.stx-slot[data-stx-id="${i}"]`)?.remove(); },
    [lateId, injId]);

  // ---------------------------------------------------------------- refusals go to the live region
  await countLive(page);
  const beforeRefusal = await arrangement(page);
  await inject(page, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: "no-such-node" }, params: { col: 2, row: 2 } });
  await page.waitForTimeout(120);
  const refused = await liveSeen(page);
  t("a ui.move for an id that is not on the stage refuses in the LIVE REGION and leaves the DOM untouched",
    refused.n === 1 && /Refused/i.test(refused.last)
      && JSON.stringify(await arrangement(page)) === JSON.stringify(beforeRefusal),
    `${refused.n} announcement(s): ${refused.last}`);

  // Hostile params never reach an attribute — clampSlot is the one definition of "on the grid" and
  // the consumer applies it before anything is written.
  await inject(page, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: TARGET }, params: { col: 1e9, row: NaN } });
  await page.waitForTimeout(120);
  const clampedMove = (await arrangement(page))[TARGET];
  t("a ui.move with a hostile slot is clampSlot'd, never written raw",
    clampedMove.col === MAX_COLS && clampedMove.row === 1, JSON.stringify(clampedMove));

  // ---------------------------------------------------------------- still no inline styles
  await undoAll(page);
  await btn(page, "Redo").click();
  await page.waitForTimeout(250);
  const afterMoves = await snapshot(page);
  t("R11 · no `style` attribute after a drag, an undo and a redo — the FLIP is element.animate(), which never touches .style",
    afterMoves.inlineStyled === 0, `${afterMoves.inlineStyled} element(s) carry one`);

  await mctx.close();

  // ---------------------------------------------------------------- AC #1's third source, on a FRESH page
  // THE ONE ASSERTION CI STRUCTURALLY CANNOT MAKE, and the reason group 13 names this section as the
  // single-consumer invariant's owner. Run with NO gesture performed first, so the only thing that
  // could have moved this node is the bus consumer. A mover that applied moves directly and merely
  // emitted for observers would pass the pointer and keyboard cases above and fail ONLY here.
  //
  // The target is a FREE cell on purpose: the consumer does not consult occupancy (the gesture
  // enforces it during preview), so an injected move to an occupied cell would legitimately stack
  // two components. That is the caller's business, and stating it here is cheaper than an assertion
  // that passes only because the case was never tried.
  const fctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const fresh = await open(fctx);
  await inject(fresh, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: TARGET }, params: GOAL });
  await fresh.waitForTimeout(150);
  const byAgent = await arrangement(fresh);
  t("AC #1 · an injected source:\"agent\" action on a FRESH page moves the same node through the same consumer",
    JSON.stringify(byAgent) === JSON.stringify(byPointer),
    `agent ${JSON.stringify(byAgent[TARGET])} vs pointer ${JSON.stringify(byPointer[TARGET])}`);
  t("AC #1 · …and it announced as a move, like the other two sources",
    /moved to column/.test((await fresh.locator(LIVE).textContent()).trim()),
    (await fresh.locator(LIVE).textContent()).trim());
  await fctx.close();
  }

  // ---------------------------------------------------------------- [7] reduced motion
  // The off-ramp has to leave the canvas WORKING, not just quiet.
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const rp = await open(rctx);
  await btn(rp, "Zoom in").click();
  const rzoomed = await snapshot(rp);
  await btn(rp, "Fit").click();
  const rfit = await snapshot(rp);
  await btn(rp, "Reset").click();
  const rrest = await snapshot(rp);
  const rdriven = await viaSeam(rp, 2, 2);
  // Each verb asserted against something it could get WRONG. `readout === pct(zoom)` would be
  // tautological — syncControls derives one from the other, so the two sides are equal whether or
  // not the verb did anything. Zoom in has to leave rest; fit has to leave where zoom in put it AND
  // land on a level the measured layout agrees with; reset has to come all the way back.
  const rfits = (i) => ZOOM_LEVELS[i] * rfit.contentW <= rfit.clientW + 1 && ZOOM_LEVELS[i] * rfit.contentH <= rfit.clientH + 1;
  const rchosen = Number(rfit.zoom);
  t("reduced motion · zoom in still moves off the rest level",
    rzoomed.zoom === String(ZOOM_REST + 1), `data-zoom=${rzoomed.zoom}`);
  t("reduced motion · fit still recomputes a level the layout agrees with",
    rfit.zoom !== rzoomed.zoom && (rfits(rchosen) || rchosen === 0) && (rchosen === ZOOM_LEVELS.length - 1 || !rfits(rchosen + 1)),
    `${rzoomed.zoom} → ${rfit.zoom}; content ${rfit.contentW}×${rfit.contentH} in ${rfit.clientW}×${rfit.clientH}`);
  t("reduced motion · reset still returns to scale 1 and scroll 0,0",
    rrest.zoom === String(ZOOM_REST) && rrest.scrollLeft === 0 && rrest.scrollTop === 0,
    JSON.stringify({ zoom: rrest.zoom, l: rrest.scrollLeft, t: rrest.scrollTop }));
  t("reduced motion · placement still completes", rdriven.col === "2" && rdriven.row === "2", JSON.stringify(rdriven));

  // AC #6 — the off-ramp has to leave the VERBS working, not just quiet. Each one asserted against
  // something it could get wrong: the arrangement has to actually change.
  await btn(rp, "Reset").click();
  // Same reason as the block above: the pointer cannot be moved to a point below the window.
  await rp.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
  await rp.waitForTimeout(300);
  const rBefore = (await arrangement(rp))["s1"];
  await dragTo(rp, "s1", await cellPoint(rp, 3, 4));
  const rDragged = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · a pointer drag still completes",
    rDragged.col !== rBefore.col || rDragged.row !== rBefore.row,
    `${JSON.stringify(rBefore)} → ${JSON.stringify(rDragged)}`);

  await rp.locator('.stx-slot[data-stx-id="s1"] .stx-grab').focus();
  await rp.keyboard.press("Enter");
  await rp.keyboard.press("ArrowDown");
  await rp.keyboard.press("Enter");
  await rp.waitForTimeout(120);
  const rKeyed = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · a keyboard move still completes",
    rKeyed.row !== rDragged.row, `${JSON.stringify(rDragged)} → ${JSON.stringify(rKeyed)}`);

  // The undo still restores AND runs no animated travel. Read immediately after the click, before
  // any animation could have finished on its own and made this vacuously true.
  await btn(rp, "Undo").click();
  const rAnims = await rp.evaluate(() => document.querySelectorAll(".stx-slot").length
    && [...document.querySelectorAll(".stx-slot")].reduce((n, el) => n + el.getAnimations().length, 0));
  await rp.waitForTimeout(250);
  const rUndone = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · undo still restores the arrangement",
    rUndone.row === rDragged.row, `${JSON.stringify(rKeyed)} → ${JSON.stringify(rUndone)}`);
  t("AC #6 · …and runs NO animated travel — element.animate() is not switched off by CSS, so the module gates it",
    rAnims === 0, `${rAnims} animation(s) running on the slots straight after the undo`);
  await rctx.close();

  // ---------------------------------------------------------------- [#206] the SHIPPED surface, /factory
  // Everything above drives studio.html, the raw harness. This section drives the DESIGNED route,
  // because the two are not the same claim: the harness places ~31 components with its own inline
  // script, and /factory places the drafted breadboard through system/studio.mjs and docks an
  // inspector beside it. A regression in the orchestrator — a placement loop that ran after the
  // verbs mounted, an inspector wired only to its click handler — leaves every assertion above green.
  //
  // It also carries the ONLY automated coverage the three absorbed exhibits have left. Until #206
  // they mounted at load and the pixel gate captured them, so a dropped fetch or a dropped
  // stylesheet showed up as a diff. They are lazy now and nothing captures them, so the panel-content
  // assertions below are what replaced that: a completely unstyled, unrendered trace player would
  // otherwise pass update:docker, build-checks and drift-check alike.
  await factoryPass(browser, t, errors);
  await methodPass(browser, engineName, t, errors);
  await selectPass(browser, engineName, t, errors);
  await docsPass(browser, engineName, t, errors);
  await perfPass(browser, engineName, t, errors);

  t("no page errors and no console errors across the whole journey", errors.length === 0, errors.join(" | "));
  return errors;
}

// The shipped route. Kept as its own function rather than folded into journey(): it opens its own
// page against a different URL and shares nothing with the harness fixture above except the engine.
async function factoryPass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  // A cold load straight onto a panel HASH — the assertion that catches a lazy mount wired only to
  // the click handler. system/palette.mjs's three ⌘K commands and roundtrip.html's back-link both
  // arrive exactly this way, and a deep link that lands on an empty panel is the failure mode those
  // four inbound entry points share.
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`factory pageerror: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error") errors.push(`factory console: ${m.text()}`); });
  await p.goto(`${BASE}/factory.html#shape`, { waitUntil: "load" });
  await p.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await p.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
  await p.waitForSelector('[data-canvas-verbs="ready"]', { timeout: 20000 });
  // #209 · EVERY ASSERTION BELOW IS ABOUT THE SETTLED CANVAS. The three handles above all fire at
  // MOUNT, and since #209 the canvas is EMPTY at mount — system/replay-driver.mjs fills it by
  // playing a committed real run. 30 s because ~14 s of it is playback (replay-driver.mjs's
  // PLAYBACK_MS governs both, and says these move together).
  await p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });

  // The board is read off the RUNNING page through the orchestrator's own seam, then the slot count
  // is compared to it. Asserting a literal 4 would pass a board that silently stopped being the
  // replay's and started being a fixture — and it is what makes studio.mjs's onSettle updating all
  // three of board / summary / arranged a gated fact rather than bookkeeping.
  const board = await p.evaluate(() => import("/system/studio.mjs").then((m) => {
    const s = m.getStudio();
    return s ? { places: s.board.places.length, arranged: s.arranged.length, pattern: s.summary.patternId } : null;
  }));
  t("#206 · /factory mounted the studio and exposes it through getStudio()", Boolean(board), JSON.stringify(board));
  const slotCount = await p.locator(`${VIEWPORT} .stx-slot`).count();
  t("#206 · the canvas holds one slot per place of the board the REPLAY built",
    Boolean(board) && slotCount === board.arranged && board.arranged === board.places,
    `slots=${slotCount} arranged=${board && board.arranged} places=${board && board.places}`);
  t("#206 · the replayed board is not empty — every assertion here would be vacuous on an empty canvas",
    slotCount > 0, `slots=${slotCount}`);

  // The deep link had to ACTIVATE and MOUNT. Both halves are asserted: aria-selected alone would
  // pass for a panel that opened onto nothing.
  t("#206 · a cold /factory#shape deep-link selects the Graph panel",
    (await p.getAttribute("#stu-tab-shape", "aria-selected")) === "true");
  await p.waitForSelector("#system-graph .sg-node", { timeout: 20000 });
  t("#206 · …and the graph is genuinely MOUNTED, not an empty panel with a selected tab",
    (await p.locator("#system-graph .sg-node").count()) > 0);

  // The other two exhibits, by click. Each asserted as RENDERED CONTENT rather than as a ready flag,
  // because a flag can be set by a mount that produced nothing.
  await p.click("#stu-tab-agents");
  await p.waitForSelector("#agents-player .trace-step", { timeout: 20000 });
  t("#206 · the Traces panel mounts on activation and renders real steps",
    (await p.locator("#agents-player .trace-step").count()) > 0);
  // The stylesheet half of the same assertion. .trace-* and .sg-* moved verbatim from factory.html's
  // <style> into system/studio.css when the exhibits went lazy; with nothing capturing them, an
  // unstyled player is invisible to every other gate. A bare <div> would report `display: block`,
  // so this reads the flex the sheet declares.
  t("#206 · …and the absorbed .trace-* stylesheet reached the page with it",
    (await p.evaluate(() => getComputedStyle(document.querySelector(".trace-player")).display)) === "flex");

  await p.click("#stu-tab-round-trip");
  await p.waitForSelector('#roundtrip-diff[data-diff="ready"]', { timeout: 20000 });
  t("#206 · the Round-trip panel mounts on activation and renders",
    (await p.locator("#roundtrip-diff > *").count()) > 0);

  // Arrow-key navigation of the panel list, APG's pattern — the keyboard path to the same four
  // panels, and the one a mouse-only implementation drops.
  await p.focus("#stu-tab-round-trip");
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(150);
  t("#206 · ArrowRight moves the inspector's selection and takes focus with it",
    (await p.getAttribute("#stu-tab-shape", "aria-selected")) === "true"
    && (await p.evaluate(() => document.activeElement?.id)) === "stu-tab-shape");
  await p.keyboard.press("Home");
  await p.waitForTimeout(150);
  t("#206 · Home returns to the at-rest panel",
    (await p.getAttribute("#stu-tab-this-build", "aria-selected")) === "true"
    && (await p.isHidden("#shape")));

  // Exactly one panel is shown at a time under JS, and every other one carries `hidden`.
  const shown = await p.evaluate(() => [...document.querySelectorAll(".stu-panel")].filter((n) => !n.hidden).length);
  t("#206 · exactly one inspector panel is visible under JS", shown === 1, `${shown} visible`);

  // A keyboard move on the shipped surface. The counts differ per path on purpose (pointer 1,
  // keyboard N + 2) and the keyboard number is the one asserted here — if it goes red the fix is the
  // count, never deleting the per-step feedback.
  //
  // FREE #230 COVERAGE SINCE #209, and worth knowing before anyone "simplifies" it: this node is now
  // REPLAY-PLACED, i.e. placed after mountCanvasVerbs seeded its history on an empty stage. So this
  // block is also a regression test for #230's adopt, at no cost. The pointer half of that case is
  // in the replay pass below, because a gesture PREVIEWS before it commits and an injected move
  // passes against a design that only adopts in the consumer.
  const first = await p.locator(`${VIEWPORT} .stx-slot`).first().getAttribute("data-stx-id");
  const before = await p.evaluate((i) => {
    const n = document.querySelector(`.stx-slot[data-stx-id="${i}"]`);
    return { col: n.getAttribute("data-col"), row: n.getAttribute("data-row") };
  }, first);
  await countLive(p);
  await busRecord(p);
  await busClear(p);
  await p.locator(`.stx-slot[data-stx-id="${first}"] .stx-grab`).focus();
  await p.keyboard.press("Enter");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(150);
  const said = await liveSeen(p);
  const after = await p.evaluate((i) => {
    const n = document.querySelector(`.stx-slot[data-stx-id="${i}"]`);
    return { col: n.getAttribute("data-col"), row: n.getAttribute("data-row") };
  }, first);
  t("#206 · a keyboard move on the shipped surface rewrites data-col / data-row",
    after.row !== before.row || after.col !== before.col, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  t("#206 · …announcing once per keypress — pick-up + 1 arrow + drop = 3",
    said.n === 3, `${said.n} announcement(s); last: ${said.last}`);
  t("#206 · …and the last announcement names the slot it landed in",
    new RegExp(`moved to column ${after.col}, row ${after.row}`).test(said.last), said.last);
  // #232's other half, and the reason `component` is optional rather than always-present: what this
  // page moves is a FAT-MARKER BLOCK — the drafted board, not a library component. The action must
  // carry no shape at all rather than a made-up one, and must still say which thing moved.
  const factoryMove = (await busSeen(p)).filter((a) => a.type === "ui.move")[0];
  t("#232 · moving a fat-marker block emits NO target.component — it has no vocabulary shape",
    factoryMove && factoryMove.hasComponent === false, JSON.stringify(factoryMove));
  t("#232 · …and still names it under target.label",
    factoryMove?.label === (await p.getAttribute(`.stx-slot[data-stx-id="${first}"]`, "data-stx-name")),
    JSON.stringify(factoryMove));

  // Group 7's claim, on the running page. The source is grep-clean; this is the half grep cannot
  // make — and it is asserted AFTER a move, which is when a style-writing implementation would show.
  const styled = await p.evaluate(() => [...document.querySelectorAll(".stx-slot, .stx-stage, .stx-scroll")]
    .filter((n) => n.hasAttribute("style")).length);
  t("#206 · no `style` attribute on the stage, the scroller or any slot after a move",
    styled === 0, `${styled} element(s) carry one`);

  // Act 0 mounted here too — the import act reached a second page for the cost of markup, which is
  // the whole "import, never fork" claim. build-import.mjs returns SILENTLY when a required node is
  // missing (no throw, no console line, a pixel-identical at-rest capture), so its readiness handle
  // is the only thing that can tell a mounted act from a dead one.
  t("#206 · Act 0 self-booted on this page's mount attributes",
    (await p.getAttribute("[data-build-import]", "data-build-import")) === "ready");
  t("#206 · …and the canvas column IS the stage it dresses",
    await p.evaluate(() => document.getElementById("build-stage")?.classList.contains("stu-canvas-col")));

  await ctx.close();

  // ---------------------------------------------------------------- #213 · the dock, MID-FLOW
  // The one piece of site chrome the journey never touched. Opened while the replay is still
  // authoring the canvas, the pack switched to saulera, closed — and the four claims that make it
  // a studio case rather than a dock case: the head's ONE pack line re-points (pack-boot's
  // contract), the pack switch is CHROME and not a take-over (the discriminator is canvas-scoped,
  // and this is the assertion that keeps it that way), the replay keeps playing to the committed
  // board, and the canvas is still alive to a move verb afterwards. Template:
  // tooling/build-journey.mjs's dock-mid-flow cases (lines 495-515, 1115-1150).
  //
  // A fresh context, load-bearing twice over: pack-boot restores a persisted pack from
  // localStorage pre-paint, so this must start neutral — and the saulera choice this case
  // persists must die with the context rather than skin every later pass.
  {
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const dp = await dctx.newPage();
  dp.on("pageerror", (e) => errors.push(`dock pageerror: ${e.message}`));
  // The teardown pass's narrow exemption, for the same reason: wearing saulera 404s the pack's
  // own `@import url("../fonts/fonts.css")` — fonts/ is not committed, a standing property of the
  // hand-authored reference pack that every saulera surface shares (the pixel gate wears it too,
  // it just never watches the console). That line is the browser reporting the network, not the
  // page reporting itself; everything else still fails the run.
  dp.on("console", (m) => {
    if (m.type() !== "error") return;
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(`dock console: ${m.text()}`);
  });
  await dp.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  await dp.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await dp.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  const dReplay = () => dp.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return r ? { state: r.state, index: r.index, beats: r.beats.length, took: r.tookOver } : null;
  }));
  const dMid = await dReplay();
  t("#213 · the dock case really is MID-REPLAY — a settled page would prove the wrong thing",
    dMid.state === "ready" && dMid.index < dMid.beats, JSON.stringify(dMid));

  // Open (the hash-routed disclosure), switch, close — the reader's own path.
  await dp.evaluate(() => { location.hash = "appearance"; });
  await dp.waitForTimeout(250);
  await dp.locator('label[for="dock-pack-saulera"]').click();
  await dp.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .some((l) => /\/system\/tokens\.saulera\.css$/.test(l.getAttribute("href") || "")), null, { timeout: 10000 });
  await dp.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await dp.waitForTimeout(250);
  const packLines = await dp.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.getAttribute("href"))
    .filter((h) => /\/system\/tokens\.(neutral|saulera|verdant|plusui)\.css$/.test(h || "")));
  t("#213 · the head's ONE pack line now points at saulera — switched mid-replay, with the run still authoring",
    packLines.length === 1 && /saulera/.test(packLines[0]), JSON.stringify(packLines));
  const dAfterDock = await dReplay();
  t("#213 · the pack switch did NOT count as take-over — a dock verb is chrome, not canvas",
    dAfterDock.took === false
    && (await dp.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 0,
    `took=${dAfterDock.took} pushed=${JSON.stringify(await dp.evaluate(() => window.__pushed.slice()))}`);

  // The run plays through to the COMMITTED board — skinned, never shortened.
  await dp.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  const dBoard = await dp.evaluate(async () => {
    const want = await (await fetch("/replay/build-fieldwork-dispatch.board.json")).json();
    return {
      wanted: want.places.map((x) => x.label),
      got: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) => w.getAttribute("data-stx-name")),
    };
  });
  t("#213 · …and the replay CONTINUED to the committed board, block for block",
    JSON.stringify(dBoard.got) === JSON.stringify(dBoard.wanted),
    `${JSON.stringify(dBoard.got)} vs ${JSON.stringify(dBoard.wanted)}`);

  // The dock left the canvas ALIVE: one keyboard move still works and still announces per keypress.
  const dFirst = await dp.locator(`${VIEWPORT} .stx-slot`).first().getAttribute("data-stx-id");
  const dBefore = await dp.evaluate((i) => document.querySelector(`.stx-slot[data-stx-id="${i}"]`).getAttribute("data-row"), dFirst);
  await countLive(dp);
  await dp.locator(`.stx-slot[data-stx-id="${dFirst}"] .stx-grab`).focus();
  await dp.keyboard.press("Enter");
  await dp.keyboard.press("ArrowDown");
  await dp.keyboard.press("Enter");
  await dp.waitForTimeout(150);
  const dSaid = await liveSeen(dp);
  const dAfter = await dp.evaluate((i) => document.querySelector(`.stx-slot[data-stx-id="${i}"]`).getAttribute("data-row"), dFirst);
  t("#213 · …and a move verb still works after the dock, announced per keypress",
    dAfter !== dBefore && dSaid.n === 3, `row ${dBefore} → ${dAfter}; ${dSaid.n} announcement(s): ${dSaid.last}`);
  await dctx.close();
  }

  await replayPass(browser, t, errors);
  await compilePass(browser, t, errors);
}

// ---------------------------------------------------------------------------------------------
// #209 · THE REPLAY DRIVER. The only thing that can see a running page, which is where every claim
// below lives: build-checks group 16 proves the pure join and the reproduce, and says in its own
// header that the bus emission, the single consumer, the announcements, the determinism of the
// settled DOM and the take-over discriminator are this file's.
//
// EVERY ASSERTION IS PHRASED AS RESULTING DOM OR A RESULTING URL, never as "an action was emitted" —
// which would pass with no consumer at all, the lesson #205's three-source proof is built on.
//
// THE ARTIFACT FETCH IS DELAYED BY ROUTE in the pass that counts actions, and that is a driver
// technique rather than a product concession: the driver's first beat fires in the task after its
// fetches resolve, which on a local server is sooner than a Playwright round trip can attach a bus
// listener. Delaying the response changes nothing about WHAT is emitted; it only opens a window to
// start listening in. Without it the count is short by one and the pass is silently weaker.
async function replayPass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  };
  const settled = (p) => p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  const replayState = (p) => p.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return r ? { state: r.state, index: r.index, beats: r.beats.length, took: r.tookOver, places: r.board.places.length } : null;
  }));

  // --- 1 · the settled canvas IS the run's committed board --------------------------------------
  // Compared against replay/<slug>.board.json FETCHED BY THE PAGE, never against literals: the point
  // is that what a reader watched assemble is the board the run really built.
  const p1 = await ctx.newPage();
  watch(p1, "replay");
  await p1.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settled(p1);
  const match = await p1.evaluate(async () => {
    const want = await (await fetch("/replay/build-fieldwork-dispatch.board.json")).json();
    const wraps = [...document.querySelectorAll("[data-studio-canvas] .stx-slot")];
    return {
      wanted: want.places.map((x) => x.label),
      got: wraps.map((w) => w.getAttribute("data-stx-name")),
      cols: wraps.map((w) => w.getAttribute("data-col")),
      rows: wraps.map((w) => w.getAttribute("data-row")),
      affordances: want.places.reduce((n, x) => n + x.affordances.length, 0),
      connections: want.connections.length,
    };
  });
  t("#209 · the settled canvas holds one block per place of the COMMITTED board, in board order",
    JSON.stringify(match.got) === JSON.stringify(match.wanted), `${JSON.stringify(match.got)} vs ${JSON.stringify(match.wanted)}`);
  t("#209 · …laid along row 1 in columns 1..n, exactly as arrangeBoard derives them",
    match.cols.join(",") === match.wanted.map((_, i) => i + 1).join(",") && match.rows.every((r) => r === "1"),
    `cols=${match.cols.join(",")} rows=${match.rows.join(",")}`);
  const panel = await p1.locator("#this-build-summary").innerText();
  t("#209 · …and the This build panel is COUNTED from that board, not from the empty mount-time one",
    panel.includes(String(match.wanted.length)) && panel.includes(String(match.affordances))
    && panel.includes(String(match.connections)), panel.replace(/\s+/g, " ").slice(0, 160));
  const seam = await replayState(p1);
  t("#209 · getStudio()'s board / arranged / summary were updated at settle, not left at mount",
    await p1.evaluate(() => import("/system/studio.mjs").then((m) => {
      const s = m.getStudio();
      return s && s.board.places.length === s.arranged.length && s.arranged.length > 0;
    })), JSON.stringify(seam));
  // The trace link the chrome offers really resolves — the /build journey checks its three the same
  // way, and a provenance link that 404s is worse than no link.
  for (const href of await p1.locator(".stu-replay-links a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    const status = await p1.evaluate((u) => fetch(u).then((r) => r.status), href);
    t(`#209 · the chrome's link ${href} resolves`, status === 200, `HTTP ${status}`);
  }
  const chrome = await p1.locator(".stu-replay-label").innerText();
  t("#209 · the chrome renders the trace's label AND the artifact's, verbatim and unparaphrased",
    chrome.includes("Real run, curated for length")
    && chrome.includes("Projection of the real run build-fieldwork-dispatch"), chrome);
  const stage1 = await p1.evaluate(() => document.querySelector("[data-studio-canvas] .stx-stage").outerHTML);
  await p1.close();

  // --- 2 · determinism (AC #2) --------------------------------------------------------------------
  // The settled canvas is a pixel baseline, so a second load must produce a byte-identical stage.
  // #207's compile pass makes this exact assertion for its beat; this is its shape, copied.
  const p2 = await ctx.newPage();
  watch(p2, "replay");
  await p2.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settled(p2);
  const stage2 = await p2.evaluate(() => document.querySelector("[data-studio-canvas] .stx-stage").outerHTML);
  t("#209 · a second load produces a BYTE-IDENTICAL settled stage", stage1 === stage2,
    stage1 === stage2 ? "" : `${stage1.length} vs ${stage2.length} chars`);
  const styled = await p2.evaluate(() => [...document.querySelectorAll(".stu-replay *, .stx-slot, .stx-stage")]
    .filter((n) => n.hasAttribute("style")).length);
  t("#209 · nothing the driver drew carries a style attribute — group 7's claim, on the running page",
    styled === 0, `${styled} element(s) carry one`);
  await p2.close();

  // --- 3 · agent.* AND ONLY agent.*, with the single consumer doing the work ----------------------
  const p3 = await ctx.newPage();
  watch(p3, "replay");
  await p3.route("**/replay/*.json", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await p3.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p3.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await busRecord(p3);
  await busClear(p3);
  await settled(p3);
  const acts = await busSeen(p3);
  const after3 = await replayState(p3);
  t("#209 · the replay emitted one action per beat and reached every one of them",
    acts.length === after3.beats && after3.index === after3.beats,
    `${acts.length} action(s) for ${after3.beats} beats, index=${after3.index}`);
  t("#209 · …every one of them agent.* with source \"agent\" — the reserved half, exercised for real",
    acts.length > 0 && acts.every((a) => /^agent\./.test(a.type) && a.source === "agent"),
    [...new Set(acts.map((a) => `${a.type}/${a.source}`))].join(" "));
  t("#209 · …and NONE of them carries target.component — a board place has no vocabulary shape (#232)",
    acts.every((a) => a.hasComponent === false), JSON.stringify(acts.find((a) => a.hasComponent)));
  t("#209 · …and no ui.move was emitted: the driver is a second AUTHOR, never a second MOVER",
    acts.every((a) => a.type !== "ui.move"));
  await p3.close();

  // --- 4 · pause / step / seek by keyboard, each announced (AC #4) --------------------------------
  // Parked at a KNOWN BEAT with the seek control rather than slept to, so this is about state and
  // not about timing. Counted PER PATH, the #205 lesson: a naive once-per-gesture count sends an
  // implementer to delete real feedback.
  const p4 = await ctx.newPage();
  watch(p4, "replay");
  await p4.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settled(p4);
  const transport = p4.locator(".stu-replay-controls");
  await transport.getByRole("button", { name: "Step", exact: true }).isVisible();
  // Seek backwards from the settled end, by keyboard, on the real range input.
  await p4.locator(".stu-replay-seek").focus();
  await countLive(p4);
  for (let i = 0; i < 6; i += 1) await p4.keyboard.press("ArrowLeft");
  await p4.waitForTimeout(200);
  const seeked = await replayState(p4);
  const saidSeek = await liveSeen(p4);
  t("#209 · seeking backwards by keyboard rebuilds the board from the prefix",
    seeked.index === seeked.beats - 6 && seeked.state !== "settled", JSON.stringify(seeked));
  t("#209 · …and every seek is announced", saidSeek.n >= 6 && /Step \d+ of \d+/.test(saidSeek.last), `${saidSeek.n}: ${saidSeek.last}`);
  const slotsAtSeek = await p4.locator(`${VIEWPORT} .stx-slot`).count();
  t("#209 · …and the canvas really was rebuilt to match, not left at the settled arrangement",
    slotsAtSeek > 0 && slotsAtSeek <= seeked.places, `${slotsAtSeek} slot(s) for ${seeked.places} place(s)`);
  // Step, by keyboard, on the real button.
  await countLive(p4);
  await transport.getByRole("button", { name: "Step", exact: true }).focus();
  await p4.keyboard.press("Enter");
  await p4.waitForTimeout(200);
  const stepped = await replayState(p4);
  const saidStep = await liveSeen(p4);
  t("#209 · Step by keyboard advances EXACTLY ONE beat", stepped.index === seeked.index + 1,
    `${seeked.index} → ${stepped.index}`);
  t("#209 · …announcing that beat — a reader who drove the step hears the step, not the act",
    saidStep.n >= 1 && saidStep.last.length > 0, `${saidStep.n}: ${saidStep.last}`);
  // Pause / Resume, by keyboard.
  await transport.getByRole("button", { name: "Resume", exact: true }).focus();
  await p4.keyboard.press("Enter");
  // WAITED FOR RATHER THAN SLEPT PAST, and the reason is the thing this pass is about: the gaps are
  // the RUN'S OWN, so the next one is whatever the agent's next call cost — around here several
  // seconds of real time compressed. A fixed sleep tuned to the average silently asserts that the
  // pacing is uniform, which is the one property paceBeats deliberately does not have.
  //
  // Polled through evaluate() rather than waitForFunction(), and that is not a style choice: a
  // dynamic import() does not resolve inside waitForFunction's injected context, so the predicate
  // rejected on every poll and the wait timed out silently while the run advanced perfectly. It
  // read as a product failure ("Resume does not restart the timer") and was a driver bug.
  let resumed = stepped;
  for (let i = 0; i < 60 && resumed.index <= stepped.index; i += 1) {
    await p4.waitForTimeout(250);
    resumed = await replayState(p4);
  }
  t("#209 · Resume by keyboard restarts the timer chain", resumed.index > stepped.index,
    `${stepped.index} → ${resumed.index}`);
  await countLive(p4);
  await transport.getByRole("button", { name: "Pause", exact: true }).focus();
  await p4.keyboard.press("Enter");
  const pausedAt = (await replayState(p4)).index;
  await p4.waitForTimeout(1200);
  const stillPaused = await replayState(p4);
  const saidPause = await liveSeen(p4);
  t("#209 · Pause by keyboard STOPS the run — the beat count does not move over a second",
    stillPaused.index === pausedAt, `${pausedAt} → ${stillPaused.index}`);
  t("#209 · …and says so", /paused/i.test(saidPause.last), saidPause.last);
  await p4.close();

  // --- 5 · the take-over, mid-replay, on a fresh page (AC #3) --------------------------------------
  // THE ROUTE IS WATCHED THROUGH history.pushState, the way the analytics group's stub does it —
  // build-checks group 10 proves the predicate and says in its own comment that THIS is where the
  // call site is proven.
  const p5 = await ctx.newPage();
  watch(p5, "replay");
  await p5.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  await p5.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p5.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  const midway = await replayState(p5);
  t("#209 · the take-over case really is MID-REPLAY — a settled page would prove the wrong thing",
    midway.state === "ready" && midway.index < midway.beats, JSON.stringify(midway));
  // A POINTER PRESS ON THE STAGE, which is the load-bearing path: it is the one a visitor performs,
  // and it must not need the bus's ui.move (a gesture PREVIEWS, and the drop is far too late).
  await p5.locator(`${VIEWPORT} .stx-slot`).first().click();
  // READ, WAIT, RE-READ — section 4's shape, and it has to be this way round. Both reads taken
  // AFTER the wait are one round trip apart, and the gaps here average ~500 ms, so a driver that
  // never paused at all would report the same index across those few milliseconds and the check
  // would pass on it.
  const tookAt = await replayState(p5);
  await p5.waitForTimeout(1500);
  const took = await replayState(p5);
  t("#209 · one pointer press on the canvas PAUSES the run — the beat count stops moving over a second and a half",
    took.took === true && took.index === tookAt.index, `${tookAt.index} → ${took.index}`);
  t("#209 · …and provenance visibly shifts to name both authors",
    (await p5.getAttribute("[data-studio]", "data-provenance")) === "visitor"
    && (await p5.locator(".stu-replay-provenance").innerText()).includes("your edits"),
    await p5.locator(".stu-replay-provenance").innerText());
  t("#209 · …and seek is disabled once the visitor has taken over — a rebuild would destroy their work",
    await p5.locator(".stu-replay-seek").isDisabled());
  const pushed1 = await p5.evaluate(() => window.__pushed.slice());
  t("#209 · …firing /factory/took-over exactly once, as a bare static literal",
    pushed1.filter((u) => u === "/factory/took-over").length === 1
    && pushed1.every((u) => !/[?#]/.test(u)), JSON.stringify(pushed1));
  await p5.waitForTimeout(400);
  t("#209 · …and the reader's real URL comes back",
    await p5.evaluate(() => location.pathname === "/factory.html" && !location.search), await p5.url());
  // ONE-SHOT: a second interaction pushes nothing more.
  await p5.locator(`${VIEWPORT} .stx-slot`).nth(0).click();
  await p5.keyboard.press("ArrowRight");
  await p5.waitForTimeout(300);
  t("#209 · the handover is one-shot — a second interaction pushes no second route",
    JSON.stringify(await p5.evaluate(() => window.__pushed.slice())) === JSON.stringify(pushed1));
  await p5.close();

  // --- 6 · Tab alone is NOT take-over -------------------------------------------------------------
  // The discriminator, and the one judgement in this ticket that is about human intent: a keyboard
  // reader Tabbing toward the Pause button has not grabbed the wheel, and firing the metric there
  // would inflate it.
  const p6 = await ctx.newPage();
  watch(p6, "replay");
  await p6.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p6.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  await p6.locator(`${VIEWPORT} .stx-scroll`).focus();
  await p6.keyboard.press("Tab");
  await p6.keyboard.press("Shift+Tab");
  await p6.waitForTimeout(200);
  t("#209 · Tab and Shift+Tab on the canvas are NAVIGATION, not take-over",
    (await replayState(p6)).took === false, JSON.stringify(await replayState(p6)));
  // …and pressing one of the driver's own controls is not either: they live outside the scroller,
  // which is what makes that exclusion structural rather than a heuristic filter.
  await p6.locator(".stu-replay-controls").getByRole("button", { name: "Pause", exact: true }).click();
  await p6.waitForTimeout(200);
  t("#209 · …and pressing the driver's own transport is chrome, not canvas interaction",
    (await replayState(p6)).took === false, JSON.stringify(await replayState(p6)));
  await p6.close();
  await ctx.close();

  // --- 7 · reduced motion (AC #5) -----------------------------------------------------------------
  // Jumps to the end state with NO timer chain, and manual stepping stays available — the branch is
  // about motion, not about dropping the content.
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const pr = await rctx.newPage();
  watch(pr, "replay reduced");
  // Installed BEFORE the load, because the take-over sub-case at the end of this section needs it —
  // it used to be an addInitScript AFTER the page had loaded, which is a no-op, sitting under a
  // comment claiming the route was covered here.
  await pr.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  const t0 = Date.now();
  await pr.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await pr.waitForSelector('[data-replay="settled"]', { timeout: 20000 });
  const elapsed = Date.now() - t0;
  t("#209 · reduced motion reaches the settled board IMMEDIATELY — no fourteen-second timer chain",
    elapsed < 8000, `${elapsed} ms`);
  const rstate = await pr.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return { index: r.index, beats: r.beats.length, places: r.board.places.length };
  }));
  t("#209 · …reaching the identical end state", rstate.index === rstate.beats && rstate.places === match.wanted.length,
    JSON.stringify(rstate));
  // READ AS COMPUTED DISPLAY on the element identified STRUCTURALLY (the transport's first button),
  // never by its text. The first version matched on hasText: "Pause" and passed the moment the
  // label swapped to "Resume" — which syncControls does on every settle — so it could not fail and
  // said nothing about whether the button was hidden. And `hidden` is exactly the write this repo
  // has been burned by: it is inert wherever an author rule sets display (live on /build's keep rail
  // until #138). It works here only because factory.html:79 carries a page-scoped
  // [hidden]{display:none!important}, which is a property of THAT PAGE — so this reads the computed
  // value rather than trusting the attribute.
  const pauseBox = await pr.evaluate(() => {
    const n = document.querySelector(".stu-replay-controls button");
    return { text: n.textContent, hidden: n.hidden, display: getComputedStyle(n).display };
  });
  t("#209 · …with the Pause button genuinely not painted, because nothing is playing",
    pauseBox.hidden === true && pauseBox.display === "none", JSON.stringify(pauseBox));
  // Manual stepping still available: seek back, then Step.
  await pr.locator(".stu-replay-seek").focus();
  await pr.keyboard.press("ArrowLeft");
  await pr.waitForTimeout(150);
  const rback = await pr.evaluate(() => import("/system/replay-driver.mjs").then((m) => m.getReplay().index));
  await pr.locator(".stu-replay-controls").getByRole("button", { name: "Step", exact: true }).click();
  await pr.waitForTimeout(150);
  const rfwd = await pr.evaluate(() => import("/system/replay-driver.mjs").then((m) => m.getReplay().index));
  t("#209 · …and manual stepping still works under reduced motion", rfwd === rback + 1, `${rback} → ${rfwd}`);
  // THE HANDOVER IS NOT MOTION, so reduced motion must not cost the visitor the take-over — the
  // provenance shift or the route. Asserted rather than asserted-about: this used to be a comment
  // over an addInitScript(() => {}) that did nothing, on a page that had never been given the
  // pushState hook at all.
  //
  // It is also where the announcement trade shows most plainly: `wasPlaying` is always false here
  // (nothing was ever playing), so the handover is SILENT by design. What shifts is the provenance
  // line, which is a plain <p> and not a live region — a deliberate trade, and the reason this
  // asserts the attribute and the text rather than an announcement.
  await pr.locator(`${VIEWPORT} .stx-slot`).first().click();
  await pr.waitForTimeout(300);
  t("#209 · reduced motion still hands over — provenance shifts",
    (await pr.getAttribute("[data-studio]", "data-provenance")) === "visitor");
  t("#209 · …and the route still fires exactly once",
    (await pr.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 1,
    JSON.stringify(await pr.evaluate(() => window.__pushed.slice())));
  await pr.close();
  await rctx.close();

  // --- 7b · THE TWO DEGRADATIONS, and the honesty claim inside the first ---------------------------
  // Both are named edge cases in the plan and neither is reachable from build-checks: group 16 covers
  // the DATA half of the traceless case and nothing covers either surface.
  const dgctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  // (a) THE ARTIFACT 404s. The load-bearing clause is the LAST one: the take-over route must never
  // fire on a canvas the replay failed to build. A visitor moving blocks there has taken nothing
  // over, and firing would make the metric a lie — replay-driver.mjs's onTouch says exactly that,
  // and `if (state === "unavailable") return;` is the only thing enforcing it.
  const pa = await dgctx.newPage();
  const aErrors = [];
  pa.on("pageerror", (e) => aErrors.push(`pageerror: ${e.message}`));
  pa.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) aErrors.push(`console: ${m.text()}`); });
  await pa.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  await pa.route("**/replay/*.json", (route) => route.fulfill({ status: 404, body: "gone" }));
  await pa.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await pa.waitForSelector('[data-replay="unavailable"]', { timeout: 20000 });
  t("#209 · a missing artifact settles as \"unavailable\" rather than hanging or half-drawing",
    (await pa.locator(`${VIEWPORT} .stx-slot`).count()) === 0, `${await pa.locator(`${VIEWPORT} .stx-slot`).count()} slot(s)`);
  const card = await pa.locator(".stu-replay-card").innerText();
  t("#209 · …saying so in an honest card that names the file, with nothing drawn in its place",
    card.includes("/replay/") && /could not be read/i.test(card), card.replace(/\s+/g, " ").slice(0, 120));
  t("#209 · …and the transport is gone — no dead controls over a run that is not there",
    (await pa.locator(".stu-replay-controls").isVisible()) === false);
  // The claim itself: interact with the canvas and NOTHING is pushed.
  await pa.locator(`${VIEWPORT} .stx-scroll`).click();
  await pa.keyboard.press("ArrowRight");
  await pa.waitForTimeout(400);
  t("#209 · …and the take-over route NEVER fires — there was nothing to take over, so the metric stays honest",
    JSON.stringify(await pa.evaluate(() => window.__pushed.slice())) === "[]",
    JSON.stringify(await pa.evaluate(() => window.__pushed.slice())));
  t("#209 · …and none of that reached the console", aErrors.length === 0, aErrors.join(" · "));
  await pa.close();

  // (b) THE TRACE 404s but the artifact loads. The ops still play, and the surface STATES that the
  // run's own words are missing rather than showing a shorter run and saying nothing.
  const pb = await dgctx.newPage();
  // The same narrow exemption the #236 teardown section argues for its deliberate 503, and case (a)
  // above already carries: this case SERVES a 404 on purpose, and chromium logs every failed
  // resource load as a console error of its own. That line is the browser reporting the network, not
  // the page reporting itself — everything the driver says about the failure goes to its own note.
  pb.on("pageerror", (e) => errors.push(`replay traceless pageerror: ${e.message}`));
  pb.on("console", (m) => {
    if (m.type() !== "error") return;
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(`replay traceless console: ${m.text()}`);
  });
  await pb.route("**/traces/*.jsonl", (route) => route.fulfill({ status: 404, body: "gone" }));
  await pb.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await pb.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  t("#209 · a missing trace still plays the ops — the board is the run's, words or no words",
    (await pb.locator(`${VIEWPORT} .stx-slot`).count()) === match.wanted.length,
    `${await pb.locator(`${VIEWPORT} .stx-slot`).count()} slot(s)`);
  const note = await pb.locator(".stu-replay-note").innerText();
  t("#209 · …and the surface STATES the words are missing rather than silently showing a shorter run",
    /could not be read/i.test(note) && note.includes("/traces/"), note.replace(/\s+/g, " ").slice(0, 140));
  await pb.close();
  await dgctx.close();

  // --- 8 · destroy() mid-playback -----------------------------------------------------------------
  // #236's lesson, applied to this driver: a torn-down replay that keeps writing into the stage
  // would be a second author on a canvas that no longer belongs to it.
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const pd = await dctx.newPage();
  watch(pd, "replay destroy");
  await pd.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await pd.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  const beforeDestroy = await pd.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    m.getReplay().destroy();
    return document.querySelectorAll("[data-studio-canvas] .stx-slot").length;
  }));
  await pd.waitForTimeout(2500);
  const afterDestroy = await pd.locator(`${VIEWPORT} .stx-slot`).count();
  t("#209 · destroy() mid-playback stops every further DOM write", beforeDestroy === afterDestroy,
    `${beforeDestroy} → ${afterDestroy} slot(s) two seconds after teardown`);
  t("#209 · …leaves the shell clean and the seam empty",
    (await pd.getAttribute("[data-studio]", "data-replay")) === null
    && (await pd.evaluate(() => import("/system/replay-driver.mjs").then((m) => m.getReplay() === null))));
  t("#209 · …and removes its chrome rather than leaving a dead transport on the page",
    (await pd.locator(".stu-replay-controls").count()) === 0);
  await pd.close();
  await dctx.close();

  // --- 9 · #240/1 · COMPILE AND THE DRIVER NEVER AUTHOR THE SAME STAGE ---------------------------
  // The review's High, and the only place it can be proven: build-checks sees the pure layer and the
  // pixel gate never presses anything. Two halves, and the second is the one that matters.
  //
  // (a) Compile is DEAD while the run plays. It used to be live from mount over a board variable
  // only settle() ever wrote, so a reader following factory.html's own lead copy — "the moment you
  // touch the canvas it is yours… press Compile the board" — got "No pattern named, so nothing
  // compiled" about four blocks sitting in front of them.
  //
  // (b) The transport is DEAD once they have taken over, which is what makes (a)'s fix safe. Every
  // beat after a block's place.add is a place-changed doing replaceChild on that wrapper's first
  // non-grab child — the compiled component — and the committed artifact carries seven of them. So
  // "take over, compile, press Resume" is a live two-authors-one-stage path, and closing it is one
  // line in syncControls rather than a sentence in a header.
  const cctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p9 = await cctx.newPage();
  watch(p9, "replay compile");
  await p9.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p9.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
  // MID-REPLAY, and asserted as such: a settled page would prove the wrong thing here exactly as it
  // would in section 5. Waiting for four blocks rather than one so the partial board has something
  // to compile — the claim is "components for the blocks actually on the canvas", and a board of one
  // bare place answers "empty" honestly, which would make the next assertion a check that passes for
  // the wrong reason.
  await p9.waitForFunction(() => document.querySelectorAll("[data-studio-canvas] .stx-slot").length >= 4,
    null, { timeout: 30000 });
  const compileBtn = p9.locator(".stu-compile-btn").first();
  const mid9 = await replayState(p9);
  t("#240/1 · the compile beat is DISABLED while the replay is still authoring the canvas",
    (await compileBtn.isDisabled()) && mid9.state !== "settled" && mid9.index < mid9.beats,
    `disabled=${await compileBtn.isDisabled()} state=${mid9.state} ${mid9.index}/${mid9.beats}`);
  // The take-over: one pointer press on a block, the visitor path.
  await p9.locator(`${VIEWPORT} .stx-slot`).first().click();
  await p9.waitForTimeout(300);
  const took9 = await replayState(p9);
  t("#240/1 · …and LIVE the moment the visitor takes over, which is when the copy tells them to use it",
    !(await compileBtn.isDisabled()) && took9.took === true, `disabled=${await compileBtn.isDisabled()}`);
  const transport9 = p9.locator(".stu-replay-controls");
  const deadTransport = await Promise.all([
    transport9.getByRole("button", { name: "Resume", exact: true }).isDisabled(),
    transport9.getByRole("button", { name: "Step", exact: true }).isDisabled(),
    transport9.getByRole("button", { name: "Skip to end", exact: true }).isDisabled(),
    p9.locator(".stu-replay-seek").isDisabled(),
  ]);
  t("#240/1 · …and the driver's WHOLE transport goes dead with the handover, not only seek — Resume after a compile would replace compiled components with fat markers",
    deadTransport.every(Boolean), `resume/step/skip/seek disabled = ${deadTransport.join(",")}`);
  // THE FAILURE SCENARIO ITSELF, driven: press the button the page tells them to press, and read
  // what comes back. "Not the empty card" is the whole finding.
  const slotsAtCompile = await p9.locator(`${VIEWPORT} .stx-slot`).count();
  await compileBtn.click();
  await p9.waitForFunction(() => {
    const s = document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state");
    return s && s !== "blocks" && s !== "compiling";
  }, null, { timeout: 20000 });
  const state9 = await p9.getAttribute(VIEWPORT, "data-compile-state");
  // #212's compiled shape: a slot holds a screen holding the primitives. Counted as wrappers whose
  // screen carries a ds-* primitive — a PARTIAL board's later places can honestly compile to S4
  // empty screens (their affordances had not been placed yet), so the count is "some", never "all".
  const compiled9 = await p9.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot")]
    .filter((w) => !!w.querySelector(':scope > .stf-screen [class^="ds-"]')).length);
  t("#240/1 · Compile pressed MID-REPLAY after a take-over compiles the blocks that are on the canvas — never the empty board",
    state9 === "rendered" && compiled9 > 0, `state=${state9}, ${compiled9} of ${slotsAtCompile} slot(s) hold a screen with a library primitive`);
  t("#240/1 · …and the page's own board seam agrees with what it just compiled",
    await p9.evaluate((n) => import("/system/studio.mjs").then((m) => {
      const s = m.getStudio();
      return !!s && s.board.places.length === n && s.arranged.length === n;
    }), slotsAtCompile), `${slotsAtCompile} slot(s)`);
  // AND IT STAYS COMPILED. With the transport dead there is no way to ask the driver for another
  // beat, so this is the residual made checkable rather than asserted away.
  await p9.waitForTimeout(2000);
  const stillCompiled = await p9.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot")]
    .filter((w) => !!w.querySelector(':scope > .stf-screen [class^="ds-"]')).length);
  t("#240/1 · …and two seconds later the driver has replaced none of it — one author, one stage",
    stillCompiled === compiled9, `${compiled9} → ${stillCompiled}`);
  await p9.close();

  // (c) THE EARLIEST TAKE-OVER THERE IS. Publishing the board on take-over made a path that could
  // not exist before: settle() always had places to count, and a visitor can grab the wheel from the
  // instant the driver is `ready` — several beats before the first place.add, since the run opens on
  // plan-phase narration. The panel's own rule (studio.mjs:426-430) is that it is NOT rendered for
  // an empty board, and this is now the only thing holding the publisher to it.
  const p9b = await cctx.newPage();
  watch(p9b, "replay early");
  await p9b.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p9b.waitForSelector('[data-replay="ready"]', { timeout: 20000 });
  await p9b.locator(`${VIEWPORT} .stx-scroll`).click({ position: { x: 40, y: 40 } });
  await p9b.waitForTimeout(200);
  const early = await replayState(p9b);
  const earlyPanel = (await p9b.locator("#this-build-summary").innerText()).replace(/\s+/g, " ");
  t("#240/1 · the earliest take-over there is really did land on an EMPTY board (or this proves nothing)",
    early.took === true && early.places === 0, JSON.stringify(early));
  t("#240/1 · …and publishing that board renders no zeros panel — true numbers about nothing are still nothing",
    !/\b0\b/.test(earlyPanel), earlyPanel.slice(0, 140));
  await p9b.close();

  // --- 10 · #240/2 · the LOADING window is not a take-over ---------------------------------------
  // The driver mounts, then awaits two fetches. `onTouch` guarded on "unavailable" and not on that
  // window, so a press against the visible empty canvas fired /factory/took-over, flipped provenance
  // to the visitor — and then start() played the run anyway, underneath a reader the page had just
  // told the canvas was theirs. Uncovered by construction until now: every case above enters after
  // `ready` or `settled`, and the degradation case enters at `unavailable`.
  //
  // The window is widened BY ROUTE, section 3's technique: delaying a response changes nothing about
  // what the driver does in it, it only makes it long enough to click in.
  const p10 = await cctx.newPage();
  watch(p10, "replay loading");
  await p10.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  await p10.route("**/replay/*.json", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await p10.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p10.waitForSelector('[data-replay="loading"]', { timeout: 20000 });
  const empty10 = await p10.locator(`${VIEWPORT} .stx-slot`).count();
  await p10.locator(`${VIEWPORT} .stx-scroll`).click({ position: { x: 40, y: 40 } });
  await p10.waitForTimeout(200);
  const during10 = await replayState(p10);
  t("#240/2 · the canvas really is EMPTY and LOADING when it is pressed — the window this is about",
    empty10 === 0 && during10 !== null && during10.state === "loading", `${empty10} slot(s), state=${during10 && during10.state}`);
  t("#240/2 · …a press there is NOT a take-over: there is nothing to take over yet",
    during10.took === false && (await p10.getAttribute("[data-studio]", "data-provenance")) !== "visitor",
    JSON.stringify(during10));
  t("#240/2 · …and no /factory/took-over is fired for a handover that did not happen",
    (await p10.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 0,
    JSON.stringify(await p10.evaluate(() => window.__pushed.slice())));
  // AND THE RUN STILL RUNS. The other half of the bug: the press must cost the reader nothing.
  await settled(p10);
  const after10 = await replayState(p10);
  t("#240/2 · …and the run plays through to its own board regardless — the press cost the reader nothing",
    after10.index === after10.beats && after10.places > 0
    && (await p10.locator(`${VIEWPORT} .stx-slot`).count()) === after10.places, JSON.stringify(after10));
  // READ OFF THE CHROME'S OWN LINE, not off the shell: the shell carries no data-provenance until a
  // handover sets one (replay-driver.mjs:744), so asserting "run" there would be asserting on an
  // attribute that never exists and would pass identically if the press HAD taken over and the
  // shell had been given "visitor" — the check would fail for the right reason and pass for two.
  t("#240/2 · …with the provenance line still naming the run as the author",
    (await p10.getAttribute(".stu-replay-provenance", "data-provenance")) === "run"
    && (await p10.getAttribute("[data-studio]", "data-provenance")) === null,
    `${await p10.getAttribute(".stu-replay-provenance", "data-provenance")} / ${await p10.getAttribute("[data-studio]", "data-provenance")}`);
  await p10.close();
  await cctx.close();

  // --- 11 · #240/3 · the INSTANT paths announce once, and that once names the acts ----------------
  // skipToEnd applies every remaining beat synchronously, and the reduced-motion arrival IS that
  // loop. An aria-live="polite" region speaks its FINAL value per task, so the act sentences written
  // on the way were overwritten by settle()'s completion sentence and a screen-reader user heard
  // none of them — studio-compile.mjs:197-203's recorded lesson, in a file that cites it.
  //
  // ASSERTED ON THE SENTENCE THAT IS ACTUALLY HEARD, which is the only assertion that can fail here:
  // "an act sentence was written" passes against the broken version too, because in one task the
  // writes all happen and none of them are announced.
  const rmctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const p11 = await rmctx.newPage();
  watch(p11, "replay announce");
  await p11.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settled(p11);
  const heard11 = (await p11.evaluate(() => document.querySelector("[data-studio-canvas] .stx-live").textContent.trim()));
  const acts11 = ["Plan", "Gate", "Implement", "Validate"].filter((a) => heard11.includes(a));
  t("#240/3 · the reduced-motion arrival's ONE announcement names the acts the run moved through",
    /moving through/.test(heard11) && acts11.length >= 2 && /\d+ places/.test(heard11),
    `${acts11.length} act(s): ${heard11}`);
  await p11.close();
  await rmctx.close();
  // The same claim for the reader who PRESSES Skip to end, and its control: an autoplayed arrival
  // announced each act as it happened, in its own task, and so must NOT repeat them at the end.
  const sctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p12 = await sctx.newPage();
  watch(p12, "replay skip");
  await p12.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p12.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  await countLive(p12);
  await p12.locator(".stu-replay-controls").getByRole("button", { name: "Skip to end", exact: true }).click();
  await settled(p12);
  const saidSkip = await liveSeen(p12);
  t("#240/3 · …and Skip to end says the same kind of sentence rather than emitting acts nothing can hear",
    /moving through/.test(saidSkip.last) && /\d+ places/.test(saidSkip.last), saidSkip.last);
  await p12.close();
  const p13 = await sctx.newPage();
  watch(p13, "replay autoplay");
  await p13.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settled(p13);
  const heard13 = await p13.evaluate(() => document.querySelector("[data-studio-canvas] .stx-live").textContent.trim());
  t("#240/3 · …while a run that AUTOPLAYED announced its acts as they happened and does not repeat them at the end",
    /The run finished:/.test(heard13) && !/moving through/.test(heard13), heard13);
  await p13.close();
  await sctx.close();
}

// ---------------------------------------------------------------------------------------------
// #207 · THE COMPILE BEAT. Its own context and its own cold load, because every assertion in it is
// about a page that has done NOTHING yet: the lazy vocabulary fetch is a claim about a request that
// was not made, and the byte-identical re-run is a claim about a DOM nothing has touched. Running it
// after the section above — which deep-links, clicks three panels and moves a block — would make
// both vacuous or worse.
//
// PHRASED AS RESULTING DOM THROUGHOUT, never as "an event fired". A beat that emitted perfectly and
// swapped nothing would pass an event-shaped assertion, and it is the swap that is the feature.
async function compilePass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  const open = async (context) => {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`compile pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`compile console: ${m.text()}`); });
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // #209 · SETTLED FIRST, and this is a real break rather than a tidy-up. Both handles above fire
    // at MOUNT, and since #209 the canvas is EMPTY at mount — the replay driver fills it over ~14 s.
    // Without this wait every assertion below runs against a half-built board: the compile's slot
    // count is nondeterministic, and the byte-identical re-run compares two different arrangements.
    // 30 s because 14 s of it is playback (replay-driver.mjs's PLAYBACK_MS says these move together).
    await page.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    await page.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
    return page;
  };
  // #218 · DECORATION SETTLED FIRST, and this is the same shape of break #209's `open()` above
  // records rather than a tidy-up. The docs layer decorates every rendered primitive with
  // data-studio-docs / tabindex / aria-describedby, and on the FIRST compile that decoration waits
  // on a fetch while on the second it is synchronous (the model is already loaded). Snapshot without
  // this wait and the two compiles differ by three attributes per node — a byte-identical assertion
  // failing for a page that is entirely correct, which is exactly the noise #209's note warns about.
  // Bounded and swallowed: whether decoration happens AT ALL is docsPass's assertion, not this
  // pass's, and a degraded page leaves BOTH snapshots undecorated and still comparable.
  const docsSettled = async (page) => {
    if (!(await page.locator(".stf-screen").count())) return;   // nothing compiled — nothing to decorate
    await page.waitForFunction(() => {
      const rendered = document.querySelectorAll(
        ".stf-screen .ds-metric-tile, .stf-screen .ds-list-row, .stf-screen .ds-sequence-step");
      return rendered.length > 0 && [...rendered].every((n) => n.hasAttribute("data-studio-docs"));
    }, null, { timeout: 15000 }).catch(() => {});
  };

  // The stage as data. `kinds` is what each slot HOLDS — the fat-marker block or a library primitive
  // — and it is read as a class name rather than as a count, so "the blocks became components" and
  // "the components stayed put" are two readings of one snapshot.
  const stageState = async (page) => (await docsSettled(page), page.evaluate(() => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    return {
      html: stage.outerHTML,
      slots: [...stage.querySelectorAll(".stx-slot")].map((n) => ({
        id: n.getAttribute("data-stx-id"),
        col: n.getAttribute("data-col"),
        row: n.getAttribute("data-row"),
        kind: [...n.children].filter((c) => !c.classList.contains("stx-grab"))
          .map((c) => c.className.split(" ")[0]).join("+"),
      })),
      state: document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state"),
      styled: [...stage.querySelectorAll(".stx-slot, .stx-slot > *")].filter((n) => n.hasAttribute("style")).length,
    };
  }));
  const settled = (page, want) => page.waitForFunction(
    (w) => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === w,
    want, { timeout: 20000 });
  const compileBtn = (page) => page.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true });
  const revertBtn = (page) => page.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true });

  const p = await open(ctx);

  // --- at rest ---------------------------------------------------------------------------------
  const rest = await stageState(p);
  t("#207 · at rest every slot holds a fat-marker block and no library primitive",
    rest.slots.length > 0 && rest.slots.every((s) => s.kind === "stu-place"),
    JSON.stringify(rest.slots.map((s) => s.kind)));
  // The lazy-fetch property, and the reason the pixel gate is safe on this page: at rest the beat has
  // cost the reader nothing. Asserted against the request log, which is the only thing that can see
  // a fetch that did not happen.
  t("#207 · …and the component vocabulary has NOT been fetched",
    !requests.some((u) => u.includes("vocabulary.json")),
    requests.filter((u) => u.includes("vocabulary")).join(" "));
  t("#207 · the beat's readiness handle resolved", await p.locator('[data-studio-compile="ready"]').count() === 1);
  t("#207 · and 'Back to blocks' is disabled until something has compiled", await revertBtn(p).isDisabled());
  // The mount must not GRAB focus — a fix for the hand-over below that reached for focus() at mount
  // would be a worse bug than the one it fixed, and nothing else on this page would notice.
  t("#207 · the mount takes no focus — at rest the document body still holds it",
    await focusedText(p) === "BODY", await focusedText(p));

  // --- the beat --------------------------------------------------------------------------------
  // DRIVEN FROM THE KEYBOARD, not by .click(): the focus hand-over below is a keyboard-reader
  // property, and webkit does not reliably focus a button on a pointer click — a click-driven
  // assertion would go red there for a reason that is not the bug.
  //
  // Announcements counted per step, in order. Counted EXACTLY: "at least one" passes for a beat that
  // announces only its end, which is the shape of the regression worth catching.
  await countLive(p);
  await compileBtn(p).focus();
  await p.keyboard.press("Enter");
  await settled(p, "rendered");
  const said = await liveSeen(p);
  const done = await stageState(p);
  // #212 reshaped the compiled DOM: a slot holds a SCREEN (heading + composed components + nav),
  // and the library primitives live inside it — both facts asserted, because "every slot holds a
  // screen" alone would pass for screens that composed nothing.
  t("#207 · the beat compiles every slot into a flow screen",
    done.slots.length === rest.slots.length && done.slots.every((s) => s.kind === "stf-screen"),
    JSON.stringify(done.slots.map((s) => s.kind)));
  const screensHold = await p.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot > .stf-screen")]
    .map((scr) => !!scr.querySelector('[class^="ds-"]')));
  t("#212 · …and every screen holds a library primitive (the committed board has work in every place)",
    screensHold.length > 0 && screensHold.every(Boolean), JSON.stringify(screensHold));
  // AC #1: the reader's arrangement survives the swap. This is the assertion that catches a
  // repopulate-instead-of-swap — a rebuilt stage would keep the same COUNT and hand out new ids.
  t("#207 · …in the same slots: every data-stx-id, data-col and data-row is unchanged",
    JSON.stringify(done.slots.map((s) => [s.id, s.col, s.row]))
      === JSON.stringify(rest.slots.map((s) => [s.id, s.col, s.row])),
    JSON.stringify(done.slots.map((s) => [s.id, s.col, s.row])));
  t("#207 · four steps announced, one per step, plus the settled sentence = 5",
    said.n === 5, `${said.n} announcement(s); last: ${said.last}`);
  // AND SPACED, which the count alone cannot see: an aria-live="polite" region announces only its
  // FINAL value, so two sentences written in the same task are ONE announcement while still
  // producing two MutationRecords. The floor is well under the implemented gap — this detects
  // coalescing, it is not a timing assertion on STEP_MS.
  t("#207 · …and spaced far enough apart to be five announcements rather than fewer",
    said.gaps.length === 4 && said.gaps.every((g) => g >= 30), `gaps: ${said.gaps.join(", ")}ms`);
  // H1: the verb hands focus to its counterpart. Without it, disabling the button the reader just
  // activated drops focus to <body> and the only way back to "Back to blocks" is Tab from the top of
  // the document — on every single use of this page's primary control.
  t("#207 · compiling moves focus to 'Back to blocks' rather than dropping it to the body",
    await focusedText(p) === "Back to blocks", await focusedText(p));
  // ONE FETCH PER CONSUMER, and since #218 this page has two of them — the beat's own memoized
  // load and system/studio-docs.mjs's join, which is deliberately the ONLY path to a docs model
  // (build-checks group 23 gates that) rather than a vocabulary threaded in from here, which would
  // couple two independent surfaces. The claim this assertion owns is unchanged and is stated
  // exactly: the BEAT does not refetch. Both halves are asserted, so a third fetch is still red.
  {
    const vocabHits = requests.filter((u) => u.includes("vocabulary.json"));
    t("#207 · …and the vocabulary was fetched exactly once by the BEAT, plus once by #218's docs join — never a third time",
      vocabHits.length === 2, vocabHits.join(" "));
  }
  // Group 7's claim on the RUNNING page, taken after the beat — the crossfade is the one effect an
  // implementer reaches for an inline opacity to write.
  t("#207 · no `style` attribute on any slot or composed node after the beat", done.styled === 0, `${done.styled}`);
  // AC #4's first net. The second is tooling/vt-verify.mjs's wrapped startViewTransition counter,
  // which catches a transition that OPENED and was skipped — this one cannot see that.
  const pseudos = await p.evaluate(() => document.getAnimations()
    .map((a) => a.effect && a.effect.pseudoElement).filter((x) => x && x.startsWith("::view-transition")));
  t("#207 · zero ::view-transition-* pseudos ran during the beat", pseudos.length === 0, pseudos.join(" "));

  // --- AC #3, byte-identical -------------------------------------------------------------------
  await revertBtn(p).focus();
  await p.keyboard.press("Enter");
  await settled(p, "blocks");
  const back = await stageState(p);
  t("#207 · 'Back to blocks' restores the fat-marker blocks in the same slots",
    back.html === rest.html, "the reverted stage is not byte-identical to the at-rest one");
  // The mirror image of the hand-over, and it needs asserting separately: revert() disables the
  // button it was activated from too.
  t("#207 · …and hands focus back to 'Compile the board'",
    await focusedText(p) === "Compile the board", await focusedText(p));
  // The second compile is the one M2's coalescing bug lived on — the vocabulary is memoized by then,
  // so `await vocabReady` is a bare microtask and the render step's sentence had nothing between it
  // and the settled one.
  await countLive(p);
  await p.keyboard.press("Enter");
  await settled(p, "rendered");
  const saidAgain = await liveSeen(p);
  t("#207 · a SECOND compile still announces five spaced sentences (the vocabulary is memoized by now)",
    saidAgain.n === 5 && saidAgain.gaps.length === 4 && saidAgain.gaps.every((g) => g >= 30),
    `${saidAgain.n} announcement(s); gaps: ${saidAgain.gaps.join(", ")}ms`);
  const again = await stageState(p);
  t("#207 · AC #3 · compiling a second time produces a byte-identical stage",
    again.html === done.html, "the second compile differs from the first");

  // ...and across LOADS, which is the half a same-page comparison cannot make: place()'s id counter
  // and any per-run string would agree with themselves and differ from a fresh page.
  const p2 = await open(ctx);
  await compileBtn(p2).click();
  await settled(p2, "rendered");
  const fresh = await stageState(p2);
  t("#207 · AC #3 · …and byte-identical across a fresh page load",
    fresh.html === done.html, "a fresh load compiled to a different stage");
  await ctx.close();

  // --- AC #5 · reduced motion ------------------------------------------------------------------
  // Quiet is not enough: a beat that never ran is trivially quiet, which is the defect class
  // vt-verify's canvas block names. The end state has to be REACHED, and it has to be the same one.
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const rp = await open(rctx);
  await countLive(rp);
  await compileBtn(rp).click();
  await settled(rp, "rendered");
  const rSaid = await liveSeen(rp);
  const rdone = await stageState(rp);
  // Reduced motion is a preference about MOTION. Dropping the pause to zero would coalesce the four
  // step sentences into the settled one and leave a screen-reader user with one announcement out of
  // five, so the gap is shortened here, never removed — the same assertion, the same floor.
  t("#207 · AC #5 · reduced motion still announces all five, still spaced",
    rSaid.n === 5 && rSaid.gaps.length === 4 && rSaid.gaps.every((g) => g >= 30),
    `${rSaid.n} announcement(s); gaps: ${rSaid.gaps.join(", ")}ms`);
  t("#207 · AC #5 · reduced motion still completes the beat — real screens on the stage",
    rdone.slots.length > 0 && rdone.slots.every((s) => s.kind === "stf-screen"),
    JSON.stringify(rdone.slots.map((s) => s.kind)));
  t("#207 · AC #5 · …and reaches the IDENTICAL end state",
    rdone.html === done.html, "the reduced-motion stage differs from the no-preference one");
  const ranims = await rp.evaluate(() => [...document.querySelectorAll(".stx-slot > *")]
    .reduce((n, el) => n + el.getAnimations().length, 0));
  t("#207 · AC #5 · …with no crossfade running", ranims === 0, `${ranims} animation(s)`);
  await rctx.close();

  await flowPass(browser, t, errors);
  await teardownPass(browser, t, errors);
  await keepPass(browser, t, errors);
}

// ---------------------------------------------------------------------------------------------
// #212 · THE FLOW: places become screens, connections become navigation. The running-page half of
// build-checks group 19's boundary statement — the pointer click, the keyboard path, the focus
// landing, the ONE announced sentence per navigation, the byte-identical revert and reduced motion
// are all here, walked end to end on the committed fieldwork board the replay builds.
async function flowPass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const open = async (context) => {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`flow pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`flow console: ${m.text()}`); });
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // SETTLED FIRST — the beat is setEnabled(false) until the replay settles (#240/1,
    // studio.mjs's disable), so a click before settle silently no-ops and every assertion below
    // would read the blocks.
    await page.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    await page.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
    return page;
  };
  const compileNow = async (page) => {
    await page.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
    // Never a fixed sleep: the beat paces 4 × 420 ms plus a first-compile vocabulary round trip.
    await page.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "rendered",
      null, { timeout: 20000 });
  };
  // One navigation must produce ONE live-region write carrying the fixed counted sentence. Waited
  // for as a CHANGE to the expected string (polling the same string twice counts one announcement
  // as two); countLive's MutationRecords make the exactness assertable beside it.
  const navigated = async (page, want) => {
    await page.waitForFunction((w) => document.querySelector("[data-studio-canvas] .stx-live").textContent.trim() === w,
      want, { timeout: 5000 });
    return liveSeen(page);
  };
  const landedOn = (page, targetIndex) => page.evaluate((idx) => {
    const wrapper = [...document.querySelectorAll("[data-studio-canvas] .stx-slot")][idx];
    const active = document.activeElement;
    return { inWrapper: !!wrapper && wrapper.contains(active), onHeading: !!active && active.classList.contains("stf-screen-name") };
  }, targetIndex);

  const p = await open(ctx);
  // The committed board, fetched by this driver from the same file the page plays — the walk below
  // follows ITS connections and labels, never a hand-typed list.
  const board = await p.evaluate(() => fetch("/replay/build-fieldwork-dispatch.board.json").then((r) => r.json()));
  const stageRest = await p.evaluate(() => document.querySelector("[data-studio-canvas] .stx-stage").outerHTML);

  await compileNow(p);
  const screensOn = await p.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot > .stf-screen")].length);
  t("#212 · AC #3 · compile puts one screen per place on the stage",
    screensOn === board.places.length, `${screensOn} screens for ${board.places.length} places`);
  const goCount = await p.locator(`${VIEWPORT} .stf-go`).count();
  t("#212 · …with one nav button per connection", goCount === board.connections.length,
    `${goCount} nav buttons for ${board.connections.length} connections`);

  // #251 · presentation, not just reachability: the committed flow FITS its compiled slots. The
  // pixel gate never interacts and groups 12/19 are DOM-free, so this is the only gate that can
  // see a screen guillotined behind its own scroller. Both bounds printed on every run.
  const boxes = await p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot > .stf-screen")].map((s) => ({
      label: s.querySelector(".stf-screen-name")?.textContent ?? "?",
      sh: s.scrollHeight, ch: s.clientHeight, sw: s.scrollWidth, cw: s.clientWidth,
    })));
  t("#251 · every compiled screen of the committed board shows its whole content — no internal vertical scroll",
    boxes.length > 0 && boxes.every((b) => b.sh <= b.ch),
    boxes.map((b) => `${b.label}: ${b.sh}/${b.ch}v`).join(" · "));
  t("#251 · no compiled screen scrolls horizontally — the list-row value stays inside the screen",
    boxes.length > 0 && boxes.every((b) => b.sw <= b.cw),
    boxes.map((b) => `${b.label}: ${b.sw}/${b.cw}h`).join(" · "));

  // THE POINTER WALK, end to end along the dispatch chain p1→p2→p3→p4: after each hop, focus sits
  // on the target screen's heading inside the target wrapper, and the live region carries exactly
  // "<label>, screen k of N." — one announcement, counted exactly.
  let fromIndex = 0;
  for (const targetId of ["p2", "p3", "p4"]) {
    const targetIndex = board.places.findIndex((place) => place.id === targetId);
    const want = `${board.places[targetIndex].label}, screen ${targetIndex + 1} of ${board.places.length}.`;
    await countLive(p);
    await p.locator(`${VIEWPORT} .stx-slot`).nth(fromIndex).locator(`.stf-go[data-flow-target="${targetId}"]`).click();
    const said = await navigated(p, want);
    const landed = await landedOn(p, targetIndex);
    t(`#212 · AC #3 · pointer: navigating to ${targetId} focuses the target screen's heading, announced ONCE with the counted sentence`,
      landed.inWrapper && landed.onHeading && said.n === 1 && said.last === want,
      `${JSON.stringify(landed)} n=${said.n} last="${said.last}"`);
    fromIndex = targetIndex;
  }

  // BACK TO BLOCKS after navigating: the screens are discarded whole (listeners included) and the
  // stage is the at-rest one byte for byte — AC #3's revert half with the flow exercised first.
  await p.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
  await p.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "blocks",
    null, { timeout: 10000 });
  const stageBack = await p.evaluate(() => document.querySelector("[data-studio-canvas] .stx-stage").outerHTML);
  t("#212 · revert after navigating returns the fat-marker stage byte-identically",
    stageBack === stageRest, "the reverted stage differs from the at-rest one");

  // THE KEYBOARD LEG, on a fresh compile — which also proves the navigation re-wires on a
  // re-compile. Tab from the first wrapper's grab handle reaches the nav button (the heading is
  // tabindex=-1 and the composed primitives are non-interactive, so it is the next stop), Enter
  // navigates, and the same two facts hold.
  await compileNow(p);
  await p.locator(`${VIEWPORT} .stx-slot`).nth(0).locator(".stx-grab").focus();
  let reached = false;
  for (let i = 0; i < 30 && !reached; i += 1) {
    await p.keyboard.press("Tab");
    reached = await p.evaluate(() => {
      const active = document.activeElement;
      return !!(active && active.classList.contains("stf-go") && active.getAttribute("data-flow-target") === "p2");
    });
  }
  t("#212 · AC #3 · keyboard: Tab from the grab handle reaches the entry screen's nav button", reached,
    "30 Tabs never landed on .stf-go[data-flow-target=p2]");
  const kbTargetIndex = board.places.findIndex((place) => place.id === "p2");
  const kbWant = `${board.places[kbTargetIndex].label}, screen ${kbTargetIndex + 1} of ${board.places.length}.`;
  await countLive(p);
  await p.keyboard.press("Enter");
  const kbSaid = await navigated(p, kbWant);
  const kbLanded = await landedOn(p, kbTargetIndex);
  t("#212 · AC #3 · keyboard: Enter navigates with the same focus landing and the same single announcement",
    kbLanded.inWrapper && kbLanded.onHeading && kbSaid.n === 1 && kbSaid.last === kbWant,
    `${JSON.stringify(kbLanded)} n=${kbSaid.n} last="${kbSaid.last}"`);
  await p.close();

  // REDUCED MOTION: the same end state — focus landed, sentence announced — with the scroll's
  // smooth behavior gated off in wireFlow, so nothing animates for the assertions to race.
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const rp = await open(rctx);
  await compileNow(rp);
  const rTargetIndex = board.places.findIndex((place) => place.id === "p2");
  const rWant = `${board.places[rTargetIndex].label}, screen ${rTargetIndex + 1} of ${board.places.length}.`;
  await countLive(rp);
  await rp.locator(`${VIEWPORT} .stx-slot`).nth(0).locator('.stf-go[data-flow-target="p2"]').click();
  const rSaid = await navigated(rp, rWant);
  const rLanded = await landedOn(rp, rTargetIndex);
  t("#212 · AC #3 · reduced motion: the navigation reaches the same end state, announced the same once",
    rLanded.inWrapper && rLanded.onHeading && rSaid.n === 1 && rSaid.last === rWant,
    `${JSON.stringify(rLanded)} n=${rSaid.n} last="${rSaid.last}"`);
  await rctx.close();

  // #251 · a carry cannot span the swap: the compiled state grows the tracks, and a gesture's
  // geometry is cached at pick-up — so a sticky or keyboard carry surviving the Compile click
  // would place drops against 140px rows on a 480px grid (and would be carrying a block whose
  // content just became a screen). The orchestrator cancels it when onState says the content
  // actually swapped. This case is the discriminator: without the guard the gesture survives.
  const cp = await open(ctx);
  const carryOrigin = await cp.evaluate(() => {
    const w = document.querySelector("[data-studio-canvas] .stx-slot");
    return { col: w.getAttribute("data-col"), row: w.getAttribute("data-row") };
  });
  await cp.locator(`${VIEWPORT} .stx-slot`).nth(0).locator(".stx-grab").click();
  await cp.waitForFunction(() => document.querySelector("[data-studio-canvas] .stx-live").textContent.includes("picked up"),
    null, { timeout: 5000 });
  // One real step before the swap (PR #255 review M1): a carry that never moved satisfies the
  // at-origin conjunct below vacuously — origin === current from pick-up, so cancel()'s restore
  // line could be deleted and the row would stay green. Displacing the preview to row 2 (free on
  // the committed board — every place arranges along row 1) makes the restore the only way back,
  // and the wait proves the displacement really happened rather than assuming the keypress landed.
  await cp.keyboard.press("ArrowDown");
  await cp.waitForFunction((o) => document.querySelector("[data-studio-canvas] .stx-slot").getAttribute("data-row") !== o,
    carryOrigin.row, { timeout: 5000 });
  await compileNow(cp);
  const carried = await cp.evaluate(() => import("/system/studio-verbs.mjs").then((m) => {
    const w = document.querySelector("[data-studio-canvas] .stx-slot");
    return {
      gestureLive: m.getVerbs().gesture !== null,
      picked: document.querySelectorAll("[data-studio-canvas] .is-picked").length,
      col: w.getAttribute("data-col"), row: w.getAttribute("data-row"),
    };
  }));
  t("#251 · a live sticky carry is cancelled when the compile swap lands — gesture void, node at origin",
    !carried.gestureLive && carried.picked === 0
      && carried.col === carryOrigin.col && carried.row === carryOrigin.row,
    JSON.stringify({ origin: carryOrigin, after: carried }));
  await cp.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// #210 · THE KEEP RAIL, THE EXPORT AND THE ?b= RESTORE. Everything here is a running-page fact that
// tooling/build-checks.mjs group 17 structurally cannot reach, and group 17's own summary says so:
// that group owns the STRING the exporter produces, and this owns whether a browser really hands a
// file over, whether the tiers really hide, whether the address bar really carries the arrangement,
// and whether the declined mount really leaves a live Compile button.
//
// THE BARE-BOARD STATE IS BUILT HERE, WITH THE PAGE'S OWN CODEC. /factory has no remove verb
// (studio-verbs.mjs owns move/undo/redo only) and Act 0's "Clear the canvas" clears the PACK, not
// the board — so the only reachable bare board on this route is a ?b= link carrying one, and
// encodeBuild makes it. Going via /build to produce it would make this case a test of that page.
async function keepPass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  };
  const railReady = (p) => p.waitForSelector('[data-studio-keep="ready"]', { timeout: 20000 });
  const settled = (p) => p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  // Read as CLIENT RECTS rather than as the hidden attribute: `hidden` is inert wherever an author
  // rule sets display, which is the trap factory.html:79's [hidden] rule exists to close — so the
  // only assertion that proves the tier is really gone is that it occupies no box (memory
  // `hidden-defeated-by-author-display`; #209's Pause-button case makes the same call).
  const tiers = (p) => p.evaluate(() => {
    const rects = (s) => { const n = document.querySelector(s); return n ? n.getClientRects().length : -1; };
    return {
      empty: rects("[data-keep-empty]"),
      exportTier: rects("[data-keep-export]"),
      artifacts: rects("[data-keep-artifacts]"),
      share: rects("[data-keep-share]"),
    };
  });

  // --- 1 · the rail at rest, on the board the replay built --------------------------------------
  const p1 = await ctx.newPage();
  watch(p1, "keep");
  await p1.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await railReady(p1);
  await settled(p1);
  const full = await tiers(p1);
  t("#210 · AC #6 · with a board on the canvas all three tiers are on the page and the empty state is not",
    full.empty === 0 && full.exportTier === 1 && full.artifacts === 1 && full.share === 1, JSON.stringify(full));
  const buttons = await p1.locator("[data-studio-keep] button").evaluateAll((bs) => bs.map((b) => b.textContent));
  t("#210 · …and it offers the export, the four /build downloads and the share control",
    buttons.length === 6 && buttons[0].includes("runnable") && buttons[5].includes("Copy"), JSON.stringify(buttons));
  // NOTHING FETCHED AT REST. #206's lazy-panel property is what the pixel gate depends on, and the
  // rail must not be what breaks it: the vocabulary and the three stylesheets belong to the export
  // CLICK. Counted from the moment the rail was ready, so the replay's own two artifact fetches —
  // which happen before it — are not what this is measuring.
  const atRest = [];
  p1.on("request", (r) => atRest.push(r.url()));
  await p1.waitForTimeout(400);
  t("#210 · the rail fetches NOTHING at rest — no vocabulary, no stylesheets until the reader asks",
    atRest.filter((u) => /vocabulary\.json|tokens\.|components\.css/.test(u)).length === 0, JSON.stringify(atRest));

  // --- 2 · the export click really hands a file over ---------------------------------------------
  const [download] = await Promise.all([
    p1.waitForEvent("download", { timeout: 30000 }),
    p1.locator("[data-keep-export] button").click(),
  ]);
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk;
  t("#210 · AC #2 · the export button downloads a file, and it is named for what it is",
    download.suggestedFilename() === "prototype.html", download.suggestedFilename());
  // Parsed as HTML BY A BROWSER rather than pattern-matched: group 17 already owns the string, and
  // what this adds is that a real engine reads it as a document containing the composed flow.
  // (#210's coordinate assertion retired with the coordinates: since #212 the file's layout is
  // board order × affordance order, the share link carries the arrangement, and the provenance
  // claims no geometry — so there is nothing on the canvas for the file to be compared against.)
  const parsed = await p1.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return {
      sections: [...doc.querySelectorAll("section.sx-screen")].map((s) => s.id),
      tiles: doc.querySelectorAll(".ds-metric-tile").length,
      anchors: [...doc.querySelectorAll(".sx-nav a")].map((a) => a.getAttribute("href")),
      scripts: doc.querySelectorAll("script").length,
      title: doc.title,
    };
  }, text);
  const onCanvas = await p1.locator(`${VIEWPORT} .stx-slot`).count();
  const boardCounts = await p1.evaluate(() => import("/system/studio.mjs").then((m) => {
    const s = m.getStudio();
    return { places: s.board.places.length, connections: s.board.connections.length };
  }));
  t("#212 · AC #5 · the downloaded bytes parse as HTML carrying one screen per block on the canvas",
    parsed.sections.length === onCanvas && parsed.sections.length === boardCounts.places,
    `${parsed.sections.length} sections for ${onCanvas} blocks`);
  t("#212 · AC #5 · …one nav anchor per connection, every one a fragment resolving to a section in the file",
    parsed.anchors.length === boardCounts.connections
    && parsed.anchors.every((h) => h && h.startsWith("#") && parsed.sections.includes(h.slice(1))),
    `${parsed.anchors.length} anchors for ${boardCounts.connections} connections: ${JSON.stringify(parsed.anchors)}`);
  t("#212 · …and the entry screen still carries one tile per place (the flow extends the single screen)",
    parsed.tiles === boardCounts.places, `${parsed.tiles} tiles for ${boardCounts.places} places`);
  t("#210 · …and it carries no script at all — nothing in it can run, and nothing needs to",
    parsed.scripts === 0, `${parsed.scripts} script(s)`);
  const canvasSlots = await p1.locator(`${VIEWPORT} .stx-slot`).evaluateAll((ws) => ws.map((w) => `sx-c${w.getAttribute("data-col")}-r${w.getAttribute("data-row")}`));

  // --- 3 · the copy click, the address bar, and the `g` field only this page can produce ---------
  //
  // THE MOVE FIRST, AND IT IS WHAT MAKES EVERY COORDINATE ASSERTION BELOW A DISCRIMINATOR. The
  // replay places every block at { col: index + 1, row: 1 } (replay-driver.mjs:499-503), which is
  // byte-for-byte what arrangeBoard produces with no `g` in the link at all (studio.mjs:90-92) — so
  // the receiver in section 6 reached the identical layout whether or not studio.mjs:396-399 ever
  // applied the sender's field. Deleting that whole restore branch left this pass green, which
  // means the `?b=` arrangement round trip had running-page coverage of its ENCODE half and none of
  // its DECODE half: the `check-that-cannot-fail` shape, in the check written for the ticket's
  // headline claim. One block off row 1 — through the same getVerbs() injection seam #205 uses,
  // never a window.__ global — is the whole fix. (PR #241 review, Medium 3.)
  const movedId = await idAt(p1, 2, 1);
  await inject(p1, { type: "ui.move", source: "agent", target: { component: "block", id: movedId }, params: { col: 2, row: 3 } });
  await p1.waitForFunction((id) => document.querySelector(`.stx-slot[data-stx-id="${id}"]`)?.getAttribute("data-row") === "3",
    movedId, { timeout: 5000 });
  const movedSlots = await p1.locator(`${VIEWPORT} .stx-slot`).evaluateAll((ws) => ws.map((w) => `sx-c${w.getAttribute("data-col")}-r${w.getAttribute("data-row")}`));
  // The anti-vacuity guard on the guard: if the injection silently did nothing, the arrangement is
  // the default one again and everything downstream is back to proving nothing.
  t("#210 · …and the arrangement about to be copied is NOT the default row-1 one, or nothing below can fail",
    JSON.stringify(movedSlots) !== JSON.stringify(canvasSlots) && movedSlots.some((s) => !s.endsWith("-r1")),
    `${JSON.stringify(movedSlots)} vs ${JSON.stringify(canvasSlots)}`);
  await p1.locator("[data-keep-share] button").click();
  await p1.waitForTimeout(400);
  const shared = p1.url();
  // NOT VIRTUAL — the settledUrl contract, driven rather than reasoned about. Two routes now fire
  // from this rail's own adjacent buttons, so a link built inside the other's 50 ms window would
  // carry /factory/exported as its pathname and 404 on reload.
  t("#210 · AC #5 · the copied link's pathname is the REAL one, not a virtual route",
    new URL(shared).pathname === "/factory.html", new URL(shared).pathname);
  const decoded = await p1.evaluate(async () => {
    const { decodeBuild, SHARE_PARAM } = await import("/system/build-share.mjs");
    const param = new URL(location.href).searchParams.get(SHARE_PARAM);
    if (!param) return { reason: "no ?b= in the address bar at all" };
    const { state, reason } = await decodeBuild(param);
    return { reason, places: state && state.board.places.length, arrangement: state && state.arrangement };
  });
  t("#210 · …and it decodes back to this board", decoded.places === onCanvas, JSON.stringify(decoded).slice(0, 160));
  // THE HEADLINE. /build's rail structurally cannot produce a `g` — it has no canvas — so this is
  // the assertion that distinguishes the two rails, and the codec drops `g` SILENTLY when the
  // arrangement stops describing the board, which is exactly how this could ship green and wrong.
  t("#210 · …carrying the ARRANGEMENT, which is the one thing /build's rail cannot express",
    Array.isArray(decoded.arrangement) && decoded.arrangement.length === onCanvas
    && JSON.stringify(decoded.arrangement.map((a) => `sx-c${a.col}-r${a.row}`)) === JSON.stringify(movedSlots),
    JSON.stringify(decoded.arrangement));
  await p1.close();

  // --- 4 · both routes fire ONCE each, and the real URL comes back -------------------------------
  // Observed through history pushes, attached BEFORE the clicks — #209's own race, and the reason
  // that pass route-delays its artifact fetch: a listener attached after the first push counts short.
  const p4 = await ctx.newPage();
  watch(p4, "keep");
  await p4.addInitScript(() => {
    window.__pushes = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, url) => { window.__pushes.push(String(url)); return real(s, ti, url); };
  });
  await p4.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await railReady(p4);
  await settled(p4);
  await Promise.all([
    p4.waitForEvent("download", { timeout: 30000 }),
    p4.locator("[data-keep-export] button").click(),
  ]);
  await p4.locator("[data-keep-share] button").click();
  // Twice each: a shared fire-once flag would let whichever fired first suppress the other.
  await Promise.all([
    p4.waitForEvent("download", { timeout: 30000 }),
    p4.locator("[data-keep-export] button").click(),
  ]);
  await p4.locator("[data-keep-share] button").click();
  await p4.waitForTimeout(600);
  const pushed = await p4.evaluate(() => window.__pushes);
  t("#210 · AC #5 · /factory/exported fires exactly once across two export clicks",
    pushed.filter((u) => u === "/factory/exported").length === 1, JSON.stringify(pushed));
  t("#210 · AC #5 · /factory/link-copied fires exactly once across two copy clicks",
    pushed.filter((u) => u === "/factory/link-copied").length === 1, JSON.stringify(pushed));
  t("#210 · …and neither carries the visitor's board into the path",
    pushed.every((u) => !u.includes("?") && !u.includes("#")), JSON.stringify(pushed));
  t("#210 · …and the reader is left on the real URL, with the ?b= the copy promised was there",
    new URL(p4.url()).pathname === "/factory.html" && p4.url().includes("?b="), p4.url());
  await p4.close();

  // --- 5 · AC #6, THE OTHER DIRECTION: a bare board hides all three tiers ------------------------
  // The link is built by this driver with the page's own encodeBuild, for the reason in the header.
  const p5 = await ctx.newPage();
  watch(p5, "keep");
  await p5.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await railReady(p5);
  const bareLink = await p5.evaluate(async () => {
    const { encodeBuild, shareUrl } = await import("/system/build-share.mjs");
    const { DEFAULT_ANSWERS } = await import("/system/build-questions.mjs");
    return shareUrl(location.origin + "/factory.html", await encodeBuild({
      answers: DEFAULT_ANSWERS, board: { places: [], connections: [] }, pack: null,
    }));
  });
  await p5.close();

  const p6 = await ctx.newPage();
  watch(p6, "keep");
  await p6.goto(bareLink, { waitUntil: "load" });
  await railReady(p6);
  const bare = await tiers(p6);
  t("#210 · AC #6 · a bare board hides ALL THREE tiers and shows the empty state instead",
    bare.empty === 1 && bare.exportTier === 0 && bare.artifacts === 0 && bare.share === 0, JSON.stringify(bare));
  t("#210 · …and the canvas really is bare, or the case above is vacuous",
    (await p6.locator(`${VIEWPORT} .stx-slot`).count()) === 0);
  await p6.close();

  // --- 6 · THE DECLINED MOUNT (#240's carried-over finding 6) ------------------------------------
  // Reachable for the first time: studio.mjs recorded this branch before any code path led to it.
  const p7 = await ctx.newPage();
  watch(p7, "keep");
  const acts = [];
  await p7.addInitScript(() => { window.__acts = []; });
  await p7.goto(shared, { waitUntil: "load" });
  // The bus is watched from the page's own seam, never a window.__ global on the module side.
  await p7.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await p7.evaluate(async () => {
    const { getVerbs } = await import("/system/studio-verbs.mjs");
    const v = getVerbs();
    if (v) for (const type of ["ui.move", "agent.build-op", "ui.undo", "ui.redo"]) {
      v.bus.on(type, (a) => window.__acts.push({ type, source: a.source }));
    }
  });
  await p7.waitForFunction(() => {
    const v = document.querySelector("[data-studio]")?.getAttribute("data-replay");
    return v && v !== "loading";
  }, null, { timeout: 30000 });
  await p7.waitForTimeout(400);
  const declined = await p7.evaluate(() => ({
    replay: document.querySelector("[data-studio]").getAttribute("data-replay"),
    provenance: document.querySelector("[data-studio]").getAttribute("data-provenance"),
    slots: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")]
      .map((w) => `sx-c${w.getAttribute("data-col")}-r${w.getAttribute("data-row")}`),
    transport: document.querySelector(".stu-replay-controls")
      ? getComputedStyle(document.querySelector(".stu-replay-controls")).display : "gone",
    note: document.querySelector(".stu-replay-provenance")?.textContent || "",
    acts: window.__acts,
  }));
  t("#210 · the driver mounts DECLINED on a ?b= arrival rather than assembling over the visitor's board",
    declined.replay === "declined", declined.replay);
  // Against movedSlots, NOT the default row-1 layout the replay produces: the receiver can only
  // reach these coordinates by applying the link's `g` field, which is what makes this the decode
  // half's only running-page proof (see section 3's note).
  t("#210 · …with the SENDER'S board on the canvas, at the SENDER'S coordinates — reachable only through the link's `g`",
    JSON.stringify(declined.slots) === JSON.stringify(movedSlots), `${JSON.stringify(declined.slots)} vs ${JSON.stringify(movedSlots)}`);
  t("#210 · …and NOTHING was emitted — a declined driver plays no beat at all",
    declined.acts.length === 0, JSON.stringify(declined.acts));
  t("#210 · …the transport is genuinely not painted (COMPUTED display — `hidden` is inert under an author rule)",
    declined.transport === "none" || declined.transport === "gone", declined.transport);
  t("#210 · …and the chrome says why, rather than reading as a replay that broke",
    /came in on the link/.test(declined.note), declined.note.slice(0, 90));
  // THE ONE THAT WOULD OTHERWISE SHIP A DEAD PRIMARY CONTROL. studio.mjs disables the beat
  // immediately before mounting the driver and re-enables on settle / take-over / mount failure —
  // none of which a declined mount reaches. Asserted as the beat actually COMPILING, not as a
  // disabled attribute: an enabled button wired to nothing passes the narrower check.
  const compileBtn = p7.locator("button", { hasText: "Compile the board" }).first();
  t("#210 · …and the Compile button is LIVE, not disabled by a driver that will never settle",
    !(await compileBtn.isDisabled()));
  await compileBtn.click();
  await p7.waitForFunction(() => document.querySelector("[data-studio-canvas]")?.getAttribute("data-compile-state") === "rendered",
    null, { timeout: 30000 }).catch(() => {});
  t("#210 · …and it really compiles the visitor's own board, end to end",
    (await p7.getAttribute(VIEWPORT, "data-compile-state")) === "rendered",
    await p7.getAttribute(VIEWPORT, "data-compile-state"));
  t("#210 · …and the rail is ready on this route too", (await p7.getAttribute("[data-studio-keep]", "data-studio-keep")) === "ready");
  await p7.close();

  // --- 7 · a REFUSED link scrubs the param, keeps its reason, and still plays the run -------------
  const p8 = await ctx.newPage();
  watch(p8, "keep");
  await p8.goto(`${BASE}/factory.html?b=NOTAREALPAYLOAD`, { waitUntil: "load" });
  await p8.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  t("#210 · a refused link scrubs its own ?b= — a reader who reloads does not meet the same failure twice",
    !p8.url().includes("?b="), p8.url());
  await settled(p8);
  // AFTER the replay has settled, deliberately: canvas.say's live region is transient and the run
  // narrates over it within a second, which is the whole reason the notice node exists.
  const notice = await p8.evaluate(() => {
    const n = document.querySelector("[data-studio-notice]");
    return n ? { text: n.textContent, rects: n.getClientRects().length } : null;
  });
  t("#210 · …and the reason is still on the page after the run has narrated over the live region",
    Boolean(notice) && notice.rects === 1 && /could not be read/.test(notice.text), JSON.stringify(notice).slice(0, 140));
  t("#210 · …while the recorded run still plays, because a bad link is not a reason to withhold it",
    (await p8.getAttribute("[data-studio]", "data-replay")) === "settled");
  await p8.close();

  // --- 8 · the no-link page never paints the notice ----------------------------------------------
  // The other direction, and it is a pixel-baseline claim: the notice must contribute NOTHING at rest
  // on the page the gate captures.
  const p9 = await ctx.newPage();
  watch(p9, "keep");
  await p9.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await railReady(p9);
  await settled(p9);
  t("#210 · a /factory with no link paints no notice at all — the pixel baseline is unaffected",
    (await p9.evaluate(() => document.querySelector("[data-studio-notice]").getClientRects().length)) === 0);
  const styled = await p9.evaluate(() => [...document.querySelectorAll("[data-studio-keep] *")]
    .filter((n) => n.hasAttribute("style")).length);
  t("#210 · nothing the rail drew carries a style attribute — group 7's claim, on the running page",
    styled === 0, `${styled} element(s) carry one`);
  await p9.close();

  // --- 9 · A DESIGN WORN IN FROM HOME REACHES THE EXPORTED FILE (PR #241 review, High 1) ---------
  //
  // The bug this closes shipped green through every gate in the repo, and the reason is worth
  // keeping: build-checks group 17 passes `inlineTokens` straight into exportHtml, so it can only
  // ever assert what the exporter does with values it was HANDED — never where the DOM-side half
  // looks for them. It looked in two places, the <link> and [data-build-stage], and #130's "wear it
  // across the visit" uses neither: an imported record is a <style> element and a derived one is
  // inline props on :root (pack-boot.js:56-62, :84-87). A reader wearing their own colours, on a
  // page whose Act 0 SAYS SO, downloaded a neutral file that stated in its provenance block that
  // they had imported nothing.
  //
  // SEEDED THROUGH STORAGE BEFORE `goto`, which is exactly how a reader arrives: home writes the
  // record and pack-boot.js applies it pre-paint on the next page. Nothing here reaches into the
  // studio's own modules — the whole point is to drive the path a visit actually takes.
  const wornCase = async (label, seed, accent, expect) => {
    const pw = await ctx.newPage();
    watch(pw, "keep-worn");
    await pw.addInitScript(seed);
    await pw.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await railReady(pw);
    await settled(pw);
    // The page really is wearing it, or the export assertion below proves nothing about a claim
    // the page never made.
    const onPage = await pw.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim());
    t(`#210 · a ${label} pack worn in from home is on the /factory page itself`, onPage === accent, `${onPage} vs ${accent}`);
    const [dl] = await Promise.all([
      pw.waitForEvent("download", { timeout: 30000 }),
      pw.locator("[data-keep-export] button").click(),
    ]);
    const st = await dl.createReadStream();
    let bytes = "";
    for await (const chunk of st) bytes += chunk;
    t(`#210 · …and the DOWNLOADED BYTES carry it, rather than the site's neutral pack`,
      bytes.includes(`--color-accent:${accent}`), bytes.slice(bytes.indexOf("<style>:root{"), bytes.indexOf("<style>:root{") + 120));
    // The honesty half, and the one that made this a hard-contract failure rather than a fidelity
    // one: the file used to STATE that nothing was imported while the reader was looking at their
    // own colours on the page that produced it.
    t(`#210 · …and its provenance names the ${label} design instead of denying there was one`,
      !bytes.includes("No design imported") && bytes.includes(expect),
      bytes.slice(bytes.indexOf("<p>Wearing"), bytes.indexOf("<p>Wearing") + 160) || "no Wearing line at all");
    await pw.close();
  };

  await wornCase("imported", () => {
    sessionStorage.setItem("factory-pack-imported", JSON.stringify({
      v: 1, source: "imported", slug: "acme", label: "Acme", fileName: "acme-tokens.json", ts: 1234567890,
      tokens: { "--color-accent": "#c2185b", "--color-accent-strong": "#8c1145" },
    }));
  }, "#c2185b", "acme-tokens.json");

  await wornCase("derived", () => {
    localStorage.setItem("factory-pack", "derived");
    localStorage.setItem("factory-pack-derived", JSON.stringify({
      v: 1, source: "derived", label: "your brand", ts: 1234567891, brandColor: "#0b7285",
      tokens: { "--color-accent": "#0b7285", "--color-accent-strong": "#095c6b" },
    }));
  }, "#0b7285", "derived palette");

  // --- 10 · THE FEED LINK, POST-#212: THE FLOW REMOVED THE ARRANGEMENT DIVERGENCE ----------------
  //
  // #241's M2 case lived here: a `shape: stream` ?b= link names the FEED pattern, whose slots are
  // counted off the WHOLE board (6 of this 4-place board's 7 affordances), and applySwap used to
  // place() the surplus onto the canvas — more wrappers than places, so the copied link carried no
  // arrangement and the confirmation had to say so. #212 DELETED those branches: the swap's unit is
  // the screen, screens are 1:1 with wrappers by construction, and the six feed rows render INSIDE
  // the entry screen with streamNote's truncation sentence beside them. The state this section
  // drove is therefore unreachable, and the SAME LINK now proves the new truth instead: the wrapper
  // count never moves, the truncation is stated on the stage, and the copied link DOES carry the
  // arrangement, labelled as carrying it. The no-arrangement caveat machinery stays in
  // studio-keep.mjs on the tripwire's terms — it only speaks when the state occurs — and no known
  // path produces it, which is exactly what these assertions would catch changing.
  const p10 = await ctx.newPage();
  watch(p10, "keep-feed");
  await p10.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  const feedLink = await p10.evaluate(async (link) => {
    const { decodeBuild, encodeBuild, shareUrl, SHARE_PARAM } = await import("/system/build-share.mjs");
    const { state } = await decodeBuild(new URL(link).searchParams.get(SHARE_PARAM));
    return shareUrl(location.origin + "/factory.html", await encodeBuild({
      ...state, answers: { ...state.answers, shape: "stream" },
    }));
  }, shared);
  await p10.goto(feedLink, { waitUntil: "load" });
  await railReady(p10);
  await p10.waitForFunction(() => document.querySelector("[data-studio]")?.getAttribute("data-replay") === "declined",
    null, { timeout: 30000 });
  await p10.locator("button", { hasText: "Compile the board" }).first().click();
  await p10.waitForFunction(() => document.querySelector("[data-studio-canvas]")?.getAttribute("data-compile-state") === "rendered",
    null, { timeout: 30000 });
  const feedState = await p10.evaluate(() => ({
    wrappers: document.querySelectorAll("[data-studio-canvas] .stx-slot").length,
    screens: document.querySelectorAll("[data-studio-canvas] .stx-slot > .stf-screen").length,
    rows: document.querySelectorAll("[data-studio-canvas] .stx-slot:first-child .stf-screen .ds-list-row").length,
    note: document.querySelector("[data-studio-canvas] .stf-note")?.textContent || "",
  }));
  t("#212 · a `shape: stream` link compiles IN PLACE — the wrapper count never moves, so the state M2 lived in is gone",
    feedState.wrappers === 4 && feedState.screens === 4, JSON.stringify(feedState));
  t("#212 · …the feed entry screen carries six rows inside ONE screen (the whole-board read, capped)",
    feedState.rows === 6, `${feedState.rows} rows`);
  t("#212 · …with streamNote's truncation sentence on the stage, denominator included",
    /shows 6 of the 7 affordances/.test(feedState.note), feedState.note);
  // FOCUSED first: clipboard access is permissioned and a background page is refused, which sends
  // the handler down its select-the-field branch — the claims below must hold on either branch.
  await p10.bringToFront();
  await p10.locator("[data-keep-share] button").click();
  await p10.waitForTimeout(400);
  const feedOut = await p10.evaluate(async () => {
    const { decodeBuild, SHARE_PARAM } = await import("/system/build-share.mjs");
    const { state } = await decodeBuild(new URL(location.href).searchParams.get(SHARE_PARAM));
    return {
      arrangement: state ? state.arrangement ?? null : "the link did not decode at all",
      note: document.querySelector("[data-keep-note]").textContent,
      label: document.querySelector(".stu-keep-link").getAttribute("aria-label"),
    };
  });
  t("#212 · …and the copied link CARRIES the arrangement — with screens 1:1 to wrappers nothing stops it travelling",
    Array.isArray(feedOut.arrangement) && feedOut.arrangement.length === 4, JSON.stringify(feedOut.arrangement));
  t("#212 · …and neither the confirmation nor the field's label hedges about it",
    !/did not travel/.test(feedOut.note) && /arrangement included/.test(feedOut.label),
    `${feedOut.note} | ${feedOut.label}`);
  await p10.close();

  // --- 11 · reduced motion -----------------------------------------------------------------------
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: "reduce" });
  const pr = await rctx.newPage();
  watch(pr, "keep-reduced");
  await pr.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await railReady(pr);
  await settled(pr);
  const rTiers = await tiers(pr);
  t("#210 · reduced motion reaches the same rail", JSON.stringify(rTiers) === JSON.stringify(full), JSON.stringify(rTiers));
  const [rdl] = await Promise.all([
    pr.waitForEvent("download", { timeout: 30000 }),
    pr.locator("[data-keep-export] button").click(),
  ]);
  t("#210 · …and still hands over a file", rdl.suggestedFilename() === "prototype.html");
  await rctx.close();

  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// #236 · TEARDOWN AND RETRY. Both halves are about the beat SURVIVING something, and neither is
// reachable from system/studio.mjs — which never calls destroy() and never sees a failed fetch. The
// driver reaches them the way #209's replay will: through the exported getCompile() seam, never a
// window.__ global.
//
// EVERY CASE HERE IS PHRASED AS A THING THAT HAPPENED TO THE PAGE, never as a flag being set:
// "compile() came back", "the stage is still blocks", "the second press fetched again". A destroy
// that set `destroyed = true` and changed nothing else would pass a flag-shaped assertion, and it is
// the writing-into-a-torn-down-viewport that is the bug.
async function teardownPass(browser, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const open = async (route) => {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`teardown pageerror: ${e.message}`));
    // The ONE exemption in this file, and it is narrow on purpose: case 3 serves a 503 deliberately,
    // and chromium logs every failed resource load as a console error of its own. That line is the
    // browser reporting the network, not the page reporting itself — the no-console-errors contract
    // is about the latter, and everything the beat says about the failure goes to its card.
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      if (/Failed to load resource/.test(m.text())) return;
      errors.push(`teardown console: ${m.text()}`);
    });
    if (route) await page.route("**/vocabulary.json", route);
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // #209 · SETTLED FIRST, for a reason sharper than the compile pass's: every assertion in this
    // section is about what happens to the stage AFTER a teardown, and while the replay is still
    // playing there is a second author adding slots to it. "Nothing was swapped in afterwards" is
    // then a claim about a stage that is changing for reasons this section knows nothing about.
    await page.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    await page.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
    return page;
  };
  // What the viewport looks like AFTER a teardown: the two attributes destroy() removes, and what
  // each slot holds. A late applySwap shows up here as a slot holding a ds-* primitive.
  const afterState = (page) => page.evaluate(() => {
    const vp = document.querySelector("[data-studio-canvas]");
    return {
      state: vp.getAttribute("data-compile-state"),
      step: vp.getAttribute("data-compile-step"),
      row: vp.querySelectorAll(".stu-compile").length,
      kinds: [...vp.querySelectorAll(".stx-slot")].map((n) => [...n.children]
        .filter((c) => !c.classList.contains("stx-grab")).map((c) => c.className.split(" ")[0]).join("+")),
    };
  });

  // --- 1 · destroy DURING the step walk ---------------------------------------------------------
  // The half that hangs. compile() awaits wait() between every step; destroy() used to clearTimeout
  // and stop there, so the promise it was parked on never settled and the async frame stayed alive
  // for the life of the page. Asserted as "compile() came back", with a real timeout as the control
  // — a never-settling promise is invisible to every DOM assertion on this page.
  const p1 = await open();
  const walked = await p1.evaluate(() => import("/system/studio-compile.mjs").then(async (m) => {
    const c = m.getCompile();
    if (!c) return { error: "getCompile() returned nothing — the module record the page mounted is not this one" };
    const ran = c.compile().then((s) => ({ settled: s }));
    c.destroy(); // mid-walk: the first step's wait() is outstanding
    return Promise.race([ran, new Promise((r) => setTimeout(() => r({ settled: null }), 4000))]);
  }));
  t("#236 · destroy() during the beat lets compile() come back rather than parking its frame forever",
    walked.settled !== null && !walked.error, JSON.stringify(walked));
  await p1.waitForTimeout(500);
  const after1 = await afterState(p1);
  t("#236 · …and the torn-down viewport is left clean — no state, no step, no control row",
    after1.state === null && after1.step === null && after1.row === 0, JSON.stringify(after1));
  t("#236 · …and nothing was swapped into it after the teardown",
    after1.kinds.length > 0 && after1.kinds.every((k) => k === "stu-place"), JSON.stringify(after1.kinds));
  await p1.close();

  // --- 2 · destroy DURING the vocabulary fetch ---------------------------------------------------
  // The other await, and the one that writes into the stage. The fetch is held open past the step
  // walk, so the beat is parked on `await vocabReady` when destroy() runs; without the liveness check
  // after it, the response lands on a viewport that no longer belongs to this handle and applySwap
  // puts real components on the stage anyway.
  // The continue() is caught: destroy() aborts the in-flight request, and a route handler resuming
  // an already-aborted request throws in the DRIVER rather than on the page.
  const p2 = await open(async (route) => {
    await new Promise((r) => setTimeout(r, 3500));
    await route.continue().catch(() => {});
  });
  // The signal's own detector. The liveness check alone already stops the swap, so without this the
  // `{ signal }` on the fetch could be deleted with every other assertion still green — and a
  // torn-down beat that keeps a request in flight is exactly what #209's driver must not inherit.
  const failedReqs = [];
  p2.on("requestfailed", (r) => { if (r.url().includes("vocabulary.json")) failedReqs.push(r.failure()?.errorText ?? "failed"); });
  const swapped = await p2.evaluate(() => import("/system/studio-compile.mjs").then(async (m) => {
    const c = m.getCompile();
    const ran = c.compile().then((s) => ({ settled: s }));
    // Wait until the walk has reached the last step, so the beat is genuinely inside `await
    // vocabReady` — destroying earlier would prove only case 1 again.
    const vp = document.querySelector("[data-studio-canvas]");
    for (let i = 0; i < 60 && vp.getAttribute("data-compile-step") !== "render"; i += 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const reached = vp.getAttribute("data-compile-step");
    // PAST the render step's own wait(), so the frame is parked on `await vocabReady` and nowhere
    // else. Destroying while the last wait() is still outstanding would re-prove case 1 instead —
    // measured: with the release removed, both cases went red identically, which is what said this
    // sleep was load-bearing rather than defensive.
    await new Promise((r) => setTimeout(r, 900));
    c.destroy();
    const raced = await Promise.race([ran, new Promise((r) => setTimeout(() => r({ settled: null }), 6000))]);
    return { reached, ...raced };
  }));
  t("#236 · the beat reached the render step before the teardown (or case 2 proves nothing)",
    swapped.reached === "render", JSON.stringify(swapped));
  t("#236 · destroy() during the vocabulary fetch lets compile() come back too",
    swapped.settled !== null, JSON.stringify(swapped));
  await p2.waitForTimeout(1500); // past the held response, which lands after the teardown
  const after2 = await afterState(p2);
  t("#236 · …and the response landing afterwards swaps NOTHING onto the stage",
    after2.kinds.length > 0 && after2.kinds.every((k) => k === "stu-place"), JSON.stringify(after2.kinds));
  t("#236 · …and re-adds neither data-compile-state nor data-compile-step",
    after2.state === null && after2.step === null, JSON.stringify(after2));
  t("#236 · …because the teardown ABORTED the request rather than letting it land",
    failedReqs.length === 1, `${failedReqs.length} aborted: ${failedReqs.join(", ")}`);
  await p2.close();

  // --- 3 · #237 · a transient failure is not a verdict -------------------------------------------
  // One 503, then the real file. The reader presses the button again, and the beat must re-issue the
  // request — memoizing the ERROR disabled it for the life of the page, and the honest card is what
  // invites the retry that used to do nothing.
  let served = 0;
  const p3 = await open(async (route) => {
    served += 1;
    if (served === 1) await route.fulfill({ status: 503, contentType: "text/plain", body: "no" }).catch(() => {});
    else await route.continue().catch(() => {});
  });
  const settledAt = (page, want) => page.waitForFunction(
    (w) => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === w,
    want, { timeout: 20000 });
  const compileBtn3 = p3.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true });
  const revertBtn3 = p3.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true });

  await compileBtn3.click();
  await settledAt(p3, "unavailable");
  const failed = await afterState(p3);
  t("#237 · a failed vocabulary fetch settles as 'unavailable' and leaves every block alone",
    failed.kinds.every((k) => k === "stu-place"), JSON.stringify(failed.kinds));
  t("#237 · …and the honest card names the file it could not read",
    (await p3.locator(`${VIEWPORT} .stu-compile-report`).innerText()).includes("vocabulary.json"));

  await revertBtn3.click();
  await settledAt(p3, "blocks");
  await compileBtn3.click();
  // CAUGHT, and the assertion below reads the state instead. A memoized error settles this press as
  // "unavailable" again, and a bare wait would throw its timeout out of the whole journey — a
  // stack trace where a named red line belongs.
  await settledAt(p3, "rendered").catch(() => {});
  const retried = await afterState(p3);
  t("#237 · the NEXT compile re-issues the request and renders — the failure was not memoized",
    retried.kinds.length > 0 && retried.kinds.every((k) => k === "stf-screen"), JSON.stringify(retried.kinds));
  // THREE since #218, and the composition is exact rather than a floor: the beat's 503, the beat's
  // retry, and system/studio-docs.mjs's join — which only fires once a screen exists, so it is
  // strictly after the retry that produced one, and it never sees the 503. The claim this assertion
  // owns is untouched (the beat re-issued rather than memoizing the error) and a change in EITHER
  // consumer still reddens it. See #207's twin, above, for why the docs layer keeps its own fetch.
  t("#237 · …and it really was a second request, not a cached verdict — 3 in all: the 503, the retry, and #218's docs join",
    served === 3, `${served} request(s) for vocabulary.json`);
  await p3.close();

  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// #214 · THE METHOD BAND. build-checks group 20 proves the pure layer — the reducer's truth table,
// the completion read, the verdict identity, the listener filter as data — and states in its own
// header that the driver gating, the redraft actually replacing the canvas, the announcements and
// the zero-interaction restore are this file's. Every assertion is phrased as RESULTING DOM (the
// #205 rule): "the store moved" would pass with no consumer at all. Expectations are computed IN
// NODE from draftBoard / quadrantFor / QUADRANT_MEANINGS — the same committed rules the page runs —
// never hardcoded label lists.
async function methodPass(browser, engineName, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  };
  // The site scrolls smoothly and the band sits far down the page: Playwright's own actionability
  // scroll RACES the smooth behaviour and samples mid-travel (memory: hover probes race smooth
  // scroll — re-measured while building this pass), so every interaction parks its target
  // instantly first.
  const park = async (p, sel) => {
    await p.$eval(sel, (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
    await p.waitForTimeout(80);
  };
  const check = async (p, sel) => { await park(p, sel); await p.check(sel); await p.waitForTimeout(150); };
  const clickAt = async (p, sel) => { await park(p, sel); await p.click(sel); };
  const stageNames = (p) => p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) => w.getAttribute("data-stx-name")));
  const storeAnswers = (p) => p.evaluate(() => import("/system/build-questions.mjs").then((m) => m.readBuild().answers));
  const verdictShown = (p) => p.evaluate(() => ({
    state: document.querySelector("[data-method-verdict]").getAttribute("data-method-verdict"),
    quadrant: document.querySelector(".stu-verdict-quadrant")?.textContent ?? null,
    meaning: document.querySelector(".stu-verdict-meaning")?.textContent ?? null,
    gate: document.querySelector(".stu-verdict-gate")?.textContent ?? null,
    locked: document.querySelector(".stu-verdict-locked")?.textContent ?? null,
  }));

  // --- gating: disabled while the driver plays, enabled in settle's own task --------------------
  const p = await ctx.newPage();
  watch(p, "method");
  await p.addInitScript(() => {
    window.__pushed = [];
    const real = history.pushState.bind(history);
    history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
  });
  await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p.waitForSelector('[data-studio-method="ready"]', { timeout: 20000 });
  const mid = await p.evaluate(() => ({
    state: document.querySelector("[data-studio-method]").getAttribute("data-method-state"),
    input: document.querySelector('input[name="stm-q-shape"]').disabled,
    node: document.querySelector("[data-hook-node]").disabled,
    slot: document.querySelector("[data-hook-slot]").disabled,
  }));
  t("#214 · mid-replay the cards AND the diagram are disabled, and the band says so",
    mid.state === "disabled" && mid.input && mid.node && mid.slot, JSON.stringify(mid));
  // A real pointerdown on the disabled band mid-replay: NOT a take-over (the band lives outside
  // canvas.scroll — this is the assertion that keeps it there), no route, and the run plays on.
  const cardBox = await p.evaluate(() => {
    document.querySelector('[data-method-card="shape"]').scrollIntoView({ behavior: "instant", block: "center" });
    const r = document.querySelector('[data-method-card="shape"]').getBoundingClientRect();
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
  });
  await p.mouse.click(cardBox.x, cardBox.y);
  await p.waitForTimeout(150);
  const midAfter = await p.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return {
      took: r ? r.tookOver : null,
      routes: window.__pushed.filter((u) => u === "/factory/took-over").length,
      redrafted: document.querySelector("[data-studio-notice]").hidden === false,
    };
  }));
  t("#214 · a pointerdown on the disabled band is NOT a take-over and causes no redraft",
    midAfter.took === false && midAfter.routes === 0 && !midAfter.redrafted, JSON.stringify(midAfter));

  await p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  const on = await p.evaluate(() => ({
    state: document.querySelector("[data-studio-method]").getAttribute("data-method-state"),
    input: document.querySelector('input[name="stm-q-shape"]').disabled,
  }));
  t("#214 · at settle the band enables — the same synchronous task as [data-replay=settled], so a gate can never catch settled-but-disabled cards",
    on.state === "ready" && !on.input, JSON.stringify(on));
  const atRest = await verdictShown(p);
  t("#214 · AC #2 · at rest the verdict is LOCKED — the honest sentence, no quadrant text",
    atRest.state === "locked" && atRest.quadrant === null
    && atRest.locked === "Assemble the Hook loop to unlock the ethics verdict.", JSON.stringify(atRest));

  // --- card → artifact, pointer (AC #1) ---------------------------------------------------------
  const expected = draftBoard({ ...DEFAULT_ANSWERS, shape: "worklist" }).places.map((x) => x.label);
  await countLive(p);
  await check(p, 'input[name="stm-q-shape"][value="worklist"]');
  const names = await stageNames(p);
  t("#214 · AC #1 · a pointer answer redrafts the canvas to draftBoard's OWN board, label for label, computed in Node",
    JSON.stringify(names) === JSON.stringify(expected), `${JSON.stringify(names)} vs ${JSON.stringify(expected)}`);
  const said = await liveSeen(p);
  t("#214 · AC #1 · …announced once per placement plus the one redraft sentence, which the polite region speaks last",
    said.n === expected.length + 1 && said.last === `Board redrafted from your answers — ${expected.length} places.`,
    `${said.n} record(s): ${said.last}`);
  const provenance = await p.evaluate(() => ({
    notice: { hidden: document.querySelector("[data-studio-notice]").hidden,
      text: document.querySelector("[data-studio-notice]").textContent.trim() },
    note: document.querySelector("#this-build-summary").textContent,
  }));
  t("#214 · AC #1 · provenance flips in BOTH standing places — the notice and the This-build note — in the same words",
    !provenance.notice.hidden && provenance.notice.text.includes("drafted from your ten answers")
    && provenance.notice.text.includes("set aside") && provenance.note.includes(provenance.notice.text),
    JSON.stringify(provenance.notice));
  const gBoard = await p.evaluate(() => import("/system/studio.mjs").then((m) => {
    const s = m.getStudio();
    return { places: s.board.places.map((x) => x.label), arranged: s.arranged.length };
  }));
  t("#214 · AC #1 · the orchestrator's published board matches the canvas it drew",
    JSON.stringify(gBoard.places) === JSON.stringify(expected) && gBoard.arranged === expected.length,
    JSON.stringify(gBoard));
  // The relinquish (#214's one replay-driver seam): the driver's post-settle seek would rebuild
  // the run's board over the drafted one, so a redraft must leave the transport DEAD, the settled
  // attribute in place, the provenance line honest — and fire no take-over route, because a card
  // answer is not a grab of the wheel.
  const relinq = await p.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return {
      took: r.tookOver, state: r.state,
      seekDead: document.querySelector(".stu-replay-seek").disabled,
      provenance: document.querySelector(".stu-replay-provenance").textContent,
      routes: window.__pushed.filter((u) => u === "/factory/took-over").length,
    };
  }));
  t("#214 · the redraft RELINQUISHES the driver: transport dead, still settled, the set-aside sentence on the provenance line, and NO take-over route",
    relinq.took === true && relinq.state === "settled" && relinq.seekDead && relinq.routes === 0
    && relinq.provenance === "The run's board was set aside — what is on this canvas is drafted from your answers.",
    JSON.stringify(relinq));

  // --- card → artifact, keyboard (AC #1) — native radio semantics, a different card -------------
  // Per engine, the perfPass modZ precedent: chromium and firefox move a radio group's selection
  // with the arrows; Playwright's webkit does not move it at all (probed while building this pass
  // — focus and checked both stay put), and the platform's own keyboard path there is focus +
  // Space on the target radio. Both branches are keyboard-only.
  if (engineName === "webkit") {
    await park(p, '[data-method-card="rewardType"]');
    await p.focus('[data-method-card="rewardType"] input:not(:checked)');
    await p.keyboard.press("Space");
  } else {
    await park(p, 'input[name="stm-q-rewardType"]:checked');
    await p.focus('input[name="stm-q-rewardType"]:checked');
    await p.keyboard.press("ArrowDown");
  }
  await p.waitForTimeout(200);
  const kChecked = await p.$eval('input[name="stm-q-rewardType"]:checked', (i) => i.value);
  const kExpected = draftBoard({ ...DEFAULT_ANSWERS, shape: "worklist", rewardType: kChecked }).places.map((x) => x.label);
  const kNames = await stageNames(p);
  t("#214 · AC #1 · the keyboard path — a native radio arrow — moves the answer and redrafts the same way",
    kChecked !== "self" && JSON.stringify(kNames) === JSON.stringify(kExpected),
    `checked=${kChecked}; ${JSON.stringify(kNames)} vs ${JSON.stringify(kExpected)}`);

  // --- the Hook diagram: refusal first, then pointer assembly (AC #2) ---------------------------
  await countLive(p);
  await clickAt(p, '[data-hook-node="investment"]');
  await clickAt(p, '[data-hook-slot="0"]');
  await p.waitForTimeout(150);
  const refusal = await liveSeen(p);
  const slot0 = await p.$eval('[data-hook-slot="0"]', (b) => ({ text: b.textContent, filled: b.classList.contains("is-filled") }));
  t("#214 · AC #2 · a wrong-stage placement is REFUSED — the fixed reason announced, the DOM untouched",
    refusal.n === 2 && refusal.last === "Investment is not stage 1 — that slot is Internal trigger's."
    && slot0.text === "Stage 1" && !slot0.filled,
    `${refusal.n} record(s): "${refusal.last}"; slot0=${JSON.stringify(slot0)}`);

  await countLive(p);
  for (const [node, slot] of [["trigger", 0], ["action", 1], ["rewardType", 2], ["investment", 3]]) {
    await clickAt(p, `[data-hook-node="${node}"]`);
    await clickAt(p, `[data-hook-slot="${slot}"]`);
  }
  await p.waitForTimeout(200);
  const asm = await liveSeen(p);
  t("#214 · AC #2 · pointer assembly — each select and each placement announced, counted exactly (4 + 4), completion in the final sentence",
    asm.n === 8 && asm.last === "Investment placed, stage 4 of 4. Hook loop assembled — the ethics verdict is unlocked.",
    `${asm.n} record(s): "${asm.last}"`);
  const answersNow = await storeAnswers(p);
  const vq = quadrantFor(answersNow);
  const unlocked = await verdictShown(p);
  t("#214 · AC #2/#3 · completion unlocks the verdict, and every sentence is the IMPORTED rules' own by identity",
    unlocked.state === "unlocked" && unlocked.quadrant.toLowerCase() === vq
    && unlocked.meaning === QUADRANT_MEANINGS[vq]
    && unlocked.gate === frequencyVerdictFor(answersNow).verdict,
    JSON.stringify(unlocked));

  // --- the two ethics cards changed AFTER the unlock: the verdict tracks ------------------------
  await check(p, 'input[name="stm-q-improvesLives"][value="no"]');
  await check(p, 'input[name="stm-q-wouldUseIt"][value="no"]');
  const ethicsNow = await storeAnswers(p);
  const reQ = quadrantFor(ethicsNow);
  const reShown = await verdictShown(p);
  t("#214 · AC #3 · an ethics answer changed after the unlock re-renders the verdict from the same imported rules",
    reQ === "dealer" && reShown.meaning === QUADRANT_MEANINGS[reQ], `${reQ}: ${reShown.meaning}`);

  // --- cross-restore (AC #4): the keep rail's link round-trips the DRAFTED build ----------------
  await park(p, "[data-keep-share] button");
  await p.locator("[data-keep-share] button").click();
  await p.waitForFunction(() => /[?&]b=/.test(document.querySelector(".stu-keep-link")?.value || ""), null, { timeout: 5000 });
  const href = await p.$eval(".stu-keep-link", (i) => i.value);
  const decoded = await decodeBuild(new URL(href).searchParams.get(SHARE_PARAM));
  const drawnNow = await stageNames(p);
  t("#214 · AC #4 · the copied link decodes back to the DRAFTED board and the card answers through the real codec",
    Boolean(decoded.state)
    && JSON.stringify(decoded.state.board.places.map((x) => x.label)) === JSON.stringify(drawnNow)
    && decoded.state.answers.shape === "worklist" && decoded.state.answers.improvesLives === "no",
    decoded.state ? JSON.stringify(decoded.state.answers) : decoded.reason);
  await p.close();

  // --- the Hook diagram from the KEYBOARD alone, on a fresh page (AC #2) ------------------------
  const p2 = await ctx.newPage();
  watch(p2, "method kb");
  await p2.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p2.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  for (const [node, slot] of [["trigger", 0], ["action", 1], ["rewardType", 2], ["investment", 3]]) {
    await park(p2, `[data-hook-node="${node}"]`);
    await p2.focus(`[data-hook-node="${node}"]`);
    await p2.keyboard.press("Enter");
    await p2.focus(`[data-hook-slot="${slot}"]`);
    await p2.keyboard.press("Enter");
    await p2.waitForTimeout(80);
  }
  const kbDone = await p2.evaluate(() => ({
    filled: [...document.querySelectorAll("[data-hook-slot]")].every((b) => b.classList.contains("is-filled")),
    verdict: document.querySelector("[data-method-verdict]").getAttribute("data-method-verdict"),
  }));
  t("#214 · AC #2 · the loop assembles from the keyboard alone — focus + Enter, no pointer",
    kbDone.filled && kbDone.verdict === "unlocked", JSON.stringify(kbDone));
  await p2.close();

  // --- the #193 mode (AC #5): a ?b= restore with ZERO interaction -------------------------------
  const rAnswers = { ...DEFAULT_ANSWERS, shape: "stream", improvesLives: "no", wouldUseIt: "no" };
  const rBoard = draftBoard(rAnswers);
  const rParam = await encodeBuild({ answers: rAnswers, board: rBoard, boardIsEdited: false, pack: null });
  const p3 = await ctx.newPage();
  watch(p3, "method restore");
  await p3.goto(`${BASE}/factory.html?${SHARE_PARAM}=${encodeURIComponent(rParam)}`, { waitUntil: "load" });
  // data-studio="ready" is withheld until the decode settles — the declined driver never reaches
  // "settled", so waiting on the replay here would deadlock (the plan's own gotcha).
  await p3.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await p3.waitForSelector('[data-studio-method="ready"]', { timeout: 5000 });
  const restored = await p3.evaluate(() => ({
    state: document.querySelector("[data-studio-method]").getAttribute("data-method-state"),
    shape: document.querySelector('input[name="stm-q-shape"]:checked')?.value,
    lives: document.querySelector('input[name="stm-q-improvesLives"]:checked')?.value,
    filled: [...document.querySelectorAll("[data-hook-slot]")].every((b) => b.classList.contains("is-filled")),
    verdict: document.querySelector("[data-method-verdict]").getAttribute("data-method-verdict"),
    meaning: document.querySelector(".stu-verdict-meaning")?.textContent ?? null,
    note: document.querySelector("#this-build-summary").textContent,
  }));
  t("#214 · AC #5 · a ?b= restore populates cards, diagram AND verdict with ZERO interaction (the #193 mode), the meaning verbatim",
    restored.state === "ready" && restored.shape === "stream" && restored.lives === "no"
    && restored.filled && restored.verdict === "unlocked"
    && restored.meaning === QUADRANT_MEANINGS[quadrantFor(rAnswers)],
    JSON.stringify(restored));
  t("#214 · AC #5 · …the declined path never disabled the band, and the panel names the sender's board, not the run's",
    restored.state === "ready" && restored.note.includes("link you followed"), restored.note.slice(0, 200));
  await p3.close();

  // --- the loading-window race (PR #252 review, L1) ---------------------------------------------
  // The band is live on the declined path from construction, while the driver's two fetches are
  // still in flight — so a card answered in that window relinquishes the driver FIRST, and the
  // continuation that then resolves (the declined branch, or unavailable() on a failed artifact)
  // must leave the redraft's provenance sentence alone: the stage holds the drafted board now, not
  // the sender's. The artifact fetch is HELD BY ROUTE so the window is deterministic rather than
  // won by luck (the #240/2 loading-window case's technique, pointed at the other author).
  const REDRAFTED_LINE = "The run's board was set aside — what is on this canvas is drafted from your answers.";
  const p4 = await ctx.newPage();
  watch(p4, "method race");
  let releaseArtifact;
  const artifactHeld = new Promise((r) => { releaseArtifact = r; });
  await p4.route("**/replay/*.json", async (route) => { await artifactHeld; await route.continue(); });
  await p4.goto(`${BASE}/factory.html?${SHARE_PARAM}=${encodeURIComponent(rParam)}`, { waitUntil: "load" });
  await p4.waitForSelector('[data-studio-method="ready"]', { timeout: 20000 });
  const preState = await p4.getAttribute("[data-studio]", "data-replay");
  await check(p4, 'input[name="stm-q-shape"][value="worklist"]');
  const preRelease = await p4.$eval(".stu-replay-provenance", (n) => n.textContent);
  releaseArtifact();
  await p4.waitForFunction(() => document.querySelector("[data-studio]")?.getAttribute("data-replay") === "declined",
    null, { timeout: 20000 });
  const postRelease = await p4.$eval(".stu-replay-provenance", (n) => n.textContent);
  t("#252/L1 · the card really was answered inside the loading window, and the redraft relinquished the driver there",
    preState === "loading" && preRelease === REDRAFTED_LINE, `state=${preState} · ${preRelease.slice(0, 90)}`);
  t("#252/L1 · …and the declined continuation leaves that sentence alone — it describes the board that is actually on the canvas",
    postRelease === REDRAFTED_LINE && !/came in on the link/.test(postRelease), postRelease.slice(0, 120));
  await p4.close();

  // The same race resolved the OTHER way: the artifact 404s, so the continuation runs
  // unavailable(), whose provenance clear must equally not stomp the redraft — a run that failed
  // to load changes nothing about whose board is on the canvas.
  const p5 = await ctx.newPage();
  // replayPass case (a)'s narrow exemption: this case serves a 404 on purpose, and chromium logs
  // every failed resource load as a console error of its own — the browser reporting the network,
  // not the page reporting itself.
  p5.on("pageerror", (e) => errors.push(`method race 404 pageerror: ${e.message}`));
  p5.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`method race 404 console: ${m.text()}`); });
  let release404;
  const held404 = new Promise((r) => { release404 = r; });
  await p5.route("**/replay/*.json", async (route) => { await held404; await route.fulfill({ status: 404, body: "gone" }); });
  await p5.goto(`${BASE}/factory.html?${SHARE_PARAM}=${encodeURIComponent(rParam)}`, { waitUntil: "load" });
  await p5.waitForSelector('[data-studio-method="ready"]', { timeout: 20000 });
  await check(p5, 'input[name="stm-q-shape"][value="worklist"]');
  release404();
  await p5.waitForFunction(() => document.querySelector("[data-studio]")?.getAttribute("data-replay") === "unavailable",
    null, { timeout: 20000 });
  const after404 = await p5.$eval(".stu-replay-provenance", (n) => n.textContent);
  t("#252/L1 · unavailable() after the same redraft keeps the sentence too",
    after404 === REDRAFTED_LINE, after404 === "" ? "(cleared)" : after404.slice(0, 120));
  await p5.close();

  // --- #253 · a same-count redraft mid-"compiling" REFUSES instead of swapping stale screens ----
  // The window: compile() reads the board, then walks four ~420 ms steps before applySwap. A card
  // answered inside it redrafts the stage (adoptBoard removes every wrapper). Same place count —
  // worklist board (3) redrafted to the hunt variant (3) — so the count tripwire cannot see it;
  // the identity tripwire must, and the refusal must land through the beat's own card.
  const IDENTITY_REFUSAL = "the canvas was redrafted while this compile was mid-beat — these "
    + "screens were compiled from a board that is no longer on the stage, so the swap cannot apply to it";
  const p6 = await ctx.newPage();
  watch(p6, "method midcompile");
  await p6.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p6.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  // A drafted 3-place board on the stage, then compile IT (not the run's 4-place board).
  await check(p6, 'input[name="stm-q-shape"][value="worklist"]');
  // Park the mid-beat card NOW, so the check inside the window needs no scroll.
  await park(p6, 'input[name="stm-q-rewardType"][value="hunt"]');
  // Compile via a direct DOM click — the compile button is the FIRST child of .stu-compile
  // (studio-compile.mjs:265) — because a locator's actionability scroll would leave the parked
  // card and eat the ~1.7 s window.
  await p6.$eval(`${VIEWPORT} .stu-compile button`, (b) => b.click());
  const midState = await p6.$eval(VIEWPORT, (n) => n.getAttribute("data-compile-state"));
  // Bare check, not the check() helper: the target was parked one line earlier, and the helper's
  // park + 150 ms wait would spend ~230 ms of the window for nothing.
  await p6.check('input[name="stm-q-rewardType"][value="hunt"]');   // the mid-beat redraft
  const expectedMid = draftBoard({ ...DEFAULT_ANSWERS, shape: "worklist", rewardType: "hunt" })
    .places.map((x) => x.label);   // ["Worklist", "Results", "Settings"] — 3, same count, new middle
  await p6.waitForFunction(() => document.querySelector("[data-studio-canvas]")
    .getAttribute("data-compile-state") === "refused", null, { timeout: 20000 });
  const after = await p6.evaluate(() => ({
    names: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) => w.getAttribute("data-stx-name")),
    kinds: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) =>
      [...w.children].filter((c) => !c.classList.contains("stx-grab")).map((c) => c.className.split(" ")[0]).join("+")),
    refusal: document.querySelector(".stu-compile-refusal code")?.textContent ?? null,
  }));
  t("#253 · a same-count redraft mid-compiling lands REFUSED with the identity sentence",
    midState === "compiling" && after.refusal === IDENTITY_REFUSAL,
    JSON.stringify({ midState, refusal: after.refusal }));
  t("#253 · …and the drafted blocks are on the stage untouched — no stale screen swapped in",
    JSON.stringify(after.names) === JSON.stringify(expectedMid) && after.kinds.every((k) => k === "stu-place"),
    JSON.stringify(after));
  // Recovery: the disclosed path. Back to blocks, then a clean compile of the DRAFTED board.
  await p6.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
  await p6.waitForFunction(() => document.querySelector("[data-studio-canvas]")
    .getAttribute("data-compile-state") === "blocks", null, { timeout: 20000 });
  await p6.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
  await p6.waitForFunction(() => document.querySelector("[data-studio-canvas]")
    .getAttribute("data-compile-state") === "rendered", null, { timeout: 20000 });
  const recovered = await p6.evaluate(() => ({
    kinds: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) =>
      [...w.children].filter((c) => !c.classList.contains("stx-grab")).map((c) => c.className.split(" ")[0]).join("+")),
    headings: [...document.querySelectorAll("[data-studio-canvas] .stf-screen-name")].map((h) => h.textContent),
  }));
  t("#253 · …and after Back to blocks a fresh compile renders the DRAFTED board's own screens",
    recovered.kinds.every((k) => k === "stf-screen")
    && JSON.stringify(recovered.headings) === JSON.stringify(expectedMid),
    JSON.stringify(recovered));
  await p6.close();

  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// #213 · THE MEASUREMENT GATE. The PRD's WRONG-if guardrails, measured instead of assumed: INP
// ≤ 200 ms per named interaction per engine, and a drag that drops no frames under a base-spec
// CPU profile. Nothing here ships — the observer is driver-injected via addInitScript
// (tooling/inp-observer.mjs's header carries the argument), so the zero-dep pages and the pixel
// baselines are untouched.
//
// THE FLOOR IS THE COMMON CASE, NOT AN EDGE CASE (probe-verified while planning, all three
// ---- #217's SELECTION LAYER, on the shipped /factory ---------------------------------------------
// The half neither build-checks group 22 nor the pixel gate can be. Group 22 proves the two paths
// are computed from ONE rectangle and the two menus from ONE item list; only a real engine can prove
// that the wiring in between actually connects them — and the pixel gate never interacts, so a
// marquee whose listener died leaves every screenshot green.
//
// Driven on /factory rather than on studio.html, deliberately: /factory is the surface a reader
// meets, its canvas is built by the replay driver rather than by an inline script, and three of the
// rows below (the take-over coupling, compile-mid-carry, the settled-canvas fixture) exist only
// there. Every expectation is computed IN NODE from the live arrangement through the SAME pure
// functions the page runs — a literal id list would pass a board that silently stopped being the
// replay's.
//
// ANNOUNCEMENT COUNTS COME FROM THE PLAN'S CONTRACT TABLE (D12), not from reading the code back:
// they differ per path ON PURPOSE (a gesture the reader's own hand is tracking announces only its
// result; a keyboard step announces every press, blocked ones included), and a count invented while
// writing the assertion looks exactly like a feature bug.
async function selectPass(browser, engineName, t, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  };
  const modA = engineName === "webkit" ? "Meta+a" : "Control+a";

  // EVERY PAGE WAITS FOR [data-replay="settled"], never for the mount handles. Both
  // [data-studio="ready"] and [data-canvas-select="ready"] fire at MOUNT, and since #209 the canvas
  // is EMPTY then — a pass that queried slots at the handle would be asserting over nothing
  // (vt-verify.mjs:424-431 records the same break).
  const openSettled = async (context = ctx, tag = "select") => {
    const p = await context.newPage();
    watch(p, tag);
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await p.waitForSelector('[data-canvas-select="ready"]', { timeout: 20000 });
    await p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    // THE CANVAS IS SCROLLED INTO VIEW BEFORE ANY POINTER ROW, and this is not tidiness: on
    // /factory the studio sits well below the fold, so a raw mouse.move to a computed client
    // coordinate lands OFF-SCREEN and the press never reaches the stage. Playwright's locator.click
    // auto-scrolls and hides the problem, which is why the keyboard rows passed while every pointer
    // row came back with an empty selection. Waited out, because a smooth scroll that is still
    // running when the geometry is read gives coordinates for where the canvas WAS.
    await p.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    return p;
  };

  const slotsNow = (p) => p.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot")]
    .map((n) => ({
      id: n.getAttribute("data-stx-id"),
      col: Number(n.getAttribute("data-col")),
      row: Number(n.getAttribute("data-row")),
    })));
  const chosen = async (p) => (await p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]")]
      .map((n) => n.getAttribute("data-stx-id")))).sort();
  const picked = (p) => p.locator(`${VIEWPORT} .stx-slot.is-picked`).count();

  // The client-space centre of a cell on /factory. The X pitch is MEASURED from two real slot boxes
  // (journey's cellPoint discipline); the Y pitch has to come from the resolved grid, because the
  // committed board fills ROW 1 ONLY and there is no second occupied row to measure against —
  // perfPass's drag row makes the identical call for the identical reason. /factory sits at scale 1
  // (ZOOM_REST) and nothing here zooms, so the unscaled track is the painted track.
  const cell = (p, col, row) => p.evaluate(([c, r]) => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    const box = (cc) => stage.querySelector(`.stx-slot[data-col="${cc}"][data-row="1"]`)?.getBoundingClientRect();
    const a = box(1);
    const b = box(2);
    if (!a || !b) return { error: "the reference slots (1,1) and (2,1) are not both placed" };
    const cs = getComputedStyle(stage);
    const pitchY = parseFloat(cs.gridTemplateRows) + (parseFloat(cs.rowGap) || 0);
    const x = a.left + (c - 1) * (b.left - a.left) + a.width / 2;
    const y = a.top + (r - 1) * pitchY + a.height / 2;
    // REACHABILITY IS REPORTED, NOT ASSUMED. A cell can be perfectly valid and still be somewhere no
    // pointer can go: .stx-scroll is 640 px tall so anything past row ~4 is below it, and on
    // /factory the scroller is wider than the window so the far columns are off-screen with no
    // horizontal scroll to reach them. A raw mouse.move to such a point silently does nothing, and
    // the row that used it fails somewhere else entirely — three separate fixtures in this pass
    // were written wrong that way before this flag existed.
    const sr = document.querySelector("[data-studio-canvas] .stx-scroll").getBoundingClientRect();
    const onScreen = x >= sr.left && x <= sr.right && y >= sr.top && y <= sr.bottom
      && x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;
    return { x, y, onScreen };
  }, [col, row]);

  // Every pointer gesture below goes through these two, so an off-screen fixture is a NAMED throw at
  // the point of use rather than a green row that tested nothing.
  const reachable = (pt, what) => {
    if (!pt || pt.error) throw new Error(`selectPass: ${what} could not be measured — ${pt && pt.error}`);
    if (!pt.onScreen) throw new Error(`selectPass: ${what} is at (${Math.round(pt.x)}, ${Math.round(pt.y)}), outside the visible canvas — a pointer cannot go there, so this fixture would test nothing`);
    return pt;
  };

  const shiftDrag = async (p, from, to, { quick = false } = {}) => {
    reachable(from, "the marquee's origin");
    reachable(to, "the marquee's far corner");
    await p.keyboard.down("Shift");
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y, { steps: quick ? 4 : 12 });
    await p.mouse.up();
    await p.keyboard.up("Shift");
    if (!quick) await p.waitForTimeout(120);
  };
  // Down on the HANDLE — the affordance a reader finds — rather than on the body, so this row does
  // not double as a test of the body-drag rule the harness sections already own.
  const dragHandle = async (p, id, to, { quick = false } = {}) => {
    const g = await p.evaluate((i) => {
      const r = document.querySelector(`.stx-slot[data-stx-id="${i}"] .stx-grab`).getBoundingClientRect();
      return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    }, id);
    reachable(to, "the group drag's drop point");
    await p.mouse.move(g.x, g.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y, { steps: quick ? 4 : 14 });
    await p.mouse.up();
    if (!quick) await p.waitForTimeout(140);
  };

  // --- 1 · the marquee, and the count announced ONCE ---------------------------------------------
  const p1 = await openSettled();
  const grid1 = await slotsNow(p1);
  t("#217 · the settled /factory canvas is non-empty — every row below would be vacuous otherwise",
    grid1.length >= 3, `${grid1.length} slot(s)`);
  // The RECTANGLE is the fixture, and the expected id set is derived from it in Node through the
  // page's own marqueeRange + idsInRange. Two blocks, because the committed board fills row 1.
  const RANGE = marqueeRange({ col: 1, row: 1 }, { col: 2, row: 2 });
  const want = idsInRange(grid1, RANGE).slice().sort();
  await countLive(p1);
  await shiftDrag(p1, await cell(p1, 1, 1), await cell(p1, 2, 2));
  const got1 = await chosen(p1);
  t("#217/AC1 · a Shift-drag marquee selects exactly the components inside the dragged rectangle — computed in Node from the LIVE arrangement, never a literal",
    JSON.stringify(got1) === JSON.stringify(want) && want.length >= 2, `${JSON.stringify(got1)} vs ${JSON.stringify(want)}`);
  const said1 = await liveSeen(p1);
  t("#217/AC1 · …announced EXACTLY ONCE for the whole drag, on release (D12: the reader is watching their own hand)",
    said1.n === 1 && /^\d+ selected: /.test(said1.last), JSON.stringify(said1));
  // A marquee that caught nothing says so, and says the OTHER sentence — it never had a selection
  // to clear. TWO CONSTRAINTS decide which cells this may use, not one: the pair must be provably
  // empty (asserted below from the live arrangement, never assumed) AND on screen. A far column
  // sits outside the 1440px window and a low row below .stx-scroll's 640px box, and a raw
  // mouse.move to either lands somewhere else entirely — which is exactly how this row failed on
  // firefox while passing on chromium. The committed board fills ROW 1 only, so rows 2-3 of the
  // first columns are both empty and visible.
  const emptyA = { col: 1, row: 2 };
  const emptyB = { col: 2, row: 3 };
  t("#217 · the empty-marquee fixture really is empty — otherwise the sentence below would be about the wrong event",
    idsInRange(grid1, marqueeRange(emptyA, emptyB)).length === 0, JSON.stringify(grid1));
  await countLive(p1);
  await shiftDrag(p1, await cell(p1, emptyA.col, emptyA.row), await cell(p1, emptyB.col, emptyB.row));
  const said1b = await liveSeen(p1);
  t("#217 · a marquee over empty canvas says \"Nothing to select.\", not \"Selection cleared.\" — it never had a selection to clear",
    said1b.n === 1 && said1b.last === "Nothing to select." && (await chosen(p1)).length === 0,
    JSON.stringify(said1b));
  t("#217 · …and no style attribute exists anywhere on the canvas after a marquee",
    (await p1.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-stage, [data-studio-canvas] .stx-scroll, [data-studio-canvas] .stx-slot, [data-studio-canvas] .stx-guide, [data-studio-canvas] .stx-menu")].filter((n) => n.hasAttribute("style")).length)) === 0);
  await p1.close();

  // --- 2 · AC #1's whole claim: the KEYBOARD path selects the SAME SET ----------------------------
  const p2 = await openSettled();
  const grid2 = await slotsNow(p2);
  const anchorId = grid2.find((s) => s.col === 1 && s.row === 1).id;
  await p2.locator(`.stx-slot[data-stx-id="${anchorId}"] .stx-grab`).focus();
  await countLive(p2);
  await p2.keyboard.press("Shift+ArrowRight");
  await p2.waitForTimeout(80);
  await p2.keyboard.press("Shift+ArrowDown");
  await p2.waitForTimeout(80);
  const got2 = await chosen(p2);
  t("#217/AC1 · the KEYBOARD path (Shift+Right then Shift+Down from the focused handle) selects the SAME SET as the pointer marquee over the same rectangle",
    JSON.stringify(got2) === JSON.stringify(want), `${JSON.stringify(got2)} vs ${JSON.stringify(want)}`);
  const said2 = await liveSeen(p2);
  t("#217/AC1 · …announcing once PER PRESS (D12), which is a different count from the pointer path on purpose",
    said2.n === 2, JSON.stringify(said2));
  // THE ANCHOR DID NOT RE-ANCHOR. Proven by the set itself: a per-press anchor lookup would have
  // re-anchored on the second press and selected a 1×2 rather than the 2×2 rectangle above.
  // THE REPLACE, PROVEN RATHER THAN ASSUMED (Task 2's decision). A deliberate stray Shift-click on a
  // block outside the rectangle, then the same two presses: if extendSelection unioned, the stray
  // would survive and the identity below would fail. Group 22 pins the pure half; this is the wiring.
  await p2.keyboard.press("Escape");
  const strayId = grid2.filter((s) => !want.includes(s.id)).map((s) => s.id)[0];
  t("#217 · the stray-click fixture is real — there is a block OUTSIDE the rectangle to stray onto",
    Boolean(strayId), JSON.stringify(grid2));
  await p2.locator(`.stx-slot[data-stx-id="${strayId}"]`).click({ modifiers: ["Shift"] });
  await p2.waitForTimeout(80);
  t("#217 · a Shift-CLICK toggles one component's membership — the additive path extendSelection is free to replace because of",
    JSON.stringify(await chosen(p2)) === JSON.stringify([strayId]), JSON.stringify(await chosen(p2)));
  await p2.locator(`.stx-slot[data-stx-id="${anchorId}"] .stx-grab`).focus();
  await p2.keyboard.press("Shift+ArrowRight");
  await p2.waitForTimeout(60);
  await p2.keyboard.press("Shift+ArrowDown");
  await p2.waitForTimeout(80);
  t("#217/AC1 · …and the keyboard rectangle REPLACES rather than unions — the stray Shift-click is discarded, so the identity holds unconditionally rather than only from a cleared start",
    JSON.stringify(await chosen(p2)) === JSON.stringify(want), JSON.stringify(await chosen(p2)));
  await p2.close();

  // --- 3 · AC #2: multi-move by pointer — one action, one sentence, one history entry -------------
  const p3 = await openSettled();
  const grid3 = await slotsNow(p3);
  await shiftDrag(p3, await cell(p3, 1, 1), await cell(p3, 2, 2));
  const members = await chosen(p3);
  t("#217 · the group-move fixture really holds several components", members.length >= 2, JSON.stringify(members));
  await busRecord(p3);
  await countLive(p3);
  const depth0 = await historyDepth(p3);
  await dragHandle(p3, members[0], await cell(p3, 1, 2));
  const grid3b = await slotsNow(p3);
  const landed = members.every((id) => {
    const was = grid3.find((s) => s.id === id);
    const now = grid3b.find((s) => s.id === id);
    return now.col === was.col && now.row === was.row + 1;
  });
  t("#217/AC2 · dragging ONE selected member lands EVERY member at its own offset — the selection keeps its shape",
    landed, JSON.stringify(grid3b.filter((s) => members.includes(s.id))));
  const bus3 = await busSeen(p3);
  t("#217/AC2 · …emitting exactly ONE ui.move-group and NO ui.move at all",
    bus3.filter((a) => a.type === "ui.move-group").length === 1 && bus3.filter((a) => a.type === "ui.move").length === 0,
    JSON.stringify(bus3.map((a) => a.type)));
  t("#217/AC2 · …with no `target` on the envelope, because a group move has no single subject to name",
    bus3.filter((a) => a.type === "ui.move-group").every((a) => a.id === undefined && a.hasComponent === false),
    JSON.stringify(bus3.filter((a) => a.type === "ui.move-group")));
  const said3 = await liveSeen(p3);
  t("#217/AC2 · …announced ONCE for the group, from the consumer, in SPOKEN_MAX's vocabulary",
    said3.n === 1 && said3.last.startsWith("Moved: "), JSON.stringify(said3));
  const depth1 = await historyDepth(p3);
  t("#217/AC2 · …and the history grew by EXACTLY ONE entry for the whole group (R9)",
    depth1 - depth0 === 1, `${depth0} → ${depth1}`);
  // --- AC #2's last clause: undone in ONE step ---------------------------------------------------
  await btn(p3, "Undo").click();
  await p3.waitForTimeout(260);
  const grid3c = await slotsNow(p3);
  t("#217/AC2 · ONE Undo puts EVERY member back where it was",
    members.every((id) => {
      const was = grid3.find((s) => s.id === id);
      const now = grid3c.find((s) => s.id === id);
      return now.col === was.col && now.row === was.row;
    }), JSON.stringify(grid3c.filter((s) => members.includes(s.id))));
  t("#217 · …and the selection SURVIVES the undo — undoing a move is not a reason to lose the set",
    JSON.stringify(await chosen(p3)) === JSON.stringify(members));
  await p3.close();

  // --- 4 · multi-move by KEYBOARD, with the per-press announcement count it deliberately has ------
  const p4 = await openSettled();
  const grid4 = await slotsNow(p4);
  await shiftDrag(p4, await cell(p4, 1, 1), await cell(p4, 2, 2));
  const members4 = await chosen(p4);
  await busRecord(p4);
  await countLive(p4);
  const depth4 = await historyDepth(p4);
  await p4.locator(`.stx-slot[data-stx-id="${members4[0]}"] .stx-grab`).focus();
  await p4.keyboard.press("Enter");
  await p4.waitForTimeout(80);
  // READ THE PICK-UP SENTENCE HERE, while it is the region's current value: liveSeen() reports only
  // the LAST sentence, and the drop's is the one that survives to the end of the gesture.
  const pickupSaid = await p4.locator(LIVE).textContent();
  await p4.keyboard.press("ArrowDown");
  await p4.waitForTimeout(80);
  const stepSaid = await p4.locator(LIVE).textContent();
  await p4.keyboard.press("Enter");
  await p4.waitForTimeout(160);
  const grid4b = await slotsNow(p4);
  t("#217/AC2 · the KEYBOARD group move (Enter, ArrowDown, Enter) lands every member at the same offset",
    members4.every((id) => {
      const was = grid4.find((s) => s.id === id);
      const now = grid4b.find((s) => s.id === id);
      return now.col === was.col && now.row === was.row + 1;
    }), JSON.stringify(grid4b.filter((s) => members4.includes(s.id))));
  const bus4 = await busSeen(p4);
  t("#217/AC2 · …through the same ONE ui.move-group, which is what makes pointer/keyboard parity true by construction rather than by two paths that agree",
    bus4.filter((a) => a.type === "ui.move-group").length === 1 && bus4.filter((a) => a.type === "ui.move").length === 0,
    JSON.stringify(bus4.map((a) => a.type)));
  const said4 = await liveSeen(p4);
  // D12: pick-up (1) + one arrow press (1) + the consumer's drop sentence (1). Counted per path and
  // per press ON PURPOSE — a naive once-per-gesture count sends an implementer to delete the
  // per-step feedback, which is the wrong fix (studio-verbs.mjs:718-721).
  t("#217/AC2 · …announced 3 times: the group pick-up, the arrow step, and the drop — per press, by design",
    said4.n === 3 && said4.last.startsWith("Moved: "), JSON.stringify(said4));
  // R8 — the group sentences name the COUNT, not a component: a whole-canvas selection that only the
  // edge can stop is correct and would otherwise be silent about why. Read as the region's value AT
  // each moment, never as a flag, and never with an `|| true` escape hatch that cannot fail.
  t("#217 · the group PICK-UP sentence names the count and the instructions, not one component (R8)",
    new RegExp(`^${members4.length} components picked up, column \\d+, row \\d+\\. Arrow keys to move, Enter to drop, Escape to cancel\\.$`)
      .test((pickupSaid || "").trim()), JSON.stringify(pickupSaid));
  t("#217 · …and the group ARROW STEP sentence names the count and the slot it reached",
    new RegExp(`^${members4.length} components in column \\d+, row \\d+\\.$`).test((stepSaid || "").trim()),
    JSON.stringify(stepSaid));
  t("#217/AC2 · one Undo restores the whole keyboard group move too",
    await (async () => {
      await btn(p4, "Undo").click();
      await p4.waitForTimeout(260);
      const g = await slotsNow(p4);
      return members4.every((id) => {
        const was = grid4.find((s) => s.id === id);
        const now = g.find((s) => s.id === id);
        return now.col === was.col && now.row === was.row;
      });
    })());
  await p4.close();

  // --- 5 · AC #3: a guide is a claim about an alignment that EXISTS -------------------------------
  const p5 = await openSettled();
  // The honesty predicate, written ONCE and used twice: for the real guides, and for the mutation
  // that decides whether it can fail at all.
  const guidesHonest = (p) => p.evaluate(() => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    const guides = [...stage.querySelectorAll(".stx-guide")]
      .map((n) => ({ col: n.getAttribute("data-col"), row: n.getAttribute("data-row") }));
    const peers = [...stage.querySelectorAll(".stx-slot:not(.is-picked)")]
      .map((n) => ({ col: Number(n.getAttribute("data-col")), row: Number(n.getAttribute("data-row")) }));
    const carried = [...stage.querySelectorAll(".stx-slot.is-picked")]
      .map((n) => ({ col: Number(n.getAttribute("data-col")), row: Number(n.getAttribute("data-row")) }));
    const honest = guides.every((g) => (g.col != null
      ? peers.some((s) => s.col === Number(g.col)) && carried.some((s) => s.col === Number(g.col))
      : peers.some((s) => s.row === Number(g.row)) && carried.some((s) => s.row === Number(g.row))));
    return { guides, honest, peers, carried };
  });
  const grid5 = await slotsNow(p5);
  await p5.locator(`.stx-slot[data-stx-id="${grid5[0].id}"] .stx-grab`).focus();
  await p5.keyboard.press("Enter");
  await p5.waitForTimeout(120);
  const gs = await guidesHonest(p5);
  t("#217/AC3 · every alignment guide drawn mid-carry sits on a column or row where a NON-CARRIED peer really is",
    gs.honest, JSON.stringify(gs));
  t("#217/AC3 · …and the carry really did draw at least one — a guide check over zero guides is vacuous",
    gs.guides.length >= 1, JSON.stringify(gs.guides));
  // THE MUTATION THAT DECIDES WHETHER THAT CHECK CAN FAIL AT ALL (memory check-that-cannot-fail).
  // A guide is forced onto a PROVABLY EMPTY column and the same predicate must go red.
  const emptyCol5 = (() => { for (let c = 1; c <= MAX_COLS; c += 1) if (!grid5.some((s) => s.col === c)) return c; return null; })();
  await p5.evaluate((c) => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    const fake = document.createElement("div");
    fake.className = "stx-guide";
    fake.setAttribute("data-col", String(c));
    fake.setAttribute("data-stx-mutation", "");
    stage.insertBefore(fake, stage.firstChild);
  }, emptyCol5);
  const mutated = await guidesHonest(p5);
  t("#217/AC3 · THE MUTATION — a guide forced onto a provably empty column makes the honesty check go RED, so the green above is a result rather than a shape",
    mutated.honest === false, `empty column ${emptyCol5}: ${JSON.stringify(mutated)}`);
  await p5.evaluate(() => document.querySelector("[data-stx-mutation]")?.remove());
  // Gone after the drop, and gone after a cancel — a guide is carry feedback, not decoration.
  await p5.keyboard.press("ArrowDown");
  await p5.keyboard.press("Enter");
  await p5.waitForTimeout(200);
  t("#217/AC3 · the guides are removed on DROP", (await p5.locator(`${VIEWPORT} .stx-guide`).count()) === 0);
  await p5.locator(`.stx-slot[data-stx-id="${grid5[0].id}"] .stx-grab`).focus();
  await p5.keyboard.press("Enter");
  await p5.waitForTimeout(100);
  await p5.keyboard.press("Escape");
  await p5.waitForTimeout(120);
  t("#217/AC3 · …and on CANCEL", (await p5.locator(`${VIEWPORT} .stx-guide`).count()) === 0);
  await p5.close();

  // --- 6 · AC #4: the context menu, both open paths, identical items ------------------------------
  const p6 = await openSettled();
  const grid6 = await slotsNow(p6);
  const menuNode = grid6[1].id;
  const items = (p) => p.evaluate(() => {
    const m = document.querySelector("[data-studio-canvas] .stx-menu");
    return m ? [...m.querySelectorAll(".stx-menu-item")].map((b) => b.textContent.trim()) : null;
  });
  await p6.locator(`.stx-slot[data-stx-id="${menuNode}"] .stx-grab`).focus();
  await p6.keyboard.press("Shift+F10");
  await p6.waitForTimeout(120);
  const byKey = await items(p6);
  t("#217/AC4 · Shift+F10 on a focused component opens its context menu",
    Array.isArray(byKey) && byKey.length >= 4, JSON.stringify(byKey));
  t("#217/AC4 · …with focus on the FIRST item, per the APG menu pattern",
    (await focusedText(p6)) === (byKey && byKey[0]), await focusedText(p6));
  // Arrow / Home / End navigation — the half a mouse-only implementation drops.
  await p6.keyboard.press("ArrowDown");
  const second = await focusedText(p6);
  await p6.keyboard.press("ArrowUp");
  const backToFirst = await focusedText(p6);
  await p6.keyboard.press("End");
  const last = await focusedText(p6);
  await p6.keyboard.press("Home");
  const home = await focusedText(p6);
  t("#217/AC4 · …and full arrow-key navigation: Down, Up, End and Home each move focus to the right item",
    second === byKey[1] && backToFirst === byKey[0] && last === byKey[byKey.length - 1] && home === byKey[0],
    JSON.stringify({ second, backToFirst, last, home, byKey }));
  await p6.keyboard.press("Escape");
  await p6.waitForTimeout(100);
  t("#217/AC4+AC5 · Escape closes the menu and RETURNS FOCUS TO THE INVOKER, not to the body",
    (await p6.locator(`${VIEWPORT} .stx-menu`).count()) === 0
    && (await p6.evaluate(() => document.activeElement?.className || "")).includes("stx-grab"),
    await p6.evaluate(() => document.activeElement?.className || "BODY"));
  // THE SAME CLAIM ON THE POINTER PATH, AND ON A FRESH PAGE WITH FOCUS CLEARED — which is the whole
  // row, not housekeeping. The keyboard rows above legitimately left focus on this very node's grab
  // handle, and a right-click does not move focus; so if the pointer path's focus restore no-ops,
  // focus is STILL on that handle from the earlier, unrelated success and the assertion passes on
  // RESIDUE. That is exactly how PR #263's review found a live AC violation behind a green pass:
  // openMenu resolved the invoker to the non-focusable `.stx-slot` wrapper for every right-click
  // that missed the 24×24 corner handle, so closeMenu()'s focus() was a silent no-op. The fresh
  // page + cleared focus is the discriminator, the same shape the three-source proof already uses
  // for injected moves. Asserted POSITIVELY on `.stx-grab` rather than as "not BODY", which
  // focusing the stage would also satisfy. Proven red against the unfixed module before it landed.
  const p6b = await openSettled(ctx, "select-menu-focus");
  const menuNodeB = (await slotsNow(p6b))[1].id;
  await p6b.evaluate(() => document.activeElement?.blur?.());
  const clearedB = await p6b.evaluate(() => document.activeElement?.tagName || "none");
  t("#217/AC4+AC5 · (the discriminator itself) focus really is cleared before the pointer open — a row that skipped this would inherit the residue it exists to catch",
    clearedB === "BODY", clearedB);
  // The wrapper's CENTRE, i.e. deliberately NOT the corner handle: that is the miss the bug lived in.
  await p6b.locator(`.stx-slot[data-stx-id="${menuNodeB}"]`).click({ button: "right" });
  await p6b.waitForTimeout(150);
  await p6b.keyboard.press("Escape");
  await p6b.waitForTimeout(150);
  const escFocusB = await p6b.evaluate(() => ({
    cls: document.activeElement?.className || "",
    tag: document.activeElement?.tagName || "none",
    menu: document.querySelectorAll("[data-studio-canvas] .stx-menu").length,
  }));
  t("#217/AC4+AC5 · a RIGHT-CLICK on a component's centre also returns focus to its grab handle on Escape — the invoker is resolved inside openMenu, so a press that misses the handle is not a press that loses the reader",
    escFocusB.menu === 0 && escFocusB.cls.includes("stx-grab"), JSON.stringify(escFocusB));
  await p6b.close();
  // THE POINTER PATH, against the SAME node — the item lists must be identical by accessible name.
  const scrollBefore = await p6.evaluate(() => {
    const s = document.querySelector("[data-studio-canvas] .stx-scroll");
    return { l: Math.round(s.scrollLeft), t: Math.round(s.scrollTop) };
  });
  await p6.locator(`.stx-slot[data-stx-id="${menuNode}"]`).click({ button: "right" });
  await p6.waitForTimeout(120);
  const byPointer = await items(p6);
  t("#217/AC4 · a right-click opens the menu with IDENTICAL items — one pure menuItems() behind both paths, not two builders that agree",
    JSON.stringify(byPointer) === JSON.stringify(byKey), `${JSON.stringify(byPointer)} vs ${JSON.stringify(byKey)}`);
  // A menu ITEM must start neither a pan nor a drag: it sits on a stage that pans and beside a
  // mover that drags, and both of those are two ancestors' worth of assumption.
  await p6.locator(`${VIEWPORT} .stx-menu-item`).first().click();
  await p6.waitForTimeout(140);
  const scrollAfter = await p6.evaluate(() => {
    const s = document.querySelector("[data-studio-canvas] .stx-scroll");
    return { l: Math.round(s.scrollLeft), t: Math.round(s.scrollTop) };
  });
  t("#217/AC4 · pressing a menu item starts NEITHER a pan NOR a drag — the scroller has not moved and nothing is picked up",
    scrollAfter.l === scrollBefore.l && scrollAfter.t === scrollBefore.t && (await picked(p6)) === 0,
    JSON.stringify({ scrollBefore, scrollAfter, picked: await picked(p6) }));
  t("#217/AC4 · …and \"Select this\" really selected THAT component",
    JSON.stringify(await chosen(p6)) === JSON.stringify([menuNode]), JSON.stringify(await chosen(p6)));
  // The contextual item flips, on the running page — group 22 pins the pure half both ways.
  await p6.locator(`.stx-slot[data-stx-id="${menuNode}"]`).click({ button: "right" });
  await p6.waitForTimeout(120);
  const onSelected = await items(p6);
  t("#217/AC4 · the menu on an ALREADY-SELECTED component offers Deselect this rather than Select this, and gains Clear selection",
    onSelected[0] === "Deselect this" && onSelected.includes("Clear selection") && !onSelected.includes("Select this"),
    JSON.stringify(onSelected));
  await p6.keyboard.press("Escape");
  // D10's visible path: Select all from the MENU, so the criterion is not satisfied only for
  // readers who know the shortcut.
  await p6.locator(`.stx-slot[data-stx-id="${menuNode}"]`).click({ button: "right" });
  await p6.waitForTimeout(120);
  await p6.locator(`${VIEWPORT} .stx-menu-item`).filter({ hasText: "Select all" }).first().click();
  await p6.waitForTimeout(140);
  t("#217/AC4 · the menu's Select all selects every component — D10's visible path for readers who never learn ⌘/Ctrl+A",
    (await chosen(p6)).length === grid6.length, `${(await chosen(p6)).length} of ${grid6.length}`);
  // ⌘/Ctrl+A, focus-scoped to the scroller (D10).
  await p6.keyboard.press("Escape");
  await p6.waitForTimeout(100);
  await p6.locator(SCROLL).focus();
  await countLive(p6);
  await p6.keyboard.press(modA);
  await p6.waitForTimeout(120);
  const saidA = await liveSeen(p6);
  t("#217/AC4 · ⌘/Ctrl+A with the canvas focused selects all and announces once",
    (await chosen(p6)).length === grid6.length && saidA.n === 1, `${JSON.stringify(saidA)}`);
  await p6.close();

  // --- 7 · R5: the far-edge FLIP, and an honest account of what it actually buys -----------------
  // TWO THINGS THE PLAN GOT WRONG ABOUT THIS ROW, both found by running it rather than reasoning:
  //
  //   1. A POINTER CANNOT REACH COLUMN 12 AT THIS VIEWPORT. On /factory the scroller measures ~2818
  //      px wide — wider than the 1440 px window — so scrollWidth <= clientWidth, scrollLeft stays
  //      pinned at 0 and a block at column 12 sits at x ≈ 2741, off-screen and un-scrollable-to.
  //      That is this driver's own standing constraint (an EMPTY cell is not automatically a
  //      REACHABLE one) arriving on the far axis. The menu is therefore opened through the module's
  //      OWN entry point, which is the one both real paths call; the POINTER open path is proven on
  //      a reachable interior block in section 6, so nothing is lost.
  //   2. THE MENU IS NARROWER THAN A TRACK (≈91 px against a 220 px column), so it never overflows
  //      the stage and "the menu's rect is inside the scroller" is VACUOUSLY true with the flip and
  //      without it. Asserting that would have been a check that cannot fail. What the flip really
  //      does — and what is asserted below — is align the menu's RIGHT edge with its grid area's
  //      right edge instead of growing rightward from its left edge. It is a positioning guarantee
  //      today and becomes an overflow rescue the moment the menu grows past a track (a sixth item,
  //      a longer label, a narrower --stx-slot-w), which is exactly when nobody would be looking.
  const p7 = await openSettled();
  const grid7 = await slotsNow(p7);
  const edgeId = grid7[0].id;
  const openAt = async (col, { stripFlip = false } = {}) => {
    await inject(p7, { type: "ui.move", source: "agent", target: { id: edgeId }, params: { col, row: 1 } });
    await p7.waitForTimeout(150);
    return p7.evaluate(async ([id, strip]) => {
      const m = await import("/system/studio-select.mjs");
      const sel = m.getSelect();
      sel.closeMenu({ restoreFocus: false });
      const node = document.querySelector(`.stx-slot[data-stx-id="${id}"]`);
      sel.openMenu(node, node);
      const menu = document.querySelector("[data-studio-canvas] .stx-menu");
      if (!menu) return null;
      if (strip) menu.removeAttribute("data-flip-x"); // the MUTATION: undo the fix, keep everything else
      const stage = document.querySelector("[data-studio-canvas] .stx-stage");
      const mr = menu.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      return {
        flipX: menu.hasAttribute("data-flip-x"),
        col: menu.getAttribute("data-col"),
        right: Math.round(mr.right), left: Math.round(mr.left), width: Math.round(mr.width),
        stageRight: Math.round(sr.right),
      };
    }, [edgeId, stripFlip]);
  };
  const flipped = await openAt(MAX_COLS);
  t(`#217 · R5 — a menu opened on a LAST-COLUMN (${MAX_COLS}) component sets data-flip-x, and the CSS rule is LIVE: its right edge lands on its grid area's right edge`,
    Boolean(flipped) && flipped.flipX === true && flipped.col === String(MAX_COLS)
    && Math.abs(flipped.right - flipped.stageRight) <= 1, JSON.stringify(flipped));
  // THE MUTATION that decides whether the row above can fail: same menu, same cell, attribute
  // removed. If .stx-menu[data-flip-x] { justify-self: end } ever stopped being in the sheet, the
  // two measurements would be identical and this goes red.
  const unflipped = await openAt(MAX_COLS, { stripFlip: true });
  t("#217 · R5 · THE MUTATION — removing data-flip-x really moves the box, so the rule is wired rather than merely written",
    unflipped.right < flipped.right - 1 && unflipped.width === flipped.width,
    `${JSON.stringify(unflipped)} vs ${JSON.stringify(flipped)}`);
  // …and it is CONDITIONAL, not always on — the other side of an off-by-one that group 22 pins purely.
  const interior = await openAt(3);
  t("#217 · …while an INTERIOR component's menu carries no flip at all, so the attribute is proven conditional rather than always on",
    interior.flipX === false && interior.col === "3", JSON.stringify(interior));
  // R7: the menu is anchored to a CELL, so a pan leaves it detached from the block it belongs to.
  // Scrolled VERTICALLY — the horizontal axis does not scroll here at all (see note 1 above), so a
  // scrollLeft nudge would fire no scroll event and this row would pass for the wrong reason.
  await p7.evaluate(() => { document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop += 120; });
  await p7.waitForTimeout(300);
  t("#217 · R7 — scrolling the canvas CLOSES an open menu, which is anchored to a cell and would otherwise float over an unrelated component",
    (await p7.locator(`${VIEWPORT} .stx-menu`).count()) === 0,
    `scrollTop=${await p7.evaluate(() => Math.round(document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop))}`);
  await p7.close();

  // --- 8 · AC #5: Escape cancels every multi-verb back to the pre-verb state ----------------------
  const p8 = await openSettled();
  const grid8 = await slotsNow(p8);
  // (a) Escape during a MARQUEE restores the PRIOR selection, not an empty one.
  await shiftDrag(p8, await cell(p8, 1, 1), await cell(p8, 2, 2));
  const prior = await chosen(p8);
  const cellA = await cell(p8, 3, 1);
  const cellB = await cell(p8, 4, 3);
  await p8.keyboard.down("Shift");
  await p8.mouse.move(cellA.x, cellA.y);
  await p8.mouse.down();
  await p8.mouse.move(cellB.x, cellB.y, { steps: 8 });
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(140);
  await p8.mouse.up();
  await p8.keyboard.up("Shift");
  await p8.waitForTimeout(140);
  t("#217/AC5 · Escape mid-MARQUEE restores the selection the reader had BEFORE it — the pre-verb state, not an empty one",
    JSON.stringify(await chosen(p8)) === JSON.stringify(prior),
    `${JSON.stringify(await chosen(p8))} vs ${JSON.stringify(prior)}`);
  // (b) Escape during a group CARRY returns every member to its origin AND leaves the selection.
  const before8 = await slotsNow(p8);
  await p8.locator(`.stx-slot[data-stx-id="${prior[0]}"] .stx-grab`).focus();
  await p8.keyboard.press("Enter");
  await p8.keyboard.press("ArrowDown");
  await p8.waitForTimeout(100);
  await countLive(p8);
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(160);
  const after8 = await slotsNow(p8);
  t("#217/AC5 · Escape mid-group-CARRY puts EVERY member back at its own origin",
    JSON.stringify(after8) === JSON.stringify(before8), `${JSON.stringify(after8)} vs ${JSON.stringify(before8)}`);
  t("#217/AC5 · …announced once, naming the count", (await liveSeen(p8)).last.startsWith("Cancelled, "),
    (await liveSeen(p8)).last);
  t("#217/AC5 · …and the SELECTION survives the cancel — a cancelled move is not a reason to lose the set",
    JSON.stringify(await chosen(p8)) === JSON.stringify(prior));
  t("#217/AC5 · …with nothing left picked up", (await picked(p8)) === 0);
  // (c) THE NON-INTERFERENCE, in the one direction that is reachable: a marquee cannot START while a
  // carry is live, so the two Escape listeners can never both be armed. Asserted as the guard rather
  // than as the impossible state — a Shift-drag mid-carry changes no selection and kills no carry.
  await p8.locator(`.stx-slot[data-stx-id="${prior[0]}"] .stx-grab`).focus();
  await p8.keyboard.press("Enter");
  await p8.waitForTimeout(100);
  const selDuring = await chosen(p8);
  await shiftDrag(p8, await cell(p8, 1, 3), await cell(p8, 2, 4));
  t("#217/D11 · a Shift-drag while a carry is LIVE starts no marquee — the selection is untouched and the carry is still in the reader's hand, so the two Escape listeners are never both armed",
    JSON.stringify(await chosen(p8)) === JSON.stringify(selDuring) && (await picked(p8)) > 0,
    `${JSON.stringify(await chosen(p8))} picked=${await picked(p8)}`);
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(120);
  // (d) Escape on a plain selection clears it (AC #5's third verb).
  await p8.locator(SCROLL).focus();
  await countLive(p8);
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(120);
  const said8 = await liveSeen(p8);
  t("#217/AC5 · Escape on a live selection with nothing else running clears it and says so",
    (await chosen(p8)).length === 0 && said8.n === 1 && said8.last === "Selection cleared.", JSON.stringify(said8));
  // (e) …and ONLY when the canvas is where the reader is. The clear branch is guarded on
  // scroll.contains(document.activeElement), because /factory is a long page with several other
  // Escape-sensitive surfaces, and an Escape pressed at the far end of it must not silently empty a
  // selection the reader cannot even see.
  await shiftDrag(p8, await cell(p8, 1, 1), await cell(p8, 2, 2));
  const keptSel = await chosen(p8);
  t("#217 · the focus-scope fixture starts from a REAL selection — an empty one would make the row below vacuous",
    keptSel.length > 0, JSON.stringify(keptSel));
  // ZOOM IN rather than Undo: the section above cancels everything it starts, so the history can be
  // empty here and .focus() on a DISABLED button is a silent no-op — focus would stay inside the
  // scroller and this row would fail for a reason that has nothing to do with what it tests. The
  // move is asserted rather than assumed, which is what makes the row's premise checkable.
  await btn(p8, "Zoom in").focus();
  const outside = await p8.evaluate(() => {
    const s = document.querySelector("[data-studio-canvas] .stx-scroll");
    return { moved: !s.contains(document.activeElement), what: document.activeElement?.textContent?.trim() || document.activeElement?.tagName };
  });
  t("#217 · the focus-scope fixture is real — focus genuinely left the canvas before Escape",
    outside.moved === true, JSON.stringify(outside));
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(150);
  t("#217/D10 · Escape with focus OUTSIDE the canvas leaves the selection alone — the clear is focus-scoped, like ⌘/Ctrl+A",
    JSON.stringify(await chosen(p8)) === JSON.stringify(keptSel) && keptSel.length > 0,
    `${JSON.stringify(await chosen(p8))} vs ${JSON.stringify(keptSel)}`);
  // (f) THE ⌘K PALETTE, pinned rather than reasoned about — the same discipline R4 applies to the
  // replay driver. system/palette.mjs:272 stopPropagation()s Escape precisely so the listeners
  // underneath it never see the key; this module is now one of those listeners, and a future edit
  // that dropped that line would silently start clearing the selection every time a reader closed
  // the palette. Nothing else in the repo would notice.
  await p8.keyboard.press(engineName === "webkit" ? "Meta+k" : "Control+k");
  await p8.waitForTimeout(400);
  const paletteOpen = await p8.evaluate(() => Boolean(document.querySelector("dialog[open]")));
  await p8.keyboard.press("Escape");
  await p8.waitForTimeout(300);
  const afterPalette = await p8.evaluate(() => Boolean(document.querySelector("dialog[open]")));
  t("#217 · the ⌘K palette's Escape closes the palette and does NOT reach this module — its stopPropagation is a line #217 now depends on",
    paletteOpen === true && afterPalette === false && JSON.stringify(await chosen(p8)) === JSON.stringify(keptSel),
    `open=${paletteOpen}→${afterPalette} sel=${JSON.stringify(await chosen(p8))}`);
  await p8.close();

  // --- 9 · R3: the QUICK group drag, released with no settling wait -------------------------------
  // The stale-rAF-frame bug wearing its group hat: skip either flushPreview call site and a fast
  // drag lands one cell short. Reproducible on WEBKIT first — its rAF is the slowest to flush — and
  // intermittent on the other two, which is exactly why it is run on all three and named here.
  const p9 = await openSettled();
  const grid9 = await slotsNow(p9);
  await shiftDrag(p9, await cell(p9, 1, 1), await cell(p9, 2, 2), { quick: true });
  await p9.waitForTimeout(200);
  const members9 = await chosen(p9);
  t("#217 · R3 — even a QUICK marquee (no settling wait before release) selects the whole rectangle rather than one cell short",
    JSON.stringify(members9) === JSON.stringify(want), `${JSON.stringify(members9)} vs ${JSON.stringify(want)}`);
  const target9 = await cell(p9, 1, 3);
  await dragHandle(p9, members9[0], target9, { quick: true });
  await p9.waitForTimeout(300);
  const grid9b = await slotsNow(p9);
  t(`#217 · R3 — a QUICK group drag lands on the cell the reader RELEASED on, not one short (${engineName}; webkit is the engine this reproduces on)`,
    members9.every((id) => {
      const was = grid9.find((s) => s.id === id);
      const now = grid9b.find((s) => s.id === id);
      return now.col === was.col && now.row === was.row + 2;
    }), JSON.stringify(grid9b.filter((s) => members9.includes(s.id))));
  await p9.close();

  // --- 10 · R10: a compile keeps the SELECTION and cancels a CARRY — two properties, not one ------
  const p10 = await openSettled();
  await shiftDrag(p10, await cell(p10, 1, 1), await cell(p10, 2, 2));
  const members10 = await chosen(p10);
  // NOT .catch()-ed, on this file's own terms: a swallowed rejection turns a selector typo into a
  // confusing 30 s timeout on the waitForSelector below instead of a named failure on the line that
  // is actually wrong. Fail on the missing thing, loudly.
  await p10.locator("[data-studio-compile] button").filter({ hasText: /^Compile/ }).first().click();
  await p10.waitForSelector('[data-compile-state="rendered"]', { timeout: 30000 });
  t("#217 · R10a — a COMPILE keeps the selection: the beat swaps wrapper CONTENTS, never the wrappers, which is what a reader expects",
    JSON.stringify(await chosen(p10)) === JSON.stringify(members10),
    `${JSON.stringify(await chosen(p10))} vs ${JSON.stringify(members10)}`);
  // …and the other half, which looks like the same property and is not: a live group CARRY must be
  // cancelled by the same beat (studio.mjs:467's verbs.cancel(), now over N members).
  const before10 = await slotsNow(p10);
  await p10.locator(`.stx-slot[data-stx-id="${members10[0]}"] .stx-grab`).focus();
  await p10.keyboard.press("Enter");
  await p10.keyboard.press("ArrowDown");
  await p10.waitForTimeout(120);
  t("#217 · the R10b fixture is real — a group carry is genuinely live and has moved", (await picked(p10)) > 1,
    `picked=${await picked(p10)}`);
  await p10.locator("[data-studio-compile] button").filter({ hasText: /Back to blocks/ }).first().click();
  await p10.waitForSelector('[data-compile-state="blocks"]', { timeout: 30000 });
  await p10.waitForTimeout(200);
  t("#217 · R10b — the same beat CANCELS a live group carry: every member back at its origin, nothing left picked up",
    (await picked(p10)) === 0 && JSON.stringify(await slotsNow(p10)) === JSON.stringify(before10),
    `picked=${await picked(p10)} ${JSON.stringify(await slotsNow(p10))} vs ${JSON.stringify(before10)}`);
  t("#217 · …while the selection still survives it — two properties, asserted as two rows",
    JSON.stringify(await chosen(p10)) === JSON.stringify(members10));
  await p10.close();

  // --- 11 · R4: the take-over coupling, BOTH SIDES, mid-replay -----------------------------------
  // Neither line below is edited by this ticket and both are depended on by it, so both are pinned.
  const mkRoutes = async () => {
    const p = await ctx.newPage();
    watch(p, "select take-over");
    await p.addInitScript(() => {
      window.__pushed = [];
      const real = history.pushState.bind(history);
      history.pushState = (s, ti, u) => { window.__pushed.push(String(u)); return real(s, ti, u); };
    });
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await p.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
    // THE CANVAS IS PARKED IN VIEW before any pointer row, for openSettled's reason: /factory's
    // studio sits below the fold, so a raw mouse.move to a rect-derived point lands off-screen and
    // the press never happens — which reads as "the take-over did not fire" rather than as "the
    // press did not land". A programmatic page scroll is neither a pointerdown nor a keydown on
    // canvas.scroll, so it cannot itself count as a handover.
    await p.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    return p;
  };
  const replayNow = (p) => p.evaluate(() => import("/system/replay-driver.mjs").then((m) => {
    const r = m.getReplay();
    return r ? { state: r.state, index: r.index, beats: r.beats.length, took: r.tookOver } : null;
  }));

  // (a) a Shift-drag marquee IS a take-over. It is safe ONLY because replay-driver.mjs:781-782
  // captures on canvas.scroll — an ANCESTOR — so this module's stopPropagation on the stage cannot
  // suppress it. Move that listener to the bubble phase and nothing else in the repo notices.
  const pa = await mkRoutes();
  const midA = await replayNow(pa);
  t("#217 · R4a — the marquee take-over case really is MID-REPLAY; a settled page would prove the wrong thing",
    midA && midA.state === "ready" && midA.index < midA.beats, JSON.stringify(midA));
  // THE DRAG POINTS COME FROM THE SCROLLER'S OWN RECT, not from cell(): mid-replay the canvas holds
  // only the blocks the run has placed so far, and cell() needs the reference slots at (1,1) and
  // (2,1) to BOTH exist — without them it answers { error } and the drag lands at NaN, which is a
  // press that never happens and a take-over that never fires. This row is about the handover, not
  // about what the marquee caught, so any two points inside the scroller are the right fixture.
  const band = await pa.evaluate(() => {
    const r = document.querySelector("[data-studio-canvas] .stx-scroll").getBoundingClientRect();
    return { from: { x: r.left + 80, y: r.top + 60 }, to: { x: r.left + 320, y: r.top + 260 } };
  });
  await shiftDrag(pa, { ...band.from, onScreen: true }, { ...band.to, onScreen: true });
  await pa.waitForTimeout(400);
  const tookA = await replayNow(pa);
  t("#217 · R4a — a Shift-drag marquee mid-replay IS a take-over: the transport dies and provenance flips to the visitor",
    tookA.took === true && (await pa.getAttribute("[data-studio]", "data-provenance")) === "visitor",
    JSON.stringify(tookA));
  t("#217 · …firing /factory/took-over exactly once, as a bare static literal",
    (await pa.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 1
    && (await pa.evaluate(() => window.__pushed.every((u) => !/[?#]/.test(u)))),
    JSON.stringify(await pa.evaluate(() => window.__pushed.slice())));
  await pa.close();

  // (b) ⌘/Ctrl+A mid-replay is NOT a take-over — replay-driver.mjs:747's discriminator returns early
  // for ctrlKey/metaKey, exactly as it already does for ⌘Z. Inherited, not fixed: the same line
  // governs ⌘Z/⌘Y and its current set is gated by #209/#213's rows. Pinned so a future reader who
  // assumes symmetry finds a red row rather than a surprise.
  const pb = await mkRoutes();
  await pb.locator(SCROLL).focus();
  await pb.keyboard.press(modA);
  await pb.waitForTimeout(400);
  const afterB = await replayNow(pb);
  t("#217 · R4b — ⌘/Ctrl+A mid-replay is NOT a take-over: the selection applies while the run keeps playing (the same modifier rule that already governs ⌘Z)",
    afterB.took === false && (await chosen(pb)).length > 0, JSON.stringify(afterB));
  t("#217 · …and no /factory/took-over is fired for a handover that did not happen",
    (await pb.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 0,
    JSON.stringify(await pb.evaluate(() => window.__pushed.slice())));
  await pb.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  t("#217 · …and the run still reaches the committed board it was building",
    (await replayNow(pb)).state === "settled");
  await pb.close();
  await ctx.close();

  // --- 12 · AC #6: reduced motion completes every verb ------------------------------------------
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const pr = await openSettled(rctx, "select reduced-motion");
  const gridR = await slotsNow(pr);
  await shiftDrag(pr, await cell(pr, 1, 1), await cell(pr, 2, 2));
  const membersR = await chosen(pr);
  t("#217/AC6 · under reduced motion the marquee still selects the same rectangle",
    JSON.stringify(membersR) === JSON.stringify(want), JSON.stringify(membersR));
  await dragHandle(pr, membersR[0], await cell(pr, 1, 2));
  const gridR2 = await slotsNow(pr);
  t("#217/AC6 · …the group move still COMPLETES and reaches the identical end state",
    membersR.every((id) => {
      const was = gridR.find((s) => s.id === id);
      const now = gridR2.find((s) => s.id === id);
      return now.col === was.col && now.row === was.row + 1;
    }), JSON.stringify(gridR2.filter((s) => membersR.includes(s.id))));
  await btn(pr, "Undo").click();
  await pr.waitForTimeout(240);
  t("#217/AC6 · …one Undo still restores every member",
    JSON.stringify(await slotsNow(pr)) === JSON.stringify(gridR));
  await pr.locator(`.stx-slot[data-stx-id="${membersR[0]}"] .stx-grab`).focus();
  await pr.keyboard.press("Shift+F10");
  await pr.waitForTimeout(120);
  // OPENS · NAVIGATES · CLOSES — all three actually driven, because the sentence names all three.
  // It used to assert the item count alone, which made "navigates and closes" a claim no key press
  // stood behind (PR #263 review, finding 6). Arrow navigation is the half most likely to be lost
  // under reduced motion, since it is the one that moves focus between items.
  const openedR = await pr.locator(`${VIEWPORT} .stx-menu-item`).count();
  const firstR = await focusedText(pr);
  await pr.keyboard.press("ArrowDown");
  const secondR = await focusedText(pr);
  t("#217/AC6 · …and the context menu still opens, navigates and closes",
    openedR >= 4 && !!secondR && secondR !== firstR,
    JSON.stringify({ openedR, firstR, secondR }));
  await pr.keyboard.press("Escape");
  await pr.waitForTimeout(100);
  t("#217/AC6 · …closing on Escape and returning focus to the invoker",
    (await pr.locator(`${VIEWPORT} .stx-menu`).count()) === 0
    && (await pr.evaluate(() => document.activeElement?.className || "")).includes("stx-grab"),
    await pr.evaluate(() => document.activeElement?.className || "BODY"));
  await pr.close();
  await rctx.close();

  // --- 13 · FIT WHILE COMPILED — the running-page proof no one had ------------------------------
  // studio-canvas.mjs:174-177 words fit()'s announcement as the level REACHED, never as "everything
  // is in view", precisely because below the smallest level nothing fits and fit() floors there
  // rather than inventing a scale. That branch is unreachable at rest (the blocks are small) and
  // reachable the moment the beat compiles: the stage grows past .stx-scroll's 640px cap, so Fit
  // pins at the 0.5 FLOOR. Group 12 gates fitLevel's floor as arithmetic; this is the only place
  // the honest SENTENCE and the floored level are read off a real compiled page.
  const fctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const pf = await openSettled(fctx, "select fit-compiled");
  await pf.locator("[data-studio-compile] button").filter({ hasText: /^Compile/ }).first().click();
  await pf.waitForSelector('[data-compile-state="rendered"]', { timeout: 30000 });
  await btn(pf, "Fit").click();
  await pf.waitForTimeout(200);
  const fit = await pf.evaluate(() => ({
    zoom: document.querySelector("[data-studio-canvas]").getAttribute("data-zoom"),
    live: document.querySelector("[data-studio-canvas] .stx-live").textContent.trim(),
  }));
  t(`#217 · Fit on a COMPILED canvas floors at zoom level 0 (${Math.round(ZOOM_LEVELS[0] * 100)}%) — the compiled stage is far larger than the scroller, which is graceful degradation rather than a fit`,
    fit.zoom === "0", JSON.stringify(fit));
  t("#217 · …and says the level it REACHED, never that everything is in view — a claim the discrete table cannot always keep",
    fit.live === `Zoom ${Math.round(ZOOM_LEVELS[0] * 100)} percent, fit to the canvas`, fit.live);
  await pf.close();
  await fctx.close();
}

// engines): the Event Timing API's durationThreshold floors at 16 ms and a healthy studio
// interaction usually completes under it, so most rows yield NO entry. That is a sound pass —
// the observer delivers every entry ≥ 16 ms, so no entry ⇒ latency < 16 ≤ 200 — but only because
// the calibration step below proves the delivery pipeline ALIVE first with a forced-slow click.
// A bare-click sanity check fails healthy pages (a fast page legitimately yields nothing), and
// no calibration at all lets a silently-dead observer turn every budget row vacuous-green
// (proto-journey.mjs:289-304's recorded lesson, arriving here as a fixture choice). The rows
// CONSUME that verdict (PR #247 review): a dead pipeline is sixteen named reds, not one.
// #218 · THE DOCKED COMPONENT DOCS — the second mount of /components' generated docs, in the
// inspector. This pass owns the two claims build-checks group 23 states it cannot reach, and it
// says which is which so a later editor cannot delete either as redundant:
//
//   · THE LAZY WIRING. Group 23 gates shouldLoad's truth table; only a browser can say whether
//     refresh() CONSULTS it. Assertion 1 is therefore split in two, because the two halves catch
//     opposite regressions that look identical from every other angle: an eager fetch at mount
//     (zero-at-rest goes red) and a refresh() that re-fetches on every canvas render (the delta
//     goes red — three requests behind every undo, which no pixel, Node or drift gate can see).
//
//   · THE CROSS-PAGE FACT. Group 23 proves the join carries the third argument's fields; only a
//     browser can compare what the two pages RENDER. Assertion 5 does that, and its ORDER is part
//     of the assertion — see its own note.
//
// THE DELTA, AND WHY IT IS NOT A RAW COUNT (a correctness point, not a weakening): two of the three
// DOCS_SOURCES have other consumers on this very page. studio-compile.mjs fetches
// /handoff/verdant/vocabulary.json on first compile, and studio.mjs fetches /system/system-graph.json
// when the Graph panel is activated. A raw "exactly 1 per url" would be RED on a correct
// implementation. So: the zero-before-Compile half stays a raw count on all three (nothing has
// fetched any of them yet, which is the strong claim), pack.json — which nothing else on the page
// touches — is additionally asserted at exactly 1, and the once-only property is asserted for all
// three as a DELTA across repeated re-renders.
async function docsPass(browser, engineName, t, errors) {
  const SOURCES = DOCS_SOURCES;
  const PRIMITIVES = ".stf-screen .ds-metric-tile, .stf-screen .ds-list-row, .stf-screen .ds-sequence-step";
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  const count = (url) => requests.filter((r) => r.endsWith(url)).length;
  const counts = () => SOURCES.map(count);

  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`docs pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`docs console: ${m.text()}`); });
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
  await page.waitForSelector('[data-replay="settled"]', { timeout: 30000 });

  const compileBtn = () => page.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true });
  const revertBtn = () => page.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true });
  const compileOnce = async () => {
    await compileBtn().click();
    await page.waitForSelector(".stf-screen", { timeout: 20000 });
  };

  // ---------------------------------------------------------------- [1a] at rest, nothing fetched
  const atRest = counts();
  t("#218/1a · at rest the docs panel has fetched NONE of its three artifacts — the lazy discriminator, the one property no other gate in this repo can see",
    atRest.every((n) => n === 0), SOURCES.map((u, i) => `${u}=${atRest[i]}`).join(" "));
  t("#218/1a · …and no node on the canvas is a doc trigger before Compile — the drafted places are not vocabulary components and have no docs to show",
    (await page.locator(`${VIEWPORT} [data-studio-docs]`).count()) === 0);
  t("#218/1a · the panel states its precondition instead of pretending to be empty",
    /Compile the board first/.test(await page.locator("[data-studio-docs-empty]").innerText()),
    await page.locator("[data-studio-docs-empty]").innerText());

  // ---------------------------------------------------------------- [2] every primitive is a trigger
  await compileOnce();
  await page.waitForFunction(() => document.querySelectorAll("[data-studio-docs]").length > 0, null, { timeout: 20000 });
  const decoration = await page.evaluate((sel) => {
    const rendered = [...document.querySelectorAll(sel)];
    return {
      rendered: rendered.length,
      triggers: rendered.filter((n) => n.hasAttribute("data-studio-docs")).length,
      focusable: rendered.filter((n) => n.getAttribute("tabindex") === "0").length,
      described: rendered.filter((n) => n.getAttribute("aria-describedby") === "stu-docs-help").length,
      helpText: document.getElementById("stu-docs-help")?.textContent || "",
      names: [...new Set(rendered.map((n) => n.getAttribute("data-studio-docs")))],
    };
  }, PRIMITIVES);
  t("#218/2 · after Compile EVERY rendered primitive is a doc trigger, focusable and described — the count read off the running page, never typed",
    decoration.rendered > 0 && decoration.triggers === decoration.rendered
    && decoration.focusable === decoration.rendered && decoration.described === decoration.rendered,
    JSON.stringify(decoration));
  t("#218/2 · the affordance is stated ONCE, statically, rather than announced on every Tab step",
    /Focus or click a component/.test(decoration.helpText), decoration.helpText);

  // ---------------------------------------------------------------- [3] the pointer opens the docs
  const first = page.locator(`${VIEWPORT} [data-studio-docs]`).first();
  const firstName = await first.getAttribute("data-studio-docs");
  await first.click();
  await page.waitForSelector("#component-docs .cat-name", { timeout: 10000 });
  const opened = await page.evaluate(() => ({
    selected: document.getElementById("stu-tab-component-docs").getAttribute("aria-selected"),
    hidden: document.getElementById("component-docs").hidden,
    name: document.querySelector("#component-docs .cat-name")?.textContent,
    nameTag: document.querySelector("#component-docs .cat-name")?.tagName,
    sectionTag: document.querySelector("#component-docs .cat-section-title")?.tagName,
    emptyHidden: document.querySelector("[data-studio-docs-empty]").hidden,
  }));
  t("#218/3 · a pointer click opens THAT component's docs and switches the inspector to them",
    opened.selected === "true" && opened.hidden === false && opened.name === firstName && opened.emptyHidden === true,
    JSON.stringify({ ...opened, firstName }));
  t("#218/3 · the heading level is shifted for the second mount — an h4 name under the panel's own h3, sections one below",
    opened.nameTag === "H4" && opened.sectionTag === "H5", `${opened.nameTag}/${opened.sectionTag}`);

  // ---------------------------------------------------------------- [4] focus opens, and steals nothing
  // A DIFFERENT component, so "the panel re-rendered" is a real observation rather than a no-op.
  const other = page.locator(`${VIEWPORT} [data-studio-docs]`).filter({ hasNot: page.locator("nothing") });
  const otherName = await page.evaluate((want) => {
    const n = [...document.querySelectorAll("[data-studio-canvas] [data-studio-docs]")]
      .find((x) => x.getAttribute("data-studio-docs") !== want);
    if (!n) return null;
    n.focus();
    return n.getAttribute("data-studio-docs");
  }, firstName);
  if (otherName) {
    await page.waitForFunction((w) => document.querySelector("#component-docs .cat-name")?.textContent === w,
      otherName, { timeout: 10000 }).catch(() => {});
    const focused = await page.evaluate(() => ({
      name: document.querySelector("#component-docs .cat-name")?.textContent,
      onCanvas: document.activeElement?.hasAttribute("data-studio-docs") === true,
      active: document.activeElement?.getAttribute("data-studio-docs") || document.activeElement?.tagName,
    }));
    t("#218/4 · keyboard focus opens the SAME docs — the second route, converging natively on focusin",
      focused.name === otherName, `${focused.name} vs ${otherName}`);
    // A focusin handler that passed moveFocus:true to inspector.activate fails EXACTLY here, and
    // nowhere else: it would yank focus to the tab on every Tab press through a compiled screen and
    // make the keyboard route unusable while every other assertion in this pass stayed green.
    t("#218/4 · …and does NOT steal focus — activate(i, false) is load-bearing",
      focused.onCanvas === true && focused.active === otherName, JSON.stringify(focused));
  } else {
    t("#218/4 · a second distinct component to focus", false, "the compiled canvas rendered only one component kind");
  }

  // Back to the first component, so assertion 5 compares a component both pages can show.
  await first.click();
  await page.waitForFunction((w) => document.querySelector("#component-docs .cat-name")?.textContent === w,
    firstName, { timeout: 10000 });

  // ---------------------------------------------------------------- [6b] the code tabs really toggle
  // Read as COMPUTED display, never as the `hidden` attribute: the attribute is inert wherever an
  // author rule sets a display, which is the whole reason the [hidden] rule moved into the shared
  // system/catalog.css — and it is the one failure mode here that looks correct in every other check.
  const tabsBefore = await page.evaluate(() => ({
    painted: [...document.querySelectorAll("#component-docs .cat-code")]
      .filter((n) => getComputedStyle(n).display !== "none").map((n) => n.getAttribute("data-panel")),
    tabs: [...document.querySelectorAll("#component-docs .cat-tab")].map((b) => b.getAttribute("data-tab")),
  }));
  if (tabsBefore.tabs.length > 1) {
    await page.locator(`#component-docs .cat-tab[data-tab="${tabsBefore.tabs[1]}"]`).click();
    const tabsAfter = await page.evaluate(() => [...document.querySelectorAll("#component-docs .cat-code")]
      .filter((n) => getComputedStyle(n).display !== "none").map((n) => n.getAttribute("data-panel")));
    t("#218/6b · exactly ONE code panel is painted, and pressing another tab changes which — read as computed display, not as the inert `hidden` attribute",
      tabsBefore.painted.length === 1 && tabsAfter.length === 1 && tabsAfter[0] !== tabsBefore.painted[0],
      JSON.stringify({ before: tabsBefore.painted, after: tabsAfter, tabs: tabsBefore.tabs }));
    await page.locator(`#component-docs .cat-tab[data-tab="${tabsBefore.tabs[0]}"]`).click();
  } else {
    t("#218/6b · more than one code tab to toggle", false, JSON.stringify(tabsBefore));
  }

  // ---------------------------------------------------------------- [5] AC #3 — the same facts
  // ORDER IS PART OF THIS ASSERTION, and this note is the "pick one and say which" the plan asked
  // for: the token table's live-value column is getComputedStyle in TWO DIFFERENT DOCUMENTS, equal
  // only while both wear the neutral pack. So this runs BEFORE assertion 6's pack swap and compares
  // the tables WHOLE, live values included — which is strictly stronger than excluding those cells
  // and letting 6 own them, because it proves the two mounts resolve the same values as well as
  // print the same text. Run it after the swap and it fails for a correct implementation.
  const catPage = await ctx.newPage();
  catPage.on("pageerror", (e) => errors.push(`docs/catalog pageerror: ${e.message}`));
  catPage.on("console", (m) => { if (m.type() === "error") errors.push(`docs/catalog console: ${m.text()}`); });
  await catPage.goto(`${BASE}/components.html`, { waitUntil: "load" });
  await catPage.waitForSelector('[data-catalog="ready"]', { timeout: 20000 });
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const fromCatalog = await catPage.evaluate((name) => {
    const sec = document.getElementById(name);
    return sec ? {
      api: sec.querySelector(".cat-api")?.innerText,
      tokens: sec.querySelector(".cat-tokens")?.innerText,
      klass: sec.querySelector(".cat-class")?.textContent,
    } : null;
  }, firstName);
  const fromPanel = await page.evaluate(() => ({
    api: document.querySelector("#component-docs .cat-api")?.innerText,
    tokens: document.querySelector("#component-docs .cat-tokens")?.innerText,
    klass: document.querySelector("#component-docs .cat-class")?.textContent,
  }));
  t(`#218/5 · AC #3 — the inspector and /components print the SAME API table for ${firstName} (${norm(fromPanel.api).length} chars compared)`,
    !!fromCatalog && norm(fromCatalog.api) === norm(fromPanel.api) && norm(fromPanel.api).length > 0,
    `panel: ${norm(fromPanel.api).slice(0, 160)} … catalog: ${norm(fromCatalog && fromCatalog.api).slice(0, 160)}`);
  t(`#218/5 · …and the SAME token table, live-value column included, both under the neutral pack (${norm(fromPanel.tokens).length} chars compared)`,
    !!fromCatalog && norm(fromCatalog.tokens) === norm(fromPanel.tokens) && norm(fromPanel.tokens).length > 0,
    `panel: ${norm(fromPanel.tokens).slice(0, 200)} … catalog: ${norm(fromCatalog && fromCatalog.tokens).slice(0, 200)}`);
  t("#218/5 · …for the same class, so the two pages are describing one component and not two",
    !!fromCatalog && fromCatalog.klass === fromPanel.klass, `${fromPanel.klass} vs ${fromCatalog && fromCatalog.klass}`);
  await catPage.close();

  // ---------------------------------------------------------------- [1b] re-renders re-fetch NOTHING
  // Forced re-renders, each of which calls docs.refresh() through the beat's onState. The delta is
  // what catches a refresh() that dropped shouldLoad and re-fetches per render.
  const before = counts();
  await revertBtn().click();
  await page.waitForFunction(() => document.querySelectorAll(".stf-screen").length === 0, null, { timeout: 20000 });
  await compileOnce();
  await revertBtn().click();
  await page.waitForFunction(() => document.querySelectorAll(".stf-screen").length === 0, null, { timeout: 20000 });
  await compileOnce();
  await page.waitForTimeout(500);
  const after = counts();
  t("#218/1b · four more canvas re-renders fetched NOTHING further — refresh() consults shouldLoad rather than re-fetching per render (three requests behind every undo, invisible to every other gate)",
    SOURCES.every((_, i) => after[i] === before[i]),
    SOURCES.map((u, i) => `${u}: ${before[i]} → ${after[i]}`).join(" · "));
  t("#218/1b · and pack.json — the one source nothing else on this page touches — was fetched exactly once across the whole visit",
    count(SOURCES[0]) === 1, `${SOURCES[0]} = ${count(SOURCES[0])}`);
  t("#218/1b · …the triggers were re-decorated on the new nodes, so the delegation survived four rebuilds",
    (await page.locator(`${VIEWPORT} [data-studio-docs]`).count()) === decoration.rendered,
    `${await page.locator(`${VIEWPORT} [data-studio-docs]`).count()} vs ${decoration.rendered}`);

  // ---------------------------------------------------------------- [6] AC #4 — values resolve LIVE
  await page.locator(`${VIEWPORT} [data-studio-docs]`).first().click();
  await page.waitForSelector("#component-docs [data-token-value]", { timeout: 10000 });
  const neutralValues = await page.evaluate(() => [...document.querySelectorAll("#component-docs [data-token-value]")]
    .map((c) => ({ name: c.getAttribute("data-token-value"), value: c.textContent.trim() })));
  // The dock's own path — the hash-routed disclosure, a real label click — not a scripted href swap.
  const packErrors = [];
  const packFilter = (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) packErrors.push(m.text()); };
  page.on("console", packFilter);
  await page.evaluate(() => { location.hash = "appearance"; });
  await page.waitForTimeout(250);
  await page.locator('label[for="dock-pack-saulera"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .some((l) => /\/system\/tokens\.saulera\.css$/.test(l.getAttribute("href") || "")), null, { timeout: 10000 });
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await page.waitForFunction((was) => [...document.querySelectorAll("#component-docs [data-token-value]")]
    .some((c, i) => c.textContent.trim() !== was[i]), neutralValues.map((v) => v.value), { timeout: 10000 }).catch(() => {});
  const swapped = await page.evaluate(() => [...document.querySelectorAll("#component-docs [data-token-value]")]
    .map((c) => c.textContent.trim()));
  const moved = swapped.filter((v, i) => v !== neutralValues[i].value);
  t("#218/6 · AC #4 — the pack swap moved at least one live token value in the inspector: the values are getComputedStyle at view time, not carried in an artifact",
    moved.length > 0, `${moved.length} of ${swapped.length} cells changed`);
  // A RESOLVED value, never a raw binding: the graph's committed pack columns are var(--…) aliases,
  // and a cell showing one would mean the panel is printing the artifact rather than asking the page.
  t("#218/6 · …and every live value is a RESOLVED value, never one of the artifact's var(--…) bindings",
    swapped.every((v) => !/^var\(/.test(v)), JSON.stringify(swapped.filter((v) => /^var\(/.test(v))));
  page.off("console", packFilter);
  await page.close();

  // ---------------------------------------------------------------- [7] AC #2 — inspect re-inits
  // The docs decoration and refreshInspect travel together in system/studio.mjs for one reason, and
  // this is that reason on a running page: this canvas rebuilds its contents after mount, so a
  // layer wired only at mount is wired to nodes that are gone.
  //
  // Memory, "hover probes race smooth scroll": wait for scrollY to settle before hovering — inspect
  // hides on scroll BY DESIGN, so a hover during a smooth scroll reads as a dead bubble.
  {
    const ictx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ictx.addInitScript(() => { try { localStorage.setItem("factory-inspect", "on"); } catch { /* private mode */ } });
    const ip = await ictx.newPage();
    ip.on("pageerror", (e) => errors.push(`docs/inspect pageerror: ${e.message}`));
    ip.on("console", (m) => { if (m.type() === "error") errors.push(`docs/inspect console: ${m.text()}`); });
    await ip.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await ip.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    t("#218/7 · the expert toggle restored from localStorage — inspect is ON before anything is compiled",
      await ip.evaluate(() => document.documentElement.dataset.inspectMode === "on"));
    const settleScroll = async () => {
      await ip.waitForFunction(() => new Promise((r) => {
        let last = -1; let same = 0;
        const tick = () => { const y = Math.round(window.scrollY);
          if (y === last) { same += 1; } else { same = 0; last = y; }
          if (same > 3) r(true); else requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }), null, { timeout: 10000 }).catch(() => {});
    };
    const hoverOpensBubble = async () => {
      await settleScroll();
      await ip.locator(PRIMITIVES).first().hover();
      return ip.waitForFunction(() => {
        const b = document.getElementById("inspect-bubble");
        return !!b && b.getBoundingClientRect().width > 0;
      }, null, { timeout: 8000 }).then(() => true, () => false);
    };
    await ip.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
    await ip.waitForSelector(".stf-screen", { timeout: 20000 });
    const firstHover = await hoverOpensBubble();
    const firstTriggers = await ip.locator(`${VIEWPORT} [data-studio-docs]`).count();
    await ip.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
    await ip.waitForFunction(() => document.querySelectorAll(".stf-screen").length === 0, null, { timeout: 20000 });
    await ip.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
    await ip.waitForSelector(".stf-screen", { timeout: 20000 });
    const secondHover = await hoverOpensBubble();
    const secondTriggers = await ip.locator(`${VIEWPORT} [data-studio-docs]`).count();
    t("#218/7 · AC #2 — the inspect bubble opens on a compiled primitive, and STILL opens after a revert + recompile replaced every node",
      firstHover && secondHover, `first=${firstHover} second=${secondHover}`);
    t("#218/7 · …and the doc triggers were re-decorated on those same new nodes, in the same count",
      firstTriggers > 0 && secondTriggers === firstTriggers, `${firstTriggers} → ${secondTriggers}`);
    await ictx.close();
  }

  // ---------------------------------------------------------------- [8] AC #5 — off by default, persisted
  {
    const tctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const tp = await tctx.newPage();
    tp.on("pageerror", (e) => errors.push(`docs/toggle pageerror: ${e.message}`));
    tp.on("console", (m) => { if (m.type() === "error") errors.push(`docs/toggle console: ${m.text()}`); });
    await tp.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await tp.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    const fresh = await tp.evaluate(() => ({
      key: localStorage.getItem("factory-inspect"),
      mode: document.documentElement.dataset.inspectMode || null,
    }));
    t("#218/8 · AC #5 — on a fresh visit the expert toggle is OFF and has written nothing: this is what keeps the at-rest pixel baseline unchanged by it",
      fresh.key === null && fresh.mode === null, JSON.stringify(fresh));
    await tp.locator("[data-inspect-toggle]").first().click();
    await tp.waitForFunction(() => document.documentElement.dataset.inspectMode === "on", null, { timeout: 5000 });
    await tp.reload({ waitUntil: "load" });
    await tp.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    t("#218/8 · …it persists across a reload",
      await tp.evaluate(() => document.documentElement.dataset.inspectMode === "on"));
    await tp.locator("[data-inspect-toggle]").first().click();
    await tp.waitForFunction(() => !document.documentElement.dataset.inspectMode, null, { timeout: 5000 });
    await tp.reload({ waitUntil: "load" });
    await tp.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    const off = await tp.evaluate(() => ({
      key: localStorage.getItem("factory-inspect"),
      mode: document.documentElement.dataset.inspectMode || null,
    }));
    t("#218/8 · …and turning it off again comes back off, with the key gone rather than left as \"off\"",
      off.mode === null && off.key !== "on", JSON.stringify(off));
    await tctx.close();
  }

  // ---------------------------------------------------------------- [9] refusal is CONTENT
  // The narrow console exemption is the one the dock case already carries and for the same reason:
  // a 500 on a routed request is the BROWSER reporting the network, not the page reporting itself.
  // Everything the page says still fails the run — which is exactly what this case asserts.
  {
    const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const rp = await rctx.newPage();
    const pageNoise = [];
    rp.on("pageerror", (e) => pageNoise.push(`pageerror: ${e.message}`));
    rp.on("console", (m) => {
      if (m.type() !== "error") return;
      if (/Failed to load resource/.test(m.text())) return;
      pageNoise.push(`console: ${m.text()}`);
    });
    await rp.route(`**${SOURCES[0]}`, (route) => route.fulfill({ status: 500, body: "no" }));
    await rp.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await rp.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
    await rp.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
    await rp.waitForSelector(".stf-screen", { timeout: 20000 });
    await rp.waitForFunction(() => /could not be loaded/.test(
      document.querySelector("[data-studio-docs-empty]")?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
    const refusal = await rp.evaluate(() => ({
      text: document.querySelector("[data-studio-docs-empty]")?.textContent || "",
      screens: document.querySelectorAll(".stf-screen").length,
      triggers: document.querySelectorAll("[data-studio-docs]").length,
    }));
    t("#218/9 · a 500 on an artifact becomes a SENTENCE in the panel naming the failure — content, never a throw",
      /could not be loaded/.test(refusal.text) && /500/.test(refusal.text), JSON.stringify(refusal));
    t("#218/9 · …the canvas is untouched: the board still compiled, and there is simply nothing to click",
      refusal.screens > 0 && refusal.triggers === 0, JSON.stringify(refusal));
    t("#218/9 · …and NOTHING the page itself said reached the console",
      pageNoise.length === 0, pageNoise.join(" | "));
    await rctx.close();
  }

  await ctx.close();
}

async function perfPass(browser, engineName, t, errors) {
  const BUDGET_MS = 200;
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  };
  const settled = (p) => p.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
  // Entries are delivered after the interaction's next paint — flush with a double rAF plus a
  // beat of real time before reading, or the delta is short on every engine (probe-verified).
  const flush = async (p) => {
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.waitForTimeout(150);
  };
  const entriesFrom = (p, from) => p.evaluate((i) => window.__studioINP.slice(i), from);
  const count = (p) => p.evaluate(() => window.__studioINP.length);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await ctx.addInitScript(OBSERVER_INIT);

  // --- 0 · calibration: the observer proven ALIVE with a forced-slow click -----------------------
  // A throwaway page in the SAME context (so it inherits the init script) gets a capture-phase
  // listener that busy-waits ~35 ms — past the 16 ms floor — so the click MUST yield an entry with
  // a non-zero interactionId on a live pipeline. preventDefault so the click can land anywhere
  // without navigating. Closed before any measurement page opens, so the slow listener never
  // pollutes a real row.
  const cal = await ctx.newPage();
  watch(cal, "perf calibration");
  await cal.goto(`${BASE}/404.html`, { waitUntil: "load" });
  await cal.evaluate(() => {
    document.addEventListener("click", (e) => {
      e.preventDefault();
      const t0 = performance.now();
      while (performance.now() - t0 < 35) { /* forced-slow: past the observer's delivery floor */ }
    }, true);
  });
  await cal.mouse.click(400, 300);
  await flush(cal);
  const calSeen = summarize(await entriesFrom(cal, 0));
  // The verdict the 16 rows below consume: a null latency is only a pass while THIS is true.
  const alive = calSeen.length >= 1 && calSeen.every((g) => g.interactionId > 0);
  t(`INP · the observer pipeline is ALIVE on ${engineName} — a forced-slow click yields a grouped entry`,
    alive, JSON.stringify(calSeen));
  await cal.close();

  // --- 1 · the interaction table ----------------------------------------------------------------
  // One row per discrete scripted interaction on the settled /factory (plus two on a mid-replay
  // page below). Rows run IN ORDER and depend on each other — the keyboard drop needs the grab,
  // revert needs the compile — which is also why the retry re-runs the WHOLE sequence on a fresh
  // page and re-measures only the flagged rows. ENUMERATED, not exhaustive of future verbs:
  // #212's flow verbs join this list when they land (the designed extension point); #214's two
  // method rows joined at the tail, where the redraft cannot disturb the rows above.
  const modZ = engineName === "webkit" ? "Meta+z" : "Control+z";
  const ROWS_FACTORY = [
    { label: "zoom-in click", act: (p) => btn(p, "Zoom in").click() },
    { label: "fit click", act: (p) => btn(p, "Fit").click() },
    { label: "reset click", act: (p) => btn(p, "Reset").click() },
    { label: "slot pointer-drag", act: async (p, st) => {
      // Down on the HANDLE, four moves, up one row below. The committed board fills row 1 only,
      // so row 2 is free — the drop point is the block's own centre plus one measured row pitch
      // (track + gap), never a guessed constant. This is also page A's first canvas interaction,
      // so the one-shot take-over fires here; that is the visitor path, not noise.
      const g = await p.evaluate((id) => {
        const r = document.querySelector(`.stx-slot[data-stx-id="${id}"] .stx-grab`).getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
      }, st.id);
      const drop = await p.evaluate((id) => {
        const stage = document.querySelector("[data-studio-canvas] .stx-stage");
        const cs = getComputedStyle(stage);
        const pitch = parseFloat(cs.gridTemplateRows) + (parseFloat(cs.rowGap) || 0);
        const r = document.querySelector(`.stx-slot[data-stx-id="${id}"]`).getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 + pitch };
      }, st.id);
      await p.mouse.move(g.x, g.y);
      await p.mouse.down();
      for (let i = 1; i <= 4; i += 1) {
        await p.mouse.move(g.x + (drop.x - g.x) * (i / 4), g.y + (drop.y - g.y) * (i / 4));
      }
      await p.mouse.up();
      await p.waitForTimeout(120);
    } },
    { label: "keyboard grab (Enter)", act: async (p, st) => {
      await p.locator(`.stx-slot[data-stx-id="${st.id}"] .stx-grab`).focus();
      await p.keyboard.press("Enter");
    } },
    { label: "keyboard arrow step", act: (p) => p.keyboard.press("ArrowDown") },
    { label: "keyboard drop (Enter)", act: (p) => p.keyboard.press("Enter") },
    { label: "undo ⌘/Ctrl+Z", act: async (p) => {
      await p.locator(SCROLL).focus();
      await p.keyboard.press(modZ);
    } },
    { label: "redo click", act: (p) => btn(p, "Redo").click() },
    { label: "panel tab arrow", act: async (p) => {
      await p.focus("#stu-tab-this-build");
      await p.keyboard.press("ArrowRight");
    } },
    { label: "compile click", act: async (p) => {
      await p.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
      await p.waitForFunction(() => document.querySelector("[data-studio-canvas]")
        .getAttribute("data-compile-state") === "rendered", null, { timeout: 20000 });
    } },
    { label: "revert click", act: async (p) => {
      await p.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
      await p.waitForFunction(() => document.querySelector("[data-studio-canvas]")
        .getAttribute("data-compile-state") === "blocks", null, { timeout: 20000 });
    } },
    { label: "keep copy-link click", act: async (p) => {
      await p.locator("[data-keep-share] button").click();
      await p.waitForTimeout(400); // past build-keep's URL debounce
    } },
    { label: "export click", act: async (p) => {
      await Promise.all([
        p.waitForEvent("download", { timeout: 30000 }),
        p.locator("[data-keep-export] button").click(),
      ]);
    } },
    // #217's four rows, BEFORE the method pair and for its own reason: these act on the RUN's board,
    // and the redraft below replaces it. Spike 2's verdict is inherited rather than re-measured — its
    // pessimistic all-slots rewrite on every pointermove took the worst interaction to 32 ms under 4×
    // throttle, and every operation here is strictly lighter (a marquee is a class toggle over the
    // covered cells; a guide is two attribute writes).
    { label: "marquee drag", act: async (p) => {
      const pts = await p.evaluate(() => {
        const stage = document.querySelector("[data-studio-canvas] .stx-stage");
        const a = stage.querySelector(".stx-slot").getBoundingClientRect();
        const cs = getComputedStyle(stage);
        const px = parseFloat(cs.gridTemplateColumns) + (parseFloat(cs.columnGap) || 0);
        const py = parseFloat(cs.gridTemplateRows) + (parseFloat(cs.rowGap) || 0);
        const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
        return { from, to: { x: from.x + px, y: from.y + py } };
      });
      await p.keyboard.down("Shift");
      await p.mouse.move(pts.from.x, pts.from.y);
      await p.mouse.down();
      for (let i = 1; i <= 4; i += 1) {
        await p.mouse.move(pts.from.x + (pts.to.x - pts.from.x) * (i / 4), pts.from.y + (pts.to.y - pts.from.y) * (i / 4));
      }
      await p.mouse.up();
      await p.keyboard.up("Shift");
      await p.waitForTimeout(120);
    } },
    { label: "group pointer-drag", act: async (p) => {
      const pts = await p.evaluate(() => {
        const n = document.querySelector("[data-studio-canvas] .stx-slot[data-stx-selected] .stx-grab");
        if (!n) return null;
        const stage = document.querySelector("[data-studio-canvas] .stx-stage");
        const cs = getComputedStyle(stage);
        const py = parseFloat(cs.gridTemplateRows) + (parseFloat(cs.rowGap) || 0);
        const r = n.getBoundingClientRect();
        const from = { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
        return { from, to: { x: from.x, y: from.y + py } };
      });
      if (!pts) return; // the marquee row above caught nothing — its own assertion owns that
      await p.mouse.move(pts.from.x, pts.from.y);
      await p.mouse.down();
      for (let i = 1; i <= 4; i += 1) await p.mouse.move(pts.to.x, pts.from.y + (pts.to.y - pts.from.y) * (i / 4));
      await p.mouse.up();
      await p.waitForTimeout(140);
    } },
    // Grab, step and drop in ONE row: the number is the MAX of the three, they are all group-carry
    // interactions and all belong under the same budget (the hook-slot row's precedent).
    { label: "group keyboard step", act: async (p) => {
      const sel = p.locator("[data-studio-canvas] .stx-slot[data-stx-selected] .stx-grab").first();
      if (!(await sel.count())) return;
      await sel.focus();
      await p.keyboard.press("Enter");
      await p.keyboard.press("ArrowDown");
      await p.keyboard.press("Enter");
      await p.waitForTimeout(140);
    } },
    { label: "context menu open", act: async (p) => {
      await p.locator("[data-studio-canvas] .stx-slot").first().click({ button: "right" });
      await p.waitForTimeout(120);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    } },
    // #214's two rows, LAST because the first one redrafts the whole board (relinquish, wholesale
    // replace, publish — the real interaction cost) and everything above wants the run's board.
    // Each parks its target instantly first: the site scrolls smoothly and Playwright's
    // actionability scroll races it (methodPass's rule).
    { label: "method card radio click", act: async (p) => {
      await p.$eval('input[name="stm-q-shape"][value="worklist"]',
        (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
      await p.waitForTimeout(100);
      await p.check('input[name="stm-q-shape"][value="worklist"]');
      await p.waitForTimeout(150);
    } },
    { label: "hook slot place click", act: async (p) => {
      // The select click shares the measured window, so this row's number is the MAX of the pair —
      // both are method-band interactions and both belong under the budget.
      await p.$eval('[data-hook-node="trigger"]',
        (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
      await p.waitForTimeout(100);
      await p.click('[data-hook-node="trigger"]');
      await p.click('[data-hook-slot="0"]');
      await p.waitForTimeout(150);
    } },
  ];
  // The two interactions that only exist MID-REPLAY, on their own page. Pause FIRST: after a
  // take-over the whole transport is dead (#240/1), so this order is the only one in which both
  // rows are live interactions.
  const ROWS_MIDREPLAY = [
    { label: "transport pause (Enter)", act: async (p) => {
      const b = p.locator(".stu-replay-controls").getByRole("button", { name: "Pause", exact: true });
      await b.focus();
      await p.keyboard.press("Enter");
    } },
    { label: "take-over pointerdown", act: async (p) => {
      await p.locator(`${VIEWPORT} .stx-slot`).first().click();
      await p.waitForTimeout(120);
    } },
  ];

  // Runs one fresh page through `rows` in order, measuring the rows named in `only` (all when
  // null). Per row: entry count before, act, flush, delta → summarize → the MAX latency among the
  // new interactions. latency null = no entry = below the 16 ms floor (a pass — see the header —
  // a pass the row assertions grant only against the calibration verdict, never outright).
  const runSequence = async (rows, ready, only = null) => {
    const p = await ctx.newPage();
    watch(p, "perf");
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    const st = await ready(p);
    const out = {};
    for (const row of rows) {
      const measure = !only || only.includes(row.label);
      const before = measure ? await count(p) : 0;
      await row.act(p, st);
      if (!measure) continue;
      await flush(p);
      const fresh = summarize(await entriesFrom(p, before));
      out[row.label] = {
        latency: fresh.length ? Math.max(...fresh.map((g) => g.latency)) : null,
        entries: fresh.reduce((n, g) => n + g.events.length, 0),
      };
    }
    await p.close();
    return out;
  };
  const factoryReady = async (p) => {
    await settled(p);
    await p.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
    await p.waitForTimeout(300);
    return { id: await p.locator(`${VIEWPORT} .stx-slot`).first().getAttribute("data-stx-id") };
  };
  // Mid-replay: the first block has arrived and the run is still playing — a WAIT on the page's
  // own state, never a sleep (replayPass's rule).
  const midReady = async (p) => {
    await p.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
    return {};
  };

  const measured = {
    ...(await runSequence(ROWS_FACTORY, factoryReady)),
    ...(await runSequence(ROWS_MIDREPLAY, midReady)),
  };

  // The bounded, LOGGED retry: an over-budget row on a loaded operator machine is re-measured
  // ONCE on a fresh settled page, and BOTH numbers print. Red if still over — or if the retry
  // yields no entry for a row that measured over: calibration proves the floor is real for a
  // FIRST null, but a null that follows an over-budget measure is inconclusive, not a clearance.
  // Silent tolerance is AC #7's named sin, which is why the rule is printed with the table below.
  //
  // The ONE comparator (PR #247 review, finding 2): both the retry filter and the row verdicts
  // below consume the imported violations() — an inline re-implementation here is the bug class
  // the self-test control exists to catch and could not see.
  const overLabels = (obj) => violations(
    Object.entries(obj).map(([label, m]) => ({ label, latency: m.latency })), BUDGET_MS,
  ).map((v) => v.label);
  const over = overLabels(measured);
  if (over.length) {
    const overFactory = over.filter((l) => ROWS_FACTORY.some((r) => r.label === l));
    const overMid = over.filter((l) => ROWS_MIDREPLAY.some((r) => r.label === l));
    const again = {
      ...(overFactory.length ? await runSequence(ROWS_FACTORY, factoryReady, overFactory) : {}),
      ...(overMid.length ? await runSequence(ROWS_MIDREPLAY, midReady, overMid) : {}),
    };
    for (const label of over) {
      const re = again[label];
      console.log(`    retried: ${label} ${measured[label].latency} ms → ${re.latency === null ? "no entry (inconclusive)" : `${re.latency} ms`}`);
      measured[label] = { ...re, retried: measured[label].latency };
    }
  }

  // The per-engine table — the report's data source. Durations are 8 ms granular by spec, so the
  // numbers are budgets, never exact values.
  console.log(`  INP · ${engineName} · budget ${BUDGET_MS} ms · one logged retry · observer floor 16 ms:`);
  for (const [label, m] of Object.entries(measured)) {
    const ms = m.latency === null
      ? (m.retried ? "no entry after retry (inconclusive)" : "< 16 ms (below observer floor)")
      : `${m.latency} ms`;
    console.log(`    ${label} · ${ms} · ${m.entries} entr${m.entries === 1 ? "y" : "ies"}${m.retried ? ` · retried from ${m.retried} ms` : ""}`);
  }
  const stillOver = new Set(overLabels(measured));
  for (const [label, m] of Object.entries(measured)) {
    // null + never retried → a floor pass ONLY while calibration proved delivery (finding 1);
    // null + retried      → the row measured over and the retry proved nothing (finding 4);
    // a number            → the imported comparator decides, same as the retry filter (finding 2).
    const pass = m.latency === null ? (alive && !m.retried) : !stillOver.has(label);
    const detail = m.latency === null
      ? (m.retried
        ? `inconclusive — first measured ${m.retried} ms over budget, the retry yielded no entry`
        : `no entry (< 16 ms floor) · calibration ${alive ? "alive" : "DEAD — nothing was delivered this run"}`)
      : `${m.latency} ms${m.retried ? ` (retried from ${m.retried} ms)` : ""}`;
    t(`INP · ${label} ≤ ${BUDGET_MS} ms`, pass, detail);
  }

  // The self-test control (memory `check-that-cannot-fail`): the comparator proven able to go red
  // in the same pass that relies on it — a synthetic 250 ms interaction must flag.
  const control = violations(summarize([{ interactionId: 1, duration: 250 }]), BUDGET_MS);
  t("INP · the comparator itself can flag — a synthetic 250 ms interaction is a violation",
    control.length === 1 && control[0].latency === 250, JSON.stringify(control));

  await ctx.close();

  // --- 2 · the throttled drag (AC #3) — chromium only, and STATED as such (AC #7) ---------------
  // CDP CPU throttling and long-animation-frames are both chromium-only by definition, so this
  // half runs on one engine and SAYS so rather than silently narrowing. 4× is the base-spec-laptop
  // proxy with two recorded measurements behind the thresholds: the #72 spike (worst frame 33 ms
  // @4× was its green; memory `cross-engine-motion-verify`) and this ticket's planning probe (idle
  // median 16.7 ms, drag max 16.8 ms @4× on the HEAVIER 31-component harness stage — /factory's
  // settled 4-place board is bounded by it). Worst rAF gap ≤ 50 ms carries ~3× headroom over
  // measured-healthy while sitting far below the sustained-100 ms jank it exists to catch; zero
  // LoAF entries (≥ 50 ms by definition) may overlap the drag window.
  if (engineName === "chromium") {
    const tctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const tp = await tctx.newPage();
    watch(tp, "perf throttled-drag");
    await tp.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await settled(tp);
    await tp.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
    // Settle + rest BEFORE any sampling: the 150–266 ms bootstrap frames (site.js/dock.mjs chrome
    // injection) live at load and must never enter a measured window (the #72 spike's rule).
    await tp.waitForTimeout(500);
    const cdp = await tctx.newCDPSession(tp);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // Idle baseline: ~60 frames of rAF cadence at rest under the throttle.
    const idle = await tp.evaluate(() => new Promise((res) => {
      const ts = [];
      const tick = (now) => { ts.push(now); if (ts.length >= 61) return res(ts); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    const idleGaps = idle.slice(1).map((v, i) => v - idle[i]).sort((a, b) => a - b);
    const idleMedian = idleGaps[Math.floor(idleGaps.length / 2)];

    // Instrumented drag: a continuous rAF-timestamp recorder plus a window-scoped LoAF observer
    // (buffered OFF — only what runs during the drag counts), then a real ~40-step pointer drag
    // over ~800 ms from the first block's handle to the free cell one row down.
    await tp.evaluate(() => {
      window.__frames = [];
      window.__loaf = [];
      const loop = (now) => { window.__frames.push(now); window.__rafId = requestAnimationFrame(loop); };
      window.__rafId = requestAnimationFrame(loop);
      window.__loafObs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__loaf.push({ start: e.startTime, duration: e.duration });
      });
      window.__loafObs.observe({ type: "long-animation-frame" });
    });
    const geom = await tp.evaluate(() => {
      const slot = document.querySelector("[data-studio-canvas] .stx-slot");
      const grab = slot.querySelector(".stx-grab").getBoundingClientRect();
      const stage = document.querySelector("[data-studio-canvas] .stx-stage");
      const cs = getComputedStyle(stage);
      const pitch = parseFloat(cs.gridTemplateRows) + (parseFloat(cs.rowGap) || 0);
      const r = slot.getBoundingClientRect();
      return { fromX: (grab.left + grab.right) / 2, fromY: (grab.top + grab.bottom) / 2,
        toX: (r.left + r.right) / 2, toY: (r.top + r.bottom) / 2 + pitch };
    });
    const t0 = await tp.evaluate(() => performance.now());
    await tp.mouse.move(geom.fromX, geom.fromY);
    await tp.mouse.down();
    for (let i = 1; i <= 40; i += 1) {
      await tp.mouse.move(
        geom.fromX + (geom.toX - geom.fromX) * (i / 40),
        geom.fromY + (geom.toY - geom.fromY) * (i / 40));
      await tp.waitForTimeout(15);
    }
    await tp.mouse.up();
    const t1 = await tp.evaluate(() => performance.now());
    const sampled = await tp.evaluate(() => {
      cancelAnimationFrame(window.__rafId);
      window.__loafObs.disconnect();
      return { frames: window.__frames, loaf: window.__loaf };
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    const inWindow = sampled.frames.filter((v) => v >= t0 && v <= t1);
    const gaps = inWindow.slice(1).map((v, i) => v - inWindow[i]).sort((a, b) => a - b);
    const fmt = (v) => (v === undefined ? "–" : v.toFixed(1));
    const pctl = (q) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))];
    const worst = gaps[gaps.length - 1] ?? 0;
    const over33 = gaps.filter((g) => g > 33).length;
    const loafInWindow = sampled.loaf.filter((e) => e.start + e.duration >= t0 && e.start <= t1);
    console.log("  frame check · chromium only (CDP + LoAF are chromium-only by definition) · 4× CPU throttle · thresholds: worst rAF gap ≤ 50 ms, zero LoAF (≥ 50 ms) in the drag window");
    console.log(`    idle median ${fmt(idleMedian)} ms · ${gaps.length + 1} drag frames over ${Math.round(t1 - t0)} ms · p50 ${fmt(pctl(0.5))} · p95 ${fmt(pctl(0.95))} · max ${fmt(worst)} · >33 ms: ${over33} · LoAF: ${loafInWindow.length}`);
    // Movement proven first — "no dropped frames" is trivially true of a drag that never engaged.
    const movedRow = await tp.evaluate(() => document.querySelector("[data-studio-canvas] .stx-slot").getAttribute("data-row"));
    t("frame check · the throttled drag genuinely moved the block — the sampled window holds a real gesture",
      movedRow === "2", `data-row=${movedRow}`);
    t("frame check · a genuinely sampled drag — dozens of frames inside the drag window",
      gaps.length >= 20, `${gaps.length} gap(s)`);
    t("frame check · worst rAF gap inside the throttled drag ≤ 50 ms", worst <= 50, `${fmt(worst)} ms`);
    t("frame check · zero long-animation-frame entries overlap the drag window",
      loafInWindow.length === 0, JSON.stringify(loafInWindow));
    // Leave the board as the run committed it.
    await btn(tp, "Undo").click();
    await tp.waitForTimeout(250);
    await tp.close();
    await tctx.close();
  }
}

let totalFails = 0;
for (const engine of toRun) {
  console.log(`\n════ ${engine} ════`);
  const results = { passes: 0, fails: 0 };
  const held = {};
  try {
    await journey(engine, results, held);
  } catch (e) {
    results.fails += 1;
    console.log(`  ✗ ${engine} threw: ${e.message}`);
  } finally {
    await held.browser?.close();
  }
  console.log(`  ── ${engine}: ${results.passes} passed, ${results.fails} failed`);
  totalFails += results.fails;
}

// #213 · AC #7 — every bound the driver carries, stated by the driver itself on every run, red or
// green. Silent truncation reads as "covered everything", which is the sin this block exists to
// not commit.
console.log('\nstudio-journey bounds · the frame check runs on CHROMIUM ONLY (CDP CPU throttling and long-animation-frames are chromium-only by definition) · an over-budget INP row is re-measured ONCE on a fresh page with both numbers printed, never silently · the Event Timing observer\'s durationThreshold floor is 16 ms, so a faster interaction yields no entry and prints as "< 16 ms" (sound: the calibration click proves delivery) · the INP interaction list is ENUMERATED (22 rows since #217 added marquee drag, group pointer-drag, group keyboard step and context menu open), not exhaustive of every verb — #212\'s flow navigation (landed since this list was cut) is not yet among them · #217\'s \u2318/Ctrl+A is FOCUS-SCOPED to .stx-scroll, so it is the browser\'s own document select-all everywhere else on the page, and it is deliberately NOT a replay take-over (the driver\'s discriminator returns early on ctrlKey/metaKey, exactly as it already does for \u2318Z) · #217 adds NEITHER of \u00a75\'s last two items and says so: zoom-to-fit landed at #204 and pan-by-drag covers the hand tool on EMPTY canvas — there is no mode in which a drag over a component pans, recorded as a decision rather than left as a gap');

console.log(totalFails
  ? `\nstudio-journey ✗  ${totalFails} assertion(s) failed`
  : `\nstudio-journey ✓  pan by scroll · four zoom verbs · the bare wheel never zooms · arrangement is attributes on the running page · far column reachable by keyboard · three sources one arrangement (the third on a fresh page) · announcements counted per path · ui.move carrying the vocabulary shape under target.component and the display label under target.label, and NO component for a fat-marker block (#232) · escape restores · occupancy holds · the hit-test in all three conditions · a clean drop sticks · SC 2.5.7's click-move-click completed against the drag as its control · a component placed AFTER mount undoes by both call sites · a re-place re-labels the move handle and a canvas mounted WITHOUT its verbs hands out no dead tab stop and no dangling IDREF (#231) · reduced motion · AND #209's REPLAY DRIVER on the shipped /factory: the canvas assembling itself from a committed real run, settling on that run's own board block for block in board order, a BYTE-IDENTICAL settled stage on a second load, one action per beat and every one of them agent.*/source:"agent" carrying no target.component and no ui.move at all, pause · step · seek all driven from the keyboard and each announced, the take-over on a FRESH page mid-replay pausing the run and shifting provenance and firing /factory/took-over exactly once before restoring the real URL, that same handover one-shot, Tab and the driver's own transport correctly NOT counting as take-over, reduced motion reaching the identical end state immediately with manual stepping intact, the Pause button genuinely not painted there (read as COMPUTED display, since the hidden attribute is inert wherever an author rule sets one) and the handover still shifting provenance and still firing the route, the TWO DEGRADATIONS — a 404 artifact settling as an honest card with no dead transport and, load-bearing, NO take-over route at all, because a visitor moving blocks on a canvas the run never built has taken nothing over; and a 404 trace still playing the ops while the surface STATES the words are missing — and destroy() mid-playback writing nothing further · AND #240's REVIEW FIXES: the compile beat dead while the driver authors and live the moment the visitor takes over, the WHOLE transport dying with the handover rather than seek alone (a Resume after a compile would replace compiled components with fat markers), Compile pressed MID-REPLAY compiling the blocks actually on the canvas and nothing overwriting them afterwards, the earliest take-over there is publishing an empty board without rendering a zeros panel, a press in the LOADING window taking nothing over and firing no route while the run still plays through, and the two INSTANT paths — reduced motion and Skip to end — naming the acts in the one sentence a polite region can actually speak, with the autoplayed arrival as the control · AND THE SHIPPED /factory: the replay's board on the canvas, a cold #shape deep-link into a MOUNTED graph, all three absorbed exhibits rendered after activation (their only coverage now they are lazy), the panel list by arrow keys, a keyboard move announced per keypress, and Act 0 self-booted · AND #207's COMPILE BEAT: at rest fat-marker blocks with no vocabulary request made, the beat swapping every slot to a library primitive with every id, column and row unchanged, one announcement per step counted exactly AND spaced far enough apart to be five announcements rather than fewer (on the second compile too, and under reduced motion), each verb handing focus to its counterpart instead of dropping it to the body, zero ::view-transition-* pseudos, no style attribute after it, a byte-identical stage on a re-run and on a fresh load, and reduced motion reaching the identical end state · AND #236's TEARDOWN: destroy() mid-walk and destroy() inside the vocabulary fetch both letting compile() come back rather than parking its frame, leaving the viewport clean, aborting the request and swapping nothing onto the stage afterwards, and #237's transient 503 settling as the honest card and then RENDERING on the next press with a second request genuinely issued · AND #210's KEEP RAIL, the half build-checks group 17 structurally cannot be: the rail fetching NOTHING at rest, the export click really handing a file over and those bytes parsing IN A BROWSER as one SCREEN per block on the canvas with one nav anchor per connection, every one resolving to a section inside the file, the entry screen still one tile per place, and no script in it, the copy click leaving a REAL pathname carrying a ?b= that decodes back to this board WITH ITS ARRANGEMENT — the one thing /build's rail cannot express, and the field the codec drops silently — both new routes firing exactly once across two clicks each and carrying no board into the path, AC #6 asserted BOTH WAYS as client rects rather than as the inert "hidden" attribute (the bare board built here with the page's own encodeBuild, since /factory has no remove verb), and the DECLINED MOUNT that had never run: the sender's board at the sender's slots, not one action emitted, the transport unpainted, the chrome saying why, and the Compile button not merely enabled but COMPILING END TO END — the dead primary control #240 named. Plus a refused link scrubbing its ?b= and keeping its reason visible after the run narrates over the live region, a no-link page painting no notice at all, and reduced motion reaching the same rail · AND PR #241's REVIEW FIXES: the arrangement moved OFF the default row-1 layout before the copy, which is what turns the sender's-coordinates assertion into the g-restore's only running-page proof rather than a claim both branches satisfy; a design worn in from HOME by each of its two paths — an imported record and a derived one, seeded through storage and applied by pack-boot before paint — reaching the DOWNLOADED BYTES and being NAMED in their provenance rather than denied; and a shape:stream link compiling IN PLACE — six feed rows inside one entry screen with streamNote's truncation stated on the stage — so the copied link now CARRIES the arrangement, labelled as carrying it · AND #212's FLOW on the shipped page: one screen per place with one nav button per connection, the pointer walk end to end along the dispatch chain with focus landing on each target screen's heading and EXACTLY ONE fixed counted announcement per navigation, the keyboard leg (Tab from the grab handle, Enter) on a fresh compile proving the nav re-wires, the revert byte-identical after navigating, and reduced motion reaching the same end state · AND #214's METHOD BAND: the ten questions as cards on the shipped canvas — disabled while the driver plays with a disabled-band pointerdown proven NOT a take-over and not a redraft, enabled in settle's own task, a pointer answer and a native radio-arrow keyboard answer each redrafting the canvas to draftBoard's OWN board computed in Node label for label, announced once per placement plus the one redraft sentence, provenance flipped in both standing places in the same words, the driver RELINQUISHED (transport dead, still settled, the set-aside sentence, no take-over route), the Hook loop assembled by pointer AND by keyboard with every select and placement announced counted exactly, a wrong-stage placement refused with the fixed reason and an untouched DOM, the verdict locked until completion and then the imported rules' sentences BY IDENTITY, re-rendering when an ethics card moves afterwards, the keep rail's link decoding back to the drafted board and answers, and the ?b= #193 mode populating cards, diagram and verdict with zero interaction on a never-disabled band · AND #213's MEASUREMENT GATE: INP measured per named interaction — eighteen rows across the settled /factory and a mid-replay page — and ASSERTED ≤ 200 ms per engine through a driver-injected PerformanceObserver that ships nothing, the below-16 ms floor printed as such and made non-vacuous by a forced-slow calibration click proving the delivery pipeline alive on every engine, one over-budget row re-measured ONCE on a fresh page with both numbers printed, the comparator proven able to flag in the same pass that relies on it, the 4×-CDP-throttled drag sampled for rAF gaps and long-animation-frame entries with its histogram printed (chromium only, and stated), the appearance dock switched to saulera MID-REPLAY re-pointing the head's one pack line WITHOUT counting as take-over while the run plays through to the committed board and a move verb still announces after it, and all four zoom verbs activated FROM THE KEYBOARD with exactly the live surfaces the module writes asserted — the readout for in/out, .stx-live for Fit and Reset \u00b7 AND #217's FULL CANVAS AFFORDANCES on the shipped /factory: a Shift-drag marquee selecting exactly the components inside the dragged rectangle (computed in Node from the LIVE arrangement through the page's own marqueeRange + idsInRange, never a literal) and announced EXACTLY ONCE on release, the KEYBOARD path selecting the SAME SET from a captured-once anchor — AC #1's whole claim — and proven to REPLACE rather than union by a deliberate stray Shift-click first, a marquee over empty canvas saying \"Nothing to select.\" rather than \"Selection cleared.\", the group move by pointer AND by keyboard landing every member at its own offset through ONE ui.move-group with no ui.move at all and no target on the envelope, one announcement, one history entry and ONE Undo restoring all of them, alignment guides proven to sit only where a NON-CARRIED peer really is WITH the mutation that forces one onto a provably empty column and watches the check go red, the context menu opening by Shift+F10 and by right-click with IDENTICAL items, full Arrow/Home/End navigation over items that stay focusable because they are aria-disabled rather than disabled, Escape returning focus to the invoker, an item press starting neither a pan nor a drag, the far-column menu flipping and staying inside the scroller while an interior one does not, a scroll closing it, Escape cancelling each multi-verb back to its pre-verb state with the selection surviving a cancel and an undo, a Shift-drag mid-carry starting no marquee (so the two Escape listeners are never both armed), the QUICK group drag landing where the reader released, a compile KEEPING the selection while CANCELLING a live group carry (two rows, because they look like one property), both sides of the replay take-over coupling — a marquee hands over exactly once, \u2318/Ctrl+A deliberately does not — reduced motion completing every verb, and Fit on a COMPILED canvas flooring at 50% with the honest sentence rather than a claim that everything is in view (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
