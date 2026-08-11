# PR #258 Review — studio compile identity tripwire (#253)

**Verdict: APPROVE** (posted as a comment — solo repo, the author cannot formally approve their own PR).
No Critical or High findings. Three Lows, logged below; one (L1) is a one-line comment fix worth landing before merge.

Reviewed with fresh eyes from the `wt-253` worktree at the exact PR head (`f86f5ea`, base `45b9ab5` =
current `origin/main`, merge state CLEAN). Deep pass dispatched to the code-reviewer agent; every gate
below re-run by the reviewer on the PR tree, not taken from the report.

## Summary

The fix is correct and minimal. `compile()` snapshots the stage's wrapper **elements** in the same
synchronous block that reads the board (no `await` between them), `applySwap` checks identity first and
throws a fixed, interpolation-free sentence down the count tripwire's existing catch/refusal path, and
`settle()` releases the snapshot on every reachable terminal branch. Nothing is stashed before either
tripwire, so a refusal is provably atomic. No new seam is opened to `studio.mjs`; no counter reaches an
attribute (determinism rule held). The element-identity realization of the ticket's "identity/generation
stamp" is a **documented** deviation (plan §Solution Statement + §Open Questions) with a sound argument —
it also covers the replay driver's post-settle seek churn, which a generation counter bumped only by
`adoptBoard` would miss.

Ruled out by tracing (agent, spot-verified): a false refusal from a null snapshot (unreachable — set
synchronously before the only await chain that leads to `applySwap`; the `state !== "blocks"` gate bars
concurrent compiles); a legitimate mutation tripping identity (all five `.stx-slot`-touching modules
grepped — movement writes `data-col`/`data-row` only, never reorders or replaces nodes); the count
tripwire going dead (still reachable for its stated defect class); `revert()` interacting badly with the
snapshot; build-checks group 15's boundary statement going stale.

## Validation (all re-run by the reviewer on the PR tree)

| Gate | Result |
|---|---|
| `node --check` × 3 edited files | pass |
| `node tooling/build-checks.mjs` | all 20 groups green |
| `studio-journey chromium` (wt-253, own serve on :4759, tree curl-verified) | **327 passed / 0 failed** — matches the report, +3 over the 324 baseline |
| **RED re-verification** (fix reverted in the working tree, journey re-run) | **299 passed / 1 failed** — `waitForFunction: Timeout 20000ms exceeded`, byte-identical to the report's recorded AC #4 red; the new gate runs and can fail |
| Refusal sentence, journey ↔ source | byte-identical (extracted programmatically from both files, not retyped) |
| `gen-loc-summary.mjs --check` | no drift — 26700→26800 is real (+29 net tracked lines in `system/` crossed the rounding boundary) |
| CI | `verify` + `visual` both green; `mergeStateStatus` CLEAN |

Firefox/webkit were not re-run by the reviewer (chromium green + the report's recorded 323/323 + green CI
accepted for the cross-engine claim).

## Findings

### L1 (Low) — stale `file:line` citation, introduced by this PR's own sibling edit
`tooling/studio-journey.mjs` (new p6 block, ~:3383): the comment cites "`studio-compile.mjs:262`" for the
compile button being the first child of `.stu-compile`. That was accurate at base — but this PR's own
header rewrite in `studio-compile.mjs` added 3 net lines above it, so at HEAD the construction sits at
**:265** (`const row = el("div", { class: "stu-compile" }, compileBtn, revertBtn);` — verified against
`git show HEAD`). Comment-only, zero behavioral impact, but citations are load-bearing documentation in
this repo. **Fix**: cite `:265` (or `:256-265`).

### L2 (Low) — the p6 case's window is a soft real-time race (documented; no action)
The case's ability to reach `"refused"` depends on the bare `p6.check(...)` landing inside the beat's
~1.7 s window. A pathologically slow machine would miss it, and the failure mode is a hard
`waitForFunction` timeout rather than a clean `t()` red. The plan's §Open Questions names exactly this
risk and the mitigation used (pre-park + raw `$eval` click, ~300 ms of budget spent). Logged for the
record; revisit only if it flakes in practice.

### L3 (Low) — snapshot-holder comment slightly overstates `settle()`'s coverage
`system/studio-compile.mjs:393-399` says the snapshot is "Released at settle()", but `compile()`'s two
`if (destroyed) return state;` early returns skip `settle()`, leaving the snapshot held. Harmless in
practice — `destroy()` is harness-only teardown today and each `mountCompile()` closure starts fresh —
but the sentence claims more than the code does. Optional one-word softening ("released at settle(), or
dropped with the closure on destroy") if touched again.

## What's good

- The atomicity argument holds by construction: both tripwires throw before any `stash.set`, so no
  partial swap is reachable on any refusal path.
- The journey case computes its expectations in Node from `draftBoard` (never literals), pre-parks its
  target, and carries the `midState === "compiling"` sanity conjunct that turns a missed window into a
  diagnosable failure.
- The loc-summary → approach-baseline cascade was executed exactly per the repo's own recorded
  conventions (regenerated from the clean worktree, PNGs handled per the sub-perceptual memory).
- The report is honest about the mid-session shared-tree incident and re-based every definitive gate on
  the worktree; all three PR-body deviations are documented in the plan/report, none undocumented.
- Surgical diff: every changed line traces to the ticket.

## Recommendation

**Approve.** L1 is worth a one-line commit on this branch before merge (same-PR rule); L2/L3 are logged
and need nothing. Heads-up retained from the PR body: if #215 merges first, `system/loc-summary.json`
conflicts — resolve by regeneration, never hand-edit.
