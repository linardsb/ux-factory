# Feature: the security gate — a PR leaves draft only through a no-model step

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Three pieces that together make one guarantee: **a pull request in this repo cannot leave draft except through a step that has no model in it.**

- **O1 — the edge.** `piv-create-pr` opens every PR as a draft. A new `ready-pr` job in `.github/workflows/verify.yml` is the only thing that flips it, and it is bash reading job results. A red gate leaves the PR a draft carrying the red check.
- **S1 — static analysis.** GitHub's own **CodeQL** scanning a `javascript-typescript` database of the hand-written source, plus a bash step that reads the resulting alerts back through the code-scanning API and fails on anything at `high` or `critical`.
- **S2 — dependency delta.** A zero-dep Node script diffs the npm advisory set between the PR's base and its head across the three dependency-carrying tooling directories, and fails when head carries an advisory ID base did not.

Plus the rule change that stops the next editor deleting it: one sentence in CLAUDE.md §Testing admitting the CodeQL gate, and a gates.md section stating what the three steps cannot reach.

## User Story

As the owner of a public portfolio repo reviewed by hiring managers
I want a pull request to become reviewable only after a machine with no model in it has checked it
So that "ready for review" is a fact about the code, not a claim by the agent that wrote it.

## Problem Statement

`piv-create-pr` opens every PR ready for review (`--draft` only when the local gate is red — `.claude/skills/piv-create-pr/SKILL.md:75` and `:134`, both read this session). The agent that wrote the code is the one declaring it reviewable. CI `verify` is the repo's only no-model verifier, and it gates the merge button — except that **`main` is not protected** (observed: `gh api repos/linardsb/ux-factory/branches/main/protection` → 404 "Branch not protected"), so today it gates nothing mechanically at all. There is no static security analysis and no dependency check anywhere in the gate stack (`.claude/references/gates.md`, read this session).

## Solution Statement

Move the reviewable/not-reviewable decision from the agent to CI. The agent can only ever produce a draft; a `ready-pr` job with `pull-requests: write` is the sole path out of it, and it refuses unless every other job in the run reported success **and** the visual gate's true step outcome — read from a job output, not from `needs.<job>.result` — was success too. Two new jobs (`codeql`, `audit`) give that decision something worth checking.

## Out of Scope / Non-Goals

- **Not included:** the remediation loop (read the findings, fix, re-scan, up to three cycles, no suppression). That is **#388**, which depends on this PR being merged. #388's body was rewritten to CodeQL's alerts API on 2026-09-10.
- **Not included:** any suppression mechanism — no `// codeql[rule-id]` inline suppressions, no dismissing alerts in the Security tab to get a PR through. Suppression policy belongs to #388.
- **Not included:** `gh pr ready --undo` on a later red push. The draft gate is **one-way, at the moment of the flip** — see Open Questions Q1.
- **Not included:** branch protection on `main`. Owner's call, and orthogonal — see Q2.
- **Not changing:** the `visual` job's D11 VR-freeze semantics. On `feature/v3-*` the run still goes green with the check red; Task 4 preserves that byte for byte while making the true outcome readable.
- **Not changing:** the `verify` job's steps, its `contents: read`, or its ⚠ no-`npm ci`-for-portal invariant.
- **Not fixing:** `piv-create-pr` Phase 2.5 references `scripts/record-gate.sh` and `scripts/inherited-figures.sh`, and **neither exists in this repo** (observed: `ls scripts/` → No such file or directory). Pre-existing, unrelated to the draft edge, out of scope.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `.github/workflows/verify.yml`, `.claude/skills/piv-create-pr/SKILL.md`, a new `.github/codeql/codeql-config.yml`, a new `tooling/audit-delta.mjs`, plus the two rule surfaces (`CLAUDE.md`, `.claude/references/gates.md`)
**Dependencies**: `github/codeql-action@v4` (init + analyze) · the runner's `gh` and `npm`. **No account, no secret, no third-party service, and no new repo dependency** — nothing is added to any `package.json`, and CodeQL is free on a public repo (observed: `gh repo view --json visibility` → `PUBLIC`; the code-scanning API answers `404 no analysis found`, not a 403, so it is available and simply unused).

## Related Work

