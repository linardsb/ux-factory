# Feature: The discovery spine — one question, one op, one run package on disk (#284)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, exports and modules. `discovery/ops.mjs` and
`discovery/bank.mjs` are ALREADY LANDED (#281, #282) — import them, never re-derive them.

## Feature Description

The portal gains a discovery session: it asks **one** banked question at a time, the person answers, a
real Agent SDK run judges that one answer against that question's own weak-answer note, pushes back once
in prose if it is thin, emits **at most one closing op** through an in-process MCP tool, and yields. A run
package appears on disk — `run.json` · `answers.jsonl` · `transcript.jsonl`.

It is also **spike 2**: the chosen architecture's one real risk. Under resume-per-turn, does the agent
judge one answer, file at most one closing op and stop — rather than running ahead, batching questions or
skipping the filing? The run produces the verdict; the verdict is a deliverable of this ticket.

## User Story

As the owner acting as operator
I want to answer one banked question in the portal and see exactly what the agent recorded against it
So that a discovery decision is auditable by someone who was not in the room, instead of being prose in a
vault only I can read.

## Problem Statement

`discovery/ops.mjs` holds the op grammar and `discovery/bank.mjs` holds 65 questions, and **nothing calls
either**. There is no answer store, no transcript writer, no session, no route, no surface. The honesty
claim the whole epic rests on — "the agent judges form, never substance" — is currently a property of a
data structure nobody has driven. `discovery/README.md` says it out loud: *"There is no recorder yet —
#284 adds it."*

## Solution Statement

Three modules, three routes, one minimal surface, one gate group, one real run.

- **`portal/lib/discovery.mjs`** — the session module, and **statically SDK-free**: cursor, the answer
  store, `answer_ref` allocation, the transcript writer, the run-package roots, the run lock, and the SSE
  projection as an exported whitelist function. `tooling/build-checks.mjs` imports it.
- **`portal/lib/discovery-transport.mjs`** — the ONE file that imports `@anthropic-ai/claude-agent-sdk`
  and `zod`. Four in-process MCP tools (one per op verb), the fence in two places, the message loop.
  Lazy-imported by `discovery.mjs` after every guard has passed.
- **`portal/lib/discovery-postures.mjs`** — the Think posture: a prompt builder plus its model. Pure
  strings; SDK-free.

The server appends the human's answer to `answers.jsonl` **before** the agent turn starts, so the ref the
applier resolves already exists. The agent's only write path is the op tool. The applier's refusal comes
back as `{ isError: true }`, which the agent reads and corrects from inside the same turn.

## Out of Scope / Non-Goals

- **Not included: the depth ladder's rules, branch selection, D5 escalation, the two metric counters** —
  #285. The spine records `depth` in `run.json` and walks `selectDepth()` in order; it does not propose,
  escalate or count.
- **Not included: the other two postures (Create PRD, Grill) or the existing-PRD audit entry mode** —
  #286. One posture ships: Think.
- **Not included: the per-run read allow-list fence** — #287. The spine runs with `tools: []` (no built-in
  tools at all) and a `canUseTool` + `PreToolUse` predicate that allows only the four MCP op tools. There
  is nothing for a read allow-list to allow yet.
- **Not included: look-it-up / park-it / the escape hatch surfaces** — #289. `WebSearch` / `WebFetch` are
  NOT enabled in the spine.
- **Not included: the UI at width** — #288. The spine ships a drawer good enough to run one question.
- **Not included: the PRD projection** — #290. No `prd.md` is written by this ticket.
- **Not included: re-answering a question the agent has already closed.** The cursor advances on a closed
  turn. A revisit on a new turn is legal in the applier (README, D5 escalation) and is #285's surface.
- **Not changing:** `discovery/ops.mjs`, `discovery/bank.mjs`, `portal/lib/chat.mjs`,
  `portal/lib/builder.mjs`, `portal/lib/origin.mjs`, any shipped page, any token, any VR baseline.
