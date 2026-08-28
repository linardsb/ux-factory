# S1 — the free-position substrate under load

> Status: spike plan, 2026-08-28. Altitude: one half-day experiment with a decision rule. Runs **before
> the swap PR is written** (`canvas-swap-pr-brief.md`), because the swap is one-way and its INP answer
> has to exist first. Architecture: `docs/epics/canvas-design-import.architecture.md` § Spikes, S1.
> Precedent: the studio's spike 2 (folded into #204, `.claude/plans/studio-canvas-stage-204.md` Task 1).

## Question

Does a stage scaled by a continuous `--stx-scale` holding ~30 frames positioned by `--x/--y` +
`transform: translate`, each a real token-skinned composition, with an SVG arrow overlay re-routing on
drag, hold the studio's standing budget — **INP ≤ 200 ms and no dropped frames during drag** — on
Chromium, Firefox and WebKit?

The grid substrate passed this at #204 with `data-col`/`data-row` and a five-step zoom table. What is new
is continuous scale (T2), translate-positioned nodes (T4) and derived arrow geometry (T5). Nothing else
about the stage changes, so the spike measures exactly those three.

## Shape

Throwaway, uncommitted except its write-up. Nothing under `system/` moves.

1. **A harness page**, `.claude/plans/canvas-spike-s1/harness.html`, an inline `<script type="module">`
   (no `.mjs` beside it: CI `verify` syntax-checks tracked `.mjs`, so any helper is inlined or parked as
   `.txt`). It imports the real `system/agentic-renderer.mjs` and `handoff/verdant/vocabulary.json`,
   renders ~30 compositions from the catalog's committed `example` props (three or four parts each, the
   shape a Faster Payment screen has), wraps each in a frame `div` positioned by `--x/--y`, sets the
   stage's `--stx-scale`, and draws one `<svg>` overlay with ~30 arrows bound frame-to-frame, geometry
   computed from the frames' properties on every move.
2. **Three configurations**, measured separately: (a) bare; (b) + `content-visibility: auto` with
   `contain-intrinsic-size` on frames; (c) + arrow redraw deferred to one rAF per gesture and to
   `scrollend` on pan.
3. **The gestures**, scripted: drag one frame across the stage at 1.0 and at 0.5 scale; marquee-drag
   five frames; ⌘-wheel zoom from 0.25 to 2 and back; pan the full extent.
4. **The measurement** reuses the studio gate's own observer, `tooling/inp-observer.mjs`
   (`OBSERVER_INIT`, `summarize`, `violations` — the imports `tooling/studio-journey.mjs:40` already
   makes), injected by a Playwright script per engine. Playwright resolves from `~/node_modules`;
   Python's `http.server` serves `.mjs` as `text/javascript` (the cross-engine motion-verify precedent).
   Chromium additionally runs under CDP 4× CPU throttle as the base-spec proxy; Firefox and WebKit run
   unthrottled and are read as the engine-difference signal, not the hardware signal.
5. **Record**: INP per gesture per engine, dropped-frame count per drag, the DOM node count on the stage
   (Lighthouse's 800/1,400 warnings are the ceiling signal T1 names), and wall-clock per step.

Timebox: half a day. If the harness is not measuring by the two-hour mark, the harness is wrong; cut
scope to configuration (a) and one drag rather than extend the box.

## Decision rule

- **Holds on all three engines** (INP ≤ 200 ms, zero dropped frames in configuration (a) or (b)) →
  T2/T4/T5 as written; the swap PR uses whichever of (a)/(b) passed with less code.
- **Holds only with (c)** → the swap PR ships arrow-deferral as a required part of the substrate, not an
  enhancement, and the journey driver asserts it.
- **Drops under (c) on any engine** → before anything heavier: cull off-viewport frames to
  `display: none` (tldraw's model), then reduce what a drag repaints (guides after drop, not during).
  Only if that fails is the answer "the DOM stage does not hold ~30 frames", which reopens T1 and goes
  back to the owner before the swap PR is planned — the swap is not written on a failed S1.

## Output

`.claude/plans/canvas-spike-s1/README.md` in spike C's shape: verdicts table, setup, timings, the numbers
per engine per configuration, caveats and bounds (this Mac is not base-spec; CDP throttle is a proxy),
what was and was not done. The verdict line and the branch taken are posted to the canvas epic issue once
it exists (the spike-verdict-before-dependent-planning rule).

## Not in scope

The real substrate code; announcements; keyboard paths; any gate change; the studio's existing INP gate
(it keeps running against `studio.html` and is rewritten in the swap PR, not here).
