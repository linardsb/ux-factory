// Spike A engine-direct harness — drives system/pack-import.mjs (the ONE import engine) over the
// mechanically merged Polaris v7 export. NOT committed; lives in the scratchpad.
// Three runs, each recorded verbatim:
//   run 1 — the raw merged export, exactly as Polaris publishes it (rgba() colours, rem dims).
//   run 2 — a mechanical value conversion pre-pass (rgba→hex, rem→px; deterministic arithmetic,
//           no judgement) — the shim a Polaris adapter would need. Recorded as a deviation.
//   run 3 — run 2's input plus explicit neutral/accent overrides if run 2 refuses over ramps.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = "/Users/Berzins/Desktop/Linards_current/wt-spike-b";
const { entriesFromExport, mapPack, parseContract } = await import(path.join(WT, "system/pack-import.mjs"));

const contractSrc = JSON.parse(readFileSync(path.join(WT, "system/tokens.source.json"), "utf8"));
const contract = parseContract(contractSrc, { label: "system/tokens.source.json" });

const raw = JSON.parse(readFileSync(path.join(HERE, "polaris-v7.export.json"), "utf8"));

// mechanical conversion: rgba(r,g,b,a) → #rrggbb / #rrggbbaa; N rem → N*16 px. Nothing else.
const RGBA = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;
const REM = /^(-?[\d.]+)rem$/;
const h2 = (n) => Math.round(n).toString(16).padStart(2, "0");
let convColor = 0, convAlpha = 0, convRem = 0;
function convert(v) {
  if (typeof v !== "string") return v;
  const m = RGBA.exec(v.trim());
  if (m) {
    const a = parseFloat(m[4]);
    if (a >= 1) { convColor++; return `#${h2(+m[1])}${h2(+m[2])}${h2(+m[3])}`; }
    convAlpha++; return `#${h2(+m[1])}${h2(+m[2])}${h2(+m[3])}${h2(a * 255)}`;
  }
  const r = REM.exec(v.trim());
  if (r) { convRem++; return `${parseFloat(r[1]) * 16}px`; }
  return v;
}
const converted = Object.fromEntries(
  Object.entries(raw).map(([k, node]) => [k, { ...node, value: convert(node.value) }]),
);

const log = [];
const say = (s) => { log.push(s); console.log(s); };

function attempt(label, json, opts = {}) {
  say(`\n${"=".repeat(90)}\nRUN: ${label}\n${"=".repeat(90)}`);
  const { entries, notes } = entriesFromExport(json);
  const byType = {};
  for (const e of entries) byType[e.type ?? "null"] = (byType[e.type ?? "null"] || 0) + 1;
  say(`entriesFromExport: ${entries.length} entries; by type: ${JSON.stringify(byType)}; parser notes: ${JSON.stringify(notes)}`);
  try {
    const r = mapPack({
      entries, contract, slug: "polaris",
      fileName: "polaris-v7.export.json (Shopify Polaris v7.0.0 public token export)",
      sourceKey: "polaris-v7",
      regenerate: "spike harness (scratchpad/spike-a-engine.mjs) — not a committed pack",
      ...opts,
    });
    say(`→ MAPPED. tokenCount=${r.tokenCount}, auto-filled from contract defaults=${r.filled.length}`);
    say(`picked ramps: ${JSON.stringify(r.picked)}; available ramps: ${JSON.stringify(r.available)}`);
    say(`\n--- placed (token ← source) ---`);
    for (const p of r.placed) say(`  ${p.token}  ←  ${p.source}`);
    say(`\n--- contrast negotiations (stepped) ---`);
    if (!r.stepped.length) say("  (none)");
    for (const s of r.stepped) say(`  ${s.token}: ${s.ramp}/${s.from} (${s.fromValue}) → ${s.ramp}/${s.to} (${s.toValue})`);
    say(`\n--- WCAG: ${r.checks.length - r.failures.length}/${r.checks.length} pairs pass ---`);
    for (const f of r.failures) say(`  STILL FAILING: ${f.fg} on ${f.bg} ${f.ratio}:1 < ${f.min}`);
    say(`\n--- scales ---`);
    say(`  offered: ${r.scales.offered}`);
    say(`  imported: ${JSON.stringify(r.scales.imported, null, 2)}`);
    say(`  short (auto-filled families): ${JSON.stringify(r.scales.short)}`);
    say(`  unclassified (read but not imported): ${JSON.stringify(r.scales.unclassified, null, 2)}`);
    say(`  auto-filled tokens (${r.filled.length}): ${r.filled.join(", ")}`);
    say(`\n--- the pack header (the mapping report as the pack itself carries it) ---`);
    say(r.note);
    say(`\n--- engine notes ---`);
    for (const n of r.notes) say(`  ${n}`);
    return r;
  } catch (err) {
    say(`→ REFUSED (thrown): ${err.message}`);
    if (err.candidates) say(`  err.candidates: ${JSON.stringify(err.candidates)}`);
    return null;
  }
}

const r1 = attempt("1 — raw Polaris v7 export (rgba colours, rem dimensions), no conversion", raw);
say(`\n[conversion pre-pass for run 2: ${convColor} opaque rgba→#rrggbb, ${convAlpha} alpha rgba→#rrggbbaa, ${convRem} rem→px]`);
const r2 = attempt("2 — mechanical rgba→hex + rem→px conversion, no overrides", converted);
let r3 = null;
if (!r2) r3 = attempt('3 — converted + explicit --neutral color --accent color overrides', converted, { neutral: "color", accent: "color" });

const outPath = path.join(HERE, "spike-a-engine-output.txt");
writeFileSync(outPath, log.join("\n"));
console.log(`\nraw output saved → ${outPath}`);
const final = r3 ?? r2 ?? r1;
if (final) writeFileSync(path.join(HERE, "tokens.polaris.spike.css"), final.css);
