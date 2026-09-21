// system/canvas-ops.mjs — hand-written canon (this repo; not generated). THE BUILD DOCUMENT's op
// grammar and its pure applier (epic #295 ticket #302; docs/epics/canvas-design-import.architecture.md;
// .claude/plans/canvas-swap-grid-retired-free-substrate-302.md, Task 4.2).
//
// WHAT THIS IS, AND WHAT IT IS NOT. The repo already had two op layers and this is the third, so the
// split is worth stating rather than inferring:
//
//   · system/board-ops.mjs   the SHAPE layer — places, affordances, connections. What the product IS
//                            made of, before anyone has decided what a screen looks like.
//   · discovery/ops.mjs      the DECISION layer — what was decided, by whom, resting on what.
//   · THIS FILE              the BUILD layer — screens, their states, their overrides, and the flow
//                            between them. The thing a discovery PRD becomes when it becomes design.
//
// Nothing recorded screens until now, which is why discovery/faster-payment/ carries a PRD and no
// design: there was nowhere for one to go.
//
// PURE AND DOM-FREE, AND NO SDK ANYWHERE IN ITS IMPORT GRAPH. It imports system/device-presets.mjs
// and nothing else. That is what lets tooling/build-checks.mjs drive every branch of it in CI with no
// browser and no portal/node_modules — the same property discovery/ops.mjs has and for the same
// reason.
//
// IT LIVES IN system/ AND THEREFORE COSTS LOC, which is a decision rather than an oversight.
// discovery/ops.mjs sits OUTSIDE system/ precisely because agent-layer/gen-loc-summary.mjs counts
// system/*.mjs as the design system and approach.html renders the number. This file is in because
// #306 WILL LOAD IT ON A SHIPPED PAGE — the canvas replaying a committed build the way the replay
// driver replays a committed run — which is board-ops.mjs's side of the same argument. Stated in
// the future tense on purpose (PR #432's F12): as of #302 the only importers are
// tooling/build-checks.mjs and comments, so the lines it adds to the group approach.html labels
// "view-time modules" are not yet view-time. Whether a module with no runtime consumer should count
// against that rendered total before #306 lands is the owner's call, and it is open.
//
// THE CONVENTIONS ARE discovery/ops.mjs's, COPIED RATHER THAN RE-ARGUED: a frozen OPS list, a PARAMS
// map whose entry per verb is EXACT rather than minimal, a private checkOp that validates the
// envelope and returns the params, one switch case per verb, a clone so the applier never mutates
// its argument, and applyOps folding with per-index error context.
//
// PARAMS IS EXPORTED, AND FROZEN AT BOTH LEVELS, and that is the one place this file deliberately
// copies discovery/ops.mjs rather than board-ops.mjs. board-ops keeps its PARAMS private, and the
// consequence is measured: build-checks group 11 has no per-verb loop at all, so a new board verb is
// covered only if someone remembers to widen a fixture by hand. Group 35 iterates OPS against PARAMS
// in both directions, which it cannot do against a private map. Object.freeze is shallow, so each
// inner array is frozen too — a pushable entry would let the "frozen by mutation" case pass for the
// wrong reason.
//
// AN OP NEVER CARRIES THE ID OF WHAT IT CREATES. board-ops.mjs's rule, verbatim in behaviour: ids are
// minted from the document's current state as the lowest free <prefix><n>, and there is no id slot in
// any PARAMS entry to smuggle one through. Frames get f1, arrows a1.

import { DEVICE_PRESETS, presetWidth } from "./device-presets.mjs";

// The six #302 lands. The architecture projects fourteen; the other eight (frame.remove, frame.link,
// annotate, group.define, group.place, variant.add, component.propose, proposal.ratify) are later
// tickets, and THE EPIC HOLDS AN OP-VERB LOCK: two tickets must not add ops here concurrently,
// because a verb is four edits in three files and a merge that takes both halves of two of them
// leaves a verb with no PARAMS entry or a PARAMS entry with no case.
export const OPS = Object.freeze([
  "screen.compose",
  "screen.set",
  "state.add",
  "frame.size",
  "connect",
  "disconnect",
]);

