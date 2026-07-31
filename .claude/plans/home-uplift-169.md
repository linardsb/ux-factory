# Feature: Wave 1 — Home: inspect mount + scrubbable live values + dual-register copy cut (#169)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and
modules — import from the right files.

## Feature Description

The recruiter gate (index.html) becomes the tool's first demonstration. Three strands, one page:

1. **Inspect mount** — extend #166's engine coverage from its single proving mount
   (`data-inspect="buttons"` on one sample button) to home's major components: page hero, the
   three sample cards, the hero CTA buttons, and the injected header/footer chrome. Each gets a
   real 4-layer bubble (role · spec line · live token values · measurements).
2. **Scrubbable live values** — a new `system/scrub.mjs` (pointer-delta drag + keyboard,
   `@property`-typed custom properties) renders a three-parameter scrub row under the intake
   stage's `#reskin-preview`: brand **hue** (re-runs the real `derive()` engine per change),
   **corner radius**, and **spacing** — the reader drags numbers and watches the generated
   system respond. This resolves the PRD open question "which home elements carry scrubbable
   values": intake-stage-adjacent, not the (transient) hero moment.
3. **Dual-register copy cut** — every home section's first layer opens with 1–2 plain sentences;
   precise terms (token contract, handoff pack, contrast engine, design tokens) are kept
   immediately alongside, never leading. Every rewritten line passes `/no-ai-slop` + `/humanizer`
   before commit.

Plus: spring easing (`--motion-ease-spring`, from #165) swept across home's remaining beat
transitions and the inspect bubble's entrance; `param-manifest.json` updated for every new
control; the full regen cascade (inspect-data · param-count · loc-summary · 4 VR baselines).

## User Story

As a hiring manager doing a 90-second first pass
I want to directly manipulate the portfolio's home page — inspect any component, drag its values, read plain English first
So that I experience a working prototyping tool instead of being asked to trust a brochure.

## Problem Statement

Home describes a live system but offers few direct manipulations beyond the wizard and drop
zone; inspect mode exists but covers one button; several sections lead with specialist terms
("token contract", "component specs, data contracts, tokens, and the agent vocabulary").

## Solution Statement

Mount the already-shipped inspect engine across home's components.css-backed surfaces (the only
ones with measured token data — honesty contract), add a hand-written ~100-line scrub primitive
driving the real derivation engine, and cut copy to dual-register. All three land as additive,
rest==final changes so the VR story is a clean 4-baseline regen.

## Out of Scope / Non-Goals

