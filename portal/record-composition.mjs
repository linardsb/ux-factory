// portal/record-composition.mjs — build-time agentic composition runner (epic #1, ticket #13; folds spike 6; parameterized #88). Reuses the hardened recorder (portal/lib/{trace-recorder,redact}.mjs); never hand-write a composition, never hand-feed an example.
//
// A REAL Agent SDK run composes a dashboard view for ONE question about ONE scenario's data,
// as a {name, props, children} array over the shared component vocabulary — the SAME
// contract system/agentic-renderer.mjs validates and renders. Each run is a four-act PIV
// trace (plan → gate-against-the-slot-bounds → implement-by-writing-the-file → validate-
// via-validateComposition), reusing the whole #5/#25 record→curate→validate pipeline.
//
// The scenario is a first-class argument: everything domain-specific (which fixtures are
// readable, the fixed today, what a field/state means, the slot bounds, the questions) is
// externalized to scenarios/<scenario>/compose.json — the runner has NO baked-in scenario
// (open-Q #4, #88). compose.json's computeRules carries DEFINITIONS ONLY; it must never name
// which tiles/metrics answer a question — that selection stays the agent's job (the firewall).
//
// Honesty contract (hard, load-bearing):
//   • The prompt is built ONLY from the vocabulary + the SCENARIO'S declared fixtures + the
//     question + the slot bounds + the scenario's DEFINITIONS-ONLY computeRules. There is NO
//     seed/example composition and NO external dashboard reference anywhere below — a hand-fed
//     example would make the output half-hand-written and silently break the study's claim.
//     This construction is the inspectable proof (the trace meta does NOT capture the full
//     system prompt — this source does).
//   • The Read fence is REBUILT PER-SCENARIO from compose.json's declared fixtures (+ the
//     vocabulary + the scenario's copy.json) — never "read any file"; deny everything else,
//     incl. secrets, so the agent cannot even see an example on disk.
//   • A weak/invalid run is fixed by tightening THIS source (the prompt) or the scenario's
//     computeRules and RE-RUNNING — never by hand-editing a composition.
//
// Two modes:  node portal/record-composition.mjs <scenario> "<question>" <slot> [--slug <slug>] [--dry] [--force]
//   --dry → scratch dir (cheap auth + mechanism proof; never writes traces/ or proto/compositions/)
//   real  → traces/<slug>.{raw.jsonl,jsonl} + proto/compositions/<scenario>/<slug>.json + <scenario>/index.json upsert
// slot ∈ the scenario's declared slots (compose.json). Run from anywhere — paths resolve from env.mjs.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordRun } from './lib/trace-recorder.mjs';
import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';
import { validateComposition } from '../system/agentic-renderer.mjs';
import { curateTrace } from '../tooling/curate-trace.mjs';
import { validateTrace } from '../tooling/validate-trace.mjs';

const MODEL = 'claude-sonnet-5';
const PIV_ORDER = ['plan', 'gate', 'implement', 'validate'];

// `tools` = the base set the agent CAN reach; `allowedTools` = auto-approved (skips
// canUseTool, but the PreToolUse fence hook still fires). Grep/Glob/Edit are omitted
// entirely so the agent cannot scan the repo for an example — the tightest reading of HC5.
const TOOLS = ['Read', 'Write', 'Bash'];
const READONLY = ['Read'];

// Secret paths the run may neither read nor write (same denylist, both directions).
const SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i;

// The vocabulary is the one universal input (every scenario composes over it). A scenario's
// fixtures + copy come from its compose.json (loadComposeConfig). Anchored to REPO_DIR (absolute)
// so a --dry run (cwd = scratch) still reads the REAL data; these same paths are handed to the agent.
const VOCAB_PATH = path.join(REPO_DIR, 'handoff/verdant/vocabulary.json');

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

