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
// line count approach.html renders, and beside the only writer of the files they judge. The Mode 2
// exhibit's derivation and placeExhibit (#475) live here for the same reason: the page never places an
// exhibit (an import reloads it) — it only calls the shared clash rule, which is canvas-ops.mjs's.
//
// NO SDK, AND NOTHING THAT COULD REACH ONE. It imports node built-ins plus ../../system/canvas-ops.mjs,
// which group 35.9 pins SDK-free in its own right; group 36.6 pins exactly this set. That is what lets
// group 36 import it in CI — where portal/node_modules does not exist at all. That absence IS the
// SDK-free proof, and it is why this module must never grow an import of a portal sibling that has one.
//
// THE FILES ARE DIFFERENT KINDS AND ARE WRITTEN DIFFERENTLY:
//
//   ops.jsonl    APPEND-ONLY on the live path. saveRun, the page's writer, only ever appends lines
//                after checking the page's base against the ledger's length. saveBuild writes a NEW
//                package whole (the spine, the round trip): portal/lib/trace-recorder.mjs's idiom —
//                mkdir, truncate to empty, then append a line per record.
//   canvas.json  A WHOLE-FILE REWRITE, the generator idiom, because the arrangement is derived: it
//                is rewritten from the document on every save and never carries a fact the ops do
//                not, so there is nothing in it to append to. Positions are the one authored part.
//   groups/<id>.json  A WHOLE-FILE REWRITE like canvas.json (#315, D7): each saved group's definition,
//                derived from the fold on every save; a file the fold no longer derives (an undone define)
//                is removed. It carries no authored part at all.

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { applyOp, applyOps, EXHIBIT_SIZE, exhibitClashes, exhibitsOf } from "../../system/canvas-ops.mjs";

export const OPS_FILE = "ops.jsonl";
export const CANVAS_FILE = "canvas.json";
export const GROUPS_DIR = "groups";
// The compose loop's transcript (canvas-session.mjs's TRANSCRIPT_FILE), read here for the trace rule (#316).
export const BUILD_TRANSCRIPT_FILE = "transcript.jsonl";

// groupFiles(doc, run) → { "<id>.json": {id, name, parts, provenance: {run, composedFrom}} } — the groups/ projection
// (#315, D7): derived from the fold, rewritten on every save, never a fact the ops do not carry. Id order.
export function groupFiles(doc, run) {
  const groups = doc && typeof doc.groups === "object" && doc.groups ? doc.groups : {};
  return Object.fromEntries(Object.keys(groups).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map((id) => {
    const g = groups[id];
    return [`${id}.json`, { id: g.id, name: g.name, parts: g.parts, provenance: { run, composedFrom: g.composedFrom } }];
  }));
}
const groupText = (v) => `${JSON.stringify(v, null, 2)}\n`;

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

// loadBuild(root) → { ops, canvas, groups, run, buildTranscript } — the parsed package, or null when it has no build half.
// `buildTranscript` is build/transcript.jsonl parsed, or NULL when the file is absent (#316) — never the package's own
// transcript.jsonl, which is discovery's.
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
  const groupsDir = join(root, GROUPS_DIR);
  const groups = {};
  if (existsSync(groupsDir)) {
    for (const f of readdirSync(groupsDir).filter((x) => x.endsWith(".json")).sort()) {
      try { groups[f] = JSON.parse(readFileSync(join(groupsDir, f), "utf8")); }
      catch (e) { throw new Error(`loadBuild: ${join(groupsDir, f)} is not JSON — ${e.message}`); }
    }
  }
  const txPath = join(root, BUILD_TRANSCRIPT_FILE);
  const buildTranscript = existsSync(txPath) ? readJsonl(txPath) : null;
  return { ops, canvas, groups, run: basename(dirname(root)), buildTranscript };
}

// ---- #316: the spine seed ------------------------------------------------------------------------

// The spine is MVP 14's first six lines of discovery/faster-payment/build/ops.jsonl (build-checks group 36 pins them
// as a prefix). Everything a real run appends comes after them.
export const SPINE_LENGTH = 6;

