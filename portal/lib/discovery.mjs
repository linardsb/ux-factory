// portal/lib/discovery.mjs — the discovery session: the run package on disk, and the one loop that
// fills it (epic #279, ticket #284; docs/epics/discovery-partner.architecture.md §Recommended
// approach — approach C, answer-by-reference, two files so the separation is visible;
// discovery/README.md is the format spec this module conforms to).
//
// One banked question at a time. The server appends the person's answer to answers.jsonl, then a real
// Agent SDK run judges that ONE answer against that question's own weak-answer note, files at most one
// closing op through an in-process tool, and yields. What is left behind — run.json, answers.jsonl,
// transcript.jsonl — is the whole state.
//
// FOUR INVARIANTS a future editor must keep:
//
//   1. THIS FILE IS STATICALLY SDK-FREE AND ZOD-FREE. tooling/build-checks.mjs group 30 imports it and
//      runs in CI, where portal/node_modules does not exist — so a static
//      `@anthropic-ai/claude-agent-sdk` or `zod` import anywhere in this file's graph takes that job
//      down. The SDK lives in ./discovery-transport.mjs, lazy-imported by runTurn AFTER every guard
//      has passed. That is the same three-layer split builder.mjs → record-composition.mjs →
//      trace-recorder.mjs already uses, and the ABSENCE is what proves it — see group 8's own comment
//      before "fixing" this by installing portal deps in CI.
//   2. DISK IS AUTHORITATIVE. There is no session object in memory beyond the run lock. Every read
//      re-reads the package; openSession on an existing run.json RESUMES rather than overwrites. That
//      is what makes a page reload and a server restart lose nothing (AC #5).
//   3. ANSWER BY REFERENCE. No op parameter carries answer text (discovery/ops.mjs invariant 1). The
//      server writes answers.jsonl and allocates every ref; the agent names a ref and the applier
//      resolves it. An agent has no route to put words in the human's mouth, and that is a property of
//      the data rather than a line in a prompt.
//   4. THE CURSOR IS DERIVED, NEVER STORED. It is a fold over the transcript's closed turns. Two
//      records of one fact drift — discovery/ops.mjs's emptyRun() comment says exactly this about
//      "closed", and a stored cursor is the same shape of mistake.
//
// The head's `root` and the resolved filesystem root are TWO DIFFERENT VALUES and one name (plan M7):
// resolveRunRoot() returns an absolute path; run.json's `root` is repo-relative for fictional runs, per
// discovery/README.md's example, because an absolute home-dir path must never be committed. head.root
// is never fed to node:fs — every path is re-resolved from { slug, provenance }.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEPTHS, questionById, QUESTIONS, selectDepth } from '../../discovery/bank.mjs';
import { applyOps, LEVELS, OPS, PARAMS, PROVENANCE, SOURCES } from '../../discovery/ops.mjs';
import { HAS_TOKEN, JOBS_DIR, REPO_DIR } from './env.mjs';
import { POSTURES } from './discovery-postures.mjs';

const bad = (msg) => { throw new Error(`discovery: ${msg}`); };

const now = () => new Date().toISOString();
// A truncated or half-written line surfaces naming the file and the line, not as a bare SyntaxError.
const parseNamed = (text, file, at) => {
  try { return JSON.parse(text); }
  catch (e) { return bad(`${file}${at ? ` line ${at}` : ''} is not valid JSON (${e.message}) — the file is truncated or was edited by hand`); }
};
const readJsonl = (file) => (existsSync(file)
  ? readFileSync(file, 'utf8').split('\n').map((l, i) => [l, i + 1]).filter(([l]) => l.trim()).map(([l, i]) => parseNamed(l, file, i))
  : []);

// --- the vocabulary -------------------------------------------------------------------------------

export const PROVENANCES = Object.freeze(['fictional', 'real']);
// #286 adds 'existing-prd'. One mode ships in the spine.
export const ENTRY_MODES = Object.freeze(['blank-idea']);
// How the PRD's Switch metric is measured — recorded per run rather than inferred (README §run.json).
export const FRONT_ENDS = Object.freeze(['portal', 'terminal']);
export const MCP_SERVER = 'discovery';

const RUN_SLUG_RE = /^[a-z0-9-]{1,48}$/;

// --- the slug and the roots -----------------------------------------------------------------------

