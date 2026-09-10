# Implementation Report — the security gate (#387)

**Plan**: `.claude/plans/security-gate-387.md`   **Branch**: `feature/security-gate-387`
**Base**: 4f2e859 → 9a3d15b (origin/main did not move during the run)   **Status**: PARTIAL

## Summary

Three CI jobs and one skill change, together making the ticket's guarantee: a PR cannot leave draft
except through a step with no model in it. `piv-create-pr` now opens every PR as a draft; `ready-pr`
is the only thing that flips it, and it is bash reading job results. `codeql` scans a
`javascript-typescript` database of the hand-written source and a step of ours reads the alerts back
and fails on high or critical; `audit` runs `tooling/audit-delta.mjs`, an npm advisory delta between
the PR's base SHA and its head. Every gate is proven by a mutation that reddens it.

**PARTIAL for one reason:** `GITHUB_TOKEN` cannot take a PR out of draft. The gate's assert half is
proven and holds; the final flip needs a `READY_PR_TOKEN` secret the owner has not created yet. See
**Not run** and **Deviations**.

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
- Task 9 → the `ready-pr` job (UPDATE)
- Task 10 → `.claude/skills/piv-create-pr/SKILL.md`, all six sites (UPDATE)
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
| CodeQL scope (the allowlist) | — | — | 191 repo files extracted from the 7 allowlisted scopes, 0 from `docs/`, `.claude/`, `.agents/`, `.archon/`, `assets/`, `scenarios/`, `handoff/`, `traces/`, `replay/`, `discovery/<slug>/`, `proto/compositions/`. Read from the job's own extraction log, not from the config |
| `ready-pr` — `needs.<job>.result` | dropped the `feed` fixture from `BOARD_FOR` in `tooling/build-checks.mjs` | `verify` red at Build checks; `::error::verify did not succeed (result=failure)` | `drift-check` stayed green on the same tree, so it is a single-leg red |
| `ready-pr` — both at once | mutations A + B together | `::error::verify did not succeed` AND `::error::codeql did not succeed` in one log — the no-`set -e` design reporting every red job, not the first | — |
| `ready-pr` — `needs.visual.outputs.gate` | deleted `tooling/visual-regression/baselines/404-neutral.png` on a `feature/v3-*` head (PR #390) | `needs.visual.result` = **success** (laundered), `needs.visual.outputs.gate` = **failure**, `::error::visual gate outcome=failure` printed ALONE with no `visual did not succeed` line | the `Upload diff report` step RAN (conclusion success) — `if: failure()` would have skipped it, which is what edit 3 of Task 4 exists for |
| `drift-check` group-count leg | `34 PURE groups` → `33` in CLAUDE.md; `34 pure groups` → `33` in gates.md | `drift ✗ group-count drift: CLAUDE.md (architecture map): says 33 groups, build-checks defines 34`, and the gates.md equivalent | restored → `drift-check ✓` |
| `ready-pr`'s two bash bodies | driven directly with synthetic env | all-red input names all four jobs + the gate line, exit 1 | all-success input exits 0 silently |

Two mutations the plan specified **did not redden**, and both were replaced rather than accepted:

- `eval(argv[2])` produced **zero** alerts. `process.argv` is a local-threat-model source and
  GitHub's default suite tracks remote sources only. The file WAS extracted (confirmed in the job
  log), so this was the vacuous shape, not a scope miss.
- `maxDiffPixels: 100 → 0` left the `Visual regression` step **passing** — the CI baselines are
  pixel-exact in the pinned container, so there was nothing to launder.

## Validation results

Local, on **Node v20.20.2** (CI pins 24 — every figure below is observed locally unless marked):

- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count` (exit 0)
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ 3 groups — no drift`
- `node tooling/audit-delta.mjs 4f2e859` → `audit-delta ✓ no advisory ID present at head that the base did not carry`; discovered `portal, tooling/style-dictionary, tooling/visual-regression`; base 0/5/0, head 0/5/0
- `node --check tooling/audit-delta.mjs` → clean
- `python3 -c "yaml.safe_load(...)"` on both YAML files → parses; jobs `['verify','visual','codeql','audit','ready-pr']`; 8 allowlist entries, 10 ignores

**Observed in CI (Node 24)**, run 34470360444 and after:

- `audit` job: same three directories, same counts, against `github.event.pull_request.base.sha`
- `codeql` baseline (Task 6b, PR #389): **1** analysis on `refs/pull/389/merge`, `results_count: 0`,
  `rules_count: 87`, **0 open alerts at any severity**. Zero high, zero critical, so Task 7's gate
  stands as written — the plan's decision rule, first branch. This is the first CodeQL number this
  repo has ever had.
- extraction: **187** repo files before the discovery fix, **191** after — `bank.mjs`, `ops.mjs`,
  `prd-projection.mjs`, `proposals.mjs`

## Not run

- **AC #1's positive half — the green-path flip.** `GITHUB_TOKEN` cannot un-draft a PR (see
  Deviations), so no run has yet observed `ready-pr` taking a PR out of draft. Everything up to the
  flip is proven: the assert step passed on a green tree and failed by name on each of the four
  mutations, and the PR stayed a draft every time. **Tracker: owner's call** — create
  `READY_PR_TOKEN` (a fine-grained PAT scoped to this repo, `Pull requests: write`, nothing else)
  and this ticket's own PR proves it on its next run.
