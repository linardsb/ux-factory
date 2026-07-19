// gen-company-package.mjs — brief → scenario-package compiler (epic #38, ticket #39).
// Governing doc: docs/epics/per-company-brief.architecture.md §Recommended approach
// (capability 2: "Brief → package generator (deterministic)") + §Boundaries (privacy,
// honesty labeling). Compiles ONE company-brief record into the exact scenarios/<slug>/
// package shape everything downstream already consumes — no engine changes.
//
// Deterministic: no Agent SDK, no derivation. Screenshot → pack derivation is ticket #40;
// this generator only emits the axes block verbatim and copies an optional pre-existing
// publishedTokens CSS through as a referenced file (the "token-pack reference").
//
// Privacy boundary (hard): a real-provenance package (fictional: false) may NEVER be written
// inside this public repo — the guard below refuses it before any filesystem write. Real
// packages compile to the jobs-folder build target; only fictional fixtures live here.
//
// Standalone (run from the jobs folder — input paths resolve from cwd; --out is REQUIRED):
//   node agent-layer/gen-company-package.mjs <brief.md> --out <dir>

import { mkdirSync, writeFileSync, readdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import path, { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCompanyBrief } from "./lib.mjs";
import { validatePackage } from "../scenarios/validate.mjs";

// Module-relative (NOT cwd): the repo root the privacy guard forbids real packages inside.
// agent-layer/.. = repo root. cwd is the jobs folder at runtime, so this must not use it.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The canonical 8-question skeleton. Verified identical (stage/question/asked/bounds) across
// scenarios/verdant + scenarios/fieldwork — only default/reasoning/axes are per-company. So the
// compiler OWNS the structural fields and the brief carries only the 8 (default, reasoning)
// pairs; this is what makes "consumable unchanged by the wizard shape" guaranteed, not hoped-for.
const QUESTION_CANON = [
  { id: "problem",          stage: "discovery",   asked: false, bounds: null,
    question: "What problem are users solving with your product?" },
  { id: "current-solution", stage: "discovery",   asked: false, bounds: null,
    question: "How do they solve it today, and why does that need replacing?" },
  { id: "named-user",       stage: "discovery",   asked: false, bounds: null,
    question: "Who exactly is the user — can you name a real person who needs this?" },
  { id: "target-behavior",  stage: "behaviour",   asked: true,  bounds: ["multiple-daily", "daily", "weekly", "monthly", "rarely"],
    question: "What's the one behavior you want to become routine? How often would it realistically occur?" },
  { id: "internal-trigger", stage: "behaviour",   asked: true,  bounds: null,
    question: "5 Whys: what emotion or moment actually cues that behavior?" },
  { id: "friction",         stage: "friction",    asked: false, bounds: ["time", "money", "effort", "confusion", "social deviance", "novelty"],
    question: "From trigger to payoff, how many steps? Which of time / money / effort / confusion / social deviance / novelty limits users most?" },
  { id: "success-signals",  stage: "success",     asked: false, bounds: null,
    question: "What early signal would prove it's working, and what slower outcome sits behind it?" },
  { id: "ethics-gate",      stage: "ethics-gate", asked: true,  bounds: null,
    question: "Does it materially improve users' lives — and would you use it yourself?" },
];

const BRIEF_SECTIONS = ["Product", "Users", "Problem", "Behaviour model", "Ethics position"];

// Compile briefPath → a valid scenarios/<slug>/ package under outDir/<slug>. Self-validates the
// emitted package (throws + discards it on failure). Returns package stats. `outDir` and the
// brief path resolve from cwd; REPO_ROOT (the privacy boundary) resolves from this module.
export function genCompanyPackage({ briefPath, outDir }) {
  const { head, sections, dir } = parseCompanyBrief(briefPath);
  const outAbs = path.resolve(outDir, head.slug);

  // Privacy guard (mirrors portal/server.mjs containment, inverted) — BEFORE any write.
  // `+ path.sep` so a sibling like ../ux-factory-real/ is not false-blocked.
  if (head.fictional === false && (outAbs === REPO_ROOT || outAbs.startsWith(REPO_ROOT + path.sep)))
    throw new Error(`gen-company-package: refusing to write real-brand package "${head.slug}" inside the public repo (${outAbs}) — real packages compile to the jobs-folder build target (privacy boundary, per-company-brief.architecture.md §Boundaries)`);

  // Overwrite in place (the writeFileSync/copyFileSync below), do NOT pre-clear the directory:
  // an unconditional recursive delete of a user-supplied outDir/<slug> is a footgun — a mistyped
  // --out or a slug colliding with an existing directory would erase it (e.g. `--out .` + a slug
  // of "system"). A stale orphan fixture left by a prior run instead surfaces as a named
  // validatePackage error, not silent data loss. `preexisting` gates the failure cleanup below.
  const preexisting = existsSync(outAbs);
  mkdirSync(join(outAbs, "fixtures"), { recursive: true }); // recursive creates outAbs too

  // intake.defaults.json — the compiler's canon skeleton + the brief's per-question deltas.
  const questions = QUESTION_CANON.map((q) => ({
    id: q.id,
    stage: q.stage,
    question: q.question,
    default: head.intake[q.id].default,
    reasoning: head.intake[q.id].reasoning,
    bounds: q.bounds,
    asked: q.asked,
  }));
  writeFileSync(join(outAbs, "intake.defaults.json"), JSON.stringify({ questions, axes: head.axes }, null, 2) + "\n");

  // copy.json — content essentials + the provenance-appropriate honesty surface.
  const copy = {
    tagline: head.copy.tagline,
    ethicsReveal: head.copy.ethicsReveal,
    ...(head.copy.stations && { stations: head.copy.stations }),
    ...(head.copy.prototype && { prototype: head.copy.prototype }),
  };
  if (head.fictional === false) {
    copy.speculativeNotice = head.copy.speculativeNotice
      || `Speculative work based on ${head.name}'s public statements. Sources linked below. Not affiliated with or endorsed by ${head.name}.`;
    copy.sources = head.sources;
  } else {
    copy.fictionalNotice = head.copy.fictionalNotice
      || `${head.name} is a fictional product, invented for this demonstration. No real company, users, or data are involved.`;
  }
  writeFileSync(join(outAbs, "copy.json"), JSON.stringify(copy, null, 2) + "\n");

  // proto.config.json — screens verbatim; slots stay empty (agentic slots are #8/#13's job).
  writeFileSync(join(outAbs, "proto.config.json"), JSON.stringify({ screens: head.screens, slots: [] }, null, 2) + "\n");

  // brief.md (lean) — the machine head the scenario contract requires + the five prose sections,
  // re-emitted in canonical order (bodies guaranteed present by parseCompanyBrief).
  const leanHead = { slug: head.slug, name: head.name, fictional: head.fictional, domain: head.domain, oneLiner: head.oneLiner, today: head.today };
  const byTitle = Object.fromEntries(sections.map((s) => [s.title, s.body]));
  const prose = BRIEF_SECTIONS.map((t) => `## ${t}\n\n${byTitle[t]}`).join("\n\n");
  writeFileSync(join(outAbs, "brief.md"), "```json\n" + JSON.stringify(leanHead, null, 2) + "\n```\n\n" + prose + "\n");

  // fixtures — copy every sibling fixtures/*.json through byte-for-byte. A missing source dir is
  // left for validatePackage to report precisely (which collection is unbacked) and fail.
  const fixturesSrc = join(dir, "fixtures");
  if (existsSync(fixturesSrc))
    for (const f of readdirSync(fixturesSrc))
      if (f.endsWith(".json")) copyFileSync(join(fixturesSrc, f), join(outAbs, "fixtures", f));

  // token-pack reference (optional) — copy a pre-existing published-tokens CSS through verbatim.
  // No derivation here (that is #40); this is the copy-through the ticket scopes.
  if (head.publishedTokens)
    copyFileSync(join(dir, head.publishedTokens), join(outAbs, head.publishedTokens));

  // Self-validate the emitted package by path. A throw means it is not a valid package, so
  // discard the output — never leave a half-written package on disk (critical for a real compile
  // into the jobs folder). per-company-brief.architecture.md §Boundaries. But only remove a
  // directory THIS compile created: if outAbs pre-existed we merely wrote into it, and its prior
  // contents may predate us — leave them for the operator to inspect/restore rather than delete.
  let valid;
  try {
    valid = validatePackage(outAbs, head.slug);
  } catch (e) {
    if (!preexisting) rmSync(outAbs, { recursive: true, force: true });
    throw e;
  }

  return {
    slug: head.slug,
    outAbs,
    provenance: head.fictional ? "fictional" : "real",
    tokens: head.publishedTokens || null,
    ...valid, // { slug, verdict, questions, collections, records }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const briefPath = process.argv[2];
    const outIdx = process.argv.indexOf("--out");
    const outDir = outIdx !== -1 ? process.argv[outIdx + 1] : null;
    // --out is REQUIRED: there is no safe repo-relative default for a real package.
    if (!briefPath || !outDir)
      throw new Error(`usage: node agent-layer/gen-company-package.mjs <brief.md> --out <dir>  (--out is required — a real package must never default anywhere near the repo)`);
    const r = genCompanyPackage({ briefPath, outDir });
    console.log(`company package ${r.slug.padEnd(10)} ✓  ${r.provenance} · ${r.questions} questions · ${r.collections} collections · ${r.records} records${r.tokens ? " · pack " + r.tokens : ""} → ${r.outAbs}`);
  } catch (e) {
    console.error(`company package ✗  ${e.message}`);
    process.exit(1);
  }
}
