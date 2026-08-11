# Implementation Report — Studio 15: full canvas affordances (#217)

**Plan**: `.claude/plans/studio-canvas-affordances-217.md`
**Branch**: `feature/studio-canvas-affordances-217`
**Status**: COMPLETE (one stated exception — the real-Safari / real-Chrome manual pass was not run; see *Not done*)

## Summary

The studio canvas gains marquee multi-select, multi-move, alignment guides and a context menu, all
with keyboard parity, over the same grid-slot grammar #204/#205 established. One new module
(`system/studio-select.mjs`, the SELECTION layer) plus one extension (`system/studio-verbs.mjs`, whose
gesture now holds a list). Selection is DOM state on the wrapper, so the verbs read it live at pick-up
with no cross-module handle and a board redraft clears it for free. Exactly one new bus verb —
`ui.move-group` — joins the existing consumer block; selection deliberately stays off the bus. Both new
modules write zero inline styles and join `build-checks` group 7 with no exception argued.

## Tasks completed

| # | task | file(s) |
|---|---|---|
| 1 | pure group functions + `SPOKEN_MAX` hoisted to module scope and exported | `system/studio-verbs.mjs` (UPDATE) |
| 2 | the selection layer's pure half | `system/studio-select.mjs` (CREATE) |
| 3 | group 13 grown · group 22 born · group 12's CSS mirror widened to 3 families · group 7 `MODULES` | `tooling/build-checks.mjs` (UPDATE) |
| 4 | the gesture holds a list; `pickUp`/`preview`/`drop`/`cancel`/`clearGesture` over N members | `system/studio-verbs.mjs` (UPDATE) |
| 5 | the `ui.move-group` consumer + `renderGuides` + the help line's second sentence | `system/studio-verbs.mjs` (UPDATE) |
| 6 | the mount: marquee, Shift-click, keyboard verbs, APG context menu, document Escape | `system/studio-select.mjs` (UPDATE) |
| 7 | `.is-selected` · `.stx-guide` 12+8 · `.stx-menu` 12+8 + flips · reduced-motion off-ramp | `system/studio.css` (UPDATE) |
| 8 | the third mount in both hosts | `studio.html`, `system/studio.mjs` (UPDATE) |
| 9 | `selectPass` (13 sections) · 4 INP rows · the Fit-while-compiled row · the printed bounds sentence | `tooling/studio-journey.mjs` (UPDATE) |
| 10 | #217 samples in both blocks, each with its own movement precondition | `tooling/vt-verify.mjs` (UPDATE) |
| 11 | two `/factory` entries + regenerated count (111 → 113, exactly +2) | `system/param-manifest.json`, `system/param-count.json` |
| 12 | `loc-summary` regenerated; four pixel baselines regenerated | `system/loc-summary.json`, `tooling/visual-regression/baselines/` |
| 13 | this report | `.claude/reports/` |

## The mutation sweep — six rows, six named cases (Task 3)

Each mutation was applied to the working tree, `build-checks` re-run, and the **named** case that went
red recorded. All six were reverted; `git diff` over `system/` afterwards showed only the ticket's real
edits. None shipped.

| # | mutation | group | the NAMED case that went red |
|---|---|---|---|
| 1 | `groupDelta` returns the partially-moved set instead of the input when blocked | verbs | *"a step blocked by a NON-MEMBER peer returns the set unchanged, never partially moved"* — by **deep equality**; the cell-collision guard and the input-identity assertion also fired |
| 2 | `groupOccupancy` excludes only the anchor rather than every member | verbs | *"groupOccupancy … must exclude EVERY member and keep every non-member"* + *"members do not block each other — a step INTO a cell another member is vacating is allowed"* |
| 3 | `guidesFor` drops the peer requirement | verbs | *"a column occupied ONLY by carried members draws NO guide — the peer half of the rule"* (+6 more) |
| 4 | `extendSelection` unions with a stray instead of replacing | select | *"extendSelection's rectangle reached a cell outside the anchor→cursor rectangle — it must REPLACE the selection, never union with a stray Shift-click"* |
| 5 | `menuAnchor` flips at `>` instead of `>=` | select | *"the last COLUMN flips only the X axis"* (`menuAnchor(12, 7)`) + the last-row and far-corner twins |
| 6 | `menuItems` returns both `Select this` and `Deselect this` | select | *"the selected node's menu offers BOTH select and deselect…"*, asserted **both ways** |

