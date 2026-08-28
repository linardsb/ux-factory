// .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs — epic #279, ticket #280 (spike 1).
// QUESTION: does an in-process SDK tool (createSdkMcpServer + tool) carry an op to an applier end to end at
// @anthropic-ai/claude-agent-sdk@0.1.77, and what does its schema actually require?
// Mirrors .claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs (the query() shape, the two-place fence,
// the killer) and adds ONE thing: an in-process MCP server carrying one STUB tool with three parameters.
// The tool is record_stub, not record_decision — discovery/ops.mjs and the real grammar are #281's, and
// nothing here ships. The stub "applier" is a closure over a stub bank + a stub answer store, in THIS process.
//
// Two stages. The PRE-FLIGHT calls the bundled McpServer's own tools/list + tools/call handlers directly —
// zero tokens, deterministic — and settles what the schema requires and how refusals look. The RUN then
// proves only what the pre-flight cannot: the transport to the CLI process, the fence call sites, and
// that a refusal reaches the agent mid-turn.
//   node .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs --preflight   (no tokens)
//   node .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs               (pre-flight, then ONE query() run)
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const PORTAL = path.join(REPO, 'portal');
const PREFLIGHT_ONLY = process.argv.includes('--preflight');

// Bare specifiers do not resolve from .claude/plans/ — load both packages through portal/node_modules by
// reading each package.json's entry (spike C's loader, generalised to two packages).
const pkgOf = (name) => JSON.parse(readFileSync(path.join(PORTAL, 'node_modules', name, 'package.json'), 'utf8'));
async function fromPortal(name) {
  const pkg = pkgOf(name);
  const dot = pkg.exports?.['.'];
  const pick = (v) => (typeof v === 'string' ? v : v?.default ?? v?.import);
  const entry = (dot && pick(dot.import ?? dot.default)) ?? pkg.module ?? pkg.main;
  return import(pathToFileURL(path.join(PORTAL, 'node_modules', name, entry)).href);
}
const { query, createSdkMcpServer, tool } = await fromPortal('@anthropic-ai/claude-agent-sdk');
const { z } = await fromPortal('zod');
const versions = { sdk: pkgOf('@anthropic-ai/claude-agent-sdk').version, zod: pkgOf('zod').version, node: process.version };

const t0 = Date.now();
const log = (s) => process.stdout.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}\n`);

// ---- the stub bank + the stub answer store (the server would own both; here they are inline) ----
const BANK = { q1: 'What must be true in six months for this to have been worth building?' };
const ANSWERS = { a1: 'Two paying teams renew without a discount.', a2: 'We stop hand-writing PRDs.' };
const LEVELS = ['business', 'stakeholder', 'solution', 'transition'];

// ---- the one tool, three parameters, in THIS process ----
const SERVER = 'discovery-spike';
const TOOL = 'record_stub';
const FULL = `mcp__${SERVER}__${TOOL}`;
const filed = [];            // what the stub applier accepted
const handlerCalls = [];     // { pid, args } — pid proves in-process
const server = createSdkMcpServer({
  name: SERVER,
  version: '0.0.0',
  tools: [
    tool(
      TOOL,
      'Spike stub: file one decision BY REFERENCE. answer_ref names a stored answer; the tool resolves it. There is no parameter for answer text.',
      { question_id: z.string().nullable(), answer_ref: z.string(), level: z.enum(LEVELS) },
      async (args) => {
        handlerCalls.push({ pid: process.pid, args });
        log(`handler: ${JSON.stringify(args)} (question_id is ${args.question_id === null ? 'JSON null' : typeof args.question_id})`);
        if (args.question_id !== null && !(args.question_id in BANK))
          return { isError: true, content: [{ type: 'text', text: `${TOOL}: question_id "${args.question_id}" is not in the bank (q1)` }] };
        const answer = ANSWERS[args.answer_ref];
        if (answer === undefined)
          return { isError: true, content: [{ type: 'text', text: `${TOOL}: answer_ref "${args.answer_ref}" does not resolve — the store holds ${Object.keys(ANSWERS).join(', ')}` }] };
        filed.push({ ...args, resolved: answer });
        return { content: [{ type: 'text', text: `filed #${filed.length}: ${args.level} decision on ${args.question_id ?? 'off-script'} ← ${args.answer_ref} ("${answer}")` }] };
      },
    ),
  ],
});

