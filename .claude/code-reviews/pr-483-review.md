# PR #483 review: live import fidelity (#474)

**Head** b3ee6832b2c64afd252c1180d21fa87689950997 · **Base** main @ `5fc3b35bc0675497c5fe5b432d32459e1add787d` (merge base `1b43cee`; `origin/main` tip at review time `9398860`)

**Verdict: request changes.** Posted as a comment because the reviewer and author share one account. The code is sound and the headline figures reproduce. The blocker is F1: the branch conflicts with `main`, so no CI gate has run, and every green result below applies to the pre-merge head only. Review again after the merge.

## Findings

**F1 (high): the branch cannot merge, and CI has never run.**
`mergeStateStatus` is `DIRTY`, and `gh pr checks 483` reports no checks, so `verify` and both CodeQL legs have not run. `main` has moved on since the merge base: #479 (the Mode 2 exhibit) and #481 (the I4 fix) have landed. The PR body already asks for main to be merged in once #481 lands, so that step is now due.
- The conflicts are in `.claude/references/gates.md` (2 hunks), `tooling/build-checks.mjs` (the `import run` group string) and `tooling/canvas-journey.mjs` (the header prose, imports, and the ✓ summary line). All of them are additive on both sides.
- `portal/lib/import-run.mjs` merges without conflict, but it is where #479's `placeExhibit`/`foldLedger` import path meets this PR's `EXPORT_SCALE` change and candidate deletion. Neither tree has run that combination.
- Fix: merge `origin/main`, resolve by combining both sides, then re-run `build-checks`, `drift-check` and `canvas-journey all`. Expect I4 to turn green once #481 is in.

**F2 (medium): a render timeout leaves an orphaned headless Chromium running.**
`portal/lib/import-measure.mjs:115`. On timeout, the code sends `child.kill("SIGKILL")` to the Node child running `tooling/measure-render.mjs`. SIGKILL gives that child no chance to run its `browser.close()`, and the signal does not reach the Chromium process that Playwright launched underneath it. The code-reviewer agent reproduced this: it SIGKILLed the Node parent, and `chrome-headless-shell` survived with PID 1 as its new parent. Each production `render-timeout` (60 s by default) leaves one of these processes behind.
- 43.15's timeout case cannot catch this. It uses a 5 ms timeout, which fires before Chromium has been launched.
- Fix: send SIGTERM first and allow a few seconds of grace before SIGKILL. Alternatively, have the child close the browser when it receives SIGTERM, or spawn it `detached` and kill the whole process group.

**F3 (low): the "all three engines" claim describes one renderer.**
Report line 15 says I12 "re-renders it for real on all three page engines, reproducing 1.3379". The PR body says "the real render reproduces 1.3379 in each". But `tooling/measure-render.mjs:59` always calls `pw.chromium.launch()`. The three journey engines drive the page and the button; the candidate is a Chromium render every time. So the three matching 1.3379 values are the same Chromium render repeated, not reproduction across engines.
- Fix: reword to something like "I12 passes on all three page engines; the candidate is always rendered by Chromium and measured 1.3379 in each run".

**F4 (low): the busy refusal in the measurement box is a dead click.**
`portal/public/canvas-import.mjs:88-94`. `underLock`'s busy action (`import-run.mjs:613`, `{ label: "Wait, then try again" }`) carries no `reload`, `route`, `retry`, `measure` or `hint` key, so the click falls through to `dropInput.focus()`. That targets the import panel's file input, which I12b shows can be closed while the measurement refusal is visible.
- Fix: when `box === measureRefusal`, fall back to `measureFidelity(currentName)`.

**F5 (low): nothing tests that `withMeasurement` passes the record's other fields through.**
`portal/lib/import-measure.mjs:101-108` copies `id`, `source`, `ir`, `recognition`, `mapping`, `provenance`, `elapsed` and `suggestions` into `buildRecord` unchanged. That is correct today. But the live-pair replay has `suggestions: []`, so if a later edit dropped the `suggestions` spread, no check would go red.
- Fix: add a 43.15 case with a synthetic record whose `suggestions` is not empty, and deep-compare the record without `fidelity` before and after `withMeasurement`.

## Validation (observed, detached worktree at the PR head)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `all 46 groups pass`. The first run reported 41.7 red only because the fresh worktree lacked the `tooling/icons` dependencies; green after `npm ci`. |
| `node tooling/drift-check.mjs` | ✅ all 14 legs |
| `node tooling/token-lint.mjs` | ✅ 63 tokens, 0 orphan |
| `node tooling/canvas-journey.mjs all` | ❌ chromium 101/1, firefox 100/1, webkit 100/1. The only failure is `I4 · the view's drop list grew by exactly one 11 → 11`, which is exactly the assertion #481 removed. I12 and I12b pass on all three engines. |
| CI (`verify`, CodeQL) | ❌ not run, because of the merge conflict (F1) |
| Local CodeQL | not re-run; the PR body's 0-result claim is unverified here |

## Figures

- **1.3379 / 29.7584**, plus faithful root **0.7267** and subtitle **1.0001**: re-derived by passing the committed PNGs through `decodePng({over: BACKDROP})` → `cropTo` → `regionsFromBoxes` → `measureImages`. All four match the report. This shows the measurement arithmetic reproduces from the committed bytes. Separately, the journey run printed `measured worst ΔE 1.3379 at text:Amara Okafor` in each of the three runs, which shows the renderer reproduces the value, with Chromium as the renderer (see F3).
- Both `measure.json` files carry the same candidate sha256. That is expected: it is the same composition measured against two different references, so only the reference changes between the pair.
- **"46 groups"** and the per-engine journey counts: observed, and they match the PR body.
- **"11/12 WCAG pairs"**: not re-derived. #482 names the failing pair (`--color-fg-muted` on `--color-bg-surface`, 4.4 < 4.5).

## What is done well

- The new route sits behind the origin guard and the existing `resolveRunRoot`/`isProposalName` validation chain.
- The child gets an argv array and its job over stdin, so no argument can be injected.
- `page.route` restricts file serving to the repo root and blocks requests to outside origins.
- `decodePng` still throws on alpha by default, so the committed records cannot move, and 42.15 proves this in both directions.
- Every server-provided string reaches the DOM through `textContent`.
- The owner's live pair is committed byte for byte, with a README stating who drew it. That is the honesty contract applied to a measurement.

