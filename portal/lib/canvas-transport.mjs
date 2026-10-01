// portal/lib/canvas-transport.mjs — the ONE file in the compose loop that imports
// @anthropic-ai/claude-agent-sdk and zod (epic #295 ticket #312; .claude/plans/canvas-compose-loop-312.md
// Task 3.1). It is LAZY-IMPORTED by portal/lib/canvas-session.mjs's runComposeTurn, inside the run lock
// and after every guard; nothing imports it statically, which is what lets build-checks group 47 import
// the session in CI where portal/node_modules does not exist (the session's invariant 1).
//
// WHAT S6 (#308) AND THE #312 PROBE OBSERVED THAT THIS FILE DEPENDS ON:
//
//   1. z.looseObject, NEVER z.object, FOR A COMPOSITION. z.object strips unknown keys, so a node's
//      props and ids would not arrive as sent and the recorded op would not be what the agent filed
//      (S6 PF2; the REDDENS mutation below turns PF2, PF3 and PF7 red).
//   2. decisionRefs IS REQUIRED AT THE TOOL, and stays optional in canvas-ops' PARAMS. Without it the
//      agent cited seqs only inside `why` (0 decisionRefs across 3 proposals, probe runs 2-3); with it
//      run 4 filed ["7","23"]. The op grammar is unchanged — only the agent's tool asks for it.
//   3. A HANDLER isError FIRES PostToolUseFailure (probe runs 2 and 3), not PostToolUse. The session's
//      fence records only a schema-layer refusal there, so a handler refusal is never written twice.
//   4. RESUME CROSSES A TOOL CHANGE. Probe run 3 kept one session id across screen_compose → state_add →
//      screen_compose, each init advertising exactly that turn's one tool. `resume: id || undefined`:
//      the SDK treats null as a value to resume from.
//   5. AUTH IS THE SUBSCRIPTION. The SDK builds the child's env as `{ ...options.env ?? process.env }`
//      (sdk.mjs:8592), so an ANTHROPIC_API_KEY exported in the shell reached the CLI and probe run 1
//      failed "Credit balance is too low" at $0 — as `subtype: "success"` with `is_error: true`, which
//      is why `ok` below is both. subscriptionEnv() passes the env without that key.
//   6. strictMcpConfig IS LOAD-BEARING (#352): a fictional package's build/ sits inside this repo, below
//      .mcp.json, and without it whether the CLI merges that file into the advertised tools is the SDK's
//      call. The canvas server is the turn's whole MCP surface.
//   7. states IS OPTIONAL AT THE TOOL (#316), unlike decisionRefs: most screens declare none, and a required field
//      invites invented states. Unprobed by a paid run; if the agent omits a state the PRD names, the owner refuses
//      with a brief naming it (the plan's R5 fallback), and both turns are recorded.
//
// Zero-token pre-flight:  cd portal && node lib/canvas-transport.mjs --preflight

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
// subscriptionEnv lives in the SDK-free session module so group 47.16 can drive it in CI (observation 5).
import { fileProposal, MCP_SERVER, SCREEN_TOOL, SCREEN_TOOL_DESCRIPTION, STATE_TOOL, STATE_TOOL_DESCRIPTION, subscriptionEnv, VOCAB_PATH } from "./canvas-session.mjs";
import { seedSpine } from "./canvas-store.mjs";
import { REPO_DIR } from "./env.mjs";

const SHAPES = {
  [SCREEN_TOOL]: () => ({ screenId: z.string(), why: z.string(), composition: z.looseObject({ name: z.string() }), decisionRefs: z.array(z.string()), states: z.array(z.string()).optional() }),
  [STATE_TOOL]: () => ({ baseId: z.string(), stateKey: z.string(), override: z.looseObject({}), why: z.string() }),
};

// One in-process server advertising exactly one tool: `spec` is { name, description, handler }.
export function buildComposeServer(spec) {
  const shape = SHAPES[spec.name];
  if (!shape) throw new Error(`canvas-transport: no zod shape for tool "${spec.name}" — a compose tool is ${SCREEN_TOOL} or ${STATE_TOOL}`);
  return createSdkMcpServer({ name: MCP_SERVER, version: "1.0.0", tools: [tool(spec.name, spec.description, shape(), async (args) => spec.handler(args))] });
}

const sdkVersion = () => JSON.parse(readFileSync(new URL("../node_modules/@anthropic-ai/claude-agent-sdk/package.json", import.meta.url), "utf8")).version;

