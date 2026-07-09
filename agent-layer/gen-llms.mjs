// llms.txt — cheap, honestly-labelled pointer file. Spec: _factory/agent-layer.md §5.
// The load-bearing answers live in decisions.json / tokens.json / DESIGN.md / JSON-LD;
// this file just points at them. Prototypes + their "Built because" signals are scanned
// from the site itself, so llms.txt stays a true projection of what shipped.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger, stripTags, first } from "./lib.mjs";

// Every subdirectory whose index.html carries a `.proto-because` strip is a prototype.
function scanPrototypes(root) {
  const protos = [];
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const index = join(root, name.name, "index.html");
    if (!existsSync(index)) continue;
    const html = readFileSync(index, "utf8");
    const strip = first(html, /class="proto-because"[^>]*>([\s\S]*?)<\/p>/);
    if (!strip) continue;
    // The bolded phrase is the JD line / industry signal.
    const signal = stripTags(first(strip, /<b>([\s\S]*?)<\/b>/) || strip).replace(/^Built because:\s*/i, "");
    protos.push({ slug: name.name, signal });
  }
  return protos;
}

export function genLlms({ meta }) {
  const root = resolve(meta.site_root);
  const protos = scanPrototypes(root);
  const flagshipSlug = meta.flagship || protos[0]?.slug;
  const flagship = protos.find((p) => p.slug === flagshipSlug);
  const rest = protos.filter((p) => p.slug !== flagshipSlug);

  const lines = [
    `# ${meta.candidate} — ${meta.role_applied} application for Trainline`,
    `> ${meta.relationship}`,
    "",
    "## Read these",
    "- /decisions.json: every design decision with its rejected alternatives and the measure that judges it",
    "- /tokens.json: the design-token contract (DTCG) — a semantic contract plus a swappable brand pack",
    "- /DESIGN.md: the build constitution — brand, content budgets, accessibility and token rules",
  ];
  if (flagship) {
    const log = existsSync(join(root, flagship.slug, "decisions.html"))
      ? ` Decision log at /${flagship.slug}/decisions.html`
      : "";
    lines.push(`- /${flagship.slug}/: the flagship — Built because: ${flagship.signal}.${log}`);
  }
  if (rest.length) {
    lines.push("## Prototypes");
    for (const p of rest) lines.push(`- /${p.slug}/: Built because: ${p.signal}`);
  }
  lines.push("## Contact", "linardsberzins@gmail.com", "");

  const dest = join(root, "llms.txt");
  writeFileSync(dest, lines.join("\n"));
  return { dest, prototypes: protos.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = genLlms(parseLedger(process.argv[2] || "_factory/kb/decisions/trainline.md"));
  console.log(`llms.txt        ✓  ${r.prototypes} prototypes → ${r.dest}`);
}
