// portal/lib/discovery-postures.mjs — a posture is a prompt (epic #279, tickets #284, #286;
// docs/epics/discovery-partner.prd.md MVP 6 — the agent judges FORM, never substance; MVP 1 — three
// stances on one product; MVP 2 — an existing PRD starts at Grill, as an audit).
//
// THREE POSTURES, FOUR ENTRIES IN POSTURES. Think on claude-sonnet-5 (the spine's, and the one group
// 32's fixture was recorded under); Think on Opus — the SAME buildThinkTurn prompt under claude-opus-5,
// so sonnet and opus can be compared on one answer set (the model string is the whole difference: on
// Opus 5 thinking is adaptive and on by default, and the fixed budget (budget_tokens; the SDK's
// maxThinkingTokens is that shape) is removed and returns 400, so no per-posture SDK option exists
// here); Create PRD — the interview posture that judges an answer against the PRD section it will
// render into, reading the projection's own SECTIONS table so "which section does this feed" cannot
// drift from discovery/prd-projection.mjs; and Grill — the adversarial posture, the weak-answer note
// run as a checklist. Think and Create PRD are pinned to claude-sonnet-5 (architecture §Boundaries:
// "Model is a per-posture call, not one setting"); Grill's model is deliberately open there, so it is
// a FIELD with a default and a per-run override — MODELS lists what a run may name, MODEL_SETTABLE
// lists which postures take an override, and resolvePosture({ posture, model }) returns the posture
// itself on its own model or a five-key copy with a RECOMPUTED fingerprint on an override. run.json
// records the effective model; the transport stamps the resolved fingerprint.
//
// THE AUDIT MODE (entryMode 'existing-prd', #286). Grill has a second template: the person supplies a
// document at session start, the server stores it ONCE, verbatim, as the run's one kind: "document"
// answer line, and every audit turn judges that document against one banked question, filing one of
// the four existing verbs (AUDIT_VERDICT_RULE names the mapping; no fifth verb, so the op-verb lock is
// not taken). The document sits in the SYSTEM prompt, early, before every rule: it is per-session, so
// the prompt stays byte-stable across the session and its cache holds; it is ONE copy rather than
// thirty turn prompts; and PARENT_RULE keeps the recency tail #341 paid for. The turn prompt names the
// document's ref and never carries its text (group 30 case 32 pins both halves). Think and Create PRD
// refuse an existing-prd build by name. An audit never holds a question for a second ask — that rule
// is the session module's RE_ASKS table, not a prompt.
//
// THINK'S STRINGS ARE BYTE-STABLE; GROUPS 32 AND 33 ARE THE TRIPWIRE. Five recordings carry Think's
// two stamps on every turnStats entry and three of them are gate-compared live, so buildThinkTurn's
// output, systemFor, TOOL_DESCRIPTIONS and FINGERPRINT_INPUTS did not change by one byte for #286.
// Of the two additions the new postures carry, JUDGEMENT_RULE (Run 0's F9) still does NOT reach Think;
// reaskBrief (#366) now does, and reaches it WITHOUT moving either stamp, because the ledger
// FINGERPRINT_INPUTS holds no flag_weak_answer, so the branch is unreachable from the hash
// (the FINGERPRINT_INPUTS block below records that exclusion and names its guard).
// A Think edit is a ticket that re-records those fixtures. Nothing shipped reads this
// file — it is build-time only, reached from portal/lib/discovery.mjs and
// portal/lib/discovery-transport.mjs.
//
// Pure strings. STATICALLY SDK-FREE AND ZOD-FREE: tooling/build-checks.mjs group 30 imports this
// module and runs in CI with no portal/node_modules, so an SDK import here takes that job down. The
// Node built-in it reaches (node:crypto, for the fingerprint) is not a dependency, and
// discovery/prd-projection.mjs (for SECTIONS) imports only node built-ins, bank.mjs and ops.mjs.
//
// The rule constants below are exported SEPARATELY rather than written inline in the template,
// because spike 2's decision rule has a branch that reads "tighten to an explicit yield contract in
// the posture prompt and re-run". Keeping each in one exported place makes that tightening a one-line
// diff the gate notices (group 30 case 16 pins Think's six verbatim; cases 30–32 pin the two new
// postures'), rather than an edit buried in a template literal where nothing can see it.
//
// ORDER INSIDE THE SYSTEM PROMPT IS LOAD-BEARING. PARENT_RULE is LAST because the last instruction is
// the one a model is most likely to act on, and #341 bought that tail with a paid recording.
// EVIDENCE_RULE (#338 F6) was therefore inserted BEFORE it, not appended after it, and PROVENANCE_RULE
// (#347) before EVIDENCE_RULE, which it qualifies. The new postures' stance text and the audit's
// document block go BEFORE the shared block for the same reason, never after PARENT_RULE.
//
// THE RUN'S PROVENANCE IS IN THE SYSTEM PROMPT (#347, the #338 F8 half). It is a session-start choice
// written to run.json, and until #347 it reached neither prompt — so the re-recorded fixture filed all
// four of its evidence rows as "real-interview" on a fictional run, the strongest honest label an agent
// that cannot see which run it is in can give. It goes in the SYSTEM prompt because both are per
// session: the prompt stays byte-stable across the session and its cache holds. It is a build INPUT,
// so FINGERPRINT_INPUTS carries one — 'fictional' — and the hash covers THAT rule's text. It does not
// cover PROVENANCE_RULE.real's, which no fixed input set selects (see the BRANCH paragraph below).
//
// Two things #341 added, and why they are here rather than in the transport: the LEDGER BRIEF —
// this run's decisions by rung and the parent candidates per rung — goes into the TURN prompt, so a
// parent is a lookup over what the run holds rather than a recollection across a resumed session
// (the rehearsal filed null on 18 of 18 eligible decisions because the ledger was never in front of
// it); and the TOOL DESCRIPTIONS, which are prompt text the agent reads at call time and so belong
// with the other prompt text, where group 30 can pin them and the FINGERPRINT can cover them.
//
// THE FINGERPRINT COVERS EVERY TEMPLATE A POSTURE HAS (#286) — per TEMPLATE, not per BRANCH.
// fingerprintOf hashes one build per input set in FINGERPRINT_INPUTS_FOR[posture] (absent: the one
// set, FINGERPRINT_INPUTS); Grill's covers the interview AND the audit template, so an edit to either
// moves its stamp. A template BRANCH the fixed inputs never take sits outside the hash by
// construction, and there are FOUR of them today, not one (PR #381 F2 — the earlier form of this
// sentence claimed the re-ask brief alone, and a mutation of PROVENANCE_RULE.real's text left all four
// stamps unmoved with a green gate, which is the same hole #366 was written to close; the fourth
// arrived with #289 and is named below, which is this list's own rule applied to the merge that
// brought it):
//   · the RE-ASK BRIEF, on all four postures — FINGERPRINT_INPUTS' ledger holds no flag_weak_answer.
//     #366 left it outside deliberately rather than by oversight (the FINGERPRINT_INPUTS block states
//     the reason and the bill), and its guard is case 31's VERBATIM pin on the produced string.
//   · PROVENANCE_RULE.real, on all four AND in the audit template, which the re-ask branch never
//     reaches — every fixed input set pins provenance: 'fictional'. Guarded by two REGEXES (case 16),
//     not verbatim: an includes(PROVENANCE_RULE.real) assertion compares the prompt against the edited
//     constant and so can never see an edit to it. Widening that to a verbatim pin is its own ticket.
//   · ledgerBrief's EMPTY-LEDGER form — every fixed ledger carries three decisions. Two regexes
//     (case 17), same shape.
//   · ledgerBrief's EVIDENCE LINE in its RENDERED form (#289) — the other direction of the same
//     function. Every fixed set spreads FINGERPRINT_INPUTS' ledger, which holds no file_evidence, so
//     the line renders for no stamp: outside all four POSTURES stamps AND all four
//     AFFORDANCE_FINGERPRINT values. Guarded by case 30.51's three includes() assertions, not a
//     verbatim pin, and its url / name / ref fallback arms are covered only on the url arm. Widening
//     that is #384's ticket, beside PROVENANCE_RULE.real's — the same shape, the same gap.
// A NEW branch belongs on this list with its guard named, or it is unguarded and nothing says so.
// Over one input set the join is byte-identical to the pre-#286 form, which is what keeps Think's
// two stamps where the recordings have them (group 30 case 30 pins the literal).

