# Feature: Company-brief record + brief → scenario-package compiler (#39)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and shapes. Import from the right files. The two existing scenario packages (`scenarios/verdant/`, `scenarios/fieldwork/`) are the ground truth for every output shape — when in doubt, diff your emitted file against `scenarios/verdant/<file>`.

## Feature Description

Turn a real hiring company into a scenario package **deterministically**, so the factory pipeline (intake wizard → derived design system → data-connected prototype → handoff pack) can run on the company's *own* stated product vision instead of only the two fictional scenarios. Two deliverables:

1. **Company-brief record type** — a new jobs-folder kb record (`brief.md`, the kb JSON-head-+-`##`-sections shape) holding one company's stated vision, source URLs, optional published tokens, curated intake answers, and application metadata. It is the single per-company authoring source that compiles to one package. Both kb parsers (`agent-layer/lib.mjs`, `portal/lib/kb.mjs`) must read the shape (the standing sync rule).
2. **Brief → scenario-package compiler** — a standalone agent-layer-pattern Node ESM generator (`agent-layer/gen-company-package.mjs`) that compiles one brief record into the exact `scenarios/<slug>/` package shape (`brief.md`, `intake.defaults.json`, `copy.json`, `proto.config.json`, `fixtures/*`, plus an optional copied-through token pack), self-validates the emitted package, and prints a `✓` line. Output directory is configurable; **real-brand output compiles into the jobs-folder build target, never into this repo** — a hard privacy boundary enforced by a guard, not just a convention.

