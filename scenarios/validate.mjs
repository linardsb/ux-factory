// scenarios/validate.mjs — hand validator for scenario packages (epic #1, ticket #4).
// Format contract: scenarios/README.md; architecture §Data model (Scenario package).
// No schema library (project rule): boundary checks by hand, every throw names the
// offending file and field. Axes vocabularies mirror the derivation engine's input
// contract (#3) so packages and engine can't drift apart silently.
// Standalone:  node scenarios/validate.mjs   — one ✓ line per package, exit 1 on failure.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const QUESTION_IDS = [
  "problem", "current-solution", "named-user", "target-behavior",
  "internal-trigger", "friction", "success-signals", "ethics-gate",
];
const BRIEF_SECTIONS = ["Product", "Users", "Problem", "Behaviour model", "Ethics position"];
const AXES = {
  density: ["compact", "comfortable", "spacious"],
  rewardType: ["tribe", "hunt", "self"],
  frequency: ["multiple-daily", "daily", "weekly", "monthly", "rarely"],
};

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const isoDay = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // Guard getTime() before toISOString(): a well-formatted but out-of-range value
  // (month 13, day 32) yields an Invalid Date, and toISOString() would throw an
  // unnamed RangeError instead of returning false — the caller's named error is the
  // contract. The round-trip equality still rejects rollovers (Feb 30 → Mar 2).
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: ${e.message}`);
  }
}

// ---- per-file checks -------------------------------------------------------

function checkBrief(dir, slug) {
  const path = join(dir, "brief.md");
  const text = readFileSync(path, "utf8");
  const fence = text.match(/```json\s*\n([\s\S]*?)\n```/); // same fence family as agent-layer/lib.mjs
  if (!fence) throw new Error(`${path}: no \`\`\`json head found`);
  let head;
  try {
    head = JSON.parse(fence[1]);
  } catch (e) {
    throw new Error(`${path}: json head — ${e.message}`);
  }
  if (head.slug !== slug) throw new Error(`${path}: head slug "${head.slug}" ≠ directory "${slug}"`);
  if (head.fictional !== true) throw new Error(`${path}: head must declare "fictional": true (honesty contract)`);
  for (const k of ["name", "domain", "oneLiner"])
    if (!nonEmpty(head[k])) throw new Error(`${path}: head "${k}" is missing or empty`);
  if (!isoDay(head.today)) throw new Error(`${path}: head "today" ("${head.today}") is not a YYYY-MM-DD date`);
  for (const s of BRIEF_SECTIONS)
    if (!new RegExp(`^## ${s}\\s*$`, "m").test(text)) throw new Error(`${path}: missing "## ${s}" section`);
  return head;
}

