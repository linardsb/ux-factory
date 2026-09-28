// portal/lib/import-run.mjs — hand-written canon (this repo; not generated). THE RECORDED IMPORT: a
// Brilliant read (a direct stdio client — portal/lib/brilliant-mcp.mjs) or a dropped file → the import
// chain → an import record, its markdown, a transcript and a PROPOSAL in the build package, plus one
// `component.propose` op (epic #295 ticket #311; docs/epics/canvas-design-import.architecture.md
// § Boundaries "The import is a recorded run", § Data model "Proposals" and "The import record";
// .claude/plans/import-run-recorded-import-311.md, and for the live read, the binding check and Browse
// .claude/plans/import-run-live-read-311-pr-b.md).
//
// INVARIANTS — each one is asserted by build-checks group 43, not assumed:
//   1. NO SDK, NO MODEL: the live read is a direct stdio JSON-RPC client (brilliant-mcp.mjs), so an
//      import costs $0 and nothing on this path names the Agent SDK or zod, statically or lazily. Group
//      43 imports this module in CI, where portal/node_modules does not exist. Its imports are node
//      built-ins, import/, the system/ modules it reads and four SDK-free portal siblings.
//   2. NOTHING IS WRITTEN OUTSIDE THE BUILD ROOT. Every target is resolved and refused unless it lies
//      under `<pkg>/build/` — a proposal name of `../../system/x` is refused by name, before any
//      write. The one exception is the snap override file, whose directory is chosen below.
//   3. THE RECORD AND THE TRANSCRIPT ARE WRITTEN BEFORE ANY RESPONSE, and before the op is appended:
//      a run that fails at the append leaves its read on disk.
//   4. THE DRAFTS ARE THE IMPORTER'S OUTPUT, NEVER AN AGENT'S. spec.md, block.css and template.txt
//      are deterministic strings built from the record; each says so in its first line. Props,
//      states, behaviour and the accessibility model are the owner's at ratify (#313).
//   5. FIDELITY ON A LIVE RUN IS `missing` UNTIL THE OWNER MEASURES IT, AND NEVER A PASS WITHOUT A
//      MEASUREMENT. runImport writes WCAG only; import-measure.mjs's measureImport adds the ΔE block on the
//      owner's click (a spawned renderer — this module still loads no browser); any mapping edit rebuilds
//      the record without it and deletes the candidate PNG, because a candidate of the previous mapping
//      is not a measurement of this one (#474).
//   6. ONE FENCE, ONE SITE: the client's `call()`. importFenceDecision is the one predicate, injected
//      into openBridge as `decide`; it runs before a request is written, so a denied tool never leaves
//      the portal, and a throw inside it DENIES. The denial is recorded here, through `onDeny` →
//      deniedLine({ via: "client" }). An import reads Brilliant — init, get_selection, lookup, export —
//      and nothing else.
//
// WHERE A SNAP OVERRIDE GOES. By the ROOT's provenance — the one the route resolved the package with
// (resolveRunRoot) — never by run.json's declared value: the canvas journey's scratch copy of a
// fictional package declares `fictional` and is stored under a scratch JOBS_DIR, and reading the
// declaration would write into this repo. Fictional root → import/overrides/ (committed, like the
// fictional package); real root → <JOBS_DIR>/_import-overrides/, because a real designer's source hash
// is not committed. The architecture leaves this open (§ Open questions); this is the minimal answer.
//
// THE LIVE READ (#311 PR B; the owner's 2026-09-27 call for a direct client over the SDK relay, after
// the Phase 0 probe showed the SDK hides the pairing error, strips `_meta` and costs a model call).
// readBrilliant: openBridge → initialize → notifications/initialized → tools/list → init (the canvas
// id) → get_selection (skipped for an `ids` read) → lookup {format:"blueprint"} → export {png}. Each
// step is classified by brilliant-mcp.mjs's classifyBridge into at most one refusal with one action.
// ONE OVERALL TIMER, armed before the first await: an UNPAIRED tab makes tools/list wait ~46 s before
// its -32000 (observed 45.8 s) and opens a brilliant.design tab as a side effect, so the 150 s default
// stays well above it — and nothing is retried (G29): one tools/list per read. ONE BRIDGE PROCESS PER
// READ, closed in `finally`: a fresh helper binds to the most-recently-active tab on its first tools call
// (PROTOCOL.md §5), so "Re-bind" is the next session after the owner focuses the right tab, and the
// portal holds no connection that could go stale. bindingStatus and browse reuse the same opening
// steps, each under withRunLock (one Brilliant session at a time); a held lock is a `busy` REFUSAL there,
// while runImport keeps PR A's throw.
//
// SUGGESTIONS (#455). runImport's `suggester` is injected by the two import routes (portal/lib/
// import-suggest.mjs's suggest); the default is none, so group 43 and every other caller never reach the
// network. It runs after the recognition clock stops, and its outcome is one `suggest` transcript line.
// An edit carries the prior list forward while each node is still unnamed, pruning any the re-derived
// verdict now scores: a mapping edit never calls Jev.
//
// THE OP LINE'S SOURCE IS `owner`. saveRun hardcodes it, and it is right here: the owner's click caused
// the import and this program wrote the op deterministically; an agent only relayed the read.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { convert as convertBrilliant } from "../../import/brilliant.mjs";
import { convert as convertFigma, readExport } from "../../import/figma.mjs";
import { BUILDERS, build, recognise } from "../../import/recognise.mjs";
import { THRESHOLD } from "../../import/fidelity.mjs";
import { buildRecord, projectRecord } from "../../import/report.mjs";
import { readOverrides, snap, sourceHash, SLOT_FAMILY, targetsFrom } from "../../import/snap-rules.mjs";
import { walk } from "../../import/ir.mjs";
import { PROPOSAL_NAME_RE } from "../../system/canvas-ops.mjs";
import { RULESET } from "../../system/derive.rules.mjs";
import { checkPairs } from "../../system/wcag.mjs";
import { loadBuild, loadDecisions, positionsOf, saveConflict, saveRun } from "./canvas-store.mjs";
import { withRunLock } from "./builder.mjs";
import { JOBS_DIR, REPO_DIR } from "./env.mjs";
import { bindingOf, brilliantServer, classifyBridge, failureOf, openBridge, parseExport, parseInit, parseLookup, parsePage, parseSelection, TOOLS } from "./brilliant-mcp.mjs";

