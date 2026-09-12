# PR #403 review — the fix oracle runs end to end (#402)

**Head** `6c12f18` · **Base** `main` @ `27aef2e` · round 1 (no prior report — the guarantees pass does not apply)
**Reviewer** `piv-review-pr` · six independent dimensions in fresh contexts, each finding put to a 3-lens
adversarial panel (refute · reproduce · severity), then a completeness critic · **Verdict** request changes

## Summary

The PR answers #401's review honestly and its report is unusually candid about its own deviations. But the
centrepiece fix does not hold: **F1 was not fixed, it was re-shaped into a new instance of the same defect**,
and four more fail-open guards were introduced while closing others.

The through-line is the one #401's review already named: *this file is proved by a run whose author had the
whole ticket in context.* Every high finding below is something a fresh agent executing the text literally
hits on its first pass, and nothing in the file catches any of them. Five of the six are in prose this PR
wrote.

Three of the report's own evidence claims are false, and one of them — the `bash -n` table — was produced by
a substitution applied to the block this PR added but not to the block it calls pre-existing.

## Issues

### F1 · High — `$S` and `$CODEQL` cannot reach the snippets that use them

`.claude/skills/piv-fix-review-findings/SKILL.md:49-54`

#401's F1 was: *three variables carried the oracle and none was assigned.* This PR answers it by adding
`S=$(mktemp -d)` and `CODEQL=${CODEQL:-…}` to §0.5's fenced block, then pinning them at `:53-54`:

> Those are the only assignments to `$S` and `$CODEQL` in this file … An agent that improvises them instead
> builds both sides of the oracle over the same tree.

**The agent executing this skill runs each fenced block as a separate Bash tool call, and shell state does not
survive between calls.** The harness contract says so in as many words: *"Working directory persists between
calls, but … Shell state (env vars, functions) does not persist."* §0.5's block and §2's five oracle blocks are
separated by the entire triage section and, in practice, by minutes and many tool calls.

**Measured, two consecutive Bash calls this session:**

```
call 1:  export TESTVAR_ORACLE=$(mktemp -d); S=$(mktemp -d); echo "[$TESTVAR_ORACLE] [$S]"
      -> [/var/folders/qc/…/tmp.njoSoSFEVp] [/var/folders/qc/…/tmp.AwJvBbL7do]
call 2:  echo "[${TESTVAR_ORACLE:-EMPTY}] [${S:-EMPTY}] [${CODEQL:-EMPTY}]"
      -> [EMPTY] [EMPTY] [EMPTY]
```

**Failure scenario.** The agent runs §0.5's block, gets a scratch dir, refuses or proceeds, then reaches §2's
step 1 in a new call where `$S` is empty. `git worktree add --detach "$S/pr-$N" FETCH_HEAD` becomes
`git worktree add --detach "/pr-403" FETCH_HEAD` — it tries to write at the filesystem root, or succeeds
somewhere unintended. Every subsequent `"$S/dbA"`, `"$S/outA.sarif"` lands in the same wrong place.

**And `:53-54` forecloses the repair.** The one thing a competent agent would do — recompute the paths in each
block — is now named as the error. That sentence converts a substrate limitation into a prohibition.

**Fix.** Replace "these are the only assignments" with an execution rule the substrate supports: either name a
deterministic root every block recomputes identically (`S="${TMPDIR:-/tmp}/codeql-pr-$N"; mkdir -p "$S"`, and
drop `mktemp -d`), or state that the assignment block is a **preamble to be prepended to every later block**.

### F2 · High — the B-side's only correctness assertion cannot run

`.claude/skills/piv-fix-review-findings/SKILL.md:260-262`

`FETCH_HEAD` is a **per-worktree** ref. `git worktree add --detach "$S/pr-$N-fixed" FETCH_HEAD` resolves it in
the *main* worktree and creates a new one whose git dir has no `FETCH_HEAD` at all. So `:262`'s
`git -C "$S/pr-$N-fixed" diff --stat FETCH_HEAD` is fatal **every single time**.

