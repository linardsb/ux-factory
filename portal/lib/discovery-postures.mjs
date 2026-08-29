// portal/lib/discovery-postures.mjs — a posture is a prompt (epic #279, ticket #284;
// docs/epics/discovery-partner.prd.md MVP 6 — the agent judges FORM, never substance).
//
// One posture ships in the spine: Think. #286 adds Grill and Create-PRD and the existing-PRD audit
// entry mode. Nothing shipped reads this file — it is build-time only, reached from
// portal/lib/discovery.mjs and portal/lib/discovery-transport.mjs.
//
// Pure strings. STATICALLY SDK-FREE AND ZOD-FREE: tooling/build-checks.mjs group 30 imports this
// module and runs in CI with no portal/node_modules, so an SDK import here takes that job down.
//
// The three constants below are exported SEPARATELY rather than written inline in the template,
// because spike 2's decision rule has a branch that reads "tighten to an explicit yield contract in
// the posture prompt and re-run". Keeping each in one exported place makes that tightening a one-line
// diff the gate notices (group 30 case 16 pins all three as appearing verbatim in the built prompt),
// rather than an edit buried in a template literal where nothing can see it.

import { OPS, PARAMS } from '../../discovery/ops.mjs';

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

const opVocabulary = () => OPS.map((op) => `- ${op}(${PARAMS[op].join(', ')})`).join('\n');

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

A business decision has no parent (parent_id null). Anything below it names a parent one rung above,
by the seq of an earlier decision in this run. If no such decision exists yet, pass null — it records
with an "orphan" flag, which is honest, rather than inventing a parent.

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

export function buildThinkTurn({ question, answer, turn }) {
  if (!question || typeof question !== 'object') throw new Error('discovery-postures: a question entry is required');
  if (!answer || typeof answer !== 'object') throw new Error('discovery-postures: an answer record is required');
  need(question.id, 'question.id');
  need(question.text, 'question.text');
  need(question.weakAnswer, 'question.weakAnswer');
  need(answer.ref, 'answer.ref');
  need(answer.text, 'answer.text');
  need(turn, 'turn');

  // The weak-answer note goes to the AGENT and never to the person — it is the rubric, and showing it
  // beside the question would tell them the answer. portal/lib/discovery.mjs strips it from what the
  // config route serves, so the browser cannot receive it at all.
  const prompt = `Turn ${turn}.

The question (stage ${question.stage}, ${question.attribution}):
${question.text}

What a weak answer to this question looks like:
${question.weakAnswer}

The person's answer, stored as ${answer.ref}:
${answer.text}

Judge it, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}".`;

  return { systemPrompt: SYSTEM, prompt };
}

export const POSTURES = Object.freeze({
  think: Object.freeze({
    id: 'think',
    label: 'Think',
    model: 'claude-sonnet-5',
    build: buildThinkTurn,
  }),
});
