# PR #363 review — the bank's width (#283) · round 2

**Head** `99303c6` · **Base** `main` @ `4c3ba7c4eb2bfccd5a1e0af8b9906a5a7838aa8a` · round 2, after the round-1 fix commit
**Verdict: approve.** 0 critical · 0 high · 0 medium · **6 low**. Round 1's F1 is fixed and the fix is
mutation-proven; F2 and F3 were folded in as docblock corrections that now describe the code. Nothing
blocks the merge. F3 below is the one I would fold in before merging: a gate assertion this repo's own
rule says should be able to fail, and today it cannot fail on the sentence it names.

The base has not moved since round 1 (`4c3ba7c` in both headers), so the guarantees pass does not
trigger. A second, independent pass by the `code-reviewer` agent over the full diff at `99303c6` found
five of the six findings below and nothing higher than low; each was re-observed here before it went in.

## Round 1 closed

| Round-1 finding | Status | How it was checked |
|---|---|---|
| F1 (medium) — `normaliseFacets` read through the prototype chain | ✅ fixed at `bank.mjs:1062` (`Object.hasOwn(facets, id) && facets[id] === true`) | mutation: reverting that one line in an isolated worktree of `99303c6` turns `build ✓ all 33 groups pass` into `build ✗ 2 failure(s)`, both naming case 17's "a ticked boolean" fixture (`got ["hasModel","regulated"]`); tree restored clean. Direct call: own `{hasModel:true}` over prototype `{regulated:true}` now fires `["hasModel"]`; a prototype-only object reads as no vector (`declared: false`) |
| F2 (low) — `facetPlan.count` is full-discovery-scoped | ✅ docblock now says so (`bank.mjs:1065–1072`) and names #285/#288 as the callers that meet it | read against the code; behaviour unchanged, as the commit says |
| F3 (low) — "prefix of fired" misdescribed the greedy walk | ✅ docblock now says greedy-in-FACETS-order, not necessarily a prefix | read against the loop; case 15's overflow branch is still cardinality-only (`build-checks.mjs:5477`), which round 1 accepted as debt |
| optional — `CLAUDE.md:177` "32 groups" | ✅ 33, matching `:110` and the gate | grep |

## Validation (all observed on `99303c6`, detached worktree, `npm ci` in `tooling/style-dictionary` and `portal/`)

