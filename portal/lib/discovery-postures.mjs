// portal/lib/discovery-postures.mjs — a posture is a prompt (epic #279, ticket #284;
// docs/epics/discovery-partner.prd.md MVP 6 — the agent judges FORM, never substance).
//
// Two postures ship: Think on claude-sonnet-5 (the spine's, and the one group 32's fixture was
// recorded under) and Think on Opus — the SAME buildThinkTurn prompt under claude-opus-5, so sonnet and
// opus can be compared on one answer set. The model string is the whole difference: on Opus 5 thinking
// is adaptive and on by default, and the fixed budget (budget_tokens; the SDK's maxThinkingTokens is
// that shape) is removed and returns 400, so no per-posture SDK option exists here. #286 adds Grill and
// Create-PRD and the existing-PRD audit entry mode. Nothing shipped reads this file — it is build-time
// only, reached from portal/lib/discovery.mjs and portal/lib/discovery-transport.mjs.
//
// Pure strings. STATICALLY SDK-FREE AND ZOD-FREE: tooling/build-checks.mjs group 30 imports this
// module and runs in CI with no portal/node_modules, so an SDK import here takes that job down. The
// one Node built-in it reaches (node:crypto, for the fingerprint) is not a dependency.
//
// The five constants below are exported SEPARATELY rather than written inline in the template,
// because spike 2's decision rule has a branch that reads "tighten to an explicit yield contract in
// the posture prompt and re-run". Keeping each in one exported place makes that tightening a one-line
// diff the gate notices (group 30 case 16 pins all five as appearing verbatim in the built prompt),
// rather than an edit buried in a template literal where nothing can see it.
//
// ORDER INSIDE THE SYSTEM PROMPT IS LOAD-BEARING. PARENT_RULE is LAST because the last instruction is
// the one a model is most likely to act on, and #341 bought that tail with a paid recording.
// EVIDENCE_RULE (#338 F6) was therefore inserted BEFORE it, not appended after it.
//
// Two things #341 added, and why they are here rather than in the transport: the LEDGER BRIEF —
// this run's decisions by rung and the parent candidates per rung — goes into the TURN prompt, so a
// parent is a lookup over what the run holds rather than a recollection across a resumed session
// (the rehearsal filed null on 18 of 18 eligible decisions because the ledger was never in front of
// it); and the TOOL DESCRIPTIONS, which are prompt text the agent reads at call time and so belong
// with the other prompt text, where group 30 can pin them and the FINGERPRINT can cover them.

import { createHash } from 'node:crypto';
import { LEVELS, OPS, PARAMS, parentCandidates } from '../../discovery/ops.mjs';

// The thing spike 2 tests. If a run comes back dirty — the agent asked a second question, filed two
// closing ops on one turn, or filed nothing — this string is what gets tightened, and only this string.
export const YIELD_CONTRACT = `Judge this one answer. Push back at most once, in prose. File at most one closing op. Then stop: no further tool call, no further question, no summary of what comes next.`;

// MVP 6, BOTH halves. The first half without the second is a critic; the second without the first is a
// transcriber. The pair is the whole claim the epic rests on.
export const MVP6_LINE = `You may say what the answer does not name — no number, no user, no alternative, no time, no cost. You may NOT say the answer is wrong, and you may NOT supply what is missing. The person's judgement is theirs; the form of their answer is yours.`;

// The BABOK ladder in order, one line each, so `level` is a choice rather than a guess. The enum
// enforces membership and says nothing about correct choice (spike 1's schema refusal).
export const LADDER_BRIEF = `business — what the organisation wants and why, with no parent above it.
stakeholder — what a particular person or role can do, sitting under a business decision.
solution — what the thing must do or hold to, functional or non-functional, sitting under a stakeholder decision.
transition — how the organisation gets from today to that solution, sitting under a solution decision.`;

