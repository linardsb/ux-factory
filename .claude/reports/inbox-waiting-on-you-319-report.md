# Implementation Report — the inbox, one read-only "waiting on you" surface (#319, D1)

**Plan**: `.claude/plans/inbox-waiting-on-you-319.md`   **Branch**: `feat/inbox-319` (worktree `../wt-319`)   **Base**: d1c8f3f → d1c8f3f (origin/main unmoved at report time, `git fetch` + `git rev-parse --short origin/main`)   **Status**: COMPLETE

## Summary
`portal/lib/inbox.mjs` is a pure fold over every build run `listBuilds` lists. It emits one row per waiting item across nine kinds, ordered blockers first and then oldest first. Each row carries the one verb that clears it and a link to where that verb lives. `GET /api/inbox` serves it. The portal renders it at `#/inbox` and shows "N waiting" on the run list from the same fold's `counts`. Two new link seams land the rows: `canvas.html?…&frame=<id>`, which focuses the frame's Details button, and `#/discovery/<provenance>/<slug>`, which opens the drawer on that package. Build-checks group 51 proves the fold, and canvas-journey pass W proves the page on three engines.

## Tasks completed
- 1.1 → `portal/lib/inbox.mjs` (CREATE): `inbox`, `KINDS`, `hrefFor`, `entryFrames`, `needsLink` (A1), `blocks` (A2), `questionCleared` (A4)
- 2.1 → `tooling/build-checks.mjs` (UPDATE): group 51, cases 51.1–51.9
- 2.2 → the 50 → 51 count in `build-checks.mjs`, `CLAUDE.md` ×2, `.claude/references/gates.md`, `tooling/ratify-journey.mjs` (UPDATE)
- 3.1 → `portal/server.mjs` (UPDATE): `buildRoots()` hoisted and shared by `/api/canvas/runs` and the new `GET /api/inbox`
- 3.2 → `portal/public/portal.js` `renderInbox` + `route()`; `portal/public/index.html` Inbox link (UPDATE)
- 3.3 → `portal.js` `openDiscoveryFor` + the `#/discovery/(fictional|real)/<slug>` route (UPDATE)
- 3.4 → `portal.js` `renderRuns` shows "N waiting" from `/api/inbox`'s `counts` (UPDATE)
- 3.5 → `portal/public/canvas.mjs` `focusFrameFromQuery`, called after `mountPromoted` (UPDATE)
- 3.6 → `portal/public/portal.css` `.ib-*` styles, token-only (UPDATE)
- 4.1 → `tooling/canvas-journey.mjs` `inboxPass` W1–W6 + the `fp-inbox` seed (UPDATE)
- 4.2 → `tooling/run-316-ready.mjs` check 3 pins the export; header, message and `gates.md` all updated (UPDATE)
- 4.3 → `CLAUDE.md` map line; `gates.md` Group 51 paragraph and a pass W sentence (UPDATE)

## Tests added
- **Group 51** (`build-checks.mjs`) has nine cases; the `group()` string lists them. Result: `build inbox ✓` and `build ✓  all 51 groups pass` (observed, `node tooling/build-checks.mjs`).
- **Pass W** (`canvas-journey.mjs`) has W1–W6; the canvas-journey run under Validation results gives the full result.

## Proving the checks
Driver first: a scripted loop applies a mutation, runs `node tooling/build-checks.mjs`, greps the `· ` failure lines for the named case, and restores the file in a `finally`. As a control it applied a no-op mutation (a comment edit): exit 0, no failure (observed). All rows below are observed.

| Mutation | Case that went red |
|---|---|
| `import "./env.mjs";` added | 51.1: … imports […, "./env.mjs", …] |
| `writeFileSync` added to the fs import | 51.1: … writes (["writeFileSync"]) |
| `if (b === null) return [];` removed | 51.2: an empty package answered errors […] |
| `missingStates(doc)` → `missingStates(doc, "b")` | 51.3: the spine answered 0 rows |
| stale/dangling filter → `() => true` | 51.4 dangling: rows ["stale-frame frame:f1", …] |
| `decisions !== null &&` dropped from `needsLink` | 51.4 unlinked: a stand-in (no transcript) listed … |
| `p.mode === 1` → `true` | 51.4 ratify: a Mode 2 proposal listed … |
| `n > 0` → `n >= 0` | 51.4 unbound: unbound-import import:i1 survived its own verb |
| `endedAt` check dropped | 51.4 open-question: a finished session listed a parked question |
| later-decision rule → `false` | 51.4 open-question A: open-question seq:31 survived its own verb |
| feature filter `!== "proposed"` → `=== "refused"` | 51.4 feature: feature-proposal proposal:p1 survived its own verb |
| `blocks` stale → `true` | 51.4 stale: f1 blocking true and f3 true |
| `entryFrames` cycle fallback dropped | 51.3: entryFrames over a cycle / junk answered [] / [] |
| `byOrder` → sort by `at` only | 51.5: the agent proposal is not first … |
| `KINDS` + `"x"` in 51.6's loop | 51.6: kind x has no fixture |
| per-run `catch` rethrows | 51.8 inbox(a malformed package beside a good one) threw … |
| `URLSearchParams({ slug, provenance })` | 51.9: hrefFor's five shapes are not the exact strings |
| `CLAUDE.md:232` left at 50 | drift-check: group-count drift: CLAUDE.md (on-demand context): says 50 groups, build-checks defines 51 |
| `export function inbox` renamed `inboxFold` | run-316 check 3 — #319 has not landed: … exports no inbox fold … |
| `btn.focus(...)` commented out (chromium leg) | W3 · the frame's details button is focused |
| `counts[key] = rows.length + mine.length` (chromium) | **W1** · the page's fp-inbox rows equal the fold's count (4 vs 22). W2 stayed green, because it compares the page with that same broken `counts`. |
| rendered `${n}` → `${n + 1}` on the run list (chromium) | W2 · fp-inbox shows N waiting equal to counts (5 waiting) |

