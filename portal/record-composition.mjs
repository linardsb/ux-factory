// portal/record-composition.mjs — build-time agentic composition runner (epic #1, ticket #13; folds spike 6). Reuses the hardened recorder (portal/lib/{trace-recorder,redact}.mjs); never hand-write a composition, never hand-feed an example.
//
// A REAL Agent SDK run composes a dashboard view for one Fieldwork dispatch question,
// as a {name, props, children} array over the shared component vocabulary — the SAME
// contract system/agentic-renderer.mjs validates and renders. Each run is a four-act PIV
// trace (plan → gate-against-the-slot-bounds → implement-by-writing-the-file → validate-
// via-validateComposition), reusing the whole #5/#25 record→curate→validate pipeline.
//
// Honesty contract (hard, load-bearing):
//   • The prompt is built ONLY from the vocabulary + the Fieldwork fixtures + the question
//     + the slot bounds. There is NO seed/example composition and NO external dashboard
//     reference anywhere below — a hand-fed example would make the output half-hand-written
//     and silently break the study's claim. This construction is the inspectable proof
//     (the trace meta does NOT capture the full system prompt — this source does).
//   • The Read fence allows ONLY the vocabulary + fixtures (deny everything else, incl.
//     secrets), so the agent cannot even see an example on disk.
//   • A weak/invalid run is fixed by tightening THIS source (the prompt) or the vocabulary's
//     composition rules and RE-RUNNING — never by hand-editing a composition.
//
// Two modes:  node portal/record-composition.mjs "<question>" <slot> [--slug <slug>] [--dry] [--force]
//   --dry → scratch dir (cheap auth + mechanism proof; never writes traces/ or proto/compositions/)
//   real  → traces/<slug>.{raw.jsonl,jsonl} + proto/compositions/<slug>.json + index.json upsert
// slot ∈ {summary-strip, insight-panel}. Run from anywhere — paths resolve from env.mjs.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordRun } from './lib/trace-recorder.mjs';
import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';
import { validateComposition } from '../system/agentic-renderer.mjs';
import { curateTrace } from '../tooling/curate-trace.mjs';

const MODEL = 'claude-sonnet-5';
const PIV_ORDER = ['plan', 'gate', 'implement', 'validate'];

// `tools` = the base set the agent CAN reach; `allowedTools` = auto-approved (skips
// canUseTool, but the PreToolUse fence hook still fires). Grep/Glob/Edit are omitted
// entirely so the agent cannot scan the repo for an example — the tightest reading of HC5.
const TOOLS = ['Read', 'Write', 'Bash'];
const READONLY = ['Read'];

// Secret paths the run may neither read nor write (same denylist, both directions).
const SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i;

// The ONLY inputs a composition run may read — the vocabulary + the Fieldwork data. Anchored
// to REPO_DIR (absolute) so a --dry run (cwd = scratch) still reads the REAL data, and no
// example/reference file is ever readable. These same absolute paths are handed to the agent.
const VOCAB_PATH = path.join(REPO_DIR, 'handoff/verdant/vocabulary.json');
const FIXTURE_PATHS = {
  jobs: path.join(REPO_DIR, 'scenarios/fieldwork/fixtures/jobs.json'),
  technicians: path.join(REPO_DIR, 'scenarios/fieldwork/fixtures/technicians.json'),
  schedule: path.join(REPO_DIR, 'scenarios/fieldwork/fixtures/schedule.json'),
  copy: path.join(REPO_DIR, 'scenarios/fieldwork/copy.json'),
};
const READ_OK = new Set([VOCAB_PATH, ...Object.values(FIXTURE_PATHS)]);

// Slot bounds — stated to the agent verbatim; the gate phase reviews the composition against them.
const SLOTS = {
  'summary-strip': 'a HORIZONTAL KPI row: a small array (3–5) of metric-tile nodes, no children, that fit one band above the board — each tile a headline number answering the question at a glance. Use tone sparingly for the one or two figures that carry urgency.',
  'insight-panel': 'a VERTICAL column of metric-tile nodes (typically 3–6, several toned) answering one analytical question, fitting the narrow side region beside the board — a focused read, not a whole dashboard.',
};

