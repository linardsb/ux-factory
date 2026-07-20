# Implementation Report — Portfolio motion Phase 4: Visual richness

**Plan**: `.claude/plans/portfolio-motion-phase04-visual-richness.md`
**Branch**: `feature/portfolio-motion-phase04-visual-richness` (off `origin/main` @ `fac4251`, post-PR-#55)
**Status**: COMPLETE

## Summary

Four restrained at-rest visual moves, token-driven end to end: a barely-there radial accent
wash behind every page hero (new `--color-accent-wash` contract token), monochrome
feTurbulence grain at 4% on the two dark surfaces (feature band + footer), real
translucent-blur glass on the scrolled header, and monospace numerals site-wide (new
`--font-mono` contract token). The phase also lands the pre-existing sticky-header fix:
`body { overflow-x: hidden }` had made body a scroll container, silently unbinding
`position: sticky` since day one — `overflow-x: clip` (with the `hidden` line kept as
pre-Safari-16 fallback) restores it, verified live (`headerTop: 0` at `scrollY: 900`).

## Tasks completed

- Two new tokens, both layers (`color-accent-wash` in contract.accent + neutral.semantic-accent; `font-mono` in contract.fonts + neutral.fonts) → `system/tokens.source.json` (UPDATE)
- Token CSS regenerated (exactly two new declarations per file) → `system/tokens.contract.css`, `system/tokens.neutral.css` (GENERATED)
- Sticky-header fix (`overflow-x: hidden` → `hidden` + `clip` double declaration, with why-comment) → `system/components.css:40` (UPDATE)
- Hero atmosphere glow (`.page-hero::before`, `z-index:-1`, radial `var(--color-accent-wash)`) → `system/portfolio.css` (ADD)
- Dark-band grain (`.feature-band::after` + `.site-footer::after`, 160px feTurbulence data-URI tile, `saturate(0)` monochrome, `opacity: 0.04`, `pointer-events: none`; `.site-footer` gains `position: relative`) → `system/portfolio.css` (ADD)
- Header glass on scroll (`@supports` gate, `.is-scrolled:not(.on-ocean)`, token-only color-mix 86% bg + blur(8px) saturate(140%) + hairline inner highlight; background-color added to the transition) → `system/portfolio.css` (UPDATE)
- Mono numerals (`.section-label .num`, `.hero-stat .value`, `.hero-meta .item strong` → `var(--font-mono)` + `tabular-nums`) → `system/components.css` (UPDATE)
- `.cs-meta .n` full mono + the eight raw `ui-monospace` stacks migrated to `var(--font-mono)`, now-false "no --font-mono token exists" comments deleted → `system/portfolio.css` (UPDATE)
- Regen chain: gen-handoff → gen-vocabulary → gen-pack-bundle → `handoff/verdant/` (GENERATED: tokens.dtcg.json, tokens/css/{contract,neutral}.css, pack.bundle.json)
- Drift-flagged regen: `system/annotated-source.json` (btn-primary snippet shifted +4 lines from the components.css comment), `system/loc-summary.json` (runtime 7700→7800, total 12000→12100) (GENERATED)
- VR baselines regenerated via Docker on the final branch state → `tooling/visual-regression/baselines/` (12 IA PNGs churned, 4 proto PNGs byte-identical)

## Tests added

No test suite exists (project rule). Verification = deterministic gates + live render checks, below.

## Validation results

- `gen-token-css` ✓ 57 contract + 65 pack tokens; `git diff` showed exactly the two new declarations per generated file; the emitted `--font-mono` stack is byte-identical to the raw stacks it replaces.
- `token-lint` ✓ 57 contract tokens · 0 undeclared · 0 orphan · DTCG valid.
- `drift-check` ✓ full line (syntax · token-css · annotated-source · loc-summary · handoff · scenarios · traces) on the final committed tree.
- Live Chromium checks (agent-browser, all six IA pages, port 4949):
  - Sticky + glass: `headerTop: 0` at `scrollY: 900`; `.is-scrolled` computes `background: color(srgb 1 1 1 / 0.86)`, `backdrop-filter: blur(8px) saturate(1.4)` — page content reads through the header; pixel-identical at scroll-top.
  - Glow: faint cool tint top-right on neutral heroes; hero text untinted (z-index:-1 layering held).
  - Grain: `opacity: 0.04` + data-URI computed on both pseudos; footer link hit-test passes (`elementFromPoint` lands on the link through the `pointer-events:none` overlay).
  - Mono numerals: `.section-label .num` computes `ui-monospace, …` on light and inverse bands; the flex gap absorbs the wider glyphs.
  - Saulera pack (link-edit swap, reverted): warm amber hero wash on the stone ground, amber `02` stamp on deep-ocean — its own atmosphere, zero pack-file edits, judged calm.
- VR baseline regen (Docker, `npm run update:docker`, two passes — see Deviations): exactly the 12 IA baselines modified, 0 proto baselines changed. Pixel-measured on the committed PNGs: hero region shifts (−7,−5,−1) RGB (the cool wash) and footer region +3 uniform (the monochrome grain) — both moves demonstrably present in the Docker captures.

## Deviations from the plan

- **VR regen needed a second, forced pass for contact/404.** The first `update:docker` churned only 8 baselines, not the predicted 12: contact/404 (both packs) change *only* by glow + grain, and those deltas (≤8 RGB values per pixel) sit below pixelmatch's per-pixel perceptual threshold (0.2 YIQ) — the tests "passed" within `maxDiffPixels: 100`, and Playwright never rewrites a passing snapshot. The four PNGs were deleted and regenerated fresh in a second pass, so all 12 committed baselines truthfully embody the new at-rest pixels (verified by pixel measurement) instead of leaving contact/404 stale-but-within-tolerance, where a future diff would mix this PR's texture in with unrelated changes. Consequence worth keeping: **the VR gate cannot *detect* a change of this subtlety on a page where nothing else moves** — its churn on the other 8 baselines rode on the high-contrast mono glyphs.
- **None functional beyond that.** Two mechanical notes:
  1. The plan's grain comment cited "::backdrop, portfolio.css:330" by line number; the inserted blocks shift that line, so the committed comment cites `.lightbox::backdrop` by name instead — same noted-exception licence, no stale line ref.
  2. PR #55 (Phase 3) had already merged when this branch was cut, so the branch was created directly off the post-merge `origin/main` (`fac4251`) — the plan's "merge main before the Docker regen" contingency was satisfied by construction; no separate merge was needed.

## Issues encountered

- **Safari eyeball outstanding**: the plan's judgment gate names Chrome *and* Safari (the VR gate's single-engine blindspot). All Chromium checks pass; Safari (`-webkit-backdrop-filter`, `color-mix`, the `z-index:-1` glow layering) needs the user's manual pass — the fallbacks are in place (`@supports` gate, `-webkit-` prefix first, `hidden` fallback line), so worst case is today's opaque header, not breakage.
- The first `drift-check` run flagged annotated-source, then loc-summary — both anticipated by the plan, both resolved by their one-line regen commands.
- The handoff porcelain check reports "drift" until the regenerated pack is committed (it diffs the working tree) — expected local behaviour, green after commit.
