# Plan: seven process fixes to the PIV skills, from the 2026-09-04 corpus sweep

**Status**: not started. Written by the session that ran the sweep; handed over for a fresh context to execute.
**Evidence**: `.claude/system-reviews/process-sweep-2026-09-04.md` (frequencies + method) ·
`.claude/system-reviews/evidence/` (per-file tables) ·
`.claude/system-reviews/discovery-portal-width-288-review.md` (the #288 review that triggered it).

Read the sweep doc first. It is 159 lines and it is the entire justification for every edit below.

---

## What this fixes and why

Six readers classified all 113 implementation reports and all 115 code reviews in this repo, epic #279
included. Two facts decide the shape of the work:

- **The plan is the weak link, not the implementer.** An explicit plan rule was ignored in 6 reports (5%).
  A plan literal was wrong in 66 (58%); the plan misread existing state in 59 (52%).
- **The largest review class is a check that cannot fail** — 59 findings, ahead of doc drift at 40.

So the fixes go in the two skills every ticket passes through, plus one mechanical gate. They are written as
steps that execute, not sentences that exhort, because the rules mostly exist already, in memories and in
prose, and they hold only when someone remembers them.

## Non-goals

- **Not changing CLAUDE.md.** Every fix is skill-level. §Ground rules already says invariants live in the
  file that owns them, and a second copy in CLAUDE.md is the drift this repo keeps paying for.
- **Not touching any other skill** (the 26 other `piv-*`/`plan-*`/`rules-*` files).
- **Not rewriting the two skills.** Every edit is an insertion or a bounded replacement at a named anchor.
- **Not fixing the individual findings the sweep names.** Those are history. This changes the next ticket.

---

## State of the tree when this was written

- `main` is at `7267b75`. PR **#372 (#288) is OPEN and approved**, on branch
  `feature/discovery-portal-width-288` in the primary checkout. Do not commit this work there.
- A worktree is already prepared: **`../wt-process-fixes` on branch `chore/piv-process-fixes`**, based on
  `origin/main`, with `tooling/style-dictionary/node_modules` symlinked in so `drift-check` can run.
  If it is gone, recreate it:
  `git worktree add ../wt-process-fixes -b chore/piv-process-fixes origin/main`
- **`.claude/skills/piv-plan-implementation/SKILL.md` carries an uncommitted diff from an earlier session**
  (the build-brief section, tightened: register, word budgets, copy buttons). It has sat uncommitted through
  four tickets and every report since #283 disclaims it. **It is a genuine improvement — keep it and commit
  it with this work**, and say so in the commit message. The copy in the worktree already includes it.
- The two `docs/epics/discovery-partner.*` modifications in the primary checkout belong to a sibling session.
  **Leave them alone. Stage by explicit path.**

---

## The seven fixes

Ordered by frequency × cost. F-A is worth more than the rest together.

### F-A · Plan pre-flight

**Targets** P1 (66 reports) · P8 (59) · P7 (37) · P13 (33) · P3 (7) · R2 (8 findings) · R3 (20).

**A1 — `piv-plan-implementation/SKILL.md`.** Insert a new section between the end of the template code fence
(the fence that closes the Phase 5 template, currently ~line 425) and `## Output Format`:

```markdown
## Pre-flight — run the plan against the tree before you report it

A plan is written from a reading of the code and then drifts from it. Across this repo's 113 implementation
reports, 58% record a plan literal that was wrong — a count, an argument order, a path, an expected output —
and 52% record state the plan read wrongly: a helper that was not there, a rule that already existed, a
feature that had already landed (`.claude/system-reviews/process-sweep-2026-09-04.md`). The implementer
catches these one at a time, at run time, at the cost of the one-pass success this skill exists to produce.
Run these five before you write the report.

1. **Drive every VALIDATE that touches code which already exists.** Not read it — run it, and paste the
   observed output into the task. A command whose target this plan will CREATE is marked `(expected)`, and
   its argument order is checked by reading the real signature rather than by recall.
2. **Resolve every citation.** Every `path/file.ext:NN`, every exported symbol, every snippet under PATTERN:
   open it and confirm it says what the plan claims. A pattern you did not read this session does not go in
   the plan. A memory is a pointer to verify, never a quote to copy — read the file it names, because a
   memory records what was true when it was written.
3. **Check the landed claims against `origin/main`.** For everything the plan says is missing, grep for it.
   For everything it says exists, grep for that too. Both are one command, and between them they are half of
   this repo's plan defects.
4. **Reconcile each task with itself and its siblings.** Where a GOTCHA says "do A or B, not both", the
   IMPLEMENT above it already names which. Where two sections state a number, they agree — derive it once
   and reuse the figure. Where a task says MIRROR `<file>` and also states a rule, confirm `<file>` obeys
   that rule or name the exception in the task.
5. **Carry the known traps.** For every file this plan touches, check `.claude/references/` and this
   session's memories for a recorded trap on it, and write it in as a GOTCHA. A third of this repo's reports
   record the implementer hitting a trap that was already written down somewhere the plan did not look.

Record the pre-flight in NOTES: what you ran, what it said, what changed in the plan because of it. A plan
reporting no pre-flight findings has almost certainly not run one.
```

**A2 — `piv-implement/SKILL.md`, `### 1. Read and Understand`.** Append to that section's bullet list:

```markdown
- **Re-run the plan's pre-flight before writing a line.** Drive every VALIDATE command that touches code
  which already exists, and resolve every `file:line` the plan cites. The plan may be days old and the base
  may have moved. A command that fails or a citation that does not resolve is a **plan error**: fix the plan,
  log it under AMENDMENTS with the date and what was wrong, then implement. Do not correct it silently — the
  next plan repeats it.
```

### F-B · Red-proof and positive control

**Targets** P4 (35 reports) · R4 (**59 findings, the largest process class in the corpus**) · the
probe-had-its-own-bug theme (9 reports).

**B1 — `piv-plan-implementation/SKILL.md`, the task format under `### Task Format Guidelines`.** Add one
field to the `### {ACTION} {target_file}` block, after `VALIDATE`:

```markdown
- **REDDENS**: {for a task that adds a check, gate case, probe or grep — the exact mutation that makes it
  fail, and the failure message expected. A check whose reddening mutation you cannot name is a check you
  have not specified.}
```

**B2 — same file, the template's `## TESTING STRATEGY` section.** Append a subsection:

```markdown
### Proving the checks

Every check this plan adds carries the mutation that reddens it (its REDDENS field) and one positive
control — an input that must make it fire, run before you trust a green. This repo's largest class of review
finding, by a factor of two, is a check that passes because it never reached the thing it tested.
```

**B3 — `piv-implement/SKILL.md`, `### 3. Implement Testing Strategy`.** Append:

```markdown
- **Prove every new check can fail.** For each check, gate case, probe or grep you add: apply the plan's
  REDDENS mutation, watch that named case go red, restore. Then run one positive control — an input the
  check must fire on. Record both as a table in the report. An assertion no single mutation can redden is
  recorded as such, with the reason it is kept, rather than left to look like proof.
- **A driver can lie.** Where a probe, script or headless driver produces the evidence, prove the driver
  first on a known-bad input. Nine reports in this repo cleared code on a false pass from a driver bug.
```

### F-C · A report template with fixed sections

**Targets** P6 (47 reports) · P10 (44) · P2 (17) · P11 (10) · R5 (9 findings) · R8 (15).

**C1 — `piv-implement/SKILL.md`, `## Output — write an implementation report`.** Replace the markdown
template block with:

```markdown
# Implementation Report — <feature>

**Plan**: <path>   **Branch**: <feature/...>   **Base**: <sha at start> → <sha at report>   **Status**: COMPLETE | PARTIAL

## Summary
{What was built, 2-4 sentences.}

## Tasks completed
- [task] → `path/to/file` (CREATE/UPDATE)

## Tests added
{Test files + cases + results.}

## Proving the checks
{One row per new check: the mutation applied → the case that went red → the positive control. Or "no new
checks".}

## Validation results
{Every command, its exit state, its output. Mark each figure observed / derived / expected.}

## Not run
{Every validation step the plan lists that did not execute: the step, why, and its tracker (a ticket number,
or "owner's call"). "None" if everything ran. A step verified by reading code instead of running it belongs
here, not above.}

## Deviations from the plan
{Only where the plan said X and you did Y. Tag `(plan error)` where the plan was wrong. This is the
reviewer's signal of intent — a documented deviation is an intentional decision they should not flag.}

## Assumptions carried
{Plan-sanctioned options you chose, and assumptions you honoured. NOT deviations — 42% of this repo's
reports file these as deviations and bury the real ones.}

## Additions beyond the plan
{Anything you added that the plan did not ask for, and why. "None" if none.}

## Issues encountered
{Anything notable, or "none".}
```

**C2 — same file, under `## Notes`.** Add:

```markdown
- Every figure in the report names the command that produced it. A number no reviewer can re-derive is the
  most common thing this repo's review pass sends back.
```

### F-D · Tree hygiene as steps

**Targets** P5 (44 reports) · R9 (11 findings) · the stale-port theme (11 reports) · the base-moved theme
(20+ reports and reviews).

**D1 — `piv-implement/SKILL.md`, `## Before you start — work on a feature branch`.** Append:

```markdown
**The tree is shared.** Parallel sessions work in this checkout, and 39% of this repo's reports record
someone else's uncommitted files in it.

- Record the base SHA now (`git rev-parse --short HEAD`) and put it in the report.
- `git status --short` before you touch anything. Anything already dirty is **not yours**: leave it, and
  stage by explicit path at commit time, never `git add -A`.
- If another session is live on this branch, work in a worktree instead:
  `git worktree add ../wt-<slug> -b feature/<slug> origin/main`.
- Serve and smoke on a **private port** you choose, and kill by PID or port only. Never
  `pkill -f 'node server.mjs'` or `pkill -f serve.mjs` — it kills sibling sessions' recorders. Before
  trusting any served check, `curl` one file you edited: a stale server from another session on a shared
  port will happily serve you their tree.
```

**D2 — same file, `### 5. Final Verification`.** Insert before the checklist:

```markdown
**Re-base before you report.** `git fetch && git merge origin/main`, then re-run the gates on the merged
tree. A review validates the pre-merge tree; if the base moved under you, every green above this line was
measured on a tree that no longer exists. Record both SHAs in the report.
```

### F-E · A mechanical group-count check

**Targets** the group-count half of R6 (doc drift, 40 findings; stale group counts recur in nine files).

**E1 — `tooling/drift-check.mjs`.** Add a leg. Observed today: `build-checks.mjs` makes **35** `group("…")`
calls with **34** distinct names (`parenting` is called twice, on an if/else). The literal `34` lives in four
places: `tooling/build-checks.mjs` (the `all 34 groups pass` line), `CLAUDE.md:110`, `CLAUDE.md:178` and
`.claude/references/gates.md:11`. It holds right now; it has drifted at least nine times in the corpus.

```javascript
// 7. Group-count drift — build-checks' own pass line, CLAUDE.md's map and gates.md all state a group
// count, and all three have gone stale behind a ticket that added a group. The source is the number of
// DISTINCT group("…") names (a group called from both arms of an if/else is still one group).
function checkGroupCount() {
  const src = readFileSync(join(ROOT, "tooling/build-checks.mjs"), "utf8");
  const n = new Set([...src.matchAll(/^\s*group\("([^"]+)"/gm)].map((m) => m[1])).size;
  const claims = [
    ["tooling/build-checks.mjs", src, /all (\d+) groups pass/g],
    ["CLAUDE.md", readFileSync(join(ROOT, "CLAUDE.md"), "utf8"), /(\d+) PURE groups|build-checks' (\d+) groups/g],
    [".claude/references/gates.md", readFileSync(join(ROOT, ".claude/references/gates.md"), "utf8"), /(\d+) pure groups/g],
  ];
  const stale = [];
  for (const [file, text, re] of claims) {
    const found = [...text.matchAll(re)].map((m) => Number(m[1] ?? m[2]));
    if (!found.length) stale.push(`${file}: states no group count (the claim was reworded — re-pin this leg)`);
    for (const c of found) if (c !== n) stale.push(`${file}: says ${c} groups, build-checks defines ${n}`);
  }
  if (stale.length) throw new Error(`group-count drift: ${stale.join("; ")}`);
}
```

Register it in the runner beside the others and add `· group-count` to the `drift-check ✓` summary line.

**Prove it reddens** (F-B applies to this fix too): change one of the four literals, run
`node tooling/drift-check.mjs`, watch it name the file, restore. Also confirm the no-claim branch fires by
temporarily rewording one claim.

### F-F · Paid and owner-only steps get a decision at plan time

**Targets** P2 (17 reports) · R8 (15 findings).

**F1 — `piv-plan-implementation/SKILL.md`, the template.** Insert after `### Level 5: Additional Validation
(Optional)` and before the closing `---` of VALIDATION COMMANDS:

```markdown
### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| <the step> | <$ or "owner's hand"> | yes/no | <ticket, or "open one before the PR"> |

Any step that spends tokens, needs a real agent run, needs the owner's own hand (a verdict, a judgement, a
decision this session must not write), or needs a credential this machine may not hold. The plan decides
whether it blocks; the implementer does not. A step listed here and not run goes in the report's **Not run**
section with this row's tracker.
```

### F-G · A `REGENERATES:` field on the task format

**Targets** P12 (17 reports) · R7 (12 findings).

**G1 — `piv-plan-implementation/SKILL.md`, the task format.** Add after `SATISFIES`:

```markdown
- **REGENERATES**: {the generated outputs this change moves — `loc-summary.json`, VR baselines,
  `system-graph.json`, the handoff pack, `param-count.json` — with the command for each. "none" if none.
  These cascade, they are drift-checked in CI, and they are discovered post-commit in 15% of this repo's
  tickets.}
```

### F-H · Quality criteria (the plan skill's own checklist)

**H1 — `piv-plan-implementation/SKILL.md`, `## Quality Criteria`.** Add to **Context Completeness**:

```markdown
- [ ] Pre-flight run and recorded in NOTES: every existing-code VALIDATE driven, every citation resolved,
      every landed claim checked against `origin/main`
- [ ] Every check-adding task carries a REDDENS mutation
- [ ] Every task that moves a generated output carries REGENERATES
- [ ] Paid and owner-only steps table filled, or explicitly empty
```

---

## Validation

There is no test suite, no linter and no type-check (`CLAUDE.md` §Ground rules). No gate reads a `.md` skill,
so F-A, F-B, F-C, F-D, F-F, F-G and F-H are verified by reading. F-E is real code and gets driven.

```bash
node --check tooling/drift-check.mjs
node tooling/build-checks.mjs      # expect: exit 0, all 34 groups pass
node tooling/drift-check.mjs       # expect: exit 0, summary line now ends "· group-count"
node tooling/token-lint.mjs        # expect: 63 contract tokens · 0 undeclared · 0 orphan
```

Then the F-E red proof (mutate each of the four literals in turn, expect drift-check to name that file, and
restore), and a portal smoke is **not** needed: nothing under `portal/` changes.

Do not run the visual gate or any journey driver. No shipped page changes.

## Acceptance criteria

- [ ] Both skill files carry all seven fixes at the anchors named above, and nothing else changed in them.
- [ ] The uncommitted build-brief improvement is committed with this work, named in the commit message.
- [ ] `drift-check` has the group-count leg, green, with the four-literal red proof recorded.
- [ ] `build-checks`, `drift-check`, `token-lint` all green on the merged tree.
- [ ] C2 (no AI slop) and C3 (no job titles) swept over every string added to the two skills.
- [ ] `CLAUDE.md` untouched. The group count is still 34, so its map is still true.
- [ ] The report follows F-C's own template. This ticket is the first user of it.

## Notes

**The recursion is the point.** This plan should itself go through F-A's pre-flight before you execute it:
the anchors below are line numbers and section titles read on 2026-09-04, and the plan skill has an
uncommitted diff in the primary checkout that shifts its tail. Resolve each anchor by its **section title**,
not by its line number.

**On the numbers in the skill text.** Each cites the sweep doc. They are provenance, not decoration: a rule
with the frequency of its failure attached is one a reader can argue with. If a later sweep moves them,
update both the sweep doc and the skills, or drop the figure rather than leave a stale one.

**What this cannot fix.** Nothing here makes a plan understand a codebase it did not read. The pre-flight
catches wrong literals and missed state; it does not catch a plan that is wrong at the root about what the
ticket means (the sweep found 3 of those, P9-adjacent). That stays a human read.
