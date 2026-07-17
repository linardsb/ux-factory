# Feature: Scenario packages (Verdant + Fieldwork) + Worker mock API + fixture fallback

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The demo subjects and their data, servable. This ticket defines the **scenario-package format** — the in-repo content unit that makes "adding a scenario = adding content, not engine work" true — and authors both packages: **Verdant** (consumer plant care, the primary scenario) and **Fieldwork** (B2B field-service scheduling), deliberately ruling **differently** at the Hooked frequency/ethics filter. It also builds the platform's only server-side piece: **one Cloudflare Worker** serving the committed JSON fixtures as a public, read-only GET mock API, plus a client fetch helper that degrades to the same committed static fixtures when the Worker is unreachable.

Everything downstream consumes this: #8 renders prototypes from the fixtures via the helper, #10's intake wizard reads the intake defaults, #3's derivation engine takes the bounded axes, #13's agentic study runs on Fieldwork's heavy-ops data.

## User Story

As a hiring manager visiting the Factory page
I want the demo product to be a coherent fictional scenario with real, fetchable data behind its prototypes
So that the "data-connected prototype" claim is something I can verify (watch the API answer, inspect the fixtures in the repo) rather than take on faith.

## Problem Statement

The pipeline the platform performs (intake → design system → prototype → handoff) needs subjects to run on. Today the repo has no scenario content, no data source, and no defined shape for either. Downstream tickets (#8 prototypes, #10 Factory page, #13 agentic study) are blocked on: (a) a stable package format they can consume from the browser, (b) authored content for two scenarios whose ethics verdicts differ, and (c) a data endpoint that can never fail on stage.

## Solution Statement

- **Format:** a `scenarios/<slug>/` directory of plain committed files — `brief.md` (kb-style record: JSON head + `##` prose), plus browser-consumable JSON (`intake.defaults.json`, `copy.json`, `proto.config.json`, `fixtures/*.json`) — documented in `scenarios/README.md` and hand-validated by a zero-dep `scenarios/validate.mjs` (project rule: no schema lib, throw Errors naming the offending path).
- **Content:** Verdant passes the frequency filter (near-daily internal-trigger use → habit loop justified, "facilitator" on the Manipulation Matrix); Fieldwork's use is work-demand-driven and externally triggered → the same method rules **against** habit mechanics and for an efficiency utility. Both copy decks carry a visible fictional-scenario notice (honesty surface #1).
- **Worker:** `worker/api.mjs` + `worker/wrangler.jsonc` — `GET /api/:scenario/:collection`, fixture-backed via a static import manifest, CORS-open, read-only, no user data. Local dev via `wrangler dev`.
- **Fallback:** `system/scenario-data.mjs` (hand-written ES module beside `site.js`, per CLAUDE.md view-time rule) tries the Worker with a timeout, falls back to same-origin static fixtures, and reports which source answered — feeding honesty surface #3 (capability indicators) downstream.

## Out of Scope / Non-Goals

- **Not deploying the Worker to production.** AC requires `wrangler dev` locally; the production URL lands in the helper's constant after first deploy (documented placeholder until then).
- **Not building prototype screens** — that's #8. `proto.config.json` declares screens/collections; rendering them is not this ticket.
- **Not building the intake wizard or scenario toggle** — that's #10. This ticket ships defaults + reasoning as data only.
- **Not the derivation engine or ethics-verdict logic** — that's #3. This package provides the bounded *inputs* (axes); the engine derives the verdicts.
- **Not changing** `system/components.css`, `tokens.*`, `site.js`, the portal, or `agent-layer/` generators.
- **No POST/write API, no user data, no auth** — architecture §Boundaries pins the Worker as public read-only GET.
- **No images/photo assets in fixtures** — text data only; keeps packages light and honest.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (technically low-risk; content-heavy)
**Primary Systems Affected**: new `scenarios/` (content), new `worker/` (mock API), `system/` (one new ES module), `_headers`, `CLAUDE.md` architecture map
**Dependencies**: `wrangler` via npx (dev-time only; already the deploy tool). Zero runtime deps anywhere — Worker and helper are vanilla.

## Related Work

**Implements**: [linardsb/ux-factory#4](https://github.com/linardsb/ux-factory/issues/4) — PR closes with `Closes #4`
**Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Data model — Scenario package · §Boundaries — Worker · §Stack — Cloudflare Pages + one Worker). These are **inherited decisions, not re-decided here.**

**Back-references** (plans this builds on or inherits decisions from):

- None — first plan in `.claude/plans/`. Inherits directly from the epic architecture doc.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — #8 data-connected prototypes and #10 Factory page will consume this package; their plans should back-reference this file)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `docs/epics/ai-first-ux-factory.architecture.md` (lines 27–49) — Why: §Stack, §Data model, §Boundaries are the inherited decisions this ticket implements; line 38 is the scenario-package definition, line 45 the Worker contract.
- `docs/epics/ai-first-ux-factory.prd.md` (§6, "Intake question set — draft v1" table, around line 75) — Why: **the source for intake defaults** — 8 questions with stage + Hooked source; per-ticket context pins this table as the origin.
- `agent-layer/gen-token-css.mjs` (lines 1–14, 36–52, and the tail) — Why: the house pattern to MIRROR for `validate.mjs`: header citing governing doc, boundary validation throwing Errors that name the offending path (`loadSource`), `pathToFileURL` standalone-run guard (repo path contains a space — the naive `file://` comparison fails), and the aligned `✓`/`✗` log line.
- `agent-layer/lib.mjs` (lines 1–30) — Why: zero-dep parser style + error convention (`throw new Error(\`${path}: what's wrong\`)`).
- `portal/lib/intake.mjs` (lines 28–33, 66–89) — Why: the hand-validation-at-the-boundary pattern (`if (!company) throw…`) and the kb record shape being written (JSON head inside a markdown file) — `brief.md` follows this shape.
- `.claude/references/kb-format.md` (whole file, 14 lines) — Why: the record convention (leading ```json fence + `##` prose) that `brief.md` reuses; note ComponentSpec already reuses it (decided in the epic), so scenario briefs following suit is consistent, not novel.
- `system/site.js` (lines 1–20) — Why: header comment style and the "hand-written canon" register for `system/scenario-data.mjs`, which lives beside it.
- `index.html` (lines 13–17, 112–114) — Why: how shipped pages load the system CSS trio and scripts — `scenarios/check.html` mirrors this shell.
- `_headers` (whole file, 15 lines) — Why: cache-rule format for the `/scenarios/*` addition.
- `CLAUDE.md` (§Architecture map, §Where new code goes, §Ground rules) — Why: placement rules this plan follows — view-time behaviour = ES module beside `site.js`; errors = plain `Error` naming path; deploy = commit the artifacts; honesty contract.

### New Files to Create

- `scenarios/README.md` — the scenario-package format spec (satisfies "format documented" AC); written FIRST, it is the contract everything else conforms to
- `scenarios/index.json` — scenario registry: slug/name/label per scenario + API base URLs (prod placeholder + local)
- `scenarios/validate.mjs` — zero-dep hand validator; `node scenarios/validate.mjs` prints a `✓` line per package or exits 1
- `scenarios/verdant/brief.md` — fictional brief (JSON head + prose), labeled fictional
- `scenarios/verdant/intake.defaults.json` — 8 PRD questions with default + reasoning + bounds, plus the `axes` block
- `scenarios/verdant/copy.json` — rendered strings incl. `fictionalNotice` (honesty surface #1) and ethics-reveal copy
- `scenarios/verdant/proto.config.json` — screens + collections the Verdant prototype (#8) will use
- `scenarios/verdant/fixtures/plants.json`, `scenarios/verdant/fixtures/care-tasks.json` — mock data
- `scenarios/fieldwork/brief.md`, `intake.defaults.json`, `copy.json`, `proto.config.json` — same shape, opposite verdict
- `scenarios/fieldwork/fixtures/jobs.json`, `technicians.json`, `schedule.json` — heavy-ops data (also feeds #13's dashboards)
- `worker/wrangler.jsonc` — Worker config (name `factory-ux-api`, main `api.mjs`)
- `worker/fixtures.mjs` — static import manifest: `{ verdant: { plants, 'care-tasks' }, fieldwork: { jobs, technicians, schedule } }`
- `worker/api.mjs` — the fetch handler: `GET /api/health`, `GET /api/:scenario/:collection`, CORS, 404/405
- `system/scenario-data.mjs` — client fetch helper with static-fixture fallback
- `scenarios/check.html` — bare shipped test page driving the helper end to end (mirrors #3's "bare test page to drive it")

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Local `wrangler` skill (Skill tool) — load **before running any wrangler command**; it pins current syntax.
- [Workers fetch handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/) — Why: the `export default { fetch(request, env) }` shape for `api.mjs`.
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) — Why: minimal `wrangler.jsonc` fields (`name`, `main`, `compatibility_date`).
- [Wrangler bundling](https://developers.cloudflare.com/workers/wrangler/bundling/) — Why: confirms JSON imports are bundled by default — the mechanism `fixtures.mjs` relies on (static `import data from "../scenarios/…/fixtures/x.json"`).
- [CORS header example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/) — Why: header set for the public GET API (`Access-Control-Allow-Origin: *` is sufficient for simple GETs; no preflight needed for header-less GET requests).
- Hooked frequency filter / Manipulation Matrix — no external doc needed; the PRD §6 table cites the exercises (Ex 1.5–1.6 frequency, Ex 6 ethics). Content is authored against those framings.

### Patterns to Follow

**File headers** (feature/entry files cite their governing doc — CLAUDE.md ground rule):

```js
// worker/api.mjs — fixture-backed mock API (epic #1, ticket #4).
// Architecture §Boundaries: public, read-only GET, no user data — the site must
// degrade to static fixtures if this Worker is down (system/scenario-data.mjs).
```

**Boundary validation + errors** (from `agent-layer/gen-token-css.mjs:36-52`): hand checks, no schema lib, every throw names the offending path:

```js
if (!q.reasoning) throw new Error(`${file}: question "${q.id}" has no reasoning — the wizard shows default AND why`);
```

**Standalone-run guard** (from `gen-token-css.mjs` tail — the repo path contains a space, so use `pathToFileURL`):

```js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { … }
```

**Log lines** (aligned name + ✓, matching build.mjs style): `scenario verdant    ✓  8 questions · 2 collections · 34 records`

**kb record shape** (for `brief.md`, from `.claude/references/kb-format.md` + `portal/lib/intake.mjs:66-89`): markdown, leading ```json fence as machine head, `##` prose sections after.

**Error responses** (mirror `portal/server.mjs` boundary): unknown route → `{ "error": "unknown scenario \"x\"" }` JSON, status 404.

---

## IMPLEMENTATION PLAN

### Phase 1: Format contract

Write `scenarios/README.md` first — it IS the format spec the AC asks for, and every later file conforms to it. Then the registry (`index.json`).

### Phase 2: Content — the two packages

**Depends on:** Phase 1 (files conform to the documented shape)

Author Verdant fully, then Fieldwork (same shape, different verdict). This is the content-heavy half; write briefs/copy in the project's register (plain, honest, no marketing veneer — see `index.html` copy for tone).

### Phase 3: Validator

**Depends on:** Phase 2 (validates the real packages)

`scenarios/validate.mjs`, zero-dep, mirroring the `gen-token-css.mjs` pattern.

### Phase 4: Worker + client helper + check page

**Depends on:** Phase 2 (serves the fixtures). **Independent of:** Phase 3 — could be built in parallel with the validator.

Worker, manifest, wrangler config; then `system/scenario-data.mjs`; then `scenarios/check.html` to drive both paths.

### Phase 5: Integration touches + full validation

`_headers` cache rule, CLAUDE.md architecture-map entries, run every validation command.

---

## STEP-BY-STEP TASKS

### CREATE `scenarios/README.md`

- **IMPLEMENT**: The scenario-package format spec. Document: directory layout (`brief.md`, `intake.defaults.json`, `copy.json`, `proto.config.json`, `fixtures/*.json`); each file's shape and required fields (below); the registry (`index.json`); how to add a third scenario (clone a package dir + one registry entry — no engine work); who consumes what (#3 axes, #8 fixtures via helper, #10 defaults + copy, #13 fieldwork data); the honesty rule (every `copy.json` MUST carry a non-empty `fictionalNotice`; `brief.md` head MUST carry `"fictional": true`).
- **Required shapes to pin in the doc** (the contract `validate.mjs` enforces):
  - `brief.md` — kb record: leading ```json head `{ "slug", "name", "fictional": true, "domain", "oneLiner" }` + `## Product` / `## Users` / `## Problem` / `## Behaviour model` / `## Ethics position` prose sections.
  - `intake.defaults.json` — `{ "questions": [ { "id", "stage", "question", "default", "reasoning", "bounds", "asked" } ], "axes": { "brandColor", "density", "rewardType", "frequency" } }`. The 8 `id`s, fixed, from the PRD §6 table: `problem`, `current-solution`, `named-user`, `target-behavior`, `internal-trigger`, `friction`, `success-signals`, `ethics-gate`. `asked: true|false` is a *hint* for #10's 3–5-question cut (final cut is #10's call). `bounds` = array of allowed override options where the axis is bounded, else `null`. `axes` are the derivation-engine inputs (architecture §Recommended approach: brand color → palette, density → scales, reward type → patterns, frequency → ethics verdict).
  - `copy.json` — `{ "fictionalNotice", "tagline", "ethicsReveal": { "verdict", "narrative" }, "stations": { … } }` — flat string map beyond the required keys; #10 renders these.
  - `proto.config.json` — `{ "screens": [ { "id", "title", "collections": [ … ] } ], "slots": [ … ] }` (`slots` only for Fieldwork's hybrid canvas — placeholder region ids at this stage; #8 designs them).
  - `fixtures/<collection>.json` — an array of objects, each with a unique `id`.
- **PATTERN**: register/format docs read like `.claude/references/kb-format.md` — short, declarative, "the filesystem is the database".
- **GOTCHA**: `axes` value vocabularies (`density`, `rewardType`, `frequency`) are a **seam with #3** (parallel Wave-1 ticket). Pin the *keys* as contract, list proposed values (`density: comfortable|compact`, `rewardType: tribe|hunt|self|none`, `frequency: daily|weekly|monthly|on-demand`), and note explicitly: "value enums reconcile with the derivation engine (#3) at Factory-page integration (#10); strings here, so no code breaks."
- **VALIDATE**: `test -s scenarios/README.md && head -5 scenarios/README.md`
- **SATISFIES**: AC #1 (format documented), AC #4 (adding-a-scenario path documented)

### CREATE `scenarios/index.json`

- **IMPLEMENT**: `{ "scenarios": [ { "slug": "verdant", "name": "Verdant", "label": "Plant care · consumer" }, { "slug": "fieldwork", "name": "Fieldwork", "label": "Field-service scheduling · B2B" } ], "api": { "prod": "", "local": "http://127.0.0.1:8787" } }`. `api.prod` stays `""` until the Worker's first deploy (out of scope); the helper treats `""` as "skip Worker, go static".
- **VALIDATE**: `node -e "const i=JSON.parse(require('node:fs').readFileSync('scenarios/index.json')); if(i.scenarios.length!==2) throw new Error('want 2 scenarios')"`
- **SATISFIES**: AC #4

### CREATE `scenarios/verdant/` package (brief, defaults, copy, config, fixtures)

- **IMPLEMENT** (content intent — final prose authored here, at implementation, in the project's register):
  - `brief.md`: Verdant, a consumer plant-care companion. Named user persona; problem = plants die from irregular care; today = memory + sticky notes. **Behaviour model**: check-in is near-daily (internal trigger: low-grade worry/nurture impulse), care actions weekly → inside the habit zone (Hooked Ex 1.5–1.6) → habit loop **justified**. **Ethics position**: materially improves users' lives, builder would use it → *facilitator* quadrant (Ex 6).
  - `intake.defaults.json`: all 8 questions with Verdant defaults + reasoning each; suggested `asked: true` for `target-behavior`, `internal-trigger`, `ethics-gate` (the differentiating three). `axes`: `{ "brandColor": "#2F7A4D", "density": "comfortable", "rewardType": "self", "frequency": "daily" }`.
  - `copy.json`: `fictionalNotice` (e.g. "Verdant is a fictional product, invented for this demonstration. No real company, users, or data." — exact wording free, presence + honesty mandatory), tagline, `ethicsReveal` with `verdict: "habit-justified"` narrative.
  - `proto.config.json`: one screen (`plant-overview`) using `["plants", "care-tasks"]`.
  - `fixtures/plants.json`: ~15 plants — `id`, `name`, `species`, `location`, `acquired`, `wateringIntervalDays`, `lastWatered`, `lastFertilized`, `health` (`thriving|stable|struggling`), `notes`. `fixtures/care-tasks.json`: ~20 tasks — `id`, `plantId` (must reference a real plant), `type` (`water|fertilise|repot|inspect`), `due`, `done`. Data must be *coherent* (dates consistent with intervals; a couple of overdue tasks so #8's screen has states to show).
- **PATTERN**: `brief.md` head+sections per `portal/lib/intake.mjs:66-89`; copy tone per `index.html` (plain, no hype).
- **GOTCHA**: honesty contract is HARD — never write copy implying Verdant is real; the notice must be a rendered string, not a comment.
- **VALIDATE**: `node -e "for (const f of ['intake.defaults.json','copy.json','proto.config.json','fixtures/plants.json','fixtures/care-tasks.json']) JSON.parse(require('node:fs').readFileSync('scenarios/verdant/'+f)); console.log('verdant parses ✓')"`
- **SATISFIES**: AC #1 (package validates), AC #2 (fictional labeling)

### CREATE `scenarios/fieldwork/` package

- **IMPLEMENT** (content intent):
  - `brief.md`: Fieldwork, B2B field-service scheduling (dispatchers + technicians). **Behaviour model**: usage is work-demand-driven — externally triggered by incoming jobs, not by an internal trigger the design should amplify → the frequency filter rules **against** habit mechanics: build an efficiency utility, not a habit product. This is the deliberate contrast with Verdant (epic: "deliberately ruling differently at the frequency filter — the method being honest, demonstrated").
  - `intake.defaults.json`: same 8 ids, Fieldwork answers; `axes`: `{ "brandColor": "#B4530A", "density": "compact", "rewardType": "none", "frequency": "on-demand" }`.
  - `copy.json`: `fictionalNotice`, tagline, `ethicsReveal` with `verdict: "utility"` narrative (the method saying *no* — the honest demonstration).
  - `proto.config.json`: one screen (`dispatch-board`) using `["jobs", "technicians", "schedule"]`; `slots`: placeholder region ids (e.g. `["insight-panel", "summary-strip"]`) — #8 designs the actual canvas, #13 fills them.
  - `fixtures/jobs.json`: ~60 jobs (heavy-ops — #13's dashboards need volume): `id`, `customer`, `site`, `region`, `type`, `priority`, `status` (`scheduled|en-route|on-site|done|overdue`), `scheduledStart`, `durationMin`, `techId`, `slaDue`, `completedAt|null`. `fixtures/technicians.json`: ~10 — `id`, `name`, `skills`, `region`, `shift`. `fixtures/schedule.json`: day-slot view keyed by tech/day (shape: array of `{ id, techId, date, slots }`). All `techId` references must resolve.
- **GOTCHA**: keep dates within a coherent recent window (relative to a fixed fictional "today" stated in the brief) so dashboards read sensibly; don't scatter random timestamps.
- **VALIDATE**: `node -e "for (const f of ['intake.defaults.json','copy.json','proto.config.json','fixtures/jobs.json','fixtures/technicians.json','fixtures/schedule.json']) JSON.parse(require('node:fs').readFileSync('scenarios/fieldwork/'+f)); console.log('fieldwork parses ✓')"`
- **SATISFIES**: AC #1, AC #2

### CREATE `scenarios/validate.mjs`

- **IMPLEMENT**: zero-dep Node ESM validator. For each registry entry: dir exists; `brief.md` has a parseable JSON head with `slug` matching dir, `fictional === true`, and the five `##` sections; `intake.defaults.json` has exactly the 8 fixed ids, each question has non-empty `question`/`default`/`reasoning`, `axes` has all four keys; `copy.json` has non-empty `fictionalNotice` and `ethicsReveal.verdict`; every collection named in `proto.config.json` has a fixture file that parses to an array of objects with unique `id`s; cross-refs resolve (`plantId`, `techId`). Also: the two scenarios' `ethicsReveal.verdict` values must **differ** (the epic's contrast, enforced). Print one aligned `✓` line per scenario + a summary; on failure throw an Error naming file + field, exit 1.
- **PATTERN**: MIRROR `agent-layer/gen-token-css.mjs` — header citing this ticket + architecture §Data model; `loadSource`-style boundary function; `pathToFileURL` guard (repo path has a space!); resolve paths from `import.meta.url`, not cwd.
- **IMPORTS**: `node:fs` (`readFileSync`, `readdirSync`, `existsSync`), `node:path`, `node:url` (`pathToFileURL`, `fileURLToPath`). Nothing else.
- **GOTCHA**: parse the brief's JSON head with the same regex family as `agent-layer/lib.mjs:14` (`/```json\s*\n([\s\S]*?)\n```/`) — do not import from `agent-layer/lib.mjs` (it reads *ledgers*; this validates a different record — keep concerns separate, but keep the fence regex identical so the shape convention stays uniform).
- **VALIDATE**: `node scenarios/validate.mjs` → two `✓` lines, exit 0. Negative check: temporarily blank a `reasoning`, expect exit 1 with the path in the message, restore.
- **SATISFIES**: AC #1 (both packages validate, hand validation, no schema lib), AC #2 (notice presence enforced)

### CREATE `worker/wrangler.jsonc`

- **IMPLEMENT**: `{ "name": "factory-ux-api", "main": "api.mjs", "compatibility_date": "<today>" }` (JSONC, comment header citing ticket + architecture §Stack). No bindings, no vars, no routes.
- **GOTCHA #1**: the config lives **inside `worker/`, never at repo root** — the root deploy command `npx wrangler pages deploy .` must not find a Worker config and get confused. Worker commands run from `worker/` (`cd worker && npx wrangler dev`).
- **GOTCHA #2**: load the local `wrangler` skill before running any wrangler command (session rule) to confirm current flag/config syntax.
- **VALIDATE**: `cd worker && npx wrangler dev --help > /dev/null && echo config-dir-ok` (full validation comes with api.mjs below)
- **SATISFIES**: AC #3

### CREATE `worker/fixtures.mjs`

- **IMPLEMENT**: the static import manifest — `import verdantPlants from "../scenarios/verdant/fixtures/plants.json"` (etc., all 5 collections) and `export const FIXTURES = { verdant: { plants: verdantPlants, "care-tasks": … }, fieldwork: { jobs: …, technicians: …, schedule: … } }`. Header comment: "Adding a scenario = add its imports here + registry entry — data registration, not engine logic. If fixtures outgrow the bundle (1 MiB gzipped limit), switch to a Workers static-assets binding (rejected for now: extra platform concept, zero benefit at this size)."
- **GOTCHA**: wrangler's bundler (esbuild) resolves JSON imports and paths outside `worker/` fine — this is the single-source-of-truth trick: the Worker bundles the *same committed files* the static fallback serves; no copy, no drift.
- **VALIDATE**: `node -e "import('./worker/fixtures.mjs').then(m => console.log(Object.keys(m.FIXTURES)))"` — Node also supports JSON imports only with attributes; if bare `node` complains, validate via `wrangler dev` instead (the bundler is the real consumer). Use `with { type: "json" }` import attributes so BOTH Node ≥20.10 and wrangler accept the file.
- **SATISFIES**: AC #3, AC #4

### CREATE `worker/api.mjs`

- **IMPLEMENT**: `export default { fetch(request) }`. Routes:
  - `OPTIONS *` → 204 with CORS headers (cheap, though header-less GETs don't preflight).
  - non-GET → 405 JSON `{ "error": "read-only API" }`, `Allow: GET`.
  - `GET /api/health` → `{ "ok": true, "scenarios": ["verdant", "fieldwork"] }` (keys from `FIXTURES`).
  - `GET /api/:scenario/:collection` → `FIXTURES[scenario]?.[collection]` → 200 JSON, else 404 `{ "error": "unknown scenario \"x\"" }` / `"unknown collection \"y\""`.
  - anything else → 404 `{ "error": "unknown route" }`.
  - All responses: `content-type: application/json; charset=utf-8`, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300`. No user data touched, nothing logged — architecture §Boundaries.
- **PATTERN**: single small dispatch + one JSON-response helper — same shape philosophy as `portal/server.mjs` ("thin route dispatch"); errors as `{ error }` JSON per project convention.
- **IMPORTS**: `import { FIXTURES } from "./fixtures.mjs"` — nothing else. No Node APIs (Workers runtime, not Node).
- **VALIDATE**: `cd worker && npx wrangler dev` (background), then: `curl -s http://127.0.0.1:8787/api/health` → ok:true; `curl -s http://127.0.0.1:8787/api/verdant/plants | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d); if(!Array.isArray(a)||!a.length) throw new Error('empty'); console.log(a.length,'plants ✓')})"`; `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/api/nope/x` → 404; `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8787/api/verdant/plants` → 405; `curl -sI http://127.0.0.1:8787/api/verdant/plants | grep -i access-control-allow-origin`.
- **SATISFIES**: AC #3 (Worker serves fixtures via GET locally)

### CREATE `system/scenario-data.mjs`

- **IMPLEMENT**: hand-written ES module (CLAUDE.md: view-time behaviour → ES module beside `site.js`). Exports `loadCollection(scenario, collection)` → `Promise<{ data, source }>` where `source` is `"worker" | "static"`, and `loadRegistry()` → parsed `scenarios/index.json`. Flow: resolve API base from the registry (`location.hostname` in `["localhost","127.0.0.1"]` → `api.local`, else `api.prod`); if base is empty → skip straight to static; else `fetch(base + "/api/…", { signal: AbortSignal.timeout(2500) })`; any rejection/non-OK → fetch same-origin `/scenarios/${scenario}/fixtures/${collection}.json` → `source: "static"`; if static also fails, throw a plain `Error` naming the path. Cache the registry fetch (module-level promise).
- **PATTERN**: header per `system/site.js:1-6` ("hand-written canon"); `AbortSignal.timeout` per `portal/lib/intake.mjs:12`.
- **GOTCHA #1**: the `source` field is load-bearing for the honesty contract — #8/#10 render capability indicators ("live API" vs "static fallback") from it. Don't drop it.
- **GOTCHA #2**: no bundler on shipped pages — the module is loaded raw via `<script type="module">`/`import`; no bare specifiers, absolute paths only (`/scenarios/index.json`).
- **VALIDATE**: `node --check system/scenario-data.mjs` (syntax); behaviour validated via check.html next.
- **SATISFIES**: AC #3 (helper degrades to static fixtures)

### CREATE `scenarios/check.html`

- **IMPLEMENT**: bare shipped check page (the pattern #3's ticket also uses: "bare test page to drive it"). Loads the system CSS trio like `index.html:14-16`, `noindex` meta, plainly titled ("scenario data check — is the Worker answering, or the static fallback?"). A `<script type="module">` imports `/system/scenario-data.mjs`, reads the registry, loads every collection of every scenario, renders a table: scenario · collection · record count · **source** (worker/static) — plus each scenario's `fictionalNotice` rendered visibly (the honesty surface, demonstrated).
- **PATTERN**: markup/classes from `index.html` (`container`, `section`, `card` — token-only components).
- **VALIDATE**: `npx serve .` (background) → open `http://localhost:3000/scenarios/check.html`: with `wrangler dev` running all rows say `worker`; stop wrangler, reload → all rows say `static`. Both states render data.
- **SATISFIES**: AC #3 end to end, AC #2 (notice rendered)

### UPDATE `_headers`

- **IMPLEMENT**: ADD a `/scenarios/*` block with `Cache-Control: public, max-age=300, must-revalidate` (same tier as `/system/*` — fixtures/copy change at authoring time).
- **PATTERN**: exact format of `_headers:11-12`.
- **VALIDATE**: `grep -A1 "/scenarios/\*" _headers`
- **SATISFIES**: AC #3 (static fallback served sanely)

### UPDATE `CLAUDE.md`

- **IMPLEMENT**: ADD to the architecture map: `scenarios/` (scenario packages — format in `scenarios/README.md`; validate with `node scenarios/validate.mjs`) and `worker/` (fixture-backed mock API; `cd worker && npx wrangler dev`). ADD one "Where new code goes" bullet: "**New scenario** → clone a `scenarios/<slug>/` package per `scenarios/README.md` + one `scenarios/index.json` entry; never touch the Worker's routes (only `worker/fixtures.mjs` imports)." Surgical — no other edits.
- **VALIDATE**: `grep -n "scenarios/" CLAUDE.md`
- **SATISFIES**: AC #4

---

## TESTING STRATEGY

Project rule (CLAUDE.md §Testing): **no suite, no linter — "done" = run the surface you touched.** Do not invent a test framework.

### Unit-level

- `node scenarios/validate.mjs` is the unit test for content — run after every content edit.
- `node --check` on every new `.mjs` file for syntax.
- One deliberate negative run of the validator (break a field, expect exit 1 naming the path, restore).

### Integration

- `wrangler dev` + the curl battery (health, both scenarios' collections, 404, 405, CORS header).
- `check.html` in both states (Worker up → `worker`; Worker down → `static`).

### Edge Cases

- Worker up but slow → `AbortSignal.timeout(2500)` fires → static fallback (simulate: stop wrangler mid-session, reload check page).
- `api.prod` empty string (pre-deploy state) → helper goes straight to static on the deployed site — no console errors, no hanging fetch.
- Unknown scenario/collection → Worker 404 with `{ error }`; helper's static path then 404s too → thrown Error names the fixture path.
- Cross-origin: `serve` (localhost:3000) → Worker (127.0.0.1:8787) exercises the real CORS path locally.
- Fixture cross-refs (`plantId`, `techId`) — enforced by validator, not runtime.

### Regression

- Neutral shell untouched: `npx serve .` → `index.html` renders as before.
- Generators untouched: `node agent-layer/gen-token-css.mjs --check` → no drift.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check scenarios/validate.mjs && node --check worker/api.mjs && node --check worker/fixtures.mjs && node --check system/scenario-data.mjs
for f in scenarios/index.json scenarios/*/intake.defaults.json scenarios/*/copy.json scenarios/*/proto.config.json scenarios/*/fixtures/*.json; do node -e "JSON.parse(require('node:fs').readFileSync('$f'))" || echo "FAIL $f"; done
```

### Level 2: Content validation

```bash
node scenarios/validate.mjs        # two ✓ lines, exit 0; verdicts must differ
```

### Level 3: Worker (from worker/, wrangler dev in background)

```bash
curl -s http://127.0.0.1:8787/api/health
curl -s http://127.0.0.1:8787/api/verdant/plants | head -c 200
curl -s http://127.0.0.1:8787/api/fieldwork/jobs | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/api/nope/x          # 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8787/api/health  # 405
curl -sI http://127.0.0.1:8787/api/verdant/plants | grep -i "access-control-allow-origin"
```

### Level 4: Manual (fallback behaviour)

```bash
npx serve .    # then browse http://localhost:3000/scenarios/check.html
# state A: wrangler dev running  → every row source=worker
# state B: wrangler dev stopped  → every row source=static, data still renders
```

### Level 5: Regression

```bash
node agent-layer/gen-token-css.mjs --check
```

---

## ACCEPTANCE CRITERIA

(from issue #4, expanded)

- [ ] Scenario-package format documented (`scenarios/README.md`); both packages pass `node scenarios/validate.mjs` — hand validation, no schema lib.
- [ ] Fictional-scenario labeling present in package copy: non-empty `fictionalNotice` in both `copy.json` files, `fictional: true` in both brief heads, notice rendered on `check.html` (honesty surface #1).
- [ ] The two packages rule **differently** at the frequency/ethics filter (`ethicsReveal.verdict` differs; briefs' Behaviour-model sections argue each verdict) — enforced by the validator.
- [ ] Worker serves fixtures via GET locally under `wrangler dev`; read-only (405 on non-GET), CORS-open, `{ error }` JSON on unknown routes.
- [ ] `system/scenario-data.mjs` degrades to static fixtures when the Worker is unreachable, and reports `source` truthfully.
- [ ] Adding a third scenario = package dir + registry entry + fixture imports (documented; no route/engine changes).
- [ ] Zero regressions: neutral shell renders; `gen-token-css.mjs --check` clean.
- [ ] All new entry files open with headers citing ticket #4 / architecture sections (project convention).

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE ran clean at the time
- [ ] Level 1–5 validation commands all pass
- [ ] check.html verified in BOTH worker-up and worker-down states
- [ ] Content read once end-to-end for the honesty contract (nothing implies the products are real)
- [ ] CLAUDE.md map + `_headers` updated, nothing else touched (surgical)
- [ ] Commit message per convention, e.g. `scenario packages: Verdant + Fieldwork + Worker mock API + fixture fallback (epic #1, ticket #4)`; PR body carries `Closes #4`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (proceeding on these; flag in PR if any feels wrong):**

1. **Worker fixture wiring = static import manifest**, not a Workers static-assets binding. Rationale: zero platform unknowns, fixtures are small (≪1 MiB), everything visible in code (inspectable-proof value). The alternative is recorded in `fixtures.mjs`'s header for when fixtures grow. "Adding content, not engine work" is satisfied: new-scenario imports are data registration.
2. **Worker production deploy is out of scope** (AC only requires `wrangler dev`); `api.prod` ships as `""` and the helper short-circuits to static until it's filled after first deploy. The deployed site therefore runs on static fixtures until then — which the `source` indicator reports honestly.
3. **Fieldwork's differing verdict = "utility / no habit mechanics"** (externally-triggered B2B use fails the frequency filter's habit-zone test) vs Verdant's "habit-justified / facilitator". This reading follows the epic's framing; the exact reveal copy is authored at implementation.
4. **Axes value enums** (`density`, `rewardType`, `frequency`) are proposals — the *keys* are the contract. Reconciliation with #3's engine happens at #10 integration; both tickets are Wave-1 parallel, so neither can bind the other today. Kept as strings → format-stable either way.
5. **Fixture "today"**: fixtures use a fixed fictional current date stated in each brief (no relative dates) so committed data stays coherent forever.
6. **`scenarios/check.html` ships** (it's inspectable proof, noindex'd like everything else) rather than living in a gitignored scratch area — the deploy-=-commit rule prefers visible artifacts.

**Questions for the user (none blocking — defaults chosen):**

- None critical. If the Worker should deploy in this ticket after all, say so — it adds an account-level step (`npx wrangler deploy` from `worker/` + filling `api.prod`).

## NOTES (open canvas)

**Why the browser-facing parts are plain JSON, not kb-style markdown:** the kb convention (JSON head + prose) is perfect for records read by Node parsers and humans (`brief.md` uses it). But `intake.defaults.json` / `copy.json` / fixtures are fetched raw by vanilla shipped pages — no browser-side markdown parser exists and adding one violates the vanilla constraint. So: markdown where the audience is humans + build-time agents (brief), JSON where the audience is the browser. The validator is the bridge that keeps both honest.

**Why the validator lives in `scenarios/`, not `agent-layer/`:** agent-layer files are *generators* (emit artifacts, register in `build.mjs`, run against a jobs-folder ledger). `validate.mjs` emits nothing and runs against this repo's content — closer kin to `gen-token-css.mjs --check`'s drift-guard role, but package-local so a scenario package is self-contained (dir + registry + validator = the whole format story in one directory listing).

**Rejected: Pages Functions** (a root `functions/` dir) instead of a standalone Worker — it would ride the existing Pages deploy, but the architecture names "one Cloudflare Worker" explicitly, a separate Worker keeps the static site's never-fails property visibly independent of the API, and the fallback demo ("watch it degrade") needs the API to be *stoppable* apart from the site.

**Seam inventory** (who reads what — useful when reviewing #8/#10 plans):

| Consumer | Reads |
| --- | --- |
| #3 derivation engine | `intake.defaults.json → axes` (via #10) |
| #8 prototypes | `proto.config.json`, fixtures via `system/scenario-data.mjs`, `copy.json` notices |
| #10 Factory page | `index.json` (toggle), `intake.defaults.json` (wizard), `copy.json` (stations, ethics reveal) |
| #13 agentic study | `fieldwork/fixtures/*` (heavy-ops data) |
| Worker | fixtures via `worker/fixtures.mjs` imports |

**Content volume note:** the ticket estimates 600–1200 lines, content-heavy. The long pole is authoring coherent fixtures + honest copy, not code (~250 lines of code total across validator/worker/helper/check page). Budget writing time accordingly; the architecture's authoring-skills lineage (*writing-fragments → beats → shape* for scenario copy, `__UX_UI_Research.md` §9) applies when drafting briefs/copy in the implementing session.

## AMENDMENTS

(append-only; newest at the bottom)

- 2026-07-17 — Executed, with four upgrades requested mid-run ("address all to fix from 8/10 to 10/10"):
  **(1) Axes seam closed early**: `.claude/plans/live-derivation-engine.md` (#3, planned in a parallel
  session) pins `derive(input)`'s vocabulary, so the axes enums were aligned and hard-enforced in
  `validate.mjs` now instead of "reconciled at #10" — `density: compact|comfortable|spacious`,
  `rewardType: tribe|hunt|self` (no `none`; Fieldwork uses `hunt` + `frequency: "monthly"`, which the
  engine's frequency filter fails → habit patterns gated → utility verdict), `frequency` includes
  `multiple-daily`/`rarely`, optional `improvesLives`/`wouldUseIt` booleans (Verdant sets both true →
  facilitator; Fieldwork omits them → no quadrant, per its brief). Assumption #4 is resolved.
  **(2) Validator proves coherence**: per-scenario COHERENCE checks added (water-task due =
  lastWatered + interval; done ⟺ completedAt; overdue ⟹ lapsed SLA; date windows around the fictional
  today; calendar-date validity walk) — content quality is now machine-checked, not eyeballed.
  **(3) `compatibility_date` set to 2026-05-03**, not "today": the cached wrangler 4.86.0 runtime
  rejects newer dates (the exact risk the plan flagged; error recorded in the run).
  **(4) Helper fetches the Worker with `cache: "no-store"`** — discovered via real-browser testing:
  the Worker's `max-age=300` header made the browser replay dead-Worker responses from HTTP cache for
  5 minutes, so `source: "worker"` lied while the Worker was down. Honesty contract requires the
  indicator to reflect *now*. Both fallback states verified in a real browser after the fix.
