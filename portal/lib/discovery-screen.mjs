// The contradiction screen — a cheap machine pass in front of the Grill audit (#453; lineage epic
// #279, docs/epics/discovery-partner.architecture.md; the client is #454's ./jev.mjs).
//
// Run 2 (discovery/partner-audit-2, PR #406) found 0 of MVP 13's 8 findings: the audit judges the
// document against ONE banked question per turn, so two claims that contradict each other across
// sections never reach the agent together. This module splits the stored document into claims
// (discovery/claims.mjs) and asks Jev (TypeSafe's System One classifier) two stages of questions:
//   stage 1 — one Choice per claim: "which other claim cannot be true at the same time as this one?"
//             (the options are every other claim's id, plus `none`);
//   stage 2 — per candidate pair, `relation` (supports · contradicts · not_established) and
//             `same_subject` (a noul).
// The pairs that pass stage 2 are KEPT (at most K) and rendered into the audit's system prompt by
// discovery-postures.mjs's tensionsBlock. JEV SCREENS, CLAUDE JUDGES: a kept pair is evidence the
// agent weighs against the document, never a finding.
//
// FOUR INVARIANTS a future editor must keep:
//
//   1. ONLY THE DOCUMENT LEAVES THE MACHINE. State is the claims of the one stored document — never
//      the ledger, the bank's rubric, the rubric file or any other file.
//   2. SERVER-WRITTEN, ONCE. screen.jsonl is written by writeScreen and nothing else, in one write at
//      an audit's create, and refused if it exists: a resume reads the same lines, so the audit's
//      system prompt is byte-stable across the session, and a crash mid-screen leaves no partial file.
//   3. FAIL-VISIBLE. Any failure — no key, a 429, a timeout, a model mismatch, a missing answer —
//      writes exactly ONE `unavailable` line with the reason, and the audit opens without the block.
//      No retries here (the route must answer); tooling/jev-screen.mjs retries 429/529 on its own.
//   4. THE THRESHOLDS ARE PRE-REGISTERED AND LABEL-FREE (plan D3), fixed in this header before the
//      first paid call (the commit that adds docs/epics/fixtures/discovery-partner.screen-rubric.md
//      is the receipt), never derived from the rubric and never moved after a run. They mean
//      something only against jev-1.13.0.
//        T1 = 0     — every stage-1 pick other than `none` is a candidate. Stage 2 is the filter; a
//                     stage-1 threshold chosen by looking at which picks were true would be tuned
//                     towards the answer. PROVISO: if the candidates need more than
//                     STAGE2_MAX_REQUESTS stage-2 requests, T1 becomes the lowest value on the grid
//                     0.05…0.95 (step 0.05) that fits — computed by chooseT1, recorded as `t1` in the
//                     summary line.
//        T_SAME = 0.5 — same_subject.noul ≥ 0.5: the noul's own midpoint (the docs call Jev calibrated).
//        T2 = 0.5   — relation.probabilities.contradicts ≥ 0.5: a majority of the probability mass,
//                     not a plurality of three.
//        K = 10     — the ticket's start value. Kept = passes T_SAME and T2, ranked by contradicts
//                     descending, ties by `a` id then `b` id, the first K.
//      Batch size (REQUEST_TOKEN_BUDGET) changes the request count, never a question or a threshold;
//      its halving rule is the plan's Task 16b (R3). BUT THE ESTIMATOR IS NOT INDEPENDENT OF T1: the
//      proviso counts stage-2 requests through batches() and estTokens(). A request this estimator put
//      at 55,580 tokens was refused `400 max_tokens_exceeded` (2026-09-27, no answers), so chars/3 is
//      not conservative for option-heavy JSON. The divisor and REQUEST_TOKEN_BUDGET are therefore set
//      ONCE, from the smoke's observed usage.input_tokens (tooling/jev-screen.mjs --smoke), before the
//      first full run, and committed with the smoke's printout as the reason; the proviso reads
//      whatever estimator is committed at that run. Neither moves after it.
//
// NO LATENCY IN ANY LINE: a line is a pure function of the responses (plus `ts`), so build-checks
// 45.8 replays the committed real run and compares every line. The CLI times its own requests.
//
// IMPORTS: node built-ins, ./jev.mjs and discovery/claims.mjs ONLY (group 45.1). Never ./discovery.mjs
// — it imports this module, and the cycle would put these exports in their TDZ — and never the SDK or
// zod, because CI imports this with no portal/node_modules.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { askJev, JEV_MODEL } from './jev.mjs';
import { CLAIMS_VERSION, splitClaims } from '../../discovery/claims.mjs';

