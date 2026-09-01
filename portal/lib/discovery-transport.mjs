// portal/lib/discovery-transport.mjs — the ONE file in the discovery graph that imports
// @anthropic-ai/claude-agent-sdk and zod (epic #279, ticket #284; spike 1's verdict on #279,
// 2026-08-28 — the in-process tool won, and this file is that verdict implemented).
//
// It is LAZY-IMPORTED by portal/lib/discovery.mjs's runTurn, after every guard has passed. Nothing
// imports it statically, which is what lets tooling/build-checks.mjs group 30 import the session
// module in CI where portal/node_modules does not exist. The static import below is therefore fine
// and the invariant lives one file over — see discovery.mjs's header, invariant 1.
//
// FOUR THINGS SPIKE 1 OBSERVED THAT THIS FILE DEPENDS ON:
//
//   1. THE TOOL SCHEMA IS A RAW SHAPE whose values are zod instances from the CALLER'S OWN zod copy
//      (portal/node_modules/zod, 4.4.3) — not z.object(...), and not a plain JSON schema. The SDK
//      wraps the shape in its own bundled zod and advertises draft-07. A plain JSON schema is passed
//      through unchanged and fails on the first call. The two copies interoperate through the _zod
//      protocol; do not try to reach the SDK's.
//   2. A REFUSAL IS AN `isError` RESULT, NEVER A THROW. The agent receives the applier's message
//      verbatim and corrects inside the same turn. Throw only for a bug in this file.
//   3. REFUSALS ARRIVE ON PostToolUseFailure, NOT PostToolUse. Both a handler `isError` result and a
//      schema-layer -32602 refusal surface there, with the message verbatim. A recorder listening only
//      on PostToolUse loses every refusal — and a refused op is exactly the receipt the honesty
//      contract keeps. THIS IS A DISCREPANCY WITH THE ARCHITECTURE DOC, which says PostToolUse "is not
//      needed for the transcript": true for filed ops, false for refused ones. PostToolUse is not
//      registered here at all; the filed line is written by the handler, which already holds the
//      applier's record and its seq, so there is no double-record.
//   4. CLAUDE_CODE_STREAM_CLOSE_TIMEOUT governs SDK MCP handlers running longer than 60 s. An applier
//      is instant, so it does not apply here. Noted because it is the trap the next handler will hit.
//
// Zero-token pre-flight:  cd portal && node lib/discovery-transport.mjs --preflight
// One-turn parenting probe (PAID, ~$0.04–0.10):  cd portal && node lib/discovery-transport.mjs --probe-parenting

import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { applyOp, emptyRun, parentCandidates } from '../../discovery/ops.mjs';
import { QUESTIONS, questionById } from '../../discovery/bank.mjs';
import {
  allowsToolName, appendTranscript, denyReason, fenceHooks, MCP_SERVER, opLine, OPS,
  readAnswers, readTranscript, recordSessionId, textLine, TOOL_SCHEMA,
} from './discovery.mjs';
// The tool descriptions are prompt text and live with the rest of the prompt text (#341) — ONE copy,
// the one group 30 pins and the fingerprint covers. POSTURES is here for the probe only.
import { POSTURES, TOOL_DESCRIPTIONS } from './discovery-postures.mjs';

// A per-turn cap, not a session cap. Resume-per-turn means every turn is a fresh query(), so session
// length is governed by the depth ladder rather than by this number. chat.mjs's 40 is for an open
// conversation and is the wrong number to copy — architecture §Boundaries says so explicitly. A clean
// turn is 2-4 (spike 1's three-call run was 4); 6 leaves room for one in-turn correction after a
// refusal without leaving room for the agent to work through a second question.
const MAX_TURNS = 6;

// --- the schema -----------------------------------------------------------------------------------

