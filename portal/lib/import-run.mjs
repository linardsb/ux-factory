// portal/lib/import-run.mjs — hand-written canon (this repo; not generated). THE RECORDED IMPORT: a
// Brilliant read (through the Agent SDK) or a dropped file → the import chain → an import record, its
// markdown, a transcript and a PROPOSAL in the build package, plus one `component.propose` op (epic
// #295 ticket #311; docs/epics/canvas-design-import.architecture.md § Boundaries "The import is a
// recorded run", § Data model "Proposals" and "The import record"; .claude/plans/
// import-run-recorded-import-311.md).
//
// INVARIANTS — each one is asserted by build-checks group 43, not assumed:
//   1. STATICALLY SDK-FREE AND ZOD-FREE. The SDK is `await import`ed inside readBrilliant and nowhere
//      else (record-composition.mjs's pattern), so group 43 imports this module in CI, where
//      portal/node_modules does not exist. Its imports are node built-ins, import/, the two system/
//      WCAG modules and three SDK-free portal siblings.
//   2. NOTHING IS WRITTEN OUTSIDE THE BUILD ROOT. Every target is resolved and refused unless it lies
//      under `<pkg>/build/` — a proposal name of `../../system/x` is refused by name, before any
//      write. The one exception is the snap override file, whose directory is chosen below.
//   3. THE RECORD AND THE TRANSCRIPT ARE WRITTEN BEFORE ANY RESPONSE, and before the op is appended:
//      a run that fails at the append leaves its read on disk.
//   4. THE DRAFTS ARE THE IMPORTER'S OUTPUT, NEVER AN AGENT'S. spec.md, block.css and template.txt
//      are deterministic strings built from the record; each says so in its first line. Props,
//      states, behaviour and the accessibility model are the owner's at ratify (#313).
//   5. FIDELITY ON A LIVE RUN IS `missing`, NEVER A PASS. The record carries WCAG (computed over the
//      neutral pack) and no ΔE measurement, because measuring one needs a headless render the portal
//      cannot load; report.mjs's fidelityVerdict answers `missing` for that, and the view says so.
//   6. ONE FENCE, TWO SITES. importFenceDecision is the one predicate; a PreToolUse hook and
//      canUseTool are its two call sites; a throw inside it DENIES. The import agent reads Brilliant
//      and nothing else.
//
// WHERE A SNAP OVERRIDE GOES. By the ROOT's provenance — the one the route resolved the package with
// (resolveRunRoot) — never by run.json's declared value: the canvas journey's scratch copy of a
// fictional package declares `fictional` and is stored under a scratch JOBS_DIR, and reading the
// declaration would write into this repo. Fictional root → import/overrides/ (committed, like the
// fictional package); real root → <JOBS_DIR>/_import-overrides/, because a real designer's source hash
// is not committed. The architecture leaves this open (§ Open questions); this is the minimal answer.
//
// THE LIVE READ IS REACH-ONLY IN THIS VERSION. Brilliant's live response shapes (get_selection, the
// bound project's name, a page listing, the PNG block) have not been observed, and the plan forbids
// guessing them (R1). readBrilliant therefore starts the fenced query, classifies REACH from the SDK's
// init message and a timeout, and then refuses by name with "the live read is not built yet — drop an
// exported file instead". The read itself, rebind and browse follow the owner-run Phase 0 probe.
//
// THE OP LINE'S SOURCE IS `owner`. saveRun hardcodes it, and it is right here: the owner's click caused
// the import and this program wrote the op deterministically; an agent only relayed the read.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { convert as convertBrilliant } from "../../import/brilliant.mjs";
import { convert as convertFigma, readExport } from "../../import/figma.mjs";
import { BUILDERS, build, recognise } from "../../import/recognise.mjs";
import { buildRecord, projectRecord } from "../../import/report.mjs";
import { readOverrides, snap, sourceHash, SLOT_FAMILY, targetsFrom } from "../../import/snap-rules.mjs";
import { walk } from "../../import/ir.mjs";
import { PROPOSAL_NAME_RE } from "../../system/canvas-ops.mjs";
import { RULESET } from "../../system/derive.rules.mjs";
import { checkPairs } from "../../system/wcag.mjs";
import { loadBuild, loadDecisions, positionsOf, saveConflict, saveRun } from "./canvas-store.mjs";
import { withRunLock } from "./builder.mjs";
import { JOBS_DIR, REPO_DIR } from "./env.mjs";