// EXACT, NOT MINIMAL — an unknown key throws rather than being ignored. discovery/ops.mjs's rule and
// its reason: an op whose recorded text says more than the op that was applied is a record of
// something that did not happen.
export const PARAMS = Object.freeze({
  "screen.compose": Object.freeze(["screenId", "why", "composition", "decisionRefs"]),
  "screen.set": Object.freeze(["frameId", "partId", "prop", "value"]),
  "state.add": Object.freeze(["baseId", "stateKey", "override"]),
  "frame.size": Object.freeze(["frameId", "preset"]),
  connect: Object.freeze(["from", "to", "trigger"]),
  disconnect: Object.freeze(["arrowId"]),
});

// The params a verb may omit. Everything else in its PARAMS entry is required, which is the half of
// "exact" that catches a caller who knows the key and forgot the value.
const OPTIONAL = Object.freeze({
  "screen.compose": Object.freeze(["decisionRefs"]),
  connect: Object.freeze(["trigger"]),
});

// THE REQUIRED MINIMUM, not the whole enum. A screen that only exists in its happy state is a screen
// nobody has designed the failure of, and these five are the states the architecture names as the
// floor. The enum is OPEN — a screen may declare more — but state.add refuses a key outside this set
// until the screen declares it, so a typo becomes a refusal rather than a sixth state nothing else
// knows about.
export const STATE_KEYS = Object.freeze(["ideal", "empty", "error", "partial", "loading"]);

export const emptyDoc = () => ({ frames: [], arrows: [], notes: [], groups: {}, variants: [], proposals: [] });

const clone = (doc) => structuredClone(doc);

// breadboard.mjs:172's rule, verbatim in behaviour: the lowest free <prefix><n>.
function nextId(prefix, taken) {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

// PRIVATE, like board-ops.mjs's and discovery/ops.mjs's. Group 35 drives it through applyOp rather
// than directly, which is what keeps the group asserting the APPLIER's behaviour rather than a
// helper's.
function checkOp(op) {
  if (!op || typeof op !== "object" || Array.isArray(op)) {
    throw new Error("an op must be an object { op, params }");
  }
  // THE ENVELOPE IS EXACT TOO, one level up from params. discovery/ops.mjs:296-300 closes it for the
  // reason board-ops.mjs learned at #226: `{op, params, extra}` parsed and `extra` was silently
  // dropped, so the recorded op said more than the applied one.
  for (const k of Object.keys(op)) {
    if (k !== "op" && k !== "params") {
      throw new Error(`unknown key "${k}" on the op envelope — an op is exactly { op, params }`);
    }
  }
  if (!OPS.includes(op.op)) {
    throw new Error(`"${op.op}" is not an op — the vocabulary is ${OPS.join(" · ")}`);
  }
  const params = op.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error(`${op.op}: "params" must be an object, not ${op.params === null ? "null" : Array.isArray(op.params) ? "an array" : typeof op.params}`);
  }
  const allowed = PARAMS[op.op];
  for (const k of Object.keys(params)) {
    if (!allowed.includes(k)) {
      throw new Error(`${op.op}: unknown param "${k}" — it takes ${allowed.join(", ")} (an op never carries an id for what it creates)`);
    }
  }
  for (const k of allowed) {
    if (params[k] === undefined && !(OPTIONAL[op.op] ?? []).includes(k)) {
      throw new Error(`${op.op}: "${k}" is required`);
    }
  }
  plainData(params, op.op, "params");
  return params;
}

// PARAMS ARE PLAIN DATA, REFUSED BY PATH (#437, PR #432's F6). applyOp structuredClones the params,
// and structuredClone throws a DataCloneError on a function or a symbol anywhere inside them — a
// message that names no path, against the convention every other refusal in this file keeps. That
// is unreachable from JSONL, the stated write path, and reachable from a JS caller composing an op
// in memory, which is what #306's page does. So the walk runs before the clone and names the
// offending path; group 35 drives it and would meet the unnamed DataCloneError without it.
function plainData(value, verb, path) {
  const t = typeof value;
  if (t === "function" || t === "symbol") {
    throw new Error(`${verb}: ${path} is a ${t} — an op's params are plain data a JSONL line can carry`);
  }
  if (value && t === "object") {
    for (const [k, v] of Object.entries(value)) plainData(v, verb, `${path}.${k}`);
  }
}

