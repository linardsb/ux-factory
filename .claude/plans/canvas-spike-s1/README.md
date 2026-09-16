# S1 — the free-position substrate under load

**Real run, 2026-09-16, 14:45–15:00.** Ticket [#297](https://github.com/linardsb/ux-factory/issues/297) ·
epic [#295](https://github.com/linardsb/ux-factory/issues/295) ·
`docs/epics/canvas-design-import.architecture.md` § Stack (T1, T2, T4, T5, T7) and § Spikes (S1).
Design inherited from `.claude/plans/canvas-spike-s1-substrate-load.md`; executable plan
`.claude/plans/canvas-spike-s1-substrate-load-297.md`.

Every number below is observed — the driver's verbatim stdout is in `raw/`, one file per leg, and each
table cell names its file. Nothing under `system/`, `tooling/`, `agent-layer/` or `handoff/` was added,
edited or deleted; the harness reads those modules over HTTP and nothing else.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Does the free-position DOM stage hold INP ≤ 200 ms and zero dropped frames *during drag*, on all three engines?** | **Yes, in configuration (a) — the bare one, no mitigation.** Worst drag INP **56 ms** against a 200 ms budget (chromium under 4× CPU throttle); worst rAF gap in any drag window **33.3 ms** against the ≤ 50 ms threshold; **zero** frames over 33 ms and **zero** long-animation-frames in every unthrottled drag on every engine. This is the rule's own clause, and it is met. | `raw/all-a.txt`, `raw/chromium-a-throttled.txt` |
| **Does T2 — continuous scale — hold to the same standard?** | **Not under the base-spec proxy.** Fine unthrottled (chromium 2 of 302 frames over 33 ms; webkit 1 of 215, worst gap 43.0 ms). But chromium under CDP 4×: **83 of 241 frames over 33 ms — 34% of the sweep at roughly half frame rate — plus one long-animation-frame.** The inherited ≤ 50 ms threshold is never breached (worst gap 33.5 ms), so this is not a rule failure; it is the rule's clause being drag-scoped while T2's only gesture is the zoom. **Reported as the open edge, not as a pass.** | `raw/chromium-a-throttled.txt`, `raw/all-a.txt` |
| **Does configuration (b) — `content-visibility: auto` + `contain-intrinsic-size` — work on this substrate?** | **No on Chromium 149.0.7827.55; yes on Firefox 151.0 and WebKit 26.5.** Its positive control refused to record a (b) number on Chromium: **0** `contentvisibilityautostatechange` events, **0/30** frames skipped, with the rule verifiably applied. Isolated: on that Chromium **either** translate positioning **or** a scaled ancestor independently defeats the cull — i.e. T4 and T2 each kill it on their own. Firefox and WebKit cull in all four combinations. **This is a claim about these three builds, measured 2026-09-16** — re-test before relying on it later. | `raw/all-b.txt`, `raw/cfg-b-containment-probe.txt` |
| **Does configuration (c) — arrow redraw deferred to one rAF — work?** | **The mechanism engages on all three engines** (200 synthetic pointermoves in one task → 200 redraws under (a), **1** under (c)). Under a *real* scripted gesture it engaged on **WebKit only** (42 → 5); on Chromium and Firefox Playwright cannot deliver pointermoves faster than the frame rate, so there was nothing to coalesce and (c) is identical to (a) by construction. **Not needed** — (a) passed. | `raw/cfg-c-deferral-probe.txt`, `raw/all-c.txt` |
| **Does `scrollend` fire on all three engines?** (T7's adopted platform feature) | **Yes.** 40/40 pans on chromium and firefox, 31/40 on webkit. (c)'s pan half is implementable everywhere. | `raw/all-a.txt` |
| **Stage DOM node count against T1's ceiling signal** | **681 elements** in the document (665 inside the scroller) for 30 frames + 29 arrows. Lighthouse warns above 800, fails above 1,400 — **under the warning, with 119 to spare.** Not a T1 finding. | `raw/all-a.txt` |

**Decision-rule outcome, split — because the rule's budget clause is drag-scoped and one of the three
properties has no drag:**

- **T4 (translate-positioned nodes) and T5 (derived arrow geometry) → branch 1, configuration (a).**
  They are exactly what a drag exercises, and every drag row on every engine — throttled and not — is
  inside both thresholds with room. The swap PR ships them as written, on (a), the branch with less code.
- **T2 (continuous scale) → not cleared to the same standard; the open edge.** Its only gesture is the
  ⌘-wheel sweep, and under the 4× base-spec proxy that sweep spends **34% of its frames over 33 ms**. It
  breaches no inherited threshold, so it does not take branch 2 or 3 — but "holds" is more than the
  evidence supports, and a reader deciding on this number should see it rather than infer it from a
  green row about drags.

**Scope of that sentence.** It licenses **T4 and T5**, bounds **T2**, and covers nothing else. It is not
a claim that the canvas will be fast — see Caveats.

**What this means for the swap PR.** It is not blocked: nothing here reopens T1, and the substrate
choice stands. T2 lands with its zoom cost known rather than assumed.

**And the cost is not where a reader would guess.** Measured, not reasoned: **zero** arrow redraws occur
during a ⌘-wheel zoom (`raw/zoom-cost-probe.txt` — 72 wheel events, 0 redraws), because the handler
`preventDefault`s and only writes `--sx-scale`, and the overlay lives inside the scaled stage so it
rescales for free. **The zoom cost is the browser re-rasterising 30 scaled compositions, nothing else.**
Two consequences the swap PR should carry: the one available cheap mitigation is coalescing the scale
write to one per frame (72 writes were dispatched here — the same pending-flag rAF configuration (c)
proves works on all three engines), and **configuration (c)'s arrow-deferral cannot help the zoom at
all**, because there is nothing there to defer.

**One correction the swap PR must carry:** the architecture names `content-visibility: auto` as T1's
*first mitigation*. On Chromium that mitigation does not exist for this substrate. The reserve is not
there, so (a)'s headroom is the whole of it on the primary engine.

## Setup

- **Harness:** `harness.html` in this directory — a standalone free-position stage, `sx-` prefixed,
  inline `<script type="module">`, no sibling `.mjs`. It links the real three-layer token contract
  (`tokens.contract.css` · `tokens.neutral.css` · `components.css`) and deliberately **not**
  `system/studio.css`, which carries the grid substrate and five-step zoom table this spike replaces —
  loading it would measure the two substrates fighting.
- **The compositions are real.** 30 frames, each an array of 3–4 root nodes drawn deterministically from
  the **20 committed `example` props** in `handoff/verdant/pack.json`, validated and built by the real
  `system/agentic-renderer.mjs` against `handoff/verdant/vocabulary.json`, on a real
  `system/action-bus.mjs` bus. Both artifacts are needed and they are different shapes: `vocabulary.json`
  keys components by name and carries **no** `example` anywhere; `pack.json` is an array of 20, all
  carrying one. A frame is an **array of roots, never a tree** — the vocabulary's `childrenRule` allows
  at most one child and only on four of twenty components.
- **Stage arithmetic** mirrors `system/studio.css:62–91` rather than re-deriving it: an unscaled
  `.sx-sizer` declares the scroll extent, the `.sx-stage` is `position: absolute` inside it with
  `transform: scale(var(--sx-scale))` and `transform-origin: 0 0`. Only the extent's *source* changes —
  a content bounding box over free positions instead of cols × slot. Frames are
  `transform: translate(var(--x), var(--y))` with plain unit-carrying custom properties (not
  `@property`-registered: that would measure a path the swap PR has not decided on).
- **Arrows:** one `<svg>` **inside** the scaled stage, so its coordinates are stage coordinates and scale
  for free; strokes carry `vector-effect="non-scaling-stroke"`. 29 `<path>`s, geometry recomputed from
  the `--x`/`--y` **model** on every `pointermove` — never `getBoundingClientRect()` per arrow per move,
  which would measure the harness's own layout thrash instead of the substrate.
- **Measurement:** `tooling/inp-observer.mjs`'s `OBSERVER_INIT`, `summarize` and `violations`,
  **imported, never re-implemented** (`studio-journey.mjs:6254` states why). Gesture shapes, the
  flush-before-read rule, the idle-baseline → instrumented-window → filter-to-`[t0,t1]` rAF sampler and
  its thresholds (**worst rAF gap ≤ 50 ms, zero LoAF ≥ 50 ms in the window**) are all inherited verbatim
  from `tooling/studio-journey.mjs:6290–6405`, so these numbers are comparable to the grid pass's.
- **Playwright** resolves from `tooling/visual-regression/node_modules` (the CI-pinned copy), not
  `~/node_modules`. Engines: **chromium 149.0.7827.55 · firefox 151.0 · webkit 26.5**. Memory
  `cross-engine-motion-verify` records the `~/node_modules` route from a different context; the VR copy
  supersedes it for this spike, because it is the version CI's `visual` job pins.
- **Server:** `tooling/visual-regression/serve.mjs` on `PORT=4759`, run **from this worktree** (it roots
  at its own `../..`), curl-verified against a file edited here before any leg was trusted — memory
  `stale-serve-wrong-tree`. Killed by port, never by pattern — memory `portal-smoke-port-scoped-kill`.
- **Driver:** `driver.txt` in this directory. It is a complete ES module, parked as `.txt` per the
  ticket; it was authored and run as `driver.mjs` in the session scratchpad. `node driver.txt` cannot
  work — Node refuses a `.txt` module entry — so the `.txt` is a storage decision, not a run path.

## Timings

| step | at | note |
|---|---|---|
| worktree cut from `origin/main` (894feee), plan committed | 14:45:37 → 14:46 | |
| harness written; server up; AC #3 checks green | → 14:49 | |
| **Phase 1** — 2 frames, 1 arrow, 1 drag, chromium: first real number end to end | 14:49 | one pan check red, correctly: 2 frames are smaller than the viewport, so there is no extent to pan |
| **Phase 2** — 30 frames, 29 arrows, chromium cfg=a | 14:50 | 681 nodes; all checks pass |
| apparatus control — 120 ms busy-wait injected into the redraw path | 14:50 | max gap 16.8 → **133.3 ms**, `>33 ms` 0 → **41**, LoAF 0 → **41**. Both named checks red; green without it |
| containment probe v1 | 14:50:12 | **confounded — discarded**, see What was not done |
| **all-a** (3 engines) | 14:50:42 → 14:51:43 | 61 s |
| **chromium-a-throttled** (CDP 4×) | → 14:55:23 | |
| corrected containment probe (3 engines) | → 14:56:12 | |
| eyeball pass, headed chromium | ~14:56 | |
| **all-c**, **chromium-c-throttled**, **all-b** re-run with corrected controls | 14:56:27 → 14:59:21 | 174 s |
| cfg=c deferral mechanism probe (3 engines) | → 15:00:03 | |
| **total elapsed** | **~15 min** | against a half-day box and a two-hour cut rule — nothing was cut for time |

## The numbers

### Configuration (a) — bare. Unthrottled, all three engines. `raw/all-a.txt`

INP budget 200 ms · worst rAF gap threshold 50 ms · LoAF is chromium-only by definition.

| gesture | engine | INP | idle median | frames / window | p50 | p95 | max gap | > 33 ms | LoAF |
|---|---|---|---|---|---|---|---|---|---|
| drag one frame @ 1.0 | chromium | **48.0 ms** | 16.7 | 82 / 1370 ms | 16.7 | 16.8 | **16.8** | 0 | 0 |
| | firefox | **16.0 ms** | 16.7 | 80 / 1336 ms | 16.7 | 18.3 | **18.7** | 0 | n/a |
| | webkit | **16.0 ms** | 17.0 | 45 / 753 ms | 17.0 | 18.0 | **19.0** | 0 | n/a |
| drag one frame @ 0.5 | chromium | **48.0 ms** | 16.7 | 82 / 1370 ms | 16.7 | 16.8 | **16.8** | 0 | 0 |
| | firefox | **16.0 ms** | 16.7 | 99 / 1660 ms | 16.7 | 18.0 | **18.7** | 0 | n/a |
| | webkit | **16.0 ms** | 17.0 | 44 / 745 ms | 17.0 | 18.0 | **23.0** | 0 | n/a |
| marquee-drag ×5 | chromium | **40.0 ms** | 16.7 | 82 / 1367 ms | 16.7 | 16.7 | **16.8** | 0 | 0 |
| | firefox | **24.0 ms** | 16.7 | 81 / 1355 ms | 16.7 | 18.1 | **18.4** | 0 | n/a |
| | webkit | **16.0 ms** | 17.0 | 49 / 821 ms | 17.0 | 19.0 | **21.0** | 0 | n/a |
| ⌘-wheel zoom 0.25↔2 | chromium | *n/a — wheel carries no `interactionId` (Event Timing spec)* | 16.7 | 302 / 5069 ms | 16.7 | 16.8 | **33.4** | 2 | 0 |
| | firefox | *n/a — same* | 16.6 | 215 / 3589 ms | 16.6 | 18.2 | **18.6** | 0 | n/a |
| | webkit | *n/a — same* | 17.0 | 215 / 3586 ms | 17.0 | 18.0 | **43.0** | 1 | n/a |
| pan the full extent | chromium | *n/a — scroll is not an interaction (Event Timing spec)* | 16.7 | 67 / 1116 ms | 16.7 | 16.8 | **16.8** | 0 | 0 |
| | firefox | *n/a — same* | 16.6 | 67 / 1129 ms | 16.8 | 18.5 | **18.7** | 0 | n/a |
| | webkit | *n/a — same* | 17.0 | 68 / 1135 ms | 17.0 | 19.0 | **22.0** | 0 | n/a |

**Every drag row is inside both thresholds on every engine.** The two heaviest cells in the whole table
are zoom sweeps — webkit 43.0 ms and chromium 33.4 ms worst gap — and both are still under 50 ms.

### Configuration (a) under CDP 4× CPU throttle — chromium only. `raw/chromium-a-throttled.txt`

| gesture | INP | idle median | frames / window | p50 | p95 | max gap | > 33 ms | LoAF |
|---|---|---|---|---|---|---|---|---|
| drag one frame @ 1.0 | **56.0 ms** | 16.7 | 82 / 1389 ms | 16.7 | 16.8 | **33.3** | 1 | 0 |
| drag one frame @ 0.5 | **56.0 ms** | 16.7 | 82 / 1392 ms | 16.7 | 16.7 | **33.3** | 1 | 0 |
| marquee-drag ×5 | **56.0 ms** | 16.7 | 82 / 1393 ms | 16.7 | 16.7 | **33.3** | 1 | 0 |
| ⌘-wheel zoom 0.25↔2 | *n/a by spec* | 16.7 | 241 / 5402 ms | 16.7 | 33.4 | **33.5** | **83** | **1** |
| pan the full extent | *n/a by spec* | 16.7 | 66 / 1111 ms | 16.7 | 16.8 | **16.8** | 0 | 0 |

The three drag rows hold: 56 ms INP (28% of budget) and a worst gap of 33.3 ms (67% of threshold), one
frame over 33 ms per drag, zero LoAF.

**The one row that is genuinely heavy is the throttled zoom sweep, and it is the basis of T2's split
verdict:** 83 of 241 frames over 33 ms — **34% of the sweep at roughly half frame rate** — plus one
long-animation-frame. The worst gap never exceeded 33.5 ms, so the inherited ≤ 50 ms threshold is not
breached and this is not a rule failure. But the rule's budget clause is drag-scoped, and **the zoom
sweep is the only gesture that exercises T2 at all**, so a drag-shaped pass says nothing about it. This
is the row the verdict's second half is built on.

**What is costing.** Not the arrows: measured at **0 redraws across 72 wheel events**
(`raw/zoom-cost-probe.txt`). The ⌘-wheel handler `preventDefault`s and writes only `--sx-scale`, and the
overlay is inside the scaled stage so it rescales for free. The cost is **re-rasterising 30 scaled
compositions, once per wheel event**. Configuration (c) cannot touch this.

### Configuration (b) — `content-visibility: auto` + `contain-intrinsic-size`

**Its positive control blocked the (b) number on Chromium and the number is not recorded.** `raw/all-b.txt`:

| engine | computed rule | state-change events | currently skipped | verdict |
|---|---|---|---|---|
| chromium | `auto`, `auto 220px auto 298px` | **0** | **0/30** | **NO CULL** |
| firefox | `auto`, `auto 220px auto 298px` | 16 | 10/30 | culls |
| webkit | `auto`, `auto 220px auto 298px` | 16 | 10/30 | culls |

Isolated on a minimal page that varies only how a frame is placed — `raw/cfg-b-containment-probe.txt`,
source beside it:

| case | chromium | firefox | webkit |
|---|---|---|---|
| layout-positioned (`top`/`left`), scale 1 | **CULLS** (30 events) | CULLS | CULLS |
| **translate-positioned (T4's shape), scale 1** | **NO CULL** (0 events) | CULLS | CULLS |
| layout-positioned, **scale 0.5** | **NO CULL** (0 events) | CULLS | CULLS |
| translate-positioned, scale 0.5 | **NO CULL** (0 events) | CULLS | CULLS |

So on **chromium 149.0.7827.55, measured 2026-09-16**, **T4 and T2 each independently defeat `content-visibility: auto`**: a frame placed by
`transform: translate` is never culled even at scale 1, and a frame inside a scaled stage is never culled
even when placed by `top`/`left`. The two together are the substrate the swap PR proposes.

### Configuration (c) — arrow redraw deferred to one rAF per tick

Two regimes, because the standard gesture cannot exercise the deferral at all. `raw/all-c.txt`,
`raw/cfg-c-deferral-probe.txt`:

| regime | chromium | firefox | webkit |
|---|---|---|---|
| standard 40 × 15 ms drag (a) vs (c) redraws | 42 vs 42 — **no-op** | 42 vs 42 — **no-op** | 42 vs 42 — **no-op** |
| fast drag, no inter-move wait | 42 vs 42 — no-op | 42 vs 42 — no-op | 42 vs **5** — **engaged** |
| 200 synthetic moves in one task *(mechanism only)* | 200 vs **1** — **engaged** | 200 vs **1** — **engaged** | 200 vs **1** — **engaged** |

The no-ops are a finding about *when the mitigation pays*, not a bug: at one `pointermove` per animation
frame a rAF coalescer has nothing to coalesce, so (c) **is** (a). Deferral pays only when moves arrive
faster than frames — a high-frequency pointer, coalesced events, or a slow frame. The mechanism itself is
proven live on all three engines by the synthetic burst.

### Stage size against T1's ceiling signal

**681 elements in the document**, 665 of them inside the scroller, for 30 frames (3–4 real parts each)
and 29 arrows — about 21 elements per frame, measured. Lighthouse's DOM-size audit **warns above 800**
and **fails above 1,400**: this sits **under the warning with 119 to spare**, so it is *not* a T1 finding.
The planning estimate was ~755; the real templates came in lighter.

It is still thin. 119 nodes is about **5.6 more frames** at this composition size, or one extra part on
each of the 30. A real flow at 40+ frames crosses the warning.

## Caveats and bounds

1. **This Mac is not base-spec.** Every unthrottled number is a fast-machine number.
2. **The CDP 4× CPU throttle is a proxy for a base-spec laptop, and it is chromium-only by definition.**
   It is not a measurement of any real machine.
3. **Firefox and WebKit ran unthrottled, by necessity — there is no CDP for them.** Their numbers are the
   **engine-difference signal, never the hardware signal.** Do not compare a throttled chromium number to
   an unthrottled WebKit one and call it an engine finding.
4. **LoAF (`long-animation-frame`) is chromium-only by definition.** On Firefox and WebKit the rAF-gap
   sampler is the whole frame story; those cells read `n/a`, never `0`.
5. **INP is blind to two of the five gestures, by spec.** Wheel and scroll carry `interactionId: 0`, and
   `inp-observer.mjs:38` drops every falsy id. Those cells read `n/a by spec`; none reads `0 ms`.
6. **INP did not measure the per-move arrow redraw — which is exactly what T5 is.** `pointermove` also
   carries `interactionId: 0`, so an INP row brackets the pointerdown→pointerup envelope and reaches the
   redraw cost only indirectly, through a delayed pointerup. **The rAF-gap sampler is the only evidence
   for T5 in this run,** and the verdict rests on it, not on the green INP rows. The same holds harder
   for **T2**: its only gesture is the wheel sweep, which carries no INP row at all, so every T2 claim
   here is a rAF-gap claim — which is why T2's verdict is split out rather than folded into the drags'.
7. **An interaction faster than 16 ms yields no entry** (`durationThreshold` floors there). That reads as
   a pass *only* because the forced-slow calibration click proved the observer alive on each engine first.
8. **The harness is cheaper than the substrate it stands for.** This is the bound most likely to survive
   a green run. The real stage has, and this harness has **none of**:
   - the selection model (#217) — including marquee *semantics*; here five frames moving together is
     just a heavier drag
   - alignment guides
   - live-region announcements
   - the undo/redo stack
   - keyboard verbs and focus management
   - the minimap, with its live viewport rect
   - the layers list
   - auto-arrange / rank layout (T5's other half)
   - arrow *binding* rules (Excalidraw's shape) — arrows here are geometry under load, nothing more
   - device frames as real iframes (`studio-frames.mjs`), which the grid stage carries today

   Several of those do work on `pointermove`. A green S1 licenses "**the three new properties hold**",
   never "the canvas will be fast". The swap PR can only inherit this verdict by making the argument
   `studio-journey.mjs:6051–6055` makes for #217's verbs against spike 2 — that each added operation is
   strictly lighter than what was measured — and that argument needs this list to be made against.
9. **The measured drag is a 40-step, ~800 ms, one-move-per-frame gesture.** A real pointer with coalesced
   events delivers more moves per frame; that regime was only reachable synthetically here (see (c)).
10. **Arrow geometry was measured in its cheaper shape.** The overlay sits inside the scaled stage, so it
    scales for free. A screen-coordinate overlay outside the stage needs per-scale geometry maths and is
    strictly more work per frame; it was not measured.
11. **One 404 appears in a headed browser:** `/favicon.ico`, requested automatically by the browser and
    absent from the server root. Nothing the harness loads. Headless legs are clean — every leg asserts
    zero page errors while 30 real compositions render.

## What was and was not done

**Done.** All five gestures, three configurations, three engines, plus the chromium 4× throttled leg.
Both configuration controls run — and **both fired**, each refusing to record its own number until the
cause was found. All three apparatus controls run:

| control | mutation | what went red | positive control |
|---|---|---|---|
| observer alive | (asserted every leg) | — | forced-slow calibration click yields a grouped non-zero-`interactionId` entry on all three engines, every leg |
| rAF sampler can see a bad frame | 120 ms busy-wait injected into the arrow-redraw path | worst gap 16.8 → **133.3 ms**; `>33 ms` 0 → **41**; LoAF 0 → **41** | same run without the mutation: max 16.8 ms, `>33 ms` 0, LoAF 0 |
| comparator can flag | (self-test, copied from `studio-journey.mjs:6299`) | — | `violations(summarize([{interactionId:1,duration:250}]), 200).length === 1` — asserted at the end of every leg |
| drag genuinely moved | — | — | scale-aware: observed stage delta checked against `pointerDelta / --sx-scale` within 5 px, so a handler that forgot to divide would fail at `?scale=0.5` |

The eyeball pass was done in a **headed** chromium, not only headless (memory
`vr-gate-single-engine-blindspot`): 30 token-skinned frames render, arrows follow a drag (path `d`
observed to change), ⌘-wheel scales the stage continuously to ~0.44 with strokes staying 1.5 px.

**Not done.**

- **A base-spec machine.** Owner's hardware; not a tracker item.
- **A real-gesture (c) number on chromium and firefox.** Playwright's `mouse.move` round-trips per call,
  so it cannot deliver sub-frame move rates on those two; the 4× throttle does not change this (it slows
  script, not the compositor's cadence). The mechanism is proven synthetically on all three; a real-pointer
  (c) measurement is not available from this harness. Moot for the verdict — (a) passed.
- **The screen-coordinate arrow overlay** (caveat 10) — the more expensive shape was not measured.
- **Configuration (b)'s *numbers* on Chromium.** Its control blocked them, correctly. (b) on Firefox and
  WebKit was proven in effect but its gesture numbers were not separately tabulated, because (a) already
  passed on both and (b) is the branch with more code.
- **A confounded probe was discarded, not published.** The first containment probe placed its absolute
  rows with `left:0` and **no `top`**, so all 40 stacked at the same on-screen position and "NO CULL" was
  trivially true on every engine — it would have supported a cross-engine claim that is **false**
  (Firefox and WebKit do cull). The harness contradicted it, which is what exposed it. The corrected
  probe is `raw/cfg-b-containment-probe.txt`; the confounded one is not in `raw/`.
- **Two observables the plan named for (b) proved unreliable and were replaced.** On a page where the
  cull is *proven* working, a skipped element still returned
  `checkVisibility({contentVisibilityAuto: true}) === true` on all three engines, and
  `getBoundingClientRect().height` equals the natural height whenever the declared intrinsic size is
  close to it. A control read through either would have reported "no cull" on a page that culls. The
  observable used is `contentvisibilityautostatechange`, the spec's own signal.
- **Nothing was cut for time.** The two-hour cut rule was not reached: total elapsed ~15 minutes.

## Files

| file | what |
|---|---|
| `harness.html` | the throwaway free-position stage (tracked; inline module, no sibling `.mjs`) |
| `driver.txt` | the Playwright driver, parked as `.txt` per the ticket; run as `.mjs` from the scratchpad |
| `raw/all-a.txt` | cfg=a, three engines, unthrottled — **all checks pass** |
| `raw/chromium-a-throttled.txt` | cfg=a, chromium, CDP 4× CPU throttle — **all checks pass** |
| `raw/all-b.txt` | cfg=b, three engines — 1 check failed: chromium's cull control |
| `raw/all-c.txt` | cfg=c, three engines, both move regimes — 3 checks failed: the deferral control on chromium/firefox, and on webkit's standard regime |
| `raw/chromium-c-throttled.txt` | cfg=c, chromium, 4× throttle |
| `raw/cfg-b-containment-probe.txt` + `.source.txt` | the corrected placement × scale containment matrix |
| `raw/cfg-c-deferral-probe.txt` + `.source.txt` | the synthetic-burst coalescer mechanism check |
| `raw/zoom-cost-probe.txt` + `.source.txt` | what costs during a ⌘-wheel zoom — 72 wheel events, 0 arrow redraws |