export async function composeQuery({ systemPrompt, prompt, cwd, resume, model, maxTurns, tool: spec, canUseTool, hooks, onInit, onText }) {
  const server = buildComposeServer(spec);
  const q = query({
    prompt,
    options: {
      cwd,
      model,
      maxTurns,
      systemPrompt,
      resume: resume || undefined,
      tools: [],
      allowedTools: [],
      mcpServers: { [MCP_SERVER]: server },
      strictMcpConfig: true,
      canUseTool,
      hooks,
      env: subscriptionEnv(),
    },
  });
  let sessionId = resume || null;
  let advertised = null;
  let stats = null;
  for await (const msg of q) {
    if (msg.type === "system" && msg.subtype === "init") {
      sessionId = msg.session_id;
      advertised = msg.tools ?? null;
      onInit?.({ sessionId, model: msg.model ?? model, tools: advertised });
    } else if (msg.type === "assistant") {
      for (const b of msg.message?.content || []) if (b.type === "text" && b.text) onText?.(b.text);
    } else if (msg.type === "result") {
      const u = msg.usage ?? {};
      const isError = msg.is_error === true;
      stats = {
        sessionId: msg.session_id ?? sessionId,
        numTurns: msg.num_turns ?? null,
        durationMs: msg.duration_ms ?? null,
        costUsd: msg.total_cost_usd ?? null,
        inputTokens: u.input_tokens ?? null,
        outputTokens: u.output_tokens ?? null,
        cacheReadTokens: u.cache_read_input_tokens ?? null,
        cacheCreationTokens: u.cache_creation_input_tokens ?? null,
        subtype: msg.subtype,
        isError,
        ok: msg.subtype === "success" && !isError,
        ...(typeof msg.result === "string" && { result: msg.result.slice(0, 300) }),
        transport: "sdk",
        sdk: sdkVersion(),
      };
    }
  }
  return { sessionId, stats, advertised };
}

