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
// system/*.mjs as the design system and approach.html renders the number. This file is in because a
// browser page loads it — board-ops.mjs's side of the same argument. As of #306 its first runtime
// consumer is portal/public/canvas.mjs, the build canvas: an OPERATOR page on the local portal, not a
// shipped one. So the lines it adds to the group approach.html labels "view-time modules" are loaded
// at view time, but not by a reader of the public site; whether that should count against the
// rendered total is the owner's call, and it is still open.
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
// any PARAMS entry to smuggle one through. Frames get f1, arrows a1, notes n1 — annotate's noteId
// names a note to EDIT and must resolve, so it is not a slot either.
//
// GROUPS (#315). `group.define` saves some parts of a screen as a named definition, DERIVED from the frame's
// resolved tree (the op names parts, never carries them); `group.place` puts a COPY of it — a `group` node
// `{name: "group", id: "g1-1", props: {groupId}, overrides?}` — into a base frame's composition, and with
// `instanceId` replaces that copy's `{set, hide}` overrides. frameTree expands every copy before any layer: the
// definition's parts, the copy's override resolved by definition ids, every id renamed <copy>/<part>, spliced
// where the copy was. So `/` is reserved in part ids, and the renderer never sees a `group` node.
//
// DECLARED STATES (#316). `screen.compose` may carry `states`: the kebab-case keys this screen needs BEYOND the
// floor (Confirmation of Payee's close-match, a send's pending). A declared key is then a state `state.add` accepts
// for that base, and missingStates REQUIRES it like the floor's five — an allowed-but-unrequired key is never asked
// for. There is no re-declare path: a wrong declaration is frame.remove and a new compose.

import { DEVICE_PRESETS, WIDTH_MAX, WIDTH_MIN, presetWidth } from "./device-presets.mjs";

// The six #302 landed, #306's four (frame.remove, frame.link, annotate, variant.add), #311's
// component.propose, #313's proposal.ratify, and #315's group.define and group.place — the last two of the
// architecture's fourteen; the count is final. THE EPIC HELD AN OP-VERB LOCK while it grew: two tickets must not
// add ops here concurrently, because a verb is four edits in three files and a merge that takes both
// halves of two of them leaves a verb with no PARAMS entry or a PARAMS entry with no case.
export const OPS = Object.freeze([
  "screen.compose",
  "screen.set",
  "state.add",
  "frame.size",
  "connect",
  "disconnect",
  "frame.remove",
  "frame.link",
  "annotate",
  "variant.add",
  "component.propose",
  "proposal.ratify",
  "group.define",
  "group.place",
]);

// EXACT, NOT MINIMAL — an unknown key throws rather than being ignored. discovery/ops.mjs's rule and
// its reason: an op whose recorded text says more than the op that was applied is a record of
// something that did not happen.
export const PARAMS = Object.freeze({
  "screen.compose": Object.freeze(["screenId", "why", "composition", "decisionRefs", "states"]),
  "screen.set": Object.freeze(["frameId", "partId", "prop", "value"]),
  "state.add": Object.freeze(["baseId", "stateKey", "override"]),
  "frame.size": Object.freeze(["frameId", "preset", "width"]),
  connect: Object.freeze(["from", "to", "trigger"]),
  disconnect: Object.freeze(["arrowId"]),
  "frame.remove": Object.freeze(["frameId"]),
  "frame.link": Object.freeze(["frameId", "decisionRefs"]),
  annotate: Object.freeze(["noteId", "text"]),
  "variant.add": Object.freeze(["key", "overrides"]),
  "component.propose": Object.freeze(["name", "recordId", "groupId", "mode"]),
  "proposal.ratify": Object.freeze(["proposalId", "component"]),
  "group.define": Object.freeze(["groupId", "name", "frameId", "partIds"]),
  "group.place": Object.freeze(["frameId", "groupId", "parentId", "index", "instanceId", "overrides"]),
});

// The params a verb may omit. Everything else in its PARAMS entry is required, which is the half of
// "exact" that catches a caller who knows the key and forgot the value. frame.size's two are
// optional HERE because the rule is "exactly one of them", which the case enforces by name.
const OPTIONAL = Object.freeze({
  "screen.compose": Object.freeze(["decisionRefs", "states"]),
  "frame.size": Object.freeze(["preset", "width"]),
  connect: Object.freeze(["trigger"]),
  annotate: Object.freeze(["noteId"]),
  "component.propose": Object.freeze(["recordId", "groupId"]),
  "group.define": Object.freeze(["groupId"]),
  "group.place": Object.freeze(["groupId", "parentId", "index", "instanceId", "overrides"]),
});

// A placed copy's override (#315, D6): set and hide only. `add` is a state's (G19) — a copy that adds parts is another group.
export const GROUP_OVERRIDE_KEYS = Object.freeze(["set", "hide"]);
// RESERVED in part ids (#315, D4): an expanded copy's parts are named <instanceId>/<partId>.
export const PART_SEP = "/";
const GROUP_ID_RE = /^g[1-9][0-9]*$/;

// A variant's key: short, lowercase, a slug. It names a lane on the canvas and in the handoff, so it
// is refused rather than normalised — a key the author did not type is a lane they cannot find.
const VARIANT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;
// A declared state's key (#316): kebab-case, 2–24 characters, refused rather than normalised like a lane's.
export const STATE_KEY_RE = /^[a-z][a-z0-9-]{1,23}$/;
// "a" is RESERVED: lane A is the document itself, which every other lane is its differences on (#314).
// A lane's override takes exactly these keys. `omit: true`, alone, leaves the frame out of the lane (#314, owner
// 2026-09-29); omitting a BASE leaves its states out too (laneDoc's rule).
export const LANE_OVERRIDE_KEYS = Object.freeze(["set", "hide", "add", "omit"]);
// A proposal's name is a component name to be: refused, never normalised, by the same rule.
export const PROPOSAL_NAME_RE = /^[a-z][a-z0-9-]{1,39}$/;

const plainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// THE REQUIRED MINIMUM, not the whole enum. A screen that only exists in its happy state is a screen
// nobody has designed the failure of, and these five are the states the architecture names as the
// floor. The enum is OPEN — a screen declares more at compose (`states`, #316) — but state.add refuses a key
// outside this set until the screen declares it, so a typo becomes a refusal rather than a sixth state nothing
// else knows about.
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

