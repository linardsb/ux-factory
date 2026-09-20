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
//     away from what the zoom arithmetic assumes.
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

// THE ONE EXPECTED-NOISE FILTER ON THIS DRIVER, and it arrived at #219 — this file's header used to
// say there was none, "unlike proto-journey's". That sentence stopped being true the moment /factory
// started embedding the two proto pages as device frames: those pages fetch the mock Worker
// (127.0.0.1:8787) and fall back to committed static fixtures when it is absent, which IS the
// designed behaviour, and every engine logs the refused request for it in its own words. An iframe's
// console messages surface on the embedding page, so without this every /factory assertion below
// would fail for a degradation the proto pages are supposed to perform.
//
// Copied VERBATIM from tooling/proto-journey.mjs:70 rather than re-derived, so the two drivers agree
// about what the same degradation looks like — and narrow for the same reason it is narrow there:
//   · firefox names the blocked origin, so the Worker's own address identifies it;
//   · chromium and webkit carry no URL, so each is matched on its own refused-CONNECTION wording.
// All three name a connection that was refused, which a 404, a bad MIME type or a real script error
// does not produce — so a genuine failure, including one against some other origin, still fails the
// run. NOT applied to the /studio.html opener below: that page mounts no frames, so it keeps the
// stronger any-error-is-a-failure contract this driver was written with.
//
// IT BRIEFLY CARRIED A FOURTH, UNANCHORED `CORS request did not succeed` ALTERNATIVE (PR #267 M2),
// which would have matched a cross-origin failure against ANY host and quietly cancelled the
// sentence above. Measured on all three engines against a settled /factory with both frames loaded:
// firefox emits six messages, every one of them of the form "Cross-Origin Request Blocked: … at
// http://127.0.0.1:8787/api/…", so the FIRST alternative already matches it; chromium's six are
// "net::ERR_CONNECTION_REFUSED" and webkit's six "Could not connect to the server". Zero unmatched
// on each. The fourth bought nothing and is gone, and "verbatim" is true again.
const EXPECTED_NOISE = /127\.0\.0\.1:8787|ERR_CONNECTION_REFUSED|Could not connect to the server/;

// #219 · A SUB-FRAME'S REQUESTS ARE NOT THIS PAGE'S. /factory embeds the two proto pages as device
// frames, and Fieldwork fetches handoff/verdant/vocabulary.json for its agentic slots — the SAME url
// the compile beat lazily fetches and the same one two fixtures below deliberately fail. Playwright
// reports a sub-frame's requests on the embedding page and routes them through its handlers, so
// every request LOG and every route FIXTURE that means "/factory itself" has to say so. Without it
// the beat's lazy-fetch claim reads as broken by a frame doing exactly what it should, and the 503
// fixture serves its one failure to the frame instead of to the beat.
const mainOnly = (page) => (r) => r.frame() === page.mainFrame();

const ENGINES = ["chromium", "firefox", "webkit"];
const requested = (process.argv[2] || "all").toLowerCase();
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`studio-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// Imported from the shipped module, never retyped — moving a cap or a level fails this driver
// instead of drifting past it (proto-journey.mjs:54-56's discipline).
// #302: the caps and the zoom table are gone; what this driver computes expectations from now is the
// stage box, the scale bounds, the node pitch and the nudge floor. THE DISCIPLINE IS UNCHANGED and is
// the whole point of the line — every number below is imported, never retyped, so moving the stage or
// the scale bounds fails this driver instead of drifting past it.
const { MIN_SIZE, NODE_GAP, NODE_H, NODE_W, SCALE_MAX, SCALE_MIN, SCALE_REST, STAGE_H, STAGE_W, ZOOM_STEP } =
  await import(new URL("../system/studio-canvas.mjs", import.meta.url));
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
// #219's framesPass asks the SHIPPED module which prototypes are on the canvas and where, so a
// changed footprint or a renamed frame moves the driver with the module instead of drifting past it.
const { FRAMES } = await import(new URL("../system/studio-frames.mjs", import.meta.url));
// #221's two passes compute every expectation through the same pure functions the page runs — a
// literal sentence or rect would pass a list or a map that silently stopped being the canvas's.
const { layerEntries } = await import(new URL("../system/studio-layers.mjs", import.meta.url));
const { jumpFrom, mapView, nodeRect, visibleCount } = await import(new URL("../system/studio-minimap.mjs", import.meta.url));
// #302 Phase 5's pure layer, for the same reason: the nudge step, the eight verbs and the reading
// order are all computed here through the functions the page runs.
const { ALIGN_VERBS, alignMoves, NUDGE_STEP, readingOrder } = await import(new URL("../system/studio-verbs.mjs", import.meta.url));
// The LAYOUT RULE, for the same reason again. /factory's canvas is arranged by arrangeBoard, whose
// rule is board-ops.mjs's rankLayout — so the expected position of every block is computed HERE
// from the board the page itself fetched, never typed. A driver that typed a column would pass a
// layout that had silently stopped being the rank layout's, which is exactly what #302 replaced.
const { rankLayout } = await import(new URL("../system/board-ops.mjs", import.meta.url));

// The stale-serve guard (tooling/catalog-journey.mjs's, copied): a long-lived serve.mjs can belong
// to another session and serve ANOTHER tree, and every assertion below would then be about the
// wrong code. Checked on studio-layers.mjs because that is the file this run is newest about — a
// stale server is exactly how a green run gets reported for code that was never served.
{
  const here = new URL("../system/studio-layers.mjs", import.meta.url);
  const served = await fetch(`${BASE}/system/studio-layers.mjs`).then((r) => r.text()).catch(() => null);
  const { readFile } = await import("node:fs/promises");
  if (served !== await readFile(here, "utf8")) {
    console.error(`studio-journey: ${BASE} is not serving THIS tree's system/studio-layers.mjs — start `
      + "node tooling/visual-regression/serve.mjs from this checkout (or point BASE elsewhere)");
    process.exit(1);
  }
}

const VIEWPORT = "[data-studio-canvas]";
const SCROLL = `${VIEWPORT} .stx-scroll`;
const READOUT = `${VIEWPORT} .stx-zoom-level`;
const LIVE = `${VIEWPORT} .stx-live`;

// The readout's own arithmetic, so a case names a SCALE and the expectation follows the shipped
// rounding rather than a second copy of it.
const pct = (scale) => `${Math.round(scale * 100)}%`;


// #416 · THE SETTLE WAIT, AND IT SAYS WHAT IT DIED IN. Every wait below for [data-replay="settled"]
// was a bare waitForSelector, and a bare waitForSelector throws ONE sentence — "Timeout 30000ms
// exceeded" — for three different failures: a studio that never mounted, a driver parked in
// `loading` because an artifact fetch never resolved, and a run that was still playing. A throw
// aborts the whole engine leg, so the only clue left in the log is the assertion COUNT it stopped
// at, and #416's diagnosis had to be reconstructed from three such counts across three runs.
//
// It is a WRAPPER, not a new budget: same selector, same default visible state, same timeout at
// every call site, no assertion added, and a healthy page takes the identical path. On timeout it
// reads the driver's own state off the page and rethrows with it — the host's two attributes, the
// seek control's value and max (system/replay-driver.mjs's syncControls writes them on EVERY
// advance, so a FROZEN beat separates "stalled" from "merely slow"), the unavailable card's text if
// one was painted, and the page's URL. The call site is recovered from the stack, so none of the
// twenty-two callers has to pass a label and none can drift out of date.
async function settleWait(p, timeout = 30000) {
  const frames = [...(new Error().stack || "").matchAll(/studio-journey\.mjs:(\d+):\d+/g)]
    .map((m) => m[1]).slice(1, 3);
  const site = frames.length ? `studio-journey.mjs:${frames.join(" ← :")}` : "an unrecovered line";
  try {
    await p.waitForSelector('[data-replay="settled"]', { timeout });
  } catch {
    const state = await p.evaluate(() => {
      const host = document.querySelector("[data-studio]");
      const seek = document.querySelector(".stu-replay-seek");
      const card = document.querySelector(".stu-replay-card");
      return {
        url: location.href,
        studio: host ? host.getAttribute("data-studio") : "NO [data-studio] ON THE PAGE",
        replay: host ? host.getAttribute("data-replay") : null,
        beat: seek ? `${seek.value}/${seek.getAttribute("max")}` : "no transport painted",
        card: card ? card.textContent.replace(/\s+/g, " ").slice(0, 160) : null,
      };
    }).catch((e) => ({ stateUnreadable: e.message }));
    throw new Error(`[data-replay="settled"] never arrived within ${timeout} ms at ${site} — ${JSON.stringify(state)}`);
  }
}

// GATE B'S ONE DEFINITION (#302). It was "no element on the canvas carries a style attribute at
// all" — true while an arrangement was attributes, false the moment setPos writes --x/--y/--w/--h
// and setScale writes the three scale properties. Rewritten rather than dropped, and rewritten to
// the EXACT SET: a style attribute on the canvas carries only these seven and nothing else.
//
// That is the property the old gate was built for. "Allow a style attribute on a slot" would throw
// it away — the thing being caught is someone reaching for `node.style.transform = …` or a raw
// `left`/`top`, and a presence check cannot see either once presence is allowed.
//
// ONE ARRAY, EIGHT CALL SITES. build-checks group 7 gates the SOURCE half (which modules may write
// a style property at all); this is the running-page half, and both studio-verbs.mjs:504-507 and
// studio.mjs:50-51 say in their own headers that both halves matter.
// TWO LISTS, because there are two claims. A NODE may carry only its four position properties —
// the scale ones live on the viewport, so a node carrying one is a defect this narrower list
// catches and the wider one would not. Derived rather than retyped, so the four cannot drift
// between the per-node sites and the canvas-wide ones.
const POSITION_PROPS = ["--x", "--y", "--w", "--h"];
const STYLE_ALLOWED = [...POSITION_PROPS, "--stx-scale", "--stx-extent-w", "--stx-extent-h"];

// The offenders, NAMED rather than counted, under any selector. Read property by property off the
// CSSStyleDeclaration rather than by matching the attribute's text: a longhand written by a third
// party is invisible to a substring check and is exactly what this exists to catch.
const strayStyles = (p, selector) => p.evaluate(([sel, allowed]) => {
  const ok = new Set(allowed);
  const bad = [];
  for (const node of document.querySelectorAll(sel)) {
    for (const prop of node.style) if (!ok.has(prop)) bad.push(`${node.className || node.tagName}.${prop}`);
  }
  return bad;
}, [selector, STYLE_ALLOWED]);

// The state the assertions below read, taken in one round trip so nothing races a re-layout.
const snapshot = (p) => p.evaluate(async (ALLOWED_PROPS) => {
  const vp = document.querySelector("[data-studio-canvas]");
  const scroll = vp.querySelector(".stx-scroll");
  const stage = vp.querySelector(".stx-stage");
  const slots = [...stage.querySelectorAll(".stx-slot")];
  // SETTLE FOR THE COALESCED SCALE WRITE (#302). setScale is deferred to one write per animation
  // frame — S1's own recommendation, and the reason a pinch's event flood costs one write rather
  // than forty — so --stx-scale on the viewport is up to a frame behind the module's own variable.
  // Reading without this gives the PREVIOUS scale while the readout, written synchronously, already
  // shows the new one: a driver that did not wait would report the two disagreeing and be right
  // about the frame and wrong about the page. Two frames, because one only guarantees the callback
  // is queued.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return {
    // #302: the zoom is a continuous --stx-scale on the viewport, not an index into a table.
    zoom: vp.style.getPropertyValue("--stx-scale") || null,
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
    // GATE B (#302). It was "no node carries a style attribute at all", which was true while
    // arrangement was attributes and is false now — setPos writes four custom properties and
    // setScale three. So the claim is not ABSENCE, it is the EXACT SET: every style attribute on the
    // canvas carries only those seven properties and nothing else.
    //
    // READ PROPERTY BY PROPERTY off the CSSStyleDeclaration rather than by matching the attribute's
    // text: a longhand written by a third party would be invisible to a substring check and is
    // exactly what this exists to catch. The offenders are NAMED, so a failure says which property
    // on which element rather than a count.
    inlineStyled: (() => {
      const ALLOWED = new Set(ALLOWED_PROPS);
      const bad = [];
      for (const n of [...slots, ...stage.querySelectorAll(".stx-frame, .stx-guide, .stx-menu, .stx-arrows"), stage, scroll, vp]) {
        for (const prop of n.style) if (!ALLOWED.has(prop)) bad.push(`${n.className || n.tagName}.${prop}`);
      }
      return bad;
    })(),
    outDisabled: vp.querySelector(".stx-zoom-btn").disabled,
  };
}, STYLE_ALLOWED);

// The exported driver seam, reached by the SAME specifier the harness imports — a different string
// resolves to a second module record whose `live` is null (vt-verify.mjs:209's idiom).
const viaSeam = (p, x, y) => p.evaluate(([px, py, POS]) =>
  import("/system/studio-canvas.mjs").then((m) => {
    const canvas = m.getCanvas();
    if (!canvas) return { error: "getCanvas() returned nothing — the module record the page mounted is not this one" };
    const node = canvas.stage.querySelector(".stx-slot");
    const at = canvas.place(node, { x: px, y: py, name: "Driven tile" });
    const prop = (k) => node.style.getPropertyValue(k);
    // GATE B's per-node half: the style attribute this node carries is ONLY the position properties.
    const stray = [...node.style].filter((k) => !POS.includes(k));
    return { at, x: prop("--x").replace("px", ""), y: prop("--y").replace("px", ""), w: prop("--w").replace("px", ""), stray };
  }), [x, y, POSITION_PROPS]);

// THE FIXTURES BELOW STAY IN CELL COORDINATES ON PURPOSE (#302), and this is the one line that
// converts them. They are not grid references any more — they are a readable shorthand for "five
// pitches across, three down", which is how a person describes a place on this canvas and how every
// fixture in this file was already written. Converting here rather than retyping ~30 literals keeps
// each case's INTENT legible and puts the arithmetic in one place a reader can check.
const at = (col, row) => ({ x: (col - 1) * (NODE_W + NODE_GAP), y: (row - 1) * (NODE_H + NODE_GAP) });
// A DRAG TARGET IS A CENTRE, not an origin — the retired cell-to-point helper returned a cell's
// centre and every gesture below was written against that. Pressing at an origin drops the node a
// half-node short, which reads as an off-by-one in the hit-test rather than in the fixture.
const centre = (col, row) => ({ x: at(col, row).x + NODE_W / 2, y: at(col, row).y + NODE_H / 2 });

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

// A STAGE POINT → A CLIENT POINT, measured from the stage's own rect rather than reconstructed from
// three reference nodes (#302). The old helper interpolated between slots (2,1) (3,1) (2,2) because
// a cell's client position could only be found by looking at a cell; a free position is written on
// the node, so the conversion is the scroller's rect, the scroll offset and the scale — the same
// three steps the module's own pointOnStage takes, INVERTED.
//
// Deliberately NOT reading the module's function: a driver that calls the implementation's own
// arithmetic agrees with its bugs. These three reads are the browser's.
const stagePoint = (p, x, y) => p.evaluate(([sx, sy]) => {
  const vp = document.querySelector("[data-studio-canvas]");
  const scroll = vp.querySelector(".stx-scroll");
  const r = scroll.getBoundingClientRect();
  const scale = parseFloat(vp.style.getPropertyValue("--stx-scale")) || 1;
  return { x: r.left + sx * scale - scroll.scrollLeft, y: r.top + sy * scale - scroll.scrollTop };
}, [x, y]);

// A STAGE POINT -> A CLIENT POINT THAT REALLY LANDS ON THE STAGE. The plain conversion is
// stagePoint()'s three steps; what this adds is the guarantee the marquee fixtures need, and it is
// a cross-engine fact rather than a nicety.
//
// The marquee listener is on .stx-stage. The scroller carries a 1px border and the stage's rect is
// fractional, and the engines do NOT agree on what a point on that boundary hit-tests to: measured
// with elementFromPoint at increasing insets from the stage's own top-left corner, chromium
// resolves to .stx-slot at 0px, while firefox gives .stx-viewport at 0 and 1, .stx-scroll at 2,
// and reaches the content only at 4. A press on the first three is a press the stage never sees —
// which reads as "the marquee selected nothing" rather than as "the press missed".
//
// A FIXED EPSILON WOULD BE A GUESS. This nudges inward only while the point resolves OUTSIDE the
// stage, so a point already over a node returns unchanged on the first check and the boundary case
// costs a few pixels — which cannot change an answer, because idsInRange is an OVERLAP test over
// nodes with real extents.
const clientPoint = (p, sx, sy) => p.evaluate(([px, py]) => {
  const vp = document.querySelector("[data-studio-canvas]");
  const sc = vp.querySelector(".stx-scroll");
  const stage = vp.querySelector(".stx-stage");
  const r = sc.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  const scale = parseFloat(vp.style.getPropertyValue("--stx-scale")) || 1;
  let x = Math.min(Math.max(r.left + px * scale - sc.scrollLeft, st.left), st.right);
  let y = Math.min(Math.max(r.top + py * scale - sc.scrollTop, st.top), st.bottom);
  for (let i = 0; i < 8; i += 1) {
    const el = document.elementFromPoint(x, y);
    if (el && stage.contains(el)) break;
    x += 1;
    y += 1;
  }
  const inView = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    && x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;
  return { x, y, onScreen: inView };
}, [sx, sy]);

// The stable id of whatever sits NEAREST a stage point — so a case can name its start node by where
// it is rather than by which order the harness happened to place things in. Nearest rather than
// exact, because a free position is a float and an equality test on one is a coin toss.
const idAt = (p, x, y) => p.evaluate(([sx, sy]) => {
  const nodes = [...document.querySelectorAll("[data-studio-canvas] .stx-slot")];
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const nx = parseFloat(n.style.getPropertyValue("--x")) || 0;
    const ny = parseFloat(n.style.getPropertyValue("--y")) || 0;
    const d = (nx - sx) ** 2 + (ny - sy) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best?.getAttribute("data-stx-id") ?? null;
}, [x, y]);

