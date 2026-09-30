// portal/lib/ratify.mjs — hand-written canon (this repo; not generated). THE OWNER'S ADMISSION: an import
// proposal becomes a vocabulary member — write, run every gate, return the diff, never touch git (epic #295
// ticket #313; docs/epics/canvas-design-import.architecture.md § Boundaries "Ratify writes, gates, and stops
// at the diff (G6)" and "The origin guard applies unchanged"; .claude/plans/ratify-write-gate-diff-313.md).
//
// INVARIANTS — each one is asserted by build-checks group 50, not assumed:
//   1. NO SDK, NO MODEL. Nothing drafts at ratify: the owner fills props, states, behaviour, accessibility,
//      structure and licence, and the importer's drafts only prefill the form. The import graph is node
//      built-ins, system/canvas-ops.mjs, system/templates.admitted.mjs (checkAdmitted only), import/report.mjs
//      and SDK-free portal siblings — group 50.1 imports this module in CI, where portal/node_modules is absent.
//   2. THE PLANNER IS PURE. planRatify turns the proposal, the record, the drafts, the owner's input and the
//      current text of every anchor file into the exact bytes of every write and one hash over them and HEAD
//      (D6). Preview and confirm both call it; confirm refuses a hash the preview did not compute over the same
//      bytes, so a request can never write without a preview, and a commit between the two is stale.
//   3. SIX WRITES, EACH AT ONE ANCHOR, IN ORDER: create system/specs/<name>.md · append system/components.css ·
//      rewrite system/templates.admitted.mjs · rewrite system/palette.mjs · rewrite tooling/build-checks.mjs (the
//      wrapper pin) · rewrite system/specs/<container>.md per chosen container (D11). Every rewriter refuses
//      unless its anchor matches exactly once. The renderer is never edited (the admitted spread reads the data).
//   4. VALIDATION IS BY ALLOWLIST. checkInput tests every field with RegExp.test and throws naming the path;
//      nothing is "cleaned" by .replace. CSS is token-only: every value is one or more var(--x) with --x declared
//      in system/tokens.contract.css. Prose fields refuse a line starting with # or a fence, because a `## `
//      would break the four-section spec parse only after the files were written.
//   5. THE TREE MUST BE CLEAN IN CODE, AND DIRTY IS CHECKED BEFORE THE HASH (D5). Ratify runs every gate over
//      the whole tree and shows only its own writes, so a sibling session's half-done edit would red its gates
//      and read as ratify's fault. CLEAN_GUARD's two git calls must both print nothing.
//   6. THE CHAIN IS SPAWNED, NEVER IMPORTED (D4). Ten fresh `node` children with fixed argv and cwd: repoDir —
//      gen-vocabulary imports the renderer, which imports the registry, and the long-lived portal's ESM cache
//      would validate the new spec's example against the pre-ratify registry. No shell anywhere: git and node
//      are called with argv arrays.
//   7. GREEN APPENDS, RED DOES NOT (D7). On a green chain the op is appended and the record stamped
//      (`elapsed.ratify`, D8: the two server-written `at`s); on a red one the files stay for the owner to read,
//      nothing is appended, and the answer carries the revert command. The owner commits. Nothing here does.
//      The op is appended BEFORE the record is stamped, because elapsed.ratify is measured to the op's own
//      server-written `at`; a throw between the two answers `error` with `appended: true` and no revert.
//
// A FICTIONAL PACKAGE LIVES UNDER discovery/, WHICH THE GUARD COVERS, so a ratify on one refuses `dirty` until
// its import is committed. A real package lives in JOBS_DIR and never shows in the repo's git status.

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildRecord, projectRecord } from "../../import/report.mjs";
import { applyOp, PROPOSAL_NAME_RE } from "../../system/canvas-ops.mjs";
import { ADMIT_CLASS_RE, ADMIT_TAGS, checkAdmitted } from "../../system/templates.admitted.mjs";
import { foldLedger, loadBuild, loadDecisions, positionsOf, saveConflict, saveRun } from "./canvas-store.mjs";
import { REPO_DIR } from "./env.mjs";
import { isRunInFlight, jsonText, sortKeys, underLock, underRoot } from "./import-run.mjs";

// --- the fixed argv -------------------------------------------------------------------------------

// D4. The pack prefix is drift-check's order (genHandoff → genVocabulary → genPackBundle → genPackIndex, the
// index last because it MEASURES the other three, #419). Step 8 gains `--worktree-files <the writes>` and step
// 10 `--loc-worktree-files <the same>` at run time; nothing else is ever appended, and nothing from a request.
export const CHAIN = Object.freeze([
  Object.freeze(["agent-layer/gen-handoff.mjs"]),
  Object.freeze(["agent-layer/gen-vocabulary.mjs"]),
  Object.freeze(["agent-layer/gen-pack-bundle.mjs"]),
  Object.freeze(["agent-layer/gen-pack-index.mjs"]),
  Object.freeze(["agent-layer/gen-system-graph.mjs"]),
  Object.freeze(["import/regen-expected.mjs"]),
  Object.freeze(["tooling/regen-import-records.mjs"]),
  Object.freeze(["agent-layer/gen-loc-summary.mjs"]),
  Object.freeze(["tooling/token-lint.mjs"]),
  Object.freeze(["tooling/build-checks.mjs"]),
]);

