# #264 · adoptBoard cancels a live carry before the wrapper-removal loop

## The defect

`system/studio.mjs`'s `adoptBoard` (#214) removes every `.stx-slot` wrapper but never calls
`verbs.cancel()`. The orchestrator's only cancel call site is the compile beat's `onState` guard
(studio.mjs:499, `next === "rendered" || next === "blocks"`), so a redraft from a COMPILED stage is
covered indirectly — `adoptBoard` calls `compile.revert()`, which lands in that guard. The uncovered
path is a redraft from BLOCKS state with a carry live:

- the `gesture` closure keeps referencing detached nodes;
- `.is-picked` leaves the DOM with them, so `studio-select.mjs:283`'s `carrying()` reports false
  while a gesture is still live — stale-false for a cross-module reader (#217's `openMenu` bails on
  `carrying()`);
- Escape then reaches `studio-verbs.mjs:1366`'s document listener and announces
  "Cancelled, X back in column c, row r." about a component that no longer exists.

Filed from PR #263's review; pre-existing since #214.

## The fix

ONE line in `adoptBoard`, after the `compile.revert()` branch and before the wrapper-removal loop:

```js
verbs?.cancel();
```

with a comment stating why it exists, that `cancel()` no-ops without a live gesture (every ordinary
redraft), and that the compiled path was already covered via the revert — which is why the line
sits after that branch. `cancel()` runs while the carried node is still attached, so it announces
the same "Cancelled, X back in column c, row r." sentence the compile path already produces at
redraft time. Accepted.

## The gate

A new row block in `tooling/studio-journey.mjs`'s `methodPass`, on its OWN page load so every
existing exact announcement count stays untouched. Scenario: settle /factory, pick up the first
block from the keyboard (record its `data-stx-name`), reset the live counter, `check()` a
method-card radio to redraft. Assert:

1. `getVerbs().gesture === null` AND zero `.is-picked` in the whole document — `carrying()` false
   for the right reason (cancelled), not false-by-detachment;
2. the redraft's announcements INCLUDE the cancel sentence naming the carried label — this is the
   half that reddens on the pre-fix tree during the redraft itself;
3. counter reset, focus the canvas scroll region, Escape — zero announcements (in particular
   nothing naming the vanished label) and the gesture still null.

Helper note: `countLive`/`liveSeen` keep only the LAST text per mutation batch, and adoptBoard's
cancel + placements + redraft sentence land in one synchronous burst — so the shared observer
gains a per-record `__liveTexts` capture (each `say()` is one childList record whose `addedNodes[0]`
carries the full sentence). Additive; no existing row reads it.

## Validation

- Red-prove first: stash the studio.mjs one-liner, run the journey on chromium, observe the #264
  rows RED; restore, observe green. Both observations recorded in the report.
- `node tooling/build-checks.mjs` → 27/27 (nothing pure changes).
- Serve the worktree on 4761, curl-verify it serves the edit, then
  `BASE=http://127.0.0.1:4761 node tooling/studio-journey.mjs all` (three engines; one firefox
  "Page crashed" retry allowed — known load flake).
- `node agent-layer/gen-loc-summary.mjs`; commit the regenerated file if it drifts. A GROUP number
  flip stops the ticket and gets flagged instead of a baseline regen.
