# Feature: bump the `verify` job's Node pin off the evicted Node 20

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

`.github/workflows/verify.yml` pins `node-version: 20` on the **gating** `verify` job. Node 20 reached EOL in April 2026 and has since aged off the `ubuntu-latest` tool cache, so `actions/setup-node@v7` now downloads a ~30 MB tarball from `github.com/actions/node-versions` on **every single run** before the job can start. A gating job has acquired a live external network dependency: when that download is slow or fails, `main` goes red for a reason that has nothing to do with the diff.

This ticket bumps the pin to **Node 24** — a version the runner image actually caches — and rewrites the comment block above it so the pin's *meaning* stays true after the number moves.

The change is two lines of YAML and one comment block. The work is almost entirely in the **evidence** and the **comment**, not the edit.

## User Story

As the maintainer of this repo
I want the gating `verify` job to run on a Node the runner already has on disk
So that CI stops depending on a 30 MB network download that can turn `main` red for reasons unrelated to any change.

## Problem Statement

Three distinct problems, only the first of which is obvious:

1. **A gating job has a live external dependency.** Every `verify` run fetches Node 20 over the network. Confirmed in the live log of run `30365798586` (main, 2026-07-28):
   ```
   Attempting to download 20...
   Acquiring 20.20.2 - x64 from https://github.com/actions/node-versions/releases/download/20.20.2-.../node-20.20.2-linux-x64.tar.gz
   ```
2. **The pin is load-bearing and cannot simply be deleted.** It exists so Style Dictionary output + generator determinism don't silently move under the runner. Removing the pin trades a network dependency for a determinism hazard — strictly worse.
3. **The comment above the pin will become false the moment the number changes.** It currently reads "the local baseline the committed artifacts were generated against." The local baseline is `v20.20.2` and is not moving. After the bump, CI Node ≠ local baseline, and the pin's justification has to change from *"it matches local"* to *"it is proven to emit identical artifacts, and it is tool-cached."* Leaving the old sentence in place ships a lie in the one file whose whole job is to be trustworthy.

## Solution Statement

Pin `node-version: 24`, and rewrite the comment to record the new, true rationale.