// D5. (1) tracked changes anywhere but prose; (2) untracked files in the code dirs. `:(exclude,glob)*.md` matches
// ROOT-level .md only (glob `*` stops at `/`) — deliberate: a spec under system/specs/ is code here, not prose.
export const CLEAN_GUARD = Object.freeze([
  Object.freeze(["status", "--porcelain", "-uno", "--", ".", ":(exclude).claude", ":(exclude).agents", ":(exclude)docs", ":(exclude,glob)*.md"]),
  Object.freeze(["status", "--porcelain", "-unormal", "--", "system", "handoff", "import", "agent-layer", "portal", "tooling", "discovery", "proto", "scenarios", "worker"]),
]);

export const STEP_TIMEOUT_MS = 120_000;

export const CHECKLIST = Object.freeze([
  "Ratify commits nothing. Read the diff, then commit it yourself.",
  "Every admission changes /components at rest: after committing, regenerate its baselines from a clean worktree — `cd tooling/visual-regression && npm run update:docker` (neutral, saulera, verdant).",
  "If system/loc-summary.json changed, regenerate the approach baselines in the same commit.",
  "CI's verify job runs drift-check on the committed tree; ratify cannot run it on a dirty one.",
]);

// The anchor files every plan reads, repo-relative. A container's spec is added per choice.
export const ANCHORS = Object.freeze({
  registry: "system/templates.admitted.mjs",
  palette: "system/palette.mjs",
  pin: "tooling/build-checks.mjs",
  css: "system/components.css",
});

// --- the owner's input, validated at the boundary ------------------------------------------------

