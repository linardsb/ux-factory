# Feature: Live derivation engine — OKLCH palette, type/space scales, pattern + ethics rules (folds spike 2)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The view-time deterministic derivation engine (architecture approach B): hand-written vanilla ES modules beside `system/site.js` that turn bounded intake answers into a design system **live in the reader's browser** — no framework, no runtime deps, no LLM calls. Four bounded input axes drive four derivations:

1. **Brand color → OKLCH-derived accessible palette**, with WCAG AA contrast checks shown passing (the color math is hand-written — it IS part of the demonstration).
2. **Density → type + spacing scales** (modular type ramp, 4px-grid spacing table).
3. **Hooked variable-reward type (Tribe / Hunt / Self) → component-pattern selection** from the real component library.
4. **Behavior frequency → ethics-gate verdict** (Hooked frequency filter: "not every product is a habit product").

The engine emits a **complete value set for every semantic token `system/tokens.contract.css` declares**, driven by a **versioned, inspectable derivation-ruleset artifact**. A bare test page drives it end to end; a Node spike runner folds **spike 2** (palette quality over ≥5 diverse brand colors, auto-checked against WCAG AA) whose outcome must be recorded in issue #3 before it closes.

This is the machinery behind the Factory page's design-system-generation station (ticket #10) — the "genuinely live moment" of PRD §6.2.

## User Story

As a hiring manager evaluating a senior UXE candidate
I want to steer a real design-system derivation in my own browser and watch accessibility checks pass
So that I can verify the candidate engineers systems (color math, scales, ethical gating) rather than trusting claims.

## Problem Statement

The pipeline's design-system-generation station currently has nothing live to show: "generation" would be a slideshow (rejected approach A). The PRD requires one genuinely live, reactive moment that cannot fail on stage — which demands deterministic, dependency-free derivation whose quality is proven up front (spike 2), not hoped for.

## Solution Statement

Four small DOM-free ES modules under `system/` — color-space math (`oklch.mjs`), contrast checker (`wcag.mjs`), versioned ruleset (`derive.rules.mjs`), engine orchestrator (`derive.mjs`) — plus a bare harness page (`derive.html`) that applies emitted tokens via `documentElement.style.setProperty()` so the already-shipped components re-skin live. Because the modules are DOM-free, the same code runs under Node: a zero-dep spike runner (`tooling/spike-palette.mjs`) executes spike 2's decision rule mechanically (≥95% of declared WCAG pairs pass unaided → full live derivation).

Honesty contract holds by construction: every adjustment the engine makes (brand lightness clamped, sRGB gamut clamp, accent-fg flipped to dark) is reported in a `notes` array — the negotiation between brand and accessibility is *shown*, never silent.

## Out of Scope / Non-Goals

