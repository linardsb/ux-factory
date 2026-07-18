// tooling/drift-check.mjs — CI generator-drift gate (epic #1, ticket #9).
// Re-runs the repo-self-contained generators + validators; exits 1 on any drift or
// validation error. The CI-ified "full gate" (.claude/plans/epic-1-landing-plan.md L44).
// Repo contents ONLY — the company-projection chain (build.mjs, gen-decisions/tokens/llms/
// headers, inject-jsonld) needs the sibling jobs folder + a decisions ledger and is NOT
// covered here. Standalone:  node tooling/drift-check.mjs
// Requires tooling/style-dictionary/node_modules (gen-handoff child-process-invokes SD).

import { readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { genTokenCss } from "../agent-layer/gen-token-css.mjs";
import { genHandoff } from "../agent-layer/gen-handoff.mjs";
import { genVocabulary } from "../agent-layer/gen-vocabulary.mjs";
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

// 3. Handoff/vocabulary drift — these generators WRITE under handoff/ (deterministic), then
// git porcelain (not `git diff`: porcelain also lists a newly-emitted untracked file). Scoped
// to handoff/ — the only tree these three generators write.
function checkHandoff() {
  genHandoff();
  genVocabulary();
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    checkSyntax();
    checkTokenCss();
    checkHandoff();
    checkScenarios();
    checkTraces();
    console.log("drift-check     ✓  syntax · token-css · handoff · scenarios · traces");
  } catch (e) {
    console.error("drift ✗  " + e.message);
    process.exit(1);
  }
}
