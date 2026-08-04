# Implementation Report — Studio 2: canvas stage (#204)

**Plan**: `.claude/plans/studio-canvas-stage-204.md`
**Branch**: `feature/studio-canvas-stage-204` (off `origin/main` @ `6320349`)
**Status**: COMPLETE

## Summary

The prototype studio's canvas substrate: `system/studio-canvas.mjs` (a DOM stage that pans on a native
scroller, zooms through a fixed level table selected by a `data-zoom` attribute, and holds real
token-skinned components in grid slots addressed by `data-col`/`data-row`) plus `system/studio.css`,
driven raw by the off-nav harness `studio.html`. Nothing shipped mounts it — `/factory` becoming the
studio is #206. Two new gates pin it: `build-checks` group 12 (the CSS mirror, `clampSlot`, `fitLevel`)
and the operator-run `tooling/studio-journey.mjs`, plus a zero-transition case in `vt-verify`.

Spike 2 ran cross-engine. **Verdict: the DOM stage HOLDS** — no dropped frame on any engine, max
interaction 32 ms against a 200 ms budget. The plan's frame criterion had to be restated to mean
something; see the spike section, which is the part #205 and #217 consume.

## Tasks completed

- 1 · spike 2, drag responsiveness in a scaled stage → scratchpad `studio-drag-spike.mjs` (THROWAWAY, never `git add`ed)
- 2–3 · the canvas engine, pure layer + mount → `system/studio-canvas.mjs` (CREATE)
- 4 · the surface stylesheet → `system/studio.css` (CREATE)
- 5 · the off-nav raw harness → `studio.html` (CREATE)
- 6 · group 7 gains the module, no exception argued → `tooling/build-checks.mjs` (UPDATE)
- 7 · `build-checks` group 12, the canvas group → `tooling/build-checks.mjs` (UPDATE)
- 8 · the zero-view-transition case, with the movement precondition → `tooling/vt-verify.mjs` (UPDATE)
- 9 · the cross-engine functional driver → `tooling/studio-journey.mjs` (CREATE)
- 10 · surface-sheet registration → `tooling/token-lint.mjs` (UPDATE)
- 11 · the generated cascade → `system/loc-summary.json` + approach's two baselines (REGENERATED)

## Spike 2 — the verdict #205 and #217 inherit

**Setup.** Driven against the REAL `/studio.html` (see Deviations), 31 real token-skinned components,
the stage zoomed to **200%** so the drag genuinely happens inside a scaled stage. The throwaway drag
is deliberately pessimistic — it rewrites **every** slot's `data-col`/`data-row` on every
`pointermove` and forces a synchronous layout read in the handler, which is worse than #205's real
work (one node moves) and roughly #217's (guides recompute against all peers). 121-step drag
(out-and-back), `PerformanceObserver` on `event` (all three engines) and `long-animation-frame`
(chromium only — the only engine that supports it).

**Throttling is chromium-only, and this is a split not an implication** (plan A3):
`Emulation.setCPUThrottlingRate` needs `context.newCDPSession(page)`, which firefox and webkit do not
provide. Chromium ran at **4× CPU throttle**; firefox and webkit ran **unthrottled**.

| engine | throttle | frames | max frame | **dropped (>33.4 ms)** | max `event` | p95 frame |
|---|---|---|---|---|---|---|
| chromium | 4× CPU | 143 | 16.8 ms | **0%** | **32 ms** | 16.8 ms |
| firefox | none | 140 | 17.6 ms | **0%** | **16 ms** | 17.5 ms |
| webkit | none | 35 | 18.0 ms | **0%** | **16 ms** | 18.0 ms |

**The plan's frame criterion does not measure what it says, and a control run proves it.** The rule
named "fewer than 5% of frames over 16.7 ms". Measured that way the run reports 40.6% / 50% / 60% and
would read as DROPS. So the same drive was repeated with **the drag handler not installed at all** —
an idle canvas, doing nothing:

| engine | long-frames (>16.7 ms), with drag | …with **no drag handler at all** |
|---|---|---|
| chromium | 40.6% | **41.8%** |
| firefox | 50% | **48.2%** |
| webkit | 60% | **58.3%** |

An idle page scores the same as a loaded one, because a nominal 60 Hz frame is 16.67 ms and rAF
timestamps jitter either side of it. At 16.7 ms the criterion measures vsync noise and cannot
distinguish our work from nothing at all — this repo's own check-that-cannot-fail shape, arriving in
a threshold rather than in a check. Restated at **33.4 ms** (two vsync intervals — the definition of a
genuinely dropped frame), the answer is unambiguous: **zero dropped frames on any engine, in either
condition.** Max frame anywhere was 18.0 ms.

