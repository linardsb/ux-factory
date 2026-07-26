// system/pack-import.mjs — the token-import ENGINE: a design's token export → a contract pack.
// Ticket #130 (.claude/plans/public-drop-to-reskin.md), extracted from tooling/figma/figma-pull.mjs,
// tooling/figma/figma-read.mjs, agent-layer/gen-pack-css.mjs and agent-layer/gen-token-css.mjs.
//
// ONE ENGINE, NEVER A FORK. The CLI (tooling/figma/figma-pull.mjs), the portal drawer and the
// public drop zone on the home page all map a design through THIS file. A second copy of contrast
// negotiation would rot, and the honesty contract cannot survive a browser that maps a design
// differently from the CLI that produced the committed packs — so the four files above keep their
// disk, network and CLI halves and import everything below.
//
// VIEW-TIME SAFE, and that is the invariant a reviewer should check first: this module imports
// NOTHING from agent-layer/ or tooling/, touches no `node:` builtin, and never reaches for
// `process`, `console`, `window` or `document`. Its only imports are the three view-time-safe
// system modules below. Anything the engine wants to SAY comes back in a `notes` array; anything
// it wants to REFUSE is a thrown Error whose message is the CLI's, byte for byte.
//
// The mapping discipline itself is documented at the functions that implement it — the comments
// moved with the code they explain, because each one carries a measured fact.

import { RULESET } from "./derive.rules.mjs";
import { hexToOklch } from "./oklch.mjs";
import { checkPairs } from "./wcag.mjs";

// ── export parsers ─────────────────────────────────────────────────────────────────────────
// Moved from figma-read.mjs, which keeps the auth, cache, budget and network halves.

// Figma {r,g,b,a} floats → #rrggbb(aa) hex.
export function rgbaToHex({ r, g, b, a = 1 }) {
  const hex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a) : ""}`;
}

// Variables response → [{ name, type: "color"|"dimension"|other, value }].
// Values come from each variable's collection default mode; aliases stay unresolved
// (name parity is what matters for a chained variable).
export function entriesFromVariables(data) {
  const collections = data.meta?.variableCollections ?? {};
  return Object.values(data.meta?.variables ?? {}).map((v) => {
    const mode = collections[v.variableCollectionId]?.defaultModeId;
    const raw = v.valuesByMode?.[mode];
    let type = null, value = null;
    if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") type = "alias";
    else if (v.resolvedType === "COLOR" && raw) { type = "color"; value = rgbaToHex(raw); }
    else if (v.resolvedType === "FLOAT" && typeof raw === "number") { type = "dimension"; value = raw; }
    else value = raw ?? null;
    return { name: v.name, type, value };
  });
}

// A plugin export (Tokens Studio, a variables dump, anything that walks the document in-app) is
// the way past BOTH walls at once: it reads variables the REST API gates behind Enterprise, and
// it costs no request. Rather than guess which tool wrote the file, flatten ANY nested JSON to
// path → value: DTCG `$value`/`$type` nodes, Tokens Studio's `{value,type}`, or bare strings.
// The REST variables envelope is delegated, so a raw API dump works too.
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const expandHex = (v) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v).toLowerCase();

// variables2json writes an effect variable as { effects: [{ type, color: {r,g,b,a} 0–1 floats,
// offset: {x,y}, radius, spread }] }. The first drop-shadow layer becomes the composite shape
// collectScales already consumes; a variable with no drop shadow (inner shadows, blurs) returns
// null and falls back to a name-parity entry.
function pluginShadow(value) {
  const fx = Array.isArray(value?.effects) ? value.effects.find((e) => e?.type === "DROP_SHADOW") : null;
  if (!fx?.color) return null;
  const c = fx.color;
  const rgba = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${+(c.a ?? 1).toFixed(3)})`;
  return { color: rgba, offsetX: fx.offset?.x ?? 0, offsetY: fx.offset?.y ?? 0, blur: fx.radius ?? 0, spread: fx.spread ?? 0 };
}

