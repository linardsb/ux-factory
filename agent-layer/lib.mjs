// Shared helpers for the agent-layer generators.
// Zero dependencies — Node built-ins only. Run from the jobs folder (paths resolve from cwd).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
