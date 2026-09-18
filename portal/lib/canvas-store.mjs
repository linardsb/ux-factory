// portal/lib/canvas-store.mjs — hand-written canon (this repo; not generated). The build package's
// FILE IO, and only that (epic #295 ticket #302; .claude/plans/
// canvas-swap-grid-retired-free-substrate-302.md, Task 6.1).
//
// ONE CONCERN PER MODULE, the portal/lib/ rule: this reads and writes two files and knows nothing
// about what is in them. system/canvas-ops.mjs owns the op grammar and the applier; this owns where
// the bytes go. The split is what lets build-checks drive the applier with no filesystem and drive
// the round trip with a scratch directory.
//
// NO ROUTE IN THIS PR. portal/server.mjs gains nothing — that is #306's live page. Today the only
// callers are tooling/build-checks.mjs's group 36 and the one-off script that wrote the spine.
//
// NO SDK, AND NOTHING THAT COULD REACH ONE. It imports node:fs and node:path and nothing else,
// which is what lets group 36 import it in CI — where portal/node_modules does not exist at all.
// That absence IS the SDK-free proof, and it is why this module must never grow an import of a
// portal sibling that has one.
//
// THE TWO FILES ARE DIFFERENT KINDS AND ARE WRITTEN DIFFERENTLY:
//
//   ops.jsonl    APPEND-ONLY, one op per line. portal/lib/trace-recorder.mjs's ledger idiom —
//                mkdir, truncate to empty, then append a line per record — because a ledger that is
//                rewritten whole is a ledger a crash can lose the middle of.
//   canvas.json  A WHOLE-FILE REWRITE, the generator idiom, because the arrangement is derived: it
//                is rewritten from the document on every save and never carries a fact the ops do
//                not, so there is nothing in it to append to.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const OPS_FILE = "ops.jsonl";
export const CANVAS_FILE = "canvas.json";

// saveBuild(root, canvas, opLines) → { root, ops, canvas } — the two paths written.
//
// `root` is the package's build/ directory, created if absent. `opLines` are ALREADY-SHAPED records
// ({seq, at, source, op, params, status}); this does not shape them, because shaping them would mean
// knowing the op grammar, which is the other module's job.
export function saveBuild(root, canvas, opLines) {
  if (typeof root !== "string" || !root) throw new Error("saveBuild: root must be a directory path");
  if (!canvas || typeof canvas !== "object") throw new Error(`saveBuild: ${root} — canvas must be an object`);
  if (!Array.isArray(opLines)) throw new Error(`saveBuild: ${root} — opLines must be an array`);
  mkdirSync(root, { recursive: true });
  const ops = join(root, OPS_FILE);
  const canvasPath = join(root, CANVAS_FILE);
  // Truncate first, then append per line — trace-recorder.mjs:65-82, verbatim in shape.
  writeFileSync(ops, "");
  for (const line of opLines) appendFileSync(ops, `${JSON.stringify(line)}\n`);
  // Two-space indent and a trailing newline: the generator idiom every committed JSON artifact in
  // this repo uses, so a diff of a regenerated package is readable rather than one long line.
  writeFileSync(canvasPath, `${JSON.stringify(canvas, null, 2)}\n`);
  return { root, ops, canvas: canvasPath };
}

// loadBuild(root) → { ops, canvas } — the parsed pair, or null when the package has no build half.
//
// NULL RATHER THAN A THROW for an absent package, because most discovery packages have no build/
// and asking is a legitimate question. A package that HAS one and is malformed throws naming the
// file and the line, because at that point something wrote it wrong and silence is worse.
//
// THE LINE NUMBER IS THE FILE'S, 1-BASED, not the array index. discovery/proposals.mjs pays for
// this distinction in its own reader: a refusal that prints an index names nothing a person can
// open the file and find.
export function loadBuild(root) {
  if (typeof root !== "string" || !root) throw new Error("loadBuild: root must be a directory path");
  const opsPath = join(root, OPS_FILE);
  const canvasPath = join(root, CANVAS_FILE);
  if (!existsSync(opsPath) && !existsSync(canvasPath)) return null;
  const ops = [];
  if (existsSync(opsPath)) {
    const lines = readFileSync(opsPath, "utf8").split("\n");
    lines.forEach((text, i) => {
      if (!text.trim()) return; // a blank line is not a record; the file ends with one
      try { ops.push(JSON.parse(text)); }
      catch (e) { throw new Error(`loadBuild: ${opsPath} line ${i + 1} is not JSON — ${e.message}`); }
    });
  }
  let canvas = null;
  if (existsSync(canvasPath)) {
    try { canvas = JSON.parse(readFileSync(canvasPath, "utf8")); }
    catch (e) { throw new Error(`loadBuild: ${canvasPath} is not JSON — ${e.message}`); }
  }
  return { ops, canvas };
}
