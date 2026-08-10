// system/replay-driver.mjs — hand-written canon (this repo; not generated). The studio's REPLAY
// DRIVER (epic #202 — docs/epics/prototype-studio.architecture.md §Recommended approach; ticket
// #209; .claude/plans/studio-replay-driver-takeover-209.md).
//
// /factory used to show a board that was simply THERE on arrival, drafted from default answers in
// one synchronous loop. This file makes the canvas perform a REAL RECORDED AGENT RUN in front of the
// reader: it plays the committed projection replay/build-fieldwork-dispatch.json op by op over
// system/action-bus.mjs's reserved-but-unused agent.* half, at the run's own pacing shape,
// interleaved with the run's own narration and its own fence refusals read from the committed
// curated trace — and hands the wheel over the moment the visitor touches the canvas.
//
// This is the first thing in the repo that exercises agent.* for real. Everything it needs already
// exists and is already gated: the ops (system/board-ops.mjs, #203), the artifact and its reproduce
// check (#203), the canvas (#204), the one ui.move consumer (#205), the orchestrator (#206), the
// compile beat (#207). The load-bearing calls, made here so #210/#212/#213 inherit them:
//
//   1. A SECOND AUTHOR, NEVER A SECOND MOVER. system/studio-verbs.mjs's single ui.move consumer is
//      the only thing on this canvas that MOVES a wrapper. This file never emits ui.move, never
//      calls applySlot and never writes data-col / data-row on an existing wrapper. It changes the
//      BOARD and reflects that change onto the stage; where a block sits stays #205's sentence.
//   2. ONLY place.add CALLS place(). studio-canvas.mjs:329 appends unconditionally — even on the
//      idempotent re-place path — and :332 announces on every call. So re-placing a wrapper to
//      re-label it would re-order the stage by append order AND turn four announcements into eleven
//      during autoplay. Every other reflection renames the wrapper IN PLACE, which is exactly the
//      call studio-compile.mjs:395-398 made and wrote down, for the same two reasons.
//   3. THE PACING IS THE RUN'S OWN, PROPORTIONALLY — and the compression is STATED, not hidden. The
//      real run is 131 s; autoplaying that literally makes a visitor wait two minutes and makes the
//      pixel gate wait two minutes per shot. paceBeats preserves the GAP RATIOS exactly and scales
//      the whole playback into PLAYBACK_MS, and the chrome prints the real duration and the computed
//      factor. "The gaps between steps are the run's own, proportionally" is true; "this is how long
//      it took" would not be, and is never said. PLAYBACK_MS = null plays the real gaps — see the
//      constant.
//   4. NOTHING IS NAMED FOR A VIEW TRANSITION and morph() is not called, the same call
//      studio-compile.mjs's call 2 made: naming an element makes it a stacking context AND a
//      containing block for absolutely positioned descendants, #171 shipped a real at-rest
//      regression through exactly that, and the pixel gate RE-BASELINES that class of bug rather
//      than catching it. tooling/vt-verify.mjs asserts zero ::view-transition-* pseudos DURING
//      playback, not only at rest.
//   5. DETERMINISM IS A REQUIREMENT. The settled canvas is a pixel baseline and two loads must
//      produce a byte-identical stage. No Date.now(), no counter, no random value reaches any
//      string or attribute this file writes; startedAt and durationMs are COPIED from the committed
//      meta and only ever formatted.
//
// WHICH REFLECTION BRANCHES THE COMMITTED ARTIFACT REACHES. Its 18 ops are 4 place.add, 7
// affordance.add and 7 connect — ADD-ONLY. The place-removed branch and the rename half of
// place-changed are written and correct and are NOT exercised by this artifact. They are not dead
// code and they are not live coverage: build-checks group 16 pins the artifact's op histogram, so
// the day a second run carries a rename or a remove the gate forces someone to look at that branch
// instead of shipping it untested (studio-compile.mjs:38-49's discipline, and group 1's vacuous
// clause).
//
// REFUSALS REACH THE LIVE REGION, NEVER A THROW. action-bus.mjs:70-77 catches a handler throw into
// console.error, which hides the refusal from the reader AND trips tooling/studio-journey.mjs's
// no-page-errors contract (studio-verbs.mjs:363-365, inherited).
//
// ZERO INLINE STYLES, ZERO MARKUP FROM A STRING — build-checks group 7 includes this file with no
// exception argued. Every node is built element by element; layout is classes resolved in
// system/studio.css.
//
// Node-import safe: no DOM outside a function body and NO self-boot — system/studio.mjs imports and
// mounts this explicitly, like the compile beat, and tooling/build-checks.mjs group 16 drives the
// pure layer directly.

import { applyOp, emptyBoard } from "./board-ops.mjs";
import { MAX_COLS } from "./studio-canvas.mjs";
import { parseTrace } from "./trace-player.mjs";
import { trackFactoryTookOver } from "./analytics.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 16 drives it in CI with no browser — the same
// split studio-canvas.mjs:34-73, studio-verbs.mjs:60-235, studio.mjs:47-103 and
// studio-compile.mjs:61-137 carry.

// ONE committed slug, named once. A brief picker or a second artifact is #210's, not this file's.
export const REPLAY_SLUG = "build-fieldwork-dispatch";
export const ARTIFACT_URL = `/replay/${REPLAY_SLUG}.json`;
export const TRACE_URL = `/traces/${REPLAY_SLUG}.jsonl`;

// The total wall-clock budget for one autoplay, and THE ONE REVERSIBILITY SEAM for the pacing call
// (the plan's open question 1). paceBeats derives its scale from this and describeRun derives the
// on-screen compression sentence from that scale; no other number anywhere is written by hand.
//
// PLAYBACK_MS = null means PLAY THE REAL GAPS: paceBeats then answers scale 1 and describeRun emits
// the wall-clock sentence instead of the compressed one. Both branches ship now rather than one of
// them being a later re-plan, so the product call can be made by watching it run.
//
// THE GATES' TIMEOUTS MOVE WITH THIS CONSTANT. At 14000 the first .stx-slot lands at ~4.8 s and the
// run settles at ~14 s (computed from the committed atMs span, 1363 → 131008). Raising it past ~16 s
// means raising tooling/studio-journey.mjs's and tooling/vt-verify.mjs's /factory waits and the
// visual-regression spec's per-test timeout in the same change; choosing null means raising all
// three past 131 s and adding ~9 min to the four-shot pixel gate.
export const PLAYBACK_MS = 14000;