const PROP_NAME_RE = /^[a-z][a-zA-Z0-9]{0,31}$/;
const STATE_RE = /^[a-z][a-z0-9-]{0,23}$/;
const SUFFIX_RE = /^-[a-z][a-z0-9-]{0,23}$/;
const CSS_PROP_RE = /^[a-z-]+$/;
const CSS_VALUE_RE = /^var\(--[a-z0-9-]+\)(?: var\(--[a-z0-9-]+\))*$/;
const ATTR_RE = /^data-[a-z][a-z0-9-]*$/;
// A prose line that would open a heading or a fence inside the spec's four sections.
const PROSE_BAD_RE = /^[ \t]*(?:#|```)/m;
const CONTROL_RE = /[\x00-\x1f\x7f\u2028\u2029]/;
const PROP_TYPES = Object.freeze(["string", "number", "boolean"]);
const INPUT_KEYS = Object.freeze(["component", "prefix", "props", "states", "stateNotes", "usage", "accessibility", "structure", "containers", "css", "example", "licence", "attribution"]);

const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const bad = (where, msg) => { throw new Error(`ratify: input.${where} ${msg}`); };

function prose(v, where, { required = true, max = 4000 } = {}) {
  if (v == null || v === "") { if (required) bad(where, "is required"); return; }
  if (typeof v !== "string") bad(where, "must be a string");
  if (required && !v.trim()) bad(where, "is required");
  if (v.length > max) bad(where, `is longer than ${max} characters`);
  if (PROSE_BAD_RE.test(v)) bad(where, "has a line starting with # or a fence (```) — it would break the spec's four sections; write it as plain prose");
}

const typeOk = (t, v) => (t === "number" ? typeof v === "number" && Number.isFinite(v) : typeof v === t);

// The line every provenance carries: the registry's (≤ 200, checkAdmitted's rule) and the spec's Usage opener.
export function provenanceLine(record, input) {
  const src = record.source ?? {};
  const from = `imported from ${src.tool ?? "an unknown tool"}${src.file ? ` (${src.file})` : ""}`;
  return `${from}, licence: ${input.licence}${input.attribution ? `; attribution: ${input.attribution}` : ""}`;
}

// checkInput(input, ctx, record) → the admitted definition (ratify's registry entry), or throws naming the path.
// ctx = { vocabNames, vocabClasses, containerNames, proposals, contractTokens, run, cssClasses }.
export function checkInput(input, ctx, record) {
  if (!plain(input)) throw new Error("ratify: input must be an object");
  for (const k of Object.keys(input)) if (!INPUT_KEYS.includes(k)) bad(k, `is not an input field — the form sends ${INPUT_KEYS.join(", ")}`);
  const { component, prefix } = input;
  if (typeof component !== "string" || !PROPOSAL_NAME_RE.test(component)) bad("component", `${JSON.stringify(component)} is not a component name — lowercase letters, digits and hyphens, 2–40, starting with a letter`);
  if (ctx.vocabNames.includes(component)) bad("component", `"${component}" is already a vocabulary component`);
  if ((ctx.proposals ?? []).some((p) => p && p.component === component)) bad("component", `"${component}" is already another proposal's component`);
  if (prefix !== "ds" && prefix !== "vd") bad("prefix", `${JSON.stringify(prefix)} must be "ds" or "vd"`);
  const cls = `${prefix}-${component}`;
  if (!ADMIT_CLASS_RE.test(cls)) bad("component", `gives the class ${JSON.stringify(cls)}, which is not a component class`);
  if (ctx.vocabClasses.includes(cls)) bad("component", `gives the class "${cls}", which a vocabulary component already carries`);
  if ((ctx.cssClasses ?? []).includes(cls)) bad("component", `gives the class "${cls}", which system/components.css already styles`);

  if (!plain(input.props)) bad("props", "must be an object of prop name → { type, required, enum?, description }");
  for (const [name, p] of Object.entries(input.props)) {
    const at = `props.${name}`;
    if (!PROP_NAME_RE.test(name)) bad(at, "is not a prop name — a lowercase letter, then letters and digits, up to 32");
    if (!plain(p)) bad(at, "must be an object");
    for (const k of Object.keys(p)) if (!["type", "required", "enum", "description"].includes(k)) bad(`${at}.${k}`, "is not a prop key");
    if (!PROP_TYPES.includes(p.type)) bad(`${at}.type`, `${JSON.stringify(p.type)} must be one of ${PROP_TYPES.join(", ")}`);
    if (typeof p.required !== "boolean") bad(`${at}.required`, "must be true or false");
    if (p.enum !== undefined && (!Array.isArray(p.enum) || !p.enum.length || !p.enum.every((v) => typeOk(p.type, v)) || new Set(p.enum).size !== p.enum.length)) {
      bad(`${at}.enum`, `must be a non-empty list of distinct ${p.type} values`);
    }
    prose(p.description, `${at}.description`, { max: 400 });
  }

  if (!Array.isArray(input.states) || !input.states.length) bad("states", "must be a non-empty list");
  input.states.forEach((s, i) => { if (typeof s !== "string" || !STATE_RE.test(s)) bad(`states[${i}]`, `${JSON.stringify(s)} is not a state name`); });
  if (new Set(input.states).size !== input.states.length) bad("states", "names a state twice");
  if (!plain(input.stateNotes)) bad("stateNotes", "must be an object of state → note");
  for (const k of Object.keys(input.stateNotes)) if (!input.states.includes(k)) bad(`stateNotes.${k}`, "is not one of the states");
  for (const s of input.states) prose(input.stateNotes[s], `stateNotes.${s}`, { max: 800 });
  prose(input.usage, "usage");
  prose(input.accessibility, "accessibility");
  if (typeof input.licence !== "string" || !input.licence.trim()) bad("licence", "is required — whose drawing this is and on what terms");
  prose(input.licence, "licence", { max: 120 });
  prose(input.attribution, "attribution", { required: false, max: 120 });
  // The record's source names reach the spec's Usage line unchecked by prose(), so a line break there is refused (PR #492 F1).
  for (const k of ["file", "tool"]) {
    const v = record.source?.[k];
    if (typeof v === "string" && CONTROL_RE.test(v)) throw new Error(`ratify: record.source.${k} ${JSON.stringify(v)} carries a line break or control character — it would reach the spec as a line of its own; import the file again under a plain name`);
  }
  if (provenanceLine(record, input).length > 200) bad("licence", "and attribution together make the provenance line longer than 200 characters — shorten one");

  const st = input.structure;
  if (!plain(st)) bad("structure", "must be an object { tag, slots, children, allowedChildren? }");
  for (const k of Object.keys(st)) if (!["tag", "slots", "children", "allowedChildren"].includes(k)) bad(`structure.${k}`, "is not a structure key");
  if (!ADMIT_TAGS.includes(st.tag)) bad("structure.tag", `${JSON.stringify(st.tag)} is not one of ${ADMIT_TAGS.join(", ")} — a part that needs another element is admitted by hand`);
  if (!Array.isArray(st.slots)) bad("structure.slots", "must be a list");
  const suffixes = [];
  const slots = st.slots.map((s, i) => {
    const at = `structure.slots[${i}]`;
    if (!plain(s)) bad(at, "must be an object");
    if (typeof s.prop !== "string" || !Object.hasOwn(input.props, s.prop)) bad(`${at}.prop`, `${JSON.stringify(s.prop)} is not one of the props`);
    if (s.as === "text") {
      for (const k of Object.keys(s)) if (!["prop", "as", "tag", "suffix"].includes(k)) bad(`${at}.${k}`, "is not a key of a text slot");
      if (typeof s.suffix !== "string" || !SUFFIX_RE.test(s.suffix)) bad(`${at}.suffix`, `${JSON.stringify(s.suffix)} is not a class suffix like -name`);
      if (suffixes.includes(s.suffix)) bad(`${at}.suffix`, `"${s.suffix}" is already another slot's`);
      suffixes.push(s.suffix);
      // A slot class components.css already styles would be restyled by the appended block (PR #492 F3).
      if (ctx.vocabClasses.includes(`${cls}${s.suffix}`) || (ctx.cssClasses ?? []).includes(`${cls}${s.suffix}`)) {
        bad(`${at}.suffix`, `gives the class "${cls}${s.suffix}", which system/components.css already styles`);
      }
      return { prop: s.prop, as: "text", tag: s.tag, class: `${cls}${s.suffix}` };
    }
    if (s.as === "attr") {
      for (const k of Object.keys(s)) if (!["prop", "as", "attr"].includes(k)) bad(`${at}.${k}`, "is not a key of an attr slot");
      if (typeof s.attr !== "string" || !ATTR_RE.test(s.attr)) bad(`${at}.attr`, `${JSON.stringify(s.attr)} is not a data-* attribute`);
      return { prop: s.prop, as: "attr", attr: s.attr };
    }
    return bad(`${at}.as`, `${JSON.stringify(s.as)} must be "text" or "attr" — a shape these cannot express is admitted by hand`);
  });
  if (st.children !== "none" && st.children !== "many") bad("structure.children", `${JSON.stringify(st.children)} must be "none" or "many"`);
  if (st.children === "many") {
    const ac = st.allowedChildren;
    if (!Array.isArray(ac) || !ac.length) bad("structure.allowedChildren", "must name at least one vocabulary component when children is many");
    ac.forEach((n, i) => { if (!ctx.vocabNames.includes(n)) bad(`structure.allowedChildren[${i}]`, `${JSON.stringify(n)} is not a vocabulary component`); });
    if (new Set(ac).size !== ac.length) bad("structure.allowedChildren", "names a component twice");
  } else if (st.allowedChildren !== undefined && !(Array.isArray(st.allowedChildren) && !st.allowedChildren.length)) {
    bad("structure.allowedChildren", "is only for children: many");
  }

  if (!Array.isArray(input.containers) || !input.containers.length) bad("containers", "must name at least one container — a part no container allows cannot be placed in any screen");
  input.containers.forEach((c, i) => { if (!ctx.containerNames.includes(c)) bad(`containers[${i}]`, `${JSON.stringify(c)} is not a container (${ctx.containerNames.join(", ")})`); });
  if (new Set(input.containers).size !== input.containers.length) bad("containers", "names a container twice");

  if (!Array.isArray(input.css) || !input.css.length) bad("css", "must hold at least the root rule");
  const seen = new Set();
  input.css.forEach((r, i) => {
    const at = `css[${i}]`;
    if (!plain(r)) bad(at, "must be an object { suffix, decls }");
    for (const k of Object.keys(r)) if (!["suffix", "decls"].includes(k)) bad(`${at}.${k}`, "is not a rule key");
    if (r.suffix !== "" && !suffixes.includes(r.suffix)) bad(`${at}.suffix`, `${JSON.stringify(r.suffix)} is not "" (the root) or a text slot's suffix (${suffixes.join(", ") || "none"})`);
    if (seen.has(r.suffix)) bad(`${at}.suffix`, `${JSON.stringify(r.suffix)} has a rule already`);
    seen.add(r.suffix);
    if (!Array.isArray(r.decls)) bad(`${at}.decls`, "must be a list of [property, value]");
    r.decls.forEach((d, j) => {
      const dat = `${at}.decls[${j}]`;
      if (!Array.isArray(d) || d.length !== 2) bad(dat, "must be [property, value]");
      if (typeof d[0] !== "string" || !CSS_PROP_RE.test(d[0])) bad(`${dat}[0]`, `${JSON.stringify(d[0])} is not a CSS property`);
      if (typeof d[1] !== "string" || !CSS_VALUE_RE.test(d[1])) bad(`${dat}[1]`, `${JSON.stringify(d[1])} is not one or more var(--token) — a component block carries contract tokens only, never a literal`);
      for (const t of d[1].match(/--[a-z0-9-]+/g)) if (!ctx.contractTokens.includes(t)) bad(`${dat}[1]`, `${t} is not a contract token`);
    });
  });
  const root = input.css.find((r) => r.suffix === "");
  if (!root || !root.decls.length) bad("css", "has no root declaration — the part must carry at least one contract token (the drafted root carried none)");

  if (!plain(input.example)) bad("example", "must be an object of prop → value");
  for (const [k, v] of Object.entries(input.example)) {
    const p = input.props[k];
    if (!p) bad(`example.${k}`, "is not one of the props");
    if (!typeOk(p.type, v)) bad(`example.${k}`, `must be a ${p.type}`);
    if (p.enum && !p.enum.includes(v)) bad(`example.${k}`, `${JSON.stringify(v)} is not in its enum`);
  }
  for (const [k, p] of Object.entries(input.props)) if (p.required && !Object.hasOwn(input.example, k)) bad(`example.${k}`, "is missing — it is a required prop");

  const def = {
    tag: st.tag, class: cls, slots, children: st.children,
    provenance: { from: "import", record: record.id, run: ctx.run, line: provenanceLine(record, input) },
  };
  checkAdmitted(component, def, specHead(input));
  return def;
}

// --- the renderers (pure) -------------------------------------------------------------------------

const tokensOf = (input) => {
  const out = [];
  for (const r of input.css) for (const [, v] of r.decls) for (const t of v.match(/--[a-z0-9-]+/g)) if (!out.includes(t)) out.push(t);
  return out;
};

// The spec head, kb-format.md's shape (D10). Ordered keys; props in the owner's order.
export function specHead(input) {
  const many = input.structure?.children === "many";
  return {
    component: input.component,
    status: "shipped",
    class: `${input.prefix}-${input.component}`,
    contract: null,
    props: Object.fromEntries(Object.entries(input.props).map(([n, p]) => [n, {
      type: p.type, required: p.required, ...(p.enum ? { enum: p.enum } : {}), description: p.description,
    }])),
    tokens: tokensOf(input),
    states: input.states,
    children: many ? [...input.structure.allowedChildren].sort() : [],
    ...(many ? { childrenCardinality: "many" } : {}),
    example: input.example,
  };
}

// One-line JSON in the specs' spaced style ({ "type": "string", "enum": ["a", "b"] }), built structurally so a
// string value is always JSON.stringify's own bytes.
const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(", ")}]`
  : plain(v) ? (Object.keys(v).length ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }` : "{}")
    : JSON.stringify(v));

