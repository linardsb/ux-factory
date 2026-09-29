// tooling/fake-compose-agent.mjs — hand-written canon (this repo; not generated). A SCRIPTED stand-in
// for the model on the compose loop (epic #295 ticket #312; .claude/plans/canvas-compose-loop-312.md
// Task 2.6). Build-checks group 47 imports it; canvas-journey.mjs's compose pass reaches it through the
// portal child's UXF_COMPOSE_TRANSPORT env seam (portal/lib/canvas-session.mjs's one dynamic import).
//
// IT HAS portal/lib/canvas-transport.mjs's composeQuery SIGNATURE and drives the REAL handler (the
// `tool.handler` the session passes, i.e. fileProposal) and the REAL fence (the `hooks` and `canUseTool`
// the session passes). Every line it causes says `source: "agent"` — and it refuses to run unless its cwd
// is under the OS temp directory (never this repo, never the jobs folder), so those lines only ever land in
// a scratch package, even with UXF_COMPOSE_TRANSPORT left exported in a shell. Its stats say transport "fake".
//
// WHAT IT PROVES: the plumbing — the handler, the fence, the transcript, the lock and the page.
// CANNOT REACH (build-checks group 47 and gates.md carry the same clause):
// a model's behaviour (whether it yields, names the brief in its why, or escapes), the SDK's option handling, hook delivery by the CLI, and the page — those are the preflight's, the journey compose pass's and --live-compose's.
//
// ITS BEHAVIOUR IS CHOSEN ONLY BY THE OWNER'S BRIEF, read back out of the prompt after BRIEF_LEAD:
//   impossible: <rest>   replies "NOT COVERED: <rest>" and calls nothing
//   fence: …             feeds Write, WebFetch and mcp__brilliant__get_selection to BOTH fence sites
//   twice: …             calls the handler twice with the screen fixture
//   invalid: …           files the screen fixture with one child renamed hero-banner
//   anything else        a screen ask files CHOOSE_AMOUNT; a state ask files one state_add
// Imports nothing from portal/node_modules, so group 47 can use it in CI.

import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRIEF_LEAD } from "../portal/lib/canvas-session.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let sessions = 0;

// The root deliberately has NO id — the id rule's root exemption, exercised on every fake screen.
const CHOOSE_AMOUNT = Object.freeze({
  name: "stack", props: { direction: "column", gap: "md", pad: "lg" },
  children: [
    { name: "screen-header", id: "title", props: { title: "Choose the amount", showBack: true } },
    { name: "text-field", id: "amount", props: { label: "Amount", placeholder: "£0.00" } },
    { name: "primary-button", id: "continue", props: { label: "Continue" } },
  ],
});

const briefOf = (prompt) => {
  const at = prompt.indexOf(`${BRIEF_LEAD}\n"`);
  if (at < 0) return null;
  const rest = prompt.slice(at + BRIEF_LEAD.length + 2);
  const end = rest.indexOf('"\n\n');
  return end < 0 ? rest : rest.slice(0, end);
};

export async function composeQuery(opts) {
  const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
  const cwd = real(opts.cwd);
  const tmp = real(tmpdir());
  if (cwd === REPO || cwd.startsWith(REPO + path.sep) || !cwd.startsWith(tmp + path.sep)) {
    throw new Error("fake-compose-agent: the fake agent writes source: \"agent\" lines and must never touch a committed package — its cwd must be a scratch package under the OS temp directory");
  }
  const sessionId = opts.resume ?? `fake-${++sessions}`;
  opts.onInit?.({ sessionId, model: "fake", tools: [opts.tool.fullName] });
  const brief = briefOf(opts.prompt) ?? "";
  let calls = 0;
  const call = async (args) => { calls += 1; return opts.tool.handler(args); };

  if (brief.startsWith("impossible:")) {
    opts.onText?.(`NOT COVERED: ${brief.slice("impossible:".length).trim()}`);
  } else if (brief.startsWith("fence:")) {
    for (const tool of ["Write", "WebFetch", "mcp__brilliant__get_selection"]) {
      await opts.hooks.PreToolUse[0].hooks[0]({ tool_name: tool, tool_input: {} });
      await opts.canUseTool(tool, {});
    }
    opts.onText?.("Fence probed.");
  } else if (opts.tool.name === "screen_compose") {
    const why = brief ? `Serves the owner's brief: "${brief}"` : "No brief this turn.";
    const composition = structuredClone(CHOOSE_AMOUNT);
    if (brief.startsWith("invalid:")) composition.children[1].name = "hero-banner";
    const args = { screenId: "choose-amount", why, composition, decisionRefs: ["7"] };
    await call(args);
    if (brief.startsWith("twice:")) await call(structuredClone(args));
    opts.onText?.("Proposed choose-amount.");
  } else {
    const m = opts.prompt.match(/Call `state_add` once with baseId "([^"]+)", stateKey "([^"]+)"/);
    const treeAt = opts.prompt.indexOf("The base screen:\n");
    const tree = treeAt >= 0 ? JSON.parse(opts.prompt.slice(treeAt + "The base screen:\n".length)) : null;
    const ids = [];
    const walk = (n) => { if (!n || typeof n !== "object") return; if (typeof n.id === "string") ids.push([n.id, n.name]); for (const c of n.children ?? []) walk(c); };
    walk(tree);
    const target = (ids.find(([, name]) => name === "text-field") ?? ids[0])?.[0] ?? "missing";
    await call({
      baseId: m?.[1], stateKey: m?.[2],
      override: { set: { [target]: { hint: "Something went wrong — check the amount." } } },
      why: brief ? `Serves the owner's brief: "${brief}"` : "No brief this turn.",
    });
    opts.onText?.(`Proposed the ${m?.[2]} state.`);
  }
  return {
    sessionId,
    stats: { numTurns: 1 + calls, durationMs: 0, costUsd: 0, subtype: "success", isError: false, ok: true, transport: "fake" },
    advertised: [opts.tool.fullName],
  };
}
