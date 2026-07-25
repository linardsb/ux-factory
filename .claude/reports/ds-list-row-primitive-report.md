# Implementation Report — a generic `ds-` list-row primitive (#101)

**Plan**: `.claude/plans/ds-list-row-primitive.md`
**Branch**: `feature/ds-list-row-primitive`
**Status**: COMPLETE

## Summary

Added `list-row` — the second cross-scenario `ds-` primitive after `metric-tile` — spec-first in the four canonical places (spec · token-only CSS · renderer template · regenerated machine layer), with zero new tokens and `children: []`. Then made the floor able to reach it by generalizing `PIV_COMPOSE_SYSTEM`'s tile-only wording and widening northwind's `insight-panel` slot bound so it names no component at all, and took the measurement: **a real `record-composition.mjs` run freely chose the row.** Under a bound that names no component, the agent composed `metric-tile ×2 + list-row ×4` — an aggregate tile framing each drill-down group. Every figure reconciles against `fixtures/items.json`.

## Tasks completed

| Task | File | Action |
| --- | --- | --- |
| 0 | worktree `../ux-factory-wt-101` off `origin/main` | CREATE |
| 1 | `system/specs/list-row.md` | CREATE |
| 2 | `system/components.css` (`.ds-list-row` block + banner line) | UPDATE |
| 3 | `system/agentic-renderer.mjs` (`TEMPLATES` entry + header counts) | UPDATE |
| 4 | `handoff/verdant/{vocabulary,pack,pack.bundle}.json`, `system/system-graph.json`, `system/loc-summary.json` | REGENERATE |
| 5 | refusal matrix | VERIFY |
| 6 | `portal/record-composition.mjs` (`PIV_COMPOSE_SYSTEM`) | UPDATE |
| 7 | `scenarios/northwind/compose.json` | UPDATE |
| 8 | `--dry` run | VERIFY |
| 9 | `proto/compositions/northwind/sku-attention-list.json` + `traces/sku-attention-list{,.raw}.jsonl` | CREATE (agent-written) |
| 10 | figure reconciliation vs `fixtures/items.json` | VERIFY |
| 11 | `instance.html` + `agentic-ui-study.html` slot CSS | UPDATE |
| 12 | Chromium + WebKit eyeball, adjust, refusal probe, `/handoff.html` | VERIFY |
| 13–15 | loc-summary, VR gate, regression byte-comparison | VERIFY |
| 16 | this report | CREATE |

## The measurement — did the agent choose the row?

**Yes, freely, in both runs.** The slot bound was widened to *"Use whichever node kinds the answer actually needs; consult each component's usage guidance"* — it names no component, and the system prompt names none either (`grep -c "list-row\|metric-tile" portal/record-composition.mjs` → `0`). The only place the row is described is its own `## Usage` prose, shipped verbatim into `vocabulary.json`.

- **`--dry` run** (independent sample): `metric-tile, metric-tile, list-row, list-row, list-row, list-row, list-row`
- **Real run** (shipped): `metric-tile, list-row, list-row, list-row, metric-tile, list-row`

The real run's structure is the more interesting result: it did not just emit a flat list. It interleaved — *"Oversold SKUs, 3"* followed by the three named oversold SKUs, then *"Low-cover SKUs, 5"* followed by the single thinnest-cover SKU. That is the aggregate/entity split the spec's Usage prose describes, applied without being told to apply it. The pre-authorized second directive run was **not needed** and was not performed.

**Did it move the "reads as their product" needle?** Yes, and more than marginally. The before-state for this question class was a KPI band — the honest answer to *"which SKUs need attention"* collapsed to `Oversold SKUs: 3`. The composed view now names *Pallet wrap, 23 micron · east · 85 units short · OVERSOLD*. A reader sees their own catalogue, their own warehouses, and their own word for the state. The honest limit: this is **one** primitive, so the view is still "tiles and rows" — it is a wider vocabulary, not a bespoke one. Form fidelity is no longer capped at *aggregate-only*, which was #88's specific finding; it is now capped at *aggregate-or-entity*. #90's ceiling engine remains the answer to anything past that.

One judgment call worth naming: the agent showed **1 of the 5** low-cover SKUs. That is defensible under the bound ("only the few that carry the answer") and it picked the thinnest cover of the five (12 available, vs 30/100/150/180), but a reader might reasonably expect all five. It is a prompt/bound question, not a primitive question.

### Run stats