import { createHash } from 'node:crypto';
import { auditExchanges, LEVELS, OPS, PARAMS, parentCandidates } from '../../discovery/ops.mjs';
// The projection's OWN section table, so Create PRD's section brief follows the page rather than
// restating it (#286). prd-projection.mjs imports node built-ins, bank.mjs and ops.mjs only, and its
// CLI guard compares import.meta.url to argv[1], so importing it here runs nothing.
import { LATER_QUESTIONS, METRIC_STAGE, NON_GOAL_QUESTIONS, SECTIONS } from '../../discovery/prd-projection.mjs';

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
export const EVIDENCE_RULE = `When the answer NAMES something that could be checked — a document, a spreadsheet, a thread, a ticket, a dashboard, a recording, a report, a number someone measured — file it with file_evidence BEFORE your closing op. file_evidence does not close the turn and may be called more than once. Pass url when the answer gives a link; otherwise pass ref naming the stored answer that describes it. When the thing has an identity of its own — a named spreadsheet, a particular thread, a report someone could fetch — pass name with a short label for it, beside the ref and never with a url; otherwise pass name null. Pass claim_ref null. An answer that names no such thing files no evidence — do not invent one, and do not ask for one.`;

// --- the three affordances (#289; PRD MVP 7, 8, 9) ------------------------------------------------
//
// EVERY STRING BELOW EXCEPT DOMAIN_RULE RIDES THE **TURN** PROMPT, CONDITIONALLY, and that is not a
// style choice. FIVE recordings carry Think's two stamps — four on think, one on think-opus, one of the
// five 65 turns (graded-think-a) and the think-opus one 65 too — so moving systemFor
// makes them stale for text a banked turn never reads; the system prompt is byte-stable across a
// session so its SDK cache holds (run 0's cache read grew 3.8k → 125k over thirty turns), and a
// different system prompt on one mid-session turn is a cache-creation event every time it fires. The
// honesty gap that leaves — no posture stamp covers this text — is closed by AFFORDANCE_FINGERPRINT
// below, its own stamp over its own frozen inputs, recorded beside postureFingerprint on the turns
// that used it.
//
// Exported separately, like EVIDENCE_RULE and for the same reason: a tightening is a one-line diff the
// gate notices rather than an edit buried in a template literal.

// The person's declared intent on an off-script turn. Two controls, never one classifier: the person
// says which they are doing, so MVP 7's evidence path and MVP 9's filing rule pin separately in the
// RECORD. A single "ask" box asking the agent to infer intent would make a failed look-up and a failed
// aside the same event. It lives here because the two values ARE the two rule strings below;
// portal/lib/discovery.mjs re-exports it rather than keeping a second copy (that module imports this
// one, so the dependency only runs one way).
export const AFFORDANCES = Object.freeze(['look-up', 'aside']);

// MVP 8 — PARK IT. Blocking on an unanswerable question is never available, so the park CLOSES the
// turn and the cursor moves. The person's reason is the answer, stored verbatim; the agent files the
// op and authors nothing but the `reason` field, which restates why in the person's own terms.
export const PARK_RULE = `The person is PARKING this question: they cannot answer it yet and have given their reason. File open_question with source "banked", question_id this question, answer_ref their stored answer, and reason stating why it is not answerable yet — in their terms, not yours. That closes the turn and the session moves on. Do not record a decision, do not flag the answer weak, and do not ask them to try again: blocking on an unanswerable question is not available here.`;

// MVP 7 — LOOK IT UP. The turn does NOT close: the person's own answer still does. "File nothing at
// all" when nothing usable was found is a CORRECT outcome here, which is why the applier's closer
// guard is scoped to intent "aside" and never fires on a look-up.
export const LOOK_IT_UP_RULE = `The person has asked you to look something up, or has pasted a source. Search or fetch, then say in prose what you found and give the URL of every source you used. For each source you actually used, file file_evidence with url set to that URL, ref null, name null, provenance "secondary-source" and claim_ref null. You may quote or summarise a source, attributed to it. YOU MAY NOT ANSWER THE QUESTION ON THE TABLE — quoting a source is not a finding, and the person writes their own answer. File no closing op: this turn does not close, and the question stays on the table. If you found nothing usable, say so and file nothing.`;

// MVP 9 — THE ESCAPE HATCH. Dropping the exchange is never available, and the applier enforces it: a
// turn cannot be closed while an aside on it has no filing (ops.mjs invariant 4). Exactly one of the
// two forms, because one off-script answer settling as both is refused too.
export const ESCAPE_HATCH_RULE = `The person has said something the question on the table did not ask for. Answer them, then FILE THE EXCHANGE — dropping it is never available. If the exchange ends in them making a choice, file record_decision with off_script true, the same wrong_if condition and evidence_refs a banked decision would carry, and question_id naming the banked question it touched, or null when it touched none. Otherwise file open_question with source "off-script", the same question_id rule, and a reason saying what is still open. Exactly one of the two. Neither closes the turn: the question on the table is still unanswered and the cursor does not move.`;