function checkIntake(dir) {
  const path = join(dir, "intake.defaults.json");
  const data = readJson(path);
  const qs = data.questions;
  if (!Array.isArray(qs)) throw new Error(`${path}: "questions" is not an array`);
  const ids = qs.map((q) => q.id);
  for (const id of QUESTION_IDS)
    if (!ids.includes(id)) throw new Error(`${path}: missing question "${id}" (the 8 PRD ids are fixed)`);
  for (const q of qs) {
    if (!QUESTION_IDS.includes(q.id)) throw new Error(`${path}: unknown question id "${q.id}"`);
    for (const k of ["question", "default", "reasoning"])
      if (!nonEmpty(q[k])) throw new Error(`${path}: question "${q.id}" has empty "${k}" — the wizard shows the default AND why`);
    if (typeof q.asked !== "boolean") throw new Error(`${path}: question "${q.id}" — "asked" must be boolean`);
    if (q.bounds !== null && !Array.isArray(q.bounds)) throw new Error(`${path}: question "${q.id}" — "bounds" must be an array or null`);
  }
  if (ids.length !== QUESTION_IDS.length) throw new Error(`${path}: expected exactly ${QUESTION_IDS.length} questions, got ${ids.length}`);

  const axes = data.axes;
  if (!axes || typeof axes !== "object") throw new Error(`${path}: missing "axes" block`);
  if (!/^#[0-9a-fA-F]{6}$/.test(axes.brandColor ?? ""))
    throw new Error(`${path}: axes.brandColor "${axes.brandColor}" is not a #rrggbb hex`);
  for (const [axis, allowed] of Object.entries(AXES))
    if (!allowed.includes(axes[axis]))
      throw new Error(`${path}: axes.${axis} "${axes[axis]}" not in [${allowed.join(", ")}] (engine contract, #3)`);
  for (const k of ["improvesLives", "wouldUseIt"])
    if (k in axes && typeof axes[k] !== "boolean") throw new Error(`${path}: axes.${k} must be boolean when present`);
  return data;
}

function checkCopy(dir) {
  const path = join(dir, "copy.json");
  const copy = readJson(path);
  if (!nonEmpty(copy.fictionalNotice))
    throw new Error(`${path}: "fictionalNotice" is missing or empty (honesty surface #1)`);
  if (!/fiction/i.test(copy.fictionalNotice))
    throw new Error(`${path}: "fictionalNotice" must actually say the scenario is fictional`);
  if (!nonEmpty(copy.ethicsReveal?.verdict) || !nonEmpty(copy.ethicsReveal?.narrative))
    throw new Error(`${path}: "ethicsReveal" needs non-empty "verdict" and "narrative"`);
  return copy;
}

function checkFixtures(dir) {
  const path = join(dir, "proto.config.json");
  const proto = readJson(path);
  if (!Array.isArray(proto.screens) || proto.screens.length === 0)
    throw new Error(`${path}: "screens" must be a non-empty array`);
  if (!Array.isArray(proto.slots)) throw new Error(`${path}: "slots" must be an array (may be empty)`);

  const collections = {}; // name -> records
  for (const screen of proto.screens) {
    for (const k of ["id", "title"])
      if (!nonEmpty(screen[k])) throw new Error(`${path}: screen missing "${k}"`);
    if (!Array.isArray(screen.collections) || screen.collections.length === 0)
      throw new Error(`${path}: screen "${screen.id}" has no collections`);
    for (const name of screen.collections) {
      if (Object.hasOwn(collections, name)) continue; // hasOwn: a collection named "toString" must not hit a proto member (cf. worker/api.mjs)
      const fpath = join(dir, "fixtures", `${name}.json`);
      if (!existsSync(fpath)) throw new Error(`${path}: screen "${screen.id}" names collection "${name}" but ${fpath} does not exist`);
      const records = readJson(fpath);
      if (!Array.isArray(records) || records.length === 0)
        throw new Error(`${fpath}: must be a non-empty array of records`);
      const seen = new Set();
      for (const r of records) {
        if (typeof r !== "object" || r === null || !nonEmpty(r.id))
          throw new Error(`${fpath}: every record needs a non-empty string "id"`);
        if (seen.has(r.id)) throw new Error(`${fpath}: duplicate id "${r.id}"`);
        seen.add(r.id);
      }
      collections[name] = records;
    }
  }

  // Walk every record: <thing>Id fields resolve against a collection whose name starts
  // with <thing>; every YYYY-MM-DD-shaped string is a real calendar date.
  const idsFor = (thing) => {
    const names = Object.keys(collections).filter((n) => n.startsWith(thing));
    return names.length ? new Set(names.flatMap((n) => collections[n].map((r) => r.id))) : null;
  };
  const walk = (node, fpath, at) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, fpath, `${at}[${i}]`));
    if (typeof node === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(node) && !isoDay(node.slice(0, 10)))
        throw new Error(`${fpath}: ${at} "${node}" is not a real calendar date`);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    for (const [k, v] of Object.entries(node)) {
      const ref = k.match(/^([a-z]+)Id$/);
      if (ref && v !== null) {
        const ids = idsFor(ref[1]);
        if (ids && !ids.has(v)) throw new Error(`${fpath}: ${at}.${k} "${v}" resolves to no record`);
      }
      walk(v, fpath, `${at}.${k}`);
    }
  };
  for (const [name, records] of Object.entries(collections))
    walk(records, join(dir, "fixtures", `${name}.json`), name);

  return collections;
}

// ---- per-scenario coherence (optional entry per slug — a third scenario without one
// still gets every generic check above) ------------------------------------------

