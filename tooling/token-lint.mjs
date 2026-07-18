// tooling/token-lint.mjs — token-contract lint gate (epic #1, ticket #9).
// Three hand-rolled checks over the shipped token contract, exits 1 on any violation:
//   1. UNDECLARED — every token components.css references is declared in tokens.contract.css.
//   2. ORPHAN     — every contract token is referenced by some shipped/proto surface.
//   3. DTCG valid — the DTCG source parses + validates (via loadSource, no schema library).
// No new dependency: Node built-ins only; reuses gen-token-css's boundary validator.
// Standalone:  node tooling/token-lint.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadSource } from "../agent-layer/gen-token-css.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Every `--name:` declaration in the contract (the 47 semantic tokens packs may set).
function declaredTokens() {
  const css = readFileSync(join(ROOT, "system/tokens.contract.css"), "utf8");
  return new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
}

// Union of every `var(--name)` reference across the given repo-relative paths (skips absent).
function varsIn(relPaths) {
  const used = new Set();
  for (const rel of relPaths) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    for (const m of readFileSync(abs, "utf8").matchAll(/var\(\s*(--[a-z0-9-]+)/g)) used.add(m[1]);
  }
  return used;
}

const htmlFiles = (dir) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".html")).sort().map((f) => join(dir, f))
    : [];

const mjsFiles = (dir) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".mjs")).sort().map((f) => join(dir, f))
    : [];

// 1. UNDECLARED (strict, components.css only): a component var() with no contract declaration
// is a broken token contract — components render identically only if every token they name exists.
function checkUndeclared(declared) {
  const undeclared = [...varsIn(["system/components.css"])].filter((t) => !declared.has(t)).sort();
  if (undeclared.length)
    throw new Error(
      `token-lint: components.css references undeclared token(s): ${undeclared.join(", ")} — ` +
        `add to the contract group in system/tokens.source.json and regenerate`
    );
}

// 2. ORPHAN (generous, full shipped/proto consumer set — NO packs): a declared token nothing
// references is dead contract surface. Consumer set is LOCKED (see plan §Phase 2): the shipped/
// proto CSS + the contract's own self-references (keeps --color-white non-orphan) + every shipped
// page's inline <style> + proto pages + wc shadow CSS. Packs are excluded on purpose — a pack
// SETS tokens, it is not a surface the contract serves.
function checkOrphans(declared) {
  const consumers = [
    "system/components.css",
    "system/portfolio.css",
    "system/proto.css",
    "system/tokens.contract.css",
    ...htmlFiles("."),
    ...htmlFiles("proto"),
    ...mjsFiles("system/wc"),
  ];
  const referenced = varsIn(consumers);
  const orphans = [...declared].filter((t) => !referenced.has(t)).sort();
  if (orphans.length)
    throw new Error(
      `token-lint: contract declares orphan token(s) referenced by no shipped/proto surface: ${orphans.join(", ")} — ` +
        `remove from the contract group in system/tokens.source.json (and regenerate) or reference it`
    );
}

// 3. DTCG valid: reuse gen-token-css's boundary validator (project rule: hand-validate, no schema
// library). Redundant with drift-check's token-CSS step by design — keeps this gate self-contained.
function checkDtcg() {
  try {
    loadSource();
  } catch (e) {
    throw new Error(`token-lint: DTCG source invalid — ${e.message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const declared = declaredTokens();
    checkUndeclared(declared);
    checkOrphans(declared);
    checkDtcg();
    console.log(`token-lint      ✓  ${declared.size} contract tokens · 0 undeclared · 0 orphan · DTCG valid`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