// TOOL_SCHEMA's string codes → a zod RAW SHAPE. NULLABLE IS NEVER OPTIONAL: spike 1's advertised
// schema keeps nullable question_id inside `required` (all three fields listed), and .optional()
// silently drops a field from `required`, which PF2 asserts equals PARAMS[op] by name AND order.
// Built by iterating Object.entries so TOOL_SCHEMA's key order carries through to `required`.
export function zodFor(descriptor, op = '?') {
  const shape = {};
  for (const [field, code] of Object.entries(descriptor)) {
    if (Array.isArray(code)) { shape[field] = z.enum(code); continue; }
    switch (code) {
      case 'string': shape[field] = z.string(); break;
      case 'string|null': shape[field] = z.string().nullable(); break;
      case 'int|null': shape[field] = z.number().int().nullable(); break;
      case 'int[]': shape[field] = z.array(z.number().int()); break;
      case 'string[]': shape[field] = z.array(z.string()); break;
      case 'boolean': shape[field] = z.boolean(); break;
      default: throw new Error(`discovery-transport: ${op}.${field} has type code ${JSON.stringify(code)}, which zodFor does not know`);
    }
  }
  return shape;
}

// --- the server -----------------------------------------------------------------------------------

// `state` is a mutable holder ({ current }) because the applier is pure and each accepted op produces a
// NEW ledger the next call in the same turn must fold onto.
export function buildOpServer({ root, turn, state, onLine }) {
  // Zero tokens: a bare run ({ ops }) instead of the holder ({ current: { ops } }) made every op the
  // agent filed refuse as "the state must be { ops: [] }" on the first real turn — the pre-flight built its
  // own holder and could not see it. Refuse the shape here, before query() starts.
  if (!state || !Array.isArray(state.current?.ops)) throw new Error('buildOpServer: state must be the holder { current: { ops: [] } }, not the bare run');
  // Re-read per call: the answers array grows across turns, and a captured stale array makes a later
  // answer_ref unresolvable.
  const ctx = () => ({ answers: readAnswers(root), bank: QUESTIONS, turn });

  const tools = OPS.map((op) => {
    const descriptor = TOOL_SCHEMA[op];
    // A fifth verb with no TOOL_SCHEMA entry fails loudly here rather than being silently skipped —
    // the same rule discovery/ops.mjs's invariant 2 states.
    if (!descriptor) throw new Error(`discovery-transport: "${op}" is in OPS with no TOOL_SCHEMA entry — the verb, its params and its schema move together`);
    return tool(op, TOOL_DESCRIPTIONS[op] ?? `File a ${op} op.`, zodFor(descriptor, op), async (args) => {
      try {
        const next = applyOp(state.current, { op, params: args }, ctx());
        const record = next.ops[next.ops.length - 1];
        // Disk first, holder second: if the append throws (ENOSPC, EACCES) the agent sees isError and
        // the ledger still matches transcript.jsonl, so a same-turn retry is not refused as "already
        // closed" for an op the file never received. The append is its own statement because
        // `onLine?.(append())` short-circuits the ARGUMENT too — with no listener, nothing is written.
        const written = appendTranscript(root, opLine({ record }));
        state.current = next;
        // The listener is not the op: the file and the holder both have it by now, so a listener that
        // throws (an SSE write racing a closed socket) is stderr, never an isError that tells the agent
        // a filed op was refused. Same discipline as fenceHooks' record().
        try { onLine?.(written); }
        catch (e) { process.stderr.write(`discovery-transport: listener error (non-fatal): ${e.message}\n`); }
        const bits = [`filed seq ${record.seq}: ${op}`];
        if (record.closes) bits.push('(turn closed)');
        if (record.flagged.length) bits.push(`flagged ${record.flagged.join(', ')}`);
        if (record.supersedes) bits.push(`supersedes seq ${record.supersedes}`);
        return { content: [{ type: 'text', text: bits.join(' ') }] };
      } catch (e) {
        // Observation 2: the applier's refusal reaches the agent as a RESULT, verbatim, and it
        // corrects inside the turn. A throw here would abort the tool call instead.
        return { isError: true, content: [{ type: 'text', text: e.message }] };
      }
    });
  });

  return createSdkMcpServer({ name: MCP_SERVER, version: '1.0.0', tools });
}

// --- the fence ------------------------------------------------------------------------------------

