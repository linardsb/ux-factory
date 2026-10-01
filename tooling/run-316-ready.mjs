#!/usr/bin/env node
// The pre-sitting gate for Run 1 on the canvas — Faster Payment built from its PRD (#316, epic #295; plan at
// .claude/plans/faster-payment-build-run-316.md, T9/T11). The one command that says the owner's sitting may start.
// It reads the TREE, never the network: whether #318, #319 and #320 have landed is read from the code they add.
//
// Twelve checks:
//   1  discovery/faster-payment/prd.md is tracked and equal to HEAD — the brief every compose turn reads
//   2  #318 landed: system/canvas-ops.mjs exports staleFrames                      (D2, stale frames)
//   3  #319 landed: portal/lib/inbox.mjs exists                                    (D1, the inbox)
//   4  #320 landed: PARAMS["screen.compose"] carries a param beyond Segment A's five (D5, forks) — T10 pins its name
//   5  build/ops.jsonl is exactly the six-line spine and verifyBuild passes          (PRE-RUN: inverts, see below)
//   6  the tree is clean by ratify's own CLEAN_GUARD, both argv arrays printing nothing
//   7  brilliant-mcp.mjs's TOOLS are exactly the four read tools
//   8  no ANTHROPIC_* or CLAUDE_CODE_USE_* name in the env or portal/.env, and subscriptionEnv drops one
//   9  node_modules in portal, tooling/icons, tooling/visual-regression and tooling/style-dictionary (ratify's chain
//      runs gen-handoff → Style Dictionary and build-checks → 41.7 icons; both failed without them, observed)
//  10  the zero-token preflight exits 0 with "preflight ✓ 8/8"
//  11  build-checks prints compose session ✓, import run ✓ and build ✓
//  12  this worktree sits under /Users, not /private/tmp — the sitting's VR update needs Docker file sharing
//
// EVERY CHECK RUNS AND EVERY ✗ PRINTS, then exit 1 — unlike run-1-ready.mjs, whose first failure throws. Checks 2–4
// are red by design until #318–#320 land, and a first-failure gate would leave 5–12 undrivable until then.
//
// THIS IS A PRE-RUN GATE. Check 5 inverts the moment the sitting appends line 7: after that, red on check 5 is the
// script working, not a failure. Do not run it as a post-hoc gate.
//
// CANNOT REACH: whether the imported Brilliant element was drawn by the owner not for a test; whether the real SDK
// honours the fence (only the fake agent and the preflight are provable at $0); who writes the briefs and verdicts.
//
// Zero-dependency Node ESM. Run from the repo root: node tooling/run-316-ready.mjs

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as canvasOps from '../system/canvas-ops.mjs';
import { loadBuild, SPINE_LENGTH, verifyBuild } from '../portal/lib/canvas-store.mjs';
import { subscriptionEnv } from '../portal/lib/canvas-session.mjs';
import { TOOLS } from '../portal/lib/brilliant-mcp.mjs';
import { CLEAN_GUARD } from '../portal/lib/ratify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = path.join(ROOT, 'discovery', 'faster-payment');
const PRD = path.join(PACKAGE, 'prd.md');
const SEGMENT_A_PARAMS = ['screenId', 'why', 'composition', 'decisionRefs', 'states'];
const READ_TOOLS = ['init', 'get_selection', 'lookup', 'export'];
const MODULE_DIRS = ['portal', 'tooling/icons', 'tooling/visual-regression', 'tooling/style-dictionary'];
const BILLING_RE = /^(ANTHROPIC_|CLAUDE_CODE_USE_)/;

