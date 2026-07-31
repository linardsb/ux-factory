# PR #182 Review — compare slider: brand-import + round-trip (#170)

**Verdict: APPROVE** (with two Medium follow-ups). Reviewed fresh-context at head `8b3c482` vs base `401921e` in the `wt-170` worktree; deep pass by the code-reviewer agent, both Medium findings independently re-verified against the source before writing this.

## Summary

One hand-written primitive (`system/compare-slider.mjs`, 99 lines) mounted twice — home's brand-import report and the round-trip exhibit. The implementation matches the PR's stated intent, and all three deviations in `.claude/reports/compare-slider-170-report.md` (concrete-literal neutral pins · four baselines not six · flex-wrap hex cells) are documented with sound reasoning — none flagged.

## Validation

| Check | Result |
|---|---|
| `node --check` + Node-import smoke (3 modules) | ✓ |
| `gen-param-count --check` | ✓ 65 controls, no drift |
| `tooling/drift-check.mjs` | ✓ all 11 groups |
| `tooling/build-checks.mjs` | ✓ all 10 groups (vetting group intact) |
| CI: `verify` + `visual` | ✓ both pass |

## Issues

### Medium

**M1 — Overlay can silently clip when the imported pack is "taller" than neutral** — `system/portfolio.css:1601-1606`
`.cmp-base` is in normal flow and alone defines the box height; `.cmp-over` is `position:absolute; inset:0` inside `overflow:hidden`. The two specimen layers share markup but pin *different* token values, and `mapPack` maps spacing/type/radius as well as colour (`pack-import.mjs:172-192`, verified) — an import with a larger type ramp or spacing scale makes the overlay specimen taller than the base-defined box, and its bottom (button/swatch row) clips with no indication.
*Fix:* stack the layers so height = max of both — `.cmp { display:grid }` (keep `position:relative` for the divider), `.cmp-layer { grid-area: 1/1 }`, drop `position:absolute; inset:0` from `.cmp-over`, keep its clip-path.

**M2 — A specimen chip's colour can disagree with its own printed hex** — `system/brand-import.mjs` (`compareSection`)
Both pin maps are built only over `Object.keys(vetted)`, but `buildSample` hardcodes four swatch tokens (`color-bg`, `color-bg-surface`, `color-fg`, `color-accent`, line ~198). If the import didn't map one of the four, neither layer pins that property locally — the chip's `background: var(--…)` falls through to whatever pack is live on the page (e.g. dock-switched saulera) while the `<code>` text beside it prints the neutral literal, and both "sides" show the identical live colour for that token.
*Fix:* build both pin maps over the union of the vetted keys and the four specimen tokens, falling back to the neutral literal on both sides for unmapped ones (which is also the honest statement: "this token wasn't in the import").

### Low

**L1 — Corner tags come after their layer content in DOM order** — `system/compare-slider.mjs:26-39`
`clip-path` doesn't remove content from the accessibility tree, so a screen reader traverses a whole layer's content before hearing its label. *Fix:* `overLayer.append(overTag, overlay)` / `baseLayer.append(baseTag, base)` — tags are absolutely positioned, so nothing shifts visually.

**L2 — A drag started on the root never focuses the handle** — `system/compare-slider.mjs:70-75`
A mouse user who drags the image (not the thumb) and then wants arrow-key fine-tuning must Tab to the handle first. *Fix:* `handle.focus()` in the `pointerdown` handler.

## What's good

- **One write point for position state**: `--cmp-pos` drives clip-path and divider `left` together (`setPos`, `compare-slider.mjs:54-60`) — they structurally cannot desync mid-drag.
- **Security discipline held**: the comparison mount reuses the exact same `vetTokens` allowlist as the real "Wear it" path — no second, weaker path for visitor values; every label lands via `textContent`.
- **Token discipline**: the whole `.cmp-*` block is `var(--…)`-only; literals appear only at the two documented pinning call sites.
- **Deviation quality**: the concrete-literal neutral-pin deviation is the correct call (an unresolved `var(--color-ink)` would follow the pack or break under saulera), and the four-not-six baseline count was measured (PNGs deleted first), not tolerance-swallowed.

## Recommendation

**Approve.** Nothing blocks merge; M1 and M2 are real but conditional-path defects with cheap, scoped fixes — take them as a follow-up commit on this branch or a tracked follow-up issue. (Solo-repo note: formal `--approve` on one's own PR isn't possible; this verdict is posted as a review comment.)
