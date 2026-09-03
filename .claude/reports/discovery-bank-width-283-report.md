# Implementation Report — Bank width: five facet modules, the non-functional block, the AI-interaction module

**Plan**: `.claude/plans/discovery-bank-width-283.md`   **Branch**: `feat/283-bank-width`   **Status**: COMPLETE

## Summary

`discovery/bank.mjs` gained ten attributed entries outside the source and outside `whole-bank` (its new
editorial rule D7) — four non-functional questions in stage 4, six AI-interaction questions in stage 8 —
and, beside them, the width itself: `FACETS`, `MODULES`, `NON_FUNCTIONAL_BLOCK`, `PRESETS`,
`FULL_DISCOVERY_BUDGET`, a total `facetPlan(facets)` and a two-argument `selectDepth` that composes only
`full-discovery`. `whole-bank` stopped being derived and became a frozen 65-id literal, so the graded
fixture's key space cannot move when a question is added. `build-checks` group 28 grew eight cases and
re-pinned the three that had to move; the verdict line stays `all 33 groups pass`.

## Tasks completed

- header: fourth reader, the #283 hook rewritten, **D7** appended after D6, the selector paragraph extended → `discovery/bank.mjs` (UPDATE)
- the non-functional block, four stage-4 entries after `s4-four-risks` → `discovery/bank.mjs` (UPDATE)
- the AI-interaction module, six stage-8 entries after `s8-source-opening-rate` → `discovery/bank.mjs` (UPDATE)
- `whole-bank.ids` as a frozen 65-id literal + the `DEPTHS` comment rewritten → `discovery/bank.mjs` (UPDATE)
- `NON_FUNCTIONAL_BLOCK` · `FACETS` · `MODULES` · `PRESETS` · `FULL_DISCOVERY_BUDGET` → `discovery/bank.mjs` (UPDATE)
- `normaliseFacets` (module-private) · `facetPlan` · `selectDepth(depth, facets)` → `discovery/bank.mjs` (UPDATE)
- group 28: the bank import widened, `ADDED_283` literal added, cases 1 / 5 / 7 / 9 re-pinned, cases 10–17 added, the summary and the index entry rewritten → `tooling/build-checks.mjs` (UPDATE)
- §The bank's width added; the `bank.mjs` files line, the `run.json` depth/branch bullet and the graded-fixture "65 questions" line corrected → `discovery/README.md` (UPDATE)
- the `discovery/` map line → `CLAUDE.md` (UPDATE)
- the Group 28 paragraph → `.claude/references/gates.md` (UPDATE)
- the Inputs count sentence → `docs/epics/discovery-partner.prd.md` (UPDATE, one hunk)
- the preamble's "roughly 30" sentence → `docs/research/question-bank-source.md` (UPDATE)

## Tests added

No suite in this repo (CLAUDE.md). Group 28 is the test. Cases added, all in `tooling/build-checks.mjs`:

| Case | What it can fail on |
|---|---|
| 10 | `QUESTIONS` minus `WHOLE_BANK` is exactly D7's ten, both directions; every D7 id resolves and stays out of whole-bank; each carries a URL; `NON_FUNCTIONAL_BLOCK` is the first four; the six cite Amershi or PAIR and are `OBSERVED`; the block's header states it enforces nothing |
| 11 | the five facets in D1's order, each with a question ending in `?` and a `fires` line, frozen at both levels |
| 12 | `MODULES` keyed by `FACETS`; each a documented literal; budget equal to its length and inside 6..7; every id resolving; disjoint from each other, the twelve and the block; `internal` without willingness-to-pay; frozen |
| 13 | the four presets and their labels; the exact combinations they tick; all five keys as booleans; each composing without overflow; consumer (16) distinct from `{}` (30) |
| 14 | totality — one argument, `undefined`, `null`, `{}` byte-identical to all four literals, and all 32 vectors leaving the three non-composing depths unmoved |
| 15 | the composition per vector — the twelve first (scoped to full-discovery, with whole-bank as the positive control), modules in `FACETS` order, the block last exactly once, the count arithmetic, 10 pairs fitting, 16 vectors overflowing and throwing by facet name with the budget and the whole-bank escape |
| 16 | seven junk vectors refused by name on every depth |
| 17 | purity and frozenness of the new surface by inert writes |

Case 7's C3 sweep now also covers the facet questions and `fires` lines and the module and preset labels.
Case 9's source pin is scoped to whole-bank's 65 **and** proves the scoping non-vacuous by asserting D7's
ten openings are absent from the source region.

## Validation results

All observed on the final tree unless stated.

