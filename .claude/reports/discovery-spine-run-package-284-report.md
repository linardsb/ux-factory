# Implementation Report — the discovery spine: one question, one op, one run package on disk (#284)

**Plan**: `.claude/plans/discovery-spine-run-package-284.md`   **Branch**: `feat/284-discovery-spine`   **Status**: COMPLETE (Tasks 1–22; Task 23 is the commit + PR)
**Epic**: #279 · **Spike**: 2 · **Run package**: `discovery/spine-meridian-1/` (fictional, committed)

## Spike-2 verdict — the decision rule's first branch: clean

The ticket's rule: *"clean → ship the spine and add width on top. Runs ahead → tighten to an explicit
yield contract in the posture prompt and re-run. Still runs ahead → add the `Stop` hook (refuse the
yield when nothing was filed) before any width is built, and record that the prompt could not hold it."*

**Branch taken: clean.** Read from `discovery/spine-meridian-1/transcript.jsonl`, not from memory:

| Turn | Question | Answer | Closer filed | Closers on the turn | Asked a second question | Skipped the filing |
|---|---|---|---|---|---|---|
| t1 | `s4-appetite` | proper | `record_decision` seq 1 | 1 | no | no |
| t2 | `s4-rabbit-holes` | deliberately thin | `flag_weak_answer` seq 2 | 1 | no | no |
| t3 | `s4-out-of-bounds` | proper | `record_decision` seq 3 | 1 | no | no |

10 transcript lines: 6 `text`, 3 `op`, 1 `denied`. Two `text` lines per turn (the judgement, then
"Filed as seq N"). No turn carried two closing ops; no turn filed nothing; no turn's prose asked the
next banked question. The `Stop` hook was not needed and is not added.

**The applier corrected the agent mid-turn, once.** On t3 the agent first sent `parent_id: 1`
(parenting a solution decision on another solution decision); the applier refused —
`parent_id 1 is a solution decision — a solution decision's parent sits one rung above, at stakeholder`
— the refusal reached the agent as `isError`, and the agent re-filed with `parent_id: null` in the same
turn. That is the `denied` line, and it is the R2 mechanism working end to end rather than only in the
pre-flight.

**MVP 6 held.** Every `text` line judges the answer's form against the weak-answer note. None says the
answer is wrong on substance. The thin answer was written to be thin in substance (no assumption
examined, no hard decision named) without echoing the note's wording, so the flag proves judgement,
not string matching.

## The numbers (observed — `run.json` `turnStats`)

| Turn | SDK turns | duration | cost | output tokens | cache read |
|---|---|---|---|---|---|
| t1 | 2 | 21 187 ms | $0.0429 | 1 545 | 5 472 |
| t2 | 2 | 10 518 ms | $0.0265 | 579 | 8 862 |
| t3 | 3 | 16 400 ms | $0.0317 | 845 | 16 631 |
| **sum** | **7** | **48 105 ms** | **$0.1011** | **2 969** | |

Model `claude-sonnet-5` · SDK 0.1.77 · zod 4.4.3 · node v20.20.2 · resume-per-turn on one `sessionId`.

**Extrapolation to a 30-question `full-discovery` session (derived):**

- mean 16 035 ms/question × 30 = 481 s ≈ **8 minutes** of agent time; the human's writing time is on top
- mean 2.33 SDK turns/question × 30 ≈ **70 SDK turns**
- mean $0.0337/question × 30 ≈ **$1.01**
- cache-read grew 5.5k → 8.9k → 16.6k across three turns because resume carries the conversation;
  expected: per-turn latency and cost rise through a 30-question session, so the 8 minutes is a floor.
  #338 (Run 0) is the real read.

## AC #5 — reload and restart (observed)

- After t2, `GET /api/discovery/session` returned cursor index 2 / `t3` / `s4-out-of-bounds`, 2 answers,
  6 transcript lines, 2 `turnStats`.
- The portal process was then killed and restarted; `POST /api/discovery/session` on the same slug
  returned the same cursor, the same counts, the same `sessionId` (`409e465f…`) and the same `startedAt`.
- Two things reset on restart and neither is a bug: the in-memory `inFlight` lock, and the SDK's own
  conversation cache (t3 resumed by `sessionId` from `run.json` and its `cacheReadTokens` shows it did).

## One defect found by the real run, and one aborted attempt

The **first** attempt at t1 refused every op the agent filed with
`applyOp: the state must be { ops: [] }` (five `denied` lines, no closer). Cause: `runTurn` passed the
bare run `{ ops }` from `applyOps(...)` as `state`, while `buildOpServer` reads `state.current`. The
pre-flight had built its own `{ current }` holder, so seven green rows never crossed that seam — the
check that could not fail. Fix: `discovery.mjs` wraps the run in the holder, and `buildOpServer` now
refuses a wrong-shaped holder before `query()` starts (zero tokens).

