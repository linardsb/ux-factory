// tooling/audit-delta.mjs — the dependency-advisory DELTA gate (ticket #387, S2).
// Compares the npm advisory set between a base ref and the working tree, per dependency-carrying
// directory, and exits 1 naming every advisory ID head carries that base did not. A DELTA, not a
// severity gate: the pre-existing tooling/style-dictionary advisories are build-time, known and
// accepted, so a fail-on-severity check would block every PR forever and get switched off.
//
// The surface is DISCOVERED from tracked lockfiles on both sides, never hardcoded — a hand-kept
// list with no gate is how a future tooling/<new>/ goes silently unaudited while the check stays
// green. Both sides are unioned so a directory added OR removed by the PR is still compared.
//
// No --omit=dev, deliberately: tooling/visual-regression carries ONLY devDependencies
// (@playwright/test), so --omit=dev would audit nothing there — a vacuous check by construction.
// Every dependency in this repo is build-time by rule (shipped pages carry none), so the prod/dev
// split has no meaning here, and the numbers are identical either way (observed at #387).
//
// Fails CLOSED: an unusable audit on either side throws naming the directory and the side, rather
// than yielding an empty set and passing vacuously.
// Standalone:  node tooling/audit-delta.mjs <base-ref>

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["package.json", "package-lock.json"];

// Every directory that carries a lockfile, at a given ref.
const dirsAt = (ref) =>
  execFileSync("git", ["ls-files", "--with-tree", ref, "*package-lock.json"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((f) => dirname(f));

// The advisory IDs npm reports for a directory holding only package.json + package-lock.json.
// npm audit exits 1 when it finds anything, so read stdout regardless of status — and treat
// unparseable output as an error, never as "no advisories".
function advisoryIds(dir, label) {
  const run = spawnSync("npm", ["audit", "--json"], { cwd: dir, encoding: "utf8" });
  let parsed;
  try {
    parsed = JSON.parse(run.stdout);
  } catch {
    throw new Error(`audit-delta: npm audit produced no JSON for ${label} — ${(run.stderr || "").trim().split("\n")[0] || "no stderr"}`);
  }
  if (!parsed || typeof parsed.vulnerabilities !== "object" || parsed.vulnerabilities === null)
    throw new Error(`audit-delta: npm audit JSON for ${label} has no vulnerabilities key — the audit did not run`);
  const ids = new Map();
  for (const [pkg, v] of Object.entries(parsed.vulnerabilities)) {
    // A `via` entry that is a string names a parent package, not an advisory.
    for (const via of v.via || []) {
      if (typeof via === "object" && typeof via.source === "number")
        ids.set(via.source, { pkg, severity: via.severity || v.severity, title: via.title || "" });
    }
  }
  return ids;
}

// Materialise one side into a fresh temp dir. `git show` exits 128 when the path is absent at the
// ref — a directory the PR adds — which means an EMPTY base set, said out loud.
function materialise(dir, ref, label) {
  const tmp = mkdtempSync(join(tmpdir(), "audit-delta-"));
  // The head side decides for BOTH files AT ONCE, above the loop. Deciding per file reads a
  // directory that still carries package.json but lost its lockfile as "removed" and contributes
  // zero advisories — the vacuous pass this file's header forbids, produced by a `.gitignore` line
  // plus `git rm --cached` that looks like housekeeping in a diff. Half present is unauditable, so
  // it throws.
  if (ref === null) {
    const present = FILES.filter((f) => existsSync(join(ROOT, dir, f)));
    if (present.length === 0) return null;
    if (present.length !== FILES.length)
      throw new Error(
        `audit-delta: ${dir} (head) carries ${present.join(" + ")} but not ` +
          `${FILES.filter((f) => !present.includes(f)).join(", ")} — cannot audit, refusing to read it as removed`,
      );
    for (const f of FILES) copyFileSync(join(ROOT, dir, f), join(tmp, f));
    return tmp;
  }
  // The base side stays per file: `git show`'s 128 over-reports "absent" when only one file is
  // missing at the ref, which reads every advisory the directory carries as NEW — the safe direction.
  for (const f of FILES) {
    const show = spawnSync("git", ["show", `${ref}:${dir}/${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (show.status === 128) return null;
    if (show.status !== 0) throw new Error(`audit-delta: git show ${ref}:${dir}/${f} failed (${label}) — ${(show.stderr || "").trim()}`);
    writeFileSync(join(tmp, f), show.stdout);
  }
  return tmp;
}

const sideIds = (dir, ref, label) => {
  const tmp = materialise(dir, ref, label);
  return tmp === null ? null : advisoryIds(tmp, label);
};

// Returns [{ dir, baseCount, headCount, added: [{ id, pkg, severity, title }] }].
export function auditDelta(baseRef) {
  const dirs = [...new Set([...dirsAt(baseRef), ...dirsAt("HEAD")])].sort();
  if (!dirs.length) throw new Error("audit-delta: no tracked package-lock.json found at either ref — fix tooling/audit-delta.mjs");
  console.log(`audit-delta: comparing ${baseRef} → working tree across ${dirs.length} directories: ${dirs.join(", ")}`);
  return dirs.map((dir) => {
    const base = sideIds(dir, baseRef, `${dir} (base ${baseRef})`);
    const head = sideIds(dir, null, `${dir} (head)`);
    if (base === null) console.log(`  ${dir}: absent at base — every advisory it carries reads as new`);
    if (head === null) console.log(`  ${dir}: absent at head — removed by this change`);
    const baseIds = base ?? new Map();
    const headIds = head ?? new Map();
    const added = [...headIds].filter(([id]) => !baseIds.has(id)).map(([id, meta]) => ({ id, ...meta }));
    console.log(`  ${dir}: base ${baseIds.size} advisories, head ${headIds.size}, new ${added.length}`);
    return { dir, baseCount: baseIds.size, headCount: headIds.size, added };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error("audit-delta ✗  usage: node tooling/audit-delta.mjs <base-ref>");
    process.exit(1);
  }
  try {
    const results = auditDelta(baseRef);
    const red = results.filter((r) => r.added.length);
    if (red.length) {
      for (const r of red)
        for (const a of r.added) console.error(`audit-delta ✗  ${r.dir}: new advisory ${a.id} — ${a.pkg} (${a.severity}) ${a.title}`);
      process.exit(1);
    }
    console.log("audit-delta     ✓  no advisory ID present at head that the base did not carry");
  } catch (e) {
    console.error("audit-delta ✗  " + e.message);
    process.exit(1);
  }
}
