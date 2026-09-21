# #436 — gate: a Shift-click at the zoom floor still ADDS to the selection

Deferred from PR #432's round-2 review (F4). `DRAG_SLOP` is unexported and DOM-only, so build-checks
cannot reach it; the running-page gate had no row. One section (6) at the end of `selectPass`.

1. Zoom to the floor (`toFloor` clicks, asserted at `SCALE_MIN`), Shift-click block A, then press
   block B with Shift held and a 2×1 screen-pixel jitter between down and up — 20 stage px at 0.1,
   inside the divided slop (40) and past the un-divided one (4). Assert the selection is {A, B}.
   → verify: chromium probe green; mutate `/ (canvas.scale || 1)` away → the row reads "replaced".
2. Three-engine run, because the row total moves by five per engine.
