#!/usr/bin/env node
// The pre-run gate for run 1 — Faster Payment (#291, epic #279; intent at
// docs/epics/discovery-partner.prd.md §MVP 12). The epic calls run 1's preconditions a one-way door:
// "out of order and the metric is unrecoverable". This is the one command that says the sitting may
// start, and it asserts all four mechanically rather than by reading a checklist.
//
// Six checks, in the epic's own order:
//   1  the one-sentence input exists and is COMMITTED                        (precondition 1)
//   2  the sealed pre-registration exists, is COMMITTED and is non-empty      (precondition 2)
//   3  over the REAL run-1 allow-set, both of those and the scoring key are DENIED, while the package
//      and the bank are ALLOWED                                             (precondition 3)
//   4  the regulated preset composes 22 at full discovery, opening set first (precondition 4)
//   5  discovery/faster-payment/run.json does NOT exist — the sitting has not already started
//   6  the sealed file's commit timestamp, printed so the report can quote it beside startedAt
//
// Check 3 is the one that cannot be eyeballed: allowSetFor admits the run root AND EVERYTHING UNDER
// IT, so a sealed file committed inside discovery/faster-payment/ would be readable and precondition
// 3 would be void by construction rather than failed by name. That is what this check exists for.
//
// THIS IS A PRE-RUN GATE. Check 5 inverts the moment the session opens: once the run exists, this
// script is expected to be red on check 5 and nothing is wrong. Do not run it as a post-hoc gate.
//
// Zero-dependency Node ESM. Run from the repo root: node tooling/run-1-ready.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { OPENING_SET, PRESETS, selectDepth } from '../discovery/bank.mjs';
import { allowSetFor, allowsPath, BANK_PATH } from '../portal/lib/discovery.mjs';
import { JOBS_DIR } from '../portal/lib/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'faster-payment';
const PACKAGE = path.join(ROOT, 'discovery', SLUG);
const INPUT = path.join(ROOT, 'docs/epics/fixtures/faster-payment-input.md');
const SEALED = path.join(ROOT, 'docs/epics/fixtures/faster-payment-pre-registration.sealed.md');
const KEY = path.join(JOBS_DIR, '_portfolio', 'decisions.json');
// ONE record of the composed width: the assertion and its failure message read the same constant, so a
// message cannot go on naming 22 after the assertion has moved (the rot 30.46 exists to end).
const QUESTIONS = 22;

const rel = (p) => path.relative(ROOT, p) || p;

// COMMITTED, not merely present and not merely staged. Git history is the receipt that a file
// predates the run — T6's own check is `git log -1 --format=%cI <sealed>` against run.json's startedAt
// — and `git ls-files --error-unmatch` is satisfied by `git add` alone, which has no history at all.
// So tracked() is the cheap first half and committedAt() is the half that carries the claim.
function tracked(p) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', p], { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function committedAt(p) {
  const out = execFileSync('git', ['log', '--format=%cI', '-1', '--', p], { cwd: ROOT, encoding: 'utf8' }).trim();
  return out.split('\n')[0] || null;
}

export function runOneReady() {
  const fail = (n, msg) => { throw new Error(`check ${n} — ${msg}`); };

  // 1 - the input, committed before anything else.
  if (!existsSync(INPUT)) fail(1, `the one-sentence input is missing: ${rel(INPUT)} (precondition 1)`);
  if (!tracked(INPUT)) fail(1, `${rel(INPUT)} exists but is NOT tracked — commit it, or git history cannot show it predates the run (precondition 1)`);
  if (!committedAt(INPUT)) fail(1, `${rel(INPUT)} is staged but not COMMITTED — git add leaves no history, and history is the receipt (precondition 1)`);

  // 2 - the sealed pre-registration. The owner's own hand; an agent writing it voids AC #3.
  if (!existsSync(SEALED)) fail(2, `the sealed pre-registration is missing: ${rel(SEALED)}. The OWNER writes it — their unaided parent for each of m-005 to m-008 — and commits it before the first turn (precondition 2)`);
  if (!tracked(SEALED)) fail(2, `${rel(SEALED)} exists but is NOT tracked — commit it before the sitting, or the marginal-reach reading has no receipt that it predates the run (precondition 2)`);
  if (statSync(SEALED).size === 0 || !readFileSync(SEALED, 'utf8').trim()) fail(2, `${rel(SEALED)} is empty (precondition 2)`);
  if (!committedAt(SEALED)) fail(2, `${rel(SEALED)} is staged but not COMMITTED — the marginal-reach reading rests on git showing this file predates run.json's startedAt, and a staged file has no timestamp to compare (precondition 2)`);

  // 3 - the REAL fence, over the allow-set the run will actually carry. A blank-idea session takes no
  // document, so reads is [] and the set is exactly [root, bank].
  const set = allowSetFor({ root: PACKAGE, reads: [] });
  const denies = [
    [SEALED, 'the sealed pre-registration — reading it voids the marginal-reach reading (AC #3)'],
    [INPUT, "the run's own committed input — the operator pastes the sentence in; the agent never reads the framing around it"],
    [KEY, 'the scoring key m-005 to m-008 (AC #2)'],
  ];
  for (const [p, why] of denies) {
    const d = allowsPath(set, p);
    if (d.allow !== false) fail(3, `the read fence ALLOWS ${rel(p)} — ${why}. allowSetFor admits the run root and everything under it, so the file must sit outside ${rel(PACKAGE)} (precondition 3). Reason: ${d.reason}`);
  }
  for (const [p, what] of [[PACKAGE, "the run's own package"], [BANK_PATH, 'the question bank']]) {
    const d = allowsPath(set, p);
    if (d.allow !== true) fail(3, `the read fence DENIES ${rel(p)} — ${what} must be readable, or check 3 would pass on a fence that denies everything (precondition 3). Reason: ${d.reason}`);
  }

  // 4 - the composition the sitting will sit. 22, opening set first.
  const preset = PRESETS.find((p) => p.id === 'regulated');
  if (!preset) fail(4, `the bank has no "regulated" preset — PRESETS holds ${PRESETS.map((p) => p.id).join(', ')} (precondition 4)`);
  const selected = selectDepth('full-discovery', preset.facets);
  if (selected.length !== QUESTIONS) fail(4, `the regulated preset composes ${selected.length} questions at full discovery, not ${QUESTIONS} — the run's shape has moved and the plan's arithmetic (12 + 6 + 4) no longer holds (precondition 4)`);
  const head = selected.slice(0, OPENING_SET.length).map((q) => q.id);
  if (head.join(' ') !== [...OPENING_SET].join(' ')) fail(4, `the twelve-question opening set is not the head of the composed 22 — got ${head.join(', ')} (precondition 4). AC #4 reads coverage over OPENING_SET and would be measuring a different set`);

  // 5 - the sitting has not already started. INVERTS after the run: see the header.
  const run = path.join(PACKAGE, 'run.json');
  if (existsSync(run)) fail(5, `${rel(run)} already exists — the sitting has started. THIS IS A PRE-RUN GATE and check 5 is expected to be red once the run exists; if you are reading this after the session, that is the script working, not a failure`);

  return { checks: 6, sealedCommittedAt: committedAt(SEALED), questions: selected.length, preset: preset.id };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const r = runOneReady();
    console.log(`run-1 ready ✓  ${r.checks} checks · ${r.preset} preset composes ${r.questions} · sealed committed ${r.sealedCommittedAt}`);
  } catch (e) {
    console.error(`run-1 ✗  ${e.message}`);
    process.exit(1);
  }
}
