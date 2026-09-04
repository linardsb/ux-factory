# Process sweep — every implementation report and code review in the repo

**Date**: 2026-09-04 · **Trigger**: the #288 system review (`discovery-portal-width-288-review.md`), whose
findings needed testing against the whole corpus before any skill was edited.

**Method** (so the numbers are checkable): six readers, each given a disjoint slice and one shared taxonomy,
read every file in full and classified it. No sampling, no grep-and-guess.

| Corpus | Files | Slices |
|---|---|---|
| `.claude/reports/*.md` | 113 | 1–38 · 39–76 · 77–113 |
| `.claude/code-reviews/pr-*.md` | 107 | PRs 15–66 · 83–184 · 184–372 |
| `.agents/code-reviews/agent-reviews/*.md` | 8 | with the third review slice |

Reports were classified by ticket-level pattern (P1–P13, one report may carry several). Reviews were
classified per FINDING (R1–R9, plus X for an ordinary code bug with no process trace), 475 findings in total.
Per-file tables with quoted evidence are in `evidence/sweep-reports-{1,2,3}.md` and
`evidence/sweep-reviews-{1,2,3}.md`. **Epic #279 is fully included**: 21 discovery reports (#280–#359) and
26 discovery reviews (PRs #322–#372 plus five agent-reviews).

## The taxonomy

**Report codes** (a ticket-level pattern; one report may carry several):

| | |
|---|---|
| P1 | plan literal wrong — a count, argument order, fixture shape, path, command or expected output |
| P2 | paid or owner-only step not run |
| P3 | stale citation propagated into code, a comment or a doc |
| P4 | gate red-proof mismatch — predicted mutation did not redden, or an assertion nothing can redden |
| P5 | sibling session's uncommitted files in the shared tree |
| P6 | deviation noise — a plan-sanctioned option or honoured assumption listed as a deviation |
| P7 | plan contradicts itself — IMPLEMENT vs GOTCHA, a task naming something the plan never defines |
| P8 | plan missed existing state — assumed absent what existed, or present what did not |
| P9 | explicit plan rule ignored |
| P10 | addition beyond the plan — a route, control, extra gate case or refactor nobody asked for |
| P11 | validation claimed or substituted without the run |
| P12 | generated-artefact drift missed — loc-summary, VR baselines, system-graph, handoff, param-count |
| P13 | known trap (a memory or an earlier report) not carried into the plan as a GOTCHA |
| N | other, described in the evidence table |

**Review codes** (per finding):

| | |
|---|---|
| R1 | the plan said so and it was not done |
| R2 | a plan defect copied into code or docs |
| R3 | plan gap — a case a GOTCHA would have prevented |
| R4 | validation hollow — a check that cannot fail, a probe testing the wrong thing, a claim that did not re-run |
| R5 | a figure in the report or PR body wrong under re-derivation |
| R6 | doc drift — CLAUDE.md, gates.md, a header or a comment left false |
| R7 | generated-artefact drift |
| R8 | an owed step the reviewer named — a real run, a browser pass, an owner act |
| R9 | validated on a stale tree, base moved, or a merge race |
| X | an ordinary code bug with no process trace |

### Reports — how many of 113 hit each code

| Code | Pattern | Reports | Share |
|---|---|---|---|
| P1 | plan literal wrong (count, arg order, fixture, path, expected output) | 66 | 58% |
| P8 | plan missed existing state (helper, rule, landed feature, absent file) | 59 | 52% |
| P6 | plan-sanctioned choice listed as a "deviation" | 47 | 42% |
| P5 | sibling session's uncommitted files in the tree | 44 | 39% |
| P10 | addition beyond the plan (route, control, extra gate case, refactor) | 44 | 39% |
| P7 | plan contradicts itself (IMPLEMENT vs GOTCHA, task names undefined thing, two counts) | 37 | 33% |
| P4 | gate red-proof mismatch / assertion that cannot fail | 35 | 31% |
| P13 | known trap (memory or earlier report) not carried as a GOTCHA | 33 | 29% |
| P2 | paid or owner-only step not run | 17 | 15% |
| P12 | generated artefact drift missed (loc-summary, baselines, system-graph, handoff) | 17 | 15% |
| P11 | validation claimed or substituted without the run | 10 | 9% |
| P3 | stale citation copied into code/docs | 7 | 6% |
| P9 | explicit plan rule ignored | 6 | 5% |
| N | other (see below) | 87 | — |

PARTIAL reports: 7 of 113. Reports with no code at all: 1.

### Reviews — findings by code (475 findings across 115 files)

| Code | Pattern | Findings |
|---|---|---|
| R4 | validation hollow — a check that cannot fail, a probe testing the wrong thing, a claim that did not hold on re-run | 59 |
| R6 | doc drift — CLAUDE.md / gates.md / header / comment left false (group counts alone recur in 9+ files) | 40 |
| R3 | plan gap — a case a GOTCHA would have prevented | 20 |
| R8 | owed step named by the reviewer (real run, browser pass, owner act) | 15 |
| R7 | generated artefact drift | 12 |
| R9 | validated on a stale tree / base moved / merge race | 11 |
| R5 | figure in report or PR body wrong under re-derivation | 9 |
| R2 | plan defect copied into code | 8 |
| R1 | plan said so, not done | 6 |
| N | other | 49 |
| X | ordinary code bug, no process trace | 246 |

48% of all review findings (229 of 475) have a process trace.

### Recurring "other" themes, all six readers

- "By hand" in the plan, driven headlessly in practice (~12 reports). Fine, but unsanctioned.
- Stale server on a shared port serving the wrong tree, or killed blind (11+ reports).
- Base moved mid-ticket; anchors, SHAs, group numbers re-derived; stacked PRs (20+ reports and reviews).
- Report or PR-body figure wrong, caught only by the review's numbers pass (16).
- Probe or driver had its own bug and produced a false result before the code was cleared (9).
- Gate group / case number collisions between concurrent tickets; stale group counts (9).
- Step deferred to post-merge still pending at report time (5).
- Reviewer's own prescribed fix wrong or tautological (4).

### What the sweep changes about the #288 findings

- **P1 and P8 are the disease; everything I weighted from #288 is a symptom.** 58% of plans carry a wrong
  literal and 52% assume state that is not there. P3 (stale citation) and P7 (contradiction) are the same
  root: the plan is written from memory of the tree, not executed against it.
- **R4 is the largest review class by a wide margin.** Hollow checks (59 findings) outnumber every other
  process class. The memory `check-that-cannot-fail` exists; neither skill carries it.
- **P6 and P10 are report-shape problems, not behaviour problems.** 42% of reports list sanctioned choices
  as deviations and 39% add unrequested things without a section that says so. Both hide the real signal.
- **P2 is real but smaller than #288 suggested** (15%), and almost entirely the paid-run and browser-eyeball
  classes.
- **P9 is rare (5%).** Implementers follow plans. The plan is the weak link.

### The fix set, re-ranked by frequency × cost

**F-A · Plan pre-flight (plan skill, Phase 5; implement skill, step 1).** Targets P1 66 · P8 59 · P7 37 ·
P13 33 · P3 7 · R2 8 · R3 20. Before the plan is reported: run every VALIDATE that drives existing code and
record observed output; `ls`/`grep` every path, symbol and line cited; check the "already landed" table
against `origin/main`; reconcile every IMPLEMENT with its own GOTCHA; carry every memory whose trigger names a
touched file as a GOTCHA. The implement skill re-runs the VALIDATEs before writing a line; a failure is a plan
error logged in AMENDMENTS. One lever, four of the top eight patterns.

**F-B · Red-proof and positive control (both skills).** Targets P4 35 · R4 59 · the probe-bug theme (9).
Plan skill: the gate task pairs each assertion with the mutation that reddens it. Implement skill: every new
case, probe and grep gets one mutation run red and one positive control, recorded as a table in the report.

**F-C · Report template with fixed sections (implement skill).** Targets P6 47 · P10 44 · P2 17 · P11 10 ·
R5 9 · R8 15. Sections: Deviations (plan said X, did Y, tagged `(plan error)` where so) · Assumptions carried
· Additions beyond the plan · Not run (step, reason, tracker) · Figures (each with the command that produced
it) · Mutation table. A missing section is visible; a missing paragraph is not.

**F-D · Tree hygiene as steps (implement skill, "Before you start" and "Final verification").** Targets P5 44
· R9 11 · stale-port theme 11 · base-moved theme 20. Record the base SHA at start; use a worktree when another
session is live; smoke on a private port, PID-kill only, curl-verify one changed file; before the report,
merge `origin/main` and re-run the gates on the merged tree. All five are memories today.

**F-E · A mechanical count check (tooling).** Targets the group-count half of R6 (9+ files). `build-checks.mjs`
declares 34 distinct `group("…")` names (35 calls; "parenting" twice on one if/else). The literal `34` lives
in `build-checks.mjs:9028`, `CLAUDE.md:110` and `CLAUDE.md:178`, and `gates.md` lists the groups. One
drift-check leg: distinct group names in the source == the literal in all three places. It holds today
(observed); it has drifted at least nine times in the corpus.

**F-F · Paid and owner-only steps table (plan skill).** Targets P2 17 · R8 15. As A4 above.

**F-G · `REGENERATES:` field on the task format (plan skill).** Targets P12 17 · R7 12. The plan names the
generated outputs a change moves (loc-summary, VR baselines, system-graph, handoff, param-count) so the
cascade is planned, not discovered post-commit.

Dropped from the #288 list: A8 (doc-edit shape) folds into F-A; A6 (open questions) stands but is a
one-line template rule, not a pattern.

**Shape of the fix:** one branch, one PR — two skill files, one drift-check leg, this review. No gate covers
`.md` skills; the proof is the next ticket's plan going through them, and this sweep re-run in a month.