// CONNECT'S TWO ENDPOINTS, EXACT THE WAY PARAMS IS (#302, PR #432's open question 3, owner's call
// 2026-09-21: close it). The rule this file states about itself — a recorded op never says more than
// the op that was applied — was enforced on the ENVELOPE and one level down was open: an unknown key
// on the op is refused by name, and the same key inside `from` was accepted and stored verbatim, so
// a document could carry a claim no applier ever read. `from` takes an optional partId because an
// arrow may leave a specific part of a screen; `to` arrives at the screen, so it takes none — the
// asymmetry is the shape studio-canvas.mjs:685 already documents. Declared rather than inlined so
// the roster is iterable and a third endpoint cannot be half-added.
export const ENDPOINT_KEYS = Object.freeze({
  from: Object.freeze(["frameId", "partId"]),
  to: Object.freeze(["frameId"]),
});

export function applyOp(doc, op) {
  if (!doc || !Array.isArray(doc.frames) || !Array.isArray(doc.arrows)) {
    throw new Error("applyOp: the document must carry frames and arrows arrays — start from emptyDoc()");
  }
  // THE PARAMS ARE CLONED TOO (#302, PR #432's F5). clone(doc) protects the ARGUMENT; it does
  // nothing about what the returned document points AT. screen.compose stored p.composition,
  // state.add stored p.override and connect stored p.from/p.to by reference, so
  // `doc.arrows[0].from === op.params.from` was true and a caller editing the returned document
  // silently rewrote the op record it was built from — which is precisely what a canvas surface
  // editing a loaded build does. Group 35 proved purity by mutating the input document and by
  // mutating the return; neither reaches an alias that runs the other way.
  const p = clone(checkOp(op));
  const next = clone(doc);
  const frameIds = () => new Set(next.frames.map((f) => f.id));
  // Named by the verb that asked, so a dangling reference says which op could not resolve it rather
  // than which lookup failed. discovery/ops.mjs's resolveAnswer shape.
  const frame = (id, field) => {
    const f = next.frames.find((x) => x.id === id);
    if (!f) {
      throw new Error(`${op.op}: ${field} "${id}" does not resolve — this document holds ${next.frames.map((x) => x.id).join(", ") || "no frames"}`);
    }
    return f;
  };

  switch (op.op) {
    case "screen.compose": {
      // D4, AND IT IS THE ONE REFUSAL IN THIS FILE THAT IS ABOUT JUDGEMENT RATHER THAN SHAPE. A
      // composition with no stated reason is a screen nobody can argue with — the reader cannot tell
      // a decision from a default, and the handoff pack inherits a picture with no claim attached.
      // Empty-string is refused as loudly as absent: `why: ""` satisfies "is present" and says
      // nothing, which is the shape a caller reaches for when the field is in the way.
      if (typeof p.why !== "string" || !p.why.trim()) {
        throw new Error(`screen.compose: "why" must be one sentence naming the decision and the reason — a composition nobody can judge is refused (D4)`);
      }
      next.frames.push({
        id: nextId("f", frameIds()),
        screenId: p.screenId,
        stateKey: "ideal",
        preset: "phone",
        width: DEVICE_PRESETS.phone,
        decisionRefs: p.decisionRefs ?? [],
        composition: p.composition,
        why: p.why,
      });
      break;
    }
    case "screen.set": {
      const f = frame(p.frameId, "frameId");
      (f.sets ??= {})[p.partId] = { ...(f.sets[p.partId] ?? {}), [p.prop]: p.value };
      break;
    }
    case "state.add": {
      const base = frame(p.baseId, "baseId");
      // A STATE IS A SIBLING OF A SCREEN, NOT OF ANOTHER STATE (#302, PR #432's open question 1,
      // owner's call 2026-09-21: refuse by name). A state of a state resolved fine and read as
      // sensible, and it sat OUTSIDE the floor check entirely: missingStates considers base frames
      // only, so a nested one is never asked for its five states and never reported missing one.
      // Refusing it here is the only place that can tell, because by the time missingStates runs the
      // nesting looks like an ordinary frame with a baseId.
      if (base.baseId) {
        throw new Error(`state.add: "${p.baseId}" is itself the ${base.stateKey} state of "${base.baseId}" — a state is a sibling of a SCREEN, and a state of a state sits outside missingStates' floor check entirely`);
      }
      if (!STATE_KEYS.includes(p.stateKey)) {
        throw new Error(`state.add: "${p.stateKey}" is not one of the required minimum ${STATE_KEYS.join(" · ")} — the enum is open, but a screen declares a state of its own before a frame can carry it`);
      }
      // ONE STATE PER KEY PER SCREEN (#302, PR #432's open question 2, owner's call 2026-09-21:
      // refuse a second one). Two frames claiming the same (baseId, stateKey) is two designs for one
      // state, and missingStates counts DISTINCT keys — so the duplicate was absorbed and the screen
      // still read as covered. The refusal names the twin, because "already has one" without saying
      // which one leaves the author hunting.
      const twin = next.frames.find((f) => f.baseId === base.id && f.stateKey === p.stateKey);
      if (twin) {
        throw new Error(`state.add: "${base.id}" already carries a "${p.stateKey}" state (${twin.id}) — one design per state per screen, and missingStates counts distinct keys so a second one would be absorbed rather than reported`);
      }
      // A STATE IS A SIBLING FRAME CARRYING AN OVERRIDE, never a copy of the base. The architecture's
      // call, and the reason resolve() exists: a copy drifts from its base the first time the base
      // changes, and the whole point of a state is that it IS the base except where it says so.
      next.frames.push({
        id: nextId("f", frameIds()),
        baseId: base.id,
        stateKey: p.stateKey,
        preset: base.preset,
        width: base.width,
        overrides: p.override,
      });
      break;
    }
    case "frame.size": {
      const f = frame(p.frameId, "frameId");
      const w = presetWidth(p.preset);
      if (w === null) {
        throw new Error(`frame.size: "${p.preset}" is not a device preset — the table is ${Object.keys(DEVICE_PRESETS).join(", ")}`);
      }
      // BOTH are recorded. The name is what the author chose; the width is what they saw. A later
      // edit to the table then moves new frames and leaves this one where it was.
      f.preset = p.preset;
      f.width = w;
      break;
    }
    case "connect": {
      if (!p.from || typeof p.from !== "object" || !p.to || typeof p.to !== "object") {
        throw new Error(`connect: "from" and "to" are each an object naming a frame — { frameId, partId? } and { frameId } — and this op carried from: ${JSON.stringify(p.from)}, to: ${JSON.stringify(p.to)}`);
      }
      // EXACT ONE LEVEL DOWN TOO — see ENDPOINT_KEYS. Iterated rather than written twice, so `to`
      // gaining a key is one edit to the roster and not a second forgotten branch here.
      for (const side of ["from", "to"]) {
        for (const k of Object.keys(p[side])) {
          if (!ENDPOINT_KEYS[side].includes(k)) {
            throw new Error(`connect: unknown key "${k}" on "${side}" — it takes ${ENDPOINT_KEYS[side].join(", ")}, and an op never records a field the applier does not read`);
          }
        }
      }
      frame(p.from.frameId, "from.frameId");
      frame(p.to.frameId, "to.frameId");
      next.arrows.push({
        id: nextId("a", new Set(next.arrows.map((a) => a.id))),
        from: p.from,
        to: p.to,
        trigger: p.trigger ?? null,
      });
      break;
    }
    case "disconnect": {
      const i = next.arrows.findIndex((a) => a.id === p.arrowId);
      if (i < 0) {
        throw new Error(`disconnect: arrowId "${p.arrowId}" does not resolve — this document holds ${next.arrows.map((a) => a.id).join(", ") || "no arrows"}`);
      }
      next.arrows.splice(i, 1);
      break;
    }
    // Unreachable: checkOp refused every verb outside OPS. Kept because the day a seventh verb is
    // added to OPS and not to the switch, this is the line that says so.
    default: throw new Error(`"${op.op}" is in OPS but has no case in the applier`);
  }
  return next;
}

