// gen-handoff.mjs — ComponentSpecs + DataContracts + tokens → the handoff pack
// (epic #1, tickets #7 + #12). Spec: docs/epics/ai-first-ux-factory.architecture.md §Data model.
// Emits handoff/verdant/: pack.json (spec heads + prose + portability block, inlined for
// the viewer), verbatim DataContracts, the DTCG source, Style Dictionary css/ios/android
// builds, the wc/ custom-element wrappers + README, and figma-import.md. figma-parity.json
// is NOT emitted here — the parity script writes it (secret + network; this chain stays
// deterministic) and this generator never touches it.
// contracts/ and wc/ are rebuilt from scratch each run (rmSync): they are entirely owned by
// this generator — one sidecar per spec / per wrapper — so a spec or wrapper removed at source
// leaves no orphaned sidecar behind. A stale, already-committed sidecar is byte-identical to
// HEAD, so the drift gate's porcelain check can't see it and it would ship silently in the pack
// + pack.bundle.json (#64). The clean-slate is scoped to those two dirs only — the top-level,
// real-run-only figma-parity.json is never at risk.
//
// The reading seam (epic #329 ticket #331, D1 + D2): pack.json#/bindings and scenario.json are
// projected from scenarios/verdant/ — bindings.json (hand-written: which view of each screen reads
// which collection, filtered and ordered how, plus a witness of the record ids it renders), and the
// brief's head + copy.json (the fixed fictional today and the fictional notice). The two DataContract
// fields the backend computes carry readOnly + x-derived { from, rule }; every from entry must
// resolve. The three projections (projectBindings, projectScenario, derivedProblems) are pure and
// exported so tooling/build-checks.mjs group 39 drives them over mutated copies without writing.
// The filter, order and rule TEXT is a statement of what proto/verdant.html and
// scenarios/validate.mjs do, not an evaluation of them (epic Q1: text first); a binding names a
// record shape, never an endpoint, and breaksBound refuses the words that would say otherwise.
// Standalone:  node agent-layer/gen-handoff.mjs
// Paths resolve from this module (NOT cwd) — build.mjs runs from the jobs folder.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { parseComponentSpec } from "./lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS = join(ROOT, "system/specs");
const DEST = join(ROOT, "handoff/verdant");
const SD_BUILD = join(ROOT, "tooling/style-dictionary/build-tokens.mjs");
const WC_SRC = join(ROOT, "system/wc");
const FIGMA_DOC = join(ROOT, "system/figma-import.md");
const SCENARIO_DIR = join(ROOT, "scenarios/verdant");

// The closed key sets of scenarios/verdant/bindings.json. A key outside them is refused, because
// the bound (no endpoint, URL, verb, caching, envelope, pagination, auth or versioning) is
// easiest to break by adding a field, and a closed set makes that a throw rather than a review read.
export const BINDING_KEYS = Object.freeze({
  statement: Object.freeze(["$description", "screens", "notInScope"]),
  screen: Object.freeze(["screen", "views"]),
  view: Object.freeze(["id", "title", "component", "collection", "filter", "order", "pick", "witness"]),
  viewRequired: Object.freeze(["id", "component", "collection", "filter", "order", "witness"]),
});
// Applied to the VALUES of filter, order, pick, title, notInScope[], fictionalNotice and
// x-derived.rule — never to $description, which states D1 ("never an endpoint") on purpose.
// Two expressions, because a verb is a verb only in capitals: one /i over the verbs refused "does
// not get a heading" and "put first" (PR #523 F1). Versioning means a versioned shape or a v2, never
// the bare word, which ordinary prose ("scenario.json version") uses.
export const BOUND_VERB_RE = /\b(GET|POST|PUT|PATCH|DELETE)\b/;
export const BOUND_RE = /\/api\b|https?:\/\/|\bendpoint|\bpaginat|\bcach(e|ing)\b|\bauth\b|\benvelope|\bversion(ed|ing)\b|\bv\d+\b/i;
export const breaksBound = (s) => BOUND_VERB_RE.test(s) || BOUND_RE.test(s);
// x-derived.rule reaches vocabulary.json, a prompt input: a record id there is a worked example.
// Built from the fixtures' id prefixes, any case and any digit count, so task-3 and Task-03 are
// refused and iso-8601 is not (PR #523 F5). A new collection with a new prefix adds it here.
export const RECORD_ID_RE = /\b(?:task|plant|read)-\d+\b/i;
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

/** bindings.json → pack.json#/bindings, or a throw naming `at` and the JSON path. Pure.
 *  contractOf(component) → the spec head's contract filename, null (no contract) or undefined (no spec). */