| Level | Command | Result |
|---|---|---|
| 1 | `node --check discovery/bank.mjs && node --check tooling/build-checks.mjs` | ✅ clean |
| 1 (C2) | tier-1 slop grep over `discovery/bank.mjs` | ✅ **1** line, unchanged — the pre-existing Shape Up quote at the breadboard entry ("things you can navigate to") |
| 1 (C2) | the same grep over lines this branch ADDS vs `origin/main` | ✅ **0** |
| 2 | `node tooling/build-checks.mjs` | ✅ `build ✓  all 33 groups pass` |
| 3 | `node tooling/discovery-score.mjs --check-key` | ✅ `195 answers, 65 questions × 3 kinds` |
| 3 | `--check-draw` | ✅ `65 questions × 3 runs` |
| 3 | `--selftest` | ✅ 5 synthetic turns, matrix sums |
| 3 | `--slug graded-think-a --run a` | ✅ `answers sealed ✓  65/65 byte-equal to the key's run-a column` |
| 3 | `prd-projection.mjs allergen-matrix-1 --stdout \| diff - .../prd.md` | ✅ `projection-stable` |
| 3 | `node tooling/drift-check.mjs` | ✅ all twelve steps |
| 3 | `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan |
| 4 | the selectors by hand | ✅ every value equals the plan's expected output — `31 31 true false`; `28 true s4-performance-budget,…`; `regulated:22 b2b-saas:22 internal-tool:28 consumer:16`; `fits:["hasModel","regulated"] overflow:["internal"] count:29`; both throws naming the value |
| 4 | portal smoke, `PORT=4799`, PID-scoped kill | ✅ `/api/health` `{"ok":true,…,"stale":false}`; `/api/discovery/config` → **75** questions, `scope-check:6 opening-set:12 full-discovery:30 whole-bank:65` (unfaceted, unchanged) |

### The Phase-1 red run (before group 28 was touched)

Recorded as the proof the pins can fail — `build ✗  14 failure(s)`, all in group 28:

- case 1 — `the bank holds 75 entries, not 65`, `stage 4 holds 11 entries, not 7`, `stage 8 holds 18 entries, not 12`
- case 5 — `whole-bank must be the bank in source order — the literal here and QUESTIONS disagree`
- case 9 — ten lines, one per D7 entry: `<id>: weakAnswer's opening is not in the source`

`whole-bank drifted from the documented 65` did **not** fire, which is the evidence the generated literal
is byte-correct against the gate's independent copy.

### Mutation proofs (each applied, run, then reverted with `git checkout --`)

| # | Mutation | Observed |
|---|---|---|
| a | two ids swapped inside `MODULES.regulated.ids` | 1 failure — `module regulated drifted: [...]`, printing the actual list |
| b | `budget: 8` on `hasModel` | 11 failures — `module hasModel: budget 8 must equal its 7 ids and sit in 6..7`, plus case 15 on every vector that fires it (`full-discovery under hasModel is 23 long … want 24`) |
| c | `s8-failure-who-pays` added to `internal` too | 13 failures — `module internal drifted`, the budget pin, **`two modules share an id — a composition would ask it twice`**, and case 15's counts |
| d | the block placed BEFORE the modules in `selectDepth` | 30 failures — `the block must be LAST, once, under <vector>` on every composing vector |
| e | the `plan.overflow.length` throw dropped | 16 failures — one per overflowing vector: `an overflowing vector must THROW naming every facet that does not fit, the budget and the whole-bank escape — got null` |
| f | `whole-bank` derived from `QUESTIONS` again | 38 failures — `whole-bank drifted from the documented 65`, **`whole-bank must be a LITERAL in bank.mjs, never derived from QUESTIONS`**, and case 14's totality on all four `whole-bank` forms |

