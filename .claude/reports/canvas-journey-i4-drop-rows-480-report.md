# Implementation Report — canvas-journey I4/I9 assert the drop rows, not a net count (#480)

**Plan**: none (a stale assertion, found by #474's journey run; diagnosis in #480)   **Branch**: `fix/canvas-journey-i4`
**Base**: `1b43cee` → `1b43cee`   **Status**: COMPLETE

## Summary
Since #477 (1b43cee), build() records the children a refused parent had built. The node I4 drops was therefore
already on the drop list, and the owner's drop REPLACES its row: the count holds at 11 → 11. I4 asserted +1 and has
been red on main on all three engines since. I4 and I9 now assert the rows: the owner's row appears, build()'s row for
that node goes, and the total rises by one only when there was no row to replace. No import behaviour changed.

## Tasks completed
- `tooling/canvas-journey.mjs` (UPDATE): I4's count assertion → the row swap (65ec384, a subagent); `dropOnePart`
  (I9, and L3 on the live leg) → the same rule.

## Proving the checks
| Mutation (reverted) | Red observed (chromium) |
|---|---|
| editMapping does not write the drop | I4 ×3 and I9 red (subagent) |
| applyMapping ignores `drop` (the node is still built, the owner's row still filed) | `✗ I4 · the view swaps build()'s child-loss row … 11 → 12` — the old +1 assertion PASSED on this bug. I9 does not red: its node is emitted either way, so the drop list cannot show it (the Mapped pane would) |
| edit() does not re-render the view | `✗ I4 · the view swaps…`, `✗ I4 · remap to stack + rename…`, `✗ I9 · dropping a part … drops 5 → 5` |

## Validation results
- `node tooling/canvas-journey.mjs all` → chromium 95/0, firefox 94/0, webkit 94/0 (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass`; `node tooling/drift-check.mjs` → ✓ (observed).

## Not run
- L3 (`--live-brilliant`, owner-run, needs a paired tab) uses the converted `dropOnePart`; not run.

## Deviations from the plan
None (no plan).

## Additions beyond the plan
- I9 converted beside I4 (#480 names both).

## Issues encountered
None.