| | steps | phases | null-phase | artifacts | denied | cost | gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--dry` | 12 | plan→gate→implement→validate | 0 | 1 | 1 | ~$0.40 | in-process `validateComposition` ✓ |
| real | 13 | plan→gate→implement→validate | 0 | 1 | 2 | ~$0.26 | `valid ✓ · trace ✓ · manifest: 3 entries` |

Nothing was hand-written or hand-edited. `node tooling/validate-trace.mjs traces/sku-attention-list.jsonl` → `13 steps · 4 phases · 1 artifact · curated`.

### Figure verification (post-hoc, vs `scenarios/northwind/fixtures/items.json`)

Ground truth computed in an uncommitted scratch script; never fed to the agent (same rule as `tooling/fieldwork-kpis.mjs`). Fixed `today` = 2026-07-19.

| # | Node | Composed claim | Fixture truth | ✓ |
| --- | --- | --- | --- | --- |
| 1 | `metric-tile` | Oversold SKUs = **3** | `committed > onHand` for 3 of 22; `status:"oversold"` count = 3 | ✓ |
| 2 | `list-row` | Pallet wrap, 23 micron — **85** units short, east, updated today | onHand 60, committed 145 → shortfall **85**; warehouse east; updatedOn 2026-07-19 | ✓ |
| 3 | `list-row` | Wooden pallet, EUR — **70** units short, west, updated today | onHand 340, committed 410 → shortfall **70**; west; 2026-07-19 | ✓ |
| 4 | `list-row` | Stretch film, hand 400% — **40** units short, east, updated today | onHand 90, committed 130 → shortfall **40**; east; 2026-07-19 | ✓ |
| 5 | `metric-tile` | Low-cover SKUs = **5** | `status:"low"` count = **5** | ✓ |
| 6 | `list-row` | Bubble wrap roll, 750mm — **12** units left, south, updated yesterday | onHand 150, committed 138 → available **12**; south; 2026-07-18 = yesterday | ✓ |

Ordering is also correct: the three oversold rows are sorted deepest-shortfall-first (85 → 70 → 40). **6 of 6 nodes, every figure and every qualifier correct.** Node count 6 ≤ the bound's cap of 8.

## Tests added

No test suite in this repo (CLAUDE.md). The validators are the tests:

- **Refusal matrix — 5/5 refused, 3/3 accepted.** The accepts: a fully-populated row, a `{label, value}`-only row, and a mixed `metric-tile` + `list-row` array. The refusals:
  - unknown component `data-table` → *unknown component "data-table" (vocabulary: …)*
  - unknown prop `columns` → *"columns" is not a prop of list-row (allowed: label | value | unit | meta | status | tone)*
  - bad enum `tone:"urgent"` → *"urgent" is not in enum [neutral | warn | critical]*
  - missing required `label` → *required prop of list-row is missing*
  - **`status-chip` child → *list-row allows no children*** ← the one that proves the cross-scenario claim
- `parseComponentSpec('system/specs/list-row.md')` → `list-row [] Usage|States|Data binding|Accessibility`
- `node tooling/validate-trace.mjs traces/sku-attention-list.jsonl` → ✓
- `node scenarios/validate.mjs` → `northwind ✓ 8 questions · 22 records`

## Validation results

| Gate | Result |
| --- | --- |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node agent-layer/gen-loc-summary.mjs --check` (after staging) | ✓ 3 groups — no drift |
| `node --check` on both edited `.mjs` | ✓ |
| VR gate, update mode | 18/18 pass |
| VR gate, **check mode** (same container, no `--update-snapshots`) | 18/18 pass against the new baselines |
| Regression byte-comparison vs `origin/main` | empty diff |

**Baselines changed — exactly two:** `approach-neutral.png`, `approach-saulera.png`. Cause: `approach.html` renders loc-summary's **runtime** group verbatim, and the new tracked spec plus the CSS/renderer lines moved it 11,600 → 11,700. Everything else — `index`, `factory`, `roundtrip`, `work`, `contact`, `404`, `proto-verdant`, `proto-fieldwork`, both packs — is byte-identical to `origin/main`.

**AC #6 regression, proven by diff not by eye:** `proto/compositions/index.json`, the four root Fieldwork proposals, northwind's `oversell-exposure` + `stock-risk-state`, `scenarios/fieldwork/compose.json`, and all six pre-existing traces are byte-identical to `origin/main`; `git diff --stat origin/main` over that path list is empty. `/agentic-ui-study` renders 6 tiles / 0 rows (it reads the root Fieldwork manifest, which correctly has no row) and `/proto/fieldwork.html` renders 10 tiles / 0 rows.

## Cross-engine verification (AC #5)

Chromium and WebKit via Playwright against a static `python3 -m http.server`, on `instance.html`'s third Ask tab (selected **by question text** — `upsertIndex` sorts by slug, so it lands second and `renderStudy` opens on `entries[0]`).

| | rows | tiles | full-width | two-across | page h-overflow | console errors |
| --- | --- | --- | --- | --- | --- | --- |
| Chromium @1280 | 4 | 2 | yes | no | no | 0 |
| Chromium @420 | 4 | 2 | yes | no | no | 0 |
| WebKit @1280 | 4 | 2 | yes | no | no | 0 |
| WebKit @420 | 4 | 2 | yes | no | no | 0 |

Both engines agree pixel-for-structure. Zero console errors on `instance.html` — the expected Worker `ERR_CONNECTION_REFUSED` fixture degradation appears on `/proto/fieldwork.html`, not here.

