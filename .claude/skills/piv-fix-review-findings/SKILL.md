---
name: piv-fix-review-findings
description: Triage code-review findings (manual or AI) or a pull request's open CodeQL alerts, fix the ones you choose one at a time with tests, defer/log the rest, then validate — and if the work is on a PR, commit and push so the PR reflects the fixes. Use after a review has produced a list of issues or a review file, or when a PR's CodeQL security gate is red and its alerts need clearing without suppression.
argument-hint: "[code-review-file-or-issues | PR number for CodeQL alerts] [scope / what to fix now vs defer] [optional: cycle budget, default 3]"
---

# Fix Review Findings

A review produced findings — but a review is **input, not a work order.** You decide what happens to each one.

Code-review (a file, a description of issues, or a bare PR number to read that PR's CodeQL alerts): $1

Direction / scope (what to fix now vs defer): $2

Cycle budget for the CodeQL loop — optional, default 3, never higher: $3

If the Code-review is a file, **read the entire file first** so you understand every finding before triaging.

## 0. Check the ground before you start

Two things that are cheap to check now and expensive to discover at push time.

**Is the PR still open?** Find it (`gh pr list --head "$(git branch --show-current)"`) and read its state:

- **OPEN** → normal path; the fixes land on this PR at step 4.
- **MERGED / CLOSED** → say so **now**. The fixes need their own branch and PR, or a direct commit if the
  project allows one — settle which with the human before fixing, not after pushing. `piv-review-pr` guards
  this too, but this skill runs *after* it, and a solo repo can merge in between.

**Is the worktree actually yours?** `git status --porcelain`, plus a probe for an interrupted operation:

```bash
GD=$(git rev-parse --git-dir); ls "$GD"/MERGE_HEAD "$GD"/REBASE_HEAD "$GD"/CHERRY_PICK_HEAD 2>/dev/null
```

Use `git rev-parse --git-dir` — **in a worktree `.git` is a file, not a directory**, so `ls .git/MERGE_HEAD`
gives a false negative. If another session left a half-finished merge or staged work in the index, resolve
who owns it before committing; otherwise their work rides into your commit.

## 0.5 If the input is a PR number — read that PR's CodeQL alerts

A bare number in `$1` means CodeQL mode. Four steps, each with its own refusal, because **a zero meaning "nothing
was measured" is indistinguishable from a zero meaning "the code is clean".**

```bash
R=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
N=$1   # or: gh pr list --head "$(git branch --show-current)" --json number --jq '.[0].number // empty'
REF="refs/pull/$N/merge"
S=$(mktemp -d)   # scratch: worktrees, databases, SARIF. Every $S below is this one.
CODEQL=${CODEQL:-$(command -v codeql || echo "$HOME/.codeql/<the Action's bundle version>/codeql")}
```

Those are the only assignments to `$S` and `$CODEQL` in this file, and `$DB` is assigned once in §2's B-side.
An agent that improvises them instead builds both sides of the oracle over the same tree.

**1 — There is a PR.** Empty `N` → refuse by name: *"no open PR, so there is no `refs/pull/N/merge` and no CodeQL
analysis — this would measure nothing."* The workflow triggers on `pull_request` and push-to-default only, so an
unPRed branch is never scanned and the alerts query answers `[]` with exit 0 — identical to a nonsense ref.

**2 — An analysis exists.** Copy this from the gate's own step rather than paraphrasing it:

```bash
n=$(gh api "repos/$R/code-scanning/analyses?ref=$REF&tool_name=CodeQL" --jq 'length')
if ! [[ "$n" =~ ^[0-9]+$ ]]; then echo "analysis count on $REF is not a number: [$n] — cannot read this gate"; exit 1; fi
if [ "$n" -lt 1 ]; then echo "no CodeQL analysis on $REF — this would measure nothing"; exit 1; fi
```

The numeric guard is the point: `gh api` can exit 0 while its `--jq` stage prints nothing, and `[ "" -lt 1 ]`
returns non-zero as the **test's own** result, which `if` reads as "condition false" — the control then falls
through past its own error message. `${n:-0}` closes the empty value but not a whitespace one.

On a count of 0, sharpen the refusal rather than guess: `analyses?pr=$N` separates *never scanned* from *uploaded
under `refs/pull/N/head`* (the Action rewrites merge→head when the workflow checked out something other than the
merge commit, and `ref=…/head` then answers `200 []`). Still refuse; just say which.

**3 — That analysis covers *this* head.** The gate skips this check because it runs in the same job as `analyze`.
A skill polling from outside gets step 2 satisfied by a **stale** analysis — merge refs accumulate them
(`refs/pull/391/merge` carried 9, observed). An analysis's `commit_sha` is the *merge* commit, so compare its
second parent:

```bash
HEAD=$(gh pr view "$N" --json headRefOid --jq .headRefOid)
A=$(gh api "repos/$R/code-scanning/analyses?ref=$REF&tool_name=CodeQL&per_page=100" --jq 'max_by(.created_at).commit_sha')
P=$(gh api "repos/$R/commits/$A" --jq '.parents[1].sha')
for v in "$HEAD" "$A" "$P"; do [[ "$v" =~ ^[0-9a-f]{40}$ ]] || { echo "unreadable sha: [$v] — cannot judge currency"; exit 1; }; done
[ "$P" = "$HEAD" ] || { echo "newest CodeQL analysis on $REF covers $P, not the PR head $HEAD — refusing to read a stale gate"; exit 1; }
```

**The 40-hex guard is the same argument as step 2's, and this compare needs it more.** A rate limit, an auth blip
or a revoked scope empties the reads; one empty value fails closed, but both empty makes `[ "" = "" ]` **true**,
the stale-analysis refusal never fires, and the alerts are read off whatever analysis happens to be there. A guard
that fails open in the control written to stop a stale read is worse than no guard.

`max_by(.created_at)`, not `.[0]` — the list is newest-first today (observed), but that order is not in the API
contract, and picking the wrong end reads a stale scan as current. `per_page=100` closes the same hole one level
up: the default page is 30, `refs/pull/391/merge` already carries 9 (observed), and a `max_by` over page 1 alone is
that ordering assumption wearing a different hat. `--paginate` is **not** the fix — an aggregating `--jq` under it
runs per page (below) and `gh` refuses `--slurp` alongside `--jq`; past 100, pipe element-wise output to an
external `jq -s 'max_by(.created_at)'`. This one fails **closed** — an inverted order mismatches the compare and
the skill refuses — so it is a false-refusal risk, not a stale green.

**4 — Read the alerts** with the gate's own query, checking the exit status explicitly:

```bash
if ! gh api --paginate "repos/$R/code-scanning/alerts?ref=$REF&state=open&per_page=100" \
  --jq '.[] | select(.rule.security_severity_level == "high" or .rule.security_severity_level == "critical")
        | "\(.number)\t\(.rule.security_severity_level)\t\(.rule.id)\t\(.most_recent_instance.location.path):\(.most_recent_instance.location.start_line)"' \
  > "$S/blocking.tsv"; then echo "alert read failed — cannot judge this gate"; exit 1; fi
```

`set -euo pipefail` does not travel with a quoted one-liner, and a paginated read that fails on page 2 leaves a
file of zero blocking rows that `[ -s … ]` reads as clean. `.number` is prepended; the rest is byte-for-byte the
gate's query, so the two answer the same question.

Six ways this read goes wrong quietly:

- **Key every alert on `alert.number`**, never on `(rule.id, path, start_line)`. Line numbers drift from unrelated
  landings — one alert moved `:8046` → `:8058` because another PR landed above it, keeping its number. A
  triple-diffing loop calls the old line fixed and the new line a fresh out-of-scope finding: both false.
- **Never `GET code-scanning/alerts/<number>`.** For an alert that never reached the default branch it returns
  top-level `state: null` while `most_recent_instance.state` says `fixed`, so `.state != "open"` and
  `.fixed_at != null` disagree and are both wrong. Use the ref-scoped list. And `state=closed` is a query alias
  whose *returned* value is `fixed`, so a filter round-tripping its own value never matches.
- **Query `ref=`, not `?pr=`.** Both return the same set, but `ref=refs/pull/$N/merge` is what the gate queries and
  this verdict must be the same measurement. `?pr=` is only for sharpening the refusal above.
- **An aggregating `--jq` under `--paginate` runs per page** — `--jq 'length'` prints one number per page, not the
  total (observed: 17 pages → `5 5 5 … 3`). Keep the element-wise form and count externally; `--slurp` and `--jq`
  are mutually exclusive.
- **No server-side `severity=`.** A repeated `severity=` is last-wins, so `high OR critical` is inexpressible, and
  an unrecognised value fails **open** (`severity=bogus` returned every alert). Filter client-side, as the gate does.
- **A 403 is not an empty set.** The observed body — `"You are not authorized to read code scanning alerts."` —
  does not match the documented "Advanced Security is not enabled" wording, and cannot distinguish code scanning
  being off from a token without `security_events`. Refuse on it by name.

**What this read is not.** It is diff-informed: GitHub shows an alert on a PR only when *all* the lines it
identifies are in the PR's diff. So it answers **which alerts block this PR** and nothing else. It cannot falsify a
fix, because an alert leaves the set when it is fixed **or** when the next push's diff ranges stop covering its
lines. The fix oracle is §2's local A/B, always.

## 1. Triage first (the human's call)

Sort the findings before touching code. Honor any direction in the scope argument; if it's unclear, surface the
findings grouped and **ask** rather than fixing everything by default:

- **Fix now (this PR)** — real, in-scope, belongs with this change.
- **Defer / log as an issue** — real but later; don't bloat this PR. **Create a tracker issue** (or note it) instead
  of fixing it here.
- **Needs a human look / manual test** — anything you should inspect or test by hand before trusting it. Flag it,
  don't silently auto-fix.
- **Noise / won't-fix** — say why, then drop it.

Don't let the reviewer dictate scope — "real, but later" is a valid and common call; a clean small PR beats a
sprawling one.

### Routing CodeQL alerts through those buckets

- `high` / `critical` → **Fix now.** These, and only these, are what the gate fails on.
- `medium`, `low`, unrated → **report; do not fix, do not start a cycle.** Real findings, but not what is holding
  the PR. This bucket wins over the two routes below: they say *where* a blocking alert gets fixed, never that a
  non-blocking one gets fixed here.
- A blocking alert in a **generated** file → fix at its generator, regenerate, commit the output.
- A blocking alert whose fix would mean hand-editing a committed agent run → **defer, with the honesty contract as
  the reason.** A bad run is re-run, never edited. **In `ux-factory` this is a standing rule, not a live triage
  route:** as `.github/codeql/codeql-config.yml` stands, `traces/`, `replay/`, `discovery/<slug>/` and `handoff/`
  are outside `paths` entirely and `proto/compositions/**` is `paths-ignore`d, so no alert can arise in any of
  them. It is written for the day the allowlist widens, and for a repo whose config differs.

**The scope inversion — for this step only.** Two things will tell you to leave a gate-failing alert alone, and
neither governs here: the rules file's stay-inside-the-ticket rule, and the ticket's own out-of-scope list. **Every
alert failing the gate is in scope by definition**, whether or not the ticket named the file. That is the normal
case here, not an exception.

**The strict boundary, its mirror.** Fix every gate-failing alert and **nothing else** — the smallest edit that
clears the finding, no refactoring, no hardening-while-you-are-in-there. A non-blocking finding is reported, never
fixed here, and never starts another cycle.

**Write the checklist before editing anything.** All N blocking alerts, one line each. Do not re-scan while a line
is unticked. Count the ticks against N out loud — "3 of 3 fixed", or "2 of 3 fixed, and here is why the third could
not be." Never silence about the difference.

### No suppression — five routes, all closed

A finding is fixed in code, or deferred with a reason in the report.

1. **No dismissal** — not through the Security tab, not through `PATCH /code-scanning/alerts/<n>`.
2. **No `paths` / `paths-ignore` edit** in the CodeQL config. Widening an ignore to clear a red gate is the same
   defect as deleting the check: a node that edits its own gate configuration is not a gate.
3. **No `query-filters`** added to the config to drop a rule.
4. **No inline suppression** — worse than useless, which is why it needs naming. `// codeql[query-id]` is real
   syntax (`# codeql[…]` in Python and Ruby, plus legacy `// lgtm[…]`), so it is the first thing a model reaches
   for. It does anything only when an `@kind alert-suppression` query runs in the same analysis, and code scanning
   does not honour the resulting SARIF `suppressions` marker — it is absent from the supported-properties table,
   and `advanced-security/dismiss-alerts` exists precisely to convert that marker into API dismissals, which would
   be pointless otherwise. So the comment suppresses **nothing** while reading as a decision: a dishonest non-fix.
   There is no `@suppress` annotation in CodeQL at all.
5. **No moving code out of scope.** Allowlist entries are globs, not directories — `discovery/*.mjs` does not match
   `discovery/helpers/regex.mjs`. Extracting the offending code into a file the allowlist never matches comes back
   clean on **both** oracles with the config untouched, and nothing gates the allowlist. After each fix, require
   the alert's file to still be extracted: `unzip -l "$DB/src.zip" | grep -F '<path>'` must print a row, or read
   `codeql database print-baseline-info "$DB"`. **Exempt a file the fix deleted** — `git ls-files --error-unmatch
   <path>` failing means the code is gone, not relocated. The door being closed is *code moved to a path the
   allowlist does not match*, never *code removed*; the demo fixed by deletion at statement level, and file level
   is the same call one step up.

**Assert it on the API; do not trust the loop.** For every alert claimed fixed, the ref-scoped list must show
`state` moving `open` → **`fixed`**, never `dismissed`, with `dismissed_at`, `dismissed_by`, `dismissed_reason` and
`dismissed_comment` all `null` and `fixed_at` non-null. And the PR's diff must touch **no** CodeQL config file and
add no `codeql[` or `lgtm[` comment — the config escape and the source escape, both invisible to a "zero alerts"
check.

## 2. Fix the "fix now" set — one at a time

For each:
1. Explain what was wrong.
2. Make the fix.
3. Create and run a test that proves it. **For a CodeQL alert that test is the A/B below** — a fix nothing can
   falsify is not a fix.

### The fix oracle — a local single-query A/B

Needs the CodeQL CLI at the **same bundle version the Action used** (read it from the `codeql` job log), on `PATH`
or at `~/.codeql/<version>/codeql`. Never inside the repo — `.gitignore` does not cover it and 3.3 GB is stageable.

**No CLI → refuse by name:** *"no CodeQL CLI — the merge-ref query is diff-scoped and is not a fix oracle, so
nothing here can falsify a fix."* Do not degrade silently to the CI read; that is the same defect class as reading
a count off a ref with no analysis.

Per alert:

1. **Scan the tree the gate judges.** Fetch the merge ref rather than resolving it through the refs API: that
   call answers `200` while the PR is **open** and `404` once it is closed or merged. Measured on one PR in both
   states: `git/ref/pull/401/merge` → `200` (`be565ff`) while open, `404` after it merged; `399`/`394`/`391` →
   `404`, all merged. §0 requires an open PR before any of this runs, so the case that works is the only one
   you ever meet. Fetch anyway — a SHA is not a tree, and the oracle needs the files on disk.
   ```bash
   git worktree prune                                    # clear an entry a reaped scratch dir left dangling
   git worktree remove --force "$S/pr-$N" 2>/dev/null    # `pr-$N` is a fixed name and this loop repeats
   git fetch origin "refs/pull/$N/merge" && git worktree add --detach "$S/pr-$N" FETCH_HEAD
   ```
   The registration lives in **this** repo's `.git/worktrees/`, which every sibling session shares, so
   `git worktree remove --force "$S/pr-$N" "$S/pr-$N-fixed"` at the end of the loop is not housekeeping — without
   it a reaped `mktemp` directory leaves an entry that sessions which never ran this skill trip over.
2. **Resolve the query** without hardcoding a pack version:
   `"$CODEQL" resolve queries codeql/javascript-queries | grep -i '<QueryName>.ql'`
3. **A-side — the positive control.** Build a database on the **pre-fix** tree — the step-1 worktree, nothing
   else — run that one query, and require it to **list the target alert**. If it does not, the harness is
   measuring nothing and the cycle is refused: a local zero out of a vacuous database looks exactly like a clean
   tree.
   ```bash
   "$CODEQL" database create "$S/dbA" --language=javascript-typescript \
     --codescanning-config=.github/codeql/codeql-config.yml --source-root="$S/pr-$N" --overwrite
   "$CODEQL" database analyze "$S/dbA" "<resolved>.ql" --format=sarif-latest --output="$S/outA.sarif" --rerun
   ```
4. **B-side — the same query on a tree that differs from A by the fix and by nothing else.** **Never your working
   tree:** sibling sessions share it, so the A→B delta would carry their untracked files and any base drift along
   with your fix and neither side could say which cleared the alert. Fix in the working tree as normal, then
   transfer that fix onto a second worktree of the same `FETCH_HEAD` and prove the delta is only what you edited.
   ```bash
   git worktree remove --force "$S/pr-$N-fixed" 2>/dev/null
   git worktree add --detach "$S/pr-$N-fixed" FETCH_HEAD
   git diff FETCH_HEAD -- <the files you fixed> | git -C "$S/pr-$N-fixed" apply
   git -C "$S/pr-$N-fixed" diff --stat FETCH_HEAD    # EVERY file you fixed, and no others
   DB="$S/dbB"
   "$CODEQL" database create "$DB" --language=javascript-typescript \
     --codescanning-config=.github/codeql/codeql-config.yml --source-root="$S/pr-$N-fixed" --overwrite
   "$CODEQL" database analyze "$DB" "<resolved>.ql" --format=sarif-latest --output="$S/outB.sarif" --rerun
   ```
   The alert must be absent from `outB.sarif` while present in `outA.sarif` — **both halves, or the run proves
   nothing.** Diff against `FETCH_HEAD`, never `HEAD`: `git diff HEAD` is empty the moment the fix is committed —
   on cycle 2, or any time validation ran first — and an empty patch transfers nothing, so B is a rebuild of A,
   both sides show the alert and the loop reads a working fix as a failed one. **An empty `--stat` is that
   failure**, which is why the assertion is *every* file and not merely *no others*. `$DB` is this database, and it is `--codescanning-config` at `create` that gives it the gate's
   **scope**, which door 5's extraction control and the pre-push full-suite scan below both read. A later cycle
   that changes the fix rebuilds it.
5. **Secondary sanity:** `grep baselineLinesOfCode "$S/dbA/codeql-database.yml"` is non-trivial. ~35s a side.

Reading the SARIF back:

- **Severity is a number carried as a string.** The API's `high`/`critical` never appear in SARIF. Filter on
  `properties["security-severity"]` using GitHub's mapping — over 9.0 critical, 7.0–8.9 high, 4.0–6.9 medium,
  0.1–3.9 low — so the gate's threshold is `>= 7.0`.
- **The rules may not be where the docs say.** The documented path is `runs[].tool.driver.rules[]`, but
  pack-sourced queries can land under `runs[].tool.extensions[].rules[]` with `result.rule.toolComponent.index`
  pointing at the extension. Look in both, resolve through `toolComponent`, and confirm against one real local
  `analyze` first — a parser that finds no rule entry scores every result 0.0 and reports zero high or critical.
- **`--codescanning-config` is an option on `database create` and `init` only, never on `analyze`**; the config's
  queries are applied by invoking `analyze` with **no** query argument. Pass it at `create` anyway: it also sets the
  database's **scope**, which both the extraction control above and the pre-push scan below depend on.
- **The A/B cannot see what the fix introduces, so it is not sufficient on its own.** It asks only about the rules
  already known. A fix can clear its own alert and raise a different one at the same line — measured on this repo:
  replacing `eval(q)` with `res.end(String(q))` cleared both `critical` alerts and raised `js/reflected-xss`, and
  the two-query A/B reported success. **Before the push, run the full default suite once** on the post-fix tree —
  `"$CODEQL" database analyze "$DB"` with **no** query argument, on a database built with the repo's
  `--codescanning-config` — and read the rows on the files the fix touched. That costs one scan and saves a CI
  round trip plus a cycle.
- **A full-tree local scan is confirmation at most, never the fix trigger.** It is a strict superset of the PR gate
  — whole tree, no diff ranges — so a local zero is stricter than the gate needs and is sufficient, while a local
  red is *not* evidence the gate is red. Findings outside the PR's diff belong on the base branch: report them,
  spend no cycle on them, scope with `git diff --name-only "$(git merge-base origin/main HEAD)"...HEAD`.
  **This routing depends on the merge-ref read being diff-scoped**, which is measured but undocumented: if the
  gate instead reads every open alert, as `.claude/references/gates.md`'s inherited-alert bullet describes, such a
  finding still blocks **this** PR and the cycle is owed here. Issue #400 settles which — until it does, say which
  reading you acted on.

### The loop and its budget

At most **three** cycles (`$3` may lower it, never raise it). Each cycle is **local**: fix → A/B → next. **Push
once**, after the checklist is fully ticked. The pushed CI scan is the confirmation, not the loop — a `codeql` job
costs 80–87s (measured across four runs) and re-scans nothing the local A/B has not already answered.

## 3. Validate

Run the project's own gates — whatever its rules file calls "done" — not a generic suite. `piv-validate` is the
house hand-off, but its body is tuned for a Python/FastAPI stack (`uv run pytest`, `mypy`, `ruff`, `uvicorn`) and
does not describe every project. **In `ux-factory` the four real gates are:**

```bash
node tooling/build-checks.mjs                               # the repo's main gate
git add <explicit paths> && node tooling/drift-check.mjs    # STAGED — see below
node tooling/token-lint.mjs
PORT=4788 node portal/server.mjs &  PID=$!                  # curl /api/health, then kill "$PID"
```

- **Stage before `drift-check`.** `gen-loc-summary` reads git-**tracked** content (`git show :<path>`), so a
  `--check` on an unstaged tree is a false pass that CI then catches.
- **Stage by explicit path, never `git add -A`.** Parallel sessions share this working directory; `-A` sweeps
  another ticket's work into the commit, which overrides `piv-commit`'s "add the untracked and changed files" step.
- **Kill the portal by PID or port only.** `pkill -f 'node server.mjs'` kills sibling sessions' recorders.

## 4. If operating on a PR — commit and push

If these fixes are on a PR branch, **commit them (use `piv-commit`) and push** so the PR reflects the fixes and the
review can re-run on the updated PR. If nothing was fixed (everything deferred), there's nothing to push — just make
sure the deferred items are logged as issues.

### Reading the gate back — CodeQL only

Push once, then **wait** before reading anything: `gh pr checks "$N" --watch --fail-fast`, or
`gh run watch "$RUN" --exit-status`. **Both exit non-zero when a check fails — which is the case this loop exists
for, not an abort.** Read the step conclusion anyway; never chain the wait with `&&`, or a red gate never reaches
its own verdict line. A read straight after `git push` either finds no run registered or matches the **previous**
head's run and reports a stale green. Waiting on the check is also enough for the API to be current —
`github/codeql-action/analyze`'s `wait-for-processing` defaults to `true`, so a *concluded* `codeql` check implies
the SARIF is processed and the alerts are queryable, which is cheaper than polling `analyses`.

```bash
HEAD=$(gh pr view "$N" --json headRefOid --jq .headRefOid)   # RE-READ: the push moved it, and 0.5's value is the pre-push head
RUN=$(gh api "repos/$R/actions/runs?head_sha=$HEAD" --jq '[.workflow_runs[]|select(.name=="verify")]|max_by(.created_at)|.id')
if ! [[ "$RUN" =~ ^[0-9]+$ ]]; then echo "no verify run on $HEAD — this measured nothing"; exit 1; fi
J=$(gh api "repos/$R/actions/runs/$RUN/jobs" --jq '.jobs[]|select(.name=="codeql")|select(.status=="completed")|.id')
if ! [[ "$J" =~ ^[0-9]{6,}$ ]]; then echo "no COMPLETED codeql job on run $RUN — the verdict line would print blank"; exit 1; fi
gh api "repos/$R/actions/jobs/$J" --jq '.steps[]|select(.name=="Require no high or critical alerts")|.conclusion'
```

**Re-read `$HEAD` here, and guard `$J`.** 0.5 bound `$HEAD` before the fixes existed; reusing it reads the run on
the pre-push head — the stale green this whole section is built to prevent. And
`select(.status=="completed")` emits nothing while the job is still running, so an unguarded `$J` makes the URL
`…/actions/jobs/` , which 404s, and the verdict prints blank rather than refusing: a vacuous zero in the verdict
line itself.

- **`max_by(.created_at)`, never `| last |`.** The runs list is newest-first (observed), so `last` picks the
  **oldest** run on that head — the stale green this read exists to prevent. It looks right only when there is
  exactly one run, so a re-run breaks it silently; `max_by` is correct whichever way the API sorts.
- **Read the STEP, not the job.** On a push to the default branch the `codeql` job is green with the gate step
  `skipped` (observed: job `103281632701` → job `success`, step `skipped`). The discriminator is the step
  conclusion ∈ {`success`, `failure`, `skipped`}.
- **The check-run name is lowercase `codeql`.** A second, different check named `CodeQL` is published by app
  `github-advanced-security` and answers another question — "No new alerts in code changed by this pull request".
  Discriminate on `app.slug`, or on `gh pr checks --json workflow`, never on case.
- **The verdict is a claim, not a promotion.** State what the step conclusion said and stop. Never run
  `gh pr ready`, and never declare the gate clear on this skill's own report — depending on a model's own account
  of its success is the thing the gate exists to replace.

## Output

A short report: what was **fixed** (with its test), what was **deferred/logged** (with issue refs), what needs a
**manual look/test** — and, if on a PR, the **pushed commit** + confirmation the PR is updated.

**For a CodeQL run, write it to `.claude/reports/<slug>-report.md`**, in this shape:

- the N-line checklist, with its tick count stated against N — "3 of 3 fixed";
- one entry per alert as **`#<number>` `rule.id` · `path`**, one sentence of mechanism, then its evidence: a fenced
  before/after, or a measured number naming the command that produced it;
- each alert classified by what it **was** — genuinely exploitable, a check that could not fail, or an
  analyser-legible restructure with no security change — said plainly, never claiming a hardening the edit does not
  perform;
- `cycles used: N of 3`;
- **Deferred, and why** — every alert not cleared, with its reason;
- the step conclusion read back from the API, quoted as the gate's verdict rather than this skill's;
- no ✅/❌ in the body; `✓` only inside pasted tool output.

`.claude/reports/codeql-baseline-remediation-report.md` is the worked example this shape comes from: 14 alerts read
from the API, all fixed in code, none dismissed, and a local re-scan that reproduced the set before its own zero
was trusted.
