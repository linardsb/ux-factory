# Implementation Report — Studio gates: INP instrumentation, throttled-drag frame check, driver growth, the a11y audit (#213)

**Plan**: `.claude/plans/studio-gates-inp-vt-a11y-213.md`   **Branch**: `feat/213-studio-gates`   **Status**: COMPLETE

## Summary

The studio's measurement gate: the PRD's three WRONG-if guardrails are now measured and asserted
instead of assumed. `tooling/studio-journey.mjs` gained a `perfPass` — a driver-injected
`PerformanceObserver` (helper: `tooling/inp-observer.mjs`, never shipped) measures sixteen named
interactions on the settled /factory plus a mid-replay page and asserts INP ≤ 200 ms per engine,
with a forced-slow calibration click proving the pipeline alive, a below-16 ms floor printed as
such, one logged retry, and a self-test control proving the comparator can flag. A chromium-only
4×-CDP-throttled drag samples rAF gaps + long-animation-frames and asserts the no-dropped-frame
budget. The journey also gained the dock-mid-flow case (with its not-a-take-over assertion) and
the keyboard zoom sweep; `tooling/vt-verify.mjs`'s factory block now samples after the take-over
and the keep-rail copy + export clicks. No shipped file changed.

## Tasks completed

- Task 0 → branch `feat/213-studio-gates` (cut from `origin/main`; see Deviations 1)
- Task 1 → `tooling/inp-observer.mjs` (CREATE — `OBSERVER_INIT` · `summarize` · `violations`, pure, no imports)
- Tasks 2–3 → `tooling/studio-journey.mjs` (UPDATE — `perfPass`: calibration, 16-row interaction table, logged retry, self-test control, 4×-CDP throttled drag with histogram)
- Task 4 → `tooling/studio-journey.mjs` (UPDATE — the dock mid-flow case in `factoryPass`)
- Task 5 → `tooling/studio-journey.mjs` (UPDATE — section [2b], the keyboard zoom sweep)
- Task 6 → `tooling/studio-journey.mjs` (UPDATE — summary sentence extended + the always-printed bounds block)
- Task 7 → `tooling/vt-verify.mjs` (UPDATE — factory block samples after take-over + keep-rail clicks, movement proven first)
- Task 8 → the WCAG audit table (below)
- Task 9 → both red-run proofs (below), tree restored and verified clean
- Task 10 → this report + the two `CLAUDE.md` tooling-row extensions

## Scope reality (which ticket bullets were pre-satisfied, and where)

