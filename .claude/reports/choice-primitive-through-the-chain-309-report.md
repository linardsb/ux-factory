# Implementation Report — `choice` through the chain (#309)

**Plan**: `.claude/plans/choice-primitive-through-the-chain-309.md`   **Branch**: `feature/choice-primitive-309` (worktree `../wt-309`)   **Base**: `8eb35a9` → `8eb35a9` (origin/main unmoved at report time; `git rev-list --count HEAD..origin/main` → 0)   **Status**: COMPLETE through Task 13; Task 14 (push + PR) left to `piv-create-pr`

## Summary
`choice` lands as the fifth new generic primitive: spec, token-only CSS block, renderer template, `stack.children` entry and palette entry. The pack, vocabulary, bundle, index, system graph, importer fixtures and loc-summary were regenerated. Build-checks group 18 gains section D, group 21's wrapper histogram pin moves 3/22 → 3/23, and catalog-journey gains case 14 (exclusivity by real clicks, with two controls, and computed states under three packs).

## Tasks completed
- T0 worktree + `npm ci` in `tooling/{icons,style-dictionary,visual-regression}` → baseline `build ✓  all 42 groups pass` (observed)
- T1 `system/specs/choice.md` (CREATE)
- T2 `system/specs/stack.md` (UPDATE: children + prose)
- T3 `system/components.css` (UPDATE: `ds-choice` block after `ds-icon`)
- T4 `system/agentic-renderer.mjs` (UPDATE: template after `select-field`; "twenty-five" → "twenty-six" ×2)
- T5 `system/palette.mjs` (UPDATE)
- T6 regen chain, 7 generators (see Validation)
- T7 `tooling/build-checks.mjs` group 18 D + detail string + header index line
- T8 group 21 pin + tripwire note; "3/22" → "3/23" in `build-checks.mjs:94`, `system/catalog.mjs`, `tooling/catalog-journey.mjs`, `.claude/references/gates.md` ×2
- T9 `tooling/catalog-journey.mjs` case 14 + header
- T10 `tooling/visual-regression/visual.spec.mjs` comment; `gates.md` group 18 and catalog-journey appends
- T11 `system/loc-summary.json` (runtime 32,300 → 32,400, total 40,700 → 40,800)
- T12 commit `015066f`
- T13 six VR baselines — see Validation

Every fenced block was applied mechanically from the plan's text at its named anchor (each anchor asserted to match exactly once), not retyped.

## Tests added
- build-checks group 18 section D (checkbox example by name, rendered three-radio group, `kind` enum refusal ×4 values, `group` required ×2 kinds, `toggle-switch` kept apart).
- catalog-journey case 14: +23 assertions per engine.

## Proving the checks

| Mutation | Went red | Observed |
|---|---|---|
| M1 delete `example` from `choice.md` + regen | `docs chain ✗ 2`: `choice's committed example is not a checkbox … undefined`, `validateExamples checked 0 choice examples, expected exactly 1`; `grep -c "^Error:"` → 0 (no crash) | yes |
| M2 drop `choice` from `stack.children` + regen | `docs chain ✗ 5` | yes |
| M3 delete template `name` line | `docs chain ✗ 2`: `… name=null`, `… got [, , ]` | yes |
| M4 delete `kind` enum + regen | `docs chain ✗ 8` | yes |
| M5 `checked: true` constant | `docs chain ✗ 1` | yes |
| group 21 pin back to 22 | `catalog ✗ 1` | yes |
| C1 constant name | chromium ✗ 1: only the DIFFERENT-groups control | yes |
| C2 no name | chromium ✗ 2: `picking Express un-picks Standard`, `ArrowUp …` | yes |
| C3 no `accent-color` | chromium ✗ 3: `tint auto vs accent …` per pack | yes |
| C4 no disabled colour rule | chromium ✗ 3: disabled label/hint per pack | yes |
| C5 every label muted | chromium ✗ 3: enabled-label control per pack | yes |

Positive controls: the unmutated tree, `build ✓ all 42 groups pass` and `catalog-journey` 72/71/71 green. In M1, M2 and M4 `handoff-seam` also went red (✗ 2) because the harness regenerated only `gen-handoff` + `gen-vocabulary`, not the bundle/index. That is an artifact of the mutation harness. Restore re-ran those same two generators; the bundle and index were never touched by any mutation, and `handoff-seam` green on the final committed tree proves they match the pack.