// MVP 10's domain rule. The one string that also goes into a SYSTEM prompt — Create PRD's, and only
// Create PRD's. Grill's was the plan's second target and is not taken: discovery/partner-audit-1 is a
// committed Grill recording carrying that posture's stamp, so moving it would make a package stale for
// text its turns never read, which is the cost this whole design exists to avoid. Nothing on disk runs
// create-prd (verified over all eight packages), so that one move is free. Think and Grill reach the
// rule through the affordance turn prompt only — the same gap JUDGEMENT_RULE already carries for
// Think, carried the same way and named rather than hidden. reaskBrief was the second half of that
// pairing until #366: it now reaches Think through the ORDINARY turn prompt's one conditional slot
// (the header above says so), so JUDGEMENT_RULE is the only string Think still never sees.
export const DOMAIN_RULE = `The product may be invented; the domain is not. A claim that is checkable and public — that a scheme exists, that a regulation applies, that a payment cannot be recalled — must carry a file_evidence row with a URL and provenance "secondary-source", and looking it up is how it gets one. A claim about the SHAPE of this product — what it should do, who it is for, what it is worth — carries provenance "assumption" beside a wrong_if condition, and that is the expected result. Filing a checkable public fact as an assumption is a failure.`;

// Which kind of run the agent is sitting in (#347). Keyed by the run's provenance as run.json records
// it — the two roots of discovery/README.md R1 — and rendered into the system prompt by that key.
// Each value says what the four evidence labels mean IN THIS RUN, because the label the agent picks
// for "the person told me this" depends on it and nothing else in the prompt says which it is.
export const PROVENANCE_RULE = Object.freeze({
  fictional: `This run's provenance is FICTIONAL: the product and every answer in this session are a fictional scenario, and the package says so. Evidence the person gives you from the session — a document, a thread, a number they measured — is filed with provenance "fictional-scenario", never "real-interview". A link to a real published source is "secondary-source"; something the person believes but has not checked is "assumption".`,
  real: `This run's provenance is REAL: the product is real and the person answering is its owner. Evidence the person gives you from the session — a document, a thread, a number they measured — is filed with provenance "real-interview". A link to a published source is "secondary-source"; something the person believes but has not checked is "assumption"; "fictional-scenario" is never true in this run.`,
});

// The judgement in prose BEFORE the op (Run 0's F9 — .claude/reports/discovery-run-0-338-report.md).
// Run 0's transcripts held turns that were one tool call and no words: the verdict was filed, but WHY
// was nowhere a reader could check MVP 6 against. For the two postures #286 adds ONLY — Think's
// prompt surface is stamped on five recordings, so Think waits for a ticket that re-records (the
// header). Pinned verbatim by group 30 case 31.
export const JUDGEMENT_RULE = `Before any tool call, write your judgement as prose: one to three sentences saying what the answer names and what its form lacks, quoting the words you are judging. A turn with no judgement in prose is dirty, the same as a turn with two closing ops.`;

// Create PRD's stance (#286, MVP 1). The interview posture that judges INTO the artefact: a decision
// renders in exactly one PRD section, and a decision that section cannot hold is one the PRD will not
// carry. The section list is sectionBrief() below, derived from the projection's own table.
export const CREATE_PRD_STANCE = `You are interviewing INTO AN ARTEFACT. Every decision you file renders into exactly one section of the PRD projected from this run, and nothing else reaches that page — a decision the section cannot hold is a decision the PRD will not carry. Judge the answer against what its section needs, and say in your judgement which section it feeds before you file.`;

// Grill's stance (#286, MVP 1). The weak-answer note as a CHECKLIST, every missing element named, a
// contradiction with the ledger named by seq. Both halves of MVP 6 still hold — it may not say the
// answer is wrong and may not supply what it lacks — and the stance says so in its own last sentence,
// because a posture told to attack is the one most likely to forget it.
export const GRILL_STANCE = `You are GRILLING. Run the weak-answer note as a checklist against the answer and name every element it lacks — a number, a user, an alternative, a time, a cost, a checkable source, a wrong-if condition — and any contradiction with a decision already in this run's ledger, naming that decision's seq. An answer survives only when nothing on that list is missing. You still may not say it is wrong, and you still may not supply what it lacks.`;

// The audit's four verdicts and the four EXISTING verbs they file as (#286 D2; MVP 2's "which banked
// questions does this document already answer, which does it dodge, which of its decisions carry no
// evidence link and no wrong-if line"). No fifth verb: "unevidenced" is record_decision with
// evidence_refs [] — the applier records it flagged no-evidence, the honest state — and "absent" is
// the grammar's own open_question. Pinned verbatim by group 30 case 32, which also asserts it names
// all four verbs and all four verdicts.
export const AUDIT_VERDICT_RULE = `The document is the answer to every question in this session. For THIS question reach ONE verdict and file it. ANSWERED — the document states a decision on it, gives a wrong-if condition of its own, and names something checkable behind it: file_evidence for each checkable thing (url for a link; ref naming the document with a name for a named artefact), then record_decision with evidence_refs naming those rows. UNEVIDENCED — it states a decision with a wrong-if condition of its own but names nothing checkable: record_decision with evidence_refs [] — it records flagged, which is honest. DODGED — it touches the question but lacks the form: no number, no user, no alternative, no wrong-if condition, or two places that contradict each other: flag_weak_answer, with missing naming each thing the form lacks and quoting both places when it contradicts itself. ABSENT — it does not address the question at all: open_question with source banked and a reason saying so.`;

// The wrong_if on an audited decision is the DOCUMENT'S OWN condition (#286 D2). The audit exists to
// report which decisions carry no wrong-if line, and an agent that writes one erases the finding — so
// a decision with no wrong-if is DODGED, not answered. --probe-audit classifies each filed wrong_if as
// QUOTED / PARAPHRASED / AUTHORED against the document text; AUTHORED means this is the string to
// tighten and re-probe (at most three paid attempts, the proposer's protocol).
export const AUDIT_WRONG_IF_RULE = `wrong_if on an audited decision is the document's OWN condition — quoted, or closely paraphrased from the place the document states it. Never write one the document does not state: a decision with no wrong-if condition is DODGED, not answered.`;

const opVocabulary = () => OPS.map((op) => `- ${op}(${PARAMS[op].join(', ')})`).join('\n');