// Load + hand-validate scenarios/<scenario>/compose.json (open-Q #4, #88). No schema library
// (project rule): validate at the boundary and throw, every message naming the offending field.
// compose.json externalizes everything domain-specific so the runner has NO baked-in scenario;
// its computeRules carries DEFINITIONS ONLY — it must never name which tiles answer a question.
function loadComposeConfig(scenario) {
  if (!nonEmpty(scenario))
    throw new Error('a scenario is required (first arg): node portal/record-composition.mjs <scenario> "<question>" <slot> [--slug <slug>] [--dry]');
  const dir = path.join(REPO_DIR, 'scenarios', scenario);
  const composePath = path.join(dir, 'compose.json');
  if (!existsSync(composePath))
    throw new Error(`${path.relative(REPO_DIR, composePath)} is missing — a floor scenario needs a compose.json (subject, today, fixtures, copy, slots, computeRules, questions); see scenarios/fieldwork/compose.json`);
  let cfg;
  try { cfg = JSON.parse(readFileSync(composePath, 'utf8')); }
  catch (e) { throw new Error(`${path.relative(REPO_DIR, composePath)}: ${e.message}`); }

  const rel = path.relative(REPO_DIR, composePath);
  const bad = (msg) => { throw new Error(`${rel}: ${msg}`); };
  if (!nonEmpty(cfg.subject)) bad('"subject" must be a non-empty string (names the domain in the prompt, e.g. "the Fieldwork dispatch board")');
  if (!nonEmpty(cfg.today)) bad('"today" must be a non-empty string (the fixed fictional date)');
  if (!nonEmpty(cfg.computeRules)) bad('"computeRules" must be a non-empty string (DEFINITIONS ONLY — never name which tiles answer a question)');
  if (!cfg.computeRules.includes(cfg.today)) bad(`"computeRules" must state the fixed today (${cfg.today}) so the declared date and the prompt cannot drift`);
  if (!Array.isArray(cfg.fixtures) || cfg.fixtures.length === 0) bad('"fixtures" must be a non-empty array of { name, hint }');
  for (const f of cfg.fixtures) {
    if (!f || !nonEmpty(f.name) || !nonEmpty(f.hint)) bad('every fixture needs a non-empty { name, hint }');
    const fp = path.join(dir, 'fixtures', `${f.name}.json`);
    if (!existsSync(fp)) bad(`fixture "${f.name}" has no file at ${path.relative(REPO_DIR, fp)}`);
  }
  if (cfg.copy === true || nonEmpty(cfg.copy)) {
    const cp = path.join(dir, 'copy.json');
    if (!existsSync(cp)) bad(`"copy" is set but ${path.relative(REPO_DIR, cp)} does not exist`);
  } else if (cfg.copy !== undefined && cfg.copy !== false) {
    bad('"copy" must be true, false, or a non-empty hint string');
  }
  if (!cfg.slots || typeof cfg.slots !== 'object' || Array.isArray(cfg.slots) || Object.keys(cfg.slots).length === 0)
    bad('"slots" must be a non-empty object of { <slot>: <bound string> }');
  for (const [name, bound] of Object.entries(cfg.slots))
    if (!nonEmpty(bound)) bad(`slot "${name}" bound must be a non-empty string`);
  if (!Array.isArray(cfg.questions) || cfg.questions.length === 0) bad('"questions" must be a non-empty array of { slug, slot, question }');
  for (const q of cfg.questions) {
    if (!q || !nonEmpty(q.slug) || !nonEmpty(q.slot) || !nonEmpty(q.question)) bad('every question needs a non-empty { slug, slot, question }');
    if (!Object.hasOwn(cfg.slots, q.slot)) bad(`question "${q.slug}" references slot "${q.slot}" not in slots (${Object.keys(cfg.slots).join(' | ')})`);
  }
  return { scenario, dir, ...cfg };
}

