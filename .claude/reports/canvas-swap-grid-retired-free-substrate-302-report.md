# Implementation Report — the swap PR: the grid retired, the free substrate, `canvas-ops.mjs`, MVP 14's spine

**Plan**: `.claude/plans/canvas-swap-grid-retired-free-substrate-302.md`
**Branch**: `feature/canvas-swap-grid-retired-302`
**Base**: `287445e` → `70f9563`
**Status**: **Phases 0 through 10 complete.** `node tooling/build-checks.mjs` →
`build ✓ all 36 groups pass`, exit 0 (and exit 0 again with `portal/node_modules` moved aside);
`drift-check` ✓ thirteen legs; `token-lint` ✓; the page-error sweep clean on twelve pages; MVP 14's
spine rendering on chromium, firefox and webkit; **`studio-journey` ✓ three engines — 525 · 521 · 521, zero failed**;
`catalog-journey` ✓; `instance-journey` ✓ 25/0; `vt-verify` ✓, with its movement proof reddened by mutation. **The DoD
grep is EMPTY** over AC #1's own scope — `system/`, `tooling/` and every `*.html` — AC #1 met.

**Phase 8 found and fixed SIX product defects**, every one of which passed all 36 build-checks
groups, `drift-check`, `token-lint`, and would have passed the pixel gate. Two of them —
`.stx-slot { position: relative }` putting every node back in normal flow, and the selection hit
test treating a board block as a zero-height line — meant the shipped `/factory` rendered its
canvas as a 2,800px column and could not be marquee-selected at all. See **Phase 8 — six product
defects**.

**Every phase is complete.** Phase 9 wrote **exactly 15 PNGs, 33 files after** — the plan's
arithmetic, reached by counting against `visual.spec.mjs`'s own `PAGES` list rather than estimated.
What remains is **Level 5 alone**, which is the owner's own read and which this PR must not write.

## Phase 0 — the before-state, observed 2026-09-18 on `287445e`

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass`, exit 0 |
| `node tooling/drift-check.mjs` | `drift-check ✓` — all thirteen legs, exit 0 |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` |
| `node agent-layer/gen-param-count.mjs --check` | `param count ✓  120 controls — no drift` |
| the DoD grep (7 symbols) | **435 lines across 15 files** |
| the wider grid vocabulary grep (15 symbols) | **596 lines** — AC #1's seven reach 435 of them |
| `ls tooling/visual-regression/baselines \| wc -l` | **22** |
| `git diff --stat origin/main..feature/stack-text-primitives-301 -- . ':!.claude'` | empty — the prior branch's code equalled main |

**Branch hygiene (pre-flight, observed).** The nine commits on `feature/stack-text-primitives-301`
are `.claude/`-only #301 documents. All five of their paths resolve on `origin/main` **and are
byte-identical there** (`git rev-parse origin/main:<path>` vs `HEAD:<path>`, five IDENTICAL), so
branching fresh from `287445e` orphans nothing.

## Phase 1 — the delete, and the red

**The run after the deletions is ONE LINK ERROR, not seven reds** — exactly the plan's "the one thing
most likely to go wrong". Observed:

```
file:///…/tooling/build-checks.mjs:218
import { clampSlot, fitLevel, MAX_COLS, MAX_ROWS, ZOOM_LEVELS, ZOOM_REST } from "../system/studio-canvas.mjs";
SyntaxError: The requested module '../system/studio-canvas.mjs' does not provide an export named 'MAX_COLS'
```

`group()` (`tooling/build-checks.mjs:315`) does **not** try/catch, and the group bodies are bare
top-level blocks — so a missing export is a link error that loads zero groups, and the first group to
call a deleted symbol would kill the run for every group below it. The plan's recipe ("comment the
dead imports out one group at a time") reaches one group per run.

**The probe that produced the per-group list.** A scratch copy of `build-checks.mjs`
(`tooling/.red-probe.mjs`, untracked, **deleted after the run**) with two changes and nothing else:
the two dead imports replaced by SENTINELS shaped to be *reached and judged false* rather than to
throw (`MAX_COLS = NaN`, `ZOOM_LEVELS = []`, `clampSlot = () => ({col: NaN, row: NaN})`, …), and each
of the 34 sections wrapped in a `try/catch` that files the throw as a failure so the run continues.
Section boundaries were taken from the `// --- N ·` headers, opening at the first bare `{` after the
header and closing at the **last** bare `}` before the next one.

### The red, group by group (observed)

