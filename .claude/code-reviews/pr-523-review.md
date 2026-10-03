# PR #523 review — bindings, scenario.json and x-derived status in the pack (#331)

**Head** c50d2d5 · **Base** main @ `81a0a84b899fc4190d54930b55dd6a2714ec9e0c` · round 1 (no prior report, guarantees pass not triggered)

**Recommendation: approve.** There are no critical or high issues. Two medium items are worth a follow-up, because one of them will refuse ordinary English the first time someone edits `bindings.json`.

## Validation (observed, review worktree at c50d2d5)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `all 51 groups pass`. `handoff-seam` prints 29 mutations. |
| `node tooling/drift-check.mjs` | ✓ including `handoff` and `build-handoff` |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens, 0 orphan |
| `node scenarios/validate.mjs` | ✓ |
| Fresh `gen-handoff` + bundle + index | byte-identical to the committed `handoff/` (reviewer agent) |
| CI (`verify`, `codeql`, `visual`, `audit`, `gates-green`) | all pass |
| `proto-journey` | not re-run; the author's 42/42 ×3 engines stands |

The first run went red on `icons` and `drift`. The cause was environmental: the fresh worktree lacked `npm ci` in `tooling/icons` and `tooling/style-dictionary`. Both gates went green after the install.

## Numbers pass

- **29 mutations:** computed in code (`SEAM_MUTATIONS`, 10 + 3 + 11 + 5) and printed in the group line (observed).
- **The question table's `file:line` references:** checked against the branch. All seven point at the stated text (observed).
- **`loc-summary`:** only `generators` (3500 → 3600) and the total move. `runtime` is unchanged, so no approach baseline is affected (observed).
- **The report's figures:** each carries an observed or derived label. The figure 42 is labelled derived (37 + 5), and that is correct.

## Issues

### Medium

**F1 `agent-layer/gen-handoff.mjs:53`: `BOUND_RE` refuses ordinary English.**
- The `/i` flag applies to the HTTP-verb alternative too.
- Observed: `BOUND_RE.test("the page does not get a heading")`, `"put first"` and `"scenario.json version"` are all `true`.
- Every committed text passes today. The first author who writes "get" or "put" in a `filter`, `order`, `pick`, `title` or `x-derived.rule` will get a "breaks the bound" refusal that does not say which word triggered it.
- Fix:
  - Split the verbs into a case-sensitive `/\b(GET|POST|PUT|PATCH|DELETE)\b/` and keep `/i` on the rest.
  - Make `\bversion` stricter, for example `\bversion(ed|ing)\b|\bv\d+\b`.
  - Add must-accept negative controls to group 39.

**F2 `tooling/build-checks.mjs:250`: the artifact-side re-read imports `BOUND_RE` and `BINDING_KEYS` from the generator.**
- A loosened bound or an extra view key is accepted by both sides at once.
- The mutation battery partly covers this, because each mutation names its word, so removing an exercised alternative goes red.
- Two loosenings stay green: adding a new key to `BINDING_KEYS.view`, and dropping an alternative that no mutation exercises.
- Fix: pin the closed key sets as literals in group 39, and assert the generator's sets equal them.

### Low

**F3 group 39 never re-derives `status` from the `x-derived` rule.**
- The witness filters on the `status` value already baked into the fixtures.
- The reviewer re-derived all 20 tasks and every plant against `2026-07-14` and found 0 mismatches (observed). Even so, a fixture edited without re-baking its status would still pass the witness, the page and proto-journey [11].
- Fix: about five lines computing task and plant status from `due`, `done` and `scenario.today`.

**F4 `agent-layer/gen-handoff.mjs:190-191`: the write-order comment overstates the guarantee.**
- It says a refused statement "leaves no half-written pack behind". By then `contracts/` has been `rmSync`'d and recopied, and `tokens.dtcg.json` overwritten.
- Fix: reword the comment to say "`pack.json` and `scenario.json` are untouched", or run the projections before the `rmSync`.

**F5 `agent-layer/gen-handoff.mjs:55`: `RECORD_ID_RE` is narrow.**
- `/\b[a-z]+-\d{2,}\b/` misses `task-3` and `Task-03`, and it matches `iso-8601`.
- It covers today's ids. Deriving it from the fixture ids would be exact.

**F6 `tooling/proto-journey.mjs` [11]: an indexing error ends the engine run.**
- A renamed or missing view id makes `W.featured[0]` or `W.today.length` throw a `TypeError`. That ends the engine leg instead of producing a named failure.
- Fix: guard each lookup and add a named `t(...)` per expected view id.

## Undocumented deviations

None found. The three logged deviations and the vetoable `witness` are documented in the report and the PR body.

## Done well

- **Binding text matches the page:** the `filter`/`order`/`pick` text matches `proto/verdant.html:113-121` (stable `SEV` sort, `sorted[0]` featured with no heading, `!done && due|overdue` unsorted).
- **Pure projections:** `projectBindings`, `projectScenario` and `derivedProblems` are pure, so the gate drives mutated copies without writing files.
- **`from` resolution:** resolves relative to the contract's directory, uses `Object.hasOwn`, and refuses a pointer that escapes the pack.
- **Mutation coverage:** every new check was seen red, the source-mutation table is in the report, and the battery reports `MUTATION COULD NOT APPLY` by name instead of crashing.
- **Honest limits:** the "cannot reach" clause names the text-to-witness gap in the gate prose, in `gates.md` and in the PR body.
