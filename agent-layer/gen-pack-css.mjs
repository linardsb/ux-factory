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
// The parse, the validation, the auto-fill and the emission live in the view-time-safe engine
// (#130), so a pack emitted in a reader's browser is byte-identical to one emitted here. This
// file keeps the two things that engine must never do: read a path, and write one.
import { emitPackCss, parseContract } from "../system/pack-import.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM = join(ROOT, "system");
const SOURCE = join(SYSTEM, "tokens.source.json");

// The contract group of tokens.source.json is the completion source + the name whitelist.
// Exported because figma-pull reads the same defaults to keep a design's imported type size
// inside the contract's own clamp() shape — one source of truth, never a second copy.
// The parse itself is parseContract in system/pack-import.mjs; this is its file-reading shell.
export function loadContract(sourceJson) {
  return parseContract(JSON.parse(readFileSync(sourceJson, "utf8")), { label: sourceJson });
}

// input: a DTCG seed { tokens: { name: { $value, $type } }, review? } OR a flat { name: value } map.
// Returns { slug, dest, tokenCount, filled: [names], css }. Throws (naming the token) on an
// unknown name or a malformed value; writes `dest` when given.
export function genPackCss(input, { slug, dest, sourceJson = SOURCE, note } = {}) {
  const contract = loadContract(sourceJson);
  const { tokenCount, filled, css } = emitPackCss(input, {
    slug, note, contract,
    // The unknown-token message has always named the source repo-relatively; the engine has no
    // notion of ROOT, so the label is supplied from here.
    sourceLabel: relative(ROOT, sourceJson),
  });
  if (dest) writeFileSync(dest, css);
  return { slug, dest: dest || null, tokenCount, filled, css };
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