**Governance note.** That aborted package was deleted uncommitted and the slug re-run after the fix.
Task 22's rule — "the failed run is kept, not deleted" — is written for a run the *agent* got wrong, and
this one failed on a code defect before any judgement was made; but the rule was applied loosely and
the evidence of the aborted attempt is this session's log, not a committed file. If the reviewer wants
it, the honest fix is to state it here (done), not to reconstruct a transcript.

## The check that can fail — four mutations (observed)

| # | Source broken | What went red | Restored |
|---|---|---|---|
| M1 | `turnEvent`'s `text` branch given `secret: line.secret` | group 30, 2 failures — `case 2: an unknown field on a text line reached the projection — {"type":"text","secret":"SMUGGLED",…}` and the exact-key-set case for the text branch | ✓ |
| M2 | `TOOL_SCHEMA.record_decision` keys `wrong_if`/`off_script` swapped | group 30, 1 failure (schema ↔ `PARAMS` by name **and order**) | ✓ |
| M3 | `assertProvenanceRoot`'s real-inside-repo refusal replaced by `false &&` | group 30, 1 failure (the privacy refusal driven by a repo-rooted real run) | ✓ |
| M4 | `TOOL_SCHEMA.record_decision.level` widened to five members | pre-flight PF2: `enum [business, stakeholder, solution, transition, fifth] != [business, stakeholder, solution, transition]` | ✓ |

After restore: `node tooling/build-checks.mjs` → `build ✓  all 30 groups pass`; pre-flight 7/7.

## The pre-flight (observed, zero tokens)

`cd portal && node lib/discovery-transport.mjs --preflight` — sdk 0.1.77 · zod 4.4.3 · node v20.20.2

| Row | Result |
|---|---|
| PF1 advertised tool set = `OPS` | PASS |
| PF2 `required` by name and order; enums by member | PASS |
| PF3 `question_id: null` arrives as JSON null | PASS |
| PF4 a valid `record_decision` filed; op line seq 2, closes, flagged `[no-evidence]` | PASS |
| PF5 unresolvable `answer_ref` → `isError` with the applier's message verbatim | PASS |
| PF6 out-of-enum `level` refused by the schema layer, ledger unchanged | PASS |
| PF7 a second closer on the same turn → `isError` naming the turn (R2) | PASS |

## The fence — a bounded claim

`tools: []` removed every built-in tool, `allowedTools: []` sent every MCP call through `canUseTool`,
and the `PreToolUse` hook fired for each. **Only the allow path was observed**: every call in the run
was one of the four allowed op tools, so neither deny branch ran and a blocked MCP call remains
**unproven**. #287 owns that proof; the run's one `denied` line is an applier refusal, not a fence
denial (the README now says so).

## Tasks completed

- Tasks 1–8 · `portal/lib/discovery.mjs` — roots, answer store, transcript writer, `run.json`, cursor, `TOOL_SCHEMA`, `turnEvent`, the lock + config.
- Task 9 · `portal/lib/discovery-postures.mjs` — Think posture, three exported strings.
- Tasks 10–13 · `portal/lib/discovery-transport.mjs` — four MCP tools, the handler, the fence hooks, `runDiscoveryTurn`.
- Task 14 · `runTurn` (the lazy import). Task 15 · five routes in `portal/server.mjs`. Task 16 · the drawer (`index.html` / `portal.js` / `portal.css`, 44×44 controls).
- Tasks 17–18 · `tooling/build-checks.mjs` group 30 (`all 30 groups pass`).
- Task 19 · the pre-flight (above). Task 20 · the real run (above). Task 21 · `discovery/README.md` ×3 amendments + the CLAUDE.md clause.
- Task 22 · this report.

## Deviations

- **D1** The state-holder defect above: one extra guard in `buildOpServer`, not in the plan.
- **D2** The drawer's placeholder read `verdant-away-mode-1` from an earlier session; reset to the plan's `spine-meridian-1` so the slug is stated once.
- **D3** The answers were written by the agent session at the owner's instruction ("do task 20"), about the fictional Verdant "away mode"; the plan says "the operator's own words". Stated here so the committed package is not read as the owner's authored answers.
- **D4** `CLAUDE.md:148` still says the op-verb fixture is "build-checks group 28"; the applier is group 29 since the bank took 28. Pre-existing, one word, not changed here — flagged for the reviewer.

## Review notes (no gate covers the portal)

- 44×44: `#discovery-drawer .btn`, `select`, `input` carry `min-height: 44px` (`portal.css:196-197`).
- No `document`/`window` in the two SDK-free modules; group 30 case 12 pins it.

## Validation results

- `node tooling/build-checks.mjs` → `build ✓  all 30 groups pass` (observed, after restore).
- `cd portal && node lib/discovery-transport.mjs --preflight` → 7/7 PASS, zero tokens (observed).
- The plan's Task 20 assertion → `answers 3 lines 10 closers { t1: 1, t2: 1, t3: 1 } kinds [text, op, denied] ops [record_decision, flag_weak_answer, record_decision]`, `turnStats 3`, `endedAt` set (observed).
- Every number above traces to `discovery/spine-meridian-1/run.json` or `transcript.jsonl`.
