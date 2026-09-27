// portal/lib/brilliant-mcp.mjs — hand-written canon (this repo; not generated). THE BRILLIANT BRIDGE'S
// STDIO CLIENT, AND THE ONE PLACE THAT KNOWS BRILLIANT'S WIRE SHAPES (epic #295 ticket #311 PR B;
// .claude/plans/import-run-live-read-311-pr-b.md Tasks 3.1-3.2; the owner's 2026-09-27 call for a
// direct stdio client over the Agent SDK relay, amending docs/epics/canvas-design-import.architecture.md
// § Boundaries "The import is a recorded run").
//
// WHAT IT IS: `@brilliant-hq/mcp` is a local stdio router (its PROTOCOL.md §1: newline-delimited JSON-RPC
// 2.0 on stdout, logs on stderr). openBridge speaks exactly that — initialize, the initialized
// notification, tools/list, tools/call — and nothing else of MCP. No model is involved: an import costs $0.
// The parsers below take a JSON-RPC reply object exactly as the bridge writes it and return plain data;
// portal/lib/import-run.mjs sequences them and never reads a reply's inside itself (PR A's R1).
//
// INVARIANTS — each one is asserted by build-checks group 43, not assumed:
//   1. NODE BUILT-INS ONLY. No Agent SDK, no @modelcontextprotocol/sdk, no zod (43.1 parses the
//      specifiers). That is what lets group 43 import it in CI, where portal/node_modules is absent.
//   2. THE FENCE IS AT call(). The injected `decide` (import-run.mjs's importFenceDecision — ONE
//      predicate, still) runs BEFORE a byte is written: a denied tool never leaves the portal (43.2
//      watches the fake bridge's inbound log). A throwing decide DENIES (fail closed). `onDeny` is how
//      the caller records the denial — deniedLine stays in import-run.mjs, so there is no import cycle
//      — and a throwing onDeny is swallowed: a recording bug must not alter the run. A missing decide is
//      a programming error, thrown at construction, never a silent deny-everything at call time.
//   3. STDOUT IS JSON-RPC ONLY. A non-JSON stdout line is a PROTOCOL ERROR — every pending request is
//      rejected with it — never data. A line carrying a `method` (a server request or notification) is
//      not a reply and is ignored; only a {id, result|error} line settles a request.
//   4. EVERY SHAPE IT KNOWS IS PINNED BY A COMMITTED CAPTURE under import/fixtures/brilliant-live/
//      (43.11 reads every file there). A Brilliant change is a re-capture, never a guess here.
//   5. ONE PROCESS PER SESSION, killed by its own handle in close() — never by name or port.
//
// WHAT IT CANNOT KNOW: whether a tab is paired, until tools/list answers. `initialize` is answered
// locally by the helper either way (import/fixtures/brilliant-live/initialize-unpaired.json); an
// unpaired tools/list waits ~46 s and then errors -32000 (observed 45.8 s), opening a brilliant.design
// tab as a side effect. classifyBridge turns that error into `not-paired`, in the bridge's own words.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

// The read allow-list, BARE MCP names (the `mcp__brilliant__` prefix was the SDK's). `init` joined it at
// PR B: get_selection needs the canvasId only init names (fixtures get-selection-no-canvas.json, init.json).
export const TOOLS = Object.freeze(["init", "get_selection", "lookup", "export"]);

// Moved from import-run.mjs unchanged: UXF_BRILLIANT_MCP (a JSON server config — the journey's fake) or
// the published package through npx.
export function brilliantServer(env = process.env) {
  if (env.UXF_BRILLIANT_MCP) return JSON.parse(env.UXF_BRILLIANT_MCP);
  return { type: "stdio", command: "npx", args: ["-y", "@brilliant-hq/mcp"], env: {} };
}

// --- the client -----------------------------------------------------------------------------------