// The four PIV acts, as the driver says them. Fixed strings — see call 5.
const PHASES = { plan: "Plan", gate: "Gate", implement: "Implement", validate: "Validate" };

// The two provenance sentences, module-level so the take-over path and the chrome cannot drift.
const PROVENANCE_RUN = "Everything on this canvas is the run's work.";
const PROVENANCE_VISITOR = "The run's work, with your edits on top.";
// The third provenance, and #210's (`declined`). A visitor who arrived on a shared link brought
// their OWN board, and this driver's whole rule is that it never authors over one — so it mounts,
// reads the same two committed files, shows what the run was, and does not play. The sentence has to
// say that plainly, because a transport sitting dead beside a canvas full of blocks otherwise reads
// as a replay that broke.
const PROVENANCE_DECLINED = "Everything on this canvas came in on the link you followed — it is the sender's board, not this run's.";
// #214's relinquish: after a method-card redraft the stage holds a board this run never built, so
// neither the run sentence nor the edits-on-top one is true of it.
const PROVENANCE_REDRAFTED = "The run's board was set aside — what is on this canvas is drafted from your answers.";
const DECLINED_NOTE = "The recorded run below did not play here, and that is deliberate: you arrived "
  + "with a board already on the link, and the run would have had to build over it. The run is still "
  + "readable as it is — its trace and its brief are linked above — and opening /factory without a "
  + "link plays it from the start.";

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// buildBeats(artifact, traceText) → { beats, meta, label, skipped, error }.
//
// ONE ORDERED BEAT LIST out of the two committed files, merged by `seq`. The artifact carries the
// ops and their real atMs; the curated trace carries the run's own words and its own refusals. They
// are joined rather than one being regenerated from the other, which is the same argument
// replay/README.md makes for why the trace is the truth and the artifact is a convenience — the
// chrome shows the run's sentences, not a generator's copy of them.
//
// Walking the TRACE's steps (not the artifact's ops) is what puts narration in its real position
// between the ops it explains. For each step, in seq order:
//   · the step's seq is some op's fromStep  → an "op" beat, carrying that op's op/params/atMs
//   · kind "text"                          → a "note" beat, the agent's words verbatim
//   · kind "tool" && denied                → a "refusal" beat, the fence's own message verbatim
//   · anything else                        → SKIPPED and COUNTED (the brief Reads and the --validate
//                                             run: 3 of this run's 31 steps), so the surface can
//                                             state the drop rather than silently showing a shorter
//                                             run than happened.
//
// A non-op beat's atMs is COMPUTED as Date.parse(step.ts) - Date.parse(meta.startedAt) — which is
// exactly how agent-layer/gen-replay.mjs computes an op's atMs — never invented from an index.
//
// TRACELESS MODE: traceText == null (the trace fetch failed, the artifact did not) builds op beats
// alone from the artifact, with no error. That is the honest degradation, and the surface states it.
// A trace that is PRESENT and unreadable is an error — a file that is there and wrong is not the
// same fact as a file that is missing.
//
// TOTAL BY CONTRACT: junk in either position returns { beats: [], error: "<what was wrong>" } and
// NEVER throws. parseTrace throws by design (trace-player.mjs:29) and studio.mjs:78-88 /
// studio-compile.mjs:88 both make this same call for the same reason: a bad fetch must not crash the
// page before the canvas exists.
export function buildBeats(artifact, traceText) {
  if (!isObj(artifact)) return { beats: [], meta: null, label: "", skipped: 0, error: "the replay artifact is not an object" };
  if (!Array.isArray(artifact.ops)) return { beats: [], meta: null, label: "", skipped: 0, error: "the replay artifact carries no ops array" };

  const label = typeof artifact.label === "string" ? artifact.label : "";

  // Keyed by fromStep. An op with no fromStep, or two ops claiming one step, means the artifact and
  // the trace disagree about the run — which is drift, and drift is stated rather than played over.
  const byStep = new Map();
  for (const op of artifact.ops) {
    if (!isObj(op) || typeof op.op !== "string") return { beats: [], meta: null, label, skipped: 0, error: "an op in the artifact is not { op, params, atMs, fromStep }" };
    if (typeof op.fromStep !== "number") return { beats: [], meta: null, label, skipped: 0, error: `op "${op.op}" carries no numeric fromStep` };
    if (byStep.has(op.fromStep)) return { beats: [], meta: null, label, skipped: 0, error: `two ops claim trace step ${op.fromStep}` };
    byStep.set(op.fromStep, op);
  }

  const opBeat = (op, seq) => ({
    seq,
    kind: "op",
    phase: typeof op.phase === "string" ? op.phase : "implement",
    op: op.op,
    params: isObj(op.params) ? { ...op.params } : {},
    atMs: Number(op.atMs) || 0,
  });

  if (traceText == null) {
    // Op-only. The artifact's own atMs are already the run's real offsets, so the pacing shape
    // survives the trace being unreadable — only the words are lost.
    const beats = artifact.ops.map((op) => opBeat(op, op.fromStep));
    return { beats, meta: null, label, skipped: 0, error: null, traceless: true };
  }

  let parsed;
  try {
    parsed = parseTrace(String(traceText));
  } catch (e) {
    return { beats: [], meta: null, label, skipped: 0, error: `the curated trace could not be read — ${e.message}` };
  }

  const { meta, steps } = parsed;
  if (!isObj(meta) || typeof meta.startedAt !== "string") {
    return { beats: [], meta: null, label, skipped: 0, error: "the trace's meta line carries no startedAt" };
  }
  const t0 = Date.parse(meta.startedAt);
  if (!Number.isFinite(t0)) return { beats: [], meta: null, label, skipped: 0, error: `the trace's startedAt "${meta.startedAt}" is not a date` };

  const beats = [];
  let skipped = 0;
  let lastSeq = -Infinity;
  const seen = new Set();

  for (const step of steps) {
    // Monotonic seq is what makes the join well defined; a trace whose steps go backwards would let
    // an op land before the narration that introduced it.
    if (step.seq <= lastSeq) return { beats: [], meta: null, label, skipped: 0, error: `trace step ${step.seq} follows ${lastSeq} — the steps are not in seq order` };
    lastSeq = step.seq;

    const op = byStep.get(step.seq);
    if (op) {
      seen.add(step.seq);
      beats.push(opBeat(op, step.seq));
      continue;
    }
    const at = Date.parse(step.ts) - t0;
    const atMs = Number.isFinite(at) ? at : 0;
    if (step.kind === "text" && typeof step.text === "string" && step.text.trim()) {
      beats.push({ seq: step.seq, kind: "note", phase: step.phase, text: step.text, atMs });
      continue;
    }
    if (step.kind === "tool" && step.denied) {
      beats.push({
        seq: step.seq,
        kind: "refusal",
        phase: step.phase,
        tool: typeof step.tool === "string" ? step.tool : "the tool",
        text: typeof step.error === "string" ? step.error : "refused by the run's fence",
        atMs,
      });
      continue;
    }
    skipped += 1;
  }

  // An op whose fromStep names no step in the trace is the same drift as two ops claiming one, and
  // is stated for the same reason: the artifact is a PROJECTION of this trace, so a step it points
  // at that is not there means one of the two files has moved.
  for (const key of byStep.keys()) {
    if (!seen.has(key)) return { beats: [], meta: null, label, skipped: 0, error: `an op points at trace step ${key}, which the trace does not carry` };
  }

  return { beats, meta, label, skipped, error: null, traceless: false };
}

