# Feature: Portfolio Phase 5 — utility dock, scroll ruler, copy-prompt handoff, system graph

> Per-ticket implementation plan for **`portfolio-ux-uplift.md` §Phase 5** (lines 173–210 of that doc
> — the evebouffard.com-inspired "site as OS" mapping). Parent-plan decisions are inherited, not
> re-decided. Not a tracked GitHub issue (folded-in polish, same as motion phases 2–4) — no
> `Closes #N`. Planned 2026-07-20 against `main` @ `1a0b0a2` (phase 4 / PR #58 merged).
>
> The following plan should be complete, but validate documentation and codebase patterns and task
> sanity before you start implementing. Pay special attention to naming of existing utils and
> tokens — use SHIPPED names verified below, and import from the right files.

## Feature Description

Four honest mappings of the reference site's "personal site as OS" onto this repo's thesis (the
site IS a token-contract demo), delivered as **three independent PRs**:

- **PR A — Appearance dock + Copy tokens + scroll ruler.** A slim fixed right rail on the six
  shipped IA pages whose one icon opens an "Appearance" panel (hash-routed `#appearance`) listing
  the three real committed packs — **neutral · saulera · verdant** — and swapping the single
  `tokens.<pack>.css` `<head>` link live, persisted in `localStorage`. A "Copy tokens" button
  copies the active pack's CSS (the literal artifact skinning the page). A left rail of hairline
  ticks marks page sections, filled by scroll progress via `animation-timeline: scroll()`.
- **PR B — Per-component "Copy agent prompt"** on the handoff viewer: each component card copies a
  self-contained, fully-generated vocabulary excerpt (composition grammar + that component's
  entry) an agent could compose against.
- **PR C — "Shape of the system" exhibit**: a build-time generator scans `tokens.source.json` +
  `components.css` + the three pack files into `system/system-graph.json` (drift-checked); a
  view-time SVG module renders the token↔consumer graph as a new deep-linkable factory.html
  section, full dataset one click away.

Skipped from the reference (parent-plan call, final): cursor easter eggs, confetti, shaders,
wallpaper imagery, colored swatches in the panel — gimmick-risk / off-voice; panel chrome stays
monochrome (calm-colour rule).

## User Story

As a **hiring manager / senior UXE reviewer reading the portfolio**
I want to **re-skin the very page I'm reading from real committed packs, copy the artifact that did
it, and see the token contract's actual shape**
So that **the platform's "one-line re-skin" and "agent-legible system" claims are verified by me,
on the page, instead of asserted at me**.

## Problem Statement

The site claims "re-skinning a whole site is one line in each page's head" (README) and proves it
only inside CI (the VR gate swaps the pack file) and inside the factory wizard's preview. The
reader can't perform the claim themselves on the page they're reading. The handoff viewer shows
agent vocabulary but offers no way to take it. The token contract's structure (which components
consume which tokens, what each pack binds) is inspectable only by reading source.

## Solution Statement

Give the reader the same swap the CI gate performs (`visual.spec.mjs:58` serves the saulera file
in place of `tokens.neutral.css` — "the re-skin = swap the one pack file, executed literally"),
as a visible head-link swap they trigger. Make every copyable artifact the real committed file
(pack CSS, generated vocabulary JSON). Make the system's shape a generated, drift-checked artifact
rendered as an exhibit — never a hand-drawn diagram.

## Out of Scope / Non-Goals

- **Not adding the dock to** proto pages, raw driver pages (`derive/agentic/trace/handoff.html`),
  or `agentic-ui-study.html` (it loads site.js but stays out of scope — possible follow-up).
- **Not adding a third pack to the VR matrix.** `PACKS` in `visual.spec.mjs:38` stays
  `{neutral, saulera}` — 16 baselines. Saulera already proves the swap mechanism under CI.
- **Not touching `system/tokens.source.json`** — no new tokens are needed (verified below), so the
  gen-token-css + gen-handoff regen chain is NOT triggered in any of the three PRs.
- **Not tracking pack switches in analytics.** `trackFactoryDriven()` (`analytics.mjs:41`) is
  factory-specific and fire-once; a `/appearance/<pack>` virtual route is a possible follow-up.
