// portal/lib/discovery.mjs — the discovery session: the run package on disk, and the one loop that
// fills it (epic #279, tickets #284, #285; docs/epics/discovery-partner.architecture.md §Recommended
// approach — approach C, answer-by-reference, two files so the separation is visible;
// discovery/README.md is the format spec this module conforms to).
//
// One banked question at a time. The server appends the person's answer to answers.jsonl, then a real
// Agent SDK run judges that ONE answer against that question's own weak-answer note, files at most one
// closing op through an in-process tool, and yields. What is left behind — run.json, answers.jsonl,
// transcript.jsonl — is the whole state.
//
// FIVE INVARIANTS a future editor must keep:
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
//      the data rather than a line in a prompt. An existing-prd AUDIT (#286) is this invariant applied
//      unchanged: the audited document is the run's one kind: "document" answer line, server-written
//      at openSession from what the person supplied, and every audit op names it by ref.
//   4. THE CURSOR IS DERIVED, NEVER STORED. It is a fold over the transcript's closed turns. Two
//      records of one fact drift — discovery/ops.mjs's emptyRun() comment says exactly this about
//      "closed", and a stored cursor is the same shape of mistake.
//   5. THE READ FENCE IS ONE PREDICATE, CALLED FROM TWO PLACES, FAILING CLOSED (#287; architecture
//      §Boundaries & contracts). allowsPath over a PER-RUN allow-set built from run.json — the run's
//      own package, the bank, and what `reads` names, nothing else — called from canUseTool AND from
//      the PreToolUse hook, because the permission fast path can auto-allow without consulting
//      canUseTool. Both sites deny on a throw. Every denial is a `denied` line naming the site that
//      refused it (`via`). Under `tools: []` no real run advertises a read tool yet; the fence is
//      wired now so that widening MAIN_TOOLS in the transport is one array edit, and the fence probe
//      (discovery-transport.mjs --probe-fence) is the run-time proof that each site holds alone.
//
// The rules layer (#285, #286) — the tables and the pure reads — sits before openSession; every one of
// them is driven by group 30 with no agent and no token.
//
// The head's `root` and the resolved filesystem root are TWO DIFFERENT VALUES and one name (plan M7):
// resolveRunRoot() returns an absolute path; run.json's `root` is repo-relative for fictional runs, per
// discovery/README.md's example, because an absolute home-dir path must never be committed. head.root
// is never fed to node:fs — every path is re-resolved from { slug, provenance }.

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { DEPTHS, FACETS, facetPlan, MODULES, OPENING_SET, PRESETS, questionById, QUESTIONS, selectDepth } from '../../discovery/bank.mjs';
import { applyOps, ledgerView, LEVELS, OPS, PARAMS, PROVENANCE, SOURCES } from '../../discovery/ops.mjs';
import { HAS_TOKEN, JOBS_DIR, REPO_DIR } from './env.mjs';
import { MODEL_SETTABLE, MODELS, POSTURES, resolvePosture } from './discovery-postures.mjs';

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
// The two entry modes (PRD MVP 2; #286 added the second). A blank idea is interviewed; an existing
// PRD is AUDITED — its document stored once and judged against every question of the depth.
export const ENTRY_MODES = Object.freeze(['blank-idea', 'existing-prd']);
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
// main session's model is advertised the four op tools and nothing else, so IT never reaches the deny
// path — the CLI's own subagent warmup does. On every start Claude Code pre-warms its built-in Explore, Plan
// and Bash agents with a "Warmup" prompt (cli.js p$9), and Explore runs pwd, ls, find and Glob on the
// cwd. Those calls hit this fence and are denied with denyReason's text (observed as their is_error
// tool_result in the agent-*.jsonl sidechains) — and they are not the discovery agent's, which is why
// fenceHooks below records a denial only on an mcp__ tool name (#349; the bracket it replaced is told
// there). Whether a deny at either site actually STOPS a call is a run-time fact no CI group can see;
// the fence probe (discovery-transport.mjs --probe-fence, #287) observes it with each site holding alone.
const ALLOWED_TOOL_NAMES = new Set(OPS.map(toolNameFor));
export function allowsToolName(name) {
  return typeof name === 'string' && ALLOWED_TOOL_NAMES.has(name);
}

// Could the MAIN session have made this call at all? Under `tools: []` its only tools are MCP tools,
// and the SDK prefixes every one of those mcp__<server>__<tool>; the CLI's warmup agents have none.
// The record gate for a PreToolUse denial (#349) — a predicate, not a list of built-ins, so a built-in
// this CLI version has not got yet is still the CLI's.
export function isMcpToolName(name) {
  return typeof name === 'string' && name.startsWith('mcp__');
}

// --- the read fence (#287) ------------------------------------------------------------------------

// The bank is a file the run may read; everything else it may read is the package and `reads`.
export const BANK_PATH = path.join(REPO_DIR, 'discovery', 'bank.mjs');

// The built-in tools that carry a path, and the input field it travels in. This table is the whole
// reach of the path allow-list: a tool not in it is decided by NAME (op tools allowed, the rest
// denied), so WebSearch / WebFetch — MVP 7's look-it-up path, a separate fence that stays open — can
// never be closed by a path rule. Group 30 pins the key set, so adding one here goes red by name.
export const READ_TOOLS = Object.freeze({ Read: 'file_path', Grep: 'path', Glob: 'path' });

// Where a `denied` line was refused: the two fence call sites, and the record point for an applier
// or schema-layer refusal (the transport's observation 3).
export const FENCE_SITES = Object.freeze(['PreToolUse', 'canUseTool', 'PostToolUseFailure']);

// The per-run allow-set, built from run.json so a resumed session after a server restart rebuilds
// the same fence (invariant 2 — a fence held only in memory would silently widen). `reads` is stored
// as given (repo-relative for a committed fixture) and resolved against REPO_DIR here. Why per run
// rather than one static list: run 2 must admit docs/epics/fixtures/<fixture> while refusing
// docs/epics/discovery-partner.prd.md one directory above it, and run 1 reads nothing beyond its
// package — no one list serves both.
export function allowSetFor({ root, reads = [] } = {}) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) bad(`allowSetFor needs the run root as an absolute path (got ${JSON.stringify(root) ?? String(root)})`);
  if (!Array.isArray(reads) || reads.some((r) => typeof r !== 'string' || !r.trim()))
    bad(`"reads" must be an array of non-empty path strings — each names a file or directory this run may read beyond its package and the bank (got ${JSON.stringify(reads) ?? String(reads)})`);
  const resolvedRoot = path.resolve(root);
  return Object.freeze({ root: resolvedRoot, paths: Object.freeze([resolvedRoot, BANK_PATH, ...reads.map((r) => path.resolve(REPO_DIR, r))]) });
}

