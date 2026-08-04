# Feature: Studio 3 — canvas manipulation (drag, keyboard parity, undo/redo, announcements)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.
In particular: `MAX_COLS` / `MAX_ROWS` / `ZOOM_LEVELS` / `clampSlot` are **exported from
`system/studio-canvas.mjs`** and must be imported, never re-typed.

## Feature Description

The manipulation layer on top of #204's canvas substrate. #204 shipped a DOM stage that pans, zooms
and *holds* components in grid slots — placement is programmatic only. This ticket makes the stage
**operable**: a placed component can be picked up and moved to another grid slot by pointer or by
keyboard, every move is announced in a live region by the slot it landed in, every move is
undoable and redoable, and every move travels the action bus with an honest `source`.

The load-bearing structural call — and the one that makes the acceptance criteria provable rather
than asserted twice — is that **the bus is the drive path, not an observer**. Both input paths emit
one `ui.move`; a single consumer applies it. "The keyboard path produces the identical model change
as the pointer path" is then true by construction, and a third source (a `source:"agent"` action
injected through the exported seam, which is exactly what #209's replay driver will be) moves the
same node through the same code. `system/bus-toggles.mjs:150-170` states this pattern in so many
words and `tooling/proto-journey.mjs` is the driver that proves it; this ticket is the second
application of both.

Still proven on the raw harness (`studio.html`). No shipped page mounts this — `/factory` becoming
the studio is #206.

## User Story

As a hiring manager evaluating this portfolio,
I want to grab a component on the studio canvas and move it — with a mouse or entirely from the
keyboard — and be told plainly where it landed, with a way to undo,
So that the site stops *describing* a prototyping tool and starts behaving like one, without
locking out anyone who does not use a pointer.

## Problem Statement

