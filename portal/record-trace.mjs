// portal/record-trace.mjs — build-time trace recording run (epic #1, ticket #5).
// Architecture §Where it plugs in: the portal's Agent SDK dependency becomes the
// trace recorder. Emits traces/<slug>.raw.jsonl — a REAL agent run; the honesty
// contract forbids hand-writing or hand-editing trace content (curation =
// tooling/curate-trace.mjs: selection + truncation only, rules recorded in meta).
//
// Two modes:  node portal/record-trace.mjs --dry   (cheap smoke test → scratch dir;
//             also proves the fence denies + records the denial as a step)
//             node portal/record-trace.mjs          (the real run → traces/)
// Run from anywhere — paths resolve from env.mjs / import.meta.url, never cwd.
//
// The PIV system prompt and the recorded task are const strings in THIS file, not
// external files: the runner IS the record of what produced each trace (inspectable
// proof). Tuning them is spike 5's lever — the git diff shows any change.

import { existsSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordRun } from './lib/trace-recorder.mjs';
import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';

const SLUG = 'demo-notice';
const MODEL = 'claude-sonnet-5';
const PIV_ORDER = ['plan', 'gate', 'implement', 'validate'];

// Availability vs. auto-approval (SDK 0.1.77 semantics, verified against the installed
// .d.ts): `tools` sets the base set the agent CAN reach; `allowedTools` auto-approves
// (skips canUseTool). So the read-only tools are auto-approved and the write/exec tools
// are left for canUseTool to FENCE — listing them in allowedTools would bypass the fence.
// canUseTool alone is NOT sufficient: the permission layer's fast path auto-allows
// "trivially safe" commands (e.g. `true`) without consulting it, so recordRun also wires
// this same fence into a PreToolUse hook, which fires before every execution (PR #24 review).
const TOOLS = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash'];
const READONLY = ['Read', 'Grep', 'Glob'];

// Secret paths the recorded run may neither write NOR read — one denylist, both
// directions. Traces are committed and served publicly (_headers /traces/*), so a
// read is as dangerous as a write.
const SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i;

const PIV_SYSTEM = `You are the ux-factory build agent. Everything you do is recorded as a four-act
engineering trace with these phases, in this exact order: plan, gate, implement,
validate. You MUST emit four phase markers, each ALONE on the first line of its own
text block, exactly once each, in order:
[[piv:plan]] … [[piv:gate]] … [[piv:implement]] … [[piv:validate]].

Follow this protocol literally:
1. Your VERY FIRST output must be a text block beginning with [[piv:plan]], emitted
   BEFORE you read, glob, grep, or run anything — do not call a tool until that marker
   is out. In the plan phase you ONLY read every file the task names and then state
   exactly what you will build (for a ComponentSpec: every head field and the four
   prose sections). Do NOT critique, verify, or judge anything correct here — planning
   is stating intent; all review is saved for the gate phase.
2. STOP the plan phase, then open a NEW text block beginning with [[piv:gate]] and do
   the review there: adversarially check the plan you just stated against the spec
   format, the token rules, and the honesty contract in the files you read, and say
   plainly what passes and what you corrected. This block is MANDATORY — you may not
   make a Write/Edit call until you have emitted [[piv:gate]] and done this review.
   Write NO files in this phase; gate is review only.
3. Only after the gate block, emit a text block beginning with [[piv:implement]] — its
   own separate block — and make your Write/Edit calls immediately after it. Every
   Write/Edit call must be directly preceded by the [[piv:implement]] marker; NEVER make
   a Write/Edit call under the plan, gate, or validate marker. If you are about to write
   a file while still in the gate phase, STOP and emit [[piv:implement]] first.
4. Then a text block beginning with [[piv:validate]]: run the command(s) the task
   names and report the real result. If a check fails, fix and re-run inside this phase.

Never place a marker anywhere but the first line of a text block, and never do a
phase's work before its marker. Narrate your decisions in short plain paragraphs —
say WHY, not just what. Your text and tool calls are published verbatim as an
engineering trace; do not mention the recording, just work well.`;

const TASK = `Author system/specs/demo-notice.md — the ComponentSpec for demo-notice, the
fictional-scenario notice component (the visible label that a demo scenario is
fictional; honesty surface #1). It renders a scenario's fictionalNotice string.

Read first, in this order:
1. .claude/references/kb-format.md            (the spec head schema + prose sections)
2. system/specs/primary-button.md             (closest sibling: presentational, contract: null)
3. scenarios/verdant/copy.json                (the fictionalNotice data it renders)
4. system/tokens.source.json                  (the contract group — the only token names you may use)

Constraints: status "spec" (no CSS exists yet — ticket #8 ships it and flips the
status); contract: null (presentational — the composing page passes the notice
text as a prop); class "vd-demo-notice" (the spec joins the Verdant pack that
agent-layer/gen-handoff.mjs emits; Fieldwork's variant lands with ticket #8);
props must include the notice text; keep it as small as an honest component can be.

Validate with: node agent-layer/gen-handoff.mjs
(it parses every spec including yours and regenerates handoff/verdant/ — a real
gate that throws on any head violation).`;