function leafEntry(name, value, declaredType) {
  if (typeof value === "string" && HEX.test(value.trim())) return { name, type: "color", value: expandHex(value.trim()) };
  if (typeof value === "number") return { name, type: "dimension", value };
  if (typeof value === "string" && /^-?\d+(\.\d+)?px$/.test(value.trim())) return { name, type: "dimension", value: parseFloat(value) };
  // Anything else (clamp(), a font stack, a shadow string) still counts for NAME parity.
  return { name, type: declaredType ?? null, value: value ?? null };
}

// Returns { entries, notes } — NOT a bare array. The multi-mode line below used to be a
// console.log inside this function (#130): the core must be silent, so what it wants to say comes
// back as data and the CALLER decides the medium (figma-read.mjs prints it; the browser renders it).
export function entriesFromExport(json) {
  const notes = [];
  if (json?.meta?.variables) return { entries: entriesFromVariables(json), notes }; // a raw REST variables dump
  if (Array.isArray(json?.collections)) {
    // A plugin variables dump (variables2json et al.): collections → modes → variables, all in
    // arrays the generic walker below deliberately skips. A pack holds one value per token, so one
    // mode per collection comes across; the envelope declares no default, so index 0 is a CHOICE —
    // a multi-mode collection names the mode it was read from rather than pretending there was
    // only one. Alias entries point at another variable instead of holding a literal; the ramp
    // they point into is already in the list, so they are skipped.
    const fromCollections = [];
    for (const col of json.collections) {
      const mode = col?.modes?.[0];
      if (!mode) continue;
      if (col.modes.length > 1) notes.push(`export: "${col.name}" — reading mode "${mode.name}" of ${col.modes.map((m) => m.name).join(" / ")}`);
      for (const v of mode.variables ?? []) {
        if (!v?.name || v.isAlias || v.value == null) continue;
        if (typeof v.value === "object") {
          // An effect variable's drop shadow converts to the DTCG composite shape collectScales
          // already reads (first layer only, the documented truncation). Any other composite —
          // grids, typography objects — keeps NAME parity like an unvalued REST style, so the
          // count and --map still see it and nothing is silently unnameable.
          const shadow = pluginShadow(v.value);
          fromCollections.push(shadow ? { name: String(v.name), type: "shadow", value: shadow } : leafEntry(String(v.name), null, v.type ?? null));
          continue;
        }
        fromCollections.push(leafEntry(String(v.name), v.value, v.type ?? null));
      }
    }
    if (fromCollections.length) return { entries: fromCollections, notes };
  }
  const out = [];
  (function walk(node, path) {
    if (node === null || typeof node !== "object") {
      if (path.length) out.push(leafEntry(path.join("/"), node));
      return;
    }
    if (Array.isArray(node)) return; // font stacks etc. — no token name of their own
    if ("$value" in node) return void out.push(leafEntry(path.join("/"), node.$value, node.$type));
    if ("value" in node && typeof node.value !== "object") return void out.push(leafEntry(path.join("/"), node.value, node.type));
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || key === "extensions") continue;
      walk(child, [...path, key]);
    }
  })(json, []);
  return { entries: out, notes };
}

// ── the mapping core ───────────────────────────────────────────────────────────────────────
// Moved verbatim from tooling/figma/figma-pull.mjs, which keeps its disk, network and CLI halves.
// Every comment below travels with the code it explains: each one records a measured fact or an
// owner decision, and separating the two is how a rule quietly stops being followed.

