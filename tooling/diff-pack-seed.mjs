// tooling/diff-pack-seed.mjs — spike 1: derivation fidelity (Verdant round-trip diff).
// Folds architecture spike 1 (docs/epics/per-company-brief.architecture.md §Spikes &
// experiments; epic #38, ticket #40): measure how close the vision agent's PROPOSED pack
// seed gets to ground truth, and emit the labelling verdict the spike's decision rule keys on.
//
// Ground truth = derive(Verdant's own axes).tokens — the canonical pack by construction
// (the same values proto/verdant.html renders under a Verdant skin). The diff:
//   · colour → perceptual OKLab ΔE (Euclidean distance in OKLab), accent drives the verdict;
//   · type  → intrinsic usability of the PROPOSED ramp (monotonic · body∈[14,18] · sane ratios),
//             scored viewport-robustly (plain-px steps only; the clamp/vw steps reported unscored);
//   · spacing → monotonic + on the 4px grid;  radius → monotonic (reported).
// Verdict: accent ΔE ≤ 0.05 AND type usable AND spacing usable → "agent-proposed, human-approved";
// else "human-authored with agent assistance". BOTH outcomes are legitimate — the round-trip diff
// ships as the public demo either way — so this is a MEASUREMENT, not a gate: it always exits 0.
//
// Honesty (hard): Verdant is a CLOSED round-trip against the engine's OWN output — an easy,
// controlled case (reading a solid accent off a render is near colour-picking). Neutrals are
// tinted by the engine at sub-perceptual chroma, so their ΔE looks large but is perceptually
// trivial: they are reported for transparency and EXCLUDED from the verdict. The fidelity claim
// rests on the offline real-product test, not this ΔE — stated in the mandatory `caveat`.
// Zero-dep Node ESM; imports the SAME modules the browser runs (oklch/wcag/derive) — nothing
// parallel to drift. Paths resolve from this module (NOT cwd).
//   node tooling/diff-pack-seed.mjs <seed.json> [out.diff.json]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hexToRgb, rgbToOklab } from "../system/oklch.mjs";
import { checkPairs } from "../system/wcag.mjs";
import { derive } from "../system/derive.mjs";
import { RULESET } from "../system/derive.rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "system", "tokens.source.json");
const VERDANT_AXES_PATH = join(ROOT, "scenarios", "verdant", "intake.defaults.json");

// ---- tunables (the spike records the actual numbers regardless of these) ----
const ACCENT_DELTAE_MAX = 0.05; // "small perceptual delta" — ΔE≈0.02 is ~1 JND in OKLab.
const BODY_PX = [14, 18];       // a usable body size band.
// Adjacent type-ratio band. DEVIATION from the plan's [1.1,1.6], calibrated so the ENGINE'S OWN
// comfortable ramp passes: it has a 13→12 tail ratio of 1.083 and a 49→31 head ratio of 1.581,
// both outside [1.1,1.6] — a strict band would false-fail by-construction-usable ground truth.
const RATIO_BAND = [1.05, 1.7];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const oklab = (hex) => rgbToOklab(hexToRgb(hex));
const deltaE = (a, b) => {
  const x = oklab(a), y = oklab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
};
const round = (n, d = 4) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