The ticket was sliced 2026-08-03, before Studio 1–9 landed. Most of its journey-driver and
vt-verify bullets were already satisfied incrementally by #204/#205/#206/#207/#209/#210 and the
review tickets (#229–#232, #236, #237, #240, #241): the cross-engine journey driver exists
(replay plays · take-over hands over · every move verb by keyboard incl. ⌘/Ctrl+Z · SC 2.5.7's
click-move-click · share round-trip · export parses in a browser · reduced motion · announcements
per path · refusals to the live region), and vt-verify already covered the studio with honest
zero counts, /factory's boot read after the whole replay and sampled during playback. What this
ticket genuinely added: INP instrumentation (greenfield — nothing anywhere measured INP), the
CDP-throttled frame check (greenfield), the dock mid-flow, keyboard activation of the four zoom
verbs, vt-verify's post-interaction samples, and the process artifacts in this report.

The named-group MISSING half of AC #4 is owned by the /build entries in vt-verify that already
assert exact group-name sets — the studio deliberately names NOTHING for view transitions
(#171's lesson), so its honest expected count is zero everywhere and there are no studio groups
to name. Asserted as such, not invented.

## Per-engine INP tables (budget 200 ms · observer floor 16 ms · durations 8 ms granular by spec)

Final three-engine run, 2026-08-07, this machine (`< 16 ms` = no entry = below the observer's
delivery floor, a sound pass — see Bounds):

| Interaction | chromium | firefox | webkit |
|---|---|---|---|
| zoom-in click | 48 ms · 3 entries | < 16 ms · 0 | < 16 ms · 0 |
| fit click | 16 ms · 3 | < 16 ms · 0 | 16 ms · 3 |
| reset click | 16 ms · 3 | < 16 ms · 0 | 16 ms · 3 |
| slot pointer-drag | 16 ms · 3 | < 16 ms · 0 | 16 ms · 1 |
| keyboard grab (Enter) | < 16 ms · 0 | < 16 ms · 0 | < 16 ms · 0 |
| keyboard arrow step | 24 ms · 2 | < 16 ms · 0 | < 16 ms · 0 |
| keyboard drop (Enter) | 24 ms · 2 | < 16 ms · 0 | < 16 ms · 0 |
| undo ⌘/Ctrl+Z | 16 ms · 4 | < 16 ms · 0 | 32 ms · 4 |
| redo click | 24 ms · 3 | < 16 ms · 0 | 16 ms · 3 |
| panel tab arrow | 24 ms · 2 | 16 ms · 1 | 16 ms · 1 |
| compile click | 24 ms · 3 | < 16 ms · 0 | 16 ms · 3 |
| revert click | 16 ms · 3 | < 16 ms · 0 | 16 ms · 3 |
| keep copy-link click | 24 ms · 3 | 24 ms · 3 | 16 ms · 3 |
| export click | 16 ms · 3 | 16 ms · 3 | 16 ms · 3 |
| transport pause (Enter) | < 16 ms · 0 | < 16 ms · 0 | 16 ms · 4 |
| take-over pointerdown | 48 ms · 3 | 16 ms · 1 | 16 ms · 3 |

Worst interaction anywhere: 48 ms (chromium zoom-in click / take-over pointerdown) — 4× inside
the 200 ms budget. The plan's plausibility check holds: single-digit-to-low-tens rows, compile
among the larger ones, no row silently absent (16 per engine).

All 48 row-assertions green across the three engines; no retry fired on any engine in the final
run. The floor rows are sound passes: the calibration click proved delivery alive per engine
before any row was trusted.

## The chromium frame check (4× CDP throttle)

```
idle median 16.7 ms · 83 drag frames over 1386 ms · p50 16.7 · p95 16.8 · max 16.8 · >33 ms: 0 · LoAF: 0
```

Thresholds: worst rAF gap ≤ 50 ms · zero LoAF (≥ 50 ms by definition) overlapping the drag
window. Anchored on two measurements: the #72 spike (worst frame 33 ms @4× was its green) and the
planning probe (drag max 16.8 ms @4× on the heavier 31-component harness stage — /factory's
settled 4-place board is bounded by it). Movement proven first: the drag genuinely moved the
block before any frame claim was made. Chromium-only by tool definition (CDP + LoAF), and the
driver states that bound itself on every run.

## The WCAG audit (SC 2.5.7 · 2.1.1 · 2.2.2)

Ground truth: `system/studio-verbs.mjs:1-56` records which SC each path satisfies (SC 2.5.7 =
the single-pointer `.stx-grab` click-move-click path; SC 2.1.1 = the Enter/arrows/Enter path —
two different criteria, deliberately not conflated). SC 2.5.8 (24×24 target for `.stx-grab`) is
recorded in `system/studio.css` beside the size, which states the Spacing exception was not
relied on. All driver lines below are `tooling/studio-journey.mjs` at this PR's HEAD.

| Verb | Pointer path | Single-pointer path (SC 2.5.7) | Keyboard path (SC 2.1.1) | Announcement asserted at | Notes |
|---|---|---|---|---|---|
| move | drag → :594 (result), :621 (one `ui.move`) | click-move-click completed → :1013 (pick-up), :1023 (drop at the drag's destination as control) | Enter/arrows/Enter identical arrangement → :609; emits one `ui.move` → :647 | pointer once → :684; keyboard per keypress → :701; blocked presses still announce → :718 | Escape restores, emits nothing → :748; body-drag guard + handle reach → :983 |
| undo | Undo button (native `<button>`, UA keyboard semantics) → :764–:770 | n/a — a button press involves no dragging | ⌘/Ctrl+Z emits `ui.undo` → :773 | restore announced by name → :1078 | round-trip deep-equal → :770 |
| redo | Redo button → :765 (round-trip) | n/a | native `<button>` — focusable, Enter-activatable by UA; driven by click + perfPass row `redo click` | round-trip asserted as arrangement → :770 | |
| zoom in / out | click ×2 → :274 | n/a | **Enter on the focused button → :339, :345 (#213)** | the `aria-live="polite"` readout IS the live surface (studio-canvas.mjs:121); asserted at :339/:345 | the module writes no `.stx-live` sentence for in/out — asserted as what it writes, nothing invented |
| fit / reset | clicks → :293–:327 | n/a | **Enter → :356, :368 (#213)** | `.stx-live` counted with `countLive`, once each → :359, :371 | fit asserted against measured layout in the keyboard branch too → :356 |
| pan | background drag → :422 | n/a — panning also has the scrollbar + keys | scroller is `tabindex="0"` with arrow-key scroll (native); far column reachable by Tab → :445 | n/a (no announcement designed) | bare wheel never zooms → :380 |
| compile | click (perfPass row) | n/a | driven from the keyboard → :2153-block (focus + Enter, webkit-safe) | four steps + settled = 5, spaced → :2174; focus handed to counterpart → :2185 | |
| revert | click (perfPass row) | n/a | Enter → :2204-block | focus handed back → :2208 | byte-identical restore → :2204 |
| transport pause / resume / step / seek (SC 2.2.2) | Pause via click proven chrome-not-takeover → :1724-block | n/a | **all four keyboard-driven**: seek → :1615, step → :1628, resume → :1649, pause → :1658 | every seek announced → :1617; step announced → :1630-block | the replay is auto-moving content; pause exists, works, and reduced motion arrives instantly → :1753 |
| keep copy / export | copy → :2378; export downloads → :2327 | n/a | native `<button>`s (UA keyboard semantics); export also driven under reduced motion → keepPass §11 | confirmation sentence asserted on both copy outcomes → keepPass §10 | |
| take-over | pointer press mid-replay → :1689 | n/a | a keyboard move takes over on the settled page (factoryPass :1358-block); the dock case asserts a PACK SWITCH does NOT → :1445 | provenance shift asserted → :1689-block | Tab is deliberately NOT take-over → :1724 |
| refusals | — | — | — | refused in the LIVE REGION, DOM untouched → :1119 | hostile params clamped → :1126-block |

**Findings: no red cells.** Every verb has a pointer path and a keyboard path (or is a native
button whose keyboard semantics the UA provides and whose activation the driver exercises), the
one drag in the studio has a completed single-pointer alternative driven against the drag as its
control, and the auto-moving replay has keyboard-driven pause/step/seek, each announced. Nothing
to fix, nothing to ticket (AC #6's fix-or-ticket clause: not triggered).

## Red-run proofs (AC #1)

**1 · The broken verb.** `system/studio-verbs.mjs`'s `emitMove` mutated to commit the PICKED-UP
slot instead of the stepped one (`params: gesture.origin` for `gesture.current`) — the exact
class of bug the driver exists for. `node tooling/studio-journey.mjs chromium` went red with 21
named assertions, among them:

```
✗ AC #1 · a pointer drag moved s1 to column 1, row 4  {"col":1,"row":1}
✗ AC #2 · …and that one announcement names the slot it landed in  Metric 1 moved to column 1, row 1.
✗ R4 · after a normal pointerup the node is in the TARGET slot, not back at its origin  {"col":1,"row":1}
✗ SC 2.5.7 · …and a second click drops it in column 3, row 4 — the drag's destination, reached
  with no dragging movement  {"col":1,"row":1} → {"col":1,"row":1}
✗ AC #1 · an injected source:"agent" action on a FRESH page moves the same node through the same
  consumer  agent {"col":1,"row":4} vs pointer {"col":1,"row":1}
✗ #213 · …and a move verb still works after the dock, announced per keypress  row 1 → 1
  ── chromium: 265 passed, 21 failed
```

(The new #213 dock case is itself among the detectors.) Restored with
`git checkout -- system/studio-verbs.mjs`; `git diff --stat system/` → empty; re-run green.

**2 · The INP red.** `BUDGET_MS` lowered to 1 for one run. Every row carrying an entry went red
by name with its measured ms, and the retry rule fired VISIBLY — both numbers printed — while
the below-floor rows correctly stayed green (no entry ⇒ < 16 ms, and 0 ≤ 1):

```
retried: zoom-in click 48 ms → 48 ms
retried: compile click 24 ms → 16 ms
retried: keyboard arrow step 24 ms → < 16 ms (below floor)
✗ INP · zoom-in click ≤ 1 ms  48 ms (retried from 48 ms)
✗ INP · take-over pointerdown ≤ 1 ms  48 ms (retried from 48 ms)
✗ INP · compile click ≤ 1 ms  24 ms (retried from 24 ms)
  ── chromium: 272 passed, 14 failed
```

Restored to 200; final three-engine run green.

## Bounds (AC #7 — printed by the driver itself on every run, restated here)

- The frame check runs on **chromium only** — CDP CPU throttling and long-animation-frames are
  chromium-only by definition (probe-confirmed: firefox/webkit lack LoAF).
- An over-budget INP row is re-measured **once** on a fresh page with **both numbers printed** —
  never a silent retry.
- The Event Timing observer's `durationThreshold` floor is 16 ms: a faster interaction yields no
  entry and prints as "< 16 ms (below observer floor)" — sound because the calibration click
  proves delivery per engine.
- The INP interaction list is **enumerated** (16 rows), not exhaustive of future verbs — #212's
  flow verbs join `INTERACTIONS` when they land (the designed extension point).
- vt-verify's studio claims are zero-counts by design; the group-name machinery is exercised by
  the /build entries, which have names.

## Validation results

- `node --check` on all three touched tooling files — pass.
- The Task 1 pure-helper one-liner (`summarize` grouping + `violations` both directions) — pass.
- `node tooling/studio-journey.mjs all` — **chromium 286 · firefox 282 · webkit 282, 0 failed**
  (the 4-assertion delta is the chromium-only frame check, stated).
- `node tooling/vt-verify.mjs` — green on all three engines including the new factory samples.
- `node tooling/build-checks.mjs` — all 18 groups pass (nothing pure changed).
- `git diff --stat system/` after the red runs — empty; no shipped file changed in this PR, so
  no VR baseline churn, no param-manifest entries, no loc-summary regen (its GROUPS at
  `agent-layer/gen-loc-summary.mjs:22-26` do not count `tooling/`).

## Deviations from the plan

1. **Task 0's branch came from `origin/main`, not local `main`.** Local main had diverged
   (ahead 2 / behind 3); the two local-only commits were #210 review fixes whose content had
   already reached origin through PR #242's branch, so nothing was stranded and the branch was
   cut from `origin/main` directly.
2. **The implementation moved to a dedicated worktree (`wt-213`) mid-flight.** The shared
   working dir picked up #212's in-progress uncommitted edits (system/studio-flow.mjs,
   studio-compile.mjs …), which made the journey red for reasons outside this ticket (memory
   `shared-worktree-parallel-sessions`). Gates were validated against the isolated worktree;
   the drivers run on `PORT=4758`/`BASE` to avoid colliding with the other session's server.
3. **The dock case carries a narrow `Failed to load resource` console exemption** (teardownPass's
   precedent): wearing saulera 404s the pack's own `@import url("../fonts/fonts.css")` —
   `fonts/` is not committed, a standing property of the hand-authored reference pack that every
   saulera surface shares (the pixel gate wears it too; it never watches the console). The
   exemption is scoped to that one page and commented in place.
4. **The retry re-runs the whole sequence and re-measures only the flagged rows.** The plan's
   "re-measured once on a fresh settled page" is kept, but rows are order-dependent (the drop
   needs the grab, revert needs the compile), so a flagged row cannot be replayed in isolation —
   the fresh page replays the sequence and only the flagged rows are measured. Both numbers
   still print.
5. **The mid-replay rows run pause-then-take-over**, not the plan's listed order — after a
   take-over the whole transport is dead (#240/1), so the plan's order would measure a disabled
   button.
6. **The calibration page is `/404.html`** — light, same-origin, and its links are neutralised by
   the capture listener's `preventDefault`.
7. **The INP red-run used the budget-constant mutation** (the plan offered that or the self-test
   control's output; the real driver red is the stronger proof, and the self-test control runs
   green in every normal pass anyway).

## Issues encountered

- The worktree's static server exited once mid-red-run (ERR_CONNECTION_REFUSED); restarted with
  `nohup`, no code impact.
- None otherwise. The plan's probes held: all three engines emitted correctly-grouped
  event-timing entries, and no threshold needed adjusting from the planned values.
