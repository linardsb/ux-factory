# Feature: Before/after compare slider — brand-import report + round-trip exhibit (#170)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and models —
import from the right files.

## Feature Description

A hand-written ~40-line-core compare-slider primitive (`system/compare-slider.mjs`): two overlaid
layers with a draggable `clip-path` divider, pointer AND keyboard driven, ARIA-slider announced,
token-only CSS, reduced-motion safe (no autonomous motion). Mounted twice:

1. **Home, brand-import report** — the reader's freshly imported pack vs this site's neutral pack,
   on a small specimen UI under the divider. "Wear it" becomes direct manipulation.
2. **Factory + /roundtrip, round-trip exhibit** — the agent's *proposed* palette vs *ground truth*,
   as a swatch strip joining the fidelity diff. Committed files only.

## User Story

As a hiring manager doing a 90-second pass
I want to drag a divider and directly see "their design vs the site's neutral" and "what the agent
proposed vs what was true"
So that the site demonstrates prototyping-tool feel under my cursor instead of claiming it in copy.

## Problem Statement

Both exhibits state comparisons in tables and paired swatches; nothing lets the reader *manipulate*
the comparison. Epic #164's thesis is that too few things respond to the reader.

## Solution Statement

One reusable canon module renders both mounts. The brand-import mount pins **both** layers'
custom properties on their own subtree elements (neutral values from the already-fetched contract,
imported values from the unchanged `vetTokens` path), so the comparison stays exact even after
"Wear it" re-skins the page. The round-trip mount renders two identical swatch strips from the
committed `verdant.diff.json` model — proposed hexes on one layer, truth hexes on the other.

## Out of Scope / Non-Goals

- Not a library component: no `system/components.css` entry, no spec, no wc wrapper — this is a
  surface exhibit (portfolio.css), like the rest of brand-import/rt styling.
- Not touching `pack-imported.mjs` / `vetTokens` / `pack-boot.js` — AC 2 says the vetting path is
  *unchanged*; the mount only **calls** `vetTokens`.
