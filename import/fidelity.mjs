// import/fidelity.mjs — hand-written canon (this repo; not generated). THE WRONG-BUT-GREEN DETECTOR:
// a candidate render against a reference render, per part, as ink-colour ΔE (CIEDE2000) — the number
// the import record's fidelity block carries (epic #295 ticket #307;
// docs/epics/canvas-design-import.architecture.md § Spikes S3; .claude/plans/canvas-spike-s3/README.md;
// .claude/plans/import-record-snap-rules-307.md D1, D2).
//
// LIFTED FROM SPIKE S3 (#300), `.claude/plans/canvas-spike-s3/compare.txt`, CUT TO ONE RUNG. decodePng,
// rgbToLab, ciede2000, deltaEHex, modal and inkOf are S3's code with its comments; blur, the p95/p99
// rungs, the report printing and the repo-root walk are gone. S3's inputs are frozen under
// import/fixtures/s3/ so CI never reads .claude/plans/ (a prune there must not red a gate).
//
// PURE OVER BYTES. It imports node:zlib and node:crypto and nothing else — no fs. The caller reads the
// PNGs; `measure` takes Buffers. That keeps the gate's "import/ reaches only node built-ins and ./"
// rule (build-checks 40.7) trivially true.
//
// ─── WHY RUNG 6 AND NOT RUNG 2 (D1) ──────────────────────────────────────────────────────────────
// S3's pre-committed predicate named rung 2 (region p95), the first rung to fire. A LIVE record has no
// faithful floor render beside it, so the predicate's 2x-floor margin cannot be applied; only an
// absolute threshold above every engine's floor works. Rung 2's worst floor (WebKit, 5.1005) sits
// above rung 2's own 2.3 threshold — it would read a faithful WebKit render red. Rung 6 is also
// registration-invariant (it compares two ink AVERAGES, not ink pixels) and independent of the 256px
// region rule. This departs from the predicate, so it is the owner's call (the plan's Q1); switching
// back is this module plus a records regen.
//
// ─── ONE STATED FIX TO THE LIFT (D2) ─────────────────────────────────────────────────────────────
// S3's regionStats returned 0 when EITHER side had no ink, so a candidate that dropped a text
// entirely scored 0 — green. Here a side with no ink falls back to its region's MODAL colour (its
// paper): a vanished text is compared as paper against ink, and reads high (a blanked `subtitle`:
// 0 → 25.278, build-checks 42.3). Every committed fixture number is unchanged to 4 dp.
//
// ─── RUNG 6'S PRICE, CARRIED AND NOT FIXED ───────────────────────────────────────────────────────
// A PAPER change moves the ink average on a region whose ink did not change: ink is "far from the
// region's own mode", so a new mode re-selects which anti-aliased pixels count. S3 C10 measured up to
// 1.3896 under M2. It stays under THRESHOLD on the fixture; a source that changes surfaces and text
// together will read rung 6 high for the wrong reason.
//
// EVERY NUMBER RETURNED IS ROUNDED TO 4 DP. The full-precision floats differ between Node 20 and
// Node 24 (V8's Math) by up to 6.03e-14 on this fixture — the committed records are byte-compared in
// CI under Node 24, and rounding is what makes them stable (the plan's Task 13).

import zlib from "node:zlib";
import { createHash } from "node:crypto";