After #204 the canvas is a display surface. `place()` is programmatic; nothing on the stage responds
to a reader. The epic's whole thesis ("the portfolio becomes the tool it describes") and its
strongest accessibility claim (PRD §5 / Success metric *Accessibility* — full keyboard parity for
every canvas verb, WCAG 2.5.7, zero violations) both live in this layer. Every downstream ticket
(#206 orchestrator, #207 compile beat, #209 replay take-over, #217 marquee/guides, #221 layers list)
assumes moving works and assumes the bus-as-drive-path shape; getting it wrong here is re-argued
five times.

## Solution Statement

One new hand-written canon module, `system/studio-verbs.mjs`, mounted over #204's canvas handle,
plus a small, surgical set of edits to `system/studio-canvas.mjs`, `system/studio.css` and
`studio.html`.

The shape:

1. **`place()` wraps.** Today the rendered component *is* the `.stx-slot`, and one of the harness's
   components (`primary-button`) renders as a bare `<button>` — so Enter/Space on a slot would be
   ambiguous between activating the component and picking it up. `place()` grows a wrapper: the
   `.stx-slot` becomes a `<div>` carrying `data-col`/`data-row`, holding a `.stx-grab` move button
   and the component. Idempotent — re-placing an existing wrapper moves it rather than double-wrapping,
   which is what keeps both existing drivers passing unchanged.
2. **A gesture is a preview; only the drop commits.** Pointer drag and keyboard arrow-stepping both
   move the node *live* (instant, no animation) while remembering the origin slot. The drop emits
   **exactly one** `ui.move`. Escape discards the preview and restores the origin. This is what makes
   one gesture equal one announcement, one undo entry and one bus action — pointer and keyboard alike.
3. **One consumer.** `bus.on("ui.move")` is the only place a slot is committed: push the undo
   snapshot, write the attributes through the shared `applySlot`, announce. A synthetic `ui.move`
   emitted straight onto the bus moves the node identically — that is the driver's strongest
   assertion, and #209's mechanism.
4. **Undo/redo is a snapshot stack** of the whole arrangement (`{ id: {col,row} }`,
   `structuredClone`d), per the architecture's explicit call. Pure and DOM-free, so CI deep-compares
   it rather than the driver eyeballing the DOM.
5. **Occupancy: an occupied cell is not enterable.** The occupancy set is built at gesture start
   (peers do not move during a gesture); the arrow resolver skips non-enterable cells and the pointer
   hit-test keeps the last valid slot. No drop refusal to word, no double-move to snapshot, one rule
   shared by both paths, and "moved to column 2, row 1" stays unambiguously true.
6. **Movement animates only on undo/redo**, via `element.animate()` FLIP — the one movement the
   reader's own hand or keypress did not track.

## Out of Scope / Non-Goals

- **Not included: marquee select, alignment guides, context menu, multi-move.** Those are #217, by name.
- **Not included: a layers list or minimap** (#221, and a pre-agreed scope cut).
- **Not included: any shipped-page mount.** `/factory` route surgery is #206. Nothing outside
  `studio.html` gains this module, so **no VR baseline moves for a shipped page.**
- **Not included: a board/build-state model.** The architecture's snapshot is "board + arrangement";
  at #205 there is no board on the canvas yet (it arrives with #206/#207). The stack snapshots the
  **arrangement**, and its shape (`{id: {col,row}}` behind a pure push/undo/redo) is chosen so #206+
  extends the snapshot's contents without changing the stack.
- **Not included: touch authoring.** `pointerType === "touch"` bails, citing the PRD non-goal "No
  mobile AUTHORING parity — mobile watches the replay and uses the form path". Stated in the module
  header as a decision, never left as an unexplained gap.
- **Not included: `content-visibility` on off-screen slots or deferred redraws.** Spike 2's verdict
  was HOLDS and its report says in terms that #205 must not add the failure branch's mitigations
  speculatively.
- **Not changing:** the pan/zoom behaviour, the bare-wheel rule, `clampSlot`, `fitLevel`, the CSS
  scale table, or anything about how #204's four zoom verbs work.
- **Not changing:** `system/action-bus.mjs`. The point (as with #176) is that a consumer was all this
  needed.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/studio-verbs.mjs` (new) · `system/studio-canvas.mjs` ·
`system/studio.css` · `studio.html` · `tooling/build-checks.mjs` · `tooling/studio-journey.mjs` ·
`tooling/vt-verify.mjs`
**Dependencies**: none new. Playwright stays resolved out of `tooling/visual-regression/node_modules`
and must never become a repo dep.

## Related Work

**Implements**: [#205](https://github.com/linardsb/ux-factory/issues/205) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) ·
`docs/epics/prototype-studio.architecture.md`

**Back-references:**

- `.claude/plans/studio-canvas-stage-204.md` + `.claude/reports/studio-canvas-stage-204-report.md` —
  the substrate this sits on **and spike 2's verdict, which this ticket consumes rather than
  re-derives**.
- `.claude/plans/protos-bus-toggles-device-frame-176.md` — the bus-as-drive-path pattern and the
  three-sources-one-DOM-result assertion shape, both reused here verbatim.

**Forward-references:**

- (none yet — #217 grows `studio-verbs.mjs`; #209 drives its consumer with `source:"agent"`.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING

- `system/studio-canvas.mjs` (whole file, 289 lines) — Why: the substrate. Read the header's three
  substrate calls; they are inherited, not re-argued. Note `place()` (:254-263), the handle object
  (:265-281), the `finally` readiness handle (:285-288), the `getCanvas()` seam (:95), and
  **`(e.buttons & 1) === 0 → endPan` at :239**, which the mover must copy.
- `system/studio.css` (whole file, 120 lines) — Why: the class vocabulary and the reason the scale
  table lives in CSS at all (the module writes zero inline styles). The reduced-motion block at
  :116-120 is the off-ramp this ticket extends.
- `system/bus-toggles.mjs` (lines 40-75, 150-200) — Why: **the pattern this ticket is the second
  application of.** The `getSlotBus()` export seam (:70), "the controls EMIT and do nothing else"
  (:157-159), the `e.detail === 0 ⇒ keyboard` source idiom (:164), and refusals going to the readout
  and never to a throw (`action-bus.mjs:70-77` swallows handler throws into `console.error`, which
  would both hide the refusal and trip the driver's no-console-errors contract).
- `system/action-bus.mjs` (whole file, 83 lines) — Why: the contract. `TYPE_RE` is
  `/^(ui|agent)\.[a-z][a-z-]*$/` and `SOURCES` is `pointer|keyboard|agent|voice`. `ui.*` = UI→agent;
  `source` is orthogonal to direction. **Do not edit this file.**
- `system/breadboard.mjs` (lines 200-240, 596-613, 620-632) — Why: the verb discipline being
  extended to 2-D. `announce()` (:201), `commit(message, focus)` (:227-233) — every verb announces
  and every verb places focus — `applyPendingFocus()` (:600-613) on why focus must be deliberate, and
  **:628's `getComputedStyle(placesEl).gridTemplateColumns` read** (the "CSS stays the one place the
  layout is decided" idiom the hit-test reuses).
- `system/scrub.mjs` (lines 26-96) — Why: the seed pointer idiom named by the architecture — pointer
  capture, rAF throttle, ARIA reflection, `AbortController` teardown, and the
  cancel-a-pending-frame-on-new-gesture guard at :55.
- `tooling/build-checks.mjs` (lines 720-780 = group 7; lines 1504-1620 = group 12; the final verdict
  block) — Why: group 7's `MODULES` list at :733 (the new module joins it, **no exception argued**),
  the `STYLE_WRITE` regex at :756 and what it does and does not count, and group 12's exhaustive
  both-directions mirror discipline that group 13 will mirror in style.
- `tooling/studio-journey.mjs` (whole file, 313 lines) — Why: the driver being **extended, not
  replaced**. Note `snapshot()` (:65-89) and its `inlineStyled` field, the `viaSeam` helper (:93-100)
  which reads `data-col` off the placed node (this is the call that constrains `place()`'s wrapper
  refactor), and the reduced-motion section's note (:274-277) on why an assertion must be able to be
  wrong.
- `tooling/vt-verify.mjs` (lines 279-347) — Why: the studio block being extended. The precondition
  idiom ("prove the movement, THEN assert zero transitions") and the pseudo filter at :320-322, which
  reads `a.effect.pseudoElement` — **a FLIP `element.animate()` has a null `pseudoElement` and is
  therefore correctly invisible to it.**
- `studio.html` (whole file, 137 lines) — Why: the harness. Its module script builds ~31 real
  components and calls `place()`; it gains the bus and the verbs mount.
- `system/agentic-renderer.mjs` (lines 239-249) — Why: **the fact that forces the wrapper.**
  `primary-button` returns a bare `<button>` as the component root.
- `system/param-manifest.json` (`$description` only) — Why: to confirm the deliberate no-op below.

### New Files to Create

- `system/studio-verbs.mjs` — the canvas's manipulation verbs: the pure layer (history stack, arrow
  resolver, hit-test, occupancy) + the mount that wires pointer, keyboard and the single bus consumer.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
  - Specific section: the *single-pointer alternative* requirement.
  - Why: the ticket and the PRD both cite 2.5.7 for keyboard parity. Note precisely what it requires:
    functionality that uses a **dragging** movement must have a **single-pointer** alternative
    (a click/tap path). Our `.stx-grab` button satisfies 2.5.7 literally (click to pick up, click to
    drop); the **keyboard** path satisfies SC 2.1.1 Keyboard. Get both right and say which is which
    in the module header — the epic's success metric is "zero WCAG 2.5.7 violations" and a plan that
    conflates the two criteria cannot claim it honestly.
- [MDN — Element.animate()](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)
  - Specific section: `KeyframeEffect` / the returned `Animation`.
  - Why: the FLIP path. `element.animate()` does not touch `.style`, so it is invisible to group 7's
    `STYLE_WRITE` regex **and** to `studio-journey`'s running-page `hasAttribute("style")` assertion —
    both remain literally true rather than excused. State that second half in the code comment, or it
    reads as a regex dodge.
- [MDN — Pointer events / setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  - Why: capture is **not optional** here. Live re-slotting moves the node out from under the cursor,
    so without capture the gesture dies on the first crossing.
- [WAI-ARIA — aria-live / role=status](https://www.w3.org/TR/wai-aria-1.2/#status)
  - Why: the announcer already exists (`studio-canvas.mjs:132`, `role="status" aria-live="polite"`).
    Reuse it via the handle; do not declare a second region.

### Patterns to Follow

**Module header** — every feature/entry-point file opens with a header citing its governing doc.
Mirror `system/studio-canvas.mjs:1-32`: what the file is, the load-bearing calls made here so
downstream tickets inherit rather than re-argue them, and the Node-import-safety statement.

**The exported driver seam** (never a `window.__` global) — `studio-canvas.mjs:91-95`:

```js
let live = null; // the mounted mover — the exported seam below drives THIS one, never a new one
export const getVerbs = () => live;
```

**The bus emit, with an honest source** — `bus-toggles.mjs:160-169`:

```js
bus.emit({
  type: "ui.move",
  // agentic-renderer.mjs:208's idiom, verbatim: a keyboard-activated click reports detail 0.
  source: e && e.detail === 0 ? "keyboard" : "pointer",
  target: { component, id },
  params: { col, row },
});
```

**The firefox captured-pointer guard** — `studio-canvas.mjs:232-242`, copy the reasoning with it:

```js
// Bail BEFORE applying the delta. Firefox, once a captured pointer leaves the window, keeps
// delivering pointermove with clientX 0 and buttons 0 — applied literally that is a huge jump.
if ((e.buttons & 1) === 0) { endDrag(e); return; }
```

**Reading layout from the resolved grid, not from custom properties** — `breadboard.mjs:628`'s idiom:

```js
const cs = getComputedStyle(stage);
const cols = cs.gridTemplateColumns.split(/\s+/).map(parseFloat); // USED px values
const gap  = parseFloat(cs.columnGap) || 0;
```

Prefer this over `getPropertyValue("--stx-slot-w")`: the used value is a layout fact and needs no
per-engine argument about whether `var(--spacing-md, 16px)` resolves inside a computed custom
property.

**A refusal goes to the live region, never to a throw** — `bus-toggles.mjs`'s call, for the same
reason: `action-bus.mjs:70-77` catches handler throws into `console.error`, which hides the refusal
from the reader *and* trips `studio-journey`'s no-console-errors contract.

**Node-import safety** — `studio-canvas.mjs:30-32`. No DOM outside a function body, no self-boot,
because `tooling/build-checks.mjs` imports this file directly for its pure exports.

---

## IMPLEMENTATION PLAN

### Phase 1: The pure layer

The DOM-free half of `studio-verbs.mjs`, written first so `build-checks` can gate it in CI without a
browser. History stack, arrow resolver, pointer hit-test, occupancy set.

### Phase 2: The substrate edits

**Depends on:** nothing (independent of Phase 1) — but land it before Phase 3.

`place()` wraps and stays idempotent; the handle exposes `say`. `studio.css` gains the wrapper, grab
handle, picked-up and drop-preview rules.

### Phase 3: The mount — pointer, keyboard, one consumer

**Depends on:** Phases 1 and 2.

### Phase 4: Gates

**Depends on:** Phase 3.
`build-checks` group 7 list + new group 13 · `studio-journey` extension · `vt-verify` extension.

### Phase 5: Cascades

**Depends on:** Phase 4 (nothing should regenerate against a tree still being edited).
`gen-loc-summary` + both approach baselines.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### CREATE `system/studio-verbs.mjs` — the pure layer

- **IMPLEMENT**: the file header (per `studio-canvas.mjs:1-32`'s shape) plus these pure, DOM-free,
  exported functions. **Every one takes plain data and returns plain data**, so group 13 can drive
  them in CI:
  - `export const DIRS = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] }`
  - `export function occupancyKey({col,row})` → `` `${col},${row}` ``
  - `export function stepSlot(from, dir, occupied)` — one arrow step. Walk one cell in `dir`; while
    the candidate is in `occupied`, keep walking in the same direction; stop at the grid edge
    (`clampSlot`'s bounds, imported) and return `from` unchanged if no free cell exists that way.
    Returns a `{col,row}`. **Never returns an occupied or off-grid slot.**
  - `export function hitSlot(x, y, geom)` — a point **already in the stage's unscaled local space**
    → slot. `geom` is `{ cols: number[], rows: number[], colGap, rowGap }` (used track sizes, per the
    `gridTemplateColumns` idiom). Walks the track list accumulating `track + gap` and returns the
    1-based index whose band contains `x`; clamps to the ends. Same for `y`. Returns `clampSlot`'d.
    A point landing **in a gap** resolves to the track **before** it — state that rule in the doc
    comment; group 13 asserts it, so it must be decided rather than discovered.
    **This function does no coordinate conversion.** The four-step chain from a `clientX`/`clientY`
    to its argument lives in the mount (see the mount task's gotcha) — kept out of here so the
    function stays pure and CI-drivable.
  - `export function createHistory(initial)` → `{ push(snap), undo(), redo(), canUndo(), canRedo(),
    current(), depth() }` over `{ stack: [], index: 0 }`, every stored snapshot `structuredClone`d
    on the way in and out so a caller can never mutate history. `push` truncates the redo tail
    (`stack.length = index + 1`) before appending — the standard rule, and the one that makes
    "undo, redo, then a new move" behave.
  - `export const HISTORY_MAX = 50` — cap the stack; drop from the front when exceeded, adjusting
    `index`. ~1 KB a snapshot per the architecture, so 50 is ~50 KB and generous.
- **PATTERN**: pure-layer-then-mount split — `system/studio-canvas.mjs:34-73`, and the same reason:
  `build-checks` imports the module for its pure exports alone.
- **IMPORTS**: `import { MAX_COLS, MAX_ROWS, clampSlot } from "./studio-canvas.mjs";` — the caps are
  imported, never re-typed (`LABEL_MAX` / `SLOT_MAX` precedent; group 12's tripwire is planted for
  exactly this).
- **GOTCHA**: `structuredClone` is available in Node ≥17 and every target browser — the architecture
  names it explicitly, so use it rather than `JSON.parse(JSON.stringify())`.
- **GOTCHA**: `stepSlot` must terminate. A fully-occupied row plus a naive `while` is an infinite
  loop; bound the walk by `MAX_COLS` **or** `MAX_ROWS` iterations — the walk is **single-axis** (it
  keeps going in the given direction and never turns), so the bound is per-axis, not their product.
  A diagonal or spiral search is not what this is.
- **VALIDATE**: `node --check system/studio-verbs.mjs && node -e "import('./system/studio-verbs.mjs').then(m=>console.log(Object.keys(m).join(' ')))"`
- **SATISFIES**: AC #3 (the snapshot stack), AC #1 (the shared resolver both paths use)

### UPDATE `system/studio-canvas.mjs` — `place()` wraps, and the handle exposes `say`

- **IMPLEMENT**:
  1. `place(node, {col,row,name})` now builds a wrapper when it needs one and **reuses it when the
     argument already is one**:
     ```js
     const wrap = node.classList.contains("stx-slot") ? node
       : (node.parentElement?.classList.contains("stx-slot") ? node.parentElement : null)
       || el("div", { class: "stx-slot" });
     ```
     If the wrapper was just created: append a `.stx-grab` `<button type="button">` **first**, then
     the component. Set `data-stx-name` on the wrapper (from `name` / `node.dataset.stxName` /
     `"Component"`) and give the grab button an accessible name — `aria-label="Move <name>"` —
     and an `aria-describedby` pointing at one static instructions element the mount adds ("Enter to
     pick up, arrow keys to move, Enter to drop, Escape to cancel"), so the affordance is
     discoverable on focus **before** pick-up. Write `data-col`/`data-row` on the **wrapper**, append
     the wrapper to the stage, announce as before. Return the slot, unchanged.
     **No `aria-pressed`.** It means a toggle button's own on/off state; a screen reader would read
     "Move Metric 1, pressed", which describes the button rather than the component being grabbed.
     `aria-grabbed` is the semantic that would fit and it is deprecated in ARIA 1.2. The picked-up
     state is carried by the live region (which already announces it) and by `.is-picked` visually.
  2. Assign a stable id once per wrapper: `data-stx-id="s1"`, `"s2"`… from a module-scope counter, so
     the arrangement snapshot is keyed by something that survives re-slotting.
  3. Add `say` to the handle object so the mover uses the canvas's one live region rather than
     declaring a second: `handleObj.say = say`.
  4. Leave everything else — the pan handlers, zoom, `clampSlot`, `fitLevel`, the `finally` — alone.
- **PATTERN**: `system/studio-canvas.mjs:254-263` (the existing `place`); the `el()` helper is already
  in the file at :80.
- **GOTCHA**: **the announcement phrasing does not change.** `place()` still says "*in* column X, row
  Y" (it is placement, not movement); "*moved to* column X, row Y" belongs to the mover. The #204
  header at :250-253 says so in terms.
- **GOTCHA**: the idempotent branch is what keeps `tooling/studio-journey.mjs:93-100` and
  `tooling/vt-verify.mjs:298-306` green without editing them — both do
  `querySelector(".stx-slot")` → `place(node)` → read `data-col` off that same node. **Confirm this
  by running both drivers before touching them.** If either goes red, fix it in the same task.
- **GOTCHA**: still zero inline-style writes. Nothing here may touch `.style`.
- **VALIDATE** — run **all four**, in this order, **before writing a single line of the mount**.
  Assumption 4 (the wrapper keeps both existing drivers green) is asserted by reasoning here and
  must be confirmed by running them; discovering it three tasks later means more code sitting on a
  red driver.
  ```bash
  node tooling/build-checks.mjs                  # groups 7 and 12 stay green
  node tooling/visual-regression/serve.mjs &
  node tooling/studio-journey.mjs chromium       # viaSeam still reads data-col off the placed node
  node tooling/vt-verify.mjs chromium            # movePlace() still moves something
  ```
  If either driver goes red, fix it **in this task** — they are ours, and #213 grows the journey anyway.
- **SATISFIES**: AC #1 (an unambiguous keyboard target for every component type, `primary-button`
  included)

### UPDATE `system/studio.css` — the wrapper, the handle, the two gesture states

- **IMPLEMENT**: append a `/* ---------- manipulation (#205) ---------- */` section:
  - `.stx-slot { position: relative; display: flex; }` and the component child filling it — the
    wrapper is now a box, not the component.
  - `.stx-grab` — a small always-present move affordance in the wrapper's corner, real button styling
    from tokens, `cursor: grab`; visible focus ring via `:focus-visible` (the `.stx-scroll` rule at
    :57 is the pattern). It must be **visible without hover** (a hover-only handle is unreachable by
    keyboard-with-sighted-use and by touch).
  - `.stx-slot.is-picked` — the picked-up state: a token-coloured outline/elevation, `cursor: grabbing`
    on the handle. This is the **only** visual carrier of picked-up state; the ARIA half is the live
    region's pick-up announcement, not an attribute (see the `place()` task's `aria-pressed` note).
  - `.stx-slot.is-preview` — the mid-gesture appearance if it differs from `is-picked` (it may not;
    if it does not, do not add the class — no unused rules).
  - Extend the existing `@media (prefers-reduced-motion: reduce)` block at :116 to name the new
    classes, keeping the "declared now so reduced motion is never an afterthought" posture.
- **PATTERN**: `system/studio.css` throughout — tokens only, no literals except the grid geometry
  already declared there.
- **GOTCHA**: **do not add a second `--stx-*` mirror of anything the module exports.** Group 12 pins
  the existing mirror exhaustively; a new one needs a new pin or it drifts silently.
- **GOTCHA**: `.stx-scroll.is-panning .stx-slot { pointer-events: none }` (:111) already exists — it
  means a slot cannot start a drag during a pan, which is correct and needs no change.
- **VALIDATE**: `node tooling/token-lint.mjs` (studio.css is already registered — a literal colour is
  a failure)
- **SATISFIES**: AC #6 (reduced motion), AC #1 (a visible, focusable single-pointer affordance)

### CREATE (continue) `system/studio-verbs.mjs` — the mount

- **IMPLEMENT**: `export function mountCanvasVerbs(canvas, { bus } = {})` plus
  `export const getVerbs = () => live;`.

  Validate the arguments at the boundary and throw a plain `Error` naming what is missing
  (`bus-toggles.mjs:73-76`'s four-line guard block is the template): a canvas handle with
  `stage`/`scroll`/`say`, and a bus with `emit` and `on`.

  **State** (module-private to the mount): `history` (from `createHistory(snapshot())`), `gesture`
  (`null` or `{ id, node, origin, current, occupied, source, pointerId? }`).

  **`snapshot()`** — walk `stage.querySelectorAll(".stx-slot")`, return
  `{ [data-stx-id]: {col,row} }` (numbers). DOM-in, plain-data-out; the pure history stores it.

  **`applySlot(node, {col,row})`** — the ONE place `data-col`/`data-row` are written after
  placement. Attributes only.

  **`animateTo(node, before)`** — FLIP, used by **undo/redo only**:
  ```js
  // element.animate() never touches .style, so build-checks group 7's STYLE_WRITE regex and
  // studio-journey's running-page hasAttribute("style") assertion both stay literally true —
  // this is why FLIP is legal here, not a way around the check.
  const after = node.getBoundingClientRect();
  const s = ZOOM_LEVELS[canvas.level];          // the stage is transform: scale(...)
  const dx = (before.left - after.left) / s;    // rect deltas are POST-transform; a translate on
  const dy = (before.top  - after.top)  / s;    // the child applies in its UNSCALED local space
  if (!reduceMotion() && (dx || dy)) node.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
    { duration: 160, easing: "ease-out" });
  ```
  The scale divide is load-bearing — without it travel is wrong at every level ≠ 1. This is the same
  trap `studio-canvas.mjs:166-168` documents for `fit()`.

  **THE ONE CONSUMER** — the only place a move is committed:
  ```js
  bus.on("ui.move", (action) => {
    const node = stage.querySelector(`.stx-slot[data-stx-id="${...}"]`);   // from action.target.id
    if (!node) { canvas.say("That component is not on this canvas."); return; }  // refusal, not a throw
    const slot = clampSlot(action.params);        // hostile input never reaches an attribute
    const before = node.getBoundingClientRect();
    applySlot(node, slot);
    history.push(snapshot());
    canvas.say(`${nameOf(node)} moved to column ${slot.col}, row ${slot.row}.`);
    syncControls();
  });
  ```
  Also `bus.on("ui.undo")` / `bus.on("ui.redo")` — pop/advance the history, re-apply every entry in
  the restored snapshot (measuring each node's rect **first**, then applying, then `animateTo`), and
  announce the restored arrangement. Nothing else in the module writes a slot.

  **The pointer path** (on the `.stx-grab` button, and on the wrapper body **except** interactive
  descendants — see the gotcha):
  - `pointerdown`: bail on `e.button !== 0` or `e.pointerType === "touch"`; `stopPropagation()` so
    the ancestor pan handler at `studio-canvas.mjs:225` does not also fire; `setPointerCapture`;
    build `gesture` with `origin = current slot` and `occupied = ` the peers' occupancy set;
    add `.is-picked`; `aria-pressed="true"`; announce the pick-up.
  - `pointermove`: **`if ((e.buttons & 1) === 0) { endDrag(e); return; }` first, before any delta.**
    rAF-throttle (`scrub.mjs:65`); `hitSlot` the pointer against the geometry read once at gesture
    start; if the candidate differs from `gesture.current` and is not occupied, `applySlot` the
    preview **instantly, no animation** and update `gesture.current`. **No announcement per crossing**
    and no bus emit — a crossing is preview, not a verb.
  - `pointerup`: end the gesture and **emit exactly one `ui.move`** with `source: "pointer"` and
    `params: gesture.current` — *unless* `current` equals `origin`, in which case emit nothing
    (a click that moved nothing is not a move) and just release.
  - `pointercancel` / `lostpointercapture`: treat as Escape — restore `origin`, emit nothing.
    **Guard on the gesture still being live.** `lostpointercapture` also fires on a normal
    `pointerup` release on some engines, so an unguarded cancel path runs after **every** clean drop
    and undoes it. Handle `pointerup` first and clear `gesture` there, so the cancel handler finds
    nothing to cancel.
  - A **click** on `.stx-grab` with no drag (`e.detail === 0` is keyboard; a real click with no
    movement) toggles the keyboard-style picked-up mode — this is 2.5.7's single-pointer alternative.

  **The keyboard path** (on the `.stx-grab` button):
  - `Enter` / `Space` with no gesture: pick up (identical state setup to `pointerdown`,
    `source: "keyboard"`), announce "picked up, column X, row Y. Arrow keys to move, Enter to drop,
    Escape to cancel."
  - `ArrowUp/Down/Left/Right` **while picked up**: `preventDefault()` (or the scroller also scrolls),
    `stepSlot(current, DIRS[e.key], occupied)`, `applySlot` the preview instantly, **announce the
    candidate slot** — one announcement per keypress, deliberately, because a keyboard user with no
    per-step feedback is flying blind. This is the one place the two paths differ, and the driver
    counts them separately for that reason (see the AC #2 note). Not picked up → do nothing, let the
    page have the key.
  - `Enter` / `Space` while picked up: drop — **emit one `ui.move`, `source: "keyboard"`**, same
    no-op rule as the pointer drop.
  - `Escape` while picked up: `applySlot(origin)`, drop the gesture, emit nothing, announce
    "cancelled, back in column X, row Y."
  - Focus stays on the grab button throughout — the wrapper moves, so focus is never destroyed and
    there is no `applyPendingFocus` equivalent to write.

  **The verb controls row** — append a second control row to the viewport holding `Undo` and `Redo`
  buttons (real `<button>`s with visible text, disabled-synced from `canUndo()`/`canRedo()`,
  `studio-canvas.mjs:141-145`'s `syncControls` idiom). Bind ⌘Z / Ctrl+Z and ⌘⇧Z / Ctrl+Y on the
  scroller. Both paths **emit `ui.undo` / `ui.redo`** rather than calling the handler directly.

  **Teardown**: one `AbortController`, `destroy()` removes the row, unsubscribes the three bus
  handlers (`on()` returns the unsubscribe), and clears `live`.

  **Readiness handle**: set `viewport.setAttribute("data-canvas-verbs", "ready")` in a `finally` on
  **every** path including the early return — `device-frame.mjs:195-199` / `studio-canvas.mjs:285-288`,
  so a gate fails on the missing thing instead of deadlocking to timeout.
- **PATTERN**: `system/bus-toggles.mjs` end to end (emit/consume split, the seam, the guards);
  `system/scrub.mjs:52-85` (capture + rAF + keys + AbortController).
- **IMPORTS**: `{ MAX_COLS, MAX_ROWS, ZOOM_LEVELS, clampSlot }` from `./studio-canvas.mjs`; nothing
  from `action-bus.mjs` (the page owns the bus and hands it in — `proto/fieldwork.html:200`'s call).
- **GOTCHA**: **body-drag must not fight a real control.** On `pointerdown`, if
  `e.target.closest("button, a, input, select, textarea, [tabindex]")` is inside the wrapper and is
  **not** the `.stx-grab` handle, return and let the component have the event. `primary-button` on the
  stage stays clickable; the handle always drags.
- **GOTCHA — the coordinate chain, and the part most likely to be silently wrong.** `hitSlot` takes a
  point in the stage's **unscaled local space**. Getting there from a pointer event is four steps,
  in this order:
  ```js
  const r = scroll.getBoundingClientRect();          // read LIVE in the move handler
  const s = ZOOM_LEVELS[canvas.level];
  const x = (e.clientX - r.left + scroll.scrollLeft) / s;
  const y = (e.clientY - r.top  + scroll.scrollTop ) / s;
  ```
  Miss the scroll offset and the hit-test is wrong the moment the reader has panned; miss the divide
  and it is wrong at every level ≠ 1 — and both look **fine** at 100% scrolled to 0,0, which is where
  it will be tested first. Same family as the FLIP divide and as `fit()`'s `offsetWidth`-not-rect note
  (`studio-canvas.mjs:166-168`).
- **GOTCHA**: read the **track sizes** (`getComputedStyle(stage).gridTemplateColumns` etc.) **once per
  gesture, at gesture start** — a `getComputedStyle` in the move handler is the synchronous layout
  read spike 2 deliberately measured as its pessimistic case. But read the scroller's **rect and
  `scrollLeft`/`scrollTop` live** in the move handler: they are cheap, and a keyboard scroll or
  momentum scroll can move them mid-gesture.
- **GOTCHA**: the occupancy set is built at gesture start and **excludes the dragged node itself**,
  or it can never move.
- **GOTCHA**: `Space` on a `<button>` fires `click` on keyup — handle the verbs on `keydown` and
  `preventDefault()` `Space` so it does not also scroll and does not double-fire through `click`.
- **VALIDATE**: `node --check system/studio-verbs.mjs && node tooling/build-checks.mjs`
- **SATISFIES**: AC #1, #2, #4, #5

### UPDATE `studio.html` — mount the verbs on the harness

- **IMPLEMENT**: `import { createBus } from "/system/action-bus.mjs";` and
  `import { mountCanvasVerbs } from "/system/studio-verbs.mjs";`. After the placement loop, create
  **one** bus and mount. Update the "What is live" strip to state, plainly and honestly, what a
  reader can now do: drag a component by its handle or its body, or pick it up from the keyboard with
  Enter and move it by arrows; Escape cancels; every move announces and is undoable. Update the tail
  paragraph — "Moving things by pointer is ticket #205" is now false; marquee/guides/multi-move
  remain #217.
- **PATTERN**: `proto/fieldwork.html:200` — the page makes exactly one bus and both consumers ride it.
- **GOTCHA**: the harness's `try/catch` already renders `Refused: <message>` into `#capability`; the
  mount's boundary throws land there for free. Keep it.
