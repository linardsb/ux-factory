// Shared helpers for the agent-layer generators.
// Zero dependencies — Node built-ins only. Run from the jobs folder (paths resolve from cwd).

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const unquote = (s) => s.trim().replace(/^["'](.*)["']$/s, "$1").trim();

// Parse a decisions ledger: a leading ```json metadata fence + `## d-NNN` entries
// in the format documented in _factory/kb/decisions/README.md.
export function parseLedger(ledgerPath) {
  const text = readFileSync(resolve(ledgerPath), "utf8");

  const metaFence = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!metaFence) throw new Error(`${ledgerPath}: no \`\`\`json metadata block found`);
  const meta = JSON.parse(metaFence[1]);

  const afterMeta = text.slice(metaFence.index + metaFence[0].length);
  const decisions = afterMeta
    .split(/^##\s+/m)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf("\n");
      const heading = part.slice(0, nl).trim();
      const body = (part.slice(nl + 1).match(/^---\s*\n([\s\S]*?)\n---/m) || [, ""])[1];
      return parseEntry(heading, body);
    });

  return { meta, decisions };
}

function parseEntry(heading, body) {
  const id = (heading.match(/^(d-\d+)/) || [])[1] || null;
  const entry = { id, rejected: [] };
  let mode = null;

  for (const raw of body.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;

    if (/^\s*-\s*option:/.test(line)) {
      entry.rejected.push({ option: unquote(line.replace(/^\s*-\s*option:/, "")), why_not: "" });
      mode = "rejected";
      continue;
    }
    if (mode === "rejected" && /^\s*why_not:/.test(line)) {
      entry.rejected.at(-1).why_not = unquote(line.replace(/^\s*why_not:/, ""));
      continue;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (kv) {
      if (kv[1] === "rejected") { mode = "rejected"; continue; }
      entry[kv[1]] = unquote(kv[2]);
      mode = null;
    }
  }
  return entry;
}

// Parse a ComponentSpec: a leading ```json head + four required `## ` prose
// sections, in the format documented in .claude/references/kb-format.md
// (§ComponentSpec + DataContract). Returns { head, sections, path }.
export function parseComponentSpec(specPath) {
  const path = resolve(specPath);
  const text = readFileSync(path, "utf8");

  const fence = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!fence) throw new Error(`${specPath}: no \`\`\`json head found`);
  let head;
  try {
    head = JSON.parse(fence[1]);
  } catch (e) {
    throw new Error(`${specPath}: json head does not parse — ${e.message}`);
  }

  const stem = basename(path, ".md");
  if (head.component !== stem) throw new Error(`${specPath}: head "component" ("${head.component}") does not match filename`);
  if (head.status !== "spec" && head.status !== "shipped") throw new Error(`${specPath}: head "status" ("${head.status}") must be "spec" or "shipped"`);
  if (typeof head.class !== "string" || !head.class) throw new Error(`${specPath}: head "class" must be a non-empty string`);
  if (!head.props || typeof head.props !== "object" || Array.isArray(head.props)) throw new Error(`${specPath}: head "props" must be an object`);
  for (const [name, prop] of Object.entries(head.props)) {
    if (!prop || typeof prop.type !== "string" || typeof prop.required !== "boolean")
      throw new Error(`${specPath}: prop "${name}" needs { type, required }`);
  }
  if (!Array.isArray(head.tokens) || !head.tokens.length || !head.tokens.every((t) => typeof t === "string" && t.startsWith("--")))
    throw new Error(`${specPath}: head "tokens" must be a non-empty array of ---prefixed names`);
  if (!Array.isArray(head.states) || !head.states.length) throw new Error(`${specPath}: head "states" must be a non-empty array`);
  if (!Array.isArray(head.children)) throw new Error(`${specPath}: head "children" must be an array`);
  // aiPatterns (optional): the AI-UX pattern(s) this component carries wherever used — the
  // component-level half of the five-pillar rubric (kb-format §ComponentSpec). Absent on every
  // non-AI spec, so guarded by `!== undefined`; screen/flow-level patterns live in a scenario's
  // rubric.json, not here (#41).
  if (head.aiPatterns !== undefined) {
    if (!Array.isArray(head.aiPatterns) || !head.aiPatterns.length)
      throw new Error(`${specPath}: head "aiPatterns", when present, must be a non-empty array`);
    const PILLARS = ["trust", "clarity", "control", "transparency", "meaningful-benefit"];
    for (const p of head.aiPatterns) {
      if (!p || typeof p.pillar !== "string" || !PILLARS.includes(p.pillar))
        throw new Error(`${specPath}: aiPatterns[].pillar must be one of ${PILLARS.join(" | ")}`);
      if (typeof p.pattern !== "string" || !p.pattern.trim() || typeof p.how !== "string" || !p.how.trim())
        throw new Error(`${specPath}: aiPatterns[] needs non-empty "pattern" and "how" strings`);
    }
  }
  if (head.contract !== null) {
    if (typeof head.contract !== "string" || !head.contract) throw new Error(`${specPath}: head "contract" must be a sibling-relative path or null`);
    const contractPath = join(dirname(path), head.contract);
    if (!existsSync(contractPath)) throw new Error(`${specPath}: contract "${head.contract}" not found beside the spec`);
    let schema;
    try {
      schema = JSON.parse(readFileSync(contractPath, "utf8"));
    } catch (e) {
      throw new Error(`${contractPath}: does not parse as JSON — ${e.message}`);
    }
    if (!schema.$schema || !schema.type) throw new Error(`${contractPath}: not a JSON Schema (needs "$schema" + "type")`);
  }

  const sections = text
    .slice(fence.index + fence[0].length)
    .split(/^##\s+/m)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf("\n");
      return { title: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() };
    });

  const required = ["Usage", "States", "Data binding", "Accessibility"];
  const found = sections.map((s) => s.title).filter((t) => required.includes(t));
  if (found.join("·") !== required.join("·"))
    throw new Error(`${specPath}: sections must include, in order: ${required.map((t) => `## ${t}`).join(" · ")}`);

  return { head, sections, path };
}

