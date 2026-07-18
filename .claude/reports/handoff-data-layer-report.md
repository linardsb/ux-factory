# Implementation Report — Handoff data layer (ComponentSpec + DataContract + gen-handoff + Style Dictionary)

**Plan**: `.claude/plans/handoff-data-layer.md`   **Branch**: `feature/handoff-data-layer` (commit `d656f05`)   **Status**: COMPLETE

## Summary

The machine-and-human handoff source for the platform (epic #1, ticket #7). ComponentSpec/DataContract formats are documented and parsed (`parseComponentSpec` joins the parser family in `agent-layer/lib.mjs`); six Verdant specs + four JSON Schema contracts are authored spec-first; `gen-handoff.mjs` emits the committed `handoff/verdant/` pack (spec projections, verbatim contracts, DTCG source, Style Dictionary css/ios/android builds) and is registered in `build.mjs`. Spike 4's outcome (all three SD targets ship, with a documented exclusion list) is recorded on issue #7.

## Tasks completed

- Document ComponentSpec + DataContract formats → `.claude/references/kb-format.md` (UPDATE — file was untracked, now committed)
- `parseComponentSpec` with boundary validation → `agent-layer/lib.mjs` (UPDATE)
- Six specs + four contracts → `system/specs/*.md` + `*.contract.json` (CREATE; `plant-card` pair verbatim from the approved golden exemplar)
- SD package → `tooling/style-dictionary/package.json` + `package-lock.json` (CREATE, style-dictionary@4.4.0)
- SD build script (spike-proven config) → `tooling/style-dictionary/build-tokens.mjs` (CREATE)
- Pack generator → `agent-layer/gen-handoff.mjs` (CREATE)
- Registration with `✓` line → `agent-layer/build.mjs` (UPDATE)
- Architecture map + placement rule → `CLAUDE.md` (UPDATE, additions only)
- Generated pack committed → `handoff/verdant/` (pack.json · contracts/ ×4 · tokens.dtcg.json · tokens/{css,ios,android})
- Spike-4 record → issue #7 comment (https://github.com/linardsb/ux-factory/issues/7#issuecomment-5003449799)

## Tests added

No test suite exists in this repo by ground rule. Ad-hoc negative checks were run in the scratchpad (not committed, per plan): missing json fence, `component` ≠ filename stem, missing contract file, and a `children` entry naming no spec — each throws an `Error` naming the offending path.

## Validation results

- **L1 syntax**: `node --check` on gen-handoff.mjs, lib.mjs, build-tokens.mjs — pass
- **L2 standalone**: SD build ✓ (css/ios/android) · `gen-handoff` ✓ (`6 specs + 3 token targets`) · `gen-token-css.mjs --check` ✓ no drift (regression)
- **L3 integration**: full `build.mjs` run from the jobs folder (space-containing foreign cwd) — all existing `✓` lines plus the new handoff line
- **L4 manual**: pack parses, 6 components all with 4 sections; `4.00dp` in android (px passthrough, ×5); `class FactoryTokens` in Swift; `var(--color-ink)` reference preserved in neutral.css (×3); determinism — regenerated output is **byte-identical** to the committed pack (verified via `git archive` + `diff -r`, and via checksums across consecutive runs)
- **L5 realism read**: pack carries field→element mapping tables, absent-field behaviour, sample records valid against contracts, enumerated states; honesty surfaces present (`status: "spec"` heads, "fictional demo scenario" in `$description` and every `## Usage`)
- All spec `tokens` entries cross-checked to exist in the `contract` group of `tokens.source.json` (no new tokens needed — existing 46 sufficed)

## Deviations from the plan

1. **Commit was relocated after landing on the wrong branch.** A concurrent session sharing this working tree switched HEAD from `feature/handoff-data-layer` to `feature/live-derivation-engine` mid-implementation, so the atomic commit initially landed there. Fixed with `git branch -f feature/handoff-data-layer d656f05` + `git reset 9395c7c`: the ticket branch now holds exactly the intended commit, and `live-derivation-engine` is back at its original position (it had no commits of its own). HEAD was deliberately left on `feature/live-derivation-engine` to avoid disrupting the concurrent session — check out `feature/handoff-data-layer` (or push it directly) when opening the PR.
2. **CLAUDE.md was staged selectively.** The working tree carried uncommitted CLAUDE.md lines from other in-flight tickets (`scenarios/`, `worker/`, a New-scenario bullet). The committed CLAUDE.md is HEAD + only this ticket's four lines; the other tickets' lines remain in the working tree for their own commits.
3. **`.claude/references/kb-format.md` was untracked, not just outdated** — the whole file (pre-existing 13 lines + the new section) is committed, since AC #1 requires the format documented there and an uncommitted doc isn't inspectable proof.
4. **`git diff --exit-code handoff/` (the plan's L4 determinism command) was replaced** with a byte-compare against the branch via `git archive` + `diff -r`, because HEAD sits on a branch where `handoff/` is untracked (see deviation 1) and `git diff` can't see untracked files. Same property proven, stronger form.

## Issues encountered

- The jobs folder resolves to `../Linards jobs folder` relative to the repo (i.e. `/Users/Berzins/Desktop/Linards_current/Linards jobs folder`), not `/Users/Berzins/Desktop/Linards jobs folder` — the L3 command's path needed adjusting; the build itself ran clean.
- SD `buildPath` initially emitted doubled slashes in log output (`css//`) — cosmetic, fixed before commit.
- None otherwise; the spike-pinned SD config worked first run (px passthrough, camel Swift names, className, preprocessor pruning all as recorded).

## Ready for the next step

All plan tasks complete, all validations pass, spike-4 record posted, atomic commit `d656f05` on `feature/handoff-data-layer`. Next: `piv-create-pr` from that branch (this report fills the PR body), then `piv-review-pr`. Note for the PR step: check out or push `feature/handoff-data-layer` explicitly — HEAD currently sits on `feature/live-derivation-engine` (deviation 1).
