// Spike A merge script — MECHANICAL flat merge of the eight Polaris v7 token JSONs into one
// export file. Flat (not namespaced under filename keys) because: (1) Polaris token names are
// already globally unique and self-prefixed (color-*, space-*, font-*, shadow-*, border-*,
// motion-*, z-index-*, breakpoints-*), so the filename key adds nothing; (2) pack-import.mjs's
// generic walker flattens either shape to path→value identically, and its downstream name
// matching (classifyDimension keywords, toRamps/deriveRamps prefixes) keys on the same leading
// word either way; (3) flat keeps every token name byte-identical to what Polaris publishes,
// which is what the provenance/attribution story wants.
// Source: cdn.jsdelivr.net/npm/@shopify/polaris-tokens@7.0.0/dist/json/{border,breakpoints,color,font,motion,shadow,space,zIndex}.json
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "polaris-json");
const FILES = ["border", "breakpoints", "color", "font", "motion", "shadow", "space", "zIndex"];

const merged = {};
let total = 0;
for (const f of FILES) {
  const json = JSON.parse(readFileSync(path.join(DIR, `${f}.json`), "utf8"));
  for (const [name, node] of Object.entries(json)) {
    if (name in merged) throw new Error(`collision: ${name} (from ${f}.json)`);
    merged[name] = node; // node stays { value, description? } verbatim
    total++;
  }
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "polaris-v7.export.json");
writeFileSync(out, JSON.stringify(merged, null, 2));
console.log(`merged ${total} tokens from ${FILES.length} files (no collisions) → ${out}`);
