# Feature: Studio 15 — full canvas affordances (marquee, guides, context menu, multi-move)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing exports and helpers. Import from the right files — three
of the pure functions this ticket needs already exist (`clampSlot`, `occupancyKey`, `hitSlot`) and
re-deriving any of them is the defect this repo names most often.

## Feature Description

The studio canvas can today be panned, zoomed and rearranged **one component at a time**. This ticket
adds the affordances a prototype tool is *recognized* by, over the same grid-slot grammar:

- **Marquee multi-select** by pointer (Shift + drag), with a keyboard path that selects the same set.
- **Multi-move** — every selected component lands in its slot, announced **once** for the group and
  undone in **one** step.
- **Alignment guides** during a carry — drawn only where a real peer occupies that column or row.
- **A context menu** on a component, opening by pointer *and* by Shift+F10 / the ContextMenu key,
  with identical items and full arrow-key navigation.
- **Escape** cancels every multi-verb back to the pre-verb state.

Every verb keeps full keyboard parity with a live-region announcement, nothing is named for a view
transition, and reduced motion completes every verb without travel.

## User Story

As a **hiring manager evaluating this portfolio in 5–15 minutes**
I want to **select several blocks at once, drag them together, and reach every canvas verb from a
menu or the keyboard**
So that **the studio behaves like the prototyping tool it claims to be rather than like a form with
one draggable item**.

## Problem Statement

Epic #202's evidence is the owner's own trajectory: *"toggle this, toggle that and some colours
change… it has to feel like I'm actually in a prototype tool."* #204 and #205 shipped a canvas that
pans, zooms and moves one block. A reader who has used any design tool reaches immediately for
marquee, a group drag and a right-click — and finds nothing. The gap is not capability (the grammar
holds every arrangement these verbs produce); it is that the *recognized* affordances are missing, so
the surface reads as a demo rather than as a tool.

Secondary: PRD §5 requires **full keyboard parity for every canvas verb** (WCAG 2.5.7 / 2.1.1). Any
multi-verb added pointer-first without its keyboard twin moves the epic's accessibility metric the
wrong way — and "every canvas verb has a working keyboard path" is one of the epic's own WRONG-ifs.

## Solution Statement

One new module plus one extension, both on seams the existing files already forecast:

1. **`system/studio-select.mjs` (new)** — the canvas's SELECTION layer: the selection set as DOM
   state, the Shift-drag marquee, the keyboard selection verbs (⌘/Ctrl+A · Shift+Arrow · Escape) and
   the context menu. Announces through the canvas's one live region.
2. **`system/studio-verbs.mjs` (extended)** — the gesture holds a **list** (exactly the shape its own
   header forecast at :430-434), a new `ui.move-group` consumer commits N slots in one history entry
   and one announcement, and the carry draws alignment guides.