// seedSpine(srcPkg, destPkg, { discovery }) → destPkg — a scratch package holding the source's SPINE and nothing a run
// added (#316). Copies run.json and prd.md (with `discovery`, answers.jsonl and the discovery transcript.jsonl too, which
// loadDecisions reads), then writes build/ through saveBuild: the first SPINE_LENGTH ledger lines and the arrangement
// they derive under the source canvas.json's own positions. NEVER build/transcript.jsonl, imports/, proposals/ or
// groups/ — so every fixture that seeds from the committed package starts from the same document however long the
// committed run grows, and the next id it mints (f3, g1, i1, pr1) is free.
export function seedSpine(srcPkg, destPkg, { discovery = false } = {}) {
  const src = loadBuild(join(srcPkg, "build"));
  if (!src || src.ops.length < SPINE_LENGTH) throw new Error(`seedSpine: ${srcPkg} has no ${SPINE_LENGTH}-line spine in build/${OPS_FILE}`);
  mkdirSync(destPkg, { recursive: true });
  for (const f of ["run.json", "prd.md", ...(discovery ? ["answers.jsonl", "transcript.jsonl"] : [])]) {
    if (existsSync(join(srcPkg, f))) copyFileSync(join(srcPkg, f), join(destPkg, f));
  }
  const spine = src.ops.slice(0, SPINE_LENGTH);
  saveBuild(join(destPkg, "build"), arrangement(foldLedger(spine).doc, positionsOf(src.canvas)), spine);
  return destPkg;
}

// ---- #306: the fold, the derivation, the gate ----------------------------------------------------

