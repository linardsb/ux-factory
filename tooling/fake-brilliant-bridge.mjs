// tooling/fake-brilliant-bridge.mjs — hand-written canon (this repo; not generated). THE BRILLIANT
// BRIDGE'S STDIO PROTOCOL, ANSWERED FROM THE COMMITTED CAPTURES under import/fixtures/brilliant-live/
// (#311 PR B; .claude/plans/import-run-live-read-311-pr-b.md Task 1.2). Build-checks group 43 drives it
// in process over PassThrough streams; tooling/canvas-journey.mjs runs it standalone as the portal's
// UXF_BRILLIANT_MCP, so the page meets the real client end to end with no Brilliant tab.
//
// WHAT IT IS: a newline-delimited JSON-RPC 2.0 responder (the MCP stdio transport). Every reply is a
// committed capture with its `id` replaced by the request's; a notification gets no line. It never
// invents a shape: a tool it has no capture for is a -32601 error.
//
// MODES — `paired` (the default: initialize, tools/list, init, get_selection, read, export,
// list_projects, and the retired lookup's redirect) · `unpaired` (initialize answered locally, then tools/list's -32000 pairing error) ·
// `none-selected` / `two-selected` (paired, get_selection from those captures) · `hang-call` (paired,
// but tools/call never answers) · `hang-init` (never answers anything) · `exit` (ends its output at
// once in process; exits 1 standalone) · `garbage` (writes one non-JSON line on the first request).
// `overrides` (in process only) replaces a capture by file name, for a case that needs a `_meta`
// project or a longer page than the scratch canvas had — the caller says so in its own message.
//
// WHAT IT CANNOT REACH: the real router, pairing, the browser tab the real bridge opens, Brilliant's
// own validation (it answers any `read` by id count and format), the export's `scale` (it serves the one
// scale-1 387×122 capture for every non-thumbnail export, whatever scale the read asks), and TIME — the real unpaired tools/list waits
// ~46 s before erroring (observed 45.8 s); this answers at once. Only canvas-journey's
// --live-brilliant leg meets the real bridge.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DIR = new URL("../import/fixtures/brilliant-live/", import.meta.url);
// The one id read-unresolved.json was captured with (its README row): a fill id, not an element.
const UNRESOLVED = "9df0cbadf986e307";
const capture = (name, overrides) => structuredClone(overrides?.[name] ?? JSON.parse(readFileSync(new URL(name, DIR), "utf8")));

export const MODES = Object.freeze(["paired", "unpaired", "none-selected", "two-selected", "hang-call", "hang-init", "exit", "garbage"]);

export function serve({ input, output, mode = "paired", log = null, overrides = null }) {
  if (!MODES.includes(mode)) throw new Error(`fake-brilliant-bridge: mode ${JSON.stringify(mode)} is not one of ${MODES.join(", ")}`);
  const send = (reply) => output.write(`${JSON.stringify(reply)}\n`);
  const answer = (id, name) => { const r = capture(name, overrides); r.id = id; send(r); };
  if (mode === "exit") { output.end(); return; }
  let garbled = false;

  const toolsList = (id) => {
    const s = capture("tools-list.json", overrides);
    send({ jsonrpc: "2.0", id, result: { tools: s.names.map((name) => ({ name, inputSchema: s.schemas[name] ?? { type: "object" } })) } });
  };

  const call = (id, name, args = {}) => {
    if (name === "init") return answer(id, "init.json");
    if (name === "get_selection") {
      if (!args.canvasId) return answer(id, "get-selection-no-canvas.json");
      return answer(id, mode === "none-selected" ? "get-selection-none.json" : mode === "two-selected" ? "get-selection-two.json" : "get-selection-one.json");
    }
    if (name === "read") {
      const ids = Array.isArray(args.ids) ? args.ids : [];
      if (args.format === "summary" && !ids.length) return answer(id, "read-page.json");
      if (ids.includes(UNRESOLVED)) return answer(id, "read-unresolved.json");
      if ((args.format ?? "blueprint") === "blueprint" && ids.length) return answer(id, ids.length >= 2 ? "read-blueprint-two.json" : "read-blueprint-one.json");
    }
    // Brilliant's real words for the retired tool, not -32601: a client that regresses meets the live behaviour.
    if (name === "lookup") return answer(id, "lookup-retired.json");
    if (name === "export") return answer(id, args.width ? "export-thumb.json" : "export-png.json");
    if (name === "list_projects") return answer(id, "list-projects.json");
    return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `fake-brilliant-bridge: no capture answers ${name} ${JSON.stringify(args)}` } });
  };

  const handle = (msg) => {
    log?.(msg);
    if (msg?.id === undefined || msg.id === null) return;          // a notification: no line back
    if (mode === "hang-init") return;
    if (mode === "garbage" && !garbled) { garbled = true; output.write("hello\n"); return; }
    if (msg.method === "initialize") return answer(msg.id, mode === "unpaired" ? "initialize-unpaired.json" : "initialize.json");
    if (msg.method === "tools/list") return mode === "unpaired" ? answer(msg.id, "tools-list-unpaired.json") : toolsList(msg.id);
    if (msg.method === "tools/call") return mode === "hang-call" ? undefined : call(msg.id, msg.params?.name, msg.params?.arguments);
    return send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `fake-brilliant-bridge: method ${msg.method} not found` } });
  };

  let buf = "";
  input.setEncoding?.("utf8");
  input.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }            // the client never writes one
      handle(msg);
    }
  });
}

// Standalone: the portal spawns it as a stdio MCP server. Exiting on stdin EOF means a killed parent
// never leaves an orphan (PR A's first hanging fake did); the empty write flushes the pipe first.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? "paired";
  if (mode === "exit") process.exit(1);
  process.stdin.on("end", () => process.stdout.write("", () => process.exit(0)));
  serve({ input: process.stdin, output: process.stdout, mode });
}
