# Feature: Portfolio motion Phase 4 — Visual richness (restrained, token-driven)

The following plan should be complete, but validate documentation and codebase patterns and
task sanity before you start implementing. Pay special attention to naming of existing
tokens and the generated-artifact regen chain — several CI gates fire on a token change.

## Feature Description

Phase 4 of the portfolio UX-uplift plan (`.claude/plans/portfolio-ux-uplift.md` §Phase 4).
Four small at-rest visual moves that add texture and depth to the shipped IA pages without
breaking the austere editorial voice:

1. **Hero atmosphere** — a barely-there static radial glow behind every `.page-hero`,
   built from `color-mix` of `--color-accent` at ≤5% alpha, driven by a new contract token
   so packs inherit (neutral = faint cool blue, saulera = faint amber) and can retune it.
2. **Grain** — one inline `feTurbulence` data-URI at ~4% opacity on the dark surfaces only
   (`.feature-band` + `.site-footer`), breaking the "rendered, not touched" flatness.
3. **Header glass on scroll** — TWO pre-existing defects surfaced and were verified live
   during planning: (a) the header's `backdrop-filter: blur(8px)` is **inert** (the
   background is fully opaque), and (b) **the header does not stick at all** —
   `html, body { overflow-x: hidden; }` (`components.css:40`) makes `body` a scroll
   container, which unbinds `position: sticky` from the viewport (measured on the clean
   shipped page: header at `top:-900` at `scrollY:900`). Phase 4 fixes the scroll
   container (`overflow-x: clip` with `hidden` fallback — fix verified live:
   `stickyTop:0` at `scrollY:900`) and builds the glass on the restored sticky state:
   `.is-scrolled` only — translucent background + saturate boost + hairline inner
   highlight.
4. **Type** — section numerals switch to a monospace stamp (`--font-mono`, new contract
   token) with `tabular-nums`; the numeral metadata organisms (`.cs-meta .n`,
   `.hero-stat .value`, `.hero-meta .item strong`) go **full mono** too (user decision,
   2026-07-20). Note: those three are currently *dormant* — no shipped page renders them
   (verified by grep; the earlier "approach.html uses them" read was a false match on
   `loop-table`) — so their change is future-proofing for case pages, zero live churn.

All four are at-rest changes → **one deliberate VR baseline regen committed in the same PR**.

## User Story

As a hiring manager / technical reader skimming the portfolio
I want the pages to carry subtle physical texture and technical typography
So that the site reads as high-craft and hand-finished, reinforcing (not shouting over)
the engineer-facing editorial voice.

## Problem Statement

The site's surfaces are flat and untextured — the trend research behind the parent plan
flags this as "rendered, not touched". The one glass affordance already shipped (header
blur) does nothing because the background is opaque. Numerals sit in the display face with
proportional figures, missing the technical-stamp texture the voice is built on.

## Solution Statement

Pure-CSS, token-driven texture: one new wash token + one new mono font token in the
contract (with neutral fallbacks, so packs need zero changes but gain override knobs),
plus ~40 lines in `portfolio.css`/`components.css`. No JS, no animation, no new files,
no dependencies. Every intensity is pinned at the calm end; the instruction of record is
**"if in doubt, less"** — tune down, never up.

## Out of Scope / Non-Goals

- **Not** touching the approach-page `.closing` band — it is a *light* band
  (`--color-bg-surface` + the 7%-alpha accent disc, `components.css:1420-1465`); grain on
  light surfaces is the "grain everywhere" anti-trend. The phase text's "closing band" is
  the site-wide dark closing surface: the footer. (User-confirmed, 2026-07-20.)
- **Not** adding glass to any surface other than the scrolled header (blur-everything is
  the anti-trend named in the parent plan).
- **Not** animating the glow or grain — static only, no parallax.
- **Not** migrating the raw mono stacks in page-inline `<style>` blocks
  (handoff.html:44, trace.html:49-57, …) — driver pages stay untouched. Only
  `system/portfolio.css`'s raw stacks migrate (they carry now-false "no --font-mono token
  exists" comments once the token lands).
- **Not** changing proto pages/`proto.css`/wc wrappers — proto pages load neither
  `portfolio.css` nor any chrome (`section-label`/footer absent), so their 4 baselines
  must come back byte-identical.
- **Not** Phase 5 (utility dock) or anything listed under "Explicitly deferred" in the
  parent plan.

## Feature Metadata

