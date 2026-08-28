# Feature: Spike 1 — op transport: in-process SDK tool vs the fenced CLI shape (#280)

The following plan should be complete, but validate documentation and codebase patterns and task sanity
before you start. Pay attention to the naming of existing utils and the import paths.

**This is a spike, not a feature.** It exists to remove one unknown and post a verdict that every later
ticket in epic #279 (and the canvas epic's #311/#312/#313) inherits. Read `## OPEN QUESTIONS` and
`## NOTES` before Task 3 — Task 5 is a decision gate and the tasks after it branch on it.

## Feature Description

Decide how a discovery op reaches its applier: through an **in-process SDK tool**
(`createSdkMcpServer` + `tool`, the agent calls `mcp__<server>__<tool>` and a JS handler in the portal
process runs), or through the **proven CLI shape** (`tooling/board-op.mjs` behind a fenced `Bash`, the
agent types `node <cli> '<op json>'` and the CLI reads the answer store off disk).

One stub tool with three parameters, one cheap dry run against a stub bank, a verdict written from the
observed output, and — if the tool path wins — the dependency amendment in CLAUDE.md and
`portal/package.json`. Nothing else ships.

## User Story

As **the planner of the spine ticket (#284)**
I want **an observed answer to "does an in-process SDK tool work end to end at SDK 0.1.77, and what does
its schema require"**
So that **`answer_ref` resolution is designed once — inside the session or off disk — and no later ticket
has to guess.**

## Problem Statement

The architecture doc (`docs/epics/discovery-partner.architecture.md:96`) leaves exactly one library call
open: op transport. The in-process tool is the better fit for an interactive loop (no subprocess per
answer, no shell quoting of free prose — the `board-op.mjs:#226` bug class — and it can resolve
`answer_ref` in the session), but no recorder in this repo has ever used `createSdkMcpServer`, and
`tool()` takes a Zod schema while `zod` is only a **peer** dependency of the SDK. Spike C proved the SDK
reaches an *external* MCP in process (`.claude/plans/design-import-spike-c/README.md` Q3); that is the
MCP read, not an in-process op write, so it does not settle this.

## Solution Statement

A throwaway script in `.claude/plans/discovery-spike-1-op-transport/` (spike C's shape) builds one
in-process MCP server carrying one stub tool, `record_stub(question_id, answer_ref, level)`, whose handler
is a closure over a stub bank and a stub answer store. It runs in two stages:

1. **Pre-flight, zero tokens, deterministic.** The bundled `McpServer`'s own `tools/list` and `tools/call`
   handlers are called directly in-process. This settles *what the schema requires* (the portal's zod
   raw shape → the advertised JSON schema, cross-copy) and the refusal semantics (`null`, a bad
   `answer_ref`, an out-of-enum value, a missing field) **without the model**. Observed already during
   planning (2026-08-28) — see NOTES → "Two risks retired before the run".
2. **One `query()` run** with **no built-in tools** (`tools: []`) and **nothing pre-approved**
   (`allowedTools: []`), asking the agent for three calls: one that files, one with an unresolvable
   `answer_ref` (the handler refuses and the agent must quote it), one outside the enum (informational —
   what the agent sees when the schema layer refuses). This stage proves only what the pre-flight cannot:
   the transport to the CLI process, the fence call sites, and that a refusal reaches the agent mid-turn.

The script prints a verdict object whose rows are computed from what happened, not from reasoning. The
decision rule from the architecture doc is then applied mechanically and the verdict is posted on epic
#279.

## Out of Scope / Non-Goals

- Not building `discovery/ops.mjs`, the four real ops, or any applier — that is #281. The stub tool is
  named `record_stub` and lives only in the spike script, so it cannot be mistaken for a vocabulary entry.
- Not changing `system/board-ops.mjs` or `tooling/board-op.mjs` — the CLI fallback is already proven by
  #203's real run and needs no re-run.
- Not building the transport module #284 will ship (`portal/lib/discovery.mjs`); the verdict tells #284
  which shape to build, with the observed gotchas.
- Not a real run, not a trace, not a run package — nothing under `traces/`, `replay/`, `discovery/`.
- Not touching `system/` or `agent-layer/` (the loc-summary tripwire in the epic's "Every ticket
  carries" table stays unfired — assert it in Task 12).

## Feature Metadata

**Feature Type**: Spike (decision) + a conditional one-line dependency amendment
**Estimated Complexity**: Low in code (~120 lines of throwaway script), Medium in consequence (every later
ticket inherits the answer)
**Primary Systems Affected**: `portal/` (dependency declaration, if the tool path wins), `CLAUDE.md`,
`docs/epics/discovery-partner.architecture.md`
**Dependencies**: `@anthropic-ai/claude-agent-sdk@0.1.77` (installed); `zod@4.4.3` (installed as its peer,
undeclared); a Claude login on this Mac (`portal/.env` carries no `CLAUDE_CODE_OAUTH_TOKEN`, so the run
uses the CLI's own login, the same path every recorder here uses)

## Related Work

**Implements**: [#280](https://github.com/linardsb/ux-factory/issues/280) · **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` (§Stack & libraries → "Op transport is the one open library call"; §Spikes & experiments → 1; §For slicing → "Spike 1 posts its verdict to the epic before the spine is planned")

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/studio-replay-recorder-203.md` — Why: the previous spike 1 (epic #202); its NOTES table
  rejected in-process MCP tools "on risk" for a *batch* recorder — this spike retires exactly that risk
  for an *interactive* loop. Its verdict comment (`.claude/reports/spike-1-verdict.md`) is the shape this
  verdict copies.
- `.claude/plans/design-import-spike-c/` — Why: `spike-c-sdk-reach.mjs` is the `query()`-from-a-script
  precedent (package loaded through `portal/node_modules` by reading its `package.json`; two-place fence;
  init/assistant/result logging; a timeout killer). `README.md` is the write-up shape.
- `.claude/plans/canvas-spike-s1-substrate-load.md` — Why: the house shape for a spike plan (question →
  shape → decision rule → output → not in scope).

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #284 (the spine) — inherits the verdict; builds the transport for real.
- #287 (the read fence) — inherits the fence observations in bar rows B4/B5 (whether `canUseTool` and
  `PreToolUse` see an MCP tool call).
- Canvas epic #311 / #312 / #313 — inherit per the comment on #280 (2026-08-28).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs` (whole file, 60 lines) — Why: the script
  this one mirrors line for line: the `fromPortal`-style loader, `query()` options, the two-place fence,
  the message loop, the `VERDICT` print, the 170 s killer.
- `.claude/plans/design-import-spike-c/README.md` (Verdicts · Setup · Timings · Caveats · What was and was
  not done · Files) — Why: the write-up shape for Task 4.
- `.claude/reports/spike-1-verdict.md` (whole file) — Why: the verdict-comment shape for Task 10: ticket /
  epic / date / branch taken · answer · mechanism · bar table · run numbers · what the next ticket inherits
  · the question left open on purpose.
- `portal/lib/trace-recorder.mjs:130-171` — Why: the fence-runs-twice reasoning (`fenceHook`, the
  permission fast path) and the `query()` wiring the spike copies; the `PreToolUse` deny shape at line 158.
- `portal/record-build.mjs:1-33, 60-61, 189-222` — Why: the CLI shape (the fallback branch): `TOOLS`,
  `makeFence`, `parseOpCommand` shared by fence and projector, the "one tool call is one op" rule.
- `tooling/board-op.mjs:1-60` — Why: the CLI's contract and the #226 shell-quoting fix it carries.
- `portal/lib/chat.mjs` (whole file, 80 lines) — Why: the proven `query()` + `canUseTool` + `resume` shape.
- `portal/lib/env.mjs` — Why: `REPO_DIR`, `PORTAL_DIR`, `HAS_TOKEN`; the spike does not import it (it must
  run from `.claude/plans/`), but it copies the path convention.
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts:5-10, 19-30,
  48-82, 261-291, 395, 517` — Why: the typed surface: `AnyZodRawShape = ZodRawShape | Zod4RawShape`,
  `InferShape`, `CanUseTool`, `McpSdkServerConfig` / `McpSdkServerConfigWithInstance`,
  `SdkMcpToolDefinition { name, description, inputSchema, handler(args, extra) → Promise<CallToolResult> }`,
  `allowedTools`, `canUseTool`, `tools?: string[] | preset` (line 285: **"`[]` (empty array) — Disable all
  built-in tools"**), `mcpServers?: Record<string, McpServerConfig>`, `strictMcpConfig`.
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts` (57 lines) — Why:
  `tool<Schema extends AnyZodRawShape>(name, description, inputSchema, handler)` and
  `createSdkMcpServer({ name, version?, tools? })`; the comment "If your SDK MCP calls will run longer than
  60s, override CLAUDE_CODE_STREAM_CLOSE_TIMEOUT".
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:21288-21309` — Why: `tool()` only packs
  `{name, description, inputSchema, handler}`; `createSdkMcpServer` builds a bundled `McpServer` and calls
  `server.tool(...)` per definition; returns `{ type: 'sdk', name, instance }`.
- `sdk.mjs:21236-21243` (`getZodSchemaObject`), `16273-16284` (`objectFromShape` — mixes the caller's
  field schemas into the SDK's **bundled** zod object; throws on mixed v3/v4), `16326-16350`
  (`normalizeObjectSchema`), `20617-20630` (tools/list advertises `toJsonSchemaCompat(obj)`),
  `20697-20709` (`validateToolInput` → `safeParseAsync2` → `McpError InvalidParams "Input validation
  error: Invalid arguments for tool …"`) — Why: this is what "what does its schema actually require"
  means mechanically: a **raw shape whose values are zod schema instances** (any copy — detected by
  `_zod`/`_def`/`parse`), never a plain JSON-schema object (it would pass `getZodSchemaObject` unchanged
  and then fail in `safeParseAsync2` on the first call). The SDK bundles its own zod but does not export
  it, so the caller's `zod` is genuinely required — hence the peer dependency.
- `sdk.mjs:21385-21395` and `8415-8445` — Why: how an `{ type: 'sdk', instance }` server is kept in
  process and only its *name* is sent to the CLI (`setMcpServers`).
- `CLAUDE.md:150` ("the portal's sole dependency is `@anthropic-ai/claude-agent-sdk`") and `CLAUDE.md:153`
  ("**Types:** plain JavaScript — no TypeScript, no schema library") — Why: **two** lines the tool path
  touches, not one; the ticket names only the first. See Q1.
- `docs/epics/discovery-partner.architecture.md:96-105` (the transport bullet), `:326-334` (spike 1),
  `:396-402` (verdict-before-spine rule) — Why: the decision rule; inherited, not re-decided.
- `docs/epics/canvas-design-import.architecture.md:194-197, 333-335` — Why: says "#280's verdict, still
  unposted"; one word changes when it is posted.
- `tooling/drift-check.mjs:29-40` — Why: CI `verify` runs `node --check` over **every tracked `.mjs`,
  `.claude/plans/` included** (memory `drift-check-syntax-checks-parked-mjs`). The spike script must be a
  whole valid module; any fragment parks as `.txt`.

### New Files to Create

- `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs` — the spike script (Task 2)
- `.claude/plans/discovery-spike-1-op-transport/preflight.txt` — the zero-token stage's verbatim output
- `.claude/plans/discovery-spike-1-op-transport/run-1.txt` (and `run-2.txt` if re-run) — verbatim output
- `.claude/plans/discovery-spike-1-op-transport/README.md` — the write-up, spike C's shape (Task 4)
- `.claude/reports/discovery-spike-1-verdict-280.md` — the verdict comment body, posted to #279 (Task 10)
- `.claude/reports/discovery-spike-1-op-transport-280-report.md` — the implementation report (Task 11)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- The installed SDK's own typings (paths above) — the only documentation that is version-true for 0.1.77.
  Do not web-research a newer SDK's API; 0.1.77 is pinned in `portal/package.json` and the typings are on
  disk.
- `traces/README.md` — Why: not consumed here, but the transcript format #284 will write follows it; the
  spike's `seen.postToolUse` capture is the shape `kind: 'tool'` steps take.
- Memory `recorder-run-positive-framing` — Why: prompts to a recorder-style run are framed positively
  (numbered instructions), not as prohibitions; the spike prompt below follows it.

### Patterns to Follow

**Loading a portal package from `.claude/plans/`** (bare specifiers do not resolve there — spike C's loader,
generalised to two packages):

```js
async function fromPortal(name) {
  const dir = path.join(PORTAL, 'node_modules', name);
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const dot = pkg.exports?.['.'];
  const pick = (v) => (typeof v === 'string' ? v : v?.default ?? v?.import);
  const entry = (dot && pick(dot.import ?? dot.default)) ?? pkg.module ?? pkg.main;
  return import(pathToFileURL(path.join(dir, entry)).href);
}
```
Observed: the SDK has no `exports`, `main: "sdk.mjs"`; zod 4.4.3 has `exports['.'].import: "./index.js"`.

**The fence runs twice** (`trace-recorder.mjs:130-160`): the same predicate in `canUseTool` and a
fail-closed `PreToolUse` hook, because the permission fast path can skip `canUseTool`. The spike records
*which* of the two saw the MCP call — that is bar row B4, and #287 needs it.

**Refusal reaches the agent mid-turn** (`record-build.mjs` header, "denied while the run is still
going"): the handler returns `{ isError: true, content: [{ type: 'text', text }] }` naming what did not
resolve, so the agent can correct inside the turn. Never throw from the handler for a *refusal*; a throw is
for a bug.

**Honesty:** the spike prompt names the stub tool and the three calls and nothing else. No example op
output, no worked answer. The stub answer text is resolved by the *handler*, never typed by the agent —
the same answer-by-reference line the real design draws.

**Naming:** MCP tools surface as `mcp__<server>__<tool>` (observed in spike C: `mcp__brilliant__lookup`).
Server `discovery-spike`, tool `record_stub` → `mcp__discovery-spike__record_stub`.

---

## IMPLEMENTATION PLAN

### Phase 1: Set up and write the spike

**Tasks:** worktree + branch, `npm ci` in `portal/`, the script, `node --check`.

### Phase 2: Run it, once (twice at most)

**Depends on:** Phase 1.

One dry run; read the VERDICT block; if a *mechanism* failed (not a model whim), one fix and one re-run.
Timebox: one hour from the first run. Two runs is the budget before the decision rule's "does not work"
branch is taken as the answer.

### Phase 3: Decide and record

**Depends on:** Phase 2. **Branches** on the decision rule. Tool wins → Tasks 6–8. CLI wins → Task 9.
Either way → Tasks 10–13.

### Phase 4: Gates, report, PR

**Depends on:** Phase 3.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1 — CREATE the worktree and branch

- **IMPLEMENT**: from the main checkout:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  git fetch origin && git worktree add ../ux-factory-wt-280 -b spike/280-op-transport origin/main
  cd ../ux-factory-wt-280/portal && npm ci
  ```
- **PATTERN**: every ticket worktree in `git worktree list` is `../ux-factory-wt-<n>`; spike branches are
  `spike/<slug>` (`spike/design-import-foreign-component`). Memory `local-agent-visual-gate-notes`: a fresh
  worktree needs `npm ci` in `portal/`.
- **GOTCHA**: `npm ci` installs `zod` as the SDK's peer even though it is undeclared — that is the state
  the spike measures. Do not `npm install zod` yet; that is Task 6, and only on one branch of the rule.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory-wt-280/portal && node --input-type=module -e "
  const s = await import('@anthropic-ai/claude-agent-sdk'); const z = await import('zod');
  console.log(typeof s.createSdkMcpServer, typeof s.tool, typeof s.query, typeof z.z.object);"
  # expect: function function function function
  ```
- **SATISFIES**: precondition for AC #1.

### Task 2 — CREATE `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs`

- **IMPLEMENT**: the script below, verbatim in shape. It is a whole runnable module (CI `verify`
  `node --check`s it). One tool, three parameters, a stub bank, a stub answer store, a two-place fence, the
  message loop, the zero-token pre-flight (rows P1–P6, run first and always), and a VERDICT whose rows are
  computed from what happened.

  ```js
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
  ```

- **PATTERN**: `.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs` (loader, fence, loop, killer,
  `VERDICT` print); `portal/lib/trace-recorder.mjs:135-160` (the PreToolUse deny shape).
- **IMPORTS**: only `node:` built-ins statically; the SDK and zod are dynamic imports through
  `portal/node_modules` — the script must stay importable from `.claude/plans/` (no bare specifiers).
- **GOTCHA**: `tool()`'s schema argument is a **raw shape** (`{ field: zodSchema }`), not `z.object(...)`.
  `objectFromShape` (sdk.mjs:16273) wraps it in the SDK's bundled zod object and throws on mixed v3/v4
  values — all three fields come from the one portal `zod`, so they are all v4.
- **GOTCHA**: a refusal is a `{ isError: true, content }` *result*, never a throw — a throw is a bug, and
  the agent would see a generic error rather than the message it can act on.
- **GOTCHA**: `process.exitCode`, not `process.exit()`, after the `console.log` — a piped stdout can drop
  the VERDICT otherwise (record-build.mjs's own comment).
- **VALIDATE**: `node --check .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs`
  (exit 0) and `node tooling/drift-check.mjs` (its syntax sweep covers the new tracked file once staged;
  run it after `git add`).
- **SATISFIES**: AC #1 (the run exists), AC #4 (the stub is `record_stub`, no `discovery/` file, no
  `board-ops.mjs` change).

### Task 3 — RUN the spike (once; twice at most)

- **IMPLEMENT**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory-wt-280
  node .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs > .claude/plans/discovery-spike-1-op-transport/run-1.txt 2>&1; echo "exit=$?"; tail -60 .claude/plans/discovery-spike-1-op-transport/run-1.txt
  ```
  **Step 0, before any tokens:** `node … --preflight > preflight.txt 2>&1; echo "exit=$?"`. Expect
  `exit=0` and P1–P6 all `true`. Observed during planning (2026-08-28, this Mac, SDK 0.1.77, zod 4.4.3,
  node v20.20.2): the advertised schema is draft-07 with `question_id: anyOf [string, null]`,
  `level: enum` of four, `required` of three; `null` reaches the handler as JSON null; the bad ref returns
  the handler's `isError` text; the out-of-enum call returns `MCP error -32602: Input validation error:
  Invalid arguments for tool record_stub: … "code": "invalid_value" … Invalid option: expected one of …`
  before the handler; the missing field returns `invalid_type … expected string, received undefined`.
  If the pre-flight is red on this machine, that *is* a mechanism failure — fix it before spending a run.
  Then the full run, and read the `VERDICT` block. `works: true` (P1–P5 plus B1/B2/B3/B7 all `true`) is the
  tool path proven. B4/B5 tell #287 which fence call sites see an MCP call; B6 tells #284 whether
  `tools: []` really removes the built-ins; I1 is informational.
- **If a mechanism fails in the run** (the server not connected, the tool not visible, the handler never
  reached, the refusal text never quoted): fix the one thing the output names and re-run into
  `run-2.txt`. The likeliest fix: `tools: []` not honoured → `tools: ['Read']` and let the fence deny it.
  The pre-flight has already retired the schema-conversion failure class, so a run-time failure is
  transport or permission, not zod. **A model whim is not a mechanism failure**: if the agent refuses to
  send `level: "wrong"`, I1 reads "not exercised" and nothing depends on it; do not re-run for it.
- **After two runs without B1+B2+B3+B7 green**, stop: the decision rule's "does not work" branch is the
  answer, recorded with the observed failure verbatim.
- **GOTCHA**: cost is subscription-window (CLI login), ~$0.15–0.45-equivalent per run by the precedents
  (spike C $0.16 / 7.8 s; #203's dry run $0.45). Auth: the run prints nothing about auth; a 401-shaped
  error at init means `claude` is not logged in on this Mac — `claude setup-token` or the CLI login, then
  re-run; that re-run does not count against the two.
- **GOTCHA**: `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` only matters for handlers over 60 s; this one is
  instant. Note it for #284's transport header anyway.
- **VALIDATE**: `preflight.txt` ends `exit=0`; `grep -c '"works": true'
  .claude/plans/discovery-spike-1-op-transport/run-1.txt` → `1` on the tool branch; on the CLI branch the
  file carries the failure text and `exit=2`.
- **SATISFIES**: AC #1 — observed output, not reasoning.

### Task 4 — CREATE `.claude/plans/discovery-spike-1-op-transport/README.md`

- **IMPLEMENT**: spike C's shape, in this order: **Verdicts** table (Q1 works end to end? · Q2 what the
  schema requires · Q3 which fence call sites saw the call), each row citing `preflight.txt` /
  `run-1.txt` line ranges; the decision-rule outcome in one line; **Setup** (SDK 0.1.77, zod 4.4.3 from
  `versions`, node, auth path, `tools: []`, `allowedTools: []`); **The bar** as two tables — pre-flight
  P1–P6 (deterministic, no tokens) and run B1–B7 + I1 (PASS/FAIL/not exercised) — with the observed
  evidence per row; **Run numbers** (`num_turns`, `duration_ms`, `total_cost_usd`, elapsed); **The
  advertised schema** (the JSON from the pre-flight, verbatim, plus the `tool_use.input` the model sent
  for each call); **Caveats and bounds** (one run, one model, the pre-flight reads a private handler map,
  the 60 s note, that this is a stub tool and not the grammar); **What was and was not done**; **Files**.
- **PATTERN**: `.claude/plans/design-import-spike-c/README.md`.
- **GOTCHA**: every number is copied from `run-1.txt`, none typed from memory. British English, no slop
  (epic C2: `~/.claude/skills/_shared/slop-blacklist.md`).
- **VALIDATE**: `grep -c 'run-1.txt' .claude/plans/discovery-spike-1-op-transport/README.md` ≥ 3.
- **SATISFIES**: AC #1 (the evidence is on disk beside the script).

### Task 5 — DECIDE: apply the rule, mechanically

- **IMPLEMENT**: the rule from the architecture doc, not re-decided:
  - `works: true` **and** the zod peer dependency is acceptable → **in-process tool** → Tasks 6, 7, 8.
  - `works: false` after two runs, or the dependency is refused → **the `board-op.mjs` CLI shape**, with
    `answer_ref` resolved by the CLI reading the answer store off disk → Task 9.
  - "Acceptable" is pre-answered by the doc for the case it foresaw: the peer is already on disk at
    4.4.3, ships nothing (portal-only), and is confined to one transport file. Proceed on that reading and
    **flag Q1** (the second CLAUDE.md line) in the verdict for the owner to confirm at PR review — do not
    block on it.
- **VALIDATE**: the branch taken is written as the first line of the verdict (Task 10) with the bar rows
  that decided it.
- **SATISFIES**: AC #2 (the verdict has a branch).

### Task 6 — (tool branch) UPDATE `portal/package.json` + `portal/package-lock.json`

- **IMPLEMENT**: `cd portal && npm install zod@^4.4.3 --save` — declares the peer as a direct dependency
  at the version already resolved, so a fresh `npm ci` never depends on peer auto-install semantics.
- **GOTCHA**: the lock already holds `node_modules/zod@4.4.3` (line 321); the diff should be the
  `dependencies` entry in `package.json` and the root `packages[""].dependencies` in the lock — nothing
  else. If `npm install` bumps the SDK, revert that: the SDK stays at `^0.1.77` resolved 0.1.77.
- **VALIDATE**:
  ```bash
  cd portal && npm ls zod @anthropic-ai/claude-agent-sdk   # zod@4.4.3 as a direct dep, SDK 0.1.77
  git diff --stat -- portal/package.json portal/package-lock.json
  (npm start & sleep 2; curl -s 127.0.0.1:4747/api/health; kill %1)   # the portal still boots
  ```
- **SATISFIES**: AC #3.

### Task 7 — (tool branch) UPDATE `CLAUDE.md` — two lines, not one

- **IMPLEMENT**:
  - Line 150, replace the tail `— the portal's sole dependency is \`@anthropic-ai/claude-agent-sdk\`.` with
    `— the portal's dependencies are \`@anthropic-ai/claude-agent-sdk\` and its peer \`zod\`, the latter only
    to declare in-process tool schemas (spike #280); nothing else.`
  - Line 153, replace `no TypeScript, no schema library.` with `no TypeScript, no schema library for
    validation.` and append, after the `intake.mjs` citation: `The one \`zod\` use is the SDK's tool-schema
    adapter (#280); an applier and a boundary validator never import it.`
- **PATTERN**: CLAUDE.md is an index; the invariant's home is the transport module #284 writes, whose
  header will cite #280. Keep both edits to one sentence each.
- **GOTCHA**: the ticket names only line 150. Line 153 would read as contradicted by any `zod` import, so
  it is amended with a scoped exception rather than left to drift — and flagged as Q1 in the verdict.
- **VALIDATE**: `grep -n 'zod' CLAUDE.md` → exactly two hits, lines 150 and 153.
- **SATISFIES**: AC #3.

### Task 8 — (tool branch) UPDATE the two architecture docs, one sentence each

- **IMPLEMENT**:
  - `docs/epics/discovery-partner.architecture.md:96-105` — append to the bullet: `**Resolved <date>
    (#280): in-process tool — see the verdict on #279.**` and to §Spikes item 1 (line ~334) the same
    sentence.
  - `docs/epics/canvas-design-import.architecture.md:196` — `still unposted` → `posted <date>: the
    in-process tool`.
- **GOTCHA**: the verdict *body* lives in the #279 comment and the spike README; the docs get a pointer, not
  a second copy (the "one owner per invariant" rule).
- **VALIDATE**: `grep -n '#280' docs/epics/discovery-partner.architecture.md docs/epics/canvas-design-import.architecture.md`
  shows the three edited lines.
- **SATISFIES**: AC #2 (the verdict is findable from where the next planner reads).

### Task 9 — (CLI branch) UPDATE the same three doc sites with the CLI verdict

- **IMPLEMENT**: the same three sentences as Task 8, reading `the board-op.mjs CLI shape; answer_ref
  resolves off disk`. **No** `package.json` or CLAUDE.md change. The verdict (Task 10) additionally names
  what #284 must build: a `tooling/discovery-op.mjs` in `board-op.mjs`'s shape, `parseOpCommand` shared by
  fence and applier, `answer_ref` resolved by reading `answers.jsonl` from the run package directory, and
  the shell-quoting rule (`shellQuote`) carried over. That is a recommendation for #284's plan, not this
  ticket's code.
- **VALIDATE**: `git diff --stat main...HEAD -- portal/ CLAUDE.md` is empty.
- **SATISFIES**: AC #2, AC #3 (nothing to amend on this branch), AC #4.

### Task 10 — CREATE `.claude/reports/discovery-spike-1-verdict-280.md` and POST it to #279

- **IMPLEMENT**: the comment body in `.claude/reports/spike-1-verdict.md`'s shape:
  `# Spike 1 verdict — does an in-process SDK tool carry an op to the applier?` · **Ticket** #280 · **Epic**
  #279 · **Date** · **Branch taken: <in-process tool | CLI shape>** · **Answer** in one paragraph ·
  **The mechanism** · **The bar** (P1–P6 and B1–B7 + I1, PASS/FAIL/not exercised) · **Run numbers** ·
  **What #284 inherits** (`answer_ref` resolves *inside the session* through the handler's closure over the
  server-owned store | *off disk* through the CLI; the tool name #287's allow-list must carry; whether
  `canUseTool` was consulted for the MCP call — B4 — and therefore whether the PreToolUse hook is the
  fence's load-bearing half) · **What the schema requires** (raw shape of zod v4 instances from the
  caller's copy; `nullable()` → what the model sent; enum refusal text verbatim) · **Q1 for the owner**
  (CLAUDE.md:153) · **Left open on purpose** (the canvas epic's `screen.compose` uses the same transport
  — inherited, not re-run).
  Then:
  ```bash
  gh issue comment 279 --body-file .claude/reports/discovery-spike-1-verdict-280.md
  ```
- **PATTERN**: `.claude/reports/spike-1-verdict.md` (#203); its posting command is in
  `.claude/plans/studio-replay-recorder-203.md:490`.
- **GOTCHA**: the verdict goes on **#279** (AC #2), before #284 is planned — the PR body is not a
  substitute. Every number is copied from `run-1.txt`.
- **VALIDATE**: `gh issue view 279 --json comments --jq '.comments[-1].body' | head -3` shows the heading.
- **SATISFIES**: AC #2.

### Task 11 — CREATE `.claude/reports/discovery-spike-1-op-transport-280-report.md`

- **IMPLEMENT**: the implementation report (`/system-execution-report` shape, as
  `.claude/reports/floor-runner-parameterize-composition-spike1-report.md`): plan path, branch, status,
  summary, tasks completed with the files, gates run with observed results, deviations from this plan
  (there will be at least one: which of the two `tools`/schema fallbacks fired, if any), the spike verdict
  in one line with a link to the #279 comment.
- **VALIDATE**: file exists; `grep -c 'run-1.txt' …` ≥ 1.
- **SATISFIES**: the epic's "plan, report and review live in the same PR" rule.

### Task 12 — RUN the gates and the scope assertion

- **IMPLEMENT**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory-wt-280
  git add -A .claude/plans/discovery-spike-1-op-transport .claude/reports .claude/plans/discovery-spike-1-op-transport-280.md CLAUDE.md docs/epics portal/package.json portal/package-lock.json
  node tooling/drift-check.mjs        # syntax-checks the new .mjs; no generated-file drift expected
  node tooling/build-checks.mjs       # 27 groups, unchanged — run because CI runs it
  git diff --cached --stat | grep -E '^ (system|agent-layer|discovery|tooling|traces|replay)/' && echo 'SCOPE BREACH' || echo 'scope ok'
  ```
- **GOTCHA**: `drift-check` reads **tracked** files (`git ls-files`), so stage first. `.claude/plans/` `.mjs`
  files are in its sweep; a syntax error there is a red CI, not a local warning.
- **VALIDATE**: both gates print their final ✓ / pass line; `scope ok`.
- **SATISFIES**: AC #4; the epic's loc-summary tripwire row (nothing under `system/` or `agent-layer/`).

### Task 13 — COMMIT and open the PR

- **IMPLEMENT**: `/piv-commit` (one commit: `spike(280): op transport — <branch taken>; verdict on #279
  (architecture §Spikes 1)`), then `/piv-create-pr`. The PR body **must** carry `Closes #280` as a trailer
  and link the #279 comment. `/piv-review-pr` follows on the open PR; the review lands as
  `.claude/code-reviews/pr-<N>-review.md` in the same PR.
- **GOTCHA**: memory `shared-worktree-parallel-sessions` — verify `git branch --show-current` is
  `spike/280-op-transport` immediately before committing; stage by explicit path.
- **VALIDATE**: `gh pr view --json body --jq .body | grep -c 'Closes #280'` → 1.
- **SATISFIES**: the epic's `Closes #N` rule.

---

## TESTING STRATEGY

No suite (CLAUDE.md). "Done" = the surface touched ran:

### The pre-flight is the deterministic half
Zero tokens. The bundled `McpServer`'s own `tools/list` and `tools/call` handlers are called directly,
so P1–P6 (schema shape, in-process filing, `null`, bad ref, out-of-enum, missing field) are asserted
against real SDK code paths with no model in the loop. Observed green during planning; the implementing
run re-observes it on the worktree's own `node_modules`.

### The run is the other half
One real `query()` run whose rows are computed in-script from the SDK's own messages and hook inputs.
The rows that decide (B1, B2, B3, B7) cannot pass by construction: B2 requires the handler's closure to
have mutated `filed` in this pid during the run, B3 requires the refusal text to appear both in the tool
response *and* in the agent's text.

### The dependency amendment is smoke-tested
`npm ls`, the portal boots, `/api/health` answers.

### Observed, not asserted
- `tools: []` — does init list only `mcp__*` tools (B6)?
- Is `canUseTool` consulted for an MCP tool that is not in `allowedTools` (B4), or does the permission
  layer auto-allow it — in which case only the PreToolUse hook (B5) fences it?
- What the agent quotes when the schema layer refuses (I1) — if it sends the call at all.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
node --check .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs
node tooling/drift-check.mjs     # after staging
```

### Level 2: Unit Tests
None in this repo.

### Level 3: Integration — the spike itself
```bash
node .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs --preflight > .claude/plans/discovery-spike-1-op-transport/preflight.txt 2>&1; echo "exit=$?"   # no tokens; must be 0 first
node .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs > .claude/plans/discovery-spike-1-op-transport/run-1.txt 2>&1; echo "exit=$?"
```

### Level 4: Manual Validation
```bash
cd portal && npm ls zod @anthropic-ai/claude-agent-sdk && (npm start & sleep 2; curl -s 127.0.0.1:4747/api/health; kill %1)
node tooling/build-checks.mjs
gh issue view 279 --json comments --jq '.comments[-1].body' | head -3
```

### Level 5: Scope assertion
```bash
git diff --cached --stat | grep -E '^ (system|agent-layer|discovery|tooling|traces|replay)/' && echo 'SCOPE BREACH' || echo 'scope ok'
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** A real run (dry, cheap) proves or disproves the in-process tool at 0.1.77 — observed
      output in `run-1.txt`, the bar rows computed from it, written up in the spike README.
- [ ] **AC #2** The verdict is posted as a comment on epic #279 (Task 10) before #284 is planned, naming the
      branch taken and what `answer_ref` resolution #284 inherits.
- [ ] **AC #3** If the tool path wins: `CLAUDE.md:150` (and, scoped, `:153`) amended and `zod` declared in
      `portal/package.json` in this PR. If the CLI path wins: no dependency change.
- [ ] **AC #4** The applier and the op grammar are unchanged either way — no file under `discovery/`,
      `system/`, `agent-layer/`, `tooling/` in the diff (Task 12's scope assertion).
- [ ] All validation commands pass; plan + report in the PR; `Closes #280` in the PR body.

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–5 in order; Tasks 6–8 **or** 9 per the rule; Tasks 10–13
- [ ] `run-1.txt` (and `run-2.txt` if any) committed verbatim beside the script
- [ ] Verdict on #279; Q1 flagged in it
- [ ] `drift-check` and `build-checks` green locally; scope assertion `ok`
- [ ] Report written; PR open with `Closes #280`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — `CLAUDE.md:153` "no schema library".** The ticket amends only the sole-dependency line. A `zod`
  import anywhere in `portal/` contradicts line 153 as written, so this plan amends it with a scoped
  exception (Task 7). The owner confirms the wording at PR review; if refused, the alternative is to keep
  `zod` out of every module but the transport file and say so in that file's header only.
- **Q2 — retired.** "The model may decline to send `level: "wrong"`" no longer matters: the schema
  refusal is P5, asserted by calling the bundled server directly. The run's I1 is informational only.
- **Q3 — `tools: []`.** The typings say it disables all built-ins (runtimeTypes.d.ts:285); if init still
  lists built-ins, fall back to `tools: ['Read']` + fence-deny and record the difference (B6).
- **Q4 — is `canUseTool` consulted for MCP tools?** Spike C had the tool in `allowedTools`, so it never
  learned this. If the permission layer auto-allows MCP calls without consulting `canUseTool`, #287's
  "one predicate, two places" rests on the PreToolUse hook alone for MCP calls — which
  `trace-recorder.mjs:130-134` already treats as the reliable half. Either answer is fine; the verdict must
  state which.
- **A1 — cost/auth.** Subscription window through the CLI login on this Mac (`portal/.env` has no
  `CLAUDE_CODE_OAUTH_TOKEN`); one to two runs, well under a dollar-equivalent.
- **A2 — the canvas-epic doc edit** (one word, Task 8/9) is in scope because it points at this verdict. If
  the owner prefers that epic to own its doc, drop that hunk; nothing else depends on it.
- **A3 — "acceptable"** in the decision rule is read as pre-answered (see Task 5), because the doc was
  written with the peer fact already observed. The verdict makes that reading explicit rather than silent.

## NOTES (open canvas)

### Why a JSON schema without zod is not a third option

Read from the bundle, not assumed: `createSdkMcpServer` → `McpServer.tool(name, desc, inputSchema,
handler)` → `_createRegisteredTool(..., getZodSchemaObject(inputSchema), ...)` (sdk.mjs:21091, 21236).
`getZodSchemaObject` builds an object only when the value is a raw shape of zod-like fields, and
otherwise passes the value through untouched. On `tools/call`, `validateToolInput` (20697) runs
`safeParseAsync2(schemaToParse, args)`, which for a plain object has no `safeParse` and fails. The
bundled zod is not exported. So the caller's zod is required for the tool path, and the peer dependency
is real rather than a formality. The spike does not test this branch; the reading is enough.

### Why #203's rejection of "option B" does not carry

`.claude/plans/studio-replay-recorder-203.md:896` rejected in-process MCP tools for two reasons: params
land in `input`, which `tooling/curate-trace.mjs:27` clips at 700 chars per string, and "SDK surface no
recorder in this repo has used, on the critical path, inside a spike". The first belongs to the *trace*
format; discovery's `transcript.jsonl` is a new format (#281) and an op carries an `answer_ref` of a few
characters, never prose. The second is exactly the unknown this spike exists to retire, off the critical
path of any shipping ticket.

### Two risks retired before the run (observed 2026-08-28, planning session, zero tokens)

**Cross-copy zod.** `objectFromShape` wraps the caller's field schemas (portal `zod@4.4.3`) in the SDK's
*bundled* zod v4 object, and `toJsonSchemaCompat` walks `_zod` internals (sdk.mjs:15525 prefers a
field's own `_zod.toJSONSchema`). Calling the bundled server's `tools/list` directly with the exact
three-field shape returned a correct draft-07 schema: `question_id: { anyOf: [{type: string}, {type:
null}] }`, `level: { type: string, enum: [business, stakeholder, solution, transition] }`, `required:
[question_id, answer_ref, level]`. `tools/call` then accepted `null`, refused `level: "wrong"` with
`invalid_value … Invalid option: expected one of …` before the handler, refused a missing `answer_ref`
with `invalid_type`, and returned the handler's own `isError` text for `a9`. The handler ran in the
calling pid. The two copies interoperate through the `_zod` protocol at 4.4.3 ↔ the bundled v4; the
pre-flight re-observes it on every run, so a future SDK bump that breaks it goes red before a token is
spent.

**The model declining call 3.** The enum refusal is now P5 (deterministic); the run's third call only
records what the agent *quotes* (I1). Nothing in `works` depends on the model's willingness to send an
invalid value.

**What only the run can show, and why both answers are acceptable:** whether the CLI process lists and
connects the `sdk`-type server (B1), whether the permission layer consults `canUseTool` for an MCP tool
absent from `allowedTools` (B4) or auto-allows it so that only the PreToolUse hook fences it (B5), and
whether `tools: []` leaves no built-ins (B6). B4 either way is a finding for #287, not a failure.

**The private-API dependency of the pre-flight**, named: `server.instance.server._requestHandlers` is
the MCP SDK `Protocol` class's handler map, reached through the agent SDK's bundled copy. If a later SDK
renames it, `preflight.reachable` is `false`, P1–P6 read `false`, and the run's B-rows still decide — the
pre-flight can only add certainty, never fake it.

### What #284 inherits under each branch

| | In-process tool | CLI shape |
|---|---|---|
| Where `answer_ref` resolves | in the handler's closure over the server-owned store, same process, same tick | in `tooling/discovery-op.mjs`, reading `answers.jsonl` off disk per call |
| One op per call | the tool *is* one op; no batching is possible | `parseOpCommand`-style grammar denies `&&`/`;` (proven, #203) |
| Refusal reaches the agent mid-turn | `isError` result with the applier's message | non-zero exit + stderr, denied by the fence's parser or refused by the CLI |
| Free prose through the transport | never touches a shell | `shellQuote` (#226 fix) must be carried |
| Fence surface | `mcp__discovery__<op>` names in the allow-list; B4/B5 say which call site sees them | `Bash` allowed only for the CLI against this run's package dir (`makeFence` shape) |
| New dependency | `zod` (peer → declared) | none |
| Transcript `op` lines | from `PostToolUse` (`tool_input` + `tool_response`) or the handler itself | from `PostToolUse` of the Bash step, parsed |
| 60 s ceiling | `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` for slow handlers (n/a for an applier) | none |

### Sequencing

Task 5 **ends** the spike; nothing after it starts until the VERDICT is read. A plan whose later tasks
assume the tool branch is a plan that gets executed straight through on a failed run — the same reason
#203's Phase 1 was written to end rather than flow.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
