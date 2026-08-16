# Feature: Studio 19 — full-tool extras: layers list + minimap (#221)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before implementing. Pay special attention to naming of existing exports and to importing
from the right files.

> **⚠️ Pre-agreed scope cut — closing #221 unbuilt is a valid outcome.** PRD §Appetite names the
> layers list and the minimap as the first cuts. If the batch is spent, close the ticket
> `not planned` with a one-line note on #202 instead of executing this plan. The owner's recorded
> verdict (memory: factory-mid-epic-owner-verdict) is "finish #214–#223 then re-judge", which is why
> this plan exists at all. **The plan is also internally cuttable:** Phase A (layers list) is
> shippable alone; the minimap (Phase B) is the inner cut, recorded honestly if taken.

## Feature Description

Two affordances that make the /factory studio canvas read as a professional prototyping tool rather
than a demo:

- **Layers list** — every placed thing on the canvas (the board's fat-marker/compiled wrappers AND
  the two device frames), in DOM order (= board order), as a keyboard-navigable list docked in the
  inspector rail. Selecting in the list selects on the canvas and vice versa. It is a *second,
  linear route to everything the canvas holds* — an accessibility win, not only a tool-feel one.
- **Minimap** — the whole 12×8 stage at a glance, with a live viewport rectangle tracking pan and
  zoom, click and keyboard both moving the viewport.

Both are **structural layout** (blocks in the existing `.stu-inspector` rail) — `overflow-x: clip`
makes `position: sticky` a site-wide no-op, so neither may be built on it (recorded architecture
call, and the `overflow-clip-breaks-sticky` memory).

## User Story

As a hiring manager or deep-dive UX engineer evaluating the studio,
I want a layers panel and a minimap like every professional canvas tool has,
So that I can survey, select and navigate the composition without hunting across a scrolling stage —
and so the surface itself reads as senior tool-building work.

## Problem Statement

