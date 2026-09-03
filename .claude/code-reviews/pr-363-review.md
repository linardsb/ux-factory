# PR #363 review — the bank's width (#283)

**Head** `08fbebb` · **Base** `main` @ `4c3ba7c4eb2bfccd5a1e0af8b9906a5a7838aa8a` · round 1 (no prior report)
**Verdict: approve.** 0 critical · 0 high · **1 medium** · 2 low. F1 is one line plus one gate case and
is worth folding in before merge; it is not reachable from any caller that exists today.

Every figure in the PR body and the implementation report was re-derived on this tree, including one
mutation from the report's own table. The spec (`discovery-question-selection.architecture.md` D1 / D1a /
D1b) was read in full and the implementation matches it, including the case the report flags as an
assumption. Nothing blocks the merge.

## Validation (all observed on `08fbebb`)

| Gate | Command | Result |
|---|---|---|
| CI gate | `node tooling/build-checks.mjs` | ✅ exit 0 · `all 33 groups pass` |
| CI drift | `node tooling/drift-check.mjs` | ✅ all twelve steps |
| CI tokens | `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| graded key | `discovery-score.mjs --check-key` | ✅ 195 answers, 65 questions × 3 kinds |
| graded draw | `--check-draw` | ✅ 65 questions × 3 runs |
| scorer selftest | `--selftest` | ✅ 5 turns, matrix sums to 5 |
| graded run | `--slug graded-think-a --run a` | ✅ 65 questions in the depth |
| projection | `prd-projection.mjs allergen-matrix-1 --stdout \| diff` | ✅ byte-identical to the committed `prd.md` |
| portal smoke | `PORT=4799 node portal/server.mjs`, PID-scoped kill | ✅ `/api/health` `{"ok":true,"headSha":"08fbebb…","stale":false}`; `/api/discovery/config` → 75 questions, `scope-check` count 6 |

## The numbers pass

Every figure enumerated and re-derived. Nothing sat under the wrong provenance label.

| Figure | Labelled | Re-derived |
|---|---|---|
| 9 files, 1524+ / 48− | derived | ✅ `gh pr view` agrees exactly |
| 75 entries; whole-bank 65 | observed | ✅ the frozen literal is byte-identical to `QUESTIONS.map(id)` minus D7's ten, **in order** |
| depth counts 6 · 12 · 30 · 65 | observed | ✅ module + the portal config endpoint |
| group 28 cases 1–17, **eight new** | derived | ✅ counted in both trees: 9 cases at `4c3ba7c`, 17 at `08fbebb` |
| per-stage 6·7·6·7·8·8·7·12·4 = 65 source-backed | observed | ✅ re-run; all 75 are 6·7·6·**11**·8·8·7·**18**·4, i.e. D7's four into stage 4 and six into stage 8 |
| 32 vectors: 10 pairs fit, 16 overflow | observed | ✅ re-run: 16 fit (1 all-false + 5 singles + 10 pairs), 16 overflow, every one throws |
| presets 22 · 22 · 28 · 16; `{}` = 30 | observed | ✅ re-run |
| `fits ["hasModel","regulated"] overflow ["internal"] count 29` | observed | ✅ re-run |
| budgets 7 · 6 · 6 · 6 · 6; any two fit (29), any three overflow (34) | derived | ✅ arithmetic re-derived, and every `budget === ids.length` |
| **mutation (f) → 38 failures** | observed | ✅ **re-run in an isolated worktree: 38 failures; `whole-bank must be a LITERAL … never derived` fired; `whole-bank drifted from the documented 65` fired; case 10's message did NOT fire** |
| C2 slop: 1 line at HEAD, unchanged, 0 added | observed | ✅ substance holds. My tier-A grep returns 0 / 0 / 0 — the report's `1` is the bare `navigate` in the Shape Up quote, which the blacklist's verb-only split and quotation exemption both clear |
| Phase-1 red run, 14 failures | observed, superseded tree | ⚠️ not re-derivable by construction, and the report says so. Mutation (f) is the live proof the pins can fail, and it re-derived exactly. |

**Deviation 3 is correct.** The report claims mutation (f) does *not* redden case 10 and is caught by
case 5 + case 14 instead. Re-run: case 10's message is absent from the 38, case 5's `must be a LITERAL`
is present. Correct reasoning, correct arithmetic, and now observed rather than argued.

**Attribution — the D7 claim, and the one thing no gate reaches.** Group 28 case 10 only asserts that a
URL is *present*. Whether the cited section exists is a review fact. All seven PAIR section names cited
across the six AI-interaction entries were fetched from the live chapters and appear **verbatim**:
`Help users calibrate their trust`, `Articulate data sources`, `Decide how best to show model confidence`
(Explainability + Trust); `Communicate value & time to impact`, `Balance control & automation`
(Feedback + Control); `Provide paths forward from failure` (Errors + Graceful Failure); `Account for user
expectations of human-like interaction` (Mental Models). Every one sits in the chapter its URL names,
including the two the report flags as fetched outside the plan's list. The four non-functional
attributions also hold: INP good ≤ 200 ms at p75, SRE book ch. 4 *is* Service Level Objectives, WCAG 2.2's
masthead reads Recommendation 12 December 2024, and the Threat Modeling Manifesto's four questions are
quoted correctly. The Amershi G-numbers (G1 G2 G5 G6 G8–G12 G15–G18) match the paper's Table 1 — *derived*
from the paper, not fetched: the cited MSR URL is the publication landing page and does not carry the
guideline text. That is the correct primary-source URL; it just cannot itself verify the numbers.

## Spec conformance

`docs/epics/discovery-question-selection.architecture.md` read in full (D1, D1a, D1b bodies, not headings):

- D1's five facets, their order, and their intake questions — implemented verbatim; the four presets tick
  exactly D1's combinations (`regulated` · `orgBuys` · `internal`+`orgBuys` · nothing).
- D1a's rule — *"The twelve + the block + at most two facet modules fit inside ~30"* — is what
  `facetPlan` computes, and overflow is shown/thrown rather than resolved. **Report Q1 (a declared
  consumer vector gets 16, not 30) is what D1a says**, not a divergence from it: the tail is a budget and
  the block is fixed, so an all-false declared vector is 12 + 4. Not a finding.
- D1b's wrong-if — *"`selectDepth(depth)`, `(depth, null)` and `(depth, {})` must be byte-identical to
  today's four lists, for every depth"* — re-derived and pinned by case 14. Its caller table is still
  accurate: `portal/lib/discovery.mjs:463,515` and `tooling/discovery-score.mjs:394,436` all pass one
  argument (`grep -rn selectDepth`, observed).

## Findings

**F1 · Medium · `discovery/bank.mjs:1046,1053–1059`** — `normaliseFacets` **validates own keys but reads
through the prototype chain**, so an inherited facet composes without ever being checked. Line 1055 loops
`Object.keys(facets)` (own enumerable only) for the unknown-facet and must-be-boolean throws; line 1059
then reads `facets[id]` for all five `FACET_IDS` with plain property access, which walks the chain.
Observed on this tree:

| Input | Result |
|---|---|
| own `{hasModel:true}` + prototype `{regulated:true}` | **fires `["hasModel","regulated"]` — a 29-question session.** `regulated` passed neither check |
| own `{hasModel:true}` + prototype `{regulated:"yes"}` | no throw; silently `false`. The docblock promises "must be true or false" |
| own `{hasModel:true}` + prototype `{marketplace:true}` | no throw. The docblock promises "unknown facet" by name |
| `new Date()` · `new Map([["hasModel",true]])` · `Object.create(null)` | no throw; `Object.keys` is empty so all read as **no vector** and answer today's 30 |

This contradicts the module's own two stated contracts — *"Junk throws by name on EVERY depth"* and
*"a missing key reads false"* (an inherited key is not missing by this code's behaviour, only by its
intent). The `run.json` half of that sentence still holds: `JSON.parse` gives own keys only, and
`{"__proto__": true}` / `{constructor: true}` both throw by name (observed), so there is no pollution
hole. It is unreachable from every caller that exists today — but `Object.create(DEFAULT_FACETS)` is an
ordinary way to write a defaults object, and #285/#288 are the tickets that will write one.

**Fix (one line):** `Object.hasOwn(facets, id) && facets[id] === true` at line 1059 — which is what the
docblock already says, and mirrors the `Object.hasOwn(DEPTHS, depth)` idiom two functions down at line
1090. Then one case in `JUNK_FACETS` (`tooling/build-checks.mjs:5488`): an `Object.create({regulated:
true})` carrying own `hasModel: true`, asserting the composed vector excludes `regulated`. All seven
entries there are own-keyed junk, which is exactly why a green gate never saw this.

**F2 · Low · `discovery/bank.mjs:1067–1069`** — `facetPlan` takes no depth but returns a
`full-discovery`-scoped `count`: on the undeclared branch it is `DEPTHS["full-discovery"].ids.length`, so
`facetPlan(undefined).count === 30` for a session whose depth is `scope-check` (6 questions). Harmless
inside `selectDepth`, which only reads it under `full-discovery`. It is a seam #288 (which renders the
plan) and #285 (which refuses on it) will meet. Either take `depth`, or name the scope in the return —
"Undeclared → the unfaceted list's count" is true but reads as depth-general.

**F3 · Low · `discovery/bank.mjs:1062–1079`** — the docblock says `fits` is *"the prefix of fired whose
budgets … stay inside"*; the loop is greedy-continue, testing every later id against the same running
count, so a smaller module could in principle trail a larger one that overflowed. Unreachable twice over:
the four non-`hasModel` budgets are all 6, so no smaller module can trail; and `selectDepth` throws on
any non-empty `overflow`, so a gapped `fits` never reaches the composition. Note the gate does **not**
close this — case 15's overflow branch (line 5477) asserts `plan.fits.length === 2`, cardinality only,
never *which* ids — so a future budget or `FACETS`-order change would not be caught. Fix the comment to
say greedy-in-`FACETS`-order (what the report's own Q3 calls it), or add a `break`.

## Observation, not a finding

D1 lists `internal` as the facet that *"drops willingness-to-pay"*, and the code encodes that as
`MODULES.internal` not carrying `s5-willingness-to-pay` (pinned at `build-checks.mjs:5427`). But
`MODULES.orgBuys` does carry it, and `PRESETS[2]` ("Internal tool") ticks `internal` **and** `orgBuys` —
so that preset's session asks it anyway. The facet model is additive by construction, so a module cannot
suppress another, and the shipped behaviour honours both of D1's sentences literally. This is exactly
report Q2, documented as an intentional reading. Worth one line of confirmation from whoever owns D1 if
the intent was "an internal-tool session never asks it" — the tension is in the spec, not the code.

## What's good

- **The freeze is the right call, and it is guarded by an independent copy.** `bank.mjs` and group 28
  each hold the 65 ids, so the two literals are what disagree. Mutation (f) is what makes that real, and
  it re-derived exactly.
- **Case 9's scoping was proved non-vacuous on purpose** — D7's ten weak-answer openings are asserted
  *absent* from the source region, so narrowing the source pin to whole-bank's 65 could not quietly turn
  it into a check that cannot fail. That is the exact trap this repo has been bitten by before, and it
  was anticipated.
- **Case 15 drives all 32 vectors rather than sampling**, and asserts the composition's *shape* (twelve
  first, modules in `FACETS` order, block last exactly once) with `whole-bank` as a positive control for
  the prefix assertion.
- **The report corrects its own plan by observation** (deviation 3) instead of bending the gate to match
  the plan's expectation.
- **The debt is recorded, not papered over** — four of five facets ship with no run behind them, and
  `discovery/README.md` says so by name so #293 reads them as untested rather than inventing a proxy.

## Optional pickup (pre-existing, not this PR)

`CLAUDE.md:177` says *"build-checks' 32 groups"* while `CLAUDE.md:110` and the gate itself both say 33.
Identical at the base commit, so not a regression — but this PR already edits both `CLAUDE.md` and
`gates.md`, so it is a one-word fix if you want it in.

`discovery-question-selection.architecture.md`'s D1b caller table cites `build-checks.mjs:5820, 7148,
7220, 7603`; this PR inserts ~179 lines above them, so they are now 5959 / 7287 / 7359 / 7742. Expected
drift in a doc written before the implementation, and the file paths still resolve.

## Recommendation

**Approve.** No critical or high issue, every gate green, every figure re-derived, and the implementation
matches the spec it cites. F1 is the only one I would fold in before merging — one line at
`bank.mjs:1059` plus one `JUNK_FACETS` case — because it is a stated contract that is currently false and
the failure mode is silent: a person gets a module they did not tick. F2 and F3 are comment-accuracy and
can ride along or wait.

Next: `piv-fix-review-findings` on this report if you want F1 in, then re-run `node
tooling/build-checks.mjs`.
