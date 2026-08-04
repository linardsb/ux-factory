# Feature: Studio 2 — canvas stage: DOM stage, grid-slot arrangement, pan + zoom (#204)

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

The **canvas substrate** for the Prototype Studio: a DOM stage that pans on a native scroll surface,
zooms through a fixed level table, and holds real token-skinned components in **grid slots** addressed
by `data-col` / `data-row`. It ships as a hand-written vanilla module (`system/studio-canvas.mjs`)
driven by an **off-nav raw harness page** — the `/agentic.html` · `/trace.html` · `/handoff.html`
precedent — so nothing shipped mounts it yet and no visual-regression baseline of a designed page moves.

Everything the studio does later (drag #205, the orchestrator #206, the compile beat #207, the codec's
arrangement field #208, the replay driver #209) sits on this substrate. Its two exported caps
(`MAX_COLS` / `MAX_ROWS`) are the single source the share codec imports at #208.

Task 1 is **spike 2** from the architecture doc: a throwaway proof that pointer-capture drag over ~30
token-skinned components *inside a scaled stage* holds the INP / frame budget cross-engine. Its verdict
and which decision-rule branch it selects are recorded in this ticket's report, and #205 (drag) and
#217 (marquee, guides) **consume that decision** rather than re-deriving it.

## User Story

As a **hiring manager evaluating this portfolio**
I want to **move around a canvas that holds the system's real components — pan it, zoom it, see things
sit in meaningful positions**
So that **the site reads as the prototyping tool it claims to be, instead of another form.**

(At #204 the audience is really the *next five tickets*: this is the substrate, proven on a harness.)

## Problem Statement

The studio needs a 2-D surface, and every 2-D surface decision is load-bearing for five downstream
tickets. Get the substrate wrong — SVG instead of DOM, transform-pan instead of scroll-pan, free pixels
instead of grid slots, view transitions on movement — and the token contract, Tab order, the one-inline-
style-write gate, the share codec and the pixel gate all break at once, several of them *silently*
(#171 shipped a real at-rest regression that the pixel gate re-baselined).

There is also an unproven performance assumption underneath the whole epic: that ~30 real DOM components
inside a scaled stage stay responsive under drag on base-spec hardware, cross-engine.

## Solution Statement

A ~600-line hand-written module plus a surface stylesheet, driven raw by a new off-nav harness page:

- **DOM stage** — placed things are real token-skinned DOM, so the token contract, inspect bubbles and
  focus order keep working by construction.
- **Pan = native scroll.** A real scroll container is the substrate; drag-to-pan sets `scrollLeft` /
  `scrollTop`. Tab order and browser scroll-into-view survive untouched (#173's shipped design).
- **Zoom = a fixed level table selected by a `data-zoom` ATTRIBUTE**, with the scale itself declared in
  CSS. ⌘/Ctrl-wheel (which is also how a trackpad pinch arrives) plus four real buttons — out / in /
  fit / reset — as the keyboard path. **A bare wheel is never intercepted.**
- **Arrangement = `data-col` / `data-row` attributes** against stylesheet rules. No inline style write
  anywhere in the module, which lets it join `build-checks` group 7 with **no exception argued** —
  the total-writes invariant stays literally `=== 1`.
- **Movement animates via transforms/FLIP, never view transitions.** The canvas names nothing for VT.
- `MAX_COLS` / `MAX_ROWS` / `ZOOM_LEVELS` are **exported from the module**; the CSS mirror is pinned by
  a new `build-checks` group (the `pack-boot.js` ↔ `pack-imported.mjs` mirrored-literal precedent).

## Out of Scope / Non-Goals

- **Not included: drag.** Placing and moving components by pointer is **#205**. This ticket exposes a
  programmatic `place(node, {col, row})` and the keyboard/announcement scaffolding it will use; the
  spike's throwaway drag proves the budget, and is thrown away.
- **Not included: marquee, alignment guides, context menu, multi-move** (#217), **undo/redo** (#205),
  **layers list / minimap** (#221).
- **Not included: any mount on a shipped page.** `/factory` becoming the studio is **#206**; that
  ticket owns the route surgery, the nav label call, the `param-manifest` entries for the zoom controls,
  and factory's baseline regeneration.
- **Not included: the share codec's `g` field.** #208 imports `MAX_COLS`/`MAX_ROWS` from here. Until it
  does, the "no second literal" check is a **deliberately vacuous tripwire** planted for the codec — the
  same posture as group 1's `inLibrary: false ⇒ needs` clause.
- **Not changing:** `system/system-graph.mjs`'s shipped pan/zoom (it is a different exhibit with a
  different substrate — SVG width writes against a fixed `viewBox`); `system/morph.mjs`; the VR page set;
  the footer site index; the ⌘K palette command list.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (greenfield 2-D substrate + a cross-engine spike + a new gate group)
**Primary Systems Affected**: `system/` (new module + new surface stylesheet), a new root harness page,
`tooling/build-checks.mjs` (groups 7 + new 12), `tooling/vt-verify.mjs`, new `tooling/studio-journey.mjs`
**Dependencies**: none new. Playwright is resolved out of `tooling/visual-regression/node_modules`, never
a repo dependency.

## Related Work

**Implements**: [#204](https://github.com/linardsb/ux-factory/issues/204) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) → `docs/epics/prototype-studio.architecture.md`

**Back-references**

- `.claude/plans/factory-copy-inspect-panzoom-173.md` — Why: the pan/zoom design this ticket migrates.
  The anchor-preserving zoom math, the `{passive: false}` ⌘/Ctrl-wheel handler, the "plain wheel is never
  trapped" rule and the "measure at call time, never at mount" rule all come from here. **Now tracked**
  (landed via PR #201) — the epic's blocker is cleared.
- `.claude/plans/protos-bus-toggles-device-frame-176.md` — Why: `device-frame.mjs` is the closest live
  sibling — pointer capture, the `(e.buttons & 1) === 0` firefox guard, the `finally`-set VR ready
  handle, and the **module-export driver seam** (`setFrameWidth`) instead of a `window.__` global.
- `.claude/plans/build-vt-morphs-171.md` / `view-transitions-sitewide-172.md` — Why: the reason the canvas
  names nothing for VT, and how `vt-verify` proves a transition count.

**Forward-references**

- (none yet — #205, #206, #208 consume this module's exports and the spike verdict)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/system-graph.mjs` (lines ~230–300, `setScale` + the pointer-pan and wheel handlers) —
  Why: **the exact shipped pan/zoom idiom to mirror.** Anchor math (`cx = (scrollLeft + ax) / scale`),
  `MIN_SCALE`/`MAX_SCALE` clamping, the three visible-text buttons + `aria-live` readout, and the
  `is-panning` class that kills hover work in CSS rather than JS.
- `system/device-frame.mjs` (whole file, 200 lines) — Why: the pointer/keyboard/teardown canon.
  Specifically: `setPointerCapture` in a `try`, the `(e.buttons & 1) === 0` pointermove guard (a real
  firefox bug `proto-journey` caught), `AbortController` + `{ signal }` on every listener, the exported
  driver seam (`setFrameWidth` — line 48), and the **`finally`-set ready handle on every path including
  the early return** (lines 195–199).
- `system/scrub.mjs` (lines 31–96) — Why: the rAF-throttled pointer idiom and the "cancel a pending frame
  on a fresh pointerdown" trap (lines 53–56).
- `tooling/build-checks.mjs` (lines 710–800, group 7) — Why: the invariant this module must join.
  `STYLE_WRITE` regex, `ALLOWED_DIRECT`, `writes === 1`, the `innerHTML`/`outerHTML`/`insertAdjacentHTML`/
  `document.write` sink ban, and (lines 770–800) **the mirrored-literal check idiom** — literals pinned
  *and* proven to be USED, because "pinning a constant is not pinning a behaviour."
- `tooling/build-checks.mjs` (lines 1–46, the header) — Why: the group table you must extend, and the
  two named portal exceptions' reasoning.
- `agentic.html` (lines 1–80) — Why: **the raw-harness precedent.** noindex, own `<style>` for harness
  chrome, three stylesheet links (contract → neutral pack → components), no `site.js`, no chrome, not in
  the footer, not in the ⌘K palette, not in the VR page set.
- `agent-layer/gen-system-graph.mjs` (lines 60–95) — Why: the block scanner. `/* ---------- Name ---------- */`
  headers are mandatory-well-formed, and `if (!used.size) return;` is why a **structural-only** block is
  invisible to the artifact. **Read before touching `components.css` at all.**
- `system/param-manifest.json` (`$description`) — Why: its **scope clause**, which decides that this
  ticket adds no entry (see ASSUMPTIONS).
- `tooling/vt-verify.mjs` (lines 1–60 + the scenario table) — Why: the file you extend with the canvas's
  zero-transition case, and the `addInitScript` wrapper idiom.
- `tooling/proto-journey.mjs` (lines 33–70) — Why: the cross-engine driver skeleton — `createRequire`
  against `tooling/visual-regression`, the `ENGINES` array, per-engine console-error policy.
- `docs/epics/prototype-studio.architecture.md` (§Key decisions → Stack & libraries / Data model;
  §Spikes 2) — Why: every constraint in this plan traces to a decision here. Inherit, do not re-decide.

### New Files to Create

- `system/studio-canvas.mjs` — the canvas engine: pure exports (caps, zoom levels, `clampSlot`,
  `fitLevel`) + `initStudioCanvas()`. Node-import-safe, no self-boot, no top-level DOM. (~450–550 lines
  with headers/comments at this repo's density.)
- `system/studio.css` — the studio **surface stylesheet** (sibling of `portfolio.css` / `proto.css`):
  scroll substrate, sizer, grid stage, slot rules, `data-zoom` scale table, panning cursor, reduced-motion.
  (~120 lines.)
- `studio.html` — the off-nav raw harness at repo root. noindex, own `<style>` for harness chrome only.
  (~150 lines.)
- `tooling/studio-journey.mjs` — the operator-run cross-engine functional driver for the harness
  (pan, the four zoom verbs, the bare-wheel rule, reduced motion, arrangement-by-attribute). The seed
  #213 grows into the full studio journey. (~250 lines.)
- `<scratchpad>/studio-drag-spike.{html,mjs}` — **throwaway**, untracked, never committed (see Task 1).

### Files to Update

- `tooling/build-checks.mjs` — group 7's `MODULES` list gains `studio-canvas.mjs`; a new **group 12
  (canvas)**; the header's group table.
- `tooling/vt-verify.mjs` — one harness scenario asserting zero `::view-transition-*` pseudos *after
  proving movement happened*.
- `tooling/token-lint.mjs` — `checkOrphans`'s `consumers` array gains `"system/studio.css"` (it sits
  beside `portfolio.css` and `proto.css`, which are both listed).
- `system/loc-summary.json` — **regenerated**, never hand-edited.
- `tooling/visual-regression/__screenshots__/approach-*.png` (2 files) — regenerated (see the cascade).

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- [MDN — WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent) → `ctrlKey`
  - Why: a **trackpad pinch is delivered as `wheel` with `ctrlKey: true`** on every engine. One handler
    covers pinch and ⌘/Ctrl-wheel; a plain wheel must fall through so page scrolling is never trapped.
- [MDN — Element.setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  - Why: a drag that leaves the element still tracks. Pair with `pointercancel`, and with the `buttons`
    guard (see `device-frame.mjs` lines 137–152 for the firefox failure this prevents).
- [MDN — CSS `transform` and scrollable overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
  - Why: a scaled child's overflow contributes to the scroll area on the **right/bottom only**, and
    inconsistently across engines. This is why the stage is wrapped in an explicitly-sized **sizer**
    whose dimensions are `calc()`-derived from the same `--stx-scale`, instead of relying on the
    transform to grow the scroller.
- [WAI-ARIA APG — Live regions](https://www.w3.org/WAI/ARIA/apg/practices/live-regions/)
  - Why: every canvas verb announces ("moved to column 2, row 1"; "zoom 150%") — the breadboard's
    discipline extended to 2-D, and a hard requirement of PRD §5 / WCAG 2.5.7.
- [Chrome DevTools Protocol — `Emulation.setCPUThrottlingRate`](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate)
  - Why: the spike's throttling. **Chromium only** — see ASSUMPTIONS.

### Patterns to Follow

**File header** — every feature/entry-point file opens citing its governing doc:

```js
// system/studio-canvas.mjs — hand-written canon (this repo; not generated). The studio's canvas
// substrate (epic #202 — docs/epics/prototype-studio.architecture.md §Key decisions "Stack &
// libraries" / "Data model"; ticket #204; .claude/plans/studio-canvas-stage-204.md).
```

**The `el()` helper** — copied, not imported, in every hand-written canon module
(`device-frame.mjs:33`, `scrub.mjs:104`). Follow suit; do not invent a shared one.

**Driver seam, never a global** (`device-frame.mjs:44-48`):

```js
let live = null; // the mounted canvas — the exported seam drives THIS one, never a new one
export const getCanvas = () => live;
```

**Ready handle in a `finally`** (`device-frame.mjs:195-199`) — every path, including the early return
and any throw, so a gate fails on the missing thing instead of deadlocking to timeout.

**Node-import safety** — no DOM outside a function body, no self-boot. `build-checks` imports the
shipped modules directly; an import that reaches `document` is a bug in the module.

**Errors** — plain `Error`s naming the offending thing. No taxonomy, no wrapping.

---

## IMPLEMENTATION PLAN

### Phase 1: Spike 2 — the responsiveness verdict

**Independent of:** everything below. Its *verdict* gates the design only in the failure branch.

Throwaway harness in the scratchpad. ~30 representative token-skinned components inside a scaled stage,
synthetic pointer drag, measured cross-engine. Chromium runs throttled via CDP; firefox and webkit run
unthrottled (see ASSUMPTIONS). Record the verdict and the branch taken in the report.

### Phase 2: The module and its stylesheet

**Depends on:** Phase 1 only in the failure branch (which would add `content-visibility` / deferred
live work to the module's scope before it is written).

`system/studio-canvas.mjs` + `system/studio.css`. Pure exports first, then the mount.

### Phase 3: The raw harness

**Depends on:** Phase 2.

`studio.html` — off-nav, noindex, real components on the stage, every verb reachable.

### Phase 4: Gates

**Depends on:** Phases 2–3.

`build-checks` groups 7 + 12 · `token-lint` registration · `vt-verify`'s zero-transition case ·
`tooling/studio-journey.mjs` cross-engine.

### Phase 5: The generated cascade

**Depends on:** Phases 2–4 (the file set must be final).

`gen-loc-summary` + approach's two baselines, regenerated on merged `main` from a clean detached
worktree under `/Users`.

---

## STEP-BY-STEP TASKS

### 1. SPIKE (throwaway) — drag responsiveness inside a scaled stage

- **IMPLEMENT**: In the **scratchpad** (`/private/tmp/claude-501/.../scratchpad/`), never the repo:
  - `studio-drag-spike.html` — links `/system/tokens.contract.css`, `/system/tokens.neutral.css`,
    `/system/components.css`; a `transform: scale(1.5)` stage holding **~30 real components** (build
    them with `renderComposition` from `system/agentic-renderer.mjs` against
    `handoff/verdant/vocabulary.json`, exactly as `agentic.html` does — real token-skinned DOM is the
    thing under test, not divs); a crude pointer-capture drag that moves one component and repositions
    the other 29's slot attributes each move.
  - `studio-drag-spike.mjs` — Playwright, `createRequire` against `tooling/visual-regression`, the
    `ENGINES` loop from `proto-journey.mjs:43`. Serve the repo with
    `node tooling/visual-regression/serve.mjs`. Per engine: install a `PerformanceObserver` for
    `'event'` + `'long-animation-frame'` (guard `PerformanceObserver.supportedEntryTypes` — LoAF is
    chromium-only), drive a ~60-step drag with `mouse.move(..., { steps: 60 })`, collect the max
    `event` duration (the INP proxy) and the count of frames over 16.7 ms from a rAF-delta recorder.
  - **Chromium only**: `const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })`.
- **PATTERN**: `tooling/proto-journey.mjs:33-70` (engine loop + Playwright resolution);
  `agentic.html:74-110` (composing real components from the vocabulary).
- **GOTCHA**: `newCDPSession` throws on firefox/webkit. Branch on engine name; do not try/catch it into
  silence — the report must state which runs were throttled.
- **GOTCHA**: the spike is **throwaway**. It never enters `git`, so it never enters `loc-summary` and
  never becomes a maintained surface. Delete or leave in the scratchpad; do not `git add`.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node <scratchpad>/studio-drag-spike.mjs all` — prints per-engine max event duration + long-frame count.
- **DECISION RULE (from the architecture, do not re-derive)** — with the threshold named **now**, so the
  verdict #205 and #217 inherit is a measurement rather than a judgment call under time pressure:
  **holds** = max `event` duration ≤ 200 ms **and** fewer than 5% of frames over 16.7 ms across the drag
  **and** no run of 3+ consecutive long frames. Holds → DOM stage confirmed, proceed.
  Drops → **cut live work during drag** (defer line redraws,
  `content-visibility: auto` on off-screen slots, simplify guides) *before* considering anything heavier
  than DOM.
- **SATISFIES**: AC #1.

### 2. CREATE `system/studio-canvas.mjs` — the pure layer

- **IMPLEMENT**: header per the pattern above, then the exports, **before any DOM code**:
  ```js
  export const MAX_COLS = 12;   // the codec imports these at #208 — the LABEL_MAX pattern
  export const MAX_ROWS = 8;
  // Discrete levels, not a continuous scale: the same argument as grid slots — stepped, announceable,
  // finite tamper surface — and it is what keeps this module's inline-style-write count at ZERO.
  export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2];
  export const ZOOM_REST = 2;   // index of 1.0 — at rest the stage is scale 1, scroll 0,0
  export function clampSlot({ col, row }) { /* → { col, row } ints in 1..MAX */ }
  export function fitLevel(availableW, availableH, contentW, contentH) { /* → index */ }
  ```
  - `clampSlot` coerces with `Math.round(Number(x))`, treats `NaN`/`Infinity`/non-finite as `1`, and
    clamps to `1..MAX_COLS` / `1..MAX_ROWS`. It is the ONE place a slot is validated.
  - `fitLevel` computes `Math.min(availableW / contentW, availableH / contentH)` and returns the index
    of the **largest level ≤ that ratio**, floored at `0` and capped at `ZOOM_LEVELS.length - 1`.
    Snapping DOWN is what lets fit be discrete without ever overflowing the viewport.
  - Both are pure, DOM-free, and exported for `build-checks` group 12.
- **PATTERN**: `system/breadboard.mjs`'s `LABEL_MAX` export; `system/pattern-rules.mjs`'s `SLOT_MAX`.
- **GOTCHA**: guard `contentW`/`contentH` of `0` (the panel may be hidden at call time) — return
  `ZOOM_REST` rather than dividing by zero. This is #173's "measure at call time, never at mount" rule
  in function form.
- **VALIDATE**: `node -e "import('./system/studio-canvas.mjs').then(m=>console.log(m.MAX_COLS, m.fitLevel(400,300,800,600)))"`
- **SATISFIES**: AC #5.

### 3. ADD `initStudioCanvas()` to `system/studio-canvas.mjs` — the mount

- **IMPLEMENT**: `export function initStudioCanvas(root = document)`, wrapped in `try { … } finally { … }`:
  - Find `root.querySelector("[data-studio-canvas]")`; **no viewport is not an error** (the driver
    imports this module for its constants) — early return, and the `finally` still resolves the handle.
  - Build, element by element (never `innerHTML` — group 7 bans the sinks):
    `.stx-scroll` (the native scroll substrate) > `.stx-sizer` > `.stx-stage` (the grid).
  - **Zoom controls**: four real `<button type="button">` with **visible text** — `Zoom out` · `Zoom in` ·
    `Fit` · `Reset` — plus a `<span class="stx-zoom-level" aria-live="polite">100%</span>` readout.
    These buttons ARE the keyboard path (`system-graph.mjs`'s comment says exactly this).
  - **`setZoom(index, anchorX, anchorY)`**: clamp the index; if unchanged, return. Read the content point
    under the anchor with the OLD scale (`cx = (scroll.scrollLeft + ax) / scale`), write
    `viewport.setAttribute("data-zoom", String(index))`, then restore
    `scroll.scrollLeft = cx * next - ax` (same for Y — the browser clamps to the new range). Anchors
    default to the box centre, **measured at call time** via `scroll.clientWidth / 2`.
  - **Wheel** on `.stx-scroll`, registered `{ passive: false }`:
    `if (!e.ctrlKey && !e.metaKey) return;` — **the bare wheel is never touched**, then `e.preventDefault()`
    and step one level per gesture. Accumulate `deltaY` and only step past a threshold (~40), because a
    trackpad pinch delivers many small deltas and one level per raw event makes zoom unusable.
  - **Pointer pan** on `.stx-scroll`: ignore `e.button !== 0` and `e.pointerType === "touch"` (native
    touch scrolling already pans); `setPointerCapture` in a `try`; record `startX/startY/scrollLeft/scrollTop`;
    add `is-panning`. On `pointermove`, bail with `if ((e.buttons & 1) === 0) { end(e); return; }` **before**
    applying the delta — the firefox bug `device-frame.mjs:137-152` documents. `pointerup` + `pointercancel`
    both end it.
  - **`place(node, { col, row })`**: `clampSlot` → `node.setAttribute("data-col"/"data-row", …)` +
    `node.classList.add("stx-slot")` + append to the stage. **Attributes only — never a style write.**
    Announce **placement**, not movement: `${name} in column ${col}, row ${row}`. At #204 nothing has
    moved — `place()` is initial placement, and the mover is #205. "Moved to…" shipped here would be a
    claim the ticket cannot make, and #205 would inherit it rather than add its own verb phrasing.
  - **`fit()`**: measure `scroll.clientWidth/clientHeight` and the stage's unscaled content box at call
    time, `fitLevel(...)`, `setZoom(...)`, and scroll to 0,0.
  - One `AbortController`; every listener takes `{ signal }`. `destroy()` aborts, removes the injected
    chrome, and nulls `live`.
  - `live = handleObj; export const getCanvas = () => live;` — the driver seam.
  - `finally { viewport?.setAttribute("data-studio-canvas", "ready"); }`
- **PATTERN**: `system/system-graph.mjs:236-262` (`setScale` anchor math + the button row);
  `system/device-frame.mjs` (capture, guards, teardown, `finally` handle, driver seam).
- **GOTCHA**: **no self-boot.** No `if (typeof document !== "undefined") init…` at the bottom — the
  harness mounts it explicitly. `build-checks` imports this file in Node.
- **GOTCHA**: at rest the canvas is `data-zoom="2"` (scale 1), `scrollLeft = scrollTop = 0`, and no
  `--stx-scale` written from JS. Nothing runs before the reader acts (`pack-boot.js`'s guaranteed-no-op
  discipline, and the reason a future mount can't race a pixel gate).
- **GOTCHA**: **never write `element.style.*` or `.setProperty()` anywhere in this file.** That is the
  entire reason zoom is a level table. If you find yourself needing a continuous scale, stop and revisit
  — it changes the group 7 story (see NOTES).
- **VALIDATE**: `node -e "import('./system/studio-canvas.mjs')"` exits 0 (Node-import safety), and
  `grep -nE '\.setProperty\(|\.style\.[A-Za-z]' system/studio-canvas.mjs` prints nothing.
- **SATISFIES**: AC #2, #3, #4, #7.

### 4. CREATE `system/studio.css` — the surface stylesheet

- **IMPLEMENT**: a new **surface** sheet beside `portfolio.css` / `proto.css` (header comment citing
  ticket #204). Tokens are fine here — this file is not scanned by `gen-system-graph.mjs`.
  ```css
  .stx-viewport { --stx-cols: 12; --stx-rows: 8; --stx-slot-w: 220px; --stx-slot-h: 140px; --stx-scale: 1; }
  .stx-scroll { overflow: auto; overscroll-behavior: contain; border: 1px solid var(--color-border); }
  .stx-sizer  { width: calc(var(--stx-cols) * var(--stx-slot-w) * var(--stx-scale));
                height: calc(var(--stx-rows) * var(--stx-slot-h) * var(--stx-scale)); }
  .stx-stage  { display: grid; transform: scale(var(--stx-scale)); transform-origin: 0 0;
                grid-template-columns: repeat(var(--stx-cols), var(--stx-slot-w));
                grid-auto-rows: var(--stx-slot-h); gap: var(--spacing-md); }
  .stx-viewport[data-zoom="0"] { --stx-scale: 0.5; }   /* … one rule per ZOOM_LEVELS entry … */
  .stx-slot[data-col="1"] { grid-column: 1; }          /* … 1..MAX_COLS … */
  .stx-slot[data-row="1"] { grid-row: 1; }             /* … 1..MAX_ROWS … */
  .stx-scroll.is-panning { cursor: grabbing; }
  .stx-scroll.is-panning .stx-slot { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .stx-stage, .stx-slot { transition: none !important; } }
  ```
- **PATTERN**: `system/proto.css` (surface sheet that owns the classes a `system/` module drives);
  `system-graph.mjs`'s `is-panning` rule — hover work is killed in **CSS, not JS**, while panning.
- **GOTCHA — the sizer is not optional.** A scaled child's overflow contributes to the scroll area
  inconsistently across engines. The explicitly-`calc()`-sized sizer is what makes pan-by-scroll work on
  all three. Verify in Task 9 on webkit specifically.
- **GOTCHA — DO NOT put these rules in `system/components.css`.** Empirically verified while planning:
  a block there that references **any** contract token becomes a `system-graph.json` consumer, which
  moves factory's rendered graph and churns its two baselines
  (`node agent-layer/gen-system-graph.mjs --check` → drift). A structural-only block does not — but
  every rule above legitimately wants tokens, and "a literal in `components.css` is a bug" (token
  discipline). A surface sheet resolves both. See NOTES.
- **GOTCHA**: no `view-transition-name` anywhere in this file, and no `transition` on `--stx-scale` —
  a transitioned scale would jank every wheel tick.
- **VALIDATE**: `node tooling/token-lint.mjs` (after Task 7) and
  `node agent-layer/gen-system-graph.mjs --check` → **no drift**.
- **SATISFIES**: AC #4, #6, #7.

### 5. CREATE `studio.html` — the off-nav raw harness

- **IMPLEMENT**: MIRROR `agentic.html` exactly in posture:
  - `<meta name="robots" content="noindex" />`, a header comment naming ticket #204 and saying **this is
    the workbench; the designed surface is `/factory` (#206)**.
  - Stylesheets: `/system/tokens.contract.css` → `/system/tokens.neutral.css` → `/system/components.css`
    → `/system/studio.css`. Harness chrome (wrap, headings, lede) in the page's own `<style>`.
  - **No `site.js`, no chrome, no `pack-boot.js`, no dock, no palette.** Not added to
    `client.neutral.config.js`'s footer index, not added to `system/palette.mjs`'s page list, not added
    to the VR page set — verified precedent: `agentic.html`, `trace.html`, `handoff.html` appear in none
    of them.
  - A module script that fetches `handoff/verdant/vocabulary.json`, composes ~30 real components through
    `renderComposition`, calls `initStudioCanvas()`, and `place()`s them across the grid. Real
    token-skinned DOM is the claim being demonstrated.
  - A visible caption stating what is live: pan by drag or scroll, ⌘/Ctrl-wheel or the buttons to zoom,
    Tab reaches every component.
- **PATTERN**: `agentic.html:1-80` (head + harness chrome), `agentic.html`'s vocabulary fetch + render.
- **GOTCHA**: a new root `.html` joins `gen-loc-summary`'s **pages** group — Task 11 regenerates it.
- **VALIDATE**: `npx serve .` → `/studio.html` renders components on a stage; Tab reaches each one and
  the browser scrolls it into view; the four zoom buttons work; a bare wheel over the stage scrolls the
  page; ⌘/Ctrl-wheel zooms.
- **SATISFIES**: AC #2, #3.

### 6. UPDATE `tooling/build-checks.mjs` — group 7 gains the module

- **IMPLEMENT**: add `"studio-canvas.mjs"` to group 7's `MODULES` array (line ~721) and update the
  surrounding comment: the list is "/build's modules **plus the studio canvas**", both held to the same
  one-application-point invariant. **No `ALLOWED_*` exception is added** — the canvas writes zero inline
  styles, so `writes === 1` stays literally true and the `file === "build-import.mjs"` assertion is never
  reached for it. Update the header's group-7 line to say so.
- **PATTERN**: `tooling/build-checks.mjs:721-764`.
- **GOTCHA**: the `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` sink ban applies to
  the new module too — build every node element by element.
- **GOTCHA (mutation test — the check must be able to fail)**: temporarily add
  `stage.style.transform = "scale(2)"` to `studio-canvas.mjs`, run the gate, watch group 7 go **red**
  with `studio-canvas.mjs writes an inline style`, then revert. Record it in the report.
- **VALIDATE**: `node tooling/build-checks.mjs` → group 7 ✓
- **SATISFIES**: AC #4.

### 7. ADD `build-checks` group 12 — the canvas group

- **IMPLEMENT**: a new group after group 11, one `✓` line, following the existing `{ … }` block style.
  Import `MAX_COLS, MAX_ROWS, ZOOM_LEVELS, ZOOM_REST, clampSlot, fitLevel` from
  `../system/studio-canvas.mjs`. Four concerns:
  1. **The CSS mirror is exact.** Read `system/studio.css` and assert: `--stx-cols` equals `MAX_COLS`;
     `--stx-rows` equals `MAX_ROWS`; and the `[data-col="n"]` rules mirror the cap **in both
     directions** — every `n` in `1..MAX_COLS` present, **no `n` present twice**, and no `n` outside the
     range (assert all three; "the count equals `MAX_COLS`" alone passes for a set with a duplicate and
     a gap). Same for rows. And each `[data-zoom="i"]` rule declares
     `--stx-scale` **equal to `ZOOM_LEVELS[i]`**, for every index, with no extra rule. This is the
     `pack-boot.js` ↔ `pack-imported.mjs` mirrored-literal precedent (lines 770–800) — say so in the
     comment, including that the mirror exists because CSS cannot import.
  2. **`clampSlot` behaviour**: `{col: 0}` → 1; `{col: MAX_COLS + 5}` → `MAX_COLS`; `{row: -3}` → 1;
     `{col: 2.7}` → 3; `{col: "4"}` → 4; `{col: NaN}` / `{col: Infinity}` / `{col: undefined}` → 1.
  3. **`fitLevel` behaviour**: an exact level ratio returns that level's index; a ratio *between* levels
     snaps **down**; a ratio below the smallest returns `0`; above the largest returns the last index;
     a zero content dimension returns `ZOOM_REST`.
  4. **The vacuous tripwire, stated**: assert `MAX_COLS`/`MAX_ROWS` are exported and finite, with a
     comment saying the "no second literal" claim has **no second importer until #208** — the codec is
     what will import them, and this assertion is planted for that day. The same deliberate posture as
     group 1's `inLibrary: false ⇒ needs` clause.
  Add group 12 to the header's group table.
- **PATTERN**: `tooling/build-checks.mjs:770-800` (mirrored literals, checked three ways because pinning
  a constant is not pinning a behaviour); group 11's synthetic-input style.
- **GOTCHA**: parse the CSS with explicit regexes and **fail loudly on zero matches** — a mirror check
  that finds no rules and passes is exactly the `check-that-cannot-fail` defect this repo has already
  paid for twice.
- **GOTCHA (mutation test)**: change one `data-zoom` scale in `studio.css` (e.g. `1.5` → `1.6`), run the
  gate, watch group 12 go **red**; delete one `[data-col="7"]` rule, watch it go red for a different
  reason. Revert both. Record in the report.
- **VALIDATE**: `node tooling/build-checks.mjs` → 12 groups ✓, exit 0.
- **SATISFIES**: AC #4, #5.

### 8. UPDATE `tooling/vt-verify.mjs` — the canvas names nothing

- **IMPLEMENT**: a `studio` scenario against `/studio.html`:
  - **boot opens zero transitions** (the `startViewTransition` wrapper count is 0).
  - **movement is proven first, then the absence is asserted** — this is the whole point. Record a
    component's `getBoundingClientRect()` and the viewport's `data-zoom`, perform a zoom-in and a
    `place()` move, assert **the geometry/attribute actually changed**, and only then assert
    `document.getAnimations()` contains **zero** entries whose `effect.pseudoElement` starts with
    `::view-transition` and that the wrapper count is still 0.
  - **reduced motion** (`page.emulateMedia({ reducedMotion: 'reduce' })`): the same verbs **complete**
    (assert the end state) and still open zero transitions.
- **PATTERN**: `tooling/vt-verify.mjs`'s `addInitScript` wrapper + per-engine loop.
- **GOTCHA**: "zero `::view-transition-*` pseudos" is **trivially true if nothing moved**. Without the
  movement precondition this check cannot fail — the exact defect class `.claude/plans` and
  `check-that-cannot-fail` memory both name. The precondition is not optional.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then `node tooling/vt-verify.mjs all` →
  every engine green, including the existing scenarios.
- **SATISFIES**: AC #6, #7.

### 9. CREATE `tooling/studio-journey.mjs` — the cross-engine functional driver

- **IMPLEMENT**: MIRROR `tooling/proto-journey.mjs`'s skeleton (Playwright via `createRequire` against
  `tooling/visual-regression`, `ENGINES`, `[engine|all]` argv, no-page-errors policy). Against
  `/studio.html`, per engine:
  - **at rest**: `data-zoom` is `ZOOM_REST`, `scrollLeft === scrollTop === 0`, readout `100%`, and **no
    inline `style` attribute** on the stage or any slot (the attribute-not-style claim, asserted on the
    running page rather than by grep).
  - **zoom in ×2 → readout tracks `ZOOM_LEVELS`; out ×2 → back to 100%**; at the ends the buttons
    `disabled`; **fit** picks a level whose scaled content **actually fits** — compare the stage's
    measured scaled box against the measured viewport, not merely "a level was picked". This is the only
    check that catches `--stx-slot-w`/`--stx-slot-h` drifting away from what `fitLevel` assumes: those
    two live in CSS alone and group 12 cannot mirror them, because whether they fit is a layout fact.
    **reset** returns to `ZOOM_REST` and scroll 0,0.
  - **the bare-wheel rule**: a plain `mouse.wheel(0, 240)` over the stage **does not** change `data-zoom`;
    `keyboard.down('Control')` + wheel **does**. (The dark pattern this design exists to avoid.)
  - **pan**: `mouse.down/move/up` moves `scrollLeft` and leaves **no `is-panning` class behind**.
  - **keyboard reachability**: Tab reaches a component in the far column and the browser scrolls it into
    view (`scrollLeft > 0`) — the property pan-by-scroll exists to preserve.
  - **arrangement**: after a `place()` through the exported `getCanvas()` seam, the node carries the
    expected `data-col`/`data-row` **and the live region announced it**.
  - **reduced motion**: every verb above still completes.
  - Import `ZOOM_LEVELS`/`MAX_COLS` from the module rather than retyping them (the
    `device-frame.mjs` ↔ `proto-journey.mjs` constant-sharing rule).
- **PATTERN**: `tooling/proto-journey.mjs` — including its "three sources, same resulting DOM" phrasing
  discipline: assert **resulting DOM**, never "an event fired".
- **GOTCHA**: drive the canvas through `getCanvas()`, **never a `window.__` global** — page globals are
  not this repo's test surface (`device-frame.mjs:46`).
- **GOTCHA**: `tooling/` is in none of `gen-loc-summary`'s three groups, so this file churns nothing.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs all`
  → chromium, firefox, webkit all green.
- **SATISFIES**: AC #2, #3, #4, #7.

### 10. UPDATE `tooling/token-lint.mjs` — register the new surface sheet

- **IMPLEMENT**: add `"system/studio.css"` to `checkOrphans`'s `consumers` array, beside
  `"system/portfolio.css"` and `"system/proto.css"`.
- **PATTERN**: `tooling/token-lint.mjs:70-79`.
- **GOTCHA**: this is the ORPHAN (generous) list, not the UNDECLARED (strict, `components.css`-only)
  one. Do not add `studio.css` to `checkUndeclared`.
- **VALIDATE**: `node tooling/token-lint.mjs` → 0 undeclared · 0 orphan.
- **SATISFIES**: AC (no regressions).

### 11. REGENERATE the cascade

- **IMPLEMENT**: on a tree that has **merged current `origin/main`**:
  - `node agent-layer/gen-loc-summary.mjs` — `system/studio-canvas.mjs` and `system/studio.css` join the
    **runtime** group (65+ files, likely tipping `linesApprox` past 20,400 → 21,000); `studio.html` joins
    the **pages** group.
  - `node tooling/drift-check.mjs` — everything else must report **no drift**, in particular
    `system-graph` and `param-count`.
  - Regenerate **approach's two baselines only** (`approach-neutral`, `approach-saulera`) — approach
    renders the runtime group's numbers: `cd tooling/visual-regression && npm run update:docker`, run
    **from a clean detached worktree under `/Users`** (the gate screenshots the dirty tree, and Docker
    cannot share `/private/tmp`).
- **PATTERN**: PR #224's own `chore(vr): regen approach baselines on the merged tree` commit.
- **GOTCHA**: `gen-loc-summary` reads **git-tracked content** (`git ls-files` + `git show :<file>`), so
  running it before staging reports a false "no drift". Stage the new files first.
- **GOTCHA — baseline collision**: #211 is the other wave-1 ticket that adds tracked source files. If it
  lands first, **merge `main` and re-run `update:docker` before review** — two PRs regenerating the same
  PNGs from different trees silently re-baseline each other's regressions.
- **GOTCHA**: `update:docker` will not rewrite a baseline whose only change is sub-perceptual; if the
  digits changed but the PNG did not, `rm` the PNG and re-run.
- **VALIDATE**: `node tooling/drift-check.mjs` exits 0; `git status` shows exactly the expected
  regenerated files.
- **SATISFIES**: repo invariants (the epic's cascade preamble).

### 12. Write the plan/report/review artifacts and open the PR

- **IMPLEMENT**: `.claude/reports/` entry recording **spike 2's verdict, the numbers per engine, which
  throttling each run had, and which decision-rule branch was taken** — #205 and #217 consume this. Post
  the verdict to epic #202 as a comment (the #203 precedent). PR body carries **`Closes #204`**.
- **GOTCHA**: a PR *title* mentioning `(#204)` closes nothing.
- **VALIDATE**: `gh pr view --json body | grep "Closes #204"`.
- **SATISFIES**: AC #1, repo conventions.

---

## TESTING STRATEGY

This repo has no test suite, no linter, no type-check — "done" means **running the surface you touched**
plus the committed gates. Do not hunt for or invent a framework.

### Committed gates (CI-run)

- `node tooling/build-checks.mjs` — group 7 (the module writes zero inline styles) and the new group 12
  (the CSS mirror, `clampSlot`, `fitLevel`, the codec tripwire). **Pure, no browser, runs in CI.**
- `node tooling/token-lint.mjs`, `node tooling/drift-check.mjs` — the generated-artifact contract.

### Operator-run drivers (cross-engine, not in CI)

- `node tooling/studio-journey.mjs all` — the functional claims a pixel gate structurally cannot make
  (a gate that never interacts cannot tell a live control from a dead one).
- `node tooling/vt-verify.mjs all` — the zero-view-transition claim, with the movement precondition.

### Edge cases that must be covered

- A slot index of `0`, `MAX + 5`, `-3`, `2.7`, `"4"`, `NaN`, `Infinity`, `undefined` (group 12).
- `fitLevel` with a ratio between levels (snaps down), below the smallest, above the largest, and with a
  **zero content dimension** (a hidden panel at call time — #173's mount-time-measurement trap).
- A `pointermove` arriving with **no primary button** mid-drag (the firefox bug `device-frame.mjs`
  documents) — the pan must end, not jump.
- A plain wheel over the stage — the page scrolls, `data-zoom` does not move.
- Reduced motion — every verb still completes.
- Tab to a component in the far column — the browser scrolls it into view.
- A page with **no** `[data-studio-canvas]` — early return, ready handle still set.

---

## VALIDATION COMMANDS

Execute every command; zero regressions is the bar.

### Level 1: Syntax & Node-import safety

```bash
node --check system/studio-canvas.mjs                # parse
node -e "import('./system/studio-canvas.mjs')"       # no top-level DOM, no self-boot
grep -nE '\.setProperty\(|\.style\.[A-Za-z]' system/studio-canvas.mjs   # must print NOTHING
grep -n 'view-transition' system/studio-canvas.mjs system/studio.css     # must print NOTHING
```

### Level 2: Committed gates

```bash
node tooling/build-checks.mjs      # 12 groups ✓ (7 and 12 are the ones this ticket moves)
node tooling/token-lint.mjs
# A1 REGRESSION TRIPWIRE, not a test of this ticket's code. Under A1 nothing touches
# components.css, so this cannot drift — which is the point: if it EVER reports drift, someone
# moved the stage rules into components.css. Read A1 before regenerating anything.
node agent-layer/gen-system-graph.mjs --check
node tooling/drift-check.mjs
```

### Level 3: Cross-engine drivers

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
```

### Level 4: Manual validation

```bash
npx serve .   # then open /studio.html
```
- ~30 real components sit on the stage, token-skinned, under the neutral pack.
- Drag the background → the view pans; release outside the window → the pan ends cleanly.
- ⌘/Ctrl-wheel (and a trackpad pinch) zooms; **a bare wheel scrolls the page**.
- Zoom out / in / fit / reset all work by mouse and by keyboard; the readout announces.
- Tab through the components — each scrolls into view; focus is never hidden behind an edge.
- Inspect a placed component in devtools: `data-col` / `data-row` present, **`style` attribute absent**.

### Level 5: Mutation validation (the check must be able to fail)

```bash
# 1. add `stage.style.transform = "scale(2)"` to studio-canvas.mjs → group 7 must go RED. Revert.
# 2. change one [data-zoom] --stx-scale in studio.css      → group 12 must go RED. Revert.
# 3. delete one [data-col="7"] rule from studio.css        → group 12 must go RED. Revert.
node tooling/build-checks.mjs
```

---

## ACCEPTANCE CRITERIA

Mapped 1:1 to the ticket.

- [ ] **AC1** Spike 2 run cross-engine with throttling; verdict + which decision-rule branch recorded in
      the report (and posted to epic #202). *Throttling is chromium-only — stated, not implied.*
- [ ] **AC2** A raw harness page drives the module: a stage holding real components, pan by scroll,
      zoom in/out/fit.
- [ ] **AC3** Zoom is ⌘/Ctrl-wheel only (a bare wheel scrolls the page, never zooms), and every zoom verb
      has a button with a keyboard path — asserted in `studio-journey.mjs`.
- [ ] **AC4** Arrangement writes `data-col`/`data-row`, never an inline style;
      `node tooling/build-checks.mjs` group 7 stays green **with `studio-canvas.mjs` in its module list**,
      and the mutation test proves it can go red.
- [ ] **AC5** `MAX_COLS`/`MAX_ROWS` exported; no second literal anywhere — the CSS mirror is pinned by
      group 12, and the absence of a second *importer* until #208 is stated deliberately.
- [ ] **AC6** `document.getAnimations()` shows **zero** `::view-transition-*` pseudos for any canvas
      movement — asserted **after proving the movement happened**.
- [ ] **AC7** Reduced motion: movement is instant, every verb still completes.
- [ ] No baseline churn beyond approach's two (loc-summary cascade); `gen-system-graph --check` clean.
- [ ] `drift-check` clean; `token-lint` clean.
- [ ] PR body carries `Closes #204`; plan + report + review live in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation passed immediately
- [ ] All validation commands executed successfully, including **Level 5 mutation validation**
- [ ] `build-checks` (12 groups), `token-lint`, `drift-check` all green
- [ ] `studio-journey.mjs all` and `vt-verify.mjs all` green on chromium + firefox + webkit
- [ ] Spike verdict recorded in the report and posted to epic #202
- [ ] `loc-summary` regenerated on the merged tree; approach's two baselines regenerated from a clean
      detached worktree under `/Users`
- [ ] Manual pass on `/studio.html` in a real browser (the VR gate's Chromium has missed real Safari
      layout blowouts before)
- [ ] Throwaway spike files left in the scratchpad, **never** `git add`ed
- [ ] PR opened with `Closes #204`

---

## OPEN QUESTIONS / ASSUMPTIONS

**A1 — The stage CSS goes in `system/studio.css`, not `system/components.css`.** The ticket's
*Files touched (estimate)* line names `components.css`; no AC does. Verified empirically while planning:

```
# a block referencing any contract token:
node agent-layer/gen-system-graph.mjs --check   →  ✗ drift: system/system-graph.json
# a structural-only block (no var(--token)):
node agent-layer/gen-system-graph.mjs --check   →  ✓ no drift
```

A `components.css` block that uses tokens becomes a graph consumer → factory's rendered graph moves →
**factory's two baselines churn**, contradicting the ticket's own stated invariant ("Raw harness ⇒ no VR
page, no baseline churn"). A structural-only block avoids that but would force literal pixel values into
`components.css`, where "a literal is a bug" (token discipline). A **surface stylesheet** — the
`portfolio.css` / `proto.css` pattern — satisfies both. The ticket's stated rationale for `components.css`
("chrome that must reach a proto/frame") is **#219's** concern, not this ticket's; #206 mounts the studio
on `/factory` and regenerates factory's baselines anyway, so any later move is free there.
**Object now if you want the components.css placement regardless — it changes the file list and adds two
baselines to this PR.**

**A2 — No `param-manifest.json` entry this ticket.** The manifest's own `$description` scopes itself to
"the 10 VR-gated shipped pages + `chrome`" and explicitly excludes noindex pages outside the VR 10
(`agentic-ui-study.html`, `handoff.html`, `instance.html`). A raw harness is exactly that. The zoom
controls get their entries in **#206**, when they land on `/factory`. This is stated because the manifest
says "an omission is a review-catchable gap" — an unexplained absence would read as the gap rather than
the rule. **Note this in the PR body so the reviewer doesn't re-derive it.**

**A3 — CDP throttling is chromium-only, so AC1 is not literally satisfiable as written.**
`Emulation.setCPUThrottlingRate` requires `context.newCDPSession(page)`, which firefox and webkit do not
provide. The plan: **throttled** INP + frame budget on chromium; **unthrottled** on firefox and webkit,
which still catches per-engine layout/compositing pathologies. The report states the split explicitly
rather than implying three throttled runs.

**A4 — Discrete zoom levels, not a continuous scale.** This is what makes the module's inline-style-write
count **zero**, which is what lets it join group 7 with no exception argued. The cost: `fit` snaps to the
nearest level **at or below** the computed ratio rather than fitting exactly. Judged correct — it is the
same argument as grid slots (stepped, announceable, finite tamper surface). If a later ticket genuinely
needs a continuous scale, the honest move is one named allowlist entry in group 7 mirroring
`ALLOWED_DIRECT`, with the prose explaining it is a clamped number and never a visitor string.

**A5 — The harness stays off the footer, the palette and the VR set.** Verified: `agentic.html`,
`trace.html` and `handoff.html` appear in none of `client.neutral.config.js`'s footer index,
`system/palette.mjs`'s page list, or `visual.spec.mjs`'s `PAGES`. The epic's "any new page joins the
footer site index" rule is about *shipped* pages; a raw harness is the standing exception.

**A6 — Branch off fresh `origin/main`.** #203 merged as PR #224 on 2026-08-04; the local branch still
carries its commits. `git fetch origin && git checkout -b feature/studio-canvas-stage-204 origin/main`.

**Open — does the module need a live region of its own, or does it borrow the harness's?** Planned as
*its own*, injected by `initStudioCanvas` (a control with no announcement behind it is worse than no
control). #206 may want to hoist it to the orchestrator; that is a #206 call, not a blocker here.

---

## NOTES (open canvas)

### Why pan is scroll and not a transform

`transform: translate()` on the stage would be simpler to write and would break three things at once:
Tab order's scroll-into-view (the browser cannot scroll a translated element into view), the scrollbar
as an affordance, and the touch story. #173 made this call for the system graph and the architecture doc
inherits it verbatim for the canvas. The cost is the **sizer** — an explicitly `calc()`-sized wrapper —
because a scaled child's contribution to scrollable overflow is unreliable cross-engine. That is a
15-line CSS cost for a property (keyboard reachability) that is a WCAG requirement, not a nicety.

### Why zoom is an attribute

Three consequences fall out of `data-zoom` + a CSS level table, and only the first was the goal:

1. Zero inline style writes → group 7 joins with **no exception argued**, and `writes === 1` stays
   literally true. Every exception is a sentence a future reader has to trust; zero is better.
2. The scale is *declarative*, so a reduced-motion or print or container-query override can restyle it
   without JS ever knowing.
3. The level table is finite and enumerable, so group 12 can pin the CSS mirror **exhaustively** rather
   than sampling it.

The cost is A4's snapping fit. Recorded as a trade, not an oversight.

### The baseline arithmetic for this PR

| Artifact | Moves? | Why |
|---|---|---|
| `system/loc-summary.json` | **yes** | 2 new `system/` files (runtime) + 1 new root `.html` (pages) |
| `approach-neutral` / `approach-saulera` baselines | **yes** | approach renders the runtime group's numbers |
| `system/system-graph.json` | **no** | `components.css` untouched (A1) — verified by probe |
| `system/inspect-data.json` | **no** | derived from the graph, which does not move |
| `system/param-count.json` | **no** | the harness is out of the manifest's scope (A2) |
| factory / build / proto / index baselines | **no** | no shipped page changes |

Two baselines, not six. That is the whole reason A1 and A2 were worth settling before writing code.

### Rejected alternatives

- **`<canvas>` or SVG stage** — rejected by the architecture doc, and rightly: it would cost the token
  contract, inspect bubbles and focus order, all of which currently work *by construction*.
- **A library (interact.js, panzoom)** — runtime deps are a standing hard no, and "a prototype-tool
  surface in vanilla JS" is itself pitch material (PRD).
- **Free-pixel positions** — rejected by the PRD's grammar rule. Grid slots are announceable ("column 2,
  row 1"), have a finite tamper surface for the codec, and keep the one-inline-style-write gate green.
- **Naming canvas elements for view transitions** — explicitly deferred behind #190 and a studio
  state-matrix `vt-stack-audit` pass. #171 shipped a real at-rest regression exactly this way, and the
  pixel gate *re-baselined it*.
- **Putting the functional assertions in the spike script** — rejected: the spike is throwaway, and an
  AC that only a deleted file ever proved is not proven. Hence `tooling/studio-journey.mjs`, which #213
  grows rather than replaces.

### What #205 inherits from this ticket

`place()`, `clampSlot`, the live region, the `is-panning` CSS discipline, the `AbortController` teardown,
the `getCanvas()` driver seam, `tooling/studio-journey.mjs` as its assertion home — and **spike 2's
verdict**, which it must not re-derive.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
