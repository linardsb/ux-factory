// discovery/ops.mjs — the discovery op vocabulary and a pure applier over the run's op ledger
// (epic #279, ticket #281; docs/epics/discovery-partner.architecture.md §Data model — the op
// table, R2, refuse-vs-flag, the four throws; #281 comment 2026-08-28 — the supersede rule).
//
// An OP is one filing the interviewing agent makes against a person's answers: a decision, a
// weak-answer flag, an open question, a piece of evidence. The agent judges FORM, never
// substance (PRD MVP 6), and this file is where that sentence stops being a prompt and becomes a
// property of the data: record_decision has no parameter for answer text at all.
//
// It lives in discovery/, not system/, for a measurable reason: agent-layer/gen-loc-summary.mjs:23
// counts system/*.mjs as "design system" and renders the number on approach.html. A file here is
// counted by nothing and churns nothing, and an agent's op grammar is not a view-time module.
//
// Six invariants a future editor must keep:
//
//   1. NO PARAMETER CARRIES ANSWER TEXT. `answer_ref` (and file_evidence's `ref`) resolve against
//      ctx.answers — the parsed answers.jsonl, which only the server writes. An unresolvable ref is
//      a throw, so the agent has no route to put words in the human's mouth. file_evidence's `name`
//      (#347) is the one string the agent authors — a LABEL for an artefact the answer names, never
//      the answer's words — and it is accepted only beside a `ref`, so the row still points at the
//      sentence that named it.
//   2. THE FOUR VERBS MOVE TOGETHER: an OPS entry, its PARAMS entry, its switch case and its
//      build-checks group 29 fixture, in one edit, under the epic's op-verb lock.
//   3. ABSENT IS REFUSED, EMPTY IS FLAGGED. A missing field throws naming the op and the field;
//      `evidence_refs: []` and `parent_id: null` are accepted and recorded with a flag. A session
//      can never deadlock on evidence that is not findable yet, and a pack can never quietly hold
//      an unbacked decision.
//   4. R2 KEYS ON THE TURN, NOT THE QUESTION. Exactly one closing op per banked-question turn
//      (ctx.turn, the server's id). Off-script ops and file_evidence never close a turn, which is
//      what makes MVP 9's escape hatch expressible. #289 made the escape hatch reachable and turned
//      the invariant from a parameter the agent asserts into a property of the server-written answer
//      store, in four rules keyed on the ANSWER an op names (kind and intent are written by
//      appendAnswer, never by the agent): a CLOSING op may not rest on an off-script answer; a
//      decision or open question naming one must carry the off-script form (off_script true /
//      source "off-script"); one off-script answer settles as a decision or an open question, never
//      both; and a turn cannot be closed while an `intent: "aside"` answer on it has no filing.
//      NOTHING DEADLOCKS, and the reason is structural rather than argued: the compliant filing is
//      non-closing, so closeTurn never sees it, and the settle-once rule permits it at count 0 — so a
//      legal next op always exists. THE GUARD IS ON ADVANCING, NEVER ON LEAVING: closeSession is
//      deliberately not gated, so a stubborn agent can stall a turn but can never make a package
//      unfinishable, which is what keeps MVP 8's "blocking is not available" true. An unfiled
//      exchange after the last turn is RECORDED (auditExchanges, and prd.md names it), never refused.
//      And a SUPERSEDE is the latest answer to a banked question replacing an earlier one, so an
//      off-script decision — which names a question without answering it — never supersedes and is
//      never superseded.
//   5. REFS ARE `seq`s AND THE APPLIER ASSIGNS THEM. `parent_id`, `evidence_refs[]` and
//      `claim_ref` are integers naming an earlier record's `seq` — one id space, nothing the agent
//      can invent (a seq it has not seen does not resolve).
//   6. NO SDK, NO FILESYSTEM, NO BANK IMPORT. The context — answers, bank, turn — is passed in by
//      the caller (the server, the gate, the projection). #282's export names are not this
//      module's business, and CI's absence of portal/node_modules cannot touch it.
//
// Five pure reads over a ledger sit beside the applier — `parentCandidates` and `auditParenting`
// (#341), because the refusal, the prompt and the gate must all answer "who could this decision's
// parent be?" identically; `ledgerView` (#288), whose consumer is sessionView → the drawer's
// package view, for the same reason one rung down: a fold written inline in the browser is a
// claim-generating surface no gate can reach; and `auditTraceability` + `auditExchanges` (#289), the
// package-wide reads MVP 10's traceability rule and MVP 9's filing rule need and no per-record flag
// reaches. ledgerView MIRRORS prd-projection.mjs's visible and
// supersede rules rather than importing them (that module imports the bank, and invariant 6 is what
// lets this one load in CI with no portal/node_modules), and build-checks group 29 compares the two
// readers on one committed package. A PURE READ IS NOT A VERB: it does not take the epic's op-verb
// lock, and it may not add, rename or reinterpret anything in OPS, PARAMS or the switch.
//
// Node-import-safe and side-effect-free. No imports at all.

