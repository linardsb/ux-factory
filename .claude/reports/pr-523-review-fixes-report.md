# PR #523 — review round 1, fixes

**Branch** `feat/handoff-bindings-331` · **Head before** `c50d2d5` · **Review** `.claude/code-reviews/pr-523-review.md` — 0 critical, 0 high, 2 medium, 4 low

**Scope: the owner chose "fix all"**, so all six findings are fixed in this round and none are deferred.

## The checklist — 6 of 6 fixed

| | Finding | What happened |
|---|---|---|
| F1 | `BOUND_RE`'s `/i` made "get", "put" and "version" break the bound | **fixed**: the verbs are now a case-sensitive `BOUND_VERB_RE`, and versioning is `\bversion(ed\|ing)\b\|\bv\d+\b`. Every call site uses one `breaksBound(s)` |
| F2 | group 39's artifact-side reader imports the key sets and the bound from the generator | **fixed**: the closed key sets are pinned as literals that `BINDING_KEYS` must equal, with one must-refuse sample per bound alternative (17) and five must-accept English phrases |
| F3 | group 39 never re-derives `status` | **fixed**: task and plant status are re-derived from `due`, `done` and the brief's `today`, with an unbaked-status control |
| F4 | the write-order comment overstated the guarantee | **fixed in code, not reworded**: the projections now run before the Style Dictionary build, which is the first write to `handoff/verdant/`. A refused statement now leaves the pack untouched |
| F5 | `RECORD_ID_RE` missed `task-3` and `Task-03` and matched `iso-8601` | **fixed**: `/\b(?:task\|plant\|read)-\d+\b/i`, built from the fixtures' id prefixes. Two new mutations (one digit, capitalised) and an `iso-8601` must-pass case |
| F6 | a renamed view id threw a TypeError in proto-journey [11] and ended the engine leg | **fixed**: each of the four view ids gets its own named `t(...)`, and every witness assertion is guarded behind it |

**One correction to the review: F3's gap was narrower than stated.** `tooling/drift-check.mjs` imports `validateScenarios`, and `scenarios/validate.mjs:221-230` already re-derives both statuses in CI. The fix closes the gap inside group 39's own independent reading, not a gap in CI.

## Evidence — each new check seen red (observed, source mutated then restored, `cmp` clean)

| Mutation | Result |
|---|---|
| `\|\benvelope` dropped from `BOUND_RE` | ✗ `the bound must refuse "the envelope"`; 1 failure |
| `"cacheTtl"` added to `BINDING_KEYS.view` | ✗ `BINDING_KEYS must be exactly the pinned closed sets` and the `cacheTtl` single case; 2 failures |
| verbs made `/i` again | ✗ must-accept for "the page does not get a heading", "put first" and "get the overdue ones"; 3 failures |
| `RECORD_ID_RE` reverted to `/\b[a-z]+-\d{2,}\b/` | ✗ `task-3`, `Plant-01` and `iso-8601` cases; 3 failures |
| `task-03` due moved to `2026-07-20` in the fixture, status left `overdue` | ✗ `task-03 status "overdue" is not the rule's "ok"`; 1 failure. The witness stayed green, which is the gap F3 named |
| `today` renamed `todays` in a working `pack.json` | proto-journey chromium: ✗ `pack.json#/bindings carries the today view with a witness`, `44 passed, 1 failed`, no "threw mid-run" |

A first unbaked-status attempt (marking `task-01` done) could not fail. `task-01` was already `ok`, and `done` maps to `ok`. It was replaced by the `task-03` mutation above, and the in-gate control uses `task-03` too.

## Counts

- `SEAM_MUTATIONS` goes from 29 to **55**: 10 + 3 + 13 + 17 + 5 + 7 (derived). The battery arrays and sample lists are counted in code. The 7 single cases are rebound-to-plants, the dropped witness id, the seam guess, the unbaked status, `iso-8601`, `cacheTtl` and the verb in a filter.
- proto-journey goes from 42 to **46** per engine (+4 view-id checks).

## Validation (observed, `wt-331-plan`)

- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`; handoff-seam prints `55 mutations`
- `node agent-layer/gen-handoff.mjs` → `handoff/` byte-identical (`git status handoff/` clean), so the moved block changes no output
- `node agent-layer/gen-loc-summary.mjs` → no change to `system/loc-summary.json` (the counts round to the same 100)
- `node tooling/drift-check.mjs` (staged) → ✓ every target
- `node tooling/token-lint.mjs` → ✓ 63 contract tokens, 0 orphan
- `BASE=http://127.0.0.1:<free port> node tooling/proto-journey.mjs all` (this worktree served, `curl`-verified) → `46 passed, 0 failed` on chromium, firefox and webkit
- portal on a free port → `/api/health` `{"ok":true,…}`