**The one measurable effect in the whole dataset, and the sentence #205 and #217 should inherit:**
under 4× CPU throttle the pessimistic all-slots rewrite took the worst interaction from **16 ms
(control) to 32 ms** — it doubles the worst interaction and still lands **6× inside** the 200 ms
budget. Everything else was indistinguishable from an idle page.

**VERDICT: HOLDS.** Decision-rule branch taken: **"DOM stage confirmed, proceed."** The mitigations the
failure branch would have added (`content-visibility: auto` on off-screen slots, deferred line
redraws) are **not** in the module, and #205/#217 should not add them speculatively.

**Caveats stated rather than implied.** (a) Firefox and webkit are unthrottled, so their numbers are
a per-engine layout/compositing sanity check, not a base-spec-hardware claim; the base-spec claim
rests on throttled chromium alone. (b) Headless webkit recorded only ~35 frames to the others' ~140
over the same drive — it coalesces rAF, so its frame sample is thin and its `event` figure carries
more of the weight there. (c) The 200 ms interaction budget was met with 6× headroom on the worst
engine.

## Tests added

No test framework (repo has none by rule). What was added:

- **`tooling/build-checks.mjs` group 12 — CI-run, pure, no browser.** The `studio.css` ↔
  `studio-canvas.mjs` mirror pinned exhaustively and in both directions (every index in `1..MAX`
  present exactly once, none out of range, one `[data-zoom]` rule per `ZOOM_LEVELS` entry declaring
  that entry's scale and no extras); every regex asserted to have matched something first, so a
  mirror check that finds no rules cannot pass vacuously. `clampSlot` over 8 hostile slots
  (`0`, `MAX+5`, `-3`, `2.7`, `"4"`, `NaN`, `Infinity`, absent) and `fitLevel` over exact / between
  (snaps down) / below / above / four zero-or-non-finite dimensions. Plus the deliberately vacuous
  #208 cap tripwire, stated as such.
- **`tooling/studio-journey.mjs` — operator-run, cross-engine (26 assertions × 3 engines).** At rest;
  the four zoom verbs incl. disabled ends and the readout tracking `ZOOM_LEVELS`; **fit asserted as
  "the next level up does not fit"** (the only check that catches `--stx-slot-w`/`--stx-slot-h`
  drifting from what `fitLevel` assumes — group 12 cannot mirror those, because whether a level fits
  is a layout fact). The harness's real 12 × 220px grid is far wider than the scroller, so that check
  alone only exercises fit's FLOOR branch — catching a slot size that grew but not one that shrank —
  so a second fit runs against a driver-injected smaller slot size, where fit lands **above** the
  floor and both directions of drift are covered. Then the **bare-wheel rule** (a plain wheel scrolls and never zooms, ⌘/Ctrl-wheel
  does); pointer pan leaving no `is-panning` behind; **no `style` attribute on the stage, scroller or
  any slot read off the RUNNING page**; Tab reaching column 12 and the browser scrolling it into
  view; `place()` + clamping through the exported `getCanvas()` seam with the live-region
  announcement; reduced motion.
- **`tooling/vt-verify.mjs` — the canvas names nothing.** Boot opens zero; then a zoom **and** a
  placement are performed and **proved to have changed the surface** (`data-zoom`, `data-col` and the
  measured box all differ) *before* asserting zero `startViewTransition` calls and zero running
  `::view-transition-*` pseudos. Without the precondition that assertion cannot fail.

## Validation results

| gate | result |
|---|---|
| `node --check` + `node -e "import(...)"` on the module | pass — Node-import safe, no self-boot |
| `grep -nE '\.setProperty\(\|\.style\.[A-Za-z]'` on the module | **no matches** |
| `grep -n 'view-transition'` on module + stylesheet | **no matches** |
| `node tooling/build-checks.mjs` | **✓ all 12 groups pass** |
| `node tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-system-graph.mjs --check` | ✓ 64 tokens · 32 consumers · 388 edges — **no drift** |
| `node tooling/drift-check.mjs` | ✓ all 12 artifacts, no drift |
| `node tooling/studio-journey.mjs all` | **✓ 26/26 on chromium, firefox and webkit (78 assertions)** |
| `node tooling/vt-verify.mjs all` | ✓ all engines, existing scenarios included; `startViewTransition` supported on all three, so no engine was skipped |

### Level 5 — mutation validation (the checks can fail)

| mutation | result |
|---|---|
| add `stage.style.transform = "scale(2)"` to `studio-canvas.mjs` | group 7 **RED** — `system/studio-canvas.mjs writes an inline style` |
| `[data-zoom="3"]` scale `1.5` → `1.6` in `studio.css` | group 12 **RED** — `sets --stx-scale: 1.6 … but ZOOM_LEVELS[3] is 1.5` |
| delete the `[data-col="7"]` rule | group 12 **RED** — `declares 0 .stx-slot[data-col="7"] rules; every index in 1..12 needs exactly one` |

All three reverted; `build-checks` green afterwards.

### Cascade

`system/loc-summary.json`: runtime 64 → **66** files, 20,400 → **20,900** lines; pages 16 → **17**;
total 100 → **103** files, 28,300 → **28,800** lines. approach.html renders the runtime group's
numbers, so `approach-neutral` and `approach-saulera` were regenerated. `system-graph.json`,
`inspect-data.json` and `param-count.json` all confirmed unmoved.

## Deviations from the plan

1. **The spike drives the real harness, not a duplicate one (Task 1).** The plan specified a
   throwaway `studio-drag-spike.html` composing ~30 components in a scaled stage — which is exactly
   what `studio.html` is. Building a second copy would have measured the copy. Tasks 2–5 were built
   first and the spike drives `/studio.html`; what stayed throwaway is the crude drag, injected via
   `page.evaluate` and living only in the scratchpad. This makes the spike a measurement of the
   shipped substrate rather than of a stand-in. The failure branch's remedy would have been a
   `studio.css` addition, so nothing was foreclosed by the reordering.
2. **The spike's frame criterion was restated from 16.7 ms to 33.4 ms, with the control run that
   justifies it reported above.** Not a moved goalpost: both numbers are in the report, the literal
   rule's verdict is stated, and the control run is the evidence that the literal rule cannot
   distinguish a loaded canvas from an idle one.
3. **`studio.css` diverges from the plan's sketch in three load-bearing ways**, each caught before it
   could fail cross-engine:
   - the sizer's `calc()` includes the **grid gap** (`cols*slot + (cols-1)*gap`). The plan's version
     omitted it and fell ~176 px short at 12 columns, which would have made the far column partly
     unreachable by scrolling — silently breaking the Tab-scrolls-into-view claim the whole
     pan-by-scroll decision exists for.
   - the stage is **out of flow** (`position: absolute` in a `position: relative` sizer). At scale
     < 1 the stage's still-unscaled layout box would otherwise contribute phantom scroll range.
   - `overscroll-behavior: contain` was **dropped**. It blocks chaining to the page at the scroller's
     edges, which contradicts the inherited `system-graph.mjs` rationale and the harness's own "a
     bare wheel scrolls the page" caption. Claim accuracy, not a gate.
4. **`fit()` measures `offsetWidth`/`offsetHeight`, not a bounding rect** — a rect reports the
   post-transform box, so at any level ≠ 1 fit would compute against its own last answer.
5. **`fit()`'s announcement says "fit to the canvas", not "whole canvas in view."** Below the smallest
   level nothing fits and `fitLevel` floors at index 0 — the discrete table cannot always keep the
   stronger sentence, so it does not make it. `studio-journey` asserts the honest version ("a fitting
   level, or the floor" + "the next level up does not fit").
6. **The `vt-verify` case is its own block, not a `SITEWIDE` row.** That table hardcodes
   `acted.calls === 1`; the canvas's claim is the opposite number. It reuses the table's structure —
   prove the movement, then assert.
7. **A3 confirmed as written**: CDP throttling is chromium-only, so AC1 is satisfied as a stated split
   (throttled chromium + unthrottled firefox/webkit), never as three throttled runs.
8. **A5 confirmed on this tree, not inherited from the plan**: `studio` and `agentic` are both absent
   from `system/client.neutral.config.js`'s footer index, `system/palette.mjs` and
   `tooling/visual-regression/visual.spec.mjs` — the harness joins none of the three.
9. **A1 and A2 taken as planned**: the stage CSS is in `system/studio.css`, verified by
   `gen-system-graph --check` staying clean; no `param-manifest.json` entry, since the manifest scopes
   itself to the 10 VR-gated shipped pages and this is a raw harness. **The reviewer should not
   re-derive either — both are argued in the plan's ASSUMPTIONS.**

## Issues encountered

- The vocabulary validates prop **keys**, so `{ unit: undefined }` is a refusal rather than an
  omission. The harness strips undefined values before composing.
- `studio-journey`'s zoom-out loop initially clicked past the bottom level and hung on the very
  button the next assertion expects to be disabled. Bounded at `ZOOM_REST` clicks.
- Nothing else. No console or page errors on any engine across the whole journey — the harness fetches
  only committed files and calls no Worker, so `studio-journey` runs with **no expected-noise filter
  at all**, unlike `proto-journey`.
