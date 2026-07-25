// tooling/figma/figma-pull.mjs — Figma → a token pack (authoring-time, standalone).
// The import direction the repo was missing: gen-tokens.mjs emits the DTCG file you import INTO
// Figma, and figma-parity.mjs reads Figma back to diff it — but nothing turned a Figma file's
// values into something the site can wear. This does: it reads a file's colour styles and emits
// system/tokens.<slug>.css, a pack the shell re-skins from by changing its one <head> line.
//
// It targets a PACK, never the contract. The repo splits contract tokens (semantic, brand-free,
// what components reference) from pack values (the brand layer); a Figma file holds brand values,
// so a pack is the natural landing site — and it keeps this script clear of the drift-check that
// polices tokens.contract.css / tokens.neutral.css as generated from tokens.source.json.
//
// Mapped by ROLE, not by name. A design system's colours share no vocabulary with the contract's
// semantic names, so name matching would import nothing. Each contract token instead claims a
// nominal rung of the neutral or accent ramp, and every emitted value is a real value from the
// file. Rungs come from <hue>/<step> names ("gray/900", "indigo/600") where the file uses them,
// and are otherwise DERIVED: colours are grouped by name prefix and ordered by OKLCH lightness,
// so "Blue/Light, Blue/Base, Blue/Dark" is a 3-rung ramp whose numbers this importer synthesised
// and says so. A role then takes the NEAREST rung its ramp actually has. Where inference can't
// read a design at all, --map <file> pins tokens to named styles explicitly and beats it.
//
// Scale comes across the same way, by ORDER rather than by name: spacing, radius, the type ramp
// and shadows are read from a plugin export's dimension / shadow values (the REST styles path
// names text and effect styles without ever valuing them, so it contributes none), classified into
// a family by name keyword, and filled BY RANK — but only where the design offers at least as many
// distinct values as the family has slots. A family that falls short imports NOTHING and stays on
// this repo's contract defaults, because a half-imported ramp is neither the design's nor this
// repo's and no reader could tell which slot was which. Imported, dropped, auto-filled and
// unclassified are all named in the pack header. A type slot keeps the contract's clamp() shape —
// the responsive behaviour is this repo's, the number is the design's, and the header says that.
//
// Then it negotiates for contrast, in the file's own ramp. A nominal rung is not automatically
// accessible — a yellow accent at /600 fails as text on white. Where a WCAG pair fails, the token
// walks to the nearest rung OF THE SAME RAMP where every pair it takes part in passes, so the
// value stays one the designer actually chose. Pairs and thresholds are RULESET.wcagPairs — the
// same list derive() is held to, imported, never restated. Every step taken and every pair still
// failing is printed AND written into the pack's header comment.
//
// Build-time only, and never a view-time connection: shipped pages are vanilla with no runtime
// deps, and FIGMA_TOKEN is a secret that must never reach a client. Pull → commit the pack →
// readers replay it, the same rule the agent traces follow. Not registered in build.mjs (the
// generator chain stays deterministic and offline-runnable; this needs a secret + network).
//
// Operator steps: docs/figma-runbook.md. --page and --accent/--neutral are OPTIONAL: with no page
// filter the read auto-selects the foundation pages, and the ramps are classified by OKLCH chroma
// (grey vs coloured) with state-named ramps excluded. Where a file has no single brand colour — a
// palette library carries 20+ — the run REFUSES and lists the candidates instead of picking one.
//   node tooling/figma/figma-pull.mjs --slug <company>
//   node tooling/figma/figma-pull.mjs --slug <company> --accent indigo --page Color  (explicit)
//   node tooling/figma/figma-pull.mjs --slug <company> --offline                     (spends nothing)
//   node tooling/figma/figma-pull.mjs --slug <company> --map tooling/figma/maps/<slug>.json
//   node tooling/figma/figma-pull.mjs --slug <company> --from <export.json>
//     — read a PLUGIN EXPORT instead of the API: no token, no rate limit, and it sees the
//       variables REST gates behind Enterprise. The ONLY path that carries scale values.
//   node tooling/figma/figma-pull.mjs --slug <company> --from <export.json> --out <path.css>
//     — write somewhere other than system/tokens.<slug>.css (a fixture run, a scratch check).

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { genPackCss, loadContract } from "../../agent-layer/gen-pack-css.mjs";
import { RULESET } from "../../system/derive.rules.mjs";
import { hexToOklch } from "../../system/oklch.mjs";
import { checkPairs } from "../../system/wcag.mjs";
import { ROOT, readFigma, readFlags } from "./figma-read.mjs";

