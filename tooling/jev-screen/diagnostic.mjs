// tooling/jev-screen/diagnostic.mjs — the #453 follow-up diagnostic: stage 2 on the known joins.
// Pre-registered in docs/epics/fixtures/discovery-partner.screen-rubric.md §Diagnostic: stage 2 on the
// known joins (the commit that adds that section is the receipt).
//
// Both measured screens missed every scored MVP 13 finding at stage 1. This hands the 16 pre-registered
// pairs straight to stage 2 — the module's own stage2Questions and QUESTION_TEMPLATES.stage2State,
// unchanged, packed by its batches() — and reads the verdict off its own T2 and T_SAME. The CLI
// (tooling/jev-screen.mjs --diagnostic) makes the paid call; build-checks 45.12 replays the committed
// diagnostic-run.json through these same functions. This module never calls Jev.
//
// IMPORTS: discovery-screen.mjs only (group 45.12 reads it in CI with no portal/node_modules). Never
// tooling/jev-screen.mjs, whose top level parses argv and exits.
import { batches, judgePairs, QUESTION_TEMPLATES, stage2Questions } from "../../portal/lib/discovery-screen.mjs";

const bad = (msg) => { throw new Error(`jev-screen diagnostic: ${msg}`); };

// The rubric's table, row for row: the lower id is `a`, as candidatePairs orders a candidate.
export const DIAGNOSTIC_JOINS = Object.freeze([
  ["c044", "c054", "#2", "contradiction"], ["c054", "c056", "#2", "contradiction"],
  ["c043", "c077", "#6", "contradiction"],
  ["c018", "c045", "#8", "contradiction"], ["c018", "c048", "#8", "contradiction"], ["c045", "c048", "#8", "contradiction"],
  ["c044", "c056", "#4", "tension-shaped"],
  ["c028", "c042", "#5", "tension-shaped"], ["c033", "c042", "#5", "tension-shaped"],
  ["c033", "c049", "#7", "tension-shaped"], ["c034", "c049", "#7", "tension-shaped"],
  ["c033", "c048", "#7", "tension-shaped"], ["c034", "c048", "#7", "tension-shaped"],
  ["c005", "c061", "—", "control"], ["c029", "c030", "—", "control"], ["c035", "c066", "—", "control"],
].map(([a, b, finding, cls]) => Object.freeze({ a, b, finding, class: cls })));

export const CONTRADICTION_FINDINGS = Object.freeze(["#2", "#6", "#8"]);
export const PASS_AT = 2;

// The requests the run sends, in order: the same questions and state the screen's stage 2 would send.
export function diagnosticBatches(claims) {
  const byId = new Map(claims.map((c) => [c.id, c]));
  const questions = {};
  for (const { a, b } of DIAGNOSTIC_JOINS) {
    if (!byId.has(a) || !byId.has(b)) bad(`${a} ↔ ${b} names a claim the document does not hold`);
    Object.assign(questions, stage2Questions(byId.get(a), byId.get(b)));
  }
  return batches(questions, QUESTION_TEMPLATES.stage2State);
}

// RECOGNISED is the raw threshold test — no K, this is not a selection. The thresholds are parameters
// so the caller passes the module's T2 and T_SAME by name; judgePairs only validates and extracts.
export function recognise(answers, { t2, tSame }) {
  if (!Number.isFinite(t2) || !Number.isFinite(tSame)) bad("recognise needs finite t2 and tSame");
  const judged = judgePairs(DIAGNOSTIC_JOINS.map(({ a, b }) => ({ a: { id: a }, b: { id: b } })), answers);
  return DIAGNOSTIC_JOINS.map((j, i) => {
    const { relation, sameSubject } = judged[i];
    const contradicts = relation.probabilities.contradicts;
    return { ...j, choice: relation.choice, contradicts, sameSubject, recognised: contradicts >= t2 && sameSubject >= tSame };
  });
}

// PASS when at least PASS_AT of the three contradiction-class findings have a recognised join.
// Tension-shaped findings are itemised, controls reported; neither is counted.
export function verdictOf(pairs) {
  const found = CONTRADICTION_FINDINGS.filter((f) => pairs.some((p) => p.finding === f && p.recognised));
  return { verdict: found.length >= PASS_AT ? "PASS" : "FAIL", found };
}
