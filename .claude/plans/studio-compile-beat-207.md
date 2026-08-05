# Feature: the compile beat — fat-marker blocks snap into real components (#207)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to the names of existing exports and constants. Import from the right files —
this ticket's whole argument is that it invents nothing.

**Ticket:** [#207](https://github.com/linardsb/ux-factory/issues/207) · **Epic:** [#202](https://github.com/linardsb/ux-factory/issues/202)
· **Branch:** `feature/studio-compile-beat-207` · **PR body MUST carry `Closes #207`.**

## Feature Description

`/factory` (the studio, since #206) holds the drafted breadboard as **fat-marker blocks** — one
`.stu-place` article per board place, rendered by `system/studio.mjs`'s `placeBlock`. This ticket
adds the epic's hero mechanic: a **compile beat** that runs the already-committed pure pipeline
(`draftBoard` → `patternFor`/`slotsFor` → `compose` → `renderComposition`) **stepwise on stage**, and
swaps each fat-marker block for the real token-skinned component the pipeline produced — in the same
canvas slot, keeping the reader's arrangement, their undo history and the wrapper ids.

The altitude shift is *performed*: four named steps, announced through the canvas's existing live
region, ending in a settled canvas of real components. It reverts ("Back to blocks") so the beat can
be watched again — which is also what makes AC #3's byte-identical re-run assertable.

**At rest, `/factory` stays fat-marker and the reader triggers the beat** — decided by the PRD holder
2026-08-05 (see D1 in OPEN QUESTIONS, which is now a decision, not an assumption). The architecture's
"autoplay-to-completion as the gated at-rest state" is about #209's replay, and #209 will drive this
same beat through `getCompile()`.

### The shape, measured not assumed

Everything below was run against the tree at `3a03266`, not inferred:

```
$ node --input-type=module -e '…draftBoard(DEFAULT_ANSWERS)…'
pattern: dashboard | places: 3 | affs: 5 | conns: 2
slots: 3 | composition: 3 | names: [ 'metric-tile' ]
1:1 with places? true
PATTERNS inLibrary: dashboard:true queue:true feed:true onboarding:true settings:true
```

So on today's `/factory`: **3 fat-marker blocks → 3 `metric-tile`s, one per slot, ids unchanged.**
All five patterns are in the library, which is why AC #6's card is retained-and-vacuous.

It ships as a **crossfade** (opacity, `element.animate()`). No `view-transition-name` is written
anywhere and `morph()` is not called: naming for VT is gated behind #190 + a studio state-matrix
`vt-stack-audit`, and AC #4 asserts the absence.

## User Story

As a hiring manager evaluating this portfolio
I want to watch the rough board on the canvas turn into the real product's components, by a rule I can read
So that "brief in, product out, by a method" is something I *saw happen* rather than something I read.

## Problem Statement

The studio currently stops at the shape stage. Its own copy says so ("the blocks are still sketches
rather than finished components", `factory.html:200`) and `studio.mjs`'s `placeBlock` comment
explicitly reserves the next sentence for this ticket. The pipeline that turns a board into real
components is already committed and already gated — it just isn't performed anywhere the reader can
watch it. /build renders the same pattern, but as a form-fed reveal at the bottom of a different page.

## Solution Statement

A new hand-written canon module `system/studio-compile.mjs` with the repo's standard two-layer shape:

- **A pure layer** (Node-import-safe, no DOM): `compileSteps(board, answers)` → the ordered, named
  steps of the committed pipeline and their results, plus the terminal `state` (`rendered` ·
  `out-of-library` · `empty` — the render/refusal split happens in the DOM half, exactly as
  `pattern-render.mjs` splits it). Deterministic and total: junk in → an `empty` result, never a throw.
- **A mount**: a control row inserted into the canvas viewport (the `mountCanvasVerbs` precedent),
  a first-compile vocabulary fetch, the stepwise beat, the positional wrapper swap, and the revert.

The composed nodes come from **`renderComposition` against the real generated
`handoff/verdant/vocabulary.json`** — the same validator, the same refusal, the same honesty argument
`pattern-render.mjs:5-11` makes. Nothing about the rules, the slots or the vocabulary is re-decided
here; `compose` and `slotsFor` are imported, never forked.

## Out of Scope / Non-Goals

- **Not flows.** Places do not become screens and connections do not become navigation — that is
  #212, and the ticket says so explicitly. One board → today's single pattern.
- **Not view transitions.** No `view-transition-name`, no `morph()` call, no `vt-stack-audit` studio
  matrix. The named-group morph is a gated upgrade (#190 first).
- **Not the replay.** No autoplay, no `agent.*` driving, no ghost cursor — #209 takes the beat over
  through the seam this ticket exports.
- **Not the keep rail / export / analytics routes** — #210. No new virtual route fires here.
- **Not editing the build store.** `studio.mjs` reads and never writes it (its header states why);
  this module inherits that and adds no `publishBuild`.
- **Not a new pattern, a new component or a new vocabulary entry.** The out-of-library refusal stays
  retained-and-unexercised (AC #6) rather than being papered over.
- **Not changing `/build`.** `pattern-render.mjs` gains one `export` keyword (Task 2) and nothing else.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (the code is small; the determinism, a11y and gate discipline are the work)
**Primary Systems Affected**: `system/studio-compile.mjs` (new) · `system/studio.mjs` · `system/studio.css` · `factory.html` · `tooling/build-checks.mjs` (group 15) · `tooling/studio-journey.mjs` · `tooling/vt-verify.mjs` · generated: `system/param-count.json`, `system/loc-summary.json`, factory + approach VR baselines
**Dependencies**: none new (vanilla, zero-dep — hard constraint)

## Related Work

**Implements**: #207   ·   **Epic**: #202 → `docs/epics/prototype-studio.architecture.md` (§Recommended approach · §Key decisions → Stack & libraries · §Missing pieces) + `docs/epics/prototype-studio.prd.md` §2, §MVP

**Back-references**:

- `.claude/plans/studio-route-surgery-orchestrator-206.md` — the surface this performs on; the
  orchestrator seam (`getStudio()`), the lazy-panel discipline, the `finally` ready handle.
- `.claude/plans/studio-canvas-stage-204.md` — `place()`, `clampSlot`, `MAX_COLS`, the zoom table,
  the zero-inline-styles rule the new module joins.
- `.claude/plans/build-pattern-render-keep-rail.md` — the four-state render contract this mirrors
  (`rendered` · `not in the library` · `empty board` · `refusal`) and its committed-gate pattern.

**Forward-references**:

- #209 (replay driver — takes the beat over through `getCompile()`), #210 (export/keep rail),
  #212 (flows — extends this beat, does not replace it).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/studio.mjs` (whole file, ~399 lines) — the orchestrator. `arrangeBoard` (the row-1 layout
  rule this mirrors), `placeBlock` (the fat-marker block, whose comment at :247-254 reserves this
  ticket's sentence), `mountStudio`'s ordering (glossary outside the try, verbs after the placement
  loop, `live` handle, `finally` ready flag), `syncInspect`.
- `system/studio-canvas.mjs` (lines 38-95 constants + 250-331 `place()` and the handle) — `place()`
  is **idempotent on a node already inside a wrapper**, which is precisely what the content swap
  relies on. Handle: `{ viewport, scroll, stage, announcer, place, say, fit, reset, setZoom, level, destroy }`.
- `system/studio-verbs.mjs` (lines 156-235 `createHistory` incl. `adopt`; 238-330 the mount, the
  `restore()` comment at :315-322 about ids the snapshot does not know; 700-765 the handle) — why the
  swap keeps `data-stx-id` stable, and what happens to a removed wrapper's history entries.
- `system/pattern-rules.mjs` (`PATTERNS` :29, `SLOT_MAX` :79, `patternFor` :150, `slotsFor` :183,
  `affordanceCount` :300) — the rules. Read the header: definitions only, never invented numbers.
- `system/pattern-render.mjs` (lines 1-120 header + `compose` + `streamNote` + `INSPECT_IDS`;
  145-230 the four states; 240-270 the render key; 310-335 the IO-gated vocabulary fetch) — the
  contract this reuses, including the exact honesty sentences.
- `system/agentic-renderer.mjs` (`validateComposition` :31, `TEMPLATES` :300-360, `hasTemplate` :362,
  `renderComposition` :369 and `build`'s array branch → a **DocumentFragment**). **Verified:** every
  template returns exactly one root element — the three this ticket can reach are `metric-tile` :321,
  `list-row` :333, `sequence-step` :350, each a single `el("div", …)` return. So
  `frag.children.length === composition.length` holds today; the plan asserts it as a **tripwire**
  for the day a template returns two roots, not because it is in doubt.
- `system/breadboard.mjs` (`draftBoard` :107, `isBoard` :151, `MAX_PLACES` :38).
- `system/build-questions.mjs` (`DEFAULT_ANSWERS` :326, `readBuild` :92) — the store is in-memory, so
  at rest `/factory` is ALWAYS `draftBoard(DEFAULT_ANSWERS)`. This is why the beat is deterministic
  by construction and why the cardinality-mismatch branches are unreachable on the page today
  (cover them in the pure gate instead — see Task 6).
- `system/morph.mjs` (whole file, 45 lines) — read it to confirm you are **not** calling it, and why.
- `system/studio.css` (lines 20-171 the `.stx-*` canvas block; 294-320 `.stu-place` fat marker;
  the file's header on the CSS-mirrors-the-caps rule) — where the compile classes go.
- `factory.html` (lines 182-232 the studio shell + canvas column; 44-80 the page-chrome `<style>`;
  190-201 the beat copy that this ticket updates).
- `tooling/build-checks.mjs` (lines 1-120 the harness + `group()`; **:130-136 `BOARD_FOR`** —
  `dashboard/queue/feed/onboarding` are `draftBoard(answersWith({ shape: … }))`, `settings` is
  `HUB_BOARD`; 343-430 the slots + composition groups — **your model for group 15**; **:754-758
  group 7's `MODULES`**, a *local* const inside the group function holding 11 filenames **without**
  the `system/` prefix (the loop does `join(ROOT, "system", file)`); 2020-2110 group 14, the studio
  group added by #206; the tail's `all 14 groups pass` line).
- `tooling/studio-journey.mjs` (lines 1040-1130 `factoryPass` and how it reaches `getStudio()`
  through a dynamic import rather than a window global; **:1003 the `reducedMotion: "reduce"`
  context idiom already in the file** — reuse it, don't invent one; the summary line at :1221).
- `tooling/vt-verify.mjs` — `HOOK` :69-80 (the `startViewTransition` wrapper installed via
  `addInitScript` **before any module evaluates**), `SITEWIDE` :101-146 (rows whose per-verb claim is
  hardcoded to `calls === 1` — **your case is the opposite number, so it is NOT a SITEWIDE row**),
  and **:279-350, the studio-canvas block — that is your model**. Note two things it already
  records: it runs against **`/studio.html`**, which does **not** mount `studio.mjs`, so #207 needs
  its own `/factory.html` block; and its pseudo filter correctly ignores `element.animate()`
  animations because their `pseudoElement` is `null` — the comment says do not "fix" that, so don't.
- `tooling/visual-regression/visual.spec.mjs:62` — factory's page entry and its
  `waitReady: '[data-studio="ready"]'`.
- `system/param-manifest.json` (`$description` counting rules + the `/factory` entries at :71-79).
- `agent-layer/gen-loc-summary.mjs:22-23` — the `runtime` group glob picks up any new
  `system/*.mjs`, so a new file changes the rounded line count.

### New Files to Create

- `system/studio-compile.mjs` — the compile beat: pure `compileSteps` + `describeStep` + the mount
  (`mountCompile`) and its driver seam (`getCompile`). Target ~350-420 lines including its header.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Recommended approach (the compile beat *is* the
  committed pipeline performed stepwise) · §Key decisions → Stack & libraries (VT reserved for
  discrete swaps; canvas movement animates via transforms/FLIP, **never** view transitions) ·
  §Open questions (whether replay steps drive `morph()` — this ticket answers "no, crossfade").
- `docs/epics/prototype-studio.prd.md` §2 (hero mechanic verbatim) · §MVP ("before flows").
- `CLAUDE.md` → Ground rules (vanilla, token discipline, honesty contract) · "Where new code goes" →
  *View-time behaviour on shipped pages* + *New live-manipulable control*.
- `.claude/skills/portfolio-design/references/CRAFT.md` + `CHECKLIST.md` — read CRAFT before writing
  CSS, run CHECKLIST before committing (house skill; this is shipped-page UI).
- MDN [`Element.animate()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) — the
  animation path that never touches `.style`, so build-checks group 7 and studio-journey's running-page
  `hasAttribute("style")` assertion both stay literally true.
- MDN [`Document.getAnimations()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations)
  — how AC #4 is asserted (filter on `effect.pseudoElement` starting `::view-transition`).

### Patterns to Follow

**Module header** — every feature/entry-point file opens with a header citing its governing doc.
Mirror `system/studio.mjs:1-30`: what it is, the epic/ticket/plan, then the load-bearing invariants
in caps ("IMPORT, NEVER FORK", "THE BUS IS THE DRIVE PATH", "ZERO INLINE STYLES"). Write the ones
this file actually holds — see NOTES for the four.

**Two-layer split** (`studio.mjs:59-115`, `studio-verbs.mjs:60-235`): pure exports at the top with a
comment saying which build-checks group drives them, DOM below, self-boot (if any) behind
`typeof document`.

**Element-by-element DOM, own `el` helper copied not imported** (`studio.mjs:120-130`,
`studio-verbs.mjs:262-272`, `studio-canvas.mjs:80`). No template strings, no `innerHTML`.

**Announcements go to the canvas's ONE live region** via `canvas.say(...)`
(`studio-canvas.mjs:298-305` explains why a second region would be wrong). Refusals go to the live
region / a card, **never a throw** (`studio-verbs.mjs:352-357`; `action-bus.mjs:70-77` would swallow
it into `console.error` and trip studio-journey's no-page-errors contract).

**Readiness handle in a `finally` on every path** (`studio-canvas.mjs:325-330`,
`device-frame.mjs:195-199`): `[data-studio-compile="ready"]`.

**Honesty sentences are constants at module top, stated at rest** (`pattern-render.mjs:78-90`'s
`COUNTED` / `OUT_OF_LIBRARY` / `REFUSED`). Reuse those exact three where they apply rather than
writing near-copies.

**Reduced motion** — `const reduceMotion = () => typeof matchMedia === "function" &&
matchMedia("(prefers-reduced-motion: reduce)").matches;` (`studio-verbs.mjs:274-275`, copied). The
CSS half declares the no-travel state too; JS-only gating is what churns baselines (memory:
"VR gate captures no-preference").

---

## IMPLEMENTATION PLAN

### Phase 1: The pure layer

`compileSteps(board, answers)` and its step vocabulary, plus build-checks group 15 driving it. No
DOM, no page changes. This phase can be finished and gated before anything renders.

### Phase 2: The mount

**Depends on:** Phase 1. The control row, the first-compile vocabulary fetch, the four stepwise
beats, the positional swap, the revert, the three non-rendered states.

### Phase 3: The surface

**Depends on:** Phase 2. `studio.mjs` wiring, `studio.css` (fat-marker vs compiled + the crossfade),
`factory.html` copy that stops calling the blocks the end of the story.

### Phase 4: Gates and generated artifacts

**Depends on:** Phase 3. studio-journey's compile pass, vt-verify's zero-transition case,
param-manifest + `gen-param-count`, `gen-loc-summary`, factory + approach baselines.

---

## STEP-BY-STEP TASKS

Execute in order. Validate each before moving on.

### 1. CREATE `system/studio-compile.mjs` — the pure layer

- **IMPLEMENT**:
  - The module header (see Patterns + NOTES §"the four invariants").
  - `export const STEPS` — the four step ids and their fixed labels, frozen:
    `[{ id: "name", label: "Naming the pattern" }, { id: "slots", label: "Counting the slots" },
      { id: "compose", label: "Composing the components" }, { id: "render", label: "Rendering through the vocabulary" }]`.
    Fixed strings, no interpolation of anything time- or run-dependent — AC #3 lives or dies here.
  - `export function compileSteps(board, answers)` → `{ state, patternId, patternLabel, reason,
    inLibrary, slots, composition, counted: { places, affordances, connections }, steps }` where:
    - `patternFor({ answers, board })` names the pattern (import it; do not re-derive);
    - `slotsFor(patternId, board)` counts the slots;
    - `compose(patternId, slots)` builds the composition;
    - `state` is `"empty"` when the board is not a board / has no places / `slots` is empty,
      `"out-of-library"` when a pattern is named but `compose` returns null, else `"rendered"`;
    - `steps` is `STEPS` with a per-step `detail` string built from counted numbers only
      (e.g. `` `${slots.length} slots counted from ${counted.places} places` ``). Every number
      counted, none invented — `pattern-rules.mjs`'s rule, inherited.
    - TOTAL: null/garbage/`{places:"nope"}` returns `state:"empty"` and never throws
      (`buildSummary`'s discipline, `studio.mjs:98-114`).
- **PATTERN**: `system/studio.mjs:59-115` (pure layer + its comment naming the gate);
  `system/pattern-render.mjs:48-63` (`compose`).
- **IMPORTS**: `{ patternFor, slotsFor, affordanceCount, PATTERNS } from "./pattern-rules.mjs"`,
  `{ compose } from "./pattern-render.mjs"`, `{ isBoard } from "./breadboard.mjs"`.
  **Do not import `agentic-renderer.mjs` at the top for the pure layer's sake** — it is DOM-free
  (`validateComposition` is pure) so a static import is safe, and Task 4 needs `renderComposition`;
  verify with the VALIDATE command that Node still imports this file cleanly.
- **GOTCHA**: `pattern-render.mjs` **self-boots at the bottom behind a `typeof document` guard** and
  imports `analytics.mjs`; both are already Node-import-safe (build-checks imports them today), so
  importing `compose` from it costs nothing under Node. Confirm, don't assume.
- **VALIDATE**: `node -e 'import("./system/studio-compile.mjs").then(m=>{const {draftBoard}=require;}).catch(e=>{console.error(e);process.exit(1)})'`
  — simpler and sufficient:
  `node --input-type=module -e 'import {compileSteps} from "./system/studio-compile.mjs"; import {draftBoard} from "./system/breadboard.mjs"; import {DEFAULT_ANSWERS} from "./system/build-questions.mjs"; const r=compileSteps(draftBoard(DEFAULT_ANSWERS), DEFAULT_ANSWERS); console.log(r.state, r.patternId, r.slots.length, r.composition.length); console.log(compileSteps(null,null).state, compileSteps({places:"nope"},null).state)'`
- **SATISFIES**: AC #1 (one source), AC #2 (the committed pipeline), AC #3 (determinism's pure half).

### 2. UPDATE `system/pattern-render.mjs` — export `INSPECT_IDS`

- **IMPLEMENT**: add `export` to the existing `const INSPECT_IDS` (~:85). Nothing else in the file
  changes. One line, and it is the difference between one list of inspect ids and two.
- **PATTERN**: `studio.mjs:150-160` — #206 applies `data-inspect` to lazily rendered exhibit nodes
  for exactly this reason; the ids are copied from `system/inspect-data.json` and an unknown id
  aborts the whole inspect activation at runtime.
- **GOTCHA**: do **not** move or reword the list, and do not add a fourth pair. An id that is not in
  `system/inspect-data.json` breaks inspect for the entire page, silently.
- **VALIDATE**: `node -e 'import("./system/pattern-render.mjs").then(m=>console.log(m.INSPECT_IDS.length))'`
  → `3`; then `node tooling/build-checks.mjs` still green.
- **SATISFIES**: AC #2 (the compiled components are the same primitives, wired to the same docs).

### 3. ADD to `system/studio-compile.mjs` — the vocabulary fetch + the non-rendered cards

- **IMPLEMENT**:
  - `loadVocabulary()` — `fetch("/handoff/verdant/vocabulary.json")`, `!res.ok` → throw naming the
    path and status, `!json.components` → throw "vocabulary.json carries no components map". Memoize
    the resolved value on the module's live handle so a second compile does not refetch.
    **Fetched on first compile, never at load** — at rest this page must issue no new request
    (#206's lazy-panel property, and the pixel gate depends on it).
  - The three non-rendered outcomes, each rendered into a `.stu-compile-report` node in the canvas
    column, reusing `pattern-render.mjs`'s sentences **verbatim** where they apply: `OUT_OF_LIBRARY`
    (AC #6 — retained, honest, and vacuous today), the refusal (`REFUSED` + `err.message` in a
    `<pre><code>`), and the vocabulary-unavailable case. Copy the two constants' text or export them
    from `pattern-render.mjs` — prefer exporting, same argument as Task 2, but only if it stays a
    one-word diff there.
  - In every non-rendered outcome the fat-marker blocks **stay on the canvas untouched**. The board
    is the artifact; nothing is mocked up.
- **PATTERN**: `pattern-render.mjs:145-195` (the four states) and :310-335 (the fetch + its error
  wording).
- **GOTCHA**: `renderComposition` **throws** on refusal — catch it, render the refusal card, and set
  the beat's terminal state. Do not let it reject into the console.
- **VALIDATE**: serve locally (`node tooling/visual-regression/serve.mjs &`), load `/factory.html`,
  compile → Network shows exactly one `vocabulary.json` request, and none before the click.
- **SATISFIES**: AC #2, AC #6.

### 4. ADD to `system/studio-compile.mjs` — `mountCompile` and the beat

- **IMPLEMENT**:
  - `export function mountCompile(canvas, { board, answers, onState } = {})` returning
    `{ compile, revert, get state(), steps, destroy }`, plus `export const getCompile = () => live`
    (the `getVerbs()`/`getCanvas()` seam idiom — #209 and studio-journey reach the beat through this,
    never a `window.__` global).
  - **The control row**: two real buttons ("Compile the board" / "Back to blocks") + a step readout
    `<p class="stu-compile-step">`, built element by element and inserted into `canvas.viewport`
    before `canvas.scroll` (the `verbRow` precedent, `studio-verbs.mjs:341`). "Back to blocks" is
    `disabled` until a compile has settled. The readout is **not** a second live region — announce
    through `canvas.say`; the readout is the visible mirror.
  - **The beat**: for each of the four `STEPS`, in order — set
    `viewport[data-compile-step]` to the step id, write the readout, `canvas.say(step.label + ": " + detail)`,
    then wait `STEP_MS` (a module const, e.g. 420) via a cancellable timer. **Reduced motion: no
    wait at all** — steps still announce in order, the end state is reached immediately (AC #5).
    The DOM swap happens on the last step.
  - **The swap** — positional, over `stage.querySelectorAll(".stx-slot")` in DOM order vs the
    composed nodes in composition order:
    - render the whole composition once:
      `const frag = renderComposition(vocab, composition, bus)` — one validation, one refusal path,
      and the exact `composition[i]` paths in any refusal message;
    - **`const nodes = [...frag.children]` BEFORE appending anything** (appending consumes a
      fragment's children), then
      `if (nodes.length !== composition.length) throw new Error(\`the renderer built ${nodes.length} top-level nodes for ${composition.length} composed components — the positional swap cannot align them\`)`,
      caught by the same handler that renders the refusal card. **Verified**: every template returns
      one root today (`agentic-renderer.mjs:321,333,350`), so this is a tripwire for a future
      two-root template, not a live branch — say exactly that in the comment, the way group 1's
      vacuous clause says it, or the next reader deletes it as dead code;
    - for `i < min(slots, nodes)`: stash the wrapper's current child (`wrapper.querySelector(":not(.stx-grab)")`)
      on a module-side `Map` keyed by the wrapper, replace it with `nodes[i]`, update
      `data-stx-name` and the grab button's `aria-label` to the component's name
      (`place()` only writes that label at creation — `studio-canvas.mjs:277-286`);
    - extra composed nodes (composition longer than the canvas): `canvas.place(node, { col, row, name })`
      with the next free row-1 column via `clampSlot`, breaking at `MAX_COLS` exactly as
      `arrangeBoard` does;
    - surplus wrappers (composition shorter): `wrapper.remove()`. Their history entries survive
      harmlessly — `restore()` skips an id with no node on the stage (`studio-verbs.mjs:315-322`) —
      and the module comment must say so, because that line's comment warns against misreading it.
    - apply `INSPECT_IDS` to the composed nodes and call the orchestrator's inspect refresh (Task 8
      wires it; here take an `onState` callback rather than importing `inspect.mjs` — `studio.mjs`
      already owns `syncInspect`).
  - **The crossfade**: `node.animate([{opacity: 0}, {opacity: 1}], { duration: 180, easing: "ease-out" })`
    on each composed node, and the same in reverse on the outgoing block if it is still in the tree.
    `element.animate()` only — **zero `.style` writes, zero markup from a string** (build-checks
    group 7 is extended to include this file in Task 7). No `view-transition-name`, no `morph()`.
    `reduceMotion()` → skip the animation entirely; the end state is identical.
  - **`revert()` is exact for the swap, and the swap is the only case the page can reach.**
    Measured: `/factory` is always `draftBoard(DEFAULT_ANSWERS)` → dashboard → 3 slots for 3 places,
    1:1, so the extra/surplus branches are **unreachable on the shipped page today**. `revert()`
    restores every stashed block into its wrapper and restores that wrapper's original
    `data-stx-name` + grab `aria-label`; for the branches only #212 can reach it also removes
    wrappers the compile added and re-places, in board order, any it removed. Key the stash **by
    wrapper** so both directions are a lookup rather than a re-derivation. **Say in the header which
    branches the page exercises and which exist for #212** — so nobody reads the dead ones as live,
    and nobody deletes them as dead.
  - `destroy()` — `AbortController.abort()`, clear the pending timer, remove the control row, null
    the `live` handle (`studio-verbs.mjs:744-756`).
  - Wrap the whole mount in `try { … } finally { canvas?.viewport?.setAttribute("data-studio-compile", "ready"); }`.
- **PATTERN**: `studio-verbs.mjs:238-330` (mount shape, boundary throws, `AbortController`, handle
  object, `finally` handle) · `studio-canvas.mjs:250-305` (`place()`'s idempotence and its wrapper
  contract).
- **IMPORTS**: `{ renderComposition } from "./agentic-renderer.mjs"`,
  `{ INSPECT_IDS } from "./pattern-render.mjs"`, `{ clampSlot, MAX_COLS } from "./studio-canvas.mjs"`.
- **GOTCHA**: a second compile must produce the **same** DOM as the first. Keep `data-stx-id`
  stable by swapping content instead of re-placing wrappers; never write a timestamp, a counter or a
  `Math.random()` into any attribute or text; make the readout's final text a fixed string.
- **VALIDATE**: manual — `/factory` → Compile → four steps announce → real components appear in the
  same slots → "Back to blocks" → Compile again → identical result. Then Task 9's driver proves it.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4, AC #5.

### 5. UPDATE `system/studio.mjs` — wire the beat

- **IMPLEMENT**: after `mountCanvasVerbs`, `const compile = mountCompile(canvas, { board, answers,
  onState: () => syncInspect() })`; add `compile` to the `live` handle. Update `placeBlock`'s comment
  (:247-250) — it explicitly says "#207 must not write that sentence early"; now it may. Keep the
  bus single-mover invariant intact: **the compile module must not emit `ui.move` and must not call
  `applySlot`** — it only swaps content in place.
- **PATTERN**: `studio.mjs:352-372` (mount ordering: canvas → placement loop → bus + verbs →
  summary → inspector → `syncInspect`). Mount the compile **after** the verbs, so the history's
  initial snapshot is still the fat-marker arrangement.
- **GOTCHA**: `mountStudio`'s `finally` must keep setting `data-studio="ready"` on every path; a
  throw inside `mountCompile` must not deadlock the VR gate. `mountCompile` has its own `finally`,
  so a thrown boundary error still flags both handles.
- **VALIDATE**: `node -e 'import("./system/studio.mjs").then(()=>console.log("node-import ok"))'`
  (proves the DOM guard still holds) + load `/factory.html` with no console errors.
- **SATISFIES**: AC #1, AC #7.

### 6. ADD `tooling/build-checks.mjs` group 15 — the compile pipeline

- **IMPLEMENT** a new group (`group("compile", …)` at the end, and bump the tail's
  `all 14 groups pass` → `all 15 groups pass`):
  1. **The real drafted board**: `compileSteps(draftBoard(DEFAULT_ANSWERS), DEFAULT_ANSWERS)` →
     `state === "rendered"`, `slots.length === composition.length`, pattern id matches
     `patternFor` called directly (the pipeline is not re-implemented). Assert the counts
     **against the board**, never as the literals `3`/`dashboard` — a fixture that silently stopped
     being drafted would pass a literal. Do add a **tripwire** on the measured shape, though:
     `slots.length === board.places.length` for dashboard, with a comment recording that this is
     1:1 *for this pattern* and that queue/feed/settings derive from affordances instead.
  2. **All five patterns** over the `BOARD_FOR` fixtures already in this file (`:130-136` —
     `answersWith({ shape })` for four, `HUB_BOARD` for settings): every composition
     `validateComposition(vocab, composition)` against the **real generated**
     `handoff/verdant/vocabulary.json`, and every emitted name passes `hasTemplate` — group 3's
     shape, reused (`build-checks.mjs:343-397`). Include the `board` fixture existence check group 3
     makes (`:356`), so a sixth pattern with no fixture fails loudly instead of being skipped.
     **This is where the cardinality risk is retired**: for each pattern assert
     `composition.length === slots.length` and record which patterns are 1:1 with places
     (dashboard, onboarding) and which are affordance-derived (queue, feed, settings) — so the DOM
     swap's alignment assumption is a gated fact for all five, not just the one the page reaches.
  3. **Determinism, proven by comparison not by inspection**: run `compileSteps` twice on the same
     board and deep-compare the whole result including `steps` — using this file's existing
     hand-written canonical stringify, **never `JSON.stringify(v, keys)`** (group 13's note: an
     array in the second position is a *replacer* and makes every comparison vacuous).
  4. **Totality**: the 9 junk boards group 14 already uses → `state === "empty"`, no throw.
  5. **The retained refusal**: a deliberately vacuous `inLibrary === false ⇒ state === "out-of-library"`
     clause guarding AC #6, worded like group 1's (`build-checks.mjs:2039`), plus a tripwire that
     fails the day a `PATTERNS` entry gains `inLibrary: false` with no `needs` sentence.
  6. **A mutation you can watch go red** (memory: "the check that cannot fail"): before committing,
     break `compose`'s dashboard branch to emit `"metric-tiles"` and confirm group 15 fails; restore.
- **PATTERN**: `build-checks.mjs:343-430` (slots + composition groups, the vocabulary read),
  :2020-2109 (group 14's totality loop and its tripwire idiom).
- **GOTCHA**: this file is **pure** — it opens no browser. The DOM half of the ACs belongs to
  studio-journey, and group 15's summary line must **say so** (groups 9, 11, 13 all state the
  boundary they cannot reach; copy that habit).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 15 groups pass`.
- **SATISFIES**: AC #1, AC #2, AC #3 (pure half), AC #6.

### 7. UPDATE `tooling/build-checks.mjs` group 7 — the vetting `MODULES` list

- **IMPLEMENT**: add `"studio-compile.mjs"` to the `MODULES` array at `build-checks.mjs:754-758`
  — **filename only, no `system/` prefix** (the loop does `join(ROOT, "system", file)`) — beside
  `"studio-canvas.mjs", "studio-verbs.mjs", "studio.mjs"`, and extend the group's summary string to
  name it **with no exception argued**, the phrase already used for the other three.
- **PATTERN**: `build-checks.mjs:754-851`.
- **GOTCHA**: the invariant is `ok(writes === 1, …)` — **exactly one** inline-style write across the
  whole list, and that one is `build-import.mjs`'s `applyToStage`. A single `.style.x =` in the new
  module makes the total 2 and fails the group; the per-file `ok()` above it also fires. There is a
  second, separate assertion that no file writes `.style.viewTransitionName` except
  `breadboard.mjs` — the new module must trip neither. If either fails, fix the code, never the regex.
- **VALIDATE**: `node tooling/build-checks.mjs` → group 7's summary reports `1 inline-style write
  across 12 modules` (11 today + the new one) and no markup-from-string sink.
- **SATISFIES**: AC #4 (the "it is a crossfade, not a transform hack" half), house rules.

### 8. UPDATE `system/studio.css` + `factory.html` — the two fidelities and the copy

- **IMPLEMENT**:
  - `studio.css`: a `/* ---------- the compile beat ---------- */` block —
    `.stu-compile` (the control row, mirroring `.stx-zoom`/`.stx-verbs`), `.stu-compile-step`
    (caption-scale, `--color-fg-muted`, `min-height: 1.4em` so the row does not jump — the
    `.stx-live` precedent), `.stu-compile-report`, and the fat-marker↔compiled state hooks keyed off
    `[data-compile-state]` on the viewport. **Semantic tokens only** — a literal in a shipped
    stylesheet is a bug; follow the file's existing `var(--spacing-*, fallback)` idiom.
  - The reduced-motion half in CSS as well as JS
    (`@media (prefers-reduced-motion: reduce) { … }`), because the gate captures under
    no-preference and a JS-only gate churns baselines.
  - `factory.html`: update the beat lead (:196-201) — the blocks are the shape stage **and there is
    a compile beat that turns them into the real components**, stated without claiming flows. Keep
    it to the existing voice; run the portfolio-design CHECKLIST.
  - The `<noscript>` (:218-221) still tells the truth with JS off — check the sentence still reads
    correctly now that a control exists that needs JS.
- **PATTERN**: `system/studio.css:169-171` (`.stx-verbs` row), :294-320 (the fat-marker block),
  the sheet's header on the cap-mirroring rule.
- **GOTCHA**: **no `view-transition-name` anywhere** in this block (AC #4, and #171's lesson).
  And the compiled components are `.ds-*` library primitives — do not restyle them from `studio.css`;
  they carry `components.css`'s token-only rules and that is the point.
- **VALIDATE**: `npx serve .` → `/factory.html` under neutral and under `saulera` (dock switch) —
  compiled components render identically-skinned; `grep -n "view-transition-name" system/studio.css system/studio-compile.mjs` → no output.
- **SATISFIES**: AC #1, AC #4, AC #5, AC #7.

### 9. ADD `tooling/studio-journey.mjs` — the compile pass (inside `factoryPass`)

- **IMPLEMENT**, each assertion phrased as **resulting DOM**, never "an event fired":
  1. **At rest**: `.stx-slot` children are `.stu-place` fat-marker blocks, zero `.ds-metric-tile`
     on the stage, `[data-studio-compile="ready"]` present, and **no `vocabulary.json` request has
     been made** (`p.on("request")` collector — the lazy-fetch property).
  2. **The beat**: click Compile → wait for the settled state → every `.stx-slot` now holds a
     library primitive, the slot **count and every `data-stx-id`/`data-col`/`data-row` are
     unchanged** (read them before and after — this is what "the reader's arrangement survives"
     means, and it is the assertion that catches a repopulate-instead-of-swap regression).
  3. **AC #3, byte-identical**: capture `stage.outerHTML` after settle → revert → compile again →
     compare **exactly equal**. Then repeat on a **fresh page load** and compare across loads.
  4. **AC #4**: sample `document.getAnimations()` during the beat (poll a few times across the step
     window) and assert **zero** animations whose `effect.pseudoElement` starts with
     `::view-transition`.
  5. **AC #5**: a reduced-motion context — reuse the file's existing idiom at :1003
     (`browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })`) →
     compile → `stage.outerHTML` **equals** the no-preference run's, and it settles without the
     step delays. Assert the beat still **completed** (real components on the stage), not merely
     that it was quiet — "quiet" is trivially true of a beat that never ran, which is the defect
     class vt-verify's canvas block calls out by name.
  6. **Announcements**: exactly one live-region sentence per step, counted, in order — per path, the
     way the existing move assertions are counted (a naive "at least one" passes for a beat that
     announces only its end).
  7. **The zero-inline-styles claim on the RUNNING page**: no `.stx-slot` or composed node has a
     `style` attribute after the beat.
  8. **No page errors / no console errors** — the existing collectors already fail the run.
  9. Extend the summary line at :1221 with the compile clause.
- **PATTERN**: `tooling/studio-journey.mjs:1083-1130` (`factoryPass`), :1040-1060 (the
  `getAnimations` idiom already in the file).
- **GOTCHA**: run it against a **served** tree — `node tooling/visual-regression/serve.mjs &` first.
  Playwright resolves out of `tooling/visual-regression/node_modules`, never a repo dep.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all` → all three engines green.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4, AC #5.

### 10. ADD `tooling/vt-verify.mjs` — /factory's compile beat opens zero transitions

- **IMPLEMENT**: a **`/factory.html` block modelled on the studio-canvas block at :279-350** — not a
  `SITEWIDE` row (those hardcode `calls === 1`; this claim is the opposite number) and not an
  extension of the canvas block (that one runs against `/studio.html`, which never mounts
  `studio.mjs` and so has no compile beat). Structure, in this order:
  1. context + `addInitScript(HOOK)` + `goto("/factory.html")`, wait
     `[data-studio="ready"]` then `[data-studio-compile="ready"]`;
  2. `t("factory · load opens zero transitions", boot.calls === 0)`;
  3. `reset(p)`, then **prove the beat happened**: capture the stage's component signature before and
     after (e.g. `.stx-slot .ds-metric-tile` count 0 → 3) and assert it CHANGED, before asserting
     anything about transitions;
  4. `calls === 0` and zero `::view-transition-*` pseudos (copy the pseudo filter verbatim);
  5. the reduced-motion repeat, with the same movement precondition taken again — written out, not
     inherited, exactly as the canvas block explains at :350-360.
- **PATTERN**: `tooling/vt-verify.mjs:279-350` (the canvas block) — read its two comments first:
  PROVE THE MOVEMENT FIRST, and why the pseudo filter ignores `element.animate()`.
- **GOTCHA**: this is the assertion `getAnimations()` alone cannot make — an opened-then-skipped
  transition leaves no running pseudo, and `HOOK`'s counter is what catches it. Both nets,
  deliberately. Do **not** relax the filter to catch the crossfade: the crossfade's `pseudoElement`
  is `null` and that is correct.
- **VALIDATE**: `node tooling/vt-verify.mjs all` (server running) → green, and mutate by wrapping the
  swap in `morph()` once to watch it go red; revert.
- **SATISFIES**: AC #4.

### 11. UPDATE `system/param-manifest.json` + regenerate `param-count.json`

- **IMPLEMENT**: one entry —
  `{ "page": "/factory", "selector": "[data-studio-canvas] .stu-compile button", "label": "compile beat controls (compile / back to blocks = one row)", "note": "added by #207" }`
  — matching the `$description`'s granularity rule (a button row = 1) and the two `#206` canvas
  entries' wording at :78-79. Then `node agent-layer/gen-param-count.mjs`.
- **GOTCHA**: CI `verify` drift-checks `param-count.json`; an omitted control is a review-catchable gap.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && git diff --stat system/param-count.json`
  (must show the /factory total and the site total each +1).
- **SATISFIES**: house rule (epic §"Every ticket carries").

### 12. REGENERATE `system/loc-summary.json` + the approach baselines

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (a new tracked `system/*.mjs` changes the
  rounded runtime count), then regenerate **both approach baselines** — approach renders the numbers.
- **GOTCHA**: `gen-loc-summary` reads **git-tracked** content, so run it **after** `git add`
  (memory: "loc-summary counts tracked only" — a pre-staging `--check` is a false "no drift").
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the staged tree → no drift.
- **SATISFIES**: house rule.

### 13. REGENERATE the visual-regression baselines

- **IMPLEMENT**: from a **clean detached worktree under `/Users`** (never `/private/tmp` — Docker
  can't share it), `cd tooling/visual-regression && npm ci && npm run update:docker`. Affected:
  **factory** (new at-rest control row + copy, both packs) and **approach** (the loc numbers). Commit
  the changed PNGs in this PR.
- **GOTCHA**: the gate screenshots the **dirty tree**; `update:docker` skips a baseline whose only
  change is sub-perceptual (`rm` the PNG to force it); `maxDiffPixels: 100` can swallow a few changed
  digits, so a green update run is not proof a page didn't change — eyeball the factory diffs.
  **Baseline collision — checked, not assumed:** #208 (share codec v2) is the other wave-3 ticket;
  it is **open with no branch and no PR** as of 2026-08-05, and its surface is `/build`'s codec, not
  `/factory`. It also has no `loc-summary` overlap risk *only* if it lands after this PR — both
  tickets add a tracked `system/*.mjs`, and `loc-summary.json` + the **approach** baselines are the
  shared artifact. Re-check immediately before regenerating:
  ```bash
  gh pr list --state open --json number,title,headRefName
  git branch -a | grep -Ei '20[0-9]'
  ```
  If a #208 PR is open, the epic's rule applies: **the second one merges `main` first, then re-runs
  `update:docker`** — and remember reviews validate the pre-merge tree, so check
  `mergeStateStatus` before triaging any review findings.
- **VALIDATE**: `gh pr checks` green on the PR (the `visual` job is the real verdict; a local pass is not).
- **SATISFIES**: AC #7.

### 14. WRITE the artifacts and open the PR

- **IMPLEMENT**: `.claude/reports/studio-compile-beat-207-report.md` (via `/system-execution-report`),
  commit plan + report, `gh pr create` with a body carrying **`Closes #207`**, then
  `/piv-review-pr` and commit the review at `.claude/code-reviews/pr-<N>-review.md`.
- **VALIDATE**: `gh pr view --json body | grep -c "Closes #207"` → 1.
- **SATISFIES**: house rules.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo — don't hunt for one. "Done" = run
the surface you touched, plus the committed gates that already exist.

### Committed (CI) — `tooling/build-checks.mjs`

Group 15 (new) drives the pure pipeline: real board, five patterns against the real generated
vocabulary, determinism by deep-compare, totality over junk, the retained refusal clause. Group 7
extended to vet the new module. Group 15's summary line must state the boundary it cannot reach.

### Operator-run drivers (cross-engine)

`tooling/studio-journey.mjs` — the running-page half (Task 9). `tooling/vt-verify.mjs` — the
zero-transition claim (Task 10). Both need `node tooling/visual-regression/serve.mjs` running.

### Pixel gate

`tooling/visual-regression` — factory's new at-rest under neutral + saulera. The beat is
reader-triggered, so at rest the gate still captures fat-marker blocks; the only churn is the control
row and the copy.

### Edge cases that must be exercised

- An empty board (no places) → `state: "empty"`, no compile, blocks untouched, one honest sentence.
- A pattern named with `inLibrary: false` → the retained out-of-library card (vacuous today; guarded).
- `renderComposition` throws → the refusal card, message verbatim, blocks retained, **nothing on the console**.
- `vocabulary.json` 404 → the "not available" card; the beat does not half-apply.
- Compile → revert → compile: byte-identical, ids stable, `Undo` still points at the same history.
- Compile with the reader having **moved** a block first: the component lands in the moved slot.
- Reduced motion: no travel, identical end state.
- The `saulera` pack on: compiled components re-skin with the pack, no literal anywhere.

---

## VALIDATION COMMANDS

### Level 1: Syntax & module hygiene

```bash
node --check system/studio-compile.mjs 2>/dev/null || node -e 'import("./system/studio-compile.mjs")'
node -e 'import("./system/studio.mjs").then(()=>console.log("node-import ok"))'
grep -n "view-transition-name\|morph(" system/studio-compile.mjs system/studio.css   # expect: nothing
grep -n "innerHTML\|insertAdjacentHTML\|\.style\." system/studio-compile.mjs          # expect: nothing
```

### Level 2: The committed gate

```bash
node tooling/build-checks.mjs        # expect: build ✓  all 15 groups pass
node agent-layer/gen-param-count.mjs
node agent-layer/gen-loc-summary.mjs --check    # after staging
```

### Level 3: The drivers

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
```

### Level 4: Manual

`npx serve .` → `/factory.html`: compile, revert, compile; keyboard-only (Tab to Compile, Enter);
screen-reader-ish check that the live region says four things in order; switch the pack mid-compiled
state; toggle Inspect on and click a compiled component; reload with reduced motion forced.

### Level 5: The mutation checks (do not skip)

Every #137 defect survived a green gate the same way — the check skipped the thing it tested. Mutate
the source, watch it go red, restore. Four, each naming its gate:

| Mutation | Must fail | Why this one |
|---|---|---|
| `compose`'s dashboard branch emits `"metric-tiles"` | build-checks **group 15** | proves the vocabulary check is live, not a shape check |
| the swap runs inside `document.startViewTransition(() => …)` | **vt-verify** (`calls === 0`) | proves AC #4 is measured, not asserted about a page where nothing moved |
| one `node.style.opacity = "1"` in the crossfade | build-checks **group 7** (`writes === 1` → 2) | proves the zero-inline-styles claim is real |
| a template stubbed to return two roots (or `nodes.length + 1` in the check) | the **alignment tripwire** → refusal card | proves the tripwire can fire at all |

Restore all four. A mutation that stays green is a finding about the check, not about the code.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — the fat-marker stage and the compiled stage render from the same board; one source,
      two fidelities, no second truth (asserted: same slots, same ids, same arrangement across the swap).
- [ ] **AC #2** — the beat runs the committed pipeline stepwise; every rendered component validates
      against the real generated `handoff/verdant/vocabulary.json` (build-checks group 15).
- [ ] **AC #3** — running the beat twice from the same board produces a byte-identical settled DOM
      (studio-journey: same page and across loads; build-checks: the pure result deep-compared).
- [ ] **AC #4** — `document.getAnimations()` shows zero `::view-transition-*` pseudos during the beat,
      and `startViewTransition` is never called (vt-verify).
- [ ] **AC #5** — reduced motion: no travel, identical end state (studio-journey, DOM-equal).
- [ ] **AC #6** — the out-of-library refusal card is retained and honest, guarded by a deliberately
      vacuous clause + a tripwire.
- [ ] **AC #7** — factory baselines regenerated for the new at-rest (and approach's, for loc-summary).
- [ ] `param-manifest.json` entry + `param-count.json` regenerated.
- [ ] Zero inline styles, zero markup-from-string in the new module (group 7, with no exception argued).
- [ ] No new runtime dependency, no build step, no live model call.
- [ ] Plan, report and review committed in the same PR; PR body carries `Closes #207`.

---

## COMPLETION CHECKLIST

- [ ] All 14 tasks completed in order, each validated immediately
- [ ] `node tooling/build-checks.mjs` → all 15 groups pass
- [ ] `node tooling/studio-journey.mjs all` → three engines green
- [ ] `node tooling/vt-verify.mjs all` → green
- [ ] The three mutation checks each went red, then were restored
- [ ] Baselines regenerated from a clean detached worktree; `gh pr checks` green
- [ ] portfolio-design `references/CHECKLIST.md` run over the changed surface
- [ ] Manual pass: keyboard-only, reduced motion, both packs, inspect on

---

## OPEN QUESTIONS / ASSUMPTIONS

**D1 — DECIDED 2026-08-05 by the PRD holder: the beat is reader-triggered; at rest stays
fat-marker.** `/factory` loads showing the drafted board as fat-marker blocks plus a "Compile the
board" control; the reader triggers the beat, and #209's replay later drives the same beat through
`getCompile()`. Consequences this plan already carries: no `vocabulary.json` fetch in the load path,
no new VR wait handle in `visual.spec.mjs` (`[data-studio="ready"]` still covers the page), the
pixel gate cannot race the beat, and AC #3's "run it twice" is something a person can do. The
architecture's "autoplay-to-completion as the gated at-rest state" refers to #209's replay, not to
this ticket. **This was the plan's last open question; it is closed.**

**A2 — the swap is positional and in-place, not a repopulate.** Content swaps inside the existing
`.stx-slot` wrappers keep `data-stx-id`, `data-col`/`data-row`, the aria wiring and the undo history
coherent, and are what make the settled DOM byte-identical on a re-run. A repopulate would increment
`place()`'s `nextId` on every run and break AC #3 by construction.

**A3 — cardinality, MEASURED not assumed.** Ran against `3a03266`: the drafted default board is
`dashboard`, 3 places → 3 slots → 3 `metric-tile`s, 1:1. `slotsFor` is 1:1 with places for
`dashboard` and `onboarding`; `queue`, `feed` and `settings` derive from **affordances** and can
differ from the place count in either direction. Because `/factory`'s store is in-memory and always
`DEFAULT_ANSWERS` (`build-questions.mjs:65-73`), the page only ever exercises the 1:1 case today.
The mismatch cases are therefore retired in **two** places rather than left to run-time discovery:
build-checks group 15 asserts `composition.length === slots.length` for all five patterns and
records which are place-derived vs affordance-derived (Task 6.2), and the DOM's extra/surplus
branches are written, kept exact by `revert()`, and **labelled in the header as #212's branches**
(Task 4). Nothing is written defensively-and-vaguely.

**A4 — `INSPECT_IDS` is exported rather than copied.** One list of inspect ids; a copy would drift
and an unknown id aborts inspect for the whole page.

**A5 — the honesty sentences are reused verbatim** from `pattern-render.mjs`, not paraphrased. If
they read oddly on a canvas rather than a stage, change them **there** and let both surfaces move
together, or state the difference explicitly.

**A6 — no analytics.** #210 owns the win-metric routes; a "compiled" event here would be a second
place deciding what counts as the win.

---

## NOTES (open canvas)

### The four invariants the module header must carry

1. **IMPORT, NEVER FORK.** `patternFor`, `slotsFor`, `compose`, `renderComposition`, `clampSlot`,
   `INSPECT_IDS` — all imported. This module contributes *no rule*. If a rule needs changing, it
   changes in `pattern-rules.mjs` and /build changes with it.
2. **IT IS A CROSSFADE.** No `view-transition-name`, no `morph()`. Naming changes stacking (#171
   shipped a real at-rest regression through exactly that) and the pixel gate re-baselines that class
   of bug. VT is a gated upgrade behind #190 + a studio state-matrix `vt-stack-audit`.
3. **THE SWAP TOUCHES CONTENT, NEVER SLOTS.** Movement belongs to `studio-verbs.mjs`'s single
   `ui.move` consumer. This module never emits `ui.move`, never calls `applySlot`, never writes
   `data-col`/`data-row` — otherwise #209's replay inherits a second mover to fight.
4. **DETERMINISM IS A REQUIREMENT, NOT A NICETY.** The settled canvas is (or will be, at #209) a VR
   baseline. No timestamps, no counters, no randomness, fixed step strings, ids stable across runs.

### Why in-place swap beats a second stage

A separate "compiled stage" crossfading against the fat-marker stage would be simpler to write and
would satisfy a literal reading of AC #1 — but the compiled components would then not be *on the
canvas*, so they could not be dragged, and #209's replay + #212's flows would have to undo it. The
mechanic the PRD names is "blocks **snap into** real components", in place. Take the harder path.

### The one thing most likely to be silently wrong

`renderComposition` returns a **DocumentFragment** whose children are consumed the moment you append
them. Take `[...frag.children]` **before** appending anything, and assert the count against
`composition.length`. Verified today: `metric-tile` (:321), `list-row` (:333) and `sequence-step`
(:350) each `return el("div", …)` — one root apiece — so the count holds. The day a template returns
two top-level nodes, the positional swap would misalign silently and every other assertion would
still pass, which is why the tripwire ships now rather than then.

### Risk register — closed, with how

| Risk | Status | How it is closed |
|---|---|---|
| Fragment/composition misalignment | **Closed** | Verified single-root templates + a throwing tripwire caught by the refusal path (Task 4) |
| Cardinality ≠ place count for 3 of 5 patterns | **Closed** | Measured; gated for all five in group 15; DOM branches labelled as #212's (Tasks 4, 6.2) |
| Baseline collision on factory/approach | **Closed** | #208 has no branch and no PR; re-check command + the merge-main-first rule in Task 13 |
| At-rest ambiguity (autoplay vs triggered) | **Closed** | Decided by the PRD holder 2026-08-05 → D1 |
| A check that cannot fail | **Closed** | Three named mutations that must go red before commit (Level 5), each with its restore |

### Sizing

Ticket estimate ~700-900 lines. Realistic split: `studio-compile.mjs` ~380 · group 15 ~170 ·
studio-journey ~150 · vt-verify ~50 · `studio.css` ~50 · `studio.mjs` + `factory.html` + manifest ~40
· generated/baselines. That lands in range with the gate work at roughly ⅓, as the epic requires.

## AMENDMENTS

- 2026-08-05 — **D1 answered by the PRD holder**: `/factory` stays fat-marker at rest and the reader
  triggers the beat (was assumption A1). No VR handle change, no load-path fetch.
- 2026-08-05 — **Three risks retired against the tree at `3a03266`, not by reasoning**: single-root
  templates verified (`agentic-renderer.mjs:321,333,350`); the drafted board measured
  (dashboard · 3 places · 3 slots · 1:1, all five patterns `inLibrary: true`); #208 confirmed to have
  no branch and no PR. Tasks 4, 6, 7, 9, 10 and 13 rewritten with the exact line numbers, the exact
  `MODULES` shape (filename only, `writes === 1`), the correct vt-verify model (the canvas block at
  :279-350, on `/studio.html`, so /factory needs its own block), and the reduced-motion context
  idiom already in studio-journey at :1003. Risk register + a four-row mutation table added.
