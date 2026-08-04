# Implementation Report — Studio 3: canvas manipulation (#205)

**Plan**: `.claude/plans/studio-canvas-manipulation-205.md`
**Branch**: `feature/studio-canvas-manipulation-205`
**Status**: COMPLETE

## Summary

`system/studio-verbs.mjs` (new, hand-written canon) makes #204's canvas operable: a placed component
can be moved by pointer, by a single-pointer click-move-click path, or entirely from the keyboard;
every move is announced by the slot it landed in, is undoable and redoable, and travels the action
bus with an honest `source`. The structural call the plan turns on is implemented as written — **both
input paths emit one `ui.move` and do nothing else, and a single consumer applies it** — so AC #1's
parity is true by construction and #209's replay take-over has no seam left to build.

`place()` now builds a `.stx-slot` wrapper carrying a `.stx-grab` move button, idempotently, which
kept both existing drivers green unedited. `build-checks` grows group 13 (13 groups); `studio-journey`
grows from 27 to 77 assertions, green on chromium, firefox and webkit; `vt-verify`'s studio block
gains the move verbs.

**The drivers caught two real bugs and one real gap** — see *Issues encountered*. That is the point of
them, and none was visible from the source.

## Tasks completed

- pure layer + mount → `system/studio-verbs.mjs` (CREATE)
- `place()` wraps, idempotent; handle exposes `say` → `system/studio-canvas.mjs` (UPDATE)
- wrapper / handle / `is-picked` / verb row rules; explicit `grid-template-rows` → `system/studio.css` (UPDATE)
- one bus, verbs mounted, "What is live" and tail copy rewritten → `studio.html` (UPDATE)
- group 7's `MODULES` list + group 13 (the canvas verbs) → `tooling/build-checks.mjs` (UPDATE)
- the manipulation section, +50 assertions → `tooling/studio-journey.mjs` (UPDATE)
- the studio block gains the move verbs → `tooling/vt-verify.mjs` (UPDATE)
- regen → `system/loc-summary.json`, `tooling/visual-regression/baselines/approach-{neutral,saulera}.png`
- **deliberate no-op** → `system/param-manifest.json` (unchanged; reason below)

## Tests added

**`build-checks` group 13** (CI, pure, no browser) — the history stack (round-trip, no-ops at both
ends, redo-tail discard, the `HISTORY_MAX` cap with the index intact, clone-in and clone-out proven
by mutating a returned snapshot), `stepSlot` over 12 cases including two termination proofs with
every result asserted on-grid and unoccupied, `hitSlot`'s bands, the stated gap rule, both clamps and
an unmeasured geometry, and `DIRS` as four unit steps. It opens by **stating the boundary it cannot
reach** — the single-consumer invariant — and naming `studio-journey` as its owner.

**`studio-journey`** (operator-run, 3 engines, 77 assertions each) — the three-source proof (the
injected `source:"agent"` one on a **fresh page with no gesture first**), announcement counts per
path, blocked-press announcements, Escape on both paths, occupancy, the hit-test in three separate
conditions, R3's FLIP sampled at `currentTime` 0, R4's clean drop, the body-drag guard both ways, the
two refusals, and reduced motion.

**`vt-verify`** — a bus-driven move and undo added to the precondition, then `calls === 0` and zero
`::view-transition-*` pseudos; same in the reduced-motion sub-block.

## Validation results