**The determinism question is already answered — measured, not assumed.** The ticket demands the experiment be *run*. It was, twice: once by the owner locally (macOS/arm64, Node 24.11.0, at `9f173ac`), and once during this planning pass on **linux/amd64 at current `main` (`e7c9369`)**, which is the platform and the commit that actually matter. Full results in [Notes](#notes-open-canvas). Headline:

| Node | npm | `npm ci` (SD) | drift-check | token-lint | build-checks | **unscoped `git status --porcelain`** |
|---|---|---|---|---|---|---|
| **24.18.0** | 11.16.0 | ✓ exit 0 | ✓ 8 groups | ✓ | ✓ all 10 groups | **empty** |
| 22.23.1 | 10.9.8 | ✓ exit 0 | ✓ 8 groups | ✓ | — | **empty** |

Every committed artifact — including all three Style Dictionary targets (css/ios/android) — regenerates **byte-identically** under both cached Node versions on Linux x64. The concern the pin guards against does not materialise.

**Why 24 and not 22**, given both pass:

- **Recurrence.** This ticket exists *because* a pinned Node aged off the cache at EOL. Node 22 EOLs April 2027; Node 24 EOLs April 2028. Pinning 22 schedules a re-run of this exact ticket in roughly nine months. 24 buys the longest runway, which is the whole point.
- **It is the version with direct evidence at the exact build.** The `node:24` Docker tag resolved to **24.18.0** — precisely the build the runner image caches. This did not test a floating major; it tested the binary CI will use.
- **npm 11 was the one real discriminator, and it cleared.** Node 24 ships npm 11.16.0 vs the local baseline's 10.8.2. A stricter npm major refusing the `lockfileVersion 3` file would have made `npm ci` — a gating step — red. It exits 0 cleanly. Had it not, 22 (npm 10.9.8, nearest the baseline) was the fallback.

**Pin the major (`24`), never the exact patch (`24.18.0`).** This is the sharpest constraint in the ticket and it belongs in the comment: the tool cache holds only what the current image ships. An exact pin re-breaks the instant the image moves to 24.19.0 — reintroducing the very download this ticket removes, and doing it silently. The major pin is what lets the runner keep resolving to whatever it already has on disk.

**The change is self-verifying**, which is why it is safe despite the local evidence being off-runner: the PR's own `verify` run re-proves determinism on the real runner (`drift-check` goes red instantly on any divergence) *and* prints whether the download is gone. Both goals are confirmed by one run — **but only if someone reads the log**, which is why AC #1 and AC #2 name literal strings rather than accepting "CI is green." Node 20 also produced green runs; green is the ticket's premise, not its resolution.

## Out of Scope / Non-Goals

- **Not touching the `visual` job.** It takes no `setup-node` at all — it runs inside the pinned `mcr.microsoft.com/playwright:v1.61.1-jammy` container and uses *that* container's Node for its `npm ci`. This ticket cannot affect it.
- **No visual-regression baseline regeneration.** Follows from the above: no rendering input changes. The standing repo instinct is "any change → regen baselines"; here it is wrong and would burn a Docker run for nothing. Do not run `npm run update:docker`.
- **Not changing the local development baseline.** Local stays `v20.20.2`. This ticket does not ask anyone to upgrade their machine, and does not add an `.nvmrc` or an `engines` field (the repo has neither, deliberately).
- **Not removing the pin**, not switching to `check-latest`, not adding `actions/cache` for the toolchain. The pin is load-bearing; caching the tarball would solve the symptom while keeping the dependency.
- **Not changing the action versions.** `checkout@v7` / `setup-node@v7` / `upload-artifact@v7` landed in #152 / PR #153 and are correct.
- **Not adding a second Node to a matrix.** Determinism is asserted at one version; a matrix would double CI time to test a configuration nothing ships on.
- **Not fixing CLAUDE.md's stale build-checks group count** (says 9, actual is 10 after #149). Real, but it belongs to #149's paper trail, not here. Flagged in [Open Questions](#open-questions--assumptions).

## Feature Metadata

**Feature Type**: Bug Fix (CI reliability)
**Estimated Complexity**: **Low** — two YAML lines + one comment block. The rigour is in the evidence, which this plan already carries.
**Primary Systems Affected**: `.github/workflows/verify.yml` (the `verify` job only)
**Dependencies**: none added or removed

## Related Work

**Implements**: [#154](https://github.com/linardsb/ux-factory/issues/154) · **Epic**: none (standalone CI-hygiene ticket; the `verify` workflow itself traces to epic #1 ticket #9)

**Back-references**:

- `.claude/plans/ci-verification-gates.md` — Why: created `verify.yml` and established both the Node-20 pin and its rationale. Its L366 records the **original cross-platform determinism proof**, run by regenerating a clean clone inside a `node:20` Linux container. This plan's verification is deliberately the same technique one major-line on; reuse the precedent, don't invent a method.
- PR [#153](https://github.com/linardsb/ux-factory/pull/153) (closed #152) — Why: bumped the three actions to v7 and wrote the current comment block, which **explicitly warns the next reader not to touch this number** when a runtime deprecation appears. This ticket moves the number for an unrelated reason (cache eviction). The rewritten comment must preserve #153's distinction rather than overwrite it — see Task 2's GOTCHA.
- `.claude/code-reviews/pr-31-review.md` L34 — Why: records the original "local v20.20.2 == CI `node-version: 20`" equivalence that this ticket deliberately breaks.

**Forward-references**:

- (none yet) — the natural successor is a repeat of this ticket when Node 24 EOLs in April 2028.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.github/workflows/verify.yml` (lines 31–41) — Why: **the entire edit lives here.** Line 41 is `node-version: 20`; lines 32–38 are the comment block being rewritten. Read lines 1–20 too: the file's header comment explains what each gate does and is the house style for how this file documents itself.
- `.github/workflows/verify.yml` (lines 42–46) — Why: the `npm ci` step whose behaviour under npm 11 was the one genuine risk. Verified clean; do not modify.
- `.github/workflows/verify.yml` (lines 56–70) — Why: the ⚠ block forbidding an `npm ci` for `portal/`. Not edited, but shows the tone the repo uses for a comment that must stop a future reader from doing the wrong thing — mirror it.
- `.github/workflows/verify.yml` (lines 72–95, the `visual` job) — Why: confirm for yourself that it has **no `setup-node` step**, which is what makes "no baseline regen" true rather than hopeful.
- `tooling/drift-check.mjs` (lines 1–7, 100–120) — Why: the gate that proves determinism. Its header states it requires `tooling/style-dictionary/node_modules`; `checkHandoff()` runs `genHandoff()` → `genVocabulary()` → `genPackBundle()` then asserts a clean `git status --porcelain -- handoff/`. This is the mechanism that makes the bump self-verifying.

### New Files to Create

- `.claude/reports/ci-node-pin-cache-eviction-report.md` — the execution report (per CLAUDE.md: plan + report + review ship in the same PR).

No source files are created. This ticket edits exactly one file.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Ubuntu2404-Readme.md @ image `20260720.247`](https://github.com/actions/runner-images/blob/ubuntu24/20260720.247/images/ubuntu/Ubuntu2404-Readme.md)
  - Section: *Cached Tools → Node.js*
  - Why: **the primary evidence.** This is the exact image version the last `verify` run used (read off its own log). It caches **22.23.1** and **24.18.0**. Node 20 is absent — which is the root cause, stated by the image itself rather than inferred.
- [Issue #154's own comment thread](https://github.com/linardsb/ux-factory/issues/154#issuecomment-)
  - Section: the owner's determinism-check comment (2026-07-27)
  - Why: the prior evidence + the two caveats this plan closes. Also states the standing rule: *"the pin is a deliberate owner decision; this comment is the evidence for making the call, not the call."* The ticket being assigned is the call.
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
  - Why: the EOL dates driving 24-over-22 (22 → April 2027, 24 → April 2028).
- [actions/setup-node — `node-version`](https://github.com/actions/setup-node#usage)
  - Why: confirms major-version resolution against the tool cache, and that `check-latest: false` (the default, visible in the run log) means "prefer what's on disk" — the behaviour the major pin depends on.

### Patterns to Follow

**Comment style in `verify.yml` — the load-bearing "why", not the "what".** Every comment in this file explains a decision a future reader would otherwise undo. From lines 35–38:

```yaml
      # This pin is the Node the `run:` steps execute on, and it is NOT what the actions' own v7
      # bump changed — that was their internal runtime (node20 → node24), which GitHub was already
      # forcing. The two are independent: bumping the action does not move the generators' baseline,
      # and this number is not the thing to touch when a runtime deprecation is announced.
```

The replacement must be the same species: state the reason the number is what it is, and name the specific wrong move a future reader would make.

**Evidence-in-prose.** Per CLAUDE.md's honesty contract, claims carry their receipts. `verify.yml`'s header already does this (naming ticket numbers inline). Cite #154 and the measured result, not "verified to work".

**Commit + PR conventions** (CLAUDE.md → Git):

- One atomic commit; message = what + doc reference, e.g. `chore(ci): pin verify to a Node the runner still caches (#154)`.
- **The PR body MUST carry `Closes #154`** — a title mentioning `(#154)` closes nothing. This has cost a wasted planning pass before (#78).
- Plan + report + review all land in the same PR.

---

## IMPLEMENTATION PLAN

### Phase 1: Re-establish the evidence at the commit being changed

The determinism proof already exists in this plan, measured on linux/amd64 at `e7c9369`. Phase 1 is a **confirmation** step, not a discovery step: re-run it only if `main` has moved since `e7c9369`, because the artifacts (`loc-summary.json`, `system-graph.json`, `handoff/`) move with almost every merge and the proof is only as current as the tree it ran on.

**Tasks:** verify HEAD; re-run the container sweep iff HEAD ≠ `e7c9369`.

### Phase 2: The edit

**Depends on:** Phase 1 (don't change the pin on evidence from a stale tree).

Two YAML lines and one comment block in one file.

### Phase 3: Prove it on the real runner

**Depends on:** Phase 2.

Push, then **read the log**. This is the phase that actually closes the ticket — the local evidence is off-runner by construction, and CI is the only place both goals can be confirmed at once.

### Phase 4: Paper trail

**Depends on:** Phase 3 (the report records what the run actually said).

Report + PR with `Closes #154`.

---

## STEP-BY-STEP TASKS

### 1. VERIFY the tree the evidence applies to

- **IMPLEMENT**: Branch off current `main` and check whether the determinism evidence in this plan still describes it.
  ```bash
  git fetch origin
  git log --oneline origin/main -1        # evidence was measured at e7c9369
  git checkout -b fix/ci-node-pin-154 origin/main
  ```
- **GOTCHA**: This repo's worktrees are shared across parallel sessions and the owner merges fast — confirm you branched off the *current* `origin/main`, not a stale local `main`. (During this planning pass, local `main` was two commits behind `origin/main`.)
- **DECISION**: If `origin/main` is still `e7c9369` → the evidence table in this plan stands; **skip Task 2**. If it has moved → **run Task 2**, because artifacts move with merges.
- **VALIDATE**: `git rev-parse --short HEAD` and `git status --porcelain` (must be empty)
- **SATISFIES**: AC #4

### 2. RE-RUN the determinism sweep (conditional — only if `origin/main` ≠ `e7c9369`)

- **IMPLEMENT**: Regenerate every committed artifact under Node 24 on linux/amd64 in an isolated clone, and assert an empty **unscoped** porcelain.
  ```bash
  rm -rf /Users/Berzins/Desktop/Linards_current/node154-clone
  git clone -q --no-local https://github.com/linardsb/ux-factory.git \
    /Users/Berzins/Desktop/Linards_current/node154-clone
  cd /Users/Berzins/Desktop/Linards_current/node154-clone && git checkout -q origin/main

  docker run --rm --platform linux/amd64 -v "$PWD":/work -w /work node:24 sh -c '
    set -e
    git config --global --add safe.directory /work
    echo "node $(node --version) / npm $(npm --version)"
    cd tooling/style-dictionary && npm ci 2>&1 | tail -3; echo "npm ci exit=$?"
    cd /work
    node tooling/drift-check.mjs
    node tooling/token-lint.mjs
    node tooling/build-checks.mjs 2>&1 | tail -3
    echo "### PORCELAIN"; git status --porcelain; echo "<<<END>>>"
  '
  ```
- **PATTERN**: `.claude/plans/ci-verification-gates.md` L366 — the original determinism proof used exactly this isolated-clone-in-a-Linux-container technique under `node:20`.
- **GOTCHA — use a clone, not a `git worktree`.** A worktree's `.git` is a *file* pointing at an absolute path under the main repo (`.../ux-factory/.git/worktrees/...`) which is outside the bind mount, so every `git` call inside the container dies with `fatal: not a git repository`. `drift-check` depends on `git ls-files` and `git status`. This was hit and worked around during planning.
- **GOTCHA**: `--platform linux/amd64` is required on Apple Silicon — CI is x64 and the point is to test *its* platform.
- **GOTCHA**: `git config --global --add safe.directory /work` — the container runs as root over host-owned files; without it git refuses on dubious ownership.
- **GOTCHA**: Clone from the **GitHub URL**, not the local path. A `--no-local` clone of the local repo only carries local branches, so a just-merged `origin/main` commit may be missing (hit during planning: `pathspec 'e7c9369' did not match`).
- **GOTCHA**: `node_modules/` is gitignored, so the `npm ci` cannot pollute the porcelain — that is what makes the *unscoped* porcelain a valid assertion.
- **PASS CONDITION**: `drift-check ✓`, `token-lint ✓`, `build ✓`, and **`### PORCELAIN` followed immediately by `<<<END>>>`** (nothing between).
- **IF IT FAILS — read the failure against this plan's table before concluding anything.** Two very different causes look identical:
  - *Failed here **and** would have failed at `e7c9369`* → Node 24 is genuinely version-sensitive for this repo. **Stop, do not bump the pin.** Close #154 as `wontfix` recording which artifact moved under which Node — an explicitly valid outcome of this ticket, not a failure of it.
  - *Failed here **but this plan's table passed at `e7c9369`*** → the regression arrived in a merge *between* `e7c9369` and current `main`, and is **not** evidence against Node 24. Do not close the ticket. Re-run the same sweep at `e7c9369` to confirm the split, then bisect the intervening merges for the version-sensitive generator. That is a separate bug (one `drift-check` would surface on its own once the pin moves), and #154 resumes after it is fixed.
- **VALIDATE**: the block above, read for the empty-porcelain line
- **SATISFIES**: AC #4

### 3. UPDATE `.github/workflows/verify.yml` — the pin

- **IMPLEMENT**: Line 41, `node-version: 20` → `node-version: 24`.
- **GOTCHA**: **The major, never `24.18.0`.** The tool cache holds only what the current image ships; an exact patch pin re-breaks silently the moment the image moves to 24.19.0, restoring the exact download this ticket removes.
- **VALIDATE**: `grep -n "node-version" .github/workflows/verify.yml` → `node-version: 24`
- **SATISFIES**: AC #1

### 4. UPDATE `.github/workflows/verify.yml` — the comment block (lines 32–38)

- **IMPLEMENT**: Replace the block so it states the *new* rationale. It must carry four things:
  1. **why the number moved** — Node 20 EOL'd and aged off the `ubuntu-latest` tool cache, so a gating job was downloading a ~30 MB tarball every run;
  2. **what the pin still guarantees** — Style Dictionary output + generator determinism don't move under the runner; `drift-check` is what goes red if that is ever violated;
  3. **that determinism across 20→24 was measured, not assumed** — every committed artifact regenerates byte-identically on linux/x64 (#154);
  4. **why it is a major and not an exact patch** — the cache holds only what the image ships, so `24.18.0` would re-break at the next image bump.

  Suggested replacement (adapt to taste; keep all four points and the `#153` paragraph):
  ```yaml
      # Pin Node 24 — a version the runner image actually caches. Node 20 was the original pin
      # (it matched the local baseline the artifacts were generated against), but it EOL'd in
      # April 2026 and aged off the ubuntu-latest tool cache, so setup-node downloaded a ~30 MB
      # tarball on every run — a live network dependency on a gating job (#154).
      #
      # What the pin still buys: Style Dictionary output + generator determinism don't silently
      # move under the runner. CI Node is no longer the local baseline (still v20.20.2), so this
      # rests on measurement, not on the two matching: at #154 every committed artifact was
      # regenerated on linux/x64 under 24.18.0 and 22.23.1 and came back byte-identical, all three
      # SD targets included. `drift-check` below is the live guard — it goes red on any drift.
      #
      # Keep this a MAJOR. The tool cache only holds what the current image ships, so pinning
      # 24.18.0 would silently restore the download the moment the image moves to 24.19.0.
      #
      # This pin is the Node the `run:` steps execute on, and it is NOT the actions' own internal
      # runtime — that is what the v7 bump in #152 changed, and GitHub was already forcing it. The
      # two are independent, and a runtime-deprecation notice is still not a reason to touch this
      # number; cache eviction is.
  ```
- **PATTERN**: `.github/workflows/verify.yml` lines 56–70 (the ⚠ `portal/` block) — same job: stop a future reader from making a specific wrong move.
- **GOTCHA — do not delete PR #153's distinction.** The final paragraph exists because a reader seeing a Node deprecation notice would otherwise reach for this number. That warning is still correct; this ticket adds a *different* reason the number may move. Both must survive, or the file argues with itself. Keeping it also prevents the next reader concluding #153's advice was wrong.
- **GOTCHA**: Do not write "matches the local baseline" in any form — after this change it is false. That sentence being false is the subtlest defect this ticket can ship.
- **VALIDATE**: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/verify.yml')); print('yaml ok')"`
- **SATISFIES**: AC #3, AC #7

### 5. VERIFY the edit is exactly two lines of behaviour

- **IMPLEMENT**: Read the diff and confirm nothing else moved — no job, step, trigger, permission, action version or `working-directory` changed.
  ```bash
  git diff --stat && git diff .github/workflows/verify.yml
  ```
- **GOTCHA**: `.github/workflows/verify.yml` must be the **only** file in `git diff --stat` at this point (plan/report land in their own commit or the same one, but no source file may appear).
- **VALIDATE**: `git diff --numstat` → one file; confirm by eye that the only non-comment change is `20` → `24`
- **SATISFIES**: AC #6

### 6. COMMIT and push

- **IMPLEMENT**:
  ```bash
  git add .github/workflows/verify.yml .claude/plans/ci-node-pin-cache-eviction.md
  git commit -m "chore(ci): pin verify to a Node the runner still caches (#154)"
  git push -u origin fix/ci-node-pin-154
  ```
- **GOTCHA**: Stage by **explicit path** — this working directory is shared with parallel sessions, so `git add -A` can sweep in another session's work.
- **VALIDATE**: `git log --oneline -1 && git status --porcelain`
- **SATISFIES**: AC #6

### 7. READ THE RUN LOG — the step that actually closes the ticket

- **IMPLEMENT**: Wait for `verify` on the pushed branch, then read **the `verify` job's `setup-node` step** — scoped to that job, not the whole run:
  ```bash
  RUN=$(gh run list --workflow=verify.yml --branch fix/ci-node-pin-154 --limit 1 --json databaseId -q '.[0].databaseId')
  JOB=$(gh run view "$RUN" --json jobs -q '.jobs[] | select(.name=="verify") | .databaseId')
  gh run view "$RUN" --log --job "$JOB" | grep -E "Run actions/setup-node@v7" -A 12
  ```
  Then read those ~12 lines **by eye**.
- **PASS CONDITION** — both, literally, within that step's output:
  - it **contains** `Found in cache @ /opt/hostedtoolcache/node/24.*/x64`
  - it contains **no** `Attempting to download` / `Acquiring` line
- **GOTCHA — scope the check to the job, or it can pass for the wrong reason.** `gh run view --log` without `--job` concatenates **both** jobs' logs, so a bare `grep` for these strings is asserting a property of the whole run when the claim is about one step. Today `visual` has no `setup-node` so an unscoped grep happens to be clean, but that is luck, not a check — and this is precisely the "check that cannot fail" shape this repo has been bitten by. Read the step, not the run.
- **GOTCHA — a green `verify` proves nothing on its own.** Node 20 produced green runs for months; that is the ticket's premise. Green means determinism held; only the cache strings mean the download is gone. If it says `Attempting to download 24...`, the bump achieved nothing on goal #1 — stop and reconsider (a `22` retry is the next move, since 22.23.1 is equally cached and equally verified).
- **ALSO CONFIRM**: `drift-check ✓` and `build ✓` in the same run — that is determinism re-proven **on the real runner**, closing the "measured off-runner" caveat that neither local sweep could close.
- **VALIDATE**: the grep above; record its literal output in the report
- **SATISFIES**: AC #1, AC #2, AC #5

### 8. CREATE the report

- **IMPLEMENT**: `.claude/reports/ci-node-pin-cache-eviction-report.md` — what changed, the local sweep table, and the **verbatim** CI log lines from Task 7 (both the cache-hit line and the `drift-check ✓` line).
- **PATTERN**: `.claude/reports/ci-verification-gates-report.md`
- **GOTCHA**: Quote the log; don't paraphrase it. The claim being made is "the download is gone", and the log line is the only proof of it.
- **VALIDATE**: file exists and contains the literal `Found in cache` line
- **SATISFIES**: AC #5

### 9. OPEN the PR

- **IMPLEMENT**: PR titled `chore(ci): pin verify to a Node the runner still caches (#154)`, body covering: the root cause (EOL → cache eviction, with the log line), the determinism table, why 24 over 22, why a major not a patch, and the explicit non-goal that `visual` is untouched so no baselines were regenerated.
- **GOTCHA**: **`Closes #154` in the PR BODY.** A title mentioning `(#154)` closes nothing — confirmed repeatedly in this repo (#78 sat open for a day and cost a planning pass).
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #154"` → `1`
- **SATISFIES**: AC #8

---

## TESTING STRATEGY

This repo has no test suite by design (CLAUDE.md: *"Done" = run the surface you touched*). The surface here is CI itself, so the gates **are** the tests.

### Unit Tests

None — no source code changes. The four `verify` steps are the unit level:

| Gate | Proves |
|---|---|
| `npm ci` (style-dictionary) | npm 11 accepts `lockfileVersion 3` — the one genuine Node-24 risk |
| `node tooling/drift-check.mjs` | 8 groups incl. SD css/ios/android — **the determinism assertion** |
| `node tooling/token-lint.mjs` | 64 contract tokens, 0 undeclared, 0 orphan, DTCG valid |
| `node tooling/build-checks.mjs` | all 10 groups, incl. group 8's SDK-free invariant |

### Integration Tests

The PR's own `verify` run, on the real `ubuntu-24.04` runner. This is the only test that can confirm **both** goals simultaneously (cache hit + determinism on-platform), and the only one running on the actual target hardware.

### Edge Cases

- **Node 24 not actually cached** → log says `Attempting to download 24...`. Falsified by the image README (24.18.0 listed) but confirmed only by Task 7. Fallback: `22`.
- **npm 11 rejects the lockfile** → `npm ci` red. **Already falsified** — exit 0 under npm 11.16.0.
- **An artifact differs under 24** → `drift-check` red. **Already falsified** on linux/amd64 at `e7c9369`; re-asserted by CI on every future push.
- **`main` moved since the sweep** → Task 1's conditional catches it; Task 2 re-runs.
- **Exact-patch pin creep** → a future editor "helpfully" pins `24.18.0` and silently restores the download. Defended by the comment, which is why Task 4 is not cosmetic.
- **Image drops 24 (April 2028)** → this ticket recurs. Expected; the comment tells the next reader exactly what to do.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

No linter in this repo (CLAUDE.md — don't hunt for one). YAML validity:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/verify.yml')); print('yaml ok')"
grep -n "node-version" .github/workflows/verify.yml     # expect: node-version: 24
```

### Level 2: Unit Tests

```bash
node tooling/drift-check.mjs
node tooling/token-lint.mjs
node tooling/build-checks.mjs
```

> Run these under **Node 24** to be meaningful: `source ~/.nvm/nvm.sh && nvm use 24`.
> Local `build-checks` does **not** prove group 8 — `portal/node_modules` is present locally and its absence is the proof. Either accept the caveat or use the documented `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`. The container run in Task 2 sidesteps this entirely: a fresh clone never installs portal deps, reproducing CI's conditions exactly.

### Level 3: Integration Tests

The Task 2 container sweep (full command in that task). Pass = `drift-check ✓`, `token-lint ✓`, `build ✓`, empty unscoped porcelain.

### Level 4: Manual Validation

The ticket's actual acceptance test — Task 7's `--job`-scoped read:

```bash
RUN=$(gh run list --workflow=verify.yml --branch fix/ci-node-pin-154 --limit 1 --json databaseId -q '.[0].databaseId')
JOB=$(gh run view "$RUN" --json jobs -q '.jobs[] | select(.name=="verify") | .databaseId')
gh run view "$RUN" --log --job "$JOB" | grep -E "Run actions/setup-node@v7" -A 12
```

Expect, in **that step's** output: a `Found in cache @ /opt/hostedtoolcache/node/24.*/x64` line and **no** `Acquiring` / `Attempting to download` line. Do not drop the `--job` scope (see Task 7's GOTCHA).

### Level 5: Additional Validation (Optional)

None — **deliberately.** The obvious candidate is a wall-clock comparison against the ~57s–1m5s baseline, and it is left out on purpose: the download cost roughly 4.5s of a ~60s run, and publishing that delta invites the next reader to treat CI *duration* as the thing being fixed and optimize against it. What is being fixed is a gating job's dependency on an external network fetch. A faster red run is still red.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `.github/workflows/verify.yml` pins `node-version: 24` (major, not an exact patch), and **the `verify` job's `setup-node` step** logs `Found in cache @ /opt/hostedtoolcache/node/24.*/x64`
- [ ] **AC #2** — **that same step** logs no `Attempting to download` / `Acquiring` line. Asserted against the step's own output (`--job`-scoped), not against the concatenated run log — the claim is a property of one step, and an unscoped grep can pass by matching, or failing to match, the other job
- [ ] **AC #3** — the comment above the pin states all four: why the number moved (EOL → cache eviction), what the pin still guarantees, that 20→24 determinism was measured, and why it must stay a major
- [ ] **AC #4** — every committed artifact regenerates byte-identically under Node 24 on linux/x64 at the commit being changed (empty **unscoped** `git status --porcelain`)
- [ ] **AC #5** — `drift-check`, `token-lint` and `build-checks` all pass **on the runner** under Node 24, and the report quotes the log lines verbatim
- [ ] **AC #6** — `.github/workflows/verify.yml` is the only workflow file changed; no job, step, trigger, permission or action version moved
- [ ] **AC #7** — PR #153's warning (action runtime ≠ this pin) survives the comment rewrite intact
- [ ] **AC #8** — the PR body carries `Closes #154`; plan + report + review all ship in that PR
- [ ] **AC #9** — no visual-regression baselines regenerated, and the `visual` job is untouched

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] `verify` green on the PR **and its log read for the cache string** (green alone is not the check)
- [ ] No linting or type checking errors (n/a — repo has neither)
- [ ] Manual testing confirms feature works (the log grep)
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions**

1. **The owner wants the bump made.** Issue #154 leaves the call open (*"the pin is a deliberate owner decision… this comment is the evidence for making the call, not the call"*). This plan assumes assigning the ticket for planning **is** the call. If not, the alternative outcome is already specified: close `wontfix` with the evidence recorded — no code changes needed, and the evidence in this plan is what would be recorded.
2. **`ubuntu-latest` stays `ubuntu-24.04`** for the foreseeable future. If GitHub moves it to `ubuntu-26.04`, the cached set changes and this ticket may recur early. `drift-check` + the cache string in the log remain the detectors.
3. **Longest EOL runway is the right tiebreak** between two equally-verified versions. If the owner prefers tracking the *system default* instead (Node 22 is `ubuntu-24.04`'s system Node), 22.23.1 is verified byte-identical too — swap the number, keep everything else, and change the comment's stated reason. This is a one-character change with no re-verification needed.

**Questions that would change the plan if answered differently**

- **Should the local baseline move to Node 24 as well, re-aligning local with CI?** This plan says no (out of scope, and the repo pins no local Node). But it leaves a real asymmetry: contributors generate artifacts on 20 and CI verifies on 24. That is *safe* — it is exactly the divergence `drift-check` exists to police, and it is now measured across both — but it is a standing invariant worth an explicit owner decision rather than a silent one. A follow-up could add an `.nvmrc`; deliberately not done here.

**Observed but out of scope**

- `tooling/build-checks.mjs` now reports **10 groups** (`build analytics` added by #149/PR #162). `CLAUDE.md` still says 9. A one-line doc staleness belonging to #149's paper trail, not #154 — flagged so it isn't lost, deliberately not fixed here (CLAUDE.md: surgical changes).

---

## NOTES (open canvas)

### The measured evidence, in full

Run during this planning pass. Isolated clone at `e7c9369` (`origin/main`, 2026-07-28), Docker `--platform linux/amd64` — CI's platform, not the macOS/arm64 the owner's earlier check was limited to.

**Node 24** — `docker run --platform linux/amd64 node:24`:

```
node v24.18.0
npm  11.16.0
npm ci exit=0                                   (tooling/style-dictionary)
sd tokens       ✓  css + ios + android → handoff/verdant/tokens
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
token-lint      ✓  64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
build           ✓  all 10 groups pass
### PORCELAIN (unscoped, after every generator wrote)
<<<PORCELAIN-END>>>                             ← nothing between. byte-identical.
```

**Node 22** — same clone, `node:22`:

```
node v22.23.1
npm  10.9.8
npm ci exit=0
drift-check     ✓  (8 groups)
token-lint      ✓  64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
### PORCELAIN
<<<END>>>                                       ← also byte-identical.
```

Three things worth pulling out:

1. **The Docker tags resolved to the runner's exact cached builds** — `node:24` → 24.18.0 and `node:22` → 22.23.1, matching the image README precisely. The usual caveat about a floating major tag does not apply; these tested the actual binaries.
2. **`portal/node_modules` was absent in the container** (fresh clone, portal deps never installed), so `build-checks` group 8's SDK-free invariant was proven *the same way CI proves it* — by absence. A local macOS run cannot make that claim.
3. **npm 11 was the real risk and it cleared.** Node 24 ships npm 11.16.0 against the baseline's 10.8.2. A stricter npm major rejecting `lockfileVersion 3` would have reddened a gating step. Exit 0, clean, only a cosmetic "npm 12 available" notice. This was the discriminator between 24 and 22 — had it failed, 22 (npm 10.9.8) was the fallback.

### Root cause, stated by the image itself

The last `verify` run (`30365798586`) logs its own image: `ubuntu-24.04`, version `20260720.247`. That image's README lists cached Node.js as **22.23.1** and **24.18.0** — no 20. So `setup-node` has nothing on disk to resolve `20` against and falls through to the network. Not inference: the image's own manifest, cross-checked against the run log's download line.

### Why not the alternatives

| Option | Why not |
|---|---|
| **Remove the pin** | Trades a network dependency for a determinism hazard. The pin is load-bearing; `drift-check` catching drift *after* the fact is not as good as not drifting. |
| **`actions/cache` the toolchain** | Caches the symptom. Still a fetch on cold cache, adds a cache key to maintain, and leaves a gating job depending on cache-service availability instead of GitHub Releases. Strictly more machinery for less benefit. |
| **Pin `24.18.0` exactly** | **Actively harmful.** Re-breaks silently at the next image bump to 24.19.0 — the cache only holds what the image ships. This is the single easiest way for a future editor to undo the ticket while believing they are tightening it, which is why the comment says so explicitly. |
| **Node 22** | Equally verified and equally cached; the *system* default, so arguably the most conservative choice. Rejected on runway alone — April 2027 EOL means re-running this ticket in ~9 months, and cache-eviction-at-EOL is the exact failure being fixed. Documented as a drop-in fallback. |
| **A `20 + 24` matrix** | Doubles CI time to verify a configuration nothing ships on, and keeps the Node 20 download it is meant to remove. |

### Why this change is safe despite the local evidence being off-runner

The bump is **self-verifying**, which inverts the usual risk profile of a CI change. `drift-check` runs on every push and asserts byte-identical regeneration of everything committed. If Node 24 moved any artifact on the runner, the very first run goes red, loudly, naming the drifted file — before any of it reaches `main`. The change cannot fail silently.

The one thing that *is* silent is the download itself: no gate asserts "the toolchain came from disk". That asymmetry is the whole reason AC #1/#2 name literal log strings. This repo has already been bitten by checks that skip the thing they test; "CI is green" would be exactly that mistake here, since green is the state the ticket *starts* in.

### The comment is the deliverable

If this ticket ships only the number change, it ships a false statement: the block would still claim the pin matches the local baseline, which stops being true the moment `24` lands. The pin's justification genuinely changes shape —

> *before:* CI Node **is** the baseline the artifacts were generated on.
> *after:* CI Node is **a version measured to emit identical artifacts**, chosen because the runner caches it.

The second is a weaker guarantee resting on evidence rather than identity, and the file has to say so. That, plus the major-not-patch warning and the preserved #153 distinction, is why Task 4 carries more weight than Task 3.

## AMENDMENTS

<!-- newest at the bottom -->

- **2026-07-28 (implementation) — the task order 6 → 7 → 8 → 9 cannot run as written; it is 6 → 9 → 7 → 8.** `verify.yml` triggers on `push: branches: [main]` + `pull_request`. A push to a feature branch matches **neither**, so **no run exists until the PR is open** and Task 7's `gh run list --branch fix/ci-node-pin-154` returns empty on a bare push. Open the PR (Task 9) *first* — that is what starts the run — then read the log, then write the report. Consequence for Task 9: the PR body is necessarily written before the log line exists, so either point it at the report or `gh pr edit` the verbatim lines in afterwards (this pass did the latter). This applies to **any** CI ticket in this repo, not just #154.
- **2026-07-28 (implementation) — Task 7's `gh run view --log --job` needs the WHOLE run complete, not just that job.** With `visual` still in progress it prints `run … is still in progress; logs will be available when it is complete` — and a `grep` over that message returns "no download lines found", a false pass of AC #2 against a log that was never read. Use `gh api /repos/<owner>/<repo>/actions/jobs/<JOB>/logs`, which returns the completed job's log alone (the same `--job` scoping, available immediately), and pair the negative grep with a positive control (`grep -c "Found in cache"`) so a zero is a result rather than an empty file.
