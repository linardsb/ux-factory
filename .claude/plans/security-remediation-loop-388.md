# Feature: the security gate's remediation loop — `piv-fix-review-findings` reads a PR's CodeQL alerts

The following plan should be complete, but it is important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing files and commands. Copy the queries from `.github/workflows/verify.yml` verbatim rather than retyping them.

**Read `## THE MEASUREMENT THAT RESHAPED THIS TICKET` before anything else.** The ticket body, its 2026-09-10 amendment, and four committed prose sites all describe a gate that behaves differently from the one that is running. Everything below depends on the corrected model.

## Feature Description

Issue #387 landed a CodeQL gate in CI. Nothing picks its findings up: `piv-fix-review-findings` takes a review file or an issue list (`.claude/skills/piv-fix-review-findings/SKILL.md:4`, `argument-hint`), not a code-scanning alert set. This ticket gives that skill a third input — a PR number — and the loop that goes with it: read the PR's open CodeQL alerts through the code-scanning API, fix them in code with no suppression, prove each fix against an oracle that can actually say no, at most three cycles, then report what remains.

## User Story

As the operator of this repo
I want the skill that fixes review findings to also read and clear the CodeQL gate's alerts
So that a red security gate has tooling to clear it, instead of a PR that stalls with a red check and no route forward.

## Problem Statement

The gate raises alerts and holds a check red. There is no path from a red check to a fixed tree that does not go through a person reading the Security tab by hand. Worse, the obvious automation is unsound: the query the gate uses cannot tell a fixed alert from an alert whose lines fell outside this push's diff, so a naive loop reports success on the first wrong fix.

## Solution Statement

Extend the existing skill with a CodeQL input mode that:

1. **Reads what blocks** through the gate's own query on `refs/pull/N/merge`, with two positive controls (an analysis exists; that analysis covers this head).
2. **Triages by severity against the gate's threshold** — `high` and `critical` block, everything else is reported and does not hold the PR.
3. **Refuses every suppression route**, including the one the ticket does not name (moving code out of the `paths` allowlist).
4. **Proves each fix with a local single-query A/B** — the pre-fix tree must list the alert before the post-fix tree's silence means anything — and refuses by name when the CodeQL CLI is absent, because there is then no falsifiable oracle at all.
5. **Loops at most three times**, locally; pushes once; reads the gate's check back as confirmation, never as the fix oracle.
6. **Writes a report** in the shape of `.claude/reports/codeql-baseline-remediation-report.md`.

## Out of Scope / Non-Goals

- **Not correcting the falsified prose — with one exception.** `.claude/references/gates.md:129`, `:137`, `CLAUDE.md:162` and `verify.yml:16-19` assert a gate model this plan measures false (see below). Correcting them touches the one CLAUDE.md line that says "it is deliberate — leave it", and is past this ticket's stated scope; Q1 raises it as a separate issue for the owner. **This plan's skill prose must therefore state only what is measured and must not cite the false clauses.** The exception is **`gates.md:138`**, which this PR's own merge falsifies ("#388's remediation loop is not merged…") — one line, in this commit, because a PR does not get to leave a doc stale that it staled.
- **Not a `references/` split.** The skill body is 585 words against `skill-standards.md:73-84`'s 1,500–2,000-word target, and no `piv-*` skill carries a `references/` directory. The ticket's "the skill file plus its references" is a permission, not an instruction. Everything goes inline.
- **Not a bundled `scripts/` directory.** The API calls are ~10 lines. The one in-repo precedent (`piv-create-pr/scripts/`) violates the house wiring rule (`skill-standards.md:105-109`: no `## Resources` block, bare relative paths), so copying it reproduces a known defect.
- **Not a `build-checks` group.** CLAUDE.md §Testing forbids inventing a suite, and `tooling/drift-check.mjs:170-191` would force the group count update at four sites at once.
- **Not fixing `piv-validate`.** Its body is Python/FastAPI-tuned (`uv run pytest`, `mypy`, `ruff`, `uvicorn`) and wrong for this repo; the real mapping lives only in session memory. This plan inlines the four real commands and declares the fix a separate ticket (Q5).
- **Not changing `.github/workflows/verify.yml` or `.github/codeql/codeql-config.yml`.** Both are the gate. A ticket about clearing findings does not edit the thing that raises them.
- **Not touching the global skill copy inside the PR.** `~/.claude` is not a git repo. See Q2.

## Feature Metadata

**Feature Type**: Enhancement (AI-layer skill)
**Estimated Complexity**: Medium — the skill edit is small; establishing a sound fix oracle is not.
**Primary Systems Affected**: `.claude/skills/piv-fix-review-findings/` · `.claude/reports/` · (read-only) `.github/workflows/verify.yml`, GitHub code-scanning API, CodeQL CLI
**Dependencies**: `gh` CLI (2.83.1 observed, authenticated) · CodeQL CLI bundle 2.27.0 (see Task 2) · no new npm dependency

## Related Work