// --- the fence ------------------------------------------------------------------------------------

export const READ_TOOLS = Object.freeze(["mcp__brilliant__get_selection", "mcp__brilliant__lookup", "mcp__brilliant__export"]);
export const REBIND_TOOLS = Object.freeze(["mcp__brilliant__init"]);
export const FENCE_SITES = Object.freeze(["PreToolUse", "canUseTool"]);

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

// ONE site's behaviour, shared by both. FAIL CLOSED: a throw in the decision denies. THE RECORD GATE
// (discovery.mjs's #343/#349 rule, mirrored): a denial is written only for an mcp__ name or a tool the
// run advertised (`mainTools`) — under `tools: []` the CLI's warmup subagents still call built-ins, and
// recording those would log receipts the import agent never earned. A write failure is swallowed: a
// recording bug must not alter the run it records.
function site({ allowed, mainTools = [], write }) {
  const decide = (tool) => {
    try { return importFenceDecision(tool, allowed); }
    catch (e) { return { allow: false, reason: `the fence could not evaluate ${String(tool)} (${e.message}) — denied, fail closed` }; }
  };
  const recorded = (tool) => (typeof tool === "string" && tool.startsWith("mcp__")) || (Array.isArray(mainTools) && mainTools.includes(tool));
  const deny = (via, tool, input, reason) => {
    if (recorded(tool)) {
      try { write?.(deniedLine({ tool, input, error: reason, via })); } catch { /* see above */ }
    }
    return reason;
  };
  return { decide, deny };
}

export function importFenceHooks({ allowed, mainTools = [], write } = {}) {
  const s = site({ allowed, mainTools, write });
  return {
    PreToolUse: [{ hooks: [async (input) => {
      const tool = input?.tool_name;
      const d = s.decide(tool);
      if (d.allow) return { continue: true };
      const reason = s.deny("PreToolUse", tool, input?.tool_input, d.reason);
      return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } };
    }] }],
  };
}

export function importCanUseTool({ allowed, mainTools = [], write } = {}) {
  const s = site({ allowed, mainTools, write });
  return async (tool, input) => {
    const d = s.decide(tool);
    if (d.allow) return { behavior: "allow", updatedInput: input };
    return { behavior: "deny", message: s.deny("canUseTool", tool, input, d.reason) };
  };
}

// --- reach: the SDK's init message and the read's outcome → at most one refusal ------------------

// Every refusal carries exactly ONE action. No retry anywhere (G29): the owner decides.
export function classifyReach(init) {
  const servers = Array.isArray(init?.mcp_servers) ? init.mcp_servers : [];
  const b = servers.find((x) => x?.name === "brilliant");
  if (!b || b.status !== "connected") {
    return { kind: "not-running", message: `The Brilliant MCP server did not start (${b?.status ?? "absent"}).`,
      action: { label: "Check it runs", hint: "npx -y @brilliant-hq/mcp" } };
  }
  const tools = Array.isArray(init?.tools) ? init.tools : [];
  if (!tools.includes("mcp__brilliant__get_selection")) {
    return { kind: "not-reachable", message: "Brilliant is not reachable — no workspace is open.",
      action: { label: "Open Brilliant, then import again", href: "https://brilliant.design" } };
  }
  return null;
}