- **VALIDATE**: `npx serve .` → open `/studio.html`, drag a tile, Tab to a handle and arrow it, undo,
  redo, Escape mid-drag.
- **SATISFIES**: AC #1–#6 (the surface all of them are asserted against)

### UPDATE `tooling/build-checks.mjs` — group 7's module list

- **IMPLEMENT**: add `"studio-verbs.mjs"` to the `MODULES` array at :733. Extend the comment above it
  by one sentence in the same voice: the verbs module joins with **no exception argued** — its
  movement is attributes and `element.animate()`, neither of which touches `.style`. Update the
  `group("vetting", …)` summary line at :830 to count the module.
- **PATTERN**: the paragraph at :729-733 that added `studio-canvas.mjs`.
- **GOTCHA**: `writes === 1` (:777) must still hold. If it does not, the module is writing an inline
  style and the fix is the module, never the check.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: the epic's standing invariant (one application point)

### UPDATE `tooling/build-checks.mjs` — new group 13, the canvas verbs

- **IMPLEMENT**: a `--- 13 · the canvas verbs ---` block after group 12, importing the pure exports.
  Written in group 12's voice: every check runs the function, none greps for a constant.
  - **`createHistory`, the AC #3 proof in CI.** Build a synthetic arrangement, push three snapshots,
    undo twice, redo twice, and **deep-compare** the result to the original with a real deep-equal
    (`JSON.stringify` of sorted keys is acceptable and honest at this shape — say so in the comment).
    Assert `undo` at the bottom is a no-op rather than a throw, `redo` at the top likewise, that a
    `push` after an `undo` **truncates the redo tail**, that the stack caps at `HISTORY_MAX` and the
    index survives the front-drop, and that **mutating a returned snapshot does not mutate history**
    (the `structuredClone` claim — a check that reads the value back after mutating it, not one that
    greps for `structuredClone`).
  - **`stepSlot`** over a table: a plain step; a step blocked by one occupied cell skipping to the
    next free one; a step blocked by a **run** of occupied cells; a step into the grid edge returning
    `from` unchanged; a step where the whole row beyond is occupied returning `from` unchanged (the
    termination proof); every returned slot asserted in-range and not in `occupied`.
  - **`hitSlot`** over a synthetic geometry: a point inside track 1; a point inside the gap between
    tracks 2 and 3 (assert *which* it resolves to — the rule must be stated, not discovered);
    a point past the last track clamping to `MAX_COLS`; a negative point clamping to 1; a
    non-finite point answering the origin rather than `NaN` (`clampSlot`'s posture).
  - **The caps come from one place**: assert `studio-verbs.mjs`'s source contains **no** numeric
    literal re-typing `MAX_COLS`/`MAX_ROWS` — or, better and behavioural, that `stepSlot` past the
    edge lands exactly on the module's exported `MAX_COLS`, so raising the export moves this check
    with it.
  - **A stated boundary, in group 12's stated-vacuous-tripwire posture**: the single-consumer
    invariant — the thing AC #1 actually turns on — is a **running-page fact** and is not reachable
    from CI. Say so in the group's opening comment and name its owner:
    `tooling/studio-journey.mjs`'s three-source deep-equal proof. An unstated absence reads as CI
    covering AC #1 when it does not. Same split groups 9 and 11 already live with.
  - `group("verbs", "…")` summary line, and update the final `all 12 groups` literal to **13**.
- **PATTERN**: group 12 (:1504-1620) — exhaustive, both directions, every regex asserted to have
  matched something before its content is judged, and a stated reason for anything deliberately vacuous.
- **GOTCHA (the repo's most-paid-for lesson)**: **each new check must be able to fail.** Mutate the
  source — invert `stepSlot`'s occupancy skip, delete the redo-tail truncation, remove the
  `structuredClone` — watch each go red, then revert. **Name the mutations in the report.**
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 13 groups pass`
- **SATISFIES**: AC #3, and the pure half of AC #1

### UPDATE `tooling/studio-journey.mjs` — the manipulation section

- **IMPLEMENT**: extend, never replace (#213 grows this file). Wait on the new
  `[data-canvas-verbs="ready"]` handle alongside the existing one. Add a section per AC:
  - **AC #1, per verb, not sampled — the three-source proof.** For a chosen node: (a) pointer-drag it
    from its origin to a target slot; snapshot the arrangement; (b) reset via undo; (c) put it there
    again with **keyboard only** (Tab/focus the handle, Enter, N arrow presses, Enter); snapshot; (d)
    reset; (e) inject a synthetic `ui.move` through the exported `getVerbs()` seam with
    `source: "agent"`; snapshot. **Assert all three snapshots are deep-equal** — resulting DOM state,
    never "an action was emitted", which would pass with no consumer at all
    (`proto-journey.mjs`'s discipline, and its stated reason).
    **Run the injected source on a FRESH page, with no gesture performed first.** This is what
    upgrades the check from "the three agree" to "the consumer is the single application point" —
    the invariant CI structurally cannot reach, which is why group 13 names this assertion as its
    owner. If the mover applied moves directly and merely emitted for observers, (a) and (c) would
    still pass and only this one would fail. It is also, precisely, #209's mechanism, so a green
    here is the take-over handoff proven a wave early.
  - **AC #2, counted per PATH because the two paths differ deliberately** (see the AC #2 note below —
    do not "fix" a red here by deleting the per-step announcement). Instrument with a
    `MutationObserver` on the live region, installed and its count cleared immediately before each
    gesture.
    - **Pointer**: exactly **one** mutation for the whole gesture, however many slots it crosses —
      a crossing is preview and must announce nothing. A per-crossing announcement fails here, which
      is the point of the check.
    - **Keyboard**: exactly **one per discrete keypress** — `N` arrow presses plus the drop give
      `N + 2` mutations (pick-up, N candidates, drop). Assert the exact number for a known `N`, so
      both a missing per-step announcement and a duplicated one fail.
    - **Both**: the **final** mutation is the drop's, and it names the landed slot
      (`/moved to column 4, row 2/`) — that is the sentence AC #2's "naming the slot it landed in"
      is about.
  - **AC #3**: undo then redo, deep-compare the arrangement snapshot to the pre-undo one. Read it
    through the seam, not by eyeballing the DOM.
  - **AC #4**: subscribe to the bus through the seam, record every action, assert the pointer gesture
    produced exactly one `ui.move` with `source: "pointer"` and the keyboard gesture exactly one with
    `source: "keyboard"` — and that no `ui.move` fired for a click that moved nothing.
  - **AC #5**: Escape mid-drag (pointer: `pointerdown`, move two slots, press Escape, `pointerup`)
    and mid-keyboard-gesture; assert the node is back in its origin slot **and** that no `ui.move`
    fired and the history depth did not change.
  - **Occupancy**: drag toward an occupied cell and assert the node lands in the last free slot,
    never on top of a peer; assert no two `.stx-slot`s share a `data-col`/`data-row` pair afterwards.
  - **The hit-test against real layout, in all three conditions** — the only check that can catch the
    grid geometry drifting from what `hitSlot` assumes, *and* the only one that can catch a dropped
    term in the coordinate chain (group 13 cannot, for the same reason group 12 cannot mirror
    `--stx-slot-w`). The assertion shape is the same each time: drop at a **measured** point and
    assert the landed slot is the one whose **measured box contains that point**. Run it **three
    times**, because each condition is the sole detector of a different missing term, and each looks
    correct in the other two:
    | condition | catches |
    |---|---|
    | at rest — zoom 1, scrolled 0,0 | the track-walk itself |
    | **scrolled** (pan right/down first, zoom 1) | a missing `+ scroll.scrollLeft/Top` |
    | **zoom ≠ 1** (Zoom in ×1, scrolled 0,0) | a missing `÷ ZOOM_LEVELS[level]` |
    A single at-rest run passes with **both** terms missing — that is the check-that-cannot-fail
    shape, arriving in the choice of fixture rather than in the assertion.
  - **The FLIP travel, at zoom ≠ 1.** **Do not read the animation's keyframes.** They are the literal
    you authored (`translate(${dx}px, ${dy}px)`), so comparing them to a re-derivation of `dx` from
    the same rects compares your computed value against itself — both sides lose the divide together
    and the check passes with the bug in. That is this register's own preamble arriving inside a
    detector.
    Read what the animation **does**, not what you wrote into it: at a zoom level ≠ 1, start the undo,
    set `animation.currentTime` to a fixed fraction of its duration, and read the node's
    `getBoundingClientRect()` — assert the box sits **between** the origin and destination boxes. A
    missing divide puts it visibly outside that span at half or double scale. `getComputedStyle(node).transform`
    read mid-animation is the equivalent instrument (the **used** matrix, not the authored string) and
    either is acceptable.
    **If neither proves stable across all three engines, say so and downgrade R3 to manual-only** —
    the Level 4 by-hand step already covers it. A manual detector honestly labelled beats an
    automated one that cannot fail.
  - **A clean drop must stick** — the `lostpointercapture` guard's detector. After a normal
    `pointerup`, assert the node is in the **target** slot and not back at its origin. An unguarded
    cancel path runs after every clean release on some engines, and its whole symptom is "drag does
    nothing", which no other assertion here distinguishes from a drag that never started.
  - **Still no inline styles** — the existing `inlineStyled` field already covers the new wrapper and
    handle; assert it stays 0 **after** a drag, an undo and a redo (a FLIP that leaked a style would
    show here).
  - **AC #6, reduced motion**: in the `reducedMotion: "reduce"` context, run the pointer drag, the
    keyboard move and an undo; assert each **completes** (the arrangement changed) and that
    `node.getAnimations().length === 0` immediately after the undo — no animated travel.
  - **No page errors and no console errors** across the whole journey — the existing assertion at
    :289 already covers this and is why refusals must go to the live region, not to a throw.
- **PATTERN**: the file's own `t()` / `snapshot()` / `viaSeam()` shape, and its stated rule that an
  assertion must be able to be wrong (:274-277).
- **GOTCHA**: **wait for scroll stability before any pointer geometry** — hover/pointer probes racing
  a smooth scroll produced a false bug once already (#196). `Reset` first, then read
  `boundingBox()`.
- **GOTCHA**: firefox's captured-pointer-leaves-window behaviour is the bug this driver exists to
  catch (`device-frame.mjs:137-152`). Keep every pointer path inside the box, and run **all three
  engines** before calling it done.
- **VALIDATE**:
  `node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs all`
- **SATISFIES**: AC #1, #2, #3, #4, #5, #6

### UPDATE `tooling/vt-verify.mjs` — the studio block gains the move verbs

- **IMPLEMENT**: in the `#204 · the studio canvas names NOTHING` block, add a pointer drag and a
  keyboard move (and an undo) to the movement set, keeping the **precondition idiom**: prove the
  surface changed (`data-col` differs, the measured box differs) *before* asserting `calls === 0` and
  zero `::view-transition-*` pseudos. Add the same to the reduced-motion sub-block. Update the block
  header comment and the final `vt-verify ✓` summary line.
- **PATTERN**: :294-329 — the existing canvas case, verbatim in shape.
- **GOTCHA**: the FLIP animation **is** in `document.getAnimations()` but its `pseudoElement` is
  `null`, so the filter at :320-322 correctly ignores it. Do not "fix" that filter. Do add a one-line
  comment saying so, or the next reader will.
- **VALIDATE**: `node tooling/vt-verify.mjs all`
- **SATISFIES**: AC #7

### UPDATE the generated cascade — loc-summary + approach's two baselines

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (a new tracked source file lands, and
  `approach.html` renders the numbers), then regenerate approach's two baselines.
- **GOTCHA**: `gen-loc-summary` reads **git-tracked** content, so run it **after** `git add` or it
  reports a false "no drift". CI `verify` drift-checks it and that job gates `main`.
- **GOTCHA**: the baseline regen screenshots the **dirty working tree** and Docker cannot share
  `/private/tmp` — run it from a **clean detached worktree under `/Users`**. If a baseline's only
  delta is sub-perceptual the update run will skip it; `rm` the PNG to force the rewrite.
- **VALIDATE**:
  `node agent-layer/gen-loc-summary.mjs --check` (after staging) and
  `cd tooling/visual-regression && npm run update:docker`
- **SATISFIES**: the epic's standing cascade

### DELIBERATE NO-OP — `system/param-manifest.json`

- **IMPLEMENT**: **nothing.** Record the reason in the PR body and the report rather than leaving it
  to be spotted as an omission: the manifest's own `$description` scopes it to "the 10 VR-gated
  shipped pages + chrome", and `studio.html` is off-nav, `noindex` and outside the VR set. #204 set
  the precedent by adding four zoom controls with zero entries. The controls this ticket adds join
  the manifest in **#206**, when they land on `/factory`.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` (must report no drift, unchanged)

---

## TESTING STRATEGY

No test framework — repo rule, do not hunt for or invent one. Three layers, matching the repo's own:

### Unit-equivalent — `build-checks` group 13 (CI, pure, no browser)

The history stack, `stepSlot`, `hitSlot` and the cap coupling. Everything **runs the function**;
nothing greps for a constant. This is where AC #3 becomes a CI gate rather than a driver assertion.

### Integration-equivalent — `tooling/studio-journey.mjs` (operator-run, three engines)

Everything that needs a running page and a real pointer: the three-source parity proof, the
announcement count, the escape restore, the occupancy rule, the hit-test against measured layout at
two zoom levels, reduced motion.

### `tooling/vt-verify.mjs` (operator-run, three engines)

AC #7 alone, with the precondition.

### Edge Cases

- A drag that ends where it started → no `ui.move`, no announcement, no history entry.
- A drag toward a fully occupied direction → the node does not move, and says so.
- `Escape` pressed **after** `pointerup` → nothing to cancel; must not throw.
- A `ui.move` for an id that is not on the stage → refusal in the live region, **no console error**.
- A `ui.move` with a hostile slot (`{col: 1e9, row: NaN}`) → `clampSlot`'d, never written raw.
- Undo at the bottom / redo at the top → no-ops, buttons disabled, no throw.
- `push` after `undo` → the redo tail is discarded.
- A gesture at zoom ≠ 1 → hit-test and FLIP travel both correct (R2, R3 — separate detectors).
- A gesture **after panning** → hit-test correct (R1; blind to R2's bug and vice versa).
- A clean `pointerup` → the drop sticks, no cancel path runs (R4).
- Firefox: pointer leaves the window mid-drag → the gesture ends, no snap to slot 1.
- `pointerType === "touch"` → no gesture starts at all.
- A click on a `primary-button` **on the stage** → the component's own click fires, no drag starts.

---

## VALIDATION COMMANDS

Execute every command. "Done" = run the surface you touched.

### Level 1: Syntax & module safety

```bash
node --check system/studio-verbs.mjs
node --check system/studio-canvas.mjs
node -e "import('./system/studio-verbs.mjs').then(m => console.log(Object.keys(m).join(' ')))"
node tooling/token-lint.mjs
```

### Level 2: CI gates

```bash
node tooling/build-checks.mjs          # expect: build ✓  all 13 groups pass
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-system-graph.mjs --check   # studio.css is not components.css — must be unchanged
```

### Level 3: Cross-engine drivers

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
```

### Level 4: Manual validation

```bash
npx serve .        # then open http://localhost:3000/studio.html
```

- Drag a `metric-tile` by its body two columns right → it snaps per slot, announces once on drop.
- Drag it onto an occupied cell → it stops at the last free slot.
- `Tab` to a `.stx-grab`, `Enter`, `ArrowRight` ×3, `Enter` → same result, announced each step and on
  drop.
- `Escape` mid-gesture (both paths) → back where it started.
- `⌘Z` / `⌘⇧Z`, and the Undo/Redo buttons → arrangement returns, with a short travel animation.
- Click the `primary-button` on the stage → it activates; no drag starts.

**Then the three conditions that hide R1–R3 — do these by hand as well as in the driver, because
each is invisible in the default one:**

- **Pan right and down, then drag** → the tile lands under the cursor, not offset by the scroll
  distance (R1).
- **Zoom in ×1, then drag** → the tile lands under the cursor, not at half/double the intended
  distance (R2).
- **Zoom in ×1, move a tile, then undo** → the travel animation lands where the tile lands rather
  than overshooting or undershooting it (R3).

**Accessibility pass** — macOS VoiceOver, or Chrome's accessibility pane:

- The handle's accessible name is "Move &lt;component name&gt;" and its `aria-describedby` instructions
  are read on focus, **before** pick-up.
- There is **no** `aria-pressed` on it (R: it would announce the button's state, not the grab).
- The live region speaks the pick-up, one line per arrow press, and the drop naming the landed slot.

### Level 5: Baselines

```bash
# from a CLEAN DETACHED WORKTREE under /Users — never /private/tmp
cd tooling/visual-regression && npm run update:docker
```

Only `approach`'s two baselines should move (the loc-summary numbers). **If any other page's baseline
moves, stop** — something shipped changed, and nothing in this ticket should touch a shipped page.

---

## ACCEPTANCE CRITERIA

Traced from the ticket verbatim:

- [ ] **AC #1** — Every canvas verb has a keyboard path producing the identical model change as the
      pointer path, asserted **per verb, not sampled**: pointer, keyboard and an injected
      `source:"agent"` action all produce deep-equal arrangement snapshots.
- [ ] **AC #2** — Each verb announces **once** in a live region, and the announcement naming the slot
      it landed in is the **drop's**. Counted per path, because the paths differ deliberately: a
      pointer gesture produces exactly one mutation however many slots it crosses (crossings are
      preview); a keyboard gesture produces exactly one per discrete keypress — pick-up, one per
      arrow, drop — because a keyboard user with no per-step feedback is flying blind. Both are
      asserted as exact counts, so a missing *or* a duplicated announcement fails.
- [ ] **AC #3** — Undo then redo returns the build state byte-identical, proven by deep-comparing the
      snapshot in CI (group 13) **and** through the driver's seam, never by eyeballing the DOM.
- [ ] **AC #4** — Drag emits `ui.*` on the action bus with an honest `source`
      (`"pointer"` / `"keyboard"`); the bus is the only drive contract, with one consumer.
- [ ] **AC #5** — Escape mid-gesture restores the pre-drag slot, pointer and keyboard alike, and
      emits nothing.
- [ ] **AC #6** — Reduced motion: no animated travel, every verb still completes.
- [ ] **AC #7** — `document.getAnimations()` shows zero `::view-transition-*` pseudos for any move.

Plus the standing gates:

- [ ] `build-checks` reports 13 groups green; group 7 still reports `writes === 1` with **no exception
      argued** for the new module.
- [ ] `studio-journey` and `vt-verify` pass on chromium, firefox **and** webkit.
- [ ] **Every risk-register detector (R1–R12) exists and was mutated and watched go red**, with the
      mutations named in the report. A detector that stays green under its own mutation is not one.
- [ ] `gen-loc-summary` regenerated + approach's two baselines; no other baseline moved.
- [ ] `param-manifest.json` unchanged, with the reason stated (not silently skipped).
- [ ] Plan, report and review all committed in the same PR; PR body carries `Closes #205`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation ran and passed immediately
- [ ] All Level 1–5 validation commands executed
- [ ] Both drivers green on all three engines
- [ ] Risk register R1–R12: every detector implemented, mutated, red, reverted — named in the report
- [ ] Manual validation on `/studio.html`, including a screen-reader pass
- [ ] Acceptance criteria all met
- [ ] `.claude/plans/`, `.claude/reports/` and `.claude/code-reviews/pr-<N>-review.md` in the PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each would change the work if wrong):

1. **The snapshot is the arrangement, not "board + arrangement".** The architecture's phrasing
   assumes the board is already on the canvas; at #205 it is not (it arrives with #206/#207). The
   stack is built so #206 extends the snapshot's *contents* without touching the stack. Flagged here
   rather than diverging silently.
2. **An occupied cell is not enterable** (no swap, no stacking). Decided rather than asked: stacking
   makes "moved to column 2, row 1" a lie because two nodes share the cell, and swapping means one
   gesture moves two nodes — a second announcement to word and a second thing to undo. Skipping is
   one rule both paths share.
3. **Body-drag is allowed except on interactive descendants**, and `.stx-grab` always drags. The
   alternative (handle-only) is safer but makes the canvas feel less like a tool; the alternative
   (body-drag everywhere with a movement threshold and click suppression) fights `primary-button`.
   If the owner wants body-drag everywhere, that is a small, contained change to one `pointerdown`
   guard.
4. **`place()` wrapping keeps both existing drivers green unchanged**, via the idempotent branch.
   **Verify this early** — run both drivers right after the `place()` edit. If it does not hold, both
   drivers get updated in the same PR (they are ours, and #213 grows the journey anyway).
5. **`studio.html` needs no `param-manifest` entry** — the manifest scopes itself to the VR-gated
   pages + chrome, and #204 set the precedent.
6. **Spike 2's verdict is consumed, not re-run.** The DOM stage HOLDS; the failure branch's
   mitigations are deliberately absent.

**Nothing here blocks the start.** Assumption 3 is the only one with a plausible different answer,
and changing it later is one guard clause.

## RISK REGISTER

Each risk, its resolution in the code, and **the one check that would catch it if the resolution were
dropped**. The third column is the load-bearing one: this repo's most-paid-for lesson is that every
defect it has shipped survived a green gate the same way — the check skipped the thing it tested. A
risk with no detector is not addressed, only noted.

| # | Risk | Resolution | Detector (must be able to fail) |
|---|---|---|---|
| R1 | **Hit-test misses the scroll offset** — wrong the moment the reader pans | the 4-step chain: `clientX − rect.left + scrollLeft`, then `÷ scale` | `studio-journey` hit-test run **after panning**. An at-rest-only run passes with the term missing. |
| R2 | **Hit-test misses the scale divide** — wrong at every zoom ≠ 1 | same chain | `studio-journey` hit-test run **at zoom ≠ 1**. Independent of R1's detector — each condition is blind to the other's bug. |
| R3 | **FLIP travel not divided by scale** — undo travels wrong at zoom ≠ 1, looks perfect at 100% | `dx = (before.left − after.left) / ZOOM_LEVELS[level]` | `studio-journey` samples the node's **measured box mid-animation** (seek `animation.currentTime`, read the rect) at zoom ≠ 1 and asserts it lies between origin and destination. **Never read the keyframes** — they are the authored literal, so both sides lose the divide together. Downgrade to **manual-only** (Level 4) if mid-animation sampling is not stable on all three engines, and label it as such. |
| R4 | **`lostpointercapture` cancels every clean drop** on some engines | handle `pointerup` first and clear `gesture`; the cancel path guards on a live gesture | `studio-journey`: after a normal `pointerup` the node is in the **target** slot, not the origin. Symptom is "drag does nothing", which nothing else here distinguishes from a drag that never started. |
| R5 | **AC #2 read naively kills keyboard feedback** — implementer deletes per-step announcements to make a once-per-gesture count go green | exact counts **per path**: pointer 1, keyboard `N + 2` | `studio-journey`'s two separate counts. Both a missing *and* a duplicated announcement fail. The NOTES section names this exact wrong-fix so it is not made. |
| R6 | **Single-consumer invariant is unreachable from CI** — a reader assumes group 13 covers AC #1 | the injected `source:"agent"` move on a **fresh page, no gesture first** | `studio-journey`'s three-source proof; group 13's opening comment **states the boundary and names this owner** (groups 9 and 11's posture). |
| R7 | **`place()` wrapper breaks the two existing drivers** | the idempotent branch (`node` already a `.stx-slot` ⇒ it *is* the wrapper) | Both drivers run **as the first validation of that task**, before any mount code exists. Asserted by reasoning; confirmed by running. |
| R8 | **`stepSlot` infinite-loops** on a fully occupied direction | single-axis walk bounded by `MAX_COLS` / `MAX_ROWS` iterations | group 13's "whole row beyond is occupied returns `from` unchanged" case — the termination proof, run rather than reasoned about. |
| R9 | **Hostile input reaches an attribute** via a synthetic `ui.move` | `clampSlot(action.params)` in the consumer | group 13's `clampSlot` table (already exists, #204) + the driver's `{col: 1e9, row: NaN}` edge case. |
| R10 | **A refusal throws** — `action-bus.mjs:70-77` swallows it into `console.error`, hiding it from the reader | refusals go to the live region | `studio-journey`'s existing **no-console-errors** assertion (:289) goes red on a throw. |
| R11 | **FLIP leaks an inline style**, breaking the zero-writes invariant | `element.animate()` never touches `.style` | `studio-journey`'s running-page `inlineStyled === 0`, asserted **after** a drag, an undo and a redo. That is the whole detector. **Group 7 is not one here** — its `STYLE_WRITE` regex does not match `element.animate()`, which is exactly why the call is legal; group 7 guards the *replacement* shape (someone later swapping the FLIP for `node.style.transform = …`), which is a different risk. |
| R12 | **A shipped page's baseline moves** — nothing in this ticket should touch one | the module mounts only on the off-nav harness | the `update:docker` run: **only approach's two baselines may move.** Any other page moving is a stop-and-investigate, stated as such in Level 5. |

**Mutation duty.** Before the report is written, each detector above is confirmed by breaking its
resolution and watching it go red — drop the scroll term, drop the divide, remove the
`lostpointercapture` guard, delete the redo-tail truncation, remove `structuredClone`, invert the
occupancy skip. **Name every mutation in the report.** A detector that stays green under its own
mutation is not a detector.

## NOTES (open canvas)

### Why the bus is the drive path and not instrumentation

The naive reading of AC #4 is "also emit an event". Implemented that way, the mover applies the move
*and* emits, and AC #1 ("identical model change") becomes two code paths that happen to agree today.
`bus-toggles.mjs:157-159` names this exactly:

> The controls EMIT and do nothing else. Everything visible happens in the consumer below, which is
> what makes the three sources genuinely interchangeable rather than three code paths that happen to
> agree.

The payoff is not theoretical. **#209's replay driver plays committed ops over the `agent.*` half of
this bus.** If the mover's commit path is the bus consumer, #209 gets take-over for free: the replay
emits, the visitor emits, one consumer applies both, and the "grab the wheel mid-replay" handoff has
no seam to build. If the mover applies directly, #209 has to re-implement moving.

### Why the gesture is a preview and only the drop commits

The alternative — commit on every slot crossing — was considered and rejected. It gives a 5-slot drag
five undo entries and five announcements, and makes Escape a five-step rollback. Preview-then-commit
makes one gesture equal **one** `ui.move`, **one** announcement, **one** history entry, for both
input paths, and makes Escape a single `applySlot(origin)`. Every one of AC #2, #3 and #5 falls out
of that single choice.

The asymmetry that remains is honest and worth stating: one keyboard **arrow step** is a preview
step, not a verb — the *drop* is the verb. So a five-arrow keyboard move and a five-slot pointer drag
each produce exactly one history entry and exactly one `ui.move`. That is the parity AC #1 asks for.

### …but the two paths announce differently, on purpose

A pointer preview needs no announcement — the reader is watching their own hand move the thing. A
keyboard preview **does**: a five-arrow move with a single announcement at the end leaves the reader
blind for four presses, unable to tell whether a step was blocked by an occupied cell or by the grid
edge. So arrow steps announce the candidate slot, one per keypress.

This is the one place a naive reading of AC #2 ("each verb announces once") and a working keyboard
experience pull apart, and it is resolved in favour of the experience — with the driver counting the
two paths **separately and exactly**, so neither a missing announcement nor a duplicated one passes.
Flagged here because the failure mode is specific and predictable: an implementer who writes a single
once-per-gesture mutation count will see the keyboard path go red and "fix" it by deleting the
per-step announcement. That is the wrong fix. Fix the count.

### The three traps that will bite silently if missed

All three are in the risk register (R1–R3) with detectors. Repeated here because they share one
property that makes them worse than ordinary bugs: **each looks completely correct in the condition
it will first be tested in.**

1. **FLIP under a scaled stage.** `getBoundingClientRect` deltas are post-transform; a `translate()`
   on the child applies in the child's unscaled local space. Divide by `ZOOM_LEVELS[canvas.level]` or
   travel is wrong at every level ≠ 1 — and it will look *fine* at 100%, which is where it will be
   tested first. `studio-canvas.mjs:166-168` documents the identical trap for `fit()`.
2. **`element.animate()` is legal, and the reason must be written down.** It does not touch `.style`,
   so group 7's `STYLE_WRITE` regex does not count it *and* `studio-journey`'s running-page
   `hasAttribute("style")` assertion stays literally true. Both halves matter: the first alone reads
   as a regex dodge; the second is what makes it a real property of the shipped page.

### Read layout from the resolved grid, not from custom properties

`getComputedStyle(stage).gridTemplateColumns` returns **used** px values, and `columnGap`/`rowGap`
likewise. Reading `--stx-gap` instead would return the unresolved `var(--spacing-md, 16px)` on some
engines. `breadboard.mjs:628` already reads `gridTemplateColumns` for exactly this reason ("the CSS
stays the one place the layout is decided"), and it means group 13 can test `hitSlot` over synthetic
geometry while `studio-journey` tests the real geometry — the same split group 12 and the journey
already carry for `fitLevel` vs `--stx-slot-w`.

### What #217 inherits from this file

Marquee, guides, context menu and multi-move all want: the occupancy set, `stepSlot`, the history
stack (a multi-move is **one** snapshot), the single consumer, and the announcement vocabulary. None
of that should be re-derived. Write `studio-verbs.mjs` so a multi-node gesture is a plausible future
shape — a gesture holding a **list** of nodes rather than one — without building it now.

### Confidence

**9.5/10.** The substrate is read end to end, both drivers and both relevant `build-checks` groups
are read, the one fact that forces the wrapper (`primary-button` renders a bare `<button>`) is
verified in source rather than assumed, and the FLIP/`getAnimations` interaction is verified against
`vt-verify.mjs:320-322`'s actual filter. Every known risk now carries a **named detector with a
stated mutation** (R1–R12) rather than a warning, and the three silent-at-100%-zoom traps have
three *independent* detectors, because each is blind to the others' bug.

The half-point is R7 — the `place()` wrapper refactor's blast radius on the two existing drivers.
The idempotent branch should hold it to zero, but that is asserted by reasoning and can only be
confirmed by running them, which is why it is the **first validation of that task** rather than a
footnote. If it does not hold, the cost is bounded and known: both drivers are ours, the edits are
selector-level, and #213 grows the journey anyway.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