Also verified:
- **Reader-adjust on a row** — the study builds a tone `<select>` labelled *"Tone for Pallet wrap, 23 micron"* for every row (confirming the plan's assumption that `label` and `tone` are load-bearing names). Driving it `critical → neutral → warn` re-renders correctly: `ds-list-row is-critical` → `ds-list-row` (neutral emits no `is-` class, as the spec states) → `ds-list-row is-warn`.
- **Out-of-vocabulary probe** — the study's `urgent` option is refused; the surface shows *Refused* and the view holds the last valid composition (4 rows, 2 tiles, no collapse), 0 console errors.
- **`/handoff.html`** — auto-ingests the new spec from `pack.json`: a `list-row` card renders with 0 console errors, no gating needed.

Screenshots captured: `chromium-{wide,narrow}.png`, `webkit-{wide,narrow}.png`, `chromium-adjusted.png`, `chromium-refusal.png`, `handoff-listrow.png`.

## Deviations from the plan

1. **Worked in a git worktree, not on the shared working dir.** The session's dir was on `fix/shared-link-brand-restore` carrying 5 staged files (157 insertions) of another ticket's in-flight work. `git checkout -b` would have dragged that index along and task 13's `git add -A` would have swept it into this PR. Created `../ux-factory-wt-101` off `origin/main` instead — the repo's own convention (wt-12/88/116/figma). The plan file was copied in so plan + report ship in the same PR.

2. **Narrow-width CSS fix beyond the plan's block.** The mandated WebKit check found the row's `label` — the subject of a per-entity row — crushed to `Pallet wra…` at 420px in *both* engines, because the reading and pill are `flex: 0 0 auto` and the text had `flex: 1 1 auto; min-width: 0`. It ellipsised rather than overflowing, so the letter of the AC held, but a per-entity row whose entity is unreadable defeats the ticket. Changed the text side to `flex: 1 1 14ch` and added `flex-wrap: wrap` to the row, so the reading and pill wrap to their own line before squeezing the name. 3 of 4 names now render in full at 420px; wide layout is unchanged. This is the new primitive's own CSS, inside the plan's Phase-1 surface.

3. **Dropped the plan's `"(or, on a row, its meta)"` clause from the system-prompt edit.** `meta` is a prop only `list-row` declares, so that phrasing would have leaked the answer into the shared prompt and weakened exactly the free-choice evidence this ticket exists to gather — against the task's own GOTCHA ("do not name `list-row` or `metric-tile`"). Replaced with the component-agnostic *"or in whatever secondary field the component you chose declares"*, which gives the same anti-value-stuffing guidance. The run confirms the guidance still landed: every row uses `meta` correctly.

4. **Used the plan's "simpler equivalent" for task 3's validation** (validate against the real generated `vocabulary.json` after task 4) rather than the fragile backtick-regex spec parse — the plan offered both.

5. **Forced the two `approach` baselines to regenerate.** `npm run update:docker` rewrote **nothing** on its first pass despite the rendered digit changing — the known sub-perceptual skip. Since `approach.html` provably renders `runtime.linesApprox` (approach.html:244), the two PNGs were removed to force the rewrite, then a **check-mode** run of the same container passed 18/18, which also rules out a mid-countUp bake.

6. **Touched one line of the CSS section banner.** It enumerated the `ds-` primitives as "(metric-tile, #13)"; leaving it would have stated there is only one. Now "(metric-tile, #13; list-row, #101)".

7. **No northwind KPI tool committed.** As the plan directed, ground truth was computed in an uncommitted scratch script rather than a `tooling/northwind-kpis.mjs` — #101 does not ask for one.

## Issues encountered

- **`drift-check` false positive on staged-but-uncommitted regen.** It runs `git status --porcelain -- handoff/`, which reports the index column too, so freshly regenerated-and-staged pack files read as "drift after regeneration" while the working-vs-index diff is empty. Same mechanism as the recorded mid-merge false positive. Resolved by committing; it is green on a clean tree.
- **Port 8123 was occupied** by an unrelated local service (a `VTV` API) that answered 404 for every path — moved the static server to 8531.
- `pngjs`/`pixelmatch` are not exposed outside Playwright's bundle, so the baseline delta was verified by hash plus a check-mode gate run rather than a hand-rolled pixel diff.

## Acceptance criteria

- [x] **AC #1** — spec exists, `parseComponentSpec`-clean, token-only CSS, **zero new tokens** (`tokens.source.json` untouched; token-lint 0 orphan)
- [x] **AC #2** — `gen-vocabulary` + `gen-handoff` regenerated and committed; renderer accepts `list-row`; all five adversarial cases refused
- [x] **AC #3** — `drift-check` ✓, `token-lint` ✓, `gen-loc-summary --check` ✓ after staging
- [x] **AC #4** — real run produced the committed proposal + validating trace pair; 6/6 figures verified post-hoc; nothing hand-written
- [x] **AC #5** — Chromium **and** WebKit on `instance.html`; screenshots captured; the fidelity question answered, including that the agent chose the row **freely**
- [x] **AC #6** — all listed compositions, traces, fieldwork config and both proto baselines byte-identical to `origin/main`
- [x] Exactly one vocabulary component added — 8 → 9, nothing else widened