// A stale binding presents as a timeout, not an error (the Brilliant binding memory).
export function classifyRead({ failures = [], selection = null, timedOut = false, project = null } = {}) {
  const timeout = timedOut || (Array.isArray(failures) && failures.some((f) => /time(d)?\s*out/i.test(String(f?.error ?? f))));
  if (timeout) {
    return { kind: "stale-binding", message: project ? `Bound to project ${project} — it did not answer.` : "The binding did not answer.",
      action: { label: "Re-bind", route: "rebind" } };
  }
  if (!Array.isArray(selection) || selection.length === 0) {
    return { kind: "nothing-selected", message: "Nothing is selected in Brilliant.", action: { label: "Select a component, then Import selection" } };
  }
  return null;
}

// Reach succeeded, and the read's shapes are Phase 0's (plan R1): refused by name, never guessed.
const LIVE_READ_NOT_BUILT = Object.freeze({
  kind: "live-read-not-built",
  message: "Brilliant is reachable, but reading the selection is not built yet — its response shapes are captured by the owner-run probe first.",
  action: { label: "Drop an exported file instead" },
});

// --- the drop and the pipeline ------------------------------------------------------------------

export const MAX_DROP_BYTES = 8 * 1024 * 1024;

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

export function recordFor({ id, source, pipe, mapping, packTokens, mode, attribution = null, elapsedMs = null }) {
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

const sortKeys = (v) => (Array.isArray(v)
  ? v.map(sortKeys)
  : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v));
const jsonText = (v) => `${JSON.stringify(v, null, 2)}\n`;

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
    if (keys[0] === "drop") { if (edit.drop === true) part.drop = true; else delete part.drop; }
    nextMapping.parts[edit.path] = part;
  }
  // Re-derive BEFORE writing anything: an unknown path or a cross-family ref throws here, and the
  // files stay as they were.
  const pipe = runPipeline({ text: source.text, tool: source.tool, mode: prior.provenance.mode, mapping: nextMapping, overrides, ...inputs });
  const record = recordFor({ id: prior.id, source: prior.source, pipe, mapping: nextMapping, packTokens: inputs.packTokens,
    mode: prior.provenance.mode, attribution: prior.provenance.attribution, elapsedMs: prior.elapsed?.recognition ?? null });
  if (keys[0] === "slot") {
    mkdirSync(overridesDir, { recursive: true });
    writeFileSync(path.join(overridesDir, `${overrides.source}.json`), jsonText(overrides));
  }
  writeImport(buildRoot, { id: prior.id, record, name, mapping: nextMapping, drafts: draftProposal({ name, record, compositions: pipe.compositions }) });
  return importView(pkgRoot, name);
}

// --- the run ------------------------------------------------------------------------------------

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// `reader` is injectable so group 43 can drive the whole run with no SDK. `inputs` and `overridesDir`
// likewise. THE WHOLE RUN IS UNDER withRunLock, drops included — they write files too.
export async function runImport({ pkgRoot, provenance = "fictional", base, entrance, ids = null, file = null, mode = 1,
  reader = readBrilliant, inputs = null, overridesDir = overridesDirFor(provenance) }) {
  return withRunLock(async () => {
    const buildRoot = path.join(pkgRoot, "build");
    // Before the reader: no tokens spent on a stale page.
    const conflict = saveConflict(buildRoot, base);
    if (conflict) throw new Error(conflict);
    if (mode !== 1 && mode !== 2) throw new Error(`import-run: mode ${JSON.stringify(mode)} must be 1 or 2`);

    let text, tool, transcript, sourceFile, reference = null;
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
    } else throw new Error(`import-run: entrance ${JSON.stringify(entrance)} is not selection, ids or drop`);

    const inp = inputs ?? loadInputs();
    const bytes = Buffer.from(text, "utf8");
    const overrides = readOverrides(bytes, overridesDir);
    const mapping0 = { parts: {} };
    const t0 = Date.now();
    const pipe = runPipeline({ text, tool, mode, mapping: mapping0, overrides, ...inp });
    const elapsedMs = Date.now() - t0;

    const id = nextImportId(buildRoot);
    const takenNames = existsSync(path.join(buildRoot, "proposals")) ? readdirSync(path.join(buildRoot, "proposals")) : [];
    const name = proposalName(pipe.ir, { taken: takenNames, vocabNames: Object.keys(inp.vocab.components) });
    const source = { tool: pipe.ir.source.tool, project: null, ids: pipe.ir.source.ids, bound: pipe.ir.source.bound, file: sourceFile, sha256: sourceHash(bytes) };
    const record = recordFor({ id, source, pipe, mapping: mapping0, packTokens: inp.packTokens, mode, elapsedMs });
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
    return { name, recordId: id, count, view: importView(pkgRoot, name) };
  });
}

