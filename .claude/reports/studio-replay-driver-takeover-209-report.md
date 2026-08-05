# Implementation Report — the replay driver over the `agent.*` bus + take-over handoff (#209)

**Plan**: `.claude/plans/studio-replay-driver-takeover-209.md`
**Branch**: `feature/studio-replay-driver-takeover-209`
**Status**: COMPLETE

## Summary

`/factory`'s canvas now starts empty and assembles itself in front of the reader by playing the
committed projection `replay/build-fieldwork-dispatch.json` op by op over `action-bus.mjs`'s
reserved-but-unused `agent.*` half — the first thing in the repo to exercise that direction for real
— joined by `seq` with the run's own narration and its own three fence refusals read from the
committed curated trace. It autoplays to completion on arrival (the new pixel baseline, behind
`[data-replay="settled"]`), carries visible keyboard-driven Pause / Step / Seek / Skip-to-end
controls, states the pacing compression from computed numbers, and hands the wheel over on the first
canvas interaction — pausing the run, shifting provenance and firing `/factory/took-over` once from
that handover's success path alone.

The settled board equals `replay/build-fieldwork-dispatch.board.json` exactly, proven at view time by
`build-checks` group 16 and on the running page by `studio-journey`'s new replay pass.

## Tasks completed

| Task | File | Action |
|---|---|---|
| 0 · pre-flight (5 checks) | — | all green; #210 OPEN/unstarted, zero open PRs, so this branch owns factory's baselines |
| 1 · header + pure layer | `system/replay-driver.mjs` | CREATE |
| 2 · group 16 | `tooling/build-checks.mjs` | UPDATE |
| 3 · the mount | `system/replay-driver.mjs` | UPDATE |
| 4 · the take-over route | `system/analytics.mjs` | UPDATE |
| 5 · take-over + provenance | `system/replay-driver.mjs` | UPDATE |
| 6 · orchestrator + `getBoard` seam | `system/studio.mjs`, `system/studio-compile.mjs` | UPDATE |
| 7 · chrome mount + lead copy | `factory.html` | UPDATE |
| 8 · the chrome block | `system/studio.css` | UPDATE |
| 9 · group 10 grows | `tooling/build-checks.mjs` | UPDATE |
| 10 · the settled handle | `tooling/visual-regression/visual.spec.mjs` | UPDATE |
| 11 · replay pass + stale assertions | `tooling/studio-journey.mjs` | UPDATE |
| 12 · group 7's MODULES | `tooling/build-checks.mjs` | UPDATE |
| 13 · the slot/tile race + zero transitions | `tooling/vt-verify.mjs` | UPDATE |
| 14 · manifest + counts | `system/param-manifest.json`, `system/param-count.json` | UPDATE |
| 15 · loc-summary | `system/loc-summary.json` | REGENERATE |
| 16 · baselines ×4 | `tooling/visual-regression/baselines/` | REGENERATE |
| 17 · architecture map | `CLAUDE.md` | UPDATE |

## Tests added

**`build-checks` group 16 · replay driver** (new, CI) — driven over the REAL committed pair:
the join's counts asserted against the files rather than typed; the reproduce claim restated at view
time (playing every op beat rebuilds the committed board exactly) with the corrupted-label mutation
that decides whether that compare is real; the pacing's gap RATIOS proven against the run's own
`atMs` so an index-derived schedule fails; both `PLAYBACK_MS` branches; determinism across two
parses; the chrome's strings asserted by IDENTITY against the parsed files; totality over 10 junk
pairs and 5 hostile beats; and the artifact's ADD-ONLY op histogram pinned as a tripwire.

**`build-checks` group 10 · analytics** (extended) — `/factory/took-over` as a bare static literal on
a hash-carrying `/factory.html#shape`, no payload, fires once, URL restored verbatim, plus the
OVERLAP against `trackBuildPattern` in both orderings.

**`build-checks` group 7** — `replay-driver.mjs` joins `MODULES`, no exception argued.

