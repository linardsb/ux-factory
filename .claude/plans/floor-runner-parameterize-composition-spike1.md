# Feature: Floor runner + Spike 1 — parameterize `record-composition` (scenario → composed view) + fidelity gate

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and paths. Import from the right files. This ticket is a **decision-gate spike** — the deliverable is a *verdict + a rendered eyeball + a vocabulary-extension count*, not a productized pipeline. Resist building #89 (instance wiring) or #90 (vision/screenshot) into it.

## Feature Description

Generalize `portal/record-composition.mjs` from **Fieldwork-hardwired** to a **parameterized floor runner** that takes `{scenario package, vocabulary, questions, slot bounds}` and produces a validating `{name, props, children}` composition for a **non-Fieldwork fictional dashboard-shaped scenario** — reusing the whole record → curate → validate honesty pipeline **unchanged** — then run Spike 1 (render + eyeball + vocab-extension count) and record the decision that gates the rest of epic #86's fidelity ladder.

The load-bearing sub-task is **open-Q #4**: the runner cannot carry Fieldwork's baked-in domain logic (the fixed `today`, the SLA 2-day window, "open when `completedAt` is null", which copy labels to prefer). So **the scenario package must carry its own compute rules / question semantics.** Deciding *how the package carries them* **is** the decision this ticket records.

## User Story

