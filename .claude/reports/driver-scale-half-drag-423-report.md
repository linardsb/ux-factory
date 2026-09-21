# #423 report — the half-scale drag block

**Branch** `feat/driver-scale-half-drag-423`, stacked on #436's `747a75d` (→ #434 → #433). One
file: `tooling/studio-journey.mjs`, six rows in `perfPass`'s chromium-only branch.

## Observed (chromium probe, worktree on port 4813, 4× CPU throttle)

```
@0.512 · 84 frames over 1400 ms · max 16.8 · LoAF 0 · INP 32
```

| row | value |
|---|---|
| scale read after the zoom verb | 0.512 (ZOOM_STEP does not land on 0.5; the block divides by what it read) |
| movement | `--y` 0 → 190.1, wanted the pointer delta ÷ scale ± 8 |
| frames in window | 84 (floor 20) |
| worst rAF gap | 16.8 ms (≤ 50) |
| LoAF in window | 0 |
| INP | 32 ms (≤ 200) |

One correction while writing it: the first movement row expected `+pitch` (156) and read 190 — the
drag starts at the grab handle, not the block's centre, so the extra 34 stage px is the
handle-to-centre offset. The row now expects the actual pointer delta ÷ scale, which is the
scale-aware claim G2 asked for.

## G1 and G3

G1 is `#217/AC2`'s same-delta-over-every-member row (selectPass) — a stronger predicate than the
spike's, already on three engines. G3: the only other block that reads frame gaps already carries
the ≥ 20 floor; this block carries it as its second row.

## Gates

The three-engine tally is the stacked run in #434's report; the probe above is this block's own
evidence on the engine it runs on (chromium — CDP throttling and LoAF are chromium-only, as the
@1.0 block states).