- **No new op verb.** The epic's op-verb lock: all four verbs landed in #281 and no later ticket adds one.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `portal/lib/` (3 new modules) · `portal/server.mjs` (3 routes) ·
`portal/public/` (one drawer) · `tooling/build-checks.mjs` (one group) · `discovery/<slug>/` (one package)
**Dependencies**: `@anthropic-ai/claude-agent-sdk@^0.1.77` and `zod@^4.4.3` — both already declared in
`portal/package.json` (declared by #280's PR). No new dependency.

## Related Work

**Implements**: [#284](https://github.com/linardsb/ux-factory/issues/284) ·
**Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) ·
**Architecture**: `docs/epics/discovery-partner.architecture.md` · **PRD**: `docs/epics/discovery-partner.prd.md`

**Back-references** (decisions inherited, not re-decided):

- `docs/epics/discovery-partner.architecture.md` §Recommended approach — approach C, answer-by-reference,
  two files so the separation is visible, the agent's turn text captured too.
- `docs/epics/discovery-partner.architecture.md` §Stack & libraries — resume-per-turn keyed by run slug,
  `maxTurns` as a per-turn cap, one run at a time refused not queued, no skills, subscription auth.
- `docs/epics/discovery-partner.architecture.md` §Boundaries — no write tools, `origin.mjs` unchanged,
  `HAS_TOKEN` on the config route, `maxTurns` single digits.
- `docs/epics/discovery-partner.architecture.md` §Other eng-lead calls — routes follow `/api/build/*`, the
  session module is `portal/lib/discovery.mjs`, the SSE projection is an exported whitelist.
- **Spike 1's verdict** — epic #279's comment, 2026-08-28. The in-process tool won. What this ticket
  inherits is quoted verbatim in GOTCHAs below; `.claude/plans/discovery-spike-1-op-transport/` is the
  working reference implementation.
- `discovery/README.md` — the run-package format spec (#281). This ticket must conform to it, and amends
  it in exactly the two places named in Task 20.

**Forward-references**: #285 (session rules) and #287 (the fence) both extend `portal/lib/discovery.mjs`
and both rebase onto this. #286 extends `portal/lib/discovery-postures.mjs`. #288 replaces the drawer.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

**The reference implementation of the transport — read this first, it is a working, observed run:**

- `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs` (lines 40-75, 120-175) — Why:
  `createSdkMcpServer` + `tool` + the raw zod shape + the handler returning `{ isError: true }` + the
  `query()` options (`tools: []`, `allowedTools: []`, `mcpServers`, the two-place fence, the three hooks).
  **This is the shape to copy.** It is a stub (`record_stub`); the real verbs come from `discovery/ops.mjs`.
- `.claude/plans/discovery-spike-1-op-transport/README.md` (§Caveats and bounds) — Why: the four things
  that will bite (failure hook, private pre-flight API, P1's cardinality gap, the stream timeout).

**The grammar and the bank — already landed, import them:**

- `discovery/ops.mjs` (whole file, 226 lines) — Why: `OPS`, `PARAMS`, `LEVELS`, `PROVENANCE`, `SOURCES`,
  `FLAGS`, `emptyRun()`, `applyOp(state, op, ctx)`, `applyOps(items, ctx, state)`. `ctx` is
  `{ answers: [{ ref }], bank: [{ id }], turn: string|null }`. **It throws; it never returns an error.**
- `discovery/bank.mjs` (lines 687-794) — Why: `OPENING_SET`, `DEPTHS`, `questionById`, `questionsForStage`,
  `selectDepth(depth)`. A question entry carries `{ id, stage, text, attribution, weakAnswer, label, note?,
  provenanceNote? }`. `selectDepth` throws on an unknown depth.
- `discovery/README.md` (whole file) — Why: the exact JSONL line shapes for all three files, the honesty
  rules, and the R1/R2 rules this module must not break.

**The portal seams:**

- `portal/lib/chat.mjs` (lines 33-82) — Why: the proven `query()` + SSE shape; `resume: sessions[key]`;
  the `msg.type === 'system' && subtype === 'init'` → `session_id` capture; the assistant text-block loop.
  **Do not copy its `maxTurns: 40`** (architecture §Boundaries says so explicitly).
- `portal/lib/builder.mjs` (lines 226-260 `withRunLock` + `isRunInFlight`; lines 262-300 `stepEvent` +
  `STEP_EVENT_TEXT_MAX`; lines 176-190 `assertFictional`; lines 137-152 `assertScenarioSlug`/`assertRunSlug`)
  — Why: every one of these is the pattern the discovery equivalent mirrors, including the *reasons* stated
  in the comments (a queued run spends tokens twice; a projection written inline in the route is one the
  gate cannot reach).
- `portal/lib/trace-recorder.mjs` (lines 100-175) — Why: the `PreToolUse` fence hook that fails closed and
  records a denial, and the `hook(ok)` wrapper pattern (`try/catch`, always `{ continue: true }`, a
  recording bug must never alter the run it observes). Also lines 190-215 — the `kind: 'text'` capture the
  architecture points at for the agent's turn text.
- `portal/record-composition.mjs` (lines 33-45, 358-364) — Why: **the lazy-SDK-import precedent.** A static
  SDK import anywhere in a module `build-checks` imports takes the CI job down. `const { recordRun } = await
  import('./lib/trace-recorder.mjs');` is the exact shape, placed after every guard.
- `portal/server.mjs` (lines 84-140) — Why: the `/api/build/*` route trio (config GET, a pure POST, an SSE
  POST), the `send()` closure with the `open` flag, and the **EVERY PARAMETER NAMED, never `{...body}`**
  comment which is a hard rule here too.
- `portal/lib/env.mjs` (whole file, 27 lines) — Why: `REPO_DIR`, `JOBS_DIR`, `PORTAL_DIR`, `HAS_TOKEN`.
- `portal/lib/origin.mjs` — Why: read it to confirm it needs NO change. It runs before any routing.
- `portal/public/portal.js` (lines 364-400 `loadBuilderConfig`; lines 541-596 the SSE reader loop; line 7
  `api()`; line 3 `esc()`) — Why: the drawer + SSE-consumption pattern to mirror exactly.
- `portal/public/index.html` (lines 16-24 the header buttons; lines 95-141 the builder drawer) — Why: where
  the button and the drawer markup go.
- `portal/public/portal.css` (whole file, 181 lines) — Why: the class vocabulary (`portal-drawer`,
  `portal-form`, `portal-form-wide`, `portal-phase-log`, `portal-form-status`, `muted`).
- `tooling/build-checks.mjs` (lines 1-30 the header incl. the "TWO NAMED EXCEPTIONS" paragraph; lines
  110-128 the group index; lines 186-215 the imports + `ok`/`group` helpers; lines 5263-5290 group 29's
  opening — the fixture/`threw` idiom; line 5525 the footer count) — Why: every one of these needs a
  surgical edit or is the pattern to mirror.

### New Files to Create

- `portal/lib/discovery.mjs` — the session module. Statically SDK-free and zod-free.
- `portal/lib/discovery-transport.mjs` — the ONE SDK + zod file. Four MCP op tools, the fence, the loop.
- `portal/lib/discovery-postures.mjs` — the Think posture (prompt builder + model). SDK-free.
- `discovery/<slug>/run.json` · `answers.jsonl` · `transcript.jsonl` — written by the real run, committed.

### Relevant Documentation

- Spike 1's verdict on epic #279 (`gh issue view 279 --json comments`) — sections "What #284 (the spine)
  inherits" and "What the schema requires". Why: it is the contract this ticket implements, observed rather
  than reasoned.
- [MCP tool result shape](https://modelcontextprotocol.io/docs/concepts/tools) — `{ content: [{type:'text',
  text}], isError }`. Why: the handler's return shape; an `isError` result is how a refusal reaches the agent.
- `docs/research/requirements-hierarchy.md` — Why: `LEVELS` order (`business` ← `stakeholder` ← `solution`
  ← `transition`) is what the posture prompt must explain to the agent so it picks a level at all.

### Patterns to Follow

**The three-layer SDK isolation** (`builder.mjs` → `record-composition.mjs` → `trace-recorder.mjs`),
mirrored exactly:

```
tooling/build-checks.mjs   imports  portal/lib/discovery.mjs           (CI: no portal/node_modules)
portal/lib/discovery.mjs   imports  discovery/{ops,bank}.mjs           (zero-dep)
                           lazy-    portal/lib/discovery-transport.mjs (the ONLY SDK + zod importer)
                           imports
```

**Throws name the offending path/value** (`agent-layer/lib.mjs`, `builder.mjs`):

```js
const bad = (msg) => { throw new Error(`discovery: ${msg}`); };
```

**A guard is an exported named function**, because a guard reachable only by starting a real agent run is
a guard nobody tests (`builder.mjs`'s own words at `assertScenarioSlug`).

**The whitelist projection** (`builder.mjs`'s `stepEvent`): returns `null` for anything not projectable;
the route skips the send; the shape opinion lives in the module, never in the route.

**Hand-validate at the boundary and throw** — no schema library in an applier or a boundary validator.
`zod` appears in `discovery-transport.mjs` and nowhere else (CLAUDE.md's scoped exception, amended by #280).

---

## MODULE CONTRACTS — the exact exports, decided here so no task invents a name

Every task below adds to one of these three. If an implementation reaches for a name not on this list, it
is inventing rather than following, and it should stop and re-read.

### `portal/lib/discovery.mjs` — statically SDK-free, zod-free, imported by the gate

```js
// constants
export const PROVENANCES         // ['fictional','real']
export const ENTRY_MODES         // ['blank-idea']            — #286 adds 'existing-prd'
export const FRONT_ENDS          // ['portal','terminal']
export const MCP_SERVER          // 'discovery'
export const TOOL_SCHEMA         // { <op>: { <param>: typeCode | enumArray } } — mirrors PARAMS by name
export const TOOL_TYPES          // the legal type codes
export const TURN_EVENT_TEXT_MAX // 4000

// guards — each an exported named function, because a guard reachable only by starting a real agent
// run is a guard nobody tests (builder.mjs's own words)
export function assertRunSlug(slug)                      // → slug | throws
export function resolveRunRoot({ provenance, slug })     // → absolute path | throws
export function assertProvenanceRoot(provenance, root)   // → root | throws
export function assertTurnWritable(transcript, turn)     // → turn | throws
export function toolNameFor(op)                          // → 'mcp__discovery__<op>'
export function allowsToolName(name)                     // → boolean — the fence predicate, PURE

// the three files
export function readAnswers(root)                        // → [] when absent
export function nextRef(answers)                         // → 'a<N>'
export function appendAnswer(root, { turn, questionId, kind, text })   // → the written record
export function readTranscript(root)                     // → [] when absent
export function appendTranscript(root, line)             // → the written line
export function textLine({ turn, text })
export function opLine({ record })
export function deniedLine({ turn, tool, input, error })
export function readRun(root)                            // → head | null
export function writeRun(root, head)
export function recordSessionId(root, sessionId)
export function recordTurnStats(root, stats)

// the session
export function openSession({ slug, provenance, entryMode, depth, branch, frontEnd, posture })
export function sessionView(root)                        // → { head, answers, transcript, cursor }
export function closeSession(root)
export function discoveryConfig()
export function withDiscoveryRunLock(fn)
export function isDiscoveryRunInFlight()
export function turnEvent(line)                          // → event | null   (the SSE whitelist)
export async function runTurn({ slug, provenance, questionId, kind, text, onLine })
```

### `portal/lib/discovery-postures.mjs` — pure strings, SDK-free

```js
export const YIELD_CONTRACT   // ONE exported string — spike 2's branch 2 is a one-line diff to it
export const MVP6_LINE        // the two halves, stated once
export const LADDER_BRIEF     // the BABOK ladder, one line per rung
export const POSTURES         // { think: { id, label, model:'claude-sonnet-5', build } }
export function buildThinkTurn({ question, answer, turn })  // → { systemPrompt, prompt }
```

### `portal/lib/discovery-transport.mjs` — the ONE file importing the SDK and zod

```js
export function zodFor(descriptor)                    // a TOOL_SCHEMA entry → a zod RAW SHAPE
export function buildOpServer({ root, ctx, turn, state, onLine })  // → the createSdkMcpServer value
export async function preflightTransport()            // ZERO TOKENS — Task 19
export async function runDiscoveryTurn({ root, head, question, answer, turn, posture, onLine })
```

---

## IMPLEMENTATION PLAN

### Phase 1: The session module's pure core

`portal/lib/discovery.mjs` — everything the gate can reach with no agent and no token: roots, slug guards,
ref/turn allocation, the three file writers/readers, the run lock, the tool-schema descriptor table, and
the SSE projection.

**Tasks:** the run-package roots and the provenance branch · the answer store · the transcript writer ·
`run.json` read/write · `turnEvent` · `withDiscoveryRunLock` · `TOOL_SCHEMA`.

### Phase 2: The Think posture

**Depends on:** Phase 1 (imports `TOOL_SCHEMA` and the question shape for its prompt text).
**Independent of:** Phase 3 — a prompt is a string; it can be written and gated before the transport exists.

`portal/lib/discovery-postures.mjs`. One posture, its model, and a prompt builder carrying MVP 6's two
halves and the yield contract.

### Phase 3: The transport

**Depends on:** Phase 1 (`TOOL_SCHEMA`, the transcript writer) and Phase 2 (the prompt).

`portal/lib/discovery-transport.mjs` — four MCP tools built from `OPS`, the fence in two places, the
message loop, the per-turn stats.

### Phase 4: Wiring

**Depends on:** Phases 1-3.

`discovery.mjs`'s `runTurn` (the lazy import) · three routes in `server.mjs` · the drawer.

### Phase 5: The gate

**Depends on:** Phases 1-2 only — it can be written before the transport runs, and should be, because it
is what proves the projection and the roots before a token is spent.
**Independent of:** Phase 4's UI.

`tooling/build-checks.mjs` group 30.

### Phase 6: The real run and the spike-2 verdict

**Depends on:** everything above. This is the deliverable AC #1-#3 name.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently testable.

### 1. CREATE `portal/lib/discovery.mjs` — the header and the roots

- **IMPLEMENT**: The file header (governing doc, the three-layer SDK rule stated as an invariant, the
  answer-by-reference rule, "disk is authoritative"). Then:
  `assertRunSlug(slug)` — `/^[a-z0-9-]{1,48}$/`, throws naming the value and saying it names the package
  directory. `PROVENANCES = Object.freeze(['fictional','real'])`.
  `resolveRunRoot({ provenance, slug })` → `fictional` ⇒ `join(REPO_DIR, 'discovery', slug)`;
  `real` ⇒ `join(JOBS_DIR, '_discovery', slug)`; anything else throws naming the two.
  `assertProvenanceRoot(provenance, root)` — a **real** run whose resolved root is inside `REPO_DIR`
  throws, naming the path and quoting the reason (this repo is public and inspectable).
- **PATTERN**: `portal/lib/builder.mjs:137-190` (`assertRunSlug`, `assertFictional` — including that
  `assertFictional` demands `=== true` so a missing key refuses too).
- **IMPORTS**: `node:fs`, `node:path`, `{ JOBS_DIR, REPO_DIR }` from `./env.mjs`.
- **GOTCHA**: `JOBS_DIR` defaults to a sibling of the repo but is overridable by env. Compute
  `assertProvenanceRoot` from the RESOLVED paths (`path.resolve`), not from the string form, or a
  `JOBS_DIR` pointed inside the repo slips through.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>{console.log(m.resolveRunRoot({provenance:'fictional',slug:'x'}));try{m.resolveRunRoot({provenance:'nope',slug:'x'})}catch(e){console.log('refused:',e.message)}})"`
- **SATISFIES**: the provenance branch (ticket §What lands), R1 in `discovery/README.md`.

### 2. ADD to `portal/lib/discovery.mjs` — the answer store

- **IMPLEMENT**: `readAnswers(root)` → parsed array of `answers.jsonl` lines (`[]` if absent).
  `nextRef(answers)` → `a<N>` where N = `answers.length + 1`.
  `appendAnswer(root, { turn, questionId, kind, text })` → allocates the ref, appends **one** line
  `{ ref, ts, turn, question_id, kind, text }` with `appendFileSync`, returns the written record.
  `kind` is `'banked' | 'off-script'`; the spine only writes `'banked'`.
- **PATTERN**: `discovery/README.md` §File shapes — the two example lines are the exact key set and order.
- **GOTCHA**: **Verbatim, never rewritten.** Do NOT apply `portal/lib/redact.mjs` here. Redaction is
  `trace-recorder.mjs`'s contract for agent output; `answers.jsonl`'s contract is verbatim human text, and
  a redacted answer would be a rewritten one. State that reasoning in the function's comment. (A real-
  provenance run lands outside the repo and is never committed, which is where the risk actually sits.)
- **GOTCHA**: `text` must be stored exactly as submitted — no trim, no normalisation. Validate only that it
  is a non-empty string, and throw naming the field if not.
- **ALSO IMPLEMENT — `assertTurnWritable(transcript, turn)`**, called by `appendAnswer` before it writes:
  throws if that turn already carries a closing `op` line, naming the turn and the closing seq. This is the
  **structural** half of the ordering rule in Task 14 — a guard cannot enforce a call order, but it can
  refuse the damage a wrong order causes. An answer landing on a turn the agent already closed is a phantom
  answer in an append-only file the honesty contract forbids you to clean up, and it corrupts both AC #1's
  one-closer-per-turn read and #285's not-a-form counter. Pure over two arguments, so group 30 drives it
  in both directions.
- **VALIDATE**: write two answers into a temp root, read them back, assert `a1`/`a2` and that the second
  append did not rewrite the first (compare bytes of line 1 before and after).
- **SATISFIES**: "The answer store is server-written only, and only on submit" (ticket §What lands).

### 3. ADD to `portal/lib/discovery.mjs` — the transcript writer

