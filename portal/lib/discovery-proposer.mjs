// portal/lib/discovery-proposer.mjs — ONE fenced Agent SDK call that reads a FINISHED discovery run
// package and proposes candidate features into their own file (epic #295, ticket #359;
// docs/epics/canvas-design-import.architecture.md §Addendum 2026-08-28 — "the owner initiates and
// admits; the agent drafts inside fences"). The pure half is discovery/proposals.mjs.
//
// FOUR THINGS THIS MODULE MUST NEVER DO, and each is what an acceptance criterion rests on:
//
//   1. WRITE run.json. projectPrd renders `run.turnStats.length` as "N turn(s)" and run.model /
//      run.posture on its Run line, so ONE recordTurnStats call moves prd.md's bytes and breaks the
//      "prd.md is byte-identical before and after a proposal run" guarantee. The run's model and
//      fingerprint ride on each PROPOSAL LINE instead — that is why the line carries them.
//   2. APPEND TO transcript.jsonl OR answers.jsonl. Those are the session's, and this run is not a
//      session. The fence's recorder is diverted with `write` so a refusal STREAMS instead.
//   3. TOUCH discovery-postures.mjs's TOOL_DESCRIPTIONS. fingerprintOf hashes
//      JSON.stringify(TOOL_DESCRIPTIONS), so one added key moves BOTH shipped posture fingerprints
//      together and makes discovery/instrument-loans-1/ stale under build-checks group 32. This module
//      imports PROVENANCE_RULE from that file and nothing else, and case 34.13 pins exactly that.
//   4. REUSE THE SESSION'S MCP SERVER NAME. Its own server, its own one tool. The session's
//      vocabulary stays the four op verbs (build-checks group 30 case 14 is that statement).
//
// THE FENCE IS NOT REIMPLEMENTED HERE. Group 30 case 12 already refuses a second copy on the
// transport — "a second copy of the fence is a second fence" — and a duplicate would be a fence with
// NO run-time proof, because whether a deny actually stops a call is a fact no CI group can see. So
// portal/lib/discovery.mjs gained two defaulted opts (#359's T8a): `extraTools` admits this run's one
// tool by name, and `write` diverts the recorder. One predicate, the same two call sites the session
// runs under, and --probe-fence's existing paid observation covers this run too.
//
// THE BRIEF CARRIES THE PACKAGE, so the run needs no read tool at all. Everything the model may see is
// in the prompt, exactly as a session turn's ledger brief is — which is what lets
// allowSetFor({ root, reads: [] }) stay literally unchanged and `tools: []` stay closed.
//
// The prompt constants are exported SEPARATELY for discovery-postures.mjs's reason (its header,
// :16-20): the re-run protocol's branch is "tighten one constant and re-run", and keeping each in one
// exported place makes that a one-line diff rather than an edit buried in a template literal.
// ORDER IS LOAD-BEARING — the last instruction is the one a model is most likely to act on, and #341
// bought that with a paid recording. A tightening is an edit IN PLACE, never an append.
//
// Zero-token dry run:  cd portal && node lib/discovery-proposer.mjs --dry --slug <slug> --provenance fictional

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { LEVELS } from '../../discovery/ops.mjs';
import { questionById } from '../../discovery/bank.mjs';
import {
  checkProposalLines, MAX_PROPOSALS, nextProposalId, PROPOSED_BY_MODEL, seedProposalStore,
} from '../../discovery/proposals.mjs';
import { allowSetFor, fenceCanUseTool, fenceHooks } from './discovery.mjs';
import { PROVENANCE_RULE } from './discovery-postures.mjs';

const bad = (msg) => { throw new Error(`discovery-proposer: ${msg}`); };

// The model. A one-const change if the owner wants Sonnet instead — #348 measured whether Opus
// JUDGES better, and proposing is a different task, so that number does not transfer. The report
// names which model the recorded run actually used.
export const PROPOSER_MODEL = 'claude-opus-5';

// Enough for MAX_PROPOSALS tool calls plus the prose around them: 8 calls + one in-turn correction
// after a refusal + the opening and closing assistant turns ≈ 11, rounded to 12. A per-run cap, not a
// per-turn one — there is exactly one query() here.
export const MAX_TURNS = 12;

