# Feature: Inspector docs — the second mount of the generated catalog (#218)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to the naming of existing utils, types and modules. Import from the right
files — this ticket's whole thesis is "import, never fork".

## Feature Description

`/components` (#215) renders every vocabulary component's generated docs — live playground, API and
token tables, code tabs, spec prose — from one view-time join, `prepareHandoff(pack, vocab, graph)`.
This ticket mounts **that same renderer a second time**, compactly, in the studio's docked inspector:
click (or focus) a real component on the /factory canvas and its docs open beside the work.

Nothing about the docs is re-authored. `system/catalog.mjs`'s `renderComponentDocs` is exported
already, with a header that names this ticket as its consumer and an `opts` parameter described as
"the seam's forward pocket, deliberately unused today" (`system/catalog.mjs:172-180`). This ticket
spends that pocket on exactly one thing — a heading-level shift — and takes the rest as it stands.

## User Story

As a **deep-dive UX engineer evaluating this portfolio** (the PRD's expert-mode reader)
I want to **click a component on the studio canvas and read its real, generated documentation right
beside it** — API, tokens with live values, spec prose, copy-ready code
So that **I can check the system underneath the demo without leaving the surface I am judging**.

## Problem Statement

The studio proves the *method* is real (a recorded run assembles a board, the board compiles into a
flow). The catalog proves the *system* is real. Today they are two pages: the reader who wonders
"what actually is this tile?" while looking at a compiled screen has to leave, find `/components`,
and lose their place. And the docs the studio *could* show have exactly one honest source — a second,
hand-written "inspector summary" would be a second thing to drift, which the architecture explicitly
forbids (§Data model: "Docs catalog carries no new generated artifact").

## Solution Statement

A new hand-written canon module, `system/studio-docs.mjs`, mounted by `system/studio.mjs`:

1. It loads the same three generated artifacts the catalog loads and runs the same
   `prepareHandoff(pack, vocab, graph)` join, **lazily** — only once the canvas actually holds
   composed components (i.e. after the visitor presses Compile).
2. From that join it builds a **`className → component row` index** (`ds-metric-tile` →
   `metric-tile`, …). The map is *derived from the generated pack*, never hand-written: the
   renderer's root class IS `component.className` (`system/agentic-renderer.mjs:322,334,351` vs the
   pack's `class` field), so a rename in the chain moves both sides together and build-checks
   catches the day they stop agreeing.
3. It decorates every matching node on the canvas stage with `data-studio-docs="<name>"` +
   `tabindex="0"` + a shared `aria-describedby` hint, re-running that decoration wherever the studio
   already re-syncs the inspect layer.
4. **Delegated** `click` and `focusin` listeners on `canvas.stage` resolve
   `e.target.closest("[data-studio-docs]")` and open that component's docs into a fifth inspector
   panel — rendered by `renderComponentDocs`, compacted by CSS, never re-implemented.
5. The `.cat-*` styles move out of `components.html`'s page `<style>` into a shared
   `system/catalog.css` that both pages link — the same move #206 made when the studio absorbed the
   trace-player and system-graph blocks into `system/studio.css` (`factory.html:47-50` records it).

## Out of Scope / Non-Goals

- **Not making fat-marker blocks doc-clickable.** Before Compile the canvas holds
  `system/studio.mjs`'s `placeBlock` articles — drafted *places*, not vocabulary components. They
  have no docs, and inventing some would be the one hand-written thing this ticket exists to avoid.
  The panel's at-rest empty state says the precondition out loud.
- **Not adding a ⌘K command for the new panel.** The palette memoizes at first open and its three
  `/factory` deep links exist because those panels hold content at rest; a deep link into an empty
  panel is not worth the chrome churn. (`system/palette.mjs:102-104`.)
- **Not relabelling the inspect toggle to "Expert mode".** AC #5 forbids at-rest VR change from the
  toggle; a label rewrite is exactly that, on every page that carries the toggle row.
- **Not touching `system/agentic-renderer.mjs`.** No marker attribute is added to rendered
  components — that is a shipped contract every consumer (the protos, /build, the study, the
  catalog's own HTML code tab, which serializes `outerHTML`) would inherit.
- **Not extending `INSPECT_IDS`** (`system/pattern-render.mjs:93-97`). That list is hand-copied from
  `system/inspect-data.json` and covers the three primitives for the *bubble*; the docs index covers
  every pack component and is generated. Two lists with two jobs, neither a copy of the other.
- **Not a docs mount on `studio.html`.** The raw harness has no inspector; it is a substrate
  harness by design.
- **Not device-frame / proto docs** (#219) and **not the ten new components** (#220).

## Feature Metadata

**Feature Type**: New Capability (second mount of shipped capability)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/studio.mjs` · `system/catalog.mjs` · `factory.html` ·
`components.html` · new `system/studio-docs.mjs` + `system/catalog.css` · `tooling/build-checks.mjs`
(new group 22) · `tooling/studio-journey.mjs` (new `docsPass`) · param/loc/baseline cascades
**Dependencies**: none new — zero-dep vanilla, as every shipped page is

## Related Work

**Implements**: [#218](https://github.com/linardsb/ux-factory/issues/218)   ·   **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) →
`docs/epics/prototype-studio.architecture.md` §Other eng-lead calls ("Docs, two mounts of one
source", line 142-147; "Mode entry", line 139-141; "Sticky is a no-op site-wide", line 159-161)

**Back-references**:

- `.claude/plans/component-catalog-appica-docs-215.md` + `.claude/reports/component-catalog-215-report.md`
  — mount 1; `renderComponentDocs` is its declared seam for this ticket
- `.claude/plans/docs-chain-example-field-demo-notice-211.md` — the join (`prepareHandoff`'s third
  argument) this consumes
- `.claude/plans/studio-route-surgery-orchestrator-206.md` — the inspector shell, `wireInspector`,
  the lazy-panel discipline, and the page-styles-into-a-shared-sheet precedent
- `.claude/plans/studio-compile-beat-207.md` / `studio-flows-places-screens-212.md` — what actually
  puts real components on the canvas, and the `INSPECT_IDS` decoration loop this one mirrors
- `.claude/plans/factory-copy-inspect-panzoom-173.md` — the inspect engine's persisted toggle

**Forward-references**: (none yet — #219 adds device frames to the same canvas; if a frame's inner
document ever needs doc triggers, that is its ticket, not this one)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/catalog.mjs` **(whole file, 560 lines)** — Why: the thing being mounted a second time.
  Specifically `renderComponentDocs` (:172-440, note the `opts` pocket at :180), `resolveTokenValues`
  (:149-170, already exported "for mount 2"), `watchPackSwap` (:475-497, **not** exported yet),
  `mountCatalog` (:499-558, the model shape `{ vocab, portability }` at :525), `CATALOG_READY` (:41).
- `system/studio.mjs` **(whole file, 769 lines)** — Why: the host. `PANELS` (:157-162, and the
  four-inbound-entry-points warning), `syncInspect` (:237-241 — `refreshInspect`, never
  `initInspect`), `wireInspector` (:326-386, returns `{ activate, tabs, mounted }`; `activate(i,
  moveFocus)`), `mountStudioCore` (:394-648), `mountCompile`'s `onState` (:464-478),
  `publishBoard` (:530-556), `adoptBoard` (:605-634), the `live` handle (:646).
- `system/inspect.mjs` (:40 `INSPECT_KEY`, :60-64 `getInspect`/`refreshInspect`, :263-283
  `setInspect` persistence, :301-329 `refreshInspect`'s reasoning) — Why: this IS the expert toggle.
  Read the :301-329 comment before writing anything that re-renders the canvas.
- `system/studio-compile.mjs` (:370-465, especially `applySwap` at :412 and the `INSPECT_IDS`
  decoration loop at :459-463) — Why: the decoration pattern to mirror, and the file that proves
  the canvas only holds real components after Compile. Also :384-390 — why wrappers carry no
  `data-stx-component` after a compile.
- `system/studio-flow.mjs` (:73-100 `renderScreen`) — Why: what a compiled wrapper contains
  (`.stf-screen` → heading + `renderComposition` output + nav buttons). `.stf-screen` is the
  "canvas is compiled" discriminator this plan uses.
- `system/pattern-render.mjs` (:93-97 `INSPECT_IDS`) — Why: the neighbouring hand-copied list, and
  why the docs index must NOT be added to it.
- `system/agentic-renderer.mjs` (:221-368 `TEMPLATES`) — Why: proves the rendered root class equals
  the pack's `class` field for every component (`ds-metric-tile`, `vd-care-task-row`, …).
- `system/handoff-viewer.mjs` (:38-140 `prepareHandoff`) — Why: the join. Note `className`
  (:106), `wrapper` (:117), `tokens` (:123-127), `example` (:113) and that the third argument is
  optional and degrades those to null — which is the AC #3 mutation lever.
- `system/studio-canvas.mjs` (:250-345 `place`, note `stage`, `say`, `.stx-slot`, `.stx-grab`,
  `data-stx-component` at :337) — Why: the surface being decorated, and the module that owns the
  ONE live region.
- `system/studio-verbs.mjs` (search `stx-move-help`) — Why: the house pattern for a
  JS-created, visually-hidden instructions element referenced by `aria-describedby` from many
  decorated nodes. Mirror it; do not invent a second idiom.
- `factory.html` (:36-41 stylesheet links + `pack-boot.js` last-in-head rule, :47-50 the
  page-styles precedent, :79 `[hidden]{display:none!important}`, :274-289 the inspector aside +
  tablist, :477-489 the module tags) — Why: every markup edit lands here.
- `components.html` (:26-31 links, :32-175 the `<style>` block being extracted) — Why: the source of
  `system/catalog.css`.
- `system/param-manifest.json` (:63-66 the four `/components` entries, :67 the now-false
  "4 panels" `.stu-tab` label) — Why: the manifest is hand-maintained and CI drift-checks its
  derived count.
- `tooling/studio-journey.mjs` (:242-262 `journey()`'s pass list, :1260-1340 `factoryPass` incl. the
  arrow-key panel assertions at :1322-1333, :2102+ `compilePass` for the compile sequence to copy,
  :4688-4710 the runner + the bounds/summary prints) — Why: where `docsPass` goes and what it must
  not break.
- `tooling/catalog-journey.mjs` (:1-60, especially the stale-serve byte-match guard at :49-58) —
  Why: the guard to copy, and the driver whose claims must not be duplicated here.
- `tooling/build-checks.mjs` (group 21, the `MODULES` list for group 7, the header roster and the
  "all 21 groups pass" line) — Why: group 22 joins all four places.

### New Files to Create

- `system/studio-docs.mjs` — the docs layer: the pure index + the canvas decoration + the delegated
  open. Hand-written canon, header citing epic #202 / ticket #218 / this plan. **~230-280 lines
  including the header.**
- `system/catalog.css` — the `.cat-*` / `.hv-*` block moved verbatim out of `components.html`, plus
  one new `.cat-compact` section. **~150 lines.**

### Relevant Documentation

- `docs/epics/prototype-studio.architecture.md` §Other eng-lead calls (lines 139-161) — the three
  decisions this ticket inherits verbatim: two mounts of one source, mode entry, sticky-is-a-no-op.
- `CLAUDE.md` → "Where new code goes" → *View-time behaviour on shipped pages* (a hand-written ES
  module beside `system/site.js`) and *New live-manipulable control on a shipped page* (manifest +
  regen in the same PR).
- WAI-ARIA APG — [Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — the existing
  `wireInspector` implements it; a fifth tab must keep roving `tabindex` and arrow/Home/End intact.
- WCAG 2.2 — [SC 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
  and [SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html) — why the doc
  triggers are `tabindex="0"` with a described-by hint and **no** `role="button"` (nothing is
  "pressed"; focus alone opens the docs, mirroring `system/inspect.mjs`'s focus behaviour).

### Patterns to Follow

**Lazy, and prove it stays lazy** — `system/studio.mjs:174-183`: the three absorbed exhibits mount
on first activation, "at rest none of the three has fetched or rendered anything". The docs layer
inherits that property and the reason: the pixel gate captures the settled canvas, and a fetch at
mount is a race nobody's gate can see.

**Decoration, not per-node listeners** — `system/studio-compile.mjs:459-463` writes `data-inspect`
onto nodes after every swap. Do the same for `data-studio-docs`, and put the *listeners* on the
stage (delegation) so a revert / recompile / redraft can never orphan one.

**Refusals are content, never throws** — `system/bus-toggles.mjs`'s discipline, restated in
`system/catalog.mjs:24-26` and `system/studio-flow.mjs:31-34`. A failed artifact fetch renders a
sentence in the panel. `tooling/studio-journey.mjs`'s no-page-errors contract is a real assertion.

**One live region, and know when NOT to speak** — `system/studio-canvas.mjs` owns `say`.
`system/studio-flow.mjs:21-29` records the "no verb / no announcement invented for symmetry"
reasoning. This ticket announces **nothing**: a `focusin`-driven announcement would fire on every
Tab press through a compiled screen. The affordance is stated once, statically, through
`aria-describedby` (`system/studio-verbs.mjs`'s `#stx-move-help` idiom).

**Zero inline styles, zero markup from a string** — `system/studio.mjs:48-51`. `studio-docs.mjs`
joins build-checks group 7 with no exception argued. `node.tabIndex = 0` is a property, not a style
write; if group 7's regex objects, use `setAttribute("tabindex", "0")`.

**Node-import safety** — every new module keeps DOM inside function bodies and self-boots (if at
all) behind `typeof document !== "undefined"`. `studio-docs.mjs` has **no self-boot**:
`system/studio.mjs` mounts it, exactly as it mounts the keep rail and the method band.

---

## IMPLEMENTATION PLAN

### Phase 1: Make the one source reusable

Extract the catalog's styles into a sheet two pages can link, and spend
`renderComponentDocs`'s `opts` pocket on the one thing a second mount genuinely needs.

**Tasks:** `system/catalog.css` (moved verbatim + a compact block) · `components.html` links it ·
`headingTags` + `opts.level` in `catalog.mjs` · export `watchPackSwap`.

### Phase 2: The docs layer

**Depends on:** Phase 1 (`renderComponentDocs` must accept a heading level; the compact styles must
exist or the panel renders at catalog width inside a narrow column).

**Tasks:** `system/studio-docs.mjs` — pure index, lazy model load, decoration, delegated open,
destroy.

### Phase 3: Wiring and markup

**Depends on:** Phase 2.

**Tasks:** the fifth panel in `factory.html`, the stylesheet link, `system/studio.mjs`'s mount +
refresh calls + `live` handle + `PANELS` entry.

### Phase 4: Gates

**Depends on:** Phase 3. **Independent of** each other — group 22 and `docsPass` can be written in
either order, and group 22 needs no browser.

**Tasks:** build-checks group 22 (pure — index, compiled-set resolution, join arity, the lazy rule) ·
`tooling/studio-journey.mjs`'s `docsPass` (running page: at-rest silence, decoration, pointer,
focus-without-theft, cross-page comparison, pack swap, code-tab paint, refresh-after-render,
refusal) · **Task 8b, the mutation drill, which is a task and not a footnote** — every gate above
is shown able to fail, with the failure text recorded.

### Phase 5: Cascades

**Depends on:** Phase 4 (baselines must be regenerated from the final tree).

**Tasks:** param-manifest + `gen-param-count` · `gen-loc-summary` (+ approach baselines only if the
rendered number moved) · CLAUDE.md map · **Task 11b's computed-style no-op proof, which runs BEFORE
the pixel gate** · VR baselines from a clean detached worktree against a written-down churn list ·
report + PR.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently checkable.

### 0. CREATE the branch

- **IMPLEMENT**: `git fetch origin && git checkout -b feature/studio-inspector-docs-218 origin/main`
- **GOTCHA**: this worktree is shared with parallel sessions (memory: *Shared worktree, parallel
  sessions*). Verify the branch immediately before every commit and **stage by explicit path** —
  #215's report records another session's files being found staged in the shared index.
- **GOTCHA**: #217 landed on `fix/studio-menu-focus-263-review`; confirm it is merged into `main`
  before branching (`git log origin/main --oneline | head`), or `docsPass` will be written against a
  canvas whose selection layer is absent.
- **VALIDATE**: `git status` clean; `git log --oneline -1`
- **SATISFIES**: prerequisite

### 1. CREATE `system/catalog.css` (move, do not rewrite)

- **IMPLEMENT**: move the `.cat-*` and `.hv-*` rules out of `components.html`'s `<style>` block
  (`components.html:32-175`) **verbatim** into a new `system/catalog.css`. Keep the rules, the
  order, the media queries and the comments byte-for-byte where possible; update only the block's
  opening comment, which currently says "One page, not a reused organism, so deliberately not
  promoted to components.css" — #218 is the event that changed that, and the new comment says so
  and names both mounts.
- **IMPLEMENT — the `[hidden]` rule moves too, deliberately.** `renderComponentDocs` toggles its
  code-tab panels with `panel.hidden = pid !== id` (`system/catalog.mjs:351,356`) and its own comment
  (`:337-339`) says it relies on the host page carrying
  `[hidden] { display: none !important; }` — the attribute is only a UA rule any author `display`
  beats (the /build #138 lesson; memory: *`hidden` defeated by author display*). Leaving that rule
  page-scoped makes the renderer depend on each host declaring it — satisfied on both pages today by
  coincidence, and silently broken by a third mount. So **put the rule in `system/catalog.css`**,
  delete it from `components.html`, and comment it as travelling WITH the renderer that needs it.
  `factory.html:79` declares an identical rule; the duplicate is inert (same declaration, same
  `!important`) and its comment there should note the sheet now carries one too.
- **PATTERN**: `factory.html:47-50` — #206 moved `.trace-*` and `.sg-*` into `system/studio.css`
  verbatim for exactly this reason ("those two moved there verbatim rather than being deleted").
- **GOTCHA**: cascade position. Link the new sheet in `components.html` **where the `<style>` block
  was** relative to the other sheets — after `/system/portfolio.css`, before `pack-boot.js`.
  `pack-boot.js`'s tag must remain the LAST element in head (CLAUDE.md, portfolio-ux-uplift §Phase 5).
- **GOTCHA**: this sheet must stay token-only for colour/space/type. Structural literals (grid
  tracks, `%`, the mono font stack) already exist in the block and are argued in its comment — do
  not "fix" them, and do not add a brand value.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then load `/components` — every
  section renders as before; then `grep -c "cat-" components.html` shows only the markup hooks.
- **SATISFIES**: enables AC #1/#3 (the inspector needs these styles on /factory)

### 2. ADD the compact block to `system/catalog.css`

- **IMPLEMENT**: a clearly delimited `.cat-compact` section: single-column playground
  (`grid-template-columns: 1fr`), caption-scale type for the head row, tables already scroll
  (`.cat-table` is `display: block; overflow-x: auto` — `components.html:133`) so they need nothing,
  reduced vertical rhythm, and `.cat-compact .cat-component`-style top borders suppressed (the
  inspector renders ONE component, not a list).
- **PATTERN**: `system/studio.css`'s `.stu-*` blocks — semantic classes, token values, no literals
  beyond structure.
- **GOTCHA**: compaction is CSS **only**. Do not add a `compact` flag to `renderComponentDocs` — the
  caller puts `class="cat-compact"` on its container, and the renderer stays one code path for both
  mounts. (This is deliberate: a `compact` branch inside the renderer is the first crack in "one
  source".)
- **GOTCHA**: the inspector column is narrow (`system/studio.css:412-421`). Verify at 1440px AND at
  the 390px mobile VR viewport that nothing overflows horizontally — the page body must never scroll
  sideways (`body { overflow-x: clip }` hides it visually but the layout is still wrong).
- **VALIDATE**: visual, after Task 6 — deferred check noted in the manual list.
- **SATISFIES**: AC #1 ("rendered compactly")

### 3. UPDATE `system/catalog.mjs` — the heading level and the pack-swap export

- **IMPLEMENT** (pure layer, beside `controlFor`/`tabsFor`):
  ```js
  // headingTags(level) → { name, section } — the two heading tags renderComponentDocs uses.
  // The catalog page renders a component's name as an h2 under the page h1; the studio inspector
  // renders it inside a panel whose own title is an h3 (factory.html's .stu-panel-title), so a
  // second mount that kept h2 would invert the outline. Clamped to 2..5 so the section tag is
  // always exactly one level below the name and never runs past h6.
  export function headingTags(level) { … }   // 2 → { name: "h2", section: "h3" }, 4 → h4/h5
  ```
- **IMPLEMENT**: in `renderComponentDocs`, replace the two literal tags with the resolved pair —
  `system/catalog.mjs:187` (`el("h2", { class: "cat-name", tabindex: "-1", … })`) and `:433`
  (`el("h3", { class: "cat-section-title", … })`). Read the level from
  `opts.level`, defaulting to 2 so mount 1 is byte-identical.
- **IMPLEMENT**: `export` the existing `watchPackSwap` (`system/catalog.mjs:475`) — one observer per
  mount, and its comment already explains the contract-sheet trap and the load/error pair. Do not
  change its body.
- **IMPLEMENT**: update the module header's mount-2 paragraph (`:1-30`) to say that #218 landed and
  what it consumes (`renderComponentDocs` + `resolveTokenValues` + `watchPackSwap` + `headingTags`),
  and update the `opts` sentence at `:179` — it currently says the pocket is "deliberately unused
  today", which is about to be false.
- **GOTCHA**: `renderComponentDocs`'s prose loop calls `renderMarkdown(prose, sec.body)`
  (`:434`) — the imported markdown subset renders `h3`-free content, so only the *section title* tag
  is ours to shift. Do not touch `renderMarkdown`.
- **GOTCHA**: `.cat-name` keeps `tabindex="-1"` in both mounts — mount 1's hash focus target
  (`focusHash`, `:454-462`) depends on it, and an unused `-1` in mount 2 costs nothing.
- **VALIDATE**: `node -e "import('./system/catalog.mjs').then(m=>console.log(m.headingTags(2),m.headingTags(4),typeof m.watchPackSwap))"`
- **SATISFIES**: AC #3 (one renderer, two mounts), a11y heading order

### 4. CREATE `system/studio-docs.mjs`

- **IMPLEMENT** — header first (the repo's convention: a feature module opens with a header citing
  its governing doc and the calls a later editor must inherit rather than re-argue). The header
  must state, in the house voice:
  - **MOUNT 2 OF TWO.** It renders nothing itself: `renderComponentDocs` is imported from
    `system/catalog.mjs`, the join is `prepareHandoff(pack, vocab, graph)` from
    `system/handoff-viewer.mjs`, and the compaction is a class in `system/catalog.css`. If this file
    ever needs to *draw* a docs row, that is a missing seam in `catalog.mjs`, not a licence to copy.
  - **THE INDEX IS DERIVED, NOT WRITTEN.** `className → row` comes from the pack; the renderer's
    root class IS that class. `INSPECT_IDS` is not extended (different job, different source).
  - **LAZY BY DISCRIMINATOR, AND THE DISCRIMINATOR IS THE POINT.** Nothing is fetched until the
    stage holds a `.stf-screen` — i.e. until the visitor compiles. At rest the studio has fetched
    nothing for this panel, which is the property `#206` argued and the pixel gate depends on. An
    eager fetch at mount would break it and **no gate on this page would see it**.
  - **DELEGATION, NOT PER-NODE LISTENERS.** A revert, a recompile, a `?b=` restore and a method
    redraft all replace the nodes; delegation on `canvas.stage` cannot be orphaned by any of them.
  - **NO ANNOUNCEMENT, DELIBERATELY.** `focusin` fires on every Tab step through a compiled screen;
    a `say` per focus would turn one live region into noise. The affordance is stated once, as a
    static hint element every trigger points at (`studio-verbs.mjs`'s `#stx-move-help` idiom).
  - **NO BUS VERB, DELIBERATELY.** Reading docs is not a canvas verb: pointer and keyboard converge
    natively, and no agent path records it (`studio-flow.mjs`'s recorded reasoning, third
    application).
  - Refusals are content; Node-import safe; **no self-boot**.
- **IMPLEMENT** — the pure layer (DOM-free, gated by group 22). **Three of these exist so that the
  two invariants no browser-free gate could otherwise reach become CI facts** — the group-9 split,
  applied here: the PREDICATE is gated in CI, the WIRING is proven on the running page.
  ```js
  export const DOCS_PANEL_ID = "component-docs";   // must equal factory.html's panel id
  export const DOCS_HELP_ID  = "stu-docs-help";
  export const DOCS_ATTR     = "data-studio-docs";
  // The "this canvas has compiled" discriminator, named once and exported so the gate asserts the
  // SAME string the module branches on rather than a copy of it.
  export const COMPILED_SELECTOR = ".stf-screen";
  // The three generated artifacts, in one place, so the join below cannot be given two of them.
  export const DOCS_SOURCES = ["/handoff/verdant/pack.json", "/handoff/verdant/vocabulary.json", "/system/system-graph.json"];

  // docsIndex(components) → Map<className, row>. Throws (a generated-artifact corruption, not a
  // user input) if two components claim one class — silently keeping the last would make a click
  // open the wrong component's docs.
  export function docsIndex(components) { … }

  // shouldLoad({ compiled, loaded, loading }) → boolean. THE LAZY RULE AS A FUNCTION, not as an
  // `if` buried in refresh(): fetch only when the stage has compiled, only once, never while a
  // load is already in flight. It is a function because "at rest this page fetched nothing" is
  // invisible to the pixel gate (identical pixels either way), to drift-check (no artifact) and to
  // any Node gate that cannot hold a DOM — so the RULE is gated in CI here and the WIRING is
  // tooling/studio-journey.mjs's docsPass, which is the only thing that can see it.
  export function shouldLoad(state) { … }

  // loadDocsModel(fetchLike) → { model, shared, index }. THE JOIN LIVES HERE AND NOWHERE ELSE, and
  // that is what makes AC #3 gated rather than decorative: a regression to the two-argument
  // prepareHandoff(pack, vocab) — which silently degrades tokens/example/consumer to null and makes
  // the inspector quietly poorer than /components — happens inside a function build-checks group 22
  // drives with a stub fetch. Fetches DOCS_SOURCES in order, joins all three, throws a plain Error
  // naming the failing url (the caller turns it into a sentence; nothing throws at the reader).
  export async function loadDocsModel(fetchLike = fetch) { … }
  ```
- **IMPLEMENT** — the mount:
  ```js
  export function mountStudioDocs(root, { canvas, inspector }) → { refresh, open, destroy, panelIndex }
  ```
  - resolve the panel mount (`[data-studio-docs-mount]`) and the empty-state node
    (`[data-studio-docs-empty]`); return an inert handle (all methods no-ops) if either is absent —
    the same posture `mountStudioKeep` takes on a missing root.
  - create the hint element once, **on the first successful decoration, not at mount**
    (`id = DOCS_HELP_ID`, class `stx-verb-help` — the existing caption style; `system/studio-verbs.mjs:488-492`
    is the model, and `:493-497` records that each affordance gets its OWN element rather than
    extending someone else's sentence). Sentence: focus or click a component to read its generated
    docs in the inspector. **Deferred creation is deliberate**: the element is visible caption text
    (there is no `visually-hidden` utility in this repo — check `system/components.css` before
    assuming one), the triggers do not exist before Compile, and a hint sitting in the at-rest
    capture would both mislead and churn the baseline for a state it does not describe.
  - `refresh()`:
    1. `const compiled = Boolean(canvas.stage.querySelector(COMPILED_SELECTOR));` — the
       discriminator, read through the exported constant so the gate and the module cannot disagree.
       If not compiled and nothing is loaded, return. (Nothing to clear: decoration lives on nodes
       that are already gone.)
    2. `if (shouldLoad({ compiled, loaded, loading })) ensureModel();` — the lazy rule is the pure
       function's answer, never a second `if` written here. `ensureModel` returns early if a load is
       in flight; its `.then` re-enters `decorate()`.
    3. `decorate()`: for each `[className, row]` of the index,
       `stage.querySelectorAll("." + className)`, and for each node that does not already carry
       `DOCS_ATTR`: set `DOCS_ATTR` to `row.name`, `tabindex="0"`, `aria-describedby=DOCS_HELP_ID`.
       Idempotent by construction.
  - `ensureModel()`: one in-flight promise wrapping `loadDocsModel()` — **it holds no fetch and no
    join of its own**, so the CI-gated function is the only path to a model. On success store
    `{ model, shared, index }`, set `loaded`, call `watchPackSwap(mountNode)` **once**, and
    `decorate()`; on failure render the refusal sentence into the panel (naming the url and the
    status) and clear `loading` so a later refresh retries. Never `console.error`, never throw.
  - delegated listeners under one `AbortController`:
    `stage.addEventListener("click", …)` and `stage.addEventListener("focusin", …)`, each resolving
    `e.target.closest("[" + DOCS_ATTR + "]")` and calling `open(node.getAttribute(DOCS_ATTR))`.
  - `open(name)`: look the row up **by name** in the model (a second small `Map<name,row>` or a find);
    if absent, render the honest sentence and return. Otherwise `mountNode.textContent = ""`,
    `renderComponentDocs(mountNode, row, shared, { level: 4 })`, hide the empty state, and
    `inspector.activate(panelIndex, false)` — **`false` is load-bearing**: `activate(i, true)` moves
    focus to the tab, which on the `focusin` path would yank focus out of the canvas on every Tab
    press and make the keyboard route unusable.
  - `destroy()`: abort the delegation controller, remove `DOCS_ATTR`/`tabindex`/`aria-describedby`
    from decorated nodes, empty the panel, remove the hint element.
- **PATTERN**: `system/studio-keep.mjs` / `system/studio-method.mjs` for the mount-handle shape;
  `system/catalog.mjs:499-558` for the fetch/join/error-card shape.
- **IMPORTS**: `renderComponentDocs`, `resolveTokenValues` (only if you need a re-resolve outside
  `renderComponentDocs`, which already calls it at `:439` — prefer not to), `watchPackSwap` from
  `./catalog.mjs`; `prepareHandoff` from `./handoff-viewer.mjs`. Nothing else.
- **GOTCHA**: `watchPackSwap(mountNode)` observes the head's pack link and re-runs
  `resolveTokenValues(mountNode)`. Call it **once per mount**, never per `open()` — one
  `MutationObserver` per open would accumulate one live observer per component the reader ever
  clicked.
- **GOTCHA — A BEHAVIOUR CHANGE TO THE INSPECT LAYER, DECIDE IT ON PURPOSE AND WRITE IT IN THE
  HEADER.** `applySwap` already sets `data-inspect` on these same three primitives
  (`system/studio-compile.mjs:459-463`), and they were **hover-only** because nothing made them
  focusable. `tabindex="0"` changes that: `system/inspect.mjs:230`'s `focusin` path now fires on
  them, so tabbing through a compiled screen opens the inspect bubble AND the docs panel. That is
  coherent expert-mode behaviour and this plan accepts it — but `inspect.mjs:218-224`'s `ownEvent`
  guard exists for exactly this class of double-open (the `[data-term]` case), so it is a decision,
  not a side effect. Record it in the header, and check by hand (manual list item 3) that the
  bubble's placement does not fight the panel and that the pair reads as one act rather than two.
- **GOTCHA**: nested triggers are correct and intended — `closest()` resolves to the innermost, so
  clicking the `vd-status-chip` inside a `vd-care-task-row` opens the chip's docs. Do not
  "fix" it by scanning from the outside in.
- **GOTCHA**: the panel's own playground renders real components (`.ds-metric-tile`, …). Decoration
  scans `canvas.stage` only — never `document` — or the docs panel would decorate itself.
- **VALIDATE**: `node -e "import('./system/studio-docs.mjs').then(m=>console.log(Object.keys(m)))"`
  (Node-import safe, no DOM touched)
- **SATISFIES**: AC #1, AC #2, AC #4

### 5. UPDATE `factory.html` — the sheet, the fifth tab, the fifth panel

- **IMPLEMENT**: `<link rel="stylesheet" href="/system/catalog.css" />` after
  `/system/studio.css` (`factory.html:40`), **before** `<script src="/system/pack-boot.js">` —
  that tag stays last in head.
- **IMPLEMENT**: a fifth tab button, **last** in the tablist (`factory.html:275-280`):
  `id="stu-tab-component-docs"`, `aria-controls="component-docs"`, label `Component`,
  `aria-selected="false"`.
- **IMPLEMENT**: a fifth `.stu-panel` after `#shape`'s panel, `id="component-docs"`,
  `role="tabpanel"`, `aria-labelledby="stu-tab-component-docs"`, `tabindex="0"`, carrying:
  a `.stu-panel-head` with an `h3.stu-panel-title` ("Component") and a `capability` chip
  ("Generated · the same source as /components"); a `.stu-panel-lead`; then
  `<p class="muted" data-studio-docs-empty>` with the **honest precondition sentence** — compile the
  board first, then click or focus any component on the canvas, and its generated docs open here;
  the same docs live at `/components`, linked. Then
  `<div class="cat-compact" data-studio-docs-mount></div>`.
- **IMPLEMENT**: update the head comment's "DOCKED INSPECTOR whose panel list absorbs all three
  exhibits" and the panel-id warning paragraph (`factory.html:18-30`) to name the fifth panel and
  say that its id is *not* one of the four inbound-entry-point ids.
- **GOTCHA**: no panel carries `hidden` in the markup — the no-JS case shows all of them
  (`factory.html:286-288`). Follow that: the new panel is visible without JS and shows its empty
  state, which is honest (without JS nothing on the canvas is clickable either).
- **GOTCHA**: placing the tab **last** keeps `tooling/studio-journey.mjs:1322-1333` green unedited
  (ArrowRight from Round-trip still lands on Graph; Home still lands on This build). Inserting it
  anywhere else edits an existing assertion for no user-visible gain.
- **VALIDATE**: load `/factory` — five tabs, the fifth shows the empty state, arrow keys still walk
  the list, no console errors.
- **SATISFIES**: AC #1, AC #5 (off by default: the panel is inert until a component is clicked), AC #6

### 6. UPDATE `system/studio.mjs` — mount and refresh

- **IMPLEMENT**: import `mountStudioDocs` (and `DOCS_PANEL_ID` if you use it to find the panel
  index). Add `{ id: "component-docs", label: "Component" }` to `PANELS` (`:157-162`) and extend
  that comment: the new id is ours, the last three remain fixed by four inbound entry points.
- **IMPLEMENT**: `let docs = null;` declared beside `let keep = null;` / `let method = null;`
  (`:513-516`) so the earlier closures can reach it.
- **IMPLEMENT**: mount it **after** the method band (`:640`), passing `{ canvas, inspector }` —
  `inspector` is `wireInspector`'s return (`:488`), which already exposes `activate` and `tabs`;
  derive the panel index from `tabs.findIndex(t => t.getAttribute("aria-controls") === DOCS_PANEL_ID)`
  inside `studio-docs.mjs` so `studio.mjs` passes no magic number.
- **IMPLEMENT**: call `docs?.refresh()` at every place the canvas content changes — i.e. beside the
  existing `syncInspect()` calls that follow a canvas re-render:
  `mountCompile`'s `onState` (`:476`), `publishBoard` (`:555`), and the mount-tail call (`:644`).
  `adoptBoard` reaches it through `publishBoard`. Add a one-line comment saying **why the pair
  travels together**: `refreshInspect` re-wires the bubble layer, `docs.refresh()` re-decorates the
  doc triggers, and both exist because this canvas rebuilds its contents after mount (#175's lesson,
  the reason `system/inspect.mjs:301-329` exists at all).
- **IMPLEMENT**: add `docs` to the `live` handle (`:646`) so `tooling/studio-journey.mjs` reaches it
  through `getStudio()` and never a window global.
- **GOTCHA**: `mountPanel(id)` (`:184-235`) matches no branch for `component-docs` and returns
  immediately — that is correct and needs no edit. The docs panel's content is the docs module's,
  not the lazy-exhibit machinery's.
- **GOTCHA**: keep the module's stated invariant true — this file still writes the build store in
  exactly ONE place (`restoreShared`). The docs layer reads generated artifacts only.
- **VALIDATE**: `node -e "import('./system/studio.mjs').then(()=>console.log('node-import ok'))"`
  then, on the running page: compile, click a tile, docs render, tab switches, focus stays on the
  canvas.
- **SATISFIES**: AC #1, AC #2

### 7. ADD build-checks group 22 — the docs index and the join

- **IMPLEMENT** in `tooling/build-checks.mjs`, mirroring group 21's shape:
  1. **Index integrity over the real artifacts**: read `handoff/verdant/pack.json`,
     `handoff/verdant/vocabulary.json`, `system/system-graph.json` from disk, run `prepareHandoff`,
     build `docsIndex` — assert its size equals `pack.components.length` (no class collision) and
     that every key is a non-empty string.
  2. **THE CLICK TARGET IS REAL** (the group's load-bearing case): drive the committed replay board
     (`replay/build-fieldwork-dispatch.board.json`) through `screensFor` + `compose` — group 19
     already does this join; copy its setup — collect every component `name` the compiled screens
     would render, and assert **every one of them resolves through the docs index**. This is the
     assertion that goes red the day a class, a spec name or a template class drifts and the canvas
     silently stops being clickable.
  3. **THE MUTATION THAT PROVES 2 CAN FAIL**: deep-clone the pack, rename one component's `class`,
     rebuild the index, and assert the resolution check now throws/fails **and names that
     component**. (Repo memory: *the check that cannot fail* — mutate the source, run the function,
     never grep for a constant.)
  4. **`headingTags`** (from `catalog.mjs`, so it may live in group 21 instead — pick one and say
     which): 2 → h2/h3, 4 → h4/h5, clamped at both ends, section always exactly one below name.
  5. **THE JOIN'S ARITY, DRIVEN — RISK 1's CI HALF.** Call `loadDocsModel` with a **stub fetch** that
     serves the three committed artifacts off disk and records the urls asked for. Assert: exactly
     three requests, equal to `DOCS_SOURCES` (so a mount that fetched two could never satisfy this),
     and — the load-bearing half — that the returned rows carry the **third argument's** fields:
     `tokens` is a non-empty array with a resolved `group`, and `consumer` is present on the
     components the graph measures. **Then the MUTATION**: re-run the same function against a stub
     that omits the graph (or with the join dropped to two arguments) and assert those fields go
     null and the case goes red. This is what turns AC #3 from "true by construction" into a gated
     fact, and it fails in CI rather than only in an operator's drill.
  6. **`shouldLoad`'s truth table — RISK 2's CI HALF.** Every combination of
     `{ compiled, loaded, loading }`: true only for `compiled && !loaded && !loading`. Plus
     `COMPILED_SELECTOR === ".stf-screen"` asserted against `system/studio-flow.mjs`'s own class
     (read the class off a rendered screen's markup constant, not typed twice), so a renamed screen
     class turns the lazy rule red instead of turning the docs panel permanently empty.
  7. **STATE THE BOUNDARY**, as groups 9/11/13/16/21 all do: that a click *opens* anything, that the
     panel and `/components` agree ON THE PAGE, that focus is not stolen, that token values resolve
     live, and that `refresh()` actually consults `shouldLoad` rather than fetching anyway are all
     `tooling/studio-journey.mjs`'s — this group runs under Node and can see none of it. Cases 5 and
     6 gate the RULES; `docsPass` assertions 1 and 5 gate the WIRING. Neither is sufficient alone,
     and saying so here is what stops a later editor from deleting one as redundant.
- **IMPLEMENT**: join `system/studio-docs.mjs` to group 7's `MODULES` list (zero inline styles,
  no markup from a string) with **no exception argued** — if the file needs one, the file is wrong.
- **IMPLEMENT**: update the header roster and the "all 21 groups pass" line → 22.
- **VALIDATE**: `node tooling/build-checks.mjs` → all 22 groups pass; then run the mutation by hand
  once and watch group 22 go red naming the component; revert.
- **SATISFIES**: AC #1 (the target set is provably the rendered set), AC #3 (partly)

### 8. ADD `docsPass` to `tooling/studio-journey.mjs`

- **IMPLEMENT**: a `docsPass(browser, t, errors)` called from `journey()` beside the other passes
  (`:1249-1252`), opening its own context at 1440×1000 like `factoryPass`. Sequence: load
  `/factory.html`, wait `[data-studio="ready"]` → `[data-replay="settled"]`, press **Compile**, wait
  for the compiled stage (`compilePass` at `:2102` shows the exact handles/selectors to wait on).
- **IMPLEMENT** the assertions — each phrased as a *resulting DOM fact*, never "an event fired":
  1. **At rest, nothing was fetched for this panel — and after Compile, each artifact is fetched
     exactly once.** Record every request from load (`page.on("request")`), filtered to
     `DOCS_SOURCES`. Assert **zero** before Compile (the panel showing its empty state, no canvas
     node carrying `data-studio-docs`), then compile, click a component, **force several more
     re-renders** (Back to blocks → Compile → a keyboard move) and assert the per-url count is still
     exactly **1**. Two assertions, not one, because they catch opposite regressions: an eager fetch
     at mount, and a `refresh()` that re-fetches on every canvas render (which no pixel, Node or
     drift gate can see, and which would put three requests behind every undo). *(The
     lazy-discriminator invariant — the one no other gate can see; group 22 case 6 gates its rule.)*
  2. **After Compile, every rendered primitive is a trigger.** Count `.stf-screen .ds-metric-tile,
     .stf-screen .ds-list-row, .stf-screen .ds-sequence-step` and assert the same count carries
     `[data-studio-docs]` **and** `tabindex="0"` — the count read off the running page, never typed.
  3. **Pointer opens the docs.** Click one; assert `#stu-tab-component-docs[aria-selected=true]`,
     the panel is visible, and `.cat-name` inside it reads the expected component name (derived from
     the clicked node's own `data-studio-docs`, not a literal).
  4. **Keyboard focus opens the same docs, and does NOT steal focus.** `node.focus()` on a different
     component → panel re-renders to *that* name AND `document.activeElement` is still the canvas
     node. *(A `focusin` handler that passes `moveFocus: true` fails exactly here.)*
  5. **AC #3 — the same facts, one join.** Open `/components` in a second page, read the target
     component's `.cat-api` table text and `.cat-tokens` table text; read the same two from the
     inspector; assert deep string equality. **Print what was compared.**
     **ORDER IS PART OF THE ASSERTION**: this runs BEFORE assertion 6's pack swap, and its own text
     says why — the token table's live-value column is `getComputedStyle` in two different
     documents, equal only while both wear the neutral pack. Run it after the swap and it fails for
     a correct implementation. (The alternative — excluding `[data-token-value]` cells from 5 and
     letting 6 own them entirely — is equally sound; pick one and say which in the assertion text.
     Do not leave two order-dependent assertions with no note between them.)
  6. **AC #4 — live token values.** Switch the dock to `saulera` on the /factory page, wait for the
     re-resolve, assert at least one `[data-token-value]` cell's text **changed** and that the new
     value appears in no fetched artifact (fetch `system-graph.json` in the driver and assert the
     resolved value is not one of the raw pack bindings — a raw binding is a `var(--…)` alias, a
     resolved value is not).
  6b. **The code tabs are genuinely toggled, read as COMPUTED display.** In the inspector, exactly
     one `.cat-code` panel is painted; press another tab and the painted one changes. Read
     `getComputedStyle(...).display`, never the `hidden` attribute — the attribute is inert wherever
     an author rule sets a display, which is the whole reason Task 1 moved the rule into the shared
     sheet, and the one failure mode here that looks correct in every other check.
  7. **AC #2 — refresh after re-render.** With inspect persisted **on** (`localStorage` seeded
     before load, `INSPECT_KEY = "factory-inspect"`), compile → hover a primitive → the inspect
     bubble opens (`#inspect-bubble` is shown). Then press **Back to blocks** → **Compile** again and
     assert the bubble opens again on the *new* nodes, and that the doc triggers were re-decorated
     (count from assertion 2 holds). *(Memory: hover probes race smooth scroll — wait for `scrollY`
     stability before hovering; inspect hides on scroll by design.)*
  8. **AC #5 — the toggle persists and is off by default.** A fresh context: `INSPECT_KEY` absent
     from `localStorage`, `documentElement` carries no `data-inspect-mode`; press the toggle, reload,
     assert it comes back on; press again, reload, assert it is off and the key is gone.
  9. **Refusal is content.** Route-abort `/handoff/verdant/pack.json`, compile, click a component →
     the panel shows a sentence naming the failure, the canvas is untouched, and **nothing reaches
     the console**.
  10. **Zero console/page errors across the pass** (the driver's standing contract).
- **IMPLEMENT**: the **stale-serve guard** for this pass — copy `tooling/catalog-journey.mjs:49-58`
  and assert the served `/system/studio-docs.mjs` byte-matches the working tree before running.
  (Memory: *stale serve = wrong tree*.)
- **IMPLEMENT**: extend the driver's bounds print and the final success sentence
  (`:4700-4710`) with what this pass covers and what it does not.
- **GOTCHA**: `node tooling/visual-regression/serve.mjs &` first; another session may hold 4757 —
  use `PORT=4759` + `BASE` overrides.
- **VALIDATE**: `node tooling/studio-journey.mjs all` → all green ×3 engines.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4, AC #5

### 8b. RUN the mutation drill — a task, not a footnote

- **IMPLEMENT**: perform each Level 5 mutation, one at a time, and **record the observed failure
  text in the report**. A mutation that does not go red is a finding about the gate, not a pass:
  fix the check before continuing.

  | # | Mutation | Must go red in | Expected message names |
  |---|---|---|---|
  | 1 | `loadDocsModel` joins with two args (`prepareHandoff(pack, vocab)`) | build-checks group 22 case 5 **and** `docsPass` assertion 5 | the null `tokens` / the table mismatch |
  | 2 | `shouldLoad` returns `true` unconditionally (eager fetch) | group 22 case 6 **and** `docsPass` assertion 1 | the at-rest request |
  | 3 | `refresh()` calls `ensureModel()` without `shouldLoad` (re-fetch per render) | `docsPass` assertion 1's second half | the per-url count |
  | 4 | a pack component's `class` renamed in group 22's clone | group 22 case 3 | that component |
  | 5 | `inspector.activate(i, true)` | `docsPass` assertion 4 | the stolen `activeElement` |
  | 6 | `[hidden]` rule removed from `system/catalog.css` | `docsPass` assertion 6b | the painted second code panel |
  | 7 | `COMPILED_SELECTOR` → `".stf-screenX"` | group 22 case 6 | the class mismatch |

- **GOTCHA**: revert each mutation immediately and re-run the full gate set afterwards — a forgotten
  mutation is a shipped defect, and mutation 2 in particular leaves the page green-looking.
- **VALIDATE**: after the drill, `node tooling/build-checks.mjs` → 22/22 and
  `node tooling/studio-journey.mjs all` → green.
- **SATISFIES**: AC #1–#5's *checkability* — this repo's recorded failure mode is the check that
  skipped the thing it tested (memory: *the check that cannot fail*).

### 9. UPDATE `system/param-manifest.json` + regenerate the count

- **IMPLEMENT**: correct the now-false `.stu-tab` label at `:67` ("4 panels" → 5, note `#218`).
- **IMPLEMENT**: new `/factory` entries, following the file's own counting rules and the
  `/components` entries at `:63-66` as the precedent for a per-component control class:
  - `[data-studio-canvas] [data-studio-docs]` — "canvas doc triggers (click or focus a component to
    open its generated docs = one control class)", note: conditional — after compile.
  - `#component-docs [data-cat-control]` — playground prop controls in the inspector.
  - `#component-docs .cat-tab` — code-tab switcher in the inspector.
  - `#component-docs .cat-copy-md` — copy spec as Markdown in the inspector.
- **IMPLEMENT**: `node agent-layer/gen-param-count.mjs`
- **GOTCHA**: the manifest's `$description` states the counting rules — read it and follow it rather
  than pattern-matching the diff. Conditional controls ARE listed (`:68-72` are the precedent).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` → no drift; `node tooling/drift-check.mjs`
- **SATISFIES**: the epic's standing per-ticket list

### 10. REGENERATE `system/loc-summary.json` (+ approach baselines only if the number moved)

- **IMPLEMENT**: `git add` the two new files first — the generator counts **tracked** content
  (memory: *loc-summary counts tracked only*), so a pre-stage `--check` is a false negative. Then
  `node agent-layer/gen-loc-summary.mjs`.
- **IMPLEMENT**: inspect the diff. `approach.html` renders the **runtime** group's rounded number;
  if `linesApprox` for `runtime` did not move, the approach baselines do **not** churn and must not
  be regenerated. If it did move, they are part of Task 12's regen run.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check`; `git diff --stat system/loc-summary.json`
- **SATISFIES**: the epic's standing per-ticket list

### 11. UPDATE `CLAUDE.md`

- **IMPLEMENT**: an architecture-map entry for `system/studio-docs.mjs` in the studio cluster (the
  house voice: what it is, the calls it inherits, the lazy discriminator, the no-announcement and
  no-bus-verb decisions, its gates); an entry for `system/catalog.css`; extend the `catalog.mjs`
  entry to say mount 2 landed and what it exports for it; extend the `factory.html`/studio lines and
  the `tooling/build-checks.mjs` roster ("21 groups" → 22, plus group 22's one-line description) and
  the `tooling/studio-journey.mjs` line with `docsPass`.
- **GOTCHA**: `components.html`'s map line should note the style extraction, or the next reader looks
  for `.cat-*` in a `<style>` block that is gone.
- **VALIDATE**: read it back; the counts stated in prose match the files.
- **SATISFIES**: repo convention

### 11b. PROVE the style extraction is a no-op — before the pixel gate is asked

- **IMPLEMENT**: a throwaway computed-style comparison of `/components` across the two trees, so a
  cascade regression is caught by a *reason* rather than by a pixel diff that could equally be
  noise. Serve `origin/main` from one checkout and this branch from another (two ports), open
  `/components` in both, wait `[data-catalog="ready"]`, and for a representative node set — one
  `.cat-component`, `.cat-head`, `.cat-name`, `.cat-chip`, `.cat-playground`, `.cat-table`,
  `.cat-code`, `.cat-control`, one `.hv-*` prose node — dump
  `getComputedStyle` for `display · grid-template-columns · font-size · color · background-color ·
  border · padding · margin` and assert deep equality.
- **GOTCHA**: run this **before** Task 12. `update:docker` regenerates baselines from the tree it is
  given, so a cascade regression reaching the pixel gate first gets *re-baselined*, not caught —
  the same class of blindness `tooling/vt-stack-audit.mjs` exists for (memory: *VR gate reads the
  working tree*, and #171's re-baselined regression).
- **GOTCHA**: also compare **`/factory`**'s existing nodes the same way — the new sheet is linked
  there too, and a rule in it that is broader than intended (a bare `table`, `pre` or `[hidden]`
  selector) would silently restyle the studio. If any `.cat-*` selector in the moved block is not
  class-scoped, scope it before running this.
- **VALIDATE**: the comparison prints "identical" for every sampled property, or names the first
  property that moved. Delete the script afterwards — it is a one-time proof, not a gate to maintain
  (say so in the report).
- **SATISFIES**: the "`/components` unchanged" claim in Task 12, before it is spent on pixels

### 12. REGENERATE the visual baselines

- **IMPLEMENT**: merge `origin/main` first and check `mergeStateStatus` (memory: *reviews validate
  the pre-merge tree*; the epic's baseline-collision rule). Then commit the work, create a **clean
  detached worktree under `/Users`** (never `/private/tmp` — Docker cannot share it), and run
  `cd tooling/visual-regression && npm run update:docker`.
- **EXPECTED CHURN — state it before running and check it after**:
  - `factory` × 2 packs (neutral + saulera) — the fifth tab and the panel are visible at rest. AC #6.
  - `approach` × 2 packs — **only if** Task 10's runtime `linesApprox` moved.
  - `/components` × 2 packs — **expected UNCHANGED**. The style extraction is a move, not a rewrite;
    a diff here means the cascade or a rule changed and must be explained before it is accepted.
  - `/build` × 2 packs — **expected UNCHANGED**, and stated rather than assumed: `/build` renders the
    same three primitives through the same `pattern-render.mjs`, so a diff there means this ticket
    reached shared code it had no business reaching.
  - Everything else: unchanged.
- **GOTCHA**: `update:docker` screenshots the working tree, and it will not rewrite a baseline whose
  only change is sub-perceptual (memory) — if a factory PNG refuses to update, `rm` it and re-run.
- **GOTCHA — the churn list is a BLOCKING assertion, not a note.** Write the expected file list down
  *before* the run, then diff it against
  `git status --porcelain tooling/visual-regression/baselines | sort`. An unexpected PNG (any
  `/components`, `/build`, proto or chrome-bearing page) **blocks the PR** until it is explained by
  Task 11b's comparison — never accepted because "it looks the same". Memory: *VR tolerance hides
  text changes* — a green update run is not proof a page did not change, and the converse holds too.
- **VALIDATE**: the in-container run passes; `git status` shows exactly the expected PNG set, and the
  report records the list verbatim.
- **SATISFIES**: AC #6

### 13. WRITE the report and open the PR

- **IMPLEMENT**: `.claude/reports/studio-inspector-docs-218-report.md` (the #215 report's shape:
  summary · tasks · tests added · validation results · deviations · issues · ready-for-next).
- **IMPLEMENT**: `piv-create-pr`; the body **must** carry `Closes #218`.
- **VALIDATE**: `gh pr view --json body | grep -c "Closes #218"` → 1
- **SATISFIES**: repo convention (#78's lost day)

---

## TESTING STRATEGY

There is no test suite in this repo and none is to be invented (CLAUDE.md). "Done" = the gates below,
each of which must be shown able to fail.

### Pure gate (CI) — `tooling/build-checks.mjs` group 22

Index integrity over the real artifacts · every component the committed board would compile resolves
through the index · the class-rename mutation · `headingTags` · **the join's arity driven through a
stub fetch, with the graph-omitted mutation** · **`shouldLoad`'s truth table and the pinned
`COMPILED_SELECTOR`** · the stated boundary (the rules are gated here; the wiring is `docsPass`'s).

### Running-page gate (operator-run) — `tooling/studio-journey.mjs` `docsPass`

Eleven assertions × chromium/firefox/webkit, listed in Task 8 — including the two halves of the lazy
invariant (zero requests at rest, exactly one per url across repeated re-renders), the cross-page
fact comparison run BEFORE the pack swap, and the code panels read as computed `display`.

### Gate-integrity drill — Task 8b

Seven mutations, each naming the gate that must redden and the text it must produce. A green
mutation is a finding about the check, not a pass.

### Extraction proof — Task 11b

Computed-style equality for `/components` **and** `/factory` across both trees, run before any
baseline is regenerated (the pixel gate re-baselines this class of regression rather than catching
it).

### Pixel gate — `tooling/visual-regression`

/factory under both packs, at rest, with the panel showing its empty state.

### Edge Cases

- **Compile → click → Back to blocks**: the panel keeps showing the last component's docs while the
  canvas holds no components. Decide and state it: keep (docs are not stale — they describe a
  component, not the canvas) and leave the empty state hidden. Do **not** silently clear, and do not
  invent a "the canvas changed" sentence.
- **A `?b=` restore with a declined replay**: the canvas has the sender's board, uncompiled — the
  discriminator holds, nothing fetches.
- **A method-card redraft mid-compile**: `adoptBoard` reverts the beat and re-places blocks; the
  triggers vanish with the nodes and `publishBoard`'s `docs.refresh()` finds no `.stf-screen`.
- **Nested components** (`vd-status-chip` inside `vd-care-task-row`): innermost wins, by `closest`.
- **A component in the pack with no vocabulary entry**: `renderComponentDocs` already renders "not in
  the agent vocabulary" (`system/catalog.mjs:219-224`) — inherited, not re-handled.
- **Reduced motion**: nothing here animates. Assert nothing; state it in the header.
- **A 404 on any of the three artifacts**: refusal sentence in the panel, clean console, retry on the
  next refresh.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Node-import safety

```bash
node -e "import('./system/studio-docs.mjs').then(m=>console.log('ok', Object.keys(m)))"
node -e "import('./system/catalog.mjs').then(m=>console.log('ok', typeof m.headingTags, typeof m.watchPackSwap))"
node -e "import('./system/studio.mjs').then(()=>console.log('ok'))"
```

### Level 2: Pure gates (CI-equivalent)

```bash
node tooling/build-checks.mjs          # → all 22 groups pass
node tooling/drift-check.mjs           # loc · param · handoff · replay · inspect-mounts
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
```

### Level 3: Running-page gates

```bash
PORT=4759 node tooling/visual-regression/serve.mjs &
BASE=http://127.0.0.1:4759 node tooling/studio-journey.mjs all      # incl. the new docsPass
BASE=http://127.0.0.1:4759 node tooling/catalog-journey.mjs all     # regression guard on mount 1
BASE=http://127.0.0.1:4759 node tooling/build-journey.mjs all       # regression guard on /build
BASE=http://127.0.0.1:4759 node tooling/vt-verify.mjs all           # /factory still opens the expected transition counts
```

### Level 4: Manual validation

1. `/factory` at rest: five tabs; the Component panel shows its precondition sentence; nothing in
   the network panel for `pack.json`.
2. Compile → click a `ds-metric-tile`: docs open, tab switches, playground renders, code tabs
   switch, "Copy spec as Markdown" copies the committed spec.
3. Tab from a `.stx-grab` into the screen: each component is a stop, the panel follows, **focus
   stays on the canvas**. Then repeat **with inspect on**: the bubble and the panel both open (the
   accepted double-open, Task 4's gotcha) — confirm it reads as one act, and that the bubble does
   not cover the panel it duplicates.
4. Dock → saulera: the token table's live values change; the raw pack columns do not.
5. Turn inspect on, reload, compile, hover a tile: the bubble opens. Back to blocks → Compile →
   hover: it still opens.
6. 390px viewport: the inspector's compact docs do not overflow horizontally.
7. `/components` unchanged — spot-check one component against step 2's panel, field by field.

### Level 5: Mutation drill (required — this repo's named failure mode)

**Task 8b owns this** — its seven-row table is the drill, and each row names the gate that must go
red and the text it must produce. Two rows are the ones most likely to be skipped under time
pressure and are the two that decide whether AC #3 and the lazy invariant are gated at all: the
two-argument `prepareHandoff` (row 1) and the unconditional `shouldLoad` (row 2). Run them.

Revert every mutation and re-run the full set before committing.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — Clicking any placed component opens its docs in the inspector; keyboard focus does
      the same. *(Scoped honestly: "placed component" = a vocabulary component on the canvas, which
      exists after Compile. The panel states the precondition; the trigger set is asserted against
      the rendered set, not a literal.)*
- [ ] **AC #2** — After any canvas re-render (compile, replay step, undo, drag) the inspect layer is
      re-initialised — verified by persisting inspect on, re-rendering, and hovering.
- [ ] **AC #3** — The inspector and `/components` show the same facts for the same component,
      asserted against one join **in two places**: build-checks group 22 case 5 drives
      `loadDocsModel` with a stub fetch (three urls, third-argument fields present), and `docsPass`
      assertion 5 compares the rendered tables across the two pages. The two-arg-`prepareHandoff`
      mutation is proven to redden **both**.
- [ ] **AC #4** — Token values resolve live via `getComputedStyle`; none is read from an artifact
      (proven by the pack swap changing them).
- [ ] **AC #5** — The expert toggle (`INSPECT_KEY`) persists across a reload and is off by default;
      the at-rest VR is unchanged by it.
- [ ] **AC #6** — Factory baselines regenerated (the inspector's fifth panel is visible at rest);
      `/components` baselines verified unchanged.
- [ ] **The lazy invariant is gated twice** — `shouldLoad`'s truth table + `COMPILED_SELECTOR`
      pinned in CI (group 22 case 6), zero-at-rest and once-per-url-after-render on the running page
      (`docsPass` assertion 1).
- [ ] **The extraction is proven a no-op by reason before it is proven by pixels** — Task 11b's
      computed-style comparison across both trees, for `/components` **and** `/factory`.
- [ ] No second copy of any doc fact — `renderComponentDocs` is imported, not forked.
- [ ] `system/studio-docs.mjs` joins build-checks group 7 with no exception argued.
- [ ] Zero console/page errors across `studio-journey`, `catalog-journey`, `build-journey`.
- [ ] param-manifest + count, loc-summary, CLAUDE.md, report, `Closes #218`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validated immediately
- [ ] `node tooling/build-checks.mjs` → all 22 groups pass (and again with `portal/node_modules`
      moved aside, proving the SDK-free invariant)
- [ ] `node tooling/drift-check.mjs` → every section green
- [ ] `studio-journey all` · `catalog-journey all` · `build-journey all` · `vt-verify all` green
- [ ] Task 8b's mutation drill performed **and reverted**, all seven rows recorded in the report with
      the failure text each produced (a mutation that stayed green is a finding about the gate)
- [ ] Task 11b's computed-style comparison run and its verdict recorded; the throwaway script deleted
- [ ] The baseline churn list written down BEFORE the regen and diffed against `git status` after
- [ ] Baseline churn matches the stated expectation exactly (factory ×2, approach ×2 only if loc
      moved, `/components` unchanged)
- [ ] Plan, report and review committed on the same PR (`.claude/plans/`, `.claude/reports/`,
      `.claude/code-reviews/pr-<N>-review.md`)
- [ ] PR body carries `Closes #218`

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **"Expert mode" is an identification, not a new build.** The ticket says expert mode *is* the
   persisted inspector/gates toggle. This plan reads that as: do not invent a third mode UI, do not
   relabel the existing toggle (AC #5's "does not alter the VR at-rest" forbids the churn a relabel
   causes), and do not gate the doc clicks behind it. **If the owner wanted the doc triggers to
   appear only in expert mode, say so before Task 4** — it changes the decoration path and
   `docsPass` assertions 2-4, nothing else. The argument against gating: AC #1 says "any placed
   component", unconditionally, and a pointer/keyboard split on a toggle would be an a11y defect.
2. **"Placed component" means a compiled one.** On /factory a `.stx-slot` is a *place/screen*; real
   vocabulary components appear only after Compile (`system/studio-compile.mjs`'s applySwap). This
   plan therefore ships an honest empty state naming the precondition rather than inventing docs for
   fat-marker blocks. If the intent was that clicking a fat-marker block should show *the place's*
   something, that is a different feature and a different ticket.
3. **The fifth tab goes last.** Second position (right after "This build") would arguably serve the
   reader better; last position keeps `studio-journey`'s existing arrow-key assertions unedited and
   disturbs the at-rest strip least. Cheap to change if the owner prefers second — one markup move
   plus one journey assertion.
4. **`system/catalog.css` is an extraction, not a rewrite.** The assumption that `/components`
   baselines stay byte-identical is checked, not asserted — Task 12 treats any `/components` diff as
   a finding.
5. **`headingTags` lives in `catalog.mjs`.** It is the renderer's concern and is gated by group 21
   (or 22 — pick one and state it in the header). Not a shared util file; this repo copies small
   helpers per module deliberately.

---

## NOTES (open canvas)

**Why not a marker attribute from the renderer.** The obvious implementation is
`agentic-renderer.mjs` writing `data-component="metric-tile"` on every root. It was rejected: that
output is a shipped contract with five consumers, and one of them — the catalog's own HTML code tab —
**serializes `outerHTML` and shows it to the reader as copy-ready markup**
(`system/catalog.mjs:370`). Adding a marker would put a studio-internal attribute into every
copy-pasted snippet on `/components`. The class-derived index costs one `Map` and touches nothing
shipped.

**Why the docs index is not `INSPECT_IDS`.** They look like the same table and are not.
`INSPECT_IDS` (`system/pattern-render.mjs:93-97`) is hand-copied from `system/inspect-data.json`,
covers three primitives, and exists because an unknown id aborts the *entire* inspect activation at
runtime. The docs index is derived from the generated pack, covers everything, and its failure mode
is one dead click. Merging them would give the merged list two sources of truth and two failure
modes.

**The three risks this plan carries, and where each one is answered.** Written down because a risk
without an owner is a risk that gets discovered in review.

| Risk | Why it is dangerous | Answered by |
|---|---|---|
| AC #3 passes by construction — both mounts share a renderer, so comparing their output proves nothing about drift | The comparison looks like the strongest check in the plan and could be the weakest | The join is extracted into one CI-drivable function (`loadDocsModel`, Task 4). Group 22 case 5 drives it with a stub fetch and asserts the third argument's fields survived; `docsPass` 5 compares the rendered pages; Task 8b row 1 proves BOTH go red on a two-arg regression |
| "At rest nothing is fetched" is invisible to every existing gate — identical pixels, no artifact, no browser in CI | An eager fetch, or a re-fetch per render, ships silently and stays | The rule becomes a function (`shouldLoad` + `COMPILED_SELECTOR`, Task 4) gated in CI by group 22 case 6; the wiring is `docsPass` assertion 1, split into zero-at-rest AND once-per-url-after-render; Task 8b rows 2, 3 and 7 prove all three can fail |
| A style extraction that quietly changes the cascade would be **re-baselined** by `update:docker` rather than caught | The pixel gate regenerates from the same tree — #171's exact failure, and it survived a green gate | Task 11b proves the no-op by computed style across both trees, for `/components` and `/factory`, BEFORE any baseline is regenerated; Task 12's churn list is a blocking assertion with an explicit expected file set |

**The one property no gate but `docsPass` can see.** "At rest this page has fetched nothing for the
docs panel" is invisible to build-checks (no browser), to the pixel gate (identical pixels either
way) and to drift-check (no artifact involved). It is exactly the shape of regression this repo's
memory file is full of — a check that skipped the thing it tested — so `docsPass` asserts it first,
before anything else, on a page that has not been compiled.

**Sequencing.** Tasks 1-6 are one coherent commit ("the second mount"); 7-8 are the gates; 9-11 the
cascades; 12 needs a commit to check out. #215's report recommends exactly this split and records why
(the worktree regen requires a committed tree).

**A cheap follow-up worth noting, not doing here.** Once #219 puts the protos on the canvas as
device frames, the same decoration could run inside those documents — but a frame is a separate
document with its own `getComputedStyle` root, so the token values would be honest only if resolved
there. That is a real design question and belongs to #219 or later, not to this ticket.

## AMENDMENTS

(none — created 2026-08-14)