// Which rung of which ramp each contract token claims. Steps follow the near-universal
// 50…950 convention (light → dark). `white` resolves to the file's own white if it publishes one.
// The contract tokens no colour role and no SCALE_ROLE claims — motion, layout, fonts, and the
// color-mix() inverse tokens that stay relative and re-derive from the imported accent — are
// auto-filled from contract defaults by gen-pack-css and reported as such.
const ROLES = [
  { token: "color-fg", ramp: "neutral", step: 900 },
  { token: "color-fg-muted", ramp: "neutral", step: 500 },
  { token: "color-bg", white: true },
  { token: "color-bg-surface", ramp: "neutral", step: 50 },
  { token: "color-border", ramp: "neutral", step: 200 },
  { token: "color-border-strong", ramp: "neutral", step: 900 },
  { token: "color-white", white: true },
  { token: "color-accent", ramp: "accent", step: 600 },
  // Resolved AFTER contrast negotiation, as offsets from wherever color-accent ended up: pinned
  // to absolute rungs they would collide with a negotiated accent (a yellow accent darkens to
  // /700, and a hover state the same colour as its rest state is no hover state at all).
  { token: "color-accent-hover", ramp: "accent", follows: "color-accent", offset: 100 },
  { token: "color-accent-active", ramp: "accent", follows: "color-accent", offset: 200 },
  { token: "color-accent-fg", white: true },
  { token: "color-accent-secondary", ramp: "neutral", step: 600 },
  { token: "color-accent-on-inverse", ramp: "accent", step: 400 },
  { token: "color-bg-inverse", ramp: "neutral", step: 900 },
  { token: "color-fg-on-inverse", ramp: "neutral", step: 100 },
  { token: "color-fg-on-inverse-strong", white: true },
];

// ── Scale: the design's spacing, radius, type ramp and shadows ────────────────────────────
// Colour alone makes a pack "the design's palette on THIS repo's scale" — its spacing-md is 16px
// because that is this repo's default, not because the design said so. These four families come
// across too, and by the same discipline as the colours: mapped by ORDER, not by name (a design's
// "Spacing/4" shares no vocabulary with "spacing-md"), all-or-nothing per family, and every value
// imported, dropped or auto-filled is named in the pack header.
//
// Rank is the family's OWN slot order, not a global "smallest first": spacing/radius/shadow run
// small → large, the type ramp runs large → small (its first slot is a display size). Rank 1
// therefore takes the smallest imported spacing and the LARGEST imported type size.
const SCALE_ROLES = [
  { token: "spacing-xs", family: "spacing", rank: 1 },
  { token: "spacing-sm", family: "spacing", rank: 2 },
  { token: "spacing-md", family: "spacing", rank: 3 },
  { token: "spacing-lg", family: "spacing", rank: 4 },
  { token: "spacing-xl", family: "spacing", rank: 5 },
  { token: "spacing-2xl", family: "spacing", rank: 6 },
  { token: "spacing-3xl", family: "spacing", rank: 7 },
  { token: "spacing-4xl", family: "spacing", rank: 8 },
  { token: "radius-sm", family: "radius", rank: 1 },
  { token: "radius-md", family: "radius", rank: 2 },
  { token: "radius-lg", family: "radius", rank: 3 },
  // Descending size, which is NOT tokens.source.json's declaration order: type-h3 (20px) sits
  // BELOW type-lead (clamp max 22px), so reading the contract's order would invert the ramp.
  { token: "type-display", family: "type", rank: 1 },
  { token: "type-h1", family: "type", rank: 2 },
  { token: "type-h2", family: "type", rank: 3 },
  { token: "type-lead", family: "type", rank: 4 },
  { token: "type-h3", family: "type", rank: 5 },
  { token: "type-body", family: "type", rank: 6 },
  { token: "type-caption", family: "type", rank: 7 },
  { token: "type-eyebrow", family: "type", rank: 8 },
  { token: "shadow-sm", family: "shadow", rank: 1 },
  { token: "shadow-md", family: "shadow", rank: 2 },
  { token: "shadow-lg", family: "shadow", rank: 3 },
];
const FAMILY_ORDER = { spacing: "asc", radius: "asc", shadow: "asc", type: "desc" };
const FAMILY_LABEL = { spacing: "spacing", radius: "radius", type: "type ramp", shadow: "shadows" };
const FAMILY_RULE = {
  spacing: "smallest→largest", radius: "smallest→largest",
  type: "largest→smallest", shadow: "subtlest→heaviest (blur + spread)",
};
const scaleRole = (token) => SCALE_ROLES.find((r) => r.token === token);

// Which family a dimension belongs to. TYPE IS TESTED FIRST on purpose: a design that names its
// text styles "Regular/size 5" would have its font sizes swallowed by a spacing keyword, so bare
// "size" is deliberately not one. A name matching nothing returns null and is reported as
// unclassified in the pack header — never guessed into a family.
const FAMILY_KEYWORDS = [
  { family: "type", re: /(^|[/\s_-])(text|font|type|typography|heading|body)/i },
  { family: "radius", re: /(^|[/\s_-])(radius|corner|rounded|round)/i },
  { family: "shadow", re: /(^|[/\s_-])(shadow|elevation|depth)/i },
  { family: "spacing", re: /(^|[/\s_-])(spacing|space|gap|inset|padding|margin)/i },
];
export function classifyDimension(name) {
  for (const { family, re } of FAMILY_KEYWORDS) if (re.test(String(name))) return family;
  return null;
}

// Tokens Studio writes a shadow as { value: { x, y, blur, spread, color, type } }, which the read
// SHATTERS into one leaf entry per member (entriesFromExport never emits an object). Reassemble by
// the shared name prefix; DTCG's composite shadow arrives whole instead, under its own $type.
const TS_SHADOW_PART = /^(.+)\/value\/(x|y|blur|spread|color|type)$/i;

const px = (v) =>
  typeof v === "number" ? `${v}px`
    : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? `${Number(v.trim())}px`
      : typeof v === "string" && v.trim() ? v.trim() : null;
