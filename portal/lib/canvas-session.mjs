// portal/lib/canvas-session.mjs — hand-written canon (this repo; not generated). THE COMPOSE LOOP: one
// agent proposal per turn on the build canvas, inside the owner's loop (epic #295 ticket #312;
// docs/epics/canvas-design-import.architecture.md § Boundaries "The compose loop is server-sequenced,
// resume-per-turn", § Placement canvas-session.mjs, Addendum 2026-08-28 D3/D4; .claude/plans/
// canvas-compose-loop-312.md). Discovery's approach C one layer up: this module is the session, and
// ./canvas-transport.mjs is the one file that holds the SDK.
//
// EIGHT INVARIANTS:
//
//   1. STATICALLY SDK-FREE AND ZOD-FREE. Every static import here is a node built-in, system/, or a
//      portal/lib sibling group 8, 30 or 36 already imports in CI with no portal/node_modules. The
//      transport is reached by ONE dynamic import(), after every guard and inside the run lock; the
//      UXF_COMPOSE_TRANSPORT env seam (the journey's fake) picks that import's argument and adds no
//      second one. Build-checks 47.1 pins both halves.
//   2. DISK IS AUTHORITATIVE. The document is folded from build/ops.jsonl at every handler call, and
//      the session id is the LAST `init` line's in build/transcript.jsonl — never run.json's, which is
//      the discovery session's. A portal restart between turns resumes the same SDK session; a
//      `session-reset` line after that init (a resume that failed before its init) starts a fresh one.
//   3. ONE OPEN PROPOSAL AND ONE CALL PER TURN, IN CODE. LOOP tells the agent "one screen per turn";
//      openProposals refuses a turn while one waits for a verdict, and fileProposal refuses a second
//      call in the same turn. The sentence is made true by the handler, never trusted.
//   4. THE FENCE IS ONE PREDICATE (composeFenceDecision) CALLED FROM TWO SITES (PreToolUse and
//      canUseTool), failing closed: a throw inside the decision is a denial. Discovery's own
//      fenceDecision is NOT reused — it allows mcp__discovery__* by name (G3).
//   5. THE BRIEF IS THE OWNER'S TEXT, VERBATIM. It is written as a `source: "owner"` text line before
//      the turn's init, quoted into the prompt unchanged, never an op and never rewritten.
//   6. A REFUSAL IS A LINE, NEVER A RETRY. A vocabulary, applier or ids refusal writes an agent
//      `refused` ledger line plus a transcript line; one-per-turn, wrong-target, schema and not-covered
//      are transcript-only, because nothing was proposed that the ledger could restate. The handler
//      answers the agent `refused: …` and the turn is spent (the owner's Q6 is open; see the plan).
//   7. NO `Stop` HOOK. S6 took branch 1 (canvas-spike-s6/README.md Q2): the agent yields on its own.
//   8. WHAT THE FAKE CANNOT PROVE. tooling/fake-compose-agent.mjs drives the REAL handler and fence,
//      so the plumbing is proven at $0 — but whether a model yields, names the brief in its `why`, or
//      escapes an impossible screen is only observed on canvas-journey.mjs --live-compose.
//
// THE RECORD GATE (G5, #349). Under `tools: []` the CLI's warmup subagents hit this fence with
// built-ins (the probe saw Bash denied on 6 of 8 turns). A denial is written as a `denied` line only
// for an mcp__ tool or a RECORDED_BUILTINS name — tools no observed warmup calls — so a Write fed to
// the fence leaves its receipt while a warmup Glob or Bash is denied with no line. What this cannot
// see: a warmup agent that one day calls Write would be recorded as the agent's.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { applyOp, frameTree, missingStates, STATE_KEY_RE, STATE_KEYS } from "../../system/canvas-ops.mjs";
import { validateComposition } from "../../system/agentic-renderer.mjs";
import { appendAgentLine, foldLedger, loadBuild, openProposals, saveConflict } from "./canvas-store.mjs";
import { withRunLock } from "./builder.mjs";
import { allowsPath, isMcpToolName, READ_TOOLS } from "./discovery.mjs";
import { REPO_DIR } from "./env.mjs";