- **`gh workflow view verify --yaml`** — not run; GitHub parsed the workflow for real on seven runs,
  which is strictly stronger.
- **A push-to-`main` run of `codeql`** — cannot be observed before merge. Its `if:` conditions are
  exercised in the negative on every PR run; the baseline seed on `main` happens at merge.

## Deviations from the plan

- **The draft flip needs a repository secret (plan error, and it inverts the plan's headline claim).**
  The plan states there is "no account, no secret, no third-party service" and ships an empty
  paid-and-owner-only table. That half is true for CodeQL and false for the flip.
  `markPullRequestReadyForReview` answers `FORBIDDEN — Resource not accessible by integration` to
  the Actions token with `PullRequests: write` in the job's own token block. Task 9's stated
  fallback (the GraphQL mutation with `node_id`) is the same call and fails identically. REST's
  `PATCH /pulls/{n}` has no `draft` field, so GraphQL is the only route at all. At the owner's
  instruction the repo's `can_approve_pull_request_reviews` was set to `true` and re-tested: **not
  the cause** (job 102856482180), and it was restored to `false`. The step now reads
  `secrets.READY_PR_TOKEN` and refuses BY NAME when absent. Plan table and gates.md updated.
- **`discovery/*/**` in `paths-ignore` was wrong (plan error).** CodeQL's `**` matches zero or more
  segments, so it collapsed to `discovery/*` and silently excluded the four real modules — the exact
  thing the task's own GOTCHA warned against for `discovery/**`. Measured: 187 files extracted, 0
  under `discovery/`, gate green. Fixed by naming `discovery/*.mjs` in the **allowlist** and
  deleting the ignore (11 ignores → 10, seven plain directories → six).
- **Task 8's seed replaced (plan error).** `eval(argv[2])` fires nothing — local threat model. A
  `node:http` → `eval`/`exec` flow fires two **critical** alerts.
- **Task 14.6's VR mutation replaced (plan error).** `maxDiffPixels: 0` does not fail a pixel-exact
  baseline; deleting one baseline PNG does.
- **Task 3's temp-branch dance skipped.** `audit-delta.mjs` reads the working tree, so the seed was
  applied in place and reverted with `git checkout --`. Same proof, fewer moving parts.
- **The baseline probe used a throwaway PR (#389), not this ticket's PR.** Task 6b says to open a
  draft PR from the feature branch; Task 14.1 says to open this ticket's PR by running
  `piv-create-pr`. Opening the ticket's PR early would have made AC #1's "a PR opened by
  `piv-create-pr` is a draft" unprovable, so #389 carried the probe and all four mutations, and the
  ticket's PR is still unopened. #389 and #390 are closed unmerged, branches deleted.
- **The CodeQL gate writes to `$RUNNER_TEMP`, not `/tmp`.** Same behaviour, the idiomatic Actions
  path.

## Assumptions carried

- The plan's decision rule for the CodeQL baseline, first branch: zero high and critical, so the
  `high`+`critical` threshold stands exactly as written.
- Q1 unchanged: the flip is one-way, and that is stated as a limitation in gates.md rather than
  fixed with `gh pr ready --undo`.
- Q2 unchanged: `main` stays unprotected. It is the owner's call and orthogonal, and it is named in
  gates.md as the reason the draft state is the only mechanical gate.
- D11's `continue-on-error` at `verify.yml:92` is untouched, byte for byte. Only the plumbing around
  it changed.

## Additions beyond the plan

- `verify.yml`'s header comment now describes all five jobs. The plan did not mention it, and the
  repo's rule is that the file header is the specification.
- The standing rule about future `continue-on-error` jobs is written into the `ready-pr` job's own
  comment as well as gates.md, so an editor adding such a job sees it where they are working.
- `audit-delta.mjs` handles a directory absent at HEAD (removed by the PR) as well as absent at
  base; the plan specified only the base side.

## Issues encountered

- A mutation test used `git checkout -- CLAUDE.md .claude/references/gates.md` to restore, which
  discarded the uncommitted Tasks 11 and 12 edits in those same files. Caught by reading
  `git status` before the commit, and both were re-applied. The lesson is the memory's: verify what
  is staged, never restore a file that carries uncommitted work.
- Seven CI runs were spent, six of them deliberately red.