| Group | State after Phase 1 | Failures | First message |
|---|---|---|---|
| 4 `codec` | ✗ | 6 | `the frozen v1 link "full build, imported pack" acquired an arrangement (undefined) — a v1 payload carries none` |
| 5 `tamper` | ✗ | 6 | `v: 3 was ACCEPTED — it must reject the whole payload` |
| 7 `vetting` | ✓ | 0 | **green on purpose** — a source-text scan with nothing yet to find. It goes red the moment Task 2.0 lands `setPos` (`1 inline-style write across 23 modules` is still true today) |
| 12 `canvas` | ✗ | 35 | `studio.css declares --stx-cols: null but studio-canvas.mjs exports MAX_COLS NaN` |
| 13 `verbs` | ✗ | 90 | `occupancyKey gave , expected "3,4"` |
| 14 `studio` | **THREW** | 1 | `THE GROUP THREW: MAX_COLS is not defined` |
| 22 `select` | **THREW** | 1 | `THE GROUP THREW: clampSlot is not defined` |
| 24 `frames` | **THREW** | 2 | `FRAMES["verdant"] starts at 1,3, off the undefined×undefined grid` · `THE GROUP THREW: fClampSpan is not a function` |
| 26 `layers` | ✓ | 0 | **green on purpose** — representation-coupled, never cap-coupled (the plan's table). It goes red in Phase 3, when the position sentence changes |
| 27 `minimap` | ✓ | 0 | **green on purpose** — same reason; its CSS-Grid-track parsing has tracks to parse until `.stx-stage` stops being a grid |

**141 failures in total**, exit non-zero. Seven of the nine touched groups are reached; the two the
plan predicted would survive Phase 1 did.

**These are not mutations.** A `ReferenceError` on a deleted symbol and a sentinel-driven `ok()`
failure are both "the old assertion no longer reaches its subject". AC #2 asks for the mutation that
reddened each rewritten group; that is Phase 2's column, recorded separately under
**Proving the checks**. This table is the "seen red on the deleted symbol" half, and nothing more.

## Gate B ledger — the authorized red

**Re-resolved at Task 2.0, after Phase 1 moved the line numbers** (23 lines came out of `keepPass`,
8 went back in, so everything past :2709 shifted by −13). The plan's nine pre-Phase-1 numbers
(:196, :209, :384, :1256, :1499, :1694, :2280, :2910, :3827) were a mix of READ sites and ASSERT
sites; resolved by content, the affected set is **eight pairs**, and two of the plan's numbers name
sites that `setPos` does not touch at all.

| # | Read | Assert | Scope | Broken by `setPos`/`setScale`? |
|---|---|---|---|---|
| B1 | :196 `inlineStyled` | :384 | `slots + stage + scroll` | **yes** — every slot carries `--x/--y/--w` |
| B2 | :209 `styled` | :572 | one moved slot | **yes** |
| B3 | :196 (reused) | :1256 `afterMoves` | `slots + stage + scroll` | **yes** |
| B4 | :1498 | :1501 | `.stx-slot, .stx-stage, .stx-scroll` | **yes** |
| B5 | :1693 | :1696 | `.stu-replay *, .stx-slot, .stx-stage` | **yes** (the slots) |
| B6 | :2280 | :2363 | `.stx-slot, .stx-slot > *` | **yes** |
| B7 | :3814 | (inline) | `.stx-stage, .stx-scroll, .stx-slot, .stx-guide, .stx-menu` | **yes** |
| B8 | :4974 | :5019 | `.stx-frame` (framesPass) | **yes** — frames carry `--h` too |
| — | :2896 | :2899 | `[data-studio-keep] *` | no — not a canvas node; **stays as it is** |
| — | :5621 | :5628 | layers + minimap subtrees | no — same reason; **stays as it is** |

**The predicate that replaces them (designed here, run at Task 8.2):** not "carries no style
attribute" but "**every** style attribute present carries **only** `--x`, `--y`, `--w`, `--h`,
`--stx-scale`, `--stx-extent-w`, `--stx-extent-h` — and nothing else". Read
`el.style` property-by-property rather than the attribute's text, so a longhand written by a third
party is caught by name rather than by a substring.

Knowingly red from Task 2.0 until Task 8.2, per the plan's Phase 2 header. **Not a regression.**

## Where this stands

20 commits on `feature/canvas-swap-grid-retired-302`, each a recoverable checkpoint inside the
door:

| SHA | What |
|---|---|
| `53f3ab7` | phase 1 — the grid deleted, seven groups seen red |
| `e7d1858` | phase 2 wip — the two helpers, and groups 7, 12, 13, 4 |
| `53dab42` | the rank layout, and groups 14, 5 and 4 |
| `a4e2053` | the canvas mount and the selection, on free positions |
| `993a215` | the layers list and the minimap, off the grid representation |
| `1a36462` | groups 26 and 27, against the representation that replaced the grid |
| `fc0b3db` | the implementation report — PARTIAL, and what is left |
| `863954c` | group 13's snapshot-shape assertions, which its group line already claimed |
| `526e92c` | the gesture mount, on free positions — and the FLIP hazard, measured |
| `07e05f8` | groups 22 and 24 — Task 2.9, the gate is green again |
| `3cb9523` | build-checks' own header index and twelve prose lines, off the retired names |
| `143c6f7` | regenerate loc-summary — the runtime group loses 200 lines |
| `cc0ed89` | the report at Task 2.9 — past the door, and green |
| `3d2d74c` | group 13's guidesFor cases, which nothing asserted |
| `3f87a3c` | vt-stack-audit's before-reading, and what it cannot see (H8, H9) |
| `2a39c27` | the SVG arrow overlay, and vt-verify's coordinate preconditions |
| `dfab109` | canvas-ops.mjs and device-presets.mjs, group 35 — and a real regression vt-verify caught |
| `62235a8` | the optional `id` node key → data-part, and the pack cascade it drags |
| `0c2d0bd` | phase 5 — the nudge, eight align/distribute verbs, and T16's sentence |
| `70f9563` | MVP 14's spine — one frame, one stack, one state, one arrow, saved and reloaded |

**The DoD grep: 435 lines across 15 files → ZERO** (observed, AC #1's seven symbols, over the
scope the AC names: `system/`, `tooling/` and every `*.html`). `tooling/studio-journey.mjs` was the last holder at 70 and is clear;
so are the two retired-name residues Phase 8 found on the way — `studio-layers.mjs`'s dead
`data-span-*` keys on an entry `layerEntries` no longer reads, and `studio-frames.mjs`'s call 4,
which still argued "GEOMETRY IS ATTRIBUTES, AND RESIZE IS SPAN — NOT PIXELS" for a module that has
been writing pixels since Phase 3.

`docs/epics/*.architecture.md`, `__canvas_planning_PRD.md` and the `.claude/plans/` +
`.claude/code-reviews/` series keep theirs — 343 lines across 38 files outside `docs/`, counted
rather than assumed. That is correct and is stated so a later reader does not "finish the job":
they are the historical record of the decision to retire the grid, not live code.

**Phase 8 — complete.**

| Task | State |
|---|---|
| 8.1 the module-scope import | **done** at `70f9563`; this phase changed only what it imports (adding `rankLayout` from `board-ops.mjs`, for the same never-retype reason) |
| 8.2 Gate B | **done** — ONE `STYLE_ALLOWED` array and one `strayStyles(p, selector)` helper, read property by property off the `CSSStyleDeclaration`, at **eight** call sites. Two of the nine sites the plan lists stay absence-checks on purpose: the keep rail and the layers/minimap rail are chrome, `setPos` never touches them, and "no style attribute at all" is still the true and stronger claim there |
| 8.3 the coordinate assertions | **done**, thirteen passes. Helpers rewritten rather than call sites wherever the helper existed: `slotsNow`, `cell`, `movables`, `frameState`, `boxOfFrame`, `wrapBoxes`, `mapCells`, `guidesHonest`, `openAt`, `posOf`, plus the new `places()` projection |
| 8.4 the INP gate | **done** — the five track reads inside `perfPass` are the imported node pitch now; the 26-row list, the calibration click and the synthetic 250 ms comparator proof are untouched |
| 8.5 `vt-verify` | **done** — zero residue, and RUN |
| 8.6 `catalog-journey` + `instance-journey` | **run** |
| 8.7 the checkpoint | this commit |

**Three anti-shapes the plan named, and none was written:**

- **No assertion that pointer coalescing engaged.** Playwright cannot outpace the frame rate on
  chromium or firefox, so such a row could only ever pass on one of three engines (#423's G1).
  `studio-canvas.mjs`'s own header says the same thing about the arrow overlay's rAF coalescing.
- **No assertion that every pan produces a `scrollend`.** It fires 31/40 on WebKit.
- **No INP row for zoom.** A wheel is not an interaction the Event Timing API reports, so an INP
  row there would be green by construction; the rAF-gap sample (chromium-only, and the driver says
  so) is where a zoom's cost is gated.

**Two fixture defects the three-engine run found, both mine and both in the driver.** Recorded
because each looked exactly like a module bug from the row that failed:

- **The AC #1 drag measured before the scroller had stopped.** `pointOnStage` converts every
  pointermove through a LIVE `scroll.getBoundingClientRect()`, so a page still sliding under a
  stationary pointer is added to the gesture's stage delta pixel for pixel. Firefox reported
  `y 174.43` where the keyboard path reached exactly 156 — a mover that over-travels, seemingly.
  It is 18.43px of residual scroll. `hitCase` already carried the wait (#196's lesson); it is one
  shared `scrollSettled()` now, used by both. **This fix was INCOMPLETE and the entry is left
  standing rather than rewritten, because the incompleteness is the lesson:** it named the inner
  scroller as the thing that was moving, and the thing that was moving was the window. It reduced
  the overshoot to 4.98 and the row stayed red. See **F1** under Proving the checks — Phase 8.
- **The marquee pressed on the stage's BOUNDARY pixel.** The listener is on `.stx-stage` and the
  scroller carries a 1px border, so stage-space 0,0 converts to the boundary. Chromium resolved
  that pixel to the stage and firefox did not — `[] vs ["s3","s4"]` with **zero** announcements,
  which is a press that never landed rather than a selection rule that disagreed. The press is
  clamped one pixel inside now, and the epsilon cannot change an answer: `idsInRange` is an overlap
  test over nodes with real extents.

**Two rows DELETED with their reason, rather than translated.** Both asserted the opposite of a
shipped decision, which is worse than no check — a red on correct code gets "fixed" by restoring
the retired rule:

- **the occupancy pair** (`journey`) — D-d retired occupancy, so two components overlapping is
  correct behaviour. The hit-test cases are what now prove a drag lands where it was dropped.
- **the frame's footprint step** (`framesPass`) — a frame CAN now be nudged over its neighbour.
  What that row really guarded, that a frame moves as a whole carrying its size, is a conjunct of
  the row that replaced it, which the old one never made.

**Three rows whose CLAIM changed and are kept, each saying so in its own comment:** the "blocked"
arrow press (there is no blocked variant; the repeat IS the feedback), the keep rail's arrangement
link (retired with `g`), and Fit on a compiled canvas (the stage is a fixed box now, so there is no
floor to reach and fit lands on the ratio).

### Tasks completed

**Phase 0** — 0.1 branch (from `287445e`), 0.2 the before-state recorded above.

**Phase 1 — complete.** 1.1 the nine exports + `ZOOM_REST` · 1.2 the four families, the zoom table
and the two cap mirrors (52 rules, cut by content anchor) · 1.3 the six verbs symbols + the
occupancy layer they orphaned · 1.4 the five cap imports · 1.5 `g` deleted, v3, the named refusal ·
1.5b the capability retired in **five** places (the plan names three) · 1.6 the prose in
`studio.html` · 1.7 the red, recorded above.

**Phase 2 — partial.**

| Task | State |
|---|---|
| 2.0 the two helpers | **done** — `setPos`, `setScale`, `STAGE_W/H`, `SCALE_MIN/MAX/REST`, `MIN_SIZE`, `NODE_W/H/GAP` |
| 2.0b the CSS substrate | **done** (pulled forward — see Deviations) |
| 2.1 group 12 | **done** — replaced whole; the DOM stub widened with a custom-property `style` + its own control |
| 2.2 group 13 | **done** — history, `adopt`, `DIRS`, `SPOKEN_MAX` kept; 264 lines over five deleted functions cut |
| 2.3 group 7 | **done** — function-scoped, proven on six mutations |
| 2.4 group 14 | **done** — with the rank layout beside it |
| 2.5 group 22 | **NOT DONE** — its source (`studio-select.mjs`) is done; the gate half is not |
| 2.6 group 24 | **NOT DONE** — needs `studio-frames.mjs`'s `FRAMES` literals first |
| 2.7 groups 26 + 27 | **done** — sources and gates |
| 2.8 groups 4 + 5 | **done** — group 5 REWRITTEN rather than cut (see Deviations) |
| 2.9 the green checkpoint | **NOT REACHED** |

**Beyond Phase 2, brought forward because a gate cannot be written against a function whose new
answer does not exist** (the plan's own Task 2.0 precedent, applied three more times):

- **Task 3.5, the rank layout, in both copies** — `rankLayout(board)` added to `system/board-ops.mjs`
  as a pure read; `studio.mjs`'s `arrangeBoard` and `replay-driver.mjs`'s reflection both read it.
- **Tasks 3.1/3.2's mount half** — continuous zoom, exact `fit()`, the coalesced scale write, and
  `place(node, {x, y, w, h})`.
- **`studio-select.mjs`, `studio-layers.mjs`, `studio-minimap.mjs`** — the three consumers whose gate
  groups are 22, 26 and 27.

## What is NOT done

- **Phase 9 entirely** — the pixel baselines, and the cascade is now larger than the plan's 15.
  See below.
- **Phase 10's `discovery/README.md`** — the `build/` section. CLAUDE.md's map rows (including the
  two stale `studio-canvas.mjs` / `studio.css` rows this phase found), `gates.md`'s group
  paragraphs for 12, 13, 26 and 27 and its two journey-pass paragraphs, and the group count in all
  five prose copies are **done**.
- **The `/factory` menu's double correction at the far right edge**, recorded rather than fixed:
  within a menu's width of the right edge the menu is BOTH clamped by `setPos` (to
  `STAGE_W − MENU_W`) and flipped by `translate: -100%`, so it renders up to `MENU_W` left of the
  component it belongs to. The clamp alone would keep it on the stage. Which of the two should win
  is a design call, not a coordinate migration — the driver asserts the shipped geometry and names
  the gap in its own comment.
- **Level 5, by hand in a real browser** — the owner's own read of `/factory` and `/studio.html`.
- **The owner's verdict on `/factory`** — the owner's own hand; the plan says this PR must not
  write it.

**The baseline cascade, counted rather than predicted — and it is the plan's 15 after all.** An
earlier draft of this section said "larger", reasoning that every node on `studio.html` and
`/factory` rendered at its flow offset plus `--y` before this phase, so every committed capture of
either page is of a broken layout rather than of a layout that merely moved. The first half holds
and the second does not: **`studio.html` has no committed capture.** `visual.spec.mjs`'s `PAGES` is
eleven entries, `baselines/` holds 11 × 2 = 22 files (observed), and `studio.html` and
`instance.html` are not among them — `grep -l "studio.css" *.html` gives `factory.html`,
`studio.html`, `instance.html`, and only the first is captured. So P1's correction reaches
`/factory` and nothing else:

| Cascade | Why |
|---|---|
| `loc-summary`'s runtime group 31,400 → **31,500** | `approach.html` fetches and renders that number, so `approach-neutral.png` and `approach-saulera.png` are stale |
| every `/factory` capture | P1 — the at-rest layout was wrong in the committed state, so these are not "moved", they are corrected. **`studio.html` has no capture**: `visual.spec.mjs`'s `PAGES` is 11 entries and `studio.html` / `instance.html` are not among them, which is why the cascade is the plan's 15 after all rather than larger. `/factory` is the only captured page that loads `studio.css` |
| `/factory`'s replay-settled captures | P2 — the settled canvas is the rank layout now rather than one stacked column |
| the frame captures | the resize grab-offset fix (P6) does not move an at-rest frame, so these move only with P1 |

`param-count` did **not** cascade: `--check` is green at 121.

## Phase 8 — six product defects the driver's own migration found

Every one of these was live on `main`'s successor tree, passed all 36 build-checks groups, passed
`drift-check`, passed `token-lint`, and would have passed the pixel gate. They are listed before the
mutation tables because they ARE the strongest evidence the rewritten checks work: each was found by
a rewritten assertion going red on correct-looking code, and each was confirmed on the running page
with a standalone probe before anything was changed.

| | Defect | How it presented | Fix |
|---|---|---|---|
| **P1** | `system/studio.css` — `.stx-slot { position: relative }` sat AFTER the four-family `position: absolute` rule at equal specificity and won the cascade | Every node was back in normal FLOW, so `transform: translate(var(--x), var(--y))` offset it from its stacked flow position. `--x` looked right (a block's flow x is 0); `--y` was added to the accumulated height of every slot before it. 31 slots rendered as a ~2,800px column while every property, every `snapshot()` and every pure group read exactly right | drop the `position`; the family rule places these and is already a positioned ancestor for `.stx-grab` |
| **P2** | `system/replay-driver.mjs` — the reflection recomputed the rank only for the node being ADDED | Every `place.add` op in `build-fieldwork-dispatch` runs before every `connect`, so each place is an ORPHAN at insertion and the seven connections arrive when nothing re-reads the layout. `/factory`'s settled canvas was one stacked column: neither the retired row-1 rule nor the rank layout | a `relayout()` through `setPos` (silent — `place()` announces and appends), called from the `connections-changed` and `place-added` branches |
| **P3** | `system/studio-select.mjs` — `boxOf`'s `h: prop("--h") \|\| 0` | A board wrapper carries no `--h`, so every block on `/factory` was a zero-height LINE at its own top edge. **A marquee dragged straight across all four blocks selected nothing** (measured). The only rectangle that could have caught them needed a top edge of exactly 0, which a pointer cannot reach through the scroller's 1px border. #217's AC #1 was dead on the shipped route | the MEASURED height when none is authored — a hit test asks what a node occupies, which is a different question from the snapshot's `h: null` |
| **P4** | `system/studio-verbs.mjs` — `preview`'s delta was `at − gesture.current`, and `gesture.current` is read back off the anchor's CLAMPED box | Once the anchor hit the stage edge and stopped, every later frame recomputed the same negative delta from the clamped position and applied it again. A group dragged down the left edge did not deform, it SHEARED: the anchor stood at x 0 while the others slid left ~34px a frame until they stacked on it. Two selected blocks at 0 and 236 both ended at 0 — #217's AC #2, "the selection keeps its shape", false for any drag touching an edge | anchor-driven: apply the anchor, read its REAL travel from `setPos`, translate the rest by that. Members still deform independently at the edge (D-d); only the anchor's own clamp no longer drives it |
| **P6** | `system/studio-verbs.mjs` — the resize path recorded no grab offset, and its comment argued it needed none ("the corner the reader is dragging is the cursor itself") | True of the CORNER, false of the CONTROL: the press lands on `.stx-resize`, whose centre is inset from the corner it represents, so the first preview snapped the corner to the cursor and the frame lost that inset on BOTH axes. Measured at 14px per axis on a drag whose x never moved. It is `3f2b367`'s move teleport, one gesture over; a grid resize snapped to a track and absorbed it | record the offset from the CORNER for a resize and from the ORIGIN for a move — `pointFor()` already subtracts whichever was recorded |
| **P5** | `tooling/studio-journey.mjs` keepPass — Task 1.5b's **fifth** site | Two rows still asserted that the copied link CARRIED the sender's arrangement and that its label said "arrangement included". `g` is deleted and `param-manifest.json:96` records the label change; only this assertion was missed | retired with a stated reason; what is asserted now is the retirement — the link decodes to the same board and carries no arrangement key |

**P1, P2, P3, P4 and P6 are all the same shape**, and it is worth naming: every property the modules
wrote was individually correct, every pure function answered correctly for its inputs, and the
defect was in what the browser did with those properties or in which inputs were handed over. No
DOM-free gate can reach any of them. That is precisely what `gates.md` says the journey drivers are
for, and it is the first time this repo has had all four fire in one ticket.

**What P2 and P4 cost, stated:** both were found only because the rewritten assertion was stronger
than the one it replaced. The old rank row asserted "row 1, columns 1..n", which the new layout was
never going to satisfy either way; the old group row asserted "+1 row", which a sheared group whose
anchor was clamped would have satisfied on the y axis alone.

## Phases 3-7, in brief

**3.4 — the arrow overlay.** `arrowPath` is pure and DERIVED, clipping on the line of centres so a
back edge (northwind really carries one) does not double back. The layer sits INSIDE the scaled stage
(zero redraws on zoom) and is a SIBLING of the nodes, never a child — a `transform` makes a
containing block exactly as a `view-transition-name` does. **A latent #171 was found by the plan's
own REDDENS and closed:** naming the frames turned `vt-stack-audit`'s hazard B from clean to **12
unresolved overlaps**, every one `probe-sN × svg.stx-arrows z=auto`. `.stx-arrows` now carries an
explicit `z-index: 0` — the same value its first-child position already gave it; the difference is
that it is now a decision.

**4 — `canvas-ops.mjs`, `device-presets.mjs`, group 35, the `id` key.** Six ops, `PARAMS` exported
and frozen at both levels, which is what makes the group's `OPS` iteration possible at all.

**5 — the nudge, eight align/distribute verbs, T16's sentence.** A bare arrow nudges by 4px (the
spacing scale's floor, and there is no `--spacing-none` to fall further to); Shift takes a node
pitch. The eight verbs are PRODUCERS — they read the selection and emit `ui.move-group`, so the one
consumer that writes a position still is. `distribute` leaves EQUAL GAPS rather than equal centres.

**6 — the spine.** D-a and D-b both honoured; five mutations red by name after two rounds of fixing
the gate itself.

**7 — the generators.** `loc-summary` (twice), `param-count` (120 → 121), `vocabulary` and the
handoff pack all regenerated and committed; `drift-check` green on thirteen legs is the proof. Task
7.4's two false cascades confirmed: `gen-system-graph` does not read `studio.css`, and
`build-instance.mjs` copies `system/` wholesale so the two new modules ride along.

## Proving the checks

Every row was **run**: mutation applied → the named case observed red → reverted → observed green.
The control is stated first because a mutation table over a check that was never green proves
nothing.

### Task 1.5 — the codec's `g` refusal (`system/build-share.mjs`)

Driven through the real `encodeBuild`/`decodeBuild` (probe text in **Additions beyond the plan**).

| | Input | Observed |
|---|---|---|
| **control** | a real `encodeBuild` → `decodeBuild` round trip | `reason === null`; `SHARE_VERSION 3`, `SHARE_VERSIONS [1,3]` |
| M1 | `{v: 3, …, g: [[1,1]]}` | **RED** — `"this link carries a grid arrangement, which this builder retired — it was made with an older version, so re-share the build to get a link this page can read"` |
| M2 | `{v: 1, …, g: [[1,1]]}` | **RED** — same sentence. The refusal is on the FIELD, not on the version, so a hand-built payload cannot smuggle `g` under a readable version number |
| M3 | `{v: 2, …}` | **RED** — `"this link is format v2; this builder reads v1 and v3"` |

### Task 2.3 — group 7's function-scoped write-site predicate (`tooling/build-checks.mjs`)

Ported from `.claude/plans/canvas-swap-302-reference/group7-predicate.reference.txt`, with D-c's
`{setPos: 4, setScale: 3}` budgets in place of the reference's `{3, 3}`. Run through a scratch
per-section probe, because `build-checks.mjs` still carries Phase 1's dead imports at this point.

| | Mutation | Observed |
|---|---|---|
| **control** | none | `build vetting ✓  8 inline-style writes across 23 modules` (was `1 … across 23 modules` before Task 2.0) |
| M1 | a `.style` write added to `place()` — **outside** the named writers | **RED ×2** — `studio-canvas.mjs: 1 inline-style write(s) OUTSIDE setPos / setScale — the named-writer exception is function-scoped, not file-scoped` · `… 9 … the invariant is exactly 8` |
| M2 | a `.setProperty` added to `studio-verbs.mjs` — a module with no named writer | **RED ×2** — `system/studio-verbs.mjs writes an inline style; applyToStage, setPos and setScale are meant to be the only ones` · the total |
| M3 | a FIFTH write inside `setPos` | **RED ×2** — `setPos() makes 5 inline-style writes; the invariant is exactly 4` · the total |
| M4 | the `calls === inSlices` clause deleted, then M1 re-applied | **RED ×1** — only the total fires. The clause is what names *where* |
| **M4b** | one write **MOVED** out of `setPos` into `place()` — **the total stays 8** | **RED ×2** — `setPos() makes 3 …; the invariant is exactly 4` · `1 inline-style write(s) OUTSIDE setPos / setScale` |
| **M4b′** | M4b **with both function-scoped clauses deleted** — the file-scoped shortcut, shipped | **GREEN** ❌ — `build vetting ✓  8 inline-style writes` |

**M4b′ is the row that carries AC #8.** A real second write site, in a real function, with the
whole-list total still correct — green under the shortcut a naive fix would take, red under what
shipped. The total is a second net, not the invariant.

### Task 2.2b — group 13's `guidesFor` cases

`guidesFor` came back at `526e92c` re-expressed over free positions — and **nothing asserted it**.
The group line said the snap guides were "Phase 5's", which was true when the function was deleted
and false once it returned. Found on review, the second instance of the same shape as H7.

| | Mutation | Observed |
|---|---|---|
| **control** | none | `build verbs ✓` |
| M1 | compare ORIGINS only — drop the centre and trailing edge | **RED ×3** — `a peer whose CENTRE (150 + 100/2) matches … drew no guide` · the trailing-edge case · the dedupe case |
| M2 | a 1px TOLERANCE instead of exact equality | **RED ×1** — `a peer ONE PIXEL off drew a guide — a tolerance makes the line appear before the alignment is real` |
| M3 | drop the both-halves rule — report every carried line | **RED ×7**, led by `a carried member with NO peers produced {"xs":[100,200,300],"ys":[200,250,300]}` |
| M4 | compute the X axis only | **RED ×1** — `the Y axis does not answer at all — both axes are computed by the same helper and a one-axis implementation passes every X case above` |

M1 is the row worth reading: an origin-only comparison passes **every other case in the block**, and
is exactly what a re-expression of the grid version would produce if the author did not notice that a
free position has three lines per axis rather than one.

### Task 2.2 — group 13's snapshot shape reaches the NEW field

The snapshot widened from `{col, row}` to `{x, y, w}` / `{x, y, w, h}`. The history stack is generic
and the canonical stringify is recursive, so **both would keep passing for a snapshot whose fourth
field they never looked at** — an undo would silently restore a frame's position and not its height.

| | Mutation | Observed |
|---|---|---|
| **control** | none | `build verbs ✓` |
| **control** | `deep(framed(296)) !== deep(framed(452))` — two snapshots differing ONLY in `h` | asserted DIFFERENT, so the comparison demonstrably reaches the field |
| M | `createHistory`'s `at()` replaced by a clone that copies only `x`, `y`, `w` — the exact "never looked at the new field" defect | **RED** — `an undo over a height change restored {"f1":{"w":456,"x":0,"y":0}}, not the height the reader came from` (+ 4 more) |

**This case was written because the group line already claimed it.** The prose was committed at
`e7d1858` describing an assertion that did not exist — the repo's largest class of process finding,
in prose rather than in code. Caught on review; the assertions now exist and are proven able to fail.

## Proving the checks — Phase 8

Two shapes of evidence here, and the difference matters. Most of the rewritten checks were reddened
by a **real defect** during the rewrite — which is strictly stronger than an injected mutation,
because the red came from code someone had written and believed, not from a line added to provoke
it. Where a check has never been red on real code, a mutation was **run**.

### Reddened by a real defect (observed, not injected)

| Check | The red it produced | Which defect |
|---|---|---|
| `#209 · …laid out by the RANK LAYOUT` | `[["0px","0px"],["236px","0px"],["236px","156px"],["236px","312px"]] vs [["0px","0px"],["236px","0px"],["472px","0px"],["708px","0px"]]` — the page had one stacked column where the rank layout has four | **P2** |
| `#217/AC1 · a Shift-drag marquee selects exactly the components inside the dragged rectangle` | `[] vs ["s3","s4"]` — the page selected nothing at all | **P3** |
| `#217/AC2 · dragging ONE selected member lands EVERY member at the SAME offset` | `deltas [[0,141],[-236,141]]` — the second member had slid a whole pitch left | **P4** |
| `hit-test · after panning` (both rows) | `node s15 at {"left":349,"top":1463…}` against a canvas at `y 190, height 640` — the node was 633px below the scroller | **P1** (and the fixture's own coordinate-space error, fixed with it) |
| `#219 · AC #3 · a POINTER drag of the corner resizes the frame by one pitch (±2px)` | `{"w":"442px","h":"438px"} vs {"w":"456","h":"452"}` — 14px short on BOTH axes, on a drag whose x never moved | **P6** |

The ±2px tolerance is the row worth pausing on: it was added in the same pass that caught **P6**,
and it did **not** swallow it. 14px is seven times the tolerance, and a missing coordinate term
(the case the "after panning" condition is the sole detector of) moves a node by hundreds. The
tolerance covers device-pixel rounding on a float and nothing larger, which is what it claims.

### Reddened by an injected mutation (run)

#### Task 8.2 — Gate B's running-page predicate

The claim CHANGED rather than being dropped: it read "no element on the canvas carries a style
attribute at all", true while an arrangement was attributes and false the moment `setPos` writes
four custom properties. What replaced it is the EXACT SET — every style attribute on the canvas
carries only `--x`, `--y`, `--w`, `--h` and the three scale properties — read property by property
off the `CSSStyleDeclaration`, so a longhand a third party wrote is NAMED rather than hidden inside
an attribute's text. One `STYLE_ALLOWED` array, eight call sites.

| | Mutation | Observed |
|---|---|---|
| **control** | none | `── chromium: 525 passed, 0 failed` |
| M1 | `node.style.transform = "translate(1px,1px)"` added to `applyBox` — the restore path, and exactly the write the predicate exists to catch | **RED** — `R11 · after a drag, an undo and a redo every style attribute STILL carries only the position and scale properties …  stx-slot.transform, stx-slot.transform, stx-slot.transform` |

**M1 is the row that carries AC #8**, and the reason is what it does NOT say. The at-rest Gate B
row stayed green under the mutation (observed, line 5) — nothing had moved yet, so nothing had
written a transform. The claim is only reachable AFTER travel, which is what R11 has always been
for. And the naive fix — "allow a style attribute on a slot" — would be **green here**: the
offender is a property, not a presence, and only a per-property read can name it.

#### H2 — the observers' `attributeFilter`, which nothing covered

`system/studio-layers.mjs` and `system/studio-minimap.mjs` both watch `attributeFilter: ["style"]`,
because a position IS a style property now where it used to be a pair of data attributes. If either
filter names the wrong attribute the surface FREEZES for the whole of a move while the page
otherwise works perfectly: the node travels, the announcement fires, the history entry lands, and
only the mirror is stale. Invisible to build-checks (no browser), to drift-check (no artifact) and
to the pixel gate (the map is captured at rest, where a frozen cell is in the right place anyway).

| | Mutation | Observed |
|---|---|---|
| **control** | none | `── chromium: 525 passed, 0 failed` |
| M1 | `studio-minimap.mjs`'s per-node observer pointed at `["data-col"]` — an attribute nothing writes | **RED ×2** — `#221 · H2 · the map's cell tracked a move that changed ONLY a style property …  {"before":{"x":0,"y":312,…},"after":{"x":1180,"y":156,…}}`, and the positive row it hangs off with it. The node moved; its cell did not |

**What the mutation's OWN output shows, and it is the whole point of the row:** the run reached
487 green before this, and the page it was driving worked. The node travelled to 1180, 156. The
announcement fired. The history entry landed. Only the map was stale — one frozen rectangle among
six correct ones, which is what "the surface freezes with the page otherwise working" means and
why no gate that does not look at the running rail can see it.

#### F1 — the smooth-scroll wait was watching a scroller that never moved

**Found by a real red on the three-engine run, after the row had already been "fixed" twice.** It
sits in this section rather than among the product defects because the module was right throughout:
`system/studio-verbs.mjs` is untouched by it. It is recorded at length because the failure shape —
a check that gets *closer* to green on every revision — is the one that reads as "nearly right" and
is in fact "measuring the wrong quantity".

`scrollSettled` exists because `pointOnStage` converts every `pointermove` through a LIVE
`scroll.getBoundingClientRect()`. Playwright drives the mouse in CLIENT coordinates, so a page
still sliding under a stationary pointer moves the rect while `clientY` stays put, and the
difference is added to the gesture's stage delta pixel for pixel. That much the helper's header
already said. **What it had wrong was which scroller.** The setup calls `scrollIntoView` on
`[data-studio-canvas]`; `.stx-scroll` is that element's DESCENDANT, not its ancestor, so the scroll
it starts belongs to the WINDOW — and `system/components.css:27`'s `html { scroll-behavior: smooth }`
makes it a smooth one. Sampling `.stx-scroll` alone sampled something that had never moved: it
agreed with itself twice immediately and returned while the window still had pixels to travel.

The AC #1 row's overshoot, every figure observed on firefox against a keyboard path that reaches
exactly 156:

| Wait | Overshoot | |
|---|---|---|
| none | **18.43** | |
| rounded, `.stx-scroll` | **8.35** | |
| unrounded + two agreeing samples, `.stx-scroll` | **4.98** | the three-engine run — smaller again, still red |
| *probe, arm A — the same key, head to head* | **4.50** | settled after 2 iterations |
| *probe, arm B —* **`+ window.scrollX/Y` in the key** | **0.000** | settled after 9 iterations |

**Both keys were run in one probe against one page**, so the control is measured rather than
asserted: the old key overshot, the new key did not, on the same engine in the same minute. The
probe also printed the window's own settle curve — `window.scrollY` 0 → 387 by t+300 ms, which is
exactly where the setup's fixed wait ends, and not still until 395 at t+550 ms. The fixed wait was
never long enough; the three revisions of `scrollSettled` were each buying a little more of the
tail by accident.

**A SECOND SITE, found by auditing rather than by waiting for it.** Rather than fix the one row and
pay for another three-engine run to meet the next, every `mouse.down()` in the file (19 of them) was
listed against the nearest preceding scroll signal and the nearest following assertion. Exactly one
other pointer gesture sat behind a bare smooth `scrollIntoView` while asserting a tight delta:
`framesPass`'s pointer resize, which had no `scrollSettled` at all. It duly reds on firefox in the
same run:

| | Observed |
|---|---|
| `#219 · AC #3 · a POINTER drag of the corner resizes the frame by one pitch (±2px)` | `{"w":"456px","h":"454.316650390625px"}` against `WANT {"w":"456","h":"452"}` |

**The width is exactly right and only the height is over**, by 2.32 against a ±2 tolerance — which
is the signature rather than a detail: a window scroll has no x component, so a residual that lands
in `h` and not in `w` names its own cause. The fix is `scrollSettled` before the handle's box is
measured, after `scrollIntoViewIfNeeded`, so both scrolls on that page are covered.

The other seventeen gestures are either behind an existing `scrollSettled`, behind a
`behavior: "instant"` scroll, or assert something a few pixels cannot change ("the arrangement
changed", "the block genuinely moved"). They were left alone deliberately: a speculative wait added
to a passing row buys nothing and hides the next instance of this class.

## Validation results

### Phases 0–7

| Command | Observed |
|---|---|
| `node --check` on every edited `.mjs` | clean, after every edit |
| `node tooling/build-checks.mjs` | **`build ✓  all 36 groups pass`, exit 0** |
| …with `portal/node_modules` moved aside | **`build ✓  all 36 groups pass`, exit 0** — CI's own condition, reproduced once because this PR adds `portal/lib/canvas-store.mjs` |
| `node tooling/vt-verify.mjs` (three engines) | **159 green, 0 failures**, matching the base tree's own run exactly. **First run timed out** on the reduced-motion compile click; the re-run on the same tree passed, and an isolation probe with vt-verify's exact context could not reproduce it — a known-flaky surface, named rather than buried |
| `node tooling/vt-stack-audit.mjs /studio.html` | ✓, and ✓ again under a naming probe once `.stx-arrows` gained its explicit z-index |
| the page-error sweep (12 pages, chromium) | ✓ all clean — and proven able to fail twice, on the two regressions it caught |
| MVP 14's spine on chromium + firefox + webkit | ✓ 10 assertions per engine |
| `node tooling/drift-check.mjs` | **✓ thirteen legs** — syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| `node tooling/token-lint.mjs` | **✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid** |
| the DoD grep (AC #1's seven) | **80** lines across 2 files, from 435 across 15 — both of them journey drivers |
| `node tooling/vt-stack-audit.mjs /studio.html` | **✓** — and **vacuously**: `0 named element(s)`. The studio names nothing for a view transition, which its own module header claims and this confirms |
| `node tooling/vt-stack-audit.mjs /factory.html` | **✗ 1 state with layout shift**, 294 elements — **and BYTE-IDENTICAL on the base tree at `287445e`**, driven from a clean detached worktree on a second private port. Not this PR's (see H8) |
| the journey drivers, `vt-verify`, `vt-stack-audit` | **not run** — Phase 8 |
| the pixel gate | **not run** — Phase 9 |

### Phase 8

Every figure is from a run of the whole file on this tree, at the serve on a private port
(`PORT=4791`), with the driver's own stale-serve guard green.

| Command | Observed |
|---|---|
| `node --check` on every edited `.mjs` | clean, after every edit |
| `node tooling/build-checks.mjs` | **`build ✓  all 36 groups pass`**, after each of the six source fixes |
| `node tooling/drift-check.mjs` | **✓ thirteen legs**, with `system/loc-summary.json` regenerated and STAGED first — `--check` against an unstaged tree is a false green (repo memory) |
| `node tooling/token-lint.mjs` | **✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid** |
| `node agent-layer/gen-param-count.mjs --check` | **✓ 121 controls — no drift.** Phase 8 adds no control |
| `node agent-layer/gen-loc-summary.mjs` | runtime **31,400 → 31,500** — a Phase 9 cascade, see below |
| the page-error sweep (12 pages, chromium) | **✓ all clean** |
| MVP 14's spine, chromium + firefox + webkit | **✓ 10 assertions per engine, 0 page errors** |
| `node tooling/vt-stack-audit.mjs /studio.html` | **✓** — `0 named element(s)`, vacuously, which is what the module's own header claims |
| `node tooling/vt-stack-audit.mjs /factory.html` | **✗ 1 state with layout shift** — H8's, unchanged: the SAME state (`at rest`) and the SAME three named elements (`site-header`, `nav-active`, `page-title`), all site chrome, none of it the canvas's. The element count moved **294 → 304** because P1's fix means more of the page now renders where it belongs; the finding did not move |
| `node tooling/catalog-journey.mjs chromium` | **✓ 33 passed, 0 failed** — the renderer changed under it (Task 4.4) |
| `node tooling/studio-journey.mjs chromium` | **`── chromium: 525 passed, 0 failed`** |
| `node tooling/studio-journey.mjs all` | **`── chromium: 525 passed, 0 failed` · `── firefox: 521 passed, 0 failed` · `── webkit: 521 passed, 0 failed`**, `studio-journey ✓`, exit 0. The 4-row gap between chromium and the other two is the CDP frame check, which is chromium-only by definition. Firefox reached this only after **F1** — the run before it was `520 passed, 1 failed`** |
| `node tooling/vt-verify.mjs` | **✓**, exit 0 — /build, three site-wide surfaces, the studio canvas and /factory's replay, compile, take-over, keep-rail, method and #217 verbs, on all three engines. **And its movement proof reddened by MUTATION**: the canvas position read pinned to a constant gives `vt-verify ✗ 3 assertion(s) failed`, one per engine — with `zoom` still moving 1 → 1.25 and `box` still moving, so the failure is the position term alone and "zero pseudos after movement" is not vacuous** |
| `node tooling/instance-journey.mjs chromium` | **✓ chromium: 25 passed, 0 failed**, exit 0 — a fresh instance built from THIS `system/` into a tmpdir outside the repo, so all six product fixes rode along. The stage's place count read through the page's own config chain against the SERVED board file (5 places), the compile beat end to end, the declined `?b=` mount, zero non-2xx across the visit and no page errors** |
| the DoD grep (AC #1's seven symbols) | **0 lines over `system/`, `tooling/` and every `*.html`** — AC #1's own scope, from 435 across 15. Counted rather than asserted, the rest of the tree still carries **343** lines in **38** files, and every one is a planning or review document: `docs/epics/*.architecture.md`, `__canvas_planning_PRD.md`, and `.claude/plans/` + `.claude/code-reviews/`. That is correct — they are the historical record of the decision, not live code — but "empty everywhere outside `docs/`" would not have been true, so it is not claimed |

**Every figure in both tables is from a clean run of the whole file.** The Phase 1 red table above
is the exception and says so in its own words: it is probe-derived, because a link error loads zero
groups and there was no clean run to be had. The RUNNING page, which the Phases 0–7 table could not
reach at all, is what the Phase 8 table adds: three engines through `studio-journey`, `vt-verify`
and `catalog-journey` on chromium, a built instance through `instance-journey`, and the twelve-page
error sweep. What no figure here covers is a HUMAN's read of either surface — Level 5 is the
owner's own, and this PR does not write it.

### Phase 9

Driven from a CLEAN DETACHED WORKTREE at `48ad1c0` under `/Users/Berzins/Documents/wt-302-vr`
(not `/private/tmp` — Docker file sharing), carrying the 9.1 spec edit and nothing else, so the
captures are of the committed tree plus the one deliberate change.

| Command | Observed |
|---|---|
| `npx playwright test --list` after 9.1 | **`Total: 33 tests in 1 file`** — 11 pages × 3 packs, up from 22 |
| `npm run update:docker` | **`33 passed (1.0m)`**, exit 0 |
| `git status --short …/baselines` | **11 added + 4 modified = 15 written, 33 files after** — the plan's arithmetic, counted |
| the 11 added | one `*-verdant.png` per page |
| the 4 modified | `factory-{neutral,saulera}.png` (P1 + P2) · `approach-{neutral,saulera}.png` (`loc-summary` 31,400 → 31,500) |

**The approach pair was FORCED by `rm`-ing both PNGs first**, and that is the row that would
otherwise have gone wrong silently: its only change is a few digits, and `maxDiffPixels: 100`
swallows that, so `update:docker` would have reported them unchanged and left a stale number in a
committed baseline. The other thirteen were left to the comparison to decide.

**`studio.html` did not cascade and could not**: `PAGES` is eleven entries and neither `studio.html`
nor `instance.html` is among them, which the `git status` above confirms by producing no such file.

**Not reachable here**: a green local Docker run is not CI green — `gh pr checks` is the gate that
counts, and the verdant `/factory` capture legitimately shows the proto iframes in their OWN pack,
because custom properties do not cross document boundaries (#268).

## Not run

Everything below is a plan step that did not execute. None of it is blocked by an external
dependency — all of it is remaining work.

| Step | Why | Tracker |
|---|---|---|
| Level 5, by hand in a real browser | the owner's own read | this PR |
| the SDK-free reproduction (`mv portal/node_modules …`) | run once at Phase 2 and green; not re-run, because Phase 8 adds no module to `portal/lib/` | this PR |
| the owner's verdict on `/factory` | the owner's own hand, and the plan says this PR must not write it | epic close-out |

**Nothing in Phase 8 spent a token or needed a credential**, as the plan predicted.

## Deviations from the plan

**D1 — `ZOOM_REST` is deleted, against Task 1.1's IMPLEMENT and VALIDATE lines.** *(plan error,
AMENDMENT A1.)* D-e decides the opposite of the task, with reasons, and D-e is right: all 30
consumers treat it as an index into the deleted table. The observed export list is
`FRAME_CLASS MOVABLE getCanvas initStudioCanvas`, not the task's five.

**D2 — Task 1.7's per-group red was produced by a scratch probe, not by commenting imports out one
group at a time.** *(plan error, AMENDMENT A2.)* The recipe as written reaches one group per run.
The probe, its output and its disposal are in the Phase 1 section.

**D3 — Task 1.5b covered five places, not three.** *(plan error, AMENDMENT A3.)* Two of the extra
three are live mechanism (~45 lines in `studio-keep.mjs` plus its producer in `studio.mjs`), not the
copy string the task's GOTCHA describes. A fourth `g`-dependent driver assertion is AMENDMENT A4.

**D4 — Task 1.2's `--h` height rule and the widened `is-panning` selector landed in Phase 1**,
against the phase header's "do not fix anything in this phase". Task 1.2's own GOTCHA instructs both,
and the more specific instruction wins: deleting the span tables without the height rule leaves every
frame at its content height. Neither reddens or greens a gate.

**D5 — the CSS substrate (Task 3.2's half) landed in Phase 2 as "Task 2.0b".** Group 12's mirror
assertions have no subject unless `.stx-sizer`, `.stx-stage` and the shared four-family position rule
exist. This is the same circularity the plan's Phase 2 header resolved by pulling Task 2.0 forward,
and the same resolution. It is **larger than 3.2's CSS half**: the shared four-family position rule
is not placed anywhere explicitly in the plan.

**D6 — `setScale(root, s)` takes the variable scope, not the stage.** The plan pins
`setScale(stage, s)`. Two elements on different branches read what it writes — `.stx-stage` reads
`--stx-scale`, and `.stx-sizer`, the stage's **parent**, reads the two extent values — and a custom
property inherits **down**, so no write on the stage can reach the sizer. The one ancestor of both is
`.stx-viewport`, which is also where `studio.css` already declares `--stx-scale`. Shape, arity and
group 7 budget are unchanged.

**D7 — group 5's coordinate family was rewritten, not cut.** Task 2.8 says groups 4 and 5 "lose
cases". The Phase 1 probe showed group 5 asserting `v: 3 was ACCEPTED — it must reject the whole
payload`: a version-boundary case the codec change made false. Cutting it would have deleted the
version boundary. It is now v2/v4/v0 refused and a real v3 encode accepted, with the 20 coordinate
cases becoming 10 retired-field cases that assert the refusal is **by name**.

**D8 — `rankLayout` is ONE function in `system/board-ops.mjs`, not two copies.** Task 3.5 says
"in BOTH copies"; the plan's own GOTCHA calls the duplication the defect. `studio.mjs` imports
`replay-driver.mjs`, so the shared rule cannot live in either — `board-ops.mjs` is what both already
reach for, and a layout over a board is a board read (`discovery/ops.mjs`'s five-reads precedent).

**D9 — `arrangeBoard` truncates nothing, and the truncation notice is deleted.** The plan does not
name this. The old rule broke at the twelfth column; free positions have no such bound, so
`summary.places > arranged.length` can no longer become true and the sentence describes a state
nothing produces. Group 14's `MAX_PLACES < MAX_COLS` tripwire is deleted with the cap it guarded
rather than translated into a bound #302 never introduced.

**D10 — group 26's junk floor moves from 1 to 0.** A free stage really does start at 0; coercing to
1 would be inventing an offset.

## Assumptions carried

1. **The plan's own decisions D-a through D-e are taken as binding**, including D-c's five-argument
   `setPos` and D-d's "nothing blocks a free move" — which is why `occupancyKey`, `spanFrom`,
   `UNIT_SPAN` and `occupancyExcept` were deleted as orphaned rather than translated.
2. **S1's verdict is inherited, not re-run** — configuration (a), no `content-visibility`. Its
   named mitigation (coalescing the scale write) is implemented in `queueScale`, and Phase 8.4 has
   now **taken the measurement**: `perfPass`'s 26 rows against the 200 ms budget, on the new
   substrate, with the calibration click proving the observer pipeline alive on every engine and
   the synthetic 250 ms interaction proving the comparator can still flag.
3. **The stage keeps the retired grid's exact outer dimensions** (2,816 x 1,232 = 12x220+11x16 by
   8x140+7x16). Chosen so the canvas is the size it has always been rather than a size nobody
   decided; it also keeps the pixel baselines as close as the change allows.
4. **`MIN_SIZE = 24`** is WCAG 2.2 SC 2.5.8's minimum target size. The plan names no floor; a node
   resized below one cannot be picked up by pointer again.
5. **`DRAG_SLOP = 4`** replaces the marquee's cell-crossing threshold. The plan names no
   replacement; a cell crossing needed no literal and a pixel does.

## Additions beyond the plan

1. **`rankLayout` in `system/board-ops.mjs`** — see D8.
2. **`NODE_W` / `NODE_H` / `NODE_GAP` exported from `studio-canvas.mjs`.** The plan names `STAGE_W`
   and `STAGE_H` only, but four consumers need a pitch (`arrangeBoard`, `replay-driver`,
   `studio-select`'s keyboard step, `studio-minimap`'s keyboard pan) and a literal in each is four
   copies that drift.
3. **`MENU_W` / `MENU_H` exported from `studio-select.mjs`** — `menuAnchor`'s flip threshold needs
   the menu's own size once "the last column" stops existing.
4. **The DOM stub gained a custom-property `style`** plus three control assertions, including one
   proving each element gets its OWN style object. Without it group 12's `setPos` battery cannot run.
5. **Both MutationObservers' `attributeFilter` changed to `["style", …]`** (`studio-layers.mjs`,
   `studio-minimap.mjs`). Not in the plan, and load-bearing. The coverage gap it left — **H2** —
   is **CLOSED** in Phase 8: `minimapPass` now asserts that a map cell tracked a move which
   changed only a style property, and the mutation table shows the row going red when the filter
   names an attribute nothing writes.
6. **The codec probe** (`scratchpad/codec-probe.mjs`, not committed) — its text is reproducible from
   the Proving-the-checks table.
7. **`STYLE_ALLOWED` + `strayStyles()` in the driver** (Phase 8). Gate B was nine scattered
   `hasAttribute("style")` reads; it is one array and one helper now, so the allowed set cannot
   drift between call sites.
8. **`places()` in `selectPass`** (Phase 8). Three rows compare an arrangement ACROSS a compile or
   a redraft, and `slotsNow` reports the MEASURED height for a node with no authored one — which a
   compile legitimately changes. Projecting to `[id, x, y]` is what keeps "every member back at
   its origin" a claim about position. Without it the row reds on correct code, which is exactly
   how a good check gets weakened.
9. **`rankLayout` imported by the driver** (Phase 8), for the reason its import block already
   states: the expected position of every block on `/factory` is computed from the board the page
   itself fetched, never typed.

## Issues encountered

**H1 — A REAL REGRESSION, FOUND BY READING AND FIXED BY MEASURING: `animateTo` overrode every node's
position.** `system/studio-verbs.mjs`'s FLIP keyframed `transform`, and since Task 2.0b every node
carries `transform: translate(var(--x), var(--y))` from the sheet. A Web Animations keyframe on
`transform` REPLACES the computed value rather than adding to it.

**Measured on chromium, firefox and webkit** with the real rule, before writing the fix: a node at
rest at 300,200 given `[{transform:"translate(-40px,-30px)"},{transform:"none"}]` renders at
**-40,-30** — it snaps to the stage origin, applies the delta from there, and slides back. Not a
subtle wrongness: the node leaves the canvas on every undo. Keyframing the independent `translate`
property composes instead (CSS Transforms 2 applies the individual properties BEFORE `transform`):
same probe, same three engines, **260,170** — exactly rest minus the delta.

`composite: "add"` is the other correct answer and was not taken: it makes the keyframes' meaning
depend on a second, less-read option, and `{transform: "none", composite: "add"}` reads as a no-op.

**Nothing gates this.** The module's own header records that both halves matter — the source-text
budget AND the running-page assertion — and neither reaches an animation's composite behaviour. It
was found by reading the module while migrating it, and it would have shipped green.

**H2 — A COVERAGE GAP I INTRODUCED, NOW CLOSED (Phase 8).** `studio-layers.mjs` and
`studio-minimap.mjs` observe `["style", …]` instead of the four position attributes. If either
filter is wrong, the layers list and every minimap cell freeze for the whole of a move — silently,
with the page otherwise working. **No gate on the pure layer can see it** (both observers are
mount-only), and neither can drift-check (no artifact) or the pixel gate (the map is captured at
rest, where a frozen cell is in the right place anyway).

`minimapPass` now carries the row, beside the positive proof it hangs off: an injected agent move
changes only a style property, and the map's cell must be at `nodeRect`'s answer for the wrapper's
NEW box afterwards. `layersPass`'s pointer-drag row is the same claim for the list. The mutation
table above shows the minimap row going red when the filter is pointed at an attribute nothing
writes.

**H3 — The gate is a hard stop, not a report.** `group()` (`build-checks.mjs:315`) has no try/catch
and the group bodies are bare top-level blocks, so one `ReferenceError` ends the run and every group
below it goes unreported. This shaped Phase 1's probe, and it is why the current run says nothing
about groups 23-34.

**H8 — `vt-stack-audit` is red on `/factory.html`, it is NOT #302's, and `gates.md` understates the
surface.** Run before writing Phase 3.4's overlay, for the before-reading the plan's GOTCHA asks for.
Observed: `✗ 1 state(s) with layout shift`, 294 elements. The same script run against the **base tree
at `287445e`** — a clean detached worktree, served on its own port, `curl`-verified to be the base by
the absence of #302's `--stx-extent-w` rule — produces **byte-identical output**, the same eight
sample rows and the same numbers. So it predates this PR.

`gates.md:158` records this class of false positive as affecting "`/index` and `/roundtrip` (2 of the
7 shipped IA pages)", with #190 as the fix. **`/factory` is a third and is not on that list**, so the
prose understates it. Not fixed here — #190's, and `vt-stack-audit` is operator-run rather than a
merge blocker (`gates.md:7`).

**H9 — `vt-stack-audit` cannot see the hazard #302 actually introduces, and this matters for 3.4.**
Its instrument is name-removal: `for (const e of document.querySelectorAll("[style*='view-transition']"))
e.style.removeProperty("view-transition-name")`, measure, compare. It detects a containing block
created by a **`view-transition-name`**. Every node on this canvas is now a containing block for
absolutely positioned descendants because it carries a **`transform`** (CSS Transforms 1 §3) — a
different property, which name-removal does not touch.

The proof is the `/studio.html` run above: a page saturated with transforms and therefore with
containing blocks reads `✓ nothing moves`, because there are no names to remove. It is the right
gate to run before NAMING anything — which is what the plan's GOTCHA says — and it is **not** the
detector for the overlay's coordinate space. Phase 3.4's overlay is absolutely positioned inside a
stage that carries `transform: scale(...)`, so its coordinate space is the stage's; **nothing in the
repo currently gates that**, and it needs its own running-page assertion in Phase 8 measuring an
arrow's endpoints against the node positions it claims to connect.

**H4 — Three plan anchors were wrong by a line or two**, and were resolved by content instead:
`studio-verbs.mjs`'s `createHistory` comment is at :287 not :286, `keepPass`'s republish call is
indented 6 not 8, and `studio-canvas.mjs`'s `removeAttribute` is indented 8 not 6. All three would
have been silent mis-cuts under a line-range edit.

**H5 — `studio-frames.mjs`'s prose rewrite needed two passes** — the first left an ungrammatical
sentence. Caught by reading it back.

**H6 — Group 24 threw `fClampSpan is not a function` in the Phase 1 probe.** It destructures the
canvas's exports under local aliases (`FMAX_COLS`, `fClampSpan`, `fFootprint`). Whoever rewrites 24.3
should resolve those aliases first.

**H7 — I committed a group line describing an assertion that did not exist.** Group 13's line at
`e7d1858` claimed a `--h` deep-compare case. It was caught on review and the case now exists and is
proven able to fail (Proving the checks, Task 2.2) — but the failure mode is worth recording: a group
line in this file is prose a reader trusts, and writing it from the plan rather than from the code is
how the repo's largest class of process finding gets in through a door no gate watches.

## Resume order

Every phase is complete and green. What is left:

1. **Level 5** — the owner's own read of `/factory` and `/studio.html` in a real browser, and their
   verdict, which this PR must not write. **It is the only step left.**

**One assertion still owed**, and nothing covers it: **H9**'s overlay coordinate space.
(**H2**'s `attributeFilter` check landed in `minimapPass` — see Issues.)

**One design call parked rather than taken**: the `/factory` menu is both `setPos`-clamped and
`translate: -100%`-flipped within a menu's width of the right edge, so it renders up to `MENU_W`
left of the component it belongs to. The clamp alone would keep it on the stage. The driver
asserts the shipped geometry and names the gap in its own comment.