**Reproduced (git 2.52.0, throwaway clone):**

```
$ git worktree add -q --detach "$T/wt-a" FETCH_HEAD          # succeeds
$ git -C "$T/wt-a" diff --stat FETCH_HEAD
fatal: ambiguous argument 'FETCH_HEAD': unknown revision or path not in the working tree.
$ ls "$(git -C "$T/wt-a" rev-parse --git-dir)" | grep -c FETCH_HEAD
0
```

`:261`'s `git diff FETCH_HEAD -- <files> | git -C … apply` is also unchecked — the pipeline takes `apply`'s
status and nothing tests it, unlike step 1's fetch which is chained with `&&`.

**Why this is the same class as F1.** The prose leans on this assertion entirely: *"An empty `--stat` is that
failure, which is why the assertion is *every* file and not merely *no others*."* The check written to prevent
a vacuous B-side is itself vacuous — it produces a fatal error whose output is indistinguishable from the empty
stat it defines as the failure signal.

**Fix.** Pin the merge SHA once after the fetch — `M=$(git rev-parse FETCH_HEAD)` — and use `$M` in both
`worktree add` calls and both `diff` calls. Then check the transfer:
`… | git -C "$S/pr-$N-fixed" apply || { echo 'patch did not transfer — B would be a rebuild of A'; exit 1; }`.

### F3 · High — the A→B delta is not "the fix and nothing else"

`.claude/skills/piv-fix-review-findings/SKILL.md:254-262`

A is `FETCH_HEAD`, the **merge** commit. B is built by applying `git diff FETCH_HEAD -- <files>` — merge commit
vs. the **working tree**, which is on the branch. Two independent vectors:

- **Base drift.** If the branch is behind base and base touched a file you fixed, the patch contains base's
  contribution *inverted*, so applying it reverts base inside B. It always applies cleanly, because the patch
  was computed against the very tree it is applied to.
- **Accumulation.** The loop is per-alert (`:227` "Per alert") and fixes accumulate in one working tree
  (`:256` "Fix in the working tree as normal"). From alert 2 onward the patch carries fixes 1..n while A is
  pre-everything, so the oracle credits fix *n* for a clearance caused by fix 1.

The stated guard is filename-level and sees neither. A reviewer constructed the first case: A shows the alert,
B does not, `--stat` lists exactly one file — the one that was fixed — and the oracle certifies a fix that did
nothing while CI stays red.

This is the guarantee `:255` claims the second worktree provides. It does not provide it.

**Fix.** Derive B from the same base as A (apply only the fix's own hunks — commit it and use
`git diff <parent> <commit> -- <files>`), replace the filename check with a content-level one, and state a
precondition that the branch is not behind base.

### F4 · High — §4's new `$HEAD` re-read is unguarded, and empty `head_sha=` returns everything

`.claude/skills/piv-fix-review-findings/SKILL.md:347`

This PR added the `HEAD=` re-read to fix a stale-head read, and added a guard to `$J` beside it — but left
`$HEAD` itself unguarded, in a section whose other three values are all regex-checked.

**Measured today:**

```
$ gh api "repos/linardsb/ux-factory/actions/runs?head_sha=" --jq '[.workflow_runs[]|select(.name=="verify")]|length'
30
```

An empty `head_sha=` is not an error — it returns every run in the repo, `max_by(.created_at)` picks the newest
*unrelated* one, `$RUN` passes its numeric guard, and the verdict prints `success` off a different PR's scan.

It reads correctly *right now* only by coincidence: #403's run happens to be the newest in the repo.

**Fix.** The same 40-hex guard this PR added at `:78`, applied to `$HEAD` here.

### F5 · High — door 5's deletion exemption opens the door it guards

`.claude/skills/piv-fix-review-findings/SKILL.md:200`

The exemption added for #401's F7 is: *"`git ls-files --error-unmatch <path>` failing means the code is gone,
not relocated."* It does not mean that. A relocated file's **old path** is also untracked, so it fails
identically.

