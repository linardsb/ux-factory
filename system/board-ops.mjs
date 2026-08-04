// system/board-ops.mjs — the build-op vocabulary and a pure applier over the breadboard model
// (epic #202, ticket #203; architecture §Data model → Replay artifact + Recorder contract).
//
// An OP is one step of assembling a Shape Up breadboard: one place, one affordance, one
// connection. The board model is system/breadboard.mjs's, unchanged and not re-decided here:
//
//   board = { places:      [{ id, label, affordances: [{ id, label }] }],
//             connections: [[affordanceId, placeId]] }
//
// Three consumers share this file, which is why it lives in system/ rather than tooling/:
//   · tooling/board-op.mjs      — the fenced agent's ONLY build tool (build time, one call = one op)
//   · agent-layer/gen-replay.mjs — the projection's reproduce check (build time)
//   · the replay driver          — view time (#209)
//
// Two invariants a future editor must keep:
//
//   1. THE CAPS ARE IMPORTED, never re-literalled. breadboard.mjs:38–47 is explicit that a
//      mirrored cap is a cap that drifts.
//   2. AN OP NEVER CARRIES AN ID FOR THE THING IT CREATES — `place.add` takes a label, never a
//      place id. Ids are assigned HERE, by the same nextId rule breadboard.mjs:172 uses. So the
//      agent cannot invent an id, and gen-replay's reproduce check genuinely RE-DERIVES the ids
//      rather than copying them out of the trace.
//
// parseOpCommand() is deliberately shared by the recorder's FENCE and the generator's PROJECTION
// (both of them, one grammar). A command the projector could not parse is denied mid-run instead
// of discovered after the run is paid for — so every Bash step that reaches a committed trace is
// provably projectable.
//
// Node-import-safe and side-effect-free: no DOM, no self-boot. A CI gate, a CLI and a generator
// all import it before any page does.

import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "./breadboard.mjs";

// The op vocabulary, in one place. Frozen: a consumer that wants a new verb edits this list and
// the switch below together, not one of them.
export const OPS = Object.freeze([
  "place.add",
  "place.rename",
  "place.remove",
  "affordance.add",
  "affordance.rename",
  "affordance.remove",
  "connect",
  "disconnect",
]);

// The exact params each op takes — exact, not minimal: an unknown key throws. That is what stops
// an op smuggling in an id for something it creates (invariant 2 above).
const PARAMS = {
  "place.add": ["label"],
  "place.rename": ["placeId", "label"],
  "place.remove": ["placeId"],
  "affordance.add": ["placeId", "label"],
  "affordance.rename": ["affordanceId", "label"],
  "affordance.remove": ["affordanceId"],
  connect: ["affordanceId", "placeId"],
  disconnect: ["affordanceId"],
};

export const emptyBoard = () => ({ places: [], connections: [] });

const clone = (board) => ({
  places: board.places.map((p) => ({ id: p.id, label: p.label, affordances: p.affordances.map((f) => ({ id: f.id, label: f.label })) })),
  connections: board.connections.map(([from, to]) => [from, to]),
});