const PIV_COMPOSE_SYSTEM = `You are the ux-factory UI-composition agent. You answer a question by composing a
DASHBOARD VIEW as a JSON array of {name, props, children?} nodes over a fixed component
vocabulary — and NOTHING else. Hard rules:
• You may use ONLY the components in the provided vocabulary, ONLY their declared props,
  and you MUST respect every enum exactly. A component or prop not in the vocabulary, or an
  enum value outside its list, will be REFUSED — do not attempt it.
• You NEVER emit raw HTML or CSS. Your entire output artifact is the {name, props, children}
  JSON array; the platform renders it into real components.
• Every value you put in a tile MUST be computed from the provided Fieldwork fixtures — never
  an invented or remembered number. Compute it yourself from the raw records.
• A label must read the state without its tone (e.g. "Overdue" + "4", not a bare "4"); tone is
  redundant emphasis, never the sole signal.

Everything you do is recorded as a four-act engineering trace with these phases, in this
exact order: plan, gate, implement, validate. Emit four phase markers, each ALONE on the
first line of its own text block, exactly once each, in order:
[[piv:plan]] … [[piv:gate]] … [[piv:implement]] … [[piv:validate]].

1. Your VERY FIRST output must be a text block beginning with [[piv:plan]]. In the plan phase
   you Read the vocabulary and the fixture files the task names, then state exactly which
   components you will use and which value you will compute for each — do NOT judge or verify
   here; planning is stating intent.
2. STOP, open a NEW block beginning with [[piv:gate]], and review there: adversarially check
   your planned composition against the vocabulary's prop schemas + enums, the named slot's
   bounds, and the honesty rule (labels self-describing, tone redundant). Say plainly what
   passes and what you corrected. Write NO file in this phase; gate is review only.
3. Only after the gate block, emit a block beginning with [[piv:implement]] — its own block —
   and make your single Write call immediately after it, writing the composition JSON to the
   path the task names. NEVER Write under the plan, gate, or validate marker.
4. Then a block beginning with [[piv:validate]]: run the exact node command the task names to
   validate the file you wrote against the real vocabulary, and report the real result. If it
   throws, fix the composition and re-run inside this phase until it validates.

Never place a marker anywhere but the first line of a text block, and never do a phase's work
before its marker. Narrate your decisions in short plain paragraphs — say WHY, not just what.
Your text and tool calls are published verbatim as an engineering trace; do not mention the
recording, just work well.`;

// Build the task prompt from ONLY: the question, the slot + its bounds, and the fixed data
// paths. No example composition, no external reference — this literal construction is the proof.
function buildTask(question, slot, outPathForAgent) {
  return `Compose a dashboard view that answers this question about the Fieldwork dispatch board:

  "${question}"

It must fit the "${slot}" slot, whose bounds are: ${SLOTS[slot]}

Read these files (and ONLY these — nothing else is readable):
1. ${VOCAB_PATH}
   — the component vocabulary: every component you may use, its props, enums, and the
     top-level "composition" shape rules ({name, props, children?}). Compose ONLY from this.
2. ${FIXTURE_PATHS.jobs}         — the dispatch jobs (each has status, region, techId, slaDue, completedAt, …)
3. ${FIXTURE_PATHS.technicians}  — the technicians (region, skills, shift)
4. ${FIXTURE_PATHS.schedule}     — today's schedule slots per technician
5. ${FIXTURE_PATHS.copy}         — the scenario's human-authored display labels (statusLabels, regionLabels, slaWarningLabel, …); prefer these for tile labels

The board's fixed fictional "today" is 2026-07-14; treat a job as open when completedAt is null.
Compute every figure yourself from these raw records — do not assume any count.

IMPLEMENT by writing the composition — a JSON array of {name, props, children?} nodes — to:
  ${outPathForAgent}

VALIDATE by running exactly:
  node -e "import('${path.join(REPO_DIR, 'system/agentic-renderer.mjs')}').then(async m=>{const fs=await import('node:fs');const v=JSON.parse(fs.readFileSync('${VOCAB_PATH}','utf8'));const c=JSON.parse(fs.readFileSync('${outPathForAgent}','utf8'));m.validateComposition(v,c);console.log('composition valid');})"
If it prints a refusal (naming a path like composition[1].props.tone), fix the composition and re-run until it prints "composition valid".`;
}

