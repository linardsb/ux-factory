# #312 `--live-compose` receipt

**The three verdict lines in `raw/live-1/ops.jsonl` (seq 8, 10 and 12) say `source: "owner"`, but no owner judged
anything: they are the journey script's clicks, by rule.** The ledger has only two sources, so the line cannot say
so itself; this README is where it is said. See "What is whose" below.

**A real, paid run, on 2026-09-29.** Ticket [#312](https://github.com/linardsb/ux-factory/issues/312), plan
`../canvas-compose-loop-312.md` Task 6.2, and the implementation report
`../../reports/canvas-compose-loop-312-report.md`. It was produced by one invocation of:

```
node tooling/canvas-journey.mjs chromium --live-compose
```

The run used `claude-sonnet-5`, `@anthropic-ai/claude-agent-sdk` 0.1.77 and Node v20.20.2, with prompt fingerprint
`9690d4c955be652c` and vocabulary sha `a2bfea9494d879de`. It made four turns in one SDK session, and the four stats
lines sum to **$0.4810**. Auth was the subscription: the transport's `subscriptionEnv()` strips
`ANTHROPIC_API_KEY` from the CLI child's env.

The package is `fp-compose`: a scratch copy of `discovery/faster-payment` in the stand-in shape (`run.json`, `prd.md`
and `build/`, with no `transcript.jsonl`). It lived under the journey's temp `JOBS_DIR`, and nothing under
`discovery/` was written.

## What is whose

| Lines | Author |
|---|---|
| `raw/live-1/ops.jsonl` seq 1–6 | the committed spine's owner lines, copied |
| `ops.jsonl` seq 7, 9 and 11 (`source: "agent"`, `proposed`) | **model output**, filed through the real handler |
| `ops.jsonl` seq 8 (`accepted`), 10 and 12 (`refused`) — `source: "owner"` | **the journey SCRIPT's clicks**, not the owner's design judgement. The leg accepts L1 and refuses L2 and L4 by rule, to exercise the ledger. |
| `raw/live-1/transcript.jsonl` | the model's text, its init, op, refusal and stats lines as written, plus the owner-sourced brief on `c1` (the script typed the plan's brief `payee form, no dialog, error state inline`) |
| `raw/live-1/stdout.txt` | the leg's own console output |

## The turns

| Turn | Ask | Outcome | Cost USD |
|---|---|---|---|
| `c1` (L1) | a briefed screen | proposed `add-payee-error`, `decisionRefs` `["7","23"]`; the script accepted it as f3 | 0.2202 |
| `c2` (L2) | the `error` state of f3 | proposed `state.add`; the script refused it | 0.1538 |
| `c3` (L3) | an impossible screen (a map with walking directions) | **escape**: `NOT COVERED: …`, no call | 0.0161 |
| `c4` (L4) | an un-briefed screen | proposed `scam-warning`, `decisionRefs` `["7","30"]`; the script refused it | 0.0910 |

## Left for the owner (#316)

These are REPORTED, never asserted:

- whether L1's `why` answers the brief. It argues for "inline field-level text on the same form, not a modal
  interruption", but does not quote the brief;
- whether L2's override is a good error state;
- whether L3's escape is the right call.

These files are never edited. A new receipt is a new directory, and the leg refuses to overwrite one.