**Implements**: [#387](https://github.com/linardsb/ux-factory/issues/387)   ·   **Epic**: none — #387 is standalone, from the Archon `secure-fix-issue` assessment (2026-09-10). There is no `secure-fix-issue` workshop file in this repo (observed: `grep -rl "secure-fix" .archon .claude` → no matches); the issue body is the whole specification.

**Back-references:**

- `.claude/references/gates.md` — the gate stack this extends; its "every gate STATES the boundary it cannot reach" convention governs Task 12.
- `tooling/drift-check.mjs:162-191` — the group-count leg, whose regexes constrain what Tasks 11 and 12 may write.

**Forward-references:**

- [#388](https://github.com/linardsb/ux-factory/issues/388) — the remediation loop. **Depends on this PR being merged.** Rewritten on 2026-09-10 to read the PR's CodeQL alerts (`GET /repos/{o}/{r}/code-scanning/alerts?ref=refs/pull/N/merge`) instead of Sonar's API, and to refuse a ref with no analysis rather than reporting "no findings".

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.github/workflows/verify.yml` (all 115 lines) — Why: the whole of O1/S1/S2 lands here. **Read the header comment and the ⚠ block at lines 73-81 before touching anything.** Two jobs today: `verify` (lines 26-83) and `visual` (85-115). Confirmed identical to `origin/main` (observed: `git diff origin/main HEAD -- .github/workflows/verify.yml` → empty).
- `.github/workflows/verify.yml:92` — `continue-on-error: ${{ startsWith(github.head_ref, 'feature/v3-') }}` — the D11 VR-freeze. **This is the single fact that breaks the ticket's O1 as written.** See Task 4.
- `.github/workflows/verify.yml:109-114` — the `Upload diff report` step, `if: failure()`. Task 4 must change this condition or silently kill it.
- `.claude/skills/piv-create-pr/SKILL.md` — six sites carry the "opens ready for review" claim; Task 10 lists all six by line.
- `tooling/drift-check.mjs:162-191` (`checkGroupCount`) — Why: it pins a group count in `tooling/build-checks.mjs`, `CLAUDE.md` **twice** and `.claude/references/gates.md`, by regex. Tasks 11 and 12 edit two of those files.
- `agent-layer/gen-loc-summary.mjs:22-26` (the `GROUPS` array) — Why: the three regexes that decide whether a new tracked file churns `system/loc-summary.json`. Pre-flight ran them against every path this plan touches; see REGENERATES on each task.
- `CLAUDE.md:162` — the §Testing bullet Task 11 amends.
- `.claude/references/gates.md:7` — the "What runs in CI (`verify` job)" sentence, which goes stale the moment two jobs are added. Task 12 updates it.
- `.claude/references/gates.md:11` — `## tooling/build-checks.mjs — 34 pure groups, in CI`. The drift-check regex `/(\d+) pure groups/g` reads this line. Do not add a second match with a different number.
- `portal/package.json`, `tooling/style-dictionary/package.json`, `tooling/visual-regression/package.json` — Why: the three audit targets. **`tooling/visual-regression` has only `devDependencies`** (`@playwright/test`), which is why this plan drops `--omit=dev` — see Task 1's GOTCHA.

### New Files to Create

- `.github/codeql/codeql-config.yml` — CodeQL's analysis scope: a `paths` allowlist plus `paths-ignore` for the generated and committed-run subtrees inside it.
- `tooling/audit-delta.mjs` — S2's engine. Zero-dep Node ESM, runnable standalone, so the reddening proof does not need a push.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [`actions/starter-workflows` — `code-scanning/codeql.yml`](https://github.com/actions/starter-workflows/blob/main/code-scanning/codeql.yml)
  - Why: GitHub's own canonical workflow. Read this session; it is the source for the `permissions` block (`security-events: write`, `packages: read`, `actions: read`, `contents: read`), for `github/codeql-action/init@v4`, for the `category: "/language:<lang>"` convention, and for the language identifier — `javascript-typescript`, stated verbatim in its own comment ("Use 'javascript-typescript' to analyze code written in JavaScript, TypeScript or both").
- [`github/codeql-action` — `analyze/action.yml`](https://github.com/github/codeql-action/blob/main/analyze/action.yml)
  - Why: **read this, it decides the gate's shape.** Its complete input list has **no fail-on-findings input**, and its outputs are `db-locations`, `sarif-output`, `sarif-id`. CodeQL uploads and goes green. Making it a gate is a step we write, not a flag we set. Its `wait-for-processing` input defaults to `true`, which is what makes the alerts queryable the moment `analyze` returns.
- [REST — List code scanning alerts for a repository](https://docs.github.com/en/rest/code-scanning/code-scanning#list-code-scanning-alerts-for-a-repository)
  - Why: the gate's one API call. Confirms verbatim that `ref` accepts `refs/pull/<number>/merge`, that the security severity lives at `rule.security_severity_level` with values `low` · `medium` · `high` · `critical` · `null`, that the file is at `most_recent_instance.location.path`, and that `state` is `open` · `dismissed` · `fixed`.
- [About code scanning](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning)
  - Why: the pricing boundary, in GitHub's words — *"If you want to use code scanning on private repositories, you need a GitHub Code Security license."* No such requirement for public. This repo is public.
- [actions/toolkit#1739 — `continue-on-error` should not return `success` in `needs_job_result`](https://github.com/actions/toolkit/issues/1739)
  - Why: **the primary source for Task 4.** A job-level `continue-on-error: true` that fails still reports `needs.<job>.result == 'success'`; there is no second field exposing the truth.

### Patterns to Follow

**File headers are the specification** (CLAUDE.md §Ground rules). `verify.yml` opens with a job-by-job comment; `tooling/*.mjs` opens with a what/why plus a `Standalone:` line. Mirror both.

`tooling/drift-check.mjs:1-7`:
```js
// tooling/drift-check.mjs — CI generator-drift gate (epic #1, ticket #9).
// Re-runs the repo-self-contained generators + validators; exits 1 on any drift or
// ...
// Standalone:  node tooling/drift-check.mjs
```

**Errors name the offending path and throw plain `Error`s** (CLAUDE.md §Ground rules). `agent-layer/gen-loc-summary.mjs:39`:
```js
if (!files.length) throw new Error(`loc-summary: group "${g.id}" matched no tracked files — fix agent-layer/gen-loc-summary.mjs`);
```

**Zero-dep Node ESM, `execFileSync`/`spawnSync` for subprocesses.** `agent-layer/gen-loc-summary.mjs:34`:
```js
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
```

**Never interpolate `${{ }}` directly into a `run:` block.** Bind it to `env:` and read `"$VAR"`. It is a script-injection shape, CodeQL's own GitHub Actions queries flag it, and this repo is about to start scanning itself.

**Least privilege per job.** Both existing jobs declare `permissions: contents: read` with a comment saying why. The repo default is read-only (observed: `gh api .../actions/permissions/workflow` → `{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}`), so only `ready-pr` widens, and only to `pull-requests: write`.

---

## IMPLEMENTATION PLAN

### Phase 0: none

**There is no owner prerequisite and nothing blocks on your hand.** This is the headline change from the ticket as written: CodeQL needs no account, no organisation, no repository secret, no analysis-method switch and no quality-gate configuration. The implementer can run the whole plan start to finish.

### Phase 1: S2 — the dependency delta

**Independent of:** Phases 2-5. Provable entirely on this machine.

The engine (`tooling/audit-delta.mjs`) and its CI job.

### Phase 2: the visual job tells the truth

**Independent of:** Phase 1.

Give the `visual` job a job output carrying its VR step's real outcome, so `ready-pr` has something a `continue-on-error` cannot launder.

### Phase 3: S1 — CodeQL

**Independent of:** Phases 1 and 2.

Measure the baseline first, then wire the gate. `.github/codeql/codeql-config.yml`, the `codeql` job, and the alert-reading step whose threshold the baseline picks.

### Phase 4: O1 — the edge

**Depends on:** Phases 1, 2 and 3 (the `ready-pr` job names `audit`, `visual` and `codeql` in `needs:`).

The `ready-pr` job, and `piv-create-pr` opening drafts.

### Phase 5: the rule change

**Independent of:** Phases 1-4.

CLAUDE.md §Testing and the gates.md section.

### Phase 6: proof

**Depends on:** everything. A throwaway branch, a throwaway PR, four mutations.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

**Before Task 1:** branch from `origin/main`, not from the current branch.
```bash
git fetch origin && git switch -c feature/security-gate-387 origin/main
```
The session that planned this was on `feature/discovery-affordances-289` with #289's work and a dirty tree. Per `[[shared-worktree-parallel-sessions]]`, verify the branch immediately before committing and stage by explicit path.

### Task 1 · CREATE `tooling/audit-delta.mjs`

- **IMPLEMENT**: A zero-dep Node ESM script. `node tooling/audit-delta.mjs <base-ref>` compares the npm advisory set between `<base-ref>` and the working tree across every dependency-carrying directory, and exits 1 naming every advisory ID head carries that base did not.

  **Discover the directories, never hardcode them.** The surface is the parent of every tracked lockfile, on **both** sides — union them, so a directory added *or* removed by the PR is still compared:
  ```js
  const dirsAt = (ref) => execFileSync("git", ["ls-files", "--with-tree", ref, "*package-lock.json"],
    { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean).map((f) => dirname(f));
  const DIRS = [...new Set([...dirsAt(baseRef), ...dirsAt("HEAD")])].sort();
  ```
  Observed today: exactly `portal`, `tooling/style-dictionary`, `tooling/visual-regression`. A hardcoded list would leave a future `tooling/<new>/package.json` silently unaudited — the same hand-maintained-list-with-no-gate shape that made `--omit=dev` vacuous (F3 in NOTES). Print the discovered list on stdout so a run says what it looked at.

  Algorithm, per directory:
  1. **Base side.** `git show <base-ref>:<dir>/package.json` and `git show <base-ref>:<dir>/package-lock.json` into a fresh `mkdtempSync` directory. A `git show` exit of **128** means the path does not exist at base (a newly added tooling dir) — treat the base advisory set as **empty** and say so on stdout.
  2. **Head side.** Copy the working tree's `<dir>/package.json` and `<dir>/package-lock.json` into a second fresh temp dir. **Copy, do not run in place** — base has no `node_modules` and head must not either, or the two sides are not comparable.
  3. Run `npm audit --json` in each temp dir with `spawnSync`, `encoding: "utf8"`.
  4. Advisory set = every numeric `.source` across every `vulnerabilities[<pkg>].via[]` entry that is an object. (`via` entries that are plain strings name a parent package, not an advisory.)
  5. Delta = `head \ base`. Print each new ID with its package, severity and title.
- **PATTERN**: header + `Standalone:` line as `tooling/drift-check.mjs:1-7`; `execFileSync`/`spawnSync` and `throw new Error(...)` naming the path as `agent-layer/gen-loc-summary.mjs:34,39`.
- **IMPORTS**: `node:child_process` (`execFileSync`, `spawnSync`), `node:fs` (`mkdtempSync`, `copyFileSync`, `writeFileSync`), `node:os` (`tmpdir`), `node:path`. Nothing else — zero-dep.
- **GOTCHA — `npm audit --json` exits 1 when it finds anything.** Observed this session: exit **1** with vulnerabilities, exit **0** without. `execFileSync` throws on non-zero, so **use `spawnSync` and read `.stdout` regardless of `.status`.**
- **GOTCHA — fail closed on an unusable audit (this is the whole check).** `npm audit` hits the live registry. If either side's stdout does not parse as JSON, or the parsed object has no `vulnerabilities` key, **throw naming the directory and the side**. A head-side failure yielding an empty advisory set makes the delta pass vacuously, which is exactly this repo's largest named defect class ([[check-that-cannot-fail]]).
- **GOTCHA — no `--omit=dev`, deliberately.** (The ticket's original text specified it; #387 was corrected on 2026-09-10 and now specifies its absence, for the reason below.) `tooling/visual-regression/package.json` carries **only** `devDependencies` (`@playwright/test`), so `--omit=dev` audits nothing there — a vacuous check by construction. Every dependency in this repo is build-time by rule (shipped pages carry none), so the prod/dev split has no meaning here. Observed this session: the numbers are **identical either way** — portal 0, visual-regression 0, style-dictionary 3 vulnerabilities / 5 advisory IDs (`1130095, 1130589, 1130736, 1158506, 1158507`). Write the reason into the file header.
- **VALIDATE** (expected — the file does not exist yet):
  ```bash
  node tooling/audit-delta.mjs "$(git rev-parse origin/main)"
  # expected: exit 0; the discovered directory list printed as exactly
  #   portal, tooling/style-dictionary, tooling/visual-regression
  # (observed via `git ls-files "*package-lock.json"` this session), a line per
  # directory naming its advisory count, and an empty delta — base and head are
  # the same three lockfiles today.
  ```
- **REDDENS**: see Task 3 — the reddening proof is its own task, because it needs a lockfile edit.
- **SATISFIES**: AC #3.
- **REGENERATES**: none. Observed: `tooling/audit-delta.mjs` matches none of `gen-loc-summary.mjs`'s three group regexes (`^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$`, `^agent-layer/[^/]+\.mjs$`). It **is** picked up by `drift-check`'s syntax leg (`git ls-files "*.mjs"` → `node --check`), which is a free extra gate, not a cascade.

### Task 2 · ADD the `audit` job to `.github/workflows/verify.yml`

- **IMPLEMENT**: A third job, after `visual`:
  ```yaml
  audit:
    # S2 (#387) — the dependency-advisory DELTA, not a fail-on-severity gate. The repo carries
    # three dependency-carrying tooling dirs and no shipped runtime deps; the pre-existing
    # style-dictionary advisories are build-time and must NOT block, so the gate compares base
    # against head and fails only on an advisory ID the base did not carry.
    # PR-only: there is no base to diff against on a push to main.
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          # The base commit must be reachable for `git show <base-sha>:<path>`; checkout's
          # default depth of 1 fetches only the merge ref.
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Dependency advisory delta
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
        run: node tooling/audit-delta.mjs "$BASE_SHA"
  ```
- **PATTERN**: `.github/workflows/verify.yml:26-31` (job shape, `permissions` with a why-comment) and `:55-57` (the Node 24 pin — **major only**, per the long comment at lines 33-54; do not pin a minor).
- **GOTCHA**: `actions/checkout` on a `pull_request` event checks out the **merge commit**, so the working tree is the merged result. That is the right head side — the question is what lands, not what the branch says.
- **VALIDATE** (expected): `node -e "require('node:fs').readFileSync('.github/workflows/verify.yml','utf8')"` is not a YAML check. Use the real one:
  ```bash
  gh workflow view verify --yaml >/dev/null && echo "parsed"   # after push
  # locally, before push:
  python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/verify.yml')); print(sorted(d['jobs']))"
  # expected after this task: ['audit', 'verify', 'visual']
  ```
- **REDDENS**: Task 3.
- **SATISFIES**: AC #3.
- **REGENERATES**: none (`.github/workflows/verify.yml` matches no loc-summary group; verified this session).

### Task 3 · PROVE `tooling/audit-delta.mjs` reddens

- **IMPLEMENT**: Run the mutation locally, confirm the failure, revert it. Do not skip this and do not substitute reading the code.
  ```bash
  git switch -c tmp-audit-proof
  cd portal && npm pkg set dependencies.lodash=4.17.15 && npm install --package-lock-only && cd ..
  git add portal/package.json portal/package-lock.json && git commit -m "tmp: seed a known advisory"
  BASE=$(git rev-parse origin/main)                             # PIN it — see the GOTCHA below
  node tooling/audit-delta.mjs "$BASE"                           # MUST exit 1
  git switch - && git branch -D tmp-audit-proof
  ```
- **GOTCHA — this local run rehearses the CI comparison, it does not reproduce it.** CI passes `github.event.pull_request.base.sha` (the base recorded when the PR was opened or last synchronized); this task passes `origin/main` at the moment you run it. They diverge as soon as `main` moves ahead. Pin `BASE` once at the top of the proof and reuse it, and read the result as "the script's delta logic reddens on a seeded advisory" — not as "CI will redden". Task 14.5 is where CI's own comparison is observed.
- **GOTCHA**: **`portal/package-lock.json` must be regenerated, not just `package.json`.** `npm audit` reads the lockfile; a `package.json`-only edit changes nothing and the check passes, which would read as a false negative.
- **VALIDATE**:
  ```bash
  node tooling/audit-delta.mjs "$(git rev-parse origin/main)"; echo "exit=$?"
  ```
- **REDDENS**: `lodash@4.17.15` in `portal/`. Observed this session against the live registry: 1 high vulnerability, advisory IDs `1106913, 1106920, 1108258, 1115806, 1115810, 1120370`. Expected failure text: the script exits 1 naming `portal` and those IDs. **Positive control in the same run:** the three pre-existing `tooling/style-dictionary` advisories (`1130095, 1130589, 1130736, 1158506, 1158507`) must appear in the base set and **not** in the delta — if they show up as new, the base side is not being read and the check is measuring nothing.
- **SATISFIES**: AC #3.
- **REGENERATES**: none (all of it is reverted).

### Task 4 · UPDATE the `visual` job — publish its true gate outcome

- **IMPLEMENT**: The ticket **as originally written** asked `ready-pr` to check `needs.<job>.result == 'success'` "so a `continue-on-error` job cannot pass through". **That does not work, and the `visual` job is exactly such a job.** (#387's body was corrected on 2026-09-10 and now specifies what follows; this paragraph records why.) A job-level `continue-on-error: true` that fails reports `needs.<job>.result == 'success'`, and `needs` exposes no second field with the truth ([actions/toolkit#1739](https://github.com/actions/toolkit/issues/1739)). Line 92 sets that flag for `feature/v3-*` head refs, and it is still live even though #82, which was to remove it, is CLOSED (both observed this session).

  So the job publishes the truth itself. Four edits, and **the `continue-on-error:` line at 92 is not one of them** — D11 policy is not this ticket's to change:

  1. Add a job-level `outputs:` map:
     ```yaml
     # #387: needs.<job>.result cannot see past the D11 continue-on-error below — a laundered
     # failure reports success. ready-pr reads THIS instead, which the flag cannot touch.
     outputs:
       gate: ${{ steps.gate.outputs.result }}
     ```
  2. Give the `Visual regression` step `id: vr` and `continue-on-error: true`, so the job keeps running and the outcome is capturable.
  3. Change `Upload diff report` from `if: failure()` to `if: steps.vr.outcome != 'success'`. **This is mandatory, not cosmetic** — with a step-level `continue-on-error` above it, the job's status at that point is still success, so `failure()` is false and the diff report would silently stop uploading.
  4. Append two steps:
     ```yaml
     - name: Record the gate outcome
       id: gate
       if: always()
       env:
         OUTCOME: ${{ steps.vr.outcome }}
       run: echo "result=$OUTCOME" >> "$GITHUB_OUTPUT"
     - name: Fail on a red gate
       if: steps.vr.outcome != 'success'
       env:
         OUTCOME: ${{ steps.vr.outcome }}
       run: |
         echo "::error::visual regression $OUTCOME"
         exit 1
     ```
     Step 4's second half restores today's behaviour exactly: the VR step's failure fails the job, and the job-level flag at line 92 still decides run-red vs run-green.
- **PATTERN**: the `env:`-binding form (never `${{ }}` inside `run:`) — see §Patterns to Follow.
- **GOTCHA**: `steps.<id>.outcome` is the pre-`continue-on-error` result; `steps.<id>.conclusion` is the laundered one. **Use `outcome`.** Getting this backwards produces a check that always says success.
- **GOTCHA**: job outputs from a job that later fails may or may not propagate. Task 9's check treats an empty `gate` as not-success, so either way it fails closed.
- **VALIDATE**:
  ```bash
  python3 -c "
  import yaml
  d = yaml.safe_load(open('.github/workflows/verify.yml'))
  v = d['jobs']['visual']
  print('outputs:', v.get('outputs'))
  print('steps:', [(s.get('name'), s.get('id'), s.get('if'), s.get('continue-on-error')) for s in v['steps']])
  "
  # expected: outputs {'gate': '\${{ steps.gate.outputs.result }}'};
  # 'Visual regression' has id 'vr' and continue-on-error True;
  # 'Upload diff report' if == \"steps.vr.outcome != 'success'\"
  ```
- **REDDENS** (produced by Task 14.6, mutation D — it needs a PR opened *from* such a branch, because `github.head_ref` is only set on `pull_request` events): on a `feature/v3-<x>` throwaway branch (the freeze's own condition), break the VR gate — e.g. `sed -i '' 's/maxDiffPixels: 100/maxDiffPixels: 0/' tooling/visual-regression/playwright.config.mjs`. `needs.visual.result` reports **success** (laundered) while `needs.visual.outputs.gate` reports **failure**, and Task 9's second check is the only thing that reddens. On any other branch, both checks redden together. Expected failure text: `::error::visual gate outcome=failure`.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 5 · CREATE `.github/codeql/codeql-config.yml`

- **IMPLEMENT**: CodeQL's analysis scope. Same allowlist idea the Sonar version had, in CodeQL's own vocabulary.
  ```yaml
  # .github/codeql/codeql-config.yml — CodeQL analysis scope (ticket #387).
  #
  # `paths` is an ALLOWLIST, so it fails SAFE: a new tree goes unanalyzed rather than a
  # forgotten ignore pulling in .claude/, .agents/, .archon/, docs/, assets/ or scenarios/.
  # `paths-ignore` then removes the GENERATED files and COMMITTED-RUN trees that sit INSIDE
  # the allowlist. A finding on a generated file is a finding against its generator; a finding
  # on a committed agent run cannot be fixed without hand-editing the run, which the honesty
  # contract forbids (CLAUDE.md §Ground rules). handoff/, traces/ and replay/ need no ignore —
  # they are simply not in the allowlist.
  name: "ux-factory"

  paths:
    - system
    - agent-layer
    - portal
    - discovery
    - tooling
    - worker
    - proto
    - "*.html"

  paths-ignore:
    - "**/node_modules"
    - "discovery/*/**"
    - "proto/compositions/**"
    - "system/tokens.contract.css"
    - "system/tokens.neutral.css"
    - "system/system-graph.json"
    - "system/loc-summary.json"
    - "system/param-count.json"
    - "tooling/visual-regression/baselines/**"
    - "tooling/visual-regression/playwright-report/**"
    - "tooling/visual-regression/test-results/**"
  ```
- **GOTCHA**: `discovery/*/**` ignores the committed run packages (`allergen-matrix-1/`, `bracket-trace-1/`, `bracket-trace-2/`, `graded-opus-a/`, `graded-think-a/`, `instrument-loans-1/`, `partner-audit-1/`, `spine-meridian-1/` — observed) while keeping `discovery/bank.mjs`, `ops.mjs`, `prd-projection.mjs` and `proposals.mjs`, which are the real code. **Do not write `discovery/**`.**
- **GOTCHA**: `.github/workflows/` is deliberately outside the allowlist, so CodeQL's own GitHub Actions queries never run on this repo's workflow. State it in gates.md (Task 12) rather than leaving it implied. If you later want them, `paths` gains `.github` and the workflow starts analysing itself — a separate decision.
- **GOTCHA**: `paths`/`paths-ignore` are honoured for interpreted languages, which `javascript-typescript` is. They are ignored for compiled languages; irrelevant here, but do not copy this config into a repo with one.
- **GOTCHA — do not add `queries: security-and-quality`.** GitHub's starter workflow leaves the query suite commented out, and the default suite is security-focused. `security-and-quality` adds maintainability rules — the same code-smell noise from the portal's template-string SPA that made us drop Sonar's equivalent conditions.
- **VALIDATE** (expected — after Task 6's probe run):
  ```bash
  python3 -c "import yaml; d=yaml.safe_load(open('.github/codeql/codeql-config.yml')); print(d['paths']); print(len(d['paths-ignore']),'ignores')"
  # expected: the 8 allowlist entries above, 11 ignores
  ```
- **REDDENS**: n/a (a config file). Its coverage is asserted by Task 6's probe, which prints what CodeQL actually scanned.
- **SATISFIES**: AC #2.
- **REGENERATES**: none. `.github/codeql/codeql-config.yml` matches none of `gen-loc-summary.mjs`'s three group regexes.

### Task 6 · ADD the `codeql` job, then MEASURE the baseline

- **IMPLEMENT**: Two moves in one task, in this order. **Add the job without its gate step, run it, read the number, and only then write the gate (Task 7).** The threshold is a measurement, not a guess.

  **6a — the job:**
  ```yaml
  codeql:
    # S1 (#387) — GitHub's own static analysis. Runs on PRs AND on push to main: main's analysis
    # is the repo's Security-tab baseline, and the FIRST push to main after this merges is what
    # seeds it. Until then the only unscanned base is this PR's own — see the plan's Phase 3.
    #
    # CodeQL UPLOADS; it does not fail on findings. `analyze` has no fail-on input (read its
    # action.yml). The gate is the `Require no high or critical alerts` step below, which is ours.
    runs-on: ubuntu-latest
    permissions:
      # From GitHub's own starter workflow. security-events: write is what lets the action
      # upload the SARIF, and it covers the read the gate step needs.
      security-events: write
      packages: read
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v7
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v4
        with:
          languages: javascript-typescript
          config-file: ./.github/codeql/codeql-config.yml
      - name: Analyze
        uses: github/codeql-action/analyze@v4
        with:
          category: "/language:javascript-typescript"
  ```

  **6b — the baseline probe.** Commit 6a and the Task 5 config alone, push, open a **draft** PR from that branch, and read what CodeQL found:
  ```bash
  PR=<the probe PR number>
  R=linardsb/ux-factory
  # Positive control FIRST: did an analysis actually happen on this ref? Zero analyses with zero
  # alerts is indistinguishable from a clean repo, and that is the vacuous case.
  gh api "repos/$R/code-scanning/analyses?ref=refs/pull/$PR/merge&tool_name=CodeQL" --jq 'length'
  # expected: >= 1. If 0, the job ran but uploaded nothing — fix that before reading any count.

  gh api --paginate "repos/$R/code-scanning/alerts?ref=refs/pull/$PR/merge&state=open&per_page=100" \
    --jq 'group_by(.rule.security_severity_level)[] | {severity: .[0].rule.security_severity_level, n: length}'
  ```
  **Record the output in the report.** It is the first CodeQL number this repo has ever had.
- **IMPORTS**: `github/codeql-action/init@v4` and `github/codeql-action/analyze@v4`. Observed via `gh api repos/github/codeql-action/releases`: **v4.38.0** is current (2026-09-09); v3 is still published but v4 is what GitHub's starter workflow uses. Unlike the rest of this workflow, pin the **major** here — GitHub ships CodeQL bundle updates through it and a pinned patch goes stale silently.
- **DECISION RULE (one sentence, applied to 6b's output):** if the probe returns **zero** `high` and `critical` alerts, Task 7's gate stands exactly as written; if it returns a handful, fix them inside this PR and then wire Task 7; if it returns more than a handful, **stop and tell the owner the ticket grew** rather than lowering the threshold to fit.
- **GOTCHA — the baseline is a one-time cost, not a design constraint.** `main` has never been scanned (observed: `gh api .../code-scanning/alerts` → `404 no analysis found`). The workflow's `push: branches: [main]` trigger seeds it on the first merge, so **this PR is the only one that will ever run without a base analysis.** Do not build delta machinery for CodeQL to solve that; S2's delta exists because the three style-dictionary advisories are known, accepted and permanent, which is a different situation with different evidence.
- **GOTCHA**: no `fetch-depth: 0`. That was Sonar's requirement for blame relevance; CodeQL builds a database from the checked-out tree and does not need history.
- **GOTCHA**: a PR from a fork gets `security-events: read` only, so the upload fails and the PR stays a draft. No forks today; record it in gates.md rather than working around it.
- **VALIDATE**:
  ```bash
  python3 -c "
  import yaml; d = yaml.safe_load(open('.github/workflows/verify.yml')); print(sorted(d['jobs']))"
  # expected at this point: ['audit', 'codeql', 'verify', 'visual']
  gh run watch    # the probe run; the Analyze step must end with an uploaded SARIF
  ```
- **REDDENS**: Task 8.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### Task 7 · ADD the gate step to the `codeql` job

- **IMPLEMENT**: The step that turns an upload into a gate. Append it to the `codeql` job.
  ```yaml
      # THE GATE. CodeQL uploads and goes green on findings — `analyze` has no fail-on input —
      # so the alerts are read back and judged here. PR-only: on a push to main there is no
      # pull-request ref to query, and main's analysis is the baseline rather than a gate.
      - name: Require no high or critical alerts
        if: github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REF: refs/pull/${{ github.event.pull_request.number }}/merge
        run: |
          set -euo pipefail
          # POSITIVE CONTROL, and it runs first: zero alerts because nothing was analyzed looks
          # exactly like zero alerts because the code is clean. Require an analysis to exist.
          n_analyses=$(gh api "repos/$GITHUB_REPOSITORY/code-scanning/analyses?ref=$REF&tool_name=CodeQL" --jq 'length')
          if [ "$n_analyses" -lt 1 ]; then
            echo "::error::no CodeQL analysis on $REF — this gate measured nothing"; exit 1
          fi
          gh api --paginate \
            "repos/$GITHUB_REPOSITORY/code-scanning/alerts?ref=$REF&state=open&per_page=100" \
            --jq '.[] | select(.rule.security_severity_level == "high" or .rule.security_severity_level == "critical")
                  | "\(.rule.security_severity_level)\t\(.rule.id)\t\(.most_recent_instance.location.path):\(.most_recent_instance.location.start_line)"' \
            > /tmp/codeql-blocking.tsv
          if [ -s /tmp/codeql-blocking.tsv ]; then
            echo "::error::CodeQL found $(wc -l < /tmp/codeql-blocking.tsv) blocking alert(s)"
            cat /tmp/codeql-blocking.tsv
            exit 1
          fi
          echo "CodeQL: no high or critical alerts on $REF ($n_analyses analysis/analyses read)"
  ```
- **GOTCHA — the threshold is `high`+`critical`, and `medium`/`low`/`null` do not block.** They are still raised and still visible in the repo's Security tab; they just do not hold the draft. This is the same call the Sonar version made about hotspots, for the same reason: #388's remediation loop is not merged yet, so a gate on everything would leave PRs stuck with no tooling to clear them. Say so in gates.md.
- **GOTCHA — the API field names, verified against the REST reference this session, not recalled:** `ref` accepts `refs/pull/<number>/merge` verbatim; the security severity is `rule.security_severity_level` with values `low` · `medium` · `high` · `critical` · `null`; the file is `most_recent_instance.location.path`; `state` is `open` · `dismissed` · `fixed`. **Do not filter with the API's own `severity=` parameter** — that is the rule's alert severity (`error`/`warning`/`note` mixed with the security levels) and it is not the same axis. Filter client-side on `rule.security_severity_level`, as above.
- **GOTCHA**: `analyze`'s `wait-for-processing` defaults to `true`, which is why this step can query immediately without polling. If you ever set it to `false`, this gate races the upload and starts passing vacuously.
- **GOTCHA**: `set -euo pipefail` plus `gh api` means an API failure exits non-zero and the PR stays a draft. That is deliberate — fail closed.
- **VALIDATE**:
  ```bash
  # locally, against the probe PR from Task 6b, with an authenticated gh:
  PR=<probe PR>; R=linardsb/ux-factory
  gh api "repos/$R/code-scanning/analyses?ref=refs/pull/$PR/merge&tool_name=CodeQL" --jq 'length'
  gh api --paginate "repos/$R/code-scanning/alerts?ref=refs/pull/$PR/merge&state=open&per_page=100" \
    --jq '[.[] | select(.rule.security_severity_level=="high" or .rule.security_severity_level=="critical")] | length'
  # expected: >= 1 analysis, and a blocking count matching Task 6b's recorded baseline
  ```
- **REDDENS**: Task 8's seeded finding. Expected failure text: `::error::CodeQL found 1 blocking alert(s)` followed by the rule id and the file.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### Task 8 · PROVE the CodeQL gate reddens

- **IMPLEMENT**: On the throwaway PR from Task 14, add a file inside the `paths` allowlist containing a construct CodeQL rates `high` or `critical`, push, watch the `codeql` job go red and the PR stay a draft. Then remove it and confirm the gate goes green.

  A code-injection sink is the reliable choice — CodeQL's `js/code-injection` is rated **high**, and unlike a lint-style rule it needs a real taint path from a source to the sink:
  ```js
  // tooling/__tmp-seed.mjs
  import { argv } from "node:process";
  export function seeded() { return eval(argv[2]); }   // js/code-injection — argv is a taint source
  ```
- **GOTCHA — a bare `eval("1+1")` is not enough.** CodeQL wants a *flow* from an untrusted source into the sink; a constant argument is dead code to the taint tracker and the alert may not fire at all. `argv[2]` is a recognised source. If the seed does not produce an alert, the gate is unproven — do not shrug and move on, that is the check-that-cannot-fail shape.
- **GOTCHA**: the seed file must be inside `paths` or the gate is measuring nothing. `tooling` is in the allowlist; `docs` and `.claude` are not.
- **GOTCHA**: `tooling/__tmp-seed.mjs` becomes a tracked `.mjs` while it exists, so `drift-check`'s syntax leg will `node --check` it. The code above is syntactically valid, so `verify` stays green — which is the point. **Do not seed a syntax error**, which would redden `verify` instead and prove the wrong thing.
- **VALIDATE**:
  ```bash
  gh pr checks <n> --watch
  gh pr view <n> --json isDraft -q .isDraft     # expected: true while the gate is red
  gh api --paginate "repos/linardsb/ux-factory/code-scanning/alerts?ref=refs/pull/<n>/merge&state=open" \
    --jq '.[] | select(.rule.id | contains("code-injection")) | {rule: .rule.id, sev: .rule.security_severity_level}'
  # expected: one js/code-injection alert at security_severity_level "high"
  ```
- **REDDENS**: the seeded `eval(argv[2])` above.
- **SATISFIES**: AC #2.
- **REGENERATES**: none (the seed file is removed).

### Task 9 · ADD the `ready-pr` job to `.github/workflows/verify.yml`

- **IMPLEMENT**: The last job. Two steps: assert, then flip and **verify the flip**.
  ```yaml
  ready-pr:
    # O1 (#387) — THE EDGE. piv-create-pr opens every PR as a draft; this is the only thing that
    # takes it out of one, and it is bash reading job results. No model, no judgement.
    #
    # `!cancelled()` is load-bearing: with `needs:` alone, a failed need SKIPS this job, and the
    # result checks below — the whole point of the job — would never execute in the one case they
    # exist for. With it, they run and they name the job that was red.
    #
    # STANDING RULE: any job added to `needs:` that carries a job-level `continue-on-error` MUST
    # publish its true step outcome as a job output and be checked here the way `visual` is.
    # `needs.<job>.result` reports success for a laundered failure and there is no second field
    # (actions/toolkit#1739), so adding such a job without its output silently deletes this gate.
    needs: [verify, visual, codeql, audit]
    if: ${{ !cancelled() && github.event_name == 'pull_request' && github.event.pull_request.draft }}
    runs-on: ubuntu-latest
    # The ONE job that widens past contents: read, and only to what `gh pr ready` needs.
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: Require every gate green
        env:
          VERIFY: ${{ needs.verify.result }}
          VISUAL: ${{ needs.visual.result }}
          VISUAL_GATE: ${{ needs.visual.outputs.gate }}
          CODEQL: ${{ needs.codeql.result }}
          AUDIT: ${{ needs.audit.result }}
        run: |
          set -uo pipefail
          red=0
          for pair in "verify:$VERIFY" "visual:$VISUAL" "codeql:$CODEQL" "audit:$AUDIT"; do
            name=${pair%%:*}; res=${pair#*:}
            if [ "$res" != "success" ]; then
              echo "::error::$name did not succeed (result=${res:-<empty>})"; red=1
            fi
          done
          # A job-level continue-on-error launders a failure into result=success and needs exposes
          # no field with the truth (actions/toolkit#1739). The visual job carries such a flag for
          # the D11 VR freeze, so its REAL step outcome is read from its own job output.
          if [ "${VISUAL_GATE:-}" != "success" ]; then
            echo "::error::visual gate outcome=${VISUAL_GATE:-<empty>}"; red=1
          fi
          [ "$red" -eq 0 ]
      - name: Flip the PR out of draft
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
        run: |
          set -euo pipefail
          gh pr ready "$PR" --repo "$GITHUB_REPOSITORY"
          # Assert the flip; never trust the exit code. Mutate, don't grep.
          draft=$(gh pr view "$PR" --repo "$GITHUB_REPOSITORY" --json isDraft -q .isDraft)
          [ "$draft" = "false" ] || { echo "::error::PR $PR is still a draft"; exit 1; }
  ```
- **GOTCHA — do not drop `!cancelled()`.** Without it, `needs:` skips this job whenever any need fails, and every result check becomes unreachable. That is a check that cannot fail, and it is the exact shape gates.md names as this repo's recurring defect.
- **NOTE on `set -u` and the empty-output case.** Every variable in that step is bound through `env:`, so it is always *set* even when the expression yields nothing, and `-u` never fires. Verified this session: `bash -c 'set -uo pipefail; V=""; [ "$V" != "success" ] && echo ran'` runs and exits 0, while a genuinely unset name aborts with `unbound variable`. The `${VISUAL_GATE:-}` form above is belt-and-braces against a later edit that drops the binding — keep it.
- **GOTCHA — `set -e` is deliberately absent from the first step.** With `set -e`, the loop's first non-zero comparison would abort before the remaining jobs are reported, so a run with three red jobs would name one. `set -uo pipefail` plus the explicit `[ "$red" -eq 0 ]` at the end reports all of them.
- **GOTCHA — no infinite loop.** `pull_request`'s default activity types are `opened`, `synchronize`, `reopened`; `ready_for_review` is **not** among them, and events triggered by `GITHUB_TOKEN` do not start new workflow runs anyway. Do not add `types:` to the `on:` block.
- **GOTCHA — if `gh pr ready` returns `Resource not accessible by integration`** ([cli/cli#1314](https://github.com/cli/cli/issues/1314) — a 2020 report about `gh` demanding `read:org`, possibly stale), replace that one line with the GraphQL mutation, which needs only `pull-requests: write`:
  ```bash
  gh api graphql -f query='mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}' \
    -f id="$PR_NODE_ID"
  ```
  with `PR_NODE_ID: ${{ github.event.pull_request.node_id }}` in `env:`. The read-back assertion stays either way.
- **GOTCHA**: the repo's default workflow token is read-only (observed), so the `permissions:` block is what grants the write — there is no separate repo setting to flip for marking a PR ready. (`can_approve_pull_request_reviews: false` governs *creating and approving* PRs, which this does neither of.)
- **VALIDATE** (expected):
  ```bash
  python3 -c "
  import yaml; d=yaml.safe_load(open('.github/workflows/verify.yml')); j=d['jobs']['ready-pr']
  print('needs:', j['needs']); print('perms:', j['permissions']); print('if:', j['if'])"
  # expected needs: ['verify','visual','codeql','audit']; perms {'contents':'read','pull-requests':'write'}
  ```
- **REDDENS**: **two** mutations, because the two checks catch different things.
  1. `needs.<job>.result` — break build-checks on the throwaway branch (Task 14). Expected: `::error::verify did not succeed (result=failure)`, and the PR stays a draft.
  2. `needs.visual.outputs.gate` — Task 4's `feature/v3-*` mutation, the one `result` structurally cannot see. Expected: `::error::visual gate outcome=failure` with **no** `visual did not succeed` line above it.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 10 · UPDATE `.claude/skills/piv-create-pr/SKILL.md` — six sites

- **IMPLEMENT**: All six in one edit. Grepped this session; these are the complete set.
  **Line 3** (frontmatter `description`) — today it ends "…open a pull request, ready for review."
  Rewrite the clause to: opens the pull request **as a draft**; CI's `ready-pr` job is the only
  thing that takes it out of one (#387).

  **Line 75** (Phase 2.5 table, the `.exit_code` ≠ 0 row) — today: "STOP: the gate is red. Fix it,
  or open as `--draft` and say so in the body." The `--draft` half is now meaningless. Becomes:
  "STOP: the gate is red. Fix it. (Every PR opens as a draft regardless — see Phase 3.)"

  **Line 111** (the `gh pr create` call) — insert `--draft` immediately after `gh pr create`.

  **Line 129** (the body template's trailer) — today `_Ready for review._`. Becomes a sentence
  saying the PR is opened as a draft and CI's `ready-pr` job flips it once every gate is green
  (#387).

  **Line 134** (the parenthetical) — today "Use `--draft` if the work isn't ready for a real
  review." Becomes: `--draft` is not optional here; this loop never declares its own work
  reviewable (#387).

  **Lines 147-148** (the Output section's handoff line) — today it reports "Ready for review →
  run `piv-review-pr <number>`, then a human approves." Becomes: opened as a draft → CI flips it
  when the gates are green → then `piv-review-pr <number>` → then a human approves.

- **GOTCHA**: line 153 ("or 'mark ready for review' wherever your team works") is in the tool-agnostic Notes and stays — it describes other tools, not this loop.
- **GOTCHA**: do **not** touch Phase 2.5's `scripts/record-gate.sh` / `scripts/inherited-figures.sh` references. Neither script exists in this repo (observed), but that is pre-existing and out of scope; fixing it here mixes two unrelated changes into one PR.
- **VALIDATE**:
  ```bash
  grep -n -i "ready for review\|--draft" .claude/skills/piv-create-pr/SKILL.md
  # expected: no line still claiming the skill opens a PR ready for review, except line 153's
  # tool-agnostic aside and line 83's `<draft-body.md>` filename.
  ```
- **REDDENS**: n/a (a skill file, not a check). Its effect is proven by Task 14: the throwaway PR is opened by running this skill, and it must come out a draft.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 11 · UPDATE `CLAUDE.md:162` — §Testing

- **IMPLEMENT**: Append one sentence to the existing bullet. Do not restructure it.
  > **Testing:** no suite, no linter, no type-check — don't hunt for or invent one. **The one exception is CI's CodeQL gate (#387), which blocks a PR on a new high or critical alert: it is a gate, not a suite, and it is deliberate — leave it.** "Done" = run the surface you touched: …
- **GOTCHA — `tooling/drift-check.mjs`'s group-count leg reads this file with two regexes**: `/(\d+) PURE groups/g` and `/build-checks' (\d+) groups/g`, and every match must equal build-checks' distinct group count (34 today). **Your sentence must contain neither pattern.** The phrasing above is safe; anything of the form "N PURE groups" or "build-checks' N groups" is not.
- **VALIDATE**:
  ```bash
  node tooling/drift-check.mjs
  # expected final line: drift-check     ✓  syntax · token-css · … · group-count
  ```
- **REDDENS**: change "34" to "33" anywhere the leg reads, and drift-check exits 1 with `group-count drift: CLAUDE.md (architecture map): says 33 groups, build-checks defines 34`. Run that mutation once to confirm the leg is live, then revert.
- **SATISFIES**: AC #4.
- **REGENERATES**: none (`CLAUDE.md` matches no loc-summary group).

### Task 12 · UPDATE `.claude/references/gates.md` — the new section

- **IMPLEMENT**: Two edits.
  1. **Line 7**, the "What runs in CI" sentence, which goes stale the moment jobs are added:
     > **What runs in CI (`verify` workflow):** `build-checks.mjs`, the generator drift checks and token-lint (`verify` job); the visual-regression gate (`visual` job); the CodeQL gate (`codeql` job); the dependency-advisory delta (`audit` job); and `ready-pr`, the one job that can take a PR out of draft. **Everything else is operator-run** — the journey drivers, `vt-verify`, `vt-stack-audit` — and is not a merge blocker.
  2. **A new `## The security gate — the draft edge, CodeQL, and the advisory delta` section**, placed after "The pixel gate" and before "The morph gates", following this file's convention: what each of the three owns, then what each states it cannot reach. It must carry:
     - **`ready-pr` cannot see a job-level `continue-on-error`.** `needs.<job>.result` reports `success` for a laundered failure; that is why `visual` publishes its true step outcome as a job output and `ready-pr` checks both. **Standing rule, stated here because no gate enforces it:** any future job with that flag must publish the same output and be checked the same way, or it walks straight past the gate. `verify.yml` carries exactly one such job today (observed: `grep -rn "continue-on-error" .github/` → one hit, line 92).
     - **The flip is one-way.** `main` is unprotected, so the draft state is the only real gate — and it is asserted only at the moment of the flip. A red push after the flip leaves a **ready** PR with a red check. "Cannot leave draft except through a no-model step" holds; "is ready ⇒ green" does not.
     - **CodeQL's scope stops at the allowlist, and nothing gates the allowlist.** `paths` in `.github/codeql/codeql-config.yml` is hand-maintained: a new top-level source directory is **silently unanalyzed** until someone adds it, and the gate stays green while covering less. It self-maintains for a new root page (`*.html`) and for anything inside the seven listed directories, and nowhere else. `.github/workflows/` is deliberately outside it, so CodeQL's own GitHub Actions queries never run on this workflow. `handoff/`, `traces/`, `replay/`, `discovery/<slug>/` and `proto/compositions/` are excluded because a finding on a generated file belongs to its generator and a finding on a committed agent run cannot be fixed without hand-editing it, which the honesty contract forbids.
     - **CodeQL uploads; it does not block.** `github/codeql-action/analyze` has no fail-on-findings input, so the job goes green on findings and the gate is a step we wrote that reads the alerts back. Delete that step and CodeQL keeps running, the Security tab keeps filling, and nothing holds a PR — a gate that looks alive and is not.
     - **The threshold is `high` + `critical`.** `medium`, `low` and unrated alerts are raised and readable in the Security tab; they do not hold the draft. #388's remediation loop is not merged, so gating on everything would leave PRs stuck with no tooling to clear them.
     - **What CodeQL plus an advisory delta does not cover:** `portal/lib/origin.mjs`'s CSRF logic, the Worker's routes, and the honesty-contract invariants. Those stay with `build-checks` and human review.
     - **The advisory delta is a delta.** The three pre-existing `tooling/style-dictionary` advisories do not block and are not tracked here; only a **new** advisory ID does. It cannot see an advisory published after the PR merges.
     - **Fork PRs cannot pass.** A fork's token is `security-events: read`, so the SARIF upload fails, the `codeql` job fails and the PR stays a draft. No forks today, and no workaround should be added without first deciding what a fork's analysis is allowed to see.
     - **No operator runbook, and that is the point.** CodeQL needs no account, no secret and no configuration outside this repo. There is nothing for a human to set up and nothing to document.
- **GOTCHA**: the same group-count leg reads this file with `/(\d+) pure groups/g` and requires every match to equal 34. **Do not write a phrase of that shape in the new section.** Line 11's `34 pure groups` heading is the only intended match — leave it alone.
- **VALIDATE**:
  ```bash
  node tooling/drift-check.mjs && grep -c "pure groups" .claude/references/gates.md
  # expected: drift-check ✓, and the count still 1
  ```
- **REDDENS**: same mutation as Task 11.
- **SATISFIES**: AC #4.
- **REGENERATES**: none.

### Task 13 · RUN the full local gate

- **IMPLEMENT**: The repo's own CI gates, before pushing anything.
- **VALIDATE**:
  ```bash
  cd tooling/style-dictionary && npm ci && cd ../..
  node tooling/drift-check.mjs
  node tooling/token-lint.mjs
  node tooling/build-checks.mjs
  node tooling/audit-delta.mjs "$(git rev-parse origin/main)"
  ```
  Expected: `drift-check ✓`, token-lint clean, `all 34 groups pass`, and an empty advisory delta.
- **GOTCHA**: `drift-check` needs `tooling/style-dictionary/node_modules` (gen-handoff child-process-invokes Style Dictionary). It must **not** get `portal/node_modules` — build-checks group 8 proves its central invariant by that absence (`.github/workflows/verify.yml:73-81`).
- **GOTCHA — [[drift-check-mid-merge-false-positive]]**: if you merged `origin/main` and have not committed the merge, drift-check misreads staged merge changes as drift. An empty working-vs-index diff means it is a false positive — complete the merge, then re-run.
- **REDDENS**: n/a — this task adds no check, it runs the ones that already exist. Their reddening mutations are Tasks 3, 8, 11 and 14.
- **SATISFIES**: AC #4.
- **REGENERATES**: none — but re-run `node agent-layer/gen-loc-summary.mjs --check` here anyway and paste the result into the report. Pre-flight found it clean for every path this plan touches; a task added along the way could change that.

### Task 14 · PROVE the whole edge on a throwaway PR

- **IMPLEMENT**: This is AC #1 and AC #2's real proof, and the ticket is explicit: **mutate, don't grep.**
  1. Open this ticket's own PR by running `piv-create-pr`. Confirm it comes out a draft: `gh pr view <n> --json isDraft -q .isDraft` → `true`.
  2. Wait for CI. With Phase 0 done, every job goes green and `ready-pr` flips it. Confirm `isDraft` → `false`, and that the flip's own log line ran.
  3. **Mutation A (AC #1).** On a throwaway branch off this one, break build-checks on purpose — e.g. change a `PATTERNS` entry in `system/pattern-rules.mjs` so a group fails. Open a PR from it. Expected: the PR **stays a draft**, `verify` is red, and `ready-pr` prints `::error::verify did not succeed (result=failure)`.
  4. **Mutation B (AC #2).** On the same throwaway branch, Task 8's seeded `eval(argv[2])`. Expected: `codeql` red naming the `js/code-injection` rule and the file, PR still a draft.
  5. **Mutation C (AC #3).** Push Task 3's seeded `lodash@4.17.15` (both `portal/package.json` and the regenerated `portal/package-lock.json`) to the throwaway branch. Expected: `audit` red, PR still a draft. **Push it — do not treat Task 3's local run as this step.** Task 3 compares against `origin/main` at run time; CI compares against the PR's recorded base SHA, and only this step observes that comparison.
  6. **Mutation D (AC #5) — its own branch, and the only thing that produces AC #5.** The D11 freeze is conditioned on `startsWith(github.head_ref, 'feature/v3-')`, and **`github.head_ref` is set only on `pull_request` events** — so a branch merely named that way proves nothing; it needs a PR opened *from* it.
     ```bash
     git switch -c feature/v3-387-laundering-probe
     sed -i '' 's/maxDiffPixels: 100/maxDiffPixels: 0/' tooling/visual-regression/playwright.config.mjs
     git commit -am "tmp: break the VR gate to prove the laundering guard" && git push -u origin HEAD
     gh pr create --draft --base main --title "tmp: laundering probe" --body "throwaway, close unmerged"
     ```
     Expected in `ready-pr`'s log: **no** `visual did not succeed` line (the job-level `continue-on-error` launders it to `result=success`), and `::error::visual gate outcome=failure` on its own. PR stays a draft. Then close the PR unmerged and delete the branch.
  7. Close the throwaway PRs, delete both branches.
- **GOTCHA**: `deleteBranchOnMerge` is `false` on this repo (observed) — delete throwaway branches by hand.
- **GOTCHA — [[review-validated-premerge-tree]]**: check `mergeStateStatus` before reading anything into a green run.
- **VALIDATE**:
  ```bash
  gh pr view <throwaway> --json isDraft,statusCheckRollup -q '{draft:.isDraft, checks:[.statusCheckRollup[]|{name,conclusion}]}'
  ```
- **REDDENS**: the task *is* the reddening.
- **SATISFIES**: AC #1, #2, #3, #5.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no suite, no linter and no type-check in this repo, by rule (CLAUDE.md §Testing). "Done" means the gate you touched ran. This feature's gates are CI jobs, so most of its proof is a real PR.

### Unit Tests

None. `tooling/audit-delta.mjs` is proven by running it, twice: once clean against `origin/main` (Task 1's VALIDATE) and once against a seeded lockfile (Task 3).

### Integration Tests

Task 14 — a real throwaway PR carrying four separate mutations, each expected to hold the draft for a different reason.

### Edge Cases

- **A job-level `continue-on-error` failure** — the case `needs.<job>.result` structurally cannot report. Covered by Task 4's output plus Task 9's second REDDENS.
- **A skipped need** — `needs.<job>.result` is `skipped`, which is not `success`, so `ready-pr` refuses. Fail-closed.
- **An empty job output** — if `needs.visual.outputs.gate` does not propagate from a failed job, it reads as `""`, which is not `success`. Fail-closed.
- **`npm audit` unreachable or rate-limited** — Task 1 throws naming the directory and the side rather than returning an empty set. Fail-closed.
- **CodeQL uploaded nothing** — zero alerts on a ref with zero analyses is indistinguishable from a clean tree. Task 7 queries `code-scanning/analyses` first and exits 1 when it returns none. Fail-closed, and it is the positive control for the whole gate.
- **The code-scanning API errors or rate-limits** — `set -euo pipefail` around `gh api` means the step exits non-zero and the PR stays a draft. Fail-closed.
- **A new tooling directory with dependencies** — absent at base, so `git show` exits 128 and its base advisory set is empty, which means **every** advisory it carries reads as new. Deliberate: a newly added dependency tree gets audited in full, once.
- **A push to `main`** — `github.event.pull_request` is undefined; `audit`, `ready-pr` and the CodeQL gate step are all skipped by their `if:`, while `codeql`'s scan still runs and seeds the Security-tab baseline.
- **A PR opened by hand, already ready** — `github.event.pull_request.draft` is false, `ready-pr` skipped. The gate does not un-ready anything.

### Proving the checks

Every check this plan adds carries the mutation that reddens it, and Tasks 3, 8, 11 and 14 exist purely to run those mutations. **Run them.** Three of this plan's checks pass trivially on a healthy tree, and a green run of a check that never reached the thing it tested is 59 of this repo's 229 process-review findings.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/verify.yml')); print('yaml ok')"
node --check tooling/audit-delta.mjs
```

### Level 2: The repo's CI gates

```bash
cd tooling/style-dictionary && npm ci && cd ../..
node tooling/drift-check.mjs
node tooling/token-lint.mjs
node tooling/build-checks.mjs
```
Expected: `drift-check ✓ …`, token-lint clean, `all 34 groups pass`.

### Level 3: The new gate, locally

```bash
node tooling/audit-delta.mjs "$(git rev-parse origin/main)"        # expected exit 0, empty delta
node agent-layer/gen-loc-summary.mjs --check                       # expected: no drift
```

### Level 4: Manual validation

Task 14 in full — the throwaway PR and its four mutations.

### Level 5: Additional validation

```bash
gh workflow view verify --yaml | head -40      # GitHub's own parse of the pushed workflow
gh run watch                                   # the first run on the pushed branch
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Enable branch protection on `main` requiring `verify`, `visual`, `codeql`, `audit` and `gates-green` | free, one API call, **after this PR merges** | **No.** Every gate runs and reports without it; what is missing is the mechanical block on merging a red PR | owner's call, sequenced after merge — see the implementation AMENDMENT of 2026-09-10 |

**This table was empty when the plan was written, and that was half wrong.** CodeQL itself needs no account, no secret and no configuration — that half held. What did not: `GITHUB_TOKEN` cannot take a PR out of draft, so O1's flip design was not buildable at all. The owner re-decided O1 as a merge gate, which needs no credential — one API call, sequenced after this PR merges so it does not block the two PRs already open.

No paid model turns. No prompt strings touched. Nothing here spends tokens, and Actions minutes are free on a public repo.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1 — the edge holds.** A PR opened by `piv-create-pr` is a draft until CI flips it. On a throwaway branch with build-checks broken on purpose, the PR **stays a draft** with the red check on it, and `ready-pr` names the red job. Mutated, not grepped (Task 14.3).
- [ ] **AC #2 — CodeQL blocks.** The `codeql` job uploads an analysis for the PR ref (positive control: `code-scanning/analyses?ref=…` returns ≥ 1), and a seeded `eval(argv[2])` in a file inside the `paths` allowlist raises a `high` `js/code-injection` alert that reddens the gate while the draft holds (Task 8, Task 14.4).
- [ ] **AC #3 — the delta discriminates.** Adding `lodash@4.17.15` to `portal/package.json` **and regenerating `portal/package-lock.json`** reddens `audit`; the three pre-existing `tooling/style-dictionary` advisories appear on the base side and **do not** appear in the delta (Task 3).
- [ ] **AC #4 — the rules are updated.** `CLAUDE.md` §Testing admits the CodeQL gate; `.claude/references/gates.md` carries the new section with its "cannot reach" list and an updated line 7; `node tooling/drift-check.mjs` is green.
- [ ] **AC #5 — no laundering.** `ready-pr` refuses a PR opened **from** a `feature/v3-*` branch with a broken VR gate, on the strength of `needs.visual.outputs.gate` alone, with `needs.visual.result` reporting `success` and printing no error of its own (Task 14.6 — mutation D. `github.head_ref` is only populated on `pull_request` events, so a branch of that name with no PR does not exercise the freeze at all).
- [ ] Every VALIDATE command in every task has been run and its real output recorded in the report.
- [ ] `node tooling/build-checks.mjs`, `node tooling/drift-check.mjs`, `node tooling/token-lint.mjs` green on the final tree.
- [ ] The PR body carries `Closes #387` bare at the start of a line, and `gh pr view --json closingIssuesReferences` is non-empty.
- [ ] The plan, the report and the review are all in this PR (`.claude/plans/security-gate-387.md`, `.claude/reports/…`, `.claude/code-reviews/pr-<N>-review.md`).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All four REDDENS mutations run, and each failed the way this plan says it would
- [ ] Local gates green (drift-check · token-lint · build-checks · audit-delta)
- [ ] The throwaway PRs opened, **four** mutations observed (A build-checks · B seeded `eval` · C seeded advisory · D the laundering probe from a `feature/v3-*` head), closed unmerged, both branches deleted
- [ ] Acceptance criteria all met, or the unmet ones listed under **Not run** with a tracker

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the flip is one-way; should a later red un-ready the PR?** As specified, `ready-pr` only ever converts draft → ready, at one moment. A red push afterwards leaves a **ready** PR with a red check. `gh pr ready --undo` exists and would close the hole, but the ticket does not ask for it and it interacts badly with a reviewer mid-review. **Assumption: one-way, and stated as a limitation in gates.md.** Say if you want the undo.

**Q2 — `main` is unprotected** (observed: no branch protection). So the draft state is now the only real mechanical gate; nothing stops a merge of a red PR. The ticket's framing ("CI gates the merge button") is not true today. Enabling protection with `verify`, `visual`, `codeql` and `audit` as required checks would make it true, and is one API call — but it is an owner decision about their own repo, and it is not in #387's scope.

**Q3 — resolved.** `--omit=dev` dropped and the directory list discovered rather than hardcoded; both were deviations from the ticket's original text, both are now folded into #387's body (2026-09-10). Reasons in Task 1's GOTCHAs.

**Q4 — the CodeQL baseline is unmeasured.** This repo has never been scanned, so nobody knows what CodeQL finds in it. Task 6b measures it before the gate is wired, and Task 6's decision rule says what to do with each answer. If the number comes back large the ticket grows, and that is the owner's call — not a reason to lower the threshold to fit.

**Assumption:** `gh` is preinstalled on `ubuntu-latest`. True today; if it disappears, the GraphQL fallback in Task 9 uses `gh api` too, so switch to `curl` against the GraphQL endpoint.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Everything below was executed this session, on `feature/discovery-affordances-289` at `7d17338`, against a tree whose `verify.yml` is byte-identical to `origin/main`.

**Landed-claim checks (`git grep` on `origin/main`).** `sonar` → nothing. `codeql` → nothing. `pr ready` → nothing. `npm audit` → nothing. `audit-delta` → nothing. All three pieces are genuinely absent; nothing here re-implements something that already landed.

**Five findings that changed the plan:**

**F1 — the ticket's O1 does not work as written.** It says checking `needs.<job>.result == 'success'` explicitly stops a `continue-on-error` job passing through. It does not: a job-level `continue-on-error: true` that fails reports `result == 'success'`, and `needs` exposes no field with the truth ([actions/toolkit#1739](https://github.com/actions/toolkit/issues/1739)). And `.github/workflows/verify.yml:92` is exactly such a job — the D11 VR freeze, **still live** even though #82, the ticket that was to remove it, is CLOSED (`gh issue view 82` → `CLOSED`; the line is still at 92). Written as specified, the guard would be a check that cannot fail. → Task 4 publishes the truth as a job output; Task 9 checks both, and they redden on different mutations. The ticket body was corrected on 2026-09-10, so it now specifies the fix rather than the flaw.

**F2 — a `needs:` job with no `!cancelled()` is skipped when a need fails**, so the result checks would never run in the case they exist for. → the `if:` in Task 9.

**F3 — `--omit=dev` makes one of the three audit targets vacuous** (also now corrected in #387's body). `tooling/visual-regression/package.json` carries only `devDependencies`. Observed with and without the flag: portal 0, visual-regression 0, style-dictionary 3 vulnerabilities / 5 advisory IDs — identical. → dropped, with the reason written into the file header. Documented deviation from the ticket.

**F4 — no generated-output cascade.** The plan's paths were run against `gen-loc-summary.mjs`'s three group regexes: `.github/codeql/codeql-config.yml`, `.github/workflows/verify.yml`, `.claude/references/gates.md`, `CLAUDE.md`, `.claude/plans/*.html` and `tooling/audit-delta.mjs` all match **none**. `genLocSummary({check:true})` on the current tree → `drifted: []`. No shipped page changes, so no VR baseline regen either. Every task's REGENERATES is "none", and that is a measurement, not an assumption. The one live constraint is `drift-check`'s group-count leg (`tooling/drift-check.mjs:162-191`), whose regexes read `CLAUDE.md` twice and `gates.md` once — carried as GOTCHAs on Tasks 10 and 12.

**F5 — `piv-create-pr` has six stale sites, not one.** Grepped: lines 3, 75, 111, 129, 134 and 147. Line 153 is a tool-agnostic aside and stays; line 83 is a filename. Also found: Phase 2.5 calls `scripts/record-gate.sh` and `scripts/inherited-figures.sh`, and `ls scripts/` returns "No such file or directory" — pre-existing, explicitly out of scope.

**Empirical checks driven, with their observed output:**

| Command | Observed |
|---|---|
| `npm audit --json` with vulnerabilities | exit **1** — so `spawnSync`, not `execFileSync` |
| `npm audit --json` clean | exit **0** |
| `npm audit` from `package.json` + lock, **no `node_modules`** | works; identical numbers. This is the mechanic the base side depends on |
| `git show <sha>:missing/path` | exit **128** — the "absent at base" signal |
| `lodash@4.17.15`, fresh lockfile | 1 high; advisory IDs `1106913, 1106920, 1108258, 1115806, 1115810, 1120370` |
| `gh api .../branches/main/protection` | **404 "Branch not protected"** |
| `gh api .../actions/permissions/workflow` | `{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}` |
| `gh repo view --json visibility` | `PUBLIC` — CodeQL is free here; private repos need a Code Security licence |
| `gh api repos/linardsb/ux-factory/code-scanning/alerts` | **404 `no analysis found`** — not a 403, so code scanning is available and simply unused |
| `gh api repos/github/codeql-action/releases` | **v4.38.0** (2026-09-09) current; v3.38.0 same day |
| `analyze/action.yml`, read in full | **no fail-on-findings input**; outputs `db-locations`, `sarif-output`, `sarif-id`; `wait-for-processing` defaults `true` |
| `actions/starter-workflows` `codeql.yml`, read | `javascript-typescript` verbatim; `init@v4`; the four-permission block |
| `genLocSummary({check:true})` | `drifted: []` |

**Read, not recalled:** `github/codeql-action`'s own `analyze/action.yml` in full — that is where "CodeQL uploads, it does not block" came from, and it is the only reason Task 7 exists at all.

### Second pass — three gaps behind F1, F3 and F5 (audited after the first draft)

Re-checked each finding end to end rather than trusting that writing it down had fixed it.

**G1, behind F3.** The `--omit=dev` fix removed one vacuous check but left another of the same shape: `tooling/audit-delta.mjs`'s directory list was hardcoded, so a future `tooling/<new>/package.json` would go unaudited with the gate still green. Task 1 now **discovers** the surface from tracked lockfiles on both sides and prints what it found. Observed: `git ls-files "*package-lock.json"` → the three known dirs.

**G2, behind F1.** The laundering fix covers the one job that carries `continue-on-error` today, and nothing stops the next one re-opening the hole. Added as a standing rule in two places a future editor will actually be reading: the `ready-pr` job's own comment, and gates.md's "cannot reach" list. Observed: `grep -rn "continue-on-error" .github/` → one hit, `verify.yml:92`.

**G3, behind F3/F4.** The analysis allowlist (`paths`) is itself a hand-maintained list with no gate. It cannot be auto-discovered — being an allowlist is the point — so the failure mode is named in gates.md instead of hidden: a new top-level directory is silently unanalyzed, and the gate stays green while covering less.

**No gap behind F2, F4 or F5.** F5 re-verified by grepping past `piv-create-pr`: the only other "Ready for review" in the AI layer is `piv-implement-issue/SKILL.md:223`, an issue comment about a fix, unrelated to PR draft state. Six sites remains the complete set.

### Alternatives weighed and rejected

**Query the head SHA's check runs instead of `needs`.** `gh api repos/{o}/{r}/commits/{sha}/check-runs` and require every conclusion to be `success`. It sees past `continue-on-error` cleanly (the check run genuinely goes red). Rejected: GitHub posts its own `Code scanning results / CodeQL` check run asynchronously, outside our workflow, so it may still be `queued` when `ready-pr` runs — the job would then either deadlock the PR or need a poll loop, trading a precise failure for a flaky one. `needs` plus one job output is smaller and deterministic.

**Let GitHub's own PR check do the new-alert diff.** That check is exactly "alerts introduced by this PR", computed by GitHub. Rejected for the same asynchrony, and because reading it means depending on a check-run *name* we do not own.

**A CodeQL alert delta against `refs/heads/main`, mirroring S2.** Tempting for the symmetry, and rejected: it would exist only to solve the unscanned-base problem, and that problem occurs exactly once. The `push: branches: [main]` trigger seeds the baseline on the first merge, so this PR is the only one that ever runs without a base. S2's delta stays a delta for a different reason — the three style-dictionary advisories are known, accepted and permanent, so a threshold there blocks forever. Same-looking problems, different evidence.

**Move the VR freeze to a step-level `continue-on-error`.** Simpler than the output plumbing, but it turns the `visual` check green on `feature/v3-*` branches, and D11's whole point is that the failure stays *visible*. Rejected — D11 is #82's policy, and this ticket does not get to quietly soften it.

**Delete line 92 outright,** since #82 closed without removing it and v3 is done. Tempting and probably correct, but it is a policy change riding inside a security ticket. Left alone; the output plumbing makes it harmless either way.

**A single job with the new steps folded into `verify`.** Rejected: `ready-pr` needs per-gate results to name which one was red, and the `verify` job carries a hard "no `npm ci` for portal" invariant whose blast radius is not worth widening.

**An explicit directory + filename list for the analysis scope.** Glob-free, but the 15 root pages would need hand-maintenance with no gate on the list. CodeQL's `paths` accepts `"*.html"`, which is an allowlist *and* picks up a new root page automatically. Chosen.

### Sequencing risk

The one unknown left is Task 6b's number. Everything else in this plan can be run start to finish by the implementer, on this machine and in CI, with no credential and no waiting.

## AMENDMENTS

- 2026-09-10 — **S1 re-decided: SonarQube Cloud → CodeQL**, at the owner's call. What moved: Phase 0's four blocking owner prerequisites are **gone** (no account, no `SONAR_TOKEN`, no Automatic-Analysis switch, no quality-gate configuration), the paid-and-owner-only table is now empty, `sonar-project.properties` became `.github/codeql/codeql-config.yml`, and the `sonar` job became `codeql` — which uploads rather than blocks, so the gate is a step we write. `docs/sonar-runbook.md` was written and then deleted; CodeQL has nothing for a human to set up. AC #2 changed from a Sonar quality-gate verdict to a seeded `js/code-injection` alert. **What did not move:** every F, G and B finding, O1's whole design, and S2.
- 2026-09-10 (implementation, owner's re-decision) — **O1 re-decided: the draft edge → a MERGE gate.** The flip is not buildable (see the next amendment), and the owner chose branch protection over holding a PAT in a repo secret. What moved: `ready-pr` became **`gates-green`** — same assert step, no flip, no `pull-requests: write`, and its `if:` lost the `github.event.pull_request.draft` condition, because **a skipped check counts as PASSING for branch protection** and a draft-only job would have been a hole straight through the gate. Task 10's six `piv-create-pr` edits were **reverted**: PRs open ready for review as they always did, and the guarantee moves from "cannot leave draft" to **"cannot merge"**, which the plan's own Q2 called the stronger claim. Protection requires `gates-green` and not `visual` directly, because a `feature/v3-*` branch's `visual` check is green while its gate failed — the laundering guard is the only thing that sees it. `enforce_admins` stays OFF: the owner can merge past a red gate, no agent can. AC #1 and AC #5 are re-read against this shape; every mutation already run still applies, since all four exercised the assert step, which is unchanged.

- 2026-09-10 (implementation) — **O1's flip has an owner prerequisite the plan said did not exist.** `GITHUB_TOKEN` cannot take a PR out of draft: `markPullRequestReadyForReview` answers `FORBIDDEN — Resource not accessible by integration` with `PullRequests: write` confirmed in the job's own token block (observed, PR #389, jobs 102851241506 and 102852214538). Task 9's stated fallback — the GraphQL mutation with `node_id` — is the SAME call and fails identically, so it is not a fallback. REST's `PATCH /pulls/{n}` has no `draft` field, so GraphQL is the only route at all. The repo setting `can_approve_pull_request_reviews` was flipped to `true` and re-tested at the owner's instruction: **not the cause** (job 102856482180), and the setting was restored to `false`. The flip now runs on `secrets.READY_PR_TOKEN`, a fine-grained PAT scoped to this repo with `Pull requests: write`, and the step refuses BY NAME when the secret is absent rather than dying on a raw FORBIDDEN. The paid-and-owner-only table above now carries the row. Recorded in gates.md as a cannot-reach, including the consequence that a fork PR can never leave draft, because `pull_request` runs from forks receive no secrets.

- 2026-09-10 (implementation) — **Task 8's seeded `eval(argv[2])` does not fire, and the reason matters.** `process.argv` is a **local**-threat-model source; GitHub's default query suite tracks **remote** sources only, so the seed was extracted (observed in the job log) and produced zero results — the exact vacuous shape the task's own GOTCHA warned about. Replaced with a real remote flow: a `node:http` request whose `?q=` reaches `eval()` and `child_process.exec()`. Observed on PR #389 (job 102854187896): **two `critical` alerts**, `js/code-injection` and `js/command-line-injection`, and `::error::CodeQL found 2 blocking alert(s)`. AC #2 is met at a higher severity than the plan predicted.

- 2026-09-10 (implementation) — **Task 4's and Task 14.6's `maxDiffPixels: 100 → 0` mutation does not redden the VR gate.** The committed baselines are pixel-exact in the pinned Playwright container, so tightening the tolerance to zero changed nothing and the `Visual regression` step passed (observed, job 102854863099) — leaving nothing to launder and proving nothing. Replaced with deleting one committed baseline PNG (`tooling/visual-regression/baselines/404-neutral.png`), which fails the step outright. AC #5 then observed exactly: `needs.visual.result` = `success`, `needs.visual.outputs.gate` = `failure`, `ready-pr` printing only `::error::visual gate outcome=failure`.

- 2026-09-10 (implementation) — **Task 5's `discovery/*/**` paths-ignore was wrong, and measured wrong.** The task's GOTCHA said "Do not write `discovery/**`" because it would swallow the four real modules; `discovery/*/**` does exactly the same thing. CodeQL's `**` matches ZERO or more path segments, so the pattern collapses to `discovery/*` and matched `bank.mjs`, `ops.mjs`, `prd-projection.mjs` and `proposals.mjs`. Observed on the probe run (PR #389, job 102848573629): 187 files extracted, **0 of them under `discovery/`**, with the gate green. Fixed by naming the modules in the ALLOWLIST instead — `paths: - discovery/*.mjs` — and deleting the ignore, which drops the ignore count from 11 to 10 and the plain-directory count from seven to six. Task 5's VALIDATE figures change accordingly. The failure mode is now stated in gates.md and in the config's own header: an ignore that removes a subtree of an allowlisted directory has to be verified against the job's extraction log, not read.

- 2026-09-10 — **the tracker brought into line.** #387's title and body rewritten to CodeQL, with F1's and F3's corrections folded in (the `needs.result` guard, `--omit=dev`, the discovered directory list) and an amendment comment recording what changed and why. #388's title and body rewritten to read the PR's CodeQL alerts, with the no-suppression rule extended to `paths-ignore` widening and a refusal on a ref with no analysis. Nothing in this plan is now a documented deviation from its ticket.