// An exported named function, because a guard reachable only by starting a real agent run is a guard
// nobody tests (builder.mjs:assertScenarioSlug's own words).
export function assertRunSlug(slug) {
  if (typeof slug !== 'string' || !RUN_SLUG_RE.test(slug))
    bad(`"${slug ?? ''}" is not a usable run slug — lowercase letters, digits and hyphens only, 1–48 characters (it names the run package directory)`);
  return slug;
}

// R1 (discovery/README.md): provenance decides the root. Absolute, for node:fs.
export function resolveRunRoot({ provenance, slug }) {
  assertRunSlug(slug);
  if (provenance === 'fictional') return path.join(REPO_DIR, 'discovery', slug);
  if (provenance === 'real') return path.join(JOBS_DIR, '_discovery', slug);
  return bad(`provenance "${provenance}" is not one of ${PROVENANCES.join(' · ')} — it decides the run package's root (R1)`);
}

// The privacy refusal, and it takes the root as an ARGUMENT rather than re-deriving it (plan M3).
// JOBS_DIR is an import-time const in env.mjs, so a gate cannot repoint it; a version of this function
// that read JOBS_DIR itself would make group 30's "a real run inside the repo throws" case true by
// construction — the check that cannot fail. Compared on RESOLVED paths, not string forms, or a
// JOBS_DIR pointed inside the repo slips through.
export function assertProvenanceRoot(provenance, root) {
  if (!PROVENANCES.includes(provenance)) bad(`provenance "${provenance}" is not one of ${PROVENANCES.join(' · ')}`);
  if (typeof root !== 'string' || !root) bad('assertProvenanceRoot needs the resolved root path');
  const resolved = path.resolve(root);
  const repo = path.resolve(REPO_DIR);
  if (provenance === 'real' && (resolved === repo || resolved.startsWith(repo + path.sep)))
    bad(`"${resolved}" is inside this repo and the run's provenance is real — real product material is never committed here, because this repo is public and inspectable. Point JOBS_DIR outside the repo (R1, discovery/README.md)`);
  return root;
}

// The head's repo-relative `root` for a fictional run; the absolute one for a real run, which is never
// committed. See the header's note on the two values sharing one name.
const headRoot = (provenance, root) => (provenance === 'fictional' ? path.relative(REPO_DIR, root).split(path.sep).join('/') : root);

// --- the tool schema ------------------------------------------------------------------------------

// An SDK-free, zod-free descriptor the transport turns into zod and group 30 compares to the grammar
// BY NAME. It exists because spike 1's pre-flight P1 compared the advertised schema by CARDINALITY
// (`enum.length === 4`, `required.length === 3`) and would have passed four wrong enum values — the
// deferred F5 finding on #284. Keeping the field names in a table CI can reach is what turns that from
// a run-time surprise into a check.
//
// Key ORDER mirrors PARAMS, and it is load-bearing: the transport builds the zod raw shape by
// iterating these entries, and the advertised `required` array comes out in that order (plan M5).
export const TOOL_SCHEMA = Object.freeze({
  record_decision: Object.freeze({
    question_id: 'string|null', answer_ref: 'string', level: LEVELS, parent_id: 'int|null',
    evidence_refs: 'int[]', wrong_if: 'string', off_script: 'boolean',
  }),
  flag_weak_answer: Object.freeze({ question_id: 'string', answer_ref: 'string', missing: 'string[]' }),
  open_question: Object.freeze({ source: SOURCES, question_id: 'string|null', answer_ref: 'string', reason: 'string' }),
  file_evidence: Object.freeze({ url: 'string|null', ref: 'string|null', name: 'string|null', provenance: PROVENANCE, claim_ref: 'int|null' }),
});

export const TOOL_TYPES = Object.freeze(['string', 'string|null', 'int|null', 'int[]', 'string[]', 'boolean']);

export const toolNameFor = (op) => `mcp__${MCP_SERVER}__${op}`;

