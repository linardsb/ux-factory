// system/agentic-study.mjs — hand-written canon (this repo; not generated). The designed ask → propose → adjust surface over the agentic bridge (#11) (epic #1, ticket #13; architecture §Agentic UI).
//
// The designed successor to agentic.html's raw harness: a reader picks a question, sees the
// agent's PRECOMPUTED composition rendered to real components, and adjusts it LIVE within the
// guardrails — and watches it REFUSE anything out of vocabulary. The refusal is a PRIMARY
// designed affordance, not an edge case: it IS the thesis (the design system from Exhibit 1 is
// what makes agentic UI safe in Exhibit 2). No live model call — proposals are committed files.
//
// Contract: renderStudy(container, { vocab, entries, bus }) → { destroy() }.
//   entries = the manifest, each with its fetched `composition` array attached (+ optional
//   `label`/`trace` for provenance). The reader adjusts a deep-cloned WORKING COPY — never the
//   committed proposal. Every adjustment routes through validateComposition before re-render;
//   normal controls always render, the boundary-probe always refuses. Adjust intents ride the
//   action bus (ui.*) — the renderer stays passive (the #11 seam), voice-ready by construction.
// DOM-free at the top level (Node-safe import); all DOM is built inside renderStudy, element by
// element (never innerHTML from data) so agent-supplied strings cannot inject markup.

import { renderComposition, validateComposition } from "./agentic-renderer.mjs";

const TONES = ["neutral", "warn", "critical"]; // metric-tile.tone enum (the vocabulary owns the truth)
const PROBE = "urgent"; // deliberately OUT of vocabulary — the boundary the probe reaches past

const clone = (v) => JSON.parse(JSON.stringify(v));

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else if (k === "onclick" || k === "onchange") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

