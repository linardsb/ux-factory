// agent-layer/gen-pack-css.mjs — DTCG seed / token map → a tokens.<slug>.css pack
// (epic #38, ticket #40). Architecture per-company-brief §Data model "Derived pack seed"
// + §Stack "the derivation seed lands as DTCG feeding the existing gen-token-css path".
//
// The generic pack emitter reused by the derivation capability. It turns EITHER a DTCG
// seed  { tokens: { "color-accent": { "$value": "#2f7a4d", "$type": "color" }, … } }  (the
// vision agent's proposed output)  OR  a flat { name: value } map  (derive().tokens, the
// ground-truth path)  into a  :root { --name: value; }  pack — the SAME emission the
// contract/neutral layers use (cssValue is imported from gen-token-css.mjs, not re-implemented),
// so a derived pack renders identically to a hand-authored one.
//
// Completion & honesty: the ~16 relative/static contract tokens the agent is not asked to
// propose (the color-mix inverse tokens, shadows, maxw, gutter, fonts) are auto-filled from
// system/tokens.source.json's contract defaults — filled generically (any of the 47 missing),
// never a hardcoded list. The CLI REPORTS every auto-filled token: an omitted *perceptual*
// token (a colour/type/spacing the agent should have proposed) surfaces there — the recorded
// run's validate phase reads that report and re-proposes (the self-correction lever). Two hard
// throws guard against a broken seed: an UNKNOWN token name (typo / hallucinated token) and a
// MALFORMED value (null / empty / object). Standalone, zero-dep, paths resolve from this module.
//   node agent-layer/gen-pack-css.mjs <seed.json> [dest.css]   (emit a pack from a seed)
//   node agent-layer/gen-pack-css.mjs --verdant                 (regenerate system/tokens.verdant.css)
// NOT registered in build.mjs — build.mjs is ledger-driven; this is seed-driven (see gen-token-css
// for the drift-checked default path this deliberately does not touch).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cssValue } from "./gen-token-css.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM = join(ROOT, "system");
const SOURCE = join(SYSTEM, "tokens.source.json");

// The contract group of tokens.source.json is the completion source + the name whitelist.
// Returns the sections (for grouped emission), a name→token lookup, and the ordered names.
function loadContract(sourceJson) {
  const src = JSON.parse(readFileSync(sourceJson, "utf8"));
  if (!src.contract) throw new Error(`gen-pack-css: ${sourceJson} has no "contract" group`);
  const sections = [];
  const byName = {};
  const order = [];
  for (const [secKey, sec] of Object.entries(src.contract)) {
    if (secKey.startsWith("$")) continue;
    const toks = [];
    for (const [name, tok] of Object.entries(sec)) {
      if (name.startsWith("$")) continue;
      if (!tok || typeof tok !== "object" || !("$value" in tok))
        throw new Error(`gen-pack-css: ${sourceJson}: contract.${secKey}.${name} has no $value`);
      toks.push(name);
      byName[name] = tok;
      order.push(name);
    }
    sections.push({ label: sec.$description || secKey, tokens: toks });
  }
  return { sections, byName, order };
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

// input: a DTCG seed { tokens: { name: { $value, $type } }, review? } OR a flat { name: value } map.
// Returns { slug, dest, tokenCount, filled: [names], css }. Throws (naming the token) on an
// unknown name or a malformed value; writes `dest` when given.
export function genPackCss(input, { slug, dest, sourceJson = SOURCE, note } = {}) {
  if (!slug || typeof slug !== "string")
    throw new Error("gen-pack-css: a string `slug` is required (it names the pack in the header)");
  const { sections, byName, order } = loadContract(sourceJson);
  const contractNames = new Set(order);

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
      throw new Error(`gen-pack-css: "${name}" is not one of the ${order.length} contract leaf tokens (${relative(ROOT, sourceJson)} contract group)`);
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

  const css = emitPack(slug, note, sections, values);
  if (dest) writeFileSync(dest, css);
  return { slug, dest: dest || null, tokenCount: order.length, filled, css };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space (gen-token-css L148).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);

  if (argv.includes("--verdant")) {
    // Reproducible ground-truth pack: derive(Verdant's own axes) → system/tokens.verdant.css.
    // Axes read from the scenario (single source), not hardcoded; derive imported lazily so the
    // generic genPackCss export never pulls in the view-time engine.
    const axesPath = join(ROOT, "scenarios/verdant/intake.defaults.json");
    const { axes } = JSON.parse(readFileSync(axesPath, "utf8"));
    const { derive } = await import("../system/derive.mjs");
    const tokens = derive({
      brandColor: axes.brandColor, density: axes.density,
      rewardType: axes.rewardType, frequency: axes.frequency,
    }).tokens;
    const dest = join(SYSTEM, "tokens.verdant.css");
    const r = genPackCss(tokens, {
      slug: "verdant", dest,
      note: `Canonical Verdant pack — derive(Verdant axes ${axes.brandColor}/${axes.density}/${axes.rewardType}/${axes.frequency} from scenarios/verdant/intake.defaults.json). Regenerate: node agent-layer/gen-pack-css.mjs --verdant`,
    });
    console.log(`pack css        ✓  verdant — ${r.tokenCount} tokens → ${relative(ROOT, dest)}${r.filled.length ? `  (auto-filled ${r.filled.length})` : ""}`);
    process.exit(0);
  }

  const [seedPath, destArg] = argv.filter((a) => !a.startsWith("--"));
  if (!seedPath) {
    console.error("usage: node agent-layer/gen-pack-css.mjs <seed.json> [dest.css]   |   --verdant");
    process.exit(1);
  }
  const input = JSON.parse(readFileSync(resolve(process.cwd(), seedPath), "utf8"));
  const dest = destArg ? resolve(process.cwd(), destArg) : null;
  const slug = dest ? basename(dest).replace(/^tokens\./, "").replace(/\.css$/, "") || "pack" : "pack";
  const note = `From ${seedPath}. Regenerate: node agent-layer/gen-pack-css.mjs ${seedPath}${destArg ? ` ${destArg}` : ""}`;
  const r = genPackCss(input, { slug, dest, note });
  if (!dest) process.stdout.write(r.css);
  process.stderr.write(
    `pack css        ✓  ${slug} — ${r.tokenCount} tokens${dest ? ` → ${relative(process.cwd(), dest)}` : " (stdout)"}\n` +
    (r.filled.length
      ? `  auto-filled ${r.filled.length} token(s) absent from the seed, from contract defaults: ${r.filled.join(", ")}\n`
      : "  every contract token came from the seed (no auto-fill)\n"),
  );
}