// The ledger as the agent must see it before it files (#341): every decision so far by rung, then
// the parent candidates per rung. Rendered into the TURN prompt and never the system prompt — the
// system prompt is byte-stable across a session so its cache holds; the ledger changes every turn.
// A decision is named by its seq and its question_id (an off-script one says so), which is what a
// seq needs to be recognisable; the substance stays in the resumed session. Pure over the applier's
// records. The candidate line is parentCandidates', so it can never disagree with the applier's refusal.
//
// #289 widened it to read params.provenance, params.url and params.name off file_evidence records too,
// and the evidence line RENDERS NOTHING — not an empty heading, not "none" — when the ledger holds no
// evidence row. That absence is load-bearing rather than tidy: FINGERPRINT_INPUTS' synthetic ledger
// holds three record_decision records and NO file_evidence, so an absent-when-empty line leaves every
// fingerprint input's output byte-identical and all four stamps unmoved. An "Evidence filed in this
// run: none" line would move all four. Why it is worth having at all: without it a later banked turn
// can only name a look-it-up evidence seq FROM RECOLLECTION ACROSS A RESUMED SESSION — the exact
// failure #341 paid a recording to discover, one rung over.
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
  return `Decisions in this run so far, by rung:\n${byRung.join('\n')}\n\nParent candidates:\n${candidates.join('\n')}${evidenceLine(ops)}`;
}

// The evidence rows this run holds, so a banked decision's evidence_refs is a LOOKUP rather than a
// recollection (#289). '' when there are none — see ledgerBrief's comment for why that is the rule
// every stamp rests on.
function evidenceLine(ops) {
  const rows = ops.filter((r) => r?.op === 'file_evidence');
  if (!rows.length) return '';
  const one = (r) => `seq ${r.seq} (${r.params?.provenance ?? '?'}, ${r.params?.url ?? r.params?.name ?? `answer ${r.params?.ref ?? '?'}`})`;
  return `\n\nEvidence filed in this run: ${rows.map(one).join(' · ')}`;
}

// THE UNFILED ASIDES on this run, in the person's own words (#289). '' when there are none, so a build
// without one is byte-identical — reaskBrief's rule exactly.
//
// This is what makes the applier's closer guard COMPLIABLE rather than merely enforceable. Under
// tools: [] the agent has no route to answers.jsonl, so after a server restart it would otherwise have
// to author a `reason` for an exchange it cannot read — the mirror-direction failure the honesty
// contract forbids. The person's own text is already what a turn prompt carries (answer.text), so this
// is existing practice rather than a new class of input. The PREDICATE is auditExchanges', imported
// rather than re-spelled: the prompt and the applier must agree on which exchange is unfiled.
export function pendingBrief(answers, ops) {
  if (!Array.isArray(ops)) throw new Error("discovery-postures: pendingBrief needs the ledger's records array");
  const unfiled = auditExchanges(answers, ops).unfiled;
  if (!unfiled.length) return '';
  const rows = unfiled.map((a) => `${a.ref}${a.turn ? ` (turn ${a.turn})` : ''}: ${a.text ?? ''}`);
  return `Off-script exchanges on this run that you have not filed yet — each needs ONE of record_decision with off_script true, or open_question with source "off-script", naming its ref. Neither closes a turn, and a turn cannot be closed while one of these is unfiled:\n${rows.join('\n')}`;
}

// The re-ask brief (#366). On a held question's second ask the FIRST flag's `missing` list goes into
// the TURN prompt, so the agent judges the new answer against what it said was lacking rather than
// flagging afresh for something the answer now names. All three INTERVIEW builds carry it —
// buildThinkTurn (so think and think-opus both), buildCreatePrdTurn and Grill's interview branch; the
// audit never does, because a document cannot answer twice (RE_ASKS, discovery.mjs). Pure over the
// ledger's records, reading params.question_id and params.missing and never answer text; '' when the
// question was never flagged, so a first ask is byte-identical to a build without it — that is what
// keeps all five stamps where the recordings have them. This string sits OUTSIDE every posture
// fingerprint: the ledger fingerprintOf hashes carries no flag_weak_answer, so the branch is
// unreachable from the hash and an edit here moves nothing. Group 30 case 31 pins the produced string
// VERBATIM, and that pin is the only thing that makes an edit to this template go red.
export function reaskBrief(ops, questionId) {
  if (!Array.isArray(ops)) throw new Error("discovery-postures: reaskBrief needs the ledger's records array");
  const first = ops.find((r) => r?.op === 'flag_weak_answer' && r.params?.question_id === questionId);
  if (!first) return '';
  const missing = Array.isArray(first.params.missing) ? first.params.missing.join(' · ') : String(first.params.missing ?? '');
  return `This is the second ask of this question. Your earlier flag (seq ${first.seq}) said the answer lacked: ${missing}. Judge the NEW answer against that list; do not repeat the flag for something it now names.`;
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
  file_evidence: 'File a piece of evidence — exactly one of url or ref (ref names a stored answer). name is a short label for an artefact with an identity of its own, passed beside a ref and never with a url; null otherwise. Never closes the turn, and may be called more than once.',
});

const systemFor = (provenance) => `You are the discovery partner inside a local workbench. You are handed ONE banked
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

${PROVENANCE_RULE[provenance]}

${EVIDENCE_RULE}

${PARENT_RULE}

"wrong_if" states what would make the decision wrong. It is a condition someone could later observe,
not a hedge.

British English. Address the person directly. No preamble, no restating their answer back to them, no
encouragement.`;

// A park's closing line, shared by all four postures (#289). New text, so one copy is the right number
// — unlike interviewHead, which is Think's byte-stable surface COPIED rather than shared.
const parkClose = (question, answer) => `File open_question with source "banked", question_id "${question.id}" and answer_ref "${answer.ref}", with a reason stating in the person's own terms why this is not answerable yet. That is the only op this turn takes.`;

// The three affordance guards every builder runs, in one place so all four refuse identically (#289).
// `affordance` fires on a value no existing caller passes, which is the #286 precedent: every existing
// input still builds byte-identical output. `park` and `affordance` together are refused because they
// are two different turns — a park CLOSES the question on the table, an off-script turn deliberately
// does not — and an audit refuses both, because a document is the answer to every question and there
// is no person answering (RE_ASKS is the precedent).
function affordanceGuards({ park, affordance, entryMode }) {
  if (park !== true && park !== false) throw new Error(`discovery-postures: park must be true or false (got ${JSON.stringify(park)})`);
  if (affordance !== null && !AFFORDANCES.includes(affordance))
    throw new Error(`discovery-postures: affordance "${affordance}" is not one of ${AFFORDANCES.join(' · ')} (null means an ordinary banked turn)`);
  if (park && affordance !== null)
    throw new Error(`discovery-postures: park and affordance "${affordance}" cannot both be set — a park closes the question on the table and an off-script turn deliberately does not`);
  if (entryMode === 'existing-prd' && (park || affordance !== null))
    throw new Error(`discovery-postures: ${park ? 'park' : `affordance "${affordance}"`} is not available in an existing-prd audit — the document is the answer to every question, so there is no person to park or to go off-script (MVP 2)`);
}