// THE PREDICATE. Pure over its two arguments — no fs, no SDK — so group 30 drives both run shapes in
// CI. A path is allowed iff, resolved against the run root, it IS an entry or lies UNDER one
// (entry + sep, so `<root>-evil/x` is not under `<root>`). Junk in either argument is a DENIAL, never
// a throw: the predicate's own fail-closed. Symlink-blind by design (resolve, not realpath): the
// roots are real paths (the repo or JOBS_DIR) and the probe hands the agent real paths too.
export function allowsPath(allowSet, p) {
  const paths = allowSet?.paths;
  if (typeof allowSet?.root !== 'string' || !path.isAbsolute(allowSet.root) || !Array.isArray(paths) || paths.length === 0)
    return { allow: false, reason: 'this run has no read allow-set — denied, fail closed' };
  if (typeof p !== 'string' || !p.trim())
    return { allow: false, reason: `no path was named (got ${JSON.stringify(p) ?? String(p)}) — denied, fail closed` };
  const abs = path.resolve(allowSet.root, p);
  const hit = paths.find((a) => typeof a === 'string' && (abs === a || abs.startsWith(a + path.sep)));
  if (hit) return { allow: true, reason: `${abs} is under ${hit}` };
  return { allow: false, reason: `${abs} is outside this run's read allow-set — a run may read its own package, the bank and what its run.json names in "reads" (here: ${paths.join(', ')}), nothing else` };
}

