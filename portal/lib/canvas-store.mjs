// portal/lib/canvas-store.mjs — hand-written canon (this repo; not generated). The build package's
// FILE IO and the judgements made over those files (epic #295 tickets #302 and #306; .claude/plans/
// canvas-swap-grid-retired-free-substrate-302.md Task 6.1, canvas-page-run-list-arrangement-ops-306.md
// Tasks 2.1-2.2).
//
// ONE CONCERN PER MODULE, the portal/lib/ rule: the build package on disk. system/canvas-ops.mjs owns
// the op grammar and the applier; this owns where the bytes go, and folds them through that applier
// rather than knowing the grammar itself. The split is what lets build-checks drive the applier with no filesystem and drive
// the round trip with a scratch directory.
//
// THE ROUTES ARE #306's. portal/server.mjs's /api/canvas/runs, /api/canvas/run and /api/canvas/save
// delegate here: listBuilds for the run list, loadBuild + foldLedger + loadDecisions for one run, and
// saveConflict + saveRun for a save. The fold, the canvas.json derivation (arrangement) and the gate
// predicate (verifyBuild) live here rather than in system/canvas-ops.mjs because the page never needs
// them — the server folds on load and derives on save — so they stay Node-side, out of the runtime
// line count approach.html renders, and beside the only writer of the files they judge.
//
// NO SDK, AND NOTHING THAT COULD REACH ONE. It imports node built-ins plus ../../system/canvas-ops.mjs,
// which group 35.9 pins SDK-free in its own right; group 36.6 pins exactly this set. That is what lets
// group 36 import it in CI — where portal/node_modules does not exist at all. That absence IS the
// SDK-free proof, and it is why this module must never grow an import of a portal sibling that has one.
//
// THE TWO FILES ARE DIFFERENT KINDS AND ARE WRITTEN DIFFERENTLY:
//
//   ops.jsonl    APPEND-ONLY on the live path. saveRun, the page's writer, only ever appends lines
//                after checking the page's base against the ledger's length. saveBuild writes a NEW
//                package whole (the spine, the round trip): portal/lib/trace-recorder.mjs's idiom —
//                mkdir, truncate to empty, then append a line per record.
//   canvas.json  A WHOLE-FILE REWRITE, the generator idiom, because the arrangement is derived: it
//                is rewritten from the document on every save and never carries a fact the ops do
//                not, so there is nothing in it to append to. Positions are the one authored part.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyOps } from "../../system/canvas-ops.mjs";

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

// ---- #306: the fold, the derivation, the gate ----------------------------------------------------

// The committed $description, as the derivation writes it. Group 36.4 asserts the committed file
// carries exactly this and that it still names all four divergences from JSON Canvas 1.0.
export const CANVAS_DESCRIPTION = "JSON Canvas–SHAPED, and deliberately NOT JSON Canvas 1.0 (jsoncanvas.org/spec/1.0, read 2026-09-18). Four divergences, named rather than left for a reader to hit: (1) `type` is frame|note|decision|exhibit, where the spec allows only text|file|link|group; (2) `height` is OPTIONAL here and REQUIRED there, because a frame's height is its content's until someone authors one; (3) `ref` is added, pointing a node at the op or decision it came from, and the spec has no such key; (4) `relation` replaces the spec's `label` on an edge, because flows and embodies are a closed set rather than free text. A conformant reader REFUSES type: \"frame\", so this file must never be described as JSON Canvas flat. WHAT IS DERIVED AND WHAT IS NOT, stated exactly (corrected 2026-09-21, PR #432's open question 4). Every node and edge here — which frames exist, their ids, widths, screen and base refs, which arrows connect them, every note, every decision card and every `embodies` edge from a frame to a decision in its decisionRefs (#306) — is rewritten from ops.jsonl on save, and build-checks group 36 folds the committed ledger (undo lines included) through the real applier and compares the whole derivation, node by node and edge by edge. POSITIONS ARE AUTHORED. The ops carry no geometry by design: where a thing sits is the arrangement's business, and an op that carried an x would make these two files two sources for one fact. That is why group 36's inverse case requires a MOVED frame to still pass, and it is why nothing here can drift-check an x. The earlier wording said positions came from the rank layout — they do not, that layout has no concept of a state frame, and f2.x is 472 where its pitch is 236.";

const STATUSES = Object.freeze(["applied", "accepted", "proposed", "refused", "undone"]);