// allowsToolName, denyReason and fenceHooks all live in discovery.mjs, not here, so group 30 can drive
// the predicate AND run the hook functions in CI (#343) — and the predicate is the seam #287 widens into
// the per-run read allow-list. What the deny branch actually denies at run time (the CLI's subagent
// warmup, never the main session under `tools: []`) is stated above fenceHooks there. canUseTool below
// is the second call site: the permission fast path can auto-allow without consulting it, which is why
// the hook exists at all.

// --- the turn -------------------------------------------------------------------------------------

export async function runDiscoveryTurn({ root, head, question, answer, turn, posture, state, onLine }) {
  // The folded ledger goes INTO the prompt (#341) — the same holder buildOpServer folds onto, so the
  // brief and the applier read one ledger.
  // The run's provenance goes INTO the system prompt (#347): read off run.json's head, never guessed.
  const { systemPrompt, prompt } = posture.build({ question, answer, turn, ledger: state.current.ops, provenance: head.provenance });
  const server = buildOpServer({ root, turn, state, onLine });

  const q = query({
    prompt,
    options: {
      cwd: root,
      model: posture.model,
      maxTurns: MAX_TURNS,
      systemPrompt,
      // undefined, never null: the SDK treats null as a value to resume from.
      resume: head.sessionId || undefined,
      tools: [],          // runtimeTypes.d.ts — "[] (empty array) - Disable all built-in tools"
      allowedTools: [],   // nothing pre-approved, so canUseTool is consulted for the MCP tools
      mcpServers: { [MCP_SERVER]: server },
      canUseTool: async (name, input) => (allowsToolName(name)
        ? { behavior: 'allow', updatedInput: input }
        : { behavior: 'deny', message: denyReason(name) }),
      hooks: fenceHooks(root, turn, onLine),
    },
  });

  let sessionId = head.sessionId ?? null;
  let stats = null;
  let advertised = null;

  for await (const msg of q) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      advertised = msg.tools ?? null;
      sessionId = msg.session_id;
      // Written HERE rather than after the turn returns (plan M4): a mid-stream throw would otherwise
      // lose the id and the next turn would start a fresh SDK session — exactly the content AC #5's
      // server-restart half claims survives.
      try { recordSessionId(root, sessionId); }
      catch (e) { process.stderr.write(`discovery-transport: could not record sessionId (non-fatal): ${e.message}\n`); }
    } else if (msg.type === 'assistant') {
      // The agent's turn text is captured because MVP 6's "the agent may not say an answer is wrong"
      // is only falsifiable from prose. The sentence is kept so it can be checked.
      for (const block of msg.message?.content || []) {
        if (block.type === 'text' && block.text) { const written = appendTranscript(root, textLine({ turn, text: block.text })); onLine?.(written); }
      }
    } else if (msg.type === 'result') {
      const u = msg.usage ?? {};
      stats = {
        turn,
        numTurns: msg.num_turns ?? null,
        durationMs: msg.duration_ms ?? null,
        costUsd: msg.total_cost_usd ?? null,
        // AC #2 asks for TOKENS as the input to the 30-question read; cost is money and cannot be
        // re-derived into a token budget (plan M2).
        inputTokens: u.input_tokens ?? null,
        outputTokens: u.output_tokens ?? null,
        cacheReadTokens: u.cache_read_input_tokens ?? null,
        cacheCreationTokens: u.cache_creation_input_tokens ?? null,
        ok: msg.subtype === 'success',
        // Which prompt surface this turn ran under (#341) — build-checks group 32 compares it to the
        // current one, so a prompt edit makes the fixture stale by name. Read off the posture passed
        // in, never recomputed here: one record of one fact.
        postureFingerprint: posture.fingerprint,
        ts: new Date().toISOString(),
      };
    }
  }

  return { sessionId, stats, advertised };
}

// --- the zero-token pre-flight --------------------------------------------------------------------

