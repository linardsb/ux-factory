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
  m.getVerbs().bus.on("*", (a) => window.__busLog.push({ type: a.type, source: a.source, id: a.target?.id, params: a.params }));
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
const countLive = (p) => p.evaluate(() => {
  window.__liveCount = 0;
  window.__liveLast = "";
  const live = document.querySelector("[data-studio-canvas] .stx-live");
  window.__liveObs?.disconnect();
  window.__liveObs = new MutationObserver((ms) => {
    window.__liveCount += ms.length;
    window.__liveLast = live.textContent.trim();
  });
  window.__liveObs.observe(live, { childList: true, characterData: true, subtree: true });
});
const liveSeen = (p) => p.evaluate(() => ({ n: window.__liveCount, last: window.__liveLast }));

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

  const clamped = await viaSeam(page, MAX_COLS + 9, -4);
  t("an out-of-range slot is clamped by clampSlot, never written raw",
    clamped.col === String(MAX_COLS) && clamped.row === "1", JSON.stringify(clamped));

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
  // it is the body-press no-op, and nothing in this file completes a click-move-click gesture. That
  // gap is tracked, not hidden — #229 adds the case that completes the gesture.
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

  t("no page errors and no console errors across the whole journey", errors.length === 0, errors.join(" | "));
  return errors;
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

console.log(totalFails
  ? `\nstudio-journey ✗  ${totalFails} assertion(s) failed`
  : `\nstudio-journey ✓  pan by scroll · four zoom verbs · the bare wheel never zooms · arrangement is attributes on the running page · far column reachable by keyboard · three sources one arrangement (the third on a fresh page) · announcements counted per path · escape restores · occupancy holds · the hit-test in all three conditions · a clean drop sticks · reduced motion (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