const PIV_COMPOSE_SYSTEM = `You are the ux-factory UI-composition agent. You answer a question by composing a
DASHBOARD VIEW as a JSON array of {name, props, children?} nodes over a fixed component
vocabulary — and NOTHING else. Hard rules:
• You may use ONLY the components in the provided vocabulary, ONLY their declared props,
  and you MUST respect every enum exactly. A component or prop not in the vocabulary, or an
  enum value outside its list, will be REFUSED — do not attempt it.
• You NEVER emit raw HTML or CSS. Your entire output artifact is the {name, props, children}
  JSON array; the platform renders it into real components.
• Every value you put in a tile MUST be computed from the provided fixtures — never
  an invented or remembered number. Compute it yourself from the raw records.
• A label must read the state without its tone (e.g. "Overdue" + "4", not a bare "4"); tone is
  redundant emphasis, never the sole signal.
• Each tile's value is a NUMBER (or a ≤2-word phrase) — it renders LARGE, like a headline
  figure. Put entity names, region names, and any qualifier in the LABEL, never in the value:
  e.g. label "Busiest technician — Priya Nair", value "5", unit "jobs" (NOT value "Priya Nair —
  5 open jobs"). A sentence in the value slot breaks the tile.

Everything you do is recorded as a four-act engineering trace with these phases, in this
exact order: plan, gate, implement, validate. Emit four phase markers, each ALONE on the
first line of its OWN separate text block, exactly once each, in order:
[[piv:plan]] … [[piv:gate]] … [[piv:implement]] … [[piv:validate]].
NEVER put two markers in the same text block — each phase is a separate message.

1. Your VERY FIRST output must be a text block beginning with [[piv:plan]], emitted BEFORE you
   read, glob, or run anything — do NOT call any tool until that marker is out. Then, in the
   plan phase, you Read the vocabulary and the fixture files the task names and state exactly
   which components you will use and which value you will compute for each — do NOT judge or
   verify here; planning is stating intent.
2. STOP the plan phase. Open a NEW, separate text block beginning with [[piv:gate]]. In this
   gate phase you MUST re-Read the vocabulary file (a second Read of it) and adversarially
   verify that every component name, prop, and enum value in your planned composition exists
   exactly as you intend, that the composition fits the named slot's bounds, and that each
   label reads the state without its tone; then say plainly what passed and what you corrected.
   That verifying Read is a REQUIRED gate action and belongs to the gate phase. Write NO
   composition file here — gate is review only — and do NOT emit [[piv:implement]] in this block.
3. Only AFTER the gate block and its verifying Read, open a SEPARATE new text block beginning
   with [[piv:implement]], then make your single Write call immediately after it, writing the
   composition JSON to the path the task names. NEVER Write under the plan, gate, or validate
   marker, and never place [[piv:gate]] and [[piv:implement]] in the same block.
4. Then a SEPARATE block beginning with [[piv:validate]]: run the exact node command the task
   names to validate the file you wrote against the real vocabulary, and report the real
   result. If it throws, fix the composition and re-run inside this phase until it validates.

Never place a marker anywhere but the first line of a text block, and never do a phase's work
before its marker. Narrate your decisions in short plain paragraphs — say WHY, not just what.
Your text and tool calls are published verbatim as an engineering trace; do not mention the
recording, just work well.`;