// THE OFF-SCRIPT TURN PROMPT, one body all four postures share (#289). It is COPIED from the interview
// head rather than sharing a helper with buildThinkTurn, for the reason interviewHead's own comment
// gives: Think's lines are its byte-stable surface and a refactor through one helper would be a Think
// edit wearing a tidy-up.
//
// The banked question is named as CONTEXT, still unanswered, and its weak-answer note is deliberately
// ABSENT — the note is the rubric for judging an answer, and on a turn with no answer to judge it is
// noise the agent may act on. It ends on the ledger brief and the parent line, which is the recency
// tail #341 paid a recording for.
const affordanceTurn = ({ question, answer, turn, ledger, answers, affordance }) => {
  const pending = pendingBrief(answers, ledger);
  return `Turn ${turn}. Off-script — the question below is NOT being answered here.

The question on the table (stage ${question.stage}, ${question.attribution}), still unanswered:
${question.text}

What the person has said instead, stored as ${answer.ref}:
${answer.text}

${affordance === 'look-up' ? LOOK_IT_UP_RULE : ESCAPE_HATCH_RULE}

${DOMAIN_RULE}

${ledgerBrief(ledger)}
${pending ? `\n${pending}\n` : ''}
Nothing you file here closes the turn, and the cursor does not move: "${question.id}" is still the question on the table and the person answers it themselves. If you file a record_decision below business, take parent_id from the "Parent candidates" line above.`;
};

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
export function buildThinkTurn({ question, answer, turn, ledger, provenance, entryMode = 'blank-idea', answers = [], park = false, affordance = null }) {
  if (!question || typeof question !== 'object') throw new Error('discovery-postures: a question entry is required');
  // #286: the one refusal Think gained. It fires on a value no existing caller passes, so every
  // existing input still builds byte-identical output (group 30 case 30 pins the stamp).
  if (entryMode === 'existing-prd') throw new Error('discovery-postures: Think is an interview posture — an existing-prd session starts at Grill (MVP 2)');
  if (!Object.hasOwn(PROVENANCE_RULE, provenance)) throw new Error(`discovery-postures: provenance must be one of ${Object.keys(PROVENANCE_RULE).join(' · ')} (got ${JSON.stringify(provenance)}) — the run's provenance is a prompt input, so the agent knows which evidence label is true here (#347)`);
  if (!answer || typeof answer !== 'object') throw new Error('discovery-postures: an answer record is required');
  need(question.id, 'question.id');
  need(question.text, 'question.text');
  need(question.weakAnswer, 'question.weakAnswer');
  need(answer.ref, 'answer.ref');
  need(answer.text, 'answer.text');
  need(turn, 'turn');
  if (!Array.isArray(ledger)) throw new Error('discovery-postures: ledger must be the run\'s op records array ([] on the first turn) — a turn prompt built without it makes parenting a recollection again (#341)');
  affordanceGuards({ park, affordance, entryMode });
  if (affordance !== null) return { systemPrompt: systemFor(provenance), prompt: affordanceTurn({ question, answer, turn, ledger, answers, affordance }) };

  // The weak-answer note goes to the AGENT and never to the person — it is the rubric, and showing it
  // beside the question would tell them the answer. portal/lib/discovery.mjs strips it from what the
  // config route serves, so the browser cannot receive it at all.
  //
  // The closing line ends on the parent (recency — the last instruction is the one a model is most
  // likely to act on), and it points back at the brief above rather than restating it.
  // The ONE conditional slot uses reaskBrief's exact idiom, `${x ? `\n${x}\n` : ''}` on its own line,
  // which REPLACES the blank line that was there rather than adding one: with every part empty the
  // template emits today's bytes exactly, which is what keeps all four stamps where the recordings
  // have them (group 30 case 43 asserts the four builds directly, so the failure names the builder
  // not the hash). #366's RE-ASK BRIEF JOINS THIS SLOT rather than taking a second one: two slot lines
  // where the template had one blank line emit an EXTRA newline when both are empty, which moves every
  // Think stamp — which is the whole point of the idiom. This is the same three-element array #289
  // already wrote for buildCreatePrdTurn and buildGrillTurn; Think was the one builder left out.
  const extra = [reaskBrief(ledger, question.id), pendingBrief(answers, ledger), park ? PARK_RULE : ''].filter(Boolean).join('\n\n');
  const prompt = `Turn ${turn}.

The question (stage ${question.stage}, ${question.attribution}):
${question.text}

What a weak answer to this question looks like:
${question.weakAnswer}

The person's answer, stored as ${answer.ref}:
${answer.text}

${ledgerBrief(ledger)}
${extra ? `\n${extra}\n` : ''}
${park ? parkClose(question, answer) : `Judge it, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`}`;

  return { systemPrompt: systemFor(provenance), prompt };
}

// --- the two #286 postures ------------------------------------------------------------------------

// Where a decision renders, DERIVED from the projection's own table rather than written here: a
// hand-written "business → Problem" list would be a second copy that drifts the day a heading is
// renamed. One line per ladder row, then the three cross-references the page draws from the same
// records. Group 30 case 31 asserts every ladder row is on it.
export function sectionBrief() {
  const ladder = SECTIONS.filter((row) => row.axis === 'ladder').map((row) => `- ${row.from} → ${row.heading}`);
  return [
    'Where a decision renders in the PRD projected from this run:',
    ...ladder,
    `- a decision on a stage ${METRIC_STAGE} question → also Success metrics, and every decision's wrong_if is a kill criterion there`,
    `- a decision on ${NON_GOAL_QUESTIONS.join(' or ')} → also Non-goals`,
    `- a decision on ${LATER_QUESTIONS.join(' or ')} → also Later, not never (parked for a later version — never Non-goals)`,
    '- every business or stakeholder wrong_if → Hypothesis',
  ].join('\n');
}

// The op vocabulary, the closing rule and the answer-by-reference paragraph as the two #286 postures
// carry them — COPIED from systemFor above and never shared with it: systemFor is Think's byte-stable
// surface, and a refactor through one helper would be a Think edit wearing a tidy-up. One function
// for the two new templates, so they cannot drift from each other.
const sharedVocabulary = () => `The op vocabulary — every one of these is a tool call, and one tool call files one op:

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
person's mouth.`;

// The shared tail of every system prompt — the ladder, the run's provenance, the evidence trigger and
// the parent rule, in the order the header calls load-bearing. PARENT_RULE is last in it, and nothing
// the two builders append after it is a rule.
const sharedTail = (provenance) => `The ladder a decision's "level" names, in order:

${LADDER_BRIEF}

${PROVENANCE_RULE[provenance]}

${EVIDENCE_RULE}

${PARENT_RULE}`;

