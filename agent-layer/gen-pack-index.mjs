// gen-pack-index.mjs — the handoff pack's routing index (epic #329, ticket #419).
// Walks handoff/verdant/ and writes llms.txt: one line per pack file,
// `path · bytes · what it is · read when`, so an engineer's agent that lands in the directory
// is routed to the right file instead of opening all of them. Evidence: the 2026-08-28 fenced
// seam run logged "landed in a directory of eight things with no map" as an absence.
//
// BYTES ARE MEASURED, never declared: a line that disagrees with the file on disk is drift, and
// tooling/build-checks.mjs' handoff-seam group fails on it BY PATH.
//
// ORDER — this generator runs LAST of the pack chain (after gen-handoff, gen-vocabulary and
// gen-pack-bundle), because it measures what they write. gen-pack-bundle in turn excludes
// llms.txt from its files map: the bundle inlines every file it carries and this index measures
// the bundle, so each would depend on the other's byte count and no single pass could be right.
// That exclusion and this ordering are one decision; the gate pins both halves.
//
// The routing table is TOTAL: a pack file no rule matches is a throw naming the path, so a
// ticket that adds a file to the pack (#332's components.css and contracts/commands/) adds its
// routing line in the same edit rather than shipping an unrouted file behind a green gate.
// Standalone:  node agent-layer/gen-pack-index.mjs
// Paths resolve from this module (NOT cwd) — build.mjs runs from the jobs folder.

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = join(ROOT, "handoff/verdant");

export const INDEX_NAME = "llms.txt";
export const BUNDLE_NAME = "pack.bundle.json";
/** The field separator. No purpose or read-when text may contain it — the gate asserts that. */
export const SEP = " · ";

