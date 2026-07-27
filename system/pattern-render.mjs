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
//   1. rendered            — dashboard (metric-tile) or queue (list-row), from board-counted slots.
//   2. not in the library  — feed / onboarding / settings. The rules named it, the library has no
//                            components for it, and a mock-up would be the one dishonest thing on
//                            this page. The breadboard is the artifact, and it is shown.
//   3. empty board         — nothing to arrange yet, one sentence, a way back to Act 3.
//   4. refusal             — the validator threw. Its message renders VERBATIM, the way
//                            agentic-study.mjs treats the boundary probe: naming the offending
//                            path IS the feature.
//
// Node-import-safe: `compose` is pure and exported for the committed unit gate, every DOM
// reference lives inside a function body, and the mount self-boots behind a `typeof document`
// guard at the very bottom.

import { renderComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { BUILD_CHANGE, readBuild } from "./build-questions.mjs";
import { PATTERNS, patternFor, slotsFor } from "./pattern-rules.mjs";
import { boardSvg } from "./build-card.mjs";

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
  return null;
}

// The honesty line under a rendered pattern. Stated on the stage, at rest, outside any disclosure.
const COUNTED = "Every number on this stage is counted from your breadboard. No data is invented, and no model was called.";

const OUT_OF_LIBRARY = "The rules named your pattern. The library doesn't have its components yet, so nothing is rendered here. A mock-up would be the one dishonest thing on this page. Your breadboard is the artifact, and it downloads below.";

const REFUSED = "The renderer refused this composition. That refusal is the guardrail working. It accepts only components from the generated vocabulary, and it names exactly what failed:";

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
      el("p", { class: "bx-pat-note", text: OUT_OF_LIBRARY }),
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

  function renderPattern(pattern, reason, composition) {
    const body = card(
      el("p", { class: "bx-pat-eyebrow", text: "Rendered from your build" }),
      el("h3", { class: "bx-pat-title", text: pattern.label }),
      el("p", { class: "bx-pat-reason", text: reason }),
    );
    const slotHost = el("div", { class: `bx-pat-slots is-${pattern.id}` });
    slotHost.append(renderComposition(vocab, composition, bus));
    body.append(slotHost, el("p", { class: "bx-pat-note", text: COUNTED }));
    root.replaceChildren(body);
  }

  // Reads the store on EVERY call rather than closing over a snapshot: the vocabulary fetch is
  // async, and a restore or an answer change landing while it was in flight would otherwise render
  // a state the page has already moved past.
  function render() {
    const state = readBuild();
    const { id, reason } = patternFor(state);
    const pattern = id && Object.hasOwn(PATTERNS, id) ? PATTERNS[id] : null;
    const tokens = state.pack ? state.pack.tokens : null;

    if (!pattern) {
      renderEmpty(reason);
    } else if (!pattern.inLibrary) {
      renderOutOfLibrary(pattern, reason, state.board, tokens);
    } else {
      const composition = compose(id, slotsFor(id, state.board));
      if (!composition) {
        renderEmpty(`${reason} There is nothing on the board for it to show yet.`);
      } else if (vocabError) {
        renderUnavailable();
      } else if (!vocab) {
        return; // still loading; the committed fallback copy holds the section until it lands
      } else {
        try {
          renderPattern(pattern, reason, composition);
        } catch (err) {
          renderRefusal(err, reason);
        }
      }
    }
    root.dataset.patternStage = "ready";
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