// `streams` is the CI seam: { input, output } — the client WRITES to input and READS output, so group 43
// wires tooling/fake-brilliant-bridge.mjs's serve() over two PassThroughs with no spawn. Otherwise the
// configured server is spawned and its stderr drained, never parsed.
export function openBridge({ server = brilliantServer(), streams = null, allowed = TOOLS, decide, onDeny = null } = {}) {
  if (typeof decide !== "function") throw new Error("brilliant-mcp: openBridge needs decide");
  let input, output, child = null;
  if (streams) ({ input, output } = streams);
  else {
    child = spawn(server.command, server.args ?? [], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, ...(server.env ?? {}) } });
    ({ stdin: input, stdout: output } = child);
    child.stderr.resume();
  }

  const pending = new Map();
  let nextId = 1, ended = null, broken = null;
  let resolveExited;
  const exited = new Promise((r) => { resolveExited = r; });
  const failAll = (err) => { for (const p of pending.values()) p.reject(err); pending.clear(); };
  // The bridge ended (a process exit, a spawn error, a stream end): pending requests carry `exited`.
  const finish = (code) => {
    if (ended) return;
    ended = { code };
    failAll(Object.assign(new Error(`brilliant-mcp: the bridge exited (${code ?? "stream end"}) before answering`), { exited: code }));
    resolveExited(code);
  };
  if (child) {
    child.on("error", (e) => finish(e.code ?? "spawn error"));   // ENOENT: the command does not exist
    child.on("close", (code, signal) => finish(code ?? signal));
  } else {
    output.on("end", () => finish(null));
    output.on("close", () => finish(null));
  }
  input.on("error", () => { /* EPIPE after an exit — the close above reports it */ });

  let buf = "";
  output.setEncoding("utf8");                                    // a chunk split mid-"—" must not become U+FFFD
  output.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch {
        broken = new Error(`brilliant-mcp: stdout carried a non-JSON line (${JSON.stringify(line.slice(0, 80))}) — a protocol error`);
        failAll(broken);
        return;
      }
      if (!msg || typeof msg !== "object" || msg.method !== undefined || !("result" in msg || "error" in msg)) continue;
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); p.resolve(msg); }
    }
  });

  const write = (obj) => input.write(`${JSON.stringify(obj)}\n`);
  const request = (method, params = {}) => {
    if (broken) return Promise.reject(broken);
    if (ended) return Promise.reject(Object.assign(new Error(`brilliant-mcp: the bridge exited (${ended.code ?? "stream end"}) before ${method}`), { exited: ended.code }));
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      write({ jsonrpc: "2.0", id, method, params });
    });
  };
  // A notification has no id and gets no reply (notifications/initialized): written, never awaited.
  const notify = (method, params = {}) => { if (!ended && !broken) write({ jsonrpc: "2.0", method, params }); };

  // THE FENCE SITE (invariant 2).
  const call = async (name, args = {}) => {
    let d;
    try { d = decide(name, allowed); }
    catch (e) { d = { allow: false, reason: `the fence could not evaluate ${String(name)} (${e.message}) — denied, fail closed` }; }
    if (d?.allow !== true) {
      const reason = d?.reason ?? `${String(name)} is denied`;
      try { onDeny?.({ tool: name, input: args ?? null, reason }); } catch { /* invariant 2 */ }
      return { denied: reason };
    }
    return request("tools/call", { name, arguments: args });
  };

  const close = () => {
    failAll(Object.assign(new Error("brilliant-mcp: closed"), { exited: "closed" }));
    try { input.end(); } catch { /* already gone */ }
    if (child && child.exitCode === null && child.signalCode === null) child.kill();
  };

  return { request, notify, call, close, exited };
}

// --- the wire shapes (pure; each takes a reply object as captured) --------------------------------

const ID_RE = /^[0-9a-f]{16}$/;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

export function textOf(reply) {
  const c = reply?.result?.content;
  if (!Array.isArray(c)) return null;
  const t = c.filter((x) => x?.type === "text" && typeof x.text === "string").map((x) => x.text);
  return t.length ? t.join("\n") : null;
}