// ---- the prompt ------------------------------------------------------------------------------------
// COPIED BYTE FOR BYTE from .claude/plans/canvas-compose-loop-312-probe/probe.txt:36-43, the surface
// probe run 4 ran under. ROLE, LOOP, ESCAPE and TURN_ASK are S6's own (canvas-spike-s6/driver.txt:
// 312-316): a change to LOOP or ESCAPE re-opens S6 (47.2), and a change to any of the eight re-opens
// the probe (47.2b). S6's FORK_ASK (#320's) and YIELD_CONTRACT (branch 1 did not need it) do not ship.
export const ROLE = 'You compose screens for a product flow on a build canvas, from the PRD below, using only the vocabulary below.';
export const LOOP = 'The canvas works one screen per turn: each turn you propose one screen by calling `screen_compose` once, with a `why` naming the PRD decision (by seq) it serves and the reason. The owner accepts, edits or refuses it before the next turn starts.';
export const ESCAPE = 'If a part the screen needs is not in the vocabulary, compose without it and name the missing part in `why`. If the screen cannot be composed at all, reply with a line starting `NOT COVERED:` naming the missing part, and call nothing.';
export const TURN_ASK = 'Propose the next screen.';
export const BRIEF_LEAD = "The owner's brief for this turn, in their words:";
export const STATE_ASK = ({ frameId, screenId, stateKey }) => `Next: the ${stateKey} state of ${screenId} (${frameId}). Call \`state_add\` once with baseId "${frameId}", stateKey "${stateKey}", an override that sets or hides parts by the ids in the base screen below, and a \`why\` naming the PRD decision (by seq) it serves and the reason.`;
export const SCREEN_TOOL_DESCRIPTION = 'Propose one screen for the build canvas. screenId: a short slug naming the screen. why: one sentence naming the PRD decision (by seq) it serves and the reason. composition: one node tree from the vocabulary. decisionRefs: optional list of seq references.' + ' Give every part an id (a short slug) so a later state can address it.' + ' decisionRefs is required here: the seq(s) your why names, as strings ("7"), or [] if none.' + ' states: optional list of extra state keys this screen needs beyond the five-state floor, kebab-case (e.g. close-match) — declare only states the PRD names.';
export const STATE_TOOL_DESCRIPTION = "Propose one missing state of a screen already on the canvas. baseId: the screen's frame id. stateKey: the state asked for. override: { set: { partId: { prop: value } }, hide: [partId] } naming parts by their ids. why: one sentence naming the PRD decision (by seq) it serves and the reason.";

export const MODEL = "claude-sonnet-5";
// num_turns is 1 plus the number of tool calls: a clean turn is 2, and a turn whose second call the
// handler refuses is 3. 4 leaves one spare, and a turn that hits it is `failed`, never a retry.
export const MAX_TURNS = 4;
export const MCP_SERVER = "canvas";
export const SCREEN_TOOL = "screen_compose";
export const STATE_TOOL = "state_add";
export const toolNameFor = (t) => `mcp__${MCP_SERVER}__${t}`;
// F2 (PR #460): a marker at line start after numbering or markup, never mid-sentence.
export const ESCAPE_RE = /^[^A-Za-z\n]*NOT COVERED:/m;
export const RECORDED_BUILTINS = Object.freeze(["Write", "Edit", "WebSearch", "WebFetch"]);
export const TRANSCRIPT_FILE = "transcript.jsonl";
export const BRIEF_MAX = 500;
export const VOCAB_PATH = path.join(REPO_DIR, "handoff/verdant/vocabulary.json");

const sha16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// The env the CLI child runs under (canvas-transport.mjs passes it as query()'s `env`): this process's,
// minus every ANTHROPIC_* and CLAUDE_CODE_USE_* name. The SDK builds the child's env as
// `{ ...options.env ?? process.env }`, so a key exported in the shell sent probe run 1 to an unfunded API
// account; ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL and CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY redirect
// billing the same way (PR #485 review F1). Without them the CLI's own subscription login applies
// (CLAUDE_CODE_OAUTH_TOKEN passes through when set). Here rather than in the transport so group 47 can
// drive it in CI. A copy; process.env is never mutated.
export function subscriptionEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !k.startsWith("ANTHROPIC_") && !k.startsWith("CLAUDE_CODE_USE_")));
}