// A FROZEN ORIGINAL NEVER ENTERS A FRAME (#475, G7). A Mode 2 proposal is kept beside the flow for
// comparison; a composition, a state's override.add or a variant's overrides.<frame>.add naming it
// would put it inside a screen. The walk follows `children` and an add entry's `part` (the
// architecture's {parentId, index, part} wrapper, which has no name of its own), never `props`, where a
// component may carry a prop that happens to be called `name`. FORWARD ONLY: a name proposed as Mode 2 after a frame
// already uses it is not caught, because the applier refuses what an op does, never retroactively —
// and import-run's proposalName never picks a name a frame could already render.
function refuseFrozen(verb, tree, doc) {
  const frozen = new Map(doc.proposals.filter((x) => x && x.mode === 2).map((x) => [x.name, x]));
  if (!frozen.size) return;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!plainObject(node)) return;
    const pr = frozen.get(node.name);
    if (pr) throw new Error(`${verb}: "${node.name}" is a frozen original (Mode 2, ${pr.id}) — it stays beside the flow as an exhibit and never enters a frame (G7)`);
    if (Array.isArray(node.children)) node.children.forEach(walk);
    if (plainObject(node.part)) walk(node.part);
  };
  walk(tree);
}

// PART_SEP IS RESERVED WHEREVER AN OP INSERTS PARTS (#315, D4; PR #494 review F3). frameTree names an
// expanded copy's parts <instanceId>/<partId>, so a raw part called "g1-1/title" would collide with one.
// canvas-session.mjs's idProblem refuses it on the agent path; this is the applier's own refusal, for
// every other path. Same walk as refuseFrozen: `children` and an add entry's `part`.
function refuseReservedId(verb, tree) {
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!plainObject(node)) return;
    if (typeof node.id === "string" && node.id.includes(PART_SEP)) {
      throw new Error(`${verb}: part id "${node.id}" holds "${PART_SEP}", which is reserved — a placed copy's parts are named <copy>${PART_SEP}<part> (#315)`);
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
    if (plainObject(node.part)) walk(node.part);
  };
  walk(tree);
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