**51.7** has no runtime mutation, for the reason the plan gives: a copy of the module outside `portal/lib/` breaks its relative imports. Its reddening is 51.1's static write-grep, and 51.7 stays as the measured positive.

**Positive controls:** every 51.4 kind asserts its row is present before its verb runs, and 51.3 checks the committed tree's shape.

## Validation results
- `node --check` on inbox.mjs, portal.js and canvas.mjs → ok (observed)
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`, about 19 s per run (observed)
- `node tooling/drift-check.mjs` → `drift-check ✓ … · group-count` (observed)
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan` (observed)
- `git grep -n "50 groups\|50 pure\|50 PURE" -- tooling CLAUDE.md .claude/references` → nothing, exit 1 (observed)
- Task 1.1 VALIDATE over the committed `discovery/` → three `missing-state` rows (f1 × empty, loading, partial), `{"fictional/faster-payment":3}`, 0 errors (observed at d1c8f3f; #316's sitting will change this)
- Portal smoke on an OS-assigned port: `/api/inbox` → `3 {"fictional/faster-payment":3} 0`, and `/api/health` → `ok:true, stale:false`. Killed by PID (observed).
- `node tooling/canvas-journey.mjs all`, clean run → chromium 227 passed / 0 failed, firefox 226/0, webkit 226/0, `canvas-journey ✓`, exit 0 (observed)
- `node tooling/ratify-journey.mjs` → `R7 · the last step's tail reads build ✓  all 51 groups pass` ✓, `ratify-journey ✓ 52 assertions`, exit 0 (observed)
- `node tooling/run-316-ready.mjs` → no check-3 line. Checks 4 (#320 not landed), 6 (dirty tree) and 8 (`ANTHROPIC_API_KEY` set in this shell) are red, as expected (observed).
- Headless chromium `#/inbox` at 375 px and 1440 px → `scrollWidth === innerWidth`, three rows, verb height 44 (observed). `#/discovery/real/nope` → `Could not open nope: discovery: no run.json under …` (observed).

## Not run
- **Level 4 manual walk in a real browser** (`npm start` on 4747 and following links by hand): replaced by pass W on three engines plus the headless look above. The owner's own read of the page is #316's sitting step 10.
- **CodeQL**: CI-only, it runs on the PR. `focusFrameFromQuery` passes the URL's `frame` value only to `canvas.say`, which sets `textContent` (`system/studio-canvas.mjs:352`), and `renderInbox` passes every string through `esc()`.
- **piv-validate as a separate skill run**: its legs (build-checks, drift-check, token-lint, portal smoke) were each run directly, as above.

## Deviations from the plan
1. **(plan error)** 51.3 expected the order empty, partial, loading. THE FOLD's tie-break (`subject` `localeCompare`) gives empty, loading, partial. I kept the fold's rule and wrote 51.3 to match.
2. **(plan error)** `inbox()` also wrapped the unlinked loop in `if (hasTranscript)`, so the plan's "drop `decisions !== null`" mutation could not redden. I removed the wrapper, so `needsLink` (A1) is now the only place that rule lives. The mutation now reds.
3. **(plan error)** In `run-316-ready.mjs`, the static named import `{ inbox, KINDS }` would turn the planned REDDENS (renaming the export) into a load-time SyntaxError that kills all twelve checks. I used `import * as inboxMod` instead, the same form the script uses for `canvasOps`.
4. **(plan error)** W5 expected `#discovery-position` to start `fp-inbox · finished`. That heading is `run.json`'s own `slug`, and a seeded copy keeps `faster-payment`. W5 now asserts the inputs the session was opened with (`fp-inbox`, `real`) plus `· finished`.
5. Pass W's counts mutation reds **W1**, not W2 as the plan said. Reason: W2 compares the page with the same fold's `counts`. I added a render mutation that reds W2 on its own.
6. 51.4's stale and dangling clears pass positions for the decision cards they create (`d<seq>`, `d8`). saveRun's `arrangement` refuses a card without one, and the plan omitted them.
7. 51.4 ratify-pending is cleared by an applied `proposal.ratify` ledger line through `saveRun`. That is the applier's status move, not the spawned chain, which group 50 and ratify-journey already cover.

All four plan errors are logged under the plan's AMENDMENTS.

## Assumptions carried
- A1–A4 as decided in the plan: each is one exported predicate with one fixture.
- `hrefFor` throws if a canvas target carries more than one of frame, import or promoted. The plan allows "the one optional key".
- `run.json` with `endedAt == null` counts as open. A missing or unreadable `run.json` counts as finished.
- `renderInbox` clears `data-inbox` before it renders, so a hash return to `#/inbox` waits for the new render.

## Additions beyond the plan
- 51.3 checks `entryFrames` over junk input (`null`, `{frames: "x"}` → `[]`).
- 51.5 checks determinism with a second read.
- 51.6 checks that `KINDS` is frozen with nine entries.
- The W2 render mutation (deviation 5).

## Issues encountered
- My first three-engine journey run went red on I6 and I12b on chromium, and I caused it. I ran `run-316-ready.mjs` during the journey. Its check 11 spawns build-checks, and 50.12 temporarily edits `system/device-presets.mjs`. Once that file was restored, the clean re-run was green on all three engines.
- At 375 px the portal header already overflowed (the Canvas button was clipped before this change), and the Inbox button pushes it further. The page body does not scroll horizontally. This is outside #319's scope and has no tracker yet.