// The measured box of one node, by its stable id.
const nodeBox = (p, id) => p.evaluate((i) => {
  const n = document.querySelector(`.stx-slot[data-stx-id="${i}"]`);
  const r = n && n.getBoundingClientRect();
  return r && { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}, id);

// NOTHING IS SCROLLING ANY MORE — and "nothing" is the whole of the fix, because the scroller that
// was still moving is not the one this wait first watched. #196's lesson, and #302 makes it
// load-bearing for a second reason: studio-verbs.mjs's pointOnStage converts every pointermove
// through a LIVE `scroll.getBoundingClientRect()` plus a live `scroll.scrollTop`. Playwright drives
// the mouse in CLIENT coordinates, so a page that slides under a stationary pointer moves the rect
// while clientY stays put, and the difference is added to the gesture's stage delta pixel for
// pixel. A drag of exactly one pitch then lands one pitch PLUS the residual scroll — which reads as
// a broken mover rather than as a fixture that started too early.
// THE WINDOW, NOT JUST .stx-scroll, and that is measured rather than argued. The section's setup
// calls scrollIntoView on [data-studio-canvas]; .stx-scroll is that element's DESCENDANT, not its
// ancestor, so the scroll it starts is the WINDOW's — and `html { scroll-behavior: smooth }`
// (system/components.css) makes it a smooth one on every engine that honours it. Watching
// .stx-scroll alone therefore watched a scroller that never moved: it agreed with itself twice
// immediately and returned while the window still had pixels to travel. Probed on firefox at 50 ms
// intervals: window.scrollY 0 → 387 by t+300 ms (where the setup's fixed wait ends) and not still
// until 395 at t+550 ms.
// UNROUNDED, AND TWO CONSECUTIVE MATCHES. Rounding is what made the first version of this wait
// insufficient: a decelerating smooth scroll's tail moves less than a pixel per sample while still
// having several to go, so `Math.round` reports it stopped and the drag starts into the last of
// it. The AC #1 row's overshoot across the four versions of this wait, every figure observed on
// firefox against a keyboard path that reaches exactly 156: 18.43 with no wait, 8.35 with a rounded
// one, 4.98 with this unrounded two-sample one over .stx-scroll alone — smaller each time, and a
// failure each time, because none of them was waiting on the thing that was moving. Adding the
// window to the sample was run BOTH WAYS in one probe on one page: the old key overshot by 4.50 and
// settled after 2 iterations, the new key overshot by 0.000 and took 9. Chromium and WebKit settle
// faster and passed throughout, which is exactly why it has to be waited for rather than assumed.
async function scrollSettled(p) {
  let last = null;
  let agreed = 0;
  for (let i = 0; i < 40; i += 1) {
    const now = await p.evaluate(() => {
      const s = document.querySelector("[data-studio-canvas] .stx-scroll");
      return `${s.scrollLeft},${s.scrollTop},${window.scrollX},${window.scrollY}`;
    });
    agreed = now === last ? agreed + 1 : 0;
    if (agreed >= 2) return;
    last = now;
    await p.waitForTimeout(50);
  }
}

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
  // Per-record texts beside the count (#264): say() sets textContent, so each announcement is one
  // childList record whose addedNodes[0] carries the whole sentence — and a synchronous burst
  // (adoptBoard's cancel + placements + the redraft sentence) batches into ONE callback, where
  // __liveLast keeps only the final sentence. Additive; the counting rows read n/last as before.
  window.__liveTexts = [];
  const live = document.querySelector("[data-studio-canvas] .stx-live");
  window.__liveObs?.disconnect();
  window.__liveObs = new MutationObserver((ms) => {
    window.__liveCount += ms.length;
    for (let i = 0; i < ms.length; i += 1) window.__liveAt.push(performance.now());
    for (const m of ms) {
      const said = (m.addedNodes && m.addedNodes[0] ? m.addedNodes[0].textContent : "").trim();
      if (said) window.__liveTexts.push(said);
    }
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
  texts: (window.__liveTexts || []).slice(),
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
  // studio.html fetches only committed files and calls no Worker, so ANY console error or page error
  // is a real failure on THIS opener — no filter to weaken. /factory is different since #219 embeds
  // the two proto pages there; see EXPECTED_NOISE above for what those openers filter and why.
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
  t(`at rest the canvas is --stx-scale ${SCALE_REST}, scrolled to 0,0, readout 100%`,
    Number(rest.zoom) === SCALE_REST && rest.scrollLeft === 0 && rest.scrollTop === 0 && rest.readout === "100%",
    JSON.stringify({ zoom: rest.zoom, l: rest.scrollLeft, t: rest.scrollTop, readout: rest.readout }));
  t(`the stage holds real components (${rest.slotCount} placed)`, rest.slotCount >= 30, `slots=${rest.slotCount}`);
  // GATE B (#302), and the claim CHANGED with the substrate rather than being dropped. It read "no
  // style attribute anywhere", which was true while arrangement was attributes; setPos and setScale
  // write seven custom properties, so what is asserted now is the EXACT SET — every style attribute
  // on this canvas carries only those seven and nothing else. Read property by property, so a
  // longhand a third party wrote is named rather than hidden inside an attribute's text.
  t("every inline style on the canvas carries ONLY --x/--y/--w/--h and the three scale properties — on the running page",
    rest.inlineStyled.length === 0, rest.inlineStyled.join(", "));
  t("the sizer gives the scroller a real pannable range", rest.scrollW > rest.clientW,
    `scrollWidth=${rest.scrollW} clientWidth=${rest.clientW}`);

  // ---------------------------------------------------------------- [2] the four zoom verbs
  await btn(page, "Zoom in").click();
  await btn(page, "Zoom in").click();
  const zin = await snapshot(page);
  // MULTIPLICATIVE, not a table index: two clicks is SCALE_REST × ZOOM_STEP², and the readout's
  // rounding is pct()'s own. ZOOM_STEP is IMPORTED, like every other number this driver reads, so
  // this asserts that the page does what the module says rather than that the module says 1.25 —
  // change the step and this row follows it. That is the discipline the import block states, and it
  // is worth being explicit about: a lossless round trip is true of ANY ratio, so it pins nothing,
  // and where a constant's VALUE needs holding, that is build-checks group 12's job and not a
  // driver's.
  const twoIn = SCALE_REST * ZOOM_STEP * ZOOM_STEP;
  t(`zoom in ×2 multiplies by ZOOM_STEP twice → ${pct(twoIn)}`,
    Math.abs(Number(zin.zoom) - twoIn) < 1e-9 && zin.readout === pct(twoIn), `${zin.zoom} / ${zin.readout}`);

  await btn(page, "Zoom out").click();
  await btn(page, "Zoom out").click();
  const zout = await snapshot(page);
  t("zoom out ×2 comes back EXACTLY to the rest scale — the step is a ratio, so the round trip is lossless",
    Math.abs(Number(zout.zoom) - SCALE_REST) < 1e-9 && zout.readout === "100%", `${zout.zoom} / ${zout.readout}`);

  // THE FLOOR IS A BOUND, NOT A TABLE END. Enough presses to cross it from rest, computed from the
  // bound itself rather than counted — clicking past it would hang on the button this very
  // assertion expects to be disabled.
  const toFloor = Math.ceil(Math.log(SCALE_REST / SCALE_MIN) / Math.log(ZOOM_STEP));
  for (let i = 0; i < toFloor; i += 1) await btn(page, "Zoom out").click();
  const floored = await snapshot(page);
  t(`at the ${SCALE_MIN} floor the Zoom out button is disabled`, floored.outDisabled, `scale=${floored.zoom}`);
  t("…and the scale STOPPED at the floor rather than going under it",
    Math.abs(Number(floored.zoom) - SCALE_MIN) < 1e-9, `scale=${floored.zoom}`);
  const toCeil = Math.ceil(Math.log(SCALE_MAX / SCALE_MIN) / Math.log(ZOOM_STEP));
  for (let i = 0; i < toCeil; i += 1) await btn(page, "Zoom in").click();
  t(`at the ${SCALE_MAX} ceiling the Zoom in button is disabled`, await btn(page, "Zoom in").isDisabled(), "");
  await btn(page, "Reset").click();

  // FIT NOW ACTUALLY FITS, and that is the claim that changed. The discrete table could only snap
  // DOWN to a level at or below the ideal ratio, so every assertion here was phrased as "the NEXT
  // level up does not fit" — true both when fit found one and when it floored because nothing fits.
  // A continuous scale can BE the ratio, so the assertion is equality with the ratio itself, which
  // is strictly stronger and is the whole reason the table was retired.
  await btn(page, "Fit").click();
  const fitted = await snapshot(page);
  const chosen = Number(fitted.zoom);
  const ratio = Math.min(fitted.clientW / STAGE_W, fitted.clientH / STAGE_H);
  t("fit lands on the RATIO itself, not on the largest level at or below it — the stepped table's whole cost, gone",
    Math.abs(chosen - Math.min(SCALE_MAX, Math.max(SCALE_MIN, ratio))) < 1e-6,
    `chose ${chosen}, the ratio is ${ratio} (stage ${STAGE_W}×${STAGE_H} in ${fitted.clientW}×${fitted.clientH})`);
  // …and it genuinely fits, measured rather than derived from the same arithmetic: the scaled stage
  // is inside the box on both axes.
  t("…and the scaled stage really is inside the viewport on both axes",
    chosen * STAGE_W <= fitted.clientW + 1 && chosen * STAGE_H <= fitted.clientH + 1,
    `${chosen * STAGE_W}×${chosen * STAGE_H} in ${fitted.clientW}×${fitted.clientH}`);
  t("fit announces the scale it reached", /^Zoom \d+ percent/.test(fitted.live), fitted.live);

  // THE SHRUNKEN-GRID PROBE IS DELETED, NOT TRANSLATED (#302). It injected a stylesheet shrinking
  // --stx-slot-w/h so that fit could land ABOVE its floor, because the real 12×220 grid was far
  // wider than the scroller and the check otherwise only ever exercised the floor branch. A
  // continuous fit has no floor branch to miss: it lands on the ratio at every viewport size, which
  // the equality assertion above tests directly and in one case rather than two.

  await btn(page, "Reset").click();
  const afterReset = await snapshot(page);
  t("reset returns to the rest scale and scroll 0,0",
    Number(afterReset.zoom) === SCALE_REST && afterReset.scrollLeft === 0 && afterReset.scrollTop === 0,
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
  t(`#213 · Zoom in by Enter steps to ${pct(SCALE_REST * ZOOM_STEP)} and the aria-live readout says so`,
    Math.abs(Number(kzin.zoom) - SCALE_REST * ZOOM_STEP) < 1e-9 && kzin.readout === pct(SCALE_REST * ZOOM_STEP),
    `${kzin.zoom} / ${kzin.readout}`);

  await btn(page, "Zoom out").focus();
  await page.keyboard.press("Enter");
  const kzout = await snapshot(page);
  t("#213 · Zoom out by Enter returns to 100% and the readout tracks it",
    Math.abs(Number(kzout.zoom) - SCALE_REST) < 1e-9 && kzout.readout === "100%", `${kzout.zoom} / ${kzout.readout}`);

  await countLive(page);
  await btn(page, "Fit").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kfit = await snapshot(page);
  const kfitSaid = await liveSeen(page);
  const kchosen = Number(kfit.zoom);
  const kratio = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(kfit.clientW / STAGE_W, kfit.clientH / STAGE_H)));
  t("#213 · Fit by Enter lands on the same ratio the pointer path does — one fit, two input paths",
    Math.abs(kchosen - kratio) < 1e-6, `chose ${kchosen}, the ratio is ${kratio}`);
  t("#213 · …and announces the level through .stx-live, once",
    kfitSaid.n === 1 && /^Zoom \d+ percent, fit to the canvas$/.test(kfitSaid.last), `${kfitSaid.n}: ${kfitSaid.last}`);

  await countLive(page);
  await btn(page, "Reset").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kreset = await snapshot(page);
  const kresetSaid = await liveSeen(page);
  t("#213 · Reset by Enter returns to the rest scale, scroll 0,0",
    Number(kreset.zoom) === SCALE_REST && kreset.scrollLeft === 0 && kreset.scrollTop === 0,
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
    Number(bare.zoom) === SCALE_REST, `--stx-scale=${bare.zoom}`);
  t("…and it did scroll the canvas", bare.scrollTop > 0, `scrollTop=${bare.scrollTop}`);

  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");
  await page.waitForTimeout(200);
  const held2 = await snapshot(page);
  t("⌘/Ctrl + wheel DOES zoom — the same gesture a trackpad pinch delivers",
    Number(held2.zoom) > SCALE_REST, `--stx-scale=${held2.zoom}`);

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
  const reached = await page.evaluate(() => {
    const vp = document.querySelector("[data-studio-canvas]");
    const scroll = vp.querySelector(".stx-scroll");
    // THE FARTHEST NODE, found by reading positions rather than by naming a column (#302). The claim
    // is unchanged and is the one pan-by-scroll exists to preserve — a component at the far edge is
    // focusable and the browser scrolls it into view natively, which a transform-translate stage
    // fails exactly here. What changed is how the driver finds it: there is no last column to name.
    const far = [...vp.querySelectorAll(".stx-slot")]
      .sort((a, b) => (parseFloat(b.style.getPropertyValue("--x")) || 0) - (parseFloat(a.style.getPropertyValue("--x")) || 0))[0];
    if (!far) return { ok: false, why: "no slot on the stage at all" };
    const farX = parseFloat(far.style.getPropertyValue("--x")) || 0;
    if (farX <= scroll.clientWidth) return { ok: false, why: `the farthest node is at x ${farX}, inside the ${scroll.clientWidth}px viewport — nothing to scroll to` };
    // Scoped PAST the move handle (#205). The slot is now a wrapper whose first child is a
    // .stx-grab button, so a bare querySelector would return the handle and this check would keep
    // passing while its stated subject — "a COMPONENT in the far column is focusable" — had quietly
    // stopped being what it measured.
    const target = far.matches("button, a, input, [tabindex]") ? far
      : [...far.querySelectorAll("button, a, input, [tabindex]")].find((n) => !n.classList.contains("stx-grab"));
    (target || far).focus({ preventScroll: false });
    if (!target) far.scrollIntoView({ block: "nearest", inline: "nearest" });
    return { ok: true, scrollLeft: Math.round(scroll.scrollLeft), farX: Math.round(farX) };
  });
  t("focusing the component FARTHEST from the origin scrolls it into view — the property pan-by-scroll exists to preserve",
    reached.ok && reached.scrollLeft > 0, JSON.stringify(reached));

  await btn(page, "Reset").click();

  // ---------------------------------------------------------------- [6] arrangement via the seam
  const DRIVEN = { x: 5 * (NODE_W + NODE_GAP), y: 2 * (NODE_H + NODE_GAP) };
  const driven = await viaSeam(page, DRIVEN.x, DRIVEN.y);
  t("place() through the exported getCanvas() seam writes --x / --y / --w",
    Number(driven.x) === DRIVEN.x && Number(driven.y) === DRIVEN.y && Number(driven.w) === NODE_W, JSON.stringify(driven));
  // GATE B, per node: the style attribute place() wrote carries the position properties and NOTHING
  // else. "no style attribute at all" was the claim while arrangement was attributes; this is its
  // successor, and it is the stronger of the two — it names a stray property rather than counting.
  t("…and writes NOTHING but the position properties doing it", driven.stray.length === 0, driven.stray.join(", "));
  const announced = (await page.locator(LIVE).textContent()).trim();
  t("…and the live region announced the placement in the new units",
    announced === `Driven tile at ${DRIVEN.x}, ${DRIVEN.y}`, announced);

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

  // THE CLAMP IS setPos's NOW, and the bound is the stage rather than a cap. Asserted against
  // STAGE_W minus the node's own width, because that is what setPos actually does — a position past
  // the edge is pulled back far enough that the whole node stays on, not merely its origin.
  const clamped = await viaSeam(page, STAGE_W + 9999, -4);
  t("an off-stage position is clamped by setPos, never written raw",
    Number(clamped.x) === STAGE_W - Number(clamped.w) && Number(clamped.y) === 0, JSON.stringify(clamped));

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
    canvas.place(document.createElement("p"), { x: 0, y: 0, name: "Lonely" });
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
  const TARGET = "s1"; // the metric-tile at the stage origin, 0, 0

  // BRING THE CANVAS TO THE TOP OF THE WINDOW before any pointer work. The harness has a lede and a
  // capability strip above the stage, so at page-scroll 0 the scroller starts around y=474 and the
  // lower rows sit past the window's bottom edge — a drop point the mouse cannot be moved to. It
  // only ever passed on chromium because that engine had incidentally scrolled the page during the
  // sections above; firefox and webkit had not, and every pointer assertion here failed on both.
  await page.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);

  const startArr = await arrangement(page);
  t("the verbs mounted and the arrangement reads back through the getVerbs() seam",
    startArr && !startArr.error && startArr[TARGET] && startArr[TARGET].x === 0 && startArr[TARGET].y === 0,
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
  // ONE PITCH DOWN, MEASURED FROM THE NODE'S OWN BOX (#302). The old fixture named a CELL, and the
  // row number was load-bearing because the resolver skipped occupied rows — a drag to row 4 and one
  // ArrowDown landed in the same place only because of that skipping. Free positions have no cells
  // and nothing to skip, so AC #1's identity claim needs the two paths to travel the SAME DELTA:
  // the pointer is dragged one pitch from the node's centre, and the keyboard takes one Shift+Arrow,
  // which IS one pitch. At scale 1 scrolled to 0,0 a client pixel is a stage pixel, which is why
  // this section resets before it starts.
  const ARROWS_TO_GOAL = 1;
  await scrollSettled(page);
  const startBox = await nodeBox(page, TARGET);
  const goalPoint = {
    x: (startBox.left + startBox.right) / 2,
    y: (startBox.top + startBox.bottom) / 2 + (NODE_H + NODE_GAP),
  };

  await dragTo(page, TARGET, goalPoint);
  const byPointer = await arrangement(page);
  // THE POINTER'S OWN ANSWER IS THE REFERENCE, not a typed destination. A drag lands where the
  // gesture's delta puts it, which on a free substrate is not exactly the fixture's point — so the
  // claim is that the OTHER TWO SOURCES REACH THE SAME PLACE, and the pointer's result is what they
  // are compared against. That is AC #1's actual sentence, and it is stronger than three sources
  // each matching a literal: a literal all three miss identically would pass.
  const pointerAt = byPointer[TARGET];
  t(`AC #1 · a pointer drag moved ${TARGET} one node pitch down`,
    pointerAt && Math.abs(pointerAt.y - (NODE_H + NODE_GAP)) <= 1 && Math.abs(pointerAt.x) <= 1,
    JSON.stringify(pointerAt));

  await undoAll(page);
  t("…and undo put it back, so the next source starts from the same place",
    (await arrangement(page))[TARGET]?.y === 0, JSON.stringify((await arrangement(page))[TARGET]));

  // KEYBOARD ONLY, AND WITH SHIFT HELD (#302). A bare arrow NUDGES by NUDGE_STEP — 4px, the spacing
  // scale's floor — which is the whole point of Phase 5's precision path and is NOT the distance a
  // drag covers. Shift takes one NODE PITCH, which is the step the pointer's own gesture spans, so
  // Shift+Arrow is the equivalent keyboard path and a bare one is a different verb. Asserting AC #1
  // on the bare arrow would be comparing a nudge against a drag and calling the difference a bug.
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < ARROWS_TO_GOAL; i += 1) await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const byKeyboard = await arrangement(page);
  // DEEP-COMPARED WITH A ONE-PIXEL TOLERANCE, and the tolerance is the substrate's rather than a
  // hedge: a pointer drag lands on a float (the browser's own rect arithmetic) and a keyboard step
  // lands on an integer, so demanding byte equality of two floats produced by different paths would
  // be asserting the browser's rounding. Every OTHER node is compared exactly — only the one that
  // moved has any float in it.
  const samePlace = (a, b) => a && b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && a.w === b.w;
  const others = (arr) => Object.fromEntries(Object.entries(arr).filter(([k]) => k !== TARGET));
  t("AC #1 · the keyboard path produces the IDENTICAL arrangement, deep-compared",
    samePlace(byKeyboard[TARGET], byPointer[TARGET]) && JSON.stringify(others(byKeyboard)) === JSON.stringify(others(byPointer)),
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
  // the VOCABULARY SHAPE everywhere else on this bus (agentic-renderer, bus-toggles,
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
  // THE SENTENCE NAMES WHERE IT LANDED, and the expectation is read from the arrangement rather
  // than typed: a drag lands on a float and the announcement rounds it, so a literal here would be
  // asserting the browser's rounding rather than the module's sentence.
  const landedAt = (await arrangement(page))[TARGET];
  t("AC #2 · …and that one announcement names the position it landed at, rounded",
    pointerSaid.last === `${moved.name} moved by 0, ${NODE_H + NODE_GAP} to ${Math.round(landedAt.x)}, ${Math.round(landedAt.y)}.`
      || new RegExp(`moved to ${Math.round(landedAt.x)}, ${Math.round(landedAt.y)}\\.$`).test(pointerSaid.last),
    `${pointerSaid.last} (landed at ${JSON.stringify(landedAt)})`);

  await undoAll(page);
  // Three ArrowDowns, each a NUDGE (#302). A bare arrow no longer steps a whole row — it moves by
  // NUDGE_STEP, the spacing scale's 4px floor — so the landing point is the origin plus three
  // steps. Nothing is occupied any more (D-d), so no press can be skipped and the arithmetic is
  // exact. Computed from the arrangement rather than typed, for the pointer row's reason: the
  // module rounds what it announces, so a literal would assert the browser's rounding.
  const N = 3;
  const kbOrigin = (await arrangement(page))[TARGET];
  const KB_LANDS = { x: kbOrigin.x, y: kbOrigin.y + N * NUDGE_STEP };
  await countLive(page);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < N; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const kbSaid = await liveSeen(page);
  t(`AC #2 · a KEYBOARD gesture announces once per discrete keypress — pick-up + ${N} arrows + drop = ${N + 2}`,
    kbSaid.n === N + 2, `${kbSaid.n} announcement(s), expected ${N + 2}; last: ${kbSaid.last}`);
  // THE DROP'S SENTENCE, not a step's. The per-press sentence is "Moved by …" and the drop's is the
  // consumer's "<name> moved to X, Y." — asserted whole rather than by substring, so a drop that
  // announced a step's wording would fail here rather than match a loose regex.
  t("AC #2 · …and the FINAL announcement is the drop's, naming the landed position",
    kbSaid.last === `${moved.name} moved to ${Math.round(KB_LANDS.x)}, ${Math.round(KB_LANDS.y)}.`,
    `${kbSaid.last} — expected the drop at ${Math.round(KB_LANDS.x)}, ${Math.round(KB_LANDS.y)}`);

  // A BLOCKED press still announces, and still counts. Without this a keyboard user at the grid edge
  // gets silence and cannot tell a dead key from a refused move — and the N + 2 count above would
  // quietly depend on which N was chosen.
  await undoAll(page);
  await countLive(page);
  await page.locator(`.stx-slot[data-stx-id="${TARGET}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");   // already at y 0 — the stage edge
  await page.keyboard.press("ArrowLeft"); // already at x 0 — the other edge
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  const blocked = await liveSeen(page);
  t("AC #2 · two EDGE arrow presses still announce, one each — silence at the edge is not feedback",
    blocked.n === 4, `${blocked.n} announcement(s), expected 4 (pick-up + 2 at the edge + cancel); last: ${blocked.last}`);
  // THE CLAIM CHANGED WITH THE SUBSTRATE, and this row is where it shows. There WAS a "Blocked,
  // still in column X, row Y." sentence, because a grid move could be refused by an occupied cell.
  // Nothing blocks a free move (D-d), so studio-verbs.mjs deleted that variant and a press at the
  // edge announces THE SAME NUMBERS TWICE — the repeat IS the feedback. Asserted as exactly that:
  // the two edge presses say the same position, and it is the position the node actually holds.
  // The old row passed only because Escape's "Cancelled" was the last text, which is why it stayed
  // green through a change that removed the sentence it was named for.
  // The two sentences differ in their `by` clause — one press was vertical and the other
  // horizontal — and AGREE on the position, which is the half that carries the claim.
  const edgeSaid = blocked.texts.slice(1, 3);
  const atEdge = (await arrangement(page))[TARGET];
  const heldAt = `to ${Math.round(atEdge.x)}, ${Math.round(atEdge.y)},`;
  t("…and an edge press REPEATS the position rather than inventing a refusal it no longer has",
    edgeSaid.length === 2 && edgeSaid.every((line) => line.includes(heldAt)),
    `${JSON.stringify(edgeSaid)} vs the node at ${JSON.stringify(atEdge)}`);

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
    t(`AC #5 · Escape mid-${label}-gesture restores the pre-drag position`,
      after.x === origin.x && after.y === origin.y,
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

  // ---------------------------------------------------------------- occupancy: DELETED (#302)
  // There were two rows here — "after dragging AT an occupied cell no two components share one" and
  // "the dragged node did not land on the peer's cell" — and they are GONE rather than translated.
  //
  // They asserted a rule this substrate does not have. On the grid a cell held one component, so a
  // drag at an occupied peer had to keep the last free cell it crossed, and "no two slots share a
  // cell" was the property that made "moved to column 2, row 1" nameable. D-d retired occupancy
  // entirely: a free position is a float, nothing blocks a move, and two components overlapping is
  // CORRECT behaviour — it is how a reader stacks a label over a card. studio-verbs.mjs says the
  // same thing in its own header ("Nothing blocks a free move (D-d)"), and its two keyboard
  // resolvers collapsed into one because of it.
  //
  // Translating these would have produced a check asserting the opposite of the shipped decision,
  // which is worse than no check: it would go red on correct code and be "fixed" by re-introducing
  // the rule. The hit-test cases below are what now prove a drag lands where it was dropped.

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
    // #196: hover/pointer probes racing a smooth scroll produced a false bug once already, and
    // #302 gives the same wait a second job — see scrollSettled's own header.
    await scrollSettled(page);
    // BOTH ENDS CONVERTED THROUGH THE ONE HELPER, and the two ends take DIFFERENT helpers on
    // purpose. `from` names which node to pick up, so it is an ORIGIN — that is where a node's
    // --x/--y sit and it is what idAt compares against. `cell` is a DROP TARGET, so it is a
    // CENTRE: pressing at an origin releases the node half a node short, which reads as an
    // off-by-one in the hit-test rather than in the fixture.
    const id = await idAt(page, at(from.col, from.row).x, at(from.col, from.row).y);
    const point = await stagePoint(page, centre(cell.col, cell.row).x, centre(cell.col, cell.row).y);
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
    // ±2px, AND THE TOLERANCE IS A CONSEQUENCE OF THE SUBSTRATE RATHER THAN A LOOSENING. A grid
    // drop snapped to a track, so the point was inside the cell by construction and an exact
    // containment test was free. A free drop lands on a FLOAT — the pointer's own sub-pixel
    // position, minus the grab offset, divided by a continuous scale — and the browser rounds the
    // painted box to device pixels. So a point on the box's own edge can measure a fraction
    // outside it. Two pixels is the smallest window that covers that rounding and is far below the
    // half-node (110px) error the case exists to detect: a missing scroll or scale term moves the
    // node by tens of pixels, not by one.
    const SLOP = 2;
    const inside = point.x >= landed.left - SLOP && point.x <= landed.right + SLOP
      && point.y >= landed.top - SLOP && point.y <= landed.bottom + SLOP;
    t(`hit-test · ${label} · the node lands under the point it was dropped on (±${SLOP}px)`,
      inside, `point ${Math.round(point.x)},${Math.round(point.y)} vs box ${JSON.stringify(landed)} — at ${JSON.stringify((await arrangement(page))[id])}`);
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
  // ZOOM ≠ 1 — the sole detector of a missing `÷ scale` in the coordinate chain. At scale 1 the
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
  // child applies in the child's UNSCALED local space, so without the `÷ scale` divide the node
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
  const stickOrigin = (await arrangement(page))[TARGET];
  const stickPoint = await stagePoint(page, centre(2, 4).x, centre(2, 4).y);
  await dragTo(page, TARGET, stickPoint);
  await page.waitForTimeout(200);
  const stuck = (await arrangement(page))[TARGET];
  // ASSERTED AS "IT IS NEAR WHERE IT WAS DROPPED", not as an exact position. The old row could name
  // a cell because a drop snapped to one; a free drop lands on a float carrying the grab offset, so
  // the honest claim is that the node sits within half a node of the target centre — which a revert
  // to the origin (a whole cell away, and the bug this row exists for) fails by a wide margin.
  const wantStick = at(2, 4);
  t("R4 · after a normal pointerup the node is AT THE TARGET, not back at its origin",
    JSON.stringify(stuck) !== JSON.stringify(stickOrigin)
      && Math.abs(stuck.x - wantStick.x) < NODE_W / 2 && Math.abs(stuck.y - wantStick.y) < NODE_H / 2,
    `${JSON.stringify(stickOrigin)} → ${JSON.stringify(stuck)}, target ${JSON.stringify(wantStick)}`);

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
    linkAfter.x === linkBefore.x && linkAfter.y === linkBefore.y,
    `${JSON.stringify(linkBefore)} → ${JSON.stringify(linkAfter)}`);

  // …and the same component IS movable by its handle, so the guard costs nothing in reach. Moved by
  // the keyboard, which is the path that never has to argue about what is under the cursor.
  await page.locator(`.stx-slot[data-stx-id="${linkId}"] .stx-grab`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const linkMoved = (await arrangement(page))[linkId];
  // ONE ArrowDown is ONE NUDGE now (#302) — 4px, not a row — so the assertion names the step it
  // expects rather than "a different row". Exact: the nudge is integer arithmetic on an integer
  // origin, so there is nothing here to round.
  t("…and its move HANDLE still moves it by one nudge, so the guard costs no reach",
    linkMoved.y === linkBefore.y + NUDGE_STEP,
    `${JSON.stringify(linkBefore)} → ${JSON.stringify(linkMoved)} (one nudge is ${NUDGE_STEP}px)`);

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
  const stickyGoal = centre(3, 4);
  const stickyPoint = await stagePoint(page, stickyGoal.x, stickyGoal.y);
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
  // THE SAME CLAIM THE DRAG PATH MAKES, asserted the same way (#302). The old row could name a
  // destination cell because a drop snapped to one. A free drop lands wherever the pointer released
  // MINUS the grab offset, so the nameable property is the hit-test's: the point the reader released
  // on lies inside the node they were carrying. That is what "reached the drag's destination with no
  // dragging movement" actually means here, and it fails identically if the second click drops
  // nothing, drops it back at the origin, or drops it somewhere the pointer never was.
  const stickyBox = await nodeBox(page, TARGET);
  t("SC 2.5.7 · …and a second click drops it UNDER THE POINTER — the drag's destination, reached with no dragging movement",
    JSON.stringify(stickyArr) !== JSON.stringify(stickyFrom)
      && stickyPoint.x >= stickyBox.left - 2 && stickyPoint.x <= stickyBox.right + 2
      && stickyPoint.y >= stickyBox.top - 2 && stickyPoint.y <= stickyBox.bottom + 2,
    `${JSON.stringify(stickyFrom)} → ${JSON.stringify(stickyArr)}; released at ${Math.round(stickyPoint.x)},${Math.round(stickyPoint.y)} vs box ${JSON.stringify(stickyBox)}`);
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
  const LATE_FROM = at(2, 4);
  const LATE_TO = at(3, 4);
  const lateId = await page.evaluate(async ([x, y]) => {
    const canvas = (await import("/system/studio-canvas.mjs")).getCanvas();
    const node = document.createElement("div");
    node.className = "card";
    node.textContent = "Placed after the verbs mounted";
    canvas.place(node, { x, y, name: "Late arrival" });
    return node.closest(".stx-slot")?.getAttribute("data-stx-id") ?? null;
  }, [LATE_FROM.x, LATE_FROM.y]);
  // NOT `?.x === LATE_FROM.x` ALONE. `undefined === undefined` is true, so a read of a key the
  // snapshot no longer carries would pass this vacuously — which is exactly how the grid version of
  // this row stayed green after place() stopped taking a cell. The id and the position are both
  // named, and the position is compared to a number.
  const latePlaced = (await arrangement(page))[lateId];
  t("#230 · the harness can place a component AFTER the verbs mounted — otherwise the case below is untested",
    lateId !== null && latePlaced?.x === LATE_FROM.x && latePlaced?.y === LATE_FROM.y,
    `${lateId} at ${JSON.stringify(latePlaced)}, expected ${JSON.stringify(LATE_FROM)}`);

  await dragTo(page, lateId, await stagePoint(page, centre(3, 4).x, centre(3, 4).y));
  const lateMoved = (await arrangement(page))[lateId];
  t(`#230 · a POINTER drag moves it to about ${LATE_TO.x}, ${LATE_TO.y}`,
    Math.abs(lateMoved.x - LATE_TO.x) < NODE_W / 2 && Math.abs(lateMoved.y - LATE_TO.y) < NODE_H / 2,
    `${JSON.stringify(lateMoved)} vs ${JSON.stringify(LATE_TO)}`);

  await countLive(page);
  await btn(page, "Undo").click();
  await page.waitForTimeout(300);
  const lateUndone = (await arrangement(page))[lateId];
  t("#230 · …and UNDO puts it back where it was placed, rather than consuming a step and moving nothing",
    lateUndone.x === LATE_FROM.x && lateUndone.y === LATE_FROM.y,
    `${JSON.stringify(lateMoved)} → ${JSON.stringify(lateUndone)}, expected ${JSON.stringify(LATE_FROM)}`);
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
  const INJ_FROM = at(9, 5);
  const INJ_TO = at(10, 5);
  const injId = await page.evaluate(async ([x, y]) => {
    const canvas = (await import("/system/studio-canvas.mjs")).getCanvas();
    const node = document.createElement("div");
    node.className = "card";
    node.textContent = "Placed after the verbs mounted, moved only by an injected action";
    canvas.place(node, { x, y, name: "Late agent arrival" });
    return node.closest(".stx-slot")?.getAttribute("data-stx-id") ?? null;
  }, [INJ_FROM.x, INJ_FROM.y]);
  await inject(page, { type: "ui.move", source: "agent", target: { component: "card", id: injId }, params: INJ_TO });
  await page.waitForTimeout(150);
  const injMoved = (await arrangement(page))[injId];
  t("#230 · a post-mount component moved ONLY by an injected action moves — no gesture, no pick-up",
    injMoved?.x === INJ_TO.x && injMoved?.y === INJ_TO.y,
    `${JSON.stringify(injMoved)}, expected ${JSON.stringify(INJ_TO)}`);
  await btn(page, "Undo").click();
  await page.waitForTimeout(300);
  const injUndone = (await arrangement(page))[injId];
  t("#230 · …and undo returns IT to where it was placed too — the consumer adopts what no pick-up could have",
    injUndone.x === INJ_FROM.x && injUndone.y === INJ_FROM.y,
    `${JSON.stringify(injUndone)}, expected ${JSON.stringify(INJ_FROM)}`);

  // Leave the stage as the sections below expect to find it.
  await page.evaluate((ids) => { for (const i of ids) document.querySelector(`.stx-slot[data-stx-id="${i}"]`)?.remove(); },
    [lateId, injId]);

  // ---------------------------------------------------------------- refusals go to the live region
  await countLive(page);
  const beforeRefusal = await arrangement(page);
  await inject(page, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: "no-such-node" }, params: { x: 236, y: 156 } });
  await page.waitForTimeout(120);
  const refused = await liveSeen(page);
  t("a ui.move for an id that is not on the stage refuses in the LIVE REGION and leaves the DOM untouched",
    refused.n === 1 && /Refused/i.test(refused.last)
      && JSON.stringify(await arrangement(page)) === JSON.stringify(beforeRefusal),
    `${refused.n} announcement(s): ${refused.last}`);

  // Hostile params never reach a property — setPos is the one definition of "on the stage" (#302,
  // replacing the retired slot clamp) and the consumer hands it the caller's numbers unchecked, so
  // this is the running-page proof that the clamp is AT THE WRITE and not at the caller. Both
  // hostile shapes at once: an out-of-range finite number clamps to the far edge, and a NaN falls
  // back to 0 rather than writing "NaNpx" and silently voiding the declaration.
  await inject(page, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: TARGET }, params: { x: 1e9, y: NaN } });
  await page.waitForTimeout(120);
  const clampedMove = (await arrangement(page))[TARGET];
  t("a ui.move with a hostile position is clamped by setPos, never written raw",
    clampedMove.x === STAGE_W - clampedMove.w && clampedMove.y === 0,
    `${JSON.stringify(clampedMove)}, expected x ${STAGE_W - clampedMove.w} and y 0 on a ${STAGE_W}-wide stage`);

  // ---------------------------------------------------------------- still no inline styles
  await undoAll(page);
  await btn(page, "Redo").click();
  await page.waitForTimeout(250);
  const afterMoves = await snapshot(page);
  // GATE B AFTER TRAVEL (#302), and R11's reason survives the change of claim intact: undo/redo
  // travel is element.animate(), which never touches .style. What changed is what "clean" means —
  // setPos writes four custom properties, so the claim is the EXACT SET rather than absence, and a
  // `node.style.transform = …` written by the restore path is named here rather than counted.
  t("R11 · after a drag, an undo and a redo every style attribute STILL carries only the position and scale properties — the FLIP is element.animate(), which never touches .style",
    afterMoves.inlineStyled.length === 0, afterMoves.inlineStyled.join(", "));

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
  // THE AGENT IS HANDED THE POINTER'S OWN ANSWER, not a typed destination — which is what makes this
  // AC #1's third source rather than a third fixture: the claim is that an injected action reaches
  // the place a drag reached, so the drag's result IS the input.
  await inject(fresh, { type: "ui.move", source: "agent", target: { component: "metric-tile", id: TARGET },
    params: { x: byPointer[TARGET].x, y: byPointer[TARGET].y } });
  await fresh.waitForTimeout(150);
  const byAgent = await arrangement(fresh);
  t("AC #1 · an injected source:\"agent\" action on a FRESH page moves the same node through the same consumer",
    samePlace(byAgent[TARGET], byPointer[TARGET]) && JSON.stringify(others(byAgent)) === JSON.stringify(others(byPointer)),
    `agent ${JSON.stringify(byAgent[TARGET])} vs pointer ${JSON.stringify(byPointer[TARGET])}`);
  t("AC #1 · …and it announced as a move, like the other two sources",
    /moved to \d+, \d+\.$/.test((await fresh.locator(LIVE).textContent()).trim()),
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
  // The same three claims the full-motion block makes, against the continuous scale (#302): a step
  // is a RATIO, and fit lands on the ratio itself rather than on the largest table level below it.
  const rchosen = Number(rfit.zoom);
  const rratio = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(rfit.clientW / STAGE_W, rfit.clientH / STAGE_H)));
  t("reduced motion · zoom in still multiplies off the rest scale",
    Math.abs(Number(rzoomed.zoom) - SCALE_REST * ZOOM_STEP) < 1e-9, `--stx-scale=${rzoomed.zoom}`);
  t("reduced motion · fit still lands on the RATIO the measured layout agrees with",
    rfit.zoom !== rzoomed.zoom && Math.abs(rchosen - rratio) < 1e-6,
    `${rzoomed.zoom} → ${rfit.zoom}; the ratio is ${rratio} (stage ${STAGE_W}×${STAGE_H} in ${rfit.clientW}×${rfit.clientH})`);
  t("reduced motion · reset still returns to the rest scale and scroll 0,0",
    Math.abs(Number(rrest.zoom) - SCALE_REST) < 1e-9 && rrest.scrollLeft === 0 && rrest.scrollTop === 0,
    JSON.stringify({ zoom: rrest.zoom, l: rrest.scrollLeft, t: rrest.scrollTop }));
  t("reduced motion · placement still completes", rdriven.x === "2" && rdriven.y === "2", JSON.stringify(rdriven));

  // AC #6 — the off-ramp has to leave the VERBS working, not just quiet. Each one asserted against
  // something it could get wrong: the arrangement has to actually change.
  await btn(rp, "Reset").click();
  // Same reason as the block above: the pointer cannot be moved to a point below the window.
  await rp.evaluate(() => document.querySelector("[data-studio-canvas]").scrollIntoView({ block: "start" }));
  await rp.waitForTimeout(300);
  const rBefore = (await arrangement(rp))["s1"];
  await dragTo(rp, "s1", await stagePoint(rp, centre(3, 4).x, centre(3, 4).y));
  const rDragged = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · a pointer drag still completes",
    rDragged.x !== rBefore.x || rDragged.y !== rBefore.y,
    `${JSON.stringify(rBefore)} → ${JSON.stringify(rDragged)}`);

  await rp.locator('.stx-slot[data-stx-id="s1"] .stx-grab').focus();
  await rp.keyboard.press("Enter");
  await rp.keyboard.press("ArrowDown");
  await rp.keyboard.press("Enter");
  await rp.waitForTimeout(120);
  const rKeyed = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · a keyboard move still completes",
    rKeyed.y === rDragged.y + NUDGE_STEP,
    `${JSON.stringify(rDragged)} → ${JSON.stringify(rKeyed)} (one nudge is ${NUDGE_STEP}px)`);

  // The undo still restores AND runs no animated travel. Read immediately after the click, before
  // any animation could have finished on its own and made this vacuously true.
  await btn(rp, "Undo").click();
  const rAnims = await rp.evaluate(() => document.querySelectorAll(".stx-slot").length
    && [...document.querySelectorAll(".stx-slot")].reduce((n, el) => n + el.getAnimations().length, 0));
  await rp.waitForTimeout(250);
  const rUndone = (await arrangement(rp))["s1"];
  t("AC #6 · reduced motion · undo still restores the arrangement",
    rUndone.x === rDragged.x && rUndone.y === rDragged.y,
    `${JSON.stringify(rKeyed)} → ${JSON.stringify(rUndone)}, expected ${JSON.stringify(rDragged)}`);
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
  await framesPass(browser, engineName, t, errors);
  await layersPass(browser, engineName, t, errors);
  await minimapPass(browser, engineName, t, errors);
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
  p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`factory console: ${m.text()}`); });
  await p.goto(`${BASE}/factory.html#shape`, { waitUntil: "load" });
  await p.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await p.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
  await p.waitForSelector('[data-canvas-verbs="ready"]', { timeout: 20000 });
  // #209 · EVERY ASSERTION BELOW IS ABOUT THE SETTLED CANVAS. The three handles above all fire at
  // MOUNT, and since #209 the canvas is EMPTY at mount — system/replay-driver.mjs fills it by
  // playing a committed real run. 30 s because ~14 s of it is playback (replay-driver.mjs's
  // PLAYBACK_MS governs both, and says these move together).
  await settleWait(p, 30000);

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
  // #302: a place is --x/--y, read as numbers so the nudge arithmetic below is exact.
  const posOf = (page, id) => page.evaluate((i) => {
    const n = document.querySelector(`.stx-slot[data-stx-id="${i}"]`);
    return { x: parseFloat(n.style.getPropertyValue("--x")) || 0, y: parseFloat(n.style.getPropertyValue("--y")) || 0,
      name: n.getAttribute("data-stx-name") };
  }, id);
  const before = await posOf(p, first);
  await countLive(p);
  await busRecord(p);
  await busClear(p);
  await p.locator(`.stx-slot[data-stx-id="${first}"] .stx-grab`).focus();
  await p.keyboard.press("Enter");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(150);
  const said = await liveSeen(p);
  const after = await posOf(p, first);
  // ONE ArrowDown is ONE NUDGE (#302) — NUDGE_STEP, not a row — and the step is named rather than
  // "it changed", so a nudge that silently became a node pitch fails here instead of passing.
  t("#206 · a keyboard move on the shipped surface nudges --y by one step",
    after.y === before.y + NUDGE_STEP && after.x === before.x,
    `${JSON.stringify(before)} → ${JSON.stringify(after)} (one nudge is ${NUDGE_STEP}px)`);
  t("#206 · …announcing once per keypress — pick-up + 1 arrow + drop = 3",
    said.n === 3, `${said.n} announcement(s); last: ${said.last}`);
  t("#206 · …and the last announcement names the position it landed at",
    said.last === `${after.name} moved to ${Math.round(after.x)}, ${Math.round(after.y)}.`,
    `${said.last} — the node is at ${Math.round(after.x)}, ${Math.round(after.y)}`);
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
  const styled = await strayStyles(p, ".stx-slot, .stx-stage, .stx-scroll");
  t("#206 · every style attribute on the stage, the scroller and the slots carries ONLY a position or scale property after a move",
    styled.length === 0, styled.join(", "));

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
    // …and #219 · the SAME exemption in the other two engines' words: /factory embeds the two
    // proto pages now, and their designed Worker fallback is reported as a refused CONNECTION by
    // chromium and webkit and as a blocked CROSS-ORIGIN request naming the Worker by firefox.
    if (/Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
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
    .filter((h) => /\/system\/tokens\.(neutral|saulera|verdant)\.css$/.test(h || "")));
  t("#213 · the head's ONE pack line now points at saulera — switched mid-replay, with the run still authoring",
    packLines.length === 1 && /saulera/.test(packLines[0]), JSON.stringify(packLines));
  const dAfterDock = await dReplay();
  t("#213 · the pack switch did NOT count as take-over — a dock verb is chrome, not canvas",
    dAfterDock.took === false
    && (await dp.evaluate(() => window.__pushed.filter((u) => u === "/factory/took-over").length)) === 0,
    `took=${dAfterDock.took} pushed=${JSON.stringify(await dp.evaluate(() => window.__pushed.slice()))}`);

  // The run plays through to the COMMITTED board — skinned, never shortened.
  await settleWait(dp, 30000);
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
  const dBefore = await dp.evaluate((i) => parseFloat(document.querySelector(`.stx-slot[data-stx-id="${i}"]`).style.getPropertyValue("--y")) || 0, dFirst);
  await countLive(dp);
  await dp.locator(`.stx-slot[data-stx-id="${dFirst}"] .stx-grab`).focus();
  await dp.keyboard.press("Enter");
  await dp.keyboard.press("ArrowDown");
  await dp.keyboard.press("Enter");
  await dp.waitForTimeout(150);
  const dSaid = await liveSeen(dp);
  const dAfter = await dp.evaluate((i) => parseFloat(document.querySelector(`.stx-slot[data-stx-id="${i}"]`).style.getPropertyValue("--y")) || 0, dFirst);
  t("#213 · …and a move verb still works after the dock, announced per keypress",
    dAfter === dBefore + NUDGE_STEP && dSaid.n === 3,
    `--y ${dBefore} → ${dAfter} (one nudge is ${NUDGE_STEP}px); ${dSaid.n} announcement(s): ${dSaid.last}`);
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
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };
  const settled = (p) => settleWait(p, 30000);
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
      board: want,
      wanted: want.places.map((x) => x.label),
      got: wraps.map((w) => w.getAttribute("data-stx-name")),
      at: wraps.map((w) => [w.style.getPropertyValue("--x"), w.style.getPropertyValue("--y")]),
      affordances: want.places.reduce((n, x) => n + x.affordances.length, 0),
      connections: want.connections.length,
    };
  });
  t("#209 · the settled canvas holds one block per place of the COMMITTED board, in board order",
    JSON.stringify(match.got) === JSON.stringify(match.wanted), `${JSON.stringify(match.got)} vs ${JSON.stringify(match.wanted)}`);
  // THE RANK LAYOUT, COMPUTED IN NODE FROM THE BOARD THE PAGE FETCHED (#302). The old row was
  // "row 1, columns 1..n", which is the rule arrangeBoard retired: everything in board order meant
  // a four-step flow and four unrelated screens drew identically. What replaced it is one column
  // per BFS rank from the entry place, and this expectation runs the SAME pure function the page
  // runs — so swapping two connections in the committed board moves the expectation with the page
  // and a layout that stopped being the rank layout's fails by name.
  const ranks = new Map(rankLayout(match.board).map((r) => [r.id, r]));
  const wantAt = match.board.places.map((place, i) => {
    const r = ranks.get(String(place.id)) ?? { rank: i, order: 0 };
    return [`${r.rank * (NODE_W + NODE_GAP)}px`, `${r.order * (NODE_H + NODE_GAP)}px`];
  });
  t("#209 · …laid out by the RANK LAYOUT — one column per BFS rank from the entry place, exactly as rankLayout derives it",
    JSON.stringify(match.at) === JSON.stringify(wantAt),
    `${JSON.stringify(match.at)} vs ${JSON.stringify(wantAt)}`);
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
  // The transport chrome carries no style attribute at all and the nodes carry their positions, so
  // ONE predicate covers both: the chrome contributes nothing to the list and a node contributes
  // only what it is allowed to.
  const styled = await strayStyles(p2, ".stu-replay *, .stx-slot, .stx-stage");
  t("#209 · nothing the driver drew wrote a style property it is not allowed — group 7's claim, on the running page",
    styled.length === 0, styled.join(", "));
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
  await settleWait(pr, 20000);
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
  // …and #219 · EXPECTED_NOISE for the same reason the other exemptions carry it: /factory embeds the
  // two proto pages, whose designed Worker fallback is a refused CONNECTION on chromium and webkit
  // and a blocked CROSS-ORIGIN request naming the Worker on firefox.
  pa.on("console", (m) => {
    if (m.type() !== "error" || /Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
    aErrors.push(`console: ${m.text()}`);
  });
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
    // …and #219 · the SAME exemption in the other two engines' words: /factory embeds the two
    // proto pages now, and their designed Worker fallback is reported as a refused CONNECTION by
    // chromium and webkit and as a blocked CROSS-ORIGIN request naming the Worker by firefox.
    if (/Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
    errors.push(`replay traceless console: ${m.text()}`);
  });
  await pb.route("**/traces/*.jsonl", (route) => route.fulfill({ status: 404, body: "gone" }));
  await pb.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settleWait(pb, 30000);
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
    page.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`compile console: ${m.text()}`); });
    const onlyMine = mainOnly(page); // #219: the frames fetch this same vocabulary — see mainOnly
    page.on("request", (r) => { if (onlyMine(r)) requests.push(r.url()); });
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // #209 · SETTLED FIRST, and this is a real break rather than a tidy-up. Both handles above fire
    // at MOUNT, and since #209 the canvas is EMPTY at mount — the replay driver fills it over ~14 s.
    // Without this wait every assertion below runs against a half-built board: the compile's slot
    // count is nondeterministic, and the byte-identical re-run compares two different arrangements.
    // 30 s because 14 s of it is playback (replay-driver.mjs's PLAYBACK_MS says these move together).
    await settleWait(page, 30000);
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
  const stageState = async (page) => (await docsSettled(page), page.evaluate((ALLOWED_PROPS) => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    return {
      html: stage.outerHTML,
      slots: [...stage.querySelectorAll(".stx-slot")].map((n) => ({
        id: n.getAttribute("data-stx-id"),
        // #302: a slot's place is --x/--y, read as the written strings so the comparison below is
        // the same character-for-character equality the retired attribute pair gave it.
        x: n.style.getPropertyValue("--x"),
        y: n.style.getPropertyValue("--y"),
        kind: [...n.children].filter((c) => !c.classList.contains("stx-grab"))
          .map((c) => c.className.split(" ")[0]).join("+"),
      })),
      state: document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state"),
      styled: (() => {
        const ok = new Set(ALLOWED_PROPS);
        const bad = [];
        for (const node of stage.querySelectorAll(".stx-slot, .stx-slot > *")) {
          for (const prop of node.style) if (!ok.has(prop)) bad.push(`${node.className || node.tagName}.${prop}`);
        }
        return bad;
      })(),
    };
  }, STYLE_ALLOWED));
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
  t("#207 · …in the same places: every data-stx-id and every --x / --y is unchanged",
    JSON.stringify(done.slots.map((s) => [s.id, s.x, s.y]))
      === JSON.stringify(rest.slots.map((s) => [s.id, s.x, s.y])),
    JSON.stringify(done.slots.map((s) => [s.id, s.x, s.y])));
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
  t("#207 · every style attribute on a slot or a composed node still carries ONLY a position property after the beat",
    done.styled.length === 0, done.styled.join(", "));
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
    page.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`flow console: ${m.text()}`); });
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // SETTLED FIRST — the beat is setEnabled(false) until the replay settles (#240/1,
    // studio.mjs's disable), so a click before settle silently no-ops and every assertion below
    // would read the blocks.
    await settleWait(page, 30000);
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
    return { x: w.style.getPropertyValue("--x"), y: w.style.getPropertyValue("--y") };
  });
  await cp.locator(`${VIEWPORT} .stx-slot`).nth(0).locator(".stx-grab").click();
  await cp.waitForFunction(() => document.querySelector("[data-studio-canvas] .stx-live").textContent.includes("picked up"),
    null, { timeout: 5000 });
  // One real step before the swap (PR #255 review M1): a carry that never moved satisfies the
  // at-origin conjunct below vacuously — origin === current from pick-up, so cancel()'s restore
  // line could be deleted and the row would stay green. Displacing the preview makes the restore
  // the only way back, and the wait proves the displacement really happened rather than assuming
  // the keypress landed. ONE ARROW IS ONE NUDGE NOW (#302) — 4px, not a row — and nothing can
  // block it, so one press always displaces; under the grid this needed a free row to move into.
  await cp.keyboard.press("ArrowDown");
  await cp.waitForFunction((o) => document.querySelector("[data-studio-canvas] .stx-slot").style.getPropertyValue("--y") !== o,
    carryOrigin.y, { timeout: 5000 });
  await compileNow(cp);
  const carried = await cp.evaluate(() => import("/system/studio-verbs.mjs").then((m) => {
    const w = document.querySelector("[data-studio-canvas] .stx-slot");
    return {
      gestureLive: m.getVerbs().gesture !== null,
      picked: document.querySelectorAll("[data-studio-canvas] .is-picked").length,
      x: w.style.getPropertyValue("--x"), y: w.style.getPropertyValue("--y"),
    };
  }));
  t("#251 · a live sticky carry is cancelled when the compile swap lands — gesture void, node at origin",
    !carried.gestureLive && carried.picked === 0
      && carried.x === carryOrigin.x && carried.y === carryOrigin.y,
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
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };
  const railReady = (p) => p.waitForSelector('[data-studio-keep="ready"]', { timeout: 20000 });
  const settled = (p) => settleWait(p, 30000);
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
  const p1Mine = mainOnly(p1); // #219: the device frames load two proto pages of their own
  p1.on("request", (r) => { if (p1Mine(r)) atRest.push(r.url()); });
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
  // --- 3 · the copy click, and the address bar --------------------------------------------------
  //
  // NO ARRANGEMENT ASSERTION, AND NO MOVE BEFORE THE COPY (#302). Until v3 the link carried the
  // sender's grid arrangement in `g`, and this section asserted that it came back — with a
  // deliberate off-row-1 move first, added by PR #241's Medium 3, that existed ONLY to make that
  // assertion a discriminator (the replay's default layout and arrangeBoard's answer are
  // byte-identical, so without the move the receiver reached the same layout whether the field was
  // applied or not). `g` is retired with the grid. The move and the assertion go together: keeping
  // the move and comparing positions would be asserting that the rank layout equals itself.
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
    return { reason, places: state && state.board.places.length, arrangement: state && "arrangement" in state };
  });
  t("#210 · …and it decodes back to this board", decoded.places === onCanvas, JSON.stringify(decoded).slice(0, 160));
  // The positive half of #302's retirement, asserted rather than left as an absence: a v3 decode
  // carries no `arrangement` key at all. An always-null key would be a seam a later reader would try
  // to use, and "the assertion was deleted" is not evidence the field went with it.
  t("#302 · …and it carries NO arrangement key — the grid, and `g` with it, are retired",
    decoded.arrangement === false, JSON.stringify(decoded).slice(0, 160));
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
      .map((w) => w.getAttribute("data-stx-name")),
    transport: document.querySelector(".stu-replay-controls")
      ? getComputedStyle(document.querySelector(".stu-replay-controls")).display : "gone",
    note: document.querySelector(".stu-replay-provenance")?.textContent || "",
    acts: window.__acts,
  }));
  t("#210 · the driver mounts DECLINED on a ?b= arrival rather than assembling over the visitor's board",
    declined.replay === "declined", declined.replay);
  // THE SENDER'S BOARD, NOT THE SENDER'S COORDINATES (#302). Until v3 this compared the receiver's
  // slots against the sender's moved ones, because only the link's `g` field could get it there —
  // that was the decode half's one running-page proof. `g` is retired, so what the link carries is
  // the board, and the receiver lays it out by the rank rule like any other. The claim shrinks to
  // what is actually true, rather than being translated into a comparison of a layout with itself.
  t("#210 · …with the SENDER'S board on the canvas — the places came through the link",
    declined.slots.length === onCanvas && declined.slots.every((n) => typeof n === "string" && n.length > 0),
    `${JSON.stringify(declined.slots)} for ${onCanvas} place(s)`);
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
    // NOT `.stx-slot:first-child` (#302). The arrow overlay is now the stage's FIRST child — a
    // sibling of the nodes, prepended so lines paint under them — so that selector matches
    // nothing and this row read 0 on a correct page. The entry place is the first slot in DOM
    // order, which is board order, so ask for that directly.
    rows: document.querySelector("[data-studio-canvas] .stx-slot")?.querySelectorAll(".stf-screen .ds-list-row").length ?? 0,
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
  // THE CLAIM IS RETIRED, NOT TRANSLATED (#302, Task 1.5b's fifth site — the four the report names
  // are at :2965-2991 and in studio.mjs, keepPass's g-restore row and param-manifest.json). These
  // two rows asserted that the copied link CARRIED the sender's arrangement, which was the codec's
  // `g` field; `g` is deleted and its refusal is named. So what is asserted now is the retirement
  // itself: the link still decodes to the same board, and it carries NO arrangement key at all.
  //
  // The LABEL row goes with it rather than being inverted. It read `/arrangement included/`, and
  // the shipped label is now "The link that rebuilds this build" — param-manifest.json:96 records
  // the same change. A row asserting the absence of a phrase nothing writes is a row that cannot
  // fail; the decode above is where the retirement is actually proven.
  t("#302 · …and the copied link carries NO arrangement — `g` is retired, so what travels is the board alone",
    feedOut.arrangement === null && !/arrangement/i.test(feedOut.label),
    `${JSON.stringify(feedOut.arrangement)} | ${feedOut.label}`);
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
      // …and #219 · the SAME exemption in the other two engines' words: /factory embeds the two
      // proto pages now, and their designed Worker fallback is reported as a refused CONNECTION by
      // chromium and webkit and as a blocked CROSS-ORIGIN request naming the Worker by firefox.
      if (/Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
      errors.push(`teardown console: ${m.text()}`);
    });
    // #219: scoped to the MAIN frame, or case 3 serves its one 503 to the Fieldwork frame — which
    // fetches this url first — and the beat under test gets the real file and never settles
    // "unavailable".
    const mine = mainOnly(page);
    if (route) await page.route("**/vocabulary.json", (r) => (mine(r.request()) ? route(r) : r.continue()));
    await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
    // #209 · SETTLED FIRST, for a reason sharper than the compile pass's: every assertion in this
    // section is about what happens to the stage AFTER a teardown, and while the replay is still
    // playing there is a second author adding slots to it. "Nothing was swapped in afterwards" is
    // then a claim about a stage that is changing for reasons this section knows nothing about.
    await settleWait(page, 30000);
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
  const p2Mine = mainOnly(p2); // #219: a frame's own aborted fetch is not the teardown's
  p2.on("requestfailed", (r) => { if (p2Mine(r) && r.url().includes("vocabulary.json")) failedReqs.push(r.failure()?.errorText ?? "failed"); });
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
  // #218's join is the THIRD request below, and it is asynchronous: it starts only once a screen
  // exists and resolves whenever the network does. Waiting for its DECORATION to land is what makes
  // the count deterministic — without this the total is 2 on a fast engine and 3 on a slow one
  // (measured: chromium 3, firefox 2), which is a flake rather than an assertion. Bounded and
  // swallowed; whether decoration happens at all is docsPass's claim, not this pass's.
  await p3.waitForFunction(() => document.querySelectorAll("[data-studio-docs]").length > 0,
    null, { timeout: 15000 }).catch(() => {});
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
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
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

  await settleWait(p, 30000);
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
  await settleWait(p2, 30000);
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
  // …and #219's EXPECTED_NOISE beside it, for the standing reason: this page embeds the two proto
  // pages, whose designed Worker fallback each engine reports in its own words.
  p5.on("console", (m) => {
    if (m.type() !== "error" || /Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
    errors.push(`method race 404 console: ${m.text()}`);
  });
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
  await settleWait(p6, 30000);
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

  // --- #264 · a live carry must not survive a redraft as a phantom gesture ----------------------
  // The compile beat's onState guard covers a redraft from a COMPILED stage (adoptBoard's revert
  // lands in it); the uncovered path was a redraft from BLOCKS state with a carry live — the
  // gesture closure kept referencing detached nodes, .is-picked left the DOM with them (so
  // studio-select's carrying() went false while a gesture was live), and Escape announced a
  // cancellation naming a component no longer on the canvas. Only a running page can see any of
  // this: build-checks group 13's history cases never mount a stage, and the pixel gate never
  // carries anything. Its OWN page load, so the counted rows above keep their exact counts.
  const p7 = await ctx.newPage();
  watch(p7, "method carry");
  await p7.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await settleWait(p7, 30000);
  // Pick up the first block from the keyboard — park it first (the smooth-scroll rule above),
  // record its label from the wrapper itself so the assertions below never type a name.
  await park(p7, `${VIEWPORT} .stx-slot`);
  const carried = await p7.$eval(`${VIEWPORT} .stx-slot`, (w) => w.getAttribute("data-stx-name"));
  await p7.focus(`${VIEWPORT} .stx-slot .stx-grab`);
  await p7.keyboard.press("Enter");
  await p7.waitForTimeout(120);
  // The positive control: the carry really is live before the redraft, or rows 2 and 3 prove
  // nothing (a pick-up that never happened leaves nothing to phantom).
  const held = await p7.evaluate(() => import("/system/studio-verbs.mjs").then((m) => ({
    live: Boolean(m.getVerbs()?.gesture),
    marked: document.querySelectorAll(".is-picked").length,
  })));
  await countLive(p7);
  await check(p7, 'input[name="stm-q-shape"][value="worklist"]');
  const afterDraft = await p7.evaluate(() => import("/system/studio-verbs.mjs").then((m) => ({
    gestureNull: m.getVerbs()?.gesture === null,
    picked: document.querySelectorAll(".is-picked").length,
  })));
  // BOTH halves, because carrying() reads .is-picked: gesture null AND no .is-picked anywhere —
  // false for the RIGHT reason (cancelled), not false-by-detachment with a gesture still live.
  t("#264 · a method-card redraft CANCELS a live carry — gesture null and zero .is-picked, not carrying() false by detachment",
    held.live && held.marked === 1 && afterDraft.gestureNull && afterDraft.picked === 0,
    JSON.stringify({ held, afterDraft }));
  // The cancel lands BEFORE the wrapper-removal loop, so it names the block while its node still
  // exists — the same sentence the compile path already produces. Read from the per-record texts:
  // the cancel + placements + redraft sentence are one synchronous burst, so `last` never holds it.
  const draftSaid = await liveSeen(p7);
  t("#264 · …and the redraft announces the cancellation NAMING the carried block, spoken while its node still existed",
    draftSaid.texts.some((line) => line.startsWith(`Cancelled, ${carried} back at `)),
    `${draftSaid.n} record(s): ${JSON.stringify(draftSaid.texts)}`);
  // Escape after the redraft: the document listener (studio-verbs.mjs's body-drag route) finds no
  // gesture, so NOTHING is announced — on the pre-fix tree this is where the phantom spoke,
  // naming a component the reader could no longer see.
  await countLive(p7);
  await p7.focus(SCROLL);
  await p7.keyboard.press("Escape");
  await p7.waitForTimeout(150);
  const escSaid = await liveSeen(p7);
  const escGesture = await p7.evaluate(() => import("/system/studio-verbs.mjs")
    .then((m) => m.getVerbs()?.gesture === null));
  t("#264 · Escape after the redraft announces NOTHING — no phantom cancellation naming the vanished block, gesture still null",
    escGesture && escSaid.n === 0 && !escSaid.texts.some((s) => s.includes(carried)),
    JSON.stringify(escSaid));
  await p7.close();

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
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
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
    await settleWait(p, 30000);
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

  // THE ARRANGEMENT AS idsInRange'S OWN INPUT SHAPE (#302). It returned { id, col, row } and now
  // returns { id, x, y, w, h } — which is not a translation but a requirement: idsInRange takes
  // extent into account ("a node is in range when its BOX overlaps the rectangle"), so a reader
  // that dropped w and h would compute a different answer from the page's and the AC #1 identity
  // rows would compare two wrong things.
  const slotsNow = (p) => p.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot")]
    .map((n) => ({
      id: n.getAttribute("data-stx-id"),
      x: parseFloat(n.style.getPropertyValue("--x")) || 0,
      y: parseFloat(n.style.getPropertyValue("--y")) || 0,
      w: parseFloat(n.style.getPropertyValue("--w")) || n.offsetWidth || 0,
      // THE MEASURED HEIGHT WHEN NONE IS AUTHORED, matching studio-select.mjs's boxOf exactly. A
      // board wrapper has no --h, and reading 0 here would make this driver compute a different
      // rectangle from the page's and call the disagreement a pass or a fail at random.
      h: (Number.isFinite(parseFloat(n.style.getPropertyValue("--h")))
        ? parseFloat(n.style.getPropertyValue("--h")) : n.offsetHeight) || 0,
    })));
  // JUST THE PLACES, for the two rows that compare an arrangement across a state change. slotsNow
  // reports the MEASURED height for a node with no authored one (studio-select.mjs's boxOf rule,
  // mirrored so the marquee expectations agree with the page) — and a compile legitimately changes
  // that height, so a whole-record identity would call a correct "every member back at its origin"
  // a failure. The claim is POSITION; this is the claim.
  const places = (list) => JSON.stringify(list.map((v) => [v.id, v.x, v.y]));
  const chosen = async (p) => (await p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]")]
      .map((n) => n.getAttribute("data-stx-id")))).sort();
  const picked = (p) => p.locator(`${VIEWPORT} .stx-slot.is-picked`).count();

  // A CELL SHORTHAND → A CLIENT POINT (#302). There are no tracks to measure any more, and there
  // is no longer any need to: a position is written on the node, so the conversion is the stage's
  // OWN rect plus the point, scaled. Anchored on the stage rather than on two reference slots —
  // the old helper interpolated between (1,1) and (2,1) because a cell's client position could
  // only be found by looking at a cell, and it threw on this board the moment the rank layout
  // stopped guaranteeing a second occupant in row 1.
  //
  // THE EXACT INVERSE OF studio-select.mjs's pointOnStage, deliberately: the SCROLLER's rect plus
  // its scroll offsets, divided by the scale. The stage's own rect looks like the simpler anchor
  // and is wrong by the scroller's 1px border — which sounds ignorable and is not. A block with no
  // authored height is a ZERO-HEIGHT POINT to idsInRange (studio-select.mjs's stated rule: "a node
  // with no declared size is a point"), so every one of these blocks sits AT y = 0, and a marquee
  // whose top edge came back as 1 instead of 0 missed all four. Measured, not reasoned about.
  //
  // THE POINT IS AN ORIGIN, NOT A CENTRE, and that is the call this pass needs: every consumer
  // below is a MARQUEE CORNER, and the expected id set is computed from marqueeRange over the very
  // same at() origins. Corners that agreed with the range only approximately would make every
  // identity row a coincidence.
  // A CELL SHORTHAND -> A CLIENT POINT. The cell numbers stay because every fixture below is
  // written in them and they read as "five pitches across, three down"; the conversion is
  // clientPoint's, shared with layersPass, and the ORIGIN rather than the centre — every consumer
  // here is a MARQUEE CORNER, and the expected id set is computed from marqueeRange over the very
  // same at() origins, so corners that agreed only approximately would make every identity row a
  // coincidence.
  const cell = (p, col, row) => clientPoint(p, at(col, row).x, at(col, row).y);

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
  // marqueeRange takes two POINTS on the stage now, not two cells — and the two corners are the
  // same at() origins cell() converts, so the drag and the expectation describe one rectangle.
  const RANGE = marqueeRange(at(1, 1), at(2, 2));
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
  // ROWS 3-4 rather than 2-3 (#302). idsInRange is an OVERLAP test now, not a containment one, so
  // a rectangle starting one pitch below a node still catches it: the committed board's blocks are
  // ~83px tall but a node's declared box is NODE_H, and row 2's rectangle touches row 1's boxes.
  // The emptiness is asserted from the live arrangement either way, so a wrong pair fails loudly
  // here rather than making the sentence below about the wrong event.
  const emptyA = { col: 1, row: 3 };
  const emptyB = { col: 2, row: 4 };
  t("#217 · the empty-marquee fixture really is empty — otherwise the sentence below would be about the wrong event",
    idsInRange(grid1, marqueeRange(at(emptyA.col, emptyA.row), at(emptyB.col, emptyB.row))).length === 0,
    JSON.stringify(grid1));
  await countLive(p1);
  await shiftDrag(p1, await cell(p1, emptyA.col, emptyA.row), await cell(p1, emptyB.col, emptyB.row));
  const said1b = await liveSeen(p1);
  t("#217 · a marquee over empty canvas says \"Nothing to select.\", not \"Selection cleared.\" — it never had a selection to clear",
    said1b.n === 1 && said1b.last === "Nothing to select." && (await chosen(p1)).length === 0,
    JSON.stringify(said1b));
  const afterMarquee = await strayStyles(p1, "[data-studio-canvas] .stx-stage, [data-studio-canvas] .stx-scroll, [data-studio-canvas] .stx-slot, [data-studio-canvas] .stx-guide, [data-studio-canvas] .stx-menu");
  t("#217 · …and every style attribute on the canvas still carries ONLY a position or scale property after a marquee",
    afterMarquee.length === 0, afterMarquee.join(", "));
  await p1.close();

  // --- 2 · AC #1's whole claim: the KEYBOARD path selects the SAME SET ----------------------------
  const p2 = await openSettled();
  const grid2 = await slotsNow(p2);
  const anchorId = grid2.find((s) => s.x === at(1, 1).x && s.y === at(1, 1).y).id;
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
  // THE CLAIM IS THE SHAPE, AND IT IS NOW THE ONLY THING NAMEABLE (#302). The old row could say
  // "+1 row" because a drop snapped to a track; a free drop lands on the float the pointer
  // released at, minus the grab offset. What "the selection keeps its shape" means is that EVERY
  // member moved by the SAME delta — which is exactly what a per-member recompute would break, and
  // is a stronger statement than the old one, since it holds over N members rather than over one
  // axis. The non-zero conjunct is what stops a drag that did nothing passing it vacuously.
  const delta = (id) => {
    const was = grid3.find((x) => x.id === id);
    const now = grid3b.find((x) => x.id === id);
    return [now.x - was.x, now.y - was.y];
  };
  const d0 = delta(members[0]);
  const landed = (d0[0] !== 0 || d0[1] !== 0)
    && members.every((id) => JSON.stringify(delta(id)) === JSON.stringify(d0));
  t("#217/AC2 · dragging ONE selected member lands EVERY member at the SAME offset — the selection keeps its shape",
    landed, `deltas ${JSON.stringify(members.map(delta))}`);
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
      const was = grid3.find((x) => x.id === id);
      const now = grid3c.find((x) => x.id === id);
      return now.x === was.x && now.y === was.y;
    }), JSON.stringify(grid3c.filter((x) => members.includes(x.id))));
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
  // ONE ArrowDown is ONE NUDGE for a group exactly as it is for a single node (#302) — one
  // resolver, which is the whole reason the two keyboard paths collapsed into one.
  t("#217/AC2 · the KEYBOARD group move (Enter, ArrowDown, Enter) lands every member one nudge down, at the same offset",
    members4.every((id) => {
      const was = grid4.find((x) => x.id === id);
      const now = grid4b.find((x) => x.id === id);
      return now.x === was.x && now.y === was.y + NUDGE_STEP;
    }), `${JSON.stringify(grid4b.filter((x) => members4.includes(x.id)))} (one nudge is ${NUDGE_STEP}px)`);
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
  // T16's NEW VOCABULARY (#302): a free position is not the reader's coordinate the way a cell was,
  // so the pick-up names the anchor in pixels and the step names BOTH how far it moved and where
  // that left the anchor. Both shapes asserted whole rather than by substring.
  t("#217 · the group PICK-UP sentence names the count and the instructions, not one component (R8)",
    new RegExp(`^${members4.length} components picked up at -?\\d+, -?\\d+\\. Arrow keys to move, Enter to drop, Escape to cancel\\.$`)
      .test((pickupSaid || "").trim()), JSON.stringify(pickupSaid));
  t("#217 · …and the group ARROW STEP sentence names the count, the distance and the anchor it reached",
    new RegExp(`^${members4.length} components moved by 0, ${NUDGE_STEP}, anchor at -?\\d+, -?\\d+\\.$`).test((stepSaid || "").trim()),
    JSON.stringify(stepSaid));
  t("#217/AC2 · one Undo restores the whole keyboard group move too",
    await (async () => {
      await btn(p4, "Undo").click();
      await p4.waitForTimeout(260);
      const g = await slotsNow(p4);
      return members4.every((id) => {
        const was = grid4.find((x) => x.id === id);
        const now = g.find((x) => x.id === id);
        return now.x === was.x && now.y === was.y;
      });
    })());
  await p4.close();

  // --- 5 · AC #3: a guide is a claim about an alignment that EXISTS -------------------------------
  const p5 = await openSettled();
  // The honesty predicate, written ONCE and used twice: for the real guides, and for the mutation
  // that decides whether it can fail at all.
  const guidesHonest = (p, minSize) => p.evaluate((MIN) => {
    const num = (n, k) => parseFloat(n.style.getPropertyValue(k));
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    // A GUIDE IS A POSITIONED NODE NOW, like everything else on this stage, and its AXIS is read
    // off its SHAPE: setGuide writes a MIN_SIZE-wide full-height box for a vertical line and the
    // reverse for a horizontal one, so `x` is the claim when it is thin and `y` when it is flat.
    const guides = [...stage.querySelectorAll(".stx-guide")].map((n) => {
      const vertical = num(n, "--w") === MIN;
      return { x: vertical ? num(n, "--x") : null, y: vertical ? null : num(n, "--y") };
    });
    // BOTH SETS ARE THE MOVABLE FAMILIES SINCE #219, not .stx-slot alone. studio-verbs.mjs's
    // renderGuides reads the same widened set, and it is RIGHT to: a device frame is on the grid, so
    // a block sharing its column really is aligned with something. Left narrow, this predicate calls
    // an honest guide a lie — which is how it failed the moment the frames landed.
    const peers = [...stage.querySelectorAll(".stx-slot:not(.is-picked), .stx-frame:not(.is-picked)")]
      .map((n) => ({ x: num(n, "--x"), y: num(n, "--y") }));
    const carried = [...stage.querySelectorAll(".stx-slot.is-picked, .stx-frame.is-picked")]
      .map((n) => ({ x: num(n, "--x"), y: num(n, "--y") }));
    const honest = guides.every((g) => (g.x != null
      ? peers.some((v) => v.x === g.x) && carried.some((v) => v.x === g.x)
      : peers.some((v) => v.y === g.y) && carried.some((v) => v.y === g.y)));
    return { guides, honest, peers, carried };
  }, minSize);
  const grid5 = await slotsNow(p5);
  await p5.locator(`.stx-slot[data-stx-id="${grid5[0].id}"] .stx-grab`).focus();
  await p5.keyboard.press("Enter");
  await p5.waitForTimeout(120);
  const gs = await guidesHonest(p5, MIN_SIZE);
  t("#217/AC3 · every alignment guide drawn mid-carry sits on a column or row where a NON-CARRIED peer really is",
    gs.honest, JSON.stringify(gs));
  t("#217/AC3 · …and the carry really did draw at least one — a guide check over zero guides is vacuous",
    gs.guides.length >= 1, JSON.stringify(gs.guides));
  // THE MUTATION THAT DECIDES WHETHER THAT CHECK CAN FAIL AT ALL (memory check-that-cannot-fail).
  // A guide is forced onto a PROVABLY EMPTY column and the same predicate must go red.
  // A PROVABLY EMPTY x, SEARCHED RATHER THAN NAMED. There is no column cap to iterate any more, so
  // the pitch is walked across the stage until an x no node sits on is found — which is the same
  // claim the retired column-cap loop made, over the bound that replaced it.
  const emptyX5 = (() => {
    for (let x = 0; x + NODE_W <= STAGE_W; x += NODE_W + NODE_GAP) if (!grid5.some((v) => v.x === x)) return x;
    return null;
  })();
  t("#217/AC3 · …and the mutation below has a provably empty column to use", emptyX5 !== null,
    JSON.stringify(grid5.map((v) => v.x)));
  await p5.evaluate(([x, min]) => {
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    const fake = document.createElement("div");
    fake.className = "stx-guide";
    // The MUTATION writes the same shape setGuide does — thin and tall — so guidesHonest reads it
    // as a vertical guide rather than skipping it for the wrong reason.
    fake.style.setProperty("--x", `${x}px`);
    fake.style.setProperty("--w", `${min}px`);
    fake.setAttribute("data-stx-mutation", "");
    stage.insertBefore(fake, stage.firstChild);
  }, [emptyX5, MIN_SIZE]);
  const mutated = await guidesHonest(p5, MIN_SIZE);
  t("#217/AC3 · THE MUTATION — a guide forced onto a provably empty column makes the honesty check go RED, so the green above is a result rather than a shape",
    mutated.honest === false, `empty x ${emptyX5}: ${JSON.stringify(mutated)}`);
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
  // THE FLIP IS REACHED BY NARROWING THE NODE, not by naming a last column (#302). menuAnchor
  // flips when `x + MENU_W > STAGE_W`, and setPos clamps a node to `STAGE_W - w` — so a node at
  // the full NODE_W can only ever reach x = STAGE_W - NODE_W, where MENU_W (= NODE_W) lands
  // exactly ON the edge and the flip is unreachable. A MIN_SIZE-wide node clamps further right and
  // is genuinely in the flip zone. The `w` is passed on the move because the consumer keeps the
  // node's current width otherwise.
  const openAt = async (x, { w = NODE_W } = {}) => {
    await inject(p7, { type: "ui.move", source: "agent", target: { id: edgeId }, params: { x, y: 0, w } });
    await p7.waitForTimeout(150);
    return p7.evaluate(async (id) => {
      const m = await import("/system/studio-select.mjs");
      const sel = m.getSelect();
      sel.closeMenu({ restoreFocus: false });
      const node = document.querySelector(`.stx-slot[data-stx-id="${id}"]`);
      sel.openMenu(node, node);
      const menu = document.querySelector("[data-studio-canvas] .stx-menu");
      if (!menu) return null;
      const stage = document.querySelector("[data-studio-canvas] .stx-stage");
      const mr = menu.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      return {
        x: menu.style.getPropertyValue("--x"),
        nodeX: node.style.getPropertyValue("--x"),
        right: Math.round(mr.right), left: Math.round(mr.left), width: Math.round(mr.width),
        nodeLeft: Math.round(nr.left), nodeRight: Math.round(nr.right),
        stageLeft: Math.round(sr.left), stageRight: Math.round(sr.right),
      };
    }, edgeId);
  };
  const FAR_X = STAGE_W - MIN_SIZE; // setPos's own clamp for a MIN_SIZE-wide node — the far edge
  const flipped = await openAt(FAR_X, { w: MIN_SIZE });
  // ONE CORRECTION, IN THE COORDINATE (owner's call, 2026-09-20), and these rows moved with it.
  // They used to assert `data-flip-x` plus a `translate: -100% 0` rule, and recorded as a known gap
  // that the menu was ALSO clamped by setPos — two corrections, so a far-edge menu rendered up to
  // MENU_W away from the component it belongs to. menuAnchor returns the corrected point now, the
  // sheet has no rule and the attribute is gone, so what is asserted is where the menu IS.
  //
  // THE CLAIM: a menu that does not fit to the right opens LEFTWARD FROM ITS INVOKER, so its RIGHT
  // edge lands on the invoker's LEFT edge — adjacent to the thing it acts on, which is the whole
  // point of the change — and the whole box stays on the stage.
  t(`#217 · R5 — a menu on a FAR-EDGE (x ${FAR_X}) component opens LEFTWARD FROM ITS INVOKER: its right edge lands on the component's left edge`,
    Boolean(flipped) && Math.abs(flipped.right - flipped.nodeLeft) <= 1
    && flipped.left >= flipped.stageLeft - 1 && flipped.right <= flipped.stageRight + 1,
    JSON.stringify(flipped));
  // THE DISCRIMINATOR that decides whether the row above can fail, named rather than assumed. If
  // the flip regressed to clamp-only — the shape this replaced — setPos alone would put the menu at
  // STAGE_W - MENU_W. The flipped answer is FAR_X - MENU_W, which is MIN_SIZE short of that, so the
  // two are distinguishable and a regression moves the box by exactly MIN_SIZE. Group 22 pins the
  // same fact purely and from both directions; this is its running-page half.
  t("#217 · R5 · …and NOT at setPos's own clamp, which is where a regression to clamp-only would leave it",
    flipped.x === `${FAR_X - NODE_W}px` && flipped.x !== `${STAGE_W - NODE_W}px`,
    `menu --x ${flipped.x}, node --x ${flipped.nodeX}, clamp-only would be ${STAGE_W - NODE_W}px, MIN_SIZE is ${MIN_SIZE}`);
  // …and it is CONDITIONAL, not always on — the other side of an off-by-one that group 22 pins purely.
  const INTERIOR_X = at(3, 1).x;
  const interior = await openAt(INTERIOR_X);
  t("#217 · …while an INTERIOR component's menu opens RIGHTWARD from the same edge, so the flip is proven conditional rather than always on",
    interior.x === `${INTERIOR_X}px` && Math.abs(interior.left - interior.nodeLeft) <= 1,
    JSON.stringify(interior));
  // The two directions stated as one fact, because each row alone would pass on a menu that always
  // opened the same way: the interior menu grows right from its invoker, the far-edge one grows left.
  t("#217 · …and the two open in OPPOSITE directions from their invokers — the pair, not either row alone, is what says the flip fires exactly where it should",
    interior.left >= interior.nodeLeft - 1 && flipped.right <= flipped.nodeLeft + 1,
    `interior left ${interior.left} vs node ${interior.nodeLeft}; far-edge right ${flipped.right} vs node ${flipped.nodeLeft}`);
  // R7: the menu is anchored to a CELL, so a pan leaves it detached from the block it belongs to.
  // Scrolled VERTICALLY — the horizontal axis does not scroll here at all (see note 1 above), so a
  // scrollLeft nudge would fire no scroll event and this row would pass for the wrong reason.
  await p7.evaluate(() => { document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop += 120; });
  await p7.waitForTimeout(300);
  t("#217 · R7 — scrolling the canvas CLOSES an open menu, which is anchored to a place and would otherwise float over an unrelated component",
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
    places(after8) === places(before8), `${places(after8)} vs ${places(before8)}`);
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
  // ROW 2, not rows 3-4: #219's device frames hold those cells, and an <iframe> swallows the press —
  // so the drag would start INSIDE the frame document, take focus with it, and the Escape below would
  // never reach this page at all. The assertion is about a marquee not starting mid-carry, and it
  // needs a press the page actually receives to assert that.
  await shiftDrag(p8, await cell(p8, 1, 2), await cell(p8, 2, 2));
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
  // ONE PITCH DOWN. Nothing blocks a free move any more (D-d), so the old "an occupied cell is not
  // enterable" constraint on this fixture is gone with it — what the distance has to be is far
  // enough that a stale frame is measurable, and one pitch is that.
  const target9 = await cell(p9, 1, 2);
  await dragHandle(p9, members9[0], target9, { quick: true });
  await p9.waitForTimeout(300);
  const grid9b = await slotsNow(p9);
  // THE RELEASE POINT IS THE CLAIM, which is exactly what the bug breaks: a stale rAF frame lands
  // the group one frame's travel short, so the node the reader was dragging does not end up under
  // their pointer. Asserted as the hit-test property (±2px, journey()'s reason: a free drop lands
  // on a float and the painted box is rounded to device pixels), plus the group's shape held.
  const box9 = await p9.evaluate((i) => {
    const r = document.querySelector(`.stx-slot[data-stx-id="${i}"]`).getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }, members9[0]);
  const d9 = (id) => {
    const was = grid9.find((x) => x.id === id);
    const now = grid9b.find((x) => x.id === id);
    return [now.x - was.x, now.y - was.y];
  };
  t(`#217 · R3 — a QUICK group drag lands where the reader RELEASED, not one frame short, and every member keeps its offset (${engineName}; webkit is the engine this reproduces on)`,
    target9.x >= box9.left - 2 && target9.x <= box9.right + 2
      && target9.y >= box9.top - 2 && target9.y <= box9.bottom + 2
      && members9.every((id) => JSON.stringify(d9(id)) === JSON.stringify(d9(members9[0]))),
    `released at ${Math.round(target9.x)},${Math.round(target9.y)} vs ${JSON.stringify(box9)}; deltas ${JSON.stringify(members9.map(d9))}`);
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
    (await picked(p10)) === 0 && places(await slotsNow(p10)) === places(before10),
    `picked=${await picked(p10)} ${places(await slotsNow(p10))} vs ${places(before10)}`);
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
  await settleWait(pb, 30000);
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
  const dR = (id) => {
    const was = gridR.find((x) => x.id === id);
    const now = gridR2.find((x) => x.id === id);
    return [now.x - was.x, now.y - was.y];
  };
  t("#217/AC6 · …the group move still COMPLETES and reaches the identical end state",
    (dR(membersR[0])[0] !== 0 || dR(membersR[0])[1] !== 0)
      && membersR.every((id) => JSON.stringify(dR(id)) === JSON.stringify(dR(membersR[0]))),
    `deltas ${JSON.stringify(membersR.map(dR))}`);
  await btn(pr, "Undo").click();
  await pr.waitForTimeout(240);
  t("#217/AC6 · …one Undo still restores every member",
    places(await slotsNow(pr)) === places(gridR), `${places(await slotsNow(pr))} vs ${places(gridR)}`);
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
  // THE CLAIM CHANGED WITH THE SUBSTRATE (#302) and is worth stating rather than quietly dropping.
  // It used to be that a compiled stage GREW past .stx-scroll's box and the discrete table had no
  // level small enough, so fit() floored at 0.5 and its sentence had to name the level reached
  // rather than promise everything was in view. The stage is a FIXED STAGE_W × STAGE_H box now —
  // compiling changes what the nodes hold, never how big the canvas is — so there is no floor to
  // reach on this page and fit lands on the ratio, compiled or not.
  //
  // The row is KEPT rather than deleted because the property it really guards survived: fit's
  // sentence names the level it REACHED. Asserted here on a compiled page, where the at-rest
  // block above cannot reach, and computed from the measured box rather than a literal.
  const fctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const pf = await openSettled(fctx, "select fit-compiled");
  await pf.locator("[data-studio-compile] button").filter({ hasText: /^Compile/ }).first().click();
  await pf.waitForSelector('[data-compile-state="rendered"]', { timeout: 30000 });
  await btn(pf, "Fit").click();
  await pf.waitForTimeout(200);
  const fit = await pf.evaluate(() => {
    const vp = document.querySelector("[data-studio-canvas]");
    const scroll = vp.querySelector(".stx-scroll");
    return {
      scale: parseFloat(vp.style.getPropertyValue("--stx-scale")),
      clientW: scroll.clientWidth,
      clientH: scroll.clientHeight,
      live: vp.querySelector(".stx-live").textContent.trim(),
    };
  });
  const fitRatio = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(fit.clientW / STAGE_W, fit.clientH / STAGE_H)));
  t("#217 · Fit on a COMPILED canvas still lands on the RATIO — the stage is a fixed box, so compiling changes what the nodes hold and never how far out the canvas has to go",
    Math.abs(fit.scale - fitRatio) < 1e-6,
    `${fit.scale} vs ${fitRatio} (stage ${STAGE_W}×${STAGE_H} in ${fit.clientW}×${fit.clientH})`);
  t("#217 · …and says the level it REACHED, never that everything is in view — the sentence fit() is careful about",
    fit.live === `Zoom ${Math.round(fitRatio * 100)} percent, fit to the canvas`, fit.live);
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
  // The dock case's narrow exemption, for its recorded reason and only on this page: assertion 6
  // wears saulera, whose pack @imports url("../fonts/fonts.css") — fonts/ is not committed, a
  // standing property of the hand-authored reference pack that every saulera surface shares (the
  // pixel gate wears it too, it just never watches the console). That line is the BROWSER reporting
  // the network, not the page reporting itself. Everything the page says still fails the run, which
  // is exactly what assertion 9 turns on.
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // …and #219 · the SAME exemption in the other two engines' words: /factory embeds the two
    // proto pages now, and their designed Worker fallback is reported as a refused CONNECTION by
    // chromium and webkit and as a blocked CROSS-ORIGIN request naming the Worker by firefox.
    if (/Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
    errors.push(`docs console: ${m.text()}`);
  });
  const docsMine = mainOnly(page); // #219: the device frames fetch artifacts of their own
  page.on("request", (r) => { if (docsMine(r)) requests.push(r.url()); });
  await page.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await page.waitForSelector('[data-studio-compile="ready"]', { timeout: 20000 });
  await settleWait(page, 30000);

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
      // The code panels PAINT on /components, read as computed display. #218 moved the [hidden]
      // rule out of components.html's page <style> and into system/catalog.css so it travels with
      // the renderer; /factory still declares an identical one of its own, so 6b above cannot see
      // the sheet's copy at all. This assertion is here rather than in tooling/catalog-journey.mjs
      // because the MOVE is this ticket's, not mount 1's.
      //
      // It is NOT a detector for the sheet's rule being DELETED, and the earlier version of this
      // comment claiming it was is what #218's mutation drill disproved: no rule in catalog.css
      // gives .cat-code a `display`, so the UA [hidden] rule already wins unaided on BOTH pages —
      // the deletion mutation stayed green here too. The rule's own block in system/catalog.css
      // ("WHAT IT IS AND IS NOT") states this at length; the honest summary is that it is defence in
      // depth, and that no gate in this repo catches its removal today.
      paintedCode: [...sec.querySelectorAll(".cat-code")].filter((n) => getComputedStyle(n).display !== "none").length,
      totalCode: sec.querySelectorAll(".cat-code").length,
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
  t("#218/6b · …and on /components — whose page <style> no longer declares it — the SHARED sheet's [hidden] rule still paints exactly one code panel of many",
    !!fromCatalog && fromCatalog.totalCode > 1 && fromCatalog.paintedCode === 1,
    `${fromCatalog && fromCatalog.paintedCode} of ${fromCatalog && fromCatalog.totalCode} painted`);
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
    ip.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`docs/inspect console: ${m.text()}`); });
    await ip.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await settleWait(ip, 30000);
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
    // THE MOUSE LEAVES FIRST, and that is inspect.mjs:301-329's own recorded lesson arriving in a
    // driver: destroying a HOVERED node delivers no pointer-exit event at all, so a second hover at
    // the SAME coordinates over a REBUILT node fires no mouseenter and the bubble never reopens —
    // a red for a page that is entirely correct. Moving away and back is what makes the second
    // hover a real pointer entry rather than a no-op.
    const hoverOpensBubble = async () => {
      await ip.mouse.move(4, 4);
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
    tp.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`docs/toggle console: ${m.text()}`); });
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
    const written = await tp.evaluate(() => ({ key: localStorage.getItem("factory-inspect"), mode: document.documentElement.dataset.inspectMode || null, url: location.href }));
    // A SETTLE BEFORE THE RELOAD, and it is about the BROWSER rather than the page. setInspect
    // writes the dataset and the localStorage key in one synchronous block, and both read back
    // immediately (`written`, below) — but reloading in the very next tick loses the key: the
    // storage commit has not reached the new document's partition yet, and the reloaded page
    // restores from an empty store. Measured on chromium: identical code passes with this wait and
    // fails 3/3 without it, with the key already absent at document_start. So this is a driver
    // wait, not a page defect, and removing it makes AC #5 red for a correct implementation.
    await tp.waitForTimeout(500);
    await tp.reload({ waitUntil: "load" });
    await tp.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
    const restored = await tp.evaluate(() => ({ key: localStorage.getItem("factory-inspect"), mode: document.documentElement.dataset.inspectMode || null }));
    t("#218/8 · …it persists across a reload",
      restored.mode === "on", `wrote ${JSON.stringify(written)} → read back ${JSON.stringify(restored)}`);
    await tp.locator("[data-inspect-toggle]").first().click();
    await tp.waitForFunction(() => !document.documentElement.dataset.inspectMode, null, { timeout: 5000 });
    await tp.waitForTimeout(500);   // the same storage-commit settle, for the removal this time
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
      // …and #219 · the SAME exemption in the other two engines' words: /factory embeds the two
      // proto pages now, and their designed Worker fallback is reported as a refused CONNECTION by
      // chromium and webkit and as a blocked CROSS-ORIGIN request naming the Worker by firefox.
      if (/Failed to load resource/.test(m.text()) || EXPECTED_NOISE.test(m.text())) return;
      pageNoise.push(`console: ${m.text()}`);
    });
    const rpMine = mainOnly(rp); // #219: fail it for THIS document, not for a device frame
    await rp.route(`**${SOURCES[0]}`, (route) => (rpMine(route.request())
      ? route.fulfill({ status: 500, body: "no" })
      : route.continue()));
    await rp.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await settleWait(rp, 30000);
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

