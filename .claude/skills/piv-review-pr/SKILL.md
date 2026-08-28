---
name: piv-review-pr
description: Full pull-request review — fetch the PR, run the project's validation, review the diff with fresh eyes (dispatching the code-reviewer agent), categorize issues by severity, post the review to GitHub (approve / request-changes / comment), and save a report. The agentic gate that runs on an open PR before a human approves. Use after piv-create-pr.
argument-hint: "<pr-number | pr-url | branch> [--approve | --request-changes]"
---

# Review PR: The Agentic Gate Before the Human

**Input**: $ARGUMENTS

The point of this skill is **fresh eyes**: it reviews the PR in a clean context — *not* the context that wrote
the code — and can hand the deep analysis to the **`code-reviewer` agent**, which is the whole reason the review
catches what the author's own context rationalizes away. It posts its verdict on the PR, then a **human** makes
the final call.

## Phase 1 — Fetch the PR

Resolve the input to a PR number (a number, a URL, or a branch via
`gh pr list --head <branch> --json number -q '.[0].number'`). Then:

```bash
gh pr view {N} --json number,title,body,author,headRefName,baseRefName,baseRefOid,state,additions,deletions,changedFiles,files
gh pr diff {N}
gh pr checkout {N}
```

State guard: `MERGED`/`CLOSED` → stop ("nothing to review"); `DRAFT` → review direction, don't approve/block.

## Phase 2 — Load the context (so you review against the right bar)

- **`CLAUDE.md`** + any `.claude/references/` — the project's standards are the review rubric.
- **The implementation report** (if `piv-implement` wrote one — `.claude/reports/*{branch}*`) + its plan: read the
  **documented deviations**. A documented deviation is an *intentional decision*, **not** an issue — only flag
  *undocumented* divergences. (No report? Review normally and note its absence.)
- The PR's own intent (title/body): what problem it claims to solve.

## Phase 3 — Run validation

Run the project's real suite (the **`piv-validate`** skill, or the plan's validation commands) — tests, type-check,
lint, build. Capture pass/fail + counts. A red suite is a finding in itself.

## Phase 4 — Review the diff (dispatch the code-reviewer agent)

Hand the deep pass to the **`code-reviewer` agent** (`.claude/agents/code-reviewer.md`) — it reviews against the
project's standards and reports **high-confidence issues only**. Read every changed file *in full* (not just the
diff) for context. Cover: correctness · type safety · pattern/standards compliance · security · performance ·
tests present · maintainability.

**Categorize every issue by severity:**

| Severity | Meaning |
|----------|---------|
| **Critical** | Blocking — security, data loss, crashes |
| **High** | Should fix before merge — type-safety holes, missing error handling, logic errors |
| **Medium** | Pattern inconsistencies, missing edge cases, *undocumented* deviations |
| **Low** | Suggestions, minor polish |

Acknowledge what's done well, too — review is constructive, not just a defect list.

### The numbers pass — do this explicitly, it is not covered by the agent

