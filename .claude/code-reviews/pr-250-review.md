# PR #250 Review — fix(249): studio INP gate review fixes

**Verdict: APPROVE (with two Low comments)** — posted as a comment because a solo repo cannot
formally `--approve` its own PR. No Critical, High or Medium findings; validation passes end to
end including a live gate run; the PR does exactly what it claims and nothing else.

Reviewed with fresh eyes at the PR head (`a15b359`, base `main`, mergeState CLEAN). Deep diff
pass dispatched to the code-reviewer agent; every finding was re-verified against the source by
hand before it was kept. The report documents no deviations in substance, and none were found —
plan, diff and report are in full parity, down to the prescribed snippets shipping verbatim.

## Are the four #247 findings actually discharged?

Yes — traced by hand, not taken from the report:

- **Finding 1 (M, dead-pipeline vacuity)**: `alive` is hoisted at `tooling/studio-journey.mjs:3058`
  and every null-latency row consumes it at `:3233`. Dead pipeline ⇒ `calSeen = []` ⇒ `alive =
  false`; all 16 rows measure null; `violations()` excludes nulls so no retry fires; every row's
  `pass = alive && !m.retried = false` ⇒ 17 named reds. The report's mutation run (281/17) shows
  exactly this.
- **Finding 2 (M, comparator bypassed)**: `overLabels()` (`:3201-3203`) is the single decision
  function for BOTH the retry filter (`:3204`) and `stillOver` (`:3228`). Verified by grep:
  `BUDGET_MS` appears only at the const, `overLabels`, the two prints/labels and the self-test —
  no inline `> BUDGET_MS` / `?? 0` idiom survives, exactly the plan's AC.
- **Finding 4 (L, retry clearing as "below floor")**: `null + retried` is red on the assertion
  path (`:3233`) and prints as inconclusive on all three surfaces — retry line (`:3214`), table
  (`:3223-3224`), assertion detail (`:3236`). The `m.retried` truthiness guard is sound: the
  filter only admits rows with latency > 200, so a preserved `retried` can never be 0.
- **Finding 3 (M, vt-verify overclaim)**: the reword is accurate against the code paths — the
  compile beat (`:448-468`) genuinely runs under both `reduced` states ("that one under reduced
  motion too"), the take-over/keep-rail samples (`:481-518`) genuinely sit inside `if (!reduced)`
  ("full motion only by design"), and the true cross-engine "in every one (engines)" tail
  survives. The skip is now commented at the guard (`:480`).

**Healthy-engine parity holds analytically**: for every row shape reachable on a healthy engine
(numeric, numeric-retried, null + alive + never-retried), the new three-way verdict reduces to
exactly the old `(m.latency ?? 0) <= BUDGET_MS` result.

## Findings

### Low — the self-test control still doesn't exercise `overLabels()`, the function the gate actually calls

`tooling/studio-journey.mjs:3244-3246` — the self-test drives `violations()` directly, but the
gate's decision path is now the `overLabels()` wrapper (map `measured` → `{label, latency}` rows
→ `violations()` → labels). A mapping bug in that wrapper (wrong field read, labels dropped)
would return `[]` forever: no retry would fire, `stillOver` would stay empty, and every numeric
row would pass regardless of latency — the same vacuous-green class finding 2 closed, moved one
function outward. Not a regression (the pre-fix inline filter had identical exposure), but the
PR body's "the self-test control now guards the comparator the gate actually uses" is one
function short of literally true. Fix-later grade: a ~3-line synthetic `overLabels()` control
(`{fast: 12, slow: 250, none: null}` ⇒ `["slow"]`). Note the trade-off: one more assertion per
engine moves the committed 298/294/294 pass counts, so it belongs with a re-run, not a hot edit.

### Low — "zero behavioural change on a healthy engine" carries an implicit qualifier

Report line 15 / PR body — the claim is unconditional as written, but a *healthy* contended run
whose over-budget row retries to null now goes red where it previously cleared silently. That is
finding 4 working as designed — the fix's entire point — not a bug; the claim just reads one
clause too wide. Worth a clause ("…that has no over-budget row") next time the report is
touched; not worth a commit on its own.

## Validation

| Check | Result |
|---|---|
| CI (`verify` + `visual`) on the PR | both pass; mergeState CLEAN |
| `node --check` on the three touched tooling files | ✓ |
| The Level-2 pure-helper one-liner (`summarize`/`violations` both directions) | ✓ |
| `node tooling/build-checks.mjs` | all 19 groups ✓ |
| `studio-journey` chromium (live run, fresh server on an owned port 4763) | **298 passed · 0 failed** — matches the report's post-#248 count; 16-row INP table printed, calibration alive, no retries, frame check green |
| `grep -n "BUDGET_MS"` (finding 2's AC) | only the const, `overLabels`, prints/labels, self-test |
| Mutations reverted | `inp-observer.mjs` byte-identical to main; `BUDGET_MS = 200` |
| Diff scope | exactly the 4 claimed files; nothing outside perfPass + the vt-verify sentence/comment |
| `Closes #249` trailer; plan + report committed in the PR | both hold |

## What's done well

- The dead-pipeline fix is structural, not cosmetic: the null branch asserts a *delivery* claim
  and a *retry-history* claim instead of a budget claim, which is what makes "no inline budget
  comparison remains" literally true rather than true in spirit.
- `stillOver` is computed after the retry merge (the plan's own GOTCHA), so "red only if still
  over" is preserved for numeric retries.
- The inconclusive state prints as itself on every surface — retry line, table, assertion detail —
  preserving the #247 review's praised "both numbers on every path" property.
- The red-run proofs are real runs with named assertions (memory `check-that-cannot-fail`),
  including the honest note that the first dead-pipeline run died on the documented #236
  settle-timeout flake and was re-run per `build-journey-failure-vs-flake`.
- The narrated comments were updated in the same register as the surrounding prose, and each
  names the finding it discharges — future readers get the why, not just the what.

## Recommendation

Merge. Both Lows are optional polish for a future pass over this file; neither moves the
verdict.