// Canonical sorted-key JSON, build-checks' `deep`: two values are the same op when this agrees.
const canon = (v) => (v && typeof v === "object" && !Array.isArray(v)
  ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`
  : (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v)));

// foldLedger(lines) → { doc, effective } — the document a ledger describes, and the applied lines in
// stack order.
//
// UNDO IS LAST-IN-FIRST-OUT AND THE UNDO LINE RESTATES WHAT IT UNDOES (D1). An `undone` line carries
// the same op and params as the line it cancels and no new key, so the pinned line shape is
// unchanged; the fold checks it against the TOP of the stack and refuses a mismatch naming both seqs,
// which is what makes a wrong undo fail loudly. Redo is the same op appended again as `applied`.
// `proposed` and `refused` lines are skipped: they are a proposal's statuses, and no page writes them.
export function foldLedger(lines) {
  if (!Array.isArray(lines)) throw new Error("foldLedger: lines must be an array");
  const effective = [];
  lines.forEach((l, i) => {
    const status = l?.status;
    if (status === "applied" || status === "accepted") { effective.push(l); return; }
    if (status === "proposed" || status === "refused") return;
    if (status === "undone") {
      const top = effective[effective.length - 1];
      if (!top) throw new Error(`foldLedger: line ${i + 1} (seq ${l.seq}) undoes ${l.op} but nothing applied is left to undo`);
      if (canon({ op: top.op, params: top.params }) !== canon({ op: l.op, params: l.params })) {
        throw new Error(`foldLedger: line ${i + 1} (seq ${l.seq}) undoes ${l.op} but the last applied op is seq ${top.seq} (${top.op}) — undo is last-in-first-out`);
      }
      effective.pop();
      return;
    }
    throw new Error(`foldLedger: line ${i + 1} (seq ${l?.seq}) has status ${JSON.stringify(status)} — the enum is ${STATUSES.join(" · ")}`);
  });
  const doc = applyOps(effective.map(({ op, params }) => ({ op, params })));
  return { doc, effective };
}

// The decision refs every frame embodies, in frame order then ref order, deduplicated.
const decisionRefsOf = (doc) => {
  const seen = [];
  for (const f of doc.frames) for (const r of f.decisionRefs ?? []) if (!seen.includes(r)) seen.push(r);
  return seen;
};

// arrangement(doc, positions) → the canvas.json object.
//
// EVERYTHING BUT POSITION IS DERIVED from the document (D7): frames, notes, one decision card per
// ref any frame embodies, arrows as `flows` edges, and an `embodies` edge per frame × ref. Positions
// come from `positions` ({id: {x, y, w?, h?}}), and a node with none is REFUSED naming it — a
// derivation that invented one would put a hand-chosen number in a committed file with no one having
// chosen it. Key order is the committed file's: id, type, x, y, width, height?, ref.
export function arrangement(doc, positions) {
  const at = (id) => {
    const p = positions?.[id];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      throw new Error(`arrangement: node "${id}" has no position — every node the ops make needs an authored x and y`);
    }
    return p;
  };
  const node = (id, type, width, ref) => {
    const p = at(id);
    if (!Number.isFinite(width)) throw new Error(`arrangement: node "${id}" has no width`);
    return { id, type, x: p.x, y: p.y, width, ...(Number.isFinite(p.h) && { height: p.h }), ref };
  };
  const nodes = [
    ...doc.frames.map((f) => node(f.id, "frame", f.width, f.baseId ? `state:${f.stateKey} of ${f.baseId}` : `screen:${f.screenId}`)),
    ...(doc.notes ?? []).map((n) => node(n.id, "note", positions?.[n.id]?.w, `note:${n.id}`)),
    ...decisionRefsOf(doc).map((r) => node(`d${r}`, "decision", positions?.[`d${r}`]?.w, `decision:${r}`)),
  ];
  const edges = [
    ...doc.arrows.map((a) => ({ id: a.id, fromNode: a.from.frameId, toNode: a.to.frameId, relation: "flows" })),
    ...doc.frames.flatMap((f) => (f.decisionRefs ?? []).map((r) => ({ id: `e-${f.id}-d${r}`, fromNode: f.id, toNode: `d${r}`, relation: "embodies" }))),
  ];
  return { $description: CANVAS_DESCRIPTION, nodes, edges };
}

// positionsOf(canvas) → {id: {x, y, w?, h?}} — the AUTHORED half of a canvas.json. `w` for
// non-frames only: a frame's width is the document's (frame.size), never the arrangement's.
export function positionsOf(canvas) {
  const out = {};
  for (const n of Array.isArray(canvas?.nodes) ? canvas.nodes : []) {
    if (!n || typeof n.id !== "string") continue;
    out[n.id] = { x: n.x, y: n.y, ...(n.type !== "frame" && { w: n.width }), ...(n.height != null && { h: n.height }) };
  }
  return out;
}

// verifyBuild({ ops, canvas }) → string[] — empty means clean. THE GATE PREDICATE (AC #1): the ledger's
// shape, the fold, and canvas.json equal to what the ops derive under canvas.json's OWN positions. So
// a moved node can never fail it (positions are authored — #302's inverse case, kept), while any node
// or edge the ops do not produce, or a width they disagree with, always does.
export function verifyBuild({ ops, canvas } = {}) {
  const out = [];
  if (!Array.isArray(ops)) return ["ops.jsonl did not load as a list of lines"];
  ops.forEach((l, i) => {
    const at = `ops.jsonl line ${i + 1}`;
    if (l?.seq !== i + 1) out.push(`${at}: seq ${JSON.stringify(l?.seq)} — a ledger's seq is its position, 1-based and gapless`);
    if (typeof l?.at !== "string" || !l.at.endsWith("Z")) out.push(`${at}: "at" is not an ISO stamp ending Z`);
    if (l?.source !== "owner" && l?.source !== "agent") out.push(`${at}: source ${JSON.stringify(l?.source)} is not owner or agent`);
    if (!STATUSES.includes(l?.status)) out.push(`${at}: status ${JSON.stringify(l?.status)} is not in ${STATUSES.join(" · ")}`);
    if (/"x"\s*:|"y"\s*:/.test(JSON.stringify(l))) out.push(`${at}: carries an x or a y — positions live in canvas.json alone`);
  });
  let derived;
  try { derived = arrangement(foldLedger(ops).doc, positionsOf(canvas)); }
  catch (e) { out.push(`the ledger does not fold into the arrangement: ${e.message}`); return out; }
  if (canvas?.$description !== derived.$description) out.push("canvas.json's $description is not the derivation's");
  for (const kind of ["nodes", "edges"]) {
    const want = new Map(derived[kind].map((x) => [x.id, x]));
    const have = new Map((Array.isArray(canvas?.[kind]) ? canvas[kind] : []).map((x) => [x?.id, x]));
    for (const [id, x] of have) {
      if (!want.has(id)) out.push(`canvas.json ${kind} "${id}" carries a fact the ops do not`);
      else if (canon(x) !== canon(want.get(id))) out.push(`canvas.json ${kind} "${id}" is ${canon(x)}, the ops derive ${canon(want.get(id))}`);
    }
    for (const id of want.keys()) if (!have.has(id)) out.push(`canvas.json is missing ${kind} "${id}", which the ops derive`);
    if (out.length === 0 && canon([...have.keys()]) !== canon([...want.keys()])) out.push(`canvas.json's ${kind} are out of the derivation's order`);
  }
  return out;
}

