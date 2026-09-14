#!/usr/bin/env node
// The pre-run gate for run 2 — the pre-grill fixture audited in existing-PRD mode (#292, epic #279;
// intent at docs/epics/discovery-partner.prd.md §MVP 13 and §Success metrics "Gap finding (run 2)";
// the fence and the frozen-fixture gate at docs/epics/discovery-partner.architecture.md §Boundaries).
// This is the one command that says the sitting may start, and it asserts the ticket's three
// preconditions mechanically rather than by reading a checklist.
//
// Six checks, in the ticket's own order:
//   1  the frozen fixture exists on disk and its BYTES hash to the md5 MVP 13 prints        (precondition 1)
//   2  the scoring rubric exists, is tracked, is COMMITTED and matches HEAD — the pre-registration
//   3  the fence, three facts over the REAL run-2 allow-set (reads: []): the scoring key, the fixtures
//      DIRECTORY and the fixture ITSELF are DENIED while the package root and the bank are ALLOWED; and
//      the transport still advertises NO built-in tool (MAIN_TOOLS = Object.freeze([]))  (precondition 2)
//   4  full discovery with hasModel composes exactly 23 — the twelve first, in OPENING_SET order, and
//      every id of MODULES.hasModel present, so the AI-interaction module fires
//   5  discovery/partner-audit-2/run.json does NOT exist — the sitting has not already started
//   6  --model is one of MODELS, Grill is MODEL_SETTABLE, and the resolved stamp is printed with the
//      rubric's commit AND author dates, so the report can quote all three beside startedAt
//
// reads: [] and not [fixture]. Since #286 the document rides in the system prompt (openSession stores
// the bytes from documentPath; the drawer sends no `reads`), so the run names nothing and its allow-set
// is exactly [root, bank]. The ticket's "an allow-set that admits the fixture" predates #286 and is
// superseded by the owner's comment on the issue. Check 3 therefore proves the fence over the set the
// run WILL carry, and the by-construction half beside it: no read tool is advertised at all.
//
// THIS IS A PRE-RUN GATE. Check 5 inverts the moment the session opens: once the run exists, this
// script is expected to be red on check 5 and nothing is wrong. Do not run it as a post-hoc gate.
//
// CANNOT REACH: the fence is not EXERCISED by the real run (no read tool is advertised, so nothing is
// ever denied at run time) — the run-time proof is `--probe-fence` on run 2's shape, receipted under
// .claude/reports/discovery-pre-grill-audit-run-292/; and whether the model's verdicts are RIGHT, which
// is the report's human read against the rubric (T10). Six green here is neither of those.
//
// Zero-dependency Node ESM. Run from the repo root: node tooling/run-2-ready.mjs [--model claude-opus-5]

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { MODULES, OPENING_SET, selectDepth } from '../discovery/bank.mjs';
import { allowSetFor, allowsPath, BANK_PATH, declareFacets } from '../portal/lib/discovery.mjs';
import { MODELS, MODEL_SETTABLE, resolvePosture } from '../portal/lib/discovery-postures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'partner-audit-2';
const PACKAGE = path.join(ROOT, 'discovery', SLUG);
const FIXTURE = path.join(ROOT, 'docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md');
// The md5 MVP 13 prints and case 28.9 gates; over the BYTES (24,560), not the characters (24,355).
const FIXTURE_MD5 = 'ab6eb0ee6cdd3b7802ecfcbe90db2377';
const RUBRIC = path.join(ROOT, 'docs/epics/fixtures/discovery-partner.run-2-rubric.md');
// The scoring key is IN-REPO this time: the eight findings are printed in the PRD, one directory above
// the fixture — which is why the fixtures DIRECTORY is denied too, not only the two files.
const KEY = path.join(ROOT, 'docs/epics/discovery-partner.prd.md');
const TRANSPORT = path.join(ROOT, 'portal/lib/discovery-transport.mjs');
// ONE record of the composed width: the assertion and its failure message read the same constant.
const QUESTIONS = 23;
const POSTURE = 'grill';
const DEFAULT_MODEL = 'claude-opus-5';