// Which rung of which ramp each contract token claims. Steps follow the near-universal
// 50…950 convention (light → dark). `white` resolves to the file's own white if it publishes one.
// The contract tokens no colour role and no SCALE_ROLE claims — motion, layout, fonts, and the
// color-mix() inverse tokens that stay relative and re-derive from the imported accent — are
// auto-filled from contract defaults by gen-pack-css and reported as such.
export const ROLES = [
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
export const SCALE_ROLES = [
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
export const FAMILY_LABEL = { spacing: "spacing", radius: "radius", type: "type ramp", shadow: "shadows" };
const FAMILY_RULE = {
  spacing: "smallest→largest", radius: "smallest→largest",
  type: "largest→smallest", shadow: "subtlest→heaviest (blur + spread)",
};
export const scaleRole = (token) => SCALE_ROLES.find((r) => r.token === token);

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
// Type-adjacent names that are NOT sizes: a font weight (700) or a tracking value that reaches
// the type pool ranks as a jumbo pixel size (#127 — a real dump filled type-display from
// font-weight/bold). Excluded by NAME SEGMENT so every naming convention is caught (font-weight,
// fontWeight, font.weight); "letter-spacing" collapses to one segment first, or its "spacing"
// half would land the name in the spacing family. Excluded names are reported as unclassified.
function isNotASize(name) {
  const s = String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/letter[\s_.-]?spacings?/g, "letterspacing");
  return s.split(/[/\s_.-]+/).some((seg) => /^(weights?|letterspacings?|trackings?)$/.test(seg));
}
export function classifyDimension(name) {
  if (isNotASize(name)) return null;
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
    // A "rounded-full" pill sentinel (9999px) is a shape utility, not a surface radius — mapping
    // it onto the contract's largest card radius would pill every panel (#129, same defect class
    // as weights-in-the-type-pool). Excluded and named, never silently dropped.
    if (family === "radius" && e.value >= 999) { unclassified.push(`${e.name} (pill sentinel, not a surface radius)`); continue; }
    dims.push({ name: e.name, num: e.value, family });
  }
  return { dims, shadows, unclassified };
}

// The contract's own clamp: the RESPONSIVE BEHAVIOUR stays this repo's (the vw term is copied
// verbatim), the NUMBER becomes the design's, and the min scales by the same ratio so the ramp
// keeps its shape. Rounded to whole px — a committed pack carrying clamp(36.571428571px, …) is
// what a reviewer flags, and the fraction buys nothing.
const CLAMP = /^clamp\(\s*([\d.]+)px\s*,\s*([^,]+?)\s*,\s*([\d.]+)px\s*\)$/;

export function formatScale(role, item, defaults) {
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
    // Owner decision 2026-07-26 (#127, amends the scales plan's extreme-N rule): a design offering
    // MORE distinct values than the family has slots fills them by an EVEN SPREAD across the
    // sorted range, not the N extremes — a 35-step spacing scale must not produce a pack whose
    // largest spacing is 12px. offered == slots keeps the exact fill either way.
    const spread = uniq.length > slots.length;
    const idx = slots.map((_, i) => (spread ? Math.round((i * (uniq.length - 1)) / (slots.length - 1)) : i));
    const takenSet = new Set(idx);
    const taken = idx.map((j) => uniq[j]);
    const dropped = uniq.filter((_, j) => !takenSet.has(j));
    const ruleText = FAMILY_RULE[family] + (spread ? ", even spread across the offered range" : "");
    imported[family] = {
      slots: slots.length,
      offered: uniq.length,
      rule: ruleText,
      taken: [],
      dropped: dropped.map((d) => (family === "shadow" ? d.css : `${d.num}px`)),
    };
    slots.forEach((role, i) => {
      const item = taken[i];
      const { css, note } = formatScale(role, item, defaults);
      if (note) plainPx.push(role.token);
      values[role.token] = css;
      placed.push({ token: role.token, source: `${FAMILY_LABEL[family]} rank ${role.rank} of ${slots.length} (${ruleText}) = "${item.name}"${note}` });
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

// The nearest rung a ramp actually has. A derived ramp — or a small file — has no /900, so a role
// takes the closest thing to its nominal rung instead of the run refusing over a missing number.
export const nearestRung = (rungs, target) => rungs.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best));

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
    // `swatch` is the mid-rung hex the chroma was measured from — kept rather than discarded so a
    // caller that has to ASK which ramp is the brand can show the colour, not just its name.
    return { hue, rungs: steps.length, chroma: hexToOklch(mid).c, swatch: mid };
  });
}

