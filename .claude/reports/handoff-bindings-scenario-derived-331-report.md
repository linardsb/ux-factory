# Implementation Report — bindings, scenario constants and derived rules in the handoff pack (#331)

**Plan**: `.claude/plans/handoff-bindings-scenario-derived-331.md`   **Branch**: `feat/handoff-bindings-331` (worktree `../wt-331-plan`)   **Base**: `81a0a84` → `81a0a84` (origin/main unmoved at report time, `git fetch` + `merge-base --is-ancestor`, observed)   **Status**: COMPLETE

## Summary
The Verdant handoff pack now states the fixed fictional today (`handoff/verdant/scenario.json`), how `status` is derived (`readOnly` + `x-derived { from, rule }` on `care-task-row` and `plant-card`), and which view of `plant-overview` reads which collection, filtered and ordered how (`pack.json#/bindings`, projected from the hand-written `scenarios/verdant/bindings.json`). `gen-handoff.mjs` gains three pure exports that build-checks group 39 drives with a 29-case mutation battery plus an independent fixture/witness reading. `proto-journey.mjs` [11] reads the witness ids off the rendered page on three engines.

## Tasks completed
- Task 1 → `scenarios/verdant/bindings.json` (CREATE), the plan's content verbatim
- Task 2 → `system/specs/care-task-row.contract.json` (UPDATE)
- Task 3 → `system/specs/plant-card.contract.json` (UPDATE)
- Task 4 → `agent-layer/gen-handoff.mjs` (UPDATE: header, `BINDING_KEYS`, `BOUND_RE`, `RECORD_ID_RE`, `projectBindings`, `projectScenario`, `derivedProblems`, wiring, return + log line); `agent-layer/build.mjs` (log line)
- Task 5 → `agent-layer/gen-pack-index.mjs` (UPDATE: `scenario.json` route, `pack.json` purpose/readWhen reworded)
- Task 6 → `.claude/references/kb-format.md`, `scenarios/README.md` (UPDATE)
- Task 7 → regenerated `handoff/verdant/{pack.json, vocabulary.json, pack.bundle.json, llms.txt, contracts/care-task-row.contract.json, contracts/plant-card.contract.json}` + new `scenario.json`: exactly the seven paths the plan lists (observed `git status --porcelain handoff/`)
- Task 8 → `tooling/build-checks.mjs` group 39 sections 6–9, block header, `group()` string; `.claude/references/gates.md` group 39 entry ("seventeen" → "eighteen")
- Task 9 → `tooling/proto-journey.mjs` section [11] + header sentence; `gates.md` proto-journey entry
- Task 10 → `system/loc-summary.json` (`generators` 3500 → 3600, total 41900 → 42100; `runtime` unchanged, so no approach VR baseline moves)

## Tests added
No suite (CLAUDE.md). Group 39 gained four sections:
- **6** bindings ↔ proto.config: positive control (`projectBindings` reproduces `pack.json#/bindings`), the independent key-set reading over every bound fixture record, `notInScope` ⊇ a detail line, the witness re-derived by a block-local `witnessOf`, and 10 `projectBindings` refusals (including bound text in `notInScope`) + 1 key-set refusal + 1 witness-drop.
- **7** `scenario.json` ↔ brief fence + `copy.json`: positive control, the seam run's `2026-07-15` named, and 3 `projectScenario` refusals (non-day, empty notice, a notice that breaks the bound).
- **8** `x-derived`: `derivedProblems` is `[]` on the committed pack, the derived set is exactly the two `status` fields, and 11 mutations are each named (including a rule that breaks the bound).
- **9** the bound over committed artifacts: a clean scan, with a `cacheTtl` key and a `GET /api/x` filter each named.

`SEAM_MUTATIONS` is computed from the three battery arrays + 5 single cases and renders as **29** in the group line (observed; 10 + 3 + 11 + 5 = 29, derived).

## Proving the checks

