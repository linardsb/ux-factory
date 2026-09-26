// import/regen-expected.mjs — the generator for the committed expected verdicts, one per converter's
// fixture: import/fixtures/spike-c-instance.expected.json (Brilliant, case 40.1) and
// import/fixtures/figma/spike-list-row.expected.json (Figma, case 40.19) — the determinism anchors
// build-checks group 40 compares every run against (epic #295 tickets #304 and #310).
//
// IT EXISTS BECAUSE THE ARTIFACT HAS A REGEN CHAIN NOBODY WOULD OTHERWISE FIND. The expected verdict
// carries a `candidates` list per node, so it is a function of the WHOLE vocabulary — #305's `icon`
// entry, or either of G24's two remaining primitives, moves it and reds case 1 on a ticket that never
// touched import/. The same shape as a tokens.source.json change owing gen-handoff.mjs a run.
// CLAUDE.md's "New component spec" bullet names this file for that reason.
//
// THE OUTPUT IS THE PROGRAM'S, NEVER A HAND EDIT (CLAUDE.md § Ground rules, the honesty contract). If
// the regenerated answer differs from the one the ticket expects, the fix is a principled change to a
// signal with its reason in import/recognise.mjs's header — never an edit to this JSON.
//
// Canonical form, and the gate depends on all three: keys sorted at every level, two-space indent,
// one trailing newline.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { convert as convertBrilliant } from "./brilliant.mjs";
import { convert as convertFigma } from "./figma.mjs";
import { recognise } from "./recognise.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// ONE list, so a spec that moves the verdicts is one command for both converters (CLAUDE.md's
// "New component spec" bullet names this file, not two).
const FIXTURES = Object.freeze([
  { source: "import/fixtures/spike-c-instance.blueprint.txt", dest: "import/fixtures/spike-c-instance.expected.json", convert: convertBrilliant },
  { source: "import/fixtures/figma/spike-list-row.export.json", dest: "import/fixtures/figma/spike-list-row.expected.json", convert: convertFigma },
]);

const sortKeys = (v) => (Array.isArray(v)
  ? v.map(sortKeys)
  : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v));

// Emit every artifact (or, with {check: true}, compare against disk without writing).
// Returns { rows: [{source, dest, bytes}], drifted } — `drifted` lists each dest the disk disagrees with.
export function genExpectedVerdict({ check = false } = {}) {
  const vocab = JSON.parse(readFileSync(join(ROOT, "handoff/verdant/vocabulary.json"), "utf8"));
  const rows = [], drifted = [];
  for (const { source, dest, convert } of FIXTURES) {
    const ir = convert(readFileSync(join(ROOT, source), "utf8"));
    const out = `${JSON.stringify(sortKeys(recognise(ir, vocab)), null, 2)}\n`;
    // An ABSENT artifact is drift under --check and a write otherwise. Reading it first made the
    // script that exists to CREATE the file throw ENOENT on the one tree where it has to run: a fresh
    // fixture, which is the shape #310's converter arrived with (PR #448 F9).
    const onDisk = existsSync(join(ROOT, dest)) ? readFileSync(join(ROOT, dest), "utf8") : null;
    // BYTES, not UTF-16 code units: the artifact carries "·", "—" and the typographic minus, so
    // out.length under-reports it (PR #448 F8).
    rows.push({ source, dest, bytes: Buffer.byteLength(out, "utf8") });
    if (onDisk === out) continue;
    if (check) drifted.push(dest); else writeFileSync(join(ROOT, dest), out);
  }
  return { rows, drifted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rows, drifted } = genExpectedVerdict({ check: process.argv.includes("--check") });
  if (drifted.length) {
    console.error(`expected verdict ✗  drift: ${drifted.join(", ")} — run without --check and read the diff`);
    process.exit(1);
  }
  for (const r of rows) console.log(`expected verdict ✓  ${r.dest} — ${r.bytes} bytes from ${r.source}`);
}
