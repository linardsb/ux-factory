// The Claude contradiction screen's ONE call (#466). discovery-screen.mjs builds the request and reads
// the answer; this module only sends it. It is INJECTED into screenSession as `ask` by the route
// (portal/server.mjs) and by the CLI (tooling/jev-screen.mjs --claude --paid), and never imported by
// discovery-screen.mjs, because CI imports that module with no portal/node_modules.
//
// ISOLATION (the screen's invariant 1): no tools, no allowed tools, no MCP server, strictMcpConfig, no
// settingSources (so no CLAUDE.md and no settings file), one turn, and an empty temp cwd. The init
// message is checked before the model answers: a harness that advertises a tool or an MCP server is
// refused, and the call becomes a no-answer.
//
// ANSWERED vs NO ANSWER. A `result` with subtype `success`, `is_error` not true and a string `result`
// is an answer, returned verbatim (the rubric's rule: the first answered call is the run). Everything
// else — a transport error, an abort or timeout, no result message, a non-success subtype, or a success
// that carries `is_error: true` (the CLI's own error text wearing success, e.g. "Credit balance is too
// low") — throws, and the caller writes nothing (CLI) or one `unavailable` line (route).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function askScreen({ model, system, prompt }, { timeoutMs }) {
  const cwd = mkdtempSync(join(tmpdir(), 'screen-'));
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), timeoutMs);
  let init = null;
  let result = null;
  try {
    const q = query({
      prompt,
      options: {
        cwd, model, systemPrompt: system, maxTurns: 1,
        tools: [], allowedTools: [], mcpServers: {}, strictMcpConfig: true,
        abortController,
      },
    });
    for await (const msg of q) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        init = { model: msg.model, tools: msg.tools ?? null, mcpServers: msg.mcp_servers ?? null, skills: msg.skills ?? null };
        if (!Array.isArray(init.tools) || init.tools.length || (init.mcpServers ?? []).length) {
          abortController.abort();
          throw new Error(`screen-call: init advertised tools ${JSON.stringify(init.tools)} / MCP servers ${JSON.stringify(init.mcpServers)} — refusing before the model answers`);
        }
      } else if (msg.type === 'result') result = msg;
    }
  } finally {
    clearTimeout(timer);
    rmSync(cwd, { recursive: true, force: true });
  }
  if (!result) throw new Error('screen-call: no result message — no answer');
  if (result.subtype !== 'success' || result.is_error === true || typeof result.result !== 'string')
    throw new Error(`screen-call: no answer — ${result.subtype}${result.is_error ? ' (is_error)' : ''}: ${String(result.result ?? result.errors ?? '').slice(0, 200)}`);
  return {
    model: init?.model ?? model,
    init,
    resultText: result.result,
    costUsd: result.total_cost_usd ?? null,
    usage: {
      input_tokens: result.usage?.input_tokens ?? null, output_tokens: result.usage?.output_tokens ?? null,
      cache_creation_input_tokens: result.usage?.cache_creation_input_tokens ?? null, cache_read_input_tokens: result.usage?.cache_read_input_tokens ?? null,
    },
    // WHO answered: `model` alone echoes the request.
    modelUsage: result.modelUsage ?? null,
    permissionDenials: result.permission_denials ?? [],
    durationMs: result.duration_ms ?? null,
  };
}
