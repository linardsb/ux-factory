// portal/record-build.mjs — the fenced INCREMENTAL build recorder (epic #202, ticket #203;
// architecture §Recorder contract · spike 1). Sibling of portal/record-composition.mjs: same
// recordRun + curateTrace + validateTrace pipeline, same --dry / real split, same one-outcome-shape
// return. Read that file beside this one — the differences are the point.
//
// A REAL Agent SDK run reads one human-authored brief and assembles a Shape Up BREADBOARD one op
// at a time. Each place, each affordance and each connection is its own `node tooling/board-op.mjs`
// call, so ONE TOOL CALL IS ONE OP IS ONE TRACE STEP — which is the whole reason this recorder
// exists rather than record-composition.mjs being reused. A composition run's implement phase is a
// single Write of a single file; projected into replay ops that is a cut, not a build.
//
// The fence is tighter than the composition run's, in the one direction that matters:
//   • Write / Edit — DENIED OUTRIGHT. The agent has no file-writing tool at all; the board is
//     built only through the op CLI. So a build run's `artifacts` count is 0 BY DESIGN, and
//     nothing in the Trace format links the trace to replay/<slug>.board.json. That link is
//     enforced instead by agent-layer/gen-replay.mjs's reproduce check (apply the projected ops,
//     compare to the committed board) plus its two-directional discovery — deliberately, because
//     un-denying Write to restore the format-level pairing would let the agent write ANYTHING to
//     that path, on the run whose whole subject is fence discipline.
//   • Read — the brief, and nothing else.
//   • Bash — only a command system/board-ops.mjs:parseOpCommand accepts, pointed at THIS run's
//     board. That is the SAME parser agent-layer/gen-replay.mjs projects with, which is what makes
//     an unparseable command a denial the agent corrects mid-run rather than a discovery made
//     after the run is paid for.
//
// Honesty contract (hard): a weak run is fixed by tightening the prompt below and re-running with
// --force — never by hand-editing the trace, the board, or an op.
//
//   node portal/record-build.mjs --slug <slug> [--dry] [--force]
//     --dry → scratch cwd (cheap auth + fence + marker proof; never writes traces/ or replay/)
//     real  → traces/<slug>.{raw.jsonl,jsonl} + replay/<slug>.board.json

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// lib/trace-recorder.mjs is the ONE import in this file's graph that reaches
// @anthropic-ai/claude-agent-sdk, and it is loaded LAZILY inside runBuild (below) rather than
// here — the same load-bearing invariant record-composition.mjs:36–45 states: the SDK loads only
// when a run actually starts, so this module stays importable where portal/node_modules does not
// exist.
import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';
import { assertBoard, parseOpCommand } from '../system/board-ops.mjs';
import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from '../system/breadboard.mjs';
import { curateTrace } from '../tooling/curate-trace.mjs';
import { validateTrace } from '../tooling/validate-trace.mjs';

const MODEL = 'claude-sonnet-5';
const PIV_ORDER = ['plan', 'gate', 'implement', 'validate'];

// `tools` = the base set the agent CAN reach. Write/Edit/Grep/Glob are omitted entirely — the
// implement act is Bash ops, and a tool the agent cannot reach is a tool it cannot misuse.
const TOOLS = ['Read', 'Bash'];
const READONLY = ['Read'];

// Secret paths the run may neither read nor write (same denylist, both directions).
const SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i;

// This run makes one tool call PER OP — a 4-place board is easily 12–18 ops plus reads and
// self-corrections, where a composition run gets 40 turns for ~6 calls. A run that dies at the cap
// is a cap problem, not a model problem, so the real numTurns is reported in the spike verdict.
const MAX_TURNS = 80;