// The op vocabulary, in one place. Frozen: a consumer that wants a new verb edits this list, PARAMS
// and the switch below together, not one of them.
export const OPS = Object.freeze(["record_decision", "flag_weak_answer", "open_question", "file_evidence"]);

// The exact params each op takes — exact, not minimal: an unknown key throws, an absent key throws.
// Exported (board-ops keeps its private) so group 29 can assert OPS ↔ PARAMS in both directions.
// Each inner array is frozen too — Object.freeze is shallow, and a pushable PARAMS entry would let
// the "frozen by mutation" case pass for the wrong reason.
export const PARAMS = Object.freeze({
  record_decision: Object.freeze(["question_id", "answer_ref", "level", "parent_id", "evidence_refs", "wrong_if", "off_script"]),
  flag_weak_answer: Object.freeze(["question_id", "answer_ref", "missing"]),
  open_question: Object.freeze(["source", "question_id", "answer_ref", "reason"]),
  file_evidence: Object.freeze(["url", "ref", "name", "provenance", "claim_ref"]),
});

// The BABOK ladder in order (docs/research/requirements-hierarchy.md): a decision's parent sits
// exactly one rung above it, and a business decision has no parent.
export const LEVELS = Object.freeze(["business", "stakeholder", "solution", "transition"]);
export const PROVENANCE = Object.freeze(["real-interview", "secondary-source", "assumption", "fictional-scenario"]);
export const SOURCES = Object.freeze(["banked", "off-script"]);
export const FLAGS = Object.freeze(["no-evidence", "orphan"]);

// The seqs a decision at `level` may name as its parent: every earlier record_decision exactly
// one rung above it. [] for business (nothing above it) and for a rung nobody has filed at yet.
// Exported because two callers need the SAME answer (#341): the applier's wrong-rung refusal names
// these seqs so a retry has something to retry with, and the posture's turn prompt lists them per
// rung so the agent's parent is a LOOKUP over what this run holds rather than a recollection from a
// resumed session — the rehearsal filed null on 18 of 18 eligible decisions because the ledger was
// never in front of it. Superseded decisions ARE candidates: the applier accepts any earlier decision
// at the rung above, and the candidate list must equal the acceptance set or the brief lies by
// omission. Total over junk: a level off the ladder is a throw, never [] (a silent [] would read as
// "no candidates" and license a null).
export function parentCandidates(ops, level) {
  if (!Array.isArray(ops)) throw new Error("parentCandidates: ops must be the ledger's records array");
  if (!LEVELS.includes(level)) throw new Error(`parentCandidates: level "${level}" is not on the ladder — ${LEVELS.join(" · ")}`);
  if (level === LEVELS[0]) return [];
  const above = LEVELS[LEVELS.indexOf(level) - 1];
  return ops.filter((r) => r?.op === "record_decision" && r.params?.level === above).map((r) => r.seq);
}

// The parenting audit — a pure read over a ledger, the way the not-a-form counter is arithmetic
// over the records (#285). For every non-business decision: did the rung above hold a decision
// WHEN THIS ONE WAS FILED (ops.slice(0, i), never the final ledger), and did it name one?
// `eligible` had candidates; `missed` ⊂ eligible passed null (the agent did not look); `structural`
// had none and passed null (the honest orphan — the bank serves a solution-eligible question before
// the first stakeholder one, #341 cause B). A decision filed before the first stakeholder one stays
// structural even if a stakeholder decision lands later. A business decision never appears in any
// list. This is the read build-checks group 32 makes over the committed fixture run, and the read
// that turned the rehearsal's "19 orphans" into 18 missed + 1 structural.
export function auditParenting(ops) {
  if (!Array.isArray(ops)) throw new Error("auditParenting: ops must be the ledger's records array");
  const eligible = [], missed = [], structural = [];
  ops.forEach((r, i) => {
    if (r?.op !== "record_decision" || r.params?.level === LEVELS[0]) return;
    const candidates = parentCandidates(ops.slice(0, i), r.params.level);
    if (candidates.length) { eligible.push(r.seq); if (r.params.parent_id === null) missed.push(r.seq); }
    else if (r.params.parent_id === null) structural.push(r.seq);
  });
  return { eligible, missed, structural };
}