const numOf = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

// One CSS shadow from either shape. A group with no colour or no blur is not half-composed — it is
// skipped and named. An 8-digit hex is a legal CSS colour, so it passes through as the design wrote it.
function composeShadow(name, parts) {
  const blur = px(parts.blur);
  const color = typeof parts.color === "string" && parts.color.trim() ? parts.color.trim() : null;
  if (blur === null || !color) return null;
  const x = px(parts.x ?? 0) ?? "0px";
  const y = px(parts.y ?? 0) ?? "0px";
  const spread = parts.spread == null ? null : px(parts.spread);
  const hasSpread = spread !== null && numOf(spread) !== 0;
  return {
    name,
    css: `${x} ${y} ${blur}${hasSpread ? ` ${spread}` : ""} ${color}`,
    weight: numOf(blur) + (spread === null ? 0 : numOf(spread)),
    tie: Math.abs(numOf(y)),
  };
}

// Everything the read offers that could fill a scale slot. `value == null` entries are dropped
// first: the REST path names text and effect styles without ever valuing them (collectStyleFills
// harvests fills only), so a styles read contributes nothing here and the run says so.
export function collectScales(entries) {
  const consumed = new Set();
  const groups = {};
  for (const e of entries) {
    const m = TS_SHADOW_PART.exec(e.name);
    if (!m) continue;
    consumed.add(e.name);
    (groups[m[1]] ??= {})[m[2].toLowerCase()] = e.value;
  }

  const shadows = [];
  const unclassified = [];
  for (const [base, parts] of Object.entries(groups)) {
    const s = composeShadow(base, parts);
    if (s) shadows.push(s);
    else unclassified.push(`${base} (shadow group missing its colour or blur — not half-composed)`);
  }

  const dims = [];
  for (const e of entries) {
    if (e.value == null || consumed.has(e.name)) continue;
    if (e.type === "shadow" && typeof e.value === "object" && !Array.isArray(e.value)) {
      // DTCG composite: { color, offsetX, offsetY, blur, spread }. A multi-layer shadow arrives as
      // its first layer only (the read emits no arrays) — the truncation is named in the header.
      const v = e.value;
      const s = composeShadow(e.name, { x: v.offsetX, y: v.offsetY, blur: v.blur, spread: v.spread, color: v.color });
      if (s) shadows.push(s);
      else unclassified.push(`${e.name} (shadow missing its colour or blur)`);
      continue;
    }
    if (e.type !== "dimension" || typeof e.value !== "number") continue;
    const family = classifyDimension(e.name);
    // A number named like a shadow is not a shadow (a shadow needs a colour): say so, don't guess.
    if (family === null || family === "shadow") { unclassified.push(e.name); continue; }
    dims.push({ name: e.name, num: e.value, family });
  }
  return { dims, shadows, unclassified };
}

// The contract's own clamp: the RESPONSIVE BEHAVIOUR stays this repo's (the vw term is copied
// verbatim), the NUMBER becomes the design's, and the min scales by the same ratio so the ramp
// keeps its shape. Rounded to whole px — a committed pack carrying clamp(36.571428571px, …) is
// what a reviewer flags, and the fraction buys nothing.
const CLAMP = /^clamp\(\s*([\d.]+)px\s*,\s*([^,]+?)\s*,\s*([\d.]+)px\s*\)$/;

function formatScale(role, item, defaults) {
  if (role.family === "shadow") return { css: item.css, note: "" };
  const def = defaults[role.token];
  if (role.family === "type" && typeof def === "string" && def.startsWith("clamp(")) {
    const m = CLAMP.exec(def);
    if (m) {
      const [, min, vw, max] = m;
      return {
        css: `clamp(${Math.round((Number(min) * item.num) / Number(max))}px, ${vw}, ${item.num}px)`,
        note: "",
      };
    }
    return { css: `${item.num}px`, note: " (plain px: the contract default is a clamp() this importer could not parse)" };
  }
  return { css: `${item.num}px`, note: "" };
}

