# Implementation Report — the swap PR: the grid retired, the free substrate, `canvas-ops.mjs`, MVP 14's spine

**Plan**: `.claude/plans/canvas-swap-grid-retired-free-substrate-302.md`
**Branch**: `feature/canvas-swap-grid-retired-302`
**Base**: `287445e` → _(filled at report time)_
**Status**: IN PROGRESS

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

## Tasks completed

_(filled per phase)_

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

_(filled per phase)_

## Not run

_(filled at report time)_

## Deviations from the plan

_(filled per phase)_

## Assumptions carried

_(filled at report time)_

## Additions beyond the plan

_(filled at report time)_

## Issues encountered

_(filled per phase)_
