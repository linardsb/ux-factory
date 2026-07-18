# Implementation Report — CI verification gates (drift-check + token lint)

**Plan**: `.claude/plans/ci-verification-gates.md`   **Branch**: `feature/ci-verification-gates`   **Status**: COMPLETE

## Summary
Added two zero-dependency Node ESM gate scripts and one GitHub Actions workflow that turn ticket #9's "drift-proof" claim into a running gate. `tooling/drift-check.mjs` re-runs the repo-self-contained generators + validators and fails on any divergence from the committed artifacts; `tooling/token-lint.mjs` runs three token-contract checks (undeclared / orphan / DTCG-valid). Both are wired into `.github/workflows/verify.yml` on push-to-`main` + every PR, on Node 20, after `npm ci`-installing Style Dictionary. Both gates are green on the clean tree; all three failure modes were demonstrated. No product code, generator, token, spec, or fixture was changed — the gate is purely additive.

This plan is **partial for #9**: it delivers drift-check + token lint only. The third gate (visual regression, Playwright) stays deferred to a follow-up, so #9 remains open.

## Tasks completed
- Token-lint gate → `tooling/token-lint.mjs` (CREATE) — declared/undeclared/orphan/DTCG checks; reuses `loadSource()`.
- Drift-check gate → `tooling/drift-check.mjs` (CREATE) — syntax → token-css → handoff → scenarios → traces; reuses `genTokenCss`, `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace`.
- CI workflow → `.github/workflows/verify.yml` (CREATE) — Node 20, SD `npm ci`, both gates.
- Proved all three failure modes (undeclared, orphan, drift) and reverted every temp edit.

## Tests added
No unit-test suite (project rule: no framework, no linter). The two scripts **are** the verification surface. Failure modes exercised end-to-end against the real repo:
- **UNDECLARED** — appended `var(--zzz-not-a-token)` to `system/components.css` → `token-lint` exit 1, message named `--zzz-not-a-token`. Reverted.
- **ORPHAN** — injected `color-unused-test` into the `contract` group of `system/tokens.source.json`, regenerated → `token-lint` exit 1, message named `--color-unused-test`. Reverted source + generated CSS.
- **DRIFT (token-CSS path)** — appended a comment to the generated `system/tokens.contract.css` → `drift-check` exit 1, message `token CSS drift: tokens.contract.css`. Reverted.
- **DRIFT (handoff/ porcelain path)** — staged a hand-edit to the generated `handoff/verdant/vocabulary.json` (`git add`), so the index diverges from the regenerated working tree → `drift-check` exit 1, message `handoff/ drift after regeneration — commit the regenerated pack:` followed by porcelain `MM handoff/verdant/vocabulary.json`. Cleaned up safely (`git reset -- handoff/ && git checkout -- handoff/`, no hard reset — shared-worktree discipline). This exercises the same non-empty-porcelain → throw path CI hits on a *committed* stale/new artifact.
- After all reverts: `drift-check` exit 0, `token-lint` exit 0, `git status --porcelain` clean (only the new files).

## Validation results
- `node --check` on every tracked `.mjs` + both new scripts — **PASS** (all).
- `node tooling/token-lint.mjs` — **exit 0**: `47 contract tokens · 0 undeclared · 0 orphan · DTCG valid`.
- `node tooling/drift-check.mjs` — **exit 0**: `syntax · token-css · handoff · scenarios · traces`; `git status --porcelain -- handoff/` clean after.
- `.github/workflows/verify.yml` — YAML parses; triggers `push` + `pull_request`, 5 steps. (First PR CI run is the live validator.)

## Deviations from the plan
1. **Phase-4 drift demonstration recipe corrected — the plan's `vocabulary.json`/`tokens.contract.css` recipe is imprecise about *how* each drift path is triggered.** No script changed; the scripts are exactly as specced. The correction is that `drift-check` has **two** drift-catching mechanisms and each needs a different edit to demonstrate:
   - **token-CSS path** (`genTokenCss({check:true})`, **writes nothing** in check mode): a plain working-tree hand-edit to `tokens.contract.css`/`tokens.neutral.css` survives to the comparison → correctly fails (exit 1). Demonstrated.
   - **handoff/ porcelain path** (`genHandoff(); genVocabulary()` **overwrite** their files, *then* `git status --porcelain -- handoff/`): a *transient uncommitted working-tree* edit to `vocabulary.json`/`pack.json` is **wiped by the regeneration before the porcelain check**, so the gate exits **0** (empirically confirmed — a blank-line append to `vocabulary.json` exited 0, edit gone). What this path actually catches is drift that survives regeneration: a *committed* stale/new artifact (in CI, checkout gives HEAD ≠ fresh regen → porcelain non-empty → exit 1). To demonstrate it locally without committing a stale artifact (and without a dangerous `reset --hard` in a shared worktree), the edit is **staged** (`git add`) so the index diverges from the regenerated working tree → porcelain shows `MM handoff/verdant/vocabulary.json` → exit 1. Demonstrated. Both paths are now proven to fail.
   - **Net AC coverage:** "drift-check fails when a generated artifact (`tokens.contract.css`/`tokens.neutral.css`, the `handoff/` pack, `vocabulary.json`) is hand-edited" — satisfied for both the token-CSS artifacts and the `handoff/` pack, each via its own mechanism.
2. **Nothing else deviated.** Headers, `pathToFileURL` guard, named-error exit idiom, reuse-don't-reimplement, orphan consumer set (LOCKED), Node 20 pin, `npm ci` ordering — all per plan.

## Issues encountered
- Style Dictionary emits its own `✔︎`/target log lines to stdout during `genHandoff()` (via `stdio: "inherit"`); these are cosmetic and appear above the gate's `✓` summary. Matches existing `gen-handoff.mjs` behavior — not changed.
- None blocking.
