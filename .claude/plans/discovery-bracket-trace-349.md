# Plan — #349: the warmup bracket does not hold; observe why, then re-gate the record

Ticket #349 (epic #279, #338 F7). Follows #343 (PR #344) and the header amendment in PR #345.

## The question the plan is built around

`portal/lib/discovery.mjs`'s `fenceHooks` records a `PreToolUse` denial only while a
`SubagentStart…SubagentStop` bracket is closed. Three recordings of one answer sheet drew 3, 79 and 4
built-in `denied` lines, every one the CLI's warmup, and `mainSession()` was true for all of them. The
ticket names two candidates the transcript cannot tell apart — **A** `SubagentStart` had not fired
before the warmup's first tool call; **B** the bracket had already closed on its last stop — and
states that a fix designed against the wrong one is green in CI and silent at run time. So the plan
is observe first, design second.

## M1 — the instrument (uncommitted at the start of this session, landed here)

`DISCOVERY_BRACKET_TRACE=<path outside the run root>`: every `SubagentStart`, `SubagentStop` and
`PreToolUse` denial written as NDJSON with the open set and a start count, never through
`appendTranscript`, swallowed on failure. Group 30 case 22 proves it off by default (path AND a
listing of the run root), decisive when armed, absent from `transcript.jsonl`, harmless on an
unwritable path.

## M2 — the paid observation

One drawer run of the parenting fixture's twelve answers (byte-equal, re-supplied by the #347
session's headless driver) into a scratch slug, provenance fictional, with the instrument armed. Read
the trace per turn: a denial with `open []` and `starts 0` is A; with `starts > 0` is B. ~$0.5.

## M3 — the fix, decided by M2

- If A (start not delivered): the bracket cannot be repaired from inside a hook, because the hook
  never sees the start. Gate the record by the **tool name** instead: under `tools: []` the main
  session is advertised `mcp__` tools only; the warmup agents run with `mcpClients: []` and the
  built-ins (cli.js `p$9` → `BP0`). Record iff `isMcpToolName(tool_name)`. Drop the bracket hooks.
- If B (closed on the last stop): keep the bracket but close it on the turn's end rather than the
  last stop, or count stops against starts. Not taken — see the report.
- Either way: no `discovery-postures.mjs` edit (no fingerprint move), no verb, no transcript edit.

## M4 — the gate, mutated first

Rewrite group 30 case 20 so the "built-in denied with NO `SubagentStart` ever delivered" line exists,
put the bracket back as a mutation and watch that line go red, then restore. Slim case 22 to the
instrument that remains (`DISCOVERY_FENCE_TRACE`: tool + recorded per denial).

## M5 — docs the fix makes true

`discovery/README.md` §File shapes and §The parenting fixture (both still state the bracket as fact
and the 79-line count for a package that now has four); `discovery.mjs`'s header; group 30's summary
clause; `gates.md` group 30.

## M6 — verify

`node tooling/build-checks.mjs` all 32 · `cd portal && node lib/discovery-transport.mjs --preflight`
all 8 rows · `node tooling/drift-check.mjs` · one recorded run under the fix whose `transcript.jsonl`
carries zero built-in `denied` lines WITH the trace showing the warmup did call tools (a quiet
warmup is not a pass). Both packages committed as labelled fixtures; the traces beside the report.