// driver.txt:69-87, verbatim: one block per component in the file's key order. Generated at every
// turn from vocabulary.json, never hand-authored — a new spec reaches the agent with no edit here.
export function vocabContext(vocab, vocabSha) {
  const firstSentence = (u = '') => {
    const cut = u.search(/\.\s|\n/);
    return (cut >= 0 ? u.slice(0, cut + 1) : u).trim().slice(0, 160);
  };
  const blocks = Object.entries(vocab.components).map(([name, c]) => {
    const props = Object.entries(c.props).map(([p, s]) =>
      `  ${p}${s.required ? '!' : ''}: ${s.enum ? `enum ${s.enum.join('|')}` : s.type}`);
    const kids = c.children.length ? `${c.children.join(', ')}${c.childrenCardinality === 'many' ? ' (many)' : ' (one)'}` : 'none';
    return [`### ${name}`, ...props, `  children: ${kids}`, `  ${firstSentence(c.usage)}`].join('\n');
  });
  return [
    `Generated from ${vocab.generatedFrom} (vocabulary.json sha256 ${vocabSha}). \`!\` marks a required prop.`,
    `Shape: ${vocab.composition.shape}`,
    `Children: ${vocab.composition.childrenRule}`,
    '',
    ...blocks,
  ].join('\n');
}

export function buildSystemPrompt({ vocab, vocabSha, prd }) {
  return [ROLE, LOOP, ESCAPE, "", "## Vocabulary", "", vocabContext(vocab, vocabSha), "", "## PRD", "", prd].join("\n");
}

const baseFrames = (doc) => (doc?.frames ?? []).filter((f) => f && f.baseId == null);

export function turnPrompt({ doc, ask, brief = null }) {
  const bases = baseFrames(doc);
  const holds = bases.length ? bases.map((f) => `${f.screenId} — ${f.why}`).join("\n") : "nothing yet";
  let s = `The canvas holds:\n${holds}`;
  if (brief !== null) s += `\n\n${BRIEF_LEAD}\n"${brief}"`;
  if (ask.kind === "screen") return `${s}\n\n${TURN_ASK}`;
  const base = doc.frames.find((f) => f.id === ask.baseId);
  return `${s}\n\n${STATE_ASK({ frameId: ask.baseId, screenId: base?.screenId ?? ask.baseId, stateKey: ask.stateKey })}\n\nThe base screen:\n${JSON.stringify(frameTree(doc, ask.baseId).tree, null, 2)}`;
}

// The prompt surface's fingerprint, carried on every stats line; 47.2b pins it to probe run 4's.
export const promptFingerprint = () => sha16([ROLE, LOOP, ESCAPE, TURN_ASK, STATE_ASK({ frameId: "f0", screenId: "s", stateKey: "error" }), BRIEF_LEAD, SCREEN_TOOL_DESCRIPTION, STATE_TOOL_DESCRIPTION].join("\n"));

// ---- build/transcript.jsonl ------------------------------------------------------------------------
// NOT the package's transcript.jsonl (G4, the owner's call): writing there would give a stand-in a
// transcript, loadDecisions would stop answering null, and the page would silently stop flagging it.

const txPath = (pkgRoot) => path.join(pkgRoot, "build", TRANSCRIPT_FILE);

export function readComposeTranscript(pkgRoot) {
  const file = txPath(pkgRoot);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").flatMap((text, i) => {
    if (!text.trim()) return [];
    try { return [JSON.parse(text)]; }
    catch (e) { throw new Error(`canvas-session: ${file} line ${i + 1} is not JSON — ${e.message}`); }
  });
}

// Append-only; stamps `ts`. Returns the line as written.
export function appendComposeLine(pkgRoot, line) {
  const { type, ...rest } = line;
  const written = { type, ts: new Date().toISOString(), ...rest };
  mkdirSync(path.join(pkgRoot, "build"), { recursive: true });
  appendFileSync(txPath(pkgRoot), `${JSON.stringify(written)}\n`);
  return written;
}

export const FENCE_SITES = Object.freeze(["PreToolUse", "canUseTool", "PostToolUseFailure"]);
export const REFUSAL_KINDS = Object.freeze(["vocabulary", "applier", "ids", "one-per-turn", "wrong-target", "not-covered", "schema"]);
// The kinds that write an agent `refused` ledger line (invariant 6); every other kind is transcript-only.
export const LEDGER_KINDS = Object.freeze(["vocabulary", "applier", "ids"]);

