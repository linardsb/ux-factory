// tooling/spike-palette.mjs — spike 2: palette derivation quality (factory tooling).
// Folds architecture spike 2 into ticket #3 (docs/epics/ai-first-ux-factory.architecture.md
// §Spikes & experiments): run the derivation engine over diverse brand colors and
// auto-check WCAG AA across every declared token pair. Decision rule: ≥95% of pairs
// pass unaided → full live derivation; else scope live derivation to color only.
// Zero-dep Node ESM; imports the SAME modules the browser runs — nothing parallel to drift.
// Standalone:  node tooling/spike-palette.mjs   (exit 0 = decision rule met)
// Stages: 1 math anchors · 2 contract completeness · 3 spike matrix · 4 decision rule.
// Paths resolve from this module (NOT cwd) — same convention as agent-layer/gen-token-css.mjs.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hexToOklch, oklchToHex, rgbToOklab, toGamut, inGamut } from "../system/oklch.mjs";
import { contrastRatio } from "../system/wcag.mjs";
import { derive } from "../system/derive.mjs";
import { RULESET } from "../system/derive.rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pad = (s, n) => String(s).padEnd(n);

// ---- Stage 1: math anchors (Ottosson's published OKLab values + WCAG boundary pairs) ----
export function checkAnchors() {
  const near = (a, b, eps) => Math.abs(a - b) <= eps;
  const red = rgbToOklab({ r: 1, g: 0, b: 0 });
  const white = rgbToOklab({ r: 1, g: 1, b: 1 });
  const failures = [];
  if (!near(red.l, 0.62796, 0.001) || !near(red.a, 0.22486, 0.001) || !near(red.b, 0.12585, 0.001)) {
    failures.push(`sRGB red → OKLab expected ≈(0.628, 0.225, 0.126), got (${red.l.toFixed(4)}, ${red.a.toFixed(4)}, ${red.b.toFixed(4)})`);
  }
  if (!near(white.l, 1, 1e-4) || !near(white.a, 0, 1e-4) || !near(white.b, 0, 1e-4)) {
    failures.push("sRGB white → OKLab expected (1, 0, 0)");
  }
  for (const hex of ["#2563eb", "#1a1a1a", "#f4f4f5", "#78350f", "#ffd400", "#808080"]) {
    if (oklchToHex(hexToOklch(hex)) !== hex) failures.push(`round-trip drift on ${hex}`);
  }
  if (!inGamut(toGamut({ l: 0.55, c: 0.4, h: 145 }))) failures.push("toGamut left the sRGB gamut");
  if (!near(contrastRatio("#ffffff", "#000000"), 21, 0.01)) failures.push("contrast(white, black) ≠ 21");
  if (contrastRatio("#767676", "#ffffff") < 4.5) failures.push("#767676 on white must pass AA");
  if (contrastRatio("#777777", "#ffffff") >= 4.5) failures.push("#777777 on white must fail AA");
  return failures;
}

// ---- Stage 2: completeness — emitted keys ⊇ the DTCG contract's leaf tokens ----
export function checkCompleteness() {
  const src = JSON.parse(readFileSync(join(ROOT, "system", "tokens.source.json"), "utf8"));
  const contractKeys = [];
  for (const [section, sec] of Object.entries(src.contract)) {
    if (section.startsWith("$")) continue;
    for (const name of Object.keys(sec)) if (!name.startsWith("$")) contractKeys.push(name);
  }
  const emitted = new Set(Object.keys(
    derive({ brandColor: "#2563eb", density: "comfortable", rewardType: "hunt", frequency: "weekly" }).tokens,
  ));
  return {
    contract: contractKeys.length,
    emitted: emitted.size,
    missing: contractKeys.filter((k) => !emitted.has(k)),
    extra: [...emitted].filter((k) => !contractKeys.includes(k)),
  };
}

// ---- Stage 3: the spike matrix — diverse brands, hostile ones included ----
export const SPIKE_COLORS = [
  ["#2563eb", "control — the neutral pack's own blue"],
  ["#e11d48", "saturated red/pink"],
  ["#10b981", "mid green"],
  ["#7c3aed", "violet"],
  ["#f97316", "orange"],
  ["#ffd400", "saturated yellow — hostile: very light"],
  ["#a3e635", "lime — hostile: light + high chroma"],
  ["#78350f", "dark brown — hostile: very dark"],
];

