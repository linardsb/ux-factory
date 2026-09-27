// tooling/jev-screen/claude-score.mjs — scores a Claude screen run (#466) against the rubric's joins.
// Pre-registered in docs/epics/fixtures/discovery-partner.screen-rubric.md §One Claude call (the commit
// that adds that section is the receipt). It reads the run's screen.jsonl lines and never calls Claude.
//
// A finding is FOUND when a kept quoted-pair joins it, OUTSIDE K when only a mapped pair dropped as
// `outside-K` joins it, and MISSED otherwise; never rounded up. A pair joins a finding's join {a, b}
// when its two mapped claim ids equal {a, b} as a set. An unmapped or ambiguous side joins nothing.
// The joins are diagnostic.mjs's, minus the controls — restated nowhere else.
//
// IMPORTS: ./diagnostic.mjs only. Never tooling/jev-screen.mjs, whose top level parses argv and exits.
import { CONTRADICTION_FINDINGS, DIAGNOSTIC_JOINS } from "./diagnostic.mjs";

export const JOINS = Object.freeze(DIAGNOSTIC_JOINS.filter((j) => j.class !== "control"));

export function scoreClaudeRun(lines) {
  const mapped = lines.filter((l) => l?.type === "quoted-pair" && l.a && l.b);
  const joins = (p, j) => (p.a.id === j.a && p.b.id === j.b) || (p.a.id === j.b && p.b.id === j.a);
  const ids = [...new Set(JOINS.map((j) => j.finding))];
  const findings = ids.map((finding) => {
    const js = JOINS.filter((j) => j.finding === finding);
    const kept = mapped.filter((p) => p.kept && js.some((j) => joins(p, j)));
    const outside = mapped.filter((p) => p.reason === "outside-K" && js.some((j) => joins(p, j)));
    const state = kept.length ? "FOUND" : outside.length ? "OUTSIDE K" : "MISSED";
    return { finding, class: js[0].class, state, by: (kept.length ? kept : outside).map((p) => p.index) };
  });
  const found = CONTRADICTION_FINDINGS.filter((f) => findings.find((x) => x.finding === f)?.state === "FOUND");
  return { findings, found, of: CONTRADICTION_FINDINGS.length };
}