// Build the task prompt from ONLY: the question, the slot + its bounds, the scenario's declared
// fixtures + its DEFINITIONS-ONLY computeRules, and the fixed data paths. No example composition,
// no external reference — this literal construction is the proof. Everything domain-specific comes
// from `config` (compose.json); there is NO scenario baked in here. `refs` are the paths the agent
// references: repo-RELATIVE on real runs (cwd = the repo, so the committed trace stays portable —
// no absolute home-dir paths leak into the inspectable artifact), ABSOLUTE only for --dry (cwd =
// a scratch dir, so it must reach the real repo data).
function buildTask(question, slot, refs, config) {
  const files = [
    `1. ${refs.vocab}
   — the component vocabulary: every component you may use, its props, enums, and the
     top-level "composition" shape rules ({name, props, children?}). Compose ONLY from this.`,
    ...refs.fixtures.map((f, i) => `${i + 2}. ${f.path} — ${f.hint}`),
  ];
  if (refs.copy) files.push(`${refs.fixtures.length + 2}. ${refs.copy.path} — ${refs.copy.hint}`);
  return `Compose a dashboard view that answers this question about ${config.subject}:

  "${question}"

It must fit the "${slot}" slot, whose bounds are: ${config.slots[slot]}

Do not explore or orient first — no ls, cd, pwd, glob, or directory listing (all denied). The files
listed below are everything readable, and the ONLY Bash command you run is the single validate
command at the end. Use the paths exactly as written below (they resolve from your working directory).

Read these files (and ONLY these — nothing else is readable):
${files.join('\n')}

${config.computeRules}

IMPLEMENT by writing the composition — a JSON array of {name, props, children?} nodes — to:
  ${refs.out}

VALIDATE by running exactly:
  node -e "import('${refs.renderer}').then(async m=>{const fs=await import('node:fs');const v=JSON.parse(fs.readFileSync('${refs.vocab}','utf8'));const c=JSON.parse(fs.readFileSync('${refs.out}','utf8'));m.validateComposition(v,c);console.log('composition valid');})"
If it prints a refusal (naming a path like composition[1].props.tone), fix the composition and re-run until it prints "composition valid".`;
}

// Reference paths for buildTask, built from the scenario's compose.json: absolute (dry: agent's
// cwd is scratch, must reach real repo data) or repo-relative (real: agent's cwd is the repo,
// keeps the committed trace portable). Fixture order follows config.fixtures.
function refsFor(scenario, config, { absolute, out }) {
  const dir = path.join(REPO_DIR, 'scenarios', scenario);
  const copyHint = typeof config.copy === 'string'
    ? config.copy
    : "the scenario's human-authored display labels; prefer these for tile labels where present";
  if (absolute) {
    return {
      vocab: VOCAB_PATH,
      fixtures: config.fixtures.map((f) => ({ path: path.join(dir, 'fixtures', `${f.name}.json`), hint: f.hint })),
      copy: config.copy ? { path: path.join(dir, 'copy.json'), hint: copyHint } : null,
      renderer: path.join(REPO_DIR, 'system/agentic-renderer.mjs'),
      out,
    };
  }
  return {
    vocab: 'handoff/verdant/vocabulary.json',
    fixtures: config.fixtures.map((f) => ({ path: `scenarios/${scenario}/fixtures/${f.name}.json`, hint: f.hint })),
    copy: config.copy ? { path: `scenarios/${scenario}/copy.json`, hint: copyHint } : null,
    renderer: './system/agentic-renderer.mjs',
    out,
  };
}