| Check | Mutation | Result (observed) | Positive control |
|---|---|---|---|
| 7 today ↔ brief | `brief.md` today → `2026-07-15`, no regen | ✗ `scenario.json: today "2026-07-14" is not the brief head's "2026-07-15"` + `projectScenario() must reproduce…` | committed tree green |
| generator readOnly rule | `x-derived` removed from `plant-card.contract.json` spec, regen | `gen-handoff` throws `…plant-card.contract.json: properties.status is readOnly with no x-derived…` | regen of the real specs succeeds |
| 8 exact derived set | `readOnly` + `x-derived` both removed, regen | ✗ `derived fields must be exactly … got ["contracts/care-task-row.contract.json#status"]` (+ 2 plant-card battery rows report `MUTATION COULD NOT APPLY`, by name, no crash) | — |
| 6 key-set reading | `today` view rebound to `plants`, regen (generator accepts) | ✗ `bindings plant-overview.today: 15 of 15 plants records do not fit contracts/care-task-row.contract.json's key set` | committed bindings fit (15/20/8 records) |
| generator closed keys | `"endpoint": "/api/today"` on a view, regen | `gen-handoff` throws `screens[0].views[0].endpoint is an unknown key…` | — |
| generator contract-less | view component → `text`, regen | throws `"text" has no DataContract…` | — |
| existence before read | `rm handoff/verdant/scenario.json` | exit 1, 8 named failures, 0 stack-trace lines | — |
| existence before read | `rm scenarios/verdant/bindings.json` | exit 1, 12 named failures, 0 stack-trace lines; `gen-handoff` throws naming the path | — |
| 8 tilde battery row | `gen-handoff.mjs` `seg.includes("~")` branch → `if (false)` | ✗ `a pointer escape must be caught…` | — |
| 6 duplicate battery row | `seen.has(v.id)` → `if (false)` | ✗ `a duplicate view id must be refused … got NO THROW` | — |
| 8 worked-example row | `RECORD_ID_RE.test` → `if (false)` | ✗ `a worked example in the rule … NO PROBLEM REPORTED` | — |
| proto-journey [11] today | today witness `task-05`↔`task-08` swapped in working `pack.json` | ✗ `the Today list is the witness` on chromium, firefox and webkit (41/1 each) | 42/0 each on the clean tree |
| proto-journey [11] page sort | `proto/verdant.html:115` sort reversed | ✗ featured, tiles and All plants on all three engines (39/3 each) | 42/0 each |
| 6 witness reads data | (in-gate) `plants[0].status = "overdue"` on a clone | featured moves to `plant-01` (asserted) | — |

| bound: notice | `projectScenario`'s `BOUND_RE.test(copy.fictionalNotice)` → `if (false)` | ✗ `a fictionalNotice that breaks the bound … NO THROW` | committed notice passes |
| bound: rule | `derivedProblems`' `BOUND_RE.test(xd.rule)` → `if (false)` | ✗ `a rule that breaks the bound … NO PROBLEM REPORTED` | committed rules pass |
| bound: notInScope | `projectBindings`' `notInScope` bound check → `if (false)` | ✗ `bound text out of scope … NO THROW` | committed statement passes |
| bound: section 9 text | build-checks `text()` `BOUND_RE.test(v)` → `if (false)` | ✗ `bound text in a committed view's filter … NO PROBLEM REPORTED` | committed artifacts scan clean |

The first pass at the notice mutation used the wrong sed pattern and was a no-op. The four bound rows above were added after a review pass found that no bound check had been seen red. Each was then disabled in turn, went red by name, and was restored (`cmp`, observed).

Every source mutation was restored by copy and verified with `cmp`, and `proto/verdant.html` was restored with `git checkout` (observed `sources-restored`, `pack-restored`).

