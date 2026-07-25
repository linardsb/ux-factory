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
// Mapped by ROLE, not by name. A design system's colours arrive as <hue>/<step> ramps
// ("gray/900", "indigo/600") which share no vocabulary with the contract's semantic names, so
// name matching would import nothing. Each contract token instead claims a nominal rung of the
// neutral or accent ramp, and every emitted value is a real value from the file.
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
//   node tooling/figma/figma-pull.mjs --slug plusui --from <export.json>
//     — the whole job. Both roles are inferred and REPORTED: the neutral ramp by name
//       (neutral/gray/grey/slate/zinc/stone/mono/ink) or, failing that, as the least chromatic
//       ramp in the file; the accent as the first non-neutral ramp alphabetically, which is a
//       declared guess, not a reading of which ramp is the brand. Pass --neutral/--accent to pin
//       either one — an explicit flag silences that role's line.
//   node tooling/figma/figma-pull.mjs --slug plusui --accent indigo --page Color
//   node tooling/figma/figma-pull.mjs --slug plusui --accent indigo --offline   (spends nothing)
//     — read a PLUGIN EXPORT instead of the API: no token, no rate limit, and it sees the
//       variables REST gates behind Enterprise. The file still has to carry <hue>/<step> ramps.

import { relative } from "node:path";
import { pathToFileURL } from "node:url";
import { genPackCss } from "../../agent-layer/gen-pack-css.mjs";
import { RULESET } from "../../system/derive.rules.mjs";
import { hexToOklch } from "../../system/oklch.mjs";
import { checkPairs } from "../../system/wcag.mjs";
import { ROOT, readFigma, readFlags } from "./figma-read.mjs";

// Which rung of which ramp each contract token claims. Steps follow the near-universal
// 50…950 convention (light → dark). `white` resolves to the file's own white if it publishes one.
// The ~48 remaining contract tokens — motion, type ramp, spacing, shadows, and the color-mix()
// inverse tokens that stay relative and re-derive from the imported accent — are auto-filled from
// contract defaults by gen-pack-css and reported as such.
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

// Every WCAG pair this token takes part in, on either side.
const pairsFor = (token) => RULESET.wcagPairs.filter((p) => p.fg === token || p.bg === token);

// Where a pair fails, walk the token's OWN ramp to the nearest rung that satisfies every pair it
// takes part in. Values stay the designer's; only the choice of rung is ours, and it is reported.
function negotiate(values, placed, ramps) {
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
    entry.source = `${ramp}/${won} (negotiated from /${step} for contrast)`;
  }
  return steps;
}