## Validation results
All observed on `015066f` in `../wt-309`:
- `node --check` on renderer, build-checks, catalog-journey → clean
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- regen chain: `handoff pack ✓ 26 specs + 3 token targets + 3 wc wrappers` · `vocabulary ✓ 26 components` · `pack bundle ✓ 16 files` · `pack index ✓ 17 files` · `system graph ✓ 63 tokens · 49 consumers · 557 edges` · `expected verdict ✓ … 57579 bytes` · `import records ✓ … 4 files, 187933 bytes`
- importer diff `git diff --numstat`: `66 0` on each of the three JSONs; `.md` records unchanged. Add-only, no verdict moved.
- `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass`
- `node agent-layer/gen-param-count.mjs --check` → `param count ✓ 121 controls — no drift`
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ 3 groups — no drift`
- `node import/regen-expected.mjs --check` → ✓ 57579 bytes
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count`
- `BASE=http://127.0.0.1:4891 node tooling/catalog-journey.mjs all` (own server, `/system/specs/choice.md` curl-verified) → `chromium: 72 passed` · `firefox: 71` · `webkit: 71` · `catalog-journey ✓`
- `git grep "3/22"` outside plans/reports → only the tripwire note's history arrows
- VR (Task 13): the six PNGs were removed first, then `npm run update:docker` ran in a clean detached worktree at `015066f`. It printed six `A snapshot doesn't exist … writing actual` and `33 passed (59.4s)`. A verify pass in the same container, without `--update-snapshots`, gave `33 passed (54.3s)`. `/approach` was served and read off the page after two stable reads: `"80 files, about 32,400 lines"`. The baseline commit `e259964` changes exactly six PNGs. `shotTimeout` is unchanged and no timeout was seen.

## For the PR body (Task 14)
- `Closes #309`
- **AC #4, the PRD count (verbatim from the plan):** With `choice`, the PRD's ten generic primitives are complete: five existing (button = `primary-button` + `ghost-button` · card = `card` · dialog = `modal-dialog` · nav = `nav-tabs` + `screen-header` · text field / dropdown = `text-field` + `select-field`) and five new (`stack`, `text`, `list`, `icon`, `choice`). None replaces or duplicates an existing part (G24): `toggle-switch` stays separate, because a toggle is an action and a choice is a selection (G32).
- Importer diff, measured: `66 0` on each of `import/fixtures/spike-c-instance.expected.json`, `import/fixtures/records/spike-c-faithful.json`, `import/fixtures/records/spike-c-wrong-but-green.json` — six `choice` candidates at score 0.083, no verdict or top candidate moved.
- loc: runtime `linesApprox` 32,300 → 32,400 (files 80), total 40,700 → 40,800; `/approach` ×3 baselines regenerated.
- Owner flags: **Q1/D1** — `group` is required for checkboxes too (the validator has no conditional rule; the reversal recipe is in the plan's AMENDMENTS). **Q2** — a radio set in a `stack` has no legend semantics; named as a gap in the spec, follow-up ticket draft in the plan, not filed.

## Not run
- Task 14 (push, PR, `gh pr checks`): left for `piv-create-pr`, per the skill's next step. The PR body must carry `Closes #309` and the AC #4 count text from the plan.
- Level 5 manual read (`/components#choice` under each pack from the dock): not done. Case 14 reads the same states per pack in computed style. Owner's call.

## Deviations from the plan
- `tooling/visual-regression/visual.spec.mjs` comment: besides the plan's count edit, "~25% taller" → "~30% taller" (26 vs 20 components = +30%, derived). The plan's text would have left a false percentage.
- Order: Task 8's pin moved before Task 6's regen, so the planned intermediate red (3/23 vs pinned 3/22) was never seen in sequence. It was reproduced afterwards as the PIN mutation.

## Assumptions carried
- D1 (`group` required for both kinds) and Q2 (radio-set legend as a named gap) stand as the plan decided. Both are to be flagged to the owner in the PR body.
- Worked in a worktree (`../wt-309`) because the primary checkout is shared and was on another ticket's branch.

## Additions beyond the plan
- None beyond the percentage fix above.

## Issues encountered
- Plan citation drift: the `select-field` template ends at `:614`, not `:617`. The anchor text still matched exactly once, so no impact.
- The first mechanical application took the plan's ```` ```js ```` fence lines into two files (an off-by-one in my line ranges, not in the plan). I reverted and re-applied before any gate ran.