export const r4 = (v) => Math.round(v * 1e4) / 1e4;

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------- PNG decode
// Zero-dep decoder. Throws by name on any shape it does not handle rather than guessing —
// a silently mis-decoded image is the failure mode that would make every number below wrong
// while looking plausible (the repo's `check-that-cannot-fail` class). `label` names the input in
// every throw, since the bytes carry no path.
export function decodePng(buf, label = "png") {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== SIG[i]) throw new Error(`png: ${label}: not a PNG (bad signature at byte ${i})`);
  }
  let off = 8, w = 0, h = 0, depth = 0, ct = 0, interlace = 0, seenIHDR = false;
  const idats = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ct = data[9];
      const compression = data[10], filterMethod = data[11];
      interlace = data[12];
      if (depth !== 8) throw new Error(`png: ${label}: bit depth ${depth} unsupported (expected 8)`);
      // Chromium writes colour type 2 (RGB); Firefox and WebKit write 6 (RGBA) for the SAME
      // screenshot — observed on this fixture. Both are accepted; anything else throws by name.
      // The alpha channel is asserted fully opaque below rather than silently dropped: averaging a
      // transparent pixel's RGB would be a wrong number that looks right.
      if (ct !== 2 && ct !== 6) throw new Error(`png: ${label}: colour type ${ct} unsupported (expected 2 or 6)`);
      if (interlace !== 0) throw new Error(`png: ${label}: interlace ${interlace} unsupported (expected 0)`);
      if (compression !== 0) throw new Error(`png: ${label}: compression method ${compression} unsupported (expected 0)`);
      if (filterMethod !== 0) throw new Error(`png: ${label}: filter method ${filterMethod} unsupported (expected 0)`);
      seenIHDR = true;
    } else if (type === "IDAT") {
      idats.push(Buffer.from(data));            // MULTIPLE IDATs are normal — concatenate, then
    } else if (type === "IEND") break;          // inflate ONCE. Inflating only the first truncates.
    off += 12 + len;
  }
  if (!seenIHDR) throw new Error(`png: ${label}: no IHDR chunk`);
  if (idats.length === 0) throw new Error(`png: ${label}: no IDAT chunk`);
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const bpp = ct === 6 ? 4 : 3;
  const stride = 1 + w * bpp;
  if (inflated.length !== h * stride) {
    throw new Error(`png: ${label}: inflated ${inflated.length} bytes, expected ${h * stride} (${h} rows x ${stride})`);
  }
  const raw4 = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const ft = inflated[y * stride];
    const src = y * stride + 1;
    const dst = y * w * bpp;
    const prev = dst - w * bpp;
    for (let x = 0; x < w * bpp; x++) {
      const raw = inflated[src + x];
      // Predictors read the ALREADY-UNFILTERED bytes of this row, out of the output, not the raw input.
      const a = x >= bpp ? raw4[dst + x - bpp] : 0;
      const b = y > 0 ? raw4[prev + x] : 0;
      const c = y > 0 && x >= bpp ? raw4[prev + x - bpp] : 0;
      let v;
      switch (ft) {
        case 0: v = raw; break;
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`png: ${label}: unknown filter type ${ft} on row ${y}`);
      }
      raw4[dst + x] = v & 0xff;
    }
  }
  if (bpp === 3) return { w, h, data: raw4 };
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    if (raw4[j + 3] !== 255) {
      throw new Error(`png: ${label}: alpha ${raw4[j + 3]} at pixel ${i} is not opaque — the RGB under it is not a colour`);
    }
    out[i * 3] = raw4[j]; out[i * 3 + 1] = raw4[j + 1]; out[i * 3 + 2] = raw4[j + 2];
  }
  return { w, h, data: out };
}

// ------------------------------------------------------------------ colour
// sRGB → CIELAB, matching skimage.color.rgb2lab exactly (D65 2°, the sRGB matrix), because
// S3's control C1 oracle is skimage's deltaE_ciede2000 and a different white point would show up
// as a constant bias that looks like a rounding problem.
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const XYZ_REF = [0.95047, 1.0, 1.08883];

export function rgbToLab([R, G, B]) {
  const r = srgbToLinear(R / 255), g = srgbToLinear(G / 255), b = srgbToLinear(B / 255);
  const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
  const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
  const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / XYZ_REF[0]), fy = f(Y / XYZ_REF[1]), fz = f(Z / XYZ_REF[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const D2R = Math.PI / 180, R2D = 180 / Math.PI;

// CIEDE2000 (Sharma, Wu & Dalal 2005). kL defaults to 1 — GRAPHIC ARTS, which is skimage's
// default and E4's. kL=2 (textiles) would disagree on the lightness axis only. Build-checks 42.1
// pins five of Sharma's 34 reference pairs to 4 dp.
export function ciede2000(lab1, lab2, { kL = 1, kC = 1, kH = 1 } = {}) {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b, ap) => {
    if (b === 0 && ap === 0) return 0;
    const h = Math.atan2(b, ap) * R2D;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  // Δh' has a branch for C1'C2' == 0 and another for |h2'-h1'| > 180. Both are easy to omit and
  // both produce plausible-looking numbers; the Sharma pairs are what catch an omission.
  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * D2R);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2;
  else hbp = (h1p + h2p - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hbp - 30) * D2R) + 0.24 * Math.cos(2 * hbp * D2R)
              + 0.32 * Math.cos((3 * hbp + 6) * D2R) - 0.20 * Math.cos((4 * hbp - 63) * D2R);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Cbp7 = Cbp ** 7;
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * D2R) * Rc;       // the hue-rotation term
  const tL = dLp / (kL * Sl), tC = dCp / (kC * Sc), tH = dHp / (kH * Sh);
  return Math.sqrt(tL * tL + tC * tC + tH * tH + Rt * tC * tH);
}

// UNROUNDED, deliberately: import/snap-rules.mjs compares these for ties before it rounds.
export const deltaEHex = (h1, h2) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return ciede2000(rgbToLab(p(h1)), rgbToLab(p(h2)));
};

// ------------------------------------------------------------ the constants
export const JND = 2.3;                 // the CIEDE2000 just-noticeable difference — what counts as ink
// THE THRESHOLD, ABSOLUTE (D1). Rung 6's measured floors — a FAITHFUL candidate against the reference:
//   chromium macOS 0.8716 · firefox macOS 0.8716 · webkit macOS 2.6888 · chromium Linux 2.0709
// (the last measured in #307's planning, 2026-09-23: a GitHub clone of 9aebeb7 under
// mcr.microsoft.com/playwright:v1.61.1-jammy, capture.txt rebuilt from design-import-spike-c/06.svg,
// scored as the committed macOS ref.png against the Linux candidate; the wrong candidate read 17.9472
// there — red on Linux too). 5.0 sits 1.86x above the worst floor (WebKit) and 2.41x above Linux
// Chromium; the signal (17.9597) sits 3.59x above it. The reference stays the committed macOS raster
// — a design tool's render is fixed — and only the candidate moves platform. The portal renders
// candidates locally (macOS), so the Linux number bounds a FUTURE CI render, not today's path.
export const THRESHOLD = 5.0;
export const MIN_AREA = 256;            // 16x16. S3's own rule, declared before its run: a part
                                        // smaller than this is too few pixels for an average to mean
                                        // anything. The chevron (9x16 = 144px) is excluded by it, and
                                        // the record NAMES it rather than dropping it silently.
