# Implementation Report — discovery op vocabulary + pure applier (#281)

**Plan**: `.claude/plans/discovery-ops-applier-281.md`   **Branch**: `feat/281-discovery-ops` (worktree `../ux-factory-wt-281`, cut from `origin/main` 817ea9f)   **Status**: COMPLETE

## Summary

`discovery/ops.mjs` is the four-verb op grammar and a pure `applyOp`/`applyOps` over the run's op ledger, zero imports, context passed in. `record_decision` carries `answer_ref`, never answer text; `seq` is the one id space; absent is refused, empty is flagged; R2 keys on the turn; `supersedes` names the latest earlier decision on the same question. Group 28 in `tooling/build-checks.mjs` drives every rule by feeding broken ops behind positive controls and pins the run-2 fixture's md5 with the newline mutation. `discovery/README.md` is the run-package spec; CLAUDE.md, gates.md and the architecture doc's stale `system/` clause are updated.

## Tasks completed

- Task 1+2 — vocabulary, enums, `checkOp`, `applyOp`, `applyOps`, `emptyRun` → `discovery/ops.mjs` (CREATE, 181 lines)
- Task 3 — header entry 28, `createHash` + aliased discovery imports, group 28 body, verdict `all 28 groups pass` → `tooling/build-checks.mjs` (UPDATE)
- Task 4 — run-package format spec → `discovery/README.md` (CREATE, 179 lines)
- Task 5 — map lines, `28 PURE groups`, the **New discovery op verb or run** bullet → `CLAUDE.md` (UPDATE); `28 pure groups` + group 28 paragraph + group-list sentence → `.claude/references/gates.md` (UPDATE); the one stale clause → `docs/epics/discovery-partner.architecture.md` (UPDATE, +1 −1)
- Task 6 — validation runs + the mutation record (below)

## Tests added

No suite (CLAUDE.md §Testing); group 28 is the unit layer. Cases 28.1–28.9 as planned: roster both ways and frozen by mutation, VALID_FOR per verb, happy fold with exact param key sets, determinism + purity (record, op and state all re-read after mutation), the four named throws, 28 further refusals each matched on message, `applyOps` index prefix, both flag directions, R2 on the turn with the supersede rule (latest, both kept), the not-a-form counter derived from records, totality over junk ops/ctx/state/items, md5 + newline mutation.

## Validation results

All observed in the worktree:

- L1 `node --check` both files ✓; import prints `4 verbs` ✓
- L2 `node tooling/build-checks.mjs` → `build discovery ops ✓ …` · `build ✓  all 28 groups pass`
- L3 SDK-free: the worktree has **no `portal/node_modules`** at all, so every gate run above was the CI condition; `node tooling/drift-check.mjs` ✓ (all 12 steps, after `npm ci` in `tooling/style-dictionary` — a fresh-worktree dependency, not a code issue); `gen-loc-summary.mjs --check` → `3 groups — no drift` (discovery/ is uncounted)
- L4 `md5 -q` fixture = `ab6eb0ee6cdd3b7802ecfcbe90db2377`; `git status` touches nothing under `system/` or `agent-layer/`, no `discovery/<slug>/` exists; CLAUDE.md 2761 → 2891 words (+130 ≈ 170 tokens, under the 400–650 ceiling); README 179 lines, slop grep empty; architecture diff `+1 −1`, stale clause gone

## Mutation record (Task 6)

Each mutation applied to the source, the gate run, the source restored byte-identical (`diff` against a pre-mutation copy), final run green.

| # | Mutation | Red line(s) observed |
|---|---|---|
| (a) | `applyOp` record_decision: `if (closes) closeTurn();` commented out | `build discovery ops ✗ 2 failure(s)` · `a closing decision with no turn: did not throw` · `a second closer on t9: did not throw` |
| (a2) | `closeTurn` made a no-op (the whole R2 check) | `✗ 5 failure(s)` · `throw 2 (second closing op on a closed turn): did not throw` · `a closing decision with no turn` · `a closing flag with an empty turn` · `a banked open question with no turn` · `a second closer on t9` |
| (b) | `PROVENANCE` given a fifth label `"vibes"` | `✗ 1 failure(s)` · `throw 4 (provenance outside the four): did not throw` |
| (c) | one `\n` appended to the fixture (md5 became `36b7855d…`) | `✗ 1 failure(s)` · `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md hashes to 36b7855d45e618b4949a5e8e1bd2e923, not the frozen ab6eb0ee…` |

Restored: `git checkout -- docs/epics/fixtures/…`, md5 back to `ab6eb0ee…`; final `build ✓  all 28 groups pass`.

## Deviations from the plan

- **Worktree, not the shared tree.** The primary working dir is on `feature/discovery-bank-282` with #282's uncommitted `discovery/bank.mjs` and a build-checks edit that also claims group 28. Built in `../ux-factory-wt-281` off `origin/main` so neither session clobbers the other. Plan file copied into the worktree so it rides in the PR.
- **Group-number collision (A5).** #282's in-progress edit also names its group 28. Whichever merges second renumbers on rebase — the plan's rule. This PR keeps 28.
- **Mutation (a) ran twice.** The literal "comment out closeTurn in `applyOp`" only disabled the record_decision call, so throw 2's case (which uses `flag_weak_answer` as the second closer) stayed green; (a2) disables the check itself and turns 28.3(2) red as the plan intended. Both recorded.
- **gates.md gained one extra edit**: the sentence listing which groups carry the boundary statement now includes 28. Same file, keeps it true.
- **`applyOps` index prefix** asserted as `op 2 (record_decision):` with a three-item fold (board-ops' `op ${i}` is 0-based) — the plan's wording, made literal.
- Refusal battery is 28 cases against the plan's ~15: level/off_script/wrong_if/source/reason/url/claim_ref/dangling-parent shapes added because each is a distinct branch in the switch.

## Issues encountered

- `tooling/drift-check.mjs` fails in a fresh worktree until `cd tooling/style-dictionary && npm ci` (known: [[local-agent-visual-gate-notes]]). Not a regression; the syntax step (which covers `discovery/ops.mjs`) ran before the failure and again in the green run.
- Header sentence "Twenty-three groups" in build-checks left as-is (out of scope per plan).
