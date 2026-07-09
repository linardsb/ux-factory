// decisions.json — generated FROM the decisions ledger, never written directly.
// Spec: _factory/agent-layer.md §3.
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger } from "./lib.mjs";

export function genDecisions({ meta, decisions }) {
  const out = {
    site: meta.site,
    candidate: meta.candidate,
    role_applied: meta.role_applied,
    built_because: meta.built_because,
    practice: meta.practice,
    system_mechanic: meta.system_mechanic,
    relationship: meta.relationship,
    build: {
      process: meta.build.process,
      days: meta.build.days,
      days_note: meta.build.days_note,
      tasks: meta.build.tasks,
      reworked: meta.build.reworked,
      disputes: meta.build.disputes,
    },
    decisions: decisions.map((d) => ({
      id: d.id,
      prototype: d.prototype,
      jd_line: d.jd_line,
      decision: d.decision,
      because: d.because,
      rejected: d.rejected,
      would_measure: d.would_measure,
      result: d.result || "untested",
    })),
  };

  const dest = join(resolve(meta.site_root), "decisions.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  return { dest, count: out.decisions.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = genDecisions(parseLedger(process.argv[2] || "_factory/kb/decisions/trainline.md"));
  console.log(`decisions.json  ✓  ${r.count} decisions → ${r.dest}`);
}