// The built-in tools this run advertises. ONE record, two readers: the query's `tools` and the fence's
// record gate (discovery.mjs's fenceSite). Empty because the brief carries the package.
const PROPOSER_MAIN_TOOLS = Object.freeze([]);

export const PROPOSER_MCP_SERVER = 'proposals';
export const PROPOSE_TOOL = 'propose';
const PROPOSER_TOOL_NAME = `mcp__${PROPOSER_MCP_SERVER}__${PROPOSE_TOOL}`;
// A proposal run has no turn sequence. The value only ever reaches a streamed line and the fence
// trace, so it is a fixed literal rather than a counter pretending to be one.
const PROPOSAL_TURN = 'proposal';

// --- the prompt -----------------------------------------------------------------------------------

export const PROPOSAL_CONTRACT = `This is ONE pass. Read the package below, then file at most ${MAX_PROPOSALS} proposals — one propose call each — and stop. No summary of what you filed, no question back, no further tool call after your last proposal. Fewer than ${MAX_PROPOSALS} is a good answer; padding the list to reach it is not.`;

export const OPTIONS_NOT_TRUTH = `These are OPTIONS the owner will accept, refuse or park. You are not deciding anything and you must not write as if you were. Do not write "we will build", "the product needs" or "the next step is". Write what the recorded decisions make possible and what would make it the wrong thing to build. A proposal is a candidate, and the owner's verdict is the only thing that settles it.`;

export const WRONG_IF_RULE = `Every proposal carries a kill criterion in "wrong_if": the observation that would make this feature the wrong thing to build. It is a condition someone could later observe, not a hedge and not a risk register entry. A proposal with no kill criterion is refused.`;

// LAST, on purpose. Grounding is the rule a proposal run is most likely to violate — the model has
// every decision in front of it and no reason to invent one, but a recalled seq is the failure #341
// observed in the parenting rehearsal, in the same shape.
export const RESTS_ON_RULE = `Every proposal names at least one decision it rests on, in "rests_on", as the SEQ NUMBERS from the ledger below. READ the seq from the ledger; do not recall it and do not guess one. A seq the ledger does not carry is refused, and so is a seq that is not a decision. If you cannot ground an idea in a decision this run recorded, it is not proposed at all — that is the whole point of proposing FROM a package.`;

const PROPOSE_DESCRIPTION = `File ONE candidate feature. title is a short name for it; why is your prose case for it; rests_on names the seqs of the decisions in the ledger it rests on; wrong_if is the observation that would make it the wrong thing to build. The server assigns its id, its timestamp, the model and the prompt-surface fingerprint — there is no parameter for any of them. Call this once per proposal, at most ${MAX_PROPOSALS} times.`;

const systemFor = (provenance) => `You are reading a FINISHED product-discovery run and proposing candidate features from what it actually recorded. The run is over: nobody is answering any more, and you are not interviewing anyone.

${OPTIONS_NOT_TRUTH}

${PROPOSAL_CONTRACT}

${PROVENANCE_RULE[provenance]}

${WRONG_IF_RULE}

${RESTS_ON_RULE}

British English. No preamble, no restating the package back, no encouragement.`;