**`studio-journey` replay pass** (new, operator-run, 3 engines) — 8 sections: the settled canvas vs
the COMMITTED board file the page fetches itself; byte-identical settled stage across two loads;
`agent.*`-only emission counted exactly; keyboard pause/step/seek each announced; the take-over on a
fresh page mid-replay incl. the route and the restore; one-shot-ness; the two NON-take-overs; reduced
motion; `destroy()` mid-playback.

**`vt-verify`** — zero transitions sampled DURING playback on a page of its own, with "blocks really
are arriving" proven first.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 16 groups pass** |
| …with `portal/node_modules` moved aside | ✓ 16 groups (SDK-free invariant holds) |
| **mutation sweep** — 5 against group 16, 2 against group 10 | ✓ every one goes RED, restored green |
| `node tooling/drift-check.mjs` | ✓ 12 passes incl. loc-summary · param-count · replay |
| `gen-replay --check` / `gen-param-count --check` / `gen-loc-summary --check` | ✓ no drift |
| `node tooling/validate-trace.mjs` | ✓ |
| `node tooling/studio-journey.mjs all` | ✓ **186/186 on chromium, firefox and webkit** |
| `node tooling/vt-verify.mjs all` | ✓ all three engines, incl. the new mid-playback sample |
| `node tooling/build-journey.mjs all` | ✓ **157/157 × 3 engines** (see Issues — a first run flaked) |
| pixel gate, in Docker | ✓ **20/20** against the regenerated baselines |

Manual, in a real browser: the replay runs on arrival with narration and refusal beats appearing; the
board finishes as 4 places · 7 affordances · 7 connections; Pause / Step / Skip each announce;
dragging mid-run pauses and flashes `/factory/took-over`; reduced motion is instant; **Compile the
board** after settle yields 4 metric-tiles (was 3 on the drafted board — the `getBoard` seam working).

## Deviations from the plan

All deliberate. Each is recorded in the code at the point it matters.

1. **Only `place.add` calls `canvas.place()`.** The plan's task 3 step 5 had `place-renamed` /
   `affordance-*` re-place the wrapper "because `place()` is idempotent". It is idempotent but not
   inert: `studio-canvas.mjs:329` appends **unconditionally**, so re-placing re-orders the stage by
   append order, and `:332` announces on **every** call, which would take autoplay from 4
   announcements to 11+ and contradict the plan's own announcement policy. Every non-add reflection
   now renames the wrapper in place — exactly the call `studio-compile.mjs:395-398` already made and
   wrote down. (With this artifact's op order the re-place happened to land back in board order by
   accident, so this would have been invisible-but-wrong.)

2. **`scale` and the printed compression are two different numbers.** The plan used one name for
   both and quoted 10.9×. Measured from the committed files: span 1363 → 131008 = 129 645 ms, so at
   `PLAYBACK_MS = 14000` the gap multiplier is 0.108 and the compression a reader is shown is
   **9.3×**. `paceBeats` returns the multiplier; `describeRun` derives `compression = realMs /
   budgetMs`. Group 16 asserts the relationship and a range, never the literal.

3. **`placeBlock` is passed in, not exported and imported.** `studio.mjs` already imports the driver,
   so importing back is a cycle. It is a required option (`renderPlace`) validated at the boundary;
   "what a place looks like is `studio.mjs`'s sentence" stays true either way.

4. **The take-over listens on `canvas.scroll`, not `canvas.viewport`.** The plan needed a filter to
   exclude the driver's own chrome. The zoom row, verb row, compile row and transport all live
   *outside* the scroller, so listening there makes the exclusion **structural** rather than a
   heuristic. Tab and modifier-only keys are still filtered, as planned.

5. **The handover announces only when it interrupted something.** On a settled canvas the reader has
   interrupted nothing, and the sentence landed in the same polite-region breath as the pick-up their
   keypress triggered — it made the first Enter on a move handle announce twice and say the less
   useful thing last. Caught by `studio-journey`'s existing "#206 · announcing once per keypress"
   assertion, which is now back at 3. The provenance shift and the route fire on **both** paths;
   only the sentence is conditional.

