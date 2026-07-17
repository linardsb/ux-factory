// system/oklch.mjs — hand-written OKLCH ↔ sRGB color math (view-time canon, this repo).
// Part of the derivation engine (docs/epics/ai-first-ux-factory.architecture.md
// §Recommended approach; epic #1, ticket #3). Zero deps, DOM-free: the same module
// runs in the browser (derive.html) and under Node (tooling/spike-palette.mjs).
//
// Conversion constants are Björn Ottosson's published OKLab matrices, copied verbatim
// from https://bottosson.github.io/posts/oklab/ (verified against the source 2026-07-17).
// The math is hand-written on purpose — it is part of the demonstration (architecture
// §Stack: "Color/contrast math: hand-written").
//
// Conventions: {r,g,b} are gamma-encoded sRGB in [0,1] · {l,a,b} is OKLab ·
// {l,c,h} is OKLCH with hue in degrees [0,360). Hex is lowercase #rrggbb.

export function hexToRgb(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`oklch: "${hex}" is not a #rrggbb hex color`);
  }
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

export function rgbToHex({ r, g, b }) {
  const ch = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

// sRGB transfer function. The 0.04045 threshold is the IEC sRGB value; WCAG 2.x
// prints 0.03928 (a known erratum — identical results for 8-bit channels), so
// wcag.mjs reuses THIS linearization rather than keeping a second copy.
export const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// Gamma sRGB → OKLab (linearize → LMS → cube root → Lab).
export function rgbToOklab({ r, g, b }) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    l: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

// OKLab → gamma sRGB. Channels are NOT clamped — out-of-[0,1] values are the
// in-gamut signal inGamut()/toGamut() rely on.
export function oklabToRgb({ l, a, b }) {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  return {
    r: linearToSrgb(+4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    g: linearToSrgb(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    b: linearToSrgb(-0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S),
  };
}

export function oklabToOklch({ l, a, b }) {
  const c = Math.hypot(a, b);
  // Near-achromatic hue is numerically meaningless — pin it to 0, never NaN.
  const h = c < 1e-5 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h };
}

export function oklchToOklab({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

export const hexToOklch = (hex) => oklabToOklch(rgbToOklab(hexToRgb(hex)));
export const oklchToHex = (lch) => rgbToHex(oklabToRgb(oklchToOklab(lch)));

const EPS = 1e-4;

export function inGamut(lch) {
  const { r, g, b } = oklabToRgb(oklchToOklab(lch));
  return [r, g, b].every((v) => v >= -EPS && v <= 1 + EPS);
}

// Bring an OKLCH color into the sRGB gamut by reducing chroma at fixed lightness
// and hue (binary search — the simple approach; Ottosson's projection variant at
// https://bottosson.github.io/posts/gamutclipping/ is deliberately not needed here).
export function toGamut({ l, c, h }) {
  const L = Math.min(1, Math.max(0, l)); // l outside [0,1] can never reach gamut, even at c=0
  if (inGamut({ l: L, c, h })) return { l: L, c, h };
  let lo = 0, hi = c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l: L, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return { l: L, c: lo, h };
}