// Write/exec fence, resolved against `root` (REPO_DIR real, dryDir dry). realpathSync
// the root: macOS os.tmpdir() is /var/folders/… but the real path is /private/var/…,
// and an un-realpath'd root would make startsWith() deny the agent's writes silently.
function makeFence(root) {
  const realRoot = realpathSync(root);
  return async (tool, input) => {
    if (tool === 'Write' || tool === 'Edit') {
      const fp = input?.file_path || '';
      if (SECRET_PATHS.test(fp))
        return { behavior: 'deny', message: `The recorded run may not touch secret paths (${fp}).` };
      const target = path.resolve(realRoot, fp);
      if (target === realRoot || target.startsWith(realRoot + path.sep))
        return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: `The recorded run may only write inside ${realRoot}.` };
    }
    if (tool === 'Bash') {
      // `node ` is a nudge, not a boundary — `node -e` can read anything (declared moot
      // in PR #24 review). Redaction over recorded output (portal/lib/redact.mjs) is the
      // layer that catches what this fence can't see.
      if (/^node /.test(input?.command || ''))
        return { behavior: 'allow', updatedInput: input };
      return { behavior: 'deny', message: 'The recorded run may only run `node …` via Bash.' };
    }
    if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
      // Read names file_path; Grep/Glob name path (absent = cwd — a pathless Grep can't
      // be path-denied; redaction over its recorded response is the backstop).
      const fp = input?.file_path || input?.path || '';
      if (SECRET_PATHS.test(fp))
        return { behavior: 'deny', message: `The recorded run may not read secret paths (${fp}).` };
      return { behavior: 'allow', updatedInput: input };
    }
    return { behavior: 'deny', message: `${tool} is outside the recorded run's fence.` };
  };
}

function printAuth() {
  process.stderr.write(HAS_TOKEN
    ? '  auth: CLAUDE_CODE_OAUTH_TOKEN from portal/.env\n'
    : '  auth: no token in portal/.env — using the Claude CLI login on this Mac (same path portal chat uses here)\n');
}

// The end-of-run ✓ line. A non-zero null-phase count or a missing/misordered phase =
// bad run, visible immediately, before curation — the spike-5 tighten-and-re-run signal.
function summarize(slug, r, isDry) {
  const phasesOk = r.phases.join('→') === PIV_ORDER.join('→');
  const clean = phasesOk && r.nullPhaseSteps === 0;
  console.log(
    `trace ${slug.padEnd(12)} ${clean ? '✓' : '✗'}  ${r.steps} steps · ` +
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
      '  Fix by tightening PIV_SYSTEM and re-running with --force. Never hand-edit the JSONL (honesty contract).\n'
    );
    process.exitCode = 1;
  }
}

async function main({ isDry, force }) {
  if (isDry) {
    // Scratch dir; realpath so the fence root matches what the agent's writes resolve to.
    const dryDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'trace-dry-')));
    const outFile = path.join(dryDir, 'smoke.raw.jsonl');
    const smoke = path.join(dryDir, 'smoke.md');
    // Absolute reference: with cwd = the scratch dir, a repo-relative path would miss.
    const kbFormat = path.join(REPO_DIR, '.claude/references/kb-format.md');
    const task = `IMPORTANT: do not orient yourself first — no ls, no directory listing, no Glob, no exploration of any kind. Your working directory is an empty scratch dir; the two absolute paths below are everything that exists for this task. The ONLY Bash command you may attempt in the entire run is the single \`echo fence-check\` named in the validate step.

Work through all four PIV phases to produce ${smoke} containing a two-sentence summary of the ComponentSpec head schema in ${kbFormat}. plan: read that file. gate: review your summary plan. implement: write smoke.md. validate: re-read smoke.md and confirm it says what you intended (a prose summary has no build step), then attempt exactly one Bash command \`echo fence-check\` (it will be denied — note the denial and continue), and end your final text block with these two exact lines (synthetic redaction self-test strings):
TEST_TOKEN=synthetic1234567890
"test_password": "synthetic0987654321"`;
    process.stderr.write(`trace: --dry smoke test → ${outFile}\n  (Agent SDK, maxTurns 12 — pennies; proves hooks fire, markers parse, Write→artifact pairs, the fence denies + records, JSONL is well-formed)\n`);
    printAuth();
    const r = await recordRun({
      slug: SLUG, task, taskSummary: 'DRY smoke — summarise the ComponentSpec head schema',
      systemPrompt: PIV_SYSTEM, model: MODEL, maxTurns: 12,
      tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(dryDir), outFile, cwd: dryDir,
    });
    summarize(SLUG, r, true);
    return;
  }

  const outFile = path.join(REPO_DIR, 'traces', `${SLUG}.raw.jsonl`);
  if (existsSync(outFile) && !force)
    throw new Error(`${path.relative(REPO_DIR, outFile)} exists — pass --force to overwrite the committed trace (or delete it first).`);
  const sdModules = path.join(REPO_DIR, 'tooling/style-dictionary/node_modules');
  if (!existsSync(sdModules))
    throw new Error(`${path.relative(REPO_DIR, sdModules)} is missing — the run's validate phase (node agent-layer/gen-handoff.mjs) shells out to Style Dictionary. Run: cd tooling/style-dictionary && npm install`);

  process.stderr.write(`trace: recording the real run → ${path.relative(REPO_DIR, outFile)}\n  (Agent SDK, model ${MODEL}, maxTurns 50 — real tokens; ~2–5 min)\n`);
  printAuth();
  const r = await recordRun({
    slug: SLUG, task: TASK, taskSummary: 'Author the demo-notice ComponentSpec (honesty surface #1)',
    systemPrompt: PIV_SYSTEM, model: MODEL, maxTurns: 50,
    tools: TOOLS, allowedTools: READONLY, canUseTool: makeFence(REPO_DIR), outFile,
  });
  summarize(SLUG, r, false);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  main({ isDry: argv.includes('--dry'), force: argv.includes('--force') })
    .catch((err) => { console.error(`trace ✗  ${err.message}`); process.exit(1); });
}
