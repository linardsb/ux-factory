// system/studio-ledger.mjs — the LEDGER (#434, epic #295): what the agent did, refused and corrected
// on /factory, and what the reader did after taking over, as a read-only, persistent, chronological
// list beside the canvas. A line, once written, stays.
//
// WHY IT EXISTS. canvas.say writes one sentence into one polite live region and the next sentence
// overwrites it (studio-canvas.mjs's announcer) — right for a screen reader, and it means every
// refusal, every layout correction and every narrated beat is gone the moment the next one lands.
// The one exception the page made was the shared-link notice (#210). This module is the general
// case: the agent's side of the performance, kept readable afterwards. The live region is UNTOUCHED
// — every announcement that fires today fires identically; a row here is an addition beside it,
// never a replacement (the screen-reader path is not moved).
//
// THE FOLD IS PURE AND DOM-FREE, so tooling/build-checks.mjs drives it with no browser. Rows are
// { at, source, kind, text }: `at` is a 1-based sequence rather than a clock, so two runs of the
// same stream read the same; `source` is the bus's own pointer | keyboard | agent | voice; `kind` is
// one of KINDS below and nothing else — an unknown kind or a non-string text is REFUSED BY NAME,
// because a ledger that accepts anything is a log. Rows are frozen, and rows() answers a copy.
//
// FED FROM TWO PLACES AND NO NEW VERB. (1) The bus's "*" subscription — action-bus.mjs already
// documents that channel as "the harness log panel" — folds every action into a `did` row whose
// sentence is built from the action's own type and target, the same shape the verbs announce
// ("Card moved to 40, 120."). The driver's two echo types, agent.build-op and agent.note, are the
// ONLY types the fold ignores, because (2) the driver notes each beat itself as it plays it (an op
// → did, a note → narrated, a fence denial → refused), and a beat both folded and noted would be
// two rows for one fact. The four
// driver facts that never crossed the bus — a board refusal, a relayout, a denied call, the
// take-over — reach here through ledger.note() beside the canvas.say that was already there.
//
// THE RENDERER WRITES textContent AND NOTHING ELSE. A row's text can come from a committed trace
// (the fence's message verbatim) or from a bus action's params, and group 7's rule holds here as
// everywhere on this canvas: no markup-from-string sink. Build-checks hands it a hostile string and
// reads it back verbatim; swap textContent for innerHTML and that case goes red.
//
// NOT a console (rows are the sentences the page already says), NOT a history (undo stays
// studio-verbs.mjs's; the ledger records that an undo happened), NOT dismissible, filterable or
// exportable — a list that grows downward and scrolls inside its own box. The mount is empty and
// `hidden` at rest (factory.html), so a page with modules blocked shows nothing new; the renderer
// un-hides it on the first row.

export const KINDS = Object.freeze(["did", "refused", "corrected", "narrated", "took-over"]);
export const SOURCES = Object.freeze(["pointer", "keyboard", "agent", "voice"]);

// The bus's verbs as the words the page already uses for them. ui.move and ui.resize are read
// with their target and params so the sentence is the verbs' own shape; the rest name the verb.
const WORDS = Object.freeze({
  "ui.undo": "Undo.",
  "ui.redo": "Redo.",
  "ui.align-left": "Align left.",
  "ui.align-center": "Align centre.",
  "ui.align-right": "Align right.",
  "ui.align-top": "Align top.",
  "ui.align-middle": "Align middle.",
  "ui.align-bottom": "Align bottom.",
  "ui.distribute-h": "Distribute horizontally.",
  "ui.distribute-v": "Distribute vertically.",
});

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nameOf = (action) => {
  const t = action.target;
  if (!isObj(t)) return "A component";
  return typeof t.label === "string" && t.label.trim() ? t.label.trim() : `Component ${String(t.id ?? "")}`.trim();
};
const num = (v) => (Number.isFinite(v) ? Math.round(v) : "?");

// One sentence per action, or null for the one type the driver notes itself. Pure.
export function describeAction(action) {
  if (!isObj(action) || typeof action.type !== "string") return null;
  if (action.type === "agent.build-op" || action.type === "agent.note") return null;
  const p = isObj(action.params) ? action.params : {};
  switch (action.type) {
    case "ui.move": return `${nameOf(action)} moved to ${num(p.x)}, ${num(p.y)}.`;
    case "ui.resize": return `${nameOf(action)} resized to ${num(p.w)} by ${num(p.h)}.`;
    case "ui.move-group": {
      const n = Array.isArray(p.moves) ? p.moves.length : 0;
      return n === 1 ? "Moved 1 component." : `Moved ${n} components.`;
    }
    default: return WORDS[action.type] ?? `${action.type.replace(/^(ui|agent)\./, "").replace(/-/g, " ")}.`;
  }
}

export function createLedger() {
  const rows = [];
  const listeners = new Set();
  let seq = 0;
  const note = (kind, text, source = "agent") => {
    if (!KINDS.includes(kind)) {
      throw new Error(`ledger: "${String(kind)}" is not a kind — a row is one of ${KINDS.join(" · ")}`);
    }
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`ledger: a ${kind} row needs a sentence, not ${typeof text === "string" ? "an empty string" : typeof text}`);
    }
    if (!SOURCES.includes(source)) {
      throw new Error(`ledger: "${String(source)}" is not a source — the bus's are ${SOURCES.join(" · ")}`);
    }
    seq += 1;
    const row = Object.freeze({ at: seq, source, kind, text });
    rows.push(row);
    for (const fn of listeners) fn(row);
    return row;
  };
  const fold = (action) => {
    const text = describeAction(action);
    if (text === null) return null;
    return note("did", text, SOURCES.includes(action.source) ? action.source : "agent");
  };
  return {
    note,
    fold,
    rows: () => rows.slice(),
    onRow: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

// The second export: rows → <li> under `list`, textContent only; `host` is un-hidden on the first
// row and never re-hidden. Returns the unsubscribe. `host` and `list` are passed rather than
// queried so the DOM stub in build-checks can hand plain nodes in.
export function renderLedger({ host, list }, ledger) {
  if (!host || !list || typeof list.appendChild !== "function") {
    throw new Error("renderLedger: a { host, list } pair of mounted nodes is required");
  }
  const add = (row) => {
    const li = document.createElement("li");
    li.setAttribute("data-kind", row.kind);
    li.setAttribute("data-source", row.source);
    li.textContent = row.text;
    list.appendChild(li);
    host.hidden = false;
  };
  for (const row of ledger.rows()) add(row);
  return ledger.onRow(add);
}