const rel = (p) => path.relative(ROOT, p) || p;
const git = (argv) => execFileSync('git', argv, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const quiet = (argv) => { try { git(argv); return true; } catch { return false; } };

export function runReady() {
  const fails = [];
  const check = (n, fn) => {
    try { const msg = fn(); if (msg) fails.push(`check ${n} — ${msg}`); }
    catch (e) { fails.push(`check ${n} — threw: ${e.message}`); }
  };

  check(1, () => {
    if (!existsSync(PRD)) return `${rel(PRD)} is missing — the compose turns read it`;
    if (!quiet(['ls-files', '--error-unmatch', PRD])) return `${rel(PRD)} is not tracked`;
    if (!quiet(['diff', '--quiet', 'HEAD', '--', PRD])) return `${rel(PRD)} differs from HEAD — the brief the sitting reads must be the committed one`;
    return null;
  });
  check(2, () => (typeof canvasOps.staleFrames === 'function' ? null : '#318 has not landed: system/canvas-ops.mjs exports no staleFrames (D2)'));
  check(3, () => (existsSync(path.join(ROOT, 'portal/lib/inbox.mjs')) ? null : '#319 has not landed: portal/lib/inbox.mjs does not exist (D1)'));
  check(4, () => {
    const extra = (canvasOps.PARAMS['screen.compose'] ?? []).filter((k) => !SEGMENT_A_PARAMS.includes(k));
    return extra.length ? null : `#320 has not landed: PARAMS["screen.compose"] is ${JSON.stringify(canvasOps.PARAMS['screen.compose'])}, with no alternatives param beyond Segment A's five (D5)`;
  });
  check(5, () => {
    const pkg = loadBuild(path.join(PACKAGE, 'build'));
    if (!pkg) return `${rel(PACKAGE)}/build does not load`;
    if (pkg.ops.length !== SPINE_LENGTH) return `build/ops.jsonl holds ${pkg.ops.length} lines, not the ${SPINE_LENGTH}-line spine — THIS IS A PRE-RUN GATE; once the sitting has appended, red here is the script working`;
    const flaws = verifyBuild(pkg);
    return flaws.length ? `verifyBuild over the spine: ${flaws.join(' | ')}` : null;
  });
  check(6, () => {
    const dirty = CLEAN_GUARD.map((argv) => git(argv).trim()).filter(Boolean);
    return dirty.length ? `the tree is not clean by ratify's CLEAN_GUARD — ratify would refuse mid-sitting:\n${dirty.join('\n')}` : null;
  });
  check(7, () => (JSON.stringify(TOOLS) === JSON.stringify(READ_TOOLS) ? null : `brilliant-mcp.mjs TOOLS is ${JSON.stringify(TOOLS)}, not the four read tools ${JSON.stringify(READ_TOOLS)}`));
  check(8, () => {
    const inEnv = Object.keys(process.env).filter((k) => BILLING_RE.test(k));
    const envFile = path.join(ROOT, 'portal/.env');
    const inFile = existsSync(envFile)
      ? readFileSync(envFile, 'utf8').split('\n').map((l) => l.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=/)?.[1]).filter((k) => k && BILLING_RE.test(k))
      : [];
    if (inEnv.length || inFile.length) return `billing redirects present — env ${JSON.stringify(inEnv)}, portal/.env ${JSON.stringify(inFile)}; the sitting runs on the subscription (unset them)`;
    return Object.hasOwn(subscriptionEnv({ ANTHROPIC_API_KEY: 'x' }), 'ANTHROPIC_API_KEY') ? 'subscriptionEnv({ANTHROPIC_API_KEY}) kept the key' : null;
  });
  check(9, () => {
    const missing = MODULE_DIRS.filter((d) => !existsSync(path.join(ROOT, d, 'node_modules')));
    return missing.length ? `no node_modules in ${missing.join(', ')} — run npm ci there (ratify's chain needs them)` : null;
  });
  check(10, () => {
    const r = spawnSync(process.execPath, ['lib/canvas-transport.mjs', '--preflight'], { cwd: path.join(ROOT, 'portal'), encoding: 'utf8' });
    return r.status === 0 && /preflight ✓ 8\/8/.test(r.stdout) ? null : `the preflight exited ${r.status}: ${(r.stdout + r.stderr).trim().split('\n').slice(-2).join(' / ')}`;
  });
  check(11, () => {
    const r = spawnSync(process.execPath, ['tooling/build-checks.mjs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const out = `${r.stdout}\n${r.stderr}`;
    const want = [/^build compose session ✓/m, /^build import run +✓/m, /^build ✓/m];
    return want.every((re) => re.test(out)) ? null : `build-checks exited ${r.status}: ${out.trim().split('\n').filter((l) => /✗|^\s+· /.test(l)).slice(0, 4).join(' / ')}`;
  });
  check(12, () => {
    const real = realpathSync(ROOT);
    return real.startsWith('/Users/') ? null : `this worktree is at ${real} — the sitting's VR update:docker needs a tree under /Users (Docker file sharing)`;
  });
  return { checks: 12, fails };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { checks, fails } = runReady();
  if (!fails.length) {
    console.log(`run-316 ready ✓  ${checks} checks`);
  } else {
    for (const f of fails) console.error(`run-316 ✗  ${f}`);
    console.error(`run-316 ✗  ${fails.length} of ${checks} checks red — do not open the canvas`);
    process.exit(1);
  }
}
