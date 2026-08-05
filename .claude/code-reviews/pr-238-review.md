# Review — PR #238 · four deferred findings (#225, #231, #232, #236)

Self-review, solo repo — posted to the PR as a comment, not a formal approval. Read against the
whole branch diff on a tree where `build-checks`, `drift-check`, `token-lint`, `studio-journey all`
(149/149 × 3 engines) and `vt-verify all` are green, and against `origin/main` at `59d15f0` with no
merge behind it (mergeStateStatus checked before triaging — PR #189's lesson).

**Verdict: ship.** One Low finding was found and fixed during the review; three observations are
recorded rather than fixed, each with the reason.

## Fixed during the review

**L1 · An inert `.stx-grab` looked exactly like an armed one.** #231 makes the handle born
`disabled` until `mountCanvasVerbs` arms it, but nothing said so visually — a canvas mounted alone
would paint a handle that looks like a control and does nothing, which is a smaller version of the
bug the ticket is about. Fixed with one rule in `system/studio.css`, mirroring the `.stx-verb-btn`
disabled rule beside it. **No shipped page paints this state** — both mounts place components and
mount the verbs in the same task — which is why the pixel baselines stay untouched.

## Recorded, not fixed

**O1 · `tokenize()` accepts an empty argument (`''`).** bash does too, so the grammar is right to;
a command with an empty board path would then be four tokens and fail later on identity resolution
rather than on shape. Refusing it here would be the grammar making a decision that belongs to the
callers, which is the split `parseOpCommand`'s own header argues for the script path.

**O2 · The `#231` L2 case asserts `describedBy === null`, not "the IDREF fails to resolve".** On the
page the case runs on, a `#stx-move-help` from the page's own canvas already exists, so a regressed
handle would resolve — to another canvas's instructions. That is the stronger reading anyway: the
handle must not claim a description it was not given. Noted because the mutation output shows
`resolves: true`, and a later reader could mistake that for the case being vacuous.

**O3 · The vocabulary fetch's failure is swallowed without a console line.** Deliberate and
commented: `renderUnavailable`'s card and the settle sentence are the report, and a `console.error`
would trip `studio-journey`'s no-page-errors contract while telling the reader nothing.

## What was checked and found sound

- **The envelope split.** `parseOpCommand` strict, `applyOp` permissive, both pinned by group 11
  including the projected op that must still apply. This is the only shape that keeps the committed
  replay artifact applyable by its own reproduce check; the alternative was caught by a gate rather
  than by review, which is the right way round.
- **No re-record was incurred.** `portal/record-build.mjs` is untouched, so the committed trace's
  recorded `task` still matches what the code emits.
- **`applySwap` is not a workaround that the L3 fix obsoletes.** It renames a wrapper in place and
  never calls `place()`; the stale comment was corrected rather than the write deleted.
- **AC #3 survives #232.** `data-stx-component` is stashed and restored (removed when the stashed
  value is null), and the byte-identical revert and re-run assertions are green on three engines.
- **No new live-manipulable control**, so `param-manifest.json` needs no entry and `param-count.json`
  does not move.
- **Group 7 stays literally true**: no inline-style write and no markup-from-string added; the count
  is unchanged at 1.
- **`mountCanvasVerbs`'s widened boundary check** (`armMoveHandles` required) has exactly two callers
  in the repo, `studio.html` and `system/studio.mjs`, both handing it a real canvas handle.

## Residual risk

The visual gate is the one gate that cannot run here (Linux baselines, macOS host). The expected
delta is one digit on `approach.html`'s line count. Anything else red on that gate is a real
regression and must be investigated rather than re-baselined.