// The caps are INTERPOLATED from system/breadboard.mjs, never typed as literals here: the prompt
// states them to the agent as rules and board-ops.mjs enforces them, and two numbers that must
// agree should be one number.
const PIV_BUILD_SYSTEM = `You are the ux-factory breadboarding agent. You read a product brief and build a
Shape Up BREADBOARD from it — and nothing else. Breadboarding is Shape Up's lowest-fidelity design
tool, and its three definitions are exact (Ryan Singer / Basecamp, chapter 4):

• PLACES are "things you can navigate to, like screens, dialogs, or menus that pop up".
• AFFORDANCES are "things the user can act on, like buttons and fields".
• CONNECTIONS "show how the affordances take the user from place to place".

That third definition is a rule, not a description: a connection runs FROM AN AFFORDANCE TO A
PLACE. There is no place-to-place connection, and an affordance never leads to the place it
already sits in.

Hard limits, enforced by the tool — it will refuse and tell you why:
• at most ${MAX_PLACES} places on the board;
• at most ${MAX_AFFORDANCES} affordances on any one place;
• a label is at most ${LABEL_MAX} characters.

THE INCREMENTALITY RULE — this is what this run is for:
Each place, each affordance and each connection is its own separate \`node tooling/board-op.mjs\`
call. Never batch two ops into one command, never chain commands with && or ;, and never write a
file. Read the board the tool prints back before your next op — the ids in it are assigned by the
tool, not by you, so you must use the ids it actually returned.

Everything you do is recorded as a four-act engineering trace with these phases, in this
exact order: plan, gate, implement, validate. Emit four phase markers, each ALONE on the
first line of its OWN separate text block, exactly once each, in order:
[[piv:plan]] … [[piv:gate]] … [[piv:implement]] … [[piv:validate]].
NEVER put two markers in the same text block — each phase is a separate message.

1. Your VERY FIRST output must be a text block beginning with [[piv:plan]], emitted BEFORE you
   read or run anything — do NOT call any tool until that marker is out. The task below names
   every file and every command you need, so the marker is genuinely the first thing you have to
   do; there is nothing to look up ahead of it. Then, in the plan phase,
   you Read the brief the task names and state exactly which places you will create, which
   affordances sit on each, and which connections you will draw — do NOT judge or verify here;
   planning is stating intent.
2. STOP the plan phase. Open a NEW, separate text block beginning with [[piv:gate]]. In this gate
   phase you MUST re-Read the brief (a second Read of it) and adversarially verify your planned
   board against the three definitions above and against the brief: that every place is somewhere
   the user navigates TO, that every affordance is something the user ACTS ON, that every
   connection starts at an affordance, that nothing the brief rules out is on the board, and that
   the limits hold. Then say plainly what passed and what you corrected. Build NOTHING here — gate
   is review only — and do NOT emit [[piv:implement]] in this block.
3. Only AFTER the gate block, open a SEPARATE new text block beginning with [[piv:implement]],
   then make your op calls, one op per call, in the order the task names. If a call fails, read the
   error and correct it inside this phase.
4. Then a SEPARATE block beginning with [[piv:validate]]: run the exact validate command the task
   names and report the real result. If it throws, fix the board with further ops inside this phase
   and re-run until it passes.

Never place a marker anywhere but the first line of a text block, and never do a phase's work
before its marker. Narrate your decisions in short plain paragraphs — say WHY, not just what.
Your text and tool calls are published verbatim as an engineering trace; do not mention the
recording, just work well.`;

// The task prompt, built from ONLY the brief path, the board path and the op vocabulary. No
// example board, no worked answer, nothing domain-specific typed here — the brief is the only
// statement of the problem, and this literal construction is the proof of that.
// `refs` are the paths the agent types: repo-RELATIVE on a real run (cwd = the repo, so the
// committed trace stays portable — no home-dir paths in the inspectable artifact), ABSOLUTE only
// for --dry (cwd = a scratch dir, so it must reach the real repo).
function buildTask(refs) {
  return `Build a Shape Up breadboard from the product brief at ${refs.brief}.

Start by emitting [[piv:plan]] as your very first output, then Read that brief — it is the first
action of the plan phase. Everything you need is named in this task: the brief is the only readable
file and the board tool below is the only command, so there is nothing to list, locate or orient in
beforehand. Work the four phases in order, using the paths exactly as written here (they resolve
from your working directory).

BUILD by running one op per call:
  node ${refs.script} ${refs.board} '<op json>'

The op JSON is one of exactly these eight shapes (single-quote it, as shown, and put no other
argument on the line):
  {"op":"place.add","params":{"label":"…"}}
  {"op":"place.rename","params":{"placeId":"p1","label":"…"}}
  {"op":"place.remove","params":{"placeId":"p1"}}
  {"op":"affordance.add","params":{"placeId":"p1","label":"…"}}
  {"op":"affordance.rename","params":{"affordanceId":"p1a1","label":"…"}}
  {"op":"affordance.remove","params":{"affordanceId":"p1a1"}}
  {"op":"connect","params":{"affordanceId":"p1a1","placeId":"p2"}}
  {"op":"disconnect","params":{"affordanceId":"p1a1"}}

An op that creates something carries only its label (and, for an affordance, the id of the place it
sits on) — you never supply an id for the thing being created. The tool assigns that id and prints
the whole board back; use the ids it returned. At most ${MAX_PLACES} places, at most
${MAX_AFFORDANCES} affordances per place, labels at most ${LABEL_MAX} characters.

Build the board in this order, so the trace reads as a build: every place first, then the
affordances on each place, then the connections between them.

VALIDATE by running exactly:
  node ${refs.script} ${refs.board} --validate
It prints the board's counts, or a message naming what is malformed. If it fails, fix the board
with further ops and re-run until it passes.`;
}