export function renderSpec(input, { record, run }) {
  const h = specHead(input);
  const lines = ["```json", "{"];
  const entries = Object.entries(h);
  entries.forEach(([k, v], i) => {
    const comma = i < entries.length - 1 ? "," : "";
    if (k === "props") {
      const ps = Object.entries(v);
      if (!ps.length) { lines.push(`  "props": {}${comma}`); return; }
      lines.push('  "props": {');
      ps.forEach(([n, p], j) => lines.push(`    ${JSON.stringify(n)}: ${inline(p)}${j < ps.length - 1 ? "," : ""}`));
      lines.push(`  }${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${inline(v)}${comma}`);
    }
  });
  lines.push("}", "```", "");
  return [
    ...lines,
    "## Usage",
    "",
    `Admitted by ratify (portal/lib/ratify.mjs) from import record \`${record.id}\` in run \`${run}\`: ${provenanceLine(record, input)}.`,
    "",
    input.usage.trim(),
    "",
    "## States",
    "",
    ...input.states.map((s) => `- **${s}** — ${input.stateNotes[s].trim()}`),
    "",
    "## Data binding",
    "",
    "`contract: null` — presentational. No record binds here; the composition supplies every prop.",
    "",
    "## Accessibility",
    "",
    input.accessibility.trim(),
    "",
  ].join("\n");
}

