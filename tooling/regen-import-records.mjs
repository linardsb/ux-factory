// tooling/regen-import-records.mjs — the generator for the two committed fixture import records under
// import/fixtures/records/ (epic #295 ticket #307; .claude/plans/import-record-snap-rules-307.md Task 9).
// build-checks group 42 case 6 compares every run against them, JSON and markdown, byte for byte.
//
// IT LIVES IN tooling/ AND NOT BESIDE import/regen-expected.mjs, which it mirrors, because a record's
// fidelity block carries WCAG, computed by system/wcag.mjs over system/derive.rules.mjs's pairs — and
// build-checks group 40.7 refuses any import/ module whose graph leaves import/. The record module
// (import/report.mjs) takes WCAG as data for the same reason.
//
// FROZEN INPUTS ONLY, never .claude/plans/: the spike-C instance blueprint, S3's renders, regions and
// M1 mapping and spike A's Polaris pack, all copied under import/fixtures/. Two inputs are LIVE and
// move the records on a ticket that never touched import/: handoff/verdant/vocabulary.json (each node
// carries a candidates list scored against the WHOLE vocabulary — a new spec moves it, exactly like
// spike-c-instance.expected.json) and system/tokens.source.json / tokens.neutral.css (the snap targets
// and the WCAG base). CLAUDE.md's "New component spec" bullet names this file for that reason.
//
// No override file is read: the owner's import/overrides/ must not move a gate fixture. Both records
// are bound reads, so the snap step has nothing to do on them anyway.
//
// THE OUTPUT IS THE PROGRAM'S, NEVER A HAND EDIT (CLAUDE.md § Ground rules, the honesty contract). A
// wrong record is fixed in the code or the frozen inputs, then regenerated.
//
// Canonical JSON: keys sorted at every level, two-space indent, one trailing newline.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { convert } from "../import/brilliant.mjs";
import { measure } from "../import/fidelity.mjs";
import { build, recognise } from "../import/recognise.mjs";
import { buildRecord, checkReferenceIndependence, projectRecord } from "../import/report.mjs";
import { snap, sourceHash, targetsFrom } from "../import/snap-rules.mjs";
import { RULESET } from "../system/derive.rules.mjs";
import { checkPairs } from "../system/wcag.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "import/fixtures/spike-c-instance.blueprint.txt";
const S3 = "import/fixtures/s3";
const DEST = "import/fixtures/records";

const sortKeys = (v) => (Array.isArray(v)
  ? v.map(sortKeys)
  : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v));