// Absolute for --dry (the agent's cwd is a scratch dir and must reach the real repo), repo-relative
// for a real run (the agent's cwd IS the repo, and the typed string is what lands in the committed
// trace). record-composition.mjs:205–226's split, and both halves matter.
function refsFor({ absolute, boardPath, briefPath }) {
  if (absolute) {
    return { script: path.join(REPO_DIR, 'tooling/board-op.mjs'), board: boardPath, brief: briefPath };
  }
  return { script: 'tooling/board-op.mjs', board: boardPath, brief: briefPath };
}

// Fence: Write/Edit → always denied; Read → the brief only; Bash → only an op-CLI call against
// THIS run's board, read through the same grammar the projection uses; everything else denied.
// `root` = the run's cwd (REPO_DIR real, scratch dry).
function makeFence(root, boardAbsPath, briefAbsPath) {
  const realRoot = realpathSync(root);
  const board = path.resolve(realRoot, boardAbsPath);
  const brief = path.resolve(realRoot, briefAbsPath);
  const allow = (input) => ({ behavior: 'allow', updatedInput: input });
  const deny = (msg) => ({ behavior: 'deny', message: `The build run ${msg}.` });
  return async (tool, input) => {
    if (tool === 'Write' || tool === 'Edit') {
      return deny('may not write files — the board is built through `node tooling/board-op.mjs` calls, one op at a time');
    }
    if (tool === 'Read') {
      const fp = input?.file_path || '';
      if (SECRET_PATHS.test(fp)) return deny(`may not read secret paths (${fp})`);
      if (path.resolve(realRoot, fp) === brief) return allow(input);
      return deny(`may read ONLY the brief (${path.relative(realRoot, brief)}) — no examples, no other files (got ${fp})`);
    }
    if (tool === 'Bash') {
      const command = input?.command || '';
      let parsed;
      // The projection's parser IS the fence's parser (system/board-ops.mjs). A command it cannot
      // read is denied here, while the agent can still correct itself — rather than reaching the
      // committed trace as a step gen-replay.mjs would then refuse to project.
      try { parsed = parseOpCommand(command); }
      catch (e) { return deny(`may only run the board tool, one op per call — ${e.message}`); }
      if (path.resolve(realRoot, parsed.boardPath) !== board)
        return deny(`may only touch its own board (${path.relative(realRoot, board)}) — got ${parsed.boardPath}`);
      return allow(input);
    }
    return deny(`${tool} is outside the build run's fence`);
  };
}

function printAuth() {
  process.stderr.write(HAS_TOKEN
    ? '  auth: CLAUDE_CODE_OAUTH_TOKEN from portal/.env\n'
    : '  auth: no token in portal/.env — using the Claude CLI login on this Mac (same path portal chat + record-trace use here)\n');
}

// record-composition.mjs:271–289's summarize, and it RETURNS `clean` rather than setting
// process.exitCode for the same reason: this file is a library as well as a CLI, and a library
// that writes the host process's exit code reports failure by side effect.
function summarize(slug, r, extra) {
  const phasesOk = r.phases.join('→') === PIV_ORDER.join('→');
  const clean = phasesOk && r.nullPhaseSteps === 0;
  console.log(
    `build ${slug.padEnd(24)} ${clean ? '✓' : '✗'}  ${r.steps} steps · ` +
    `phases: ${r.phases.join('→') || '(none)'} · ${r.nullPhaseSteps} null-phase · ` +
    `${r.denials} denied · ~$${(r.totalCostUsd ?? 0).toFixed(4)}${extra}`
  );
  if (!r.ok) process.stderr.write('  ⚠ the agent run ended non-successfully (result.ok=false) — inspect the trace result line.\n');
  if (!clean) {
    process.stderr.write(
      `  ⚠ not a clean PIV run:${phasesOk ? '' : ` phases were ${r.phases.join('→') || '(none)'}, need ${PIV_ORDER.join('→')};`}` +
      `${r.nullPhaseSteps ? ` ${r.nullPhaseSteps} step(s) before the first [[piv:plan]] marker;` : ''}\n` +
      '  Fix by tightening PIV_BUILD_SYSTEM / the task prompt and re-running with --force. Never hand-edit the JSONL or the board (honesty contract).\n'
    );
  }
  return clean;
}