This is the "ledger → scenario-package unification" the platform architecture anticipated and settled 2026-07-19: fictional and real subjects are the **same package format with different provenance labels**. The scenario format gains that distinction — `fictional: true` packages keep the fictional notice; real-provenance packages (`fictional: false`) require speculative-work labeling (based on the company's public statements, sources linked, not affiliated with / endorsed by the company) — enforced by `scenarios/validate.mjs`.

## User Story

As the factory's operator (Linards, authoring a job application),
I want to author one company-brief record and compile it into a valid scenario package,
So that the entire existing pipeline runs on a real company's vision with zero engine changes, and so real-brand content can never accidentally be committed to the public repo.

## Problem Statement

Today the factory only consumes the two committed fictional packages. There is no defined way to (a) capture a real company's publicly-stated vision as a structured, citable record, or (b) turn that record into the package shape everything downstream already consumes. Doing it by hand would be error-prone (the package is five coupled files with a strict validator) and would risk committing real-brand content to a public, inspectable repo.

## Solution Statement

Define the company-brief record (a kb record, superset of the scenario `brief.md`) and write a deterministic compiler that expands it into the package. The compiler leans on a **canonical 8-question skeleton** (verified identical across both existing packages — only `default`/`reasoning`/axes differ per company), so the brief carries only the eight `(default, reasoning)` pairs plus the axes and copy essentials. The compiler self-validates via a refactored `scenarios/validate.mjs` that gains (1) an exported `validatePackage(dir)` + a by-path CLI mode, and (2) provenance-aware labeling checks. A path-containment privacy guard makes it impossible to write a real-brand package inside the repo.

## Out of Scope / Non-Goals

- **Not included: pack-seed DERIVATION from screenshots/published tokens (the vision agent run).** That is ticket #40. #39 only ever (a) emits the `axes` block, and (b) copies a pre-existing `publishedTokens` CSS file through verbatim as a referenced file. The word "token-pack reference" in the ticket means exactly this copy-through — no color/type/space extraction, no Agent SDK, no DTCG generation here.
- **Not included: view-time pack swap / private-instance shell / pre-seeded wizard rendering.** That is #43. #39 stops at producing a valid package on disk.
- **Not included: registering the compiled package as a third shipped scenario.** Do **not** touch `scenarios/index.json` or `worker/fixtures.mjs`. The emitted package is validated out-of-registry, by path. (Two-signal confirmation: the ticket's files-touched list names `scenarios/validate.mjs` but neither `index.json` nor `worker/fixtures.mjs`.)
- **Not included: `build.mjs` registration.** This is a separate brief→package pipeline, not part of the per-site machine-layer build. Precedent: `tooling/figma/figma-parity.mjs` is standalone and deliberately never registered in `build.mjs`. Do not add an import/call there.
- **Not included: a portal brief-management card UI.** The architecture defers it ("the portal may grow a brief-management surface later"). The portal change is a thin parse-in-sync only.
- **Not changing:** the derivation engine (`system/derive.mjs`), the wizard runtime (`system/factory-intake.mjs`), the Worker routes, or the two existing packages' content. `node scenarios/validate.mjs` (no args) must still print Verdant + Fieldwork `✓` with zero diff in behavior.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (five coupled files + a validator refactor + a new kb record type; the risk is shape-fidelity, not algorithmic difficulty)
**Primary Systems Affected**: `agent-layer/` (new generator + shared parser), `scenarios/` (validator refactor + docs), `portal/lib/kb.mjs` (thin sync), `.claude/references/kb-format.md` (record docs)
**Dependencies**: none (zero-dep Node ESM, project rule)

## Related Work

**Implements**: [#39](https://github.com/linardsb/ux-factory/issues/39) · **Epic**: [#38 — per-company brief layer](https://github.com/linardsb/ux-factory/issues/38), architecture at `docs/epics/per-company-brief.architecture.md` (inherit its §Recommended approach capability 2, §Data model, §Boundaries — do not re-decide them).

**Back-references** (decisions inherited / shapes reused):

- `.claude/plans/scenario-packages-worker-mock-api.md` — Why: defines the package shape and `validate.mjs` this ticket compiles-to and refactors.
- `.claude/plans/factory-intake-wizard-reskin.md` — Why: the wizard consumes the `intake.defaults.json` shape this compiler emits; the canonical questions/axes come from there.
- `.claude/plans/live-derivation-engine.md` — Why: the axes vocabulary (`density`/`rewardType`/`frequency`) the emitted package is validated against.

**Forward-references**:

- #40 (pack-seed derivation — replaces hand-authored axes with an agent proposal), #43 (private-instance shell — renders this package), #44 (per-company build + unlisted deploy — invokes this compiler from the jobs folder). *(append as they're planned)*

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `docs/epics/per-company-brief.architecture.md` (whole file, ~75 lines) — Why: the governing decisions. §Data model gives the brief's field list; §Boundaries gives the three hard contracts (privacy, agent-proposes/human-decides, honesty labeling). This ticket implements the deterministic slice of capability 2.
- `scenarios/README.md` (lines 36–130) — Why: the authoritative package contract. Every emitted file's shape and the "who consumes what" table live here. You will also *edit* this to document provenance modes.
- `scenarios/validate.mjs` (whole file, 296 lines) — Why: the validator you refactor. Note especially: `checkBrief` (lines 51–70, the `fictional === true` hard gate you're changing), `checkCopy` (101–111), `checkFixtures` (113–178, the `<thing>Id`→collection walk + real-date + unreferenced-file checks), the `COHERENCE` slug-keyed table (183–244, a NEW slug gets only the generic checks), the cross-scenario verdict-differ guard (278–280, gated by `results.length > 1`), and the standalone guard (285).
- `scenarios/verdant/intake.defaults.json` (whole file) — Why: the exact output shape for `intake.defaults.json`. The 8 questions' `stage`/`question`/`asked`/`bounds` are the canonical skeleton (verified identical to fieldwork's — see NOTES); only `default`/`reasoning`/`axes` are per-company.
- `scenarios/verdant/copy.json` + `scenarios/verdant/proto.config.json` + `scenarios/verdant/brief.md` — Why: exact output shapes for `copy.json`, `proto.config.json`, and the emitted (lean-head) `brief.md`.
- `scenarios/verdant/fixtures/plants.json` — Why: fixture record shape (unique `id`, coherent absolute dates, `<thing>Id` references).
- `agent-layer/lib.mjs` (whole file, 133 lines) — Why: where `parseCompanyBrief` goes. Mirror `parseComponentSpec` (lines 63–117) for structure: fence → JSON head → field-by-field validation throwing `Error`s that name the path → `## `-section split. Reuse `parseLedger`'s fence regex family.
- `agent-layer/gen-token-css.mjs` (lines 1–13, 148–158) — Why: the canonical standalone generator pattern — module-relative path resolution (`resolve(dirname(fileURLToPath(import.meta.url)), "..")`), and the `pathToFileURL` standalone guard (the repo path contains a space, so `file://${argv[1]}` never matches — you MUST use `pathToFileURL`).
- `agent-layer/gen-tokens.mjs` (lines 43–64) — Why: the `export function genX(){…}; console.log('… ✓ …'); standalone-guard` shape in miniature.
- `agent-layer/build.mjs` (lines 17–21) — Why: the "run FROM the jobs folder, resolve paths from cwd" convention for the *input* brief path and the `--out` target (contrast with module-relative resolution for the repo-root privacy check).
- `portal/server.mjs` (lines 19–27) — Why: the exact path-containment idiom to mirror for the privacy guard: `resolve` the target, then `if (!target.startsWith(base + path.sep) && target !== base)`. A naive `startsWith` false-blocks siblings like `/repo-real/`.
- `portal/lib/kb.mjs` (lines 9–19, 91–123) — Why: where the thin portal sync goes. `parseFencedJson` + `section` already read the kb shape generically; add a small `parseBrief` projection and surface it on `cardFor`.
- `.claude/references/kb-format.md` (whole file, 30 lines) — Why: you add the company-brief record to "The shapes" list and restate the sync rule.
- `system/factory-intake.mjs` (lines 39–120) — Why: confirms the wizard's consumed shape (`defaults` + per-axis `reasoning`, distilled from `intake.defaults.json`). "Consumable unchanged by the wizard shape" = passes `checkIntake` and carries the axes + per-question reasoning. The wizard *inlines* its copy; you do not wire the emitted file into it.

### New Files to Create

- `agent-layer/gen-company-package.mjs` — the compiler (the deliverable).
- `agent-layer/fixtures/acme/brief.md` — the fictional happy-path fixture brief (the ticket's "one fictional fixture brief"). Plus `agent-layer/fixtures/acme/fixtures/<collection>.json` (its authored mock data).
- `agent-layer/fixtures/northwind-real/brief.md` (+ `fixtures/<collection>.json`) — a **fictional-content** stub carrying a real-provenance *label* (`fictional: false` + sources), used only to exercise the real-provenance branch and the privacy guard. It is never shipped and — by design — the privacy guard makes it impossible to compile into the repo. Add a prose line in it stating it is a test stub.

### Relevant Documentation

No external docs required — this is a closed, in-repo capability. The only "documentation" is the two governing in-repo files you must honor and update: `docs/epics/per-company-brief.architecture.md` (read) and `scenarios/README.md` + `.claude/references/kb-format.md` (read + edit).

### Patterns to Follow

**Standalone-run guard (MANDATORY — repo path has a space):** from `agent-layer/gen-token-css.mjs:150`

```js
import { fileURLToPath, pathToFileURL } from "node:url";
// …
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // CLI entry — parse argv, run, console.log the ✓ line, process.exit(1) on throw
}
```

**Module-relative repo root (for the privacy guard):** from `gen-token-css.mjs:13`

```js
import { dirname, resolve } from "node:path";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // agent-layer/.. = repo root
```

**Path containment (privacy guard core):** mirror `portal/server.mjs:20-21`

```js
import path from "node:path";
const outAbs = path.resolve(outDir, slug);            // the package dir we're about to write
if (head.fictional === false &&
    (outAbs === REPO_ROOT || outAbs.startsWith(REPO_ROOT + path.sep))) {
  throw new Error(`gen-company-package: refusing to write real-brand package "${slug}" inside the public repo (${outAbs}) — real packages compile to the jobs-folder build target (privacy boundary, per-company-brief.architecture.md §Boundaries)`);
}
```

**Throw-naming-the-path boundary validation:** from `agent-layer/lib.mjs` / `scenarios/validate.mjs` — every check throws a plain `Error` whose message begins with the offending file path. No taxonomy, no wrapping.

```js
if (!nonEmpty(head.oneLiner)) throw new Error(`${briefPath}: head "oneLiner" is missing or empty`);
```

**Generator return + ✓ line:** from `gen-tokens.mjs:58,63` — `genX()` returns a small stats object; the CLI block prints one `✓` line with counts.

**Parser skeleton:** from `parseComponentSpec` (`agent-layer/lib.mjs:63-117`) — fence match → `JSON.parse` in try/catch naming the path → validate head fields → split `## ` sections → assert required sections present in order.

---

## IMPLEMENTATION PLAN

### Phase 1: Validator refactor (foundation — everything self-validates against it)

**Independent of** Phases 2–4 in the sense that it touches only `scenarios/validate.mjs`, but it must land **first** because the compiler imports `validatePackage` from it.

Refactor `scenarios/validate.mjs` so per-package checks are callable by path and are provenance-aware, **without regressing** the no-arg registry run.

### Phase 2: The kb record + shared parser

**Depends on:** nothing (pure addition to `lib.mjs` + docs). Can run parallel to Phase 1.

Add `parseCompanyBrief` to `agent-layer/lib.mjs`; document the record in `kb-format.md` and the provenance modes in `scenarios/README.md`; add the thin portal sync.

### Phase 3: The compiler

**Depends on:** Phase 1 (imports `validatePackage`) + Phase 2 (imports `parseCompanyBrief`).

Write `agent-layer/gen-company-package.mjs`: parse → expand → emit five files (+ optional token copy) → privacy-guard → self-validate → `✓`.

### Phase 4: Fixtures + validation (the acceptance evidence)

**Depends on:** Phase 3.

Author the two fixtures; run the happy path (`✓`) and the two negative paths (privacy throw, provenance-validation failure).

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `scenarios/validate.mjs`

- **IMPLEMENT**:
  1. Extract the per-package body of `validateScenarios` into an exported `export function validatePackage(dir, slug = basename(dir))` that runs `checkBrief` → `checkIntake` → `checkCopy` → `checkFixtures` → `COHERENCE[slug]?.(…)` and returns the same `{ slug, verdict, questions, collections, records }` result object. `validateScenarios` now loops the registry calling `validatePackage(join(ROOT, slug), slug)` and keeps the cross-scenario verdict-differ check (lines 278–280) — which is already guarded by `results.length > 1`, so it correctly no-ops in single-package mode.
  2. Make provenance the switch. In `checkBrief`, replace `if (head.fictional !== true) throw …` with `if (typeof head.fictional !== "boolean") throw new Error(\`${path}: head must declare "fictional": true|false (provenance is explicit — honesty contract)\`);`. Return `head` (unchanged otherwise).
  3. Thread `head` into copy checks: `checkCopy(dir, head)`. When `head.fictional === true`, keep the existing `fictionalNotice` checks verbatim. When `head.fictional === false`, instead require: `copy.speculativeNotice` non-empty AND matches `/speculative|public statements|not affiliated/i` (it must actually carry the disclaimer), AND `copy.sources` is a non-empty array of non-empty strings. Keep the `ethicsReveal` `{verdict, narrative}` check for both branches.
  4. Add a by-path CLI mode to the standalone block: if `process.argv[2]` is present, `const dir = resolve(process.argv[2]); const r = validatePackage(dir); console.log(\`scenario ${r.slug.padEnd(10)} ✓  ${r.questions} questions · ${r.collections} collections · ${r.records} records · verdict: ${r.verdict}\`);` — no registry read, no verdict-differ check. Else run `validateScenarios()` exactly as today.
- **PATTERN**: existing `validateScenarios` (lines 248–283); import `basename` from `node:path` (add to the existing import) and `resolve` (already imported? it imports `dirname, join` — add `basename, resolve`).
- **IMPORTS**: `import { dirname, join, basename, resolve } from "node:path";` (extend the existing line).
- **GOTCHA**: Do NOT move the verdict-differ check into `validatePackage` — it is inherently cross-package and must stay in `validateScenarios`. Keep `checkFixtures`' unreferenced-file and `<thing>Id` walk unchanged. `checkCopy` now takes a second arg — update its one call site.
- **VALIDATE**: `node scenarios/validate.mjs` → still prints `verdant … ✓`, `fieldwork … ✓`, `verdicts differ: habit-justified vs utility`, exit 0. `node scenarios/validate.mjs scenarios/verdant` → prints just verdant's `✓`, exit 0.
- **SATISFIES**: AC #2 (the compiler can self-validate by path), AC #3 (provenance enforcement lives here).

### UPDATE `agent-layer/lib.mjs` — add `parseCompanyBrief`

- **IMPLEMENT**: `export function parseCompanyBrief(briefPath)` returning `{ head, sections, dir }`. Steps (mirror `parseComponentSpec`):
  - `const path = resolve(briefPath); const text = readFileSync(path, "utf8");`
  - fence match (`/```json\s*\n([\s\S]*?)\n```/`) → `JSON.parse` in try/catch naming the path.
  - `const dir = dirname(path); const slug = basename(dir);` assert `head.slug === slug`.
  - assert `typeof head.fictional === "boolean"`.
  - assert non-empty strings: `name`, `domain`, `oneLiner`; assert `head.today` is `YYYY-MM-DD` (reuse a local `isoDay`-style check or a simple regex — validate.mjs does the calendar-accuracy check on the emitted file).
  - if `head.fictional === false`: assert `head.sources` is a non-empty array of non-empty strings.
  - assert `head.axes` present with `brandColor` (a string; leave the `#rrggbb`/vocab check to `validatePackage` on the emitted file to avoid duplicating the axes vocabulary) and the three axis keys present.
  - assert `head.intake` is an object with **all 8** canonical ids, each `{ default, reasoning }` non-empty (throw naming the offending id).
  - assert `head.screens` is a non-empty array, each `{ id, title }` non-empty and `collections` a non-empty array.
  - assert `head.copy` has non-empty `tagline` and `ethicsReveal.{verdict,narrative}`.
  - split `## ` sections (same as `parseComponentSpec` lines 102–109); assert the five required sections present: `["Product","Users","Problem","Behaviour model","Ethics position"]`.
  - return `{ head, sections, dir }`.
- **PATTERN**: `parseComponentSpec` (`agent-layer/lib.mjs:63-117`).
- **IMPORTS**: already has `existsSync, readFileSync` and `basename, dirname, join, resolve` — sufficient.
- **GOTCHA**: Structural/presence validation only here. Leave **semantic** axes-vocabulary + hex + calendar-date + fixture-coherence to `validatePackage` (run by the compiler on the emitted package) — this avoids duplicating the axes enum that already lives in `validate.mjs`. Document that split in a one-line comment.
- **VALIDATE**: after the fixture exists — `node -e "import('./agent-layer/lib.mjs').then(m=>{const b=m.parseCompanyBrief('agent-layer/fixtures/acme/brief.md');console.log('parsed',b.head.slug,Object.keys(b.head.intake).length,'ids',b.sections.length,'sections')})"` → `parsed acme 8 ids 5 sections`.
- **SATISFIES**: AC #1 (authoritative parser), Deliverable 1.

### UPDATE `.claude/references/kb-format.md` — document the record

- **IMPLEMENT**: Add a bullet to "The shapes" for `companies/<slug>/brief.md` — the company-brief record: JSON head (`slug`, `name`, `fictional` bool, `domain`, `oneLiner`, `today`, `sources` [required when `fictional:false`], optional `screenshotsDir`/`publishedTokens`/`application`, `axes`, `intake` [8 ids → `{default,reasoning}`], `screens`, `copy`) + the five prose sections `## Product/Users/Problem/Behaviour model/Ethics position`; sibling `fixtures/<collection>.json`. Note it is parsed authoritatively by `parseCompanyBrief` in `agent-layer/lib.mjs` and read (thin projection) by `portal/lib/kb.mjs`, and compiled to a scenario package by `agent-layer/gen-company-package.mjs`. Restate the sync rule.
- **PATTERN**: the existing bullets (lines 7–9) — same density, same "written by / read by" attributions.
- **GOTCHA**: keep it terse — this file is the 30-line index, not a spec dump. The full shape lives in `scenarios/README.md`.
- **VALIDATE**: `grep -c "brief.md" .claude/references/kb-format.md` ≥ 1; human read for accuracy.
- **SATISFIES**: AC #1 (kb-format documents the record shape).

### UPDATE `scenarios/README.md` — provenance modes + by-path validation

- **IMPLEMENT**: (1) Under "File shapes → `brief.md`", document `fictional: false` (real-provenance) as the alternative to `true`, and that real packages carry `copy.speculativeNotice` + `copy.sources` instead of `fictionalNotice`. (2) Add a short "Provenance" note near the honesty rule (lines 14–17): fictional and real subjects are the same format; real packages come from the company-brief compiler (`gen-company-package.mjs`) and are **never committed to this repo** (privacy boundary). (3) Note `node scenarios/validate.mjs [dir]` validates a single package directory (used by the compiler's self-check).
- **PATTERN**: existing "Honesty rule" block (lines 14–17) and the `copy.json` section (lines 81–86).
- **GOTCHA**: don't imply a real package is ever registered in `index.json` — it isn't; it's validated by path.
- **VALIDATE**: human read; `grep -n "speculativeNotice\|fictional: false\|privacy" scenarios/README.md`.
- **SATISFIES**: AC #1, AC #3 (documents the enforced labeling), AC #4 (documents the boundary).

### UPDATE `portal/lib/kb.mjs` — thin parse-in-sync

- **IMPLEMENT**: Add `export function parseBrief(slug)` that reads `companies/<slug>/brief.md` from `COMPANIES_DIR` via the existing `read` helper, and projects `{ name, fictional, oneLiner, sources, provenance }` using the already-exported `parseFencedJson` (+ `section` if you want a prose excerpt). Surface it on `cardFor(slug, {full})` as `card.brief = parseBrief(slug)` (null when no `brief.md`). Do **not** add routes, UI, or a management surface.
- **PATTERN**: `parseDecisions`/`parseOutcomes` (`portal/lib/kb.mjs:21-43`) and the `full`-mode enrichment (lines 113–121).
- **IMPORTS**: none new — `read`, `parseFencedJson`, `section`, `COMPANIES_DIR` already in scope.
- **GOTCHA**: `listCards` still keys off `intake.md` existence — do not change that (a brief without an intake shouldn't fabricate a card). This is purely additive: a company that *also* has a `brief.md` gains `card.brief`. Proves "both parsers parse the shape" (the sync rule) using the same physical primitives as `agent-layer/lib.mjs`.
- **VALIDATE**: `cd portal && node -e "import('./lib/kb.mjs').then(m=>console.log(typeof m.parseBrief))"` → `function`; portal still boots (`npm start` → `/api/health` → `{ok:true,…}`).
- **SATISFIES**: AC #1 (both parsers parse it — sync rule upheld).

### CREATE `agent-layer/gen-company-package.mjs` — the compiler

- **IMPLEMENT**: A header citing `docs/epics/per-company-brief.architecture.md` §Recommended approach (capability 2) + §Boundaries. Then:
  - Constant `QUESTION_CANON` — the 8-question skeleton (verbatim table in NOTES below): `[{id, stage, question, asked, bounds}, …]`.
  - `export function genCompanyPackage({ briefPath, outDir })`:
    1. `const { head, sections, dir } = parseCompanyBrief(briefPath);`
    2. **Privacy guard** (mirror `server.mjs` containment; see Patterns): compute `outAbs = path.resolve(outDir, head.slug)`; if `head.fictional === false` and `outAbs` is inside `REPO_ROOT` → throw. Do this **before** any write.
    3. `mkdirSync(join(outAbs), { recursive: true })` and `mkdirSync(join(outAbs,"fixtures"),{recursive:true})`.
    4. **`intake.defaults.json`**: `questions = QUESTION_CANON.map(q => ({ id:q.id, stage:q.stage, question:q.question, default: head.intake[q.id].default, reasoning: head.intake[q.id].reasoning, bounds:q.bounds, asked:q.asked }))`; `axes = head.axes`. Write `{ questions, axes }`.
    5. **`copy.json`**: base `{ tagline: head.copy.tagline, ethicsReveal: head.copy.ethicsReveal, ...(head.copy.stations && {stations}), ...(head.copy.prototype && {prototype}) }`. Then provenance notice: if `head.fictional === true` → `fictionalNotice` (pass `head.copy.fictionalNotice` through if present, else template `"${head.name} is a fictional product, invented for this demonstration. No real company, users, or data are involved."`). If `false` → `speculativeNotice` (template: `"Speculative work based on ${head.name}'s public statements. Sources linked below. Not affiliated with or endorsed by ${head.name}."`) + `sources: head.sources`.
    6. **`proto.config.json`**: `{ screens: head.screens, slots: [] }`.
    7. **`brief.md`** (lean output): head `{ slug, name, fictional, domain, oneLiner, today }` as a ```json fence, followed by the five prose sections copied from `sections` (re-emit each as `## <title>\n\n<body>`).
    8. **fixtures**: `readdirSync(join(dir,"fixtures"))` → copy each `.json` to `outAbs/fixtures/` (read+`JSON.parse`+re-`stringify` for a normalized write, or `copyFileSync` — either; prefer copyFileSync for byte-fidelity).
    9. **token pack (optional)**: if `head.publishedTokens` → `copyFileSync(join(dir, head.publishedTokens), join(outAbs, head.publishedTokens))`; record it in the return stats.
    10. **self-validate**: `const r = validatePackage(outAbs, head.slug);` (imported from `../scenarios/validate.mjs`). Return `{ slug: head.slug, outAbs, provenance: head.fictional ? "fictional" : "real", tokens: head.publishedTokens || null, ...r }`.
  - CLI block (standalone guard, `pathToFileURL`): parse `process.argv[2]` = brief path (resolved from cwd — run-from-jobs-folder convention), `--out <dir>` (default: for a fictional brief, default to `process.argv`-required or a sensible local default; there is no safe repo default for real, so **require** `--out` — throw a clear error if absent). Print `company package ${slug.padEnd(10)} ✓  ${provenance} · ${questions} questions · ${collections} collections · ${records} records${tokens ? " · pack "+tokens : ""} → ${outAbs}`. `process.exit(1)` on throw with `console.error(\`company package ✗  ${e.message}\`)`.
- **PATTERN**: `gen-token-css.mjs` (path resolution + guard), `gen-tokens.mjs` (return+log), `build.mjs` (argv[2]=input path from cwd).
- **IMPORTS**: `import { mkdirSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";` · `import path, { dirname, join, resolve, basename } from "node:path";` · `import { fileURLToPath, pathToFileURL } from "node:url";` · `import { parseCompanyBrief } from "./lib.mjs";` · `import { validatePackage } from "../scenarios/validate.mjs";`
- **GOTCHA**: (a) `import "../scenarios/validate.mjs"` is safe — its CLI block is behind the standalone guard, so importing does not run validation. (b) Resolve the input brief path and `--out` from **cwd** (so it works from the jobs folder), but resolve `REPO_ROOT` from the **module** (`fileURLToPath(import.meta.url)`). (c) `--out` is **required** — never default a real package anywhere near the repo. (d) The output package must have **no orphan fixtures**: every `fixtures/*.json` must be named by some `screens[].collections` (validate enforces it) — the fixture brief's `screens` must cover its `fixtures/` exactly. (e) Overwrite semantics: re-running regenerates the package dir (mkdir recursive + overwrite) — do not merge.
- **VALIDATE**: `node agent-layer/gen-company-package.mjs agent-layer/fixtures/acme/brief.md --out "$SCRATCH"` → prints `company package acme ✓ fictional · 8 questions · … → …/acme`, exit 0; then `node scenarios/validate.mjs "$SCRATCH/acme"` → `✓`, exit 0.
- **SATISFIES**: AC #2 (compiler → valid package + ✓), AC #4 (privacy guard), Deliverable 2.

### CREATE `agent-layer/fixtures/acme/brief.md` (+ `fixtures/`) — fictional happy path

- **IMPLEMENT**: A well-formed fictional company-brief. Head: `slug:"acme"`, `name:"Acme"`, `fictional:true`, a `domain`, `oneLiner`, a real `today` (e.g. `"2026-07-19"`), `axes` (valid vocab: e.g. `{brandColor:"#3355CC",density:"comfortable",rewardType:"self",frequency:"daily",improvesLives:true,wouldUseIt:true}`), `intake` with all 8 ids → short `{default,reasoning}`, `screens:[{id,title,collections:["items"]}]`, `copy:{tagline, ethicsReveal:{verdict:"habit-justified",narrative}}`. Five prose sections. Sibling `fixtures/items.json`: a non-empty array of records each with unique `id`, coherent absolute dates around `today`, and — to keep the generic walk trivial — **no dangling `<thing>Id` fields** (either no `*Id` fields, or a second collection so `itemId`→`items` resolves). Keep it tiny (3–4 records).
- **PATTERN**: `scenarios/verdant/brief.md` (head + sections) + `scenarios/verdant/fixtures/plants.json` (record shape). Reuse the canonical question texts from NOTES for realism (they'll be overwritten by the compiler's canon anyway — only `default`/`reasoning` matter).
- **GOTCHA**: `today` and every fixture date must be a **real calendar date** (validate walks them). `ethicsReveal.verdict` is free-form for a single package (the verdict-differ check only fires with >1 registered scenario, which never happens here).
- **VALIDATE**: covered by the compiler run above.
- **SATISFIES**: AC #2 (the fixture brief that compiles to a passing package).

### CREATE `agent-layer/fixtures/northwind-real/brief.md` (+ `fixtures/`) — real-provenance test stub

- **IMPLEMENT**: Same shape as `acme` but `slug:"northwind-real"`, `fictional:false`, add `sources:["https://example.com/northwind/vision"]`. Add a prose line in `## Product`: *"Test stub — fictional content exercising the real-provenance code path; never shipped."* Keep fixtures tiny (one `items` collection).
- **PATTERN**: the `acme` fixture.
- **GOTCHA**: This brief can be **parsed** and can trigger the privacy guard, and can be compiled to a scratch dir *outside* the repo. It must never be compiled into the repo — which the guard enforces (that's the AC #4 test).
- **VALIDATE**: the two negative-path commands below.
- **SATISFIES**: AC #3 + AC #4 (the fixtures that exercise the enforced branches).

---

## TESTING STRATEGY

No unit-test framework exists (project rule: "run the surface you touched"). "Tests" here are deterministic CLI runs with asserted exit codes and `✓`/`✗` output.

### Happy path (AC #2)

- Compile `acme` to a scratch dir → compiler prints `✓`, exit 0.
- `node scenarios/validate.mjs <scratch>/acme` → independent `✓`, exit 0.
- Confirm the emitted `intake.defaults.json` has exactly the 8 canonical ids with per-question `reasoning` + the `axes` block (this is the "consumable unchanged by the wizard shape" check — `checkIntake` passing *is* that contract).

### Negative paths (the acceptance evidence — AC #3, AC #4)

- **AC #4 (privacy guard):** `node agent-layer/gen-company-package.mjs agent-layer/fixtures/northwind-real/brief.md --out .` → compiler throws, non-zero exit, message names the refused path. (The guard fires before any write, so nothing lands in the repo — verify `git status` is clean after.)
- **AC #3 (provenance enforcement):** compile `northwind-real` to scratch (passes — it has sources + the templated speculative notice) → then strip `sources` from the scratch `copy.json` via `node -e` → `node scenarios/validate.mjs <scratch>/northwind-real` → non-zero exit, message names the missing `sources`/`speculativeNotice`.

### Regression

- `node scenarios/validate.mjs` (no args) → Verdant + Fieldwork `✓` + `verdicts differ`, exit 0 (proves the refactor didn't change registry behavior).
- **CI drift-check unaffected — verified.** `tooling/drift-check.mjs` enumerates generators by an **explicit named-import list** (`genTokenCss`, `genHandoff`, `genVocabulary`, `genPackBundle`, `validateScenarios`, `validateTrace` — lines 13–18), **not** a `gen-*.mjs` glob, so the new generator is never auto-run in CI. Its only two touchpoints are both safe: (a) `checkSyntax()` runs `node --check` over every tracked `.mjs` (harmless — the file just has to parse, covered by Level 1); (b) `checkScenarios()` calls the `validateScenarios` export, which the Phase-1 refactor preserves unchanged. The committed fixtures are `.md`/`.json` under `agent-layer/fixtures/`, so they are invisible to `checkScenarios` (registry-scoped to `scenarios/index.json`), `token-lint.mjs` (system CSS only), and the visual gate (shipped pages only). **No drift-check exclusion is required — do not add one.**
- `node tooling/drift-check.mjs` → still prints `drift-check ✓ syntax · token-css · handoff · scenarios · traces`, exit 0 (the authoritative no-regressions proof; requires `tooling/style-dictionary/node_modules` — run `npm ci` there first, as `verify.yml` does).
- `agent-layer/build.mjs` unaffected (grep to confirm no import of the new generator was added).
- Portal boots + `/api/health` answers (proves `kb.mjs` change is safe).

### Edge cases to exercise

- Brief missing one of the 8 intake ids → `parseCompanyBrief` throws naming the id.
- Brief with `fictional` absent → throws (explicit-provenance rule).
- Real brief with empty `sources` → `parseCompanyBrief` throws (or, if it slips through, `validatePackage` rejects the emitted package).
- Fixture with an orphan collection (a `fixtures/x.json` no screen references) → `validatePackage` throws (existing check, now exercised via the emitted package).

---

## VALIDATION COMMANDS

Run from the repo root. `SCRATCH` = the session scratchpad (outside the repo, so fictional compiles don't dirty git and the real stub can compile there).

```bash
SCRATCH="/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/f654515b-c3e6-4763-815b-92de6df49a3c/scratchpad/pkg"
```

### Level 1: Syntax & Style
```bash
node --check agent-layer/gen-company-package.mjs
node --check agent-layer/lib.mjs
node --check scenarios/validate.mjs
node --check portal/lib/kb.mjs
```

### Level 2: Unit-equivalent (parser + regression)
```bash
node -e "import('./agent-layer/lib.mjs').then(m=>{const b=m.parseCompanyBrief('agent-layer/fixtures/acme/brief.md');console.log('parse',b.head.slug,Object.keys(b.head.intake).length,b.sections.length)})"
node scenarios/validate.mjs            # registry: verdant + fieldwork ✓, verdicts differ, exit 0
( cd tooling/style-dictionary && npm ci >/dev/null 2>&1 ) ; node tooling/drift-check.mjs   # ✓ syntax · token-css · handoff · scenarios · traces (authoritative no-regressions gate)
```

### Level 3: Integration (compile → validate)
```bash
node agent-layer/gen-company-package.mjs agent-layer/fixtures/acme/brief.md --out "$SCRATCH"     # ✓ fictional
node scenarios/validate.mjs "$SCRATCH/acme"                                                       # ✓ by-path
```

### Level 4: Negative paths (acceptance evidence)
```bash
# AC#4 — privacy guard blocks a real package inside the repo (expect non-zero + clean git)
node agent-layer/gen-company-package.mjs agent-layer/fixtures/northwind-real/brief.md --out . ; echo "exit=$?" ; git status --porcelain

# AC#3 — validator rejects a real package with sources stripped (expect non-zero)
node agent-layer/gen-company-package.mjs agent-layer/fixtures/northwind-real/brief.md --out "$SCRATCH"
# --input-type=module: robust regardless of any future root package.json (no CommonJS require)
node --input-type=module -e "import fs from 'node:fs';const f='$SCRATCH/northwind-real/copy.json';const c=JSON.parse(fs.readFileSync(f));delete c.sources;fs.writeFileSync(f,JSON.stringify(c,null,2))"
node scenarios/validate.mjs "$SCRATCH/northwind-real" ; echo "exit=$?"
```

### Level 5: Portal smoke
```bash
cd portal && npm start &   # then:
curl -s localhost:4747/api/health   # {"ok":true,…}
```

---

## ACCEPTANCE CRITERIA

Mapped 1:1 to the ticket's four criteria:

- [ ] **AC #1 — record documented + both parsers parse it (sync upheld).** `kb-format.md` + `scenarios/README.md` document the company-brief record and provenance modes; `parseCompanyBrief` (agent-layer) and `parseBrief` (portal, via `parseFencedJson`/`section`) both read the shape.
- [ ] **AC #2 — compiler → passing package + ✓.** `gen-company-package.mjs` turns the `acme` fixture into a package that passes `node scenarios/validate.mjs <dir>` and prints its `✓`; the emitted `intake.defaults.json` (8 canonical ids with `default`/`reasoning`/`bounds` + `axes`) is `checkIntake`-clean (consumable unchanged by the wizard shape).
- [ ] **AC #3 — provenance labeling enforced.** A real-provenance package missing `speculativeNotice` or `sources` fails `validate.mjs` (demonstrated by the sources-strip test).
- [ ] **AC #4 — nothing company-real committed to this repo.** The privacy guard throws when a `fictional:false` package would be written inside the repo (demonstrated; `git status` clean after). Only fictional fixtures are committed.
- [ ] All validation commands pass; `node scenarios/validate.mjs` (no args) unchanged; portal boots; no `build.mjs` registration added.
- [ ] Code follows conventions: zero-dep Node ESM, throw-naming-the-path, file header citing the governing doc, `pathToFileURL` standalone guard.

---

## COMPLETION CHECKLIST

- [ ] Phase 1 (validator refactor) landed and no-arg run is byte-identical in behavior.
- [ ] `parseCompanyBrief` added; `kb-format.md` + `scenarios/README.md` updated.
- [ ] `portal/lib/kb.mjs` thin sync added; portal boots.
- [ ] Compiler written; happy path + both negatives pass.
- [ ] Two fixtures committed; nothing real committed; `git status` clean of scratch output.
- [ ] All five validation levels executed successfully.
- [ ] Reviewed for KISS: no `build.mjs` registration, no index.json/worker edits, no portal UI, no axes-vocab duplication beyond what already exists.

---

## OPEN QUESTIONS / ASSUMPTIONS

These are **decisions**, not blockers — recorded with rationale so the review can veto any single one without unpicking the plan.

1. **Input-record shape = a rich `brief.md` head (superset of the scenario brief) + sibling `fixtures/`.** The architecture gives the field *list* but not the physical shape. I chose: machine data (axes, the 8 `(default,reasoning)` pairs, screens, copy essentials, provenance/sources) in the JSON head; narrative in the five prose sections; bulk mock data as sibling `fixtures/*.json` (markdown heads are the wrong home for arrays). This is the leanest shape that compiles deterministically to a *valid* package. **Risk: low** — it mirrors the existing kb JSON-head convention exactly.
2. **"token-pack reference" = copy-through only.** #39 emits `axes` always and copies an optional pre-existing `publishedTokens` CSS through verbatim. Deriving a pack from screenshots is #40; swapping it in at view time is #43. If the reviewer intended #39 to also derive, that's a scope change to flag — but the epic explicitly splits derivation into #40. **Risk: low.**
3. **Validate out-of-registry, not as a third scenario.** Confirmed by the files-touched list excluding `index.json` + `worker/fixtures.mjs`, and by avoiding shipped-surface/visual-regression churn. **Risk: very low.**
4. **Provenance discriminant = `fictional: boolean` (required, explicit).** Straight from the ticket's own wording; minimal churn to the existing `checkBrief`. **Risk: very low.**
5. **Two fixtures committed** (`acme` fictional + `northwind-real` real-labeled stub) though the ticket says "one." The second is negative-path test scaffolding — and the advisor was explicit that the negatives *are* the acceptance evidence. Both are fictional content; `northwind-real` merely carries a real-provenance label to exercise that branch and cannot, by the guard, be compiled into the repo. If strict one-fixture is preferred, the real stub can instead be authored to scratch inside the validation step (less one-pass-reliable). **Risk: low.**
6. **Semantic axes validation deferred to `validatePackage`** rather than duplicated in `parseCompanyBrief`, to avoid a second copy of the axes vocabulary. Consequence: a bad axes value surfaces as a validate error on the *emitted* `intake.defaults.json`, not the brief. **Risk: low** (acceptable error attribution; the vocab stays single-sourced in `validate.mjs`). *Partial-write caveat:* because self-validation runs **after** the files are written, a brief that only fails the post-emit check leaves a half-written package on disk. Harmless for the fictional scratch tests; for a **real** compile into the jobs folder, add a one-line note in the compiler's CLI catch block that a self-validation throw means "discard the output dir" (or wrap emit-then-validate so a throw removes `outAbs`). Don't restructure the happy path for it.

## NOTES (open canvas)

**The load-bearing finding — the canonical 8-question skeleton.** Diffing `scenarios/verdant/intake.defaults.json` against `scenarios/fieldwork/intake.defaults.json` (verified programmatically): the `stage`, `question` text, `asked`, and `bounds` are **identical for every one of the 8 ids**; only `default`, `reasoning`, and the `axes` values differ. So the compiler owns the skeleton and the brief carries only the per-company deltas. This is why "consumable unchanged by the wizard shape" is guaranteed rather than hoped-for: the compiler *controls* the structural fields.

`QUESTION_CANON` (copy verbatim into the compiler — extracted from the existing packages):

```js
const QUESTION_CANON = [
  { id: "problem",          stage: "discovery",   asked: false, bounds: null,
    question: "What problem are users solving with your product?" },
  { id: "current-solution", stage: "discovery",   asked: false, bounds: null,
    question: "How do they solve it today, and why does that need replacing?" },
  { id: "named-user",       stage: "discovery",   asked: false, bounds: null,
    question: "Who exactly is the user — can you name a real person who needs this?" },
  { id: "target-behavior",  stage: "behaviour",   asked: true,  bounds: ["multiple-daily","daily","weekly","monthly","rarely"],
    question: "What's the one behavior you want to become routine? How often would it realistically occur?" },
  { id: "internal-trigger", stage: "behaviour",   asked: true,  bounds: null,
    question: "5 Whys: what emotion or moment actually cues that behavior?" },
  { id: "friction",         stage: "friction",    asked: false, bounds: ["time","money","effort","confusion","social deviance","novelty"],
    question: "From trigger to payoff, how many steps? Which of time / money / effort / confusion / social deviance / novelty limits users most?" },
  { id: "success-signals",  stage: "success",     asked: false, bounds: null,
    question: "What early signal would prove it's working, and what slower outcome sits behind it?" },
  { id: "ethics-gate",      stage: "ethics-gate", asked: true,  bounds: null,
    question: "Does it materially improve users' lives — and would you use it yourself?" },
];
```

**Data flow:**

```
company-brief.md (jobs folder, or agent-layer/fixtures/<slug>/ for the test)
  ├─ head.intake{8×(default,reasoning)} + QUESTION_CANON  ─►  intake.defaults.json.questions
  ├─ head.axes                                            ─►  intake.defaults.json.axes
  ├─ head.copy + provenance(head.fictional, head.sources) ─►  copy.json (fictionalNotice | speculativeNotice+sources)
  ├─ head.screens                                         ─►  proto.config.json {screens, slots:[]}
  ├─ head{slug,name,fictional,domain,oneLiner,today} + prose ─► brief.md (lean)
  ├─ <briefDir>/fixtures/*.json                           ─►  <out>/<slug>/fixtures/* (copy)
  └─ head.publishedTokens? (CSS)                          ─►  <out>/<slug>/<pack>.css (copy)  [token-pack reference]
                                   │
                                   ▼
                    validatePackage(<out>/<slug>)  ──►  ✓  (self-check; also `node scenarios/validate.mjs <dir>`)
```

**Why the privacy guard is a *guard*, not a doc line.** AC #4 ("nothing company-real committed to this repo") is testable only if violating it *fails*. Mirroring `server.mjs`'s containment check turns the boundary into an enforced invariant and doubles as portfolio evidence (the same honesty-by-construction posture as the redaction layer and the drift-check gate). It fires before any filesystem write, so a blocked real compile leaves the repo untouched.

**Alternatives weighed and rejected:**
- *Register the compiled package as a real third scenario* — rejected: forces `index.json` + `worker/fixtures.mjs` edits (outside the ticket's files-touched), churns visual-regression baselines, and conflates "test artifact" with "shipped scenario."
- *A `provenance: "fictional"|"real"` enum* — rejected: the ticket speaks in `fictional: true/false`; a boolean is less churn on the existing `checkBrief`.
- *Duplicate the full axes vocabulary in `parseCompanyBrief`* — rejected: `validate.mjs` already single-sources it; the emitted package flows through it anyway.

**Confidence: 9.5/10** for one-pass success. The 0.5 reservation is entirely the input-record shape (Assumption #1) — a genuine design choice the architecture left open, mitigated by mirroring the established kb convention and by the compiler self-validating its own output against the very validator the reviewer will run. Every output shape is pinned to a diff-able existing file; every acceptance criterion has an executable, exit-code-asserted command; the two hard boundaries (privacy, provenance) are enforced and negatively tested rather than asserted.

## AMENDMENTS

- (none yet — created 2026-07-19)