// --- the fence ------------------------------------------------------------------------------------

// ONE list: brilliant-mcp.mjs's, bare MCP names.
export const READ_TOOLS = TOOLS;
export const FENCE_SITES = Object.freeze(["client"]);

const CLOSED = "an import run reads Brilliant and nothing else — Write, Edit, Bash, WebSearch and WebFetch are closed";

export function importFenceDecision(tool, allowed) {
  if (typeof tool !== "string" || !Array.isArray(allowed)) return { allow: false, reason: `${String(tool)} is denied — ${CLOSED}` };
  if (allowed.includes(tool)) return { allow: true, reason: null };
  return { allow: false, reason: `${tool} is not one of this run's tools (${allowed.join(", ")}) — ${CLOSED}` };
}

export const deniedLine = ({ tool, input, error, via }) => {
  if (!FENCE_SITES.includes(via)) throw new Error(`deniedLine: via ${JSON.stringify(via)} is not one of ${FENCE_SITES.join(" · ")}`);
  return { type: "denied", ts: new Date().toISOString(), tool, input: input ?? null, error, via };
};

// --- the drop and the pipeline ------------------------------------------------------------------

export const MAX_DROP_BYTES = 8 * 1024 * 1024;

// The drop route's body, STREAMED with a cap (portal/lib/figma.mjs receiveExport's shape): refused on
// the declared size before a byte is read, and the request destroyed the moment the cap is passed —
// never readBody, whose 1 MB cap stays where it is for every other route.
// A DECLARED size over the cap is the owner's to read, so the route answers it as a refusal (200, one
// action) before a byte is read; readUpload's throws stay for a body with no Content-Length, which
// the page never sends — fetch declares a File body's length (PR #462 review F2).
export function dropTooLarge(declared, max = MAX_DROP_BYTES) {
  if (!(Number.isFinite(declared) && declared > max)) return null;
  return { kind: "too-large", message: `The dropped file is ${declared} bytes, over the ${max}-byte cap.`, action: { label: "Drop a smaller export" } };
}

export async function readUpload(req, max = MAX_DROP_BYTES) {
  const declared = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > max) throw new Error(`import-run: the dropped file is ${declared} bytes, over the ${max}-byte cap`);
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > max) { req.destroy(); throw new Error(`import-run: the dropped file exceeds the ${max}-byte cap`); }
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

// A dropped file → { tool, text }. JSON goes to figma.readExport, whose own refusals (a REST read, a
// token export, a wrong format) name why; anything else is a blueprint and brilliant.convert refuses it.
export function sniffDrop(bytes, filename = "the dropped file") {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? "");
  if (buf.length === 0) throw new Error(`${filename}: the dropped file is empty`);
  const text = buf.toString("utf8");
  // brilliant.convert reads any text as a tree, so a binary file must be refused before it gets there.
  if (/[\u0000\uFFFD]/.test(text)) throw new Error(`${filename}: not a text file — neither a Brilliant blueprint export nor a Figma house-plugin export`);
  let json = true;
  try { JSON.parse(text); } catch { json = false; }
  if (json) { readExport(text); return { tool: "figma", text }; }
  // Every Brilliant element id observed is 16 hex characters (both committed reads, spike C).
  const ids = convertBrilliant(text).source.ids;
  if (ids.length === 0 || !ids.every((i) => /^[0-9a-f]{16}$/.test(i))) throw new Error(`${filename}: its lines do not start with Brilliant element ids (16 hex characters) — not a Brilliant blueprint read`);
  return { tool: "brilliant", text };
}