// Fill each family BY RANK, and only if the design offers at least as many distinct values as the
// family has slots. Fewer and the family is left entirely alone: a half-imported ramp would be
// neither the design's nor this repo's, and no reader could tell which slots were which. Extra
// values are dropped and listed. Pinned slots (--map) are set afterwards and always win.
export function fillScales({ dims, shadows }, defaults, pinnedScales = {}) {
  const values = {};
  const placed = [];
  const imported = {};
  const short = [];
  const plainPx = [];

  for (const family of ["spacing", "radius", "type", "shadow"]) {
    const slots = SCALE_ROLES.filter((r) => r.family === family).sort((a, b) => a.rank - b.rank);
    const pool = family === "shadow"
      ? shadows.map((s) => ({ name: s.name, css: s.css, key: s.weight, tie: s.tie }))
      : dims.filter((d) => d.family === family).map((d) => ({ name: d.name, num: d.num, key: d.num, tie: 0 }));

    // A design that publishes 4px twice offers ONE value, not two — dedupe before counting.
    const seen = new Set();
    const uniq = [];
    for (const item of pool) {
      const k = family === "shadow" ? item.css : item.num;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(item);
    }
    const dir = FAMILY_ORDER[family];
    uniq.sort((a, b) => (dir === "asc" ? a.key - b.key : b.key - a.key) || a.tie - b.tie);

    if (uniq.length < slots.length) {
      short.push({ family, offered: uniq.length, needs: slots.length });
      continue;
    }
    const taken = uniq.slice(0, slots.length);
    const dropped = uniq.slice(slots.length);
    imported[family] = {
      slots: slots.length,
      offered: uniq.length,
      rule: FAMILY_RULE[family],
      taken: [],
      dropped: dropped.map((d) => (family === "shadow" ? d.css : `${d.num}px`)),
    };
    slots.forEach((role, i) => {
      const item = taken[i];
      const { css, note } = formatScale(role, item, defaults);
      if (note) plainPx.push(role.token);
      values[role.token] = css;
      placed.push({ token: role.token, source: `${FAMILY_LABEL[family]} rank ${role.rank} of ${slots.length} (${FAMILY_RULE[family]}) = "${item.name}"${note}` });
      imported[family].taken.push({ token: role.token, name: item.name, value: css });
    });
  }

  // Explicit beats inference, exactly as it does for a colour: a pinned slot takes its value even
  // where its family is short, and it is never moved by the ranking.
  for (const [token, p] of Object.entries(pinnedScales)) {
    values[token] = p.value;
    const existing = placed.find((x) => x.token === token);
    if (existing) existing.source = `pinned by --map to "${p.name}" (overrides ${existing.source})`;
    else placed.push({ token, source: `pinned by --map to "${p.name}"` });
    const fam = scaleRole(token)?.family;
    const rec = imported[fam]?.taken.find((t) => t.token === token);
    if (rec) { rec.name = p.name; rec.value = p.value; rec.pinned = true; }
  }
  return { values, placed, imported, short, plainPx };
}

// Colour entries named "<hue>/<step>" → { hue: { step: hex } }. Everything else (a kit's
// "base/white", a one-off brand colour) is kept flat under `loose` for the white lookup.
export function toRamps(entries) {
  const ramps = {};
  const loose = {};
  for (const e of entries) {
    if (e.type !== "color" || typeof e.value !== "string" || !/^#[0-9a-f]{6}$/i.test(e.value)) continue;
    const m = e.name.match(/^(.*)\/(\d{2,3})$/);
    if (m) (ramps[m[1].trim().toLowerCase()] ??= {})[Number(m[2])] = e.value.toLowerCase();
    else loose[e.name.trim().toLowerCase()] = e.value.toLowerCase();
  }
  return { ramps, loose };
}

// Ramps DERIVED from arbitrary names, for the designs that don't number their colours.
// "Blue/Light, Blue/Base, Blue/Dark" is a ramp too — it states its order in words instead of
// digits. Group the leftover colours by name prefix (everything before the last "/", or the
// leading word), order each group by OKLCH lightness the way the numeric convention runs
// (light → dark), and synthesise rungs from that ORDER, spread across the same 50…950 scale.
// The numbers are this importer's and every report says so; the colours stay the designer's.
// A prefix that already names a numbered ramp is left alone — a real ramp is never widened with
// a guessed rung. Nothing is removed from `loose`: the white lookup still reads it.
export function deriveRamps(loose, numbered = {}) {
  const groups = {};
  for (const [name, hex] of Object.entries(loose)) {
    const cut = name.lastIndexOf("/");
    const prefix = (cut === -1 ? name.split(/[\s_-]+/)[0] : name.slice(0, cut)).trim();
    if (!prefix || prefix in numbered) continue;
    (groups[prefix] ??= []).push({ name, hex });
  }

  const ramps = {};
  const derived = {};
  for (const [prefix, members] of Object.entries(groups)) {
    const ordered = members
      .map((m, i) => ({ ...m, l: hexToOklch(m.hex).l, i }))
      .sort((a, b) => b.l - a.l || a.i - b.i); // lightest first, declaration order breaks ties
    const n = ordered.length;
    ramps[prefix] = {};
    derived[prefix] = {};
    ordered.forEach((m, i) => {
      // Multiples of 50 read like the convention, but that grid holds only 19 rungs — past that
      // two colours would snap to one number and one of them would vanish from the ramp with
      // nothing said. A wide group gets exact numbers instead; the invariant below is the guard.
      const raw = 50 + (i * 900) / (n - 1);
      const step = n === 1 ? 500 : n <= 19 ? Math.round(raw / 50) * 50 : Math.round(raw);
      ramps[prefix][step] = m.hex;
      derived[prefix][step] = { name: m.name, rung: i + 1, of: n };
    });
    if (Object.keys(ramps[prefix]).length !== n)
      throw new Error(`figma-pull: the "${prefix}" group holds ${n} colours but only ${Object.keys(ramps[prefix]).length} rungs came out of numbering them — refusing to drop a colour the design contains.`);
  }
  return { ramps, derived };
}

// --map <file>: { "color-accent": "Brand/Primary", "spacing-md": "Spacing/4" } — the explicit
// answer for a design inference can't read, committed beside the pack it produces. Explicit ALWAYS
// beats inference: a mapped token is pinned to that style's value and never negotiated (negotiate
// skips entries with no ramp), so a mapped colour that fails a pair is reported as a failure rather
// than moved, and a mapped scale slot fills even where its family is short. A name the file doesn't
// publish throws — never a silent fall back to a default. Returns colours and scales apart: they
// travel different paths from here (a rung to negotiate vs. a value to format).
function readMap(path, entries, scaleSource, defaults) {
  const spec = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
  const colors = entries.filter((e) => e.type === "color" && typeof e.value === "string" && /^#[0-9a-f]{6}$/i.test(e.value));
  const pinned = {};
  const scales = {};
  // One matcher for both kinds: exact name, then last-segment as the fallback (a map may name
  // "Primary" for "Colors/Brand/Primary"), refusing when two candidates share that segment.
  const match = (token, styleName, pool, kind) => {
    const want = styleName.trim().toLowerCase();
    const hits = pool.filter((e) => e.name.trim().toLowerCase() === want);
    const matched = hits.length ? hits : pool.filter((e) => e.name.split("/").pop().trim().toLowerCase() === want);
    if (!matched.length) throw new Error(`${path}: "${token}" → no ${kind} named "${styleName}" in this file. It publishes: ${pool.map((e) => e.name).join(", ") || "(none)"}`);
    if (matched.length > 1) throw new Error(`${path}: "${token}" → "${styleName}" matches ${matched.length} styles (${matched.map((e) => e.name).join(", ")}) — name one in full.`);
    return matched[0];
  };
  for (const [token, styleName] of Object.entries(spec)) {
    if (token.startsWith("$")) continue; // a $note key, the way the DTCG files carry prose
    if (typeof styleName !== "string") throw new Error(`${path}: "${token}" must name a Figma style as a string, not ${JSON.stringify(styleName)}`);
    const role = scaleRole(token);
    if (role) {
      const pool = role.family === "shadow" ? scaleSource.shadows : scaleSource.dims;
      const hit = match(token, styleName, pool, role.family === "shadow" ? "shadow" : "dimension");
      scales[token] = { value: formatScale(role, hit, defaults).css, name: hit.name };
      continue;
    }
    const hit = match(token, styleName, colors, "colour style");
    pinned[token] = { hex: hit.value.toLowerCase(), name: hit.name };
  }
  return { pinned, scales };
}

// The nearest rung a ramp actually has. A derived ramp — or a small file — has no /900, so a role
// takes the closest thing to its nominal rung instead of the run refusing over a missing number.
const nearestRung = (rungs, target) => rungs.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best));