const WRONG_IF_LINE = `"wrong_if" states what would make the decision wrong. It is a condition someone could later observe,
not a hedge.`;
const INTERVIEW_CLOSE = `British English. Address the person directly. No preamble, no restating their answer back to them, no
encouragement.`;

// Think's guards, as the two new builders run them — the same checks in the same order, in a helper
// Think itself does not call (its own copy is part of its byte-stable surface).
function commonGuards({ question, answer, turn, ledger, provenance }) {
  if (!question || typeof question !== 'object') throw new Error('discovery-postures: a question entry is required');
  if (!Object.hasOwn(PROVENANCE_RULE, provenance)) throw new Error(`discovery-postures: provenance must be one of ${Object.keys(PROVENANCE_RULE).join(' · ')} (got ${JSON.stringify(provenance)}) — the run's provenance is a prompt input, so the agent knows which evidence label is true here (#347)`);
  if (!answer || typeof answer !== 'object') throw new Error('discovery-postures: an answer record is required');
  need(question.id, 'question.id');
  need(question.text, 'question.text');
  need(question.weakAnswer, 'question.weakAnswer');
  need(answer.ref, 'answer.ref');
  need(answer.text, 'answer.text');
  need(turn, 'turn');
  if (!Array.isArray(ledger)) throw new Error('discovery-postures: ledger must be the run\'s op records array ([] on the first turn) — a turn prompt built without it makes parenting a recollection again (#341)');
}

// The interview turn prompt's head — Think's lines, shared by the two new builders (Think keeps its
// own copy inline for the reason commonGuards gives).
const interviewHead = ({ question, answer, turn }) => `Turn ${turn}.

The question (stage ${question.stage}, ${question.attribution}):
${question.text}

What a weak answer to this question looks like:
${question.weakAnswer}

The person's answer, stored as ${answer.ref}:
${answer.text}`;

// CREATE PRD (#286). Interview only: an existing-prd session starts at Grill (MVP 2), and a stored
// document is not a person's answer. The system prompt puts the stance and the section brief before
// the shared block; the turn prompt asks for the section in prose, carries the re-ask brief on a
// second ask, and still ends on the parent (recency).
export function buildCreatePrdTurn({ question, answer, turn, ledger, provenance, entryMode = 'blank-idea', answers = [], park = false, affordance = null }) {
  commonGuards({ question, answer, turn, ledger, provenance });
  affordanceGuards({ park, affordance, entryMode });
  if (entryMode === 'existing-prd') throw new Error('discovery-postures: Create PRD is an interview posture — an existing-prd session starts at Grill (MVP 2)');
  if (entryMode !== 'blank-idea') throw new Error(`discovery-postures: entryMode must be blank-idea for Create PRD (got ${JSON.stringify(entryMode)})`);
  if (answer.kind === 'document') throw new Error("discovery-postures: Create PRD judges a person's answer, not a stored document — a document is an existing-prd session's, and that session starts at Grill (MVP 2)");
  const systemPrompt = `You are the discovery partner inside a local workbench. You are handed ONE banked
question, ONE person's answer to it, and that question's own weak-answer note. Your job is to judge
whether the answer has the FORM its PRD section asks for, and to record what you heard.

${CREATE_PRD_STANCE}

${sectionBrief()}

${MVP6_LINE}

${JUDGEMENT_RULE}

${YIELD_CONTRACT}

${sharedVocabulary()}

${DOMAIN_RULE}

${sharedTail(provenance)}

${WRONG_IF_LINE}

${INTERVIEW_CLOSE}`;
  if (affordance !== null) return { systemPrompt, prompt: affordanceTurn({ question, answer, turn, ledger, answers, affordance }) };
  const extra = [reaskBrief(ledger, question.id), pendingBrief(answers, ledger), park ? PARK_RULE : ''].filter(Boolean).join('\n\n');
  const prompt = `${interviewHead({ question, answer, turn })}

${ledgerBrief(ledger)}
${extra ? `\n${extra}\n` : ''}
${park ? parkClose(question, answer) : `Say in prose which section this feeds, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`}`;
  return { systemPrompt, prompt };
}

// GRILL (#286): the interview template on a blank idea, the AUDIT template on an existing PRD. In the
// audit the answer record IS the stored document — the server wrote it once at session start
// (discovery.mjs appendDocument) — and its text goes into the SYSTEM prompt between the two fences,
// before the stance and every rule, for the reasons the header gives; the turn prompt names its ref
// and never carries its text. The wrong answer kind is refused in both directions, so a document can
// never be judged as a person's answer, and a person's answer can never be audited as if it were one.
export function buildGrillTurn({ question, answer, turn, ledger, provenance, entryMode = 'blank-idea', answers = [], park = false, affordance = null }) {
  commonGuards({ question, answer, turn, ledger, provenance });
  affordanceGuards({ park, affordance, entryMode });
  if (entryMode !== 'blank-idea' && entryMode !== 'existing-prd') throw new Error(`discovery-postures: entryMode must be blank-idea or existing-prd (got ${JSON.stringify(entryMode)})`);
  const audit = entryMode === 'existing-prd';
  if (audit && answer.kind !== 'document') throw new Error(`discovery-postures: an audit turn's answer is the stored document (kind "document") — got kind ${JSON.stringify(answer.kind)}; an existing-prd session is opened with its document and every turn judges that one record`);
  if (!audit && answer.kind === 'document') throw new Error("discovery-postures: a Grill interview judges a person's answer, not a stored document — a document is an existing-prd session's");

  if (!audit) {
    const systemPrompt = `You are the discovery partner inside a local workbench. You are handed ONE banked
question, ONE person's answer to it, and that question's own weak-answer note. Your job is to attack
the FORM of the answer, and to record what you heard.

${GRILL_STANCE}

${MVP6_LINE}

${JUDGEMENT_RULE}

${YIELD_CONTRACT}

${sharedVocabulary()}

${sharedTail(provenance)}

${WRONG_IF_LINE}

${INTERVIEW_CLOSE}`;
    if (affordance !== null) return { systemPrompt, prompt: affordanceTurn({ question, answer, turn, ledger, answers, affordance }) };
    const extra = [reaskBrief(ledger, question.id), pendingBrief(answers, ledger), park ? PARK_RULE : ''].filter(Boolean).join('\n\n');
    const prompt = `${interviewHead({ question, answer, turn })}

${ledgerBrief(ledger)}
${extra ? `\n${extra}\n` : ''}
${park ? parkClose(question, answer) : `Judge it, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`}`;
    return { systemPrompt, prompt };
  }

  const systemPrompt = `You are the discovery partner inside a local workbench, in AUDIT mode. You are handed ONE document — a
PRD someone wrote before this session — and, one turn at a time, ONE banked question with its own
weak-answer note. Your job is to judge whether the DOCUMENT answers that question with the FORM the
question asks for, and to record what it holds.

The document, stored as ${answer.ref} in the answer store — every op you file names it:
<<<DOCUMENT
${answer.text}
DOCUMENT>>>

${GRILL_STANCE}

${MVP6_LINE}

${JUDGEMENT_RULE}

${YIELD_CONTRACT}

${AUDIT_VERDICT_RULE}

${AUDIT_WRONG_IF_RULE}

${sharedVocabulary()}

${sharedTail(provenance)}

British English. No preamble, no restating the document back, no encouragement.`;
  // THE DOCUMENT TEXT APPEARS NOWHERE BELOW — the turn prompt points at the system prompt by ref.
  const prompt = `Turn ${turn}. Audit.

The question (stage ${question.stage}, ${question.attribution}):
${question.text}

What a weak answer to this question looks like:
${question.weakAnswer}

The document is in your system prompt, stored as ${answer.ref}. Find where it addresses this question, quote the place in your judgement, and reach one verdict.

${ledgerBrief(ledger)}

File your one closing op against question_id "${question.id}" and answer_ref "${answer.ref}" — file_evidence first for anything checkable the document names ON THIS QUESTION — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`;
  return { systemPrompt, prompt };
}

