// system/bus-toggles.mjs — hand-written canon (this repo; not generated). Fieldwork's agentic-slot
// state commands (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces
// "Bus toggles"; ticket #176; .claude/plans/protos-bus-toggles-device-frame-176.md).
//
// system/action-bus.mjs's header documents one bidirectional contract — ui.* is UI→agent, agent.*
// is agent→UI, and `source` is the modality, orthogonal to both. Until this file, NOTHING in the
// repo emitted or consumed an agent.* action: every emit was ui.intent, and the bidirectional claim
// was a header comment a reader had to take on trust. These controls are the demonstration. A
// reader's click, a reader's keypress and a driver-injected agent message are three sources of the
// SAME command, they travel the same bus, one consumer applies all three, and the readout names the
// source verbatim so which one it was is never in doubt.
//
// THE CONTRACT FILE IS NOT EDITED, and that is the design. TYPE_RE already admits "agent.set-tone";
// SOURCES already admits pointer|keyboard|agent|voice. This module is purely a new CONSUMER — if
// you find yourself editing action-bus.mjs to make this work, the design has gone wrong.
//
// HONESTY. This page's whole thesis is human-designed chrome with bounded agentic slots, so a
// reader's click producing an agent.* message must never read as the agent having done something.
// Two things carry that, and neither is decoration: the row says out loud that the reader is
// issuing the command an agent would, and the readout prints `source` verbatim, so a pointer-sourced
// command is visibly pointer-sourced. The tiles' CONTENT is still the committed build-time run's;
// Reset puts that proposal back.
//
// REFUSALS GO TO THE READOUT, NEVER A THROW. action-bus.mjs:71-81 wraps every handler in
// try/catch → console.error, so a thrown refusal would become a console line the reader never sees
// AND would trip tooling/proto-journey.mjs's "exit 1 if any engine logs a page error" contract.
// Writing it into the aria-live readout keeps the refusal a visible affordance — which is the study
// page's whole argument — and keeps the driver's error check a real check. Nothing here throws at
// runtime; even renderComposition's validation errors are caught and shown the same way.
//
// SCOPE OF THE REFUSAL (narrowed deliberately). Each mounted row registers its own consumer and
// filters on the slot part of `target.id`, so an action addressed to the OTHER slot is correctly
// ignored rather than refused — it is simply not that row's business. The consequence, stated
// rather than discovered: an action naming a slot that is not mounted at all is ignored by every
// row and no readout speaks. That is the honest reading of a per-slot consumer; the refusals this
// module owns are the ones on a MATCHING slot — an out-of-range index, or a tone outside TONES.
//
// Node-import safe: no top-level DOM access. All DOM is built element by element (never innerHTML
// from data) — the tile labels are committed agent output and are still treated as untrusted.

import { renderComposition } from "./agentic-renderer.mjs";

// The tone enum, owned here. agentic-study.mjs has the same list as a bare module-scope const
// (:23) and does not export it, so this is a second copy by necessity rather than by choice — and
// a second copy of an enum is exactly the thing that drifts silently. tooling/proto-journey.mjs
// therefore asserts this list against the LIVE vocabulary's metric-tile.props.tone.enum read off
// the running page, so a divergence from handoff/verdant/vocabulary.json fails a check instead of
// sitting there looking correct.
export const TONES = ["neutral", "warn", "critical"];

const clone = (v) => JSON.parse(JSON.stringify(v));

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

let liveBus = null; // the page's bus, captured at first mount

// The driver's seam — the only way tooling/proto-journey.mjs can inject a source:"agent" action
// without a window.__ global (build-journey.mjs:142's module-export idiom). It RETURNS the bus the
// page handed in; it never creates one. proto/fieldwork.html:200 makes exactly one bus for both
// slots, and these toggles must ride that same bus or the parity claim is staged rather than real.
export const getSlotBus = () => liveBus;

