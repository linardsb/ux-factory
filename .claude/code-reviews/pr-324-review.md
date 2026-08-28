# PR #324 review — discovery: the four-verb op grammar + pure applier, group 28, the run-package spec (#281)

**Head** f9830b2 (reviewed) → fixes in 94049d6 · **Base** main @ `817ea9fb931bef1032873d6d4a02e161f5fd9134` · Round 1 · 2026-08-28

Reviewed by the `code-reviewer` agent in a clean context against the worktree; this session (the author's) triaged and applied the fixes. Self-approval is not available on a solo repo, so this is posted as a comment.

## Summary

The applier mirrors `system/board-ops.mjs`'s discipline faithfully and every rule in the plan's table is implemented as specified. Group 28 is not decorative: the reviewer ran all 28 refusal cases directly against `ops.mjs` and each throws on the branch it claims, and independently reproduced all four "go red" mutations from the report byte-for-byte (messages included). No Critical or High findings. One Medium and two Low, plus one design question, all fixed in 94049d6.

## Findings

| # | Severity | Where | Finding | Fix (94049d6) |
|---|---|---|---|---|
| F1 | Medium | `discovery/ops.mjs:71` (`checkOp`) | A `Symbol` op name (or any symbol-valued param) reached a template literal and threw `TypeError: Cannot convert a Symbol value to a string` — contradicting the header's invariant 6 / group 28.8's "a plain Error every time". Unreachable through JSON transport today, but the file's own claim was false. | `typeof op.op !== "string"` checked before any message is built; symbol-valued params refused by name; the answer-ref listing in throw 1 goes through `String`. Five Symbol cases added to 28.8 (observed: plain `Error` each). |
| F2 | Low | `.claude/reports/…-281-report.md` | `ops.mjs (CREATE, 181 lines)` — the file was 214. | Corrected (226 after the fixes). |
| F3 | Low | `discovery/ops.mjs:11` | Citation `gen-loc-summary.mjs:22–24` — only line 23 is the `system/*.mjs` regex. | `:23`. |
| Q1 | Question | `discovery/ops.mjs` `applyOps` | Items were reduced to `{ op, params }` silently, so a transcript line fed whole with an altered `seq`/`closes`/`flagged` beside a valid op would ride through the fold — at odds with the README's "the envelope is exact" and the never-hand-edit rule. | Item envelope made exact: `{ op, params, turn }`, `turn` optional. 28.4 asserts a `seq`-carrying item is refused naming the key; README states it. |
| R1 | Diagnostics | `tooling/build-checks.mjs` 28.5 | A purity regression upstream would crash the group with a raw stack trace through the unwrapped second `flagOf` call rather than an itemised `✗`. CI still fails; readability only. | `flagOf` catches and records the throw as its own `ok(false, …)`. |

Not fixed, by design: plan Q2 (parent exactly one rung above) stays an assumption; the reviewer notes relaxing it after runs 1–2 are recorded means re-validating committed records, so it should be settled before #284 records real runs.

## Numbers pass (every figure in the PR body and report re-derived by the reviewer)

| Figure | Provenance | Result |
|---|---|---|
| `all 28 groups pass` | observed (reviewer ran the gate) | ✓ |
| 28 further refusals | observed (`REFUSALS.length` counted; the gate asserts `>= 27`) | ✓ |
| CLAUDE.md +130 words | observed (2761 → 2891 via `git show 817ea9f:CLAUDE.md`) | ✓ |
| README 179 lines | observed | ✓ (181 after Q1's sentence) |
| ops.mjs 181 lines | **wrong** — 214 | fixed (F2) |
| drift-check 12 steps | observed | ✓ |
| md5 `ab6eb0ee…` | observed | ✓ |
| no `portal/node_modules` (SDK-free) | observed | ✓ |
| mutation reds 2 / 5 / 1 / 1 | observed (each reproduced, same lines) | ✓ |

## Validation

| Gate | f9830b2 | 94049d6 |
|---|---|---|
| `node tooling/build-checks.mjs` | `all 28 groups pass` (reviewer + author) | `all 28 groups pass` (author, observed) |
| `node tooling/drift-check.mjs` | ✓ 12 steps | ✓ |
| `gen-loc-summary.mjs --check` | no drift | — (no `system/` or `agent-layer/` file touched) |
| CI `verify` / `visual` | pass / pass (observed) | pending at time of writing |

## What's good

- Answer-by-reference is a data-model property, not a prompt line: `record_decision` has no text parameter and an unresolvable ref throws.
- Every refusal in 28.4 fails on its own branch; positive controls precede the refusals; the md5 case has a working negative control.
- README matches the code on every rule the reviewer checked by running the function, not grepping.
- CLAUDE.md edits are index-only; the architecture doc change is the one stale clause, `+1 −1`.

## Recommendation

**Approve** (posted as a comment — solo repo). No Critical/High; the Medium and both Lows plus the design question are fixed in 94049d6 with gate cases. Remaining before merge: CI green on 94049d6, and the group-28 renumber if #282 lands first (report §Deviations).