// The CSS block, in the header form components.css's library primitives use (:2496's).
export function renderCssBlock(input, { record }) {
  const cls = `${input.prefix}-${input.component}`;
  const out = ["", `/* ---------- ${cls} (system/specs/${input.component}.md) — admitted by ratify from import ${record.id} ---------- */`];
  for (const r of input.css) {
    out.push(`.${cls}${r.suffix} {`, ...r.decls.map(([k, v]) => `  ${k}: ${v};`), "}");
  }
  return `${out.join("\n")}\n`;
}

// --- the rewriters (pure; each refuses unless its anchor matches exactly once) ---------------------

const REG_BEGIN = "// ---- BEGIN ADMITTED (portal/lib/ratify.mjs rewrites the JSON below; never edit by hand) ----";
const REG_END = "// ---- END ADMITTED ----";
const REG_OPEN = "export const ADMITTED = deepFreeze(";
const count = (text, needle) => text.split(needle).length - 1;

export function rewriteRegistry(text, name, def) {
  for (const m of [REG_BEGIN, REG_END]) {
    if (count(text, m) !== 1) throw new Error(`ratify: ${ANCHORS.registry} carries the marker "${m}" ${count(text, m)} times — exactly once, or the registry is not machine-editable`);
  }
  const a = text.indexOf(REG_BEGIN) + REG_BEGIN.length;
  const b = text.indexOf(REG_END);
  if (b < a) throw new Error(`ratify: ${ANCHORS.registry}'s END marker precedes its BEGIN marker`);
  const between = text.slice(a, b);
  const lines = between.split("\n");
  const open = lines.findIndex((l) => l === REG_OPEN);
  const close = lines.findIndex((l, i) => i > open && l === ");");
  if (open < 0 || close < 0 || lines.filter((l) => l === REG_OPEN).length !== 1) {
    throw new Error(`ratify: ${ANCHORS.registry} has no single "${REG_OPEN}" … ");" block between its markers`);
  }
  let reg;
  try { reg = JSON.parse(lines.slice(open + 1, close).join("\n")); }
  catch (e) { throw new Error(`ratify: ${ANCHORS.registry}'s registry JSON does not parse — ${e.message}`); }
  if (!plain(reg)) throw new Error(`ratify: ${ANCHORS.registry}'s registry is not an object`);
  if (Object.hasOwn(reg, name)) throw new Error(`ratify: ${ANCHORS.registry} already admits "${name}"`);
  const next = sortKeys({ ...reg, [name]: def });
  const body = [...lines.slice(0, open + 1), JSON.stringify(next, null, 2), ...lines.slice(close)].join("\n");
  return text.slice(0, a) + body + text.slice(b);
}

const PALETTE_OPEN = "export const CATALOG_COMPONENTS = [";
export function rewritePalette(text, name) {
  if (count(text, PALETTE_OPEN) !== 1) throw new Error(`ratify: ${ANCHORS.palette} carries "${PALETTE_OPEN}" ${count(text, PALETTE_OPEN)} times — exactly once`);
  const lines = text.split("\n");
  const open = lines.indexOf(PALETTE_OPEN);
  const close = lines.findIndex((l, i) => i > open && l === "];");
  if (open < 0 || close < 0) throw new Error(`ratify: ${ANCHORS.palette}'s CATALOG_COMPONENTS is not one name per line, closed by "];"`);
  const names = lines.slice(open + 1, close).map((l) => {
    const m = l.match(/^ {2}"([a-z0-9-]+)",$/);
    if (!m) throw new Error(`ratify: ${ANCHORS.palette} line ${JSON.stringify(l)} inside CATALOG_COMPONENTS is not one quoted name`);
    return m[1];
  });
  if (names.includes(name)) throw new Error(`ratify: ${ANCHORS.palette} already lists "${name}"`);
  const at = names.findIndex((n) => n > name);
  const idx = open + 1 + (at < 0 ? names.length : at);
  lines.splice(idx, 0, `  "${name}",`);
  return lines.join("\n");
}

const PIN_RE = /^ {2}const WRAPPER_PIN = \{ with: (\d+), without: (\d+) \}; \/\/ ratify-pin\b.*$/gm;
const REASONS_LINE = "  const WRAPPER_PIN_REASONS = [ // ratify-reasons";
export function rewritePin(text, reasonFor) {
  const pins = [...text.matchAll(PIN_RE)];
  if (pins.length !== 1) throw new Error(`ratify: ${ANCHORS.pin} carries the // ratify-pin line ${pins.length} times — exactly once`);
  if (count(text, `${REASONS_LINE}\n`) !== 1) throw new Error(`ratify: ${ANCHORS.pin} carries the // ratify-reasons line ${count(text, `${REASONS_LINE}\n`)} times — exactly once`);
  const w = Number(pins[0][1]);
  const from = Number(pins[0][2]);
  const to = from + 1;
  const reason = reasonFor(w, from, to);
  let out = text.replace(PIN_RE, (line) => line.replace(`{ with: ${w}, without: ${from} }`, `{ with: ${w}, without: ${to} }`));
  const lines = out.split("\n");
  const open = lines.indexOf(REASONS_LINE);
  const close = lines.findIndex((l, i) => i > open && l === "  ];");
  if (close < 0) throw new Error(`ratify: ${ANCHORS.pin}'s WRAPPER_PIN_REASONS is not closed by "  ];"`);
  lines.splice(close, 0, `    ${JSON.stringify(reason)},`);
  out = lines.join("\n");
  return { text: out, from: `${w}/${from}`, to: `${w}/${to}`, reason };
}

