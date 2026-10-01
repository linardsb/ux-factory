# Implementation Report — #316 T10a: a failed seed reds by name, G2 waits for its file

**Plan**: `.claude/plans/faster-payment-build-run-316.md` (the version on `docs/plan-316-t10-318`, a3dcab7)
**Branch**: `fix/316-t10a-seed-and-g2` (cut from a3dcab7 in `wt-316-t10`)   **Base**: `origin/main` 9497455 → 9497455 at report (re-fetched; unmoved)   **Status**: PARTIAL — T10a only; the rest of the plan is blocked (Not run)

## Summary
Segment A (T1–T9) landed as PR #495 and #318 merged as PR #499 before this session. The only agent task the plan
leaves runnable is T10a. It closes R12 (PR #495 review F4: a failed seed in groups 43 and 50 could degrade to an
empty ledger) and R13 (canvas-journey G2 races `saveRun`'s `groups/g1.json` write).

The path given to `/piv-implement` (`.claude/plans/faster-payment-build-run-316.md` in the primary tree) is an
untracked 515-line copy older than `main`'s. The current plan is on `docs/plan-316-t10-318`, and this branch is cut
from it, so the plan's amendments ride in this PR.

## Tasks completed
- T10a, groups 43 and 50 → `tooling/build-checks.mjs` (UPDATE). `pkgCopy` wraps `seedSpine` in the group's `fold()`.
  A throw, or an answer with no `build/ops.jsonl`, records `<group>: seed failed for "<tag>"` and returns an empty
  scratch path (with no ledger in it) rather than `null`. `ledger()` reads a missing `ops.jsonl` as `[]`.
- T10a, G2 → `tooling/canvas-journey.mjs` (UPDATE). Added `waitJson(file, ms = 6000)` beside `waitLines`; it polls
  every 100 ms until the file exists AND parses, because `saveRun` writes `groups/<id>.json` with a plain
  `writeFileSync`, which a reader can catch half-written. G2 asserts on its result.
- Plan AMENDMENTS entry (UPDATE).

## Tests added
No new cases. The edits harden the existing fixtures in groups 43 and 50 and the existing G2 assertion.

## Proving the checks
| Mutation | What went red (observed) | Positive control |
|---|---|---|
| M1: both seeds read `discovery/no-such-slug`, so `seedSpine` throws | `build import run ✗ 42`, `build ratify ✗ 21`, `build ✗ 63`. 44 lines read e.g. `43: seed failed for "sel" threw instead of answering: seedSpine: …/no-such-slug has no 6-line spine`. The extra ratify reds are 50.18's `groupPkg`, which the same sed hit and which was already `fold()`-guarded | unmutated `node tooling/build-checks.mjs`: `build ✓ all 50 groups pass` |
| M2: the seed answers its dir without writing a ledger (`mkdirSync(dest)`) | `build import run ✗ 42`, `build ratify ✗ 5`. Lines read `43: seed failed for "sel" … seedSpine answered …/pkg with no build/ops.jsonl`; 5 such lines in group 50 | same |
| G2: G2's `gFile` line pointed at `g2.json` (chromium) | `✗ G2 · build/groups/g1.json exists with three parts`, chromium 211 passed / 1 failed. An earlier run of the first version used a sed that also hit G5's path; that run added a collateral G5 ENOENT red | `node tooling/canvas-journey.mjs all` → chromium 212/0, firefox 211/0, webkit 211/0 (re-run on the final code) |

**A first attempt failed its own mutation.** The first version kept `null` as the failed-seed answer. Under M1,
`ok(false)` fired, but `join(null, …)` at 43.8 then threw uncaught and aborted build-checks before group 43 printed.
The output held a TypeError stack and no `seed failed` line (observed). That is why a failed seed now answers an
scratch path with no ledger, not `null`.

**Limit of the G2 mutation:** it proves G2 still reds on a missing file after the poll. It does not reproduce the
original race, which needs `saveRun` to be slow, so the race fix rests on the poll's logic and on three green engines.
The partial-write case has no mutation either; it rests on `readJson` returning `null` on a parse error.

## Validation results
All observed on this branch's working tree:
- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass`, exit 0.
- `node tooling/canvas-journey.mjs all` → chromium 212 passed / 0 failed, firefox 211/0, webkit 211/0, exit 0.
- `node agent-layer/gen-loc-summary.mjs --check`, run after staging → `loc summary ✓  3 groups — no drift`.
  `tooling/*.mjs` is in no loc group, so there is no VR cascade.
- `node tooling/token-lint.mjs` → exit 0.
- `node --check` over every tracked `.mjs` → no errors.
- `node tooling/drift-check.mjs` (CI's verify step) → `drift-check ✓  syntax · token-css · … · build-handoff · group-count`, exit 0.
- `env -u ANTHROPIC_API_KEY node tooling/run-316-ready.mjs` → `3 of 12 checks red`: check 3 (#319), check 4 (#320)
  and check 6. Check 6 is red only because this branch's two edits were uncommitted at the time; it reads the tree.
  Re-run on the committed tree (code identical to this branch's HEAD; only this report line was amended in afterwards): `run-316 ✗  2 of 12 checks red` (checks 3 and 4 only), observed.

## Not run
- `ratify-journey` and `studio-journey`: this change touches neither driver. Owner's call whether to run them.
- Portal smoke (`/api/health`): no portal file changed. canvas-journey boots this worktree's own portal and asserts
  `/api/health` (observed green above).
- T10b: needs #320's fork-list fold. Tracker: #320.
- T10c: done before this session (2026-10-01); it raised Q2.
- T10d: needs #319's and #320's journeys. Trackers: #319, #320.
- Ready gate ✓: blocked on #319, #320 and, under Q2a, #498.
- T11–T13: owner's hands. T14–T18: after the sitting. Tracker: #316 stays open.

## Deviations from the plan
- **(plan error)** T10a said to add "`ok(false, …)` where the scratch seed returns nothing". `seedSpine` never
  returns nothing (it returns `destPkg` or throws), and an `ok(false)` alone was swallowed by a downstream crash
  (above). Implemented instead: a failed seed records `seed failed` and answers its scratch path with no ledger, and `ledger()`
  tolerates a missing file. Logged under AMENDMENTS.
- **(plan error)** T10a named one REDDENS ("copy a non-existent slug"), and R12 named another ("make `seedSpine`
  throw"). Both were driven (M1 covers both wordings), plus M2 for the no-ledger branch.

## Assumptions carried
- PR body `Refs #316` only, with no closing wording (memory: a Refs-only body that said "will close" closed #316).
- Q1 (wait for #318–#320 or run without D1/D2/D5) and Q2 (wait for #498 or run with D2 Not run) stay the owner's.
  The plan's defaults are wait and Q2a. T10a depends on neither.

## Additions beyond the plan
- `ledger()` in groups 43 and 50 tolerates a missing `ops.jsonl`. This was needed for the seed red to print (above).
- G2 polls until the JSON parses, not only until the file exists. `saveRun`'s group write is not atomic (`canvas-store.mjs`, `writeFileSync` in the `groups/` loop).

## Issues encountered
- The primary tree's plan file is a stale untracked copy (see Summary). It was left untouched, along with the other
  session's dirty `SKILL.md`.