// `need` says which ramps still have unmapped roles to fill: a --map that pins every accent role
// leaves nothing for an accent ramp to answer, so the run must not refuse over one being absent.
export function pickRamps(ramps, { neutral, accent, need = { neutral: true, accent: true } }) {
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
      const err = new Error(
        candidates.length
          ? `figma-pull: ${candidates.length} ramps could be the brand colour, so this file has no single one to detect — pick with --accent <hue>.\n  candidates: ${candidates.sort((a, b) => b.chroma - a.chroma).map((r) => r.hue).join(", ")}`
          : `figma-pull: no non-grey, non-state ramp to use as the accent — name one with --accent <hue>. Ramps: ${classified.map((r) => r.hue).join(", ")}`,
      );
      // The refusal stays a refusal — the tool still declines to pick. Carrying the candidates as
      // DATA lets a caller ask the question in a medium that can answer it (a UI shows swatches);
      // the CLI ignores the property and dies with the message above, byte for byte as before.
      // The message already sorted `candidates` in place by descending chroma, so this is the same
      // order the text lists — the swatches and the sentence can never disagree.
      if (candidates.length) {
        err.candidates = candidates.map((r) => ({ hue: r.hue, chroma: r.chroma, rungs: r.rungs, swatch: r.swatch }));
      }
      throw err;
    }
  }
  return { neutral: pickedNeutral ?? null, accent: pickedAccent ?? null, classified };
}

// Every WCAG pair this token takes part in, on either side.
const pairsFor = (token) => RULESET.wcagPairs.filter((p) => p.fg === token || p.bg === token);

// Where a pair fails, walk the token's OWN ramp to the nearest rung that satisfies every pair it
// takes part in. Values stay the designer's; only the choice of rung is ours, and it is reported.
export function negotiate(values, placed, ramps, derived = {}) {
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


// ── the contract + the pack emitter ────────────────────────────────────────────────────────
// Moved from agent-layer/gen-pack-css.mjs and agent-layer/gen-token-css.mjs, which keep their
// readFileSync/writeFileSync shells. The split is strictly file-I/O: the parse, the validation,
// the auto-fill and the emission are all here, so a pack emitted in a browser is byte-identical
// to one emitted by the CLI. That identity is AC #6, and it is why this had to move rather than
// be re-implemented.

// One token value → its CSS text. Aliases become var(--leaf); arrays re-join as a
// font stack (quoting entries with spaces); everything else passes through verbatim.
export const aliasPath = (v) => (typeof v === "string" && /^\{([^{}]+)\}$/.test(v) ? v.slice(1, -1) : null);
export function cssValue($value) {
  const alias = aliasPath($value);
  if (alias) return `var(--${alias.split(".").pop()})`;
  if (Array.isArray($value)) return $value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
  return String($value);
}

// The contract group of tokens.source.json is the completion source + the name whitelist.
// Returns the sections (for grouped emission), a name→token lookup, and the ordered names.
// `label` names the source in this function's error messages — a path from the CLI, the fetched
// URL in a browser — because a thrown Error must always name the offending thing (CLAUDE.md).
export function parseContract(src, { label = "the token source" } = {}) {
  if (!src.contract) throw new Error(`gen-pack-css: ${label} has no "contract" group`);
  const sections = [];
  const byName = {};
  const order = [];
  for (const [secKey, sec] of Object.entries(src.contract)) {
    if (secKey.startsWith("$")) continue;
    const toks = [];
    for (const [name, tok] of Object.entries(sec)) {
      if (name.startsWith("$")) continue;
      if (!tok || typeof tok !== "object" || !("$value" in tok))
        throw new Error(`gen-pack-css: ${label}: contract.${secKey}.${name} has no $value`);
      toks.push(name);
      byName[name] = tok;
      order.push(name);
    }
    sections.push({ label: sec.$description || secKey, tokens: toks });
  }
  return { sections, byName, order, label };
}

// A DTCG token node carries a $value; a flat value is a bare string or a font-stack array.
const isDtcgNode = (v) => v && typeof v === "object" && !Array.isArray(v) && "$value" in v;
// A usable pack value is a non-empty string, or a non-empty array of strings (a font stack).
const isUsableValue = (v) =>
  (typeof v === "string" && v.trim() !== "") ||
  (Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.trim() !== ""));

