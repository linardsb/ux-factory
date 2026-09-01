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
//      what makes MVP 9's escape hatch expressible.
//   5. REFS ARE `seq`s AND THE APPLIER ASSIGNS THEM. `parent_id`, `evidence_refs[]` and
//      `claim_ref` are integers naming an earlier record's `seq` — one id space, nothing the agent
//      can invent (a seq it has not seen does not resolve).
//   6. NO SDK, NO FILESYSTEM, NO BANK IMPORT. The context — answers, bank, turn — is passed in by
//      the caller (the server, the gate, the projection). #282's export names are not this
//      module's business, and CI's absence of portal/node_modules cannot touch it.
//
// Two pure reads over a ledger sit beside the applier — `parentCandidates` and `auditParenting`
// (#341) — because the refusal, the prompt and the gate must all answer "who could this decision's
// parent be?" identically.
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
      if (p.question_id !== null) {
        const prior = state.ops.findLast((r) => r.op === "record_decision" && r.params.question_id === p.question_id);
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