// The fence predicate, PURE and in the SDK-free module on purpose: that is what lets group 30 drive it
// exhaustively in CI, and it is the seam #287 widens into the per-run read allow-list. Built by mapping
// OPS, so a renamed server fails and a fifth verb is covered with no edit here.
//
// WHAT THE DENY BRANCH DENIES (#343, correcting the earlier claim that `tools: []` left it nothing): the
// main session's model is advertised the four op tools and nothing else, so IT never reaches the branch
// — the CLI's own subagent warmup does. On every start Claude Code pre-warms its built-in Explore, Plan
// and Bash agents with a "Warmup" prompt (cli.js p$9), and Explore runs pwd, ls, find and Glob on the
// cwd. Those calls hit this fence and are denied with denyReason's text (observed as their is_error
// tool_result in the agent-*.jsonl sidechains) — and they are not the discovery agent's, which is why
// fenceHooks below records a denial only outside a SubagentStart…SubagentStop bracket. Whether a deny
// from canUseTool or the hook actually blocks an MCP call stays unobserved; #287 owns that half.
const ALLOWED_TOOL_NAMES = new Set(OPS.map(toolNameFor));
export function allowsToolName(name) {
  return typeof name === 'string' && ALLOWED_TOOL_NAMES.has(name);
}

// --- the answer store -----------------------------------------------------------------------------

export const readAnswers = (root) => readJsonl(path.join(root, 'answers.jsonl'));

export const nextRef = (answers) => `a${(Array.isArray(answers) ? answers.length : 0) + 1}`;

// The STRUCTURAL half of the lock → guards → append → run ordering (runTurn below). A guard cannot
// enforce a call order, but it can refuse the damage a wrong order causes: an answer landing on a turn
// the agent already closed is a phantom answer in an append-only file the honesty contract forbids you
// to clean up, and it corrupts both AC #1's one-closer-per-turn read and #285's not-a-form counter.
// Pure over two arguments, so group 30 drives it in both directions.
export function assertTurnWritable(transcript, turn) {
  if (!Array.isArray(transcript)) bad('assertTurnWritable needs the parsed transcript lines');
  if (typeof turn !== 'string' || !turn) bad(`assertTurnWritable needs a turn id (got ${JSON.stringify(turn)})`);
  const closer = transcript.find((l) => l?.type === 'op' && l.closes && l.turn === turn);
  if (closer) bad(`turn "${turn}" is already closed by op ${closer.seq} — an answer cannot land on a closed turn (answers.jsonl is append-only and never rewritten)`);
  return turn;
}

// One line per submit, server-written. VERBATIM, and portal/lib/redact.mjs is deliberately NOT applied:
// redaction is trace-recorder.mjs's contract for AGENT output, and answers.jsonl's contract is the
// human's own text unrewritten. A redacted answer is a rewritten one, which would make the honesty
// claim false in the mirror direction. (The real risk sits with real-provenance runs, and those land
// outside the repo and are never committed — R1.)
export function appendAnswer(root, { turn, questionId, kind, text }) {
  if (typeof text !== 'string' || !text.trim()) bad('"text" must be a non-empty string — the answer is stored exactly as submitted, so there is nothing to fall back to');
  if (!['banked', 'off-script'].includes(kind)) bad(`"kind" must be banked or off-script (got ${JSON.stringify(kind)})`);
  assertTurnWritable(readTranscript(root), turn);
  const answers = readAnswers(root);
  // No trim, no normalisation: stored exactly as submitted.
  const record = { ref: nextRef(answers), ts: now(), turn, question_id: questionId ?? null, kind, text };
  appendFileSync(path.join(root, 'answers.jsonl'), `${JSON.stringify(record)}\n`);
  return record;
}

// --- the transcript -------------------------------------------------------------------------------

export const readTranscript = (root) => readJsonl(path.join(root, 'transcript.jsonl'));

// APPEND-ONLY. Never writeFileSync over an existing transcript; openSession creates the file only when
// it does not exist.
export function appendTranscript(root, line) {
  if (!line || typeof line !== 'object' || Array.isArray(line)) bad('appendTranscript needs a line object');
  const written = { ...line, ts: line.ts ?? now() };
  appendFileSync(path.join(root, 'transcript.jsonl'), `${JSON.stringify(written)}\n`);
  return written;
}

// Three shapes, three constructors, so no caller hand-builds one (discovery/README.md §File shapes).
export const textLine = ({ turn, text }) => ({ type: 'text', ts: now(), turn, text });