// Emit a token pack. `values` maps every contract token → its raw $value (string or array);
// cssValue turns each into CSS text (exactly as gen-token-css calls it — the raw value, never
// the wrapping node). Grouped + aligned to read like the neutral pack.
// The header string below is part of every committed pack's bytes — tokens.verdant.css,
// tokens.plusui.css and the handoff pack all carry it. Do not reflow it.
function emitPack(slug, note, sections, values) {
  const header =
    `/* GENERATED — the "${slug}" token pack. Do not edit by hand.\n` +
    ` * Emitted by agent-layer/gen-pack-css.mjs from a DTCG seed / token map, reusing the\n` +
    ` * gen-token-css cssValue emission — so this pack renders identically to contract/neutral.\n` +
    (note ? ` * ${note}\n` : "") +
    ` * Loads AFTER system/tokens.contract.css, in place of tokens.neutral.css (one <head> line).\n` +
    ` */`;
  const lines = [header, "", ":root {"];
  sections.forEach(({ label, tokens }, i) => {
    if (i > 0) lines.push("");
    lines.push(`  /* ---- ${label} ---- */`);
    const width = Math.max(...tokens.map((n) => n.length));
    for (const name of tokens) {
      const pad = " ".repeat(width - name.length + 1);
      lines.push(`  --${name}:${pad}${cssValue(values[name])};`);
    }
  });
  lines.push("}", "");
  return lines.join("\n");
}

// input: a DTCG seed { tokens: { name: { $value, $type } } } OR a flat { name: value } map.
// Returns { tokenCount, filled: [names], values, css }. Throws (naming the token) on an unknown
// name or a malformed value. Pure: the caller owns reading the contract and writing the file.
export function emitPackCss(input, { slug, note, contract, sourceLabel } = {}) {
  if (!slug || typeof slug !== "string")
    throw new Error("gen-pack-css: a string `slug` is required (it names the pack in the header)");
  const { sections, byName, order } = contract;
  const contractNames = new Set(order);
  const where = sourceLabel ?? contract.label;

  // Normalise DTCG (input.tokens) vs a flat map (derive().tokens) to { name: rawValue }.
  const rawTokens =
    input && typeof input === "object" && input.tokens && typeof input.tokens === "object"
      ? input.tokens
      : input;
  if (!rawTokens || typeof rawTokens !== "object")
    throw new Error("gen-pack-css: input must be a DTCG seed { tokens: {…} } or a flat { name: value } map");

  const provided = {};
  for (const [name, entry] of Object.entries(rawTokens)) {
    if (name.startsWith("$") || name === "review") continue; // DTCG meta + the human-gate block
    if (!contractNames.has(name))
      throw new Error(`gen-pack-css: "${name}" is not one of the ${order.length} contract leaf tokens (${where} contract group)`);
    const value = isDtcgNode(entry) ? entry.$value : entry;
    if (!isUsableValue(value))
      throw new Error(`gen-pack-css: token "${name}" has an unusable value ${JSON.stringify(value)} (expected a non-empty string or font-stack array)`);
    provided[name] = value;
  }

  // Auto-fill any contract token the input omitted, from the contract default (raw $value).
  const filled = [];
  const values = {};
  for (const name of order) {
    if (name in provided) values[name] = provided[name];
    else {
      values[name] = byName[name].$value;
      filled.push(name);
    }
  }
  // Defensive: filling from the contract guarantees completeness, but name it if ever not.
  const missing = order.filter((n) => !(n in values));
  if (missing.length)
    throw new Error(`gen-pack-css: incomplete pack "${slug}" — missing ${missing.join(", ")}`);

  return { tokenCount: order.length, filled, values, css: emitPack(slug, note, sections, values) };
}

