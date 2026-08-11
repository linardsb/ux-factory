// system/studio-compile.mjs — hand-written canon (this repo; not generated). The studio's COMPILE
// BEAT (epic #202 — docs/epics/prototype-studio.architecture.md §Recommended approach; ticket #207;
// .claude/plans/studio-compile-beat-207.md).
//
// /factory holds the drafted breadboard as fat-marker blocks (system/studio.mjs's placeBlock). This
// file performs the altitude shift the PRD names as the hero mechanic: the blocks SNAP INTO the real
// token-skinned components the committed pipeline produces, in the same canvas slots, keeping the
// reader's arrangement, their undo history and the wrapper ids. It reverts, so the beat can be
// watched again — which is also what makes "run it twice, get the same DOM" something a person can
// check rather than something this file asserts about itself.
//
// The four load-bearing calls, made here so #209's replay and #212's flows inherit rather than
// re-argue them:
//
//   1. IMPORT, NEVER FORK. patternFor, slotsFor, compose, renderComposition, clampSlot, INSPECT_IDS
//      and the two honesty sentences are all imported. This module contributes NO RULE: what names
//      the pattern, what counts the slots and what a slot becomes are decided in
//      system/pattern-rules.mjs and system/pattern-render.mjs, and /build changes with them. A
//      bespoke compiler here would have been shorter and would have proved nothing — the whole
//      argument is that the studio runs the pipeline /build already runs, on the same vocabulary,
//      refused by the same refusal.
//   2. IT IS A CROSSFADE. No view-transition-name is written anywhere in this file or in the block
//      it added to system/studio.css, and morph() is not called. Naming an element for a view
//      transition makes it a stacking context AND a containing block for absolutely positioned
//      descendants; #171 shipped a real at-rest regression through exactly that, and the pixel gate
//      re-baselines that class of bug rather than catching it. The named-group upgrade is gated
//      behind #190 plus a studio state-matrix vt-stack-audit. tooling/vt-verify.mjs asserts the
//      absence AFTER proving the beat actually ran.
//   3. THE SWAP TOUCHES CONTENT, NEVER SLOTS. Movement belongs to system/studio-verbs.mjs's single
//      ui.move consumer. Nothing here emits ui.move, calls applySlot or writes data-col / data-row
//      on an existing wrapper — otherwise #209's replay driver inherits a second mover to fight.
//      Swapping content in place is also what keeps data-stx-id stable, which is what keeps the undo
//      history coherent across the beat.
//   4. DETERMINISM IS A REQUIREMENT, NOT A NICETY. The settled canvas is (or will be, at #209) a
//      pixel baseline. No timestamp, no counter and no randomness reaches an attribute or a string;
//      every step label is a fixed constant and every step detail is built from COUNTED numbers.
//
// SCREENS ARE 1:1 WITH WRAPPERS BY CONSTRUCTION (#212), and that is a fact about the page rather
// than a hope. Screens are places (pattern-rules.mjs's screensFor), and every wrapper on /factory's
// canvas is one place's: the replay driver places exactly one wrapper per place.add and never adds
// or removes one, no canvas verb creates or deletes a wrapper (studio-verbs.mjs only moves them),
// and the ?b= restore arranges places.length wrappers — studio.mjs's arrangeBoard breaks at
// MAX_COLS = 12, which MAX_PLACES = 6 never reaches, and its sent-arrangement branch requires equal
// lengths. The EXTRA and SURPLUS branches #207 wrote for a board that could differ from the canvas
// are therefore DELETED rather than fixed (PR #235's finding L3, closed structurally): they were
// written for a state flows remove, and fixing their id instability and missing occupancy scan
// would have been building correctness into dead code. What guards the unforeseen is the pair of
// TRIPWIRES at the top of applySwap — IDENTITY (#253: the stage no longer holds the exact wrapper
// elements compile() snapshotted beside the board read, which is what a mid-"compiling" redraft or
// a post-settle seek leaves behind, same-count rebuilds included) and COUNT (a wrapper count that
// disagrees with the screen count). Both throw before anything is stashed, are caught by
// compile()'s existing handler, and render as the refusal card: a loud, honest refusal instead of
// a silent misalignment.
//
// Node-import safe: no DOM outside a function body and NO self-boot — system/studio.mjs mounts this
// explicitly, and tooling/build-checks.mjs imports the pure layer directly.

