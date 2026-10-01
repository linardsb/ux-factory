# PR #499 review — decisions have blast radius: stale frames until the owner re-confirms (#318)

**Head** 7ef95fdad52d8190c1b3d627ddcc7a57eec8047e · **Base** main @ `694ab9145d88603634fd234b61e9e4168d6bf0d7`
**Round** 1 (no prior review, so the guarantees pass was skipped) · **Verdict** approve (posted as a comment: solo repo, own PR)

## Summary
A frame pins decisions by transcript seq. `staleFrames(doc, transcript)` in `system/canvas-ops.mjs` derives which
pinned decisions a later banked answer has superseded (`stale`, with `latest` = head of the supersede chain) or that
do not resolve (`dangling`). The canvas page shows it (chip, 44×44 Re-confirm, decision card, flow panel, inspector),
and Re-confirm is the existing `frame.link` re-pinning to the head. The handoff pack's `lineage.json` and `flow.md`
carry the same read. No op added, nothing stored. The change matches the ticket and the architecture doc's D2, and
AC #2's unmet drawer step is stated openly in the PR body with follow-up #498.

## Issues

No critical, high or medium issues.

**F1 (low)** `portal/public/canvas.mjs:464` — the flow panel is lane-scoped (`missingStates(view, lane)`, "Every
screen in this lane…"), but its new stale rows come from `staleOf()`, which reads `doc`. In a lane that omits f1, the
panel still lists "add-payee: decision 7 changed since linked". The comment at :344 says decisions are not
lane-scoped, so this may be intended; if so, nothing to do. If not, filter the stale rows by `view.frames`.

**F2 (low)** `system/canvas-ops.mjs:418` — the header says it "reads transcript lines (other ops skipped)", but the
filter does not check `type`: a non-op line with an integer `seq` and no `op` would be read as a decision row. Both
callers pre-filter to `type === "op"`, and no committed `discovery/*/transcript.jsonl` has such a line (observed), so
this is header precision only. Suggest: "reads `type: "op"` transcript lines or `loadDecisions` rows".

**F3 (low)** `portal/public/canvas.mjs:346` — `frameSig` and `frameParts` each call `staleOf()`, which walks every
frame, so a reconcile is quadratic in frames. Irrelevant at the spine's 2–3 frames; computing it once per reconcile
beside `view` would be the fix if frame counts grow.

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 50 groups pass` (observed, after `npm ci` in tooling/icons, tooling/style-dictionary, portal; the first run in the fresh worktree was red on missing `tooling/icons/node_modules` only) |
| `node tooling/drift-check.mjs` | ✓ all 15 legs including build-handoff and group-count (observed) |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens, 0 undeclared, 0 orphan (observed) |
| `node agent-layer/gen-build-handoff.mjs --check` | ✓ 2 packages, 8 files, no drift (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups, no drift (observed) |
| `node tooling/canvas-journey.mjs chromium` | 209 passed, 0 failed; 21 pass-B assertions (observed). Firefox and webkit not re-run here |
| CI (`gh pr checks 499`) | CodeQL, audit, codeql, gates-green, verify, visual all pass (observed) |

## Numbers pass
- "all 50 groups pass": re-observed.
- "B1–B7 … 63/63": 21 per engine re-observed on chromium; 63 = 21 × 3 is the report's `all` run, not re-run here.
- loc-summary: runtime group unchanged in the diff, generators 3,400 → 3,500 and total 41,800 → 41,900; the
  "no VR baseline moves" claim agrees with the diff and the green `visual` check.
- "still fourteen" ops: `OPS` is untouched by the diff.
- The firefox I10 `NS_BINDING_ABORTED` is reported as not reproduced in two re-runs and **not run on base**, which is
  stated as such. It sits in the import pass, which this diff does not touch.

## What is done well
- Stale is derived, never stored, and the journey's B5 proves it (Cmd+Z brings the flag back); the report records the
  mutation that reddens B5 alone.
- Every new build-checks case is reddened by a named mutation, and the report admits the first mutation driver gave a
  false pass (stdout only) and how it was fixed.
- One function serves both readers (`staleFrames` takes transcript lines or `loadDecisions` rows), and 35.19 (f)
  cross-checks it against `ledgerView`, so the canvas and the PRD projection cannot disagree on which decision is
  latest without a red.
- Gate prose updated in all three copies (gates.md, the `group()` strings, the block headers).
- The deviation (filtering `renderFlow`'s transcript the same way as `renderLineage`'s) is documented with its reason.

## Recommendation
Approve. F1–F3 are optional polish; none blocks the merge.
