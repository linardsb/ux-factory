# #312 Phase 0 probe — the compose loop's prompt surface, resume across a tool change, and auth

**Real runs, 2026-09-29.** Ticket [#312](https://github.com/linardsb/ux-factory/issues/312), plan
`../canvas-compose-loop-312.md`. The probe is a throwaway extension of `../canvas-spike-s6/driver.txt`, kept as
`probe.txt`. It is parked as `.txt` because CI's drift-check syntax-checks every tracked `.mjs`. To run it, copy it
to a scratch `.mjs`:

```
node probe.mjs --repo <checkout> --out <dir> [--dry]
```

The document lives in memory. Nothing outside `--out` is written. `claude-sonnet-5`, SDK 0.1.77, zod 4.4.3, Node
v20.20.2, over the vocabulary sha `a2bfea9494d879de` (the same as S6's).

Every prompt byte in the probe is the plan's constants: S6's `ROLE · LOOP · ESCAPE · TURN_ASK` plus `BRIEF_LEAD`,
`STATE_ASK`, the id sentence and `STATE_TOOL_DESCRIPTION`. The probe exits unless those four S6 constants
reproduce S6's fingerprint `c903170484396973` (they did, on every run).

**`probe.txt` is the run-4 version.** Runs 2 and 3 ran two earlier versions of it:

| Run | Probe version |
|---|---|
| 2 | Ids required on every node including the root; `decisionRefs` optional; four turns. |
| 3 | Root exempt from the id rule; three turns (no escape turn). |
| 4 | As run 3, plus `decisionRefs` required, with one extra description sentence; one turn. |

Each run's `T*.jsonl` carries its `turn` line with the exact prompt sent, and each stats line carries the prompt
fingerprint it ran under:

| Run | Plan fingerprint |
|---|---|
| 2, 3 | `91b07131e9aa171d` |
| 4 | `9690d4c955be652c` |

## Runs

| Run | Turn | Ask | Outcome | Cost USD | Evidence |
|---|---|---|---|---|---|
| 1 | T1 | briefed screen | **failed before any model call**: `Credit balance is too low`, `subtype: success` + `is_error: true` | 0 | `raw/run-1/T1.jsonl:3-4` |
| 2 | T1 | briefed screen | refused `ids` (the **root** `stack` had no id; all 7 children did), then the retry was refused `one-per-turn`. The closing text **claimed** "I've proposed the payee-form screen" | 0.2259 | `raw/run-2/T1.jsonl` |
| 2 | T3 | impossible screen (map + directions) | **escape**: `NOT COVERED: no map, geolocation, or turn-by-turn/walking-directions component…`, no call | 0.0396 | `raw/run-2/T3.jsonl` |
| 2 | T4 | un-briefed screen | proposed `payments-home`, ids on every part | 0.0750 | `raw/run-2/T4.jsonl` |
| 3 | T1 | briefed screen | proposed `add-payee-form`. The `why` names the brief: "per the brief's 'no dialog, error state inline', so modal-dialog is deliberately omitted" | 0.0783 | `raw/run-3/T1.jsonl` |
| 3 | T2 | **state** (`error` of f1), advertised tool `state_add` | proposed on exactly `f1`/`error`. The override `set`s 4 existing part ids; resolved and vocabulary-valid | 0.1387 | `raw/run-3/T2.jsonl` |
| 3 | T3 | un-briefed screen | refused `vocabulary` (`list-row` directly under `stack`), then the retry was refused `one-per-turn`. The closing text reported the refusal honestly | 0.1102 | `raw/run-3/T3.jsonl` |
| 4 | T1 | briefed screen, `decisionRefs` required | proposed. `decisionRefs: ["7","23"]`, both real `record_decision` seqs in `discovery/faster-payment/transcript.jsonl` | 0.1476 | `raw/run-4/T1.jsonl` |

The paid total was $0.8155 across runs 2–4. One auth check turn cost $0.0002 (below). Every turn's `maxTurns` was 4
and was recorded on its stats line. `numTurns` was 2 for a clean turn, 3 for a refused call followed by its retry,
and 1 for the escape.

## Verdicts

- **R2, resume across a tool change: holds.** Run 3 used one `sessionId` (`e022414b-…`) across T1 (advertised
  `mcp__canvas__screen_compose`) → T2 (advertised `mcp__canvas__state_add`) → T3 (`screen_compose` again). Every
  init line listed exactly that turn's one tool. The same held in runs 2 and 4.
- **R1, the new prompt surface: holds, with three corrections to the plan.**
  1. **Exempt the root from the id rule.** The agent ids every child and misses the root (run 2). A root is never
     hidden (`frameTree` flags `hide-root`), so a state addresses children. With the root exempt, 0 of 3 later
     screen proposals were refused on ids.
  2. **Make `decisionRefs` required in the tool schema, not in `PARAMS`.** Without it the agent cites seqs only
     inside `why`; runs 2 and 3 carried 0 `decisionRefs` across 3 proposals. With the zod field required and one
     sentence added, run 4 filed `["7","23"]`. G15's "decision link proposed with the screen" needs this.
  3. **Take the outcome from the lines, never from the agent's text.** Run 2 T1's closing sentence claimed a
     proposal that the handler had refused twice.
- **Hook observation, left open by S6: answered.** A handler `isError` fires **`PostToolUseFailure`** (run 2 T1,
  run 3 T3: two each). A filed call fires **`PostToolUse`**. So the handler's own refusal line and the hook would
  double-record without the plan's G6 rule. The hook records only `-32602` / `Input validation error`.
- **The CLI's warmup:** a `Bash` was denied at `PreToolUse` on 6 of 8 turns. This is G5's case: a built-in the
  main session is never advertised. `RECORDED_BUILTINS` must not include `Bash`.
- **Auth.** Run 1 shows the SDK child inherits `ANTHROPIC_API_KEY` from the shell. That key's account has no
  credit, and the architecture says compose turns run on the subscription. `query()`'s `options.env`, when given,
  replaces `process.env` for the child (`sdk.mjs:8592`, `{ ...options.env ?? process.env }`). A one-turn check
  confirmed it with the key still exported in the parent and `env` passed without it: result `ok`,
  `is_error: false`, $0.0002. The transport passes that env.
- **The escape:** 1 of 1 impossible screens escaped with the marker at line start and no call.

## Product observation, NOT a risk: the owner's call

After the root exemption, runs 3–4 made three screen turns (run 3 T1, run 3 T3, run 4 T1). 1 of 3 was refused on its first call, by the vocabulary (run 3 T3); 0 of 3 on ids.
In both refused turns (run 2 T1, run 3 T3), the agent's second call was the correct fix: an id added, or `list-row`
wrapped in `list`. Under the ticket's rule ("never a retry"), that fix is refused and the turn is spent. The plan
keeps the ticket's rule. Allowing ONE in-turn correction (`maxTurns` 4 already permits it) is a one-line change in
`fileProposal`, and it is recorded as the plan's Q6 for the owner.

## Not done

- A second impossible-screen trial (n = 1 for the escape).
- A turn on the ledger-backed session (the probe's handler is in memory). The store half was proven separately at
  $0 with the real `foldLedger`/`arrangement`/`verifyBuild` over run 4's real composition: the AC #1 sequence
  `proposed/agent → accepted/owner → proposed/agent → refused/owner → undone/owner`, the frame gone after undo,
  and `verifyBuild` `[]`. See the plan's NOTES N5.