import { isBoard } from "./breadboard.mjs";
import { affordanceCount, PATTERNS, patternFor, screensFor, slotsFor } from "./pattern-rules.mjs";
import { INSPECT_IDS, OUT_OF_LIBRARY, REFUSED, compose, streamNote } from "./pattern-render.mjs";
import { createBus } from "./action-bus.mjs";
import { renderScreen, wireFlow } from "./studio-flow.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 15 drives it in CI with no browser — the
// same split studio-canvas.mjs:34-73, studio-verbs.mjs:60-235 and studio.mjs:47-103 carry.

// The beat, as four named steps. FIXED STRINGS, and that is the whole of call 4 above: a label that
// interpolated a time, a counter or a run id would make two runs of the same board differ, and the
// settled canvas is a baseline. The ids are also the values written to [data-compile-step].
export const STEPS = Object.freeze([
  Object.freeze({ id: "name", label: "Naming the pattern" }),
  Object.freeze({ id: "slots", label: "Counting the slots" }),
  Object.freeze({ id: "compose", label: "Composing the components" }),
  Object.freeze({ id: "render", label: "Rendering through the vocabulary" }),
]);

// compileSteps(board, answers) → the whole beat as data:
//   { state, patternId, patternLabel, reason, inLibrary, slots, composition, screens,
//     counted: { places, affordances, connections }, steps }
//
// `screens` is #212's flow: screensFor's typed screens, each carrying its own compose() output as
// `composition` (null where a screen has nothing to arrange — rule S4's screens), and the entry
// screen carrying streamNote's truncation sentence when the flow's pattern is feed. The top-level
// `slots` and `composition` stay the ENTRY screen's — the entry screen IS #207's single compiled
// screen, which is what makes the flow a strict extension rather than a re-derivation.
//
// `state` is the TERMINAL state of the pure half, and only three of the four render states live
// here — "rendered", "out-of-library" and "empty". The fourth, the refusal, is a DOM fact: it is
// what renderComposition throws with, and pattern-render.mjs:242-272 splits it in exactly the same
// place for exactly the same reason.
//
// EVERY NUMBER IS COUNTED FROM THE BOARD, none invented — pattern-rules.mjs's honesty rule,
// inherited rather than restated. That is also why the per-step `detail` strings are built from
// `counted` and from array lengths and from nothing else.
//
// TOTAL BY CONTRACT: null, garbage, or a board whose fields are junk returns state "empty" and never
// throws (buildSummary's discipline, studio.mjs:91-103).
export function compileSteps(board, answers) {
  const b = isBoard(board) ? board : null;
  const counted = {
    places: b && Array.isArray(b.places) ? b.places.length : 0,
    affordances: affordanceCount(b),
    connections: b && Array.isArray(b.connections) ? b.connections.length : 0,
  };

  const pattern = patternFor({ answers: answers ?? null, board: b });
  const known = pattern.id && Object.hasOwn(PATTERNS, pattern.id) ? PATTERNS[pattern.id] : null;
  const slots = (known ? slotsFor(pattern.id, b) : null) || [];
  // compose() is the one place a pattern id becomes components, and it answers null for a pattern it
  // has no branch for — which is the same answer a pattern outside the library deserves. Not called
  // at all when the rules named nothing, because there is nothing to compose FOR.
  const composition = known && known.inLibrary && slots.length ? compose(pattern.id, slots) : null;

  // #212's flow: one typed screen per place, each carrying its own compose() output. screensFor is
  // total and answers null exactly where patternFor names nothing, so `screens` is null on the same
  // boards `state` reads "empty" for a bare canvas — and non-null with zero-slot screens for a board
  // whose places exist but hold nothing, which the beat still refuses to swap (no entry slots).
  const screens = screensFor(b, answers);
  if (screens) {
    for (const screen of screens) {
      screen.composition = screen.slots.length ? compose(screen.type, screen.slots) : null;
    }
    // Feed is the one derivation SLOT_MAX truncates (pattern-rules.mjs's own argument), and the flow
    // inherits its sentence rather than writing a second one: the entry screen carries streamNote's
    // exact words, whole-board denominator included, and renderScreen prints them beside the rows.
    if (screens[0].type === "feed") {
      screens[0].note = streamNote(screens[0].slots.length, counted.affordances);
    }
  }
  const screenCount = screens ? screens.length : 0;
  const slotTotal = screens ? screens.reduce((n, s) => n + s.slots.length, 0) : 0;
  const composedTotal = screens
    ? screens.reduce((n, s) => n + (s.composition ? s.composition.length : 0), 0)
    : 0;

  let state;
  if (!known || !slots.length) state = "empty";
  else if (!composition) state = "out-of-library";
  else state = "rendered";

  const detail = {
    name: known
      ? `${counted.places} places and ${counted.affordances} affordances read as ${known.label.toLowerCase()}`
      : `${counted.places} places and ${counted.affordances} affordances name no pattern`,
    slots: `${slotTotal} slots across ${screenCount} screens, counted from ${counted.places} places, ${counted.affordances} affordances and ${counted.connections} connections`,
    compose: composition
      ? `${composedTotal} components composed for ${screenCount} screens`
      : "no components to compose from this board",
    render: composition
      ? `${composedTotal} components validated against the generated component vocabulary`
      : "nothing rendered, and nothing mocked up in its place",
  };

  return {
    state,
    patternId: known ? known.id : null,
    patternLabel: known ? known.label : null,
    reason: pattern.reason,
    inLibrary: known ? known.inLibrary : false,
    needs: known ? known.needs : null,
    definition: known ? known.definition : null,
    slots,
    composition,
    screens,
    counted,
    steps: STEPS.map((step) => ({ id: step.id, label: step.label, detail: detail[step.id] })),
  };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// studio-verbs.mjs:216, device-frame.mjs:33). Every node is built element by element — group 7 bans
// every markup-from-string sink across these modules, which is why a hostile board label can never
// become markup anywhere in the studio.
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};

