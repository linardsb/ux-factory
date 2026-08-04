# Feature: Wave 3 — Factory: dual-register copy + inspect mount + pan/zoom system graph (#173)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and
modules — import from the right files.

## Feature Description

`factory.html` is the site's evidence page: three committed-replay engines behind a segmented
tablist (Traces · Round-trip · Graph) plus a "Go deeper" link block. It is the densest, most
jargon-heavy page on the site and — apart from the tab switcher, the trace player's button row
and the graph's focusable nodes — the least manipulable. Three strands, one page:

1. **Pan/zoom on the system graph** — `system/system-graph.mjs` gains a hand-rolled zoom (SVG
   rendered size against a fixed `viewBox`) inside a bounded, scrollable window: drag to pan,
   ⌘/Ctrl-wheel (and trackpad pinch) to zoom, an explicit in/out/reset button row for the keyboard,
   clamped both ways. The hover/focus-only edge behaviour is preserved exactly.
2. **Inspect mount** — factory joins home, /build and the two protos: a static `inspect.mjs` tag,
   one toggle, and `data-inspect` mounts on the page hero, the buttons, and the trace player's own
   step cards + controls (the exhibit components), plus the header/footer the chrome mounts for
   free.
3. **Dual-register copy cut** — every factory section opens with 1–2 plain sentences; the precise
   term stays immediately alongside, marked with `<dfn data-term>` so `glossary.mjs` explains it in
   place. `glossary.mjs` mounts on its second page ever, and its `TERMS` map gains the factory
   terms that survive the cut.