// Parse a company-brief kb record: a leading ```json head (a superset of the scenario
// brief.md head — it adds axes, the 8 intake (default,reasoning) pairs, screens, copy
// essentials, and provenance/sources) + five required `## ` prose sections, in the format
// documented in .claude/references/kb-format.md. The single per-company authoring source
// the brief → scenario-package compiler (gen-company-package.mjs) expands into a package.
// STRUCTURE / PRESENCE validation only: semantic checks (axes vocabulary, #rrggbb hex,
// calendar-accurate dates, fixture coherence) live in scenarios/validate.mjs and run on the
// EMITTED package, so the axes vocabulary stays single-sourced there — not duplicated here.
// Returns { head, sections, dir }.
export function parseCompanyBrief(briefPath) {
  const path = resolve(briefPath);
  const text = readFileSync(path, "utf8");
  const ne = (v) => typeof v === "string" && v.trim().length > 0;

  const fence = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!fence) throw new Error(`${briefPath}: no \`\`\`json head found`);
  let head;
  try {
    head = JSON.parse(fence[1]);
  } catch (e) {
    throw new Error(`${briefPath}: json head does not parse — ${e.message}`);
  }

  const dir = dirname(path);
  const slug = basename(dir);
  if (head.slug !== slug) throw new Error(`${briefPath}: head "slug" ("${head.slug}") does not match directory "${slug}"`);
  if (typeof head.fictional !== "boolean") throw new Error(`${briefPath}: head "fictional" must be true|false (provenance is explicit)`);
  for (const k of ["name", "domain", "oneLiner"])
    if (!ne(head[k])) throw new Error(`${briefPath}: head "${k}" is missing or empty`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(head.today ?? ""))
    throw new Error(`${briefPath}: head "today" ("${head.today}") is not a YYYY-MM-DD date`);
  if (head.fictional === false && (!Array.isArray(head.sources) || !head.sources.length || !head.sources.every(ne)))
    throw new Error(`${briefPath}: a real-provenance brief (fictional: false) needs head "sources" — a non-empty array of non-empty URLs`);
  // publishedTokens (optional) — a repo-relative filename the compiler copies through verbatim.
  // Validate its shape here (single-sourced with the other head checks): a non-string, an absolute
  // path, or any ".." would let the compiler's copyFileSync write outside the package directory.
  if (head.publishedTokens &&
      (typeof head.publishedTokens !== "string" || head.publishedTokens.includes("..") || isAbsolute(head.publishedTokens)))
    throw new Error(`${briefPath}: head "publishedTokens" must be a repo-relative filename with no ".." (got ${JSON.stringify(head.publishedTokens)})`);

  if (!head.axes || typeof head.axes !== "object" || Array.isArray(head.axes))
    throw new Error(`${briefPath}: head "axes" must be an object`);
  if (!ne(head.axes.brandColor)) throw new Error(`${briefPath}: head "axes.brandColor" is missing (the #rrggbb value is checked on the emitted package)`);
  for (const axis of ["density", "rewardType", "frequency"])
    if (!(axis in head.axes)) throw new Error(`${briefPath}: head "axes.${axis}" is missing (the vocabulary value is checked on the emitted package)`);

  const INTAKE_IDS = ["problem", "current-solution", "named-user", "target-behavior", "internal-trigger", "friction", "success-signals", "ethics-gate"];
  if (!head.intake || typeof head.intake !== "object" || Array.isArray(head.intake))
    throw new Error(`${briefPath}: head "intake" must be an object keyed by the 8 question ids`);
  for (const id of INTAKE_IDS) {
    const q = head.intake[id];
    if (!q || typeof q !== "object") throw new Error(`${briefPath}: head "intake.${id}" is missing (the 8 intake ids are fixed)`);
    for (const k of ["default", "reasoning"])
      if (!ne(q[k])) throw new Error(`${briefPath}: head "intake.${id}.${k}" is missing or empty`);
  }

  if (!Array.isArray(head.screens) || !head.screens.length)
    throw new Error(`${briefPath}: head "screens" must be a non-empty array`);
  for (const s of head.screens) {
    for (const k of ["id", "title"])
      if (!ne(s?.[k])) throw new Error(`${briefPath}: a screen is missing "${k}"`);
    if (!Array.isArray(s.collections) || !s.collections.length)
      throw new Error(`${briefPath}: screen "${s.id}" needs a non-empty "collections" array`);
  }

  if (!head.copy || typeof head.copy !== "object") throw new Error(`${briefPath}: head "copy" must be an object`);
  if (!ne(head.copy.tagline)) throw new Error(`${briefPath}: head "copy.tagline" is missing or empty`);
  for (const k of ["verdict", "narrative"])
    if (!ne(head.copy.ethicsReveal?.[k])) throw new Error(`${briefPath}: head "copy.ethicsReveal.${k}" is missing or empty`);

  const sections = text
    .slice(fence.index + fence[0].length)
    .split(/^##\s+/m)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf("\n");
      return { title: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() };
    });

  const required = ["Product", "Users", "Problem", "Behaviour model", "Ethics position"];
  const titles = new Set(sections.map((s) => s.title));
  for (const t of required)
    if (!titles.has(t)) throw new Error(`${briefPath}: missing required "## ${t}" section`);

  return { head, sections, dir };
}

// Strip HTML tags and collapse whitespace.
export const stripTags = (html) =>
  html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Truncate to <= max chars at a word boundary.
export function clamp(text, max) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).trim();
}

// Pull the first capture of a regex, or "".
export const first = (text, re) => (text.match(re) || [, ""])[1].trim();