// Which ramp is the greys and which is the brand, decided from the colours themselves rather
// than from the reader. Chroma (OKLCH, the repo's own converter) separates a grey ramp from a
// coloured one; a ramp NAMED for a UI state is a state, not a brand, however saturated it is.
// If more than one candidate survives, the file genuinely has no single brand colour — a palette
// library like Plus UI carries 20+ — so the run asks instead of picking one arbitrarily.
const NEUTRAL_MAX_CHROMA = 0.03;
const STATE_RAMP = /^(red|green|yellow|orange|amber|lime|success|error|warning|danger|info|destructive|positive|negative|neutral|grey|gray)$/i;

export function classifyRamps(ramps) {
  return Object.entries(ramps).map(([hue, rungs]) => {
    const steps = Object.keys(rungs).map(Number);
    const mid = rungs[steps.reduce((best, s) => (Math.abs(s - 500) < Math.abs(best - 500) ? s : best))];
    return { hue, rungs: steps.length, chroma: hexToOklch(mid).c };
  });
}

// `need` says which ramps still have unmapped roles to fill: a --map that pins every accent role
// leaves nothing for an accent ramp to answer, so the run must not refuse over one being absent.
function pickRamps(ramps, { neutral, accent, need = { neutral: true, accent: true } }) {
  const classified = classifyRamps(ramps);
  const usable = classified.filter((r) => r.rungs >= 5); // a 2-rung ramp can't carry the roles

  let pickedNeutral = neutral;
  if (!pickedNeutral && need.neutral) {
    const greys = usable.filter((r) => r.chroma <= NEUTRAL_MAX_CHROMA).sort((a, b) => a.chroma - b.chroma);
    if (!greys.length) throw new Error(`figma-pull: no near-grey ramp found for the neutral role — name one with --neutral <hue>. Ramps: ${classified.map((r) => `${r.hue}(chroma ${r.chroma.toFixed(3)})`).join(", ")}`);
    pickedNeutral = greys[0].hue;
  }

  let pickedAccent = accent;
  if (!pickedAccent && need.accent) {
    const candidates = usable.filter((r) => r.chroma > NEUTRAL_MAX_CHROMA && r.hue !== pickedNeutral && !STATE_RAMP.test(r.hue));
    if (candidates.length === 1) pickedAccent = candidates[0].hue;
    else {
      throw new Error(
        candidates.length
          ? `figma-pull: ${candidates.length} ramps could be the brand colour, so this file has no single one to detect — pick with --accent <hue>.\n  candidates: ${candidates.sort((a, b) => b.chroma - a.chroma).map((r) => r.hue).join(", ")}`
          : `figma-pull: no non-grey, non-state ramp to use as the accent — name one with --accent <hue>. Ramps: ${classified.map((r) => r.hue).join(", ")}`,
      );
    }
  }
  return { neutral: pickedNeutral ?? null, accent: pickedAccent ?? null, classified };
}