Plus: three `param-manifest.json` entries and the regen cascade they trigger (param-count →
approach's rendered total → approach baselines), loc-summary, and the two factory baselines.

## User Story

As a hiring manager who has just read the home page's claims
I want the evidence page to explain itself in plain English and let me handle the evidence — drag
the system map around, zoom into it, point at any component and see what it is made of
So that I can verify the work in my own words instead of decoding the author's.

## Problem Statement

- Every factory section leads with a specialist term the reader has not been given: "Claude Agent
  SDK run", "proposed tokens", "design token … components that consume it", "committed artifact",
  "mock API with a fixture fallback". `glossary.mjs` — the site's in-place explanation mechanism —
  exists and runs on exactly one page (approach.html).
- The measured token↔consumer graph is a 940×1406 static image in the page flow. It is the page's
  best "shape of the system" argument and the reader cannot do anything to it beyond hovering a
  node.
- Inspect mode is persisted site-wide but factory carries no engine tag, so a reader who turned
  inspect on elsewhere arrives at the evidence page and finds it dead (the ⌘K palette can still
  toggle it, and the chrome's header/footer mounts respond — nothing else does).

## Solution Statement

Extend the shipped primitives rather than build new ones. The graph gets ~150 lines inside its own
module (no new file): the existing `.sg-scroll` becomes a real bounded scroll container, zoom
writes the SVG's rendered `width`/`height` against the unchanged `viewBox` — so every stroke,
label and edge scales with one property write and no per-element math — and pan is drag-to-scroll
on that container. Native scrolling stays the substrate, which is what keeps 96 focusable nodes
reachable by Tab. Inspect reuses `refreshInspect()` after the async trace render, exactly as
`pattern-render.mjs` does. Copy is cut in place with `<dfn data-term>` marks and new `TERMS`
entries; nothing about the page's structure, IA or honesty framing moves.

## Out of Scope / Non-Goals

- **No View Transition on the `.ev-tab` switch.** A natural candidate; #172 did not take it and
  #173's ACs do not ask for it. Leave the tab controller (factory.html:364-415) alone.
- **No new `ROLES` keys in `gen-inspect-data.mjs`.** Factory's honest ids already exist:
  `page-hero`, `buttons`, `cards`, `header`, `footer`. The `rt-*` (round-trip), `sg-*` (graph),
  `.ev-*` (viewer) and `.row-item` surfaces are page-owned CSS with no `system-graph.json`
  consumer block, so a bubble on them would have no measured token layer — the honesty contract
  forbids faking one. Same rule #169 wrote for home's bespoke surfaces.
- **No `components.css` or `tokens.source.json` change.** The `sg-*` exhibit styles are
  page-owned (factory.html:170-186, "page-owns-exhibit"); the new zoom-control styles go beside
  them. Touching `components.css` would churn `system-graph.json` → `inspect-data.json` → the
  handoff pack, for nothing.
- **No approach.html work** — the derive-probe scrub and the rendered param count are #174's. This
  ticket regenerates `param-count.json` (a manifest change forces it) and therefore regenerates
  approach's two baselines; it changes no approach markup.
- **No new analytics routes.** `/tool/inspect` already fires from `inspect.mjs`. The epic's
  milestone list names palette + inspect only; the graph gets none.
- **No fit-to-width / auto-fit default.** At rest the graph is scale 1, scroll 0,0 — see the
  zero-box finding below.
- **Not changing** `system/inspect.mjs`, `system/trace-player.mjs`, `system/site.js`,
  `prepareGraph()`, or the graph's hover/focus-only edges (a recorded design decision).

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium-High (~800 lines incl. copy, manifest, baselines)
**Primary Systems Affected**: `factory.html`, `system/system-graph.mjs`, `system/glossary.mjs`,
`system/param-manifest.json`, `system/param-count.json` (generated), `system/loc-summary.json`
(generated), VR baselines (factory ×2 + approach ×2)
**Dependencies**: none external. #166 (inspect engine) is MERGED; so are #165, #167, #168, #171,
#172, #175. Branch from `origin/main` ≥ `45be42a`.

## Related Work

**Implements**: linardsb/ux-factory#173 · **Epic**: #164 —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md`
(§New pieces "Graph pan/zoom" row, §Copy: dual register, §Constraints)

**Back-references**:
- `.claude/plans/inspect-engine-166.md` — the engine this mounts; wave tickets "instrument their
  own surfaces".
- `.claude/plans/home-uplift-169.md` — the closest analogue (inspect mount + copy cut on one page).
  Its Out-of-Scope explicitly deferred "mounting `glossary.mjs` on a second page" as *its own
  decision, not smuggled in*. **#173's ticket scope sanctions that decision** ("glossary.mjs
  coverage extended to surviving terms") — this plan takes it deliberately, not by inheritance.
- `.claude/plans/protos-pack-skin-inspect-175.md` — the most recent inspect mount; note its
  `initInspect()`-after-content pattern is the WRONG one here (see Task 6 gotcha).
- `.claude/plans/annotated-source-glossary.md` + `docs/epics/annotated-source-glossary.architecture.md`
  — glossary's governing doc; register rule is "quiet clarification in place, not a glossary
  feature, no pedagogy framing".

**Forward-references**:
- #174 (Wave 3 — Approach) runs in parallel; it also regenerates `param-count.json` and approach's
  baselines. See NOTES → "Collision with #174".
- #177 (epic close) re-audits this page's copy and the final param count.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `factory.html` (whole, 472 lines). Key regions: page-owned `sg-*` styles **170-186**; hero
  **191-206**; evidence beat + tablist **211-231**; the three panels **232-286** (Traces
  **234-245**, Round-trip **248-268**, Graph **271-285**); "Go deeper" **293-340**; script order
  **353-358** and **470**; the tab controller **364-415** (`activate(0,false)` at **385** — this is
  what hides two panels); the trace mount **422-444**; the graph mount **449-469**.
- `system/system-graph.mjs` (whole, 191 lines) — the module being extended. Layout constants
  **19-28** (`WIDTH = 940`; height is computed, currently **1406** for 64 tokens / 10 groups);
  `prepareGraph` **57-75** (PURE, do not touch); `renderSystemGraph` **79-191**; legend **104-106**;
  the `<svg>` with its `viewBox` **107-111**; `wire()` hover/focus pairing **152-157**; the
  `.sg-scroll` wrapper + `container.append` **183-185**; `destroy` **187-190** ("no document-level
  listeners" is a contract — keep it).
- `system/inspect.mjs` — `refreshInspect` module-level export **61**; `wireTriggers` **191-224**
  (an unknown `data-inspect` id throws and aborts the whole activation); the `refreshInspect`
  rationale comment **280-308**.
- `system/pattern-render.mjs` **213-215** (JS-applied `setAttribute("data-inspect", …)` mounts) and
  **294** (`import("./inspect.mjs").then((m) => m.refreshInspect?.()).catch(() => {})`) — the exact
  idiom Task 6 copies.
- `system/site.js` **40-43** + **126** — the header/footer mounts factory gets for free, and the
  comment style for a mount drift-check's static gate cannot see.
- `system/glossary.mjs` (whole, 126 lines) — `TERMS` **35-50**; `initGlossary` **52-57** (validates
  every mark BEFORE touching the DOM and throws on an unknown key); no self-init.
- `approach.html` **224** (import) + **230** (`initGlossary(document)`) — the only existing mount,
  and the pattern for making a bad term fail loudly.
- `system/portfolio.css` **733** (`dfn.term`) + **739** (`.glossary-bubble`) — already loaded by
  factory.html, so the marks need no new CSS.
- `system/components.css` **2510-2511** (`.inspect-toggle-row`, `.inspect-toggle[aria-pressed]`) —
  likewise already loaded.
- `system/param-manifest.json` — counting rules in `$description`; existing `/factory` entries
  **68-71**.
- `tooling/visual-regression/visual.spec.mjs` **44** (factory's `waitReady` triple) and the
  **36-43** comment block explaining that the baseline captures the **Traces tab active, the other
  two panels hidden**.
- `tooling/visual-regression/playwright.config.mjs` — viewport 1280 × content-height, `colorScheme:
  'light'`, `animations: 'disabled'`, `maxDiffPixels: 100`.
- `tooling/drift-check.mjs` **100-117** (`checkInspectMounts` — static, HTML-only) and **148-161**
  (the gate order).
- `tooling/build-journey.mjs` **29-40** — how to resolve Playwright out of
  `tooling/visual-regression/node_modules` without adding a repo dep (the cross-engine script
  copies this).
- `agent-layer/gen-inspect-data.mjs` **26-55** (`ROLES`) — read to confirm the ids exist; **do not
  edit**.

### New Files to Create

None in shipped code. Two throwaway scripts under the session scratchpad (never committed):
- `<scratch>/factory-panzoom-check.mjs` — the three-engine functional pass (Task 11).
- `<scratch>/factory-headless.mjs` — the Worker-absent render check (Task 12, AC #5).

### Relevant Documentation

- [MDN — SVG `viewBox`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox) —
  why writing `width`/`height` against a fixed `viewBox` scales content uniformly. *Why: this is
  the zoom mechanism; no CSS transform, no per-element math.*
- [MDN — Element: setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  — pointer capture for the drag-pan, so a drag that leaves the box still tracks. *Why: avoids
  document-level listeners, which `destroy()`'s contract forbids.*
- [MDN — WheelEvent.deltaY / ctrlKey](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent)
  — a trackpad pinch is delivered as `wheel` with `ctrlKey: true`. *Why: one handler covers pinch
  and ⌘/Ctrl-wheel; plain wheel is left alone so page scrolling never gets trapped.*
- [WCAG 2.4.7 Focus Visible / 2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
  — *Why: the reason pan is drag-to-**scroll** and not a CSS transform (see NOTES → "Why not a CSS
  transform").*

### Patterns to Follow

**Module shape** (`system-graph.mjs` already obeys; keep it): `el()`/`svg()` builders, text via
`textContent`, attributes via `setAttribute`, never `innerHTML`; no injected `<style>`; return
`{ destroy }`; no top-level DOM access (Node-import safe); no `document`/`window` listeners.

**Token-only styling with structural literals allowed** (factory.html:29-31 states the rule):
colour/space/radius/type via `var(--…)`; grid/%/fixed sizes are structural.

**Reduced motion**: nothing here animates. The zoom is an instantaneous size write — deliberately
no CSS transition on `.sg-svg` width/height (it would jank on every wheel tick and would need an
off-ramp for nothing). If you add one anyway, it must sit inside
`@media (prefers-reduced-motion: no-preference)` and rest must equal final.

**JS-applied inspect mounts** (`pattern-render.mjs:213-215`), with a comment saying the id lives in
`gen-inspect-data.mjs`'s `ROLES` and that `drift-check`'s static gate cannot see this mount —
`site.js:40-42` is the house wording.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch and orient
Fresh worktree off `origin/main` (see NOTES → "Shared working tree"), confirm the three ready
handles still fire and capture the pre-change state of the artifacts you will regenerate.

### Phase 2: Graph pan/zoom
**Independent of Phases 3–4.** All inside `system/system-graph.mjs` + factory.html's `sg-*` style
block.

### Phase 3: Inspect mount
**Independent of Phase 2.** factory.html only.

### Phase 4: Copy cut + glossary
**Depends on Phase 2** only for the graph legend line (the legend gains a "drag / ⌘-scroll / use
the buttons" sentence, and its counts are generated — do not hand-write numbers).

### Phase 5: Manifest + regen cascade
**Depends on Phases 2–4** (the manifest describes controls that must exist; loc-summary counts the
staged source).

### Phase 6: Validation, baselines, PR
**Depends on all.** drift-check → functional (3 engines) → headless → VR update → report → PR.

---

## STEP-BY-STEP TASKS

Execute in order. Every task ends in a runnable check.

### 1. CREATE the branch from fresh `origin/main`

- **IMPLEMENT**: `git fetch origin`, then a worktree/branch `feature/factory-uplift-173` off
  `origin/main` (≥ `45be42a`).
- **GOTCHA**: the primary checkout at `/Users/Berzins/Desktop/Linards_current/ux-factory` is shared
  with other sessions — one moved it from a feature branch to `main` mid-planning. Work in your own
  worktree, and re-verify the branch immediately before every commit (memory:
  `shared-worktree-parallel-sessions`).
- **VALIDATE**: `git log --oneline -1` shows the #191 merge or later; `git status -sb` is clean.
- **SATISFIES**: prerequisite.

### 2. VERIFY the starting state (no edits)

- **IMPLEMENT**: `node tooling/drift-check.mjs` on the untouched tree; record
  `system/param-count.json` `total` (**75** at planning) and `system/loc-summary.json` runtime
  `linesApprox` (**19200**) / `files` (**61**).
- **GOTCHA**: if drift-check is already red, stop — you inherited it; fix or rebase before adding
  changes of your own (memory: `drift-check-mid-merge-false-positive`).
- **VALIDATE**: `node tooling/drift-check.mjs` prints its `✓` line.
- **SATISFIES**: AC #6 (no inherited red).

### 3. UPDATE `system/system-graph.mjs` — the zoom/pan state and the scroll window

- **IMPLEMENT**: inside `renderSystemGraph`, after the `<svg>` is built (line ~111) and before
  `container.append` (line ~185):
  - Module-scope constants beside the layout literals (lines 19-28):
    `const MIN_SCALE = 0.6, MAX_SCALE = 2.5, ZOOM_STEP = 1.25;`
  - Keep `root` (the `<svg>`) exactly as it is — **the `viewBox` and the `width`/`height`
    attributes stay**; zoom writes `root.style.width` / `root.style.height` in px
    (`WIDTH * scale` / `height * scale`), which override the attributes and scale strokes, text and
    edges uniformly because the `viewBox` is unchanged.
  - `let scale = 1;` and a `setScale(next, anchorX, anchorY)` that:
    1. clamps `next` to `[MIN_SCALE, MAX_SCALE]` and returns early if unchanged;
    2. reads `scroll.scrollLeft/scrollTop` and, **at call time**, `scroll.clientWidth/clientHeight`;
    3. converts the anchor (default: the box's centre) to content coordinates with the OLD scale,
       writes the new size, then restores the anchor:
       `scroll.scrollLeft = cx * next - anchorX` (same for Y);
    4. updates the readout (`${Math.round(scale * 100)}%`) and the two buttons' `disabled` state at
       the clamps.
- **PATTERN**: `system-graph.mjs:104-111` (builders), `152-157` (listener wiring style).
- **GOTCHA — THE ZERO-BOX TRAP, read this twice**: `#shape` is `hidden` when the graph mounts
  (factory.html:385 runs `activate(0,false)` in a classic script; the graph module is deferred), so
  **every rect in this subtree is 0×0 at mount time** — `clientWidth`, `scrollWidth`,
  `getBoundingClientRect()` all return zero and stay wrong until the reader opens the tab. Two
  rules kill the whole family of bugs: (a) at rest `scale = 1`, `scrollLeft = scrollTop = 0` —
  **no measured fit-to-width default**; (b) every measurement happens inside an event handler
  (`pointerdown`, `wheel`, button click), never at mount. This repo has been bitten by
  zero-box-at-sample-time before (#190, `vt-stack-audit` hazard A).
- **VALIDATE**: `node --check system/system-graph.mjs` and
  `node -e "import('./system/system-graph.mjs').then(m => console.log(Object.keys(m)))"` (must
  print `prepareGraph,renderSystemGraph` — the module stays Node-import safe).
- **SATISFIES**: AC #1.

### 4. ADD the pan, wheel and keyboard paths to `renderSystemGraph`

- **IMPLEMENT**:
  - **Zoom controls** — a `div.sg-zoom` built with `el()`, appended *before* the scroller, holding
    three real `<button type="button" class="btn btn-secondary sg-zoom-btn">` (Zoom out / Zoom in /
    Reset) plus a `<span class="sg-zoom-level">100%</span>` readout. Buttons carry visible text; add
    `aria-label` only where the visible text is a glyph. Reset sets `scale = 1` and
    `scroll.scrollLeft = scroll.scrollTop = 0`.
  - **Pointer pan** on `scroll`: `pointerdown` → ignore unless `e.button === 0`; ignore
    `e.pointerType === "touch"` (native touch scrolling already pans); `scroll.setPointerCapture(e.pointerId)`,
    record `startX/startY/scrollLeft/scrollTop`, add `is-panning` to `scroll`. `pointermove` →
    `scroll.scrollLeft = startLeft - (e.clientX - startX)` (same for Y). `pointerup`/`pointercancel`
    → release capture, remove the class.
  - **Wheel zoom** on `scroll`, registered `{ passive: false }`:
    `if (!(e.ctrlKey || e.metaKey)) return;` then `e.preventDefault()` and
    `setScale(scale * Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top)` where
    `r = scroll.getBoundingClientRect()` is read **inside the handler**.
  - **Keyboard**: the three buttons are the explicit path. Arrow keys already scroll a focused
    scroll container, and Tab moves through the 96 `sg-node` elements, each of which the browser
    scrolls into view natively — say so in a comment, because it is the reason pan is
    drag-to-scroll (see NOTES).
- **PATTERN**: no document/window listeners — everything binds to nodes inside `container`, so the
  existing `destroy()` (line 189) keeps its contract unchanged.
- **GOTCHA**: plain (unmodified) wheel must NOT be intercepted — the graph sits mid-page and
  trapping page scroll is the dark pattern this design avoids. A trackpad pinch arrives as
  `wheel` + `ctrlKey`, so pinch works without extra code.
- **GOTCHA**: while panning, node `mouseenter` would fire and redraw edges under the cursor. The
  `is-panning` class handles it in CSS (Task 5), not in JS.
- **VALIDATE**: `node --check system/system-graph.mjs`; visually in Task 11.
- **SATISFIES**: AC #1.

### 5. UPDATE `factory.html` — the `sg-*` style block (lines 170-186)

- **IMPLEMENT**:
  ```css
  /* the graph is now a bounded window the reader pans and zooms; at rest scale 1, scroll 0,0 */
  .sg-scroll {
    overflow: auto; min-width: 0;
    max-height: min(70vh, 760px);
    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    cursor: grab;
  }
  .sg-scroll.is-panning { cursor: grabbing; }
  .sg-scroll.is-panning .sg-node { pointer-events: none; }
  .sg-svg { display: block; }
  .sg-zoom { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
  .sg-zoom-level { font-family: var(--font-mono); font-size: var(--type-caption); color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  ```
  (Replace the existing `.sg-scroll { overflow-x: auto; min-width: 0; }` rule; keep every other
  `sg-*` rule byte-identical.)
- **GOTCHA**: `min(70vh, …)` is safe here *only* because `#shape` is `hidden` during VR capture,
  where the viewport height equals the whole page height. Do not copy this unit into a
  captured-at-rest surface.
- **VALIDATE**: served page, Graph tab: the SVG sits in a bordered box with a vertical scrollbar;
  page height shrinks; nothing else on the page moves.
- **SATISFIES**: AC #1.

### 6. UPDATE `factory.html` — inspect engine tag, toggle and static mounts

- **IMPLEMENT**:
  - Add `<script type="module" src="/system/inspect.mjs"></script>` to the script block
    (353-358 / 470). Order rule from index.html:416-418: **nothing moves above `dock.mjs`**; put
    the inspect tag after `derivation-roundtrip.mjs`, leaving `palette.mjs` last.
  - Static mounts: `data-inspect="page-hero"` on `<section class="page-hero">` (191);
    `data-inspect="buttons"` on the round-trip panel's `.btn` (266) and both `.hero-cta-row`
    buttons (345-346).
  - The toggle, mirroring index.html:130-131, placed inside `.ev-viewer` directly after the
    `.ev-tablist` so it reads as "inspect this surface" for whichever panel is open:
    `<p class="inspect-toggle-row"><button type="button" class="btn btn-secondary inspect-toggle" data-inspect-toggle aria-pressed="false">Inspect this surface</button></p>`
- **IMPORTS**: none in HTML beyond the script tag.
- **GOTCHA**: `inspect.mjs` self-inits at import and reads the persisted toggle, so a reader
  arriving with inspect on gets header/footer/hero/buttons immediately.
- **VALIDATE**: `node tooling/drift-check.mjs` (its `checkInspectMounts` resolves every literal
  `data-inspect` in tracked HTML against `inspect-data.json`).
- **SATISFIES**: AC #3.

### 7. UPDATE `factory.html` — the trace exhibit's JS-applied mounts + `refreshInspect`

- **IMPLEMENT**: in the trace mount script (422-444), inside the `.then` that calls
  `renderTracePlayer` and before `mount.dataset.trace = "ready"`:
  ```js
  // Inspect mounts on the exhibit's own components. Applied here, not in trace-player.mjs, because
  // that module also drives /roundtrip and /trace.html. The ids live in gen-inspect-data.mjs's
  // ROLES; drift-check's static gate only reads HTML, so it cannot see these (site.js:40-42 rule).
  for (const c of mount.querySelectorAll(".trace-step")) c.setAttribute("data-inspect", "cards");
  for (const b of mount.querySelectorAll(".trace-controls .btn")) b.setAttribute("data-inspect", "buttons");
  import("/system/inspect.mjs").then((m) => m.refreshInspect?.()).catch(() => {});
  ```
- **PATTERN**: `system/pattern-render.mjs:213-215` + `:294`, verbatim idiom.
- **GOTCHA**: use `refreshInspect()`, **never** `initInspect()`. The proto pages call `initInspect()`
  after their content lands because they defer the import and have no live handle to destroy;
  factory imports statically, so `initInspect()` here would tear down and rebuild the handle
  `palette.mjs` holds (the warning at `palette.mjs:118`) and hide an open bubble.
- **GOTCHA**: `.trace-step` cards are `article.card.trace-step` (trace-player.mjs:73,78) and the
  controls are `.btn.btn-secondary/.btn-primary` (134-136) — both really are the `cards` / `buttons`
  consumer blocks, which is what makes the token layer honest. Do not mount on `.ev-tab` (not a
  `.btn`), `.row-item`, or any `rt-*`/`sg-*` node.
- **VALIDATE**: served page → toggle inspect on → hover a trace step: the bubble shows the Cards
  role line, 9 token rows with resolved values, and live measurements. Switch the pack in the dock
  and re-open: the values change.
- **SATISFIES**: AC #3.

### 8. UPDATE `system/glossary.mjs` — the factory terms

- **IMPLEMENT**: add keys to `TERMS` (35-50) for the specialist terms that survive the copy cut.
  Author them in the existing register — plain, one or two sentences, no pedagogy framing, no "in
  other words". Suggested set (adjust to whatever Task 9's copy actually keeps):
  `"handoff-pack"`, `"agent-vocabulary"`, `"agent-trace"`, `"contrast-ratio"`, `"fixture-data"`.
  Reuse the existing `semantic-token`, `token-contract` and `brand-pack` keys wherever those exact
  phrases appear — do not write near-duplicates.
- **GOTCHA**: `initGlossary` throws on an unknown key *before touching the DOM*, so every new
  `data-term` must land in the same commit as its key.
- **VALIDATE**: `node --check system/glossary.mjs`; `node -e "import('./system/glossary.mjs')"`.
- **SATISFIES**: AC #2.

### 9. UPDATE `factory.html` — the dual-register copy cut + `<dfn>` marks + glossary mount

- **IMPLEMENT**: rewrite the first layer of every section so it opens plainly and keeps the precise
  term immediately alongside, marked up as
  `<dfn class="term" data-term="<key>" tabindex="0">term</dfn>` (approach.html:132 is the shape).
  Sites, with the current opener and the intent:
  | Site | Now opens with | Cut to |
  |---|---|---|
  | hero sub (199-204) | "The home page builds a design system in front of you." | fine as-is; gloss the first use of *design tokens* / *contrast pairs* |
  | beat lead (219-222) | "Pick a tab. Each one replays a committed artifact…" | say what a saved recording is before naming it |
  | Traces lead (239-243) | "A real Claude Agent SDK run from building this factory…" | plain sentence first (an AI agent doing real work here, recorded), the SDK's name second |
  | Round-trip lead (258-263) | "The factory can also run in reverse: screenshots in, proposed tokens out." | plain question first (can it work backwards from a picture of a finished screen?), the term after; keep the fictional-scenario notice and the "controlled, favourable case" honesty verbatim |
  | Graph lead (276-280) | "Every design token this site uses, the components that consume it…" | plain map sentence first; `design token` glossed; add the manipulation sentence (drag to move, ⌘/Ctrl-scroll or the buttons to zoom) |
  | Go deeper rows (301-338) | "rendering from the mock API with a fixture fallback"; "spec, docs, and agent vocabulary" | plain descriptions, terms glossed |
  Also mount the glossary — **inside the graph mount module script (449-469), as its first two
  statements, before the fetch**:
  ```js
  import { initGlossary } from "/system/glossary.mjs";
  initGlossary(document);
  ```
- **GOTCHA (deliberate placement)**: putting `initGlossary` in the same module as the graph mount
  means a typo'd `data-term` throws → `#system-graph[data-graph="ready"]` is never set → the VR
  gate hangs and fails **loud**. In its own `<script>` tag it would fail silently and stay green.
  This mirrors approach.html:224-230.
- **GOTCHA**: marks must live in **static HTML only**. A `<dfn>` inside JS-rendered exhibit content
  (the trace player, the round-trip diff) is created after `initGlossary` has wired its triggers and
  would never respond.
- **GOTCHA**: the honesty surfaces are not copy to improve — leave the `capability` chips, the
  `fw-scenario` fictional notice, "Nothing runs live here", and "It is a controlled, favourable
  case" saying exactly what they say.
- **COPY GATE**: run `/no-ai-slop` and `/humanizer` over **every rewritten line** before committing
  (epic rule, restated per wave).
- **VALIDATE**: served page — every section's first sentence is readable by someone who has never
  read the rest of the site; hovering/focusing each `<dfn>` opens its bubble; Esc dismisses; the
  three ready handles still set.
- **SATISFIES**: AC #2.

### 10. UPDATE `system/param-manifest.json` (+3) and regenerate the counts

- **IMPLEMENT**: three `/factory` entries beside the existing four (68-71):
  ```json
  { "page": "/factory", "selector": "#system-graph .sg-zoom button", "label": "system graph zoom controls (in / out / reset = one row)" },
  { "page": "/factory", "selector": "#system-graph .sg-scroll", "label": "system graph pan surface (drag to pan, ⌘/Ctrl-scroll to zoom)" },
  { "page": "/factory", "selector": "[data-inspect-toggle]", "label": "inspect-mode toggle", "note": "added by #173" }
  ```
  Then `node agent-layer/gen-param-count.mjs` (expect `/factory` 4 → 7, total 75 → 78).
- **GOTCHA**: the glossary bubbles are explicitly **excluded** by the manifest's counting rules
  ("glossary hover/focus bubbles (passive reading aids)") — do not add entries for them. The graph's
  focusable nodes are already counted (line 70); do not double-count.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` → no drift.
- **SATISFIES**: AC #6 (manifest), epic metric.

### 11. RUN the three-engine functional pass

- **IMPLEMENT**: `PORT=4757 node tooling/visual-regression/serve.mjs` in one shell; in the scratch
  dir a script resolving Playwright the `build-journey.mjs:29-40` way, looping chromium/firefox/
  webkit over `http://127.0.0.1:4757/factory.html`, asserting:
  1. boot: `.sg-svg` style width is unset or `940px`-equivalent, `scrollLeft === 0`,
     `scrollTop === 0`, readout reads `100%`;
  1b. **the wiring exists** — three `.sg-zoom button` elements are present; at scale 1 the
     zoom-out button is enabled and clicking down to `MIN_SCALE` disables it (and up to `MAX_SCALE`
     disables the other). Step 1 alone is the *default markup state*: it passes identically if
     `setScale` was never wired, if the module threw after building the `<svg>`, or if the control
     row failed to build. With the pixel gate blind to `#shape`, that is exactly the check that
     cannot fail (memory: `check-that-cannot-fail`) — assert behaviour, not markup;
  2. click the Graph tab, then **zoom in** ×2 via the button → readout `156%`, `.sg-svg`
     `clientWidth` grew, `scrollWidth > clientWidth`. (`1.25² = 1.5625 → 156%`. If the code
     multiplies iteratively (`scale *= ZOOM_STEP`) float accumulation can read `157%` — assert
     against what the implementation actually produces, don't hardcode a number the code doesn't
     make);
  3. **reset** → readout `100%`, scroll back to `0,0`, `.sg-svg` bounding box byte-identical to
     the boot measurement (this is AC #1's "restores the at-rest transform exactly");
  4. **pointer pan**: `mouse.down()` → `mouse.move()` → `mouse.up()` over the box moves
     `scrollLeft` and leaves no `is-panning` class behind;
  5. **wheel**: `keyboard.down('Control')` + `mouse.wheel(0, -120)` + `keyboard.up('Control')`
     changes the readout; a plain `mouse.wheel(0, 240)` over the box does **not** change it;
  6. **keyboard**: Tab into the graph reaches an `.sg-node`, and focusing a node far down the list
     scrolls it into view (`scrollTop > 0`) — the reachability property the design exists to keep;
  7. edges: hovering a node still draws `.sg-edge` paths, and at rest there are zero;
  8. `matchMedia('(prefers-reduced-motion: reduce)')` context: every interaction above still
     completes (nothing here is motion-gated, so this is a regression tripwire).
- **GOTCHA**: WebKit's wheel synthesis is the flakiest of the three, and `setPointerCapture`
  semantics differ per engine — if step 4 or 5 fails on exactly one engine, prove it against
  unmodified `main` before calling it a regression (memory: `build-journey-failure-vs-flake`).
- **VALIDATE**: all three engines pass; paste the output into the report.
- **SATISFIES**: AC #1.

### 12. RUN the headless Worker-absent render check

- **IMPLEMENT**: same server, load `/factory.html` with no Worker running, collect console errors,
  assert all three ready handles attach and the page renders.
- **GOTCHA**: `ERR_CONNECTION_REFUSED` to the absent Worker (127.0.0.1:8787) is **expected fixture
  degradation, not a regression** (memory: `headless-render-data-pages-worker-refused`). Record the
  error list in the report so a future reader sees the classification, not a clean-slate claim.
- **VALIDATE**: script prints the handle triple + the classified error list.
- **SATISFIES**: AC #5.

### 13. REGENERATE the artifacts and prove no drift

- **IMPLEMENT**: `git add -A` first, then `node agent-layer/gen-loc-summary.mjs`,
  `node agent-layer/gen-param-count.mjs`, then `node tooling/drift-check.mjs`.
- **GOTCHA**: `gen-loc-summary` counts **git-tracked** content, so running `--check` before staging
  is a false "no drift" (memory: `loc-summary-counts-tracked-only`). `linesApprox` rounds to the
  nearest 100 — this ticket adds ~150 lines to `system/`, so the runtime group may tip 19,200 →
  19,300, which approach.html renders. If it tips, approach's baselines churn for that reason too.
- **GOTCHA**: `system-graph.json` and `inspect-data.json` must come back **unchanged** — neither
  reads `system-graph.mjs`. If either drifts you touched `components.css` or `system/specs/`; back
  that out.
- **VALIDATE**: `node tooling/drift-check.mjs` prints its full `✓` line; `git status` shows exactly
  `loc-summary.json` and `param-count.json` among the generated files; and
  `git status --porcelain -- handoff/` is **empty**. That last one is separate because
  `checkHandoff()` genuinely *writes* under `handoff/` before diffing it, and this task stages with
  `git add -A` — so a stray pack write would be swept into the commit without ever showing up in the
  status line above. This ticket has no reason to touch `handoff/` at all.
- **SATISFIES**: AC #6.

### 14. REGENERATE the VR baselines (declared churn: factory ×2 + approach ×2)

- **IMPLEMENT**: from a **clean detached worktree under /Users** (not `/private/tmp` — Docker file
  sharing), `cd tooling/visual-regression && npm run update:docker`.
- **GOTCHA**: `update:docker` screenshots the **working tree**, so commit or stage everything first
  (memory: `vr-gate-reads-working-tree`).
- **GOTCHA**: approach's two baselines churn because `param-count.json`'s total (75 → 78) is
  rendered at `#param-proof`. `maxDiffPixels: 100` can swallow a few changed digits, and
  `update:docker` will not rewrite a baseline whose diff is sub-threshold — if `git status` shows
  the approach PNGs untouched, `rm` them and re-run to force, and say so in the report (memories:
  `vr-tolerance-hides-text-changes`, `vr-update-skips-subperceptual`).
- **GOTCHA**: an approach failure of the form "two consecutive stable screenshots" is the live
  `countUp` rAF racing `retries: 0`, not a regression — it fails a different pack each run
  (memory: `vr-gate-approach-countup-flake`).
- **GOTCHA (expected zero-churn, state it explicitly)**: everything added inside `#shape` — the
  whole zoom control row and the bounded window — produces **no pixel change**, because the gate
  captures the Traces tab active with the other two panels `hidden` (visual.spec.mjs:36-43). The
  same is true of copy rewritten inside the Round-trip and Graph panel leads. Factory's real churn
  is the hero, the beat head/lead, the Traces panel copy, the new toggle row and "Go deeper".
- **VALIDATE**: gate green; the changed-PNG set is exactly the four declared. Any other page moving
  is a bug — investigate before committing.
- **SATISFIES**: AC #4.

### 15. WRITE the report, update CLAUDE.md, open the PR

- **IMPLEMENT**: `.claude/reports/factory-copy-inspect-panzoom-173-report.md` (three-engine output,
  headless classification, the churn set and why, the zero-box finding). Update CLAUDE.md's
  architecture-map line for `system-graph.mjs` to mention pan/zoom, and `glossary.mjs` to say it now
  mounts on approach **and** factory. Commit plan + report + review in the PR (CLAUDE.md rule). PR
  body carries **`Closes #173`** — a title mentioning `(#173)` closes nothing (memory:
  `prs-dont-auto-close-tickets`).
- **VALIDATE**: `gh pr view --json body | grep "Closes #173"`.
- **SATISFIES**: AC #6.

---

## TESTING STRATEGY

This repo has no test suite; "done" = run the surface you touched (CLAUDE.md).

### Pure / import-level
`node --check` on each edited `.mjs`; `node -e "import(...)"` on `system-graph.mjs` and
`glossary.mjs` to prove they stay Node-import safe (no top-level DOM).

### Generator level
`gen-param-count --check`, `gen-loc-summary --check` (after staging), and the whole
`tooling/drift-check.mjs` — which also re-proves `checkInspectMounts` over the new static
`data-inspect` attributes.

### Functional (the real gate for this ticket)
The three-engine script in Task 11. **This is the only evidence that exists for the graph**: the
pixel gate never sees `#shape`.

### Visual
`update:docker`; the churn set is declared in advance (Task 14) and any deviation is a finding.

### Edge cases to cover explicitly
- Zoom clamped at both ends (buttons disable; wheel cannot exceed the clamps).
- Reset from a panned+zoomed state returns to byte-identical geometry.
- A drag that starts on a node pans and does not leave edges drawn.
- A drag that leaves the box still tracks (pointer capture) and ends cleanly.
- Plain wheel over the box scrolls the box and then chains to the page — never zooms.
- Tab reaches nodes below the fold and the browser scrolls them into view.
- Inspect: hover a trace step, switch pack in the dock, re-open — values changed; Esc dismisses and
  the bubble does not reappear on mouseleave (#166's `dismissedTrigger` behaviour).
- Glossary: every `<dfn>` on the page resolves (a missing key throws and hangs the VR gate — prove
  it by temporarily typo'ing one and seeing `[data-graph="ready"]` never set, then revert).
- No-JS: the page still renders all three panels with the new copy; no dead controls appear (the
  zoom row and the graph are JS-built; the inspect toggle degrades to an inert button, the same
  licence index.html:129-131 takes).

---

## VALIDATION COMMANDS

### Level 1: Syntax
```bash
node --check system/system-graph.mjs
node --check system/glossary.mjs
node -e "import('./system/system-graph.mjs').then(m=>console.log(Object.keys(m)))"
node -e "import('./system/glossary.mjs').then(m=>console.log(Object.keys(m)))"
```

### Level 2: Generators + drift
```bash
node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check
git add -A && node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
```

### Level 3: Functional
```bash
PORT=4757 node tooling/visual-regression/serve.mjs &     # then, in the scratch dir:
node <scratch>/factory-panzoom-check.mjs                 # chromium + firefox + webkit
node <scratch>/factory-headless.mjs                      # AC #5
```

### Level 4: Visual regression
```bash
# clean detached worktree under /Users, everything staged/committed:
cd tooling/visual-regression && npm run update:docker
git status --short tooling/visual-regression/baselines   # expect exactly 4 PNGs
```

### Level 5: Manual read
Serve the repo (`npx serve .`), open `/factory`, and read the page top to bottom as someone who has
never seen the site: does any section open with a term it has not explained? Then turn inspect on
and walk the exhibits; then open the Graph tab and drag, pinch, zoom, reset.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — the graph pans by pointer drag, zooms by ⌘/Ctrl-wheel (and trackpad pinch) and by
      the button row, is clamped at both ends, and **reset restores scale 1 / scroll 0,0 with
      geometry identical to boot**; proven on chromium + firefox + webkit.
- [ ] **AC2** — no factory section opens with an unexplained specialist term; surviving terms carry
      `<dfn data-term>` marks whose keys exist in `glossary.mjs`; every rewritten line has been
      through `/no-ai-slop` + `/humanizer`.
- [ ] **AC3** — inspect bubbles open over factory's exhibit components (trace step cards + the
      player's controls) and the page hero / buttons / chrome, with real resolved token values that
      change with the pack.
- [ ] **AC4** — VR gate green; regenerated baselines are exactly `factory-{neutral,saulera}.png` +
      `approach-{neutral,saulera}.png`, with the approach pair explained by the param total.
- [ ] **AC5** — headless render of `/factory` with the Worker absent succeeds; the
      `ERR_CONNECTION_REFUSED` noise is classified as expected fixture degradation in the report.
- [ ] **AC6** — `param-manifest.json` +3, `param-count.json` and `loc-summary.json` regenerated,
      `drift-check` green, plan + report + review committed in the PR, body carries `Closes #173`.
- [ ] The hover/focus-only edge behaviour, the honesty chips and the fictional-scenario notice are
      unchanged.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validated when written
- [ ] `node tooling/drift-check.mjs` green on the staged tree
- [ ] Three-engine functional pass recorded in the report
- [ ] Headless Worker-absent check recorded and classified
- [ ] VR churn set exactly as declared; gate green
- [ ] Copy skills run on every rewritten line
- [ ] CLAUDE.md architecture-map lines for `system-graph.mjs` + `glossary.mjs` updated
- [ ] Branch verified immediately before each commit (shared working tree)
- [ ] PR from `feature/factory-uplift-173` off fresh `main` with `Closes #173`

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Wheel policy (decided, not asked).** AC #1 says "wheel". This plan reads that as
   ⌘/Ctrl-wheel + trackpad pinch, leaving plain wheel to scroll the box and chain to the page.
   Plain-wheel zoom on a mid-page exhibit traps the reader's scroll; the epic's own non-goals rule
   out that class of behaviour in spirit ("the site must feel whole"), and the visible button row
   makes zoom discoverable without it. If the owner wants plain-wheel zoom, it is a two-line change
   to the handler and one line of legend copy.
2. **`max-height: min(70vh, 760px)`** is a judgement call about how much window the graph deserves.
   It is one CSS value; adjust after seeing it. It cannot affect the VR baseline (panel hidden).
3. **Which terms get glossary keys** depends on which survive Task 9's cut. The five suggested are
   a starting set, not a contract; #177 audits the final state.
4. **Assumption**: `#shape` is `hidden` at VR capture time (verified: `.ev-panel` sets no `display`,
   `activate(0,false)` runs at factory.html:385, and visual.spec.mjs:36-43 says so). If a future
   change makes the Graph tab the default, the churn analysis in Task 14 is void.
5. **Assumption**: no other page or tool imports `system-graph.mjs` (verified — factory.html:450 is
   the only consumer), so its render surface can change without a second baseline.

## NOTES (open canvas)

### Why not a CSS transform (the option this plan rejected)

The obvious "pan/zoom" build is `overflow: hidden` + `transform: translate() scale()` on an inner
layer. It loses on accessibility: the graph has **96 tabbable nodes** (64 tokens + 32 consumers,
each `<g tabindex="0">`), and hover-**or-focus** drawing edges is a recorded design decision. Inside
a clipped, transformed layer there is no scroll container, so tabbing to node #70 moves focus to
something the reader cannot see and the browser has nothing to scroll — a 2.4.7 / 2.4.11 failure
that would have to be bought back with hand-written focus→pan math.

Scaling the SVG's rendered size against its fixed `viewBox` keeps native scrolling as the
substrate, so:

| Property | How it comes for free |
|---|---|
| focus reachability | the browser scrolls a focused node into view in a real scroll container |
| keyboard pan | arrow keys scroll a focused scroll container |
| touch pan | native touch scrolling (hence the `pointerType === "touch"` bail-out) |
| scroll chaining | plain wheel scrolls the box, then the page — no `preventDefault`, no trap |
| uniform scaling | one `viewBox` → strokes, text, and `drawEdge`'s user-space coordinates all scale with a single size write |
| reset == boot | `scale = 1`, `scrollLeft = scrollTop = 0` is trivially identical to today's geometry |

"Restores the at-rest transform exactly" in AC #1 is about the exhibit looking exactly as it did —
not about the mechanism being a CSS transform.

### The pixel gate is blind to this exhibit

`#shape` is `hidden` at capture. Consequences the implementer must internalise:
- the entire zoom control row is **zero pixel churn** — do not go looking for a baseline that moved;
- copy rewritten in the Round-trip and Graph panel leads is also zero churn, yet still in AC #2's
  scope — VR green is not evidence for either;
- the only evidence for the graph is the Task 11 functional pass. Write it thoroughly.

The upside: the risk of this ticket's biggest change is not baseline churn but **silence** — a
broken graph would not turn a single pixel red.

### Zero-box at mount (the trap worth repeating)

The graph renders into a `display:none` subtree. Every rect is 0×0 at mount. Anything derived from
`scrollWidth - clientWidth`, any "fit to width" default, any transform-origin computed at mount is
garbage — and stays garbage after the tab opens, because nothing recomputes it. Hence: at rest
scale 1 / scroll 0,0, and every measurement inside an event handler. (Same family as #190's
`vt-stack-audit` hazard-A false positives, where the sampler discounted elements with no box.)

### Collision with #174

Wave 3 runs #173 and #174 in parallel. Both add `param-manifest.json` entries, both regenerate
`param-count.json`, and both therefore churn **approach's two baselines** — #174 additionally
changes approach's markup. Whichever lands second will hit a merge conflict in
`param-manifest.json` (resolve by keeping both entry sets) and a conflict in `param-count.json`
(resolve by **regenerating**, never hand-editing — memory `drift-check-mid-merge-false-positive`),
and must re-run `update:docker` on the merged tree for approach. Land one, merge `main` into the
other, then regenerate.

### Shared working tree

The primary checkout is shared with other sessions; during planning it was moved from a feature
branch to `main` and fast-forwarded mid-task. Use a separate worktree, and re-verify the branch and
`git status` immediately before every commit (memory `shared-worktree-parallel-sessions`; a
neighbouring session's uncommitted `components.css` edit once produced a phantom `system-graph`
drift, see `.claude/code-reviews/pr-93-review.md:30`).

### Line-count budget (the ticket estimates ~800)

| File | Change |
|---|---|
| `system/system-graph.mjs` | +~150 (zoom state, controls, pointer/wheel handlers, comments) |
| `factory.html` | +~40 CSS, +~15 script, ~60 lines of copy rewritten in place |
| `system/glossary.mjs` | +~12 (five `TERMS` entries) |
| `system/param-manifest.json` | +3 |
| generated | `param-count.json`, `loc-summary.json` |
| baselines | 4 PNGs |

## AMENDMENTS

<!-- append-only; newest at the bottom -->
