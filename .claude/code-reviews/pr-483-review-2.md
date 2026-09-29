# PR #483 review, round 2: live import fidelity (#474)

**Head** a0774d5fa9b60b344b612ec403c0274f55cb92ae · **Base** main @ `939886049f6fe0ab37bce474c7155b765679f20f` (round 1: head `b3ee683`, base `5fc3b35`; round 1 report at `pr-483-review.md`)

**Verdict: approve with fixes (comment).** Posted as a comment because the reviewer and author share one account. Round 1's blocker (F1, the merge conflict) is resolved: `origin/main` was merged at `aa926a9`, `mergeStateStatus` is `CLEAN`, and all six CI checks passed on `a0774d5`. No finding is high or critical. The head carries no code change since round 1, so F2 to F5 are still open. The merge also left one new stale reference (F6).

## Findings

**F1 (high, round 1): resolved.** Merge at `aa926a9`. CI `verify`, `codeql`, `CodeQL`, `audit`, `visual` and `gates-green` all passed on head `a0774d5` (observed, `gh run list` headSha matches).

**F6 (medium, new): the renumbering from 43.15 to 43.16 missed three places, so they now point at #475's case.**
When #475 took case id 43.15, this PR's case moved to 43.16. The `import run` group string and `gates.md`'s group 43 paragraph were updated. Three places still say 43.15 and mean #474's measurement:
- `portal/lib/import-measure.mjs:8`: "each one is asserted by build-checks group 43 (43.1, 43.15)". The invariants in this header are the specification (CLAUDE.md, "Invariants live in the file that owns them"). A reader following the pointer lands on the Mode 2 exhibit case, which does not assert any of them.
- `tooling/build-checks.mjs:13932` (group 42's `group()` string, the "cannot reach" clause): "reached by group 43's 43.15 and rendered for real only by canvas-journey's I12".
- `.claude/references/gates.md:76` (group 42): the same clause.
- Fix: change all three to 43.16. The two group-42 copies are two of the three gate-prose copies, so they must change together.

**F2 (medium, round 1, open): a render timeout leaves an orphaned headless Chromium running.**
`portal/lib/import-measure.mjs:115` is unchanged: `child.kill("SIGKILL")` on timeout. The child gets no chance to run `browser.close()`, and the Chromium process Playwright launched is reparented to PID 1 and keeps running. Round 1's code-reviewer agent reproduced this.
- Fix: send SIGTERM, allow a short grace period, then SIGKILL. Alternatively, spawn the child `detached` and kill the process group.

**F3 (low, round 1, open): "reproduces 1.3379 in each" describes one renderer three times.**
The PR body says "I12's real render reproduces 1.3379 in each". Report line 15 says I12 "re-renders it for real on all three page engines". `tooling/measure-render.mjs` always launches Chromium, so the three engines drive the page and the button, and Chromium renders the candidate every time.
- Fix: "I12 passes on all three page engines; the candidate is always rendered by Chromium, and each run measured 1.3379."

**F4 (low, round 1, open): the busy refusal in the measurement box is a dead click.**
`portal/public/canvas-import.mjs:88-94`. The busy action (`import-run.mjs:623`, `{ label: "Wait, then try again" }`) has no `reload`, `route`, `retry`, `measure` or `hint` key. The click therefore runs `dropInput.focus()`, which targets the import panel's file input, and that panel can be closed.
- Fix: when `box === measureRefusal`, fall back to `measureFidelity(currentName)`.

**F5 (low, round 1, open): nothing tests that `withMeasurement` keeps the record's other fields.**
`build-checks.mjs` never names `withMeasurement`. The live-pair replay has `suggestions: []`, so if a later edit dropped the `suggestions` pass-through, no check would go red.
- Fix: add a 43.16 case with a synthetic record whose `suggestions` is not empty, and deep-compare the record without `fidelity` before and after.

## Guarantees pass (the base moved from `5fc3b35` to `9398860`)

- **The round-1 rebase note** ("#479's `placeExhibit`/`foldLedger` path meets this PR's `EXPORT_SCALE` change and candidate deletion; neither tree has run the combination"): re-derived.
  - `loadExhibits` (`canvas-store.mjs:322`) reads only `<id>.json` and `<id>.reference.png`. The candidate PNG that an edit deletes is not part of the exhibit.
  - `EXPORT_SCALE = 1` halves the reference PNG's pixel size. The exhibit displays it with `.cv-exhibit img { width: 100%; object-fit: contain }` (`portal.css:338`) inside a fixed 320×280 box, so the change in pixel size does not affect the layout.
  - The measure route appends no op, so it cannot change the positions `placeExhibit` computes.
  - Both halves were run together: group 43 (43.15 and 43.16) and the journey (I12 beside #475's legs).
- **I4**: round 1's only journey failure was the assertion #481 replaced. It is green on the merged tree (below).
- **Case ids**: F6 is the one relationship the merge broke.

## Validation (observed, detached worktree at `a0774d5`)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `all 46 groups pass` |
| `node tooling/drift-check.mjs` | ✅ all 14 legs. The first run failed only because the fresh worktree lacked `tooling/style-dictionary` dependencies; green after `npm ci`. |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens, 0 orphan |
| `node tooling/canvas-journey.mjs all` | ✅ chromium 125/0, firefox 124/0, webkit 124/0, matching the PR body. I4 is green; I12 printed `measured worst ΔE 1.3379 at text:Amara Okafor` in each run (the Chromium renderer each time, see F3). |
| CI on `a0774d5` | ✅ verify, codeql, CodeQL, audit, visual, gates-green |

## Figures

- **1.3379 / 29.7584**: re-derived from the committed PNGs in round 1, and unchanged by the merge (no change to `import/fixtures/measure-live/` beyond one README line). I12 printed 1.3379 again in this run.
- **"chromium 125/0, firefox 124/0, webkit 124/0"** (PR body): see the validation table.
- **"all 46 groups pass"**: observed.
- **"Local CodeQL … 0 results"**: not re-run locally. CI's two CodeQL checks passed on the head, which covers the same claim.

## What is done well

- The merge combined both sides of each conflict. #475's 43.15 and this PR's 43.16 both run, and the group string names each.
- The report records the renumbering and the merged base honestly (`1b43cee → 9398860`).
- Round 1's strengths still hold: the origin guard, the argv array plus stdin job, `page.route` restricted to the repo root, `decodePng` still throwing on alpha by default, and `textContent` for every server-provided string.

## Recommendation

Mergeable once F6 is fixed. It is a three-line text change, and one of the three lines is in the header the module's invariants live in. F2 is the only runtime defect; fix it here or file it as a follow-up ticket. F3 to F5 are polish.
