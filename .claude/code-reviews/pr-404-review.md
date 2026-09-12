# Review — PR #404, the later, not never run (#393)

**Verdict: approve.** The diff is one server-written package, eight literals moved 5 → 6, and prose.
No logic changed. Every gate green on the merge ref.

## What was actually reviewed

| Surface | Finding |
|---|---|
| `discovery/later-not-never-1/` (4 files) | Server-written, unedited. `git diff` is an add. Verified below. |
| `tooling/build-checks.mjs` | 6 changed lines, 8 string/number sites, all the same literal. No assertion logic touched. |
| `portal/lib/discovery-postures.mjs` | 1 comment line. No prompt string moved, so no fingerprint moved. |
| `.claude/references/gates.md` | 1 line of write-up. |
| `discovery/README.md` | §Files row, T7 step 5's sentence, a new §The later, not never run. |
| `.claude/reports/…-393-report.md` | New. |

## The checks a reviewer should insist on here, and their answers

**Did the package get hand-edited?** No. `answers.jsonl` and `transcript.jsonl` are append-only and
server-written; the three duplicate `a7`/`a8`/`a9` lines and the three `Credit balance is too low`
text lines are still there, which is itself the evidence — an edited package would be tidier.
`prd.md` is the projection's own bytes (`prd-projection.mjs` re-run; group 33 compares them in CI).

**Did the failure text leak into the committed PRD a hiring manager reads?**
`grep -c "Credit balance" discovery/later-not-never-1/prd.md` → **0** (observed). The projection folds
`op` lines only, and this confirms it on the one package that could have exposed the gap.

**Do the duplicate answers render twice?** No. Every question id appears exactly twice in `prd.md` —
once in its section, once in the Requirement hierarchy — and `s4-appetite`, the duplicated one, is no
different from the other 29 (observed, counted across all ids). `latestByQuestion` did its job.

**Did the fingerprint move?** No. `discovery-postures.mjs`'s only change is inside a comment. Group 32
is green and no committed recording was staled.

**Is the count edit correct rather than merely green?** Yes, and it has a positive control: before the
edits the gate's single failure was `30.46` naming `later-not-never-1 (6 turns)` mid-session, so the
case can fail and failed for the predicted reason.

**Is the honesty claim in the commit body true?** The PR states the owner wrote all 31 answers. That
was the outcome of a decision put to them before the run, recorded in the report with the precedent
check that prompted it (`my-product-name` never committed; run 0 the owner's own product). `README:23`
is unamended, which is only sound because no agent text is in the package.

## Findings

**F1 (low, accepted) — the package carries three duplicate answer lines and three error lines
forever.** Append-only, so the alternative was deleting a $2.61 run. Documented in the package's own
README section rather than hidden. No action.

**F2 (low, re-scoped) — the plan under-counted the prose cascade by five sites.** Fixed here; the
lesson is in the report and in memory. Belongs to whoever writes the next plan touching a derived
count, not to this PR.

**F3 (informational) — three findings from the run itself (drawer renders an SDK error as a turn;
cost estimates assume a warm cache; duplicate submissions on a stalled cursor) are re-scoped to
#279** and are not this PR's to fix.

## CI, on the merge ref

`verify` pass · `codeql` pass · `CodeQL` pass · `visual` pass · `audit` pass · `gates-green` pass
(observed, `gh pr checks 404`). Note `main-branch-protection-off`: green here is informative, not
blocking.

Reviewed by Claude Opus 5 on behalf of the author (solo repo — see `piv-review-pr-self-approve`).