// ---- the zero-token pre-flight ------------------------------------------------------------------------
// Calls the REAL server's own tools/list and tools/call handlers in this process — no query(), no model,
// no cost. Every row gets a FRESH seed of discovery/faster-payment's spine (#316: the committed package grows with a
// real run, and PF3 must file seq 7 however long it gets) and a fresh handler context, because
// a filed proposal would otherwise refuse the next row (one call per turn, one open proposal). It reads
// a PRIVATE API (Protocol._requestHandlers): if that is gone it prints PF0 unreachable and exits 2,
// never passing vacuously.
export async function preflight() {
  const vocab = JSON.parse(readFileSync(VOCAB_PATH, "utf8"));
  const temps = [];
  const fresh = (name, ask = { kind: "screen" }) => {
    const dir = mkdtempSync(path.join(tmpdir(), "canvas-preflight-"));
    temps.push(dir);
    const pkgRoot = path.join(dir, "pkg");
    seedSpine(path.join(REPO_DIR, "discovery/faster-payment"), pkgRoot, { discovery: true });
    const ctx = { pkgRoot, turn: "pf", ask, vocab, calls: [] };
    let handlerCalls = 0;
    const server = buildComposeServer({
      name,
      description: name === SCREEN_TOOL ? SCREEN_TOOL_DESCRIPTION : STATE_TOOL_DESCRIPTION,
      handler: (args) => { handlerCalls += 1; ctx.last = structuredClone(args); return fileProposal(ctx, name, args); },
    });
    const handlers = server.instance?.server?._requestHandlers;
    const extra = { signal: new AbortController().signal, requestId: 0, sendNotification: async () => {}, sendRequest: async () => {} };
    const direct = async (method, params) => { try { return await handlers.get(method)({ method, params }, extra); } catch (e) { return { threw: e.message }; } };
    return { ctx, handlers, direct, call: (args) => direct("tools/call", { name, arguments: args }), calls: () => handlerCalls };
  };
  const textOf = (r) => (r?.content || []).map((c) => c.text).join("\n");
  const rows = [];
  const row = (id, pass, detail) => { rows.push(pass); console.log(`${id} ${pass ? "✓" : "✗"} ${detail}`); };
  const screen = (children, rootId) => ({ name: "stack", ...(rootId && { id: rootId }), props: { direction: "column" }, children });
  const valid = () => screen([{ name: "text", id: "lead", props: { role: "heading", content: "Pay" } }, { name: "primary-button", id: "go", props: { label: "Send" } }]);
  try {
    const p1 = fresh(SCREEN_TOOL);
    if (!p1.handlers?.get?.("tools/call")) {
      console.log("PF0 ✗ unreachable — the bundled McpServer's _requestHandlers is gone; nothing is proven");
      return 2;
    }
    const listed = (await p1.direct("tools/list", {}))?.tools ?? [];
    const req = [...(listed[0]?.inputSchema?.required ?? [])].sort().join(",");
    const props = Object.keys(listed[0]?.inputSchema?.properties ?? {}).sort().join(",");
    row("PF1", listed.length === 1 && listed[0].name === SCREEN_TOOL && req === "composition,decisionRefs,screenId,why" && props === "composition,decisionRefs,screenId,states,why", `tools/list → [${listed.map((t) => t.name)}] required [${req}] properties [${props}]`);

    const p2 = fresh(SCREEN_TOOL);
    const deep = { name: "stack", props: { direction: "column" }, children: [
      { name: "stack", id: "row", props: { direction: "row" }, children: [{ name: "text", id: "t", props: { role: "body", content: "x" }, extra: { keep: [1, 2] } }] }] };
    await p2.call({ screenId: "deep", why: "Depth-3 passthrough probe for the schema layer.", composition: deep, decisionRefs: [] });
    row("PF2", JSON.stringify(p2.ctx.last?.composition) === JSON.stringify(deep), `a depth-3 composition with an unknown key arrives deep-equal: ${JSON.stringify(p2.ctx.last?.composition?.children?.[0]?.children?.[0]?.extra)}`);

    const p3 = fresh(SCREEN_TOOL);
    const r3 = await p3.call({ screenId: "pay", why: "Seq 7: one screen, one button.", composition: valid(), decisionRefs: ["7"] });
    row("PF3", !r3.isError && /^filed seq \d+: screen\.compose "pay"/.test(textOf(r3)), `a valid screen with part ids → ${textOf(r3).slice(0, 110)}`);

    const p4 = fresh(SCREEN_TOOL);
    const r4 = await p4.call({ screenId: "x", why: "Probe.", composition: screen([{ name: "hero-banner", id: "h", props: {} }]), decisionRefs: [] });
    row("PF4", r4.isError && textOf(r4).startsWith("refused: composition.children[0]:"), `hero-banner → ${textOf(r4).slice(0, 110)}`);

    const p5 = fresh(SCREEN_TOOL);
    const r5 = await p5.call({ screenId: "x", why: "", composition: valid(), decisionRefs: [] });
    row("PF5", r5.isError && /\(D4\)/.test(textOf(r5)), `why "" → ${textOf(r5).slice(0, 110)}`);

    const p6 = fresh(SCREEN_TOOL);
    const r6 = await p6.call({ screenId: "x", why: "Probe.", decisionRefs: [] });
    row("PF6", r6.isError && /-32602/.test(textOf(r6)) && p6.calls() === 0, `no composition → ${textOf(r6).slice(0, 90)} · handler calls ${p6.calls()}`);

    const p7a = fresh(SCREEN_TOOL);
    const r7a = await p7a.call({ screenId: "x", why: "Probe.", composition: screen([{ name: "text", props: { role: "body", content: "no id" } }], "root"), decisionRefs: [] });
    const p7b = fresh(SCREEN_TOOL);
    const r7b = await p7b.call({ screenId: "x", why: "Probe.", composition: valid(), decisionRefs: [] });
    row("PF7", r7a.isError && /has no id/.test(textOf(r7a)) && !r7b.isError, `an id-less child → ${textOf(r7a).slice(0, 80)} · the root alone id-less → ${textOf(r7b).slice(0, 40)}`);

    const p8 = fresh(STATE_TOOL, { kind: "state", baseId: "f1", stateKey: "empty" });
    const l8 = (await p8.direct("tools/list", {}))?.tools ?? [];
    const req8 = [...(l8[0]?.inputSchema?.required ?? [])].sort().join(",");
    row("PF8", l8.length === 1 && l8[0].name === STATE_TOOL && req8 === "baseId,override,stateKey,why", `state tools/list → [${l8.map((t) => t.name)}] required [${req8}]`);
  } finally {
    for (const d of temps) rmSync(d, { recursive: true, force: true });
  }
  const n = rows.filter(Boolean).length;
  console.log(n === rows.length ? `preflight ✓ ${n}/${rows.length}` : `preflight ✗ ${n}/${rows.length}`);
  return n === rows.length ? 0 : 1;
}

if (process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  if (!process.argv.includes("--preflight")) {
    console.error("usage: node lib/canvas-transport.mjs --preflight   (run from portal/; zero tokens)");
    process.exit(2);
  }
  console.log(`canvas-transport preflight — sdk ${sdkVersion()} · node ${process.version}`);
  process.exit(await preflight());
}