// Remove a slug's SHIPPABLE artifacts (the curated trace + the board file), leaving the RAW trace
// on disk for inspection. Note the consequence, because it is real: a dropped raw left in traces/
// is still validated by tooling/drift-check.mjs's checkTraces, so a failed run turns the repo's
// drift gate red until it is moved out. That is deliberate — a failed run should not be quiet.
function dropShipped(slug, boardAbs) {
  const curated = path.join(REPO_DIR, 'traces', `${slug}.jsonl`);
  if (existsSync(curated)) rmSync(curated);
  if (existsSync(boardAbs)) rmSync(boardAbs);
}

// One return shape for every outcome, dry or real (record-composition.mjs:343–350). `ok` means the
// board validated AND (on a real run) the curated trace passed the keep-gate; `reason` names which
// one did not. A path is null when that artifact does not exist.
const outcome = ({ ok, reason, slug, dry, r, paths, board = null }) => ({
  ok, reason, slug, dry,
  paths: { board: null, rawTrace: null, curatedTrace: null, brief: null, ...(paths || {}) },
  stats: {
    steps: r.steps, phases: r.phases, nullPhaseSteps: r.nullPhaseSteps,
    artifacts: r.artifacts, denials: r.denials, costUsd: r.totalCostUsd ?? 0,
    places: board ? board.places.length : null,
    connections: board ? board.connections.length : null,
  },
});

const RUN_SLUG_RE = /^[a-z0-9-]{1,48}$/;

