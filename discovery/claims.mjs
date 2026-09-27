// discovery/claims.mjs — a markdown document split into CLAIMS: the unit the contradiction screen
// (#453, portal/lib/discovery-screen.mjs) asks Jev about. A claim is a paragraph, a list item, a table
// data row or a fenced block, each with a stable id (c001…), its heading path and its source lines.
//
// PURE and DETERMINISTIC: no filesystem, no clock, no network, and no import at all — build-checks
// group 45.1 pins the import list to none. Same text, same claims, byte for byte; group 45.2 holds
// the frozen fixture's split to the committed tooling/jev-screen/fixture-claims.json, so a rule change
// here reddens there by claim id. Any rule change BUMPS CLAIMS_VERSION, which screen-run.json records.
//
// THE RULES, in the order they are tried on each line (the plan's Task 1; discovery/README.md
// §The contradiction screen):
//   1. A fenced block (``` or ~~~ to its closing fence) is ONE claim, its inner lines verbatim.
//   2. An ATX heading ends the current claim and sets the heading stack at its level. Not a claim.
//   3. A blank line or a thematic break ends the current claim.
//   4. A table's first row is its header (not a claim), its separator row is skipped, and every data
//      row is one claim rendered `Header: cell · Header: cell` (empty cells skipped, `\|` a literal pipe).
//   5. A list item at ANY indent starts its own claim, marker stripped — a nested item is not its
//      parent's continuation. Following lines that start nothing else continue it.
//   6. A blockquote line joins the current paragraph with its marker stripped; an empty one ends it.
//   7. Anything else starts or continues a paragraph.
// Continuation lines are joined with one space after trim(). A claim whose text is empty is dropped
// before an id is allocated, so ids are gapless. `section` is the heading path joined with ` › `, or
// `(preamble)` before the first heading. `line`/`endLine` are 1-based and inclusive.
//
// Standalone: none — tooling/jev-screen.mjs --claims is the operator's view of a split.

export const CLAIMS_VERSION = 1;

const bad = (msg) => { throw new Error(`claims: ${msg}`); };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BREAK = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const TABLE = /^\s*\|/;
const SEPARATOR = /^\|?\s*:?-{3,}/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+/;
const QUOTE = /^\s{0,3}>\s?/;

// Split a table row on its UNESCAPED pipes; the outer pipes are the row's frame, not cell boundaries.
function cells(row) {
  const out = [];
  let cur = "";
  const s = row.trim();
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "\\" && s[i + 1] === "|") { cur += "|"; i += 1; continue; }
    if (s[i] === "|") { out.push(cur); cur = ""; continue; }
    cur += s[i];
  }
  out.push(cur);
  if (s.startsWith("|")) out.shift();
  if (s.endsWith("|") && !s.endsWith("\\|")) out.pop();
  return out.map((c) => c.trim());
}

export function splitClaims(markdown) {
  if (typeof markdown !== "string") bad(`splitClaims takes the document's markdown as a string (got ${markdown === null ? "null" : typeof markdown})`);
  const lines = markdown.split(/\r\n|\r|\n/);
  const out = [];
  const headings = [];
  let cur = null; // { line, endLine, parts[] }
  let header = null; // the current table's header cells, or null outside a table

  const section = () => (headings.filter(Boolean).join(" › ") || "(preamble)");
  const emit = (line, endLine, text) => {
    if (!text) return;
    if (out.length >= 999) bad("the document splits into more than 999 claims — ids stop at c999");
    out.push(Object.freeze({ id: `c${String(out.length + 1).padStart(3, "0")}`, section: section(), line, endLine, text }));
  };
  const flush = () => {
    if (cur) emit(cur.line, cur.endLine, cur.parts.join(" "));
    cur = null;
  };
  const add = (n, text, fresh) => {
    if (fresh || !cur) { flush(); cur = { line: n, endLine: n, parts: [] }; }
    cur.endLine = n;
    if (text) cur.parts.push(text);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const n = i + 1;
    if (!TABLE.test(raw)) header = null;

    const fence = raw.match(FENCE);
    if (fence) {
      flush();
      const mark = fence[1];
      const inner = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^\\s*${mark[0] === "`" ? "`" : "~"}{${mark.length},}\\s*$`).test(lines[j])) inner.push(lines[j++]);
      const end = Math.min(j, lines.length - 1);
      emit(n, end + 1, inner.join("\n"));
      i = end;
      continue;
    }

    const h = raw.match(HEADING);
    if (h) {
      flush();
      const level = h[1].length;
      headings.length = level - 1;
      headings[level - 1] = h[2];
      continue;
    }

    if (!raw.trim() || BREAK.test(raw)) { flush(); continue; }

    if (TABLE.test(raw)) {
      flush();
      const row = cells(raw);
      if (!header) { header = row; continue; }
      if (SEPARATOR.test(raw.trim())) continue;
      emit(n, n, row.map((c, k) => (c ? (header[k] ? `${header[k]}: ${c}` : c) : "")).filter(Boolean).join(" · "));
      continue;
    }

    const item = raw.match(ITEM);
    if (item) { add(n, raw.slice(item[0].length).trim(), true); continue; }

    const quote = raw.match(QUOTE);
    if (quote) {
      const text = raw.slice(quote[0].length).trim();
      if (!text) { flush(); continue; }
      add(n, text, false);
      continue;
    }

    add(n, raw.trim(), false);
  }
  flush();
  return Object.freeze(out);
}
