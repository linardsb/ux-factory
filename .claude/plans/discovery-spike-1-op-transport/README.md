# Spike 1 — op transport: an in-process SDK tool, end to end at 0.1.77 (#280)

**Real run, 2026-08-28.** One pre-flight (zero tokens) and one `query()` run, no re-run needed. Every
number below is copied from `preflight.txt` and `run-1.txt`; nothing is typed from memory. The tool is a
stub (`record_stub`), the bank and answer store are two inline objects, and nothing here ships —
`discovery/`, `system/`, `agent-layer/` and `tooling/` are untouched.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Q1** Does an in-process SDK tool carry an op to an applier end to end at `@anthropic-ai/claude-agent-sdk@0.1.77`? | **Yes, first run, 12.2 s.** The CLI process listed the one tool and reported the `sdk`-type server `connected` (`run-1.txt:5`); the handler ran in the portal-side process — pid 85297, the same pid the pre-flight recorded (`run-1.txt:7,11`; `:142-166` vs `:186-203`); it resolved `a1` to the stored answer and the agent quoted the reply verbatim (`run-1.txt:9`); the handler's own refusal of `a9` reached the agent mid-turn and was quoted verbatim (`run-1.txt:12-13`); the run ended `success` in 4 turns (`run-1.txt:17`). `works: true` (`run-1.txt:21`). | `run-1.txt:1-17`, `:21`, `:237-246` |
| **Q2** What does the schema actually require? | **A raw shape whose values are zod instances from the caller's own `zod` copy** — `{ question_id: z.string().nullable(), answer_ref: z.string(), level: z.enum([...]) }`, not `z.object(...)` and not a plain JSON schema. The SDK wraps it in its bundled zod and advertises draft-07: `question_id: anyOf [string, null]`, `level: enum` of four, `required` of three (`preflight.txt:14-46`). Out-of-enum and missing-field calls are refused by the schema layer *before* the handler with `MCP error -32602: Input validation error` (`preflight.txt:73-90`); a bad `answer_ref` is refused by the handler as an `isError` result (`preflight.txt:64-72`). `null` reaches the handler as JSON null (`preflight.txt:4`, P3). | `preflight.txt:13-139` |
| **Q3** Which fence call sites see an MCP tool call that is not in `allowedTools`? | **Both, on every call.** `canUseTool` was consulted three times and the `PreToolUse` hook fired three times, once per call (`run-1.txt:204-215`). The permission fast path did not auto-allow the MCP tool. `tools: []` left no built-in in the init list (`run-1.txt:5`, B6). | `run-1.txt:204-215`, `:243` |

**Decision-rule outcome, one line:** *works, and the peer dependency is on disk at 4.4.3, portal-only and
confined to one transport file → the in-process tool; `zod` declared in `portal/package.json` and
CLAUDE.md's dependency line amended in this PR.*

## Setup

- `@anthropic-ai/claude-agent-sdk` **0.1.77**, `zod` **4.4.3** (the SDK's peer, undeclared at run time;
  declared after the verdict), node **v20.20.2** (`run-1.txt:22-26`). Claude Code CLI 2.1.245 on this Mac.
- Auth: the CLI's own login (`portal/.env` carries no `CLAUDE_CODE_OAUTH_TOKEN`), the same path every
  recorder in the repo uses. The run printed nothing about auth.
- `query()` options that matter: `tools: []` (no built-ins), `allowedTools: []` (nothing pre-approved),
  `mcpServers: { 'discovery-spike': server }` where `server` is the `createSdkMcpServer` return value,
  `model: claude-sonnet-5`, `maxTurns: 8`, `cwd` a fresh temp dir. The fence in both places: `canUseTool`
  allows only `mcp__discovery-spike__record_stub`; the `PreToolUse` hook denies everything else.
- Both packages are loaded through `portal/node_modules` by reading each `package.json`'s entry, because
  bare specifiers do not resolve from `.claude/plans/`.

## The bar

### Pre-flight — deterministic, no tokens (`preflight.txt:4`, `:134-139`)

The bundled `McpServer`'s own `tools/list` and `tools/call` handlers, called directly in this process.

| # | Row | Result | Evidence |
|---|---|---|---|
| P1 | advertised schema: `question_id` nullable, `level` an enum of four, three fields required | **PASS** | `preflight.txt:14-46` |
| P2 | a valid call is filed by the handler in this pid | **PASS** — `filed #1: business decision on q1 ← a1 ("Two paying teams renew without a discount.")`, pid 85297 | `preflight.txt:48-55`, `:91-108` |
| P3 | `question_id: null` arrives as JSON null | **PASS** — `filed #2: solution decision on off-script ← a2` | `preflight.txt:2`, `:56-63` |
| P4 | a bad `answer_ref` is refused by the handler as `isError` | **PASS** — `record_stub: answer_ref "a9" does not resolve — the store holds a1, a2` | `preflight.txt:64-72` |
| P5 | out-of-enum `level` is refused before the handler | **PASS** — `invalid_value … Invalid option: expected one of "business"\|"stakeholder"\|"solution"\|"transition"`; no handler line for `wrong` | `preflight.txt:73-81` |
| P6 | a missing `answer_ref` is refused | **PASS** — `invalid_type … Invalid input: expected string, received undefined` | `preflight.txt:82-90` |

### Run — one `query()` (`run-1.txt:237-246`)

