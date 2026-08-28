---
name: piv-create-pr
description: Push the current feature branch and open a pull request, ready for review. Use after a ticket's implementation is committed on its own branch — it detects the base branch, pushes, opens the PR with a clear body (summary · what changed · validation status), and returns the URL to hand to a reviewer.
argument-hint: "[--base <branch>] (default: auto-detected)"
---

# Create PR: Open the Pull Request, Hand Off for Review

This is the **ship** step of the PIV loop: the implementation is committed on a feature branch; now open the PR
so it can be reviewed (by the `piv-review-pr` agentic gate, then a human).

## Phase 0 — Detect the base branch

Don't hardcode `main`. Resolve it:
1. If `$ARGUMENTS` contains `--base <branch>`, use that.
2. Else: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
3. Fallback: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`
4. Last resort: `main`. Store as `{base}`.

## Phase 1 — Validate git state

```bash
git branch --show-current
git status --short
git log origin/{base}..HEAD --oneline
```

| State | Action |
|-------|--------|
| On `{base}` | STOP: "Create a feature branch first (the ticket should be on its own branch)." |
| Uncommitted changes | STOP: "Commit (or stash) before opening the PR." |
| No commits ahead of `{base}` | STOP: "Nothing to PR." |
| Existing PR for this branch (`gh pr list --head $(git branch --show-current) --json url`) | STOP and print the URL. |
| Clean, commits ahead, no PR | PROCEED |

## Phase 2 — Gather context for the body

- Commits: `git log origin/{base}..HEAD --pretty=format:"- %s"`
- Files: `git diff --stat origin/{base}..HEAD`
- **Implementation report** (if `piv-implement` wrote one — `.claude/reports/<…>-report.md`): pull the summary,
  validation results, and **documented deviations** (these belong in the PR body — they tell the reviewer what
  was intentional).
- Linked ticket / issue: look for `ACC-…`, `#123`, `Fixes #…` in the commits/branch name.
- PR template: if `.github/PULL_REQUEST_TEMPLATE.md` exists, fill it; else use the default below.

## Phase 2.5 — The figures gate (BLOCKING)

Numbers in a PR body are the surface that has gone wrong most often in this loop, and always by the
same mechanism: a figure is copied plan → report → PR body → handoff note and re-derived at none of
them. The provenance label is usually *present* — it just names a run that is no longer the current
one. Two checks, both executable, because prose reminders about this have demonstrably not worked.

**1. The validation block is generated, never typed.**

```bash
scripts/record-gate.sh <the project's gate command>
# e.g. scripts/record-gate.sh pnpm turbo run typecheck lint test build --force
```

It runs the gate, stamps the result with the commit it describes, writes `.claude/last-gate.json`,
and prints a Validation block. **Paste that block verbatim into the body.** Do not retype a count,
a duration or a suite total by hand — that retyping is the defect.

Then, before opening or updating the PR:

```bash
jq -r .head .claude/last-gate.json    # must equal:
git rev-parse HEAD
```

| State | Action |
|-------|--------|
| No `.claude/last-gate.json` | STOP: run `record-gate.sh` first. |
| `.head` ≠ current `HEAD` | STOP: the record describes a different tree. Re-run the gate. |
| `.exit_code` ≠ 0 | STOP: the gate is red. Fix it, or open as `--draft` and say so in the body. |
| Matches, exit 0 | PROCEED |

Add `.claude/last-gate.json` to `.gitignore` — it is a per-run artifact, not a repo artifact.

**2. Every other figure is checked for inheritance.**

```bash
scripts/inherited-figures.sh <draft-body.md> .claude/reports/<…>-report.md [<previous-body.md>]
```

Pass the implementation report always, and the PR's previous body whenever you are **updating** an
existing PR (`gh pr view <n> --json body -q .body > prev-body.md`) — that is the case a rebase
creates, and the one that has bitten hardest. Every measurement it prints is unaudited, not
necessarily wrong. For each: re-derive it at this head, or state in the body why it is
head-independent. Exit 1 is expected on a first run; the check has done its job when you have
answered each line, not when it prints PASS.

**Two things neither check catches, so do them by eye:**

- **A right number under a wrong label.** #87 shipped a best-case interval labelled worst-case; the
  arithmetic was correct. If a figure names a case (worst/typical/at the cap), verify the case, not
  the digits.
- **A claim with no numeral in it.** On 2026-08-18 a PR body asserted "GitHub retargets this to
  `main` automatically when the base merges" — false for any repo with `deleteBranchOnMerge: false`,
  and no check would have flagged it. Retire a claim by its **subject**: grep the noun, not the
  sentence, and check the PR body too, which is the most-read surface and the only one not in the
  working tree.

## Phase 3 — Push and open the PR

```bash
git push -u origin HEAD
```

```bash
gh pr create --base "{base}" --title "{type}: {concise description}" --body "$(cat <<'EOF'
## Summary
{1-2 sentences: what this ticket delivers}

## What changed
{commit summaries}

## Validation
{the block record-gate.sh printed, pasted verbatim — counts, duration and the commit it ran at}
- Manual check: {what was exercised, or "not run" — never leave this implied}

## Notes for the reviewer
{documented deviations from the plan — intentional decisions — or "none"}

## Linked
{Closes #<n> — written bare, at the start of the line. Never wrap the closing keyword in backticks: GitHub
does not parse closing keywords inside inline code, so the merge leaves the issue open. Or "none".}

_Ready for review._
EOF
)"
```

(`{type}` = feat/fix/refactor/… from the work. Use `--draft` if the work isn't ready for a real review.)

## Output

```bash
gh pr view --json number,url,title,baseRefName,headRefName,closingIssuesReferences
```

**If the work had a ticket and `closingIssuesReferences` is `[]`, GitHub did not link it** — the closing
keyword is missing or backticked. Fix the body (`gh pr edit <n> --body-file …`), re-run the check, and only
then report. Merging an unlinked PR leaves the issue open with no signal: #110 shipped with `Closes #108`
inside backticks, and #108 sat open after the merge until someone noticed by hand.

Report the PR number + URL, the base ← head branches, and **"Ready for review → run `piv-review-pr <number>`, then a
human approves."** This is the handoff point: the agent's loop ends at an open PR; review and merge are the gates.

## Notes

- Tool-agnostic in spirit: this skill uses GitHub (`gh`); the same motion is "open a merge request" on GitLab,
  or "mark ready for review" wherever your team works. Solo with no remote? Skip the PR — commit on `{base}` and
  review your own diff before moving on.
- Sets up parallel work: one branch per ticket → one PR per ticket is exactly what makes worktree parallelism
  (running independent tickets at once) clean.