// The component a sidecar belongs to: `plant-card.contract.json` and `vd-plant-card.mjs` both
// name plant-card. Filename-derived on purpose — the sidecars are generated from the spec list.
const componentOf = (rel) =>
  rel.replace(/^.*\//, "").replace(/^vd-/, "").replace(/\.contract\.json$|\.mjs$|\.json$/, "");

// Ordered: the emitted order IS this order, so the map reads top-down as a route rather than as
// an alphabetical directory listing. `purpose` and `readWhen` take the relative path.
export const ROUTES = [
  {
    test: (rel) => rel === "vocabulary.json",
    purpose: () => "the agentic vocabulary: every component the renderer accepts, with its props, enums and children",
    readWhen: () => "composing a screen — a tree that does not validate against this is refused",
  },
  {
    test: (rel) => rel === "pack.json",
    purpose: () => "every ComponentSpec: the machine head, the engineer prose (purpose, states, accessibility) and the portability block",
    readWhen: () => "you want the prose behind a component, or the whole spec set as one object",
  },
  {
    test: (rel) => /^contracts\/commands\/[^/]+\.json$/.test(rel),
    purpose: (rel) => `the ${componentOf(rel)} command: request shape, response shape and the effects it commits`,
    readWhen: () => "wiring the write path — the control that changes something",
  },
  {
    test: (rel) => /^contracts\/[^/]+\.contract\.json$/.test(rel),
    purpose: (rel) => `JSON Schema 2020-12 for the record ${componentOf(rel)} binds`,
    readWhen: (rel) => `binding real records to ${componentOf(rel)}`,
  },
  {
    test: (rel) => rel === "components.css",
    purpose: () => "the components' executable form: token-only CSS, one block per component",
    readWhen: () => "you want the shipped CSS rather than a description of it",
  },
  {
    test: (rel) => rel === "tokens/css/contract.css",
    purpose: () => "every semantic token name with its neutral fallback, brand-free by construction",
    readWhen: () => "you need the CSS custom-property names the components read",
  },
  {
    test: (rel) => rel === "tokens/css/neutral.css",
    purpose: () => "the neutral pack: the values behind the contract, and the one layer a brand replaces",
    readWhen: () => "re-skinning — clone this file, never the contract",
  },
  {
    test: (rel) => rel === "tokens.dtcg.json",
    purpose: () => "the token source in DTCG format, the file both CSS layers are generated from",
    readWhen: () => "importing the tokens into Figma or Style Dictionary",
  },
  {
    test: (rel) => /^tokens\/ios\/[^/]+\.swift$/.test(rel),
    purpose: () => "the Style Dictionary iOS build of the same tokens",
    readWhen: () => "building these components on iOS",
  },
  {
    test: (rel) => /^tokens\/android\/[^/]+\.xml$/.test(rel),
    purpose: () => "the Style Dictionary Android build of the same tokens",
    readWhen: () => "building these components on Android",
  },
  {
    test: (rel) => rel === "wc/README.md",
    purpose: () => "how the custom-element wrappers are loaded, themed and demonstrated",
    readWhen: () => "you are about to drop the elements into a page",
  },
  {
    test: (rel) => /^wc\/vd-[^/]+\.mjs$/.test(rel),
    purpose: (rel) => `a standalone custom element wrapping ${componentOf(rel)}, themed by the token contract alone`,
    readWhen: (rel) => `you want ${componentOf(rel)} as an element instead of copy-paste markup`,
  },
  {
    test: (rel) => rel === "figma-import.md",
    purpose: () => "the DTCG-to-Figma import path, written for the design-tool end",
    readWhen: () => "taking the tokens into a design tool",
  },
  {
    test: (rel) => rel === "figma-parity.json",
    purpose: () => "a real figma-parity run: a Figma file diffed against the token contract",
    readWhen: () => "checking whether a Figma file still matches the contract",
  },
  {
    test: (rel) => rel === BUNDLE_NAME,
    purpose: () => "every other file in this pack inlined into one JSON object, lossless UTF-8",
    readWhen: () => "you want the whole pack in one fetch",
  },
];

/** The route index for a pack file, or a throw naming the path. Total by contract. */
export function routeIndex(rel) {
  const i = ROUTES.findIndex((r) => r.test(rel));
  if (i === -1)
    throw new Error(
      `handoff/verdant/${rel}: no routing rule in agent-layer/gen-pack-index.mjs — a new pack file needs its line in the map (ROUTES), or llms.txt would ship a directory it does not describe`
    );
  return i;
}

/** One listing line. The gate rebuilds this from the file on disk and compares it verbatim. */
export function indexLine(rel, bytes) {
  const r = ROUTES[routeIndex(rel)];
  return `${rel}${SEP}${bytes} B${SEP}${r.purpose(rel)}${SEP}read when ${r.readWhen(rel)}`;
}

const HEADING = "## Files";

/** The whole artifact, from `[{ rel, bytes }]`. Pure — the gate drives it in memory. */
export function renderIndex(files) {
  const body = files
    .map((f) => ({ ...f, at: routeIndex(f.rel) }))
    .sort((a, b) => a.at - b.at || (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
    .map((f) => indexLine(f.rel, f.bytes));
  return [
    "# Verdant handoff pack — file map",
    "",
    "> Every file in this pack gets one line below: its path, its size in bytes, what it is, and",
    "> when to read it. Most tasks need two or three of them, not all of them.",
    ">",
    "> Generated by agent-layer/gen-pack-index.mjs from the pack directory itself, never written",
    "> by hand. Sizes are measured at generation, so a line that disagrees with the file it names",
    "> is drift and this repo's build gate fails on it by path.",
    ">",
    `> ${INDEX_NAME} is the one pack file with no line below, and the one file ${BUNDLE_NAME} does`,
    "> not inline: the bundle carries every file it lists and this map measures the bundle, so each",
    "> would depend on the other's byte count and no single generation pass could be right.",
    ">",
    "> Verdant is a fictional demo scenario. The components, tokens and contracts are real.",
    "",
    HEADING,
    ...body,
    "",
  ].join("\n");
}

// Recurse into `dir`, collecting relative POSIX paths. Hidden entries are skipped, the same rule
// gen-pack-bundle.mjs walks by — deliberately a SECOND walk rather than a shared one, because the
// gate compares this map against the bundle's key set and a shared walk would make that
// comparison unable to fail.
function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else acc.push(relative(PACK_DIR, full).split(sep).join("/"));
  }
  return acc;
}

export function genPackIndex() {
  const files = walk(PACK_DIR)
    .filter((rel) => rel !== INDEX_NAME) // the map does not list itself
    .sort()
    .map((rel) => ({ rel, bytes: statSync(join(PACK_DIR, rel.split("/").join(sep))).size }));
  const dest = join(PACK_DIR, INDEX_NAME);
  writeFileSync(dest, renderIndex(files));
  return { files: files.length, dest };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = genPackIndex();
  console.log(`pack index      ✓  ${r.files} files (handoff/verdant/${INDEX_NAME})`);
}
