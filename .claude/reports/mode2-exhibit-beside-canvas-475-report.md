# Implementation Report — the Mode 2 exhibit beside the canvas (#475)

**Plan**: `.claude/plans/mode2-exhibit-beside-canvas-475.md`   **Branch**: `feat/mode2-exhibit-475` (worktree `../wt-475`)   **Base**: `1b43cee` → `1b43cee` (`origin/main` unmoved at report time; `git fetch` observed; final HEAD `a4899a6` + this report)   **Status**: COMPLETE, except Task 0.5's ticket, which waits for the owner's approval

## Summary
A Mode 2 `component.propose` now derives an `exhibit` node in `canvas.json`: id = the proposal's id, 320×280, `ref: proposal:<name>`. A Mode 2 import places it by rule (`placeExhibit`: right of every authored box, at the frames' top row). One pure predicate, `exhibitClashes(doc, positions)`, refuses any exhibit that meets a frame. Node calls it in `arrangement`, so `saveRun` and `verifyBuild` refuse too. The canvas page calls it after every geometry gesture and puts a refused gesture back with no ledger line. `flush()` is a non-fatal backstop. The applier refuses a frozen original in `screen.compose`, `state.add`'s `override.add` and `variant.add`'s `overrides.<frame>.add`.

## Tasks completed
- 0 · worktree `../wt-475` off `origin/main` `1b43cee`, instead of switching the shared checkout (see Deviations). `tooling/icons`, `portal`, `tooling/visual-regression` and `tooling/style-dictionary` needed `npm ci`.
- 1.1 · `EXHIBIT_SIZE`, `exhibitsOf`, `exhibitClash`, `exhibitClashes` → `system/canvas-ops.mjs` (UPDATE)
- 1.2 · `refuseFrozen` + three call sites → `system/canvas-ops.mjs` (UPDATE)
- 1.3 · groups 35.13 and 35.14, the import line and the group string → `tooling/build-checks.mjs` (UPDATE)
- 2.1 · exhibits in `arrangement` plus the clash refusal, `placeExhibit`, `loadExhibits`, `CANVAS_DESCRIPTION`, the header → `portal/lib/canvas-store.mjs` (UPDATE)
- 2.2 · regenerated `discovery/faster-payment/build/canvas.json`: `$description` only, `1 file changed, 1 insertion(+), 1 deletion(-)` (observed)
- 2.3 · group 36.11, the 36.4 regex and the group string → `tooling/build-checks.mjs`
- 3.1 · `runImport` places a Mode 2 exhibit before `saveRun` → `portal/lib/import-run.mjs`
- 3.2 · group 43.15 and the group string → `tooling/build-checks.mjs`
- 4.1 · `exhibits: loadExhibits(root, doc)` on `/api/canvas/run` → `portal/server.mjs`
- 4.2 · render, guard and backstop, plus header call 5 → `portal/public/canvas.mjs`
- 4.3 · the `.cv-exhibit` block → `portal/public/portal.css`
- 5.1 · X1–X7 and X3b, the header and the summary line → `tooling/canvas-journey.mjs`
- 5.2 · `.claude/references/gates.md` (groups 35, 36, 43, `canvas-journey.mjs`; `grep -c "#475"` → 4) and `discovery/README.md` (the node list and divergence 2)
- 5.3 · `system/loc-summary.json` (runtime 32,400 → 32,500) and the three `approach-*.png` baselines
- 5.4 · hand-off comments posted on #313 and #315 (`gh issue view N --comments | grep -c "from #475"` → 1 on each)