export function applyOps(ops, doc = emptyDoc()) {
  if (!Array.isArray(ops)) throw new Error("applyOps: ops must be an array");
  let acc = doc;
  ops.forEach((o, i) => {
    try {
      acc = applyOp(acc, o);
    } catch (e) {
      throw new Error(`op ${i} (${o?.op ?? "?"}): ${e.message}`);
    }
  });
  return acc;
}

// ---- the pure reads -----------------------------------------------------------------------------
// A READ IS NOT A VERB. discovery/ops.mjs states this at each of its five: a read does not take the
// epic's op-verb lock and may not touch OPS, PARAMS or the switch. Reads are also TOTAL OVER JUNK —
// they skip a malformed item rather than throwing — which is the opposite of the applier's posture
// and deliberate: a view that throws takes a page down over a record the applier already accepted.
//
// canDeleteBasePart below is the exception that proves the split: it is a REFUSAL, so it throws, and
// it is named as a question rather than as a read.

// resolve(base, override) → { resolved, flags }.
//
// A DANGLING OVERRIDE IS FLAGGED AND SHOWN, NEVER DROPPED (the architecture's G2/G3/G33). An override
// naming a part the base no longer has is a real thing someone wrote, and silently dropping it makes
// the canvas disagree with the document about what the state says. The flag is how the surface can
// show the state AND say which part of it no longer lands.
export function resolve(base, override) {
  const parts = base && typeof base.parts === "object" && base.parts ? base.parts : {};
  const known = new Set(Object.keys(parts));
  const out = structuredClone({ ...(base ?? {}), parts });
  const flags = [];
  const set = override && typeof override.set === "object" && override.set ? override.set : {};
  for (const [partId, props] of Object.entries(set)) {
    if (!known.has(partId)) { flags.push({ kind: "dangling-set", partId }); continue; }
    out.parts[partId] = { ...out.parts[partId], ...props };
  }
  for (const partId of Array.isArray(override?.hide) ? override.hide : []) {
    if (!known.has(partId)) { flags.push({ kind: "dangling-hide", partId }); continue; }
    out.parts[partId] = { ...out.parts[partId], hidden: true };
  }
  return { resolved: out, flags };
}