// Builds the REAL server from the REAL TOOL_SCHEMA over a temp root holding two stub answers, then
// calls the bundled McpServer's own tools/list and tools/call handlers DIRECTLY, in this process — no
// query(), no model, no cost. It turns spike 1's two findings from "remember the GOTCHA" into "a check
// fails if you forgot", and every defect it catches is one that would otherwise cost a re-run of the
// one committed session.
//
// It reads a PRIVATE API (Protocol._requestHandlers). Spike 1 recorded the same caveat: if a later SDK
// renames it, this must report `unreachable` and exit NON-ZERO loudly, never pass vacuously. That
// branch is written explicitly below.
export async function preflightTransport() {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const pathMod = await import('node:path');
  const { emptyRun, LEVELS, PARAMS, PROVENANCE, SOURCES } = await import('../../discovery/ops.mjs');

  const root = mkdtempSync(pathMod.join(tmpdir(), 'discovery-preflight-'));
  mkdirSync(root, { recursive: true });
  writeFileSync(pathMod.join(root, 'answers.jsonl'),
    `${JSON.stringify({ ref: 'a1', ts: '2026-01-01T00:00:00.000Z', turn: 't1', question_id: 's4-appetite', kind: 'banked', text: 'Six weeks, one person, and we would ship a worse version rather than run over.' })}\n`
    + `${JSON.stringify({ ref: 'a2', ts: '2026-01-01T00:00:01.000Z', turn: 't2', question_id: 's4-rabbit-holes', kind: 'banked', text: 'We will figure it out in the build.' })}\n`);
  writeFileSync(pathMod.join(root, 'transcript.jsonl'), '');

  const turn = 't1';
  const state = { current: emptyRun() };
  const handlerCalls = [];
  const server = buildOpServer({
    root, turn, state,
    onLine: () => {},
  });
  // Wrap nothing — instead observe which calls reached the applier by watching the ledger grow, plus
  // the transcript the handler writes.
  const transcript = () => (existsSync(pathMod.join(root, 'transcript.jsonl'))
    ? readFileSync(pathMod.join(root, 'transcript.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : []);

  const handlers = server.instance?.server?._requestHandlers;
  const reachable = Boolean(handlers?.get?.('tools/call'));
  if (!reachable) {
    return {
      reachable: false, root,
      rows: [{ id: 'PF0', pass: false, detail: 'the bundled McpServer\'s _requestHandlers map is unreachable — the SDK renamed a private API. The pre-flight cannot prove anything and must not pass vacuously (spike 1 §Caveats).' }],
    };
  }

  const extra = { signal: new AbortController().signal, requestId: 0, sendNotification: async () => {}, sendRequest: async () => {} };
  const direct = async (method, params) => {
    try { return await handlers.get(method)({ method, params }, extra); }
    catch (e) { return { threw: e.message }; }
  };
  const call = async (name, args) => {
    handlerCalls.push({ name, args });
    return direct('tools/call', { name, arguments: args });
  };
  const textOf = (r) => (r?.content || []).map((c) => c.text).join('\n');
  const sameArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

  const listed = (await direct('tools/list', {}))?.tools ?? [];
  const byName = Object.fromEntries(listed.map((t) => [t.name, t]));

  const rows = [];
  const row = (id, pass, detail) => rows.push({ id, pass: Boolean(pass), detail });

  // PF1 — the advertised tool-name set equals OPS.
  row('PF1', sameArr(listed.map((t) => t.name).sort(), [...OPS].sort()),
    `advertised [${listed.map((t) => t.name).join(', ')}] vs OPS [${OPS.join(', ')}]`);

  // PF2 — required by NAME AND ORDER, and every enum BY MEMBER. This is the row that closes spike 1's
  // P1 cardinality gap (it compared enum.length === 4 and would have passed four wrong values).
  const ENUMS = { level: LEVELS, source: SOURCES, provenance: PROVENANCE };
  const pf2 = [];
  for (const op of OPS) {
    const schema = byName[op]?.inputSchema;
    if (!schema) { pf2.push(`${op}: not advertised`); continue; }
    if (!sameArr(schema.required ?? [], PARAMS[op])) pf2.push(`${op}: required [${(schema.required ?? []).join(', ')}] != PARAMS [${PARAMS[op].join(', ')}]`);
    for (const [field, members] of Object.entries(ENUMS)) {
      if (!Object.hasOwn(TOOL_SCHEMA[op], field)) continue;
      const advertisedEnum = schema.properties?.[field]?.enum ?? [];
      if (!sameArr(advertisedEnum, members)) pf2.push(`${op}.${field}: enum [${advertisedEnum.join(', ')}] != [${members.join(', ')}]`);
    }
  }
  row('PF2', pf2.length === 0, pf2.length ? pf2.join(' · ') : 'every required array and every enum matches the grammar by name, order and member');

  // PF3 — question_id: null reaches the handler as JSON null, not the string.
  const evidence = await call('file_evidence', { url: 'https://example.test/source', ref: null, name: null, provenance: 'assumption', claim_ref: null });
  const filedEvidence = state.current.ops.find((o) => o.op === 'file_evidence');
  row('PF3', filedEvidence?.params.ref === null && filedEvidence?.params.claim_ref === null && !evidence?.isError,
    `null params arrived as ${JSON.stringify(filedEvidence?.params.ref)} / ${JSON.stringify(filedEvidence?.params.claim_ref)}`);

  // PF4 — a valid record_decision is FILED, and the op line lands with the applier's seq/closes/flagged.
  const decision = await call('record_decision', {
    question_id: 's4-appetite', answer_ref: 'a1', level: 'business', parent_id: null,
    evidence_refs: [], wrong_if: 'the team runs past the appetite and nobody stops it', off_script: false,
  });
  const opLines = transcript().filter((l) => l.type === 'op');
  const filed = opLines.find((l) => l.op === 'record_decision');
  row('PF4', !decision?.isError && filed?.seq === 2 && filed?.closes === true && sameArr(filed?.flagged, ['no-evidence']),
    `transcript op line seq ${filed?.seq}, closes ${filed?.closes}, flagged [${(filed?.flagged ?? []).join(', ')}]`);

  // PF5 — an unresolvable answer_ref comes back as isError carrying the applier's message VERBATIM.
  const badRef = await call('flag_weak_answer', { question_id: 's4-rabbit-holes', answer_ref: 'a9', missing: ['a named risk'] });
  row('PF5', badRef?.isError === true && /does not resolve/.test(textOf(badRef)) && !/threw/.test(JSON.stringify(badRef)),
    `isError ${badRef?.isError} — "${textOf(badRef).slice(0, 90)}"`);

  // PF6 — an out-of-enum level is refused by the SCHEMA layer, before the handler. Proven by the
  // ledger: no record_decision with that level was ever applied.
  const before = state.current.ops.length;
  const outOfEnum = await call('record_decision', {
    question_id: 's4-appetite', answer_ref: 'a1', level: 'wrong', parent_id: null,
    evidence_refs: [], wrong_if: 'x', off_script: false,
  });
  row('PF6', outOfEnum?.isError === true && state.current.ops.length === before && /Invalid option|validation/i.test(textOf(outOfEnum)),
    `isError ${outOfEnum?.isError}, ledger unchanged at ${state.current.ops.length} — "${textOf(outOfEnum).slice(0, 90)}"`);

  // PF7 — a second closing op on the same turn is refused naming the turn. R2 reaching the agent
  // through the transport, not only through the applier.
  const secondCloser = await call('flag_weak_answer', { question_id: 's4-rabbit-holes', answer_ref: 'a2', missing: ['a named risk'] });
  row('PF7', secondCloser?.isError === true && textOf(secondCloser).includes(turn) && /already closed/.test(textOf(secondCloser)),
    `isError ${secondCloser?.isError} — "${textOf(secondCloser).slice(0, 90)}"`);

  // PF8 — a listener that throws does not refuse the op. A second server on the same root, its own
  // holder and turn, with an onLine that throws on every call: the op is FILED (no isError), the
  // holder advances, the op line is on disk, and the listener was actually reached.
  const state2 = { current: emptyRun() };
  let listenerCalls = 0;
  const server2 = buildOpServer({ root, turn: 't2', state: state2, onLine: () => { listenerCalls += 1; throw new Error('pre-flight: the listener threw on purpose'); } });
  const handlers2 = server2.instance?.server?._requestHandlers;
  let throwingListener = { threw: 'handlers unreachable' };
  try { throwingListener = await handlers2.get('tools/call')({ method: 'tools/call', params: { name: 'file_evidence', arguments: { url: 'https://example.test/second', ref: null, name: null, provenance: 'assumption', claim_ref: null } } }, extra); }
  catch (e) { throwingListener = { threw: e.message }; }
  const t2Lines = transcript().filter((l) => l.type === 'op' && l.turn === 't2');
  row('PF8', !throwingListener?.isError && !throwingListener?.threw && state2.current.ops.length === 1 && t2Lines.length === 1 && listenerCalls === 1,
    `isError ${throwingListener?.isError ?? false}, holder at ${state2.current.ops.length} op, ${t2Lines.length} t2 op line on disk, listener reached ${listenerCalls}×`);

  return { reachable: true, root, rows, handlerCalls: handlerCalls.length };
}

// --- the parenting probe (one PAID turn) ---------------------------------------------------------

// The pre-flight's PAID sibling (#341): ONE real turn that observes whether the agent, shown a ledger
// with a candidate at every rung, names a parent. It exists because the spine's defect survived every
// pure gate — the applier, the projection and the prompt strings were all correct and the agent still
// filed null 18 times — so the one thing worth observing before a twelve-turn fixture is spent is the
// agent's own choice, once, for ~$0.04–0.10 (the first run after a prompt edit is the cold-cache one).
// Run it before recording the fixture and after ANY edit to the prompt surface; group 32's
// fingerprint tells you when that is.
//
// The temp root holds four STUB answers and a three-rung ledger the REAL applier built (business →
// stakeholder → solution), written through appendTranscript so the on-disk transcript and the holder
// agree — exactly what buildOpServer's handler does. A minimal run.json is there only so the init
// message's recordSessionId has a head to write into (it is non-fatal without one, but noisy). The
// root is deleted on exit, throw or not (a bank rename throws at the stubs, before the SDK is
// reached): it is not a run package and is never presented as one.
//
// It SPENDS TOKENS. Nothing imports it — not build-checks, not the pre-flight, not the session module;
// only the --probe-parenting CLI branch below reaches it.
export async function probeParenting() {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const pathMod = await import('node:path');

  const root = mkdtempSync(pathMod.join(tmpdir(), 'discovery-probe-'));
  try {
    const stub = (ref, turn, question_id, text) => JSON.stringify({ ref, ts: '2026-01-01T00:00:00.000Z', turn, question_id, kind: 'banked', text });
    const appetite = 'Two weeks of one developer, fixed before scope. If it does not fit we ship the handover only.';
    writeFileSync(pathMod.join(root, 'answers.jsonl'), [
      stub('a1', 't1', 's1-if-nobody-solves-this', 'The same two days a term and the same losses go every year.'),
      stub('a2', 't2', 's5-pain-budget-same-person', 'Three people, not one: the coordinator has the pain, the business manager has the budget.'),
      stub('a3', 't3', 's4-rabbit-holes', 'One assumption to settle now: the parent app can embed a read-only page.'),
      stub('a4', 't4', 's4-appetite', appetite),
    ].join('\n') + '\n');
    writeFileSync(pathMod.join(root, 'transcript.jsonl'), '');
    writeFileSync(pathMod.join(root, 'run.json'), `${JSON.stringify({ slug: 'parenting-probe', provenance: 'fictional', label: 'PROBE — a temp root, deleted on exit, never a run package', sessionId: null, turnStats: [] }, null, 2)}\n`);

    const state = { current: emptyRun() };
    const file = (turn, params) => {
      state.current = applyOp(state.current, { op: 'record_decision', params }, { answers: readAnswers(root), bank: QUESTIONS, turn });
      appendTranscript(root, opLine({ record: state.current.ops.at(-1) }));
    };
    file('t1', { question_id: 's1-if-nobody-solves-this', answer_ref: 'a1', level: 'business', parent_id: null, evidence_refs: [], wrong_if: 'the losses stop on their own', off_script: false });
    file('t2', { question_id: 's5-pain-budget-same-person', answer_ref: 'a2', level: 'stakeholder', parent_id: 1, evidence_refs: [], wrong_if: 'the budget holder turns out to be the coordinator', off_script: false });
    file('t3', { question_id: 's4-rabbit-holes', answer_ref: 'a3', level: 'solution', parent_id: 2, evidence_refs: [], wrong_if: 'the parent app cannot embed a page', off_script: false });
    const before = state.current.ops;

    const lines = [];
    let stats = null;
    let error = null;
    try {
      ({ stats } = await runDiscoveryTurn({
        root, head: { sessionId: null, provenance: 'fictional' }, question: questionById('s4-appetite'), answer: { ref: 'a4', text: appetite },
        turn: 't4', posture: POSTURES.think, state, onLine: (l) => lines.push(l),
      }));
    } catch (e) { error = e.message; }

    const closer = lines.find((l) => l.type === 'op' && l.closes) ?? null;
    const p = closer?.params ?? null;
    let verdict = 'INCONCLUSIVE';
    if (closer?.op === 'record_decision' && p.level !== 'business') {
      if (p.parent_id === null) verdict = 'MISSED';
      else if (parentCandidates(before, p.level).includes(p.parent_id)) verdict = 'PARENTED';
    }
    const corrections = lines.filter((l) => l.type === 'denied' && /parent_id/.test(l.error ?? '')).length;
    const text = lines.filter((l) => l.type === 'text').map((l) => l.text);
    // The on-disk transcript, read back before the root is deleted: every denied line's tool. A Bash
    // or Glob here is the CLI's warmup recorded as the agent's refusal — the defect #343 closed.
    const denied = readTranscript(root).filter((l) => l.type === 'denied').map((l) => l.tool);
    return { verdict, closer, corrections, denied, text, stats, error, fingerprint: POSTURES.think.fingerprint };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// --- standalone ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const wantPreflight = process.argv.includes('--preflight');
  const wantProbe = process.argv.includes('--probe-parenting');
  if (wantPreflight === wantProbe) {
    console.error('usage: node lib/discovery-transport.mjs --preflight | --probe-parenting   (run from portal/; the probe spends ONE paid turn)');
    process.exit(2);
  }
  const { readFileSync } = await import('node:fs');
  const v = (name) => JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8')).version;
  if (wantProbe) {
    const r = await probeParenting();
    console.log(`discovery parenting probe — sdk ${v('@anthropic-ai/claude-agent-sdk')} · node ${process.version} · prompt surface ${r.fingerprint}`);
    if (r.error) console.log(`turn error: ${r.error}`);
    for (const t of r.text) console.log(`agent: ${t}`);
    console.log(`filed: ${r.closer ? `${r.closer.op} seq ${r.closer.seq}${r.closer.op === 'record_decision' ? ` at ${r.closer.params.level}, parent_id ${JSON.stringify(r.closer.params.parent_id)}` : ''}` : '(no closing op)'}`);
    console.log(`in-turn parent corrections (denied lines naming parent_id): ${r.corrections}`);
    console.log(`denied lines on the temp root's transcript: ${r.denied.length}${r.denied.length ? ` (${r.denied.join(', ')})` : ''}`);
    console.log(`cost ${r.stats?.costUsd ?? '?'} USD · ${r.stats?.durationMs ?? '?'} ms · ${r.stats?.numTurns ?? '?'} SDK turns`);
    console.log(`\nprobe ${r.verdict}`);
    process.exit(r.verdict === 'PARENTED' ? 0 : r.verdict === 'MISSED' ? 2 : 3);
  }
  const result = await preflightTransport();
  console.log(`discovery transport pre-flight — sdk ${v('@anthropic-ai/claude-agent-sdk')} · zod ${v('zod')} · node ${process.version}`);
  console.log(`temp root: ${result.root ?? '(none)'}\n`);
  for (const r of result.rows) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.detail}`);
  const failed = result.rows.filter((r) => !r.pass);
  console.log(`\n${failed.length ? `pre-flight ✗  ${failed.length} row(s) failed` : `pre-flight ✓  all ${result.rows.length} rows pass, zero tokens`}`);
  process.exit(failed.length ? 2 : 0);
}