- **Not building a reading-column tuner or any slider settings** (reference's `/home/column`) —
  no honest mapping onto the thesis.
- **Not restyling the panel per pack** beyond what the tokens themselves do.
- **Not changing `factory-intake.mjs`, `site.js` internals, or any existing exhibit.**

## Feature Metadata

**Feature Type**: Enhancement (3 shippable slices)
**Estimated Complexity**: PR A: Medium · PR B: Small · PR C: Medium-High
**Primary Systems Affected**: shipped IA pages (6), `system/portfolio.css`, new `system/*.mjs`
modules, `system/handoff-viewer.mjs` + `handoff.html`, `agent-layer/` generator + drift-check,
`factory.html`, VR spec + baselines, CLAUDE.md architecture map
**Dependencies**: none new — vanilla constraint holds; Docker for baseline regen only

## Related Work

**Implements**: `.claude/plans/portfolio-ux-uplift.md` §Phase 5 (lines 173–210)
**Epic**: same doc — its §Sequencing & guardrails + browser-support verdicts table are inherited

**Back-references**:
- `.claude/plans/portfolio-motion-phase03-factory-showpiece.md` — factory exhibit precedent
- `.claude/plans/portfolio-motion-phase04-visual-richness.md` — shipped the sticky-header fix
  (`components.css:44` `overflow-x: clip`) and header scroll-glass this feature sits beside
- `.claude/plans/visual-regression-gate.md` — "tokens.neutral.css is the single link the gate swaps"
- `__Final_phase.md` "Repo facts" block — VR/regen/commit discipline all three PRs follow

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

**Pages & chrome (PR A):**
- `index.html` lines 13–16 (head token links), 20–21 (`<main>` → direct-child `<section>`s),
  109–112 (script tail) — the pattern all six IA pages share. Same head block at
  `approach/work/contact/404.html:13-16`; factory's is at `factory.html:19-22` (its head also has
  a unique inline `<style>` from line 24 — insert before it, after line 22). Script tails:
  work 84–87 · contact 40–43 · 404 40–43 · approach 361–364 · factory 596–599.
- `system/site.js` — chrome-injection precedent (JS-injected header IS in the committed baselines,
  so a JS-injected dock is baseline-safe the same way). `esc()` 22–24; header inject 38–63;
  Escape-closes-menu listener 86–88 (mirror for panel close).
- `system/portfolio.js` (87 lines, classic IIFE) — `matchMedia("(prefers-reduced-motion: reduce)")`
  at 26; rAF-throttled scroll listener 34–43; `.skip-link` inject 8–16; `.to-top` 19–24.
