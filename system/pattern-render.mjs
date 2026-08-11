// system/pattern-render.mjs — Act 4 of the pattern builder: the named pattern assembles from the
// visitor's breadboard, through the REAL renderer (epic #134, ticket #137;
// .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
//
// The render path is system/agentic-renderer.mjs's renderComposition, validated against the
// GENERATED handoff/verdant/vocabulary.json, and that is the whole honesty argument of this page
// rather than an implementation convenience: what assembles here is the same {name, props,
// children} format the real build-time agent runs emit, checked by the same validator, refused by
// the same refusal. A bespoke pattern renderer would have been easier and would have proved
// nothing.
//
// Four states, and three of them are designed rather than degraded:
//   1. rendered            — all five patterns, from board-counted slots: dashboard (metric-tile),
//                            queue / feed / settings (list-row), onboarding (sequence-step).
//   2. not in the library  — no pattern reaches this today (#139 completed the five). It is kept as
//                            the contract a SIXTH pattern gets: the rules name it, the library has
//                            no components for it, and a mock-up would be the one dishonest thing
//                            on this page, so the breadboard is shown as the artifact instead.
//                            An unexercised guardrail is still the difference between the next
//                            pattern refusing honestly and shipping a fake before anyone notices.
//   3. empty board         — nothing to arrange yet, one sentence, a way back to Act 3.
//   4. refusal             — the validator threw. Its message renders VERBATIM, the way
//                            agentic-study.mjs treats the boundary probe: naming the offending
//                            path IS the feature. This one IS reachable, and it is the guardrail
//                            the committed gate exercises: a component name outside the generated
//                            vocabulary is refused whatever named it.
//
// Node-import-safe: `compose` is pure and exported for the committed unit gate, every DOM
// reference lives inside a function body, and the mount self-boots behind a `typeof document`
// guard at the very bottom.

import { renderComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { trackBuildPattern } from "./analytics.mjs";
import { BUILD_CHANGE, readBuild } from "./build-questions.mjs";
import { affordanceCount, PATTERNS, patternFor, slotsFor } from "./pattern-rules.mjs";
import { boardSvg } from "./build-card.mjs";
import { morph } from "./morph.mjs";

// The one place a pattern id becomes components. PURE — the committed gate runs it under Node and
// feeds the result straight to validateComposition against the real vocabulary, which is what
// catches a vocabulary regeneration breaking this page.
//
// A slot's `value` is already a string (pattern-rules.mjs stringifies at the boundary). If it ever
// is not, the validator refuses with "expected string, got number" — which is a CORRECT refusal of
// an incorrect composition, and the fix is the rules, never a looser spec.
export function compose(patternId, slots) {
  if (!Array.isArray(slots) || !slots.length) return null;
  if (patternId === "dashboard") return slots.map((props) => ({ name: "metric-tile", props: { ...props } }));
  if (patternId === "queue") return slots.map((props) => ({ name: "list-row", props: { ...props } }));
  if (patternId === "onboarding") return slots.map((props) => ({ name: "sequence-step", props: { ...props } }));
  // WHY QUEUE, FEED AND SETTINGS SHARE A PRIMITIVE. Their derived slot is list-row's contract
  // verbatim — a named thing, one computed reading about it, an optional qualifier — so a
  // `feed-item` and a `settings-row` would be two components with list-row's props and a pattern's
  // name. That is naming a component after where it is used instead of after what it does, the
  // exact mistake metric-tile vs stat-tile was drawn to avoid (list-row.md:23-25 argues it).
  // What actually differs between the three is arrangement, and arrangement is CSS: build.html's
  // .bx-pat-slots.is-queue / .is-feed / .is-settings.
  if (patternId === "feed" || patternId === "settings") return slots.map((props) => ({ name: "list-row", props: { ...props } }));
  return null;
}

// The feed's own honesty line, and the only per-pattern one on this stage. Feed is the one pattern
// SLOT_MAX actually truncates (pattern-rules.mjs:61-72), so it says what it showed of what the
// board holds.
//
// Stated ALWAYS, not only when the two numbers differ. A sentence that appears only when something
// was dropped is a sentence a reader learns to distrust the absence of — and "5 of 5" is the same
// true statement about a board that lost nothing. Pure and exported so the committed gate asserts
// the wording rather than a browser being asked about it.
export function streamNote(shown, counted) {
  const n = counted === 1 ? "affordance" : "affordances";
  return `This stream shows ${shown} of the ${counted} ${n} on your board, in the order the board draws them. A breadboard records no time, so nothing here is ordered by recency: that would be a fact your board does not carry.`;
}

// The honesty line under a rendered pattern. Stated on the stage, at rest, outside any disclosure.
const COUNTED = "Every number on this stage is counted from your breadboard. No data is invented, and no model was called.";

// SHARED WITH THE STUDIO (#207), which is why the sentence about where to find the artifact is NOT
// in it: system/studio-compile.mjs runs this same refusal on /factory's canvas, where nothing
// downloads below anything. The claim both surfaces make is identical and lives here once; where
// the board actually is, is the surface's own sentence, added at each call site.
export const OUT_OF_LIBRARY = "The rules named your pattern. The library doesn't have its components yet, so nothing is rendered here. A mock-up would be the one dishonest thing on this page. Your breadboard is the artifact.";
const OUT_OF_LIBRARY_HERE = "It downloads below.";

export const REFUSED = "The renderer refused this composition. That refusal is the guardrail working. It accepts only components from the generated vocabulary, and it names exactly what failed:";

// The three primitives agentic-renderer.mjs can emit here, paired with their inspect ids (#171).
// Selectors match a toned primitive too — the renderer appends " is-<tone>" to the same class.
// The ids are system-graph consumer ids and are LONG on purpose; they are copied verbatim from
// system/inspect-data.json, never shortened to the component's name.
export const INSPECT_IDS = [
  [".ds-metric-tile", "ds-metric-tile-cross-scenario-library-primitive"],
  [".ds-list-row", "ds-list-row-cross-scenario-library-primitive"],
  [".ds-sequence-step", "ds-sequence-step-cross-scenario-library-primitive"],
];

// --- DOM helper (build-import.mjs:46 shape; duplicated per module by the same decision) --------
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}

