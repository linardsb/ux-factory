// spike-c-sdk-reach.mjs — spike C step 7: can a portal-style Agent SDK run reach the Brilliant MCP?
// Mirrors portal/lib/trace-recorder.mjs's query() shape (allowedTools + canUseTool fence + PreToolUse
// hook; the recorder sets no permissionMode) and adds ONE thing: the Brilliant MCP from ~/.claude.json
// passed explicitly as `mcpServers`. Read-only: the only allowed tool is mcp__brilliant__lookup.
// Run:  cd portal && node ../.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = "/Users/Berzins/Desktop/Linards_current/ux-factory";
const PORTAL = join(REPO, "portal");
const pkgDir = join(PORTAL, "node_modules/@anthropic-ai/claude-agent-sdk");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const entry = (pkg.exports?.["."]?.import ?? pkg.exports?.["."]?.default ?? pkg.module ?? pkg.main);
const { query } = await import(pathToFileURL(join(pkgDir, typeof entry === "string" ? entry : entry.default)).href);

const INSTANCE = "1db1b29957b949ca";
const brilliant = { type: "stdio", command: "npx", args: ["-y", "@brilliant-hq/mcp"], env: {} }; // verbatim from ~/.claude.json projects[<repo>].mcpServers.brilliant
const ALLOWED = ["mcp__brilliant__lookup"];
const t0 = Date.now();
const log = (s) => process.stdout.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}\n`);
const killer = setTimeout(() => { log("TIMEOUT 170s — aborting"); process.exit(124); }, 170_000);

let toolList = null, mcpStatus = null, calls = [], finalText = null, denied = [];
const q = query({
  prompt: `Call the tool mcp__brilliant__lookup exactly once with {"scope":["${INSTANCE}"],"format":"summary"} and reply with ONLY the element's name field from the result. Do not call any other tool.`,
  options: {
    cwd: REPO, model: "claude-sonnet-5", maxTurns: 4,
    systemPrompt: "You are a read-only probe. Use only the one tool named in the prompt.",
    allowedTools: ALLOWED,
    mcpServers: { brilliant },
    canUseTool: async (tool) => {
      if (ALLOWED.includes(tool)) return { behavior: "allow" };
      denied.push(tool); return { behavior: "deny", message: `spike C fence: ${tool} is not allowed` };
    },
    hooks: {
      PreToolUse: [{ hooks: [async (input) => {
        if (!ALLOWED.includes(input.tool_name)) { denied.push(input.tool_name); return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "spike C fence" } }; }
        return {};
      }] }],
      PostToolUse: [{ hooks: [async (input) => { calls.push({ tool: input.tool_name, input: input.tool_input, response: JSON.stringify(input.tool_response).slice(0, 600) }); log(`PostToolUse ${input.tool_name}`); return {}; }] }],
      PostToolUseFailure: [{ hooks: [async (input) => { calls.push({ tool: input.tool_name, failed: true, error: String(input.error ?? input.tool_response).slice(0, 600) }); log(`PostToolUseFailure ${input.tool_name}`); return {}; }] }],
    },
  },
});
try {
  for await (const msg of q) {
    if (msg.type === "system" && msg.subtype === "init") {
      toolList = msg.tools; mcpStatus = msg.mcp_servers;
      log(`init: model=${msg.model} tools=${(msg.tools || []).length} mcp_servers=${JSON.stringify(msg.mcp_servers)}`);
      log(`brilliant tools visible: ${(msg.tools || []).filter((t) => t.startsWith("mcp__brilliant__")).join(", ") || "NONE"}`);
    } else if (msg.type === "assistant") {
      for (const b of msg.message?.content || []) if (b.type === "tool_use") log(`tool_use ${b.name} ${JSON.stringify(b.input).slice(0, 200)}`); else if (b.type === "text") log(`assistant: ${b.text.slice(0, 200)}`);
    } else if (msg.type === "result") {
      finalText = msg.result ?? null; log(`result: subtype=${msg.subtype} turns=${msg.num_turns} cost=${msg.total_cost_usd} text=${String(finalText).slice(0, 200)}`);
    }
  }
} catch (e) { log(`ERROR ${e.message}`); }
clearTimeout(killer);
const verdict = { elapsedMs: Date.now() - t0, brilliantToolsVisible: (toolList || []).filter((t) => t.startsWith("mcp__brilliant__")), mcpStatus, calls, denied, finalText };
console.log("\nVERDICT " + JSON.stringify(verdict, null, 2));
process.exit(0);
