// portal/record-derivation.mjs — pack-seed derivation vision run (epic #38, ticket #40).
// Architecture per-company-brief §Recommended approach (capability 1: "screenshot → pack
// derivation, recorded agent run — proposal only") + §Spikes 1 (derivation fidelity).
//
// A REAL Agent SDK run (clone of record-trace.mjs) whose task is a VISION derivation: read the
// committed Verdant product screenshot(s), propose a complete pack seed (palette · type scale ·
// spacing · radius · fonts) as DTCG keyed to the token contract, write it, and self-validate that
// it COMPILES via agent-layer/gen-pack-css.mjs. The proposal is never shipped unreviewed — the
// committed seed carries a `review` block a human fills; the trace immutably preserves the raw
// proposal (agent proposes, human decides). Emits traces/pack-seed-verdant.raw.jsonl.
//
// Two modes:  node portal/record-derivation.mjs --dry   (cheap smoke → scratch dir: proves the
//             fence allows the screenshot + denies the ground truth, image reads are clean
//             placeholders, a tiny seed writes and compiles)
//             node portal/record-derivation.mjs         (the real vision run → traces/)
// The PIV system prompt + the task are const strings here: the runner IS the record of what
// produced the trace. Tuning them is the spike-5 tighten-and-re-run lever (the git diff shows it).

import { existsSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordRun } from './lib/trace-recorder.mjs';
import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';

const SLUG = 'pack-seed-verdant';
// A vision-capable model (the screenshots ARE the input). claude-sonnet-5 matches the existing
// demo-notice run and reads images; swap only if a run shows it cannot see the pixels (Phase 0).
const MODEL = 'claude-sonnet-5';
const PIV_ORDER = ['plan', 'gate', 'implement', 'validate'];

const TOOLS = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash'];
const READONLY = ['Read', 'Grep', 'Glob'];

// Secret paths — denied both directions (as in record-trace.mjs); traces ship publicly.
const SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i;

// The vision-derivation four-act contract. Same plan→gate→implement→validate spine as
// record-trace.mjs's PIV_SYSTEM, re-pointed at a derivation task.
const PIV_SYSTEM = `You are the ux-factory build agent doing a DERIVATION from product screenshots.
Everything you do is recorded as a four-act engineering trace with these phases, in this exact
order: plan, gate, implement, validate. You MUST emit four phase markers, each ALONE on the first
line of its own text block, exactly once each, in order:
[[piv:plan]] … [[piv:gate]] … [[piv:implement]] … [[piv:validate]].

Follow this protocol literally:
1. Your VERY FIRST output must be a text block beginning with [[piv:plan]], emitted BEFORE you
   read, glob, grep, or run anything. In the plan phase you ONLY read the screenshot(s) the task
   names and the contract token list, then state exactly what you will propose: name the palette
   you read from the pixels (accent + neutrals), the type scale, spacing, and radius, and the
   contract token each maps to. Derive ONLY from what you can SEE plus the contract token names —
   do NOT critique or verify here; planning is stating intent.
2. STOP the plan phase, then open a NEW text block beginning with [[piv:gate]] and review there:
   adversarially check your proposed mapping against the contract token list and the honesty
   contract — every value must be justified by the pixels, not guessed from a brand you happen to
   know; colours are #rrggbb, dimensions px or clamp(), fonts a stack. Say plainly what passes and
   what you corrected. Write NO files in this phase; gate is review only.
3. Only after the gate block, emit a text block beginning with [[piv:implement]] — its own block —
   and make your Write call immediately after it. NEVER Write under the plan, gate, or validate
   marker.
4. Then a text block beginning with [[piv:validate]]: run the exact command the task names
   (gen-pack-css over your seed) and report the REAL result. If it throws or auto-fills a
   perceptual token you meant to propose, FIX the seed and re-run inside this phase until it
   compiles with only the relative/static tokens auto-filled.

Never place a marker anywhere but the first line of a text block, and never do a phase's work
before its marker. Narrate decisions in short plain paragraphs — say WHY (what in the image drove
each value). Your text and tool calls are published verbatim as an engineering trace; do not
mention the recording, just work well.`;