The selection is carried on the DOM (`data-stx-selected` on the wrapper) rather than in a module-level
Set, so the verbs read it live at pick-up with no cross-module handle and no import cycle — the same
call `system/studio.mjs:517` already makes for the arrangement ("read live rather than tracked… a
mirror here would be a second copy of the arrangement that could disagree with the canvas the reader
is looking at").

Everything renders through **attributes on the existing grid**: guides and the menu are stage grid
children placed with `data-col`/`data-row`, so this ticket writes **zero inline styles** and joins
`build-checks` group 7 with no exception argued — the same terms every studio module joined on.

## Out of Scope / Non-Goals

- **Not included: a delete, duplicate or z-order verb.** The pattern grammar has none, and a menu item
  that always refuses is a lie about capability, not an honest refusal. (A refusal is content when the
  verb exists and this input fails; it is a fake when the verb does not exist.)
- **Not included: a free-pixel rubber-band rectangle.** See D3 — the marquee snaps to cells because a
  band drawn between cells suggests a region the grammar cannot hold, which is the same sentence AC #3
  applies to guides.
- **Not included: a tool-mode switcher (select tool / hand tool).** See D9.
- **Not included: touch authoring.** `pointerType === "touch"` bails, unchanged — the PRD's stated
  non-goal, already recorded at `studio-verbs.mjs:46-48`.
- **Not included: a visible per-block "⋯" menu button.** The help line is the discovery path; a second
  per-item control would churn every block and add a param entry per wrapper. Flagged for #223's
  hallway test (see Open Questions).
- **Not changing:** bare drag on empty stage still **pans** (#204's contract) and bare drag on a slot
  still **moves** (#205's contract). Both stay byte-identical in behaviour; Shift is the only new
  modifier.
- **Not changing:** `system/action-bus.mjs`. The third application of `bus-toggles.mjs`'s pattern —
  if you find yourself editing the bus, the design has gone wrong.
- **Not re-litigating spike 2.** Its verdict is inherited (see Related Work); no new spike.

## Feature Metadata

**Feature Type**: New Capability (extends #205's manipulation layer)
**Estimated Complexity**: High — three input paths × five verbs, all with keyboard parity and exact
announcement counts, over a surface with four existing gates
**Primary Systems Affected**: `system/studio-select.mjs` (new) · `system/studio-verbs.mjs` ·
`system/studio.css` · `system/studio.mjs` · `studio.html` · `tooling/build-checks.mjs` ·
`tooling/studio-journey.mjs` · `tooling/vt-verify.mjs` · `system/param-manifest.json`
**Dependencies**: none new. Shipped pages stay vanilla — no framework, no bundler, no runtime deps.

## Related Work

**Implements**: [#217](https://github.com/linardsb/ux-factory/issues/217) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) ·
[`docs/epics/prototype-studio.architecture.md`](../../docs/epics/prototype-studio.architecture.md)

**Back-references** (decisions inherited, not re-opened):

- `.claude/plans/studio-canvas-stage-204.md` + `.claude/reports/studio-canvas-stage-204-report.md` —
  the substrate, and **spike 2's verdict** this ticket consumes (below).
- `.claude/plans/studio-canvas-manipulation-205.md` +
  `.claude/reports/studio-canvas-manipulation-205-report.md` — the gesture, the one consumer, the
  history, the announcement vocabulary. `studio-verbs.mjs:430-434` names the multi-node gesture as
  this file's own forecast shape; `:64-65` says `DIRS` is "shared by the keyboard path and by #217's
  future verbs"; `:93-95` names "#217's multi-node gesture" as the reason `stepSlot`'s backstop stays.
- `.claude/plans/studio-gates-inp-vt-a11y-213.md` — the driver this ticket grows.
- `.claude/plans/studio-method-cards-hook-loop-214.md` — the most recent module to add a designed
  surface over this canvas; its select-then-place is the *other* selection idiom on the page (see D4's
  naming note).

**Spike 2's decision rule, consumed verbatim (do not re-derive):** the DOM stage **HOLDS** — zero
dropped frames on any engine at a genuinely dropped-frame threshold (33.4 ms), max frame 18.0 ms. The
one measurable effect, and the sentence this ticket inherits: under 4× CPU throttle a *pessimistic
all-slots rewrite on every pointermove* took the worst interaction from 16 ms to **32 ms — 6× inside
the 200 ms budget**. That is strictly heavier than anything here (guides are two attribute writes on
two elements; a marquee is a class toggle over ≤ 31 slots), so **the "drops" branch — defer line
redraws, simplify guides — is not taken**, and this plan says so rather than re-measuring.
`.claude/reports/studio-canvas-stage-204-report.md:33-73`.

**Forward-references**:

- #221 (layers list + minimap, pre-agreed cut) is the natural home for a visible per-block menu button
  if #223's hallway test shows readers never find Shift+F10.
- #223 reads D9 (hand tool) as a recorded decision.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- **`system/studio-verbs.mjs` (whole file, 786 lines)** — Why: the file you extend. Its header's four
  load-bearing calls are the contract this ticket must not break. Specifically:
  - `:12-18` the bus is the drive path, one consumer, `action-bus.mjs` is NOT edited.
  - `:19-23` **a gesture is a PREVIEW; only the drop commits** — one gesture = one action = one
    announcement = one history entry. This is AC #2 already written down.
  - `:24-28` an occupied cell is not enterable — no swap, no stacking.
  - `:33-38` **two accessibility criteria, and they are not the same one** (SC 2.5.7 vs SC 2.1.1).
  - `:40-44` no `aria-pressed` on the handle, and why.
  - `:66-71` `DIRS`, `:75` `HISTORY_MAX`, `:78-80` `occupancyKey`, `:96-111` `stepSlot`,
    `:125-146` `hitSlot`, `:156-208` `createHistory` (incl. `adopt`).
  - `:283-287` `occupancyExcept` — the shape `groupOccupancy` extends.
  - `:299-331` `animateTo` + `restore` — **`:312-315` already says "#217's multi-move inherits this
    one"** (measure every rect first, then apply every slot, then animate).
  - `:366-396` **THE ONE CONSUMER** — where `ui.move-group` joins.
  - `:400-419` `SPOKEN_MAX` + `restoreVerb` — the group announcement vocabulary already exists.
  - `:435` `gesture`, `:450-458` `emitMove`, `:460-488` `pickUp`, `:490-500` `clearGesture`,
    `:513-518` `flushPreview`, `:522-537` `drop`/`cancel`, `:571-577` `preview`.
  - `:586-626` the delegated stage `pointerdown` (and `:614`'s `stopPropagation` — the ancestor-pan
    lesson), `:690-725` the delegated `keydown`, `:733-736` **the document-level Escape**.
  - `:767` `cancel` is exported on the handle for `studio.mjs:467`'s carry-across-swap guard (#251).
- **`system/studio-canvas.mjs` (whole file, 376 lines)** — Why: the substrate you render into.
  `:38-44` the caps and zoom table (import, never re-type) · `:50-57` `clampSlot` · `:114-117` the
  stage/sizer/scroll structure · `:132` the ONE live region · `:225-241` the pan `pointerdown` and its
  "a press on a real control is a click, not a pan" rule (which the menu depends on) · `:307-345`
  `place()` and the wrapper shape.
- **`system/studio.css:19-118`** — Why: the grid. `:71-87` the stage's explicit `grid-template-rows`
  (and why) · `:89-113` the `[data-col]`/`[data-row]` rules the guides and the menu reuse in spirit ·
  `:90` `.stx-slot { overflow: hidden }` (**why the menu is a stage sibling, not a wrapper child**) ·
  `:116-117` `is-panning` · `:173-174` `.is-picked` (the visual idiom `.is-selected` mirrors) ·
  `:182-217` the reduced-motion block.
- **`system/studio.mjs:441-470`** — Why: where the verbs are mounted and where `studio-select` joins;
  `:467` the `verbs.cancel()` compile guard that must now also clear a GROUP carry; `:517-520`
  `arrangementNow` — **the "read live rather than tracked" precedent D4 rests on**; `:597-626`
  `adoptBoard`, which removes every wrapper (so a DOM-carried selection self-clears).
- **`studio.html:80-156`** — Why: the raw harness mounts the canvas + verbs directly; it needs the
  third mount. Not in the VR page set, so it churns no baseline.
- **`tooling/build-checks.mjs:1049-1113`** — Why: group 7's module list and the `writes === 1`
  invariant a new `system/*.mjs` file must join. `:2219` group 12 (canvas), **`:2504` group 13 (verbs)
  — the group you extend**, `:4054` group 21 (catalog) — the most recent group, and the best template
  for a new one.
- **`tooling/studio-journey.mjs:1-260`** — Why: the driver's helpers (`snapshot`, `arrangement`,
  `inject`, `busRecord`/`busSeen`, `countLive`/`liveSeen`, `focusedText`, `cellPoint`, `idAt`,
  `nodeBox`, `dragTo`, `undoAll`) — reuse them, do not re-implement. `:239-263` the pass harness and
  `open()`. `:3444+` `perfPass`'s `ROWS_FACTORY` (the INP rows). The final `console.log` bounds
  sentence at the tail (**AC #7 of #213: every bound the driver carries is printed on every run**).
- **`tooling/vt-verify.mjs:330-397`** — Why: the studio-canvas block (drives `/studio.html`), incl. the
  **movement precondition** discipline: "zero pseudos is trivially true of a page where nothing
  happened". `:399-451` the factory block.
- **`system/param-manifest.json` `$description`** — Why: the counting rules you must apply and cite.
- **`system/bus-toggles.mjs:1-90`** — Why: the seam idiom (`getSlotBus()`), the refusal-to-live-region
  rule, and the "a consumer was all this needed" argument this ticket applies a third time.
- **`system/breadboard.mjs:1-60`** — Why: the verb discipline the ticket's context names — every verb
  announced in one live region, every verb placing focus.

### New Files to Create

- **`system/studio-select.mjs`** — the canvas's selection layer: selection as DOM state, the Shift-drag
  marquee, the keyboard selection verbs, the context menu. ~420 lines incl. header.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
  — Why: the marquee is a dragging movement and needs a single-pointer alternative. Ours is the menu's
  *Select all* / *Select this* items plus Shift-click, none of which drags. Record which is which, the
  way `studio-verbs.mjs:33-38` does — do not claim 2.5.7 for a keyboard path.
- [WAI-ARIA APG — Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)
  — Why: `role="menu"` / `role="menuitem"`, roving tabindex, Arrow/Home/End/Escape, focus returns to
  the invoker on close. Sections: *Keyboard Interaction* and *WAI-ARIA Roles, States, and Properties*.
- [MDN — Element: contextmenu event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event)
  — Why: it fires for **both** the right-click and the ContextMenu key / Shift+F10 on every engine, so
  one handler serves both open paths. Confirm on webkit during the journey run rather than assuming;
  add an explicit `keydown` fallback for `Shift+F10` and `key === "ContextMenu"` if the event does not
  arrive (see Task 6's GOTCHA).
- [MDN — Pointer events: setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  — Why: the marquee captures on the stage; the firefox "captured pointer left the window keeps
  delivering `clientX 0` with `buttons 0`" bug is already documented twice in this repo
  (`studio-canvas.mjs:243-253`, `device-frame.mjs:137-152`) and the marquee inherits the same guard.

### Patterns to Follow

**File header** (every feature/entry-point file opens with one citing its governing doc):

```js
// system/studio-select.mjs — hand-written canon (this repo; not generated). The studio canvas's
// SELECTION layer (epic #202 — docs/epics/prototype-studio.architecture.md §Key decisions
// "Module seams"; ticket #217; .claude/plans/studio-canvas-affordances-217.md).
```

**The pure/mount split** (`studio-canvas.mjs:34`, `studio-verbs.mjs:60`): everything above `---- the
mount ----` takes plain data and returns plain data so `build-checks` drives it in CI with no browser;
no DOM outside a function body; no self-boot (the harness and `studio.mjs` mount explicitly).

**The `el` helper** — copied, never imported (`studio-canvas.mjs:80`, `studio-verbs.mjs:216`,
`device-frame.mjs:33`). Every node built element by element: group 7 bans every markup-from-string
sink, and that ban is why a hostile component label can never become markup anywhere in the studio.

**The driver seam** (`studio-canvas.mjs:91-95`, `studio-verbs.mjs:230-236`, `bus-toggles.mjs:70`):

```js
let live = null;
export const getSelect = () => live;   // never a window.__ global — page globals are not this repo's test surface
```

**Refusals go to the live region, never a throw** (`studio-verbs.mjs:363-365`): `action-bus.mjs:71-81`
catches handler throws into `console.error`, which hides the refusal from the reader **and** trips
`studio-journey`'s no-page-errors contract.

**The readiness handle in a `finally` on every path** (`studio-canvas.mjs:372-375`,
`studio-verbs.mjs:781-785`, `device-frame.mjs:195-199`) — so a gate fails on the missing thing instead
of deadlocking to timeout:

```js
} finally {
  viewport?.setAttribute("data-canvas-select", "ready");
}
```

**Boundary validation throws a plain `Error` naming what is missing** (`studio-verbs.mjs:243-249`).

**Arrangement is attributes, never inline styles** (`studio-canvas.mjs:258-261`): guides and the menu
get `data-col`/`data-row` and CSS rules, exactly like `.stx-slot`.

---

## IMPLEMENTATION PLAN

### Decisions this plan makes (read these before Phase 1 — they are the plan)

**D1 · The split.** `studio-select.mjs` owns the SELECTION (set, marquee, keyboard verbs, menu);
`studio-verbs.mjs` owns the GESTURE (now a list) and the GUIDES, because guides are drawn during a
carry and the carry lives there. Anything else creates an import cycle (select would need the
gesture, verbs would need the selection).

**D2 · Shift is the modifier; no shipped contract moves.** Bare drag on empty stage pans (#204). Bare
drag on a slot moves (#205). **Shift + drag** on the stage marquee-selects; **Shift + click** on a slot
toggles its membership. `studio-select` registers its `pointerdown` on `stage` in the **capture**
phase, so it beats `studio-verbs`' bubble listener regardless of mount order, and calls
`stopPropagation()` so neither the mover nor the ancestor pan handler ever sees a Shift press.
*(For a press whose target IS the stage, capture and bubble listeners on that same node run in
registration order — but `studio-verbs`' handler bails on `!e.target.closest(".stx-slot")` anyway, so
the empty-stage case is safe either way. The capture flag is what makes the **on-a-slot** case
order-independent.)*

**D3 · No rubber-band rectangle.** The marquee's feedback is the live `.is-selected` outline on the
cells it currently covers. A free-pixel band drawn between grid lines would show a region the grammar
cannot hold — AC #3's own sentence, applied to the marquee. It also means no new positioned overlay
near #171's stacking hazard, and no geometry element that would need a pixel style.

**D4 · Selection is DOM state, not a module Set.** `data-stx-selected` on the `.stx-slot` wrapper plus
`.is-selected` for the visual. `studio-verbs` reads it live at pick-up; nothing is mirrored. This is
`studio.mjs:517-520`'s recorded reasoning ("a mirror here would be a second copy… that could disagree
with the canvas the reader is looking at"), and it is what makes `adoptBoard`'s wrapper removal
(`studio.mjs:614`) clear the selection for free. **No `aria-selected`** — the wrappers carry no
listbox/grid role, so it would be invalid; and **no `aria-pressed` on the grab handle**, for
`studio-verbs.mjs:40-44`'s reason (it would describe the button, not the set). The selection's
accessible signal is the live-region count.

**D5 · Selection is NOT a bus verb. The group MOVE is.** *The bus carries model changes; selection is
view state.* Selection is in no history entry, in no share payload (`build-share.mjs`'s `g` carries
slots), in no export, and no replay op selects — so `ui.select` would be one emitter pair and one
consumer invented for symmetry inside a single module, which is exactly what `studio-flow.mjs`'s
header declined for `ui.navigate`. Parity is instead enforced structurally: **both input paths call
one internal `applySelection(ids, why)`**, and `studio-journey` proves set identity between them.
What would change the call, stated so the next reader does not have to guess: the day a replay op
records a selection, or a second module needs to observe one.

**D6 · Exactly ONE new bus verb: `ui.move-group`.**
`{ type: "ui.move-group", source, params: { moves: [{ id, col, row }, …] } }`, no `target` (there is
no single subject). It joins `studio-verbs.mjs`'s existing consumer block as a second `bus.on` in the
same module — the mover stays one module and `applySlot` stays the one place a slot is written. One
`history.push`, **one** `canvas.say` through the existing `SPOKEN_MAX` vocabulary, one undo.
**No `ui.pick-up`**: a pick-up is UI state, not a model change, and the menu carries no pick-up item
(the reader who opened the menu from the grab handle is one Escape away from Enter).

**D7 · The context menu.** Items, all real verbs, none invented:
`Select this` / `Deselect this` (contextual, from the pure `menuItems()`) · `Select all` ·
`Clear selection` · `Undo` · `Redo`. Undo/Redo emit the existing `ui.undo`/`ui.redo`; the three
selection items call `applySelection`. **Anchored to the component's CELL** as a stage grid child
(`data-col`/`data-row` on the menu element → the same grid), never to the cursor: cursor positioning
needs a pixel style, and cell anchoring makes the pointer open and the keyboard open land in exactly
the same place, which is what "identical items" is worth having. Stated trade-off: the menu scales
with the stage, because it is canvas content. It is a **stage sibling, not a wrapper child**, because
`.stx-slot { overflow: hidden }` would clip it (`studio.css:90`).

**D8 · Guides.** At most two elements — one column guide, one row guide — placed by `data-col` /
`data-row`, `pointer-events: none`, rendered during a carry (single or group) **only when a
non-carried peer occupies that column or row**. A guide over an empty column is precisely the lie
AC #3 names, so the gate does not merely count guides: it mutates one into existence over an empty
column and asserts red (this repo's `check-that-cannot-fail` rule).

**D9 · Zoom-to-fit and the hand tool — the scope call, sharpened.** Zoom-to-fit landed at #204 (the
`Fit` button, `studio-canvas.mjs:169-179`). Pan-by-drag covers the hand tool's function **on empty
canvas** (`studio-canvas.mjs:225-256`, cursor `grab`/`grabbing`). What does **not** exist, recorded as
a decision rather than left as a gap for #223 to discover: **there is no mode in which a drag over a
component pans.** Adding one needs either a tool-mode UI (which the epic's no-mode-UI behavior
gradient resists) or a Space-drag modifier (which collides with Space activating the focused
`.stx-grab` handle, `studio-verbs.mjs:699`). Neither earns its cost while the scrollbars, the arrow
keys, ⌘/Ctrl-wheel and every empty cell already pan. **This ticket adds neither of §5's last two
items, and says so.**

**D10 · ⌘/Ctrl+A is focus-scoped.** It is handled on `.stx-scroll` (where `⌘Z`/`⌘Y` already live,
`studio-verbs.mjs:749-759`), so it only reaches the canvas when the scroller or a descendant holds
focus; elsewhere it is the browser's document select-all, untouched. That bound is real and is stated
in the module header, in the help line and in the driver's printed bounds sentence. It is also why
**Select all is a menu item**: the AC must not be satisfied only for readers who know the shortcut.

**D11 · Two document-level Escape listeners, each guarded on its own live state.** `studio-verbs.mjs:733`
exists because a body-drag focuses nothing; a Shift-drag marquee has the identical problem, so
`studio-select` needs its own. Each returns immediately unless its own verb is live, and the journey
asserts non-interference **in both directions** (Escape during a marquee must not cancel a carry, and
vice versa).

### D12 · The announcement contract — write the driver's counts from THIS table, not from the code

The single largest source of one-pass failure on this surface is not a broken verb but a **wrong
expected count**: the drivers assert announcements exactly and per path, and a count invented while
writing the assertion looks like a feature bug. So the contract is stated once, here, and Tasks 5, 6
and 9 all read it rather than each deciding.

| verb | path | sentences | wording |
|---|---|---|---|
| marquee | pointer, whole drag | **1**, on `pointerup` | `"N selected: A, B, and K more."` (`SPOKEN_MAX` shape) |
| marquee over nothing | pointer | **1** | `"Nothing to select."` |
| Shift-click toggle | pointer | **1** per click | the resulting count sentence |
| ⌘/Ctrl+A · menu *Select all* | keyboard / pointer | **1** | the resulting count sentence |
| Shift+Arrow | keyboard | **1 per press**, blocked presses included | the resulting count sentence |
| *Clear selection* · Escape on a selection | either | **1** | `"Selection cleared."` |
| group pick-up | keyboard only | **1** | `"N components picked up… Arrow keys to move, Enter to drop, Escape to cancel."` |
| group pick-up | pointer drag | **0** | the reader is watching their own hand (`studio-verbs.mjs:478-486`) |
| group arrow step | keyboard | **1 per press**, blocked included | `"N components in column C, row R."` / `"Blocked, N components still in column C, row R."` |
| group drop | either | **1** (from the consumer) | `"Moved: A in column C, row R; B in …, and K more."` |
| group drop that moved nothing | either | **1**, and **no** `ui.move-group` | `"N components put down in column C, row R."` |
| group cancel (Escape) | either | **1** | `"Cancelled, N components back where they were."` |
| undo of a group move | either | **1** | `restoreVerb`'s existing `"Undone: …"` — unchanged |
| menu open / close | either | **0** | focus movement is the feedback; a sentence per open would speak over the verb that follows |
| `ui.move-group` naming a missing id | bus | **1**, DOM untouched, nothing on the console | `"Refused: no component "x" on this canvas."` |

Two rules behind the table, so a future verb can be added consistently: **a gesture the reader's own
hand is tracking announces only its result** (call 2 of `studio-verbs.mjs`'s header), and **a keyboard
step announces every press including a blocked one** (`:718-721` — a naive once-per-gesture count
sends an implementer to delete the per-step feedback, which is the wrong fix).

### Phase 1: The pure layer

Everything CI can drive with no browser. Write these first — the mount is thin once they exist.

**Tasks:**
- `studio-verbs.mjs`: `groupStep`, `groupDelta`, `guidesFor` (+ `groupOccupancy` if the mount needs it
  shaped).
- `studio-select.mjs`: `marqueeRange`, `idsInRange`, `extendSelection`, `menuItems`, `MENU_ITEMS`.
- Extend `build-checks` group 13; add group 22.

### Phase 2: The verbs' extension (multi-move + guides)

**Depends on:** Phase 1.

**Tasks:** the gesture holds a list · the `ui.move-group` consumer · guides rendered from the carry ·
`cancel()` handles the list form · `studio.css` gains the guide rules.

### Phase 3: The selection module (marquee · keyboard · menu)

**Depends on:** Phase 1. **Independent of:** Phase 2 — the two modules share no import, so if this is
split across worktrees Phase 3 can start as soon as Phase 1's pure functions land. In one session,
run them in order (Phase 3's journey rows exercise Phase 2's group move).

**Tasks:** the module · the mounts in `studio.html` and `studio.mjs` · `studio.css`'s selection and
menu rules.

### Phase 4: Gates, cascade and manual validation

**Depends on:** Phases 2 + 3.

**Tasks:** `studio-journey`'s `selectPass` + the new INP rows + the Fit-while-compiled row + the
printed bounds sentence · `vt-verify`'s new samples · `param-manifest` + `param-count` ·
`loc-summary` + the four baselines · the manual cross-engine pass.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently testable.

### 1 · UPDATE `system/studio-verbs.mjs` — the pure group functions

- **IMPLEMENT**: three new pure exports, above `---- the mount ----`, beside `stepSlot`/`hitSlot`:
  - `export function groupOccupancy(all, members)` → a `Set` of `occupancyKey`s for every slot in
    `all` whose id is **not** in `members`. (`all` and `members` are plain `[{id,col,row}]` /
    `[id]`.)
  - `export function groupStep(members, dir, occupied)` → **all-or-nothing**. Translate every member
    by `[dc,dr]`; if **any** destination leaves the grid (`clampSlot` would change it) or hits
    `occupied`, return `members` **unchanged**. Never returns a partially-moved set.
  - `export function groupDelta(members, dcol, drow, occupied)` → the same all-or-nothing rule for an
    arbitrary delta (the pointer path's anchor translation). `groupStep` may be written as
    `groupDelta(members, dir[0], dir[1], occupied)`.
  - `export function guidesFor(carried, peers)` → `{ cols: number[], rows: number[] }` — the columns
    and rows that at least one **peer** occupies AND at least one **carried** member occupies.
    Deduplicated, sorted ascending, and **empty when nothing aligns**. Total: junk in → `{cols:[],
    rows:[]}`, never a throw.
- **PATTERN**: `system/studio-verbs.mjs:96-111` (`stepSlot`) for the shape and the comment discipline;
  `:283-287` (`occupancyExcept`) for what an occupancy set is.
- **GOTCHA — the silent bug this task exists to prevent**: **do not reuse `stepSlot` for a group.**
  `stepSlot` *keeps walking* past occupied cells (`:96-111`), which for N nodes lands members at
  different offsets and deforms the selection. A group step is all-or-nothing by definition, and the
  occupancy set excludes **every** member, not just an anchor.
- **GOTCHA**: `guidesFor` returns lines that a **peer and a carried member share**. A guide over a
  column holding only carried members says nothing; a guide over a column holding neither is the lie
  AC #3 forbids.
- **IMPORTS**: none new — `clampSlot`, `MAX_COLS`, `MAX_ROWS` are already imported at `:58`.
- **VALIDATE**: `node -e "import('./system/studio-verbs.mjs').then(m=>console.log(typeof m.groupStep, typeof m.groupDelta, typeof m.guidesFor, typeof m.groupOccupancy))"`
- **SATISFIES**: AC #2, AC #3.

### 2 · CREATE `system/studio-select.mjs` — the pure layer only

- **IMPLEMENT**: the file header (see Patterns to Follow — cite the epic, the architecture's *Module
  seams*, ticket #217 and this plan), then the pure exports:
  - `export const MENU_ITEMS` — the frozen item vocabulary as
    `[{ id, label }]` for the four unconditional items (`select-all`, `clear`, `undo`, `redo`), with
    the contextual pair (`select`, `deselect`) declared beside it.
  - `export function menuItems({ selected, anySelected, canUndo, canRedo })` → the ordered item list
    for one node: `Select this` **or** `Deselect this` (never both), then `Select all`, then
    `Clear selection` (present only when `anySelected`), then `Undo`/`Redo` with a `disabled` flag
    from the two booleans. Pure, so the driver asserts the pointer-opened and keyboard-opened menus
    against **one** source rather than against each other.
  - `export function marqueeRange(a, b)` → `{ col1, row1, col2, row2 }`, normalized (min/max) and
    clamped through `clampSlot`. `a`/`b` are already-hit-tested slots.
  - `export function idsInRange(slots, range)` → the ids of every `{id,col,row}` inside the inclusive
    range, in the order given. Total over junk.
  - `export function menuAnchor(col, row, cols = MAX_COLS, rows = MAX_ROWS)` →
    `{ col, row, flipX, flipY }` — the cell the menu is placed in plus two booleans saying it must
    open leftwards / upwards because the invoker sits in the last columns or rows. Pure, clamped, and
    total over junk. **R5's mitigation**: without it, a menu opened on a column-12 block renders off
    the right edge of the scroller, where the reader who just right-clicked cannot see it.
  - `export function extendSelection(anchor, cursor, dir)` → `{ cursor, range }` — steps the cursor
    one cell in `dir` (clamped to the grid, **never skipping occupied cells** — a selection rectangle
    includes what it covers), and returns the rectangle from `anchor` to the new cursor. This is what
    makes AC #1's "an equivalent keyboard path selects the same set" a **checkable** claim.
- **DECIDE AND WRITE DOWN — `extendSelection` REPLACES, it does not union.** The rectangle from anchor
  to cursor becomes the whole selection, so a Shift-click stray from a previous interaction is
  discarded. Chosen over union because it makes AC #1's identity claim hold **unconditionally**
  rather than only from a cleared start: the marquee also replaces (Shift *is* the marquee trigger, so
  there is no plain-drag marquee for it to add to), and two verbs that both replace are two verbs a
  reader can predict. Shift-click stays the additive path — that is what it is for. The announcement
  is the resulting count, which is honest about the discard without narrating it. `selectPass` (2)
  therefore asserts identity **twice**: from a cleared start, and after a deliberate stray Shift-click
  — the second is what proves the replace rather than assuming it.
- **PATTERN**: `system/studio-canvas.mjs:34-73` for the pure/mount split and the header's
  numbered-calls style; `system/pattern-rules.mjs` for a frozen vocabulary constant.
- **GOTCHA**: no DOM anywhere above the mount, and no self-boot — `build-checks` imports this file
  directly for its pure exports.
- **IMPORTS**: `import { MAX_COLS, MAX_ROWS, clampSlot } from "./studio-canvas.mjs";`
- **VALIDATE**: `node -e "import('./system/studio-select.mjs').then(m=>console.log(Object.keys(m)))"`
- **SATISFIES**: AC #1, AC #4.

### 3 · UPDATE `tooling/build-checks.mjs` — group 13 grows, group 22 is born

- **IMPLEMENT**:
  - **Group 13 (`verbs`)** gains: `groupStep`/`groupDelta` over a case table — a clean group step, a
    step blocked by a non-member peer returning the set **unchanged** (assert *deep equality with the
    input*, which is what catches a partial move), a step blocked by the grid edge, a step where a
    **member** occupies the destination (must be allowed — members move together), a step where the
    group is **every** slot on the canvas (nothing outside it can block, so only the edge can — the
    R8 case), a 1-member group behaving exactly like `stepSlot`'s unblocked case, and totality over
    junk. Plus `guidesFor`: aligns on a column only, on a row only, on both, on neither (empty),
    a column occupied **only by carried members** (→ empty: a guide there says nothing),
    duplicates deduped, and junk-total. Update the `group("verbs", …)` summary sentence.
  - **Group 22 (`select`)**, new, modelled on group 21's structure: `marqueeRange` normalization in
    all four drag directions and its clamp · `idsInRange` inclusive on every boundary · `extendSelection`
    building the **same** id set as a marquee over the same rectangle (assert *set identity*, sorted —
    this is AC #1's pure half) · `menuItems`' contextual pair asserted **both ways** and its
    `Clear selection` present/absent branch · `MENU_ITEMS` frozen (a mutation attempt leaves it
    unchanged) · `menuAnchor`'s flips asserted on **both** sides of each boundary (column 11 must not
    flip, column 12 must — an off-by-one here is invisible on every other column) · totality over
    ≥ 8 junk inputs per function.
  - **THE MUTATION SWEEP THAT DECIDES WHETHER THESE GROUPS CAN FAIL AT ALL** (this repo's
    `check-that-cannot-fail` rule, and memory `check-that-cannot-fail`). Break each of the following
    in the working tree, re-run, and confirm **a named case** goes red — not merely that "something"
    goes red. Record the case name for each in the report; ship none of them:

    | # | mutation | the case that must go red |
    |---|---|---|
    | 1 | `groupStep` returns the partially-moved set instead of the input when blocked | the non-member-peer block, **by deep equality** |
    | 2 | `groupOccupancy` excludes only the anchor rather than every member | the clean 3-member step (the group becomes self-blocking) |
    | 3 | `guidesFor` drops the peer requirement | the carried-members-only column case |
    | 4 | `extendSelection` unions instead of replacing | the stray-Shift-click identity case (Task 2's decision) |
    | 5 | `menuAnchor` flips at `>` instead of `>=` | the column-12 flip case |
    | 6 | `menuItems` returns both `Select this` and `Deselect this` | the contextual-pair assertion, both ways |
  - **Group 12 (`canvas`) — the CSS mirror grows from one set to three.** It today pins
    `.stx-slot`'s 12 `[data-col]` + 8 `[data-row]` rules exhaustively **and in both directions**
    (a count alone passes happily for a set with a duplicate and a gap). Task 7 adds the same 12+8 for
    `.stx-guide` and for `.stx-menu`, so extend the mirror check to all three selector families —
    otherwise a cap moves and only one of the three mirrors follows it, which is precisely the failure
    the exhaustive pin exists to prevent.
  - **Group 7**: add `"studio-select.mjs"` to `MODULES` (`:1049-1055`). The file makes zero inline-style
    writes and zero markup-from-string, so `writes === 1` stays literally true with **no exception
    argued** — the same terms every studio module joined on.
- **PATTERN**: `tooling/build-checks.mjs:2504` (group 13's summary sentence shape) and `:4054`
  (group 21 — the newest group, the best template). Note group 13's **hand-written recursive canonical
  stringify** for deep compares and its warning: `JSON.stringify(v, keys)`'s second array argument is a
  **replacer** that filters property names at every level, which made every comparison vacuous until a
  mutation sweep caught it. Reuse the existing helper; do not write a new deep-compare.
- **GOTCHA**: every group iterates its own fixtures — a new pure export with no case is silently
  uncovered, not loudly missing. Add the case in the same commit as the export.
- **VALIDATE**: `node tooling/build-checks.mjs` — all 22 groups green.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4.

### 4 · UPDATE `system/studio-verbs.mjs` — the gesture holds a list

- **IMPLEMENT**:
  - `pickUp(node, source)` becomes group-aware: if `node` carries `data-stx-selected` **and** more
    than one wrapper does, the gesture's `nodes` is every selected wrapper (`node` stays the
    **anchor**, and the announcement names the count); otherwise `nodes` is `[node]` and every existing
    sentence is unchanged. Keep `gesture.node` as the anchor so the existing pointer/keyboard branches
    read the same field (`studio-verbs.mjs:430-434`'s own forecast: "a gesture holding a LIST of nodes
    changes this object and nothing about the consumer").
  - `history.adopt(snapshot())` at pick-up already covers every member (it is a whole-arrangement
    snapshot) — do not add a per-node adopt.
  - `preview(slot)` becomes `previewGroup(anchorSlot)`: compute the anchor delta, run `groupDelta`
    against `groupOccupancy(all, memberIds)`, and either apply **every** member's slot or keep the last
    valid position. Single-node behaviour must be **byte-identical** to today's.
  - the keyboard arrow branch (`:712-724`) calls `groupStep` for a group; the announcement stays one
    sentence per press, now `"Column C, row R."` for one and `"N components moved to column C, row R."`
    — or the blocked twin — for a group. Keep announcing **on every press including a blocked one**
    (`:718-721`'s reasoning, and the exact-count property the driver depends on).
  - `emitMove(source)` emits `ui.move` for one member and `ui.move-group` for many.
  - `drop()` — "moved" means **any** member changed slot.
  - `cancel()` restores **every** member's origin (D11 / advisor item 8), then clears.
  - `clearGesture()` releases capture and strips `.is-picked` from every member.
- **PATTERN**: `:299-331` `animateTo`/`restore` — **`:312-315` already wrote this task's rule**:
  measure every rect first, then apply every slot, then animate, because applying the first re-lays
  out the grid and the second's "before" is already stale.
- **GOTCHA**: `studio.mjs:467` calls `verbs.cancel()` when the compile beat reaches `rendered` or
  `blocks` (#251's carry-across-swap guard). A group carry caches N members **and** the pick-up
  geometry, so it is the same hazard, larger — `cancel()` must be total over the list form and stay a
  silent no-op with no live gesture.
- **GOTCHA**: the occupancy set for a group excludes **all** members (Task 1) — otherwise a group can
  never move at all, because each member blocks its neighbour's destination.
- **GOTCHA — R3, the stale preview frame, third occurrence.** `flushPreview` (`:513-518`) is called
  from **two** places that cover each other, and the group path must go through **both**: `drop()`'s
  call, and the `pointerup` handler's call *before* the still-there test (`:662`). Skip the second and
  a quick group drag reads as a click and becomes a sticky pick-up instead of a drop; skip the first
  and it commits the frame before the one the reader released on. It surfaces on **webkit** first,
  whose rAF is the slowest to flush, and presents as "the group lands one cell short" — intermittent
  on the other two engines. `previewGroup` must therefore be what the queued rAF callback and
  `flushPreview` both invoke; do not give the group path its own frame handling.
- **GOTCHA — R10, the selection outlives a compile, and that is correct.** The beat swaps wrapper
  *contents*, never the wrappers, so `data-stx-selected` survives — which is what a reader expects.
  What must **not** survive is a live group *carry*: `studio.mjs:467` already calls `verbs.cancel()`
  at `rendered`/`blocks`, and Task 4's list-aware `cancel()` is what makes that guard cover N members.
  Assert both halves in Task 9 (selection kept · carry cancelled), because they look like one property
  and are two.
- **VALIDATE**: `node tooling/build-checks.mjs` (groups 7, 12, 13 green) — then, after Task 9,
  the journey's `[3] three sources` section must still pass **unchanged**, which is the proof
  single-node behaviour did not move.
- **SATISFIES**: AC #2, AC #5.

### 5 · UPDATE `system/studio-verbs.mjs` — the `ui.move-group` consumer + guides

- **IMPLEMENT**:
  - a second `bus.on("ui.move-group", …)` **in the same consumer block**, immediately after
    `ui.move`'s (`:366-396`). It resolves every `{id,col,row}` in `params.moves` against the stage,
    refuses to the live region (never a throw) naming the first missing id, `clampSlot`s every pair,
    `history.adopt(snapshot())`, applies **every** slot, **one** `history.push(snapshot())`, **one**
    `canvas.say` through the `SPOKEN_MAX` vocabulary (`"Moved: A in column 2, row 1; B in column 3,
    row 1, and 2 more."`), one `syncControls()`.
  - guides: `renderGuides(cols, rows)` creates/updates at most two `.stx-guide` children of the stage
    with `data-col` / `data-row`, and removes them on drop/cancel/clear. Called from `previewGroup`
    and the keyboard step with `guidesFor(carriedSlots, peerSlots)`.
    **They render for a SINGLE-node carry too, not only a group.** AC #3 does not scope guides to
    groups, `guidesFor` handles one member as naturally as N, and a single drag is the commonest
    gesture on the canvas — scoping them to groups would leave the journey's guide rows exercising
    only the rarer path.
  - the static help element (`:339-343`) gains **one** sentence for the new verbs (see Task 8's
    baseline note) — keep the existing sentence byte-identical and append the second as its own
    element so the `aria-describedby` IDREF on every handle keeps describing the **move** affordance
    only.
  - **HOIST AND EXPORT `SPOKEN_MAX`.** It is currently declared **inside** `mountCanvasVerbs`
    (`:401`), so `studio-select.mjs` cannot import it. Move it to module scope beside `HISTORY_MAX`
    (`:75`) and `export` it — the same "the cap is exported so the other module imports it rather
    than re-typing a bound" pattern as `MAX_COLS`/`LABEL_MAX`/`SLOT_MAX`. Group 13 pins it. Nothing
    about its value or its use changes.
- **PATTERN**: `:366-396` (the one consumer, incl. why refusals go to the live region), `:400-419`
  (`restoreVerb`'s `SPOKEN_MAX` phrasing — reuse the vocabulary, do not invent a second).
- **GOTCHA**: the consumer must **not** consult occupancy, exactly as `ui.move`'s does not
  (`:386-391`) — the gesture enforced it during preview, and a refusal here would make an injected
  `source:"agent"` group move behave differently from a pointer one, which is precisely the parity
  AC #1 turns on. State the same consequence: an injected group move **can** stack.
- **GOTCHA**: no travel animation in the consumer (`:383-385`) — `animateTo` stays undo/redo's alone.
- **VALIDATE**: `node tooling/build-checks.mjs` (groups 7, 13 green), then — once Task 8's mount
  lands — serve the repo and inject the verb through the exported seam, reading the arrangement back
  in the same round trip:
  ```js
  // devtools console on http://127.0.0.1:4757/studio.html
  const { getVerbs } = await import("/system/studio-verbs.mjs");
  const v = getVerbs();
  const ids = [...document.querySelectorAll(".stx-slot")].slice(0, 3)
    .map((n) => n.getAttribute("data-stx-id"));
  const before = v.history.depth();
  v.bus.emit({ type: "ui.move-group", source: "agent",
    params: { moves: ids.map((id, i) => ({ id, col: 4 + i, row: 6 })) } });
  console.log(v.history.depth() - before,            // must be exactly 1
    document.querySelector(".stx-live").textContent); // must be ONE sentence naming the group
  ```
  Three slots move, the history grows by **one**, and the live region holds **one** sentence.
- **SATISFIES**: AC #2, AC #6.

### 6 · CREATE `system/studio-select.mjs` — the mount

- **IMPLEMENT**: `export function mountCanvasSelect(canvas, { bus } = {})`, validating
  `{ stage, scroll, say }` and the bus at the boundary with a plain `Error` naming what is missing,
  and setting `data-canvas-select="ready"` in a `finally` on **every** path.
  - **state**: `let anchor = null, cursor = null, marquee = null, menu = null;` — the selection itself
    lives on the DOM (D4).
  - `applySelection(ids, why)` — the ONE place `data-stx-selected` and `.is-selected` are written, by
    both input paths (D5). Announces once: `"3 selected: Metric 1, Metric 2, and 1 more."` /
    `"Selection cleared."` / `"Nothing to select."` — reuse `SPOKEN_MAX`'s shape, importing the cap
    Task 5 hoisted to module scope; do **not** re-literal a second bound.
  - **marquee** (`stage` `pointerdown`, `{ capture: true, signal }`): bail unless `e.shiftKey`,
    `e.button === 0`, `e.pointerType !== "touch"`. `stopPropagation()` + `preventDefault()`. If the
    press is on a `.stx-slot`, toggle that wrapper's membership and return (Shift-click). Otherwise
    capture on the stage, hit-test the origin, and on each rAF-throttled `pointermove` hit-test the
    current point, `marqueeRange` the pair and `applySelection(idsInRange(…), "marquee")` — the
    outlines *are* the band (D3). `pointerup` announces the final count once; `pointercancel` and
    `lostpointercapture` restore the pre-marquee set.
  - **the coordinate chain**: reuse `studio-verbs.mjs:544-567`'s exact four steps
    (`readGeom` once per gesture, then rect + `scrollLeft/Top` + the scale divide, then `hitSlot`).
    Do not re-derive it — miss the scroll offset and it is wrong the moment the reader has panned;
    miss the divide and it is wrong at every level ≠ 1; **both look fine at 100 % scrolled to 0,0**.
  - **keyboard** (on `canvas.scroll`, where `⌘Z`/`⌘Y` already live, `studio-verbs.mjs:749-759`):
    ⌘/Ctrl+A → select all + announce; Shift+Arrow → `extendSelection` from the anchor (the anchor is
    the focused wrapper, or the first selected one, or `{col:1,row:1}`), announce the count;
    Escape → clear.
  - **the context menu**: **the `keydown` branch is the PRIMARY keyboard path, not a fallback** —
    `e.shiftKey && e.key === "F10"` and `e.key === "ContextMenu"`, written from the start. A
    `contextmenu` handler on `stage` covers the pointer open, and because several engines *also*
    synthesise `contextmenu` for those two keys, `openMenu()` is **idempotent**: an already-open menu
    on the same invoker is a no-op. Inverted from "assume `contextmenu` covers both and confirm during
    the run" deliberately — a webkit failure would land after both modules are written and the fix
    would be a new code path rather than a tweak; belt-and-braces plus one guard is cheaper today.
    `preventDefault()`, build the menu
    from `menuItems({…})`, append it to the stage with `menuAnchor(col, row)`'s `data-col`/`data-row`
    **and its `data-flip-x` / `data-flip-y` attributes** (R5 — a menu on a column-12 block otherwise
    opens off the right edge of the scroller, invisible to the reader who just invoked it), then focus
    the first item. `role="menu"` + `role="menuitem"` buttons, roving tabindex, Arrow/Home/End, Escape
    and a click outside close it and **return focus to the invoker** (APG). Items call
    `applySelection` or `bus.emit({type:"ui.undo"|"ui.redo", source})`.
    **A pan or a scroll of `canvas.scroll` closes the menu** — it is anchored to a cell, so a scroll
    leaves it visually detached from the block it belongs to. One `scroll` listener, `{ passive: true }`.
  - **Escape at the document level**, guarded on `marquee || menu` only (D11).
  - `export const getSelect = () => live;` and a `destroy()` that aborts the `AbortController`,
    removes the menu, and clears `live`.
- **PATTERN**: `system/studio-verbs.mjs:579-736` (the whole mount: `AbortController` + `{ signal }`,
  delegated listeners on `stage`, capture-not-document, the firefox `buttons & 1` bail, `preventDefault`
  on `keydown` not `keyup` because Space fires `click` on keyup);
  `system/studio-method.mjs:238-295` for the roving select-then-place idiom and its announcements.
- **GOTCHA — the firefox drag bug, third occurrence**: a `pointermove` carrying no primary button
  ENDS the marquee (`studio-canvas.mjs:243-253`, `device-frame.mjs:137-152`). Without it the marquee
  sticks and every later move re-selects.
- **GOTCHA — the menu must not start a pan or a drag.** It should be inherited free
  (`studio-canvas.mjs:236` bails on `button`; `studio-verbs.mjs:589` bails because the menu is a stage
  **sibling**, not inside a `.stx-slot`) — but that is two ancestors' worth of assumption, so Task 9
  proves it on the running page rather than reasoning it.
- **GOTCHA — R4, THE TAKE-OVER COUPLING. Read this before writing a single `stopPropagation`.**
  `system/replay-driver.mjs:781-782` registers its take-over listeners on `canvas.scroll` **in the
  capture phase**. `studio-select`'s listeners are on `stage`, a DESCENDANT — so the driver's capture
  listener fires *first* and this module's `stopPropagation()` cannot suppress the handover. That is
  correct today **by the driver's capture flag alone**: move that listener to the bubble phase and a
  Shift-drag mid-replay silently stops handing over while the driver keeps authoring underneath the
  visitor. Nothing else in the repo detects it, so Task 9 pins it with a running-page row.
  **And the asymmetry this ticket inherits rather than fixes** (`replay-driver.mjs:744-748`): the
  discriminator returns early for `e.ctrlKey || e.metaKey`, so **⌘/Ctrl+A mid-replay selects without
  handing over**, exactly as ⌘Z already does. Shift+Arrow, Shift+F10 and every pointer press *do*
  hand over. **Do not "fix" this by editing the discriminator** — the same line governs ⌘Z/⌘Y and its
  current set is gated by #209/#213's journey rows. The model is never at risk (selecting changes
  nothing the driver writes, and the first actual *move* hands over); what is at risk is a future
  reader assuming symmetry, so Task 9 pins both sides and the module header records it.
- **GOTCHA**: `role="menu"` items must be real `<button type="button">`s built element by element —
  group 7 bans every markup-from-string sink, and a hostile component label reaches the menu's
  contextual item label.
- **IMPORTS**: `MAX_COLS, MAX_ROWS, clampSlot, ZOOM_LEVELS` from `./studio-canvas.mjs`;
  `hitSlot, SPOKEN_MAX` from `./studio-verbs.mjs` — `hitSlot` is already exported (`:125`);
  `SPOKEN_MAX` is exported by Task 5's hoist. This is the ticket's only new cross-module import, and
  it runs select → verbs only, so there is no cycle (verbs reads the selection off the DOM, D4).
- **VALIDATE**: `node tooling/build-checks.mjs` (group 7 must still report `writes === 1`).
- **SATISFIES**: AC #1, AC #4, AC #5.

### 7 · UPDATE `system/studio.css` — selection, guides, menu

- **IMPLEMENT**, in a `/* ---------- full canvas affordances (#217) ---------- */` block after the
  `#205` manipulation block:
  - `.stx-slot.is-selected { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — mirrors
    `.is-picked` (`:173`). Give `.is-picked` precedence when both apply.
  - `.stx-guide` — `pointer-events: none; z-index: 1;` plus the 12 `[data-col]` rules
    (`grid-column: N; grid-row: 1 / -1;`) and the 8 `[data-row]` rules
    (`grid-row: N; grid-column: 1 / -1;`), **hand-mirroring `MAX_COLS`/`MAX_ROWS` exactly as
    `.stx-slot`'s rules do** (`:92-113`) — CSS cannot import, which is why group 12 pins the mirror.
  - `.stx-menu` — the same 12 + 8 `[data-col]`/`[data-row]` rules, `align-self: start;
    justify-self: start; z-index: 3;` and a token-only card skin (`var(--color-bg)`,
    `var(--color-border)`, `var(--radius-md, 8px)`, `var(--spacing-*)`). No literals — a brand value or
    literal here is a bug (CLAUDE.md, token discipline).
  - **R5's two flip rules**: `.stx-menu[data-flip-x] { justify-self: end; }` and
    `.stx-menu[data-flip-y] { align-self: end; }` — the whole of the off-edge fix, driven by
    `menuAnchor`'s booleans, and therefore CI-gated in group 22 rather than eyeballed. Two attribute
    selectors instead of a measured pixel offset is the reason this ticket keeps its zero-inline-style
    claim while still opening a menu at column 12.
  - the reduced-motion block (`:182-217`) gains the new classes if any of them animate. **Prefer that
    none of them do** — then reduced motion is satisfied by construction and AC #6's second half needs
    no rule at all. Say which you chose in the report.
- **PATTERN**: `system/studio.css:89-113` (the attribute-selects-a-grid-line rules), `:173-174`
  (`.is-picked`).
- **GOTCHA**: `.stx-slot { overflow: hidden }` (`:90`) clips anything inside a wrapper — hence the menu
  is a stage sibling (D7). Do **not** relax that rule; the compiled screens depend on it.
- **GOTCHA**: give **nothing** a `view-transition-name`. #171 shipped a real at-rest regression by
  naming elements that then became containing blocks for an absolutely positioned overlay, and the
  pixel gate re-baselined it. The stage names nothing (`studio-canvas.mjs:25-28`) and this ticket keeps
  it that way.
- **COUPLED TO TASK 3**: both new 12+8 rule sets are pinned by group 12's mirror check, extended in
  that task. Land them together — a rule set with no pin is a mirror that drifts silently.
- **VALIDATE**: `node tooling/token-lint.mjs` (the surface sheet is already registered) and
  `node tooling/build-checks.mjs` group 12 — which must now report **three** mirrored selector
  families, not one.
- **SATISFIES**: AC #3, AC #6.

### 8 · UPDATE `studio.html` + `system/studio.mjs` — the third mount

- **IMPLEMENT**: `mountCanvasSelect(canvas, { bus })` after `mountCanvasVerbs(…)` in both places.
  - `studio.html:80-156` — the raw harness: import and mount, inside the existing try/catch that
    renders a boundary throw as "Refused: …".
  - `system/studio.mjs:441-442` — after `const verbs = mountCanvasVerbs(canvas, { bus });`, sharing the
    page's ONE bus. Add it to the `live` object at `:638` so the driver can reach it through
    `getStudio()`.
- **PATTERN**: `system/studio.mjs:441-470` (mount order and why each thing is mounted where it is).
- **GOTCHA**: mount **after** the verbs so the bus already has its `ui.undo`/`ui.redo` consumers when
  the menu can first emit. (Order does not matter for the marquee — D2's capture flag makes that
  case order-independent — but it does for the menu's verbs.)
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then open
  `http://127.0.0.1:4757/studio.html` and `…/factory.html`; both must reach
  `[data-canvas-select="ready"]` with a clean console.
- **SATISFIES**: AC #1, AC #4.

### 9 · UPDATE `tooling/studio-journey.mjs` — `selectPass`, and the drivers grow

- **IMPLEMENT** a new `async function selectPass(browser, t, errors)` driving `/factory.html` (settled)
  — the shipped surface, not just the harness — reusing the module's existing helpers:
  1. **Marquee by pointer**: Shift+drag across a known 2×2 cell range (`cellPoint`), then assert the
     selected id set equals `idsInRange` computed **in Node** from the live arrangement.
  2. **The keyboard path selects the SAME set**: on a fresh page, focus the anchor's handle, Shift+Right
     then Shift+Down, assert **set identity** with (1) — sorted, as ids. This is AC #1's whole claim.
  3. **The count is announced once**, `countLive`/`liveSeen`, exact — not "at least once".
  4. **Multi-move by pointer**: drag one selected member, assert **every** member landed at its offset,
     **one** `ui.move-group` on the bus (`busRecord`/`busSeen`) and **no** `ui.move`, **one**
     announcement, and `historyDepth` grew by exactly **one**.
  5. **Multi-move by keyboard**: pick up with Enter, ArrowDown, Enter — same four assertions, with the
     per-press announcement count the keyboard path deliberately has (`studio-verbs.mjs:718-721` — a
     naive once-per-gesture count sends an implementer to delete the per-step feedback, which is the
     wrong fix).
  6. **One undo**: click Undo once, assert **every** member is back — the AC's "undone in one step".
  7. **Guides are honest**: mid-carry, read every `.stx-guide`'s `data-col`/`data-row` and assert a
     **non-carried peer really occupies it**. Then the **MUTATION**: force a guide onto a provably
     empty column from the page and assert the check goes **red**. Guides are gone after drop and after
     cancel.
  8. **The context menu**: opens by right-click **and** by Shift+F10 from the focused handle; the two
     item lists are **identical** (compare accessible names); ArrowDown/Up/Home/End move focus;
     Escape closes and **returns focus to the invoker**; a menu item click starts **neither a pan nor a
     drag** (assert `scrollLeft/Top` unchanged and no `.is-picked`).
  9. **Escape non-interference, both directions** (D11): Escape during a marquee leaves a live carry
     alone, and Escape during a carry leaves a live marquee alone.
  10. **Escape cancels every multi-verb to the pre-verb state**: marquee → the prior selection;
      group carry → every origin; menu → closed, focus returned. (AC #5.)
  11. **⌘/Ctrl+A** selects all when the scroller holds focus, and the **menu's Select all** does the
      same thing when it does not (D10's visible path).
  12. **Reduced motion** (`reducedMotion: "reduce"` context): every verb above still **completes** and
      reaches the identical end state. (AC #6.)
  13. **R3 · the quick group drag** — a group drag of ~4 steps released **immediately** (no settling
      wait between the last `mouse.move` and `mouse.up`), asserted to land on the released cell and
      not one short. Run it on **webkit** specifically; it is the engine whose rAF flush is slowest
      and the only one where the stale frame is reliably reproducible.
  14. **R4 · the take-over coupling, both sides.** On a fresh page **mid-replay**: (a) a Shift-drag
      marquee **IS** a take-over — the transport dies, provenance flips to visitor, and
      `/factory/took-over` fires **exactly once**; (b) ⌘/Ctrl+A **is NOT** — the selection applies,
      the replay keeps playing to the committed board, and the route does **not** fire. Both rows
      exist to pin `replay-driver.mjs:781-782`'s capture flag and `:747`'s modifier rule, neither of
      which this ticket edits and both of which it depends on.
  15. **R5 · the menu at the far edge** — open the menu on a block in the **last** column, assert
      `data-flip-x` is set and that the menu's client rect sits **inside** the scroller's. Then one in
      an interior column with no flip, so the attribute is proven to be conditional rather than always
      on. Also: a scroll of `canvas.scroll` while the menu is open **closes** it.
  16. **R10 · compile does not clear the selection but does cancel a carry** — select three blocks,
      press Compile, assert all three are still `data-stx-selected`; then start a group carry, press
      Compile mid-carry, assert the carry is cancelled (every origin restored, no `.is-picked`) while
      the selection survives. Two assertions, because they look like one property and are two.
- **ALSO IMPLEMENT** in the same file:
  - `perfPass`'s `ROWS_FACTORY` gains **four** INP rows: `marquee drag`, `group pointer-drag`,
    `group keyboard step`, `context menu open`. Budget ≤ 200 ms per engine, through the existing
    injected observer. **Do not re-spike** — spike 2's pessimistic all-slots rewrite measured 32 ms
    under 4× throttle, and every operation here is lighter.
  - **the Fit-while-compiled row** the ticket's own comment asks for: at `data-compile-state="rendered"`
    the sizer grows to ≈3952 px against `.stx-scroll`'s 640 px cap, so **Fit pins at the 0.5 floor**.
    Assert the honest sentence `studio-canvas.mjs:174-177` already words — `"Zoom 50 percent, fit to
    the canvas"`, never "everything is in view" — and that the level is the floor. This is
    pre-existing graceful degradation (group 12 covers `fitLevel`'s floor); the row is the running-page
    proof no one had.
  - **the printed bounds sentence** at the tail: update the INP row count (18 → 22), and add
    ⌘/Ctrl+A's focus-scope bound (D10) and D9's recorded absence (no mode makes a drag over a
    component pan).
  - the final success `console.log` gains #217's clause.
- **PATTERN**: `tooling/studio-journey.mjs:3069` (`methodPass`) is the closest structural sibling —
  a pass over the shipped `/factory` with exact announcement counts and a Node-computed expectation.
- **GOTCHA — the artifact-fetch/route-delay trap**: `/factory`'s first replay beat fires sooner than a
  listener can attach, so a bus count is silently short by one unless the artifact fetch is delayed by
  route (`replayPass` does this). Every new pass must wait for `[data-replay="settled"]` **before**
  querying slots — both `[data-studio="ready"]` and `[data-studio-compile="ready"]` fire at MOUNT, and
  the canvas is empty then (`vt-verify.mjs:424-431` records the same break).
- **GOTCHA — two constraints decide where a case may place a node**: at this viewport column 9 sits at
  x ≈ 2025, outside the 1440 px window, so an **empty** cell is not automatically a **reachable** one.
  Injection is free of that; pointers are not.
- **GOTCHA**: memory `stale-serve-wrong-tree` — a parallel session's `serve.mjs` can hold 4757 for days
  serving **their** tree. `curl` an edited file (or set `PORT`/`BASE`) before trusting a run.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all` — zero failures on chromium, firefox and webkit.
- **SATISFIES**: AC #1, #2, #3, #4, #5, #6, #7.

### 10 · UPDATE `tooling/vt-verify.mjs` — zero transitions for every new verb

- **IMPLEMENT**: extend the studio-canvas block (`:330-397`, which drives `/studio.html`) with a
  marquee + group-move + menu-open sample, and add the same three to the factory block (`:399-451`).
  Assert `calls === 0` **and** zero running `::view-transition-*` pseudos, in both the normal and the
  `reducedMotion: "reduce"` contexts.
- **PATTERN**: `:344-361` — **the movement precondition is the point**: "zero pseudos is trivially true
  of a page where nothing happened, the defect class the canvas block above paid for twice." Prove the
  selection changed and the group moved **before** reading the counter.
- **GOTCHA**: `element.animate()` reports a **null** `pseudoElement` — do not relax the pseudo filter
  to try to catch the undo/redo FLIP. `HOOK`'s `startViewTransition` counter is the other net.
- **VALIDATE**: `node tooling/vt-verify.mjs all` — zero failures.
- **SATISFIES**: AC #6.

### 11 · UPDATE `system/param-manifest.json` + regenerate `param-count.json`

- **IMPLEMENT**: two new `/factory` entries, and **write the counting judgment down** — the drift check
  verifies the count, never the judgment:
  ```json
  { "page": "/factory", "selector": "[data-studio-canvas] .stx-stage",
    "label": "marquee multi-select (Shift-drag to select, Shift-click to toggle = one control)",
    "note": "added by #217; its OWN entry rather than a label edit on .stx-scroll's pan surface — the counting rule is one entry per distinct control, and Shift-drag runs different behaviour on a different element (the stage, not the scroller)" },
  { "page": "/factory", "selector": "[data-studio-canvas] .stx-menu",
    "label": "component context menu (select / deselect / select all / clear / undo / redo = one menu)",
    "note": "added by #217; conditional — opens on right-click or Shift+F10" }
  ```
  Keyboard shortcuts get **no** entry (⌘Z/⌘Y set that precedent at #205 and are unlisted).
  Then: `node agent-layer/gen-param-count.mjs`.
- **PATTERN**: the `$description`'s counting rules — *"one entry = one distinct control per page"*,
  *"conditional controls (appear after a visitor action) count, marked with a note"*.
- **GOTCHA**: CI `verify` drift-checks `param-count.json`; an omitted control is a review-catchable
  gap, and a stale count is a red build that gates main.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` (or re-run and confirm a clean
  `git diff` afterwards); `/approach` renders the site-wide total, so confirm it moved by exactly 2.
- **SATISFIES**: AC #8.

### 12 · REGENERATE the cascade — loc-summary and the four baselines

- **IMPLEMENT**, in this order:
  1. `node agent-layer/gen-loc-summary.mjs` — **a new tracked source file** (`studio-select.mjs`)
     changes the measured counts `/approach` renders.
  2. `node agent-layer/gen-param-count.mjs` (Task 11, if not already run).
  3. `git add` everything **first** — `gen-loc-summary` reads git-**tracked** content, so a `--check`
     before staging is a false "no drift" (memory `loc-summary-counts-tracked-only`).
  4. From a **clean detached worktree under `/Users`** (never `/private/tmp` — Docker can't share it;
     memories `vr-gate-reads-working-tree`, `local-agent-visual-gate-notes`):
     `cd tooling/visual-regression && npm run update:docker`.
  5. Expect **four** baselines: `/factory` ×2 (neutral + saulera — the help line's new sentence paints
     at rest) and `/approach` ×2 (the rendered loc numbers).
- **GOTCHA — the baseline-collision rule** (epic #202, and it is worse than a file conflict): two PRs
  regenerating the same PNGs from different trees silently re-baseline each other's regressions.
  **#219 also regenerates factory's baselines.** As of planning there are no open PRs and no #219
  branch, but check again immediately before regenerating: if #219 is in flight and merges first,
  merge `main` **then** re-run `update:docker` before review.
- **GOTCHA**: memory `vr-update-skips-subperceptual` — `update:docker` will not rewrite a baseline
  whose only change falls below pixelmatch's per-pixel threshold; `rm` the PNG to force it. And
  memory `vr-tolerance-hides-text-changes` — a green update run is **not** proof a page didn't change.
- **GOTCHA**: memory `drift-check-mid-merge-false-positive` — run drift-check on a clean tree, and
  resolve any generated-file conflict by **regeneration**, never by hand-editing.
- **VALIDATE**: `git status` clean after a re-run of both generators; `git diff --stat` shows exactly
  the four PNGs.
- **SATISFIES**: the epic's per-ticket cascade preamble.

### 13 · Manual cross-engine validation + the report

- **IMPLEMENT**: run the full gate set (below), then write `.claude/reports/studio-canvas-affordances-217-report.md`
  recording: the mutation results from Task 3 (which case went red for each break), the CSS
  reduced-motion choice from Task 7, D9's scope call, and every deviation from this plan.
- **VALIDATE**: the five commands in *Validation Commands* below, all green.
- **SATISFIES**: the completion checklist.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo — **do not hunt for or invent one**
(CLAUDE.md). "Done" = run the surface you touched, plus the gates that own it.

### Pure-layer checks (CI) — `tooling/build-checks.mjs`

Group 13 (extended) and group 22 (new). The property that matters is not coverage but **falsifiability**:
for each new pure function, break it in the working tree and confirm a named case goes red. Every
#137 defect survived a green gate the same way — the check skipped the thing it tested (memory
`check-that-cannot-fail`).

### Running-page checks (operator-run) — `tooling/studio-journey.mjs`

The pixel gate never interacts, so it cannot tell a live control from a dead one. `selectPass` is the
only thing that can assert:
- set identity between the pointer and keyboard selection paths (AC #1's whole claim);
- exactly one `ui.move-group`, exactly one announcement, exactly one history entry (AC #2);
- that a guide corresponds to a real peer (AC #3) — with the mutation that proves the check can fail;
- that the menu's two open paths produce identical items and full arrow navigation (AC #4);
- that Escape reaches each multi-verb and only its own (AC #5).

### Transition checks (operator-run) — `tooling/vt-verify.mjs`

`getAnimations()` alone cannot see a transition that opened and was skipped; `HOOK`'s
`startViewTransition` counter is the second net. Both, with the movement precondition first.

### Edge cases that must be exercised

- A group step blocked by a **non-member** peer → the whole set unchanged (never partially moved).
- A group step where a **member** occupies the destination → allowed.
- A 1-member "group" → byte-identical to today's single-node behaviour.
- A marquee over **zero** slots → `"Nothing to select."`, no DOM change.
- A marquee dragged in each of the four directions → the same normalized range.
- `Shift+Arrow` walking off the grid → clamped, announced, no throw.
- The menu opened on a node that is **not** selected vs one that **is** → the contextual item flips.
- Escape with a marquee live **and** a carry live → each cancels only its own.
- A `ui.move-group` naming an id that is not on the canvas → refusal in the live region, **DOM
  untouched**, nothing on the console.
- Reduced motion → every verb completes; no travel.
- Compile mid-carry (`studio.mjs:467`) → the group carry is cancelled cleanly.
- A `?b=` restore and a method-card redraft (`studio.mjs:614`) → the selection clears with the
  wrappers.

---

## VALIDATION COMMANDS

Execute every command. Zero regressions, 100 % feature correctness.

### Level 1 — Pure gates (CI parity)

```bash
node tooling/build-checks.mjs          # 22 groups; 7, 12, 13 and the new 22 are this ticket's
node tooling/token-lint.mjs            # no literal reaches studio.css
node tooling/drift-check.mjs           # generated artifacts match their sources
```

### Level 2 — Generators

```bash
node agent-layer/gen-loc-summary.mjs   # after `git add`
node agent-layer/gen-param-count.mjs
git status --porcelain                 # clean after a second run of both
```

### Level 3 — Running-page drivers (operator-run, three engines)

```bash
node tooling/visual-regression/serve.mjs &     # repo root on 127.0.0.1:4757
curl -s http://127.0.0.1:4757/system/studio-select.mjs | head -3   # prove the serve is THIS tree
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
```

### Level 4 — Manual validation

1. `http://127.0.0.1:4757/factory.html`, wait for the replay to settle.
2. Shift-drag across two blocks → both outline; the live region says `"2 selected: …"` once.
3. Drag one of them → both move together; **one** Undo puts both back.
4. Tab to a grab handle → Shift+F10 → the menu opens with focus on the first item; Arrow keys walk it;
   Escape closes and focus returns to the handle.
5. Right-click the same block → the identical item list.
6. Pick up a block with Enter and arrow it into a column that holds a peer → a guide appears over that
   column and **not** over an empty one.
7. Escape mid-carry → everything back where it was.
8. Compile the board, then press **Fit** → `"Zoom 50 percent, fit to the canvas"` (the honest floor),
   never a claim that everything is in view.
9. With `prefers-reduced-motion: reduce` (devtools rendering pane) → repeat 2–7; every verb completes.
10. Real Safari and real Chrome, not just the bundled engines — memory
    `vr-gate-single-engine-blindspot`: the gate's Chromium missed a real Safari/Chrome-stable grid
    blowout on PR #54.

### Level 5 — The visual gate

```bash
# from a CLEAN detached worktree under /Users (not /private/tmp)
cd tooling/visual-regression && npm run update:docker
```
Four baselines expected: `/factory` ×2, `/approach` ×2. Anything else is a regression to explain, not
to re-baseline.

---

## ACCEPTANCE CRITERIA

Verbatim from #217, each mapped to its proof:

- [ ] **Marquee selects by pointer; an equivalent keyboard path selects the same set and announces the
      count.** → group 22 (`marqueeRange`/`idsInRange`/`extendSelection` set identity, pure) +
      `selectPass` (1)(2)(3) on the running page.
- [ ] **Multi-move lands every selected item in its slot, announced once for the group, undone in one
      step.** → group 13 (`groupStep`/`groupDelta`) + `selectPass` (4)(5)(6): one `ui.move-group`, one
      announcement, `historyDepth` +1, one Undo restores all.
- [ ] **Alignment guides appear only against real slot edges.** → group 13 (`guidesFor`) +
      `selectPass` (7) **including the mutation that forces a guide over an empty column and watches
      the check go red**.
- [ ] **The context menu opens by keyboard (ContextMenu key / Shift+F10) and by pointer, with
      identical items and full arrow-key navigation.** → group 22 (`menuItems`, one source for both) +
      `selectPass` (8).
- [ ] **Escape cancels every multi-verb back to the pre-verb state.** → `selectPass` (9)(10), both
      directions of non-interference.
- [ ] **Zero `::view-transition-*` pseudos for any of it; reduced motion completes every verb without
      travel.** → `vt-verify` (both contexts, movement proven first) + `selectPass` (12).
- [ ] **The studio journey driver (#213) grows to cover each new verb by keyboard.** → `selectPass`
      drives (2)(5)(8)(10)(11) from the keyboard; `perfPass` gains four INP rows; the printed bounds
      sentence grows.
- [ ] **Each new control has a `param-manifest.json` entry.** → two entries + `gen-param-count`;
      `/approach`'s total moves by exactly 2.

Plus the standing rules:

- [ ] `node tooling/build-checks.mjs` green, group 7 still reporting `writes === 1` with
      `studio-select.mjs` in `MODULES` and **no exception argued**.
- [ ] No inline style and no markup-from-string in either module; the running page carries no `style`
      attribute on the stage, the scroller, any slot, any guide or the menu.
- [ ] `system/action-bus.mjs` unedited.
- [ ] Single-node drag, keyboard move, undo/redo and the three-source proof all behave **exactly** as
      before — the existing journey sections pass unchanged.
- [ ] loc-summary + 4 baselines regenerated in the same PR.
- [ ] PR body carries `Closes #217`; the plan, report and review all live in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All 13 tasks completed in order
- [ ] Each task's `VALIDATE` passed immediately
- [ ] All five validation levels executed
- [ ] **Every row of the RISK REGISTER walked**: its mitigation landed and its detector observed to
      exist (and, for R1–R6's mutations, observed to go red)
- [ ] The mutation sweep run and **each named case** recorded in the report — six rows, six case names
- [ ] Announcement counts implemented and asserted from **D12's table**, not re-derived
- [ ] Manual cross-engine pass, including real Safari and real Chrome
- [ ] Acceptance criteria all met
- [ ] `.claude/reports/studio-canvas-affordances-217-report.md` written and committed **in this PR**
- [ ] `.claude/code-reviews/pr-<N>-review.md` after review, same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each is a decision above; flagged here so a different answer is
visible before code exists):

1. **Shift is the marquee modifier** and no shipped drag behaviour moves (D2). **Decided, not open —
   and reversible at a stated cost**, so implementation proceeds without waiting on it. The
   alternative is the Figma convention (bare drag marquees; pan moves to a hand-tool mode), which is
   arguably *better* for tool-feel — the epic's whole subject. It is not chosen here because it
   breaks four shipped, gated things at once: #204's pan contract, the journey's pan and bare-wheel
   sections, the scroller's `aria-label`, and the `/factory` param-manifest label — mid-epic, in a
   ticket whose ACs are about something else. **Reversal cost if the owner wants it later:** D2, D9,
   three journey sections, one param entry, and a hand-tool mode UI the epic's behavior gradient
   currently resists. That is a ticket, not an amendment — the natural home is #221 or #223's
   recorded cuts.
2. **The marquee draws no rubber band** (D3). If a visible band is wanted, it must snap to cells, and
   the only zero-inline-style rendering is one element per covered cell (up to 96) — worth doing only
   if the live outline reads as too subtle in the hallway test.
3. **Selection is not a bus verb** (D5). The tie-breaker is "no agent source"; the day a replay op
   records a selection this becomes `ui.select` with one consumer, and the header says so.
4. **Discoverability of the context menu** rests on one help sentence. Nothing in the ACs requires a
   visible affordance, but a hiring manager who never right-clicks never finds it. **Flagged for
   #223's hallway test**; the fix is a per-block "⋯" button, which belongs in #221 because it churns
   every block and adds a per-wrapper control.
5. **D9's scope call** — this ticket adds neither zoom-to-fit (landed at #204) nor a hand tool (pan-by-drag
   covers it on empty canvas; no mode makes a drag over a component pan). If #223 wants the missing
   mode, it is its own ticket.

**Genuinely open, and not blocking:**

- Whether the menu's cell anchoring reads acceptably at zoom 0.5 and 2.0 (it scales with the stage,
  because it is canvas content). Decide by looking at it during Task 8's manual check; the escape
  hatch — rendering the menu in the viewport instead — costs a pixel style and is therefore a group 7
  exception that would have to be argued, so it is a last resort, not a preference.
- Whether the four new INP rows want their own calibration row. Current judgment: no — `perfPass`'s
  existing per-engine calibration click already proves the delivery pipeline alive, and a second one
  would measure the same thing twice.

---

## NOTES (open canvas)

### Why not put all of it in `studio-verbs.mjs`

Considered and rejected. It would reach ~1 500 lines, and — more importantly — it would merge two
different lifetimes: a **selection** survives across gestures, compiles and undos, while a **gesture**
is born and dies inside one press. The bug that shape invites is a stale selection surviving a board
redraft, which is exactly what D4's DOM-carried set makes impossible (`studio.mjs:614` removes the
wrappers, and the selection goes with them).

### Why not a `ui.select` bus verb — the full argument

The bus's stated purpose (`studio-verbs.mjs:12-18`) is that a **third** source exists: a
`source:"agent"` action from the replay driver moves the same node through the same code, so parity is
true by construction rather than by two paths that happen to agree. Selection has no third source and
never will under the current op vocabulary (`board-ops.mjs`'s eight ops are authorship, not view
state). `studio-flow.mjs` faced the identical question for `ui.navigate` and declined for the same
reason — *"one emitter + one consumer invented for symmetry"*. What replaces the bus's guarantee here
is weaker but sufficient and checkable: **one internal `applySelection`**, plus a driver assertion of
**set identity** between the two input paths. Written down so a reviewer reads a decision rather than
an omission.

### RISK REGISTER — every risk has an owning task and a detector that can fail

A risk with no detector is a hope. Each row names the task that mitigates it **and** the check that
goes red if the mitigation is wrong; where the detector is a mutation, it is numbered against Task 3's
sweep table.

| # | risk | why it is easy to ship | mitigation (task) | detector |
|---|---|---|---|---|
| **R1** | `stepSlot` reused for a group — it walks past occupied cells, so members land at different offsets and the selection deforms | it looks correct for a 1-member group, which is what gets tried first | `groupStep`/`groupDelta`, all-or-nothing (T1) | group 13's blocked case by **deep equality** + mutations 1 & 2 — a "did it move?" assertion passes a partial move |
| **R2** | a guide drawn where no peer is — the lie AC #3 names | a guide-count assertion passes for guides drawn anywhere | `guidesFor` requires a peer AND a carried member (T1) | journey (7) reads each guide's cell and proves a peer occupies it, **plus** forcing a guide onto an empty column and watching red; mutation 3 |
| **R3** | a stale rAF preview frame committed on drop — the group lands one cell short | intermittent; clean on chromium, reproducible on webkit | the group path goes through **both** `flushPreview` call sites (T4/T5) | journey (13), a quick group drag on webkit |
| **R4** | the marquee's `stopPropagation` suppressing the replay take-over | it is safe **only** because the driver captures on an ancestor (`replay-driver.mjs:781`); a future move to bubble phase breaks it silently | listeners on `stage` in capture; **the driver is not edited** (T6) | journey (14a) — a marquee mid-replay must fire `/factory/took-over` exactly once |
| **R4b** | ⌘/Ctrl+A mid-replay is **not** a take-over (`:747` returns early on `ctrlKey/metaKey`) | a reader assumes symmetry with Shift+Arrow and "fixes" the discriminator, changing ⌘Z's gated behaviour | inherited, not fixed; recorded in the module header (T6) | journey (14b) pins the non-handover explicitly |
| **R5** | the menu opening outside the visible scroller at column 12 / row 8 | invisible on every interior cell, which is where it gets tried | `menuAnchor`'s `flipX/flipY` → two attribute rules (T2/T6/T7) | group 22's both-sides-of-the-boundary cases + mutation 5; journey (15) asserts the rect is inside the scroller |
| **R6** | a wrong expected announcement count — reads as a feature bug, not an assertion bug | counts differ **per path on purpose**; invented at assertion-writing time they drift | the **D12 contract table** is the single source for T5, T6 and T9 | journey rows assert exact counts with the table's reason quoted beside each |
| **R7** | a menu left floating after a pan, detached from its block | the menu is anchored to a cell inside a scrolling substrate | a `scroll` listener closes it (T6) | journey (15)'s closing assertion |
| **R8** | a whole-canvas selection that can never move, reading as broken | all-or-nothing is *correct* here but silent | the blocked sentence names the group (D12) | group 13's every-slot-selected case |
| **R9** | a group drop that moved nothing writing a history entry | `moved` is per-member and easy to get wrong | `moved` = **any** member changed (T4) | journey (4)'s `historyDepth` delta, asserted as exactly 1 for a real move and 0 for a null one |
| **R10** | compile clearing the selection, or failing to cancel a group carry | both flow through one `verbs.cancel()` call and look like one property | list-aware `cancel()`; selection lives on surviving wrappers (T4) | journey (16), asserted as **two** rows |
| **R11** | a baseline collision with #219, silently re-baselining a regression | the pixel gate regenerates from whichever tree ran it | re-check for #219 immediately before regenerating (T12) | `gh pr list` + `git branch -a` at regen time; merge `main` first if it landed |

The three that have actually bitten this repo before, and so deserve the most suspicion: **R3** (#205
paid for it once — `studio-verbs.mjs:502-518` records that `flushPreview`'s two call sites cover each
other and neither is individually proven), **R2** (memory `check-that-cannot-fail`: every #137 defect
survived a green gate because the check skipped the thing it tested), and **R11** (the epic's own
baseline-collision preamble).

### Sequencing note for a parallel run

Phases 2 and 3 touch different files (`studio-verbs.mjs` vs the new module) and share only Phase 1's
pure exports, so they can run in separate worktrees. Phase 4 cannot be split: `selectPass` exercises
both, and the baseline regen must happen once, from one tree (memory
`shared-worktree-parallel-sessions` — verify the branch right before committing and stage by explicit
path).

### Confidence

**9.5/10** for one-pass success. What carried the risk was never the design but the exactness this
repo's drivers demand — announcement counts asserted per path and per verb, where a wrong count looks
like a feature bug rather than an assertion bug. That is now **D12's contract table**, which Tasks 5,
6 and 9 all read instead of each deciding; combined with `SPOKEN_MAX` reused rather than re-invented
and the per-press rule kept explicit (`studio-verbs.mjs:718-721`), it is the largest single reduction
in one-pass risk this plan makes.

The eleven risks in the register above each have an owning task and a detector that can fail. Six of
them are proven falsifiable by Task 3's mutation sweep, which is the only thing that distinguishes a
gate from a green light — and the reason the sweep's results go in the report, named case by named
case, rather than being asserted to have happened.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