// The only constructors of their line types.
export const turnLine = ({ turn, ask, briefed }) => ({ type: "turn", turn, ask, briefed });
export const briefLine = ({ turn, text }) => ({ type: "text", source: "owner", turn, text });
export const agentText = ({ turn, text }) => ({ type: "text", source: "agent", turn, text });
export const initLine = ({ turn, sessionId, model, tools }) => ({ type: "init", turn, sessionId, model: model ?? null, tools: tools ?? null });
export const opLine = ({ turn, seq, tool, args, status }) => ({ type: "op", turn, seq: seq ?? null, tool, args, status });
export const deniedLine = ({ turn, tool, input, error, via }) => {
  if (!FENCE_SITES.includes(via)) throw new Error(`canvas-session: deniedLine needs "via", one of ${FENCE_SITES.join(" · ")} (got ${JSON.stringify(via)})`);
  return { type: "denied", turn, tool: tool ?? null, input: input ?? null, error, via };
};
export const refusedLine = ({ turn, kind, seq = null, error = null, text = null }) => {
  if (!REFUSAL_KINDS.includes(kind)) throw new Error(`canvas-session: refusedLine kind ${JSON.stringify(kind)} is not one of ${REFUSAL_KINDS.join(" · ")}`);
  return { type: "refused", turn, kind, ...(seq !== null && { seq }), ...(error !== null && { error }), ...(text !== null && { text }) };
};
export const statsLine = ({ turn, ...stats }) => ({ type: "stats", turn, ...stats });
export const sessionResetLine = ({ turn, sessionId, error }) => ({ type: "session-reset", turn, sessionId, error: error ?? null });

const nextTurnId = (lines) => `c${1 + lines.filter((l) => l?.type === "turn").length}`;
// The last `init` line's session id, unless a `session-reset` line came after it (PR #485 review F5).
export const lastSessionId = (lines) => lines.reduce((id, l) => (l?.type === "init" && typeof l.sessionId === "string" ? l.sessionId : l?.type === "session-reset" ? null : id), null);

// ---- the fence -------------------------------------------------------------------------------------

// The read allow-set: the package (its prd.md is the brief) and the vocabulary. Nothing else.
export function composeAllowSet(pkgRoot) {
  return Object.freeze({ root: path.resolve(pkgRoot), paths: Object.freeze([path.resolve(pkgRoot), VOCAB_PATH]) });
}

// THE PREDICATE. Pure; junk in any argument is a denial, never a throw of its own.
export function composeFenceDecision(allowSet, tool, input, ownTools) {
  const own = Array.isArray(ownTools) ? ownTools : [];
  if (typeof tool === "string" && own.includes(tool)) return { allow: true, reason: `${tool} is this compose turn's tool` };
  if (typeof tool === "string" && Object.hasOwn(READ_TOOLS, tool)) {
    const named = input && typeof input === "object" ? input[READ_TOOLS[tool]] : undefined;
    return allowsPath(allowSet, named ?? (tool === "Read" ? undefined : "."));
  }
  return { allow: false, reason: `${tool} is not this compose turn's tool (${own.join(", ")}) — a compose turn has no write, web or other MCP tool, and Read is fenced to the run package and vocabulary.json` };
}

// The two call sites over one private site(): `{ canUseTool, hooks }`, hooks in the SDK's shape with
// no SDK import, so group 47 runs them in CI.
export function composeFence({ pkgRoot, turn, ownTools, onLine = null, allowSet = composeAllowSet(pkgRoot) }) {
  const record = (line) => {
    try { const written = appendComposeLine(pkgRoot, line); onLine?.(written); }
    catch (e) { process.stderr.write(`canvas-session: fence record error (non-fatal): ${e.message}\n`); }
  };
  const isRecorded = (tool) => isMcpToolName(tool) || RECORDED_BUILTINS.includes(tool);
  const isOwn = (tool) => Array.isArray(ownTools) && ownTools.includes(tool);
  const decide = (tool, input) => {
    try { return composeFenceDecision(allowSet, tool, input, ownTools); }
    catch (e) { return { allow: false, reason: `the fence could not evaluate ${String(tool)} (${e.message}) — denied, fail closed` }; }
  };
  const deny = (via, tool, input, reason) => {
    if (isRecorded(tool)) record(deniedLine({ turn, tool, input, error: reason, via }));
    return reason;
  };
  return {
    canUseTool: async (tool, input) => {
      const d = decide(tool, input);
      if (d.allow) return { behavior: "allow", updatedInput: input };
      return { behavior: "deny", message: deny("canUseTool", tool, input, d.reason) };
    },
    hooks: {
      PreToolUse: [{ hooks: [async (input) => {
        const tool = input?.tool_name;
        const d = decide(tool, input?.tool_input);
        if (d.allow) return { continue: true };
        return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: deny("PreToolUse", tool, input?.tool_input, d.reason) } };
      }] }],
      // A handler refusal also fires this event (probe runs 2 and 3), and the handler has already
      // written its line — so only a SCHEMA-layer refusal, which never reached the handler, is recorded
      // here (G6). Always { continue: true }: a recording hook never alters the run it observes.
      PostToolUseFailure: [{ hooks: [async (input) => {
        const error = String(input?.error ?? JSON.stringify(input?.tool_response ?? null));
        if (isOwn(input?.tool_name) && /-32602|Input validation error/.test(error)) record(refusedLine({ turn, kind: "schema", error }));
        return { continue: true };
      }] }],
    },
  };
}