// THE TRACEABILITY RULE, checkable over a WHOLE package (#289; PRD MVP 10, first rule). The
// per-record halves already exist — `orphan` when a non-business decision names no parent,
// `no-evidence` when it names no evidence — and they are flagged IDENTICALLY, which is the second half
// of the rule. What no read reaches today is the CHAIN: a solution whose stakeholder parent is itself
// an orphan is unrooted even though neither record is flagged twice. So every decision walks UP through
// parent_id to a business decision or to nothing, and `unrooted` names the ones that do not arrive.
//
// Composes auditParenting rather than re-deriving it — two answers to "who could this decision's parent
// be" is the drift this file's header forbids. Total over junk, like ledgerView: a view that throws
// takes the reader down over a record the applier already accepted. A PURE READ IS NOT A VERB: nothing
// in OPS, PARAMS or the switch moves for it, so it takes no op-verb lock.
//
// Shape: { parenting, rooted, unrooted, unbacked, byLevel }. `byLevel` is keyed by every entry of LEVELS
// ALWAYS — a rung nobody filed at reads 0, the rule ledgerView's `counts` follows — so a fifth rung
// shows up as a missing key rather than as silence.
export function auditTraceability(ops) {
  // auditParenting is NOT total over junk — it reaches r.params.level and hands it to parentCandidates,
  // which throws on a level off the ladder. That is right for its own caller (the gate hands it applier
  // output), and wrong here, where this read backs a live drawer. So the malformed decisions are dropped
  // BEFORE it sees them rather than its own refusal being softened: a record the applier could not have
  // produced is not a parenting miss, and softening auditParenting would let a real one read as clean.
  const sane = Array.isArray(ops)
    ? ops.filter((r) => r && typeof r === "object" && (r.op !== "record_decision" || LEVELS.includes(r.params?.level)))
    : [];
  const list = sane.filter((r) => r.op === "record_decision");
  const parenting = auditParenting(sane);
  const bySeq = new Map(list.map((r) => [r.seq, r]));
  const rooted = [], unrooted = [], unbacked = [];
  for (const r of list) {
    if (Array.isArray(r.flagged) && r.flagged.includes("no-evidence")) unbacked.push(r.seq);
    // CYCLE SAFETY. parent_id names an EARLIER seq, so a cycle is impossible through the applier — but
    // this read is total over junk, and a hand-edited ledger must terminate rather than hang the drawer.
    // A walk that does not terminate is unrooted, which is the honest reading of a broken chain.
    const seen = new Set();
    let at = r, ok = false;
    while (at) {
      if (seen.has(at.seq)) break;
      seen.add(at.seq);
      if (at.params?.level === LEVELS[0]) { ok = true; break; }
      const pid = at.params?.parent_id ?? null;
      if (pid === null) break;
      at = bySeq.get(pid) ?? null;
    }
    (ok ? rooted : unrooted).push(r.seq);
  }
  const byLevel = Object.fromEntries(LEVELS.map((level) => {
    const at = list.filter((r) => r.params?.level === level);
    return [level, {
      decisions: at.length,
      orphans: at.filter((r) => Array.isArray(r.flagged) && r.flagged.includes("orphan")).length,
      unbacked: at.filter((r) => Array.isArray(r.flagged) && r.flagged.includes("no-evidence")).length,
    }];
  }));
  return { parenting, rooted, unrooted, unbacked, byLevel };
}

// WHICH OFF-SCRIPT EXCHANGES WERE FILED (#289; AC #3). The applier REFUSES a closer while an aside on
// the open turn has no filing — but a session can always be finished (MVP 8: blocking is not
// available), so an exchange after the last turn has no later op to refuse. That tail is RECORDED here
// instead: the drawer reads it live and prd.md names it permanently.
//
// Takes both arrays because the discriminator is on the ANSWER — `kind` and `intent` are server-written
// by appendAnswer and the agent has no route to either. An `intent: "look-up"` line goes to `lookups`
// with NO verdict, and that is deliberate: LOOK_IT_UP_RULE makes filing evidence rows, or filing
// nothing at all when nothing usable was found, the correct outcome, so there is nothing to be unfiled
// about. file_evidence is not a filing here for the same reason the applier does not count it.
//
// Total over junk, every array a copy. A PURE READ IS NOT A VERB.
export function auditExchanges(answers, ops) {
  const lines = Array.isArray(answers) ? answers.filter((a) => a && typeof a === "object" && a.kind === "off-script") : [];
  const list = Array.isArray(ops) ? ops.filter((r) => r && typeof r === "object" && OPS.includes(r.op)) : [];
  const settledBy = (ref) => list.find((r) =>
    (r.op === "record_decision" && r.params?.off_script === true && r.params?.answer_ref === ref)
    || (r.op === "open_question" && r.params?.source === "off-script" && r.params?.answer_ref === ref)) ?? null;
  const row = (a) => ({ ref: a.ref ?? null, turn: a.turn ?? null, intent: a.intent ?? null, text: typeof a.text === "string" ? a.text : null });
  const settled = [], unfiled = [], lookups = [];
  for (const a of lines) {
    if (a.intent === "look-up") { lookups.push(row(a)); continue; }
    const by = settledBy(a.ref);
    if (by) settled.push({ ...row(a), seq: by.seq ?? null, op: by.op });
    else unfiled.push(row(a));
  }
  return { settled, unfiled, lookups };
}