- **Not the Factory page / intake wizard UI** (ticket #10). `derive.html` is a bare internal harness, not a designed surface — no wizard, no scenario toggle, no station chrome.
- **Not scenario packages** (ticket #4). No Verdant/Fieldwork content; the harness uses raw controls.
- **No font derivation.** Fonts are a brand-pack concern; the engine emits the neutral system stack from ruleset defaults. Same for radius and shadows (static ruleset defaults in v1).
- **Not touching the token pipeline.** `tokens.source.json`, `gen-token-css.mjs`, the contract, and the neutral pack are read-only inputs to this ticket. The engine *overrides* tokens at view time; it never writes CSS files.
- **No CI wiring** (ticket #9). The spike runner is manually invoked; #9 may later adopt it.
- **No culori or any dependency** — unless the spike's decision rule fails on hand-rolled math quality (the ruleset-tuning escape hatch comes first; culori is the last resort the ticket names).
- **Not changing:** `components.css`, `site.js`, `index.html`, anything under `portal/` or `agent-layer/`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (~800–1500 lines per the ticket estimate; the risk is math correctness, not volume)
**Primary Systems Affected**: `system/` (new view-time modules), repo root (harness page), `tooling/` (spike runner)
**Dependencies**: none (zero runtime deps — hard constraint)

## Related Work

**Implements**: [issue #3](https://github.com/linardsb/ux-factory/issues/3) · **Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Recommended approach, §Stack, §Data model "Derivation rules", spike 2)

**Inherited, not re-decided** (from the epic architecture — do not reopen):
- Approach B: deterministic engine on stage; vanilla hand-written ES modules; zero runtime deps.
- Color/contrast math hand-written (culori only if the spike fails on quality).
- Spike 2 decision rule: ≥95% pairs pass unaided → full live derivation; else live derivation scoped to color only, presets for the rest.
- Target token names come from `system/tokens.contract.css` (stable; independent of ticket #2's DTCG inversion, which has already landed).
- Deploy = commit the artifacts; the repo is inspectable proof.

**Back-references**: ticket #2 (DTCG inversion) landed — `tokens.source.json` is the source of truth and gives the spike runner a machine-readable contract token list to verify completeness against.

**Forward-references** (append as created):
- Ticket #10 (Factory page) consumes `derive()` + the ruleset for the generation station.
- Ticket #9 (CI gates) may adopt `tooling/spike-palette.mjs` as a check.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/tokens.contract.css` (all 84 lines) — Why: the **exact token names and groups the engine must emit values for**. The 8 groups: fg-surface (7 tokens), accent (5), inverse (8, of which 5 are `color-mix()` expressions), fonts (2), spacing (8), radius (3), shadows (3), layout (2), type-ramp (8).
- `system/tokens.source.json` (lines 3–78, the `contract` group) — Why: the same token list in machine-readable form; the spike runner cross-checks the engine's emitted keys against it (completeness = AC #2).
- `system/tokens.neutral.css` (lines 23–100) — Why: the value *shapes* to match — hex colors, `clamp(40px, 6vw, 76px)` type entries, px spacing, verbatim `color-mix()` inverse tokens.
- `system/site.js` (lines 1–20) — Why: the header-comment + IIFE conventions for view-time files beside which the engine lives; note the governing-doc citation style.
- `system/portfolio.js` (lines 1–15) — Why: second example of a hand-written behaviour module's header style.
- `agent-layer/gen-token-css.mjs` (lines 36–57 `loadSource`, 148–158 standalone guard) — Why: boundary-validation style (throw plain `Error` naming the offending path) and the `pathToFileURL` standalone-run guard the spike runner must copy (**the repo path contains a space** — naive `file://${argv[1]}` comparison never matches, see its lines 148–149).
- `portal/lib/intake.mjs` (lines 28–33) — Why: hand-validation-at-the-boundary pattern (`if (!company) throw new Error('company is required')`) the engine's input validation mirrors.
- `index.html` (lines 1–40) — Why: the stylesheet load order (`tokens.contract.css` → `tokens.neutral.css` → `components.css` → `portfolio.css`) and the component markup (`page-hero`, `card`, `btn`, `pill`, `stamp`, `section-label`) to crib for the harness page.
- `system/components.css` (section index: Type 41, Buttons 148, Cards 519, Decision card 535, Lineup 1037, Feature band 1320, Hero 878, hero-stat 968, meta-row 1248) — Why: the **real component classes the pattern-selection ruleset names** — patterns must reference components that exist.
- `__UX_UI_Research.md` (lines 55–71) — Why: the Hooked grounding the ruleset encodes verbatim: variable-reward types (**Tribe** = social, **Hunt** = resources/information, **Self** = mastery/completion), the **Manipulation Matrix** (improves life × would use it → Facilitator/…), and the non-negotiable *"not every product is a habit product — for utility/B2B tools, optimising for return frequency is the wrong goal."*
- `.claude/references/token-system.md` — Why: the three-layer mechanic the engine plugs into (view-time overrides sit "above" the pack layer).
- `.claude/references/frontend-component-best-practices.md` — Why: project UI conventions for the harness page.

### New Files to Create

- `system/oklch.mjs` — hand-written color-space math: hex ↔ sRGB ↔ linear-sRGB ↔ OKLab ↔ OKLCH, plus sRGB gamut clamping. Pure functions, DOM-free.
- `system/wcag.mjs` — WCAG relative luminance + contrast ratio + `checkPairs(tokens, pairs)`. Pure, DOM-free; imports the linearization from `oklch.mjs`.
- `system/derive.rules.mjs` — **the versioned ruleset artifact** (v1.0.0): palette recipe, scale tables/ratios, pattern selection map, ethics gate, WCAG pair list. A frozen, heavily-commented data module — this file IS the inspectable artifact (AC #4).
- `system/derive.mjs` — the engine: `derive(input, ruleset = RULESET)` → `{ input, rulesetVersion, tokens, notes, checks, patterns, ethics }`. DOM-free orchestrator.
- `derive.html` — bare harness page at repo root: controls → `derive()` → apply tokens to `documentElement`, render checks table + patterns + verdict + token JSON.
- `tooling/spike-palette.mjs` — zero-dep Node runner for spike 2: conversion sanity anchors, contract-completeness check, ≥5-color WCAG audit, decision-rule verdict with exit code.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Björn Ottosson — Oklab](https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab)
  - Section: "Converting from linear sRGB to Oklab" — the exact matrices (verified 2026-07-17, reproduced in full under Patterns below so no fetch is needed at implementation time).
  - Why: the hand-written conversion must use these constants verbatim; a digit error poisons every palette.
- [Björn Ottosson — sRGB gamut clipping](https://bottosson.github.io/posts/gamutclipping/)
  - Why: background on why out-of-gamut OKLCH values need chroma reduction. We use the simple approach (binary-search chroma at fixed L/H), not the paper's projection — note the simplification in a comment.
- [WCAG 2.2 — contrast minimum (SC 1.4.3)](https://www.w3.org/TR/WCAG22/#contrast-minimum) and [non-text contrast (SC 1.4.11)](https://www.w3.org/TR/WCAG22/#non-text-contrast)
  - Why: AA thresholds — **4.5:1** normal text, **3:1** large text and non-text UI.
- [W3C wiki — relative luminance](https://www.w3.org/WAI/GL/wiki/Relative_luminance)
  - Why: `L = 0.2126·R + 0.7152·G + 0.0722·B` on linearized channels. The spec's published piecewise threshold 0.03928 is a known erratum; **use 0.04045** (identical results for 8-bit values, and it lets `wcag.mjs` reuse `oklch.mjs`'s linearization). Record this in a comment.

### Patterns to Follow

**File headers** — every new feature/entry-point file opens citing its governing doc, e.g.:
```js
// system/derive.mjs — view-time deterministic derivation engine (hand-written canon, this repo).
// Turns bounded intake answers into a complete semantic-token value set, live in the browser.
// Spec: docs/epics/ai-first-ux-factory.architecture.md §Recommended approach (epic #1, ticket #3).
// Zero runtime deps; DOM-free (the same modules run under Node — tooling/spike-palette.mjs).
```

**Error handling** — throw plain `Error` naming the offending input, validated by hand at the boundary (`portal/lib/intake.mjs:29`, `agent-layer/gen-token-css.mjs:39-51`):
```js
if (!/^#[0-9a-fA-F]{6}$/.test(input.brandColor)) throw new Error(`derive: brandColor "${input.brandColor}" is not a #rrggbb hex`);
if (!(input.density in ruleset.scales)) throw new Error(`derive: unknown density "${input.density}"`);
```

**Standalone-run guard for the spike runner** (`agent-layer/gen-token-css.mjs:148-158`) — MUST use `pathToFileURL`, the repo path contains a space:
```js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { … }
```
…and print the `✓`/`✗` aligned log-line style: `spike 2         ✓  88/88 pairs AA — full live derivation` / exit 1 on `✗`.

**The exact OKLab math (verified against the source 2026-07-17)** — hand-write these constants:
```
sRGB → linear (per channel c in [0,1]):   c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4
linear → sRGB:                            c ≤ 0.0031308 ? 12.92·c : 1.055·c^(1/2.4) − 0.055

linear sRGB → OKLab:
  l = 0.4122214708·r + 0.5363325363·g + 0.0514459929·b
  m = 0.2119034982·r + 0.6806995451·g + 0.1073969566·b
  s = 0.0883024619·r + 0.2817188376·g + 0.6299787005·b
  l_ = cbrt(l); m_ = cbrt(m); s_ = cbrt(s)
  L = 0.2104542553·l_ + 0.7936177850·m_ − 0.0040720468·s_
  a = 1.9779984951·l_ − 2.4285922050·m_ + 0.4505937099·s_
  b = 0.0259040371·l_ + 0.7827717662·m_ − 0.8086757660·s_

OKLab → linear sRGB (inverse):
  l_ = L + 0.3963377774·a + 0.2158037573·b
  m_ = L − 0.1055613458·a − 0.0638541728·b
  s_ = L − 0.0894841775·a − 1.2914855480·b
  l = l_³; m = m_³; s = s_³
  r = +4.0767416621·l − 3.3077115913·m + 0.2309699292·s
  g = −1.2684380046·l + 2.6097574011·m − 0.3413193965·s
  b = −0.0041960863·l − 0.7034186147·m + 1.7076147010·s

OKLab ↔ OKLCH:  C = √(a²+b²);  H = atan2(b,a)·180/π (normalize to [0,360));  a = C·cos(H·π/180); b = C·sin(H·π/180)

Gamut clamp (toGamut): convert OKLCH→linear sRGB; if any channel outside [−ε, 1+ε],
binary-search chroma in [0, C] at fixed L and H (~20 iterations, ε=1e-4), then clamp channels to [0,1].

WCAG: Lum = 0.2126·R + 0.7152·G + 0.0722·B (linearized channels);  CR = (Llighter+0.05)/(Ldarker+0.05)
```

**Sanity anchors** (use as assertions in the spike runner):
- `#ffffff` → OKLab L ≈ 1.000, a ≈ 0, b ≈ 0 (|a|,|b| < 1e-4)
- sRGB red `#ff0000` → L ≈ 0.6280, a ≈ +0.2249, b ≈ +0.1258 (±0.001)
- Round-trip: for any in-gamut hex, hex → OKLCH → hex is identical (after rounding).
- `contrast('#ffffff','#000000')` = 21.0; `contrast('#767676','#ffffff')` ≈ 4.54 (passes AA); `contrast('#777777','#ffffff')` ≈ 4.48 (fails AA).

**Naming** — kebab-case token keys **without** the `--` prefix in the emitted map (`'color-fg': '#1f1e1d'`); the applier adds `--`. camelCase exports (`derive`, `hexToOklch`, `contrastRatio`, `checkPairs`, `RULESET`).

---

## IMPLEMENTATION PLAN

### Phase 1: Color + contrast math foundation

`system/oklch.mjs` and `system/wcag.mjs` — pure, DOM-free, individually verifiable against the anchors above. Everything else builds on these.

### Phase 2: The ruleset artifact

**Depends on:** nothing conceptually, but write after Phase 1 so palette recipe values (L/C targets, clamps) are expressed in the same terms the math implements.

`system/derive.rules.mjs` — the versioned, frozen, commented data module: palette recipe, density scales, pattern map, ethics gate, WCAG pair list, static defaults (fonts/radius/shadows/layout/color-mix passthroughs).

### Phase 3: The engine

**Depends on:** Phases 1–2.

`system/derive.mjs` — validate input → derive palette (with gamut clamp + honesty notes) → derive scales → select patterns → run ethics gate → run WCAG checks → return the result object. Completeness against the contract is non-negotiable.

### Phase 4: Harness page

**Depends on:** Phase 3. **Independent of:** Phase 5 (parallel candidates).

`derive.html` — bare page driving the engine live over the real components.

### Phase 5: Spike 2 (folded)

**Depends on:** Phase 3. **Independent of:** Phase 4.

`tooling/spike-palette.mjs` — run the engine over ≥5 diverse brand colors (we use 8, including hostile ones), audit all declared WCAG pairs, apply the decision rule, and produce the table to paste into issue #3. If <95%: tune ruleset recipe values (a ruleset version bump), re-run; only if quality is fundamentally un-tunable does the culori fallback question open (stop and flag — that contradicts a recorded decision only the spike outcome can reopen).

---

## STEP-BY-STEP TASKS

### CREATE `system/oklch.mjs`

- **IMPLEMENT**: `hexToRgb(hex)` / `rgbToHex({r,g,b})` (clamp + round channels), `srgbToLinear(c)` / `linearToSrgb(c)`, `rgbToOklab` / `oklabToRgb` (exact constants from Patterns above), `oklabToOklch` / `oklchToOklab`, `hexToOklch(hex)` / `oklchToHex({l,c,h})`, `toGamut({l,c,h})` (binary-search chroma), `inGamut({l,c,h})`. Export all named. ~120 lines.
- **PATTERN**: pure-function module with a plain what/why header (helper-module convention, CLAUDE.md §Ground rules); cite Ottosson URL + "constants verified 2026-07-17" in the header.
- **IMPORTS**: none (`Math.cbrt`, `Math.atan2` only).
- **GOTCHA**: hue is degrees, not radians — normalize `atan2` output to [0,360). Near-achromatic colors (C < 1e-5) have meaningless hue — return h=0 and never NaN. Round hex channels with `Math.round`, clamp to [0,255].
- **VALIDATE**: `node -e "import('./system/oklch.mjs').then(m => { const o = m.hexToOklch('#ff0000'); console.log(o); if (Math.abs(o.l - 0.628) > 0.001) process.exit(1); if (m.oklchToHex(m.hexToOklch('#2563eb')) !== '#2563eb') process.exit(1); console.log('ok'); })"`
- **SATISFIES**: AC #1 (hand-written color math, zero deps).

### CREATE `system/wcag.mjs`

- **IMPLEMENT**: `relativeLuminance(hex)` (0.2126/0.7152/0.0722 on linearized channels), `contrastRatio(hexA, hexB)` (lighter/darker + 0.05), `checkPairs(tokens, pairs)` → `[{fg, bg, fgValue, bgValue, ratio, min, usage, pass}]` (ratio rounded to 2 dp for display, compared unrounded). ~50 lines.
- **PATTERN**: same pure-module shape as `oklch.mjs`.
- **IMPORTS**: `import { hexToRgb, srgbToLinear } from './oklch.mjs'`.
- **GOTCHA**: use the 0.04045 linearization threshold and note the WCAG 0.03928 erratum in a comment (identical for 8-bit; lets us share one linearization). `checkPairs` must **skip non-hex values** (the `color-mix()` passthrough tokens are not checkable in pure JS) — pairs in the ruleset only ever name hex-emitting tokens, but guard and throw a naming `Error` if a pair references one that isn't hex.
- **VALIDATE**: `node -e "import('./system/wcag.mjs').then(m => { const a = m.contrastRatio('#ffffff','#000000'), b = m.contrastRatio('#767676','#ffffff'); console.log(a, b); if (Math.abs(a - 21) > 0.01 || b < 4.5 || m.contrastRatio('#777777','#ffffff') >= 4.5) process.exit(1); console.log('ok'); })"`
- **SATISFIES**: AC #3 (WCAG checker reports pass/fail per token pair).

### CREATE `system/derive.rules.mjs`

- **IMPLEMENT**: `export const RULESET = Object.freeze({ version: '1.0.0', palette, scales, patterns, ethics, wcagPairs, statics })` (deep-freeze the branches too — a tiny `freeze` helper is fine). Contents:
  - **`palette`** — the recipe, expressed as OKLCH targets: accent lightness clamp `[0.35, 0.60]`; hover ΔL −0.06, active ΔL −0.11 (floor 0.15); accent-fg = `#ffffff` if `contrast(#fff, accent) ≥ 4.5` else the derived `color-fg` value; accent-secondary `{l: 0.55, cMax: 0.05}`; neutrals hue-tinted from the brand hue: fg `{l: 0.26, cMax: 0.015}`, fg-muted `{l: 0.55, cMax: 0.02}`, bg `#ffffff` (fixed), bg-surface `{l: 0.965, cMax: 0.006}`, border `{l: 0.87, cMax: 0.01}`, border-strong = fg, white `#ffffff` (fixed); inverse: bg-inverse `{l: 0.24, cMax: 0.02}`, fg-on-inverse `{l: 0.95, cMax: 0.005}`, fg-on-inverse-strong `#ffffff`.
  - **`scales`** — per density: `compact {bodyPx: 15, ratio: 1.2, gutter: '20px', spacing: [4,8,12,16,24,32,48,64]}`, `comfortable {bodyPx: 16, ratio: 1.25, gutter: '24px', spacing: [4,8,16,24,32,48,64,96]}`, `spacious {bodyPx: 17, ratio: 1.333, gutter: '28px', spacing: [4,12,20,32,40,64,80,128]}` (spacing arrays map to xs…4xl — explicit tables keep the 4px grid honest; type is ratio-computed). Shared `typeSteps`: `{display: {exp: 7, vw: 6, minRatio: 0.53}, h1: {exp: 5, vw: 4, minRatio: 0.57}, h2: {exp: 3, vw: 2.5, minRatio: 0.7}, h3: {exp: 1}, lead: {exp: 0.5, vw: 1.5, minRatio: 0.8}, body: {exp: 0}, caption: {exp: -1}, eyebrow: {exp: -1.25}}` — entries with `vw` emit `clamp(<round(max·minRatio)>px, <vw>vw, <max>px)`, the rest plain px.
  - **`patterns`** — reward type → selections naming **real classes from `system/components.css`**, each `{id, name, components: [...], why, habitMechanic: bool}`. Tribe: social-proof band (`.feature-band`, `.feature-item`), activity cards (`.card`, `.meta-row`, `.pill`, `.stamp`, habitMechanic). Hunt: library grid (`.grid.grid-3`, `.card`, `.card-kicker`), numbered lineup (`.lineup`, `.lineup-item`, `.lineup-n`), section index (`.section-label`). Self: progress stats (`.hero-stat`, `.meta-row`, `.meta-cell`, habitMechanic), decision checklist (`.decision-card`, `.dc-field`).
  - **`ethics`** — `frequencyFilter: {'multiple-daily': true, daily: true, weekly: true, monthly: false, rarely: false}` (Hooked habit zone: weekly or better), verdict copy for pass ("habit-forming candidate — Hook design applicable") and fail ("utility — design for get in, do the job, leave; habit mechanics rejected by the frequency filter"), and the Manipulation Matrix quadrant table (`improvesLives × wouldUseIt` → facilitator/peddler/entertainer/dealer) for the optional inputs.
  - **`wcagPairs`** — 12 pairs `{fg, bg, min, usage}`: fg/bg 4.5 · fg-muted/bg 4.5 · fg/bg-surface 4.5 · fg-muted/bg-surface 4.5 · accent-fg/accent 4.5 · accent/bg 4.5 (accent used as text — `components.css:119` `.amber`) · accent/bg-surface 4.5 · fg-on-inverse/bg-inverse 4.5 · fg-on-inverse-strong/bg-inverse 4.5 · accent/bg-inverse 3.0 (non-text UI on dark) · accent-secondary/bg 3.0 (non-text: live dots) · border-strong/bg 3.0 (SC 1.4.11). Comment why plain `border`/hairlines are excluded (decorative, not identification-bearing).
  - **`statics`** — fonts (neutral system stack, both faces), radius (4/8/16px), shadows (3 values verbatim from the contract), maxw `1200px`, and the 5 `color-mix()` inverse expressions **verbatim from `tokens.contract.css:41-45`**.
- **PATTERN**: header states version + that tuning values = version bump; this file is reader-facing evidence — comment every recipe choice with its *why* (match the annotated density of `tokens.source.json` descriptions).
- **IMPORTS**: none — pure data.
- **GOTCHA**: this artifact is what readers inspect (AC #4) — no abbreviations, no magic numbers without a comment. Keys must exactly match contract token names (no `--` prefix).
- **VALIDATE**: `node -e "import('./system/derive.rules.mjs').then(m => { if (m.RULESET.version !== '1.0.0' || Object.isFrozen(m.RULESET) !== true) process.exit(1); console.log('ruleset', m.RULESET.version, Object.keys(m.RULESET)); })"`
- **SATISFIES**: AC #4 (versioned inspectable ruleset).

### CREATE `system/derive.mjs`

- **IMPLEMENT**: `export function derive(input, ruleset = RULESET)`:
  1. **Validate** `{brandColor, density, rewardType, frequency, improvesLives?, wouldUseIt?}` — throw naming `Error`s (pattern above). Optional booleans may be omitted (harness/#10 supply them later).
  2. **Palette**: `hexToOklch(brandColor)` → clamp L into `palette.accentLightnessClamp` (push a note if changed) → `toGamut` (note if chroma reduced) → accent + hover/active steps → accent-fg by contrast rule (note which branch) → hue-tinted neutrals and inverse per recipe (each `toGamut`-ed, `oklchToHex`-ed).
  3. **Scales**: spacing array → `spacing-xs…4xl`; type ramp from `bodyPx`/`ratio`/`typeSteps` (round px; emit clamp() where `vw` present); `gutter` from density; `maxw`, radius, shadows, fonts, color-mix passthroughs from `statics`.
  4. **Patterns**: `ruleset.patterns[rewardType]`; if the frequency filter fails, tag `habitMechanic` entries `gatedBy: 'frequency-filter'` (kept visible — the gate is shown working, not hiding its rejects) and push a note.
  5. **Ethics**: `{frequency, passesFrequencyFilter, verdict}` + `quadrant` when both optional booleans present.
  6. **Checks**: `checkPairs(tokens, ruleset.wcagPairs)`.
  7. Return `{ input, rulesetVersion: ruleset.version, tokens, notes, checks, patterns, ethics }`.
- **PATTERN**: governing-doc header (see Patterns); orchestrator delegates to the sibling modules — keep each derivation step a small local function, no classes.
- **IMPORTS**: `./oklch.mjs`, `./wcag.mjs`, `./derive.rules.mjs`.
- **GOTCHA**: **completeness** — the emitted `tokens` object must contain every leaf token of the contract group (40 tokens; the spike cross-checks). DOM-free is a hard requirement: no `document`, no `window` anywhere in the four `system/*.mjs` modules. `notes` entries are `{token, action, from, to, why}` — the honesty surface, write real sentences.
- **VALIDATE**: `node -e "import('./system/derive.mjs').then(m => { const r = m.derive({brandColor:'#2563eb',density:'comfortable',rewardType:'hunt',frequency:'weekly'}); console.log(Object.keys(r.tokens).length, 'tokens;', r.checks.filter(c=>c.pass).length + '/' + r.checks.length, 'AA;', r.ethics.verdict); if (Object.keys(r.tokens).length < 40) process.exit(1); })"` — and a negative test: `node -e "import('./system/derive.mjs').then(m => { try { m.derive({brandColor:'blue',density:'comfortable',rewardType:'hunt',frequency:'weekly'}); process.exit(1); } catch (e) { console.log('throws ok:', e.message); } })"`
- **SATISFIES**: AC #2 (complete value set from arbitrary bounded inputs), AC #1 (lives beside site.js, hand-written).

### CREATE `derive.html`

- **IMPLEMENT**: bare harness at repo root. Head: same stylesheet order as `index.html:14-17` (contract → neutral pack → components; portfolio.css optional — skip it, keep bare) + `noindex` meta. Body: (1) a controls strip — `<input type="color">`, three `<select>`s (density/reward/frequency), Derive + Reset buttons; (2) a sample-components section cribbed from `index.html` (hero headline, `.btn-primary`/`.btn-secondary`, a `.card` grid, `.muted`/`.amber` text, one dark `.feature-band`-style block so inverse tokens are exercised); (3) results: checks table (pair · ratio · min · pass/fail), engine notes list, patterns list (with gated badges), ethics verdict, `<pre>` JSON dump of `tokens`. One inline `<script type="module">`: `import { derive } from './system/derive.mjs'` — on input, run `derive`, then `Object.entries(tokens).forEach(([k,v]) => document.documentElement.style.setProperty('--'+k, v))`; Reset iterates the same keys with `removeProperty`. Label the page "internal test harness — drives the derivation engine raw" (honesty contract: capability indicators state exactly what this is).
- **PATTERN**: `index.html` markup + comment tone; hash-free single page; no framework, no fetch.
- **IMPORTS**: `./system/derive.mjs` only.
- **GOTCHA**: inline `style` on `documentElement` outranks both the contract and the pack — that's the mechanism, note it in a comment. ES-module import fails under `file://` — must be served (`npx serve .`), same as the existing shell. Render check ratios from the engine's `checks` (don't recompute in the page).
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/derive.html`, pick a brand color: components re-skin instantly, checks table fills, Reset returns the neutral look. No console errors.
- **SATISFIES**: AC #2 demonstrably live; the ticket's "bare test page to drive it".

### CREATE `tooling/spike-palette.mjs`

- **IMPLEMENT**: zero-dep Node ESM, four stages, each printing `✓`/`✗` lines:
  1. **Math anchors** — the oklch + wcag sanity assertions from Patterns (exit 1 on any miss).
  2. **Completeness** — read `system/tokens.source.json` (path resolved from `import.meta.url`, NOT cwd — copy `gen-token-css.mjs:13-14`), flatten the `contract` group's leaf token names, `derive()` once, assert emitted keys ⊇ contract keys (report any missing/extra by name).
  3. **Spike matrix** — 8 brand colors × {comfortable density, hunt, weekly}: `#2563eb` (control blue) · `#e11d48` (saturated red) · `#10b981` (teal green) · `#7c3aed` (violet) · `#f97316` (orange) · `#ffd400` (saturated yellow — hostile: very light) · `#a3e635` (lime — hostile) · `#78350f` (dark brown — hostile: very dark). For each: run `derive`, print a markdown table row per pair (color · pair · ratio · pass) plus the engine's notes (the clamp negotiations are part of the record).
  4. **Decision rule** — overall pass % across all checked pairs; `≥95%` → `spike 2         ✓  <n>/<total> pairs AA (<pct>%) — full live derivation` exit 0; else `✗ … — scope live derivation to color only (Screen-1 fallback)` exit 1. Emit the full markdown block to stdout ready to paste into issue #3.
- **PATTERN**: standalone guard with `pathToFileURL` (`gen-token-css.mjs:148-158`); aligned `✓` log lines; throw naming `Error`s.
- **IMPORTS**: `node:fs` `readFileSync`, `node:path`, `node:url`, `../system/derive.mjs`, `../system/oklch.mjs`, `../system/wcag.mjs`.
- **GOTCHA**: `tooling/` is currently untracked — `git add tooling/spike-palette.mjs` explicitly (don't sweep in unrelated untracked files from `tooling/mcp/`). The 3.0-min pairs count toward the same overall % (the decision rule says "all token pairs" — the ruleset's declared list is the honest definition of "all").
- **VALIDATE**: `node tooling/spike-palette.mjs` → all four stages print, exit code matches the verdict.
- **SATISFIES**: AC #3 (spike results ≥5 colors), the fold of spike 2 + its decision rule.

### RUN the spike and record the outcome (gate — do this BEFORE closing/committing `Closes #3`)

- **IMPLEMENT**: `node tooling/spike-palette.mjs > /tmp-scratchpad-or-scratch-file.md`; review. If <95%: tune `derive.rules.mjs` recipe values (clamp band, neutral L/C targets), bump ruleset version, re-run — iterate. Then post the result: `gh issue comment 3 --body-file <spike-results.md>` with the verdict sentence ("decision rule: ≥95% → full live derivation — outcome: …") and the final ruleset version.
- **GOTCHA**: the ticket's own text requires the spike outcome recorded **in the issue** before closing. If the fallback branch triggers (color-only live derivation), STOP and flag to the user before restructuring scope — that decision changes ticket #10's station design.
- **VALIDATE**: `gh issue view 3 --json comments --jq '.comments[-1].body' | head -20` shows the spike table.
- **SATISFIES**: AC #3, spike-2 decision rule recorded.

### UPDATE `CLAUDE.md` (architecture map, one line)

- **IMPLEMENT**: under the `system/` block in the Architecture map, after the `site.js` line, add one line: `derive.mjs (+oklch/wcag/derive.rules) view-time derivation engine — intake answers → token values + WCAG checks + ethics verdict (epic #1 ticket #3)`. Nothing else in CLAUDE.md changes.
- **PATTERN**: match the existing map's terse one-line-per-entry style.
- **VALIDATE**: `git diff CLAUDE.md` shows exactly one added line.
- **SATISFIES**: keeps the rules file true (surgical: the map enumerates `system/` files).

---

## TESTING STRATEGY

The project has **no test suite, linter, or type-check by design** (CLAUDE.md §Ground rules) — do not invent one. "Done" = run the surface you touched. The spike runner doubles as the executable verification: math anchors (stage 1) are effectively unit tests, completeness (stage 2) is the integration test, and the spike matrix (stage 3) is the acceptance evidence.

### Unit-level (spike stages 1–2 + node one-liners per task)

- OKLab known values (white, red), hex round-trip, gamut-clamp always in gamut.
- Contrast anchors including the 4.48-vs-4.54 boundary pair.
- Input validation throws on: malformed hex, unknown density/reward/frequency.

### Integration (spike stage 3 + harness)

- Full derive over 8 colors × the checked-pair matrix.
- Browser harness: visual re-skin, checks table, gated patterns when frequency = monthly/rarely, Reset restores neutral.

### Edge Cases

- **Near-achromatic brand** (`#808080`): hue is arbitrary — neutrals must not go weird; C caps do the work. Add as a manual harness check.
- **Very light brand** (`#ffd400`): lightness clamp engages + gamut clamp desaturates; `notes` must narrate both; accent-fg may flip dark — verify the flip rule fires on the *clamped* accent, not the raw brand.
- **Very dark brand** (`#78350f`): lower clamp bound engages; hover/active floors hold (no negative L).
- **frequency = 'rarely'** + rewardType with habit mechanics: verdict = utility, habitMechanic patterns tagged `gatedBy`, non-habit patterns untouched.
- **Omitted optional ethics booleans**: no `quadrant`, no throw.

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check system/oklch.mjs && node --check system/wcag.mjs && node --check system/derive.rules.mjs && node --check system/derive.mjs && node --check tooling/spike-palette.mjs`

### Level 2: Unit

- The per-task `node -e` one-liners (oklch anchors, wcag anchors, ruleset frozen/versioned, derive happy-path + throw-path).

### Level 3: Integration

- `node tooling/spike-palette.mjs` — exit 0, all four stages `✓`.
- `node agent-layer/gen-token-css.mjs --check` — still `✓ no drift` (proves this ticket touched nothing in the token pipeline).

### Level 4: Manual

- `npx serve .` → `derive.html`: drive all four axes; confirm re-skin, checks, gating, notes, Reset. Then load `index.html` — unchanged neutral render (no regression on the shipped shell).

### Level 5: Recorded evidence

- `gh issue comment 3 --body-file …` (spike table + verdict) posted; verify with `gh issue view 3`.

## ACCEPTANCE CRITERIA

(ticket #3 verbatim, mapped)

- [ ] AC1 — Engine lives beside `system/site.js` as hand-written ES modules; zero runtime deps; color math hand-written (`oklch.mjs`/`wcag.mjs`/`derive.rules.mjs`/`derive.mjs`; no imports outside these files + node builtins in tooling).
- [ ] AC2 — Arbitrary brand color + density + reward type + frequency → complete value set for every contract semantic token (spike stage 2 proves ⊇ contract; harness proves live).
- [ ] AC3 — WCAG checker reports pass/fail per declared token pair; spike results over ≥5 colors (we run 8) recorded as a comment on issue #3.
- [ ] AC4 — Derivation rules exist as `system/derive.rules.mjs`, versioned (`1.0.0`+), frozen, comment-annotated, reader-inspectable.
- [ ] Spike-2 decision rule applied and its outcome (full live derivation vs color-only fallback) explicitly recorded in the issue before close.
- [ ] No regressions: `gen-token-css.mjs --check` clean; `index.html` renders identically under the neutral pack.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE command passed at the time.
- [ ] All Level 1–4 validation commands pass.
- [ ] Spike outcome commented on issue #3 (before any `Closes #3` reaches main).
- [ ] CLAUDE.md map line added.
- [ ] One atomic commit on `main`, message per convention, e.g.:
      `derive engine v1: OKLCH palette + scales + pattern/ethics rules, spike 2 folded (epic #1 ticket #3, architecture §Recommended approach)` — body includes `Closes #3`. Commit source AND `derive.html` AND the spike runner together (deploy = commit the artifacts; the repo is the proof).

## OPEN QUESTIONS / ASSUMPTIONS

Decisions this plan makes that the ticket left open (all flagged, none contradicts a recorded epic decision — proceed unless the user objects):

1. **Ruleset format: `.mjs` data module, not `.json`.** A frozen ES module imports identically in browser and Node with zero fetch/CORS/import-attribute compatibility surface, and carries the annotation comments that make it *inspectable* rather than merely readable. The architecture says "versioned artifact readers can inspect" — a commented module in an unbundled repo satisfies that; ticket #10 can render it as JSON via `JSON.stringify(RULESET)`. (Alternative rejected: `.json` + `import … with {type:'json'}` — adds a browser-compat consideration and can't carry comments.)
2. **Spike runner location: `tooling/spike-palette.mjs`.** It's factory tooling, not an `agent-layer` generator (it emits no site artifact) and not shipped view-time code. `tooling/` is currently untracked — add only the spike file.
3. **Accent lightness clamp** `[0.35, 0.60]` means the engine may *adjust* the brand color for accessibility. This is the derivation working as designed, reported in `notes` (honesty surface) — "unaided" in the decision rule means no per-color human tuning, which holds. Exact band is spike-tunable (= ruleset version bump).
4. **The 5 `color-mix()` inverse tokens are emitted as passthrough expressions**, not computed hexes — they are *relative* tokens that derive in CSS from the emitted bases, which is itself part of the system's design. They are excluded from WCAG pairs (alpha compositing isn't checkable without a backdrop assumption); the opaque inverse pairs are checked instead.
5. **Optional Manipulation Matrix inputs** (`improvesLives`, `wouldUseIt` → quadrant) are included in the ruleset even though the ticket names only frequency → verdict: the PRD's intake asks the matrix question, #10 will need it, and it's ~10 lines of data. Scope risk accepted as minimal; drop if it grows.
6. **"All token pairs" for the spike = the ruleset's declared 12-pair list** (every content/UI pairing the components actually create), not the 40×40 cross-product. The pair list living in the versioned ruleset makes this definition itself inspectable.
7. **Assumption:** Node ≥18 locally (uses only `cbrt`, `atan2`, ESM, `node:` builtins — nothing newer).

## NOTES (open canvas)

**Why the harness must exercise the dark band:** the inverse group is the most likely silent failure (nobody looks at the footer on a test page). One `.feature-band`-style dark section on `derive.html` makes bad `bg-inverse` derivation immediately visible.

**Design-it-twice on scales:** formula-driven spacing (base × factor) was rejected — factors like 0.75 break the 4px grid and force rounding policy; an explicit per-density table is honest, inspectable, and edge-case-free. Type keeps the ratio-driven modular scale because *that's* the concept worth demonstrating (and `typeSteps` exponents keep the ramp's shape hand-tunable without code changes). The split is deliberate: table where integrity matters, formula where the idea matters.

**Why patterns stay visible when gated:** stripping habit-mechanic patterns on a failed frequency filter would make the gate invisible — the whole point is Fieldwork-style "the method being honest, demonstrated." `gatedBy: 'frequency-filter'` + the harness rendering a struck-through/rejected treatment shows the gate *working*.

**Sequencing risk:** the only genuinely risky code is `oklch.mjs` (constants + gamut clamp). It's first, has hard numeric anchors, and everything downstream consumes it through two functions (`hexToOklch`/`oklchToHex` + `toGamut`). If anchors pass, palette bugs are recipe bugs (ruleset), not math bugs — which is exactly the tunable/versioned layer.

**Spike failure path:** <95% after recipe tuning → the decision rule scopes live derivation to color only with presets for the rest ("Screen-1 fallback"). That reshapes ticket #10's station, so it's a stop-and-flag, not a silent restructure. Culori is only on the table if *conversion quality itself* (banding, hue shifts) is the culprit — distinguish recipe failure (tune) from math failure (culori) before flagging.

**Contract stability note:** ticket #2 (DTCG inversion) has landed; `tokens.source.json:3-78` and `tokens.contract.css` agree today (40 leaf tokens). The spike's completeness stage turns any future contract growth into a loud failure instead of silent incompleteness — cheap insurance ticket #9 can inherit.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->

- 2026-07-17 — **Recipe tuned during implementation (pre-spike math, not post-spike patching); all changes live in `derive.rules.mjs` v1.0.0.** Working the WCAG luminance math (for greys, Y ≈ l³) before writing the ruleset showed three planned values could not clear their own declared pairs: (1) `fg-muted` at l 0.55 → ~4.38:1 on the card surface — below AA; even the hand-set neutral pack's `#6b7280`-on-`#f4f4f5` pairing sits at ~4.34. Tuned to **l 0.51** (~5.2:1). (2) `bg-surface` raised 0.965 → **0.97** for margin on the same pairs. (3) The static accent upper clamp 0.60 was insufficient for accent-as-*text* (needs Y ≤ 0.183 ⇒ l ≲ 0.57); replaced with clamp `[0.35, 0.60]` **plus an adaptive contrast floor** — darken in 0.01 steps until the accent reads ≥ 4.5:1 against the derived surface, which mathematically also secures accent-on-white and white-on-accent. (4) The planned `accent/bg-inverse @3.0` pair was **dropped** (11 pairs, not 12): one accent token would need luminance ≤ 0.183 and ≥ 0.141 simultaneously to serve text on both white and near-black — a window no brand hue survives; components never set accent text on dark (exclusion documented in the ruleset's wcagPairs commentary). Spike outcome with the tuned recipe: **88/88 pairs AA (100%), decision rule met → full live derivation** ([recorded on issue #3](https://github.com/linardsb/ux-factory/issues/3#issuecomment-5003376019)).
- 2026-07-17 — `derive.html` loads `system/portfolio.css` after `components.css` (plan said skip it): the harness's hero/card-kicker/`.hl` markup is styled there, and `index.html` ships the same four-stylesheet order. Bare-ness preserved — it's the shipped surface layer, not new chrome.
