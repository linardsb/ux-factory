// system/studio-flow.mjs — hand-written canon (this repo; not generated). The studio's FLOW
// SURFACE (epic #202 — docs/epics/prototype-studio.architecture.md §Data model → "Screen typing";
// ticket #212; .claude/plans/studio-flows-places-screens-212.md).
//
// system/pattern-rules.mjs's screensFor decides WHAT a place becomes — a typed screen with counted
// slots and counted navigation. This module is the only place that decides what a screen LOOKS like
// on the canvas: a heading carrying the place's own label, the composed components rendered through
// the same vocabulary-validated renderer everything else on this site uses, the honest sentence
// where a place has nothing to act on, and the navigation the board's connections drew — as real
// buttons that scroll the canvas, move focus, and announce where the reader landed.
//
// Three calls made here, so a later editor inherits rather than re-argues them:
//
//  1. NAVIGATION IS CHROME, NOT A COMPOSED COMPONENT. The three library primitives are deliberately
//     non-interactive (agentic-renderer.mjs's own headers), and making list-row clickable would
//     change a shipped vocabulary component's contract for every consumer — the Fieldwork slots,
//     /build, the study. The nav buttons below are the surface's furniture, like the export's
//     provenance block: built beside the composed rows, saying what they are, counted from the
//     board and from nothing else.
//
//  2. NO BUS VERB. Canvas navigation is plain buttons — pointer and keyboard converge natively on
//     `click` — and there is no agent path to navigation and no parity claim to construct, so a
//     `ui.navigate` verb would be a bus verb with one emitter and one consumer invented for
//     symmetry. bus-toggles.mjs's lesson was that a CONSUMER was all its feature needed; this
//     feature needs neither. Revisit only when a replay records navigation.
//
//  3. ONE LIVE REGION. Every navigation announces through the injected `say` — the canvas's single
//     announcer (studio-canvas.mjs argues why there is exactly one) — with a fixed, counted
//     sentence: the destination's label, then "screen k of N". Never a second region beside it.
//
// Refusals go to that same live region, never a throw or a console.error (the studio-wide rule;
// tooling/studio-journey.mjs's no-page-errors contract is a real assertion). The one throw that can
// leave this file is renderComposition's own refusal, which is the guardrail working — the caller
// (system/studio-compile.mjs) catches it and renders the refusal card, naming the screen that failed.
//
// Node-import safe: no DOM outside a function body and NO self-boot — system/studio-compile.mjs's
// applySwap is the only mount path, and tooling/build-checks.mjs may import this file freely.

import { renderComposition } from "./agentic-renderer.mjs";
import { EMPTY_SCREEN } from "./studio-export.mjs";

// Copied rather than imported, like every other hand-written canon module (studio-compile.mjs:177,
// studio-canvas.mjs:80). Every node is built element by element — build-checks group 7 bans every
// markup-from-string sink across these modules, which is why a hostile board label can never become
// markup anywhere in the studio.
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

// renderScreen(screen, { vocab, bus }) → one `.stf-screen` element for one of screensFor's screens.
//
// The heading is the flow's FOCUS TARGET: tabindex="-1" so wireFlow can move focus to it on a
// navigation without adding it to the tab order at rest. h4, because it sits under the canvas
// column's own h3 ("The canvas").
//
// ONE validation per screen: `screen.composition` is compileSteps' compose() output for this screen,
// and renderComposition validates it whole before any DOM exists — the refusal it throws names this
// screen by its label, so a reader (and a gate) can see WHICH screen failed rather than only that
// one did. A screen with nothing composed renders EMPTY_SCREEN instead — rule S4's surface, the
// same sentence the exported file carries, imported so the two surfaces cannot drift.
//
// The nav buttons carry the affordance's own label AND where it leads — both counted from the
// board — so the accessible name says what the reader is pressing and what will happen. The
// `data-flow-target` attribute is the board's own place id (machine-assigned p<N>, re-validated by
// the share codec on any restored board), which is what wireFlow joins on.
export function renderScreen(screen, { vocab, bus } = {}) {
  const root = el("section", { class: "stf-screen" });
  root.appendChild(el("h4", { class: "stf-screen-name", tabindex: "-1", text: screen.label || "Screen" }));

  // Feed's truncation sentence, when compileSteps attached one — streamNote's own words with the
  // whole board's denominator, inherited rather than re-phrased (the one real truncation in a flow).
  if (typeof screen.note === "string" && screen.note) {
    root.appendChild(el("p", { class: "stf-note", text: screen.note }));
  }

  if (Array.isArray(screen.composition) && screen.composition.length) {
    root.appendChild(renderComposition(vocab, screen.composition, bus, `screen "${screen.label}"`));
  } else {
    root.appendChild(el("p", { class: "stf-empty", text: EMPTY_SCREEN }));
  }

  if (Array.isArray(screen.nav) && screen.nav.length) {
    const nav = el("nav", { class: "stf-nav", "aria-label": `Where ${screen.label || "this screen"} leads` });
    for (const entry of screen.nav) {
      nav.appendChild(el("button", { type: "button", class: "stf-go", "data-flow-target": entry.targetId },
        el("span", { class: "stf-go-label", text: entry.label }),
        el("span", { class: "stf-go-target", text: ` → ${entry.targetLabel}` })));
    }
    root.appendChild(nav);
  }

  return root;
}

// wireFlow(wrappers, screens, { say, reduceMotion }) — the navigation itself, wired AFTER every
// screen is on the stage so a click always has somewhere to land. wrappers[i] holds screens[i]:
// the studio's standing correspondence (stage order is board order), which the caller's tripwire
// has already enforced by count before this runs.
//
// One click is one navigation is ONE announced sentence: scroll the target's wrapper into view
// (smooth only without reduced motion — the sheet's `scroll-behavior: auto` off-ramp cannot reach
// an explicit behavior option, so the gate is here in JS, studio-compile.mjs's fade() argument),
// focus the target screen's heading with preventScroll so the scroll is not fought, and say where
// the reader landed. The listeners live on the buttons and go with them: revert() discards the
// screen elements whole, so there is nothing to unwire.
export function wireFlow(wrappers, screens, { say, reduceMotion } = {}) {
  const total = screens.length;
  const indexOf = new Map();
  screens.forEach((screen, i) => { if (!indexOf.has(screen.id)) indexOf.set(screen.id, i); });
  const announce = typeof say === "function" ? say : () => {};

  for (const wrapper of wrappers) {
    for (const btn of wrapper.querySelectorAll(".stf-go")) {
      btn.addEventListener("click", () => {
        const k = indexOf.get(btn.getAttribute("data-flow-target"));
        if (k == null || !wrappers[k]) {
          // Unreachable from a valid board — every connection's destination is a place, and every
          // place is a screen — but a refusal is a sentence, never a throw (the studio-wide rule).
          announce("That connection leads to a place that is not on this canvas.");
          return;
        }
        wrappers[k].scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: typeof reduceMotion === "function" && reduceMotion() ? "auto" : "smooth",
        });
        const heading = wrappers[k].querySelector(".stf-screen-name");
        if (heading) heading.focus({ preventScroll: true });
        announce(`${screens[k].label}, screen ${k + 1} of ${total}.`);
      });
    }
  }
}