**Reproduced:**

```
$ git mv f.txt sub/f.txt && git commit -qm relocate
$ git ls-files --error-unmatch f.txt   ->  exit non-zero
```

Door 5 exists to stop exactly one move: extracting offending code into a file the allowlist does not match. The
new exemption makes that move pass the control, because moving a file and deleting a file are the same signal
to the test chosen.

**Fix.** Test the content, not the old path — require the alert's code to be absent from the whole tree
(`git grep`), or require `git log --diff-filter=D` to show a deletion with no corresponding add.

### F6 · Medium — F5's cleanup command is a git usage error

`.claude/skills/piv-fix-review-findings/SKILL.md:241`

`git worktree remove --force "$S/pr-$N" "$S/pr-$N-fixed"` passes two worktrees. The command takes one.

```
$ git worktree remove --force "$T/wt-a" "$T/wt-b"
usage: git worktree remove [-f] <worktree>
$ git worktree list | tail -n +2 | wc -l
2                       # both still registered
```

The prose names this command as the thing that prevents the hazard (*"is not housekeeping — without it a reaped
`mktemp` directory leaves an entry that sessions which never ran this skill trip over"*), so #401's F5 leak
survives the PR that claims to close it, and the report ticks F5 as fixed.

**Fix.** Two calls, or a loop.

### F7 · Medium — `FETCH_HEAD` is shared mutable state across sibling sessions

`.claude/skills/piv-fix-review-findings/SKILL.md:260, 261, 262`

There are three new uses of `FETCH_HEAD` minutes after the fetch that wrote it, in a working directory this
repo's own CLAUDE.md documents as shared by parallel sessions. Any sibling `git fetch` clobbers it, and the
B-side is then built from a different commit than the A-side with nothing to notice.

Same fix as F2 — pin `M=$(git rev-parse FETCH_HEAD)` once.

### F8 · Medium — `--codescanning-config` is CWD-relative, so scope comes from the wrong tree

`.claude/skills/piv-fix-review-findings/SKILL.md:251, 267`

Both `database create` calls this PR added pass `--codescanning-config=.github/codeql/codeql-config.yml`, a path
relative to the agent's CWD (the working tree), while `--source-root` points at the merge-ref worktree. A
reviewer measured with the real 2.27.0 bundle that CodeQL resolves the config against CWD. So the tree judged
comes from `refs/pull/$N/merge` but the allowlist scoping it comes from whatever the working tree holds — and
door 2 forbids editing the config, so nothing flags the mismatch.

This matters because the PR added the flag specifically to give `$DB` "the gate's scope".

**Fix.** `--codescanning-config="$S/pr-$N/.github/codeql/codeql-config.yml"` (and the `-fixed` equivalent).

### F9 · Medium — `$DB` is bound per-alert; the pre-push full-suite scan points at it

`.claude/skills/piv-fix-review-findings/SKILL.md:263, 272, 292-293`

`DB="$S/dbB"` sits inside step 4 of the per-alert loop, but `:272` tells the reader it is the database *"the
pre-push full-suite scan below"* reads, and that scan runs **once**. On a multi-alert PR it covers only the last
alert's tree. The pre-push scan is the file's own best idea (it caught the `js/reflected-xss` regression that
made #401's D5); pointing it at a per-alert database quietly narrows it.

### F10 · Medium — "this PR neither adds nor removes any" second person is false

`.claude/reports/oracle-runnable-402-report.md` Deferred · PR body Deferred

```
$ git show 27aef2e:…/SKILL.md | grep -ocE '\b(you|your|yours|yourself)\b'   -> 10
$ grep -ocE '\b(you|your|yours|yourself)\b' …/SKILL.md                      -> 17
```

Seven added, six of them in new authorial prose this PR wrote (`:232, 244, 246, 247, 251, 252, 268`). The
Deferred entry frames the convention as pre-existing and untouched; the PR is in fact the largest single
contributor to it in the file's history.

### F11 · Medium — the `bash -n` evidence is not reproducible, and hides a defect in this PR's own block

`.claude/reports/oracle-runnable-402-report.md:84` · PR body validation table

The report's table — *"10 bash blocks · 9 ok · block 8 is §3's pre-existing `<explicit paths>` placeholder"* —
was produced by substituting placeholders in some blocks but not others. Re-run with no substitution, which is
what an agent pasting the block actually does:

```
block 6: ok            placeholders=['<resolved>']
block 7: SYNTAX ERROR  placeholders=['<the files you fixed>', '<resolved>']   <- ADDED BY THIS PR
block 8: SYNTAX ERROR  placeholders=['<explicit paths>']                      <- called "pre-existing"
```

**Block 7 is the new B-side.** It carries the same placeholder defect the report attributes exclusively to a
pre-existing block, and the claim *"Every block this PR touched parses"* is false. The substitution list in the
harness happened to cover block 7's placeholder and not block 8's, which is what produced the clean 9.

This is a check that could not fail, in the report of a PR about checks that cannot fail.

### F12 · Medium — the validation table's label and its evidence name different commits

`.claude/reports/oracle-runnable-402-report.md` validation table · PR body

Labelled *"All `observed`, at `de4eb40`"*, but the portal-smoke row inside it reads `bootSha==headSha==27aef2e`
— the base commit, which predates `de4eb40`. No gate is recorded at the head the label names.

(For the record: I re-ran all four gates at the real head `6c12f18` — all green, table below. The finding is the
mislabelling, not the state of the tree.)

### F13 · Low — `$CODEQL`'s fallback is a literal placeholder with no executable refusal

`.claude/skills/piv-fix-review-findings/SKILL.md:50, 221-226`

`CODEQL=${CODEQL:-$(command -v codeql || echo "$HOME/.codeql/<the Action's bundle version>/codeql")}` yields a
non-empty string containing the literal text `<the Action's bundle version>` when the CLI is absent. `:224`
requires refusing by name in that case but gives no command, so the emptiness test an agent reaches for
(`[ -n "$CODEQL" ]`) always passes. Every other guard in this file is written out; this one is prose.

**Fix.** `[ -x "$CODEQL" ] || { echo "no CodeQL CLI at [$CODEQL] — …"; exit 1; }` beside the assignment.

### F14 · Low — `print-baseline-info` is not a subcommand

`.claude/skills/piv-fix-review-findings/SKILL.md:200`

In bundle 2.27.0 — the one `$CODEQL` resolves to locally — it is `print-baseline`. Pre-existing wording, but
this PR edited that exact sentence.

### F15 · Low — F2's `200` is first-hand in the shipped text, second-hand in the report

`.claude/skills/piv-fix-review-findings/SKILL.md:231` · PR body

The report honestly splits it: `200 · be565ff (reviewer, observed)` / `404 (observed today)`. SKILL.md and the
PR body both flatten it to *"Measured on one PR in both states"*. Only the `404` half was measured by this PR —
#401 was already merged. (The reviewer's `200` is credible: `be565ff`'s parents are `79f414e` and `1597941`,
genuinely #401's merge commit.) One clause restores the attribution.

### F16 · Low — the `codeql` job range does not re-derive

`.claude/reports/oracle-runnable-402-report.md` Deferred

"71–94s across eleven PR jobs", inherited from #401's review. Re-derived from the Actions API: 26 concluded PR
`codeql` jobs before that review, range **69–97s**. The argument (the figure names its own sample and gates
nothing) stands without the comparison number.

### F17 · Low — `per_page=100`'s evidence does not support its claim

`.claude/skills/piv-fix-review-findings/SKILL.md:96`

*"the default page is 30, `refs/pull/391/merge` already carries 9 (observed)"*. 9 re-derives exactly, but it is
3.3× **below** the page size it is offered as evidence against. The fix is right and fails closed; the sentence
argues for it with a number that does not demonstrate the breach.

### F18 · Low — body length against the standard, not recorded

`SKILL.md` body: `3376 → 4287 → 4362` words across `27aef2e → de4eb40 → 6c12f18` (frontmatter stripped), against
`skill-standards.md`'s "Target 1,500–2,000 words, hard ceiling ~5k" and its spine/resources split. The additions
are almost entirely *justification* — exactly what the standard routes to `references/`, and the directory has
none. Either split it or record the threshold in Deferred.

## Refuted by the panel

Filed by a reviewer, then killed on verification. Recorded so they are not re-filed:

- **The A/B pass condition has no defined subject** (local SARIF carries no `alert.number`) — 2/3 refuted; the
  rule id + path + line is a sufficient subject locally.
- **No plan artifact for #402** — 3/3 refuted; a review-fix round is not a planned ticket, and CLAUDE.md's rule
  is about a ticket's own plan.
- **"28 untracked and 3 modified"** — 2/3 refuted; re-derives once this PR's own new artifacts are excluded.
- **`S=$(mktemp -d)` leaks on refusal paths** — 2/3 refuted; a `mktemp` dir on a refusal path is reaped and
  costs nothing.
- Two further variants of the shell-state and `$CODEQL`-placeholder claims, refuted in the narrow form they were
  filed in; both survive in the sharper form above (F1, F13).

## Validation

All `observed`, re-run by this review at the real head `6c12f18`.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | staged, then `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4795 node portal/server.mjs` | `/api/health` `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`6c12f18`; `Origin: https://evil.test` → `403` |
| CI | `gh pr checks 403` | `verify` · `visual` · `codeql` · `audit` · `gates-green` · `CodeQL` all pass; `mergeStateStatus` CLEAN |
| this PR's own gate | jobs API, step `Require no high or critical alerts` | `success` |

The suite is green and says nothing about any finding above — which is the point of the file under review.
No `loc-summary` regen or visual-regression baseline is owed; the diff touches `.claude/` only.

## What's good

- **The report discloses its own deviations unprompted** — F1 step 4's patch-transfer design is flagged as the
  author's call rather than the reviewer's instruction, in both the report and the PR body, under a "Needs a
  human look" heading. That disclosure is what let this review go straight at the weakest point.
- **The ninth defect was self-caught and committed separately.** `git diff HEAD` → `git diff FETCH_HEAD`
  (`6c12f18`) is a real fail-open found after the first push and fixed with its own commit and message. The
  reasoning was right; F2 shows the replacement has its own problem, but the instinct and the disclosure were
  correct.
- **F2's evidence is better than the review asked for.** Measuring `git/ref/pull/401/merge` in both states on
  the *same* PR is a stronger proof than #401's cross-PR sample, and re-confirming on #403 while open closes it.
- **F4's hedge is the right shape.** Rather than picking a side on an undocumented mechanism, it states the
  dependency, names #400, and tells the agent to say which reading it acted on.
- **F6's reclassification is exactly right** — keeping the standing rule while saying plainly that it cannot
  fire under the current allowlist, instead of deleting it or leaving it as a live route.
- **`Closes #402` present, issue real and open, commits atomic with full trailers**, the #401 review file folded
  in as its reviewer asked, and the report written before the push rather than after.

## Recommendation

**Request changes** — F1 through F5.

F1 is the one that matters: the PR's central claim is that the oracle now runs end to end, and it does not,
because the mechanism that carries it cannot cross a tool-call boundary. F2 and F5 are checks that cannot fail
in the direction they were written to catch — the exact defect class #401's review was about, reintroduced in
its fix. F4 is a fail-open added in the same edit that closed another.

F6–F12 are single-clause corrections. F13–F18 are polish, and F16–F18 could reasonably be deferred.

None of this makes the PR the wrong direction. Every fix targets a real defect and most land. The oracle needs
one more pass with the substrate's actual constraints in view — shell state does not persist, `FETCH_HEAD` is
per-worktree and shared, and a filename is not a content check.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014ndXfgiDENkeRZPqsvKWA5
