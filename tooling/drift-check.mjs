// tooling/drift-check.mjs — CI generator-drift gate (epic #1, ticket #9).
// Re-runs the repo-self-contained generators + validators; exits 1 on any drift or
// validation error. The CI-ified "full gate" (.claude/plans/epic-1-landing-plan.md L44).
// Repo contents ONLY — the company-projection chain (build.mjs, gen-decisions/tokens/llms/
// headers, inject-jsonld) needs the sibling jobs folder + a decisions ledger and is NOT
// covered here. Standalone:  node tooling/drift-check.mjs
// Requires tooling/style-dictionary/node_modules (gen-handoff child-process-invokes SD).

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { genTokenCss } from "../agent-layer/gen-token-css.mjs";
import { genAnnotatedSource } from "../agent-layer/gen-annotated-source.mjs";
import { genLocSummary } from "../agent-layer/gen-loc-summary.mjs";
import { genParamCount } from "../agent-layer/gen-param-count.mjs";
import { genSystemGraph } from "../agent-layer/gen-system-graph.mjs";
import { genInspectData } from "../agent-layer/gen-inspect-data.mjs";
import { genHandoff } from "../agent-layer/gen-handoff.mjs";
import { genVocabulary } from "../agent-layer/gen-vocabulary.mjs";
import { genPackBundle } from "../agent-layer/gen-pack-bundle.mjs";
import { genReplay } from "../agent-layer/gen-replay.mjs";
import { validateScenarios } from "../scenarios/validate.mjs";
import { validateTrace } from "./validate-trace.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Syntax — a broken generator would fail to import in the later steps anyway; catch it
// first with a clean per-file message. Every tracked .mjs (git ls-files) via `node --check`.
function checkSyntax() {
  const files = execFileSync("git", ["ls-files", "*.mjs"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const file of files) {
    try {
      execFileSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: "pipe" });
    } catch (e) {
      throw new Error(`syntax error in ${file} (node --check failed):\n${e.stderr}`);
    }
  }
}

// 2. Token CSS drift — check mode writes nothing; compares in-memory regen against disk.
function checkTokenCss() {
  const r = genTokenCss({ check: true });
  if (r.drifted.length)
    throw new Error(
      `token CSS drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-token-css.mjs`
    );
}

// 2b. Annotated-source drift — check mode writes nothing; compares in-memory regen vs disk.
function checkAnnotatedSource() {
  const r = genAnnotatedSource({ check: true });
  if (r.drifted.length)
    throw new Error(
      `annotated-source drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-annotated-source.mjs`
    );
}

// 2c. Loc-summary drift — check mode writes nothing; compares in-memory regen vs disk.
function checkLocSummary() {
  const r = genLocSummary({ check: true });
  if (r.drifted.length)
    throw new Error(
      `loc-summary drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-loc-summary.mjs`
    );
}

// 2c2. Param-count drift — check mode writes nothing; compares in-memory regen vs disk.
function checkParamCount() {
  const r = genParamCount({ check: true });
  if (r.drifted.length)
    throw new Error(
      `param-count drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-param-count.mjs`
    );
}

// 2d. System-graph drift — check mode writes nothing; compares in-memory regen vs disk.
function checkSystemGraph() {
  const r = genSystemGraph({ check: true });
  if (r.drifted.length)
    throw new Error(
      `system-graph drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-system-graph.mjs`
    );
}

// 2e. Inspect-data drift — check mode writes nothing; compares in-memory regen vs disk.
function checkInspectData() {
  const r = genInspectData({ check: true });
  if (r.drifted.length)
    throw new Error(
      `inspect-data drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-inspect-data.mjs`
    );
}

