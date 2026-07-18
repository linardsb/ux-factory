# Feature: CI verification gates — drift-check + token lint (ticket #9, scoped)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Two hand-rolled, zero-dependency Node scripts plus one GitHub Actions workflow that turn ticket #9's "drift-proof" claim from a statement into a demonstrated, running gate:

- **`tooling/drift-check.mjs`** — the CI-ified version of the landing plan's "full gate". Re-runs the repo-self-contained generators and validators and fails on any divergence from the committed artifacts (or any validation error).
- **`tooling/token-lint.mjs`** — three token-contract checks: every token `components.css` references is declared in `tokens.contract.css` (undeclared), every contract token is referenced by some shipped/proto surface (orphan), and the DTCG source is structurally valid.
- **`.github/workflows/verify.yml`** — runs both on push to `main` and on every PR, on Node 20, after installing the one dependency-carrying tool (Style Dictionary).

Each gate is itself portfolio evidence for a technical reader: the repo *proves* it can't silently drift, rather than asserting it.

## User Story

As a **technical hiring manager inspecting this repo**
I want **the "drift-proof design system" claim backed by a green CI gate that provably fails on hand-edited artifacts and contract violations**
So that **I can trust the generated outputs match their source without auditing every file by hand.**

(Secondary user: the repo author — the gate catches an un-regenerated artifact or an undeclared/orphan token before it lands, so the big UI tickets #10/#13/#14 are developed *under* the gate.)

## Problem Statement

The project deliberately has no test suite — generated artifacts (token CSS, the handoff pack, the vocabulary) and hand-maintained contracts (scenario fixtures, traces, the token contract) are verified only by running scripts manually. Nothing enforces on push/PR that:
1. A generated file was actually regenerated from its source (a hand-edit or a stale commit slips through).
2. `components.css` only references tokens the contract declares, and the contract carries no dead tokens.
3. The DTCG source is structurally valid.

Ticket #9 makes these the project's verification surface.

## Solution Statement

Wrap the already-green, already-deterministic "full gate" commands (verified below) into one `drift-check` orchestrator script, add a second `token-lint` script for the contract checks, and wire both into GitHub Actions. Reuse the existing exported functions (`genTokenCss`, `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace`, `loadSource`) rather than re-implementing anything — the scripts are thin orchestrators. Prove both token-lint failure modes and one intentional-drift diff once (recorded in the PR), then keep the gate green.

## Out of Scope / Non-Goals

- **Not included: visual-regression gate (Playwright screenshots + pixel-diff baselines).** This is the third of ticket #9's three gates. It is a materially different animal (browser binaries in CI, committed screenshot baselines under neutral + one client pack, pixel-diff tooling) and is **deferred to a follow-up ticket**. **Consequence: this plan does NOT close #9** — issue #9's visual-regression acceptance criteria stay open. The eventual PR must say `Part of #9`, **not** `Closes #9`.
- **Not covering the company-projection generators** (`gen-decisions`, `gen-tokens`, `gen-llms`, `gen-headers`, `inject-jsonld`, the `build.mjs` orchestrator). Those need the sibling **jobs folder + a decisions ledger** and cannot run in CI. The drift-check covers only the repo-self-contained chain (`gen-token-css`, `gen-handoff`, `gen-vocabulary`). This bound must be explicit in the script header so "drift-check" does not over-promise whole-agent-layer coverage.
- **Not changing** any generator, validator, token, spec, or fixture. The gate is additive; the tree is already green under it (verified). If implementing the gate surfaces a real drift/lint violation, **stop and flag it** — do not "fix" a generator to make the gate pass.
- **Not adding a runtime dependency to shipped pages or the agent-layer.** The gate scripts are zero-dep Node ESM. Style Dictionary stays confined to `tooling/style-dictionary/` (invoked as a child process by `gen-handoff`, exactly as today).
- **Not introducing a schema library** for the DTCG check — reuse `loadSource()` (project rule: hand-validate at the boundary).

## Feature Metadata

**Feature Type**: New Capability (verification infrastructure)
**Estimated Complexity**: Low–Medium (~200–300 loc across two scripts + a ~20-line workflow; all wrapped commands already verified green)
**Primary Systems Affected**: `tooling/` (two new scripts), `.github/workflows/` (new), no product code touched
**Dependencies**: `tooling/style-dictionary/` (existing; `style-dictionary@^4.4.0`, lockfile present) must be `npm ci`-installed in CI before drift-check. No new dependency added.

## Related Work

**Implements**: GitHub issue **#9** (partial — drift-check + token lint only) · **Epic**: #1 (`docs/epics/ai-first-ux-factory.architecture.md` §Other eng-lead calls, "Verification gates" added 2026-07-17)

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/epic-1-remaining-plan.md` (§Wave 1 — #9 CI gates) — Why: the source of this plan's scope; defines the three-gate split and the "develop the big UI tickets under the gate" sequencing rationale.
- `.claude/plans/epic-1-landing-plan.md` (line 44) — Why: the canonical **"full gate"** command list this drift-check CI-ifies verbatim.
- `.claude/plans/dtcg-inversion-token-source.md` — Why: established `gen-token-css.mjs --check` (in-memory regenerate → exit 1 on drift) as ticket #9's primary drift primitive; `loadSource()` is its boundary validator.
- `.claude/plans/handoff-data-layer.md` (line 445) & `.claude/plans/data-connected-prototypes.md` (line 125) — Why: proved `gen-handoff` output is byte-deterministic, so `git status` after a re-run is a valid drift check.

**Forward-references** (plans that extend/supersede this):

- (to create) `.claude/plans/visual-regression-gate.md` — the deferred third gate (Playwright); will close the remaining #9 ACs.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING!

- `agent-layer/gen-token-css.mjs` (whole file, ~158 lines) — Why: exports **`genTokenCss({ check })`** (drift primitive, `.drifted[]` names drifted files, writes nothing in check mode) and **`loadSource()`** (DTCG boundary validator — throws named Errors; the token-lint DTCG check reuses this). Note the `pathToFileURL` standalone-run guard idiom (lines 148–158) — mirror it in the new scripts.
- `.claude/plans/epic-1-landing-plan.md` (line 44) — Why: the exact "full gate" command sequence to wrap:
  `node agent-layer/gen-token-css.mjs --check` · `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && git diff --exit-code -- handoff/` · `node scenarios/validate.mjs` · `node tooling/validate-trace.mjs` · `node --check` on every touched `.mjs`.
- `agent-layer/gen-handoff.mjs` (lines 24–41) — Why: exports **`genHandoff()`**; it `execFileSync`s `tooling/style-dictionary/build-tokens.mjs` (needs `node_modules`) and **writes only under `handoff/`**; it deliberately never touches `figma-parity.json` (lines 5–7). Confirms the SD install requirement and the `handoff/` porcelain scope.
- `agent-layer/gen-vocabulary.mjs` (line 21) — Why: exports **`genVocabulary()`**; writes `handoff/verdant/vocabulary.json`.
- `scenarios/validate.mjs` (lines 248, 285–295) — Why: exports **`validateScenarios()`** (throws on failure, returns per-scenario results); the CLI block shows the ✓/✗ + `exit(1)` idiom to mirror.
- `tooling/validate-trace.mjs` (lines 20, 93–112) — Why: exports **`validateTrace(file)`** (throws on failure) and a `targets()` helper that defaults to every `traces/*.jsonl`; sibling script — the new scripts live beside it in `tooling/`.
- `system/tokens.contract.css` — Why: declares the **47 contract tokens** (`--name:` lines). The token-lint parses declarations from here (per the definition "declared in tokens.contract.css"). Line 46 (`--color-on-dark-border: color-mix(... var(--color-white) ...)`) is the contract self-reference that keeps `--color-white` non-orphan.
- `system/components.css` — Why: the strict-scope surface for the **undeclared** check; references 45 contract tokens, all declared (verified). Token discipline: a literal here is a bug (CLAUDE.md).
- `system/proto.css` (line 748, `box-shadow: var(--shadow-lg)`) — Why: the sole consumer of `--shadow-lg`; proves the orphan check must span proto surfaces, not just `components.css`.
- `CLAUDE.md` (Ground rules · Testing · "Deploy = commit the artifacts") — Why: no test suite by design; generated outputs are committed (never `.gitignore`d) — so `git status` drift-checking is valid and expected.

### New Files to Create

- `tooling/drift-check.mjs` — orchestrates the generator-drift + validator gate (repo-self-contained only).
- `tooling/token-lint.mjs` — the three token-contract checks.
- `.github/workflows/verify.yml` — runs both gates on push (`main`) + PR, Node 20, after `npm ci` in `tooling/style-dictionary`.

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [GitHub Actions: setup-node](https://github.com/actions/setup-node#usage) — Section: "Usage" — Why: pin `node-version: 20`; `working-directory` for the SD `npm ci` step.
- [GitHub Actions: workflow syntax `on`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#on) — Section: `on.push.branches` / `on.pull_request` — Why: trigger on push to `main` + all PRs.
- [Node 20 `--check`](https://nodejs.org/docs/latest-v20.x/api/cli.html#--check) — Why: syntax-only check; used per-`.mjs` in drift-check. (Confirmed all tracked `.mjs` pass, incl. `worker/fixtures.mjs` which uses `import ... with { type: 'json' }`.)

### Patterns to Follow

**File header (governing-doc citation — project convention):** every entry-point file opens citing its doc. Mirror `gen-token-css.mjs` lines 1–7. Example for the new scripts:
```js
// tooling/drift-check.mjs — CI generator-drift gate (epic #1, ticket #9).
// Re-runs the repo-self-contained generators + validators; exits 1 on any drift or
// validation error. The CI-ified "full gate" (.claude/plans/epic-1-landing-plan.md L44).
// Repo contents ONLY — the company-projection chain (build.mjs) needs the jobs folder + a
// ledger and is NOT covered here. Standalone: node tooling/drift-check.mjs
```

**Standalone-run guard (space-safe — the repo path idiom):** reuse verbatim from `gen-token-css.mjs:150` — `file://${argv[1]}` breaks on paths with spaces; `pathToFileURL` is required.
```js
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { /* main */ }
```
(Both new scripts are invoked directly, so the "main" body can run unconditionally at module top-level OR behind this guard; behind the guard is the house style.)

**Error/exit idiom:** mirror `scenarios/validate.mjs:285–294` — `try { ...checks... ; console.log("✓ …") } catch (e) { console.error("gate ✗  " + e.message); process.exit(1); }`. Throw plain `Error`s whose message names the offending file/token (CLAUDE.md errors rule). No error taxonomy.

**Zero-dep, Node built-ins only:** `node:fs`, `node:path`, `node:url`, `node:child_process`. No npm deps in these scripts (SD is a child process inside `gen-handoff`, not a direct import here).

**Reuse, don't re-implement:** import and call the existing exported functions. Do NOT shell out to the CLIs (`node agent-layer/…`) from inside the scripts — import the functions (`genTokenCss`, `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace`, `loadSource`). Exception: `node --check` (a CLI flag, no importable form) and `git status` are child processes.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phases 1 and 2 are **independent** (two separate scripts, no shared code) — candidates for parallel work if desired. Phase 3 depends on both. Phase 4 depends on all.

### Phase 1: `tooling/drift-check.mjs`

The CI-ified full gate, in one script. Ordered checks, fail fast, each naming what drifted:

1. **Syntax** — `node --check` every tracked `.mjs` (child process per file; `git ls-files '*.mjs'`). Run first: a broken generator would fail to import in later steps anyway.
2. **Token CSS drift** — `genTokenCss({ check: true })`; if `.drifted.length`, fail naming the files + the regenerate command.
3. **Handoff/vocabulary drift** — call `genHandoff()` then `genVocabulary()` (they write under `handoff/`), then `git status --porcelain -- handoff/`; **non-empty output = drift** → fail, printing the porcelain output. Use `--porcelain` (**not** `git diff --exit-code`) so a generator that begins emitting a *new* (untracked) file is caught too.
4. **Scenarios** — `validateScenarios()` (throws on failure).
5. **Traces** — every `traces/*.jsonl` through `validateTrace(file)` (throws on failure).

Top-level `try/catch` → `console.error("drift ✗  " + e.message); process.exit(1)`. On success, one ✓ summary line.

### Phase 2: `tooling/token-lint.mjs`

**Independent of:** Phase 1.

Three checks, hand-rolled:

1. **UNDECLARED (strict, `components.css` only):** parse `--name:` declarations from `system/tokens.contract.css` → `declared` set (47). Parse `var(--name)` from `system/components.css` → `usedByComponents`. Any used name not in `declared` → fail, listing offenders. (Currently 0 — verified.)
2. **ORPHAN (generous, full shipped/proto consumer set — NO packs):** collect every `var(--name)` across the **consumer set** (exact glob below), then any `declared` token not referenced → fail, listing orphans. (Currently 0 — verified.)
3. **DTCG valid:** `loadSource()` from `agent-layer/gen-token-css.mjs` inside try/catch → fail with its named message. (This re-runs the same validation the drift-check's token-CSS step already triggers; it is here so the token-lint gate is self-contained and legible — not a correctness gap.)

Same try/catch/exit idiom; ✓ summary on success.

**Orphan consumer set (LOCKED — verified to yield 0 orphans, `declared=47`, referenced=62):**
- `system/components.css`, `system/portfolio.css`, `system/proto.css`
- `system/tokens.contract.css` *(contract self-references — this is what keeps `--color-white` non-orphan: it feeds `--color-on-dark-border` via `color-mix`)*
- every `*.html` at repo root (shipped pages, inline `<style>`) and `proto/*.html`
- `system/wc/*.mjs` (custom-element shadow CSS)
- **Excluded by design:** token packs (`tokens.neutral.css`, `tokens.saulera.css`, `tokens.css`) — packs *set* tokens, they are not the surfaces the contract serves. `--shadow-lg` stays non-orphan via `proto.css`; `--color-white` via the contract self-reference above. (Rejected alternatives recorded in NOTES.)

### Phase 3: `.github/workflows/verify.yml`

**Depends on:** Phases 1 + 2 (runs both scripts).

`on: { push: { branches: [main] }, pull_request: {} }`. One job on `ubuntu-latest`:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 20` (local baseline is v20.20.2 — pin so SD output + generator determinism don't silently move under a different runner).
3. `npm ci` in `tooling/style-dictionary` (`working-directory:`) — **required**: `genHandoff()` child-process-invokes Style Dictionary; without its `node_modules` the drift-check dies on the handoff step. Lockfile is present → `npm ci` (not `npm install`).
4. `node tooling/drift-check.mjs`
5. `node tooling/token-lint.mjs`

### Phase 4: Prove the gate, then keep it green

**Depends on:** Phases 1–3.

- Prove **undeclared** failure mode (temp edit → gate fails → revert).
- Prove **orphan** failure mode (temp source token referenced nowhere → regen → gate fails → revert).
- Prove **drift** failure mode (hand-edit a generated file → drift-check fails → revert).
- Record all three demonstrations in the PR body (AC evidence), then confirm the gate is green on the clean tree.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently testable.

### CREATE `tooling/token-lint.mjs`

- **IMPLEMENT**: Header (governing-doc citation, per pattern). Import `readFileSync`, `readdirSync`, `existsSync` from `node:fs`; `join`, `dirname`, `resolve` from `node:path`; `fileURLToPath`, `pathToFileURL` from `node:url`; `loadSource` from `../agent-layer/gen-token-css.mjs`. Compute `ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")`.
  - Helper `declaredTokens()`: read `system/tokens.contract.css`, `matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)` → `Set`.
  - Helper `varsIn(relPaths)`: for each existing path, `matchAll(/var\(\s*(--[a-z0-9-]+)/g)`, union into a `Set`.
  - Helper `htmlFiles(dir)`: `readdirSync(dir).filter(f => f.endsWith(".html"))`.
  - `checkUndeclared()`: `varsIn(["system/components.css"])` minus `declared` → throw `Error("token-lint: components.css references undeclared token(s): " + [...].join(", ") + " — add to the contract group in system/tokens.source.json and regenerate")` if any.
  - `checkOrphans()`: build the LOCKED consumer list (explicit files + root `*.html` + `proto/*.html` + `system/wc/*.mjs`), `varsIn(...)` → `referenced`; `[...declared].filter(t => !referenced.has(t))` → throw naming orphans if any.
  - `checkDtcg()`: `try { loadSource() } catch (e) { throw new Error("token-lint: DTCG source invalid — " + e.message) }`.
  - Main (behind the `pathToFileURL` guard): run all three; on success `console.log("token-lint      ✓  " + declared.size + " contract tokens · 0 undeclared · 0 orphan · DTCG valid")`; wrap in `try/catch` → `console.error(e.message); process.exit(1)`.
- **PATTERN**: exit/idiom `scenarios/validate.mjs:285–294`; guard `gen-token-css.mjs:150`.
- **IMPORTS**: `node:fs`, `node:path`, `node:url`; `loadSource` (named export, verified importable).
- **GOTCHA**: the orphan consumer set must EXCLUDE packs and INCLUDE `tokens.contract.css` self-refs, or `--color-white`/`--shadow-lg` become false orphans and the gate fails on a clean tree. Undeclared scans **only** `components.css` (per the definition); orphan scans the full set.
- **VALIDATE**: `node tooling/token-lint.mjs` → exit 0, prints the ✓ line.
- **SATISFIES**: AC — token lint (undeclared + orphan + DTCG), local-runnable.

### CREATE `tooling/drift-check.mjs`

- **IMPLEMENT**: Header (cite ticket #9 + the full-gate line + the "repo-only, not build.mjs" bound). Import `execFileSync` from `node:child_process`; fs/path/url as needed; `genTokenCss` from `../agent-layer/gen-token-css.mjs`; `genHandoff` from `../agent-layer/gen-handoff.mjs`; `genVocabulary` from `../agent-layer/gen-vocabulary.mjs`; `validateScenarios` from `../scenarios/validate.mjs`; `validateTrace` from `./validate-trace.mjs`. `ROOT` as above.
  - `checkSyntax()`: `execFileSync("git", ["ls-files", "*.mjs"], {cwd: ROOT, encoding: "utf8"})` → for each file `execFileSync(process.execPath, ["--check", file], {cwd: ROOT})`; on throw, `throw new Error("syntax error in " + file)`.
  - `checkTokenCss()`: `const r = genTokenCss({ check: true }); if (r.drifted.length) throw new Error("token CSS drift: " + r.drifted.join(", ") + " — regenerate: node agent-layer/gen-token-css.mjs")`.
  - `checkHandoff()`: `genHandoff(); genVocabulary(); const out = execFileSync("git", ["status", "--porcelain", "--", "handoff/"], {cwd: ROOT, encoding: "utf8"}); if (out.trim()) throw new Error("handoff/ drift after regeneration — commit the regenerated pack:\n" + out)`.
  - `checkScenarios()`: `validateScenarios()`.
  - `checkTraces()`: `readdirSync(join(ROOT,"traces")).filter(f=>f.endsWith(".jsonl")).sort()` → `validateTrace(join(ROOT,"traces",f))` each.
  - Main (behind guard): run in order Syntax → TokenCss → Handoff → Scenarios → Traces; on success `console.log("drift-check      ✓  syntax · token-css · handoff · scenarios · traces")`; `try/catch` → `console.error("drift ✗  " + e.message); process.exit(1)`.
- **PATTERN**: `git`-via-`execFileSync` (array args, no shell) — new but standard; SD child-process precedent is `gen-handoff.mjs:38`.
- **IMPORTS**: named exports all verified importable: `genTokenCss`, `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace`.
- **GOTCHA**: (1) `git status --porcelain`, NOT `git diff --exit-code` — catches new untracked generated files. (2) `checkHandoff` mutates the working tree (writes `handoff/`); harmless in CI (ephemeral) and locally (deterministic → identical). (3) `genHandoff()` needs `tooling/style-dictionary/node_modules`; if absent it throws a named Error (the catch surfaces it) — CI installs it in Phase 3. (4) Scope the porcelain check to `handoff/` (the only path these generators write); a whole-tree check would false-positive on unrelated local edits.
- **VALIDATE**: `node tooling/drift-check.mjs` → exit 0, prints the ✓ line; `git status --porcelain` clean afterward.
- **SATISFIES**: AC — drift-check passes on clean regen; local-runnable.

### CREATE `.github/workflows/verify.yml`

- **IMPLEMENT**: `name: verify`; `on: { push: { branches: [main] }, pull_request: {} }`; one `verify` job on `ubuntu-latest` with steps: `actions/checkout@v4` → `actions/setup-node@v4` (`with: { node-version: 20 }`) → SD install (`run: npm ci`, `working-directory: tooling/style-dictionary`) → `run: node tooling/drift-check.mjs` → `run: node tooling/token-lint.mjs`. Add a top-of-file comment citing ticket #9 + the deferred visual-regression gate.
- **PATTERN**: standard GitHub Actions; pin action majors (`@v4`).
- **IMPORTS**: n/a (YAML).
- **GOTCHA**: `npm ci` requires `tooling/style-dictionary/package-lock.json` (present — verified). It must run BEFORE drift-check, or `genHandoff()`'s SD child process fails.
- **VALIDATE**: parse-check the YAML locally if a parser is handy; otherwise the first PR CI run is the validator. Confirm the job appears on the PR and goes green.
- **SATISFIES**: AC — both gates wired as GitHub Actions on push/PR.

### PROVE failure modes + record in PR (do NOT commit the temp edits)

- **IMPLEMENT**:
  - Undeclared: add `x: var(--zzz-not-a-token);` to a rule in `system/components.css` → `node tooling/token-lint.mjs` exits 1 naming `--zzz-not-a-token` → `git checkout system/components.css`.
  - Orphan: add a contract token that nothing references to the `contract` group in `system/tokens.source.json` (e.g. `"color-unused-test": { "$value": "#000000", "$type": "color" }`) → `node agent-layer/gen-token-css.mjs` (regen contract.css) → `node tooling/token-lint.mjs` exits 1 naming the orphan → `git checkout system/tokens.source.json system/tokens.contract.css system/tokens.neutral.css`.
  - Drift: hand-edit a generated file (e.g. append a blank line to `handoff/verdant/vocabulary.json`) → `node tooling/drift-check.mjs` exits 1 on the handoff step → `git checkout handoff/`.
- **PATTERN**: n/a — verification only.
- **GOTCHA**: revert every temp edit; the committed tree must stay green. Paste the three failure outputs into the PR body as AC evidence.
- **VALIDATE**: after reverting, `node tooling/drift-check.mjs && node tooling/token-lint.mjs` both exit 0; `git status --porcelain` clean.
- **SATISFIES**: AC — both token-lint failure modes proven once; drift-check fails on hand-edit, passes on clean regen.

### COMMIT + PR (per repo git discipline)

- **IMPLEMENT**: Branch `feature/ci-verification-gates`. Stage by explicit path (`tooling/drift-check.mjs tooling/token-lint.mjs .github/workflows/verify.yml`). One atomic commit: `feat: CI verification gates — generator drift-check + token lint (#9)`. PR body: `Part of #9` (NOT `Closes #9`), the three failure-mode demonstrations, and a note that the visual-regression gate is deferred to a follow-up.
- **GOTCHA**: shared-worktree discipline (memory `shared-worktree-parallel-sessions`) — verify branch immediately before committing; stage explicit paths only.
- **VALIDATE**: PR opens; `verify` workflow runs on the PR and is green.
- **SATISFIES**: wiring + evidence trail.

### POST-MERGE: `/rules-check-drift`

- **IMPLEMENT**: after merge, run `/rules-check-drift` so `CLAUDE.md`'s architecture map gains the two gate scripts + `.github/workflows/verify.yml` (per `epic-1-remaining-plan.md` §Wave 1). Update the epic-1-remaining-plan status line for #9 (partial — visual regression outstanding).
- **VALIDATE**: `CLAUDE.md` architecture map lists `tooling/drift-check.mjs`, `tooling/token-lint.mjs`, `.github/`.
- **SATISFIES**: rules-file truth maintenance.

---

## TESTING STRATEGY

No unit-test suite exists (project rule) — the gates ARE the verification surface. "Testing" here = running the gates and proving their failure modes.

### Unit Tests
None (no framework; would violate the zero-dep/no-suite convention). The scripts are thin orchestrators over already-tested functions.

### Integration Tests
The two scripts run end-to-end against the real repo (they read committed files and re-run the real generators). `node tooling/drift-check.mjs` and `node tooling/token-lint.mjs` ARE the integration test; the GitHub Actions run is the same, in a clean checkout.

### Edge Cases (must be demonstrated once, per AC)
- **Undeclared token** in `components.css` → token-lint exits 1.
- **Orphan contract token** (declared, referenced nowhere) → token-lint exits 1.
- **Hand-edited generated artifact** (token CSS / handoff / vocabulary) → drift-check exits 1.
- **New untracked generated file** under `handoff/` → caught by `git status --porcelain` (the reason for porcelain over `git diff`).
- **Missing SD `node_modules`** → `genHandoff()` throws its named Error → drift-check exits 1 with a legible message (the CI install prevents this in practice).

---

## VALIDATION COMMANDS

Run from repo root. All currently pass on clean `main` (verified during planning).

### Level 1: Syntax & Style
```bash
for f in $(git ls-files '*.mjs'); do node --check "$f" || echo "FAIL $f"; done   # all pass
```

### Level 2: The gates
```bash
node tooling/token-lint.mjs      # exit 0, ✓ line
node tooling/drift-check.mjs     # exit 0, ✓ line
git status --porcelain           # clean after drift-check (deterministic regen)
```

### Level 3: Failure modes (revert each after)
```bash
# undeclared
printf '\n.x{color:var(--zzz);}\n' >> system/components.css; node tooling/token-lint.mjs; git checkout system/components.css
# drift
printf '\n' >> handoff/verdant/vocabulary.json; node tooling/drift-check.mjs; git checkout handoff/
# orphan → add "color-unused-test" to contract group in tokens.source.json, regen, lint, revert (manual edit; see task)
```

### Level 4: CI (manual)
Open the PR; confirm the `verify` job runs on `pull_request`, installs SD, and both gate steps pass. Push a throwaway hand-edit to a generated file on the branch to watch CI go red, then revert.

### Level 5: Additional Validation (Optional)
`gh run list --workflow=verify.yml` after the first push to inspect the Actions run.

---

## ACCEPTANCE CRITERIA

Scoped to this plan (issue #9 minus visual regression):

- [ ] `tooling/drift-check.mjs` and `tooling/token-lint.mjs` are runnable locally as plain Node scripts (zero deps) AND wired as GitHub Actions on push (`main`) + PR.
- [ ] Drift-check fails when a generated artifact (`tokens.contract.css`/`tokens.neutral.css`, the `handoff/` pack, `vocabulary.json`) is hand-edited; passes on clean regeneration.
- [ ] Drift-check covers the repo-self-contained chain only (`gen-token-css --check`, `gen-handoff`+`gen-vocabulary`+porcelain, `scenarios/validate`, `validate-trace`, `node --check` all `.mjs`); does NOT attempt `build.mjs`.
- [ ] Token lint catches an undeclared token AND an orphan token — both failure modes demonstrated once and recorded in the PR — then stays green.
- [ ] Token lint validates the DTCG source via `loadSource()` (no schema library added).
- [ ] Orphan check spans the full shipped/proto consumer set (0 orphans on clean tree); `--color-white` and `--shadow-lg` correctly counted as used.
- [ ] CI pins Node 20 and `npm ci`-installs Style Dictionary before drift-check.
- [ ] No product code, generator, token, spec, or fixture changed; tree green under the gate.
- [ ] PR says `Part of #9` (not `Closes #9`); visual-regression follow-up noted.

**Explicitly NOT met by this plan (stay open on #9):** visual-regression baselines committed; an intentional CSS change shows as a pixel diff.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order.
- [ ] `node tooling/token-lint.mjs` → exit 0.
- [ ] `node tooling/drift-check.mjs` → exit 0; `git status --porcelain` clean after.
- [ ] All three failure modes demonstrated + pasted into the PR body; temp edits reverted.
- [ ] `.github/workflows/verify.yml` green on the PR (SD install + both gates).
- [ ] Node 20 pinned; `npm ci` used (lockfile present).
- [ ] Scripts open with governing-doc headers; use the `pathToFileURL` guard + named-error exit idiom.
- [ ] Reused existing exported functions — nothing re-implemented.
- [ ] PR: `Part of #9`, visual-regression deferral noted; committed on `feature/ci-verification-gates`.
- [ ] Post-merge `/rules-check-drift` run; architecture map updated.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved before writing (verified):**
- The full gate is green on `main` and the generators leave the tree clean (deterministic, self-contained, no jobs folder needed). ✓
- All gate functions are importable named exports; all `.mjs` pass `node --check` (incl. `worker/fixtures.mjs` import attributes). ✓
- 47 contract tokens; 0 undeclared (components-only); 0 orphans under the locked consumer set. ✓
- SD dependency is the one CI install requirement; lockfile present → `npm ci`. ✓

**Assumptions:**
- Scope is **two gates now, Playwright visual regression deferred** (user-confirmed). This plan does **not** close #9.
- Orphan "used" = referenced by a shipped/proto surface or a contract self-reference; token packs are excluded (rationale in NOTES). If a future reader expects packs to count, that's a one-line glob change — flagged, not silently chosen.
- CI triggers: push to `main` + all PRs. (Alternative: PR-only. Push-to-`main` is included so a direct-to-main commit is still gated.)

**Flag for the user (non-blocking):**
- **#9 stays partially open.** Track the deferred visual-regression gate as a follow-up issue/plan so #9 isn't accidentally closed by this PR.
- **Cross-platform byte-identity is VERIFIED on Linux** (`node:20`, porcelain clean — see NOTES). This was the single biggest threat to one-pass success; closing it empirically is what lifts confidence to 9.5. A residual triage rule remains as a safety net only.

## NOTES (open canvas)

**Why `drift-check` reuses functions, not the CLIs.** Importing `genTokenCss`/`genHandoff`/… keeps the gate a single in-process Node program (one stack trace, one exit path, no shell quoting) and avoids re-parsing the space-containing repo path through five subprocess invocations. `node --check` and `git` are the only child processes because neither has an importable form.

**Why `git status --porcelain -- handoff/` beats `git diff --exit-code -- handoff/`.** `git diff` compares tracked files only. If a generator starts emitting a *new* file, `git diff` shows nothing (untracked), but the artifact is still uncommitted drift. `porcelain` lists untracked files too. Scoped to `handoff/` because that's the only tree these three generators write (`gen-token-css --check` writes nothing; `gen-handoff`/`gen-vocabulary` write only under `handoff/`; `figma-parity.json` is deliberately untouched — `gen-handoff.mjs:5–7`).

**Orphan consumer set — the decision and the two rejected readings.**
- *Rejected: components.css-only.* Fails immediately on `--color-white` (a contract-internal `color-mix` helper for `--color-on-dark-border`) and `--shadow-lg` (used by `proto.css`). Would force out-of-scope token deletion/refactor to go green. Wrong.
- *Rejected: include token packs (`tokens.neutral.css`, `tokens.saulera.css`, `tokens.css`).* Would let a token count as "used" merely because a pack references it, defeating the purpose (catching dead contract surface). Also `tokens.css`/`tokens.saulera.css` are reference-only, not loaded by the shell (CLAUDE.md).
- *Chosen: shipped/proto surfaces + contract self-refs, no packs.* The only reading that is (a) green today (0 orphans, verified) and (b) able to demonstrate the orphan failure mode the AC requires (a token referenced *nowhere* is a true orphan). Legibility anchor for the reviewer: the two non-`components.css` tokens are `--shadow-lg` (proto) and `--color-white` (contract self-ref) — both documented in the script.

**DTCG check is intentional redundancy.** `gen-token-css --check` already calls `loadSource()`, so the drift-check step transitively validates the DTCG source. Token-lint calls it again so the token-contract gate is self-contained and reads as one coherent check — a legibility choice, not a coverage gap. Noted so it isn't "cleaned up" as duplication.

**Cross-platform determinism — VERIFIED on Linux (was the top one-pass risk).** The committed artifacts were generated on **macOS (darwin)**; the `verify` workflow regenerates them on a **Linux** runner, so the drift-check's core AC ("passes on clean regeneration") depends on Linux producing **byte-identical** output. This was **empirically confirmed during planning (2026-07-18)**: an isolated clone of the committed state (`a3ff7c4`) was regenerated in `node:20` on Linux — `npm ci` Style Dictionary → `gen-token-css --check` (✓ no drift) → `gen-handoff` + `gen-vocabulary` → **`git status --porcelain -- handoff/` returned empty (CLEAN)**. Linux node was v20.20.2 (== the macOS baseline). Supporting determinism facts: both writing generators `.sort()` their `readdirSync` (`gen-handoff.mjs:25`, `gen-vocabulary.mjs:22`); `gen-vocabulary` emits `JSON.stringify(..., 2) + "\n"` (LF); `gen-token-css` reads JSON in insertion order; SD 4.4.0 headers carry no timestamps (`handoff-data-layer.md:445`); validators don't write.
- **Residual triage rule (kept as a safety net — the risk is now closed, but state it if CI ever reddens on a clean tree):** distinguish **platform-nondeterminism** from **real drift**. The fix for the former is generator sort-order or a repo `.gitattributes` `* text=auto eol=lf`, **never** committing the runner's output (that flips the failure onto the other platform). The "commit the regenerated pack" remediation applies ONLY to genuine drift (a hand-edited / un-regenerated artifact).
- **Reproduce the pre-check:** `docker run --rm -v "$PWD":/w -w /w node:20 bash -c 'git config --global --add safe.directory /w && cd tooling/style-dictionary && npm ci && cd /w && node agent-layer/gen-token-css.mjs --check && node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && git status --porcelain -- handoff/'` — porcelain empty = pass.

**What drift-check deliberately does NOT cover.** The company-projection generators (`gen-decisions`, `gen-tokens`, `gen-llms`, `gen-headers`, `inject-jsonld`) and `build.mjs` need the sibling jobs folder + a decisions ledger — neither exists in CI. This is by design (the generator chain is offline/deterministic; the *company* projection is authored, not CI'd). The header must say so.

**Sequencing rationale (from `epic-1-remaining-plan.md`).** Land #9 BEFORE the big UI tickets (#10/#13/#14) so those are developed *under* the gate — baseline/regeneration updates then appear inside their PR diffs, which is itself the "demonstrated workflow" evidence #9 wants. #17 (on-dark accent token) landed first specifically so the token lint gates a *complete* contract.

## AMENDMENTS

- 2026-07-18 — created.
- 2026-07-18 — **Cross-platform determinism verified** (was the one open one-pass risk). Regenerated the committed state (`a3ff7c4`) in `node:20` on Linux: `gen-token-css --check` clean, `gen-handoff`+`gen-vocabulary` → `git status --porcelain -- handoff/` empty (byte-identical to macOS). Downgraded the NOTES risk to a residual safety net; confidence 7–8 → 9.5.
