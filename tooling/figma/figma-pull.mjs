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

import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { loadContract } from "../../agent-layer/gen-pack-css.mjs";
import { ROLES, FAMILY_LABEL, scaleRole, formatScale, collectScales, mapPack } from "../../system/pack-import.mjs";
import { ROOT, readFigma, readFlags } from "./figma-read.mjs";

// The MAPPING ENGINE — the role table, the scale families, ramp derivation, contrast
// negotiation — lives in system/pack-import.mjs (#130), so the CLI, the portal drawer and the
// public drop zone all map a design through one implementation. This file keeps what that engine
// must never touch: the disk, the network, --map, and everything it prints.
// Re-exported below for callers that reach for them through this module's long-standing surface.
export {
  classifyDimension, collectScales, fillScales, toRamps, deriveRamps, classifyRamps,
} from "../../system/pack-import.mjs";

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

export async function runPull({ slug, accent = null, neutral = null, map = null, out = null, ...readOptions } = {}) {
  if (!slug) throw new Error("figma-pull: --slug <name> is required (it names system/tokens.<slug>.css)");
  const { fileKey, fileName, entries, pages } = await readFigma(readOptions);
  // The contract's own defaults, read from the file that generates the contract. mapPack takes
  // the contract as DATA — reading it from a path is this file's job, fetching it is the
  // browser's, and that split is the whole reason the engine is runnable at view time.
  const contract = loadContract(`${ROOT}/system/tokens.source.json`);
  const defaults = Object.fromEntries(Object.entries(contract.byName).map(([n, t]) => [n, t.$value]));
  // --map is resolved HERE: readMap reads a path off disk, which the engine must never do.
  const scaleSource = collectScales(entries);
  const { pinned, scales: pinnedScales } = map ? readMap(map, entries, scaleSource, defaults) : { pinned: {}, scales: {} };

  // How the source file is NAMED in a committed pack. On the --from path the "key" is just the
  // path we were handed, and the portal hands over an absolute one — so a pack imported through
  // the workbench would otherwise bake a home directory into a file the repo ships. The header's
  // Regenerate line is a promise that the run can be reproduced: name the file the way any
  // checkout can see it. An export from OUTSIDE the repo keeps its verbatim path, because
  // relative() would emit ../../Users/… , which reproduces nothing and reads worse.
  const fromResolved = readOptions.from ? resolve(process.cwd(), readOptions.from) : null;
  const fromLabel = !fromResolved
    ? null
    : fromResolved.startsWith(ROOT + sep)
      ? relative(ROOT, fromResolved)
      : readOptions.from;
  // On the API path fileKey is a real Figma key and stays untouched; on the --from path it is the
  // same path as above, so it gets the same treatment rather than a second, absolute copy of it.
  const sourceKey = fromLabel ?? fileKey;

  // The engine. Everything from the ramps to the emitted CSS happens in system/pack-import.mjs,
  // so this CLI and the public drop zone cannot disagree about what a design maps to.
  const mapped = mapPack({
    entries, contract, slug, accent, neutral, pinned, pinnedScales,
    fileName, sourceKey, mapPath: map,
    // The reproduce-this command names the source THIS run actually read, and the ramps that
    // were actually DETECTED — so an auto-detected run still prints a command that reproduces it.
    regenerate: (pick) => `node tooling/figma/figma-pull.mjs --slug ${slug}` +
      (pick.neutral ? ` --neutral ${pick.neutral}` : "") +
      (pick.accent ? ` --accent ${pick.accent}` : "") +
      (map ? ` --map ${map}` : "") +
      (fromLabel ? ` --from ${fromLabel}` : ""),
  });
  const {
    values, checks, failures, stepped, placed, available, derivedUsed, collapsed, scales,
    note: label, notes, css, filled, tokenCount,
  } = mapped;
  // The engine is silent; its notes print here, in the position they printed from inside it.
  for (const n of notes) console.log(`  ${n}`);

  // --out keeps a fixture run out of system/, which gen-loc-summary counts as shipped source.
  // mapPack has already EMITTED the pack (through the same emitter gen-pack-css uses), so this
  // writes those bytes rather than emitting a second time — one emission, one set of bytes.
  const dest = out ? resolve(process.cwd(), out) : `${ROOT}/system/tokens.${slug}.css`;
  writeFileSync(dest, css);

  const roleOrder = [...ROLES.map((r) => r.token), ...placed.map((p) => p.token).filter((t) => !ROLES.some((r) => r.token === t))];
  for (const p of roleOrder.map((t) => placed.find((x) => x.token === t))) {
    console.log(`${p.token.padEnd(28)} ${String(values[p.token]).padEnd(9)} ← ${p.source}`);
  }
  if (pages) console.log(`\npages read: ${pages.read.map((p) => p.name).join(", ") || "none"} · skipped: ${pages.skipped.length}`);
  console.log(`ramps found: ${available.join(", ")}`);
  if (!scales.offered) {
    console.log(`scale: this read offered no dimension or shadow VALUES (a styles read names text and effect styles without valuing them) — spacing, radius, the type ramp and shadows are all this repo's contract defaults.`);
  } else {
    for (const [f, rec] of Object.entries(scales.imported)) console.log(`scale: ${FAMILY_LABEL[f]} imported — ${rec.slots} of ${rec.offered} value(s), ${rec.rule}${rec.dropped.length ? ` · dropped ${rec.dropped.join(", ")}` : ""}`);
    for (const s of scales.short) console.log(`scale: ${FAMILY_LABEL[s.family]} NOT imported — the design offered ${s.offered}, the contract has ${s.needs} slots (auto-filled from contract defaults)`);
    if (scales.unclassified.length) console.log(`scale: not classified into a family — ${scales.unclassified.join(", ")}`);
  }
  console.log(`roles mapped: ${placed.length} · auto-filled from contract defaults: ${filled.length}`);
  for (const s of stepped) console.log(`negotiated: ${s.token} ${s.ramp}/${s.from} (${s.fromValue}) → ${s.ramp}/${s.to} (${s.toValue}) for contrast`);
  for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${String(c.ratio).padStart(6)} / ${c.min}  ${c.fg} on ${c.bg}`);
  console.log(`figma pull      ${failures.length ? "⚠" : "✓"}  ${slug} — ${tokenCount} tokens → ${relative(ROOT, dest)}` +
    (failures.length ? `  (${failures.length} WCAG pair(s) still failing — named in the pack header)` : ""));

  return {
    slug, dest, values, checks, stepped, failures,
    // Additive: everything above is printed to stdout and then thrown away, which is fine for a
    // terminal and useless to anything else. Returned, the same facts can be RENDERED — and a
    // surface that shows an imported pack is held to the honesty the pack header already carries:
    // which ramps were leaned on, which rungs this importer synthesised, which states collapsed,
    // and — the one the CLI only ever counted — WHICH tokens were auto-filled from contract
    // defaults rather than read from the design. `note` is the pack header verbatim.
    fileName, fileKey: sourceKey, available, placed, pages, derivedUsed, collapsed,
    filled, tokenCount, note: label,
    // Additive: the portal drop-UI renders this rather than re-deriving it from the header prose.
    scales,
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
