# PR #452 review — canvas.html, the run list, canvas-store's routes and the four arrangement ops (#306)

**Head** `17555be9a11ff5f64feae99afd150a954aa49d2c` · **Base** main @ `eb58d54fdcc9b4b3643baf432cff8da68fb9ecb3` · round 1 (no prior report, guarantees pass not triggered)

**Verdict: approve (posted as a comment — own PR).** No Critical, High or Medium code issues. Two findings correct the PR's validation claims; one is Low polish. The studio-journey gap the PR left open is now closed: all three engines completed on this head, and the one red is pre-existing on `main`.

## Findings

**F1 (Medium, numbers pass) — the report's "Not a regression — A/B measured" covers less of the journey than it reads.**
`.claude/reports/canvas-page-run-list-arrangement-ops-306-report.md:100` and the PR body's Validation. Every PR-side studio-journey run stopped at the `[data-replay="settled"]` throw, at or before line 5583. The A/B supports that throw being load-driven. But none of those runs reached the chromium perf pass (lines ~7230–7415, the throttled drag and the INP rows), so the PR shipped with its drag-performance gate never executed on this head, while the text reads as if only a quiet machine separated it from green.
Fix: replace the studio-journey line with the completed runs below. State that the one chromium red is the pre-existing F2 and not this PR's.

**F2 (Low, pre-existing, belongs on `main` not this PR) — the frame check's zero-long-frame assertion sits on its threshold.**
`tooling/studio-journey.mjs:7329`. Under 4× CPU throttle, the drag's FIRST pointerdown frame runs `replay-driver.mjs onTouch` (the replay take-over) plus `studio-verbs.mjs`'s pointerdown handler, and lasts 52–58 ms against the 50 ms long-animation-frame (LoAF) floor.
Observed with a standalone probe replicating lines 7240–7320 and recording LoAF `scripts` (the scripts that ran in each long frame): PR 3/5 runs flagged, base `eb58d54` 1/5, the same two scripts every time. `scrollend` never fired on `.stx-scroll` inside any drag window (it fires only on the document, before `t0`), so #306's new minimap `scrollend` listener is not the cause.
In full journeys the PR head failed 2/2 (57.2 / 58.6 ms) and base passed 1/1. A run with the `scrollend` line removed passed 1/1. That run was noise: the probe shows the listener never fires in the window.
Fix (separate issue): make the take-over's first frame cheaper, or exclude the gesture-start frame from the window with the reason written in the check.

**F3 (Low) — `saveRun` is not atomic across its writes.**
`portal/lib/canvas-store.mjs:307-334`. N `appendFileSync` calls, then one `writeFileSync` of `canvas.json`. A crash between them leaves `ops.jsonl` and `canvas.json` out of step until the next save re-derives. Single-owner local tool, `verifyBuild` catches a committed mismatch, and the next save heals it.
Fix (optional): join the lines into one append, or note the window in the header.

## Validation

| Check | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 41 groups pass` (after `npm ci` in `tooling/icons`; first run red on 41.7 only because a fresh worktree lacks that `node_modules`) | observed |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · group-count` (after `npm ci` in `tooling/style-dictionary`) | observed |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan` | observed |
| studio-journey chromium (PR) | 558 passed, 1 failed — the F2 LoAF; reproduced on a second run | observed |
| studio-journey chromium (base `eb58d54`, same load, parallel) | 557 passed, 0 failed | observed |
| studio-journey firefox (PR) | 549 passed, 0 failed | observed |
| studio-journey webkit (PR) | 549 passed, 0 failed | observed |
| #306's two "no document value in the snapshot without a hook" rows | pass on all three engines, studio.html and /factory | observed |
| canvas-journey, catalog-journey, approach baselines | not re-run; the PR reports them | reported by the PR |

Numbers pass: `loc-summary.json` runtime 32,100 → 32,300 and total 40,500 → 40,700 match the diff. `git diff --stat 2d05969..HEAD` is the report only, as claimed. The 32,100 → 32,300 figure is observed (regenerated), and the report labels it so.

## What is done well

- `foldLedger` checks an undo line against the TOP of the effective stack and throws naming both seqs on a mismatch (verified with a wrong-op undo).
- The four new verbs refuse unknown keys by name. `frame.remove` refuses while a state or variant lane still overrides the frame and cascades arrow cleanup. `frame.size` width bounds are inclusive at 320 and 2560 (all verified by direct call).
- The `docHook` is additive: `$doc` exists only when a hook is passed, a half-built hook is refused before any DOM access, and `restore`'s new return shape has one caller. The journey now asserts the no-hook shape on both existing pages.
- Save and run routes reuse `resolveRunRoot` + `assertProvenanceRoot`, and the origin guard runs before routing. `canvas.mjs` has no `innerHTML`, and `renderRuns` escapes every value. A `/handoff/` traversal hypothesis was tested and ruled out: `URL` resolves dot-segments before the prefix check.
- The import-pin fix for bare `import "x";` was verified to redden on its own mutation.

## Recommendation

Merge after F1's wording fix to the report and PR body (docs only, no gate re-run needed). File F2 as a `main` issue. F3 at the owner's discretion.
