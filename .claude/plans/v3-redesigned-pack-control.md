# Feature: P2d — Redesigned pack control (#76)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils/exports (`pack-derived.mjs` exports, `dock.mjs` helpers) and to the inline-vs-committed re-skin mechanics — the two token-application mechanisms coexist last-write-wins and the bugs live at their boundary.

## Feature Description

Redesign the side appearance control (`system/dock.mjs`, 205 LOC) as **the one persistent utility** of the v3 portfolio — the control from which the evaluator selects the brand design system the **whole site wears** while they explore. It survives from v2 but was the owner's worst v2 verdict ("weird colour selectors, for what, no idea"): a decorative-looking widget with no stated purpose. v3 fixes that on two axes at once — **it is redesigned to the v3 craft bar**, and it is **introduced by the spine's narrative** via a dedicated intro moment on Home so it is never an unexplained widget.

From the redesigned control the reader can select:
- the three **committed packs** (neutral / saulera / verdant) — line-swap via `pack-boot.js`, unchanged path,
- **"your brand"** once a derived record exists (from #74's `#beat-brand` input) — honestly labelled "derived here, not an official *&lt;label&gt;* design system",
- a one-click **reset to neutral**.

A **morphing toggle glyph** is added, consuming a new `icon-morph` motion token (added + consumed, per the owner's decision — the token-lint rejects unused tokens).

## User Story

As a hiring manager evaluating this portfolio
I want a clearly-introduced control that lets the whole site wear a brand — the committed packs, or my own colour once I've tried it
So that the platform's core "one line re-skins everything" claim is something I hold continuously as I explore, not a decorative widget I ignore.

## Problem Statement

The v2 side dock read as decoration with no stated purpose (owner verdict, PRD §2 Evidence row: "matches the owner's own 'weird colour selectors, for what' verdict"). It also cannot yet offer the visitor's own derived brand (shipped by #74 as an in-beat-only control), and it does not re-skin on a base that is honest for a derived brand.

## Solution Statement

1. **Redesign the disclosure** (owner-chosen form): keep the hash-routed toggle→panel disclosure (`/#appearance` deep-link + back-button honesty + APG non-modal disclosure — all correctness we keep), rebuild its interior to the v3 craft bar (band/close-card vocabulary, spring motion, `motion-tab-glide`/`motion-ease-settle` lineage), and add a **morphing toggle glyph** (`icon-morph` token).
2. **Add the derived "your brand" entry** — the dock imports `system/pack-derived.mjs` (already the record owner) and offers a fourth pack option when `readRecord()` returns a record, honestly labelled, kept in live sync with #74's `#beat-brand` control via a custom event.
3. **Honest re-skin base** — selecting "your brand" resets the committed `<link>` to the neutral base **then** applies the derived `--color-*` inline props, so a derived brand never inherits saulera/verdant's type/space/radius (confirmed: committed packs set 26 non-colour tokens).
4. **Fix the pre-wear lost-pick transient** (#74's `unwear()` comment charters this to #76): back up the committed pick before wearing derived; restore it on unwear, so wear-then-unwear returns to the pack they had, not neutral.
5. **Dedicated intro moment** (owner-chosen scope): a non-numbered spine interstitial on `index.html`, right after `#beat-brand`, that names and hands off to the control — meeting "introduced by the spine, not unexplained" in the narrative itself.
6. **`icon-morph` token** added to `tokens.source.json` (both groups, mirroring `motion-tab-glide`) + consumed by the glyph + full regen chain.

## Out of Scope / Non-Goals

- **Not removing or replacing #74's `#beat-brand` in-beat control.** That is the demo's *colour-entry* beat (beat 2b); the dock is the *switcher*. They coexist and stay in sync. `pack-derived.mjs`'s own comments assign these two roles.
- **Not de-fixing the dock.** It must stay fixed side chrome (like the header) to persist across all 8 IA pages — that persistence *is* "wear it while you explore, every page is proof". "Nothing floats" (D8) is satisfied by the spine *introducing* it (architecture line 17: "the pack control is redesigned and introduced by the spine"), not by anchoring it in-flow (which would kill cross-page persistence).
- **Not building a mobile pack switcher.** The dock is `display:none` below 1100px today; that stays. The intro interstitial degrades to non-interactive capability copy below 1100px (see Open Questions — the mobile switcher is genuine added scope, deferred).
- **Not adding a separate "forget your brand" affordance.** The ticket asks only for "reset to neutral"; reset keeps the record so the entry stays offered (the only reading consistent with acceptance "the derived entry appears once a your-brand pack exists").
- **Not changing the committed-pack line-swap path** (`pack-boot.js` saulera/verdant branch, `dock.mjs` `applyPack` href swap) — VR-relied-upon, kept byte-identical.
- **Not adding `skeleton-to-content` or other unlisted motion tokens** — only `icon-morph`, and only because it is consumed.

## Feature Metadata

**Feature Type**: Enhancement (redesign of an existing view-time module) + one new token
**Estimated Complexity**: Medium-High (state-machine at the inline↔committed boundary is the real difficulty; the CSS/markup is routine)
**Primary Systems Affected**: `system/dock.mjs`, `system/pack-derived.mjs` (shared seam), `system/pack-boot.js` (verify only), `system/portfolio.css`, `index.html`, `system/tokens.source.json` + regen chain
**Dependencies**: `#74` (merged — supplies `pack-derived.mjs` + the derived record it displays/resets). No external libraries.

## Related Work

**Implements**: [#76 — P2d Redesigned pack control](https://github.com/linardsb/ux-factory/issues/76) · **Epic**: [#70 — portfolio v3](https://github.com/linardsb/ux-factory/issues/70) · Architecture: `docs/epics/portfolio-v3-experience.architecture.md` (D5b persistence, "introduced by the spine", derived-record shape)

**Back-references** (plans this builds on / inherits from):

- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` — Why: #74 built `pack-derived.mjs` (the record, `wear`/`unwear`/`applyToRoot`/`clearRoot`/`readRecord`), the `pack-boot.js` derived branch, and the `#beat-brand` control. #76 consumes all of it and fixes the pre-wear transient #74 knowingly deferred.
- `.claude/plans/portfolio-ux-uplift.md` (§Phase 5) — Why: the dock + hash-routed disclosure + `pack-boot` line-swap it redesigns.
- `.claude/plans/v3-evidence-home-restructure.md` (#78) — Why: `motion-tab-glide` is the exact precedent for adding `icon-morph` (token in both groups + a `var()` consumer).

**Forward-references**:

- `#77` (investment close) and `#81` (private-instance spine) both run on the persistent-control model this ticket finalises. `#82` (hallway rounds) re-blocks VR and owns the authoritative full baseline regen.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/dock.mjs` (all 205 lines) — Why: the file being redesigned. Note `PACKS`/`PACK_IDS`/`PACK_RE` (lines 13-19), `packLink()`/`activePack()` (38-47) ground-truth-from-href, `applyPack()` (49-66) the committed line-swap + view-transition crossfade + `localStorage` set, `buildDock()` (70-175) the DOM + hash-disclosure state machine, `buildRuler()` (179-202).
- `system/pack-derived.mjs` (all 242 lines) — Why: the seam #76 consumes. Exports: `readRecord()` (100-110), `writeRecord()` (111-113), `clearRecord()` (115-117), `wear()` (121-123), `unwear()` (130-134), `applyToRoot()` (87-92), `clearRoot()` (93-96), `deriveBrandTokens()` (52-59), `sanitizeName()` (62-64), `SELECTOR_KEY`/`RECORD_KEY`/`NAME_MAX` (26-29). **Read the `unwear()` comment (124-134) — it explicitly charters #76 to fix the pre-wear lost-pick transient.** Read `wireBeatBrand()` (158-241) to see the in-beat control #76 must stay in sync with.
- `system/pack-boot.js` (all 38 lines) — Why: the pre-paint restorer. Committed branch (19-23) UNCHANGED; derived branch (24-37) applies inline `--color-*` on `:root` under a `KEY`/`HEX` allowlist. The default no-op (25) is VR-critical — do not touch. #76 does not edit this file; it must stay consistent with it (same selector values, same base assumption: derived sits on the neutral default markup).
- `system/portfolio.css` lines 855-976 — Why: existing `.dock*` / `.ruler` styles + the z-index ladder comment (848-853) + the `@media (max-width:1099px){ .dock,.ruler{display:none} }` (971-973) + `@media print` (974-976). Lines 882-905 are the disclosure animation (discrete `.is-open` keyframe — the PR-#55 continuous-rebuild trap is already avoided here; keep it that way).
- `index.html` lines 141-178 (`#beat-brand`) + 180-234 (`#beat-peak`) — Why: the intro interstitial mounts between them; mirror `.band`/`.beat-head`/`.beat-numeral`/`.beat-kicker`/`.beat-lead` structure. Lines 320-329: the script tags (`dock.mjs`, `spine.mjs`, `pack-derived.mjs` load order).
- `system/tokens.source.json` lines 65-79 (contract `motion` group) + 141-155 (neutral `motion` group) — Why: add `icon-morph` to BOTH, mirroring `motion-tab-glide` (79/155) exactly. Note both groups carry the identical motion set.
- `system/spine.mjs` lines 26-34 (`isWearingDerived`) + 130-151 (`heroBeat` revert) — Why: context only. The hero reverts by `removeProperty()`-ing `--color-*` keys ~1.2s in; #74 already guards the in-beat control against it (`pack-derived.mjs` 183-196). The dock renders on all pages but the hero is home-only; no new interaction, but know it exists.
- `tooling/token-lint.mjs` lines 1-45 — Why: the ORPHAN check (every contract token must be referenced by a shipped surface via `var(--name)` or `getPropertyValue("--name")`). `icon-morph` MUST be consumed or this exits 1 (blocking).
- `tooling/drift-check.mjs` lines 1-50 — Why: the blocking `verify` gate. It re-runs `genTokenCss`, `genAnnotatedSource`, `genLocSummary`, `genSystemGraph`, `genHandoff`, `genVocabulary`, `genPackBundle` in check mode. Any un-regenerated artifact → red.

### New Files to Create

- **None.** Every change is to an existing file (`dock.mjs`, `pack-derived.mjs`, `portfolio.css`, `index.html`, `tokens.source.json`) plus generated-artifact regen.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `.claude/skills/portfolio-design/references/CRAFT.md` — Why: the numeric craft rules (type ratios, 60/30/10, easing discipline) the redesign is held to. **Read before writing CSS.**
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — Why: the correctness checklist to run before committing.
- `docs/epics/portfolio-v3-experience.architecture.md` lines 15-24, 43-59 — Why: D5b persistence decision (b), the derived-record shape, "introduced by the spine", the P2 scope line, the spikes.
- `.claude/references/token-system.md` — Why: the token add mechanic + regen chain.
- `.claude/references/frontend-component-best-practices.md` — Why: on-demand UI context for this repo.

### Patterns to Follow

**DOM building** — `dock.mjs`'s `el(tag, attrs, ...children)` helper (lines 23-33; text via `textContent`, attrs via `setAttribute`). Reuse it; do not introduce `innerHTML`.

**Ground truth from the href, not storage** — `activePack()` reads the pack from the `<link>` href (`dock.mjs` 43-47). Storage is only cross-page memory. Keep this: the radio's checked state reflects the live href/inline state, never a stale storage read.

**Committed line-swap with witnessed crossfade** — `applyPack()` (49-66): `document.startViewTransition(swap)` when supported and not reduced-motion, else instant `link.href = …`; always `localStorage.setItem("factory-pack", pack)` in a try/catch. Reuse verbatim for the committed-pack path.

**Hard allowlist before any href/`:root` write** — `PACK_IDS.includes(pack)` (line 50) and `pack-derived.mjs`'s per-entry `KEY_NAME`/`HEX_VALUE` re-check (87-92). Never interpolate un-validated storage into an href or a `setProperty`.

**Motion token add** — mirror `motion-tab-glide` (#78): value in `tokens.source.json` both `motion` groups → `node agent-layer/gen-token-css.mjs` regenerates `tokens.contract.css` + `tokens.neutral.css` → consumed via `var(--motion-icon-morph)` in `portfolio.css`. Pair a "thing you touch" morph with `motion-ease-bounce` or `motion-ease-settle` (tokens.source.json 77-78), never an entrance curve.

**Discrete-render entrance, not continuous** — the disclosure animates on the discrete `.is-open` class toggle (`portfolio.css` 899-905), NOT on a continuously-rebuilt element (the PR-#55 trap; memory `entrance-anim-on-continuous-rebuild`). The morph glyph must be gated the same way — no keyframe that restarts on every render tick.

**localStorage always try/catch** — private mode → session-only (`dock.mjs` 65, `pack-derived.mjs` throughout).

**Node-import-safe module boot** — `pack-derived.mjs` self-boots behind `typeof document !== "undefined"` (241) so `node --check` / drift-check import cleanly. Any new module-level DOM access follows suit.

---

## IMPLEMENTATION PLAN

### Phase 1: The shared seam (`pack-derived.mjs`) — pre-wear backup + change event

**Independent of Phase 4** (token) — can proceed in parallel. Phases 2-3 depend on this.

Fix the pre-wear lost-pick transient in the shared module (both #74's in-beat toggle and #76's dock call `wear()`/`unwear()`, so fixing it here fixes both), and add a same-tab change event so the dock stays live-synced with the in-beat control.

**Tasks:**
- Add a `PREWEAR_KEY = "factory-pack-prewear"` export.
- `wear()`: before setting the selector to `derived`, read the current `factory-pack`; if it is a committed pick (`saulera`/`verdant`/`neutral`), store it under `PREWEAR_KEY` (skip if already `derived` — don't overwrite a real backup with `derived`).
- `unwear()`: restore the backed-up committed pick to `factory-pack` (or remove the selector → neutral if no backup), then clear `PREWEAR_KEY` — instead of only `removeItem`-ing the selector.
- Dispatch a `factory-brand-change` `CustomEvent` on `window` from `writeRecord`/`clearRecord`/`wear`/`unwear` so a mounted dock can re-sync (guard `typeof window`).

### Phase 2: The redesigned control (`dock.mjs` + `portfolio.css`)

**Depends on:** Phase 1 (imports the seam) and Phase 4 (consumes `--motion-icon-morph`).

Rebuild the disclosure interior to the v3 craft bar, add the derived pack option + reset, and implement the inline↔committed state machine.

**Tasks:**
- Import `{ readRecord, applyToRoot, clearRoot, wear, unwear, SELECTOR_KEY }` (and the change event name) from `./pack-derived.mjs`.
- Replace the single `applyPack(committed)` with a unified `selectPack(target)` implementing the state table (below).
- Render the "your brand" radio row conditionally on `readRecord()`, with the honest label; re-render on `factory-brand-change`.
- Add the morphing toggle glyph (SVG that morphs closed↔open, gated on `.is-open`/`aria-expanded`, `--motion-icon-morph`).
- Redesign `.dock*` CSS to the v3 vocabulary (keep the z-index ladder, the discrete `.is-open` keyframe, the 1100px + print hides).

### Phase 3: The spine intro interstitial (`index.html` + `portfolio.css`)

**Depends on:** Phase 2 (the affordance opens the redesigned control via `/#appearance`).

**Tasks:**
- Insert a non-numbered `.band` interstitial after `#beat-brand` (id `#beat-wear`), mirroring `.beat-head`/`.beat-kicker`/`.beat-lead`.
- Copy names + introduces the persistent control; a desktop-only affordance opens it (`href="#appearance"`).
- Below 1100px the affordance is hidden (mirror `.dock`'s media query); the explanatory copy stays honest at that width (promises no interactive control).

### Phase 4: Token — `icon-morph`

**Independent of Phases 1-3** (can be authored first or last), but its consumer lands in Phase 2, so the regen + lint must run AFTER Phase 2.

**Tasks:**
- Add `motion-icon-morph` to `tokens.source.json` both `motion` groups (mirror `motion-tab-glide`).
- Regenerate the token CSS; ensure `portfolio.css` consumes `var(--motion-icon-morph)`.

### Phase 5: Regen + validation

**Depends on:** all above.

**Tasks:**
- Run the full generator chain; confirm `drift-check` + `token-lint` clean.
- Regen affected VR baselines (non-blocking hygiene — see Notes).
- Cross-engine functional check (Chromium/Firefox/WebKit) of the switcher + morph.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### UPDATE system/pack-derived.mjs — pre-wear backup in wear()/unwear()

- **IMPLEMENT**: Add `export const PREWEAR_KEY = "factory-pack-prewear";`. In `wear()`: read `localStorage.getItem(SELECTOR_KEY)`; if it is `"saulera"`/`"verdant"`/`"neutral"` (a committed pick, i.e. not already `"derived"` and not null-as-derived), `setItem(PREWEAR_KEY, that)` before `setItem(SELECTOR_KEY, "derived")`. In `unwear()`: only act if the selector is currently `"derived"`; then read `PREWEAR_KEY` — if a committed value, `setItem(SELECTOR_KEY, prewear)`, else `removeItem(SELECTOR_KEY)`; finally `removeItem(PREWEAR_KEY)`. Keep every access in try/catch.
- **PATTERN**: existing `wear()`/`unwear()` (`system/pack-derived.mjs:121-134`) — mirror the try/catch shape.
- **GOTCHA**: `pack-boot.js` reads `factory-pack`; if `unwear()` restores `saulera`, pack-boot re-line-swaps to saulera pre-paint on the next nav — that is the correct, intended behaviour. Do NOT back up when the current selector is already `"derived"` (would overwrite a genuine pre-wear pick with `derived` and permanently lose it).
- **VALIDATE**: `node --check system/pack-derived.mjs`
- **SATISFIES**: acceptance "reset returns to neutral" + the #74-chartered pre-wear fix.

### UPDATE system/pack-derived.mjs — same-tab change event

- **IMPLEMENT**: Add a private `emitBrandChange()` that, guarded by `typeof window !== "undefined"`, does `window.dispatchEvent(new CustomEvent("factory-brand-change"))`. Call it at the end of `writeRecord`, `clearRecord`, `wear`, `unwear`. Export the event name: `export const BRAND_CHANGE_EVENT = "factory-brand-change";`.
- **PATTERN**: the `typeof document` self-boot guard (`system/pack-derived.mjs:241`) — same defensive posture for `window`.
- **GOTCHA**: `storage` events do NOT fire in the same tab — a CustomEvent is required for the dock to react to the in-beat control live. Do not rely on `window.onstorage`.
- **VALIDATE**: `node --check system/pack-derived.mjs`
- **SATISFIES**: acceptance "the derived entry appears once a your-brand pack exists" (live, without reload).

### UPDATE system/tokens.source.json — add motion-icon-morph (both groups)

- **IMPLEMENT**: In the contract `motion` group (~line 79, after `motion-tab-glide`) and the neutral `motion` group (~line 155), add:
  `"motion-icon-morph": { "$value": "220ms", "$type": "duration", "$description": "appearance-control toggle glyph morph (closed↔open) — a thing you touch, paired with motion-ease-bounce" }`
  (tune the value during craft review; 220ms is a starting point between `motion-base` 200 and `motion-tab-glide` 260.)
- **PATTERN**: `motion-tab-glide` entries (`system/tokens.source.json:79` and `:155`) — identical shape, both groups.
- **GOTCHA**: it MUST appear in BOTH groups or `gen-token-css` emits an inconsistent contract vs neutral pair. Do not add a `$type: easing` token — the curve is an existing `motion-ease-*`; `icon-morph` is a duration.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('system/tokens.source.json','utf8')); console.log('json ok')"`
- **SATISFIES**: acceptance "icon-morph added and consumed if used".

### UPDATE agent-layer regen — token CSS

- **IMPLEMENT**: `node agent-layer/gen-token-css.mjs` — regenerates `system/tokens.contract.css` + `system/tokens.neutral.css` with `--motion-icon-morph`.
- **VALIDATE**: `grep -n "motion-icon-morph" system/tokens.contract.css system/tokens.neutral.css` (both must show it)
- **SATISFIES**: token pipeline integrity.

### UPDATE system/dock.mjs — import the seam + unified selectPack state machine

- **IMPLEMENT**: Import `{ readRecord, applyToRoot, clearRoot, wear, unwear, SELECTOR_KEY, BRAND_CHANGE_EVENT }` from `"./pack-derived.mjs"`. Replace `applyPack()` with `selectPack(target)` per the **State Table** (Notes §State machine). Track a module-scoped `wornDerivedTokens` (the `--color-*` map currently inline on `:root`, or `null`). Committed targets: `clearRoot(wornDerivedTokens)` if leaving derived → then the existing view-transition line-swap → `setItem(SELECTOR_KEY, target)` → `removeItem(PREWEAR_KEY)` (explicit pick). Derived target: back up + line-swap the `<link>` to `/system/tokens.neutral.css` FIRST → `applyToRoot(rec.tokens)` → `wear()`. Update radio checked state after every transition.
- **PATTERN**: `applyPack()` view-transition swap (`system/dock.mjs:49-66`); `activePack()` href ground-truth (43-47).
- **IMPORTS**: `./pack-derived.mjs` (ESM; loads `derive.mjs` too — a stated, accepted cost on all 8 pages; the module is document-guarded so its self-boot no-ops without `#beat-brand`).
- **GOTCHA (the core bug)**: committed packs set type/space/radius (confirmed: saulera/verdant carry 26 non-colour tokens), so wearing derived over a saulera `<link>` would blend saulera's typography with derived colours. Selecting derived MUST reset the `<link>` to neutral base before `applyToRoot`. And `clearRoot` MUST run BEFORE a line-swap when leaving derived, or the inline `--color-*` props override the new committed pack (memory `derived-pack-inline-vs-stylesheet`).
- **VALIDATE**: `node --check system/dock.mjs`
- **SATISFIES**: acceptance "switches across committed packs, applies site-wide" + "derived entry honestly labelled".

### UPDATE system/dock.mjs — conditional "your brand" row + honest label + live sync

- **IMPLEMENT**: Build the pack rows from the three committed `PACKS` plus, when `readRecord()` returns a record, a fourth `derived` row: name "your brand", note `"derived here, not an official " + (label ? label : "brand") + " design system"` (label from `rec.label`, already sanitized+capped by #74; render via `textContent`). Add a listener for `BRAND_CHANGE_EVENT` that re-derives whether the derived row should exist and re-syncs the checked radio to the live `:root` state.
- **PATTERN**: the existing `for (const p of PACKS)` row builder (`system/dock.mjs:93-100`); honest-label copy style in `pack-derived.mjs:149-152`.
- **GOTCHA**: the name is visitor input — `textContent` only, never `setAttribute`/`innerHTML`. `readRecord()` already returns `null` for a malformed/foreign record, so the row simply won't appear — don't re-validate its shape here.
- **VALIDATE**: manual (Task "run the surface"): enter a colour in `#beat-brand`, confirm the dock gains the "your brand" row without reload.
- **SATISFIES**: acceptance "derived entry appears once a your-brand pack exists".

### UPDATE system/dock.mjs — reset-to-neutral affordance

- **IMPLEMENT**: A "Reset to neutral" button in the panel → `selectPack("neutral")` (which clears any inline derived props, line-swaps to neutral, sets selector neutral, clears the pre-wear backup) while KEEPING the derived record (so the "your brand" row stays offered). Reflect neutral as the checked radio.
- **PATTERN**: `dock-copy` button construction (`system/dock.mjs:102`, 124-137) for the button + transient-label idiom if a confirmation flash is wanted.
- **GOTCHA**: reset must NOT `clearRecord()` — forgetting the record would remove the "your brand" row, contradicting acceptance. Reset = to-neutral, record retained.
- **VALIDATE**: manual — wear derived, click reset, confirm site returns to neutral AND "your brand" row remains.
- **SATISFIES**: acceptance "reset returns to neutral".

### UPDATE system/dock.mjs — morphing toggle glyph

- **IMPLEMENT**: Replace/extend the static half-circle glyph (`system/dock.mjs:76-89`) with an SVG whose shape morphs on open↔close, driven by CSS `transition`/`transform` keyed on the toggle's `aria-expanded="true"` / panel `.is-open` (discrete state, not continuous). Duration `var(--motion-icon-morph)`, curve `var(--motion-ease-bounce)` (a thing you touch).
- **PATTERN**: the discrete `.is-open` animation gate (`portfolio.css:899-905`); the press-squish transform on `.dock-toggle:active` (862-875) already uses `motion-bounce`.
- **GOTCHA**: gate on a DISCRETE class/attribute, not a per-render keyframe (memory `entrance-anim-on-continuous-rebuild` / PR-#55). Under reduced motion the morph must be instant — the existing `portfolio.css` reduced-motion kill-switch (16-23) handles duration overrides; verify the glyph respects it.
- **VALIDATE**: manual cross-engine (Chromium/Firefox/WebKit) — open/close, confirm the morph runs and is instant under `prefers-reduced-motion: reduce`.
- **SATISFIES**: acceptance "icon-morph added and consumed".

### UPDATE system/portfolio.css — redesign .dock* + consume --motion-icon-morph + intro band

- **IMPLEMENT**: Rebuild `.dock*` styles (855-931) to the v3 craft bar (token-only colour/space/radius/type/motion; px/grid structural literals allowed per the file norm, 852). Add the glyph-morph rule consuming `var(--motion-icon-morph)`. Add `.beat-wear` (or reuse `.band`) styles for the intro interstitial. Keep the z-index ladder (848-851), the discrete `.is-open` keyframe (899-905), and the `@media (max-width:1099px)` + `@media print` hides (971-976). Add a `@media (max-width:1099px)` rule hiding the intro's open-control affordance.
- **PATTERN**: `.band`/`.beat-*`/`.close-card` v3 organisms (portfolio.css from ~978); CRAFT.md numeric rules.
- **GOTCHA**: a literal colour or a non-token duration in `.dock*` is a token-discipline bug (CLAUDE.md). Every value is `var(--…)` except structural px/grid.
- **VALIDATE**: `node tooling/token-lint.mjs` (icon-morph now consumed → no ORPHAN; no UNDECLARED)
- **SATISFIES**: acceptance "craft bar §6.4" + "icon-morph consumed".

### UPDATE index.html — the dedicated intro interstitial

- **IMPLEMENT**: Between `#beat-brand` (ends ~178) and `#beat-peak` (starts 180), insert a non-numbered `<section class="band" id="beat-wear">` with `.beat-head` (kicker e.g. "Wear it while you explore", a title, a `.beat-lead` explaining the persistent appearance control), and a desktop-only affordance `<a class="btn btn-secondary" href="#appearance">Open the appearance control</a>` that opens the dock. No `.beat-numeral` (it is a meta-utility, outside the 01–05 pipeline sequence — see Notes).
- **PATTERN**: `#beat-brand` / `#beat-close` markup (index.html 144-178, 237-254).
- **GOTCHA**: do NOT add a numeral — the 01–05 numerals are the build pipeline (I4 "a real sequence"); a 6th number would misread. Copy must not promise an interactive control at widths where the dock is hidden (<1100px).
- **VALIDATE**: serve the repo, load `/`, confirm the interstitial renders between brand and peak, the affordance opens `/#appearance`, and at <1100px the affordance is hidden and the copy stays honest.
- **SATISFIES**: acceptance "anchored/introduced by the spine narrative — not a floating widget".

### UPDATE generated artifacts — full regen chain

- **IMPLEMENT**: After all source + token changes AND `git add`-ing the touched source files (loc-summary counts tracked content — memory `loc-summary-counts-tracked-only`): run `node agent-layer/gen-token-css.mjs`, `node agent-layer/gen-handoff.mjs`, `node agent-layer/gen-loc-summary.mjs`, `node agent-layer/gen-system-graph.mjs`. Then `node tooling/drift-check.mjs` must exit 0.
- **PATTERN**: memory `token-change-regen-handoff-pack` (a tokens.source.json change needs gen-handoff too) + `loc-summary-baseline-cascade`.
- **GOTCHA**: `gen-loc-summary` reads git-tracked content — stage the source edits before regenerating or it reports stale counts (and `--check`/drift-check catches it). If the branch is behind origin, merge first, then regen (memory `drift-check-mid-merge-false-positive`).
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` (both exit 0)
- **SATISFIES**: the blocking `verify` gate stays green.

### UPDATE VR baselines — regen affected pages (non-blocking hygiene)

- **IMPLEMENT**: The dock change churns all 8 pages × 2 packs (VR shoots at 1280px, where the dock renders); index.html additionally changes for the intro band. VR is D11-frozen non-blocking on `feature/v3-*` (memory `v3-vr-freeze-live`), so this is hygiene, not a gate. Regenerate to keep the diff meaningful: `cd tooling/visual-regression && npm run update:docker` (Linux baselines; local macOS run is not authoritative — memory `local-agent-visual-gate-notes`).
- **GOTCHA**: `update:docker` won't rewrite a baseline whose only delta is sub-perceptual — `rm` that PNG to force it (memory `vr-update-skips-subperceptual`). The approach page has a live count-up flake under VR (memory `vr-gate-approach-countup-flake`) — a non-blocking diff there is expected. If regen is deferred, say so explicitly in the PR (memory: no silent caps); `#82` owns the authoritative full regen + re-block.
- **VALIDATE**: `cd tooling/visual-regression && git status baselines/` (expected churn present or consciously deferred)
- **SATISFIES**: milestone baseline hygiene (D11).

### VERIFY — run the surface (cross-engine)

- **IMPLEMENT**: `npx serve .` (repo root). In Chromium, Firefox, and WebKit (memory `cross-engine-motion-verify`: `webkit`=Safari; python serves `.mjs` as `text/javascript`): (1) open the dock, morph runs; (2) switch neutral→saulera→verdant, whole page re-skins, `/#appearance` deep-link works, back button closes; (3) enter a colour in `#beat-brand`, the "your brand" row appears live; select it — colours apply on a NEUTRAL base (not saulera type); (4) with saulera active, wear derived, then unwear via #beat-brand toggle → returns to saulera (pre-wear fix); (5) reset → neutral, "your brand" row remains; (6) reduced-motion → morph + crossfade instant.
- **VALIDATE**: all six pass in all three engines; console clean on `/` (home renders 0-error — memory `headless-render-data-pages-worker-refused`).
- **SATISFIES**: the full acceptance set + §6.4 Vercel-charter cross-engine bar.

---

## TESTING STRATEGY

No unit-test suite exists (CLAUDE.md: "no suite, no linter, no type-check"). "Done" = run the surface + the generator/lint gates.

### Unit-equivalent
- `node --check` on every edited `.mjs` (`dock.mjs`, `pack-derived.mjs`) — via drift-check's syntax step or directly.
- `node tooling/token-lint.mjs` — icon-morph consumed (no ORPHAN), no UNDECLARED.
- `node tooling/drift-check.mjs` — all generated artifacts match a fresh regen.

### Integration-equivalent (manual, the VERIFY task)
The six-point cross-engine walkthrough above is the integration test — it exercises the inline↔committed state machine end-to-end, which is where the risk concentrates.

### Edge Cases (must be walked)
- **saulera active → wear derived**: derived colours on neutral type, NOT saulera type.
- **derived worn → select verdant**: inline `--color-*` cleared (no ghost derived colours over verdant).
- **pre-wear pick restore**: saulera → wear derived → unwear → back to saulera (not neutral).
- **reset keeps the record**: "your brand" row survives a reset.
- **no record**: the "your brand" row is absent; the dock behaves exactly as v2 for committed packs.
- **private-mode / storage throws**: no uncaught error; session-only behaviour.
- **reduced motion**: morph + crossfade instant; disclosure open/close instant.
- **<1100px**: dock hidden; intro interstitial affordance hidden; copy still honest.
- **cross-page persistence**: wear derived on home, navigate to `/work` → still worn (pack-boot pre-paint, no flash).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Token discipline
```
node --check system/dock.mjs
node --check system/pack-derived.mjs
node -e "JSON.parse(require('fs').readFileSync('system/tokens.source.json','utf8'))"
node tooling/token-lint.mjs
```
### Level 2: Generator drift (blocking gate)
```
node agent-layer/gen-token-css.mjs
node agent-layer/gen-handoff.mjs
node agent-layer/gen-loc-summary.mjs      # after git add of source edits
node agent-layer/gen-system-graph.mjs
node tooling/drift-check.mjs               # must exit 0
```
### Level 3: (n/a — no integration harness)
### Level 4: Manual — the six-point cross-engine VERIFY walkthrough (above)
### Level 5: VR (non-blocking on this branch)
```
cd tooling/visual-regression && npm run update:docker    # baseline hygiene, D11-frozen
```

---

## ACCEPTANCE CRITERIA

- [ ] Switches across the three committed packs and applies site-wide; the committed-pack allowlist + line-swap path is byte-identical to today (VR-relied-upon).
- [ ] The `derived` "your brand" entry appears once a your-brand record exists (live, no reload), honestly labelled "derived here, not an official *&lt;label&gt;* design system".
- [ ] Selecting "your brand" applies derived colours on the NEUTRAL base (never blended with a committed pack's type/space).
- [ ] Reset returns to neutral and KEEPS the derived record (the entry stays offered).
- [ ] Pre-wear pick is restored on unwear (saulera → wear derived → unwear → saulera), fixing #74's transient.
- [ ] Anchored/introduced by the spine narrative — the `#beat-wear` interstitial names + hands off to the control; nothing reads as an unexplained floating widget.
- [ ] `icon-morph` token added to both `tokens.source.json` groups AND consumed by the glyph (token-lint passes, no ORPHAN); regen chain run.
- [ ] Craft bar §6.4 self-audit: custom interaction, reasoned motion (spring-derived), from-scratch, empty/no-record + private-mode + reduced-motion states handled, cross-engine clean.
- [ ] `drift-check` + `token-lint` exit 0.
- [ ] `<1100px`: dock hidden, intro affordance hidden, copy honest.
- [ ] No console errors on `/`; cross-page persistence works with no flash.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each validation passed.
- [ ] `drift-check` + `token-lint` green.
- [ ] Six-point cross-engine walkthrough passes (Chromium/Firefox/WebKit).
- [ ] VR baselines regenerated (or deferral stated explicitly in the PR).
- [ ] `pack-boot.js` committed path unchanged (git diff shows no edit to lines 19-23 / the no-op default).
- [ ] Branch `feature/v3-pack-control`; one atomic commit `feat: v3 redesigned pack control … (#76)`.
- [ ] Acceptance criteria all met.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (proceeding on these):**
1. The dock stays fixed side chrome (persistence across 8 pages is a hard requirement); "introduced by the spine / nothing floats" is met by the `#beat-wear` interstitial, per architecture line 17. — confirmed by owner (chose "Dedicated intro beat").
2. Redesigned disclosure form retained (hash-routed toggle→panel) — owner-confirmed.
3. `icon-morph` added + consumed via a real morphing glyph — owner-confirmed.
4. Reset = to-neutral, record retained (no separate "forget"); pre-wear restore is the `unwear()` semantic. — derived from acceptance + advisor concurrence.
5. Derived always sits on the neutral base (committed packs carry non-colour tokens — verified).
6. The intro interstitial is non-numbered (meta-utility, outside the 01–05 pipeline).

**Open question — mobile (<1100px):** The dock is desktop-only today; the intro interstitial renders at all widths but introduces a control absent on mobile. **Default taken:** the interstitial degrades to non-interactive capability copy below 1100px (affordance hidden, copy makes no interactive promise). A real mobile pack switcher is genuine added scope — **flag for the owner / `#82` hallway round-1 (phone read).** If the owner wants a mobile switcher, that is a follow-up ticket, not #76.

**Open question — intro placement:** after `#beat-brand` (chosen — tightest narrative coupling: you branded it → wear it everywhere). Alternative was heading the Verify beat ("wear it while you explore" pairs with "explore the evidence"); rejected as it separates the control from the brand it wears. Revisit if hallway round-1 finds the placement reads oddly.

## NOTES (open canvas)

### State machine — the core deliverable (write as a table, not prose)

Selector key `factory-pack` ∈ {absent/neutral, saulera, verdant, derived}. Record key `factory-pack-derived` (the JSON, survives toggles). New backup key `factory-pack-prewear` (the committed pick active when derived was worn). Inline `--color-*` on `:root` = "derived is on". Committed `<link>` href = the base pack.

`selectPack(target)` transitions (dock; explicit user pick):

| From \ To | neutral | saulera / verdant | your brand (derived) |
|---|---|---|---|
| **neutral** | link→neutral; sel=neutral; clear prewear | link→pack (crossfade); sel=pack; clear prewear | backup sel→prewear; link→**neutral**; `applyToRoot`; `wear()` |
| **saulera / verdant** | `clearRoot`? no (none inline); link→neutral; sel=neutral; clear prewear | link→pack (crossfade); sel=pack; clear prewear | backup sel→prewear; link→**neutral**; `applyToRoot`; `wear()` |
| **derived** | `clearRoot(worn)`; link→neutral; sel=neutral; clear prewear | `clearRoot(worn)` FIRST; link→pack; sel=pack; clear prewear | (no-op / re-assert) |

Non-dock path (#74 in-beat "Wear it" toggle OFF) calls `unwear()` → restores `factory-pack-prewear` (or neutral) + clears backup. This is why the backup lives in the shared `pack-derived.mjs`, not in `dock.mjs`: both controls must honour it.

**Invariants:**
- `clearRoot` before any line-swap when leaving derived (else inline colours ghost over the new pack).
- Derived's base is ALWAYS neutral (committed packs carry type/space/radius).
- `pack-boot.js` unchanged: on reload, `factory-pack=derived` → inline colours on the neutral default markup (byte-for-byte consistent with the live path). `factory-pack=saulera` (restored by unwear) → pre-paint line-swap. The no-record / neutral default stays a guaranteed no-op (VR-critical).

### Why `dock.mjs` importing `pack-derived.mjs` is safe on all 8 pages
ESM singleton; `pack-derived.mjs` self-boots `wireBeatBrand()` behind `typeof document`, which no-ops without `#beat-brand` (only home has it). It pulls in `derive.mjs` (pure, ~parses instantly) on every page — a stated, accepted cost, not an accident. No page but home ever calls `derive()` unless the reader enters a colour there; the dock only reads the already-stored record.

### VR / D11
1280px capture → dock visible → 16 baselines churn + index for the new band. Non-blocking on `feature/v3-*` (job-level `continue-on-error`; run green, check red, mergeState UNSTABLE — memory `v3-vr-freeze-live`). `#82` re-blocks + does the authoritative full regen. Regen here is hygiene; deferring is allowed if stated.

### Confidence drivers
The risk is entirely the state machine at the inline↔committed boundary — fully specified above with the verified fact (packs carry non-colour tokens) that forces the neutral-base rule. The CSS/markup/token work is routine and has an exact precedent (`motion-tab-glide`). The pre-wear fix is small and spec-sanctioned.

## AMENDMENTS

- (none — created 2026-07-24)