**Feature Type**: Enhancement (visual polish)
**Estimated Complexity**: Medium (small diff; regen chain + subjective aesthetic gate carry the effort)
**Primary Systems Affected**: `system/tokens.source.json` (+ its generated CSS), `system/portfolio.css`, `system/components.css`, `handoff/verdant/` (regenerated), `tooling/visual-regression/baselines/`
**Dependencies**: none new. Docker (for the baseline regen), `tooling/style-dictionary/node_modules` present (gen-handoff shells into it).

## Related Work

**Implements**: Phase 4 of the portfolio UX-uplift plan · **Epic**: `.claude/plans/portfolio-ux-uplift.md` (its §Sequencing & guardrails and calm-colour constraint are inherited, not re-decided)

**Back-references** (plans this builds on):

- `.claude/plans/portfolio-ux-uplift.md` — parent plan; Phases 0–2 are MERGED to main
  (motion tokens, view transitions, header `.is-scrolled` state, hero cascade, scroll
  reveals). Phase 4 builds directly on Phase 1's `.is-scrolled` class.
- `.claude/plans/portfolio-motion-phase03-factory-showpiece.md` — Phase 3, in flight on
  `feature/portfolio-motion-phase03-factory-showpiece` (PR #55, review fixes applied, not
  merged as of 2026-07-20). Phase 4 is **code-independent** of it (factory JS modules vs
  CSS/tokens) — see IMPLEMENTATION PLAN dependency notes.

**Forward-references**: (none yet — Phase 5 utility dock would follow)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/plans/portfolio-ux-uplift.md` (lines 151–171, 221–231) — Why: the phase spec + inherited guardrails.
- `system/tokens.source.json` (lines 15–39: contract accent + fonts groups; 170–189: neutral semantic map) — Why: where both new tokens go; `color-inverse-wash` (line 32) is the exact idiom `color-accent-wash` mirrors; `font-display` (line 37) is the shape `font-mono` mirrors.
- `system/portfolio.css` (lines 1–7 file contract; 66–71 `.is-scrolled` block to extend; 85–96 the Phase-2 comment style to mirror; 329–332 the `::backdrop` raw-value noted-exception precedent; 555–616 + 671, 690, 717–718, 733 the eight raw `ui-monospace` stacks to migrate; 212–216 `.cs-meta`) — Why: primary edit target + precedents.
- `system/components.css` (lines 229–241 `.site-header` — note the inert `backdrop-filter` and the `.on-ocean` variant; 633–654 `.section-label`/`.num`; 913–1000 `.page-hero` — already `position:relative; overflow:hidden`, and the hero-rise cascade whose children's at-rest transform is `none`; 1021–1041 `.hero-stat .value`; 1052–1064 `.hero-meta .item strong`; 1374–1384 `.feature-band` — already `position:relative`; 445–451 `.site-footer` — dark, NOT position:relative) — Why: edit targets + layout facts the glow/grain overlays depend on.
- `system/portfolio.js` (lines 31–43) — Why: `.is-scrolled` toggles at `scrollY > 8` — confirms the glass state is scroll-only and never captured by the VR gate (which never scrolls).
- `tooling/token-lint.mjs` (lines 43–76) — Why: UNDECLARED scans `components.css` only (so `var(--font-mono)` there **requires** the contract entry); ORPHAN requires every new contract token be referenced by a shipped surface (`portfolio.css` is in the consumer set — `color-accent-wash` used there passes).
- `tooling/drift-check.mjs` (all) — Why: the regen chain this change trips: token-css, handoff (gen-handoff → gen-vocabulary → gen-pack-bundle, porcelain-checked), loc-summary (line-count based — CSS edits may drift it), annotated-source (may drift if a quoted snippet's source shifts).
- `tooling/visual-regression/visual.spec.mjs` (lines 15–38 PAGES/PACKS; 93–102 capture) — Why: which baselines exist; capture happens at scrollY 0 with `animations: 'disabled'` — so glass (scroll-gated) causes zero churn and grain/glow/type churn exactly the 12 IA baselines.
- `_headers` — Why: confirms no CSP; the grain `data:` URI is deliverable as-is.

### Pre-verified facts (2026-07-20 planning spike — do NOT re-derive, they are proven)

Every fact below was verified empirically on this machine during planning, by injecting
the exact CSS from the tasks into the live pages (served via `serve.mjs`, driven in
Chromium) and by probing the environment:

- **Environment**: Docker daemon 29.2.1 running; the exact regen image
  `mcr.microsoft.com/playwright:v1.61.1-jammy` already pulled locally;
  `tooling/style-dictionary/node_modules` AND `tooling/visual-regression/node_modules`
  present. The regen chain has zero setup work.
- **Generator**: `gen-token-css.mjs` iterates groups/sections/tokens generically
  (`Object.entries`, arrays re-joined with quote-wrapping at line 67) — the two new
  tokens flow through with no generator change.
- **Sticky bug + fix**: clean shipped page → header `top:-900` at `scrollY:900` (does
  not stick). With `html, body { overflow-x: clip }` injected → `stickyTop: 0` at
  `scrollY:900`. Root cause `components.css:40`.
- **Glass**: with the fix + the Task-4 CSS injected, `.is-scrolled` computes
  `background: color(srgb 1 1 1 / 0.86)`, `backdrop-filter: blur(8px) saturate(1.4)`;
  screenshot shows page content (the blue CTA) reading through the translucent header —
  restrained, correct.
- **Glow**: renders as a faint cool tint top-right on neutral; text stays untinted
  (`z-index:-1` layering behaves — hero children's at-rest transform is `none`).
  Under saulera the same rule renders a warm amber wash on the stone ground — "its own
  atmosphere", zero pack edits.
- **Grain**: the exact data-URI computes (`background-image: url("data:image/svg+xml,%3Csvg…`,
  `opacity: 0.04` on the pseudo) and renders suitably subtle on the dark band.
