# #436 report — the zoom-floor Shift-click row

**Branch** `feat/gate-shift-click-zoom-floor-436`, stacked on #434's `7e29136` (itself on #433).
One file: `tooling/studio-journey.mjs`, five rows in `selectPass` section 6.

## Why a plain click could not see it

Playwright's `click()` moves nothing between down and up, so the slop comparison never runs and a
clean click passes on the un-divided threshold too. The press carries a 2-screen-pixel jitter
(`mouse.move(bx + 2, by + 1)` between down and up): at the 0.1 floor that is 20 stage px — inside
the divided slop of 40, past the un-divided 4.

## Observed (chromium probe on the worktree, port 4813)

| tree | result |
|---|---|
| fixed (`DRAG_SLOP / (canvas.scale \|\| 1)`) | selection `["s3","s4"]` — **adds** |
| mutated (`const slop = DRAG_SLOP`) | **replaced** — the row reads red |

Fixture facts: scale 0.1 exactly; block B's box 22 × 12.4 px at the floor.

## Gates

The three-engine tally is in the stacked run recorded in #434's report (the run tree includes this
row); chromium probe above is this row's own discrimination proof.
