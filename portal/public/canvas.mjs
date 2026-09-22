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
import { applyOp, frameTree, placeDecision } from "/system/canvas-ops.mjs";
import { PRESET_NAMES, WIDTH_MAX, WIDTH_MIN, presetWidth } from "/system/device-presets.mjs";

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

export const getCanvasPage = () => ({ doc, effective, count, pending });

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
  const tree = frameTree(doc, f.id);
  const screen = el("div", { class: "cv-screen" });
  if (tree.tree) {
    try { screen.appendChild(renderComposition(vocab, tree.tree)); }
    catch (e) { screen.appendChild(el("p", { class: "cv-flag", text: `Refused: ${e.message}` })); }
  }
  if (tree.flags.length) {
    screen.appendChild(el("p", { class: "cv-flag", text: `Flagged: ${tree.flags.map((fl) => `${fl.kind}${fl.partId ? ` ${fl.partId}` : ""}`).join(", ")}` }));
  }
  const chips = el("span", { class: "cv-chips" });
  if (!(f.decisionRefs ?? []).length) chips.appendChild(el("span", { class: "cv-chip cv-chip-none", text: "No decision linked" }));
  for (const r of f.decisionRefs ?? []) chips.appendChild(el("span", { class: "cv-chip", text: `Decision ${r}` }));
  return { screen, name: el("span", { class: "cv-name", text: frameName(f) }), chips };
}

const frameSig = (f) => canon({ tree: frameTree(doc, f.id), w: f.width, name: frameName(f), refs: f.decisionRefs ?? [] });

function fillFrame(entry, f) {
  const { screen, name, chips } = frameParts(f);
  // Re-inserting a focused button blurs it, so the Details button keeps its focus across a re-render.
  const hadFocus = document.activeElement === entry.details;
  const cap = el("p", { class: "stx-frame-cap cv-cap" }, name, chips, entry.details);
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

// ---- reconcile: make the stage say what the document says ----------------------------------------

function reconcile() {
  const want = new Set([...doc.frames.map((f) => f.id), ...(doc.notes ?? []).map((n) => n.id), ...refsInOrder().map((r) => `d${r}`)]);
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
  canvas.setArrows(doc.arrows);
}

// ---- applying the owner's ops -----------------------------------------------------------------------

function applyOwnerOp(op, { commit = true } = {}) {
  let next;
  try { next = applyOp(doc, op); }
  catch (e) { canvas.say(`Refused: ${e.message}`); return false; }
  doc = next;
  effective.push(op);
  pending.push({ ...op, status: "applied" });
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
    reconcile();
    const said = [];
    if (undone.length) said.push(`Undone: ${undone.map(describeOp).join("; ")}.`);
    if (redone.length) said.push(`Redone: ${redone.map(describeOp).join("; ")}.`);
    return said.join(" ");
  },
  resized(id, box) {
    const f = frameOf(id);
    if (!f) return;
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
  if (saving) { again = true; return; }
  const positions = gatherPositions();
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
    setSave("Saved");
  } catch (e) {
    broken = true;
    setSave(`Not saved — ${e.message}. Reload to continue.`);
  } finally {
    saving = false;
    if (again && !broken) { again = false; flush(); }
  }
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
      list.appendChild(el("label", { class: "cv-check" }, box, `${d.id} · ${d.question ?? d.questionId ?? "unknown question"}`));
    }
    linkBtn.addEventListener("click", (e) => emitFrom("ui.frame-link", e,
      { decisionRefs: [...list.querySelectorAll("input:checked")].map((b) => b.value) }));
    decisionsSet.append(list, linkBtn);
  }

  const removeBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Remove frame" });
  removeBtn.addEventListener("click", (e) => emitFrom("ui.frame-remove", e));
  const closeBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Close" });
  closeBtn.addEventListener("click", closeInspector);

  pop.replaceChildren(el("p", { class: "cv-inspector-title", text: `Details — ${spoken(f)}` }), device, decisionsSet,
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
  bus.on("ui.frame-size", (a) => {
    const id = a?.target?.id;
    const p = a?.params ?? {};
    const params = p.preset !== undefined ? { frameId: id, preset: p.preset } : { frameId: id, width: p.width };
    if (!applyOwnerOp({ op: "frame.size", params })) return;
    const f = frameOf(id);
    canvas.say(`${spoken(f)} is now ${f.preset ?? "custom"}, ${f.width} px wide.`);
  });
}

function addNote() {
  const id = nextNoteId();
  drafts.add(id);
  const s = canvas.scale || 1;
  const x = Math.round((canvas.scroll.scrollLeft + canvas.scroll.clientWidth / 2) / s - NOTE_W / 2);
  const y = Math.round((canvas.scroll.scrollTop + canvas.scroll.clientHeight / 2) / s - 60);
  const entry = placeNote({ id, text: "" }, { x: Math.max(0, x), y: Math.max(0, y), w: NOTE_W });
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
    ? `Saves into this repo at discovery/${run.slug}/build/ — commit to keep it, or git checkout the folder to discard.`
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
    renderLabel(run);
    for (const n of run.canvas?.nodes ?? []) {
      boxes.set(n.id, { x: n.x, y: n.y, ...(n.type !== "frame" && { w: n.width }), ...(n.height != null && { h: n.height }) });
      if (n.type === "frame" && n.height != null) authoredH.add(n.id);
    }

    canvas = initStudioCanvas();
    if (!canvas) throw new Error("the canvas viewport is missing");
    reconcile();

    bus = createBus();
    registerConsumers();
    verbs = mountCanvasVerbs(canvas, { bus, docHook: adapter });
    const select = mountCanvasSelect(canvas, { bus });
    mountStudioLayers(document.body, { canvas, select });
    mountStudioMinimap(document.body, { canvas });
    wireInspector();
    $("[data-canvas-verb=annotate]").addEventListener("click", addNote);
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