export function mountSlotToggles(region, { vocab, composition, bus, slotId } = {}) {
  if (!region || typeof region.appendChild !== "function") throw new Error("bus-toggles: a DOM region is required");
  if (!vocab || !vocab.components) throw new Error("bus-toggles: vocab { components } is required");
  if (!Array.isArray(composition) || composition.length === 0) throw new Error(`bus-toggles: slot "${slotId}" has no rendered composition to command`);
  if (!bus || typeof bus.emit !== "function" || typeof bus.on !== "function") throw new Error("bus-toggles: an action bus { emit, on } is required");

  const fill = region.querySelector(".proto-slot-fill");
  if (!fill) throw new Error(`bus-toggles: slot "${slotId}" has no .proto-slot-fill to re-render into`);

  liveBus ??= bus;

  // The reader adjusts a deep-cloned WORKING COPY; the committed proposal is never mutated
  // (agentic-study.mjs:26,48 — the same discipline, for the same reason).
  let working = clone(composition);
  const nameOf = (node, i) => node.props?.label ?? `${node.name} ${i + 1}`;

  // --- the control row ------------------------------------------------------------------
  const row = el("div", { class: "bt-row" });

  row.appendChild(el("p", {
    class: "bt-hint",
    text: "These controls send the surface the same command an agent sends: same action, different"
      + " source. An agent still wrote what the tiles say, at build time; Reset puts its proposal back.",
  }));

  const controls = el("div", { class: "bt-controls" });

  // target picker — which composed node the command addresses
  const target = el("select", { class: "bt-target", "aria-label": `Tile to command in the ${slotId} slot` });
  working.forEach((node, i) => target.appendChild(el("option", { value: String(i), text: nameOf(node, i) })));
  controls.appendChild(target);

  // tone — native radios, the dock's pack-switcher precedent (dock.mjs:166). Arrow-key movement
  // and focus management come free, and the manifest counts the group as one control. A hand-rolled
  // role="radiogroup" + roving tabindex would be three aria-pressed buttons wearing radio clothes.
  const tones = el("fieldset", { class: "bt-tones" }, el("legend", { text: "Tone" }));
  const radios = TONES.map((tone) => {
    const input = el("input", {
      type: "radio",
      class: "bt-tone",
      name: `bt-tone-${slotId}`,
      value: tone,
      "aria-label": `Set ${tone}`,
    });
    tones.appendChild(el("label", { class: "bt-tone-opt" }, input, tone));
    return input;
  });
  controls.appendChild(tones);

  const reset = el("button", { type: "button", class: "bt-reset", text: "Reset to the agent's proposal" });
  controls.appendChild(reset);
  row.appendChild(controls);

  // The readout IS the honesty surface, so it is never hidden — it carries its own empty state.
  const readout = el("p", { class: "bt-readout", "aria-live": "polite", text: "Nothing sent yet. Command a tile and the message shows here." });
  row.appendChild(readout);
  region.appendChild(row);

  // --- rendering ------------------------------------------------------------------------
  function repaint() {
    fill.replaceChildren(); // drop prior DOM/listeners before every re-render
    try {
      fill.appendChild(renderComposition(vocab, working, bus));
    } catch (e) {
      // Should be unreachable through the bounded controls above, but a validation error must
      // degrade to the message rather than to a blank slot — and it goes to the readout, not a throw.
      say(`refused: ${e.message}`, true);
    }
  }

  // Reflect the selected target's CURRENT tone onto the radios, so the group always describes the
  // tile it addresses rather than the last command sent.
  function reflect() {
    const i = Number(target.value);
    const cur = working[i]?.props?.tone ?? "neutral";
    for (const r of radios) r.checked = r.value === cur;
  }

  function say(text, refused) {
    readout.textContent = text;
    if (refused) readout.setAttribute("data-refused", "");
    else readout.removeAttribute("data-refused");
  }

  // --- emit -----------------------------------------------------------------------------
  // The controls EMIT and do nothing else. Everything visible happens in the consumer below, which
  // is what makes the three sources genuinely interchangeable rather than three code paths that
  // happen to agree.
  function command(tone, e) {
    const i = Number(target.value);
    bus.emit({
      type: "agent.set-tone",
      // agentic-renderer.mjs:208's idiom, verbatim: a keyboard-activated click reports detail 0.
      source: e && e.detail === 0 ? "keyboard" : "pointer",
      target: { component: working[i]?.name ?? "metric-tile", id: `${slotId}:${i}` },
      params: { tone },
    });
  }

  tones.addEventListener("click", (e) => {
    const input = e.target.closest("input.bt-tone");
    if (!input) return;
    command(input.value, e);
  });

  target.addEventListener("change", reflect); // changing WHICH tile is not itself a command

  reset.addEventListener("click", (e) => {
    working = clone(composition);
    // Rebuild the picker's labels too — a reset restores the proposal's own names.
    target.replaceChildren();
    working.forEach((node, i) => target.appendChild(el("option", { value: String(i), text: nameOf(node, i) })));
    repaint();
    reflect();
    say(`reset · source: ${e && e.detail === 0 ? "keyboard" : "pointer"} · the agent's proposal is back`);
  });

  // --- consume --------------------------------------------------------------------------
  // The one place a tone actually changes. Re-renders through renderComposition — never a
  // hand-patched class toggle — because validate-before-DOM is the exhibit's guarantee and
  // bypassing it would silently drop the thing this page exists to show.
  const off = bus.on("agent.set-tone", (action) => {
    const id = String(action?.target?.id ?? "");
    const cut = id.lastIndexOf(":"); // slot ids contain "-" but never ":"
    if (cut < 0 || id.slice(0, cut) !== slotId) return; // another slot's action — not ours to refuse

    // Parsed strictly against digits, not with Number(): Number("") is 0 and Number(" 1 ") is 1,
    // so a bare "summary-strip:" would silently address tile 0 instead of being refused.
    const raw = id.slice(cut + 1);
    const i = /^\d+$/.test(raw) ? Number(raw) : NaN;
    const tone = action?.params?.tone;
    if (!Number.isInteger(i) || i >= working.length) {
      say(`refused: no tile ${JSON.stringify(raw)} in this slot (it holds ${working.length})`, true);
      return; // DOM untouched
    }
    if (!TONES.includes(tone)) {
      say(`refused: tone ${JSON.stringify(tone)} is not in [${TONES.join(" | ")}]`, true);
      return; // DOM untouched
    }

    working[i].props = { ...working[i].props, tone };
    repaint();
    if (Number(target.value) === i) reflect();
    say(`${action.type} · source: ${action.source} · target: ${action.target.component}#${id} · tone: ${tone}`);
  });

  reflect();

  return {
    destroy() {
      off();
      row.remove();
      if (liveBus === bus) liveBus = null;
    },
  };
}
