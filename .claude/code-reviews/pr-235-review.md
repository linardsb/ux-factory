# Review — PR #235 · the compile beat (#207)

**Verdict: changes requested (small).** No Critical issues. One High and three Medium, all cheap to fix;
nothing here is a correctness bug on the shipped page's reachable *rendering* path. Reviewed against
`origin/main` at `3a03266` with `mergeStateStatus: CLEAN`, so these findings are about the tree that
would merge.

Fresh-eyes pass by the `code-reviewer` agent; every finding below marked **verified** was then
reproduced directly rather than taken on the agent's word.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 15 groups pass |
| `node tooling/drift-check.mjs` | ✓ all 12 passes |
| `node tooling/token-lint.mjs` | ✓ 64 tokens, 0 undeclared, 0 orphan |
| `node tooling/studio-journey.mjs all` | ✓ 121 × 3 engines, 0 failed |
| `node tooling/vt-verify.mjs all` | ✓ green on all three |
| pixel gate (Docker, committed baselines) | ✓ 20 passed |
| CI `verify` / `visual` on the PR | ✓ / ✓ |

## Issues

### High

**H1 · Keyboard focus is dropped to `<body>` on every activation of both verbs** —
`system/studio-compile.mjs:226-231` (`setState`).

**Verified by running**, chromium: focus "Compile the board" → Enter → `document.activeElement` is
`BODY`, mid-beat and after it settles. `setState("compiling")` disables the button the reader just
activated, and disabling the active element moves focus to the body in every engine. `revert()` does
the mirror image. A keyboard reader therefore has to Tab from the top of the document to reach "Back
to blocks" — on 100% of uses of the ticket's primary control, on a public route.

This is the one finding that contradicts a MUST in the house CHECKLIST ("complete keyboard path
through every new surface") and the breadboard pattern the plan cites ("every verb announced in one
live region and **every verb placing focus**"). `compilePass` asserts nothing about focus, so it stays
green either way.

*Fix:* in `setState`, hand focus to the counterpart before disabling — read
`document.activeElement === compileBtn` / `=== revertBtn` first, then focus the other one if it is now
enabled. Add the assertion to `compilePass`.

### Medium

**M1 · Group 15 aborts the whole run on its own failure, skipping 15.2–15.4** —
`tooling/build-checks.mjs:2160`.

**Verified by mutation** (`compose`'s dashboard branch → `null`):
`TypeError: Cannot read properties of null (reading 'length') at build-checks.mjs:2160`. The `ok()`
above it records the real failure, but the throw kills module evaluation, so `group("compile", …)`
never prints, the recorded failures are never reported, and the five-pattern vocabulary sweep, the
determinism deep-compare and the totality loop **never run**. Group 14's own comment
(`build-checks.mjs:2094-2098`) names this anti-pattern verbatim, which makes it a house rule this
ticket broke rather than a novel trap.

*Fix:* `const comp = run.composition || []` and use it in the assertion and in the summary
interpolation at `:2276`.

**M2 · The fourth step's announcement is unperceivable on every compile after the first** —
`system/studio-compile.mjs:407-421`.

Reasoned, not run. `render` is the one step the loop never waits after; its only spacing from the
settle sentence is `await vocabReady`, which is a real round-trip on the first compile and a single
microtask on every later one (the vocabulary is memoized). Both sentences then land in the same task,
and an `aria-live="polite"` region announces only the final value — so "Rendering through the
vocabulary…" is never spoken on a re-run. The same coalescing hits steps 1–3 under reduced motion,
where the wait is skipped entirely; reduced motion is a motion preference, not a licence to drop
time-sequenced content.

The gate cannot see it: `countLive` counts MutationObserver *records*, and coalesced synchronous
writes still produce one record each, so `said.n === 5` passes on a beat no AT user hears in full.

*Fix:* give the render step the same beat as the others, and use a small non-zero gap under reduced
motion (or emit one combined summary sentence there). Then assert announcement *spacing* in
`compilePass`, not just the count.

**M3 · The report and a CSS comment state a cause for the viewport overflow that is already ruled
out** — `.claude/reports/studio-compile-beat-207-report.md:136-143`, `system/studio.css` (the
`.stu-compile-step` block).

**Verified:** `.stu-canvas-col { min-width: 0 }` already exists at `system/studio.css:224` (added by
#206, with its own comment). So "the grid item, whose `min-width` is `auto`" is not the cause, and the
"likely one-line fix" the report names for the follow-up ticket is a no-op. The *observation* is
sound and worth keeping — the viewport really is ~2818px in a 776px track, measured — but the
diagnosis is wrong and it is load-bearing for the readout's whole layout rationale.

*Fix:* re-measure, correct both sentences to state the observation without the wrong cause, and cut
the follow-up ticket from the corrected version.

### Low

**L1 · `destroy()` does not stop an in-flight beat** — `studio-compile.mjs:243, 375-377, 485-495`.
`ac.abort()` only detaches the click listeners; `fetch` gets no `signal` and `compile()` has no
post-await liveness check, so a resolving fetch can still swap into the stage and re-add
`data-compile-state` after teardown, and a `destroy()` during `wait()` leaves the promise unsettled
forever. Unreachable today (`studio.mjs` never calls `destroy`), but `destroy` is on the exported
handle and #209 drives this module through `getCompile()`.

**L2 · A transient vocabulary failure disables the beat for the life of the page** —
`studio-compile.mjs:240-252`. `if (vocab || vocabError) return vocab;` memoizes the *error* too, and
the header documents memoizing the success only. A retry should re-issue the request.

**L3 · The #212 EXTRA branch is not id-stable, so the header's "kept exact by `revert()`" overstates
it** — `studio-compile.mjs:347-353, 459`. The surplus branch is exact (indices are stashed); the extra
branch re-mints `data-stx-id` through `place()`'s `nextId` on every re-compile. Also, its column
choice (`i + 1`) does no occupancy scan, so a reader who moved a block there could get two components
in one cell — which the same comment says the canvas refuses. Either stash the added ids or say in the
header that the extra branch is #212's to close.

## What is good

- The module genuinely contributes no rule; the `OUT_OF_LIBRARY` split is the right answer to a
  sentence that was true on one surface and false on the other.
- The swap is genuinely positional and in-place, and `back.html === rest.html` /
  `again.html === done.html` / the fresh-load comparison are strong, non-vacuous assertions of it.
- vt-verify gets the hard part right: it proves the beat happened *before* asserting `calls === 0`,
  and re-takes that precondition under reduced motion rather than inheriting it. The mutation table
  records that the `startViewTransition` mutation went red on the counter while the pseudo assertion
  stayed green — which is the honest justification for shipping both nets.
- Group 15 reuses group 13's hand-written canonical stringify, and the fixture classification reports
  what was measured rather than a claim about the derivations the data does not support.

## Recommendation

Fix **H1** and **M1** before merge — H1 because it is a per-use keyboard regression on a public route,
M1 because it turns this ticket's primary CI gate into a partial gate the moment it goes red. **M3** is
a two-sentence documentation correction and should go with them. **M2** is a real accessibility gap and
a fair candidate for the same pass; the three Lows are honest follow-ups.

Posted as a comment rather than an approval: this is a solo repo and the author cannot formally
approve their own PR.