| Gate | Command | Result |
|---|---|---|
| CI gate | `node tooling/build-checks.mjs` | ✅ `build ✓ all 33 groups pass` |
| CI drift | `node tooling/drift-check.mjs` | ✅ all twelve steps |
| CI tokens | `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| graded key · draw · selftest | `discovery-score.mjs --check-key` · `--check-draw` · `--selftest` | ✅ 195 answers, 65 × 3 · 65 × 3 runs · matrix sums to 5 |
| graded run | `--slug graded-think-a --run a` | ✅ 65 questions in the depth |
| projection | `prd-projection.mjs allergen-matrix-1 --stdout \| diff` | ✅ byte-identical to the committed `prd.md` |
| portal smoke | `PORT=4803 node portal/server.mjs`, PID-scoped kill | ✅ `/api/health` `ok:true`, `bootSha` = `headSha` = `99303c6`, `stale:false`; `/api/discovery/config` → 75 questions, depths 6 · 12 · 30 · 65; foreign `Origin` → 403 |
| the selectors by hand | one-arg depths · presets · `{}` · the triple · both throws | ✅ 6 · 12 · 30 · 65; regulated 22, b2b-saas 22, internal-tool 28, consumer 16; `{}` 30; `fits ["hasModel","regulated"] overflow ["internal"] count 29`; the overflow throw names the budget, both lists and `whole-bank`; the junk throw names `marketplace` |
| suite / lint / typecheck | none exists (CLAUDE.md); not invented | — |

## The numbers pass

Round 1 re-derived every figure in the report and the PR body at `08fbebb`; the report is unchanged
since and those figures still hold. What the fix commit made stale, and the fix commit's own figures:

| Figure | Where | Re-derived on `99303c6` |
|---|---|---|
| "9 files changed, 1524 insertions(+), 48 deletions(-)" (derived) | PR body | ❌ now **10 files, 1717 / 49** (`git diff --stat 4c3ba7c..99303c6`) — the review file, the fix and `CLAUDE.md:177` |
| "Group 28 now runs cases 1–17 (eight new)" | PR body · report line 12 "grew eight cases" · line 23 "cases 10–17 added" · the Tests-added table, whose row 17 is purity | ❌ **cases 1–18, nine new**: 9 case comments at `4c3ba7c`, 18 at `99303c6`; case 17 is now the prototype chain and purity is 18 |
| validation "Generated at `08fbebb`" | PR body | ⚠️ true of that commit; the `99303c6` run lives only in the fix commit's message. The body does not say a second run happened |
| "2 failures" on the F1 revert · `got ["hasModel","regulated"]` | fix commit message | ✅ exactly, see Round 1 closed |
| "a 29-question session" | fix commit message | ✅ 12 + 4 + 7 + 6 |
| "75 questions, depths 6/12/30/65" | fix commit message | ✅ the config endpoint, on port 4803 here |
| every existing caller passes one argument | README · D1b | ✅ `portal/lib/discovery.mjs:463, 515` · `tooling/discovery-score.mjs:394, 436`; no `facetPlan` caller outside the gate |
| no committed package carries `facets` | README | ✅ `grep -l '"facets"' discovery/*/run.json` → none |
| whole-bank 65 · QUESTIONS 75 · outside 10 | report | ✅ from the module |

## Findings

**F1 · Low · PR body, `.claude/reports/discovery-bank-width-283-report.md:12, 23` and its Tests-added table** — the
three stale figures above. The body is the most-read surface and the only one not in the tree. Fix: in
the body, `10 files changed, 1717 insertions(+), 49 deletions(-)`, `cases 1–18 (nine new)`, and one line
under Validation naming the `99303c6` re-run (its results are in the fix commit's message); in the report,
"nine cases", "cases 10–18", and a row for 17 (prototype chain) with purity renumbered 18.

**F2 · Low · `discovery/bank.mjs:1056` vs `:1062`** — validation and the read use two definitions of
"own". Line 1056 walks `Object.keys(facets)` (own *enumerable*), line 1062 reads `Object.hasOwn` (own,
enumerable or not). Observed: `Object.defineProperty(o, "hasModel", {value: "yes", enumerable: false})`
beside an enumerable `regulated: true` composes `["regulated"]` with **no throw**, against the docblock's
"an own key that … is not a boolean — throws by name on EVERY depth"; with `value: true` it fires
`["hasModel","regulated"]` unvalidated. Same shape as round-1 F1 with no ordinary caller behind it —
`JSON.parse`, literals, spread, `Object.assign`, class fields and `Object.create(defaults)` all produce
enumerable own keys, so #285/#288 cannot hit it by accident. Fix: one definition — `Object.getOwnPropertyNames(facets)`
at `:1056`, or `Object.prototype.propertyIsEnumerable.call(facets, id)` at `:1062`.

**F3 · Low · `tooling/build-checks.mjs:5397`** — the pin
`ok(/enforces nothing|enforced nowhere/i.test(bankSrc), "the block's header must state …")` reads the
whole of `bank.mjs`, and the file holds two matches: the block's header at `bank.mjs:929` ("enforced
nowhere") and `s4-performance-budget`'s `note` at `:346` ("enforces nothing"). Delete the header
sentence and the assertion stays green on the note. That is the check-that-cannot-fail shape this repo
names in its own gates rule, and the ticket's AC is specifically about the *header*. Fix: test the slice
of `bankSrc` between `// --- the width` and `export const NON_FUNCTIONAL_BLOCK`, the way case 9 slices
the source region rather than the whole file. Two lines; worth folding in.

**F4 · Low · `tooling/build-checks.mjs:5495–5511`** — case 17's comment says "All three drive the same
own vector behind the same control", which reads as three discriminators of the F1 fix. Only the
ticked-boolean sub-case reddens on the revert (observed: 2 failures, both that fixture). The non-boolean
and unknown-facet sub-cases pass before and after the fix — validation walked `Object.keys` in both
versions — so they pin "inherited junk stays inert", which is true and worth pinning, but is not F1. Fix:
say so in the comment.

**F5 · Low · `tooling/build-checks.mjs:5515`** — case 18 asserts `Object.isFrozen` on the plan's outer
object only. `bank.mjs:1084` freezes `fired`, `fits` and `overflow` too, and nothing asserts it, so a
later edit dropping the three inner freezes ships green. Fix: assert the three inner arrays are frozen, or
push-and-compare as the `MODULES` line below it does.

**F6 · Low · `.claude/references/gates.md:45`** — the Group 28 digest mirrors the `08fbebb` summary and
ends its junk clause at "junk vectors refused by name on every depth"; the fix commit added the
prototype-chain case to the in-file `group("bank", …)` summary and not here. CLAUDE.md sends a reader to
this file before trusting a green run. Fix: one clause.

## What's good

- **The F1 fix is the one-line fix round 1 asked for, and the proof is real.** Reverting it reddens the
  gate by name, the fixture carries a control that fails if the object does not actually inherit, and a
  prototype-only object now reads as no vector rather than a declaration.
- **Round-1 F2 and F3 were corrected honestly.** The docblocks now describe the greedy walk and the
  full-discovery scope of `count` rather than being softened, and they name the tickets that will meet the
  seam.
- **Totality is still identity-checked, not sampled.** Case 14 drives all 32 vectors and the three absent
  forms against all four literals; case 15 asserts the shape of every composing list.
- **The fix commit's message carries its own gate line**, so the `99303c6` run is on record even though
  the PR body was not re-generated.

## Recommendation

**Approve.** No critical, high or medium issue; every gate green on `99303c6`; round 1's medium closed by
mutation. Fold F3 in if you touch the branch again (two lines, and it is the kind of assertion this repo
has been bitten by); F1 is a PR-body edit; F2, F4, F5 and F6 can ride along or wait.

Next: `piv-fix-review-findings .claude/code-reviews/pr-363-review-2.md` if any of the six go in, then
`node tooling/build-checks.mjs`.
