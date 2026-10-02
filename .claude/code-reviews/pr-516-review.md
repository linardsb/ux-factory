# PR #516 review — options, not answers, at forks (#320, D5)

**Head** `3e746a2a2b0814c407948668f7ccc666f1cc9cd3` · **Base** main @ `2bc65de29992f48e48f216e0fb3736a96a6223ce` · round 1 (no prior report, so the guarantees pass does not apply)

## Summary
The PR adds the D5 fork: one compose turn files two options of one screen, and the owner picks one or neither. The invariants are enforced at five layers: the applier, `appendAgentLine`, `saveRun`, `verifyBuild` and the page's one-save pick. A fresh-context reviewer attacked each layer with scripts against the PR's modules, and all of them held except one write path (F1). The reviewer also mutated nine guards in a scratch copy, and each mutation turned a build-checks group red, so the new checks are not vacuous. No Critical or High findings. **Recommendation: approve.** F1 is worth fixing before merge or as a follow-up.

## Findings

### F1 (medium) — the save route accepts a client-written fork tag that only `verifyBuild` objects to afterwards
`portal/lib/canvas-store.mjs` `saveRun` (status gate ~l.654–662) and the redo rule in `verifyBuild` (~l.318–335).

What goes wrong: the PR presents the `alternative` tag (the label saying which fork option a frame is) as server-set. On the save route it is client-supplied. A `POST /api/canvas/save` carrying one `{op:"screen.compose", params:{…, alternative:{turn:"c1",option:"a",fork:"5"}}, status:"applied"}` with no proposal behind it is written. Observed with the reviewer's script, re-run by me against the worktree:

```
forged applied alt SAVED { count: 1 }
verify: [ 'ops.jsonl line 1: an owner line carries fork option a of c1, which no verdict picked (D5)' ]
```

Consequences:
- `forkFrame` then reads fork 5 as picked, so its inbox row clears with no agent proposal and no verdict.
- If the forged line names a live fork turn, the applier's twin check (the rule that only one option of a turn can land) refuses the owner's real Pick as "already landed".
- The ledger is append-only, so the red `verifyBuild` line cannot be repaired. This is the situation the store's own header comment (~l.609) gives as the reason `saveRun` refuses before writing.

The plan's Task 2.3 GOTCHA rejects a blanket refusal of an owner `applied` compose carrying the tag, because a redo restates one. That is correct, and the fix below keeps redo working.

Fix: in `saveRun`, refuse an `applied` `screen.compose` whose `params.alternative` is set unless an earlier `accepted` line, in the existing ledger or earlier in the same batch, has the same `canon({op, params})`. That is `verifyBuild`'s redo predicate, run at write time. Add a 36.16 case for the forged line and keep the redo control green.

Exposure: the portal binds to 127.0.0.1 behind the origin guard, and the shipped page never sends such a line, because its undo/redo adapter only restates accepted ops. So the realistic cause is a hand-built request or a future page bug. That makes this Medium rather than High.

**Outcome:** fixed at `9b1ded5`. `saveRun` runs the redo predicate at write time; 36.16g refuses an option of an open fork and of a turn with no proposal, bytes unchanged, and keeps the undo + redo control green (red before the fix, and red again when the predicate stops searching the ledger).

### F2 (low) — "the alternative was not drafted" also appears when the second option was attempted
`portal/lib/canvas-session.mjs:533-535`. The `not-drafted` line is written whenever exactly one `proposed` op line exists in the turn. That count is also one when:
- the agent's second call was refused (vocabulary, ids, or a different `screenId`; the ledger holds an agent `refused` line and `refusals.md` prints its reason), or
- the turn ended `failed` after option A.

In both cases the page says the option was "not drafted" while the transcript shows an attempt. That is a statement about the agent's behaviour which the record contradicts, which sits badly with the honesty contract.

Fix: write `not-drafted` only when the turn made one proposal call. Otherwise word it as "the second option was refused: <kind>" or "the turn failed".

**Outcome:** deferred to #316's checklist (Review deferrals), where the sitting's real one-option turns can check the wording.

### Note (no action needed) — Neither leaves the fork row open
After a Neither (both options refused), `forkList` keeps the fork's inbox row open until a pick or a later decision. This matches the documented rule ("undo to fork again"). It is flagged only so the owner confirms that is the behaviour they want.

## Validation (observed, worktree at `3e746a2`, fresh `npm ci` in portal, tooling/icons, tooling/style-dictionary)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 51 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · … · build-handoff · group-count` |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| Portal smoke, OS-assigned port | `/api/health` → `{"ok":true,…,"bootSha":"3e746a2…","stale":false}`, killed by its own PID |
| CI on the PR | verify, audit, codeql, CodeQL, visual, gates-green: all pass; `mergeStateStatus` CLEAN |
| canvas-journey | not re-run (operator-run); the PR's 259/258/258 is the author's run |

The first build-checks run in this fresh worktree failed group 41 (`icons`) because `tooling/icons/node_modules` was missing. After `npm ci` it passed. That failure came from the environment, not from the PR.

## Numbers pass
Each figure was checked against the code or against the run that produced it:
- **"still fourteen" ops**: `OPS.length` 14 and `PARAMS` 14 keys. `screen.compose` has the six keys including `alternative` (observed).
- **"a tenth kind"**: `KINDS.length` 10, and `fork` is among them (observed).
- **`FORK_MAX_TURNS` (5)**: `canvas-session.mjs:76` (observed).
- **47.2b re-pinned `32e186e7fedd687d`**: the pin is at `build-checks.mjs:17014`, and group 47 passes, so the value is the computed one (observed).
- **loc 33100 → 33200**: the only changed line in `loc-summary.json`, and drift-check's loc-summary leg is green (observed).
- **15 mutations**: the report table lists M1–M15 (M6 recorded as M6b) plus A4 and A1, with arithmetic consistent: 259 − 7 = 252 (derived). These are the author's runs. The reviewer independently reproduced nine guard mutations going red.
- **Baselines "from a clean detached worktree at the commit"**: the report names `2d467df`, not `3e746a2`. `git diff 2d467df 3e746a2` touches only the report, the two screenshots and the three baselines themselves, so the rendered code is identical (observed). The wording is loose but accurate.
- **The canvas-journey counts and the A1 "252 passed, 7 failed"** are the author's runs. They are labelled observed in the report and were not re-derived here.

## What is done well
- **Defence in depth.** Each fork invariant is enforced at more than one layer, and each layer has a check that goes red when its guard is mutated. Both the author and this review proved that.
- **"Not picked" is derived (`notPickedOf`), never stored.** The ledger line shape is unchanged, and the handoff pack and the page read the same function.
- **The tag is set server-side after the refusals in `fileProposal`.** A refused call does not use up an option, and a model-supplied `alternative` is ignored.
- **The `?fork=` landing writes nothing and runs no turn.** No `innerHTML` was added. `askFork` re-validates the seq, and the server checks it again.
- **The deviations are honest.** The stacked cards are recorded with the owner's O1 decision and their cost (the title truncates), and the paid sitting is left to #316 rather than claimed.

## Recommendation
**Approve.** No Critical or High findings, every gate green. Fix F1 before merge if convenient: one predicate plus one 36.16 case. F2 is copy-level and can wait for #316's sitting, which will show real one-option turns.