A seventh, unplanned mutation ran for free: my own group-13 fixture put five members on one column, and
the loop's *"put two members on one cell"* guard caught it before the case shipped.

## Tests added

No suite exists in this repo (CLAUDE.md) — "done" is the gates that own the surface.

**`tooling/build-checks.mjs`** — group 22 (`select`, new) and group 13 (`verbs`, grown):
- group 22: `marqueeRange` normalized identically from all four drag directions + clamped; `idsInRange`
  inclusive on all four boundaries with the four just-outside twins refused, order preserved;
  `extendSelection` asserted to BE `marqueeRange` over the same corners **and** compared as resulting
  ID SETS (AC #1's pure half), the anchor proven not to re-derive from the cursor, the replace-not-union
  rule pinned on the id set, the held-key clamp on both edges, a covered cell proven NOT skipped;
  `menuItems`' contextual pair both ways and never both, `Clear` conditional, disabled flags following
  `canUndo`/`canRedo`, no invented verb, `MENU_ITEMS` frozen **by mutation** at both levels and its
  stateful items proven to be copies; `menuAnchor`'s flips on both sides of both boundaries with the
  caps proven to be parameters; totality over 10 junk inputs per export.
- group 13: `groupOccupancy` excluding every member; `groupStep`/`groupDelta` over 8 cases with every
  blocked answer asserted **by deep equality with the input**, incl. the whole-canvas selection, the
  edge, the member-vacating-a-cell case and the 1-member twin of `stepSlot`; `groupStep` proven to BE
  `groupDelta`; `guidesFor` over 9 cases incl. the carried-only column; `SPOKEN_MAX` pinned as an export.
- group 12: the CSS mirror widened from **one** selector family to **three** (`.stx-slot`, `.stx-guide`,
  `.stx-menu`), plus a derived check that no FOURTH family is placed by `data-col`/`data-row` without a
  mirror behind it.

**`tooling/studio-journey.mjs`** — `selectPass`, 13 sections on the settled shipped `/factory`, every
expectation computed in Node through the page's own `marqueeRange`/`idsInRange`: the marquee's set and
its single announcement; the keyboard path's set identity (AC #1) with the stray-Shift-click replace
proof; the group move by pointer AND keyboard (one `ui.move-group`, no `ui.move`, no `target`, one
sentence, `historyDepth` +1, one Undo restoring all); guides honest **plus the mutation** that forces
one onto a provably empty column and watches the check go red; the menu's two open paths with identical
items, full Arrow/Home/End navigation, Escape returning focus, an item press starting neither pan nor
drag; the far-edge flip and the interior non-flip and the scroll-closes rule; Escape cancelling each
multi-verb to its pre-verb state; the quick group drag; compile keeping the selection while cancelling
a carry (two rows); **both sides** of the replay take-over coupling; reduced motion; and Fit on a
compiled canvas flooring at 50 % with the honest sentence.

Plus four `perfPass` INP rows (marquee drag · group pointer-drag · group keyboard step · context menu
open), the printed bounds sentence updated 18 → 22 rows with ⌘/Ctrl+A's focus scope and D9's recorded
absence, and the success sentence's #217 clause.

**`tooling/vt-verify.mjs`** — the three new verbs sampled in the studio-canvas block (normal + reduced
motion) and in the factory block, each behind its own **movement precondition** (selection proven to
have applied, group move proven to have moved and undone, menu proven to have rendered items) before
the counter and the pseudo list are read.

## Validation results

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 22 groups pass** (7 reports `1 inline-style write across 19 modules` — `studio-select.mjs` joined with no exception argued) |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ all 12 checks |
| `node agent-layer/gen-param-count.mjs --check` | ✓ 113 controls — no drift (was 111; +2 exactly) |
| `node agent-layer/gen-loc-summary.mjs` | ✓ 3 groups; runtime 72→73 files, 26 700→27 800 lines |
| `node tooling/vt-verify.mjs all` | ✓ zero failures on chromium + firefox + webkit · **18 #217 rows** (3 per engine in the studio-canvas block, incl. reduced motion, + 1 per engine in the factory block), each behind its own movement precondition |
| `node tooling/studio-journey.mjs all` | ✓ **chromium 405 passed / 0 failed · firefox 401 / 0 · webkit 401 / 0** · **224 #217 rows** across the three engines |
| `cd tooling/visual-regression && npm run update:docker` | ✓ 22 passed · **exactly four baselines rewritten**: `factory-{neutral,saulera}.png` + `approach-{neutral,saulera}.png` |

The four new INP rows, measured on the settled `/factory` (budget ≤ 200 ms):

| row | chromium |
|---|---|
| marquee drag | 40 ms (3 entries) |
| group pointer-drag | < 16 ms — below the observer floor |
| group keyboard step | < 16 ms — below the observer floor |
| context menu open | 24 ms (3 entries) |

The below-floor readings are sound for `perfPass`'s stated reason: the forced-slow calibration click
proves the delivery pipeline alive on each engine first, so "no entry" means "< 16 ms", not "dead
observer". Spike 2's verdict was inherited rather than re-measured, as the plan directs.

**The `/approach` baselines needed forcing.** `update:docker` rewrote only the two `/factory` PNGs on
the first run — `/approach`'s change is the rendered `loc-summary` and `param-count` DIGITS
(`26 700 → 27 800`, `72 → 73` files, `111 → 113` controls), which falls under pixelmatch's per-pixel
threshold and inside the 100-pixel tolerance. Exactly the trap memories `vr-update-skips-subperceptual`
and `vr-tolerance-hides-text-changes` describe. The two PNGs were `rm`'d and the gate re-run, which
produced them. **A green `update:docker` run is not proof a page did not change**, and treating the
2-of-4 result as "nothing else moved" would have shipped two stale baselines.

**R11 (baseline collision) checked immediately before regenerating**: `gh pr list` returned no open
PRs and there is no `#219` branch, so nothing else was regenerating `/factory`'s PNGs from a different
tree. #219 is open as an issue only.

**One transient failure worth recording rather than hiding**: on an earlier run, #213's pre-existing
frame check reported a single 53.2 ms long-animation-frame in the 4×-throttled drag window (threshold
50 ms). It did **not** reproduce on a quiet machine — several Playwright browsers of my own were
running concurrently at the time — and the final run reports `zero long-animation-frame entries`. The
per-frame cost this ticket adds to a carry is bounded by CELL CROSSINGS, not by pointermoves:
`renderGuides()` is called only from `pickUp` and from the branch of `preview()` that actually moved
something.

## Deviations from the plan

1. **`preview()` keeps its name instead of becoming `previewGroup()`** (Task 4). The plan asked for a
   rename; keeping one function is what actually satisfies the task's own R3 GOTCHA. `preview` is
   invoked from three places (the rAF callback, `flushPreview`, the sticky-drop branch) and R3's lesson
   is that `flushPreview`'s two call sites cover each other and neither is individually proven. A
   second entry point would have meant deciding three times which path the group takes; there is
   nothing to decide with one function. Behaviour for a single node is unchanged.

2. **The Shift-press verb is decided by DRAG vs CLICK, not by the press target** (D2). The plan's Task 6
   said "if the press is on a `.stx-slot`, toggle that wrapper's membership and return". Implemented
   that way first, and the smoke test on the real harness caught it: on a stage packed with components
   almost every cell is occupied, so a marquee could only ever start from the empty margin — a
   Shift-drag across a 2×2 selected exactly one component. The press now starts a pending marquee
   either way and the first cell crossing decides. The threshold is a **cell**, not a pixel count, so
   it needs no literal. This is D2's own sentence ("Shift + drag … marquee-selects; Shift + click …
   toggles") implemented literally rather than approximated by the press target.

3. **Menu items use `aria-disabled`, not the `disabled` attribute** (Task 6 / Task 7). Caught by the
   driver's Home/End row: a disabled `<button>` cannot take focus, so `End` skipped straight past a
   trailing Undo/Redo pair and landed on the first item — a keyboard reader would never learn those
   items exist. WAI-ARIA APG's menu pattern wants menu items focusable-but-inert; `runItem()` refuses
   to act on one. The CSS selector moved with it. `menuItems()`'s pure `disabled` flag is unchanged, so
   group 22 is unaffected.

4. **`SPOKEN_MAX` was hoisted in Task 1's edit, not Task 5's.** It has no behavioural content and
   `studio-select.mjs` needed to import it from the moment the file existed; doing it later would have
   meant writing a temporary literal and remembering to replace it.

5. **`studio.css` written before `build-checks`** (Task 7 before Task 3). The plan couples them and
   says to land them together, which they are — the order was inverted only so group 12's widened
   mirror had something to pin while being written, rather than being red in between.

6. **Two small additions the plan did not ask for, both to close gaps the work surfaced:**
   - `data-stx-verb="undo"/"redo"` on the two verb buttons (`studio-verbs.mjs`). The menu offers Undo
     and Redo and must know whether the history can do them; it reads those buttons' `disabled` — which
     already ARE the live display of `canUndo`/`canRedo` — rather than taking a history handle
     (`studio.mjs:513-516`'s "read live rather than tracked"). An attribute rather than an index into
     `.stx-verb-btn`, because an index is a contract nothing states.
   - Group 12 gained a derived check that **no fourth selector family** is placed by
     `data-col`/`data-row` without a mirror behind it. The plan asked for three families; without this
     a later ticket adding a fourth and stopping at column 6 would fail on a reader's screen rather
     than in the gate.

7. **`selectPass` waits for `[data-replay="settled"]` AND scrolls the canvas into view.** The second
   half is not in the plan and is load-bearing: on `/factory` the studio sits well below the fold, so a
   raw `mouse.move` to a computed client coordinate lands off-screen and the press never reaches the
   stage. Playwright's `locator.click` auto-scrolls and hides this, which is why every keyboard row
   passed while every pointer row came back with an empty selection.

8. **D11's non-interference is asserted in the one direction that is reachable.** The plan asked for
   both directions (Escape during a marquee must not cancel a carry, and vice versa). A marquee cannot
   *start* while a carry is live — the module refuses, so the two Escape listeners can never both be
   armed — so the both-live state does not exist to test. The driver asserts the **guard** instead: a
   Shift-drag mid-carry changes no selection and kills no carry. That is the honest version of the
   claim, and it is stated as such in the row's own text.

9. **The plan's illustrative announcement string `"3 selected: Metric 1, Metric 2, and 1 more."` is not
   what ships.** It names two components for a count of three; `SPOKEN_MAX` is 3, so three selected
   names all three. The shipped sentence follows `SPOKEN_MAX` consistently (the same shape
   `restoreVerb` uses), which is what D12's own "reuse `SPOKEN_MAX`'s shape" instruction asks for.

10. **R5's premise is wrong for the shipped sizes, and the row was rewritten to say what is true.**
    The plan asserts that "a menu opened on a column-12 block renders off the right edge of the
    scroller, where the reader who just right-clicked cannot see it". Measured on the running page,
    the menu is **≈91 px wide against a 220 px track**, so it never overflows the stage — with the
    flip *or* without it. The planned assertion ("its client rect sits inside the scroller's") is
    therefore **vacuously true both ways**: a check that cannot fail, which is the one defect this
    repo names most often. Two further facts the plan did not have:
    - **A pointer cannot reach column 12 on `/factory` at this viewport.** The scroller measures
      ≈2818 px — wider than the 1440 px window — so `scrollWidth <= clientWidth`, `scrollLeft` stays
      pinned at 0, and the block sits at x ≈ 2741, off-screen and un-scrollable-to. That is the
      driver's own standing constraint ("an EMPTY cell is not automatically a REACHABLE one")
      arriving on the horizontal axis. The row opens the menu through the module's own entry point
      instead; the pointer OPEN path is proven in section 6 on a reachable interior block.
    - **R7's scroll-closes row had the same problem** — a `scrollLeft` nudge fires no scroll event
      on a scroller that cannot scroll horizontally, so it would have passed for the wrong reason.
      It scrolls vertically now (1232 px of content in a 638 px box).

    What the row asserts instead is what the flip genuinely does and what can genuinely fail: at
    column 12 `data-flip-x` is set **and the CSS rule is live** — the menu's right edge lands on its
    grid area's right edge — proven by a **mutation** that removes the attribute from the same open
    menu and measures the box move (129 px), plus the conditional half on an interior column. The
    flip is a positioning guarantee today and becomes a real overflow rescue the moment the menu
    grows past a track (a sixth item, a longer label, a narrower `--stx-slot-w`) — which is exactly
    when nobody would be looking. Both facts are recorded in the row's own comment.

11. **A `?b=` link drops the selection, and that is D5 working rather than a gap.** `build-share.mjs`'s
    `g` field carries slots only, so a copied link rebuilds the board and its arrangement with nothing
    selected. Correct — selection is view state, in no history entry, no export and no share payload,
    which is the whole argument for keeping it off the bus. Stated here so a reviewer reads a decision:
    a reader following their own shared link sees the board they arranged and an empty selection. The
    same is true of a method-card redraft, where `studio.mjs:614` removes the wrappers and the
    selection goes with them — that one is the *point* of carrying it on the DOM.

12. **Reduced motion is satisfied by construction** (Task 7 asked which was chosen). Nothing in the
    #217 block animates or transitions at all. The three new classes are still listed in the
    reduced-motion off-ramp for the standing reason — so a later CSS transition on a guide, the menu or
    its items cannot slip past.

## Not done

- **The real-Safari / real-Chrome manual pass (Task 13, Level 4 item 10) was NOT run.** The bundled
  Playwright engines were driven on all three; a real-browser pass is outstanding. Memory
  `vr-gate-single-engine-blindspot` exists because that pass caught a real Safari/Chrome-stable grid
  blowout on PR #54, so this is a genuine gap rather than a formality. The `.stx-menu` flex card and
  the `color-mix` guide wash are the two things most worth eyeballing there.

## A PRE-EXISTING defect observed while validating this ticket (not #217's, not fixed here)

Checking that #217's document-level Escape does not disturb `/factory`'s other Escape consumers turned
up a real bug that predates this ticket. **On `/factory`, with the appearance dock open (`#appearance`)
and focus inside `.stx-scroll`, Escape does not close the dock.**

The mechanism, confirmed by instrumenting `history.pushState`:

1. Escape on `canvas.scroll` is a replay TAKE-OVER (`replay-driver.mjs`'s capture-phase `keydown`), so
   `trackFactoryTookOver()` pushes the virtual path `/factory/took-over` — which carries no hash.
2. The event then bubbles to `dock.mjs:458`, whose handler is guarded on
   `location.hash === "#appearance"`. The hash is already `""`, so it does not strip.
3. 50 ms later the tracker restores its per-flip URL **snapshot**, which was taken before the push and
   still carries `#appearance`. The dock is left open with the hash back.

This is precisely the collision `system/analytics.mjs`'s header describes and `CLAUDE.md` records as
*"reachable there in principle, neither has been observed"* — `#149` fixed it for the `/build` pair by
reading the hash live in `flipTo`, and **deliberately did not touch the four `/factory` trackers**. It
has now been observed. A second Escape closes the dock normally, because the handover is one-shot.

**Proven pre-existing rather than assumed**: a detached `main` worktree served on port 4758 and the
`#217` branch on 4757 were driven through the identical sequence and produced byte-identical results
(`hash "#appearance"`, dock stays open) on both. #217's own Escape listener is not involved — the row
reproduces with **no selection live**, which is the condition its clear branch requires.

Not fixed here: the fix belongs in `analytics.mjs`'s `/factory` trackers (make them read the hash live,
the way `flipTo` already does), that file is outside this ticket's scope, and its current behaviour is
gated by `build-checks` group 10 and #209/#213's journey rows. **Worth its own ticket.**

What #217 *does* own here is pinned by two new `selectPass` rows: Escape with focus outside the canvas
leaves the selection alone (the clear is focus-scoped), and the ⌘K palette's Escape closes the palette
without reaching this module — `palette.mjs:272`'s `stopPropagation` is a line #217 now depends on, and
dropping it would silently start clearing the selection on every palette close.

## Issues encountered

- **One Escape both cancelled a group carry AND cleared the selection — a real bug, found by the
  driver and fixed in the module.** `studio-select.mjs`'s document-level Escape listener was on the
  bubble phase, and `studio-verbs.mjs`'s is on `stage` — a **descendant**. So by the time the
  selection layer ran, the carry had already been cancelled and `carrying()` (which reads
  `.is-picked`) was false, so the clear branch fired too. The listener is registered
  `{ capture: true }` now, which decides on the state as the reader left it; nothing is stopped from
  propagating, so the verbs' cancel still happens and the replay driver still sees the key. D11's
  "each returns immediately unless its own verb is live" is only true with the capture flag, and the
  module header and the listener both say so now.
- **`clampSlot(null)` throws.** Its default parameter covers `undefined` and not `null`, so a null slot
  destructures. Found by running the totality sweep rather than by reading. `studio-select.mjs` coerces
  once in a local `slotOf` helper rather than at four call sites; `menuItems` destructures in the body
  for the same reason. Group 22 pins both.
- The `#217` block in `studio.css` initially referenced `--spacing-2xs`, which does not exist in the
  contract (the contract's smallest is `--spacing-xs`), and gave `--shadow-md` an `rgb()` literal
  fallback. Both fixed before `token-lint` ran; the token is in the contract, so the fallback was
  unnecessary as well as a literal.
