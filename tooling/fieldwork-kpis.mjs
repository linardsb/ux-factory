// tooling/fieldwork-kpis.mjs — ground-truth dispatch KPIs from the Fieldwork fixtures (epic #1, ticket #13).
// A JUDGE tool for verifying composition-run numbers; NEVER part of an agent prompt.
//
// validateComposition checks a composition's STRUCTURE, not its TRUTH — a tile reading
// "17 overdue" when the fixtures say 4 passes every existing gate. This recomputes the
// ground truth so a spike-6 proposal's numbers can be diffed against it; a wrong number
// is a re-run, never a hand-patch (honesty contract). It is a post-hoc check only: feeding
// its output into an agent prompt would make the numbers hand-fed and break the study's claim.
// Definitions mirror proto/fieldwork.html verbatim (same TODAY / SLA_SOON, same formulas) so
// "the number the agent should have computed" is exactly what the shipped board would show.
// Zero-dep, standalone:  node tooling/fieldwork-kpis.mjs [--json]

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = join(ROOT, "scenarios/fieldwork/fixtures");

// The scenario's fixed fictional today — identical to proto/fieldwork.html (63–64).
const TODAY = "2026-07-14";
const SLA_SOON = "2026-07-16"; // within two days of TODAY

const read = (name) => JSON.parse(readFileSync(join(FIX, `${name}.json`), "utf8"));

// Count occurrences of each value of `key` across `rows`, returned as a sorted plain object.
function countBy(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

export function fieldworkKpis() {
  const jobs = read("jobs");
  const technicians = read("technicians");
  const schedule = read("schedule");

  const open = (j) => j.completedAt === null;
  const atRisk = (j) => open(j) && j.slaDue <= SLA_SOON; // proto/fieldwork.html:86

  const overdue = jobs.filter((j) => j.status === "overdue"); // proto/fieldwork.html statusChip / attention
  const unassigned = jobs.filter((j) => j.techId === null);   // proto/fieldwork.html:107
  const openJobs = jobs.filter(open);
  const slaAtRisk = jobs.filter(atRisk);
  // Attention feed = open AND (overdue OR at-risk) — the board's headline queue (fieldwork.html:103–105).
  const attention = jobs.filter((j) => open(j) && (j.status === "overdue" || atRisk(j)));

  // Load: today's assigned slots per technician (a slot with a jobId), and per region.
  const techById = Object.fromEntries(technicians.map((t) => [t.id, t]));
  const todaySlots = schedule
    .filter((s) => s.date === TODAY)
    .flatMap((s) => s.slots.filter((slot) => slot.jobId).map((slot) => ({ techId: s.techId, jobId: slot.jobId })));
  const loadPerTech = {};
  const loadPerRegion = {};
  for (const t of technicians) loadPerTech[t.id] = 0;
  for (const r of ["north", "south", "east", "west"]) loadPerRegion[r] = 0;
  for (const s of todaySlots) {
    loadPerTech[s.techId] = (loadPerTech[s.techId] ?? 0) + 1;
    const region = techById[s.techId]?.region;
    if (region) loadPerRegion[region] = (loadPerRegion[region] ?? 0) + 1;
  }

  return {
    today: TODAY,
    slaSoon: SLA_SOON,
    totals: {
      jobs: jobs.length,
      technicians: technicians.length,
      open: openJobs.length,
      overdue: overdue.length,
      slaAtRisk: slaAtRisk.length,
      attention: attention.length,
      unassigned: unassigned.length,
      onSite: jobs.filter((j) => j.status === "on-site").length,
      enRoute: jobs.filter((j) => j.status === "en-route").length,
    },
    byStatus: countBy(jobs, "status"),
    byRegion: countBy(jobs, "region"),
    byPriority: countBy(jobs, "priority"),
    todayLoad: { perRegion: loadPerRegion, perTech: loadPerTech, scheduledToday: todaySlots.length },
    overdueIds: overdue.map((j) => j.id),
    unassignedIds: unassigned.map((j) => j.id),
  };
}

function printReport(k) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`Fieldwork dispatch KPIs — ground truth (board day ${k.today}, SLA-soon ≤ ${k.slaSoon})`);
  console.log("  Definitions mirror proto/fieldwork.html — this is the number a proposal should show.\n");
  console.log("  headline");
  for (const [key, val] of Object.entries(k.totals)) console.log(`    ${pad(key + ":", 14)} ${val}`);
  console.log(`\n  by status:   ${Object.entries(k.byStatus).map(([s, n]) => `${s}=${n}`).join("  ")}`);
  console.log(`  by region:   ${Object.entries(k.byRegion).map(([s, n]) => `${s}=${n}`).join("  ")}`);
  console.log(`  by priority: ${Object.entries(k.byPriority).map(([s, n]) => `${s}=${n}`).join("  ")}`);
  console.log(`\n  today's load per region: ${Object.entries(k.todayLoad.perRegion).map(([s, n]) => `${s}=${n}`).join("  ")}  (scheduled today: ${k.todayLoad.scheduledToday})`);
  console.log(`  overdue ids:    ${k.overdueIds.join(", ")}`);
  console.log(`  unassigned ids: ${k.unassignedIds.join(", ")}`);
  console.log(`\n  machine-readable:\n${JSON.stringify(k)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const k = fieldworkKpis();
  if (process.argv.includes("--json")) console.log(JSON.stringify(k, null, 2));
  else printReport(k);
}