- **Mono numerals**: `.section-label .num` under the mono stack renders as the intended
  small stamp (`01`, `02`) on both light and inverse bands; the flex `gap` absorbs the
  wider glyphs.
- **Dormant organisms**: `grep` proves `.cs-meta`, `.hero-stat`, `.hero-meta` appear in
  NO shipped/proto HTML — their mono change cannot churn any baseline.
- **Saulera preview gotcha** (for the eyeball task): mutating the existing
  `<link>`'s `href` in DevTools leaves a **zombie stylesheet** (the old neutral sheet
  stays applied and, cascading later, wins — accent stays blue). Preview saulera by
  *temporarily editing the link line in the HTML file* (and reverting), or by removing
  the neutral `<link>` element entirely and appending a fresh saulera `<link>` before
  `components.css`.

### New Files to Create

None. Every change lands in existing files; generated outputs are regenerated in place.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) — Safari 16.2+/Chrome 111+; the repo already ships it inside contract token values, so support is already assumed.
- [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) — Safari still honours `-webkit-backdrop-filter`; ship both. Wrap the translucent background in `@supports`, or unsupporting browsers get see-through-unblurred chrome.
- [MDN feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence) — default `seed=0` is deterministic per engine → VR-stable in the pinned Docker Chromium. `fractalNoise` output is *coloured*; chain `feColorMatrix type="saturate" values="0"` to keep the grain monochrome (calm-colour rule).
- [MDN font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) — `tabular-nums`; universally supported.

### Patterns to Follow

**Token addition (both layers of `tokens.source.json`, then regenerate):** mirror
`color-inverse-wash` — it appears in `contract.inverse` (line 32) AND
`neutral.semantic-inverse` (line 187) with the identical `color-mix` value. Contract
self-references (`var(--color-accent)`) inside token values are established practice.

**Noted-exception comment for raw values in portfolio.css:** the file rule (lines 1–7) is
"only semantic tokens — no raw values except where noted"; `.lightbox::backdrop`
(line 329–332) shows the form: the raw value plus one comment naming why a token can't
carry it.

