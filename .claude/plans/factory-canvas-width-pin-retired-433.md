# Fix: /factory's canvas blows out of its grid cell — the width pin retired (#433)

## Problem Statement

`/factory`'s canvas scroller is four times wider than the column it sits in, and the overflow is
clipped by the body rather than scrolled. Measured in Chromium at a 1440 viewport after
`[data-replay="settled"]`:

```
div.stx-scroll      w=3172  min-width=auto  width=3171.81px  overflow-x=auto
div.stx-viewport    w=3172  min-width=auto  width=3171.81px  overflow-x=visible
div.stu-canvas-col  w=776   min-width=0px   width=776px
...
body                w=1440                                   overflow-x=clip
```

Two consequences: `scrollWidth === clientWidth` (3170 = 3170), so **there is no horizontal pan at
any zoom**, and roughly **2,400px of canvas is painted outside the page** and silently clipped.
Identical at the pixel gate's 1280. Pre-existing — measured on PR #432's base tree at 2818 against
the same 776.

No gate sees it: `body { overflow-x: clip }` keeps the blowout outside the captured frame,
`build-checks` is DOM-free, and every pan assertion in `tooling/studio-journey.mjs` exercises the
**Y** axis, which has a real 594px range.

## The cause, measured rather than assumed

**The ticket's hypothesis is wrong.** `#433` proposes `min-width: 0` on `.stx-viewport` and
`.stx-scroll` — PR #54's rule. The automatic minimum never binds here: `.stx-scroll` is
`overflow: auto`, whose min-content contribution is 0, so the flex column above it has no wide
min-content to push through a track that already carries `min-width: 0` (`.stu-canvas-col` really is
776px, which the measurement above confirms).

The cause is **`system/studio.css`'s `.stu-shell .stx-viewport { width: max-content; }`**, added at
#214. That ticket gave the column an explicit `minmax(0, 1fr)` track and pinned the viewport at
max-content so the canvas's geometry would not move — which reproduced the geometry *and its
defect*. An explicitly max-content grid item overflows its area instead of scrolling inside it.

**Measured, three engines, 1440 and 1280:**

| patch | `.stx-viewport` | `.stx-scroll` xRange |
|---|---|---|
| none (baseline) | 3172 (ff 3174, wk 3172) | 0 |
| A — `width: auto` | 776 | 2042 |
| B — A + `min-width: 0` on `.stx-viewport` | 776 | 2042 |
| C — B + `min-width: 0` on `.stx-scroll` | 776 | 2042 |

A, B and C are byte-identical. **The fix is the deletion alone**; no `min-width: 0` is added,
because a declaration that changes nothing while carrying a comment that names a cause is worse
than no declaration.

## Tasks

1. **Delete the pin** (`system/studio.css`) → verify: the probe reports `.stx-scroll` 776 and
   xRange 2042 on chromium, firefox and webkit at 1440 and 1280, and `document.scrollWidth ===
   clientWidth` (no new body overflow).
2. **Correct every comment that recorded the blowout as live.** Found by sweep, not by memory:
   `studio.css` ×4 (the `.stu-canvas-col` track note, `.stu-inspector`'s #218 pointer fix,
   `.stu-compile-step`'s ch-cap note, `.stu-replay`'s placement note), `studio-minimap.mjs` ×4
   (header call 5, the resize listener, `visibleWidth`, `jumpMetrics`), `studio-journey.mjs` ×4.
   Committed plans and reports are historical records and are **not** rewritten.
3. **Keep two things that the fix makes redundant, and say why in place.**
   `.stu-inspector { position: relative; z-index: 1 }` stays — removing a stacking context is an
   unrequested paint change on a captured surface. The minimap's two-width split
   (`visibleWidth()` vs `clientWidth`) stays — the two questions are still different ones; they
   merely now answer the same number.
4. **Add the X half of the ⌘-wheel anchor check and delete its note** (the ticket's explicit ask).
   The note claimed the X axis was unassertable; that measurement was `/factory`'s, transplanted
   onto a row that runs on `studio.html`, which has no `.stu-shell`, never carried the pin, and has
   had a ~1650px horizontal range all along. Pan both axes, assert both caps, assert the stage point
   under the cursor on both axes. → verify: the row fails if either cap is < 100.
5. **Rewrite the two minimap rows the fix turns red.**
   `scrollW <= realClientW` inverts into a positive control (plus a new row asserting the two widths
   coincide). `ArrowRight` was the blocked-press case for free; it now pans, so it becomes the
   horizontal mirror of the ArrowDown row and the blocked press is **made** by parking at the right
   edge. → verify: `studio-journey.mjs all` green.
6. **Regenerate what moves.** `factory-{neutral,saulera,verdant}` pixel baselines — the at-rest
   layout changes. `rm` each PNG before `update:docker`, because a sub-perceptual change is
   silently kept. **The `approach` baselines are checked and do NOT move:** `studio.css` and
   `studio-minimap.mjs` are in `gen-loc-summary`'s `runtime` group, but the net delta is +10 lines
   and `linesApprox` is rounded to the nearest 100, so `loc-summary.json` is byte-identical
   (`gen-loc-summary.mjs --check` after staging, which is the only reading that counts — it reads
   tracked content). That retires the cascade for this PR rather than assuming it away.

7. **Fix the one fixture the change breaks, and say which it is.** `minimapPass`'s drag-pan point
   was derived from the first node's rect. The narrower column makes the eight align/distribute
   buttons WRAP (the row goes 44px → 92px, the canvas viewport 874 → 1082), so Playwright scrolls
   the page to reach the Zoom out button in section 1 and the scroller lands with its top at
   y ≈ 939 in a 1000px window — the derived point lands at y = 1144, outside the window, and the
   press goes nowhere. Re-centre the scroller and SCAN for an empty point clamped to the window,
   which is `journey()`'s own rule. → verify: the row is red before the change and green after, on
   all three engines.

8. **Do not ship a Safari regression.** The fix clips the fieldwork device frame to 302 of its
   692px, and webkit then never requests `/proto/fieldwork.html` at all — `about:blank`, not revived
   by panning, measured against the pinned tree where it loads and against chromium and firefox
   which load it either way. Remove `loading="lazy"` from `system/studio-frames.mjs` and correct
   `visual.spec.mjs`'s note, which cited it. → verify: webkit requests the page; the pixel gate
   still passes against the committed baselines.

## Gates

`node tooling/build-checks.mjs` · `node tooling/token-lint.mjs` · `git add` then
`node tooling/drift-check.mjs` · portal boot answering `/api/health` ·
`node tooling/studio-journey.mjs all` against `tooling/visual-regression/serve.mjs`, on a quiet
machine (under load the replay-settle wait times out at ~14.6s against a 30s budget and the run
dies on infrastructure rather than an assertion).

## Out of scope

Narrowing or re-proportioning the canvas column, moving `.stu-replay` into the viewport, and
converting selectPass's far-edge menu row to a pointer path now that the far edge is reachable.
Each is an at-rest change to a captured surface with no behaviour to gain here.