// ---- the handler core ------------------------------------------------------------------------------

// Every node BELOW THE ROOT carries a non-empty string id, no id repeats, and none holds "/" (#315, D4). The root is exempt: a root
// is never hidden (frameTree flags hide-root), so a state addresses children (probe runs 2-4, Q1).
function idProblem(tree, at = "composition") {
  const seen = new Set();
  const walk = (n, p) => {
    if (!n || typeof n !== "object") return `${p} is not a node`;
    if (p !== at && (typeof n.id !== "string" || !n.id.trim())) return `${p} (${n.name}) has no id`;
    if (typeof n.id === "string") { if (seen.has(n.id)) return `${p} (${n.name}) repeats id "${n.id}"`; seen.add(n.id); }
    if (typeof n.id === "string" && n.id.includes("/")) return `${p} (${n.name}) id "${n.id}" — "/" is reserved: a placed copy's parts are named <copy>/<part> (#315)`;
    for (const [i, c] of (Array.isArray(n.children) ? n.children : []).entries()) { const e = walk(c, `${p}.children[${i}]`); if (e) return e; }
    return null;
  };
  return walk(tree, at);
}

const readDoc = (pkgRoot) => foldLedger(loadBuild(path.join(pkgRoot, "build"))?.ops ?? []).doc;