// WHAT THE PACKAGE HOLDS, as a value (#288; AC #4). The drawer renders this and derives nothing of
// its own — every count, flag and marker below is read, so the surface can never show a claim the ops
// do not hold. Four rules a future editor must keep:
//
//   · `counts` is keyed by OPS and `flags` by FLAGS, ALWAYS. A verb nobody filed reads 0 rather than
//     being absent, so a fifth verb shows up here as a missing key rather than as a silently absent row.
//   · Flags are counted over the WHOLE ledger, superseded records included — prd-projection.mjs's
//     stated reason (README §Supersede): three surfaces already count that way, and a fourth counting
//     differently gives a reader two numbers for one fact.
//   · `latest` mirrors the projection's `visible` set exactly — every off-script decision, plus the
//     latest decision per banked question_id — and `supersededBy` is the reverse of the applier's
//     `supersedes`. NOTHING IS DROPPED: a superseded record is MARKED and still rendered.
//   · TOTAL OVER JUNK. A non-array argument, a null item, an item with no params, an unknown op —
//     skipped, or the empty shape. This is a VIEW: a view that throws takes the whole drawer down over
//     a record the applier already accepted, which is the opposite of applyOp's job (it throws by design).
//
// Every array is COPIED, never aliased — the same trap opLine's own comment names: a projection that
// handed out a committed record's array would let a consumer rewrite the record without a write.
export function ledgerView(ops) {
  const list = Array.isArray(ops) ? ops.filter((r) => r && typeof r === "object" && OPS.includes(r.op)) : [];
  const counts = Object.fromEntries(OPS.map((op) => [op, 0]));
  const flags = Object.fromEntries(FLAGS.map((f) => [f, 0]));
  for (const r of list) {
    counts[r.op] += 1;
    if (Array.isArray(r.flagged)) for (const f of r.flagged) if (Object.hasOwn(flags, f)) flags[f] += 1;
  }
  const decisionsRaw = list.filter((r) => r.op === "record_decision");
  // The projection's rule, mirrored: latest per banked question_id, and every off-script one its own.
  // An off-script decision may NAME a banked question (#289) and never supersedes it, so it is excluded
  // from the map and reads `latest` on its own row. THE ASYMMETRY WITH prd-projection.mjs IS DELIBERATE:
  // this reads `!== true` because ledgerView is TOTAL OVER JUNK — a malformed record must not be treated
  // as banked — where indexOps reads `=== true`, because checkOpLines has already refused a corrupted
  // ledger before that fold runs. Two mirrors of one rule, fail-closed in the direction each needs.
  const latestByQuestion = new Map();
  for (const d of decisionsRaw) { const q = d.params?.question_id ?? null; if (q !== null && d.params?.off_script !== true) latestByQuestion.set(q, d.seq); }
  const supersededBy = new Map();
  for (const d of decisionsRaw) if (d.supersedes !== null && d.supersedes !== undefined) supersededBy.set(d.supersedes, d.seq);
  const at = (r) => ({ seq: r.seq ?? null, turn: r.turn ?? null });
  return {
    total: list.length,
    counts,
    flags,
    decisions: decisionsRaw.map((r) => {
      const p = r.params ?? {};
      const qid = p.question_id ?? null;
      return {
        ...at(r), questionId: qid, answerRef: p.answer_ref ?? null, level: p.level ?? null,
        parentId: p.parent_id ?? null, evidenceRefs: Array.isArray(p.evidence_refs) ? [...p.evidence_refs] : [],
        wrongIf: p.wrong_if ?? null, offScript: p.off_script === true,
        flagged: Array.isArray(r.flagged) ? [...r.flagged] : [],
        supersedes: r.supersedes ?? null, supersededBy: supersededBy.get(r.seq) ?? null,
        latest: p.off_script === true || qid === null || latestByQuestion.get(qid) === r.seq,
      };
    }),
    weak: list.filter((r) => r.op === "flag_weak_answer").map((r) => ({
      ...at(r), questionId: r.params?.question_id ?? null, answerRef: r.params?.answer_ref ?? null,
      missing: Array.isArray(r.params?.missing) ? [...r.params.missing] : [],
    })),
    openQuestions: list.filter((r) => r.op === "open_question").map((r) => ({
      ...at(r), source: r.params?.source ?? null, questionId: r.params?.question_id ?? null,
      answerRef: r.params?.answer_ref ?? null, reason: r.params?.reason ?? null,
    })),
    evidence: list.filter((r) => r.op === "file_evidence").map((r) => ({
      ...at(r), url: r.params?.url ?? null, ref: r.params?.ref ?? null, name: r.params?.name ?? null,
      provenance: r.params?.provenance ?? null, claimRef: r.params?.claim_ref ?? null,
    })),
  };
}

