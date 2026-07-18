// tooling/curate-trace.mjs — deterministic trace curation (epic #1, ticket #5).
// Honesty contract (hard): curation is SELECTION + TRUNCATION only — it never rewrites
// step text. Every rule is a named constant and every count is recorded in the curated
// meta, so raw + curated can be diffed and curation is fully auditable. The recorder
// (portal/lib/trace-recorder.mjs) is the only producer of trace content; this only shortens.
// Format: traces/README.md.  Standalone:  node tooling/curate-trace.mjs <raw.jsonl> <out.jsonl>

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const CURATED_LABEL = 'Real run, curated for length'; // exact honesty wording (architecture §Honesty, surface #2)
const INPUT_CAP = 700;
const RESPONSE_CAP = 400;
// Marker-only line — same "alone on its own line" family the recorder scans with.
const MARKER_LINE = /^[ \t]*\[\[piv:(plan|gate|implement|validate)\]\][ \t]*$/;
const KEEP_WHOLE = new Set(['file_path', 'command']); // identifying keys are never truncated
const RULES = ['strip-piv-markers', 'truncate-input-700', 'truncate-response-400', 'drop-empty-text'];

const clip = (s, n) => (s.length > n ? s.slice(0, n) : s);

// strip-piv-markers: drop marker-only lines (the phase field already carries the tag).
const stripMarkers = (text) => text.split('\n').filter((l) => !MARKER_LINE.test(l)).join('\n').trim();

// truncate-input-700: cap every string value except the identifying keys; the object
// stays valid JSON (truncation only — no key is removed, no value is rewritten).
function truncateInput(input) {
  if (!input || typeof input !== 'object') return input;
  const out = Array.isArray(input) ? [] : {};
  for (const [k, v] of Object.entries(input))
    out[k] = KEEP_WHOLE.has(k) || typeof v !== 'string' ? v : clip(v, INPUT_CAP);
  return out;
}

export function curateTrace(rawPath, outPath) {
  const rows = readFileSync(rawPath, 'utf8').split('\n').filter((l) => l.trim())
    .map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${rawPath}:${i + 1}: not JSON — ${e.message}`); } });
  if (!rows.length) throw new Error(`${rawPath}: empty file`);

  const meta = rows[0];
  if (meta.type !== 'meta') throw new Error(`${rawPath}:1: first line must be "meta"`);
  const result = rows[rows.length - 1];
  if (result.type !== 'result') throw new Error(`${rawPath}:${rows.length}: last line must be "result"`);

  let dropped = 0;
  const out = [{
    ...meta,
    label: CURATED_LABEL,
    curation: { from: basename(rawPath), rules: RULES, droppedSteps: 0, inputTruncatedAt: INPUT_CAP, responseTruncatedAt: RESPONSE_CAP },
    numTurns: result.numTurns, durationMs: result.durationMs, totalCostUsd: result.totalCostUsd,
  }];

  for (let i = 1; i < rows.length - 1; i++) {
    const step = rows[i];
    if (step.type !== 'step') throw new Error(`${rawPath}:${i + 1}: expected a "step"`);
    if (step.kind === 'text') {
      const text = stripMarkers(step.text || '');
      if (!text) { dropped++; continue; } // drop-empty-text: the step was only its marker
      out.push({ ...step, text });
    } else {
      // Failed steps (ok:false) are kept — a failed check that got fixed is the story.
      const response = typeof step.response === 'string' ? clip(step.response, RESPONSE_CAP) : step.response;
      const responseTruncated = Boolean(step.responseTruncated) || (typeof step.response === 'string' && step.response.length > RESPONSE_CAP);
      out.push({ ...step, input: truncateInput(step.input), response, responseTruncated });
    }
  }

  out.push(result); // the result line stays (validator: last line is result)
  out[0].curation.droppedSteps = dropped;

  writeFileSync(outPath, out.map((o) => JSON.stringify(o)).join('\n') + '\n');
  return { rawSteps: rows.length - 2, outSteps: out.length - 2, dropped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [rawPath, outPath] = process.argv.slice(2);
  if (!rawPath || !outPath) { console.error('usage: node tooling/curate-trace.mjs <raw.jsonl> <out.jsonl>'); process.exit(1); }
  try {
    const r = curateTrace(rawPath, outPath);
    const slug = basename(rawPath).replace(/\.raw\.jsonl$/, '');
    console.log(`curated ${slug.padEnd(12)} ✓  ${r.rawSteps} → ${r.outSteps} steps · ${r.dropped} dropped (empty text) · label set`);
  } catch (e) {
    console.error(`curate ✗  ${e.message}`);
    process.exit(1);
  }
}
