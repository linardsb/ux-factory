# PR #247 Review — feat(213): the studio's measurement gate

**Verdict: APPROVE (with comments)** — posted as a comment because a solo repo cannot formally
`--approve` its own PR. No Critical or High findings; validation passes; the PR does what it
claims. The four findings below are fix-later grade — none blocks the merge.

Reviewed with fresh eyes from the `wt-213` worktree at the PR head (`db494b8`, base
`origin/main`, mergeState CLEAN). Deep diff pass dispatched to the code-reviewer agent; every
finding below was then re-verified against the source by hand before it was kept. The seven
deviations documented in `.claude/reports/studio-gates-213-report.md` were treated as decisions,
not issues.

## Findings

### Medium — a dead Event Timing pipeline leaves the 16 INP rows vacuously green beside one honest red

`tooling/studio-journey.mjs:3062` — the per-row assertion is `(m.latency ?? 0) <= BUDGET_MS`, so
a `null` latency (no observer entry) passes unconditionally. The calibration click (`:2903`)
does fail the run if delivery is dead — the gate as a whole cannot silently pass — but the 16
row assertions it exists to protect don't consume its result: on an engine whose delivery broke,
all 16 rows would print green (most already print `< 16 ms · 0 entries` on a healthy firefox)
beside the single calibration red. Fix: keep the calibration verdict in scope (e.g.
`const alive = calSeen.length >= 1 && …`) and make the null branch of each row assert `alive`
instead of passing outright. Zero behavioural change when healthy; 16 honest reds when dead.

### Medium — `violations()` is only ever exercised by its own self-test, never by the real gate

`tooling/inp-observer.mjs:53-55` vs `tooling/studio-journey.mjs:3039,3062` — the real decision
path re-implements the budget comparison twice inline, in two different null idioms
(`m.latency !== null && m.latency > BUDGET_MS` for the retry filter; `(m.latency ?? 0) <=
BUDGET_MS` for the assertion), and neither calls the imported `violations()`. Its only call site
is the self-test control (`:3068`), fed a synthetic entry. The plan declined a build-checks
group for the helper on the premise that "the self-test control inside perfPass proves the
comparator can fail **where it is used**" — as shipped, that premise doesn't hold: a bug in
either inline comparison is invisible to the self-test that exists to catch comparator bugs.
Fix: route both the retry filter and the row assertions through `violations()`; that also gives
the Low finding below one place to fix instead of two.

### Medium — vt-verify's summary sentence overclaims reduced-motion coverage of the new samples

`tooling/vt-verify.mjs:480,527` — the #213 take-over and keep-rail samples sit entirely inside
`if (!reduced)`, but the green summary sentence appends them ahead of the tail "…sampled the
same way with movement proven first: under reduced motion too, in every one". A reader of the
summary concludes those interactions were verified under reduced motion; the code path cannot
reach them with `reduced === true` on any engine. Skipping them under reduced motion is a
reasonable call — the sentence just has to say so (the "in every one" pattern partially predates
this PR; this PR's edit extends it over two more not-reduced samples). One-sentence rewording.

### Low — a retried over-budget row whose retry yields no entry clears silently as "below floor"

`tooling/studio-journey.mjs:3047-3050` — `measured[label] = { ...re, … }` unconditionally, so a
retry landing on `null` makes the row pass via the `?? 0` idiom. This is consistent with the
printed rule ("red only if still over"; calibration proved delivery, so no-entry legitimately
means < 16 ms) and both numbers print on every path — the report's own BUDGET_MS=1 red run
shows exactly this shape (`retried: keyboard arrow step 24 ms → < 16 ms (below floor)`). Worth
sharpening so "retry produced no entry" is distinguishable from "retry measured fast" for a row
that first measured over budget — e.g. treat that combination as inconclusive-red — but it is
defensible as designed.

## Validation

| Check | Result |
|---|---|
| CI (`verify` + `visual`) on the PR | both pass |
| `node tooling/build-checks.mjs` (wt-213) | all 18 groups ✓ |
| `node --check` on the three touched tooling files | ✓ |
| The plan's Level-2 pure-helper one-liner (`summarize`/`violations` both directions) | ✓ |
| `studio-journey` chromium (this machine, contended) | 286 passed · 0 failed |
| `studio-journey` firefox | 282 passed · 0 failed |
| `studio-journey` webkit (re-run, fresh server) | 282 passed · 0 failed |
| `node tooling/vt-verify.mjs` incl. the new factory samples | ✓ all three engines |
| Report claims spot-checked (loc-summary scope `gen-loc-summary.mjs:22-26`, no shipped file touched, `Closes #213` trailer) | all hold |

The first webkit run and vt-verify red were infrastructure, not code: this session's static
server lost a silent `EADDRINUSE` port collision with another session's server on 4758, which
answered the health check and then died mid-run (`page.goto: Could not connect to the server`).
Re-run against a fresh server on an owned port per the plan's own Level-5 flake discriminator.

Notably, my run was on a machine also running a 50-tool-call review agent — worst INP anywhere
was 96 ms (take-over pointerdown, chromium), still 2× inside the 200 ms budget with no retry
fired, and the 4×-throttled frame check passed at a 33.3 ms worst gap against its 50 ms
threshold. The budget holds headroom under real contention, which is what a base-spec-laptop
proxy should show.

## What's done well

- The mutation discipline is real where it's wired: both red-run proofs in the report are
  genuine runs with named assertions (the new dock case is itself among the broken-verb
  detectors), and `gaps.length >= 20` plus movement-proven-first guard the exact vacuous-pass
  shapes this repo has been burned by.
- The INP semantics are correct against the Event Timing spec: interactionId grouping, id-0
  noise dropped, max-per-group latency, the 16 ms `durationThreshold` floor stated and printed
  rather than hidden.
- The CDP throttle is set and released cleanly; the drag window bounds both the rAF-gap and
  LoAF filters with correct overlap semantics.
- The dock mid-replay case is a three-signal anti-vacuity design: mid-replay state proven
  first, both the take-over flag and the absence of the `/factory/took-over` route asserted,
  and the canvas proven alive afterwards by a real move with its announcement.
- The retry's *reporting* is honest on every path — both numbers always print.
- The bounds block (AC #7) prints on every run and matches what the code actually narrows;
  the CLAUDE.md rows are accurate, including the "16 rows, enumerated not exhaustive" framing.
- The report's "Scope reality" section honestly separates what this ticket added from what
  #204–#241 had already satisfied — the opposite of claim inflation.

## Recommendation

Merge after reading the findings — none blocks. The three Mediums are a natural small follow-up
(or a `piv-fix-review-findings` pass on this file) since all four touch the same ~40 lines of
`perfPass` plus one summary sentence.