**Implements**: [#388](https://github.com/linardsb/ux-factory/issues/388) — the PR body carries `Closes #388`.
**Epic**: none. #388 is standalone, companion to #387.

**Back-references**:

- `.claude/plans/security-gate-387.md` — the gate this loop clears. **Note `:50` is wrong**: it says "There is no `secure-fix-issue` workshop file in this repo … the issue body is the whole specification", concluded from a grep scoped to `.archon` and `.claude`. The source is upstream and public (below), and it carries four clauses #388's body omits.
- `.claude/reports/codeql-baseline-remediation-report.md` — #395/PR #397, a complete manual execution of this loop over 14 alerts. **The skill is derived from this run.** Its report shape is the one the skill emits.
- Upstream contract: `coleam00/ai-transformation-workshop`, `.archon/commands/sonar-verify.md` and `.archon/workflows/secure-fix-issue.yaml`. Cite a SHA if quoted — the files are live and mutable (`gh api repos/coleam00/ai-transformation-workshop/commits?path=.archon/commands/sonar-verify.md`).

**Forward-references**: (none yet — Q1's prose-correction issue will be one.)

---

## THE MEASUREMENT THAT RESHAPED THIS TICKET

**The `codeql` gate is diff-informed on pull requests. It does not report alerts the PR's own diff did not touch.**

Observed, 2026-09-11:

```
gh pr view 394 --json baseRefOid --jq '.baseRefOid[0:7]'                        → 73c49dd
gh api "…/code-scanning/analyses?ref=refs/heads/main&tool_name=CodeQL" --jq …   → 73c49dd results=14
gh api "…/code-scanning/analyses?ref=refs/pull/394/merge&tool_name=CodeQL"      → 71925e1 results=0
                                                                                  f1ba81e results=0
gh api "…/code-scanning/alerts?ref=refs/pull/394/merge&state={open,closed,dismissed}" → 0, 0, 0
```

PR #394 was based on the exact main commit carrying 14 open high alerts. Both of its merge-ref scans ran before #395's fix landed, both reported zero, the gate printed green and the PR merged.

The mechanism is in the job log (run 34591329640, job 103237061348):

```
Setting overlay database mode to overlay with caching because we are analyzing a pull request.
Computing PR diff ranges...
Persisted 33 diff range(s) across 15 file(s).
Successfully created diff range extension pack at …/pr-diff-range.
[build-stdout] Overlay filter removed 183 out of 193 files from extraction.
codeql database run-queries … --extension-packs=codeql-action/pr-diff-range …
```

Contrast the push-to-main run (job 103281632701): `Not performing diff-informed analysis because we are not analyzing a pull request.`

**And it is documented.** [About code scanning alerts](https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/about-code-scanning-alerts): *"You will only see an alert in a pull request if **all** the lines of code identified by the alert exist in the pull request diff."* The measurement above is that sentence happening. Nothing in this repo's prose reflects it.

### What follows from it

**F1 — Four committed prose sites are false.** `.claude/references/gates.md:129` ("NO BASELINE DELTA … fails on every high or critical alert it finds, whether or not the PR introduced it"), `gates.md:137` ("an alert inherited from `main` blocks **every** PR"), `CLAUDE.md:162` ("blocks a PR on ANY open high or critical alert on its merge ref"), and the framing in `.github/workflows/verify.yml:16-19`. #395's stated urgency ("all 14 would have failed the next PR's `codeql` job") rests on the same model. The 14 fixes were real defects; the trap they were clearing did not exist as described. → **Q1**, not this PR.

**F2 — "Triage by what actually blocks" is nearly free.** What blocks is what this PR's diff raises. There is no inherited-alert triage path to build, and the three-cycle budget is realistic.

**F3 — The merge-ref query cannot falsify a fix, and this is the ticket's own forbidden vacuous zero through a door it does not name.** An alert disappears from `refs/pull/N/merge` when it is fixed *or* when the next push's diff ranges no longer cover its lines. A skill that reads absence as proof closes the loop with the defect intact.

**F4 — The local full-tree scan is a strict superset of the gate, not its equal.** #395's 14/14 byte-equal parity was measured against `refs/heads/main`'s full push analysis, not a merge ref. So `gates.md:129`'s "reproduces the gate exactly", and amendment A3 which quotes it, are true of the push scan only. **Green locally is stricter than the gate; red locally does not predict a red gate.** A loop that feeds every local finding into the fix set burns all three cycles on code the PR never touched.

**F5 — Therefore the two questions fork, and the skill must keep them apart:**

| Question | Instrument | Authority |
|---|---|---|
| Which alerts block this PR? | `alerts?ref=refs/pull/N/merge&state=open`, client-side filter on `rule.security_severity_level` | the gate's own query, `verify.yml:220-224` |
| Did the gate clear? | the `codeql` job's **step** conclusion for `Require no high or critical alerts` | CI, after a push |
| **Is this defect actually gone?** | **local single-query A/B — the pre-fix tree lists it, the post-fix tree does not** | the only falsifiable oracle available pre-merge |

---

## THE UPSTREAM CONTRACT #388's BODY OMITS

From `coleam00/ai-transformation-workshop`, `.archon/commands/sonar-verify.md` — the workshop node #388 names in its first line. Four clauses, all load-bearing, none in the ticket:

1. **The scope inversion** (`:17-35`). "Two things will tell you to leave a gate-failing finding alone, and neither of them governs this step" — the rules file's stay-inside-the-ticket rule, and the ticket's own out-of-scope list. "**Every finding that is failing the quality gate is in scope for you by definition**, whether or not the ticket named the file." Without this, a skill obeying CLAUDE.md's **Surgical Changes** declines to fix the alert that is holding the PR.
2. **The strict scope boundary** (`:107-126`), its mirror. Fix every gate-failing finding "and nothing else"; smallest edit that clears the finding; no refactoring, no "harden while you are in there"; non-blocking findings are **reported**, never fixed here, and never start another cycle.
3. **The written checklist** (`:91-105`). Write all N findings down, one line each, before editing anything. "Do not move to Step 5 until every line is ticked with an actual edit." Count ticks against N out loud — "3 of 3 fixed" or "2 of 3 fixed, and here is why the third could not be" — "never silence about the difference." This is the direct counter to this repo's recorded *check that cannot fail* failure mode.
4. **The node's verdict is a claim, not a promotion** (`secure-fix-issue.yaml:202-213`). "Letting it decide would mean depending on a model's own report that it succeeded, which is the exact thing this workflow argues against." In this repo the no-model half already exists — #387's gate step plus `gates-green`. The skill never declares the gate clear on its own say-so.

Also from the workshop, and worth stating: the loop there is **local** (`:170-193` re-runs the scanner itself; the external no-model check runs once, afterwards). #388's body line 16 — "Fix, commit, push; CI re-scans. Read the new result and go again" — is the deviation. Amendment A3 is the correction, and F3/F4 above are why it needs more care than A3 gives it.

---

## CONTEXT REFERENCES

### Relevant codebase files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `.claude/skills/piv-fix-review-findings/SKILL.md` (whole file, 73 lines) — the file being edited. Frontmatter at `:1-5`; `$1`/`$2` substitution at `:11-13`; §0 ground check `:17-35`; the four triage buckets `:41-50`; "create and run a test that proves it" `:55-58`; the Output block `:70-73`.
- `.github/workflows/verify.yml:155-230` — the whole `codeql` job. `:198-230` is the gate step: the analyses positive control (`:205-219`, including the `^[0-9]+$` numeric guard added at review R1), the blocking-alert query (`:220-224`), the failure path (`:225-229`), the success line (`:230`).
- `.github/workflows/verify.yml:195-197` — the comment explaining the client-side severity filter. **Its stated reason is wrong** (measured: `severity=` does filter on `security_severity_level`), but its conclusion is right for two reasons it does not state — a repeated `severity=` is last-wins so `high OR critical` is inexpressible, and an unrecognised value fails **open** (`severity=bogus` → all 14). Note this in the report; do not edit the file.
- `.github/codeql/codeql-config.yml` — the `paths` allowlist (`:31-51`) and `paths-ignore`. `:3-8` explains the allowlist fails safe and why generated trees and committed agent runs are excluded.
- `.claude/reports/codeql-baseline-remediation-report.md` (184 lines) — the worked example and the report shape the skill emits. Sections at `:1`, `:6`, `:21`, `:27`, `:82`, `:84`, `:121`, `:142`, `:158`, `:169`, `:178`.
- `.claude/references/gates.md:117-142` — the security gate section. Read it to know what the skill must **not** restate, and note `:11`'s literal phrase "34 pure groups" is regex-matched by `tooling/drift-check.mjs:179` — never reword it.
- `.claude/skills/skills-create/references/skill-standards.md:73-84` (length target), `:94-96` (a fact lives in exactly one place), `:105-109` (bundled-resource wiring), `:119-120` (a skill lives in exactly one place).
- `.claude/skills/piv-commit/SKILL.md:10-20` (the "add the untracked and changed files" step this plan overrides) and `:22-30` (the mandatory conditional "AI Layer Changes" section, which fires because this ticket edits `.claude/`).
- `agent-layer/gen-loc-summary.mjs:22-27` and `:42-45` — the three loc groups (`.claude/` matches none, so a skill-only edit owes no `loc-summary` regen and no visual-regression baseline) and the `git show :<path>` read that makes an unstaged `drift-check` a false pass.
- `tooling/drift-check.mjs:28-41` — `checkSyntax` runs `node --check` over `git ls-files "*.mjs"`, whose `*` crosses slashes. A fenced code block in this plan is safe; a committed `.mjs` fragment under `.claude/plans/` is not (park as `.txt`).

### New files to create

- `.claude/reports/security-remediation-loop-388-report.md` — this ticket's own report (the nine-section `piv-implement` shape, `.claude/skills/piv-implement/SKILL.md:119-165`).
- `.claude/code-reviews/pr-<N>-review.md` — added after the PR opens, per `CLAUDE.md:161`.

No new source files. No `references/`, no `scripts/` — see Out of Scope.

### Relevant documentation

- [CodeQL diff-informed analysis](https://docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-configuration/about-code-scanning-alerts) — the behaviour measured above. Why: the whole reshaping of the ticket.
- [Code scanning REST API — list alerts for a repository](https://docs.github.com/en/rest/code-scanning/code-scanning#list-code-scanning-alerts-for-a-repository) — the `ref`, `state`, `severity`, `per_page` parameters and the alert schema. Why: the skill's read.
- [Code scanning REST API — list analyses](https://docs.github.com/en/rest/code-scanning/code-scanning#list-code-scanning-analyses-for-a-repository) — Why: the positive control.
- [CodeQL CLI — `database create` / `database analyze`](https://docs.github.com/en/code-security/codeql-cli/codeql-cli-manual/database-create) — Why: the local oracle.
- [`github/codeql-action` releases](https://github.com/github/codeql-action/releases/tag/codeql-bundle-v2.27.0) — asset `codeql-bundle-osx64.tar.gz` (verified present). Why: Task 2.

### Patterns to follow

**The positive control, verbatim from the gate** (`verify.yml:207-219`) — the shape every count read in this skill copies:

```bash
n=$(gh api "repos/$R/code-scanning/analyses?ref=$REF&tool_name=CodeQL" --jq 'length')
if ! [[ "$n" =~ ^[0-9]+$ ]]; then echo "analysis count on $REF is not a number: [$n] — cannot read this gate"; exit 1; fi
if [ "$n" -lt 1 ]; then echo "no CodeQL analysis on $REF — this would measure nothing"; exit 1; fi
```

`gh api` can exit 0 while its `--jq` stage prints nothing, and `[ "" -lt 1 ]` returns non-zero as the **test's own** result, which `if` reads as false. That is why the numeric guard exists and why it is copied rather than paraphrased.

**The blocking-alert query, verbatim** (`verify.yml:220-224`):

```bash
gh api --paginate "repos/$R/code-scanning/alerts?ref=$REF&state=open&per_page=100" \
  --jq '.[] | select(.rule.security_severity_level == "high" or .rule.security_severity_level == "critical")
        | "\(.number)\t\(.rule.security_severity_level)\t\(.rule.id)\t\(.most_recent_instance.location.path):\(.most_recent_instance.location.start_line)"'
```

One deviation from the gate's copy, deliberate: `.number` is prepended. See the identity rule below.

**Report shape** — `.claude/reports/codeql-baseline-remediation-report.md`: alerts classified by **what they were** (genuinely exploitable / a check that could not fail / an analyser-legible restructure with no security change, said plainly), one entry per alert as `**#N `rule.id` · `path` `fn()`**` plus one sentence of mechanism and then evidence (a fenced before/after, or a measured number), every figure naming the command that produced it, a "Not fixed here, deliberately" section with the reason, 130–250 lines, and **no ✅/❌ in the body** — `✓` only inside pasted tool output.

---

## IMPLEMENTATION PLAN

### Phase 1: Ground

Branch and bundle. Nothing here touches the skill.

**Tasks:** branch off `origin/main`; establish a durable CodeQL CLI path or record its absence.

### Phase 2: The skill edit

**Depends on:** Phase 1 (only for the branch).

The whole deliverable: one file, `.claude/skills/piv-fix-review-findings/SKILL.md`.

### Phase 3: The end-to-end demonstration

**Depends on:** Phase 2.

A throwaway seeded PR, the skill run against it, the gate read back red→green.

### Phase 4: Validation, report, PR

**Depends on:** Phase 2. **Independent of:** Phase 3 — the repo gates do not need the demo, so they can run while the demo's CI round trips are in flight.

---

## STEP-BY-STEP TASKS

### 1. BRANCH off `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c feature/security-remediation-loop-388 origin/main`
- **GOTCHA**: the worktree is currently on `feature/provenance-rule-pin-384` and **dirty with another ticket's work** — `M agent-layer/gen-decisions.mjs`, `M docs/epics/discovery-partner.architecture.md`, `M docs/epics/discovery-partner.prd.md`, plus ~20 untracked files. Parallel sessions share this working directory (memory: *shared-worktree-parallel-sessions*). Do not `git add -A` at any point in this ticket. `agent-layer/gen-decisions.mjs` is in the `generators` loc group, so staging it would move `system/loc-summary.json` under this ticket's name.
- **VALIDATE**: `git branch --show-current` → `feature/security-remediation-loop-388`; `git status --porcelain -- .claude/skills .claude/plans .claude/reports` shows only this ticket's paths.
- **SATISFIES**: house rule (`CLAUDE.md:161`), not an AC.

### 2. ESTABLISH the CodeQL CLI path

- **IMPLEMENT**: check, in order — `which codeql`; then `ls -d /private/tmp/claude-501/*/*/scratchpad/codeql/codeql 2>/dev/null`. A runnable 2.27.0 bundle exists today at
  `/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/53349fdf-fe43-4e05-aa15-1f73eef185be/scratchpad/codeql/codeql` (3.3 GB, verified `codeql version` → 2.27.0), but that is **another session's scratchpad and is reapable**. Relocate it to a durable path outside the repo: `mkdir -p ~/.codeql && cp -R "<that dir>" ~/.codeql/2.27.0` (3.3 GB; 36 GiB free observed). If it is already gone: `gh release download codeql-bundle-v2.27.0 --repo github/codeql-action --pattern 'codeql-bundle-osx64.tar.zst' --dir ~/.codeql` then extract (**922 MB** zstd; the `.tar.gz` of the same bundle is 1,303 MB — prefer zstd, the docs call the gzip variants "less efficient" and kept only for tools without Zstandard).
- **GOTCHA**: there is **no `osx-arm64` asset and no language-scoped bundle** — `osx64` is the only macOS build, and the only axis on the release is platform. A JavaScript-only download is not on offer, which is why this costs ~1 GB rather than a few MB. `gh extensions install github/gh-codeql` downloads the same bundle, so it is not a cheaper route.
- **GOTCHA**: the local run must use the **same bundle version the Action used** (2.27.0 today, from the `codeql` job log) or the two are not comparable.
- **GOTCHA**: never inside the repo — `.gitignore` does not cover it and 3.3 GB would be stageable.
- **VALIDATE**: `~/.codeql/2.27.0/codeql version` prints `2.27.0` (or the extracted equivalent).
- **SATISFIES**: AC #1's oracle; Q4.

### 3. UPDATE the frontmatter of `.claude/skills/piv-fix-review-findings/SKILL.md`

- **IMPLEMENT**: `argument-hint` gains a third positional. Keep the `$1`/`$2` form (`bade5b1`'s message records it as "the substitution form that actually resolves") and add `$3`:
  `argument-hint: "[code-review-file-or-issues | PR number for CodeQL alerts] [scope / what to fix now vs defer] [optional: cycle budget, default 3]"`
  Extend `description` to say the skill also reads a PR's CodeQL alerts — it is the routing text and the only part always in context.
- **PATTERN**: `.claude/skills/piv-fix-review-findings/SKILL.md:2-4`.
- **VALIDATE**: `head -6 .claude/skills/piv-fix-review-findings/SKILL.md`; the file still parses as a skill (invoke `/piv-fix-review-findings` with no args and confirm it loads).
- **SATISFIES**: AC #1.

### 4. ADD §0.5 "If the input is a PR number — read the CodeQL alerts"

Placed after the existing §0 ground check, before §1 triage.

- **IMPLEMENT**, in this order, each with its refusal:
  1. **Resolve the PR.** `N=$(gh pr list --head "$(git branch --show-current)" --json number --jq '.[0].number // empty')` when `$1` is not a number. **Empty → refuse by name**: "no open PR, so there is no `refs/pull/N/merge` and no CodeQL analysis — this would measure nothing." The workflow triggers only on `pull_request` and push-to-main (`verify.yml:30-33`, no `workflow_dispatch`), so a branch with no PR is never scanned, and the alerts query answers `[]` with exit 0 — identical to a nonsense ref.
  2. **Positive control 1 — an analysis exists.** The verbatim block above, on `REF=refs/pull/$N/merge`.
  3. **Positive control 2 — that analysis covers *this* head.** New, and the gate does not need it because it runs inside the same job as `analyze`. A skill polling from outside gets control 1 satisfied by a **stale** analysis: merge refs accumulate them (`refs/pull/391/merge` carries 9). The analysis's `commit_sha` is the *merge* commit, so compare its **second parent**:
     ```bash
     HEAD=$(gh pr view "$N" --json headRefOid --jq .headRefOid)
     A=$(gh api "repos/$R/code-scanning/analyses?ref=$REF&tool_name=CodeQL" --jq '.[0].commit_sha')
     P=$(gh api "repos/$R/commits/$A" --jq '.parents[1].sha')
     [ "$P" = "$HEAD" ] || { echo "newest CodeQL analysis on $REF covers $P, not the PR head $HEAD — refusing to read a stale gate"; exit 1; }
     ```
  4. **Read the alerts** with the verbatim query, and **check the exit status explicitly** — `set -euo pipefail` does not travel with a quoted one-liner, and a paginated read that fails on page 2 leaves a file with zero blocking rows that `[ -s … ]` reads as clean:
     ```bash
     if ! gh api --paginate "…" --jq '…' > blocking.tsv; then echo "alert read failed — cannot judge this gate"; exit 1; fi
     ```
- **GOTCHA — identity.** Key every alert on **`alert.number`**, never on `(rule.id, path, start_line)`. Line numbers drift from unrelated landings: alert #5 was reported at `tooling/build-checks.mjs:8046` against 73c49dd and reads `:8058` today, purely because #394 landed above it — while keeping number 5. A skill diffing triples would report the alert at 8046 gone (fixed) and file 8058 as a new out-of-scope finding. Both halves false, defect closed.
- **GOTCHA — never read `code-scanning/alerts/<number>`.** That endpoint returns top-level `state: null` for an alert that never reached the default branch, while `most_recent_instance.state` says `fixed`. `.state != "open"` is true on null (reports fixed) and `.fixed_at != null` is false (reports unfixed) — two natural predicates that disagree and are both wrong. Always the **ref-scoped list** endpoint. Also: `state=closed` is a query alias whose returned value is `fixed`, so a skill that round-trips its own filter value never matches.
- **GOTCHA — do not substitute `?pr=N` as the read.** It works and returns the same set, but `ref=refs/pull/$N/merge` is byte-for-byte what `verify.yml:221` queries, and the skill's verdict must be the same measurement as the gate's. **Use `?pr=N` only to sharpen the refusal**: when the merge ref has zero analyses, `analyses?pr=$N` distinguishes "never scanned" from "uploaded under `refs/pull/N/head`". The Action rewrites merge→head whenever the workflow checked out something other than the merge commit (`src/git-utils.ts` `getRef()`), and `?ref=refs/pull/N/head` then answers `200 []` — a silent zero. This repo checks out the default, so the merge ref is correct today; the fallback only makes the refusal honest if that changes.
- **GOTCHA — an aggregating `--jq` under `--paginate` runs per page.** `--paginate --jq 'length'` prints one number **per page**, not the total (measured: 17 pages → `5 5 5 … 3`). Keep the element-wise form (`--jq '.[] | …'`) and count externally, or drop `--jq` and pipe the merged array into `jq`. `--slurp` and `--jq` are mutually exclusive and error out together.
- **GOTCHA — do not move to a server-side `severity=` filter.** A repeated `severity=` is last-wins so `high OR critical` is inexpressible, and an unrecognised value fails **open** (`severity=bogus` → all 14).
- **GOTCHA — a 403 is not a clean "no findings" either, and it is ambiguous.** The observed body is `{"message":"You are not authorized to read code scanning alerts.","status":"403"}`, which does **not** match the documented "Advanced Security is not enabled" wording and cannot distinguish code scanning being disabled from the token lacking `security_events`. Refuse on it by name rather than treating it as an empty set.
- **VALIDATE**: against a real ref — `gh api "repos/linardsb/ux-factory/code-scanning/analyses?ref=refs/pull/386/merge&tool_name=CodeQL"` → `[]` exit 0 (a ready-made no-analysis fixture, PR #386 predates the gate), and the skill's refusal fires on it.
- **SATISFIES**: AC #1, AC #3.

### 5. ADD the triage mapping to §1

- **IMPLEMENT**: map the CodeQL severity axis onto the four existing buckets, and state the split the ticket asks for:
  - `high` / `critical` → **Fix now**. These are what the gate fails on (`verify.yml:198`).
  - `medium`, `low`, unrated → **report, do not fix, do not start a cycle**. Real findings; not what is holding the PR. This bucket wins over the two routing rules below: they say *where* a blocking finding gets fixed, never that a non-blocking one gets fixed here.
  - Anything whose fix would require hand-editing a committed agent run (`traces/`, `replay/`, `discovery/<slug>/`, `proto/compositions/`) → **defer with the honesty contract as the reason** (`CLAUDE.md:160`). A bad run is re-run, never edited.
  - A **blocking** finding in a **generated** file → fix at its generator, regenerate, commit the output (`CLAUDE.md:161`, "Deploy = commit the artifacts"). #395's `cell()` fix regenerated `discovery/graded-opus-a/prd.md` this way.
- **IMPLEMENT — the scope inversion**, stated plainly and with its reason: *for this step only*, CLAUDE.md's **Surgical Changes** rule and any out-of-scope list in the ticket do **not** apply to a gate-failing alert. A finding in a file the ticket never mentioned is still yours to fix; that is the normal case here, not an exception.
- **IMPLEMENT — the strict boundary**, its mirror: fix every gate-failing alert and **nothing else**; the smallest edit that clears the finding; no refactoring and no hardening-while-you-are-in-there; a non-blocking finding is reported, never fixed here, and never starts another cycle.
- **IMPLEMENT — the written checklist**: write all N blocking alerts down, one line each, before editing anything. Do not re-scan while any line is unticked. Count ticks against N explicitly — "3 of 3 fixed", or "2 of 3 fixed, and here is why the third could not be".
- **PATTERN**: `SKILL.md:41-50` for the bucket prose; the upstream contract above for the three clauses.
- **VALIDATE**: read the section back and check every bucket names a route (fix / report / defer-with-reason / fix-at-the-generator).
- **SATISFIES**: AC #2.

### 6. ADD the no-suppression section

- **IMPLEMENT**: name every real route and forbid it. A finding is fixed in code or deferred with a reason in the report.
  1. **No dismissal** — not through the Security tab, not through `PATCH /code-scanning/alerts/<n>`.
  2. **No `paths` / `paths-ignore` edit** in `.github/codeql/codeql-config.yml`. Widening an ignore to clear a red gate is the same defect as deleting the check. Upstream puts it sharper: *a gate node that edits its own gate configuration is not a gate.*
  3. **No `query-filters`** added to the config to drop a rule.
  4. **No inline suppression — and state precisely why.** `// codeql[query-id]` is **real syntax** (CodeQL 2.12.0 changelog; `# codeql[…]` in Python and Ruby, plus the legacy `// lgtm[…]`), so a model will reach for it. But it only does anything when an `@kind alert-suppression` query runs in the same analysis, and code scanning does not honour the resulting SARIF `suppressions` marker — it is absent from the supported-properties table, and `advanced-security/dismiss-alerts` exists precisely to convert that marker into API dismissals, which would be pointless otherwise. So an inline comment here suppresses **nothing** while reading as a decision: a dishonest non-fix. There is no `@suppress` annotation in CodeQL at all.
  5. **The fourth door, which #388 does not name: no moving code out of scope.** The allowlist entries are globs, not directories — `discovery/*.mjs` does not match `discovery/helpers/regex.mjs`. "Fixing" an alert by extracting the offending code into a new file the allowlist never matches produces a clean result on **both** oracles with the config untouched. After each fix, require the alert's file to still be extracted: locally `unzip -l "$DB/src.zip" | grep -F '<path>'` must print a row, or `codeql database print-baseline-info "$DB"`.
- **GOTCHA**: nothing in the repo gates the allowlist (`gates.md:135`: "nothing gates the allowlist … The completeness check is by hand"), so door 5 has no mechanical guard other than the one this section installs.
- **IMPLEMENT — assert it on the API, do not trust the loop.** For every alert the skill claims to have fixed, the ref-scoped list must show `state` transitioned `open` → **`fixed`** (never `dismissed`), with `dismissed_at`, `dismissed_by`, `dismissed_reason` and `dismissed_comment` all `null` and `fixed_at` non-null. PR #389's two alerts are the worked example of that shape. Also assert the PR's diff touches **no** `.github/codeql/*` file and adds no `codeql[` or `lgtm[` comment — the config escape and the source escape respectively, both invisible to a "zero alerts" check.
- **VALIDATE**: `grep -n "paths-ignore\|dismiss\|query-filters\|out of scope" .claude/skills/piv-fix-review-findings/SKILL.md` returns all five routes.
- **SATISFIES**: AC #2, AC #5.

### 7. ADD the fix oracle — the local single-query A/B

This is the task the ticket underspecifies and the one that makes the loop honest.

- **IMPLEMENT**: for each blocking alert, before its fix is called fixed:
  1. Put the scan on the tree the gate judges: `git fetch origin "refs/pull/$N/merge" && git worktree add --detach "$SCRATCH/pr-$N" FETCH_HEAD`. (`gh api repos/…/git/ref/pull/N/merge` 404s — merge refs are not resolvable through the refs API, so the fetch is the only route.)
  2. Resolve the query without hardcoding a pack version: `"$CODEQL" resolve queries codeql/javascript-queries | grep -i '<QueryName>.ql'`.
  3. **A-side, the positive control**: build a database on the **pre-fix** tree and run that single query. It must **list the target alert**. If it does not, the harness is measuring nothing and the cycle is refused — this is the repo's recorded *check that cannot fail*, and a local zero from a vacuous database looks exactly like a clean tree.
  4. **B-side**: same query on the post-fix tree. The alert must be gone.
  5. Secondary sanity: `grep baselineLinesOfCode "$DB/codeql-database.yml"` is non-trivial (43566 at 73c49dd).
  ```bash
  "$CODEQL" database create "$S/dbA" --language=javascript-typescript --source-root="$S/treeA" --overwrite
  "$CODEQL" database analyze "$S/dbA" "<resolved>.ql" --format=sarif-latest --output="$S/outA.sarif" --rerun
  ```
  Measured at #395: ~35s per side; A 2 results → B 1 result.
- **IMPLEMENT — the refusal**: no CLI on PATH and no bundle at the pinned path → **refuse by name**: "no CodeQL CLI — the merge-ref query is diff-scoped and is not a fix oracle, so nothing here can falsify a fix." Do not silently degrade to the CI read; that is the same defect class as reading a count off a ref with no analysis, on a surface the ticket never names.
- **GOTCHA — SARIF severity is a number carried as a string.** The API's `high`/`critical` never appear in SARIF. Filter on `properties["security-severity"]`, documented as *"a string representing a score … greater than 0.0 up to 10.0"*, with GitHub's own mapping: **over 9.0 critical, 7.0–8.9 high, 4.0–6.9 medium, 0.1–3.9 low** ([SARIF support for code scanning](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)). So the gate's `high or critical` is `>= 7.0`.
- **GOTCHA — the rules may not be where the docs say.** The documented path is `runs[].tool.driver.rules[]`, but pack-sourced queries can land under `runs[].tool.extensions[].rules[]` with `result.rule.toolComponent.index` pointing at the extension. Look in both and resolve through `toolComponent`; confirm against one real local `analyze` before trusting a parser. A parser that finds no rule entry silently scores every result 0.0 and reports zero high/critical — another vacuous zero.
- **GOTCHA — `--codescanning-config` is an option on `database create` and `database init` only, never on `analyze`.** The config's queries are applied by invoking `analyze` with **no** query argument. The A/B above deliberately passes one explicit query instead, so it does not need the config at all; the full-tree confirmation run is the one that takes it.
- **GOTCHA — a full-tree local scan is confirmation at most, never the fix trigger.** Its extra findings are classified "belongs on `main`, not this PR" (F4). If you run one, scope what you act on with `git diff --name-only "$(git merge-base origin/main HEAD)"...HEAD`.
- **VALIDATE**: on the Task 12 demo, the A-side lists `js/code-injection` and the B-side does not.
- **SATISFIES**: AC #1, AC #2 (the check that cannot fail).

### 8. ADD the loop and its budget to §2–§4

- **IMPLEMENT**: at most **three** cycles (`$3` may lower it, never raise it). Each cycle is **local**: fix → A/B → next. Push **once**, after the checklist is fully ticked. The pushed CI scan is the **confirmation**, not the loop — a CI round trip costs 80–87s for the `codeql` job alone (measured across four PR runs) and re-scans nothing the local A/B has not already answered.
- **IMPLEMENT — the wait**: after the push, `gh pr checks "$N" --watch --fail-fast` (or `gh run watch "$RUN" --exit-status`) before any read-back. Reading immediately after `git push` either finds no run registered or matches the **previous** head's run and reports a stale green. Waiting on the check is also sufficient for the API to be current: `github/codeql-action/analyze`'s `wait-for-processing` input defaults to `true`, so a **concluded** `codeql` check implies the SARIF is processed and the alerts are queryable — cheaper than polling `analyses`.
- **IMPLEMENT — the read-back**, with the gate's own guards ported:
  ```bash
  RUN=$(gh api "repos/$R/actions/runs?head_sha=$HEAD" --jq '[.workflow_runs[]|select(.name=="verify")]|last|.id')
  if ! [[ "$RUN" =~ ^[0-9]+$ ]]; then echo "no verify run on $HEAD — this measured nothing"; exit 1; fi
  J=$(gh api "repos/$R/actions/runs/$RUN/jobs" --jq '.jobs[]|select(.name=="codeql")|select(.status=="completed")|.id')
  gh api "repos/$R/actions/jobs/$J" --jq '.steps[]|select(.name=="Require no high or critical alerts")|.conclusion'
  ```
- **GOTCHA — read the STEP, not the job.** On a push to main the `codeql` job is green with the gate step `skipped` (observed: job 103281632701, step 5 `skipped`, job conclusion `success`). The discriminator is the step conclusion ∈ {success, failure, skipped}.
- **GOTCHA — the check-run name is lowercase `codeql`.** A second, different check named `CodeQL` (capital) is published by app `github-advanced-security` and answers a different question — on PR #397 its title was "No new alerts in code changed by this pull request". Discriminate on `app.slug` or on `gh pr checks --json workflow` (`verify` vs empty), not on case.
- **IMPLEMENT — the verdict is a claim.** The skill never runs `gh pr ready` and never declares the gate clear on its own report. It states what the step conclusion said and stops.
- **VALIDATE**: Task 12 reads `failure` before the fix and `success` after, off the same PR.
- **SATISFIES**: AC #2 (replacement), AC #4.

### 9. UPDATE §3 (Validate) — replace the bare `piv-validate` hand-off

- **IMPLEMENT**: name this repo's four real commands inline, because `piv-validate`'s body is Python/FastAPI-tuned and nothing in the fix-findings→piv-validate contract can pass a PR number or a scope:
  ```bash
  node tooling/build-checks.mjs
  git add <explicit paths> && node tooling/drift-check.mjs   # staged: gen-loc-summary reads `git show :<path>`
  node tooling/token-lint.mjs
  PORT=4788 node portal/server.mjs &   # then curl /api/health; kill by PID
  ```
- **GOTCHA**: never `pkill -f 'node server.mjs'` — it kills sibling sessions' recorders (memory: *portal-smoke-port-scoped-kill*). PID/port only.
- **GOTCHA**: `git add -A` is forbidden in this ticket (Task 1). `piv-commit`'s "add the untracked and changed files" step is **explicitly overridden**; stage by explicit path.
- **VALIDATE**: all four run on this ticket's own branch.
- **SATISFIES**: house rule + Q5.

### 10. UPDATE the Output section — the report

- **IMPLEMENT**: the report lands at `.claude/reports/<slug>-report.md` (`CLAUDE.md:161`). Specify the shape inline: the N-line checklist with its tick count against N; one entry per alert as `**#<number> `rule.id` · `path`**` with one sentence of mechanism and its evidence; the classification by what the alert **was** (genuinely exploitable / a check that could not fail / an analyser-legible restructure with no security change, said plainly rather than claiming a hardening it does not perform); `cycles used: N of 3`; a "Deferred, and why" section; every figure naming the command that produced it; no ✅/❌ in the body.
- **PATTERN**: `.claude/reports/codeql-baseline-remediation-report.md` end to end.
- **VALIDATE**: `grep -n "cycles used\|Deferred\|of 3" .claude/skills/piv-fix-review-findings/SKILL.md`.
- **SATISFIES**: AC #4.

### 11. MIRROR the edit to the global skill copy

- **IMPLEMENT**: after the repo copy is final, `cp .claude/skills/piv-fix-review-findings/SKILL.md ~/.claude/skills/piv-fix-review-findings/SKILL.md`, then `diff` the two and record byte-identity in the report.
- **GOTCHA**: `~/.claude` is not a git repo, so this edit **cannot** ride in the PR. Never delete or move the global copy (memory: *ai-layer-skills-project-scope* — the 28 Aug removal was unauthorised and was reversed). Record the divergence and the missing generator in the report as Q2, the owner's open decision.
- **VALIDATE**: `diff .claude/skills/piv-fix-review-findings/SKILL.md ~/.claude/skills/piv-fix-review-findings/SKILL.md && echo IDENTICAL`.
- **SATISFIES**: makes AC #1's end-to-end run meaningful regardless of which copy loads.

### 12. DEMONSTRATE end to end on a throwaway PR

- **IMPLEMENT**:
  1. Branch off `main`, add the seed from commit `b81f096c` (`tooling/__tmp-seed.mjs` — a `node:http` request feeding `exec`/`eval`). Recover it with `gh api repos/linardsb/ux-factory/commits/b81f096c --jq '.files[].patch'`.
  2. Run the repo gates locally on the seeded tree **before** pushing (`build-checks`, `drift-check` staged, `token-lint`) so the demo's red is unambiguously the `codeql` step. PR #389's `verify` was red for an unrelated reason — a deliberate second mutation that null-dereferenced `build-checks.mjs:512` — and a demo with two reds cannot show a clean red→green.
  3. `gh pr create --draft`, wait for CI, run the skill against the PR number, fix, push, wait, read the step conclusion back.
  4. Close the PR and delete the branch.
- **GOTCHA — AC #1's seed is wrong and #387 already recorded it.** `eval(argv[2])` produced **zero** alerts: `process.argv` is a local-threat-model source and the default suite tracks remote sources only (`.claude/reports/security-gate-387-report.md:71-73`, and `:187-188` files it as "Task 8's seed replaced (plan error)"). The `b81f096c` seed raises **two `critical`** alerts — `js/command-line-injection` at `:9` and `js/code-injection` at `:10` — not one `high` `js/code-injection`. Implementing AC #1 verbatim seeds a file that raises nothing and proves nothing.
- **GOTCHA**: this briefly puts a real critical alert in a **public** repo's Security tab. Delete the branch when done; the alert closes with it.
- **VALIDATE**: the skill lists both alerts with rule id, severity and location; the A/B falsifies the fix; the post-fix step conclusion is `success`.
- **SATISFIES**: AC #1, AC #2, AC #3.

### 13. UPDATE `gates.md:138`, WRITE the report, OPEN the PR

- **IMPLEMENT**: rewrite the one clause this PR falsifies. `.claude/references/gates.md:138` currently ends "#388's remediation loop is not merged, so gating on everything would leave PRs stuck with no tooling to clear them." Replace that trailing reason with the landed state — the threshold is unchanged, and the skill is now the route for clearing a red gate. **Only that clause.** `:129` and `:137` stay as they are; they are Q1's follow-up issue, not this PR's.
- **GOTCHA**: do not touch `gates.md:11`'s literal phrase "34 pure groups" — `tooling/drift-check.mjs:179` regex-matches it and CI `verify` goes red on a reword.
- **IMPLEMENT**: `.claude/reports/security-remediation-loop-388-report.md` in the nine-section `piv-implement` shape. Then stage **by explicit path** — the plan, the SKILL.md, `gates.md`, the report — one atomic commit, and `piv-create-pr`.
- **GOTCHA**: `Closes #388` goes in the PR **body**, not the title (`CLAUDE.md:161`; memory: *prs-dont-auto-close-tickets*). Add the session trailers. Expect `piv-commit`'s conditional "AI Layer Changes" section to fire, since this ticket edits `.claude/`.
- **GOTCHA**: `.claude/code-reviews/pr-<N>-review.md` needs the PR number, so it necessarily lands as a second commit on the same PR. Do not repeat PR #397's shape, which shipped report-only with no plan and no review.
- **VALIDATE**: `gh pr view <N> --json body --jq .body | grep -c "Closes #388"` → 1.
- **SATISFIES**: house rule.

---

## TESTING STRATEGY

There is no suite and none is to be invented (`CLAUDE.md:162`). "Done" = run the surface you touched.

### The surface

A skill file has no unit test. It is proved by **running it** (Task 12) and by the repo's four gates staying green (Task 9).

### Edge cases the demo must exercise

- A ref with **no analysis** → refusal by name, not "no findings". Ready-made fixture: `refs/pull/386/merge` (predates the gate) returns `[]` exit 0 from both endpoints.
- A **stale** analysis → the second-parent currency check refuses rather than reading the previous commit's alert set.
- **No open PR** on the branch → refusal, not an empty alert list read off a branch ref.
- **No CodeQL CLI** → refusal, not a silent degrade to the diff-scoped CI read.
- An alert that **cannot** be fixed in three cycles → deferred in the report with a reason.

### The check that cannot fail — how each check here is proven to be able to fail

| Check | The mutation that must redden it |
|---|---|
| analyses positive control | point it at `refs/pull/386/merge` → refuses |
| currency control | point it at a merge ref whose newest analysis predates the head → refuses |
| A-side of the fix oracle | run it on the **post**-fix tree → lists nothing → the cycle is refused |
| extraction control | rename the fixed file to a path outside the allowlist → `src.zip` grep prints nothing |
| step read-back | read a push-to-main run → step `skipped`, not `success` |

---

## VALIDATION COMMANDS

### Level 1: syntax and drift

```bash
git add .claude/skills/piv-fix-review-findings/SKILL.md .claude/plans/security-remediation-loop-388.md \
        .claude/references/gates.md .claude/reports/security-remediation-loop-388-report.md
node tooling/drift-check.mjs
```

### Level 2: the repo's gates

```bash
node tooling/build-checks.mjs     # 34 groups
node tooling/token-lint.mjs       # 63 contract tokens, 0 orphan
```

### Level 3: the portal smoke

```bash
PORT=4788 node portal/server.mjs &   PID=$!
curl -s localhost:4788/api/health                       # ok:true, bootSha == headSha, stale:false
curl -s -o /dev/null -w '%{http_code}' -H 'Origin: https://evil.test' localhost:4788/api/health   # 403
kill "$PID"
```

### Level 4: the skill itself

Task 12, end to end, on the throwaway PR.

### Level 5: the mirror

```bash
diff .claude/skills/piv-fix-review-findings/SKILL.md ~/.claude/skills/piv-fix-review-findings/SKILL.md && echo IDENTICAL
```

---

## ACCEPTANCE CRITERIA

Restated against what is demonstrable. **AC #1 and AC #2 replace the ticket's originals, whose mechanism does not exist — see the 2026-09-11 amendment on #388.**

- [ ] **AC #1 (amended).** On a throwaway seeded PR using commit `b81f096c`'s seed (not `eval(argv[2])`, which raises nothing), the skill lists both `critical` alerts with rule id, severity and location; fixes them; the local A/B falsifies each fix; and the `codeql` job's **step** `Require no high or critical alerts` reads `failure` before the push and `success` after, on the same PR.
- [ ] **AC #2 (amended).** ~~The PR stays a draft.~~ Not demonstrable: `piv-create-pr` opens PRs ready, `GITHUB_TOKEN` cannot mark a PR ready for review, and `main` has no branch protection (404, `rulesets` `[]`, observed 2026-09-11). **Replacement, PROPOSED on #388 and not yet answered by the owner:** the gate's own check-run step conclusion is the red→green evidence, read back from the API and not from the skill's claim. Until the owner rules, treat this AC as the working target, not a settled one.
- [ ] **AC #3.** A run over a PR whose ref has no CodeQL analysis refuses by name. Note the API returns **HTTP 200 with `[]`**, never a 404, so the refusal is built on the count, exactly as `verify.yml:214-219` does.
- [ ] **AC #4.** An alert not cleared in three cycles appears in the report as deferred with a reason, and the report lands under `.claude/reports/`.
- [ ] **AC #5 (new).** No suppression route is taken, and the skill names all five — including moving code out of the `paths` allowlist, which #388's body does not cover and which defeats both oracles.
- [ ] The four repo gates pass, the report exists, and the PR body carries `Closes #388`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation ran, with its output recorded
- [ ] The four gates green on this branch
- [ ] Task 12's demo run completed and its PR deleted
- [ ] The global copy mirrored and the divergence recorded
- [ ] Report written in the house shape
- [ ] `gates.md:138` corrected in this commit; `:129`/`:137` deliberately untouched
- [ ] Q1's follow-up issue filed (or explicitly declined by the owner)
- [ ] PR opened with `Closes #388` in the body; review file added to the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the falsified prose, minus the one line this PR itself falsifies.** `gates.md:129`, `gates.md:137`, `CLAUDE.md:162` and `verify.yml:16-19` describe a gate with no baseline delta that blocks on inherited alerts. That is false both by measurement (#394) and by GitHub's own documentation: *"You will only see an alert in a pull request if all the lines of code identified by the alert exist in the pull request diff."* This plan does **not** correct those four: `CLAUDE.md:162` says "it is deliberate — leave it", and rewriting a pinned project rule is past a skill-file ticket's scope. **Assumption: file a separate issue and reference it here.** The one unresolved thing is the *mechanism*, not the observable — whether every query participates in diff-informed analysis is undocumented — so the correction should be written against the documented display rule, which does not depend on it.

**`gates.md:138` is the exception and is IN this PR.** It reads "#388's remediation loop is not merged, so gating on everything would leave PRs stuck with no tooling to clear them." That sentence goes false **because of this PR**, not because of a pre-existing error, and leaving it is the PR knowingly staling a doc it caused. One line, in the same commit. See Task 13.

**Q2 — the two skill copies.** `.claude/skills/…/SKILL.md` and `~/.claude/skills/…/SKILL.md` are byte-identical today (3386 B, md5 `c1545298d8e1293caa3017a651710b9e`) and do not sync. Nothing states which wins at invocation. `skill-standards.md:119-120` says a skill lives in exactly one place and that two copies are generated, never hand-maintained — there is no generator. **Assumption: edit the repo copy (the ticket's target), mirror by hand, record the divergence as the owner's decision.** Deleting either is closed off: the project copies are the ticket's deliverable, and the global deletion was already reversed once.

**Q3 — the cost.** The ticket says one PR, one hour. Observed scope: the skill edit, plus a plan, a report and a review (`CLAUDE.md:161`), plus a throwaway seeded PR with two ~95s CI round trips, plus possibly a 1.27 GiB CLI download. **Assumption, awaiting confirmation: half a day.** Scaling it down is the owner's call — the cheapest cut is Task 12's demo, at the price of AC #1.

**Q4 — the CodeQL bundle.** 3.3 GB, currently only in another session's reapable scratchpad. **Assumption: relocate to `~/.codeql/2.27.0`.** If the owner would rather not hold 3.3 GB, the fallback is the skill refusing without a CLI, which leaves the loop with no falsifiable oracle and reduces it to reporting.

**Q5 — `piv-validate`.** Python/FastAPI-tuned, wrong for this repo, and the owner has required it be run even on docs-only PRs. This plan inlines the four real commands rather than fixing it. A separate ticket.

**Q6 — five things the official docs do not settle**, carried so the implementer does not manufacture an answer: (a) what `severity=` does for an alert with **no** `security_severity_level` (this repo has none to test); (b) the default `GITHUB_TOKEN` permission for `security-events` on `pull_request` — the canonical defaults table is gone from the docs, so the workflow declares it explicitly (`verify.yml:171-175` already does); (c) the honoured-key set for `--codescanning-config` and whether the CLI interprets it identically to the Action — no such statement exists anywhere, verify empirically if anything depends on it; (d) whether SARIF rules land under `tool.driver.rules[]` or `tool.extensions[].rules[]` for pack-sourced queries; (e) whether the `osx64` bundle is universal or runs under Rosetta on Apple Silicon. **Assumption: none of the five blocks this plan** — each is either already handled defensively above or irrelevant to the loop.

**Q7 — commit granularity.** The worked example batched 14 fixes into one commit and one CI round trip. This plan follows it: one commit, push once. If the owner wants one commit per alert, the loop's push step changes and the CI cost multiplies.

## NOTES (open canvas)

**Why the fix oracle is the hard part, restated.** The ticket's own strongest clause is "a fix counts as fixed when the re-scan no longer lists that alert, not when the agent says it fixed it". It then names the re-scan as CI's. Diff-informed analysis makes that re-scan structurally unable to say no: it reports on the diff, so an alert leaves the set when its lines leave the diff. The concrete false-fixed path: cycle 1 edits line 104 with a patch that does not close the query, and the commit also touches line 250; cycle 2's diff ranges cover 250 only; line 104 is outside every persisted range; the query returns zero; the skill reports the fix verified. Nothing in #388 as written catches that. The A-side positive control does — the pre-fix tree must list the alert, or the harness is refused.

**What the local scan is and is not.** It is a strict superset of the PR gate (full tree, no diff ranges). So: a local zero is a stricter pass than the gate needs, and is sufficient. A local red is not evidence the gate is red. Alerts it raises outside the PR's diff belong on `main` — report them, do not feed them into the loop, and do not spend a cycle on them.

**Rejected: making the CI merge-ref query the loop.** It is the cheapest design and it is the one the ticket describes. F3 kills it. It survives in the plan as the gate read-back only.

**Rejected: correcting the prose in this PR.** Four sites, one of them pinned with "leave it". Two of the four are `gates.md` cannot-reach clauses, which per this repo's own three-copies rule are never a single edit. It is a real finding and it gets its own issue.

**Rejected: a `references/` split and a bundled `scripts/`.** Both are sanctioned by the ticket's Cost line and neither is warranted at 585 words with ~10 lines of shell. Named in Out of Scope so a reviewer reads them as decisions.

**A note on where the contract came from.** #388's first line calls this "the `secure-fix-issue` workshop's remediation node as a skill edit". `.claude/plans/security-gate-387.md:50` concluded there was no such file and that the issue body was the whole specification — from a grep scoped to `.archon` and `.claude`, where it never was. It is upstream and public, and it supplies the scope inversion, the strict boundary, the tick-count checklist and the claim-not-verdict rule, none of which are in #388's body. That is four load-bearing clauses recovered, and it is the strongest argument for reading a ticket's cited source before treating the ticket as complete.

## AMENDMENTS

(none yet)