// The applier's record, copied through UNCHANGED — seq, turn, op, params, closes, flagged, supersedes
// are its and only its. applyOps refuses an item carrying them back in, and that refusal is the drift
// detector; editing one here would defeat it silently.
export const opLine = ({ record }) => ({
  type: 'op', ts: now(), seq: record.seq, turn: record.turn, op: record.op,
  params: record.params, closes: record.closes, flagged: record.flagged, supersedes: record.supersedes,
});

// A refused write — a fence denial, an applier refusal, or a schema-layer refusal. Widened from the
// README's original "a fence denial" by this ticket: spike 1 proved refusals surface on
// PostToolUseFailure, so that hook is the only record point a schema-layer refusal has, and a refused
// op is exactly the receipt the honesty contract keeps.
export const deniedLine = ({ turn, tool, input, error }) => ({ type: 'denied', ts: now(), turn, tool, input: input ?? null, error });

// --- the fence hooks ------------------------------------------------------------------------------

// The deny text both call sites use — the PreToolUse hook below and canUseTool in the transport.
export const denyReason = (name) => `${name} is not one of this run's op tools (${OPS.map(toolNameFor).join(', ')}) — the discovery session has no write tools and no read tools.`;

// The SDK `hooks` option's value, built HERE rather than in the transport so group 30 can run the hook
// functions in CI (#343). Plain objects and async functions in the SDK's shape — no SDK import.
//
// Every recording hook is try/caught and always returns { continue: true }: a thrown hook can interrupt
// the agent, and a recording bug must never alter the run it observes (trace-recorder.mjs's discipline).
//
// WHO IS BEING REFUSED. A PreToolUse input carries session_id, transcript_path and cwd, and all three
// are the MAIN session's for a subagent's call too — cli.js builds them from the global session id, and
// only SubagentStop names an agent_transcript_path. So the hook cannot tell a sidechain call apart from
// its input; the bracket does. SubagentStart adds the agent_id to a set, SubagentStop removes it, and a
// PreToolUse denial is RECORDED only while the set is empty — DENIED either way, the fence stays closed.
// A `denied` line was therefore INTENDED to mean the discovery agent itself was refused, with the CLI's
// warmup agents leaving no line.
//
// THAT IS NOT WHAT HAPPENS TODAY, and this header states it because the header is the specification.
// The 2026-09-01 re-recording of discovery/instrument-loans-1 (#338) drew 79 `denied` lines and NOT ONE
// is an op-tool refusal: Bash 53, Glob 9, Grep 7, ListMcpResourcesTool 6, ReadMcpResourceTool 3, Read 1,
// running `git status`, `pwd`, `git log` and — an Explore agent grepping the repo for the string
// "warmup". The bracket was not open when mainSession() ran, and the run cannot say why: either
// SubagentStart had not fired before the warmup agent's first tool call, or the bracket had already
// closed on a LAST stop while warmup agents kept calling tools. The two produce identical evidence.
// Until that is settled (#343's, not this file's — do not "fix" fenceHooks from this comment), read a
// `denied` line against its `tool`: an op tool is the agent, a built-in is the CLI.
//
// A set, not a boolean: the three warmup agents (Explore, Plan, Bash) start together and the
// bracket closes on the LAST stop. The state is per call, i.e. per turn's query(), so a SubagentStop
// that never fires suppresses PreToolUse's recording only for the rest of that turn — and under
// `tools: []` the main session's PreToolUse has nothing to suppress. PostToolUseFailure is gated by the
// TOOL, not the bracket (below), so the bracket's timing can never cost the agent's own refusal.
export function fenceHooks(root, turn, onLine) {
  const record = (line) => {
    try { const written = appendTranscript(root, line); onLine?.(written); }
    catch (e) { process.stderr.write(`discovery: hook error (non-fatal): ${e.message}\n`); }
  };
  const subagents = new Set();
  const mainSession = () => subagents.size === 0;

  return {
    SubagentStart: [{ hooks: [async (input) => { if (input?.agent_id) subagents.add(input.agent_id); return { continue: true }; }] }],
    SubagentStop: [{ hooks: [async (input) => { subagents.delete(input?.agent_id); return { continue: true }; }] }],
    // Fails CLOSED, and unlike the recording hooks it MAY alter the run — blocking out-of-fence calls
    // is its job. The permission fast path can auto-allow without ever consulting canUseTool, so
    // canUseTool alone cannot enforce the fence.
    PreToolUse: [{ hooks: [async (input) => {
      if (allowsToolName(input.tool_name)) return { continue: true };
      const reason = denyReason(input.tool_name);
      if (mainSession()) record(deniedLine({ turn, tool: input.tool_name, input: input.tool_input ?? null, error: reason }));
      return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
    }] }],
    // The ONLY record point for a refusal, handler or schema-layer (the transport's observation 3).
    // PostToolUse is deliberately NOT registered — the filed line is written by the handler, which
    // holds the seq. Gated by the TOOL, not the bracket (PR #344 review F1): the discovery agent's
    // refusal is always on an op tool and a warmup agent's failure never is, so an applier refusal
    // that lands while a warmup bracket is still open is kept, and this hook does not lean on the
    // SubagentStart-before-first-PreToolUse ordering. A non-op failure records nothing in either
    // session: cli.js fires this event from the tool's execution catch only, never for a PreToolUse
    // deny, so a non-op tool that reached execution was never the main session's.
    PostToolUseFailure: [{ hooks: [async (input) => {
      const error = String(input.error ?? JSON.stringify(input.tool_response ?? null));
      if (allowsToolName(input.tool_name)) record(deniedLine({ turn, tool: input.tool_name, input: input.tool_input ?? null, error }));
      return { continue: true };
    }] }],
  };
}

