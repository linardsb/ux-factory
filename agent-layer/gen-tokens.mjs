// tokens.json — DTCG (W3C Design Tokens) export of the token contract + this build's pack.
// Spec: _factory/agent-layer.md §4. Two groups: `contract` (semantic slots) and `pack` (bindings).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger } from "./lib.mjs";

// Read `--name: value;` declarations from the first :root block.
function readVars(cssPath) {
  const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments
  const root = css.match(/:root\s*\{([\s\S]*?)\}/);
  const vars = {};
  if (!root) return vars;
  for (const m of root[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

function inferType(name, value) {
  if (/^color-/.test(name) || /^#|\b(rgb|hsl|color-mix)\(/.test(value)) return "color";
  if (/^font-/.test(name)) return "fontFamily";
  if (/^shadow-/.test(name)) return "shadow";
  if (/^(spacing|radius|type|maxw|gutter)/.test(name) || /\d(px|rem|em|vw|vh)\b/.test(value) || /^clamp\(/.test(value))
    return "dimension";
  return "other";
}

function toToken(name, value, group) {
  const type = inferType(name, value);
  // A bare var(--x) reference becomes a DTCG alias to the same group's token.
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  let $value;
  if (alias) $value = `{${group}.${alias[1]}}`;
  else if (type === "fontFamily") $value = value.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
  else $value = value;
  return { $value, $type: type };
}

function groupFrom(vars, group) {
  const out = {};
  for (const [name, value] of Object.entries(vars)) out[name] = toToken(name, value, group);
  return out;
}

export function genTokens({ meta }) {
  const root = resolve(meta.site_root);
  const contract = groupFrom(readVars(join(root, meta.tokens.contract)), "contract");
  const pack = groupFrom(readVars(join(root, meta.tokens.pack)), "pack");

  const out = {
    $description:
      "Design tokens (DTCG). `contract` = the brand-agnostic semantic slots every component " +
      "references; `pack` = this build's bindings. Re-skinning is a one-file pack swap.",
    contract,
    pack,
  };

  const dest = join(root, "tokens.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  return { dest, contract: Object.keys(contract).length, pack: Object.keys(pack).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = genTokens(parseLedger(process.argv[2] || "_factory/kb/decisions/trainline.md"));
  console.log(`tokens.json     ✓  ${r.contract} contract + ${r.pack} pack tokens → ${r.dest}`);
}