// The package as the model must see it: a PROJECTION of the ledger, built server-side, so nothing the
// model reads is anything but a record this run holds. Every decision carries its seq, its rung, the
// bank question it answers (a definition, not a claim — prd-projection.mjs's own argument), the
// human's verbatim answer resolved by answer_ref, its kill criterion, its parent and its flags.
function ledgerFor({ ops, answers }) {
  const textOf = (ref) => answers.find((a) => a?.ref === ref)?.text ?? '[the answer store does not hold this ref]';
  const decisions = ops.filter((r) => r?.op === 'record_decision');
  const byRung = LEVELS.map((level) => {
    const at = decisions.filter((r) => r.params.level === level);
    if (!at.length) return `### ${level}\n(no decision at this rung)`;
    return `### ${level}\n${at.map((r) => {
      const q = questionById(r.params.question_id);
      return [
        `- seq ${r.seq}${r.params.off_script ? ' (off-script)' : ''}`,
        `  question: ${q ? q.text : 'off-script — no banked question'}`,
        `  the person answered: ${textOf(r.params.answer_ref)}`,
        `  wrong_if: ${r.params.wrong_if}`,
        `  parent: ${r.params.parent_id === null ? 'none' : `seq ${r.params.parent_id}`}${r.flagged?.length ? ` · flagged ${r.flagged.join(', ')}` : ''}`,
      ].join('\n');
    }).join('\n')}`;
  });
  const evidence = ops.filter((r) => r?.op === 'file_evidence')
    .map((r) => `- seq ${r.seq} — ${r.params.provenance} — ${r.params.url ?? r.params.name ?? `answer ${r.params.ref}`}${r.params.claim_ref === null ? '' : ` (backs seq ${r.params.claim_ref})`}`);
  const opened = ops.filter((r) => r?.op === 'open_question')
    .map((r) => `- seq ${r.seq} — ${questionById(r.params.question_id)?.text ?? 'off-script'} — parked because: ${r.params.reason}`);
  const weak = ops.filter((r) => r?.op === 'flag_weak_answer')
    .map((r) => `- seq ${r.seq} — ${questionById(r.params.question_id)?.text ?? '?'} — missing: ${r.params.missing.join('; ')}`);
  return [
    '## The decisions, by rung',
    byRung.join('\n\n'),
    '',
    '## The evidence filed',
    evidence.length ? evidence.join('\n') : '(none)',
    '',
    '## Questions the run parked',
    opened.length ? opened.join('\n') : '(none)',
    '',
    '## Answers the run flagged as thin',
    weak.length ? weak.join('\n') : '(none)',
  ].join('\n');
}

export function buildProposalRun({ run, ops, answers }) {
  if (!run || typeof run !== 'object') bad('buildProposalRun needs the parsed run.json object');
  if (!Array.isArray(ops)) bad("buildProposalRun needs the run's op records array");
  if (!Array.isArray(answers)) bad('buildProposalRun needs the parsed answers.jsonl lines');
  if (!Object.hasOwn(PROVENANCE_RULE, run.provenance))
    bad(`run.provenance must be one of ${Object.keys(PROVENANCE_RULE).join(' · ')} (got ${JSON.stringify(run.provenance)}) — the provenance is a prompt input, so the model knows which kind of run it is reading (#347)`);
  const decisions = ops.filter((r) => r?.op === 'record_decision');
  if (!decisions.length) bad('this package records no decision, so there is nothing a proposal could rest on — a proposal run over an empty ledger would have to invent its grounding');
  const prompt = `The run: "${run.slug}" · ${run.provenance} · depth ${run.depth} · ${decisions.length} decision(s) recorded, ${ops.length} op(s) in the ledger · closed ${run.endedAt}.

${ledgerFor({ ops, answers })}

Propose the candidate features this package makes possible. One propose call each, at most ${MAX_PROPOSALS}, then stop — and take every rests_on seq from the ledger above.`;
  return { systemPrompt: systemFor(run.provenance), prompt };
}

// ITS OWN FINGERPRINT, over its own fixed inputs, so it moves when THIS prompt moves and never when
// the session's does. createHash from node:crypto only — nothing is borrowed from
// discovery-postures.mjs except PROVENANCE_RULE (case 34.13 pins that).
export const PROPOSER_FINGERPRINT_INPUTS = Object.freeze({
  run: Object.freeze({ slug: 'fp-run', provenance: 'fictional', depth: 'fp', endedAt: 'fp' }),
  answers: Object.freeze([Object.freeze({ ref: 'fp1', text: 'A fixed answer.' })]),
  ops: Object.freeze([
    Object.freeze({
      seq: 1, op: 'record_decision', closes: true, flagged: Object.freeze([]), supersedes: null,
      params: Object.freeze({ question_id: null, answer_ref: 'fp1', level: 'business', parent_id: null, evidence_refs: Object.freeze([]), wrong_if: 'A fixed kill criterion.', off_script: true }),
    }),
  ]),
});