// fileProposal(ctx, tool, args) → an MCP tool result. NEVER THROWS. `ctx` is
// { pkgRoot, turn, ask, vocab, calls: [], onLine?, now? }; `tool` is SCREEN_TOOL or STATE_TOOL.
export function fileProposal(ctx, tool, args) {
  const write = (line) => {
    const written = appendComposeLine(ctx.pkgRoot, line);
    try { ctx.onLine?.(written); } catch (e) { process.stderr.write(`canvas-session: listener error (non-fatal): ${e.message}\n`); }
  };
  const answer = (text) => ({ content: [{ type: "text", text }] });
  const refuse = (kind, error, op = null, params = null) => {
    try {
      if (LEDGER_KINDS.includes(kind) && op) {
        const { seq } = appendAgentLine(ctx.pkgRoot, { op, params, status: "refused" }, ctx.now ? { now: ctx.now } : {});
        write(refusedLine({ turn: ctx.turn, kind, seq, error }));
        write(opLine({ turn: ctx.turn, seq, tool, args, status: "refused" }));
      } else {
        write(refusedLine({ turn: ctx.turn, kind, error }));
      }
    } catch (e) { process.stderr.write(`canvas-session: could not record a ${kind} refusal: ${e.message}\n`); }
    return { isError: true, content: [{ type: "text", text: `refused: ${error}` }] };
  };
  const a = args && typeof args === "object" ? args : {};
  try {
    ctx.calls.push(structuredClone(a));
    if (ctx.calls.length > 1) return refuse("one-per-turn", "this turn already made its one proposal call — the owner decides before the next turn (LOOP)");
    const want = ctx.ask.kind === "screen" ? SCREEN_TOOL : STATE_TOOL;
    if (tool !== want) return refuse("wrong-target", `this turn asks for ${want}, not ${tool}`);
    const doc = readDoc(ctx.pkgRoot);

    if (tool === SCREEN_TOOL) {
      const op = "screen.compose";
      const params = Object.fromEntries(Object.entries({ screenId: a.screenId, why: a.why, composition: a.composition, decisionRefs: a.decisionRefs, states: a.states }).filter(([, v]) => v !== undefined));
      try { validateComposition(ctx.vocab, params.composition); } catch (e) { return refuse("vocabulary", e.message, op, params); }
      const idp = idProblem(params.composition);
      if (idp) return refuse("ids", `${idp} — every part below the root needs an id so its states can address it`, op, params);
      try { applyOp(doc, { op, params }); } catch (e) { return refuse("applier", e.message, op, params); }
      const { seq } = appendAgentLine(ctx.pkgRoot, { op, params, status: "proposed" }, ctx.now ? { now: ctx.now } : {});
      write(opLine({ turn: ctx.turn, seq, tool, args: a, status: "proposed" }));
      return answer(`filed seq ${seq}: ${op} "${params.screenId}" (proposed — the owner decides)`);
    }

    const op = "state.add";
    if (a.baseId !== ctx.ask.baseId || a.stateKey !== ctx.ask.stateKey) {
      return refuse("wrong-target", `this turn asks for the ${ctx.ask.stateKey} state of ${ctx.ask.baseId}, not ${JSON.stringify(a.stateKey)} of ${JSON.stringify(a.baseId)}`);
    }
    // `why` is kept aside: state.add has no why param, and the op grammar is unchanged (Q2, the owner's
    // call) — the reason lives on the transcript's op line.
    const params = { baseId: a.baseId, stateKey: a.stateKey, override: a.override };
    if (a.override && typeof a.override === "object" && a.override.add !== undefined) {
      return refuse("applier", "override.add is not rendered yet — frameTree flags it and ignores it, so the state would render identical to its base (G19)", op, params);
    }
    if (typeof a.why !== "string" || !a.why.trim()) {
      return refuse("applier", `state_add: "why" must be one sentence naming the decision and the reason — a state nobody can judge is refused (D4)`, op, params);
    }
    let next;
    try { next = applyOp(doc, { op, params }); } catch (e) { return refuse("applier", e.message, op, params); }
    const newId = next.frames.at(-1).id;
    const t = frameTree(next, newId);
    const dangling = t.flags.find((f) => /^dangling/.test(f.kind));
    if (dangling) return refuse("applier", `the override names part "${dangling.partId}", which ${a.baseId} does not have — a state addresses its base's parts by id`, op, params);
    try { validateComposition(ctx.vocab, t.tree); } catch (e) { return refuse("vocabulary", e.message, op, params); }
    const { seq } = appendAgentLine(ctx.pkgRoot, { op, params, status: "proposed" }, ctx.now ? { now: ctx.now } : {});
    write(opLine({ turn: ctx.turn, seq, tool, args: a, status: "proposed" }));
    return answer(`filed seq ${seq}: ${op} "${a.stateKey} of ${a.baseId}" (proposed — the owner decides)`);
  } catch (e) {
    // The store refused (a disk error, or appendAgentLine's own check): recorded as the applier's layer,
    // because the ledger is what said no.
    return refuse("applier", e.message);
  }
}

// ---- the outcome and the view ------------------------------------------------------------------------

// THE OUTCOME COMES FROM THE LINES, NEVER THE AGENT'S WORDS (probe run 2 T1 claimed a proposal its
// handler had refused twice). `stats` is the transport's; a turn that did not end ok is `failed`.
export function classifyComposeTurn(lines, stats = undefined) {
  const list = Array.isArray(lines) ? lines : [];
  if (stats !== undefined && !(stats && stats.ok === true)) return "failed";
  if (list.some((l) => l?.type === "op" && l.status === "proposed")) return "proposed";
  if (list.some((l) => l?.type === "refused" && ["vocabulary", "applier", "ids", "wrong-target", "schema"].includes(l.kind))) return "refused";
  if (list.some((l) => l?.type === "text" && l.source === "agent" && typeof l.text === "string" && ESCAPE_RE.test(l.text))) return "escape";
  return "empty-yield";
}

