// Agent-layer build: emit the full machine-readable projection for one site.
// Run from the jobs folder:  node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/<company>.md
// Spec: _factory/agent-layer.md ·  Verify: _factory/checkers/agent-answerability.md
import { copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger } from "./lib.mjs";
import { genDecisions } from "./gen-decisions.mjs";
import { genTokenCss } from "./gen-token-css.mjs";
import { genTokens } from "./gen-tokens.mjs";
import { genHandoff } from "./gen-handoff.mjs";
import { genLlms } from "./gen-llms.mjs";
import { genHeaders } from "./gen-headers.mjs";
import { injectJsonLd } from "./inject-jsonld.mjs";

const ledgerPath = process.argv[2] || "_factory/kb/decisions/trainline.md";
const ledger = parseLedger(ledgerPath);
const { meta } = ledger;
const root = resolve(meta.site_root);

console.log(`agent layer → ${meta.site}  (source: ${ledgerPath})\n`);

const d = genDecisions(ledger);
console.log(`  decisions.json  ✓  ${d.count} decisions`);

const c = genTokenCss();
console.log(`  token css       ✓  ${c.contract} contract + ${c.neutral} pack tokens (from tokens.source.json)`);

const t = genTokens(ledger);
console.log(`  tokens.json     ✓  ${t.contract} contract + ${t.pack} pack tokens (DTCG)`);

const hp = genHandoff();
console.log(`  handoff pack    ✓  ${hp.components} specs + ${hp.targets} token targets (handoff/verdant)`);

const l = genLlms(ledger);
console.log(`  llms.txt        ✓  ${l.prototypes} prototypes`);

const h = genHeaders(ledger);
console.log(`  _headers        ✓  noindex=${h.noindex}`);

const j = injectJsonLd(ledger);
console.log(`  json-ld         ✓  Person ×${j.pages}, +CreativeWork ×${j.creativeWorks}  (base ${j.base})`);

// Serve the constitution at the site root — it carries the design-system mechanic and the
// hard constraints the agent-answerability check reads from the machine layer.
copyFileSync(resolve(meta.constitution), join(root, "DESIGN.md"));
console.log(`  DESIGN.md       ✓  served at site root`);

console.log(`\ndone → ${root}`);
