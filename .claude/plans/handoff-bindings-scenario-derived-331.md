# Feature: bindings, scenario constants and derived rules in the handoff pack (#331)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Written against `origin/main` @ `81a0a84`** in the detached worktree `../wt-331-plan`. The primary tree
(`fix/importer-reads-icon-name-449`) is 37 commits behind main and dirty — do not implement there. Branch from
`origin/main`: `git -C ../wt-331-plan switch -c feat/handoff-bindings-331`.

## Feature Description

The Verdant handoff pack (`handoff/verdant/`) tells a backend engineer what each record looks like, but not which
screen reads which collection, on which fictional day, or how `status` is computed. The 2026-08-28 fenced seam run
guessed all of these, and got today (Q1), the Today window (Q3), the featured-plant tie-break (Q4) and the
"My plants" order (Q24) wrong. This ticket makes the pack say them, generated, never hand-written in `handoff/`:

1. **`bindings`** in `pack.json`: for the one real screen (`plant-overview`), its four views: featured plant,
   featured readings, Today, All plants. For each view: component, contract, collection, filter text, order text,
   and an optional pick. It also carries a `notInScope` line saying there is no plant-detail screen.
2. **`scenario.json`** in the pack: `today` from the brief's head, `fictionalNotice` from `copy.json`.
3. **`readOnly: true` + `x-derived: { from, rule }`** on `status` in `care-task-row.contract.json` and
   `plant-card.contract.json` (owner decision, 2026-10-03; see Open Questions). `from` resolves every entry.
4. Group 39 (`handoff-seam`) extended to gate all three, with a mutation battery.

## User Story

As a backend engineer who receives only the handoff pack
I want the pack to state the fictional today, how `status` is derived, and which view reads which collection in what order
So that I can serve records the prototype renders correctly without a round-trip to design

## Problem Statement

`scenarios/verdant/brief.md:14` holds `"today": "2026-07-14"`. No pack file states it. The two contracts say
status is "derived from due vs the scenario's fixed fictional today" and do not say how. The view rules live only
in `proto/verdant.html:113-121`, as inline JavaScript. The seam run reverse-engineered `2026-07-15` from a chip label,
and every derived field it served was a day off while every contract validation passed
(`docs/epics/fixtures/handoff-seam/2026-08-28-seam/questions.md` rows 1–4, 12, 19, 24).

## Solution Statement

- A hand-written **design statement**, `scenarios/verdant/bindings.json`, holds the view rules as text (epic Q1:
  text first). It is a scenario-package sibling of `proto.config.json`, not an edit to it. The reason:
  `gen-company-package.mjs:133` writes `proto.config.json`, and `validate.mjs` requires collections on every screen.
- `gen-handoff.mjs` gains three **pure exports** — `projectBindings`, `projectScenario`, `derivedProblems` — and
  calls them. It writes `pack.json#/bindings` and `handoff/verdant/scenario.json`, and throws (naming the path) on a
  statement that names a missing screen, collection or contract, on a key outside the closed key set, on text that
  breaks the bound, or on any unresolvable `x-derived.from`.
- The two contracts gain `readOnly` + `x-derived`. Their descriptions repoint from "the brief's head" to
  `scenario.json`, which is where the Q1 asker looked.
- `gen-pack-index.mjs` gains a `scenario.json` route, which it must because the routing table is total, and rewords the
  `pack.json` line to mention bindings. Since #419, `llms.txt` is the pack's consumption section; there is no pack README.
- Group 39 drives the three pure exports over real inputs (positive control = the committed pack) and over
  mutated copies (each mutation must be named by path), plus an **independent** second reading: brief fence → `today`,
  fixture records ⊆ contract key set, and the closed-key / bound scan.

## Out of Scope / Non-Goals

