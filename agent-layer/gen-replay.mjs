// agent-layer/gen-replay.mjs — the replay artifact: a real incremental build run, projected
// (epic #202, ticket #203; architecture §Data model → Replay artifact).
//
// For each committed board (replay/<slug>.board.json) this validates its trace pair, projects the
// CURATED trace's implement-phase op calls into ordered ops, and emits replay/<slug>.json:
//
//   { op, atMs, phase, params, fromStep }
//
// The artifact is A PROJECTION OF A REAL RUN, NOT A RECORDING. The trace pair is committed beside
// it under the standard honesty labels and named in the artifact's `source`; the artifact's `label`
// says exactly what it is. Nothing here may ever be hand-written or hand-edited — a weak run is
// fixed by tightening portal/record-build.mjs's prompt and re-running (replay/README.md).
//
// THE LOAD-BEARING COUPLING: projecting from the CURATED trace works only because
// tooling/curate-trace.mjs:17 has KEEP_WHOLE = new Set(['file_path', 'command']). Every OTHER
// string in a step's `input` is clipped at 700 chars by truncateInput. If `command` ever leaves
// that set, the op JSON truncates mid-string and the reproduce check goes red with a confusing
// message. tooling/build-checks.mjs group 11 case 7 guards it by running curateTrace over a
// >700-char command, not by grepping for the constant.
//
// The command grammar is system/board-ops.mjs:parseOpCommand — the SAME parser record-build.mjs's
// fence denies with, so a command this could not read was never allowed into the trace.
//
// Standalone:  node agent-layer/gen-replay.mjs [--check]
// Paths resolve from this module (NOT cwd) — build.mjs runs from the jobs folder.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyOps, parseOpCommand } from "../system/board-ops.mjs";
import { validateTrace } from "../tooling/validate-trace.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPLAY = join(ROOT, "replay");
const TRACES = join(ROOT, "traces");
const VERSION = 1;

// PURE — no filesystem, so tooling/build-checks.mjs can drive it over synthetic in-memory rows.
// `rows` are the parsed curated JSONL lines. Returns { meta, ops }. Every refusal names the
// offending `seq`, because "which step" is the only useful thing to know when a projection fails.
export function projectTrace(rows, { slug } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`${slug}: the trace has no rows`);
  const meta = rows[0];
  if (meta?.type !== "meta") throw new Error(`${slug}: the first row must be the meta line`);
  const started = Date.parse(meta.startedAt);
  if (!Number.isFinite(started)) throw new Error(`${slug}: meta "startedAt" (${meta.startedAt}) is not a date`);

  // Every step's seq, so an op's fromStep can be RESOLVED rather than assumed (AC #3).
  const bySeq = new Map();
  for (const r of rows) if (r?.type === "step" && typeof r.seq === "number") bySeq.set(r.seq, r);

  const ops = [];
  let lastSeq = -Infinity;
  for (const step of rows) {
    if (step?.type !== "step" || step.kind !== "tool" || step.tool !== "Bash") continue;
    // A failed or denied call changed nothing, so it is not an op. It stays visible in the trace —
    // that is where the governance story lives.
    if (!step.ok) continue;
    if (typeof step.seq !== "number")
      throw new Error(`${slug}: a successful Bash step carries no numeric "seq" (${JSON.stringify(step.seq)}) — an op with no source step cannot be projected`);
    let parsed;
    try { parsed = parseOpCommand(step.input?.command); }
    catch (e) { throw new Error(`${slug}: step ${step.seq} is not a projectable op call — ${e.message}`); }
    // A --validate invocation is the validate phase's real check and changes no state.
    if (parsed.kind === "validate") continue;

    const at = Date.parse(step.ts);
    if (!Number.isFinite(at)) throw new Error(`${slug}: step ${step.seq} has no parseable "ts" (${step.ts})`);
    const atMs = at - started;
    // Do NOT clamp: a negative offset means the trace is corrupt, and clamping hides it.
    if (atMs < 0) throw new Error(`${slug}: step ${step.seq} is timestamped before the run started (${atMs} ms) — the trace is corrupt`);
    if (!bySeq.has(step.seq)) throw new Error(`${slug}: step ${step.seq} does not resolve back into the trace`);
    // The trace is true chronology and must never be sorted (traces/README.md:68–69). Asserting it
    // costs one line and catches a malformed trace instead of silently reordering a build.
    if (step.seq <= lastSeq) throw new Error(`${slug}: step ${step.seq} is out of seq order (after ${lastSeq}) — the trace must be true chronology`);
    lastSeq = step.seq;

    ops.push({ op: parsed.op.op, atMs, phase: step.phase, params: parsed.op.params ?? {}, fromStep: step.seq });
  }
  if (!ops.length) throw new Error(`${slug}: the trace projects to zero ops — there is no build to replay`);
  return { meta, ops };
}