// The parent rule as an INSTRUCTION, not a permission (#341). The paragraph it replaced said "if no
// such decision exists yet, pass null", and the rehearsal read that as standing permission: 18 of 18
// eligible decisions filed null. This names where the parent comes from (the turn prompt's candidate
// line), when null is allowed (only when that line says none), and what to do on a refusal (re-file
// with a seq from the line). Pinned verbatim by group 30 case 16; a tightening is a one-line diff.
export const PARENT_RULE = `A business decision has no parent (parent_id null). Every other decision names a parent: the seq of the decision ONE RUNG ABOVE it that it serves — stakeholder under business, solution under stakeholder, transition under solution. parent_id is not "a related decision": a decision at the same rung is a sibling and is refused. The turn prompt lists this run's decisions by rung and the parent candidates for the rung you are filing at — read the parent from that list; do not recall it. Pass null ONLY when that list says the rung above holds nothing yet; it records with an "orphan" flag, which is honest. If a filing is refused naming the rung, re-file once with a seq from that rung's candidate line, or null if the line says none.`;

// The evidence trigger (#338 F6). Over 30 substantive answers the rehearsal filed ZERO file_evidence
// ops, so every decision it recorded rendered under the projection's "Decisions resting on no
// evidence" line. The applier was never the obstacle — file_evidence has taken a `ref` naming a
// stored answer since #281 — and neither was the vocabulary, which the system prompt lists. What was
// missing is the TRIGGER: nothing told the agent that an answer naming a document is a file_evidence
// call. Exported and pinned by group 30 case 16 for the reason the header gives — a load-bearing
// prompt string lives in one place, so a tightening is a one-line diff the gate notices.
export const EVIDENCE_RULE = `When the answer NAMES something that could be checked — a document, a spreadsheet, a thread, a ticket, a dashboard, a recording, a report, a number someone measured — file it with file_evidence BEFORE your closing op. file_evidence does not close the turn and may be called more than once. Pass url when the answer gives a link; otherwise pass ref naming the stored answer that describes it, and claim_ref null. An answer that names no such thing files no evidence — do not invent one, and do not ask for one.`;

const opVocabulary = () => OPS.map((op) => `- ${op}(${PARAMS[op].join(', ')})`).join('\n');

// The ledger as the agent must see it before it files (#341): every decision so far by rung, then
// the parent candidates per rung. Rendered into the TURN prompt and never the system prompt — the
// system prompt is byte-stable across a session so its cache holds; the ledger changes every turn.
// A decision is named by its seq and its question_id (an off-script one says so), which is what a
// seq needs to be recognisable; the substance stays in the resumed session. Pure over the applier's
// records, reading exactly two fields — params.level and params.question_id — and FINGERPRINT_INPUTS'
// synthetic ledger carries exactly those, so widen both or neither. The candidate line is
// parentCandidates', so it can never disagree with the applier's refusal.
export function ledgerBrief(ops) {
  if (!Array.isArray(ops)) throw new Error("discovery-postures: ledgerBrief needs the ledger's records array");
  const decisions = ops.filter((r) => r?.op === 'record_decision');
  if (decisions.length === 0)
    return 'Decisions in this run so far: none. A stakeholder, solution or transition decision filed now has no parent candidate — pass parent_id null.';
  const byRung = LEVELS.map((level) => {
    const at = decisions.filter((r) => r.params.level === level);
    return `${level}: ${at.length ? at.map((r) => `seq ${r.seq} (${r.params.question_id ?? 'off-script'})`).join(' · ') : 'none'}`;
  });
  const candidates = LEVELS.slice(1).map((level) => {
    const c = parentCandidates(ops, level);
    const above = LEVELS[LEVELS.indexOf(level) - 1];
    return `filing at ${level} → parent_id ${c.length ? `one of ${c.join(', ')}` : `null (no ${above} decision yet)`}`;
  });
  return `Decisions in this run so far, by rung:\n${byRung.join('\n')}\n\nParent candidates:\n${candidates.join('\n')}`;
}