// The committed $description, as the derivation writes it. Group 36.4 asserts the committed file
// carries exactly this and that it still names all four divergences from JSON Canvas 1.0.
export const CANVAS_DESCRIPTION = "JSON Canvas–SHAPED, and deliberately NOT JSON Canvas 1.0 (jsoncanvas.org/spec/1.0, read 2026-09-18). Four divergences, named rather than left for a reader to hit: (1) `type` is frame|note|decision|exhibit, where the spec allows only text|file|link|group; (2) `height` is OPTIONAL here and REQUIRED there, because a frame's height is its content's until someone authors one; (3) `ref` is added, pointing a node at the op or decision it came from, and the spec has no such key; (4) `relation` replaces the spec's `label` on an edge, because flows and embodies are a closed set rather than free text. A conformant reader REFUSES type: \"frame\", so this file must never be described as JSON Canvas flat. WHAT IS DERIVED AND WHAT IS NOT, stated exactly (corrected 2026-09-21, PR #432's open question 4). Every node and edge here — which frames exist, their ids, widths, screen and base refs, which arrows connect them, every note, every decision card and every `embodies` edge from a frame to a decision in its decisionRefs (#306), and one `exhibit` per Mode 2 `component.propose` (#475) — the frozen original, `EXHIBIT_SIZE` 320×280, its id the proposal's and its ref `proposal:<name>`, whose box never meets a frame's (a frame with no authored height counts as reaching down without end) — is rewritten from ops.jsonl on save, and build-checks group 36 folds the committed ledger (undo lines included) through the real applier and compares the whole derivation, node by node and edge by edge. POSITIONS ARE AUTHORED. The ops carry no geometry by design: where a thing sits is the arrangement's business, and an op that carried an x would make these two files two sources for one fact. That is why group 36's inverse case requires a MOVED frame to still pass, and it is why nothing here can drift-check an x. The earlier wording said positions came from the rank layout — they do not, that layout has no concept of a state frame, and f2.x is 472 where its pitch is 236.";

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
// `proposed` and `refused` lines are skipped: they are a proposal's statuses (#312). An `accepted` line —
// the owner's verdict, carrying `fromStep` — folds like `applied`. A `proposal.ratify` is never undone
// (#313, D9): its files are in the repo by then, so an undo line restating one is refused and the
// component leaves through git.
export function foldLedger(lines) {
  if (!Array.isArray(lines)) throw new Error("foldLedger: lines must be an array");
  const effective = [];
  lines.forEach((l, i) => {
    const status = l?.status;
    if (status === "applied" || status === "accepted") { effective.push(l); return; }
    if (status === "proposed" || status === "refused") return;
    if (status === "undone") {
      if (l.op === "proposal.ratify") throw new Error(`foldLedger: line ${i + 1} (seq ${l.seq}) undoes proposal.ratify — a ratified component leaves the system through git, not undo`);
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
// ref any frame embodies, one exhibit per Mode 2 proposal (#475), arrows as `flows` edges, and an
// `embodies` edge per frame × ref. An exhibit's size is EXHIBIT_SIZE, never the arrangement's, and one
// that meets a frame is REFUSED naming both and G7 — so saveRun refuses before writing and verifyBuild
// reports it, one site. Positions
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
    ...exhibitsOf(doc).map((e) => {
      const p = at(e.id);
      return { id: e.id, type: "exhibit", x: p.x, y: p.y, width: EXHIBIT_SIZE.w, height: EXHIBIT_SIZE.h, ref: `proposal:${e.name}` };
    }),
  ];
  const clash = exhibitClashes(doc, positions)[0];
  if (clash) {
    const name = exhibitsOf(doc).find((e) => e.id === clash.exhibitId)?.name;
    throw new Error(`arrangement: exhibit "${clash.exhibitId}" (${name}) meets frame "${clash.frameId}" — a frozen original stays beside the flow, never inside a frame (G7)`);
  }
  const edges = [
    ...doc.arrows.map((a) => ({ id: a.id, fromNode: a.from.frameId, toNode: a.to.frameId, relation: "flows" })),
    ...doc.frames.flatMap((f) => (f.decisionRefs ?? []).map((r) => ({ id: `e-${f.id}-d${r}`, fromNode: f.id, toNode: `d${r}`, relation: "embodies" }))),
  ];
  return { $description: CANVAS_DESCRIPTION, nodes, edges };
}

// placeExhibit(doc, positions, gap?) → { x, y } — where a new Mode 2 exhibit sits (#475).
//
// RIGHT OF EVERY AUTHORED BOX, AT THE FRAMES' TOP ROW: x is the largest right edge over frames (their
// width is the document's), notes, decision cards and exhibits already placed, plus the gap; y is the
// smallest frame y. Clear of every frame by construction, because it starts past every frame's right
// edge. Node-only: portal/lib/import-run.mjs calls it before saveRun, because arrangement refuses a
// node with no position and the import's files are already on disk by then.
export function placeExhibit(doc, positions, gap = 32) {
  const fin = Number.isFinite;
  const pos = positions && typeof positions === "object" ? positions : {};
  const widths = new Map([
    ...(doc?.frames ?? []).map((f) => [f.id, f.width]),
    ...exhibitsOf(doc).map((e) => [e.id, EXHIBIT_SIZE.w]),
  ]);
  const rights = [];
  const tops = [];
  for (const [id, p] of Object.entries(pos)) {
    if (!p || !fin(p.x)) continue;
    const w = widths.has(id) ? widths.get(id) : p.w;
    if (fin(w)) rights.push(p.x + w);
  }
  for (const f of doc?.frames ?? []) if (fin(pos[f.id]?.y)) tops.push(pos[f.id].y);
  return { x: rights.length ? Math.max(...rights) + gap : 0, y: tops.length ? Math.min(...tops) : 0 };
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

// verifyBuild({ ops, canvas, groups? }) → string[] — empty means clean. THE GATE PREDICATE (AC #1): the ledger's
// shape, the fold, and canvas.json equal to what the ops derive under canvas.json's OWN positions. So
// a moved node can never fail it (positions are authored — #302's inverse case, kept), while any node
// or edge the ops do not produce, or a width they disagree with, always does. With `groups` (loadBuild's), every
// groups/ file must equal what the ops derive, none missing and none extra, its provenance.run a run slug but not
// the reading directory's (a renamed copy keeps the run its groups were composed in) (#315). A position is looked for only in a
// line's own keys and its params' own keys (F10, PR #485), so a part id `x` inside an override is not one.
//
// THE TRACE RULE (#316): with `buildTranscript` (loadBuild's), every agent line must trace to the compose loop's
// transcript — traceFlaws below. NULL (the file is absent) flags every agent line, so deleting the transcript cannot
// hide one; UNDEFINED (a hand-built {ops, canvas} that never passed it) skips the rule, groups' convention.
export function verifyBuild({ ops, canvas, groups, buildTranscript } = {}) {
  const out = [];
  if (!Array.isArray(ops)) return ["ops.jsonl did not load as a list of lines"];
  ops.forEach((l, i) => {
    const at = `ops.jsonl line ${i + 1}`;
    if (l?.seq !== i + 1) out.push(`${at}: seq ${JSON.stringify(l?.seq)} — a ledger's seq is its position, 1-based and gapless`);
    if (typeof l?.at !== "string" || !l.at.endsWith("Z")) out.push(`${at}: "at" is not an ISO stamp ending Z`);
    if (l?.source !== "owner" && l?.source !== "agent") out.push(`${at}: source ${JSON.stringify(l?.source)} is not owner or agent`);
    if (!STATUSES.includes(l?.status)) out.push(`${at}: status ${JSON.stringify(l?.status)} is not in ${STATUSES.join(" · ")}`);
    // F10 (PR #485): only the line's own keys and its params' own keys — where a position could ever be written. A part
    // or an override key called x deep inside params is not a position.
    if (["x", "y"].some((k) => Object.hasOwn(l ?? {}, k) || (l?.params && typeof l.params === "object" && Object.hasOwn(l.params, k)))) out.push(`${at}: carries an x or a y — positions live in canvas.json alone`);
    // #312: a verdict names the agent's proposal it answers, restating it, and is that proposal's only one.
    if (l?.fromStep !== undefined) {
      const p = ops[l.fromStep - 1];
      if (l.source === "agent") out.push(`${at}: an agent line never answers a proposal`);
      else if (l.status !== "accepted" && l.status !== "refused") out.push(`${at}: carries fromStep but is ${l.status} — only a verdict (accepted, refused) names the proposal it answers`);
      else if (!Number.isInteger(l.fromStep) || l.fromStep < 1 || l.fromStep > i) out.push(`${at}: fromStep ${JSON.stringify(l.fromStep)} names no earlier line`);
      else if (p?.status !== "proposed" || p?.source !== "agent") out.push(`${at}: fromStep ${l.fromStep} names a ${p?.status} line, not an agent's proposal`);
      else if (canon({ op: p.op, params: p.params }) !== canon({ op: l.op, params: l.params })) out.push(`${at}: restates ${l.op} but seq ${l.fromStep} proposed ${p.op} — a verdict restates exactly what it answers`);
      else {
        const twin = ops.findIndex((x, j) => j !== i && x?.fromStep === l.fromStep);
        if (twin >= 0) out.push(`${at}: seq ${l.fromStep} already has a verdict (line ${twin + 1})`);
      }
    } else if (l?.status === "accepted") out.push(`${at}: an accepted line names the proposal it answers (fromStep)`);
  });
  let derived;
  let folded;
  try { folded = foldLedger(ops).doc; derived = arrangement(folded, positionsOf(canvas)); }
  catch (e) { out.push(`the ledger does not fold into the arrangement: ${e.message}`); return out; }
  out.push(...laneFlaws(folded));
  if (buildTranscript !== undefined) out.push(...traceFlaws(ops, buildTranscript));
  // #315: groups/ compared only when the caller passes it (loadBuild does), so a hand-built {ops, canvas} is unaffected.
  // provenance.run is the run the group was COMPOSED in, not the directory it is read from: a package copied under
  // another name (every scratch copy here, 36.10's among them) keeps its groups' run, so run is checked as a slug and
  // everything else is compared to the fold.
  if (groups !== undefined) {
    const want = groupFiles(folded, null);
    const have = groups && typeof groups === "object" ? groups : {};
    const sansRun = (g) => canon({ ...g, provenance: { ...(g?.provenance ?? {}), run: null } });
    for (const f of Object.keys(have)) {
      if (!Object.hasOwn(want, f)) { out.push(`groups/${f} carries a fact the ops do not`); continue; }
      if (sansRun(have[f]) !== sansRun(want[f])) out.push(`groups/${f} is ${canon(have[f])}, the ops derive ${canon(want[f])}`);
      const r = have[f]?.provenance?.run;
      if (typeof r !== "string" || !RUN_SLUG_RE.test(r)) out.push(`groups/${f}'s provenance.run ${JSON.stringify(r ?? null)} is not a run slug`);
    }
    for (const f of Object.keys(want)) if (!Object.hasOwn(have, f)) out.push(`groups/${f} is missing, which the ops derive`);
  }
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

// traceFlaws(ops, buildTranscript) → string[] — the trace rule (#316, AC #5): every agent ledger line has exactly one
// transcript op line at its seq, with its status and a tool that maps to its op (TR1, TR2); every transcript op line
// with a seq points at an agent ledger line (TR3); every agent refusal has its refused line (TR4); every agent line
// that is not refused carries exactly the params fileProposal builds from its op line's args (TR5, PR #495 review
// F2 — without it an edited composition or override traced cleanly). `null` is a package with no
// build/transcript.jsonl: every agent line is then a flaw. Total over junk.
const TOOL_OP = Object.freeze({ screen_compose: "screen.compose", state_add: "state.add" });
// fileProposal's projection of a tool call's args onto the op's params, undefined values dropped as JSON drops them.
const TOOL_PARAMS = Object.freeze({
  screen_compose: (a) => ({ screenId: a.screenId, why: a.why, composition: a.composition, decisionRefs: a.decisionRefs, states: a.states }),
  state_add: (a) => ({ baseId: a.baseId, stateKey: a.stateKey, override: a.override }),
});
const paramsOf = (tool, args) => {
  const a = args && typeof args === "object" ? args : {};
  return Object.fromEntries(Object.entries(TOOL_PARAMS[tool](a)).filter(([, v]) => v !== undefined));
};
export function traceFlaws(ops, buildTranscript) {
  const lines = Array.isArray(ops) ? ops : [];
  const agent = lines.filter((l) => l?.source === "agent");
  if (buildTranscript === null) return agent.map((l) => `ops.jsonl line ${l.seq}: source "agent" but the package has no build/${BUILD_TRANSCRIPT_FILE}`);
  const tx = Array.isArray(buildTranscript) ? buildTranscript.filter((t) => t && typeof t === "object") : [];
  const opLines = tx.filter((t) => t.type === "op");
  const out = [];
  for (const l of agent) {
    const mine = opLines.filter((t) => t.seq === l.seq);
    if (!mine.length) { out.push(`ops.jsonl line ${l.seq}: source "agent" but build/${BUILD_TRANSCRIPT_FILE} has no op line for seq ${l.seq}`); continue; }
    if (mine.length > 1) out.push(`ops.jsonl line ${l.seq}: build/${BUILD_TRANSCRIPT_FILE} has more than one op line for seq ${l.seq}`);
    const t = mine[0];
    if (t.status !== l.status) out.push(`ops.jsonl line ${l.seq}: status ${JSON.stringify(l.status)} but the transcript's op line says ${JSON.stringify(t.status)}`);
    if (TOOL_OP[t.tool] !== l.op) out.push(`ops.jsonl line ${l.seq}: ${l.op} but the transcript's op line is tool ${JSON.stringify(t.tool)}`);
    else if (l.status !== "refused" && canon(l.params) !== canon(paramsOf(t.tool, t.args))) out.push(`ops.jsonl line ${l.seq}: params ${canon(l.params)} but the transcript's op line's args project to ${canon(paramsOf(t.tool, t.args))}`);
    if (l.status === "refused" && !tx.some((r) => r.type === "refused" && r.seq === l.seq)) out.push(`ops.jsonl line ${l.seq}: an agent refusal with no refused line for seq ${l.seq} in build/${BUILD_TRANSCRIPT_FILE}`);
  }
  for (const t of opLines) {
    if (t.seq === null || t.seq === undefined) continue;
    const l = lines.find((x) => x?.seq === t.seq);
    if (!l) out.push(`transcript op seq ${JSON.stringify(t.seq)} points at no ledger line`);
    else if (l.source !== "agent") out.push(`transcript op seq ${t.seq} points at an ${l.source} line`);
  }
  return out;
}

// laneFlaws(doc) → string[] — every lane override naming a frame the ops do not create (#314: the ops.jsonl ↔
// canvas.json gate extended to variants). Unreachable through today's applier — variant.add refuses an unknown frame
// and frame.remove refuses an overridden one — so it is a TRIPWIRE for a loosened applier; its positive control is a
// hand-built document (build-checks 36.12).
export function laneFlaws(doc) {
  const ids = new Set((Array.isArray(doc?.frames) ? doc.frames : []).map((f) => f?.id));
  const out = [];
  for (const v of Array.isArray(doc?.variants) ? doc.variants : []) {
    for (const fid of Object.keys(v?.overrides ?? {})) {
      if (!ids.has(fid)) out.push(`lane "${v?.key}" overrides "${fid}", which the ops do not create`);
    }
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
      evidenceRefs: Array.isArray(l.params?.evidence_refs) ? [...l.params.evidence_refs] : [],
      level: l.params?.level ?? null,
    }));
}

// loadExhibits(pkgRoot, doc) → [{ id, name, recordId, tool, file, attribution, licence, reference }] —
// what the canvas page shows on each Mode 2 exhibit (#475). `reference` is the live read's PNG as a
// data URL (importView's precedent), null for a dropped file, which carries none. recordId is already
// ^i[1-9][0-9]*$ — the applier refuses anything else — so the join cannot leave build/imports/.
export function loadExhibits(pkgRoot, doc) {
  const dir = join(pkgRoot, "build", "imports");
  return exhibitsOf(doc).map((e) => {
    const record = readJson(join(dir, `${e.recordId}.json`));
    const png = join(dir, `${e.recordId}.reference.png`);
    return {
      id: e.id, name: e.name, recordId: e.recordId,
      tool: record?.source?.tool ?? null,
      file: record?.source?.file ?? null,
      attribution: record?.provenance?.attribution ?? null,
      licence: record?.provenance?.licence ?? null,
      reference: existsSync(png) ? `data:image/png;base64,${readFileSync(png).toString("base64")}` : null,
    };
  });
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
    : `the ledger holds ${have} lines and this page last saw ${JSON.stringify(base)} — ${CONFLICT_MARK}. Reload to continue.`;
}
const CONFLICT_MARK = "another tab or process saved in between";
// isSaveConflict(message) — true for saveConflict's own message, so a caller that meets it as a thrown
// Error (the compose turn's in-lock check) answers the same 409 the route's own check does.
export const isSaveConflict = (message) => String(message ?? "").includes(CONFLICT_MARK);

// ---- #312: the compose loop's lines ---------------------------------------------------------------

// openProposals(lines) → the agent's `proposed` lines no later line answers (by fromStep), in ledger
// order. A read, so total over junk.
export function openProposals(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const answered = new Set(list.map((l) => l?.fromStep).filter((n) => n !== undefined));
  return list.filter((l) => l?.status === "proposed" && l?.source === "agent" && !answered.has(l.seq));
}

// The owner's verdict on the page (accepted | refused) must name an agent proposal by fromStep, restate
// it exactly, and be the only verdict on it — in the ledger or earlier in this batch.
function checkVerdict(existing, batch, i) {
  const o = batch[i];
  const n = o.fromStep;
  if (!Number.isInteger(n)) throw new Error(`saveRun: op ${i} is ${o.status} with no integer fromStep — a verdict names the proposal it answers`);
  const p = existing[n - 1];
  if (!p || p.status !== "proposed" || p.source !== "agent") throw new Error(`saveRun: op ${i} answers seq ${n}, which is not an agent's proposal`);
  if (canon({ op: p.op, params: p.params }) !== canon({ op: o.op, params: o.params })) {
    throw new Error(`saveRun: op ${i} restates ${o.op} but seq ${n} proposed ${p.op} — a verdict restates exactly what it answers`);
  }
  const prior = existing.find((l) => l?.fromStep === n);
  if (prior) throw new Error(`saveRun: op ${i} answers seq ${n}, but seq ${n} already has a verdict (seq ${prior.seq})`);
  if (batch.slice(0, i).some((x) => x?.fromStep === n)) throw new Error(`saveRun: op ${i} answers seq ${n}, but seq ${n} already has a verdict (op ${batch.findIndex((x) => x?.fromStep === n)} of this save)`);
}

// appendAgentLine(pkgRoot, { op, params, status }, { now }) → { seq, count } — THE SERVER'S WRITER of
// the agent's lines (portal/lib/canvas-session.mjs's handler is its caller). This module stays the only
// writer of ops.jsonl. Synchronous, like saveRun; no base: the session holds the run lock for the
// whole turn and the page holds its saves during its own turn, so the line lands at the current length
// and the page adopts the returned count. Neither status enters the fold, so canvas.json is untouched.
// A REFUSED line carries no params (PR #485 review F2): they are model-written and failed a check, so
// verifyBuild could redden on them (a prop named x) with no repair, since the ledger is append-only. The
// transcript's op line at the same seq keeps the args verbatim.
export function appendAgentLine(pkgRoot, { op, params, status } = {}, { now = () => new Date().toISOString() } = {}) {
  const buildRoot = join(pkgRoot, "build");
  const opsPath = join(buildRoot, OPS_FILE);
  const existing = existsSync(opsPath) ? readJsonl(opsPath) : [];
  if (status !== "proposed" && status !== "refused") {
    throw new Error(`appendAgentLine: status ${JSON.stringify(status)} — an agent line is proposed or refused; accepted, applied and undone are the owner's`);
  }
  if (status === "proposed") {
    const open = openProposals(existing)[0];
    if (open) {
      const what = open.op === "state.add" ? `${open.params?.stateKey} of ${open.params?.baseId}` : open.params?.screenId;
      throw new Error(`appendAgentLine: seq ${open.seq} (${open.op} ${what}) is still waiting for the owner's verdict — one open proposal at a time (LOOP)`);
    }
    try { applyOp(foldLedger(existing).doc, { op, params }); }
    catch (e) { throw new Error(`appendAgentLine: ${e.message}`); }
  }
  const line = { seq: existing.length + 1, at: now(), source: "agent", op, ...(status === "proposed" && { params }), status };
  mkdirSync(buildRoot, { recursive: true });
  appendFileSync(opsPath, `${JSON.stringify(line)}\n`);
  return { seq: line.seq, count: line.seq };
}

// saveRun(pkgRoot, { base, ops, positions, decisions }, { now }) → { count }.
//
// THE LIVE WRITER, APPEND-ONLY AND ALL SYNCHRONOUS (D10). Nothing awaits between the server's
// saveConflict and the append, which is what makes two tabs get a 409 rather than an interleaved
// ledger. Every refusal — a status the page never writes, an op the applier refuses, a frame.link
// ref the transcript does not hold, a node with no position — throws BEFORE any byte is written.
// `decisions` is loadDecisions' answer: an array checks frame.link refs; null (a stand-in) accepts any.
// The lines land in ONE append; a crash between it and the canvas.json write leaves canvas.json one save
// behind, which the next save re-derives from the whole ledger.
export function saveRun(pkgRoot, { base, ops, positions, decisions } = {}, { now = () => new Date().toISOString() } = {}) {
  const buildRoot = join(pkgRoot, "build");
  const opsPath = join(buildRoot, OPS_FILE);
  const existing = existsSync(opsPath) ? readJsonl(opsPath) : [];
  if (base !== existing.length) throw new Error(`saveRun: ${saveConflict(buildRoot, base)}`);
  if (!Array.isArray(ops)) throw new Error("saveRun: ops must be an array");
  const at = now();
  const lines = ops.map((o, i) => {
    const status = o?.status;
    if (status === "applied" || status === "undone") {
      if (o.fromStep !== undefined) throw new Error(`saveRun: op ${i} is ${status} and carries fromStep — only a verdict (accepted, refused) names the proposal it answers`);
    } else if (status === "accepted" || status === "refused") {
      checkVerdict(existing, ops, i);
    } else {
      throw new Error(`saveRun: op ${i} has status ${JSON.stringify(status)} — the page writes applied, undone and the owner's verdicts (accepted, refused, with fromStep); proposed and refused-by-the-agent are a proposal's, written by appendAgentLine`);
    }
    return { seq: base + i + 1, at, source: "owner", op: o.op, params: o.params, status, ...(o.fromStep !== undefined && { fromStep: o.fromStep }) };
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
  const gfiles = groupFiles(doc, basename(pkgRoot));
  mkdirSync(buildRoot, { recursive: true });
  if (lines.length) appendFileSync(opsPath, lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
  writeFileSync(join(buildRoot, CANVAS_FILE), `${JSON.stringify(canvas, null, 2)}\n`);
  // groups/ is a projection (#315, D7): every derived file written, every underived one (an undone define) removed.
  const gdir = join(buildRoot, GROUPS_DIR);
  if (Object.keys(gfiles).length || existsSync(gdir)) {
    mkdirSync(gdir, { recursive: true });
    for (const f of readdirSync(gdir)) if (f.endsWith(".json") && !Object.hasOwn(gfiles, f)) rmSync(join(gdir, f));
    for (const [f, v] of Object.entries(gfiles)) writeFileSync(join(gdir, f), groupText(v));
  }
  return { count: base + lines.length };
}