// studio-verbs.mjs:227-228, copied. The CSS half of the off-ramp is declared in system/studio.css
// beside the classes it applies to: the pixel gate captures under NO-PREFERENCE, so a JS-only gate
// is what churns a baseline the day someone adds a transition to one of these classes.
const reduceMotion = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

// The pause between announced steps. Long enough to be a beat a reader can follow, short enough that
// the whole thing is over in under two seconds (four steps, so the walk costs 4 × this).
//
// NON-ZERO UNDER REDUCED MOTION, and that is a deliberate correction rather than a leftover.
// aria-live="polite" announces the FINAL value of the region, not every value written to it: two
// sentences landing in the same task are one announcement, and the reader hears only the second. A
// zero pause here therefore did not merely speed the beat up, it DELETED three of its four steps for
// a screen-reader user — and reduced motion is a preference about motion, not a licence to drop
// time-sequenced content. Short enough to stay imperceptible as pacing, long enough to be a separate
// announcement.
const STEP_MS = 420;
const STEP_MS_REDUCED = 100;
const stepGap = () => (reduceMotion() ? STEP_MS_REDUCED : STEP_MS);

const VOCAB_URL = "/handoff/verdant/vocabulary.json";

// The one sentence this page says when the vocabulary cannot be read. A CONST rather than a literal
// inside renderUnavailable since #210: the keep rail's export needs the same vocabulary and hits the
// same gap through composed(), and a second sentence about the same failure would be this studio
// giving two accounts of one fact. Exported so the rail states it in the SAME WORDS, and so
// build-checks can assert it by identity rather than by substring.
export const VOCAB_UNAVAILABLE = `These components render through the vocabulary at ${VOCAB_URL}, generated by `
  + "agent-layer/gen-vocabulary.mjs. That file could not be read here, so the blocks stay as "
  + "they are rather than something being drawn around the gap.";

// The readout's at-rest line. A FIXED string, like every other string in this file that can end up
// in a settled DOM.
const AT_REST = "Four steps, from the board on this canvas to the components it names.";

let live = null; // the mounted beat — the exported seam below drives THIS one, never a new one

// The driver's seam (studio-canvas.mjs:95 / studio-verbs.mjs:236's idiom, and the reason it is an
// export rather than a window.__ global: page globals are not this repo's test surface).
// tooling/studio-journey.mjs reaches the beat through this, and #209's replay driver takes it over
// through the same handle rather than re-implementing the swap.
export const getCompile = () => live;