export const PROPOSER_FINGERPRINT = (() => {
  const { systemPrompt, prompt } = buildProposalRun(PROPOSER_FINGERPRINT_INPUTS);
  return createHash('md5').update([PROPOSER_MODEL, systemPrompt, prompt, JSON.stringify(PROPOSE_DESCRIPTION)].join('\n \n')).digest('hex');
})();

// --- the server -----------------------------------------------------------------------------------

// ONE tool. Its zod shape is exactly PROPOSED_BY_MODEL, in that order, so the advertised `required`
// array comes out in it (the transport's plan-M5 lesson: .optional() silently drops a field from
// `required`, and nullable is never optional). The other five keys of a proposal line are the
// server's, the way an op's seq / closes / flagged are the applier's.
export function buildProposalServer({ root, model, fingerprint, state, onLine, seedCount = 0, proposalLines }) {
  if (!state || !Array.isArray(state.lines)) bad('buildProposalServer needs the holder { lines: [] } — the applier is pure and each accepted line produces a NEW store the next call folds onto');
  const file = path.join(root, 'proposals.jsonl');
  const one = tool(PROPOSE_TOOL, PROPOSE_DESCRIPTION, {
    title: z.string(),
    why: z.string(),
    rests_on: z.array(z.number().int()),
    wrong_if: z.string(),
  }, async (args) => {
    try {
      // PAST THE SEED. `state.lines` opens as the package's own proposals (runProposalRun seeds it), so a
      // count over the whole store would spend this run's budget on lines it did not file and then report
      // the package's total as "this run has already filed N" — a count of the PACKAGE reported as a count
      // of the RUN. It is the same reasoning the return slice below already carries, applied here too.
      const filed = state.lines.slice(seedCount).filter((l) => l.type === 'proposal').length;
      if (filed >= MAX_PROPOSALS)
        return { isError: true, content: [{ type: 'text', text: `discovery-proposer: this run has already filed ${filed} proposals, which is the ceiling (MAX_PROPOSALS). Stop — file no more.` }] };
      const line = {
        type: 'proposal',
        ts: new Date().toISOString(),
        id: nextProposalId(state.lines),
        title: args.title,
        why: args.why,
        rests_on: args.rests_on,
        wrong_if: args.wrong_if,
        model,
        fingerprint,
      };
      // THE REFUSALS RUN BEFORE THE APPEND. proposals.jsonl is append-only, so an unchecked line
      // reaching it cannot be taken back — and the refusal reaches the agent as a RESULT, verbatim,
      // so it corrects inside the same turn (the transport's observation 2).
      const next = checkProposalLines([...state.lines, line], state.ops, proposalLines);
      appendFileSync(file, `${JSON.stringify(line)}\n`);
      state.lines = next;
      try { onLine?.({ type: 'proposal', id: line.id, title: line.title, rests_on: [...line.rests_on] }); }
      catch (e) { process.stderr.write(`discovery-proposer: listener error (non-fatal): ${e.message}\n`); }
      return { content: [{ type: 'text', text: `filed ${line.id}: ${line.title}` }] };
    } catch (e) {
      state.refusals.push(e.message);
      try { onLine?.({ type: 'refused', error: e.message }); } catch { /* see above */ }
      return { isError: true, content: [{ type: 'text', text: e.message }] };
    }
  });
  return createSdkMcpServer({ name: PROPOSER_MCP_SERVER, version: '1.0.0', tools: [one] });
}

// --- the run --------------------------------------------------------------------------------------