// 2f. Inspect mounts — every data-inspect="<id>" in tracked HTML must resolve in
// system/inspect-data.json. inspect.mjs's own unknown-id throw only fires when a reader
// toggles inspect on, so without this a future mount ticket shipping a typo'd id would
// pass CI green and break only for readers with inspect persisted on.
function checkInspectMounts() {
  const ids = new Set(
    JSON.parse(readFileSync(join(ROOT, "system/inspect-data.json"), "utf8")).components.map(
      (c) => c.id
    )
  );
  const pages = execFileSync("git", ["ls-files", "*.html"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const page of pages) {
    const html = readFileSync(join(ROOT, page), "utf8");
    for (const [, id] of html.matchAll(/data-inspect="([^"]*)"/g))
      if (!ids.has(id))
        throw new Error(
          `inspect mount drift: ${page} carries data-inspect="${id}" but system/inspect-data.json has no such component`
        );
  }
}

// 3. Handoff/vocabulary drift — these generators WRITE under handoff/ (deterministic), then
// git porcelain (not `git diff`: porcelain also lists a newly-emitted untracked file). Scoped
// to handoff/ — the only tree these three generators write.
function checkHandoff() {
  genHandoff();
  genVocabulary();
  genPackBundle(); // bundles the two above — must run last, must be deterministic
  const out = execFileSync("git", ["status", "--porcelain", "--", "handoff/"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (out.trim())
    throw new Error(
      "handoff/ drift after regeneration — commit the regenerated pack:\n" + out
    );
}

// 4. Scenarios — throws on failure, naming the offending fixture/registry path.
function checkScenarios() {
  validateScenarios();
}

// 5. Traces — every committed traces/*.jsonl through the Trace-format validator (throws).
function checkTraces() {
  const dir = join(ROOT, "traces");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort())
    validateTrace(join(dir, f));
}

// 6. Replay artifacts — check mode writes nothing; compares in-memory regen vs disk. Runs AFTER
// checkTraces on purpose: a replay artifact projected from a trace that does not validate is
// meaningless, so the trace gate should be the one that reports first. It also refuses an ORPHANED
// artifact (a replay/<slug>.json with no board behind it) and re-runs the reproduce check, so a
// hand-edited board or op lands here as drift rather than as a quiet lie.
function checkReplay() {
  const r = genReplay({ check: true });
  if (r.drifted.length)
    throw new Error(
      `replay drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-replay.mjs`
    );
}

// 7. Group-count drift — build-checks' own pass line, CLAUDE.md's map and gates.md all state a group
// count, and all three have gone stale behind a ticket that added a group. Two figures are read from the
// source: the number of group("…") CALLS and the number of DISTINCT names. A group called from both arms
// of an if/else is one group, so the two differ by exactly the known duplicates — counting distinct names
// alone would miss a new group that REUSES an existing name, which is the cheapest way for this leg to go
// hollow. Each claim is its own row: folding two claims into one alternation hides the loss of either.
// Anyone making the ✓ line self-computing must drop its row from `claims` in the same edit.
function checkGroupCount() {
  const src = readFileSync(join(ROOT, "tooling/build-checks.mjs"), "utf8");
  const calls = [...src.matchAll(/group\s*\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
  const n = new Set(calls).size;
  const DUPES = ["parenting"]; // called from both arms of one if/else
  const claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  const claims = [
    ["tooling/build-checks.mjs", src, /all (\d+) groups pass/g],
    ["CLAUDE.md (architecture map)", claude, /(\d+) PURE groups/g],
    ["CLAUDE.md (on-demand context)", claude, /build-checks' (\d+) groups/g],
    [".claude/references/gates.md", readFileSync(join(ROOT, ".claude/references/gates.md"), "utf8"), /(\d+) pure groups/g],
  ];
  const stale = [];
  if (calls.length - DUPES.length !== n)
    stale.push(
      `tooling/build-checks.mjs: ${calls.length} group() calls, ${n} distinct names, ${DUPES.length} known duplicate (${DUPES.join(", ")}) — a new group reused an existing name, or a duplicate went away; update DUPES`
    );
  for (const [file, text, re] of claims) {
    const found = [...text.matchAll(re)].map((m) => Number(m[1]));
    if (!found.length) stale.push(`${file}: states no group count (the claim was reworded — re-pin this leg)`);
    for (const c of found) if (c !== n) stale.push(`${file}: says ${c} groups, build-checks defines ${n}`);
  }
  if (stale.length) throw new Error(`group-count drift: ${stale.join("; ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    checkSyntax();
    checkTokenCss();
    checkAnnotatedSource();
    checkLocSummary();
    checkParamCount();
    checkSystemGraph();
    checkInspectData();
    checkInspectMounts();
    checkHandoff();
    checkScenarios();
    checkTraces();
    checkReplay();
    checkGroupCount();
    console.log("drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count");
  } catch (e) {
    console.error("drift ✗  " + e.message);
    process.exit(1);
  }
}
