// gen-inspect-data.mjs — the inspect bubble's generated data (epic #164 —
// docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Inspect data"; ticket #166).
// Joins system/system-graph.json's consumer blocks (the tokens each MEASURABLY consumes) with
// system/specs/* heads (the spec line + prop/state counts) and one hand-authored plain-English
// role sentence per instrumented component — the ONE hand-written field, and it is copy, not a
// claim (honesty contract): it describes what the component is, never asserts a measurement.
// Token VALUES and live measurements ship in no artifact — system/inspect.mjs reads them from
// getComputedStyle at open time, which is the only honest source under derived/imported packs.
// Drift-checked by tooling/drift-check.mjs.
// Determinism is mandatory: rows in system-graph consumer order, no timestamps, trailing newline.
// Standalone:  node agent-layer/gen-inspect-data.mjs [--check]
// Paths resolve from this module (NOT cwd) — same rule as every sibling generator.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseComponentSpec } from "./lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = "system/inspect-data.json";
const GRAPH = "system/system-graph.json";

// The hand-authored role lines — keys are system-graph consumer ids. A key naming no consumer
// throws (the drift guard for a renamed components.css block); a consumer with no key here is
// simply not inspectable yet (later mount tickets add lines as they instrument surfaces).
const ROLES = {
  buttons:
    "The site's buttons. One component, three emphasis levels. Every colour comes from the token contract, so a brand pack restyles them without touching this code.",
  cards:
    "The site's surface cards. Background, border, text and spacing all resolve through named tokens, so the same card looks native under any brand pack.",
  "ds-metric-tile-cross-scenario-library-primitive":
    "One computed metric: a label, a value, an optional unit. The library's cross-scenario primitive for answering \"how many\". Both demo scenarios and /build's dashboard pattern render through it.",
  "ds-list-row-cross-scenario-library-primitive":
    "One named entity per row, with a figure and an optional status. The library primitive for answering \"which ones\". Queues, feeds and settings on /build all render through it.",
  "ds-sequence-step-cross-scenario-library-primitive":
    "One position in an ordered sequence: number, name, optional qualifier. The library primitive for answering \"where in the order\". /build's onboarding pattern repeats it.",
  "vd-screen-header":
    "The Verdant phone app bar: back affordance, screen title, settings. Part of the fictional plant-care demo, and always the topmost element of a screen.",
  "vd-status-chip":
    "A small pill naming a plant's care state in the Verdant demo, its one categorical state signal. Always a child of a card or row, never free-standing.",
  "vd-plant-card":
    "One plant in Verdant's \"My plants\" list: thumbnail, name and species, status chip. The whole card is one tap target.",
  "vd-stat-tile":
    "One sensor reading on a Verdant plant screen: value and unit large, glyph and caption quiet. It displays; urgency is the status chip's job.",
  "vd-care-task-row":
    "One scheduled care action in Verdant's \"Today\" list: a check circle, the action, a status chip. One action per row.",
  "vd-primary-button":
    "The Verdant screen's one committing action: a full-width accent button, always last in reading order. On the today screen it logs the checked care tasks.",
};

// Emit the artifact (or, with {check: true}, compare against disk and report drift).
// Returns { counts, drifted }.
export function genInspectData({ check = false } = {}) {
  // The committed graph is the source (itself drift-checked) — never re-run genSystemGraph here.
  const graph = JSON.parse(readFileSync(join(ROOT, GRAPH), "utf8"));
  const byId = new Map(graph.consumers.map((c) => [c.id, c]));
  for (const id of Object.keys(ROLES))
    if (!byId.has(id))
      throw new Error(`inspect-data: ROLES key "${id}" names no consumer in ${GRAPH} — renamed components.css block?`);

  // Rows in system-graph consumer order (NOT ROLES key order) — determinism tied to the measured file.
  const components = graph.consumers
    .filter((c) => ROLES[c.id])
    .map((c) => {
      let spec = null;
      if (c.spec) {
        const { head } = parseComponentSpec(join(ROOT, c.spec));
        const props = Object.keys(head.props).length;
        const states = head.states.length;
        spec = {
          component: head.component,
          status: head.status,
          props,
          states,
          line: `${head.component} · ${head.status} · ${props} props · ${states} states`,
        };
      }
      return { id: c.id, label: c.label, role: ROLES[c.id], tokens: c.tokens, spec };
    });
  if (!components.length) throw new Error(`inspect-data: zero components joined from ${GRAPH}`);

  const counts = {
    components: components.length,
    withSpec: components.filter((c) => c.spec).length,
  };
  const out = JSON.stringify(
    {
      $description:
        "GENERATED by agent-layer/gen-inspect-data.mjs — do not edit. The inspect bubble's data: system-graph consumer blocks (tokens each consumes) × system/specs/* heads (spec line) × a hand-authored role sentence (copy, not a claim). Values and measurements resolve live via getComputedStyle. Regenerate: node agent-layer/gen-inspect-data.mjs",
      components,
      counts,
    },
    null,
    2
  ) + "\n";
  if (check) {
    let prior;
    try { prior = readFileSync(join(ROOT, DEST), "utf8"); } catch { prior = ""; }
    return { counts, drifted: prior !== out ? [DEST] : [] };
  }
  writeFileSync(join(ROOT, DEST), out);
  return { counts, drifted: [] };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check");
  const r = genInspectData({ check });
  if (check && r.drifted.length) {
    console.error(`inspect data ✗  drift: ${r.drifted.join(", ")} — regenerate with: node agent-layer/gen-inspect-data.mjs`);
    process.exit(1);
  }
  console.log(`inspect data ✓  ${r.counts.components} components · ${r.counts.withSpec} with spec ${check ? "— no drift" : `(${DEST})`}`);
}