// --- #219 · THE DEVICE FRAMES ------------------------------------------------------------------
// The two shipped prototypes on the /factory canvas, and the half build-checks group 24 structurally
// cannot be. That group gates the DESCRIPTORS — two files that exist, two footprints on the grid. It
// says so itself, and everything below is the list it names: that the frames RENDER, that their
// contents carry no nested chrome (which can only be asserted on the frame's own contentDocument),
// that the pack FOLLOWS a mid-visit dock swap, that pointer, keyboard and an injected agent action
// produce the SAME span, that a resize is undoable in the ONE history the moves live in, that the
// selection layer stays out of it, and that a redraft and a compile both leave the frames alone.
async function framesPass(browser, engineName, t, errors) {
  console.log(`\n[frames] #219 · the two prototypes as device frames on the canvas (${engineName})`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag, allowResourceErrors = false) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => {
      if (m.type() !== "error" || EXPECTED_NOISE.test(m.text())) return;
      // allowResourceErrors is the DOCK row's alone, and it is the standing narrow exemption #213's
      // dock case already carries: wearing saulera 404s that pack's own `@import
      // url("../fonts/fonts.css")`, because fonts/ is not committed — a property every saulera
      // surface shares. That line is the browser reporting the network, not the page reporting itself.
      if (allowResourceErrors && /Failed to load resource/.test(m.text())) return;
      errors.push(`${tag} console: ${m.text()}`);
    });
  };
  // THE HANDLE FIRST, THEN THE SETTLE. [data-studio-frames="ready"] fires at MOUNT and the frames are
  // placed there, so it resolves long before the replay finishes — but every assertion below is about
  // a canvas the run has finished authoring, and #209's own opener records why waiting for that
  // matters. The frames' CONTENT is waited for separately, per frame, because loading="lazy" makes
  // its timing an engine's business rather than a contract (studio-frames.mjs says so).
  const open = async (context = ctx, tag = "frames", allowResourceErrors = false) => {
    const p = await context.newPage();
    watch(p, tag, allowResourceErrors);
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await p.waitForSelector('[data-studio-frames="ready"]', { timeout: 20000 });
    await settleWait(p, 30000);
    // The canvas scrolled into view before any pointer row — selectPass's recorded lesson: on
    // /factory the studio sits well below the fold, so a raw mouse.move to a computed client
    // coordinate lands off-screen and the press never reaches the stage.
    await p.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    return p;
  };
  const frameState = (p) => p.evaluate((POS) => [...document.querySelectorAll("[data-studio-canvas] .stx-frame")].map((n) => ({
    key: n.getAttribute("data-stx-frame"),
    id: n.getAttribute("data-stx-id"),
    x: n.style.getPropertyValue("--x"), y: n.style.getPropertyValue("--y"),
    w: n.style.getPropertyValue("--w"), h: n.style.getPropertyValue("--h"),
    src: n.querySelector("iframe")?.getAttribute("src"),
    title: n.querySelector("iframe")?.getAttribute("title"),
    grab: n.querySelector(".stx-grab") ? !n.querySelector(".stx-grab").disabled : null,
    resize: n.querySelector(".stx-resize") ? !n.querySelector(".stx-resize").disabled : null,
    // BOTH NAMES, since a describedby-only projection is what let PR #267's H1 through: this driver
    // already read .stx-grab's aria-label twice (movePass), and simply did not read the new
    // control's — the repo's own "the check that cannot fail" shape. Read as the ATTRIBUTE rather
    // than through an accname API because that is what place() writes; the descriptor's `name` is
    // what the expectation below is derived from, exactly as the footprints are.
    grabLabel: n.querySelector(".stx-grab")?.getAttribute("aria-label"),
    resizeLabel: n.querySelector(".stx-resize")?.getAttribute("aria-label"),
    describedBy: n.querySelector(".stx-resize")?.getAttribute("aria-describedby"),
    // GATE B's per-frame half (#302). A frame DOES carry a style attribute now — four position
    // properties — so what is read is the STRAY set: anything else on it is named.
    stray: [...n.style].filter((k) => !POS.includes(k)),
  })), POSITION_PROPS);
  const live = (p) => p.evaluate(() => document.querySelector("[data-studio-canvas] .stx-live").textContent.trim());
  // #302: a footprint is a SIZE and a place is a POSITION, both in pixels — the span pair and the
  // cell pair are gone, and so is the resolution step that turned one into the other.
  const boxOfFrame = (p, key) => p.evaluate((k) => {
    const n = document.querySelector(`[data-stx-frame="${k}"]`);
    return { w: n?.style.getPropertyValue("--w"), h: n?.style.getPropertyValue("--h"),
      x: n?.style.getPropertyValue("--x"), y: n?.style.getPropertyValue("--y") };
  }, key);
  const idOf = (p, key) => p.evaluate((k) => document.querySelector(`[data-stx-frame="${k}"]`)?.getAttribute("data-stx-id"), key);
  const depth = (p) => p.evaluate(() => import("/system/studio-verbs.mjs").then((m) => m.getVerbs().history.depth()));
  // A frame's CONTENT, waited for rather than assumed: loading="lazy" is a hedge and nothing in the
  // shipped module depends on when it resolves, so the driver must not either.
  const loaded = (p, key) => p.waitForFunction((k) => {
    const f = document.querySelector(`[data-stx-frame="${k}"] iframe`);
    return Boolean(f?.contentDocument?.body?.dataset?.page || f?.contentDocument?.querySelector(".vd-plant-card, .fw-lane"));
  }, key, { timeout: 30000 });

  const p = await open();

  // --- 1 · they are there, and they are frames --------------------------------------------------
  const rest = await frameState(p);
  t(`#219 · the canvas holds exactly ${FRAMES.length} device frames, one per committed descriptor`,
    rest.length === FRAMES.length, JSON.stringify(rest.map((f) => f.key)));
  for (const want of FRAMES) {
    const got = rest.find((f) => f.key === want.id);
    t(`#219 · the ${want.id} frame is an <iframe> of the shipped page at its declared footprint`,
      Boolean(got) && got.src === want.src && got.title === want.title
      && got.x === `${want.x}px` && got.y === `${want.y}px`
      && got.w === `${want.w}px` && got.h === `${want.h}px`,
      JSON.stringify({ got, want: { x: want.x, y: want.y, w: want.w, h: want.h } }));
    t(`#219 · …with a stable id and BOTH handles armed, each describing itself through a resolving IDREF`,
      Boolean(got?.id) && got.grab === true && got.resize === true && got.describedBy === "stx-resize-help",
      JSON.stringify({ id: got?.id, grab: got?.grab, resize: got?.resize, describedBy: got?.describedBy }));
    // SC 4.1.2, and the two names asserted TOGETHER because they are one code path: place() writes
    // both from the same `label`, so a regression that drops one is a regression that could drop
    // either. Derived from the descriptor's own `name` — a typed string here would pass against a
    // frame that had silently been re-labelled.
    t(`#219 · …and BOTH handles carry an accessible name naming the frame (SC 4.1.2 Name, Role, Value)`,
      got?.grabLabel === `Move ${want.name}` && got?.resizeLabel === `Resize ${want.name}`,
      JSON.stringify({ grabLabel: got?.grabLabel, resizeLabel: got?.resizeLabel, want: want.name }));
  }
  t("#219 · #stx-resize-help exists, so every .stx-resize's aria-describedby resolves to real text",
    (await p.locator("#stx-resize-help").count()) === 1
    && (await p.locator("#stx-resize-help").textContent() || "").includes("Escape to cancel"));
  t("#219 · no `style` attribute on any frame — geometry is attributes, on the running page",
    rest.every((f) => !f.styled), JSON.stringify(rest.map((f) => f.styled)));

  // --- 2 · NO NESTED CHROME, asserted on the frame's own contentDocument (AC #2) -----------------
  // THE ASSERTION THE PIXEL GATE STRUCTURALLY CANNOT MAKE, and the one that catches a proto page
  // dropping its `window.self === window.top` guard — a regression whose only other symptom is a
  // second appearance dock appearing inside a box the gate masks.
  for (const want of FRAMES) {
    await loaded(p, want.id);
    const inside = await p.evaluate((k) => {
      const d = document.querySelector(`[data-stx-frame="${k}"] iframe`).contentDocument;
      return {
        page: d.body?.dataset?.page ?? null,
        dock: d.querySelectorAll(".dock, [data-dock]").length,
        inspect: d.querySelectorAll("[data-inspect-toggle]").length,
        // THE ⌘K PALETTE IS DELIBERATELY MOUNTED INSIDE AN EMBED and is not a defect —
        // proto/verdant.html:191-202 records the call in its own words: "A reader who deliberately
        // drives the ⌘K palette inside the frame still gets the layer — the rule is about at-rest
        // chrome, not consent." So what AC #2 forbids here is at-rest CHROME: a VISIBLE ⌘K hint or an
        // open dialog. The keyboard layer behind them is asserted PRESENT below, not absent.
        paletteChrome: d.querySelectorAll("[data-palette-open]:not([hidden]), dialog[open]").length,
        paletteLayer: d.querySelectorAll("[data-palette], .cmdk, dialog").length,
        deviceFrame: d.querySelectorAll(".proto-resize, [data-device-frame]").length,
        busToggles: d.querySelectorAll("[data-bus-toggles]").length,
        rendered: d.querySelectorAll(".vd-plant-card, .fw-lane").length,
      };
    }, want.id);
    t(`#219 · AC #2 · the ${want.id} frame really loaded the proto page (or the absences below prove nothing)`,
      inside.page !== null && inside.rendered > 0, JSON.stringify(inside));
    t(`#219 · AC #2 · …and carries NO nested dock, inspect toggle, standalone device frame or at-rest ⌘K chrome`,
      inside.dock === 0 && inside.inspect === 0 && inside.deviceFrame === 0 && inside.paletteChrome === 0,
      JSON.stringify(inside));
    t(`#219 · AC #2 · …while the ⌘K LAYER is still there, which is the proto pages' own recorded call rather than a gap`,
      inside.paletteLayer > 0, JSON.stringify(inside));
  }

  // --- 3 · the pack FOLLOWS a mid-visit dock swap (AC #1) ----------------------------------------
  // A fresh context, load-bearing for the reason #213's dock case records: pack-boot restores a
  // persisted pack pre-paint, so this must start neutral and the saulera choice must die with the
  // context rather than skin every later page.
  {
    const dctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const dp = await open(dctx, "frames/dock", true);
    await loaded(dp, "verdant");
    const before = await dp.evaluate(() => document.querySelector('[data-stx-frame="verdant"] iframe')
      .contentDocument.querySelector('link[rel="stylesheet"][href*="/system/tokens."]:not([href*="contract"])')
      ?.getAttribute("href"));
    await dp.evaluate(() => { location.hash = "appearance"; });
    await dp.waitForTimeout(250);
    await dp.locator('label[for="dock-pack-saulera"]').click();
    await dp.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
      .some((l) => /\/system\/tokens\.saulera\.css$/.test(l.getAttribute("href") || "")), null, { timeout: 10000 });
    await dp.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const after = await dp.waitForFunction(() => {
      const h = document.querySelector('[data-stx-frame="verdant"] iframe')
        .contentDocument?.querySelector('link[rel="stylesheet"][href*="/system/tokens."]:not([href*="contract"])')
        ?.getAttribute("href");
      return /saulera/.test(h || "") ? h : false;
    }, null, { timeout: 10000 }).then((h) => h.jsonValue()).catch(() => null);
    t("#219 · AC #1 · the frame wore the site's pack before the swap",
      /neutral/.test(before || ""), String(before));
    t("#219 · AC #1 · …and the dock's mid-visit swap re-points the frame's OWN pack line to saulera",
      /saulera/.test(after || ""), String(after));
    // The discriminator is canvas-scoped (#213's precedent): a dock verb is chrome, not canvas.
    const took = await dp.evaluate(() => import("/system/replay-driver.mjs")
      .then((m) => m.getReplay()?.tookOver ?? null));
    t("#219 · …and switching the dock is still NOT a canvas take-over", took === false, String(took));
    await dctx.close();
  }

  // --- 4 · THREE-SOURCE RESIZE PARITY (AC #3) ---------------------------------------------------
  // Pointer, keyboard and an injected source:"agent" action, compared on the RESULTING --w / --h
  // rather than on "an action was emitted" — which would pass with no consumer at all. The agent leg
  // runs on a FRESH page with no gesture first, because that freshness is the whole discriminator:
  // a mover that applied directly and merely emitted would pass the other two (#205's recorded rule).
  const TARGET = "verdant";
  // DERIVED FROM THE DESCRIPTOR, never typed: one NODE PITCH taller than Verdant ships (#302 —
  // a footprint is pixels, and the pointer leg drags by a pitch so the three legs can agree). It
  // grows DOWNWARD — Fieldwork sits directly beside it — which is why every leg steps the height.
  const TARGET_FRAME = FRAMES.find((f) => f.id === TARGET);
  const PITCH = NODE_H + NODE_GAP;
  const WANT = { w: String(TARGET_FRAME.w), h: String(TARGET_FRAME.h + PITCH) };
  {
    const pp = await open(ctx, "frames/pointer");
    const before = await depth(pp);
    // THE SCROLLER PUT AT A KNOWN PLACE, then the drag delta MEASURED from the resolved grid —
    // selectPass's own discipline, and not a nicety: a typed 170px is a chromium layout constant, and
    // on firefox the same drag crossed no row boundary at all, so the resize silently did nothing and
    // the row read as a bug in the module rather than in the fixture.
    await pp.evaluate(() => document.querySelector("[data-studio-canvas] .stx-scroll").scrollIntoView({ block: "start" }));
    await pp.waitForTimeout(300);
    // THE DELTA IS THE IMPORTED PITCH. It came off the resolved grid rows because a resize had to
    // cross a track boundary to count; a free resize takes the reader's own request to the pixel,
    // so the drag distance IS the expected growth and both sides read the same constant.
    const pitch = PITCH;
    const h = pp.locator(`[data-stx-frame="${TARGET}"] .stx-resize`);
    await h.scrollIntoViewIfNeeded();
    // AND THEN WAIT FOR IT, for scrollSettled's own reason and after paying for it twice. BOTH
    // scrolls above are smooth on the window (`html { scroll-behavior: smooth }`), and the fixed
    // 300 ms is not long enough — probed at 387 of an eventual 395 px at exactly that mark. A
    // resize converts the pointer through the same live rect a move does, so the residual lands in
    // the frame's HEIGHT: observed on firefox at 454.32 against a WANT of 452, one third of a pixel
    // outside the ±2 tolerance, with the WIDTH exactly right because a window scroll has no x.
    await scrollSettled(pp);
    const b = await h.boundingBox();
    const said = [];
    await pp.evaluate(() => {
      window.__said = [];
      const region = document.querySelector("[data-studio-canvas] .stx-live");
      new MutationObserver(() => window.__said.push(region.textContent.trim())).observe(region, { childList: true, characterData: true, subtree: true });
    });
    await pp.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pp.mouse.down();
    await pp.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + pitch, { steps: 12 });
    await pp.mouse.up();
    await pp.waitForTimeout(250);
    said.push(...await pp.evaluate(() => window.__said));
    const byPointer = await boxOfFrame(pp, TARGET);
    // ±2px, journey()'s hit-test reason: a pointer resize lands on a float and the corner the
    // reader released at carries the grab offset, so the honest claim is the growth, not an exact
    // string. The keyboard and agent legs below ARE exact — integer arithmetic on an integer size.
    const grew = (got, want, tol = 2) => Math.abs(parseFloat(got.w) - Number(want.w)) <= tol
      && Math.abs(parseFloat(got.h) - Number(want.h)) <= tol;
    t("#219 · AC #3 · a POINTER drag of the corner resizes the frame by one pitch (±2px)",
      grew(byPointer, WANT), JSON.stringify({ byPointer, WANT }));
    t("#219 · AC #3 · …in exactly ONE history entry", (await depth(pp)) - before === 1,
      `Δ${(await depth(pp)) - before}`);
    // ANNOUNCEMENTS COUNTED EXACTLY AND PER PATH, because the two paths differ ON PURPOSE and the
    // formula is read off the implementation rather than guessed: a pointer resize announces ONCE, at
    // the drop. A naive once-per-gesture count applied to the keyboard path below would send the next
    // implementer to delete the per-press feedback, which is the wrong fix.
    t("#219 · AC #3 · …and announces exactly once, at the drop", said.length === 1, JSON.stringify(said));
    await pp.close();
  }
  {
    const kp = await open(ctx, "frames/keyboard");
    const before = await depth(kp);
    await kp.evaluate(() => {
      window.__said = [];
      const region = document.querySelector("[data-studio-canvas] .stx-live");
      new MutationObserver(() => window.__said.push(region.textContent.trim())).observe(region, { childList: true, characterData: true, subtree: true });
    });
    await kp.locator(`[data-stx-frame="${TARGET}"] .stx-resize`).focus();
    await kp.keyboard.press("Enter");
    await kp.keyboard.press("ArrowDown");
    await kp.keyboard.press("Enter");
    await kp.waitForTimeout(200);
    const said = await kp.evaluate(() => window.__said);
    const byKeyboard = await boxOfFrame(kp, TARGET);
    // ONE ArrowDown is ONE NUDGE on the resize path too (#302), so the keyboard leg reaches a
    // DIFFERENT size from the pointer leg's pitch — stated rather than forced into agreement,
    // because making them equal would mean typing a pointer distance the reader never dragged.
    const KB_WANT = { w: String(TARGET_FRAME.w), h: String(TARGET_FRAME.h + NUDGE_STEP) };
    t("#219 · AC #3 · the KEYBOARD path (Enter · arrows · Enter) grows it by exactly one nudge",
      byKeyboard.w === `${KB_WANT.w}px` && byKeyboard.h === `${KB_WANT.h}px`,
      JSON.stringify({ byKeyboard, KB_WANT }));
    t("#219 · AC #3 · …in exactly ONE history entry, so Undo undoes THE RESIZE and not its last column",
      (await depth(kp)) - before === 1, `Δ${(await depth(kp)) - before}`);
    // pick-up + one per arrow press + the drop = N + 2, the move path's own formula.
    t("#219 · AC #3 · …and announces the pick-up, EVERY arrow press and the drop — N + 2, never once",
      said.length === 3 && /ready to resize/.test(said[0])
      && said[1] === `${KB_WANT.w} by ${KB_WANT.h}.`
      && said[2] === `${TARGET_FRAME.name} resized to ${KB_WANT.w} by ${KB_WANT.h}.`,
      JSON.stringify(said));
    // THE "BLOCKED" ROW IS GONE, and this is what replaced it. Nothing blocks a free resize (D-d),
    // so studio-verbs.mjs deleted the sentence rather than translating it: a press at the stage
    // edge announces the same numbers twice, and that repetition is the feedback. Asserted as
    // exactly that, against the edge the stage still has, so the row still proves a press at a
    // bound is not silent — which is the property the old one was really for.
    await kp.locator(`[data-stx-frame="${TARGET}"] .stx-resize`).focus();
    await kp.keyboard.press("Enter");
    await kp.evaluate(() => { window.__said = []; });
    await kp.keyboard.press("End");   // the largest that fits — the frame is now at the stage edge
    await kp.waitForTimeout(80);
    await kp.keyboard.press("ArrowRight"); // …and there is nothing left to grow into
    await kp.waitForTimeout(80);
    const atEdge = await kp.evaluate(() => window.__said);
    await kp.keyboard.press("Escape");
    t("#219 · AC #3 · …and a press at the stage EDGE repeats the size rather than going silent — the sentence that replaced \"Blocked\"",
      atEdge.length === 2 && atEdge[0] === atEdge[1] && /^\d+ by \d+\.$/.test(atEdge[1]),
      JSON.stringify(atEdge));
    await kp.close();
  }
  {
    // THE AGENT LEG, on a fresh page with NO gesture first.
    const ap = await open(ctx, "frames/agent");
    const seen = await ap.evaluate(async ([id, want]) => {
      const { getVerbs } = await import("/system/studio-verbs.mjs");
      const types = [];
      getVerbs().bus.on("*", (a) => types.push(a.type));
      getVerbs().bus.emit({ type: "ui.resize", source: "agent", target: { id }, params: want });
      return types;
    }, [await idOf(ap, TARGET), { w: Number(WANT.w), h: Number(WANT.h) }]).catch(() => null);
    const byAgent = await boxOfFrame(ap, TARGET);
    t("#219 · AC #3 · an injected source:\"agent\" ui.resize reaches the SAME size on a FRESH page — the three sources are one consumer",
      byAgent.w === `${WANT.w}px` && byAgent.h === `${WANT.h}px`, JSON.stringify({ byAgent, WANT, seen }));
    // The two refusals the consumer owns, each CONTENT and never a throw.
    const refusals = await ap.evaluate(async () => {
      const { getVerbs } = await import("/system/studio-verbs.mjs");
      const region = document.querySelector("[data-studio-canvas] .stx-live");
      const out = {};
      const slot = document.querySelector("[data-studio-canvas] .stx-slot");
      const slotWas = slot.style.getPropertyValue("--w");
      getVerbs().bus.emit({ type: "ui.resize", source: "agent", target: { id: slot.getAttribute("data-stx-id") }, params: { w: 600, h: 600 } });
      out.notResizable = region.textContent.trim();
      // A SLOT'S GEOMETRY IS UNTOUCHED — read as its own width and the ABSENCE of a height, which
      // is what "the refusal wrote nothing" means now that every node carries position properties.
      out.slotUntouched = slot.style.getPropertyValue("--w") === slotWas && !slot.style.getPropertyValue("--h");
      getVerbs().bus.emit({ type: "ui.resize", source: "agent", target: { id: "nope" }, params: { w: 300, h: 300 } });
      out.unknown = region.textContent.trim();
      const f = document.querySelector('[data-stx-frame="verdant"]');
      getVerbs().bus.emit({ type: "ui.resize", source: "agent", target: { id: f.getAttribute("data-stx-id") }, params: { w: "abc", h: -9 } });
      out.clamped = [f.style.getPropertyValue("--w"), f.style.getPropertyValue("--h")];
      return out;
    });
    t("#219 · a ui.resize naming a BOARD WRAPPER is refused as not resizable, and writes no size at all",
      /is not resizable\.$/.test(refusals.notResizable) && refusals.slotUntouched, JSON.stringify(refusals));
    t("#219 · …a ui.resize naming nothing on the canvas is refused by id",
      /^Refused: no component "nope"/.test(refusals.unknown), refusals.unknown);
    // setPos's floor, which is the one definition of a size now: a non-finite number and a negative
    // one both land on MIN_SIZE rather than reaching a property as "NaNpx" or a negative length —
    // either of which voids the declaration silently and leaves the frame at whatever it was.
    t("#219 · …and hostile params are CLAMPED to MIN_SIZE rather than reaching a property as NaN",
      refusals.clamped[0] === `${MIN_SIZE}px` && refusals.clamped[1] === `${MIN_SIZE}px`,
      JSON.stringify(refusals.clamped));
    await ap.close();
  }

  // --- 5 · Undo restores the SPAN, and the mixed sequence walks back through ONE history ---------
  {
    const up = await open(ctx, "frames/undo");
    const start = await boxOfFrame(up, TARGET);
    await up.locator(`[data-stx-frame="${TARGET}"] .stx-resize`).focus();
    await up.keyboard.press("Enter");
    await up.keyboard.press("ArrowDown");
    await up.keyboard.press("Enter");
    const resized = await boxOfFrame(up, TARGET);
    await up.locator('[data-stx-verb="undo"]').click();
    await up.waitForTimeout(200);
    const undone = await boxOfFrame(up, TARGET);
    const undoneSaid = await live(up);
    await up.locator('[data-stx-verb="redo"]').click();
    await up.waitForTimeout(200);
    const redone = await boxOfFrame(up, TARGET);
    t("#219 · AC #3 · Undo restores the size the resize changed",
      resized.h !== start.h && undone.h === start.h && undone.w === start.w,
      JSON.stringify({ start, resized, undone }));
    t("#219 · …announced as a SIZE, not as a place the frame never left",
      /at \d+ by \d+/.test(undoneSaid), undoneSaid);
    t("#219 · …and Redo returns it", redone.h === resized.h && redone.w === resized.w,
      JSON.stringify(redone));

    // THE MIXED SEQUENCE — the one a per-verb history would fail. Move, resize, move; then three
    // Undos, each walking back the step before it, in order.
    const grab = up.locator(`[data-stx-frame="${TARGET}"] .stx-grab`);
    await grab.focus();
    await up.keyboard.press("Enter"); await up.keyboard.press("ArrowDown"); await up.keyboard.press("Enter");
    const m1 = await boxOfFrame(up, TARGET);
    await up.locator(`[data-stx-frame="${TARGET}"] .stx-resize`).focus();
    await up.keyboard.press("Enter"); await up.keyboard.press("ArrowDown"); await up.keyboard.press("Enter");
    const r1 = await boxOfFrame(up, TARGET);
    await grab.focus();
    await up.keyboard.press("Enter"); await up.keyboard.press("ArrowDown"); await up.keyboard.press("Enter");
    const m2 = await boxOfFrame(up, TARGET);
    const moved = m1.y !== redone.y || m2.y !== m1.y;
    await up.locator('[data-stx-verb="undo"]').click(); await up.waitForTimeout(150);
    const back1 = await boxOfFrame(up, TARGET);
    await up.locator('[data-stx-verb="undo"]').click(); await up.waitForTimeout(150);
    const back2 = await boxOfFrame(up, TARGET);
    await up.locator('[data-stx-verb="undo"]').click(); await up.waitForTimeout(150);
    const back3 = await boxOfFrame(up, TARGET);
    t("#219 · the mixed sequence really moved AND resized (or the three Undos below prove nothing)",
      moved && r1.h !== m1.h, JSON.stringify({ redone, m1, r1, m2 }));
    t("#219 · AC #3 · three Undos walk back move · resize · move IN ORDER, through ONE history",
      JSON.stringify(back1) === JSON.stringify(r1)
      && JSON.stringify(back2) === JSON.stringify(m1)
      && JSON.stringify(back3) === JSON.stringify(redone),
      JSON.stringify({ back1, back2, back3, want: [r1, m1, redone] }));
    await up.close();
  }

  // --- 6 · the SELECTION line holds (D6) --------------------------------------------------------
  // The assertion that keeps a half-widened selection layer from shipping unnoticed: studio-verbs'
  // slots() is MOVABLE now, and studio-select's chosenNodes() is deliberately still .stx-slot.
  {
    const sp = await open(ctx, "frames/select");
    await sp.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await sp.waitForTimeout(300);
    const marked = await sp.evaluate(async () => {
      const scroll = document.querySelector("[data-studio-canvas] .stx-scroll");
      scroll.focus();
      const e = new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true, cancelable: true });
      scroll.dispatchEvent(e);
      await new Promise((r) => setTimeout(r, 150));
      return {
        slots: document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]").length,
        frames: document.querySelectorAll("[data-studio-canvas] .stx-frame[data-stx-selected]").length,
        allSlots: document.querySelectorAll("[data-studio-canvas] .stx-slot").length,
      };
    });
    t("#219 · D6 · ⌘/Ctrl+A selects every BOARD block…", marked.slots === marked.allSlots && marked.slots > 0,
      JSON.stringify(marked));
    t("#219 · D6 · …and leaves both device frames unselected — a frame moves and resizes on its own",
      marked.frames === 0, JSON.stringify(marked));
    await sp.close();
  }

  // --- 7 · a frame is MOVABLE by the same handle and the same verb -------------------------------
  {
    const mp = await open(ctx, "frames/move");
    const from = await boxOfFrame(mp, TARGET);
    await mp.locator(`[data-stx-frame="${TARGET}"] .stx-grab`).focus();
    await mp.keyboard.press("Enter");
    await mp.keyboard.press("ArrowRight");
    await mp.keyboard.press("Enter");
    const to = await boxOfFrame(mp, TARGET);
    t("#219 · a frame moves by the SAME grab handle and the SAME ui.move verb everything else uses — one nudge right, its size untouched",
      parseFloat(to.x) === parseFloat(from.x) + NUDGE_STEP && to.y === from.y
      && to.w === from.w && to.h === from.h,
      JSON.stringify({ from, to, nudge: NUDGE_STEP }));
    // THE FOOTPRINT ROW IS RETIRED, with its reason. It asserted that a step landed PAST the other
    // frame's whole rectangle rather than inside it — the occupancy claim, and the one thing a
    // top-left-only occupancy set would have got wrong. Nothing blocks a free move (D-d), so a
    // frame CAN now be nudged over its neighbour and that is correct behaviour; keeping the row
    // would be asserting the opposite of the shipped decision. What it really guarded — that a
    // frame moves as a whole, carrying its size — is the row above's `to.w === from.w` conjunct,
    // which the old one never made.
    const other = FRAMES.find((f) => f.id !== TARGET);
    t("#219 · …and the OTHER frame did not move with it — a move names one subject, even between two frames on one stage",
      JSON.stringify(await boxOfFrame(mp, other.id))
        === JSON.stringify({ w: `${other.w}px`, h: `${other.h}px`, x: `${other.x}px`, y: `${other.y}px` }),
      JSON.stringify({ got: await boxOfFrame(mp, other.id), want: other }));
    await mp.close();
  }

  // --- 8 · a redraft and a compile both leave the frames alone -----------------------------------
  {
    const cp = await open(ctx, "frames/compile");
    const beforeSlots = await cp.evaluate(() => document.querySelectorAll("[data-studio-canvas] .stx-slot").length);
    await cp.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
    await cp.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "rendered",
      null, { timeout: 20000 });
    const compiled = await cp.evaluate(() => ({
      screens: document.querySelectorAll(".stf-screen").length,
      frames: document.querySelectorAll("[data-studio-canvas] .stx-frame").length,
      slots: document.querySelectorAll("[data-studio-canvas] .stx-slot").length,
      refusal: document.querySelectorAll(".stu-compile-refusal").length,
    }));
    t("#219 · Compile still swaps every board wrapper to a screen with the frames present",
      compiled.screens === beforeSlots && compiled.slots === beforeSlots && compiled.refusal === 0,
      JSON.stringify(compiled));
    t("#219 · …and the frames are untouched by it — they are not board wrappers",
      compiled.frames === FRAMES.length, JSON.stringify(compiled));
    // THE HEIGHT DOES NOT RIDE --stx-slot-h (D4): a depicted device that grew when a board compiled
    // would be a lie about the device. Measured, because the whole point is that CSS decides it.
    const heights = await cp.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-frame")]
      .map((n) => Math.round(n.getBoundingClientRect().height)));
    await cp.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
    await cp.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "blocks",
      null, { timeout: 20000 });
    const heightsBack = await cp.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-frame")]
      .map((n) => Math.round(n.getBoundingClientRect().height)));
    t("#219 · D4 · a frame is the SAME height compiled and uncompiled — the depicted device does not grow",
      JSON.stringify(heights) === JSON.stringify(heightsBack), JSON.stringify({ heights, heightsBack }));
    await cp.close();
  }
  {
    const rp = await open(ctx, "frames/redraft");
    const before = await rp.evaluate(() => document.querySelectorAll("[data-studio-canvas] .stx-slot").length);
    // The method band's first card, answered — #214's own redraft path.
    const card = rp.locator("[data-studio-method] input[type=radio]").first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await rp.waitForTimeout(600);
    const after = await rp.evaluate(() => ({
      slots: document.querySelectorAll("[data-studio-canvas] .stx-slot").length,
      frames: document.querySelectorAll("[data-studio-canvas] .stx-frame").length,
      keys: [...document.querySelectorAll("[data-studio-canvas] .stx-frame")].map((n) => n.getAttribute("data-stx-frame")),
    }));
    t("#219 · a method redraft rebuilds the board and leaves BOTH frames standing — adoptBoard removes .stx-slot only",
      after.frames === FRAMES.length && after.keys.length === FRAMES.length,
      JSON.stringify({ before, after }));
    await rp.close();
  }

  await p.close();
  await ctx.close();
}