- No analytics route (not in the ticket; epic's milestone routes land elsewhere).
- No inspect (`data-inspect`) instrumentation — #169/#173's business.
- No copy rewrite of surrounding sections (wave tickets own that); only the slider's own 1–2 new
  plain-register lines, passed through /no-ai-slop + /humanizer.
- Not changing the existing headline metric / gate / verdict / accordions of the round-trip
  exhibit — the slider *joins* the diff (inserted after the headline metric), nothing moves.

## Feature Metadata

**Feature Type**: New Capability (one primitive + two mounts)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/compare-slider.mjs` (new), `system/brand-import.mjs`,
`system/derivation-roundtrip.mjs`, `system/portfolio.css`, `system/param-manifest.json` (+ regen
`param-count.json`, `loc-summary.json`), VR baselines (factory ×2, roundtrip ×2, approach ×2)
**Dependencies**: none new — #165's motion tokens (`--motion-ease-settle`, `--motion-base`) are on
main; vanilla constraint unchanged.

## Related Work

**Implements**: linardsb/ux-factory#170 · **Epic**: #164 —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§New pieces: slider row;
img-comparison-slider rejected — shadow DOM fights token-only CSS; hand-write)

**Back-references**:
- `.claude/plans/spring-motion-foundation-165.md` — motion tokens this uses; the cross-engine
  scratchpad-check pattern (Task 8 there) is reused verbatim here.
- `.claude/plans/public-drop-to-reskin.md` (#130) — brand-import surface + vetting invariants.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `system/brand-import.mjs` — mount host 1. `renderReport(r)` (lines 162–237) is where the slider
  inserts (after the summary `<p>`, line 180, before the actions row line 183). `r` carries
  `r.mapped.values` (FULL contract-name→value map), `r.label`, `r.contract`
  (`parseContract` result: `{ sections, byName, order }` — `byName[name].$value` is the NEUTRAL
  default for every contract token). `el()` DOM builder at lines 40–50 (text via `textContent`,
  never innerHTML). `renderReport` is re-run wholesale on retry — no cleanup needed.
- `system/pack-imported.mjs` (lines 100–126) — `vetTokens(map)` → `{ tokens, rejected, skipped }`.
  Import and CALL it on the `--`-prefixed `mapped.values`; do not modify it (AC 2).
- `system/pack-import.mjs` (lines 557–587) — `cssValue($value)` (exported) turns a raw contract
  `$value` (string | array font stack | shadow object) into CSS text; `parseContract` shape.
- `system/derivation-roundtrip.mjs` — mount host 2. Insert after the headline metric block
  (`root.append(metric)`, line 135). Model shape: `model.accent = { token?, proposed, truth,
  deltaE, … }`, `model.accentFamily = [{ token, proposed, truth, deltaE }]`. `el()` helper line 44;
  the hex-via-`style.background` data-driven exception is documented at lines 51–57 — follow it.
  `renderRoundTrip` runs synchronously inside the existing `data-diff="ready"` fetch chain
  (init, lines 321–328) — the VR ready handle already covers the slider, add nothing.
- `system/portfolio.css` — `.brand-import-*` styles at ~1490–1581, `.rt-*` styles at ~816+. Add
  one shared `.cmp-*` block plus the two mounts' specimen styles. Token-only: every value is a
  `var(--…)` or structural (%, fr, 0, auto).
- `system/tokens.contract.css` lines 75–89 — motion tokens: use `--motion-base` +
  `--motion-ease-settle` for the keyboard-step glide.
- `system/param-manifest.json` — entry format + counting rules in `$description` (a conditional
  control counts, marked with a note; one entry = one distinct control per page).
- `system/motion.mjs` — the `still()` reduced-motion/webdriver pattern (lines 15–17) if you gate
  anything in JS; prefer pure-CSS `@media (prefers-reduced-motion: reduce)` here.
- `tooling/visual-regression/visual.spec.mjs` lines 31–65 — page specs + ready handles (factory
  line 44, roundtrip line 45 already wait on `#roundtrip-diff[data-diff="ready"]`).
- `.claude/plans/spring-motion-foundation-165.md` Task 8 (lines ~336–357) — the cross-engine
  scratchpad Playwright check pattern: resolve Playwright from
  `tooling/visual-regression/node_modules`, serve repo root, drive chromium + firefox + webkit.

### New Files to Create

- `system/compare-slider.mjs` — the primitive (hand-written canon, library module: self-boots
  NOTHING, Node-import-safe like `pack-imported.mjs`).
- `<scratchpad>/check-compare.mjs` + `<scratchpad>/fixture-tokens.json` — cross-engine check
  (NOT committed), see Task 8.

### Relevant Documentation

- `docs/epics/prototyping-feel-uplift.architecture.md` — §New pieces (slider row: "two overlaid
  layers + clip-path divider, pointer + keyboard"), §Constraints (VR gate captures under
  NO-preference; at-rest changes regenerate baselines same PR; `body{overflow-x:clip}` kills
  sticky), §Browser-support policy (load-bearing = cross-engine only).
- ARIA slider pattern (w3.org/WAI/ARIA/apg/patterns/slider/) — `role="slider"`, `tabindex="0"`,
  `aria-valuemin/max/now`, `aria-valuetext`, arrow keys + Home/End. AT announces value changes on
  the focused slider automatically — that satisfies AC 1's "announces position to AT".

### Patterns to Follow

- **File header**: every feature module opens citing its governing doc — mirror
  `derivation-roundtrip.mjs:1–11` (`epic #164 ticket #170`, arch doc §New pieces, closes #170).
- **DOM building**: `textContent`/`setAttribute` only; hex values reach the DOM only via
  `element.style.background` / `style.setProperty` (never markup) — `derivation-roundtrip.mjs:51`.
- **Node-import-safety**: `document` references only inside function bodies; mount hosts already
  guard their self-boot with `typeof document !== "undefined"`.
- **Value never by colour alone**: each swatch cell shows the hex as `<code>` text beside it —
  `swHex()` at `derivation-roundtrip.mjs:59–63`.
- **State classes**: `is-*` modifiers (`is-over`, `is-open`) — use `is-dragging`.
- **Errors**: none needed — both mounts render from data already validated upstream; a missing
  input simply skips the slider (no error taxonomy).

---

## IMPLEMENTATION PLAN

### Phase 1: The primitive

`system/compare-slider.mjs` exporting one function:

```js
createCompareSlider({ base, overlay, baseLabel, overlayLabel, label, initial = 50 }) → root
```

- Structure: `.cmp` root (`position:relative`) containing `.cmp-layer.cmp-base` (in normal flow —
  it defines the height), `.cmp-layer.cmp-over` (absolutely positioned over it, clipped), two
  corner `.cmp-tag` labels (baseLabel on the base layer's corner, overlayLabel on the overlay's),
  and `.cmp-divider` (absolute vertical rule + `.cmp-handle`, `role="slider"`).
- Position = one custom property on the root: `--cmp-pos: 50%`. CSS does the rest:
  `.cmp-over { clip-path: inset(0 calc(100% - var(--cmp-pos)) 0 0); }`
  `.cmp-divider { left: var(--cmp-pos); }` — one write point, layers can't desync.
- Pointer: `pointerdown` on the ROOT (jump-to-point + drag from anywhere) →
  `setPointerCapture`, add `is-dragging`; `pointermove` → pct = clamp(0,100,
  (clientX − rect.left)/rect.width×100); `pointerup`/`pointercancel` → release, remove class.
  `touch-action: none` on the root (CSS).
- Keyboard on the handle: ArrowLeft/Down −5, ArrowRight/Up +5, Home 0, End 100; `preventDefault`
  on handled keys only.
- Every position write updates `--cmp-pos`, `aria-valuenow` (rounded int) and `aria-valuetext`
  (`"62% — <overlayLabel>"`). `aria-valuemin="0"` `aria-valuemax="100"` `aria-label` from `label`.
- Motion: CSS transitions `clip-path`/`left` over `var(--motion-base) var(--motion-ease-settle)`
  so keyboard steps glide (#165 vocabulary); `.cmp.is-dragging *` gets `transition: none`
  (direct manipulation must track the pointer 1:1); the whole transition sits inside
  `@media (prefers-reduced-motion: no-preference)`. No autonomous motion anywhere — at rest the
  slider is a static 50/50 split (AC 4).
- No self-boot, no top-level `document` — a pure library the two hosts import.

### Phase 2: Mount 1 — brand-import report (home)

**Depends on:** Phase 1

In `renderReport(r)` (brand-import.mjs), between the summary paragraph and the actions row:

- Build a small **specimen** twice via a private `buildSample()` helper: a mini card using only
  token-styled classes — e.g. a heading line, one body line, a primary-accent chip/button shape,
  and a 4-swatch row (bg / surface / fg / accent) with hex text. All styling in portfolio.css via
  `var(--color-*)`, `var(--radius-*)`, `var(--spacing-*)`, `var(--type-*)`, `var(--shadow-*)`.
- **Overlay layer = the reader's import**: prefix `r.mapped.values` keys with `--`, run
  `vetTokens(prefixed)` (imported from `pack-imported.mjs`, unchanged), and
  `style.setProperty(key, value)` each vetted entry **on the overlay layer element** — subtree
  scope, never `:root`, so it cannot collide with the worn-pack machinery.
- **Base layer = neutral, pinned explicitly**: for each key the overlay pinned, look up
  `r.contract.byName[key.slice(2)]` and pin `cssValue(node.$value)` on the base layer element
  (`cssValue` imported from `pack-import.mjs`). Pinning BOTH layers is what keeps the exhibit
  correct after "Wear it": with the page re-skinned to the import, an unpinned "neutral" layer
  would inherit the imported values and both sides would render identical — broken at the exact
  moment of success.
- Labels: base "this site's neutral" · overlay `r.label` (the reader's name for their design);
  slider `label`: "Compare: this site's neutral pack versus your imported pack". One plain lead-in
  line above it (dual-register, through /no-ai-slop + /humanizer).
- Conditional control (appears only after a successful import) → at-rest home page unchanged →
  **no home baseline churn** (the ticket's "home" baseline estimate was wrong; report `hidden`
  at rest).

### Phase 3: Mount 2 — round-trip exhibit (factory + /roundtrip)

**Depends on:** Phase 1 · **Independent of:** Phase 2 (parallel-safe, different files)

In `renderRoundTrip(container, model)` (derivation-roundtrip.mjs), after `root.append(metric)`:

- Build the same swatch strip twice from `[model.accent, ...model.accentFamily]` (6 cells — the
  verdict-scored set; neutrals stay in their accordion, deliberately): each cell = swatch
  (`style.background = hex`, the documented exception) + `<code>` token name + `<code>` hex text.
- Base layer paints `t.truth` hexes, overlay paints `t.proposed` — dragging right reveals what
  the agent proposed over what was true. Labels: "ground truth" / "agent proposed"; slider label:
  "Compare: the agent's proposed palette versus ground truth". One plain lead-in line.
- Renders from `model` ONLY — the committed `verdant.diff.json` — so AC 3's honesty framing is
  untouched; no new fetch, no new data file.
- Synchronous inside the existing fetch→render chain → covered by the existing
  `#roundtrip-diff[data-diff="ready"]` VR handle on both pages.

### Phase 4: CSS, manifest, regenerated artifacts

**Depends on:** Phases 2–3

- `.cmp-*` block + specimen styles in portfolio.css (token-only; wide strip content is laid out to
  fit — no sideways body scroll; `min-width: 0` on flex/grid items holding `<code>`).
- 3 manifest entries (below) → `node agent-layer/gen-param-count.mjs` (total 62 → 65).
- `git add system/compare-slider.mjs` then `node agent-layer/gen-loc-summary.mjs` (counts TRACKED
  content — run after staging, memory: loc-summary-counts-tracked-only).

### Phase 5: Validation, cross-engine, VR baselines

**Depends on:** everything above. See VALIDATION COMMANDS.

---

## STEP-BY-STEP TASKS

### CREATE system/compare-slider.mjs

- **IMPLEMENT**: Phase-1 spec exactly — `createCompareSlider({ base, overlay, baseLabel,
  overlayLabel, label, initial })` returning the root element. ~80–100 lines with comments.
- **PATTERN**: header citing epic #164 / ticket #170 + arch §New pieces; library-module shape of
  `pack-imported.mjs` (no self-boot, `document` only inside functions).
- **IMPORTS**: none.
- **GOTCHA**: clamp before write; write `aria-valuenow`/`aria-valuetext` on EVERY position change
  (pointer and keyboard); `pointermove` math from the root's `getBoundingClientRect()` taken per
  move (layout can shift); handle keys only when the handle has focus.
- **VALIDATE**: `node --check system/compare-slider.mjs && node -e "import('./system/compare-slider.mjs').then(()=>console.log('node-safe ✓'))"`
- **SATISFIES**: AC 1, AC 4 (rest = `initial` = 50).

### UPDATE system/brand-import.mjs

- **IMPLEMENT**: Phase-2 mount inside `renderReport` (insert after line 180's summary append,
  before the actions block at 183). Private `buildSample()` + `pinTokens(layerEl, entries)`
  helpers local to the module.
- **PATTERN**: `el()` builder already in the file; swatch hex via `swatchStyle`/`style.background`
  only.
- **IMPORTS**: add `vetTokens` to the existing `./pack-imported.mjs` import; add `cssValue` to the
  existing `./pack-import.mjs` import.
- **GOTCHA**: pin BOTH layers (see Phase 2 rationale); use `r.mapped.values` (full map) as
  `buildImportedRecord` does — prefix keys with `--` before vetting; do NOT store or apply
  anything to `:root`.
- **VALIDATE**: `node --check system/brand-import.mjs && node -e "import('./system/brand-import.mjs').then(()=>console.log('node-safe ✓'))"`
  then manual: `npx serve .` → home → drop the scratchpad fixture JSON → slider renders, drag +
  arrow keys work, "Wear it" re-skins the page while the slider still shows neutral-vs-import.
- **SATISFIES**: AC 1, AC 2.

### UPDATE system/derivation-roundtrip.mjs

- **IMPLEMENT**: Phase-3 mount after the metric block (line 135). Private `paletteStrip(cells,
  which)` helper building one layer.
- **PATTERN**: `el()` + `swatch()`/`swHex()` in the file; text via `textContent`.
- **IMPORTS**: add `import { createCompareSlider } from "./compare-slider.mjs";` (relative —
  Node-safe, same as the trace-player import line 13).
- **GOTCHA**: read only `model` (AC 3); keep the strip inside the exhibit's width (grid of 6
  cells that wraps — no scroll container needed at 6 cells, but `min-width:0` discipline).
- **VALIDATE**: `node --check system/derivation-roundtrip.mjs && node -e "import('./system/derivation-roundtrip.mjs').then(()=>console.log('node-safe ✓'))"`
  then manual: `npx serve .` → /roundtrip.html + /factory.html → slider at 50%, drag + keys.
- **SATISFIES**: AC 1, AC 3.

### UPDATE system/portfolio.css

- **IMPLEMENT**: one `/* ── #170 · compare slider ── */` section: `.cmp` (relative,
  `touch-action:none`, radius/border tokens), `.cmp-layer`, `.cmp-over` (absolute inset 0 +
  clip-path off `--cmp-pos`), `.cmp-divider` (absolute vertical rule, `left: var(--cmp-pos)`),
  `.cmp-handle` (the grabbable knob: ≥44px hit target via padding, visible focus ring —
  `:focus-visible` outline in accent), `.cmp-tag` corner labels, transition block inside
  `@media (prefers-reduced-motion: no-preference)` with `.cmp.is-dragging` override, plus
  `.cmp-sample` specimen + `.cmp-strip` swatch-strip styles.
- **PATTERN**: `.rt-*` section (~816) and `.brand-import-*` section (~1490) — place near them;
  every value a token `var()` or structural.
- **GOTCHA**: token-only is a hard constraint — no literal colours/px (structural 0/%/fr fine);
  the divider needs a visible affordance on both light and dark surfaces (border + shadow tokens).
- **VALIDATE**: `node tooling/token-lint.mjs 2>/dev/null || grep -nE "#[0-9a-fA-F]{3,8}|[0-9]+px" <the new block>` — eyeball that any hits are token definitions, not literals; then visual pass in the browser.
- **SATISFIES**: AC 1 (focus ring), AC 4.

### UPDATE system/param-manifest.json (+ regen param-count)

- **IMPLEMENT**: three entries:
  - `{ "page": "/", "selector": "[data-import-report] .cmp-handle", "label": "pack compare slider divider", "note": "conditional — after a successful import" }`
  - `{ "page": "/factory", "selector": "#roundtrip-diff .cmp-handle", "label": "proposed-vs-truth compare slider" }`
  - `{ "page": "/roundtrip", "selector": "#roundtrip-diff .cmp-handle", "label": "proposed-vs-truth compare slider" }`
- **PATTERN**: existing per-page granularity (the exhibit lives on two pages → two entries, same
  as the two trace players).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check` → "65 controls — no drift".
- **SATISFIES**: ticket's manifest requirement; CLAUDE.md "new live control ⇒ manifest same PR".

### UPDATE system/loc-summary.json (regen)

- **IMPLEMENT**: `git add system/compare-slider.mjs` (and the edited files), then
  `node agent-layer/gen-loc-summary.mjs`.
- **GOTCHA**: it reads git-TRACKED content — regenerating before staging silently undercounts
  (memory: loc-summary-counts-tracked-only).
- **VALIDATE**: `node tooling/drift-check.mjs` (or the generator's own `--check` if present) exits clean.
- **SATISFIES**: CI `verify` drift gates.

### CREATE scratchpad cross-engine check (NOT committed)

- **IMPLEMENT**: `<scratchpad>/check-compare.mjs` mirroring #165's Task-8 pattern: resolve
  Playwright from `tooling/visual-regression/node_modules`, serve repo root (`npx serve .` or
  `python3 -m http.server`), then per engine (chromium, firefox, webkit):
  1. `/roundtrip.html` → wait `#roundtrip-diff[data-diff="ready"]` → handle exists,
     `aria-valuenow === "50"`; focus handle, press ArrowRight → valuenow 55; `Home` → 0; `End` → 100.
  2. pointer-drag: `mouse.down` on the handle, move to 25% of the root's width, assert valuenow
     ≈ 25 and the overlay's computed `clip-path` changed.
  3. `/index.html` → `setInputFiles('[data-import-file]', fixture-tokens.json)` → wait
     `[data-import-report]:not([hidden]) .cmp-handle` → repeat the keyboard assertion.
  Fixture: `<scratchpad>/fixture-tokens.json` — a minimal nested name→value map with an accent
  ramp + neutrals so `mapPack` succeeds without an accent-candidate refusal (a small DTCG export
  with e.g. `color.blue.500…900` + `color.gray.100…900`; verify it maps in the browser first).
- **GOTCHA**: webkit IS the Safari check (memory: cross-engine-motion-verify); expected console
  noise on factory from the absent Worker is fixture degradation, not failure (memory:
  headless-render-data-pages).
- **VALIDATE**: `node <scratchpad>/check-compare.mjs` → all three engines pass.
- **SATISFIES**: AC 5, AC 1.

### Regenerate VR baselines (factory ×2, roundtrip ×2, approach ×2)

- **IMPLEMENT**: commit everything first, then from a CLEAN detached worktree under `/Users` (not
  /private/tmp — Docker file sharing): `cd tooling/visual-regression && npm run update:docker`.
  `rm` the six PNGs first (`factory-*.png roundtrip-*.png approach-*.png`) so sub-perceptual and
  tolerance-swallowed digit changes (62→65 on approach) can't survive a "green" update run
  (memories: vr-update-skips-subperceptual, vr-tolerance-hides-text-changes).
- **GOTCHA**: home baselines must NOT churn (mount conditional, at rest hidden) — if `index-*.png`
  changes, something rendered at rest that shouldn't; investigate, don't commit it. The approach
  "two consecutive stable screenshots" failure in CI is a known countUp flake, check
  `gh pr checks` before diagnosing (memory: vr-gate-approach-countup-flake).
- **VALIDATE**: the update run's diff report lists exactly the six expected files; `git status`
  shows only them changed under `tooling/visual-regression/baselines/`.
- **SATISFIES**: AC 4.

### Commit + PR

- **IMPLEMENT**: branch `feature/compare-slider-170` off up-to-date `main` (the session may start
  on a stale merged branch — verify with `git branch --show-current` before committing; memory:
  shared-worktree-parallel-sessions). Atomic commit(s), message
  `feat(compare): before/after slider — brand-import + round-trip (#170)`. PR body carries
  **`Closes #170`** (a title "(#170)" closes nothing — memory: prs-dont-auto-close-tickets).
  Plan + report + review artifacts committed in the same PR.
- **VALIDATE**: `gh pr view --json body | grep "Closes #170"`.

---

## TESTING STRATEGY

No suite/linter in this repo (CLAUDE.md) — "done" = run the surface you touched.

### Unit-level
`node --check` + Node-import smoke on each touched `.mjs` (the repo's Node-import-safety
invariant — drift-check and generators import shipped modules under Node).

### Integration
- Manual: `npx serve .` — home drop-flow (fixture JSON → report → slider → Wear it → slider still
  contrasts), /factory + /roundtrip at rest and after interaction, under neutral AND after
  switching the dock to saulera (slider layers must stay pinned/derived, not inherit the pack
  where pinned).
- Cross-engine: the scratchpad Playwright script over chromium + firefox + webkit (AC 5).
- VR: the update:docker run doubles as the at-rest regression check.

### Edge Cases
- Import where `vetTokens` rejects some values → overlay pins only the vetted subset (rejected
  values already reported by the beat; the slider must not apply them).
- Import with zero colour families (spacing-only export) → slider still renders (layers differ in
  spacing/radius); acceptable — the specimen shows more than colour.
- Keyboard at the clamps: Home/End then arrows past 0/100 stay clamped, valuenow never NaN.
- Drag released outside the viewport → `pointercancel`/capture release leaves no stuck
  `is-dragging`.
- Reduced-motion (emulate in DevTools): keyboard steps jump instantly, everything still works.
- `prepareDiff` already validates the round-trip model — no new boundary checks needed.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Node-safety
```
node --check system/compare-slider.mjs system/brand-import.mjs system/derivation-roundtrip.mjs
node -e "Promise.all(['./system/compare-slider.mjs','./system/brand-import.mjs','./system/derivation-roundtrip.mjs'].map(p=>import(p))).then(()=>console.log('node-safe ✓'))"
```

### Level 2: Generators + drift
```
node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check
git add -A && node agent-layer/gen-loc-summary.mjs && node tooling/drift-check.mjs
```

### Level 3: Cross-engine functional
```
node <scratchpad>/check-compare.mjs   # chromium + firefox + webkit, both mounts
```

### Level 4: Manual
`npx serve .` → the integration walk above, plus a real-browser eyeball of the new layout at
360px width (memory: vr-gate-single-engine-blindspot — the gate's Chromium misses real-browser
grid blowouts).

### Level 5: VR
```
cd <clean worktree>/tooling/visual-regression
rm baselines/{factory,roundtrip,approach}-{neutral,saulera}.png
npm run update:docker   # then verify ONLY those six changed
```

---

## ACCEPTANCE CRITERIA (from #170)

- [ ] AC 1 — divider drags smoothly (pointer) and steps (keyboard); position announced to AT
      (`role="slider"` + `aria-valuenow`/`aria-valuetext`).
- [ ] AC 2 — brand-import mount shows a real imported pack vs neutral; only `vetTokens`-passed
      values applied; `pack-imported.mjs` unchanged.
- [ ] AC 3 — round-trip mount renders from the committed diff only; honesty framing untouched.
- [ ] AC 4 — at-rest divider at 50% is deterministic; the six affected baselines regenerated in
      the same PR; home baselines untouched.
- [ ] AC 5 — chromium + firefox + webkit all pass the scratchpad check.
- [ ] Manifest entries + regenerated `param-count.json` (65) + `loc-summary.json` in the PR.
- [ ] PR body carries `Closes #170`; plan/report/review artifacts committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's validation passed when executed
- [ ] All five validation levels green
- [ ] No regressions: home at rest byte-identical (VR), existing report/exhibit content unmoved
- [ ] New copy lines passed /no-ai-slop + /humanizer (epic copy rule)
- [ ] Slider CSS is token-only (review the block once, deliberately)

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Round-trip strip = accent + accentFamily (6 cells), not neutrals.** The verdict-scored set;
   neutrals stay in their "excluded from the verdict" accordion. Including them would double the
   strip and blur the exhibit's own excluded-from-verdict framing. Flagged, not asked — change is
   cheap if the owner wants neutrals in.
2. **Ticket's baseline estimate corrected**: home does NOT churn (mount is conditional, report
   `hidden` at rest); `/roundtrip` and `/approach` DO (exhibit on two pages; param-count 62→65
   renders on approach). Six baselines, not the ticket's "home + factory".
3. **Both layers pinned on the home mount** (neutral from `contract.byName` via `cssValue`,
   import from `vetTokens` output) rather than letting the base layer inherit the page's pack —
   otherwise "Wear it" makes both layers identical. This reads as the ticket's intent ("neutral
   pack vs the reader's imported pack"), not a divergence.
4. **Manifest granularity**: the round-trip slider gets one entry per page (2), matching how the
   two trace players are listed. The home slider is a third, conditional-noted entry.
5. Assumes `--motion-ease-settle`/`--motion-base` exist on main (verified: tokens.contract.css
   lines 76/86).

## NOTES (open canvas)

- **Why one custom property (`--cmp-pos`) is the whole state**: clip-path and divider position
  derive from the same value in CSS, so they cannot desync during drag, and the keyboard-step
  transition applies to both uniformly. It also gives a later `@property` registration a single
  seam if smoother interpolation is ever wanted (arch doc mentions `@property` for scrub values —
  not needed here, transitions on `clip-path`/`left` interpolate fine cross-engine).
- **Rejected: `<input type="range">` as the control.** It gives free keyboard/ARIA but its thumb
  can't be the visible divider without heavy appearance surgery per engine, and pointer-dragging
  the *image* (not just the thumb) is the expected affordance in every reference tool. The ARIA
  slider pattern on a styled handle is ~25 lines and matches the arch doc's "~40 lines" estimate.
- **Rejected: mounting the home slider only after "Wear it".** The report IS the moment of
  interest; the slider is the report's proof. Conditional-on-import is enough gating.
- **VR safety chain, spelled out once**: slider renders synchronously inside `renderRoundTrip`,
  which runs inside the fetch chain that sets `data-diff="ready"` — the gate cannot capture a
  half-rendered slider. At rest nothing animates (transitions only fire on interaction), so
  rest == final holds without touching the capture flow.
- **Worker refusal noise** on factory in headless checks is expected fixture degradation, not a
  failure signal.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
