// tooling/proto-journey.mjs — the committed cross-engine journey driver for the two prototype
// pages (epic #164, ticket #176; .claude/plans/protos-bus-toggles-device-frame-176.md).
//
// The third of this repo's operator-run drivers, and the one the other two structurally cannot be.
// tooling/build-journey.mjs drives /build; tooling/vt-verify.mjs asserts that view transitions
// actually open. Neither touches the proto pages, and the pixel gate that does can only ever see
// at-rest geometry — it never interacts, so it cannot tell a live control from a dead one.
//
// What this asserts that nothing else can: the SAME command, arriving from three different sources,
// produces the SAME DOM. system/action-bus.mjs's header has claimed since #11 that "adding a
// modality is a new `source`, not a new bus", and until #176 nothing in the repo exercised the
// agent.* half of it. A reader has to take that on trust; this driver does not.
//
// The parity check asserts the RESULTING DOM, never that an event fired. "An action was emitted"
// would pass with no consumer at all — the check-that-cannot-fail shape build-journey's header
// warns about. Asserting the resulting class on a named tile after each of the three sources, with
// a reset between, means a broken consumer fails all three and a broken keyboard path fails
// exactly one.
//
// Playwright is NOT a repo dependency and must never become one — shipped pages are vanilla, and
// the two dependency-carrying tools stay isolated (CLAUDE.md ground rules). It is resolved out of
// tooling/visual-regression/node_modules, the exact version CI's `visual` job pins, so this driver
// and the pixel gate always agree about which browser build "chromium" means.
//
// Deliberately NOT registered in verify.yml, the same call #138 made for build-journey: CI already
// runs drift-check and the pixel gate, and three engine downloads per PR buys less than it costs.
// It is an operator step, re-runnable by anyone, and its result belongs in the ticket's report.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
//   node tooling/proto-journey.mjs [chromium|firefox|webkit|all]      # default: all

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
  console.error(`proto-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// Imported from the shipped modules, never retyped — moving a bound or an enum member fails this
// driver instead of drifting past it (build-journey.mjs:54-60's discipline).
const { FRAME_MIN, FRAME_MAX, STEP } = await import(new URL("../system/device-frame.mjs", import.meta.url));
const { TONES } = await import(new URL("../system/bus-toggles.mjs", import.meta.url));

const SUMMARY = '[data-slot="summary-strip"]';
const TILE0 = `${SUMMARY} .proto-slot-fill .ds-metric-tile`;
const READOUT = `${SUMMARY} .bt-readout`;

// The proto pages fetch the mock Worker (127.0.0.1:8787) and fall back to committed static
// fixtures when it is absent — that degradation IS the designed behaviour, and every engine logs
// the refused request for it in its own words. Narrow on purpose, because check [4] asserts that a
// REFUSED ACTION LOGS NOTHING, and that assertion is worth exactly as much as this filter is tight:
//   · firefox names the blocked origin, so the Worker's own address identifies it;
//   · chromium and webkit carry no URL, so each is matched on its own refused-CONNECTION wording
//     ("net::ERR_CONNECTION_REFUSED" / "Could not connect to the server").
// All three name a connection that was refused, which a 404, a bad MIME type or a real script
// error does not produce — so anything else, including a genuine CORS failure against some other
// origin, still fails the run.
const EXPECTED_NOISE = /127\.0\.0\.1:8787|ERR_CONNECTION_REFUSED|Could not connect to the server/;

async function journey(engineName, results, held) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name} ${extra}`); }
  };

  const browser = held.browser = await pw[engineName].launch();
  const errors = [];
  async function newPage(ctx) {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`console: ${m.text()}`); });
    return p;
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await newPage(ctx);

  // ---------------------------------------------------------------- Fieldwork: the bus toggles
  console.log("\n[1] fieldwork loads, fills both slots, and mounts a control row per filled slot");
  await page.goto(`${BASE}/proto/fieldwork.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-bus-toggles="ready"]', { timeout: 20000 });
  await page.waitForSelector(TILE0, { timeout: 20000 });
  const mounted = await page.evaluate(() => ({
    rows: document.querySelectorAll(".bt-row").length,
    filled: document.querySelectorAll(".proto-slot-fill").length,
    targets: document.querySelectorAll(".bt-target").length,
    resets: document.querySelectorAll(".bt-reset").length,
  }));
  t(`one control row per filled slot (${mounted.rows} rows / ${mounted.filled} fills)`,
    mounted.rows === mounted.filled && mounted.rows === 2, JSON.stringify(mounted));

  // The enum this module owns, checked against the vocabulary the renderer actually validates
  // against. agentic-study.mjs keeps the same list as an unexported const, so bus-toggles.mjs holds
  // a second copy by necessity — and a second copy of an enum is exactly what drifts in silence.
  const vocabTones = await page.evaluate(() =>
    fetch("/handoff/verdant/vocabulary.json").then((r) => r.json()).then((v) => v.components["metric-tile"].props.tone.enum));
  t(`TONES matches the generated vocabulary's metric-tile tone enum [${vocabTones.join(" | ")}]`,
    JSON.stringify(TONES) === JSON.stringify(vocabTones), `module ${JSON.stringify(TONES)}`);

  const tile0Class = () => page.getAttribute(TILE0, "class");
  const readoutText = () => page.textContent(READOUT);
  const resetSlot = async () => { await page.click(`${SUMMARY} .bt-reset`); };

  console.log("\n[2] PARITY — pointer, keyboard and agent are the same command");
  const atRest = await tile0Class();
  t(`tile 0 starts at the committed proposal's tone ("${atRest}")`, atRest === "ds-metric-tile", atRest);

  // (a) pointer
  await page.click(`${SUMMARY} input.bt-tone[value="critical"]`);
  const viaPointer = await tile0Class();
  const pointerSaid = await readoutText();
  await resetSlot();

  // (b) keyboard — Space on a focused radio. Enter is deliberately not used: a radio does not
  // activate on Enter, so asserting it would be asserting the wrong pattern.
  await page.evaluate((s) => document.querySelector(`${s} input.bt-tone[value="critical"]`).focus(), SUMMARY);
  await page.keyboard.press("Space");
  const viaKeyboard = await tile0Class();
  const keyboardSaid = await readoutText();
  await resetSlot();

  // (c) agent — injected through the module's exported seam, never a window.__ global
  await page.evaluate(() => import("/system/bus-toggles.mjs").then((m) => m.getSlotBus().emit({
    type: "agent.set-tone", source: "agent",
    target: { component: "metric-tile", id: "summary-strip:0" }, params: { tone: "critical" },
  })));
  const viaAgent = await tile0Class();
  const agentSaid = await readoutText();

  t(`all three sources produce the SAME DOM ("${viaPointer}")`,
    viaPointer === viaKeyboard && viaKeyboard === viaAgent && viaAgent.includes("is-critical"),
    `pointer="${viaPointer}" keyboard="${viaKeyboard}" agent="${viaAgent}"`);
  t("the readout names source pointer", pointerSaid.includes("source: pointer"), pointerSaid);
  t("the readout names source keyboard", keyboardSaid.includes("source: keyboard"), keyboardSaid);
  t("the readout names source agent", agentSaid.includes("source: agent"), agentSaid);

  console.log("\n[3] reset restores the committed proposal exactly");
  // Compared against the FETCHED committed JSON, not a literal — the proposal is a real build-time
  // run's output and this must keep agreeing with it if it is ever re-recorded.
  const expected = await page.evaluate(() => fetch("/proto/compositions/operational-state.json")
    .then((r) => r.json())
    .then((c) => c.map((n) => `ds-metric-tile${n.props.tone && n.props.tone !== "neutral" ? " is-" + n.props.tone : ""}`)));
  await resetSlot();
  const afterReset = await page.$$eval(`${SUMMARY} .proto-slot-fill .ds-metric-tile`, (n) => n.map((e) => e.className));
  t(`reset restores all ${expected.length} tiles to the agent's proposal`,
    JSON.stringify(afterReset) === JSON.stringify(expected), `got ${JSON.stringify(afterReset)} want ${JSON.stringify(expected)}`);

  console.log("\n[4] the refusals hold — visible, DOM untouched, and NOTHING on the console");
  const errCountBefore = errors.length;
  const beforeRefusal = await tile0Class();
  const PROBE = "urgent"; // out of vocabulary by construction
  t(`the probe tone "${PROBE}" really is outside TONES`, !TONES.includes(PROBE));
  await page.evaluate((tone) => import("/system/bus-toggles.mjs").then((m) => m.getSlotBus().emit({
    type: "agent.set-tone", source: "agent",
    target: { component: "metric-tile", id: "summary-strip:0" }, params: { tone },
  })), PROBE);
  const refusedTone = await readoutText();
  t("an out-of-enum tone leaves the DOM untouched", (await tile0Class()) === beforeRefusal);
  t("...and names the refusal in the readout", refusedTone.startsWith("refused:") && refusedTone.includes(PROBE), refusedTone);

  await page.evaluate(() => import("/system/bus-toggles.mjs").then((m) => m.getSlotBus().emit({
    type: "agent.set-tone", source: "agent",
    target: { component: "metric-tile", id: "summary-strip:99" }, params: { tone: "warn" },
  })));
  const refusedIndex = await readoutText();
  t("an out-of-range tile index leaves the DOM untouched", (await tile0Class()) === beforeRefusal);
  t("...and names that refusal too", refusedIndex.startsWith("refused:"), refusedIndex);
  // The reason refusals go to the readout rather than a throw: action-bus.mjs catches handler
  // throws into console.error, which would both hide the refusal from the reader and trip this run.
  t("a refused action logs nothing to the console", errors.length === errCountBefore,
    errors.slice(errCountBefore).join(" | "));

  console.log("\n[5] each row commands only its own slot");
  const insightBefore = await page.getAttribute('[data-slot="insight-panel"] .proto-slot-fill .ds-metric-tile', "class");
  const summaryBefore = await tile0Class();
  await page.evaluate(() => import("/system/bus-toggles.mjs").then((m) => m.getSlotBus().emit({
    type: "agent.set-tone", source: "agent",
    target: { component: "metric-tile", id: "insight-panel:0" }, params: { tone: "critical" },
  })));
  const insightAfter = await page.getAttribute('[data-slot="insight-panel"] .proto-slot-fill .ds-metric-tile', "class");
  t("an action for the other slot changes that slot", insightAfter !== insightBefore, `${insightBefore} → ${insightAfter}`);
  t("...and leaves this one alone", (await tile0Class()) === summaryBefore);

  // ---------------------------------------------------------------- Verdant: the device frame
  console.log("\n[6] verdant's frame — rest geometry is CSS-owned, nothing written at mount");
  const vd = await newPage(ctx);
  await vd.goto(`${BASE}/proto/verdant.html`, { waitUntil: "load" });
  await vd.waitForSelector('[data-device-frame="ready"]', { timeout: 20000 });
  const rest = await vd.evaluate(() => {
    const phone = document.querySelector(".proto-frame-phone");
    const h = document.querySelector(".proto-resize");
    return {
      inline: phone.style.getPropertyValue("--frame-w"),
      width: Math.round(phone.getBoundingClientRect().width),
      now: h.getAttribute("aria-valuenow"),
      role: h.getAttribute("role"),
      focusable: h.getAttribute("tabindex"),
    };
  });
  t("no --frame-w is written at mount (the CSS fallback owns rest geometry)", rest.inline === "", `got "${rest.inline}"`);
  t(`the handle is a focusable separator (role=${rest.role}, tabindex=${rest.focusable})`,
    rest.role === "separator" && rest.focusable === "0");
  t(`aria-valuenow (${rest.now}) agrees with the rendered width (${rest.width})`, Number(rest.now) === rest.width);

  console.log("\n[7] the clamps hold under drag and under the keyboard");
  const width = () => vd.evaluate(() => Math.round(document.querySelector(".proto-frame-phone").getBoundingClientRect().width));
  const valuenow = () => vd.evaluate(() => Number(document.querySelector(".proto-resize").getAttribute("aria-valuenow")));

  const box = await vd.locator(".proto-resize").boundingBox();
  const cy = box.y + box.height / 2;
  await vd.mouse.move(box.x + box.width / 2, cy);
  await vd.mouse.down();
  await vd.mouse.move(box.x + 2000, cy, { steps: 12 }); // far past the max
  await vd.mouse.up();
  const dragMax = await width();
  t(`dragging far right settles at FRAME_MAX (${FRAME_MAX})`, dragMax === FRAME_MAX, `got ${dragMax}`);

  const box2 = await vd.locator(".proto-resize").boundingBox();
  await vd.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await vd.mouse.down();
  await vd.mouse.move(box2.x - 2000, box2.y + box2.height / 2, { steps: 12 }); // far past the min
  await vd.mouse.up();
  const dragMin = await width();
  t(`dragging far left settles at FRAME_MIN (${FRAME_MIN})`, dragMin === FRAME_MIN, `got ${dragMin}`);

  await vd.focus(".proto-resize");
  await vd.keyboard.press("End");
  t(`End reaches FRAME_MAX (${FRAME_MAX})`, (await width()) === FRAME_MAX, `got ${await width()}`);
  t("aria-valuenow tracks the width at the max", (await valuenow()) === (await width()));
  await vd.keyboard.press("Home");
  t(`Home reaches FRAME_MIN (${FRAME_MIN})`, (await width()) === FRAME_MIN, `got ${await width()}`);
  await vd.keyboard.press("ArrowRight");
  t(`ArrowRight steps by STEP (${STEP})`, (await width()) === FRAME_MIN + STEP, `got ${await width()}`);
  await vd.keyboard.press("ArrowLeft");
  t("ArrowLeft steps back", (await width()) === FRAME_MIN);
  await vd.keyboard.press("ArrowLeft");
  t("ArrowLeft at the floor does not go below FRAME_MIN", (await width()) === FRAME_MIN, `got ${await width()}`);
  t("aria-valuenow tracks the width at the min", (await valuenow()) === (await width()));

  console.log("\n[8] the screen reflows through @container, not through a media query");
  // At FRAME_MIN the screen is ~296px — under the 340px query. Asserted as a TRACK COUNT rather
  // than a pixel string, which differs per engine.
  const tracks = (sel) => vd.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length : -1;
  }, sel);
  t("at FRAME_MIN the tile pair collapses to one track", (await tracks(".vd-tile-pair")) === 1, `got ${await tracks(".vd-tile-pair")}`);
  await vd.keyboard.press("End");
  t("at FRAME_MAX the tile pair is two tracks again", (await tracks(".vd-tile-pair")) === 2, `got ${await tracks(".vd-tile-pair")}`);
  const stackTracks = await tracks(".vd-screen-body .vd-stack");
  t(`at FRAME_MAX the plant list goes multi-column (${stackTracks} tracks)`, stackTracks > 1, `got ${stackTracks}`);

  await vd.close();

  // ---------------------------------------------------------------- reduced motion
  console.log("\n[9] reduced motion — both interactions still complete, same end state");
  const rmCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const rmFw = await newPage(rmCtx);
  await rmFw.goto(`${BASE}/proto/fieldwork.html`, { waitUntil: "load" });
  await rmFw.waitForSelector('[data-bus-toggles="ready"]', { timeout: 20000 });
  await rmFw.waitForSelector(TILE0, { timeout: 20000 });
  await rmFw.click(`${SUMMARY} input.bt-tone[value="critical"]`);
  t("reduced motion: the tone command still lands", (await rmFw.getAttribute(TILE0, "class")).includes("is-critical"));
  await rmFw.close();

  const rmVd = await newPage(rmCtx);
  await rmVd.goto(`${BASE}/proto/verdant.html`, { waitUntil: "load" });
  await rmVd.waitForSelector('[data-device-frame="ready"]', { timeout: 20000 });
  await rmVd.focus(".proto-resize");
  await rmVd.keyboard.press("End");
  const rmW = await rmVd.evaluate(() => Math.round(document.querySelector(".proto-frame-phone").getBoundingClientRect().width));
  t(`reduced motion: the frame still resizes to FRAME_MAX (${FRAME_MAX})`, rmW === FRAME_MAX, `got ${rmW}`);
  await rmVd.close();
  await rmCtx.close();

  // ---------------------------------------------------------------- embed discipline
  console.log("\n[10] work.html's embeds grew no frame chrome");
  const work = await newPage(ctx);
  await work.goto(`${BASE}/work.html`, { waitUntil: "load" });
  // Both embeds are loading="lazy" and sit well below the fold. Chromium loads them anyway;
  // firefox and webkit genuinely do not until they approach the viewport, so without this scroll
  // the check below found ZERO frames on two of three engines and "no embed grew chrome" was
  // vacuously true — a check that cannot fail.
  //
  // Waited on the FRAME LIST and not on the iframes' readyState, which was the first fix and was
  // wrong: an un-navigated lazy iframe already has a blank placeholder document reporting
  // readyState "complete", so that wait returned instantly and changed nothing. The frame's URL is
  // the only thing that says the real page arrived.
  await work.evaluate(() => document.querySelector(".factory-embeds")?.scrollIntoView());
  let protoFrames = [];
  for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
    protoFrames = work.frames().filter((f) => f.url().includes("/proto/"));
    if (protoFrames.length === 2) break;
    await work.waitForTimeout(200);
  }
  t(`both proto pages are embedded (${protoFrames.length})`, protoFrames.length === 2, `got ${protoFrames.length}`);
  for (const f of protoFrames) {
    const got = await f.evaluate(() => ({
      rows: document.querySelectorAll(".bt-row").length,
      handles: document.querySelectorAll(".proto-resize").length,
      device: document.querySelectorAll(".proto-device").length,
    }));
    const name = f.url().split("/").pop();
    t(`${name}: no control row, no resize handle, no device wrapper`,
      got.rows === 0 && got.handles === 0 && got.device === 0, JSON.stringify(got));
  }
  await work.close();

  await ctx.close();
  await browser.close();
  held.browser = null;

  if (errors.length) {
    results.fails += 1;
    console.log(`  ✗ no unexpected page errors — got ${errors.length}`);
    for (const e of errors) console.log(`      ${e}`);
  } else {
    results.passes += 1;
    console.log("  ✓ no unexpected page errors in this engine");
  }
}

let failed = 0;
for (const engine of toRun) {
  console.log(`\n${"=".repeat(72)}\n${engine}\n${"=".repeat(72)}`);
  const results = { passes: 0, fails: 0, skips: [] };
  const held = { browser: null };
  try {
    await journey(engine, results, held);
  } catch (e) {
    results.fails += 1;
    console.log(`  ✗ ${engine} threw mid-run: ${e.message}`);
  } finally {
    if (held.browser) await held.browser.close().catch(() => {});
  }
  console.log(`\n${engine}: ${results.passes} passed, ${results.fails} failed`);
  failed += results.fails;
}

console.log(`\n${"=".repeat(72)}`);
console.log(failed ? `proto-journey ✗  ${failed} failed assertion(s)` : `proto-journey ✓  all assertions passed on ${toRun.join(", ")}`);
process.exit(failed ? 1 : 0);