export async function runProposalRun({ root, run, ops, answers, proposals = [], proposalLines, model = PROPOSER_MODEL, onLine }) {
  const { systemPrompt, prompt } = buildProposalRun({ run, ops, answers });
  // SEEDED FROM THE PACKAGE'S OWN proposals.jsonl, never `[]`. The append-guard below runs over
  // `state.lines`, so a store that did not start as the file would guard memory while the file it
  // names went unreadable — nextProposalId would re-issue p1 and every later read of the package
  // would throw on the duplicate, in an append-only file with no sanctioned repair. The route
  // refuses a second run outright, so this is normally the empty array; the seed is what makes the
  // guarantee STRUCTURAL rather than something a guard two files away happens to hold.
  const seeded = seedProposalStore(proposals, ops, proposalLines);
  const state = { lines: [...seeded], ops, refusals: [] };
  // `seedCount` and `proposalLines` BOTH travel down: the handler is lexically inside buildProposalServer,
  // so neither `seeded` nor this function's own parameter is in scope there. Without them the ceiling
  // counts the package's proposals as the run's, and a refusal on a SEEDED line — one already on disk —
  // reads "the proposal line being appended", which is the same defect the verdict route fixed by passing
  // pkg.proposalLines (server.mjs). Both are unreachable while a package gets ONE run; both are wrong.
  const server = buildProposalServer({ root, model, fingerprint: PROPOSER_FINGERPRINT, state, onLine, seedCount: seeded.length, proposalLines });

  // THE SAME TWO SITES THE SESSION USES, from ONE fence object. `reads: []` is unchanged from the
  // session's run 1 shape — the brief carries the package, so this run needs no read tool — and
  // `write` keeps every refusal out of the session's transcript.jsonl.
  const fence = {
    allowSet: allowSetFor({ root, reads: [] }),
    mainTools: PROPOSER_MAIN_TOOLS,
    extraTools: [PROPOSER_TOOL_NAME],
    write: (line) => line,
  };

  const q = query({
    prompt,
    options: {
      cwd: root,
      model,
      maxTurns: MAX_TURNS,
      systemPrompt,
      tools: PROPOSER_MAIN_TOOLS,
      allowedTools: [],
      mcpServers: { [PROPOSER_MCP_SERVER]: server },
      strictMcpConfig: true,
      canUseTool: fenceCanUseTool(root, PROPOSAL_TURN, onLine, fence),
      hooks: fenceHooks(root, PROPOSAL_TURN, onLine, fence),
    },
  });

  let stats = null;
  for await (const msg of q) {
    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'text' && block.text) { try { onLine?.({ type: 'text', text: block.text }); } catch { /* a listener must never alter the run */ } }
      }
    } else if (msg.type === 'result') {
      const u = msg.usage ?? {};
      // `is_error` as well as the subtype: a result can arrive subtype "success" AND is_error true,
      // carrying the CLI's own error text as the assistant message ("Credit balance is too low").
      // The session transport does not read it and that is a known gap; it is not fixed here.
      stats = {
        model,
        fingerprint: PROPOSER_FINGERPRINT,
        numTurns: msg.num_turns ?? null,
        durationMs: msg.duration_ms ?? null,
        costUsd: msg.total_cost_usd ?? null,
        inputTokens: u.input_tokens ?? null,
        outputTokens: u.output_tokens ?? null,
        ok: msg.subtype === 'success' && msg.is_error !== true,
        ts: new Date().toISOString(),
      };
    }
  }

  // THE STATS ARE RETURNED AND STREAMED, AND WRITTEN TO NO FILE IN THE PACKAGE. A proposalStats field
  // on run.json is exactly what the prd.md guarantee forbids.
  // THIS run's proposals, sliced past the seed — the seeded lines are the package's, not this run's,
  // and a caller counting them would over-report what was just proposed.
  return { proposals: state.lines.slice(seeded.length).filter((l) => l.type === 'proposal'), refusals: [...state.refusals], stats };
}

// --- the zero-token dry run -----------------------------------------------------------------------