// The real derivation task. Absolute paths for the screenshot dir + the tools the agent runs, so
// they resolve regardless of cwd. Seed shape is DTCG; the agent proposes the perceptual tokens and
// gen-pack-css auto-fills the relative/static remainder (inverse color-mix, shadows, maxw, gutter).
function realTask(repoDir) {
  const inputDir = path.join(repoDir, 'tooling/round-trip/input');
  const shotPhone = path.join(inputDir, 'verdant-plant-overview.png');
  const shotFull = path.join(inputDir, 'verdant-full.png');
  const seedPath = path.join(repoDir, 'tooling/round-trip/verdant.seed.json');
  const genPack = path.join(repoDir, 'agent-layer/gen-pack-css.mjs');
  const contract = path.join(repoDir, 'system/tokens.source.json');
  return `Derive a complete Verdant pack seed from the product screenshots. Work in four PIV phases,
emitting each marker ALONE on the first line of its own text block, in this order: [[piv:plan]],
[[piv:gate]], [[piv:implement]], [[piv:validate]]. You already have every path you need below — do
not search for files.

[[piv:plan]] — your FIRST output is this text block (before any tool call). In it, read exactly
these three files, in order, and nothing else:
  1. ${shotPhone}   (the Verdant phone screen)
  2. ${shotFull}    (the full page)
  3. ${contract}    (for the contract's leaf token NAMES only)
Then state the palette, type scale, spacing, and radius you read from the PIXELS and the contract
token each maps to. The ground-truth Verdant pack, the scenario axes, and the derivation
engine/ruleset are off-limits (the fence denies them) — propose only from what you see.

[[piv:gate]] — a new text block. Review your mapping: every value justified by a pixel; colours
#rrggbb; dimensions px or clamp(min,vw,max); fonts a stack. Write nothing in this phase.

[[piv:implement]] — a new text block beginning with the marker; only then Write the seed to
${seedPath} as DTCG:

  { "tokens": {
      "color-accent": { "$value": "#2f7a4d", "$type": "color" },
      "type-body":    { "$value": "16px",    "$type": "dimension" },
      "font-display": { "$value": "Inter, system-ui, sans-serif", "$type": "fontFamily" },
      …every perceptual contract token…
    },
    "review": { "approved": false, "changedTokens": [], "by": "", "date": "" }
  }

Give a value for EVERY perceptual contract token (37 in all): the palette (foreground, muted,
background, surface, border, border-strong, white, accent + hover/active/fg/secondary/on-inverse,
and the three inverse tokens), the full type ramp (display…eyebrow), the 8 spacing steps, the 3
radii, and the two fonts.

[[piv:validate]] — a new text block, then run:  node ${genPack} ${seedPath}  and report the real
result. It PRINTS which tokens it auto-filled from contract defaults; a correct seed auto-fills only
the relative/static tokens (the color-mix inverse tokens, shadows, maxw, gutter). If it auto-fills
any colour/type/spacing/radius/font token — or throws — fix the seed and re-run in this phase.`;
}