- Not included: inspect mounts on any other page (defer to #171, #173–#175); the ⌘K palette
  (#168); the before/after compare slider (#170 — independent, may run in parallel).
- Not included: scrub upgrade of approach's derive probe (#174 owns that; `scrub.mjs` is written
  so #174 can import it, but no approach.html change here).
- Not included: extending `glossary.mjs` to home. The architecture §Copy note about glossary
  coverage is satisfied on home by inline plain-English glosses instead — glossary stays
  approach-scoped; mounting it on a second page is its own decision, not smuggled in here.
- Not changing: inspect mounts on portfolio.css-only surfaces (peak tiles, row-list, close-card).
  `inspect-data.json` ids must resolve to system-graph consumers (components.css blocks) — a
  bubble on a bespoke surface would have no measured token layer, which the honesty contract
  forbids faking.
- Not changing: `system/inspect.mjs` engine logic (except zero lines — the bubble entrance is
  pure CSS in portfolio.css); the wizard (`factory-intake.mjs`); `spine.mjs`.
- No new analytics routes: `/tool/inspect` already fires from `inspect.mjs`; scrub gets no route
  (the epic's milestone list names palette + inspect only).

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium-High (~900 lines incl. copy + manifest + baselines)
**Primary Systems Affected**: index.html, system/scrub.mjs (new), system/site.js,
agent-layer/gen-inspect-data.mjs, system/portfolio.css, system/param-manifest.json, VR baselines
**Dependencies**: none external. #165 (springs) and #166 (inspect) are MERGED on main
(PRs #179, #180) — branch from current origin/main.

## Related Work

**Implements**: linardsb/ux-factory#169 · **Epic**: #164 —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§New pieces "Scrub values",
§Copy, §Constraints)

**Back-references**:
- `.claude/plans/inspect-engine-166.md` — the engine this ticket mounts; per its Out-of-Scope,
  wave tickets "instrument their own surfaces and add role lines as needed"; it also deferred
  the bubble's `@starting-style` entrance to "a later ticket" (line ~609) — folded in here.
- `.claude/plans/spring-motion-foundation-165.md` — `--motion-ease-spring` token + where springs
  already landed on home (hero-rise, card-rise, fw-step-in, dock).

**Forward-references**: #174 (derive-probe scrub reuses `scrub.mjs`), #177 (copy audit re-checks
this page).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `index.html` (whole file, 421 lines) — the page being changed. Note the script-order warning
  at lines 416–418: NOTHING moves above `dock.mjs`; add the new scrub tag after `peak.mjs`,
  before `close.mjs`. The one existing mount: line 123 (`data-inspect="buttons"`), toggle at 131.
- `system/inspect.mjs` (lines 179–198 `wireTriggers`, 108–133 `renderContent`) — how triggers
  and the 4 layers work; an unknown `data-inspect` id aborts the whole activation, so every id
  added must exist in `inspect-data.json` FIRST.
- `agent-layer/gen-inspect-data.mjs` (lines 24–60 `ROLES`) — where new role lines go. Keys are
  system-graph consumer ids; a key naming no consumer throws. Valid unused ids for home:
  `page-hero`, `header`, `footer` (confirmed present in `system/system-graph.json` consumers).
- `system/derive-probe.mjs` (whole, 85 lines) — the pattern `scrub.mjs` mirrors: `el()` DOM
  builder, textContent-only, no injected `<style>`, portfolio.css owns classes, `{ destroy }`.
- `system/factory-intake.mjs` (lines 237, 282–292) — the preview re-skin seam:
  `previewRoot.style.setProperty("--" + k, v)` on `#reskin-preview`; `data-reskin="ready"` is a
  VR handle — do not disturb it. The scrub row writes the SAME props on the SAME root
  (last-writer-wins with the wizard; see NOTES).
- `system/oklch.mjs` (exports `hexToOklch`, `oklchToHex`, `toGamut`) — hue scrub converts the
  demo brand `#2f7a4d` → oklch, replaces `h`, gamut-clamps, back to hex, feeds `derive()`.
- `system/derive.mjs` — `derive({brandColor, density, rewardType, frequency})` → `{tokens}`
  incl. all `color-*` (see `system/spine.mjs` lines 118–145 for the color-only filter idiom
  `k.startsWith("color-")`).
- `system/intake-beat.mjs` (whole, 51 lines) — `getHomeAnswers()` export: the scrub's derive
  call uses the wizard's live axes when present, falling back to the canned defaults
  (`{ density:"comfortable", rewardType:"self", frequency:"daily" }`).
- `system/site.js` (lines 31–66) — header/footer chrome templates; add `data-inspect="header"` /
  `data-inspect="footer"` attributes here (inert on pages without inspect.mjs).
- `system/portfolio.css` (lines 755–804 inspect styles; 973–1080 `@starting-style` precedent
  with its engine-fallback comment) — where scrub-row styles and the bubble entrance go.
- `system/param-manifest.json` — entry shape + `$description` counting rules. NOTE the gap:
  #166's inspect toggle is a qualifying control but was never added (it merged after #167).
  This ticket adds it.
- `tooling/drift-check.mjs` (lines 96–115) — the inspect-mounts gate: every `data-inspect` in
  tracked HTML must resolve in `inspect-data.json`. JS-injected mounts (site.js) are NOT
  statically scanned — they are runtime-validated only, which is why their ids must be added to
  ROLES in the same commit as the site.js change.
- `tooling/visual-regression/visual.spec.mjs` (line 31) — index's capture spec already carries
  `waitReady: '#beat-hero[data-spine="ready"]'` (set AFTER the hero re-skin reverts) +
  `waitVisible: '#beat-peak[data-peak="ready"]'`. No spec change needed; the hero-reskin
  screenshot trap is structurally handled in the gate (the ~3s wait applies only to MANUAL
  screenshots you take in a real browser).
- `system/tokens.contract.css` — token names the scrub writes: `--radius-sm/md/lg`,
  `--spacing-sm/md/lg` (derive() emits these same keys); `--motion-ease-spring` at line 82.

### New Files to Create

- `system/scrub.mjs` — the scrub primitive + home's stage-scrub mount (one concern: "drag a
  number"; the mount self-initializes only when `[data-stage-scrub]` exists — derive-probe /
  inspect.mjs posture, Node-import safe).

### Relevant Documentation

- `docs/epics/prototyping-feel-uplift.architecture.md` §New pieces ("Scrub values" row), §Copy,
  §Constraints — inherited decisions; do not re-litigate.
- MDN `@property` (https://developer.mozilla.org/en-US/docs/Web/CSS/@property) — registration
  syntax; cross-engine since Firefox 128 (2024). Unregistered fallback = value snaps instead of
  interpolating, which is acceptable (pointer-move updates are already per-frame).
- WAI-ARIA slider pattern (https://www.w3.org/WAI/ARIA/apg/patterns/slider/) — the scrub
  handle's keyboard contract: `role="slider"`, `tabindex="0"`, `aria-valuemin/max/now`,
  `aria-label`, Arrow ±step, Home/End min/max.

### Patterns to Follow

**DOM building** (derive-probe.mjs:21–31, inspect.mjs:42–52): the `el(tag, attrs, ...children)`
helper, text via `textContent`, never innerHTML.

**Module header** (every system/*.mjs): open with `// system/scrub.mjs — hand-written canon
(this repo; not generated).` + governing doc cite `(epic #164 ticket #169 —
docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Scrub values")`.

**Reduced-motion read live** (spine.mjs:24–26): `matchMedia` at use time, Node-safe.

**Rest == final** (index.html comment block 22–50): static markup is the VR baseline; JS
animates TO it, never past it. The scrub row is JS-rendered into a static container (brand-import
fail-closed posture: with JS off, no dead controls appear).

**No entrance animations on continuously-rebuilt elements** (memory): scrub updates mutate
`textContent`/style props in place — never rebuild the row per tick.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 2 (scrub), Phase 3 (inspect), and Phase 4 (copy + springs) are
**mutually independent** — they touch disjoint concerns and could be reordered — but run them
sequentially in one branch: they all edit index.html/portfolio.css and share the single regen +
baseline pass in Phase 5.

### Phase 1: Branch + foundation

- Branch `feature/home-uplift-169` from up-to-date origin/main.
- Confirm the merged foundations behave: `npx serve .` → home renders, inspect toggle works on
  the one existing mount, hero re-skin plays and reverts.

### Phase 2: Scrub primitive + stage mount

- `system/scrub.mjs`: exported `makeScrubbable()` + the home stage-scrub mount (hue / radius /
  spacing) writing to `#reskin-preview`.
- `@property` registrations + scrub-row styles in portfolio.css.
- Static container in index.html + script tag.

### Phase 3: Inspect mount across home

- Role lines for `page-hero`, `header`, `footer` in gen-inspect-data ROLES → regen.
- `data-inspect` attributes: index.html statics + site.js chrome.

### Phase 4: Copy cut + spring sweep

- Dual-register rewrite of the flagged lines; `/no-ai-slop` + `/humanizer` over every rewritten
  line.
- Spring audit on home-scoped transitions + the inspect bubble `@starting-style` entrance.

### Phase 5: Manifest + regen cascade + VR

- param-manifest entries (3 scrub + 1 inspect toggle) → gen-param-count → gen-loc-summary →
  gen-inspect-data (already done in P3; re-run `--check`) → VR baselines: index ×2 AND approach
  ×2 (approach renders the param-count total and the loc runtime group — both change).

---

## STEP-BY-STEP TASKS

### CREATE system/scrub.mjs

- **IMPLEMENT**: two parts, one file.
  **(a) `export function makeScrubbable(handle, { min, max, step, read, unit, label, format, onChange })`**
  (~45 lines): wires one element as a draggable/keyboard-adjustable number.
  - **Stale-state defense (wizard × scrub risk):** the handle holds NO cached value. Every
    interaction START (`pointerdown`, and each `keydown` step) calls `read()` — the caller's
    "current computed value" getter — and works from that base. A wizard re-run that overwrote
    the preview's props can therefore never leave the handle fighting or displaying stale
    state: the next drag/arrow picks up from what's actually on screen. `focusin` also calls
    `read()` to refresh `aria-valuenow`/textContent before a keyboard user acts.
  - Pointer: `pointerdown` → `setPointerCapture`, base = `read()`, record x; `pointermove` →
    value = clamp(base + dx * step-per-px), rAF-throttled `onChange`; `pointerup/cancel` →
    release. `touch-action: none` comes from CSS. Cursor `ew-resize` via class.
  - Keyboard: ArrowLeft/Right/Up/Down ±step (`preventDefault`), Home/End → min/max.
  - A11y: `role="slider"`, `tabindex="0"`, `aria-label`, `aria-valuemin/max/now` (+
    `aria-valuetext` when `unit` given) updated on every change.
  - Renders the value into the handle via `textContent` (`format(value)` — e.g. `212°`,
    `8px`). Returns `{ destroy, set }`.
  **(b) home mount** (~55 lines): if `document` exists and `[data-stage-scrub]` exists, render
  the row (derive-probe `el()` builder): caption line + three scrub fields:
  1. **Brand hue** (0–360, step 2, `read()` = `hexToOklch(computed --color-accent on the
     preview, else "#2f7a4d").h` rounded — so it tracks whatever the wizard last derived): on change,
     rotate hue in oklch (`toGamut` then `oklchToHex`), call
     `derive({ ...(getHomeAnswers() ?? DEFAULT_AXES), brandColor: hex })`, and set the result's
     `color-*` entries on `#reskin-preview` via `setProperty("--"+k, v)` — the exact
     factory-intake.mjs:282 idiom, color-only filter from spine.mjs:118. The REAL engine runs
     per change (honesty contract: this is a live derivation, and the caption says so).
  2. **Corner radius** (0–24px, step 1, `read()` = parsed
     `getComputedStyle(preview).getPropertyValue("--radius-md")`): sets `--radius-md` and
     `--radius-lg` (`round(v*1.5)`) on `#reskin-preview`.
  3. **Spacing** (2–32px, step 1, `read()` from `--spacing-md`): sets `--spacing-sm` (`v/2`),
     `--spacing-md` (`v`), `--spacing-lg` (`v*1.5`) on `#reskin-preview`.
  Header comment: hand-written-canon + ticket cite + the LAST-WRITER-WINS note (the wizard's
  next run overwrites scrubbed values; that is the documented, honest interplay — both write
  the same seam). Node-import-safe: no top-level DOM access outside the guarded init.
- **PATTERN**: derive-probe.mjs (builder, destroy, no-style-injection); spine.mjs:118
  (color filter); intake-beat.mjs:34 (`getHomeAnswers`).
- **IMPORTS**: `derive` from `./derive.mjs`; `hexToOklch, oklchToHex, toGamut` from
  `./oklch.mjs`; `getHomeAnswers` from `./intake-beat.mjs`.
- **GOTCHA**: never rebuild DOM per tick (entrance-anim memory); rAF-throttle the derive call
  (pointermove can outpace frames); `disabled`/inert nothing — the row simply doesn't render
  without JS. Do NOT touch `data-reskin` (VR handle).
- **VALIDATE**: `node -e "import('./system/scrub.mjs').then(()=>console.log('node-safe ✓'))"`
- **SATISFIES**: AC #2, AC #5

### UPDATE index.html — scrub container + script tag

- **IMPLEMENT**: inside `.intake-stage`, after the `.inspect-toggle-row` `<p>` (line 131), add
  `<div class="stage-scrub" data-stage-scrub></div>` with a brief comment (JS-rendered,
  fail-closed empty without JS — brand-import posture). Add
  `<script type="module" src="/system/scrub.mjs"></script>` after `peak.mjs` (line 415), before
  `close.mjs` — respecting the lines 416–418 ordering warning.
- **PATTERN**: brand-import block comment style (index.html:180–185).
- **VALIDATE**: `npx serve .` → row renders under the preview; drag hue → cards re-skin live;
  drag radius/spacing → preview reflows; wizard re-run overwrites (expected).
- **SATISFIES**: AC #2

### UPDATE system/portfolio.css — scrub styles + @property + bubble entrance + spring sweep

- **IMPLEMENT**:
  1. `.stage-scrub` block near the intake styles: row layout, `.stage-scrub-handle` with
     `cursor: ew-resize; touch-action: none; font-family: var(--font-mono)`, visible focus ring
     (`outline` on `:focus-visible`), token-only colors.
  2. `@property` registrations for `--radius-md`, `--radius-lg`, `--spacing-sm`, `--spacing-md`,
     `--spacing-lg` (`syntax: "<length>"`, `inherits: true`, `initial-value` = the neutral pack's
     values) + on `#reskin-preview` a transition on those props
     (`var(--motion-base) var(--motion-ease-spring)`) gated inside
     `@media (prefers-reduced-motion: no-preference)` — keyboard steps glide, reduced motion
     snaps. Comment the engine fallback (no `@property` → snap, still functional), mirroring the
     973–974 comment posture.
  3. Inspect-bubble entrance (deferred from #166, plan line ~609): `@starting-style` opacity/
     translate on `.inspect-bubble:popover-open` with `--motion-ease-spring`, inside the same
     no-preference gate. VR-safe: the bubble is never open at rest.
  4. Spring sweep: for home-scoped transform/entrance transitions still on `--motion-ease`
     (grep `portfolio.css` for home selectors: `.row-item`, `.brand-*`, `.peak-*`,
     `.close-*`, `.stage-*`), move EMPHASIS motion (transform, entrances) to
     `--motion-ease-spring`; leave color/border fades on `--motion-ease`. If the #165 sweep
     already covered them all, record that as the audit's outcome in the report — a no-op
     verification is a valid result.
- **PATTERN**: portfolio.css 973–1080 (@starting-style + fallback comments); 1323 (spring on
  fw-card) ; components.css 534 (spring on transform, ease on color).
- **GOTCHA**: `@property` `initial-value` must be a computationally valid `<length>` (no `var()`).
  Registration is global — but ONLY these length tokens, never `color-*` (packs and derived packs
  set colors in formats a registered syntax could reject).
  **PRE-FLIGHT (do before writing the registrations):** a registered `syntax: "<length>"`
  property REJECTS any non-`<length>` value and falls back to `initial-value` — so grep every
  value the five tokens carry across ALL committed packs and the contract fallbacks:
  `grep -hE '--(radius-(md|lg)|spacing-(sm|md|lg)):' system/tokens.contract.css system/tokens.neutral.css system/tokens.saulera.css system/tokens.verdant.css system/tokens.css`
  — every value must parse as `<length>` (px/rem/em/calc of lengths). Any token whose value
  anywhere is NOT a plain length (e.g. a bare `0`, a `%`, a keyword) either gets its
  `syntax` widened (`"<length-percentage>"`) or is dropped from registration. Also check
  `system/pack-derived.mjs` + `derive.mjs` output formats for the same five keys (derived packs
  set them at runtime).
- **VALIDATE**: `node tooling/build-checks.mjs` still green (CSS not imported there, but run it);
  the pre-flight grep output pasted into the implementation report; visual check in Chrome +
  Firefox + Safari under NEUTRAL AND SAULERA packs: keyboard-arrow a scrub handle → value
  glides; toggle OS reduced motion → snaps; page renders identically before/after toggling the
  registrations block (comment it out and diff by eye — the cheap local proxy for the VR proof
  in the baseline task).
- **SATISFIES**: AC #2, AC #5, scope item "spring easing applied"

### UPDATE agent-layer/gen-inspect-data.mjs — three role lines, then regen

- **IMPLEMENT**: add to `ROLES` (keys are system-graph consumer ids — `page-hero`, `header`,
  `footer` all confirmed in `system-graph.json` consumers):
  - `page-hero`: what the hero band is, plainly (the site's cover: one claim + two actions;
    every colour and size resolves through the token contract).
  - `header`: the injected site chrome — one config, injected on every page, restyled by
    whichever pack is worn.
  - `footer`: same posture as header (the site index + contact line).
  Write them as COPY, not claims (gen-inspect-data.mjs header rule) — describe what it is,
  assert no measurement. Then regen: `node agent-layer/gen-inspect-data.mjs`.
- **PATTERN**: existing ROLES entries (gen-inspect-data.mjs:26–40) — two sentences, concrete,
  plain.
- **GOTCHA**: run the generator BEFORE adding any `data-inspect` markup so the drift gate and
  runtime validation never see an unknown id, even mid-branch. (The json and the markup may
  land in the same COMMIT — the gate sees them together; the ordering constraint is on the
  working sequence, so a serve-and-hover test between tasks never hits inspect.mjs's
  unknown-id abort.)
- **VALIDATE**: `node agent-layer/gen-inspect-data.mjs --check` → no drift;
  `node tooling/drift-check.mjs` → green — **run this same pair again immediately after EACH of
  the two mount tasks below**; the gate is the sequencing guard, per-task, not just at the end.
- **SATISFIES**: AC #1

### UPDATE index.html — static inspect mounts

- **IMPLEMENT**: add `data-inspect` to:
  - `<section class="page-hero" id="beat-hero">` → `data-inspect="page-hero"`
  - the three sample `<article class="card">` elements (lines 111, 116, 121) → `data-inspect="cards"`
  - hero CTA pair (lines 67–68) + the sample Secondary (line 124) → `data-inspect="buttons"`
- **GOTCHA**: mount ids only on elements actually styled by that consumer's components.css block
  (honesty: the bubble's token list must be the element's real diet). Do NOT mount on peak
  tiles / row-list / close-card (portfolio.css surfaces — no graph consumer).
- **VALIDATE**: `node tooling/drift-check.mjs` (inspect-mounts gate resolves every id);
  `npx serve .` → toggle inspect on → hover hero, a card, a CTA: 4 layers render, values match
  the worn pack; switch pack in the dock → reopen bubble → values follow.
- **SATISFIES**: AC #1

### UPDATE system/site.js — chrome inspect mounts

- **IMPLEMENT**: add `data-inspect="header"` to the injected `<header class="site-header">`
  element and `data-inspect="footer"` to the injected footer root.
- **GOTCHA**: this attribute rides on ALL pages' chrome but is inert wherever inspect.mjs isn't
  loaded, and invisible at rest everywhere (the affordance outline is gated on
  `:root[data-inspect-mode="on"]`) — zero VR churn on the other 14 chrome-bearing baselines.
  JS-injected mounts bypass the static drift gate, so the ids MUST already exist in
  inspect-data.json (previous task ordering).
- **VALIDATE**: `npx serve .` → inspect on → hover header nav / footer: bubble opens with real
  values. Load /approach (carries inspect.mjs? it does NOT — confirm no console errors on pages
  without the engine).
- **SATISFIES**: AC #1

### UPDATE index.html — dual-register copy cut

- **IMPLEMENT**: rewrite ONLY lines whose first layer leads with a specialist term; keep the
  precise term alongside (bold or parenthetical). Flagged targets from the audit:
  - `#beat-wear` lead (lines 211–216): "…another test of the same **token contract**" — open
    plain (every page reads its colours and sizes from one named list), keep "token contract"
    named after the plain sentence.
  - `#beat-peak` `.peak-note` (268–273): "committed example screen", "contrast engine",
    "build-time agent composes" — plain first (a real example screen, rebuilt in your brand;
    the same code that checks colour contrast runs live), terms kept.
  - `#beat-close` takeaway (310–314): "component specs, data contracts, tokens, and the agent
    vocabulary" — open with what it IS (everything an engineer needs to build the product:
    specs, working parts lists), keep the four precise nouns as the second sentence.
  - `/build` tier (324–329): "design tokens" → plain gloss first ("the colour-and-size values
    your design already uses — its design tokens").
  - Hero, beat-intake, beat-brand, verify: already open plain — verify, don't churn.
  Run `/no-ai-slop` and `/humanizer` over every rewritten line before committing (AC #3 names
  both).
- **GOTCHA**: copy changes churn the index baselines — already regenerating (AC #4). Do NOT
  reword `#fw-scenario-notice` ids/hooks or any `data-*`/class the modules or VR spec reference.
- **VALIDATE**: read every section's first two sentences aloud — no unexplained specialist term
  opens any section; skills pass.
- **SATISFIES**: AC #3

### UPDATE system/param-manifest.json + regen counts

- **IMPLEMENT**: four new `"/"` entries (shape mirrors existing lines):
  - `{ "page": "/", "selector": ".stage-scrub [data-scrub=\"hue\"]", "label": "stage scrub: brand hue (drag/arrow)" }`
  - same for `radius` and `spacing` handles
  - `{ "page": "/", "selector": "[data-inspect-toggle]", "label": "inspect-mode toggle", "note": "added by #166, counted here" }`
  (match the selectors scrub.mjs actually renders — add `data-scrub="hue|radius|spacing"` attrs
  in the mount for stable selectors). Then:
  `node agent-layer/gen-param-count.mjs` and `node agent-layer/gen-loc-summary.mjs` (new tracked
  file system/scrub.mjs + edits — run AFTER `git add` of the new file; loc counts tracked
  content, memory: `--check` before staging is a false no-drift).
- **GOTCHA**: approach.html renders the param-count total AND the loc runtime group → approach
  baselines ×2 churn and MUST regen in this PR (loc-summary-baseline-cascade +
  #167 precedent commit b29885f).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check && node agent-layer/gen-loc-summary.mjs --check && node tooling/drift-check.mjs`
- **SATISFIES**: AC #2 (manifest-counted), CLAUDE.md manifest convention

### UPDATE VR baselines (index ×2, approach ×2)

- **IMPLEMENT**: from a CLEAN detached worktree under /Users (not /private/tmp — Docker file
  sharing). **First** `rm` the four expected baselines (`index-neutral.png`, `index-saulera.png`,
  `approach-neutral.png`, `approach-saulera.png`) so sub-perceptual diffs (the changed
  param-count digits — memory: VR tolerance hides text changes) are forced to rewrite rather
  than silently skipped. Then `cd tooling/visual-regression && npm run update:docker`.
  **Two-stage @property proof:** run the update at a commit WITHOUT the `@property`
  registrations block first → confirm exactly the 4 deleted PNGs regenerate and nothing else
  churns → add the registrations commit → re-run `npx playwright test` (NOT update) against the
  fresh baselines → a green run is the machine proof registrations are render-invisible on all
  20 shots. If any test fails at stage two, drop the registrations (scrub degrades to
  snap-instead-of-glide, everything else stands) — pre-authorized, no re-plan needed.
- **GOTCHA**: the gate reads the working tree (memory) — commit everything first, then run in
  the detached worktree at that commit. Eyeball the new approach PNGs for the new param total
  (a green run alone doesn't prove the digits landed — hence the `rm` above). The approach
  countUp flake memory applies to CI runs, not update runs.
- **VALIDATE**: `npx playwright test` (in the same Docker image) green against the new
  baselines; `git status` shows exactly 4 PNGs changed.
- **SATISFIES**: AC #4

---

## TESTING STRATEGY

No suite exists (CLAUDE.md) — "done" = run the surface touched, plus the repo's generators/gates.

### Gates (CI-mirroring)

- `node tooling/drift-check.mjs` — inspect-data, inspect-mounts, param-count, loc-summary all green.
- `node tooling/build-checks.mjs` — unrelated groups stay green (proves no accidental import damage).
- VR: 4 regenerated baselines + a green `playwright test` run.

### Cross-engine functional (memory: cross-engine-motion-verify)

Playwright resolved from `tooling/visual-regression/node_modules` (chromium + firefox + webkit;
serve via the VR `serve.mjs` or `npx serve .`), assert on home:
1. Scrub keyboard: focus hue handle → ArrowRight ×5 → `aria-valuenow` advanced; preview's
   `--color-accent` changed (poll — hero re-skin holds :root for ~2.4s after load; scrub writes
   `#reskin-preview`, not :root, so they don't collide, but wait for `data-spine="ready"` first).
2. Scrub pointer: pointerdown+move on radius handle → `--radius-md` on preview changed.
3. Inspect: toggle on → focus a mounted card → `#inspect-bubble` visible with 4 children; Esc
   dismisses; toggle survives reload (localStorage).
4. Reduced motion (`emulateMedia({ reducedMotion: 'reduce' })`): scrub still works, values snap
   (no transition), hero re-skin skipped, bubble opens without entrance.

### Edge Cases

- Wizard re-run after scrubbing (last-writer-wins: wizard overwrites; the handles' `read()`
  base means the NEXT drag/arrow starts from the wizard's new values, and focusing a handle
  refreshes its `aria-valuenow`/text to the live value — assert both).
- Derived/imported pack worn: scrub still writes preview-scoped props; dock pack switch leaves
  scrub functional.
- JS off: no scrub row, no dead controls (view-source shows only the empty container).
- `hexToOklch` hue = NaN on achromatic input — initial is #2f7a4d (chromatic), but clamp/default
  h to 0 defensively in the mount, with a one-line comment.

## VALIDATION COMMANDS

### Level 1: Syntax & imports
```
node -e "import('./system/scrub.mjs').then(()=>console.log('✓'))"
node tooling/drift-check.mjs
```
### Level 2: Generators
```
node agent-layer/gen-inspect-data.mjs --check
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
```
### Level 3: Gates
```
node tooling/build-checks.mjs
cd tooling/visual-regression && npm run update:docker   # then: npx playwright test (Docker)
```
### Level 4: Manual
`npx serve .` → home in Chrome AND Firefox AND Safari: scrub all three (pointer + keyboard),
inspect every mount under two packs, read every section's opening aloud, OS reduced-motion pass.
Manual screenshots: wait ~3s or poll `--color-accent` (hero re-skin trap memory).

## ACCEPTANCE CRITERIA

- [ ] AC1 — inspect covers home's major components (hero, cards, buttons, header, footer) with
      real 4-layer data; drift gates green.
- [ ] AC2 — ≥3 new scrubbable controls (hue, radius, spacing), each in param-manifest;
      param-count regenerated.
- [ ] AC3 — no home section opens with an unexplained specialist term; /no-ai-slop + /humanizer
      run on every rewritten line.
- [ ] AC4 — index ×2 AND approach ×2 baselines regenerated in this PR; VR green; hero-reskin
      timing respected in captures.
- [ ] AC5 — reduced-motion + keyboard paths for every new control (slider pattern; snap under
      reduce).
- [ ] PR body carries `Closes #169`; plan + report + review committed in the same PR.

## COMPLETION CHECKLIST

- [ ] All tasks in order, each VALIDATE run immediately
- [ ] Regen cascade complete (inspect-data · param-count · loc-summary · 4 baselines)
- [ ] Cross-engine functional pass (chromium + firefox + webkit)
- [ ] Exactly 4 PNGs churned — any 5th investigated
- [ ] Copy skills run before commit, not after

## OPEN QUESTIONS / ASSUMPTIONS

- **Decided here (was a PRD open question):** home's scrubbable values live on the intake stage
  (`#reskin-preview`), not the hero — the hero moment is transient (1.2s hold + revert), so a
  control there would be unreachable; the stage is persistent and already the "generated system"
  exhibit. Hue runs the real engine; radius/spacing manipulate the contract directly, and the
  row's caption says which is which (honesty).
- **Assumption:** the inspect toggle belongs in param-manifest (counting rules: an action button
  running behaviour beyond a hyperlink). It was a #166→#167 ordering gap; counted here.
- **Mitigated (was a risk):** `@property` registration of the five length tokens must be
  VR-invisible. Three-layer defense now in the tasks: (1) the pack-value pre-flight grep proves
  every committed and runtime-derived value parses under the registered syntax before the block
  is written; (2) the two-stage baseline proof (update WITHOUT registrations → green
  `playwright test` WITH them) makes render-invisibility machine-checked across all 20 shots;
  (3) the pre-authorized fallback — drop the registrations, scrub degrades to snap — is a
  bounded, no-re-plan exit.
- **Assumption:** header/footer role lines + site.js attrs are in-scope "major components of
  home" (they are on home, and the chrome is a token-contract exhibit). If review reads this as
  scope creep, the two attrs + two ROLES lines lift out cleanly.

## NOTES (open canvas)

**Why not scrub the peak tiles' numbers:** the peak renders a COMMITTED composition (real agent
output); letting the reader scrub "3 plants need water" would hand-edit what is presented as
agent/fixture output — honesty contract violation. The peak already has its one adjust control
(#75's select, in the manifest).

**Last-writer-wins (wizard × scrub) considered alternatives:** (a) scrub re-applies after every
wizard run — rejected: fights the reader's explicit new brief; (b) scoping scrub props to an
inner wrapper so the wizard's props layer beneath — rejected: two prop scopes for one exhibit is
complexity the page doesn't need. The chosen behavior — whoever acted last owns the preview — is
how real tools behave, and the caption line makes it legible. The residual hazard (handles
displaying values the wizard has since overwritten) is closed structurally: `makeScrubbable`
caches nothing and `read()`s the live computed value at every interaction start and on focus,
so handle state can never diverge from the screen for longer than one idle gap the reader
isn't looking at. The edge-case test list asserts exactly this (wizard re-run → re-scrub works,
aria values refresh on focus).

**Why scrub.mjs self-mounts rather than a separate mount module:** derive-probe precedent (one
file = one concern incl. its render); intake-beat already owns the wizard seam and shouldn't
grow a second concern; #174 imports `makeScrubbable` and ignores the guarded home mount.

**Sequencing risk:** role lines MUST regen into inspect-data.json before any `data-inspect`
markup lands (drift gate + runtime abort both key off the json). Closed three ways: the task
order encodes it; the role-lines task now requires re-running the drift-check pair after EACH
mount task (per-task guard, not end-of-branch); and the json+markup share one commit so no
commit in history has markup the gate can't resolve.

**Baseline math:** index ×2 (scrub row + copy + mounts are at-rest changes), approach ×2
(param-count total + loc runtime group both render there). Nothing else: springs are
transition-time only (gate disables animations; rest==final holds), bubble entrance never at
rest, site.js attrs invisible.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