// ---- PRE-FLIGHT: the bundled McpServer's own handlers, called directly, in this process ----
// Zero tokens, deterministic. Private API (Protocol._requestHandlers, a Map keyed by method) — observed
// reachable at 0.1.77 with keys ping · initialize · tools/list · tools/call. Each handler parses the
// request against its own schema and, for tools/call, catches every error into an isError result
// (sdk.mjs:20646-20686) — which is exactly what the agent would receive.
const handlers = server.instance?.server?._requestHandlers;
const extra = { signal: new AbortController().signal, requestId: 0, sendNotification: async () => {}, sendRequest: async () => {} };
const direct = async (method, params) => {
  try { return await handlers.get(method)({ method, params }, extra); }
  catch (e) { return { threw: e.message }; }
};
const preflight = { reachable: Boolean(handlers?.get?.('tools/call')), advertised: null, calls: {} };
if (preflight.reachable) {
  preflight.advertised = (await direct('tools/list', {}))?.tools?.find((t) => t.name === TOOL)?.inputSchema ?? null;
  for (const [label, args] of [
    ['valid',        { question_id: 'q1', answer_ref: 'a1', level: 'business' }],
    ['nullQuestion', { question_id: null, answer_ref: 'a2', level: 'solution' }],
    ['badRef',       { question_id: 'q1', answer_ref: 'a9', level: 'solution' }],
    ['outOfEnum',    { question_id: 'q1', answer_ref: 'a2', level: 'wrong' }],
    ['missingRef',   { question_id: 'q1', level: 'business' }],
  ]) preflight.calls[label] = await direct('tools/call', { name: TOOL, arguments: args });
}
const textOf = (r) => (r?.content || []).map((c) => c.text).join('\n');
const props = preflight.advertised?.properties || {};
const P = {
  P1_schema_nullable_enum_required: JSON.stringify(props.question_id?.anyOf || []).includes('"null"') && Array.isArray(props.level?.enum) && props.level.enum.length === LEVELS.length && (preflight.advertised?.required || []).length === 3,
  P2_valid_call_filed_in_this_process: filed.some((f) => f.answer_ref === 'a1' && f.resolved === ANSWERS.a1) && handlerCalls.length > 0 && handlerCalls.every((c) => c.pid === process.pid),
  P3_null_question_id_arrives_as_json_null: handlerCalls.some((c) => c.args.question_id === null),
  P4_bad_answer_ref_refused_by_handler_as_isError: preflight.calls.badRef?.isError === true && /does not resolve/.test(textOf(preflight.calls.badRef)),
  P5_out_of_enum_refused_before_handler: preflight.calls.outOfEnum?.isError === true && /Input validation error/.test(textOf(preflight.calls.outOfEnum)) && !handlerCalls.some((c) => c.args.level === 'wrong'),
  P6_missing_field_refused: preflight.calls.missingRef?.isError === true && /invalid_type|expected string/.test(textOf(preflight.calls.missingRef)),
};
log(`preflight: ${JSON.stringify(P)}`);
// Reset the stub state so the run's rows count only what the AGENT did.
const preflightFiled = filed.splice(0);
const preflightHandlerCalls = handlerCalls.splice(0);
const preflightOk = Object.values(P).every(Boolean);
if (PREFLIGHT_ONLY) {
  console.log('\nPREFLIGHT ' + JSON.stringify({ versions, preflight, filed: preflightFiled, handlerCalls: preflightHandlerCalls, P }, null, 2));
  process.exitCode = preflightOk ? 0 : 2;
} else {
  await run();
}