As **Linards** (the maker, applying to a role with an already-built bespoke prototype)
I want **the composition runner to compose a dashboard view for any fictional dashboard-shaped scenario, not just Fieldwork**
So that **I can prove — with a real render — whether the honesty-maximal "floor" (recompose over the shared vocabulary) reads as *their* product cheaply enough to productize (unblocking #89), or whether it's too generic and the epic must lean on the ceiling engine (#90).**

## Problem Statement

`record-composition.mjs` is welded to Fieldwork in five places (see CONTEXT REFERENCES → `portal/record-composition.mjs`):

1. `FIXTURE_PATHS` / `READ_OK` — the Read fence is a hardcoded set of the four Fieldwork files.
2. `buildTask()` — bakes Fieldwork **domain semantics as prose**: `today = 2026-07-14`, the SLA-at-risk window (`slaDue ≤ 2026-07-16`), "open when `completedAt` is null", "prefer the copy.json labels", per-file column hints.
3. `SLOTS` — the two hybrid-canvas slot bounds, worded around "the board".
4. `PIV_COMPOSE_SYSTEM` — says "compute from the provided **Fieldwork** fixtures … matching the board this panel renders beside".
5. `upsertIndex` / `dropShipped` — write the single shared manifest `proto/compositions/index.json` (which feeds the Fieldwork study page).

Until these are parameterized *without weakening the honesty fence*, no other scenario can be composed, and the epic's central bet ("can the floor read as theirs?") can't be tested.

## Solution Statement

- **Open-Q #4 resolution:** add a new **optional per-scenario file** `scenarios/<slug>/compose.json` (the "composition config") that declares: the fixtures the run may Read (→ the fence), the slot bounds, the questions, the fixed `today`, and a **`computeRules` prose string carrying domain *definitions only*.** The runner templates `buildTask()` from this file. This merely **externalizes what `buildTask` already bakes in for Fieldwork** — so it stays inside the "no example" contract.
- **Uniform, not special-cased:** give Fieldwork its own `scenarios/fieldwork/compose.json` restating its current semantics, so the runner has **no** Fieldwork branch.
- **Fence rebuilt per-scenario** from `compose.json`'s declared fixtures (+ vocabulary + optional `copy.json`). Never "read any file"; secrets denied both directions, unchanged.
- **Manifest scoped per-scenario:** the runner writes `proto/compositions/<scenario>/<slug>.json` + `proto/compositions/<scenario>/index.json`. Fieldwork's committed root-level artifacts stay put and are only *read* (not regenerated) this ticket, so no shipped surface changes and northwind never leaks into the Fieldwork study.
- **Scenario:** enrich `northwind` (already fictional, dashboard-shaped, validator-clean) from 3 SKUs to ~18–24 coherent SKUs so a KPI strip has something real to compute. Then run 1–2 questions, **render the composed view in a scratch harness** (`renderComposition` from `system/agentic-renderer.mjs`), eyeball fidelity, **count the vocabulary extension** (0 if metric-tile-only), and **post the Spike-1 verdict**.

### The honesty firewall (hard — the whole point of the spike)

> `computeRules` may carry **definitions only** — what a field means, what "open"/"oversold"/"low" mean, the fixed `today`, date windows, which `copy.json` labels to prefer (exactly what `buildTask` states today). It must **never** enumerate *which metrics/tiles answer the question* ("show oversold, committed, at-risk"). The moment the prose names the tiles to emit, the output is half-hand-authored and the "no-example" claim — the exact thing this spike protects — collapses. "Which metrics answer this" stays the agent's job.

- The **`no-example` contract stays verbatim**: prompt built ONLY from vocabulary + the scenario's declared fixtures + question + slot bounds. No seed, no external dashboard reference, no example composition.
- The **Read-fence is rebuilt per-scenario** from `compose.json`'s *declared* fixtures — never loosened to "read any file"; the `SECRET_PATHS` denylist is unchanged.
- **No screenshot / vision path in this ticket.** Screenshots are #90's separate, separately-labeled regime. Do **not** make the floor runner screenshot-capable "for later reuse."

## Out of Scope / Non-Goals

- **Not included: any instance / `build-instance.mjs` / `instance.html` prototype-slot wiring** — that is #89. The eyeball uses a scratch harness, not an instance slot.
- **Not included: any screenshot/vision-reference path** — that is #90's regime (the honesty firewall forbids building it here "for later").
- **Not changing: Fieldwork's committed compositions, traces, or manifest, or `agentic-ui-study.html`.** They stay at `proto/compositions/` root and are proven un-regressed by *static* validation — **no real Fieldwork re-run** (a stochastic `--force` run would overwrite committed honesty traces for nothing).
- **Not changing: `validateComposition`, `curateTrace`, `validateTrace`, the trace format, or the `scenarios/` validator contract.** The whole pipeline is reused unchanged.
- **Not building a generic list-row primitive by default.** Whether the floor *needs* one is a **measured output** of the spike (the vocab-extension count), not a foregone task. Adding one is a bounded, optional, eyeball-driven decision (see Phase 4).
- **Not resolving epic-level open questions** beyond #4 (access control, success target, public teaser stay open).

## Feature Metadata

**Feature Type**: Refactor (parameterization) + Spike (decision gate)
**Estimated Complexity**: High (honesty-load-bearing refactor + a real paid agent run + a fidelity judgment)
**Primary Systems Affected**: `portal/record-composition.mjs`; `scenarios/<slug>/compose.json` (new file type); `scenarios/northwind/fixtures/items.json` (enriched); a scratch render harness; the epic architecture doc + an issue-comment verdict.
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (already the portal's sole dep, already used by the runner); auth via `portal/.env` `CLAUDE_CODE_OAUTH_TOKEN` or the Mac CLI login. Playwright at `~/node_modules` for the scratch screenshot (per repo memory).

## Related Work

**Implements**: [#88](https://github.com/linardsb/ux-factory/issues/88) · **Epic**: [#86](https://github.com/linardsb/ux-factory/issues/86) — architecture: `docs/epics/generative-prototyper.architecture.md` (Missing piece #1, Spike 1, open-Q #4)

**Back-references** (decisions inherited, not re-decided):

- `docs/epics/generative-prototyper.architecture.md` — Approach A (floor) chosen as the honest floor of the fidelity ladder; "no new engines" / no view-time LLM / two-regimes-never-blurred are inherited hard constraints.
- `.claude/plans/agentic-ui-study.md` + `.claude/reports/agentic-ui-study-report.md` — the original #13 runner + study this generalizes.
- `.claude/references/kb-format.md` + `scenarios/README.md` — the scenario-package contract this extends with one new optional file.

**Forward-references**:

- (none yet — #89 "floor into the instance" and #90 "ceiling engine" are **gated on this ticket's Spike-1 verdict**; plan them once this is implemented.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `portal/record-composition.mjs` (whole file, 355 lines) — **the file being parameterized.** The five Fieldwork-hardwired seams: `VOCAB_PATH`/`FIXTURE_PATHS`/`READ_OK` (50–57), `SLOTS` (60–63), `PIV_COMPOSE_SYSTEM` (65–111, note the "Fieldwork"/"the board" wording), `buildTask()` (118–152, the domain prose at 138–144), `refsFor()` (156–160), `makeFence()` (164–188), `main()` dry vs real branches (258–341), the arg-parse footer (343–354). Mirror its honesty-header voice in the new code.
- `system/agentic-renderer.mjs` (lines 31–109) — `validateComposition(vocab, composition)`: pure, DOM-free, throws a path-naming Error. Reused **unchanged** as the accept-gate (`assertValid`) and by the eyeball harness (`renderComposition`, 334–350). The vocabulary is passed in, never fetched here.
- `handoff/verdant/vocabulary.json` (whole; note `metric-tile` at 133–171) — the shared vocabulary. `metric-tile` is the **generic `ds-` primitive** (label/value/unit/tone) — the one primitive both scenarios reuse; carries no domain vocabulary, so it expresses stock metrics as readily as dispatch metrics. `plant-card`/`care-task-row`/`stat-tile`/`status-chip` are Verdant/enum-locked. The transferable set is ~5: `metric-tile`, `stat-tile`, `status-chip`, `screen-header`, `primary-button`.
- `tooling/curate-trace.mjs` (whole, 87 lines) — `curateTrace(raw, out)`: selection + truncation only. **Reused unchanged.**
- `tooling/validate-trace.mjs` (whole, 113 lines) — `validateTrace(file)`: the ship-gate drift guard (four phases in order, artifact-exists, honesty label, no `[[piv:` remnant, curated↔raw sessionId match). **Reused unchanged.** Note the `artifact.path` repo-relative + must-exist check (74–81) — the scenario-scoped composition path must satisfy it.
- `scenarios/README.md` (whole) — the package contract. Key: the validator "inspects only `brief.md` / `intake.defaults.json` / `copy.json` / `proto.config.json` and the `fixtures/` directory, with no top-level allowlist" — so a new `compose.json` at the package root is **ignored by the gate** (verified). Northwind is the fictional demo-instance package (carries `speculativeNotice` + `sources` extra keys).
- `scenarios/validate.mjs` (lines 150–235) — how coherence is checked: unique fixture ids, every `YYYY-MM-DD` string a real calendar date, every `<thing>Id` resolves. **Northwind has no `COHERENCE` entry**, so only these generic checks apply to enriched `items.json` (no derived-status coherence check to satisfy — but keep it internally sensible).
- `scenarios/northwind/fixtures/items.json` (3 SKUs) — **the fixture to enrich.** Fields: `id`, `name`, `warehouse`, `onHand`, `committed`, `updatedOn` (date ≤ `today`), `status` ∈ `ok|low|oversold`.
- `scenarios/northwind/brief.md` (head + Behaviour/Ethics) — `today = 2026-07-19`, domain "wholesale inventory". Its own honesty framing already argues *utility, not habit* — the compute-rules must stay consistent with that (response-time-under-pressure metrics, no engagement theatre).
- `scenarios/fieldwork/proto.config.json` + `scenarios/northwind/proto.config.json` — screens → collections. Fieldwork: `[jobs, technicians, schedule]`, slots `[insight-panel, summary-strip]`. Northwind: `[items]`, no slots.
- `system/agentic-study.mjs` (lines 37–130) — the shipped Fieldwork render surface (`renderStudy`). **Read for reference only** — the eyeball uses `renderComposition` directly in a scratch harness, NOT this Fieldwork-wired page.
- `tooling/fieldwork-kpis.mjs` (whole) — the post-hoc **JUDGE** pattern (never fed to a prompt). You need a northwind analogue *only if* you want to verify the run's numbers; for a spike the eyeball + a hand-check of 3–4 figures against the ~20-row fixture is sufficient. Do **not** feed any of it into the agent prompt.

### New Files to Create

- `scenarios/northwind/compose.json` — the northwind composition config (fixtures/`today`/slots/questions/`computeRules`). **The open-Q #4 artifact.**
- `scenarios/fieldwork/compose.json` — Fieldwork's config, restating its *current* baked-in semantics verbatim (proves the runner is uniform, no special-case).
- `proto/compositions/northwind/<slug>.json` (×1–2) — the agent-produced compositions (committed proof, like Fieldwork's).
- `proto/compositions/northwind/index.json` — the scenario-scoped manifest (northwind entries only; never touches root `index.json`).
- `traces/<slug>.raw.jsonl` + `traces/<slug>.jsonl` (×1–2) — the committed real-run trace pairs.
- **Scratch (NOT committed):** an eyeball harness HTML in the scratchpad dir (`/private/tmp/claude-501/.../scratchpad/`) that loads the vocabulary + a northwind composition + `components.css` + the northwind pack and calls `renderComposition`; plus a Playwright screenshot script (per the cross-engine memory).

### Files to Update

- `portal/record-composition.mjs` — parameterize (the bulk of the work).
- `scenarios/northwind/fixtures/items.json` — enrich to ~18–24 SKUs.
- `docs/epics/generative-prototyper.architecture.md` — record open-Q #4's resolution (the `compose.json` shape) + the Spike-1 verdict.
- `CLAUDE.md` — update the documented `record-composition.mjs` CLI signature (scenario arg) in the "New composition proposal" ground-rule line + the architecture-map annotation.
- **Issue #88** — post the Spike-1 verdict comment (productize floor vs. lean ceiling) with the vocab-extension count.

### Relevant Documentation

- Epic architecture `docs/epics/generative-prototyper.architecture.md` §"Spikes & experiments" (Spike 1, lines 71–80) and §"Missing pieces" (#1 + #4). **Why:** the decision rule + the exact question this ticket answers.
- `docs/epics/generative-prototyper.prd.md` §8 (honesty / two regimes). **Why:** the firewall this refactor must not breach. (Read it before touching the prompt.)
- `.claude/references/kb-format.md`. **Why:** the kb-record convention `compose.json` should feel consistent with (JSON where the audience is a program).

### Patterns to Follow

**File header citing the governing doc** (project rule — every entry-point/feature file):
```js
// portal/record-composition.mjs — build-time agentic composition runner (epic #1 #13; parameterized #88).
// … honesty contract (hard, load-bearing): the prompt is built ONLY from vocabulary + the SCENARIO'S
// declared fixtures + question + slot bounds; a scenario's compute-rules carry DEFINITIONS ONLY, never
// which tiles to emit; the Read fence is rebuilt per-scenario from the package's declared fixtures …
```

**Error voice — name the offending path, enumerate what was allowed** (`agent-layer/lib.mjs`, `agentic-renderer.mjs`):
```js
if (!existsSync(composePath)) throw new Error(`${composePath} is missing — a floor scenario needs a compose.json (fixtures, slots, questions, computeRules)`);
if (!SLOTS[slot]) throw new Error(`slot must be one of: ${Object.keys(SLOTS).join(' | ')} (got "${slot}")`);
```

**Hand validation at the boundary, throw** (no schema library — project rule): validate `compose.json`'s shape in the runner (required keys, non-empty strings, slot referenced by a question exists, declared fixtures exist on disk) exactly as `scenarios/validate.mjs` / `lib.mjs` do.

**Own-property lookups on program-controlled keys** (`agentic-renderer.mjs:44`, `worker/api.mjs:43`): if you index `SLOTS[slot]` or a compose map by a request/arg value, guard with `Object.hasOwn`.

**`--dry` proves the mechanism cheaply** (existing `main()` dry branch, 263–280): keep it — a `--dry` run for BOTH fieldwork (regression) and northwind (pre-flight) before any real paid run.

**Trace honesty (hard):** never hand-write/hand-edit a composition or trace; a weak/invalid run is fixed by tightening `compose.json`'s `computeRules` or `PIV_COMPOSE_SYSTEM` and re-running with `--force`. The runner already enforces this (drops shippable artifacts on invalid/PIV-incomplete, exit 1) — keep that intact.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 5 (the paid spike run) **depends on** Phases 1–4 all being done and `--dry`-green.

### Phase 1: The `compose.json` contract + northwind fixtures (foundation, no agent run)

**Tasks:**
- Decide + write the `compose.json` shape (see NOTES for the proposed literal). Author `scenarios/northwind/compose.json` and `scenarios/fieldwork/compose.json`.
- Enrich `scenarios/northwind/fixtures/items.json` to ~18–24 coherent SKUs (spread across warehouses; a realistic mix of `ok`/`low`/`oversold`; `updatedOn ≤ 2026-07-19`; `oversold` iff `committed > onHand`).
- Verify `node scenarios/validate.mjs` still passes and **ignores** `compose.json`.

### Phase 2: Parameterize the runner (the core refactor)

**Depends on:** Phase 1 (the config the runner reads).

**Tasks:**
- Add a `scenario` CLI arg (first positional): `node portal/record-composition.mjs <scenario> "<question>" <slot> [--slug] [--dry] [--force]`.
- Load `scenarios/<scenario>/compose.json`; validate its shape; derive `SLOTS`, `READ_OK`/fixture paths, `today`, per-fixture hints, and the questions from it.
- Rewrite `buildTask()` to template from the config (fixtures list + `computeRules` + slot bounds), removing all Fieldwork literals.
- De-Fieldwork `PIV_COMPOSE_SYSTEM` (generic "the provided fixtures" / "the view").
- Scope output + manifest to `proto/compositions/<scenario>/` (parameterize `upsertIndex`/`dropShipped`/`main` paths). Keep the fence, the accept-gate, the curate→validate ship-gate, and the exit-1-on-bad-run behavior **byte-for-byte in spirit**.

### Phase 3: Regression-prove Fieldwork WITHOUT a real run

**Depends on:** Phase 2.

**Tasks:**
- **Deterministic prompt-fidelity diff (the strongest AC#3 proof):** BEFORE the Phase-2 refactor, print `buildTask(fieldworkQ, slot, ...)` for one committed Fieldwork question to `scratch/fieldwork-task.before.txt`. AFTER the refactor (task now templated from `scenarios/fieldwork/compose.json`), print the same to `scratch/fieldwork-task.after.txt` and `diff` them. Target: byte-identical, or a diff containing ONLY the intended `today`/fixture-list templating. This converts the subjective "eyeball the four domain sentences" into a gate — the strongest proof the committed Fieldwork compositions still trace to the same prompt. (Capture `.before` before you start editing, or from a `git stash`/clean checkout.)
- `node tooling/validate-trace.mjs` (all committed traces) → green (Fieldwork's 4 unchanged).
- A tiny script (or reuse `assertValid`) revalidates the 4 committed Fieldwork compositions against the vocabulary → green.
- `node portal/record-composition.mjs fieldwork "<any Q>" summary-strip --dry` → proves the rebuilt fence + prompt path works for Fieldwork (writes to scratch, ships nothing). Confirm all four PIV markers + fence denials + in-process `validateComposition ✓`.

### Phase 4: Spike 1 — northwind real run, render, eyeball, count

**Depends on:** Phase 3 green.

**Tasks:**
- `--dry` a northwind question first (auth + mechanism).
- Real run 1–2 northwind questions (`summary-strip` and/or `insight-panel`). Fix weak runs by tightening `computeRules`/prompt + `--force` — never hand-edit.
- Hand-verify the tiles' numbers against the enriched fixture (a lightweight judge, not fed to the prompt).
- Build the **scratch eyeball harness**, render the composition with `renderComposition`, screenshot with Playwright (chromium + webkit). Eyeball: *does it read as a wholesale-stock product?*
- **Count the vocabulary extension**: how many spec-first primitives beyond the ~5 transferable did northwind need? (Expected 0 for metric-tile KPI strips.) Record whether a generic list-row primitive is *wanted* for fidelity (that's the sustainability signal — do **not** build it unless the eyeball demands it AND it's a single bounded spec-first addition).

### Phase 5: Record the verdict (the actual deliverable)

**Depends on:** Phase 4.

**Tasks:**
- Write open-Q #4's resolution (the `compose.json` shape) into `docs/epics/generative-prototyper.architecture.md` (§Missing pieces #4 / §Open questions).
- Post the **Spike-1 verdict** to issue #88: *productize the floor* (≤ small bounded extension → unblocks #89) **or** *lean ceiling* (heavy per-employer vocab work → #90 / narrow scope), with the vocab-extension count + the screenshot as evidence.
- Update `CLAUDE.md`'s documented CLI signature.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently checkable.

### CREATE `scenarios/northwind/compose.json`

- **IMPLEMENT**: The composition config (see NOTES for the exact literal). Keys: `$description` (honesty note), `today: "2026-07-19"`, `fixtures: [{name, hint}]` (definitions-only hints), `copy: true`, `slots: { "summary-strip": "…", "insight-panel": "…" }` (bounds worded for a stock dashboard, not "the board"), `computeRules` (**definitions only** — what open/committed/oversold/low mean; the fixed today; prefer copy labels; "compute every figure yourself"; **name no tiles**), `questions: [{slug, slot, question}]` (1–2).
- **PATTERN**: mirrors `SLOTS` (record-composition.mjs:60–63) + `buildTask` domain prose (138–144), externalized.
- **GOTCHA**: `computeRules` MUST NOT list which metrics/tiles to emit (honesty firewall). Re-read your prose and delete any sentence that names a tile or picks the metrics.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('scenarios/northwind/compose.json','utf8')); console.log('compose.json parses')"`
- **SATISFIES**: AC #4 (open-Q #4 resolved).

### CREATE `scenarios/fieldwork/compose.json`

- **IMPLEMENT**: Fieldwork's config restating its *existing* semantics verbatim: `today: "2026-07-14"`, `fixtures` = jobs/technicians/schedule (+ the current per-file hints from buildTask:133–136), `copy: true`, `slots` = the current two bounds (60–63), `computeRules` = the current domain prose (138–144: SLA-at-risk window, open-when-completedAt-null, include-overdue-in-at-risk, prefer copy labels), `questions` = the 4 existing (slugs from `proto/compositions/index.json`).
- **PATTERN**: a faithful transcription — the runner must produce a byte-equivalent *task* for Fieldwork (diff-check possible).
- **GOTCHA**: this is the regression anchor. If the templated `buildTask` output diverges from the original for Fieldwork, the transcription (or the template) is wrong.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('scenarios/fieldwork/compose.json','utf8')); console.log('ok')"`
- **SATISFIES**: AC #3 (Fieldwork not broken by parameterization) + AC #4 (uniform, no special-case).

### UPDATE `scenarios/northwind/fixtures/items.json`

- **IMPLEMENT**: enrich 3 → ~18–24 SKUs. Realistic packaging-wholesaler SKUs across `north/south/east/west`; a believable spread (~majority `ok`, several `low`, a few `oversold`); every `oversold` row has `committed > onHand` and every `ok` has clear headroom; `updatedOn` ∈ recent days ≤ `2026-07-19`; unique `id` (`sku-01`…).
- **PATTERN**: existing 3 rows (items.json:1–29) — keep the exact field set, no new fields (the DataContract is implicit; extra fields aren't validated but stay minimal).
- **GOTCHA**: `scenarios/validate.mjs` checks every `YYYY-MM-DD` is a real date + unique ids. Northwind has no `COHERENCE` entry so `status` isn't cross-checked — but keep it internally consistent so the eyeball is honest.
- **VALIDATE**: `node scenarios/validate.mjs` → northwind ✓ (and confirm `compose.json` is not flagged).
- **SATISFIES**: AC #1 (a real dashboard to compose over) + AC #5 (a compelling eyeball needs real data).

### CONFIRM no automated caller depends on the old CLI signature (breaking change)

- **IMPLEMENT**: `grep -rn "record-composition.mjs" . --include='*.mjs' --include='*.js' --include='*.json' --include='*.md'` — the scenario arg becomes the FIRST positional, so `"<question>" <slot>` shifts. It's a hand-run CLI (not registered in `agent-layer/build.mjs`), so expect only docs/plans; confirm nothing automated invokes the old form before changing it.
- **VALIDATE**: grep output contains only documentation references (CLAUDE.md, `.claude/plans/*`, this plan) — no build script or CI step.
- **SATISFIES**: AC #7 (CLI doc consistency).

### UPDATE `portal/record-composition.mjs` — add the scenario arg + config loader

- **IMPLEMENT**: a `loadComposeConfig(scenario)` that resolves `path.join(REPO_DIR, 'scenarios', scenario, 'compose.json')`, parses it, and hand-validates: required keys present; `fixtures` a non-empty array of `{name, hint}` whose `<name>.json` exists under the package `fixtures/`; each `slots` value a non-empty string; each `questions[]` has a `slot` present in `slots`; `computeRules`/`today` non-empty. Throw path-naming errors on any miss.
- **PATTERN**: `scenarios/validate.mjs` boundary checks; error voice per `agent-layer/lib.mjs`.
- **IMPORTS**: reuse existing (`existsSync`, `readFileSync`, `path`, `REPO_DIR`).
- **GOTCHA**: guard `SLOTS[slot]` / config-map indexing with `Object.hasOwn` (arg-controlled key). Anchor fixture paths to `REPO_DIR` (absolute) so `--dry` (cwd = scratch) still reads real repo data, exactly as the current `FIXTURE_PATHS` does (49–57).
- **VALIDATE**: `node portal/record-composition.mjs northwind "test" summary-strip --dry` reaches the recorder (auth/mechanism), and a bad scenario name throws a clear error: `node portal/record-composition.mjs nope "q" summary-strip` → names the missing `compose.json`.
- **SATISFIES**: AC #1, AC #4.

### REFACTOR `portal/record-composition.mjs` — `buildTask` / `SLOTS` / `PIV_COMPOSE_SYSTEM` / fence from config

- **IMPLEMENT**:
  - `SLOTS` ← `config.slots`.
  - `FIXTURE_PATHS`/`READ_OK` ← derived from `config.fixtures` (+ `VOCAB_PATH` + `scenarios/<scenario>/copy.json` when `config.copy`). `makeFence` unchanged in logic — it reads `READ_OK`.
  - `buildTask(question, slot, refs, config)` ← template the numbered file list from `config.fixtures` (name + hint), inject `config.today` + `config.computeRules` where the Fieldwork prose was (138–144), keep the IMPLEMENT/VALIDATE/refusal-loop tail identical.
  - `PIV_COMPOSE_SYSTEM` ← replace "Fieldwork"/"the board this panel renders beside" with generic "the provided fixtures"/"the view you compose". Keep every structural rule (marker discipline, enum-exact, number-in-value, label-reads-without-tone) verbatim.
  - `refsFor()` ← build the fixture refs dynamically (absolute for `--dry`, repo-relative for real) from `config.fixtures`.
- **PATTERN**: keep the honesty-header comment style + the "this literal construction is the proof" framing (record-composition.mjs:113–117).
- **GOTCHA**: the real-run `refs` must stay **repo-relative** (portability of the committed trace, 155–159). The validate command's `renderer` path stays `./system/agentic-renderer.mjs` (real) / absolute (dry).
- **VALIDATE**: for Fieldwork, the templated task should match the original prose (spot-diff by printing `buildTask(...)` for a fieldwork question and eyeballing the four domain sentences are intact).
- **SATISFIES**: AC #2 (fence + no-example rebuilt per-scenario), AC #3.

### UPDATE `portal/record-composition.mjs` — scope output + manifest per scenario

- **IMPLEMENT**: derive `compDir = path.join('proto/compositions', scenario)`; `outRel = path.join(compDir, slug + '.json')`; manifest = `path.join(REPO_DIR, compDir, 'index.json')`. Parameterize `upsertIndex(indexPath, entry)` (already takes a path) and `dropShipped(slug, compDir)` to use the scenario dir. `mkdirSync(compDir, { recursive: true })`.
- **PATTERN**: existing `main()` real branch (282–341) + `upsertIndex`/`dropShipped` (230–254).
- **IMPLEMENT (the easy-to-miss bug)**: the manifest **entry** currently hardcodes `proposal: \`/proto/compositions/${slug}.json\`` (record-composition.mjs:335–337). It MUST gain the scenario segment: `proposal: \`/proto/compositions/${scenario}/${slug}.json\``, or northwind's manifest points at a nonexistent root path. `trace: \`/traces/${slug}.jsonl\`` stays **flat** — `traces/` is NOT scenario-scoped (see the flat-namespace note below).
- **GOTCHA**: this is what keeps northwind **out of** the shared root `proto/compositions/index.json` (the Fieldwork study's source). Do NOT touch the root manifest. The scenario-scoped composition path is still repo-relative + inside root, so `validate-trace`'s `artifact.path` check (74–81) passes.
- **VALIDATE**: after a northwind run, `proto/compositions/index.json` (root) is byte-unchanged; `proto/compositions/northwind/index.json` holds only northwind entries; and its `proposal` URL resolves to a file that exists: `node -e "const fs=require('fs');for(const e of JSON.parse(fs.readFileSync('proto/compositions/northwind/index.json'))){if(!fs.existsSync('.'+e.proposal))throw new Error('dangling proposal: '+e.proposal);}console.log('proposals resolve')"`
- **SATISFIES**: AC #3 (no Fieldwork-study leak), AC #1.

### VALIDATE regression (Fieldwork, no real run)

- **IMPLEMENT**: run the three static proofs.
- **VALIDATE**:
  - `node tooling/validate-trace.mjs` → all traces ✓ (4 Fieldwork + any northwind added later).
  - `node -e "import('./system/agentic-renderer.mjs').then(async m=>{const fs=await import('node:fs');const v=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json'));for(const e of JSON.parse(fs.readFileSync('proto/compositions/index.json'))){m.validateComposition(v,JSON.parse(fs.readFileSync('.'+e.proposal)));}console.log('4 fieldwork compositions valid');})"`
  - `node portal/record-composition.mjs fieldwork "What's the operational state of the board right now?" summary-strip --dry` → four PIV markers, fence denials, `validateComposition ✓`.
- **SATISFIES**: AC #3.

### RUN Spike 1 (northwind, real, paid)

- **IMPLEMENT**: `--dry` northwind first; then a real run of 1–2 questions. Tighten-and-`--force` on any weak/invalid/PIV-incomplete run (never hand-edit).
- **VALIDATE**: the runner ships (composition valid ✓ + trace ✓ + manifest upsert); `node tooling/validate-trace.mjs traces/<slug>.jsonl` ✓; hand-check 3–4 tile numbers vs the fixture.
- **GOTCHA**: real tokens (~2–5 min/run). `--dry` first every time you change the prompt.
- **SATISFIES**: AC #1, AC #5.

### RENDER + eyeball (scratch harness)

- **IMPLEMENT**: a scratchpad HTML that imports `handoff/verdant/vocabulary.json` + the northwind composition + links `system/components.css` + `system/tokens.contract.css` + `system/tokens.neutral.css` (and optionally a northwind pack), mounts `renderComposition(vocab, composition, bus)` (a no-op bus is fine). Screenshot with Playwright (chromium + webkit) per the cross-engine memory (`require.resolve` at `~/node_modules`, python `-m http.server` serves `.mjs` as `text/javascript`).
- **VALIDATE**: the view renders with real components + tokens (not a mockup); capture the PNG for the verdict.
- **GOTCHA**: NOT a shipped page — lives in scratch, never committed. Do not add a route or touch `agentic-ui-study.html`.
- **SATISFIES**: AC #5 (rendered + fidelity-eyeballed).

### RECORD open-Q #4 + the Spike-1 verdict

- **IMPLEMENT**: update `docs/epics/generative-prototyper.architecture.md` (§Missing pieces #4 → resolved: the `compose.json` shape; check the open-Q #4 box). Post the verdict comment to #88 (productize floor vs. lean ceiling) with the vocab-extension count + the screenshot. Update `CLAUDE.md`'s `record-composition.mjs` CLI line (+ the architecture-map annotation) to the new `<scenario> "<question>" <slot>` signature.
- **VALIDATE**: `gh issue view 88 --comments` shows the verdict; the architecture doc reflects it.
- **SATISFIES**: AC #4, AC #5.

---

## TESTING STRATEGY

No unit-test suite exists (project rule: "run the surface you touched"). Validation = running the real surfaces + the existing gates.

### Gate commands (the project's actual "tests")
- `node scenarios/validate.mjs` — package coherence (northwind ✓, `compose.json` ignored).
- `node tooling/validate-trace.mjs` — every committed trace passes the drift guard.
- `validateComposition` over the committed compositions (the one-liner above) — structural validity.
- `record-composition.mjs … --dry` — auth + fence + PIV-marker + accept-gate mechanism, for both scenarios.

### Integration (the real run)
- The end-to-end northwind run is itself the integration test: config → prompt → real agent → composition → curate → validate → ship (scenario-scoped).

### Edge cases to exercise
- Missing/malformed `compose.json` → clear path-naming throw.
- A `question` whose `slot` isn't in `slots` → throw.
- A declared fixture with no file on disk → throw.
- The fence still **denies**: reading a non-declared file, reading a secret (`.env`), writing anywhere but the one composition file, a non-`node` Bash command. (Confirm the denials appear in the `--dry` trace.)
- Root `proto/compositions/index.json` byte-unchanged after a northwind run (no leak).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check portal/record-composition.mjs`
- `node -e "['scenarios/northwind/compose.json','scenarios/fieldwork/compose.json','scenarios/northwind/fixtures/items.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f,'utf8')));console.log('json ok')"`

### Level 2: Package + trace gates
- `node scenarios/validate.mjs`
- `node tooling/validate-trace.mjs`

### Level 3: Runner mechanism (no paid run)
- `node portal/record-composition.mjs fieldwork "What's the operational state of the board right now?" summary-strip --dry`
- `node portal/record-composition.mjs northwind "<a northwind question>" summary-strip --dry`

### Level 4: The paid spike run + eyeball
- `node portal/record-composition.mjs northwind "<question>" summary-strip` (real; `--force` to redo)
- scratch harness render + Playwright screenshot (chromium + webkit)

### Level 5: Regression proof
- root `proto/compositions/index.json` unchanged: `git diff --stat proto/compositions/index.json` → empty.
- `git status` shows only the intended new/changed files.

---

## ACCEPTANCE CRITERIA

- [ ] `record-composition.mjs` runs against a **non-Fieldwork fictional dashboard scenario** (northwind) and ships a valid, PIV-clean composition (`validateComposition` + `validate-trace` pass, unchanged).
- [ ] The Read fence + `no-example` contract are intact and **rebuilt per-scenario** from `compose.json`'s declared fixtures; secrets denied both directions; **no screenshot path** added.
- [ ] Fieldwork's existing compositions still validate and its traces still pass — proven by **static** checks + one `--dry` run (no stochastic re-run); the shared root manifest is byte-unchanged.
- [ ] **Open-Q #4 resolved**: the `compose.json` shape that carries per-scenario compute rules / question semantics is decided, authored for both scenarios, and documented in the architecture doc.
- [ ] The composed view is **rendered (real components + tokens) and fidelity-eyeballed**; the vocab-extension count is recorded; the **Spike-1 verdict is posted to #88** (productize floor vs. lean ceiling).
- [ ] `computeRules` carries **definitions only** — no tile/metric is named in it (honesty firewall held).
- [ ] `CLAUDE.md`'s documented CLI signature is updated to include the scenario arg.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each gate green before the next.
- [ ] `node scenarios/validate.mjs`, `node tooling/validate-trace.mjs`, `node --check` all pass.
- [ ] Both `--dry` runs show four PIV markers + fence denials + `validateComposition ✓`.
- [ ] The northwind real run shipped (valid + curated trace + scenario-scoped manifest).
- [ ] Root `proto/compositions/index.json` and `agentic-ui-study.html` untouched.
- [ ] Screenshot captured; vocab-extension count recorded; verdict posted to #88; architecture doc + CLAUDE.md updated.
- [ ] `git status` contains only: `record-composition.mjs`, two `compose.json`, enriched `items.json`, `proto/compositions/northwind/*`, `traces/<slug>.*`, the architecture doc, CLAUDE.md. (Scratch harness NOT staged.)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (decided; flag before executing if any is wrong):**

1. **Scenario = enriched northwind**, not a fresh package. Rationale: northwind is already fictional, dashboard-shaped, and validator-clean; 3 SKUs is too thin *either way*, so enrichment is the minimum cost, and a fresh package (brief + 8-question intake + copy + proto.config + coherent fixtures) is far more work for no spike benefit. **Cost:** `instance.html`'s demo will show more stock (non-VR page; arguably an improvement). *If the owner wants northwind's demo frozen, the fallback is a fresh `scenarios/stockroom/` (or similar) package — adds ~1 phase.*
2. **`compose.json` is a NEW optional file**, not an extension of `brief.md`'s parsed head or `proto.config.json`'s consumed shape (both have parsers that would trip on new keys). The scenario validator ignores it (verified: no top-level allowlist).
3. **Fieldwork's committed composition artifacts are not moved.** The runner is uniformly scenario-scoped (`proto/compositions/<scenario>/`), but Fieldwork's legacy root-level files + root manifest stay put and are only *read*; no real Fieldwork run happens this ticket, so no divergence occurs. Migrating Fieldwork into `proto/compositions/fieldwork/` (updating the single non-VR consumer `agentic-ui-study.html`) is deferred to #89 when compositions actually wire into instances. **Evidence for safety:** grep confirms `proto/fieldwork.html` (which *is* VR-gated) does **not** read compositions — only `agentic-ui-study.html` does.
4. **The eyeball harness is scratch, never committed** (a shipped render surface for northwind is #89's job, if at all).

**Genuine open question for the owner (does not block starting):**

- The Spike-1 **verdict itself** is an output, not a decision to pre-make — but if the eyeball is borderline, is *one* bounded new spec-first primitive (a generic `ds-` list-row, so a stock dashboard can show per-SKU rows, not only KPI tiles) in-scope to test the floor's true ceiling, or should any need for it immediately count as "lean ceiling → #90"? Default: record the *need* as the vocab-extension signal and do **not** build the row this ticket (keeps the footprint a spike). Building it is a follow-up if the verdict is "productize with a small extension."

## NOTES (open canvas)

### Proposed `compose.json` literal (northwind) — the open-Q #4 artifact

```json
{
  "$description": "Floor composition config for the parameterized record-composition runner (#88). Carries per-scenario compute SEMANTICS + slots + questions. HONESTY FIREWALL: computeRules states DEFINITIONS ONLY (what a field/state means, the fixed today, which copy labels to prefer) — it must never name which tiles/metrics answer a question. 'Which metrics answer this' is the agent's job; naming them here would make the output half-hand-authored and break the no-example contract.",
  "today": "2026-07-19",
  "fixtures": [
    { "name": "items", "hint": "one row per SKU: name, warehouse (north|south|east|west), onHand, committed, updatedOn (date), status (ok|low|oversold)" }
  ],
  "copy": true,
  "slots": {
    "summary-strip": "a HORIZONTAL KPI row: a small array (3–5) of metric-tile nodes, no children, that fit one band above a stock table — each tile a headline number answering the question at a glance. Use tone sparingly for the one or two figures that carry risk.",
    "insight-panel": "a VERTICAL column of metric-tile nodes (typically 3–6, several toned) answering one analytical question, fitting a narrow side region beside a stock table — a focused read, not a whole dashboard."
  },
  "computeRules": "The dashboard's fixed fictional 'today' is 2026-07-19. Each row is a SKU with onHand (physical stock) and committed (already promised on orders). A SKU is OVERSOLD when committed > onHand (more promised than exists); its shortfall is committed − onHand. 'available' is onHand − committed (may be negative). The status field is pre-derived: 'oversold' | 'low' (thin cover) | 'ok'. Prefer the copy.json labels where present. Compute every figure yourself from the raw records — do not assume any count. Northwind is a utility, not a habit product: report the operator's risk under time pressure, not engagement.",
  "questions": [
    { "slug": "stock-risk-state", "slot": "summary-strip", "question": "What is the overall stock-risk state across the warehouses right now?" },
    { "slug": "oversell-exposure", "slot": "insight-panel", "question": "Where is oversell exposure concentrated, and how deep is it?" }
  ]
}
```

Note how the `computeRules` defines *oversold/available/shortfall* and the fixed today, but does **not** say "show an Oversold tile, a Committed tile, and an At-risk tile" — that selection is left to the agent. That line is the firewall.

### Why `compose.json`, not brief.md / proto.config.json (rejected alternatives)

- **Extend `brief.md`'s head** — rejected: `lib.mjs`/`scenarios/validate.mjs` parse the head with fixed expectations; new keys risk tripping them, and the brief's audience is humans+authoring-agents (prose), not the runner.
- **Extend `proto.config.json`** — rejected: it's consumed by `system/scenario-data.mjs`/the proto pages with a fixed shape; adding compute-rules there couples the runner to the view layer.
- **A CLI `--prompt-fragment` file** — rejected: less discoverable, not co-located with the package, and the questions/slots want structure (JSON), not a loose fragment. `compose.json` co-locates the whole floor contract with the package it configures, ignored by the gate, parsed only by the runner. This is the recorded open-Q #4 answer.

### Manifest-scoping — why it matters (the subtle leak)

`upsertIndex` currently always writes root `proto/compositions/index.json`, and `agentic-ui-study.html` fetches exactly that to build the Fieldwork study's tabs. An un-scoped northwind run would surface northwind tabs inside the Fieldwork study (wrong scenario, wrong data). Scoping the manifest to `proto/compositions/<scenario>/index.json` is the minimal fix and is forward-compatible with #89 (per-scenario instance wiring). No shipped page changes because Fieldwork's root manifest is left exactly as committed.

### Vocab-extension count — the sustainability signal

The ~5 transferable primitives are `metric-tile` (generic `ds-`), `stat-tile`, `status-chip`, `screen-header`, `primary-button`. A KPI-strip stock dashboard is expressible with `metric-tile` alone → **extension count 0**. If the eyeball says "reads generic without a per-SKU list," the missing piece is a generic list-row primitive (the Verdant `plant-card`/`care-task-row` are enum-locked and unusable). **Recording that need — not necessarily building it — is the spike's answer to "how much vocabulary extension did one employer need?"** Count 0–1 bounded → "productize the floor"; anything heavier → "lean ceiling (#90)".

### `traces/` is a flat namespace (compositions are not)

Compositions now live under `proto/compositions/<scenario>/`, but `traces/` stays **flat** (`validate-trace.mjs` globs `traces/*.jsonl`, and the manifest `trace` URL is `/traces/<slug>.jsonl`). So **composition slugs must be globally unique across scenarios** — `stock-risk-state`/`oversell-exposure` don't collide with Fieldwork's four, so fine. Keep new slugs distinctive to avoid clobbering a committed trace pair.

### Confidence framing (report it split — this is a spike, not a deterministic build)

Two different confidences, and conflating them would misrepresent the work:
- **Parameterization + validation landing clean: ~9.5/10.** The seams are fully mapped, the gates are reused unchanged, and the Fieldwork prompt-diff makes AC#3 a hard check.
- **The Spike-1 verdict outcome: genuinely open — by design.** Whether the floor "reads as their product" is a subjective fidelity judgment on a stochastic paid run; that openness is the *point of the spike*, not a risk to drive to 9. Do not report a single "9.5, one-pass" number that implies the eyeball result is predetermined.

### Sequencing / parallelism

Strictly sequential — Phase 5's verdict depends on Phase 4's eyeball, which depends on the parameterized runner (2–3) and the enriched fixture (1). No parallelism worth annotating. The paid run is the only irreversible/cost step — gate it behind all `--dry`-green checks.

## AMENDMENTS

- (none yet — created 2026-07-24.)
