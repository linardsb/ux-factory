// system/derive.mjs — view-time deterministic derivation engine (hand-written canon, this repo).
// Turns bounded intake answers into a complete semantic-token value set, live in the
// browser: brand color → OKLCH-derived accessible palette (WCAG checks included in the
// result), density → type + spacing scales, Hooked reward type → component patterns,
// frequency → the ethics-gate verdict.
// Spec: docs/epics/ai-first-ux-factory.architecture.md §Recommended approach (epic #1,
// ticket #3). Zero runtime deps; DOM-free — the same module runs under Node
// (tooling/spike-palette.mjs) and in the browser (derive.html, later the Factory page).
//
// Every adjustment the engine makes on the way to an accessible palette (lightness
// clamped, chroma gamut-clamped, accent darkened for contrast, patterns gated) is
// reported in `notes` — the brand-vs-accessibility negotiation is shown, never silent.

import { hexToOklch, oklchToHex, toGamut } from "./oklch.mjs";
import { contrastRatio, checkPairs } from "./wcag.mjs";
import { RULESET } from "./derive.rules.mjs";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Boundary validation: throw plain Errors naming the offending input (project
// convention — portal/lib/intake.mjs, agent-layer/gen-token-css.mjs).
function validate(input, ruleset) {
  if (!input || typeof input !== "object") throw new Error("derive: input must be an object");
  const { brandColor, density, rewardType, frequency, improvesLives, wouldUseIt } = input;
  if (typeof brandColor !== "string" || !HEX_RE.test(brandColor)) {
    throw new Error(`derive: brandColor "${brandColor}" is not a #rrggbb hex`);
  }
  if (!(density in ruleset.scales)) {
    throw new Error(`derive: unknown density "${density}" (expected ${Object.keys(ruleset.scales).join(" | ")})`);
  }
  if (!(rewardType in ruleset.patterns)) {
    throw new Error(`derive: unknown rewardType "${rewardType}" (expected ${Object.keys(ruleset.patterns).join(" | ")})`);
  }
  if (!(frequency in ruleset.ethics.frequencyFilter)) {
    throw new Error(`derive: unknown frequency "${frequency}" (expected ${Object.keys(ruleset.ethics.frequencyFilter).join(" | ")})`);
  }
  for (const [k, v] of [["improvesLives", improvesLives], ["wouldUseIt", wouldUseIt]]) {
    if (v !== undefined && typeof v !== "boolean") throw new Error(`derive: ${k} must be a boolean when given`);
  }
  return { brandColor: brandColor.toLowerCase(), density, rewardType, frequency, improvesLives, wouldUseIt };
}

const round3 = (n) => Math.round(n * 1000) / 1000;

export function derive(rawInput, ruleset = RULESET) {
  const input = validate(rawInput, ruleset);
  const notes = [];
  const P = ruleset.palette;
  const brand = hexToOklch(input.brandColor);

  // Every neutral is the brand hue at near-zero chroma — the ceilings keep the
  // tint subliminal; toGamut guarantees a real sRGB color at the target lightness.
  const tint = ({ l, cMax }) => oklchToHex(toGamut({ l, c: Math.min(brand.c, cMax), h: brand.h }));

  const fg = tint(P.neutrals.fg);
  const fgMuted = tint(P.neutrals.fgMuted);
  const bgSurface = tint(P.neutrals.bgSurface);
  const border = tint(P.neutrals.border);
  const bgInverse = tint(P.inverse.bgInverse);
  const fgOnInverse = tint(P.inverse.fgOnInverse);

  // ---- Accent: brand-preservation clamp, then the accessibility negotiation ----
  let acc = { ...brand };
  const [loL, hiL] = P.accent.lightnessClamp;
  if (acc.l < loL || acc.l > hiL) {
    const to = Math.min(hiL, Math.max(loL, acc.l));
    notes.push({ token: "color-accent", action: "lightness-clamped", from: round3(acc.l), to,
      why: `brand lightness ${round3(acc.l)} is outside the usable accent band [${loL}, ${hiL}]` });
    acc = { ...acc, l: to };
  }
  const preGamut = acc.c;
  acc = toGamut(acc);
  if (preGamut - acc.c > 1e-4) {
    notes.push({ token: "color-accent", action: "gamut-clamped", from: round3(preGamut), to: round3(acc.c),
      why: "chroma reduced to the nearest sRGB-displayable value at this lightness and hue" });
  }
  // Darken until the accent reads AA as text against the derived card surface —
  // one condition that also secures accent-on-white and white-on-accent (the
  // surface is the lighter ground, see the ruleset's wcagPairs commentary).
  const { against, min, step, minL } = P.accent.contrastFloor;
  const surfaceHex = against === "color-bg-surface" ? bgSurface : "#ffffff";
  const beforeNegotiation = acc.l;
  while (contrastRatio(oklchToHex(acc), surfaceHex) < min && acc.l - step >= minL) {
    acc = toGamut({ l: acc.l - step, c: acc.c, h: acc.h });
  }
  if (beforeNegotiation - acc.l > 1e-9) {
    notes.push({ token: "color-accent", action: "darkened-for-contrast", from: round3(beforeNegotiation), to: round3(acc.l),
      why: `lightness lowered until the accent reads ≥ ${min}:1 as text on the card surface` });
  }
  const accent = oklchToHex(acc);
  const stepDown = (dL) => oklchToHex(toGamut({ l: Math.max(acc.l + dL, P.accent.stepFloorL), c: acc.c, h: acc.h }));
  const accentHover = stepDown(P.accent.hoverDeltaL);
  const accentActive = stepDown(P.accent.activeDeltaL);
  let accentFg = "#ffffff";
  if (contrastRatio("#ffffff", accent) < P.accent.fgContrastMin) {
    accentFg = fg;
    notes.push({ token: "color-accent-fg", action: "flipped-to-dark", from: "#ffffff", to: fg,
      why: `white misses ${P.accent.fgContrastMin}:1 on this accent fill; dark foreground carries the label` });
  }
  const accentSecondary = tint(P.accent.secondary);

  // On-inverse accent: lighten (never darken) from the negotiated accent until it
  // reads AA as text on the derived dark ground (ruleset §palette.accent.onInverse).
  const oi = P.accent.onInverse;
  let accOn = { ...acc };
  while (contrastRatio(oklchToHex(accOn), bgInverse) < oi.min && accOn.l + oi.step <= oi.maxL) {
    accOn = toGamut({ l: accOn.l + oi.step, c: accOn.c, h: accOn.h });
  }
  if (accOn.l - acc.l > 1e-9) {
    notes.push({ token: "color-accent-on-inverse", action: "lightened-for-contrast", from: round3(acc.l), to: round3(accOn.l),
      why: `lightness raised until the accent reads ≥ ${oi.min}:1 as text on the dark ground` });
  }
  const accentOnInverse = oklchToHex(accOn);

  // ---- Scales: table-driven spacing, ratio-driven modular type ramp ----
  const scale = ruleset.scales[input.density];
  const spacingNames = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
  const spacing = Object.fromEntries(spacingNames.map((n, i) => [`spacing-${n}`, `${scale.spacing[i]}px`]));
  const type = Object.fromEntries(Object.entries(ruleset.typeSteps).map(([name, t]) => {
    const max = Math.round(scale.bodyPx * scale.ratio ** t.exp);
    const value = t.vw ? `clamp(${Math.round(max * t.minRatio)}px, ${t.vw}vw, ${max}px)` : `${max}px`;
    return [name, value];
  }));

  // ---- Patterns + ethics gate ----
  const passesFrequencyFilter = ruleset.ethics.frequencyFilter[input.frequency];
  const patterns = ruleset.patterns[input.rewardType].map((p) =>
    !passesFrequencyFilter && p.habitMechanic ? { ...p, gatedBy: "frequency-filter" } : { ...p });
  const gated = patterns.filter((p) => p.gatedBy);
  if (gated.length) {
    notes.push({ token: null, action: "patterns-gated", from: null, to: gated.map((p) => p.id).join(", "),
      why: `"${input.frequency}" fails the Hooked frequency filter — habit mechanics are rejected, and shown rejected` });
  }
  const ethics = {
    frequency: input.frequency,
    passesFrequencyFilter,
    verdict: ruleset.ethics.verdicts[passesFrequencyFilter ? "pass" : "fail"],
    ...(typeof input.improvesLives === "boolean" && typeof input.wouldUseIt === "boolean"
      ? { quadrant: ruleset.ethics.matrix[input.improvesLives][input.wouldUseIt] }
      : {}),
  };

  // ---- The complete value set for every token the contract declares ----
  const tokens = {
    "color-fg": fg,
    "color-fg-muted": fgMuted,
    "color-bg": P.neutrals.bg,
    "color-bg-surface": bgSurface,
    "color-border": border,
    "color-border-strong": fg,
    "color-white": P.neutrals.white,
    "color-accent": accent,
    "color-accent-hover": accentHover,
    "color-accent-active": accentActive,
    "color-accent-fg": accentFg,
    "color-accent-secondary": accentSecondary,
    "color-accent-on-inverse": accentOnInverse,
    "color-bg-inverse": bgInverse,
    "color-fg-on-inverse": fgOnInverse,
    "color-fg-on-inverse-strong": P.inverse.fgOnInverseStrong,
    ...ruleset.statics.inverseMixes,
    ...ruleset.statics.fonts,
    ...spacing,
    ...ruleset.statics.radius,
    ...ruleset.statics.shadows,
    maxw: ruleset.statics.maxw,
    gutter: scale.gutter,
    ...type,
  };

  return {
    input,
    rulesetVersion: ruleset.version,
    tokens,
    notes,
    checks: checkPairs(tokens, ruleset.wcagPairs),
    patterns,
    ethics,
  };
}