// --- the view -----------------------------------------------------------------------------------

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
  const fidelity = record.fidelity.verdict === "missing" ? "fidelity: missing — not measured, never a pass" : `fidelity: ${record.fidelity.verdict}`;
  return {
    name, recordId: record.id, record, md, mapping, outline,
    compositions: template.compositions,
    reference: existsSync(png) ? `data:image/png;base64,${readFileSync(png).toString("base64")}` : null,
    unbound: unboundCount(records),
    label: `mode ${record.provenance.mode} · source ${record.source.tool}${record.source.file ? ` (${record.source.file})` : ""} · drafted by the importer, not by an agent · ${fidelity}`,
  };
}

// --- the live reader (reach only — see the header) -----------------------------------------------

export const IMPORT_MODEL = "claude-sonnet-5";

export function brilliantServer(env = process.env) {
  if (env.UXF_BRILLIANT_MCP) return JSON.parse(env.UXF_BRILLIANT_MCP);
  return { type: "stdio", command: "npx", args: ["-y", "@brilliant-hq/mcp"], env: {} };
}

const SYSTEM_PROMPT = "You relay a read from the Brilliant design tool. Call only the Brilliant tools you are given, in the order the user names, then reply \"done\" and nothing else.";
const READ_PROMPT = "Call get_selection, then lookup with the selected ids (format \"blueprint\", expandInstances true), then export the root id as PNG. Reply \"done\".";

export async function readBrilliant({ ids = null, timeoutMs = Number(process.env.UXF_IMPORT_TIMEOUT_MS) || 150_000 } = {}) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const transcript = [];
  const write = (l) => transcript.push(l);
  const allowed = READ_TOOLS;
  const abortController = new AbortController();
  let timedOut = false;
  // Armed BEFORE the first message is awaited: a server that never answers may hold the init message
  // until the CLI's own MCP connect timeout.
  const timer = setTimeout(() => { timedOut = true; abortController.abort(); }, timeoutMs);
  let refused = null, costUsd = null, sawInit = false;
  try {
    const q = query({
      prompt: ids ? `${READ_PROMPT} Skip get_selection; the ids are ${JSON.stringify(ids)}.` : READ_PROMPT,
      options: {
        cwd: REPO_DIR, model: IMPORT_MODEL, maxTurns: 6, systemPrompt: SYSTEM_PROMPT,
        tools: [], allowedTools: [],
        mcpServers: { brilliant: brilliantServer() },
        strictMcpConfig: true,
        abortController,
        canUseTool: importCanUseTool({ allowed, write }),
        hooks: importFenceHooks({ allowed, write }),
      },
    });
    for await (const msg of q) {
      if (msg.type === "system" && msg.subtype === "init") {
        sawInit = true;
        const b = (msg.mcp_servers ?? []).find((x) => x?.name === "brilliant");
        write({ type: "meta", ts: new Date().toISOString(), entrance: ids ? "ids" : "selection", model: IMPORT_MODEL, allowed, mcp: b?.status ?? "absent" });
        refused = classifyReach(msg) ?? LIVE_READ_NOT_BUILT;
        abortController.abort();
        break;
      }
      if (msg.type === "result") costUsd = msg.total_cost_usd ?? null;
    }
  } catch (e) {
    if (!abortController.signal.aborted) throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!refused) refused = classifyRead({ timedOut: timedOut || !sawInit, selection: null }) ?? LIVE_READ_NOT_BUILT;
  return { refused: { ...refused, costUsd }, transcript };
}
