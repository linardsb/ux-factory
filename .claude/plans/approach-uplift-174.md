# Feature: Wave 3 — Approach: dual-register copy + derive-probe scrub upgrade + param count rendered (#174)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

`/approach` is the page where a reader who wants to verify the claims goes. It already carries the
strongest evidence on the site — real code extracted from the live source (`annotated-source`), the
shipped derivation engine executing on a colour the reader picks (`derive-probe`), and two measured
numbers from drift-checked artifacts. But the page is mostly *read*: exactly **one** live control
(the probe's colour picker) against /build's 34 and home's 21.

This ticket brings /approach up to the epic's "behaves like the tool it describes" bar with four
additive changes, in the order they matter:

1. **Drag-to-scrub the probe.** Two new handles — brand **hue** and brand **lightness** — sit beside
   the existing colour picker. Dragging either re-runs the *real* `derive()` per change and the strip
   reports what the engine did, notes verbatim. This is the exhibit's whole point sharpened: the
   engine's accent lightness clamp is `[0.35, 0.60]` (`derive.rules.mjs:42`), so scrubbing the brand
   lightness up to 95% and watching the engine drag it back down is the rule *demonstrating itself*.
2. **Inspect mount.** `/approach` gets `system/inspect.mjs` + `data-inspect` on the components that
   actually resolve through the token contract (hero, buttons, method cards, decision cards). The ⌘K
   palette's "toggle inspect" command appears on the page for free — it is presence-gated on
   `[data-inspect]` (`palette.mjs:120`).
3. **Dual-register copy cut.** Four places open with an unexplained specialist term. Each gets a
   plain first layer with the precise term kept immediately alongside; glossary coverage extends to
   the terms that survive in that first layer.
4. **Param count.** Already rendering (#167 shipped it at `approach.html:257-265`). This ticket adds
   the three new `/approach` controls to the manifest and **proves the flow-through** — change the
   manifest, regenerate, watch the number move on the page.

## User Story

As a **hiring manager verifying a senior UX-engineering claim**
I want to **drag the numbers behind the site's contrast rule and watch the real engine answer**
So that **I can see the system working instead of reading an assertion that it works** — and so the
page that explains the method doesn't itself require me to already know the vocabulary.

## Problem Statement

Two symptoms, both named in the epic PRD:

- **/approach is view-only.** One live control on the page the epic's own generated count renders.
  The page argues that the design system responds to a brand colour; the reader can change that
  colour exactly one way (an OS colour picker), which is a poor demonstration of a *continuous*
  negotiation. The interesting behaviour — the clamp, the darkening loop, the notes changing as you
  cross a bound — is invisible unless you happen to pick two colours either side of a threshold.
- **The copy leads with the vocabulary.** `#case`'s "The one rule" opens *"Components may only
  reference semantic tokens"*; "Build" opens *"Three stylesheets load in order: a token contract…, a
  swappable brand pack…"*. The terms are glossary-marked, but a hover bubble is a *rescue*, not a
  first layer. A 90-second reader who doesn't hover leaves without the plain meaning.

## Solution Statement

Import the **already-shipped** scrub primitive (`makeScrubbable`, `system/scrub.mjs:31`) into
`derive-probe.mjs` and render two handles that read the brand hex live and write it back — one file,
one engine, no second code path. Register one **probe-private** `@property` typed `<color>` so the
swatch glides between derived accents instead of snapping. Add `data-inspect` to the four
components on the page that are real `system-graph` consumers, plus the toggle and the script tag.
Cut four copy sites to dual register and extend `glossary.mjs`'s `TERMS`. Add three manifest entries,
regenerate every artifact the change touches, regenerate the two approach baselines.

Everything is additive. No structure moves, no exhibit is replaced, the honesty contract is
untouched — the probe still runs `derive()` and prints `result.notes` verbatim.

## Out of Scope / Non-Goals

- **Not included: instrumenting `.asrc-block` / `.asrc-probe` themselves with `data-inspect`.** The
  ticket's phrasing ("inspect mount over approach's annotated-source + probe surfaces") reads that
  way, but those are `portfolio.css` page-surface styles with **no `system-graph.json` consumer**,
  and `gen-inspect-data.mjs` can only emit ids that are consumers (`gen-inspect-data.mjs:65-67`
  throws otherwise). Both routes in are out of discipline — extending `gen-system-graph.mjs` to
  `portfolio.css` would churn `system-graph.json` *and* factory.html's `#shape` exhibit and its
  baseline; hand-writing an `inspect-data.json` entry drifts on the next regen. Resolution: mount on
  the components that live in the same `#case` band — `decision-card-organism` (the four cards
  directly above the exhibit), plus `page-hero`, `buttons`, `cards`. Assumption, not a blocker; no AC
  depends on it. See OPEN QUESTIONS.
- **Not included: a third scrub handle for chroma.** Hue + lightness is what the ticket names, and
  chroma is the axis `toGamut` already owns — a chroma handle would fight the gamut mapper and read
  as broken. Defer.
- **Not included: changing how the scrub primitive behaves.** `makeScrubbable`'s drag gain, clamping,
  keyboard model, rAF throttling and no-caching contract all ship as-is. The **one** edit to
  `scrub.mjs` is widening its returned handle by `reflect` — a function that already exists inside it
  (`scrub.mjs:41-45`), exposed so the probe can close the picker → handle display gap without
  duplicating it (Task 1 step 4). Additive; home ignores the return value, so its behaviour is
  byte-identical.
- **Not changing:** the probe's honesty posture (real `derive()`, notes verbatim, `textContent`
  only, no `<style>` injection), the `#asrc[data-asrc="ready"]` VR handle contract, the fixed intake
  answers (`density/rewardType/frequency`), `annotated-source`'s extracted code (only its
  hand-authored `prose` is copy-cut).
- **Not changing:** `scrub.mjs`'s home mount, or the file's location. It is imported, not split —
  see NOTES for the import-graph cost this accepts and why.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/derive-probe.mjs`, `approach.html`, `system/glossary.mjs`,
`system/portfolio.css`, `system/scrub.mjs` (one additive line — see Out of Scope),
`agent-layer/annotated-source.spec.json`, `agent-layer/gen-inspect-data.mjs` (ROLES),
`system/param-manifest.json`, four generated artifacts, two VR baselines
**Dependencies**: none new. Reuses shipped `system/scrub.mjs`, `system/oklch.mjs`,
`system/derive.mjs`, `system/inspect.mjs`. No npm, no build step (CLAUDE.md hard constraint).

## Related Work

**Implements**: [#174](https://github.com/linardsb/ux-factory/issues/174) · **Epic**:
[#164](https://github.com/linardsb/ux-factory/issues/164) —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md`

**Back-references**:

- `.claude/plans/home-uplift-169.md` — Why: the sibling wave ticket. **Lift its mechanics verbatim**:
  the two-stage `@property` proof (lines 419-424), the `rm`-before-`update:docker` rule, the
  generator ordering, the dual-register rewrite method. Its `scrub.mjs` is the primitive this ticket
  consumes.
- `.claude/plans/inspect-engine-166.md` — Why: the inspect engine's mount contract, the
  `gen-inspect-data.mjs` ROLES mechanism, the `drift-check` inspect-mounts gate.
- `.claude/plans/param-count-manifest-generator.md` — Why: #167 built the manifest + generator and
  **already landed the render on approach.html**. Read before touching AC #3.
- `.claude/plans/annotated-source-glossary.md` + `docs/epics/annotated-source-glossary.architecture.md`
  — Why: the probe's and glossary's governing doc; the "code shown = code run" property this ticket
  must preserve.
- `.claude/plans/protos-pack-skin-inspect-175.md` — Why: the most recent inspect-mount precedent
  (Wave 4 landed before Wave 3).

**Forward-references**:

- #173 (Wave 3 — Factory) runs **in parallel** with this ticket and touches three of the same files.
  See NOTES §"Collision with #173".
- #177 (epic close) audits copy across all 10 pages and asserts the INP budget.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/derive-probe.mjs` (all 85 lines) — Why: the file being upgraded. Note the `el()` builder,
  `FIXED`/`DEFAULT_BRAND`/`PAIR` constants, `run(hex)`, and the `{ destroy }` return shape.
