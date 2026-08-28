# Spike 1 verdict — does an in-process SDK tool carry an op to the applier?

**Ticket**: #280 · **Epic**: #279 · **Date**: 2026-08-28 · **Branch taken: the in-process tool.**

**Answer: yes, first run.** `createSdkMcpServer` + `tool` carries an op from the agent to a JS handler
in the portal process at `@anthropic-ai/claude-agent-sdk@0.1.77`: the CLI process lists the tool and
reports the server connected, the handler runs in the calling pid, it resolves `answer_ref` against a
store it closes over, and its refusal reaches the agent mid-turn as text the agent quotes and can act on.
The decision rule's first branch applies: `zod` is declared in `portal/package.json` and CLAUDE.md's
dependency line is amended in the same PR (#280's PR). Evidence: `.claude/plans/discovery-spike-1-op-transport/`
(`preflight.txt`, `run-1.txt`, `README.md`).

## The mechanism

One in-process MCP server (`discovery-spike`) carrying one stub tool, `record_stub(question_id,
answer_ref, level)`, whose handler is a closure over a stub bank and a stub answer store. The server
object is passed straight into `query()` as `mcpServers: { 'discovery-spike': server }`; the SDK keeps
the instance in process and sends the CLI only its name. The agent sees `mcp__discovery-spike__record_stub`
and nothing else (`tools: []`, `allowedTools: []`). The fence is the house shape, twice: `canUseTool`
allows the one tool, a `PreToolUse` hook denies everything else. The tool description states that there
is no parameter for answer text — the handler resolves the reference, the agent never types the answer.

## The bar

`works` gates on P1–P5 and B1, B2, B3, B7; P6, B4, B5, B6 and I1 are informative, so a red B4 would not
flip the verdict. All thirteen rows were true this run.

Pre-flight — the bundled `McpServer`'s own `tools/list` and `tools/call` handlers called directly, zero
tokens, deterministic:

| # | Row | Result |
|---|---|---|
| P1 | advertised schema: `question_id` nullable, `level` enum of four, three required | **PASS** |
| P2 | a valid call filed by the handler in this pid | **PASS** |
| P3 | `question_id: null` arrives as JSON null | **PASS** |
| P4 | a bad `answer_ref` refused by the handler as `isError` | **PASS** — `answer_ref "a9" does not resolve — the store holds a1, a2` |
| P5 | out-of-enum `level` refused before the handler | **PASS** — `MCP error -32602: Input validation error … Invalid option: expected one of …` |
| P6 | a missing field refused | **PASS** — `invalid_type … expected string, received undefined` |

Run — one `query()`:

| # | Row | Result |
|---|---|---|
| B1 | tool visible, server `connected` at init | **PASS** |
| B2 | handler ran in this pid (85297, same as the pre-flight) and resolved `a1` | **PASS** |
| B3 | the handler's refusal reached the agent, quoted verbatim | **PASS** |
| B4 | `canUseTool` consulted for the MCP call | **PASS** — three of three calls |
| B5 | `PreToolUse` hook fired for the MCP call | **PASS** — three of three calls |
| B6 | `tools: []` left no built-in tool | **PASS** — init lists the one MCP tool |
| B7 | run ended `success` | **PASS** |
| I1 | (informational) the agent quoted the schema-layer refusal | **yes** — it sent `level: "wrong"` and quoted the `-32602` text |

## Run numbers

`num_turns` **4** · `duration_ms` **12 243** · `total_cost_usd` **0.092** · model `claude-sonnet-5` ·
SDK 0.1.77 · zod 4.4.3 · node v20.20.2. One call per turn, as instructed; no re-run.

## What #284 (the spine) inherits

- **`answer_ref` resolves inside the session.** The handler is a closure over the server-owned answer
  store; resolution happens in the portal process, same tick, no disk read per call and no subprocess.
  The op *is* one tool call, so batching is impossible by construction.
- **A refusal is an `isError` result, never a throw.** The agent receives the applier's message verbatim
  and corrects inside the turn. Throw only for a bug.
- **Both fence halves see MCP calls — consulted, not shown to block.** `canUseTool` was consulted for every
  call to a tool absent from `allowedTools`, and the `PreToolUse` hook fired for every call, so #287's
  "one predicate, two places" reaches MCP tools as it does built-ins. All three calls were the one allowed
  tool: neither deny branch ran, and a blocked MCP call is unobserved here. #287 must not read a `deny`
  from either half as shown for MCP tools; #284's first fenced run exercises it for free.
- **The allow-list name shape** is `mcp__<server>__<tool>`; #287 carries `mcp__discovery__<op>` (or
  whatever server name #284 picks), and `tools: []` really does remove the built-ins.
- **Transcript `op` lines come from two hooks, not one.** A filed op surfaces on `PostToolUse`
  (`tool_input` + `tool_response`); a refused op — by the handler or by the schema layer — surfaces on
  `PostToolUseFailure` with the message in `error`. A recorder that listens only on `PostToolUse` loses
  every refusal.
- **`CLAUDE_CODE_STREAM_CLOSE_TIMEOUT`** governs handlers over 60 s; an applier is instant, so note it in
  the transport header and move on.

## What the schema requires

A **raw shape** whose values are zod instances from the caller's own `zod` copy —
`{ question_id: z.string().nullable(), answer_ref: z.string(), level: z.enum([...]) }` — not
`z.object(...)`, and not a plain JSON schema (the SDK would pass that through unchanged and fail on the
first call). The SDK bundles its own zod but does not export it; the caller's copy interoperates with the
bundled one through the `_zod` protocol at 4.4.3, which is why the peer dependency is real. Advertised as
draft-07 with `question_id: anyOf [string, null]`. `nullable()` worked as designed: the model sent JSON
`null` when asked, and the handler received `null`, not the string. The enum refusal text, verbatim:
`MCP error -32602: Input validation error: Invalid arguments for tool record_stub: [{"code": "invalid_value", "values": ["business","stakeholder","solution","transition"], "path": ["level"], "message": "Invalid option: expected one of \"business\"|\"stakeholder\"|\"solution\"|\"transition\""}]`.

## Q1 for the owner — CLAUDE.md:153

The ticket amends only the sole-dependency line (150). Line 153, "no TypeScript, no schema library",
would read as contradicted by any `zod` import, so the PR amends it too, with a scoped exception: `zod`
is the SDK's tool-schema adapter only; an applier and a boundary validator never import it. Confirm the
wording at PR review; the alternative is to keep line 153 as it was and state the exception only in the
transport module's header.

## Left open on purpose

The canvas epic's `screen.compose` (#311–#313) uses the same transport and inherits this verdict; it is
not re-run there. The interactive loop's real risk — one answer, at most one closing op, then yield — is
spike 2's question, not this one's.
