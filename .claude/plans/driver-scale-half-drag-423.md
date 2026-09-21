# #423 — S1's three assertion gaps, closed in the harness #302 built

`driver.txt` stays parked (its stdout is in `raw/`); the home is `tooling/studio-journey.mjs`.

- **G1 (marquee: every picked frame moved)** — already closed: `#217/AC2 · dragging ONE selected
  member lands EVERY member at the SAME offset` asserts a non-zero delta equal across all members,
  which is the predicate S1's `--x > 0` could not express. Cited, not re-added.
- **G2 (@0.5 drag: INP and zero-LoAF asserted)** — a second throttled-drag block in `perfPass` at
  half scale: the scale READ off the page after the zoom verb, the INP observer on the context, the
  same 40-step drag, and five rows — movement as the pointer delta ÷ scale, ≥ 20 frames, worst gap
  ≤ 50 ms, zero LoAF, INP ≤ 200.
- **G3 (frame-count floor on every gesture block)** — the one existing frame-reading block already
  carries `gaps.length >= 20`; the new block carries it too. There is no other block reading gaps.
→ verify: chromium probe on the worktree; the three-engine run on the stacked tip.
