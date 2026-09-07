---
name: piv-implement
description: Executes an implementation plan task-by-task with validation at every step. Use when you have a completed feature plan and want to implement it in one pass.
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

## Before you start — work on a feature branch

A ticket gets built on its own branch, so it can become one PR. **Ideally you're already on that branch — cut it
before planning — so the plan commit you made is on it and rides into the PR; a plan committed on the base branch
won't be in this branch's PR.** If you're still on base, this step creates the branch now. Detect the base branch
(don't hardcode `main`): `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
(fallback `main`).

- **On the base branch, clean** → create one: `git checkout -b feature/<plan-slug>`.
- **Already on a feature branch or in a worktree** → use it.
- **On the base branch with uncommitted changes** → STOP: commit or stash first.

(One branch per ticket is also what makes parallel worktrees clean later.)

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

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy
- **Re-run the plan's pre-flight before writing a line.** Drive every VALIDATE command that touches code
  which already exists, and resolve every `file:line` the plan cites. The plan may be days old and the base
  may have moved. A command that fails or a citation that does not resolve is a **plan error**: fix the plan,
  log it under AMENDMENTS with the date and what was wrong, then implement. Do not correct it silently — the
  next plan repeats it.

### 2. Execute Tasks in Order

For EACH task in "Step by Step Tasks":

#### a. Navigate to the task
- Identify the file and action required
- Read existing related files if modifying

#### b. Implement the task
- Follow the detailed specifications exactly
- Maintain consistency with existing code patterns
- Include proper type hints and documentation
- Add structured logging where appropriate

#### c. Verify as you go
- After each file change, check syntax
- Ensure imports are correct
- Verify types are properly defined

### 3. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the testing approach outlined
- Ensure tests cover edge cases
- **Prove every new check can fail.** For each check, gate case, probe or grep you add: apply the plan's
  REDDENS mutation, watch that named case go red, restore. Then run one positive control — an input the
  check must fire on. Record both as a table in the report. An assertion no single mutation can redden is
  recorded as such, with the reason it is kept, rather than left to look like proof.
- **A driver can lie.** Where a probe, script or headless driver produces the evidence, prove the driver
  first on a known-bad input. Nine runs in this repo cleared code on a false pass from a driver bug.

### 4. Run Validation Commands

Execute ALL validation commands from the plan in order:

```bash
# Run each command exactly as specified in plan
```

If any command fails:
- Fix the issue
- Re-run the command
- Continue only when it passes

### 5. Final Verification

Before completing:

**Re-base before you report.** `git fetch && git merge origin/main`, then re-run the gates on the merged
tree. A review validates the pre-merge tree; if the base moved under you, every green above this line was
measured on a tree that no longer exists. Record both SHAs in the report. Complete the merge before you
re-run `drift-check` — a mid-merge run reads staged merge changes as drift — and resolve a conflict in a
generated file by regenerating it, never by hand.

- ✅ All tasks from plan completed
- ✅ All tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated as needed
- ✅ Every REGENERATES command the plan names has been run and its output committed — `git status --short`
  shows no dirty generated path

## Output — write an implementation report

Write a short report to `.claude/reports/<plan-slug>-report.md` (and print the summary). This is what the PR body
and the `piv-review-pr` gate read — especially **Deviations** (a documented deviation is an *intentional*
decision the reviewer should not flag), **Not run**, **Additions beyond the plan** and **Proving the checks**:

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
reviewer's signal of intent — a documented deviation is an intentional decision they should not flag.
Or "none".}

## Assumptions carried
{Plan-sanctioned options you chose, and assumptions you honoured. NOT deviations — 42% of this repo's
reports file these as deviations and bury the real ones. Or "none".}

## Additions beyond the plan
{Anything you added that the plan did not ask for, and why. "None" if none.}

## Issues encountered
{Anything notable, or "none".}
```

### Ready for the next step
- Confirm all changes are complete and validations pass.
- Next: `piv-commit` the work, then `piv-create-pr` to open the PR (the report fills the PR body), then `piv-review-pr`.

## Notes

- If you encounter issues not addressed in the plan, document them
- If you need to deviate from the plan, explain why
- If tests fail, fix implementation until they pass
- Don't skip validation steps
- Every figure in the report names the command that produced it. Nine review findings in this repo are a
  figure in a report or PR body that did not survive the reviewer re-deriving it
  (`.claude/system-reviews/process-sweep-2026-09-04.md`, R5).