// The tool descriptions the agent reads at call time — prompt text, so they live here with the rest
// of the prompt text rather than in the transport (#341): group 30 case 18 pins them and the
// fingerprint below covers them. Keyed by op; the transport reads TOOL_DESCRIPTIONS[op] when it
// builds the server. record_decision's says where parent_id comes from; the other three are #284's,
// moved verbatim.
export const TOOL_DESCRIPTIONS = Object.freeze({
  record_decision: 'File one decision the person has made, BY REFERENCE. answer_ref names a stored answer and the tool resolves it — there is no parameter for answer text. Closes the turn when off_script is false. parent_id is the seq of the decision one rung above, taken from the turn prompt\'s "Parent candidates" line; null only when that line says none.',
  flag_weak_answer: 'Record that an answer lacks the form the question asks for. "missing" names what the form lacks, never what the right answer would be. answer_ref names a stored answer; there is no parameter for answer text. Closes the turn.',
  open_question: 'Record that the question is not answerable yet. answer_ref names the stored answer that says so; there is no parameter for answer text. Closes the turn when source is "banked".',
  file_evidence: 'File a piece of evidence — exactly one of url or ref (ref names a stored answer). Never closes the turn, and may be called more than once.',
});

const SYSTEM = `You are the discovery partner inside a local workbench. You are handed ONE banked
question, ONE person's answer to it, and that question's own weak-answer note. Your job is to judge
whether the answer has the FORM the question asks for, and to record what you heard.

${MVP6_LINE}

${YIELD_CONTRACT}

The op vocabulary — every one of these is a tool call, and one tool call files one op:

${opVocabulary()}

What closes a turn: record_decision when off_script is false; flag_weak_answer always; open_question
when source is banked. file_evidence never closes. Exactly one closing op per turn, so choose:

- The answer has the form the question asks for → record_decision.
- The answer is thin against the weak-answer note → flag_weak_answer, with "missing" naming what the
  form lacks, never what the right answer would be.
- The answer says the person does not know yet → open_question with source banked.

THERE IS NO PARAMETER FOR ANSWER TEXT ON ANY TOOL. You name a stored answer by its reference — the
tool resolves it against the answer store, which only the server writes. A reference you invent does
not resolve and the call is refused. This is deliberate: it is what stops you putting words in the
person's mouth.

The ladder a decision's "level" names, in order:

${LADDER_BRIEF}

${EVIDENCE_RULE}

${PARENT_RULE}

"wrong_if" states what would make the decision wrong. It is a condition someone could later observe,
not a hedge.

British English. Address the person directly. No preamble, no restating their answer back to them, no
encouragement.`;

// Throws rather than producing a prompt with "undefined" in it: a prompt built from a broken question
// or a broken answer would spend real tokens producing an unreadable turn.
function need(value, what) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`discovery-postures: ${what} is required (got ${JSON.stringify(value)})`);
  return value;
}

// The ledger is a REQUIRED argument ([] on the first turn) and it lands in the TURN prompt, never the
// system prompt: the system prompt stays byte-stable across the session so its cache holds, and the
// ledger changes every turn. A caller that forgets it must fail loudly rather than quietly regress to
// the rehearsal's behaviour, where parenting was a recollection (#341).
export function buildThinkTurn({ question, answer, turn, ledger }) {
  if (!question || typeof question !== 'object') throw new Error('discovery-postures: a question entry is required');
  if (!answer || typeof answer !== 'object') throw new Error('discovery-postures: an answer record is required');
  need(question.id, 'question.id');
  need(question.text, 'question.text');
  need(question.weakAnswer, 'question.weakAnswer');
  need(answer.ref, 'answer.ref');
  need(answer.text, 'answer.text');
  need(turn, 'turn');
  if (!Array.isArray(ledger)) throw new Error('discovery-postures: ledger must be the run\'s op records array ([] on the first turn) — a turn prompt built without it makes parenting a recollection again (#341)');

  // The weak-answer note goes to the AGENT and never to the person — it is the rubric, and showing it
  // beside the question would tell them the answer. portal/lib/discovery.mjs strips it from what the
  // config route serves, so the browser cannot receive it at all.
  //
  // The closing line ends on the parent (recency — the last instruction is the one a model is most
  // likely to act on), and it points back at the brief above rather than restating it.
  const prompt = `Turn ${turn}.

The question (stage ${question.stage}, ${question.attribution}):
${question.text}

What a weak answer to this question looks like:
${question.weakAnswer}

The person's answer, stored as ${answer.ref}:
${answer.text}

${ledgerBrief(ledger)}

Judge it, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`;

  return { systemPrompt: SYSTEM, prompt };
}