// Builds the REAL prompt and the REAL server over the real package, then reaches the bundled
// McpServer's own tools/list handler DIRECTLY, in this process — no query(), no model, no cost. The
// transport's --preflight is the shape, including the unreachable-private-API branch, which must
// report and exit NON-ZERO rather than pass vacuously.
export async function dryProposalRun({ root }) {
  const { readProposalPackage } = await import('../../discovery/proposals.mjs');
  const { run, ops, answers, proposals } = readProposalPackage(root);
  const { systemPrompt, prompt } = buildProposalRun({ run, ops, answers });
  // NOT seeded, deliberately: this path never reaches tools/call, so nothing is ever allocated or
  // appended, and seedProposalStore THROWS on a corrupted file — which would abort the diagnostic
  // instead of reporting its rows. DR5 below is where a package that already carries proposals is
  // reported, and it reports rather than throws.
  const state = { lines: [], ops, refusals: [] };
  const server = buildProposalServer({ root, model: PROPOSER_MODEL, fingerprint: PROPOSER_FINGERPRINT, state, onLine: null });

  const rows = [];
  const row = (id, pass, detail) => rows.push({ id, pass: Boolean(pass), detail });
  const sameArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

  const handlers = server.instance?.server?._requestHandlers;
  if (!handlers?.get?.('tools/list')) {
    row('DR0', false, "the bundled McpServer's _requestHandlers map is unreachable — the SDK renamed a private API. The dry run cannot prove anything and must not pass vacuously.");
    return { reachable: false, rows, systemPrompt, prompt };
  }
  const extra = { signal: new AbortController().signal, requestId: 0, sendNotification: async () => {}, sendRequest: async () => {} };
  const listed = (await handlers.get('tools/list')({ method: 'tools/list', params: {} }, extra))?.tools ?? [];

  row('DR1', sameArr(listed.map((t) => t.name), [PROPOSE_TOOL]), `advertised [${listed.map((t) => t.name).join(', ')}] — exactly one tool, named ${PROPOSE_TOOL}`);
  const required = listed[0]?.inputSchema?.required ?? [];
  row('DR2', sameArr(required, [...PROPOSED_BY_MODEL]), `required [${required.join(', ')}] vs PROPOSED_BY_MODEL [${PROPOSED_BY_MODEL.join(', ')}] — by NAME and by ORDER`);
  const props = Object.keys(listed[0]?.inputSchema?.properties ?? {});
  row('DR3', sameArr(props.slice().sort(), [...PROPOSED_BY_MODEL].sort()), `properties [${props.join(', ')}] — the model authors these four fields and no other; id, ts, model and fingerprint are the server's`);
  row('DR4', ops.filter((r) => r?.op === 'record_decision').length > 0 && prompt.includes('seq '), `the brief carries ${ops.filter((r) => r?.op === 'record_decision').length} decision(s) by seq — this is why the run needs no read tool`);
  row('DR5', !existsSync(path.join(root, 'proposals.jsonl')) || proposals.length === 0, `proposals.jsonl holds ${proposals.length} line(s) — a package gets ONE proposal run and the route refuses a second with no override; discard the file and re-run if the run was bad`);
  row('DR6', prompt.includes(String(run.slug)) && systemPrompt.includes(PROVENANCE_RULE[run.provenance].slice(0, 40)), "the run's slug is in the turn prompt and its provenance rule is in the system prompt, imported rather than copied (#347)");
  row('DR7', typeof PROPOSER_FINGERPRINT === 'string' && PROPOSER_FINGERPRINT.length === 32, `the proposer's own fingerprint is ${PROPOSER_FINGERPRINT} — its own inputs, so it moves when THIS prompt moves and never when the session's does`);
  return { reachable: true, rows, systemPrompt, prompt };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : (argv[i + 1] ?? null); };
  try {
    if (!argv.includes('--dry')) throw new Error('this CLI runs the DRY preflight only — a real proposal run is started from the portal drawer, so the run lock and the guards are the server\'s. usage: node lib/discovery-proposer.mjs --dry --slug <slug> --provenance fictional');
    const { resolveRunRoot, assertProvenanceRoot } = await import('./discovery.mjs');
    const provenance = arg('--provenance');
    const root = resolveRunRoot({ provenance, slug: arg('--slug') });
    assertProvenanceRoot(provenance, root);
    const { reachable, rows, systemPrompt, prompt } = await dryProposalRun({ root });
    for (const r of rows) console.log(`${r.pass ? '✓' : '✗'} ${r.id}  ${r.detail}`);
    console.log(`\n--- system prompt ---\n${systemPrompt}\n\n--- turn prompt ---\n${prompt}`);
    const failed = rows.filter((r) => !r.pass);
    if (!reachable || failed.length) {
      console.error(`\nproposer dry ✗  ${failed.length} row(s) failed${reachable ? '' : ' (private API unreachable)'}`);
      process.exit(1);
    }
    console.log(`\nproposer dry ✓  ${rows.length} rows, zero tokens spent`);
  } catch (e) {
    console.error(`proposer ✗  ${e.message}`);
    process.exit(1);
  }
}