// Fence: Write → only the one composition file; Read → only the vocabulary + the scenario's
// declared fixtures (readOk, rebuilt per-scenario); Bash → node … only; everything else denied.
// `root` = the run's cwd (REPO_DIR real, scratch dry). `readOk` = the absolute REPO_DIR-anchored
// set of readable inputs — never loosened to "read any file".
function makeFence(root, outAbsPath, readOk) {
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
      if (readOk.has(path.resolve(realRoot, fp))) return allow(input);
      return deny(`may read ONLY the vocabulary + the scenario's declared fixtures — no examples, no other files (got ${fp})`);
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

// Remove a slug's SHIPPABLE artifacts (curated trace + manifest entry), leaving the raw
// trace + composition file on disk for inspection. Called when a run is invalid or not
// PIV-clean so a weak/failed (re-)run never leaves a shippable proposal behind. `indexPath`
// is the SCENARIO-SCOPED manifest — never the shared root one.
function dropShipped(slug, indexPath) {
  const curated = path.join(REPO_DIR, 'traces', `${slug}.jsonl`);
  if (existsSync(curated)) rmSync(curated);
  if (!existsSync(indexPath)) return;
  let list = [];
  try { list = JSON.parse(readFileSync(indexPath, 'utf8')); } catch { return; }
  if (!Array.isArray(list)) return;
  const next = list.filter((e) => e.slug !== slug);
  if (next.length !== list.length) writeFileSync(indexPath, JSON.stringify(next, null, 2) + '\n');
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

async function main({ scenario, question, slot, slug, isDry, force }) {
  const config = loadComposeConfig(scenario); // throws (path-naming) on a missing/malformed compose.json
  if (!question) throw new Error(`a question is required: node portal/record-composition.mjs ${scenario} "<question>" <slot> [--slug <slug>] [--dry]`);
  if (!Object.hasOwn(config.slots, slot)) throw new Error(`slot must be one of: ${Object.keys(config.slots).join(' | ')} (got "${slot}")`);
  if (!existsSync(VOCAB_PATH)) throw new Error(`${path.relative(REPO_DIR, VOCAB_PATH)} is missing — run: node agent-layer/gen-vocabulary.mjs`);

  // The Read fence, rebuilt per-scenario: the vocabulary + this scenario's declared fixtures
  // (+ its copy.json when declared), absolute REPO_DIR-anchored so a --dry run still reads REAL
  // data — never loosened to "read any file".
  const readOk = new Set([
    VOCAB_PATH,
    ...config.fixtures.map((f) => path.join(config.dir, 'fixtures', `${f.name}.json`)),
    ...(config.copy ? [path.join(config.dir, 'copy.json')] : []),
  ]);

  if (isDry) {
    const dryDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'composition-dry-')));
    mkdirSync(path.join(dryDir, 'proto/compositions'), { recursive: true });
    const outAbs = path.join(dryDir, 'proto/compositions', `${slug}.json`);
    const outFile = path.join(dryDir, 'smoke.raw.jsonl');
    process.stderr.write(`composition: --dry smoke test (${scenario}) → ${outFile}\n  (Agent SDK, model ${MODEL}, maxTurns 40 — real tokens but a cheap single run; proves auth, all four PIV markers, Write→artifact pairing, the Read/Write fence denies, and in-process validateComposition accepts the written file)\n`);
    printAuth();
    const r = await recordRun({
      slug, task: buildTask(question, slot, refsFor(scenario, config, { absolute: true, out: outAbs }), config), taskSummary: `DRY — compose "${slot}" for ${scenario}: ${question}`,
      systemPrompt: PIV_COMPOSE_SYSTEM, model: MODEL, maxTurns: 40,
      tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(dryDir, outAbs, readOk), outFile, cwd: dryDir,
    });
    let validNote = ' · NOT VALIDATED';
    try { assertValid(VOCAB_PATH, outAbs); validNote = ' · in-process validateComposition ✓'; }
    catch (e) { validNote = ` · ✗ invalid: ${e.message}`; process.exitCode = 1; }
    summarize(slug, r, ` · DRY (not shipped)${validNote}`);
    return;
  }

  // Real run: cwd = REPO_DIR, write the agent's relative path so the trace artifact is repo-relative.
  // Output + manifest are SCOPED to proto/compositions/<scenario>/ so a non-Fieldwork run never
  // touches the shared root manifest (proto/compositions/index.json — the Fieldwork study's source).
  // traces/ stays a FLAT namespace, so slugs must be globally unique across scenarios.
  const compDir = path.join('proto/compositions', scenario);
  mkdirSync(path.join(REPO_DIR, compDir), { recursive: true });
  const outRel = path.join(compDir, `${slug}.json`);
  const outAbs = path.join(REPO_DIR, outRel);
  const indexPath = path.join(REPO_DIR, compDir, 'index.json');
  const rawOut = path.join(REPO_DIR, 'traces', `${slug}.raw.jsonl`);
  const curatedOut = path.join(REPO_DIR, 'traces', `${slug}.jsonl`);
  if (existsSync(rawOut) && !force)
    throw new Error(`${path.relative(REPO_DIR, rawOut)} exists — pass --force to overwrite the committed trace (or delete it first).`);
  // Remove any stale target so the agent writes a NEW file: Claude Code's Write tool requires a
  // prior Read when OVERWRITING, but the Read fence denies reading proto/compositions/ — leaving
  // the old file in place forces a Bash `node` write fallback (no Write→artifact pairing). A
  // re-run replaces the proposal anyway, so clearing it first keeps the implement step a real Write.
  if (existsSync(outAbs)) rmSync(outAbs);

  process.stderr.write(`composition: recording the real run (${scenario}) → ${outRel}\n  (Agent SDK, model ${MODEL}, maxTurns 40 — real tokens; ~2–5 min)\n`);
  printAuth();
  const r = await recordRun({
    slug, task: buildTask(question, slot, refsFor(scenario, config, { absolute: false, out: outRel }), config), taskSummary: `Compose "${slot}" for ${scenario}: ${question}`,
    systemPrompt: PIV_COMPOSE_SYSTEM, model: MODEL, maxTurns: 40,
    tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(REPO_DIR, outAbs, readOk), outFile: rawOut,
  });

  // A proposal SHIPS only if BOTH hold: the composition validates AND the CURATED trace passes
  // the EXACT drift guard the ticket ships under (validate-trace.mjs: four phases as distinct
  // STEP phases in order, artifact-exists, honesty label). The recorder's marker-scan can call
  // a run "clean" when the model crams two markers into one text block (e.g. gate+implement),
  // so validate-trace — not the scan — is the authority here. Either check failing → drop the
  // shippable artifacts (curated trace + manifest entry), keep the raw for inspection, exit 1:
  // tighten committed source + re-run, NEVER hand-edit.
  let composition = null;
  try { composition = assertValid(VOCAB_PATH, outAbs); }
  catch (e) { process.stderr.write(`  ✗ the written composition is INVALID — ${e.message}\n`); }
  if (!composition) {
    dropShipped(slug, indexPath);
    process.stderr.write('  Not shipping (invalid composition). Tighten the prompt/vocabulary and re-run with --force — never hand-edit.\n');
    process.stderr.write(`  composition ${slug} ✗  ~$${(r.totalCostUsd ?? 0).toFixed(4)} · INVALID (not shipped)\n`);
    process.exitCode = 1;
    return;
  }

  curateTrace(rawOut, curatedOut);
  try {
    validateTrace(curatedOut);
  } catch (e) {
    dropShipped(slug, indexPath);
    process.stderr.write(`  ✗ the trace is not a clean PIV run — ${e.message}\n`);
    process.stderr.write('  Not shipping it. Each PIV marker must be ALONE in its own text block; tighten the prompt and re-run with --force — never hand-edit.\n');
    process.stderr.write(`  composition ${slug} ✗  phases: ${r.phases.join('→') || '(none)'} · ~$${(r.totalCostUsd ?? 0).toFixed(4)} · PIV-incomplete (not shipped)\n`);
    process.exitCode = 1;
    return;
  }

  const total = upsertIndex(indexPath, {
    slug, question, slot,
    proposal: `/proto/compositions/${scenario}/${slug}.json`,
    trace: `/traces/${slug}.jsonl`,
  });
  summarize(slug, r, ` · ${composition.length ?? 1} node(s) · valid ✓ · trace ✓ · manifest: ${total} entr${total === 1 ? 'y' : 'ies'}`);
  process.stderr.write(`  proposal: ${outRel}\n  trace:    traces/${slug}.jsonl (curated) + traces/${slug}.raw.jsonl (raw)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('--') && a !== '--slug'));
  const slugIdx = argv.indexOf('--slug');
  const explicitSlug = slugIdx !== -1 ? argv[slugIdx + 1] : null;
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(slugIdx !== -1 && i === slugIdx + 1));
  const scenario = positional[0];
  const question = positional[1];
  const slot = positional[2];
  const slug = explicitSlug || slugify(question || '');
  main({ scenario, question, slot, slug, isDry: flags.has('--dry'), force: flags.has('--force') })
    .catch((err) => { console.error(`composition ✗  ${err.message}`); process.exit(1); });
}