// Fence: Write → only the one composition file; Read → only the vocabulary + fixtures;
// Bash → node … only; everything else denied. `root` = the run's cwd (REPO_DIR real, scratch dry).
function makeFence(root, outAbsPath) {
  const realRoot = realpathSync(root);
  const target = path.resolve(realRoot, outAbsPath);
  const allow = (input) => ({ behavior: 'allow', updatedInput: input });
  const deny = (msg) => ({ behavior: 'deny', message: `The composition run ${msg}.` });
  return async (tool, input) => {
    if (tool === 'Write' || tool === 'Edit') {
      const fp = input?.file_path || '';
      if (SECRET_PATHS.test(fp)) return deny(`may not touch secret paths (${fp})`);
      if (path.resolve(realRoot, fp) === target) return allow(input);
      return deny(`may only write the composition file (${path.relative(realRoot, target)})`);
    }
    if (tool === 'Read') {
      const fp = input?.file_path || '';
      if (SECRET_PATHS.test(fp)) return deny(`may not read secret paths (${fp})`);
      if (READ_OK.has(path.resolve(realRoot, fp))) return allow(input);
      return deny(`may read ONLY the vocabulary + the Fieldwork fixtures — no examples, no other files (got ${fp})`);
    }
    if (tool === 'Bash') {
      if (/^node /.test(input?.command || '')) return allow(input);
      return deny('may only run `node …` via Bash (to self-validate the composition)');
    }
    return deny(`${tool} is outside the composition run's fence`);
  };
}

function printAuth() {
  process.stderr.write(HAS_TOKEN
    ? '  auth: CLAUDE_CODE_OAUTH_TOKEN from portal/.env\n'
    : '  auth: no token in portal/.env — using the Claude CLI login on this Mac (same path portal chat + record-trace use here)\n');
}

// Same clean-PIV signal record-trace uses: a missing/misordered phase or a null-phase step
// is a bad run, visible before curation — the tighten-and-re-run trigger.
function summarize(slug, r, extra) {
  const phasesOk = r.phases.join('→') === PIV_ORDER.join('→');
  const clean = phasesOk && r.nullPhaseSteps === 0;
  console.log(
    `composition ${slug.padEnd(20)} ${clean ? '✓' : '✗'}  ${r.steps} steps · ` +
    `phases: ${r.phases.join('→') || '(none)'} · ${r.nullPhaseSteps} null-phase · ` +
    `${r.artifacts} artifact${r.artifacts === 1 ? '' : 's'} · ${r.denials} denied · ` +
    `~$${(r.totalCostUsd ?? 0).toFixed(4)}${extra}`
  );
  if (!r.ok) process.stderr.write('  ⚠ the agent run ended non-successfully (result.ok=false) — inspect the trace result line.\n');
  if (!clean) {
    process.stderr.write(
      `  ⚠ not a clean PIV run:${phasesOk ? '' : ` phases were ${r.phases.join('→') || '(none)'}, need ${PIV_ORDER.join('→')};`}` +
      `${r.nullPhaseSteps ? ` ${r.nullPhaseSteps} step(s) before the first [[piv:plan]] marker;` : ''}\n` +
      '  Fix by tightening PIV_COMPOSE_SYSTEM / the prompt and re-running with --force. Never hand-edit the JSONL or the composition (honesty contract).\n'
    );
    process.exitCode = 1;
  }
}

// In-process acceptance: refuse to KEEP an invalid composition (belt-and-suspenders over the
// agent's own validate phase). An invalid proposal is a re-run, never a hand-repair.
function assertValid(vocabPath, compPath) {
  const vocab = JSON.parse(readFileSync(vocabPath, 'utf8'));
  const composition = JSON.parse(readFileSync(compPath, 'utf8'));
  validateComposition(vocab, composition); // throws (path-naming) if invalid
  return composition;
}

// Replace-by-slug upsert into the committed manifest (deterministic: sorted by slug).
function upsertIndex(indexPath, entry) {
  let list = [];
  if (existsSync(indexPath)) {
    try { list = JSON.parse(readFileSync(indexPath, 'utf8')); } catch { list = []; }
    if (!Array.isArray(list)) list = [];
  }
  list = list.filter((e) => e.slug !== entry.slug);
  list.push(entry);
  list.sort((a, b) => (a.slug < b.slug ? -1 : 1));
  writeFileSync(indexPath, JSON.stringify(list, null, 2) + '\n');
  return list.length;
}

const slugify = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'composition';