// First differing path between two JSON values, or null. Naming the path is what turns "the
// reproduce check failed" into something a reader can act on.
function firstDiff(a, b, path = "") {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return path || "(root)";
    if (a.length !== b.length) return `${path}.length (${a.length} vs ${b.length})`;
    for (let i = 0; i < a.length; i += 1) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const d = firstDiff(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : `${path || "(root)"} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`;
}

const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { throw new Error(`${file.slice(ROOT.length + 1)}: ${e.message}`); }
};

function artifactFor(slug) {
  const boardPath = join(REPLAY, `${slug}.board.json`);
  const curatedPath = join(TRACES, `${slug}.jsonl`);
  if (!existsSync(curatedPath))
    throw new Error(`replay/${slug}.board.json has no committed trace at traces/${slug}.jsonl — a replay artifact is a projection of a real run, so the run must be committed with it`);

  // AC #4's first half: the generator refuses a pair that fails the validator. Let it throw.
  validateTrace(curatedPath);

  const rows = readFileSync(curatedPath, "utf8").split("\n").filter((l) => l.trim())
    .map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`traces/${slug}.jsonl:${i + 1}: not JSON — ${e.message}`); } });
  const { meta, ops } = projectTrace(rows, { slug });

  // THE REPRODUCE CHECK: the ops, applied from an empty board, must rebuild the committed board
  // exactly. Ops carry no ids for what they create, so this genuinely RE-DERIVES every id rather
  // than copying it out of the trace.
  const board = readJson(boardPath);
  const rebuilt = applyOps(ops);
  const diff = firstDiff(rebuilt, board);
  if (diff)
    throw new Error(`replay/${slug}.json: the projected ops do not rebuild replay/${slug}.board.json — first difference at ${diff}. The board and the trace disagree; re-run portal/record-build.mjs --force, never hand-edit either.`);

  // Fixed key order, every `source` value COPIED from the curated meta — never computed here, and
  // never authored. Deterministic: the drift gate re-runs this in check mode.
  return {
    $description: "GENERATED by agent-layer/gen-replay.mjs — do not edit. A PROJECTION of a real recorded agent run, not a recording. Regenerate: node agent-layer/gen-replay.mjs",
    version: VERSION,
    slug,
    label: `Projection of the real run ${slug}`,
    source: {
      curatedTrace: `/traces/${slug}.jsonl`,
      rawTrace: `/traces/${slug}.raw.jsonl`,
      board: `/replay/${slug}.board.json`,
      brief: `/replay/briefs/${slug}.md`,
      sessionId: meta.sessionId,
      model: meta.model,
      startedAt: meta.startedAt,
      durationMs: meta.durationMs ?? 0,
    },
    ops,
  };
}
// (The raw sibling is not opened here: validateTrace above already fails a curated trace whose
// traces/<slug>.raw.jsonl is missing or carries a different sessionId, with its own message.)

// Emit every artifact (or, with { check: true }, compare against disk and report drift).
export function genReplay({ check = false } = {}) {
  if (!existsSync(REPLAY)) throw new Error("replay/ does not exist — a replay artifact is projected from a committed run (see replay/README.md)");
  const files = readdirSync(REPLAY).sort();
  const slugs = files.filter((f) => f.endsWith(".board.json")).map((f) => f.slice(0, -".board.json".length));

  // Discover from BOTH directions. Keyed only off board files, an ORPHANED artifact is invisible:
  // a stale replay/<slug>.json left behind by a failed --force re-run (whose dropShipped removed
  // the board) would stay committed, --check would stay green, and AC #2 would be silently unmet.
  for (const f of files) {
    if (!f.endsWith(".json") || f.endsWith(".board.json")) continue;
    const slug = f.slice(0, -".json".length);
    if (!slugs.includes(slug))
      throw new Error(`replay/${f} has no replay/${slug}.board.json — an artifact with no run behind it is not a projection of anything; delete it, or restore the run it came from`);
  }

  let total = 0;
  const drifted = [];
  for (const slug of slugs) {
    const out = JSON.stringify(artifactFor(slug), null, 2) + "\n";
    total += JSON.parse(out).ops.length;
    const dest = join(REPLAY, `${slug}.json`);
    if (check) {
      let prior;
      try { prior = readFileSync(dest, "utf8"); } catch { prior = ""; } // a MISSING artifact counts as drift
      if (prior !== out) drifted.push(`replay/${slug}.json`);
    } else {
      writeFileSync(dest, out);
    }
  }
  return { runs: slugs.length, ops: total, drifted };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check");
  try {
    const r = genReplay({ check });
    if (check && r.drifted.length) {
      console.error(`replay ✗  drift: ${r.drifted.join(", ")} — regenerate with: node agent-layer/gen-replay.mjs`);
      process.exit(1);
    }
    console.log(`replay ✓  ${r.runs} run(s) → ${r.ops} ops ${check ? "— no drift" : "(replay/)"}`);
  } catch (e) {
    console.error(`replay ✗  ${e.message}`);
    process.exit(1);
  }
}
