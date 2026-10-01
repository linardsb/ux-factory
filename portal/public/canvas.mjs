// portal/public/canvas.mjs — hand-written canon (this repo; not generated). The build canvas's page
// module (epic #295 ticket #306; docs/epics/canvas-design-import.architecture.md; .claude/plans/
// canvas-page-run-list-arrangement-ops-306.md, Tasks 5.2-5.4).
//
// WHAT IT DOES. Loads one build run from /api/canvas/run, places its frames, notes and decision cards
// on the #302 free canvas under the DOCUMENT's own ids (f1, n1, d7), and turns the owner's gestures
// into canvas-ops ops. Every change lands in the run package through /api/canvas/save: new ops as
// appended ledger lines, positions as canvas.json's authored half.
//
// FOUR CALLS, EACH A DECISION:
//
//   1. ONE UNDO STACK (D8, T9). The verbs own the history; this page hands them a docHook, so a
//      snapshot carries the document beside the positions and one Cmd+Z undoes whichever came last.
//      adapter.restore turns the difference between two documents into `undone` / `applied` ledger
//      lines that RESTATE the ops (D1) — the store's fold checks each undo against the top of stack.
//   2. NO SAVE WITHOUT A GESTURE (D11). Placement on load goes through canvas.place, never the bus,
//      and the only save trigger is the bus wildcard consumer. Opening the in-repo spine writes nothing.
//   3. A REFUSED OP IS ANNOUNCED AND NOT SENT (D10). `refused` is a proposal's status; the owner's
//      refused gesture recorded nothing, so the ledger says nothing about it.
//   4. EVERY STRING FROM THE PACKAGE IS textContent. Transcript answers, questions and notes are
//      someone's words, and nothing here builds markup from a string.
//   5. A FROZEN ORIGINAL NEVER ENTERS A FRAME (G7, #475). A Mode 2 import is an exhibit node beside the
//      flow. After every gesture that can move geometry — ui.move, ui.move-group (align and
//      distribute emit it too), ui.resize, ui.frame-size (the inspector changes a width without
//      ui.resize) and ui.redo (which restores a box without emitting ui.move) — the page runs
//      canvas-ops.mjs's exhibitClashes over the SAME two arguments the server's arrangement uses (the
//      document and gatherPositions()), so the two agree by construction. A clash is undone at once,
//      every pending line the refused gesture added is dropped (call 3: it recorded nothing), and the
//      refusal is said aloud. flush() is the backstop: a clash that reaches it is not sent, and the
//      page does NOT go broken — the next clean gesture saves everything pending.
//   6. THE AGENT PROPOSES, THE OWNER DISPOSES (#312). A proposal is never in `doc`: the server writes
//      it as a `proposed` agent line, which enters no fold. Accept is the owner's own op on THIS page's
//      one undo stack (an `accepted` line carrying `fromStep`), so Cmd+Z takes the frame away with an
//      `undone` line like any other op; Refuse is a `refused` line with `fromStep`, off the stack. A
//      turn never reloads the page, unlike canvas-import.mjs call 1: nothing the page's history has
//      not seen entered the fold, so adopting the returned `count` is enough and the history survives.
//
//   7. A LANE IS DRAFTED, THEN KEPT AS ONE OP (#314, owner 2026-09-29). Edits in a draft change nothing on disk;
//      Keep lane writes one variant.add with the whole override map; a kept lane is read-only until a lane edit
//      verb exists. Switching lanes is view state and saves nothing. The draft is previewed through the REAL
//      applier (viewDoc), so a bad draft is refused at the gesture, never at Keep.
//
// The driver seam is getCanvasPage() (studio-verbs.mjs's getVerbs idiom): page globals are not this
// repo's test surface.