const CHILDREN_RE = /^ {2}"children": \[(.*)\],$/gm;
export function rewriteContainerChildren(text, container, name) {
  const at = `system/specs/${container}.md`;
  const hits = [...text.matchAll(CHILDREN_RE)];
  if (hits.length !== 1) throw new Error(`ratify: ${at} carries the head's "children" line ${hits.length} times — exactly once`);
  let list;
  try { list = JSON.parse(`[${hits[0][1]}]`); } catch (e) { throw new Error(`ratify: ${at}'s "children" line does not parse — ${e.message}`); }
  if (list.includes(name)) throw new Error(`ratify: ${at} already allows "${name}"`);
  const i = list.findIndex((n) => n > name);
  list.splice(i < 0 ? list.length : i, 0, name);
  return text.replace(CHILDREN_RE, `  "children": [${list.map((n) => JSON.stringify(n)).join(", ")}],`);
}

// --- the plan and its hash ------------------------------------------------------------------------

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const ratifyHash = (obj) => sha256(JSON.stringify(sortKeys(obj)));
const lineCount = (s) => s.split("\n").length;

// planRatify → { writes: [{path, kind, bytes}], pin, palette, containers, chain, hash, def }. Pure.
// `files` holds the current text of the four ANCHORS and of `system/specs/<c>.md` for every chosen container.
// Every ds-/vd- class a selector in components.css names: vocabulary roots, hand-written sub-element classes and
// earlier admissions' slot classes alike.
const classesOf = (css) => [...new Set([...css.matchAll(/\.((?:ds|vd)-[a-z0-9-]+)/g)].map((m) => m[1]))];

export function planRatify({ head, run, proposal, record, drafts, input, files, ctx }) {
  if (typeof head !== "string" || !/^[0-9a-f]{40}$/.test(head)) throw new Error(`ratify: HEAD ${JSON.stringify(head)} is not a commit sha`);
  const need = (p) => { if (typeof files[p] !== "string") throw new Error(`ratify: the plan needs the text of ${p}`); return files[p]; };
  const def = checkInput(input, { ...ctx, run, cssClasses: classesOf(need(ANCHORS.css)) }, record);
  const name = input.component;
  const pin = rewritePin(need(ANCHORS.pin), (w, n, n1) =>
    `${w}/${n} → ${w}/${n1}: ${name} admitted by ratify from import ${record.id} (run ${run}) — wrapper-less, no vd-${name} custom element, so its absent vd/react tabs are honest`);
  const writes = [
    { path: `system/specs/${name}.md`, kind: "create", bytes: renderSpec(input, { record, run }) },
    { path: ANCHORS.css, kind: "append", bytes: need(ANCHORS.css) + renderCssBlock(input, { record }) },
    { path: ANCHORS.registry, kind: "rewrite", bytes: rewriteRegistry(need(ANCHORS.registry), name, def) },
    { path: ANCHORS.palette, kind: "rewrite", bytes: rewritePalette(need(ANCHORS.palette), name) },
    { path: ANCHORS.pin, kind: "rewrite", bytes: pin.text },
    // The container name passed checkInput's containerNames test before it became a path.
    ...input.containers.map((c) => ({ path: `system/specs/${c}.md`, kind: "rewrite", bytes: rewriteContainerChildren(need(`system/specs/${c}.md`), c, name) })),
  ];
  const withLines = writes.map((w) => ({ ...w, lines: w.kind === "create" ? lineCount(w.bytes) : lineCount(w.bytes) - lineCount(files[w.path]) }));
  const hash = ratifyHash({
    head, proposalId: proposal.id,
    recordSha: sha256(jsonText(sortKeys(record))),
    draftsSha: sha256(JSON.stringify(sortKeys(drafts))),
    input,
    writes: writes.map((w) => ({ path: w.path, kind: w.kind, sha256: sha256(w.bytes) })),
  });
  return {
    writes: withLines,
    pin: { from: pin.from, to: pin.to, reason: pin.reason },
    palette: { insert: name },
    containers: [...input.containers],
    chain: CHAIN.map((c) => c.join(" ")),
    hash,
    def,
  };
}

// --- the impure half ------------------------------------------------------------------------------

export const gitRun = (argv, { cwd }) => execFileSync("git", argv, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// One chain step: a fresh node child, fixed argv, cwd repoDir, SIGKILL at the timeout. → { code, ms, tail }.
export function spawnStep(script, args, { cwd, timeoutMs = STEP_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [path.join(cwd, script), ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const done = (code) => {
      clearTimeout(timer);
      // The last 20 lines, led by every failure line a gate printed earlier (build-checks names its ✗ groups and
      // their · reasons far above its last line), so a red step's cause is in the answer, not only in the tree.
      const lines = out.trimEnd().split("\n");
      const last = lines.slice(-20);
      const failed = lines.slice(0, -20).filter((l) => /^build .{1,24}✗|^ {4}· /.test(l)).slice(0, 40);
      const tail = [...failed, ...last].join("\n");
      resolve({ code: timedOut ? null : code, ms: Date.now() - t0, tail: timedOut ? `${tail}\n(killed after ${Math.round(timeoutMs / 1000)} s)` : tail });
    };
    child.on("error", (e) => { out += `\n${e.message}`; done(-1); });
    child.on("close", done);
  });
}

const readText = (repoDir, rel) => readFileSync(underRoot(repoDir, rel), "utf8");

// The contract tokens, as declared (`--x:`) in system/tokens.contract.css — token-lint's population.
export const contractTokensOf = (css) => [...new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))];