// A CSS token file → { name: "#rrggbb" }, resolving var() alias chains (tokens.neutral.css binds the
// semantic roles to primitives through var()). S3's wcag-probe.txt:43-55, lifted.
const parseCss = (css) => {
  const raw = Object.fromEntries([...css.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
  const out = {};
  for (const k of Object.keys(raw)) {
    let v = raw[k];
    for (let hops = 0; hops < 8 && /^var\(\s*--([a-z0-9-]+)/.test(v); hops++) {
      v = raw[v.match(/^var\(\s*--([a-z0-9-]+)/)[1]] ?? "";
    }
    if (/^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toLowerCase();
  }
  return out;
};
const strip = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/^--/, ""), v]));

const REFERENCE_SOURCE = "Brilliant's 06.svg for instance 1db1b29957b949ca, rasterised in Chromium at DSF 1 (S3)";
const CANDIDATE_SOURCE = "a hand-authored harness DOM with M1's two roles set from the pack (S3 capture.txt), not a render of this record's IR through its mapping";
const ATTRIBUTION = "Drawn in Brilliant's web editor under its default design system (spike C, 2026-08-27)";

// Every record, in memory. Exported so build-checks can drive the same path it compares.
export function buildImportRecords() {
  const read = (p) => readFileSync(join(ROOT, p));
  const vocab = JSON.parse(read("handoff/verdant/vocabulary.json"));
  const contract = JSON.parse(read("system/tokens.source.json")).contract;
  const mappingJson = JSON.parse(read(`${S3}/mapping.json`));
  const regions = JSON.parse(read(`${S3}/regions.json`));
  const neutral = parseCss(read("system/tokens.neutral.css").toString("utf8"));
  const bytes = read(SOURCE);

  const converted = convert(bytes.toString("utf8"));
  const { ir } = snap(converted, targetsFrom(contract));
  const verdict = recognise(ir, vocab);
  const buildDrops = [];
  // ONCE PER TOP-LEVEL CHILD: build() recurses itself, so a per-node sweep would file rows twice.
  ir.children.forEach((n, i) => build(n, verdict.children[i], vocab, buildDrops));
  const roles = Object.fromEntries(Object.entries(mappingJson.map.M1).map(([role, m]) => [role, m.token]));

  const one = ({ id, candidate, pack, tokens, attribution }) => {
    const m = measure(read(`${S3}/ref.png`), read(`${S3}/${candidate}`), regions);
    const rows = checkPairs(tokens, RULESET.wcagPairs);
    return buildRecord({
      id,
      source: { tool: "brilliant", project: null, ids: ir.source.ids, bound: ir.source.bound, file: SOURCE, sha256: sourceHash(bytes) },
      ir,
      recognition: { verdict, buildDrops },
      mapping: { map: "M1", pack, roles, drops: mappingJson.drops },
      fidelity: {
        deltaEMin: { ...m, reference: { ...m.reference, source: REFERENCE_SOURCE }, candidate: { ...m.candidate, source: CANDIDATE_SOURCE, file: `${S3}/${candidate}` } },
        wcag: { pass: rows.filter((r) => r.pass).length, total: rows.length, failing: rows.filter((r) => !r.pass).map((r) => `${r.fg} on ${r.bg}`) },
      },
      provenance: { mode: 1, licence: null, attribution },
      elapsed: { recognition: null, ratify: null },
    });
  };

  const records = [
    one({
      id: "spike-c-wrong-but-green", candidate: "m1-wrong.png",
      pack: "tokens.polaris.spike.css — spike A run 3's Polaris v7 pack",
      tokens: { ...neutral, ...parseCss(read(`${S3}/tokens.polaris.spike.css`).toString("utf8")) },
      attribution: `${ATTRIBUTION}; candidate colours from spike A run 3's Polaris v7 pack (Shopify Polaris v7.0.0 public token export)`,
    }),
    one({
      id: "spike-c-faithful", candidate: "m1-faithful.png",
      pack: "the source's own literals on the mapped roles (S3 mapping.json packs.faithful)",
      tokens: { ...neutral, ...strip(mappingJson.packs.faithful.values) },
      attribution: ATTRIBUTION,
    }),
  ];
  return checkReferenceIndependence(records.map(sortKeys));
}

// Emit the records (or, with {check: true}, compare against disk without writing).
// Returns { bytes, drifted } — `drifted` names every file that disagrees; an ABSENT file is drift.
export function genImportRecords({ check = false } = {}) {
  const drifted = [];
  let bytes = 0;
  if (!check) mkdirSync(join(ROOT, DEST), { recursive: true });
  for (const r of buildImportRecords()) {
    for (const [ext, text] of [["json", `${JSON.stringify(r, null, 2)}\n`], ["md", projectRecord(r)]]) {
      const rel = `${DEST}/${r.id}.${ext}`;
      const onDisk = existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : null;
      bytes += Buffer.byteLength(text, "utf8");
      if (onDisk === text) continue;
      if (check) drifted.push(rel);
      else writeFileSync(join(ROOT, rel), text);
    }
  }
  return { bytes, drifted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check");
  const { bytes, drifted } = genImportRecords({ check });
  if (drifted.length) {
    console.error(`import records ✗  drift: ${drifted.join(", ")} — the records are a function of the whole vocabulary and tokens.source.json, so a new spec or token moves them. Regenerate with \`node tooling/regen-import-records.mjs\` and read the diff`);
    process.exit(1);
  }
  console.log(`import records ✓  ${DEST}/ — 4 files, ${bytes} bytes${check ? ", no drift" : ""}`);
}