- **IMPLEMENT**: `readTranscript(root)` → parsed array (`[]` if absent).
  `appendTranscript(root, line)` → adds `ts` (and `type` if the caller passed a bare record), appends one
  JSON line, returns the written object. Three shapes, each with its own tiny constructor so no caller
  hand-builds one:
  `textLine({ turn, text })` · `opLine({ record })` (the applier's record — `seq`, `turn`, `op`, `params`,
  `closes`, `flagged`, `supersedes` — spread verbatim, never edited) · `deniedLine({ turn, tool, input, error })`.
- **PATTERN**: `discovery/README.md` §File shapes — the three example lines.
- **GOTCHA**: **Append-only.** Never `writeFileSync` over an existing transcript. `openSession` creates the
  file only when it does not exist.
- **GOTCHA**: The `op` line's `seq`/`closes`/`flagged`/`supersedes` are the APPLIER's and must be copied
  through unchanged — `applyOps` refuses an item carrying them back in, which is the drift detector.
- **VALIDATE**: append one of each of the three line types to a temp root; `JSON.parse` every line; assert
  the key sets match `discovery/README.md`'s examples.
- **SATISFIES**: "The transcript captures the agent's turn text, not just its ops" (ticket §What lands).

### 4. ADD to `portal/lib/discovery.mjs` — `run.json`

- **IMPLEMENT**: `readRun(root)` → the parsed header or `null`.
  `writeRun(root, head)` → `writeFileSync` with 2-space JSON.
  `openSession({ slug, provenance, entryMode, depth, branch, frontEnd, posture })` — validates the slug,
  resolves and asserts the root, `mkdirSync(recursive)`, and:
    · if `run.json` exists → **resume**: return the existing head (do not overwrite it; disk is
      authoritative), plus the read-back answers and transcript.
    · else → write the head per `discovery/README.md`:
      `{ slug, provenance, label: 'Real run — fictional scenario' | 'Real run — real product',
         entryMode, depth, branch, frontEnd, model, sessionId: null, startedAt, endedAt: null, root,
         turnStats: [] }`.
  `closeSession(root)` → sets `endedAt`.
  `recordSessionId(root, sessionId)` / `recordTurnStats(root, stats)` → read-modify-write the head.
- **PATTERN**: `discovery/README.md` §File shapes → `run.json`.
- **GOTCHA**: `root` in the head is **repo-relative for fictional runs** (`discovery/<slug>`) exactly as the
  README's example shows — an absolute home-dir path must never be committed. For a real run, record the
  absolute path (it is never committed).
- **GOTCHA**: `turnStats` is an addition to the README's stated header. Task 20 amends the README in the
  same PR; do not ship the field without the doc line.
- **GOTCHA**: `depth` must be a key of `DEPTHS`; validate with `selectDepth(depth)` and let its throw
  surface. `branch` is `null` in the spine — the branch selectors are #283's and do not exist yet.
- **VALIDATE**: open a session in a temp root, read `run.json`, re-open the same slug and assert the head is
  byte-identical (resume did not rewrite it).
- **SATISFIES**: AC #5 (a page reload resumes from disk).

### 5. ADD to `portal/lib/discovery.mjs` — the cursor

- **IMPLEMENT**: `sessionView(root)` → `{ head, answers, transcript, cursor }` where
  `cursor = { index, question, turn, total, done }`:
  `ops` = transcript `op` lines reduced through `applyOps` is NOT needed here — derive from the transcript
  directly: the set of **closed turns** is `transcript.filter(l => l.type==='op' && l.closes).map(l => l.turn)`.
  `index` = that set's size. `question` = `selectDepth(head.depth)[index] ?? null`.
  `turn` = `t${index + 1}`. `done` = `index >= selectDepth(head.depth).length`.
- **GOTCHA**: The cursor is **derived from the record, never stored**. Two records of one fact drift —
  `discovery/ops.mjs`'s own `emptyRun()` comment says exactly this about "closed".
- **GOTCHA**: A turn that did NOT close (the agent yielded without filing) leaves the cursor where it is, so
  the next submit re-uses the same question on the SAME turn id — which R2 permits, because that turn was
  never closed. Do not invent a new turn id for it.
- **VALIDATE**: build a synthetic transcript with one closing op and assert the cursor advanced by exactly
  one; add a non-closing `file_evidence` line and assert it did not move.
- **SATISFIES**: the spine's one-question loop; AC #1's "exactly one closing op per banked-question turn".

### 6. ADD to `portal/lib/discovery.mjs` — `TOOL_SCHEMA`

- **IMPLEMENT**: An SDK-free, zod-free descriptor the transport turns into zod, and the gate compares to
  the grammar **by name**:
  ```js
  export const TOOL_SCHEMA = Object.freeze({
    record_decision: Object.freeze({
      question_id: 'string|null', answer_ref: 'string', level: LEVELS, parent_id: 'int|null',
      evidence_refs: 'int[]', wrong_if: 'string', off_script: 'boolean',
    }),
    flag_weak_answer: Object.freeze({ question_id: 'string', answer_ref: 'string', missing: 'string[]' }),
    open_question: Object.freeze({ source: SOURCES, question_id: 'string|null', answer_ref: 'string', reason: 'string' }),
    file_evidence: Object.freeze({ url: 'string|null', ref: 'string|null', provenance: PROVENANCE, claim_ref: 'int|null' }),
  });
  export const TOOL_TYPES = Object.freeze(['string','string|null','int|null','int[]','string[]','boolean']);
  ```
  Plus `toolNameFor(op)` → `mcp__discovery__${op}` and `MCP_SERVER = 'discovery'`.
- **GOTCHA**: This exists **because** spike 1's pre-flight P1 compared the advertised schema by CARDINALITY
  (`enum.length === 4`, `required.length === 3`) and would have passed four wrong enum values — the deferred
  F5 finding recorded as a comment on this ticket. Keeping the field names in an SDK-free table is what lets
  group 30 compare them to `PARAMS` **by name, in CI**, instead of at run time.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(async m=>{const o=await import('./discovery/ops.mjs');for(const op of o.OPS)console.log(op, JSON.stringify(Object.keys(m.TOOL_SCHEMA[op]))===JSON.stringify(o.PARAMS[op]))})"` — four `true`s.
- **SATISFIES**: AC #4's spirit (gate reaches the schema), and the #284 comment's ask.

### 7. ADD to `portal/lib/discovery.mjs` — `turnEvent`, the SSE whitelist

- **IMPLEMENT**:
  ```js
  export const TURN_EVENT_TEXT_MAX = 4000;
  export function turnEvent(line) { /* returns null for anything not projectable */ }
  ```
  `text` → `{ type:'text', turn, text: <capped>, truncated }`.
  `op` → `{ type:'op', turn, seq, op, closes, flagged, supersedes, questionId: params.question_id ?? null,
  answerRef: params.answer_ref ?? null }`.
  `denied` → `{ type:'denied', turn, tool, error: <capped> }`.
  Anything else → `null`.
- **PATTERN**: `portal/lib/builder.mjs:262-300` `stepEvent` — including its comment's reasoning, restated
  for this module: WHITELIST never blacklist, so a field added to the transcript later does not start
  streaming by default; and a projection written inline in the route is one the gate cannot reach.