// #221's layersPass — the running-page half build-checks group 26 states it cannot reach: the
// same-interaction reflection, selection parity BOTH WAYS through the one applySelection, the
// roving tabindex as one tab stop, the announcements, the refusal-as-content, and the mid-replay
// non-take-over. Every expectation is computed through the page's own pure imports (layerEntries,
// marqueeRange + idsInRange) and live DOM reads — never literals.
async function layersPass(browser, engineName, t, errors) {
  console.log(`\n[layers] #221 · the layers list in the inspector rail (${engineName})`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };
  // Settled by default (selectPass's recorded reason: the mount handles fire over an EMPTY canvas);
  // settle:false is the mid-replay case's own opener.
  const open = async (context = ctx, tag = "layers", { settle = true } = {}) => {
    const p = await context.newPage();
    watch(p, tag);
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await p.waitForSelector('[data-studio-layers="ready"]', { timeout: 20000 });
    if (settle) await settleWait(p, 30000);
    await p.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    return p;
  };
  // The stage's MOVABLE wrappers as the pure layer's input shape, in DOM order — which is board
  // order, the correspondence the whole list rides on.
  // #302: layerEntries takes { id, name, kind, x, y, w, h } — a place and a size, not a cell and a
  // span. `h` is read as NULL when the node carries none, which is the condition the sentence's
  // size clause now hangs on, so coercing it to 0 here would append ", 220 by 0" to every board
  // wrapper's row and the mirror would compare two wrong strings.
  const movables = (p) => p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot, [data-studio-canvas] .stx-frame")].map((n) => {
      const num = (k) => { const v = parseFloat(n.style.getPropertyValue(k)); return Number.isFinite(v) ? v : null; };
      return {
        id: n.getAttribute("data-stx-id"),
        name: n.getAttribute("data-stx-name"),
        x: num("--x") ?? 0, y: num("--y") ?? 0, w: num("--w"), h: num("--h"),
        kind: n.classList.contains("stx-frame") ? "frame" : "slot",
        selected: n.hasAttribute("data-stx-selected"),
      };
    }));
  const rowsNow = (p) => p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-layers] .stu-layer")].map((b) => ({
      id: b.getAttribute("data-layer-id"),
      name: b.querySelector(".stu-layer-name").textContent,
      pos: b.querySelector(".stu-layer-pos").textContent,
      kind: b.getAttribute("data-layer-kind"),
      pressed: b.getAttribute("aria-pressed"),
      sel: b.classList.contains("is-selected"),
    })));
  const chosenIds = async (p) => (await p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]")]
      .map((n) => n.getAttribute("data-stx-id")))).sort();
  const rowSel = (id) => `[data-studio-layers] .stu-layer[data-layer-id="${id}"]`;
  const mirrors = (rows, wraps) => {
    const expect = layerEntries(wraps);
    return rows.length === expect.length
      && rows.every((r, i) => r.id === expect[i].id && r.name === expect[i].name && r.pos === expect[i].sentence);
  };

  // --- 1 · the mirror: count, ids, names AND order ------------------------------------------------
  const p1 = await open();
  const wraps1 = await movables(p1);
  t("#221 · the settled canvas is non-empty — board wrappers AND both frames — or every row below is vacuous",
    wraps1.filter((w) => w.kind === "slot").length >= 3 && wraps1.filter((w) => w.kind === "frame").length === FRAMES.length,
    JSON.stringify(wraps1.map((w) => w.kind)));
  const rows1 = await rowsNow(p1);
  t("#221/AC1 · the list mirrors the stage — count, ids, names and ORDER, computed through the page's own layerEntries, never literals",
    mirrors(rows1, wraps1), JSON.stringify({ rows: rows1.map((r) => r.id), wraps: wraps1.map((w) => w.id) }));
  // THE SENTENCE'S SHAPE, ASSERTED AS A SHAPE (#302). mirrors() compares each row against
  // layerEntries' answer, which is the right coupling and is ALSO satisfied by a layerEntries that
  // silently changed what it says — the driver would move with it and never notice. Group 26 used
  // to pin four exact strings against the grid's wording; these are their replacement, and they
  // are two assertions rather than four because the wording now has exactly two forms.
  //
  // THE CONDITION IS AN AUTHORED SIZE, not a "span": a frame carries --h and a board wrapper does
  // not, so the size clause appears on exactly the frame rows. Both directions are asserted, which
  // is what makes it a condition rather than a coincidence — appending it everywhere and appending
  // it nowhere both go red here.
  const sized1 = rows1.filter((r, i) => wraps1[i].h !== null);
  const unsized1 = rows1.filter((r, i) => wraps1[i].h === null);
  t("#221 · a row for a node with NO authored size says \"at X, Y\" and stops there — a free position, rounded to whole pixels",
    unsized1.length >= 3 && unsized1.every((r) => /^at \d+, \d+$/.test(r.pos)),
    JSON.stringify(unsized1.map((r) => r.pos)));
  t("#221 · …and a row for one that HAS an authored size appends \", W by H\" — the clause the retired span condition was replaced by",
    sized1.length === FRAMES.length && sized1.every((r) => /^at \d+, \d+, \d+ by \d+$/.test(r.pos)),
    JSON.stringify(sized1.map((r) => r.pos)));
  t("#221 · frame rows are marked and carry NO aria-pressed (actions, not toggles); board rows carry it",
    rows1.filter((r) => r.kind === "frame").length === FRAMES.length
    && rows1.filter((r) => r.kind === "frame").every((r) => r.pressed === null)
    && rows1.filter((r) => r.kind !== "frame").every((r) => r.pressed === "false" || r.pressed === "true"),
    JSON.stringify(rows1.map((r) => [r.kind, r.pressed])));

  // --- 2 · same-interaction reflection: a pointer drag, then an injected agent move ---------------
  const dragId = wraps1.find((w) => w.kind === "slot").id;
  const posBefore = rows1.find((r) => r.id === dragId).pos;
  const g1 = await p1.evaluate(([id, pitch]) => {
    const r = document.querySelector(`.stx-slot[data-stx-id="${id}"] .stx-grab`).getBoundingClientRect();
    const b = document.querySelector(`.stx-slot[data-stx-id="${id}"]`).getBoundingClientRect();
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, dropX: (b.left + b.right) / 2, dropY: (b.top + b.bottom) / 2 + pitch };
  }, [dragId, NODE_H + NODE_GAP]);
  await p1.mouse.move(g1.x, g1.y);
  await p1.mouse.down();
  await p1.mouse.move(g1.dropX, g1.dropY, { steps: 8 });
  await p1.mouse.up();
  await p1.waitForTimeout(250);
  const rows2 = await rowsNow(p1);
  const wraps2 = await movables(p1);
  t("#221/AC1 · a pointer drag updates that row's position sentence in the SAME interaction — no reload, no poll",
    mirrors(rows2, wraps2) && rows2.find((r) => r.id === dragId).pos !== posBefore,
    JSON.stringify({ before: posBefore, after: rows2.find((r) => r.id === dragId).pos }));

  const p2 = await open(ctx, "layers agent");
  const agentId = (await movables(p2)).find((w) => w.kind === "slot").id;
  const agentTo = at(6, 2);
  await inject(p2, { type: "ui.move", source: "agent", target: { id: agentId }, params: { x: agentTo.x, y: agentTo.y } });
  await p2.waitForTimeout(250);
  const rows2b = await rowsNow(p2);
  const wraps2b = await movables(p2);
  t("#221/AC1 · an injected source:\"agent\" ui.move on a FRESH page updates the row too — the reflection is the observer, not the gesture",
    mirrors(rows2b, wraps2b)
    && rows2b.find((r) => r.id === agentId).pos === layerEntries(wraps2b).find((e) => e.id === agentId).sentence
    && wraps2b.find((w) => w.id === agentId).x === agentTo.x
    && wraps2b.find((w) => w.id === agentId).y === agentTo.y,
    JSON.stringify({ row: rows2b.find((r) => r.id === agentId), wrap: wraps2b.find((w) => w.id === agentId), agentTo }));
  await p2.close();

  // --- 3 · a method redraft rebuilds the rows; the frames' rows SURVIVE ---------------------------
  // The worklist answer, not the first radio: the cards restore the recommended answers, and
  // checking an already-checked radio is a no-op that redrafts nothing (perfPass's own fixture).
  const slotIdsBefore = (await rowsNow(p1)).filter((r) => r.kind !== "frame").map((r) => r.id);
  await p1.$eval('input[name="stm-q-shape"][value="worklist"]', (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
  await p1.waitForTimeout(100);
  await p1.check('input[name="stm-q-shape"][value="worklist"]');
  await p1.waitForTimeout(400);
  const wraps3 = await movables(p1);
  const rows3 = await rowsNow(p1);
  t("#221/AC1 · a method redraft rebuilds the list to the DRAFTED board's rows — genuinely new rows — and the frame rows survive (adoptBoard's .stx-slot scope, observed not assumed)",
    mirrors(rows3, wraps3) && rows3.filter((r) => r.kind === "frame").length === FRAMES.length
    && JSON.stringify(rows3.filter((r) => r.kind !== "frame").map((r) => r.id)) !== JSON.stringify(slotIdsBefore),
    JSON.stringify(rows3.map((r) => [r.id, r.kind])));

  // --- 7 · compile round-trip: rows byte-identical across Compile → Back to blocks ----------------
  const beforeC = await rowsNow(p1);
  await p1.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
  await p1.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "rendered", null, { timeout: 20000 });
  await p1.waitForTimeout(250);
  await p1.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
  await p1.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "blocks", null, { timeout: 20000 });
  await p1.waitForTimeout(250);
  const afterC = await rowsNow(p1);
  t("#221 · rows are byte-identical across Compile → Back to blocks — a compile swaps wrapper CONTENT, never wrappers",
    JSON.stringify(afterC) === JSON.stringify(beforeC), JSON.stringify({ beforeC, afterC }));
  await p1.close();

  // --- 4 · selection parity, BOTH directions, through the ONE applySelection ----------------------
  const p3 = await open(ctx, "layers select");
  const target = (await movables(p3)).find((w) => w.kind === "slot");
  await countLive(p3);
  await p3.click(rowSel(target.id));
  await p3.waitForTimeout(200);
  const said4 = await liveSeen(p3);
  const row4 = (await rowsNow(p3)).find((r) => r.id === target.id);
  t("#221/AC1 · clicking a row selects EXACTLY that component, the row shows aria-pressed + the visual, and the sentence is applySelection's own count — once, never duplicated here",
    JSON.stringify(await chosenIds(p3)) === JSON.stringify([target.id]) && row4.pressed === "true" && row4.sel
    && said4.n === 1 && /^1 selected: /.test(said4.last),
    JSON.stringify({ said4, row4 }));
  // The canvas direction: a Shift-drag marquee, its expected set computed through the page's own
  // marqueeRange + idsInRange (the selectPass idiom) — the rows' pressed set must equal it.
  // THE EXTENT IS READ, not defaulted, for studio-select.mjs's boxOf reason: a board wrapper carries
  // no --h, and the hit test uses the MEASURED height for one — so a driver reading 0 would compute
  // a different rectangle from the page's.
  const grid4 = await p3.evaluate(() => [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((n) => ({
    id: n.getAttribute("data-stx-id"),
    x: parseFloat(n.style.getPropertyValue("--x")) || 0,
    y: parseFloat(n.style.getPropertyValue("--y")) || 0,
    w: parseFloat(n.style.getPropertyValue("--w")) || n.offsetWidth || 0,
    h: (Number.isFinite(parseFloat(n.style.getPropertyValue("--h")))
      ? parseFloat(n.style.getPropertyValue("--h")) : n.offsetHeight) || 0,
  })));
  const want4 = idsInRange(grid4, marqueeRange(at(1, 1), at(2, 2))).slice().sort();
  // selectPass's cell() arithmetic, inline: the scroller's rect plus the point, clamped into the
  // stage so the press lands on the element the marquee listener is attached to.
  const pts4 = {
    from: await clientPoint(p3, at(1, 1).x, at(1, 1).y),
    to: await clientPoint(p3, at(2, 2).x, at(2, 2).y),
  };
  await p3.keyboard.down("Shift");
  await p3.mouse.move(pts4.from.x, pts4.from.y);
  await p3.mouse.down();
  await p3.mouse.move(pts4.to.x, pts4.to.y, { steps: 10 });
  await p3.mouse.up();
  await p3.keyboard.up("Shift");
  await p3.waitForTimeout(250);
  const pressed4 = (await rowsNow(p3)).filter((r) => r.pressed === "true").map((r) => r.id).sort();
  t("#221/AC1 · …and the canvas direction: a marquee's id set — marqueeRange + idsInRange in Node — IS the rows' pressed set",
    JSON.stringify(pressed4) === JSON.stringify(want4) && want4.length >= 2,
    JSON.stringify({ pressed4, want4 }));
  // The toggle proven both ways: a second click on a now-selected row DESELECTS.
  await p3.click(rowSel(target.id));
  await p3.waitForTimeout(200);
  const after4 = await chosenIds(p3);
  t("#221/AC1 · a second row click DESELECTS — the toggle proven both ways",
    !after4.includes(target.id) && JSON.stringify(after4) === JSON.stringify(want4.filter((x) => x !== target.id)),
    JSON.stringify({ after4, want4 }));

  // --- 5 · the keyboard: ONE tab stop, roving arrows, Enter on a frame row and on a slot row ------
  await p3.focus("[data-studio-minimap] .stu-map");
  await p3.keyboard.press("Tab");
  const onRow = await p3.evaluate(() => document.activeElement.classList.contains("stu-layer"));
  await p3.keyboard.press("Tab");
  const offList = await p3.evaluate(() => !document.activeElement.classList.contains("stu-layer"));
  t("#221/AC2 · Tab reaches the list as ONE stop and one more Tab leaves it — the roving tabindex",
    onRow && offList, JSON.stringify({ onRow, offList }));
  const rowIds = (await rowsNow(p3)).map((r) => r.id);
  const focusedRow = (p) => p.evaluate(() => document.activeElement.getAttribute?.("data-layer-id") ?? null);
  await p3.focus('[data-studio-layers] .stu-layer[tabindex="0"]');
  await p3.keyboard.press("ArrowDown");
  const f1 = await focusedRow(p3);
  await p3.keyboard.press("End");
  const f2 = await focusedRow(p3);
  await p3.keyboard.press("Home");
  const f3 = await focusedRow(p3);
  await p3.keyboard.press("ArrowUp");
  const f4 = await focusedRow(p3);
  t("#221/AC2 · ArrowDown/End/Home move the roving focus and ArrowUp wraps — ids read off the page, never literals",
    f1 === rowIds[1] && f2 === rowIds[rowIds.length - 1] && f3 === rowIds[0] && f4 === rowIds[rowIds.length - 1],
    JSON.stringify({ f1, f2, f3, f4, rowIds }));
  // Enter on a FRAME row: no selection change, the brought-into-view sentence, the frame measurably
  // inside the scroller's viewport afterwards. The first row IS a frame row (frames place at mount).
  await p3.keyboard.press("Home");
  const beforeF = await chosenIds(p3);
  await countLive(p3);
  await p3.keyboard.press("Enter");
  await p3.waitForTimeout(250);
  const saidF = await liveSeen(p3);
  const inView = await p3.evaluate(() => {
    const w = document.querySelector("[data-studio-canvas] .stx-frame");
    const wr = w.getBoundingClientRect();
    const sr = document.querySelector("[data-studio-canvas] .stx-scroll").getBoundingClientRect();
    return wr.bottom > sr.top && wr.top < sr.bottom && wr.right > sr.left && wr.left < sr.right;
  });
  t("#221/AC2 · Enter on a FRAME row changes NO selection and announces the brought-into-view sentence — never applySelection",
    saidF.n === 1 && / brought into view\.$/.test(saidF.last) && JSON.stringify(await chosenIds(p3)) === JSON.stringify(beforeF),
    JSON.stringify({ saidF, beforeF }));
  t("#221/AC2 · …and the frame is inside the scroller's viewport afterwards, measured", inView);
  // Enter on a SLOT row: exactly one sentence, and it is applySelection's count.
  for (let i = 0; i < 12; i += 1) {
    if (await p3.evaluate(() => document.activeElement.hasAttribute("aria-pressed"))) break;
    await p3.keyboard.press("ArrowDown");
  }
  const slotRowId = await focusedRow(p3);
  const beforeS = await chosenIds(p3);
  await countLive(p3);
  await p3.keyboard.press("Enter");
  await p3.waitForTimeout(250);
  const saidS = await liveSeen(p3);
  const afterS = await chosenIds(p3);
  t("#221/AC2 · Enter on a slot row toggles its selection with EXACTLY ONE live-region sentence — applySelection's own",
    saidS.n === 1 && (/^\d+ selected: /.test(saidS.last) || saidS.last === "Selection cleared.")
    && (beforeS.includes(slotRowId) ? !afterS.includes(slotRowId) : afterS.includes(slotRowId)),
    JSON.stringify({ slotRowId, saidS, beforeS, afterS }));

  // --- the refusal, forced deterministically ------------------------------------------------------
  // The wrapper is removed and the row clicked IN THE SAME TASK, before the observer's rAF flush
  // can rebuild — the only deterministic route to a row whose wrapper vanished between paint and
  // press. Content, never a throw; the selection untouched; watch() proves nothing hit the console.
  const refusal = await p3.evaluate(() => {
    const row = [...document.querySelectorAll('[data-studio-layers] .stu-layer[aria-pressed]')].pop();
    const id = row.getAttribute("data-layer-id");
    document.querySelector(`[data-studio-canvas] .stx-slot[data-stx-id="${id}"]`).remove();
    const before = [...document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]")].map((n) => n.getAttribute("data-stx-id"));
    row.click();
    return {
      live: document.querySelector("[data-studio-canvas] .stx-live").textContent.trim(),
      after: [...document.querySelectorAll("[data-studio-canvas] .stx-slot[data-stx-selected]")].map((n) => n.getAttribute("data-stx-id")),
      before,
    };
  });
  t("#221 · a row whose wrapper vanished between paint and press refuses AS CONTENT — the sentence, an untouched selection, nothing thrown",
    refusal.live === "Refused: that component is no longer on the canvas."
    && JSON.stringify(refusal.after) === JSON.stringify(refusal.before), JSON.stringify(refusal));

  // --- 9 · the runtime pins: zero inline styles, and NO sticky anywhere in either block -----------
  const pins = await p3.evaluate(() => ({
    styled: [...document.querySelectorAll("[data-studio-layers], [data-studio-layers] *, [data-studio-minimap], [data-studio-minimap] *")]
      .filter((n) => n.hasAttribute?.("style")).length,
    layers: getComputedStyle(document.querySelector("[data-studio-layers]")).position,
    map: getComputedStyle(document.querySelector("[data-studio-minimap]")).position,
    list: getComputedStyle(document.querySelector(".stu-layers-list")).position,
  }));
  t("#221/AC4 · zero inline styles on the rail and neither block computes position: sticky — the overflow-clip no-op, pinned at runtime",
    pins.styled === 0 && pins.layers !== "sticky" && pins.map !== "sticky" && pins.list !== "sticky",
    JSON.stringify(pins));
  await p3.close();

  // --- 6 · mid-replay: rebuild-under-focus survives, and a row click is NOT a take-over -----------
  const p4 = await open(ctx, "layers midreplay", { settle: false });
  await p4.waitForSelector('[data-studio-layers] .stu-layer[aria-pressed]', { timeout: 30000 });
  const heldId = await p4.evaluate(() => {
    const row = document.querySelector('[data-studio-layers] .stu-layer[tabindex="0"]');
    row.focus({ preventScroll: true });
    return row.getAttribute("data-layer-id");
  });
  const n0 = await p4.locator(`${VIEWPORT} .stx-slot`).count();
  await p4.waitForFunction((n) => document.querySelectorAll("[data-studio-canvas] .stx-slot").length > n, n0, { timeout: 20000 });
  await p4.waitForTimeout(150);
  const heldAfter = await p4.evaluate(() => document.activeElement.getAttribute?.("data-layer-id") ?? document.activeElement.tagName);
  t("#221 · a rebuild UNDER FOCUS (the replay placing a new row) re-focuses the same surviving row — never <body>",
    heldAfter === heldId, JSON.stringify({ heldId, heldAfter }));
  const n1 = await p4.locator(`${VIEWPORT} .stx-slot`).count();
  await p4.locator('[data-studio-layers] .stu-layer[aria-pressed]').first().click();
  await p4.waitForFunction((n) => document.querySelectorAll("[data-studio-canvas] .stx-slot").length > n, n1, { timeout: 20000 });
  const prov4 = await p4.evaluate(() => document.querySelector("[data-replay-chrome]")?.getAttribute("data-provenance"));
  t("#221 · a layers-row toggle MID-REPLAY is NOT a take-over — the driver keeps authoring and provenance stays the run's (the rail lives outside canvas.scroll, structurally)",
    prov4 !== "visitor", `provenance=${prov4}`);
  await p4.close();

  // --- 8 · reduced motion: rows still reflect and select ------------------------------------------
  const ctxRM = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const p5 = await open(ctxRM, "layers reduced-motion");
  const rmId = (await movables(p5)).find((w) => w.kind === "slot").id;
  await inject(p5, { type: "ui.move", source: "agent", target: { id: rmId }, params: { col: 6, row: 2 } });
  await p5.waitForTimeout(250);
  const rows5 = await rowsNow(p5);
  const wraps5 = await movables(p5);
  await p5.click(rowSel(rmId));
  await p5.waitForTimeout(200);
  t("#221 · reduced motion: rows still reflect and select — the reflection is attribute-driven, with nothing to animate away",
    mirrors(rows5, wraps5) && JSON.stringify(await chosenIds(p5)) === JSON.stringify([rmId]),
    JSON.stringify(rows5.find((r) => r.id === rmId)));
  await p5.close();
  await ctxRM.close();
  await ctx.close();
}

