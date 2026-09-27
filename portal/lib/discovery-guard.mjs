// The answer-box guard — a pre-submit check on the discovery drawer's answer box (#454; lineage epic
// #279, docs/epics/discovery-partner.architecture.md; the off-script controls it routes to are #289's).
//
// Run 1 (discovery/faster-payment, 2026-09-13) typed five look-ups into the ANSWER box instead of the
// off-script box. Four answer lines (a3, a5, a10, a23) hold "Look it up: … Answer: …"; a banked turn
// advertises no tools, so no search ran, and nothing said so. This module asks Jev (TypeSafe's System
// One classifier, ./jev.mjs) two yes/no questions about one answer before it is submitted, and the
// drawer offers the person the off-script path when the answer reads like one. JEV ROUTES, CLAUDE DOES
// THE WORK: the verdict only picks which existing control the person is offered.
//
// FOUR INVARIANTS a future editor must keep:
//
//   1. IT WRITES NOTHING. No run-package file, no log. The route has no write path, and build-checks
//      group 44.7 compares the tracked tree before and after driving it.
//   2. IT FAILS OPEN. Any Jev failure — no key, a timeout, a 4xx/5xx, a model mismatch, a missing field
//      — returns verdict "answer", which is exactly the submit the drawer made before #454. The
//      REFUSALS (a bad slug, a missing package, an audit, an unknown question, empty text) throw
//      instead, before any call, and the drawer fails open on the resulting non-2xx too.
//   3. ONLY THE QUESTION'S TEXT LEAVES THE MACHINE. The bank's `note`/`weakAnswer` is the agent's
//      rubric, which discoveryConfig() already strips from the browser; sending it to a third party
//      would be worse. State is { question, answer } — one answer, never the package.
//   4. THE VERDICT IS ADVICE; THE PERSON'S CLICK IS THE RECORD. `intent` on an off-script line stays
//      the person's declaration (assertAffordance, discovery.mjs); Jev never sets it.
//
// ON FOR BOTH PROVENANCES (owner, 2026-09-27, Q1). A real run's answer does go to TypeSafe, but it is
// one answer and the banked question, never the package, and the person sees the result before
// anything is recorded.
//
// THE THRESHOLDS. T_LOOK_UP and T_ASIDE are chosen by the rule in tooling/jev-guard-eval.mjs (plan
// D3), pre-registered and amended once by the owner after run 1 (O1), never tuned until a wanted
// answer comes out, and they mean something only against jev-1.13.0 and the committed
// tooling/jev-guard/eval-run.json. Build-checks group 44 recomputes the recall, false-prompt and
// prompt counts below from it; the gap figures, the named aside refs and the latency are the eval's
// printout, not re-derived by the gate. decide() THROWS on a null look-up threshold, so a module
// without them fails open rather than prompting on a guess. T_ASIDE === null stops decide() acting on
// the aside score, but the aside question is still sent and its noul still required.
//
// Measured 2026-09-27 on jev-1.13.0, n = 4 positives (run 1's faster-payment a3, a5, a10, a23) and 160
// deduplicated negatives (every other banked answer line):
//   T_LOOK_UP = 0.6 — D3 as amended by the owner: the sets separate (highest negative 0.27, lowest
//     positive 0.95), so T is the grid point nearest the gap's midpoint (0.61). Look-up recall 4/4,
//     false-prompt 0/160. With n = 4, recall moves in 25% steps, so this is coarse, and all four
//     positives open "Look it up:"; a look-up phrased another way is unmeasured, which is why the margin
//     sits in the middle of the gap rather than just under the positives.
//   T_ASIDE = 0.35 — the lowest grid T keeping the combined prompt count within 4/160 (3%). Combined
//     prompt 4/160, all four from aside (graded-opus-a a13, a22, a65; later-not-never-1 a24), and all
//     four are misfires: each is an on-topic answer to its own question, read by eye. Aside recall is
//     unmeasured: there are no labelled asides. Shipped anyway (owner, 2026-09-27): a misfire costs one
//     "Send as my answer" click.
//   Latency over 164 calls: p50 250 ms, p95 295 ms, 0 over the drawer's 1500 ms cap.
//   Jev's scores are not bit-stable across runs: an earlier run of the same eval put the highest
//     negative at 0.31 and a different fourth aside prompt. The committed run is the one these numbers
//     come from, and group 44 recomputes its counts from it.
import { assertProvenanceRoot, readRun, resolveRunRoot } from './discovery.mjs';
import { AFFORDANCES } from './discovery-postures.mjs';
import { questionById } from '../../discovery/bank.mjs';
import { askJev } from './jev.mjs';