export function renderStudy(container, { vocab, entries, bus } = {}) {
  if (!container || typeof container.replaceChildren !== "function") throw new Error("renderStudy: a DOM container is required");
  if (!vocab || !vocab.components) throw new Error("renderStudy: vocab { components } is required");
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("renderStudy: entries must be a non-empty array");
  if (!bus || typeof bus.emit !== "function") throw new Error("renderStudy: an action bus { emit, on } is required");
  for (const e of entries) if (!Array.isArray(e.composition)) throw new Error(`renderStudy: entry "${e.slug}" is missing its fetched composition array`);

  let picked = entries[0];
  let working = clone(picked.composition);

  // --- skeleton -------------------------------------------------------------
  container.replaceChildren();
  const root = el("div", { class: "study" });

  // ask — the question picker
  const ask = el("div", { class: "study-ask", role: "tablist", "aria-label": "Pick a question" });
  root.appendChild(el("div", { class: "study-block" },
    el("p", { class: "study-eyebrow", text: "Ask" }),
    ask));

  // propose — slot-shaped preview + the raw declarative JSON
  const previewMount = el("div", { class: "study-preview" });
  const dump = el("pre", { class: "study-dump" });
  root.appendChild(el("div", { class: "study-block" },
    el("p", { class: "study-eyebrow", text: "Propose" }),
    el("p", { class: "study-hint", text: "The agent's precomputed composition, rendered to real components. Declarative in (the JSON) → components out — the renderer accepts only what the vocabulary allows." }),
    el("div", { class: "study-propose" },
      el("div", { class: "study-preview-frame" }, previewMount),
      el("div", { class: "study-dump-wrap" }, el("p", { class: "study-dump-label", text: "the composition {name, props, children}" }), dump))));

  // adjust — bounded controls + the boundary-probe refusal (the thesis)
  const controls = el("div", { class: "study-controls" });
  const refusalPanel = el("div", { class: "study-refusal", hidden: true });
  root.appendChild(el("div", { class: "study-block" },
    el("p", { class: "study-eyebrow", text: "Adjust" }),
    el("p", { class: "study-hint", text: "Managed freedom, shown. Change a tile's emphasis, drop or reorder tiles — the renderer re-validates and re-renders. Reach past the vocabulary (the “not in vocabulary” option) and it refuses, naming the exact path. The engineer designed the vocabulary and the bounds; the reader moves inside them." }),
    controls,
    refusalPanel));

  // messages — the bus contract, visible. Every adjustment above rides the action bus as a
  // typed message; on("*") is the contract's documented log tap (action-bus.mjs header). An
  // agent or a voice layer would emit the SAME ui.* types — a new `source`, not a new bus.
  const busList = el("div", { class: "study-bus-list" });
  const busEmpty = el("p", { class: "study-empty", text: "No messages yet — adjust a tile above and its intents appear here." });
  root.appendChild(el("details", { class: "study-bus" },
    el("summary", { class: "study-bus-summary", text: "Messages on the bus" }),
    el("p", { class: "study-hint", text: "The raw action contract, live: type (ui.* = UI → agent) · source modality · target · params. This is the log tap the bus header documents — the same messages an agent or a voice layer would carry." }),
    busEmpty,
    busList));

  // provenance — honest label + a link to the committed real-run trace
  const provenance = el("p", { class: "study-provenance" });
  root.appendChild(provenance);

  container.appendChild(root);

  // --- bus log --------------------------------------------------------------
  const BUS_LOG_MAX = 30; // bound the DOM; newest first
  let busSeq = 0;
  const offBusLog = bus.on("*", (a) => {
    busEmpty.hidden = true;
    busSeq += 1;
    busList.prepend(el("p", { class: "study-bus-row" },
      el("span", { class: "study-bus-seq", text: String(busSeq).padStart(2, "0") }),
      el("code", { class: "study-bus-type", text: a.type }),
      el("span", { class: "study-bus-src", text: a.source }),
      a.target ? el("span", { class: "study-bus-target", text: `${a.target.component}${a.target.id != null ? `#${a.target.id}` : ""}` }) : null,
      a.params ? el("code", { class: "study-bus-params", text: JSON.stringify(a.params) }) : null)); // textContent — agent-supplied strings stay inert
    while (busList.children.length > BUS_LOG_MAX) busList.lastChild.remove();
  });

  // --- behaviour ------------------------------------------------------------
  function setRefusal(message) {
    refusalPanel.replaceChildren();
    if (!message) { refusalPanel.hidden = true; return; }
    refusalPanel.hidden = false;
    refusalPanel.appendChild(el("span", { class: "study-refusal-tag", text: "Refused" }));
    refusalPanel.appendChild(el("code", { class: "study-refusal-msg", text: message })); // verbatim, textContent — untrusted
  }

  function renderPreview() {
    dump.textContent = JSON.stringify(working, null, 2);
    previewMount.className = `study-preview study-preview--${picked.slot}`;
    previewMount.replaceChildren(); // drop prior DOM/listeners before every re-render (trace-player destroy() discipline)
    try {
      previewMount.appendChild(renderComposition(vocab, working, bus));
      setRefusal(null);
    } catch (e) {
      // A bounded adjust should never reach here; degrade to the message, never a blank mount.
      previewMount.appendChild(el("p", { class: "study-empty", text: "The last valid composition is shown above." }));
      setRefusal(e.message);
    }
  }

  // The boundary-probe: build a HYPOTHETICAL with an out-of-vocabulary tone, validate it (it
  // throws), show the exact path-naming message — WITHOUT mutating the working copy. Normal
  // controls always render; the probe always refuses. That contrast IS the exhibit.
  function probe(i) {
    const probed = clone(working);
    probed[i].props = { ...probed[i].props, tone: PROBE };
    bus.emit({ type: "ui.intent", source: "pointer", target: { component: "metric-tile", id: String(i) }, params: { intent: "probe-out-of-vocabulary", tone: PROBE } });
    try {
      validateComposition(vocab, probed);
      setRefusal(`(the probe was accepted — unexpected; "${PROBE}" should not be in the tone enum)`);
    } catch (e) {
      setRefusal(e.message); // e.g. composition[2].props.tone: "urgent" is not in enum [neutral | warn | critical]
    }
  }

  function setTone(i, tone) {
    working[i].props = { ...working[i].props, tone };
    bus.emit({ type: "ui.intent", source: "pointer", target: { component: "metric-tile", id: String(i) }, params: { intent: "set-tone", tone } });
    renderPreview(); renderControls();
  }
  function removeTile(i) {
    working.splice(i, 1);
    bus.emit({ type: "ui.intent", source: "pointer", target: { component: "metric-tile", id: String(i) }, params: { intent: "remove" } });
    renderPreview(); renderControls();
  }
  function moveTile(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= working.length) return;
    [working[i], working[j]] = [working[j], working[i]];
    bus.emit({ type: "ui.intent", source: "pointer", target: { component: "metric-tile", id: String(i) }, params: { intent: "reorder", dir } });
    renderPreview(); renderControls();
  }
  function resetWorking() {
    working = clone(picked.composition);
    bus.emit({ type: "ui.intent", source: "pointer", params: { intent: "reset" } });
    renderPreview(); renderControls();
  }

  function renderControls() {
    controls.replaceChildren();
    working.forEach((node, i) => {
      const row = el("div", { class: "study-control-row" });
      row.appendChild(el("span", { class: "study-control-name", text: node.props?.label ?? node.name }));

      // tone selector — the valid enum PLUS one out-of-vocabulary option (the probe)
      const cur = node.props?.tone ?? "neutral";
      const select = el("select", { class: "study-select", "aria-label": `Tone for ${node.props?.label ?? node.name}` });
      for (const t of TONES) select.appendChild(el("option", { value: t, selected: t === cur }, t));
      select.appendChild(el("option", { value: PROBE }, `${PROBE} — not in vocabulary`));
      select.addEventListener("change", () => {
        const v = select.value;
        if (v === PROBE) { probe(i); select.value = cur; } // non-destructive: refuse, revert the control
        else setTone(i, v);
      });
      row.appendChild(select);

      row.appendChild(el("button", { type: "button", class: "study-btn", title: "Move up", "aria-label": "Move up", onclick: () => moveTile(i, -1) }, "↑"));
      row.appendChild(el("button", { type: "button", class: "study-btn", title: "Move down", "aria-label": "Move down", onclick: () => moveTile(i, 1) }, "↓"));
      row.appendChild(el("button", { type: "button", class: "study-btn", title: "Remove tile", "aria-label": "Remove", onclick: () => removeTile(i) }, "✕"));
      controls.appendChild(row);
    });
    controls.appendChild(el("button", { type: "button", class: "study-btn study-btn--reset", onclick: resetWorking }, "Reset to the agent's proposal"));
  }

  function renderProvenance() {
    provenance.replaceChildren();
    provenance.appendChild(el("span", { class: "study-prov-label", text: picked.label || "Real run, curated for length" })); // verbatim honesty label
    provenance.appendChild(document.createTextNode(" — a real build-time agent run over the Fieldwork fixtures, replayable. "));
    if (picked.trace) provenance.appendChild(el("a", { class: "study-prov-link", href: picked.trace }, "View the committed trace"));
  }

  function pick(entry, tab) {
    picked = entry;
    working = clone(entry.composition);
    for (const t of ask.children) t.setAttribute("aria-selected", String(t === tab));
    renderPreview(); renderControls(); renderProvenance();
  }

  // build the ask tabs
  entries.forEach((entry, i) => {
    const tab = el("button", { type: "button", class: "study-tab", role: "tab", text: entry.question });
    tab.addEventListener("click", () => pick(entry, tab));
    ask.appendChild(tab);
  });

  pick(entries[0], ask.firstChild);

  return { destroy() { offBusLog(); container.replaceChildren(); } };
}
