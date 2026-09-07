# System review — the portal's width (#288)

**Plan reviewed**: `.claude/plans/discovery-portal-width-288.md`
**Execution report**: `.claude/reports/discovery-portal-width-288-report.md`
**Code review consulted**: `.claude/code-reviews/pr-372-review.md` (PR #372, approve, 5 low)
**Prior reports read for recurrence**: #283, #285, #286, #359
**Date**: 2026-09-04

This is a review of the process, not the code. The code review is done and approved.

## Overall alignment score: 9/10

Every task in the plan landed except the one the plan itself said to defer (Q1, Phase 6). Eight deviations
are recorded; seven are plan defects the implementer corrected or plan-sanctioned choices, one is report
noise. The single bad divergence (six `seq ${…}` interpolations skipping `esc()`, review F3) is low
severity and traces to a plan that named a MIRROR target which itself breaks the rule the plan stated.

What keeps it off 10: the plan carried four factual errors the implementer had to catch at run time, a
stale memory quoted as a current fact travelled from plan into a shipped code comment, and the paid
validation step was again not run, for the second ticket running.

## Divergence analysis

```yaml
divergence: D1 — the escape-hatch input not built
planned: Phase 6, CONDITIONAL on Q1
actual: not taken; deferred to #289
reason: no AC names it; no route to POST to
classification: good ✅
justified: yes — the plan's own recommendation
root_cause: none (plan-sanctioned)
```

```yaml
divergence: D2 — the 409 compares depth and vector only
planned: the tasks compare depth + vector; Q2 RECOMMENDS adding entryMode + posture
actual: depth + vector; Q2 left open for the owner
reason: widening a refusal is the owner's call
classification: good ✅
justified: yes
root_cause: none — but the review names Q2 as "the one decision waiting on you", so an open question
  survived plan → implement → review without an owner answer. See A6.
```

```yaml
divergence: D3 — Think-on-Opus as a variant checkbox
planned: Q3 assumption: the checkbox
actual: the checkbox
reason: MVP 1 says three buttons
classification: good ✅
justified: yes (an assumption honoured, not a deviation)
root_cause: report noise — an honoured assumption is not a deviation (see A7)
```

```yaml
divergence: D4 — facet fieldset placed BEFORE the flow fieldset, both outside .portal-form-row
planned: the flow "replaces the posture <select>" inside the .portal-form-row grid
actual: two fieldsets after the row, facets first
reason: a <fieldset> cannot sit in that grid row; reading order depth → facets → stance → model
classification: good ✅
justified: yes — the reviewer verified the thing it depends on (#discovery-start IS a fieldset)
root_cause: unclear plan — the DOM insertion named a slot without checking the parent's layout admits the
  element type. Same class as #283's "splice leaves a dangling list".
```

```yaml
divergence: D5 — no per-control disable loop
planned: IMPLEMENT describes a loop over flow buttons, variant, depth, entry, facets; the GOTCHA under it
  says "nest inside #discovery-start (preferred) OR add the selector; do not do both"
actual: native fieldset propagation, measured (13 controls :disabled)
reason: the plan's own GOTCHA
classification: good ✅
justified: yes
root_cause: plan-internal contradiction — IMPLEMENT and GOTCHA in the same task disagree. Recurs: #359 D-B
  ("proposalsView(root)" AND "pure" in one sentence), #359 D-C (a button with no route).
```

```yaml
divergence: D6 — case 39's "text/denied lines contribute nothing" is doubly guarded
planned: assert it
actual: asserted; no single-line mutation reddens that assertion; kept as defence in depth
reason: two layers each filter the same thing
classification: good ✅ (borderline — an assertion no mutation can redden is the shape memory
  `check-that-cannot-fail` warns about; the CASE is red-able, the ASSERTION is not)
justified: yes, with the reason recorded
root_cause: plan listed assertions without naming the mutation that reddens each. Recurs: #283 deviation 3
  (mutation (f) hit case 5/14, not case 10 as the plan predicted).
```

```yaml
divergence: D7 — the plan's ledgerView VALIDATE one-liner had applyOps' arguments in the wrong order, and
  the dec() fixture defaults evidence_refs: [1]
planned: applyOps(state, items, ctx); a dec() with no evidence
actual: applyOps(items, ctx, state); fixture corrected
reason: the plan was wrong
classification: good ✅
justified: yes
root_cause: plan VALIDATE commands written, never RUN, at plan time. Recurs: #286 "seven slugs" (six
  prd.md files), #285 Task 0 expecting two M lines (three), #359 34.4's disjointness assertion false,
  #283 "Three readers" with a fourth bullet. Five tickets, five plan literals wrong.
```

```yaml
divergence: D8 — case 11 extended rather than a new case for the note/provenanceNote absence
planned: "extend the existing case that does this rather than writing a second" (case-38 task, verbatim)
actual: extended case 11
reason: the plan said so
classification: not a deviation
justified: n/a
root_cause: report noise — see A7
```

**Not in the report, found by the code review, and traceable to the plan:**

```yaml
divergence: D9 — the "hidden is a no-op on .btn" rationale in index.html is false on this page (review F2)
planned: §Patterns to Follow: "`hidden` is not enough where CSS sets display … the .btn is
  display:inline-flex, so el.hidden = true on a button is a silent no-op", citing portal.css:58 and the
  memory hidden-defeated-by-author-display
actual: copied into a shipped comment; portal.css:61 has `[hidden]{display:none!important}`, so hidden WORKS
reason: the plan quoted the memory's failure half and not its fix half (the memory itself says "One
  page-scoped [hidden]{display:none!important}")
classification: bad ❌ (plan defect, copied faithfully)
justified: no
root_cause: missing verification — the plan cited a memory as a current fact without reading the file it
  points at. portal.css:58-61 was three lines below the cited line.
```

```yaml
divergence: D10 — six `seq ${…}` interpolations skip esc() in renderPackageView (review F3)
planned: "every interpolated string goes through esc() … No exception for 'our own data'", PATTERN:
  renderDiscoveryRecorded
actual: seq/parentId/supersedes/claimRef raw, matching renderDiscoveryRecorded:1052 which does the same
reason: the MIRROR target breaks the rule the plan states; the implementer followed the mirror
classification: bad ❌ (low)
justified: no — the plan's rule was explicit
root_cause: unclear plan — MIRROR and RULE conflict, and the plan did not check its own pattern file
  against its own rule
```

```yaml
divergence: D11 — gates.md paragraph detached from group 30 (review F1)
planned: "extend group 29's and group 30's entries with one sentence each"
actual: group 29 extended inline; a standalone `#288 added THE WIDTH:` paragraph after group 30
reason: not stated
classification: bad ❌ (low)
justified: no
root_cause: missing context — the plan quoted code patterns with file:line but gave the DOC edit no shape;
  gates.md's convention (`#N added:` inline in the group's paragraph) was not shown