// A failed call in the bridge's own words — a JSON-RPC error's message, or an `isError` result's text —
// or null for a reply that answered. The reader classifies with it; the parsers throw with it.
export function failureOf(reply) {
  if (reply?.error) return String(reply.error.message ?? `error ${reply.error.code}`);
  if (reply?.result?.isError === true) return textOf(reply) ?? "(no text)";
  return null;
}

// A JSON-RPC error or a tool's `isError` → a throw carrying the bridge's own words.
const refusedBy = (reply, tool) => {
  if (reply?.error) throw new Error(`brilliant-mcp: ${tool} answered error ${reply.error.code}: ${reply.error.message}`);
  if (reply?.result?.isError === true) throw new Error(`brilliant-mcp: ${tool} refused: ${textOf(reply) ?? "(no text)"}`);
};

const jsonText = (reply, tool) => {
  refusedBy(reply, tool);
  try { return JSON.parse(textOf(reply)); } catch { throw new Error(`brilliant-mcp: ${tool}'s text is not JSON: ${String(textOf(reply)).slice(0, 80)}`); }
};

// `_meta.brilliant` (PROTOCOL.md §2 Disclosure). null when absent — the unpaired initialize carries none.
export function bindingOf(reply) {
  const m = reply?.result?._meta?.brilliant;
  if (!m || typeof m !== "object") return null;
  const p = m.project ?? {};
  return {
    project: p.name || p.title || p.handle || null,
    tabId: typeof m.tabId === "string" ? m.tabId : null,
    surface: typeof m.surface === "string" ? m.surface : null,
    viewOnly: m.viewOnly === true,
    otherTabs: Array.isArray(m.otherTabs) ? m.otherTabs.length : 0,
  };
}

export function parseInit(reply) {
  refusedBy(reply, "init");
  const m = String(textOf(reply) ?? "").match(/\*\*sessionCanvasId:\*\*\s*`([^`]+)`/);
  if (!m) throw new Error("brilliant-mcp: init named no sessionCanvasId");
  return { canvasId: m[1] };
}

// The ids come from the JSON's own `selectedIds`, NEVER a regex over the text: the probe's throwaway
// regex picked up the fill id 9df0cbadf986e307 out of the blueprint (observed).
export function parseSelection(reply) {
  const v = jsonText(reply, "get_selection");
  if (!Array.isArray(v?.selectedIds)) throw new Error("brilliant-mcp: get_selection.selectedIds is not an array");
  v.selectedIds.forEach((id, i) => { if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`brilliant-mcp: get_selection.selectedIds[${i}] ${JSON.stringify(id)} is not a 16-hex element id`); });
  if (typeof v.canvasId !== "string") throw new Error("brilliant-mcp: get_selection.canvasId is not a string");
  return { canvasId: v.canvasId, selectedIds: v.selectedIds, blueprint: typeof v.blueprint === "string" ? v.blueprint : "" };
}

// lookup { format: "blueprint" } → the results' blueprints joined in order, and their element ids.
export function parseLookup(reply) {
  const v = jsonText(reply, "lookup");
  if (!Array.isArray(v?.results)) throw new Error("brilliant-mcp: lookup.results is not an array");
  v.results.forEach((r, i) => { if (typeof r?.blueprint !== "string") throw new Error(`brilliant-mcp: lookup.results[${i}].blueprint is not a string`); });
  return { text: v.results.map((r) => r.blueprint).join("\n"), elementIds: v.results.flatMap((r) => (Array.isArray(r.elementIds) ? r.elementIds : [])) };
}

// export { format: "png" } → the image block, checked against the bridge's own
// `element(s): <id> | WxH | N bytes | sha256:<hex>` line — an integrity check both captures make possible.
export function parseExport(reply) {
  refusedBy(reply, "export");
  const c = Array.isArray(reply?.result?.content) ? reply.result.content : [];
  const img = c.find((x) => x?.type === "image" && typeof x.data === "string");
  if (!img) throw new Error("brilliant-mcp: export carried no image block");
  const m = String(textOf(reply) ?? "").match(/element\(s\):\s*\S+\s*\|\s*(\d+)x(\d+)\s*\|\s*(\d+) bytes\s*\|\s*sha256:([0-9a-f]{64})/);
  if (!m) throw new Error("brilliant-mcp: export carried no `element(s): … | WxH | N bytes | sha256:…` line");
  const bytes = Buffer.from(img.data, "base64");
  if (sha256(bytes) !== m[4]) throw new Error(`brilliant-mcp: export's PNG (${bytes.length} bytes) does not match its own sha256 line (${m[4]})`);
  return { bytes, width: Number(m[1]), height: Number(m[2]), sha256: m[4] };
}