// ---- THE RUN: no built-in tools, nothing pre-approved, the fence in both places ----
async function run() {
const PROMPT = `You have exactly one tool, ${FULL}. Make these three calls in order, one per turn, and after each call quote the tool's reply verbatim on one line:
1. question_id "q1", answer_ref "a1", level "business".
2. question_id null (JSON null, not the string "null"), answer_ref "a9", level "solution".
3. question_id "q1", answer_ref "a2", level "wrong" (send exactly that string; this call tests the tool's own validation).
Then reply with the single word DONE. Call nothing else and add no commentary.`;

const seen = { canUseTool: [], preToolUse: [], postToolUse: [], failures: [], assistant: [] };
let init = null, result = null;
const killer = setTimeout(() => { log('TIMEOUT 180s — aborting'); process.exit(124); }, 180_000);
const q = query({
  prompt: PROMPT,
  options: {
    cwd: mkdtempSync(path.join(tmpdir(), 'spike-280-')),
    model: 'claude-sonnet-5',
    maxTurns: 8,
    systemPrompt: 'You are a probe for a tool transport. Follow the numbered instructions exactly, one tool call per turn.',
    tools: [],          // runtimeTypes.d.ts:285 — "[] (empty array) - Disable all built-in tools"
    allowedTools: [],   // nothing pre-approved: canUseTool must be consulted for the MCP tool, or we learn it is not
    mcpServers: { [SERVER]: server },
    canUseTool: async (name, input) => {
      seen.canUseTool.push({ name, input });
      if (name === FULL) return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: `spike fence: ${name} is not the one tool` };
    },
    hooks: {
      PreToolUse: [{ hooks: [async (i) => {
        seen.preToolUse.push({ name: i.tool_name, input: i.tool_input });
        if (i.tool_name !== FULL) return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'spike fence' } };
        return {};
      }] }],
      PostToolUse: [{ hooks: [async (i) => { seen.postToolUse.push({ name: i.tool_name, response: JSON.stringify(i.tool_response).slice(0, 500) }); log(`PostToolUse ${i.tool_name}`); return {}; }] }],
      PostToolUseFailure: [{ hooks: [async (i) => { seen.failures.push({ name: i.tool_name, error: String(i.error ?? JSON.stringify(i.tool_response)).slice(0, 500) }); log(`PostToolUseFailure ${i.tool_name}`); return {}; }] }],
    },
  },
});
try {
  for await (const msg of q) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      init = { model: msg.model, tools: msg.tools, mcp_servers: msg.mcp_servers, session_id: msg.session_id };
      log(`init: model=${msg.model} tools=${JSON.stringify(msg.tools)} mcp_servers=${JSON.stringify(msg.mcp_servers)}`);
    } else if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_use') log(`tool_use ${b.name} ${JSON.stringify(b.input)}`);
        else if (b.type === 'text') { seen.assistant.push(b.text); log(`assistant: ${b.text.slice(0, 300).replace(/\n/g, ' ⏎ ')}`); }
      }
    } else if (msg.type === 'result') {
      result = { subtype: msg.subtype, num_turns: msg.num_turns, duration_ms: msg.duration_ms, total_cost_usd: msg.total_cost_usd, text: msg.result ?? null };
      log(`result: ${JSON.stringify(result)}`);
    }
  }
} catch (e) { log(`ERROR ${e.message}`); }
clearTimeout(killer);

// ---- the bar, computed from what happened ----
const all = seen.assistant.join('\n');
const responses = seen.postToolUse.map((c) => c.response).join('\n') + '\n' + seen.failures.map((f) => f.error).join('\n');
const B = {
  B1_tool_visible_and_server_connected: Boolean(init?.tools?.includes(FULL)) && (init?.mcp_servers || []).some((s) => s.name === SERVER && s.status === 'connected'),
  B2_handler_ran_in_this_process_and_resolved_a1: handlerCalls.length >= 1 && handlerCalls.every((c) => c.pid === process.pid) && filed[0]?.answer_ref === 'a1' && filed[0]?.resolved === ANSWERS.a1,
  B3_handler_refusal_reached_the_agent: /does not resolve/.test(responses) && /does not resolve/.test(all),
  B4_canUseTool_saw_the_mcp_tool: seen.canUseTool.some((c) => c.name === FULL),
  B5_PreToolUse_saw_the_mcp_tool: seen.preToolUse.some((c) => c.name === FULL),
  B6_no_builtin_tools_leaked: Array.isArray(init?.tools) && init.tools.every((t) => t.startsWith('mcp__')),
  B7_run_completed: result?.subtype === 'success',
  // Informational only — the schema refusal itself is P5; this is what the AGENT quoted, if it sent the call.
  I1_agent_quoted_the_enum_refusal: /Invalid option|Input validation error/.test(all) ? 'yes' : 'not exercised (informational)',
};
const works = P.P1_schema_nullable_enum_required && P.P2_valid_call_filed_in_this_process && P.P3_null_question_id_arrives_as_json_null
  && P.P4_bad_answer_ref_refused_by_handler_as_isError && P.P5_out_of_enum_refused_before_handler
  && B.B1_tool_visible_and_server_connected && B.B2_handler_ran_in_this_process_and_resolved_a1 && B.B3_handler_refusal_reached_the_agent && B.B7_run_completed;
const verdict = {
  question: 'in-process SDK tool end to end at the installed SDK?',
  works, versions, elapsedMs: Date.now() - t0, result, init,
  preflight: { ...preflight, filed: preflightFiled, handlerCalls: preflightHandlerCalls, P },
  run: { filed, handlerCalls, fence: { canUseTool: seen.canUseTool.map((c) => c.name), preToolUse: seen.preToolUse.map((c) => c.name) }, toolReplies: seen.postToolUse, failures: seen.failures, assistant: seen.assistant, B },
};
console.log('\nVERDICT ' + JSON.stringify(verdict, null, 2));
process.exitCode = works ? 0 : 2;
}
