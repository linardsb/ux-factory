# PR #58 Review — feat: portfolio motion phase 4 (hero wash, band grain, scroll glass, mono numerals)

**Verdict: APPROVE** ✅ (posted as a comment — solo repo, the author account can't formally approve its own PR; the human makes the final call and merges)

## Summary

Four restrained, token-driven at-rest visual moves plus a genuine root-cause fix for the day-one sticky-header bug (`body { overflow-x: hidden }` made body a scroll container, unbinding `position: sticky`; fixed with the `hidden` → `clip` double declaration). Real source footprint is small and exactly as described: `tokens.source.json` +2 tokens, `components.css` +11/−4, `portfolio.css` +56/−10 — everything else is generator output, docs, or the 12 deliberately-churned VR baselines (proto baselines untouched, as claimed). No JS changed; the shipped pages stay vanilla. Both the code-reviewer agent's deep pass and an independent structural pass found **no Critical, High, or Medium issues**. All documented deviations in the implementation report check out as intentional decisions.

## Issues

### Low

- **`system/portfolio.css:78` — the glass `@supports` gate probes `backdrop-filter` but not `color-mix()`.** Browsers that have backdrop-filter but predate color-mix (Safari 9–16.1, Chrome 76–110, Firefox 103–112) pass the gate; because the `background` and `box-shadow` declarations inside contain `var()`, they can't be rejected at parse time — they go *invalid at computed-value time*, which resolves to `initial` (transparent background, no shadow), **not** to the earlier cascade values. Net effect in those engines: the scrolled header becomes a transparent blurred strip, which contradicts the PR's "worst case is today's opaque header, not breakage" claim. This is advisory, not blocking: the plan explicitly records color-mix support as a pre-existing repo-wide assumption (plan line 161 — contract token values already ship color-mix, so sub-floor browsers are already degraded site-wide). **Fix if desired (one line):** extend the condition to `@supports ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) and (background: color-mix(in srgb, red, red))` — probe literals are never rendered colour; add a word to the existing licence comment.

No other issues. Specifically chased and cleared:

- `.page-hero::before { z-index: -1 }` — `.page-hero` is `position:relative` with `z-index:auto` and no background of its own, so it isn't a stacking context; the wash paints above the body ground, below all hero content, clipped by the hero's pre-existing `overflow:hidden`. Correct, and consistent with the live Chromium measurements in the report.
- `var(--color-white)` in the glass hairline — declared in the contract (`tokens.contract.css:28`) and already used there via the identical `color-mix` idiom (`--color-on-dark-border`). Follows precedent exactly.
- `overflow-x: hidden; overflow-x: clip;` — correct progressive-enhancement ordering; old engines drop `clip` and keep today's behaviour.
- `-webkit-backdrop-filter` ordered before the unprefixed property; `backdrop-filter` itself deliberately not transitioned.
- Grain overlays: `.feature-band` already `position:relative`, `.site-footer` gains it in this PR; `pointer-events:none` present on both; no pre-existing pseudo-element conflicts on any of the three hooks.
- Token structure: both new tokens (`--color-accent-wash`, `--font-mono`) declared in both contract and neutral layers of `tokens.source.json`, regenerated identically into the two CSS layers and the handoff pack; zero raw colour literals introduced; all 8 pre-existing raw `ui-monospace` stacks migrated and their now-false comments removed.
- Generated artifacts: `annotated-source.json`'s +4 line shift exactly matches the 4 comment lines inserted above the snippet; `loc-summary.json` rounding consistent with the net delta.

## Validation

| Gate | Result |
|------|--------|
| `node tooling/drift-check.mjs` | ✓ full line (syntax · token-css · annotated-source · loc-summary · handoff · scenarios · traces) |
| `node tooling/token-lint.mjs` | ✓ 57 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| CI `verify` job (PR head) | ✓ pass |
| CI `visual` job (PR head) | ✓ pass — the 12 committed Linux baselines match the branch's rendered output; 4 proto baselines untouched |

Note: the review diff was taken against `origin/main` (`fac4251`, the true merge base) — the local `main` ref in this working copy is stale and includes already-merged Phase 2/3 work; don't diff against it.

## What's good

- **Token discipline is airtight.** Two new tokens land in the source of truth first, both layers, then regenerate outward through the full chain (token CSS → handoff pack → bundle); the grain data-URI is the one raw value and carries its documented noted-exception licence.
- **A root-cause fix, not a workaround.** The sticky-header repair identifies the actual mechanism (body as scroll container) and fixes it with the minimal standards-correct idiom, with a why-comment that will save the next reader the same investigation.
- **Honest VR-baseline handling.** The forced second regen pass for contact/404 — deleting sub-threshold-stale PNGs so all 12 baselines truthfully embody the new pixels — plus memorializing that the comparator can't detect changes this subtle, is exactly the honesty contract applied to tooling.
- **Every changed line traces to the phase-4 scope.** No drive-by edits anywhere in either stylesheet.

## Outstanding (documented, human judgment gate)

- **Safari eyeball** — the plan's judgment gate names Chrome + Safari; only Chromium was driven. Fallbacks are in place; the human reviewer should do the Safari scroll-pass before or shortly after merge.

## Recommendation

**Approve.** No blocking findings; the one Low advisory is optional one-line hardening below the repo's documented support floor. Ready for the human merge decision.
