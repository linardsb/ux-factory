# Implementation Report — Studio #249: INP gate review fixes (PR #247 follow-up)

**Plan**: `.claude/plans/studio-249-inp-gate-review-fixes.md`   **Branch**: `feature/studio-249-inp-gate-review-fixes`   **Status**: COMPLETE

## Summary

Discharged all four PR #247 review findings inside `perfPass` (`tooling/studio-journey.mjs`) plus one
sentence in `tooling/vt-verify.mjs`: the 16 INP row assertions now consume the calibration verdict
(`alive`), so a dead Event Timing pipeline yields 16 named reds instead of 16 vacuous greens; the
imported `violations()` comparator is now the single budget decision for BOTH the retry filter and
the row verdicts (via a local `overLabels()` — no inline `> BUDGET_MS` / `?? 0` comparison remains);
a row that measured over budget and whose retry yields no entry is an inconclusive **red**, printed
as such on the retry line, in the table AND in the assertion detail; and vt-verify's summary no
longer claims reduced-motion coverage for the #213 take-over/keep-rail samples (the skip is by
design and now commented at the guard). Zero behavioural change on a healthy engine, proven by full
green runs of both gates on all three engines.

## Tasks completed

- Capture the calibration verdict as `const alive` (fix 1 foundation) → `tooling/studio-journey.mjs` (UPDATE)
- Route the retry filter through `violations()` via `overLabels()` (fix 2) → `tooling/studio-journey.mjs` (UPDATE)
- Retry print names the inconclusive case + retry-rule comment updated (fix 4) → `tooling/studio-journey.mjs` (UPDATE)
- Table print forks on `m.retried` for the null case (fix 4) → `tooling/studio-journey.mjs` (UPDATE)
- Row verdicts consume `alive` + `violations()` — three-way verdict, no inline budget compare (fixes 1/2/4) → `tooling/studio-journey.mjs` (UPDATE)
- perfPass header + runSequence doc comments state the new wiring → `tooling/studio-journey.mjs` (UPDATE)
- Reword the summary's reduced-motion tail + comment at the `if (!reduced)` guard (fix 3) → `tooling/vt-verify.mjs` (UPDATE)

## Tests added

No test suite in this repo — the touched surfaces are the two operator gates, and the gates
themselves plus two mutation red-runs are the tests (memory `check-that-cannot-fail`). See below.

## Validation results

- **Level 1 (syntax)**: `node --check` on studio-journey.mjs, vt-verify.mjs, inp-observer.mjs — all pass.
- **Level 2 (pure helpers)**: the one-liner prints one grouped interaction latency 250, flagged at
  budget 200, empty at budget 300 — as expected.
- **Level 3 (regression sanity)**: `node tooling/build-checks.mjs` — all 19 groups ✓.
- **Level 4 (the gates, healthy)**: fresh server on an owned port (4761 — both 4757 and 4759 were
  already occupied; the #247 EADDRINUSE lesson applied). `studio-journey all`:
  **chromium 298/0 · firefox 294/0 · webkit 294/0**, INP tables printed per engine, no retries
  triggered (counts are the post-#248 shape — main gained the #212 flow pass since the #247 review's
  286/282/282 table). `vt-verify`: green on all three engines with the reworded sentence printing.
- **Level 5 (red-run proofs, chromium)**:
  1. **Dead pipeline** (OBSERVER_INIT `type: "event"` → `"mark"`): **281 passed, 17 failed** — the
     calibration red plus all 16 rows red, each with detail
     `no entry (< 16 ms floor) · calibration DEAD — nothing was delivered this run`. Zero vacuous
     greens. (Before the fix this mutation yields 1 red + 16 greens — the finding.)
  2. **Inconclusive retry** (`BUDGET_MS = 1`): second run produced the shape (first run's 15 retries
     all yielded numbers; the plan anticipated the re-run) —
     retry line `retried: keyboard arrow step 16 ms → no entry (inconclusive)`,
     table `keyboard arrow step · no entry after retry (inconclusive) · 0 entries · retried from 16 ms`,
     assertion `✗ INP · keyboard arrow step ≤ 1 ms  inconclusive — first measured 16 ms over budget,
     the retry yielded no entry`. The same runs also show the edge cases holding: a first-measure
     null row (`keyboard grab`) still passes via `alive`, and numeric retries clear/flag through
     `violations()` with both numbers printed.
- **AC grep check (finding 2)**: `grep -n "BUDGET_MS" tooling/studio-journey.mjs` shows only the
  const, `overLabels`, the table-header print, the assertion label, and the self-test.
- **Mutations reverted**: `git diff` shows only `tooling/studio-journey.mjs` (+33/−11 net) and
  `tooling/vt-verify.mjs` (+2/−1); `inp-observer.mjs` byte-identical to main; `BUDGET_MS = 200`.

## Deviations from the plan

- **None in substance.** Two execution notes:
  - The first dead-pipeline red run aborted before perfPass with a `[data-replay="settled"]` 30 s
    timeout in the **#236 teardown pass** — a pass that never loads the observer (OBSERVER_INIT is
    injected only in perfPass's own context), so it was the documented settle-timeout flake, not the
    mutation; the re-run (per memory `build-journey-failure-vs-flake`) produced the clean 17-red proof.
  - The plan's `PORT` note played out: 4757 carried a live server from another session (left
    untouched — shared-worktree rule) and 4759 was occupied by an unrelated listener; the gates ran
    against a fresh server on 4761 via `BASE`.

## Issues encountered

None beyond the two notes above. Red-run logs captured in the session scratchpad
(`studio-journey-deadpipe2.log`, `studio-journey-budget1.log`, `studio-journey-budget1b.log`);
verbatim excerpts above.
