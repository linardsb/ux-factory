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
//      the data rather than a line in a prompt.
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

const LABEL = { fictional: 'Real run — fictional scenario', real: 'Real run — real product' };

// Resume or open. DISK IS AUTHORITATIVE: an existing run.json is returned untouched, which is what
// makes a page reload and a server restart lose nothing (AC #5).
export function openSession({ slug, provenance, entryMode, depth, branch = null, frontEnd, posture, reads = [] }) {
  assertRunSlug(slug);
  const root = resolveRunRoot({ provenance, slug });
  assertProvenanceRoot(provenance, root);
  // The read fence's input, refused by name before anything is written (#287). Stored as given
  // below; the transport rebuilds the allow-set from run.json on every turn.
  allowSetFor({ root, reads });
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
    slug, provenance, label: LABEL[provenance], entryMode, depth, branch, reads,
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