The canvas (#204–#219) pans, zooms, selects, moves, resizes, compiles and replays — but a visitor
has no overview of *what* is on it or *where* they are in it. A stage of ~2,700×1,200 unscaled px in
a 640px-tall scroller means placed things routinely sit off-screen with no linear route to them
except tabbing through every grab handle. Epic #202's evidence names "reads as a professional tool"
as the differentiator; PRD §5 names layers list + minimap explicitly.

## Solution Statement

Two new hand-written-canon modules, `system/studio-layers.mjs` and `system/studio-minimap.mjs`,
mounted by the orchestrator (`system/studio.mjs`) into two new mount nodes in `factory.html`'s
inspector rail. Both are **reflections of the live DOM** driven by MutationObserver /
scroll / ResizeObserver events (never a timer), both write **zero inline styles** (they join
build-checks group 7's MODULES list), both announce through the canvas's ONE live region
(`canvas.say`), and neither adds a bus verb (selection stays `applySelection`'s — the one writer —
and viewport position is view state, per studio-select.mjs's recorded call 2). The minimap's
geometry is drawn as **SVG attributes** (`createElementNS`, element by element) — the "geometry is
attributes" discipline that keeps group 7's `writes === 1` literally true, the same forcing function
that made #219 resize in grid spans instead of px.

## Out of Scope / Non-Goals

- **No bus verbs.** No `ui.select`, no `ui.pan`, no `ui.jump` — selection is view state
  (studio-select.mjs header call 2), viewport position is view state (zoom/pan already have no
  verb). Each module header records this, citing studio-flow.mjs's reasoning (fourth and fifth
  applications).
- **No drag-to-reorder in the layers list.** Order IS board order (the standing correspondence,
  studio.mjs:543); reordering is a board edit that belongs to the board's own verbs. Rows are
  selectable and navigable, not draggable.
- **Frames stay outside the selection layer.** A frame's layers row navigates (brings into view);
  it never toggles selection — `chosenNodes()` is `.stx-slot`-scoped by #219's recorded decision and
  this ticket must not half-widen it (studio-frames.mjs header: half-widening is a bug factory).
- **No minimap drag-to-pan.** Click-to-jump + keyboard satisfies the AC; a captured-pointer drag on
  the map is a stretch that costs gate lines. If added later it is its own small ticket.
- **Not mounted on `studio.html`.** The raw harness drives the substrate; these are designed
  /factory inspector chrome mounted by the orchestrator (like #218's docs and #210's rail).
- **No vt-verify changes.** Neither module names anything for a view transition and neither opens
  one; #213's factory sample chain is untouched.
- **No new ⌘K commands, no new analytics routes.** Not pages, not win-metric surfaces.
- **Not changing:** `system/studio-canvas.mjs` (its existing handle — `scroll`, `stage`, `viewport`,
  `say`, `level` — already exposes everything both modules need), `system/studio-verbs.mjs`,
  `system/studio-select.mjs`, `system/action-bus.mjs`, `system/replay-driver.mjs`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (two new gated surfaces; the code itself is medium)
**Primary Systems Affected**: `/factory` studio shell, `system/studio.mjs`, `system/studio.css`,
`factory.html`, `tooling/build-checks.mjs`, `tooling/studio-journey.mjs`, `system/param-manifest.json`,
VR baselines (factory ×2, approach ×2), `system/loc-summary.json`, `system/param-count.json`
**Dependencies**: none new (vanilla hard constraint)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/221 · **Epic**: #202
(`docs/epics/prototype-studio.prd.md` + `.architecture.md` — §Other eng-lead calls records the
sticky/structural decision and the pre-agreed-cut status; inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/studio-canvas-stage-204.md` — the substrate's three calls (DOM stage, native-scroll
  pan, attributes-only geometry) all bind here
- `.claude/plans/studio-canvas-manipulation-205.md` — the one-mover/one-live-region/announcement
  disciplines the layers list rides on
- `.claude/plans/studio-canvas-affordances-217.md` — the selection layer whose header says
  "#221/#223 inherit rather than re-argue" its four calls; `applySelection` is the one writer
- `.claude/plans/studio-protos-as-frames-219.md` — the group-7-forces-the-design precedent (spans,
  not px) that forces SVG attributes here; frames-outside-selection

**Forward-references**: #223 (epic close) re-judges the whole studio including these two surfaces;
the hallway test may flip their placement or cut copy.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/studio-canvas.mjs` (whole file, 516 lines) — Why: the canvas handle both modules take
  (`viewport`/`scroll`/`stage`/`say`/`level` getter, lines 487–508); `place()`'s wrapper grammar
  (`data-stx-id`, `data-stx-name`, `data-col/row`, `data-span-*`, `FRAME_CLASS`, `MOVABLE` at :85);
  `ZOOM_LEVELS`/`clampSlot`/`clampSpan`/`footprint` exports; the `finally` readiness-handle idiom
  (:512–515); the `el()` helper to copy (:167–176).
- `system/studio-select.mjs` (whole file, 728 lines) — Why: header calls 1–4 are **inherited by
  #221 by its own words** (:11). `applySelection` (:298–317) is THE ONE PLACE the selection is
  written — the layers list calls it through the handle and never writes `data-stx-selected`
  itself. `chosenIds` (:271), the SPOKEN_MAX count sentence, the roving-tabindex `focusItem` idiom
  (:355–361), the handle shape (:704–720).
- `system/studio-verbs.mjs` (lines 1–100, 349–460, 503–560, 566–612) — Why: the `el()` copy
  convention, `readGeom()` (:1014–1023 — the measured-track idiom the minimap copies), the
  static-caption-via-`aria-describedby` idiom (`#stx-move-help`, :571–599), `element.animate()`'s
  group-7 argument (:503–513) — context for why the minimap uses SVG attributes instead.
- `system/studio.mjs` (whole file, 813 lines) — Why: the orchestrator that mounts both modules;
  mount ordering and the `live` handle (:690); `adoptBoard`'s `.stx-slot`-scoped removal loop
  (:641) that the layers list must survive via its observer; the "seams already exposed" mounting
  argument (:661–681); `settleHandles` (:798–810).
- `system/studio-docs.mjs` (header + mount, lines 1–120) — Why: the closest sibling: a #218 module
  mounted by the orchestrator, no bus verb (recorded), refusals as content, no announcement on
  focus (the static-caption rule), the build-checks-group + journey-pass split each stating what
  the other owns.
- `system/studio-frames.mjs` (header) — Why: frames-outside-selection reasoning the layers list
  must respect and state; `FRAMES` descriptors (labels the rows will show).
- `system/replay-driver.mjs` (lines 729–790) — Why: the take-over discriminator is `pointerdown` +
  `keydown` on `canvas.scroll` in the CAPTURE phase (:781–782). Layers/minimap interactions happen
  OUTSIDE that element, and the minimap's programmatic `scrollLeft` write fires no pointer/key
  event — so neither is a take-over, STRUCTURALLY (same class as the zoom row and ⌘A). The journey
  asserts this; do not add code to make it true.
- `system/studio.css` (lines 15–100, 537–650) — Why: the caps/zoom/span vars and the group-12
  hand-mirror warnings (add NO new mirrors — the minimap uses measured geometry); `.stu-shell`
  (:537–539, `minmax(0,1fr) 22rem`), `.stu-inspector` grid (:600–611) the two new blocks join;
  `.stu-panel-title` sizing convention (:640+).
- `factory.html` (lines 194–330) — Why: the shell markup; the inspector aside (:299) where the two
  mount nodes go; the comment conventions every mount hook carries.
- `tooling/build-checks.mjs` (lines 1011–1145) — Why: group 7's MODULES list (:1067–1080) both new
  files join, the STYLE_WRITE regex (:1099), the sink ban (:1116–1126), the C0-control-byte check
  (:1135); then any recent group (23/24, grep "group 23") for the new-group idiom — count pins,
  mutation cases, the "states its boundary" closing sentence.
- `tooling/studio-journey.mjs` — Why: the pass idiom. Key line numbers (verified 2026-08-15):
  4-arg pass signature like `framesPass` (:4826) / `docsPass` (:4432); registration at :1307–1312
  (append after `perfPass`); `t()` at :300–303; stale-serve guard :115–124 (**re-point it at
  `system/studio-layers.mjs`**); `EXPECTED_NOISE` :73; `mainOnly` :82; the /factory open idiom
  :3592–3607 (`[data-replay="settled"]`, 30s); `countLive`/`liveSeen` :259–283; `inject` :188;
  the fresh-page idiom :1209–1230; selection parity computed through the page's own pure imports
  :3686–3694 (imports at :103); the scroll-settle poll :890–899; `snapshot(p)` :134–158 (**has no
  `scrollHeight` — add the field, additively**); reduced-motion block model :4334–4376; the bounds
  log :5740 and success sentence :5744 (**both carry maintained row counts; CLAUDE.md:104's
  "sixteen rows" is already stale — true all three up**).
- `tooling/inp-observer.mjs` (55 lines) — Why: `OBSERVER_INIT`/`summarize`/`violations`; the 16 ms
  floor + calibration semantics. INP rows: `ROWS_FACTORY` :5319–5494 — **insert the two new rows
  after the #219 frame-resize pair (:5472) and before #214's method pair (:5477)** (the method row
  redrafts the board the layers list reads).
- `system/param-manifest.json` — Why: `$description` counting rules (a per-item verb present on
  every row = ONE entry; a keyboard-shortcut-only path gets no entry).
- `system/system-graph.mjs` (its SVG render + zoom row) — Why: the repo's existing precedent for an
  SVG surface with token-styled elements and an explicit keyboard path.

### New Files to Create

- `system/studio-layers.mjs` — the layers list (pure layer + mount), ~230 lines
- `system/studio-minimap.mjs` — the minimap (pure layer + mount), ~260 lines

### Relevant Documentation

- `docs/epics/prototype-studio.architecture.md` §Other eng-lead calls — the sticky decision, the
  cut status; §Key decisions "Stack & libraries" (attributes-only, no VT naming) — inherited.
- WAI-ARIA APG *Listbox* pattern (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — read for the
  roving-tabindex mechanics, but note the plan deliberately uses **plain buttons in a `<ul>` with
  `aria-pressed`**, NOT `role="listbox"` (rationale in NOTES).
- WCAG SC 2.5.7 vs 2.1.1 — the studio's recorded which-is-which discipline
  (studio-verbs.mjs:41–46): the minimap's click-to-jump is a single-pointer action (no drag
  anywhere, so 2.5.7 is not even engaged); arrows on the focused map are 2.1.1.

### Patterns to Follow

**Module skeleton (every studio module):** governing-doc header stating the load-bearing calls and
every "deliberately not" · pure layer first (plain data in/out, CI-drivable) · copied `el()` helper
("copied rather than imported") · `let live = null` + exported `getLayers()`/`getMinimap()` seam
(never `window.__`) · boundary validation throwing a plain Error naming what is missing ·
`AbortController` for every listener · `destroy()` that disconnects observers and removes nodes ·
readiness handle set in a `finally` on every path (`viewport?.setAttribute(...)` shape, here on the
module's own mount node: `[data-studio-layers="ready"]`, `[data-studio-minimap="ready"]`).

**Refusals are content, never throws** — through `canvas.say(...)`; action-bus is not involved but
the no-console-errors journey contract still is.

**Announcements** — through `canvas.say` (the ONE live region), one sentence per user verb;
selection sentences come free from `applySelection` (do NOT add a second sentence on top of it).

**Element construction** — element by element; SVG via `document.createElementNS("http://www.w3.org/2000/svg", tag)`
with `setAttribute` only. No innerHTML-family sink anywhere (group 7 bans them by substring).

**Every mount hook in factory.html carries a comment** citing the ticket and the readiness idiom
(`[data-studio-keep]`'s hook-and-state-in-one-attribute pattern).

---

## IMPLEMENTATION PLAN

Phases run top to bottom. **Phase A (layers) and Phase B (minimap) are independent of each other**
— B does not import A; if the appetite dies after A, ship A and record the minimap as the cut.
Phases C–E depend on whichever of A/B shipped.

### Phase 0: Branch hygiene

This worktree is SHARED (memory: shared-worktree-parallel-sessions) and currently holds another
session's staged edits (`system/catalog.mjs`, `system/studio-canvas.mjs`,
`tooling/studio-journey.mjs`, a #219 report) on branch `feature/catalog-ten-components-220`.
**Branch fresh from `origin/main`** (`git fetch origin && git switch -c feature/studio-layers-minimap-221 origin/main`
— or use a temp worktree), stage ONLY by explicit path, and re-verify the branch immediately before
every commit.

### Phase A: the layers list (`system/studio-layers.mjs`)

**Tasks:** pure layer (`layerEntries`, `toggleId`) → mount (list, roving tabindex, activation,
MutationObserver reflection) → factory.html hook + studio.css block → studio.mjs mount.

### Phase B: the minimap (`system/studio-minimap.mjs`)

**Independent of:** Phase A.

**Tasks:** pure layer (`mapView`, `jumpFrom`, `trackOffsets`, `cellRect`, `visibleRange`) → mount
(SVG, viewport rect, scroll/zoom/resize/mutation wiring, click + keyboard) → factory.html hook +
studio.css block → studio.mjs mount.

### Phase C: build-checks gates

**Depends on:** A and/or B. Group 7 list growth; new group 25 (layers pure) and group 26 (minimap
pure) — each stating the boundary the journey owns.

### Phase D: journey driver + INP

**Depends on:** A and/or B. `layersPass` + `minimapPass`, two `ROWS_FACTORY` INP rows, stale-serve
guard re-point, bounds-log/success-sentence/CLAUDE.md row-count true-ups.

### Phase E: manifests, docs, baselines

**Depends on:** A–D. param-manifest + gen-param-count; loc-summary; CLAUDE.md module entries;
factory ×2 + approach ×2 baselines via `update:docker`; plan/report/review artifacts;
PR with `Closes #221`.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE `system/studio-layers.mjs` (pure layer)

- **IMPLEMENT**: header (governing docs: epic #202 ticket #221, this plan; the calls: reflection
  never a mirror-with-state, selection through `applySelection` only, frames outside selection —
  stated with studio-frames.mjs cited, NO BUS VERB deliberately — studio-select.mjs call 2 cited,
  no timers). Then:
  - `export function layerEntries(nodes)` — input `[{ id, name, col, row, kind, selected, cols, rows }]`
    (plain data; the mount derives it from the DOM), output rows
    `[{ id, name, kind, selectable, sentence }]` in the order given. `sentence` is the row's
    position text: `"column C, row R"` for a 1×1, `"column C, row R, W by H"` for a spanning frame.
    Total over junk: null/garbage → `[]`; an entry with no id is skipped.
  - `export function toggleId(ids, id)` — membership toggle over a plain array, total over junk;
    returns a NEW array (never mutates).
- **PATTERN**: pure-layer shape of `studio-select.mjs:81–204`; totality posture of
  `menuItems`/`slotOf` (:114–128).
- **GOTCHA**: `kind` is `"frame"` when the node has `FRAME_CLASS` — import `FRAME_CLASS`/`MOVABLE`
  from `./studio-canvas.mjs`, never re-literal them.
- **VALIDATE**: `node -e "import('./system/studio-layers.mjs').then(m => { const r = m.layerEntries([{id:'s1',name:'A',col:2,row:1,kind:'slot',selected:false}]); if (r.length!==1||r[0].sentence!=='column 2, row 1') throw new Error(JSON.stringify(r)); console.log('ok') })"`
- **SATISFIES**: AC #1, #2 (the CI-provable half)

### Task 2 — ADD the mount to `system/studio-layers.mjs`

- **IMPLEMENT**: `export function mountStudioLayers(root, { canvas, select })` + `export const getLayers = () => live;`
  - Boundary: require `canvas.stage`, `canvas.scroll`, `canvas.say`; require
    `select.applySelection` + `select.chosenIds` (throw plain Errors naming what is missing).
    Resolve `const mount = root.querySelector("[data-studio-layers]")`; a page without one returns
    null (the constants-only import case) — readiness still resolves in the `finally`
    (`mount?.setAttribute("data-studio-layers", "ready")`).
  - Structure (element by element): `h3.stu-panel-title` "Layers" · one static caption `p.stu-layers-help`
    with an id, text: *"Everything on the canvas, in board order. Enter selects a component on the
    canvas too; frames move on their own and sit outside the selection, so Enter brings one into
    view instead."* · `ul.stu-layers-list` with `aria-describedby` → the caption id · an empty-state
    `p.stu-layers-empty` ("Nothing on the canvas yet.") shown only when there are no rows.
  - Rows: `li` > `button.stu-layer` with `data-layer-id`, `tabindex` roving (first row 0, rest −1),
    a name `span.stu-layer-name` and a position `span.stu-layer-pos` (the pure `sentence`).
    Board-wrapper rows carry `aria-pressed` mirroring `data-stx-selected` and `.is-selected` for
    the visual; frame rows carry NO `aria-pressed` (they are actions, not toggles) and a
    `data-layer-kind="frame"` for the CSS badge.
  - Read the stage: `slots = () => [...canvas.stage.querySelectorAll(MOVABLE)]` — MOVABLE imported;
    derive the pure input per node from `data-stx-id`/`data-stx-name`/`data-col`/`data-row`/
    `data-span-*`/`classList.contains(FRAME_CLASS)`/`hasAttribute("data-stx-selected")`.
  - **Activation** (delegated `click` on the list; keyboard Enter/Space activates the focused
    button natively as a click — no separate key handler needed for activation):
    - slot row: `select.applySelection(toggleId(select.chosenIds(), id))` — the announcement is
      `applySelection`'s own count sentence, deliberately not duplicated — then, when the toggle
      SELECTED it, `wrapper.scrollIntoView({ block: "nearest", inline: "nearest" })`.
    - frame row: `wrapper.scrollIntoView(...)` + `canvas.say(\`${name} brought into view.\`)` —
      never `applySelection` (a frame id in the want-set would clear every slot's selection and
      announce "Selection cleared." — `applySelection` iterates `.stx-slot` only; state this in a
      comment).
    - a row whose wrapper vanished between paint and press: `canvas.say("Refused: that component is no longer on the canvas.")`,
      DOM untouched (content, never a throw).
  - **List keyboard** (delegated `keydown` on the list): ArrowDown/ArrowUp move the roving focus
    (wrap), Home/End jump — the `focusItem` idiom of studio-select.mjs:355–361 with
    `preventScroll: true` on every focus call. Arrow presses move FOCUS only (no announcement —
    the focused button's own accessible name is the feedback; comment this as deliberate,
    mirroring studio-docs' no-announcement-on-focusin reasoning).
  - **Reflection**: ONE `MutationObserver` on `canvas.stage` with
    `{ childList: true, subtree: true, attributes: true, attributeFilter: ["data-col", "data-row", "data-stx-name", "data-stx-selected", "data-span-col", "data-span-row"] }`.
    In the callback, IGNORE records whose target is not a MOVABLE stage wrapper (`.stx-guide`,
    `.stx-menu` and compiled inner content also mutate; `target.closest(MOVABLE)` scoped to
    direct-child wrappers). Then: if any childList record added/removed a MOVABLE node → rebuild
    the whole list (≤14 rows), preserving focus by re-focusing the row with the previously focused
    `data-layer-id` (or the first row); otherwise update the touched rows IN PLACE (position span,
    name text, `aria-pressed`/`.is-selected`). **In-place for attributes is load-bearing**: a
    rebuild on `data-stx-selected` would destroy the very row the reader just pressed.
  - `destroy()`: disconnect the observer, abort listeners, remove the built nodes, clear `live`.
- **PATTERN**: mount skeleton of `studio-select.mjs:235–727`; static-caption discoverability of
  `studio-verbs.mjs:571–599`; refusal grammar of `studio-verbs.mjs:626`.
- **GOTCHA**: never write `data-stx-selected` yourself — `applySelection` is the ONE writer
  (studio-select.mjs:287–291) and the journey's set-identity assertions depend on it.
- **VALIDATE**: `node -e "import('./system/studio-layers.mjs').then(m => console.log(typeof m.mountStudioLayers, typeof m.getLayers))"` (Node-import safety) — then Task 6's page run.
- **SATISFIES**: AC #1, #2, #4

### Task 3 — CREATE `system/studio-minimap.mjs` (pure layer)

- **IMPLEMENT**: header (calls: geometry is ATTRIBUTES — SVG presentation attributes, the #219
  spans precedent cited as the forcing function; tracked by EVENTS never a timer — scroll +
  `data-zoom` MutationObserver + ResizeObserver, and the zoom-at-0,0 case named as the reason the
  observer half exists; NO BUS VERB deliberately; not a take-over BY STRUCTURE — replay-driver's
  discriminator listens on `canvas.scroll` for pointerdown/keydown only, cite :781–782). Then:
  - `export function mapView({ scrollLeft, scrollTop, clientW, clientH, scale, contentW, contentH })`
    → `{ x, y, w, h }` in UNSCALED stage space: `x = scrollLeft/scale` etc., w/h capped to content,
    x/y clamped to `[0, content − w/h]`. Total over junk: any non-finite input or scale ≤ 0 →
    `{ x: 0, y: 0, w: contentW||0, h: contentH||0 }`-style honest whole-view answer (decide one,
    pin it in group 26).
  - `export function jumpFrom({ fx, fy }, metrics)` — fractions 0–1 of the map box → the scroll
    target that CENTERS the viewport on that content point, clamped to
    `[0, contentW*scale − clientW]` / vertical twin. Total over junk.
  - `export function trackOffsets(tracks, gap)` → cumulative start offsets `[0, t0+g, …]` (the
    inverse of `hitSlot`'s walk; the gap belongs to the track BEFORE the next start).
  - `export function cellRect(slot, span, geomOffsets)` → `{ x, y, w, h }` for a wrapper's
    footprint from the measured track offsets + sizes (span-aware; a 1×1 span is one track).
  - `export function visibleRange(view, geom)` → `{ col1, col2, row1, row2 }` — the cell range the
    viewport rect covers, for the announcement sentence.
- **PATTERN**: the pure/mount split of every studio module; the coordinate chain of
  `studio-verbs.mjs:1031–1037` (this is that chain INVERTED — the same two missing-term traps:
  forget the scroll term and it is wrong panned, forget the scale divide and it is wrong at any
  zoom ≠ 1, and both look fine at 100% at 0,0).
- **VALIDATE**: `node -e "import('./system/studio-minimap.mjs').then(m => { const v = m.mapView({scrollLeft:260,scrollTop:170,clientW:700,clientH:640,scale:0.5,contentW:2804,contentH:1244}); if (Math.round(v.x)!==520||Math.round(v.w)!==1400) throw new Error(JSON.stringify(v)); console.log('ok') })"`
- **SATISFIES**: AC #3 (the CI-provable half)

### Task 4 — ADD the mount to `system/studio-minimap.mjs`

- **IMPLEMENT**: `export function mountStudioMinimap(root, { canvas })` + `getMinimap()` seam.
  - Boundary: require `canvas.viewport`, `canvas.scroll`, `canvas.stage`, `canvas.say`, and the
    `level` getter. Mount node `[data-studio-minimap]`; readiness `"ready"` in a `finally`.
  - Structure: `h3.stu-panel-title` "Minimap" · a focusable interactive wrapper
    `div.stu-map` with `tabindex="0"`, `role="img"` is WRONG (it's interactive) — use a plain div
    with `aria-label` = *"Minimap. Click to move the view; arrow keys pan the canvas one cell,
    Home returns to the top left."* (the label IS the instructions — the studio's static-caption
    rule, one control so no separate help element) · inside it one `<svg>` (`aria-hidden="true"`,
    `viewBox="0 0 ${contentW} ${contentH}"` measured from `stage.offsetWidth/offsetHeight` at
    mount — unscaled, constant because the grid's tracks are fixed) holding: a `rect.stu-map-bg`
    (the stage bounds), one `rect.stu-map-cell` per MOVABLE wrapper (`.stu-map-cell--frame`
    modifier for frames), and LAST (paints on top) `rect.stu-map-view` — the viewport.
  - Geometry: copy `readGeom()` (the verbs'/select's measured-track idiom — third copy is the
    convention) once at mount for `trackOffsets`; re-read it inside the mutation rebuild (cheap,
    rare). All rect positions via `setAttribute("x"|"y"|"width"|"height", …)` — attributes, never
    styles.
  - **Tracking (no timer)**: `canvas.scroll.addEventListener("scroll", …, { passive: true, signal })`
    rAF-throttled → update `.stu-map-view`; `new MutationObserver(update)` on `canvas.viewport`
    with `{ attributes: true, attributeFilter: ["data-zoom"] }` — **this observer is the sole
    correct path for a zoom taken at scroll 0,0, where no scroll event fires but the visible
    fraction changed** (comment this; the journey's sole-detector case rides on it);
    `new ResizeObserver(update)` on `canvas.scroll` (window resizes change `clientWidth`); the
    stage MutationObserver (same filter discipline as Task 2's, ignoring non-MOVABLE records) →
    rebuild the cell rects.
  - **Pointer**: `pointerdown` on `.stu-map` (primary button, non-touch may still be allowed —
    a tap-to-jump is not authoring; accept touch here and say so) → measure the svg's
    `getBoundingClientRect()` AT EVENT TIME, fractions → `jumpFrom` → write
    `canvas.scroll.scrollLeft/scrollTop` → `canvas.say(\`Viewing columns ${col1} to ${col2}, rows ${row1} to ${row2}.\`)`
    from `visibleRange`.
  - **Keyboard** (keydown on `.stu-map`): Arrows pan one CELL (track size + gap, times the current
    scale) with `preventDefault`; Home → 0,0. Every press announces the resulting `visibleRange`
    sentence (including an edge-blocked press, which announces the unchanged range — the verbs'
    per-press rule). No Enter/Space action (the div is not a button; nothing to activate).
  - `destroy()`: disconnect all three observers, abort listeners, remove nodes, clear `live`.
- **PATTERN**: `system-graph.mjs`'s SVG + explicit keyboard controls precedent; the scroll-write
  legitimacy of `studio-canvas.mjs:338–339` (scrollLeft is a property, not a style).
- **GOTCHA 1**: measure the map box in the HANDLER, never at mount (#173's measure-at-call-time
  trap — the rail could be resized by the shell's media query).
- **GOTCHA 2**: `stage.offsetWidth` not `getBoundingClientRect()` for content size — a rect is
  post-transform (studio-canvas.mjs:253–255's fit() trap).
- **GOTCHA 3**: do NOT `e.preventDefault()` on pointerdown before checking — actually there is
  nothing focusable inside; preventDefault is fine and stops a text-selection drag, but then call
  `mapEl.focus({ preventScroll: true })` explicitly so the keyboard path chains off a click.
- **VALIDATE**: Node-import check as Task 2, then Task 6's page run.
- **SATISFIES**: AC #3, #4

### Task 5 — UPDATE `factory.html` + `system/studio.css`

- **IMPLEMENT**:
  - factory.html: inside `<aside class="stu-inspector">`, BEFORE the tablist (:300), add two mount
    nodes with the standard hook comments:
    `<div class="stu-map-block" data-studio-minimap></div>` then
    `<div class="stu-layers" data-studio-layers></div>` (minimap first — wayfinding beside the
    canvas top; layers second — the longer list). Both empty at no-JS (invisible: they render
    nothing without the modules).
  - studio.css: one commented block per surface, tokens only. `.stu-layers-list` (list reset,
    max-height with `overflow-y: auto` — its own scroller, NOT sticky; ~16rem), `.stu-layer`
    (row button: full-width, min-height 32px — the .stu-tab SC 2.5.8 convention, name ellipsis via
    `min-width: 0; overflow: hidden; text-overflow: ellipsis`, `.is-selected` accent border +
    `aria-pressed` NOT used as a selector — class is the visual), `.stu-layer:focus-visible`
    outline, `.stu-layer-pos` muted caption, `[data-layer-kind="frame"] .stu-layer-name::after`
    badge text " · frame" — no, badge as a real `<span class="stu-layer-kind">frame</span>` in the
    DOM instead (CSS content is a screen-reader gamble; keep it markup). `.stu-map` (border,
    background, `cursor: pointer`, focus-visible outline), `.stu-map svg` (`display: block;
    width: 100%; height: auto`), `.stu-map-bg`/`.stu-map-cell`/`.stu-map-cell--frame`/`.stu-map-view`
    fills/strokes from tokens (`--color-bg`, `--color-border`, `--color-accent` at low opacity for
    the view rect fill + solid stroke). **No `position: sticky` anywhere; no new hand-mirrors of
    JS constants** (group 12 grows by nothing).
- **PATTERN**: the mount-hook comments at factory.html:269–274; the `.stu-inspector` block comments
  in studio.css:595–650.
- **GOTCHA**: `[hidden]` inside these blocks is safe (studio.css/components.css don't set
  `display` on these new classes), but don't rely on `hidden` at all — the empty state toggles by
  removing/appending, or by `hidden` ONLY if no author `display` rule targets the element
  (memory: hidden-defeated-by-author-display).
- **VALIDATE**: `npx serve .` → open `/factory.html` in a real browser → both blocks render, no
  console errors (Worker-refused noise expected per memory), neutral pack.
- **SATISFIES**: AC #4 (no sticky), the structural-layout architecture call

### Task 6 — UPDATE `system/studio.mjs` (mount both)

- **IMPLEMENT**: import `mountStudioLayers` and `mountStudioMinimap`; in `mountStudioCore`, after
  the frames mount (:681) add:
  ```js
  const layers = mountStudioLayers(root, { canvas, select });
  const minimap = mountStudioMinimap(root, { canvas });
  ```
  with the standing "LAST, everything it takes is a seam something above already exposed" comment
  (layers takes `select.applySelection`/`chosenIds` — mounted at :460; both take the canvas). Add
  `layers, minimap` to the `live` handle (:690). NO bus handle passed — state why in the comment
  (the studio-frames.mjs "takes NO BUS" sentence, adapted).
- **PATTERN**: the frames/docs mount comments (:661–681).
- **GOTCHA**: both modules observe the stage, so mounting AFTER the frames means the two frame
  rows/cells exist at first paint — but the observer also catches them if order ever changes; do
  not depend on order for correctness, only for the at-rest first paint.
- **VALIDATE**: serve + open /factory: at mount the layers list shows the two frames; as the
  replay plays, rows appear; at settle the list shows 4 board wrappers + 2 frames and the minimap
  shows 6 cells + the view rect. Drag-pan the canvas → the view rect tracks. Zoom out at 0,0 → the
  view rect grows. `node tooling/build-checks.mjs` still passes (imports stay Node-safe).
- **SATISFIES**: AC #1, #3

### Task 7 — UPDATE `tooling/build-checks.mjs` (groups 7, 25, 26)

- **IMPLEMENT**:
  - Group 7: append `"studio-layers.mjs", "studio-minimap.mjs"` to `MODULES` (:1067–1080) with a
    two-line comment each ("joins on the same terms; the minimap's geometry is SVG presentation
    attributes for exactly this gate's reason — the #219 spans precedent").
  - **Group 25 — the layers list's pure layer** (`layerEntries`, `toggleId`): order preservation
    (input order is output order — DOM order is board order); the position sentence for a 1×1 and
    a spanning frame; `selectable` false exactly for `kind: "frame"` (the tripwire the day someone
    widens the selection — cite studio-frames.mjs); `toggleId` both directions + returns a new
    array (mutate the result, re-derive, prove isolation — the createHistory clone-proof idiom);
    totality over 6+ junk shapes; **a mutation case that proves the gate can fail** (e.g. assert a
    junk-skipping rule by feeding one bad row among good ones and counting).
  - **Group 26 — the minimap's pure layer**: `mapView` in THREE conditions — at rest (0,0 @ 1),
    panned (the missing-scroll-term detector: expected x computed independently), zoomed at 0,0
    (the missing-divide detector: w must equal clientW/scale) — each named as the sole detector it
    is; clamping at the far edge (view rect never exits the content box); `jumpFrom` centering +
    both clamps (0 floor and max ceiling); `trackOffsets` gap-before-next-start rule against a
    hand-computed fixture; `cellRect` for a 2×3 span equal to the union of its six 1×1 rects
    (consistency with `footprint`'s definition); `visibleRange` round-trips `mapView`'s answer;
    totality over junk. Plus the **no-timer source pin**: read both new module sources and assert
    `!src.includes("setInterval(")` and `!src.includes("setTimeout(")` — the "tracks without a
    timer" AC as a tripwire (rAF is allowed and used; say so).
  - Both groups close by STATING their boundary: the running-page halves (reflection-in-the-same-
    interaction, selection parity, announcement counts, the tracking wiring, INP) belong to
    `tooling/studio-journey.mjs`'s layersPass/minimapPass — and each names the other.
- **PATTERN**: group 23/24's shape (count pins + mutation + boundary sentence); the check-that-
  cannot-fail memory (mutate, run the function, never grep for it — except the stated source
  tripwires).
- **VALIDATE**: `node tooling/build-checks.mjs` → all groups green including the two new ones;
  then temporarily break `mapView`'s scale divide and watch group 26 go red (revert).
- **SATISFIES**: AC #1–#4's CI-reachable halves

### Task 8 — UPDATE `tooling/studio-journey.mjs` (layersPass + minimapPass)

- **IMPLEMENT**: two new 4-arg passes `(browser, engineName, t, errors)` (the framesPass idiom),
  registered after `perfPass`'s call at :1312 — actually BEFORE `perfPass` in call order so perf
  stays the closing measurement; each with its own context (1440×1000), `watch()` with
  `EXPECTED_NOISE`, the /factory open idiom waiting `[data-studio-layers="ready"]` /
  `[data-studio-minimap="ready"]` AND `[data-replay="settled"]`.

  **layersPass asserts** (expectations computed through the page's own pure imports —
  `layerEntries` joins the import list at :94–109 — and live DOM reads, never literals):
  1. Fixture validity: the canvas is non-empty; the list's rows equal the stage's MOVABLE wrappers
     in count, ids, names AND order; the two frame rows are marked and carry no `aria-pressed`.
  2. Same-interaction reflection: pointer-drag a block to a new cell → its row's position sentence
     updates with NO reload/poll beyond the scroll-settle idiom; an injected `source:"agent"`
     `ui.move` on a fresh page updates it too.
  3. Redraft: answer a method card → the list rebuilds to the drafted board's rows; the frames'
     rows survive (adoptBoard's `.stx-slot` scope, observed not assumed).
  4. Selection parity, both directions: click a row → `chosen(p)` (the selectPass helper) contains
     exactly that id AND the row shows `aria-pressed="true"`; then Shift-drag a canvas marquee →
     the rows' pressed set equals the id set computed through `marqueeRange` + `idsInRange` (the
     :3686 idiom). A second row click DESELECTS (toggle proven both ways).
  5. Keyboard: Tab reaches the list as ONE stop; ArrowDown/Home/End move the roving focus; Enter
     on a slot row toggles selection with EXACTLY ONE live-region sentence (`countLive` — it is
     `applySelection`'s count sentence, asserted by content prefix "1 selected"/"Selection
     cleared."); Enter on a frame row changes NO selection and announces the brought-into-view
     sentence; the wrapper is inside the scroller's viewport afterwards (measured).
  6. Mid-replay non-take-over: fresh page, wait first beat, click a layers row →
     `[data-replay]` is still `"playing"` (or advances to settled naturally), the take-over route
     never fired, and the driver keeps authoring (slot count grows).
  7. Compile: rows byte-identical across Compile → Back to blocks (names/ids/order).
  8. Reduced motion: rows still reflect and select (the selectPass §12 model).
  9. Zero inline styles on the running rail (`inlineStyled`-style hasAttribute("style") sweep) and
     `getComputedStyle(...).position !== "sticky"` for both new blocks (AC #4, pinned at runtime).

  **minimapPass asserts**:
  1. At settle: one `.stu-map-cell` per MOVABLE wrapper; the view rect's x/y/w/h equal the
     expectation computed IN NODE from the page's measured `scrollLeft/scrollTop/clientW/clientH/
     zoom/offsetWidth` through the imported `mapView` — in THREE conditions: at rest, panned
     (scroll to 260,170 via the settle-poll), and zoomed (each the sole detector of one missing
     term — the hitCase argument inverted, cite :927–949).
  2. **The zoom-at-0,0 case**: reset to 0,0 @ 100%, click "Zoom out" once → the view rect CHANGED
     (no scroll event fired; only the `data-zoom` observer path can have done this — the sole
     detector of the observer wiring, and the "without a timer" AC's positive proof).
  3. Pan tracking: drag-pan the canvas → rect moved (scroll-event path).
  4. Content tracking: inject a `ui.move` → the moved block's cell rect follows.
  5. Click-to-jump: click a far quadrant of the map → `scrollLeft/scrollTop` settle at the
     `jumpFrom`-computed clamped target; announced once (countLive), sentence matches
     `visibleRange`.
  6. Keyboard: focus the map, ArrowRight → scroll advanced one scaled cell + announced; press at
     the far edge → announced with an UNCHANGED range (blocked-press honesty); Home → 0,0.
  7. Mid-replay non-take-over: fresh page mid-replay, minimap click → still `"playing"`, driver
     keeps authoring (the dock-mid-replay case's sibling — this case is what keeps the
     discriminator canvas-scoped).
  8. Reduced motion + the sticky/inline-style runtime pins (as layersPass 9).

  **Bookkeeping in the same edit**: re-point the stale-serve guard (:115–124) at
  `system/studio-layers.mjs`; add both passes to the bounds log (:5740) and the success sentence
  (:5744); add `scrollHeight` to `snapshot()` (:134–158) if the minimap assertions need it
  (additive — say so in the diff).
- **PATTERN**: framesPass (:4826–5265) end to end — it is the closest sibling in every idiom.
- **GOTCHA**: request-count assertions are not needed here (no fetches in either module — assert
  THAT instead: zero new requests attributable to the rail via `mainOnly`, cheap and honest).
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs chromium` → new passes green; then `all` (×3 engines).
  **Curl-verify the served tree first** (memory: stale-serve-wrong-tree) — the guard re-point
  makes this structural.
- **SATISFIES**: AC #1, #2, #3, #4, #5 (the running-page halves)

### Task 9 — ADD the two INP rows (AC #5)

- **IMPLEMENT**: in `ROWS_FACTORY`, after the #219 frame-resize pair (:5472) and before #214's
  method pair (:5477) — the method row redrafts the board the layers list reads:
  `{ label: "layers-row toggle", act: … click the first slot row … }` and
  `{ label: "minimap jump", act: … click a far quadrant of .stu-map … }` (each `return`s silently
  when its target is absent — its own pass owns that failure). Update the maintained row counts:
  the bounds log (:5740, 24 → 26), the success sentence (:5744, "eighteen" → the true count), and
  `CLAUDE.md`'s studio-journey paragraph ("sixteen rows" → the true count) — **two of the three
  are already stale; true all three up and say so in the commit.**
- **PATTERN**: the #218/#219 rows around :5430–5472.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → perfPass prints 26 rows, both new
  rows ≤ 200 ms (or the re-measure-once path prints both numbers).
- **SATISFIES**: AC #5 ("re-run #213's driver and compare, don't assume")

### Task 10 — UPDATE `system/param-manifest.json` + regenerate counts

- **IMPLEMENT**: two `/factory` entries (per-item verb = one control; keyboard shortcuts unlisted
  per the ⌘Z precedent):
  ```json
  { "page": "/factory", "selector": "[data-studio-layers] .stu-layer", "label": "layers list row (select a component / bring a frame into view, per placed thing = one control)", "note": "added by #221; rows appear as the replay places things" },
  { "page": "/factory", "selector": "[data-studio-minimap] .stu-map", "label": "minimap (click to move the view, arrow keys pan, Home = top left — one control)", "note": "added by #221" }
  ```
  Then `node agent-layer/gen-param-count.mjs`.
- **VALIDATE**: `git diff system/param-count.json` shows /factory + site totals up by 2; CI's
  drift check is the backstop.
- **SATISFIES**: AC #6 (first half)

### Task 11 — REGENERATE `system/loc-summary.json` + CLAUDE.md entries

- **IMPLEMENT**: `git add` the two new modules by explicit path FIRST (gen-loc reads tracked
  content — memory: loc-summary-counts-tracked-only), then `node agent-layer/gen-loc-summary.mjs`.
  Add two CLAUDE.md architecture-map entries (`studio-layers.mjs`, `studio-minimap.mjs`) in the
  established voice — each naming its load-bearing calls, its "deliberately not"s (no bus verb, no
  timer, frames outside selection / SVG attributes), and its gates (groups 25/26 + the journey
  passes, each stating what the other owns). True up the studio-journey and build-checks
  paragraphs (group count, row count).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the staged tree; approach.html
  renders the new runtime numbers (eyeball via serve).
- **SATISFIES**: repo conventions; feeds Task 12's baselines

### Task 12 — REGENERATE VR baselines (factory ×2, approach ×2)

- **IMPLEMENT**: both new blocks are visible at rest on /factory (inspector rail grows; the rail
  pushes the tablist/panels down) → factory neutral + saulera baselines churn. approach renders
  loc-summary's runtime numbers AND param-count's total → approach ×2 churn. Run
  `cd tooling/visual-regression && npm run update:docker` from a CLEAN worktree under `/Users`
  (memories: vr-gate-reads-working-tree, visual-regression-baseline-trap). Expect the approach
  countUp flake (memory) — a per-pack retry is flake, not regression. If a sub-perceptual page
  refuses to rewrite, `rm` the PNG first (memory: vr-update-skips-subperceptual).
- **GOTCHA**: at-rest determinism — at settle the layers list and minimap derive entirely from the
  settled stage (byte-identical across loads is already replayPass's assertion); nothing here may
  read a clock or random value.
- **VALIDATE**: `npm run test:docker` (or the repo's gate run) green locally; remember local
  Docker pass ≠ CI green — check `gh pr checks` after push (memory: vr-gate-approach-countup-flake).
- **SATISFIES**: AC #6 (second half)

### Task 13 — Full validation sweep, artifacts, PR

- **IMPLEMENT**: run the whole validation ladder (below). Write
  `.claude/reports/studio-layers-minimap-221.md` (implementation report). Commit atomically
  (branch re-verified, staged by explicit path — the shared-worktree memory), PR with body
  trailer `Closes #221` (title mentions alone close nothing — memory: prs-dont-auto-close-tickets).
  Plan + report (+ the later review file) belong in the same PR.
- **VALIDATE**: `gh pr checks` — verify (drift) + visual jobs green.
- **SATISFIES**: all ACs, repo git conventions

---

## TESTING STRATEGY

No test framework (repo rule) — the gates ARE the tests:

### Unit tests (CI — `tooling/build-checks.mjs`)
Groups 25/26 drive every pure export with hand-computed fixtures, totality-over-junk sweeps, and at
least one mutation each proving the gate can fail (memory: check-that-cannot-fail). Group 7 grows
by two modules (style writes, sinks, C0 bytes).

### Integration tests (operator-run — `tooling/studio-journey.mjs`)
layersPass + minimapPass ×3 engines (Task 8's enumerated assertions), plus the two INP rows in
perfPass (Task 9). Every expectation computed from the live page through the page's own pure
functions — never literal ids, counts or pixel numbers.

### Edge cases that must be exercised
- Empty stage (harness-style mount with no frames) → the honest empty sentence; first placement
  creates the first row (pure-layer + a journey micro-case if cheap).
- A frame row activation with a selection already live → selection UNCHANGED (the applySelection-
  with-a-frame-id trap, pinned in group 25's `selectable` flag and layersPass 5).
- Rebuild-under-focus: redraft while a row holds focus → focus lands on a surviving/first row,
  never `<body>`.
- Zoom at scroll 0,0 (minimapPass 2 — the sole detector of the observer wiring).
- Far-edge clamps: jump target at the corner; blocked arrow press announces an unchanged range.
- Junk metrics (scale 0, non-finite scroll) never reach an attribute (group 26 totality).

---

## VALIDATION COMMANDS

### Level 1: syntax & Node-import safety
```
node -e "import('./system/studio-layers.mjs').then(()=>console.log('layers ok'))"
node -e "import('./system/studio-minimap.mjs').then(()=>console.log('minimap ok'))"
```

### Level 2: pure gates (CI-equivalent)
```
node tooling/build-checks.mjs
```

### Level 3: cross-engine journey + INP
```
node tooling/visual-regression/serve.mjs &     # curl-verify a new file is served (stale-serve memory)
node tooling/studio-journey.mjs chromium       # fast loop
node tooling/studio-journey.mjs                # all three engines before commit
```

### Level 4: manual
`npx serve .` → /factory: watch the replay fill the list and map; drag, marquee, redraft, compile,
?b= restore, dock swap to saulera (SVG token fills follow), reduced-motion OS setting; keyboard-only
walk (Tab → list → rows → canvas → map). Real Safari + Chrome stable eyeball of the new rail
(memory: vr-gate-single-engine-blindspot — `min-width: 0` on the rail's grid items).

### Level 5: generated artifacts + baselines
```
node agent-layer/gen-param-count.mjs && node agent-layer/gen-loc-summary.mjs
cd tooling/visual-regression && npm run update:docker   # clean worktree under /Users
```

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — layers list reflects the canvas exactly: add/remove/move updates in the same
      interaction; selecting in either place selects in both (layersPass 1–4; groups 25 + 7)
- [ ] AC #2 — full keyboard navigation of the list with announcements; a real second route
      (layersPass 5; the roving-tabindex single stop; applySelection's sentences)
- [ ] AC #3 — minimap moves the viewport by pointer AND keyboard, tracks pan/zoom without a timer
      (minimapPass 1–6; group 26 incl. the no-timer source pin; the zoom-at-0,0 sole detector)
- [ ] AC #4 — neither uses `position: sticky` (runtime getComputedStyle pin in both passes; CSS
      review)
- [ ] AC #5 — INP budget re-measured, not assumed: two new perfPass rows ≤ 200 ms ×3 engines
- [ ] AC #6 — param-manifest entries + regenerated param-count; factory ×2 + approach ×2 baselines
      regenerated in the same PR
- [ ] Zero regressions: build-checks all groups, studio-journey all passes ×3 engines, VR gate
- [ ] Conventions: group 7 membership, no bus verbs (stated), one live region, readiness handles
      in `finally`, Node-import safety, CLAUDE.md entries, `Closes #221`

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–13 in order (A/B swappable), each validation run at the time
- [ ] Mutation checks actually performed (break `mapView`, watch group 26 red, revert)
- [ ] All three journey engines green; INP rows printed with numbers
- [ ] Baselines regenerated from a clean tree; `gh pr checks` green after push
- [ ] Report + plan committed in the PR; ticket closes via the body trailer

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Build vs cut** — assumed BUILD, on the owner's recorded "finish #214–#223 then re-judge". If
   the owner has since decided to spend the remaining appetite elsewhere, close `not planned`
   instead (the ticket sanctions it explicitly).
2. **Placement** — assumed: both blocks in the `.stu-inspector` rail, above the tablist, minimap
   first. The architecture sentence groups them with "the docked inspector" as structural layout,
   which this reads as license. A left-of-canvas rail (the Figma-shaped alternative) was rejected
   for cost: it re-grids `.stu-canvas-col`, shrinks the canvas at 1440 and roughly doubles the
   baseline/layout risk for the same ACs. Flip only with the owner; #223's hallway test re-judges.
3. **Layers activation semantics** — assumed: row press TOGGLES that node's selection (the context
   menu's Select this/Deselect this vocabulary, additive like Shift-click) + brings it into view;
   frame rows bring-into-view only. If the owner prefers replace-semantics, it is one line in the
   activation handler and one group-25 case.
4. **Minimap accepts touch taps** — a tap-to-jump is navigation, not authoring, so the PRD's
   mobile-authoring non-goal is read as not applying. If challenged, add the `pointerType`
   bail and note it.
5. **Line numbers** — verified against origin/main on 2026-08-15, but a parallel session has small
   staged diffs on `tooling/studio-journey.mjs` (+24) and `system/studio-canvas.mjs` (+8); re-check
   anchors after branching (grep the quoted code, don't trust offsets).

## NOTES (open canvas)

**Why SVG attributes for the minimap (the one real design problem).** Group 7 pins
`writes === 1` inline-style writes across ALL studio modules; the viewport rectangle is continuous
geometry, so the three candidate mechanisms were: (a) argue a group-7 exception — rejected, #219
explicitly changed its whole resize mechanism to avoid becoming write #2, and "every exception is a
sentence a future reader has to trust"; (b) `element.animate()` zero-duration fill-forwards per
frame — legal by the letter (the FLIP precedent) but a persistent-positioning use reads as a regex
dodge, exactly what the group-7 comment warns about; (c) **SVG presentation attributes** —
`setAttribute("x", …)` is the studio's own "geometry is attributes" grammar applied literally, group
7 has nothing to count, studio-journey's `hasAttribute("style")` sweep stays true, and
`system-graph.mjs` already establishes SVG-with-token-fills on this very page. (c) wins on every
axis.

**Why the layers list is NOT `role="listbox"`.** A listbox's `aria-selected` model fits the slot
rows but has no honest state for the frame rows (outside the selection by decision), and
studio-select.mjs call 1 already records "no aria-selected: the wrappers carry no listbox role" for
the canvas side. Plain `<button aria-pressed>` rows in a `<ul>` with roving tabindex give: a true
toggle semantic per row, a natural action semantic for frames (no `aria-pressed` at all), one tab
stop, and zero invalid-ARIA risk. The count sentence from `applySelection` remains the selection's
accessible signal — one voice, both routes.

**Why no bus verbs (fourth/fifth application of the recorded refusal).** Selection is view state
(studio-select call 2 — the layers list is precisely "a second module needs to observe one", but
observation is DOM-read via MutationObserver, not a consumer; the WRITE still goes through the one
`applySelection`). Viewport position is view state with no history entry, no share bytes, no export
bytes, no replay op. Both module headers must record this and name what would change the call (a
replay op that selects; a share payload that carries a viewport).

**Take-over structure.** replay-driver listens for `pointerdown`/`keydown` on `canvas.scroll`
(capture). The rail lives outside that element; the minimap's `scrollLeft` writes fire only a
`scroll` event, which the driver does not watch. So mid-replay: layers toggle = the ⌘A class,
minimap jump = the wheel-scroll/zoom-row class — neither hands over, both asserted, and the
minimapPass case joins the dock-mid-replay case as "what keeps the discriminator canvas-scoped".

**MutationObserver discipline (the INP risk).** Gestures churn attributes per rAF frame and guides
enter/leave the stage's childList mid-carry. Both observers therefore: filter records to MOVABLE
targets, coalesce to one update per animation frame (schedule-once rAF flag), rebuild rows/cells
only on MOVABLE childList changes, and patch in place for attribute changes. The two INP rows and
the 4×-throttled drag check are the measurement that this held.

**Sequencing risk.** The journey file is 5.7k lines and a parallel session is editing it — rebase
before Task 8 and keep the two new passes append-only (registration is 5 edit sites; the survey
lists them).

**Rejected: one combined `studio-rail.mjs`.** Two concerns, two gates, two passes, and the inner
cut (minimap) stays cleanly severable — matching how every #202 module carries exactly one concern.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

**2026-08-15 (implementation) — group numbers are 26/27, not 25/26.** Between this plan's survey
and the branch, #222 merged and took group 25 (the instance stamp). The layers group is 26, the
minimap group 27; the header index also gained the #222 line it was missing.

**2026-08-15 (implementation) — the minimap's horizontal axis meets a recorded /factory
constraint the plan missed.** `#214`'s `.stu-shell .stx-viewport { width: max-content }` pin sizes
the whole viewport to the sizer, so on /factory `scrollWidth <= clientWidth` at EVERY zoom and
`scrollLeft` writes clamp to 0 — the horizontal axis has no scroll range on this page at all
(already recorded in tooling/studio-journey.mjs's R5 note: "a block at column 12 sits off-screen
and un-scrollable-to"). The plan's minimapPass fixtures ("scroll to 260,170", "scrollLeft settles
at the jumpFrom target") are unrunnable as written on the horizontal axis. Resolution, keeping the
pure layer exactly as planned: the mount measures TWO widths — the view rect and the announcement
take the reader-VISIBLE width (the scroller's box clipped by the window edge, measured in the
handler; a window `resize` listener joins the event sources), while `jumpFrom` takes the
scroller's real client size, the scroll-range truth, so the computed target and the browser's own
clamp agree by construction. The journey's "panned" condition rides the vertical axis (the
missing-scroll-term detector is axis-symmetric), the blocked-press case rides the horizontal one
(now /factory's own truth, announced honestly), and the constraint itself is pinned as its own
assertion. The structural alternative — bounding the scroller so it really scrolls — is the
re-grid Open Question 2 already rejected as owner-gated; not taken.

**2026-08-15 (implementation) — firefox puts scrollable containers in the tab order.** The
cross-engine run caught `.stu-layers-list` (its own `overflow-y: auto` scroller) becoming a tab
stop of its own on firefox, between the minimap and the first row — chromium green, firefox red,
exactly the single-engine blindspot the driver exists for. Fix: an explicit `tabindex="-1"` on the
list (removes it from sequential focus everywhere, rows stay the targets), and the arrow-path
focus dropped `preventScroll` so a row below the list's own fold scrolls into that box on a long
board — the menu idiom's preventScroll reasoning (a scroll closes it) does not transfer here.

**2026-08-15 (implementation) — the minimap's cells PATCH per frame; the full rebuild is the
childList/compile path.** #213's 4×-throttled drag check flagged a 52 ms long-animation-frame:
Task 4's prescribed "stage MutationObserver → rebuild the cell rects" put a getComputedStyle and a
whole-SVG redraw inside the gesture's frame on every cell crossing — while this plan's own NOTES
(§MutationObserver discipline) prescribe patch-in-place for attribute churn. The mount now keys
each cell to its wrapper (`data-for`) and patches four attributes on the touched cell; the full
measure-and-redraw runs only on MOVABLE childList changes and on `data-compile-state`. That last
trigger closes a staleness gap the rebuild-only design hid: the compiled state flips
`--stx-slot-h` 140→480px, so the stage's content box GROWS on Compile — the viewBox and content
measurements are now re-taken inside every full rebuild instead of being mount constants, and the
"constant because the tracks are fixed" claim in Task 4 is false and was not implemented.

**2026-08-15 (implementation) — small true-ups.** The layers list's numeric coercion floors at 1
(a `null` coerces to a finite 0, which no grid holds); the minimap pure functions destructure in
the body, not the signature (a default parameter covers `undefined` and not `null` — caught by
group 27's totality sweep on the first run). perfPass's stale "the 16 rows below" comment was
re-worded uncounted; the bounds log and success sentence now say 26 rows.