const rel = (p) => path.relative(ROOT, p) || p;

// COMMITTED, not merely present and not merely staged, AND the file on disk is that commit's content.
// Git history is the receipt that the rubric predates the run — the report's own check is
// `git log -1 --format=%cI <rubric>` against run.json's startedAt — and `git ls-files --error-unmatch`
// is satisfied by `git add` alone, which has no history at all. `git log -1 -- <path>` answers the date
// of the last commit that TOUCHED the path and says nothing about whether the working tree still holds
// that content, so tracked() is the cheap first half, committedAt() carries the claim, and matchesHead()
// makes the printed timestamp describe the file that is actually on disk (PR #405 review, F1).
//
// committedAt() returns BOTH dates: %cI is rewritten by a rebase merge and %aI survives one, so check 6
// prints the pair and the report quotes whichever the merge button left intact.
function tracked(p) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', p], { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function committedAt(p) {
  const out = execFileSync('git', ['log', '--format=%cI %aI', '-1', '--', p], { cwd: ROOT, encoding: 'utf8' }).trim();
  const [committed, authored] = (out.split('\n')[0] || '').split(' ');
  return committed ? { committed, authored } : null;
}

function matchesHead(p) {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', p], { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function runTwoReady({ model = DEFAULT_MODEL } = {}) {
  const fail = (n, msg) => { throw new Error(`check ${n} — ${msg}`); };

  // 1 - the frozen fixture, byte for byte. Case 28.9 gates the same md5 in CI; this re-checks it on the
  // disk the session will read from, at the moment the sitting is about to start.
  if (!existsSync(FIXTURE)) fail(1, `the frozen fixture is missing: ${rel(FIXTURE)} (precondition 1)`);
  const md5 = createHash('md5').update(readFileSync(FIXTURE)).digest('hex');
  if (md5 !== FIXTURE_MD5) fail(1, `${rel(FIXTURE)} hashes to ${md5}, not the frozen ${FIXTURE_MD5} MVP 13 prints — the fixture has moved and the run would audit a different document (precondition 1)`);

  // 2 - the rubric, committed before the first turn. Scoring after the fact against a rubric written
  // after the fact is the inflation run 1's seal guarded against.
  if (!existsSync(RUBRIC)) fail(2, `the scoring rubric is missing: ${rel(RUBRIC)}. Write it from MVP 13's eight findings — passage, FOUND clause, PARTIAL clause, reachable — and commit it before the first turn (the pre-registration)`);
  if (!tracked(RUBRIC)) fail(2, `${rel(RUBRIC)} exists but is NOT tracked — commit it, or git history cannot show it predates the run (the pre-registration)`);
  if (!readFileSync(RUBRIC, 'utf8').trim()) fail(2, `${rel(RUBRIC)} is empty (the pre-registration)`);
  if (!committedAt(RUBRIC)) fail(2, `${rel(RUBRIC)} is staged but not COMMITTED — git add leaves no history, and history is the receipt that the score was defined before the run (the pre-registration)`);
  if (!matchesHead(RUBRIC)) fail(2, `${rel(RUBRIC)} differs from its last commit — commit the change, or the printed timestamp describes a different file (the pre-registration)`);

  // 3 - the REAL fence, over the allow-set the run will actually carry (reads: [] — see the header),
  // and the by-construction half: the transport advertises no built-in tool.
  const set = allowSetFor({ root: PACKAGE, reads: [] });
  const denies = [
    [KEY, 'the scoring key — MVP 13 prints the eight findings one directory above the fixture (AC #2)'],
    [path.dirname(FIXTURE), 'the fixtures DIRECTORY — the rubric sits beside the fixture and would be readable through a directory allow'],
    [FIXTURE, 'the fixture ITSELF — the document rides in the system prompt (#286); a read allow would put it on the wire twice and change the audit surface'],
  ];
  for (const [p, why] of denies) {
    const d = allowsPath(set, p);
    if (d.allow !== false) fail(3, `the read fence ALLOWS ${rel(p)} — ${why}. allowSetFor admits the run root and everything under it, plus what reads names; the run names nothing (precondition 2). Reason: ${d.reason}`);
  }
  for (const [p, what] of [[PACKAGE, "the run's own package"], [BANK_PATH, 'the question bank']]) {
    const d = allowsPath(set, p);
    if (d.allow !== true) fail(3, `the read fence DENIES ${rel(p)} — ${what} must be readable, or check 3 would pass on a fence that denies everything (precondition 2). Reason: ${d.reason}`);
  }
  if (!/^const MAIN_TOOLS = Object\.freeze\(\[\]\);/m.test(readFileSync(TRANSPORT, 'utf8'))) fail(3, `${rel(TRANSPORT)} no longer pins MAIN_TOOLS = Object.freeze([]) — the real audit run would advertise a built-in tool, and the fence would be exercised by a run this gate promised it is not (precondition 2, the by-construction half; case 34 pins the same regex)`);

  // 4 - the composition the sitting will sit: 23, the twelve first, the module's seven present.
  const facets = declareFacets({ hasModel: true });
  const selected = selectDepth('full-discovery', facets);
  if (selected.length !== QUESTIONS) fail(4, `full discovery with hasModel composes ${selected.length} questions, not ${QUESTIONS} — the run's shape has moved and the plan's arithmetic (12 + 7 + 4) no longer holds`);
  const head = selected.slice(0, OPENING_SET.length).map((q) => q.id);
  if (head.join(' ') !== [...OPENING_SET].join(' ')) fail(4, `the twelve-question opening set is not the head of the composed ${QUESTIONS} — got ${head.join(', ')}. AC #3's coverage reads over OPENING_SET and would be measuring a different set`);
  const ids = new Set(selected.map((q) => q.id));
  const absent = MODULES.hasModel.ids.filter((id) => !ids.has(id));
  if (absent.length) fail(4, `the AI-interaction module does not fire whole — ${absent.join(', ')} missing from the composed ${QUESTIONS} (AC #3)`);

  // 5 - the sitting has not already started. INVERTS after the run: see the header.
  const run = path.join(PACKAGE, 'run.json');
  if (existsSync(run)) fail(5, `${rel(run)} already exists — the sitting has started. THIS IS A PRE-RUN GATE and check 5 is expected to be red once the run exists; if you are reading this after the session, that is the script working, not a failure`);

  // 6 - the model, and the stamp every turn will carry.
  if (!MODELS.includes(model)) fail(6, `--model ${model} is not one of ${MODELS.join(' · ')} — resolvePosture refuses it by name and the session would not open`);
  if (!MODEL_SETTABLE.includes(POSTURE)) fail(6, `${POSTURE} is no longer MODEL_SETTABLE (${MODEL_SETTABLE.join(' · ') || 'nothing is'}) — the run cannot choose its model, and MVP 13's "this run chooses it" has no mechanism`);
  const { fingerprint } = resolvePosture({ posture: POSTURE, model });

  const at = committedAt(RUBRIC);
  return { checks: 6, questions: selected.length, model, fingerprint, rubricCommittedAt: at.committed, rubricAuthoredAt: at.authored };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--model');
  const model = i === -1 ? DEFAULT_MODEL : process.argv[i + 1];
  try {
    const r = runTwoReady({ model });
    console.log(`run-2 ready ✓  ${r.checks} checks · hasModel composes ${r.questions} · model ${r.model} → ${r.fingerprint} · rubric committed ${r.rubricCommittedAt} · authored ${r.rubricAuthoredAt}`);
  } catch (e) {
    console.error(`run-2 ✗  ${e.message}`);
    process.exit(1);
  }
}