| # | Row | Result | Evidence |
|---|---|---|---|
| B1 | the tool is visible and the server `connected` at init | **PASS** — `tools=["mcp__discovery-spike__record_stub"] mcp_servers=[{"name":"discovery-spike","status":"connected"}]` | `run-1.txt:5`, `:35-47` |
| B2 | the handler ran in this pid and resolved `a1` | **PASS** — pid 85297 in both stages; `resolved: "Two paying teams renew without a discount."` | `run-1.txt:7`, `:178-203` |
| B3 | the handler's refusal reached the agent, who quoted it | **PASS** — the same `does not resolve` text in the tool failure and in the assistant turn | `run-1.txt:12-13`, `:222-236` |
| B4 | `canUseTool` saw the MCP call | **PASS** — three consultations, all `mcp__discovery-spike__record_stub` | `run-1.txt:205-209` |
| B5 | the `PreToolUse` hook saw the MCP call | **PASS** — three firings | `run-1.txt:210-214` |
| B6 | `tools: []` left no built-in tool | **PASS** — the init list is the one MCP tool | `run-1.txt:5`, `:37-39` |
| B7 | the run ended `success` | **PASS** — `num_turns: 4` | `run-1.txt:17`, `:28-34` |
| I1 | (informational) the agent quoted the schema-layer refusal | **yes** — it sent `level: "wrong"` and quoted `MCP error -32602 … Invalid option` | `run-1.txt:14-16` |

## Run numbers

- `num_turns` **4** · `duration_ms` **12 243** · `total_cost_usd` **0.09224315** · script elapsed
  **14 188 ms** including the pre-flight (`run-1.txt:27-33`).
- Timeline (`run-1.txt:5-17`): init at 1.4 s · call 1 sent 6.0 s, answered the same tick · call 2 at
  8.3 s · call 3 at 10.7 s · result at 13.6 s. One tool call per turn, as instructed; the fourth turn is
  `DONE`.
- Model `claude-sonnet-5`, session `ea2cb714-9f79-4583-812f-3135430cd2ce` (`run-1.txt:36`, `:46`).
- Against the precedents: spike C's reach test $0.16 / 7.8 s; #203's dry run $0.45.

## The advertised schema, and what the model sent

Advertised by `tools/list` (`preflight.txt:14-46`, verbatim):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "question_id": { "anyOf": [ { "type": "string" }, { "type": "null" } ] },
    "answer_ref": { "type": "string" },
    "level": { "type": "string", "enum": [ "business", "stakeholder", "solution", "transition" ] }
  },
  "required": [ "question_id", "answer_ref", "level" ]
}
```

The `tool_use.input` the model sent for each call (`run-1.txt:6`, `:10`, `:14`):

1. `{"question_id":"q1","answer_ref":"a1","level":"business"}` → filed.
2. `{"question_id":null,"answer_ref":"a9","level":"solution"}` → JSON null, as asked; refused by the
   handler (`a9` does not resolve).
3. `{"question_id":"q1","answer_ref":"a2","level":"wrong"}` → refused by the schema layer; the handler
   never ran (no `handler:` log line between `run-1.txt:14` and `:15`).

## Caveats and bounds

- **One run, one model** (`claude-sonnet-5`), one CLI version (2.1.245), one Mac. The pre-flight
  re-observes the schema half on every invocation, so a future SDK bump that breaks the cross-copy zod
  path goes red before a token is spent; the run half is observed once.
- **The pre-flight reads a private API.** `server.instance.server._requestHandlers` is the MCP SDK
  `Protocol` class's handler map. If a later SDK renames it, `preflight.reachable` reads `false` and
  P1–P6 read `false`; the run's B-rows still decide on their own.
- **Handler refusals arrive as `PostToolUseFailure`, not `PostToolUse`** (`run-1.txt:12`, `:15`;
  `:216-231`). An `isError` result from the handler and a schema-layer refusal both surface on the
  failure hook, with the message verbatim in `error`; only the filed call surfaces on `PostToolUse`. A
  transcript recorder that wants the refusal lines must listen on both hooks.
- **`CLAUDE_CODE_STREAM_CLOSE_TIMEOUT`** governs SDK MCP handlers that run longer than 60 s
  (`agentSdkTypes.d.ts`). This handler is instant; an applier is too. Noted for #284's transport header.
- **A stub, not the grammar.** Three parameters, one bank entry, two stored answers. The real ops, their
  parameters and the applier are #281's; the spike proves the transport and the schema mechanism only.
- **The agent's final `result.text`** is its last message (the quoted enum refusal plus `DONE`), not a
  summary — a recorder should not read it as one.
- Cold-session orientation excluded: the script was authored with the plan in context.

## What was and was not done

Done: the script · the zero-token pre-flight (P1–P6 green, exit 0) · one real `query()` run (B1–B7 green,
I1 yes, `works: true`, exit 0) · this write-up · `zod@^4.4.3` declared in `portal/package.json` (the lock
moves the entry from `peer` to a root dependency; the SDK stays 0.1.77) · CLAUDE.md lines 150 and 153
amended · the two architecture docs pointed at the verdict on #279 · the verdict posted on #279.

Not done, by design: no `discovery/ops.mjs`, no applier, no real op verb; no change under `system/`,
`agent-layer/`, `tooling/`, `traces/`, `replay/`; no second run (none was needed); no re-run of the CLI
fallback (#203's real run already proved it).

## Files

`spike-1-op-transport.mjs` · `preflight.txt` · `run-1.txt` · `README.md` · the verdict body at
`.claude/reports/discovery-spike-1-verdict-280.md` · the plan at `.claude/plans/discovery-spike-1-op-transport-280.md`