const bad = (msg) => { throw new Error(`discovery-screen: ${msg}`); };

export const SCREEN_TIMEOUT_MS = 60000;
export const T1 = 0, T_SAME = 0.5, T2 = 0.5, K = 10, STAGE2_MAX_REQUESTS = 3;
// Under the documented 64k per request and 32k for state + the longest question, with margin for
// the estimate below, which is calibrated once from the smoke (header, invariant 4); the CLI prints the
// observed usage beside it.
export const REQUEST_TOKEN_BUDGET = 56000;
export const STATE_PLUS_QUESTION_BUDGET = 30000;
// SET ONCE from the smoke (invariant 4), 2026-09-27, `node tooling/jev-screen.mjs <fixture> --smoke`:
//   calibration: 3 questions 12688 tok (est 12095) · 30 questions 38875 tok (est 26715) · per question
//   970 tok for 1653 chars (1.70 chars/token) · state 9778 tok for 30540 chars (3.12 chars/token)
//   latency rule: 490 ms × (55580 ÷ 12095) = 2252 ms projected vs 30000 ms → fits (budget unchanged)
// The worse ratio (1.70, the option-heavy question JSON) with ~12% margin: 1.5. It overestimates the
// prose state by 2×, which only costs requests. Not moved after the first full run.
export const CHARS_PER_TOKEN = 1.5;
export const estTokens = (x) => Math.ceil(JSON.stringify(x).length / CHARS_PER_TOKEN);

export const PICK_NONE = 'none';
export const LINE_TYPES = Object.freeze(['pick', 'pair', 'summary', 'unavailable']);
const T1_GRID = Object.freeze(Array.from({ length: 19 }, (_, i) => (5 + 5 * i) / 100));

// Every word Jev is shown, in one frozen table. tooling/jev-screen.mjs hashes it into screen-run.json's
// questionsSha, so an edited wording stales the committed run by name (45.8).
export const QUESTION_TEMPLATES = Object.freeze({
  stage1: Object.freeze({
    question: 'Which claim in `claims` states something that cannot be true of the same product at the same time as `target`? Answer none when no claim does.',
    none: 'No claim in `claims` conflicts with `target`.',
  }),
  stage2State: 'Two claims from one product requirements document.',
  relation: Object.freeze({
    question: 'Does claim `a` support, contradict, or neither establish nor contradict claim `b`?',
    criteria: Object.freeze({
      supports: 'Claim `a` makes claim `b` more likely to be true.',
      contradicts: 'Claim `a` and claim `b` cannot both be true of the same product at the same time.',
      not_established: 'Claim `a` neither supports nor contradicts claim `b`.',
    }),
  }),
  same: Object.freeze({
    question: 'Are `a` and `b` about the same part of the product?',
    criteria: Object.freeze({
      true: 'Both describe the same feature, rule, number or promise.',
      false: 'They describe different parts of the product, even if they share words.',
    }),
  }),
});

const brief = ({ id, section, text }) => ({ id, section, text });

export function stage1State(claims) {
  return { claims: claims.map(brief) };
}

export function stage1Question(target, claims) {
  const others = claims.filter((c) => c.id !== target.id);
  if (others.length > 254) bad(`pick_${target.id} would offer ${others.length} claims — a Choice question takes at most 255 options, and one is \`none\``);
  const criteria = {};
  for (const c of others) criteria[c.id] = null;
  criteria[PICK_NONE] = QUESTION_TEMPLATES.stage1.none;
  return Object.freeze({
    type: 'choice',
    instructions: Object.freeze({ question: QUESTION_TEMPLATES.stage1.question, target: Object.freeze(brief(target)) }),
    criteria: Object.freeze(criteria),
  });
}