// ONE decision for both call sites. An op tool passes by name; a path tool passes by allowsPath over
// the field READ_TOOLS names (Grep and Glob search the cwd when no path is given, and the cwd is the
// run root; Read must name a file); anything else is denied by name — Write, Edit and Bash stay
// closed whatever path they carry, which is the "no write tools" line carried from the spine.
// `extraTools` (#359) is a PER-CALL widening the caller opts into: one name, this run's own vocabulary.
// allowsToolName itself is deliberately NOT widened — case 14 drives it exhaustively as the statement
// "the discovery SESSION's vocabulary is the four op verbs", and that statement stays true. Defaulted
// to [], which case 25's mirror proves byte-identical to the argument being absent, so no existing
// caller changes behaviour. Junk in it denies rather than throwing, this function's own fail-closed.
export function fenceDecision(allowSet, tool, input, extraTools = []) {
  if (allowsToolName(tool)) return { allow: true, reason: `${tool} is one of this run's op tools` };
  if (Array.isArray(extraTools) && extraTools.includes(tool)) return { allow: true, reason: `${tool} is one of this run's tools` };
  if (typeof tool === 'string' && Object.hasOwn(READ_TOOLS, tool)) {
    const named = input?.[READ_TOOLS[tool]];
    return allowsPath(allowSet, named ?? (tool === 'Read' ? undefined : '.'));
  }
  return { allow: false, reason: denyReason(tool) };
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

// The audited document (#286 D1): ONE server-written answer line per existing-prd run, kind
// "document", turn and question_id null (it answers every question), written at openSession and
// never through appendAnswer — whose kind guard stays banked | off-script, so a banked turn can never
// write one by accident. VERBATIM for appendAnswer's reason: no trim, no normalisation, redact.mjs
// deliberately not applied; a paste may carry whatever line endings the person's editor gave it, and
// the md5 sessionView reports is over exactly these bytes (run 2's freeze check, D6).
export function appendDocument(root, text) {
  if (typeof text !== 'string' || !text.trim()) bad('the document must be a non-empty string — it is stored exactly as supplied, so there is nothing to fall back to');
  const answers = readAnswers(root);
  const already = documentOf(answers);
  if (already) bad(`this run already holds a document (ref ${already.ref}) — one document per audit run`);
  const record = { ref: nextRef(answers), ts: now(), turn: null, question_id: null, kind: 'document', text };
  appendFileSync(path.join(root, 'answers.jsonl'), `${JSON.stringify(record)}\n`);
  return record;
}

// The one document line in a store, or null. Total over junk, like the projection's resolvers.
export const documentOf = (answers) => (Array.isArray(answers) ? answers.find((a) => a?.kind === 'document') ?? null : null);

// What an audit turn judges: the stored document, read off the view. Exported so group 30 drives it;
// runTurn only calls it. A missing line is a corrupt package, not a turn to run.
export function auditAnswerFor(view) {
  const found = documentOf(view?.answers);
  if (!found) bad(`run "${view?.head?.slug}" is an existing-prd audit but answers.jsonl holds no document line — the package is corrupt; a session is opened with its document`);
  return found;
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
// op is exactly the receipt the honesty contract keeps. `via` names WHERE it was refused (#287): the
// fence's refusals are part of the auditable record, and "which site caught it" is the fact the
// two-site design exists to make checkable.
export const deniedLine = ({ turn, tool, input, error, via }) => {
  if (!FENCE_SITES.includes(via)) bad(`deniedLine needs "via" naming the site that refused the call — one of ${FENCE_SITES.join(' · ')} (got ${JSON.stringify(via) ?? String(via)})`);
  return { type: 'denied', ts: now(), turn, tool, input: input ?? null, error, via };
};

// --- the fence: the two call sites ----------------------------------------------------------------

// The deny text both call sites use for a tool that is neither an op tool nor a fenced read tool.
export const denyReason = (name) => `${name} is not one of this run's op tools (${OPS.map(toolNameFor).join(', ')}) — the discovery session has no write tools, and Read, Grep and Glob are fenced to the run's read allow-set.`;

// What ONE call site needs: the fail-closed decision, the record gate, the transcript writer and the
// trace. Built once per site per turn; fenceHooks and fenceCanUseTool below are the two sites and
// nothing else — a third caller of fenceDecision would be a third fence.
//
// FAIL CLOSED. fenceDecision is pure and answers junk with a denial, but a bug in it — or a hostile
// allow-set; group 30 drives one whose `paths` getter throws — must DENY, not escape as an exception
// the SDK turns into an interrupted turn or, worse, into a tool that ran. The try/catch here is the
// ticket's "denied when the predicate is not reached".
//
// THE RECORD GATE (#349, widened by one term here). A denial is the discovery agent's — and so a
// `denied` line — iff the tool is an mcp__ name (isMcpToolName) OR a built-in the MAIN session is
// actually advertised (`mainTools`, the transport's `tools` array). Under `tools: []` the second term
// is empty and #349's rule is byte-identical: every built-in denial is the CLI's warmup, unrecorded.
// When a run advertises Read (the fence probe today; the run-2 ticket tomorrow) a Read denial is the
// agent's. What the widened rule cannot see: a warmup agent's Read OUTSIDE the allow-set on such a
// run would be recorded as the agent's — a false receipt. Every observed warmup read is of the cwd
// (bracket-trace-1/-2's traces), which the allow-set admits, so none is expected; the fence trace
// shows it if one ever lands.
//
// TWO KINDS OF RUN, ONE FENCE (#359). `extraTools` names this run's OWN tool — the discovery session
// passes none, a proposal run passes one — and `write` replaces the transcript append for a caller
// whose refusals do not belong in transcript.jsonl (a proposal run appends nothing to the session's
// files, which is what protects #359's AC #4). Both default to today's behaviour.
function fenceSite({ root, turn, onLine, allowSet = null, mainTools = [], extraTools = [], write = null }) {
  // `ts` is stamped HERE rather than left to appendTranscript, because `write` bypasses it and a
  // streamed line with no ts would be a second shape on the same wire. appendTranscript's own
  // `line.ts ?? now()` then finds one already present and is a no-op — one shape, one clock.
  const record = (line) => {
    const stamped = { ...line, ts: line.ts ?? now() };
    try { const written = write ? write(stamped) : appendTranscript(root, stamped); onLine?.(written); }
    catch (e) { process.stderr.write(`discovery: hook error (non-fatal): ${e.message}\n`); }
  };

  // THE FENCE TRACE (#349) — OFF unless DISCOVERY_FENCE_TRACE names a file. Point it OUTSIDE the run
  // root: a package is committed with a fixed file set, so an armed path inside one puts a fourth file
  // in it. That is operator discipline, NOT enforced here — a resolve-and-refuse guard would null the
  // very path group 30's case 22 arms to prove the swallow below, and the case would go on passing
  // while testing nothing. Read per call, i.e. per turn's query(), so an operator can arm it for one
  // recording without a restart, and so group 30 can drive it. Every DECISION on a tool that is not one
  // of this run's op tools lands there — ALLOW as well as deny (#287) — with its tool, its site (the
  // event name) and whether it wrote a transcript line: a recording with zero built-in `denied` lines
  // proves nothing if the warmup happened to be quiet, and these lines are what show the warmup DID
  // call tools. Denials alone stopped being enough when the read fence started admitting an in-root
  // Read/Grep/Glob: bracket-trace-1's committed trace holds three warmup Globs on the cwd, and under a
  // deny-only trace those three — the very class #287 opened — would leave no line at all. The agent's
  // OWN op calls are deliberately not traced: those are transcript.jsonl's job, and tracing them would
  // bury the warmup in the noise of a normal run. `recorded` says a `denied` line was written, so it is
  // false on every allow. NEVER through appendTranscript — transcript.jsonl has three typed
  // line types (discovery/README.md §File shapes) and the SSE projection's whitelist is asserted by
  // mutation, so a fourth type would be a format change wearing a debug flag. Swallowed on failure: an
  // observation that can disturb the run it observes is worse than no observation.
  const traceTo = process.env.DISCOVERY_FENCE_TRACE || null;
  const trace = (event) => {
    if (!traceTo) return;
    try { appendFileSync(traceTo, `${JSON.stringify({ ts: now(), turn, ...event })}\n`); }
    catch { /* see above: a broken instrument must not break the recording */ }
  };

  const isRecorded = (tool) => isMcpToolName(tool) || (Array.isArray(mainTools) && mainTools.includes(tool));
  // A run's OWN tool is never traced, whichever list it comes from — the same reason an op tool is
  // not: the trace exists to show what the CLI's warmup did, and burying that in a normal run's own
  // calls is what a deny-only trace already got wrong once (#349).
  const isOwnTool = (tool) => allowsToolName(tool) || (Array.isArray(extraTools) && extraTools.includes(tool));
  // ONE decision, one site, traced whenever armed. The trace hangs here rather than on the refusal so
  // that an ALLOWED built-in is observed too (see above); an op tool is the agent's own vocabulary and
  // is never traced, allow or deny.
  const decide = (site, tool, input) => {
    let d;
    try { d = fenceDecision(allowSet, tool, input, extraTools); }
    catch (e) { d = { allow: false, reason: `the fence could not evaluate ${String(tool)} (${e.message}) — denied, fail closed` }; }
    if (!isOwnTool(tool)) trace({ event: `${site}.${d.allow ? 'allow' : 'deny'}`, tool: tool ?? null, recorded: d.allow ? false : isRecorded(tool) });
    return d;
  };
  // The denial's transcript line, written when the denial is the agent's. Returns the reason so each
  // site hands the SDK the same text it wrote.
  const deny = (site, tool, input, reason) => {
    if (isRecorded(tool)) record(deniedLine({ turn, tool, input: input ?? null, error: reason, via: site }));
    return reason;
  };
  return { record, decide, deny, isOwnTool };
}

// SITE 2 — canUseTool, the SDK's permission callback. The transport passes this where it used to hold
// an inline copy of the name check. `{ behavior, updatedInput | message }` is runtimeTypes.d.ts's
// PermissionResult; updatedInput is the input handed back UNCHANGED, never a rewrite. Consulted only
// when the CLI's permission flow asks — the fast path may not ask, which is why site 1 exists.
export function fenceCanUseTool(root, turn, onLine, opts = {}) {
  const site = fenceSite({ root, turn, onLine, ...opts });
  return async (tool, input) => {
    const d = site.decide('canUseTool', tool, input);
    if (d.allow) return { behavior: 'allow', updatedInput: input };
    return { behavior: 'deny', message: site.deny('canUseTool', tool, input, d.reason) };
  };
}

// SITE 1 — the SDK `hooks` option's value, built HERE rather than in the transport so group 30 can run
// the hook functions in CI (#343). Plain objects and async functions in the SDK's shape — no SDK
// import. `opts` is `{ allowSet, mainTools, extraTools, write }`; called with none (as group 30's older
// cases do) it is the #349 name fence with every path tool failing closed for want of an allow-set.
// `extraTools` admits this run's own tool by name and `write` diverts the recorder for a caller whose
// refusals do not belong in transcript.jsonl — both #359's, both defaulted to today's behaviour.
//
// Every recording hook is try/caught and always returns { continue: true }: a thrown hook can interrupt
// the agent, and a recording bug must never alter the run it observes (trace-recorder.mjs's discipline).
//
// WHO IS BEING REFUSED. A PreToolUse input carries session_id, transcript_path and cwd, and all three
// are the MAIN session's for a subagent's call too — cli.js builds them from the global session id, and
// only SubagentStop names an agent_transcript_path. So the hook cannot tell a sidechain call apart from
// its input. #343 tried to tell it from TIMING — a SubagentStart…SubagentStop bracket, a denial
// recorded only while no subagent was open — and #349's paid observation (discovery/bracket-trace-1,
// the trace beside its report) showed why that never held: the CLI delivered SubagentStart on the
// session's CREATE turn only, 0 of 11 RESUMED turns, while SubagentStop arrived on every turn. Every
// turn after the first is a resume (the transport's resume-per-turn), so the bracket was structurally
// absent for the whole run, and the count of recorded warmup denials was simply how busy the warmup
// was that day (3, 79, 4, 7 across four recordings of one answer sheet). WHY the CLI drops the start
// hook on a resumed session is inside cli.js and NOT observed; nothing here depends on it any more.
//
// Both recording hooks are therefore gated by the TOOL NAME, which needs no ordering at all. Under
// `tools: []` the main session is advertised the op server's mcp__ tools and nothing else (the init
// message's tool list; the preflight's PF1 compares it to OPS), so an mcp__ name is the only name the
// discovery agent can call; the CLI's warmup agents run with mcpClients: [] and the built-in set
// (cli.js p$9 → BP0), so a built-in is the only name THEY can call. A PreToolUse denial is RECORDED
// only for an mcp__ name (isMcpToolName) — DENIED either way, the fence stays closed. A `denied` line
// naming a built-in is never written now; the ones in packages recorded before this rule
// (instrument-loans-1 at 42cca5e and at 7efdde37's recording, bracket-trace-1) are the CLI's and
// stay, dated by the git history. PostToolUseFailure has been gated by the tool since PR #344 F1.
//
// What this rule cannot see: an SDK that stopped honouring `tools: []`. The agent's own Bash call
// would then be denied and unrecorded — a lost receipt, not a false one. The preflight is the check.
export function fenceHooks(root, turn, onLine, opts = {}) {
  const site = fenceSite({ root, turn, onLine, ...opts });
  return {
    // Fails CLOSED, and unlike the recording hooks it MAY alter the run — blocking out-of-fence calls
    // is its job. The permission fast path can auto-allow without ever consulting canUseTool, so
    // canUseTool alone cannot enforce the fence. An allow adds no opinion ({ continue: true }): the
    // permission flow, canUseTool included, still runs behind it.
    PreToolUse: [{ hooks: [async (input) => {
      const tool = input?.tool_name;
      const d = site.decide('PreToolUse', tool, input?.tool_input);
      if (d.allow) return { continue: true };
      const reason = site.deny('PreToolUse', tool, input?.tool_input, d.reason);
      return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
    }] }],
    // The ONLY record point for a refusal, handler or schema-layer (the transport's observation 3).
    // PostToolUse is deliberately NOT registered — the filed line is written by the handler, which
    // holds the seq. Gated by the TOOL (PR #344 review F1): the discovery agent's refusal is always on
    // an op tool and a warmup agent's failure never is. A non-op failure records nothing: cli.js fires
    // this event from the tool's execution catch only, never for a PreToolUse deny, so a non-op tool
    // that reached execution was never the main session's.
    PostToolUseFailure: [{ hooks: [async (input) => {
      const error = String(input.error ?? JSON.stringify(input.tool_response ?? null));
      if (site.isOwnTool(input.tool_name)) site.record(deniedLine({ turn, tool: input.tool_name, input: input.tool_input ?? null, error, via: 'PostToolUseFailure' }));
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

// --- the rules layer (#285; PRD MVP 5, MVP 6, MVP 8; decision doc D1b, D3, D4, D5) ------------------

// The interview rungs in order (MVP 5's table). whole-bank is OFF the ladder: a stress test of the
// bank whose 65 sealed answers are pasted one per question (#348's protocol), so it never holds a
// question for a second ask and never proposes a step up. Group 30 pins LADDER ∪ { whole-bank } to
// the depth menu, so a fifth depth is placed here by name rather than falling on one side by default.
export const LADDER = Object.freeze(['scope-check', 'opening-set', 'full-discovery']);

// D5's rule, as a table: which rung proposes which. ONE row, because MVP 5 writes it for Scope check
// alone ("a repeated weak answer at Scope check means proposing a step up, never grinding on"). Not
// derived from LADDER, so a rung escalates only where the PRD says it does; group 30 pins each row to
// the rung immediately above its key.
export const ESCALATES = Object.freeze({ 'scope-check': 'opening-set' });

// What the server proposes per entry mode (MVP 5: the agent proposes, the human confirms). Under
// approach C the server is the sequencing side, so the proposal is a table the gate can drive and it
// costs no token. blank-idea is MVP 5's "a new product". #286 adds a row per entry mode it adds —
// group 30 iterates ENTRY_MODES against this table both ways, so a mode with no row fails by name.
// existing-prd (#286 D7): a document that already describes a product can be audited at any depth
// (MVP 5), so the proposal is the full ladder, as for a blank idea.
export const DEPTH_PROPOSAL = Object.freeze({ 'blank-idea': 'full-discovery', 'existing-prd': 'full-discovery' });

// Which postures may open which entry mode (#286; MVP 1, MVP 2). A blank idea takes any of the four;
// an existing PRD starts at Grill and nowhere else — the audit is Grill's second template. Group 30
// iterates this table against ENTRY_MODES and POSTURES in both directions.
export const ENTRY_POSTURES = Object.freeze({
  'blank-idea': Object.freeze(['think', 'think-opus', 'create-prd', 'grill']),
  'existing-prd': Object.freeze(['grill']),
});

// MVP 1's three buttons, in the order they are pressed. A STEP is a stance; a POSTURE is a prompt, and
// Think has two — the same buildThinkTurn under two models, which is a comparison rather than a fourth
// stance, so it rides its own step as a variant. The FIRST entry of `postures` is the step's default.
// "Pressable in order" is a flow ACROSS RUNS: run.json records ONE posture and runTurn resolves it from
// head.posture, and turnStats stamps that posture's fingerprint on every turn — a package whose turns
// ran under three fingerprints could not state what prompt surface produced it. So a step is chosen at
// session start and stands for the session; Think's run, then Create PRD, then Grill over the PRD it
// produced. Group 30 iterates this table against POSTURES and ENTRY_POSTURES in both directions, so a
// fifth posture with no step, or a step naming a posture POSTURES does not hold, fails by name rather
// than falling off a menu. `order` is redundant with array position ON PURPOSE — the gate asserts they
// agree, so a reorder that forgets one fails instead of silently renumbering the buttons.
export const POSTURE_FLOW = Object.freeze([
  Object.freeze({
    step: 'think', label: 'Think', order: 1, postures: Object.freeze(['think', 'think-opus']),
    what: 'Interview a blank idea against the bank. Answers first — the shape comes later.',
  }),
  Object.freeze({
    step: 'create-prd', label: 'Create PRD', order: 2, postures: Object.freeze(['create-prd']),
    what: 'Judge each answer against the PRD section it will render into.',
  }),
  Object.freeze({
    step: 'grill', label: 'Grill', order: 3, postures: Object.freeze(['grill']),
    what: 'Run the weak-answer note as a checklist — and the one stance an existing PRD opens at.',
  }),
]);

// The variant a step offers beyond its default, keyed by posture. Rendered as a checkbox on the step's
// own row, so the second posture is reachable without a fourth button (MVP 1 says three).
export const POSTURE_VARIANT_LABEL = Object.freeze({ 'think-opus': 'on Opus — the same prompt, the other model' });

// Whether the hold rule applies per entry mode (#286 D7). A document cannot answer twice, so an audit
// never holds a question for a second ask: every question is judged once and the cursor moves on.
// deriveCursor reads this beside LADDER.
export const RE_ASKS = Object.freeze({ 'blank-idea': true, 'existing-prd': false });

// Which depths compose from a facet vector (D1b). Asserted by DRIVING the bank, never by reading this
// list: group 30 proves selectDepth(d, <declared vector>) differs from selectDepth(d) iff d is here.
export const COMPOSES = Object.freeze(['full-discovery']);

// PRD §Success metrics, "Not a form": never more than 3 consecutive questions with no decision and no
// weak-answer note. A target the metric reports against, not a guard that stops a session.
export const NOT_A_FORM_MAX = 3;

// The vector as run.json records it: null for NO vector (undefined, null, {} — every package before
// #285 and every one-argument caller), else all five keys as booleans in FACETS order. So a reader
// sees five keys or null, and the consumer preset (all false, DECLARED) is distinguishable from
// "nothing declared" (D1b). Junk — an unknown key, a non-boolean — throws by the bank's own name, so
// no run.json can carry a vector the bank would not read. Own keys only, as the bank reads them.
export function declareFacets(facets) {
  const plan = facetPlan(facets);
  if (!plan.declared) return null;
  return Object.freeze(Object.fromEntries(FACETS.map((f) => [f.id, Object.hasOwn(facets, f.id) && facets[f.id] === true])));
}

const closersOf = (transcript) => transcript.filter((l) => l?.type === 'op' && l.closes === true);

// THE CURSOR — derived from the record (invariant 4), read from the LAST closer rather than counted:
// its question's position in the list, plus one unless that question is HELD for a second ask. A
// question is held when the depth is on the ladder, its last closer is a flag_weak_answer and it has
// been asked only once — MVP 6's "pushes back once", the README's "a revisited question on a new turn
// is a fresh slot". A second closer of ANY kind settles it: never a third ask. Reading from the last
// closer, not counting closers, is what keeps every package recorded before this rule consistent with
// itself — graded-think-a holds eleven weak flags the record then moved past, and each reads as
// settled because a later closer sits on a later question. The turn id counts closers, not positions,
// so a held question gets a fresh turn id and R2 keeps one closer per turn. The hold is also OFF in
// an existing-prd audit (RE_ASKS, #286): a document cannot answer twice. `entryMode` defaults to
// blank-idea so every caller and every package recorded before #286 reads exactly as before.
export function deriveCursor({ depth, questions, transcript, entryMode = 'blank-idea' }) {
  if (!Array.isArray(questions) || !Array.isArray(transcript)) bad('deriveCursor needs the depth\'s question list and the parsed transcript');
  if (!ENTRY_MODES.includes(entryMode)) bad(`entryMode "${entryMode}" is not one of ${ENTRY_MODES.join(' · ')} — the hold rule reads it (RE_ASKS)`);
  const closers = closersOf(transcript);
  const turn = `t${closers.length + 1}`;
  const at = (index, ask) => ({ index, ask, question: questions[index] ?? null, turn, total: questions.length, done: index >= questions.length });
  if (!closers.length) return at(0, 1);
  const last = closers[closers.length - 1];
  const qid = last.params?.question_id ?? null;
  const pos = questions.findIndex((q) => q.id === qid);
  if (pos === -1) bad(`transcript op ${last.seq} closes "${qid}", which is not in depth "${depth}"'s list — the record and the list disagree (was run.json edited after the fact?)`);
  const asks = closers.filter((c) => c.params?.question_id === qid).length;
  const held = RE_ASKS[entryMode] && LADDER.includes(depth) && last.op === 'flag_weak_answer' && asks < 2;
  return held ? at(pos, 2) : at(pos + 1, 1);
}

// D5: at a rung ESCALATES names, a question flagged weak on BOTH of its asks proposes the rung above.
// A VALUE on the view, never a mutation — run.json's depth is written once (D3) and the cursor has
// already settled the question, so the session continues. The person confirms by starting a new run at
// the proposed depth, or declines by carrying on. Null everywhere else, and null while the second ask
// is still open (one flag is a pushback, not a repeat).
export function escalationFor({ depth, transcript }) {
  const to = ESCALATES[depth];
  if (!to) return null;
  const byQuestion = new Map();
  for (const c of closersOf(transcript).filter((c) => c.op === 'flag_weak_answer'))
    byQuestion.set(c.params.question_id, [...(byQuestion.get(c.params.question_id) ?? []), c]);
  const because = [...byQuestion].filter(([, cs]) => cs.length >= 2)
    .map(([questionId, cs]) => ({ questionId, turns: cs.map((c) => c.turn), seqs: cs.map((c) => c.seq) }));
  if (!because.length) return null;
  return {
    from: depth, to, because,
    how: `A scoping question weak on both asks says the problem is not yet known, and "${to}" asks it. A run's depth is recorded once: to step up, start a new run at "${to}"; to decline, carry on — nothing here forces it.`,
  };
}

const rateOf = (part, whole) => (whole ? part / whole : null);
const tally = (closers, ids) => {
  const set = new Set(ids);
  const mine = closers.filter((c) => set.has(c.params?.question_id));
  const decided = mine.filter((c) => c.op === 'record_decision').length;
  return { closed: mine.length, decided, rate: rateOf(decided, mine.length) };
};

// The two counters, coverage and the D4 read — ARITHMETIC over the closers (architecture §Data model
// R2), never judgement, so group 30 drives every value at 0/1/2/3/4. Only closers count: file_evidence
// never closes and no off-script op does, so neither can touch a number here. Reported, never passed —
// a target on a counter invites tuning the bank to it (decision doc D4). Two counting bases, on
// purpose: `coverage` dedupes by QUESTION (a question asked is covered once, however many turns it
// took), while `weak` and the D4 tallies count CLOSERS — the PRD's own D4 wording, "a turn closed by
// record_decision counts". So a question held then decided reads coverage 1 asked / 1 decided beside
// closed 2 / decided 1 / rate 0.5. Case 29 pins the pair so the per-turn reading cannot drift.
export function runMetrics({ depth, facets = null, questions, transcript, entryMode = 'blank-idea' }) {
  const closers = closersOf(transcript);
  // Not a form (MVP 8): a decision or a weak-answer note resets, a parked question increments.
  let streak = 0, longest = 0;
  for (const c of closers) { streak = c.op === 'open_question' ? streak + 1 : 0; longest = Math.max(longest, streak); }
  const flagged = closers.filter((c) => c.op === 'flag_weak_answer').length;
  // Coverage of the twelve from the OPS, not the cursor: a question skipped is not a question covered.
  const asked = new Set(closers.map((c) => c.params?.question_id));
  const decided = new Set(closers.filter((c) => c.op === 'record_decision').map((c) => c.params?.question_id));
  // The same entry mode the view's cursor reads — without it completion.done disagrees with the
  // cursor on an audit's last question (#286).
  const cursor = deriveCursor({ depth, questions, transcript, entryMode });
  const twelve = new Set(OPENING_SET);
  return {
    completion: { settled: cursor.index, total: questions.length, done: cursor.done, turns: closers.length },
    notAForm: { streak, longest, max: NOT_A_FORM_MAX, tripped: longest > NOT_A_FORM_MAX },
    weak: { flagged, closed: closers.length, rate: rateOf(flagged, closers.length) },
    coverage: { asked: OPENING_SET.filter((id) => asked.has(id)).length, decided: OPENING_SET.filter((id) => decided.has(id)).length, of: OPENING_SET.length, missing: OPENING_SET.filter((id) => !asked.has(id)) },
    // D4, full-discovery only: the facet-selected tail against the twelve, plus which modules composed.
    askedWhatMattered: COMPOSES.includes(depth)
      ? { twelve: tally(closers, OPENING_SET), tail: tally(closers, questions.map((q) => q.id).filter((id) => !twelve.has(id))), modules: facetPlan(facets).fits }
      : null,
  };
}

const LABEL = { fictional: 'Real run — fictional scenario', real: 'Real run — real product' };

// Resume or open. DISK IS AUTHORITATIVE: an existing run.json is returned untouched, which is what
// makes a page reload and a server restart lose nothing (AC #5). `facets` is recorded normalised (five
// booleans or null) and `proposedDepth` beside the confirmed `depth` — MVP 5's agent-proposes /
// human-confirms, recorded rather than inferred.
//
// #286: `model` is a per-run override (Grill only — resolvePosture refuses it elsewhere by name) and
// run.json records the EFFECTIVE model; `document` (the text) or `documentPath` (a file the server
// reads, resolved against REPO_DIR — run 2's frozen fixture, so the stored bytes hash to the file's
// own md5) is an existing-prd session's one document, exactly one of the two, refused on a blank
// idea. Like `reads`, the path is the OPERATOR's trust boundary and is not sandboxed: the fence
// bounds the agent, never the operator. Every guard is before mkdirSync (case 16 pins that from
// source); the document line is appended AFTER writeRun, on the create path only, so a throw leaves
// no half-package and a resume never appends a second.
export function openSession({ slug, provenance, entryMode, depth, facets = null, frontEnd, posture, model = null, document: documentText = null, documentPath = null, reads = [] }) {
  assertRunSlug(slug);
  const root = resolveRunRoot({ provenance, slug });
  assertProvenanceRoot(provenance, root);
  // The read fence's input, refused by name before anything is written (#287). Stored as given
  // below; the transport rebuilds the allow-set from run.json on every turn.
  allowSetFor({ root, reads });
  if (!ENTRY_MODES.includes(entryMode)) bad(`entryMode "${entryMode}" is not one of ${ENTRY_MODES.join(' · ')}`);
  if (!FRONT_ENDS.includes(frontEnd)) bad(`frontEnd "${frontEnd}" is not one of ${FRONT_ENDS.join(' · ')} — it is how the Switch metric is measured, so it is recorded rather than inferred`);
  if (!Object.hasOwn(POSTURES, posture)) bad(`posture "${posture}" is not one of ${Object.keys(POSTURES).join(' · ')}`);
  if (!ENTRY_POSTURES[entryMode].includes(posture)) bad(`posture "${posture}" cannot open an ${entryMode} session — it admits ${ENTRY_POSTURES[entryMode].join(' · ')} (MVP 2: an existing PRD starts at Grill)`);
  // Its own refusals name the posture and the model (an override on a pinned posture, an unknown model).
  const resolved = resolvePosture({ posture, model });
  // The document: exactly one of the two on an existing PRD, neither on a blank idea.
  let text = null;
  if (entryMode === 'existing-prd') {
    if (documentText !== null && documentPath !== null) bad('an existing-prd session takes ONE document — either "document" (the text, stored verbatim) or "documentPath" (a file the server reads), not both');
    if (documentText === null && documentPath === null) bad('an existing-prd session needs its document — pass "document" (the text, stored verbatim) or "documentPath" (a repo-relative or absolute file the server reads); the audit judges that document against every question, so there is nothing to start without one (MVP 2)');
    if (documentText !== null) {
      if (typeof documentText !== 'string' || !documentText.trim()) bad('"document" must be a non-empty string — it is stored verbatim as the audit\'s one answer line');
      text = documentText;
    } else {
      if (typeof documentPath !== 'string' || !documentPath.trim()) bad(`"documentPath" must be a path string (got ${JSON.stringify(documentPath)})`);
      const file = path.resolve(REPO_DIR, documentPath);
      if (!existsSync(file) || !statSync(file).isFile()) bad(`documentPath "${documentPath}" (${file}) is not a file the server can read`);
      text = readFileSync(file, 'utf8');
      if (!text.trim()) bad(`documentPath "${documentPath}" is an empty file — there is nothing to audit`);
    }
  } else if (documentText !== null || documentPath !== null) {
    bad(`a ${entryMode} session takes no document — "document" and "documentPath" belong to an existing-prd session (got ${documentText !== null ? '"document"' : '"documentPath"'})`);
  }
  const declared = declareFacets(facets);   // the bank's own throw names an unknown or non-boolean facet
  // The bank's own throw names an unknown depth — and a vector that overflows full discovery's budget,
  // naming what fits and what does not (D1a). Nothing here trims a vector to fit: the session module
  // resolves nothing on the person's behalf; #288's control is where the person does.
  selectDepth(depth, declared);

  mkdirSync(root, { recursive: true });
  const existing = readRun(root);
  if (existing) return sessionView(root);

  writeRun(root, {
    slug, provenance, label: LABEL[provenance], entryMode, depth, proposedDepth: DEPTH_PROPOSAL[entryMode], facets: declared, reads,
    frontEnd, model: resolved.model, posture, sessionId: null,
    startedAt: now(), endedAt: null, root: headRoot(provenance, root), turnStats: [],
  });
  // Both files exist from the start, so a reader never has to distinguish "absent" from "empty".
  for (const f of ['answers.jsonl', 'transcript.jsonl']) {
    const file = path.join(root, f);
    if (!existsSync(file)) writeFileSync(file, '');
  }
  // The audited document, ONCE, after the head exists (#286 D1). The create path only — a resume
  // returned above — and appendDocument's own one-per-run refusal is the belt.
  if (entryMode === 'existing-prd') appendDocument(root, text);
  return sessionView(root);
}

// The ticked ids of a normalised vector, as prose — so the 409 names what is on disk rather than
// printing an object. The declared all-false vector (the consumer preset) is DISTINGUISHABLE from no
// vector by D1b, and the message says which, because the two open different sessions.
const facetsPhrase = (v) => {
  if (v === null || v === undefined) return 'no facet vector';
  const on = FACETS.map((f) => f.id).filter((id) => v[id] === true);
  return on.length ? `the vector ${on.join(' + ')}` : 'a declared vector with nothing ticked';
};

// PR #365 review F6, made reachable by #288's facet control. DISK IS AUTHORITATIVE and stays so — this
// does not change what a resume returns, it refuses to return it SILENTLY. Opening an existing slug at
// another depth or with another vector answered the disk state with no signal, so a scope-check POST
// over a full-discovery run read as a session somebody else had started.
//
// Compares NORMALISED forms, so {} / null / undefined all read as "no vector" and a five-key preset
// does not false-positive against the same vector spelled with fewer keys. JSON.stringify is safe here
// ONLY because declareFacets returns the five keys in FACETS order on both sides and head.facets was
// written by declareFacets — never compare raw POST bodies, and never compare key counts (a duplicate
// spelling passes that). Returns null when the POST agrees with the record — always the case on a
// CREATE, where the head was written FROM the posted values — else the message the route sends as 409.
//
// The route calls it on openSession's RETURN, so every one of openSession's guards has already refused
// junk by name. Called directly with a junk vector it throws the bank's own error, which is the honest
// answer and what group 30 drives. Total over a junk head: a route that grew a different caller must
// not take the drawer down. `posture`, `model` and `entryMode` are deliberately NOT compared — the
// owner's 2026-09-03 comment names the depth and the vector, and widening a refusal is theirs to call.
export function resumeMismatch(head, posted) {
  if (!head || typeof head !== 'object' || Array.isArray(head)) return null;
  const wantDepth = posted?.depth ?? null;
  const wantFacets = declareFacets(posted?.facets ?? null);
  const hasDepth = head.depth ?? null;
  const hasFacets = head.facets ?? null;
  if (hasDepth === wantDepth && JSON.stringify(hasFacets) === JSON.stringify(wantFacets)) return null;
  return `run "${head.slug}" is already on disk at depth "${hasDepth}" with ${facetsPhrase(hasFacets)}; this request asked for depth "${wantDepth}" with ${facetsPhrase(wantFacets)}. A resume returns the RECORDED session — disk is authoritative and #284's design keeps it that way — so nothing was changed and nothing was written. Open it by posting its own depth and vector, or start a new slug.`;
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

// DERIVED from the record, never stored (invariant 4) — from the LAST closer, by deriveCursor above,
// which is also where the one re-ask lives. A turn that did NOT close — the agent yielded without
// filing — leaves the cursor where it is, so the next submit re-uses the same question on the SAME
// turn id. R2 permits that, because the turn was never closed; do not invent a new turn id for it.
export function sessionView(root) {
  const head = readRun(root);
  if (!head) bad(`no run.json under "${root}" — open the session first`);
  const answers = readAnswers(root);
  const transcript = readTranscript(root);
  const facets = head.facets ?? null;   // packages before #285 carry no field and read as the unfaceted list
  const entryMode = head.entryMode ?? 'blank-idea';   // every committed package carries one; the default is belt
  const questions = selectDepth(head.depth, facets);
  // The audited document as the drawer and run 2's freeze check read it (#286): its ref, its length
  // and the md5 of its stored bytes — never the text, which the recorded view renders by pointer.
  // Null on a blank-idea package. This view consults no posture table: disk is authoritative, and a
  // package is never made unreadable by a table edit.
  const doc = documentOf(answers);
  return {
    head,
    answers,
    transcript,
    cursor: deriveCursor({ depth: head.depth, questions, transcript, entryMode }),
    escalation: escalationFor({ depth: head.depth, transcript }),
    metrics: runMetrics({ depth: head.depth, facets, questions, transcript, entryMode }),
    document: doc ? { ref: doc.ref, chars: doc.text.length, md5: createHash('md5').update(doc.text).digest('hex') } : null,
    // AC #4 (#288) — what the package HOLDS, folded from the op ledger and nothing else. ledgerView is
    // discovery/ops.mjs's exported pure read, so the drawer holds no shape opinion and the gate reaches
    // the fold with no browser. The transcript's op lines carry the applier's record verbatim (opLine),
    // so this is the same input prd-projection.mjs's readPackage builds — one package, two readers, and
    // group 29 compares them on one committed fixture rather than trusting they agree.
    //
    // FILTERED here, where readPackage REFUSES a line whose type is outside the three. The two differ ON
    // PURPOSE and neither should be "fixed" to match the other: readPackage folds a finished package and
    // a silently dropped record would be a lie in prd.md, while this is a live view over a file being
    // appended to and a throw would take the drawer down mid-session.
    ledger: ledgerView(transcript.filter((l) => l?.type === 'op').map(({ type, ts, ...rec }) => rec)),
  };
}

// --- the config payload ---------------------------------------------------------------------------

// The rubric NEVER reaches the browser (plan M6). weakAnswer is what the agent judges the answer
// against; showing it beside the question would tell the person the answer. The plan kept it on the
// wire and forbade rendering it in a comment — but a comment is deletable and a wire is not, so it is
// stripped here and the posture reads it server-side through questionById. `note` and `provenanceNote`
// go with it: neither is the person's to read mid-question.
const forTheBrowser = (q) => ({ id: q.id, stage: q.stage, text: q.text, attribution: q.attribution, label: q.label });

// Every vector's plan, PRECOMPUTED — the 32 declared vectors keyed by the five booleans in FACETS
// order as a bit string ("00000" … "11111"), plus "" for NO vector. The drawer's overflow message is a
// LOOKUP: composing it in the browser would be a second copy of D1a's greedy walk, and facetPlan's own
// comment warns that `fits` is not necessarily a prefix of `fired` — exactly the subtlety a second
// implementation gets wrong. facetPlan is pure and takes no depth, so the table is static and is folded
// once at module scope rather than per request. 33 rows is ~4 KB on a 127.0.0.1 route; do not paginate it.
//
// Exported so the gate can drive BOTH sides of the key and the drawer needs no import: the browser
// hand-writes the same one-line join over config.facets, which is the ONE derived line in the drawer,
// and group 30 case 41 source-pins that it maps the config rather than a literal id list.
export const facetKey = (v) => (v === null || v === undefined ? '' : FACETS.map((f) => (v[f.id] === true ? '1' : '0')).join(''));

const FACET_PLANS = Object.freeze(Object.fromEntries([
  ['', facetPlan(null)],
  ...Array.from({ length: 2 ** FACETS.length }, (_, n) => {
    const v = Object.fromEntries(FACETS.map((f, i) => [f.id, Boolean((n >> i) & 1)]));
    return [facetKey(v), facetPlan(v)];
  }),
]));

export function discoveryConfig() {
  return {
    questions: QUESTIONS.map(forTheBrowser),
    depths: Object.entries(DEPTHS).map(([id, d]) => ({
      id, label: d.label, when: d.when,
      // The UNFACETED length, for every depth. Where `composes` is true a declared vector moves it
      // (D1b), and the count cannot know the vector before one exists — so the route says so rather
      // than reporting a number the confirmed vector will change.
      count: d.ids.length, composes: COMPOSES.includes(id),
    })),
    facets: FACETS,
    presets: PRESETS,
    depthProposals: DEPTH_PROPOSAL,
    provenances: PROVENANCES,
    entryModes: ENTRY_MODES,
    frontEnds: FRONT_ENDS,
    // id, label, model and whether a run may override the model (#286) — never the prompt body.
    postures: Object.values(POSTURES).map((p) => ({ id: p.id, label: p.label, model: p.model, modelSettable: MODEL_SETTABLE.includes(p.id) })),
    // What a settable posture's model may be, and which postures each entry mode admits (#286) — the
    // drawer builds its selects from these and holds no second copy.
    models: MODELS,
    entryPostures: ENTRY_POSTURES,
    // MVP 1's three buttons in the order they are pressed, and the variant a step offers beyond its
    // default (#288). The drawer renders one button per step the entry mode admits and holds no order,
    // no label and no copy of its own.
    postureFlow: POSTURE_FLOW,
    postureVariantLabels: POSTURE_VARIANT_LABEL,
    // Each facet's module, so the overflow message NAMES what does not fit rather than printing an id.
    // Ids and budgets only — no question objects, so the rubric forTheBrowser strips cannot ride in here.
    modules: Object.fromEntries(FACETS.map((f) => [f.id, { label: MODULES[f.id].label, budget: MODULES[f.id].budget }])),
    facetPlans: FACET_PLANS,
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
//
// An existing-prd AUDIT turn (#286) skips the APPEND: the answer is the document stored at openSession,
// resolved off the view, and a submitted text is refused by name — nothing is appended, so
// answers.jsonl holds exactly one line for the whole audit. The posture is resolved with the run's
// recorded model, so a Grill run on Opus stamps Opus's fingerprint; a pre-#286 package's model equals
// its posture's, so its posture comes back by identity.
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
    const turn = cursor.turn;
    const audit = head.entryMode === 'existing-prd';
    let answer;
    if (audit) {
      if (typeof text === 'string' && text.trim()) bad('an audit turn takes no answer — the document is the answer, stored once at session start, and this turn judges it against the question on the table');
      answer = auditAnswerFor(view);
    } else {
      if (typeof text !== 'string' || !text.trim()) bad('an answer is required');
      answer = appendAnswer(root, { turn, questionId, kind, text });
    }

    // The SDK enters HERE and nowhere earlier — after every guard above has passed. See invariant 1.
    const { runDiscoveryTurn } = await import('./discovery-transport.mjs');
    const answers = readAnswers(root);
    const { sessionId, stats } = await runDiscoveryTurn({
      root,
      head,
      question: questionById(questionId),
      answer,
      turn,
      posture: resolvePosture({ posture: head.posture, model: head.model }),
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