// ---- #306: the run list, the decisions, the label, the live save ----------------------------------

// portal/lib/discovery.mjs's RUN_SLUG_RE, copied byte for byte rather than imported: group 36.6 pins
// this module's imports to node built-ins plus canvas-ops, and discovery.mjs is not SDK-free by
// construction. The two must agree, or the run list shows a slug resolveRunRoot then refuses.
const RUN_SLUG_RE = /^[a-z0-9-]{1,48}$/;

const readJson = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };

// listBuilds(roots) → [{ provenance, slug, label, declared, hasTranscript }] for every child of each
// root that is a directory, has a usable slug and holds a build/ directory. Skip, never throw:
// discovery/ also holds bank.mjs and README.md, and an absent root has nothing in it.
export function listBuilds(roots) {
  const out = [];
  for (const { provenance, dir } of Array.isArray(roots) ? roots : []) {
    if (typeof dir !== "string" || !existsSync(dir)) continue;
    for (const slug of readdirSync(dir)) {
      const pkg = join(dir, slug);
      if (!RUN_SLUG_RE.test(slug) || !statSync(pkg).isDirectory()) continue;
      if (!existsSync(join(pkg, "build")) || !statSync(join(pkg, "build")).isDirectory()) continue;
      const run = readJson(join(pkg, "run.json"));
      out.push({
        provenance,
        slug,
        label: typeof run?.label === "string" ? run.label : null,
        declared: typeof run?.provenance === "string" ? run.provenance : null,
        hasTranscript: existsSync(join(pkg, "transcript.jsonl")),
      });
    }
  }
  return out.sort((a, b) => (a.provenance === b.provenance ? a.slug.localeCompare(b.slug) : a.provenance.localeCompare(b.provenance)));
}

const readJsonl = (file) => readFileSync(file, "utf8").split("\n").flatMap((text, i) => {
  if (!text.trim()) return [];
  try { return [JSON.parse(text)]; }
  catch (e) { throw new Error(`${file} line ${i + 1} is not JSON — ${e.message}`); }
});