const COHERENCE = {
  verdant({ dir, head, collections }) {
    const today = head.today;
    const byId = Object.fromEntries(collections.plants.map((p) => [p.id, p]));
    for (const p of collections.plants) {
      if (!(p.lastWatered <= today))
        throw new Error(`${dir}/fixtures/plants.json: ${p.id} lastWatered ${p.lastWatered} is after today (${today})`);
      if (p.lastWatered < addDays(today, -45))
        throw new Error(`${dir}/fixtures/plants.json: ${p.id} lastWatered ${p.lastWatered} is implausibly old (today ${today})`);
    }
    for (const t of collections["care-tasks"]) {
      if (t.type === "water") {
        const p = byId[t.plantId];
        const expected = addDays(p.lastWatered, p.wateringIntervalDays);
        if (t.due !== expected)
          throw new Error(`${dir}/fixtures/care-tasks.json: ${t.id} due ${t.due} ≠ ${p.id} lastWatered + interval (${expected})`);
      }
      if (t.due < addDays(today, -30) || t.due > addDays(today, 60))
        throw new Error(`${dir}/fixtures/care-tasks.json: ${t.id} due ${t.due} outside the plausible window around ${today}`);
      // Contract-promised fields (#8): the API serves what the DataContracts describe —
      // plantName denormalised, status derived from due vs the fixed fictional today.
      if (t.plantName !== byId[t.plantId].name)
        throw new Error(`${dir}/fixtures/care-tasks.json: ${t.id} plantName "${t.plantName}" ≠ ${t.plantId}'s name "${byId[t.plantId].name}"`);
      const expectedStatus = t.done ? "ok" : t.due < today ? "overdue" : t.due === today ? "due" : "ok";
      if (t.status !== expectedStatus)
        throw new Error(`${dir}/fixtures/care-tasks.json: ${t.id} status "${t.status}" ≠ "${expectedStatus}" (due ${t.due}, done ${t.done}, today ${today})`);
    }
    const sev = { ok: 0, due: 1, overdue: 2 };
    for (const p of collections.plants) {
      const open = collections["care-tasks"].filter((t) => t.plantId === p.id && !t.done);
      const worst = open.reduce((w, t) => (sev[t.status] > sev[w] ? t.status : w), "ok");
      if (p.status !== worst)
        throw new Error(`${dir}/fixtures/plants.json: ${p.id} status "${p.status}" ≠ worst open task status "${worst}"`);
    }
    for (const r of collections.readings) {
      if (!["moisture", "light"].includes(r.kind))
        throw new Error(`${dir}/fixtures/readings.json: ${r.id} kind "${r.kind}" not in [moisture, light]`);
      if (typeof r.value !== "number" || !nonEmpty(r.unit) || !nonEmpty(r.label))
        throw new Error(`${dir}/fixtures/readings.json: ${r.id} needs numeric value + non-empty unit and label`);
    }
  },
  fieldwork({ dir, head, collections }) {
    const today = head.today;
    for (const j of collections.jobs) {
      const startDay = j.scheduledStart.slice(0, 10);
      if (startDay < addDays(today, -14) || startDay > addDays(today, 14))
        throw new Error(`${dir}/fixtures/jobs.json: ${j.id} scheduledStart ${startDay} outside ±14d of today (${today})`);
      if ((j.status === "done") !== (j.completedAt !== null))
        throw new Error(`${dir}/fixtures/jobs.json: ${j.id} status "${j.status}" inconsistent with completedAt ${j.completedAt}`);
      if (j.status === "overdue" && !(j.slaDue < today))
        throw new Error(`${dir}/fixtures/jobs.json: ${j.id} is "overdue" but slaDue ${j.slaDue} has not lapsed (today ${today})`);
      if (!["urgent", "priority", "routine"].includes(j.priority))
        throw new Error(`${dir}/fixtures/jobs.json: ${j.id} priority "${j.priority}" not in [urgent, priority, routine]`);
    }
    for (const s of collections.schedule)
      if (s.date < today || s.date > addDays(today, 7))
        throw new Error(`${dir}/fixtures/schedule.json: ${s.id} date ${s.date} outside the board window (today ${today})`);
    // The dispatch board's "Needs assignment" panel (#8) must never be able to go silently empty.
    if (!collections.jobs.some((j) => j.techId === null))
      throw new Error(`${dir}/fixtures/jobs.json: no unassigned job (techId null) — the board's Needs-assignment panel needs at least one`);
  },
};

// ---- entry -----------------------------------------------------------------

export function validateScenarios() {
  const registryPath = join(ROOT, "index.json");
  const registry = readJson(registryPath);
  if (!Array.isArray(registry.scenarios) || registry.scenarios.length === 0)
    throw new Error(`${registryPath}: "scenarios" must be a non-empty array`);
  for (const k of ["prod", "local"])
    if (typeof registry.api?.[k] !== "string") throw new Error(`${registryPath}: api.${k} must be a string ("" allowed)`);

  const results = [];
  for (const { slug, name, label } of registry.scenarios) {
    if (!nonEmpty(slug) || !nonEmpty(name) || !nonEmpty(label))
      throw new Error(`${registryPath}: every scenario needs slug, name, label`);
    const dir = join(ROOT, slug);
    if (!existsSync(dir)) throw new Error(`${registryPath}: scenario "${slug}" has no ${dir} directory`);

    const head = checkBrief(dir, slug);
    const intake = checkIntake(dir);
    const copy = checkCopy(dir);
    const collections = checkFixtures(dir);
    COHERENCE[slug]?.({ dir, head, collections });

    results.push({
      slug,
      verdict: copy.ethicsReveal.verdict,
      questions: intake.questions.length,
      collections: Object.keys(collections).length,
      records: Object.values(collections).reduce((n, r) => n + r.length, 0),
    });
  }

  const verdicts = new Set(results.map((r) => r.verdict));
  if (verdicts.size < 2 && results.length > 1)
    throw new Error(`scenarios must rule differently at the ethics gate — all verdicts are "${results[0].verdict}" (epic #1: the deliberate contrast)`);

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const results = validateScenarios();
    for (const r of results)
      console.log(`scenario ${r.slug.padEnd(10)} ✓  ${r.questions} questions · ${r.collections} collections · ${r.records} records · verdict: ${r.verdict}`);
    console.log(`scenarios ${" ".repeat(9)} ✓  verdicts differ: ${results.map((r) => r.verdict).join(" vs ")}`);
  } catch (e) {
    console.error(`scenarios ✗  ${e.message}`);
    process.exit(1);
  }
}