```

```yaml
divergence: D12 — bank.mjs:1098 cited in two shipped comments, off by one (review F5)
planned: the plan cites bank.mjs:1098 twice as selectDepth's condition
actual: copied into portal.js and discovery.mjs comments; the condition is 1099
reason: the plan's number
classification: bad ❌ (nit)
justified: no
root_cause: line numbers are plan-time pointers; the plan does not say they must not migrate into code
```

```yaml
divergence: D13 — the live paid turn (Level 4 step 5) not run
planned: "Start a NEW fictional slug … answer one question … This spends real tokens — one turn is enough."
actual: not run; AC #3 verified structurally, the refresh path verified by reading the handler
reason: report: "Say the word and it is one turn"; review: "an owed observation of the same kind #370
  tracked for #286"
classification: good ✅ as reported (labelled "Not run, deliberately", substitute stated) — but a
  PROCESS pattern: the plan puts a paid step in the manual-validation list with no decision attached
  (blocks merge? who says go? where is it tracked if skipped?)
justified: yes, on honesty grounds
root_cause: plan template has no place for "steps that cost money or need the owner". Recurs: #286 (API
  limit → #370), #359 D-A (the owner's verdicts, AC #7 NOT MET), #288.
```

## Pattern compliance

- [x] Followed codebase architecture — `ledgerView` in `discovery/ops.mjs` (pure, gate-reachable), the
  route-served table, the 409 written in the route with no taxonomy. The review names these as the PR's
  load-bearing decisions.
- [x] Used documented patterns — config-served frozen tables iterated both ways; copy-never-alias; the
  `/api/build/*` route shape.
- [x] Applied the repo's testing pattern — no suite; groups 29/30 drive functions, twelve mutations proven
  red, five reproduced independently by the reviewer.
- [x] Met validation requirements — all three CI legs green, portal smoke, two-viewport browser pass.
  Level 4 step 5 (paid) not run, stated.
- [ ] `esc()` on every interpolation — six misses (D10).

## Recurring patterns across #283 · #285 · #286 · #359 · #288

| # | Pattern | Tickets | Where it lives today |
|---|---|---|---|
| P1 | A plan literal (count, argument order, fixture, "N rows") is wrong; the implementer catches it at run time | all five | nowhere — caught by luck each time |
| P2 | A paid or owner-only step in the plan is not run; becomes an owed observation or an open AC | #286, #359, #288 | ad-hoc "Not run" prose + a follow-up ticket (#370) |
| P3 | A plan citation (memory, line number) is copied into a shipped comment and is stale | #288 (F2, F5) | memory `hidden-defeated-by-author-display` says verify; the plan did not |
| P4 | A gate assertion's predicted red-mutation does not redden it | #283, #288 | memory `check-that-cannot-fail`; not in either skill |
| P5 | Three uncommitted files from a sibling session sit in the tree and every report has to disclaim them | #283, #285, #286, #288 | memory `shared-worktree-parallel-sessions` |
| P6 | Report lists a plan-sanctioned choice as a "deviation" | #283 (separate "Assumptions carried" section, good), #288 (D3, D8 as deviations) | no definition of "deviation" in piv-implement |

## System improvement actions

**A1 — Plan skill: run every VALIDATE one-liner at plan time** (fixes P1, D7)

Add under *Quality Criteria → Context Completeness*:

> - [ ] Every `VALIDATE` command that drives code which ALREADY EXISTS was run at plan time against the
>   current tree, and its expected output is what was observed, not what was predicted. A command that
>   drives code this plan will create is marked `(expected)` and its argument order is checked against the
>   real signature by reading the function. Every count in the plan ("33 rows", "six files", "three
>   readers") was derived from a command whose output is recorded in NOTES.

**A2 — Plan skill: a self-consistency pass before the report** (fixes P1, D5)

Add a step at the end of *Phase 5*:

> Re-read every task's IMPLEMENT against its own GOTCHA and against every other task. Where a GOTCHA says
> "do A or B, not both", the IMPLEMENT must already name which. Where two sections state a number, they
> must agree (this plan says "32-row" in four places and "33 rows" in three; both describe one table). Where a task says MIRROR `<file>` and also states a rule, confirm `<file>` obeys the rule or
> name the exception in the task.

**A3 — Plan skill: citations are pointers, not facts** (fixes P3, D9, D12)

Add under *Patterns to Follow* in the template:

> Every pattern quoted here was READ this session at the cited lines. A memory is a pointer to verify, never
> a source to quote: read the file it names before writing the pattern. Line numbers are for the plan's
> reader only; a code comment written from this plan cites the symbol (`selectDepth`'s throw), never the
> line (`bank.mjs:1098`), because the line rots and the symbol does not.

**A4 — Plan skill: a "Paid and owner-only steps" subsection** (fixes P2, D13)

Add to the template after *VALIDATION COMMANDS*:

> ### Paid and owner-only steps
>
> | Step | Cost (expected) | Blocks merge? | If not run: tracker |
> |---|---|---|---|
> | Level 4 step 5, one live turn | ~$0.03–0.07 | no | follow-up ticket, opened before PR |
>
> A step that spends tokens, needs the owner's hand (a verdict, a real-run decision), or needs a credential
> this machine may not hold is listed here with a decision attached at plan time. The implementer does not
> decide whether it blocks; the plan does.

**A5 — Implement skill: three repo-facing additions** (fixes P4, P6, and the Python-generic body)

Under *3. Implement Testing Strategy*, add:

> - For every new gate case, break the thing it checks, watch the named case fail, restore. Record the
>   mutation → case table in the report. An assertion no single mutation reddens is recorded as such, not
>   silently kept.

Under *Output*, redefine the deviations section:

> ## Deviations from the plan
> {Only where the plan said X and you did Y. A plan-sanctioned option you chose, or an assumption you
> honoured, goes under **Assumptions carried** instead. Corrections to plan errors go here, tagged
> `(plan error)`.}
>
> ## Not run
> {Every validation step the plan lists that did not execute, its reason, and its tracker. "None" if all ran.}

Drop or repo-scope "type hints", "structured logging" and "80%+ coverage" (memory
`piv-skills-python-tuned` already records this; the skill still says it).

**A6 — Open questions need an answer before implement, or a deadline**

Q2 was RECOMMENDED by the plan, held open, implemented narrow, flagged by the report, flagged by the review,
and is still open. Add to the plan skill's *OPEN QUESTIONS* template:

> A question whose answer changes shipped code is put to the owner BEFORE `piv-implement` starts (the plan's
> report step asks it). If unanswered, the plan's recommendation is implemented and the question is closed
> in AMENDMENTS with "implemented as recommended, <date>", not carried open into the PR.

**A7 — Housekeeping, not a skill change** (P5)

`.claude/skills/piv-plan-implementation/SKILL.md` and the two `docs/epics/discovery-partner.*` files have
been modified-uncommitted through four tickets. Commit them on their own branch or discard them; every report
since #283 spends a paragraph disclaiming them.

**A8 — Doc edits get a shape too** (D11)

In the plan skill's task format, PATTERN applies to prose files as well: for an edit to `gates.md`,
`README.md` or a header, quote the target file's existing inline convention (here: `#N added:` inside the
group's paragraph).

**No new skill is warranted.** Nothing here is a manual process repeated three times that a skill would
automate; the repeats are plan-quality and report-shape rules, which belong in the two existing skills.

**CLAUDE.md: no change.** Every finding is a skill-level or plan-level rule. The one candidate, "code
comments cite symbols not lines", is a writing rule the plan skill can carry; CLAUDE.md's §Ground rules
already says invariants live in the file that owns them.

## Key learnings

**What worked well**

- The plan's *What is already landed* table stopped a two-thirds rebuild of #288's body.
- The plan's hardest trap (`facetPlan` is depth-blind; gate the refusal on `composes`) was named, GOTCHA'd,
  edge-cased and gate-pinned; the review calls it "a subtle call, made correctly".
- The report's honesty framing (AC #5's two numbers; "Not run, deliberately") survived an adversarial numbers
  pass with every figure holding.
- Mirror-not-import with a cross-reader gate case: the plan chose it, said why, and the reviewer could
  check the seam.

**What needs improvement**

- Plans are written from memory of the code and not executed against it (P1). Five tickets, five wrong
  literals.
- A memory or a line number can pass through plan → code comment unverified (P3).
- Paid steps have no owner decision attached at plan time (P2).

**For the next implementation**

- Before `piv-implement`, run the plan's VALIDATE one-liners that touch existing code. Ten minutes; catches
  D7's class.
- Put Q2 to the owner in the plan's report step, with the recommendation, and get a yes/no before Phase 1.
- Open the follow-up ticket for the paid turn BEFORE the PR, so `Closes #288` is not the only home.


---

The repo-wide sweep this review triggered, and the fix set it produced, moved to
`.claude/system-reviews/process-sweep-2026-09-04.md`. The per-file evidence is in
`.claude/system-reviews/evidence/`.
