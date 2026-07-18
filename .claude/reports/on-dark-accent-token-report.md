# Implementation Report — On-dark accent contract token (`--color-accent-on-inverse`)

**Plan**: `.claude/plans/on-dark-accent-token.md`   **Branch**: `feature/on-dark-accent-token`   **Status**: COMPLETE

## Summary

Extended the token contract with `color-accent-on-inverse` — the on-dark accent variant issue #17 prescribes. The token is declared in the DTCG source (contract literal `#3d7bff` + neutral primitive/semantic binding), derived by the engine (lighten the negotiated accent in 0.01 OKLCH steps until ≥ 4.5:1 vs the derived `bg-inverse`, reported as a `lightened-for-contrast` note), checked as the 12th `wcagPairs` entry (ruleset v1.2.0), swapped into the five accent-as-text-on-inverse selectors in `components.css`, bound in both reference packs, and carried through the regenerated handoff pack. The spike now proves 96/96 pairs AA across all 8 brand colors.

## Tasks completed

- Contract literal + neutral primitive (`color-blue-bright`) + neutral semantic binding → `system/tokens.source.json` (UPDATE)
- Regenerated the two CSS layers (47 contract + 55 pack tokens, `--check` clean) → `system/tokens.contract.css`, `system/tokens.neutral.css` (GENERATED)
- Pack bindings: amber on deep-ocean (4.69:1) → `system/tokens.saulera.css`; mint on navy (5.36:1) → `system/tokens.css` (UPDATE)
- `onInverse` rule + 12th wcagPair + §wcagPairs commentary rewrite (accent-on-inverse resolved, two remaining exclusions kept verbatim) + version 1.2.0 → `system/derive.rules.mjs` (UPDATE)
- Lightening negotiation loop + `lightened-for-contrast` note + tokens-map entry → `system/derive.mjs` (UPDATE)
- Four direct selector swaps (footer-col hover, footer-areas hover, `a.all`, feature-band numeral) + one scoped `.work-block.dark .block-num` override → `system/components.css` (UPDATE)
- Regenerated handoff pack (dtcg + css + ios + android carry the token) → `handoff/verdant/*` (GENERATED)

## Tests added

No test suite by project design. The existing executable gates cover the change:

- Spike stage 2 (contract completeness): `47 emitted ⊇ 47 contract tokens` ✓
- Spike stages 3–4: **96/96 pairs AA (100.0%)** across 8 brands including the three hostile ones; exit 0
- Edge cases verified directly: `#78350f` (very dark) lightens 0.414 → 0.634 with a visible `lightened-for-contrast` note; `#ffd400` converges at 0.62; pack bindings re-verified with the repo's own `wcag.mjs`

## Validation results

- Level 1 syntax: `node --check` on `derive.mjs` + `derive.rules.mjs` — pass
- Level 2 generators: `gen-token-css.mjs` → `✓ 47 contract + 55 pack tokens`; `--check` → no drift; `gen-handoff.mjs` → `✓ 7 specs + 3 token targets + 3 wc wrappers`
- Level 3 spike: exit 0, `96/96 pairs AA (100.0%)`, ruleset v1.2.0
- Level 4 manual: contract `#3d7bff` on `#1a1a1a` = 4.54:1 ✓ · saulera 4.69 ✓ · trainline 5.36 ✓. Browser render check (served + agent-browser): footer link **live hover** renders `rgb(61, 123, 255)` (= `#3d7bff`); feature-band numeral likewise; `derive.html` with brand `#78350f` shows 12 check rows / 0 fails, the new pair at 4.65:1, and the `lightened-for-contrast` note — no HTML edits needed (table is generic, as planned)
- Level 5: `git diff --stat` = exactly the 8 source files + 5 handoff token outputs; generated-file churn is the generator's own column realignment (wider token names re-pad their sections), values untouched

## Deviations from the plan

- **None functional.** One cosmetic note: new lines in `tokens.source.json` and the two pack CSS files were added with single-space alignment (per the plan's own snippets) rather than re-padding sibling lines — the generated CSS realigns automatically, hand-written files keep minimal churn.
- The plan's edge-case narrative said `#ffd400` (very light brand) would "exit immediately"; in fact it lightens 0.54 → 0.62 because the on-inverse loop starts from the *negotiated* (darkened-for-light-surfaces) accent — exactly what the plan's GOTCHA prescribes ("lighten from the negotiated `acc`"). Behavior is correct; only the narrative aside was off.

## Issues encountered

None. All of the plan's precomputed numbers (`#3d7bff` at 4.54:1, amber 4.69:1, mint 5.36:1) reproduced exactly with the repo's own math before any edit was made.

## PR notes (for piv-create-pr)

- `Closes #17` · epic #1
- Figma-parity caveat: the next real parity run (user-gated, `FIGMA_TOKEN`) will report `color-accent-on-inverse` as `missing` until the Figma variable is added — expected and honest; note on issue #17.
- Commit should stage the 13 changed paths explicitly (shared-worktree convention) and keep source + generated CSS in one atomic commit.