import { renderComposition } from "/system/agentic-renderer.mjs";
import { createBus } from "/system/action-bus.mjs";
import { initStudioCanvas, NODE_H } from "/system/studio-canvas.mjs";
import { mountCanvasVerbs } from "/system/studio-verbs.mjs";
import { mountCanvasSelect } from "/system/studio-select.mjs";
import { mountStudioLayers } from "/system/studio-layers.mjs";
import { mountStudioMinimap } from "/system/studio-minimap.mjs";
import { applyOp, EXHIBIT_SIZE, exhibitClashes, exhibitsOf, frameTree, groupInstances, laneDoc, laneKeys, missingStates, placeDecision, reconfirmRefs, staleFrames, stateDiagram } from "/system/canvas-ops.mjs";
import { PRESET_NAMES, WIDTH_MAX, WIDTH_MIN, presetWidth } from "/system/device-presets.mjs";
import { groupFieldsets, mountPromoted } from "/canvas-groups.mjs";

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
const canon = (v) => (v && typeof v === "object" && !Array.isArray(v)
  ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`
  : (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v)));
const $ = (s) => document.querySelector(s);

const CARD_W = 280; // placeDecision's size.w — the rule and the card agree on one number
const NOTE_W = 240;
const ROW_GAP = 64;

const qs = new URLSearchParams(location.search);
const provenance = qs.get("provenance");
const slug = qs.get("slug");

let doc = null;
let effective = [];
let count = 0;
let pending = [];
let decisions = null;
let vocab = null;
let canvas = null;
let bus = null;
let verbs = null;
// id → the /api/canvas/run `exhibits` entry (name, record, tool, file, attribution, licence, PNG).
let exhibitMeta = new Map();

// id → { wrap, node, kind, sig, details? } for every node this page placed.
const onStage = new Map();
// id → the last AUTHORED box this page knows ({x, y, w?, h?}): canvas.json's, then this session's.
const boxes = new Map();
// Frames whose height is authored (canvas.json said so, or the owner resized it). Every other frame's
// height is its content's, measured here and never saved — the file stays silent about it.
const authoredH = new Set();
// Notes placed by "Add note" and not yet in the document.
const drafts = new Set();
let lastSavedKey = null;
let saving = false;
let again = false;
let broken = false;
// #312: the compose view (/api/canvas/run's `compose`), whether a turn is in flight, and the last
// thing the panel has to say that the view does not (a refusal the server answered as data).
let compose = null;
let composing = false;
let composeNote = "";

// #314: the active lane (null = lane A) and the lane being drafted ({ key, overrides }), if any.
let lane = null;
let laneDraft = null;
// The document the stage shows: the saved one, plus the draft lane previewed through the real applier.
const viewDoc = () => (laneDraft ? applyOp(doc, { op: "variant.add", params: { key: laneDraft.key, overrides: laneDraft.overrides } }) : doc);
let view = null; // viewDoc(), computed once per reconcile

export const getCanvasPage = () => ({ doc, effective, count, pending, compose, lane, laneDraft });

// ---- names and sentences ---------------------------------------------------------------------------

const frameOf = (id) => doc.frames.find((f) => f.id === id);
const frameName = (f) => {
  if (!f.baseId) return f.screenId ?? f.id;
  const base = frameOf(f.baseId);
  return `${f.stateKey} of ${base?.screenId ?? f.baseId}`;
};
const spoken = (f) => `${frameName(f)} (${f.id})`;
const decisionOf = (ref) => (Array.isArray(decisions) ? decisions.find((d) => d.id === ref) : undefined);
const refsInOrder = () => {
  const seen = [];
  for (const f of doc.frames) for (const r of f.decisionRefs ?? []) if (!seen.includes(r)) seen.push(r);
  return seen;
};
const describeOp = (o) => {
  const p = o.params ?? {};
  switch (o.op) {
    case "annotate": return p.noteId ? `edited note ${p.noteId}` : "added a note";
    case "frame.link": return `linked ${p.frameId} to ${p.decisionRefs?.length ? `decisions ${p.decisionRefs.join(", ")}` : "no decision"}`;
    case "frame.remove": return `removed ${p.frameId}`;
    case "frame.size": return `resized ${p.frameId} to ${p.preset ?? `${p.width} px`}`;
    case "component.propose": return p.groupId ? `proposed ${p.name} from group ${p.groupId}` : `proposed ${p.name} from import ${p.recordId}`;
    case "group.define": return p.groupId ? `redefined ${p.groupId}` : `saved group ${p.name}`;
    case "group.place": return p.instanceId ? `overrode ${p.instanceId}` : `placed ${p.groupId} on ${p.frameId}`;
    case "proposal.ratify": return `ratified ${p.proposalId} as ${p.component}`;
    case "screen.compose": return `composed ${p.screenId}`;
    case "state.add": return `added the ${p.stateKey} state of ${p.baseId}`;
    case "variant.add": return `kept lane ${p.key}`;
    default: return o.op;
  }
};

const setSave = (text) => { $("[data-canvas-save]").textContent = text; };

// ---- reading positions -----------------------------------------------------------------------------

const readBox = (wrap) => {
  const prop = (n) => parseFloat(wrap.style.getPropertyValue(n));
  const h = prop("--h");
  return { x: prop("--x") || 0, y: prop("--y") || 0, w: prop("--w") || 0, h: Number.isFinite(h) ? h : null };
};

// The authored half of canvas.json, read off the stage: {x, y, h?} for a frame (its width is the
// document's), {x, y, w} for a note or a card.
const gatherPositions = () => {
  const out = {};
  for (const [id, entry] of onStage) {
    if (drafts.has(id)) continue;
    const b = readBox(entry.wrap);
    out[id] = entry.kind === "frame"
      ? { x: b.x, y: b.y, ...(authoredH.has(id) && b.h != null && { h: b.h }) }
      : { x: b.x, y: b.y, w: b.w };
  }
  return out;
};

// Authored boxes only, for placeDecision — the rule the Node regeneration used, so both sides agree.
const takenBoxes = () => [...boxes.entries()].map(([id, b]) => {
  const f = frameOf(id);
  return { x: b.x, y: b.y, w: f ? f.width : b.w, ...(b.h != null && { h: b.h }) };
});

// ---- building nodes -------------------------------------------------------------------------------

function frameParts(f) {
  const tree = frameTree(view, f.id, lane);
  const screen = el("div", { class: "cv-screen" });
  if (tree.flags.some((fl) => fl.kind === "omitted")) screen.appendChild(el("p", { class: "cv-flag cv-omitted", text: `Not in lane ${lane}` }));
  else if (tree.tree) {
    try { screen.appendChild(renderComposition(vocab, tree.tree)); }
    catch (e) { screen.appendChild(el("p", { class: "cv-flag", text: `Refused: ${e.message}` })); }
  }
  if (tree.flags.length) {
    screen.appendChild(el("p", { class: "cv-flag", text: `Flagged: ${tree.flags.map((fl) => `${fl.kind}${fl.partId ? ` ${fl.partId}` : ""}`).join(", ")}` }));
  }
  const chips = el("span", { class: "cv-chips" });
  if (!(f.decisionRefs ?? []).length) chips.appendChild(el("span", { class: "cv-chip cv-chip-none", text: "No decision linked" }));
  const stale = staleOf().filter((x) => x.frameId === f.id);
  for (const r of f.decisionRefs ?? []) {
    const x = stale.find((y) => y.ref === r);
    if (!x) { chips.appendChild(el("span", { class: "cv-chip", text: `Decision ${r}` })); continue; }
    chips.appendChild(el("span", { class: "cv-chip cv-chip-stale", text: x.status === "stale" ? `Decision ${r} changed since linked — now ${x.latest}` : `Decision ${r} not found` }));
  }
  // D2 (#318): one Re-confirm re-pins every stale ref of this frame to its chain head, in one frame.link.
  const rows = stale.filter((x) => x.status === "stale");
  if (rows.length) chips.appendChild(el("button", { type: "button", class: "btn btn-secondary cv-btn cv-reconfirm-btn", "data-cv-reconfirm": f.id, "aria-label": `Re-confirm ${frameName(f)}: ${rows.map((x) => `decision ${x.ref} → ${x.latest}`).join(", ")}`, text: "Re-confirm" }));
  // G27 (#312): each state the completeness check says this base screen lacks is one ask for a proposal.
  const missing = el("span", { class: "cv-missing" });
  for (const key of missingOf(f)) {
    // In a lane other than A the check is shown, never asked: a compose state proposal is an A-lane state.add.
    if (lane !== null) { missing.appendChild(el("span", { class: "cv-chip", text: `${key}: missing in lane ${lane}` })); continue; }
    missing.appendChild(el("button", { type: "button", class: "btn btn-secondary cv-btn cv-missing-btn", "data-cv-ask-state": `${f.id}:${key}`, "aria-label": `Ask for a proposal: the ${key} state of ${frameName(f)}`, text: `${key}: missing` }));
  }
  return { screen, name: el("span", { class: "cv-name", text: frameName(f) }), chips, missing };
}

const groupInstancesOf = (frameId) => groupInstances(doc).filter((i) => i.frameId === frameId).map((i) => i.instanceId);
const missingOf = (f) => (f.baseId ? [] : missingStates(view, lane).find((m) => m.frameId === f.id)?.missing ?? []);
// Decisions are not lane-scoped, so stale reads doc, never view. A stand-in (decisions null) answers [].
const staleOf = () => staleFrames(doc, decisions);
const frameSig = (f) => canon({ lane, tree: frameTree(view, f.id, lane), w: f.width, name: frameName(f), refs: f.decisionRefs ?? [], missing: missingOf(f), stale: staleOf().filter((x) => x.frameId === f.id) });

function fillFrame(entry, f) {
  const { screen, name, chips, missing } = frameParts(f);
  // Re-inserting a focused button blurs it, so the Details button keeps its focus across a re-render.
  const hadFocus = document.activeElement === entry.details;
  const cap = el("p", { class: "stx-frame-cap cv-cap" }, name, chips, missing, entry.details);
  entry.node.replaceChildren(screen, cap);
  if (hadFocus) entry.details.focus();
  entry.node.dataset.stxName = frameName(f);
  entry.sig = frameSig(f);
}

// A frame with no authored height is as tall as what it renders: placed, measured, re-placed.
function fitHeight(id, entry) {
  if (authoredH.has(id)) return;
  const need = Math.ceil(entry.node.scrollHeight) + 2; // the wrapper's 1px border, top and bottom
  canvas.place(entry.node, { h: Math.max(NODE_H, need) });
}

function placeFrame(f, i) {
  const details = el("button", { type: "button", class: "btn btn-secondary cv-btn cv-details", "data-cv-details": f.id, "aria-haspopup": "dialog", "aria-label": `Details for ${frameName(f)}`, text: "Details" });
  details.addEventListener("click", () => openInspector(f.id, details));
  const node = el("div", { class: "stx-frame-box cv-frame" });
  const entry = { node, kind: "frame", details, sig: null, wrap: null };
  fillFrame(entry, f);
  // A frame canvas.json has no box for gets the default row, and that placement joins the authored
  // set so a decision card placed after it cannot land on top of it.
  if (!boxes.has(f.id)) boxes.set(f.id, { x: i * (f.width + ROW_GAP), y: 0 });
  const b = boxes.get(f.id);
  canvas.place(node, { x: b.x, y: b.y, w: f.width, ...(b.h != null && { h: b.h }), name: frameName(f), kind: "frame", id: f.id });
  entry.wrap = node.parentElement;
  onStage.set(f.id, entry);
  fitHeight(f.id, entry);
}

// ---- the note editor (T8) --------------------------------------------------------------------------
// contenteditable="plaintext-only" where the engine keeps it, a <textarea> where it does not. The
// tabindex is load-bearing: studio-verbs' body-drag guard matches [tabindex] but not
// [contenteditable], so without it a press in the editor starts a move and the text never lands.
function makeEditor(id, text) {
  let ed = document.createElement("div");
  ed.contentEditable = "plaintext-only";
  const plain = ed.contentEditable === "plaintext-only";
  if (!plain) ed = document.createElement("textarea");
  else { ed.setAttribute("role", "textbox"); ed.setAttribute("aria-multiline", "true"); }
  ed.className = "cv-note-editor";
  ed.tabIndex = 0;
  ed.setAttribute("aria-label", `Note ${id}`);
  const get = () => (plain ? ed.textContent : ed.value);
  const set = (t) => { if (plain) ed.textContent = t; else ed.value = t; };
  set(text);
  let remembered = text;
  let escaped = false;
  ed.addEventListener("focus", () => { remembered = get(); escaped = false; });
  ed.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); escaped = true; set(remembered); ed.blur(); }
    // The editor's keys are the editor's: Cmd+Z stays the browser's text undo, Cmd+A selects text,
    // and shift+arrows extend a text selection rather than the canvas's.
    if (e.key !== "Tab") e.stopPropagation();
  });
  ed.addEventListener("blur", () => {
    const now = get();
    const isDraft = drafts.has(id);
    if (!now.trim()) {
      if (isDraft) { removeDraft(id); canvas.say("Empty note discarded — nothing recorded."); }
      else if (!escaped) { set(remembered); canvas.say(`Note ${id} kept — a note cannot be blank.`); }
      return;
    }
    if (now === remembered && !isDraft) return;
    // ONE ui.annotate per gesture, so one undo entry per edit.
    bus.emit({ type: "ui.annotate", source: "keyboard", target: { component: "note", id }, params: isDraft ? { text: now } : { noteId: id, text: now } });
  });
  return { ed, get, set };
}

function placeNote(n, at) {
  const { ed, set } = makeEditor(n.id, n.text);
  const node = el("div", { class: "cv-note" }, ed);
  node.dataset.stxName = `Note ${n.id}`;
  const b = at ?? boxes.get(n.id) ?? { x: 0, y: 640, w: NOTE_W };
  canvas.place(node, { x: b.x, y: b.y, w: b.w ?? NOTE_W, name: `Note ${n.id}`, component: "note", id: n.id });
  const entry = { node, wrap: node.parentElement, kind: "note", sig: n.text, editor: ed, setText: set };
  onStage.set(n.id, entry);
  return entry;
}

function removeDraft(id) {
  drafts.delete(id);
  onStage.get(id)?.wrap.remove();
  onStage.delete(id);
}

const nextNoteId = () => {
  const taken = new Set([...(doc.notes ?? []).map((n) => n.id), ...drafts]);
  let k = 1;
  while (taken.has(`n${k}`)) k += 1;
  return `n${k}`;
};

// ---- decision cards --------------------------------------------------------------------------------

function cardParts(ref) {
  const d = decisionOf(ref);
  const by = doc.frames.filter((f) => (f.decisionRefs ?? []).includes(ref)).map(frameName);
  const parts = [el("p", { class: "cv-card-title", text: `Decision ${ref}` })];
  if (decisions === null) {
    parts.push(el("p", { class: "cv-flag", text: "Not found — this package has no transcript.jsonl (a stand-in), so there is nothing to link yet." }));
  } else if (!d) {
    parts.push(el("p", { class: "cv-flag", text: "Not found in this package's transcript." }));
  } else {
    if (d.question) parts.push(el("p", { class: "cv-card-q", text: d.question }));
    if (d.answer) parts.push(el("p", { class: "cv-card-a", text: d.answer }));
    if (d.wrongIf) parts.push(el("p", { class: "cv-card-w", text: `Wrong if: ${d.wrongIf}` }));
    const x = staleOf().find((y) => y.ref === ref && y.status === "stale");
    if (x) parts.push(el("p", { class: "cv-flag", text: `Changed since linked — superseded; the latest is decision ${x.latest}. Re-confirm on the frame.` }));
  }
  parts.push(el("p", { class: "cv-card-by", text: `Embodied by: ${by.join(", ") || "no frame"}` }));
  return parts;
}

function placeCard(ref) {
  const id = `d${ref}`;
  const node = el("div", { class: "cv-card" }, ...cardParts(ref));
  node.dataset.stxName = `Decision ${ref}`;
  let b = boxes.get(id);
  if (!b) {
    const anchorFrame = doc.frames.find((f) => (f.decisionRefs ?? []).includes(ref));
    const a = anchorFrame && (boxes.get(anchorFrame.id) ?? readBox(onStage.get(anchorFrame.id).wrap));
    const p = placeDecision(a ? { x: a.x, y: a.y, w: anchorFrame.width, ...(a.h != null && authoredH.has(anchorFrame.id) && { h: a.h }) } : null, takenBoxes());
    b = { x: p.x, y: p.y, w: CARD_W };
    boxes.set(id, b); // this session's placement joins the authored set, so a second card lands right of it
  }
  canvas.place(node, { x: b.x, y: b.y, w: b.w ?? CARD_W, name: `Decision ${ref}`, component: "decision", id });
  onStage.set(id, { node, wrap: node.parentElement, kind: "decision", sig: canon(cardParts(ref).map((p) => p.textContent)) });
}

// ---- exhibits: a Mode 2 import, beside the flow (#475) ---------------------------------------------

function exhibitParts(e) {
  const name = e?.name ?? "unknown";
  const tool = e?.tool ?? "an unknown tool";
  const parts = [el("p", { class: "cv-exhibit-title", text: "Frozen original · Mode 2" })];
  if (e?.reference) parts.push(el("img", { src: e.reference, alt: `The original ${name}, as exported from ${tool}` }));
  else parts.push(el("p", { class: "cv-flag", text: "No reference image — only a live Brilliant read captures one; this import was a dropped file." }));
  // One line each, ellipsed inside the fixed box; the whole line is the title, so nothing is lost.
  const meta = (text) => el("p", { class: "cv-exhibit-meta", title: text, text });
  parts.push(meta(`${name} · import ${e?.recordId ?? "?"} · ${e?.file ? `dropped file ${e.file}` : `read from ${tool}`}`));
  parts.push(el("p", { text: "Kept for comparison: never joins the system or goes inside a frame." }));
  parts.push(meta(`Attribution: ${e?.attribution ?? "not recorded"} · licence: ${e?.licence ?? "not recorded"}`));
  return parts;
}

function placeExhibitNode(ex) {
  const meta = exhibitMeta.get(ex.id) ?? ex;
  const node = el("div", { class: "cv-exhibit" }, ...exhibitParts(meta));
  node.style.width = `${EXHIBIT_SIZE.w}px`;
  node.style.height = `${EXHIBIT_SIZE.h}px`;
  node.dataset.stxName = `Original ${ex.name}`;
  // The server placed it (import-run's placeExhibit), so a missing box does not happen; the origin is
  // not a rule, and the guard refuses the first gesture if it would ever land on a frame.
  const b = boxes.get(ex.id) ?? { x: 0, y: 0 };
  canvas.place(node, { x: b.x, y: b.y, w: EXHIBIT_SIZE.w, name: `Original ${ex.name}`, component: "exhibit", id: ex.id });
  onStage.set(ex.id, { node, wrap: node.parentElement, kind: "exhibit", sig: ex.id });
}

const refusal = (clash) => {
  const f = frameOf(clash.frameId);
  const where = f ? frameName(f) : clash.frameId;
  const name = exhibitsOf(doc).find((e) => e.id === clash.exhibitId)?.name ?? clash.exhibitId;
  return `Refused: the original ${name} would sit inside ${where} — a frozen original stays beside the flow (G7). Put back. To place it below ${where}, give that screen a height first (resize it).`;
};

// Where `pending` stood when the current gesture began — set by a handler registered BEFORE every
// consumer, so a refusal drops exactly what the refused gesture (and its undo) added and never a line
// an earlier gesture queued, which may be in a save that is still in flight.
let gestureMark = 0;
// The frame whose height a resize just made authored, if it was not before: a refused resize puts that
// back too, or the next save would write a height nobody chose.
let newlyAuthored = null;

function keepExhibitsBeside(action) {
  const clash = exhibitClashes(doc, gatherPositions())[0];
  if (!clash) { newlyAuthored = null; return; }
  bus.emit({ type: "ui.undo", source: action?.source ?? "keyboard" });
  pending.splice(gestureMark);
  if (newlyAuthored) {
    const id = newlyAuthored;
    authoredH.delete(id);
    if (onStage.has(id)) fitHeight(id, onStage.get(id));
  }
  newlyAuthored = null;
  canvas.say(refusal(clash)); // AFTER the undo, whose own "Undone: …" would otherwise be the last word
}

const GEOMETRY_VERBS = Object.freeze(["ui.move", "ui.move-group", "ui.resize", "ui.frame-size", "ui.redo"]);

// ---- reconcile: make the stage say what the document says ----------------------------------------

function reconcile() {
  view = viewDoc();
  const want = new Set([...doc.frames.map((f) => f.id), ...(doc.notes ?? []).map((n) => n.id), ...refsInOrder().map((r) => `d${r}`), ...exhibitsOf(doc).map((e) => e.id)]);
  for (const [id, entry] of [...onStage]) {
    if (want.has(id) || drafts.has(id)) continue;
    const b = readBox(entry.wrap);
    boxes.set(id, { x: b.x, y: b.y, w: b.w, ...(entry.kind === "frame" && authoredH.has(id) && b.h != null && { h: b.h }) });
    if (inspectorFor === id) closeInspector();
    entry.wrap.remove();
    onStage.delete(id);
  }
  doc.frames.forEach((f, i) => {
    const entry = onStage.get(f.id);
    if (!entry) { placeFrame(f, i); return; }
    if (entry.sig === frameSig(f)) return;
    fillFrame(entry, f);
    canvas.place(entry.node, { w: f.width, name: frameName(f) });
    fitHeight(f.id, entry);
  });
  for (const n of doc.notes ?? []) {
    const entry = onStage.get(n.id);
    if (!entry) { placeNote(n); continue; }
    if (entry.sig !== n.text && document.activeElement !== entry.editor) { entry.setText(n.text); entry.sig = n.text; }
    else entry.sig = n.text;
  }
  for (const r of refsInOrder()) {
    const id = `d${r}`;
    const entry = onStage.get(id);
    if (!entry) { placeCard(r); continue; }
    const parts = cardParts(r);
    const sig = canon(parts.map((p) => p.textContent));
    if (sig !== entry.sig) { entry.node.replaceChildren(...parts); entry.sig = sig; }
  }
  for (const ex of exhibitsOf(doc)) if (!onStage.has(ex.id)) placeExhibitNode(ex);
  canvas.setArrows(laneDoc(view, lane).doc.arrows);
  renderFlow();
}

// ---- lanes (#314) ------------------------------------------------------------------------------------

function renderFlow() {
  $("[data-canvas-flow-text]").textContent = stateDiagram(view, lane);
  const list = $("[data-canvas-flow-missing]");
  const miss = missingStates(view, lane);
  // Stale is read from doc, but the panel lists this lane's screens, so a frame the lane omits drops out here.
  const inLane = new Set(laneDoc(view, lane).doc.frames.map((f) => f.id));
  const stale = staleOf().filter((x) => inLane.has(x.frameId)).map((x) => el("li", { text: `${frameName(frameOf(x.frameId))}: decision ${x.ref} ${x.status === "stale" ? `changed since linked (now ${x.latest})` : "not found"}` }));
  list.replaceChildren(...(miss.length || stale.length ? [...miss.map((m) => el("li", { text: `${frameName(frameOf(m.frameId))}: ${m.missing.join(", ")} missing` })), ...stale]
    : [el("li", { text: "Every screen in this lane has every state it requires." })]));
  const sel = $("[data-canvas-lane]");
  const keys = laneKeys(view);
  sel.replaceChildren(...keys.map((k) => el("option", { value: k ?? "", text: k === null ? "A (base)" : laneDraft?.key === k ? `${k} (draft)` : k })));
  sel.value = lane ?? "";
  $("[data-canvas-verb=lane-keep]").hidden = !laneDraft;
  $("[data-canvas-verb=lane-discard]").hidden = !laneDraft;
  $("[data-canvas-verb=lane-new]").hidden = Boolean(laneDraft);
}

// A draft edit: applied to a copy, previewed through the applier, kept only if the applier accepts it.
function editDraft(fid, next) {
  const before = laneDraft.overrides;
  laneDraft = { ...laneDraft, overrides: { ...before, [fid]: next } };
  try { viewDoc(); } catch (e) { laneDraft = { ...laneDraft, overrides: before }; canvas.say(`Refused: ${e.message}`); return false; }
  reconcile();
  return true;
}

function wireLanes() {
  $("[data-canvas-lane]").addEventListener("change", (e) => { lane = e.target.value || null; reconcile(); });
  $("[data-canvas-verb=lane-new]").addEventListener("click", () => {
    $("[data-canvas-lane-form]").hidden = false;
    $("[data-canvas-lane-key]").focus();
  });
  $("[data-canvas-verb=lane-create]").addEventListener("click", () => {
    const key = $("[data-canvas-lane-key]").value.trim();
    try { applyOp(doc, { op: "variant.add", params: { key, overrides: {} } }); }
    catch (e) { canvas.say(`Refused: ${e.message}`); return; }
    laneDraft = { key, overrides: {} };
    lane = key;
    $("[data-canvas-lane-form]").hidden = true;
    reconcile();
    canvas.say(`Lane ${key} is a draft — edit frames through Details, then Keep lane.`);
  });
  $("[data-canvas-verb=lane-keep]").addEventListener("click", (e) => {
    bus.emit({ type: "ui.variant-add", source: e.detail === 0 ? "keyboard" : "pointer", params: { key: laneDraft.key, overrides: laneDraft.overrides } });
  });
  $("[data-canvas-verb=lane-discard]").addEventListener("click", () => {
    const key = laneDraft?.key;
    laneDraft = null;
    lane = null;
    reconcile();
    canvas.say(`Lane ${key} discarded — nothing was written.`);
  });
  $("[data-canvas-verb=pack]").addEventListener("click", async () => {
    if (!(await flushSettled())) { setSave("Pack not written — the page has unsaved changes."); return; }
    try {
      const res = await fetch("/api/canvas/pack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance, slug }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      setSave(`Handoff pack written — ${body.files.length} files in build/handoff/`);
    } catch (e) { setSave(`Pack not written — ${e.message}`); }
  });
}

// ---- applying the owner's ops -----------------------------------------------------------------------

// `line` overrides the pending line's status (and adds fromStep) for an accepted proposal (#312).
function applyOwnerOp(op, { commit = true, line = null } = {}) {
  let next;
  try { next = applyOp(doc, op); }
  catch (e) { canvas.say(`Refused: ${e.message}`); return false; }
  doc = next;
  effective.push(op);
  pending.push({ ...op, status: "applied", ...line });
  reconcile();
  if (commit) verbs.commit();
  return true;
}

// THE DOCUMENT HOOK (D8). The verbs call capture() inside every snapshot, restore() before they put
// positions back, and resized() between a resize's setPos and its history push.
const adapter = {
  capture: () => ({ doc, ops: effective }),
  restore(value) {
    if (!value || !Array.isArray(value.ops)) return "";
    let k = 0;
    while (k < effective.length && k < value.ops.length && canon(effective[k]) === canon(value.ops[k])) k += 1;
    const undone = effective.slice(k).reverse();
    const redone = value.ops.slice(k);
    for (const o of undone) pending.push({ op: o.op, params: o.params, status: "undone" });
    for (const o of redone) pending.push({ op: o.op, params: o.params, status: "applied" });
    doc = structuredClone(value.doc);
    effective = structuredClone(value.ops);
    if (lane !== null && lane !== laneDraft?.key && !laneKeys(doc).includes(lane)) lane = null;
    reconcile();
    const said = [];
    if (undone.length) said.push(`Undone: ${undone.map(describeOp).join("; ")}.`);
    if (redone.length) said.push(`Redone: ${redone.map(describeOp).join("; ")}.`);
    return said.join(" ");
  },
  resized(id, box) {
    const f = frameOf(id);
    if (!f) return;
    newlyAuthored = authoredH.has(id) ? null : id;
    authoredH.add(id);
    // A height-only resize is arrangement, not a size op: the width is the document's fact.
    const width = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(box.w)));
    if (width !== f.width) applyOwnerOp({ op: "frame.size", params: { frameId: id, width } }, { commit: false });
    const entry = onStage.get(id);
    if (entry && Math.round(readBox(entry.wrap).w) !== frameOf(id).width) canvas.place(entry.node, { w: frameOf(id).width });
  },
};

// ---- the save queue ---------------------------------------------------------------------------------

let flushQueued = false;
function scheduleSave() {
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => { flushQueued = false; flush(); });
}

async function flush() {
  if (broken) return;
  // A compose turn appends a line the page has not counted yet: hold saves until it answers (#312).
  if (composing) { again = true; return; }
  if (saving) { again = true; return; }
  const positions = gatherPositions();
  // THE BACKSTOP (call 5): a clash the guard missed is not sent, and the session stays alive.
  const clash = exhibitClashes(doc, positions)[0];
  if (clash) { setSave(`Not saved yet — ${refusal(clash)}`); return; }
  const key = canon(positions);
  if (!pending.length && key === lastSavedKey) return;
  const ops = pending.slice();
  saving = true;
  setSave("Saving…");
  try {
    const res = await fetch("/api/canvas/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance, slug, base: count, ops, positions }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || res.statusText);
    count = body.count;
    pending.splice(0, ops.length);
    lastSavedKey = key;
    for (const [id, p] of Object.entries(positions)) boxes.set(id, { ...boxes.get(id), ...p });
    setSave(body.packError ? `Saved — pack not written: ${body.packError}` : "Saved");
  } catch (e) {
    broken = true;
    setSave(`Not saved — ${e.message}. Reload to continue.`);
  } finally {
    saving = false;
    if (again && !broken) { again = false; flush(); }
  }
}

// ---- the compose loop (#312) -------------------------------------------------------------------------

const whatOf = (o) => (o.op === "state.add" ? `the ${o.params?.stateKey} state of ${o.params?.baseId}` : o.params?.screenId);

// Everything the page has queued is on disk, and nothing is in flight — or false after 20 ticks.
async function flushSettled() {
  for (let i = 0; i < 20; i += 1) {
    if (broken) return false;
    if (!saving && !pending.length && canon(gatherPositions()) === lastSavedKey) return true;
    if (!saving) flush();
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

function lastSentence(last) {
  if (!last) return "";
  if (last.outcome === "refused") return `Refused: ${last.error ?? "the handler refused the proposal"}`;
  if (last.outcome === "escape") {
    const m = String(last.text ?? "").match(/^[^A-Za-z\n]*NOT COVERED:\s*(.*)$/m);
    return `Not covered: ${m?.[1] ?? last.text ?? ""}`;
  }
  if (last.outcome === "empty-yield") return "The agent proposed nothing this turn.";
  if (last.outcome === "failed") return `The turn failed: ${last.error ?? "no reason recorded"}`;
  return "";
}

function proposalCard(o) {
  const shown = el("div", { class: "cv-compose-screen" });
  try {
    const tree = o.op === "state.add"
      ? (() => { const next = applyOp(doc, { op: o.op, params: o.params }); return frameTree(next, next.frames.at(-1).id).tree; })()
      : o.params.composition;
    shown.appendChild(renderComposition(vocab, tree));
  } catch (e) { shown.appendChild(el("p", { class: "cv-flag", text: `Refused: ${e.message}` })); }
  const refs = o.op === "screen.compose" ? (o.params.decisionRefs ?? []) : null;
  // #316 (R6): the states a screen declares become required, so the owner sees them before accepting.
  const states = o.op === "screen.compose" && Array.isArray(o.params.states) && o.params.states.length ? o.params.states : null;
  const accept = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-compose-accept": "", text: "Accept" });
  const refuse = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-compose-refuse": "", text: "Refuse" });
  const emit = (type) => (e) => bus.emit({ type, source: e && e.detail === 0 ? "keyboard" : "pointer", target: { component: "proposal", id: String(o.seq) } });
  accept.addEventListener("click", emit("ui.proposal-accept"));
  refuse.addEventListener("click", emit("ui.proposal-refuse"));
  return el("div", { class: "cv-compose-card", "data-compose-card": String(o.seq) },
    el("p", { class: "cv-compose-by", text: `Proposed by the agent · turn ${o.turn ?? "?"} · ${whatOf(o)}` }),
    shown,
    el("p", { class: "cv-compose-why", text: `Why: ${o.why ?? "no reason given"}` }),
    el("p", { class: "cv-compose-brief", "data-compose-brief": "", text: o.brief !== null && o.brief !== undefined ? `Your brief: "${o.brief}"` : "No brief this turn." }),
    refs === null ? null : el("p", { class: "cv-compose-refs", text: refs.length ? `Decisions proposed: ${refs.join(", ")}` : "No decision named — it will be flagged" }),
    states === null ? null : el("p", { class: "cv-compose-states", "data-compose-states": "", text: `States declared: ${states.join(" · ")}` }),
    el("div", { class: "cv-compose-actions" }, accept, refuse));
}

// The static half (heading, brief, Ask) is built once, so a re-render never loses the brief being typed.
function renderCompose() {
  const panel = $("[data-compose-panel]");
  if (!panel) return;
  if (!panel.querySelector("#cv-brief")) {
    const ask = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-compose-ask": "", text: "Ask for a screen" });
    ask.addEventListener("click", () => askTurn({ kind: "screen" }));
    panel.replaceChildren(
      el("h2", { text: "Compose" }),
      el("label", { for: "cv-brief", text: "Your brief for the next turn (optional)" }),
      el("textarea", { id: "cv-brief", maxlength: 500, rows: 3 }),
      ask,
      el("p", { class: "cv-compose-status", role: "status", "data-compose-status": "" }),
      el("div", { "data-compose-body": "" }));
  }
  const open = compose?.open ?? null;
  const ask = panel.querySelector("[data-compose-ask]");
  ask.disabled = Boolean(composing || open || broken);
  panel.querySelector("[data-compose-status]").textContent = composing ? "Asking — one turn, one proposal…"
    : broken ? "The page could not save — reload to continue."
      : open ? "Accept or refuse the proposal below before the next turn."
        : composeNote;
  const body = panel.querySelector("[data-compose-body]");
  const last = lastSentence(compose?.last);
  body.replaceChildren(...[
    open ? proposalCard(open) : null,
    !open && last ? el("p", { class: "cv-compose-last", "data-compose-last": "", text: last }) : null,
  ].filter(Boolean));
}

async function askTurn(ask) {
  if (broken || composing) return;
  composeNote = "";
  if (!(await flushSettled())) {
    composeNote = "Not asked — the page could not save first.";
    renderCompose();
    return;
  }
  const briefEl = $("#cv-brief");
  const raw = briefEl?.value ?? "";
  const brief = raw.trim() ? raw : null;
  composing = true;
  renderCompose();
  try {
    const res = await fetch("/api/canvas/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance, slug, base: count, ask, brief }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      broken = true;
      setSave(`Not saved — ${body.error || res.statusText}. Reload to continue.`);
    } else if (!res.ok) {
      composeNote = `The turn failed: ${body.error || res.statusText}`;
    } else if (body.refused) {
      composeNote = `Refused: ${body.refused.message}`;
    } else if (body.count !== count + body.added) {
      // PR #485 review F4: another tab saved during the turn, so this page never saw every line.
      broken = true;
      setSave(`Not saved — the ledger holds ${body.count} lines and this page saw ${count} plus the turn's ${body.added}; another tab or process saved in between. Reload to continue.`);
    } else {
      count = body.count;
      compose = body.view;
      if (briefEl) briefEl.value = "";
    }
  } catch (e) {
    composeNote = `The turn failed: ${e.message}`;
  } finally {
    composing = false;
    renderCompose();
    const said = composeNote || lastSentence(compose?.last) || (compose?.open ? `The agent proposed ${whatOf(compose.open)} — accept or refuse it.` : "");
    if (said) canvas.say(said);
    if (again && !broken) { again = false; flush(); }
  }
}