- `system/portfolio.css` (786 lines) — reduced-motion kill-switch ~15–22 (forces
  `animation-duration: 0.01ms !important` — scroll-driven animations IGNORE duration, so the
  ruler fill survives it, which is correct: it's a position indicator, not autonomous motion);
  `.skip-link` fixed z-index 100 (line 25); `.to-top` z-index 90 (line 681); header scroll-glass
  `@supports` idiom 73–85; `@view-transition` 43–45.
- `system/components.css` — `.btn/.btn-primary/.btn-secondary` 155–229; `.site-header` sticky
  233–236; `html, body { overflow-x: hidden; overflow-x: clip; }` line 44.

**Packs & tokens (PR A + C):**
- `system/tokens.contract.css` — the 57 always-loaded contract slots incl. motion tokens 75–82:
  `--motion-fast` 160ms · `--motion-base` 200ms · `--motion-slow` 480ms · `--motion-ease` ·
  `--motion-ease-spring` · `--motion-stagger` · `--motion-rise` · `--motion-ambient`. USE THESE
  NAMES (the parent plan's proposed `--motion-duration-*` names never shipped).
- `system/tokens.neutral.css` (65 props) · `tokens.saulera.css` (56) · `tokens.verdant.css` (47) —
  all `:root`, all designed to load "in place of tokens.neutral.css (one head line)"
  (`tokens.verdant.css:5`). **Verified surface parity**: saulera/verdant omit only `--font-mono`,
  the 8 `--motion-*`, `--color-accent-wash`, and neutral's private primitives — all covered by
  contract fallbacks. `system/tokens.css` is the Trainline reference skin — NOT in the picker.
- `agent-layer/gen-pack-css.mjs` header (lines 1–28) — verdant provenance for honest panel copy:
  generated from the recorded pack-seed derivation, regenerate via `--verdant`.
- `agent-layer/gen-token-css.mjs` — `loadSource()` exported at 36, `cssValue()` at 64 (PR C reuses
  `loadSource` for the contract token list, as `token-lint.mjs:12` already does).

**VR gate (all PRs — read in full: `tooling/visual-regression/visual.spec.mjs`, 105 lines):**
- `PAGES` 15–37 (8 pages; factory's `waitReady` array at 31 — PR C appends a selector here);
  `PACKS` 38; hermeticity `beforeEach` 40–50; **the pack swap** at 58:
  `page.route('**/system/tokens.neutral.css', route => route.fulfill({ path: packPath }))`;
  text-wrap/min-height normalization 87; viewport resize 93–98; `document.fonts.ready` 77.
- `playwright.config.mjs` — `snapshotPathTemplate` 8; `colorScheme:'light'` 14;
  `reducedMotion:'reduce'` 15 (a NO-OP in practice — the gate effectively captures under
  no-preference, see memory + parent plan); `animations:'disabled'` + `maxDiffPixels:100` at 21;
  webServer on 127.0.0.1:4757 22–27. Fresh context per test — NO storageState/localStorage
  seeding anywhere (verified by grep), so the reader's stored pack can never leak into a capture.
- `.github/workflows/verify.yml` — `verify` job runs `node tooling/drift-check.mjs` (36–37) +
  `node tooling/token-lint.mjs` (38–39); `visual` job runs the Playwright suite in the pinned
  v1.61.1 container (41–65). Both on every PR.

**Handoff viewer (PR B):**
- `system/handoff-viewer.mjs` (257 lines) — `el(tag, attrs, ...children)` helper 24–34 (attrs
  object; NO onclick support — attach listeners via `addEventListener` after creation, as
  `trace-player.mjs:210-213` does); `prepareHandoff` 38–76 (PURE, Node-testable — do not touch);
  per-component render loop 191–249; **projection 3 `section.hv-vocab` at 239–245** (the button's
  insertion point — `c.vocab` and `model.composition` are both in scope there); `destroy()` 255.
- `handoff.html` — inline `hv-*` style block 23–126 (page owns viewer styles); mount `#viewer`
  147; driver module 152–184. **NOT in the VR `PAGES` set → no baseline regen for PR B.**
- `handoff/verdant/vocabulary.json` — shape: `{ $description, scenario, generatedFrom,
  composition: {shape, childrenRule, chipRule}, components: {<name>: {class, status, props,
  states, children, usage, contract}} }`, 8 components.

**Generator + exhibit pattern (PR C):**
- `agent-layer/gen-loc-summary.mjs` (76 lines) — THE template to mirror: `ROOT` resolved from
  module dir (17); `gen<Name>({check})` returning `{…, drifted:[]}` writing nothing in check mode
  (57–61); `pathToFileURL` standalone guard (68–76 — required, the repo path contains a space);
  output = `JSON.stringify(…, null, 2) + "\n"`.
- `tooling/drift-check.mjs` — registration pattern: import (~L15), a `check<Name>()` wrapper
  (58–64 for loc-summary), called in the main sequence 97–103. PR C adds `checkSystemGraph()`.
- `system/components.css` block headers — 28 blocks delimited `/* ---------- <Name> ---------- */`
  (spec-backed ones carry `(system/specs/<x>.md)`, e.g. lines 1519, 1572). 598 `var(--…)` refs,
  54 distinct token names (⊆ the 57 contract slots — token-lint's UNDECLARED check guarantees
  the subset relation, `tooling/token-lint.mjs:17-31`).
- `system/agentic-renderer.mjs` 132–155 — the repo's only SVG idiom: `createElementNS` with an
  `SVGNS` constant, `icon/svgPath/svgCircle` helpers. Mirror the namespace discipline.
- `factory.html` — exhibit anatomy to copy: `#round-trip` section 424–511 (deep-linkable,
  explicitly "NOT a station"); static-honesty-framing-then-mount idiom; `data-*="ready"` VR
  handles (e.g. trace module sets `data-trace="ready"` at 628); scroll-margin id list at line 29;
  Station 05 `#agents` ends ~583, closing CTA section 585–592 → **new `#shape` section goes
  between them**; `<main>` at 301.

### New Files to Create

- `system/pack-boot.js` — tiny classic parser-blocking pack restorer (PR A)
- `system/dock.mjs` — appearance dock + panel + copy-tokens + scroll ruler, one module (PR A)
- `agent-layer/gen-system-graph.mjs` — token↔consumer↔pack scanner (PR C)
- `system/system-graph.json` — GENERATED dataset (PR C)
- `system/system-graph.mjs` — `prepareGraph` + `renderSystemGraph` SVG exhibit module (PR C)

### Relevant Documentation

- [MDN: CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations)
  — `animation-timeline: scroll()`; parent plan's support verdict: ENHANCE (Chrome 115+,
  Safari 26; Firefox flagged) behind `@supports (animation-timeline: scroll())`, ticks visible
  without it.
- [MDN: Clipboard API `writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
  — needs secure context (https / 127.0.0.1 — both `npx serve` and production qualify) and may
  reject: always `.catch()` into "Copy failed" feedback.
- [APG Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) — the panel is a
  non-modal disclosure: `aria-expanded` + `aria-controls` on the trigger, Escape closes, focus
  moves in on open / returns to trigger on close.
- `scenarios/README.md` is NOT relevant; `.claude/references/token-system.md` only if a token
  question arises (none should).

### Patterns to Follow

- **DOM building**: `el()` helpers + `textContent`, never innerHTML from data
  (`handoff-viewer.mjs:21`). New modules define their own small `el()` (repo precedent: each
  module owns one).
- **File headers**: feature files open citing their governing doc — use
  `// system/dock.mjs — … (portfolio-ux-uplift §Phase 5)` style.
- **Buttons**: global `.btn .btn-secondary` (`components.css:155-229`); status feedback =
  `textContent` swap on the button (`trace-player.mjs:198,203`), no toast infrastructure.
- **Fixed chrome z-index ladder** (verified): header sticky 50 · `.to-top` 90 · `.skip-link` 100
  → dock/ruler rails **40** (under header), open panel **95** (over to-top, under skip-link).
- **Style placement**: site-chrome styles → `portfolio.css` (token values only — literals for pure
  structure are the existing portfolio.css norm; every color/space/duration comes from tokens).
  `token-lint`'s strict UNDECLARED check only scans `components.css` — which these PRs don't touch.
- **Honesty framing**: static prose that survives JS failure + a JS-filled mount + provenance
  caption naming the generator and the committed source (factory `#round-trip`, approach
  `#loc-proof` precedents).
- **Commit discipline**: one atomic commit per PR slice, message = what + doc ref
  (`… (portfolio-ux-uplift §Phase 5)`); stage by explicit path (shared worktree); verify branch
  right before committing.

---

## IMPLEMENTATION PLAN

### Phase A — Appearance dock, Copy tokens, scroll ruler (branch `feature/portfolio-phase05-dock`)

At-rest chrome on the six IA pages → **one deliberate baseline-regen PR: expect exactly 12
changed PNGs** (6 pages × 2 packs; proto pages don't load the dock and must NOT change).

### Phase B — Handoff "Copy agent prompt" (branch `feature/handoff-copy-prompt`)

**Independent of: Phase A and C** — parallelizable any time; `handoff.html` is not VR-captured,
so no baseline work and no PNG conflicts.

### Phase C — Shape of the system (branch `feature/system-graph`)

**Depends on: Phase A being merged** — only to serialize factory baseline PNG regens (both PRs
rewrite `factory-*.png`; parallel branches would conflict on binary files). No code dependency.

---

## STEP-BY-STEP TASKS

### A1. CREATE `system/pack-boot.js`

- **IMPLEMENT**: classic script (NOT a module — modules are deferred, too late to beat first
  paint). Header comment citing plan. Body (~15 lines): read
  `localStorage.getItem("factory-pack")` inside try/catch (private-mode Safari throws); if the
  value is `"saulera"` or `"verdant"` (hard allowlist — NEVER interpolate arbitrary storage into
  an href), find `document.querySelector('link[href="/system/tokens.neutral.css"]')` and set its
  `href` to `/system/tokens.<pack>.css`. Anything else (null, `"neutral"`, junk, missing link):
  do nothing.
- **GOTCHA (load-bearing, VR)**: the six pages' MARKUP must keep `tokens.neutral.css` as the
  default href — the VR harness's pack swap keys on that literal URL (`visual.spec.mjs:58`) and
  every VR context has empty localStorage, so this script must be a guaranteed no-op in CI.
- **VALIDATE**: `node --check system/pack-boot.js` (it's plain enough to parse as JS);
  functional check rides A6.

### A2. CREATE `system/dock.mjs`

- **IMPLEMENT**: ES module, header citing plan. On import (DOM already parsed — modules are
  deferred; site.js is classic so chrome exists):
  1. **Right rail**: `<aside class="dock">` appended to body, containing one
    `<button type="button" class="dock-toggle" aria-label="Appearance" aria-expanded="false"
    aria-controls="appearance">` with a small monochrome inline-SVG glyph (createElementNS,
    `agentic-renderer.mjs:132-155` idiom; aria-hidden svg).
  2. **Panel**: `<section class="dock-panel" id="appearance" role="dialog" aria-label="Appearance">`
    containing: (a) a `<fieldset>` of three radio rows — `neutral` "the no-brand default
    (generated)", `saulera` "reference client pack (hand-authored)", `verdant` "factory-derived —
    generated from the recorded pack-seed run"; (b) a `.btn .btn-secondary` **"Copy tokens"**
    button; (c) a plain link "DTCG source →" to `/handoff/verdant/tokens.dtcg.json`; (d) a muted
    caption: choosing a pack swaps the one stylesheet line in this page's head — the same swap a
    company build ships and the CI gate performs.
  3. **State machine**: `location.hash === "#appearance"` is the single source of truth. Trigger
    click sets/clears the hash; `hashchange` listener opens/closes (`.is-open` class +
    `aria-expanded`); Escape and outside-click clear the hash (mirror `site.js:86-88`); on open
    focus the checked radio, on close return focus to the trigger. Close strips the hash via
    `history.pushState(null, "", location.pathname)` (no scroll jump).
  4. **Pack switch**: radio `change` → validate against the same allowlist → swap the link href
    (same 3 lines as pack-boot; small deliberate duplication across script types) → persist via
    `try { localStorage.setItem("factory-pack", pack) } catch {}`. On load, reflect the ACTIVE
    pack by reading the current link href (not storage — href is ground truth).
  5. **Copy tokens**: `fetch(document.querySelector('link[href*="/system/tokens."]').href)` →
    `navigator.clipboard.writeText(text)` → button text "Copied ✓" reverting after ~1600 ms
    (store the timer, clear on re-click); any rejection → "Copy failed". Fetching the CURRENT
    href means the copied CSS is exactly the artifact skinning the page.
  6. **Left ruler**: `sections = document.querySelectorAll("main > section")`; if
    `sections.length >= 3`, append `<aside class="ruler" aria-hidden="true">` with a `.ruler-fill`
    track plus one `.ruler-tick` per section positioned at
    `section.offsetTop / document.documentElement.scrollHeight * 100 + "%"`; recompute tick
    positions on `resize` (rAF-throttled, mirror `portfolio.js:34-43`) and once on window `load`
    (post-font layout). Purely decorative → `aria-hidden`.
- **PATTERN**: DOM via a local `el()` helper + textContent; no innerHTML.
- **GOTCHA**: do NOT gate the ruler's existence on viewport width in JS — CSS media query handles
  visibility (A3) so resize needs no re-injection.
- **VALIDATE**: `node --check system/dock.mjs`; functional check rides A6.

### A3. ADD dock + ruler styles to `system/portfolio.css`

- **IMPLEMENT**: new commented section at the end. `.dock`: `position: fixed`, right edge,
  vertically centered, z-index 40; monochrome (`--color-fg-muted`, `--color-border`,
  `--color-bg-surface`); hairline border; toggle hover/focus states via existing token pattern.
  `.dock-panel`: fixed, anchored near the rail, z-index 95, `max-width` ~320px, tokens only;
  hidden by default, `.is-open` shows it; entrance = opacity + small translate using
  `var(--motion-base) var(--motion-ease)` (discrete open/close class toggle — no continuous
  rebuild, so no PR-#55 restart-and-blank trap; the kill-switch makes it instant under reduce).
  `.ruler`: fixed, left edge, z-index 40, hairline ticks (`--color-border`), fill bar in
  `--color-fg-muted`. Ruler fill:
  ```css
  @supports (animation-timeline: scroll()) {
    .ruler-fill { transform-origin: top; animation: ruler-fill linear both;
                  animation-timeline: scroll(); }
    @keyframes ruler-fill { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  }
  ```
  Outside `@supports`: fill stays at rest (ticks alone) — content visible by default. Both rails:
  `display: none` below `@media (min-width: 1100px)`; also `@media print`.
- **GOTCHA 1**: VR captures at width 1280 → rails ARE in baselines (deliberate; that's the
  at-rest change this PR pays for).
- **GOTCHA 2**: under the gate's `animations:'disabled'`, Playwright resolves the scroll-timeline
  fill to a deterministic endpoint (fast-forwarded or cancelled — either is stable run-to-run).
  Whatever the Docker regen bakes is fine; A7 includes eyeballing the new PNGs to confirm the
  fill state is consistent across all 12.
- **GOTCHA 3**: token-lint's ORPHAN check counts `var()` refs in portfolio.css — using motion
  tokens here only helps; no new token declarations anywhere.
- **VALIDATE**: `node tooling/token-lint.mjs` → ✓.

### A4. UPDATE the six IA pages (head + tail)

- **IMPLEMENT**: in `index/approach/work/contact/404.html` insert after line 16, and in
  `factory.html` after line 22 (before its inline `<style>`):
  `<script src="/system/pack-boot.js"></script>`
  In each script tail, after the `analytics.mjs` line:
  `<script type="module" src="/system/dock.mjs"></script>`
- **GOTCHA**: do NOT touch the four stylesheet link lines themselves; do NOT add either script to
  proto pages, raw drivers, or `agentic-ui-study.html`.
- **VALIDATE**: `grep -c 'pack-boot.js' index.html approach.html factory.html work.html
  contact.html 404.html` → six 1s; same for `dock.mjs`.

### A5. UPDATE `CLAUDE.md` architecture map

- **IMPLEMENT**: two lines in the `system/` block beside `site.js`, in the map's voice:
  `pack-boot.js` (pre-paint pack restore, allowlisted, no-op default) and `dock.mjs` (appearance
  dock + pack switcher + scroll ruler, hand-written canon, §Phase 5).
- **VALIDATE**: visual read.

### A6. Manual validation (the "run the surface you touched" gate)

- **IMPLEMENT**: `npx serve .` then, in Chrome AND Safari (VR single-engine blindspot memory):
  1. `http://localhost:3000/` → dock rail right, ruler left (index has 3 sections), neutral active.
  2. Open panel via icon → hash becomes `#appearance`; pick saulera → page re-skins instantly;
     the head link now reads `tokens.saulera.css` (DevTools). Saulera renders with fallback font
     stacks — expected: its `@import url("../fonts/fonts.css")` 404s (no `/fonts/` dir in repo;
     identical to what the committed saulera baselines render).
  3. Reload → saulera persists (pack-boot, no flash of neutral). Navigate to /approach →
     saulera persists cross-page.
  4. Copy tokens → paste in editor → the saulera pack CSS verbatim. Switch verdant → copy →
     verdant CSS.
  5. Direct-load `/#appearance` → panel open on arrival. Escape closes, focus returns to trigger.
     Tab order: trigger → radios → copy → link. Radios switch packs by keyboard.
  6. `/contact` → dock present, NO ruler (1 section). `/404` likewise.
  7. Narrow window below 1100px → both rails gone; hamburger nav unaffected.
  8. DevTools → emulate `prefers-reduced-motion: reduce` → panel opens instantly; ruler fill
     still tracks scroll (position indicator — correct).
  9. Scroll any long page → ruler fills top-to-bottom (Chrome/Safari 26); in Firefox ticks only.
- **VALIDATE**: all nine observed; fix before regen.

### A7. Regenerate VR baselines + commit

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`. Then
  `git status --porcelain baselines/` → **exactly 12 modified PNGs** (index/approach/factory/
  work/contact/404 × neutral+saulera). Proto PNGs modified → STOP, the dock leaked (check A4
  scope). Eyeball each new PNG: rails present, ruler-fill state consistent across all 12.
- **VALIDATE**: `node tooling/drift-check.mjs` ✓ and `node tooling/token-lint.mjs` ✓ on the clean
  tree; then commit (stage by explicit path: the 6 html, portfolio.css, 2 new system files,
  CLAUDE.md, 12 PNGs), branch verified, message
  `feat: appearance dock + pack switcher + scroll ruler (portfolio-ux-uplift §Phase 5)`.
- **SATISFIES**: AC #1–#5.

### B1. UPDATE `system/handoff-viewer.mjs` — copy-prompt button

- **IMPLEMENT**: inside the per-component loop's vocab projection (after the `pre.hv-json` build,
  L239–245 region): when `c.vocab` exists, build
  `el("button", { type: "button", class: "btn btn-secondary hv-copy" })` with text
  `Copy agent prompt`, `addEventListener("click", …)` →
  `navigator.clipboard.writeText(JSON.stringify({ composition: model.composition,
  components: { [c.name]: c.vocab } }, null, 2))` → "Copied ✓" / "Copy failed" textContent swap
  reverting ~1600 ms. Insert the button into the `hv-vocab` section beside its eyebrow.
  `model.composition` and `c.name`/`c.vocab` are already in scope. Do NOT touch `prepareHandoff`
  (pure) or `destroy`.
- **PATTERN**: `handoff-viewer.mjs` `el()` 24–34 (attrs object, no onclick) + listener idiom
  `trace-player.mjs:210-213` + feedback idiom `trace-player.mjs:198,203`.
- **HONESTY**: copied text is 100% generated data (vocabulary.json content) — no hand-written
  prose presented as agent material; the button label names what it is.
- **VALIDATE**: `node --check system/handoff-viewer.mjs`.

### B2. UPDATE `handoff.html` — button sizing style

- **IMPLEMENT**: in the inline `hv-*` style block (23–126), add `.hv-copy` (compact padding,
  `font-size: var(--type-caption)`, margin to sit right of the eyebrow) — page-owns-viewer-styles
  idiom, tokens for all values.
- **VALIDATE**: `npx serve .` → `/handoff.html` → every component card with a vocabulary entry
  shows the button; click → paste is valid JSON with `composition` + exactly one `components`
  key; card without vocab (if any) shows no button; no layout shift/overflow (check Safari too,
  `min-width:0` lesson if the button wraps oddly). handoff.html is NOT VR-captured — confirm
  `git status` shows no baseline changes. Commit:
  `feat: per-component copy-agent-prompt on the handoff viewer (portfolio-ux-uplift §Phase 5)`.
- **SATISFIES**: AC #6.

### C1. CREATE `agent-layer/gen-system-graph.mjs`

- **IMPLEMENT**: `export function genSystemGraph({ check = false } = {})`, MIRROR
  `gen-loc-summary.mjs` (ROOT from module dir; check-mode compares vs disk, writes nothing,
  returns `{ counts, drifted }`; `pathToFileURL` standalone guard; `--check` CLI exit 1 on drift).
  Scan:
  1. **Tokens**: `loadSource()` from `./gen-token-css.mjs` → the `contract` group's leaf tokens →
     `{ name, group }` (group = the contract section, e.g. `fg-surface`, `motion`).
  2. **Consumers**: split `system/components.css` on the block-header regex
     `^\/\* -{5,} (.+?) -{5,} \*\/$` (28 blocks today); per block collect DISTINCT
     `var\(\s*(--[a-z0-9-]+)` matches filtered to contract token names; emit
     `{ id (slugified label), label, spec (the "(system/specs/….md)" tail or null), tokens: [...] }`;
     drop zero-token blocks.
  3. **Pack bindings**: for each of `tokens.neutral.css / tokens.saulera.css / tokens.verdant.css`
     regex `^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);` declarations; per contract token record the raw
     declared value string per pack, or null (raw = honest: neutral's `var(--color-ink)` alias
     text is quoted verbatim, never resolved by hand).
  Output `system/system-graph.json`:
  `{ $description (names generator + sources + "do not edit"), tokens: [{name, group,
  packs: {neutral, saulera, verdant}}], consumers: [...], counts: {tokens, consumers, edges} }`
  + trailing newline. Throw plain `Error` naming the offending path/block on any parse anomaly
  (zero blocks, zero contract tokens).
- **VALIDATE**: `node agent-layer/gen-system-graph.mjs` prints its ✓ line; immediately
  `node agent-layer/gen-system-graph.mjs --check` → no drift. Sanity: `counts.tokens` = 57,
  `counts.consumers` ≈ 25–28, every consumer token ∈ contract (the token-lint UNDECLARED
  invariant makes this structural).

### C2. REGISTER in `tooling/drift-check.mjs`

- **IMPLEMENT**: import `genSystemGraph`; add `checkSystemGraph()` wrapper (MIRROR
  `checkLocSummary()` 58–64, drift message names the regenerate command); call it in the main
  sequence after `checkLocSummary` (97–103).
- **VALIDATE**: `node tooling/drift-check.mjs` → all ✓ incl. the new line; then
  `echo "/* x */" >> system/components.css && node tooling/drift-check.mjs` → RED on
  system-graph; `git checkout system/components.css` → green again. (This proves the guard bites.)

### C3. CREATE `system/system-graph.mjs`

- **IMPLEMENT**: hand-written canon header. `export function prepareGraph(json)` — PURE: validate
  top-level shape (throw naming the missing key), index token→consumers and consumer→tokens maps,
  return `{ tokens, consumers, byToken, byConsumer, counts }`.
  `export function renderSystemGraph(container, model)` — SVG via `createElementNS` (SVGNS
  constant, `agentic-renderer.mjs:132-155` discipline): two-column bipartite layout — left column
  token nodes grouped by contract section with group labels; right column consumer nodes (spec-
  backed ones marked); a legend line with real counts ("57 contract tokens · N consumer blocks ·
  3 packs — measured, not drawn"). **At rest NO edges are drawn** (calm + stable baseline);
  hover OR keyboard focus (`tabindex="0"` on every node, focus/blur mirror mouseenter/leave) on a
  token draws its edges + highlights consumers, and vice versa; a small detail line shows the
  focused token's three pack bindings verbatim. All colors/strokes from tokens
  (`--color-fg-muted`, `--color-border`, `--color-accent` for the highlight only). SVG sits in a
  scrolling `.sg-scroll` wrapper (`overflow-x: auto`; any grid/flex parent gets `min-width: 0` —
  the Safari blowout lesson).
- **VALIDATE**: `node --check system/system-graph.mjs`; render check rides C5.

### C4. UPDATE `factory.html` — the `#shape` exhibit section

- **IMPLEMENT**: new `<section class="section" id="shape">` between the `#agents` section (ends
  ~583) and the closing CTA section (585–592). MIRROR `#round-trip`'s anatomy: `h2` (not a
  numbered station — deep-linkable exhibit, comment it like `factory.html:421`), static honesty
  prose (what it is: the shipped contract's real shape; provenance: generated by
  `agent-layer/gen-system-graph.mjs` from `tokens.source.json` + a `components.css` scan,
  drift-checked in CI; nothing hand-drawn), a plain link "Full dataset →
  `/system/system-graph.json`", then mount `<div id="system-graph"></div>`. Inline module after
  the existing trace inline module (609–631 idiom): import `prepareGraph, renderSystemGraph`,
  `fetch("/system/system-graph.json")`, render, then set
  `mount.dataset.graph = "ready"`; on failure render the muted error line (trace module's
  errorCard idiom) and do NOT set ready. Add `#shape` to the scroll-margin-top id list at
  line 29. Styles: reuse `.section`/`.container`/prose classes; any `sg-*` structural styles go
  in factory.html's existing inline head `<style>` (page-owns-exhibit-styles idiom).
- **GOTCHA**: keep `#shape` OUT of the `cs-jump` station nav (315–319) — mirror `#round-trip`.
- **VALIDATE**: `npx serve .` → factory renders; `#shape` mounts; hover a token → consumers
  light; keyboard Tab reaches nodes and focus highlights; dataset link serves the JSON.

### C5. UPDATE `tooling/visual-regression/visual.spec.mjs` + CLAUDE.md + regen

- **IMPLEMENT**: append `'#system-graph[data-graph="ready"]'` to factory's `waitReady` array
  (line 31). CLAUDE.md map: add `system-graph.mjs` + `system-graph.json` lines beside the other
  system entries and `gen-system-graph.mjs` implicitly via the agent-layer `gen-*` line (add only
  what the map's grain requires — it lists system files individually, gen files collectively).
  Then `cd tooling/visual-regression && npm run update:docker` → expect **exactly 2 changed PNGs**
  (`factory-neutral.png`, `factory-saulera.png`).
- **GOTCHA**: if a factory PNG doesn't rewrite but the page visibly changed, apply the
  sub-perceptual memory (`rm` the PNG, re-run) — unlikely here, the section is large.
- **VALIDATE**: `node tooling/drift-check.mjs` ✓, `node tooling/token-lint.mjs` ✓, real-browser
  eyeball (Chrome + Safari), commit all (stage by path), message
  `feat: shape-of-the-system exhibit — generated token↔consumer graph (portfolio-ux-uplift §Phase 5)`.
- **SATISFIES**: AC #7–#9.

---

## TESTING STRATEGY

This repo has **no test suite, linter, or type-check by design** (CLAUDE.md) — validation =
"run the surface you touched" + the two CI gates (drift/lint `verify` job; Playwright `visual`
job). Do not invent a suite.

### Per-surface checks
- Generators: standalone run prints ✓; `--check` idempotence; the C2 red/green drift drill.
- Pages: render under the neutral pack via `npx serve .`; the A6/B2/C4 click-through scripts.
- Cross-browser: Chrome + Safari on every layout-bearing change (VR is single-engine).

### Edge Cases (all handled in tasks, listed for review)
- localStorage unavailable/poisoned → pack-boot + dock no-op to neutral (allowlist + try/catch).
- Clipboard rejection (permissions, non-secure context) → "Copy failed" feedback, no throw.
- Page with < 3 sections → no ruler (contact, 404); page without `<main>` → dock only, no crash.
- Firefox (no scroll-timeline) → static ticks; no `@supports` leak.
- Reduced-motion → panel instant, ruler still tracks scroll (correct: position, not motion).
- `system-graph.json` fetch failure → static honesty prose remains, no ready attr (VR would
  rightly time out → the gate catches a broken exhibit).
- VR fresh profile → pack-boot no-ops → harness interception unaffected (verified: no
  storageState anywhere in the harness).

## VALIDATION COMMANDS

### Level 1 — syntax & drift (every PR)
```bash
node tooling/drift-check.mjs        # includes node --check on all tracked .mjs
node tooling/token-lint.mjs
```
### Level 2 — generator (PR C)
```bash
node agent-layer/gen-system-graph.mjs && node agent-layer/gen-system-graph.mjs --check
```
### Level 3 — visual regression (PR A: 12 PNGs · PR C: 2 PNGs · PR B: none)
```bash
cd tooling/visual-regression && npm run update:docker && git status --porcelain baselines/
```
### Level 4 — manual (per-PR click-through scripts in A6 / B2 / C4)
```bash
npx serve .   # repo root
```

## ACCEPTANCE CRITERIA

- [ ] **1** Reader can switch neutral ⇄ saulera ⇄ verdant from the dock on all six IA pages; the
  swap is the head-link line; choice persists across reload + navigation; deep link `#appearance`
  opens the panel; keyboard + Escape + focus-return all work.
- [ ] **2** VR harness untouched by PR A except baselines: default markup still requests
  `tokens.neutral.css`; exactly 12 PNGs change; CI `visual` + `verify` jobs green.
- [ ] **3** "Copy tokens" yields the active pack's CSS verbatim; failure path shows "Copy failed".
- [ ] **4** Ruler: ticks per `main > section` on pages with ≥ 3, scroll-fill in supporting
  browsers, ticks-only elsewhere, absent below 1100px, `aria-hidden`.
- [ ] **5** Panel chrome monochrome; all new CSS values are tokens; no new tokens introduced;
  no change to `tokens.source.json` / `components.css` in PR A/B.
- [ ] **6** Every vocab-bearing handoff card copies valid JSON = `{composition, components:{name:
  entry}}`, all generated data; handoff.html baselines untouched.
- [ ] **7** `system/system-graph.json` is generated, drift-checked (red/green drill passes), and
  linked from the exhibit; counts real (57 tokens).
- [ ] **8** `#shape` exhibit renders from the committed JSON only; hover AND keyboard focus
  highlight consumers/tokens; pack bindings quoted verbatim; at-rest = no edges.
- [ ] **9** CLAUDE.md map lists the new canon files; each PR is one atomic commit with doc ref.

## COMPLETION CHECKLIST

- [ ] Tasks executed in order per PR; each VALIDATE passed at its task
- [ ] Level 1–4 commands green per PR; CI green on each PR
- [ ] Chrome + Safari eyeball done for A and C
- [ ] Baselines: A = 12 changed, B = 0, C = 2 — committed in their own PRs
- [ ] All nine acceptance criteria checked
- [ ] Parent plan `portfolio-ux-uplift.md` forward-reference updated (this file)

## OPEN QUESTIONS / ASSUMPTIONS

All previously-open calls are RESOLVED in this plan (no implement-time decisions left):
- Third pack = existing `system/tokens.verdant.css` (verified committed + surface-parity).
- "Copy tokens" copies pack CSS (not DTCG — the DTCG file only carries contract+neutral values).
- Dock scope = six IA pages only; VR pack matrix unchanged.
- Graph lives on factory.html as a non-station deep-linkable exhibit; dataset link = the raw
  committed JSON (repo-inspectable, honesty pattern).
- Ruler capture state under `animations:'disabled'` is deterministic either way; A7 eyeballs it.

Assumptions (verified 2026-07-20, re-verify only if `main` moved): head/tail line numbers per
page; `visual.spec.mjs` line anchors; 28 component blocks; `loadSource` export. If any grep in a
task disagrees with a cited line number, trust the grep — anchors may drift a few lines.

## NOTES (open canvas)

- **Why a shared `pack-boot.js` instead of six inline head scripts**: one source of truth,
  parser-blocking so pre-first-paint (a ~300-byte file under the `/system/*` 300s cache rule);
  inline copies would drift across six pages. No CSP exists (verified `_headers`) so either
  worked; shared file wins on maintenance.
- **Why the switch duplicates 3 lines between pack-boot (classic) and dock.mjs (module)**:
  sharing would force pack-boot to become a module (deferred → FOUC) or dock to lose module
  hygiene. Deliberate, commented duplication.
- **Why radios, not buttons**: free keyboard semantics + "exactly one active" is the true model.
- **Why no pack swatches**: parent plan pins "panel is monochrome chrome"; per-pack accents would
  require hardcoding pack values in JS (dishonest duplicate) or 3 extra fetches (scope).
- **Why edges only on hover/focus in the graph**: calm at rest, stable baseline, and the
  interaction IS the demonstration (hover a token → see its blast radius). Her
  trait-legend-with-counts idiom maps to the legend line + group counts.
- **Analytics follow-up** (deferred): a `/appearance/<pack>` virtual-route pageview on switch,
  patterned on `trackFactoryDriven()` — would tell you whether recruiters actually use the dock.
- **agentic-ui-study.html** loads full chrome but stays dock-less this pass; adding it later is
  two script tags.
- **Rejected: putting the graph on approach.html** — approach already carries annotated-source +
  probe + loc-proof (page weight), and factory is where exhibits with `data-ready` VR handles
  live; "the factory, performed" is the right home for a generated self-portrait of the system.
- **Sequencing note**: A → C serialize only for factory PNG conflicts; B floats. All three after
  this doc is committed; branch each off fresh `main`.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->