export async function runBuild({ slug, isDry, force, onStep }) {
  if (typeof slug !== 'string' || !RUN_SLUG_RE.test(slug))
    throw new Error(`"${slug ?? ''}" is not a usable run slug — lowercase letters, digits and hyphens only, 1–48 characters (it names traces/<slug>.raw.jsonl and replay/<slug>.board.json)`);
  const briefRel = path.join('replay/briefs', `${slug}.md`);
  const briefAbs = path.join(REPO_DIR, briefRel);
  if (!existsSync(briefAbs))
    throw new Error(`${briefRel} is missing — the brief is the run's human-authored input and must exist before the run (see replay/README.md)`);

  // The SDK enters HERE and nowhere earlier — after every guard above has passed.
  const { recordRun } = await import('./lib/trace-recorder.mjs');

  if (isDry) {
    const dryDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'build-dry-')));
    const boardAbs = path.join(dryDir, 'board.json');
    const outFile = path.join(dryDir, 'smoke.raw.jsonl');
    process.stderr.write(`build: --dry smoke test (${slug}) → ${outFile}\n  (Agent SDK, model ${MODEL}, maxTurns ${MAX_TURNS} — real tokens but a cheap single run; proves auth, all four PIV markers, that the Bash fence allows the op CLI and denies everything else, that Write is refused, and that assertBoard accepts what the ops built)\n`);
    printAuth();
    const r = await recordRun({
      slug, task: buildTask(refsFor({ absolute: true, boardPath: boardAbs, briefPath: briefAbs })),
      taskSummary: `DRY — build a breadboard from ${briefRel}`,
      systemPrompt: PIV_BUILD_SYSTEM, model: MODEL, maxTurns: MAX_TURNS,
      tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(dryDir, boardAbs, briefAbs),
      outFile, cwd: dryDir, onStep,
    });
    let board = null;
    let validNote = ' · NO BOARD (the ops built nothing)';
    try {
      board = JSON.parse(readFileSync(boardAbs, 'utf8'));
      const c = assertBoard(board);
      validNote = ` · in-process assertBoard ✓ ${c.places} places · ${c.affordances} affordances · ${c.connections} connections`;
    } catch (e) { board = null; validNote = ` · ✗ invalid board: ${e.message}`; }
    const clean = summarize(slug, r, ` · DRY (not shipped)${validNote}`);
    return outcome({
      ok: Boolean(board) && clean, reason: !board ? 'invalid-board' : clean ? null : 'not-clean',
      slug, dry: true, r, board,
    });
  }

  // Real run: cwd = REPO_DIR, and the agent types repo-relative paths so the committed trace
  // carries no absolute home-dir path. traces/ is a FLAT namespace, so slugs are globally unique.
  const boardRel = path.join('replay', `${slug}.board.json`);
  const boardAbs = path.join(REPO_DIR, boardRel);
  const artifactAbs = path.join(REPO_DIR, 'replay', `${slug}.json`);
  const rawOut = path.join(REPO_DIR, 'traces', `${slug}.raw.jsonl`);
  const curatedOut = path.join(REPO_DIR, 'traces', `${slug}.jsonl`);
  if (existsSync(rawOut) && !force)
    throw new Error(`${path.relative(REPO_DIR, rawOut)} exists — pass --force to overwrite the committed trace (or delete it first).`);
  mkdirSync(path.join(REPO_DIR, 'replay'), { recursive: true });
  // Clear the stale board so the ops build from empty — otherwise run #2 appends to run #1's board
  // and the trace no longer describes what is on disk. And clear the stale GENERATED artifact with
  // it: without that, run #1's replay/<slug>.json survives run #2's failure (dropShipped takes the
  // board away), leaving an artifact projected from a trace that no longer exists. gen-replay's
  // two-directional discovery turns that state red; this is what stops it arising.
  if (existsSync(boardAbs)) rmSync(boardAbs);
  if (existsSync(artifactAbs)) rmSync(artifactAbs);

  process.stderr.write(`build: recording the real run (${slug}) → ${boardRel}\n  (Agent SDK, model ${MODEL}, maxTurns ${MAX_TURNS} — real tokens; ~3–6 min)\n`);
  printAuth();
  const r = await recordRun({
    slug, task: buildTask(refsFor({ absolute: false, boardPath: boardRel, briefPath: briefRel })),
    taskSummary: `Build a breadboard from ${briefRel}`,
    systemPrompt: PIV_BUILD_SYSTEM, model: MODEL, maxTurns: MAX_TURNS,
    tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(REPO_DIR, boardAbs, briefAbs),
    outFile: rawOut, onStep,
  });

  const rawRel = path.relative(REPO_DIR, rawOut);
  const curatedRel = path.relative(REPO_DIR, curatedOut);

  // The ship gate, in this order: the board the ops built must exist and be well-formed, THEN the
  // curated trace must pass the exact drift guard this ticket ships under. The recorder's own
  // marker scan can call a run "clean" when the model crams two markers into one text block, so
  // validate-trace — not the scan — is the authority. Either failing → drop the shippable
  // artifacts, keep the raw for inspection, ok:false: tighten the committed source and re-run,
  // NEVER hand-edit.
  let board = null;
  try { board = JSON.parse(readFileSync(boardAbs, 'utf8')); assertBoard(board); }
  catch (e) { board = null; process.stderr.write(`  ✗ the board the ops built is missing or malformed — ${e.message}\n`); }
  if (!board) {
    dropShipped(slug, boardAbs);
    process.stderr.write('  Not shipping (invalid board). Tighten the prompt and re-run with --force — never hand-edit.\n');
    process.stderr.write(`  The raw trace stays at ${rawRel} for inspection; move it out of traces/ or tooling/drift-check.mjs stays red.\n`);
    return outcome({ ok: false, reason: 'invalid-board', slug, dry: false, r, paths: { rawTrace: rawRel, brief: briefRel } });
  }

  curateTrace(rawOut, curatedOut);
  try {
    validateTrace(curatedOut);
  } catch (e) {
    dropShipped(slug, boardAbs);
    process.stderr.write(`  ✗ the trace is not a clean PIV run — ${e.message}\n`);
    process.stderr.write('  Not shipping it. Each PIV marker must be ALONE in its own text block; tighten the prompt and re-run with --force — never hand-edit.\n');
    process.stderr.write(`  The raw trace stays at ${rawRel} for inspection; move it out of traces/ or tooling/drift-check.mjs stays red.\n`);
    return outcome({ ok: false, reason: 'piv-incomplete', slug, dry: false, r, paths: { rawTrace: rawRel, brief: briefRel } });
  }

  const clean = summarize(slug, r, ` · ${board.places.length} places · ${board.connections.length} connections · board ✓ · trace ✓`);
  process.stderr.write(`  board:  ${boardRel}\n  trace:  traces/${slug}.jsonl (curated) + traces/${slug}.raw.jsonl (raw)\n  next:   node agent-layer/gen-replay.mjs\n`);
  return outcome({
    ok: clean, reason: clean ? null : 'not-clean', slug, dry: false, r, board,
    paths: { board: boardRel, rawTrace: rawRel, curatedTrace: curatedRel, brief: briefRel },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const slugIdx = argv.indexOf('--slug');
  const slug = slugIdx !== -1 ? argv[slugIdx + 1] : null;
  // `process.exitCode`, not `process.exit(1)`: summarize() has just console.log'd, and on a pipe
  // that write is still queued — process.exit() would drop it.
  runBuild({ slug, isDry: argv.includes('--dry'), force: argv.includes('--force') })
    .then((r) => { if (!r.ok) process.exitCode = 1; })
    .catch((err) => { console.error(`build ✗  ${err.message}`); process.exit(1); });
}