// An SVG string into the document without innerHTML. parseFromString gives a document whose root
// is an ordinary node to import: no script runs, no markup is interpreted in the page's context,
// and the string came from build-card.mjs where every visitor label was escaped once already.
function svgNode(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const node = document.importNode(doc.documentElement, true);
  node.setAttribute("aria-hidden", "true"); // the prose beside it carries the meaning
  node.removeAttribute("width");
  node.removeAttribute("height");
  node.setAttribute("class", "bx-pat-board");
  return node;
}

function mount(root) {
  const bus = createBus();
  let vocab = null;
  let vocabError = null;
  let asked = false;

  // Fetched once, and LAZILY: the page must not pay for the vocabulary before a reader has any
  // chance of reaching Act 4. The observer's margin is generous enough that it has always resolved
  // by the time the section is legible; where IntersectionObserver is missing, the fetch simply
  // runs at mount, which is the honest fallback rather than a feature that never arrives.
  async function loadVocab() {
    if (asked) return;
    asked = true;
    try {
      const res = await fetch("/handoff/verdant/vocabulary.json");
      if (!res.ok) throw new Error(`vocabulary.json → ${res.status}`);
      vocab = await res.json();
      if (!vocab || !vocab.components) throw new Error("vocabulary.json carries no components map");
    } catch (err) {
      vocabError = err;
    }
    render();
  }

  const card = (...kids) => el("div", { class: "bx-pat-card" }, ...kids);

  function renderEmpty(reason) {
    root.replaceChildren(card(
      el("p", { class: "bx-pat-eyebrow", text: "No pattern yet" }),
      el("p", { class: "bx-pat-reason", text: reason }),
      el("p", { class: "bx-pat-note" },
        document.createTextNode("Add a place, or give the one you have something to act on, and the pattern appears here. "),
        el("a", { href: "#act-breadboard", text: "Back to the breadboard" }),
        document.createTextNode(".")),
    ));
  }

  function renderOutOfLibrary(pattern, reason, board, tokens) {
    const body = card(
      el("p", { class: "bx-pat-eyebrow", text: "Named, and not rendered" }),
      el("h3", { class: "bx-pat-title", text: pattern.label }),
      el("p", { class: "bx-pat-definition", text: pattern.definition }),
      el("p", { class: "bx-pat-reason", text: reason }),
      el("p", { class: "bx-pat-needs", text: `What it would take: ${pattern.needs}.` }),
      el("p", { class: "bx-pat-note", text: `${OUT_OF_LIBRARY} ${OUT_OF_LIBRARY_HERE}` }),
    );
    const svg = svgNode(boardSvg(board, { tokens }));
    if (svg) body.append(el("div", { class: "bx-pat-boardwrap" }, svg));
    root.replaceChildren(body);
  }

  function renderRefusal(err, reason) {
    // Logged as well as rendered, so a reviewer sees it without reading pixels.
    console.warn("pattern-render: the renderer refused this composition —", err.message);
    root.replaceChildren(card(
      el("p", { class: "bx-pat-eyebrow", text: "Refused" }),
      el("p", { class: "bx-pat-reason", text: reason }),
      el("p", { class: "bx-pat-note", text: REFUSED }),
      el("pre", { class: "bx-pat-refusal" }, el("code", { text: err.message })),
    ));
  }

  function renderUnavailable() {
    root.replaceChildren(card(
      el("p", { class: "bx-pat-eyebrow", text: "Not available" }),
      el("p", { class: "bx-pat-note", text:
        "This pattern renders through the component vocabulary at /handoff/verdant/vocabulary.json, " +
        "generated by agent-layer/gen-vocabulary.mjs. That file could not be read here, so nothing is " +
        "rendered rather than something being drawn around it." }),
    ));
  }

  function renderPattern(pattern, reason, composition, board) {
    const body = card(
      el("p", { class: "bx-pat-eyebrow", text: "Rendered from your build" }),
      el("h3", { class: "bx-pat-title", text: pattern.label }),
      el("p", { class: "bx-pat-reason", text: reason }),
    );
    const slotHost = el("div", { class: `bx-pat-slots is-${pattern.id}` });
    slotHost.append(renderComposition(vocab, composition, bus));
    body.append(slotHost, el("p", { class: "bx-pat-note", text: COUNTED }));
    // Beside COUNTED and in the same register — at rest, outside any disclosure — because it is
    // the same kind of statement: what this stage did with the board it was given.
    if (pattern.id === "feed") {
      body.append(el("p", { class: "bx-pat-note", text: streamNote(composition.length, affordanceCount(board)) }));
    }
    root.replaceChildren(body);
    // Inspect mounts on the primitives this stage just built (#171). Static data-inspect attributes
    // are impossible here — these nodes do not exist until a board names a pattern — so they are
    // applied in JS, which also means tooling/drift-check.mjs's inspect-mounts gate cannot see
    // them: it resolves ids in tracked HTML only. That is why the ids are COPIED from
    // system/inspect-data.json rather than retyped. An id that is not in that file aborts the whole
    // inspect activation at runtime (inspect.mjs:184-186), for every mount on the page.
    for (const [sel, inspectId] of INSPECT_IDS)
      for (const node of root.querySelectorAll(sel)) node.setAttribute("data-inspect", inspectId);
    // The pattern is on stage — THIS is "a pattern rendered", so the event fires here and not at
    // render()'s `root.dataset.patternStage = "ready"` below, which also runs for the empty,
    // out-of-library, refused and vocabulary-unavailable branches. Same lesson the old home peak
    // recorded (system/peak.mjs, deleted by #216): fire from the success path, never a settled flag.
    // Last line on purpose: renderComposition can throw above, and a pattern that never reached the
    // DOM must not be counted. Safe inside render()'s try only because the tracker swallows a
    // refused pushState — without that, a file:// load would render "the renderer refused this
    // composition" about a composition the renderer never saw.
    trackBuildPattern();
  }

  // What the stage last painted, as one string. null until the first COMPLETED render — see the
  // vocabulary-loading branch below, which is load-bearing.
  let prevKey = null;

  // What this stage should draw RIGHT NOW: an identity key, and the call that draws it.
  //
  // Reads the store on EVERY call rather than closing over a snapshot: the vocabulary fetch is
  // async, and a restore or an answer change landing while it was in flight would otherwise render
  // a state the page has already moved past. #171 gave that rule a second, sharper reason — see
  // paint() below.
  function plan() {
    const state = readBuild();
    const { id, reason } = patternFor(state);
    const pattern = id && Object.hasOwn(PATTERNS, id) ? PATTERNS[id] : null;
    const tokens = state.pack ? state.pack.tokens : null;

    if (!pattern) return { key: "empty", draw: () => renderEmpty(reason) };
    if (!pattern.inLibrary) {
      return { key: `out:${id}`, draw: () => renderOutOfLibrary(pattern, reason, state.board, tokens) };
    }
    const composition = compose(id, slotsFor(id, state.board));
    if (!composition) {
      return { key: "empty", draw: () => renderEmpty(`${reason} There is nothing on the board for it to show yet.`) };
    }
    if (vocabError) return { key: "unavailable", draw: renderUnavailable };
    // Still loading; the committed fallback copy holds the section until it lands.
    //
    // A NULL KEY HERE IS WHAT KEEPS BOOT INSTANT. This is the branch every load takes first (the
    // vocabulary fetch is IntersectionObserver-gated), so prevKey is still null when the fetch
    // resolves, and the first render that actually paints is therefore never a morph — including a
    // ?b= share-link restore, which lands while this branch is still being taken. The
    // visual-regression gate captures a page that has done no interaction, so "boot never morphs"
    // is what makes the pixel gate safe. Do not "tidy" this into returning a key.
    if (!vocab) return { key: null, draw: null };
    // The refusal path shares this key on purpose: whether renderComposition throws is decided by
    // the vocabulary and the composition's shape, both of which this key already names, so a
    // separate refusal key would only ever agree with it.
    return {
      key: `pat:${id}:${composition.length}`,
      draw: () => {
        try {
          renderPattern(pattern, reason, composition, state.board);
        } catch (err) {
          renderRefusal(err, reason);
        }
      },
    };
  }

  // Draws whatever the store says NOW — never what it said when the paint was requested.
  //
  // That distinction is the whole reason plan() is re-run here. morph() hands this function to
  // startViewTransition, which calls it a frame LATER, and in that gap a second render can paint a
  // newer state synchronously (morph's re-entrancy guard and the unchanged-key path both paint
  // straight through). A closure captured at request time would then repaint the older state over
  // the newer one — observed as the journey's feed check flaking back to a queue. Re-planning makes
  // every paint idempotent and self-healing instead.
  function paint() {
    const { key, draw } = plan();
    if (key === null) return; // the vocabulary went away again; nothing honest left to draw
    draw();
    root.dataset.patternStage = "ready";
    // The primitives this paint just built are new nodes, so an inspect session that is already on
    // has no listeners on them. Lazy on purpose (palette.mjs:118's idiom): while inspect is off —
    // the default, and every visual-regression capture — this import never happens and the engine
    // costs nothing. Last, and after the ready handle, so a rejected import cannot cost the stage
    // its settled state.
    if (document.documentElement.dataset.inspectMode === "on")
      import("./inspect.mjs").then((m) => m.refreshInspect?.()).catch(() => {});
  }

  // WHY THE IDENTITY KEY (#171). This listener is deliberately unfiltered (build.html's motion
  // block says why): it re-renders on EVERY publish, which includes one per keystroke while a
  // visitor renames a place. Morphing all of those would animate typing. The key names what the
  // stage IS rather than what it holds, so family 3 morphs on exactly the change worth watching —
  // the board naming a different pattern, or a different number of slots — and a rename repaints
  // instantly, as it does today.
  function render() {
    const { key } = plan();
    if (key === null) return; // vocabulary still loading — writes no key, so boot cannot morph
    // First paint, or nothing about the stage's identity moved (the rename case): straight through.
    if (prevKey === null || key === prevKey) paint();
    else morph(paint);
    prevKey = key;
  }

  // Listen AND seed, the discipline breadboard.mjs:169-171 documents: a consumer that mounts before
  // a restore hears the event, and one that mounts after reads the state.
  document.addEventListener(BUILD_CHANGE, render);
  render();

  if (typeof IntersectionObserver === "function") {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      loadVocab();
    }, { rootMargin: "800px 0px" });
    io.observe(root);
  } else {
    loadVocab();
  }
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-pattern-stage]");
  if (root) mount(root);
}