Tree verified clean after the reverts (`git status` showed only the sibling session's two files) and the
gate re-run green.

## Deviations from the plan

1. **`Three readers` → `Four readers`** in `bank.mjs`'s header. The plan adds a fourth reader bullet
   (`tooling/discovery-score.mjs`) but leaves the sentence above it saying three. The count word was made
   true rather than left false.
2. **The selector paragraph was restructured, not spliced.** The plan's literal insertion would have left
   "…, because a depth is a session-start choice from a closed menu" trailing a three-item list. It now
   reads "because a depth and a facet vector are session-start choices from a closed menu". The added
   clause is the plan's, verbatim.
3. **Mutation (f) does NOT turn case 10 red**, contrary to the plan's expectation. Case 10 compares
   `QUESTIONS` against the *gate's* `WHOLE_BANK` literal, which (f) does not touch, so `outside` is still
   exactly D7's ten. (f) is caught by case 5's two pins and case 14's totality instead — 38 failures, and
   the message that names the defect (`must be a LITERAL … never derived`) is one of them. No fix needed:
   the two cases guard different statements, and the one the mutation attacks fires.
4. **The 65-id literal was generated from the module, not retyped** from `build-checks.mjs` — the same
   bytes with no transposition risk. The gate's independent copy is what proves it (see the red run).
5. **Case 5's not-derived pin does its own `readFileSync`** rather than reusing `bankSrc`. `bankSrc` is a
   `const` declared in case 8, so case 5 is inside its temporal dead zone; case 10 is after case 8 and
   uses it directly, so no case was moved or reordered.
6. **`discovery/README.md`'s files line wrapped to two lines** — the replacement text is longer than the
   column the block is aligned to.
7. **The branch was cut with the sibling's two identical files staged first.** After PR #362 merged,
   `.claude/plans/discovery-run-0-338.md` and `.claude/reports/discovery-run-0-338-report.md` were
   byte-identical to `origin/main` but still differed from the stale local `main`, so `git switch` refused.
   Both were verified byte-identical (`shasum`) before staging; nothing was lost. The sibling's
   `docs/epics/discovery-partner.architecture.md` edits and the PRD's two other hunks stayed unstaged.
8. **`loc-summary.json` was checked and is unaffected** — `agent-layer/gen-loc-summary.mjs` counts only
   `system/`, root and `proto/` HTML, and `agent-layer/`. Neither `discovery/` nor `tooling/` is in a
   group, so ~500 added lines cause no drift. `drift-check` green confirms it.

## Assumptions carried from the plan (intent, not defects)

- **Q1 — a declared vector has no neutral core.** Six questions of today's unfaceted tail
  (`s1-choice-cascade` · `s2-more-than-one-way` · `s3-why-now` · `s4-press-release` · `s4-circuit-breaker` ·
  `s7-kill-state-and-date`) are asked by no declared vector, and a consumer product gets 16. That is what
  D1a's "the tail is a budget, not a union" means. Adding a core is a D1a amendment in the decision doc
  first, not a fix here.
- **Q2 — the internal-tool preset reaches willingness-to-pay through `orgBuys`.** D1 says the `internal`
  module drops it *and* that the preset ticks `internal` + `orgBuys`, which carries it. Both are honoured
  literally; case 12 pins the module, case 13 pins the preset.
- **Q3 — overflow is reported greedily in `FACETS` order.** With three ticked, the first two fit and the
  third is named. The selector resolves nothing; the person unticks.
- **Q4 — `hasModel` carries seven ids, not six.** The seventh is the existing `s8-failure-who-pays`, which
  was in the unfaceted tail and which D1's table and Run 0's AC7 both place here.
- **A1 — the module contents are the plan's editorial selection** from D1's "what it fires" column. They
  are what the second, faceted run tests (decision doc D4); re-tuning one is a two-literal edit
  (`MODULES` and case 12's `MODULE_IDS`).

## Issues encountered

None that changed the design. The only surprise was deviation 3 — a plan expectation about which case a
mutation would hit, corrected above by observation rather than by changing the gate.

**Two review facts no gate can reach, checked by hand:**

- **Every PAIR section name cited in the six AI-interaction entries was verified against the live chapter
  pages.** Two of them — `"Help users calibrate their trust"` (Explainability + Trust) and
  `"Communicate value & time to impact"` (Feedback + Control), both in `s8-safety-and-trust` — are outside
  the enumeration in the plan's §Relevant Documentation, so they were fetched independently: both are
  primary section headings in their chapters, as are `"Articulate data sources"`,
  `"Decide how best to show model confidence"` and `"Balance control & automation"`. Verified 2026-09-03.
- **`docs/epics/discovery-partner.prd.md:237` (MVP 5's depth table) still says full discovery is "the
  twelve, plus the branch's own picks".** That wording predates the facet decision and is now stale, but
  it is *branch* staleness, not count staleness, and the plan's Out-of-Scope fences the PRD to the single
  Inputs sentence — the 2026-09-02 amendment (uncommitted in a sibling session's tree) is what records
  that MVP 5's table stands. Observed and deliberately left; it belongs to #285 or that amendment, not
  here.

A sweep for a now-false "the bank module holds 65" across `discovery/`, `CLAUDE.md`,
`.claude/references/gates.md`, both epic docs, the source file and `tooling/discovery-score.mjs` found no
other stale claim: every remaining 65 is either `whole-bank`'s 65 or the fixture's 65 turns, both still true.

## Known debt this ticket ships

Four of the five facets have no run behind them. Only `regulated` gets one in wave 1 (#291); `hasModel`
fires on run 2 (#292); `internal`, `orgBuys` and `replacesAProcess` ship as a selection made from
reasoning. Recorded in `discovery/README.md` §The bank's width so #293 reads them as *not yet tested*
rather than inventing a proxy.