// paceBeats(beats, budgetMs) → { beats, scale, realMs }, each beat gaining `delayMs`: the gap from
// its predecessor, PROPORTIONALLY.
//
// `scale` is the GAP MULTIPLIER (budgetMs / realMs — 0.108 for the committed run), never the
// compression factor the chrome prints. describeRun turns it into the factor a reader understands
// (realMs / budgetMs, 9.3×); keeping one number under two meanings is how the chrome ends up
// claiming a run played at 0.1×.
//
// budgetMs == null (or a run with no measurable span) answers scale 1 — the real gaps, played as
// they happened. Total by contract: junk answers an empty schedule rather than throwing.
export function paceBeats(beats, budgetMs = PLAYBACK_MS) {
  const list = Array.isArray(beats) ? beats.filter(isObj) : [];
  if (!list.length) return { beats: [], scale: 1, realMs: 0 };
  const first = Number(list[0].atMs) || 0;
  const realMs = Math.max(0, (Number(list[list.length - 1].atMs) || 0) - first);
  const budget = Number(budgetMs);
  const scale = realMs > 0 && Number.isFinite(budget) && budget > 0 ? budget / realMs : 1;
  let prev = first;
  const paced = list.map((beat) => {
    const at = Number(beat.atMs) || 0;
    const delayMs = Math.max(0, at - prev) * scale;
    prev = at;
    return { ...beat, delayMs };
  });
  return { beats: paced, scale, realMs };
}

// applyBeat(board, beat) → { board, changes }.
//
// The op goes through board-ops.mjs's pure applyOp — the SAME applier agent-layer/gen-replay.mjs's
// reproduce check runs, which is the whole reason the driver's finished board can be trusted to be
// the run's. What CHANGED is then derived by DIFFING the before and after boards rather than by
// re-implementing each op's effect here, which would be a second opinion about board-ops.mjs's
// semantics — and it is what makes the reflection general over all eight verbs instead of over the
// three this artifact happens to use.
//
// `changes` is a LIST because one op can change several things: place.remove drops the place and
// every connection that ran to or from it.
//
// A refused op does not throw: it answers the board unchanged plus a "refused" change carrying the
// applier's own message, so the surface can say it out loud (call: refusals reach the live region).
export function applyBeat(board, beat) {
  const before = isObj(board) && Array.isArray(board.places) ? board : emptyBoard();
  if (!isObj(beat) || beat.kind !== "op") return { board: before, changes: [] };

  let after;
  try {
    after = applyOp(before, { op: beat.op, params: beat.params });
  } catch (e) {
    return { board: before, changes: [{ kind: "refused", text: e.message }] };
  }

  const changes = [];
  const wasById = new Map(before.places.map((p) => [p.id, p]));
  const nowById = new Map(after.places.map((p) => [p.id, p]));
  const sig = (p) => `${p.label}\u0000${p.affordances.map((f) => `${f.id}:${f.label}`).join("\u0001")}`;

  for (const p of after.places) {
    const was = wasById.get(p.id);
    if (!was) { changes.push({ kind: "place-added", placeId: p.id, label: p.label }); continue; }
    // One "changed" for a rename AND for any affordance edit: both mean the same thing to the
    // canvas — this place's block prints something different now and must be re-rendered in place.
    if (sig(was) !== sig(p)) changes.push({ kind: "place-changed", placeId: p.id, label: p.label });
  }
  for (const p of before.places) {
    if (!nowById.has(p.id)) changes.push({ kind: "place-removed", placeId: p.id, label: p.label });
  }
  if (before.connections.length !== after.connections.length
    || before.connections.some((c, i) => c[0] !== after.connections[i][0] || c[1] !== after.connections[i][1])) {
    changes.push({ kind: "connections-changed" });
  }
  return { board: after, changes };
}

// describeRun(artifact, meta, pacing) → the chrome's model, as plain data.
//
// EVERY VALUE IS COPIED from the two committed files; the only computed numbers are the counts (which
// are counted, not claimed) and `compression`, which exists precisely so the pacing sentence states a
// number that was derived rather than typed.
export function describeRun(artifact, meta, pacing, beats) {
  const source = isObj(artifact) && isObj(artifact.source) ? artifact.source : {};
  const list = Array.isArray(beats) ? beats : [];
  const count = (kind) => list.filter((b) => isObj(b) && b.kind === kind).length;
  const scale = pacing && Number.isFinite(pacing.scale) ? pacing.scale : 1;
  const realMs = pacing && Number.isFinite(pacing.realMs) ? pacing.realMs : 0;
  return {
    label: isObj(artifact) && typeof artifact.label === "string" ? artifact.label : "",
    traceLabel: isObj(meta) && typeof meta.label === "string" ? meta.label : "",
    model: typeof source.model === "string" ? source.model : "",
    sessionId: typeof source.sessionId === "string" ? source.sessionId : "",
    startedAt: typeof source.startedAt === "string" ? source.startedAt : "",
    durationMs: Number(source.durationMs) || 0,
    tracePath: typeof source.curatedTrace === "string" ? source.curatedTrace : TRACE_URL,
    briefPath: typeof source.brief === "string" ? source.brief : "",
    boardPath: typeof source.board === "string" ? source.board : "",
    opCount: count("op"),
    noteCount: count("note"),
    refusalCount: count("refusal"),
    scale,
    realMs,
    // The factor a reader understands, and the inverse of the gap multiplier. 1 means the real gaps
    // are being played, which is what PLAYBACK_MS = null asks for.
    compression: scale > 0 ? 1 / scale : 1,
  };
}

