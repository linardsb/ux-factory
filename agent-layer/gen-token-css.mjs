// gen-token-css.mjs — DTCG source → the two token CSS layers (canon, this repo).
// system/tokens.source.json is the source of truth; this generator emits
// system/tokens.contract.css (layer 1) and system/tokens.neutral.css (layer 2).
// Spec: docs/epics/ai-first-ux-factory.architecture.md §Data model (epic #1, ticket #2).
// Standalone:  node agent-layer/gen-token-css.mjs [--check]
//   --check: regenerate in memory, compare against disk, exit 1 on drift, write nothing.
// Paths resolve from this module (NOT cwd) — build.mjs runs from the jobs folder.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SYSTEM = resolve(dirname(fileURLToPath(import.meta.url)), "../system");
const SOURCE = join(SYSTEM, "tokens.source.json");

const OUTPUTS = {
  contract: "tokens.contract.css",
  neutral: "tokens.neutral.css",
};

const isToken = (node) => node && typeof node === "object" && "$value" in node;
const aliasPath = (v) => (typeof v === "string" && /^\{([^{}]+)\}$/.test(v) ? v.slice(1, -1) : null);
const sections = (group) => Object.entries(group).filter(([k]) => !k.startsWith("$"));
const tokens = sections; // same filter one level down

function lookup(src, path) {
  let node = src;
  for (const seg of path.split(".")) {
    node = node?.[seg];
    if (!node) return null;
  }
  return isToken(node) ? node : null;
}

// Read + boundary-validate the source. Throws Errors naming the offending path.
export function loadSource() {
  const src = JSON.parse(readFileSync(SOURCE, "utf8"));
  for (const group of Object.keys(OUTPUTS)) {
    if (!src[group]) throw new Error(`${SOURCE}: missing top-level group "${group}"`);
    const seen = new Set();
    for (const [section, sec] of sections(src[group])) {
      for (const [name, tok] of tokens(sec)) {
        const at = `${group}.${section}.${name}`;
        if (!isToken(tok)) throw new Error(`${SOURCE}: ${at} has no $value`);
        if (seen.has(name)) throw new Error(`${SOURCE}: duplicate leaf token "${name}" in group "${group}" (flattens into one :root)`);
        seen.add(name);
        const alias = aliasPath(tok.$value);
        if (alias) {
          if (group === "contract") throw new Error(`${SOURCE}: ${at} is an alias — the contract must hold literals (it renders with no pack loaded)`);
          if (alias.split(".")[0] !== group) throw new Error(`${SOURCE}: ${at} → alias {${alias}} leaves group "${group}"`);
          if (!lookup(src, alias)) throw new Error(`${SOURCE}: ${at} → unresolved alias {${alias}}`);
        }
      }
    }
  }
  return src;
}

// One token value → its CSS text. Aliases become var(--leaf); arrays re-join as a
// font stack (quoting entries with spaces); everything else passes through verbatim.
function cssValue($value) {
  const alias = aliasPath($value);
  if (alias) return `var(--${alias.split(".").pop()})`;
  if (Array.isArray($value)) return $value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
  return String($value);
}

const GENERATED_HEADER = `/* GENERATED from system/tokens.source.json — do not edit by hand.
 * Regenerate: node agent-layer/gen-token-css.mjs   ·   Drift check: node agent-layer/gen-token-css.mjs --check
 * Canon lives in this repo (docs/epics/ai-first-ux-factory.architecture.md §Data model).
 */`;

const PROSE = {
  contract: `/* system — semantic token CONTRACT (brand-agnostic)
 *
 * The interface between the system and any client pack. It declares every semantic
 * token the components in system/components.css reference, with NEUTRAL fallback
 * defaults (greyscale + one plain blue accent, a generic scale). No brand lives here.
 *
 * A client pack (tokens.neutral.css by default; a company's tokens.<company>.css) is
 * loaded AFTER this file and overrides these values with its own. With no pack loaded,
 * the system still renders as a coherent, unbranded neutral theme — proving the base
 * carries structure, not aesthetics.
 *
 * Rule: if components.css starts using a new semantic token, add it to the contract
 * group in system/tokens.source.json and regenerate. Brand values belong in packs.
 */`,
  neutral: `/* neutral — token pack (the factory's no-brand default)
 *
 * Values live in system/tokens.source.json (neutral group); this file is their
 * generated CSS form. Two tiers, exactly as every real client pack does — so a
 * company pack is a clone of THIS file with its own primitives:
 *   1. PRIMITIVES   — a plain greyscale + one accent blue, a generic modular scale.
 *   2. SEMANTIC MAP — the contract tokens (--color-fg/bg/accent/…) bound to those primitives.
 *
 * Load order on every page: system/tokens.contract.css  →  THIS FILE  →  system/components.css.
 * The contract already declares neutral fallbacks (so components never break with no pack);
 * this pack makes "neutral" an explicit, swappable skin. Re-skinning a site = change the one
 * <head> line \`tokens.neutral.css\` → \`tokens.<company>.css\`. Nothing here is a brand.
 *
 * No @import: the neutral skin uses the system font stack, so the base carries zero
 * external dependencies. A company pack adds its own @import for a self-hosted face.
 * Components must reference the SEMANTIC tokens below — never a primitive, never a literal.
 */`,
};

function emitCss(src, group) {
  const lines = [GENERATED_HEADER, PROSE[group], "", ":root {"];
  sections(src[group]).forEach(([, sec], i) => {
    const toks = tokens(sec);
    const width = Math.max(...toks.map(([n]) => n.length));
    if (i > 0) lines.push("");
    const banner = sec.$extensions?.factory?.banner;
    if (banner) {
      lines.push("  /* ============================================================");
      lines.push(`     ${banner}`);
      lines.push("     ============================================================ */", "");
    }
    if (sec.$description) lines.push(`  /* ---- ${sec.$description} ---- */`);
    for (const [name, tok] of toks) {
      const pad = " ".repeat(width - name.length + 1);
      const desc = tok.$description ? `   /* ${tok.$description} */` : "";
      lines.push(`  --${name}:${pad}${cssValue(tok.$value)};${desc}`);
    }
  });
  lines.push("}", "");
  return lines.join("\n");
}

// Emit both files (or, with {check: true}, compare against disk and report drift).
// Returns { contract, neutral (token counts), drifted (file names, check mode only) }.
export function genTokenCss({ check = false } = {}) {
  const src = loadSource();
  const result = { drifted: [] };
  for (const [group, file] of Object.entries(OUTPUTS)) {
    const css = emitCss(src, group);
    const dest = join(SYSTEM, file);
    result[group] = sections(src[group]).reduce((n, [, sec]) => n + tokens(sec).length, 0);
    if (check) {
      if (readFileSync(dest, "utf8") !== css) result.drifted.push(file);
    } else {
      writeFileSync(dest, css);
    }
  }
  return result;
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check");
  const r = genTokenCss({ check });
  if (check && r.drifted.length) {
    console.error(`token css       ✗  drift from tokens.source.json: ${r.drifted.join(", ")} — regenerate with: node agent-layer/gen-token-css.mjs`);
    process.exit(1);
  }
  console.log(`token css       ✓  ${r.contract} contract + ${r.neutral} pack tokens ${check ? "— no drift" : `→ ${SYSTEM}`}`);
}