// Every WCAG pair this token takes part in, on either side.
const pairsFor = (token) => RULESET.wcagPairs.filter((p) => p.fg === token || p.bg === token);

// Where a pair fails, walk the token's OWN ramp to the nearest rung that satisfies every pair it
// takes part in. Values stay the designer's; only the choice of rung is ours, and it is reported.
function negotiate(values, placed, ramps, derived = {}) {
  const steps = [];
  for (const entry of placed) {
    const { token, ramp, step } = entry;
    const involved = pairsFor(token);
    if (!involved.length || !ramp) continue;
    if (checkPairs(values, involved).every((c) => c.pass)) continue;

    const candidates = Object.keys(ramps[ramp])
      .map(Number)
      .sort((a, b) => Math.abs(a - step) - Math.abs(b - step));
    const won = candidates.find((s) => checkPairs({ ...values, [token]: ramps[ramp][s] }, involved).every((c) => c.pass));
    if (won === undefined) continue; // no rung works — the final report names the failure
    steps.push({ token, ramp, from: step, to: won, fromValue: values[token], toValue: ramps[ramp][won] });
    values[token] = ramps[ramp][won];
    entry.step = won; // so the mapping report shows the rung actually emitted, not the nominal one
    const d = derived[ramp]?.[won];
    entry.source = `${ramp}/${won}${d ? ` = "${d.name}"` : ""} (negotiated from /${step} for contrast)`;
  }
  return steps;
}

