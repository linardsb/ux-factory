# Feature: Wave 4 — Protos: action-bus state toggles + resizable device frame (#176)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

The two data-connected prototype pages are the site's most "product-like" surfaces and, since
#175, they wear the site's pack skin and carry the inspect layer. They are still, however, almost
entirely view-only: Fieldwork's whole reader-operable surface is one inspect toggle, and Verdant's
phone is a fixed 392 px box. This ticket makes both pages *manipulable*:

1. **Fieldwork — bus state toggles.** Each of the two designated agentic slots gets a visible
   control row that commands the composed components' state (`tone`) live. Every command travels
   the existing `system/action-bus.mjs` contract as an `agent.*` action, and a new **consumer**
   applies it — the contract file itself is not touched. This finally exercises the documented but
   entirely unused `agent.*` half of the bus (today every emit in the repo is `ui.intent`), which
   is what makes "click, keyboard and agent are interchangeable modalities" a demonstrated claim
   rather than a header comment.
2. **Verdant — resizable device frame.** The phone bezel becomes a draggable, keyboard-operable
   frame between clamped widths, and the screen's contents reflow through container queries — the
   components were always token-only and width-agnostic; nothing about them changes.

## User Story

As a hiring manager skimming the prototype pages,
I want to grab the phone frame and drag it, and to flip a composed component's state from a visible
control,
So that within seconds I can see the prototype respond to me — and see that the same action a
button sends is the action an agent sends.

## Problem Statement

Epic #164's measured problem: ~20 live-manipulable controls site-wide, clustered on two pages, and
the proto pages are among the most view-only. Worse for this specific ticket, the site's central
agentic claim — "one bidirectional action contract; adding a modality is a new `source`, not a new
bus" — is documented in `system/action-bus.mjs`'s header and **nowhere demonstrated**: no code in
the repo emits or consumes an `agent.*` action, and no surface shows the same command arriving from
two different sources. A reader has to take the contract on trust.

## Solution Statement

Two hand-written canon modules beside `system/site.js`, each mounted from its page's body-end
module script (the `#175` top-window-only idiom):

- `system/bus-toggles.mjs` — mounts a control row per filled agentic slot on Fieldwork. Controls
  **emit** `{ type: "agent.set-tone", source, target: { component, id }, params: { tone } }`; a
  `bus.on("agent.set-tone", …)` **consumer** mutates a deep-cloned working copy of that slot's
  composition and re-renders it through the existing `renderComposition` (so validation-before-DOM
  still holds). `action-bus.mjs` is not edited — the new code is purely a consumer, which is
  exactly what the epic architecture's "extend the contract's consumers, never fork it" asks for.
- `system/device-frame.mjs` — mounts a `role="separator"` drag handle beside Verdant's phone; the
  handle writes a clamped `--frame-w` custom property. **The at-rest width stays pure CSS** (no JS
  runs until the reader drags or keys), so the frame's rest geometry cannot race a mount.

The reflow rules are `@container` queries in **`system/proto.css`**, keyed to a
`container-type: inline-size` on `.proto-frame-phone .proto-screen`. `system/components.css` is
**not touched** — see NOTES for why that choice materially shrinks the blast radius.

A committed cross-engine driver `tooling/proto-journey.mjs` (the `build-journey.mjs` /
`vt-verify.mjs` precedent) proves AC #1's parity and AC #2's clamping in Chromium + Firefox +
WebKit, so AC #4 is repeatable evidence rather than a screenshot in a PR body.

## Out of Scope / Non-Goals

- **No bus toggles on Verdant.** Verdant's phone screen is built with `innerHTML` from fixtures,
  not through `agentic-renderer.mjs`; bus-driven state toggles there would mean rewriting the whole
  screen through the renderer. The ticket names "Fieldwork's agentic slots" as the natural host and
  gives Verdant the device frame. That split is the decision, not an omission.
- **No resizable frame on Fieldwork.** `.proto-frame-board` is already `width: 100%` and
  `overflow-x: auto`; the reader resizes it by resizing the window.
- **No `view-transition-name`, and no `morph()` on any new path.** The ticket asks for spring
  easing, not morphs. Naming an element for a view transition pulls in the whole
  `tooling/vt-stack-audit.mjs` hazard class (a named element becomes a stacking context AND a
  containing block — the #171 breadboard regression), and `vt-verify`'s "boot opens ZERO
  transitions" property is what the pixel gate's at-rest capture depends on. Deliberately excluded.
- **No `@starting-style` entrance on the re-rendered tiles.** The slot fill also renders at load,
  and an entrance on a load-time render is the `entrance-anim-continuous-rebuild` trap. Spring
  easing goes on the toggle's own pressed-state feedback, which only ever runs on interaction.
- **No new analytics synthetic path.** The epic budgets 2–4 for the whole epic (palette, inspect);
  #176 is not one of them.
- **No `data-inspect` on the composed slot tiles.** #175 deliberately instrumented the board chrome
  and not the slot fills; leave that call alone.
- **No new vocabulary components, no new specs, no changes to `agentic-renderer.mjs` or
  `agentic-study.mjs`.** The toggles reuse the renderer as-is.
- **No persistence of the frame width.** A restored width would be a JS-set at-rest geometry, which
  is exactly what AC #2 forbids. The frame resets to its CSS default on every load.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium-High (three new files, two page edits, a VR spec edit, and a
six-baseline regeneration whose extent has to be measured, not assumed)
**Primary Systems Affected**: `proto/verdant.html`, `proto/fieldwork.html`, `system/proto.css`,
`system/param-manifest.json` (+ its generated count), `tooling/visual-regression/visual.spec.mjs`,
VR baselines
**Dependencies**: none new. Playwright is resolved out of `tooling/visual-regression/node_modules`
for the driver, exactly as `build-journey.mjs` does — never a repo dependency.

## Related Work

