# Feature: `/factory` becomes the studio — route surgery, orchestrator, docked inspector

**Ticket:** [#206](https://github.com/linardsb/ux-factory/issues/206) · **Epic:** [#202](https://github.com/linardsb/ux-factory/issues/202)
· **Architecture:** `docs/epics/prototype-studio.architecture.md` · **PRD:** `docs/epics/prototype-studio.prd.md`

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing. Pay special attention to the naming
of existing exports and mount attributes — every module this ticket touches is imported, never
forked, and importing the wrong name is the one failure mode that makes the whole approach a lie.

## Feature Description

`/factory` — the route reserved from day one as the deep-linkable flagship — stops being an evidence
exhibit page and becomes **the studio surface**: a canvas holding the drafted breadboard as
fat-marker blocks, a docked inspector beside it, and Act 0 (the visitor's own token export, or one
colour) mounted above by **importing `/build`'s shipped modules rather than forking them**.

Nothing new is invented that already exists. The canvas is `system/studio-canvas.mjs` (#204) and its
verbs are `system/studio-verbs.mjs` (#205), both shipped and gated. The import act is
`system/build-import.mjs` self-booting on its own mount attributes. The board is
`system/breadboard.mjs`'s `draftBoard` over `system/build-questions.mjs`'s shared answer store. What
this ticket adds is **one orchestrator (`system/studio.mjs`) and one page rewrite** that puts those
existing pieces on one surface, plus the surface's own layout in `system/studio.css`.

This is route surgery, not a new page: pack-boot's allowlist, the VR page set, the footer site index
and `param-manifest.json`'s scope clause **already include `/factory`**. The work is a rewrite of a
page that is already gated, so the deliverable includes regenerating its two pixel baselines.

## User Story

As a **hiring manager evaluating this portfolio in 5–15 minutes**
I want to **arrive at one surface where the method's artifact is already on a canvas I can move,
under a brand I can supply, with the evidence for every claim one panel away**
So that **I experience "brief in, product out" as a tool I am inside, instead of reading about it
across four pages.**

## Problem Statement

The concept is scattered across six surfaces (PRD §Problem 1), and `/factory` — the strongest route
name on the site — spends itself on a tabbed viewer of three read-only exhibits. The canvas
substrate (#204) and its manipulation verbs (#205) are shipped, gated cross-engine and driven by
`tooling/studio-journey.mjs`, but they live **only** on `studio.html`, an off-nav `noindex` harness
that is not in the IA, not in the footer index and not in the VR page set. Every downstream ticket in
the epic — the compile beat (#207), the replay driver (#209), the export rail (#210), the flows
(#212), the inspector docs (#218) — is blocked on the canvas having a public, designed home.

## Solution Statement

Rewrite `factory.html` around a two-column studio shell and add `system/studio.mjs`, a hand-written
canon orchestrator that:

1. mounts the canvas (`initStudioCanvas`) and places the **drafted board** on it as fat-marker place
   blocks — one block per place, entry place first, laid out along row 1;
2. mounts the verbs (`mountCanvasVerbs`) **after** the placement loop, so the history's initial
   snapshot is the real arrangement (`studio.html:138-142`'s ordering rule, and #230's reason);
3. drives a **docked inspector** — a structural grid column, never `position: sticky`, which is a
   no-op site-wide under `body { overflow-x: clip }` — whose panel list is
   **This build · Traces · Round-trip · Graph**. "This build" is the at-rest panel; the three
   absorbed exhibits **mount lazily on activation**, which is what makes factory's three current
   at-load ready handles stop existing;
4. leaves Act 0 to `build-import.mjs`, which self-boots on the mount attributes the page now carries.
   `pack-import.mjs` stays the ONE mapping engine and `vetTokens` stays the ONE application point —
   both by importing, never by copying.

`/build` is not edited at all. It keeps its six acts and its `?b=` restore over the same store, which
is what makes the PRD's form-mode fallback structurally guaranteed rather than promised.

## Decisions made in this ticket (both were the ticket's to make)

**D1 — The three exhibits become docked inspector panels**, lazily mounted, with their panel ids
(`agents` · `round-trip` · `shape`) and hash activation **preserved verbatim**. Preserving those ids
is not cosmetic: `system/palette.mjs:102-104` registers three ⌘K deep-link commands against them and
the palette **memoizes its command list at first open**, and `roundtrip.html:176` links back to
`/factory#round-trip`. Renaming a panel id silently breaks four inbound entry points.

**D2 — The nav/footer label stays "Factory"; the rename to "Studio" is handed to #216.**
Recorded here because the ticket requires the decision to be made once, deliberately. Rationale: the
label lives in `system/client.neutral.config.js:46` (footer site index), so changing it churns all
16 chrome-bearing baselines, and the epic's baseline-collision rule says a chrome ticket runs alone.
#216 (IA re-point) already rewrites nav and footer and already "runs alone". Doing it here would
block every other baseline-touching ticket for this PR's lifetime and buy nothing the route does not
already say. **This PR therefore regenerates exactly four baselines: factory ×2, approach ×2.**

## Out of Scope / Non-Goals

- **Not the compile beat.** The canvas holds fat-marker *blocks*, not real token-skinned components.
  Blocks → components is **#207**, and it is the next ticket; do not pre-empt it.
- **Not connection lines / flow navigation.** The board's `connections` are stated as text in the
  "This build" panel. Drawing them is #212 (flows) and #217 (guides).
- **Not arrangement persistence, and not `?b=` restore on this route.** A moved block is not written
  to the share link, and a `?b=` link opened on `/factory` does nothing — `build-keep.mjs` owns the
  restore and is not mounted here. The codec's `g` field is **#208** and the studio keep rail is
  **#210**; `readBuild()` is read here, and this ticket never calls `publishBuild` or `restoreBuild`.
- **Not selection, not component docs in the inspector.** "Click a placed component → its docs open"
  is **#218**, on top of #211 and #215. Do not invent a selection model this ticket will not use.
- **Not new analytics routes.** Share-created / export-downloaded / take-over are **#210**/#209.
- **Not view transitions.** The canvas names nothing for VT and this surface must not either — #190
  (stack-audit hazard-A false positives) has not landed, and `tooling/vt-stack-audit.mjs` cannot be
  trusted as a gate until it does. `system/morph.mjs` is not imported here.
- **Not touching `/roundtrip.html`, `/handoff.html`, `/agentic-ui-study.html`, `/trace.html`,
  `/agentic.html` or `/studio.html`.** `/roundtrip.html` survives standalone with its own baselines
  (slicing decision 1). `studio.html` stays the raw harness.
- **Not touching `build.html`, `system/action-bus.mjs`, `system/pack-import.mjs`,
  `system/pack-imported.mjs`, `system/build-import.mjs` or `system/build-questions.mjs`.** If you
  find yourself editing any of them, the "import, never fork" approach has gone wrong — stop and say
  so rather than forking.
- **Not the deferred #205 review findings** #231 (`place()`'s affordance behaviour + stale
  `aria-label` on re-place) and #232 (`ui.move`'s `target.component` carries the display label). Both
  are open, both are adjacent, neither is this ticket's scope — see OPEN QUESTIONS.

## Feature Metadata

**Feature Type:** New Capability (route surgery + orchestrator over shipped substrate)
**Estimated Complexity:** High — not algorithmically, but in blast radius: a gated page rewrite with
four baselines, two generated artifacts, a CI gate group and four preserved inbound entry points.
**Primary Systems Affected:** `factory.html` · `system/studio.mjs` (new) · `system/studio.css` ·
`tooling/build-checks.mjs` · `tooling/visual-regression/visual.spec.mjs` + 4 baselines ·
`system/param-manifest.json` + `param-count.json` · `system/loc-summary.json`
**Dependencies:** none new. Shipped-page hard constraint holds: vanilla, no bundler, no runtime deps.

## Related Work

**Implements:** #206 · **Epic:** #202 (`docs/epics/prototype-studio.architecture.md`)

**Back-references:**

- `.claude/plans/studio-canvas-stage-204.md` — the canvas substrate this mounts; its three
  substrate calls (DOM stage · pan is native scroll · zoom and arrangement are attributes) are
  inherited, not re-argued.
- `.claude/plans/studio-canvas-manipulation-205.md` — the verbs; its bus-is-the-drive-path invariant
  is what #209 later takes over, so this ticket must not add a second mover.
- `.claude/plans/factory-copy-inspect-panzoom-173.md` *(verified tracked in git 2026-08-05 — the
  epic's "commit both before #204 or #219" blocker is resolved)* — the current factory page's inspect toggle,
  glossary mount and graph pan/zoom window; the glossary's fail-loud arrangement is preserved here.
- `.claude/plans/v3-evidence-home-restructure.md` (#78) — the tabbed evidence viewer being absorbed.

**Forward-references:**

- #207 compile beat — replaces the block contents with real components on the same slots.
- #209 replay driver — takes over the canvas through `getVerbs()`'s `source:"agent"` seam.
- #216 IA re-point — owns the `Factory` → `Studio` label rename (D2 above).
- #218 inspector docs — the second mount of the generated catalog, into this inspector.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/studio-canvas.mjs` (whole file, 331 lines) — Why: the mount API you drive.
  `initStudioCanvas(root)` queries `[data-studio-canvas]`, returns
  `{ viewport, scroll, stage, announcer, place, say, fit, reset, setZoom, level, destroy }` or
  `null`, and sets `[data-studio-canvas="ready"]` in a `finally` on **every** path. `place(node,
  {col,row,name})` is idempotent and wraps the node in `.stx-slot` with a `.stx-grab` handle.
  Exports `MAX_COLS` 12, `MAX_ROWS` 8, `ZOOM_LEVELS`, `ZOOM_REST`, `clampSlot`, `fitLevel`,
  `getCanvas`.
- `system/studio-verbs.mjs:238-350` — Why: `mountCanvasVerbs(canvas, { bus })` throws a plain
  `Error` if the handle or the bus is missing, inserts the `.stx-verbs` row **before**
  `canvas.scroll`, and seeds `createHistory(snapshot())` at mount. Read lines 1-56 (the header) for
  the four load-bearing calls and the two WCAG criteria; read 360-450 for the one consumer and the
  two `history.adopt` call sites (#230).
- `studio.html:80-153` — Why: the exact mount order this page mirrors — fetch → `initStudioCanvas`
  → placement loop → `createBus()` → `mountCanvasVerbs`. The comment at :138-140 states why verbs
  mount last. Copy the ordering, not the harness copy.
- `factory.html` (whole file, 537 lines) — Why: this is what you rewrite. Lines 229-325 are the
  tablist + three panels being absorbed; 404-455 the tab controller being replaced; 457-534 the two
  inline mounts becoming lazy imports in `studio.mjs`; 26 the `pack-boot.js` tag; 210-227 the hero
  copy being rewritten.
- `build.html:696-796` — Why: Act 0's exact markup contract. The mount subtree carries
  `[data-build-import]`, `[data-build-drop]`, `[data-build-file]`, `[data-build-status]`,
  `[data-build-color]`, `[data-build-derive]`, `[data-build-reset]`; the report node is
  `[data-build-report]`; the stage is `id="build-stage" data-build-stage` with
  `[data-build-stage-label]`.
- `system/build-import.mjs:88-120` and `:555-563` — Why: **the required-node contract.** Line 115
  bails out (`return`, silently) unless `fileInput && dropZone && statusEl && reportEl && stage` all
  exist, where `stage` is `document.getElementById("build-stage")` — an id, not an attribute. Line
  110 captures `[...document.querySelectorAll("[data-build-stage]")]` **once**, so every stage
  element must persist for the life of the page. `[data-build-keep-empty]` /
  `[data-build-keep-actions]` are looked up on `document`; verify their use sites before deciding
  whether to include them.
- `system/breadboard.mjs:107-155` — Why: `draftBoard(answers)` → `{ places: [{id,label,affordances:
  [{id,label}]}], connections: [[affId, placeId]] }`, capped by `MAX_PLACES` 6; `isBoard(board)` is
  the shallow adopt-or-draft check.
- `system/build-questions.mjs:92-110`, `:326-370` — Why: `readBuild()` is the read seam (answers ·
  board · boardIsEdited · pack) and `DEFAULT_ANSWERS` is what makes the at-rest baseline
  deterministic. **Do not call `publishBuild` or `setAnswers` from this ticket.**
- `system/pattern-rules.mjs:150-183`, `:300` — Why: `patternFor({answers, board})` and
  `affordanceCount(board)` give the "This build" panel numbers **counted from the board**, never
  invented.
- `system/derivation-roundtrip.mjs:346-365` — Why: it self-boots at import (`if (typeof document !==
  "undefined") init()`), is inert without `#roundtrip-diff`, and sets `dataset.diff = "ready"` on
  success only. A **dynamic** `import()` at panel-activation time is therefore all the laziness
  needed — the module evaluates once.
- `system/system-graph.mjs` + `system/glossary.mjs` — Why: `prepareGraph`/`renderSystemGraph` are
  called by the page, and `initGlossary(document)` must stay in a position where an unknown
  `data-term` key aborts **before** the ready handle is set (see GOTCHA in Task 1).
- `system/inspect.mjs:60-66` — Why: `refreshInspect()`, never `initInspect()`, on a page that
  imports `inspect.mjs` statically (`factory.html:398`); `initInspect` would tear down the live
  handle `palette.mjs:118` holds.
- `system/palette.mjs:82`, `:102-104` — Why: the four ⌘K commands pointing at `/factory` and its
  three panel ids. The palette memoizes at first open; these are static entries that must keep
  resolving.
- `tooling/build-checks.mjs:725-785` (group 7) and `:1535-1560` (group 12) — Why: group 7's
  `MODULES` list is what `system/studio.mjs` must join, with **no exception argued**; group 12 pins
  `studio.css`'s hand-mirror of the caps exhaustively and in both directions.
- `tooling/visual-regression/visual.spec.mjs:15-82` — Why: the `PAGES` table, the `waitReady` vs
  `waitVisible` distinction (:54-65 states exactly when each is wrong), and the bounded re-measure
  loop at :148-187.
- `tooling/studio-journey.mjs` — Why: the cross-engine driver you extend with a `/factory` pass; its
  three-source proof and its exact-count announcement assertions are the shape to mirror.
- `system/param-manifest.json` — Why: the `$description` carries the counting rules (conditional
  controls count, marked with a note; one entry = one distinct control per page) and the seven
  existing `/factory` entries you must re-verify against the rewritten page.

### New Files to Create

- `system/studio.mjs` — the studio orchestrator, hand-written canon. ~320–380 lines including the
  header. Node-import safe (no DOM outside a function body, no self-boot at import beyond a
  `typeof document` guard) because `tooling/build-checks.mjs` imports it for its pure export.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Recommended approach · §Key decisions "Data model"
  · §Other eng-lead calls "Route surgery", "Docs, two mounts of one source", "Sticky is a no-op
  site-wide". Why: every cross-cutting call here is inherited, not re-decided.
- `docs/epics/prototype-studio.prd.md` §Scope 1 (the site IS the tool; /build survives as the
  form-mode fallback) · §Scope 5 (docked inspector). Why: the boundary of what "absorb" means.
- `CLAUDE.md` §Architecture map (the `system/` entries for every module named above) · §Where new
  code goes ("View-time behaviour on shipped pages → a hand-written ES module beside
  `system/site.js`"; "New live-manipulable control … `param-manifest.json` entry + regen") ·
  §Ground rules (token discipline; feature files open with a header citing their governing doc).
- `.claude/references/frontend-component-best-practices.md` — Why: this is UI work on a shipped page.
- The `portfolio-design` skill (`references/CRAFT.md` before writing CSS,
  `references/CHECKLIST.md` before committing). Why: this is the house frontend-design skill and
  this is the site's flagship route.

### Patterns to Follow

**File header** (every feature/entry-point module opens by citing its governing doc — see
`system/studio-canvas.mjs:1-3`, `system/studio-verbs.mjs:1-3`):

```js
// system/studio.mjs — hand-written canon (this repo; not generated). The studio's ORCHESTRATOR
// (epic #202 — docs/epics/prototype-studio.architecture.md §Recommended approach / §Other eng-lead
// calls "Route surgery"; ticket #206; .claude/plans/studio-route-surgery-orchestrator-206.md).
```

**Element construction — never markup from a string.** Group 7 bans `.innerHTML`, `.outerHTML`,
`.insertAdjacentHTML(` and `document.write(` across its module list, and `system/studio.mjs` joins
that list. Copy the local `el()` helper (`studio-canvas.mjs:80-89`) rather than importing one — every
hand-written canon module duplicates it by the same explicit decision (`device-frame.mjs:33`,
`scrub.mjs:104`).

**Zero inline styles.** No `.setProperty(`, no `.style.<name> =`. Layout comes from classes and
`data-*` attributes resolved in `system/studio.css`. This is what lets the module join group 7 with
no exception argued, and `tooling/studio-journey.mjs`'s running-page `hasAttribute("style")`
assertion is the second half of that claim.

**Readiness handle in a `finally`** (`studio-canvas.mjs:327-330`, `device-frame.mjs:195-199`):

```js
export function mountStudio(root = document) {
  const shell = root.querySelector("[data-studio]");
  try {
    if (!shell) return null;
    // …
  } finally {
    shell?.setAttribute("data-studio", "ready");
  }
}
```

**Refusals go to the live region, never a throw** (`studio-verbs.mjs:357-365`, `bus-toggles.mjs`).
`action-bus.mjs:70-77` catches handler throws into `console.error`, which hides the refusal from the
reader and trips the journey driver's no-page-errors contract.

**Pure half / mount half split** (`studio-canvas.mjs:34-73`, `studio-verbs.mjs:60-235`): everything
that can be plain-data-in / plain-data-out is exported and driven by `build-checks` in CI with no
browser.

---

## SURFACE SPEC — layout, structure, copy

Pinned here so the page rewrite is assembly rather than invention. Craft is **inherited from the
site's existing organisms**, not re-derived: read `portfolio.css` for `.band`, `.container`,
`.beat-head` / `.beat-kicker` / `.beat-title` / `.beat-lead`, `.page-hero` / `.hero-eyebrow` /
`.hero-sub`, `.row-list` / `.row-item`, `.capability`, `.fw-scenario`, `.max-prose`. Every section
below is built from those. Run the `portfolio-design` skill's `references/CRAFT.md` before writing
new CSS and `references/CHECKLIST.md` before committing — the `.stu-*` block is the only genuinely
new visual vocabulary, and it should stay small.

**Page order (top to bottom):**

1. `.page-hero` — eyebrow stamp, `<h1>`, `.hero-sub`. Retained structure, rewritten copy.
2. `.band` — **Act 0**, the import. `build.html:701-796`'s markup contract, this page's copy.
3. `.band` — **the studio shell** (`.stu-shell`): canvas column + docked inspector.
4. `.band#verify-further` — "Go deeper" `.row-list`, retained, **plus a new row pointing at
   `/build`** so the form path is findable from the surface it falls back from.
5. `.section` — the closing `.hero-cta-row`, retained.

**Shell geometry.** `.stu-shell { display: grid; grid-template-columns: minmax(0, 1fr) 22rem; gap:
var(--spacing-lg); align-items: start; }`, collapsing to one column (inspector below) under the
site's existing breakpoint. `min-width: 0` on the canvas column is mandatory. Canvas height pinned
to `640px` on this surface (Task 2). At the gate's 1280px viewport that leaves the canvas ≈ 820px
wide — comfortably more than the 220px slot width, so the drafted board's up-to-six blocks along
row 1 are partly off-stage and the reader has something to pan to. That is intended, not a bug: the
canvas is a canvas.

**Inspector panel list, in order.** `This build` (default, at rest) · `Traces` · `Round-trip` ·
`Graph`. Panel ids: `this-build` · `agents` · `round-trip` · `shape` — **the last three are fixed by
four inbound entry points and must not be renamed.** Each exhibit panel keeps its existing
`<h3>` + `.capability` chip + lead paragraph from `factory.html:262-321` (the honesty framing is
copy that was already reviewed), including the Round-trip panel's `.fw-scenario` fictional-scenario
label, retained verbatim.

**"This build" panel contents** — every number counted from the board, none invented:
the pattern named by `patternFor` **with its `reason` sentence verbatim** (the rules speak for
themselves — do not paraphrase a committed rule), the place count, `affordanceCount(board)`, the
connection count, and a line saying these came from the default answers with a link to `/build` to
change them.

**Copy posture.** The page stops being "verify the demo, claim by claim" and becomes "this is the
tool; the evidence is one panel away". The honesty contract is unchanged and load-bearing:
capability chips still state replay-not-live, the fictional label stays visible whenever its panel
is, and no sentence may claim the canvas composes anything a later ticket has not shipped — at #206
the blocks are a **drafted breadboard**, not components, and the copy says so. Resist writing
#207's sentence early.

---

## IMPLEMENTATION PLAN

### Phase 1: The orchestrator and its surface

Write `system/studio.mjs` (pure half first, then the mount) and grow `system/studio.css` with the
shell, inspector and place-block rules. Nothing is wired to a page yet, so `studio.html` must keep
working untouched throughout — it is the regression canary for the canvas modules.

### Phase 2: Route surgery

**Depends on:** Phase 1.

Rewrite `factory.html` around the studio shell: hero copy, the Act 0 markup subtree, the canvas
viewport, the inspector with its four panels (three of them empty mount points), the script tags. The
three current inline mounts and the tab controller are deleted — their behaviour now lives in
`studio.mjs`.

### Phase 3: Gates and generated artifacts

**Depends on:** Phase 2. **Independent of:** Phase 4 up to the point where the baselines are taken.

`build-checks` group 7 membership + a new group 14 for the pure layer; `param-manifest` + regen;
`gen-loc-summary` + regen; the VR spec entry; the `studio-journey` `/factory` pass.

### Phase 4: Baselines and validation

**Depends on:** Phases 2 and 3 being **complete and committed** — the gate screenshots the working
tree, so a baseline taken mid-edit bakes the edit. Four PNGs: `factory-{neutral,saulera}.png` and
`approach-{neutral,saulera}.png`.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently checkable.

### 1. CREATE `system/studio.mjs`

- **IMPLEMENT — the pure half (exported, CI-driven):**
  ```js
  // arrangeBoard(board) — pure. The board's places become canvas slots: the ENTRY place first,
  // then the rest in board order, along row 1. Returns [{ id, label, affordances, col, row }].
  // Clamped through the canvas's own clampSlot so "on the grid" has ONE definition (the
  // studio-canvas.mjs:50 rule), and a board wider than MAX_COLS is truncated with the count
  // stated rather than silently dropped.
  export function arrangeBoard(board) { … }
  // buildSummary(board, answers) — pure. { patternId, patternLabel, places, affordances,
  // connections } — every number COUNTED from the board via pattern-rules.mjs, never invented.
  export function buildSummary(board, answers) { … }
  ```
  `arrangeBoard` must be total: a null/garbage board returns `[]`, never throws — the mount's
  `finally` is not a licence to let a bad store crash the page before the canvas exists.
- **IMPLEMENT — the mount half, in this exact order** (mirroring `studio.html:121-142`):
  1. `initGlossary(document)` — **inside `mountStudio`, before the `try`** (see GOTCHA). Not at
     module scope: that would touch the DOM at import and destroy the Node-import safety that group
     14 and the Level-1 validate both depend on.
  2. `const canvas = initStudioCanvas(root); if (!canvas) return null;`
  3. `const { answers, board } = readBuild(); const a = answers ?? DEFAULT_ANSWERS;`
     `const b = isBoard(board) ? board : draftBoard(a);` — **the `??` is not defensive padding.**
     `build-questions.mjs:67` initialises `state.answers` to `null` and only `setAnswers` /
     `restoreBuild` fill it, neither of which runs on this page. Passing the raw `null` through to
     `patternFor` still "works" (`pattern-rules.mjs:167` guards it) but silently names `dashboard`
     with `named: false` — a summary that reads as a fallback instead of as an answer.
  4. placement loop: for each entry of `arrangeBoard(b)`, build a place block and
     `canvas.place(block, { col, row, name: label })`.
  5. `const bus = createBus(); mountCanvasVerbs(canvas, { bus });` — **after** the loop, so the
     history's initial snapshot is the real arrangement.
  6. render the "This build" panel from `buildSummary`.
  7. wire the inspector panel switcher (click · APG arrow/Home/End keys · `hashchange`), with the
     three exhibits lazily mounted on first activation.
  8. `if (document.documentElement.dataset.inspectMode === "on") refreshInspect();`
- **IMPLEMENT — the place block** (fat-marker, pre-compile): an `<article class="stu-place">` with
  `<h4 class="stu-place-name">` (the place label), a `<p class="stu-place-count">` stating the
  affordance count counted from the board, and a `<ul class="stu-place-affs">` of
  `<li class="stu-place-aff">` chips. **No affordance is invented and none is silently hidden** —
  the count is the whole board's, the chips clip in CSS.
- **IMPLEMENT — the lazy exhibit mounts,** one function each, each idempotent (guard on a
  `mounted` Set keyed by panel id) and each swallowing its own failure into an error card rather
  than rejecting:
  - `agents` → `import("/system/trace-player.mjs")`, fetch `/traces/demo-notice.jsonl`,
    `renderTracePlayer(mount, parseTrace(text))`, then re-apply the `data-inspect` attributes
    exactly as `factory.html:488-489` does today, then `refreshInspect()` if inspect is on.
  - `round-trip` → `import("/system/derivation-roundtrip.mjs")` — it self-boots on
    `#roundtrip-diff` and needs no call.
  - `shape` → `import("/system/system-graph.mjs")`, fetch `/system/system-graph.json`,
    `renderSystemGraph(mount, prepareGraph(json))`.
- **PATTERN:** `studio.html:80-153` (mount order) · `studio-canvas.mjs:80-89` (`el`) ·
  `factory.html:404-455` (the tab controller's activate/keydown/fromHash logic — port it, do not
  reinvent it) · `pattern-render.mjs:293-294` (the lazy gated `import().then().catch(() => {})`
  idiom).
- **IMPORTS:** `initStudioCanvas`, `MAX_COLS`, `MAX_ROWS`, `clampSlot` from `./studio-canvas.mjs` ·
  `mountCanvasVerbs` from `./studio-verbs.mjs` · `createBus` from `./action-bus.mjs` · `draftBoard`,
  `isBoard` from `./breadboard.mjs` · `readBuild`, `DEFAULT_ANSWERS` from `./build-questions.mjs` · `patternFor`,
  `affordanceCount` from `./pattern-rules.mjs` · `initGlossary` from `./glossary.mjs` ·
  `refreshInspect` from `./inspect.mjs`. Relative specifiers (Node-safe); **fetch URLs are
  root-absolute** — `derivation-roundtrip.mjs:344-345` states that split.
- **GOTCHA — `initGlossary` goes OUTSIDE the `try/finally`, deliberately.** #173's arrangement puts
  it inside the module that owns the VR ready handle so an unknown `data-term` key aborts *before*
  the handle is set and the gate fails LOUD (`docs/epics/annotated-source-glossary.architecture.md`;
  `factory.html:508-514`). This ticket's handle is set in a `finally` (an explicit AC), which would
  destroy that property if the call sat inside. Putting it first and unguarded restores it exactly:
  a bad key throws, the `finally` never runs, the handle is never set, the gate hangs, the run fails.
  **Write this reasoning into the file** — a future reader will otherwise "tidy" it into the `try`.
- **GOTCHA — do not add a second mover.** All movement goes through `mountCanvasVerbs`'s one bus
  consumer. #209's replay driver takes over through `getVerbs()`; a direct `applySlot` here would
  give it a seam to fight.
- **GOTCHA — no `publishBuild` / `setAnswers`.** This ticket reads the store. Writing it would make
  `/build`'s state depend on a visit to `/factory` in a way no AC asks for and no gate covers.
- **GOTCHA — zero inline styles, zero markup-from-string.** Group 7 is about to include this file.
- **VALIDATE:** `node --check system/studio.mjs && node -e "import('./system/studio.mjs').then(m =>
  console.log(Object.keys(m)))"` — must print the exports and touch no DOM (proves Node-import
  safety, the property `build-checks` depends on).
- **SATISFIES:** AC #1.

### 2. UPDATE `system/studio.css`

- **IMPLEMENT:** a new `/* ---------- the studio surface (#206) ---------- */` section:
  - `.stu-shell { display: grid; grid-template-columns: minmax(0, 1fr) 22rem; gap: var(--spacing-lg); align-items: start; }`
    and a single-column collapse under a container/media breakpoint. **`min-width: 0` on the canvas
    column is not optional** — a grid item holding a wide scroller blows the track out otherwise
    (memory: `vr-gate-single-engine-blindspot`).
  - `.stu-inspector` (the docked column — structural, **never `position: sticky`**, which is a
    site-wide no-op under `body { overflow-x: clip }`), its panel list, its panel bodies.
  - `.stu-place*` — the fat-marker block: dashed border, muted fill, clipped affordance chips,
    `overflow: hidden` (the slot is 220×140 and `.stx-slot` already clips).
  - Pin the canvas height on this surface: `.stu-shell .stx-scroll { height: 640px; }`. **Why:** the
    shared rule is `height: min(70vh, 640px)`, which is bounded and therefore *not* a fixpoint
    hazard for the VR re-measure loop — verify that before you change anything else — but under the
    gate the viewport is resized to the full document height, so `70vh` always resolves past the cap
    and the baseline shows 640px where a 1280×800 reader sees 560px. Pinning makes the baseline the
    reader's canvas, and removes the whole *class* of viewport-height feedback from a captured
    surface. Record that reasoning in the sheet.
- **GOTCHA — token discipline.** Colour, spacing, radius and type come from `var(--…)`; grid tracks,
  fixed px and percentages are structural literals and are fine. A brand value or a colour literal
  here is a bug.
- **GOTCHA — do not touch the `--stx-*` mirror block or the zoom table.** `build-checks` group 12
  pins them exhaustively and in both directions.
- **GOTCHA — name nothing for a view transition** (`studio.css:17`, `studio-canvas.mjs:25-28`).
- **VALIDATE:** `node tooling/build-checks.mjs` — group 12 must still pass unchanged.
- **SATISFIES:** AC #1.

### 3. UPDATE `factory.html` — the rewrite

- **IMPLEMENT — head:** add `<link rel="stylesheet" href="/system/studio.css" />` after
  `portfolio.css` and **before** `<script src="/system/pack-boot.js">`. `pack-boot.js` re-points the
  one `tokens.<pack>.css` link and its tag must stay the last `<link>`/`<script>` in the head, as on
  every other shipped page (`index.html:13-17`). Update `<title>` and `<meta name="description">` to
  describe the studio. Keep `<meta name="robots" content="noindex">` as it is today.
- **IMPLEMENT — hero:** rewrite the eyebrow stamp, `<h1>` and `.hero-sub` for the studio. Keep the
  `<dfn class="term" data-term="…">` marks only for keys that exist in the glossary — an unknown key
  now aborts the whole mount (Task 1's gotcha), which is the intended loudness, not a trap to spring
  on yourself.
- **IMPLEMENT — Act 0:** port `build.html:701-796`'s markup subtree into a section above the shell.
  Required nodes or the module **silently returns** (`build-import.mjs:115` — a bare `return`, no
  console error, and a pixel-identical at-rest capture, so nothing in CI can see it):
  `[data-build-import]`, `[data-build-drop]`, `[data-build-file]`, `[data-build-status]`,
  `[data-build-report]`, and an element with **`id="build-stage"`**. **The lookup scopes split, and
  getting it wrong is how the act dies silently:** `[data-build-file]`, `[data-build-drop]`,
  `[data-build-status]`, `[data-build-color]`, `[data-build-derive]` and `[data-build-reset]` are
  queried on `root` (the `[data-build-import]` element itself, `:88-98`), while
  `[data-build-report]`, `[data-build-stage]`, `[data-build-stage-label]`,
  `[data-build-keep-empty]` and `[data-build-keep-actions]` are queried on `document` (`:99-113`).
  The first six must be **inside** the `[data-build-import]` subtree. Put `id="build-stage" data-build-stage` on the **canvas
  column wrapper**, so an imported design skins the canvas itself — that is the point of mounting
  the import act here. Keep `[data-build-color]` / `[data-build-derive]` / `[data-build-reset]` (the
  one-colour path the ticket names) and `[data-build-stage-label]`. **Omit `[data-build-keep-empty]`
  and `[data-build-keep-actions]`** — verified optional (`build-import.mjs:334` returns early
  without them and every later use is guarded), and the Act-0 pack download belongs to the keep
  rail, which is **#210**. Copy is rewritten for this page; the markup contract is not.
- **IMPLEMENT — the shell:** `<div class="stu-shell" data-studio>` containing the canvas column
  (`<div data-studio-canvas id="canvas">`, plus the `id="build-stage"` wrapper) and
  `<aside class="stu-inspector">` with the four-item panel list and four panel bodies. **Panel ids
  stay `agents`, `round-trip`, `shape`** plus the new `this-build`; the three exhibit panels contain
  only their empty mount nodes (`#agents-player`, `#roundtrip-diff`, `#system-graph`) and their
  honesty framing — including the round-trip panel's `.fw-scenario` fictional-scenario label, which
  is retained verbatim.
- **IMPLEMENT — KEEP the absorbed exhibits' stylesheet, verbatim. This is the one deletion that
  would ship green.** About half of factory.html's `<style>` block is not page chrome — it is the
  only styling the two mount-driven exhibits have:
  - **`.trace-*`, lines 103-168** — `trace-player.mjs` injects no `<style>`; the page styles the
    classes it emits (`factory.html:102-103` says so).
  - **`.sg-*`, lines 170-204** — the graph's nodes, edges, legend and #173's `.sg-scroll` pan window.

  Move both blocks verbatim into `system/studio.css` under a
  `/* ---------- absorbed exhibits (#206) ---------- */` heading, or leave them in the page's
  `<style>`; either is fine, **dropping them is not**. Note `.sg-scroll`'s `max-height: min(70vh,
  760px)` and its comment at `:173-177`, which reasons from the panel being hidden at capture —
  that premise still holds (the panel is now unmounted at capture), so the rule moves unchanged.
  **Why this is called out as blocking:** the exhibits are now lazily mounted, so *nothing captures
  them* — a completely unstyled trace player passes `update:docker`, `build-checks` and
  `drift-check` alike. It is this repo's own `check-that-cannot-fail` shape. Task 8's panel-content
  assertions are the replacement coverage.
- **IMPLEMENT — no-JS state:** with scripting off, the panels stay visible and the copy says what
  the surface does; no control that does nothing (`build.html:699-700`'s licence).
- **IMPLEMENT — scripts:** delete the inline tab controller (:404-455), the traces mount
  (:462-501), the graph/glossary mount (:506-534) and the static
  `<script type="module" src="/system/derivation-roundtrip.mjs">` tag (:394) — that last one is what
  makes the round-trip exhibit genuinely lazy. Add
  `<script type="module" src="/system/studio.mjs">`. Preserve the ordering rule: nothing moves above
  `dock.mjs` and `palette.mjs` stays last (`index.html:422-424`).
- **IMPLEMENT — keep:** the "Go deeper" section (:329-376) and the closing CTA row, updated for the
  new page; add a row pointing at `/build` as the form path — the PRD's fallback should be findable
  from the surface it falls back from.
- **GOTCHA — four inbound entry points depend on the panel ids:** `palette.mjs:102-104` (three
  memoized ⌘K commands), `roundtrip.html:176` (`/factory#round-trip`), and any bookmark. Hash
  activation must also trigger the lazy mount, or a deep link lands on an empty panel.
- **GOTCHA — `data-inspect` values are COPIED from `system/inspect-data.json`, and this is gated.**
  An unknown id aborts the whole inspect activation at runtime for every mount on the page
  (`factory.html:485-487`), **and `tooling/drift-check.mjs:98-115`'s inspect-mounts pass reads
  tracked HTML and fails CI naming the page**. The page uses exactly two ids today (`buttons`,
  `page-hero`); the available set is `buttons · header · footer · cards · decision-card-organism ·
  page-hero` plus the component-specific ones. **Do not invent one for the `.stu-*` classes** —
  they are this page's own surface, not consumer blocks in the system graph, exactly as
  `build.html:760-765` argues. The lazily-mounted trace steps keep their `cards` / `buttons` mounts,
  applied in JS (so drift-check's tracked-HTML pass cannot see them — the `site.js:40-42` rule).
- **VALIDATE:** `npx serve .` then open `/factory.html` — canvas mounted with the drafted board,
  verbs row present, all four panels reachable by click and by arrow keys, `/factory#shape` deep-links
  and mounts, drop a token export and watch the canvas re-skin, **zero console errors**.
- **SATISFIES:** AC #1, #4 (by not touching `/roundtrip.html`), #5 (by not touching `build.html`).

### 4. UPDATE `tooling/build-checks.mjs` — group 7 membership + group 14

- **IMPLEMENT:** add `"studio.mjs"` to group 7's `MODULES` (`:742-746`) with a comment saying it
  joins with **no exception argued** — zero style writes, zero markup-from-string sinks — in the
  same voice as the `studio-canvas.mjs` / `studio-verbs.mjs` notes above it.
- **IMPLEMENT:** a new **group 14 — THE STUDIO ORCHESTRATOR'S PURE LAYER**, driving
  `arrangeBoard` and `buildSummary` over synthetic in-memory boards: the drafted default board; a
  board at `MAX_PLACES`; an empty board; `null` and a garbage object (total, no throw); and a board
  whose counts must match `affordanceCount`'s answer rather than a re-count. **The
  wider-than-`MAX_COLS` case is deliberately vacuous and must be labelled so** — `MAX_PLACES` is 6,
  `MAX_COLS` is 12, and the codec validates against `MAX_PLACES`, so no reachable board overflows
  the row. Keep the truncation clause guarded the way group 1 keeps its `inLibrary: false ⇒ needs`
  clause: it is the contract a `MAX_PLACES` raise gets, and the comment must say that rather than
  letting a reader mistake it for live coverage. Reuse group 13's hand-written recursive
  canonical stringify for deep compares — **not** `JSON.stringify(v, keys)`, whose array second
  argument is a *replacer* that filters property names at every level and made every comparison in
  group 13 vacuous until a mutation sweep caught it.
- **IMPLEMENT:** update the tally line at `tooling/build-checks.mjs:1921` —
  `"\nbuild ✓  all 13 groups pass"` → `14`. A new group that leaves the count saying 13 is the
  smallest possible version of a check that lies about its own coverage.
- **GOTCHA — the check must be able to fail.** Before you call this done: mutate `arrangeBoard`
  (swap `col` and `row`; drop the truncation) and watch group 14 go red. Every #137 defect survived
  a green gate the same way — the check skipped the thing it tested.
- **GOTCHA — state the boundary you cannot reach,** as groups 9, 11 and 13 do: the mount half, the
  lazy panel mounts and the glossary's fail-loud arrangement are running-page facts owned by
  `tooling/studio-journey.mjs` and the VR gate.
- **VALIDATE:** `node tooling/build-checks.mjs` — all 14 groups green; then the mutation sweep above.
- **SATISFIES:** AC #1, and the epic's "gate rigor rides along" clause.

### 5. UPDATE `system/param-manifest.json` + regenerate `param-count.json`

- **IMPLEMENT:** under the **existing `/factory` key** (it is not a new page):
  - re-verify the seven current entries against the rewritten page. The three exhibit controls
    (`#agents-player .trace-controls button`, `#system-graph .sg-node`, `#system-graph .sg-zoom
    button`, `#system-graph .sg-scroll`, `#roundtrip-diff .cmp-handle`) are now **conditional** —
    keep them and add `"note": "conditional — the panel mounts on activation"`. `.ev-tab` becomes
    the inspector's panel switcher: update the selector and the label.
  - add the new controls, one entry per distinct control per the `$description`'s granularity rule:
    the canvas zoom row (`.stx-zoom button` = one row), the canvas pan surface (`.stx-scroll`), the
    per-slot move handle (`.stx-grab` — per-item verb = 1), the undo/redo row (`.stx-verbs button`),
    the token-export drop zone, the one-colour input, derive, clear the stage, and the Act-0 pack
    download if Task 3 included the keep nodes (conditional, noted).
- **IMPLEMENT:** `node agent-layer/gen-param-count.mjs`.
- **GOTCHA:** `approach.html` renders the **site-wide total**, so this regeneration is one of the two
  reasons approach's baselines churn in this PR (Task 7 is the other). Do not take baselines before
  both have run.
- **VALIDATE:** `node agent-layer/gen-param-count.mjs --check` exits 0.
- **SATISFIES:** AC #6.

### 6. REGENERATE `system/loc-summary.json`

- **IMPLEMENT:** `node agent-layer/gen-loc-summary.mjs`. `system/studio.mjs` is a new **tracked**
  source file, so the counts move.
- **GOTCHA:** `gen-loc-summary` reads **git-tracked** content — a `--check` run before the new file
  is staged reports a false "no drift" (memory: `loc-summary-counts-tracked-only`). `git add` the new
  files first, then regenerate, then check.
- **VALIDATE:** `node agent-layer/gen-loc-summary.mjs --check` exits 0 on the staged tree.
- **SATISFIES:** the epic's every-ticket-carries clause; feeds AC #3's approach baselines.

### 7. UPDATE `tooling/visual-regression/visual.spec.mjs`

- **IMPLEMENT:** replace the `factory` entry's three-selector `waitReady` (`:44`) with the studio's
  single handle:
  ```js
  { name: 'factory', url: '/factory.html', kind: 'ia', waitReady: '[data-studio="ready"]' },
  ```
  and rewrite the comment block above it: the three engines no longer mount at load (they are
  inspector panels mounted on activation), the studio's handle is set in a `finally` on every path,
  and the fail-loud property for a broken artifact now rests on `initGlossary` running before the
  `try` (Task 1) plus CI `verify`'s drift-check of `system-graph.json`, not on the VR wait.
- **IMPLEMENT:** **`waitReady`, not `waitVisible`** — the studio mounts at load with no
  `IntersectionObserver` gate, and `waitVisible` would drag it into the bounded re-measure loop for
  no reason (`:66-77` makes exactly this argument for the proto pages). Leave every other entry
  byte-identical: the `if (p.waitVisible)` guard is what keeps the eight non-visible pages from
  churning.
- **GOTCHA:** do not touch the `roundtrip` entry (`:45`) — it keeps both its handles and its
  baselines.
- **VALIDATE:** the gate run in Task 9 is the validation; a wrong selector shows up as a timeout, not
  a diff.
- **SATISFIES:** AC #2.

### 8. UPDATE `tooling/studio-journey.mjs` — a `/factory` pass

- **IMPLEMENT:** a section that drives the **shipped** surface, cross-engine, mirroring the existing
  harness assertions rather than duplicating their internals:
  - the canvas is mounted and holds one slot per drafted place, read off the running page;
  - one keyboard move (`Tab` to a `.stx-grab`, `Enter`, arrow, `Enter`) changes `data-col`/`data-row`
    and announces exactly once — the counts differ per path on purpose (pointer 1, keyboard N+2);
  - the inspector's four panels activate by click **and** by arrow keys, and `/factory#shape`
    deep-links straight into a **mounted** graph (this is the assertion that catches a lazy mount
    wired only to the click handler);
  - **each of the three exhibits actually RENDERED after activation** — a `.trace-step` exists in
    `#agents-player`, `#roundtrip-diff` has a rendered child, `.sg-node` count > 0. This is the only
    automated coverage the three have left once they stop being captured, and it is what catches
    both a dropped fetch and (with the panel visible) a dropped stylesheet;
  - `hasAttribute("style")` is false on every `.stx-slot` after a move — the running-page half of
    group 7's claim;
  - **zero console errors** across the pass.
- **GOTCHA:** operator-run, not CI (`node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all`). Playwright resolves out of
  `tooling/visual-regression/node_modules`, never a repo dep.
- **VALIDATE:** `node tooling/studio-journey.mjs all` — chromium, firefox and webkit green.
- **SATISFIES:** AC #1, and the "check must be able to fail" clause (the pixel gate never interacts,
  so it cannot tell a live control from a dead one).

### 9. REGENERATE the four baselines — LAST

- **IMPLEMENT:** from a **clean detached worktree under `/Users`** (never `/private/tmp` — Docker
  file sharing), `cd tooling/visual-regression && npm run update:docker`. Commit
  `factory-{neutral,saulera}.png` and `approach-{neutral,saulera}.png`.
- **GOTCHA:** the gate screenshots the **dirty working tree** (memory:
  `vr-gate-reads-working-tree`), so everything above must be committed first. If a baseline's only
  change is sub-perceptual, `update:docker` will refuse to rewrite it — `rm` the PNG to force it
  (memory: `vr-update-skips-subperceptual`). And a green update run is **not** proof a page did not
  change: `maxDiffPixels: 100` swallows a few changed digits (memory: `vr-tolerance-hides-text-changes`).
- **GOTCHA:** local Docker green ≠ CI green — check `gh pr checks` after pushing (memory:
  `vr-gate-approach-countup-flake`).
- **VALIDATE:** a second `npm run update:docker` reports no further churn; `gh pr checks` green.
- **SATISFIES:** AC #3.

### 10. VERIFY the untouched surfaces + drift

- **IMPLEMENT:** run `node tooling/drift-check.mjs` on the clean tree and fix anything it names
  (a generated artifact quoting factory's copy — `llms.txt`, JSON-LD — would surface here).
- **IMPLEMENT:** manual pass on `/roundtrip.html` (renders, both handles set, its "Back to the
  factory" link lands on a mounted Round-trip panel) and `/build.html` (an existing `?b=` link
  restores; all six acts drive) — then `node tooling/build-journey.mjs all`.
- **GOTCHA:** run drift-check on a **clean, fully-merged** tree — run mid-merge it misreads staged
  merge changes as drift (memory: `drift-check-mid-merge-false-positive`).
- **VALIDATE:** `node tooling/drift-check.mjs` exits 0; `node tooling/build-journey.mjs all` green.
- **SATISFIES:** AC #4, #5, #6.

---

## TESTING STRATEGY

This repo has no test suite, no linter and no type-check by design — don't hunt for one. "Done" =
run the surface you touched, plus the gates that own the invariants.

### Pure / CI (no browser)

`tooling/build-checks.mjs` group 14 over `arrangeBoard` / `buildSummary`; group 7 over
`system/studio.mjs`'s source; group 12 unchanged (the `--stx-*` mirror). Each new case must be shown
to fail under a deliberate mutation before it is trusted.

### Running-page / cross-engine (operator-run)

`tooling/studio-journey.mjs all` — the `/factory` pass (Task 8). `tooling/build-journey.mjs all` —
proves `/build` still drives its six acts and its share round-trip. Both resolve Playwright out of
`tooling/visual-regression/node_modules`.

### Pixel

`cd tooling/visual-regression && npm run update:docker` — four regenerated baselines; the ten-page
set otherwise byte-identical. A baseline that churns on a page this ticket did not touch is a
regression to investigate, not a baseline to accept.

### Edge Cases

- **Empty / garbage board in the store** — `arrangeBoard` returns `[]`, the canvas mounts empty, the
  handle is still set, the page does not throw.
- **A board wider than `MAX_COLS`** — truncated, and the count is *stated*, not silently dropped.
- **A deep link to a panel (`/factory#shape`) on a cold load** — the panel activates *and* mounts.
- **Scripting off** — all four panels visible, no dead controls.
- **Reduced motion** — nothing new animates; `studio.css`'s reduced-motion block already covers the
  canvas, and `portfolio.css`'s global kill-switch reaches this page (it is a portfolio surface).
- **An unknown `data-term` key** — the mount aborts before the handle, the VR gate hangs, the run
  fails loud. Prove this once by hand; do not ship it.
- **A dropped 33 MB file / hostile token names** — already `build-import.mjs` + `vetTokens`'s
  contract, unforked, and `build-checks` group 7's one-application-point invariant still holds.
- **Firefox pointer leaving the window mid-drag** — already handled in `studio-canvas.mjs:232-242`;
  the `/factory` journey pass must not regress it.

---

## VALIDATION COMMANDS

### Level 1: Syntax & module safety

```bash
node --check system/studio.mjs
node -e "import('./system/studio.mjs').then(m => console.log(Object.keys(m)))"
```

### Level 2: Pure gates (CI)

```bash
node tooling/build-checks.mjs          # 14 groups, all green
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
```

### Level 3: Cross-engine drivers (operator-run)

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/build-journey.mjs all
```

### Level 4: Manual

```bash
npx serve .
```

`/factory.html` — canvas + drafted board at rest · verbs row · four inspector panels by click and by
arrow keys · `/factory#round-trip` deep-links into a mounted panel · drop a token export and the
canvas re-skins · ⌘K's three factory commands resolve · zero console errors.
`/roundtrip.html`, `/build.html`, `/studio.html` — unchanged behaviour.

### Level 5: Pixel

```bash
cd tooling/visual-regression && npm run update:docker   # from a CLEAN detached worktree under /Users
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `/factory` renders the studio: canvas mounted, inspector docked, import act
      working, the three absorbed exhibits reachable.
- [ ] **AC #2** — the VR spec's `factory` entry is rewritten; its three current handles stop existing
      at load; the studio's own handle replaces them, set in a `finally` on every path.
- [ ] **AC #3** — both factory baselines regenerated from a clean detached worktree under `/Users`.
- [ ] **AC #4** — `/roundtrip.html` still renders and still passes its own baselines, untouched.
- [ ] **AC #5** — `/build.html` still restores an existing `?b=` link and still drives its six acts.
- [ ] **AC #6** — `param-manifest.json` grows under the existing `/factory` key; `gen-param-count`
      regenerated; CI `verify` drift-check green.
- [ ] **AC #7** — the nav-label decision is made and stated: **kept as "Factory"**, rename handed to
      #216 (D2). No chrome baseline is touched by this PR.
- [ ] `system/studio.mjs` joins `build-checks` group 7 with **no exception argued**, and group 14
      drives its pure layer with every case shown to fail under mutation.
- [ ] `loc-summary.json` regenerated and both approach baselines regenerated with it.
- [ ] `tooling/studio-journey.mjs` gains a `/factory` pass, green on all three engines.
- [ ] Zero console errors on the running page; no inline style on any `.stx-slot` after a move.
- [ ] PR body carries `Closes #206`; plan, report and review live in the same PR.
- [ ] **The PR body states three things a diff-only reader will otherwise flag as defects:**
      (a) why `initGlossary` sits *outside* the `try` on the one AC that says "every path" — AC #2's
      `finally` exists so a benign variation (reduced motion, a failed fetch, an early return)
      cannot deadlock the gate, and a bad `data-term` key is a broken build, not a variation;
      (b) that the exhibits' `.trace-*` / `.sg-*` style blocks moved verbatim rather than being
      dropped, and where they went; (c) the nav-label decision (D2) and its handoff to #216.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's `VALIDATE` run immediately after it
- [ ] `node tooling/build-checks.mjs` green (14 groups) — and each new case proven able to fail
- [ ] `node tooling/drift-check.mjs` green on a clean, fully-merged tree
- [ ] `node tooling/studio-journey.mjs all` + `node tooling/build-journey.mjs all` green
- [ ] Four baselines regenerated; no other baseline churned
- [ ] `gh pr checks` green (local Docker green ≠ CI green)
- [ ] `portfolio-design` skill's `references/CHECKLIST.md` run before committing
- [ ] `.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md` all in the PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved while planning — verified in the source, no longer assumptions:**

1. **The build store is IN-MEMORY, not storage.** `build-questions.mjs:65-73` declares a module-level
   `state` object and `readBuild()` (`:92`) is `structuredClone(state)`. Nothing reads
   session/localStorage. Two consequences, both concrete:
   - **`state.answers` initialises to `null`**, and only `setAnswers` / `restoreBuild` fill it —
     both of which run from mounts `/factory` will not carry. So the studio must read
     `const { answers, board } = readBuild()` and then use **`answers ?? DEFAULT_ANSWERS`**
     explicitly. `patternFor` tolerates null (`pattern-rules.mjs:167` guards with `answers &&`), but
     it falls through to `dashboard` with `named: false` — a summary sentence that reads as a
     fallback rather than as the reader's own answer. Import `DEFAULT_ANSWERS` and pass it.
   - **At rest the board is therefore always `draftBoard(DEFAULT_ANSWERS)`** — deterministic for the
     pixel gate by construction, with no storage state to clear and no cross-visit contamination.
     "The same answer store" means the same module, per page load; persistence across pages is the
     share link's job, which is #208/#210's ticket.
2. **`[data-build-keep-empty]` / `[data-build-keep-actions]` are fully optional** —
   `build-import.mjs:334` opens with `if (!keepActions) return;` and every later use is guarded
   (`:337`, `:351-357`). **Decision: omit both from `/factory`.** The Act-0 pack download belongs to
   the keep rail, which is **#210**; adding a lone download button here would be that ticket's
   surface arriving early and unaccompanied. This removes the conditional `param-manifest` entry
   Task 5 was hedging on.
3. **Nothing generated quotes `/factory`'s copy** — `llms.txt` and `_headers` carry no factory
   description or title (checked). Task 10's `drift-check` stays in the plan as the guard, but no
   regeneration is expected from the copy rewrite itself.

**Remaining judgement calls** (stated so a reviewer can disagree, not guesses):

4. **The compare slider in a 22rem rail is the tightest fit on the surface.** The graph is already a
   bounded pan/zoom window and degrades gracefully; `#roundtrip-diff`'s `.cmp-handle` is the one
   control whose usefulness scales with width. If Task 3's manual pass finds it cramped, the fix is
   a layout change and not a re-architecture: widen the rail, or give the Round-trip panel a
   full-bleed treatment inside it. Say so in the report either way — #218 revisits this rail.

**Questions worth raising rather than guessing:**

- **#231 and #232 are open and adjacent.** #231 (`place()` renders an affordance whose behaviour and
  IDREF live in another module, plus a stale `aria-label` on re-place) is exactly the desync this
  ticket hits when it labels blocks from the board, and the epic's #206 comment names it. This plan
  keeps it out of scope — `place()` is called once per block at mount and never re-labels — but if
  implementation finds itself re-placing a block with a new name, **stop and fix #231 first** rather
  than shipping a stale label on the flagship route.
- **The fail-loud property for a broken `system-graph.json` moves.** Today the VR gate hangs if the
  artifact is broken; after this ticket the graph mounts lazily and the gate never waits on it. CI
  `verify`'s drift-check of the generated artifact is the replacement guard, and it is arguably
  stronger (it checks the artifact, not its rendering). Stated here so a reviewer can disagree.
- **Sequencing:** this PR regenerates factory's baselines. #207 and #209 do too, and #215/#216 churn
  all 16 chrome baselines. Per the epic's baseline-collision rule, **nothing else regenerating
  factory or chrome may be in flight concurrently**; #205 is already merged (`07eb24e`), so wave 2's
  partner is clear.

## NOTES (open canvas)

**Why lazy exhibit mounts are the load-bearing choice, not an optimisation.** AC #2 says factory's
three at-load ready handles "stop existing". There were two ways to get there. Keeping the exhibits
eager and having `studio.mjs` await all three before setting one handle satisfies the *letter* — one
selector in the spec — while leaving three fetches, three renders and three handles at load, and
still capturing a hidden panel's content in the layout. Mounting on activation satisfies the
*sentence*: at rest and at capture, none of the three exists. It also makes the at-rest state cheaper
and more deterministic, and it is the arrangement #218 needs when the inspector starts rendering
per-component docs on click. The cost is the one named in OPEN QUESTIONS — the VR gate stops being a
liveness check for the graph artifact — and that cost is paid by CI's drift-check.

**Why the glossary call sits outside the `try`.** Two repo rules collide here: #173's "an unknown
term key must abort before the ready handle so the gate fails loud", and this ticket's "the handle is
set in a `finally` on every path". Inside the `try`, the second rule destroys the first. Before it,
both hold exactly — a throw means the `finally` never runs. It looks like a stylistic oddity and it
is a deliberate structural choice; the file says so in prose, because the next reader's instinct will
be to tidy it inward.

**The `.stx-scroll` height, and a correction worth recording.** My first read of `height: min(70vh,
640px)` on a captured-at-rest surface was that it would feed the VR spec's bounded re-measure loop
and throw at the fixpoint check. It will not: `min()` caps it at 640px no matter how tall the
viewport gets. What *is* true is a fidelity gap — under the gate the viewport is the whole document
height, so the cap always wins and the baseline shows a 640px canvas where a 1280×800 reader sees
560px. Pinning to a flat 640px on `.stu-shell` closes the gap and removes the viewport-height
dependency from a captured surface entirely. Small change, but the reasoning is worth keeping: the
*class* of bug (a captured surface sized from viewport height) is real even where this instance is
not.

**What makes "import, never fork" checkable rather than aspirational.** Three things, and they are
already in place: `pack-import.mjs` is the one mapping engine, `vetTokens` is the one application
point guarded by `build-checks` group 7, and `build-import.mjs` self-boots on mount attributes rather
than exposing a mount function. That last property is what lets a second page get Act 0 for the cost
of markup. If this ticket ever needs to *call* a build module rather than declare its mount, that is
the signal that a seam is missing and should be added there — not that a copy is warranted.

**Rejected: a `studio-inspector.mjs` module.** The inspector at #206 is a panel switcher plus three
lazy imports — roughly 60 lines. Splitting it out now would be an abstraction for a single use, and
#218 is the ticket that gives it a second reason to exist. If #218 finds it wants one, that is the
right moment.

## CONFIDENCE

**9.5 / 10** for one-pass success.

What earns it: no new algorithm and no new dependency — the canvas, the verbs, the mapping engine
and the board drafter are all shipped, gated and driven cross-engine, and this ticket composes them.
Every mount contract is quoted at file:line rather than described. The four assumptions the first
draft carried have been resolved in the source: the store is in-memory with `answers` initialising
`null` (so the plan now passes `DEFAULT_ANSWERS` explicitly), the two keep nodes are optional (so
they are omitted and #210 keeps its scope), and nothing generated quotes the page's copy. The two
silent-failure modes that could have shipped green — the exhibits' stylesheet being dropped with the
tab controller, and Act 0's split lookup scopes returning quietly — are named as blocking, with the
journey-driver assertions that close the first.

The remaining half point, honestly: this is a **rewrite of the site's flagship route**, and page
copy plus the `.stu-*` visual vocabulary are judgement, not mechanism. The SURFACE SPEC pins the
structure, the organisms and the copy posture so the work is assembly, but a first pass may still
want a second look at the shell's proportions and at the compare slider in a 22rem rail
(judgement call 4). Neither risks correctness or a gate — they risk an extra review round.

## AMENDMENTS

- 2026-08-05 — plan as first written.
- 2026-08-05 — advisor pass + verification pass, before any implementation. **Blocking fix:** Task 3
  now requires factory.html's `.trace-*` (`:103-168`) and `.sg-*` (`:170-204`) style blocks to move
  verbatim — with the exhibits lazily mounted nothing captures them, so an unstyled trace player
  would have shipped green through every gate; Task 8 gains the panel-content assertions that are
  now their only automated coverage. **Verified and changed:** the build store is in-memory with
  `state.answers` initialising `null` → `DEFAULT_ANSWERS` is now passed explicitly; the two Act-0
  keep nodes are optional → omitted, and the pack download stays #210's; nothing generated quotes
  the page copy. **Precision:** `initGlossary` placement clarified to *inside `mountStudio`, before
  the `try`* (module scope would break Node-import safety); group 14's wider-than-`MAX_COLS` case
  marked deliberately vacuous (unreachable — `MAX_PLACES` 6 < `MAX_COLS` 12) rather than left as
  fake coverage; the `all 13 groups pass` tally at `build-checks.mjs:1921` added as a task step;
  Act 0's `root` vs `document` lookup split stated node-by-node; the `data-inspect` gotcha upgraded
  to name `drift-check.mjs:98-115` as its enforcer. **Added:** a SURFACE SPEC section (page order,
  shell geometry, panel list, "This build" contents, copy posture) so the rewrite is assembly rather
  than invention; `?b=` restore stated as a non-goal; a PR-body checklist item for the three things
  a diff-only reader would otherwise flag as defects.
