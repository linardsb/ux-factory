# Implementation Report — the swap PR: the grid retired, the free substrate, `canvas-ops.mjs`, MVP 14's spine

**Plan**: `.claude/plans/canvas-swap-grid-retired-free-substrate-302.md`
**Branch**: `feature/canvas-swap-grid-retired-302`
**Base**: `287445e` → `1a36462`
**Status**: **PARTIAL** — Phase 1 complete, Phase 2 about 80% complete, Phases 3-10 not started.
The tree is RED and knowingly so: this is a one-way-door PR whose only green checkpoint is Task 2.9,
and that checkpoint has not been reached. **This branch is not ready for a PR.**

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

Six commits on `feature/canvas-swap-grid-retired-302`, each a recoverable checkpoint inside the door:

| SHA | What |
|---|---|
| `53f3ab7` | Phase 1 — the grid deleted, seven groups seen red |
| `e7d1858` | Phase 2 wip — the two helpers, groups 7, 12, 13, 4 |
| `53dab42` | the rank layout, groups 14, 5, 4 |
| `a4e2053` | the canvas mount and the selection, on free positions |
| `993a215` | the layers list and the minimap |
| `1a36462` | groups 26 and 27 |

**The DoD grep: 435 lines across 15 files → 134 across 4** (observed, AC #1's seven symbols).
Every module under `system/` is clear of it **except `system/studio-verbs.mjs`** (20).

| File | Remaining | Why |
|---|---|---|
| `tooling/studio-journey.mjs` | 70 | Phase 8, untouched except Task 1.5b's two deletions |
| `tooling/build-checks.mjs` | 34 | groups 22 and 24, plus the file's own header index at :55/:110/:121 |
| `system/studio-verbs.mjs` | 20 | the gesture mount — the one source module not migrated |
| `tooling/vt-verify.mjs` | 10 | Phase 8 |

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

- **Phase 2**: groups 22 and 24, `system/studio-verbs.mjs`'s gesture mount, `studio-frames.mjs`'s
  `FRAMES` literals, the `build-checks.mjs` header index at :55/:110/:121, and Task 2.9's checkpoint.
- **Phase 3**: 3.3 `snapshot`/`restore`/`applySlot`/`applySpan`, 3.4 the SVG arrow overlay and its
  `vt-stack-audit` run. (3.1, 3.2's mount half and 3.5 are done.)
- **Phases 4-10 entirely**: `canvas-ops.mjs` · `device-presets.mjs` · group 35 · the `id` node key ·
  the verbs and announcements · the spine and its package · group 36 · every generator · the three
  journey drivers on three engines · the INP gate · the 15 baselines · the prose.

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

## Validation results

| Command | Observed |
|---|---|
| `node --check` on every edited `.mjs` | clean, after every edit |
| `node tooling/build-checks.mjs` | **FAILS** — `ReferenceError: MAX_COLS is not defined`, thrown by group 22, whose rewrite is Task 2.5 |
| groups reached and green before that throw | 1-21 and 23-27 as far as the run gets; the throw is a hard stop, so nothing past group 22 is observed |
| the DoD grep (AC #1's seven) | **134** lines across 4 files, from 435 across 15 |
| `node tooling/drift-check.mjs` | **not run** — its `build-checks` leg cannot pass while the gate throws |
| the journey drivers, `vt-verify`, `vt-stack-audit` | **not run** — Phase 8 |
| the pixel gate | **not run** — Phase 9 |

**No figure in this report is derived from a green gate.** The only gate output that reached a
conclusion is the Phase 1 red probe, which is reported as a red.

## Not run

Everything below is a plan step that did not execute. None of it is blocked by an external
dependency — all of it is remaining work.

| Step | Why | Tracker |
|---|---|---|
| `build-checks.mjs` to completion | group 22's rewrite (Task 2.5) is not done, and it throws | this PR |
| `drift-check` · `token-lint` | both meaningless while the pure gate throws | this PR |
| `studio-journey all` · `catalog-journey all` · `instance-journey` | Phase 8; the studio does not mount at all in this state | this PR |
| `vt-verify` · `vt-stack-audit` | Phase 8; and 3.4's overlay, the thing `vt-stack-audit` exists to check here, is not written | this PR |
| the baseline regeneration | Phase 9 | this PR |
| Level 5, by hand in a real browser | nothing renders yet | this PR |
| the SDK-free reproduction (`mv portal/node_modules …`) | Phase 4 adds the module it would test | this PR |
| the owner's verdict on `/factory` | the owner's own hand, and the plan says this PR must not write it | epic close-out |

**Nothing here spent a token or needed a credential**, as the plan predicted.

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
   named mitigation (coalescing the scale write) is implemented in `queueScale`, **but no INP
   measurement has been taken on this substrate.** Phase 8.4 owns that.
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
   `studio-minimap.mjs`). Not in the plan, and load-bearing: a position is an inline style now, so a
   stale filter leaves the layers list and every minimap cell frozen for the whole of a move. **No
   gate on the pure layer can see this** — it is a Phase 8 assertion that does not exist yet.
6. **The FLIP animation hazard is NOT yet addressed, and it is the highest-value thing to check
   first next session.** `studio-verbs.mjs`'s `animateTo` animates `transform`; every node now
   carries `transform: translate(var(--x), var(--y))`, so a `transform` keyframe would OVERRIDE the
   position and snap the node to the origin for the animation's duration. The fix is to animate the
   independent `translate` property instead, which composes. Recorded here because it was found while
   reading the module and the module is not yet rewritten.
7. **The codec probe** (`scratchpad/codec-probe.mjs`, not committed) — its text is reproducible from
   the Proving-the-checks table.

## Issues encountered

1. **The gate is a hard stop, not a report.** `group()` (`build-checks.mjs:315`) has no try/catch and
   the group bodies are bare top-level blocks, so one `ReferenceError` ends the run and every group
   below it goes unreported. This shaped Phase 1's probe and it means the current `build-checks` run
   says nothing about groups 23-34.
2. **Three plan anchors were wrong by a line or two** and were resolved by content instead:
   `studio-verbs.mjs`'s `createHistory` comment is at :287 not :286, `keepPass`'s republish call is
   indented 6 not 8, and `studio-canvas.mjs`'s `removeAttribute` is indented 8 not 6. All three would
   have been silent mis-cuts under a line-range edit.
3. **`studio-frames.mjs`'s prose rewrite needed two passes** — the first left an ungrammatical
   sentence. Caught by reading it back.
4. **Group 24 threw `fClampSpan is not a function` in the Phase 1 probe** — it destructures the
   canvas's exports under local aliases (`FMAX_COLS`, `fClampSpan`, `fFootprint`). Whoever rewrites
   24.3 should resolve those aliases first.
