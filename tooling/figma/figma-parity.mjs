// tooling/figma/figma-parity.mjs — Figma ↔ token-contract parity read (authoring-time,
// standalone; epic #1, ticket #12; folds spike 1). Architecture §Boundaries "Figma boundary".
// Diffs a Figma file's variables/styles against system/tokens.source.json's `contract` group by
// name, and by value where the value is a plain hex colour or px dimension, then writes
// handoff/verdant/figma-parity.json — the committed real-run parity artifact.
//
// The read itself — auth, the Enterprise variables gate, the paged fallback, the response cache
// and the monthly rate budget — lives in figma-read.mjs, shared with figma-pull.mjs (#110).
//
// Deliberately NOT registered in agent-layer/build.mjs: the generator chain stays deterministic
// and offline-runnable; this script needs a secret + network.
//   node tooling/figma/figma-parity.mjs [--page <name|id>] [--max-pages <n>] [--refresh]
//   node tooling/figma/figma-parity.mjs --offline      (re-parse the cache, spending nothing)

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, readFigma, readFlags } from "./figma-read.mjs";

const TOKENS_SOURCE = join(ROOT, "system/tokens.source.json");
const ARTIFACT = join(ROOT, "handoff/verdant/figma-parity.json");

// Flatten the DTCG `contract` group to leaf name → { type, value }.
function flattenContract(node, out = {}) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && "$value" in value) out[key] = { type: value.$type, value: value.$value };
    else if (value && typeof value === "object") flattenContract(value, out);
  }
  return out;
}

// Figma name ("color/accent", "Color Accent") ↔ token leaf ("color-accent").
const norm = (s) => String(s).toLowerCase().replace(/^--/, "").replace(/[\s/._]+/g, "-");

function compareRows(tokens, figmaEntries) {
  const byName = new Map(figmaEntries.map((e) => [norm(e.name), e]));
  return Object.entries(tokens).map(([name, t]) => {
    const figma = byName.get(norm(name));
    if (!figma) return { token: name, type: t.type, comparison: "missing", match: null, tokenValue: t.value, note: "no Figma variable/style under this name" };

    const isPlainHex = t.type === "color" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t.value);
    const isPlainPx = t.type === "dimension" && /^\d+(\.\d+)?px$/.test(t.value);
    if (isPlainHex && figma.type === "color" && figma.value) {
      const match = t.value.toLowerCase() === String(figma.value).toLowerCase();
      return { token: name, type: t.type, figmaName: figma.name, comparison: "value", match, tokenValue: t.value, figmaValue: figma.value };
    }
    if (isPlainPx && figma.type === "dimension") {
      const match = parseFloat(t.value) === figma.value;
      return { token: name, type: t.type, figmaName: figma.name, comparison: "value", match, tokenValue: t.value, figmaValue: `${figma.value}px` };
    }
    // Web-only values (clamp(), color-mix(), shadow strings, font stacks) and
    // unresolved aliases never match Figma numerically — name parity is the honest claim.
    return { token: name, type: t.type, figmaName: figma.name, comparison: "name-only", match: true, tokenValue: t.value, note: "web-only or non-plain value; name parity only" };
  });
}

export async function runParity(options = {}) {
  const { fileKey, endpoint, gate, entries, pages } = await readFigma(options);

  const source = JSON.parse(readFileSync(TOKENS_SOURCE, "utf8"));
  const rows = compareRows(flattenContract(source.contract), entries);

  const summary = {
    tokens: rows.length,
    figmaEntries: entries.length,
    valueMatch: rows.filter((r) => r.comparison === "value" && r.match).length,
    valueMismatch: rows.filter((r) => r.comparison === "value" && !r.match).length,
    nameOnly: rows.filter((r) => r.comparison === "name-only").length,
    missing: rows.filter((r) => r.comparison === "missing").length,
  };

  for (const r of rows) {
    const status = r.comparison === "missing" ? "—  missing" : r.comparison === "name-only" ? "≈  name-only" : r.match ? "✓  value" : "✗  MISMATCH";
    console.log(`${r.token.padEnd(28)} ${String(r.type).padEnd(11)} ${status.padEnd(14)} ${r.figmaValue ?? r.note ?? ""}`);
  }
  if (pages) console.log(`\npages read: ${pages.read.length} · skipped: ${pages.skipped.length}`);
  console.log(`${endpoint} · ${summary.valueMatch} value-match / ${summary.nameOnly} name-only / ${summary.missing} missing of ${summary.tokens} contract tokens`);

  const artifact = {
    note: "real run, from tooling/figma/figma-parity.mjs",
    ranAt: new Date().toISOString(),
    endpoint,
    gate,
    file: fileKey,
    pages,
    rows,
    summary,
  };
  writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`figma parity    ✓  ${ARTIFACT}`);
  return artifact;
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runParity(readFlags(process.argv)).catch((e) => {
    console.error(e.stack ?? e.message); // the stack is the diagnosis — the 07-25 run lost it
    process.exit(1);
  });
}
