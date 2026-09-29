# Implementation Report — neutral pack `--color-fg-muted` clears AA on the card surface (#482)

**Plan**: `.claude/plans/neutral-fg-muted-aa-482.md`   **Branch**: `fix/neutral-fg-muted-aa-482` (worktree `../wt-482`)   **Base**: `eb84860` → `eb84860` (origin/main unmoved at report; `git merge origin/main` a no-op)   **Status**: COMPLETE

## Summary
`neutral.primitives.color-slate` #6b7280 → #69707e, which moves `--color-fg-muted` and `--color-accent-secondary`
together; the neutral pack now passes 12/12 of `RULESET.wcagPairs` (the failing pair reads 4.53). Token CSS,
handoff pack and pack bundle regenerated, the build card's hand-mirrored fallback updated, and
`components-neutral.png` re-baselined. build-checks 43.16 and canvas-journey I12 now assert the verdict WORD
(faithful green, wrong red with the wrong-but-green line) instead of only re-deriving it; both redden on the old value.

## Tasks completed
- Task 0 → worktree `../wt-482` from `origin/main` @ `eb84860`; `tooling/style-dictionary` + `tooling/icons` `npm ci`; plan `.md`/`.html` copied in
- Task 1 → `system/tokens.source.json:104` (UPDATE); `system/tokens.neutral.css` (REGENERATED)
- Task 2 → `system/build-card.mjs:38` (UPDATE)
- Task 3 → `handoff/verdant/{pack.bundle.json,tokens.dtcg.json,tokens/android/tokens.xml,tokens/css/neutral.css,tokens/ios/FactoryTokens.swift}` (REGENERATED); import records + expected verdicts regenerated, zero diff
- Task 4 → `tooling/build-checks.mjs` 43.16 verdict pin (UPDATE)
- Task 5 → group 43 string, `.claude/references/gates.md:78`, `import/fixtures/measure-live/README.md` (UPDATE)
- Task 6 → `tooling/visual-regression/baselines/components-neutral.png` (REGENERATED)
- Task 7 → gates on the committed tree
- Task 8 → `tooling/canvas-journey.mjs` I12 literal-green assertion + header comment; `gates.md` canvas-journey paragraph (UPDATE)

## Tests added
No suite (CLAUDE.md § Testing). Two assertions:
- build-checks 43.16: `the owner's ${frame} frame reads … — expected green/red … every pair passing (#482)`, per frame.
- canvas-journey I12: `the faithful frame reads GREEN, every WCAG pair passing (#482)`.

## Proving the checks

| Check | Mutation | Went red (observed) | Positive control (observed) |
|---|---|---|---|
| 43.16 verdict pin | `color-slate` back to `#6b7280` + `gen-token-css` | `build import run ✗ 2 failure(s)` — `faithful frame reads "red" at WCAG 11/12 (failing ["color-fg-muted on color-bg-surface"]) … expected green, without it` and `wrong frame reads "red" at WCAG 11/12 … expected red, with it` | `#69707e`: `build ✓  all 46 groups pass` |
| I12 literal green | same mutation | `✗ I12 · the faithful frame reads GREEN, every WCAG pair passing (#482)  red at WCAG 11/12 (failing ["color-fg-muted on color-bg-surface"])`; `canvas-journey ✗  1 assertion(s) failed`, exit 1 | `#69707e`: `✓` that line, `canvas-journey ✓`, exit 0 |

Driver check for I12: on the mutated (old) value the fresh render measured worst ΔE **1.3379 at text:Amara Okafor**,
byte-for-value the committed `faithful.measure.json`. So the renderer reproduces the capture, and the fixed-value
figure below differs because of the grey, not the driver.

## Validation results
All observed, in `../wt-482`.
- `node $SCRATCH/wcag482.mjs $PWD` before: `neutral { pass: 11, total: 12 }`, `color-fg-muted/color-bg-surface 4.4`, `faithful 1.3379 red`, `wrong 29.7584 red`.
  After: `{ pass: 12, total: 12 }`, `…/color-bg 4.98`, `…/color-bg-surface 4.53`, `color-accent-secondary/color-bg 4.98`, `faithful 1.3379 green`, `wrong 29.7584 red`.
- `node agent-layer/gen-token-css.mjs` → `token css ✓ 63 contract + 71 pack tokens`
- `node agent-layer/gen-handoff.mjs` → `handoff pack ✓ 26 specs + 3 token targets + 3 wc wrappers`
- `node agent-layer/gen-pack-bundle.mjs` → `pack bundle ✓ 16 files`
- `node tooling/regen-import-records.mjs` → `import records ✓ … 4 files, 187933 bytes`, no diff
- `node import/regen-expected.mjs` → two `expected verdict ✓` lines, no diff
- `git status --short` after Task 3: exactly the eight paths the plan lists (no `import/`, no `contract.css`)
- `grep -c "#482"` → build-checks 3, gates.md 1, README 1 (before Task 8's gates.md edit)
- `node tooling/canvas-journey.mjs chromium` → exit 0, every I12/I12b line ✓; **fresh live worst ΔE 1.3688 at text:Last seen 2 min ago** (the subtitle, now painted #69707e against the drawn #6B7280; under THRESHOLD 5.0)
- VR (Docker `playwright:v1.61.1-jammy`): `--update-snapshots -g "components · neutral"` → `1 passed`; full gate → `33 passed`
- On the committed, merged tree (`e85dea0`): `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count`; `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`; `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass`

## Not run
- Re-capture of `measure-live/faithful`: out of scope per plan (owner's hand; replay pinned to committed bytes).
- `canvas-journey` on firefox/webkit: plan names chromium only.

## Deviations from the plan
- Task 8 prose: the plan names two copies (header comment, gates.md). A third copy exists — the
  `canvas-journey ✓` success summary string (`tooling/canvas-journey.mjs` ~line 1302, "worst ΔE under THRESHOLD
  with the derived verdict"). Updated it too (plan error: missed copy; memory "Gate prose has three copies").
- Commit order: Tasks 1–5 and 8 committed together (`7d1c9b2`), then the VR baseline regenerated and amended in,
  giving one atomic ticket commit `e85dea0` rather than two. The worktree held only this ticket's changes, so
  the working-tree read the plan guards against could not pick up foreign files.

## Assumptions carried
- D1: contract fallback `color-fg-muted` left at #6b7280 (Q1 open for the owner).
- D2: shared primitive, so `--color-accent-secondary` moves too (4.83 → 4.98, observed).

## Additions beyond the plan
- `import/fixtures/measure-live/README.md`: the appended #482 paragraph also says the subtitle (line 15, "the
  neutral pack's `--color-fg-muted`") was drawn at the pack's value before #482, so line 15 is no longer read as
  current. Line 15 and lines 34–36 left as the capture-time record.
- Level 4 closed by reading the image instead of a browser: the strong-diff (>40 grey levels) rows between the
  old and new `components-neutral.png` form 23 bands; the first band's crop
  prints `#69707e` in the resolved-value column (observed via PIL crop + Read).
- Sweep `git grep -niE '6b7280|107, ?114, ?128'` and `git grep '11/12'` outside plans/traces: no other neutral-pack
  mirror. Remaining hits are the contract (D1), the verbatim `measure-live` captures, historical reports, and
  43.16's synthetic paints of a drawn #6B7280 subtitle (images, not a pack copy).

## Issues encountered
- The Docker VR run's `npm ci` reinstalls the mounted `tooling/visual-regression/node_modules` from Linux
  (observed: `fsevents` present before, absent after). canvas-journey ran before it; whether a later macOS
  `measure-render` run is affected was not tested.