// The accepted frame's box: in its anchor's row, right of everything there (placeDecision). The anchor
// is the base frame for a state, and the rightmost base frame for a screen.
function acceptedBox(o, frame) {
  const boxOf = (f) => { const b = boxes.get(f.id); return b ? { x: b.x, y: b.y, w: f.width, ...(b.h != null && authoredH.has(f.id) && { h: b.h }) } : null; };
  let anchor = null;
  if (o.op === "state.add") { const base = frameOf(o.params.baseId); anchor = base && boxOf(base); }
  else {
    for (const f of doc.frames.filter((x) => !x.baseId)) {
      const b = boxOf(f);
      if (b && (!anchor || b.x + b.w > anchor.x + anchor.w)) anchor = b;
    }
  }
  return placeDecision(anchor, takenBoxes(), { w: frame.width, h: NODE_H });
}

function registerComposeConsumers() {
  bus.on("ui.proposal-accept", (a) => {
    const o = compose?.open;
    if (!o || a?.target?.id !== String(o.seq)) return;
    const op = { op: o.op, params: o.params };
    let next;
    try { next = applyOp(doc, op); }
    catch (e) { canvas.say(`Refused: ${e.message}`); return; }
    const frame = next.frames.at(-1);
    boxes.set(frame.id, acceptedBox(o, frame));
    if (!applyOwnerOp(op, { line: { status: "accepted", fromStep: o.seq } })) { boxes.delete(frame.id); return; }
    compose.open = null;
    renderCompose();
    canvas.say(`Accepted ${whatOf(o)} as ${frame.id}.`);
  });
  bus.on("ui.proposal-refuse", (a) => {
    const o = compose?.open;
    if (!o || a?.target?.id !== String(o.seq)) return;
    pending.push({ op: o.op, params: o.params, status: "refused", fromStep: o.seq });
    compose.open = null;
    renderCompose();
    canvas.say(`Refused ${whatOf(o)} — recorded, and nothing placed.`);
  });
  document.addEventListener("click", (e) => {
    const b = e.target?.closest?.("[data-cv-ask-state]");
    if (!b) return;
    const [baseId, stateKey] = b.dataset.cvAskState.split(":");
    askTurn({ kind: "state", baseId, stateKey });
  });
}