export function stage2Questions(a, b) {
  const { relation, same } = QUESTION_TEMPLATES;
  return {
    [`relation_${a.id}_${b.id}`]: Object.freeze({ type: 'choice', instructions: Object.freeze({ question: relation.question, a: a.text, b: b.text }), criteria: relation.criteria }),
    [`same_${a.id}_${b.id}`]: Object.freeze({ type: 'noul', instructions: Object.freeze({ question: same.question, a: a.text, b: b.text }), criteria: same.criteria }),
  };
}

// Greedy packing in insertion order. Deterministic: 45.8's replay asserts each request's question ids.
export function batches(questions, state) {
  const base = estTokens(state);
  const out = [];
  let cur = {};
  let size = base;
  for (const [id, q] of Object.entries(questions)) {
    const t = estTokens(q);
    if (base + t > STATE_PLUS_QUESTION_BUDGET) bad(`question ${id} with its state is ~${base + t} tokens — over the ${STATE_PLUS_QUESTION_BUDGET}-token state + question budget`);
    if (Object.keys(cur).length && size + t > REQUEST_TOKEN_BUDGET) { out.push(cur); cur = {}; size = base; }
    cur[id] = q;
    size += t;
  }
  if (Object.keys(cur).length) out.push(cur);
  return out;
}

export function picksFrom(answers) {
  const out = [];
  for (const [id, ans] of Object.entries(answers)) {
    if (!id.startsWith('pick_')) continue;
    if (typeof ans?.choice !== 'string') bad(`${id} carries no choice`);
    const p = ans.probabilities?.[ans.choice];
    if (!Number.isFinite(p)) bad(`${id} chose ${ans.choice} with no finite probability for it`);
    out.push({ claim: id.slice('pick_'.length), picked: ans.choice, p });
  }
  return out;
}

export function candidatePairs(picks, t1) {
  const byKey = new Map();
  for (const { claim, picked, p } of picks) {
    if (picked === PICK_NONE || p < t1) continue;
    const [a, b] = claim < picked ? [claim, picked] : [picked, claim];
    const key = `${a}|${b}`;
    const prev = byKey.get(key);
    byKey.set(key, { a, b, stage1P: prev ? Math.max(prev.stage1P, p) : p });
  }
  return [...byKey.values()].sort((x, y) => (x.a === y.a ? (x.b < y.b ? -1 : 1) : (x.a < y.a ? -1 : 1)));
}

const resolvePairs = (pairs, claims) => {
  const byId = new Map(claims.map((c) => [c.id, c]));
  return pairs.map((p) => {
    const a = byId.get(p.a);
    const b = byId.get(p.b);
    if (!a || !b) bad(`pair ${p.a} ↔ ${p.b} names a claim the document does not hold`);
    return { ...p, a: brief(a), b: brief(b) };
  });
};

const stage2All = (pairs) => Object.assign({}, ...pairs.map((p) => stage2Questions(p.a, p.b)));

// T1 unless the candidates need more than STAGE2_MAX_REQUESTS requests; then the lowest grid value
// that fits (D3's proviso). The claims are needed because a request's size depends on the texts.
export function chooseT1(picks, claims) {
  const fits = (t) => batches(stage2All(resolvePairs(candidatePairs(picks, t), claims)), QUESTION_TEMPLATES.stage2State).length <= STAGE2_MAX_REQUESTS;
  if (fits(T1)) return T1;
  const t = T1_GRID.find(fits);
  if (t === undefined) bad(`no T1 on the grid 0.05…0.95 keeps stage 2 within ${STAGE2_MAX_REQUESTS} requests`);
  return t;
}

const rank = (x, y) => (y.relation.probabilities.contradicts - x.relation.probabilities.contradicts)
  || (x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0)
  || (x.b.id < y.b.id ? -1 : x.b.id > y.b.id ? 1 : 0);

export function judgePairs(pairs, answers) {
  const judged = pairs.map((p) => {
    const rid = `relation_${p.a.id}_${p.b.id}`;
    const sid = `same_${p.a.id}_${p.b.id}`;
    const rel = answers[rid];
    if (typeof rel?.choice !== 'string' || !Number.isFinite(rel.probabilities?.contradicts)) bad(`${rid} carries no choice or no finite contradicts probability`);
    if (!Number.isFinite(answers[sid]?.noul)) bad(`${sid} carries no finite noul`);
    return { ...p, relation: { choice: rel.choice, probabilities: rel.probabilities }, sameSubject: answers[sid].noul };
  });
  const passing = judged.filter((p) => p.sameSubject >= T_SAME && p.relation.probabilities.contradicts >= T2).sort(rank);
  const kept = new Set(passing.slice(0, K));
  return judged.map((p) => ({ ...p, kept: kept.has(p) }));
}

