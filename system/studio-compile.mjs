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
// WHICH BRANCHES THE PAGE EXERCISES, AND WHICH ARE #212's. The build store is in-memory
// (build-questions.mjs:65-73), so at rest /factory is ALWAYS draftBoard(DEFAULT_ANSWERS) → dashboard
// → 3 places, 3 slots, 3 metric-tiles, one per wrapper. The swap's 1:1 branch is therefore the only
// one the shipped page can reach today. The EXTRA branch (more composed components than wrappers)
// and the SURPLUS branch (fewer) are written and reachable only once a board can differ from the
// canvas — which is #212's flows. The SURPLUS branch reverts EXACTLY (the removed wrappers go back
// at their stashed indices); the EXTRA branch does NOT and is #212's to close — it re-mints
// data-stx-id through place()'s counter on every re-compile, and its column choice runs no occupancy
// scan, so a reader who had moved a block into that column could get two components in one cell,
// which the canvas otherwise refuses. Neither is dead code and neither is
// live coverage: tooling/build-checks.mjs group 15 retires the cardinality question for all five
// patterns under Node, which is where that question can be answered honestly.
//
// Node-import safe: no DOM outside a function body and NO self-boot — system/studio.mjs mounts this
// explicitly, and tooling/build-checks.mjs imports the pure layer directly.