// --- run.json -------------------------------------------------------------------------------------

export function readRun(root) {
  const file = path.join(root, 'run.json');
  return existsSync(file) ? parseNamed(readFileSync(file, 'utf8'), file) : null;
}

export function writeRun(root, head) {
  writeFileSync(path.join(root, 'run.json'), `${JSON.stringify(head, null, 2)}\n`);
  return head;
}

const LABEL = { fictional: 'Real run — fictional scenario', real: 'Real run — real product' };

// Resume or open. DISK IS AUTHORITATIVE: an existing run.json is returned untouched, which is what
// makes a page reload and a server restart lose nothing (AC #5).
export function openSession({ slug, provenance, entryMode, depth, branch = null, frontEnd, posture }) {
  assertRunSlug(slug);
  const root = resolveRunRoot({ provenance, slug });
  assertProvenanceRoot(provenance, root);
  if (!ENTRY_MODES.includes(entryMode)) bad(`entryMode "${entryMode}" is not one of ${ENTRY_MODES.join(' · ')} (#286 adds the others)`);
  if (!FRONT_ENDS.includes(frontEnd)) bad(`frontEnd "${frontEnd}" is not one of ${FRONT_ENDS.join(' · ')} — it is how the Switch metric is measured, so it is recorded rather than inferred`);
  if (!Object.hasOwn(POSTURES, posture)) bad(`posture "${posture}" is not one of ${Object.keys(POSTURES).join(' · ')}`);
  selectDepth(depth);   // the bank's own throw names an unknown depth
  // branch is null in the spine — the branch selectors are #283's and do not exist in bank.mjs yet.
  if (branch !== null) bad('branch selection is #283 and is not in the spine — pass null');

  mkdirSync(root, { recursive: true });
  const existing = readRun(root);
  if (existing) return sessionView(root);

  writeRun(root, {
    slug, provenance, label: LABEL[provenance], entryMode, depth, branch,
    frontEnd, model: POSTURES[posture].model, posture, sessionId: null,
    startedAt: now(), endedAt: null, root: headRoot(provenance, root), turnStats: [],
  });
  // Both files exist from the start, so a reader never has to distinguish "absent" from "empty".
  for (const f of ['answers.jsonl', 'transcript.jsonl']) {
    const file = path.join(root, f);
    if (!existsSync(file)) writeFileSync(file, '');
  }
  return sessionView(root);
}

const mutateHead = (root, patch) => {
  const head = readRun(root);
  if (!head) bad(`no run.json under "${root}" — open the session first`);
  return writeRun(root, { ...head, ...patch(head) });
};

export const closeSession = (root) => mutateHead(root, () => ({ endedAt: now() }));

// Written when the SDK's init message arrives rather than after the turn returns (plan M4): a
// mid-stream throw would otherwise lose the id and the next turn would start a fresh SDK session —
// exactly the content AC #5's server-restart half claims survives. Idempotent, so the caller may
// re-record the value it was handed back.
export const recordSessionId = (root, sessionId) =>
  mutateHead(root, (head) => (head.sessionId === sessionId ? {} : { sessionId }));

