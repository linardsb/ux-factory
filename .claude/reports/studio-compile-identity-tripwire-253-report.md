# Implementation Report — studio compile beat: identity tripwire for the mid-"compiling" redraft (#253)

**Plan**: `.claude/plans/studio-compile-identity-tripwire-253.md`
**Branch**: `feature/studio-compile-identity-tripwire-253`
**Status**: COMPLETE

## Summary

`applySwap` now refuses a swap whose wrappers are no longer the exact elements `compile()` read the
board beside — closing the same-count collision PR #252's finding M1 confirmed: a method-card
redraft inside the beat's ~2 s "compiling" window used to dress the NEW board's wrappers in the OLD
board's compiled screens whenever the place counts happened to agree. The fix is an element-identity
snapshot wholly inside `studio-compile.mjs` (no new seam, no counter in any attribute), riding the
count tripwire's existing refusal path: thrown before anything is stashed, caught by `compile()`'s
handler, rendered as the refusal card, recoverable via "Back to blocks". `adoptBoard`'s overclaiming
comment (M1's other half) now describes the identity tripwire truthfully.

## Tasks completed

- The #253 methodPass case (3 assertions: the refusal + verbatim sentence, the untouched drafted
  stage, the Back-to-blocks recovery end to end) → `tooling/studio-journey.mjs` (UPDATE)
- The identity tripwire: snapshot holder beside the stash, snapshot in `compile()`'s synchronous
  head beside the board read, identity check FIRST in `applySwap` (fixed sentence, interpolates
  nothing), release in `settle()`, header tripwire paragraph now names both tripwires →
  `system/studio-compile.mjs` (UPDATE)
- `adoptBoard`'s mid-"compiling" paragraph rewritten to the now-true statement (comment-only diff,
  verified) → `system/studio.mjs` (UPDATE)
- `system/loc-summary.json` regenerated after staging (runtime group 26700 → 26800) + the two
  approach baselines regenerated via `update:docker` from the clean `wt-253` worktree (UPDATE)

## Tests added

`methodPass` p6 block, three `t()` cases on all three engines:

- `#253 · a same-count redraft mid-compiling lands REFUSED with the identity sentence` — the
  window sanity conjunct (`midState === "compiling"`) plus the fixed sentence verbatim.
- `#253 · …and the drafted blocks are on the stage untouched — no stale screen swapped in` —
  drafted labels computed in Node from `draftBoard` (worklist 3 → hunt variant 3, same count,
  new middle), every slot still `stu-place`.
- `#253 · …and after Back to blocks a fresh compile renders the DRAFTED board's own screens` —
  every slot `stf-screen`, headings equal to the drafted labels.

**The RED run (AC #4, recorded before the fix):** chromium against unfixed code — the beat settled
`"rendered"` with the stale screens, so the wait for `"refused"` timed out:

```
✗ chromium threw: page.waitForFunction: Timeout 20000ms exceeded.
── chromium: 299 passed, 1 failed
```

After the fix: chromium 327 / firefox 323 / webkit 323, 0 failed (baseline before this ticket:
324 / 320 / 320 — +3 per engine, the plan's predicted delta).

## Validation results

All definitive runs were made from the `wt-253` worktree — the exact PR tree
(`origin/main` @ `45b9ab5` + this ticket's edits and nothing else), served on its own port
(memory: stale-serve-wrong-tree):

- `node --check` on all three edited files — pass.
- `node tooling/build-checks.mjs` — all 20 groups pass (group 15's boundary statement unchanged and
  still accurate: "the tripwire refusal" is studio-journey's, now with two tripwires behind it).
- `BASE=http://127.0.0.1:4758 node tooling/studio-journey.mjs all` — chromium 327 / firefox 323 /
  webkit 323, each 0 failed, exit 0, the three #253 cases green on every engine, zero `✗` in the
  full log.
- Manual walk (Level 4) performed in a real Chrome via agent-browser against the development
  tree's serve: shape → Worklist (3 places drafted), Compile pressed, rewardType → hunt at
  ~700 ms into the beat → state `"refused"`, the identity sentence verbatim in the refusal card,
  stage holding Worklist / Results / Settings as `stu-place` blocks; Back to blocks → `"blocks"`;
  fresh compile → `"rendered"` with screens headed Worklist / Results / Settings. Screenshots in
  the session scratchpad (`253-refusal-card.png`, `253-recovered-screens.png`).
- Drift: `gen-loc-summary` (run after staging, per memory) moved the runtime group's rounded count
  (26700 → 26800); approach.html renders it, so the two approach baselines were force-regenerated
  (PNGs removed first — memory: vr-update-skips-subperceptual) via `update:docker` from the clean
  worktree and are staged in this PR (memory: loc-summary-baseline-cascade,
  vr-gate-reads-working-tree). No `param-manifest.json` change (no new control). No other VR churn
  — the refused state is interaction-only and the at-rest DOM is unchanged.

## Deviations from the plan

- **The journey block is `p6`, not the plan's sketched `p4`.** PR #254 (merged after the plan was
  written) appended the #252/L1 loading-window race cases to methodPass as `p4`/`p5`; the new case
  keeps the plan's placement rule (end of methodPass, before `ctx.close()`) under the next free
  name.
- **The loc-summary rounding DID flip** (the plan called it "almost never" for ~15 lines — the
  comment-heavy fix landed ~45 lines in `system/`), so the approach-baseline cascade in Level 5's
  conditional branch was taken.
- None otherwise — the fix, the check order (identity before count), the fixed sentence, the
  `settle()` release and both comment rewrites are exactly the plan's.

## Issues encountered

- **The shared working tree changed branches mid-session** (memory: shared-worktree-parallel-
  sessions). The parallel #215 session switched the shared checkout to `feature/component-catalog-215`
  and committed its work (catalog module, its own loc-summary regen at 27300, a new /components VR
  page + baselines) while this ticket's gates were running. This ticket's edits survived as
  working-tree modifications and none were swept into the #215 commits (verified: HEAD did not
  contain them). Remedy per the memory's own prescription: the ticket moved to a dedicated
  `wt-253` worktree on its own branch, the shared tree was restored clean for the #215 session,
  and every validation was re-run from the worktree. Two development-tree artifacts were
  discarded as void: the first `update:docker` run (it captured the #215 tree — its approach
  PNGs came out byte-identical to #215's own baselines) and the first loc-summary staging.
  The development-tree journey runs (chromium 327/0 red-then-green, firefox 323/0, `all` exit 0)
  remain as corroborating evidence but the worktree runs above are the record.
- The branch was created off `origin/main` (`45b9ab5`) rather than the stale local `main`; the
  session started on `feature/studio-compiled-screens-overflow-251` with a dirty review file that
  proved byte-identical to origin/main's copy (stash-verified, then dropped).