export async function runPull({ slug, accent, neutral, ...readOptions } = {}) {
  if (!slug) throw new Error("figma-pull: --slug <name> is required (it names system/tokens.<slug>.css)");
  const { fileKey, fileName, entries, pages } = await readFigma(readOptions);
  const { ramps, loose } = toRamps(entries);

  const available = Object.keys(ramps).sort();
  if (!available.length) {
    throw new Error(
      `figma-pull: none of the ${entries.length} styles read are named "<hue>/<step>" (e.g. "gray/900"), ` +
      `so there is no ramp to map roles onto. Read a page that carries the palette — --page Color — ` +
      `or map this file by hand.`,
    );
  }
  // Which ramp is the greys. Design systems name them a dozen ways, and a file using any of them
  // but "gray" used to crash with an error the operator had to fix by re-running with --neutral.
  // Name first (high precision), then chroma: greys sit at near-zero chroma and semantic ramps do
  // not, so the least chromatic ramp IS the greys. Safe for this role only — the brand is not the
  // most colourful ramp in a file that also ships red/ and green/, which is why the accent below
  // stays a declared guess rather than a heuristic.
  const NEUTRAL_NAMES = /^(neutral|gray|grey|slate|zinc|stone|mono|ink)$/;
  // Median, not mean: one tinted rung must not reclassify an otherwise grey ramp.
  const chromaOf = (hue) => {
    const cs = Object.values(ramps[hue]).map((hex) => hexToOklch(hex).c).sort((a, b) => a - b);
    return cs[Math.floor(cs.length / 2)];
  };
  let neutralWhy = null;
  if (!neutral) {
    const named = available.find((h) => NEUTRAL_NAMES.test(h));
    neutral = named ?? available.reduce((a, b) => (chromaOf(a) <= chromaOf(b) ? a : b));
    neutralWhy = named ? `named "${named}"` : `least chromatic of ${available.length} ramps (chroma ${chromaOf(neutral).toFixed(3)})`;
  }

  const pick = { neutral, accent: accent ?? available.find((h) => h !== neutral) };
  for (const [role, hue] of Object.entries(pick)) {
    if (!ramps[hue]) throw new Error(`figma-pull: no "${hue}" ramp in this file for the ${role} role. Available: ${available.join(", ")}`);
  }
  if (neutralWhy) console.log(`neutral: "${pick.neutral}" — ${neutralWhy}. Pass --neutral <hue> to override.`);
  // An unnamed accent falls to the first non-neutral ramp ALPHABETICALLY — which is an ordering
  // accident, not a reading of which ramp is the brand. Say so when the file offers a choice:
  // silently picking "amber" over "brand" would ship a pack in the wrong colour, unremarked.
  const others = available.filter((h) => h !== pick.neutral && h !== pick.accent);
  if (!accent && others.length) {
    console.log(`accent: "${pick.accent}" — picked alphabetically, NOT because it is the brand. Also in this file: ${others.join(", ")}. Pass --accent <hue> if the brand is one of those.`);
  }
  if (neutralWhy || (!accent && others.length)) console.log("");

  // The file's own white if it publishes one, so even the plain grounds are the designer's value.
  const whiteKey = Object.keys(loose).find((n) => /(^|\/)white$/.test(n));
  const white = whiteKey ? loose[whiteKey] : "#ffffff";

  const values = {};
  const placed = [];
  for (const role of ROLES) {
    if (role.follows) continue; // resolved below, once the anchor has settled
    if (role.white) {
      values[role.token] = white;
      placed.push({ token: role.token, source: whiteKey ?? "(no white style in the file — #ffffff)" });
      continue;
    }
    const hue = pick[role.ramp];
    const hex = ramps[hue][role.step];
    if (!hex) throw new Error(`figma-pull: the "${hue}" ramp has no /${role.step} rung (has ${Object.keys(ramps[hue]).join(", ")}), needed for --${role.token}`);
    values[role.token] = hex;
    placed.push({ token: role.token, ramp: hue, step: role.step, source: `${hue}/${role.step}` });
  }

  const stepped = negotiate(values, placed, ramps);

  // Interaction states, offset from the accent's FINAL rung so they stay visibly distinct from it.
  for (const role of ROLES.filter((r) => r.follows)) {
    const hue = pick[role.ramp];
    const anchor = placed.find((p) => p.token === role.follows);
    const anchorStep = stepped.find((s) => s.token === role.follows)?.to ?? anchor.step;
    const rungs = Object.keys(ramps[hue]).map(Number);
    const target = anchorStep + role.offset;
    const rung = rungs.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best));
    values[role.token] = ramps[hue][rung];
    placed.push({ token: role.token, ramp: hue, step: rung, source: `${hue}/${rung} (${role.follows} ${anchorStep} + ${role.offset})` });
  }
  const checks = checkPairs(values, RULESET.wcagPairs);
  const failures = checks.filter((c) => !c.pass);

  const label =
    `IMPORTED, NOT DESIGNED — every colour below is a real value read from the Figma file ` +
    `"${fileName ?? fileKey}" (key ${fileKey}) by tooling/figma/figma-pull.mjs. It is that file's ` +
    `design work, not this repo's; the pack only maps its ${pick.neutral}/${pick.accent} ramps onto ` +
    `contract roles.\n * Regenerate: node tooling/figma/figma-pull.mjs --slug ${slug} ` +
    `--neutral ${pick.neutral} --accent ${pick.accent}` +
    // Name the source this run actually read. A pack pulled from an export must not tell the next
    // reader to regenerate it through the API, which needs a token and spends the file's quota.
    (readOptions.from ? ` --from ${readOptions.from}` : "") +
    `\n * WCAG (RULESET.wcagPairs, the same list derive() is held to): ${checks.length - failures.length}/${checks.length} pairs pass` +
    (stepped.length
      ? `\n * Contrast negotiated within the file's own ramps: ` +
        stepped.map((s) => `${s.token} ${s.ramp}/${s.from}→${s.ramp}/${s.to}`).join(", ")
      : `\n * No contrast negotiation was needed — every nominal rung passed as mapped.`) +
    (failures.length
      ? `\n * STILL FAILING (no rung in the ramp satisfies these — the pack ships saying so): ` +
        failures.map((f) => `${f.fg} on ${f.bg} ${f.ratio}:1 < ${f.min}`).join(", ")
      : "");

  const dest = `${ROOT}/system/tokens.${slug}.css`;
  const r = genPackCss(values, { slug, dest, note: label });

  for (const r of ROLES) {
    const p = placed.find((x) => x.token === r.token);
    console.log(`${p.token.padEnd(28)} ${String(values[p.token]).padEnd(9)} ← ${p.source}`);
  }
  if (pages) console.log(`\npages read: ${pages.read.map((p) => p.name).join(", ") || "none"} · skipped: ${pages.skipped.length}`);
  console.log(`ramps found: ${available.join(", ")}`);
  console.log(`roles mapped: ${placed.length} · auto-filled from contract defaults: ${r.filled.length}`);
  for (const s of stepped) console.log(`negotiated: ${s.token} ${s.ramp}/${s.from} (${s.fromValue}) → ${s.ramp}/${s.to} (${s.toValue}) for contrast`);
  for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${String(c.ratio).padStart(6)} / ${c.min}  ${c.fg} on ${c.bg}`);
  console.log(`figma pull      ${failures.length ? "⚠" : "✓"}  ${slug} — ${r.tokenCount} tokens → ${relative(ROOT, dest)}` +
    (failures.length ? `  (${failures.length} WCAG pair(s) still failing — named in the pack header)` : ""));

  return { slug, dest, values, checks, stepped, failures };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space (gen-token-css L148).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = (name) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? undefined : process.argv[i + 1];
  };
  runPull({ slug: flag("--slug"), accent: flag("--accent"), neutral: flag("--neutral"), ...readFlags(process.argv) }).catch((e) => {
    console.error(e.stack ?? e.message);
    process.exit(1);
  });
}
