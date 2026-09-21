# #437 report — measuredBox refuses, params refused by path

**Branch** `fix/measured-box-refusals-437` off `main` @ `4550925`.

## What changed

- `system/studio-verbs.mjs`: `measuredBox` exported and pure; `measuredBoxOf` is one line over it.
  The align/distribute verbs say `Refused: <node> has no measurable height …` and touch nothing;
  `renderGuides` drops a peer it cannot measure instead of drawing a zero-height one.
- `system/canvas-ops.mjs`: `plainData` runs at the end of `checkOp`; a function or symbol at any
  depth is refused as `<verb>: params.<path> is a <type> — an op's params are plain data a JSONL
  line can carry`.
- `tooling/build-checks.mjs`: group 13 gains six `measuredBox` cases (two pass-throughs, four
  refusals); group 35's battery gains two rows (a nested function, a nested symbol), matched on the
  verb, the path, the type and "plain data".
- `.claude/references/gates.md`: rows 13 and 35.

## Gates (observed, in the worktree)

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 36 groups pass |
| mutation A — `plainData` call removed | ❌ `canvas ops 2 failure(s)` (both the unnamed DataCloneError) → restored ✅ |
| mutation B — `return { ...box, h: offsetHeight \|\| 0 }` | ❌ `verbs 4 failure(s)` (the four refusal rows) → restored ✅ |
| `node agent-layer/gen-loc-summary.mjs` | ✅ no figure moved, `loc-summary.json` byte-identical |

## What this does not claim

The `Refused:` sentence on a running page was not observed — no shipped page hides the canvas at
click time. The guides path's skip was not observed either, for the same reason. Both are call
sites over the one pure function the gate drives; #306's page is where either first becomes
reachable, and the ticket says to re-triage there.
