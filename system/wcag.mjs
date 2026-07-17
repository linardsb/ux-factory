// system/wcag.mjs — WCAG 2.x relative luminance + contrast checking (view-time canon).
// Part of the derivation engine (epic #1, ticket #3); the checker that lets the
// engine SHOW its accessibility checks passing rather than claim them.
// Formulas: https://www.w3.org/TR/WCAG22/#contrast-minimum (SC 1.4.3, AA 4.5:1 text)
// and #non-text-contrast (SC 1.4.11, AA 3:1 UI). Relative luminance per the W3C
// definition; linearization is shared with oklch.mjs (0.04045 threshold — the
// spec's printed 0.03928 is a known erratum, identical for 8-bit channels).

import { hexToRgb, srgbToLinear } from "./oklch.mjs";

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA), lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Run a declared pair list against an emitted token map. Pairs only ever name
// hex-emitting tokens (the ruleset's color-mix() passthroughs are relative values
// a JS checker can't resolve) — a non-hex reference is a ruleset bug, so throw.
// `pass` is decided on the unrounded ratio; `ratio` is rounded for display.
export function checkPairs(tokens, pairs) {
  return pairs.map(({ fg, bg, min, usage }) => {
    for (const name of [fg, bg]) {
      const v = tokens[name];
      if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
        throw new Error(`wcag: pair token "${name}" is not a hex color (got "${v}")`);
      }
    }
    const exact = contrastRatio(tokens[fg], tokens[bg]);
    return {
      fg, bg, min, usage,
      fgValue: tokens[fg],
      bgValue: tokens[bg],
      ratio: Math.round(exact * 100) / 100,
      pass: exact >= min,
    };
  });
}
