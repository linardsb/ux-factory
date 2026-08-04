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
  : `\nstudio-journey ✓  pan by scroll · four zoom verbs · the bare wheel never zooms · arrangement is attributes on the running page · far column reachable by keyboard · reduced motion (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