**Implements**: [#176](https://github.com/linardsb/ux-factory/issues/176)   ·
**Epic**: [#164](https://github.com/linardsb/ux-factory/issues/164) —
`docs/epics/prototyping-feel-uplift.prd.md` + `docs/epics/prototyping-feel-uplift.architecture.md`

**Back-references**:

- `.claude/plans/protos-pack-skin-inspect-175.md` — Why: the direct dependency. It put pack-boot,
  the dock and the inspect layer on both proto pages, established the **top-window-only** body-end
  mount idiom this ticket copies verbatim, and explicitly deferred "action-bus state toggles +
  resizable device frame" to here (its Out of Scope, line 42).
- `.claude/plans/spring-motion-foundation-165.md` — Why: the `--motion-ease-*` tokens this ticket's
  toggle feedback uses (`--motion-ease-bounce` = "things you touch, never entrances").
- `.claude/plans/build-vt-morphs-171.md` + `.claude/plans/view-transitions-sitewide-172.md` —
  Why: read for the *stacking-context* lesson (`container-type` shares the hazard mechanism), and
  for `tooling/vt-verify.mjs` as the precedent for committing an operator-run driver.
- `.claude/plans/build-links-in-and-gates.md` (#138) — Why: `tooling/build-journey.mjs`'s structure,
  output grammar and Playwright resolution, which `tooling/proto-journey.mjs` mirrors.

**Forward-references**:

- `#177` (epic close) — will re-run the parameter count and the copy audit over what this adds.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING

- `system/action-bus.mjs` (whole file, 83 lines) — Why: **the contract, and it must not be edited.**
  `TYPE_RE = /^(ui|agent)\.[a-z][a-z-]*$/` already admits `agent.set-tone`; `SOURCES` already admits
  `pointer|keyboard|agent|voice`. Lines 14–21 are the load-bearing paragraph: the namespace is the
  DIRECTION, `source` is the MODALITY, and the two are orthogonal.
- `proto/fieldwork.html` (lines 138–203) — Why: the exact mount point. `slot()` builds the labelled
  placeholder; `fillSlot()` fetches a committed proposal, renders it via `renderComposition(vocab,
  composition, bus)` into `.proto-slot-fill`, and swallows every failure so the region degrades to
  the labelled placeholder. Note lines 198–203: **one `bus` is created for both slots** — reuse it.
- `proto/verdant.html` (lines 45–60, 191–207) — Why: `.proto-stage-center > .proto-frame-phone >
  .proto-screen` is the structure the frame wraps; 191–207 is the top-window-only body-end mount
  idiom (`if (window.self === window.top)`), including the comment explaining *why* frame chrome is
  removed inside the work.html iframe embeds.
- `system/agentic-study.mjs` (lines 113–208) — Why: the closest sibling. `clone()` +
  `renderPreview()` + `setTone()` + `resetWorking()` is the exact working-copy → validate →
  re-render loop to mirror. **Differences to preserve deliberately**: the study rides `ui.intent`
  (the reader reporting an intent to an agent) and this ticket rides `agent.*` (a command arriving
  at the surface); the study offers remove/reorder/out-of-vocabulary-probe and this ticket does not.
- `system/agentic-renderer.mjs` (lines 205–212, 321–326) — Why: `busEmit()` at 205 carries the
  `source: e.detail === 0 ? "keyboard" : "pointer"` idiom to copy verbatim; 321 is `metric-tile`,
  whose only enum state prop is `tone` — the state these toggles flip.
- `system/proto.css` (lines 740–814) — Why: `.proto-stage-center`, `.proto-frame-phone`
  (`width: min(392px, 94vw)`), `.proto-frame-phone .proto-screen`, `.proto-slot`, `.proto-slot-fill`.
  Also **lines 149 and 672** — the two existing `@media (prefers-reduced-motion: reduce)` blocks;
  `portfolio.css`'s global kill-switch does not reach this sheet, so new motion carries its own.
- `system/components.css` (lines 1474–1526, 1697–1712, 1910–1934) — Why: read-only reference.
  `.ds-metric-tile` + its `.is-warn` / `.is-critical` states (what the toggles flip);
  `.vd-screen-header` is the **one** `position:` inside the phone subtree (`sticky`, inert here
  because `.vd-screen-body` is the scroller) — this is the check that clears `container-type` for
  the stacking-context hazard; `.vd-tile-pair` / `.vd-stack` are the container-query targets.
- `tooling/visual-regression/visual.spec.mjs` (lines 66–67, 91–107, 119–124, 131–173) — Why: the
  proto entries; `waitReady` at 104 is **outside** the `ia`/`else` branch so a proto page may use
  it; the `kind === 'proto'` pre-resize to 1280×1600; and the `if (p.waitVisible)`-gated re-measure
  loop, which the other pages must keep byte-identical.
- `tooling/build-journey.mjs` (lines 1–60, 130–170) — Why: the driver template — header voice,
  `createRequire` out of `tooling/visual-regression/`, engine loop, `t(...)` assertion grammar, and
  the `page.evaluate(() => import("/system/….mjs").then(m => m.someExport(…)))` **module-export
  seam** (no `window.__` globals) that the agent-source parity assertion needs.
- `system/param-manifest.json` (`$description`) — Why: the counting rules verbatim. "one entry =
  one distinct control per page — a radiogroup = 1, a per-item verb present on every board place
  = 1". Note its closing sentence still reads "proto/fieldwork's only control is its inspect
  toggle" — that sentence becomes false and must be updated in the same edit.
- `system/inspect.mjs` (lines 55–66) — Why: `refreshInspect()`'s contract, and the precedent for a
  module that self-initialises as a page script while staying Node-import safe.

### New Files to Create

- `system/bus-toggles.mjs` — Fieldwork's per-slot state-command row: emitters + the bus consumer
  that applies `agent.set-tone` to a working copy and re-renders through `renderComposition`.
- `system/device-frame.mjs` — Verdant's resizable device frame: pointer drag + arrow/Home/End
  keyboard resize, clamped, writing `--frame-w`.
- `tooling/proto-journey.mjs` — the committed cross-engine driver for both surfaces
  (chromium · firefox · webkit), operator-run like `build-journey.mjs` and `vt-verify.mjs`.

### Files to Update

- `proto/fieldwork.html` — mount the toggles inside `fillSlot`'s success path; set the VR readiness
  handle in a `finally` on the outer try.
- `proto/verdant.html` — wrap the phone in `.proto-device`; add the top-window-only mount.
- `system/proto.css` — device-frame layout + handle, toggle-row styles, the `@container` block, and
  a reduced-motion off-ramp for the new transitions.
- `system/param-manifest.json` — 4 new entries + the stale `$description` sentence.
- `system/param-count.json`, `system/loc-summary.json` — **regenerated, never hand-edited**.
- `tooling/visual-regression/visual.spec.mjs` — `waitReady` on **both** proto entries; no other
  `PAGES` entry touched.
- `tooling/visual-regression/baselines/…` — regenerated (see Task 12; the set is *measured*).
- `CLAUDE.md` — architecture-map entries for the two new `system/` modules and the new driver.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [MDN — CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
  - Specific section: "Using container size queries" + the note that `container-type: inline-size`
    applies `contain: layout style inline-size`.
  - Why: the containment implied by `container-type` is the hazard this plan clears in Task 4; it
    also means `.proto-screen`'s inline size must not depend on its contents (it doesn't — the
    parent sets it).
- [MDN — `container-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/container-type)
  - Specific section: the layout-containment consequences.
  - Why: a containment context is a stacking context and a containing block for abs/fixed
    descendants — the exact mechanism `tooling/vt-stack-audit.mjs` was written for.
- [MDN — `setPointerCapture`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
  - Why: a drag handle that loses the pointer outside its own box is the classic resize bug;
    capture + `pointercancel` is the fix. Pair with `touch-action: none` or the drag never starts
    on touch.
- [WAI-ARIA APG — Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
  - Specific section: keyboard interaction + `aria-valuenow`/`min`/`max` on `role="separator"`.
  - Why: this is the pattern the handle implements; AC #2's "keyboard operability" is judged
    against it.
- [MDN — `linear()` easing](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function#linear_easing_function)
  - Why: the repo's spring tokens are baked `linear()` literals; use the token, never a new curve.

### Patterns to Follow

**Module header (feature/entry-point files cite their governing doc)** — every new `system/*.mjs`
opens this way (`system/morph.mjs:1-3`, `system/inspect.mjs:1-5`):

```js
// system/device-frame.mjs — hand-written canon (this repo; not generated). The resizable device
// frame (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Device frame";
// ticket #176; .claude/plans/protos-bus-toggles-device-frame-176.md).
```

**Top-window-only mount (copy the shape, and the reasoning comment, from `proto/verdant.html:191`)**:

```html
<script type="module">
  if (window.self === window.top) import("/system/device-frame.mjs").then((m) => m.initDeviceFrame());
</script>
```

**DOM builder — `textContent`, never `innerHTML` from data** (`agentic-study.mjs:28-38`,
`inspect.mjs:44-54`). Both new modules build every node with this `el()` helper shape. Slot tile
labels come from committed agent output and are still treated as untrusted strings.

**Bus emit + source derivation (`agentic-renderer.mjs:205-212`)** — reuse verbatim:

```js
source: e.detail === 0 ? "keyboard" : "pointer",
```

**Errors** — plain `Error`s naming the offending thing (`derive.mjs` voice):

```js
throw new Error(`bus-toggles: slot "${id}" has no rendered composition to command`);
```

**Node-import safety** — no top-level DOM access; the driver imports the modules for their
constants, exactly as `build-journey.mjs:54-60` imports `QUESTIONS` / `LABEL_MAX` /
`MAX_EXPORT_BYTES` rather than retyping them.

**Generated artifacts are regenerated, never hand-edited** (`loc-summary.json`, `param-count.json`).

---

## IMPLEMENTATION PLAN

### Phase 0: Measure the baseline blast radius *before* writing code

The one thing that must not be discovered at the end. Establishes exactly which baselines this
ticket churns, so Task 12 is a checklist and not an investigation.

### Phase 1: Foundation — CSS surface + the container

**Independent of:** Phase 2 (the two modules touch disjoint files and pages).

The device-frame layout, the container context, the `@container` reflow rules, the toggle-row
styles and the reduced-motion off-ramp — all in `system/proto.css`.

### Phase 2: Core — the two modules

**Depends on:** Phase 1 (both modules drive classes/custom properties defined there).
`system/device-frame.mjs` and `system/bus-toggles.mjs` are independent of each other and are
candidates for parallel work.

### Phase 3: Integration — page mounts, VR handle, manifest, generated artifacts

**Depends on:** Phase 2.

### Phase 4: Verification — gates, cross-engine driver, baselines

**Depends on:** Phase 3. Task 12 (baselines) must come **last**: `update:docker` screenshots the
working tree, so any later edit invalidates it.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom.

### 1. MEASURE the baseline blast radius (no production code yet)

- **IMPLEMENT**: Prove — do not reason about — which generated numbers move, because
  `approach.html` renders both `loc-summary.json`'s runtime group and `param-count.json`'s total
  (`approach.html:169-174, 234-250`). Create two throwaway stub files
  `system/device-frame.mjs` and `system/bus-toggles.mjs` containing only their header comment,
  `git add -N` them (`gen-loc-summary` reads **git-tracked** content — an untracked file is
  invisible to it, per the `loc-summary-counts-tracked-only` memory), then run both generators and
  diff.
- **PATTERN**: current committed values — `loc-summary.json` runtime `{files: 61, linesApprox:
  19200}`; `param-count.json` total 75 across 9 pages (`/proto/fieldwork: 1`, `/proto/verdant: 3`).
  Expected after this ticket: runtime files **61 → 63**, `linesApprox` 19200 → 19500–19700
  (rounded to 100), total **75 → 79**.
- **GOTCHA**: `61 → 63` is a two-digit change rendered on `approach.html`. It is **not** optional
  churn — `approach-neutral.png` and `approach-saulera.png` must be regenerated in this PR. This
  contradicts AC #3's "all other baselines untouched" as literally written; see OPEN QUESTIONS.
  Also: `maxDiffPixels: 100` can swallow a few changed digits, and `update:docker` will not rewrite
  a baseline whose diff is sub-threshold — if `approach-*.png` come back unchanged, `rm` the two
  PNGs to force a rewrite (`vr-update-skips-subperceptual` memory).
- **VALIDATE**:
  ```bash
  node agent-layer/gen-loc-summary.mjs --check; node agent-layer/gen-param-count.mjs --check
  # then, after the stubs are `git add -N`ed:
  node agent-layer/gen-loc-summary.mjs && git --no-pager diff -- system/loc-summary.json
  ```
  Record the real deltas in the ticket report. Then undo the intent-to-add entries with
  `git reset -- system/device-frame.mjs system/bus-toggles.mjs` (`git rm --cached` is the wrong
  undo for an `add -N` entry) and delete the stubs — the real files land in Task 5/6.
- **SATISFIES**: AC #3 (and surfaces the AC's error before any code is written).

### 2. UPDATE `system/proto.css` — device frame layout + container context

- **IMPLEMENT**: Below the existing `.proto-frame-phone` block (~line 758):
  - `.proto-device { display: flex; align-items: stretch; gap: var(--spacing-sm); }` — a flex row
    holding the phone and the handle. Structural, **not** `position: sticky` (`overflow-clip-breaks-sticky`).
  - Change `.proto-frame-phone`'s width to `width: var(--frame-w, min(392px, 94vw));` — the
    fallback is **byte-identical to today's value**, so with no JS the at-rest geometry is exactly
    what the current baseline holds.
  - `.proto-frame-phone .proto-screen { container-type: inline-size; }` — the container the queries
    below key to.
  - `.proto-resize` — the handle: a slim vertical grab bar, `touch-action: none;`, `cursor:
    ew-resize;`, a visible `:focus-visible` outline (`2px solid var(--color-accent)`, matching
    `.vd-plant-card:focus-visible`), and `align-self: center` sizing so it reads as a grip.
  - `.proto-resize-readout` — the width label beside the handle.
- **PATTERN**: token-only, mirroring `.proto-frame-phone`'s existing use of `--color-bg-inverse`,
  `--shadow-lg`, `--radius-*`, `--spacing-*`.
- **GOTCHA**: `container-type: inline-size` implies `contain: layout style inline-size` → the
  element becomes a **stacking context and a containing block for abs/fixed descendants**. That is
  the same mechanism as the #171 breadboard regression, and the pixel gate structurally cannot
  catch it (`update:docker` re-baselines from the same tree). Task 4 is the clearance check —
  do not skip it. Do not put `container-type` on `.proto-frame-phone`: keeping it on
  `.proto-screen` (which `overflow: hidden` already isolates) keeps the containment inside the
  bezel.
- **VALIDATE**: `npx serve .` → open `/proto/verdant.html`; the page must be **pixel-unchanged**
  from `main` at this point (no handle exists yet, and `var(--frame-w, …)` resolves to the fallback).
- **SATISFIES**: AC #2.

### 3. ADD the `@container` reflow rules to `system/proto.css`

- **IMPLEMENT**: One block, immediately after the container declaration, with a comment stating
  that it lives here (not `components.css`) on purpose:
  ```css
  /* The device frame's reflow (#176). These queries only mean anything inside the phone's
     container context, which .proto-frame-phone .proto-screen above establishes — so they live
     with the frame, not in components.css. Nothing else on the site has a container ancestor,
     so a @container rule is inert everywhere else by construction. */
  @container (max-width: 340px) {
    .vd-tile-pair { grid-template-columns: 1fr; }
  }
  @container (min-width: 560px) {
    .vd-screen-body .vd-stack { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  }
  ```
- **PATTERN**: overrides `system/components.css:1930` (`.vd-tile-pair`) and `:1935` (`.vd-stack`).
  `proto.css` is loaded **after** `components.css` in both proto heads (`verdant.html:22-23`) and
  the selectors are more specific, so the cascade resolves correctly.
- **GOTCHA**: `.vd-stack` is also used by `proto/fieldwork.html:154,164` for the board columns —
  hence the `.vd-screen-body` prefix, and hence Fieldwork's board deliberately gets **no**
  `container-type`. Verify Fieldwork is unchanged before moving on.
- **VALIDATE**: with `/proto/verdant.html` open, drive the container by hand in DevTools —
  `document.querySelector('.proto-frame-phone').style.setProperty('--frame-w','320px')` (tile pair
  stacks) and `'640px'` (plant lists go two-up). Then load `/proto/fieldwork.html` and confirm its
  `.vd-stack` columns are untouched.
- **SATISFIES**: AC #2.

### 4. VERIFY the containment hazard is clear (a check, not a code change)

- **IMPLEMENT**: Confirm nothing inside `.proto-screen` resolves its position against an ancestor
  **outside** the new containment context, and that nothing outside overlaps a contained element
  with `z-index: auto`.
- **PATTERN**: this is the hand-run form of `tooling/vt-stack-audit.mjs`'s hazard A/B (do not adopt
  that script as a gate — per CLAUDE.md it still false-positives on 2 of 7 IA pages until #190).
- **GOTCHA**: the audit at planning time found exactly one `position:` inside the phone subtree —
  `.vd-screen-header { position: sticky; top: 0; z-index: 10 }` (`components.css:1703`), which is
  already inert on this page because `.vd-screen-body` is the scroller, not `.proto-screen`. The
  inspect bubble is `popover="manual"` → top layer → unaffected by any stacking context. Re-verify
  both rather than trusting this paragraph, and check the sticky header still paints identically at
  the frame's min and max widths.
- **VALIDATE**:
  ```bash
  grep -n "position: *\(absolute\|fixed\|sticky\)" system/proto.css system/components.css
  ```
  then, in a real browser at 320 px and at the max width: the header stays put, the inspect bubble
  opens over the phone and is not clipped.
- **SATISFIES**: AC #2, AC #3 (protects against a regression the pixel gate cannot see).

### 5. CREATE `system/device-frame.mjs`

- **IMPLEMENT**: `export function initDeviceFrame(root = document)` →
  1. find `.proto-frame-phone`; if absent, return (no throw — the module may be imported by the
     driver for its constants);
  2. wrap it in `.proto-device` and **create** the handle + readout in JS (a control with no engine
     behind it is worse than no control — `verdant.html:196`);
  3. handle attributes: `role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`,
     `aria-label="Resize the device frame"`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow` (px),
     `aria-valuetext="392 px"`;
  4. pointer: `pointerdown` → `setPointerCapture` + `data-dragging` on `.proto-device`;
     `pointermove` → `setWidth(startW + (e.clientX - startX))`; `pointerup`/`pointercancel` →
     release + clear the attribute;
  5. keyboard: `ArrowLeft`/`ArrowRight` ±`STEP`, `Shift+Arrow` ±`STEP * 4`, `Home` → `FRAME_MIN`,
     `End` → `FRAME_MAX`; `preventDefault` on every handled key;
  6. `setWidth(px)` clamps to `[min(FRAME_MIN, availW), min(FRAME_MAX, availW)]` — clamped against
     the **measured available width**, not the bare constants — writes `--frame-w` on
     `.proto-frame-phone`, and updates `aria-valuenow` / `aria-valuetext` / the readout;
  7. export `FRAME_MIN = 320`, `FRAME_MAX = 720`, `STEP = 16` and `setFrameWidth(px)` so the driver
     imports them instead of retyping;
  8. set the VR readiness handle in a `finally` on every path —
     `document.querySelector(".proto-stage-center")?.setAttribute("data-device-frame", "ready")`
     — including the early return when no phone is found;
  9. return `{ destroy() }` (drop listeners + unwrap), mirroring `renderStudy`'s handle.
- **PATTERN**: `system/inspect.mjs`'s per-activation `AbortController` for listener teardown;
  `agentic-study.mjs:28` for `el()`; the `finally`-set handle is `spine.mjs`/`peak.mjs`'s shape.
- **GOTCHA — the handle is not optional.** The handle and readout are injected by a dynamic
  `import().then()`, so Verdant's new at-rest pixels (and the flex-wrapper reflow) land *after*
  load. The proto branch of `visual.spec.mjs` waits only on **data** (`#source[data-source=
  "static"]`, `.vd-plant-card`) — nothing waits on the frame. Without `data-device-frame="ready"`
  the measure at `visual.spec.mjs:129` can race the injection, and the failure mode is a
  handle-less or truncated baseline that compares cleanly against itself forever. Task 11 wires the
  matching `waitReady`.
- **GOTCHA**: **JS must write no geometry until the reader acts.** `setWidth` is never called at mount —
  `aria-valuenow` is seeded from `getBoundingClientRect().width`, and `--frame-w` stays unset so
  the CSS fallback owns rest geometry (AC #2). Node-import safe: no top-level `document`.
  `pointercancel` is mandatory (a drag that survives a browser gesture is the classic bug).
- **GOTCHA — the clamp floor collides with the CSS fallback.** At a 320 px viewport the default
  resolves to `94vw` ≈ 300 px, *below* `FRAME_MIN`; a bare-constant clamp would make the first
  keypress widen the frame past the viewport. Hence the `availW` clamp above — measure
  `.proto-stage-center`'s content box, don't assume a desktop.
- **VALIDATE**: `node --check system/device-frame.mjs`, then in a browser: drag past both clamps
  (width stops, does not jump); Tab to the handle, hold `ArrowRight` to `End`, then `Home`; confirm
  the readout and `aria-valuenow` agree with the rendered width at every step; repeat at a 320 px
  viewport and confirm the frame never exceeds it. Confirm
  `document.querySelector('.proto-stage-center').dataset.deviceFrame === 'ready'`.
- **SATISFIES**: AC #2.

### 6. CREATE `system/bus-toggles.mjs`

- **IMPLEMENT**: `export function mountSlotToggles(region, { vocab, composition, bus, slotId })`,
  called once per **successfully filled** slot. It:
  1. keeps `working = clone(composition)` (`JSON.parse(JSON.stringify(...))`, as `agentic-study.mjs:26`);
  2. renders a control row into `region`: a `<select>` naming each composed node by
     `props.label ?? name` (1 control), a three-option **radiogroup** `Calm` / `Warn` / `Critical`
     mapping to `TONES = ["neutral","warn","critical"]` (1 control — a radiogroup counts as one per
     the manifest rules), and a `Reset to the agent's proposal` button (1 control);
  3. on activate, **emits** and does nothing else:
     ```js
     bus.emit({
       type: "agent.set-tone",
       source: e.detail === 0 ? "keyboard" : "pointer",
       target: { component: working[i].name, id: `${slotId}:${i}` },
       params: { tone },
     });
     ```
  4. **consumes** via `bus.on("agent.set-tone", …)`: parse `target.id` as `slot:index`, ignore
     actions for another slot, then **refuse visibly** — an out-of-range index or a tone outside
     `TONES` writes `refused: tone "urgent" is not in [neutral | warn | critical]` into the same
     `aria-live` readout and returns, leaving the DOM untouched. On a valid action, mutate
     `working[i].props.tone` and re-render the fill with `renderComposition(vocab, working, bus)`
     into a freshly `replaceChildren()`-ed `.proto-slot-fill`. Reset restores the clone and
     re-renders identically.
  5. writes a one-line `aria-live="polite"` readout showing the last action's `type`, `source` and
     `target` — this is the honesty requirement, not a nicety (below).
  6. returns `{ destroy() }`; `bus.on` returns its own unsubscribe — call it.
- **PATTERN**: `agentic-study.mjs:113-208` (the working-copy → validate → re-render loop) and
  `agentic-renderer.mjs:205-212` (source derivation).
- **GOTCHA — honesty, and it is load-bearing.** On a page whose whole thesis is *human-designed
  chrome + bounded agentic slots*, a reader's click producing an `agent.*` message must never read
  as the agent having done it. Two hard requirements: (a) the row's own copy says the reader is
  issuing the same command an agent would — e.g. *"These buttons send the surface the same command
  an agent sends. Same action, different source — that's the whole point of one contract. The tiles
  themselves were composed by a real build-time run; Reset puts the agent's proposal back."*;
  (b) the readout shows `source` verbatim, so a pointer-sourced command is visibly pointer-sourced.
  Both lines pass `/no-ai-slop` + `/humanizer` before commit (epic copy rule).
- **GOTCHA — do not edit `system/action-bus.mjs`.** The contract already admits this type and every
  source; the whole point is that the new code is a *consumer*. If you find yourself editing the
  contract, the design is wrong.
- **GOTCHA — refuse into the readout, never with a throw.** `action-bus.mjs:70-77` wraps every
  handler in try/catch → `console.error`, so a thrown refusal becomes a console line the reader
  never sees *and* trips `tooling/proto-journey.mjs`'s own "exit 1 if any engine logs a page error"
  contract. Writing the refusal into the `aria-live` readout keeps it a **visible affordance** —
  which is the study page's whole argument (`agentic-study.mjs:113-119`) — and removes the driver
  conflict. Nothing in this module throws at runtime; validation errors from `renderComposition`
  are caught and shown the same way.
- **GOTCHA — radiogroup semantics, not `aria-pressed`.** Three `aria-pressed` buttons where exactly
  one is on is a radiogroup wearing toggle clothes. Use `role="radiogroup"` + `role="radio"` +
  `aria-checked` with roving `tabindex` and arrow-key movement, or native `input[type=radio]` —
  see OPEN QUESTION 6 for the call and `dock.mjs`'s `input[name="pack"]` precedent.
- **GOTCHA**: re-render through `renderComposition`, never a hand-patched class toggle — the
  validate-before-DOM refusal path is the exhibit's guarantee, and bypassing it silently drops it.
- **VALIDATE**: `node --check system/bus-toggles.mjs`; then on `/proto/fieldwork.html` flip a tile
  in each slot by mouse and by keyboard, confirm the tile visibly changes and the readout names the
  right `source`; then in the console
  `import('/system/action-bus.mjs')` is *not* needed — drive the live bus through the module's
  exported seam (Task 7) and confirm the same tile changes with `source: "agent"`.
- **SATISFIES**: AC #1.

### 7. ADD the driver seam to `system/bus-toggles.mjs`

- **IMPLEMENT**: `export function getSlotBus()` returning the live bus the page handed in (module
  state set at first mount, `null` before). This is the only way the cross-engine driver can inject
  a `source: "agent"` action without a `window.__` global.
- **PATTERN**: `build-journey.mjs:142` — `page.evaluate(() => import("/system/build-questions.mjs")
  .then((m) => m.setAnswers({…})))`. Module exports are this repo's test seam; page globals are not.
- **GOTCHA**: it returns the bus, it does not create one — Fieldwork creates exactly one bus for
  both slots (`fieldwork.html:200`) and the toggles must ride that same bus, or the parity claim is
  staged rather than real.
- **VALIDATE**: in the browser console on `/proto/fieldwork.html`:
  ```js
  const { getSlotBus } = await import('/system/bus-toggles.mjs');
  getSlotBus().emit({ type: 'agent.set-tone', source: 'agent',
    target: { component: 'metric-tile', id: 'summary-strip:0' }, params: { tone: 'critical' } });
  ```
  The first summary tile must flip, and the readout must say `agent`.
- **SATISFIES**: AC #1, AC #4.

### 8. UPDATE `proto/fieldwork.html` — mount the toggles + the VR readiness handle

- **IMPLEMENT**:
  1. import `mountSlotToggles` alongside the existing imports;
  2. inside `fillSlot`'s **success path only** (after `region.appendChild(fill)`), call
     `mountSlotToggles(region, { vocab, composition, bus, slotId: id })` — a slot that fell back to
     its labelled placeholder gets no controls, because there is nothing to command;
  3. wrap the outer `try` in a `finally` that sets `board.dataset.busToggles = "ready"`.
- **PATTERN**: the `finally`-on-every-path readiness handle is `spine.mjs`'s and `peak.mjs`'s shape,
  cited in `visual.spec.mjs:18-30`.
- **GOTCHA**: the handle **must** be set on the data-failure path too, or the VR gate deadlocks to
  timeout instead of failing on the missing `.fw-lane`. Equally: it must be set *after* the toggles
  render, or it buys nothing.
- **GOTCHA**: keep the top-window-only discipline in mind — the toggles mount inside the async data
  module, which also runs in the work.html iframe embed. Guard the `mountSlotToggles` call with
  `window.self === window.top`, matching the inspect re-init at `fieldwork.html:179`, so the embed
  does not grow a control row. The embed is masked in VR, so this is about honesty, not pixels.
- **VALIDATE**: `npx serve .` → `/proto/fieldwork.html` renders both control rows and
  `document.getElementById('board').dataset.busToggles === 'ready'`; then `/work.html` → the
  embedded Fieldwork figure has **no** control row.
- **SATISFIES**: AC #1, AC #3.

### 9. UPDATE `proto/verdant.html` — mount the device frame

- **IMPLEMENT**: add, beside the existing top-window-only block at line 199:
  `if (window.self === window.top) import("/system/device-frame.mjs").then((m) => m.initDeviceFrame());`
  Keep the existing comment's reasoning and extend it to say the frame handle is frame chrome too.
  No markup change is required if the module does the wrapping (Task 5); if you choose markup
  instead, the handle must not exist in HTML — an inert handle is worse than none.
- **PATTERN**: `verdant.html:191-206`.
- **GOTCHA**: this runs in the same body-end script as the dock/inspect imports and must not
  disturb their order (`dock → inspect → palette`, `verdant.html:191`).
- **VALIDATE**: `/proto/verdant.html` shows the handle and sets `[data-device-frame="ready"]`;
  `/work.html`'s embedded Verdant figure shows neither. Note the handle is top-window-only, so the
  readiness handle is set only in the top window — which is the only context the VR gate captures.
- **SATISFIES**: AC #2.

### 10. UPDATE `system/param-manifest.json` + regenerate the counts

- **IMPLEMENT**: four entries, following the file's counting rules exactly:
  ```json
  { "page": "/proto/verdant",   "selector": ".proto-resize", "label": "device-frame resize handle (drag + arrow keys)" },
  { "page": "/proto/fieldwork", "selector": ".bt-target",    "label": "agentic-slot target picker",  "note": "one per slot; counted once per the per-item rule" },
  { "page": "/proto/fieldwork", "selector": ".bt-tone",      "label": "tone command buttons (one group)" },
  { "page": "/proto/fieldwork", "selector": ".bt-reset",     "label": "reset to the agent's proposal" }
  ```
  Then fix the now-false closing sentence of `$description` ("proto/fieldwork's only control is its
  inspect toggle — its agentic slots render non-interactive metric-tiles"): the tiles are still
  non-interactive; what changed is that the slot now carries controls *beside* them.
- **PATTERN**: existing `/proto/verdant` entries; the `note` field carries a caveat, as
  `.dock-restore`'s does.
- **GOTCHA**: entries must be ordered the way the file already orders them (the generator's output
  is deterministic; do not reshuffle). `param-count.json` is **generated** — regenerate, never edit.
- **VALIDATE**:
  ```bash
  node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check
  git --no-pager diff -- system/param-count.json   # /proto/fieldwork 1→4, /proto/verdant 3→4, total 75→79
  ```
- **SATISFIES**: AC #3, epic metric (≥40 site-wide).

### 11. UPDATE `tooling/visual-regression/visual.spec.mjs` + regenerate `loc-summary.json`

- **IMPLEMENT**: on the two proto entries only — **both**, not just Fieldwork:
  ```js
  { name: 'proto-verdant',   url: '/proto/verdant.html',   kind: 'proto', rows: '.vd-plant-card',
    waitReady: '[data-device-frame="ready"]' },
  { name: 'proto-fieldwork', url: '/proto/fieldwork.html', kind: 'proto', rows: '.fw-lane',
    waitReady: '[data-bus-toggles="ready"]' },
  ```
  with a comment in the file's established voice: **both** pages now paint at-rest chrome that
  arrives after load — Fieldwork's control rows behind an async vocabulary + composition fetch,
  Verdant's handle + readout behind a dynamic `import()` — and the existing proto waits are on
  *data*, not on either. Without these handles the height measured at `:129` can be stale and the
  capture silently truncates or omits the new chrome: the #138 defect class, and one that compares
  cleanly against itself forever. Then `node agent-layer/gen-loc-summary.mjs`.
- **PATTERN**: `visual.spec.mjs:62-65` (/build's `waitReady` list) — and note `waitReady` is
  applied at `:104`, outside the `ia`/`else` branch, so a `proto` page may carry it.
- **GOTCHA**: do **not** use `waitVisible` on either. That would switch these pages into the
  `if (p.waitVisible)` re-measure loop and change their capture flow; `waitReady` runs before
  `fonts.ready` and before the measure, which is exactly what is needed here. Do not touch any
  other `PAGES` entry — the other eight must keep a byte-identical flow or they churn for no reason.
- **GOTCHA**: `gen-loc-summary` reads git-tracked content, so **stage the new files first** or the
  run reports a false "no drift" (`loc-summary-counts-tracked-only`).
- **VALIDATE**:
  ```bash
  git add -A && node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check
  node tooling/drift-check.mjs      # all 11 steps green
  ```
- **SATISFIES**: AC #3.

### 12. REGENERATE the VR baselines (last — after every other edit)

- **IMPLEMENT**: from a **clean detached worktree under `/Users`** (not `/private/tmp` — Docker
  file sharing), `cd tooling/visual-regression && npm ci && npm run update:docker`. Expected churn:
  `proto-verdant-{neutral,saulera}.png`, `proto-fieldwork-{neutral,saulera}.png`,
  `approach-{neutral,saulera}.png`. **Six baselines, not four.**
- **PATTERN**: `visual-regression-baseline-trap` + `loc-summary-baseline-cascade` memories.
- **GOTCHA**: `update:docker` screenshots the **working tree**, so run it after the last source
  edit; any later fix means running it again. If `approach-*.png` come back unchanged, the digit
  delta fell under `maxDiffPixels: 100` — `rm` those two PNGs and re-run to force a rewrite. If
  `work-*.png` churns, something leaked into the iframe embeds (Tasks 8/9's top-window guards) —
  fix the leak rather than accepting the baseline. A local macOS run failing ~16 shots is the
  platform difference, not a regression (`local-agent-visual-gate-notes`); the Docker run is the
  gate. `approach` can also fail on the live `countUp` rAF with `retries: 0`
  (`vr-gate-approach-countup-flake`) — a different pack failing each run is the flake signature.
- **VALIDATE**: `npm run test:docker` green afterwards; `git status` shows **exactly** the six
  expected PNGs and nothing else.
- **SATISFIES**: AC #3.

### 13. CREATE `tooling/proto-journey.mjs` — the cross-engine driver

- **IMPLEMENT**: mirror `tooling/build-journey.mjs`'s structure exactly — `createRequire` out of
  `tooling/visual-regression/`, `ENGINES = ["chromium","firefox","webkit"]`, `node
  tooling/proto-journey.mjs [engine|all]`, one `✓`/`✗` line per assertion, exit 1 on any failure or
  page error. Import `FRAME_MIN`/`FRAME_MAX`/`STEP` and `TONES` from the shipped modules rather
  than retyping them. Assertions:
  - **Parity (the AC #1 assertion — assert resulting DOM, never that an event fired):** set a tile
    to `critical` three ways — (a) pointer click, (b) `Enter` on the focused button, (c)
    `page.evaluate(() => import("/system/bus-toggles.mjs").then((m) => m.getSlotBus().emit({… source: "agent" …})))`
    — resetting between each, and assert the **same resulting class on the same tile** all three
    times. Also assert the readout reported `pointer`, `keyboard`, `agent` respectively.
  - **Reset** restores the committed proposal's tones exactly (compare against the fetched JSON).
  - **Refusal path holds**: emitting a tone outside `TONES` leaves the DOM unchanged, names the
    refusal in the readout, and logs **nothing** to the console — so the driver's own
    "exit 1 on any page error" contract stays a real check rather than one this ticket had to
    carve an exception into.
  - **Frame clamps**: drag far past both ends → width settles at `FRAME_MIN` / `FRAME_MAX`;
    `Home`/`End` reach the same two numbers; `aria-valuenow` agrees with the measured width.
  - **Reflow**: at `FRAME_MIN` the `.vd-tile-pair` computed `grid-template-columns` resolves to one
    track; at 640 px `.vd-screen-body .vd-stack` resolves to more than one.
  - **Reduced motion**: under `reducedMotion: 'reduce'`, both interactions still complete and reach
    the same end state.
  - **Embed discipline**: load `/work.html` and assert the proto iframes carry neither a control
    row nor a resize handle.
- **PATTERN**: `build-journey.mjs` header + `t(...)` grammar; `vt-verify.mjs` for the "third driver,
  operator-run, not in CI" framing.
- **GOTCHA**: Playwright must **never** become a repo dependency. Where an engine genuinely cannot
  do a thing, assert the documented fallback — a skip that cannot fail is not a check
  (`check-that-cannot-fail` memory). Serve the repo with
  `node tooling/visual-regression/serve.mjs` first.
- **VALIDATE**:
  ```bash
  node tooling/visual-regression/serve.mjs &
  node tooling/proto-journey.mjs all      # 3 engines, zero ✗
  ```
- **SATISFIES**: AC #1, AC #4.

### 14. UPDATE `CLAUDE.md` — architecture map

- **IMPLEMENT**: one line each for `system/device-frame.mjs` and `system/bus-toggles.mjs` in the
  `system/` block (in the hand-written-canon voice used by its neighbours), one line for
  `tooling/proto-journey.mjs` beside `build-journey`/`vt-verify`, and extend the `proto/` entry to
  say both pages are now manipulable.
- **PATTERN**: the existing `tooling/vt-verify.mjs` entry — states what the file proves that the
  other drivers structurally cannot.
- **GOTCHA**: surgical. Do not restructure neighbouring entries.
- **VALIDATE**: `git --no-pager diff -- CLAUDE.md` shows only added lines plus the one extended
  `proto/` entry.
- **SATISFIES**: repo convention.

### 15. COPY pass + artifacts

- **IMPLEMENT**: run `/no-ai-slop` then `/humanizer` over every reader-facing line this ticket adds
  (the control-row label + hint, the handle's `aria-label`, the readout's empty state). Then write
  `.claude/reports/protos-bus-toggles-device-frame-176-report.md` and commit it **with** this plan
  in the same PR.
- **PATTERN**: epic copy rule (PRD §Scope) + CLAUDE.md's "a ticket's plan, report and review belong
  in the same PR".
- **GOTCHA**: any copy edit after Task 12 re-churns the proto baselines — do the copy pass on the
  draft strings **before** the baseline run, and treat Task 15's rewrite as verification only.
- **VALIDATE**: `git --no-pager diff --stat` before the PR; plan + report present.
- **SATISFIES**: repo convention, epic copy rule.

---

## TESTING STRATEGY

This repo has no test suite, no linter and no type-check (CLAUDE.md). "Done" = run the surface you
touched, plus the two committed gates.

### Committed gates (CI)

- `node tooling/drift-check.mjs` — 11 steps; the ones this ticket can turn red are **syntax**
  (`node --check` on both new modules and the driver), **loc-summary**, **param-count**. It should
  *not* touch system-graph or inspect-data, because `system/components.css` is not edited — if it
  does, something was written into the wrong file.
- `cd tooling/visual-regression && npm run test:docker` — the pixel gate, green against the six
  regenerated baselines.

### Cross-engine functional (operator-run, committed)

- `node tooling/proto-journey.mjs all` — the AC #1 and AC #2 assertions in Chromium, Firefox and
  WebKit. This is the ticket's primary functional evidence and its output belongs in the report.

### Manual validation

- `/proto/verdant.html`: drag, keyboard-resize, both reflow breakpoints, inspect bubble still opens
  and is not clipped, pack switch (neutral ↔ saulera ↔ verdant ↔ plusui) at min and max width.
- `/proto/fieldwork.html`: both control rows, mouse + keyboard, reset, readout `source`.
- `/work.html`: neither embed grew chrome.
- `⌘K` palette and the appearance dock still work on both pages (both were mounted by #175).

### Edge cases that must be exercised

- A slot whose composition fetch failed → labelled placeholder, **no** control row, and the VR
  readiness handle still set.
- The whole data load failing → error message, handle still set (no gate deadlock).
- An `agent.set-tone` with an out-of-range index, an unknown slot id, or a tone outside `TONES` →
  refused **into the readout**, DOM unchanged, nothing thrown and nothing on the console.
- Both slots commanded in the same session → each row commands only its own slot.
- Drag released outside the window (`pointercancel`).
- `prefers-reduced-motion: reduce` → no transition, same end state.
- Frame at a **320 px** viewport, where the `94vw` CSS default (≈300 px) sits *below* `FRAME_MIN` —
  the first keypress must not widen the frame past the viewport.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check system/device-frame.mjs
node --check system/bus-toggles.mjs
node --check tooling/proto-journey.mjs
```

### Level 2: Generators + drift

```bash
git add -A                                  # gen-loc-summary reads TRACKED content
node agent-layer/gen-param-count.mjs
node agent-layer/gen-loc-summary.mjs
node tooling/drift-check.mjs                # must print the 11-step ✓ line
```

### Level 3: Visual regression

```bash
cd tooling/visual-regression && npm ci
npm run update:docker      # from a CLEAN detached worktree under /Users
npm run test:docker
```

### Level 4: Cross-engine functional

```bash
node tooling/visual-regression/serve.mjs &
node tooling/proto-journey.mjs all
```

### Level 5: Manual

```bash
npx serve .
# /proto/verdant.html · /proto/fieldwork.html · /work.html · /approach.html (the two numbers)
```

---

## ACCEPTANCE CRITERIA

Ticket ACs, restated as verifiable checks (AC #3 amended — see OPEN QUESTIONS):

- [ ] **AC #1** Each toggle visibly changes a rendered component's state via the bus, and
      `tooling/proto-journey.mjs` proves the same resulting DOM from `source: "pointer"`,
      `"keyboard"` and `"agent"` in all three engines. `system/action-bus.mjs` is unmodified.
- [ ] **AC #2** The frame drags and keys between `FRAME_MIN`/`FRAME_MAX` (both clamped against
      measured available width), components reflow through `@container`, `aria-valuenow` tracks the
      width, and the **at-rest default width is CSS-owned** — no JS writes geometry at mount.
- [ ] Both proto pages carry a `waitReady` handle set in a `finally` on every path
      (`[data-device-frame="ready"]`, `[data-bus-toggles="ready"]`), so neither page's new at-rest
      chrome can race the capture.
- [ ] An invalid `agent.set-tone` refuses **into the readout** — DOM unchanged, nothing thrown,
      nothing on the console.
- [ ] **AC #3 (amended)** The four proto baselines **and** the two `approach` baselines are
      regenerated in this PR; no other baseline changes. `drift-check` green.
- [ ] **AC #4** `node tooling/proto-journey.mjs all` passes on chromium + firefox + webkit, output
      recorded in the report.
- [ ] `system/param-manifest.json` carries the four new controls; `param-count.json` regenerated
      (75 → 79) and drift-checked.
- [ ] Both new modules are Node-import safe (no top-level DOM), header-commented with their
      governing doc, and token-only in their CSS.
- [ ] Reduced motion has an explicit off-ramp in `proto.css` (that sheet gets no global kill-switch).
- [ ] Neither work.html embed grew chrome.
- [ ] Reader-facing copy passed `/no-ai-slop` + `/humanizer`; the toggle row states that the reader
      is issuing the same command an agent would, and the readout shows `source`.
- [ ] Plan + report committed in the same PR; PR body carries `Closes #176`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, Task 12 last
- [ ] Each task's validation ran and passed at the time
- [ ] `node tooling/drift-check.mjs` green
- [ ] `npm run test:docker` green against the regenerated baselines
- [ ] `node tooling/proto-journey.mjs all` green
- [ ] `git status` shows exactly the expected six PNGs and no stray generated file
- [ ] `CLAUDE.md` map updated
- [ ] Plan + report committed; PR body has `Closes #176`

---

## OPEN QUESTIONS / ASSUMPTIONS

**1. AC #3 as written cannot be satisfied — flagging rather than silently diverging.**
"Proto baselines regenerated same PR; **all other baselines untouched**" collides with two
mechanical facts: `approach.html` renders `loc-summary.json`'s runtime group (`files: 61` today —
two new `system/*.mjs` files make it 63) and `param-count.json`'s total (75 → 79). Both are
measured, drift-checked artifacts; neither can be avoided without abandoning the manifest
convention or putting view-time modules somewhere they don't belong. **Assumption: the intent is
"regenerate exactly what your change churns, and nothing else"** — so the PR regenerates six
baselines and the report names each with its cause. Task 1 measures the real deltas before any code
is written, so this is confirmed rather than assumed. If the owner wants AC #3 read literally,
that would mean not adding manifest entries, which contradicts both the epic's ≥40-controls metric
and CLAUDE.md's manifest convention — flag before proceeding.

**2. Container-query rules in `proto.css`, not `components.css`.** The ticket says "container
queries in the components do the responsive work". This plan puts them in `proto.css` scoped under
the frame's container. Rationale in NOTES; it is a deliberate, reversible deviation whose whole
justification is blast radius. Assumption: acceptable, because the *components* still do the
responsive work — they are simply told to by the surface that owns the container.

**3. Toggle granularity.** Assumption: one control row per slot (target picker + three tone buttons
+ reset) rather than a row per composed tile — the two slots hold 4 and 6 `metric-tile`s, so
per-tile rows would put ten control rows on a dispatch board and drown the exhibit. If the owner
wants per-tile controls, the module structure supports it; only the render function changes.

**4. `agent.*` vs `ui.*` for the toggles.** Assumption: `agent.set-tone` is correct — the toggle
*commands the surface*, which is the `agent.*` direction, while `source` records that a pointer or
a key produced it. `action-bus.mjs:14-21` states the two axes are orthogonal, and this is the only
code in the repo that would exercise the `agent.*` half. The alternative (`ui.intent`, as
`agentic-study.mjs` uses) would make these toggles a duplicate of the study page's controls and
leave the bidirectional claim undemonstrated. The honesty requirement in Task 6 is what makes this
safe.

**5. Clamp values.** `FRAME_MIN = 320`, `FRAME_MAX = 720`, `STEP = 16` are chosen (small phone →
small tablet; step matches `--spacing` rhythm) and are not specified by the ticket. Adjustable in
review; they live in one module and the driver imports them. Both are additionally clamped against
measured available width, so a 320 px viewport does not push the frame off-screen.

**6. Radiogroup implementation — owner's call.** The ticket says "toggles are buttons", and this
plan honours that with `role="radiogroup"` + `role="radio"` + `aria-checked` (roving `tabindex`,
arrow-key movement). The alternative is native `input[type=radio]`, which is what `dock.mjs`'s pack
switcher already does — the manifest counts it as one control, arrow keys and focus management come
free, and there is no hand-rolled key handling to get wrong. Assumption: keep buttons for the
ticket's letter. If the owner prefers the dock's native precedent, only the render function
changes; nothing else in this plan moves.

---

## NOTES (open canvas)

### Why `@container` rules go in `proto.css` and `components.css` is untouched

This is the single highest-leverage scoping decision in the plan.

`agent-layer/gen-system-graph.mjs` parses `system/components.css` into consumer blocks delimited by
`/* ---------- Name ---------- */` and records **which tokens each block consumes**
(`gen-system-graph.mjs:62-85`). `system/system-graph.json` is drift-checked in CI, is rendered by
`factory.html`'s `#shape` exhibit, and is the input to `agent-layer/gen-inspect-data.mjs` (whose
output drives the inspect bubble and has its own drift gate plus an `inspect-mounts` gate).

So a `@container` rule added inside a `.vd-*` block in `components.css` risks:

- introducing a token that block did not previously consume → `system-graph.json` changes →
  `inspect-data.json` changes → **`factory-{neutral,saulera}.png` may churn** on top of everything
  else, and the inspect bubble's token list for that component silently changes;
- or, if given its own block header, adding a consumer to the graph — same cascade.

Putting the queries in `proto.css` avoids all of it: that sheet is parsed by no generator (only
counted by `loc-summary`), and a `@container` rule is **inert without a container ancestor**, so
even if the selectors matched elsewhere they could not apply. The container context itself
(`container-type` on `.proto-frame-phone .proto-screen`) is unambiguously a proto-surface concern —
it exists only because the frame exists.

Rejected alternatives:

| Option | Why not |
|---|---|
| `@container` inside existing `.vd-*` blocks in `components.css` | system-graph / inspect-data / factory-baseline cascade above |
| A new `/* ---------- device frame ---------- */` block in `components.css` | adds a graph consumer — same cascade, plus a consumer with no `ROLES` entry |
| `container-type` on `.proto-frame-phone` | containment would wrap the bezel and shadow; `.proto-screen` is already isolated by `overflow: hidden`, so it is the tighter context |
| A `resize: horizontal` CSS-only frame | no keyboard operability, no clamp control, no `aria-valuenow`; fails AC #2's keyboard half |

### Why the frame's rest geometry must be CSS

`width: var(--frame-w, min(392px, 94vw))` with `--frame-w` unset until the reader acts means:
zero mount-time writes, zero async width, and the only baseline delta on Verdant is the handle's own
pixels. A JS-applied default would reintroduce a mount race into a page the pixel gate captures at
load, and AC #2's "at-rest default width identical for VR" would then depend on script timing.
Same reasoning as `pack-boot.js`'s guaranteed-no-op default, which the VR gate already relies on.

### Both proto pages need a readiness handle, not just Fieldwork

Easy to get wrong, because Verdant's *width* is CSS-owned and looks static. It is the **handle and
readout** that arrive late — they are injected by `initDeviceFrame()` behind a dynamic `import()`,
and injecting them also wraps the phone in `.proto-device`, which reflows the stage. The proto
branch of `visual.spec.mjs:94-100` waits only on data selectors. So Verdant's new at-rest chrome is
exactly as racy as Fieldwork's control rows, for a different reason, and needs the same fix.

### Why `waitReady` and not `waitVisible` on either proto page

`waitVisible` exists for `activateOn: 'visible'` beats that only start at the final viewport resize,
and it drags the page into the bounded re-measure loop (`visual.spec.mjs:157-172`). Neither proto
case is that: Fieldwork's slot fill is a plain async fetch and Verdant's frame is a dynamic import,
both starting at load rather than at reveal. `waitReady` runs at `:104`, before `fonts.ready` and
before the first `measure()`, which is exactly where the wait belongs. Using `waitVisible` would
change these pages' capture flow for no reason and risk churn the plan cannot account for.

### The parity assertion is the one most likely to become a check that cannot fail

Every #137 defect survived a green gate the same way: the check skipped the thing it tested
(`check-that-cannot-fail` memory). "Assert an action was emitted" would pass even if no consumer
existed. The driver therefore asserts the **resulting DOM class on a named tile** after each of the
three sources, with a reset between — a broken consumer fails all three, a broken keyboard path
fails exactly one.

### Sequencing / parallelism

Tasks 5 and 6 are independent (different files, different pages) and are the natural parallel split
if two sessions run. Everything from Task 8 onward is strictly sequential, and Task 12 must be last.

### Risks

| Risk | Mitigation |
|---|---|
| `container-type`'s stacking context breaks something the pixel gate re-baselines away | Task 4's explicit hazard clearance before any baseline run; the planning audit already found only one `position:` inside the phone subtree |
| Fieldwork's control row lands after the height measure → silent truncation | Task 11's `waitReady` handle, set in a `finally` on every path |
| Verdant's injected handle lands after the height measure → handle-less baseline that compares cleanly against itself forever | the *same* fix on Verdant: `[data-device-frame="ready"]` set in a `finally` (Task 5.8) + `waitReady` (Task 11). The existing proto waits are on data, and neither of them waits on the frame |
| `approach` churn missed → CI `verify` red after merge | Task 1 measures it up front; Task 12 lists six baselines, not four |
| A pointer-sourced `agent.*` message reads as agent output | Task 6's copy requirement + the `source`-showing readout, both mandatory not optional |
| Copy edits after the baseline run | Task 15's ordering note — copy pass on drafts before Task 12 |
| Working tree is a shared worktree (parallel sessions) | verify the branch immediately before committing; stage by explicit path (`shared-worktree-parallel-sessions` memory) |

### Confidence

**9.5 / 10.** Every file, seam and gate is identified and read; the two genuinely uncertain
quantities (the exact baseline churn set, and the `linesApprox` rounding) are measured by Task 1
before any code is written, and both outcomes are handled explicitly. The remaining 0.5 is the
owner's call on OPEN QUESTION 1 (AC #3's literal wording) and 3 (toggle granularity) — neither
blocks starting, and both are cheap to change.

## AMENDMENTS

<!-- Append-only after approval; newest at the bottom. -->