**Phase-comment style:** every prior motion-phase block opens with a comment naming the
move, the baseline consequence, and the gating logic — e.g. `portfolio.css:85-88`
(hl draw-in) and `portfolio.css:127-131` (verify cards, "churns index baselines, by
design"). New blocks must say which baselines they churn.

**Structural literals licence:** gradient geometry, opacity, and tile sizes are structural
(same licence as `.closing .disc`'s `opacity: 0.07`, `components.css:1462`) — but every
*colour* must arrive via a token or a `color-mix` of tokens. No hex, ever.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Branch `feature/portfolio-motion-phase04-visual-richness` off
current `origin/main` (`55aa138`).

**Independent of:** Phase 3 (PR #55) — zero file overlap (it touches
`factory-intake.mjs`/`trace-player.mjs`/`factory.html` inline styles; this touches
tokens + shared CSS). Safe to build in parallel. **BUT** the baseline regen (Phase D
below) must run on the branch state that will merge: if PR #55 merges first, merge
`origin/main` in before running the Docker regen. Phase 3 claims zero at-rest change, so
no baseline conflict is expected either way.

### Phase A: Tokens (foundation)

Two new contract tokens + neutral bindings, then the generated-artifact chain.

### Phase B: Surface changes (sticky fix + the four moves)

**Depends on:** Phase A (both new tokens must exist before CSS references them —
token-lint's UNDECLARED check enforces this for `components.css`). The sticky-container
fix (first task of this phase) must land before the glass move is judged — glass is
invisible on a header that scrolls away.

### Phase C: Generated artifacts + gate validation

**Depends on:** Phase B (loc-summary counts the final CSS line totals).

### Phase D: Eyeball + VR baseline regen + PR

**Depends on:** Phase C. The Docker regen is the LAST code-affecting step before the PR.

---

## STEP-BY-STEP TASKS

### UPDATE `system/tokens.source.json` — add the two tokens, both layers

- **IMPLEMENT**: In `contract.accent` add:
  `"color-accent-wash": { "$value": "color-mix(in srgb, var(--color-accent) 5%, transparent)", "$type": "color", "$description": "atmosphere — the accent as a barely-there ground wash (hero glow); packs may retune or null it" }`
  In `contract.fonts` add:
  `"font-mono": { "$value": ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"], "$type": "fontFamily", "$description": "technical stamp — numerals, code, machine-adjacent text" }`
  Mirror both into `neutral.semantic-accent` and `neutral.fonts` (same values —
  `color-accent-wash` stays a `color-mix` in the pack, exactly like
  `color-fg-on-inverse-muted` at line 184).
- **PATTERN**: `tokens.source.json:32` + `:187` (wash pair), `:37` + `:107` (font pair).
- **GOTCHA**: `font-mono`'s `$value` must be exactly the raw stack already shipped
  (`ui-monospace, SFMono-Regular, Menlo, monospace`) so the Task-6 migration is
  pixel-identical. Saulera/other pack files need **no** edit — the contract fallback
  serves them (VR's saulera run still loads `tokens.contract.css` first).
- **VALIDATE**: `node agent-layer/gen-token-css.mjs` prints its `✓` line; `git diff system/tokens.contract.css system/tokens.neutral.css` shows exactly the two new declarations in each.
- **SATISFIES**: AC #1, #4 (token-driven requirement).

### UPDATE `system/components.css:40` — restore the sticky header (pre-existing bug)

- **IMPLEMENT**: Change `html, body { overflow-x: hidden; }` to:

  ```css
  html, body { overflow-x: hidden; overflow-x: clip; }
  ```
  with a one-line comment: `overflow-x: hidden` on `body` makes it a scroll container,
  which silently unbinds every `position: sticky` descendant from the viewport — the
  shipped sticky header has never stuck; `clip` clips identically WITHOUT creating a
  scroll container (the `hidden` line stays as the pre-Safari-16 fallback).
- **PATTERN**: progressive-enhancement double declaration (older engines drop the
  unknown `clip` value and keep `hidden` — today's broken-sticky status quo, no worse).
- **GOTCHA**: This un-breaks already-merged Phase 1 work too (the `.is-scrolled` shadow
  and the `view-transition-name: site-header` persistence were both dead). Zero baseline
  churn: at `scrollY: 0` the header renders identically, and the VR capture never
  scrolls. `clip` vs `hidden` clipping is visually identical for the horizontal-blowout
  protection the asrc comment (`portfolio.css:531-534`) relies on. Verified live during
  planning: fix → `stickyTop: 0` at `scrollY: 900`.
- **VALIDATE**: `npx serve .` → scroll any page: the header stays pinned at the top.
- **SATISFIES**: AC #3 (its precondition), AC #8.

### ADD `system/portfolio.css` — hero atmosphere glow

- **IMPLEMENT**: New block after the `.hl` section (~line 97), with a phase comment
  naming the churn ("at-rest change on every page-hero → churns all 12 IA baselines,
  by design; static — no motion, no parallax"):

  ```css
  .page-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(ellipse 55% 60% at 78% 8%, var(--color-accent-wash), transparent 70%);
  }
  ```
- **PATTERN**: overlay-behind-content mirrors `.closing .disc` (`components.css:1453-1465`); comment style mirrors `portfolio.css:85-88`.
- **GOTCHA**: `.page-hero` is `position:relative; overflow:hidden` with `z-index:auto`
  (not a stacking context) — `z-index:-1` paints the glow above the body ground but below
  all hero content, so text stays untinted. The hero-rise children's at-rest
  transform is `none` (keyframe ends at `transform:none`), so no stacking context traps
  the pseudo. Verify in BOTH Chrome and Safari (VR single-engine blindspot — the gate
  only renders Chromium).
- **VALIDATE**: `npx serve .` → index/approach/factory heroes show a *barely visible* cool tint top-right under neutral; DevTools-toggle the rule to confirm which pixels it owns.
- **SATISFIES**: AC #1.

### ADD `system/portfolio.css` — grain on the dark bands

- **IMPLEMENT**: New block after the glow, phase comment noting the churn (index +
  every-page footer) **and** the noted exception ("raw data-URI: a token cannot carry an
  SVG document; monochrome by feColorMatrix, no colour content — same licence as
  ::backdrop, portfolio.css:330"):

  ```css
  .site-footer { position: relative; }
  .feature-band::after,
  .site-footer::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  ```
- **PATTERN**: noted-exception comment form from `portfolio.css:329-332`.
- **GOTCHA** (three):
  1. `pointer-events: none` is mandatory — the overlay covers the feature-band CTA and
     every footer link.
  2. The overlay intentionally sits *above* band content (film-grain look); at 4% this is
     imperceptible on text. If it reads as dirt on saulera's `deep-ocean`, reduce to 0.03
     — never raise.
  3. Factory's `#reskin-preview` embeds a `.feature-band` (factory.html:318) — it will
     inherit grain inside the re-skin preview. This is correct (the preview shows real
     site organisms; the noise is monochrome/pack-agnostic) and deterministic
     (feTurbulence default seed) — leave it.
- **VALIDATE**: index feature-band + any page's footer show faint texture at 100% zoom; toggle the rule to compare. Footer links still clickable.
- **SATISFIES**: AC #2.

### UPDATE `system/portfolio.css` — header glass on scroll

- **IMPLEMENT**: Extend the existing header-scroll block (lines 66–71). Keep the current
  rule as the no-support fallback; add:

  ```css
  .site-header { transition: box-shadow var(--motion-fast) var(--motion-ease), background-color var(--motion-fast) var(--motion-ease); }
  @supports ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
    .site-header.is-scrolled:not(.on-ocean) {
      background: color-mix(in srgb, var(--color-bg) 86%, transparent);
      -webkit-backdrop-filter: blur(8px) saturate(140%);
      backdrop-filter: blur(8px) saturate(140%);
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-white) 65%, transparent), var(--shadow-md);
    }
  }
  ```
  Comment: scroll-gated only → zero baseline churn (the VR capture never scrolls;
  `.is-scrolled` sets at `scrollY > 8`, portfolio.js:37); the two `color-mix` values mix
  tokens only — no raw colour (structural-percentage licence).
- **PATTERN**: the base `.site-header` (components.css:229-236) already declares the
  (currently inert) `blur(8px)` — leave components.css untouched; portfolio.css already
  owns the `.is-scrolled` shadow.
- **GOTCHA**: `:not(.on-ocean)` matters — `site.js:39` can emit an `on-ocean` (dark)
  header from client config, and a later-file translucent-white override would wreck it.
  Ship `-webkit-backdrop-filter` first for Safari. Do NOT transition `backdrop-filter`
  (janky) — background-color + box-shadow only.
- **VALIDATE**: `npx serve .` → scroll any page: header gains glass + saturation over the content beneath; at top it is pixel-identical to today. Check in Safari specifically.
- **SATISFIES**: AC #3.

### UPDATE `system/components.css` — numeral type

- **IMPLEMENT**:
  1. `.section-label .num` (line 644-648): set `font-family: var(--font-mono);` and add
     `font-variant-numeric: tabular-nums;` (keep size/colour as-is; the inverse-band
     variant at 1383 inherits).
  2. `.hero-stat .value` (line 1030) and `.hero-meta .item strong` (line 1059): set
     `font-family: var(--font-mono);` and add `font-variant-numeric: tabular-nums;`
     (full-mono metadata — user decision 2026-07-20). Both organisms are currently
     dormant (no shipped page renders them — pre-verified), so this is future-proofing
     for case pages with zero live churn.
- **PATTERN**: match the terse property style of the surrounding rules; one-line comment
  on `.section-label .num` naming the move ("Phase 4: mono stamp — churns all IA baselines").
- **GOTCHA**: `var(--font-mono)` in components.css is exactly what token-lint's
  UNDECLARED check scans — Task 1 must already be regenerated or CI fails. Mono renders
  wider at 14px: eyeball that `01`–`07` numerals don't crowd the label gap (the flex
  `gap: 14px` absorbs it).
- **VALIDATE**: `node tooling/token-lint.mjs` passes; approach.html's seven section labels show mono numerals.
- **SATISFIES**: AC #4.

### UPDATE `system/portfolio.css` — metadata rows + mono-stack migration

- **IMPLEMENT**:
  1. `.cs-meta .n` (line 215): set `font-family: var(--font-mono);` and add
     `font-variant-numeric: tabular-nums;` (full-mono metadata, same call as above;
     dormant organism — zero live churn).
  2. REFACTOR the eight raw `ui-monospace, SFMono-Regular, Menlo, monospace` stacks
     (lines 557, 593, 611, 671, 690, 717, 718, 733) to `font-family: var(--font-mono);`
     and DELETE the now-false "no --font-mono token exists" comments (the token now
     exists; identical stack → zero visual change).
- **PATTERN**: surgical — only the `font-family` lines and their trailing comments change.
- **GOTCHA**: do NOT touch the inline styles in handoff.html / trace.html / derive.html
  (out of scope; portfolio.css:557's comment that cites handoff.html:45 disappears with
  the migration, which resolves the cross-reference).
- **VALIDATE**: `git diff system/portfolio.css` shows only font-family/comment lines + the three ADD blocks; pages render identically for the migrated selectors (same stack).
- **SATISFIES**: AC #4, #7 (token discipline).

### REGENERATE the dependent artifacts, then run every gate

- **IMPLEMENT** (order matters):
  ```bash
  node agent-layer/gen-token-css.mjs      # tokens.contract.css + tokens.neutral.css (if not already)
  node agent-layer/gen-handoff.mjs        # pack + tokens + wc wrappers (shells into style-dictionary)
  node agent-layer/gen-pack-bundle.mjs    # pack.bundle.json (inlines the regenerated pack files)
  node tooling/drift-check.mjs            # authoritative: flags anything still stale
  node tooling/token-lint.mjs             # 0 undeclared · 0 orphan · DTCG valid
  ```
  If drift-check flags **loc-summary** (CSS line counts moved past a rounding boundary):
  `node agent-layer/gen-loc-summary.mjs` and re-run. If it flags **annotated-source**
  (a quoted snippet's source shifted): `node agent-layer/gen-annotated-source.mjs`.
  Commit every regenerated file — deploy = commit the artifacts.
- **GOTCHA**: `gen-handoff` requires `tooling/style-dictionary/node_modules` (run
  `npm ci` there if missing — known fresh-worktree trap). The two new tokens are neither
  undeclared (declared by Task 1) nor orphan (`font-mono` used in components.css,
  `color-accent-wash` in portfolio.css, which IS in the orphan consumer set).
- **VALIDATE**: `node tooling/drift-check.mjs` prints its full `✓` line.
- **SATISFIES**: AC #5.

### Manual eyeball — both packs, two real engines

- **IMPLEMENT**: `npx serve .` → walk index, approach, factory, work, contact, 404 in
  **Chrome and Safari**. Then preview saulera: temporarily edit the
  `<link href="/system/tokens.neutral.css">` line to `tokens.saulera.css` on index.html
  and reload — **revert before committing**. Do NOT mutate the link's `href` from
  DevTools: that leaves a zombie neutral stylesheet applied and the swap silently
  doesn't take (pre-verified gotcha). Judge against the phase gate:
  *neutral stays austere; saulera shows a warm amber atmosphere of its own.* Anything
  loud → reduce the value, re-eyeball.
- **GOTCHA**: this is the phase's named verify condition and the calm-colour hard
  constraint; the VR gate cannot judge it. Safari is where `-webkit-backdrop-filter`,
  `color-mix`, and the `z-index:-1` glow layering could differ from Chromium.
- **VALIDATE**: glow visible only as an off-white tint; grain invisible at arm's length, present at attention; glass appears only after scrolling; mono numerals read as a stamp, not a font change shout.
- **SATISFIES**: AC #6.

### Regenerate the VR baselines (Docker), commit in the same PR

- **IMPLEMENT**: On the final branch state (merge `origin/main` first if PR #55 or
  anything else landed):
  ```bash
  cd tooling/visual-regression && npm run update:docker
  ```
  Commit the changed PNGs together with the code as the deliberate baseline-regen commit.
- **GOTCHA**: Expected churn: exactly the **12 IA baselines** (6 pages × neutral+saulera —
  glow on every hero, grain on every footer, mono numerals site-wide; index + factory
  additionally band grain). The **4 proto baselines must come back byte-identical**
  (`git status` must not list them) — if one changes, a change leaked outside
  portfolio-loaded surfaces: stop and investigate. Do NOT chase a local macOS
  `npm test` run to green — Linux baselines always diff on macOS (platform, not
  regression).
- **VALIDATE**: `git status tooling/visual-regression/baselines/` lists ≤12 modified PNGs, none with `proto-` prefix; CI's visual job is green on the PR.
- **SATISFIES**: AC #5, #6.

### Commit + PR

- **IMPLEMENT**: One atomic commit (or code + baseline pair), message per convention, e.g.
  `feat: portfolio motion phase 4 — hero wash, band grain, scroll glass, mono numerals (+12 VR baselines)`
  referencing the parent plan. Open the PR with `/piv-create-pr`; note the deliberate
  baseline regen in the body so the reviewer reads the PNG diff as intended.
- **VALIDATE**: PR CI green (drift-check, token-lint, visual).

---

## TESTING STRATEGY

No test suite exists (project rule: "done" = run the surface you touched). The layers here:

### Deterministic gates
- `drift-check` — generated CSS/handoff/loc-summary all in sync with the source edit.
- `token-lint` — the two new tokens are declared, referenced, DTCG-valid.
- Visual-regression CI — the regenerated 12 baselines match; the 4 proto baselines prove containment.

### Manual (the real gate for this phase)
- Two engines (Chrome + Safari — the VR gate's single-engine blindspot is a known trap),
  both packs, all six IA pages, scrolled and unscrolled.

### Edge Cases
- **Reduced-motion**: nothing here animates — the global kill-switch is untouched; glass
  is state-based (scroll), allowed under reduced motion.
- **No backdrop-filter support**: `@supports` keeps today's opaque header + shadow.
- **`.on-ocean` header**: excluded from the glass rule by `:not()` — config-driven dark
  chrome keeps its own background.
- **Factory re-skin preview**: inherits band grain (deterministic, monochrome) — the VR
  factory capture waits on `[data-reskin]` before shooting, unchanged.
- **Keyboard/pointer**: both overlays are `pointer-events:none`; no focus target changes.

---

## VALIDATION COMMANDS

### Level 1: Generators & lint
```bash
node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs
node tooling/drift-check.mjs
node tooling/token-lint.mjs
```

### Level 2: Render check
```bash
npx serve .   # walk the six IA pages, neutral pack, Chrome + Safari, scrolled + top
```

### Level 3: Visual regression (authoritative baselines)
```bash
cd tooling/visual-regression && npm run update:docker
git status tooling/visual-regression/baselines/   # ≤12 modified, zero proto-*
```

### Level 4: Manual pack check
Temporarily point one page at `tokens.saulera.css` (revert!) — amber wash, calm.

---

## ACCEPTANCE CRITERIA

- [ ] 1. Every `.page-hero` carries a static ≤5%-alpha accent radial wash, driven by the new `--color-accent-wash` contract token; packs inherit/override it with zero pack-file edits.
- [ ] 2. `.feature-band` and `.site-footer` (only) carry monochrome feTurbulence grain at ~4% opacity; all interactive elements beneath remain clickable.
- [ ] 3. The header shows translucent-blur-saturate glass **only** when `.is-scrolled`; pixel-identical at scroll-top; `.on-ocean` unaffected; Safari works via `-webkit-` prefix.
- [ ] 4. Section numerals render in `var(--font-mono)` with tabular figures site-wide; the dormant metadata organisms (`.cs-meta .n`, `.hero-stat .value`, `.hero-meta .item strong`) are full mono + tabular; the eight portfolio.css raw mono stacks reference the token with zero visual change.
- [ ] 5. `drift-check` + `token-lint` green; regenerated handoff/ artifacts committed; 12 IA baselines regenerated via Docker in the same PR; 4 proto baselines byte-identical.
- [ ] 6. Judgment gate: neutral remains austere (off-white tint, not a gradient show); saulera shows its own warm atmosphere; nothing tires the eyes. (Both pre-rendered during planning at the specced values and judged calm — the implementer re-confirms on the real diff.)
- [ ] 7. No raw colour literal introduced anywhere; every new colour arrives via a token or a color-mix of tokens.
- [ ] 8. The header actually sticks while scrolling on every shipped page (`components.css:40` fix) — pinned at viewport top, glass + shadow visible over content.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validation run at the time of the task
- [ ] Full drift-check + token-lint pass on the final tree
- [ ] Both-engine, both-pack eyeball done (the named verify condition of the phase)
- [ ] Baseline regen ran on the final (post-merge) branch state and is committed with the code
- [ ] PR open, CI green, baseline-regen called out in the PR body

---

## OPEN QUESTIONS / ASSUMPTIONS

1. ~~"Closing band" = the footer~~ **RESOLVED by user (2026-07-20): grain goes on
   `.feature-band` + `.site-footer`** (the recommended dark-only reading). The light
   `.closing` band stays untouched.
2. ~~Metadata rows keep the display face~~ **RESOLVED by user (2026-07-20): FULL mono
   metadata** — `.cs-meta .n`, `.hero-stat .value`, `.hero-meta .item strong` switch to
   `var(--font-mono)` + tabular-nums (all three dormant today, so zero live churn).
3. **Intensity values are validated starting points** (5% wash, 0.04 grain, 86% glass,
   140% saturate) — all four rendered live during planning and judged calm. The
   inherited constraint stays asymmetric: tuning DOWN needs no sign-off; tuning UP does.
4. **Phase 3 (PR #55) merge timing** — no file overlap; whichever lands second just
   merges main and (for this branch) re-runs the Docker regen if anything visual came in.
5. **The sticky fix ships inside this PR** (assumption): it is the precondition of the
   glass move and a one-line un-break of designed behaviour. If the user prefers it as
   its own micro-PR, it extracts cleanly (the one components.css:40 line + its comment).

## NOTES (open canvas)

- **Rejected: hero glow as plain CSS without a token.** `color-mix(var(--color-accent) 5%, transparent)`
  inline in portfolio.css would work and packs would still inherit the hue — but the
  phase text says token-driven, and a `color-accent-wash` slot gives packs a knob
  (retune the alpha, or null the atmosphere entirely with `transparent`) for the cost of
  two JSON lines. Also mirrors the existing `color-inverse-wash` exactly, so the
  contract stays symmetric.
- **Rejected: tabular-nums-only for section numerals (no mono).** Cheaper and zero
  churn beyond figure width — but the phase's stated intent is the technical mono-stamp
  texture, and 14px is where mono reads as texture rather than a font change.
- **Rejected: grain via an inline `<svg><filter>` element + `filter: url(#grain)`.**
  Filtering the band element would distort its *content*, not overlay texture; and it
  needs markup edits on every page. The tiled data-URI background on a pseudo is the
  standard, markup-free form.
- **Finding worth keeping**: the shipped header's `backdrop-filter: blur(8px)`
  (components.css:235) has been a no-op since day one — opaque background. This phase is
  what makes it real. Don't "fix" it at rest; at-rest translucency would churn the
  header slice of every baseline AND change the at-top look, which the phase forbids.
- **Second finding (bigger)**: the header has also never STUCK — `body { overflow-x:
  hidden }` (components.css:40) creates a body scroll container, and sticky descendants
  bind to it instead of the viewport. Measured on the clean shipped page during
  planning. Nobody noticed because the VR gate never scrolls, and the `.is-scrolled`
  threshold (8px) means small test-scrolls still show most of the header. The
  `overflow-x: clip` fix was verified live (`stickyTop: 0` at `scrollY: 900`) and is
  now a task in this plan. Consider a follow-up memory/note: *behavioral* regressions
  invisible to a no-scroll screenshot gate need a hand check.
- **Planning spike method**: all four moves were injected as a `<style>` tag into the
  live served pages (Chromium via agent-browser) and screenshotted — neutral hero glow,
  scrolled glass with content reading through, dark-band grain + mono numerals, and the
  saulera amber wash after a clean pack-link swap. The values in the tasks are the
  values that were rendered and judged.
- **VR mechanics recap** (from project memory): the gate captures under NO-PREFERENCE
  with `animations: 'disabled'` at scrollY 0, Linux-only baselines, single Chromium
  engine. Consequences used above: glass = zero churn; static at-rest changes = honest
  churn; macOS local runs always red (ignore); Safari must be eyeballed by hand.
- **Grain byte cost**: the data-URI is ~340 bytes, inlined in CSS — no request, no CSP
  concern (`_headers` sets none).

## AMENDMENTS

<!-- append-only; newest at the bottom -->

- 2026-07-20 — Confidence-raising pass (same day as creation, pre-execution). (1) Open
  Questions #1/#2 resolved by the user: grain = feature-band + footer; metadata rows =
  FULL mono. (2) Discovered + verified a pre-existing bug: the sticky header has never
  stuck (`components.css:40` body scroll container); added the `overflow-x: clip` fix
  as a task and AC #8. (3) Corrected a research error: `.cs-meta`/`.hero-stat`/
  `.hero-meta` are dormant (no shipped page renders them) — full-mono there churns
  nothing. (4) Added "Pre-verified facts": environment (Docker + image + node_modules)
  checked, generator confirmed generic, and ALL four moves render-validated live in
  Chromium at the specced values, including the saulera wash and a DevTools
  pack-swap gotcha now baked into the eyeball task.
