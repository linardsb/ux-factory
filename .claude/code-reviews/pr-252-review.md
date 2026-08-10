# Code Review — PR #252: studio method band — on-canvas method cards + the assemblable Hook loop (#214)

**Reviewer**: code-reviewer agent (fresh context — not the authoring session) · **Date**: 2026-08-10
**Verdict**: **APPROVE** (0 critical · 0 high · 1 medium · 1 low)

## Summary

The PR adds the method band to /factory: ten answer cards plus an assemblable Hook-loop diagram
that redrafts the board live and unlocks an ethics verdict, all as a second mount of the existing
`build-questions.mjs` store. Implementation matches the plan closely — the seven deviations
recorded in the report are all real, argued, and gated. `build-checks` re-run locally by the
reviewer: 20/20; both drift checks (`gen-param-count`, `gen-loc-summary --check`) clean. The
feature is tested at both the pure layer (group 20 — running real functions with mutation proofs,
not grepping) and the running page (`methodPass` — expectations computed from the same imported
rules, never hardcoded).

## Issues

### Medium

**M1 · `system/studio.mjs:593-595` — the mid-"compiling" comment overclaims what the tripwire catches.**
The comment says a redraft in the compile beat's ~2 s "compiling" window "meets the beat's own
count tripwire, which refuses the stale swap loudly rather than misaligning it." That is only true
when place counts differ: `applySwap` (`studio-compile.mjs:409-411`) compares
`wrappers.length !== screens.length` only, never identity. A same-count collision — plausible,
since most `draftBoard` outputs land at 3–4 places — silently swaps the OLD board's compiled
screens onto the NEW board's wrappers: mislabeled content, `wireFlow` wired to stale screens, no
refusal. The report's "Issues encountered" section discloses this accurately; the in-source
comment a future maintainer will actually read does not.
**Fix**: correct the comment to the report's wording (state the count-collision caveat), or close
the gap with a per-wrapper identity/generation stamp in `applySwap`/`adoptBoard`.

### Low

**L1 · `system/replay-driver.mjs` — asymmetric `tookOver` guard on the async provenance writers.**
`relinquish()` guards itself (`if (tookOver || destroyed) return`), but the two provenance writes
inside `start()`'s still-in-flight continuation — the declined branch
(`provenance.textContent = PROVENANCE_DECLINED`, :846) and `unavailable()`
(`provenance.textContent = ""`, :877) — do not check `tookOver` before writing. On the declined
path the band is enabled at construction, so a card answered before the two fetches resolve
triggers `relinquish()` (correctly setting `PROVENANCE_REDRAFTED`), which the continuation then
stomps with a now-false sentence. Blast radius: one line of chrome text in a sub-second window;
the notice and the "This build" note stay correct.
**Fix**: gate both writes on `!tookOver` (one line each).

## What's done well

- Store discipline is genuinely loop-free (`setAnswers` → `"questions"` → redraft →
  `publishBuild("breadboard")` → filtered by `RENDER_SOURCES`), verified by a running assertion
  AND a red-run proof (adoptBoard stubbed → 6 named failures).
- `verdictFor`'s AC #3 identity claim is checked against the imported rules by identity, not
  re-derived, in both group 20 and methodPass.
- `adoptBoard`'s ordering (relinquish → revert-if-compiled → clear via `wrapper.remove()` →
  place → publish → notice) is correct, and the synchronous-enable constraint (plan GOTCHA 1b)
  is honored — no `await`/rAF between the settled-attribute write and the cards' enablement.
- The webkit keyboard deviation is honestly platform-scoped (focus+Space in the gate); product
  code stays native radios.
- `#method` doesn't collide with the inspector's frozen panel ids (grep-confirmed).
- Group 20's mutations are real; its red-run is reproduced verbatim in the report.
- CSS is token-only with zero new transitions (the reduced-motion list correctly gains nothing);
  the `.stu-canvas-col` track fix is scoped to `.stu-shell`, leaving studio.html's harness alone.

## Validation

| Gate | Result |
|---|---|
| CI `verify` (build-checks 20 groups + drift) | pass |
| CI `visual` (regenerated baselines, Linux capture) | pass |
| `build-checks` re-run locally by reviewer | 20/20 ✓ |
| `gen-param-count` / `gen-loc-summary --check` | clean |
| Operator battery (recorded in the report) | studio-journey 318/0·314/0·314/0 ×3 engines · build-journey 157/0 ×3 · vt-verify ✓ ×3 · proto-journey chromium ✓ · 2 red-run proofs |

## Recommendation

**Approve.** Both findings are non-blocking: neither changes behaviour a reader will actually hit,
every gate is green, and the new checks carry genuine red-run proofs. M1 is a two-minute comment
fix and L1 a one-line guard — worth a follow-up in this PR or the next, not worth holding the
merge for.

_Posted by the piv-review-pr agentic gate; a human makes the final call. (Solo repo: GitHub
refuses a formal self-approval, so this verdict is posted as a review comment.)_

---

## Resolution (2026-08-10)

Both findings fixed in the follow-up PR from `fix/studio-214-pr252-review` (#252 had already
merged when the review landed). The APPROVE verdict above is discharged.

- **M1 — fixed** (comment corrected, the review's first option). `adoptBoard`'s mid-"compiling"
  comment now states the count-collision caveat in the report's own words — the tripwire compares
  counts only, so a same-place-count draft swaps stale screens unrefused — and points at the close:
  an identity/generation stamp in `applySwap`, logged as issue **#253**.
- **L1 — fixed, and the regression case found a THIRD writer.** Both named writes are gated on
  `tookOver` (the declined branch captures it before adopting it; `unavailable()` checks it before
  clearing) — and the new methodPass case caught a third stomp the review missed: `renderChrome`'s
  `PROVENANCE_RUN` write runs on the same continuation *before* the declined branch, and was only
  ever masked by the declined write landing after it. Guarded the same way, with the same citation.
  Regression case (studio-journey methodPass): the artifact fetch held by route on a declined `?b=`
  arrival, a card answered inside the loading window, then the hold released — asserting the
  redrafted sentence survives both resolutions (the declined branch, and `unavailable()` via a held
  404). Proven able to fail: 2 red against the unfixed driver, each printing the stomped sentence
  (`came in on the link…` / `(cleared)`), green with the guards.

Re-validated on the fix branch: build-checks 20/20 · gen-param-count no drift · loc-summary
regenerated (grand total 34700 → 34800; the runtime group approach renders is untouched, so no
baseline churn) · studio-journey chromium 321/0 · firefox 317/0 · webkit 317/0 (the +4/+3 over the
review's counts are this fix's own cases; the chromium/others delta stays the frame check).