// `getBoard` is #209's seam and the ONLY change that ticket needed here. The beat reads `board` at
// exactly one line (:471, inside compile()), so a getter costs two lines and lets the replay driver
// build the board AFTER this mount without the beat compiling a board that no longer exists.
//
// THE REJECTED ALTERNATIVE WAS MOUNTING THIS BEAT AFTER THE REPLAY SETTLES, and it is rejected for a
// measured reason: tooling/vt-verify.mjs:407 waits on [data-studio-compile="ready"] with a 20 s
// timeout, so deferring that handle behind a 14 s playback leaves a 6 s margin on a gate that runs
// on three engines. Every mount and every `finally` handle staying at load is what keeps that
// margin, and it costs two lines.
export function mountCompile(canvas, { board, getBoard, answers, getAnswers, bus, onState } = {}) {
  const viewport = canvas && canvas.viewport;
  try {
    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (studio-verbs.mjs:243-248).
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.say !== "function"
      || typeof canvas.place !== "function") {
      throw new Error("studio-compile: a mounted canvas handle { viewport, scroll, stage, place, say } is required");
    }

    const { stage, scroll } = canvas;
    const actionBus = bus && typeof bus.emit === "function" ? bus : createBus();

    // --- the control row --------------------------------------------------------------------
    // Inserted before the scroller, the verbRow precedent (studio-verbs.mjs:344). Real buttons with
    // visible text: this is the whole affordance, and a reader who never reads a hint has to find it.
    const compileBtn = el("button", { type: "button", class: "btn btn-secondary stu-compile-btn", text: "Compile the board" });
    const revertBtn = el("button", { type: "button", class: "btn btn-secondary stu-compile-btn", text: "Back to blocks" });
    // NOT a second live region — the canvas has exactly one (studio-canvas.mjs:130-133 argues why)
    // and every sentence below goes through canvas.say. This is its visible mirror, nothing more.
    const readout = el("p", { class: "stu-compile-step", text: AT_REST });
    // ON ITS OWN LINE, not a third flex item beside the buttons. .stx-viewport is far wider than the
    // column it sits in (see studio.css's note on the readout), so a wrapping row cannot wrap — the
    // container has room for everything — and a readout beside the buttons would run under the
    // docked inspector at the width the pixel gate captures. Measured, not assumed.
    const row = el("div", { class: "stu-compile" }, compileBtn, revertBtn);
    // Empty at rest, and styled with :not(:empty) so an empty report node has no box at all — the
    // pixel gate captures this page at rest and a placeholder would be a baseline for nothing.
    const report = el("div", { class: "stu-compile-report" });
    viewport.insertBefore(row, scroll);
    viewport.insertBefore(readout, scroll);
    viewport.insertBefore(report, scroll);

    // --- state ------------------------------------------------------------------------------
    // blocks | compiling | rendered | out-of-library | empty | refused | unavailable.
    let state = "blocks";
    // FOCUS IS HANDED OVER, NOT DROPPED. Each verb disables the button the reader just activated, and
    // disabling the active element sends focus to <body> in every engine — so a keyboard reader would
    // Tab from the top of the document to reach the counterpart, on 100% of uses of the page's
    // primary control (the breadboard pattern's "every verb placing focus", inherited).
    //
    // CARRIED ACROSS THE TRANSITION rather than handed over in one shot: "compiling" disables BOTH
    // buttons, so at the instant the reader's button goes disabled there is no enabled counterpart to
    // receive focus. The intent is recorded here and spent at the next setState that enables the
    // target — which is settle()'s terminal state, by which time activeElement is already <body>.
    // Nothing is grabbed at mount: setState("blocks") below runs with focus on <body>, so neither
    // branch arms.
    let handOver = null;
    // #209's SECOND seam here, and the smaller of the two. `getBoard` let the beat read a board
    // built after this mount; this lets the orchestrator say WHEN that board is one worth compiling.
    // It is false only while a replay driver is mid-run — studio.mjs blocks it immediately before
    // mounting the driver and unblocks it on settle, on the visitor's take-over, and on the driver
    // failing to mount at all — so on any page with no driver the beat is live from mount, exactly
    // as before. The alternative, letting the beat compile while the driver is still authoring,
    // puts two authors on one stage (see replay-driver.mjs's syncControls) (PR #240 review,
    // finding 1).
    let blocked = false;
    const setState = (next) => {
      const from = document.activeElement;
      if (from === compileBtn) handOver = revertBtn;
      else if (from === revertBtn) handOver = compileBtn;
      state = next;
      viewport.setAttribute("data-compile-state", next);
      compileBtn.disabled = next !== "blocks" || blocked;
      revertBtn.disabled = next === "blocks" || next === "compiling";
      if (handOver && !handOver.disabled) {
        handOver.focus();
        handOver = null;
      }
    };
    // Goes through setState so the disabled computation lives at exactly one line, and re-reads
    // `state` rather than assuming "blocks": a beat unblocked while it is "rendered" must stay
    // disabled, which is what "Back to blocks" is for.
    const setEnabled = (on) => { blocked = !on; setState(state); };
    setState("blocks");

    // --- teardown ------------------------------------------------------------------------------
    // Declared HERE, above everything that needs it, because both halves of #236 are about work
    // already in flight when the handle is destroyed: the listeners go with the signal, the
    // vocabulary fetch is handed the same signal, and every await in compile() re-reads this flag
    // before it touches the DOM. Unreachable from system/studio.mjs today — #209's driver takes the
    // beat over through getCompile(), and a torn-down beat that keeps writing into the stage would
    // be a second author on a canvas the driver owns.
    const ac = new AbortController();
    const { signal } = ac;
    let destroyed = false;

    // --- the vocabulary ---------------------------------------------------------------------
    // FETCHED ON FIRST COMPILE, NEVER AT LOAD. At rest this page must issue no request of its own
    // (#206's lazy-panel property, which the pixel gate depends on and studio-journey asserts by
    // collecting requests). THE SUCCESS IS MEMOIZED AND THE FAILURE IS NOT (#237): a second compile
    // does not refetch a vocabulary it already has, but a transient failure — one dropped request,
    // one 503 — is not a verdict about the file, and memoizing it disabled the beat for the life of
    // the page. The reader pressing the button again IS the retry, and the honest card already told
    // them what failed.
    let vocab = null;
    async function loadVocabulary() {
      if (vocab) return vocab;
      try {
        const res = await fetch(VOCAB_URL, { signal });
        if (!res.ok) throw new Error(`${VOCAB_URL} → HTTP ${res.status}`);
        const json = await res.json();
        if (!json || !json.components) throw new Error("vocabulary.json carries no components map");
        vocab = json;
      } catch {
        // Swallowed rather than logged: the failure is REPORTED, by renderUnavailable's card and by
        // the settle sentence below. A console.error here would say the same thing to nobody the
        // reader can see and trip studio-journey's no-page-errors contract on the way.
      }
      return vocab;
    }

    // --- the cards ---------------------------------------------------------------------------
    // Three non-rendered outcomes, and in EVERY one of them the fat-marker blocks stay on the canvas
    // untouched. The board is the artifact; nothing is mocked up in place of what did not compile.
    // The two honesty sentences are imported from pattern-render.mjs rather than paraphrased, so
    // /build and the studio make the same statement in the same words or neither does.
    const card = (eyebrow, ...kids) => el("div", { class: "stu-compile-card" },
      el("p", { class: "stu-compile-eyebrow", text: eyebrow }), ...kids);

    const clearReport = () => { report.textContent = ""; };
    const show = (node) => { report.textContent = ""; report.appendChild(node); };

    const renderEmpty = (result) => show(card("No pattern yet",
      el("p", { class: "stu-compile-reason", text: result.reason }),
      el("p", { class: "stu-compile-note", text:
        "Nothing is compiled and the blocks stay as they are. Give the board a place with something to act on and the beat has a pattern to run." })));

    const renderOutOfLibrary = (result) => show(card("Named, and not rendered",
      el("p", { class: "stu-compile-reason", text: result.reason }),
      result.needs ? el("p", { class: "stu-compile-needs", text: `What it would take: ${result.needs}.` }) : null,
      el("p", { class: "stu-compile-note", text: `${OUT_OF_LIBRARY} It is on this canvas as you drafted it.` })));

    const renderRefusal = (err, result) => show(card("Refused",
      el("p", { class: "stu-compile-reason", text: result.reason }),
      el("p", { class: "stu-compile-note", text: REFUSED }),
      el("pre", { class: "stu-compile-refusal" }, el("code", { text: err.message }))));

    const renderUnavailable = () => show(card("Not available",
      el("p", { class: "stu-compile-note", text: VOCAB_UNAVAILABLE })));

    // --- the swap ------------------------------------------------------------------------------
    // POSITIONAL and IN PLACE: the wrappers in DOM order against the screens in board order — the
    // same correspondence, because stage order IS board order (the studio's standing fact). Every
    // attribute that survives the beat — data-stx-id, data-col, data-row, data-stx-name, the aria
    // wiring, the undo history — survives because the wrapper is never rebuilt AND never renamed:
    // a screen keeps the place's own label, which is the name the wrapper already carries, and a
    // screen has no single vocabulary shape, so data-stx-component is not written either (#232's
    // null-stash question answers itself once nothing is written at all).
    //
    // Keyed BY WRAPPER so revert() is a lookup rather than a second derivation of what was where.
    const stash = new Map();  // wrapper → { block }

    // The wrappers compile() read the board BESIDE (#253): applySwap refuses when the stage no
    // longer holds these exact elements — adoptBoard's mid-"compiling" redraft (studio.mjs) and
    // the driver's post-settle seek (replay-driver.mjs:698-716) both remove and re-mint every
    // wrapper, and a same-count rebuild slips the count tripwire below. Element identity is the
    // stamp: no counter reaches an attribute (call 4 above), and no new seam is opened to
    // studio.mjs. Released at settle() so detached wrappers are not pinned for the page's life.
    let stageAtCompile = null;

    const blockOf = (wrapper) => [...wrapper.children].find((c) => !c.classList.contains("stx-grab")) || null;

    // element.animate() only — it never touches an inline style, so build-checks group 7's write
    // count and tooling/studio-journey.mjs's running-page assertion both stay literally true
    // (studio-verbs.mjs:288-297 makes the same call for the undo/redo travel). A Web Animations
    // animation ignores `animation: none`, so reduced motion is gated HERE as well as in the sheet.
    const fade = (node) => {
      if (!node || reduceMotion()) return;
      node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    };

    function applySwap(result) {
      const wrappers = [...stage.querySelectorAll(".stx-slot")];
      const screens = Array.isArray(result.screens) ? result.screens : [];
      // THE IDENTITY TRIPWIRE, first and before anything is stashed (#253): these screens were
      // compiled for the exact wrappers compile() snapshotted beside the board read, and if the
      // stage no longer holds those elements in that order, the swap would dress a NEW board in
      // an OLD board's screens — mislabeled content, wireFlow wired to stale ids, no refusal.
      // Checked BEFORE the count below deliberately: when a redraft changed the count too, both
      // tripwires are true and this sentence is the accurate diagnosis; the count keeps guarding
      // the other defect class (screens that disagree with an untouched stage). Same handler,
      // same refusal card.
      if (!stageAtCompile || wrappers.length !== stageAtCompile.length
        || wrappers.some((w, i) => w !== stageAtCompile[i])) {
        throw new Error("the canvas was redrafted while this compile was mid-beat — these screens were "
          + "compiled from a board that is no longer on the stage, so the swap cannot apply to it");
      }
      // THE COUNT TRIPWIRE, before anything is stashed (the header's construction argument). Screens are
      // 1:1 with wrappers by construction — one place is one wrapper is one screen — so a count
      // that disagrees means something unforeseen changed the stage, and the only honest move is a
      // loud refusal before the swap can misalign anything. Caught by the same handler that renders
      // the refusal card.
      if (wrappers.length !== screens.length) {
        throw new Error(`the canvas holds ${wrappers.length} wrappers for ${screens.length} screens — one place is one wrapper is one screen, so the swap cannot align them`);
      }

      // EVERY screen is built before the first DOM write: renderScreen validates each screen's
      // composition through renderComposition, which refuses by THROWING — and a refusal mid-loop
      // must not leave half the canvas swapped. Building first keeps the refusal atomic: either
      // every screen renders or no wrapper is touched.
      const nodes = screens.map((screen) => renderScreen(screen, { vocab, bus: actionBus }));

      for (let i = 0; i < wrappers.length; i += 1) {
        const wrapper = wrappers[i];
        const block = blockOf(wrapper);
        stash.set(wrapper, { block });
        if (block) wrapper.replaceChild(nodes[i], block);
        else wrapper.appendChild(nodes[i]);
        fade(nodes[i]);
      }

      // The navigation, wired once every screen is on the stage so a click always has somewhere to
      // land. Announcements go through the canvas's ONE live region; reduced motion reaches the
      // scroll through the same JS gate the fade uses.
      wireFlow(wrappers, screens, { say: canvas.say, reduceMotion });

      // Inspect mounts on the primitives this beat just built. The ids are COPIED from
      // system/inspect-data.json via pattern-render.mjs's one list — an id absent from that file
      // aborts the whole inspect activation at runtime, for every mount on the page, which is why
      // there is one list and not two (pattern-render.mjs:210-215 argues it).
      for (const [sel, inspectId] of INSPECT_IDS) {
        for (const node of stage.querySelectorAll(sel)) node.setAttribute("data-inspect", inspectId);
      }
    }

    // --- the beat -------------------------------------------------------------------------------
    let timer = 0;
    // RESOLVED ON TEARDOWN, not merely cleared (#236). destroy() used to clearTimeout and stop
    // there, which left compile()'s async frame awaiting a promise nothing would ever settle — the
    // beat's remaining steps never ran, and neither did anything after them, for the life of the
    // page. Releasing it hands control back to the loop, whose next line is the liveness check.
    let release = null;
    const wait = (ms) => new Promise((resolve) => {
      release = () => { release = null; timer = 0; resolve(); };
      timer = setTimeout(() => { if (release) release(); }, ms);
    });

    const announce = (step) => {
      viewport.setAttribute("data-compile-step", step.id);
      readout.textContent = `${step.label}: ${step.detail}.`;
      canvas.say(`${step.label}: ${step.detail}.`);
    };

    // The one place the beat comes to rest: the readout's visible line, the state attribute, ONE
    // sentence through the canvas's live region, and the orchestrator's inspect refresh. `spoken`
    // exists for the revert, whose readout is the at-rest line and whose announcement is a verb.
    const settle = (next, line, spoken) => {
      // The snapshot dies with the beat (#253): after a redraft the old wrappers are detached,
      // and pinning them past the settle would leak them for the life of the page.
      stageAtCompile = null;
      readout.textContent = line;
      setState(next);
      canvas.say(spoken ?? line);
      if (typeof onState === "function") onState(next);
      return next;
    };

    // A LIVENESS CHECK AFTER EVERY AWAIT (#236). `destroyed` can only be set by destroy(), which
    // has already removed the row, the readout and the report and cleaned the viewport's two
    // attributes — so every line below an await would otherwise be writing into a surface that no
    // longer belongs to this handle. Returning the state rather than throwing keeps the click
    // listener's fire-and-forget call quiet.
    async function compile() {
      if (destroyed || state !== "blocks") return state;
      setState("compiling");
      clearReport();

      // READ AT CALL TIME, never at mount — see getBoard on the signature. compileSteps is total
      // over junk, so a getter that answers nothing yet compiles to "empty" rather than throwing.
      const result = compileSteps(typeof getBoard === "function" ? getBoard() : board,
        typeof getAnswers === "function" ? getAnswers() : answers);
      // In the SAME synchronous block as the board read (#253): the board and the wrappers it
      // will dress are one consistent picture — no await sits between them.
      stageAtCompile = [...stage.querySelectorAll(".stx-slot")];

      // The vocabulary fetch starts NOW and is awaited before the last step only, so the beat begins
      // the moment the reader asks for it rather than after a round trip.
      const vocabReady = result.state === "rendered" ? loadVocabulary() : null;

      for (const step of result.steps) {
        announce(step);
        // EVERY step waits, the last one included. `render` used to fall straight through to the
        // settle sentence, whose only spacing from it was `await vocabReady` — a real round trip on
        // the first compile and a single microtask on every one after (the vocabulary is memoized).
        // So on a re-run both sentences landed in the same task and "Rendering through the
        // vocabulary" was never spoken. The gate could not see it either: countLive counts
        // MutationObserver RECORDS, and coalesced writes still produce one record each.
        await wait(stepGap());
        if (destroyed) return state;
        if (step.id !== "render") continue;
        if (result.state === "empty") {
          renderEmpty(result);
          return settle("empty", "No pattern named, so nothing compiled. The blocks are unchanged.");
        }
        if (result.state === "out-of-library") {
          renderOutOfLibrary(result);
          return settle("out-of-library", "The rules named a pattern the library has no components for. The blocks are unchanged.");
        }
        await vocabReady;
        if (destroyed) return state;
        if (!vocab) {
          renderUnavailable();
          return settle("unavailable", "The component vocabulary could not be read, so nothing was compiled. The blocks are unchanged.");
        }
        try {
          applySwap(result);
        } catch (err) {
          // The renderer refuses by THROWING (agentic-renderer.mjs:369-371), and applySwap's own
          // tripwire throws the same way. Caught here and shown as the refusal card — never left to
          // reject into the console, which studio-journey's no-page-errors contract reads as a
          // failure and a reader never sees at all.
          renderRefusal(err, result);
          return settle("refused", "The renderer refused this composition. The blocks are unchanged and the refusal is printed above.");
        }
      }

      return settle("rendered", `The ${result.screens.length} blocks are now the flow's ${result.screens.length} screens, wired by the board's own connections. Back to blocks replays the beat.`);
    }

    // --- the revert ------------------------------------------------------------------------------
    // EXACT for the swap, in both directions, because the stash is keyed by wrapper and the swap
    // changed exactly one thing per wrapper — its content. Nothing here is re-derived from the
    // board, and nothing else needs restoring: the swap never renamed a wrapper or wrote a shape,
    // so the reverted stage is the at-rest one byte for byte (AC #3, asserted exactly that way).
    // The screens go with their nodes, listeners included — wireFlow attaches to the buttons, so
    // discarding the screen elements whole is the unwire.
    function revert() {
      if (destroyed || state === "blocks" || state === "compiling") return state;

      for (const [wrapper, saved] of stash) {
        const current = blockOf(wrapper);
        if (saved.block) {
          if (current) wrapper.replaceChild(saved.block, current);
          else wrapper.appendChild(saved.block);
        } else if (current) {
          current.remove();
        }
        fade(saved.block);
      }
      stash.clear();

      clearReport();
      viewport.removeAttribute("data-compile-step");
      return settle("blocks", AT_REST, "Back to blocks. The board is on the canvas as it was drafted.");
    }

    compileBtn.addEventListener("click", () => { compile(); }, { signal });
    revertBtn.addEventListener("click", () => { revert(); }, { signal });

    // #210's seam, and it is the same two-line move #209's `getBoard` was: the studio's next ticket
    // needs a READ, not a fork. The keep rail's export has to render renderComposition's OWN output
    // for the board on this canvas, and both halves of that already live here — compileSteps' pure
    // result and the memoized vocabulary. A second compose and a second fetch in that module would
    // be two opinions about what this board renders as, and they would diverge the first time either
    // rule moved.
    //
    // NO DOM WORK AND NO STATE CHANGE: pressing Export must not run the beat, must not swap a
    // wrapper and must not leave the button reading "Back to blocks". It only reads.
    //
    // The vocabulary's DEGRADED branch is INHERITED rather than re-decided: loadVocabulary() answers
    // null on a failure it has already declined to log, and the rail then prints the very sentence
    // renderUnavailable() puts on the page (:350). A third fetch with its own failure copy would be
    // a second opinion about the same gap.
    //
    // Awaits, so it re-checks `destroyed` before returning — the file's liveness rule (:483-487).
    // Answers null for a board with nothing to compose, so the caller has one thing to test.
    async function composed() {
      if (destroyed) return null;
      const result = compileSteps(typeof getBoard === "function" ? getBoard() : board,
        typeof getAnswers === "function" ? getAnswers() : answers);
      if (result.state !== "rendered") return null;
      const vocabulary = await loadVocabulary();
      if (destroyed) return null;
      return { result, vocab: vocabulary };
    }

    const handleObj = {
      compile,
      revert,
      composed,
      setEnabled,
      get state() { return state; },
      get enabled() { return !blocked; },
      steps: STEPS,
      destroy() {
        // THE ORDER IS THE POINT. The flag first, so a frame released below reads it and stops; the
        // abort second, which detaches the listeners AND rejects an in-flight vocabulary fetch;
        // then the pending wait() is RESOLVED rather than merely cleared, or compile()'s frame
        // stays parked on a promise nothing settles and never reaches the check.
        destroyed = true;
        ac.abort();
        if (timer) clearTimeout(timer);
        timer = 0;
        if (release) release();
        row.remove();
        readout.remove();
        report.remove();
        viewport.removeAttribute("data-compile-state");
        viewport.removeAttribute("data-compile-step");
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the boundary throw above, so a gate fails on the missing thing instead
    // of deadlocking to timeout (studio-canvas.mjs:327-330 / device-frame.mjs:195-199).
    viewport?.setAttribute("data-studio-compile", "ready");
  }
}