// #221's minimapPass — the running-page half build-checks group 27 states it cannot reach: the
// view rect tracking a real pan, the ZOOM-AT-0,0 observer wiring (the sole detector), content
// tracking, click-to-jump against the settled scroll, the keyboard path's per-press announcements
// including a blocked press, the zero-request rail, and the mid-replay non-take-over. Expectations
// are computed through the imported mapView / jumpFrom / nodeRect / visibleCount from measured page
// state — never literal rects.
//
// THE HORIZONTAL AXIS ON /factory HAS NO SCROLL RANGE — its own recorded truth (the R5 note in
// selectPass: #214's width:max-content pin makes scrollWidth <= clientWidth at every zoom), so the
// "panned" condition rides the VERTICAL axis and the blocked-press case rides the horizontal one.
// The view rect's width term is the reader-VISIBLE width (the scroller's box clipped by the window
// edge — studio-minimap.mjs call 5), measured here exactly as the module measures it.
async function minimapPass(browser, engineName, t, errors) {
  console.log(`\n[minimap] #221 · the minimap in the inspector rail (${engineName})`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };
  const open = async (context = ctx, tag = "minimap", { settle = true } = {}) => {
    const p = await context.newPage();
    watch(p, tag);
    await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
    await p.waitForSelector('[data-studio-minimap="ready"]', { timeout: 20000 });
    if (settle) await settleWait(p, 30000);
    await p.locator(VIEWPORT).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    return p;
  };
  const viewAttr = (p) => p.evaluate(() => {
    const v = document.querySelector(".stu-map-view");
    return { x: Number(v.getAttribute("x")), y: Number(v.getAttribute("y")), w: Number(v.getAttribute("width")), h: Number(v.getAttribute("height")) };
  });
  // The page's measured state, in one round trip. clientW is the reader-visible width — the
  // scroller's box intersected with the window edge, the module's own call-5 measurement;
  // realClientW is the scroll-range truth jumpFrom is held to.
  const metricsOf = (p) => p.evaluate(() => {
    const s = document.querySelector("[data-studio-canvas] .stx-scroll");
    const stage = document.querySelector("[data-studio-canvas] .stx-stage");
    const r = s.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.right, document.documentElement.clientWidth) - Math.max(r.left, 0));
    return {
      scrollLeft: s.scrollLeft, scrollTop: s.scrollTop,
      clientW: Math.min(s.clientWidth, visible), clientH: s.clientHeight,
      realClientW: s.clientWidth, scrollW: s.scrollWidth,
      scale: parseFloat(document.querySelector("[data-studio-canvas]").style.getPropertyValue("--stx-scale")) || 1,
      contentW: stage.offsetWidth, contentH: stage.offsetHeight,
    };
  });
  // THE BOXES THE MAP DRAWS FROM (#302), which is what replaced the track walk. The retired reader
  // took a cell and a span and resolved them against the grid's measured tracks; nodeRect takes the
  // four properties setPos wrote and answers the rectangle directly, so there are no tracks to read
  // and nothing to resolve. Read EXACTLY as studio-minimap.mjs's wrapperRect reads them, measured
  // height included — a slot carries no --h and its height really is its component's.
  const wrapBoxes = (p) => p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot, [data-studio-canvas] .stx-frame")].map((n) => {
      const prop = (name) => parseFloat(n.style.getPropertyValue(name));
      const h = prop("--h");
      return {
        id: n.getAttribute("data-stx-id"),
        x: prop("--x"), y: prop("--y"), w: prop("--w"),
        h: Number.isFinite(h) ? h : n.offsetHeight,
        frame: n.classList.contains("stx-frame"),
      };
    }));
  const expectView = (m) => mapView({ scrollLeft: m.scrollLeft, scrollTop: m.scrollTop, clientW: m.clientW, clientH: m.clientH, scale: m.scale, contentW: m.contentW, contentH: m.contentH });
  const close = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;
  const sameRect = (v, e, tol = 1.5) => close(v.x, e.x, tol) && close(v.y, e.y, tol) && close(v.w, e.w, tol) && close(v.h, e.h, tol);
  // Named for the MAP's rects, not for the retired pure reader that used to compute them.
  const mapCells = (p) => p.evaluate(() => [...document.querySelectorAll(".stu-map-cell")].map((c) => ({
    x: Number(c.getAttribute("x")), y: Number(c.getAttribute("y")), w: Number(c.getAttribute("width")), h: Number(c.getAttribute("height")),
    frame: c.classList.contains("stu-map-cell--frame"),
  })));

  const p1 = await open();
  // Requests AFTER settle: the rail fetches nothing, and none of its verbs below may either — the
  // zero-request claim, scoped to the main frame (the embedded protos fetch their own files).
  const reqs = [];
  p1.on("request", (r) => { if (r.frame() === p1.mainFrame() && r.url().startsWith(BASE)) reqs.push(r.url()); });

  // --- 0 · #273: the resolving IDREF (framesPass's #stx-resize-help row's shape) ------------------
  // Pins the WIRING only — no journey assertion can see SR output: the caption element exists,
  // carries the affordance sentence, and is exactly what the map's aria-describedby names.
  t("#273 · #stu-map-help exists and carries the affordance sentence, so the map's aria-describedby resolves to real text",
    (await p1.locator("#stu-map-help").count()) === 1
    && (await p1.locator("#stu-map-help").textContent() || "").includes("arrow keys pan the canvas")
    && (await p1.locator("[data-studio-minimap] .stu-map").getAttribute("aria-describedby")) === "stu-map-help");

  // --- 1 · the cells and the view rect, in THREE conditions ---------------------------------------
  const wrapGeo = await wrapBoxes(p1);
  const cells1 = await mapCells(p1);
  t("#221/AC3 · one map cell per MOVABLE wrapper at settle, frames wearing their own modifier",
    cells1.length === wrapGeo.length && cells1.filter((c) => c.frame).length === FRAMES.length && wrapGeo.length >= 5,
    JSON.stringify({ cells: cells1.length, wrappers: wrapGeo.length }));
  t("#221/AC3 · …and every cell sits at nodeRect's answer for its wrapper's own four properties — in order, frames wearing their modifier",
    cells1.every((c, i) => sameRect(c, nodeRect(wrapGeo[i])) && c.frame === wrapGeo[i].frame),
    JSON.stringify({ cells1, wrapGeo }));

  const mRest = await metricsOf(p1);
  const vRest = await viewAttr(p1);
  t("#221/AC3 · at rest the view rect equals mapView's answer computed in Node from measured page state — the positive control",
    sameRect(vRest, expectView(mRest)), JSON.stringify({ vRest, expect: expectView(mRest), mRest }));
  t("#221 · the horizontal axis genuinely has no scroll range on /factory (scrollWidth <= clientWidth) — the recorded constraint the two cases below are shaped by",
    mRest.scrollW <= mRest.realClientW, JSON.stringify({ scrollW: mRest.scrollW, clientW: mRest.realClientW }));
  // PANNED — the missing-scroll-term detector, on the axis this page can actually scroll.
  await p1.evaluate(() => { document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop = 170; });
  await p1.waitForTimeout(200);
  const mPan = await metricsOf(p1);
  const vPan = await viewAttr(p1);
  t("#221/AC3 · panned (scrollTop 170): the rect moved and equals the computed expectation — the missing-scroll-term detector",
    sameRect(vPan, expectView(mPan)) && vPan.y > vRest.y && close(mPan.scrollTop, 170),
    JSON.stringify({ vPan, expect: expectView(mPan) }));
  // ZOOMED AT 0,0 — no scroll event can fire, so only the style observer on the viewport can move
  // the rect (the scale is a custom property now, which is why that filter names "style"):
  // the sole detector of the observer wiring, and the no-timer AC's positive proof.
  await p1.evaluate(() => { const s = document.querySelector("[data-studio-canvas] .stx-scroll"); s.scrollLeft = 0; s.scrollTop = 0; });
  await p1.waitForTimeout(200);
  const vAt100 = await viewAttr(p1);
  await btn(p1, "Zoom out").click();
  await p1.waitForTimeout(200);
  const mZoom = await metricsOf(p1);
  const vZoom = await viewAttr(p1);
  t("#221/AC3 · THE ZOOM-AT-0,0 CASE: the rect GREW to mapView's zoomed answer with no scroll event fired — only the viewport's style observer can have done this",
    sameRect(vZoom, expectView(mZoom)) && vZoom.w > vAt100.w && mZoom.scale !== SCALE_REST,
    JSON.stringify({ vZoom, expect: expectView(mZoom), mZoom }));
  await btn(p1, "Reset").click();
  await p1.waitForTimeout(200);

  // --- 3 · pan tracking through a real drag (the scroll-event path) -------------------------------
  // ONE NODE PITCH BELOW THE FIRST BLOCK — EMPTY CANVAS, which is what a pan needs to grab. The
  // pitch came from the grid's resolved rows; it is now the imported constant, like every other
  // number this driver uses.
  const panPt = await p1.evaluate((pitch) => {
    const a = document.querySelector("[data-studio-canvas] .stx-slot").getBoundingClientRect();
    return { x: a.left + a.width / 2, y: a.top + a.height / 2 + pitch };
  }, NODE_H + NODE_GAP);
  const v3a = await viewAttr(p1);
  await p1.mouse.move(panPt.x, panPt.y);
  await p1.mouse.down();
  await p1.mouse.move(panPt.x, panPt.y - 120, { steps: 8 });
  await p1.mouse.up();
  await p1.waitForTimeout(200);
  const v3b = await viewAttr(p1);
  t("#221/AC3 · a real drag-pan of the canvas moves the rect — the scroll-event path",
    v3b.y > v3a.y && sameRect(v3b, expectView(await metricsOf(p1))), JSON.stringify({ v3a, v3b }));

  // --- 4 · content tracking: an injected agent move re-draws that block's cell --------------------
  const before4 = (await wrapBoxes(p1))[0];
  const movedId = before4.id;
  const to4 = at(6, 2);
  await inject(p1, { type: "ui.move", source: "agent", target: { id: movedId }, params: { x: to4.x, y: to4.y } });
  await p1.waitForTimeout(250);
  const cells4 = await mapCells(p1);
  const after4 = (await wrapBoxes(p1)).find((w) => w.id === movedId);
  // THE CELL FOLLOWS THE NODE, and both sides are read from the page rather than typed: the
  // expectation is nodeRect over the wrapper's own properties AFTER the move, and the negative is
  // the rectangle it used to occupy. Asserted as a pair because "it drew a new cell" and "it did
  // not leave the old one behind" are two failures that look the same from a count.
  t("#221/AC3 · an injected agent move re-draws that block's cell at its new rectangle (and nothing is left at the old one)",
    cells4.some((c) => sameRect(c, nodeRect(after4)))
    && !cells4.some((c) => sameRect(c, nodeRect(before4))),
    JSON.stringify({ cells4, want: nodeRect(after4), gone: nodeRect(before4) }));
  // H2 · THE OBSERVER'S attributeFilter, and nothing else covers it. studio-minimap.mjs and
  // studio-layers.mjs both watch attributeFilter: ["style"] — the position IS a style property
  // now, where it used to be a pair of data attributes — and if either filter names the wrong one
  // the surface FREEZES for the whole of a move while the page otherwise works perfectly: the node
  // travels, the announcement fires, the history entry lands, and only the mirror is stale. It is
  // invisible to build-checks (no browser), to drift-check (no artifact) and to the pixel gate (the
  // map is captured at rest, where a frozen cell is in the right place anyway). The row above is
  // the positive proof for the map; this is the same claim made where it can be read as a fact.
  t("#221 · H2 · the map's cell tracked a move that changed ONLY a style property — the observer's attributeFilter names \"style\", and a wrong one freezes every cell with the page still working",
    !sameRect(nodeRect(after4), nodeRect(before4))
    && cells4.some((c) => sameRect(c, nodeRect(after4))),
    JSON.stringify({ before: nodeRect(before4), after: nodeRect(after4) }));

  // --- 5 · click-to-jump against the settled scroll, announced once -------------------------------
  // PARKED AT CENTER FIRST, instantly (methodPass's rule): after open() the rail's top sits at the
  // window's top edge, UNDER the site's fixed header — a raw mouse.click there lands on the header
  // and does nothing, silently (found by this pass's own first run: zero announcements).
  await p1.$eval("[data-studio-minimap] .stu-map", (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
  await p1.waitForTimeout(200);
  const mapBox = await p1.evaluate(() => {
    const r = document.querySelector(".stu-map svg").getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  const click5 = { x: mapBox.left + mapBox.width * 0.9, y: mapBox.top + mapBox.height * 0.9 };
  const frac5 = { fx: (click5.x - mapBox.left) / mapBox.width, fy: (click5.y - mapBox.top) / mapBox.height };
  await countLive(p1);
  await p1.mouse.click(click5.x, click5.y);
  await p1.waitForTimeout(300);
  const m5 = await metricsOf(p1);
  const exp5 = jumpFrom(frac5, { clientW: m5.realClientW, clientH: m5.clientH, scale: m5.scale, contentW: m5.contentW, contentH: m5.contentH });
  const said5 = await liveSeen(p1);
  // THE SENTENCE'S SUBJECT CHANGED WITH THE SUBSTRATE (#302). The retired reader named a column
  // and row span, which a free stage has none of; visibleCount answers how much of the reader's
  // work is on screen, which is what a minimap is for. Computed in Node from the same boxes the map
  // draws from, so the expectation moves with the page.
  const count5 = visibleCount(expectView(m5), await wrapBoxes(p1));
  t("#221/AC3 · click-to-jump: the scroller settles at jumpFrom's clamped target — the same clamp range the browser applies, so computed === settled on BOTH axes",
    close(m5.scrollLeft, exp5.left, 3) && close(m5.scrollTop, exp5.top, 3),
    JSON.stringify({ settled: { left: m5.scrollLeft, top: m5.scrollTop }, exp5 }));
  t("#221/AC3 · …announced exactly once, with visibleCount's own sentence",
    said5.n === 1 && said5.last === `Showing ${count5.visible} of ${count5.total} on the canvas.`,
    JSON.stringify({ said5, count5 }));

  // --- 6 · the keyboard: one cell per press, the blocked press honest, Home -----------------------
  await p1.focus("[data-studio-minimap] .stu-map");
  await p1.keyboard.press("Home");
  await p1.waitForTimeout(200);
  const m6a = await metricsOf(p1);
  await countLive(p1);
  await p1.keyboard.press("ArrowDown");
  await p1.waitForTimeout(200);
  const m6b = await metricsOf(p1);
  const said6 = await liveSeen(p1);
  // ONE NODE PITCH × THE SCALE — the module's own stepY, imported rather than measured off tracks
  // that no longer exist.
  const pitchY = (NODE_H + NODE_GAP) * m6b.scale;
  t("#221/AC3 · ArrowDown on the focused map pans exactly one node pitch — × the current scale — and announces what is on screen",
    close(m6b.scrollTop - m6a.scrollTop, pitchY) && said6.n === 1 && /^Showing \d+ of \d+ on the canvas\.$/.test(said6.last),
    JSON.stringify({ delta: m6b.scrollTop - m6a.scrollTop, pitchY, said6 }));
  await countLive(p1);
  await p1.keyboard.press("ArrowRight");
  await p1.waitForTimeout(200);
  const m6c = await metricsOf(p1);
  const said6b = await liveSeen(p1);
  t("#221/AC3 · a BLOCKED press announces the UNCHANGED range — ArrowRight has no horizontal range on this page, and the map says so instead of going silent",
    m6c.scrollLeft === m6b.scrollLeft && said6b.n === 1 && said6b.last === said6.last,
    JSON.stringify({ said6b, was: said6.last }));
  await countLive(p1);
  await p1.keyboard.press("Home");
  await p1.waitForTimeout(200);
  const m6d = await metricsOf(p1);
  t("#221/AC3 · Home returns to the top left, announced",
    m6d.scrollLeft === 0 && m6d.scrollTop === 0 && (await liveSeen(p1)).n === 1,
    JSON.stringify({ left: m6d.scrollLeft, top: m6d.scrollTop }));

  // The zero-request claim, across every interaction above.
  t("#221 · the minimap issued NO main-frame request across pan, zoom, content moves, jumps and keys — the rail is a reflection, not a fetcher",
    reqs.length === 0, JSON.stringify(reqs));

  // --- 9 · compile round-trip: the data-compile-state full-rebuild branch -------------------------
  // The one branch no other gate can see (group 27 is DOM-free; the pixel gate captures the
  // pre-compile settled state): Compile flips --stx-slot-h under the stage, so every wrapper's
  // RENDERED HEIGHT changes and the map must re-measure. Delete the observer's data-compile-state
  // branch, or the re-measure inside rebuildCells(), and this goes red. It runs AFTER the
  // zero-request claim deliberately — the first compile legitimately fetches vocabulary.json,
  // which is studio-compile.mjs's request, not the rail's.
  //
  // WHAT CHANGED (#302): the stage is a FIXED STAGE_W × STAGE_H box, so the viewBox does NOT move
  // when a board compiles — it used to, because the grid's tracks grew and the stage grew with
  // them. Asserting a changed viewBox would now be asserting the opposite of the substrate. The
  // re-measure is still there to catch, and the thing that carries it is the CELLS: a slot with no
  // authored height is drawn at its rendered one, and that is what a compile changes.
  const boxPre = await p1.evaluate(() => document.querySelector(".stu-map svg").getAttribute("viewBox"));
  const cellsPre = await mapCells(p1);
  await p1.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
  await p1.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "rendered", null, { timeout: 20000 });
  await p1.waitForTimeout(400);
  const wrapC = await wrapBoxes(p1);
  const boxC = await p1.evaluate(() => document.querySelector(".stu-map svg").getAttribute("viewBox"));
  const stageC = await p1.evaluate(() => {
    const s = document.querySelector("[data-studio-canvas] .stx-stage");
    return { w: s.offsetWidth, h: s.offsetHeight };
  });
  const cellsC = await mapCells(p1);
  t("#221/AC3 · Compile RE-MEASURES the map: the viewBox is still the fixed stage's own box, every cell is redrawn at nodeRect's answer over the FRESH wrapper boxes, and the blocks genuinely GREW — so a missing re-measure cannot pass",
    boxC === `0 0 ${stageC.w} ${stageC.h}` && boxC === boxPre
    && cellsC.length === cellsPre.length
    && cellsC.every((c, i) => sameRect(c, nodeRect(wrapC[i])))
    && cellsC.some((c, i) => !close(c.h, cellsPre[i].h)),
    JSON.stringify({ boxPre, boxC, heights: [cellsPre.map((c) => c.h), cellsC.map((c) => c.h)] }));
  t("#221/AC3 · …and the view rect tracks the compiled geometry — re-scaled against the new viewBox, never left at the pre-compile scale",
    sameRect(await viewAttr(p1), expectView(await metricsOf(p1))),
    JSON.stringify({ v: await viewAttr(p1), expect: expectView(await metricsOf(p1)) }));
  await p1.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
  await p1.waitForFunction(() => document.querySelector("[data-studio-canvas]").getAttribute("data-compile-state") === "blocks", null, { timeout: 20000 });
  await p1.waitForTimeout(400);
  const boxR = await p1.evaluate(() => document.querySelector(".stu-map svg").getAttribute("viewBox"));
  const cellsR = await mapCells(p1);
  t("#221/AC3 · Back to blocks restores it: the viewBox back exactly, every cell back at its pre-compile rect",
    boxR === boxPre && cellsR.length === cellsPre.length && cellsR.every((c, i) => sameRect(c, cellsPre[i]) && c.frame === cellsPre[i].frame),
    JSON.stringify({ boxR, boxPre }));
  await p1.close();

  // --- 7 · mid-replay: a minimap jump is NOT a take-over ------------------------------------------
  const p2 = await open(ctx, "minimap midreplay", { settle: false });
  await p2.waitForSelector(`${VIEWPORT} .stx-slot`, { timeout: 30000 });
  const n0 = await p2.locator(`${VIEWPORT} .stx-slot`).count();
  await p2.$eval("[data-studio-minimap] .stu-map", (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
  await p2.waitForTimeout(200);
  const box2 = await p2.evaluate(() => {
    const r = document.querySelector(".stu-map svg").getBoundingClientRect();
    return { x: r.left + r.width * 0.8, y: r.top + r.height * 0.8 };
  });
  await p2.mouse.click(box2.x, box2.y);
  await p2.waitForFunction((n) => document.querySelectorAll("[data-studio-canvas] .stx-slot").length > n, n0, { timeout: 20000 });
  const after2 = await p2.evaluate(() => ({
    prov: document.querySelector("[data-replay-chrome]")?.getAttribute("data-provenance"),
    // The movement proof, so this row cannot pass on a click that hit nothing: the jump really
    // moved the scroller AND the run kept authoring — both, or the discriminator claim is untested.
    top: document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop,
  }));
  t("#221 · a minimap jump MID-REPLAY really jumps AND is NOT a take-over — the driver keeps authoring (the dock-mid-replay case's sibling: this is what keeps the discriminator canvas-scoped)",
    after2.prov !== "visitor" && after2.top > 0, JSON.stringify(after2));
  await p2.close();

  // --- 8 · reduced motion: the rect still tracks --------------------------------------------------
  const ctxRM = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const p3 = await open(ctxRM, "minimap reduced-motion");
  await p3.evaluate(() => { document.querySelector("[data-studio-canvas] .stx-scroll").scrollTop = 170; });
  await p3.waitForTimeout(200);
  const mR = await metricsOf(p3);
  const vR = await viewAttr(p3);
  t("#221 · reduced motion: the rect still tracks — attribute writes, nothing animates",
    sameRect(vR, expectView(mR)) && vR.y > 0, JSON.stringify({ vR, expect: expectView(mR) }));
  await p3.close();
  await ctxRM.close();
  await ctx.close();
}

async function perfPass(browser, engineName, t, errors) {
  const BUDGET_MS = 200;
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };
  const settled = (p) => settleWait(p, 30000);
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
  // The verdict every measured row below consumes: a null latency is only a pass while THIS is true.
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
      const drop = await p.evaluate(([id, pitch]) => {
        const r = document.querySelector(`.stx-slot[data-stx-id="${id}"]`).getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 + pitch };
      }, [st.id, NODE_H + NODE_GAP]);
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
      const pts = await p.evaluate(([px, py]) => {
        const stage = document.querySelector("[data-studio-canvas] .stx-stage");
        const a = stage.querySelector(".stx-slot").getBoundingClientRect();
        const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
        return { from, to: { x: from.x + px, y: from.y + py } };
      }, [NODE_W + NODE_GAP, NODE_H + NODE_GAP]);
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
      const pts = await p.evaluate((py) => {
        const n = document.querySelector("[data-studio-canvas] .stx-slot[data-stx-selected] .stx-grab");
        if (!n) return null;
        const r = n.getBoundingClientRect();
        const from = { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
        return { from, to: { x: from.x, y: from.y + py } };
      }, NODE_H + NODE_GAP);
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
    // #219's two rows. The resize is the one verb on this canvas whose two input paths do NOT
    // converge — a continuous drag and a stepped keypress — so both are measured, exactly as the
    // move's two are. The drag's delta is MEASURED from the resolved grid rather than typed:
    // framesPass learned that a chromium-derived pixel constant crosses no row on firefox, and a
    // gesture that moved nothing would report a flatteringly small INP.
    { label: "frame resize (pointer)", act: async (p) => {
      const h = p.locator('[data-stx-frame="verdant"] .stx-resize');
      if (!(await h.count())) return;
      await h.scrollIntoViewIfNeeded();
      const pitch = NODE_H + NODE_GAP;
      const b = await h.boundingBox();
      if (!b) return;
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + pitch, { steps: 10 });
      await p.mouse.up();
      await p.waitForTimeout(140);
    } },
    { label: "frame resize (keyboard)", act: async (p) => {
      const h = p.locator('[data-stx-frame="verdant"] .stx-resize');
      if (!(await h.count())) return;
      await h.scrollIntoViewIfNeeded();
      await h.focus();
      await p.keyboard.press("Enter");
      await p.keyboard.press("ArrowUp");   // shrink: Verdant is already at the grid band's floor
      await p.keyboard.press("Enter");
      await p.waitForTimeout(140);
    } },
    // #221's two rows, BEFORE the method pair for the same reason #217's four are: they act on the
    // RUN's board, and the redraft below replaces the rows the layers list is reading. Each returns
    // silently when its target is absent — its own pass owns that failure.
    { label: "layers-row toggle", act: async (p) => {
      const row = p.locator("[data-studio-layers] .stu-layer[aria-pressed]").first();
      if (!(await row.count())) return;
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await p.waitForTimeout(120);
    } },
    { label: "minimap jump", act: async (p) => {
      const map = p.locator("[data-studio-minimap] .stu-map");
      if (!(await map.count())) return;
      // Parked at CENTER instantly, never scrollIntoViewIfNeeded: the rail's top lands under the
      // site's fixed header, where a raw click does nothing and the row measures a false sub-floor
      // pass (minimapPass's own first-run lesson).
      await p.$eval("[data-studio-minimap] .stu-map", (n) => n.scrollIntoView({ behavior: "instant", block: "center" }));
      await p.waitForTimeout(150);
      const b = await map.boundingBox();
      if (!b) return;
      await p.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.8);
      await p.waitForTimeout(120);
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
    // #219 · THE DEVICE FRAMES ARE PART OF THE BOOTSTRAP NOW, and the line above is what starts them:
    // the two <iframe>s are loading="lazy", so scrolling the canvas into view is the moment two whole
    // proto pages begin booting. Under the 4× CPU throttle applied below that work lands squarely
    // inside the measured drag window — observed as one 61 ms long-animation-frame — which is the
    // IDENTICAL argument the 500 ms rest already makes for site.js/dock.mjs's chrome injection. So it
    // is WAITED FOR on each frame's own settle handle rather than slept past. Swallowed on timeout
    // deliberately: whether the frames load at all is framesPass's assertion, and this pass failing
    // for it would report the wrong thing.
    await tp.waitForFunction(() => [...document.querySelectorAll("[data-studio-canvas] .stx-frame iframe")]
      .every((f) => f.contentDocument?.querySelector("#source[data-source]")), null, { timeout: 30000 })
      .catch(() => {});
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
    // THE PITCH IS THE IMPORTED CONSTANT (#302). It was read off the stage's resolved grid rows,
    // which no longer exist — a getComputedStyle here would answer "none" and the drag would be a
    // NaN-length gesture that silently sampled nothing.
    const geom = await tp.evaluate((pitch) => {
      const slot = document.querySelector("[data-studio-canvas] .stx-slot");
      const grab = slot.querySelector(".stx-grab").getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      return { fromX: (grab.left + grab.right) / 2, fromY: (grab.top + grab.bottom) / 2,
        toX: (r.left + r.right) / 2, toY: (r.top + r.bottom) / 2 + pitch };
    }, NODE_H + NODE_GAP);
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
    const movedTo = await tp.evaluate(() => parseFloat(document.querySelector("[data-studio-canvas] .stx-slot").style.getPropertyValue("--y")) || 0);
    t("frame check · the throttled drag genuinely moved the block — the sampled window holds a real gesture",
      movedTo > 0, `--y=${movedTo}`);
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
console.log('\nstudio-journey bounds · #218\'s docsPass asserts the docs panel\'s LAZY WIRING as two halves (a raw zero-request count before Compile; a per-url DELTA of zero across four forced re-renders) and NOT as a raw per-url total, because two of the three DOCS_SOURCES have other consumers on this page — studio-compile.mjs fetches vocabulary.json on first compile and the Graph panel fetches system-graph.json, so an absolute "exactly 1 per url" would be RED on a correct implementation; pack.json, which nothing else touches, IS pinned at exactly 1 · its cross-page comparison (assertion 5) runs BEFORE the pack swap and compares the tables WHOLE, live-value column included, which is sound only while both documents wear neutral — the order is part of the assertion · what it does NOT cover, stated rather than implied: the docs panel is asserted on /factory ONLY (studio.html has no inspector by design and /components is tooling/catalog-journey.mjs\'s), no assertion here drives the playground CONTROLS or the copy-as-Markdown button (both are mount 1\'s, gated there), and the AC #2 hover case moves the pointer AWAY before re-hovering because a node rebuilt under a resting pointer delivers no enter event at all (inspect.mjs\'s own recorded lesson) · the frame check runs on CHROMIUM ONLY (CDP CPU throttling and long-animation-frames are chromium-only by definition) · an over-budget INP row is re-measured ONCE on a fresh page with both numbers printed, never silently · the Event Timing observer\'s durationThreshold floor is 16 ms, so a faster interaction yields no entry and prints as "< 16 ms" (sound: the calibration click proves delivery) · the INP interaction list is ENUMERATED (26 rows since #221 added the layers-row toggle and the minimap jump, on top of #219\u2019s frame-resize pair (both non-converging input paths) and #217\u2019s marquee drag, group pointer-drag, group keyboard step and context menu open), not exhaustive of every verb — #212\'s flow navigation (landed since this list was cut) is not yet among them · #217\'s \u2318/Ctrl+A is FOCUS-SCOPED to .stx-scroll, so it is the browser\'s own document select-all everywhere else on the page, and it is deliberately NOT a replay take-over (the driver\'s discriminator returns early on ctrlKey/metaKey, exactly as it already does for \u2318Z) · #217 adds NEITHER of \u00a75\'s last two items and says so: zoom-to-fit landed at #204 and pan-by-drag covers the hand tool on EMPTY canvas — there is no mode in which a drag over a component pans, recorded as a decision rather than left as a gap');

console.log(totalFails
  ? `\nstudio-journey ✗  ${totalFails} assertion(s) failed`
  : `\nstudio-journey ✓  pan by scroll · four zoom verbs · the bare wheel never zooms · every inline style on the canvas carrying only the four position and three scale properties · far column reachable by keyboard · three sources one arrangement (the third on a fresh page) · announcements counted per path · ui.move carrying the vocabulary shape under target.component and the display label under target.label, and NO component for a fat-marker block (#232) · escape restores · the hit-test in all three conditions (±2px, because a free drop lands on a float, and with the occupancy pair DELETED rather than translated: nothing blocks a free move, so two components overlapping is correct) · a clean drop sticks · SC 2.5.7's click-move-click completed against the drag as its control · a component placed AFTER mount undoes by both call sites · a re-place re-labels the move handle and a canvas mounted WITHOUT its verbs hands out no dead tab stop and no dangling IDREF (#231) · reduced motion · AND #209's REPLAY DRIVER on the shipped /factory: the canvas assembling itself from a committed real run, settling on that run's own board block for block in board order and laid out by board-ops.mjs's RANK LAYOUT computed in Node from the board the page itself fetched, a BYTE-IDENTICAL settled stage on a second load, one action per beat and every one of them agent.*/source:"agent" carrying no target.component and no ui.move at all, pause · step · seek all driven from the keyboard and each announced, the take-over on a FRESH page mid-replay pausing the run and shifting provenance and firing /factory/took-over exactly once before restoring the real URL, that same handover one-shot, Tab and the driver's own transport correctly NOT counting as take-over, reduced motion reaching the identical end state immediately with manual stepping intact, the Pause button genuinely not painted there (read as COMPUTED display, since the hidden attribute is inert wherever an author rule sets one) and the handover still shifting provenance and still firing the route, the TWO DEGRADATIONS — a 404 artifact settling as an honest card with no dead transport and, load-bearing, NO take-over route at all, because a visitor moving blocks on a canvas the run never built has taken nothing over; and a 404 trace still playing the ops while the surface STATES the words are missing — and destroy() mid-playback writing nothing further · AND #240's REVIEW FIXES: the compile beat dead while the driver authors and live the moment the visitor takes over, the WHOLE transport dying with the handover rather than seek alone (a Resume after a compile would replace compiled components with fat markers), Compile pressed MID-REPLAY compiling the blocks actually on the canvas and nothing overwriting them afterwards, the earliest take-over there is publishing an empty board without rendering a zeros panel, a press in the LOADING window taking nothing over and firing no route while the run still plays through, and the two INSTANT paths — reduced motion and Skip to end — naming the acts in the one sentence a polite region can actually speak, with the autoplayed arrival as the control · AND THE SHIPPED /factory: the replay's board on the canvas, a cold #shape deep-link into a MOUNTED graph, all three absorbed exhibits rendered after activation (their only coverage now they are lazy), the panel list by arrow keys, a keyboard move announced per keypress, and Act 0 self-booted · AND #207's COMPILE BEAT: at rest fat-marker blocks with no vocabulary request made, the beat swapping every slot to a library primitive with every id, column and row unchanged, one announcement per step counted exactly AND spaced far enough apart to be five announcements rather than fewer (on the second compile too, and under reduced motion), each verb handing focus to its counterpart instead of dropping it to the body, zero ::view-transition-* pseudos, no style attribute after it, a byte-identical stage on a re-run and on a fresh load, and reduced motion reaching the identical end state · AND #236's TEARDOWN: destroy() mid-walk and destroy() inside the vocabulary fetch both letting compile() come back rather than parking its frame, leaving the viewport clean, aborting the request and swapping nothing onto the stage afterwards, and #237's transient 503 settling as the honest card and then RENDERING on the next press with a second request genuinely issued · AND #210's KEEP RAIL, the half build-checks group 17 structurally cannot be: the rail fetching NOTHING at rest, the export click really handing a file over and those bytes parsing IN A BROWSER as one SCREEN per block on the canvas with one nav anchor per connection, every one resolving to a section inside the file, the entry screen still one tile per place, and no script in it, the copy click leaving a REAL pathname carrying a ?b= that decodes back to this board WITH ITS ARRANGEMENT — the one thing /build's rail cannot express, and the field the codec drops silently — both new routes firing exactly once across two clicks each and carrying no board into the path, AC #6 asserted BOTH WAYS as client rects rather than as the inert "hidden" attribute (the bare board built here with the page's own encodeBuild, since /factory has no remove verb), and the DECLINED MOUNT that had never run: the sender's board at the sender's slots, not one action emitted, the transport unpainted, the chrome saying why, and the Compile button not merely enabled but COMPILING END TO END — the dead primary control #240 named. Plus a refused link scrubbing its ?b= and keeping its reason visible after the run narrates over the live region, a no-link page painting no notice at all, and reduced motion reaching the same rail · AND PR #241's REVIEW FIXES: the arrangement moved OFF the default row-1 layout before the copy, which is what turns the sender's-coordinates assertion into the g-restore's only running-page proof rather than a claim both branches satisfy; a design worn in from HOME by each of its two paths — an imported record and a derived one, seeded through storage and applied by pack-boot before paint — reaching the DOWNLOADED BYTES and being NAMED in their provenance rather than denied; and a shape:stream link compiling IN PLACE — six feed rows inside one entry screen with streamNote's truncation stated on the stage — so the copied link now CARRIES the arrangement, labelled as carrying it · AND #212's FLOW on the shipped page: one screen per place with one nav button per connection, the pointer walk end to end along the dispatch chain with focus landing on each target screen's heading and EXACTLY ONE fixed counted announcement per navigation, the keyboard leg (Tab from the grab handle, Enter) on a fresh compile proving the nav re-wires, the revert byte-identical after navigating, and reduced motion reaching the same end state · AND #214's METHOD BAND: the ten questions as cards on the shipped canvas — disabled while the driver plays with a disabled-band pointerdown proven NOT a take-over and not a redraft, enabled in settle's own task, a pointer answer and a native radio-arrow keyboard answer each redrafting the canvas to draftBoard's OWN board computed in Node label for label, announced once per placement plus the one redraft sentence, provenance flipped in both standing places in the same words, the driver RELINQUISHED (transport dead, still settled, the set-aside sentence, no take-over route), the Hook loop assembled by pointer AND by keyboard with every select and placement announced counted exactly, a wrong-stage placement refused with the fixed reason and an untouched DOM, the verdict locked until completion and then the imported rules' sentences BY IDENTITY, re-rendering when an ethics card moves afterwards, the keep rail's link decoding back to the drafted board and answers, and the ?b= #193 mode populating cards, diagram and verdict with zero interaction on a never-disabled band · AND #213's MEASUREMENT GATE: INP measured per named interaction — twenty-six rows across the settled /factory and a mid-replay page — and ASSERTED ≤ 200 ms per engine through a driver-injected PerformanceObserver that ships nothing, the below-16 ms floor printed as such and made non-vacuous by a forced-slow calibration click proving the delivery pipeline alive on every engine, one over-budget row re-measured ONCE on a fresh page with both numbers printed, the comparator proven able to flag in the same pass that relies on it, the 4×-CDP-throttled drag sampled for rAF gaps and long-animation-frame entries with its histogram printed (chromium only, and stated), the appearance dock switched to saulera MID-REPLAY re-pointing the head's one pack line WITHOUT counting as take-over while the run plays through to the committed board and a move verb still announces after it, and all four zoom verbs activated FROM THE KEYBOARD with exactly the live surfaces the module writes asserted — the readout for in/out, .stx-live for Fit and Reset \u00b7 AND #217's FULL CANVAS AFFORDANCES on the shipped /factory: a Shift-drag marquee selecting exactly the components inside the dragged rectangle (computed in Node from the LIVE arrangement through the page's own marqueeRange + idsInRange, never a literal) and announced EXACTLY ONCE on release, the KEYBOARD path selecting the SAME SET from a captured-once anchor — AC #1's whole claim — and proven to REPLACE rather than union by a deliberate stray Shift-click first, a marquee over empty canvas saying \"Nothing to select.\" rather than \"Selection cleared.\", the group move by pointer AND by keyboard landing every member at its own offset through ONE ui.move-group with no ui.move at all and no target on the envelope, one announcement, one history entry and ONE Undo restoring all of them, alignment guides proven to sit only where a NON-CARRIED peer really is WITH the mutation that forces one onto a provably empty column and watches the check go red, the context menu opening by Shift+F10 and by right-click with IDENTICAL items, full Arrow/Home/End navigation over items that stay focusable because they are aria-disabled rather than disabled, Escape returning focus to the invoker, an item press starting neither a pan nor a drag, a far-edge menu opening LEFTWARD FROM ITS INVOKER so its right edge lands on that component's left edge, proven NOT to be sitting at setPos's own clamp (where a regression to clamp-only would leave it, MIN_SIZE away) and paired with an interior menu opening rightward, because either row alone would pass on a menu that always opened the same way \u2014 the flip is arithmetic in menuAnchor since the owner's 2026-09-20 call, not a data-flip-* attribute and a translate rule, so what is asserted is where the menu IS, a scroll closing it, Escape cancelling each multi-verb back to its pre-verb state with the selection surviving a cancel and an undo, a Shift-drag mid-carry starting no marquee (so the two Escape listeners are never both armed), the QUICK group drag landing where the reader released, a compile KEEPING the selection while CANCELLING a live group carry (two rows, because they look like one property), both sides of the replay take-over coupling — a marquee hands over exactly once, \u2318/Ctrl+A deliberately does not — reduced motion completing every verb, and Fit on a COMPILED canvas flooring at 50% with the honest sentence rather than a claim that everything is in view \u00b7 AND #218's DOCKED COMPONENT DOCS, the half build-checks group 23 structurally cannot be: the panel fetching NONE of its three artifacts at rest and carrying no trigger on the canvas until the visitor compiles — the lazy discriminator, invisible to the pixel gate (identical pixels), to drift-check (no artifact) and to CI (no browser) — then EVERY rendered primitive proven a doc trigger that is focusable and described, with the count read off the running page, a pointer click and a keyboard FOCUS each opening that component's docs while focus STAYS ON THE CANVAS (the sole detector of activate(i, true), which would make the keyboard route unusable and leave every other assertion green), the heading level shifted to h4/h5 under the panel's own h3, exactly one code panel painted and changing on a tab press read as COMPUTED display (the hidden attribute is inert under an author rule — the whole reason that rule moved into the shared sheet), the API and token tables printed by the inspector compared STRING FOR STRING against /components in a second page with the live-value column included and BEFORE the pack swap, four more canvas re-renders fetching nothing further with pack.json pinned at exactly one request across the visit and the triggers re-decorated on the new nodes each time, the dock switched to saulera moving live token values with not one var(--\u2026) binding among them, the inspect bubble still opening after a revert+recompile replaced every node, the expert toggle off-by-default and persisted in both directions with the key GONE rather than left as "off", and a 500 on an artifact becoming a SENTENCE in the panel while the canvas stays compiled and nothing the page itself said reaches the console · AND #221's LAYERS LIST + MINIMAP, the running-page halves build-checks groups 26/27 structurally cannot be: the list mirroring the stage in count, ids, names AND order through the page's own layerEntries, a pointer drag and an injected agent move each updating a row's position sentence in the same interaction, a method redraft rebuilding the rows with the frames' rows SURVIVING, selection parity BOTH ways through the one applySelection — a row click announced once with its own count sentence, a marquee's computed id set equal to the rows' pressed set, a second click deselecting — ONE tab stop with roving arrows, Enter on a frame row bringing it into view without touching the selection, the vanished-wrapper refusal as CONTENT, zero inline styles and no position:sticky pinned at runtime, a rebuild UNDER FOCUS keeping focus on the surviving row, a mid-replay row click and map jump both NOT take-overs with the driver still authoring, the view rect equal to mapView's computed answer at rest · panned · zoomed-at-0,0 (the viewport's own style observer being the sole detector now that the scale is a custom property, and the no-timer AC's positive proof), every map cell at nodeRect's answer over the wrapper's four properties, click-to-jump settling at jumpFrom's clamped target with visibleCount's own sentence announced once, one-pitch keyboard pans with a BLOCKED press honestly announcing the unchanged count, the rail issuing ZERO main-frame requests across every interaction, a Compile RE-MEASURING the map — tracks, content box and viewBox, every cell at nodeRect's answer over the fresh boxes — with Back to blocks restoring it exactly (the data-compile-state rebuild branch's only gate), and reduced motion reflecting and tracking identically (${toRun.join(", ")})`);
process.exit(totalFails ? 1 : 0);
