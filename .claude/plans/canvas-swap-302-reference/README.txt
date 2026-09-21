# Reference implementations — #302's planning pass, 2026-09-18

A PLANNING-TIME SNAPSHOT, SUPERSEDED BY THE REAL MODULES ON MERGE. Nothing here is imported by
anything, and nothing here ships. Once Phase 4 lands `system/canvas-ops.mjs` and Phase 2 lands
group 7's real predicate, THOSE are authoritative and these files are history — the same posture
#423 records for S1's parked `driver.txt`. If you find yourself reading both, read the shipped one.

Why it exists: four mechanisms the plan asserts were written and driven before the plan asserted
them, so Tasks 2.3, 3.5, 4.2/4.3 and 6.2 say "observed" rather than "expected". Each pair is a
reference and the verbatim output of running it.

  canvas-ops.reference.txt      the six-op applier: OPS, exported frozen PARAMS, deterministic ids,
  canvas-ops.run.txt            the D4 `why` refusal, resolve()'s dangling flag, the base-part
  canvas-ops.observed.txt       delete refusal.            → 25/25 assertions pass

  group7-predicate.reference.txt   the FUNCTION-SCOPED inline-style predicate for build-checks
  group7-predicate.observed.txt    group 7.  → green on the control, RED on all four mutations,
                                   including M4, the file-scoped shortcut a naive fix would pass

  rank-layout.reference.txt     BFS-by-rank over the two committed replay boards.
  rank-layout.observed.txt      → deterministic, cycle-safe; its output IS Task 2.4's fixture
                                  literals. Found one real defect: the obvious BFS throws on a
                                  place with no affordances array, and arrangeBoard is total.

  spine-validation.reference.txt   MVP 14's composition through the REAL validateComposition and
  spine-validation.observed.txt    the REAL committed vocabulary. → base and error state both
                                   validate; a node carrying `id` is accepted today (the envelope
                                   is open, which is what Task 4.4 turns on).

EVERYTHING IS .txt, DELIBERATELY. CI verify's drift-check runs `node --check` over every tracked
.mjs, `.claude/plans/` included, so a parked fragment must not wear that extension. All five
reference files do parse as ES modules — verify with:

    cp <file>.txt "$TMPDIR/chk.mjs" && node --check "$TMPDIR/chk.mjs"

They match none of gen-loc-summary's three group regexes, so they move no generated artifact and
churn no baseline.
