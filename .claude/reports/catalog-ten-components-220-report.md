# Implementation Report — Ten new components through the full generation chain (#220)

**Plan**: `.claude/plans/catalog-ten-components-full-chain-220.md`   **Branch**: `feature/catalog-ten-components-220`   **Status**: COMPLETE

## Summary

The component vocabulary grew 10 → 20: `ghost-button` · `card` · `empty-state` · `progress-indicator` ·
`text-field` (Batch A) and `search-input` · `select-field` · `toggle-switch` · `nav-tabs` ·
`modal-dialog` (Batch B), each walking the full #211 chain — spec → `components.css` block →
`agentic-renderer.mjs` template → regen cascade — with **zero new contract tokens** (the target held;
no gap surfaced). The two pins moved on purpose (`CATALOG_COMPONENTS` to 20 names, the wrapper
histogram to 3/17), everything else flowed through the generated artifacts with zero edits to
`catalog.mjs` render logic, `components.html`, `studio-docs.mjs`, `catalog-journey.mjs` or
`handoff-viewer.mjs` — the "components are DATA" design worked as built.

## Tasks completed

| Task | Result |
| --- | --- |
| 0 branch | `feature/catalog-ten-components-220` off `origin/main` (shared worktree: the #219 session's staged files left untouched throughout; verified before every commit) |
| 1 reading | full CONTEXT REFERENCES set + `portfolio-design` skill + CRAFT.md; 47-token inventory confirmed covering the design table |
| 2–6 Batch A | 5 specs (CREATE) + 5 CSS blocks + 5 templates → `system/specs/*.md`, `system/components.css`, `system/agentic-renderer.mjs` |
| 7 pins + cascade | palette 15 names, histogram `3 && 12`; full cascade; build-checks 24/24; token-lint clean; committed `6a2ab01`; drift-check green |
| 8–12 Batch B | 5 specs + 5 CSS blocks + 5 templates, design-table rows 6–10 |
| 13 pins final | palette 20 names, histogram `3 && 17` + tripwire comment reworded past tense; cascade; 24/24; committed `ddacfe7`; drift-check green |
| 14 param-manifest | the interactive-specimen entry gained the 3 bus-emitting `ds-` classes (fields stayed out — they emit nothing); `param-count.json` unchanged (one group), regen confirmed no-op |
| 15 count prose | renderer header + TEMPLATES banner → twenty; `catalog.mjs` `tabsFor` comment → 3 of 20 / 3/17 past tense; CLAUDE.md → **three** `3/7` mentions fixed (plan said two — see deviations) |
| 16 zero-literal grep | `git diff origin/main -- system/components.css` against `#hex|rgb(|oklch(|hsl(` → empty |
| 17 mutation drill | 4/4 reds observed and restored (table below) |
| 18 journeys | catalog-journey **green ×3 engines, zero edits** (count 20 and 3/17 derived live); build-journey firefox + webkit green first pass; chromium 156/157 once, then 157/157 twice consecutively (flake — see issues) |
| 19 VR baselines | clean detached worktree under `/Users`; churn EXACTLY 4 PNGs (`components-{neutral,saulera}` + `approach-{neutral,saulera}`), **factory untouched** — it passed against its committed baseline, proving nothing leaked into the at-rest studio; committed `e023439` |
| 20 report + PR | this file; PR body carries `Closes #220` |

## Cascade numbers (10 → 20)

- handoff pack: 10 → **20 specs** · vocabulary: 10 → **20 components** · pack bundle 16 files
- system graph: 38 → **43 consumers**, 442 → **503 edges** (64 tokens unchanged — zero new)
- inspect-data: regenerated, **no change** (no new `ROLES` — absent-from-inspect is the designed default)
- loc-summary: regenerated **after each commit** (tracked-content trap, see issues)
- param-count: 118 controls, **unchanged** (the specimen entry counts as one group)
- group 21.3: 50 props checked, **2 bounded numbers** (stat-tile.value + progress-indicator.value — the plan's playground range control)

## Mutation drill (each red observed verbatim, then restored; final state 24/24 + clean tree)

| # | Mutation | Red observed |
| --- | --- | --- |
| 1 | `nav-tabs` template key renamed away | group 3: "nav-tabs is in the generated vocabulary but agentic-renderer.mjs has no template for it — a spec without a render path is documented but not composable (#211)" |
| 2 | `ds-ghost-button` CSS block deleted + graph regen | group 18: "ghost-button: no components.css block consuming contract tokens for system/specs/ghost-button.md — a spec with no CSS block is documented but not styled (#211)" |
| 3 | `progress-indicator` example value `62` → `"62"` | `gen-vocabulary` threw: "system/specs/progress-indicator.md: head \"example\" does not render — progress-indicator.example.props.value: expected number, got string"; restored + full cascade re-run, artifacts byte-clean |
| 4 | `CATALOG_COMPONENTS` "nav-tabs" → "nav-tabsy" | group 21: "palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary" naming both full sorted lists |

## Tests added

No test suite by design (CLAUDE.md → Testing). The auto-covering gates absorbed all ten components:
groups 3 (template per vocabulary entry), 18 (CSS block per pack component + `validateExamples` over
all 20), 21 (set identity · palette pin · `controlFor` over all 50 props · 3/17 histogram · spec file
per name), 23 (root class emitted in one of the three source forms). The mutation drill above is the
proof each can fail.

## Validation results

- `node --check` renderer/palette/catalog — pass
- `node tooling/build-checks.mjs` — **all 24 groups pass** (at 15 mid-way and at 20 final)
- `node tooling/token-lint.mjs` — 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
- `node tooling/drift-check.mjs` — green on both committed batch states
- `node tooling/catalog-journey.mjs all` — 32/32 ×3 engines, zero edits needed
- `node tooling/build-journey.mjs all` — firefox 157/157 · webkit 157/157 · chromium 157/157 (×2, after one 156/157)
- Visual gate: update run 22 passed, churn exactly 4 PNGs; containerized **verify run (no
  `--update-snapshots`): 22/22** against the new baselines
- `portfolio-design/references/CHECKLIST.md` audited over the ten blocks: declared `wcagPairs` only,
  `:focus-visible` on every interactive element, the one transition is transform-only behind
  `prefers-reduced-motion`, `min-width: 0`/`overflow-x: auto` on the two wide-content spots
  (search input, nav-tabs row), no literals.

## Deviations from the plan

1. **CLAUDE.md had three `3/7` mentions, not two** — the plan's Task 15 counted the `catalog.mjs`
   entry + one in the group-21 description; the catalog-journey clause in the same paragraph carried
   a third. All three updated (the validation grep `grep -rn "3/7"` is what the plan actually
   specifies, and it now returns empty).
2. **`catalog.mjs` was committed by park-and-restore** — the parallel #219 session holds an
   uncommitted staged hunk in the same file (`watchPackSwap` comment, line ~540). Its diff was saved
   to the scratchpad, the file restored to HEAD, my `tabsFor` comment edit committed alone, and the
   #219 hunk re-applied with `git apply --index` — byte-identical staged state restored. No #219
   work entered this branch.
3. **`progress-indicator` fill width is CSSOM** (`fill.style.width = v + "%"`), not a CSS custom
   property: token-lint's UNDECLARED check is strict over every `var()` in `components.css`, so a
   `var(--ds-progress)` would fail the gate, and `setAttribute("style", …)` is CSP-hostile.
   `agentic-renderer.mjs` is not in build-checks group 7's MODULES list (verified), and
   catalog-journey asserts nothing about inline styles — the template comment records the reasoning.
4. **Mutation 3 ran `gen-vocabulary` only while mutated** — the plan's #211 trap (pack.json keeps a
   mutation until the cascade re-runs) applies when `gen-handoff` runs against the broken spec;
   `validateExamples` throws before writing, so nothing was dirtied. The full cascade was still
   re-run after restore and `git status` confirmed zero artifact drift.
5. **Both batches landed in one session, two atomic commits** — the pre-agreed scope cut was not
   needed; each batch state was independently green and committable as designed.
6. **One VR-spec edit the plan did not predict** (`tooling/visual-regression/visual.spec.mjs`,
   commit `9cf0546`): /components grew from ~22.3k px to **43.9k px tall** (measured), and
   `toHaveScreenshot`'s stable-generation pass — two consecutive viewport-sized shots at ~225 MB of
   raster each — no longer fits the default 5 s expect budget in the pinned container (both
   components captures timed out on the first update run). Fix: a per-page `shotTimeout` knob
   (30 s) plus a 60 s test budget for components only, mirroring factory's per-page `timeout`
   precedent. Comparison strictness (`maxDiffPixels: 100`) is untouched and every other page's
   capture flow is byte-identical.

## Issues encountered

- **loc-summary regenerates only against tracked content** (recorded memory, reconfirmed): the
  pre-commit cascade run reported "no drift", then drift-check went red immediately after the Batch A
  commit. Fixed by regenerating post-commit and amending — both batch commits carry their own correct
  `loc-summary.json`.
- **build-journey chromium failed once (156/157) on the first `all` run**, then passed 157/157 twice
  consecutively. The failing assertion's identity was lost to output truncation before the re-run;
  given the changes are additive vocabulary entries on a surface `/build` never composes, plus
  firefox/webkit first-pass green and the known chromium flake climate (PR #162 memory), recorded as
  a flake, not a regression.
- **The shared working dir held the #219 session's staged edits throughout** (4 files). Handled by
  explicit-pathspec commits everywhere and the park-and-restore in deviation 2; the tree was left
  exactly as found.

## Recommended manual follow-up (Level 4)

- Eyeball the ten new sections in real Safari and real Chrome under neutral + saulera (the VR gate is
  Chromium-only; PR #54 memory). Functional coverage ×3 engines is done via catalog-journey.