// A representative px for a step: a plain "Npx" is N; a clamp(min, vw, max) is its MAX (ceiling).
// (Viewport-robust: comparing design ceilings, never a rendered-at-width measurement — GOTCHA 1.)
const pxOf = (v) => {
  const pxs = [...String(v ?? "").matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
  return pxs.length ? pxs[pxs.length - 1] : null;
};

// Token categories for the colour diff. Accent PRIMARY drives the verdict; its family +
// the neutrals are reported. color-mix / font / dimension tokens carry no ΔE (skipped).
const ACCENT_PRIMARY = "color-accent";
const ACCENT_FAMILY = [
  "color-accent-hover", "color-accent-active", "color-accent-fg",
  "color-accent-secondary", "color-accent-on-inverse",
];
const NEUTRALS = [
  "color-fg", "color-fg-muted", "color-bg", "color-bg-surface", "color-border",
  "color-border-strong", "color-white", "color-bg-inverse", "color-fg-on-inverse",
  "color-fg-on-inverse-strong",
];
const TYPE_STEPS = [
  "type-display", "type-h1", "type-h2", "type-h3", "type-lead", "type-body", "type-caption", "type-eyebrow",
];
const TYPE_PLAIN = ["type-h3", "type-body", "type-caption", "type-eyebrow"]; // scored per-step
const TYPE_VW = ["type-display", "type-h1", "type-h2", "type-lead"];         // reported unscored
const SPACING_STEPS = [
  "spacing-xs", "spacing-sm", "spacing-md", "spacing-lg", "spacing-xl", "spacing-2xl", "spacing-3xl", "spacing-4xl",
];
const RADIUS_STEPS = ["radius-sm", "radius-md", "radius-lg"];

const isIncreasing = (a) => a.every((n, i) => i === 0 || (n != null && a[i - 1] != null && n > a[i - 1]));
const isDecreasing = (a) => a.every((n, i) => i === 0 || (n != null && a[i - 1] != null && n < a[i - 1]));

// Read the DTCG seed's proposed value for a token (undefined if the agent didn't propose it).
const proposedValue = (seed, name) => seed?.tokens?.[name]?.$value;

// Contract defaults (for the AA table's completion — the pack as it would actually ship).
function contractDefaults() {
  const src = JSON.parse(readFileSync(SOURCE, "utf8"));
  const out = {};
  for (const [secKey, sec] of Object.entries(src.contract)) {
    if (secKey.startsWith("$")) continue;
    for (const [name, tok] of Object.entries(sec)) {
      if (!name.startsWith("$")) out[name] = tok.$value;
    }
  }
  return out;
}

export function diffPackSeed(seed) {
  const { axes } = JSON.parse(readFileSync(VERDANT_AXES_PATH, "utf8"));
  const truthResult = derive({
    brandColor: axes.brandColor, density: axes.density,
    rewardType: axes.rewardType, frequency: axes.frequency,
  });
  const truth = truthResult.tokens;
  const defaults = contractDefaults();
  const contractNames = Object.keys(defaults);

  const notProposed = contractNames.filter((n) => proposedValue(seed, n) === undefined);

  // ---- colour ΔE ----
  const colourRow = (name) => {
    const proposed = proposedValue(seed, name);
    const t = truth[name];
    const bothHex = HEX_RE.test(String(proposed)) && HEX_RE.test(String(t));
    return {
      token: name, proposed: proposed ?? null, truth: t ?? null,
      deltaE: bothHex ? round(deltaE(proposed, t)) : null,
      note: proposed === undefined ? "not proposed" : bothHex ? null : "non-hex — ΔE n/a",
    };
  };
  const accent = colourRow(ACCENT_PRIMARY);
  accent.threshold = ACCENT_DELTAE_MAX;
  accent.within = accent.deltaE != null && accent.deltaE <= ACCENT_DELTAE_MAX;
  const accentFamily = ACCENT_FAMILY.map(colourRow);
  const neutrals = NEUTRALS.map(colourRow);

  // ---- type usability (of the PROPOSED ramp) ----
  const typePx = TYPE_STEPS.map((s) => pxOf(proposedValue(seed, s)));
  const allParsed = typePx.every((n) => n != null);
  const monotonic = allParsed && isDecreasing(typePx);
  const bodyPx = pxOf(proposedValue(seed, "type-body"));
  const bodyInRange = bodyPx != null && bodyPx >= BODY_PX[0] && bodyPx <= BODY_PX[1];
  const ratios = allParsed
    ? typePx.slice(1).map((n, i) => round(typePx[i] / n, 3))
    : [];
  const ratiosInBand = allParsed && ratios.every((r) => r >= RATIO_BAND[0] && r <= RATIO_BAND[1]);
  const typeUsable = Boolean(monotonic && bodyInRange && ratiosInBand);
  const typeScored = TYPE_PLAIN.map((s) => {
    const p = pxOf(proposedValue(seed, s)), t = pxOf(truth[s]);
    return { step: s, proposed: proposedValue(seed, s) ?? null, truth: truth[s], proposedPx: p, truthPx: t, deltaPx: p != null && t != null ? round(p - t, 2) : null };
  });
  const typeUnscored = TYPE_VW.map((s) => ({ step: s, proposed: proposedValue(seed, s) ?? null, truth: truth[s], note: "vw-sloped clamp — reported, not scored (viewport artifact, GOTCHA 1)" }));

  // ---- spacing / radius ----
  const spacingPx = SPACING_STEPS.map((s) => pxOf(proposedValue(seed, s)));
  const spacingMonotonic = spacingPx.every((n) => n != null) && isIncreasing(spacingPx);
  const spacingMultiples = spacingPx.every((n) => n != null && Number.isInteger(n) && n % 4 === 0);
  const spacingUsable = Boolean(spacingMonotonic && spacingMultiples);
  const radiusPx = RADIUS_STEPS.map((s) => pxOf(proposedValue(seed, s)));
  const radiusUsable = Boolean(radiusPx.every((n) => n != null) && isIncreasing(radiusPx));

  // ---- AA usability table over the proposed palette (completed with contract fallback) ----
  const proposedComplete = {};
  for (const n of contractNames) proposedComplete[n] = proposedValue(seed, n) ?? defaults[n];
  let aaTable, aaError = null;
  try { aaTable = checkPairs(proposedComplete, RULESET.wcagPairs).map(({ fg, bg, min, usage, ratio, pass }) => ({ fg, bg, min, usage, ratio, pass })); }
  catch (e) { aaTable = null; aaError = e.message; }

  // ---- verdict ----
  const passes = { accentWithin: accent.within, typeUsable, spacingUsable };
  const label = passes.accentWithin && passes.typeUsable && passes.spacingUsable
    ? "agent-proposed, human-approved"
    : "human-authored with agent assistance";

  const caveat =
    "Verdant is a CLOSED round-trip against the engine's own derive() output — an easy, controlled " +
    "case: reading a solid accent off a render is near colour-picking, so a near-zero accent ΔE is " +
    "expected and proves the PIPELINE, not high-fidelity derivation. Neutral tokens are tinted by the " +
    "engine at sub-perceptual chroma (bgSurface cMax 0.006); a vision agent reads them as plain white/" +
    "grey, so their ΔE looks large but is perceptually trivial — reported for transparency, EXCLUDED " +
    "from the verdict. The fidelity claim rests on the offline real-product test (real photography, real " +
    "published tokens, real ambiguity), recorded in the architecture's §Spikes — not on this number.";

  return {
    spike: "1 — derivation fidelity (Verdant round-trip)",
    groundTruth: { source: "derive(Verdant axes).tokens", axes, rulesetVersion: truthResult.rulesetVersion },
    accent,
    accentFamily,
    neutrals: { note: "tinted at sub-perceptual chroma by the engine; reported, EXCLUDED from the verdict", tokens: neutrals },
    type: { usable: typeUsable, checks: { monotonic, bodyInRange, ratiosInBand }, ratioBand: RATIO_BAND, ratios, scored: typeScored, unscored: typeUnscored },
    spacing: { usable: spacingUsable, checks: { monotonic: spacingMonotonic, multiplesOf4: spacingMultiples }, steps: SPACING_STEPS.map((s, i) => ({ step: s, proposed: proposedValue(seed, s) ?? null, truth: truth[s], px: spacingPx[i] })) },
    radius: { usable: radiusUsable, steps: RADIUS_STEPS.map((s, i) => ({ step: s, proposed: proposedValue(seed, s) ?? null, truth: truth[s], px: radiusPx[i] })) },
    aa: aaError ? { error: aaError } : { note: "proposed palette completed with contract fallback for any unproposed token", pairs: aaTable },
    notProposed,
    verdict: { label, passes, rule: "accent ΔE ≤ 0.05 AND type usable AND spacing usable" },
    caveat,
  };
}

// spike-palette-style markdown, paste-ready into the ticket / §Spikes.
export function diffMarkdown(r) {
  const yn = (b) => (b ? "✓" : "✗");
  const row = (x) => `| \`${x.token}\` | \`${x.proposed ?? "—"}\` | \`${x.truth ?? "—"}\` | ${x.deltaE ?? (x.note || "n/a")} |`;
  const lines = [
    `## Spike ${r.spike}`,
    "",
    `Ground truth: \`${r.groundTruth.source}\` (axes \`${r.groundTruth.axes.brandColor}\` / ${r.groundTruth.axes.density} / ${r.groundTruth.axes.rewardType} / ${r.groundTruth.axes.frequency}; ruleset v${r.groundTruth.rulesetVersion}).`,
    "",
    `**Verdict: ${r.verdict.label}** — rule: ${r.verdict.rule}.`,
    `accent within ${r.accent.threshold} ΔE: ${yn(r.verdict.passes.accentWithin)} · type usable: ${yn(r.verdict.passes.typeUsable)} · spacing usable: ${yn(r.verdict.passes.spacingUsable)}.`,
    "",
    "### Accent (drives the verdict)",
    "| token | proposed | ground truth | ΔE (OKLab) |",
    "| --- | --- | --- | --- |",
    row(r.accent),
    "",
    "### Accent family (reported)",
    "| token | proposed | ground truth | ΔE |",
    "| --- | --- | --- | --- |",
    ...r.accentFamily.map(row),
    "",
    "### Neutrals — reported, EXCLUDED from the verdict",
    `_${r.neutrals.note}._`,
    "| token | proposed | ground truth | ΔE |",
    "| --- | --- | --- | --- |",
    ...r.neutrals.tokens.map(row),
    "",
    `### Type ramp — usable: ${yn(r.type.usable)} (monotonic ${yn(r.type.checks.monotonic)} · body∈[14,18] ${yn(r.type.checks.bodyInRange)} · ratios∈[${r.type.ratioBand.join(",")}] ${yn(r.type.checks.ratiosInBand)})`,
    "Scored (viewport-robust plain-px steps):",
    "| step | proposed | truth | Δpx |",
    "| --- | --- | --- | --- |",
    ...r.type.scored.map((s) => `| ${s.step} | \`${s.proposed ?? "—"}\` | \`${s.truth}\` | ${s.deltaPx ?? "n/a"} |`),
    "",
    "Unscored (vw-sloped clamp steps — reported only):",
    "| step | proposed | truth |",
    "| --- | --- | --- |",
    ...r.type.unscored.map((s) => `| ${s.step} | \`${s.proposed ?? "—"}\` | \`${s.truth}\` |`),
    "",
    `### Spacing — usable: ${yn(r.spacing.usable)} (monotonic ${yn(r.spacing.checks.monotonic)} · multiples of 4 ${yn(r.spacing.checks.multiplesOf4)}) · Radius — usable: ${yn(r.radius.usable)}`,
    "",
    r.aa.error ? `_AA table unavailable: ${r.aa.error}_` : `### Proposed palette — WCAG AA (${r.aa.pairs.filter((p) => p.pass).length}/${r.aa.pairs.length} pairs pass)`,
    ...(r.aa.error ? [] : ["| pair | ratio | min | AA |", "| --- | --- | --- | --- |", ...r.aa.pairs.map((p) => `| ${p.fg} / ${p.bg} | ${p.ratio} | ${p.min} | ${p.pass ? "pass" : "**FAIL**"} |`)]),
    "",
    r.notProposed.length ? `_Tokens the agent did not propose (auto-filled from contract defaults in the shipped pack): ${r.notProposed.join(", ")}._` : "_Every contract token was proposed._",
    "",
    "> **Honesty caveat.** " + r.caveat,
    "",
  ];
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [seedArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!seedArg) {
    console.error("usage: node tooling/diff-pack-seed.mjs <seed.json> [out.diff.json]");
    process.exit(1);
  }
  const seed = JSON.parse(readFileSync(resolve(process.cwd(), seedArg), "utf8"));
  const result = diffPackSeed(seed);
  if (outArg) {
    const out = resolve(process.cwd(), outArg);
    writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
    process.stderr.write(`diff-pack-seed   ✓  ${relative(process.cwd(), out)} — verdict: ${result.verdict.label}\n`);
  }
  console.log(diffMarkdown(result));
  // A measurement, not a gate — both labels are legitimate outcomes. Always exit 0.
  process.exit(0);
}
