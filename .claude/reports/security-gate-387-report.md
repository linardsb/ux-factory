# Implementation Report — the security gate (#387)

**Plan**: `.claude/plans/security-gate-387.md`   **Branch**: `feature/security-gate-387`
**Base**: 4f2e859 → HEAD (origin/main did not move during the run)   **Status**: COMPLETE, with one owner step sequenced after merge

## Summary

Three CI jobs plus branch protection, together making the ticket's guarantee: **a PR cannot merge
except through a step with no model in it.** `codeql` scans a `javascript-typescript` database of
the hand-written source and a step of ours reads the alerts back and fails on high or critical;
`audit` runs `tooling/audit-delta.mjs`, an npm advisory delta between the PR's base SHA and its
head; `gates-green` is the single required check that is green only when all four were, and it is
bash reading job results. Every gate is proven by a mutation that reddens it.

**O1 changed shape mid-run, at the owner's call.** The plan's draft-flip edge is not buildable:
`GITHUB_TOKEN` cannot perform `markPullRequestReadyForReview` (measured three ways), and the only
alternative was a PAT in a repo secret. The owner chose branch protection instead — no credential,
and it gates the merge rather than the draft, which the plan's own Q2 called the stronger claim.
`piv-create-pr` is reverted to opening PRs ready for review.