## Validation results
- L1 `node --check` ×3 → ok (observed)
- L2 `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`, exit 0 (observed, post-staging and pre-commit; groups 40/42/43 green, so the import verdict did not cascade)
- L3 `node scenarios/validate.mjs` → the same 4 ✓ lines as main (observed); `node tooling/drift-check.mjs` on the committed tree (the branch HEAD that carries this report) → `drift-check ✓ syntax · token-css · … · handoff · … · group-count` (observed)
- Task 7 chain → `handoff pack ✓ 26 specs + 3 token targets + 3 wc wrappers + 4 bound views + 2 derived fields`, `pack index ✓ 18 files` (observed)
- Task 9 `BASE=http://127.0.0.1:4863 node tooling/proto-journey.mjs all` (worktree `serve.mjs` on a private port, `curl` confirmed the served `pack.json` carries 4 bound views) → `42 passed, 0 failed` on chromium, firefox and webkit; `proto-journey ✓ all assertions passed` (observed; the plan's 37 + 5 = 42 is derived)
- L4 `scenario.json` today `2026-07-14`; view ids `featured, featured-readings, today, all-plants`; `llms.txt` has one `scenario.json` line (observed)

### PR-body question table (line numbers from `grep -n` on the branch HEAD, observed; `pack.json` and the contracts were not regenerated after)

| seam-run Q | answer | file → line |
|---|---|---|
| Q1 today | `today` | `handoff/verdant/scenario.json:4` + `contracts/care-task-row.contract.json:19` (`../scenario.json#/today`) |
| Q2 status derivation | `x-derived.rule` | `contracts/care-task-row.contract.json:20`, `contracts/plant-card.contract.json:23` |
| Q3 Today window | view `today` `filter` | `pack.json:1859` |
| Q4 featured plant | view `featured` `order` + `pick` | `pack.json:1835-1836` |
| Q12 no detail screen | `notInScope[0]` | `pack.json:1897` |
| Q19 fictionalNotice | `fictionalNotice` | `handoff/verdant/scenario.json:5` |
| Q24 My plants order | view `all-plants` `order` | `pack.json:1875` |

The seam run's own answers to Q3, Q4 and Q24 were wrong ("+7 days", "earliest due", "id order"). The pack now says what the page does. The ticket's "My plants" is the `all-plants` view (A1).

## Not run
- The CI pixel gate (`visual` job): CI-only, not run locally. Evidence that no at-rest pixel moves: of the VR pages, only `/components` loads a changed file (`catalog.mjs` → `pack.json` + `vocabulary.json`). The inlined contract appears only in the JSON tab, which is last in `tabsFor`, so it is `hidden` at rest under `catalog.css`'s `[hidden]{display:none!important}`. A headless chromium load showed 26 cards and no `x-derived` in `innerText` (observed). `/handoff.html` does show the new text (the vocab `<pre>`) and is not in `visual.spec.mjs`'s page list.
- L4 was run headless, not by eye: `/handoff.html` loaded with 52 `.hv-json` blocks, `x-derived` visible and 0 unexpected console errors (chromium, private port 4863, observed). The error filter was not itself proven on a known-bad page.

## Deviations from the plan
- **Generator-side `contractOf` normalises a contract-less spec to `null`** (plan error). The plan's `specs.find(...)?.head.contract` returns `undefined` for a spec whose head has no `contract` key, so a contract-less component would have been reported as "names no spec". Written as `s ? s.head.contract || null : undefined`. Verified: a `text` view throws `has no DataContract`.
- **`scenario.json` is written after all three projections**, not straight after `projectScenario`. A refused bindings statement or `x-derived` then leaves no half-written pack. Same output.
- **The `derivedProblems` tilde branch does not set `node = undefined` before `break`.** The probe's assignment was dead code, so it was dropped. Behaviour is identical.
- **Section 9's closed-key scan admits `contract` on a view and `title` on a screen.** These are the two keys the projection adds beyond `BINDING_KEYS`, and the plan's "no key outside `BINDING_KEYS`" would have failed the committed pack.

## Assumptions carried
A1 (one screen, four views), A2 (`bindings.json` beside `proto.config.json`), A3 (optional `title`), A4 (`BOUND_RE` = the epic's non-goal list), and the owner's 2026-10-03 decision (`x-derived` on the two `status` fields). `witness` is kept: it is beyond the ticket, and the owner can veto it per the plan's Open Questions.

## Additions beyond the plan
- `gen-handoff.mjs` throws by path when `brief.md`, `copy.json`, `proto.config.json` or `bindings.json` is missing (the plan named this for the brief only).
- Group 39's battery wraps each mutation in a try, so a mutation that cannot apply (because the subject is already gone) reports `MUTATION COULD NOT APPLY` by name instead of crashing the run. This was observed under the R2b and D2 deletions.
- The group 39 block's section-header comment was renamed to match the gates.md title.

## Issues encountered
- The first try at the witness-swap mutation was a no-op, because the text pattern did not match `pack.json`'s formatting, and that run stayed green. It was re-run as a JSON edit and went red on all three engines. Only the re-run counts as evidence.
- Historical copies of the old "(the brief's head)" wording remain in `traces/*.raw.jsonl` and `docs/epics/fixtures/handoff-seam/2026-08-28-seam/questions.md`. Both are recorded run output and are left untouched under the honesty contract.