async function main({ question, slot, slug, isDry, force }) {
  if (!question) throw new Error('a question is required: node portal/record-composition.mjs "<question>" <slot> [--slug <slug>] [--dry]');
  if (!SLOTS[slot]) throw new Error(`slot must be one of: ${Object.keys(SLOTS).join(' | ')} (got "${slot}")`);
  if (!existsSync(VOCAB_PATH)) throw new Error(`${path.relative(REPO_DIR, VOCAB_PATH)} is missing — run: node agent-layer/gen-vocabulary.mjs`);

  if (isDry) {
    const dryDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'composition-dry-')));
    mkdirSync(path.join(dryDir, 'proto/compositions'), { recursive: true });
    const outAbs = path.join(dryDir, 'proto/compositions', `${slug}.json`);
    const outFile = path.join(dryDir, 'smoke.raw.jsonl');
    process.stderr.write(`composition: --dry smoke test → ${outFile}\n  (Agent SDK, model ${MODEL}, maxTurns 40 — real tokens but a cheap single run; proves auth, all four PIV markers, Write→artifact pairing, the Read/Write fence denies, and in-process validateComposition accepts the written file)\n`);
    printAuth();
    const r = await recordRun({
      slug, task: buildTask(question, slot, outAbs), taskSummary: `DRY — compose "${slot}" for: ${question}`,
      systemPrompt: PIV_COMPOSE_SYSTEM, model: MODEL, maxTurns: 40,
      tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(dryDir, outAbs), outFile, cwd: dryDir,
    });
    let validNote = ' · NOT VALIDATED';
    try { assertValid(VOCAB_PATH, outAbs); validNote = ' · in-process validateComposition ✓'; }
    catch (e) { validNote = ` · ✗ invalid: ${e.message}`; process.exitCode = 1; }
    summarize(slug, r, ` · DRY (not shipped)${validNote}`);
    return;
  }

  // Real run: cwd = REPO_DIR, write the agent's relative path so the trace artifact is repo-relative.
  mkdirSync(path.join(REPO_DIR, 'proto/compositions'), { recursive: true });
  const outRel = path.join('proto/compositions', `${slug}.json`);
  const outAbs = path.join(REPO_DIR, outRel);
  const rawOut = path.join(REPO_DIR, 'traces', `${slug}.raw.jsonl`);
  const curatedOut = path.join(REPO_DIR, 'traces', `${slug}.jsonl`);
  if (existsSync(rawOut) && !force)
    throw new Error(`${path.relative(REPO_DIR, rawOut)} exists — pass --force to overwrite the committed trace (or delete it first).`);

  process.stderr.write(`composition: recording the real run → ${outRel}\n  (Agent SDK, model ${MODEL}, maxTurns 40 — real tokens; ~2–5 min)\n`);
  printAuth();
  const r = await recordRun({
    slug, task: buildTask(question, slot, outRel), taskSummary: `Compose "${slot}" for: ${question}`,
    systemPrompt: PIV_COMPOSE_SYSTEM, model: MODEL, maxTurns: 40,
    tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(REPO_DIR, outAbs), outFile: rawOut,
  });

  // Refuse to keep an invalid proposal (re-run, never edit). Leaves the raw trace on disk for
  // inspection, but does not curate/index it — a weak run should not look shipped.
  let composition;
  try { composition = assertValid(VOCAB_PATH, outAbs); }
  catch (e) {
    process.stderr.write(`  ✗ the written composition is INVALID — ${e.message}\n  Not curating/indexing it. Tighten the prompt or vocabulary rules and re-run with --force (never hand-edit).\n`);
    summarize(slug, r, ' · ✗ INVALID (not shipped)');
    process.exitCode = 1;
    return;
  }

  curateTrace(rawOut, curatedOut);
  const total = upsertIndex(path.join(REPO_DIR, 'proto/compositions/index.json'), {
    slug, question, slot,
    proposal: `/proto/compositions/${slug}.json`,
    trace: `/traces/${slug}.jsonl`,
  });
  summarize(slug, r, ` · ${composition.length ?? 1} node(s) · valid ✓ · manifest: ${total} entr${total === 1 ? 'y' : 'ies'}`);
  process.stderr.write(`  proposal: ${outRel}\n  trace:    traces/${slug}.jsonl (curated) + traces/${slug}.raw.jsonl (raw)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('--') && a !== '--slug'));
  const slugIdx = argv.indexOf('--slug');
  const explicitSlug = slugIdx !== -1 ? argv[slugIdx + 1] : null;
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(slugIdx !== -1 && i === slugIdx + 1));
  const question = positional[0];
  const slot = positional[1];
  const slug = explicitSlug || slugify(question || '');
  main({ question, slot, slug, isDry: flags.has('--dry'), force: flags.has('--force') })
    .catch((err) => { console.error(`composition ✗  ${err.message}`); process.exit(1); });
}