// ── mapPack: the browser-callable orchestrator ─────────────────────────────────────────────
// Everything runPull does BETWEEN "here are the entries" and "write the file". runPull is then
// re-expressed in terms of it, and that re-expression is the parity proof: if the CLI still emits
// byte-identical packs through mapPack, so does the browser, because it is the same code.
//
// Silent and side-effect free by construction — it touches no `process`, `console`, `window` or
// `document`. Everything it wants to say comes back in `notes`; everything it refuses is a thrown
// Error whose message is the CLI's, byte for byte. An ambiguous-brand refusal carries
// `err.candidates` so a UI can ask the question in a medium that can answer it.
//
//   mapPack({ entries, contract, slug, accent, neutral, pinned, pinnedScales,
//             fileName, sourceKey, regenerate, mapPath })
//     → { values, css, checks, failures, stepped, placed, available, derivedUsed, collapsed,
//         filled, tokenCount, note, scales, picked: { neutral, accent }, notes }
export function mapPack({
  entries, contract, slug, accent = null, neutral = null,
  pinned = {}, pinnedScales = {},
  fileName = null, sourceKey = null, regenerate = "", mapPath = null,
} = {}) {
  if (!slug) throw new Error("figma-pull: --slug <name> is required (it names system/tokens.<slug>.css)");
  const notes = [];
  const { ramps: numbered, loose } = toRamps(entries);
  const { ramps: inferred, derived } = deriveRamps(loose, numbered);
  const ramps = { ...numbered, ...inferred };
  // The contract's own defaults — the clamp shapes a type import has to keep are not restated
  // here. The CONTRACT is passed in (a path read from disk by the CLI, a fetch in a browser),
  // which is the one change that makes this engine runnable at view time.
  const defaults = Object.fromEntries(Object.entries(contract.byName).map(([n, t]) => [n, t.$value]));
  const scaleSource = collectScales(entries);
  const scaleOffered = scaleSource.dims.length > 0 || scaleSource.shadows.length > 0;

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
    notes.push(`detected ramps: neutral=${pick.neutral ?? "(not needed)"} accent=${pick.accent ?? "(not needed)"}  (override with --neutral / --accent)`);
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

  // A caller that needs the DETECTED ramps in its provenance line (the CLI's reproduce-this
  // command does — an auto-detected run must still print `--neutral gray --accent indigo`) passes
  // a function instead of a string; it is called once the picks have settled.
  const regenLine = typeof regenerate === "function"
    ? regenerate({ neutral: pick.neutral, accent: pick.accent })
    : regenerate;

  const label =
    `IMPORTED, NOT DESIGNED — every colour below is a real value read from the Figma file ` +
    `"${fileName ?? sourceKey}" (key ${sourceKey}) by tooling/figma/figma-pull.mjs. It is that file's ` +
    `design work, not this repo's; the pack only maps its ` +
    (usedRamps.length ? `${usedRamps.join("/")} ramps onto contract roles.` : `own colour styles onto contract roles.`) +
    // Caller-supplied, because the CLI's reproduce-this command and a browser drop's provenance
    // are different true statements about the same mapping. The CLI passes the command that
    // names the source it actually read — never the API, which needs a token, spends the file's
    // ~6-a-month budget, and cannot see variables outside an Enterprise plan.
    `\n * Regenerate: ${regenLine}` +
    (derivedUsed.length
      ? `\n * Rung numbers DERIVED, not read: this file does not number these colours, so each ramp ` +
        `was ordered by OKLCH lightness and numbered from that order — ` +
        derivedUsed.map((hue) => `${hue}: ${Object.entries(derived[hue]).sort((a, b) => a[0] - b[0]).map(([step, d]) => `/${step} = "${d.name}"`).join(", ")}`).join(" · ") +
        `. The numbers are this importer's; the colours are the file's.`
      : "") +
    (mappedTokens.length
      ? `\n * Pinned explicitly by ${mapPath} (an operator's map beats inference, and a pinned value is never moved for contrast): ` +
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


  const { tokenCount, filled, values: full, css } = emitPackCss(values, { slug, note: label, contract });

  return {
    values: full, css, checks, failures, stepped, placed, available, derivedUsed, collapsed,
    filled, tokenCount, note: label, notes,
    picked: { neutral: pick.neutral, accent: pick.accent },
    // The portal drop-UI and the public drop zone render this rather than re-deriving it from
    // the header prose.
    scales: {
      offered: scaleOffered,
      imported: scale.imported,
      short: scale.short,
      autoFilled: filled,
      unclassified: scaleSource.unclassified,
    },
  };
}