**The one outstanding step is the owner's, sequenced after merge:** enable branch protection on
`main` requiring `verify`, `visual`, `codeql`, `audit` and `gates-green`. Doing it before merge
would block the two PRs already open (#386, #381), whose heads carry none of the new jobs.

## Tasks completed

- Task 1 → `tooling/audit-delta.mjs` (CREATE)
- Task 2 → `.github/workflows/verify.yml` — the `audit` job (UPDATE)
- Task 3 → the local reddening proof (run, reverted)
- Task 4 → `.github/workflows/verify.yml` — the `visual` job's `outputs.gate`, `id: vr`, the
  `Upload diff report` condition, and the two appended steps (UPDATE)
- Task 5 → `.github/codeql/codeql-config.yml` (CREATE)
- Task 6 → the `codeql` job + the baseline probe (UPDATE, measured)
- Task 7 → the `Require no high or critical alerts` gate step (UPDATE)
- Task 8 → the CodeQL reddening proof (run on PR #389)
- Task 9 → the `gates-green` job (UPDATE — `ready-pr` re-decided, see Deviations)
- Task 10 → `.claude/skills/piv-create-pr/SKILL.md` — done, then **reverted** when O1 was re-decided; the file is byte-identical to `origin/main`
- Task 11 → `CLAUDE.md` §Testing (UPDATE)
- Task 12 → `.claude/references/gates.md` — line 7 + the new security-gate section (UPDATE)
- Task 13 → the full local gate (run)
- Task 14 → four mutations on throwaway PRs #389 and #390 (run, both closed unmerged)

Beyond the plan: `verify.yml`'s header comment now names all five jobs (it said "four gates" and
listed the two that existed).

## Tests added

None — this repo has no suite by rule. `tooling/audit-delta.mjs` is proven by running it, twice.

## Proving the checks

Every row was mutated and observed; none was read.

| Check | Mutation applied | What went red | Positive control |
|---|---|---|---|
| `tooling/audit-delta.mjs` | `lodash@4.17.15` in `portal/package.json` + regenerated lock | exit 1 naming 6 new advisory IDs (`1106913 1106920 1108258 1115806 1115810 1120370`) | the 5 pre-existing `tooling/style-dictionary` IDs read on the BASE side and stayed OUT of the delta; clean run exits 0 |
| `audit` job (CI, base-SHA comparison) | the same seed, pushed to PR #389 | job red, `audit-delta ✗ portal: new advisory …` × 6 against base `4f2e859` (run 34471565003) | style-dictionary absent from the delta in the same log |
| `codeql` gate step | a `node:http` request reaching `eval()` and `exec()` in `tooling/__tmp-seed.mjs` | `::error::CodeQL found 2 blocking alert(s)`, `critical js/code-injection` + `critical js/command-line-injection` (job 102854187896) | the positive control is IN the step: it refuses a ref with zero analyses before reading any count. Clean run printed `CodeQL: no high or critical alerts … (5 analysis/analyses read)` |
| CodeQL scope (the allowlist) | — | — | 191 repo files extracted from the 8 allowlisted scopes then in the config, 0 from `docs/`, `.claude/`, `.agents/`, `.archon/`, `assets/`, `scenarios/`, `handoff/`, `traces/`, `replay/`, `discovery/<slug>/`, `proto/compositions/`. Read from the job's own extraction log, not from the config. **Superseded by review F4:** `scenarios/*.mjs` and `scenarios/*.html` are a ninth and tenth scope (the second found by widening F4's completeness check past `*.mjs`/`*.js` — the extractor takes `.html`, and `scenarios/check.html` was outside), so the figure at head `0e38370`, which carried only the ninth, was **192** across **9** scopes — `system` 75 · `tooling` 45 · `portal` 25 · `agent-layer` 23 · root `*.html` 15 · `discovery` 4 · `worker` 2 · `proto` 2 · `scenarios` 1. Re-derived from run 34488689396's own extraction log (job 102909461092): exactly one new file, `scenarios/validate.mjs`, 0 from `node_modules`, `scenarios/<slug>/` fixtures still out. Gate step: `CodeQL: no high or critical alerts on refs/pull/391/merge (2 analysis/analyses read)`, 0 open alerts from the API. **With the tenth scope, at head `4be4b72`: 193 across 10 scopes** — `scenarios` 2 (`validate.mjs` + `check.html`), everything else unmoved. Derived first (192 + 1, `git ls-files 'scenarios/*.html'` matching exactly `check.html`) and then OBSERVED in run 34489399833's extraction log (job 102911886033), which is what closes it. Gate step: `CodeQL: no high or critical alerts on refs/pull/391/merge (4 analysis/analyses read)`, 0 open alerts |
| `gates-green` — `needs.<job>.result` | dropped the `feed` fixture from `BOARD_FOR` in `tooling/build-checks.mjs` | `verify` red at Build checks; `::error::verify did not succeed (result=failure)` | `drift-check` stayed green on the same tree, so it is a single-leg red |
| `gates-green` — both at once | mutations A + B together | `::error::verify did not succeed` AND `::error::codeql did not succeed` in one log — every red job reported, not just the first | — |
| `gates-green` — the fail path itself (review F2) | drove the step body with `VERIFY=failure` under plain `bash`, the shell the old comment claimed | **before:** `::error::verify did not succeed` then `every gate green`, **exit 0** — the merge gate green right after printing its own error. **after** (`if [ "$red" -ne 0 ]; then exit 1; fi`): exit 1 under `bash` and `bash -e` alike | all three reds still named under both shells, so `-e` was never what would have truncated the report — the row above was observed UNDER `-e` (`shell: /usr/bin/bash -e {0}`, job 102854653417) |
| `tooling/audit-delta.mjs` — half-present head dir (review F1) | moved `portal/package-lock.json` aside, left `portal/package.json` declaring the SDK and `zod` | **before:** `portal: absent at head — removed by this change`, 0 advisories contributed, **exit 0**. **after:** `audit-delta ✗ portal (head) carries package.json but not package-lock.json — cannot audit, refusing to read it as removed`, exit 1 | the mirror case (`package.json` aside) throws too; a GENUINE removal — both files gone — still reads as removed and exits 0; clean run still exits 0 |
| `gates-green` — `needs.visual.outputs.gate` | deleted `tooling/visual-regression/baselines/404-neutral.png` on a `feature/v3-*` head (PR #390) | `needs.visual.result` = **success** (laundered), `needs.visual.outputs.gate` = **failure**, `::error::visual gate outcome=failure` printed ALONE with no `visual did not succeed` line — the case that decides the AGGREGATOR must read the job output rather than `needs.visual.result`. It does NOT decide the contexts choice: on this same head the `visual` CHECK RUN reported `failure` to both the jobs and check-runs APIs, so protection requiring `visual` would have blocked (review F3) | the `Upload diff report` step RAN (conclusion success) — `if: failure()` would have skipped it, which is what edit 3 of Task 4 exists for |
| `drift-check` group-count leg | `34 PURE groups` → `33` in CLAUDE.md; `34 pure groups` → `33` in gates.md | `drift ✗ group-count drift: CLAUDE.md (architecture map): says 33 groups, build-checks defines 34`, and the gates.md equivalent | restored → `drift-check ✓` |
| `gates-green`'s assert body | driven directly with synthetic env | all-red input names all four jobs + the gate line, exit 1 | all-success input exits 0 silently |
| `codeql`'s positive control (review R1) | drove the step body **as YAML hands it to bash** — extracted from the workflow, `gh` stubbed to print an EMPTY then a whitespace-only analyses count, under `bash -e` + `set -euo pipefail` | **before:** `[: : integer expression expected`, then `CodeQL: no high or critical alerts … ( analysis/analyses read)`, **exit 0** — the control fell through silently past its own error and the gate reported green having measured nothing. **after:** `::error::CodeQL analysis count … is not a number: [] — cannot read this gate`, exit 1, for both the empty and the whitespace value | the three neighbouring paths unmoved: `0` still fires the original "measured nothing" control (exit 1), `1` with no alerts still exits 0 green, `1` with a critical alert still exits 1 naming it; and a literal JSON `null` body still reaches `0` through `jq 'length'` |

Two mutations the plan specified **did not redden**, and both were replaced rather than accepted:

- `eval(argv[2])` produced **zero** alerts. `process.argv` is a local-threat-model source and
  GitHub's default suite tracks remote sources only. The file WAS extracted (confirmed in the job
  log), so this was the vacuous shape, not a scope miss.
- `maxDiffPixels: 100 → 0` left the `Visual regression` step **passing** — the CI baselines are
  pixel-exact in the pinned container, so there was nothing to launder.

**`gates-green` HAS run under its new name, with the F2-corrected body** (review R2 — this was listed
under `## Not run` when the rename was fresh). Every mutation above drove the same assert step under
the old name `ready-pr`; the rename, the dropped `pull-requests: write` and the dropped draft
condition touch no part of the step body. CI has since run the corrected body green on all six pushed
heads (`8543bc4` · `0e38370` · `3c0a424` · `4be4b72` · `3dc83f5` · `66d5335`); job **102913980615**
at `66d5335` logs `shell: /usr/bin/bash -e {0}`, `VERIFY/VISUAL/VISUAL_GATE/CODEQL/AUDIT: success`,
the explicit `if [ "$red" -ne 0 ]; then exit 1; fi` body and `every gate green` — which also confirms
from CI's own log the shell claim F2's old comment denied.

## Validation results

Local, on **Node v20.20.2** (CI pins 24 — every figure below is observed locally unless marked):

- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count` (exit 0)
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ 3 groups — no drift`
- `node tooling/audit-delta.mjs 4f2e859` → `audit-delta ✓ no advisory ID present at head that the base did not carry`; discovered `portal, tooling/style-dictionary, tooling/visual-regression`; base 0/5/0, head 0/5/0
- `node --check tooling/audit-delta.mjs` → clean
- `python3 -c "yaml.safe_load(...)"` on both YAML files → parses; jobs `['verify','visual','codeql','audit','gates-green']`; 8 allowlist entries, 10 ignores

**Observed in CI (Node 24)**, run 34470360444 and after:

- `audit` job: same three directories, same counts, against `github.event.pull_request.base.sha`
- `codeql` baseline (Task 6b, PR #389): **1** analysis on `refs/pull/389/merge`, `results_count: 0`,
  `rules_count: 87`, **0 open alerts at any severity**. Zero high, zero critical, so Task 7's gate
  stands as written — the plan's decision rule, first branch. This is the first CodeQL number this
  repo has ever had.
- extraction: **187** repo files before the discovery fix, **191** after — `bank.mjs`, `ops.mjs`,
  `prd-projection.mjs`, `proposals.mjs`

**Re-run at `d670047` after the round-2 fixes** (Node v20.20.2 local; CI on Node 24):

- `drift-check ✓` · `token-lint ✓ 63 contract tokens` · `build ✓ all 34 groups pass` ·
  `loc summary ✓ 3 groups — no drift` · `param count ✓ 120 controls — no drift` ·
  `audit-delta ✓ base 0/5/0, head 0/5/0, new 0`
- **The portal smoke leg**, which the first pass omitted: booted on a private port
  (`PORT=4791 node server.mjs`, killed by PID — never `pkill -f`, sibling sessions run recorders).
  `/api/health` → `{"ok":true,"hasToken":false,"cards":9,"bootSha":"d670047…","stale":false}`;
  `/` → HTTP 200, 15858 bytes; a cross-origin POST → **403**, so `lib/origin.mjs`'s guard still
  holds. The boot SHA is this head's, so the answer is about this tree and not a stale process.
- **All six checks green on `d670047`** — run **34500482554**: `verify` · `visual` · `codeql` ·
  `audit` · `gates-green`, plus GHAS's own `CodeQL`. `mergeStateStatus: CLEAN`. The `codeql` job
  going green is what proves the new `[[ … =~ … ]]` guard runs under Actions' real shell; the local
  drive proves what it DOES, and only CI proves the shell offers it.
- **The sibling sweep re-run here rather than inherited from the review.** Every `[ ]` test in
  `verify.yml`, read out: the only bare numeric comparisons are `:217` (`$n_analyses`, now behind
  the regex guard) and `:320` (`$red`, set locally to 0 or 1). `:225` is `-s` on a file; `:308` and
  `:317` are string compares, which cannot raise this class. No other externally-sourced value
  reaches a numeric test. R1's scoping claim therefore holds as an observation, not a quotation —
  worth re-deriving because this same review was wrong about the construct's mechanics.
- **R2's cited evidence read from the log, not from the review's quotation.** Job **102913980615**:
  `shell: /usr/bin/bash -e {0}`, all five of `VERIFY` `VISUAL` `VISUAL_GATE` `CODEQL` `AUDIT` at
  `success`, the `if [ "$red" -ne 0 ]; then exit 1; fi` body echoed in the step listing, and
  `every gate green`.

## Not run

- **Branch protection is not enabled yet.** Enabling it before this PR merges would leave #386 and
  #381 unmergeable — their heads have no `codeql`, `audit` or `gates-green` job, so those required
  checks would sit pending forever. **Tracker: owner's call, sequenced after merge.** One API call:
  `gh api -X PUT repos/linardsb/ux-factory/branches/main/protection` with the five contexts,
  `strict: false`, `enforce_admins: false`. Until it runs, every gate reports and nothing blocks.
  **The contexts are case-sensitive and this repo carries `codeql` (our job) AND `CodeQL` (GitHub
  Advanced Security's own results check).** Typing the wrong case requires a check that is not this
  gate, and the call is made by hand, once, with nothing gating it — read the names back with
  `gh api repos/linardsb/ux-factory/commits/<sha>/check-runs --jq '.check_runs[].name'` (review F9).
  **`strict: false` is a boundary, not an oversight:** both new gates are computed at push time, so
  a PR can merge carrying code neither has seen against a `main` that moved since. `strict: true`
  re-queues every open PR on every merge — a tax worth paying only once two PRs are routinely open
  at the same time (review F5). Named in `.claude/references/gates.md`.
- **`gh workflow view verify --yaml`** — not run; GitHub parsed the workflow for real on seven runs,
  which is strictly stronger.
- **A push-to-`main` run of `codeql`** — cannot be observed before merge. Its `if:` conditions are
  exercised in the negative on every PR run; the baseline seed on `main` happens at merge.

## Deviations from the plan

- **O1 is a merge gate, not a draft edge (plan error + owner's re-decision).** The plan's design is
  not buildable: `markPullRequestReadyForReview` answers `FORBIDDEN — Resource not accessible by
  integration` to the Actions token with `PullRequests: write` in the job's own token block. Task
  9's stated fallback (the GraphQL mutation with `node_id`) is the same call and fails identically.
  REST's `PATCH /pulls/{n}` has no `draft` field, so GraphQL is the only route at all. The repo's
  `can_approve_pull_request_reviews` was set to `true` and re-tested at the owner's instruction:
  **not the cause** (job 102856482180), and it was restored to `false`. Offered a PAT secret or
  branch protection, the owner chose protection. So `ready-pr` became `gates-green`: same assert
  step, no flip, back to `contents: read`, and — load-bearing — **the `if:` lost the `draft`
  condition, because a skipped check counts as PASSING for branch protection.** Task 10's six edits
  were reverted; PRs open ready for review as before.
- **`discovery/*/**` in `paths-ignore` was wrong (plan error).** CodeQL's `**` matches zero or more
  segments, so it collapsed to `discovery/*` and silently excluded the four real modules — the exact
  thing the task's own GOTCHA warned against for `discovery/**`. Measured: 187 files extracted, 0
  under `discovery/`, gate green. Fixed by naming `discovery/*.mjs` in the **allowlist** and
  deleting the ignore (11 ignores → 10, seven plain directories → six).
- **Task 8's seed replaced (plan error).** `eval(argv[2])` fires nothing — local threat model. A
  `node:http` → `eval`/`exec` flow fires two **critical** alerts.
- **Task 14.6's VR mutation replaced (plan error).** `maxDiffPixels: 0` does not fail a pixel-exact
  baseline; deleting one baseline PNG does.
- **Protection requires `gates-green`, not the four jobs alone** — because it is the one check that
  covers all four jobs at once. **Corrected by review F3:** the earlier reason given here (that the
  `visual` check itself goes green while its gate failed) is false. `continue-on-error` launders
  `needs.<job>.result` INSIDE the workflow; on the measured head `343022a` the `visual` check run
  reported `failure` to both the jobs API and the check-runs API, so protection requiring `visual`
  would have blocked. What the laundering defeats is any AGGREGATOR trusting `needs.<job>.result` —
  which is why `gates-green` reads `needs.visual.outputs.gate`, and why the standing rule stands.
  `enforce_admins` is off: the owner can merge past a red gate, no agent can.
- **Task 3's temp-branch dance skipped.** `audit-delta.mjs` reads the working tree, so the seed was
  applied in place and reverted with `git checkout --`. Same proof, fewer moving parts.
- **The baseline probe used a throwaway PR (#389), not this ticket's PR.** Task 6b says to open a
  draft PR from the feature branch; Task 14.1 says to open this ticket's PR by running
  `piv-create-pr`. Opening the ticket's PR early would have made AC #1's "a PR opened by
  `piv-create-pr` is a draft" unprovable, so #389 carried the probe and all four mutations, and the
  ticket's PR is still unopened. #389 and #390 are closed unmerged, branches deleted.
- **The CodeQL gate writes to `$RUNNER_TEMP`, not `/tmp`.** Same behaviour, the idiomatic Actions
  path.
- **One commit is a superseded experiment.** `eee8507 test(ci): the GraphQL fallback for the draft
  flip` is the measurement that ruled the flip out; it is fully superseded by the later commits. Net
  tree is correct — it is left in place because the sequence is the evidence.

## Assumptions carried

- The plan's decision rule for the CodeQL baseline, first branch: zero high and critical, so the
  `high`+`critical` threshold stands exactly as written.
- Q1 is moot: there is no flip, so there is nothing one-way about it.
- **Q2 resolved by the owner, against the plan's non-goal.** The plan listed branch protection as
  explicitly out of scope; it is now the mechanism. Sequenced after merge, five required contexts,
  `strict: false`, `enforce_admins: false`.
- D11's `continue-on-error` at `verify.yml:92` is untouched, byte for byte. Only the plumbing around
  it changed.

## Additions beyond the plan

- `verify.yml`'s header comment now describes all five jobs. The plan did not mention it, and the
  repo's rule is that the file header is the specification.
- The standing rule about future `continue-on-error` jobs is written into the `gates-green` job's
  own comment as well as gates.md, so an editor adding such a job sees it where they are working.
- gates.md records two boundaries the plan did not name: a **skipped** check counts as passing for
  branch protection (so `gates-green`'s `if:` may never narrow), and the CodeQL gate reads **every**
  open alert on the merge ref, so an alert inherited from `main` blocks every PR at once.
- `audit-delta.mjs` handles a directory absent at HEAD (removed by the PR) as well as absent at
  base; the plan specified only the base side.

## Issues encountered

- A mutation test used `git checkout -- CLAUDE.md .claude/references/gates.md` to restore, which
  discarded the uncommitted Tasks 11 and 12 edits in those same files. Caught by reading
  `git status` before the commit, and both were re-applied. The lesson is the memory's: verify what
  is staged, never restore a file that carries uncommitted work.
- Seven CI runs were spent, six of them deliberately red.
- **Review R1's suggested fix was incomplete, and taking it verbatim would have left half the
  defect open.** The review proposed `if [ "${n_analyses:-0}" -lt 1 ]`, mirroring the
  `${VISUAL_GATE:-}` idiom. `:-` substitutes only on unset-**or-empty**, so a whitespace-only value
  — which the review itself observed falling through — is set and non-empty and still reaches the
  numeric test: driven under `set -euo pipefail`, `[ " " -lt 1 ]` raised `integer expression
  expected` and fell through, exit 0. The review named a regex guard as an equally acceptable
  alternative; that is what was implemented, and it closes empty, whitespace, tab, `null` and `[]`
  alike. The lesson is the one R1 is itself an instance of: a fix read rather than run can repeat
  the defect it is closing.