// The pack's colour tokens, resolving var() alias chains. tooling/regen-import-records.mjs:46-58,
// lifted — tooling/ is not importable from the portal by convention.
export const parseCss = (css) => {
  const raw = Object.fromEntries([...css.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
  const out = {};
  for (const k of Object.keys(raw)) {
    let v = raw[k];
    for (let hops = 0; hops < 8 && /^var\(\s*--([a-z0-9-]+)/.test(v); hops++) v = raw[v.match(/^var\(\s*--([a-z0-9-]+)/)[1]] ?? "";
    if (/^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toLowerCase();
  }
  return out;
};

// The three inputs every pipeline run needs, read from this repo.
export function loadInputs() {
  const read = (p) => readFileSync(path.join(REPO_DIR, p), "utf8");
  return {
    vocab: JSON.parse(read("handoff/verdant/vocabulary.json")),
    contract: JSON.parse(read("system/tokens.source.json")).contract,
    packTokens: parseCss(read("system/tokens.neutral.css")),
  };
}

const PART_NAME_RE = /^[a-z][a-z0-9-]{0,31}$/;

// The owner's mapping over the verdict tree, as a NEW tree. `map` sets the entry (a BUILDERS name),
// `drop` uncovers the node, `name` becomes the built part's id. An unknown path throws naming it.
export function applyMapping(verdict, mapping) {
  const out = structuredClone(verdict);
  const byPath = new Map();
  const go = (v) => { byPath.set(v.path, v); (v.children ?? []).forEach(go); };
  go(out);
  for (const [p, m] of Object.entries(mapping?.parts ?? {})) {
    const v = byPath.get(p);
    if (!v || !v.kind) throw new Error(`mapping.parts: path ${JSON.stringify(p)} is not a node of this import`);
    if (m?.map !== undefined) {
      if (!Object.hasOwn(BUILDERS, m.map)) throw new Error(`mapping.parts["${p}"].map: ${JSON.stringify(m.map)} is not one of ${Object.keys(BUILDERS).join(", ")}`);
      Object.assign(v, { name: m.map, covered: true, via: "mapping" });
    }
    if (m?.drop === true) v.covered = false;
    if (m?.name !== undefined) {
      if (typeof m.name !== "string" || !PART_NAME_RE.test(m.name)) throw new Error(`mapping.parts["${p}"].name: ${JSON.stringify(m.name)} is not a part name — lowercase letters, digits and hyphens, 1–32, starting with a letter`);
      v.partId = m.name;
    }
  }
  return out;
}

export const mappingDropRows = (mapping) => Object.entries(mapping?.parts ?? {})
  .filter(([, m]) => m?.drop === true)
  .map(([p]) => ({ class: "read-then-dropped", role: p, literal: null, why: "dropped by the owner in the mapping editor" }));

// convert → snap → recognise → applyMapping → build, the order tooling/regen-import-records.mjs:76-83
// proves. build() runs ONCE PER TOP-LEVEL CHILD: it recurses itself.
export function runPipeline({ text, tool, mode = 1, mapping = { parts: {} }, overrides = null, vocab, contract }) {
  const opts = { mode, grain: "component" };
  const converted = tool === "figma" ? convertFigma(text, opts) : convertBrilliant(text, opts);
  const { ir, snaps } = snap(converted, targetsFrom(contract), overrides);
  const verdict = applyMapping(recognise(ir, vocab), mapping);
  const buildDrops = [];
  const compositions = ir.children.map((n, i) => build(n, verdict.children[i], vocab, buildDrops));
  return { ir, verdict, buildDrops, compositions, snaps };
}

export function recordFor({ id, source, pipe, mapping, packTokens, mode, attribution = null, elapsedMs = null, suggestions }) {
  const rows = checkPairs(packTokens, RULESET.wcagPairs);
  return buildRecord({
    id,
    source,
    ir: pipe.ir,
    recognition: { verdict: pipe.verdict, buildDrops: pipe.buildDrops },
    mapping: { map: "parts", pack: "tokens.neutral.css", roles: {}, parts: mapping?.parts ?? {}, drops: mappingDropRows(mapping) },
    // WCAG only: no deltaEMin, so fidelityVerdict answers `missing` (invariant 5).
    fidelity: { wcag: { pass: rows.filter((r) => r.pass).length, total: rows.length, failing: rows.filter((r) => !r.pass).map((r) => `${r.fg} on ${r.bg}`) } },
    provenance: { mode, licence: null, attribution },
    elapsed: { recognition: elapsedMs, ratify: null },
    suggestions,
  });
}

export const unboundCount = (records) => {
  const list = (Array.isArray(records) ? records : []).filter((r) => r && typeof r === "object");
  return { unbound: list.filter((r) => r.source?.bound === false).length, total: list.length };
};

// --- names, drafts, the writer --------------------------------------------------------------------

const IMPORT_ID_RE = /^i[1-9][0-9]*$/;

export function nextImportId(buildRoot) {
  const dir = path.join(buildRoot, "imports");
  const taken = new Set(existsSync(dir) ? readdirSync(dir).filter((f) => /^i[1-9][0-9]*\.json$/.test(f)).map((f) => f.slice(0, -5)) : []);
  let n = 1;
  while (taken.has(`i${n}`)) n += 1;
  return `i${n}`;
}

const slugOf = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36).replace(/-+$/, "");

export function proposalName(ir, { taken = [], vocabNames = [] } = {}) {
  const first = ir?.children?.[0];
  let base = slugOf(first?.component?.name ?? first?.name);
  if (!/^[a-z]/.test(base) || !PROPOSAL_NAME_RE.test(base)) base = "import";
  const blocked = new Set([...taken, ...vocabNames]);
  if (!blocked.has(base)) return base;
  let n = 2;
  while (blocked.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

const DRAFTED = (id) => `drafted by portal/lib/import-run.mjs from import record ${id}, not by an agent — props, states, behaviour and the accessibility model are the owner's at ratify (#313)`;

// The contract tokens the ROOT node carries, as CSS declarations. Contract refs only (`--…`); a
// source ref or a raw value is never written — a literal in a component block is a bug.
const rootDeclarations = (node) => {
  const v = (t) => (t && typeof t.ref === "string" && t.ref.startsWith("--") ? `var(${t.ref})` : null);
  const out = [];
  if (v(node?.layout?.gap)) out.push(["gap", v(node.layout.gap)]);
  const pad = (node?.layout?.pad ?? []).map(v);
  if (pad.length === 4 && pad.every(Boolean)) out.push(["padding", pad.join(" ")]);
  if (v(node?.style?.radius)) out.push(["border-radius", v(node.style.radius)]);
  if (v(node?.style?.fill)) out.push(["background", v(node.style.fill)]);
  if (v(node?.text?.size)) out.push(["font-size", v(node.text.size)]);
  return out;
};

export function draftProposal({ name, record, compositions }) {
  const src = record.source;
  const spec = [
    `<!-- ${DRAFTED(record.id)} -->`,
    "```json",
    JSON.stringify({ component: name, status: "proposed", class: `vd-${name}`, props: {}, tokens: rootDeclarations(record.ir.children[0]).map(([, d]) => d.match(/var\((--[a-z0-9-]+)\)/)[1]), states: [], children: [] }, null, 2),
    "```",
    "",
    "## Provenance",
    "",
    `- import record: \`${record.id}\``,
    `- tool: \`${src.tool}\``,
    `- element ids: ${src.ids?.length ? src.ids.map((i) => `\`${i}\``).join(", ") : "none"}`,
    `- mode: ${record.provenance.mode}`,
    "",
    "## Props",
    "",
    "## States",
    "",
    "## Behaviour",
    "",
    "## Accessibility",
    "",
  ].join("\n");
  const decls = rootDeclarations(record.ir.children[0]);
  const css = [
    `/* ${DRAFTED(record.id)} */`,
    `/* ---------- ${name} (proposal ${name}, import ${record.id}) ---------- */`,
    `.vd-${name} {`,
    ...(decls.length ? decls.map(([k, d]) => `  ${k}: ${d};`) : ["  /* the root carries no contract token */"]),
    "}",
    "",
  ].join("\n");
  const template = `${JSON.stringify({ note: DRAFTED(record.id), compositions }, null, 2)}\n`;
  return { "spec.md": spec, "block.css": css, "template.txt": template };
}

export const sortKeys = (v) => (Array.isArray(v)
  ? v.map(sortKeys)
  : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v));
export const jsonText = (v) => `${JSON.stringify(v, null, 2)}\n`;

// Resolve `rel` under `root` and refuse anything that escapes it (invariant 2).
export function underRoot(root, rel) {
  const base = path.resolve(root);
  const target = path.resolve(base, rel);
  if (!target.startsWith(base + path.sep)) throw new Error(`import-run: ${JSON.stringify(rel)} resolves outside the build root ${base} — refused`);
  return target;
}

// Every target is resolved BEFORE the first byte is written, so a bad name leaves nothing behind.
// Order: transcript, source, record json, record md, drafts, mapping — a crash leaves the read first.
export function writeImport(buildRoot, { id, record, transcript, source, name, mapping, drafts, reference = null }) {
  if (!IMPORT_ID_RE.test(String(id))) throw new Error(`import-run: id ${JSON.stringify(id)} is not an import id (i1, i2, …)`);
  if (typeof name !== "string" || !PROPOSAL_NAME_RE.test(name)) throw new Error(`import-run: proposal name ${JSON.stringify(name)} is not a component name`);
  const t = {
    transcript: underRoot(buildRoot, `imports/${id}.transcript.jsonl`),
    json: underRoot(buildRoot, `imports/${id}.json`),
    md: underRoot(buildRoot, `imports/${id}.md`),
    png: underRoot(buildRoot, `imports/${id}.reference.png`),
    dir: underRoot(buildRoot, `proposals/${name}`),
  };
  const inDir = (f) => underRoot(buildRoot, `proposals/${name}/${f}`);
  mkdirSync(path.dirname(t.json), { recursive: true });
  mkdirSync(t.dir, { recursive: true });
  if (transcript) writeFileSync(t.transcript, transcript.map((l) => `${JSON.stringify(l)}\n`).join(""));
  if (source) writeFileSync(inDir("source.json"), jsonText(source));
  writeFileSync(t.json, jsonText(sortKeys(record)));
  writeFileSync(t.md, projectRecord(record));
  if (reference) writeFileSync(t.png, reference);
  for (const f of ["spec.md", "block.css", "template.txt"]) writeFileSync(inDir(f), drafts[f]);
  writeFileSync(inDir("mapping.json"), jsonText(mapping));
  return t;
}

// --- the mapping editor's back end ----------------------------------------------------------------

export const overridesDirFor = (provenance) => (provenance === "fictional"
  ? path.join(REPO_DIR, "import", "overrides")
  : path.join(JOBS_DIR, "_import-overrides"));

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// One edit → mapping.json (or the override file) rewritten, then EVERYTHING re-derived from
// source.json — never patched: checkRecord recomputes the drops from the whole mapping.
export function editMapping({ pkgRoot, provenance, name, edit, inputs = loadInputs(), overridesDir = overridesDirFor(provenance) }) {
  const buildRoot = path.join(pkgRoot, "build");
  if (typeof name !== "string" || !PROPOSAL_NAME_RE.test(name)) throw new Error(`import-run: proposal name ${JSON.stringify(name)} is not a component name`);
  const mapping = readJson(underRoot(buildRoot, `proposals/${name}/mapping.json`));
  const source = readJson(underRoot(buildRoot, `proposals/${name}/source.json`));
  const prior = readJson(underRoot(buildRoot, `imports/${mapping.record}.json`));
  if (!edit || typeof edit !== "object" || typeof edit.path !== "string") throw new Error("import-run: an edit is { path, rename | map | drop | slot+ref }");
  const keys = ["rename", "map", "drop", "slot"].filter((k) => Object.hasOwn(edit, k));
  if (keys.length !== 1) throw new Error(`import-run: an edit carries exactly one of rename, map, drop, slot — this one carried ${keys.join(", ") || "none"}`);
  const bytes = Buffer.from(source.text, "utf8");
  let overrides = readOverrides(bytes, overridesDir);
  const nextMapping = structuredClone(mapping);
  nextMapping.parts ??= {};
  if (keys[0] === "slot") {
    if (!Object.hasOwn(SLOT_FAMILY, edit.slot.replace(/\[\d+\]$/, ""))) throw new Error(`import-run: slot ${JSON.stringify(edit.slot)} is not a snap slot`);
    const snaps = (overrides?.snaps ?? []).filter((o) => !(o.path === edit.path && o.slot === edit.slot));
    overrides = { source: sourceHash(bytes), snaps: [...snaps, { path: edit.path, slot: edit.slot, ref: edit.ref }] };
  } else {
    const part = { ...(nextMapping.parts[edit.path] ?? {}) };
    if (keys[0] === "rename") part.name = edit.rename;
    if (keys[0] === "map") { part.map = edit.map; delete part.drop; }
    // drop: false is "as recognised": it clears a drop AND a remap, keeping a rename.
    if (keys[0] === "drop") { if (edit.drop === true) part.drop = true; else { delete part.drop; delete part.map; } }
    nextMapping.parts[edit.path] = part;
  }
  // Re-derive BEFORE writing anything: an unknown path or a cross-family ref throws here, and the
  // files stay as they were.
  const pipe = runPipeline({ text: source.text, tool: source.tool, mode: prior.provenance.mode, mapping: nextMapping, overrides, ...inputs });
  // Suggestions ride forward only while their node is still unnamed: a matcher or vocabulary that
  // now scores one prunes it here, where checkRecord would otherwise refuse every later edit.
  const unnamed = new Set();
  const gather = (v) => { if (v.kind && v.via !== "scored") unnamed.add(v.path); (v.children ?? []).forEach(gather); };
  gather(pipe.verdict);
  const suggestions = prior.suggestions?.filter((s) => unnamed.has(s.path));
  const record = recordFor({ id: prior.id, source: prior.source, pipe, mapping: nextMapping, packTokens: inputs.packTokens,
    mode: prior.provenance.mode, attribution: prior.provenance.attribution, elapsedMs: prior.elapsed?.recognition ?? null, suggestions });
  if (keys[0] === "slot") {
    mkdirSync(overridesDir, { recursive: true });
    writeFileSync(path.join(overridesDir, `${overrides.source}.json`), jsonText(overrides));
  }
  writeImport(buildRoot, { id: prior.id, record, name, mapping: nextMapping, drafts: draftProposal({ name, record, compositions: pipe.compositions }) });
  // Invariant 5 (#474 D6): recordFor wrote no ΔE, so the verdict is `missing` again; the candidate goes too.
  rmSync(underRoot(buildRoot, `imports/${prior.id}.candidate.png`), { force: true });
  return importView(pkgRoot, name);
}

// --- the run ------------------------------------------------------------------------------------

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// `reader` is injectable so group 43 can drive the whole run with no SDK. `inputs` and `overridesDir`
// likewise. THE WHOLE RUN IS UNDER withRunLock, drops included — they write files too.
export async function runImport({ pkgRoot, provenance = "fictional", base, entrance, ids = null, file = null, mode = 1,
  reader = readBrilliant, inputs = null, overridesDir = overridesDirFor(provenance), suggester = null }) {
  return withRunLock(async () => {
    const buildRoot = path.join(pkgRoot, "build");
    // Before the reader: no tokens spent on a stale page.
    const conflict = saveConflict(buildRoot, base);
    if (conflict) throw new Error(conflict);
    if (mode !== 1 && mode !== 2) throw new Error(`import-run: mode ${JSON.stringify(mode)} must be 1 or 2`);

    let text, tool, transcript, sourceFile, reference = null, binding = null;
    if (entrance === "drop") {
      const bytes = Buffer.isBuffer(file?.bytes) ? file.bytes : Buffer.from(file?.bytes ?? "");
      sourceFile = String(file?.name ?? "dropped file");
      // A file that is neither export is the owner's to fix, so it is a refusal (data), not a 500.
      try { ({ tool, text } = sniffDrop(bytes, sourceFile)); }
      catch (e) { return { refused: { kind: "not-an-export", message: `${sourceFile}: ${e.message}`, action: { label: "Drop a Brilliant blueprint export or a Figma house-plugin export" } } }; }
      transcript = [{ type: "meta", ts: new Date().toISOString(), entrance: "drop", file: sourceFile, bytes: bytes.length, sha256: sha256(bytes) }];
    } else if (entrance === "selection" || entrance === "ids") {
      const r = await reader({ ids });
      if (r?.refused) return { refused: r.refused };          // no record for a read that did not happen
      ({ text } = r);
      tool = "brilliant";
      sourceFile = null;
      transcript = r.transcript ?? [];
      reference = r.reference ?? null;
      binding = r.binding ?? null;
    } else throw new Error(`import-run: entrance ${JSON.stringify(entrance)} is not selection, ids or drop`);

    const inp = inputs ?? loadInputs();
    const bytes = Buffer.from(text, "utf8");
    const overrides = readOverrides(bytes, overridesDir);
    const mapping0 = { parts: {} };
    const t0 = Date.now();
    const pipe = runPipeline({ text, tool, mode, mapping: mapping0, overrides, ...inp });
    const elapsedMs = Date.now() - t0;
    const sug = suggester
      ? await suggester({ ir: pipe.ir, verdict: pipe.verdict, vocab: inp.vocab })
      : { suggestions: [], ran: false, reason: "suggestions are off on this call", requests: 0, usage: null };
    transcript.push({ type: "suggest", ts: new Date().toISOString(), ran: sug.ran, reason: sug.reason,
      nodes: sug.suggestions.length, requests: sug.requests, usage: sug.usage });

    const id = nextImportId(buildRoot);
    const takenNames = existsSync(path.join(buildRoot, "proposals")) ? readdirSync(path.join(buildRoot, "proposals")) : [];
    const name = proposalName(pipe.ir, { taken: takenNames, vocabNames: Object.keys(inp.vocab.components) });
    const source = { tool: pipe.ir.source.tool, project: binding?.project ?? null, ids: pipe.ir.source.ids, bound: pipe.ir.source.bound, file: sourceFile, sha256: sourceHash(bytes) };
    const record = recordFor({ id, source, pipe, mapping: mapping0, packTokens: inp.packTokens, mode, elapsedMs, suggestions: sug.suggestions });
    const mapping = { record: id, parts: {} };
    writeImport(buildRoot, {
      id, record, transcript, name, mapping, reference,
      source: { tool, entrance, file: sourceFile, sha256: sourceHash(bytes), text },
      drafts: draftProposal({ name, record, compositions: pipe.compositions }),
    });

    // The op, through canvas-store's one live writer. The ledger is re-read: base was checked above.
    const pkg = loadBuild(buildRoot);
    const { count } = saveRun(pkgRoot, {
      base: pkg?.ops?.length ?? 0,
      ops: [{ op: "component.propose", params: { name, recordId: id, mode }, status: "applied" }],
      positions: positionsOf(pkg?.canvas), decisions: loadDecisions(pkgRoot),
    });
    return { name, recordId: id, count, binding, view: importView(pkgRoot, name) };
  }, "an import");
}

// --- the view -----------------------------------------------------------------------------------

// The routes check a client-supplied name with this first, so a bad one is a 400 rather than the
// catch-all's 500; the throws inside importView and editMapping stay as the second line (#462 F4).
export const isProposalName = (name) => typeof name === "string" && PROPOSAL_NAME_RE.test(name);

export function importView(pkgRoot, name) {
  const buildRoot = path.join(pkgRoot, "build");
  if (typeof name !== "string" || !PROPOSAL_NAME_RE.test(name)) throw new Error(`import-run: proposal name ${JSON.stringify(name)} is not a component name`);
  const mapFile = underRoot(buildRoot, `proposals/${name}/mapping.json`);
  if (!existsSync(mapFile)) throw new Error(`import-run: no proposal "${name}" in ${buildRoot}`);
  const mapping = readJson(mapFile);
  const record = readJson(underRoot(buildRoot, `imports/${mapping.record}.json`));
  const md = readFileSync(underRoot(buildRoot, `imports/${mapping.record}.md`), "utf8");
  const template = JSON.parse(readFileSync(underRoot(buildRoot, `proposals/${name}/template.txt`), "utf8"));
  const png = underRoot(buildRoot, `imports/${mapping.record}.reference.png`);
  const importsDir = path.join(buildRoot, "imports");
  const records = readdirSync(importsDir).filter((f) => IMPORT_ID_RE.test(f.replace(/\.json$/, "")) && f.endsWith(".json")).map((f) => readJson(path.join(importsDir, f)));
  const verdicts = new Map();
  const go = (v) => { verdicts.set(v.path, v); (v.children ?? []).forEach(go); };
  go(record.recognition.verdict);
  const outline = [];
  walk(record.ir, (n, p) => {
    if (!n.kind) return;
    const v = verdicts.get(p);
    outline.push({ path: p, kind: n.kind, name: n.name, text: n.text?.content ?? null, recognised: v?.covered ? v.name : null,
      snaps: (n.snaps ?? []).map((s) => ({ slot: s.slot, family: s.family, outcome: s.outcome, ref: s.ref, value: s.value })) });
  });
  const targets = targetsFrom(loadInputs().contract);
  const worst = record.fidelity.deltaEMin?.worst;
  const fidelity = record.fidelity.verdict === "missing" ? "fidelity: missing — not measured, never a pass"
    : worst ? `fidelity: ${record.fidelity.verdict} (worst ΔE ${worst.value} at ${worst.region}, threshold ${THRESHOLD})` : `fidelity: ${record.fidelity.verdict}`;
  return {
    name, recordId: record.id, record, md, mapping, outline,
    compositions: template.compositions,
    reference: existsSync(png) ? `data:image/png;base64,${readFileSync(png).toString("base64")}` : null,
    // A reference is what a measurement needs (#474); a drop has none, so the view offers no Measure.
    measurable: existsSync(png),
    unbound: unboundCount(records),
    // What the editor may offer: only a name with a builder, only a token of the slot's own family.
    builders: Object.keys(BUILDERS),
    snapChoices: Object.fromEntries(Object.entries(targets).map(([f, list]) => [f, list.map((t) => t.ref)])),
    label: `mode ${record.provenance.mode} · source ${record.source.tool}${record.source.file ? ` (${record.source.file})` : ""} · drafted by the importer, not by an agent · ${fidelity}`,
  };
}

// --- the live reader (see the header's THE LIVE READ) --------------------------------------------

const TIMEOUT_MS = () => Number(process.env.UXF_IMPORT_TIMEOUT_MS) || 150_000;
// The read's export scale, OURS and explicit (#474 D4): Brilliant's `scale` "Defaults to 2.0"
// (import/fixtures/brilliant-live/tools-list.json), and 1 is where fidelity.mjs's THRESHOLD was
// calibrated (S3, DSF 1). import-measure.mjs reads the scale back from the transcript's export line,
// so a record read before this constant existed (no `scale`) still measures, at Brilliant's 2.
export const EXPORT_SCALE = 1;
export const BROWSE_MAX = 12;
const sha256Of = (v) => { const b = Buffer.from(JSON.stringify(v)); return { bytes: b.length, sha256: sha256(b) }; };

// One bridge session: the overall timer, the fence wired to the transcript, and `close()` in finally.
// `step` races ONE request against the timer and hands back data — { reply } | { timedOut } |
// { exited } — so a hung or dead bridge is classified, never thrown; a protocol error still throws.
async function withBridge({ streams = null, server, timeoutMs = TIMEOUT_MS(), transcript = null }, body) {
  const srv = server ?? brilliantServer();
  let timer;
  const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs); });
  const bridge = openBridge({ server: srv, streams, allowed: READ_TOOLS, decide: importFenceDecision,
    onDeny: ({ tool, input, reason }) => transcript?.push(deniedLine({ tool, input, error: reason, via: "client" })) });
  const step = async (p) => {
    try { return await Promise.race([p.then((reply) => ({ reply })), deadline]); }
    catch (e) { if (e && Object.hasOwn(e, "exited")) return { exited: e.exited }; throw e; }
  };
  try { return await body({ bridge, step, srv }); }
  finally { clearTimeout(timer); bridge.close(); }
}

// Steps 1–3, shared by the read, the binding check and Browse: initialize → initialized → tools/list →
// init. Answers { refused } or { canvasId, initReply, call } where `call(name, args, project)` is one
// fenced tools/call → { reply } | { refused }, writing one `tool` line when a transcript is kept.
async function openSession({ bridge, step }, transcript = null) {
  const hello = await step(bridge.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ux-factory import", version: "1" } }));
  if (!hello.reply) return { refused: classifyBridge({ phase: "initialize", ...hello }) };
  bridge.notify("notifications/initialized");
  const list = await step(bridge.request("tools/list", {}));
  if (!list.reply) return { refused: classifyBridge({ phase: "tools/list", ...list }) };
  const listed = classifyBridge({ phase: "tools/list", error: list.reply.error, tools: (list.reply.result?.tools ?? []).map((t) => t?.name) });
  if (listed) return { refused: listed };
  const call = async (name, args, project = null) => {
    const t0 = Date.now();
    const out = await step(bridge.call(name, args));
    const reply = out.reply;
    const failed = reply ? (reply.denied ?? failureOf(reply)) : null;
    transcript?.push({ type: "tool", ts: new Date().toISOString(), tool: name, input: args, ok: Boolean(reply && !reply.denied && failed === null),
      ms: Date.now() - t0, ...(reply && !reply.denied ? sha256Of(reply) : { bytes: 0, sha256: null }) });
    if (!reply) return { refused: classifyBridge({ phase: "call", project, ...out }) };
    if (failed !== null) return { refused: classifyBridge({ phase: "call", error: failed }) };
    return { reply };
  };
  const i = await call("init", { agentName: "ux-factory import" });
  if (i.refused) return i;
  return { canvasId: parseInit(i.reply).canvasId, initReply: i.reply, call };
}

// The read. `ids` (Browse → import) skips get_selection; the binding then comes from the lookup reply.
// Returns { refused, transcript } or { text, transcript, reference, binding } — runImport's contract.
export async function readBrilliant({ ids = null, timeoutMs = TIMEOUT_MS(), streams = null, server } = {}) {
  const transcript = [];
  const srv = server ?? brilliantServer();
  transcript.push({ type: "meta", ts: new Date().toISOString(), entrance: ids ? "ids" : "selection", transport: "stdio",
    server: streams ? "in-process streams" : srv.command, allowed: READ_TOOLS });
  const out = await withBridge({ streams, server: srv, timeoutMs, transcript }, async (b) => {
    const s = await openSession(b, transcript);
    if (s.refused) return s;
    const project = bindingOf(s.initReply)?.project ?? null;
    let bindingReply = null, read = ids;
    if (!read) {
      const g = await s.call("get_selection", { canvasId: s.canvasId }, project);
      if (g.refused) return g;
      const sel = parseSelection(g.reply);
      const none = classifyBridge({ phase: "selection", selection: sel });
      if (none) return { refused: none };
      read = sel.selectedIds;
      bindingReply = g.reply;
    }
    const l = await s.call("lookup", { scope: read, format: "blueprint", expandInstances: true }, project);
    if (l.refused) return l;
    const { text } = parseLookup(l.reply);
    bindingReply ??= l.reply;
    const x = await s.call("export", { canvasId: s.canvasId, ids: [read[0]], format: "png", scale: EXPORT_SCALE }, project);
    if (x.refused) return x;
    const binding = bindingOf(bindingReply);
    transcript.push({ type: "binding", ts: new Date().toISOString(), project: binding?.project ?? null, tabId: binding?.tabId ?? null,
      surface: binding?.surface ?? null, otherTabs: binding?.otherTabs ?? 0 });
    return { text, reference: parseExport(x.reply).bytes, binding };
  });
  return out.refused ? { refused: out.refused, transcript } : { ...out, transcript };
}

// A lock held by another run is the owner's to wait out: a refusal with one action, not a 500.
export async function underLock(fn, what) {
  try { return await withRunLock(fn, what); }
  catch (e) {
    if (String(e?.message).includes("already in flight")) return { refused: { kind: "busy", message: e.message, action: { label: "Wait, then try again" } } };
    throw e;
  }
}

// Which project the read reaches, and how much is selected. An empty selection is NOT a refusal here.
export async function bindingStatus({ streams = null, server, timeoutMs = TIMEOUT_MS() } = {}) {
  return underLock(() => withBridge({ streams, server, timeoutMs }, async (b) => {
    const s = await openSession(b);
    if (s.refused) return s;
    const g = await s.call("get_selection", { canvasId: s.canvasId }, bindingOf(s.initReply)?.project ?? null);
    if (g.refused) return g;
    return { binding: bindingOf(g.reply), canvasId: s.canvasId, selected: parseSelection(g.reply).selectedIds.length };
  }), "a binding check");
}

// Browse: the page's top-level elements with a 160-px thumbnail each, the first BROWSE_MAX of them.
// CACHED for the server process's life, keyed by the tab and canvas that init names — so a cache hit
// still opens the bridge for steps 1–3 (the key needs them); the saving is the N exports.
const browseCache = new Map();

export async function browse({ refresh = false, streams = null, server, timeoutMs = TIMEOUT_MS() } = {}) {
  return underLock(() => withBridge({ streams, server, timeoutMs }, async (b) => {
    const s = await openSession(b);
    if (s.refused) return s;
    const binding = bindingOf(s.initReply);
    const key = `${binding?.tabId ?? "-"}|${s.canvasId}`;
    if (refresh) browseCache.delete(key);
    if (browseCache.has(key)) return { ...browseCache.get(key), binding, cached: true };
    const project = binding?.project ?? null;
    // depth: 0, as the capture asked (import/fixtures/brilliant-live/lookup-page.json).
    const l = await s.call("lookup", { scope: [s.canvasId], format: "summary", depth: 0 }, project);
    if (l.refused) return l;
    const all = parsePage(l.reply);
    const elements = [];
    for (const e of all.slice(0, BROWSE_MAX)) {
      const x = await s.call("export", { canvasId: s.canvasId, ids: [e.id], format: "png", width: 160 }, project);
      if (x.refused) return x;
      elements.push({ ...e, thumb: `data:image/png;base64,${parseExport(x.reply).bytes.toString("base64")}` });
    }
    const entry = { canvasId: s.canvasId, elements, total: all.length, truncated: all.length > BROWSE_MAX };
    browseCache.set(key, entry);
    return { ...entry, binding, cached: false };
  }), "a browse");
}