| gate | result |
|---|---|
| `node --check` both modules · module import | pass |
| `tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `tooling/build-checks.mjs` | ✓ **all 13 groups pass**; group 7 still `1 inline-style write across 10 modules`, no exception argued |
| `gen-loc-summary --check` / `gen-param-count --check` / `gen-system-graph --check` | no drift (param count unchanged at 85) |
| `tooling/studio-journey.mjs all` | ✓ 77/77 on chromium, firefox **and** webkit |
| `tooling/vt-verify.mjs all` | ✓ all three engines |
| `npm run update:docker` | **only** `approach-neutral` + `approach-saulera` moved (R12) |
| accessibility tree | no `aria-pressed`; every handle named `Move <component>`; `aria-describedby` resolves; live region `role=status aria-live=polite`; handle is the slot's first tab stop |

## Mutation duty — every detector broken and watched go red

Each was reverted immediately after. **Three mutations initially survived, and each exposed a check
that could not fail** — those are marked ⚠ and were fixed before re-running.

| # | mutation | detector | result |
|---|---|---|---|
| M1 | invert `stepSlot`'s occupancy skip | group 13 | red (8 failures) |
| M2 | delete `push()`'s redo-tail truncation | group 13 | ⚠ **green twice** → fixed, then red |
| M3 | remove `structuredClone` on the way out | group 13 | red |
| M4 | remove `structuredClone` on the way in | group 13 | red |
| M5 | drop the gap term in `hitSlot` | group 13 | red (both gap cases) |
| M6 | remove `hitSlot`'s `clampSlot` wrapper | group 13 | ⚠ **green** → fixed, then red |
| M7 | remove `stepSlot`'s grid-edge return | group 13 | red (12 failures) |
| M8 | remove the `HISTORY_MAX` cap | group 13 | red |
| M9 | remove `undo()`'s floor | group 13 | red |
| R1 | drop `+ scrollLeft/scrollTop` from the coordinate chain | journey | red **only** in the panned case |
| R2 | drop `÷ ZOOM_LEVELS[level]` from the coordinate chain | journey | red **only** in the zoomed case |
| R3 | drop `÷ ZOOM_LEVELS[level]` from the FLIP | journey | red (the `currentTime` 0 sample) |
| R4 | let `lostpointercapture` win the race with the drop | journey | red (5 failures) |
| R5 | delete the keyboard per-step announcement | journey | red (both counts) |
| R10 | make a refusal `throw` instead of announce | journey | red (refusal **and** no-console-errors) |
| R11 | make the FLIP write `node.style.transform` | journey | red (`inlineStyled === 0`) |

R1 and R2 going red **only in their own condition** is the independence the plan required: each is
blind to the other's bug, and a single at-rest run passes with both terms missing.

**Three mutations that need their limits stated honestly:**

- **M2 (⚠)** — the redo-tail check was green because `deep()` was written as
  `JSON.stringify(v, Object.keys(v).sort())`. An array in stringify's second position is a
  **replacer**, and a replacer array filters property names at *every* level, so `col` and `row` were
  stripped and every arrangement compared equal as `{"s1":{},"s2":{},"s3":{}}`. **Every deep-compare
  in the group was vacuous.** Replaced with a hand-written recursive canonical stringify, and the
  redo-tail claim re-asserted on what `undo()` *returns* (`canRedo()` alone cannot fail: `push()`
  moves the cursor to the top either way, so an untruncated stack merely buries the abandoned branch).
- **M6 (⚠)** — `walk()` clamped with `Math.min` *and* `hitSlot` clamped with `clampSlot`, which made
  the `clampSlot` call unreachable and its check unable to fail. The `Math.min` was removed so
  `clampSlot` is the single definition of "on the grid", as the module claims.
- **M7 / the `stepSlot` bound** — mutating `limit` to `Infinity` leaves group 13 green. What actually
  terminates the walk is the **grid-edge return**; `limit` is a backstop the current code makes
  unreachable. Kept (an unreachable bound is cheaper than a hang if #217's multi-node gesture gets the
  edge test wrong) but **said out loud** in both the module comment and the check, so the backstop is
  never mistaken for the mechanism.
- **The two `flushPreview()` call sites cover each other** — removing *both* turns the whole pointer
  section red on webkit; removing *either alone* leaves it green. Stated in the module rather than
  implied: the pair is proven, neither half individually.

## Deviations from the plan

1. **`grid-auto-rows` → `grid-template-rows: repeat(var(--stx-rows), …)`** in `studio.css`. Not in the
   plan. An implicit grid only materialises rows something occupies, so
   `getComputedStyle(stage).gridTemplateRows` reported three tracks on a stage whose bottom five rows
   were empty — the pointer hit-test could not address them while the keyboard path (bounded by
   `MAX_ROWS`) could. The two paths disagreed about how big the canvas is, which is the one thing
   AC #1 says they never do. Caught by running the drag, not by reading.
   **What else it touches, flagged rather than left for the reviewer to find:** `stage.offsetHeight`
   is `fit()`'s input, so `fit` now fits the whole canvas rather than only the occupied part. That is
   the more correct behaviour, but the ticket's non-goals say "not changing … `fitLevel`", so it is a
   deliberate consequence and not an oversight. `fitLevel` itself is untouched; `studio-journey`'s fit
   assertions derive from live `contentW`/`contentH` and so self-adjust, and both branches (a genuine
   fitting level and the floor) are still exercised and green on all three engines.
2. **No `aria-pressed` anywhere.** The plan's mount task said to set it; its `place()` task and its
   Level 4 pass both say not to, with reasons. Resolved toward "no" — the two reasoned statements
   beat the stray line, and keeping it would have failed the plan's own acceptance check.
3. **Listeners are delegated on `stage`, not attached per wrapper.** `place()` is called *after* mount
   by the harness, by `studio-journey`'s seam, by `vt-verify`'s probe and by everything #206 will do,
   so per-wrapper listeners would only exist for wrappers present at mount time.
4. **Arrow presses announce unconditionally, including blocked ones** ("Blocked, still in column X,
   row Y"). The plan implied announcing the candidate; announcing only on movement would make the
   driver's exact `N + 2` count depend on which `N` was chosen, and leaves a reader at the grid edge
   with silence. A separate sub-case asserts the blocked count.
5. **The pointer pick-up does *not* announce; the keyboard and sticky pick-ups do.** Pressing down to
   start a drag is not a verb — the reader is about to watch their own hand — and announcing it made a
   pointer gesture two announcements, failing AC #2. Same argument that keeps slot crossings silent.
6. **Escape is a `document`-scoped listener**, not a stage one. A body-drag focuses nothing, so the
   keydown never bubbled through the stage and Escape mid-drag did nothing. Scoped to fire only while
   a gesture is live; the stage handler runs first on the keyboard path, so it never double-fires.
7. **`flushPreview()`** — not in the plan, and a real bug fix. See *Issues encountered*.
8. **R3 was NOT downgraded to manual-only.** The plan pre-authorised that if mid-animation sampling
   proved unstable. It is stable on all three engines, so the automated detector stands. It reads the
   animation at `currentTime` 0 and asserts the node sits where the reader last saw it — never the
   keyframes, which are the authored literal and would compare a computed value against itself.
9. **The zoom ≠ 1 hit-test case zooms OUT (0.75), not in (1.5)** as the plan wrote. At 1.5× the empty
   rows sit below the scroller's 640px box, so the drop point would be off-screen and the case would
   fail for a reason unrelated to the term it exists to catch. 0.75 makes the divide equally
   load-bearing.
10. **Small driver repairs in the same PR**, all forced by the wrapper refactor or by the section's own
    needs, each carrying its reason in a comment: the far-column focus check now scopes *past* the
    handle (it would have kept passing while its stated subject had drifted); the background-pan drag
    now *measures* an empty point instead of assuming one; the #205 section runs on its own page.
11. **The `restore` announcement is capped at three named components** (`SPOKEN_MAX`), then "and N
    more" — a live region is spoken end to end, and a 20-node restore would be one sentence a screen
    reader user must sit through.

## Issues encountered

- **A queued preview frame was discarded on release.** The move handler is rAF-throttled, so the last
  `pointermove` of a gesture is often still pending when the button comes up — and the drop committed
  the slot from the frame *before* it, landing the component one cell short of where the reader let
  go. Intermittent on every engine; **reproducible on webkit**, whose rAF flushes slowest, where it
  failed 14 assertions. Fixed with `flushPreview()` at both the drop and the still-there test.
- **Escape could not reach a body-drag** (deviation 6). Only found by running the assertion.
- **The body-drag guard matched an ancestor.** `closest("…[tabindex]")` walks *up*, and
  `studio-canvas.mjs:116` gives `.stx-scroll` a `tabindex` — so the guard matched the scroller for
  every component and body-drag never started anywhere. The plan specified "inside the wrapper" and I
  had dropped the containment half. Presents as "drag does nothing" with the handle still working.
- **`vd-plant-card` renders a real `<a>`**, so it is correctly handle-only. The driver now asserts
  both halves: a body-drag does not move it, and its handle does — so the guard costs no reach.
- **Not a bug:** dragging a node whose whole direction is occupied legitimately does not move it. Row
  1 of the harness is fully occupied, which briefly looked like a broken drag.

## Deliberate no-op — `system/param-manifest.json`

Unchanged, deliberately, and `gen-param-count --check` reports no drift (85 controls). The manifest's
own `$description` scopes it to the 10 VR-gated shipped pages + chrome; `studio.html` is off-nav,
`noindex` and outside the VR set. #204 set the precedent by adding four zoom controls with zero
entries. The controls this ticket adds join the manifest in **#206**, when they land on `/factory`.

## Acceptance criteria

All seven met, plus the standing gates. AC #1 is carried by the three-source deep-equal proof with the
injected source on a fresh page; AC #2 by exact per-path counts; AC #3 in CI (group 13) *and* through
the driver's seam; AC #4 by the recorded bus actions; AC #5 on both paths; AC #6 by the reduced-motion
context; AC #7 by `vt-verify`. `param-manifest` unchanged with the reason stated; only approach's two
baselines moved.

## Not done (out of scope, per the plan)

Marquee / guides / context menu / multi-move (#217), a layers list (#221), any shipped-page mount
(#206), a board model (#206/#207), touch authoring (PRD non-goal, stated in the module header), and
spike 2's failure-branch mitigations (its verdict was HOLDS and is consumed, not re-derived).