// Everything a plan reads, from `repoDir` (never through loadInputs, which is bound to REPO_DIR) and the package.
function readState({ pkgRoot, name, input, repoDir, git }) {
  const buildRoot = path.join(pkgRoot, "build");
  const pkg = loadBuild(buildRoot);
  if (!pkg) return { refused: { kind: "no-build", message: `This package has no build (${buildRoot}).`, action: { label: "Open another run" } } };
  const { doc } = foldLedger(pkg.ops);
  const proposal = (doc.proposals ?? []).find((p) => p && p.name === name);
  if (!proposal) return { refused: { kind: "no-proposal", message: `No proposal named "${name}" in this package.`, action: { label: "Import again" } } };
  const record = JSON.parse(readFileSync(underRoot(buildRoot, `imports/${proposal.recordId}.json`), "utf8"));
  const drafts = Object.fromEntries(["spec.md", "block.css", "template.txt"].map((f) => [f, readFileSync(underRoot(buildRoot, `proposals/${name}/${f}`), "utf8")]));
  const vocab = JSON.parse(readText(repoDir, "handoff/verdant/vocabulary.json"));
  const comps = vocab.components ?? {};
  const ctx = {
    vocabNames: Object.keys(comps),
    vocabClasses: Object.values(comps).map((c) => c.class),
    containerNames: Object.keys(comps).filter((n) => comps[n].childrenCardinality === "many"),
    proposals: doc.proposals ?? [],
    contractTokens: contractTokensOf(readText(repoDir, "system/tokens.contract.css")),
  };
  const files = {};
  for (const rel of Object.values(ANCHORS)) files[rel] = readText(repoDir, rel);
  const containers = plain(input) && Array.isArray(input.containers) ? input.containers : [];
  for (const c of containers) if (ctx.containerNames.includes(c)) files[`system/specs/${c}.md`] = readText(repoDir, `system/specs/${c}.md`);
  const head = git(["rev-parse", "HEAD"], { cwd: repoDir }).trim();
  return { buildRoot, pkg, doc, proposal, record, drafts, ctx, files, head, run: path.basename(pkgRoot) };
}

function dirty({ repoDir, git }) {
  const lines = CLEAN_GUARD.flatMap((argv) => git([...argv], { cwd: repoDir }).split("\n").filter((l) => l.trim()));
  return lines.length ? { refused: {
    kind: "dirty",
    message: "Uncommitted code changes — ratify runs every gate over the whole tree and shows only its own writes, so commit or revert these first.",
    detail: lines.join("\n"), action: { label: "Show the files" },
  } } : null;
}

const ICONS_DIR = "tooling/icons/node_modules/@phosphor-icons/core/assets/regular";
const noIcons = (repoDir) => (existsSync(path.join(repoDir, ICONS_DIR)) ? null : { refused: {
  kind: "setup", message: `${ICONS_DIR} is missing, so build-checks group 41 would red at the last step.`,
  action: { label: "Install the icon package", hint: "cd tooling/icons && npm ci" },
} });

// The applier's refusals and checkInput's are the owner's to read: data, not a 500.
function plannedOrRefused(state, input) {
  try {
    applyOp(state.doc, { op: "proposal.ratify", params: { proposalId: state.proposal.id, component: input?.component } });
    return planRatify({ head: state.head, run: state.run, proposal: state.proposal, record: state.record, drafts: state.drafts, input, files: state.files, ctx: state.ctx });
  } catch (e) {
    return { refused: { kind: "invalid", message: e.message, action: { label: "Fix the form, then preview again" } } };
  }
}

const shown = (plan) => ({
  writes: plan.writes.map(({ path: p, kind, lines }) => ({ path: p, kind, lines })),
  pin: plan.pin, palette: plan.palette, containers: plan.containers, chain: plan.chain,
});

export async function previewRatify({ pkgRoot, name, input, repoDir = REPO_DIR, git = gitRun }) {
  // A run in flight (a confirm mid-chain, an import, a composition, a compose turn) is why the tree looks dirty, so it
  // answers busy (PR #492 F6).
  if (isRunInFlight()) return { refused: { kind: "busy", message: "A run (a ratify, an import, a composition or a compose turn) is in flight — wait for it to finish, then preview again.", action: { label: "Wait, then try again" } } };
  const d = dirty({ repoDir, git });
  if (d) return d;
  const ni = noIcons(repoDir);
  if (ni) return ni;
  const state = readState({ pkgRoot, name, input, repoDir, git });
  if (state.refused) return state;
  const plan = plannedOrRefused(state, input);
  if (plan.refused) return plan;
  return { plan: shown(plan), hash: plan.hash, checklist: CHECKLIST };
}

const porcelain = (repoDir, git) => git(["status", "--porcelain", "-unormal"], { cwd: repoDir }).split("\n").filter((l) => l.trim());
// A path the revert command may name as-is: tested against an allowlist, never escaped. Anything else (git quotes a
// path with special characters in porcelain, and a rename prints `a -> b`) is left for a revert by hand, by name.
const PLAIN_PATH_RE = /^[A-Za-z0-9._/-]+$/;

function diffOf({ repoDir, git, before, writes }) {
  const after = porcelain(repoDir, git);
  const mine = after.filter((l) => !before.includes(l));
  // `git diff` covers tracked files only: a file the writes or the chain create appears in `changed` (porcelain's
  // ??), and ratify's own created spec is carried whole in `created` (PR #492 F4).
  const full = git(["diff"], { cwd: repoDir });
  const CAP = 200_000;
  return {
    porcelain: after,
    changed: mine,
    stat: git(["diff", "--stat"], { cwd: repoDir }),
    diff: full.length > CAP ? full.slice(0, CAP) : full,
    truncated: full.length > CAP,
    created: writes.filter((w) => w.kind === "create").map((w) => ({ path: w.path, text: w.bytes })),
  };
}