## Tests added
- **35.13**: `EXHIBIT_SIZE` frozen by mutation; `exhibitsOf` over one real input and 5 junk docs; `exhibitClash` over the plan's six literal boxes plus junk; `exhibitClashes` over a folded document across five cases (clear, unbounded-below, authored h honoured, unplaced skipped, frame width taken from the doc when `positions` says 9999).
- **35.14**: the three verbs refuse a frozen original, each naming the verb, `frozen-row`, `pr1` and G7. Four positive controls: the same three verbs naming a Mode 1 proposal, and a prop called `name`.
- **36.11**: `placeExhibit` gives 1518/0. `pr1` derives exactly. A scratch package written by `saveBuild` passes `verifyBuild` (the positive control). Mode 1 derives no node. The exhibit moved inside f1 is refused naming pr1, f1 and G7; moved clear, it passes. Width 999 is refused, an extra `pr9` is refused, and a missing position is refused by `arrangement`.
- **43.15**: a Mode 2 import appends one mode-2 line, puts `pr1` at 1518/0 and leaves a package that passes `verifyBuild`. `loadExhibits` carries the PNG data URL. A second import lands at 1870. A Mode 2 drop carries no PNG, with tool `brilliant` and file `m.txt`.
- **canvas-journey X1–X7 + X3b + X4b**, inside the paired fake-bridge child. X3–X6 run on a 2400-px page. X4b pointer-resizes f2 into the exhibit: refused, width put back, no ledger line, and no `height` written for f2.
- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass` (observed, final tree).

## Proving the checks

| Check | Mutation | Went red (observed) | Positive control |
|---|---|---|---|
| 35.13 unbounded height | `Infinity` → `f.y` in `exhibitClash` | "100/900 below f1 … answered null, not \"f1\"" (+2 more) | 1518/0 → null; below an authored 600 → null |
| 35.14 `screen.compose` guard | delete its `refuseFrozen` call | "35.14 screen.compose, nested two levels … got NO THROW" | Mode 1 name accepted in all three verbs |
| 35.14 props not walked | walk `node.props` too | "35.14 positive control — a prop called name was refused" | — |
| 36.11 clash refusal | disable the `arrangement` throw | "the exhibit moved inside f1 passed verifyBuild … []" | clean Mode 2 package → `[]`; moved clear → `[]` |
| 36.11 size from the doc | `width: p.w ?? EXHIBIT_SIZE.w` | "the exhibit's width edited to 999 passed verifyBuild: []" | — |
| 36.11 exhibits derived | filter exhibits out | "Mode 2 derives no pr1, or the wrong one: null" (+3) | — |
| 43.15 placement | disable the `mode === 2` block in `runImport` | "a Mode 2 runImport (43.15) threw …: arrangement: node \"pr1\" has no position" and "appended 0 lines … imports/i1.json on disk: true" (8 failures) | — |
| X3 guard on `ui.move` (plan REDDENS 0) | drop `"ui.move"` from `GEOMETRY_VERBS` | X3 ×3 red; save line "Not saved yet — Refused: …", 0 ledger lines (the backstop keeps the session alive) | X4 f1 → desktop accepted |
| X3b guard on `ui.redo` (plan REDDENS a) | drop `"ui.redo"` | X3b red: "Redone: … at 40, 40 · … Not saved yet — Refused" | — |
| X4b guard on `ui.resize` | drop `"ui.resize"` | X4b "resized to 1090 by 352 · w 1090 (was 390)" (+2 X6 lines downstream) | X6 accepted resize |
| X4b refused resize authors nothing (`newlyAuthored`) | delete `authoredH.delete(id)` | X4b "…canvas.json carries no height for f2" red: `"height":352` on disk | — |
| X4 pending removal (plan REDDENS b) | comment out `pending.splice(gestureMark)` | X4 "no ledger line" red with the `frame.size` applied + undone pair on disk | — |

**The driver proved on a known-bad input:** mutation (0) turns every X3 line red, so the journey's drag, live-region read and box read can each fail.


## Validation results
- Level 1: `node --check` on all seven files → no output (observed).
- Level 2: `node tooling/build-checks.mjs` on clean HEAD `a4899a6` → `build ✓  all 46 groups pass` (observed).
- CI `verify` locally, all on clean HEAD `a4899a6`: `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · group-count` (observed, after `tooling/style-dictionary` `npm ci`). `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`. `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`.
- Level 3: `node tooling/canvas-journey.mjs all` on clean HEAD `a4899a6` → chromium 117 ✓ / 1 ✗, firefox 116 ✓ / 1 ✗, webkit 116 ✓ / 1 ✗ (observed). The only ✗ is `I4 · the view's drop list grew by exactly one  11 → 11` on each engine: exactly the plan's pre-existing baseline (Task 0.5). The plan's baseline was 280 passes. This run has 349, and 349 − 280 = 69 = 23 new lines × 3 engines (derived; the 23 are X1–X7's 20 assertions, X3b and X4b's two). `git status --porcelain -- discovery/ system/ handoff/ import/overrides/` was empty afterwards (observed).
- Level 4: portal on an OS-assigned port, killed by its own PID → `/api/health` `{"ok":true,…,"stale":false}`, and `/api/canvas/run?provenance=fictional&slug=faster-payment` → `exhibits: []` (observed).
- A chromium screenshot of a real Mode 2 exhibit on a scratch package, read by eye. The first render squeezed the PNG to about 40 px, fixed in `7f5fc9b`. The image now measures 120 px and every line fits.
- Task 5.3 baselines: a Docker `mcr.microsoft.com/playwright:v1.61.1-jammy` container on a clean detached worktree of `695d253` → `33 passed`, `git status` = exactly the three `approach-*.png` (observed). Re-run without `--update-snapshots -g approach` → `3 passed (5.5s)` (observed).

