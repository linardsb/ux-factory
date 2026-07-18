// tooling/validate-trace.mjs — the Trace format's drift guard (epic #1, ticket #5).
// Enforces traces/README.md: every line parses; PIV phases occur in order (null phase =
// fail); every successful Write/Edit pairs an artifact that exists in the repo; the honesty
// label is present; curated files carry a curation record and no [[piv: remnant. Candidate
// CI gate for #9. No schema library (project rule): hand checks, every throw names
// file + line + field.  Standalone:  node tooling/validate-trace.mjs [file…]
// (default: every traces/*.jsonl) — one ✓ line per file, exit 1 on drift.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRACES = join(ROOT, 'traces');
const PHASES = ['plan', 'gate', 'implement', 'validate'];
const PIV_REMNANT = /\[\[piv:/;
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

export function validateTrace(file) {
  const rel = file.startsWith(ROOT + '/') ? file.slice(ROOT.length + 1) : file;
  const rows = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim())
    .map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${rel}:${i + 1}: not JSON — ${e.message}`); } });
  if (rows.length < 3) throw new Error(`${rel}: a trace needs at least meta + one step + result`);

  const meta = rows[0];
  if (meta.type !== 'meta') throw new Error(`${rel}:1: first line must be type "meta"`);
  if (meta.version !== 1) throw new Error(`${rel}:1: meta "version" must be 1`);
  for (const k of ['slug', 'task', 'model', 'sessionId'])
    if (!nonEmpty(meta[k])) throw new Error(`${rel}:1: meta "${k}" is missing or empty`);
  if (!/real run/i.test(meta.label || ''))
    throw new Error(`${rel}:1: meta "label" ("${meta.label}") must state it is a real run (honesty surface #2)`);
  const curated = Boolean(meta.curation);
  if (curated && (!Array.isArray(meta.curation.rules) || !meta.curation.rules.length))
    throw new Error(`${rel}:1: curated meta must list ≥1 curation rule`);
  // A curated trace must derive from ITS committed raw sibling — same recorded session —
  // or the "diff raw vs curated" honesty promise silently breaks (e.g. a --force re-run
  // that was never re-curated leaves run #2's raw beside run #1's curated; both would
  // pass file-local checks).
  if (curated) {
    const rawSibling = join(dirname(file), `${meta.slug}.raw.jsonl`);
    if (!existsSync(rawSibling))
      throw new Error(`${rel}:1: curated trace has no raw sibling "${meta.slug}.raw.jsonl" — raw + curated are committed as a pair`);
    let rawMeta;
    try { rawMeta = JSON.parse(readFileSync(rawSibling, 'utf8').split('\n').find((l) => l.trim())); }
    catch (e) { throw new Error(`${rel}:1: raw sibling "${meta.slug}.raw.jsonl" meta line does not parse — ${e.message}`); }
    if (rawMeta.sessionId !== meta.sessionId)
      throw new Error(`${rel}:1: meta sessionId "${meta.sessionId}" does not match raw sibling's "${rawMeta.sessionId}" — curated must derive from the committed raw run`);
  }

  const result = rows[rows.length - 1];
  if (result.type !== 'result') throw new Error(`${rel}:${rows.length}: last line must be type "result"`);

  let lastSeq = -Infinity;
  const seen = [];
  let artifacts = 0;
  for (let i = 1; i < rows.length - 1; i++) {
    const s = rows[i];
    const ln = i + 1;
    if (s.type !== 'step') throw new Error(`${rel}:${ln}: expected type "step"`);
    if (typeof s.seq !== 'number' || s.seq <= lastSeq) throw new Error(`${rel}:${ln}: step "seq" (${s.seq}) must strictly increase`);
    lastSeq = s.seq;
    if (!PHASES.includes(s.phase))
      throw new Error(`${rel}:${ln}: step "phase" (${s.phase}) is not one of ${PHASES.join('|')} — a null phase means the step preceded the first [[piv:plan]] marker`);
    if (!seen.includes(s.phase)) seen.push(s.phase);
    if (s.kind === 'tool' && s.ok && (s.tool === 'Write' || s.tool === 'Edit')) {
      const p = s.artifact?.path;
      if (!nonEmpty(p)) throw new Error(`${rel}:${ln}: successful ${s.tool} step must carry "artifact.path" (step↔artifact pairing)`);
      if (isAbsolute(p)) throw new Error(`${rel}:${ln}: artifact.path "${p}" must be repo-relative, not absolute`);
      if (!resolve(ROOT, p).startsWith(ROOT + sep))
        throw new Error(`${rel}:${ln}: artifact.path "${p}" escapes the repo root — ".." segments are not allowed`);
      if (!existsSync(join(ROOT, p))) throw new Error(`${rel}:${ln}: artifact.path "${p}" does not exist in the repo`);
    }
    if (s.artifact) artifacts++;
    if (curated && s.kind === 'text' && PIV_REMNANT.test(s.text || ''))
      throw new Error(`${rel}:${ln}: curated trace still contains a "[[piv:" remnant — curation must strip marker lines`);
  }

  if (seen.join('→') !== PHASES.join('→'))
    throw new Error(`${rel}: phases first appear as ${seen.join('→') || '(none)'}, must be exactly ${PHASES.join('→')} (all four, in order)`);

  return { rel, steps: rows.length - 2, phases: seen.length, artifacts, curated };
}

function targets(args) {
  if (args.length) return args.map((a) => (isAbsolute(a) ? a : resolve(process.cwd(), a)));
  if (!existsSync(TRACES)) return [];
  return readdirSync(TRACES).filter((f) => f.endsWith('.jsonl')).sort().map((f) => join(TRACES, f));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = targets(process.argv.slice(2));
  if (!files.length) { console.error('trace ✗  no trace files to validate (traces/*.jsonl)'); process.exit(1); }
  try {
    for (const f of files) {
      const r = validateTrace(f);
      const name = r.rel.replace(/^traces\//, '').replace(/\.jsonl$/, '');
      console.log(`trace ${name.padEnd(18)} ✓  ${r.steps} steps · ${r.phases} phases · ${r.artifacts} artifact${r.artifacts === 1 ? '' : 's'} · ${r.curated ? 'curated' : 'raw'}`);
    }
  } catch (e) {
    console.error(`trace ✗  ${e.message}`);
    process.exit(1);
  }
}