// ---- the inspector (Popover + anchor positioning, with a clamped fallback) ------------------------

const inspector = () => $("#cv-inspector");
let inspectorFor = null;
let inspectorTrigger = null;

function closeInspector() {
  try { inspector().hidePopover(); } catch { /* already closed */ }
}

// Below the trigger if it fits, else above, else clamped; never outside the viewport (R5).
function positionFallback(pop, trigger) {
  const r = trigger.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  const below = r.bottom + 8;
  const above = r.top - h - 8;
  const top = below + h + 8 <= window.innerHeight ? below : (above >= 8 ? above : Math.max(8, window.innerHeight - h - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

const inViewport = (r) => r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;

function openInspector(frameId, trigger) {
  const f = frameOf(frameId);
  if (!f) return;
  const pop = inspector();
  const emitFrom = (type, e, params) => {
    closeInspector();
    bus.emit({ type, source: e && e.detail === 0 ? "keyboard" : "pointer", target: { component: "frame", id: frameId }, ...(params && { params }) });
  };

  // Device.
  const sizeSel = el("select", { id: "cv-size-preset" });
  for (const n of PRESET_NAMES) sizeSel.appendChild(el("option", { value: n, text: `${n} · ${presetWidth(n)} px` }));
  sizeSel.appendChild(el("option", { value: "custom", text: "custom" }));
  sizeSel.value = f.preset ?? "custom";
  const widthIn = el("input", { id: "cv-size-width", type: "number", min: WIDTH_MIN, max: WIDTH_MAX, step: 1, value: f.width });
  sizeSel.addEventListener("change", () => { if (sizeSel.value !== "custom") widthIn.value = String(presetWidth(sizeSel.value)); });
  widthIn.addEventListener("input", () => { sizeSel.value = "custom"; });
  const applySize = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Apply size" });
  applySize.addEventListener("click", (e) => emitFrom("ui.frame-size", e,
    sizeSel.value === "custom" ? { width: Number(widthIn.value) } : { preset: sizeSel.value }));
  const device = el("fieldset", { class: "cv-fieldset" }, el("legend", { text: "Device" }),
    el("label", { class: "cv-field", for: "cv-size-preset" }, "Preset"), sizeSel,
    el("label", { class: "cv-field", for: "cv-size-width" }, `Width (${WIDTH_MIN}–${WIDTH_MAX} px)`), widthIn,
    applySize);

  // Decisions.
  const linkBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Link decisions" });
  const decisionsSet = el("fieldset", { class: "cv-fieldset" }, el("legend", { text: "Decisions this frame embodies" }));
  if (decisions === null) {
    const why = el("p", { class: "cv-flag", id: "cv-no-transcript", text: "This package has no transcript.jsonl (a stand-in), so there are no decisions to link yet." });
    linkBtn.disabled = true;
    linkBtn.setAttribute("aria-describedby", "cv-no-transcript");
    decisionsSet.append(why, linkBtn);
  } else {
    const list = el("div", { class: "cv-checks" });
    for (const d of decisions) {
      const box = el("input", { type: "checkbox", value: d.id });
      box.checked = (f.decisionRefs ?? []).includes(d.id);
      const head = decisions.some((x) => x.supersedes === d.seq) ? staleFrames({ frames: [{ id: "_", decisionRefs: [d.id] }] }, decisions)[0]?.latest : null;
      list.appendChild(el("label", { class: "cv-check" }, box, `${d.id} · ${d.question ?? d.questionId ?? "unknown question"}${head ? ` — superseded by ${head}` : ""}`));
    }
    linkBtn.addEventListener("click", (e) => emitFrom("ui.frame-link", e,
      { decisionRefs: [...list.querySelectorAll("input:checked")].map((b) => b.value) }));
    decisionsSet.append(list, linkBtn);
  }

  const removeBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Remove frame" });
  removeBtn.addEventListener("click", (e) => emitFrom("ui.frame-remove", e));
  const closeBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Close" });
  closeBtn.addEventListener("click", closeInspector);

  // #314: the active lane. A draft is editable; a kept lane is read-only.
  let laneSet = null;
  if (lane !== null && laneDraft?.key !== lane) {
    laneSet = el("fieldset", { class: "cv-fieldset" }, el("legend", { text: `In lane ${lane}` }),
      el("p", { class: "cv-flag", text: `Lane ${lane} is kept — its overrides are read-only.` }));
  } else if (lane !== null) {
    const tree = frameTree(view, frameId, lane).tree;
    const parts = [];
    const walkParts = (n) => {
      if (!n || typeof n !== "object") return;
      if (typeof n.id === "string" && n.props) {
        const props = ["label", "content", "hint", "placeholder"].filter((k) => typeof n.props[k] === "string");
        if (props.length) parts.push({ id: n.id, props: Object.fromEntries(props.map((k) => [k, n.props[k]])) });
      }
      for (const c of Array.isArray(n.children) ? n.children : []) walkParts(c);
    };
    walkParts(tree);
    const partSel = el("select", { id: "cv-lane-part" });
    const propSel = el("select", { id: "cv-lane-prop" });
    const valueIn = el("input", { id: "cv-lane-value" });
    for (const p of parts) partSel.appendChild(el("option", { value: p.id, text: p.id }));
    const fillProps = () => {
      const p = parts.find((x) => x.id === partSel.value);
      propSel.replaceChildren(...Object.keys(p?.props ?? {}).map((k) => el("option", { value: k, text: k })));
      valueIn.value = p?.props[propSel.value] ?? "";
    };
    partSel.addEventListener("change", fillProps);
    propSel.addEventListener("change", () => { valueIn.value = parts.find((x) => x.id === partSel.value)?.props[propSel.value] ?? ""; });
    fillProps();
    const setBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Set in lane" });
    setBtn.addEventListener("click", () => {
      const o = laneDraft.overrides[frameId] ?? {};
      const set = { ...(o.set ?? {}), [partSel.value]: { ...(o.set?.[partSel.value] ?? {}), [propSel.value]: valueIn.value } };
      const { omit, ...rest } = o;
      closeInspector();
      if (editDraft(frameId, { ...rest, set })) canvas.say(`Lane ${lane}: ${partSel.value}.${propSel.value} on ${spoken(f)} is now "${valueIn.value}".`);
    });
    const omitBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Leave out of lane" });
    omitBtn.addEventListener("click", () => {
      closeInspector();
      if (editDraft(frameId, { omit: true })) canvas.say(`${spoken(f)} is left out of lane ${lane}.`);
    });
    laneSet = el("fieldset", { class: "cv-fieldset" }, el("legend", { text: `In lane ${lane}` }),
      ...(parts.length ? [el("label", { class: "cv-field", for: "cv-lane-part" }, "Part"), partSel,
        el("label", { class: "cv-field", for: "cv-lane-prop" }, "Text"), propSel,
        el("label", { class: "cv-field", for: "cv-lane-value" }, "Value"), valueIn, setBtn] : []),
      omitBtn);
  }

  // #315: the group fieldsets (lane A only).
  const groupSets = groupFieldsets(f, { view, doc, emitFrom, lane, getPage: getCanvasPage, say: (t) => canvas.say(t) });

  pop.replaceChildren(el("p", { class: "cv-inspector-title", text: `Details — ${spoken(f)}` }), ...(laneSet ? [laneSet] : []), ...groupSets, device, decisionsSet,
    el("div", { class: "cv-inspector-actions" }, removeBtn, closeBtn));
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", `Details for ${frameName(f)}`);

  if (inspectorTrigger && inspectorTrigger !== trigger) inspectorTrigger.style.removeProperty("anchor-name");
  inspectorFor = frameId;
  inspectorTrigger = trigger;
  pop.style.removeProperty("left");
  pop.style.removeProperty("top");
  const anchorOk = typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");
  if (anchorOk) {
    trigger.style.setProperty("anchor-name", "--cv-inspector");
    pop.dataset.cvPos = "anchor";
  } else {
    pop.dataset.cvPos = "fallback";
  }
  try { pop.showPopover(); } catch { /* already open */ }
  // SUPPORTED IS NOT APPLIED (inspect.mjs #197's finding): trust the geometry, and fall back when the
  // anchored box leaves the viewport.
  if (!anchorOk || !inViewport(pop.getBoundingClientRect())) {
    pop.dataset.cvPos = "fallback";
    trigger.style.removeProperty("anchor-name");
    positionFallback(pop, trigger);
  }
  (pop.querySelector("select, input, button") ?? pop).focus();
}

function wireInspector() {
  inspector().addEventListener("toggle", (e) => {
    if (e.newState !== "closed") return;
    const t = inspectorTrigger;
    inspectorFor = null;
    t?.style.removeProperty("anchor-name");
    if (t && t.isConnected && (document.activeElement === document.body || inspector().contains(document.activeElement))) t.focus();
  });
}

// ---- the verbs ---------------------------------------------------------------------------------------

function registerConsumers() {
  bus.on("ui.annotate", (a) => {
    const p = a?.params ?? {};
    const isNew = p.noteId === undefined;
    const id = isNew ? (a?.target?.id ?? nextNoteId()) : p.noteId;
    const op = { op: "annotate", params: isNew ? { text: p.text } : { noteId: p.noteId, text: p.text } };
    drafts.delete(id);
    if (!applyOwnerOp(op)) { if (isNew) removeDraft(id); return; }
    canvas.say(isNew ? `Note ${id} added.` : `Note ${id} saved.`);
  });
  document.addEventListener("click", (e) => {
    const b = e.target?.closest?.("[data-cv-reconfirm]");
    const f = b && frameOf(b.dataset.cvReconfirm);
    if (!f) return;
    bus.emit({ type: "ui.frame-link", source: e.detail === 0 ? "keyboard" : "pointer", target: { component: "frame", id: f.id }, params: { decisionRefs: reconfirmRefs(f, staleOf()) } });
  });
  bus.on("ui.frame-link", (a) => {
    const f = frameOf(a?.target?.id);
    const refs = a?.params?.decisionRefs;
    if (!applyOwnerOp({ op: "frame.link", params: { frameId: a?.target?.id, decisionRefs: refs } })) return;
    canvas.say(`${spoken(f)} now embodies ${refs.length ? `decisions ${refs.join(", ")}` : "no decision"}.`);
  });
  bus.on("ui.frame-remove", (a) => {
    const f = frameOf(a?.target?.id);
    const arrows = doc.arrows.filter((x) => x.from?.frameId === f?.id || x.to?.frameId === f?.id).length;
    if (!applyOwnerOp({ op: "frame.remove", params: { frameId: a?.target?.id } })) return;
    canvas.say(`Removed ${spoken(f)} and ${arrows} arrow${arrows === 1 ? "" : "s"}.`);
  });
  bus.on("ui.variant-add", (a) => {
    const key = a?.params?.key;
    // The draft leaves BEFORE the op applies: reconcile() previews the draft over doc, and doc is about to hold it.
    const draft = laneDraft;
    laneDraft = null;
    if (!applyOwnerOp({ op: "variant.add", params: { key, overrides: a?.params?.overrides } })) { laneDraft = draft; reconcile(); return; }
    canvas.say(`Lane ${key} kept.`);
  });
  // #315: a group is defined from a selection on a frame, and placed or overridden as a copy.
  bus.on("ui.group-define", (a) => {
    const frameId = a?.target?.id;
    const p = a?.params ?? {};
    const before = new Set(Object.keys(doc.groups ?? {}));
    if (!applyOwnerOp({ op: "group.define", params: { name: p.name, frameId, partIds: p.partIds, ...(p.groupId && { groupId: p.groupId }) } })) return;
    const id = p.groupId ?? Object.keys(doc.groups).find((g) => !before.has(g));
    canvas.say(`Group ${id} ${p.name} saved from ${p.partIds.length} part${p.partIds.length === 1 ? "" : "s"} of ${spoken(frameOf(frameId))}.`);
  });
  bus.on("ui.group-place", (a) => {
    const frameId = a?.target?.id;
    const p = a?.params ?? {};
    const params = p.instanceId ? { frameId, instanceId: p.instanceId, overrides: p.overrides } : { frameId, groupId: p.groupId, parentId: p.parentId };
    const before = new Set(groupInstancesOf(frameId));
    if (!applyOwnerOp({ op: "group.place", params })) return;
    const id = p.instanceId ?? groupInstancesOf(frameId).find((i) => !before.has(i));
    canvas.say(p.instanceId ? `Copy ${id} on ${spoken(frameOf(frameId))} overridden.` : `Copy ${id} of ${p.groupId} placed on ${spoken(frameOf(frameId))}.`);
  });
  bus.on("ui.frame-size", (a) => {
    const id = a?.target?.id;
    const p = a?.params ?? {};
    const params = p.preset !== undefined ? { frameId: id, preset: p.preset } : { frameId: id, width: p.width };
    if (!applyOwnerOp({ op: "frame.size", params })) return;
    const f = frameOf(id);
    canvas.say(`${spoken(f)} is now ${f.preset ?? "custom"}, ${f.width} px wide.`);
  });
}

// A NEW NOTE GOES WHERE NOTHING IS: at the left edge of the visible stage, below everything already
// placed, then scrolled into view. The centre of the view was the first answer and it landed notes on
// top of frames — a note under a frame cannot be clicked, and one over it hides the screen.
function addNote() {
  const id = nextNoteId();
  drafts.add(id);
  const s = canvas.scale || 1;
  const x = Math.round(canvas.scroll.scrollLeft / s + 24);
  const bottom = Math.max(0, ...[...onStage.values()].map((e) => { const b = readBox(e.wrap); return b.y + (b.h ?? e.wrap.offsetHeight); }));
  const entry = placeNote({ id, text: "" }, { x: Math.max(0, x), y: Math.round(bottom + 32), w: NOTE_W });
  entry.wrap.scrollIntoView({ block: "nearest", inline: "nearest" });
  entry.editor.focus();
  canvas.say("New note — type, then Tab away to save.");
}

// ---- boot ------------------------------------------------------------------------------------------

function renderLabel(run) {
  const label = $("[data-canvas-label]");
  label.replaceChildren(el("span", { text: run.label.text }), el("span", { class: "cv-slug", text: ` · ${run.slug}` }));
  if (run.label.mismatch) {
    label.appendChild(el("span", { class: "cv-flag cv-mismatch", "data-canvas-mismatch": "", text: run.provenance === "real"
      ? " Stored under the jobs folder, but run.json says fictional."
      : " Stored in this repo, but run.json says real." }));
  }
  $("[data-canvas-where]").textContent = run.provenance === "fictional"
    ? `Saves into this repo at discovery/${run.slug}/build/, the handoff pack with it — commit to keep it, or git checkout the folder to discard.`
    : "Saves into the jobs folder, never committed.";
}

async function boot() {
  try {
    if (!provenance || !slug) throw new Error("open a run from the portal's Canvas list — this page needs ?provenance=…&slug=…");
    const [runRes, vocabRes] = await Promise.all([
      fetch(`/api/canvas/run?provenance=${encodeURIComponent(provenance)}&slug=${encodeURIComponent(slug)}`),
      fetch("/handoff/verdant/vocabulary.json"),
    ]);
    const run = await runRes.json().catch(() => ({}));
    if (!runRes.ok) throw new Error(run.error || runRes.statusText);
    if (!vocabRes.ok) throw new Error(`the vocabulary did not load (${vocabRes.status})`);
    vocab = await vocabRes.json();
    doc = run.doc;
    effective = run.effective;
    count = run.count;
    decisions = run.decisions;
    compose = run.compose ?? null;
    exhibitMeta = new Map((run.exhibits ?? []).map((e) => [e.id, e]));
    renderLabel(run);
    for (const n of run.canvas?.nodes ?? []) {
      boxes.set(n.id, { x: n.x, y: n.y, ...(n.type !== "frame" && { w: n.width }), ...(n.height != null && { h: n.height }) });
      if (n.type === "frame" && n.height != null) authoredH.add(n.id);
    }

    canvas = initStudioCanvas();
    if (!canvas) throw new Error("the canvas viewport is missing");
    reconcile();

    bus = createBus();
    // FIRST, before every consumer: where pending stood when this gesture began (call 5).
    for (const t of GEOMETRY_VERBS) bus.on(t, () => { gestureMark = pending.length; });
    registerConsumers();
    registerComposeConsumers();
    verbs = mountCanvasVerbs(canvas, { bus, docHook: adapter });
    // AFTER the verbs, so the guard judges the box they produced (setPos's clamp included), and
    // before the save below.
    for (const t of GEOMETRY_VERBS) bus.on(t, keepExhibitsBeside);
    const select = mountCanvasSelect(canvas, { bus });
    mountStudioLayers(document.body, { canvas, select });
    mountStudioMinimap(document.body, { canvas });
    wireInspector();
    wireLanes();
    $("[data-canvas-verb=annotate]").addEventListener("click", addNote);
    renderCompose();
    mountPromoted(getCanvasPage);
    lastSavedKey = canon(gatherPositions());
    // LAST, so it runs after every exact consumer (action-bus.mjs: exact handlers, then "*").
    bus.on("*", scheduleSave);
  } catch (e) {
    $("[data-canvas-label]").textContent = `Refused: ${e.message}`;
  } finally {
    document.documentElement.dataset.canvasPage = "ready";
  }
}

boot();