- Not included: the log-care command contract and `components.css` in the pack (#332), metrics + F7 (#333),
  `contract-check.mjs` (#334). The bindings carry no endpoint, so #334 decides how a URL maps to a collection.
- Not included: a filter/order **grammar**. Text only (epic Q1). A grammar is #334's call if it needs to evaluate one.
- Not included: `x-derived` on `status-chip.value` (owner decision), on `plantName` (denormalised, not derived), or on
  `status-chip.label`.
- Not changing: `proto.config.json`, `proto/verdant.html`, `worker/`, fixtures, `validate.mjs`. The rules are
  *stated*, not changed.
- Not changing: `pack.json`'s existing keys or the viewer (`system/handoff-viewer.mjs` reads `components` +
  `portability` only, checked at `:66-110`; `catalog.mjs:593` reads `portability` only).
- The bound: nothing about endpoints, URLs, HTTP verbs, caching, envelopes, pagination, auth or versioning
  enters `bindings`, `scenario.json` or any `x-derived` text.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `agent-layer/gen-handoff.mjs`, `agent-layer/gen-pack-index.mjs`, two DataContracts, `tooling/build-checks.mjs` group 39, `handoff/verdant/*` (regenerated)
**Dependencies**: none new (zero-dep Node ESM)

## Related Work

**Implements**: #331 · **Epic**: #329 (`docs/epics/handoff-seam.prd.md`; decisions D1, D2; open question Q1)

**Back-references**:
- `.claude/plans/pack-routing-index-419.md` — Why: #419 created group 39 (`handoff-seam`) and the total routing
  table; this ticket extends both rather than adding a second group.
- `.claude/plans/handoff-seam-run-fixtures-330.md` — Why: #330 committed the seam run whose questions this answers.

**Forward-references**:
- #332, #333 rebase onto this group-39 shape; #334 reads `pack.json#/bindings` to choose collections.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `agent-layer/gen-handoff.mjs` (all 104 lines) — the file you extend. Contracts copy loop `:49-53`, `pack` object
  `:69-93`, write `:94`, return `:96`, standalone guard `:100-104`.
- `agent-layer/gen-pack-index.mjs` `:41-117` (`ROUTES`), `:120-127` (`routeIndex`) — add one route; the header
  `:16-18` says a new pack file adds its line in the same edit.
- `tooling/build-checks.mjs` `:248-249` (imports of the pack generators), `:330-346` (`ok`/`group`),
  `:13489-13654` (group 39, whole block). Mirror its style: existence before read, `threw`, a mutation table
  `for (const [label, mutated, mustName, mustSay] of [...])`, and the closing `group("handoff-seam", ...)` detail string.
- `scenarios/validate.mjs:221` (task status rule) and `:225-230` (plant status = worst open task). **The rule text
  must say what these lines do.** Never take it from the seam run's answers.
- `proto/verdant.html:76` (`SEV`), `:113-118` (featured = stable sort by severity, first; rest = the others),
  `:118` (readings filtered to the featured plant), `:121` (Today filter), `:103` (`href="#plant-<id>"`, the
  dead detail link). **The view text must say what these lines do.**
- `scenarios/verdant/brief.md:7-16` (the ```json head), `scenarios/verdant/copy.json` (`fictionalNotice`),
  `scenarios/verdant/proto.config.json` (one screen, `plant-overview`, three collections).
- `system/specs/care-task-row.contract.json`, `system/specs/plant-card.contract.json` — the two contracts you edit.
- `agent-layer/gen-vocabulary.mjs:59-61,84` — inlines each contract verbatim into `vocabulary.json`, which is also a
  **prompt input** (`portal/lib/canvas-session.mjs`, the record-* recorders). The `x-derived.rule` text therefore
  reaches future agent runs. It is a definition, not an example, so this is allowed; keep it free of worked
  examples. (The `example` exclusion at `gen-vocabulary.mjs:62-70` is the precedent for what must stay out.)
- `tooling/drift-check.mjs:137-150` (`checkHandoff`: regenerates, then fails on ANY `git status --porcelain handoff/`).
- `.claude/references/gates.md:67` — group 39's entry; updated in the same edit as the `group()` string.
- `.claude/references/kb-format.md:31` — the DataContract bullet; the `x-derived` convention is documented next to it.
- `scenarios/README.md:39-50` (package file list), `:112-121` (`proto.config.json` shape) — document `bindings.json`.

### New Files to Create

- `scenarios/verdant/bindings.json` — the hand-written view statement (design input, like a spec).
- `handoff/verdant/scenario.json` — GENERATED by `gen-handoff`; never hand-edited.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [JSON Schema 2020-12 meta-data vocabulary, `readOnly`](https://json-schema.org/draft/2020-12/json-schema-validation#section-9.4)
  — Why: `readOnly: true` is standard. It means the owning authority (the backend) sets the value, and a client
  should not send it.
- [JSON Schema 2020-12 core, unknown keywords](https://json-schema.org/draft/2020-12/json-schema-core#section-6.5)
  — Why: an implementation that meets an unknown keyword such as `x-derived` collects it as an annotation and does not
  fail. That keeps every contract valid 2020-12.
- [RFC 6901 JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) — Why: `from` entries use `file#/pointer`. The
  resolver only needs `/`-separated keys; no key here carries `~` or `/`, so escaping is refused, not implemented.

### Patterns to Follow

**Pure export + generator throw** (`gen-pack-index.mjs:120-127`):
```js
export function routeIndex(rel) {
  const i = ROUTES.findIndex((r) => r.test(rel));
  if (i === -1)
    throw new Error(`handoff/verdant/${rel}: no routing rule in agent-layer/gen-pack-index.mjs — ...`);
  return i;
}
```
Every throw names the offending **path** first (`scenarios/verdant/bindings.json: views[2].collection "plantz" ...`).

**Audit as a problems array, so mutations can be driven** (group 39's `audit`, `build-checks.mjs:13547-13568`):
the function returns `string[]` and never throws; each string names a path. The generator throws
`problems.join("; ")` when the array is non-empty. `derivedProblems` follows this shape.

**Mutation table** (`build-checks.mjs:13582-13590`):
```js
for (const [label, mutated, mustName, mustSay] of [ ... ]) {
  const problems = audit(mutated, files);
  ok(problems.some((p) => p.includes(mustName) && p.includes(mustSay)),
    `${label} must be caught naming ${mustName} and saying ${JSON.stringify(mustSay)} — got ${problems.length ? problems.join(" | ") : "NO PROBLEM REPORTED"}`);
}
```

**Existence before read** (`build-checks.mjs:13531-13536`): `ok(onDisk.includes(X), ...)` then
`const text = onDisk.includes(X) ? readFileSync(...) : ""`. A deleted `scenario.json` must report, not crash.

**The brief fence** (`validate.mjs:56`, `lib.mjs:67`): ``text.match(/```json\s*\n([\s\S]*?)\n```/)``.

---

## IMPLEMENTATION PLAN

### Phase 1: the statement and the contracts (data only)
Write `bindings.json`, add `readOnly` + `x-derived` to the two contracts, and repoint their descriptions.

### Phase 2: the generator
**Depends on:** Phase 1.
The three pure exports in `gen-handoff.mjs`, wired into `genHandoff()`, plus the `scenario.json` route in `gen-pack-index.mjs`.

### Phase 3: regenerate + gate
**Depends on:** Phase 2.
Run the pack chain, extend group 39, and update the docs (gates.md, kb-format.md, scenarios/README.md).

### Phase 4: validate
Run the full gate stack, fill the PR-body question table from the generated files, and regenerate loc-summary.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE `scenarios/verdant/bindings.json`

- **IMPLEMENT**: exactly this content. Each string transcribes the cited line, and no string carries ` · `, `/api`,
  an HTTP verb or a URL:
  ```json
  {
    "$description": "Which view of each Verdant screen reads which collection, filtered and ordered how — the rules proto/verdant.html renders, stated for the backend. Hand-written design input; agent-layer/gen-handoff.mjs projects it into handoff/verdant/pack.json#/bindings. A view binds a record shape, never an endpoint (epic #329 D1).",
    "screens": [
      {
        "screen": "plant-overview",
        "views": [
          {
            "id": "featured",
            "component": "plant-card",
            "collection": "plants",
            "filter": "every plant",
            "order": "status overdue, then due, then ok; plants of equal status keep the order the collection is served in",
            "pick": "the first plant after ordering is the featured plant; the page gives it no heading",
            "witness": ["plant-03"]
          },
          {
            "id": "featured-readings",
            "component": "stat-tile",
            "collection": "readings",
            "filter": "plantId equals the featured plant's id",
            "order": "as served",
            "witness": ["read-03", "read-04"]
          },
          {
            "id": "today",
            "title": "Needs attention today",
            "component": "care-task-row",
            "collection": "care-tasks",
            "filter": "done is false and status is due or overdue, which is every open task due on or before scenario.json's today; nothing later appears",
            "order": "as served; the screen does not sort this list",
            "witness": ["task-03", "task-05", "task-08", "task-18"]
          },
          {
            "id": "all-plants",
            "title": "All plants",
            "component": "plant-card",
            "collection": "plants",
            "filter": "every plant except the featured one",
            "order": "status overdue, then due, then ok; plants of equal status keep the order the collection is served in",
            "witness": ["plant-05", "plant-08", "plant-01", "plant-02", "plant-04", "plant-06", "plant-07", "plant-09", "plant-10", "plant-11", "plant-12", "plant-13", "plant-14", "plant-15"]
          }
        ]
      }
    ],
    "notInScope": [
      "a plant-detail screen: each plant card links to #plant-<id> and no screen renders that target"
    ]
  }
  ```
  The `today` title is `copy.json` `prototype.attentionHeading`. "All plants" is hard-coded at
  `proto/verdant.html:152`. The ticket's "My plants" is this `all-plants` view, and the PR table says so.
- **PATTERN**: `scenarios/verdant/proto.config.json` (sibling, plain JSON).
- **`witness`** is the list of record ids the page renders for that view **on the committed fixtures, in order**. It
  is what makes the text checkable. Build-checks re-derives it from the fixtures (Task 8 case 6), and proto-journey
  reads it off the real rendered page (Task 9). Observed in headless chromium on main:
  plants `plant-03, plant-05, plant-08, plant-01, …, plant-15`; today `task-03, task-05, task-08, task-18`; tiles
  `Moisture 22`, `Light 180` = `read-03`, `read-04` (probe file, `dom.cjs`).
- **GOTCHA**: `validate.mjs:159-163` only walks `fixtures/`, so a root-level `bindings.json` is not refused (observed:
  `node scenarios/validate.mjs` reads `proto.config.json`, `copy.json`, `brief.md`, `intake.defaults.json`, fixtures).
- **GOTCHA**: the featured-readings `order` is "as served". The page renders `pair.map(tile)` in fixture order
  (`read-03` moisture, `read-04` light, observed). Do not write "moisture then light", because the page does not enforce it.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('scenarios/verdant/bindings.json','utf8'));console.log('ok')"` → `ok`; `node scenarios/validate.mjs` → unchanged 4 lines (observed on main: `scenario verdant ✓ 8 questions · 3 collections · 43 records · verdict: habit-justified`).
- **SATISFIES**: AC 1, AC 3 (Q3, Q4, Q12, Q24).
- **REGENERATES**: none on its own (consumed in Task 4).

### Task 2 — UPDATE `system/specs/care-task-row.contract.json`

- **IMPLEMENT**:
  - `description` (top level): replace `(the brief's head)` with `(handoff/verdant/scenario.json's today)`.
  - `status`: add `"readOnly": true` and
    ```json
    "x-derived": {
      "from": ["due", "done", "../scenario.json#/today"],
      "rule": "done is true: ok. Otherwise compare due with today as calendar days (YYYY-MM-DD): due before today is overdue, due equal to today is due, due after today is ok."
    }
    ```
    Keep `type`, `enum` and the existing `description`.
- **PATTERN**: `scenarios/validate.mjs:221`: `t.done ? "ok" : t.due < today ? "overdue" : t.due === today ? "due" : "ok"`. The rule text says exactly this.
- **GOTCHA**: `from` entries are **relative to the contract's own location in the pack** (`contracts/`), the same
  way its `$id` resolves. So the scenario file is `../scenario.json`, not `scenario.json`.
- **GOTCHA**: this file's text reaches `vocabulary.json`, a prompt input. Give no worked example (no "task-03 is
  overdue").
- **VALIDATE**: `node -e "const c=JSON.parse(require('fs').readFileSync('system/specs/care-task-row.contract.json','utf8'));console.log(c.properties.status.readOnly, c.properties.status['x-derived'].from)"` → `true [ 'due', 'done', '../scenario.json#/today' ]`
- **SATISFIES**: AC 3 (Q1 via `from`, Q2).
- **REGENERATES**: `handoff/verdant/contracts/care-task-row.contract.json`, `vocabulary.json`, `pack.bundle.json`, `llms.txt` (Task 7).

### Task 3 — UPDATE `system/specs/plant-card.contract.json`

- **IMPLEMENT**: same description repoint as Task 2. On `status`, add `"readOnly": true` and
  ```json
  "x-derived": {
    "from": ["id", "care-task-row.contract.json#/properties/plantId", "care-task-row.contract.json#/properties/done", "care-task-row.contract.json#/properties/status"],
    "rule": "the worst status among the care tasks whose plantId is this plant's id and whose done is false, ranked overdue, then due, then ok; ok when it has none."
  }
  ```
- **PATTERN**: `scenarios/validate.mjs:225-230` (`open = ... !t.done`, `reduce` to worst, seed `"ok"`).
- **GOTCHA**: `care-task-row.contract.json` (no `../`) resolves to a sibling under `contracts/`, which is correct.
- **VALIDATE**: same one-liner against `plant-card.contract.json` → `true [ 'id', 'care-task-row.contract.json#/properties/plantId', ... ]`
- **SATISFIES**: AC 3 (Q2, the plant half).
- **REGENERATES**: as Task 2.

### Task 4 — ADD pure exports to `agent-layer/gen-handoff.mjs` and wire them in

- **IMPLEMENT**: copy `BINDING_KEYS`, `BOUND_RE`, `RECORD_ID_RE`, `projectBindings`, `projectScenario` and
  `derivedProblems` from `.claude/plans/handoff-bindings-scenario-derived-331-probe.txt` (`proto.mjs` section).
  Pre-flight ran them against the real tree with this plan's contract edits applied in memory, and every positive
  control and every Task 8 mutation came out as specified: **31 passed, 0 failed (observed)**. `witnessOf` is NOT
  copied into gen-handoff; it belongs to build-checks (Task 8), so the witness is never derived by the code that
  emits it. The spec below is what that code does (all pure: no fs, no clock; the IO stays in `genHandoff()`):
  1. `export const BINDING_KEYS = Object.freeze({ statement: [...], screen: [...], view: [...], viewRequired: [...] })`,
     the closed key sets:
     statement `["$description", "screens", "notInScope"]`; screen `["screen", "views"]`;
     view `["id", "title", "component", "collection", "filter", "order", "pick", "witness"]`;
     viewRequired `["id", "component", "collection", "filter", "order", "witness"]` (`witness`: a non-empty array of
     non-empty strings; the generator checks only its shape, and build-checks checks its content).
  2. `export const BOUND_RE = /\/api\b|https?:\/\/|\b(GET|POST|PUT|PATCH|DELETE)\b|\bendpoint|\bpaginat|\bcach(e|ing)\b|\bauth\b|\benvelope|\bversion/i`.
     It applies to the **values** of `filter`, `order`, `pick`, `title`, `notInScope[]`, `fictionalNotice` and
     `x-derived.rule`. It is not applied to `$description`, which states D1 ("never an endpoint") on purpose.
     (Observed fit: none of the Task 1/2/3 strings or the current `fictionalNotice` match. Re-check after writing.)
  3. `export function projectBindings(statement, { protoConfig, contractOf, at = "scenarios/verdant/bindings.json" })` → the pack-side object.
     `contractOf(component)` returns the spec head's `contract` filename or `null` (or `undefined` for an unknown component).
     Throws, naming `at` and the JSON path (e.g. `screens[0].views[2].collection`), on: an unknown key at any level;
     a missing required view key or one that is not a non-empty string; a `witness` that is not a non-empty array of strings; `screen` not in `protoConfig.screens[].id`;
     `collection` not in **that screen's** `collections`; a `component` with no spec (`undefined`) or no contract
     (`null`); duplicate view `id` within a screen; a `BOUND_RE` hit; `notInScope` not an array of non-empty strings.
     Returns:
     ```js
     { $description: <statement.$description>, screens: statement.screens.map((s) => ({
         screen: s.screen, title: <protoConfig screen title>,
         views: s.views.map((v) => ({ id, ...(title && { title }), component, contract: `contracts/${contractOf(component)}`, collection, filter, order, ...(pick && { pick }), witness })) })),
       notInScope: statement.notInScope }
     ```
  4. `export function projectScenario(head, copy, { at = "scenarios/verdant" } = {})` → `{ $description, scenario: head.slug, today: head.today, fictionalNotice: copy.fictionalNotice }`.
     Throws naming `${at}/brief.md` if `today` is not `/^\d{4}-\d{2}-\d{2}$/` or does not round-trip as a UTC date
     (mirror `validate.mjs:28-36` `isoDay`). Throws naming `${at}/copy.json` if `fictionalNotice` is empty or hits `BOUND_RE`.
     `$description`: `"The Verdant scenario's constants: the fixed fictional today every derived field is computed against, and the notice the demo-notice component renders verbatim. Generated by agent-layer/gen-handoff.mjs from scenarios/verdant/brief.md and copy.json — do not edit."`
  5. `export function derivedProblems(files)`. `files` maps a pack-relative path to its parsed JSON
     (`{ "scenario.json": {...}, "contracts/care-task-row.contract.json": {...}, ... }`). It returns `string[]`, each starting `handoff/verdant/<contract path>: properties.<field>`, for:
     a property with `x-derived` whose `readOnly !== true`; `from` not a non-empty array of strings; `rule` not a
     non-empty string, a `BOUND_RE` hit, or a `RECORD_ID_RE` (`/\b[a-z]+-\d{2,}\b/`) hit. The last one closes R5:
     the rule text reaches `vocabulary.json`, a prompt input, so it may not carry a worked example such as `task-03`; `x-derived` keys other than `from`/`rule`; any `from` entry that does not
     resolve. Resolution: an entry with no `#` must be a key of the same contract's `properties`. Otherwise
     `file#/pointer`, where `file` is joined to the contract's directory with `node:path`'s `posix.join` +
     `posix.normalize`, and must be a key of `files`. Then walk the pointer's `/`-split segments (skip the empty first);
     a segment containing `~` is a problem ("pointer escapes are not supported"), and any missing step is a problem
     naming the entry. A property with `readOnly: true` and no `x-derived` is also a problem, because a read-only field
     with no stated derivation is the gap D2 closes.
- **WIRE** in `genHandoff()`, after the contracts copy loop (`:49-53`) and before `const pack`:
  - read `scenarios/verdant/brief.md` (fence regex as in `lib.mjs:67`; throw naming the path if absent/unparseable),
    `copy.json`, `proto.config.json`, `bindings.json` (constants `SCENARIO_DIR = join(ROOT, "scenarios/verdant")`).
  - `const scenario = projectScenario(head, copy)`; `writeFileSync(join(DEST, "scenario.json"), JSON.stringify(scenario, null, 2) + "\n")`.
  - `const contractFiles = Object.fromEntries(specs.filter((s) => s.head.contract).map((s) => [`contracts/${s.head.contract}`, JSON.parse(readFileSync(join(SPECS, s.head.contract), "utf8"))]))`;
    `const problems = derivedProblems({ "scenario.json": scenario, ...contractFiles })`; throw `problems.join("; ")` if any.
  - `const contractOf = (name) => specs.find((s) => s.head.component === name)?.head.contract;`
    `const bindings = projectBindings(statement, { protoConfig, contractOf })`.
  - add `bindings` to `pack` **between `components` and `portability`**; extend `$description` with
    `"…, the bindings (which view reads which collection, filtered and ordered how; scenario.json carries today), …"`.
  - return `{ ..., views: <total view count>, derived: <count of x-derived fields> }`. Extend the standalone log line
    and `agent-layer/build.mjs:36` to `… + ${hp.views} bound views + ${hp.derived} derived fields (handoff/verdant)`.
- **IMPORTS**: add `readFileSync` to the `node:fs` import (`:17`) and `posix` from `node:path` (`:18`).
- **HEADER**: extend the file header (`:1-15`) with a paragraph citing `epic #329 ticket #331 (D1, D2)`. It should state
  that bindings and scenario.json are projected from `scenarios/verdant/`, that the three projections are pure and
  exported for build-checks group 39, and that the rule text is a statement of `proto/verdant.html` and
  `scenarios/validate.mjs`, not an evaluation of them.
- **GOTCHA**: do NOT place `scenario.json` under `contracts/`. That dir is `rmSync`'d each run (`:49`), and the route
  table only routes `contracts/*.contract.json` and `contracts/commands/*.json` there.
- **GOTCHA**: never call `genHandoff()` from build-checks. It writes, and group 39's header (`:13500-13502`) cites
  group 18's rule against it. Only the pure exports are imported.
- **GOTCHA**: `build.mjs` runs from the jobs folder. All new paths resolve from `ROOT`, never cwd (header `:15`).
- **VALIDATE**: `node --check agent-layer/gen-handoff.mjs` (no output); then Task 7.
- **SATISFIES**: AC 1, AC 2 (generator side), AC 4.
- **REGENERATES**: via Task 7.

### Task 5 — UPDATE `agent-layer/gen-pack-index.mjs` ROUTES

- **IMPLEMENT**: insert after the `pack.json` route (`:47-51`):
  ```js
  {
    test: (rel) => rel === "scenario.json",
    purpose: () => "the scenario's constants: the fixed fictional today every derived field is computed against, and the fictional notice shown verbatim",
    readWhen: () => "computing or serving any derived field (x-derived in the contracts), or rendering the demo notice",
  },
  ```
  Reword the `pack.json` purpose to: `"every ComponentSpec (machine head, engineer prose, portability block) and the bindings: which view of each screen reads which collection, filtered and ordered how"`.
  Reword its readWhen to: `"you want the prose behind a component, or which records a screen shows and in what order"`.
- **GOTCHA**: no purpose or readWhen may contain `SEP` (` · `). Group 39 asserts 4 fields per line (`:13617`).
- **GOTCHA**: the routing table is total. Without this route `genPackIndex()` throws on `handoff/verdant/scenario.json`, and group 39 case 3 reds by path.
- **VALIDATE**: `node --check agent-layer/gen-pack-index.mjs`.
- **SATISFIES**: AC 1 (the pack's consumption section names the new file).
- **REGENERATES**: `handoff/verdant/llms.txt` (Task 7).

### Task 6 — UPDATE docs

- `.claude/references/kb-format.md`: after `:31`, add one bullet. **Derived fields** (#331): a field the backend
  computes carries `"readOnly": true` + `"x-derived": { "from": [...], "rule": "..." }`. Each `from` entry is a property
  of the same contract or a `file#/pointer` relative to the contract's location in the pack. `gen-handoff` refuses an
  unresolvable entry, and build-checks group 39 gates it.
- `scenarios/README.md`: add `bindings.json   (optional, Verdant) which view of each screen reads which collection, filtered and ordered how — projected into the handoff pack` to the file list (`:39-50`), and a `### bindings.json` shape section after `### proto.config.json` (`:112-121`) giving the closed key set.
- **VALIDATE**: `git diff --stat` shows both files.
- **SATISFIES**: AC 1.
- **REGENERATES**: none.

### Task 7 — RUN the pack chain (in this order)

```bash
node agent-layer/gen-handoff.mjs      # ✓ 26 specs + 3 token targets + 3 wc wrappers + 4 bound views + 2 derived fields (26 and 3 observed on main)
node agent-layer/gen-vocabulary.mjs
node agent-layer/gen-pack-bundle.mjs
node agent-layer/gen-pack-index.mjs   # ✓ 18 files (handoff/verdant/llms.txt)  — 17 on main (observed), +1 scenario.json
```
- **VALIDATE**: `git status --porcelain handoff/` lists exactly: `M pack.json`, `M vocabulary.json`, `M pack.bundle.json`,
  `M llms.txt`, `M contracts/care-task-row.contract.json`, `M contracts/plant-card.contract.json`, `?? scenario.json`.
  Anything else (tokens/, wc/) is unexpected. Stop and diff.
- **GOTCHA**: the order is pinned (drift-check `:138-141`, group 39 case 5, group 50.11). The index runs last.
- **GOTCHA**: no other generator should move. `gen-inspect-data.mjs` reads spec `.md` heads, not contracts, and `gen-build-handoff.mjs` / `gen-system-graph.mjs` read neither (grepped). If groups 40, 42 or 43 go red after this task, the cascade reached the import verdict: run `node import/regen-expected.mjs` and `node tooling/regen-import-records.mjs` in this PR (`ratify.mjs` `CHAIN` lists them). Never hand-edit their output.
- **REGENERATES**: the seven pack paths above.

### Task 8 — EXTEND group 39 in `tooling/build-checks.mjs`

- **IMPORTS** (beside `:248-249`): `import { BINDING_KEYS, BOUND_RE, derivedProblems, projectBindings, projectScenario } from "../agent-layer/gen-handoff.mjs";`
- **IMPLEMENT**: four new numbered sections inside the existing block, before `group("handoff-seam", …)` at `:13653`.
  They reuse `PACK`, `threw`, `at`, `onDisk` from the block. Add a block-header paragraph and a `WHAT THIS CANNOT REACH`
  sentence: whether the rule and view **text** is what `proto/verdant.html` and `validate.mjs` do. Text is not
  evaluated (epic Q1). The proof is the PR-body table plus review, and later #334 or a grammar.

  **6 · bindings ↔ proto.config**
  - Read `scenarios/verdant/{bindings,proto.config}.json` and the committed `handoff/verdant/pack.json` (existence before read).
  - Positive control: `projectBindings(statement, { protoConfig, contractOf })` deep-equals `pack.bindings`
    (a block-local `deep` with sorted keys, as group 40 declares its own inside its block). `contractOf` maps over the
    committed `pack.components`: `(name) => { const c = pack.components.find((x) => x.component === name); return c ? (c.contract ? c.contract.replace(/^contracts\//, "") : null) : undefined; }`.
  - **Independent second reading** (not via `projectBindings`): for every view in `pack.bindings`: its collection is
    in its screen's `proto.config` collections, `handoff/verdant/<view.contract>` exists on disk, and **every record of
    `scenarios/verdant/fixtures/<collection>.json` has keys ⊆ the contract's `properties` and ⊇ its `required`**
    (observed on main: plants/plant-card 15 ok, care-tasks/care-task-row 20 ok, readings/stat-tile 8 ok; plants against
    care-task-row: 15 of 15 refused, so the check can fail).
  - `pack.bindings.notInScope` has an entry matching `/detail/` (Q12 pinned).
  - **The witness, derived independently.** A block-local `witnessOf(fixtures)` (copy it from the probe file) applies
    the stated rules to `scenarios/verdant/fixtures/*.json`: stable sort by severity, the first is featured, readings
    filtered to it, today = not done and due/overdue as served, all-plants = the rest. Assert that each view's
    committed `witness` deep-equals `witnessOf(...)[view.id]`, and that the witness view ids are exactly the four views.
    Positive control: on a fixture clone with `plants[0].status = "overdue"`, `witnessOf` must move `featured` to
    `plant-01` (observed), which proves it reads the data rather than echoing the statement. Mutation: a pack copy
    whose `today` witness drops `task-18` must be named (`today`, `task-18`).
  - Mutation table over `projectBindings`, each must THROW naming the stated words:
    | label | mutation | must name |
    |---|---|---|
    | unknown collection | `views[2].collection = "plantz"` | `screens[0].views[2].collection`, `plantz` |
    | unknown screen | `screens[0].screen = "plant-detail"` | `plant-detail` |
    | contract-less component | `views[0].component = "text"` | `text`, `no DataContract` |
    | unknown component | `views[0].component = "fern-card"` | `fern-card` |
    | extra key (the bound) | `views[0].endpoint = "x"` | `endpoint`, `unknown key` |
    | bound text | `views[2].filter = "GET /api/care-tasks?due=today"` | `views[2].filter` |
    | duplicate view id | `views[3].id = "today"` | `today`, `duplicate` |
    | missing order | `delete views[1].order` | `views[1].order` |
    | empty witness | `views[1].witness = []` | `views[1].witness` |
    And one mutation over the **independent reading**: the today view rebound to `plants` must be refused for the
    key-set (`care-task-row`, `plants`), driven through the same block-local function the positive pass used.

  **7 · scenario.json ↔ brief + copy**
  - `handoff/verdant/scenario.json` exists (existence before read); its `today` equals the brief fence's `today`,
    parsed **here** with the fence regex (independent of the generator). Its `fictionalNotice` equals
    `copy.json`'s byte for byte. Its keys are exactly `["$description","fictionalNotice","scenario","today"]` (sorted).
  - Positive control: `projectScenario(head, copy)` deep-equals the committed file.
  - Mutations: `projectScenario({...head, today: "2026-07-32"}, copy)` throws naming `brief.md`;
    `projectScenario(head, {...copy, fictionalNotice: ""})` throws naming `copy.json`. And the group's own comparator
    over a committed copy with `today: "2026-07-15"` (the seam run's wrong guess) must report naming
    `scenario.json` and `today`. That makes the comparator a block-local function returning problems, driven twice.

  **8 · x-derived resolves**
  - Build `files` from disk: `scenario.json` + every `handoff/verdant/contracts/*.contract.json`.
  - Positive control: `derivedProblems(files)` is `[]`. The set of derived fields is **exactly**
    `["contracts/care-task-row.contract.json#status", "contracts/plant-card.contract.json#status"]`, so a deleted
    `x-derived` reds by name.
  - Mutations (deep-clone `files`, then mutate), each must yield a problem naming the contract path + `status` + the word:
    | mutation | must say |
    |---|---|
    | care-task-row `from[0] = "dew"` | `dew` |
    | care-task-row `from[2] = "../scenario.json#/tomorrow"` | `tomorrow` |
    | plant-card `from[1] = "care-task-row.contract.json#/properties/plantID"` | `plantID` |
    | care-task-row `from[2] = "../missing.json#/today"` | `missing.json` |
    | care-task-row delete `readOnly` | `readOnly` |
    | care-task-row `rule = ""` | `rule` |
    | plant-card add `x-derived.how = "x"` | `how` |
    | stat-tile `properties.value.readOnly = true` (no x-derived) | `value`, `x-derived` |
    | care-task-row `rule += " e.g. task-03 is overdue"` | `task-03` (R5: no worked example) |
    | care-task-row `from[2] = "../scenario.json#/to~day"` | `escapes` |

  **9 · the bound, over the committed artifacts**
  - Walk `pack.bindings`, `scenario.json` and every `x-derived` in the committed contracts. No key outside
    `BINDING_KEYS` (bindings) and no value matching `BOUND_RE`, except `$description` fields. Positive control: the
    committed set scans clean. Mutation: a copy of `pack.bindings` with `screens[0].views[0].cacheTtl = 300` must be named.
    This is a second, artifact-side reading of the same bound the generator enforces.

- **UPDATE the `group("handoff-seam", …)` string** (`:13653`): prepend `the pack's reading seam (#331): bindings ↔ proto.config, fixtures ⊆ contract key sets, scenario.json ↔ brief + copy, x-derived resolved (N mutations) · ` before the #419 text, and append the new cannot-reach clause.
- **UPDATE `.claude/references/gates.md:67`**: rename to `**Group 39 — the handoff seam: the routing index (#419) and the reading seam (#331)**` and add a paragraph matching the new cases and the cannot-reach clause. Memory "gate prose has three copies": block header, `group()` string, gates.md. Grep all three. gates.md:67 also says "seventeen missing files"; after this ticket the pack carries eighteen, so update that word.
- **GOTCHA**: the group name stays `"handoff-seam"`. A second `group("handoff-seam")` call would not change drift-check's
  `checkGroupCount` (it counts a `Set` of names, `drift-check.mjs:197-198`), but it would print two lines. Extend, do not add.
  The count stays **51** (observed `build ✓  all 51 groups pass`).
- **GOTCHA**: every case that reads a file asserts existence first. Measure by deleting `handoff/verdant/scenario.json`
  and `scenarios/verdant/bindings.json` in turn. Expect named failures, exit 1, no stack trace (the #419 precedent, gates.md:67).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "handoff-seam|all [0-9]+ groups"` → `build handoff-seam   ✓  the pack's reading seam (#331): …` and `build ✓  all 51 groups pass`.
- **REDDENS** (run each, observe ✗, revert):
  1. `scenarios/verdant/brief.md` today → `2026-07-15`, no regen → `handoff/verdant/scenario.json … today` (case 7).
  2. Remove `x-derived` from `system/specs/plant-card.contract.json`, then regen → `gen-handoff` throws on `readOnly`
     without `x-derived`. Remove both keys and regen → case 8's exact-set assertion names `plant-card … status`.
  3. Rebind `today` to `plants` in `bindings.json` and regen. `gen-handoff` accepts it (plants IS one of the screen's collections), so case 6's key-set reading is what reds, naming `care-task-row` and `plants`.
  4. Add `"endpoint": "/api/today"` to a view → `gen-handoff` throws `unknown key`.
- **SATISFIES**: AC 2, AC 4.
- **REGENERATES**: none (build-checks writes nothing). `loc-summary.json` is not affected by `tooling/`; see Task 9.

### Task 9 — ADD section [11] to `tooling/proto-journey.mjs`: the bindings read off the real page

- **IMPLEMENT**: after section [10] (ends `await work.close();`, near `:319`) and before `await ctx.close();`:
  ```js
  console.log("\n[11] the pack's bindings are what the page renders (#331)");
  const bp = await newPage(ctx);
  await bp.goto(`${BASE}/proto/verdant.html`, { waitUntil: "load" });
  await bp.waitForSelector("#today-list", { timeout: 20000 });
  const seen = await bp.evaluate(() => ({
    plants: [...document.querySelectorAll("#app .vd-plant-card")].map((e) => e.dataset.plantId),
    today: [...document.querySelectorAll("#today-list .vd-care-task-row")].map((e) => e.dataset.taskId),
    tiles: [...document.querySelectorAll("#app .vd-stat-tile")].map((e) => `${e.querySelector(".vd-stat-label").textContent} ${e.querySelector(".vd-stat-value").textContent}`),
  }));
  const views = BINDINGS?.screens?.[0]?.views;
  t("handoff/verdant/pack.json carries bindings (regenerate: node agent-layer/gen-handoff.mjs)", Array.isArray(views), `got ${typeof BINDINGS}`);
  const W = Object.fromEntries((views ?? []).map((v) => [v.id, v.witness]));
  const tileOf = (id) => { const r = READINGS.find((x) => x.id === id); return r ? `${r.label} ${r.value}` : `missing ${id}`; };
  if (views) {
  t(`the featured plant is the first card (${W.featured})`, seen.plants[0] === W.featured[0], `got ${seen.plants[0]}`);
  t("the featured readings are the tiles, in order", JSON.stringify(seen.tiles) === JSON.stringify(W["featured-readings"].map(tileOf)), JSON.stringify(seen.tiles));
  t(`the Today list is the witness (${W.today.length} rows)`, JSON.stringify(seen.today) === JSON.stringify(W.today), JSON.stringify(seen.today));
  t(`All plants is the witness (${W["all-plants"].length} cards)`, JSON.stringify(seen.plants.slice(1)) === JSON.stringify(W["all-plants"]), JSON.stringify(seen.plants.slice(1)));
  }
  await bp.close();
  ```
  At module top, beside the other imports-from-the-repo (`:52-53`), read the committed pack and fixture with
  `readFileSync` (add `import { readFileSync } from "node:fs";`):
  `const BINDINGS = JSON.parse(readFileSync(new URL("../handoff/verdant/pack.json", import.meta.url), "utf8")).bindings;`
  `const READINGS = JSON.parse(readFileSync(new URL("../scenarios/verdant/fixtures/readings.json", import.meta.url), "utf8"));`
  Update `.claude/references/gates.md:112` (the `proto-journey.mjs` entry) with one sentence for [11]: the bindings'
  witness ids equal the rendered page's order. Also add what [11] cannot reach: whether the rule TEXT says what the
  witness shows, which is a review read. Add one sentence to the header (`:8-10` area): this driver also asserts that the handoff pack's bindings witness is
  what `/proto/verdant.html` renders (#331), which is the one place the bindings' text meets the page's code.
- **PATTERN**: section [6] (`:197-200`, `newPage(ctx)` + `goto` + `waitForSelector`) and the `t(name, cond, extra)` helper (`:73-76`).
- **GOTCHA**: the page falls back to static fixtures when the Worker is absent, and `EXPECTED_NOISE` (`:69`) already
  filters that console noise. The witness is fixture-ordered, so Worker and fallback agree (`worker/fixtures.mjs`
  imports the same files).
- **GOTCHA** (memory "stale serve = wrong tree"): a sibling session's `serve.mjs` may hold 4757 and serve ITS tree.
  Run with a private port: `PORT=4831 node tooling/visual-regression/serve.mjs & SP=$!` then
  `BASE=http://127.0.0.1:4831 node tooling/proto-journey.mjs all`, then `kill $SP` (your own PID only).
  Playwright resolves from `tooling/visual-regression/node_modules`. In a fresh worktree, run
  `cd tooling/visual-regression && npm ci` first.
- **GOTCHA**: the guard keeps a missing `bindings` from crashing the run. Without it, `BINDINGS.screens[0]` would
  throw before Task 7 has run, abort the engine, and leave a count that means "stopped here" rather than coverage
  (memory). With the guard, it reports one named ✗.
- **VALIDATE**: `BASE=http://127.0.0.1:4831 node tooling/proto-journey.mjs all`. On main as it stands, **observed
  `37 passed, 0 failed` on each of chromium, firefox and webkit** and `proto-journey ✓  all assertions passed`. After this
  task, expect **42 passed, 0 failed** per engine (37 + the guard + four witness lines; derived). Webkit is included; the page is not in a scroller, so the webkit lazy-iframe
  trap (memory) does not apply.
- **REDDENS**: in `handoff/verdant/pack.json` (working copy, no regen) swap `task-05` and `task-08` in the today
  witness, then expect `✗ the Today list is the witness` on every engine, then `git checkout handoff/verdant/pack.json`.
  Second: in the **real** `proto/verdant.html` (only the working tree is served), change the sort at `:115` from
  `SEV[b.status] - SEV[a.status]` to `SEV[a.status] - SEV[b.status]`. Expect `[11]` red on the featured and all-plants
  lines, then run `git checkout proto/verdant.html`. Run this only with no other uncommitted edit to that file. That proves the
  check reaches the page's own code.
- **SATISFIES**: AC 5 (the rule text is proven against the page). This closes R3 and R4.
- **REGENERATES**: none. `proto-journey.mjs` is in `tooling/`, outside every loc-summary group (`gen-loc-summary.mjs:25-28`).

### Task 10 — loc-summary + full gates

- `git add` everything first (memory: gen-loc reads **tracked** content, so `--check` before staging is a false pass).
  Then `node agent-layer/gen-loc-summary.mjs`. `agent-layer/gen-handoff.mjs` and `gen-pack-index.mjs` are in the
  `generators` group (`gen-loc-summary.mjs:28`), so `system/loc-summary.json` may move. Approach renders the `runtime`
  group only (memory), so no VR baseline moves. Commit any change.
- **REGENERATES**: `system/loc-summary.json` (maybe, rounding to 100).

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is build-checks group 39, plus drift-check, plus `node scenarios/validate.mjs`.

### Unit-shaped checks
Group 39 cases 6–9 drive the three pure exports over real inputs (positive control) and over mutated copies.

### Integration
`node tooling/drift-check.mjs`. It re-runs the four pack generators and fails on any `handoff/` porcelain change.
Run it **after commit** (it treats an uncommitted regenerated file as drift, `drift-check.mjs:142-149`).

### Edge cases
- `scenario.json` deleted: reports, no crash.
- `bindings.json` deleted: reports, no crash (`gen-handoff` throws naming it).
- A `from` pointer with `~`: refused by name.
- A view with `title` absent (featured, featured-readings): projected without the key, not `title: undefined`.
- A key order change in `bindings.json` must not move `pack.json` unexpectedly. The projection emits keys in a fixed order.

### Proving the checks
Each case's REDDENS row is in Task 8. Positive controls: the committed pack audits clean, and the key-set check
refuses plants-against-care-task-row (observed 15/15 refused on main), so the second reading can fail.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check agent-layer/gen-handoff.mjs && node --check agent-layer/gen-pack-index.mjs && node --check tooling/build-checks.mjs`

### Level 2: the pure gate
`node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed on main: 51, ~26 s).

### Level 3: generators + drift
`node scenarios/validate.mjs` (4 ✓ lines, unchanged) · after commit: `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · handoff · … · group-count` (observed on main).
Requires `npm ci` in `tooling/style-dictionary` and `tooling/icons` in a fresh worktree (done in `../wt-331-plan`, observed exit 0 for both).

### Level 4: manual
- `cat handoff/verdant/scenario.json`. `today` is `2026-07-14`.
- `node -e "const p=require('./handoff/verdant/pack.json');console.log(p.bindings.screens[0].views.map(v=>v.id))"` → `[ 'featured', 'featured-readings', 'today', 'all-plants' ]`
- `grep -n "scenario.json" handoff/verdant/llms.txt` → one line.
- `npx serve .` then open `/handoff.html`. It renders as before. Bindings are not displayed; no viewer change is in scope.
- Fill the PR-body table with `grep -n`:
  | seam-run Q | answer | file → line |
  |---|---|---|
  | Q1 today | `today` | `handoff/verdant/scenario.json:<n>` + `contracts/care-task-row.contract.json:<n>` (`../scenario.json#/today`) |
  | Q2 status derivation | `x-derived.rule` | `contracts/care-task-row.contract.json:<n>`, `contracts/plant-card.contract.json:<n>` |
  | Q3 Today window | view `today` `filter` | `pack.json:<n>` |
  | Q4 featured plant | view `featured` `order` + `pick` | `pack.json:<n>` |
  | Q12 no detail screen | `notInScope[0]` | `pack.json:<n>` |
  | Q19 fictionalNotice | `fictionalNotice` | `handoff/verdant/scenario.json:<n>` |
  | Q24 My plants order | view `all-plants` `order` | `pack.json:<n>` |
  Note in the PR that the seam run's own answers to Q3, Q4 and Q24 were wrong ("+7 days", "earliest due", "id order")
  and the pack now says what the page does.

### Level 5: VR
None expected: no shipped page or view-time module changes. `components.html` renders props, not the inlined contract (`catalog.mjs:220-265`, checked). `handoff.html` is not in the VR set (`visual.spec.mjs:31-145`, checked).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| `proto-journey.mjs all` (operator-run, three engines, Task 9) | free, about 1–2 min | **yes**: AC 5 | run it; its output goes in the report |
| no agent run, no credential, no owner verdict | — | — | — |

The epic's hypothesis test (a third fenced run) is "Later, not sliced" and not this ticket's.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1: every addition is generated by `gen-handoff` (`bindings`, `scenario.json`, regenerated contracts, vocabulary, bundle, index); nothing hand-written in `handoff/`; `node tooling/drift-check.mjs` clean after commit.
- [ ] AC 2: group 39 (`handoff-seam`) asserts bindings ↔ `proto.config.json` (collections exist in the screen, contracts exist, fixtures fit the contract key set), `scenario.json.today` ↔ brief, and every `x-derived.from` resolves (same-contract field or `file#/pointer`), each with a mutation that reddens it.
- [ ] AC 3: the PR body carries the Q1, Q2, Q3, Q4, Q12, Q19, Q24 → file → line table.
- [ ] AC 4: the bound holds: closed key sets + `BOUND_RE` enforced by the generator and re-read by the gate.
- [ ] `node tooling/build-checks.mjs` → all 51 groups pass; `node scenarios/validate.mjs` unchanged.
- [ ] Group 39's header, `group()` string and gates.md:67 agree.
- [ ] AC 5 (added by this plan, closing R3/R4): every view carries a `witness`. Build-checks re-derives it from the
  fixtures, and `proto-journey.mjs` section [11] reads the same ids off the rendered page on chromium, firefox and
  webkit. Both are green, and both have been seen red under their REDDENS mutation.

## COMPLETION CHECKLIST

- [ ] Tasks 1–10 in order, each VALIDATE run
- [ ] Every REDDENS mutation observed red, then reverted
- [ ] drift-check run after the commit
- [ ] loc-summary regenerated after staging
- [ ] PR body: `Closes #331`, the question table, the plan/report/review paths

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Resolved (owner, 2026-10-03):** `x-derived` goes on `care-task-row.status` + `plant-card.status`, not
  `status-chip`. The ticket names status-chip, but it has no `status` field (its fields are `value`, `label`), and the
  epic's "plant-status rule" lives on plant-card. The AC's "`from` names a real field of the same contract" is widened
  to "every `from` entry resolves". A bare name means a field of the same contract, and `file#/pointer` means another pack file.
- **Owner-visible addition, vetoable:** `witness` per view is beyond the ticket. It is the epic's over-specification
  watch item ("please remove this"). If vetoed, drop Task 9, the witness case in Task 8 case 6 and AC 5, and R4 goes
  back to "text only, checked in review".
- **Assumption A1:** one screen with four views, not "two screens (My plants, Today)". `proto.config.json` has one
  screen, and inventing a second would make the pack describe a UI that does not exist. The ticket's "My plants" =
  the `all-plants` view; "Today" = the `today` view.
- **Assumption A2:** the bindings statement lives in `scenarios/verdant/bindings.json`, not in `proto.config.json`.
  The ticket allows either. `proto.config.json` is also written by `gen-company-package.mjs:133`.
- **Assumption A3:** `title` is optional on a view, because the featured block has no heading on the page.
- **Assumption A4:** `BOUND_RE`'s word list is the epic's non-goal list. If a legitimate future string trips it
  (e.g. "author"), the `\bauth\b` boundary already excludes that one. Widen by adding words; never by exempting a field.

## RISKS (confidence 10/10 for one-pass implementation; R4 reduced to one review read)

| Risk | How it is closed | Evidence |
|---|---|---|
| R1: one screen, not the ticket's two | A decision, not a guess: `proto.config.json` and the rendered page both have one screen. The PR table maps "My plants" → `all-plants` and "Today" → `today`, and the PR body states the reading in one line. | headless render: one `#app`, four regions (observed) |
| R2: no pack README | Since #419, `llms.txt` is the consumption section, and group 39 refuses a pack `README.md` by name. Task 5 adds the `scenario.json` line, and the PR body says so in one line. | `gen-pack-index.mjs` ROUTES; group 39 case 3 |
| R3: rules differ from the seam run's answers | The rules come from the page, and the page is now checked: `witness` + proto-journey [11]. | chromium render = witness, all four views (observed) |
| R4: rule text never checked against the page | **Reduced, not closed.** Text ↔ witness ↔ page. Build-checks proves the witness follows from the fixtures by the stated rules, and proto-journey proves the page renders the witness. A change to the page's sort reds [11] (Task 9 REDDENS). Text-to-witness is the one human step, read once in review; three of its four rules are each a single clause. | probe 31/31; dom.cjs (observed) |
| R5: rule text reaches a prompt input | `derivedProblems` refuses a record id in `x-derived.rule` (`RECORD_ID_RE`). `bindings` and `witness` live in `pack.json` only, and `gen-vocabulary.mjs` reads spec heads + contracts, never `pack.json`, and no `portal/` module reads `pack.json` or the bundle (`git grep` empty, observed). | probe mutation "worked example" (observed) |
| R6: group 39 complexity | The pure code exists and ran: probe file, 31/31. Task 8's mutation tables are the probe's, one for one. | probe file |

## NOTES (open canvas)

### Pre-flight (run 2026-10-03 against `origin/main` @ 81a0a84, worktree `../wt-331-plan`)

| Ran | Observed | Changed in the plan |
|---|---|---|
| `gh issue view 331`, `329` | Ticket written at "gen-handoff 104 lines, 32 groups". Main now has **51** groups, and #419 already landed a `handoff-seam` group (39) | Extend group 39; do not add a group. Group count stays 51 |
| `cat proto.config.json` | **one** screen `plant-overview` | A1: four views on one screen, not two screens |
| `cat status-chip.contract.json` | no `status` field | Asked the owner → care-task-row + plant-card |
| read `proto/verdant.html:76-121`, simulated on fixtures | featured `plant-03`; readings `read-03, read-04`; Today `task-03, task-05, task-08, task-18`; All plants `plant-05, plant-08, plant-01, …` | Seam-run answers to Q3/Q4/Q24 are wrong; the rule text is taken from the page |
| `validate.mjs:221,225-230` | the two status rules in code | Rule text mirrors them verbatim |
| `gen-pack-index.mjs` ROUTES + group 39 case 3 | the table is total; `README.md` is a junk path the gate refuses | New `scenario.json` route; "pack README" = `llms.txt` |
| `gen-vocabulary.mjs:59-84` | contracts inlined, and vocabulary is a prompt input | GOTCHA: no worked examples in rule text |
| `canvas-session.mjs:116` vocab sha | recorded in runs only, not gated | none |
| `catalog.mjs`, `handoff-viewer.mjs`, `visual.spec.mjs` | no at-rest render of contract JSON on a VR page | No VR regen expected |
| `drift-check.mjs:137-150,195-218` | any handoff/ porcelain = red; group count is a name Set | drift-check after commit; extending keeps 51 |
| `ratify.mjs` CHAIN + group 50.11 | pack-chain order pinned; tests stub `runStep` | Chain order unchanged |
| fixtures ⊆ contract key sets (python) | 15/20/8 ok; plants vs care-task-row 15/15 refused | Added the key-set reading, with its positive and negative control |
| `npm ci` sd + icons; `drift-check`; `build-checks`; `validate.mjs` | all green on main (`all 51 groups pass`, ~26 s) | Baselines recorded in VALIDATE fields |

### Rejected alternatives
- **Regions inside `proto.config.json`**: couples the pack statement to a file `gen-company-package` writes, and to `validate.mjs`'s screen rules.
- **Executable filter predicates now**: epic Q1 says text first. A grammar is a second implementation of the page's JS
  that nothing yet consumes.
- **A worked example in bindings, computed by the generator**: still rejected. It would mean a second implementation of
  the page rules inside the generator. **Adopted instead (amendment 2026-10-03):** a *hand-written* `witness` per view.
  Nothing in the generator computes it. Build-checks re-derives it from the fixtures, and proto-journey reads it off the
  page, so the text, the witness and the page are checked against each other. The witness is an owner-visible addition
  beyond the ticket; see Open Questions.
- **A new build-checks group**: #419 already named the seam group, and a second one splits one seam across two lines.

### Why `from` is relative to the contract
The contracts carry `$id` under `…/handoff/verdant/contracts/`. A `from` reference resolved the way a `$ref` would
(`../scenario.json#/today`) means a standard JSON Schema tool reading the pack resolves the same file the gate
resolves.

## AMENDMENTS

- 2026-10-03: risks R1–R6 closed at the owner's request ("increase confidence to 10 and address all risks").
  Added: a per-view `witness` (Task 1); `RECORD_ID_RE` in `derivedProblems` (R5); the witness re-derived in group 39
  case 6; a new Task 9, proto-journey [11], which reads the bindings off the rendered page on three engines; AC 5; the
  probe file `handoff-bindings-scenario-derived-331-probe.txt` (the target code, run 31/31); and the headless render
  that matches the witness. Old Task 9 → Task 10.

- 2026-10-03 (implementation): Task 4's generator-side `contractOf` (`specs.find(...)?.head.contract`) returned
  `undefined` for a spec with no `contract` key, so a contract-less component read as "names no spec". It is now
  `s ? s.head.contract || null : undefined`. Task 8 case 9's "no key outside `BINDING_KEYS`" also missed the two keys
  the projection adds (`contract` on a view, `title` on a screen); the scan admits exactly those two.