// Write/read/exec fence. writeDir = the ONLY dir writes may land (repo's tooling/round-trip for the
// real run; a scratch dir for --dry). repoDir supplies the ABSOLUTE read allowlist (screenshots +
// the token contract) — absolute so --dry's scratch cwd still resolves them. The ground truth
// (scenario axes, tokens.verdant.css, derive.*) is simply not on the allowlist → denied + recorded.
function makeDerivationFence({ writeDir, repoDir }) {
  const realWrite = realpathSync(writeDir);
  // Repo paths are not symlinked (unlike os.tmpdir()), so a plain absolute join matches path.resolve
  // on the agent's side without needing the file to already exist.
  const readAllow = [
    path.join(repoDir, 'tooling/round-trip'),   // screenshots (input/) + the run's own outputs
    path.join(repoDir, 'system/tokens.source.json'),
    path.join(repoDir, 'system/tokens.contract.css'),
    realWrite,
  ];
  const within = (target, base) => target === base || target.startsWith(base + path.sep);
  return async (tool, input) => {
    if (tool === 'Write' || tool === 'Edit') {
      const fp = input?.file_path || '';
      if (SECRET_PATHS.test(fp))
        return { behavior: 'deny', message: `The derivation run may not touch secret paths (${fp}).` };
      const target = path.resolve(realWrite, fp);
      if (within(target, realWrite)) return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: `The derivation run may only write inside ${realWrite}.` };
    }
    if (tool === 'Bash') {
      // `node ` is a nudge, not a boundary (node -e can read anything) — redaction over recorded
      // output is the real backstop, same as record-trace.mjs.
      if (/^node /.test(input?.command || ''))
        return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: 'The derivation run may only run `node …` via Bash.' };
    }
    if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
      const fp = input?.file_path || input?.path || '';
      if (SECRET_PATHS.test(fp))
        return { behavior: 'deny', message: `The derivation run may not read secret paths (${fp}).` };
      if (!fp)
        return { behavior: 'deny', message: 'The derivation run has no pathless read fence — name the file (screenshots or the token contract).' };
      const target = path.resolve(repoDir, fp); // absolute fp ignores repoDir; relative resolves under it
      if (readAllow.some((a) => within(target, a))) return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: `The derivation run may only read the screenshots + the token contract — not the ground truth (${fp}).` };
    }
    return { behavior: 'deny', message: `${tool} is outside the derivation run's fence.` };
  };
}

function printAuth() {
  process.stderr.write(HAS_TOKEN
    ? '  auth: CLAUDE_CODE_OAUTH_TOKEN from portal/.env\n'
    : '  auth: no token in portal/.env — using the Claude CLI login on this Mac (same path portal chat uses here)\n');
}

function summarize(slug, r, isDry) {
  const phasesOk = r.phases.join('→') === PIV_ORDER.join('→');
  const clean = phasesOk && r.nullPhaseSteps === 0;
  console.log(
    `trace ${slug.padEnd(18)} ${clean ? '✓' : '✗'}  ${r.steps} steps · ` +
    `phases: ${r.phases.join('→') || '(none)'} · ${r.nullPhaseSteps} null-phase · ` +
    `${r.artifacts} artifact${r.artifacts === 1 ? '' : 's'} · ${r.denials} denied · ` +
    `~$${(r.totalCostUsd ?? 0).toFixed(4)}` +
    (isDry ? ' · DRY (not shipped)' : '')
  );
  if (!r.ok) process.stderr.write('  ⚠ the agent run ended non-successfully (result.ok=false) — inspect the trace result line.\n');
  if (!clean) {
    process.stderr.write(
      `  ⚠ not a clean PIV run:${phasesOk ? '' : ` phases were ${r.phases.join('→') || '(none)'}, need ${PIV_ORDER.join('→')};`}` +
      `${r.nullPhaseSteps ? ` ${r.nullPhaseSteps} step(s) recorded before the first [[piv:plan]] marker;` : ''}\n` +
      '  Fix by tightening PIV_SYSTEM/TASK and re-running with --force. Never hand-edit the JSONL (honesty contract).\n'
    );
    process.exitCode = 1;
  }
}