- `system/scrub.mjs` (lines 1-88) — Why: **`makeScrubbable` is the primitive to import.** Line 8-9 of
  its header already records this ticket's use ("#174 imports makeScrubbable for approach's derive
  probe and ignores the mount"). Lines 26-88 are the API; **lines 12-15** are the no-caching
  discipline (`read()` at every interaction start and focus, never cached) this call site must honour.
  **Lines 126-130** are the achromatic-fallback shape to lift.
- `system/scrub.mjs` (lines 108-165) — Why: the home mount, as the reference *call site* — how `row()`
  builds the label+handle pair, how `read`/`onChange` are wired, the bounded-slider decision at
  line 142-143 ("no 0/360 wrap … Home/End are real endpoints") that this ticket mirrors.
- `system/oklch.mjs` (lines 76-100) — Why: `hexToOklch`, `oklchToHex`, `toGamut` — the exact three
  the home hue handle uses. `l` is 0–1, `h` is degrees, `toGamut` collapses chroma near the ends.
- `system/derive.rules.mjs` (lines 38-62) — Why: `lightnessClamp: [0.35, 0.60]` and the darkening
  loop. The numbers the copy and the caption may reference — read them, never retype them from memory.
- `approach.html` (lines 156-175 markup, 218-273 scripts) — Why: the `#asrc` grid, the `#asrc-probe`
  mount, the two `.loc-proof` lines, and the inline module that orchestrates them. **Lines 257-265
  already render the param count** (AC #3's first clause).
- `system/inspect.mjs` (lines 63-75, 191-224, 300-308) — Why: mount contract. Triggers are collected
  **once per activation** (`wireTriggers:193`), so any `data-inspect` on a node rendered inside the
  page's async `.then()` is invisible to a reader who already had inspect on. Static markup only.
- `system/palette.mjs` (lines 116-127) — Why: the inspect command is presence-gated on
  `document.querySelector("[data-inspect]")` at **build time**, and the palette memoizes its command
  list (memory: `palette-memoizes-needs-static-tags`). Another reason the mounts must be static HTML.
- `agent-layer/gen-inspect-data.mjs` (lines 23-57 ROLES, 61-88 the join) — Why: adding
  `decision-card-organism` is one ROLES entry + a regen. Line 65-67 throws if the key names no
  `system-graph` consumer — the drift guard.
- `tooling/drift-check.mjs` (lines 88-121) — Why: gates 2e (inspect-data drift) and 2f (inspect
  mounts — every `data-inspect="id"` in tracked HTML must resolve). Both run in CI `verify`.
- `system/portfolio.css` (lines 671-731 probe + loc-proof; 974-1017 stage scrub + `@property`) —
  Why: the probe's existing classes, the `.stage-scrub-handle` recipe this ticket reuses, and
  **lines 1002-1004's standing warning: "NEVER register `color-*`"** — read it before adding any
  `@property`, and read NOTES §"Why the probe's @property is safe".
- `system/glossary.mjs` (lines 33-50 `TERMS`, 52-57 the validating init) — Why: adding terms is one
  object entry each; an unknown `data-term` **throws and aborts the page module**, so `#asrc` never
  gets `data-asrc="ready"` and the VR gate fails loudly. Add the key before the markup.
- `agent-layer/annotated-source.spec.json` — Why: the hand-authored `prose` arrays are copy-cut
  targets (the extracted *code* is not). Editing them requires
  `node agent-layer/gen-annotated-source.mjs`.
- `system/param-manifest.json` (lines 2 counting rules, 33 the one `/approach` entry) — Why: the
  three new entries go here, matching the existing shape exactly.
- `tooling/visual-regression/visual.spec.mjs` (lines 31-35) — Why: approach's spec entry —
  `waitReady: '#asrc[data-asrc="ready"]'`, no `waitVisible`. Do not change it.
- `index.html` (lines 53, 67-68, 111-131, 415) — Why: the reference inspect mount markup and the
  `inspect.mjs` script-tag position (immediately after `dock.mjs`, palette stays last).

### New Files to Create

**None.** Every change lands in an existing file. (Deliberate — see NOTES §"Why no new module".)

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- `docs/epics/prototyping-feel-uplift.architecture.md`
  - §"New pieces and where they land", the **"Scrub values"** row: *"extend `system/derive-probe.mjs`
    + new mounts — Pointer-delta drag on numerics, `@property`-typed custom properties so CSS
    feedback interpolates smoothly."* This ticket is that row, verbatim.
  - §"Copy: dual register" — the rewrite rule and the `/no-ai-slop` + `/humanizer` requirement.
  - §"Constraints that shape implementation" — the VR-gate rules. Read before touching CSS.
- `docs/epics/annotated-source-glossary.architecture.md` — the probe's governing doc; the
  "code shown and code run are one file" property (AC-adjacent, per-ticket context).
- `CLAUDE.md` — "View-time behaviour on shipped pages" · "New live-manipulable control on a shipped
  page" (manifest entry + regen in the same PR) · "Shipped pages are vanilla" · Git conventions
  (`Closes #N` in the PR **body**; plan + report + review committed in the same PR).
- [MDN `@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) — §"Formal syntax":
  a registered property REQUIRES `syntax`, `inherits` and (for non-universal syntax) `initial-value`,
  and the initial value must be a `var()`-free literal. Why: the registration is silently dropped
  otherwise and the glide degrades to a snap with no error.
- [MDN Pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  — Why: `makeScrubbable` uses it; `touch-action: none` on the handle is what makes drag work on
  touch (already in `.stage-scrub-handle`, `portfolio.css:989`).
- [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) — Why:
  `makeScrubbable` implements it (`role="slider"`, `aria-valuemin/max/now/text`, arrows + Home/End).
  The call site supplies honest `min`/`max`/`label`.

### Patterns to Follow

**Module header (every file this repo ships):** a comment citing the governing doc. `derive-probe.mjs`'s
existing header (lines 1-10) gets extended, not replaced — keep its honesty paragraph intact.

**DOM building — `textContent`, never `innerHTML`.** The `el()` helper is repeated in
`derive-probe.mjs:21-31`, `glossary.mjs:21-31`, `inspect.mjs:42-52`, `scrub.mjs:96-106`. It is
deliberately duplicated per module (no shared import). Follow that — use the one already in
`derive-probe.mjs`.

**Scrub call site** (`scrub.mjs:144-152`, the home hue handle) — the shape to mirror:

```js
makeScrubbable(row("Brand hue", { "data-scrub": "hue" }), {
  min: 0, max: 360, step: 2, unit: "°", label: "brand hue", read: readHue,
  onChange: (h) => { /* … recompute + apply … */ },
});
```

**Defensive OKLCH read** (`scrub.mjs:126-130`) — the achromatic fallback chain to lift:

```js
const readHue = () => {
  try { return Math.round(hexToOklch(prop("--color-accent"))?.h) || 0; }
  catch { try { return Math.round(hexToOklch(brandHex()).h) || 0; } catch { return 0; } }
};
```

**Generated-artifact discipline:** every generator is `node agent-layer/gen-<x>.mjs`, supports
`--check`, and is gated by `tooling/drift-check.mjs` in CI `verify`. Never hand-edit a file whose
`$description` says GENERATED.

**Inspect mount markup** (`index.html:53, 67, 111`): the attribute rides on the existing element —
`<section class="page-hero" data-inspect="page-hero">`, `<a class="btn …" data-inspect="buttons">`,
`<article class="card" data-inspect="cards">`. No wrapper, no extra element, invisible at rest
(the affordance outline is gated on `:root[data-inspect-mode="on"]`).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — the scrub handles wired to the real engine

The load-bearing change and the one AC #1 is written against. Everything else is additive around it.

**Tasks:**
- Import `makeScrubbable` into `derive-probe.mjs`; render a scrub row under the existing picker row.
- Wire hue + lightness to read `input.value` live and write it back, then re-run `run(hex)`.
- Bound lightness to 20–95 so the hue handle stays live across the whole range (see NOTES).

### Phase 2: The smooth feedback + surface CSS

**Depends on:** Phase 1 (the markup the CSS styles must exist).

**Tasks:**
- `@property --asrc-probe-accent` typed `<color>`, probe-private; swatch transitions it under
  `prefers-reduced-motion: no-preference`.
- `.asrc-probe-scrub` layout block; reuse `.stage-scrub-handle`'s recipe.

### Phase 3: Inspect mount

**Independent of:** Phases 1-2 (different files, no shared state). Can run in parallel or first.

**Tasks:**
- ROLES line for `decision-card-organism` in `gen-inspect-data.mjs`; regenerate `inspect-data.json`.
- `data-inspect` attributes on approach's static markup; the toggle button; the script tag.

### Phase 4: Copy cut + glossary

**Independent of:** Phases 1-3, EXCEPT: the probe's own caption copy is written in Phase 1, so run
the copy skills over it here too.

**Tasks:**
- Rewrite the four flagged sites to dual register; extend `glossary.mjs` `TERMS`; cut the
  `annotated-source.spec.json` prose lead and regenerate.
- `/no-ai-slop` + `/humanizer` over **every rewritten line**, before commit.

### Phase 5: Manifest, artifacts, baselines

**Depends on:** Phases 1-4 (counts the controls they added; the baselines capture their pixels).

**Tasks:**
- Three `param-manifest.json` entries; regenerate param-count, loc-summary, inspect-data,
  annotated-source; full `drift-check`.
- **Prove AC #3's second clause** — mutate the manifest, regen, see the page number move, revert.
- Regenerate `approach-neutral.png` + `approach-saulera.png` with the two-stage `@property` proof.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — CREATE branch

- **IMPLEMENT**: `git switch -c feature/approach-uplift-174` from a clean `main` at `45be42a` (or
  later). Confirm `git status` is clean first.
- **GOTCHA**: memory `shared-worktree-parallel-sessions` — parallel ticket sessions share this
  working dir. Verify the branch immediately before every commit and stage by explicit path, never
  `git add -A`. Memory `review-validated-premerge-tree` — if `main` moves during the ticket, merge it
  in and **re-run every gate**, don't assume prior green holds.
- **VALIDATE**: `git branch --show-current` prints `feature/approach-uplift-174`; `git status --short`
  is empty.
- **SATISFIES**: repo Git convention (CLAUDE.md)

### Task 1 — UPDATE `system/derive-probe.mjs` (the scrub handles)

- **IMPLEMENT**:
  1. Extend the imports: `import { makeScrubbable } from "./scrub.mjs";` and
     `import { hexToOklch, oklchToHex, toGamut } from "./oklch.mjs";`
  2. Add bounds as named constants beside `FIXED`/`DEFAULT_BRAND`:
     `const L_RANGE = { min: 20, max: 95 };` and `const DEFAULT_HUE = 135;` (the hue of
     `DEFAULT_BRAND`, rounded — measured: `hexToOklch("#8ecf6a").h === 135.4`).
  3. Build a scrub row after the existing `.asrc-probe-row`:
     ```
     <div class="asrc-probe-scrub">
       <p class="asrc-probe-cap">…plain caption…</p>
       <span class="asrc-probe-field">
         <span class="asrc-probe-slabel">Hue</span>
         <span class="stage-scrub-handle" data-scrub="probe-hue">…</span>
       </span>
       <span class="asrc-probe-field">… data-scrub="probe-lightness" …</span>
     </div>
     ```
     Build it with the module's existing `el()`. Handle text is written by `makeScrubbable`'s
     `reflect()` — leave it empty.
  4. **Sync must be bidirectional — and the two directions need different code.**

     **handle → picker.** Extract the single place that sets the brand:
     ```js
     function apply(hex) {
       input.value = hex;   // assignment fires no `input` event, so this can never loop back
       run(hex);
     }
     ```
     `onInput` stays `run(input.value)` — writing `input.value` from its own event is pointless.

     **picker → handle** is the direction that is easy to miss and *must* be closed. `read()` only
     fires on `pointerdown`, `keydown` and `focusin` (`scrub.mjs:56, 72, 84`), so after the reader
     picks a colour in the OS picker the handles keep **displaying** the old numbers until touched.
     Behaviour is already correct (they read live); the *display* is not, and a mouse-only reader
     sees two controls disagreeing on screen — the exact defect `apply()` exists to prevent.

     `handle.set(v)` is the wrong tool: it calls `apply` → `reflect` **and** `onChange`
     (`scrub.mjs:87`), so the reader's picked colour would round-trip through OKLCH and be
     perturbed. Fix: **widen `makeScrubbable`'s return object by one already-written function** —
     `scrub.mjs:87` becomes
     ```js
     return { set: (v) => apply(clamp(v)), reflect: () => reflect(clamp(read())),
              destroy: () => { wiring.abort(); cancelAnimationFrame(raf); } };
     ```
     This exposes an existing internal; it adds no behaviour and cannot affect home (which ignores
     the return value entirely, `scrub.mjs:144-164`). Then:
     ```js
     const onInput = () => { run(input.value); hueHandle?.reflect(); lightHandle?.reflect(); };
     ```
     Declare `let hueHandle, lightHandle;` **above** `run`/`onInput` so the optional chaining covers
     the initial `run(DEFAULT_BRAND)` before the handles exist.

     **Do NOT call `reflect()` from inside `run()`.** During a drag `makeScrubbable` has already
     reflected the pending value, and re-reading it back out of `input.value` after the
     hex round-trip can shift it by a step at low chroma — the dragged number would jitter under the
     cursor. The picker's `input` event is the only path the handles don't already track.
  5. Live reads — **never cached**, per `scrub.mjs`'s header contract (lines 12-15):
     ```js
     const readHue = () => {
       try { return Math.round(hexToOklch(input.value).h) || DEFAULT_HUE; }
       catch { return DEFAULT_HUE; }
     };
     const readL = () => {
       try { return Math.round(hexToOklch(input.value).l * 100); }
       catch { return Math.round(hexToOklch(DEFAULT_BRAND).l * 100); }
     };
     ```
     `|| DEFAULT_HUE` is the achromatic guard: `hexToOklch` pins hue to 0 (falsy) for a near-grey,
     which would make the handle read 0° and jump. Lift the shape from `scrub.mjs:126-130`.
  6. The two calls:
     ```js
     const hueHandle = makeScrubbable(hueEl, {
       min: 0, max: 360, step: 2, unit: "°", label: "brand hue", read: readHue,
       onChange: (h) => apply(oklchToHex(toGamut({ ...hexToOklch(input.value), h }))),
     });
     const lightHandle = makeScrubbable(lightEl, {
       min: L_RANGE.min, max: L_RANGE.max, step: 1, unit: "%", label: "brand lightness", read: readL,
       onChange: (v) => apply(oklchToHex(toGamut({ ...hexToOklch(input.value), l: v / 100 }))),
     });
     ```
     Note both `onChange`s spread `hexToOklch(input.value)` — the *live* brand — so scrubbing one
     axis preserves the other two. Deliberately a plain bounded slider, no 0/360 wrap: same keyboard
     model as home's three handles (`scrub.mjs:142-143`), `aria-valuemin/max` stay honest.
  7. Extend `destroy()` to `hueHandle.destroy(); lightHandle.destroy();` before the existing
     listener removal + `container.textContent = ""`.
  8. Extend the module header: one paragraph naming the two handles, the shared primitive, the
     bidirectional-sync property, and why lightness is bounded 20–95.
- **PATTERN**: `system/scrub.mjs:144-164` (call-site shape), `scrub.mjs:126-130` (defensive read),
  `derive-probe.mjs:21-31` (`el()`), `derive-probe.mjs:84` (destroy shape).
- **IMPORTS**: `./scrub.mjs` (`makeScrubbable`), `./oklch.mjs` (`hexToOklch`, `oklchToHex`,
  `toGamut`). Both already ship; no new files.
- **GOTCHA — importing `scrub.mjs` is verified inert on this page, not assumed.** It self-runs
  `mountStageScrub()`, which returns at `scrub.mjs:111` (no `[data-stage-scrub]` on approach). Its
  transitive `intake-beat.mjs` calls `registerBeat`, which returns at `spine.mjs:61` (no
  `#beat-intake` element) *before* the `activateOn` branch. Its transitive `factory-intake.mjs`
  self-inits at line 711 but `initIntake` returns at line 240 (no `#factory-wizard`). All three
  guards confirmed by reading. Cost: +1178 parsed lines on approach — accepted, see NOTES.
- **GOTCHA — no caching.** `read()` is called at every `pointerdown`, every keydown step and every
  `focusin` (`scrub.mjs:56, 72, 84`). Reading a module-scope "last hue" instead of `input.value`
  would let the picker and the handles disagree the moment a reader uses both. Read live.
- **GOTCHA — bounded 20–95, and say why in the comment.** Measured round-trip: at `l=0.05` the sRGB
  hex is `#000100`, `toGamut` collapses chroma to 0.020 and the hue reads back 142.5° (7° of drift);
  at `l=0.99` chroma is 0.019. At the chosen bounds chroma survives (0.058 at 20%, 0.105 at 95%) and
  hue reads back within 0.6° of the brand's 135.4°, so the hue handle stays live across the whole
  lightness range. The bounds still straddle the engine's `[0.35, 0.60]` clamp in both directions —
  the exhibit's whole point.
- **VALIDATE**: `node -e 'import("./system/derive-probe.mjs")'` (Node-import safe — no top-level DOM);
  then `npx serve .` → `/approach`, four checks:
  1. Drag each handle — hex, swatch, ratio line and notes all change per drag; the colour picker's
     own swatch tracks the drag; opening the picker shows the scrubbed colour.
  2. **Pick red in the OS picker, then look at the handles WITHOUT touching them** — both numbers
     must already read the new brand. (This is the direction step 4's `reflect()` calls exist for; it
     is the one that silently regresses.)
  3. Arrow / Home / End on a focused handle steps it.
  4. `aria-valuenow` / `aria-valuetext` update on both.

  Then load `/` and confirm the three home scrub handles still work — the `scrub.mjs` return-object
  edit must be provably inert there.
- **SATISFIES**: AC #1

### Task 2 — UPDATE `system/portfolio.css` (`@property` + the scrub row)

- **IMPLEMENT**: in the probe block (after `.asrc-probe-fixed`, `portfolio.css:722`):
  1. Layout, mirroring `.stage-scrub`'s recipe:
     ```css
     .asrc-probe-scrub { display: flex; flex-wrap: wrap; align-items: baseline;
                         gap: var(--spacing-sm) var(--spacing-lg); margin: 0 0 var(--spacing-md); }
     .asrc-probe-cap   { flex: 1 0 100%; margin: 0 0 var(--spacing-xs);
                         font-size: var(--type-caption); color: var(--color-fg-muted); max-width: 62ch; }
     .asrc-probe-field { display: inline-flex; align-items: baseline; gap: var(--spacing-xs); }
     .asrc-probe-slabel{ font-size: var(--type-caption); color: var(--color-fg-muted); }
     ```
     The **handle itself reuses `.stage-scrub-handle`** — same recipe, same `touch-action: none`,
     same focus ring. Add one line to that block's comment (`portfolio.css:974-976`) noting it is now
     shared with approach's probe (#174). No duplication, no rename.
  2. The registration, beside the probe (NOT in the #169 block):
     ```css
     /* Probe-private typed property (#174): the swatch GLIDES between derived accents instead of
        snapping. Not a contract token — the "NEVER register color-*" warning at :1002 is about
        --color-* tokens, whose values arrive from packs and imports in formats a registered syntax
        could reject. This one is written ONLY by derive-probe.mjs from derive()'s emitted hex, so
        <color> can never reject it. initial-value is the at-rest derived accent (measured). */
     @property --asrc-probe-accent { syntax: "<color>"; inherits: false; initial-value: #417e0f; }
     .asrc-probe-swatch { background: var(--asrc-probe-accent); }
     @media (prefers-reduced-motion: no-preference) {
       .asrc-probe-swatch { transition: --asrc-probe-accent var(--motion-base) var(--motion-ease-spring); }
     }
     ```
  3. In `derive-probe.mjs`'s `run()`, replace
     `swatch.setAttribute("style", \`background:${accent}\`)` with
     `swatch.style.setProperty("--asrc-probe-accent", accent)`.
- **PATTERN**: `portfolio.css:1005-1017` (#169's registrations + the no-preference transition block),
  `portfolio.css:977-994` (`.stage-scrub*`).
- **GOTCHA**: `#417e0f` is the **measured** at-rest accent for `DEFAULT_BRAND` `#8ecf6a` under
  `FIXED` — verify it before typing it:
  `node --input-type=module -e 'import {derive} from "./system/derive.mjs"; console.log(derive({brandColor:"#8ecf6a",density:"comfortable",rewardType:"self",frequency:"weekly"}).tokens["color-accent"])'`.
  If `derive.rules.mjs` ever changes, this literal goes stale — it is a pre-JS initial value only
  (the swatch lives inside `#asrc`, which is `hidden` until the render succeeds), so a stale value
  is invisible, but keep it honest.
- **GOTCHA**: `--motion-base` / `--motion-ease-spring` are contract tokens (#165). Confirm both
  resolve on approach (`grep -n "motion-ease-spring" system/tokens.contract.css`) before using them.
- **GOTCHA**: memory `vr-gate-captures-no-preference` — the gate captures under **no-preference**
  with `animations: 'disabled'`. A `transition` is fine (disabled animations settle to final), but
  a new *at-rest* pixel is not: the scrub row IS a new at-rest pixel and churns both approach
  baselines. Planned in Task 11.
- **VALIDATE**: `/approach` in Chrome DevTools → the swatch's computed `background` resolves;
  scrubbing shows a glide, not a snap. Then Firefox + Safari: the row is laid out identically and
  scrubbing still works (a dropped registration degrades to snap — acceptable, not a failure).
- **SATISFIES**: AC #1 (the "@property smooth feedback" clause of the ticket scope)

### Task 3 — UPDATE `agent-layer/gen-inspect-data.mjs` (ROLES) + regenerate

- **IMPLEMENT**: add one entry to `ROLES`, keyed `"decision-card-organism"` (the id is
  `system-graph.json`'s — verify with
  `node -e 'console.log(require("./system/system-graph.json").consumers.map(c=>c.id).filter(i=>i.includes("decision")))'`).
  Role line, in the voice of the existing six (describes what it IS, never asserts a measurement):
  > "One decision from a real project write-up: the call, and the reasoning under it. An accented
  > left edge and a surface that both come from the token contract, so the card reads native under
  > any brand pack."

  Place it after `cards:` to match reading order (emission order is `system-graph` order, not ROLES
  order — `gen-inspect-data.mjs:69`, so placement is cosmetic). Then
  `node agent-layer/gen-inspect-data.mjs`.
- **PATTERN**: `gen-inspect-data.mjs:26-57`.
- **GOTCHA**: a ROLES key naming no consumer **throws** (`gen-inspect-data.mjs:65-67`). Copy the id
  from the artifact, don't retype it. Honesty contract: the role line is the ONE hand-written field
  and it is copy, not a claim — do not put a number in it.
- **VALIDATE**: `node agent-layer/gen-inspect-data.mjs --check` → clean; the printed component count
  goes **15 → 16** (`withSpec` stays 9 — `decision-card-organism` has no `system/specs/` entry, so
  its bubble shows the fallback spec line `styled token-only in components.css · Decision card
  (organism)`, `inspect.mjs:123-125`. It consumes 12 contract tokens).
- **SATISFIES**: ticket scope (inspect mount) — no AC

### Task 4 — UPDATE `approach.html` (inspect mounts + toggle + script tag)

- **IMPLEMENT**:
  1. `data-inspect="page-hero"` on `<section class="page-hero">` (line 31).
  2. `data-inspect="buttons"` on the two hero CTAs (lines 46-47).
  3. `data-inspect="cards"` on the four `<article class="card">` (lines 62, 73, 85, 97).
  4. `data-inspect="decision-card-organism"` on the four `<div class="decision-card">`
     (lines 122, 129, 136, 145).
  5. The toggle, **immediately after `</div>` closing `#asrc`** (after line 167) and **outside** it,
     so it stays visible if the exhibit's fetch fails:
     ```html
     <p class="inspect-toggle-row"><button type="button" class="btn btn-secondary inspect-toggle" data-inspect-toggle aria-pressed="false">Inspect this surface</button></p>
     ```
  6. `<script type="module" src="/system/inspect.mjs"></script>` immediately after the `dock.mjs`
     tag (line 222), matching `index.html:415` / `build.html:1010`. `palette.mjs` stays last.
- **PATTERN**: `index.html:53, 67-68, 111, 131, 415`; `build.html:660, 767, 953, 1010`.
- **GOTCHA — static markup only.** `inspect.mjs` collects triggers once per activation
  (`inspect.mjs:193`) and `palette.mjs` memoizes its command list at build time, gated on
  `document.querySelector("[data-inspect]")` (`palette.mjs:120`; memory
  `palette-memoizes-needs-static-tags`). Every mount above is in the static HTML, so both see them.
  **Do NOT** put `data-inspect` on anything `derive-probe.mjs` or `annotated-source.mjs` renders —
  those land inside the page's async `.then()`, after both have already looked.
- **GOTCHA**: `drift-check` gate 2f resolves every `data-inspect` id in tracked HTML against
  `inspect-data.json` — Task 3 MUST land first or this task fails CI.
- **GOTCHA**: `.inspect-toggle-row` and `.inspect-toggle` already exist (`components.css:2510-2511`).
  No new CSS. The toggle is visible at rest → approach baselines churn (planned, Task 11).
- **VALIDATE**: `node tooling/drift-check.mjs` (gate 2f passes). Then `npx serve .` → `/approach` →
  press the toggle → hover the hero, a CTA, a method card, a decision card: four distinct bubbles
  with real resolved token values. Press `Esc` → dismisses. Switch pack in the dock → reopen a
  bubble → the values are the new pack's. Press ⌘K → "Turn inspect mode on/off" is in the list.
  Reload with inspect persisted on → still wired.
- **SATISFIES**: ticket scope (inspect mount) — no AC

### Task 5 — UPDATE `system/glossary.mjs` (extend `TERMS`)

- **IMPLEMENT**: add the keys the Task 6/7 rewrites will mark. Candidate set — **add only the ones
  the final copy actually marks**, since an unused key is free but a marked-but-missing key throws:
  - `"design-token"` — "A named colour, size or timing value that a component asks for by name.
    Change the value in one place and every component that asks for it follows."
  - `"derivation"` — "Working out a whole design system from a few answers — a brand colour, how
    dense the layout should be — by running committed rules, not by hand-picking each value."
  - `"contrast-ratio"` — "How far apart two colours are in brightness, as a number. WCAG's AA level
    asks for at least 4.5:1 for normal text, so it stays readable."
  - `"oklch"` — "A way of writing a colour as three numbers a human can reason about: how light it
    is, how colourful, and which hue. Nudging one leaves the other two alone."
  Keep each to the existing register — author's voice, one or two sentences, no pedagogy framing.
- **PATTERN**: `glossary.mjs:35-50`.
- **GOTCHA**: an unknown `data-term` throws at `initGlossary` (`glossary.mjs:56-57`), which aborts
  approach's whole inline module — `#asrc` never gets `data-asrc="ready"` and the VR gate hangs then
  fails. **Add the key here BEFORE the markup in Task 6.** Unused keys cost nothing
  (`glossary.mjs:33-34`), so over-adding is safe and under-adding is not.
- **VALIDATE**: `/approach` → hover each new `<dfn class="term">` → its bubble opens with the new
  text; `Esc` dismisses; no console error.
- **SATISFIES**: AC #2 (glossary coverage clause of the ticket scope)

### Task 6 — UPDATE `approach.html` (dual-register copy cut)

- **IMPLEMENT**: rewrite **only** the sites that open with an unexplained specialist term. Audit
  result (verify it yourself before rewriting — the page may have moved):
  - **`#case` "The one rule"** (lines 130-134): opens *"Components may only reference semantic
    tokens, never raw values."* → open with the plain rule (nothing on the page is allowed to name a
    colour directly; it asks for a role and the loaded pack answers), keep **semantic tokens** named
    in the next clause with its existing `<dfn>`.
  - **`#case` "Build"** (lines 137-143): opens with three specialist terms in one sentence
    (*"a token contract with neutral fallbacks, a swappable brand pack, and components that read only
    tokens"*). → open with what the three files DO in plain words, then name all three terms in the
    second sentence, `<dfn>`s intact.
  - **`#method` "Ship it as a system"** (lines 101-105): *"components that read shared design tokens"*
    is the card's operative phrase and is unglossed. → gloss plainly, mark **design tokens** with
    `data-term="design-token"`.
  - **The probe's fixed-answers line** (`derive-probe.mjs:55`): *"other intake answers held fixed"* —
    "intake answers" is unexplained. → plain ("the other three answers this rule normally gets are
    held still, so the colour is the only thing changing").
  - **Already plain — verify, don't churn:** the hero sub (defines "design engineer" in its own
    second sentence), `#method`'s lead, `#case`'s lead, "Problem & budget", "Outcome", `#sources`.
  Then run `/no-ai-slop` and `/humanizer` over **every rewritten line** (AC #2's scope names both).
- **PATTERN**: `.claude/plans/home-uplift-169.md:371-393` — the identical operation on home, with its
  flagged-target list. Same method: rewrite the first layer, keep the precise term immediately
  alongside, push depth into the existing structure. Never delete a term.
- **GOTCHA**: do NOT rename or remove any `id`, `class` or `data-*` a module or the VR spec
  references: `#asrc`, `#asrc-probe`, `#loc-proof`, `#param-proof`, `#method`, `#case`, `#sources`,
  every `data-term`, every `data-snippet`, every `data-inspect` added in Task 4.
- **GOTCHA**: copy changes churn both approach baselines — planned (Task 11).
- **VALIDATE**: read each section's first two sentences aloud — no unexplained specialist term opens
  any section. `/no-ai-slop` and `/humanizer` both report clean on the rewritten lines.
  `node tooling/drift-check.mjs` still green (no generated file touched by this task).
- **SATISFIES**: AC #2

### Task 7 — UPDATE `agent-layer/annotated-source.spec.json` prose + regenerate

- **IMPLEMENT**: cut the `derive-accent-contrast` snippet's `prose[0]` lead. It currently opens
  *"When the factory derives a design system from a brand colour, this is the rule that negotiates
  the accent…"* — four specialist moves before any plain meaning. Open with what the rule does in
  one plain sentence, then keep "negotiates the accent", "WCAG AA (4.5:1)" and "derived card
  surface" in the sentence after. Check `btn-primary-tokens`'s `prose[0]` the same way — it opens
  *"This is the entire colour styling of the site's primary button: three semantic tokens"*, which
  is borderline (the plain claim leads, the term trails) — **verify, likely leave**. Then
  `node agent-layer/gen-annotated-source.mjs`.
- **PATTERN**: the existing prose arrays' voice; `.claude/plans/annotated-source-glossary.md`.
- **GOTCHA**: only `prose`/`title` are hand-authored. `file`/`anchorStart`/`anchorEnd` select the
  **real extracted code** — touching them changes what the page quotes and breaks the "code shown =
  code run" property (per-ticket context, hard). Leave them alone.
- **GOTCHA**: `system/annotated-source.json` is GENERATED and drift-checked. Regenerate; never
  hand-edit.
- **VALIDATE**: `node agent-layer/gen-annotated-source.mjs --check` → clean;
  `/approach` renders the new prose; `node tooling/drift-check.mjs` green.
- **SATISFIES**: AC #2

### Task 8 — UPDATE `system/param-manifest.json` (three entries)

- **IMPLEMENT**: three `/approach` entries beside the existing one (line 33), shape matched exactly:
  ```json
  { "page": "/approach", "selector": ".asrc-probe [data-scrub=\"probe-hue\"]", "label": "derive probe: brand hue (drag/arrow)" },
  { "page": "/approach", "selector": ".asrc-probe [data-scrub=\"probe-lightness\"]", "label": "derive probe: brand lightness (drag/arrow)" },
  { "page": "/approach", "selector": "[data-inspect-toggle]", "label": "inspect-mode toggle", "note": "added by #174" }
  ```
- **PATTERN**: `param-manifest.json:27-30` (home's three scrub handles + its inspect toggle) — same
  labels, same `note` convention.
- **GOTCHA**: the selectors must match what Task 1 and Task 4 actually render. `probe-hue` /
  `probe-lightness` are deliberately distinct from home's `hue`, so `.stage-scrub [data-scrub="hue"]`
  and `.asrc-probe [data-scrub="probe-hue"]` can never collide.
- **GOTCHA**: the counting rules (`$description`) exclude glossary hover bubbles as passive reading
  aids — the new `<dfn>` marks from Task 6 are **not** controls and must NOT be added.
- **VALIDATE**: selectors resolve on the live page —
  `document.querySelectorAll('.asrc-probe [data-scrub="probe-hue"]').length === 1` in the console for
  each of the three.
- **SATISFIES**: AC #3, CLAUDE.md manifest convention

### Task 9 — REGENERATE every artifact, in order

- **IMPLEMENT**, in exactly this order:
  ```bash
  # EXPLICIT PATHS ONLY — this worktree is shared with #173's session (Task 0 gotcha).
  # `git add system/` would stage whatever that ticket has left dirty in the four files
  # both tickets touch (NOTES §"Collision with #173").
  git add approach.html \
          system/derive-probe.mjs system/scrub.mjs system/glossary.mjs \
          system/portfolio.css system/param-manifest.json \
          agent-layer/gen-inspect-data.mjs agent-layer/annotated-source.spec.json
  node agent-layer/gen-param-count.mjs
  node agent-layer/gen-loc-summary.mjs                  # reads TRACKED content — hence the add above
  node agent-layer/gen-inspect-data.mjs                 # no-op if Task 3 already ran; harmless
  node agent-layer/gen-annotated-source.mjs             # no-op if Task 7 already ran; harmless
  node tooling/drift-check.mjs
  node tooling/token-lint.mjs
  ```
  Then stage the four regenerated artifacts by name:
  `git add system/param-count.json system/loc-summary.json system/inspect-data.json system/annotated-source.json`
  Expect: `/approach` controls 1 → 4, `total` 75 → 78. `loc-summary` runtime group lines shift
  (derive-probe grows, portfolio.css grows); **files stays 61** — this ticket adds no new source file.
- **PATTERN**: `.claude/plans/home-uplift-169.md:395-410`.
- **GOTCHA**: memory `loc-summary-counts-tracked-only` — `gen-loc-summary` reads `git ls-files`
  content, so running `--check` **before** staging is a false "no drift". Stage first. This applies
  to edits, not just new files.
- **GOTCHA**: memory `drift-check-mid-merge-false-positive` — if you merged `main` mid-ticket,
  complete the merge before running drift-check, and resolve any generated-file conflict **by
  regeneration, never by hand-editing**.
- **GOTCHA**: `approach.html` renders BOTH the param total and the loc runtime group → both numbers
  moving means the approach baselines churn twice over (memory `loc-summary-baseline-cascade`).
  Planned in Task 11.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check && node agent-layer/gen-loc-summary.mjs --check && node agent-layer/gen-inspect-data.mjs --check && node agent-layer/gen-annotated-source.mjs --check && node tooling/drift-check.mjs` — all clean.
- **SATISFIES**: AC #3

### Task 10 — PROVE the manifest → page flow-through (AC #3's second clause)

- **IMPLEMENT**: this is a **test**, not a regen. On the running page:
  1. Load `/approach`, scroll to `#param-proof`, note the rendered total (expect **78**).
  2. Add one throwaway manifest entry (e.g.
     `{ "page": "/approach", "selector": "#flow-through-probe", "label": "TEMPORARY" }`),
     run `node agent-layer/gen-param-count.mjs`, hard-reload the page.
  3. The rendered number must read **79**. If it does not, the page is reading a stale artifact —
     stop and diagnose before proceeding.
  4. **Revert** the throwaway entry, regenerate, confirm the page reads 78 again and
     `git status` shows `param-count.json` back to its Task-9 state.
- **GOTCHA**: memory `vr-tolerance-hides-text-changes` — a green VR run does NOT prove the digits
  landed. This manual step is the only proof of AC #3's second clause. Do not skip it and do not
  substitute a `--check` run for it.
- **GOTCHA**: the throwaway selector need not exist on the page — **verified**:
  `gen-param-count.mjs:32-40` validates only that `page`/`selector`/`label` are present and that no
  `page + selector` pair repeats. It never opens the HTML. So an invented selector is safe here; a
  *duplicate* of an existing `/approach` selector would throw.
- **GOTCHA**: `countUpOnVisible` animates the number into view (`approach.html:266`) — read the
  **settled** value, after the count-up finishes.
- **VALIDATE**: the four steps above, observed in a browser. Record the observed numbers in the
  implementation report.
- **SATISFIES**: AC #3

### Task 11 — UPDATE VR baselines (`approach-neutral.png`, `approach-saulera.png`)

- **IMPLEMENT**:
  1. Commit everything first — the gate screenshots the **working tree** (memory
     `vr-gate-reads-working-tree`), and the run must happen from a **clean detached worktree under
     `/Users`**, never `/private/tmp` (Docker file sharing).
  2. **`rm` both approach PNGs before updating.** The param total moves 75 → 78 — a digit-only change
     is below pixelmatch's per-pixel threshold and `update:docker` will silently skip it (memory
     `vr-update-skips-subperceptual`).
  3. **Two-stage `@property` proof** (lifted from `home-uplift-169.md:419-424`).
     **The split matters — get it exactly right or the proof measures the wrong thing.**
     - **Stage one holds everything that PAINTS**: the scrub row markup and CSS, the swatch's
       `background: var(--asrc-probe-accent)`, and `derive-probe.mjs`'s
       `swatch.style.setProperty("--asrc-probe-accent", accent)`. An *unregistered* custom property
       still resolves as a value — only interpolation needs the registration — so the swatch paints
       correctly at stage one and the baseline is a true at-rest capture.
     - **Stage two holds only the two render-invisible lines**: the `@property` declaration and the
       `prefers-reduced-motion: no-preference` transition block.

     Run `update:docker` at stage one → confirm exactly the two deleted PNGs regenerate and nothing
     else churns → commit stage two → re-run `npx playwright test` (**not** update) against the
     fresh baselines → a green run is the machine proof the registration is render-invisible across
     all 20 shots.
     **Pre-authorized fallback, no re-plan needed:** if stage two fails, drop those two lines. The
     scrub degrades to snap-instead-of-glide; Task 1's behaviour, AC #1, and everything else stand.
  4. `cd tooling/visual-regression && npm run update:docker`.
- **GOTCHA**: memory `local-agent-visual-gate-notes` — baselines are Linux; a local macOS run failing
  16 shots is platform, not regression. A fresh worktree needs `npm ci` in
  `tooling/visual-regression`.
- **GOTCHA**: memory `vr-gate-approach-countup-flake` — approach's "two consecutive stable
  screenshots" failure is the live `countUp` rAF racing `retries: 0`, not a regression (it fails a
  *different* pack each run). AC #4 names this explicitly: check `gh pr checks` and re-run.
- **GOTCHA**: the scrub row, the toggle button and the copy changes are all at-rest pixels — churn is
  expected. `index` baselines must **not** churn (this ticket touches no home at-rest pixel); if they
  do, something unintended landed — investigate before accepting.
- **VALIDATE**: `npx playwright test` green in the same Docker image against the new baselines;
  `git status` shows **exactly two** PNGs changed. **Eyeball both new PNGs** against these expected
  at-rest values — a green run alone is not proof:
  | element | expected at rest | why |
  |---|---|---|
  | Hue handle | **136°** | `clamp` quantizes to `step: 2` — `Math.round(135.4/2)*2` |
  | Lightness handle | **79%** | `hexToOklch("#8ecf6a").l` = 0.7879 → `Math.round` → 79, `step: 1` |
  | Swatch | `#417e0f` | the measured at-rest derived accent (Task 2) |
  | `#param-proof` | **78** | 75 + 3 new `/approach` entries |
  | Inspect toggle | present, `aria-pressed="false"` | below `#asrc` |

  All four values are deterministic — a mismatch is a real defect, never a flake.
- **SATISFIES**: AC #4

### Task 12 — Cross-engine functional check

- **IMPLEMENT**: drive `/approach` in chromium, firefox and webkit (Playwright resolved out of
  `tooling/visual-regression/node_modules`, never a repo dep — CLAUDE.md). Per engine: drag both
  handles and assert the ratio line changes; arrow-key each handle; toggle inspect and open one
  bubble; toggle `prefers-reduced-motion: reduce` and confirm the scrub still works (values snap).
- **PATTERN**: memory `cross-engine-motion-verify` — v3 motion tickets get real
  Chromium+Firefox+WebKit checks locally; this closes the MUST the Chromium-only VR gate misses.
  Memory `vr-gate-single-engine-blindspot` — the gate's bundled Chromium missed a real Safari/Chrome
  grid blowout; eyeball the new row's layout in a real browser at a narrow width too.
- **GOTCHA**: `python3 -m http.server` serves `.mjs` as `text/javascript` — fine for module loading
  (memory). Firefox ≤146 has no anchor positioning: the inspect bubble takes its fallback branch
  (`data-inspect-pos="fallback"`) — confirm it is legible, per the architecture doc's §Risks.
- **VALIDATE**: all three engines pass the four checks. Record engine + version in the report.
- **SATISFIES**: AC #1 (cross-engine), epic non-goal "no Chrome-only load-bearing behaviour"

### Task 13 — Commit, PR, artifacts

- **IMPLEMENT**: one atomic commit per phase (CLAUDE.md), messages naming what + the doc reference
  and `(#174)`. Then open the PR with **`Closes #174` in the BODY** — a title mentioning `(#174)`
  closes nothing (memory `prs-dont-auto-close-tickets`; #78 cost a planning pass). Commit this plan,
  the implementation report and the review into the same PR
  (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).
- **GOTCHA**: memory `owner-merges-fast-verify-landed` — a merge can race a review-fix push; check
  `gh pr view --json commits` before building on "merged".
- **VALIDATE**: `gh pr view --json body --jq .body | grep -c "Closes #174"` → 1. `gh pr checks` green
  (`verify` + `visual`).
- **SATISFIES**: repo Git convention

---

## TESTING STRATEGY

**No suite exists** (CLAUDE.md: "no suite, no linter, no type-check — don't hunt for or invent one").
"Done" = run the surface you touched, plus the repo's generators and gates. There is no coverage
target and none should be invented for this ticket.

### Gates (these mirror CI `verify`)

- `node tooling/drift-check.mjs` — syntax · token-css · annotated-source · loc-summary · param-count ·
  system-graph · inspect-data · **inspect-mounts** · handoff · scenarios · traces
- `node tooling/token-lint.mjs` — no literal in `components.css`
- `node tooling/build-checks.mjs` — untouched by this ticket, but must stay green
- `npx playwright test` (in `tooling/visual-regression`, Docker) — the pixel gate

### Manual surface runs (the repo's actual test layer)

- `/approach` under **neutral** and **saulera** packs: probe scrubs, inspect opens, glossary opens.
- `/approach` with a **derived pack** worn (set a brand on `/`, tick "wear it", then navigate): the
  inspect bubble reports the derived pack's resolved values, not the neutral ones.
- `/` unchanged — the home scrub row still works (this ticket imports its primitive; a regression
  there would mean `scrub.mjs` was edited when it shouldn't have been).

### Edge cases that must be exercised

1. **Achromatic collapse** — scrub lightness to its 95% bound, then scrub hue. The hue handle must
   still move the colour (this is what the 20–95 bounds and the `|| DEFAULT_HUE` guard buy).
2. **Picker ↔ handle disagreement — both directions, and check the DISPLAY, not just the behaviour.**
   (a) Scrub hue → open the OS colour picker: it shows the scrubbed colour. (b) Pick a distinctly
   different colour (e.g. red) in the picker → **without touching either handle**, read their
   numbers: they must already show the new brand's hue and lightness. This is the direction
   `onInput`'s `reflect()` calls exist for (Task 1 step 4) and the one that silently regresses if
   they are dropped. (c) Then drag a handle — it must continue from the picked colour, not the
   pre-picker one.
3. **Keyboard-only** — Tab to each handle, arrows/Home/End step it, `aria-valuenow` and
   `aria-valuetext` update, focus ring visible.
4. **Reduced motion** — `prefers-reduced-motion: reduce`: no glide, values snap, everything still
   works.
5. **Rapid drag** — `makeScrubbable` rAF-throttles pointermove (`scrub.mjs:65`); a fast drag must not
   drop the final value or leave the strip mid-update.
6. **Inspect + pack switch** — open a bubble, switch pack in the dock, reopen: new resolved values.
7. **Esc while a bubble is open** — dismisses without moving focus; the toggle stays on (WCAG 1.4.13).
8. **Fetch failure** — throttle to Offline and reload: `#asrc` stays hidden, the page still renders,
   the inspect toggle still works (it is outside `#asrc` — Task 4 step 5).
9. **Unknown glossary term** — the failure mode Task 5's gotcha describes; confirm the page still
   reaches `data-asrc="ready"` after the rewrite.

---

## VALIDATION COMMANDS

Execute every command. Zero errors expected.

### Level 1: Syntax & artifacts

```bash
node tooling/drift-check.mjs
node tooling/token-lint.mjs
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-inspect-data.mjs --check
node agent-layer/gen-annotated-source.mjs --check
```

### Level 2: Module health (there is no unit-test layer — this is the equivalent)

```bash
node -e 'import("./system/derive-probe.mjs").then(()=>console.log("derive-probe import ✓"))'
node -e 'import("./system/scrub.mjs").then(()=>console.log("scrub import ✓"))'
node -e 'import("./system/glossary.mjs").then(()=>console.log("glossary import ✓"))'
node tooling/build-checks.mjs
```

### Level 3: The pixel gate

```bash
cd tooling/visual-regression && npm ci && npm run update:docker   # from a CLEAN detached worktree under /Users
cd tooling/visual-regression && npx playwright test               # green against the new baselines
```

### Level 4: Manual validation

```bash
npx serve .            # then http://localhost:3000/approach.html
```

- Drag **Hue** — hex, swatch, ratio and notes all change per drag; picker tracks it.
- Drag **Lightness** from 20 → 95 — the engine's clamp `[0.35, 0.60]` visibly fights back; the notes
  list changes (measured: 1 note at L=50, 3 at L=80/95).
- Toggle inspect → hover hero / CTA / method card / decision card → four distinct bubbles.
- ⌘K → "Turn inspect mode on" present.
- Hover each new `<dfn class="term">` → its definition.
- Read every section's first two sentences aloud → no unexplained specialist term opens any of them.
- `#param-proof` reads **78**; run Task 10's mutate-and-revert to prove the flow-through.

### Level 5: Cross-engine

```bash
# Playwright resolved out of tooling/visual-regression/node_modules — NEVER add a repo dep.
# Drive /approach in chromium + firefox + webkit per Task 12.
```

---

## ACCEPTANCE CRITERIA

Verbatim from the ticket, plus the repo-standard gates.

- [ ] **AC #1** — Scrubbing the probe's values live-recomputes accent + contrast pair via the real
      `derive()` — **no precomputed table**. (Proof: `derive-probe.mjs` calls `derive()` inside
      `run()` on every change; there is no lookup structure anywhere in the diff.)
- [ ] **AC #2** — Copy: no approach section opens with an unexplained specialist term.
      `/no-ai-slop` + `/humanizer` run over every rewritten line before commit. Glossary coverage
      extended to the terms that survive in the first layer.
- [ ] **AC #3** — The param count renders from the generated file, **and a manifest change flows
      through to the page** (Task 10's mutate → regen → observe → revert, recorded in the report).
- [ ] **AC #4** — Approach baselines ×2 regenerated in this PR; VR green. A "two consecutive stable
      screenshots" retry failure is the known `countUp` rAF flake — check `gh pr checks`.
- [ ] Inspect mounts on `/approach`; `drift-check` gate 2f green; ⌘K offers the inspect command.
- [ ] Both new controls in `param-manifest.json`; every generated artifact regenerated; full
      `drift-check` green.
- [ ] Cross-engine functional pass (chromium + firefox + webkit), including reduced motion.
- [ ] No regression on `/` (home's scrub row unchanged) or on any other baseline.
- [ ] Honesty contract intact: real `derive()`, notes verbatim, no hand-written number anywhere.
- [ ] `Closes #174` in the PR **body**; plan + report + review committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All 13 tasks completed in order
- [ ] Each task's `VALIDATE` run immediately, not batched to the end
- [ ] All Level 1–5 validation commands executed
- [ ] Every edge case in TESTING STRATEGY exercised
- [ ] Manual `/approach` pass under both packs **and** under a worn derived pack
- [ ] VR: exactly two PNGs changed, both eyeballed
- [ ] Copy skills (`/no-ai-slop`, `/humanizer`) run **before** commit, not after
- [ ] Implementation report written to `.claude/reports/`
- [ ] PR body carries `Closes #174`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes (each verified against the code, not guessed):**

1. **"Inspect mount over approach's annotated-source + probe surfaces" means the components in that
   band, not the surfaces themselves.** `.asrc-block` and `.asrc-probe` are `portfolio.css` page
   surfaces with no `system-graph` consumer; `gen-inspect-data.mjs:65-67` can only emit consumer
   ids. Both routes to literal compliance are out of discipline (see Out of Scope). Resolution:
   mount `page-hero` / `buttons` / `cards` / `decision-card-organism`, the last of which is the four
   cards immediately above the exhibit. **No AC depends on this**, so it is stated rather than
   blocking. If the owner wants the exhibit surfaces themselves inspectable, that is a separate
   ticket against `gen-system-graph.mjs`'s scope.
2. **AC #3's first clause already shipped in #167** (`approach.html:257-265`). This ticket's work on
   it is the new manifest entries, the regen, and Task 10's flow-through proof. Scope reduction
   stated here rather than silently absorbed.
3. **Lightness is bounded 20–95, not 0–100.** Measured: below ~20 and above ~95 the sRGB round-trip
   collapses chroma and the hue handle destabilises. The bounds still straddle the engine's
   `[0.35, 0.60]` clamp in both directions, which is what the exhibit is for. `aria-valuemin/max`
   report the real bounds, so this is honest, not hidden.
4. **`derive-probe.mjs` imports `scrub.mjs` directly** rather than the primitive being extracted.
   `scrub.mjs`'s shipped header (line 8-9) records this as the intended seam, and all three
   self-init guards on the import path are verified inert on `/approach`. See NOTES for the cost.
5. **The handle reuses `.stage-scrub-handle`.** Same recipe, no duplication, no rename. The class
   name reads "stage" on a page with no stage — accepted; a rename is offered in NOTES as a
   follow-up, not done here (it would be adjacent-code improvement).

**Nothing is blocking.** No question here would change the plan enough to justify stopping.

---

## NOTES (open canvas)

### Why no new module

Everything this ticket needs already ships. `makeScrubbable` is the primitive (#169), `derive()` is
the engine, `inspect.mjs` is the engine, `glossary.mjs` is the mechanism, `gen-param-count` is the
counter. The temptation is a `system/probe-scrub.mjs` to hold 30 lines of wiring — CLAUDE.md's
"no abstractions for single-use code" says no, and a new tracked file would push `loc-summary`'s
runtime **file count** 61 → 62, which is a claim on the page ("the design system this site ships is
61 files") churning for no reader benefit. The wiring lives in the file it wires.

### Why the probe's `@property` is safe (and the #169 warning is not being ignored)

`portfolio.css:1002-1004` says, in capitals, **NEVER register `color-*`**. That warning is about
**contract tokens**: `--color-accent` and friends receive values from packs, from derived packs, and
from `pack-import.mjs` passing an imported design's values through verbatim — formats a registered
`<color>` syntax could reject, silently reverting the token to its initial value and breaking the
re-skin.

`--asrc-probe-accent` is not a contract token. It is written from exactly one place —
`derive-probe.mjs`'s `run()`, with `result.tokens["color-accent"]`, which `derive()` always emits as
a 7-character hex (`oklch.mjs:25 rgbToHex`). No pack, no import and no visitor value can reach it.
The registration therefore cannot reject anything that was valid. Put that reasoning in the CSS
comment — a future reader will otherwise read it as the warning being violated.

### The import-graph cost, recorded

Importing `scrub.mjs` pulls `intake-beat.mjs` → `spine.mjs` → `factory-intake.mjs` → `morph.mjs`
onto `/approach`. Measured: **+1178 lines across 5 files** (3134 → 4312 total module lines), to reach
an 88-line function. All of it is inert (three guards, verified in Task 1's gotcha). The alternative
— splitting the home mount into its own file so `scrub.mjs` is a pure primitive — was considered and
rejected: it contradicts `scrub.mjs`'s own shipped header, adds a tracked file, an `index.html`
script-tag edit and a `loc-summary` cascade, and #177 budgets **INP**, not payload. Recorded here so
a future perf ticket can pick it up with the numbers already measured.

### Collision with #173 (Wave 3 — Factory), running in parallel

#173 touches three files this ticket also touches:

| File | #174 | #173 | Resolution |
|---|---|---|---|
| `system/param-manifest.json` | +3 `/approach` entries | +N `/factory` entries | Text merge; entries are independent lines |
| `system/param-count.json` | regenerated | regenerated | **Regenerate, never hand-edit** (memory `drift-check-mid-merge-false-positive`) |
| `system/loc-summary.json` | regenerated | regenerated | Same |
| `agent-layer/gen-inspect-data.mjs` ROLES | +`decision-card-organism` | +factory's consumers | Text merge; distinct keys |

**The consequence that bites:** `approach.html` renders the site-wide param **total**. #173 adding
`/factory` controls moves that total. So **whichever ticket lands second must regenerate the two
approach baselines even though it did not touch the page.** If #173 merges first, merge `main` into
this branch, regenerate, and re-run the gate before requesting review (memory
`review-validated-premerge-tree`: check `mergeStateStatus` *before* triaging review findings).

### The exhibit, sharpened — why lightness is the better of the two handles

Measured sweep with the fixed answers (`density: comfortable`, `reward: self`, `frequency: weekly`):

| brand L | brand hex | negotiated accent | accent notes |
|---|---|---|---|
| 20% | `#091b00` | `#2d4122` | 2 |
| 50% | `#397400` | `#397400` | 1 (no adjustment) |
| 80% | `#92d36e` | `#417e10` | 3 |
| 95% | `#d0ffb8` | `#507938` | 3 |

At 50% the brand passes straight through — the strip says "no adjustment needed". Drag up and the
clamp plus the darkening loop kick in and the notes list grows. That transition, crossed live under
the reader's cursor, is the single most persuasive thing on the page, and it is currently only
reachable by luck with the colour picker. Consider having the caption say plainly that around the
middle the engine leaves the colour alone — but only if `/no-ai-slop` keeps it short.

### Sequencing risk

Task 3 (ROLES + regen) **must** precede Task 4 (the `data-inspect` markup) or `drift-check` gate 2f
fails. Task 5 (glossary keys) **must** precede Task 6 (the `<dfn>` markup) or the page module throws
and the VR gate hangs. Both are ordering-only; neither is hard to recover from, but both fail
confusingly (a hung gate reads like a flake).

### Rejected alternatives

- **A slider element instead of scrub handles.** `<input type="range">` would be less code, but the
  epic's whole thesis is direct manipulation of *numerals*, the primitive already exists, and two
  surfaces sharing one keyboard model is worth more than 20 saved lines.
- **A chroma handle.** `toGamut` already owns chroma; a handle would fight it near the ends and read
  as broken. Out of scope.
- **Renaming `.stage-scrub-handle` → `.scrub-handle`.** Correct naming, zero visual change, no
  manifest impact (home's manifest selector uses `.stage-scrub [data-scrub="hue"]`, not the handle
  class) — but it is adjacent-code improvement on a ticket that doesn't need it. Offered as a
  follow-up.

### Confidence

**9.5/10** for one-pass success. The primitive, the engine, the inspect engine and the generators all
ship and are all exercised by a sibling ticket that landed the same shape three tickets ago. The two
residual risks are both pre-authorized: the `@property` registration failing the pixel gate (drop it,
scrub degrades to snap) and the `countUp` VR flake (re-run). The one judgement call — the inspect
surface set — is stated as an assumption with no AC riding on it.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Leave empty at creation. -->
