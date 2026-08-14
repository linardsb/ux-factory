# Feature: Studio 17 — protos as device frames on the canvas (#219)

The following plan should be complete, but it is important that you validate documentation, codebase
patterns and task sanity before you start implementing.

Pay special attention to the naming of existing exports, constants and selectors. Import from the
right files — this ticket's whole affordability rests on *not* re-typing things that already exist
(`clampSlot`, `MAX_COLS`, `place()`, `hitSlot`, the one history, the pack link matcher).

## Feature Description

`/factory`'s canvas holds the studio's own blocks and, after Compile, its own screens. The two
data-connected prototypes — Verdant's phone screen and Fieldwork's dispatch board — still live only
at `/proto/verdant.html` and `/proto/fieldwork.html`, reachable from `work.html` as two static
embeds in a fixed-height box.

This ticket puts both of them **on the canvas as device frames**: real `<iframe>`s of the existing
proto pages, arranged by the same `data-col` / `data-row` grammar as everything else, movable by the
same handle and the same bus verb, and **resizable** — a new canvas verb with a pointer path, a
keyboard path, a live-region announcement and a place in the one undo history.

The proto pages themselves are **not edited**. `window.self === window.top` already gates the dock,
the inspect layer, the device frame and the palette in both of them (#175, #176), so an embed gets
the pack skin and no nested chrome for free. That is the design working, and this plan asserts it as
a check rather than assuming it.

## User Story

As a **hiring manager evaluating this portfolio**
I want to **see the real, data-connected prototypes sitting on the same canvas as the build I just
watched get assembled — and to move and resize them like anything else there**
So that **"brief in, product out" is one continuous surface I can manipulate, instead of four pages
I have to be told are related**.

## Problem Statement

The studio canvas is the epic's centrepiece, and the two artifacts that most look like *product*
are not on it. A visitor who wants to see the shipped prototypes leaves the studio. The PRD's §1
("the studio absorbs, as device frames on the canvas, the two protos") and §4 ("everything
component-like is draggable") are both unmet, and epic #164's drafted resizable device frame
(`.claude/plans/protos-bus-toggles-device-frame-176.md`) — a design the architecture doc says
migrates here — currently exists only on the standalone Verdant page.

## Solution Statement

Add `system/studio-frames.mjs`: a mount that places two `<iframe>` frames on the studio stage as a
**fourth grid family** (`.stx-frame`), each carrying the proto's title, a caption and a link to the
standalone page.

- **Arrangement is the existing grammar.** The frames are built by `studio-canvas.mjs`'s `place()`
  through a new `kind: "frame"` branch, so they get a `data-stx-id`, a `.stx-grab` move handle, the
  arming, the label and the announcement with no new code. `studio-verbs.mjs`'s `slots()` widens
  from `.stx-slot` to an exported `MOVABLE` selector, so **moving a frame is the existing mover, the
  existing `ui.move` verb and the existing history** — not a second implementation.
- **They are NOT `.stx-slot`.** The compile beat's identity and count tripwires, `arrangementNow()`
  (#208's `g` field), `adoptBoard`'s removal loop and roughly a hundred `.stx-slot` assertions in
  the two drivers all mean *board wrapper*. Frames join `.stx-guide` and `.stx-menu` as a family
  that is on the grid without being a board wrapper — the shape #217 already established and
  build-checks group 12 already polices.
- **Resize is span, in grid units, by attribute.** `data-span-col` / `data-span-row` select
  `grid-column-end: span K` rules from `system/studio.css`. This is forced, not chosen: build-checks
  group 7 asserts `writes === 1` inline-style write across every studio module, so a px `--frame-w`
  (#176's mechanism) is not available to a module that joins that list — and every studio module
  joins it.
- **`ui.resize` is a new bus verb with exactly one consumer**, in `studio-verbs.mjs` beside
  `ui.move`'s. That is what makes pointer, keyboard and an injected `source:"agent"` action produce
  the same result by construction, and what puts a resize in the one undo history.

## Out of Scope / Non-Goals

- **Not editing either proto page.** `proto/verdant.html` and `proto/fieldwork.html` are untouched;
  so are their baselines and `system/device-frame.mjs` (which still ships the standalone width
  resize). If implementation finds itself opening a `proto/` file, the design went wrong — see
  Task 14's `git diff --stat` check.
- **Not deleting `work.html`'s embeds.** The two `.factory-embed` iframes stay where they are; this
  ticket adds a surface, it does not re-point the IA (that was #216, already landed).
- **Frames are not part of #217's selection layer.** The marquee, ⌘/Ctrl+A, the context menu and
  group moves all keep operating on `.stx-slot` only. A frame is moved and resized on its own. This
  is a stated line, not an omission — see NOTES.
- **A dropped/derived brand does not reach the frames.** `build-import.mjs` writes vetted custom
  properties onto `[data-build-stage]` (the canvas column); custom properties do not cross a
  document boundary. The frames wear the reader's **committed pack** (neutral · saulera · verdant ·
  plusui), live-re-pointed when the dock swaps. Owner decision 2026-08-14: state it in the frame
  caption, log a follow-up, do not copy the token map into the frame document — that would make the
  one-application-point vetting invariant (`writes === 1`) become 2.
- **No new proto.** Exactly the two committed proto pages, from a module-level descriptor list.
- **No frame-level pan/zoom of its own.** The canvas's zoom scales the frames with everything else.
- **Not touching `system/components.css`.** The ticket's estimate names it; that is wrong. Every
  `.stx-*` rule lives in `system/studio.css`, and `components.css` is the sheet every shipped page
  and both protos load.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/studio-frames.mjs` (new) · `system/studio-canvas.mjs` ·
`system/studio-verbs.mjs` · `system/studio.mjs` · `system/studio.css` · `system/catalog.mjs` (one
optional parameter) · `factory.html` · `tooling/build-checks.mjs` · `tooling/studio-journey.mjs` ·
`tooling/visual-regression/visual.spec.mjs` · generated artifacts + factory/approach baselines
**Dependencies**: none new. Playwright stays resolved out of `tooling/visual-regression/node_modules`.

**Honest size estimate: ~900–1,200 changed lines**, not the ticket's 500–700. The delta is the
owner's 2026-08-14 call that frames must be **movable as well as resizable** — that pulls the
footprint-aware occupancy layer, the `ui.resize` consumer and the history widening into scope.

## Related Work

**Implements**: [#219](https://github.com/linardsb/ux-factory/issues/219) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) ·
[docs/epics/prototype-studio.prd.md](../../docs/epics/prototype-studio.prd.md) ·
[docs/epics/prototype-studio.architecture.md](../../docs/epics/prototype-studio.architecture.md)
(§Other eng-lead calls → *Protos on canvas are iframes of the existing proto pages, which persist
standalone*)

**Back-references** (decisions inherited, not re-decided):

- `.claude/plans/protos-bus-toggles-device-frame-176.md` — the drafted device frame this migrates.
  Its `@container` reflow rules, its clamp-against-measured-room lesson and its `finally`-set ready
  handle are the parts that carry over; its px `--frame-w` mechanism does **not** (see D3).
  Its other half — the action-bus state toggles — is **superseded by #209's replay driver**, per the
  ticket. Do not rebuild them.
- `.claude/plans/studio-canvas-stage-204.md` — the three substrate calls (DOM stage, native-scroll
  pan, arrangement-as-attributes). D3 and D4 below are these calls applied, not re-argued.
- `.claude/plans/studio-canvas-manipulation-205.md` — the bus-is-the-drive-path rule, the
  preview-then-commit gesture model, SC 2.5.7 / 2.1.1 / 2.5.8.
- `.claude/plans/studio-canvas-affordances-217.md` — `.stx-guide` / `.stx-menu` as non-slot stage
  families, and `GRID_FAMILIES` as the registry that catches a fourth one.
- `.claude/plans/studio-inspector-docs-218.md` — the "mounted last, takes seams already exposed"
  shape, and `watchPackSwap` as an importable seam.
- `.claude/plans/studio-route-surgery-orchestrator-206.md` — `mountStudioCore`'s mount order.

**Forward-references**:

- (none yet) — the dropped-brand-in-frames follow-up ticket created in Task 17 lands here.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING

- `system/studio-canvas.mjs` (whole file, 376 lines) — Why: the substrate. Read the header's three
  calls, then `place()` (:307-345) line by line: the idempotency rule, the handle-born-inert rule
  (:289-298, :324-326), the `say()` on every call (:343). This ticket adds one branch to it.
- `system/studio-verbs.mjs` (:60-235 pure layer, :338-560 the mount, plus the gesture handlers at
  :860-1000) — Why: `slots()` (:356), `snapshot()` (:364-371), `applySlot()` (:376-379),
  `occupancyExcept()` (:385-389), `restore()` (:459-474) and **the one consumer** (:527-557) are the
  five places this ticket edits. Read the "REFUSALS GO TO THE LIVE REGION, NEVER A THROW" paragraph
  (:524-526) before writing any refusal.
- `system/studio.mjs` (:403-676 `mountStudioCore`) — Why: the mount order and its reasons. The
  frames mount **last**, on the terms `docs` mounts on (:660-665). Note `arrangementNow()` (:542)
  and `adoptBoard`'s removal loop (:640) — both keep `.stx-slot` and this plan asserts they do.
- `system/studio.css` (:19-135 the grid, :638 the compiled row height) — Why: the mirror group 12
  pins, and the `--stx-slot-h: 480px` flip that decides D4.
- `system/studio-compile.mjs` (:405-430 `applySwap`, :503-520 `compile`) — Why: the identity and
  count tripwires. **They must keep reading `.stx-slot` and keep passing unchanged** — that is the
  single most important non-regression in this ticket.
- `system/studio-select.mjs` (:262-280) — Why: the selection layer's queries, which stay
  `.stx-slot`-scoped. Read it to confirm nothing there needs to change.
- `system/device-frame.mjs` (whole file, 200 lines) — Why: the migrated design. The `finally`-set
  ready handle (:195-199), the driver seam (:48), the `buttons & 1` pointermove bail (:137-152) and
  the clamp-against-measured-room lesson (:81-93) all carry over conceptually.
- `proto/verdant.html` (:1-30 head, :190-213 the script tail) and `proto/fieldwork.html`
  (:225-240) — Why: the `window.self === window.top` guards that make AC #2 true with zero edits,
  and pack-boot's last-element-in-head rule. **Read, do not edit.**
- `work.html` (:33-45 styles, :242-262 the embeds) + `tooling/visual-regression/visual.spec.mjs`
  (:80-85 the mask entry, :230-234 how `p.mask` is applied) — Why: the masking precedent the ticket
  names, and the exact selector shape to mirror.
- `system/catalog.mjs` (:498-535 `watchPackSwap`) — Why: the pack-link matcher, and the reason it is
  "deliberately BROADER than dock.mjs's PACK_RE". Task 8 widens its signature by one optional
  parameter; the body does not change.
- `system/dock.mjs` (:50 `PACK_RE`, :285-292 the persist + `PACK_CHANGE_EVENT` dispatch) — Why: what
  actually happens on a pack swap, and why observing the link beats listening for the event.
- `system/pack-boot.js` (:1-40) — Why: the frames get their initial pack from this, inside the
  iframe, with no help from us. Its "LAST element in `<head>`" rule is why no proto head is touched.
- `tooling/build-checks.mjs` (:1061-1180 group 7 vetting, :2130-2175 group 12's `GRID_FAMILIES` +
  the fourth-family detector, :2560-2673 group 13) — Why: three gates this ticket must satisfy and
  extend. The fourth-family detector at :2160-2168 **will fail on your first `.stx-frame[data-col]`
  rule** until you register the family; that is the check working.
- `tooling/studio-journey.mjs` (:80-200 helpers, `docsPass` and `selectPass` as pass templates,
  :4780-4900 the INP rows) — Why: `framesPass` is written in this file's idiom, and #213's INP rows
  gain the frame verbs.
- `system/param-manifest.json` (`$description` + the `/factory` block, :67-106) — Why: the counting
  rules, and the existing `.stx-grab` entry that already covers the frames' move handles.
- `CLAUDE.md` (the `system/` architecture map) — Why: the house header style every new canon module
  carries, and the entry this ticket adds.

### New Files to Create

- `system/studio-frames.mjs` — the frames: the descriptor list, the iframes, the captions, the pack
  re-point, the ready handle, the destroy. ~300–340 lines including the header.
- `.claude/reports/studio-protos-as-frames-219.md` — the execution report (same PR).
- `.claude/code-reviews/pr-<N>-review.md` — the review (same PR).

### Files to Update

| File | What |
|---|---|
| `system/studio-canvas.mjs` | `place()` gains `kind` + `spanCol`/`spanRow`; exports `MOVABLE`, `FRAME_CLASS`, `MAX_SPAN_*`, `clampSpan`, `footprint` |
| `system/studio-verbs.mjs` | `slots()` → `MOVABLE`; footprint-aware occupancy; `stepSlot`/`hitSlot` span-awareness; `snapshot`/`restore` carry span; the `ui.resize` consumer + the resize gesture |
| `system/studio.mjs` | mount `mountStudioFrames` last; pass it the canvas + bus |
| `system/studio.css` | the `.stx-frame` family: 12 col + 8 row rules, the span tables, the height unit, the panning rule, reduced motion |
| `system/catalog.mjs` | `watchPackSwap(root, onSwap = resolveTokenValues)` — signature only |
| `factory.html` | `data-studio-frames` hook on the canvas mount + one sentence of lead copy |
| `system/param-manifest.json` | one new entry (resize handle) + a note on the existing `.stx-grab` entry |
| `tooling/build-checks.mjs` | group 12 registers the family + pins the span mirror; group 13 gains the footprint cases; **new group 24** for the frames' pure layer |
| `tooling/studio-journey.mjs` | `framesPass` + two new INP rows |
| `tooling/visual-regression/visual.spec.mjs` | factory's `waitReady` gains the frames handle; a `mask` entry |
| `system/loc-summary.json`, `system/param-count.json` | regenerated |
| `tooling/visual-regression/__screenshots__` | factory ×2 (mask + frames) and approach ×2 (loc numbers) |
| `CLAUDE.md` | the architecture-map entry |

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [CSS Grid — `grid-column-end: span N`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-column-end#span)
  · Why: D3's mechanism. Note that `grid-column: N` **overrides** a separately declared
  `grid-column-end`, which is why the rules split into `-start` and `-end` (Task 4's GOTCHA).
- [`<iframe>` `loading="lazy"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#loading)
  · Why: the perf hedge in Task 5. Verify its behaviour inside a scroll container — an off-screen
  frame inside `.stx-scroll` may or may not defer per engine, and the ready handle must not depend
  on which.
- [WAI-ARIA APG — Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
  · Why: #176's keyboard vocabulary (arrows, Home/End). Read it to record **why the frame handle is
  a `<button>` and not a `separator`**: a splitter is one-dimensional and this control resizes two
  axes.
- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
  · Why: the resize needs a single-pointer path that is not a drag — click-to-set-corner, mirroring
  #205's click-move-click.
- [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  · Why: the resize handle is 24×24, recorded in `studio.css` beside the size, exactly as `.stx-grab`
  is (`studio.css:127-135`).

### Patterns to Follow

**Module header** — every entry-point file opens with a header citing its governing doc, the
decisions it makes and the things it deliberately does not do. Mirror `system/studio-docs.mjs:1-40`
and `system/bus-toggles.mjs`. State: the fourth-family call, the zero-inline-styles claim, the
"NO proto file is edited" claim, the selection non-goal, and the dropped-brand limitation.

**Node-import safety** — no DOM outside a function body, no self-boot. `tooling/build-checks.mjs`
imports these modules under Node:

```js
// system/studio-frames.mjs
export const FRAMES = Object.freeze([ /* … */ ]);   // pure, importable
export function mountStudioFrames(canvas, { bus, root } = {}) { /* DOM only in here */ }
```

**The handle is one module's structure and another module's behaviour** (`studio-canvas.mjs:278-287`,
#231 L2). `place()` draws `.stx-grab`; `studio-verbs.mjs` arms it and owns every listener. The
resize handle follows exactly this: drawn by `place()`'s frame branch, born `disabled`, armed by the
verbs' mount, every listener the verbs'.

**Refusals are content, never throws** (`studio-verbs.mjs:524-526`, `bus-toggles.mjs`):

```js
if (!node) { canvas.say(`Refused: no component ${JSON.stringify(id)} on this canvas.`); return; }
```

`action-bus.mjs:71-81` catches handler throws into `console.error`, which both hides the refusal from
the reader and trips `studio-journey`'s no-page-errors contract.

**Attributes, never inline styles** (`studio-canvas.mjs`'s call 3). Every geometric fact this ticket
writes is a `data-*` attribute resolved by a rule in `system/studio.css`.

**The `finally`-set readiness handle** (`device-frame.mjs:195-199`, `studio-canvas.mjs:372-375`):

```js
export function mountStudioFrames(canvas, opts = {}) {
  const mount = /* … */;
  try { /* every path, including early returns */ }
  finally { mount?.setAttribute("data-studio-frames", "ready"); }
}
```

**A gate states the boundary it cannot reach** — groups 9, 11, 13, 16, 18, 19, 21 and 23 all close
with a sentence naming what belongs to the journey driver. Group 24 must do the same.

---

## IMPLEMENTATION PLAN

### Phase 1: Decide and pin the geometry (CSS + the pure layer)

Nothing renders yet. The span tables, the family registration and the pure clamps land first,
because build-checks group 12's fourth-family detector fails the moment the first `.stx-frame` rule
exists — which is the correct order to meet it in.

**Tasks:** 1–4.

### Phase 2: The frames

**Depends on:** Phase 1.

`place()`'s frame branch, then `system/studio-frames.mjs`: the descriptors, the iframes, the
captions, the pack re-point, the ready handle.

**Tasks:** 5–8.

### Phase 3: Movement and resize

**Depends on:** Phase 2 (there is nothing to move until a frame exists).
**Independent of:** Phase 4's VR work — but not of Phase 5's gates.

The verbs' widening: `MOVABLE`, footprint occupancy, span-aware stepping, the widened
snapshot/restore, the `ui.resize` consumer and the resize gesture.

**Tasks:** 9–11.

### Phase 4: Page wiring, manifest, generated artifacts

**Depends on:** Phase 2.

**Tasks:** 12–13.

### Phase 5: Gates

**Depends on:** Phases 1–4.

build-checks (group 12 extension, group 13 extension, new group 24), `framesPass` in the journey
driver, the INP rows, `vt-verify`'s zero-transition claim re-sampled, the VR mask + `waitReady`,
then the baselines **last**.

**Tasks:** 14–21.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently validated.

### 1. BRANCH from an up-to-date `main`

- **IMPLEMENT**:
  ```bash
  git -C /Users/Berzins/Desktop/Linards_current/ux-factory fetch origin
  git checkout main && git pull --ff-only
  git checkout -b feature/studio-protos-frames-219
  ```
- **GOTCHA**: the session starts on `feature/studio-inspector-docs-218`. `main` has moved a long way
  (#216's chrome rewrite at `168cb2b` churned all 16 chrome-bearing baselines). Branching off the
  old branch would regenerate baselines from a stale tree — the epic's baseline-collision rule.
  Memory: parallel sessions share one working dir — **verify the branch immediately before every
  commit and stage by explicit path**.
- **VALIDATE**: `git status -sb | head -1` shows the new branch; `git log --oneline -1` is `168cb2b`
  or later.
- **SATISFIES**: process.

### 2. MEASURE the pre-change baseline (no production code yet)

- **IMPLEMENT**: record, in the report file you will write at the end:
  - `node tooling/build-checks.mjs` → the group count and the final line.
  - `.stx-slot` counts on a settled `/factory`: serve (`node tooling/visual-regression/serve.mjs &`),
    open `/factory.html`, wait for `[data-replay="settled"]`, and record
    `document.querySelectorAll('[data-studio-canvas] .stx-slot').length` (expect 4).
  - `node agent-layer/gen-loc-summary.mjs --check` and `node agent-layer/gen-param-count.mjs --check`
    both clean.
- **GOTCHA**: memory — *stale serve = wrong tree*. A `serve.mjs` from another session can hold 4757
  for days serving **their** tree. `curl -s localhost:4757/system/studio-canvas.mjs | head -3` and
  confirm it is your file before trusting anything.
- **VALIDATE**: the three numbers are written down. You will compare against them in Task 14.
- **SATISFIES**: AC #4, AC #5 (a before/after pair is the only way to claim "unchanged").

### 3. ADD the pure span layer to `system/studio-canvas.mjs`

- **IMPLEMENT**: below `clampSlot` (:57), in the pure section:
  ```js
  // A frame is a rectangle of cells, not a cell. MIN is 1 because a 1×1 frame is a legitimate
  // (tiny) state and refusing it would need a second bound nothing else in the studio has.
  export const MIN_SPAN = 1;

  // The movable families, as ONE selector both this module and studio-verbs.mjs read. Exported
  // rather than literalled twice for the MAX_COLS / LABEL_MAX / SLOT_MAX reason: the day a fifth
  // family becomes movable there is exactly one line to edit, and build-checks can pin it.
  // NOTE what is NOT here: .stx-guide and .stx-menu are chrome, and #217's selection layer keeps
  // its own `.stx-slot`-only scope on purpose (see studio-frames.mjs's header).
  export const FRAME_CLASS = "stx-frame";
  export const MOVABLE = ".stx-slot, .stx-frame";

  // clampSpan(slot, span) → { cols, rows } that keep the whole footprint on the grid from `slot`.
  // Coerces first, exactly as clampSlot does — a decoded "2" is a real input — and answers MIN_SPAN
  // for anything non-finite rather than letting NaN reach an attribute.
  export function clampSpan({ col, row } = {}, { cols, rows } = {}) { /* … */ }

  // footprint(slot, span) → ["c,r", …] — every cell the rectangle covers, in the same string form
  // studio-verbs.mjs's occupancyKey produces, so the two sets are directly comparable. A 1×1 span
  // returns exactly [occupancyKey(slot)], which is the property that lets the whole occupancy layer
  // widen without changing a single existing answer (build-checks group 13 asserts it).
  export function footprint(slot, span) { /* … */ }

  // fits(slot, span, occupied) → boolean. THE ONE PREDICATE three callers share, and the reason it
  // is here rather than in the mount: `occupied` is a plain Set of keys, so this is pure and
  // build-checks group 13 can drive it — which the DOM-reading occupancyExcept() it is fed from
  // never could. On-grid AND every covered cell free; a footprint that runs off the grid is false,
  // never clamped, because clamping a DESTINATION silently moves the reader's frame somewhere they
  // did not ask for (stepSlot's "a blocked step is a real answer" rule, extended to rectangles).
  export function fits(slot, span, occupied) { /* … */ }
  ```
- **PATTERN**: `clampSlot` (`studio-canvas.mjs:50-57`) — coerce, reject non-finite to the floor,
  clamp both ends. Mirror its posture exactly.
- **IMPORTS**: none new.
- **THE FOUR CALLERS, named here so none of them invents a fifth rule:**
  | Caller | Uses | Why not the others |
  |---|---|---|
  | The `ui.resize` consumer (Task 10) | `clampSpan` only | It does not consult occupancy, deliberately — the gesture enforced it during preview, and a refusal here would make an injected `source:"agent"` resize behave differently from a pointer one (`studio-verbs.mjs:548-552`'s recorded rule for `ui.move`) |
  | The resize gesture's preview (Task 11) | `clampSpan` **then** `fits` | A preview that would overlap a peer is simply not previewed, exactly as an occupied cell is not enterable for a move |
  | The keyboard `End` (Task 11) | `fits` in a loop, largest first | "The largest that fits" has no other honest definition, and it needs occupancy |
  | `groupDelta` / `stepSlot` (Task 9) | `fits` per member | `preview()` routes EVERY gesture through `groupDelta`, single-node ones included — a frame tested by its top-left cell alone would overlap peers with the rest of its footprint |
- **GOTCHA**: `clampSpan` clamps against **`MAX_COLS - col + 1`**, not against `MAX_COLS`. A frame at
  column 11 can be at most 2 wide. Getting this wrong looks correct at column 1, which is where it
  gets tested first.
- **GOTCHA**: `clampSpan` and `fits` answer different questions and must not be merged. Clamping is
  "make this legal geometry"; fitting is "is this destination free". A single function doing both
  would have to decide what to do about a collision, and the two callers want opposite answers.
- **VALIDATE**: `node -e "import('./system/studio-canvas.mjs').then(m=>console.log(m.clampSpan({col:11,row:1},{cols:9,rows:1}), m.footprint({col:2,row:2},{cols:2,rows:2}), m.fits({col:2,row:2},{cols:2,rows:2},new Set(['3,3']))))"`
  → `{ cols: 2, rows: 1 }`, `[ '2,2', '3,2', '2,3', '3,3' ]`, `false`.
- **SATISFIES**: AC #3, AC #6 (the grammar the announcement reports).

### 4. ADD the `.stx-frame` family to `system/studio.css`

- **IMPLEMENT**: a new block after the `.stx-slot` grid rules (~:112), with a comment stating why
  the family exists and why the properties are split:
  ```css
  /* ---------- frames: the fourth grid family (#219) ---------- */
  /* A frame is on the grid but is NOT a board wrapper: system/studio-compile.mjs's two tripwires,
     system/studio.mjs's arrangementNow() and adoptBoard's removal loop all mean `.stx-slot`, and
     they must keep meaning it. .stx-guide and .stx-menu (#217) made the same call. Registered in
     build-checks group 12's GRID_FAMILIES — the fourth-family detector fails without it. */
  .stx-frame { position: relative; display: flex; min-width: 0; overflow: hidden; align-self: start; }

  /* START and END split deliberately: `grid-column: N` is a SHORTHAND and would reset the span
     declared by the rule below it, silently, leaving every frame one cell wide. */
  .stx-frame[data-col="1"]  { grid-column-start: 1; }
  /* … 12 of these, and 8 [data-row] rules with grid-row-start … */

  .stx-frame[data-span-col="1"] { grid-column-end: span 1; }
  /* … 12 … */
  .stx-frame[data-span-row="1"] { grid-row-end: span 1; --stx-frame-rows: 1; }
  /* … 8 … */

  /* THE HEIGHT DOES NOT RIDE --stx-slot-h, and that is the one call in this block worth arguing.
     :638 flips --stx-slot-h to 480px in the compiled state, so a 5-row frame stretched by the grid
     would be 764px at rest and 2,464px after Compile — a phone that grows when you compile a board
     is a lie about the device it depicts. align-self: start plus an explicit height off the AT-REST
     row unit keeps the depicted device the same size in both states; the frame then claims more
     grid area than it paints in the compiled state, which is visible whitespace and honest. */
  .stx-viewport { --stx-frame-unit: 140px; }  /* mirrors the at-rest --stx-slot-h — group 12 pins the pair */
  .stx-frame { height: calc(var(--stx-frame-rows, 1) * var(--stx-frame-unit)
                            + (var(--stx-frame-rows, 1) - 1) * var(--stx-gap)); }

  .stx-frame > iframe { flex: 1 1 auto; min-width: 0; width: 100%; height: 100%; border: 0; display: block; }
  .stx-scroll.is-panning .stx-frame { pointer-events: none; }
  ```
  plus `.stx-resize` (the corner handle): **24×24 minimum**, always visible, `touch-action: none`,
  `cursor: se-resize`, a `:focus-visible` outline matching `.stx-grab`'s, and a comment recording
  SC 2.5.8 beside the size exactly as `studio.css:127-135` does for `.stx-grab`.
- **PATTERN**: the `.stx-slot` block immediately above it — same shape, same exhaustive per-index
  rules, same commentary density.
- **GOTCHA (the one that will cost you an hour)**: `grid-column: N` and `grid-column-end: span K` in
  two rules of equal specificity — the later one wins **for the whole shorthand**. Use
  `grid-column-start` / `grid-row-start` in the position rules. Verify in a browser, not by reading.
- **VALIDATE**: `node tooling/build-checks.mjs` → group 12 **fails** with "studio.css places
  .stx-frame by data-col/data-row but group 12 does not mirror-check it". That failure is the check
  working; Task 15 registers the family.
- **SATISFIES**: AC #1, AC #3.

### 5. UPDATE `system/studio-canvas.mjs` — `place()` learns `kind: "frame"`

- **IMPLEMENT**: extend `place(node, { col, row, name, component, kind, spanCol, spanRow })`:
  - `kind === "frame"` → the wrapper's class is `FRAME_CLASS` instead of `"stx-slot"`, and the
    wrapper also gets a `.stx-resize` button (born `disabled`, no `aria-describedby`) **after** the
    component, mirroring the `.stx-grab` handle's inert birth;
  - `data-span-col` / `data-span-row` written from `clampSpan({col,row},{cols:spanCol,rows:spanRow})`,
    on every call (the #231 L3 lesson: a re-place must not leave a stale attribute);
  - the existing-wrapper detection widens from `classList.contains("stx-slot")` to
    `classList.contains("stx-slot") || classList.contains(FRAME_CLASS)`, and the parent test with it
    — idempotency is the property `studio-journey:93-100` and `vt-verify:303-307` rely on;
  - `armMoveHandles` also arms `.stx-resize` (a second `describedBy` id, passed by the verbs).
- **PATTERN**: the existing `place()` body — the create branch vs the always-branch split at
  :316-339 is exactly where each new line goes.
- **GOTCHA**: `place()` **appends to the stage on every call** and **announces on every call**
  (:340, :343 — `replay-driver.mjs`'s header records why that matters). The frames call it once each
  at mount and never again; do not use it to re-label or re-span a frame.
- **GOTCHA — THE REGRESSION SURFACE IS FOUR INHERITED CALLERS, NOT THE NEW ONE.** `place()` is called
  by `replay-driver.mjs` (once per `place.add`, four times in the committed artifact),
  `studio.mjs`'s placement loop, `adoptBoard`'s re-place loop and `studio-compile.mjs:382-388`'s
  inherited call — and `studio-canvas.mjs:276-277` records that `studio-journey:93-100` and
  `vt-verify:303-307` both depend on `querySelector(".stx-slot") → place(node) → read data-col off
  that same node`. The idempotency widening is correct and is also the riskiest edit in this ticket.
- **VALIDATE**, in this order:
  1. `node tooling/build-checks.mjs` — groups 12/13 still green on the pure exports;
  2. browser console on `/studio.html`:
     `getCanvas().place(document.createElement('div'), {kind:'frame', col:2, row:2, spanCol:2, spanRow:3, name:'X'})`
     → a `.stx-frame[data-col="2"][data-span-col="2"]` with a disabled `.stx-grab` and a disabled
     `.stx-resize`;
  3. **`node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs chromium`**
     — the driver's existing passes are the only thing that proves the widening did not disturb the
     four inherited callers. Run it HERE, before any frame exists. Catching a break at this task
     costs minutes; catching it at Task 16 means bisecting across two phases.
- **SATISFIES**: AC #1, AC #3.

### 6. CREATE `system/studio-frames.mjs` — the pure layer + the mount

- **IMPLEMENT**:
  ```js
  // system/studio-frames.mjs — hand-written canon … (header per the Patterns section)

  // The two committed prototypes, and nothing else. Frozen and exported so build-checks group 24
  // can assert every `src` is a real committed file and that the two footprints are on the grid,
  // disjoint from each other and clear of ROW 1 — which is where arrangeBoard puts every place
  // (studio.mjs:98-100), so a frame overlapping it would collide with a board the driver has not
  // built yet.
  export const FRAMES = Object.freeze([
    Object.freeze({ id: "verdant",   src: "/proto/verdant.html",   title: "Verdant — Plant overview",
                    col: 1, row: 2, spanCol: 2, spanRow: 5, caption: "…", standalone: "/proto/verdant.html" }),
    Object.freeze({ id: "fieldwork", src: "/proto/fieldwork.html", title: "Fieldwork — Dispatch board",
                    col: 4, row: 2, spanCol: 4, spanRow: 4, caption: "…", standalone: "/proto/fieldwork.html" }),
  ]);

  // The pack line, as ONE function both the mount and group 24 read. It returns the href the TOP
  // document is currently wearing — a value dock.mjs's PACK_RE allowlist or pack-boot.js's has
  // already vetted — so nothing here validates storage content and no second allowlist is born.
  export function packHref(doc = document) { /* … */ }

  export function mountStudioFrames(canvas, { bus, root = document } = {}) { /* … */ }
  export const getFrames = () => live;   // the driver's seam (device-frame.mjs:48's idiom)
  ```
  The mount, in order:
  1. validate at the boundary and throw a plain `Error` naming what is missing (`bus-toggles.mjs:73-76`);
  2. for each descriptor: build `<iframe>` (`src`, `title`, `loading="lazy"`), a caption block
     (`<p>` + a standalone `<a>`), then `canvas.place(box, { kind: "frame", … })`;
  3. attach `data-stx-frame="<id>"` to the wrapper — the marker group 24 and `framesPass` key on;
  4. install ONE `MutationObserver` on the top document's pack link, and on each swap copy
     `packHref()` into each loaded frame's own pack link via `contentDocument` (see Task 8);
  5. `destroy()` — abort the controller, disconnect the observer, remove the wrappers, null `live`;
  6. the whole body in a `try` with `finally { mount?.setAttribute("data-studio-frames", "ready"); }`.
- **PATTERN**: `system/studio-docs.mjs` for the shape (pure layer, mount, seam, inert handle on a
  page with no hook); `system/bus-toggles.mjs` for boundary validation and refusal handling.
- **IMPORTS**: `{ FRAME_CLASS } from "./studio-canvas.mjs"` only. **Do not** import `vetTokens`,
  `pack-imported.mjs` or `dock.mjs`.
- **GOTCHA**: the caption must say, in the reader's words, that the frames wear the **site pack** —
  a dropped brand re-skins the canvas around them and not their contents. That sentence is the
  honesty contract discharging the out-of-scope decision, not a nice-to-have.
- **GOTCHA**: an `<iframe>` swallows pointer events, so a drag that starts **on** a frame's content
  never reaches the canvas's pan handler. That is correct — the proto inside is live and usable —
  and it means the frame's own `.stx-grab` handle is the only way to move it. Say so in the header.
- **VALIDATE**: `node -e "import('./system/studio-frames.mjs').then(m=>console.log(m.FRAMES.length))"`
  → `2`, with no DOM error (Node-import safety).
- **SATISFIES**: AC #1, AC #6.

### 7. MOUNT the frames from `system/studio.mjs`

- **IMPLEMENT**: after `docs` (:665), on the same terms:
  ```js
  // #219's frames, LAST for the reason docs and the rail are: everything they take is a seam
  // something above already exposed — the canvas's place(), and the ONE bus whose ui.move and
  // ui.resize consumers the verbs own. They are placed at mount rather than at settle: the replay
  // builds ROW 1 only (arrangeBoard), the frames live from row 2 down, and a canvas that is empty
  // for the first five seconds except for two prototypes is the honest arrival state.
  frames = mountStudioFrames(canvas, { bus, root });
  ```
  Add `frames` to the `live` handle (`:674`) so `getStudio()` exposes it to the journey driver.
- **PATTERN**: the `docs` declaration at `:533` and its mount at `:665`.
- **GOTCHA**: `adoptBoard` (:640) removes `.stx-slot` wrappers only — the frames **survive a
  redraft**, which is correct and must be asserted (`framesPass`, Task 16) rather than assumed.
  Do not "tidy" that loop into `MOVABLE`.
- **VALIDATE**: serve, open `/factory.html`, wait for settle: two `.stx-frame` on the stage, four
  `.stx-slot`, `document.querySelector('[data-studio-frames]').getAttribute('data-studio-frames') === "ready"`.
- **SATISFIES**: AC #1, AC #5.

### 8. WIDEN `watchPackSwap` and wire the frames' pack re-point

- **IMPLEMENT**: `system/catalog.mjs:513` →
  `export function watchPackSwap(root, onSwap = resolveTokenValues) { … onSwap(root) … }`.
  Body otherwise unchanged, including the load/error pair and the per-swap `AbortController`. Then
  `studio-frames.mjs` calls `watchPackSwap(framesRoot, repointFrames)`.
  `repointFrames` copies `packHref(document)` into each frame's own pack link:
  ```js
  const link = frame.contentDocument?.querySelector('link[rel="stylesheet"][href*="/system/tokens."]');
  // matched by the same shape catalog.mjs uses, contract excluded
  ```
  wrapped in `try/catch` — a frame that has not loaded yet needs nothing, because its own
  `pack-boot.js` reads the same storage the dock just wrote.
- **PATTERN**: `catalog.mjs:498-535`'s own commentary — copy its reasoning about *why* the matcher is
  broader than `PACK_RE` into the caller's comment rather than re-deriving it.
- **GOTCHA**: this is a **signature widening with a default**, so both existing mounts stay
  byte-identical in behaviour. Do not turn it into a third copy of the link matcher, and do not
  narrow it to `PACK_RE` — that allowlist is a security gate on storage-supplied hrefs, and this is
  "which line do I observe".
- **GOTCHA**: cross-document access is same-origin only. On `file://` it throws; catch and move on.
- **VALIDATE**: serve `/factory.html`, switch the dock to saulera, and confirm inside the frame:
  `document.querySelector('[data-stx-frame="verdant"] iframe').contentDocument
     .querySelector('link[href*="tokens."][href*="saulera"]')` resolves, and the frame's contents
  visibly re-skin. Then reload with saulera persisted and confirm the frame boots saulera with no
  observer involved.
- **SATISFIES**: AC #1.

### 9. WIDEN the verbs' scope and occupancy to footprints

**THE WIDENING RULE FOR THIS WHOLE PHASE, stated once:** every function below gains span-awareness
with a **1×1 default**, so a `.stx-slot` reads as a 1×1 rectangle and **every existing answer is
byte-identical**. That is not a nicety — it is the property that lets group 13's existing cases run
unchanged as the proof the widening is behaviour-preserving (Task 15).

- **IMPLEMENT** in `system/studio-verbs.mjs`:
  - `slots()` → `[...stage.querySelectorAll(MOVABLE)]` (imported from `studio-canvas.mjs`);
  - `spanOf(node)` → `{ cols, rows }` from `data-span-col` / `data-span-row`, defaulting to 1×1;
  - `occupancyExcept(nodes)` adds **every cell of every peer's `footprint(slotOf(peer), spanOf(peer))`**,
    not one key per peer;
  - `applySlot(node, slot)` gains a sibling `applySpan(node, span)` — attributes only;
  - `snapshot()` records `{ col, row, cols, rows }`; `restore()` compares and applies all four, and
    its `continue`-on-unknown-id branch keeps the #230 comment true.
- **IMPLEMENT** in the **pure** layer, where the two resolvers live:
  - `stepSlot(from, dir, occupied, span = { cols: 1, rows: 1 })` — the walk tests `fits` at each
    candidate instead of a single `taken.has()`. The grid-edge return already terminates it
    (`:98-104`); the bound stays the backstop that comment describes.
  - `groupDelta(members, dcol, drow, occupied)` / `groupStep(...)` — the member entries they already
    receive (`{ id, col, row }`) may now carry `cols` / `rows`, and each member is tested with `fits`
    rather than by its own cell. **This is not optional and is easy to miss**: `preview()` at `:845`
    routes *every* gesture through `groupDelta`, single-node ones included (`:849-851`), so a frame
    dragged on its own would otherwise be collision-tested by its top-left cell alone and would
    happily overlap a peer with the other 9 cells of its footprint.
- **`fits` now has four callers** — `stepSlot`, `groupDelta`, the gesture preview and the keyboard
  `End` (Task 11). That is the payoff for making it pure in Task 3: one occupancy predicate, four
  call sites, one gate.
- **PATTERN**: the pure/mount split at `:60` — every new decision function is pure and exported;
  the DOM reading and writing stays in the mount.
- **GOTCHA**: the deep-compare in build-checks group 13 is a **hand-written recursive canonical
  stringify**, not `JSON.stringify(v, keys)` — an array in stringify's second position is a
  *replacer*, which made every comparison in the group vacuous until a mutation sweep caught it.
  Reuse the existing helper; do not write a new comparison.
- **GOTCHA**: `groupDelta` returns **the very array it was handed** as its "blocked" signal, and
  `preview()` tests that by identity (`if (after === before) return false`). Keep it. Returning a
  fresh equal array instead makes every blocked gesture read as a successful one.
- **GOTCHA**: `restore()` must measure **every** rect before applying **any** (`:455-474`). Widening
  it to spans does not change that, and a per-node measure-apply-animate is wrong the moment one
  restored span relayouts the grid under the next node's `before`.
- **VALIDATE**: `node tooling/build-checks.mjs` — **group 13 green with every existing case
  untouched, before you add a single new one.** That run is the behaviour-preservation proof; if it
  needs a case edited to pass, the default is wrong somewhere.
- **SATISFIES**: AC #3.

### 10. ADD the `ui.resize` consumer

- **IMPLEMENT** beside the `ui.move` consumer (`:527`), with a header paragraph that **argues for
  the new verb**:
  > `studio-flow.mjs` and `studio-docs.mjs` both recorded "NO BUS VERB, deliberately", because
  > pointer and keyboard converge natively on `click`. Resize does not converge — a continuous drag
  > and a stepped keypress are two different gestures producing the same fact — and the AC demands
  > it be undoable, which needs exactly one commit point. So the verb earns itself against two
  > prior refusals rather than being added for symmetry. One emitter per input path, one consumer,
  > one history push, one sentence.

  The consumer: resolve the id → refuse to the live region if absent; refuse if the node is not a
  frame (`!node.classList.contains(FRAME_CLASS)`) — *"Refused: … is not resizable."*; `clampSpan`
  the params (hostile input never reaches an attribute); `history.adopt(snapshot())` then
  `applySpan` then `history.push(snapshot())`; announce
  `` `${nameOf(node)}, ${cols} columns by ${rows} rows.` ``; `syncControls()`.
- **PATTERN**: the `ui.move` consumer, line for line — including *not* consulting occupancy in the
  consumer (the gesture enforced it during preview; a refusal here would make an injected
  `source:"agent"` resize behave differently from a pointer one, which is exactly the parity the
  AC turns on). **State that consequence in a comment**, as `:548-552` does.
- **VALIDATE**: on `/factory.html`,
  `getVerbs().bus.emit({ type: "ui.resize", source: "agent", target: { id: "s5" }, params: { cols: 3, rows: 4 } })`
  → the frame resizes, the live region says so, Undo is enabled. (Use the real id from
  `document.querySelector('[data-stx-frame="verdant"]').dataset.stxId`.)
- **SATISFIES**: AC #3.

### 11. ADD the resize gesture — ONE gesture object with a `kind`

**Read `studio-verbs.mjs:638-1044` before writing a line of this.** The whole task is one decision,
and getting it right is what makes the rest mechanical:

> **A resize is the SAME `gesture` variable with `kind: "resize"`, not a second gesture state.**

`gesture` is one module-level variable that **twelve** handlers key on (`stage` pointerdown /
pointermove / pointerup / pointercancel / lostpointercapture / keydown, `scroll` pointerdown /
keydown, the `document` Escape listener, `flushPreview`, `clearGesture`, and `studio.mjs:484`'s
`verbs.cancel()` compile guard). A separate `resizing` variable means adding a second condition to
every one of them — twelve chances to get it wrong, and the failure mode of each is silent. Widening
the object instead is exactly what #217 did when it added `members` (`:642-651`: "every existing
pointer and keyboard branch reads the same fields it always did"), and it buys mutual exclusion for
free — `stage` pointerdown already returns early when a non-sticky `gesture` exists.

- **IMPLEMENT** — the gesture object gains three fields and nothing else:
  `kind: "move" | "resize"`, `originSpan`, `currentSpan`. `node`, `id`, `origin`, `current`,
  `members`, `occupied`, `source`, `sticky`, `pointerId`, `geom`, `raf`, `pending` all keep their
  meanings. For a resize, `members` is `[the frame]` and `origin`/`current` **never change** — the
  frame's top-left corner is fixed and the bottom-right corner is what the reader is dragging.

- **THE EIGHT BRANCH POINTS, exhaustively** — everything else in the file is untouched:

  | # | Site | Change |
  |---|---|---|
  | 1 | `stage` pointerdown `:895` | `closest(".stx-grab")` → `closest(".stx-grab, .stx-resize")`, and derive `kind` from which one matched. **Load-bearing**: `:896-897`'s `interactive && node.contains(interactive) && !handle` early-return would otherwise swallow every press on the resize button, and the symptom is "the handle does nothing" |
  | 2 | `pickUp(node, source)` `:689` | takes `kind`; on `"resize"` it records `originSpan`/`currentSpan = spanOf(node)`, forces `members = [node]` (a frame is outside the selection layer — D6), and computes `occupied = occupancyExcept([node])` exactly as today |
  | 3 | `preview(slot)` `:845` | dispatches on `kind`. Keep the **name and the single entry point** — `:834-839` records why (three callers, "there is nothing to decide if there is one function"). The resize branch treats `slot` as the desired **bottom-right corner**, derives `cols = slot.col - origin.col + 1` / `rows = slot.row - origin.row + 1`, `clampSpan`s them, and previews only if `fits(origin, span, occupied)` — otherwise it returns `false` and the last valid span stands, mirroring the move's "keep the last valid slot" |
  | 4 | `flushPreview()` `:761` | unchanged — it calls `preview(pointToSlot(...))`, which now dispatches. **Do not give the resize its own flusher**: `:757-760` records that flushPreview's two call sites cover each other and neither is individually proven |
  | 5 | `drop(source)` `:770` | the "did anything change" test becomes kind-aware: for a resize, `currentSpan.cols !== originSpan.cols \|\| currentSpan.rows !== originSpan.rows`. The null-gesture sentence becomes *"…left at N columns by M rows."* |
  | 6 | `emitMove(source)` `:667` → rename `emitGesture` | a third branch emitting `ui.resize` with `target: { id, label, …(shape ? { component: shape } : {}) }` and `params: { cols, rows }` — the same envelope discipline `:654-664` argues for |
  | 7 | `cancel()` `:791` | for a resize, `applySpan(node, originSpan)` instead of the per-member `applySlot` loop |
  | 8 | `stage` keydown `:977` | the pick-up branch accepts `.stx-resize` (Enter/Space starts a resize gesture); while carrying a resize, `DIRS` map to **span deltas** (`ArrowRight` +1 col, `ArrowLeft` −1 col, `ArrowDown` +1 row, `ArrowUp` −1 row) applied through `preview` by translating them into a corner, and `Home`/`End` set the minimum (1×1) / the largest that `fits` |

- **THE KEYBOARD MODEL IS THE CANVAS'S, NOT #176's** — and this is a deliberate departure from the
  migrated design, so record it in the header. #176's standalone splitter committed on every arrow
  press because it had no history and no surrounding grammar. Here, **Enter picks up, arrows preview,
  Enter drops, Escape cancels** — the same sentence `#stx-move-help` already teaches. Three reasons:
  one gesture is one history entry (so `Undo` after a keyboard resize undoes *the resize*, not its
  last column); the reader learns one grammar for the canvas instead of two; and Escape-to-cancel
  exists at all, which a commit-per-press model cannot offer. The cost — a keyboard resize takes one
  extra keypress at each end — is the right trade and is stated rather than discovered.

- **WHAT COMES FREE, and must not be re-implemented**: the rAF throttle and its stale-frame flush
  (`:750-766`, a real webkit bug), the `buttons & 1` firefox bail (`:923-928`), `pointercancel` /
  `lostpointercapture` (`:964-971`, where an unguarded handler undoes every clean drop), the
  `document`-level Escape (`:1041-1044`, needed because a body-drag focuses nothing), the sticky
  single-pointer path (`:949-961` — a click on the handle that moved nothing sets `sticky`, and the
  next press anywhere drops), pointer capture, and `studio.mjs`'s compile-time `verbs.cancel()`.

- **THE ONE CROSS-MODULE EDIT**: `studio-select.mjs:277`'s
  `carrying = () => Boolean(stage.querySelector(".stx-slot.is-picked"))` → `querySelector(".is-picked")`,
  scoped to the stage. Without it the marquee does not know a resize is live and can start mid-gesture.
  `.is-picked` only ever appears on a movable wrapper, so the narrower selector buys nothing.

- **THE `#stx-resize-help` element**: *"Enter to start resizing, arrow keys to size it, Enter to
  finish, Escape to cancel."* — created by the verbs' mount beside `#stx-move-help` (`:488-492`), its
  id passed through `canvas.armMoveHandles` so the module that **owns** the element owns the id
  (`studio-canvas.mjs:278-287`'s rule), and referenced by every `.stx-resize`'s `aria-describedby`.

- **GOTCHA**: the wrapper contains an `<iframe>`, which swallows pointer events. The **initial**
  `pointerdown` must land on `.stx-resize`, so position it above the iframe (absolute, inside the
  `position: relative` wrapper, with the 24×24 minimum). Everything after that is safe:
  `setPointerCapture` on the wrapper (`:908-910`) retargets every subsequent move, which is exactly
  why that comment says capture is not optional.
- **GOTCHA**: guides render during a resize too (`renderGuides` is called from `pickUp` and
  `preview`). That is correct and left alone — the frame's origin does not move, so the guide is a
  claim that stays true for the whole gesture. Say so in a comment, or a reviewer will read it as an
  oversight.
- **VALIDATE**, in a real browser at `/factory.html`, all four paths:
  1. drag the corner → the frame previews live, one announcement at the drop, `Undo` becomes enabled
     with exactly **one** new entry (`getVerbs().history.depth()` before and after);
  2. click the corner (no drag) → announced as picked up; move the pointer; click → committed;
  3. focus the corner, Enter, `ArrowRight` ×3, Enter → **four** announcements (one per arrow plus the
     pick-up), **one** history entry, and `Undo` restores the original span in one press;
  4. Escape mid-drag and mid-keyboard-carry → the frame snaps back to `originSpan`, nothing emitted.

  Then, **before moving on**: `node tooling/studio-journey.mjs chromium` again. The move gesture and
  the resize gesture now share one object and twelve handlers, and the driver's existing move
  sections are the only thing that proves the eight-row edit did not regress them. This is the second
  of the two places this plan re-runs the driver mid-implementation (the first is Task 5), and both
  exist for the same reason: a regression in shipped, already-gated code is cheapest to find in the
  task that caused it.
- **SATISFIES**: AC #3.

### 12. UPDATE `factory.html`

- **IMPLEMENT**: put the mount hook on the canvas mount —
  `<div data-studio-canvas id="canvas" data-studio-frames></div>` — and add one sentence to the
  canvas column's lead copy naming what the two frames are (real prototypes, live data, open
  standalone). Nothing else: every node the frames need is built by the module.
- **PATTERN**: `[data-studio-keep]` — both the mount hook and the state, tested on the **value**
  (`studio.mjs:790-793`).
- **GOTCHA**: this is an at-rest change to a shipped page ⇒ its baselines are invalid. Task 20.
- **VALIDATE**: `node tooling/build-checks.mjs` green; the page renders.
- **SATISFIES**: AC #1, AC #5.

### 13. UPDATE `system/param-manifest.json` + regenerate the counts

- **IMPLEMENT**: one new entry —
  ```json
  { "page": "/factory", "selector": "[data-studio-canvas] .stx-resize",
    "label": "frame resize handle (drag, click-then-click, or Enter + arrows = one per-item verb)",
    "note": "added by #219; one per frame — counted once, matching the .stx-grab rule above" }
  ```
  and extend the existing `.stx-grab` entry's note to say it now covers the frames' move handles
  too. Then `node agent-layer/gen-param-count.mjs`.
- **PATTERN**: the `$description`'s granularity rule — *"a per-item verb present on every board place
  = 1"*. The standalone links inside the captions are plain `<a>` navigation and are **excluded**.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` clean; `/factory` goes 43 → 44 and the
  site-wide total moves by 1.
- **SATISFIES**: AC #6.

### 14. PROVE the non-regressions (a check, not a code change)

- **IMPLEMENT**: assert, with commands, the four things this design claims:
  1. **No proto file touched** — `git diff --stat origin/main -- proto/ system/device-frame.mjs`
     is empty.
  2. **The board's wrapper count is unchanged** — on a settled `/factory`,
     `.stx-slot` is still 4 and `.stx-slot` is still what compile, `arrangementNow` and `adoptBoard`
     query (`grep -n '"\.stx-slot"' system/studio-compile.mjs system/studio.mjs`).
  3. **Compile still works end to end** — click Compile on a canvas holding two frames; four screens
     swap in, the tripwires do not fire, "Back to blocks" reverts.
  4. **The share link still round-trips** — copy the link from the keep rail, open it, and confirm
     the restored board has 4 places and that the frames are present (they are not in `g`, by
     design, and `sent.length === arranged.length` still holds).
- **GOTCHA**: (2) is the check that the fourth-family design actually bought what it was chosen for.
  If any of those three files now needs `:not([data-stx-frame])`, the design regressed into the
  option this plan rejected — stop and re-read D1.
- **VALIDATE**: all four, written into the report.
- **SATISFIES**: AC #4, and the epic's "the check must be able to fail" rule.

### 15. EXTEND build-checks group 12 (the mirror)

- **IMPLEMENT**: add `".stx-frame"` to `GRID_FAMILIES` (`:2152`), then add a **span mirror** in the
  same idiom — exhaustive and in both directions:
  - every `data-span-col` index 1..`MAX_COLS` present exactly once, none out of range;
  - every `data-span-row` index 1..`MAX_ROWS` present exactly once, none out of range;
  - every `[data-span-row="R"]` rule declares `--stx-frame-rows: R` matching its own index (the
    height and the span cannot disagree);
  - `--stx-frame-unit` equals the **at-rest** `--stx-slot-h` declaration, read from the sheet.
- **PATTERN**: the `axis()` helper at `:2143-2151` — reuse it, do not write a second one. Note its
  own comment: a count-based check ("there are 12 rules") passes for a set with a duplicate and a
  gap.
- **GOTCHA**: a fourth-family detector already exists at `:2160-2168` and derives families from the
  sheet. It fails right now (Task 4). Registering the family is the fix; widening the detector's
  regex is not.
- **VALIDATE**: `node tooling/build-checks.mjs` green. Then **mutate**: delete
  `.stx-frame[data-span-col="7"]` from the sheet and confirm the group goes red naming index 7.
- **SATISFIES**: AC #3.

### 16. EXTEND build-checks group 13 + ADD group 24

- **IMPLEMENT**:
  - **group 13** (verbs), in this order:
    1. the existing `STEP_CASES` and `GROUP_CASES` re-driven at the **default 1×1 span**, answers
       asserted unchanged — the property that makes the whole widening safe, and the case that must
       be written before any new one;
    2. `stepSlot` with a span: a 2×2 blocked by **one cell** of its footprint (the case a top-left-only
       test passes wrongly), a 2×2 that fits where a 1×1 also fits, and the grid-edge refusal
       returning `from` **unchanged**;
    3. `groupDelta` with a spanning member: blocked asserted by **deep equality with the input** —
       the only assertion a partially-moved set fails — and the returned-array **identity** that
       `preview()` tests, asserted as identity rather than as equality;
    4. `fits` over its own truth table, including the positive control (a footprint that fits an
       empty grid) without which every negative case can pass for the wrong reason;
    5. `clampSpan` at column 11, `footprint`'s 1×1 identity with `occupancyKey`, and a
       snapshot/restore round-trip carrying spans through the real `createHistory`;
    6. **the mutation**: make `footprint` return only its origin cell and assert case 2 and case 3
       both go red. If either stays green, the check is testing the clamp rather than the footprint.
  - **new group 24** (`studio-frames.mjs`'s pure layer):
    - `FRAMES` is frozen (prove by mutation, both levels — group 22's `MENU_ITEMS` idiom);
    - every `src` and `standalone` is a **real committed file** (`existsSync`), so a renamed proto
      page fails here rather than as two empty boxes on the canvas;
    - both footprints are on the grid by `clampSpan`'s own definition, **disjoint from each other**,
      and **clear of row 1** — with the reason in the message (`arrangeBoard` puts every place on
      row 1);
    - `packHref` over a stub document: it returns the pack line and **not** `tokens.contract.css`
      (the trap `catalog.mjs:503-508` records), and returns null rather than throwing on a document
      with no pack line;
    - the **mutation that decides whether the file check can fail**: point one descriptor at
      `/proto/nope.html` in a clone of the data and assert it goes red.
  - Close group 24 with the boundary sentence: *the frames rendering, the pack following a mid-visit
    swap, the absence of nested chrome, the resize gesture and the ready handle are
    `tooling/studio-journey.mjs`'s `framesPass`, and this group cannot reach them.*
- **PATTERN**: group 23 (`:4623`) for the shape of the summary line and the boundary sentence.
- **VALIDATE**: `node tooling/build-checks.mjs` → 24 groups, all green; each mutation above proven to
  go red and then reverted.
- **SATISFIES**: AC #3, AC #6.

### 17. ADD `framesPass` to `tooling/studio-journey.mjs`

- **IMPLEMENT**, in the file's idiom (one page per concern, every bound printed by the driver):
  1. **They are there and they are frames** — on a settled `/factory`, exactly `FRAMES.length`
     `.stx-frame`, each holding an `<iframe>` whose `src` matches the descriptor, each with a
     `data-stx-id` and an armed `.stx-grab` and `.stx-resize`.
  2. **No nested chrome — asserted on `contentDocument`** (AC #2): inside each frame,
     `.dock`, `[data-inspect-toggle]`, `[data-palette-open]` and `.proto-resize` are all **absent**,
     and the frame's own `document.body` carries the proto's `data-page`. This is the assertion the
     pixel gate structurally cannot make, and it is the one that would catch a proto page dropping
     its `window.self === window.top` guard.
  3. **The pack follows a mid-visit swap** (AC #1): read the frame's pack link href, switch the dock
     to saulera, wait for the swap, read it again — it must be `tokens.saulera.css`. Then assert the
     swap **is not a take-over** (the discriminator is canvas-scoped — #213's precedent).
  4. **Three-source resize parity** (AC #3): pointer drag · keyboard arrows · an injected
     `source:"agent"` `ui.resize` through `getVerbs()`'s seam **on a fresh page with no gesture
     first** — the freshness is the whole discriminator, exactly as #205's move proof needs it.
     Compare the resulting `data-span-*` attributes, not "an action was emitted".
  5. **Announcements counted EXACTLY and per path.** The two paths differ on purpose and the driver
     must say which is which: a pointer resize announces once (at the drop), a keyboard resize
     announces the pick-up and then EVERY arrow press including a blocked one (`studio-verbs.mjs:1016-1019`
     records why: a keyboard user with no per-step feedback cannot tell a step blocked by a peer
     from one blocked by the grid edge). Read the exact formula off the implementation and pin it,
     as the move rows already pin `pointer 1, keyboard N + 2` — a naive once-per-gesture count sends
     the next implementer to delete the per-press feedback, which is the wrong fix.
  6. **Undo restores the span** (AC #3): resize, Undo, assert both span attributes are back; Redo,
     assert they return. Then the **mixed sequence**, which is the one a per-verb history would fail:
     move · resize · move, then three Undos, asserting the canvas walks back through all three in
     order. One history, one stack — proven, not assumed.
  7. **The selection line holds** (D6): a marquee dragged across a frame selects **nothing** — no
     `[data-stx-selected]` on it — and ⌘/Ctrl+A leaves it unselected while selecting the blocks.
     This is the assertion that keeps a half-widened selection layer from shipping unnoticed.
  8. **A frame is movable** and its footprint blocks: move a frame by its `.stx-grab`, then prove a
     block cannot step into a cell the frame covers (announced refusal, DOM untouched).
  9. **A redraft leaves the frames alone**: answer a method card, wait for the drafted board, assert
     `.stx-frame` is still `FRAMES.length` while `.stx-slot` changed.
  10. **Compile survives**: press Compile with frames present; four `.stf-screen` appear, no refusal
     card, `.stx-frame` unchanged.
  11. **The ready handle and zero console errors** on every page opened above.
- **PATTERN**: `docsPass` and `selectPass` — the same page-per-concern structure, `getStudio()` /
  `getVerbs()` seams, never a `window.__` global.
- **GOTCHA**: memory — *hover probes race smooth scroll*; wait for `scrollY` stability before any
  geometry assertion. And two constraints decide where a case may place a node: at this viewport,
  column 9 sits outside the 1440px window, so an **empty** cell is not automatically a **reachable**
  one for a pointer.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all` — chromium, firefox and webkit all green.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #5.

### 18. ADD the INP rows and re-sample `vt-verify`

- **IMPLEMENT**: two new rows in #213's INP block (`studio-journey.mjs`) — "frame resize (pointer)"
  and "frame resize (keyboard)" — against the same ≤ 200 ms budget, behind the same forced-slow
  calibration click. Then re-run `tooling/vt-verify.mjs` for `/factory`: the frames name **nothing**
  for a view transition, so the expected count stays what it is, and #213's post-interaction samples
  must still hold with two iframes on the page.
- **GOTCHA**: two full proto page boots are real added load on a page that already spends 14 s on
  the replay. If a row goes over budget, re-measure **once** on a fresh page with both numbers
  printed — never silently — and if it is genuinely over, that is a finding to record, not to hide.
- **VALIDATE**: `node tooling/studio-journey.mjs all` prints every bound; `node tooling/vt-verify.mjs all`
  green.
- **SATISFIES**: the epic's guardrails (PRD §Success metrics).

### 19. UPDATE the VR spec + regenerate `loc-summary.json`

- **IMPLEMENT**:
  - `tooling/visual-regression/visual.spec.mjs`, the `factory` entry: add
    `'[data-studio-frames="ready"]'` to `waitReady`, and
    `mask: '[data-studio-canvas] .stx-frame iframe'` with a comment mirroring `work.html`'s
    (:80-85): the frames' *content* loads async and is screenshotted standalone in the two proto
    entries, so masking it costs no coverage; the frame *chrome* is not masked and is covered by
    the ready handle.
  - `node agent-layer/gen-loc-summary.mjs` (a new tracked source file changes the numbers
    `approach.html` renders).
- **GOTCHA**: `p.mask` is currently applied on the `work` entry only; the code path is generic
  (`:232-234`) but re-read it before assuming a second entry composes with `factory`'s `timeout`.
- **GOTCHA**: the ready handle must resolve when the frame **elements and their attributes** exist —
  **not** on iframe `load`. A slow fixture fetch would otherwise shift the gate's timing, and a
  proto page that fails to load would hang the gate for the wrong reason.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` clean.
- **SATISFIES**: AC #5.

### 20. REGENERATE the baselines — LAST, from a clean detached worktree

- **IMPLEMENT**:
  ```bash
  git worktree add --detach /Users/Berzins/vr-219 HEAD
  cd /Users/Berzins/vr-219/tooling/visual-regression && npm ci && npm run update:docker
  # copy the changed PNGs back into the branch, then:
  git worktree remove /Users/Berzins/vr-219
  ```
  Expect **four** PNGs: `factory-neutral`, `factory-saulera` (the frames + the mask + the lead copy),
  `approach-neutral`, `approach-saulera` (the loc numbers).
- **GOTCHA**: memory, four of them, and each has cost a PR before —
  · the gate screenshots the **dirty** tree, so it must run from a clean detached worktree;
  · **under `/Users`**, never `/private/tmp` (Docker can't share it);
  · `update:docker` **won't rewrite** a baseline whose only change is sub-perceptual — `rm` the PNG
    to force it;
  · `maxDiffPixels: 100` swallows a few changed digits, so a green run is **not** proof a page
    didn't change.
  Merge `main` first if it has moved (the epic's baseline-collision rule).
- **VALIDATE**: `cd tooling/visual-regression && npm run test:docker` — all 22 shots green; and
  `git status` shows exactly the four expected PNGs, no more.
- **SATISFIES**: AC #4, AC #5.

### 21. UPDATE `CLAUDE.md`, write the report, open the PR

- **IMPLEMENT**: an architecture-map entry for `studio-frames.mjs` in the house style (dense, naming
  the decisions and the gates that own them), and one clause each on `studio-canvas.mjs`'s
  `place()` gaining `kind`, `studio-verbs.mjs` gaining `ui.resize`, and group 24. Write
  `.claude/reports/studio-protos-as-frames-219.md`. Then `/piv-create-pr`; the body **must** carry
  `Closes #219`.
- **PATTERN**: the existing `studio-docs.mjs` entry — it is the closest in shape and length.
- **GOTCHA**: a PR **title** mentioning `(#219)` closes nothing. The plan, the report and the review
  all live in this PR.
- **VALIDATE**: `node tooling/build-checks.mjs` · `node agent-layer/gen-loc-summary.mjs --check` ·
  `node agent-layer/gen-param-count.mjs --check` all clean on the final tree;
  `gh pr view --json body -q .body | grep -c "Closes #219"` → 1.
- **SATISFIES**: process, and the epic's per-ticket contract.

---

## TESTING STRATEGY

No suite, no linter, no type-check — do not hunt for one. "Done" = run the surface you touched
(CLAUDE.md), plus this repo's committed gates.

### Pure gates (CI, `node tooling/build-checks.mjs`)

- **group 7 (vetting)**: `writes === 1` must still hold with `studio-frames.mjs` added to `MODULES`.
  That is the check that makes D3 real rather than stylistic.
- **group 12 (canvas)**: the fourth family registered; the span mirror exhaustive in both directions;
  the frame row unit pinned against the at-rest slot height.
- **group 13 (verbs)**: the 1×1 identity property, the span cases, the history round-trip with spans.
- **new group 24 (frames)**: `FRAMES` frozen, every `src` a real committed file, both footprints on
  the grid and disjoint and clear of row 1, `packHref`'s contract trap, and the mutation that proves
  the file check can fail.

### Cross-engine functional (operator-run, committed)

`node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs all` —
`framesPass` (11 assertions above) plus the two INP rows, on chromium + firefox + webkit.

### Pixel gate

`cd tooling/visual-regression && npm run test:docker` — 22 shots. The frames' content is masked; the
frames' chrome is not, and is covered by `[data-studio-frames="ready"]`.

### Transition verification

`node tooling/vt-verify.mjs all` — `/factory` still opens the counts #213 recorded. The frames name
nothing for a view transition, deliberately (#171's lesson).

### Manual validation

`npx serve .` → `/factory.html`:
- both frames render, wear the site pack, and their contents are live (source badge says
  `static` with no Worker running);
- the dock's four packs each re-skin both frames;
- drag a frame by its grab handle · resize by dragging the corner · resize by click-then-click ·
  resize from the keyboard (Enter, arrows, Enter) · Escape out of each of the three mid-gesture;
- Undo/Redo across a mixed sequence of moves and resizes;
- Compile → four screens; the frames keep their pixel size; "Back to blocks";
- answer a method card → the board redrafts and the frames stay;
- **the three paint-order checks**, in one pass: the context menu (Shift+F10) opens **over** a frame,
  an alignment guide draws **under** one, and an inspect bubble opens over one **un-clipped**.
  `.stx-frame` is `position: relative; overflow: hidden` — structurally identical to `.stx-slot`, so
  no new stacking context is introduced and this is a confirmation rather than an audit. (#176's
  `container-type` — the mechanism that made a full hazard audit necessary there — appears nowhere
  in this design, and `vt-verify` already asserts zero `::view-transition-*` pseudos on this page.);
- `/proto/verdant.html` and `/proto/fieldwork.html` standalone: the device frame, the dock, the
  inspect toggle and the palette are all still there and still work;
- `/work.html`: the two embeds are unchanged.

### Edge cases that must be exercised

- A frame at the grid edge: resize past `MAX_COLS` refuses and says so.
- A resize whose footprint would cover an occupied cell: refuses, DOM untouched, nothing on console.
- An injected `ui.resize` naming a `.stx-slot`: refused as "not resizable".
- An injected `ui.resize` with junk params (`{cols: "abc", rows: -9}`): clamped, never NaN in an
  attribute.
- A `?b=` shared link: restores 4 places, frames present, `sent.length === arranged.length` holds.
- Reduced motion: no travel animation on undo/redo of a resize; the interaction still completes.
- A frame whose `src` 404s: the box renders, the caption still reads, nothing throws, nothing on
  console.
- `destroy()` mid-anything: the observer disconnects, the wrappers go, `getFrames()` is null.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Node-import safety

```bash
node --check system/studio-frames.mjs
node -e "import('./system/studio-frames.mjs').then(m => console.log(m.FRAMES.length))"
node -e "import('./system/studio-canvas.mjs').then(m => console.log(m.MOVABLE, m.MIN_SPAN))"
```

### Level 2: Pure gates + drift

```bash
node tooling/build-checks.mjs
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs 2>/dev/null || true   # if present in this tree
```

### Level 3: Cross-engine functional

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
```

### Level 4: Pixel gate

```bash
cd tooling/visual-regression && npm run test:docker
```

### Level 5: Manual

```
npx serve .
# /factory.html · /proto/verdant.html · /proto/fieldwork.html · /work.html · /approach.html
```

---

## ACCEPTANCE CRITERIA

Verbatim from #219, each mapped to the task that discharges it:

- [ ] **Both protos render inside frames on the canvas and wear the reader's current pack.**
      Tasks 6, 7, 8 · gated by group 24 + `framesPass` 1 and 3.
- [ ] **No nested appearance dock, no nested chrome, inside either frame.**
      Task 14 (zero proto edits) · gated by `framesPass` 2, asserted on `contentDocument`.
- [ ] **Resizing a frame is a canvas verb: pointer and keyboard, announced, undoable.**
      Tasks 9, 10, 11 · gated by group 13 + `framesPass` 4, 5, 6.
- [ ] **`/proto/verdant.html` and `/proto/fieldwork.html` still render standalone and still pass
      their own baselines, unchanged.** Task 14 check 1 · gated by the pixel gate (both proto
      baselines must not change) and the manual pass.
- [ ] **The frames do not break the studio's at-rest determinism — a frame that loads at an
      unpredictable moment is handled by the ready handle, not by a timer.**
      Tasks 6 (`finally`), 20 (`waitReady` + mask) · gated by the pixel gate and `framesPass` 11.
- [ ] **Frame controls have `param-manifest.json` entries.** Task 13 · gated by
      `gen-param-count.mjs --check` in CI `verify`.

Plus the epic's per-ticket contract:

- [ ] New tracked source file ⇒ `gen-loc-summary.mjs` regenerated **and both approach baselines**.
- [ ] New live-manipulable control ⇒ manifest entry + `gen-param-count.mjs`, same PR.
- [ ] At-rest change to a shipped page ⇒ that page's baselines regenerated from a clean detached
      worktree under `/Users`.
- [ ] PR body carries `Closes #219`; plan + report + review all in this PR.
- [ ] Every new check proven able to fail by mutation (Tasks 15, 16).
- [ ] `CLAUDE.md`'s architecture map updated.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validated immediately
- [ ] `node tooling/build-checks.mjs` green — 24 groups
- [ ] `node tooling/studio-journey.mjs all` green on three engines
- [ ] `node tooling/vt-verify.mjs all` green
- [ ] `npm run test:docker` green — exactly four baselines changed
- [ ] `git diff --stat origin/main -- proto/ system/device-frame.mjs` empty
- [ ] `.stx-slot` on a settled `/factory` is still 4; compile, share and redraft all unaffected
- [ ] Every mutation check reverted
- [ ] Report + review committed in the same PR; `Closes #219` in the body

---

## OPEN QUESTIONS / ASSUMPTIONS

**Answered before planning (owner, 2026-08-14):**

1. **Frames are movable as well as resizable.** The ticket's ACs require only resize; the scope text
   says they "obey the arrangement grammar like anything else component-like". Owner chose the wider
   reading. This is why the plan carries the footprint-occupancy layer and the `MOVABLE` widening —
   without it, Phase 3 would be Task 10 alone.
2. **A dropped/derived brand does not reach the frames** — stated in the caption, logged as a
   follow-up, **not** solved by copying the vetted token map into the frame document (which would
   break `writes === 1`).

**Assumptions this plan makes:**

3. **The `.stx-frame` footprints (2×5 at 1,2 and 4×4 at 4,2) are placeholders for a real look.**
   They are on the grid, disjoint, and clear of row 1, which is what group 24 pins — but whether a
   456×764 phone and a 928×608 board *read well* beside four 220×140 blocks is a judgement call.
   **Make it in a real browser BEFORE writing `FRAMES`, not while writing it**, because of a fact the
   grid arithmetic hides: `.stx-scroll` is `height: min(70vh, 640px)`. At rest a frame starting at
   row 2 begins at y≈156 and the phone runs to y≈920, so **most of both frames sits below the
   visible box** — and with the content masked, factory's baseline would show two mostly-cut-off
   masked rectangles. That may be exactly right (the canvas scrolls; the frames are found by
   scrolling like anything else), or it may argue for shorter spans. Decide it against the real
   640px viewport. Change the numbers, not the rules; group 24 keeps them honest either way.
4. **`loading="lazy"` inside `.stx-scroll` is a hedge, not a contract.** If an engine defers a frame
   that is scrolled into view, drop the attribute — the ready handle must never depend on it.
5. **Group 24 is the next free number.** CLAUDE.md's prose says 23 is the highest; count from the
   source before typing it.
6. **`framesPass` runs against the settled page**, like every other pass. If the two iframes push
   `/factory`'s VR `timeout` (currently 90 s) close to the edge, raise it on the page entry with a
   comment, as the replay's own 14 s already is.

7. **A frame is NOT in `#208`'s share arrangement — decided, not open.** `g` carries the board's
   arrangement, `sent.length === arranged.length` is the codec's own equality, and a frame is not a
   place. A reader who moves a frame and shares the link gets the frames back at their default
   positions, which is the honest behaviour of a codec that encodes a build. **Do not widen
   `arrangementNow()` inside this ticket** — that it stays `.stx-slot`-scoped is one of Task 14's
   four non-regression checks, and it is a large part of what D1 bought. Frame positions surviving a
   share is a codec v3 question and its own ticket.

**Unresolved, flagged rather than guessed:**

8. **Should the frames appear before the replay settles?** This plan mounts them at load (the canvas
   is otherwise empty for ~5 s, and two prototypes are a better arrival state than nothing). If the
   pixel baseline or a hallway test says the frames distract from the replay, moving the mount into
   `publishBoard` is a two-line change — but it would then need its own ready-handle timing story.
   The consequence to expect rather than be surprised by at Task 20: the frames are **in** factory's
   baseline alongside the settled board, so any later change to a frame footprint churns those two
   PNGs again.

---

## NOTES (open canvas)

### D1 — why frames are a fourth family and not `.stx-slot`

The tempting design is "a frame is just another wrapper", because then movement, the history, the
guides and the selection all work with zero new code. It was rejected on measured cost.

`.stx-slot` does not mean "a thing on the grid". It means **a board wrapper**, and four shipped
mechanisms depend on that meaning:

| Site | What it assumes |
|---|---|
| `studio-compile.mjs:413`, `:514` | `wrappers.length === screens.length`, and element identity across the beat (#253) |
| `studio.mjs:542` `arrangementNow()` | one entry per place → #208's `g` field → `sent.length === arranged.length` at `:437` |
| `studio.mjs:640` `adoptBoard` | removing every `.stx-slot` clears the board and nothing else |
| `studio-journey.mjs` / `vt-verify.mjs` | ~100 count, `first()`, `nth()` and `slotCount === places` assertions |

Making frames `.stx-slot` means teaching all four the difference between a board wrapper and a frame
— i.e. `:not([data-stx-frame])` in five shipped modules and a shifted count in a hundred assertions,
on the two most heavily gated files in the repo. Making frames a **fourth family** costs one
selector constant in `studio-verbs.mjs` and leaves all four untouched.

#217 already made this call for `.stx-guide` and `.stx-menu`, and left the registry that catches a
fourth (`GRID_FAMILIES` + the derived-from-the-sheet detector). This ticket walks through a door
that is already open.

### D2 — why `place()` builds the frame wrapper

The alternative is for `studio-frames.mjs` to build its own wrapper. That is ~30 duplicated lines,
and every one of them is a rule someone argued for: the idempotency contract two drivers rely on,
the handle-first tab order, the born-inert handle, the re-label fix (#231 L3), the id counter, the
`say()` on placement. A `kind` branch keeps all six in one place and gives the frames the arming
behaviour for free.

### D3 — why resize is span and not pixels

Not a preference. `tooling/build-checks.mjs:1178` asserts `writes === 1` inline-style write across
`MODULES` (`:1061-1067`), which lists **every** studio module. `studio-frames.mjs` is a studio
module; leaving it off that list to keep a `--frame-w` write is exactly the "check that skipped the
thing it tested" failure this repo has a memory about. So the module writes zero inline styles, and
geometry is attributes resolved by `studio.css` — `studio-canvas.mjs`'s call 3, inherited rather
than re-argued.

The trade this inherits: resize is **stepped**, not continuous. Stepped is also announceable
("3 columns by 5 rows") and has a finite tamper surface — the same trade `fit()` records for zoom.

### D4 — the compiled-state height trap

`studio.css:638` flips `--stx-slot-h` from 140px to 480px in the compiled state. A grid-stretched
frame spanning 5 rows would be 764px at rest and 2,464px after Compile. A depicted phone that grows
when you compile a board is a lie about the device, so `.stx-frame` is `align-self: start` with an
explicit height computed from `--stx-frame-unit` (the at-rest row height, pinned against
`--stx-slot-h` by group 12). The frame then claims more grid area than it paints in the compiled
state. That is visible whitespace, and it is the honest version — the alternative hides the
inconsistency by making the frame absurd.

Rejected alternative: a per-compile-state span override (`[data-compile-state="rendered"] .stx-frame
{ grid-row-end: span 2 }`). It would make the announcement ("5 rows") false in one of the two states.

### D5 — why `ui.resize` earns a new verb

Two prior tickets recorded "NO BUS VERB, deliberately" (`studio-flow.mjs`, `studio-docs.mjs`), both
because pointer and keyboard converge natively on `click`. Canon therefore requires a new verb to
argue against those refusals rather than be added by analogy with `ui.move`. It has two arguments:

1. **The paths do not converge.** A continuous pointer drag and a stepped keypress are different
   gestures producing the same fact. Without one commit point they would be two implementations
   that happen to agree — which is exactly the shape #205's AC #1 exists to forbid.
2. **Undo needs one commit point.** The AC says resize is undoable, and this canvas has exactly one
   history. A resize that wrote attributes directly would leave `Undo` stepping back over a *move*
   the reader did earlier — worse than no undo.

The bonus is #209's parity for free: an injected `source:"agent"` `ui.resize` resizes identically,
and `framesPass` proves it on a fresh page with no gesture first.

### D6 — frames are outside the selection layer

`studio-select.mjs` (#217) keeps its `.stx-slot`-only scope. Two reasons, and the second is the real
one:

1. **Semantics.** A selection is a set of components you act on together. A device frame is not a
   component of the product being composed; it is an exhibit on the same surface.
2. **Half-widening is a bug factory.** `chosenNodes()` is `.stx-slot[data-stx-selected]` while
   `slots()` becomes `MOVABLE`. If the marquee could *mark* a frame that `chosenNodes()` then never
   *returns*, a group move would silently drop it — a defect with no visible cause. Widening the
   selection layer properly means `marqueeRange` / `idsInRange` / `extendSelection` and every
   `[data-stx-selected]` query moving together, plus `groupOccupancy` learning footprints.

   Note what this ticket **does** widen, so the boundary is drawn in the right place: `groupDelta`
   and `groupStep` become footprint-aware in Task 9, because `preview()` routes *every* gesture
   through `groupDelta` — single-node ones included. So the pure group layer is ready for a frame in
   a selection; what is not done is the selection layer's own DOM half. That is a ticket that asks
   for it, not a line of this one.

   Until then the line is: **a frame moves and resizes on its own**, stated in the module header, in
   `#stx-resize-help`, and asserted by `framesPass` (a marquee over a frame selects nothing).

   **Name `groupOccupancy` in the module header as the remaining piece.** It is the one function in
   that family this ticket does *not* widen, because nothing calls it with a spanning member while
   frames stay out of the selection. The day a later ticket widens the selection layer and forgets
   it, the failure is a group move that lets a frame overlap a peer — silent, and with no gate
   watching. One sentence now is cheaper than that afternoon.

### D7 — the pack path, end to end

| When | What happens | Whose code |
|---|---|---|
| Frame loads | `pack-boot.js` inside the iframe reads the same storage and re-points the frame's own pack line pre-paint | already shipped (#175) |
| Reader swaps the dock mid-visit | `studio-frames.mjs`'s observer copies the **top document's** current pack href into each loaded frame's link | this ticket |
| Reader drops a token export | the canvas column wears it; the frames do **not** (custom properties don't cross documents) | stated, out of scope |

The value copied in step 2 is a href the top document's own allowlist already vetted, so **no second
allowlist is born** — the property the vetting group exists to protect.

### D8 — one gesture object, not two

The resize shares `studio-verbs.mjs`'s single `gesture` variable, distinguished by a `kind` field.
The alternative — a sibling `resizing` state — was rejected on a count: **twelve** handlers key on
`gesture` (six on `stage`, two on `scroll`, the `document` Escape listener, `flushPreview`,
`clearGesture`, and `studio.mjs:484`'s compile-time `verbs.cancel()`), and every one of them would
need a second condition whose failure mode is silent. Mutual exclusion between the two gestures also
comes free: `stage` pointerdown already returns early when a non-sticky gesture is live.

This is #217's move, repeated. That ticket widened the same object with `members` rather than adding
a group-gesture beside it, and recorded the payoff at `:642-651` — "every existing pointer and
keyboard branch reads the same fields it always did, and a single-node gesture behaves
byte-identically". Task 11's eight-row branch table is the equivalent receipt for this ticket: eight
sites change, and the file's other ~40 gesture lines are proven untouched by the fact that they are
not in it.

### Risks

| Risk | Mitigation |
|---|---|
| The grid-shorthand override (`grid-column` resetting the span) ships silently | Task 4's GOTCHA + group 12's span mirror + `framesPass` reads the rendered box |
| Two extra page boots push an INP row over 200 ms | Task 18 measures it explicitly and prints both numbers; a real overrun is a recorded finding, not a hidden one |
| `stepSlot`'s widening changes an existing answer | Group 13 re-drives the existing `STEP_CASES` at 1×1 **before** any new case is added |
| The resize gesture regresses the move gesture (they share one object and twelve handlers) | Task 11's eight-row branch table bounds the edit; `studio-journey.mjs`'s existing move sections are re-run at Task 5 **and** after Task 11, and a break there is a break in code the driver already covers |
| `groupDelta` widened to footprints breaks a group move | Its "blocked" signal is array **identity** (`preview` tests `after === before`); group 13's group cases assert every blocked answer by deep equality with the input — the only assertion a partially-moved set fails |
| A baseline regenerated from a stale tree | Task 1 branches from fresh `main`; Task 20 uses a clean detached worktree and merges `main` first |
| Frames make the compile beat's tripwires fire | Task 14 check 3 exercises Compile with frames present, on a real page |

### Sequencing / parallelism

Phases 1→2→3 are strictly sequential. Phase 4 (page wiring, manifest) can run alongside Phase 3.
Phase 5's gates split: group 12/13/24 (Tasks 15–16) are independent of `framesPass` (Task 17) and
can be written in parallel; **Task 20 is last, always**, and needs everything else merged and clean.

Do not run this ticket concurrently with anything that regenerates factory's baselines. As of this
plan, #215 and #216 (the two chrome tickets) are both merged, so the collision surface is clear —
re-check `gh pr list` before Task 20.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