// #315 helpers. walkNodes follows `children` only (and arrays), frameTree's walk.
function walkNodes(tree, fn) {
  if (Array.isArray(tree)) { tree.forEach((t) => walkNodes(t, fn)); return; }
  if (!plainObject(tree)) return;
  fn(tree);
  for (const c of Array.isArray(tree.children) ? tree.children : []) walkNodes(c, fn);
}
function instancesOf(frame) {
  const out = [];
  walkNodes(frame?.composition, (n) => { if (n.name === "group" && typeof n.id === "string") out.push(n); });
  return out;
}
function checkGroupOverride(ov) {
  if (!plainObject(ov)) throw new Error(`group.place: "overrides" must be an object — this op carried ${JSON.stringify(ov)}`);
  for (const k of Object.keys(ov)) {
    if (k === "add") throw new Error(`group.place: overrides.add — a copy takes set and hide; add is a state's (G19), and a copy that adds parts is another group`);
    if (!GROUP_OVERRIDE_KEYS.includes(k)) throw new Error(`group.place: unknown key "${k}" in overrides — a copy's override takes ${GROUP_OVERRIDE_KEYS.join(", ")}`);
  }
  if (ov.set !== undefined && (!plainObject(ov.set) || Object.values(ov.set).some((v) => !plainObject(v)))) {
    throw new Error(`group.place: overrides.set must be an object of part id → props object — this op carried ${JSON.stringify(ov.set)}`);
  }
  if (ov.hide !== undefined && (!Array.isArray(ov.hide) || ov.hide.some((x) => typeof x !== "string"))) {
    throw new Error(`group.place: overrides.hide must be an array of part ids — this op carried ${JSON.stringify(ov.hide)}`);
  }
}

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
  // emptyDoc() carries both; a document hand-built in a test, or saved before #306, may not.
  next.notes ??= [];
  next.variants ??= [];
  next.proposals ??= [];
  next.groups ??= {};
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
      refuseFrozen("screen.compose", p.composition, next);
      refuseReservedId("screen.compose", p.composition);
      if (p.states !== undefined) {
        if (!Array.isArray(p.states)) throw new Error(`screen.compose: "states" must be a list of state keys, not ${JSON.stringify(p.states)}`);
        p.states.forEach((k, i) => {
          if (typeof k !== "string" || !STATE_KEY_RE.test(k)) throw new Error(`screen.compose: states[${i}] ${JSON.stringify(k)} is not a kebab-case key of 2–24 characters (e.g. close-match)`);
          if (STATE_KEYS.includes(k)) throw new Error(`screen.compose: states[${i}] "${k}" is already the floor's — declare only states beyond ${STATE_KEYS.join(" · ")}`);
          if (p.states.indexOf(k) !== i) throw new Error(`screen.compose: states[${i}] "${k}" is declared twice`);
        });
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
        ...(p.states?.length && { states: [...p.states] }),
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
      const declared = Array.isArray(base.states) ? base.states : [];
      if (!STATE_KEYS.includes(p.stateKey) && !declared.includes(p.stateKey)) {
        throw new Error(`state.add: "${p.stateKey}" is not one of the required minimum ${STATE_KEYS.join(" · ")} — the enum is open, but a screen declares a state of its own before a frame can carry it, and "${base.id}" declares ${declared.join(" · ") || "none"}`);
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
      if (plainObject(p.override) && p.override.add !== undefined) {
        refuseFrozen("state.add", p.override.add, next);
        refuseReservedId("state.add", p.override.add);
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
      // EXACTLY ONE OF preset / width (#306). A preset names a device; a width is a frame dragged or
      // typed to a size no device names. Both at once would be two claims about one fact.
      if ((p.preset === undefined) === (p.width === undefined)) {
        throw new Error(`frame.size: give "preset" or "width", exactly one — this op carried ${p.preset === undefined ? "neither" : "both"}`);
      }
      if (p.width !== undefined) {
        if (!Number.isInteger(p.width) || p.width < WIDTH_MIN || p.width > WIDTH_MAX) {
          throw new Error(`frame.size: width ${JSON.stringify(p.width)} is not a whole number of px in ${WIDTH_MIN}–${WIDTH_MAX} — a free width is refused by name, never clamped`);
        }
        // preset: null IS the recorded fact "custom, chosen by dragging or typing", not a missing
        // value — the frame no longer claims to be any device.
        f.preset = null;
        f.width = p.width;
        break;
      }
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
    case "frame.remove": {
      const f = frame(p.frameId, "frameId");
      // A WHOLE FRAME, NOT A PART — which is why this is not canDeleteBasePart. A state is its base
      // plus its differences, and a variant lane overrides frames by id; removing the frame under
      // either would leave it overriding nothing. The refusal names every blocker.
      const states = next.frames.filter((x) => x.baseId === f.id);
      const lanes = next.variants.filter((v) => v && Object.hasOwn(v.overrides ?? {}, f.id));
      if (states.length || lanes.length) {
        const blockers = [...states.map((s) => `${s.stateKey} (${s.id})`), ...lanes.map((v) => `variant ${v.key}`)];
        throw new Error(`frame.remove: "${f.id}" is still overridden — ${blockers.join(", ")} — remove those first, because each is this frame plus its differences and would be left overriding nothing`);
      }
      next.frames.splice(next.frames.indexOf(f), 1);
      // The arrows touching it go with it (Q7): an arrow to nothing is not a flow.
      next.arrows = next.arrows.filter((a) => a?.from?.frameId !== f.id && a?.to?.frameId !== f.id);
      break;
    }
    case "frame.link": {
      const f = frame(p.frameId, "frameId");
      // REPLACES THE LIST, so one verb is link, unlink and #318's re-confirm. The applier cannot see
      // the transcript, so whether a ref names a real decision is the save route's check (D4).
      if (!Array.isArray(p.decisionRefs)) {
        throw new Error(`frame.link: "decisionRefs" must be an array of decision ids — this op carried ${JSON.stringify(p.decisionRefs)}`);
      }
      const bad = p.decisionRefs.find((r) => typeof r !== "string" || !r.trim());
      if (bad !== undefined) {
        throw new Error(`frame.link: every decision ref is a non-empty string — this op carried ${JSON.stringify(bad)}`);
      }
      const dup = p.decisionRefs.find((r, i) => p.decisionRefs.indexOf(r) !== i);
      if (dup !== undefined) {
        throw new Error(`frame.link: decision "${dup}" is listed twice — a frame embodies a decision once`);
      }
      f.decisionRefs = [...p.decisionRefs];
      break;
    }
    case "annotate": {
      if (typeof p.text !== "string" || !p.text.trim()) {
        throw new Error(`annotate: "text" must say something — a note left blank records nothing (T8)`);
      }
      if (p.noteId !== undefined) {
        // noteId is an EDIT target and must resolve — otherwise it is the slot a caller would use to
        // mint an id of its own choosing.
        const n = next.notes.find((x) => x && x.id === p.noteId);
        if (!n) {
          throw new Error(`annotate: noteId "${p.noteId}" does not resolve — this document holds ${next.notes.map((x) => x.id).join(", ") || "no notes"}; an op names a note to EDIT, never the id of one it creates`);
        }
        n.text = p.text;
        break;
      }
      next.notes.push({ id: nextId("n", new Set(next.notes.map((n) => n.id))), text: p.text });
      break;
    }
    case "variant.add": {
      if (typeof p.key !== "string" || !VARIANT_KEY_RE.test(p.key)) {
        throw new Error(`variant.add: key ${JSON.stringify(p.key)} is not a lane key — lowercase letters, digits and hyphens, 1–24, starting with a letter or digit`);
      }
      if (p.key === "a") {
        throw new Error(`variant.add: "a" is lane A — the base document itself, which every other lane is its differences on; name the new lane b, c, …`);
      }
      if (next.variants.some((v) => v && v.key === p.key)) {
        throw new Error(`variant.add: variant "${p.key}" already exists — one lane per key`);
      }
      if (!plainObject(p.overrides)) {
        throw new Error(`variant.add: "overrides" must be an object keyed by frame id — this op carried ${Array.isArray(p.overrides) ? "an array" : JSON.stringify(p.overrides)}`);
      }
      for (const [fid, ov] of Object.entries(p.overrides)) {
        frame(fid, "overrides key");
        if (!plainObject(ov)) {
          throw new Error(`variant.add: the override for "${fid}" must be an object — this op carried ${JSON.stringify(ov)}`);
        }
        for (const k of Object.keys(ov)) {
          if (!LANE_OVERRIDE_KEYS.includes(k)) {
            throw new Error(`variant.add: unknown key "${k}" in the override for "${fid}" — a lane override takes ${LANE_OVERRIDE_KEYS.join(", ")}`);
          }
        }
        if (ov.omit !== undefined && ov.omit !== true) {
          throw new Error(`variant.add: "omit" on "${fid}" must be true — a frame is either left out of the lane or not`);
        }
        if (ov.omit === true && Object.keys(ov).length > 1) {
          throw new Error(`variant.add: "${fid}" is left out of lane "${p.key}" and also carries ${Object.keys(ov).filter((k) => k !== "omit").join(", ")} — a frame left out has nothing to set`);
        }
        // The lane reads skip a malformed part, so a wrong type here would be a lane that changes nothing, refused by
        // no one (PR #491 F2). add stays an array or an object: refuseFrozen walks both, and neither is rendered.
        if (ov.set !== undefined && (!plainObject(ov.set) || Object.values(ov.set).some((v) => !plainObject(v)))) {
          throw new Error(`variant.add: overrides.${fid}.set must be an object of part id → props object — this op carried ${JSON.stringify(ov.set)}`);
        }
        if (ov.hide !== undefined && (!Array.isArray(ov.hide) || ov.hide.some((x) => typeof x !== "string"))) {
          throw new Error(`variant.add: overrides.${fid}.hide must be an array of part ids — this op carried ${JSON.stringify(ov.hide)}`);
        }
        if (ov.add !== undefined && !plainObject(ov.add) && !Array.isArray(ov.add)) {
          throw new Error(`variant.add: overrides.${fid}.add must be a composition node or an array of them — this op carried ${JSON.stringify(ov.add)}`);
        }
        if (ov.add !== undefined) {
          refuseFrozen("variant.add", ov.add, next);
          refuseReservedId("variant.add", ov.add);
        }
      }
      // Stored as an override map keyed by frame id (G33). The lane UI and the per-variant
      // completeness check are #314's.
      next.variants.push({ key: p.key, overrides: p.overrides });
      break;
    }
    case "component.propose": {
      // The applier sees neither the filesystem nor the vocabulary: that proposals/<name>/ exists and
      // that name is not a vocabulary component are portal/lib/import-run.mjs's checks. status moves
      // only through proposal.ratify (#313); the filesystem half of a ratify — the spec, the CSS, the
      // registry entry — is portal/lib/ratify.mjs's, which is why nothing here reaches the vocabulary.
      if (typeof p.name !== "string" || !PROPOSAL_NAME_RE.test(p.name)) {
        throw new Error(`component.propose: name ${JSON.stringify(p.name)} is not a component name — lowercase letters, digits and hyphens, 2–40, starting with a letter`);
      }
      // Two entrances, one path (#315, D1): an import record, or a saved group — exactly one.
      if ((p.recordId === undefined) === (p.groupId === undefined)) {
        throw new Error(`component.propose: give recordId or groupId, exactly one — this op carried ${p.recordId === undefined ? "neither" : "both"}`);
      }
      if (p.recordId !== undefined && (typeof p.recordId !== "string" || !/^i[1-9][0-9]*$/.test(p.recordId))) {
        throw new Error(`component.propose: recordId ${JSON.stringify(p.recordId)} is not an import record id (i1, i2, …)`);
      }
      if (p.mode !== 1 && p.mode !== 2) throw new Error(`component.propose: mode ${JSON.stringify(p.mode)} must be 1 or 2`);
      if (p.groupId !== undefined) {
        if (typeof p.groupId !== "string" || !GROUP_ID_RE.test(p.groupId)) throw new Error(`component.propose: groupId ${JSON.stringify(p.groupId)} is not a group id (g1, g2, …)`);
        if (!Object.hasOwn(next.groups, p.groupId)) throw new Error(`component.propose: groupId "${p.groupId}" does not resolve — this document holds ${Object.keys(next.groups).join(", ") || "no groups"}`);
        if (p.mode !== 1) throw new Error(`component.propose: mode ${p.mode} with group "${p.groupId}" — a composed group is never a frozen original`);
      }
      if (next.proposals.some((x) => x.name === p.name)) throw new Error(`component.propose: duplicate name "${p.name}" — a proposal of that name already exists`);
      if (p.recordId !== undefined && next.proposals.some((x) => x.recordId === p.recordId)) throw new Error(`component.propose: record "${p.recordId}" already has a proposal — one proposal per import record`);
      if (p.groupId !== undefined && next.proposals.some((x) => x.groupId === p.groupId)) throw new Error(`component.propose: group "${p.groupId}" already has a proposal — one proposal per group`);
      const src = p.recordId !== undefined ? { recordId: p.recordId } : { groupId: p.groupId };
      next.proposals.push({ id: nextId("pr", new Set(next.proposals.map((x) => x.id))), name: p.name, ...src, mode: p.mode, status: "proposed" });
      break;
    }
    case "proposal.ratify": {
      // THE LEDGER HALF OF AN ADMISSION (#313, G6). The applier stays filesystem- and vocabulary-blind:
      // that `component` is not already a vocabulary component, and every byte ratify writes, are
      // portal/lib/ratify.mjs's. What is refused here is what the document alone can decide.
      if (typeof p.proposalId !== "string" || !/^pr[1-9][0-9]*$/.test(p.proposalId)) {
        throw new Error(`proposal.ratify: proposalId ${JSON.stringify(p.proposalId)} is not a proposal id (pr1, pr2, …)`);
      }
      const at = next.proposals.findIndex((x) => plainObject(x) && x.id === p.proposalId);
      if (at < 0) {
        throw new Error(`proposal.ratify: proposalId "${p.proposalId}" does not resolve — this document holds ${next.proposals.map((x) => x?.id).join(", ") || "no proposals"}`);
      }
      const entry = next.proposals[at];
      if (entry.mode === 2) {
        throw new Error(`proposal.ratify: "${entry.name}" is a frozen original (Mode 2, ${entry.id}) — it stays beside the flow as an exhibit and never joins the vocabulary (G7)`);
      }
      if (entry.status !== "proposed") throw new Error(`proposal.ratify: ${entry.id} is already ${entry.status}`);
      if (typeof p.component !== "string" || !PROPOSAL_NAME_RE.test(p.component)) {
        throw new Error(`proposal.ratify: component ${JSON.stringify(p.component)} is not a component name — lowercase letters, digits and hyphens, 2–40, starting with a letter`);
      }
      const taken = next.proposals.find((x) => plainObject(x) && x.id !== entry.id && x.component === p.component);
      if (taken) throw new Error(`proposal.ratify: component "${p.component}" is already ${taken.id}'s — one proposal per component`);
      next.proposals[at] = { ...entry, status: "ratified", component: p.component };
      break;
    }
    case "group.define": {
      // THE DEFINITION IS DERIVED FROM A SELECTION (#315, D5): the op names parts on a screen, never carries
      // them, so no op can record a part that was never on one. groupId is an EDIT target (annotate's rule).
      if (typeof p.name !== "string" || !PROPOSAL_NAME_RE.test(p.name)) {
        throw new Error(`group.define: name ${JSON.stringify(p.name)} is not a component name — lowercase letters, digits and hyphens, 2–40, starting with a letter (Promote proposes it as one)`);
      }
      if (!Array.isArray(p.partIds) || !p.partIds.length || p.partIds.some((x) => typeof x !== "string" || !x.trim())) {
        throw new Error(`group.define: "partIds" must be a non-empty array of part ids — this op carried ${JSON.stringify(p.partIds)}`);
      }
      const twice = p.partIds.find((x, i) => p.partIds.indexOf(x) !== i);
      if (twice !== undefined) throw new Error(`group.define: part "${twice}" is selected twice`);
      const slashed = p.partIds.find((x) => x.includes(PART_SEP));
      if (slashed !== undefined) throw new Error(`group.define: "${slashed}" is a part of a placed copy — a selection may not reach inside one, and groups do not nest`);
      const edit = p.groupId !== undefined;
      if (edit && !(typeof p.groupId === "string" && Object.hasOwn(next.groups, p.groupId))) {
        throw new Error(`group.define: groupId "${p.groupId}" does not resolve — this document holds ${Object.keys(next.groups).join(", ") || "no groups"}; an op names a group to EDIT, never the id of one it creates`);
      }
      // A GROUP A PROPOSAL NAMES IS FIXED (PR #494 review F1). Promote froze its drafts from these parts, and
      // Ratify reads the LIVE group for the provenance line and the hash, so a redefine would let an admitted
      // spec name a group its template no longer describes. An import record cannot change after propose;
      // neither can this. Define a new group to change it.
      const named = edit ? next.proposals.filter((x) => plainObject(x) && x.groupId === p.groupId) : [];
      if (named.length) {
        throw new Error(`group.define: "${p.groupId}" is named by ${named.map((x) => `${x.id} (${x.name}, ${x.status})`).join(", ")} — its drafts were frozen from these parts, so a proposed group is not redefined; define a new group instead`);
      }
      const clash = Object.values(next.groups).find((g) => g.name === p.name && g.id !== p.groupId);
      if (clash) throw new Error(`group.define: name "${p.name}" is already ${clash.id}'s — one group per name`);
      frame(p.frameId, "frameId");
      const t = frameTree(next, p.frameId);
      if (!t.tree) throw new Error(`group.define: frame "${p.frameId}" has nothing to select from (${t.flags.map((f) => f.kind).join(", ")})`);
      // Document order, and ancestry: each node with the chain of ids above it.
      const order = [];
      const walkSel = (n, above) => {
        if (!plainObject(n)) return;
        if (typeof n.id === "string") order.push({ node: n, above });
        const here = typeof n.id === "string" ? [...above, n.id] : above;
        for (const c of Array.isArray(n.children) ? n.children : []) walkSel(c, here);
      };
      walkSel(t.tree, []);
      const byId = new Map(order.map((o) => [o.node.id, o]));
      for (const id of p.partIds) {
        if (!byId.has(id)) throw new Error(`group.define: part "${id}" does not resolve in "${p.frameId}" — it holds ${order.map((o) => o.node.id).join(", ")}`);
        const anc = byId.get(id).above.find((a) => p.partIds.includes(a));
        if (anc) throw new Error(`group.define: "${id}" sits inside "${anc}", which is also selected — select one or the other`);
      }
      const picked = order.filter((o) => p.partIds.includes(o.node.id));
      for (const o of picked) {
        const inner = [];
        walkNodes(o.node, (n) => { if (typeof n.id === "string" && n.id.includes(PART_SEP)) inner.push(n.id); });
        if (inner.length) throw new Error(`group.define: "${o.node.id}" contains a placed copy (${inner[0]}) — groups do not nest`);
      }
      const parts = structuredClone(picked.map((o) => o.node));
      refuseFrozen("group.define", parts, next);
      const composedFrom = { frameId: p.frameId, partIds: picked.map((o) => o.node.id) };
      if (!edit) {
        const id = nextId("g", new Set(Object.keys(next.groups)));
        next.groups[id] = { id, name: p.name, parts, composedFrom };
        break;
      }
      // A REDEFINE THAT DROPS A PART A COPY OVERRIDES IS REFUSED, naming every blocker (canDeleteBasePart's shape).
      const keep = new Set();
      walkNodes(parts, (n) => { if (typeof n.id === "string") keep.add(n.id); });
      const blockers = groupInstances(next).filter((i) => i.groupId === p.groupId).flatMap((i) => {
        const ov = plainObject(i.overrides) ? i.overrides : {};
        const named = [...Object.keys(plainObject(ov.set) ? ov.set : {}), ...(Array.isArray(ov.hide) ? ov.hide : [])];
        return [...new Set(named)].filter((x) => !keep.has(x)).map((x) => `${i.frameId} ${i.instanceId} (${x})`);
      });
      if (blockers.length) {
        throw new Error(`group.define: redefining "${p.groupId}" drops parts copies still override — ${blockers.join(", ")} — drop those overrides first`);
      }
      next.groups[p.groupId] = { id: p.groupId, name: p.name, parts, composedFrom };
      break;
    }
    case "group.place": {
      const f = frame(p.frameId, "frameId");
      if (f.baseId != null) {
        throw new Error(`group.place: "${f.id}" is the ${f.stateKey} state of "${f.baseId}" — place the copy on the base; a state inherits its base's copies`);
      }
      const edit = p.instanceId !== undefined;
      if (p.overrides !== undefined) checkGroupOverride(p.overrides);
      if (edit) {
        for (const k of ["groupId", "parentId", "index"]) {
          if (p[k] !== undefined) throw new Error(`group.place: "${k}" with instanceId — an edit replaces a copy's overrides and nothing else`);
        }
        if (p.overrides === undefined) throw new Error(`group.place: "overrides" is required with instanceId — it is what an edit replaces`);
        const inst = instancesOf(f).find((n) => n.id === p.instanceId);
        if (!inst) {
          throw new Error(`group.place: instanceId "${p.instanceId}" does not resolve on "${f.id}" — it holds ${instancesOf(f).map((n) => n.id).join(", ") || "no copies"}; an op names a copy to EDIT, never the id of one it creates`);
        }
        inst.overrides = p.overrides;
        break;
      }
      if (p.groupId === undefined || p.parentId === undefined) throw new Error(`group.place: "groupId" and "parentId" are required to place a copy`);
      const g = typeof p.groupId === "string" && Object.hasOwn(next.groups, p.groupId) ? next.groups[p.groupId] : null;
      if (!g) throw new Error(`group.place: groupId "${p.groupId}" does not resolve — this document holds ${Object.keys(next.groups).join(", ") || "no groups"}`);
      refuseFrozen("group.place", g.parts, next);
      let parent = null;
      walkNodes(f.composition, (n) => { if (n.name !== "group" && n.id === p.parentId && typeof n.id === "string") parent ??= n; });
      if (!parent) throw new Error(`group.place: parentId "${p.parentId}" does not resolve in "${f.id}"'s composition`);
      if (!Array.isArray(parent.children)) throw new Error(`group.place: "${p.parentId}" (${parent.name}) has no children to place into`);
      const index = p.index ?? parent.children.length;
      if (!Number.isInteger(index) || index < 0 || index > parent.children.length) {
        throw new Error(`group.place: index ${JSON.stringify(p.index)} is not a whole number in 0–${parent.children.length}`);
      }
      const taken = new Set();
      for (const fr of next.frames) walkNodes(fr?.composition, (n) => { if (typeof n.id === "string") taken.add(n.id); });
      const id = nextId(`${g.id}-`, taken);
      parent.children.splice(index, 0, { name: "group", id, props: { groupId: g.id }, ...(p.overrides !== undefined && { overrides: p.overrides }) });
      break;
    }
    // Unreachable: checkOp refused every verb outside OPS. Kept because the day a fifteenth verb is
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
// The lane reads below (#314: laneKeys, laneDoc, flowEdges, stateDiagram) keep both rules.
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

// missingStates(doc, lane?) → [{ frameId, screenId, missing: [...] }] — for every BASE frame,
// which of the required minimum states, and of the states it declares (#316), has no sibling.
//
// THE POINT IS THE LIST, NOT A COUNT. "Three states missing" is a number; "error and empty are
// missing from the payment screen" is something an author can act on. Bases with nothing missing are
// omitted, so an empty answer means the floor is met rather than that nothing was checked.
//
// Resolves the lane first (G33, #314): the page, build-checks and the handoff generator call this one function.
export function missingStates(doc, lane = null) {
  const frames = laneDoc(doc, lane).doc.frames;
  const out = [];
  for (const base of frames) {
    if (base.baseId != null || base.id == null) continue; // a state is not a base
    const have = new Set(frames.filter((f) => f.baseId === base.id).map((f) => f.stateKey));
    have.add(base.stateKey ?? "ideal"); // the base IS its own ideal
    const declared = Array.isArray(base.states) ? base.states.filter((k) => typeof k === "string") : [];
    const missing = [...STATE_KEYS, ...declared].filter((k) => !have.has(k));
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

// ---- #314: lanes ----------------------------------------------------------------------------------
// Lane A is the document itself (key null); doc.variants holds only the other lanes, each its differences on A (G33).
export const BASE_LANE = null;

const variantOf = (doc, lane) => (Array.isArray(doc?.variants) ? doc.variants : []).find((v) => plainObject(v) && v.key === lane) ?? null;

// laneKeys(doc) → [null, "b", …] — lane A first, then every lane in document order. Total over junk.
export function laneKeys(doc) {
  const keys = (Array.isArray(doc?.variants) ? doc.variants : []).filter((v) => plainObject(v) && typeof v.key === "string").map((v) => v.key);
  return [BASE_LANE, ...keys];
}

// laneDoc(doc, lane) → { doc, flags } — which frames and arrows EXIST in a lane. A frame the lane omits is gone, a
// state of an omitted base is gone with it, and so is every arrow touching either. Parts are NOT resolved here —
// frameTree does that, so there is one merge rule. A lane that does not exist holds no frames, so nothing in it
// is missing: the answer stays true of what was checked. Total over junk; never mutates its argument.
export function laneDoc(doc, lane = null) {
  const frames = Array.isArray(doc?.frames) ? doc.frames.filter((f) => plainObject(f)) : [];
  const arrows = Array.isArray(doc?.arrows) ? doc.arrows.filter((a) => plainObject(a)) : [];
  const base = { ...(plainObject(doc) ? doc : {}), frames, arrows };
  if (lane == null) return { doc: base, flags: [] };
  const v = variantOf(doc, lane);
  if (!v) return { doc: { ...base, frames: [], arrows: [] }, flags: [{ kind: "unknown-lane", lane }] };
  const ov = plainObject(v.overrides) ? v.overrides : {};
  const out = new Set(frames.filter((f) => ov[f.id]?.omit === true).map((f) => f.id));
  for (const f of frames) if (f.baseId != null && out.has(f.baseId)) out.add(f.id);
  const kept = frames.filter((f) => !out.has(f.id));
  return {
    doc: { ...base, frames: kept, arrows: arrows.filter((a) => !out.has(a?.from?.frameId) && !out.has(a?.to?.frameId)) },
    flags: frames.filter((f) => out.has(f.id)).map((f) => ({ kind: "omitted", frameId: f.id, lane })),
  };
}

// groupInstances(doc) → [{ frameId, instanceId, groupId, overrides }] — every placed copy in every frame's raw
// composition, frame order then document order (#315). A read: total over junk.
export function groupInstances(doc) {
  const out = [];
  for (const f of Array.isArray(doc?.frames) ? doc.frames : []) {
    if (!plainObject(f)) continue;
    for (const n of instancesOf(f)) out.push({ frameId: f.id, instanceId: n.id, groupId: n.props?.groupId ?? null, overrides: n.overrides ?? null });
  }
  return out;
}

// expandGroups(tree, groups, flags) — D4, in place: each copy becomes its definition's parts with the copy's
// override resolved (keyed by DEFINITION ids), every id renamed <instanceId>/<partId>, spliced where the copy was.
function expandGroups(tree, groups, flags) {
  const defs = plainObject(groups) ? groups : {};
  const visit = (node) => {
    if (!plainObject(node) || !Array.isArray(node.children)) return;
    const out = [];
    for (const c of node.children) {
      if (!plainObject(c) || c.name !== "group") { visit(c); out.push(c); continue; }
      const def = defs[c.props?.groupId];
      if (!plainObject(def) || !Array.isArray(def.parts)) { flags.push({ kind: "unknown-group", partId: c.id ?? null }); continue; }
      const parts = structuredClone(def.parts);
      const map = {};
      walkNodes(parts, (n) => { if (typeof n.id === "string" && !Object.hasOwn(map, n.id)) map[n.id] = plainObject(n.props) ? n.props : {}; });
      const r = resolve({ parts: map }, plainObject(c.overrides) ? c.overrides : null);
      flags.push(...r.flags.map((fl) => ({ ...fl, instanceId: c.id })));
      const prune = (n) => {
        if (!Array.isArray(n.children)) return;
        n.children = n.children.filter((k) => !(plainObject(k) && typeof k.id === "string" && r.resolved.parts[k.id]?.hidden === true));
        n.children.forEach(prune);
      };
      const kept = parts.filter((n) => !(plainObject(n) && typeof n.id === "string" && r.resolved.parts[n.id]?.hidden === true));
      kept.forEach(prune);
      walkNodes(kept, (n) => {
        if (typeof n.id !== "string") return;
        const { hidden, ...props } = r.resolved.parts[n.id] ?? {};
        if (Object.keys(props).length || n.props !== undefined) n.props = props;
        n.id = `${c.id}${PART_SEP}${n.id}`;
      });
      out.push(...kept);
    }
    node.children = out;
  };
  visit(tree);
}

// frameTree(doc, frameId) → { tree, flags } — the renderable composition for one frame (#306).
//
// A base frame is its composition with its own sets applied; a state is the SAME, then the state's
// override, then the state's own later sets — the base-then-state layering group 35 gates on
// resolve(). ONE MERGE RULE, reused rather than re-written: the tree is flattened to {id: props},
// folded through resolve() once per layer, and written back by id. Nodes without an id cannot be
// addressed by any layer and pass through untouched.
//
// A HIDDEN NODE IS DROPPED, NEVER WRITTEN BACK WITH `hidden`: agentic-renderer.mjs's
// validateComposition enum-checks every prop key, and `hidden` is in no component's vocabulary, so
// a tree carrying it would be refused whole. A hidden ROOT is flagged and kept — dropping it would
// leave nothing to render and nothing to say why. `overrides.add` (G19's dialogs, later) is flagged
// and ignored. Total over junk: an unknown frame answers tree: null with a flag, never a throw.
//
// A PLACED COPY IS EXPANDED FIRST (#315, D4): before any layer, each group node becomes its definition's parts
// with the copy's override resolved, every id renamed <instanceId>/<partId>, so the layers, the renderer and
// flowEdges only ever see vocabulary names. An unknown group is flagged and dropped; a group ROOT is flagged.
export function frameTree(doc, frameId, lane = null) {
  const frames = Array.isArray(doc?.frames) ? doc.frames.filter((f) => f && typeof f === "object") : [];
  const f = frames.find((x) => x.id === frameId);
  if (!f) return { tree: null, flags: [{ kind: "unknown-frame", frameId }] };
  let laneOv = () => null;
  if (lane != null) {
    const v = variantOf(doc, lane);
    if (!v) return { tree: null, flags: [{ kind: "unknown-lane", lane }] };
    if (laneDoc(doc, lane).flags.some((fl) => fl.frameId === frameId)) return { tree: null, flags: [{ kind: "omitted", frameId, lane }] };
    laneOv = (id) => (plainObject(v.overrides?.[id]) ? v.overrides[id] : null);
  }
  const state = f.baseId != null ? f : null;
  const base = state ? frames.find((x) => x.id === state.baseId) : f;
  if (!base) return { tree: null, flags: [{ kind: "unknown-frame", frameId: state.baseId }] };
  if (!plainObject(base.composition)) return { tree: null, flags: [{ kind: "no-composition", frameId: base.id }] };

  const tree = structuredClone(base.composition);
  const flags = [];
  // #315 (D4): copies first, so every layer below sees real vocabulary names and namespaced ids.
  if (tree.name === "group") return { tree: null, flags: [{ kind: "group-root", frameId: base.id }] };
  expandGroups(tree, doc?.groups, flags);
  const parts = {};
  const walk = (node, fn, parent = null) => {
    if (!plainObject(node)) return;
    fn(node, parent);
    for (const c of Array.isArray(node.children) ? [...node.children] : []) walk(c, fn, node);
  };
  walk(tree, (n) => { if (typeof n.id === "string" && !Object.hasOwn(parts, n.id)) parts[n.id] = plainObject(n.props) ? n.props : {}; });

  let acc = { parts };
  // THE ORDER IS THE DECISION (#314): the lane's change to a base reaches every state of it (a state IS its base
  // except where it says), the state's own override still wins over it, and the lane's override of the state is last.
  const layers = state
    ? [{ set: base.sets }, laneOv(base.id), state.overrides, { set: state.sets }, laneOv(state.id)]
    : [{ set: base.sets }, laneOv(base.id)];
  for (const layer of layers) {
    if (!plainObject(layer)) continue;
    if (layer.add !== undefined) flags.push({ kind: "unsupported-add", frameId: f.id });
    const r = resolve(acc, layer);
    acc = r.resolved;
    flags.push(...r.flags);
  }

  walk(tree, (n, parent) => {
    if (typeof n.id !== "string" || !Object.hasOwn(acc.parts, n.id)) return;
    const { hidden, ...props } = acc.parts[n.id];
    if (hidden === true && parent) {
      parent.children = parent.children.filter((c) => c !== n);
      return;
    }
    if (hidden === true) flags.push({ kind: "hide-root", partId: n.id });
    if (Object.keys(props).length || n.props !== undefined) n.props = props;
  });
  return { tree, flags };
}

// placeDecision(anchor, taken, size?, gap?) → { x, y } — where a newly shown decision card sits by
// default (#306).
//
// IN THE ANCHOR'S ROW, RIGHT OF EVERYTHING ALREADY IN IT. A box is in the row when its vertical band
// [y, y + h) meets the anchor's (a box with no authored h counts as size.h tall); the card's x is the
// row's rightmost edge plus the gap, its y the anchor's. A second card for the same row therefore
// lands right of the first. Not "right of the anchor": on the committed spine that is x 422, on top
// of f2 at x 472.
//
// ONE RULE FOR BOTH SIDES. `taken` is AUTHORED boxes (canvas.json's, or this session's placements),
// never measured ones, so the page placing a card on load and Node regenerating a committed
// canvas.json compute the same answer — no position in a committed file is hand-chosen. Total: junk
// boxes are skipped; a junk anchor answers the origin.
export function placeDecision(anchor, taken, size = { w: 280, h: 160 }, gap = 32) {
  const fin = Number.isFinite;
  const box = (b) => (b && fin(b.x) && fin(b.y) && fin(b.w) ? { x: b.x, y: b.y, w: b.w, h: fin(b.h) ? b.h : size.h } : null);
  const a = box(anchor);
  if (!a) return { x: 0, y: 0 };
  const row = [a, ...(Array.isArray(taken) ? taken.map(box).filter(Boolean) : [])]
    .filter((b) => b.y < a.y + a.h && a.y < b.y + b.h);
  return { x: Math.max(...row.map((b) => b.x + b.w)) + gap, y: a.y };
}

// ---- #475: the Mode 2 exhibit (G7, "Beside the canvas only, never inside a frame") ---------------
//
// AN EXHIBIT IS DERIVED, NOT RECORDED. A Mode 2 `component.propose` is the whole fact: the frozen
// original exists, and it never joins the system. There is no exhibit verb — the epic's op-verb lock is
// #315's, and a second record of one fact is what canvas.json's "no fact the ops do not" forbids — so
// the node's id is the proposal's (pr1) and only its position is authored.
//
// EXHIBIT_SIZE IS FIXED. An exhibit is a .stx-slot: studio-canvas.mjs never gives one an authored
// height and studio-verbs.mjs refuses to resize one, so the page's CSS box and Node's box are this one
// number rather than two that happen to agree.
export const EXHIBIT_SIZE = Object.freeze({ w: 320, h: 280 });

// exhibitsOf(doc) → [{ id, name, recordId }] — every Mode 2 proposal, in proposal order. A read, so
// total over junk: a malformed entry is skipped.
export function exhibitsOf(doc) {
  const list = Array.isArray(doc?.proposals) ? doc.proposals : [];
  return list.filter((p) => plainObject(p) && p.mode === 2 && typeof p.id === "string")
    .map((p) => ({ id: p.id, name: p.name, recordId: p.recordId }));
}

// exhibitClash(exhibit, frames) → the id of the first frame whose box meets the exhibit's, else null.
//
// A FRAME WITH NO AUTHORED HEIGHT REACHES DOWN WITHOUT END. Its height is its content's until someone
// authors one (CANVAS_DESCRIPTION's divergence 2), and Node cannot measure content, so the only reading
// both sides can compute is the conservative one — which is why "beside" means beside. Resizing a
// frame authors its height and ends the reading for that frame. Strict overlap, so touching edges
// pass. Total: a junk exhibit answers null, junk frames are skipped.
export function exhibitClash(exhibit, frames) {
  const fin = Number.isFinite;
  if (!exhibit || !fin(exhibit.x) || !fin(exhibit.y)) return null;
  const x2 = exhibit.x + EXHIBIT_SIZE.w;
  const y2 = exhibit.y + EXHIBIT_SIZE.h;
  for (const f of Array.isArray(frames) ? frames : []) {
    if (!f || !fin(f.x) || !fin(f.y) || !fin(f.w)) continue;
    const fy2 = fin(f.h) ? f.y + f.h : Infinity;
    if (exhibit.x < f.x + f.w && f.x < x2 && exhibit.y < fy2 && f.y < y2) return f.id;
  }
  return null;
}

// exhibitClashes(doc, positions) → [{ exhibitId, frameId }], one per exhibit that meets a frame.
//
// THE ONE CALL BOTH SIDES MAKE, WITH THE SAME TWO ARGUMENTS: the document and the AUTHORED half of
// canvas.json ({id: {x, y, w?, h?}}). portal/lib/canvas-store.mjs's arrangement passes the positions it
// derives under; portal/public/canvas.mjs passes gatherPositions(), which writes a frame's h only when
// authored. So the page and the save agree by construction — placeDecision's rule, tightened from "two
// callers assemble boxes the same way" to "one function assembles them". A frame's width is the
// DOCUMENT's (frame.size), never the arrangement's. A node with no finite position is skipped: the
// derivation's own at() refuses that separately.
export function exhibitClashes(doc, positions) {
  const pos = plainObject(positions) ? positions : {};
  const frames = (Array.isArray(doc?.frames) ? doc.frames : []).flatMap((f) => {
    const p = plainObject(f) ? pos[f.id] : null;
    return p ? [{ id: f.id, x: p.x, y: p.y, w: f.width, h: p.h }] : [];
  });
  const out = [];
  for (const e of exhibitsOf(doc)) {
    const frameId = exhibitClash(pos[e.id], frames);
    if (frameId !== null) out.push({ exhibitId: e.id, frameId });
  }
  return out;
}

// ---- #314: the flow, per lane ---------------------------------------------------------------------

// frameLabel(doc, frameId) → "add-payee" for a base, "error of add-payee" for a state, the id when unknown.
export function frameLabel(doc, frameId) {
  const frames = Array.isArray(doc?.frames) ? doc.frames.filter((f) => plainObject(f)) : [];
  const f = frames.find((x) => x.id === frameId);
  if (!f) return String(frameId);
  if (f.baseId == null) return f.screenId ?? f.id;
  const base = frames.find((x) => x.id === f.baseId);
  return `${f.stateKey} of ${base?.screenId ?? f.baseId}`;
}

// flowEdges(doc, lane) → one entry per arrow that exists in the lane, with the part's text AS THE LANE RESOLVES IT
// (G5: "tapping Continue goes to …"). Total over junk.
export function flowEdges(doc, lane = null) {
  const { doc: ld } = laneDoc(doc, lane);
  return ld.arrows.map((a) => {
    const from = a.from?.frameId ?? null;
    const partId = a.from?.partId ?? null;
    let partText = null;
    if (partId != null) {
      const walk = (n) => {
        if (!plainObject(n) || partText !== null) return;
        if (n.id === partId && plainObject(n.props)) partText = n.props.label ?? n.props.content ?? null;
        for (const c of Array.isArray(n.children) ? n.children : []) walk(c);
      };
      walk(frameTree(doc, from, lane).tree);
    }
    return { id: a.id ?? null, from, to: a.to?.frameId ?? null, fromLabel: frameLabel(doc, from), toLabel: frameLabel(doc, a.to?.frameId),
      partId, partText: typeof partText === "string" ? partText : null, trigger: typeof a.trigger === "string" && a.trigger.trim() ? a.trigger : null };
  });
}

// edgePhrase(e) → "tapping Continue", "from continue" or "on load" — the one wording flow.md and the diagram share.
export const edgePhrase = (e) => (e.partText ? `tapping ${e.partText}` : e.partId ? `from ${e.partId}` : "on load");

// Mermaid-unsafe characters out of a label; the prose keeps them verbatim.
const mm = (s) => String(s).replace(/[\r\n]+/g, " ").replace(/[:;#{}<>"]/g, "").replace(/\s+/g, " ").trim();

// stateDiagram(doc, lane) → Mermaid stateDiagram-v2 text for the frames and arrows that exist in the lane.
export function stateDiagram(doc, lane = null) {
  const { doc: ld } = laneDoc(doc, lane);
  const lines = ["stateDiagram-v2"];
  for (const f of ld.frames) if (typeof f.id === "string") lines.push(`  ${f.id} : ${mm(frameLabel(doc, f.id))}`);
  for (const e of flowEdges(doc, lane)) {
    if (e.from == null || e.to == null) continue;
    lines.push(`  ${e.from} --> ${e.to} : ${mm(edgePhrase(e) + (e.trigger ? `, when ${e.trigger}` : ""))}`);
  }
  return lines.join("\n");
}