export async function runPull({ slug, accent = null, neutral = null, map = null, out = null, ...readOptions } = {}) {
  if (!slug) throw new Error("figma-pull: --slug <name> is required (it names system/tokens.<slug>.css)");
  const { fileKey, fileName, entries, pages } = await readFigma(readOptions);
  const { ramps: numbered, loose } = toRamps(entries);
  const { ramps: inferred, derived } = deriveRamps(loose, numbered);
  const ramps = { ...numbered, ...inferred };
  // The contract's own defaults, read from the file that generates the contract — the clamp shapes
  // a type import has to keep are not restated here.
  const { byName } = loadContract(`${ROOT}/system/tokens.source.json`);
  const defaults = Object.fromEntries(Object.entries(byName).map(([n, t]) => [n, t.$value]));
  const scaleSource = collectScales(entries);
  const scaleOffered = scaleSource.dims.length > 0 || scaleSource.shadows.length > 0;
  const { pinned, scales: pinnedScales } = map ? readMap(map, entries, scaleSource, defaults) : { pinned: {}, scales: {} };

  const available = Object.keys(ramps).sort();
  if (!available.length) {
    throw new Error(
      `figma-pull: none of the ${entries.length} styles read is a colour, so there is no ramp to map ` +
      `roles onto. Read a page that carries the palette — --page Color — or pin the roles by hand ` +
      `with --map <file>.`,
    );
  }
  for (const [role, hue] of Object.entries({ neutral, accent })) {
    if (hue && !ramps[hue]) throw new Error(`figma-pull: no "${hue}" ramp in this file for the ${role} role. Available: ${available.join(", ")}`);
  }
  // A ramp is only needed where a role is left for it to answer — see pickRamps.
  const need = { neutral: false, accent: false };
  for (const role of ROLES) if (role.ramp && !role.white && !pinned[role.token]) need[role.ramp] = true;
  const pick = pickRamps(ramps, { neutral, accent, need });
  if ((need.neutral && !neutral) || (need.accent && !accent)) {
    console.log(`  detected ramps: neutral=${pick.neutral ?? "(not needed)"} accent=${pick.accent ?? "(not needed)"}  (override with --neutral / --accent)`);
  }

  // The file's own white if it publishes one, so even the plain grounds are the designer's value.
  const whiteKey = Object.keys(loose).find((n) => /(^|\/)white$/.test(n));
  const white = whiteKey ? loose[whiteKey] : "#ffffff";

  // How a rung reads in the report: a derived rung names the style it actually came from, so
  // nobody mistakes a number this importer synthesised for one the designer wrote.
  const rungSource = (hue, step, nominal) => {
    const d = derived[hue]?.[step];
    return (
      `${hue}/${step}` +
      (d ? ` = "${d.name}" (derived: rung ${d.rung} of ${d.of}, ordered by OKLCH lightness)` : "") +
      (nominal !== undefined && step !== nominal ? ` (nearest rung to nominal /${nominal})` : "")
    );
  };

  const values = {};
  const placed = [];
  for (const role of ROLES) {
    if (role.follows) continue; // resolved below, once the anchor has settled
    if (pinned[role.token]) {
      values[role.token] = pinned[role.token].hex;
      placed.push({ token: role.token, source: `pinned by --map to "${pinned[role.token].name}"` });
      continue;
    }
    if (role.white) {
      values[role.token] = white;
      placed.push({ token: role.token, source: whiteKey ?? "(no white style in the file — #ffffff)" });
      continue;
    }
    const hue = pick[role.ramp];
    const step = nearestRung(Object.keys(ramps[hue]).map(Number), role.step);
    values[role.token] = ramps[hue][step];
    placed.push({ token: role.token, ramp: hue, step, source: rungSource(hue, step, role.step) });
  }

  const stepped = negotiate(values, placed, ramps, derived);

  // Interaction states, offset from the accent's FINAL rung so they stay visibly distinct from it.
  for (const role of ROLES.filter((r) => r.follows)) {
    if (pinned[role.token]) {
      values[role.token] = pinned[role.token].hex;
      placed.push({ token: role.token, source: `pinned by --map to "${pinned[role.token].name}"` });
      continue;
    }
    const hue = pick[role.ramp];
    const anchor = placed.find((p) => p.token === role.follows);
    if (anchor.step === undefined) {
      throw new Error(
        `figma-pull: ${role.follows} is pinned by --map, so it has no rung for ${role.token} to offset from. ` +
        `Add "${role.token}" to the map too — a state colour is a design decision, not something to guess.`,
      );
    }
    const anchorStep = stepped.find((s) => s.token === role.follows)?.to ?? anchor.step;
    // Exclude the anchor's own rung where the ramp has another: a hover the same colour as its
    // rest state is no hover state at all. A one-rung ramp has nothing else, and says so below.
    const rungs = Object.keys(ramps[hue]).map(Number);
    const distinct = rungs.filter((s) => s !== anchorStep);
    const rung = nearestRung(distinct.length ? distinct : rungs, anchorStep + role.offset);
    values[role.token] = ramps[hue][rung];
    placed.push({ token: role.token, ramp: hue, step: rung, source: `${rungSource(hue, rung)} (${role.follows} ${anchorStep} + ${role.offset})` });
  }
  // A map may pin a contract token that has no ROLE of its own (a wash, an inverse line). Honour
  // it here; gen-pack-css is what rejects a name that is not a contract token at all.
  for (const [token, p] of Object.entries(pinned)) {
    if (token in values) continue;
    values[token] = p.hex;
    placed.push({ token, source: `pinned by --map to "${p.name}"` });
  }

  // The four non-colour families, filled by rank from whatever the read offered.
  const scale = fillScales(scaleSource, defaults, pinnedScales);
  Object.assign(values, scale.values);
  placed.push(...scale.placed);

  const checks = checkPairs(values, RULESET.wcagPairs);
  const failures = checks.filter((c) => !c.pass);

  // Which ramps the run actually leaned on, and which of their rungs this importer synthesised.
  const usedRamps = [pick.neutral, pick.accent].filter(Boolean);
  const derivedUsed = usedRamps.filter((hue) => derived[hue]);
  const mappedTokens = [...Object.entries(pinned), ...Object.entries(pinnedScales)];

  // What the scale import did, in the pack itself. Written ONLY when the read actually offered a
  // dimension or a shadow: a styles read (the REST path) names text and effect styles without
  // valuing them, so it contributes nothing here and the pack stays silent about a family it never
  // saw rather than carrying a line about an absence. The run says so on stdout instead.
  const importedFamilies = Object.entries(scale.imported);
  const scaleNote = !scaleOffered
    ? ""
    : (importedFamilies.length
      ? `\n * Scale imported from this file: ` +
        importedFamilies.map(([f, r]) =>
          `${FAMILY_LABEL[f]} (${r.slots} of ${r.offered} value(s), ${r.rule}` +
          (r.dropped.length ? ` — dropped: ${r.dropped.join(", ")}` : "") + `)`).join(", ") +
        `.` +
        (scale.imported.type ? ` The fluid clamp() shape and its vw term are this repo's contract; the numbers are the design's.` : "") +
        (scale.plainPx.length ? ` Emitted as plain px because the contract default did not parse as a clamp(): ${scale.plainPx.join(", ")}.` : "") +
        (scale.imported.shadow ? ` A multi-layer shadow imports its first layer only.` : "")
      : "") +
      (scale.short.length
        ? `\n * Scale NOT imported, auto-filled from this repo's contract defaults: ` +
          scale.short.map((s) => `${FAMILY_LABEL[s.family]} (the design offered ${s.offered}, the contract has ${s.needs} slots)`).join(", ") +
          `. These values are NOT the design's.`
        : "") +
      (scaleSource.unclassified.length
        ? `\n * Read but not classified into a family, so not imported: ` + scaleSource.unclassified.join(", ") + `.`
        : "");
  // A ramp with too few rungs runs out of distinct state colours: whichever states ended up
  // wearing a colour another state already wears is a fact the pack has to carry, not hide.
  const states = ROLES.filter((r) => r.follows).map((r) => r.token);
  const collapsed = states
    .map((token, i) => ({ token, twin: [...states.slice(0, i), ROLES.find((r) => r.token === token).follows].find((t) => values[t] === values[token]) }))
    .filter((c) => c.twin);

  const label =
    `IMPORTED, NOT DESIGNED — every colour below is a real value read from the Figma file ` +
    `"${fileName ?? fileKey}" (key ${fileKey}) by tooling/figma/figma-pull.mjs. It is that file's ` +
    `design work, not this repo's; the pack only maps its ` +
    (usedRamps.length ? `${usedRamps.join("/")} ramps onto contract roles.` : `own colour styles onto contract roles.`) +
    `\n * Regenerate: node tooling/figma/figma-pull.mjs --slug ${slug}` +
    (pick.neutral ? ` --neutral ${pick.neutral}` : "") +
    (pick.accent ? ` --accent ${pick.accent}` : "") +
    (map ? ` --map ${map}` : "") +
    // Name the source this run actually read. A pack imported from an export must not tell the
    // next reader to regenerate it through the API, which needs a token, spends the file's
    // ~6-a-month budget, and cannot see variables outside an Enterprise plan.
    (readOptions.from ? ` --from ${readOptions.from}` : "") +
    (derivedUsed.length
      ? `\n * Rung numbers DERIVED, not read: this file does not number these colours, so each ramp ` +
        `was ordered by OKLCH lightness and numbered from that order — ` +
        derivedUsed.map((hue) => `${hue}: ${Object.entries(derived[hue]).sort((a, b) => a[0] - b[0]).map(([step, d]) => `/${step} = "${d.name}"`).join(", ")}`).join(" · ") +
        `. The numbers are this importer's; the colours are the file's.`
      : "") +
    (mappedTokens.length
      ? `\n * Pinned explicitly by ${map} (an operator's map beats inference, and a pinned value is never moved for contrast): ` +
        mappedTokens.map(([token, p]) => `${token} ← "${p.name}"`).join(", ")
      : "") +
    scaleNote +
    (collapsed.length
      ? `\n * Too few rungs for a distinct state colour: ` +
        collapsed.map((c) => `${c.token} repeats ${c.twin} (${values[c.token]})`).join(", ") +
        ` — the ramp holds nothing else to move to.`
      : "") +
    `\n * WCAG (RULESET.wcagPairs, the same list derive() is held to): ${checks.length - failures.length}/${checks.length} pairs pass` +
    (stepped.length
      ? `\n * Contrast negotiated within the file's own ramps: ` +
        stepped.map((s) => `${s.token} ${s.ramp}/${s.from}→${s.ramp}/${s.to}`).join(", ")
      : usedRamps.length
        ? `\n * No contrast negotiation was needed — every nominal rung passed as mapped.`
        : `\n * No contrast negotiation was needed — every value passed as pinned.`) +
    (failures.length
      ? `\n * STILL FAILING (no value the design offers satisfies these — the pack ships saying so): ` +
        failures.map((f) => `${f.fg} on ${f.bg} ${f.ratio}:1 < ${f.min}`).join(", ")
      : "");

  // --out keeps a fixture run out of system/, which gen-loc-summary counts as shipped source.
  const dest = out ? resolve(process.cwd(), out) : `${ROOT}/system/tokens.${slug}.css`;
  const r = genPackCss(values, { slug, dest, note: label });

  const roleOrder = [...ROLES.map((r) => r.token), ...placed.map((p) => p.token).filter((t) => !ROLES.some((r) => r.token === t))];
  for (const p of roleOrder.map((t) => placed.find((x) => x.token === t))) {
    console.log(`${p.token.padEnd(28)} ${String(values[p.token]).padEnd(9)} ← ${p.source}`);
  }
  if (pages) console.log(`\npages read: ${pages.read.map((p) => p.name).join(", ") || "none"} · skipped: ${pages.skipped.length}`);
  console.log(`ramps found: ${available.join(", ")}`);
  if (!scaleOffered) {
    console.log(`scale: this read offered no dimension or shadow VALUES (a styles read names text and effect styles without valuing them) — spacing, radius, the type ramp and shadows are all this repo's contract defaults.`);
  } else {
    for (const [f, rec] of importedFamilies) console.log(`scale: ${FAMILY_LABEL[f]} imported — ${rec.slots} of ${rec.offered} value(s), ${rec.rule}${rec.dropped.length ? ` · dropped ${rec.dropped.join(", ")}` : ""}`);
    for (const s of scale.short) console.log(`scale: ${FAMILY_LABEL[s.family]} NOT imported — the design offered ${s.offered}, the contract has ${s.needs} slots (auto-filled from contract defaults)`);
    if (scaleSource.unclassified.length) console.log(`scale: not classified into a family — ${scaleSource.unclassified.join(", ")}`);
  }
  console.log(`roles mapped: ${placed.length} · auto-filled from contract defaults: ${r.filled.length}`);
  for (const s of stepped) console.log(`negotiated: ${s.token} ${s.ramp}/${s.from} (${s.fromValue}) → ${s.ramp}/${s.to} (${s.toValue}) for contrast`);
  for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${String(c.ratio).padStart(6)} / ${c.min}  ${c.fg} on ${c.bg}`);
  console.log(`figma pull      ${failures.length ? "⚠" : "✓"}  ${slug} — ${r.tokenCount} tokens → ${relative(ROOT, dest)}` +
    (failures.length ? `  (${failures.length} WCAG pair(s) still failing — named in the pack header)` : ""));

  return {
    slug, dest, values, checks, stepped, failures,
    // Additive: the portal drop-UI renders this rather than re-deriving it from the header prose.
    scales: {
      offered: scaleOffered,
      imported: scale.imported,
      short: scale.short,
      autoFilled: r.filled,
      unclassified: scaleSource.unclassified,
    },
  };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space (gen-token-css L148).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = (name) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? undefined : process.argv[i + 1];
  };
  runPull({ slug: flag("--slug"), accent: flag("--accent"), neutral: flag("--neutral"), map: flag("--map"), out: flag("--out"), ...readFlags(process.argv) }).catch((e) => {
    console.error(e.stack ?? e.message);
    process.exit(1);
  });
}