// breadboard.mjs:172's rule, verbatim in behaviour: the lowest free <prefix><n>.
function nextId(prefix, taken) {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

const placeIds = (board) => new Set(board.places.map((p) => p.id));
const affIds = (board) => new Set(board.places.flatMap((p) => p.affordances.map((f) => f.id)));
const ownerOf = (board, affordanceId) => board.places.find((p) => p.affordances.some((f) => f.id === affordanceId));

function checkLabel(label, op) {
  if (typeof label !== "string" || !label.trim()) throw new Error(`${op}: "label" must be a non-empty string`);
  if (label.length > LABEL_MAX) throw new Error(`${op}: "label" is ${label.length} characters, over the cap of ${LABEL_MAX}`);
  return label;
}

// Hand-validate the op envelope (project rule: no schema library — check at the boundary and
// throw, naming what is wrong). Returns the params object.
function checkOp(op) {
  if (!op || typeof op !== "object" || Array.isArray(op)) throw new Error("an op must be an object { op, params }");
  if (!OPS.includes(op.op)) throw new Error(`"${op.op}" is not an op — the vocabulary is ${OPS.join(" · ")}`);
  const params = op.params ?? {};
  if (typeof params !== "object" || Array.isArray(params)) throw new Error(`${op.op}: "params" must be an object`);
  const allowed = PARAMS[op.op];
  for (const k of Object.keys(params))
    if (!allowed.includes(k))
      throw new Error(`${op.op}: unknown param "${k}" — it takes ${allowed.join(", ")} (an op never carries an id for what it creates)`);
  for (const k of allowed)
    if (params[k] === undefined) throw new Error(`${op.op}: "${k}" is required`);
  return params;
}

// Apply one op. PURE: returns a NEW board and never mutates the argument — gen-replay applies the
// same ops twice in its reproduce check, and #209 will want a snapshot per step.
export function applyOp(board, op) {
  if (!board || !Array.isArray(board.places) || !Array.isArray(board.connections))
    throw new Error("applyOp: the board must be { places: [], connections: [] }");
  const p = checkOp(op);
  const next = clone(board);
  const place = (id) => {
    const found = next.places.find((x) => x.id === id);
    if (!found) throw new Error(`${op.op}: no place "${id}" on this board`);
    return found;
  };

  switch (op.op) {
    case "place.add": {
      checkLabel(p.label, op.op);
      if (next.places.length >= MAX_PLACES) throw new Error(`place.add: the board is at its cap of ${MAX_PLACES} places`);
      next.places.push({ id: nextId("p", placeIds(next)), label: p.label, affordances: [] });
      break;
    }
    case "place.rename": {
      place(p.placeId).label = checkLabel(p.label, op.op);
      break;
    }
    case "place.remove": {
      const target = place(p.placeId);
      const gone = new Set(target.affordances.map((f) => f.id));
      next.places = next.places.filter((x) => x.id !== target.id);
      // Same rule as breadboard.mjs:251 — a connection dies if its target went, or if the
      // affordance it ran from went with the place.
      next.connections = next.connections.filter(([from, to]) => to !== target.id && !gone.has(from));
      break;
    }
    case "affordance.add": {
      checkLabel(p.label, op.op);
      const target = place(p.placeId);
      if (target.affordances.length >= MAX_AFFORDANCES)
        throw new Error(`affordance.add: "${target.label}" is at its cap of ${MAX_AFFORDANCES} affordances`);
      target.affordances.push({ id: nextId(`${target.id}a`, affIds(next)), label: p.label });
      break;
    }
    case "affordance.rename": {
      const owner = ownerOf(next, p.affordanceId);
      if (!owner) throw new Error(`affordance.rename: no affordance "${p.affordanceId}" on this board`);
      owner.affordances.find((f) => f.id === p.affordanceId).label = checkLabel(p.label, op.op);
      break;
    }
    case "affordance.remove": {
      const owner = ownerOf(next, p.affordanceId);
      if (!owner) throw new Error(`affordance.remove: no affordance "${p.affordanceId}" on this board`);
      owner.affordances = owner.affordances.filter((f) => f.id !== p.affordanceId);
      next.connections = next.connections.filter(([from]) => from !== p.affordanceId);
      break;
    }
    case "connect": {
      const owner = ownerOf(next, p.affordanceId);
      if (!owner) throw new Error(`connect: no affordance "${p.affordanceId}" on this board`);
      const target = place(p.placeId);
      // breadboard.mjs:352's refusal, mirrored: a connection takes the user FROM one place TO
      // another, so an affordance leading to the place it already sits in is a modelling error.
      if (owner.id === target.id) throw new Error(`connect: "${p.affordanceId}" already sits in "${target.id}" — an affordance cannot lead to its own place`);
      // Re-point, never append a second: connections are the ONLY record of what leads where.
      next.connections = next.connections.filter(([from]) => from !== p.affordanceId);
      next.connections.push([p.affordanceId, target.id]);
      break;
    }
    case "disconnect": {
      if (!ownerOf(next, p.affordanceId)) throw new Error(`disconnect: no affordance "${p.affordanceId}" on this board`);
      const had = next.connections.length;
      next.connections = next.connections.filter(([from]) => from !== p.affordanceId);
      if (next.connections.length === had) throw new Error(`disconnect: "${p.affordanceId}" leads nowhere already`);
      break;
    }
    default:
      throw new Error(`"${op.op}" is not an op`); // unreachable — checkOp threw first
  }
  return next;
}

// Fold applyOp, rethrowing with the op's index so a failure in a 20-op projection names which one.
export function applyOps(ops, board = emptyBoard()) {
  if (!Array.isArray(ops)) throw new Error("applyOps: ops must be an array");
  let acc = board;
  ops.forEach((op, i) => {
    try { acc = applyOp(acc, op); }
    catch (e) { throw new Error(`op ${i} (${op?.op ?? "?"}): ${e.message}`); }
  });
  return acc;
}

// Well-formedness, deeper than breadboard.mjs's shallow isBoard: the check the CLI's --validate
// and the generator both run before anything is kept.
export function assertBoard(board) {
  if (!board || !Array.isArray(board.places) || !Array.isArray(board.connections))
    throw new Error("a board must be { places: [], connections: [] }");
  if (!board.places.length) throw new Error("a board needs at least one place");
  if (board.places.length > MAX_PLACES) throw new Error(`${board.places.length} places, over the cap of ${MAX_PLACES}`);
  const ids = new Set();
  const affOwner = new Map();
  for (const p of board.places) {
    if (typeof p?.id !== "string" || !p.id) throw new Error("every place needs a non-empty string id");
    if (ids.has(p.id)) throw new Error(`duplicate id "${p.id}"`);
    ids.add(p.id);
    checkLabel(p.label, `place "${p.id}"`);
    if (!Array.isArray(p.affordances)) throw new Error(`place "${p.id}": "affordances" must be an array`);
    if (p.affordances.length > MAX_AFFORDANCES)
      throw new Error(`place "${p.id}" has ${p.affordances.length} affordances, over the cap of ${MAX_AFFORDANCES}`);
    for (const f of p.affordances) {
      if (typeof f?.id !== "string" || !f.id) throw new Error(`place "${p.id}": every affordance needs a non-empty string id`);
      if (ids.has(f.id)) throw new Error(`duplicate id "${f.id}"`);
      ids.add(f.id);
      affOwner.set(f.id, p.id);
      checkLabel(f.label, `affordance "${f.id}"`);
    }
  }
  const from = new Set();
  for (const c of board.connections) {
    if (!Array.isArray(c) || c.length !== 2) throw new Error("every connection must be [affordanceId, placeId]");
    const [f, t] = c;
    if (!affOwner.has(f)) throw new Error(`connection [${f}, ${t}]: no such affordance`);
    if (!board.places.some((p) => p.id === t)) throw new Error(`connection [${f}, ${t}]: no such place`);
    if (affOwner.get(f) === t) throw new Error(`connection [${f}, ${t}]: an affordance cannot lead to its own place`);
    if (from.has(f)) throw new Error(`affordance "${f}" carries two connections — an affordance leads to one place`);
    from.add(f);
  }
  return { places: board.places.length, affordances: affOwner.size, connections: board.connections.length };
}

// --- the op CLI's command grammar ----------------------------------------------------------------
// ONE grammar, two callers: portal/record-build.mjs's fence denies a command this refuses, and
// agent-layer/gen-replay.mjs projects from what it returns. Sharing it is what makes the fence's
// allow-list and the projection's parser the same thing — a command the projector could not read
// is denied while the run is still going, and the agent corrects itself inside the implement phase.
//
// The grammar is deliberately narrow — exactly what record-build.mjs's task prompt tells the agent
// to type: `node <…>tooling/board-op.mjs <boardPath> '<op json>'` (or `--validate`). Bare tokens
// carry no shell metacharacters; a quoted token is single-quoted with nothing appended. Anything
// else (double quotes, $'…', a heredoc, `&&`, a pipe) throws.
const SCRIPT = "tooling/board-op.mjs";
const META = /['"`$\\;|&<>()*?~\n]/;

function tokenize(command) {
  const s = String(command ?? "").trim();
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === " " || s[i] === "\t") { i += 1; continue; }
    if (s[i] === "'") {
      const end = s.indexOf("'", i + 1);
      if (end === -1) throw new Error("unbalanced single quote");
      tokens.push(s.slice(i + 1, end));
      i = end + 1;
      if (i < s.length && s[i] !== " " && s[i] !== "\t") throw new Error("a quoted argument must stand alone (nothing may follow its closing quote)");
      continue;
    }
    const tok = s.slice(i).match(/^[^ \t]+/)[0];
    if (META.test(tok)) throw new Error(`unsupported shell syntax in "${tok}" — one plain command, no quoting tricks, no chaining`);
    tokens.push(tok);
    i += tok.length;
  }
  return tokens;
}

// → { kind: "op", boardPath, op } | { kind: "validate", boardPath }. Throws otherwise.
// The caller decides whether `boardPath` is the RIGHT board (the fence resolves it against the
// run's cwd; the generator matches it against the slug's committed board) — this only parses.
export function parseOpCommand(command) {
  const t = tokenize(command);
  if (t.length !== 4) throw new Error(`expected exactly \`node ${SCRIPT} <board.json> '<op json>'\` (got ${t.length} argument(s))`);
  if (t[0] !== "node") throw new Error(`the command must start with \`node\` (got "${t[0]}")`);
  if (t[1] !== SCRIPT && !t[1].endsWith(`/${SCRIPT}`)) throw new Error(`the only build tool is ${SCRIPT} (got "${t[1]}")`);
  const boardPath = t[2];
  if (t[3] === "--validate") return { kind: "validate", boardPath };
  let op;
  try { op = JSON.parse(t[3]); }
  catch (e) { throw new Error(`the op argument is not JSON — ${e.message}`); }
  checkOp(op); // throws naming the op / the offending param
  return { kind: "op", boardPath, op };
}