- **GOTCHA**: The cap is 4000 (not `stepEvent`'s 400) and the reason belongs in a comment: the agent's
  pushback prose IS the thing the human has to read, so a 400-char cap would break the loop rather than
  bound a progress log. `truncated` is reported so the surface can point at the transcript.
- **GOTCHA**: Do **not** project `params.wrong_if`, `params.missing` or `params.reason`. The surface reads
  the package after the turn; streaming the prose would put a second, divergent copy on the wire.
- **VALIDATE**: group 30 case (Task 18) — including the mutation: add an unknown field to a `text` line and
  assert it does not appear in the projection.
- **SATISFIES**: AC #4.

### 8. ADD to `portal/lib/discovery.mjs` — the run lock and the config payload

- **IMPLEMENT**: `withDiscoveryRunLock(fn)` + `isDiscoveryRunInFlight()` — module-level `inFlight`,
  refused not queued, released in `finally`.
  `discoveryConfig()` → `{ questions: QUESTIONS, depths, provenances: PROVENANCES, entryModes: ['blank-idea'],
  frontEnds: ['portal','terminal'], postures, ops: OPS, hasToken: HAS_TOKEN }` where `depths` is
  `Object.entries(DEPTHS).map(([id,d]) => ({ id, label: d.label, when: d.when, count: d.ids.length }))`
  and `postures` comes from `discovery-postures.mjs` (id, label, model — never the prompt body).
- **PATTERN**: `portal/lib/builder.mjs:226-260` (`withRunLock`'s exported-not-inline reasoning) and
  `portal/server.mjs:84-92` (`/api/build/config` — ONE route so the UI cannot fork the definition).
- **GOTCHA**: `hasToken` comes from `env.mjs`'s `HAS_TOKEN`, so the UI can say whether a session can start
  before one is attempted (AC #6).
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>console.log(Object.keys(m.discoveryConfig())))"`.
- **SATISFIES**: AC #6; ticket §Routes.

### 9. CREATE `portal/lib/discovery-postures.mjs` — the Think posture

- **IMPLEMENT**: A header saying a posture is a prompt, nothing shipped reads it, and #286 adds the other
  two. Then:
  ```js
  export const POSTURES = Object.freeze({ think: Object.freeze({ id:'think', label:'Think', model:'claude-sonnet-5', build: buildThinkTurn }) });
  export function buildThinkTurn({ question, answer, turn, priorText }) → { systemPrompt, prompt }
  ```
  The **systemPrompt** carries, as prose the agent cannot misread:
  1. the role — you judge ONE answer against ONE weak-answer note;
  2. **MVP 6's two halves, both stated**: you may say the answer names no number, no user, no alternative,
     no time and no cost; **you may not say the answer is wrong**, and **you may not supply what is
     missing**;
  3. **the yield contract**: judge this one answer, push back at most once in prose, file **at most one
     closing op**, then stop and produce no further tool call and no further question;
  4. the op vocabulary and what closes a turn — from `OPS`, `TOOL_SCHEMA` and `discovery/README.md`'s table;
  5. the `answer_ref` rule: there is no parameter for answer text on any tool; the reference is the answer;
  6. the BABOK ladder in order with one line each, so `level` is a choice rather than a guess.
  The **prompt** carries: the question's `text`, `attribution`, `stage`, its **`weakAnswer` note**, the
  answer's `ref` and its verbatim `text`, and the turn id.
- **GOTCHA**: **The weak-answer note goes to the agent, never to the person.** It is the rubric; showing it
  in the UI beside the question would tell the person the answer.
- **GOTCHA**: The yield contract's wording is the thing spike 2 tests. If the run comes back dirty, the
  decision rule's second branch is "tighten to an explicit yield contract in the posture prompt and re-run"
  — so keep this string in ONE place, exported, so a tightening is a one-line diff and the gate sees it.
- **GOTCHA**: C2 — no AI slop. Run the prompt text past `~/.claude/skills/_shared/slop-blacklist.md`.
- **PATTERN**: `portal/lib/chat.mjs`'s `SYSTEM` const — a plain template literal, British English, concise.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{const t=m.POSTURES.think.build({question:{id:'q',text:'t',attribution:'a',stage:4,weakAnswer:'w'},answer:{ref:'a1',text:'x'},turn:'t1'});console.log(t.systemPrompt.length, t.prompt.includes('a1'))})"`
- **SATISFIES**: "One posture prompt (Think)" (ticket §What lands); the spike-2 decision rule's branch 2.

### 10. CREATE `portal/lib/discovery-transport.mjs` — the four MCP tools

- **IMPLEMENT**: A header stating: this is the ONE file in the discovery graph importing the SDK and zod;
  it is lazy-imported by `discovery.mjs` after every guard; `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` governs
  handlers over 60 s and an applier is instant. Then a `zodFor(descriptor)` that turns `TOOL_SCHEMA`'s
  string codes into zod instances:
  `'string'`→`z.string()` · `'string|null'`→`z.string().nullable()` · `'int|null'`→`z.number().int().nullable()`
  · `'int[]'`→`z.array(z.number().int())` · `'string[]'`→`z.array(z.string())` · `'boolean'`→`z.boolean()` ·
  an **array value** → `z.enum(value)`. Anything else throws naming the op and the field.
  Then one `tool(op, description, rawShape, handler)` per entry in `OPS`, and
  `createSdkMcpServer({ name: MCP_SERVER, version: '1.0.0', tools })`.
- **PATTERN**: `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs:48-75`.
- **GOTCHA**: **A RAW SHAPE, not `z.object(...)`, and not a plain JSON schema.** Spike 1's §What the schema
  requires: the SDK wraps the shape in its own bundled zod; a plain JSON schema is passed through unchanged
  and fails on the first call.
- **GOTCHA**: `zod` must be the **caller's own copy** (`portal/node_modules/zod`, 4.4.3). It interoperates
  with the SDK's bundled copy through the `_zod` protocol; do not try to reach the SDK's.
- **GOTCHA**: Iterate `OPS` to build the tools. A fifth verb with no `TOOL_SCHEMA` entry must fail loudly
  here, not be silently skipped — the same rule `discovery/ops.mjs`'s invariant 2 states.
- **GOTCHA**: The tool DESCRIPTION must state that there is no parameter for answer text and that
  `answer_ref` names a stored answer the tool resolves. Spike 1 did this and the agent respected it.
- **VALIDATE**: `cd portal && node -e "import('./lib/discovery-transport.mjs').then(m=>console.log('loaded'))"`
  (from `portal/`, so `zod` and the SDK resolve).
- **SATISFIES**: "No write tools at all — the op is the only write path" (ticket §What lands).

### 11. ADD to `portal/lib/discovery-transport.mjs` — the handler

- **IMPLEMENT**: One handler factory closing over `{ state, ctx, root, turn }`:
  ```js
  async (args) => {
    try {
      const next = applyOp(state.current, { op, params: args }, ctx());
      state.current = next;
      const record = next.ops[next.ops.length - 1];
      onLine(appendTranscript(root, opLine({ record })));
      return { content: [{ type: 'text', text: `filed seq ${record.seq}: ${op}${record.closes ? ' (turn closed)' : ''}${record.flagged.length ? ` flagged ${record.flagged.join(', ')}` : ''}` }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  }
  ```
- **GOTCHA (spike 1, load-bearing)**: **A refusal is an `isError` result, never a throw.** The agent receives
  the applier's message verbatim and corrects inside the turn. Throw only for a bug in this file.
- **GOTCHA**: `ctx()` must be re-read per call — `{ answers: readAnswers(root), bank: QUESTIONS, turn }`.
  The answers array grows across turns; a captured stale array makes a later `answer_ref` unresolvable.
- **GOTCHA**: Write the **filed** `op` transcript line here (the applier's record with its `seq` is in hand)
  and write **nothing** on `PostToolUse`. Refusals are written by the failure hook (Task 12) — writing them
  in both places double-records.
- **VALIDATE**: Task 19's pre-flight rows PF4, PF5 and PF7 drive exactly this handler for zero tokens; the
  applier's own refusals are already gated by group 29.
- **SATISFIES**: AC #1 (ops land in `transcript.jsonl`); the answer-by-reference rule's teeth.

### 12. ADD to `portal/lib/discovery-transport.mjs` — the fence and the hooks

- **IMPLEMENT**: One predicate — **`allowsToolName(name)`, exported from `discovery.mjs`, not from this
  file** → `true` only for `mcp__discovery__<op>` where `op ∈ OPS`, built by mapping `OPS` so a fifth verb
  is covered automatically. It lives in the SDK-free module on purpose: that is what lets group 30 drive it
  in CI, and it is the seam #287 widens into the per-run read allow-list. This file imports it and calls it
  from **two places**: `canUseTool` (allow → `{ behavior:'allow', updatedInput: input }`; deny →
  `{ behavior:'deny', message }`) and a fail-closed `PreToolUse` hook that returns
  `{ hookSpecificOutput: { hookEventName:'PreToolUse', permissionDecision:'deny', permissionDecisionReason } }`
  and writes a `denied` transcript line.
  Plus `PostToolUseFailure` → writes a `denied` line carrying `tool`, `input` and the message from
  `input.error ?? input.tool_response`.
  `PostToolUse` is **not** registered.
- **PATTERN**: `portal/lib/trace-recorder.mjs:100-175` — the fence hook that fails closed and records the
  denial; the `try/catch` + `{ continue: true }` discipline on every recording hook.
- **GOTCHA (spike 1, load-bearing)**: **Refusals arrive on `PostToolUseFailure`, not `PostToolUse`.** Both a
  handler `isError` result and a schema-layer `-32602` refusal surface there, with the message verbatim in
  `error`. A recorder listening only on `PostToolUse` loses every refusal — and a refused op is exactly the
  receipt the honesty contract keeps. This is a **discrepancy with the architecture doc**, which says
  `PostToolUse` "is not needed for the transcript"; that is true for filed ops and false for refused ones.
  Note it in the module header.
- **GOTCHA**: A schema-layer refusal never reaches the handler, so its ONLY record point is this hook.
- **GOTCHA (bounded claim — and what IS proven)**: `tools: []` removes the built-ins, so at run time the
  spine leaves the fence's deny branch nothing to deny. Spike 1 observed both call sites **consulted** for
  MCP calls but never **blocking** one. So split the claim and prove the half you can: **the predicate is
  gated exhaustively in CI** (group 30 case 14), and **the wiring — that a `deny` from either call site
  actually blocks an MCP call — stays unobserved**. Claim exactly that in the report, no more. #287 owns
  the wiring half and its first fenced run gets it for free.
- **VALIDATE**: assert in the run's transcript that no `denied` line appeared AND that the tool list at
  `init` is exactly the four `mcp__discovery__*` names (log `msg.tools` from the init message).
- **SATISFIES**: "No write tools at all. `Write` and `Edit` denied outright"; `denied` lines per README.

### 13. ADD to `portal/lib/discovery-transport.mjs` — `runDiscoveryTurn`

- **IMPLEMENT**:
  ```js
  export async function runDiscoveryTurn({ root, head, question, answer, turn, posture, onLine }) → { sessionId, stats }
  ```
  Builds the prompt from the posture, opens `query({ prompt, options: { cwd: root, model: posture.model,
  maxTurns: 6, systemPrompt, resume: head.sessionId || undefined, tools: [], allowedTools: [],
  mcpServers: { [MCP_SERVER]: server }, canUseTool, hooks } })`, then the message loop:
  · `system`/`init` → capture `session_id` (return it so the caller records it in `run.json`); log the
    advertised tool list.
  · `assistant` → for every `type:'text'` block, `onLine(appendTranscript(root, textLine({ turn, text })))`.
  · `result` → `stats = { turn, numTurns: msg.num_turns, durationMs: msg.duration_ms,
    costUsd: msg.total_cost_usd, ok: msg.subtype === 'success', ts }`.
  `res.on('close')`-style interruption is the caller's; this function returns when the stream ends.
- **PATTERN**: `portal/lib/chat.mjs:60-80` (the message loop) and `trace-recorder.mjs:190-215` (the text
  capture that is the architecture's cited source for `kind: 'text'` steps).
- **GOTCHA**: `maxTurns: 6` — a **per-turn** cap. Resume-per-turn means every turn is a fresh `query()`, so
  session length is governed by the depth ladder. `chat.mjs`'s 40 is for an open conversation and is the
  wrong number to copy (architecture §Boundaries states this explicitly). Put the reason in a comment.
- **GOTCHA**: `resume` must be `undefined`, not `null`, when there is no prior session id.
- **GOTCHA**: The SDK is imported at the TOP of this file — that is fine, because nothing imports this file
  statically. Verify with the grep in Task 17's validation.
- **VALIDATE**: Task 19's pre-flight (zero tokens), then Task 20's real run.
- **SATISFIES**: AC #1, AC #2 (the stats), the resume-per-turn session model.

### 14. ADD to `portal/lib/discovery.mjs` — `runTurn` (the lazy import)

- **IMPLEMENT**:
  **The order is LOCK → GUARDS → APPEND → RUN, and it is the whole task:**
  ```js
  export async function runTurn({ slug, provenance, questionId, kind, text, onLine }) {
    return withDiscoveryRunLock(async () => {          // 1. refused, not queued — before anything is written
      const root = ...;                                 // 2. guards: slug, root, run.json exists, cursor not
      ...                                               //    done, submitted questionId matches the cursor's
                                                        //    question, text is a non-empty string
      const answer = appendAnswer(root, { turn, questionId, kind, text });   // 3. BEFORE the agent turn
      const { runDiscoveryTurn } = await import('./discovery-transport.mjs'); // 4. the SDK enters here
      const { sessionId, stats } = await runDiscoveryTurn({ ... });
      recordSessionId(root, sessionId); recordTurnStats(root, stats);
      return sessionView(root);
    });
  }
  ```
- **PATTERN**: `portal/record-composition.mjs:358-364` — "The SDK enters HERE and nowhere earlier — after
  every guard above has passed."
- **GOTCHA (ordering, load-bearing)**: the answer is appended to `answers.jsonl` **before** the agent turn
  starts, so the ref exists when the applier resolves it. An agent turn that begins before the append makes
  every `answer_ref` throw.
- **GOTCHA**: the applier's `state` for the turn must be rebuilt by folding the transcript's existing `op`
  lines through `applyOps` — reduced to `{ op, params, turn }` first, because `applyOps` refuses an item
  carrying `seq`/`closes`/`flagged` back in (that refusal is deliberate; it is the drift detector).
- **GOTCHA (why the lock is FIRST)**: `answers.jsonl` is append-only and never rewritten. An append that
  happens before a lock refusal leaves a permanent answer line whose `turn` names a turn no agent ever ran —
  and AC #1's one-closer-per-turn read and #285's not-a-form counter both key on turns. A phantom turn is
  real pollution in the one file the honesty contract forbids you to clean up. So the refusal is returned
  before anything is written.
- **VALIDATE**: with the portal running, POST two turns concurrently and assert the second is refused with
  the lock's message and wrote no answer line.
- **SATISFIES**: "One run at a time, refused rather than queued"; AC #1.

### 15. UPDATE `portal/server.mjs` — three routes

- **IMPLEMENT**: after the `/api/build/*` block:
  ```js
  if (p === '/api/discovery/config' && req.method === 'GET') return json(res, 200, discoveryConfig());
  if (p === '/api/discovery/session' && req.method === 'POST') {
    const b = await readBody(req);
    return json(res, 200, openSession({ slug: b.slug, provenance: b.provenance, entryMode: b.entryMode,
      depth: b.depth, branch: b.branch ?? null, frontEnd: b.frontEnd, posture: b.posture }));
  }
  if (p === '/api/discovery/turn' && req.method === 'POST') { /* SSE, mirroring /api/build/run */ }
  ```
- **PATTERN**: `portal/server.mjs:84-140` — the `send()` closure with the `open` flag, the `try/catch`
  emitting `{type:'error'}` on the stream rather than the catch-all's JSON body, and `return res.end()`.
- **GOTCHA**: **EVERY PARAMETER NAMED, never `{ ...body }`.** `server.mjs`'s own comment on `/api/build/run`
  is the rule; the architecture doc restates it for these routes.
- **GOTCHA**: The route holds **no shape opinion**: `onLine: (line) => { const ev = turnEvent(line); if (ev)
  send(ev); }`. Nothing is projected inline.
- **GOTCHA**: `origin.mjs` runs before any routing and needs **no change**. Do not touch it.
- **GOTCHA**: A closed socket stops the writes, not the run — same as `/api/build/run`. The tokens are
  already spent and the package should still be written.
- **VALIDATE**: `cd portal && npm start` then
  `curl -s localhost:4747/api/discovery/config | head -c 400` and
  `curl -s -X POST localhost:4747/api/discovery/session -H 'content-type: application/json' -d '{"slug":"tmp-check","provenance":"fictional","entryMode":"blank-idea","depth":"scope-check","frontEnd":"portal","posture":"think"}'`
- **SATISFIES**: ticket §Routes; AC #6.

### 16. UPDATE `portal/public/index.html` + `portal.js` + `portal.css` — the minimal surface

- **IMPLEMENT**: a `Discovery` button in the header bar, a `#discovery-drawer` mirroring `#builder-drawer`,
  and in `portal.js` a `discovery` state object with: `loadDiscoveryConfig()` (shows the auth line from
  `hasToken`), a start form (slug · provenance · depth · posture), then per turn: the question text + its
  attribution + stage, a textarea, a Submit button, an SSE log (`portal-phase-log`) rendering `text` /
  `op` / `denied` events, and after `done` a re-fetch of the session so the cursor advances.
- **PATTERN**: `portal/public/portal.js:541-596` — the SSE reader loop, verbatim in structure.
- **GOTCHA**: **Never render the `weakAnswer` note.** It is the agent's rubric; showing it hands the person
  the answer. The config route serves the whole bank, so this is a discipline in the render function —
  state it in a comment.
- **GOTCHA**: 44×44 minimum targets (PRD Q4). There is no gate for this — the portal is not in the VR page
  set — so it is honoured by review and recorded in the PR report.
- **GOTCHA**: `esc()` every value that reaches markup, including the agent's own text.
- **GOTCHA**: **C2 — no AI slop in UI copy either.** Every label, button, status line and empty state in
  this drawer goes past `~/.claude/skills/_shared/slop-blacklist.md`, the same pass Task 9 runs on the
  posture prompt. The epic's C2 covers "anywhere a human reads it", and a drawer is squarely that.
- **GOTCHA**: `hidden` is defeated wherever a CSS rule sets `display` — `portal.css` already carries
  `[hidden]` handling for the drawers; reuse `portal-drawer`, do not invent a new container.
- **VALIDATE**: open `http://localhost:4747`, start a session, submit one answer, watch the log stream, and
  **reload the page mid-session** — the same question comes back and no content is lost (AC #5).
- **SATISFIES**: "A minimal one-question UI — enough to run the spine"; AC #5, AC #6.

### 17. UPDATE `tooling/build-checks.mjs` — the header, the index and the imports

- **IMPLEMENT**: change the "TWO NAMED EXCEPTIONS import portal/ code" paragraph to **THREE**, adding
  `· group 30 (#284) imports portal/lib/discovery.mjs and portal/lib/discovery-postures.mjs — the session
  module and the posture. Both are statically SDK-free; the SDK lives in discovery-transport.mjs, which
  this graph never reaches.` Add the `30 discovery session` line to the group index. Add the imports
  beside the existing `discovery/` ones.
- **GOTCHA**: The `28.x` comment labels INSIDE group 29 ("discovery ops") are cosmetic drift from #281/#282's
  renumbering. Groups are named, not positional. **Leave them alone** — surgical changes only.
- **GOTCHA**: line 4's "Twenty-three groups" is pre-existing drift. Leave it.
- **VALIDATE**: `node tooling/build-checks.mjs` still prints 29 groups and exits 0 before the new group lands.
- **SATISFIES**: AC #4 (the gate is reachable at all).

### 18. ADD `tooling/build-checks.mjs` — group 30, "discovery session"

- **IMPLEMENT**, each case driven by data rather than true by construction:
  1. **`turnEvent`, all four branches** — a `text`, an `op`, a `denied` line each projected with the exact
     key set asserted; a `meta`-shaped line and four junk values each → `null`.
  2. **The whitelist mutation** — add `secret: 'x'` to a `text` line and to an `op` line's `params`, assert
     neither appears anywhere in `JSON.stringify(turnEvent(line))`. *This is the case that decides whether
     the whitelist is a whitelist.*
  3. **The cap** — a 9000-char text line projects at `TURN_EVENT_TEXT_MAX` with `truncated: true`; an
     800-char one projects whole with `truncated: false`.
  4. **`TOOL_SCHEMA` ↔ `PARAMS`, by name, both directions** — `Object.keys(TOOL_SCHEMA)` deep-equals `OPS`;
     for each op, `Object.keys(TOOL_SCHEMA[op])` deep-equals `PARAMS[op]` **in order**; the enum-valued
     fields deep-equal `LEVELS` / `SOURCES` / `PROVENANCE` **by member, not by length** (the #284 comment's
     ask, closing spike 1's P1 gap). Plus every type code is in `TOOL_TYPES`.
  5. **`toolNameFor`** — `mcp__discovery__record_decision` etc. for all four; the server name pinned.
  6. **Roots and the provenance branch** — `fictional` resolves under `REPO_DIR/discovery/`; `real` resolves
     under `JOBS_DIR/_discovery/`; a real run whose root lands inside `REPO_DIR` **throws** (drive it by
     passing a `JOBS_DIR`-inside-the-repo root, not by construction); an unknown provenance throws naming
     both values.
  7. **`assertRunSlug`** — the happy case plus junk (`''`, `'A'`, `'a/b'`, `'../x'`, 49 chars, `null`, `7`),
     each refused with the value in the message.
  8. **`nextRef`** — `a1` over `[]`, `a3` over two, and stable over a store whose refs are out of order.
  9. **The cursor** — synthetic transcripts: zero ops → index 0; one closing op → index 1; a non-closing
     `file_evidence` → unchanged; a `denied` line → unchanged; past the end → `done: true`, `question: null`.
  10. **The line constructors** — `textLine`/`opLine`/`deniedLine` produce exactly the key sets
      `discovery/README.md` documents, and `opLine` copies `seq`/`closes`/`flagged`/`supersedes` through
      **unchanged** (mutate the input record after the call and re-read to prove it did not alias).
  11. **The posture** — `POSTURES.think` names a model and it is `claude-sonnet-5`; `build()` returns a
      `systemPrompt` containing the yield-contract sentence and **both halves of MVP 6**, and a `prompt`
      containing the answer's ref, the answer text and the question's `weakAnswer`; `build()` over junk
      throws rather than producing a prompt with `undefined` in it.
  12. **The source pin** — `portal/lib/discovery.mjs` and `portal/lib/discovery-postures.mjs` contain no
      `claude-agent-sdk` and no `from 'zod'` import line, and no `document`/`window` reference. Mirrors the
      bank group's zero-import pin at `tooling/build-checks.mjs:5236`.
  13. **Purity** — `turnEvent` called twice on the same line deep-equals; mutating its return does not
      change the input line.
  14. **`allowsToolName`, exhaustively** — the four `mcp__discovery__<op>` names allowed; `Write`, `Edit`,
      `Read`, `Bash`, `Grep`, `Glob`, `WebSearch`, `WebFetch`, `mcp__discovery__record_stub`,
      `mcp__other__record_decision`, `mcp__discovery__`, `''`, `null`, `7` and `{}` each refused. Built by
      mapping `OPS`, so a renamed server fails and a fifth verb passes without an edit here.
  15. **`assertTurnWritable`** — accepts a turn with no closing op, a turn carrying only `file_evidence`,
      and a turn carrying only a `text` line; **throws** on a turn already closed by a `record_decision`
      and on one closed by a `flag_weak_answer`, each message naming the turn and the closing seq.
  16. **The posture's three exported strings** — `YIELD_CONTRACT`, `MVP6_LINE` and `LADDER_BRIEF` are each
      non-empty and each appears **verbatim** inside `buildThinkTurn(...).systemPrompt`. That is what makes
      spike 2's branch 2 a one-line diff the gate notices, rather than an edit buried in a template literal.
- **PATTERN**: group 29's fixture/`threw` idiom at `tooling/build-checks.mjs:5263-5290`; the `ok(cond, msg)`
  + one `group(name, detail)` line at the end.
- **GOTCHA**: **The check must be able to fail.** For each of cases 2, 4 and 6, temporarily break the source,
  watch the group go red, restore, and **record that in the PR report**. This is the epic's central rule.
- **GOTCHA**: The group must not import `portal/lib/discovery-transport.mjs`, `portal/server.mjs` or the
  SDK. Prove it the way group 8's invariant is proven — by ABSENCE, running the gate with no
  `portal/node_modules` reachable.
- **UPDATE**: the footer string `all 29 groups pass` → `all 30 groups pass`.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 30 groups pass`, exit 0.
- **SATISFIES**: AC #4.

### 19. RUN the transport pre-flight — zero tokens, before a single token is spent

- **IMPLEMENT**: `preflightTransport()` in `discovery-transport.mjs`, plus a `--preflight` standalone guard:
  `node lib/discovery-transport.mjs --preflight` (run from `portal/`). It builds the **real** server from
  the **real** `TOOL_SCHEMA` over a temp root holding two stub answers, then calls the bundled `McpServer`'s
  own `tools/list` and `tools/call` handlers **directly, in this process** — no `query()`, no model, no cost
  — and asserts seven rows:
  · **PF1** the advertised tool-name set equals `OPS`;
  · **PF2** each advertised `required` array equals `PARAMS[op]` **by name and order**, and each enum-valued
    property equals `LEVELS` / `SOURCES` / `PROVENANCE` **by member** — closing spike 1's P1 cardinality gap,
    which is the deferred F5 finding recorded as a comment on this ticket;
  · **PF3** `question_id: null` reaches the handler as JSON `null`, not the string;
  · **PF4** a valid `record_decision` is FILED and an `op` line lands in the temp transcript with the
    applier's `seq`, `closes` and `flagged` intact;
  · **PF5** an unresolvable `answer_ref` returns `{ isError: true }` carrying the applier's message
    **verbatim** — never a throw;
  · **PF6** an out-of-enum `level` is refused by the schema layer **before** the handler (assert the handler
    recorded no call for it);
  · **PF7** a second closing op on the same turn returns `isError` naming the turn — R2 reaching the agent
    through the transport, not only through the applier.
  Prints a PASS/FAIL table; exits non-zero on any failure.
- **PATTERN**: `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs:76-110` — the
  `server.instance.server._requestHandlers` map and the `direct(method, params)` helper. Copy it.
- **GOTCHA**: it reads a **private API** (`Protocol._requestHandlers`). Spike 1 recorded the same caveat: if
  a later SDK renames it, the pre-flight must report `unreachable` and exit non-zero **loudly**, never pass
  vacuously. Write that branch explicitly.
- **GOTCHA**: run it against a **temp root**, never a real package directory.
- **WHY THIS TASK EXISTS**: it turns the two spike-1 findings (R2) from "remember the GOTCHA" into "a check
  fails if you forgot", and it proves the whole transport — schema, handler, refusal shape, R2 — for **zero
  tokens**, before the one committed run. Every defect it catches is a defect that would otherwise cost a
  re-run of the real session.
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --preflight` → seven rows PASS, exit 0. Then
  **mutate** `TOOL_SCHEMA`'s `level` enum to five members, watch PF2 go red, restore. Record it.
- **SATISFIES**: AC #4's spirit; the #284 comment's ask; de-risks AC #1 and AC #2 at zero cost.

### 20. RUN the real session — three banked questions, one thin

- **IMPLEMENT**: With the portal running and `npm install` done in `portal/`:
  · slug: `spine-meridian-1` · provenance `fictional` · entry mode `blank-idea` · depth `scope-check`
  (its first three ids are `s4-appetite`, `s4-rabbit-holes`, `s4-out-of-bounds`) · front end `portal` ·
  posture `think`.
  · Answer question 1 properly, question 2 **thin** (deliberately: no number, no time, no named risk), and
  question 3 properly. **Reload the page between turns 2 and 3** to exercise AC #5.
  · Then `closeSession` (a "Finish" control or a direct call) so `endedAt` lands.
- **GOTCHA**: **Never hand-write or hand-edit an answer, a transcript line or an op.** A run that reads
  badly is fixed by a tighter posture prompt and a **re-run** under a new slug, never an edit
  (`discovery/README.md`'s honesty rules; CLAUDE.md's trace rule extended).
- **GOTCHA**: The session must be answered honestly as the operator — the answers are the operator's own
  words about a fictional product, and they are committed.
- **VALIDATE**:
  Run from the REPO ROOT (there is no root `package.json`, so `node -e` is CJS there; from `portal/` it is
  not, which is why this reads the files through `node:fs` explicitly):
  ```bash
  node -e "import('node:fs').then(({readFileSync:r})=>{const d='discovery/spine-meridian-1';\
  const t=r(d+'/transcript.jsonl','utf8').trim().split('\n').map(JSON.parse);\
  const a=r(d+'/answers.jsonl','utf8').trim().split('\n').map(JSON.parse);\
  const closers={};for(const l of t) if(l.type==='op'&&l.closes) closers[l.turn]=(closers[l.turn]||0)+1;\
  console.log('answers',a.length,'lines',t.length,'closers',closers,\
  'kinds',[...new Set(t.map(l=>l.type))],'ops',t.filter(l=>l.type==='op').map(l=>l.op));})"
  ```
  Assert: **exactly one closer per banked turn**, at least one `text` line per turn, at least one
  `flag_weak_answer` (the thin answer), and `run.json`'s `turnStats` holding three entries.
- **VALIDATE (AC #5's second half — the server restart)**: between turns 2 and 3, kill the node process
  (`Ctrl-C` in the portal terminal), `npm start` again, re-open the same slug through
  `POST /api/discovery/session`, and assert the answers, the transcript and the cursor all come back and the
  cursor sits exactly where it did. **Two things are expected to reset and neither is a bug**: the in-memory
  `inFlight` lock, and the SDK's own conversation cache (the next turn resumes by `sessionId` from
  `run.json`). Record both in the report so a lost cache is not later read as lost content.
- **SATISFIES**: AC #1, AC #2, AC #5 (both halves).

### 21. UPDATE `discovery/README.md` — the two amendments this ticket earns

- **IMPLEMENT**: (a) `run.json` gains `turnStats: [{ turn, numTurns, durationMs, costUsd, ok, ts }]`, with
  one line saying why (the 30-question read is a latency and turn-count read, not a price). (b) the `denied`
  line's description widens from "a fence denial" to "a refused write — a fence denial, an applier refusal,
  or a schema-layer refusal — with the tool named", and one line records **why**: refusals surface on
  `PostToolUseFailure`, so that hook is the only record point for a schema-layer refusal. (c) replace
  §Workflow's "There is no recorder yet — **#284 adds it**" with the real workflow: start a session in the
  portal, one question per turn, the package appears under the provenance's root.
- **GOTCHA**: Detail goes to the README, never back into CLAUDE.md — CLAUDE.md's index-not-specification
  rule. CLAUDE.md's `discovery/` map line already names the recorder as #284; update that clause to say it
  landed, and nothing more.
- **VALIDATE**: read the diff; assert no invariant is now stated in two places.
- **SATISFIES**: the run-package format stays true; CLAUDE.md §Ground rules.

### 22. WRITE the spike-2 verdict into the PR report

- **IMPLEMENT**: `.claude/reports/discovery-spine-run-package-284-report.md`, carrying:
  · the decision-rule branch taken, quoted from the ticket, with the evidence;
  · **the numbers**: per-turn `durationMs`, `numTurns`, `costUsd` from `run.json`'s `turnStats`, and the
    extrapolation to a 30-question session (state it as **derived**, showing the arithmetic);
  · whether the agent ran ahead, batched, or skipped a filing — read from the transcript, not from memory;
  · the bounded claim about the fence: `tools: []` left nothing for the deny branch to deny, so the MCP
    deny path stays **unproven**; #287 owns it;
  · the four mutations — Task 18's three plus Task 19's PF2 — and what each did when broken;
  · the pre-flight's seven rows, PASS/FAIL, with the SDK and zod versions they ran against;
  · the 44×44 review note (no gate covers the portal).
- **BRANCH**: if the run came back dirty — the agent asked a second question, filed two closing ops on one
  turn, or filed nothing — take the decision rule's branch **in this PR**: tighten the yield contract in
  `discovery-postures.mjs` (one exported string) and re-run under a NEW slug. If it is still dirty, add the
  `Stop` hook (refuse the yield when the turn filed nothing) **before any width is built**, and record that
  the prompt could not hold it. Both re-runs are committed; the failed run is kept, not deleted — a run
  that read badly is the governance story.
- **VALIDATE**: every number in the report traces to a committed file.
- **SATISFIES**: AC #3.

### 23. COMMIT and open the PR

- **IMPLEMENT**: one atomic commit, message = what + doc reference. PR body carries **`Closes #284`**, plus
  the plan, the report and (after review) `.claude/code-reviews/pr-<N>-review.md`.
- **GOTCHA**: A PR TITLE saying `(#284)` closes nothing. The trailer is in the BODY.
- **GOTCHA**: Deploy = commit the artifacts. The run package is committed; nothing is gitignored.
- **VALIDATE**: `gh pr view --json body -q .body | grep -c 'Closes #284'` → 1.
- **SATISFIES**: CLAUDE.md §Ground rules → Git.

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-check** (CLAUDE.md §Testing). "Done" = run the surface you
touched. Which gate proves what → `.claude/references/gates.md`.

### Unit-equivalent: `tooling/build-checks.mjs` group 30

Everything reachable without an agent or a token: the projection, the schema table, the roots, the slug
guard, the ref allocator, the cursor, the line constructors, the posture, the source pins, purity. Runs in
CI where `portal/node_modules` does not exist — which is exactly what proves the SDK isolation.

### Pre-flight: `node lib/discovery-transport.mjs --preflight` (Task 19)

The whole transport — the advertised schema against the grammar by name, the handler, the refusal shape, R2
through the tool — for **zero tokens**, before the committed run. It reads a private SDK API and must fail
loudly rather than pass vacuously if that API moves.

### Integration-equivalent: the running portal

The three routes answered against a live server; a session started, resumed after a reload, and closed; two
concurrent turns with the second refused by the lock.

### End-to-end: the real run (Task 20)

Three banked questions, one thin, one reload. This is simultaneously the acceptance test and spike 2's
experiment.

### Edge cases that must be exercised

- An `answer_ref` that does not resolve — already gated by group 29; the transport's job is only to convert
  the throw into `{ isError: true }`. Observe it in a run if the agent invents a ref; do not manufacture it.
- A second closing op on one turn — R2. Gated by group 29; observed in the run's transcript by the
  one-closer-per-turn assertion in Task 19.
- A schema-layer refusal (an out-of-enum `level`) — its only record point is `PostToolUseFailure`.
- A page reload mid-session — AC #5.
- A second concurrent run — refused, not queued.
- `HAS_TOKEN` false — the config route still answers and the UI says the session falls back to the CLI login.

---

## VALIDATION COMMANDS

### Level 1: Syntax and static shape

```bash
node --check portal/lib/discovery.mjs
node --check portal/lib/discovery-postures.mjs
node --check portal/lib/discovery-transport.mjs
node --check portal/server.mjs
# the SDK isolation, proven by absence — both must print nothing:
grep -n "claude-agent-sdk\|from 'zod'\|from \"zod\"" portal/lib/discovery.mjs portal/lib/discovery-postures.mjs
```

### Level 2: The gate, and the zero-token pre-flight

```bash
node tooling/build-checks.mjs                       # → build ✓  all 30 groups pass, exit 0
cd portal && node lib/discovery-transport.mjs --preflight   # → 7 rows PASS, exit 0, zero tokens
```

### Level 3: The modules load without portal deps

```bash
node -e "import('./portal/lib/discovery.mjs').then(m=>console.log(Object.keys(m).sort().join(' ')))"
node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(Object.keys(m.POSTURES)))"
```

### Level 4: The running portal

```bash
cd portal && npm install && npm start &
curl -s localhost:4747/api/health
curl -s localhost:4747/api/discovery/config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log(c.questions.length,'questions',c.depths.map(d=>d.id).join('/'),'hasToken',c.hasToken)})"
```
Then, in a browser at `http://localhost:4747`: start the session, submit one answer, reload, submit again.

### Level 5: The run package

The `node -e` assertion in Task 20, plus:

```bash
git status --porcelain discovery/          # the package is untracked-then-added, never gitignored
node -e "console.log(JSON.parse(require('fs').readFileSync('discovery/spine-meridian-1/run.json','utf8')))"
```

---

## ACCEPTANCE CRITERIA

Verbatim from #284, plus the two this plan adds.

- [ ] **AC1** A real run over three banked questions, one thin, produces `run.json` + `answers.jsonl` +
      `transcript.jsonl` with **exactly one closing op per banked-question turn**.
- [ ] **AC2** Turn count, tokens and **per-turn latency** recorded as the input to the 30-question read.
- [ ] **AC3** The spike verdict recorded in the PR report against the decision rule, including a `Stop` hook
      if the prompt could not hold the yield.
- [ ] **AC4** The SSE projection whitelist is gated in `build-checks` (pure, no SDK).
- [ ] **AC5** A page reload resumes the session from disk; a server restart loses no recorded content.
- [ ] **AC6** `HAS_TOKEN` surfaced on the config route the way `/api/build/config` does it.
- [ ] **AC7** (plan) `portal/lib/discovery.mjs` and `discovery-postures.mjs` are statically SDK-free and
      zod-free, proven by `build-checks` running with no `portal/node_modules`.
- [ ] **AC8** (plan) `discovery/README.md` and CLAUDE.md's `discovery/` map line match what shipped.

---

## COMPLETION CHECKLIST

- [ ] All 23 tasks completed in order
- [ ] `node tooling/build-checks.mjs` → `all 30 groups pass`, exit 0
- [ ] `cd portal && node lib/discovery-transport.mjs --preflight` → seven rows PASS, exit 0
- [ ] The four mutation checks (Task 18 ×3 + Task 19's PF2) each observed going red, recorded in the report
- [ ] The portal boots, `/api/health` answers, all three discovery routes answer
- [ ] The real run committed under `discovery/spine-meridian-1/`, nothing hand-edited
- [ ] The spike-2 verdict written against the decision rule, with the numbers
- [ ] `discovery/README.md` amended; CLAUDE.md's one map clause updated; no invariant stated twice
- [ ] PR body carries `Closes #284`; plan + report in the same PR
- [ ] No shipped page touched · no VR baseline churned · no `system/` or `agent-layer/` file added
      (the loc-summary tripwire — the architecture doc's "does not apply, and it is a tripwire" row)

---

## RISK REGISTER — every risk, its mitigation, and where the mitigation lives

Four risks were named when this plan was reviewed. Each is either eliminated, converted into a check that
fails, or reduced to a bounded claim that is stated rather than assumed. None is left as a hope.

### R1 — spike 2's own question: does the agent judge one answer, file at most one closing op, and yield?

**Irreducible by planning** — it is an empirical question about a model's behaviour, and the ticket names it
as the risk. What the plan removes is the *cost of being wrong*:

| Mitigation | Where |
|---|---|
| The yield contract is **one exported string**, not prose buried in a template literal | `YIELD_CONTRACT` (Module contracts) |
| Group 30 case 16 pins that string as appearing verbatim in the built prompt, so a tightening is a diff the gate sees | Task 18 |
| All three decision-rule branches are pre-written as tasks, so a dirty run needs the next branch, not a new plan | Task 22 |
| **Branch 3's `Stop` hook is pre-designed** (below), so the worst case is a known ~25-line addition rather than a design problem discovered mid-run | Notes → "The `Stop` hook, pre-designed" |
| Batching is impossible by construction — one op is one tool call | Spike 1's verdict; Task 10 |
| The measurement is defined before the run, so a dirty run is *readable* rather than an impression | Task 20's assertion + Task 22 |

**Residual:** the run may need one re-run under a new slug. Cost: one session, ~$0.30 derived from spike 1's
$0.092 for four turns. Not a plan failure — the ticket budgets for it.

### R2 — the two spike-1 findings the architecture doc gets wrong or omits

*Refusals surface on `PostToolUseFailure`, not `PostToolUse`; the handler returns `{ isError: true }` rather
than throwing.* **Eliminated as a memory problem.** Task 19's pre-flight drives both for zero tokens: PF5
asserts the handler's refusal comes back as `isError` carrying the applier's message verbatim, PF6 asserts a
schema-layer refusal never reaches the handler, PF7 asserts R2 reaches the agent through the transport. If
the implementation forgets either finding, the pre-flight goes red **before a token is spent**. The
architecture-doc discrepancy is recorded in the transport's header rather than silently diverged from.

### R3 — the MCP fence's deny path is unobserved

**Split into a proven half and a stated half.** The predicate `allowsToolName` moves to the SDK-free module
and group 30 case 14 drives it exhaustively — four names allowed, fifteen refused, built by mapping `OPS` so
a renamed server fails. What stays unproven is the *wiring*: whether a `deny` from `canUseTool` or the
`PreToolUse` hook actually blocks an MCP call. `tools: []` leaves nothing to deny, and manufacturing a probe
by denying one of the four op tools would be theatre. The report states exactly this and no more; #287 owns
the wiring half and its first fenced run gets it for free.

### R4 — the write ordering (lock → guards → append → run)

**Converted from a convention into a guard.** `assertTurnWritable(transcript, turn)` refuses an answer
landing on a turn that already carries a closing op — the damage class a wrong order produces — and group 30
case 15 drives it both directions. The ordering itself is stated once, in Task 14, with pseudocode that
matches it and the reason (an append-only file the honesty contract forbids you to clean up).

### R5 — a shipped-page or generated-artifact regression sneaks in

**Structurally impossible for this ticket, and worth saying so.** `agent-layer/gen-loc-summary.mjs` counts
`system/`, root + `proto/` pages and `agent-layer/` only. Every file this plan touches is under `portal/`,
`tooling/`, `discovery/` or `docs/` — none of which match a loc group — so `loc-summary.json` does not move,
`approach.html` re-renders nothing, and no VR baseline churns. The architecture doc calls this row "a
tripwire, not an exemption": **if any task ends up wanting a file under `system/` or `agent-layer/`, stop —
the epic has stopped being additive and that is a decision, not an implementation detail.**

---

## OPEN QUESTIONS / ASSUMPTIONS

**A1 — a fourth module the ticket does not list.** `portal/lib/discovery-transport.mjs` is not in the
ticket's file estimate. It is **forced by AC #4**: `build-checks` must import `discovery.mjs`, and CI has no
`portal/node_modules`, so the SDK and zod cannot be in that file's static graph. The repo's existing answer
is a three-layer split (`builder.mjs` → `record-composition.mjs` → `trace-recorder.mjs`), mirrored here. The
alternative — a lazy `await import('@anthropic-ai/claude-agent-sdk')` inside `discovery.mjs` — also works,
but puts the session state and the SDK wiring in one ~900-line file and makes the invariant a placement rule
rather than a file rule. **Assumed: the split. Flag at review if the owner wants the single file.**

**A2 — the run slug is `spine-meridian-1`.** Not `faster-payment-run-1`, which #291 needs, and not a name
that reads as run 1. `traces/` is a flat namespace and slugs must be globally unique; `discovery/` should
follow the same discipline. Change it freely if the owner prefers another name.

**A3 — depth `scope-check`, questions 1-3.** `selectDepth('scope-check')` returns six ids beginning
`s4-appetite`, `s4-rabbit-holes`, `s4-out-of-bounds`. Three banked questions is what AC #1 asks for; the
session is closed after three rather than run to six, so the spine's cost is bounded. `branch` is `null` —
the branch selectors are #283's and do not exist in `bank.mjs` today.

**A4 — `turnStats` on `run.json`.** AC #2 needs per-turn latency recorded somewhere and the README's three
files have no home for it. A fourth file would be more shape for less; the header is already mutable
(`endedAt`). Task 20 amends the README in the same PR.

**A5 — `denied` lines widen to cover refusals.** The README calls a `denied` line "a fence denial". Spike 1
proved a schema-layer refusal's only record point is `PostToolUseFailure`, and a refused op is exactly the
receipt the honesty contract keeps. Widening `denied` is cheaper than a fourth line type, and it keeps the
three-type contract `traces/README.md` set. Amended in Task 20.

**A6 — the MCP deny path is half-proven, and the halves are named.** The *predicate* is gated exhaustively
in CI (group 30 case 14). The *wiring* — whether a `deny` from either call site actually blocks an MCP call
— stays unobserved, because `tools: []` leaves nothing to deny and denying one of the four op tools to
manufacture a probe would be theatre. The report claims exactly the proven half. #287 owns the wiring.
**Flag if the owner wants a cheap one-turn probe instead.** See §Risk register R3.

**A7 — no redaction on `answers.jsonl`.** `redact.mjs` is `trace-recorder.mjs`'s contract for agent output.
`answers.jsonl`'s contract is verbatim, never rewritten. A redacted answer is a rewritten one. Committed
fictional runs carry the operator's own words about a fictional product; real runs land outside the repo.

**A8 — one drawer, not a hash route.** `#288` owns the UI at width and explicitly says "a hash route plus
render functions". The spine reuses the `portal-drawer` pattern because it is the cheapest surface that runs
one question, and #288 replaces it. If the owner would rather the hash route land now, it is a small change.

**Q1 — does the agent need the BABOK ladder explained, or will it pick a level from the enum alone?**
Assumed: explained, one line each, in the system prompt. Spike 1's enum refusal shows the schema layer
enforces membership but says nothing about correct choice. If the run picks levels badly, that is a posture
tightening, not a grammar change.

## NOTES (open canvas)

### Why the transport split is the whole architecture in one file boundary

```
CI (no portal/node_modules)
  └── tooling/build-checks.mjs  ──imports──►  portal/lib/discovery.mjs        ✔ loads
                                                    │  (zero SDK, zero zod)
                                                    │
                                              ──lazy import at run time──►  discovery-transport.mjs
                                                                                  │  zod + SDK
                                                                                  ▼
                                                                            createSdkMcpServer
                                                                            4 tools = 4 op verbs
                                                                                  │
                                                                                  ▼
                                                                            discovery/ops.mjs applyOp
                                                                            (throws → { isError: true })
```

If the SDK import were static in `discovery.mjs`, group 30 would fail in CI with
`Cannot find package '@anthropic-ai/claude-agent-sdk'` — which is precisely how group 8's invariant is
proven for `builder.mjs`. The absence IS the check.

### The turn, end to end

```
human types  ──►  POST /api/discovery/turn
                    │ 1. guards (slug, root, cursor, question match, non-empty text)
                    │ 2. acquire the run lock  ← refused, not queued
                    │ 3. appendAnswer → a7 lands in answers.jsonl   ◄── BEFORE the agent
                    │ 4. lazy import the transport
                    │ 5. query() resume: run.json.sessionId, maxTurns 6, tools: []
                    │      ├─ assistant text  ──► transcript `text` line ──► SSE
                    │      ├─ mcp__discovery__flag_weak_answer(a7) ──► applyOp
                    │      │     ok   ──► transcript `op` line (seq, closes) ──► SSE
                    │      │     throw ──► { isError:true } ──► agent corrects in-turn
                    │      │              └─ PostToolUseFailure ──► `denied` line ──► SSE
                    │      └─ result ──► turnStats into run.json
                    │ 6. release the lock; cursor advances iff the turn closed
                    ▼
              the package on disk is the whole state
```

### Rejected alternatives

| | Alternative | Why not |
|---|---|---|
| One SDK tool `file_op(op, params)` with a JSON blob | Fewer tools, one schema | Throws away the schema layer's free validation — spike 1 observed `-32602` refusing an out-of-enum `level` *before* the handler. Four tools means four typed boundaries. |
| Store the cursor in `run.json` | Simpler read | Two records of one fact drift. `ops.mjs`'s `emptyRun()` comment already refuses this for "closed"; the cursor is the same shape of mistake. |
| Cap projected text at 400 like `stepEvent` | Consistency | The pushback prose is the content, not progress. A 400-char cap breaks the loop rather than bounding a log. |
| Record ops on `PostToolUse` | The obvious hook | Spike 1: only *filed* calls surface there. Every refusal — handler or schema — surfaces on `PostToolUseFailure`. Writing from the handler + the failure hook covers both with no double-record. |
| Redact `answers.jsonl` | Safety by default | It is the one file whose contract is *verbatim, never rewritten*. Redaction would make the honesty claim false in the mirror direction. |

### The `Stop` hook, pre-designed — so branch 3 is an addition, not a discovery

The decision rule's third branch is *"add the `Stop` hook (refuse the yield when nothing was filed) before
any width is built"*. Designing it now costs a paragraph and removes the only part of R1 that could stall an
implementation mid-run.

```js
// portal/lib/discovery-transport.mjs — registered ONLY when the posture asks for it, so the
// spine's first run is the unforced measurement spike 2 needs.
Stop: [{ hooks: [async () => {
  const filed = state.current.ops.length > opsAtTurnStart;
  if (filed) return { continue: true };
  if (++stopRetries > 1) return { continue: true };   // one nudge, never a loop
  return { decision: 'block', reason:
    'This turn filed nothing. Judge the answer against its weak-answer note and call exactly one of ' +
    `${OPS.join(', ')} before you stop.` };
}] }],
```

Three properties that make it safe rather than clever: it counts ops **filed this turn** (a fold over
`state.current.ops` filtered by `turn`), never a global total; it nudges **once** and then yields regardless,
because a hook that can refuse forever is a hung session; and it is **off by default**, because a hook that
is always on makes the yield contract untestable — the run would prove the hook, not the prompt.

### If the run goes wrong — the failure-mode table

Read the transcript, then act. Nothing here is a reason to hand-edit a file.

| Observed in `transcript.jsonl` | Reading | Action |
|---|---|---|
| Two closing ops on one turn | Impossible — the applier refuses it (R2) | If seen, the *server* handed the wrong `ctx.turn`. Fix Task 14's turn derivation, re-run |
| A turn with `text` lines and no `op` | The agent skipped the filing | Decision rule branch 2: tighten `YIELD_CONTRACT`, re-run under a new slug |
| One turn's `text` naming two banked questions | Running ahead | Branch 2, then branch 3 if it recurs |
| `denied` lines carrying `-32602` | A schema-layer refusal — the agent sent a bad enum or missed a field | Expected and healthy if the agent then corrects. If it never corrects, the tool description is unclear (Task 10) |
| `denied` lines carrying "does not resolve" | The agent invented an `answer_ref` | The grammar worked. Note it in the report as evidence the teeth bite |
| `numTurns` at the `maxTurns` ceiling of 6 | The agent looped inside one turn | Read the text lines before raising the cap — a raised cap hides the symptom |
| The run reads badly overall | — | **Re-run under a NEW slug. Never edit a line.** Keep the bad run; a run that read badly is the governance story |

### What good looks like — the three files after turn 1

Written here so "done" is recognisable rather than argued about.

```jsonl
# answers.jsonl
{"ref":"a1","ts":"2026-…Z","turn":"t1","question_id":"s4-appetite","kind":"banked","text":"Six weeks, one person…"}

# transcript.jsonl
{"type":"text","ts":"…Z","turn":"t1","text":"That names a team size and a duration…"}
{"type":"op","ts":"…Z","seq":1,"turn":"t1","op":"record_decision",
 "params":{"question_id":"s4-appetite","answer_ref":"a1","level":"business","parent_id":null,
           "evidence_refs":[],"wrong_if":"…","off_script":false},
 "closes":true,"flagged":["no-evidence"],"supersedes":null}
```

`run.json` then carries `sessionId` and one `turnStats` entry. **One closer on `t1`. One answer line. At
least one text line.** That triplet is the spine working.

### Spike 2, stated as an experiment rather than a hope

**Question:** under resume-per-turn, does the agent judge one answer, emit at most one closing op and yield?

**Measured from the transcript, not from impression:**
`closers per turn` (must be exactly 1) · `text` lines per turn (a second question inside one turn reads as
running ahead) · turns that filed nothing · `numTurns` per SDK run (a clean turn is ~2-4; spike 1's
three-call run was 4) · `durationMs` per turn.

**The three branches are already written into Task 21**, so a dirty result does not need a new plan — it
needs the next branch, in this PR.

## CONFIDENCE

**9.8 / 10** for one-pass implementation success.

What carries it there:

- **The mechanism is observed, not reasoned.** Spike 1 ran the in-process tool end to end and its script is
  a committed, working reference — the schema shape, the handler's refusal form, the fence call sites and
  the hook that carries refusals are all facts with line numbers, not guesses.
- **The grammar and the bank already exist and are already gated** (groups 28 and 29). This ticket calls
  them; it does not re-derive them.
- **Every name is decided** in §Module contracts, so no task can invent an export.
- **Zero-token proof before the paid run.** Task 19's pre-flight drives the schema against `PARAMS` by name,
  the handler, the refusal shape and R2 through the transport for nothing. Historically this is where a
  one-pass attempt fails — a bad schema discovered by burning a session — and it is now a check.
- **Every risk is either eliminated, converted into a failing check, or stated as a bounded claim.** See
  §Risk register: R2 becomes the pre-flight, R3 splits into a gated predicate plus an honest gap, R4 becomes
  `assertTurnWritable`, R5 is structurally impossible.
- **The one genuinely unknown answer cannot stall the work.** Spike 2's three branches are pre-written as
  tasks and branch 3's `Stop` hook is pre-designed, so the worst case is a re-run under a new slug plus a
  ~25-line hook — both budgeted by the ticket.

The remaining 0.2 is the honest floor: the run is a live agent session against a real subscription, and no
plan makes a model's behaviour deterministic. It cannot be planned away, only made cheap to be wrong about,
which is what §Risk register R1 does.

---

## AMENDMENTS

**2026-08-28 — the epic was re-sequenced; this ticket gained the session surface and five small
corrections.** Epic #279's §Suggested execution order now runs `#284 → #290 → Run 0 (#338)`, deferring
#283/#285/#286/#287/#289 until a real session says whether they are needed, and moving #288 to after it.
The PRD is amended (§Amendments) and each deferred ticket carries the question Run 0 answers for it.

**M1 — the drawer widens (Task 16), because #288 is deferred.** The plan's "a drawer good enough to run
one question" now has to carry a full session. Three ACs added on the ticket (#284 comment 2026-08-28):
**AC9** the next banked question renders in place after a closed turn, with `n of N` and the depth label;
**AC10** the turns already recorded are visible while answering (question · answer ref · what was filed),
read from `sessionView` and never a second client-side copy; **AC11** a `Finish` control calling
`closeSession`. Still NOT in scope: both entry modes, a designed depth chooser, the three header buttons,
the package view as a browsable artifact, styling beyond the existing `portal-drawer` vocabulary.

**M2 — `turnStats` records tokens, not only cost (AC #2).** The plan's stats are
`{ turn, numTurns, durationMs, costUsd, ok, ts }`; AC #2 says "turn count, **tokens** and per-turn
latency". `costUsd` is money. The `result` message carries `usage`, so `turnStats` gains
`inputTokens` · `outputTokens` · `cacheReadTokens` · `cacheCreationTokens`, and Task 21's README line
names them. Without this the 30-question extrapolation cannot be recomputed from the package.

**M3 — `assertProvenanceRoot(provenance, root)` stays two-arg and reads nothing.** `JOBS_DIR` is an
import-time const in `env.mjs`, so the gate cannot repoint it. If the function reached for `JOBS_DIR`
internally, group 30 case 6 ("a real run whose root lands inside `REPO_DIR` throws") would be true by
construction — the check that cannot fail, which is the epic's central rule. The gate hands the root in
directly. Compare `path.resolve`d paths, per Task 1's own gotcha.

**M4 — the session id is recorded at `init`, not after the turn.** Task 14's pseudocode calls
`recordSessionId` after `runDiscoveryTurn` returns; a mid-stream throw then loses the id and the next
turn starts a fresh SDK session — which is exactly the content AC #5's server-restart half claims
survives. The transport already holds `root`, so it writes the id when the `init` message arrives and
still returns it. The caller's `recordSessionId` becomes idempotent belt-and-braces.

**M5 — in `zodFor`, nullable is never optional.** Spike 1's observed schema keeps nullable `question_id`
inside `required` (all three fields listed). PF2 asserts advertised `required` equals `PARAMS[op]` by
name and order, so `.optional()` anywhere silently drops a field from `required` and reds PF2. The shape
is built by iterating `Object.entries(TOOL_SCHEMA[op])` so insertion order carries through.

**M6 — `discoveryConfig()` strips each question's `weakAnswer` before serving it.** The plan keeps the
rubric on the wire and forbids rendering it in a comment (Tasks 8 and 16). A comment is deletable; the
wire is not. The posture reads the note server-side through `questionById`, so nothing is lost, and
"the person is never shown the rubric" becomes a property of what the browser can receive. `provenanceNote`
and `note` go too — same reasoning, neither is the person's to read mid-question.

**M7 — the head's `root` and the resolved filesystem root are two different values.** `resolveRunRoot()`
returns an absolute path; `run.json`'s `root` is repo-relative for fictional runs (per
`discovery/README.md`'s example). `head.root` is never fed to `node:fs` — every path is re-resolved from
`{ slug, provenance }`. Stated here because one name for two values is how that gets mixed up later.