async function main({ isDry, force }) {
  if (isDry) {
    const dryDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'derivation-dry-')));
    const outFile = path.join(dryDir, 'smoke.raw.jsonl');
    const seedOut = path.join(dryDir, 'verdant.seed.json');
    // Absolute repo references — with cwd = the scratch dir, repo-relative paths would miss.
    const inputDir = path.join(REPO_DIR, 'tooling/round-trip/input');
    const groundTruth = path.join(REPO_DIR, 'system/tokens.verdant.css'); // the answer — must be DENIED
    const genPack = path.join(REPO_DIR, 'agent-layer/gen-pack-css.mjs');
    if (!existsSync(inputDir))
      throw new Error(`${path.relative(REPO_DIR, inputDir)} is missing — run the screenshot capture first: cd tooling/visual-regression && node capture-roundtrip.mjs`);
    const shot = path.join(inputDir, 'verdant-plant-overview.png');
    const task = `IMPORTANT: do NOT orient yourself first — no ls, no directory listing, no Glob, no
exploration of any kind. Your VERY FIRST output must be the text block beginning with [[piv:plan]],
before ANY tool call. The absolute paths below are everything this smoke test needs.

Work through all four PIV phases to produce a MINIMAL DTCG seed at ${seedOut}:
- plan: emit [[piv:plan]], then Read exactly this screenshot: ${shot}. State the accent colour you
  see. THEN attempt to Read ${groundTruth} — the ground truth; the fence WILL deny it; note the
  denial and continue (do not retry).
- gate: a NEW block beginning [[piv:gate]] — in one sentence confirm you propose only from the
  pixels. Write nothing here.
- implement: a NEW block beginning [[piv:implement]], then Write ${seedOut} = { "tokens": { "color-accent": { "$value": "<the hex you saw>", "$type": "color" } }, "review": { "approved": false, "changedTokens": [], "by": "", "date": "" } }
- validate: a NEW block beginning [[piv:validate]], then run  node ${genPack} ${seedOut}  and report
  that it compiled (it auto-fills the rest from contract defaults — expected for this smoke). End your
  final block with these two exact synthetic redaction self-test lines:
TEST_TOKEN=synthetic1234567890
"test_password": "synthetic0987654321"`;
    process.stderr.write(`derivation: --dry smoke → ${outFile}\n  (Agent SDK, maxTurns 14 — pennies; proves the fence allows the screenshot + denies the ground truth, the image Read is a clean placeholder, the seed writes + compiles, JSONL is well-formed)\n`);
    printAuth();
    const r = await recordRun({
      slug: SLUG, task, taskSummary: 'DRY smoke — derivation fence + image hygiene',
      systemPrompt: PIV_SYSTEM, model: MODEL, maxTurns: 14,
      tools: TOOLS, allowedTools: READONLY,
      canUseTool: makeDerivationFence({ writeDir: dryDir, repoDir: REPO_DIR }),
      outFile, cwd: dryDir,
    });
    summarize(SLUG, r, true);
    return;
  }

  const outFile = path.join(REPO_DIR, 'traces', `${SLUG}.raw.jsonl`);
  if (existsSync(outFile) && !force)
    throw new Error(`${path.relative(REPO_DIR, outFile)} exists — pass --force to overwrite the committed trace (or delete it first).`);
  const inputDir = path.join(REPO_DIR, 'tooling/round-trip/input');
  if (!existsSync(inputDir))
    throw new Error(`${path.relative(REPO_DIR, inputDir)} is missing — capture the vision input first: cd tooling/visual-regression && node capture-roundtrip.mjs`);
  // NOTE: unlike record-trace.mjs there is NO style-dictionary guard — this run's validate phase
  // runs agent-layer/gen-pack-css.mjs, which is zero-dep (no Style Dictionary shell-out).

  const writeDir = path.join(REPO_DIR, 'tooling/round-trip');
  process.stderr.write(`derivation: recording the real vision run → ${path.relative(REPO_DIR, outFile)}\n  (Agent SDK, model ${MODEL}, maxTurns 60 — real tokens; expect a few tighten-and-re-run passes)\n`);
  printAuth();
  const r = await recordRun({
    slug: SLUG, task: realTask(REPO_DIR),
    taskSummary: 'Derive a Verdant pack seed from product screenshots (proposal — human-gated)',
    systemPrompt: PIV_SYSTEM, model: MODEL, maxTurns: 60,
    tools: TOOLS, allowedTools: READONLY,
    canUseTool: makeDerivationFence({ writeDir, repoDir: REPO_DIR }),
    outFile,
  });
  summarize(SLUG, r, false);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  main({ isDry: argv.includes('--dry'), force: argv.includes('--force') })
    .catch((err) => { console.error(`trace ✗  ${err.message}`); process.exit(1); });
}