// What the agent READS, hashed, so a recording can say which prompt it was made under (#341).
// Built over FIXED synthetic inputs — a question object that is not in the bank, one answer, a
// three-rung ledger, the fictional provenance — so the hash moves when the system prompt (either
// provenance's rule text: both are in the module, one is rendered, and the real one is asserted by
// group 30 rather than hashed), the turn template, the brief's format, a tool description or the
// model moves, and for nothing else (a bank edit must not move it). It is the PROMPT SURFACE, not everything the agent reads: the tool input schemas (TOOL_SCHEMA
// in discovery.mjs — pinned by group 30 to PARAMS/LEVELS/SOURCES/PROVENANCE, so they move only under
// the op-verb lock; and discovery.mjs imports this module, so hashing them here would be a cycle
// with TOOL_SCHEMA in TDZ when POSTURES computes), the fence's deny text (denyReason,
// discovery.mjs's) and the SDK's own preset sit OUTSIDE it — an edit to one of those does not make the
// fixture stale by name. A FOURTH thing sits outside it, and for a different reason (#366): the turn
// templates' RE-ASK BRANCH. Those three are outside STRUCTURALLY — a cycle, another module, the SDK's
// own — but the re-ask brief is outside because the fixed ledger below holds three record_decision
// rows and no flag_weak_answer, so reaskBrief returns '' every time this hash is computed. It is LEFT
// outside deliberately: no committed recording has ever taken a second ask on any posture (whole-bank
// is not in discovery.mjs's LADDER, so graded-think-a and graded-opus-a could not have taken one even
// in principle), so hashing the branch would declare at least 142 paid turns stale over prompts that
// genuinely did not change — 142 is the gate-compared three; bracket-trace-1 and -2 carry the same stamp
// and would go stale with no group saying so (PR #381 F3). Its guard is instead group 30 case 31's
// VERBATIM pin on the produced brief, plus the two pins that make widening the hash a named failure
// rather than an accident — one on this ledger
// holding no flag, one on FINGERPRINT_INPUTS_FOR's key set. Both name the bill. Fold the branch in
// here the day a recording takes a second ask; the re-record is paid at that point, not before.
// So would any per-posture SDK option: today a posture is exactly id, label,
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
  provenance: 'fictional',
  ledger: Object.freeze([
    Object.freeze({ seq: 1, op: 'record_decision', params: Object.freeze({ level: 'business', question_id: 'fp-b' }) }),
    Object.freeze({ seq: 2, op: 'record_decision', params: Object.freeze({ level: 'stakeholder', question_id: 'fp-s' }) }),
    Object.freeze({ seq: 3, op: 'record_decision', params: Object.freeze({ level: 'solution', question_id: null }) }),
  ]),
});
// A SECOND fixed input set, for the audit template (#286): the same fixed question, ledger and
// provenance, an existing-prd entry and a synthetic document the bank cannot touch. Frozen at every
// level, like the first.
export const AUDIT_FINGERPRINT_INPUTS = Object.freeze({
  ...FINGERPRINT_INPUTS,
  entryMode: 'existing-prd',
  answer: Object.freeze({ ref: 'fp-doc', kind: 'document', text: 'A fixed document for the fingerprint.' }),
});
// THREE MORE FIXED INPUT SETS, for #289's affordance surface — one park, one aside, one look-up. They
// are NOT in FINGERPRINT_INPUTS_FOR and must never be: that map is what fingerprintOf reads when
// computing a POSTURE's stamp, and widening it there moves POSTURES.think.fingerprint and makes six
// recordings stale, two of them 65 turns. The affordance surface gets its OWN stamp
// (AFFORDANCE_FINGERPRINT, below POSTURES) because a banked turn's prompt is genuinely byte-identical —
// that statement is true, and this design is what keeps it true.
//
// THREE SETS, NOT TWO: the shared off-script body branches on the intent (LOOK_IT_UP_RULE against
// ESCAPE_HATCH_RULE), so a two-set stamp would leave one of the two rule strings covered by nothing —
// exactly the uncovered-prompt-text gap this stamp exists to close.
//
// The off-script answer is SYNTHETIC and frozen at every level, for FINGERPRINT_INPUTS.answer.text's
// own reason: an input set is a permanent committed literal, and one seeded from anything resembling a
// real answer would bake a person's words into the module forever. pendingBrief renders the person's
// verbatim text at RUN time, which is existing practice; the fixture never does. It is unfiled against
// FINGERPRINT_INPUTS' ledger (three record_decision records, none off_script), so pendingBrief's own
// output is inside the hash — and pendingBrief is the one string here that could be retuned toward
// judging substance ("the person chose, so file a decision"), which is the server making MVP 6's call
// through the agent's mouth. Left uncovered, that edit would land with every stamp still green.
const AFFORDANCE_ANSWER = Object.freeze({ ref: 'fp-os', kind: 'off-script', intent: 'aside', turn: 'fp', text: 'A fixed off-script remark.' });
const LOOKUP_ANSWER = Object.freeze({ ref: 'fp-lu', kind: 'off-script', intent: 'look-up', turn: 'fp', text: 'A fixed look-it-up request.' });
export const PARK_FINGERPRINT_INPUTS = Object.freeze({ ...FINGERPRINT_INPUTS, park: true, answers: Object.freeze([AFFORDANCE_ANSWER]) });
export const AFFORDANCE_FINGERPRINT_INPUTS = Object.freeze({ ...FINGERPRINT_INPUTS, affordance: 'aside', answer: AFFORDANCE_ANSWER, answers: Object.freeze([AFFORDANCE_ANSWER]) });
export const LOOKUP_FINGERPRINT_INPUTS = Object.freeze({ ...FINGERPRINT_INPUTS, affordance: 'look-up', answer: LOOKUP_ANSWER, answers: Object.freeze([AFFORDANCE_ANSWER, LOOKUP_ANSWER]) });
export const AFFORDANCE_INPUT_SETS = Object.freeze([PARK_FINGERPRINT_INPUTS, AFFORDANCE_FINGERPRINT_INPUTS, LOOKUP_FINGERPRINT_INPUTS]);

