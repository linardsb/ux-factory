# #437 — two latent refusal gaps: `measuredBoxOf`'s silent 0 and `clone()`'s unnamed DataCloneError

Deferred from PR #432's round-2 review (F5, F6). Both become reachable at #306; both are closed now
so #306 inherits named refusals rather than silent coercion.

## Tasks

1. `system/studio-verbs.mjs` — extract the height rule into an exported pure `measuredBox(box,
   offsetHeight, id)` that passes an authored `--h` through, takes `offsetHeight` for a wrapper, and
   THROWS naming the node when it is not a positive finite number. `measuredBoxOf` calls it. The
   align/distribute handler catches and `canvas.say`s `Refused: …` (DOM untouched); the drag-guides
   path skips an unmeasurable peer (a guide is advisory).
   → verify: build-checks group 13, four refusal answers + two pass-throughs; mutation `|| 0` → red.
2. `system/canvas-ops.mjs` — `plainData(params, verb, path)` walks the params inside `checkOp`
   before the clone and refuses a function or symbol BY PATH.
   → verify: group 35's battery gains two rows; mutation (walk dropped) → both red with the
   unnamed DataCloneError.
3. `gates.md` rows 13 and 35 + both group summary strings carry the clause (three copies rule).
4. `gen-loc-summary.mjs` — regenerated; no figure moved.

## Not driven

The page's `Refused:` announcement for an unmeasurable height needs a hidden canvas at click time,
which no shipped page produces; the pure function is the gate, the announcement is a call site.
