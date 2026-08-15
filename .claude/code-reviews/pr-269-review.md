# Code Review — PR #269: ten new components, the catalog reaches twenty (#220)

**Verdict: APPROVE** (posted as a comment — GitHub refuses a formal approval on one's own PR in a solo repo). No Critical or High issues. Validation fully green and independently reproduced. One Medium polish item and one Low report nit, neither blocking.

Reviewed with fresh eyes in a clean detached worktree at the PR head (`5434f2e`), isolated from the shared working dir's #219 staged edits. The deep pass ran as a separate code-reviewer agent; every gate below was re-run from scratch, not trusted from the PR body.

## Validation (independently re-run at the PR head)

| Gate | Result |
| --- | --- |
| `node --check` renderer / palette / catalog | pass |
| `node tooling/build-checks.mjs` | **24/24** — the gate's own output confirms 20 components, 66 props, the 3/17 histogram |
| `node tooling/token-lint.mjs` | 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | all steps green — every generated artifact (`handoff/**`, `system-graph.json`, `loc-summary.json`, bundle) regenerates **byte-identical**, so nothing generated was hand-edited |
| Task 16 zero-literal grep over the `components.css` diff | clean (re-run, not taken from the report) |
| CI on the PR | `verify` pass · `visual` pass · mergeStateStatus **CLEAN** (branch current with main) |

## Issues

### Medium

1. **`system/components.css:2149` — `search-input`'s focus ring is `:focus-within`, its nine siblings are `:focus-visible`.**
   `.ds-search-input-box:focus-within` fires on *any* focus, pointer included, while `.ds-search-input-input:focus { outline: none }` suppresses the input's own ring — so a mouse click into the search specimen shows a persistent 2px accent outline, the only one of the ten (and one of very few components in the whole sheet) that rings for pointer interaction. `text-field` (`:2110`) and `select-field` (`:2214`) both gate on `:focus-visible`, and the sheet's own precedent for exactly this wrapper-ring shape is `.dock-pack-row:has(input:focus-visible)` (`:2369`). The block's comment documents the `:focus-within` choice, but the implementation report's checklist claim ("`:focus-visible` on every interactive element", report line 71) contradicts it — so as written this is an undocumented divergence from the PR's own stated standard, not a recorded decision.
   **Fix**: `.ds-search-input-box:has(.ds-search-input-input:focus-visible) { … }` (the dock-pack-row precedent), or move `:focus-visible` onto the input directly. One selector; churns only the two components baselines if any.

### Low

2. **`.claude/reports/catalog-ten-components-220-report.md:41` — stale group-21.3 numbers.** The report says "50 props checked, 2 bounded numbers"; the committed tree's gate reports **66 props, 3 bounded** (verified against `vocabulary.json` directly: 66 props; `progress-indicator.value` + `stat-tile.value` fully bounded, `nav-tabs.active` min-only also counted by the gate). Documentation-only — the gate itself asserts against the artifact and passes. Fix: update the line to 66/3.

## Spot-checks that came back clean (beyond the agent's pass)

- The two pins are surgical: `CATALOG_COMPONENTS` → 20 names alphabetized, histogram `3 && 17` with message *and* tripwire comment updated past-tense.
- `card`/`empty-state` rendering their own single child via a direct `TEMPLATES[child.name](…)` call matches the established contract — `build()` delegates `node.children` to templates, and `resolveChip` (`:177`) is the existing direct-call precedent; `validateComposition` has already validated the tree.
- `toggle-switch` flips `aria-checked` + class **before** `busEmit` (the care-task-row mirror, exactly).
- The `visual.spec.mjs` `shotTimeout` knob (deviation 6) is scoped to `/components` alone, `maxDiffPixels` untouched, every other page's capture flow byte-identical.
- `param-manifest.json` appends exactly the three bus-emitting `ds-` specimens to the one-group entry, with the counting rationale recorded in the note; `param-count.json` correctly unmoved.
- All six documented deviations verified as documented — none flagged as issues.

## What's done well

- Token discipline is exact: all ten specs' `tokens` head arrays match their blocks' `var()` usage, hand-verified — the one check no gate covers.
- Templates are `el()`-only (no HTML string anywhere), bus emission scoped to exactly the three interactive components, no `id` minting, root classes in group 23's three source forms.
- The specs argue their negative space (no `role="dialog"`, no `tab`/`tablist`, no danger token) — each matches an owner-confirmed planning decision.
- The mutation drill (4/4 reds observed and quoted) plus drift-check byte-identity make this one of the most verifiable PRs on the branch history; the reviewer could reproduce every claim.

## Recommendation

**Approve and merge.** Fix the Medium either in this PR (one selector + possible 2-PNG baseline churn) or as an immediate follow-up; the Low is a one-line report edit. The PR body's own manual follow-up stands: eyeball the ten new sections in real Safari + Chrome under neutral and saulera (the VR gate is Chromium-only — PR #54 memory).