// Which input sets a posture's fingerprint covers (#286). Absent means the one set, FINGERPRINT_INPUTS.
// Grill has two templates, so its stamp moves when either moves.
export const FINGERPRINT_INPUTS_FOR = Object.freeze({
  grill: Object.freeze([FINGERPRINT_INPUTS, AUDIT_FINGERPRINT_INPUTS]),
});
// One build per input set, joined in order: over the one-set default this is byte-identical to the
// pre-#286 join (group 30 case 30 pins Think's literal), and over Grill's two sets it covers both templates.
export function fingerprintOf({ build, model, inputs = [FINGERPRINT_INPUTS] }) {
  const surface = inputs.flatMap((i) => { const b = build(i); return [b.systemPrompt, b.prompt]; });
  return createHash('md5').update([model, ...surface, JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')).digest('hex');
}

// The two house model strings — the ones every recorder and chat.mjs pin. What a run may name for a
// settable posture; resolvePosture refuses anything else by name (#286).
export const MODELS = Object.freeze(['claude-sonnet-5', 'claude-opus-5']);
// The postures whose model a run may override (architecture §Boundaries: Think and Create PRD are the
// house default on claude-sonnet-5; Grill's is "deliberately left open"). Think on Opus is its own
// posture, not an override.
export const MODEL_SETTABLE = Object.freeze(['grill']);

// THINK_MODEL stays where the fixture was recorded: moving it moves POSTURES.think.fingerprint and
// makes group 32's parenting fixture stale for no reason. The Opus comparison is a SECOND posture.
const THINK_MODEL = 'claude-sonnet-5';
const THINK_OPUS_MODEL = 'claude-opus-5';
// Pinned (AC #5; group 30 case 30 asserts both by name).
const CREATE_PRD_MODEL = 'claude-sonnet-5';
// A DEFAULT, not a pin: a run overrides it through resolvePosture and run.json records the result.
const GRILL_DEFAULT_MODEL = 'claude-sonnet-5';

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
  // #286. The same five keys as Think's — case 11 pins the key set on every entry, and resolvePosture's
  // override copy keeps it.
  'create-prd': Object.freeze({
    id: 'create-prd',
    label: 'Create PRD',
    model: CREATE_PRD_MODEL,
    build: buildCreatePrdTurn,
    fingerprint: fingerprintOf({ build: buildCreatePrdTurn, model: CREATE_PRD_MODEL }),
  }),
  grill: Object.freeze({
    id: 'grill',
    label: 'Grill',
    model: GRILL_DEFAULT_MODEL,
    build: buildGrillTurn,
    // Both templates — the interview and the audit — are inside this stamp.
    fingerprint: fingerprintOf({ build: buildGrillTurn, model: GRILL_DEFAULT_MODEL, inputs: FINGERPRINT_INPUTS_FOR.grill }),
  }),
});

// THE AFFORDANCE PROMPT SURFACE, STAMPED (#289). Its own hash over its own frozen inputs, recorded on
// run.json's turnStats beside the unmoved postureFingerprint, so a park or off-script turn says which
// surface it actually ran under.
//
// TAKEN OFF A RESOLVED POSTURE, never looked up by id, and that matters for exactly one posture:
// resolvePosture RECOMPUTES a stamp when a run overrides the model, fingerprintOf hashes the model, and
// Grill is the one MODEL_SETTABLE posture — so a by-id lookup would stamp a Grill-on-Opus turn with the
// sonnet hash, which is precisely the "a stamp naming a surface the turn did not run under" this whole
// design exists to prevent.
export const affordanceFingerprintOf = ({ build, model }) => fingerprintOf({ build, model, inputs: AFFORDANCE_INPUT_SETS });

// The same value per posture id, for the gate and for a reader — a MODULE CONSTANT, never a sixth key
// on a POSTURES entry (group 30 case 11's message forbids that by name: a per-posture option sits
// outside fingerprintOf's hash, so widen the hash or do not add it). Keyed by POSTURES' own keys, so a
// fifth posture shows up here as a missing key rather than as silence. It is a MAP and not one hash
// because the off-script TURN body is shared but the SYSTEM prompt is the posture's own, and
// DOMAIN_RULE sits in one of the four — so Think's and Create-PRD's genuinely differ.
export const AFFORDANCE_FINGERPRINT = Object.freeze(Object.fromEntries(
  Object.entries(POSTURES).map(([id, p]) => [id, affordanceFingerprintOf(p)]),
));

// The posture a run actually runs under (#286 D4). Its own object, by identity, when the model is its
// own (so a pre-#286 package resolves to exactly what it was recorded under); a frozen five-key copy
// with the model swapped and the fingerprint RECOMPUTED on an override — and an override is refused
// by name on any posture MODEL_SETTABLE does not list, and any model MODELS does not. The session
// module calls this at openSession (to record the model) and at every runTurn (to stamp the turn).
export function resolvePosture({ posture, model = null } = {}) {
  if (!Object.hasOwn(POSTURES, posture)) throw new Error(`discovery-postures: posture "${posture}" is not one of ${Object.keys(POSTURES).join(' · ')}`);
  const p = POSTURES[posture];
  const m = model ?? p.model;
  if (!MODELS.includes(m)) throw new Error(`discovery-postures: model "${m}" is not one of ${MODELS.join(' · ')} — a run names one of the house models or leaves the posture's own`);
  if (m !== p.model && !MODEL_SETTABLE.includes(posture))
    throw new Error(`discovery-postures: posture "${posture}" pins ${p.model} — Think and Create-PRD are the house default (architecture §Boundaries); Think on Opus is its own posture. Only ${MODEL_SETTABLE.join(' · ')} takes a per-run model (got "${m}")`);
  if (m === p.model) return p;
  return Object.freeze({ ...p, model: m, fingerprint: fingerprintOf({ build: p.build, model: m, inputs: FINGERPRINT_INPUTS_FOR[posture] }) });
}