## Not run
- **Task 0.5, the I4 ticket.** `gh issue list --state all --search "canvas-journey I4"` → `[]` (observed). Opening an issue is outward-facing and the plan records no approval yet, so it is owner's call. The baseline is recorded here: 3 × `I4 11 → 11`, identical before and after #475.
- **`canvas-journey.mjs chromium --live-brilliant` with Mode 2**: needs a paired brilliant.design tab and the owner's hand. No ticket, per the plan.
- **CI's visual gate and CodeQL**: they run on the PR.

## Deviations from the plan
- **Task 0**: made a worktree (`git worktree add ../wt-475 -b feat/mode2-exhibit-475 origin/main`) instead of running `git switch -c` in the shared checkout. The shared checkout holds another session's branch and a modified file (`.claude/skills/piv-fix-review-findings/SKILL.md`). The branch name and base are the plan's.
- **Task 4.2, the pending removal**: the plan says drop "a trailing `applied X` + `undone X` pair". The page records `pending.length` in a handler registered before every consumer (`gestureMark`) and splices from that mark instead. Reason: a refused `ui.move` adds no pending line, so the trailing-pair rule would remove an earlier gesture's legitimate pair, possibly one inside a save still in flight, whose `pending.splice(0, ops.length)` would then delete the wrong lines. REDDENS (b) is still red under the new form.
- **Task 5.1, placement and geometry**: X runs after I11, not after I9, so I11's assertions stay untouched. X3 drags onto f1 on a separate 2400-px context of the same portal (with its own page-error check, X7), so f1 and the exhibit are both on screen at scale 1 and the drag needs no auto-scroll. X3 has a scale-1 precondition that names the scale if it fails.
- **Task 4.2, the copy** (from the eyeball): the fourth line is now "Kept for comparison: never joins the system or goes inside a frame.", shortened from the plan's two sentences. The two meta lines are one line each, cut off with an ellipsis, with the full text in `title`. With the plan's copy, the text squeezed the image to about 40 px inside the fixed 320×280 box.

## Assumptions carried
- Q2: `EXHIBIT_SIZE` fixed at 320×280. Q3: the refusal is forward-only, and `refuseFrozen`'s header says so. Q4: PNGs travel as data URLs on `/api/canvas/run`.
- Task 5.4's comments were posted under the plan's recorded owner approval of 2026-09-28.

## Additions beyond the plan
- **`newlyAuthored` in `canvas.mjs`**: `adapter.resized` notes whether the resize made a frame's height authored for the first time. A refused resize takes that frame back out of `authoredH` and refits it, so the refused gesture leaves no height in `canvas.json` either (call 3: a refused gesture records nothing). X4b proves it (see Proving the checks).
- **X3b** (the redo case) is the plan's REDDENS (a) made concrete, **X4b** covers AC 3's "resize" (only an accepted resize was planned), and **X7** covers page errors on the wide context.

## Issues encountered
- **A package that holds a Mode 2 proposal from before #475 cannot be saved after this lands.** It has no position for the exhibit, so `arrangement`'s `at()` refuses every `saveRun`, and the page would place the exhibit at 0/0 on top of f1. The check found none: no committed package has one (group 36 passes), and the owner's jobs folder has no `_discovery/*/build/` at all (`ls` matched nothing, observed). Any such package would need Task 2.2's regeneration, with `placeExhibit`, before its next save.
- The fixture PNG (`import/fixtures/brilliant-live/export-png.json`) renders as a solid black block. These are the capture's own pixels, not a page defect, but an owner looking at an exhibit built from the fake bridge will see black.
- A fresh worktree needed `npm ci` in four tool dirs before the gates would run (environment, not code).