// loadDecisions(pkgRoot) → null | [{ id, questionId, answerRef, answer, wrongIf, level }].
//
// NULL when the package has no transcript.jsonl — a stand-in, whose decision refs cannot be resolved
// and are flagged on the page rather than blocked. Otherwise every record_decision op line; its id is
// the line's seq as a string (the spine's decisionRefs ["7","8"] are transcript seqs 7 and 8), and
// the answer is joined from answers.jsonl by ref.
export function loadDecisions(pkgRoot) {
  const tPath = join(pkgRoot, "transcript.jsonl");
  if (!existsSync(tPath)) return null;
  const aPath = join(pkgRoot, "answers.jsonl");
  const answers = new Map(existsSync(aPath) ? readJsonl(aPath).map((a) => [a.ref, a.text]) : []);
  return readJsonl(tPath)
    .filter((l) => l.type === "op" && l.op === "record_decision")
    .map((l) => ({
      id: String(l.seq),
      questionId: l.params?.question_id ?? null,
      answerRef: l.params?.answer_ref ?? null,
      answer: answers.get(l.params?.answer_ref) ?? null,
      wrongIf: l.params?.wrong_if ?? null,
      level: l.params?.level ?? null,
    }));
}

// provenanceLabel({ declared, root }) → { text, mismatch } — the honesty contract's label (D12).
//
// THE PACKAGE'S OWN STATEMENT WINS. `declared` is run.json's provenance, the package's claim about its
// content; `root` (where it is stored) is the fallback. Labelling by root would call the journey's
// copy of the fictional Faster Payment package "real" because it sits in the jobs folder.
export function provenanceLabel({ declared, root } = {}) {
  const which = declared === "fictional" || declared === "real" ? declared : root;
  const text = which === "fictional" ? "Fictional flow, neutral skin" : "Real product, neutral skin";
  return { text, mismatch: (declared === "fictional" || declared === "real") && (root === "fictional" || root === "real") && declared !== root };
}

const ledgerLength = (buildRoot) => (existsSync(join(buildRoot, OPS_FILE)) ? readJsonl(join(buildRoot, OPS_FILE)).length : 0);

// saveConflict(buildRoot, base) → a message, or null. The page sends the line count it loaded (plus
// what it has saved since); a different count means another tab or process wrote in between.
export function saveConflict(buildRoot, base) {
  const have = ledgerLength(buildRoot);
  return base === have ? null
    : `the ledger holds ${have} lines and this page last saw ${JSON.stringify(base)} — another tab or process saved in between. Reload to continue.`;
}

// saveRun(pkgRoot, { base, ops, positions, decisions }, { now }) → { count }.
//
// THE LIVE WRITER, APPEND-ONLY AND ALL SYNCHRONOUS (D10). Nothing awaits between the server's
// saveConflict and the append, which is what makes two tabs get a 409 rather than an interleaved
// ledger. Every refusal — a status the page never writes, an op the applier refuses, a frame.link
// ref the transcript does not hold, a node with no position — throws BEFORE any byte is written.
// `decisions` is loadDecisions' answer: an array checks frame.link refs; null (a stand-in) accepts any.
export function saveRun(pkgRoot, { base, ops, positions, decisions } = {}, { now = () => new Date().toISOString() } = {}) {
  const buildRoot = join(pkgRoot, "build");
  const opsPath = join(buildRoot, OPS_FILE);
  const existing = existsSync(opsPath) ? readJsonl(opsPath) : [];
  if (base !== existing.length) throw new Error(`saveRun: ${saveConflict(buildRoot, base)}`);
  if (!Array.isArray(ops)) throw new Error("saveRun: ops must be an array");
  const at = now();
  const lines = ops.map((o, i) => {
    if (o?.status !== "applied" && o?.status !== "undone") {
      throw new Error(`saveRun: op ${i} has status ${JSON.stringify(o?.status)} — the page writes applied and undone only; proposed and refused are a proposal's`);
    }
    return { seq: base + i + 1, at, source: "owner", op: o.op, params: o.params, status: o.status };
  });
  const { doc } = foldLedger([...existing, ...lines]);
  if (Array.isArray(decisions)) {
    const ids = new Set(decisions.map((d) => d.id));
    for (const l of lines) {
      if (l.op !== "frame.link" || l.status !== "applied") continue;
      const missing = (l.params?.decisionRefs ?? []).filter((r) => !ids.has(r));
      if (missing.length) throw new Error(`saveRun: frame.link names decision ${missing.join(", ")}, which this package's transcript does not record`);
    }
  }
  const canvas = arrangement(doc, positions);
  mkdirSync(buildRoot, { recursive: true });
  for (const l of lines) appendFileSync(opsPath, `${JSON.stringify(l)}\n`);
  writeFileSync(join(buildRoot, CANVAS_FILE), `${JSON.stringify(canvas, null, 2)}\n`);
  return { count: base + lines.length };
}