export function runSpike(colors = SPIKE_COLORS) {
  return colors.map(([hex, label]) => {
    const r = derive({ brandColor: hex, density: "comfortable", rewardType: "hunt", frequency: "weekly" });
    return { hex, label, result: r, passed: r.checks.filter((c) => c.pass).length, total: r.checks.length };
  });
}

// Markdown report, ready to paste into issue #3 (per-pair detail folded into <details>).
export function spikeMarkdown(runs, verdict) {
  const lines = [
    "## Spike 2 — palette derivation quality (ruleset v" + RULESET.version + ")",
    "",
    `Engine run over ${runs.length} brand colors × ${runs[0].total} declared WCAG pairs ` +
      "(`RULESET.wcagPairs` — every fg/bg pairing the components create; 4.5:1 text, 3:1 non-text UI).",
    "",
    "| brand | character | accent emitted | pairs AA | engine negotiations |",
    "| --- | --- | --- | --- | --- |",
    ...runs.map(({ hex, label, result, passed, total }) =>
      `| \`${hex}\` | ${label} | \`${result.tokens["color-accent"]}\` | ${passed}/${total} | ${
        result.notes.filter((n) => n.token).map((n) => n.action).join(", ") || "none — passed untouched"} |`),
    "",
    verdict,
    "",
    "<details><summary>Per-pair detail</summary>",
    "",
  ];
  for (const { hex, label, result } of runs) {
    lines.push(`### \`${hex}\` — ${label}`, "", "| pair | ratio | min | AA |", "| --- | --- | --- | --- |");
    for (const c of result.checks) {
      lines.push(`| ${c.fg} / ${c.bg} | ${c.ratio.toFixed(2)} | ${c.min} | ${c.pass ? "pass" : "**FAIL**"} |`);
    }
    lines.push("");
  }
  lines.push("</details>", "");
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Stage 1
  const anchors = checkAnchors();
  if (anchors.length) {
    console.error(`math anchors    ✗  ${anchors.join(" · ")}`);
    process.exit(1);
  }
  console.log("math anchors    ✓  OKLab reference values, round-trips, gamut clamp, WCAG boundary pairs");

  // Stage 2
  const comp = checkCompleteness();
  if (comp.missing.length) {
    console.error(`completeness    ✗  contract tokens missing from the engine: ${comp.missing.join(", ")}`);
    process.exit(1);
  }
  console.log(`completeness    ✓  ${comp.emitted} emitted ⊇ ${comp.contract} contract tokens${
    comp.extra.length ? `  (extra: ${comp.extra.join(", ")})` : ""}`);

  // Stage 3
  const runs = runSpike();
  for (const { hex, label, passed, total, result } of runs) {
    const negotiated = result.notes.filter((n) => n.token).length;
    console.log(`  ${pad(hex, 9)} ${passed}/${total} AA  accent ${result.tokens["color-accent"]}  ${
      negotiated ? `(${negotiated} negotiations)` : "(untouched)"}  ${label}`);
  }

  // Stage 4
  const passed = runs.reduce((n, r) => n + r.passed, 0);
  const total = runs.reduce((n, r) => n + r.total, 0);
  const pct = (100 * passed) / total;
  const met = pct >= 95;
  const verdict = met
    ? `**Decision rule met: ${passed}/${total} pairs pass AA unaided (${pct.toFixed(1)}% ≥ 95%) → full live derivation.**`
    : `**Decision rule NOT met: ${passed}/${total} (${pct.toFixed(1)}% < 95%) → scope live derivation to color only, presets for the rest (Screen-1 fallback).**`;
  console.log(`spike 2         ${met ? "✓" : "✗"}  ${passed}/${total} pairs AA (${pct.toFixed(1)}%) — ${
    met ? "full live derivation" : "Screen-1 fallback: color-only live derivation"}`);
  console.log("");
  console.log(spikeMarkdown(runs, verdict));
  process.exit(met ? 0 : 1);
}