function revertOf(changed) {
  const paths = changed.map((l) => ({ created: l.startsWith("??"), path: l.slice(3) }));
  const plainOnes = paths.filter((p) => PLAIN_PATH_RE.test(p.path));
  const byHand = paths.filter((p) => !PLAIN_PATH_RE.test(p.path)).map((p) => p.path);
  const tracked = plainOnes.filter((p) => !p.created).map((p) => p.path);
  const created = plainOnes.filter((p) => p.created).map((p) => p.path);
  return [tracked.length ? `git checkout -- ${tracked.join(" ")}` : null, created.length ? `rm -r ${created.join(" ")}` : null,
    byHand.length ? `# and revert by hand: ${byHand.join(", ")}` : null].filter(Boolean).join(" && ");
}

// runRatify — the confirm. Everything under the one run lock; a held lock is a `busy` refusal.
export async function runRatify({ pkgRoot, name, input, hash, base, repoDir = REPO_DIR, now, runStep = spawnStep, git = gitRun }) {
  return underLock(async () => {
    const buildRoot = path.join(pkgRoot, "build");
    const conflict = saveConflict(buildRoot, base);
    if (conflict) throw new Error(conflict);
    // Dirty BEFORE the hash: a dirty tree answers `dirty` whatever hash is sent.
    const d = dirty({ repoDir, git });
    if (d) return d;
    const ni = noIcons(repoDir);
    if (ni) return ni;
    const state = readState({ pkgRoot, name, input, repoDir, git });
    if (state.refused) return state;
    const plan = plannedOrRefused(state, input);
    if (plan.refused) return plan;
    if (hash !== plan.hash) {
      return { refused: { kind: "stale", message: "The plan changed since the preview (HEAD, the proposal or the form) — preview again.",
        detail: `sent ${JSON.stringify(hash ?? null)}, now ${plan.hash}`, action: { label: "Preview again" } } };
    }
    // Every target resolved under repoDir BEFORE the first byte.
    const targets = plan.writes.map((w) => ({ ...w, abs: underRoot(repoDir, w.path) }));
    const before = porcelain(repoDir, git);
    // From the first byte on, a throw answers with the error and the revert command rather than a bare 500 (PR #492
    // F2). After the op is appended the chain was green and the files are the admission, so no revert is offered.
    const gates = [];
    let appended = false;
    try {
      for (const w of targets) {
        mkdirSync(path.dirname(w.abs), { recursive: true });
        writeFileSync(w.abs, w.bytes);
      }
      const written = plan.writes.map((w) => w.path).join(",");
      let red = false;
      for (const [script, ...fixed] of CHAIN) {
        const args = [...fixed];
        if (script === "agent-layer/gen-loc-summary.mjs") args.push("--worktree-files", written);
        if (script === "tooling/build-checks.mjs") args.push("--loc-worktree-files", written);
        const r = await runStep(script, args, { cwd: repoDir });
        gates.push({ step: script, code: r.code, ms: r.ms, tail: r.tail });
        if (r.code !== 0) { red = true; break; }
      }
      const diff = diffOf({ repoDir, git, before, writes: plan.writes });
      if (red) return { gatesRed: true, component: input.component, gates, diff, revert: revertOf(diff.changed), checklist: CHECKLIST };

      // Green: the op, then the record — both only now (invariant 7).
      const params = { proposalId: state.proposal.id, component: input.component };
      const pkg = loadBuild(buildRoot);
      saveRun(pkgRoot, { base: pkg.ops.length, ops: [{ op: "proposal.ratify", params, status: "applied" }], positions: positionsOf(pkg.canvas), decisions: loadDecisions(pkgRoot) },
        now ? { now } : undefined);
      appended = true;
      const ops = loadBuild(buildRoot).ops;
      const proposedAt = ops.find((l) => l.op === "component.propose" && l.params?.name === name && l.status === "applied")?.at;
      const ratifiedAt = ops[ops.length - 1].at;
      const ms = Date.parse(ratifiedAt) - Date.parse(proposedAt);
      const r = state.record;
      const record = buildRecord({
        id: r.id, source: r.source, ir: r.ir, recognition: r.recognition, mapping: r.mapping,
        fidelity: r.fidelity.deltaEMin ? { wcag: r.fidelity.wcag, deltaEMin: r.fidelity.deltaEMin } : { wcag: r.fidelity.wcag },
        provenance: { ...r.provenance, licence: input.licence.trim(), attribution: input.attribution?.trim() || r.provenance.attribution || null },
        elapsed: { ...r.elapsed, ratify: Number.isFinite(ms) ? ms : null },
        ...(Object.hasOwn(r, "suggestions") ? { suggestions: r.suggestions } : {}),
      });
      writeFileSync(underRoot(buildRoot, `imports/${r.id}.json`), jsonText(sortKeys(record)));
      writeFileSync(underRoot(buildRoot, `imports/${r.id}.md`), projectRecord(record));
      return { ok: true, component: input.component, gates, diff, checklist: CHECKLIST };
    } catch (e) {
      let after = [];
      try { after = porcelain(repoDir, git); } catch { /* git itself failed: the error below still names the cause */ }
      const changed = after.filter((l) => !before.includes(l));
      return { gatesRed: true, error: e.message, appended, component: input.component, gates, diff: { porcelain: after, changed },
        ...(appended ? {} : { revert: revertOf(changed) }), checklist: CHECKLIST };
    }
  }, "a ratify");
}