// composeView(pkgRoot) → { open, last, turns } — what the page shows. Total over a package with no
// build/transcript.jsonl.
export function composeView(pkgRoot) {
  const ops = loadBuild(path.join(pkgRoot, "build"))?.ops ?? [];
  const tx = readComposeTranscript(pkgRoot);
  const o = openProposals(ops)[0] ?? null;
  let open = null;
  if (o) {
    const line = tx.find((l) => l.type === "op" && l.status === "proposed" && l.seq === o.seq);
    const turn = line?.turn ?? null;
    const owner = tx.find((l) => l.type === "text" && l.source === "owner" && l.turn === turn);
    open = {
      seq: o.seq, op: o.op, params: o.params, turn,
      why: o.op === "state.add" ? (line?.args?.why ?? null) : (o.params?.why ?? null),
      brief: owner ? owner.text : null,
    };
  }
  const turnLines = tx.filter((l) => l.type === "turn");
  if (!turnLines.length) return { open, last: null, turns: 0 };
  const lt = turnLines.at(-1);
  const of = tx.filter((l) => l.turn === lt.turn);
  const stats = of.find((l) => l.type === "stats");
  const refusal = of.find((l) => l.type === "refused" && l.kind !== "one-per-turn");
  const last = { turn: lt.turn, outcome: stats?.outcome ?? "failed", briefed: lt.briefed === true };
  if (!stats) last.error = "the turn did not finish — no stats line was written";
  else if (stats.outcome === "failed") last.error = stats.error ?? stats.result ?? "the SDK reported an error";
  else if (stats.outcome === "refused") last.error = refusal?.error ?? null;
  else if (stats.outcome === "escape") last.text = refusal?.text ?? null;
  return { open, last, turns: turnLines.length };
}

// ---- the turn --------------------------------------------------------------------------------------

// The route runs this same rule for its 400. `brief` is stored verbatim; only its trimmed length is judged.
export function checkComposeRequest({ ask, brief } = {}) {
  const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!plain(ask)) throw new Error("canvas-session: ask must be { kind: \"screen\" } or { kind: \"state\", baseId, stateKey }");
  const keys = Object.keys(ask).sort().join(",");
  if (ask.kind === "screen") {
    if (keys !== "kind") throw new Error(`canvas-session: a screen ask carries kind alone (got ${keys})`);
  } else if (ask.kind === "state") {
    if (keys !== "baseId,kind,stateKey") throw new Error(`canvas-session: a state ask carries kind, baseId and stateKey exactly (got ${keys})`);
    if (typeof ask.baseId !== "string" || !ask.baseId) throw new Error("canvas-session: a state ask's baseId must name a frame");
    // A shape check only (#316): a declared state is a kebab key; whether THIS base misses it is runComposeTurn's check.
    if (!STATE_KEYS.includes(ask.stateKey) && !(typeof ask.stateKey === "string" && STATE_KEY_RE.test(ask.stateKey))) throw new Error(`canvas-session: stateKey ${JSON.stringify(ask.stateKey)} is not one of ${STATE_KEYS.join(" · ")} or a declared state's kebab-case key`);
  } else {
    throw new Error(`canvas-session: ask.kind ${JSON.stringify(ask.kind)} is not screen or state`);
  }
  if (brief !== null && (typeof brief !== "string" || brief.trim().length < 1 || brief.trim().length > BRIEF_MAX)) {
    throw new Error(`canvas-session: brief must be null or 1–${BRIEF_MAX} characters of the owner's words (send null for no brief)`);
  }
  return true;
}

// The three refusals the owner reads, as data; anything else is a thrown error. The route and the
// page share this one mapping.
export function composeRefusal(message) {
  const m = String(message ?? "");
  if (m.includes("already in flight")) return { kind: "busy", message: m };
  if (m.includes("is waiting for your verdict")) return { kind: "open-proposal", message: m };
  if (m.includes("has no prd.md")) return { kind: "no-prd", message: m };
  return null;
}

// ONE dynamic import, its argument picked by the env seam (invariant 1).
const loadTransport = () => import(process.env.UXF_COMPOSE_TRANSPORT ? pathToFileURL(path.resolve(process.env.UXF_COMPOSE_TRANSPORT)).href : "./canvas-transport.mjs");