// lookup { format: "summary" } over a canvas → its TOP-LEVEL elements (no parentId), in order.
export function parsePage(reply) {
  const v = jsonText(reply, "lookup");
  if (!Array.isArray(v?.results)) throw new Error("brilliant-mcp: lookup.results is not an array");
  return v.results.flatMap((r) => (Array.isArray(r?.elements) ? r.elements : []))
    .filter((e) => e && !e.parentId && typeof e.id === "string" && ID_RE.test(e.id))
    .map((e) => ({ id: e.id, name: typeof e.name === "string" ? e.name : "", type: typeof e.type === "string" ? e.type : "" }));
}

// --- the classifier: an outcome → at most ONE refusal, each with ONE action ------------------------
//
// Input: { phase: "initialize" | "tools/list" | "call" | "selection", exited, timedOut, error, tools,
// selection, project }. `exited` is present (a code, or null for a stream end) only when the bridge
// ended. It answers null ONLY on an explicit success — tools/list naming get_selection, or a non-empty
// selection — and anything it cannot place is `not-running` (fail closed). No retry anywhere (G29).

const HINT = { label: "Check it runs", hint: "npx -y @brilliant-hq/mcp" };
const PAIRING = "No Brilliant surface is connected";

export function classifyBridge(o) {
  const notRunning = (code) => ({ kind: "not-running", message: `The Brilliant MCP server did not start (exit ${code ?? "unknown"}).`, action: HINT });
  if (!o || typeof o !== "object" || Array.isArray(o)) return notRunning();
  const early = o.phase === "initialize" || o.phase === "tools/list";
  if (o.exited !== undefined) {
    return early ? notRunning(o.exited)
      : { kind: "read-failed", message: `Brilliant refused the read: the bridge exited (exit ${o.exited ?? "unknown"}) mid-read.`, action: { label: "Drop an exported file instead" } };
  }
  if (o.timedOut === true) {
    return early ? { kind: "not-answering", message: "The Brilliant bridge did not answer.", action: HINT }
      : { kind: "stale-binding", message: o.project ? `Bound to project ${o.project} — it did not answer.` : "The binding did not answer.", action: { label: "Re-bind", route: "binding" } };
  }
  if (o.phase === "tools/list") {
    const msg = typeof o.error === "string" ? o.error : o.error?.message;
    if (typeof msg === "string" && msg.includes(PAIRING)) {
      return { kind: "not-paired", message: "Brilliant is not paired with this computer. A brilliant.design tab should have opened: allow its local connection (in Brave, \"apps on device\"), click Connect, then import again.",
        detail: msg, action: { label: "Import again", retry: true } };
    }
    if (!o.error && Array.isArray(o.tools) && o.tools.includes("get_selection")) return null;
    return { kind: "not-reachable", message: "Brilliant is not reachable — no workspace is open.", action: { label: "Open Brilliant, then import again", href: "https://brilliant.design" } };
  }
  if (o.phase === "call" && o.error) {
    const text = typeof o.error === "string" ? o.error : (o.error.message ?? JSON.stringify(o.error));
    return { kind: "read-failed", message: `Brilliant refused the read: ${text}`, action: { label: "Drop an exported file instead" } };
  }
  if (o.phase === "selection") {
    const ids = Array.isArray(o.selection) ? o.selection : o.selection?.selectedIds;
    if (Array.isArray(ids) && ids.length > 0) return null;
    return { kind: "nothing-selected", message: "Nothing is selected in Brilliant.", action: { label: "Select a component, then Import selection" } };
  }
  return notRunning();
}