// AC #2 wants turn count, TOKENS and per-turn latency as the input to the 30-question read, so the
// usage counters are recorded alongside the cost (plan M2) — cost is money and cannot be re-derived
// into a token budget. discovery/README.md §run.json documents the shape.
export const recordTurnStats = (root, stats) =>
  mutateHead(root, (head) => ({ turnStats: [...(head.turnStats ?? []), stats] }));

// --- the cursor -----------------------------------------------------------------------------------

// DERIVED from the record, never stored (invariant 4). A turn that did NOT close — the agent yielded
// without filing — leaves the cursor where it is, so the next submit re-uses the same question on the
// SAME turn id. R2 permits that, because the turn was never closed; do not invent a new turn id for it.
export function sessionView(root) {
  const head = readRun(root);
  if (!head) bad(`no run.json under "${root}" — open the session first`);
  const answers = readAnswers(root);
  const transcript = readTranscript(root);
  const questions = selectDepth(head.depth);
  const closedTurns = new Set(transcript.filter((l) => l?.type === 'op' && l.closes).map((l) => l.turn));
  const index = closedTurns.size;
  return {
    head,
    answers,
    transcript,
    cursor: {
      index,
      question: questions[index] ?? null,
      turn: `t${index + 1}`,
      total: questions.length,
      done: index >= questions.length,
    },
  };
}

// --- the config payload ---------------------------------------------------------------------------

// The rubric NEVER reaches the browser (plan M6). weakAnswer is what the agent judges the answer
// against; showing it beside the question would tell the person the answer. The plan kept it on the
// wire and forbade rendering it in a comment — but a comment is deletable and a wire is not, so it is
// stripped here and the posture reads it server-side through questionById. `note` and `provenanceNote`
// go with it: neither is the person's to read mid-question.
const forTheBrowser = (q) => ({ id: q.id, stage: q.stage, text: q.text, attribution: q.attribution, label: q.label });

export function discoveryConfig() {
  return {
    questions: QUESTIONS.map(forTheBrowser),
    depths: Object.entries(DEPTHS).map(([id, d]) => ({ id, label: d.label, when: d.when, count: d.ids.length })),
    provenances: PROVENANCES,
    entryModes: ENTRY_MODES,
    frontEnds: FRONT_ENDS,
    // id, label and model — never the prompt body.
    postures: Object.values(POSTURES).map((p) => ({ id: p.id, label: p.label, model: p.model })),
    ops: OPS,
    // So the UI can say whether a session can start before one is attempted (AC #6), the way
    // /api/build/config does it.
    hasToken: HAS_TOKEN,
  };
}

// --- the run lock ---------------------------------------------------------------------------------

// REFUSED, never queued: a queued run spends real tokens the operator did not knowingly ask for twice
// (builder.mjs's withRunLock, same reasoning). Exported rather than an inline boolean inside runTurn,
// because a rule that lives inside runTurn is one build-checks cannot reach — reaching it would mean
// starting a real agent run.
let inFlight = false;

export async function withDiscoveryRunLock(fn) {
  if (inFlight) bad('a discovery turn is already in flight — wait for it to finish (both turns would append to the same run package)');
  inFlight = true;
  try { return await fn(); } finally { inFlight = false; }
}

export const isDiscoveryRunInFlight = () => inFlight;

// --- the SSE projection ---------------------------------------------------------------------------

// The agent's pushback prose IS the thing the person has to read, so the cap is 4000 rather than
// stepEvent's 400: a 400-char cap would break the loop rather than bound a progress log. `truncated` is
// reported so the surface can point at the transcript for the rest.
export const TURN_EVENT_TEXT_MAX = 4000;

const cap = (s) => (typeof s === 'string' ? s.slice(0, TURN_EVENT_TEXT_MAX) : '');