6. **An op whose `fromStep` names no trace step is an ERROR, not a silent skip.** The plan said both
   in different places. Group 16's spec (the gated one) wins: the artifact is a *projection of this
   trace*, so a step it points at that is not there means one of the two files has moved, and that is
   drift to state rather than to play over. A **missing** trace is different and is the one honest
   degradation — ops still play, and the surface says the words are absent.

7. **The `This build` panel is not rendered at mount.** Every number in it is counted from the board,
   and the mount-time board is empty; a panel reading "Places 0" for five seconds would be true
   numbers about nothing. `factory.html`'s own markup says what is coming, and `onSettle` replaces
   it. Its closing paragraph was also rewritten: it credited the ten answers with the board, which
   the run now builds (the *pattern* is still theirs, which is why the link stays).

8. **`vt-verify` and `studio-journey` needed the race fixed in THREE places, not one.** The plan
   named `vt-verify`. The compile pass's `open()` and the #236 teardown section's separate `open()`
   both wait on handles that fire at mount and then query slots the replay has not placed. The
   teardown one is the sharper break: its "nothing was swapped in afterwards" is a claim about a
   stage a second author is still adding to.

9. **A per-page `timeout` on the VR spec's factory entry.** The plan budgeted `PLAYBACK_MS` but not
   Playwright's 30 s per-test default, which 14 s of playback plus load, fonts and capture would sit
   uncomfortably inside. It is a page property, so it lives on the page entry, not in the config.

10. **The CSS block is in `studio.css`, not `components.css`** — as the plan recorded, against the
    ticket's own file estimate.

**Not done, as the plan's Non-Goals require**: the replay does not drive the compile beat; nothing is
named for a view transition and `morph()` is not called; no second artifact, brief picker or recorder
work; no export/keep rail (#210). `system/action-bus.mjs` and `system/board-ops.mjs` are **unedited**.

## Issues encountered

- **A driver bug that read as a product failure.** `studio-journey`'s Resume assertion reported
  "23 → 23" — a dynamic `import()` does not resolve inside `waitForFunction`'s injected context, so
  the predicate rejected on every poll and the wait timed out silently while the run advanced
  perfectly. Confirmed by hand in a real browser before changing anything; the fix is a poll built on
  `evaluate()`, and the reason is recorded at the line.
- **Counting the driver's actions needed the artifact fetch delayed by route.** The first beat fires
  in the task after the fetches resolve, which on a local server beats a Playwright round trip to
  attach a bus listener — the count was silently short by one. Delaying the response changes nothing
  about what is emitted; it only opens a window to start listening in.
- **`PLAYBACK_MS`'s reversibility branch is built and gated**, per the plan: `null` plays the real
  gaps, `paceBeats` answers `scale === 1` and `describeRun` emits the wall-clock sentence. Switching
  is one constant plus the timeouts that constant's comment names.
- **A `/build` flake was checked, not assumed.** The first `build-journey all` failed twice — `[4d]`'s
  connect button on chromium, a `waitForFunction` on firefox — both on a page this ticket does not
  touch. Per the recorded lesson that a matching flake signature can still be a real regression, the
  work was stashed and HEAD run (157/0), then the branch re-run (157/0), then all three engines
  re-run (**157/0 each**). Flakes, confirmed rather than dismissed.
- **The baselines took three passes, and the second two were the two recorded traps.** `loc-summary`
  reads git-TRACKED content, so the mid-implementation regeneration measured a tree that then kept
  growing — caught by `drift-check` only after committing (runtime lines 24200 → 24400). And both
  approach baselines had to be `rm`d each time: the digit change sits under pixelmatch's threshold,
  so `update:docker` left them untouched and reported green. **The two factory baselines came back
  byte-identical on the second capture** — the replay's determinism holding at the pixel layer too.
- **Local `npm run test` fails all 20 on macOS** against Linux baselines (recorded memory). The real
  verification is the Docker run, which is what the table above reports.
