// Shared helpers for the agent-layer generators.
// Zero dependencies — Node built-ins only. Run from the jobs folder (paths resolve from cwd).

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

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