// WHITELIST, never blacklist — a field added to the transcript later must not start streaming by
// default. A pure exported function so server.mjs holds no shape opinion of its own: a projection
// written inline in the route is one the gate cannot reach, and it would drift from the one the gate
// checks (builder.mjs's stepEvent, same reasoning).
//
// params.wrong_if / params.missing / params.reason are deliberately NOT projected. The surface reads
// the package after the turn; streaming the prose would put a second, divergent copy on the wire.
export function turnEvent(line) {
  if (!line || typeof line !== 'object') return null;
  if (line.type === 'text') {
    const text = cap(line.text);
    return { type: 'text', turn: line.turn ?? null, text, truncated: typeof line.text === 'string' && line.text.length > TURN_EVENT_TEXT_MAX };
  }
  if (line.type === 'op') {
    return {
      type: 'op', turn: line.turn ?? null, seq: line.seq ?? null, op: line.op ?? null,
      closes: line.closes ?? false,
      // COPIED, never aliased: a projection that handed out the transcript line's own array would let
      // a consumer rewrite a committed record without a write (group 30 case 13).
      flagged: Array.isArray(line.flagged) ? [...line.flagged] : [],
      supersedes: line.supersedes ?? null,
      questionId: line.params?.question_id ?? null, answerRef: line.params?.answer_ref ?? null,
    };
  }
  if (line.type === 'denied') {
    return { type: 'denied', turn: line.turn ?? null, tool: line.tool ?? null, error: cap(line.error) };
  }
  return null;
}

// --- the turn -------------------------------------------------------------------------------------

// The applier's state for this turn, rebuilt by folding the transcript's existing op lines. Reduced to
// { op, params, turn } first, because applyOps refuses an item carrying seq/closes/flagged back in —
// that refusal is deliberate and is the drift detector.
function stateFromTranscript(transcript, answers) {
  const items = transcript.filter((l) => l?.type === 'op').map((l) => ({ op: l.op, params: l.params, turn: l.turn }));
  return applyOps(items, { answers, bank: QUESTIONS, turn: null });
}

// THE ORDER IS LOCK → GUARDS → APPEND → RUN, and it is the whole function.
//
// The lock is FIRST because answers.jsonl is append-only and never rewritten: an append that happens
// before a lock refusal leaves a permanent answer line whose `turn` names a turn no agent ever ran, and
// AC #1's one-closer-per-turn read and #285's not-a-form counter both key on turns. A phantom turn is
// real pollution in the one file the honesty contract forbids you to clean up.
//
// The append is BEFORE the agent turn because the ref must exist when the applier resolves it. An agent
// turn that began before the append would make every answer_ref throw.
export async function runTurn({ slug, provenance, questionId, kind = 'banked', text, onLine }) {
  return withDiscoveryRunLock(async () => {
    const root = resolveRunRoot({ provenance, slug });
    assertProvenanceRoot(provenance, root);
    const view = sessionView(root);           // throws if there is no run.json
    const { head, cursor } = view;
    if (head.endedAt) bad(`run "${slug}" was closed at ${head.endedAt} — a closed session takes no more turns`);
    if (cursor.done) bad(`run "${slug}" has answered all ${cursor.total} questions of depth "${head.depth}" — there is nothing left to ask`);
    if (questionId !== cursor.question.id)
      bad(`"${questionId}" is not the question on the table — the cursor is at ${cursor.index + 1} of ${cursor.total}, which is "${cursor.question.id}"`);
    if (typeof text !== 'string' || !text.trim()) bad('an answer is required');

    const turn = cursor.turn;
    const answer = appendAnswer(root, { turn, questionId, kind, text });

    // The SDK enters HERE and nowhere earlier — after every guard above has passed. See invariant 1.
    const { runDiscoveryTurn } = await import('./discovery-transport.mjs');
    const answers = readAnswers(root);
    const { sessionId, stats } = await runDiscoveryTurn({
      root,
      head,
      question: questionById(questionId),
      answer,
      turn,
      posture: POSTURES[head.posture],
      // The HOLDER the server mutates ({ current }), not the bare run — buildOpServer throws otherwise.
      state: { current: stateFromTranscript(readTranscript(root), answers) },
      onLine,
    });
    // The transport already wrote it at init (plan M4); idempotent belt-and-braces for the caller.
    if (sessionId) recordSessionId(root, sessionId);
    if (stats) recordTurnStats(root, stats);
    return sessionView(root);
  });
}

// Named exports the gate compares against the grammar; re-exported so group 30 has one import.
export { LEVELS, OPS, PARAMS, PROVENANCE, SOURCES };