export function projectBindings(statement, { protoConfig, contractOf, at = "scenarios/verdant/bindings.json" }) {
  const fail = (path, msg) => { throw new Error(`${at}: ${path} ${msg}`); };
  const closed = (obj, keys, path) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) fail(path || "(root)", "must be an object");
    for (const k of Object.keys(obj)) if (!keys.includes(k)) fail(path ? `${path}.${k}` : k, `is an unknown key — allowed: ${keys.join(", ")} (the bound: a binding names a record, never an endpoint)`);
  };
  closed(statement, BINDING_KEYS.statement, "");
  if (!Array.isArray(statement.screens) || !statement.screens.length) fail("screens", "must be a non-empty array");
  if (!Array.isArray(statement.notInScope) || !statement.notInScope.every(nonEmpty)) fail("notInScope", "must be an array of non-empty strings");
  statement.notInScope.forEach((s, i) => { if (breaksBound(s)) fail(`notInScope[${i}]`, `breaks the bound: ${JSON.stringify(s)}`); });
  const screens = statement.screens.map((s, si) => {
    const sp = `screens[${si}]`;
    closed(s, BINDING_KEYS.screen, sp);
    const proto = protoConfig.screens.find((x) => x.id === s.screen);
    if (!proto) fail(`${sp}.screen`, `"${s.screen}" names no screen in proto.config.json (have: ${protoConfig.screens.map((x) => x.id).join(", ")})`);
    if (!Array.isArray(s.views) || !s.views.length) fail(`${sp}.views`, "must be a non-empty array");
    const seen = new Set();
    const views = s.views.map((v, vi) => {
      const vp = `${sp}.views[${vi}]`;
      closed(v, BINDING_KEYS.view, vp);
      for (const k of BINDING_KEYS.viewRequired.filter((k) => k !== "witness")) if (!nonEmpty(v[k])) fail(`${vp}.${k}`, "is required and must be a non-empty string");
      for (const k of ["title", "pick"]) if (k in v && !nonEmpty(v[k])) fail(`${vp}.${k}`, "must be a non-empty string when present");
      if (!Array.isArray(v.witness) || !v.witness.length || !v.witness.every(nonEmpty)) fail(`${vp}.witness`, "must be a non-empty array of record ids");
      if (seen.has(v.id)) fail(`${vp}.id`, `"${v.id}" is a duplicate view id in ${s.screen}`);
      seen.add(v.id);
      if (!proto.collections.includes(v.collection)) fail(`${vp}.collection`, `"${v.collection}" is not one of ${s.screen}'s collections (${proto.collections.join(", ")})`);
      const c = contractOf(v.component);
      if (c === undefined) fail(`${vp}.component`, `"${v.component}" names no spec in system/specs/`);
      if (c === null) fail(`${vp}.component`, `"${v.component}" has no DataContract — a view binds records, so its component must carry one`);
      for (const k of ["title", "filter", "order", "pick"]) if (k in v && breaksBound(v[k])) fail(`${vp}.${k}`, `breaks the bound: ${JSON.stringify(v[k])}`);
      return { id: v.id, ...(v.title && { title: v.title }), component: v.component, contract: `contracts/${c}`, collection: v.collection, filter: v.filter, order: v.order, ...(v.pick && { pick: v.pick }), witness: v.witness };
    });
    return { screen: s.screen, title: proto.title, views };
  });
  return { $description: statement.$description, screens, notInScope: statement.notInScope };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isoDay = (s) => {
  if (typeof s !== "string" || !ISO_DAY.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** The brief's head + copy.json → scenario.json, or a throw naming the source file. Pure. */
export function projectScenario(head, copy, { at = "scenarios/verdant" } = {}) {
  if (!isoDay(head?.today)) throw new Error(`${at}/brief.md: head "today" ${JSON.stringify(head?.today)} is not a real YYYY-MM-DD day`);
  if (!nonEmpty(copy?.fictionalNotice)) throw new Error(`${at}/copy.json: "fictionalNotice" is missing or empty`);
  if (breaksBound(copy.fictionalNotice)) throw new Error(`${at}/copy.json: "fictionalNotice" breaks the bound`);
  return {
    $description:
      "The Verdant scenario's constants: the fixed fictional today every derived field is computed against, and the notice the demo-notice component renders verbatim. Generated by agent-layer/gen-handoff.mjs from scenarios/verdant/brief.md and copy.json — do not edit.",
    scenario: head.slug,
    today: head.today,
    fictionalNotice: copy.fictionalNotice,
  };
}

/** Every x-derived problem across the pack's contracts, as path-named strings; never throws. Pure.
 *  files: pack-relative path → parsed JSON. A from entry with no "#" is a property of the same
 *  contract; otherwise file#/pointer, the file resolved against the contract's own directory the
 *  way its $id resolves (so ../scenario.json from contracts/). */
export function derivedProblems(files) {
  const problems = [];
  for (const [rel, doc] of Object.entries(files)) {
    if (!rel.startsWith("contracts/")) continue;
    for (const [field, prop] of Object.entries(doc.properties ?? {})) {
      const here = `handoff/verdant/${rel}: properties.${field}`;
      const xd = prop["x-derived"];
      if (xd === undefined) {
        if (prop.readOnly === true) problems.push(`${here} is readOnly with no x-derived — a field the backend computes states how`);
        continue;
      }
      if (prop.readOnly !== true) problems.push(`${here} carries x-derived but readOnly is not true`);
      if (!xd || typeof xd !== "object" || Array.isArray(xd)) { problems.push(`${here} x-derived must be an object`); continue; }
      for (const k of Object.keys(xd)) if (k !== "from" && k !== "rule") problems.push(`${here} x-derived.${k} is an unknown key — allowed: from, rule`);
      if (!nonEmpty(xd.rule)) problems.push(`${here} x-derived.rule must be a non-empty string`);
      else {
        if (breaksBound(xd.rule)) problems.push(`${here} x-derived.rule breaks the bound`);
        if (RECORD_ID_RE.test(xd.rule)) problems.push(`${here} x-derived.rule names a record id (${xd.rule.match(RECORD_ID_RE)[0]}) — a rule is a definition, never a worked example (it reaches vocabulary.json, a prompt input)`);
      }
      if (!Array.isArray(xd.from) || !xd.from.length || !xd.from.every(nonEmpty)) { problems.push(`${here} x-derived.from must be a non-empty array of strings`); continue; }
      for (const entry of xd.from) {
        const hash = entry.indexOf("#");
        if (hash === -1) {
          if (!Object.hasOwn(doc.properties, entry)) problems.push(`${here} x-derived.from "${entry}" names no property of this contract`);
          continue;
        }
        const file = posix.normalize(posix.join(posix.dirname(rel), entry.slice(0, hash)));
        const ptr = entry.slice(hash + 1);
        if (!Object.hasOwn(files, file)) { problems.push(`${here} x-derived.from "${entry}" resolves to ${file}, which the pack does not carry`); continue; }
        if (!ptr.startsWith("/")) { problems.push(`${here} x-derived.from "${entry}" — the pointer must start with "/"`); continue; }
        let node = files[file];
        for (const seg of ptr.slice(1).split("/")) {
          if (seg.includes("~")) { problems.push(`${here} x-derived.from "${entry}" — pointer escapes are not supported`); break; }
          if (node === null || typeof node !== "object" || !Object.hasOwn(node, seg)) { problems.push(`${here} x-derived.from "${entry}" — "${seg}" does not resolve in ${file}`); break; }
          node = node[seg];
        }
      }
    }
  }
  return problems;
}

export function genHandoff() {
  const files = readdirSync(SPECS).filter((f) => f.endsWith(".md")).sort();
  const specs = files.map((f) => parseComponentSpec(join(SPECS, f)));

  const names = new Set(specs.map((s) => s.head.component));
  for (const s of specs) {
    for (const child of s.head.children) {
      if (!names.has(child)) throw new Error(`${s.path}: children entry "${child}" names no spec in system/specs/`);
    }
  }

  // The reading seam (#331): every projection runs BEFORE the first write to the pack (the Style
  // Dictionary build below), so a refused statement leaves the committed pack untouched.
  const readJson = (name) => {
    const p = join(SCENARIO_DIR, name);
    if (!existsSync(p)) throw new Error(`${p}: missing — the pack's bindings and scenario constants are projected from it`);
    return JSON.parse(readFileSync(p, "utf8"));
  };
  const briefPath = join(SCENARIO_DIR, "brief.md");
  if (!existsSync(briefPath)) throw new Error(`${briefPath}: missing — scenario.json's today comes from its head`);
  const fence = readFileSync(briefPath, "utf8").match(/```json\s*\n([\s\S]*?)\n```/);
  if (!fence) throw new Error(`${briefPath}: no \`\`\`json head block`);
  const scenario = projectScenario(JSON.parse(fence[1]), readJson("copy.json"));
  const contractFiles = Object.fromEntries(
    specs.filter((s) => s.head.contract).map((s) => [`contracts/${s.head.contract}`, JSON.parse(readFileSync(join(SPECS, s.head.contract), "utf8"))])
  );
  const problems = derivedProblems({ "scenario.json": scenario, ...contractFiles });
  if (problems.length) throw new Error(problems.join("; "));
  const contractOf = (name) => {
    const s = specs.find((x) => x.head.component === name);
    return s ? s.head.contract || null : undefined;
  };
  const bindings = projectBindings(readJson("bindings.json"), { protoConfig: readJson("proto.config.json"), contractOf });

  // Multi-target token builds — child process so agent-layer stays zero-dep
  // (tooling/style-dictionary owns the one allowed dependency).
  try {
    execFileSync(process.execPath, [SD_BUILD], { stdio: "inherit" });
  } catch {
    throw new Error(`${SD_BUILD}: Style Dictionary build failed — if node_modules is missing, run: cd tooling/style-dictionary && npm install`);
  }

  rmSync(join(DEST, "contracts"), { recursive: true, force: true }); // clean-slate rebuild — no orphaned sidecar for a removed spec (#64; see header)
  mkdirSync(join(DEST, "contracts"), { recursive: true });
  for (const s of specs) {
    if (s.head.contract) copyFileSync(join(SPECS, s.head.contract), join(DEST, "contracts", s.head.contract));
  }
  copyFileSync(join(ROOT, "system/tokens.source.json"), join(DEST, "tokens.dtcg.json"));

  writeFileSync(join(DEST, "scenario.json"), JSON.stringify(scenario, null, 2) + "\n");

  // Portability proofs (#12): wrapper modules + README travel with the pack; demo.html
  // does not (it references absolute /system/ paths — the wc README links the live demo).
  const wcFiles = existsSync(WC_SRC)
    ? readdirSync(WC_SRC).filter((f) => f.endsWith(".mjs")).sort()
    : [];
  if (!wcFiles.length) throw new Error(`${WC_SRC}: no wrapper modules found — did system/wc/ move?`);
  if (!existsSync(join(WC_SRC, "README.md"))) throw new Error(`${WC_SRC}/README.md: missing — the pack ships the wrapper doc`);
  if (!existsSync(FIGMA_DOC)) throw new Error(`${FIGMA_DOC}: missing — the pack ships the Figma import doc`);
  rmSync(join(DEST, "wc"), { recursive: true, force: true }); // clean-slate rebuild — no orphaned wrapper for a removed wc module (#64; see header)
  mkdirSync(join(DEST, "wc"), { recursive: true });
  for (const f of [...wcFiles, "README.md"]) copyFileSync(join(WC_SRC, f), join(DEST, "wc", f));
  copyFileSync(FIGMA_DOC, join(DEST, "figma-import.md"));

  const pack = {
    $description:
      "Verdant handoff pack — ComponentSpecs (machine head + prose sections), DataContracts (JSON Schema 2020-12), the bindings (which view reads which collection, filtered and ordered how; scenario.json carries today), and the DTCG token source with css/ios/android builds. Verdant is a fictional demo scenario. Generated by agent-layer/gen-handoff.mjs from system/specs/ — do not edit.",
    scenario: "verdant",
    generatedFrom: "system/specs",
    components: specs.map((s) => ({
      ...s.head,
      contract: s.head.contract ? `contracts/${s.head.contract}` : null,
      sections: s.sections,
    })),
    bindings,
    portability: {
      webComponents: {
        files: wcFiles.map((f) => `wc/${f}`),
        readme: "wc/README.md",
        trajectory:
          "every component ships as a standalone custom element, themed by the token contract alone; the canonical handoff form remains copy-paste HTML/CSS reading only semantic tokens",
      },
      figma: {
        import: "figma-import.md",
        // Written only by a real run of tooling/figma/figma-parity.mjs — null until
        // then (rendered as "pending real run"); never a placeholder file.
        parity: existsSync(join(DEST, "figma-parity.json")) ? "figma-parity.json" : null,
      },
    },
  };
  writeFileSync(join(DEST, "pack.json"), JSON.stringify(pack, null, 2) + "\n");

  const views = bindings.screens.reduce((n, s) => n + s.views.length, 0);
  const derived = Object.values(contractFiles).reduce((n, c) => n + Object.values(c.properties ?? {}).filter((p) => p["x-derived"]).length, 0);
  return { components: specs.length, targets: 3, wrappers: wcFiles.length, views, derived, dest: DEST };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = genHandoff();
  console.log(`handoff pack    ✓  ${r.components} specs + ${r.targets} token targets + ${r.wrappers} wc wrappers + ${r.views} bound views + ${r.derived} derived fields (handoff/verdant)`);
}