async function run(stage, questions, state, ask, requests) {
  const answers = {};
  for (const batch of batches(questions, state)) {
    const questionIds = Object.keys(batch);
    const response = await ask({ state, questions: batch }, { timeoutMs: SCREEN_TIMEOUT_MS });
    for (const id of questionIds) if (!response?.answers?.[id]) bad(`Jev answered no ${id} in stage ${stage}`);
    requests.push({ stage, questionIds, response: { model: response.model, answers: response.answers, usage: response.usage ?? null } });
    Object.assign(answers, response.answers);
  }
  return answers;
}

export async function screenDocument(text, { ask = askJev, now = () => new Date().toISOString() } = {}) {
  const claims = splitClaims(text);
  const requests = [];
  const state1 = stage1State(claims);
  const qs1 = {};
  for (const c of claims) qs1[`pick_${c.id}`] = stage1Question(c, claims);
  const picks = picksFrom(await run(1, qs1, state1, ask, requests));
  const t1 = chooseT1(picks, claims);
  const pairs = resolvePairs(candidatePairs(picks, t1), claims);
  const judged = judgePairs(pairs, await run(2, stage2All(pairs), QUESTION_TEMPLATES.stage2State, ask, requests));
  const model = requests[0]?.response.model ?? JEV_MODEL;
  const tokens = requests.map((r) => r.response.usage?.input_tokens);
  const lines = [
    ...picks.map((p) => ({ type: 'pick', ts: now(), model, ...p })),
    ...judged.map((p) => ({ type: 'pair', ts: now(), model, a: p.a, b: p.b, stage1P: p.stage1P, relation: p.relation, sameSubject: p.sameSubject, kept: p.kept })),
    {
      type: 'summary', ts: now(), model,
      docMd5: createHash('md5').update(text).digest('hex'),
      claimsVersion: CLAIMS_VERSION,
      claims: claims.length,
      picks: picks.filter((p) => p.picked !== PICK_NONE).length,
      candidates: pairs.length,
      kept: judged.filter((p) => p.kept).length,
      t1,
      thresholds: { T_SAME, T2, K },
      requests: requests.length,
      inputTokens: tokens.every(Number.isFinite) ? tokens.reduce((s, t) => s + t, 0) : null,
    },
  ];
  return { lines, requests };
}

// The kept pairs, in kept rank order — what the audit's prompt block renders. [] for no screen or an
// unavailable one.
export function tensionsOf(lines) {
  return lines.filter((l) => l.type === 'pair' && l.kept).sort(rank)
    .map((l) => ({ a: l.a, b: l.b, contradicts: l.relation.probabilities.contradicts }));
}

export function readScreen(root) {
  const path = join(root, 'screen.jsonl');
  if (!existsSync(path)) return [];
  const out = [];
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let v;
    try { v = JSON.parse(line); } catch (e) { bad(`${path} line ${i + 1} is not JSON — ${e.message}`); }
    if (!LINE_TYPES.includes(v?.type)) bad(`${path} line ${i + 1} carries type ${JSON.stringify(v?.type)} — a screen line is one of ${LINE_TYPES.join(' · ')}`);
    out.push(v);
  });
  return out;
}

export function writeScreen(root, lines) {
  const path = join(root, 'screen.jsonl');
  if (existsSync(path)) bad(`${path} already exists — the screen is written once, at the audit's create, and never rewritten`);
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n') + '\n', { flag: 'wx' });
}

// The route's one call. It never throws for a Jev failure: the failure becomes the file's one line.
export async function screenSession(root, text, { ask, now = () => new Date().toISOString() } = {}) {
  let result;
  try {
    result = await screenDocument(text, { ...(ask ? { ask } : {}), now });
  } catch (e) {
    writeScreen(root, [{ type: 'unavailable', ts: now(), reason: e.message }]);
    return { status: 'unavailable', kept: 0, reason: e.message };
  }
  writeScreen(root, result.lines);
  return { status: 'ran', kept: result.lines.at(-1).kept, reason: null };
}