// What the agent READS, hashed, so a recording can say which prompt it was made under (#341).
// Built over FIXED synthetic inputs — a question object that is not in the bank, one answer, a
// three-rung ledger — so the hash moves when the system prompt, the turn template, the brief's
// format, a tool description or the model moves, and for nothing else (a bank edit must not move
// it). It is the PROMPT SURFACE, not everything the agent reads: the tool input schemas (TOOL_SCHEMA
// in discovery.mjs — pinned by group 30 to PARAMS/LEVELS/SOURCES/PROVENANCE, so they move only under
// the op-verb lock; and discovery.mjs imports this module, so hashing them here would be a cycle
// with TOOL_SCHEMA in TDZ when POSTURES computes), the fence's deny text (denyReason,
// discovery.mjs's) and the SDK's own preset sit OUTSIDE it — an edit to one of those does not make the
// fixture stale by name. So would any per-posture SDK option: today a posture is exactly id, label,
// model, build and fingerprint (group 30 pins that key set), and the two postures differ by model
// alone, which IS hashed; a posture that grows an option (an effort level, a thinking setting) must
// widen the join below in the same edit, or that option's edits never move a stamp. Group 32
// compares the committed fixture's per-turn fingerprint to this one:
// a prompt edit makes the recording stale BY NAME rather than leaving a green gate over a run the
// current prompt never produced. Exported frozen so group 30 case 19 can prove the hash is computed
// over exactly these inputs.
export const FINGERPRINT_INPUTS = Object.freeze({
  question: Object.freeze({ id: 'fp-question', stage: 0, attribution: 'FIXED', text: 'A fixed question for the fingerprint.', weakAnswer: 'A fixed weak-answer note.' }),
  answer: Object.freeze({ ref: 'fp1', text: 'A fixed answer.' }),
  turn: 'fp',
  ledger: Object.freeze([
    Object.freeze({ seq: 1, op: 'record_decision', params: Object.freeze({ level: 'business', question_id: 'fp-b' }) }),
    Object.freeze({ seq: 2, op: 'record_decision', params: Object.freeze({ level: 'stakeholder', question_id: 'fp-s' }) }),
    Object.freeze({ seq: 3, op: 'record_decision', params: Object.freeze({ level: 'solution', question_id: null }) }),
  ]),
});
export function fingerprintOf({ build, model }) {
  const { systemPrompt, prompt } = build(FINGERPRINT_INPUTS);
  return createHash('md5').update([model, systemPrompt, prompt, JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')).digest('hex');
}

// THINK_MODEL stays where the fixture was recorded: moving it moves POSTURES.think.fingerprint and
// makes group 32's parenting fixture stale for no reason. The Opus comparison is a SECOND posture.
const THINK_MODEL = 'claude-sonnet-5';
const THINK_OPUS_MODEL = 'claude-opus-5';

export const POSTURES = Object.freeze({
  think: Object.freeze({
    id: 'think',
    label: 'Think',
    model: THINK_MODEL,
    build: buildThinkTurn,
    // The prompt-surface fingerprint the transport stamps on every turnStats entry (#341).
    fingerprint: fingerprintOf({ build: buildThinkTurn, model: THINK_MODEL }),
  }),
  // The same prompt under Opus 5. The drawer renders `${label} (${model})`, so the label carries no
  // model string of its own. No thinking budget: see the header.
  'think-opus': Object.freeze({
    id: 'think-opus',
    label: 'Think on Opus',
    model: THINK_OPUS_MODEL,
    build: buildThinkTurn,
    fingerprint: fingerprintOf({ build: buildThinkTurn, model: THINK_OPUS_MODEL }),
  }),
});