const bad = (msg) => { throw new Error(`discovery-guard: ${msg}`); };

// The two verdicts other than "answer" ARE the two off-script intents, so the drawer can hand the
// verdict straight to offScriptControl. A rename there reddens here, at import.
for (const v of ['look-up', 'aside']) if (!AFFORDANCES.includes(v)) bad(`verdict "${v}" is not one of AFFORDANCES (${AFFORDANCES.join(' · ')})`);

// The "even if an answer is also present" clause is load-bearing: all four run-1 positives are MIXED
// ("Look it up: … Answer: …"), and a criterion reading "rather than the person's own answer" scores
// them no.
export const QUESTIONS = Object.freeze({
  look_up: Object.freeze({
    type: 'noul',
    instructions: "Does `answer` contain a request for information to be found, searched or checked (for example 'look up X', 'find figures on Y', 'what does the research say about Z'), instead of, or as well as, the person's own answer to `question`?",
    criteria: Object.freeze({
      true: 'It asks for something to be looked up, searched, found or checked, even if an answer to `question` is also present in the same text.',
      false: "It is the person's own answer. Citing, quoting or summarising something they already found, or saying they still need to find something out themselves, is not a request.",
    }),
  }),
  aside: Object.freeze({
    type: 'noul',
    instructions: 'Is `answer` about something other than `question`, raised beside it?',
    criteria: Object.freeze({
      true: 'Most of it addresses a different topic from `question`: a concern, a new idea or a question for the interviewer.',
      false: 'It addresses `question`, even briefly, vaguely or badly.',
    }),
  }),
});

// The one state builder the route and the eval share, so the two cannot drift.
export const stateFor = ({ question, answer }) => ({ question, answer });

export const T_LOOK_UP = 0.6;
export const T_ASIDE = 0.35;

const inUnit = (t) => typeof t === 'number' && t > 0 && t < 1;

export function decide(answers, { lookUp = T_LOOK_UP, aside = T_ASIDE } = {}) {
  if (!inUnit(lookUp)) bad(`the look_up threshold is ${lookUp} — it must be a number in (0,1), set from tooling/jev-guard-eval.mjs's run`);
  if (aside !== null && !inUnit(aside)) bad(`the aside threshold is ${aside} — it must be a number in (0,1), or null to disable the aside question`);
  for (const id of ['look_up', 'aside']) if (!Number.isFinite(answers?.[id]?.noul)) bad(`Jev answered no ${id} noul`);
  if (answers.look_up.noul >= lookUp) return 'look-up';
  if (aside !== null && answers.aside.noul >= aside) return 'aside';
  return 'answer';
}

export async function checkAnswer({ slug, provenance, questionId, text }, { ask = askJev } = {}) {
  // The refusals throw, before any call: the same resolveRunRoot + assertProvenanceRoot pair every
  // discovery route runs.
  const root = resolveRunRoot({ provenance, slug });
  assertProvenanceRoot(provenance, root);
  // readRun returns null rather than throwing, so a real-provenance slug with no directory would
  // otherwise reach Jev.
  const head = readRun(root);
  if (!head) bad(`no run.json under ${root} — there is no session to guard`);
  if ((head.entryMode ?? 'blank-idea') === 'existing-prd') bad('an existing-prd audit has no answer box, so there is nothing to guard (#454 Design 5)');
  const q = questionById(questionId);
  if (!q) bad(`question "${questionId}" is not in the bank`);
  if (typeof text !== 'string') bad(`the answer is a ${typeof text}, not a string`);
  if (!text.trim()) bad('an empty answer has nothing to check');

  const t0 = performance.now();
  try {
    const r = await ask({ state: stateFor({ question: q.text, answer: text }), questions: QUESTIONS });
    return { verdict: decide(r.answers), lookUp: r.answers.look_up.noul, aside: r.answers.aside.noul, ms: Math.round(performance.now() - t0), failOpen: null };
  } catch (e) {
    return { verdict: 'answer', lookUp: null, aside: null, ms: Math.round(performance.now() - t0), failOpen: e.message };
  }
}