// A whole number of seconds, or minutes and seconds. trace-player.mjs:57-60's shape, copied rather
// than imported for the reason every el() in these modules is copied.
export function formatDuration(ms) {
  const total = Math.round((Number(ms) || 0) / 1000);
  const m = Math.floor(total / 60);
  return m ? `${m} min ${total % 60} s` : `${total} s`;
}

// The sentence a beat announces. Built from the op vocabulary and the beat's own params, so a verb
// added to board-ops.mjs gets a legible sentence here rather than a blank one.
export function describeBeat(beat) {
  if (!isObj(beat)) return "";
  if (beat.kind === "note") return beat.text;
  if (beat.kind === "refusal") return `Refused — ${beat.tool}: ${beat.text}`;
  const p = isObj(beat.params) ? beat.params : {};
  switch (beat.op) {
    case "place.add": return `Added the place “${p.label}”.`;
    case "place.rename": return `Renamed ${p.placeId} to “${p.label}”.`;
    case "place.remove": return `Removed the place ${p.placeId}.`;
    case "affordance.add": return `Added “${p.label}” to ${p.placeId}.`;
    case "affordance.rename": return `Renamed ${p.affordanceId} to “${p.label}”.`;
    case "affordance.remove": return `Removed the affordance ${p.affordanceId}.`;
    case "connect": return `Connected ${p.affordanceId} to ${p.placeId}.`;
    case "disconnect": return `Disconnected ${p.affordanceId}.`;
    default: return String(beat.op ?? "");
  }
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// studio-compile.mjs:145, device-frame.mjs:33). Group 7 bans every markup-from-string sink across
// these modules, which is why a hostile label in a committed artifact can never become markup.
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

// studio-compile.mjs:159's copy, and the CSS half is declared in system/studio.css beside the
// classes it applies to: the pixel gate captures under NO-PREFERENCE, so a JS-only gate is what
// churns a baseline the day someone adds a transition to one of these classes.
const reduceMotion = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

let live = null; // the mounted driver — the exported seam below drives THIS one, never a new one

// The driver's seam (studio-canvas.mjs:95 / studio-verbs.mjs:236 / studio-compile.mjs:188's idiom,
// and the reason it is an export rather than a window.__ global: page globals are not this repo's
// test surface). tooling/studio-journey.mjs reaches the replay through this.
export const getReplay = () => live;

// mountReplay(canvas, { shell, renderPlace, bus, onSettle, onTakeOver })
//
// `renderPlace` is system/studio.mjs's placeBlock, PASSED IN rather than imported: studio.mjs already
// imports this file, so importing back would be a cycle, and "what a place looks like before it
// compiles is that file's sentence" (studio.mjs:220-225) stays true either way.
// `declined` is #210's option and the smallest one this file could grow. It was RECORDED as a
// requirement by studio.mjs before any code path reached it ("must place what the visitor brought and
// let the driver mount in a declined state rather than assembling over it"), and #210's ?b= restore
// is what makes it reachable. It is one early return in start(), and it adopts `tookOver` rather
// than `ready` — a declined mount is closer to "already handed over" than to "about to play", and
// tookOver is what makes the whole transport dead (see syncControls). (PR #240 review, finding 6.)
export function mountReplay(canvas, { shell, renderPlace, bus, onSettle, onTakeOver, declined } = {}) {
  const host = shell || null;
  let state = "loading";
  try {
    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (studio-verbs.mjs:243-248, studio-compile.mjs:206-211).
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.place !== "function"
      || typeof canvas.say !== "function") {
      throw new Error("replay-driver: a mounted canvas handle { stage, scroll, place, say } is required");
    }
    if (!bus || typeof bus.emit !== "function" || typeof bus.on !== "function") {
      throw new Error("replay-driver: an action bus { emit, on } is required");
    }
    if (typeof renderPlace !== "function") {
      throw new Error("replay-driver: renderPlace(entry) is required — the orchestrator owns what a place looks like");
    }
    if (!host) throw new Error("replay-driver: the studio shell is required — it carries the [data-replay] handle");

    const { stage } = canvas;
    // THE CHROME'S HOME IS THE MARKUP NODE, not an insertBefore into the viewport. The verb row and
    // the compile row both insert before the scroller and their order is a function of mount
    // sequence; this chrome sits above the canvas in factory.html's own markup, so the at-rest DOM
    // order is declared in HTML and does not compete with them.
    const mount = host.querySelector("[data-replay-chrome]");
    if (!mount) throw new Error("replay-driver: no [data-replay-chrome] node in the studio shell");

    const ac = new AbortController();
    const { signal } = ac;
    let destroyed = false;

    // --- the chrome ---------------------------------------------------------------------------
    // Built empty and filled once the two committed files are read: every sentence in it quotes a
    // number or a string out of those files, so there is nothing honest to print before they land.
    const honesty = el("p", { class: "stu-replay-label" });
    const facts = el("dl", { class: "stu-replay-facts" });
    const pacingLine = el("p", { class: "stu-replay-pacing" });
    const provenance = el("p", { class: "stu-replay-provenance", "data-provenance": "run" });
    const readout = el("p", { class: "stu-replay-step" });

    const pauseBtn = el("button", { type: "button", class: "btn btn-secondary stu-replay-btn", text: "Pause" });
    const stepBtn = el("button", { type: "button", class: "btn btn-secondary stu-replay-btn", text: "Step" });
    const endBtn = el("button", { type: "button", class: "btn btn-secondary stu-replay-btn", text: "Skip to end" });
    const seek = el("input", { type: "range", class: "stu-replay-seek", min: "0", max: "0", value: "0",
      "aria-label": "Seek through the run's steps" });
    const controls = el("div", { class: "stu-replay-controls" }, pauseBtn, stepBtn, endBtn, seek);

    mount.append(honesty, facts, pacingLine, controls, readout, provenance);

    // --- state --------------------------------------------------------------------------------
    let beats = [];
    let run = null;         // describeRun's model
    let board = emptyBoard();
    let index = 0;          // beats applied so far
    let playing = false;
    let settled = false;
    let tookOver = false;
    let timer = 0;
    let lastPhase = null;
    const wrappers = new Map(); // placeId → the .stx-slot wrapper this driver created

    const setState = (next) => {
      state = next;
      host.setAttribute("data-replay", next);
    };
    setState("loading");

    // --- the reflection -------------------------------------------------------------------------
    // THE ONE PLACE THE CANVAS IS WRITTEN by this file. `col` is the place's index in BOARD ORDER,
    // exactly as studio.mjs's arrangeBoard derives it — the artifact carries no arrangement (that is
    // #208's codec field, and this run predates any gesture), so board order is the only honest
    // source for a column. Breaking at MAX_COLS rather than clamping, for arrangeBoard's reason: a
    // clamp would stack two components in one cell, which the canvas refuses.
    const blockFor = (place) => renderPlace({
      id: place.id,
      label: place.label,
      affordances: place.affordances.map((f) => ({ id: f.id, label: f.label })),
    });

    const reflect = (changes) => {
      for (const change of changes) {
        if (change.kind === "refused") { canvas.say(`Refused: ${change.text}`); continue; }
        if (change.kind === "connections-changed") continue; // the board changed; no node did
        const place = board.places.find((p) => p.id === change.placeId);
        if (change.kind === "place-removed") {
          wrappers.get(change.placeId)?.remove();
          wrappers.delete(change.placeId);
          continue;
        }
        if (!place) continue;
        const col = board.places.indexOf(place) + 1;
        if (change.kind === "place-added") {
          if (col > MAX_COLS) continue;
          const node = blockFor(place);
          canvas.place(node, { col, row: 1, name: place.label });
          if (node.parentElement) wrappers.set(place.id, node.parentElement);
          continue;
        }
        // place-changed — RENAMED IN PLACE, never re-placed. See call 2 in the header: place()
        // appends unconditionally and announces on every call, so re-placing would re-order the
        // stage and turn four announcements into eleven. studio-compile.mjs:387-399, copied.
        const wrapper = wrappers.get(change.placeId);
        if (!wrapper) {
          canvas.say(`Refused: no block for ${change.placeId} on this canvas.`);
          continue;
        }
        const old = [...wrapper.children].find((c) => !c.classList.contains("stx-grab"));
        const fresh = blockFor(place);
        if (old) wrapper.replaceChild(fresh, old);
        else wrapper.appendChild(fresh);
        wrapper.setAttribute("data-stx-name", place.label);
        const grab = wrapper.querySelector(":scope > .stx-grab");
        if (grab) grab.setAttribute("aria-label", `Move ${place.label}`);
      }
    };

    // --- THE ONE CONSUMER -----------------------------------------------------------------------
    // The only place the board changes and the only place the canvas is written. Both playback paths
    // — the timer chain and the reader's Step — do nothing but emit, so an action injected through
    // getReplay()'s bus reaches the identical code. That is studio-verbs.mjs's call 1, applied a
    // third time (bus-toggles.mjs was the second); action-bus.mjs is NOT edited.
    const offOp = bus.on("agent.build-op", (action) => {
      const beat = action && action.params ? action.params.beat : null;
      if (!isObj(beat)) { canvas.say("Refused: an agent.build-op carried no beat."); return; }
      const result = applyBeat(board, beat);
      board = result.board;
      reflect(result.changes);
    });

    // Narration and refusals change no board and no node — they are the run's words, and they land
    // in the visible readout. Consumed here rather than written directly by the emitter so that the
    // bus is the drive path for BOTH beat kinds, not only the ones with a board effect.
    const offNote = bus.on("agent.note", (action) => {
      const beat = action && action.params ? action.params.beat : null;
      if (!isObj(beat)) return;
      readout.textContent = describeBeat(beat);
      readout.setAttribute("data-beat-kind", beat.kind);
    });

    // --- the emitter ----------------------------------------------------------------------------
    // ONE BEAT = ONE EMIT, and only agent.* with source "agent". `target.component` is deliberately
    // ABSENT: a board place is not a library component, and action-bus.mjs:22-26 (with #232) is
    // explicit that `component` is the vocabulary shape and never a display string.
    const emitBeat = (beat) => {
      const type = beat.kind === "op" ? "agent.build-op" : "agent.note";
      const target = beat.kind === "op" && beat.params && beat.params.placeId
        ? { id: String(beat.params.placeId) }
        : undefined;
      bus.emit({ type, source: "agent", target, params: { beat, seq: beat.seq } });
    };

    // --- announcing -----------------------------------------------------------------------------
    // THE POLICY, and it is not obvious (three sources want this one polite region during a 14 s
    // autoplay): place() keeps its own "X in column N, row 1" sentence — it is true and #204 owns
    // it — the driver adds only ACT TRANSITIONS and the completion sentence while autoplaying, and
    // it announces PER BEAT only when the reader drove the step. The rejected alternative, a quiet
    // flag threaded into canvas.say, is an edit to studio-canvas.mjs that #204 deliberately did not
    // make, and it would hand every future caller a way to move something silently.
    // ACTS TRAVERSED WITHIN ONE TASK ARE NAMED IN ONE SENTENCE, never announced one by one. A polite
    // region speaks its FINAL value per task, so skipToEnd's synchronous loop — and the whole
    // reduced-motion path, which IS that loop — used to write N act sentences a screen-reader user
    // heard none of: settle()'s completion sentence overwrote every one of them in the same task.
    // This is studio-compile.mjs:165-174's recorded lesson and deliberately NOT its answer —
    // spacing across tasks is right for a beat meant to play out and wrong for a path whose entire
    // contract is that it is instant. Folding them into the sentence that ENDS the task is the only
    // shape that survives: one say, one task, one value. `instant` is set only around a synchronous
    // run of beats, and whoever ends that run drains the list (PR #240 review, finding 3).
    let instant = false;
    const actsPending = [];
    // "Plan", "Plan and Gate", "Plan, Gate and Implement" — the site's list voice, not a join(", ").
    const drainActs = () => {
      const acts = actsPending.splice(0);
      if (!acts.length) return "";
      if (acts.length === 1) return acts[0];
      return `${acts.slice(0, -1).join(", ")} and ${acts[acts.length - 1]}`;
    };

    const announceBeat = (beat, driven) => {
      if (driven) { canvas.say(describeBeat(beat)); return; }
      if (beat.phase && beat.phase !== lastPhase) {
        lastPhase = beat.phase;
        const act = PHASES[beat.phase] || beat.phase;
        if (instant) { actsPending.push(act); return; }
        canvas.say(`${act}.`);
      }
    };

    const syncControls = () => {
      seek.value = String(index);
      pauseBtn.textContent = playing ? "Pause" : "Resume";
      // THE WHOLE TRANSPORT GOES DEAD ONCE THE VISITOR HAS TAKEN OVER, not only seek. Seek's own
      // reason — a rebuild would destroy the arrangement the visitor made — is the narrower half of
      // a rule that covers all four: THE DRIVER DOES NOT AUTHOR ONTO A CANVAS IT HAS HANDED OVER.
      // Resume/Step/Skip each apply further beats, and every beat after the first `place.add` for a
      // block is a `place-changed` that does `wrapper.replaceChild(fresh, old)` on the wrapper's
      // first non-`.stx-grab` child (:499). The committed artifact carries seven `affordance.add`,
      // each of which produces exactly that change — so a visitor who takes over, compiles the
      // board, then presses Resume would watch compiled primitives replaced by fat markers. Two
      // authors, one stage: the failure this file's headline invariant exists to prevent, reached
      // through the transport rather than through a mover (PR #240 review, finding 1).
      pauseBtn.disabled = settled || tookOver;
      stepBtn.disabled = tookOver || index >= beats.length;
      endBtn.disabled = tookOver || index >= beats.length;
      seek.disabled = tookOver || !beats.length;
    };

    // --- the scheduler --------------------------------------------------------------------------
    // A setTimeout CHAIN, not setInterval and not rAF: the gaps are hundreds of milliseconds and a
    // timer that skips a beat is worse than one that runs late.
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };

    const advance = (driven) => {
      if (destroyed || index >= beats.length) return;
      const beat = beats[index];
      index += 1;
      emitBeat(beat);
      announceBeat(beat, driven);
      if (index >= beats.length) settle();
      syncControls();
    };

    const schedule = () => {
      clearTimer();
      if (destroyed || !playing || index >= beats.length) return;
      timer = setTimeout(() => {
        timer = 0;
        if (destroyed || !playing) return;
        advance(false);
        schedule();
      }, Math.max(0, beats[index].delayMs || 0));
    };

    // Runs EXACTLY ONCE. The orchestrator's callback is what keeps studio.mjs's exported board,
    // summary and arranged true — tooling/studio-journey.mjs reads all three off the running page.
    function settle() {
      if (settled) return;
      settled = true;
      playing = false;
      clearTimer();
      setState("settled");
      const acts = drainActs();
      canvas.say(acts
        ? `The run finished, moving through ${acts}: ${board.places.length} places, ${run ? run.opCount : beats.length} ops.`
        : `The run finished: ${board.places.length} places, ${run ? run.opCount : beats.length} ops.`);
      readout.textContent = `The run is complete — ${board.places.length} places on the canvas, built by ${run ? run.opCount : beats.length} ops.`;
      readout.removeAttribute("data-beat-kind");
      if (typeof onSettle === "function") onSettle(board);
      syncControls();
    }

    // --- the verbs ------------------------------------------------------------------------------
    const play = () => {
      if (destroyed || settled || !beats.length) return;
      playing = true;
      syncControls();
      schedule();
    };

    const pause = () => {
      if (!playing) return;
      playing = false;
      clearTimer();
      syncControls();
    };

    // Step IMPLIES pause: a reader driving the run by hand and a timer driving it underneath them
    // would race for the same beat.
    const step = () => {
      pause();
      if (settled || index >= beats.length) return;
      advance(true);
    };

    const skipToEnd = () => {
      pause();
      instant = true;
      // `finally`, because advance() → settle() → onSettle() runs the orchestrator's callback inside
      // this loop and a throw there must not leave the driver announcing nothing for the rest of the
      // page's life.
      try { while (index < beats.length) advance(false); } finally { instant = false; }
    };

    // Backwards is a REBUILD FROM THE PREFIX, never an un-apply: ops have no inverse, applyOp is
    // pure, and replaying the prefix is provably the same board. The canvas is rebuilt to match,
    // which re-mints wrapper ids — fine only because seek is disabled once the visitor has taken
    // over (syncControls says why).
    const seekTo = (n) => {
      if (destroyed || tookOver) return;
      const target = Math.min(beats.length, Math.max(0, Math.round(Number(n)) || 0));
      pause();
      if (target < index) {
        for (const wrapper of wrappers.values()) wrapper.remove();
        wrappers.clear();
        board = emptyBoard();
        index = 0;
        lastPhase = null;
        settled = false;
        setState("ready");
      }
      // THE SAME COLLAPSE, and it is fixed here for the same reason rather than left as a sibling of
      // the bug above: a forward seek applies its whole span in one task too, so its act sentences
      // were overwritten by the step count below exactly as skipToEnd's were by settle's.
      instant = true;
      try { while (index < target) advance(false); } finally { instant = false; }
      if (index < beats.length) { settled = false; }
      const acts = drainActs();
      canvas.say(acts
        ? `Moved through ${acts}. Step ${index} of ${beats.length}.`
        : `Step ${index} of ${beats.length}.`);
      syncControls();
    };

    pauseBtn.addEventListener("click", () => { if (playing) { pause(); canvas.say("Replay paused."); } else { play(); canvas.say("Replay resumed."); } }, { signal });
    stepBtn.addEventListener("click", step, { signal });
    endBtn.addEventListener("click", () => { skipToEnd(); }, { signal });
    seek.addEventListener("input", () => seekTo(seek.value), { signal });

    // --- the take-over --------------------------------------------------------------------------
    // LISTENED FOR IN THE CAPTURE PHASE ON THE SCROLLER, and this is the load-bearing call: NOT by
    // subscribing to ui.move on the bus. A gesture is a PREVIEW and studio-verbs.mjs emits its one
    // ui.move at the DROP, so waiting for the bus would let the visitor drag a node while the replay
    // is still placing others underneath them.
    //
    // The SCROLLER rather than the viewport, which is what makes the "is this chrome?" filter
    // unnecessary rather than heuristic: the zoom row, the verb row, the compile row and this
    // driver's own controls all live OUTSIDE canvas.scroll, and everything inside it — the stage,
    // the blocks, the move handles — is the canvas itself.
    //
    // TAB ALONE IS NOT TAKE-OVER. A keyboard reader Tabbing toward a control has not grabbed the
    // wheel, and firing the metric there would inflate it. Modifier-only presses are navigation
    // too. Everything else — Enter, Space, an arrow, any pointer press on the stage — is.
    const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "Tab"]);
    const onTouch = (e) => {
      if (tookOver || destroyed) return;
      if (e.type === "keydown" && (MODIFIER_KEYS.has(e.key) || e.ctrlKey || e.metaKey)) return;
      // NOTHING TO TAKE OVER, SO NO TAKE-OVER: a visitor moving blocks on a canvas the replay never
      // built has taken nothing over, and firing the route there would make the metric a lie. A
      // COMPLETED run still hands over — grabbing the wheel over the run's finished work is exactly
      // what the metric is about.
      //
      // READ OFF `beats` RATHER THAN `state`, which covers one state more than "unavailable" and is
      // the reason it is written this way: `beats` is empty from mount until :450's assignment, so
      // this also excludes the "loading" window — two awaited fetches against a visible, empty,
      // inviting canvas — where the replay has likewise built nothing, and where a press used to
      // fire the route and then let start() play the run anyway, underneath a reader the provenance
      // line had just told the canvas was theirs. unavailable() sets `beats = []` (:770), so the
      // original condition is subsumed rather than dropped (PR #240 review, finding 2).
      if (!beats.length) return;
      tookOver = true;
      const wasPlaying = playing;
      pause();
      host.setAttribute("data-provenance", "visitor");
      provenance.setAttribute("data-provenance", "visitor");
      provenance.textContent = PROVENANCE_VISITOR;
      // ANNOUNCED ONLY WHEN SOMETHING WAS ACTUALLY INTERRUPTED, and this is a real call rather than
      // a saving. On a SETTLED canvas the reader has interrupted nothing — the run finished before
      // they arrived at it — so "the canvas is yours" would be a sentence about no event, and it
      // lands in the same breath as the pick-up sentence their keypress just triggered, in a polite
      // region that speaks its final value. It made the first Enter on a move handle announce twice
      // and say the less useful thing last (studio-journey's "#206 · announcing once per keypress"
      // caught it). The provenance line still shifts visibly on both paths, and the route still
      // fires on both: what is conditional here is the SENTENCE, not the handover.
      if (wasPlaying) canvas.say("Replay paused — the canvas is yours.");
      syncControls();
      // FROM THIS LINE AND ONLY THIS LINE (#75's lesson: a settled-state flag fires whether the
      // thing happened or not).
      trackFactoryTookOver();
      if (typeof onTakeOver === "function") onTakeOver();
    };
    canvas.scroll.addEventListener("pointerdown", onTouch, { capture: true, signal });
    canvas.scroll.addEventListener("keydown", onTouch, { capture: true, signal });

    // --- the run --------------------------------------------------------------------------------
    // A LIVENESS CHECK AFTER EVERY AWAIT (studio-compile.mjs:461-465's #236 lesson): destroy() has
    // already removed the chrome and aborted the fetches, so every line below an await would
    // otherwise be writing into a surface that no longer belongs to this handle.
    async function start() {
      let artifact = null;
      let traceText = null;
      try {
        const res = await fetch(ARTIFACT_URL, { signal });
        if (destroyed) return;
        if (!res.ok) throw new Error(`${ARTIFACT_URL} → HTTP ${res.status}`);
        artifact = await res.json();
      } catch {
        // Swallowed rather than logged: the failure is REPORTED by the card below. A console.error
        // would say the same thing to nobody the reader can see and trip studio-journey's
        // no-page-errors contract on the way (studio-compile.mjs:294-298, inherited).
        artifact = null;
      }
      if (destroyed) return;
      if (!artifact) { unavailable(`The run's projection at ${ARTIFACT_URL} could not be read here, so nothing is replayed and nothing is drawn in its place.`); return; }

      try {
        const res = await fetch(TRACE_URL, { signal });
        if (destroyed) return;
        if (!res.ok) throw new Error(`${TRACE_URL} → HTTP ${res.status}`);
        traceText = await res.text();
      } catch {
        traceText = null; // op-only, and the chrome says so
      }
      if (destroyed) return;

      const built = buildBeats(artifact, traceText);
      if (built.error || !built.beats.length) {
        unavailable(built.error || "The run's projection carries no steps.");
        return;
      }

      const pacing = paceBeats(built.beats, PLAYBACK_MS);
      beats = pacing.beats;
      run = describeRun(artifact, built.meta, pacing, beats);
      renderChrome(built);
      seek.setAttribute("max", String(beats.length));

      // DECLINED — the visitor brought their own board, so nothing is played and nothing is
      // authored. The chrome above still says what the run WAS and still links its trace and its
      // brief, because that exhibit is true whether or not it ran here; what changes is that the
      // transport goes away and the provenance line says whose canvas this is. `tookOver` is set
      // rather than a fourth flag: it is exactly the state "this driver will not write to the stage
      // again", it makes syncControls kill all four controls for the reason that comment gives, and
      // it makes onTouch inert — a visitor who then moves their own block has taken nothing over,
      // and firing /factory/took-over there would make that metric a lie.
      //
      // NO onSettle, and no take-over route. The board on the canvas is the ORCHESTRATOR'S — it
      // placed it before this mount — so publishing one from here would hand studio.mjs a board this
      // driver never built. studio.mjs re-enables the compile beat itself on this path, which is the
      // constraint that matters: a declined mount must not leave the page's primary control dead.
      if (declined) {
        tookOver = true;
        setState("declined");
        controls.hidden = true;
        pacingLine.after(el("p", { class: "stu-replay-note", text: DECLINED_NOTE }));
        provenance.setAttribute("data-provenance", "visitor");
        provenance.textContent = PROVENANCE_DECLINED;
        host.setAttribute("data-provenance", "visitor");
        readout.textContent = "";
        return;
      }

      setState("ready");
      syncControls();

      // REDUCED MOTION: every beat applied synchronously, then settle. Stepping and seeking stay
      // available — they are manual, so they are not "animation from interaction" — and the Pause
      // button is hidden because nothing is playing.
      if (reduceMotion()) {
        pauseBtn.hidden = true;
        skipToEnd();
        return;
      }
      play();
    }

    function unavailable(message) {
      beats = [];
      setState("unavailable");
      readout.textContent = "";
      honesty.textContent = "";
      facts.textContent = "";
      pacingLine.textContent = "";
      controls.hidden = true;
      mount.appendChild(el("div", { class: "stu-replay-card" },
        el("p", { class: "stu-replay-eyebrow", text: "Not available" }),
        el("p", { class: "stu-replay-note", text: message })));
      provenance.textContent = "";
      if (typeof onSettle === "function") onSettle(null);
    }

    // Every string below is a value out of the two committed files or a number counted from them.
    // meta.label ("Real run, curated for length") and artifact.label ("Projection of the real run
    // …") are rendered VERBATIM and neither is paraphrased: replay/README.md is explicit that the
    // wording is the artifact saying what it is, and trace-player.mjs makes the same call.
    function renderChrome(built) {
      honesty.textContent = run.traceLabel
        ? `${run.traceLabel} · ${run.label}`
        : run.label;

      const fact = (term, value) => {
        if (!value) return;
        facts.appendChild(el("dt", { class: "stu-replay-term", text: term }));
        facts.appendChild(el("dd", { class: "stu-replay-value", text: value }));
      };
      fact("Model", run.model);
      fact("Started", run.startedAt.slice(0, 10));
      fact("Took", formatDuration(run.durationMs));
      fact("Session", run.sessionId);

      const links = el("p", { class: "stu-replay-links" });
      links.append(
        el("a", { href: run.tracePath, text: "The curated trace" }),
        document.createTextNode(" · "),
        el("a", { href: run.briefPath, text: "The brief it was given" }),
      );
      facts.after(links);

      // THE PACING SENTENCE, from computed numbers. It never claims wall-clock realism — see call 3.
      // TWO SPANS, NAMED AS TWO. "Took" in the facts list above is the run's whole session
      // (meta.durationMs); this sentence measures first beat to last, which is shorter by whatever
      // the run spent on steps that are not played — it read its brief and it validated the board.
      // Both numbers are honest and they differ, so on a page whose premise is checkable honesty the
      // sentence has to say which span it is measuring rather than leave two durations sitting
      // inches apart with nothing distinguishing them (PR #240 review, finding 4).
      const shape = `${run.opCount} ops, ${run.noteCount} narration steps and ${run.refusalCount} refusals its fence turned down`;
      // "Of that" only where there IS a that: fact("Took", …) renders nothing without a durationMs,
      // and a sentence referring back to a fact the reader cannot see is worse than the collision it
      // was written to fix.
      const span = `${run.durationMs ? "Of that, the" : "The"} played steps span ${formatDuration(run.realMs)}`;
      pacingLine.textContent = run.compression > 1.05
        ? `${span} — ${shape}. Played here at ${run.compression.toFixed(1)}×, so the gaps between steps stay the run's own, proportionally.`
        : `${span} — ${shape}. Played here at the run's own pace.`;

      if (built.traceless) {
        pacingLine.after(el("p", { class: "stu-replay-note", text:
          `The run's own words could not be read from ${TRACE_URL}, so the ops play without the narration and the refusals that ran between them.` }));
      } else if (built.skipped) {
        pacingLine.after(el("p", { class: "stu-replay-note", text:
          `${built.skipped} of the run's steps are neither ops nor words — it read the brief and validated the board — and are not played.` }));
      }

      provenance.textContent = PROVENANCE_RUN;
    }

    start();

    const handleObj = {
      play, pause, step, seekTo, skipToEnd,
      get state() { return state; },
      get board() { return board; },
      get beats() { return beats; },
      get index() { return index; },
      get tookOver() { return tookOver; },
      // #214's one seam, and it is a STATE ADOPTION rather than a new state: the method band's
      // redraft replaces the stage's contents from OUTSIDE the scroller, so onTouch never sees it —
      // but from that moment this driver must not write to the stage again, and the transport must
      // not offer to (seek stays live at settle, and a backward seek REBUILDS the run's board).
      // `tookOver` already means exactly that — see the declined mount above — so this adopts it.
      // NO take-over route fires: the visitor answered a card, they did not grab the wheel over the
      // run's work, and #75's lesson is that an event fires only from its own success path. The
      // provenance line moves for the declined path's reason: the board on the stage is no longer
      // the run's. pause() first, so a driver resumed after a backward seek stops mid-play too.
      relinquish() {
        if (tookOver || destroyed) return;
        tookOver = true;
        pause();
        host.setAttribute("data-provenance", "visitor");
        provenance.setAttribute("data-provenance", "visitor");
        provenance.textContent = PROVENANCE_REDRAFTED;
        syncControls();
      },
      destroy() {
        // IT DOES NOT RE-ENABLE THE COMPILE BEAT, and that is stated rather than left to be found:
        // studio.mjs blocks the beat before mounting this driver and unblocks it on settle, on
        // take-over and on a failed mount — a teardown is none of the three, so a destroyed driver
        // leaves the page's primary control disabled for the life of the page. Harmless today
        // because tooling/studio-journey.mjs is the ONLY caller (verified by search, PR #240), and
        // it tears the page down straight after. The day a shipped path calls this — #206's route
        // surgery is the candidate — it must publish the board first or re-enable the beat.
        //
        // THE ORDER IS THE POINT (studio-compile.mjs:565-573): the flag first so a frame parked
        // below an await reads it and stops, the abort second — which detaches every listener AND
        // rejects the in-flight fetches — then the timer, then the DOM.
        destroyed = true;
        ac.abort();
        clearTimer();
        offOp();
        offNote();
        playing = false;
        mount.textContent = "";
        host.removeAttribute("data-replay");
        host.removeAttribute("data-provenance");
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } catch (err) {
    // The boundary throw is REPORTED through the handle rather than left to reject: the page must
    // still have a canvas, and a gate must fail on the missing thing rather than on a timeout.
    state = "unavailable";
    throw err;
  } finally {
    // Every path, including the boundary throw and any early return. "unavailable" deliberately
    // does NOT satisfy the visual-regression gate's wait for [data-replay="settled"] — a broken
    // replay must deadlock that gate loud rather than be baselined (the initGlossary discipline,
    // studio.mjs:342-355).
    if (host && !host.hasAttribute("data-replay")) host.setAttribute("data-replay", state);
  }
}