import { isBoard } from "./breadboard.mjs";
import { affordanceCount, PATTERNS, patternFor, slotsFor } from "./pattern-rules.mjs";
import { INSPECT_IDS, OUT_OF_LIBRARY, REFUSED, compose } from "./pattern-render.mjs";
import { renderComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { MAX_COLS, clampSlot } from "./studio-canvas.mjs";

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
//   { state, patternId, patternLabel, reason, inLibrary, slots, composition,
//     counted: { places, affordances, connections }, steps }
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

  let state;
  if (!known || !slots.length) state = "empty";
  else if (!composition) state = "out-of-library";
  else state = "rendered";

  const detail = {
    name: known
      ? `${counted.places} places and ${counted.affordances} affordances read as ${known.label.toLowerCase()}`
      : `${counted.places} places and ${counted.affordances} affordances name no pattern`,
    slots: `${slots.length} slots counted from ${counted.places} places, ${counted.affordances} affordances and ${counted.connections} connections`,
    compose: composition
      ? `${composition.length} components composed from ${slots.length} slots`
      : "no components to compose from this board",
    render: composition
      ? `${composition.length} components validated against the generated component vocabulary`
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

// The readout's at-rest line. A FIXED string, like every other string in this file that can end up
// in a settled DOM.
const AT_REST = "Four steps, from the board on this canvas to the components it names.";

let live = null; // the mounted beat — the exported seam below drives THIS one, never a new one

// The driver's seam (studio-canvas.mjs:95 / studio-verbs.mjs:236's idiom, and the reason it is an
// export rather than a window.__ global: page globals are not this repo's test surface).
// tooling/studio-journey.mjs reaches the beat through this, and #209's replay driver takes it over
// through the same handle rather than re-implementing the swap.
export const getCompile = () => live;

// The name a compiled component carries on its wrapper — what the live region says when it is moved
// and what its move handle is labelled with.
//
// The COMPOSED LABEL, not the primitive's name. "metric-tile" is the honest name of the thing, and
// it is also the same string for all three slots, which would leave a screen-reader user with three
// sibling buttons reading "Move metric-tile" and no way to tell them apart. The label prop IS the
// place's own label, counted from the board by pattern-rules.mjs, so this both identifies the slot
// and stays a number-free string this module did not invent.
const nameOf = (node) => {
  const label = node && node.props ? node.props.label : null;
  return typeof label === "string" && label.trim() ? label : String(node && node.name ? node.name : "Component");
};

export function mountCompile(canvas, { board, answers, bus, onState } = {}) {
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
    const setState = (next) => {
      const from = document.activeElement;
      if (from === compileBtn) handOver = revertBtn;
      else if (from === revertBtn) handOver = compileBtn;
      state = next;
      viewport.setAttribute("data-compile-state", next);
      compileBtn.disabled = next !== "blocks";
      revertBtn.disabled = next === "blocks" || next === "compiling";
      if (handOver && !handOver.disabled) {
        handOver.focus();
        handOver = null;
      }
    };
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
      el("p", { class: "stu-compile-note", text:
        `These components render through the vocabulary at ${VOCAB_URL}, generated by `
        + "agent-layer/gen-vocabulary.mjs. That file could not be read here, so the blocks stay as "
        + "they are rather than something being drawn around the gap." })));

    // --- the swap ------------------------------------------------------------------------------
    // POSITIONAL and IN PLACE: the wrappers in DOM order against the composed nodes in composition
    // order. Everything that survives the beat — data-stx-id, data-col, data-row, the aria wiring,
    // the undo history — survives because the wrapper is never rebuilt.
    //
    // Keyed BY WRAPPER so revert() is a lookup rather than a second derivation of what was where.
    const stash = new Map();  // wrapper → { block, name, label }
    const added = [];         // wrappers this beat created  (#212's extra branch)
    const removed = [];       // { wrapper, index } it removed (#212's surplus branch)

    const blockOf = (wrapper) => [...wrapper.children].find((c) => !c.classList.contains("stx-grab")) || null;

    // element.animate() only — it never touches an inline style, so build-checks group 7's write
    // count and tooling/studio-journey.mjs's running-page assertion both stay literally true
    // (studio-verbs.mjs:288-297 makes the same call for the undo/redo travel). A Web Animations
    // animation ignores `animation: none`, so reduced motion is gated HERE as well as in the sheet.
    const fade = (node) => {
      if (!node || reduceMotion()) return;
      node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    };

    function applySwap(composition) {
      const wrappers = [...stage.querySelectorAll(".stx-slot")];
      // ONE validation, ONE refusal path, and the refusal names the exact composition[i] that failed.
      const frag = renderComposition(vocab, composition, actionBus);
      // BEFORE anything is appended — appending consumes a fragment's children, and every count
      // below would then be read off an empty fragment.
      const nodes = [...frag.children];
      // A TRIPWIRE, NOT A LIVE BRANCH, and it says so the way group 1's vacuous clause says so.
      // Every template this beat can reach returns exactly one root today (agentic-renderer.mjs:321
      // metric-tile, :333 list-row, :350 sequence-step), so the counts agree. The day one returns
      // two, the positional swap would misalign SILENTLY and every other assertion on this page
      // would still pass — which is why it ships now rather than then. Caught by the same handler
      // that renders the refusal card.
      if (nodes.length !== composition.length) {
        throw new Error(`the renderer built ${nodes.length} top-level nodes for ${composition.length} composed components, so the positional swap cannot align them`);
      }

      const shared = Math.min(wrappers.length, nodes.length);
      for (let i = 0; i < shared; i += 1) {
        const wrapper = wrappers[i];
        const grab = wrapper.querySelector(".stx-grab");
        const block = blockOf(wrapper);
        stash.set(wrapper, {
          block,
          name: wrapper.getAttribute("data-stx-name"),
          label: grab ? grab.getAttribute("aria-label") : null,
          // The wrapper's vocabulary shape, which the swap is about to change and the revert must
          // put back exactly — a fat-marker block has none, so `null` is a real stashed value here
          // and not a missing one (#232).
          component: wrapper.getAttribute("data-stx-component"),
        });
        const label = nameOf(composition[i]);
        if (block) wrapper.replaceChild(nodes[i], block);
        else wrapper.appendChild(nodes[i]);
        wrapper.setAttribute("data-stx-name", label);
        // The composed node's REAL vocabulary name, so a move of a compiled component puts the
        // shape on the bus and the label under `label` (#232). nameOf() above is deliberately the
        // composed label and not this — three sibling buttons all reading "Move metric-tile" would
        // be indistinguishable to a screen-reader user.
        wrapper.setAttribute("data-stx-component", String(composition[i].name));
        // STILL WRITTEN HERE after #231 moved place()'s aria-label out of its create branch, and
        // the reason is that this swap never calls place(): it renames a wrapper IN PLACE, because
        // place() appends to the stage (re-ordering it) and announces a placement the reader did
        // not ask for. So the handle would keep naming the block that is no longer there.
        if (grab) grab.setAttribute("aria-label", `Move ${label}`);
        fade(nodes[i]);
      }

      // #212's EXTRA branch: more composed components than the canvas holds. Along row 1, breaking
      // at MAX_COLS exactly as studio.mjs's arrangeBoard breaks — a clamp would stack two components
      // on one cell, which the canvas explicitly refuses.
      for (let i = shared; i < nodes.length; i += 1) {
        const col = i + 1;
        if (col > MAX_COLS) break;
        canvas.place(nodes[i], { ...clampSlot({ col, row: 1 }), name: nameOf(composition[i]), component: composition[i].name });
        if (nodes[i].parentElement) added.push(nodes[i].parentElement);
        fade(nodes[i]);
      }

      // #212's SURPLUS branch: fewer composed components than wrappers. The removed wrappers' undo
      // entries survive harmlessly — restore() skips an id with no node on the stage — and that line
      // carries a comment warning it is NOT the phantom-undo path (studio-verbs.mjs:315-322), so
      // this is the case it is talking about.
      for (let i = shared; i < wrappers.length; i += 1) {
        removed.push({ wrapper: wrappers[i], index: i });
        wrappers[i].remove();
      }

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

      const result = compileSteps(board, answers);

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
          applySwap(result.composition);
        } catch (err) {
          // The renderer refuses by THROWING (agentic-renderer.mjs:369-371). Caught here and shown
          // as the refusal card — never left to reject into the console, which studio-journey's
          // no-page-errors contract reads as a failure and a reader never sees at all.
          renderRefusal(err, result);
          return settle("refused", "The renderer refused this composition. The blocks are unchanged and the refusal is printed above.");
        }
      }

      return settle("rendered", `${result.composition.length} blocks are now the components the rules named. Back to blocks replays the beat.`);
    }

    // --- the revert ------------------------------------------------------------------------------
    // EXACT for the swap, in both directions, because the stash is keyed by wrapper: every branch
    // that changed something recorded what it changed, so nothing here is re-derived from the board.
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
        wrapper.setAttribute("data-stx-name", saved.name ?? "Component");
        // Put back or REMOVED, because the pre-compile block had no shape at all and leaving the
        // composed one behind would make the reverted stage differ from the at-rest one — which is
        // AC #3, asserted byte for byte.
        if (saved.component == null) wrapper.removeAttribute("data-stx-component");
        else wrapper.setAttribute("data-stx-component", saved.component);
        const grab = wrapper.querySelector(".stx-grab");
        if (grab && saved.label != null) grab.setAttribute("aria-label", saved.label);
        fade(saved.block);
      }
      for (const wrapper of added) wrapper.remove();
      // Re-inserted AT THEIR INDEX, ascending, so the stage's wrapper order is the one the next
      // compile's positional swap reads. Appending them at the end instead would make a second run
      // align differently from the first, which is AC #3 broken in the branch nothing watches.
      for (const { wrapper, index } of removed) {
        stage.insertBefore(wrapper, stage.children[index] ?? null);
      }
      stash.clear();
      added.length = 0;
      removed.length = 0;

      clearReport();
      viewport.removeAttribute("data-compile-step");
      return settle("blocks", AT_REST, "Back to blocks. The board is on the canvas as it was drafted.");
    }

    compileBtn.addEventListener("click", () => { compile(); }, { signal });
    revertBtn.addEventListener("click", () => { revert(); }, { signal });

    const handleObj = {
      compile,
      revert,
      get state() { return state; },
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