export async function runComposeTurn({ pkgRoot, base, ask, brief = null, transport = null, now } = {}) {
  checkComposeRequest({ ask, brief });
  if (!existsSync(path.join(pkgRoot, "prd.md"))) {
    throw new Error("canvas-session: this package has no prd.md — a compose turn reads the PRD or the labelled stand-in brief");
  }
  return withRunLock(async () => {
    const buildRoot = path.join(pkgRoot, "build");
    const conflict = saveConflict(buildRoot, base);
    if (conflict) throw new Error(conflict);
    const ops = loadBuild(buildRoot)?.ops ?? [];
    const open = openProposals(ops)[0];
    if (open) {
      const what = open.op === "state.add" ? `${open.params?.stateKey} of ${open.params?.baseId}` : open.params?.screenId;
      throw new Error(`canvas-session: seq ${open.seq} (${open.op} ${what}) is waiting for your verdict — accept or refuse it first (LOOP)`);
    }
    const doc = foldLedger(ops).doc;
    if (ask.kind === "state") {
      const miss = missingStates(doc).find((m) => m.frameId === ask.baseId);
      if (!miss?.missing.includes(ask.stateKey)) throw new Error(`canvas-session: ${ask.baseId} is not missing its ${ask.stateKey} state — the ask names a base screen and a state missingStates lists for it`);
    }

    // Loaded BEFORE the first append (PR #485 review F6): a transport that refuses this package (the fake's
    // scratch-only guard, `assertCwd`) refuses before the turn's owner lines are on disk.
    let composeQuery = transport;
    if (!composeQuery) {
      const mod = await loadTransport();
      mod.assertCwd?.(buildRoot);
      composeQuery = mod.composeQuery;
    }

    const before = readComposeTranscript(pkgRoot);
    const turn = nextTurnId(before);
    const resume = lastSessionId(before);
    appendComposeLine(pkgRoot, turnLine({ turn, ask, briefed: brief !== null }));
    if (brief !== null) appendComposeLine(pkgRoot, briefLine({ turn, text: brief }));

    const vocabBytes = readFileSync(VOCAB_PATH);
    const vocab = JSON.parse(vocabBytes);
    const vocabSha = sha16(vocabBytes);
    const prd = readFileSync(path.join(pkgRoot, "prd.md"), "utf8");
    const name = ask.kind === "screen" ? SCREEN_TOOL : STATE_TOOL;
    const fullName = toolNameFor(name);
    const ctx = { pkgRoot, turn, ask, vocab, calls: [], now };

    let stats = null;
    let error = null;
    try {
      const out = await composeQuery({
        systemPrompt: buildSystemPrompt({ vocab, vocabSha, prd }),
        prompt: turnPrompt({ doc, ask, brief }),
        cwd: buildRoot,
        resume: resume || undefined,
        model: MODEL,
        maxTurns: MAX_TURNS,
        tool: { name, fullName, description: name === SCREEN_TOOL ? SCREEN_TOOL_DESCRIPTION : STATE_TOOL_DESCRIPTION, handler: (args) => fileProposal(ctx, name, args) },
        ...composeFence({ pkgRoot, turn, ownTools: [fullName] }),
        onInit: ({ sessionId, model, tools }) => appendComposeLine(pkgRoot, initLine({ turn, sessionId, model, tools })),
        onText: (text) => appendComposeLine(pkgRoot, agentText({ turn, text })),
      });
      stats = out?.stats ?? null;
      if (!stats) error = "the transport returned no stats — the stream ended without a result";
    } catch (e) {
      error = e.message;
    }
    const lines = readComposeTranscript(pkgRoot).filter((l) => l.turn === turn);
    const outcome = classifyComposeTurn(lines, stats ?? { ok: false });
    // A resumed turn that failed before any init line: the SDK session is taken to be gone (expected, not
    // observed: a resume the CLI cannot find fails before its init message). The next turn starts a
    // fresh session rather than failing on the same id forever (PR #485 review F5). A reset costs the
    // agent its conversation memory, never the document: every prompt carries the folded doc.
    if (resume && outcome === "failed" && !lines.some((l) => l.type === "init")) {
      appendComposeLine(pkgRoot, sessionResetLine({ turn, sessionId: resume, error }));
    }
    if (outcome === "escape") {
      const text = lines.find((l) => l.type === "text" && l.source === "agent" && ESCAPE_RE.test(l.text)).text;
      appendComposeLine(pkgRoot, refusedLine({ turn, kind: "not-covered", text }));
    }
    appendComposeLine(pkgRoot, statsLine({
      turn, ...(stats ?? {}), maxTurns: MAX_TURNS, outcome, ...(error !== null && { error }),
      promptFingerprint: promptFingerprint(), vocabSha, model: MODEL,
    }));
    // `added` is the ledger lines THIS turn wrote (each op line with a seq). The page checks
    // count === its base + added; anything else means another tab saved during the turn (PR #485 review F4).
    const added = lines.filter((l) => l.type === "op" && l.seq !== null).length;
    return { count: loadBuild(buildRoot)?.ops.length ?? 0, added, outcome, view: composeView(pkgRoot) };
  }, "a compose turn");
}