// missingStates(doc, variantKey?) → [{ frameId, screenId, missing: [...] }] — for every BASE frame,
// which of the required minimum states has no sibling.
//
// THE POINT IS THE LIST, NOT A COUNT. "Three states missing" is a number; "error and empty are
// missing from the payment screen" is something an author can act on. Bases with nothing missing are
// omitted, so an empty answer means the floor is met rather than that nothing was checked.
//
// `variantKey` narrows to one variant when the document has them. Absent, every base is considered.
export function missingStates(doc, variantKey) {
  const frames = Array.isArray(doc?.frames) ? doc.frames.filter((f) => f && typeof f === "object") : [];
  const out = [];
  for (const base of frames) {
    if (base.baseId != null || base.id == null) continue; // a state is not a base
    if (variantKey !== undefined && base.variantKey !== variantKey) continue;
    const have = new Set(frames.filter((f) => f.baseId === base.id).map((f) => f.stateKey));
    have.add(base.stateKey ?? "ideal"); // the base IS its own ideal
    const missing = STATE_KEYS.filter((k) => !have.has(k));
    if (missing.length) out.push({ frameId: base.id, screenId: base.screenId ?? null, missing });
  }
  return out;
}

// canDeleteBasePart(doc, baseId, partId) → true, or THROWS naming every state that still overrides it.
//
// A REFUSAL, NOT A READ, and the applier's posture is the right one here: deleting a part a state
// overrides would leave that state's override dangling, and resolve() would then flag it forever. The
// honest order is to drop the override first, which is what the message tells the author to do.
export function canDeleteBasePart(doc, baseId, partId) {
  const frames = Array.isArray(doc?.frames) ? doc.frames : [];
  const blockers = frames.filter((f) => f && f.baseId === baseId
    && (Object.hasOwn(f.overrides?.set ?? {}, partId) || (Array.isArray(f.overrides?.hide) ? f.overrides.hide : []).includes(partId)));
  if (blockers.length) {
    throw new Error(`cannot delete part "${partId}" from "${baseId}": ${blockers.map((b) => `${b.stateKey} (${b.id})`).join(", ")} still override it — drop the override first`);
  }
  return true;
}