export const DEGENERATE = 0.5;          // a region whose ink share exceeds this is reported, not scored

const px = (img, x, y) => {
  const i = (y * img.w + x) * 3;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

// The modal colour of a region: the most frequent EXACT 8-bit triple. On this fixture that is the
// paper the glyphs sit on — which is why "ink" can be defined as "far from the mode".
function modal(img, r) {
  const counts = new Map();
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const p = px(img, x, y);
    const k = (p[0] << 16) | (p[1] << 8) | p[2];
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let bk = 0, bc = -1;
  for (const [k, c] of counts) if (c > bc) { bc = c; bk = k; }
  const rgb = [(bk >> 16) & 255, (bk >> 8) & 255, bk & 255];
  return { rgb, lab: rgbToLab(rgb), frac: bc / (r.w * r.h), n: r.w * r.h };
}

// A region's ink: the pixels whose ΔE from that region's OWN modal colour exceeds the JND.
function inkOf(img, r, mode) {
  let n = 0, sr = 0, sg = 0, sb = 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const p = px(img, r.x + x, r.y + y);
    if (ciede2000(rgbToLab(p), mode.lab) > JND) { n++; sr += p[0]; sg += p[1]; sb += p[2]; }
  }
  return { n, mean: n ? [sr / n, sg / n, sb / n] : null };
}

// Two decoded images → the rung-6 measurement. Exported beside `measure` because a gate that paints
// a region in memory (build-checks 42.3) has pixels, not PNG bytes, and this module has no encoder.
// A is the REFERENCE, B the candidate.
//
// ZERO SCORED REGIONS IS A VALUE, NOT A THROW: `worst: null, scored: 0`. S3's aggregate() threw; here
// the record has to be able to CARRY that, and import/report.mjs reads it as `missing` — an empty
// measurement is missing, never a pass.
export function measureImages(A, B, regions) {
  if (A.w !== B.w || A.h !== B.h) {
    throw new Error(`fidelity: image sizes differ — reference ${A.w}x${A.h}, candidate ${B.w}x${B.h}`);
  }
  if (!Array.isArray(regions)) throw new Error("fidelity: regions must be an array of {name, x, y, w, h}");
  const out = [];
  for (const r of regions) {
    for (const k of ["x", "y", "w", "h"]) {
      if (!Number.isInteger(r?.[k]) || r[k] < 0) throw new Error(`fidelity: region ${JSON.stringify(r?.name)}.${k} is ${JSON.stringify(r?.[k])} — a non-negative integer expected`);
    }
    if (r.w === 0 || r.h === 0 || r.x + r.w > A.w || r.y + r.h > A.h) {
      throw new Error(`fidelity: region "${r.name}" (${r.x},${r.y} ${r.w}x${r.h}) lies outside the ${A.w}x${A.h} image`);
    }
    const area = r.w * r.h;
    if (area < MIN_AREA) { out.push({ name: r.name, area, value: null, excluded: `${r.name}(${area}px < ${MIN_AREA})` }); continue; }
    // Ink per image, each masked by its OWN modal colour (S3's rung 6).
    const modA = modal(A, r), modB = modal(B, r);
    const inkA = inkOf(A, r, modA), inkB = inkOf(B, r, modB);
    const share = inkA.n / area;
    // The degenerate reason carries NO percent sign: the markdown projection states progress by
    // defect class and contains no `%` (report.mjs). S3 printed "ink 55.0% > 50%".
    if (share > DEGENERATE) { out.push({ name: r.name, area, value: null, excluded: `${r.name}(ink share ${r4(share)} > ${DEGENERATE})` }); continue; }
    // D2: no ink ⇒ the region's paper colour stands in, so a vanished text reads as paper vs ink.
    const value = ciede2000(rgbToLab(inkA.mean ?? modA.rgb), rgbToLab(inkB.mean ?? modB.rgb));
    out.push({ name: r.name, area, value: r4(value), excluded: null });
  }
  const scored = out.filter((r) => r.excluded === null);
  let worst = null;
  for (const r of scored) if (!worst || r.value > worst.value) worst = { region: r.name, value: r.value };
  return { rung: "ink-colour", threshold: THRESHOLD, worst, regions: out, scored: scored.length };
}

// PNG bytes → the measurement plus both images' sha256. The hashes are what build-checks 42.7's
// independence check (O3b) compares: a reference that is some record's candidate output is refused.
export function measure(refBytes, candBytes, regions) {
  const A = decodePng(refBytes, "reference"), B = decodePng(candBytes, "candidate");
  return { ...measureImages(A, B, regions), reference: { sha256: sha256(refBytes) }, candidate: { sha256: sha256(candBytes) } };
}