typecheck, lint, test and build cannot read prose, so **you are the only gate on every figure in the PR
body and the implementation report.** Two consecutive tickets shipped a false number to `main` (#87, #107)
and both times the reviewer re-deriving it was the first and only check.

Enumerate every figure and ask of each: **which run produced this?**

- Can it name one → `observed`. Spot-check that the run's own output actually says so.
- It cannot → it is `derived` or `expected`, and must say which. **A derived figure sitting under an
  "Observed" heading is a finding**, at the severity its downstream use warrants — a number that a later
  ticket could de-scope work on is **High**, not Low.
- Correct arithmetic does not make a figure observed. #107's `30 = 6 cells × 5 polls` was sound arithmetic,
  truthfully passed its own "show the arithmetic" AC, and still described a run that never happened.

When a figure credits a mechanism ("proves the cache saves 5×"), ask **what was held constant to isolate
it**. If the experiment cannot distinguish the credited mechanism from something else in the path, the
attribution is the defect even when the count is right.

The same applies to a **failure and its cause**. Real red output plus an inferred cause is still an
unverified claim: ask what in the code *permits* the cause just named, and read that code. #121 saw 8
integration tests fail, named Redis, and wrote it into `CLAUDE.md`, the implementation report, the PR body
and a new GitHub issue — while `test/harness.ts` overrides the store in question with an in-memory one, so
the mechanism could not fire. **A digit that survives re-observation is not licence to rewrite the sentence
around it.**

Check the claim's **subject**, not just its digits — grep the noun (`quantiz`, `grid`, the issue number)
and read every hit. A retired claim survives as a verb ("the cache this script *measures*") long after its
number is gone, and it survives in the **PR body**, which is the most-read surface and the only one not in
the working tree.

### The guarantees pass — when the base moved under this PR

A rebase onto a merged base sweeps *figures* well, because figures look like figures. It does not sweep
**guarantees**, and a guarantee invalidated by a sibling merge fails silently — the suite stays green
because both sides were re-run, and only the *relationship* between them broke. #121 shipped one to review
in a file whose own comment named the exact condition that would invalidate it.

**The trigger, so it is observable rather than remembered:** compare Phase 1's `baseRefOid` against the
`**Base** … @ <sha>` recorded in the newest existing `.claude/code-reviews/pr-{N}-review*.md`. Different → the
base moved, run this pass. No prior report → first round, skip it. `baseRefName` alone cannot answer this: a
rebase leaves the name identical.

For every PR whose base changed since the last review round:

- **Re-read the previous round's own rebase notes and close each by re-derivation, not by a green run.** A note
  that says "after this rebase, re-run X and Y" is discharged only when the *relationship* it names has been
  re-derived. #121's round 1 named the `countAttempts` coupling exactly and was closed by re-running two specs;
  they passed, because the divergence was structurally untestable, and the guarantee shipped broken to round 3.
  A passing suite is not evidence about a relationship no fixture can express.
- Grep the diff for **conditional comments** — "if X changes, this needs re-deriving", "as long as",
  "assuming", "the same row set". Each is a tripwire someone set deliberately. Check whether the condition
  fired; if it did, the comment is now a warning about something that has already happened.
- Grep for **absolute claims** in docblocks, the report and the PR body — "returns null when", "always",
  "never", "the same as", "cannot". Re-derive each against the merged base, not the pre-rebase tree they
  were written on.
- Where two surfaces count or compare the same thing, name the case where they **stop** agreeing. A pure
  function whose inputs cannot distinguish that case is a seam problem, not a fixture problem — say so,
  because no test can be added to catch it.

## Phase 5 — Decide

- **Approve** — no critical/high issues, validation passes, matches intent.
- **Request changes** — high issues, or fixable validation failures, or undocumented pattern violations.
- **Block** (request-changes, strongly) — critical security/data issues, or wrong fundamental approach.
- Honor an explicit `--approve` / `--request-changes` flag, but never approve over an unresolved critical issue.

## Phase 6 — Post to GitHub + save the report

Write the report to `.claude/code-reviews/pr-{N}-review.md` (summary · issues by severity with `file:line` + fix ·
validation table · what's good · recommendation). **The header must carry `**Head** <sha> · **Base** <ref> @
`<baseRefOid>`** — the base SHA is what makes the next round's guarantees pass triggerable; a base *name* is
unchanged by a rebase and so cannot detect one. Then post it:

```bash
# approve
gh pr review {N} --approve --body-file .claude/code-reviews/pr-{N}-review.md
# request changes
gh pr review {N} --request-changes --body-file .claude/code-reviews/pr-{N}-review.md
# or just comment (draft PRs / advisory)
gh pr comment {N} --body-file .claude/code-reviews/pr-{N}-review.md
```

## Output + hand off

Print: PR number/URL · issue counts by severity · validation results · the recommendation. Then hand off:
**"Posted on the PR. A human now reviews the code + this review and merges."** If there are issues, the natural
next step is **`piv-fix-review-findings`** on the report, then re-run validation.

## Notes

- **Fresh eyes is the whole point** — run this in a clean context (or let the `code-reviewer` agent be the clean
  context). Don't review with the session that wrote the code; it rationalizes instead of scrutinizing.
- This is the *agentic* gate; it does not replace the human — it gives the human a validated, triaged PR to
  approve. Going deeper (multiple review agents, tuning the reviewer to your stack, the validation pyramid) is
  the code-review-as-a-component material later in the course.