// The state is the op ledger and nothing else. "Closed" is derived from it (ops.some(closes && turn))
// rather than kept beside it — two records of one fact drift.
export const emptyRun = () => ({ ops: [] });

// Hand-validate the op envelope (project rule: no schema library — check at the boundary and
// throw, naming what is wrong). The envelope is exact — { op, params } and nothing else (board-ops'
// #226 lesson, applied here at the applier because there is no separate grammar layer). Returns the
// params object.
export function checkOp(op) {
  if (!op || typeof op !== "object" || Array.isArray(op)) throw new Error("an op must be an object { op, params }");
  for (const k of Object.keys(op))
    if (k !== "op" && k !== "params") throw new Error(`unknown key "${k}" on the op envelope — an op is exactly { op, params }`);
  // typeof first: a Symbol cannot be interpolated into a message (that is a TypeError, not a refusal).
  if (typeof op.op !== "string") throw new Error(`"op" must be a string naming one of ${OPS.join(" · ")} (got a ${typeof op.op})`);
  if (!OPS.includes(op.op)) throw new Error(`"${op.op}" is not an op — the vocabulary is ${OPS.join(" · ")}`);
  const params = op.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) throw new Error(`${op.op}: "params" must be an object`);
  const allowed = PARAMS[op.op];
  for (const k of Object.keys(params))
    if (!allowed.includes(k)) throw new Error(`${op.op}: unknown param "${k}" — it takes ${allowed.join(", ")}`);
  for (const k of allowed) {
    if (params[k] === undefined) throw new Error(`${op.op}: "${k}" is required (absent is refused; empty is recorded and flagged)`);
    if (typeof params[k] === "symbol") throw new Error(`${op.op}: "${k}" must be a JSON value (got a symbol)`);
  }
  return params;
}

const nonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// Apply one op. PURE: returns a NEW state and never mutates the argument or the op — the transcript
// line is the audit surface, and a record that aliased the caller's object could be rewritten
// without a write. ctx = { answers: [{ ref }], bank: [{ id }], turn: string | null }.
export function applyOp(state, op, ctx) {
  if (!state || !Array.isArray(state.ops)) throw new Error("applyOp: the state must be { ops: [] }");
  if (!ctx || typeof ctx !== "object") throw new Error("applyOp: ctx must be { answers, bank, turn }");
  if (!Array.isArray(ctx.answers)) throw new Error("applyOp: ctx.answers must be an array (the parsed answers.jsonl lines)");
  if (!Array.isArray(ctx.bank)) throw new Error("applyOp: ctx.bank must be an array (the bank's questions)");
  if (ctx.turn !== null && ctx.turn !== undefined && typeof ctx.turn !== "string") throw new Error("applyOp: ctx.turn must be a string or null");
  const p = checkOp(op);
  const name = op.op;
  const turn = ctx.turn ?? null;
  const refs = new Set(ctx.answers.map((a) => a?.ref));
  const bankIds = new Set(ctx.bank.map((q) => q?.id));
  // The ANSWER an op rests on, for the four #289 rules below. `refs` deliberately stays a Set: throw 1's
  // message interpolates [...refs] and case 28.8 drives an answer store holding a Symbol, which a
  // ref → record Map would turn into a TypeError. `?.` for the same reason — 28.8 also drives [null].
  // Reads only server-written fields (kind, intent, turn); it never reaches `text`, so invariant 1 holds.
  const answerOf = (ref) => ctx.answers.find((a) => a?.ref === ref) ?? null;
  const isOffScript = (ref) => answerOf(ref)?.kind === "off-script";
  // The two ops that SETTLE an off-script exchange (MVP 9 names both, in both branches). file_evidence
  // is deliberately NOT one: a url-sourced row carries ref null and names no answer at all, and MVP 7
  // makes filing evidence alone the correct outcome of a look-up. Counting it here would quietly widen
  // AC #3 to accept an evidence row where an aside needed a decision or an open question.
  const settlesOffScript = (r, ref) =>
    (r.op === "record_decision" && r.params.off_script === true && r.params.answer_ref === ref)
    || (r.op === "open_question" && r.params.source === "off-script" && r.params.answer_ref === ref);

  // Throw 1 — the answer-by-reference rule's teeth.
  const resolveAnswer = (ref, field = "answer_ref") => {
    if (!refs.has(ref)) throw new Error(`${name}: ${field} "${ref}" does not resolve — answers.jsonl holds ${[...refs].map(String).join(", ") || "nothing"}`);
    return ref;
  };
  // Throw 3 — a non-null question_id must be a question the bank holds; null means off-script.
  const checkQuestion = (id) => {
    if (id === null) return null;
    if (!nonEmptyString(id) || !bankIds.has(id)) throw new Error(`${name}: question_id "${id}" is not a question the bank holds (null means off-script)`);
    return id;
  };
  // A ref to an earlier record: an integer seq in range whose op is the one wanted.
  const earlier = (seq, wantOp, field) => {
    if (!Number.isInteger(seq) || seq < 1 || seq > state.ops.length)
      throw new Error(`${name}: ${field} ${JSON.stringify(seq)} does not name an earlier op — this run holds seq 1…${state.ops.length}`);
    const rec = state.ops[seq - 1];
    if (rec.op !== wantOp) throw new Error(`${name}: ${field} ${seq} names a ${rec.op}, not a ${wantOp}`);
    return rec;
  };
  // R2 — throw 2. A closing op needs the server's turn id, and the turn must not be closed already.
  const closeTurn = () => {
    if (!nonEmptyString(ctx.turn)) throw new Error(`${name}: no banked turn is open — a closing op needs the server's turn id`);
    const closer = state.ops.find((r) => r.closes && r.turn === ctx.turn);
    if (closer) throw new Error(`${name}: turn "${ctx.turn}" is already closed by op ${closer.seq} — one closing op per banked-question turn (R2)`);
    // AC #3 (#289), the zero case: a turn cannot advance while an ASIDE on it has no filing. Scoped to
    // intent "aside" on purpose — LOOK_IT_UP_RULE makes "file nothing at all" a look-up's correct
    // outcome, so a guard keyed on kind alone would refuse the banked closer after every compliant
    // look-up. Scoped to THIS turn on purpose too: an aside on an earlier turn is that turn's business,
    // and there is no later op to refuse once a session is finished — auditExchanges records the tail
    // and prd.md names it. The compliant filing does not close, so it never reaches this guard.
    const unfiled = ctx.answers.filter((a) =>
      a?.kind === "off-script" && a.intent === "aside" && a.turn === ctx.turn
      && !state.ops.some((r) => settlesOffScript(r, a.ref)));
    if (unfiled.length) throw new Error(`${name}: answer ${unfiled.map((a) => `"${String(a.ref)}"`).join(", ")} on turn "${ctx.turn}" is an off-script aside with no filing — file record_decision with off_script true, or open_question with source "off-script", naming it BEFORE closing this turn. Neither closes the turn, so the question on the table is still yours to close after it (MVP 9, #289)`);
  };

  let params;
  let closes = false;
  const flagged = [];
  let supersedes = null;

  switch (name) {
    case "record_decision": {
      resolveAnswer(p.answer_ref);
      if (!LEVELS.includes(p.level)) throw new Error(`${name}: level "${p.level}" is not on the ladder — ${LEVELS.join(" · ")}`);
      if (typeof p.off_script !== "boolean") throw new Error(`${name}: "off_script" must be true or false`);
      // #289, the wrong-kind case. The answer's `kind` is the server's, so this is not the agent
      // asserting off_script — it is the record. At HEAD a banked decision naming an aside recorded
      // closes: true and settled the banked question with the person's digression.
      if (isOffScript(p.answer_ref) && !p.off_script)
        throw new Error(`${name}: answer_ref "${p.answer_ref}" is an off-script answer, so this decision must carry off_script true — an off-script exchange attaches to the run and never answers the question on the table (MVP 9)`);
      // #289, settle-once. One off-script answer settles as a decision OR an open question, never both.
      // KEYED ON THE ANSWER'S KIND, never on "two settling ops on one ref": in an existing-prd audit
      // every op names the one kind "document" line, and the audit's own verdict table maps ANSWERED to
      // record_decision and ABSENT to open_question — so an unscoped rule would refuse the ordinary
      // audit pair. All eight committed packages are blank-idea, so no gate would have caught that.
      if (isOffScript(p.answer_ref)) {
        const other = state.ops.find((r) => r.op === "open_question" && r.params.source === "off-script" && r.params.answer_ref === p.answer_ref);
        if (other) throw new Error(`${name}: off-script answer "${p.answer_ref}" is already settled by op ${other.seq}, an open_question — one off-script answer files a decision or an open question, never both (MVP 9)`);
      }
      checkQuestion(p.question_id);
      if (!p.off_script && p.question_id === null) throw new Error(`${name}: a banked decision (off_script: false) must name its question_id`);
      if (!nonEmptyString(p.wrong_if)) throw new Error(`${name}: "wrong_if" must be a non-empty string — a decision states what would make it wrong`);
      if (!Array.isArray(p.evidence_refs)) throw new Error(`${name}: "evidence_refs" must be an array of seqs ([] is accepted and flagged)`);
      for (const ref of p.evidence_refs) earlier(ref, "file_evidence", "evidence_refs entry");
      if (p.parent_id !== null) {
        if (p.level === "business") throw new Error(`${name}: a business decision has no parent — parent_id must be null, got ${JSON.stringify(p.parent_id)}`);
        const parent = earlier(p.parent_id, "record_decision", "parent_id");
        if (LEVELS.indexOf(parent.params.level) !== LEVELS.indexOf(p.level) - 1) {
          const above = LEVELS[LEVELS.indexOf(p.level) - 1];
          const candidates = parentCandidates(state.ops, p.level);
          // The refusal is a CORRECTION, not only a verdict (#341): the rehearsal's agent was told the
          // rung five times and re-filed null five times, because a rung is not a seq. Name the seqs.
          throw new Error(`${name}: parent_id ${p.parent_id} is a ${parent.params.level} decision — a ${p.level} decision's parent sits one rung above, at ${above}. ${candidates.length
            ? `This run's ${above} decisions are seq ${candidates.join(", ")} — re-file naming one of them`
            : `This run holds no ${above} decision yet — re-file with parent_id null`}`);
        }
      }
      closes = !p.off_script;
      if (closes) closeTurn();
      if (p.evidence_refs.length === 0) flagged.push("no-evidence");
      if (p.parent_id === null && p.level !== "business") flagged.push("orphan");
      // MVP 9 (#289). A supersede is the LATEST ANSWER to a banked question replacing an earlier one.
      // An off-script decision is not an answer to the question on the table — architecture §Data model:
      // an off-script exchange "attaches to the run without consuming a turn's slot and without advancing
      // the cursor". It may still NAME the question it touched (the normal case: naming it is usually why
      // the person went off-script), and naming is not answering. THE TWO CONDITIONS DO ONE JOB EACH.
      // `!p.off_script` says an off-script decision never supersedes anything. `off_script === false`
      // inside findLast says a banked decision never names an off-script record as the thing it replaced
      // — it looks PAST it to the previous banked answer. Without the second, the re-ask sequence (a weak
      // flag on q1, then an aside on q1, then the banked answer to q1's second ask) files the aside as the
      // superseded record, which is the person's own decision replaced by their own digression.
      if (p.question_id !== null && !p.off_script) {
        const prior = state.ops.findLast((r) => r.op === "record_decision"
          && r.params.question_id === p.question_id && r.params.off_script === false);
        supersedes = prior ? prior.seq : null;
      }
      params = {
        question_id: p.question_id, answer_ref: p.answer_ref, level: p.level, parent_id: p.parent_id,
        evidence_refs: [...p.evidence_refs], wrong_if: p.wrong_if, off_script: p.off_script,
      };
      break;
    }
    case "flag_weak_answer": {
      if (p.question_id === null) throw new Error(`${name}: question_id must name a banked question — a weak answer is weak against a question`);
      checkQuestion(p.question_id);
      resolveAnswer(p.answer_ref);
      // #289. flag_weak_answer has no off-script form at all — it is weak AGAINST a banked question,
      // and it always closes. At HEAD it recorded closes: true over an aside.
      if (isOffScript(p.answer_ref))
        throw new Error(`${name}: answer_ref "${p.answer_ref}" is an off-script answer — a weak-answer flag judges the person's answer to the question on the table, and an off-script exchange is not one. flag_weak_answer has no off-script form (MVP 9)`);
      if (!Array.isArray(p.missing) || p.missing.length === 0 || !p.missing.every(nonEmptyString))
        throw new Error(`${name}: "missing" must be a non-empty array of non-empty strings — what the answer lacks`);
      closes = true;
      closeTurn();
      params = { question_id: p.question_id, answer_ref: p.answer_ref, missing: [...p.missing] };
      break;
    }
    case "open_question": {
      if (!SOURCES.includes(p.source)) throw new Error(`${name}: source "${p.source}" is not one of ${SOURCES.join(" · ")}`);
      checkQuestion(p.question_id);
      if (p.source === "banked" && p.question_id === null) throw new Error(`${name}: a banked open question must name its question_id`);
      resolveAnswer(p.answer_ref);
      // #289, the wrong-kind case — and it also refuses a BANKED open question naming an off-script
      // answer, which is the park path meeting an aside. That is correct and is its own behaviour
      // change: a park's answer_ref is the person's park reason, a banked line, never a digression.
      if (isOffScript(p.answer_ref) && p.source !== "off-script")
        throw new Error(`${name}: answer_ref "${p.answer_ref}" is an off-script answer, so this open question must carry source "off-script" (got "${p.source}") — a banked open question parks the question on the table, and an off-script exchange is not an answer to it (MVP 9)`);
      // #289, settle-once. The mirror of record_decision's, keyed on the answer's kind for the same reason.
      if (isOffScript(p.answer_ref)) {
        const other = state.ops.find((r) => r.op === "record_decision" && r.params.off_script === true && r.params.answer_ref === p.answer_ref);
        if (other) throw new Error(`${name}: off-script answer "${p.answer_ref}" is already settled by op ${other.seq}, a record_decision — one off-script answer files a decision or an open question, never both (MVP 9)`);
      }
      if (!nonEmptyString(p.reason)) throw new Error(`${name}: "reason" must be a non-empty string`);
      closes = p.source === "banked";
      if (closes) closeTurn();
      params = { source: p.source, question_id: p.question_id, answer_ref: p.answer_ref, reason: p.reason };
      break;
    }
    case "file_evidence": {
      const hasUrl = p.url !== null;
      const hasRef = p.ref !== null;
      if (hasUrl === hasRef) throw new Error(`${name}: exactly one of "url" or "ref" must be non-null (got ${hasUrl ? "both" : "neither"})`);
      if (hasUrl && !(typeof p.url === "string" && /^https?:\/\//.test(p.url)))
        throw new Error(`${name}: url ${JSON.stringify(p.url)} must be a string starting http:// or https://`);
      if (hasRef) resolveAnswer(p.ref, "ref");
      // `name` (#347, the #338 F6 second half): an artefact with its OWN identity — "the Q3 dispensing
      // spreadsheet" — that is neither a URL nor an answer. Before it, such a thing had no row of its
      // own, only a pointer at the sentence that mentioned it. A name rides on a `ref` (the answer that
      // named it) and never on a `url` (a URL is its own identity); empty is refused, not flagged —
      // a nameless name is not a partial filing, it is no filing.
      if (p.name !== null) {
        if (!nonEmptyString(p.name)) throw new Error(`${name}: "name" must be null or a non-empty string naming the artefact (got ${JSON.stringify(p.name)})`);
        if (hasUrl) throw new Error(`${name}: "name" rides on a ref, never a url — a URL is its own identity, so pass name null with a url`);
      }
      // Throw 4 — a provenance label outside the four.
      if (!PROVENANCE.includes(p.provenance))
        throw new Error(`${name}: provenance "${p.provenance}" is not one of ${PROVENANCE.join(" · ")}`);
      if (p.claim_ref !== null) earlier(p.claim_ref, "record_decision", "claim_ref");
      params = { url: p.url, ref: p.ref, name: p.name, provenance: p.provenance, claim_ref: p.claim_ref };
      break;
    }
    default:
      throw new Error(`"${name}" is not an op`); // unreachable — checkOp threw first
  }

  const record = { seq: state.ops.length + 1, turn, op: name, params, closes, flagged, supersedes };
  return { ops: [...state.ops, record] };
}

// Fold applyOp over { op, params, turn } items, rethrowing with the item's index so a failure in a
// long transcript names which one. Each item carries its own turn (the server's id at that moment).
// The item envelope is exact too: a projected transcript line must be reduced to { op, params, turn }
// by its reader before it comes here, so a line carrying an altered seq / closes / flagged beside a
// valid op cannot ride through the fold unnoticed.
export function applyOps(items, ctx, state = emptyRun()) {
  if (!Array.isArray(items)) throw new Error("applyOps: items must be an array of { op, params, turn }");
  let acc = state;
  items.forEach((item, i) => {
    const label = typeof item?.op === "string" ? item.op : "?";
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("an item must be an object { op, params, turn }");
      for (const k of Object.keys(item))
        if (k !== "op" && k !== "params" && k !== "turn") throw new Error(`unknown key "${k}" on the item — an item is exactly { op, params, turn }`);
      acc = applyOp(acc, { op: item.op, params: item.params }, { ...ctx, turn: item.turn ?? null });
    } catch (e) { throw new Error(`op ${i} (${label}): ${e.message}`); }
  });
  return acc;
}
