# Feature: Data-connected prototypes — Verdant screen + Fieldwork hybrid-canvas chrome

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The lego-brick claim demonstrated, not asserted. Two shipped prototype pages render from the real
mock-API data source (the Worker from #4, degrading to committed static fixtures via
`system/scenario-data.mjs`):

- **Verdant — "Plant overview"**: a hand-crafted phone-frame screen built from the six
  components spec'd in `system/specs/` (#7 authored them spec-first; this ticket implements the
  `vd-*` CSS and flips each spec head's `status: "spec"` → `"shipped"` — the flip is promised in
  `.claude/references/kb-format.md`).
- **Fieldwork — "Dispatch board"**: the hybrid canvas — human-designed chrome (`fw-*`
  components) with the two designated, bounded agentic slot regions (`insight-panel`,
  `summary-strip`) rendered as visibly-labeled placeholders; the agentic-UI study (#13) fills
  them later.

The ticket also closes the **spec↔fixture seam** that #4 and #7 (built in parallel) left open:
the DataContracts describe records "as the mock API returns them", but the API (fixture-backed)
doesn't yet return those shapes. This plan makes the fixtures actually serve contract-valid
records — the strongest honest form of the demonstration (an engineer can hit the API and see
contract-valid data).

## User Story

As a hiring manager evaluating the "data-connected prototype" claim
I want to watch a hi-fi prototype screen render from a live mock API (and degrade to committed fixtures when it's down)
So that I can verify the components are real lego bricks bound to a real data contract, not renders of claims.

## Problem Statement

The pipeline's third station (PRD §6.3) has no prototype pages. Six Verdant ComponentSpecs exist
with `status: "spec"` and no CSS; the handoff pack (#7) therefore documents components that don't
run — the capability indicator honesty surface needs #8 to flip them to `shipped`. And the
contracts promise API shapes (`status` derived, `plantName` denormalised, a `Reading` type) that
the actual fixtures don't carry — the seam this ticket sits on must be reconciled, not papered
over with a client-side adapter that would make the contracts describe a fiction.

## Solution Statement

1. **Reconcile data to the contracts** (fixtures are content; amending them is the designed
   path): bake the contract-promised derived fields into the Verdant fixtures (deterministic
   against the scenario's fixed fictional `today: 2026-07-14`), add the missing `readings`
   collection, add a few unassigned Fieldwork jobs (the board's "Needs assignment" panel is
   otherwise empty), and extend `scenarios/validate.mjs` coherence rules so the new fields are
   machine-proven consistent. Amend the contracts/specs where the fixture vocabulary is the
   better truth (`action: water|mist|feed` → `type: water|fertilise|repot|inspect`).
2. **Implement the components**: `vd-*` (six, to spec) and `fw-*` (board chrome) as token-only
   CSS in `system/components.css` (per the ticket; new bannered section); prototype page chrome
   (device/board frames, slot regions, source-indicator strip) in `system/proto.css` following
   its existing `.proto-*` shell convention. No new contract tokens expected (the specs' token
   lists all exist — #7 verified the 46 suffice).
3. **Ship the pages**: `proto/verdant.html` + `proto/fieldwork.html`, loading the standard CSS
   stack + `proto.css`, fetching via `loadCollection` (worker → static fallback), rendering the
   fictional notice + a truthful `source` capability indicator (honesty surfaces #1 and #3).
4. **Close the loop**: flip the six spec heads to `shipped`, regenerate `handoff/verdant/`
   (`node agent-layer/gen-handoff.mjs`), record the slot-boundary design call in the
   architecture doc's open questions (precedent: the CI-gates entry settled the same way).

## Out of Scope / Non-Goals

- **Not the Factory page or scenario toggle** — that's #10. These pages are standalone,
  deep-linkable exhibits #10 will embed/link.
- **Not filling the agentic slots** — #13. Slots ship as clearly-designated, honestly-labeled
  placeholders ("planned; not yet running" register).
- **Not the component vocabulary generator** — #11. (Consequence: `fw-*` chrome components get
  NO ComponentSpecs in this ticket — the Verdant six are the handoff-pack set; fw chrome is
  human-fixed and never agent-composed, so it needs no vocabulary entry. If #13's slot fills
  need spec'd components later, that's #11/#13 scope.)
- **Not deploying the Worker** — `api.prod` stays `""`; pages honestly show `static` on the
  deployed site until the Worker's first deploy (#4 assumption inherited).
- **Not skinning the prototypes with derived scenario tokens** — pages load the neutral pack;
  the derived-system re-skin arrives when #10 wires #3's engine. (The components being
  contract-token-only is exactly what makes that free later.)
- **Not changing** the Worker's routes (`worker/api.mjs`), `system/scenario-data.mjs`,
  `site.js`, the portal, or Fieldwork's schedule/technicians fixtures beyond the unassigned-jobs
  addition.
- **No persistence** — "Log care" checks rows in-session only; no writes anywhere (Worker is
  read-only GET by architecture §Boundaries).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (design-heavy pages; cross-ticket seam reconciliation; ~600–1200 lines per the ticket estimate)
**Primary Systems Affected**: `proto/` (new), `system/components.css`, `system/proto.css`, `system/specs/`, `scenarios/` fixtures + validator, `worker/fixtures.mjs`, `handoff/verdant/` (regenerated), `docs/epics/` (one open-question record), `CLAUDE.md`
**Dependencies**: none new. `wrangler` via npx for local Worker (dev-time), `agent-browser` skill for real-browser verification.

## Related Work

**Implements**: [linardsb/ux-factory#8](https://github.com/linardsb/ux-factory/issues/8) — PR closes with `Closes #8`
**Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Recommended approach — hybrid canvas hands exploration to the study · §Data model — ComponentSpec/DataContract, Scenario package · §Boundaries — Worker degradation, honesty surfaces · §Agentic UI — Fieldwork hybrid canvas). Inherited, not re-decided.

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/scenario-packages-worker-mock-api.md` (#4) — the data source this consumes: package format, fixtures, Worker, `loadCollection` helper, fixed fictional `today`, `cache: "no-store"` honesty fix.
- `.claude/plans/handoff-data-layer.md` (#7) — the six specs this implements; the approved Verdant screen sketch (its NOTES); the `vd-` naming convention; "still a two-way door if #8's design pass amends details" (the door this plan walks through).
- `.claude/plans/live-derivation-engine.md` (#3) — not touched here, but the reason prototype components must stay contract-token-only (the derived pack re-skins them at #10).

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — #10 Factory page embeds these pages; #13 fills the Fieldwork slots; #11 generates the vocabulary from the specs this ticket flips to `shipped`)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/*.md` (all six) + `*.contract.json` (all four) — Why: THE source this ticket implements to. Each head pins `class`, `props`, `tokens`, `states`, `children`; each `## Data binding` table pins field→element mapping; `## Accessibility` pins roles/aria/44px targets. The approved screen sketch is in `.claude/plans/handoff-data-layer.md` §NOTES ("Approved Verdant screen sketch").
- `scenarios/check.html` (whole file, 106 lines) — Why: the ONLY existing page importing `system/scenario-data.mjs`; the pattern to MIRROR for data-connected pages: CSS trio load order (lines 13–15), inline `<script type="module">` with `esc()` helper, `loadRegistry`/`loadCollection` usage, notice rendering (lines 67–75).
- `system/scenario-data.mjs` (54 lines) — Why: the fetch API — `loadCollection(scenario, collection)` → `{ data, source: "worker"|"static" }`; `source` is load-bearing for the capability indicator. Do not modify.
- `system/proto.css` (lines 1–10 header; shell classes 23–263; app-layer 265+) — Why: the shell convention to extend (`.proto-*` prefixed strips like `.proto-because` 79–89 and `.proto-legal` 92–101; `.ot-phone`/`.ot-screen` bezel recipe 154–171 to MIRROR for the new frame classes — semantic tokens only in the shell layer). NOTE: the `ot-` app layer uses a PRIVATE token block (`--t-*`, lines 267–283) — the `vd-*`/`fw-*` components deliberately do NOT follow that: they bind contract tokens (that difference IS the demonstration).
- `system/components.css` (header lines 1–15; section-comment style throughout; ORGANISMS banner 868–876; `.card` 519–533; `.btn` 148–224; form atoms 1413–1446) — Why: the discipline (every colour a semantic token), the section-banner style to mirror for the new SCENARIO PROTOTYPE COMPONENTS section, and existing atoms the pages reuse. GOTCHA: line 1 still says "GENERATED MIRROR — do not edit here" — that header is STALE; architecture §Data model retired it ("canon lives in this repo"). Task below updates it; do not be blocked by it.
- `system/tokens.contract.css` (whole file, 84 lines) — Why: the complete token vocabulary the new CSS may use (colors 22–45, fonts 48–49, spacing 52–59, radius 62–64, shadows 67–69, layout 72–73, type ramp 76–83). A token not in this file may not appear in component CSS.
- `scenarios/validate.mjs` (whole file, 257 lines) — Why: where the new coherence rules land — `COHERENCE.verdant` (171–190) and `COHERENCE.fieldwork` (191–205); the generic `<thing>Id` walk (140–160) already resolves `plantId`/`techId` refs and tolerates `null` (154).
- `scenarios/verdant/fixtures/plants.json` + `care-tasks.json`, `scenarios/fieldwork/fixtures/jobs.json` — Why: current shapes being extended. Fictional `today` = `2026-07-14` (both brief heads). Current Verdant task states at today: 3 overdue · 1 due today · 14 future · 2 done. Fieldwork: 0 unassigned jobs (must add), statuses {scheduled 26, overdue 4, done 29, on-site 1}.
- `scenarios/verdant/copy.json` + `scenarios/fieldwork/copy.json` (`prototype` blocks) — Why: #4 pre-authored the screen strings — `screenTitle`, `attentionHeading`, `allClearMessage`, `overdueLabel`, `dueTodayLabel`, `healthLabels` (Verdant); `unassignedHeading`, `slaWarningLabel`, `regionLabels`, `statusLabels` (Fieldwork). Render from copy.json — do not hardcode strings the package already carries.
- `scenarios/verdant/proto.config.json` + `scenarios/fieldwork/proto.config.json` — Why: screens/collections/slots contract — Verdant `plant-overview` gains `"readings"`; Fieldwork `dispatch-board` already lists `slots: ["insight-panel", "summary-strip"]`.
- `worker/fixtures.mjs` — Why: static import manifest to extend with the readings import ("adding content, not engine work" — data registration only; `with { type: "json" }` attributes).
- `.claude/references/kb-format.md` (ComponentSpec section, lines 13–29) — Why: the head schema; line 19 is the promise this ticket keeps (`status` — `spec | shipped` … "#8 flips it"); prose sections must stay parseable by `parseComponentSpec`.
- `agent-layer/gen-handoff.mjs` — Why: regenerating the pack after spec amendments + status flips; output is deterministic (byte-identical re-runs — #7 verified), so `git diff` after a second run is the drift check.
- `scenarios/README.md` (§File shapes) — Why: fixture-shape documentation to update (new fields, `readings` collection, unassigned-jobs note).
- `docs/epics/ai-first-ux-factory.architecture.md` (Open questions, lines 90–97) — Why: the agentic-slot-boundaries open question this ticket settles; mirror the checked-off CI-gates entry format (line 92).
- `index.html` (lines 13–17, 112–114) + `derive.html` (lines 17–20, 160) — Why: shipped-page shell patterns (meta, noindex, CSS order, inline module precedent).
- `_headers` — Why: verify `/proto/*` needs no special rule (HTML default tier expected); read before deciding.

### New Files to Create

- `proto/verdant.html` — phone-frame "Plant overview" screen; inline `<script type="module">` renders from `loadCollection("verdant", …)`
- `proto/fieldwork.html` — desktop board-frame "Dispatch board" hybrid canvas with the two designated slot regions; renders from `loadCollection("fieldwork", …)`
- `scenarios/verdant/fixtures/readings.json` — the missing `Reading` collection (`{ id, plantId, kind: "moisture"|"light", value, unit, label }`)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `.claude/references/frontend-component-best-practices.md` — house UI rules (project on-demand context rule for UI work).
- `.claude/plans/handoff-data-layer.md` §NOTES → "Approved Verdant screen sketch" — the PRD-holder-approved layout this screen follows (screen-header · plant-card+chip · stat-tile ×2 · Today care-task-rows · primary-button).
- No external docs needed: no new libraries, no new platform surfaces. (If wrangler commands are run for verification, load the local `wrangler` skill first — session rule.)

### Patterns to Follow

**Page shell (from `scenarios/check.html:13-17`):**

```html
<link rel="stylesheet" href="/system/tokens.contract.css" />
<link rel="stylesheet" href="/system/tokens.neutral.css" />
<link rel="stylesheet" href="/system/components.css" />
<link rel="stylesheet" href="/system/proto.css" />   <!-- the surface file for proto pages -->
```

Plus `<meta name="robots" content="noindex" />`, `<body data-page="proto-verdant">`, no site.js
chrome (check.html precedent: exhibit pages skip the marketing header/footer).

**Data loading (from `scenarios/check.html:42-65`):** inline `<script type="module">`,
`import { loadCollection } from "/system/scenario-data.mjs"`, `esc()` helper duplicated inline
(4 lines — the accepted precedent), absolute paths only (no bare specifiers — no bundler).

**Component CSS discipline (from `components.css` header + any family, e.g. `.card:519`):**
every colour a `var(--color-*)`; spacing/radius/type via tokens; section banner comment style:

```css
/* ==========================================================================
   SCENARIO PROTOTYPE COMPONENTS — vd-* (Verdant) · fw-* (Fieldwork)
   Implements system/specs/*.md (epic #1, ticket #8). Token-only: a literal
   colour here is a bug. Each vd- class matches its spec head's "class" field.
   ========================================================================== */
```

**File headers (feature files cite their governing doc):**

```html
<!-- proto/verdant.html — Verdant "Plant overview": data-connected prototype (epic #1, ticket #8).
     PRD §6.3: components render from the real mock-API source; degrades to static fixtures
     (system/scenario-data.mjs). Fictional scenario — copy.json's notice renders below. -->
```

**Errors:** plain `Error` naming the offending path (validator additions follow
`validate.mjs`'s existing throw style verbatim).

**Validator coherence style (from `validate.mjs:170-205`):** per-scenario function, plain date
string comparison, every throw names file + record id + field.

---

## IMPLEMENTATION PLAN

### Phase 1: Data-layer reconciliation (fixtures ↔ contracts)

Make the mock API actually serve what the contracts promise. All derived values are
deterministic against the fixed fictional `today: 2026-07-14`, so baking them is stable and the
validator proves them.

### Phase 2: Contract + spec amendments

**Depends on:** Phase 1 (amended shapes describe the now-real fixtures)

Amend the four contracts and the affected spec prose/tables to the reconciled truth. `status`
stays `"spec"` in heads until the CSS lands (Phase 3) — the flip is a separate later task.

### Phase 3: Component CSS

**Independent of:** Phase 2 (CSS implements the heads' `class`/`tokens`/`states`, which don't change)

`vd-*` (six, to spec) + `fw-*` (board chrome) in `components.css`; frames/slots/source-strip in
`proto.css`.

### Phase 4: The two pages

**Depends on:** Phases 1 + 3

Build `proto/verdant.html` then `proto/fieldwork.html`; verify both fallback states in a real
browser.

### Phase 5: Close the loop + integration

**Depends on:** Phases 2 + 4

Flip spec statuses → `shipped`, regenerate the handoff pack, record the slot design call in the
architecture doc, update CLAUDE.md map, run the full validation battery.

---

## STEP-BY-STEP TASKS

### UPDATE `scenarios/verdant/fixtures/care-tasks.json`

- **IMPLEMENT**: ADD to every record: `plantName` (the referenced plant's `name`, denormalised
  per the contract's own rationale) and `status` — `"overdue"` if `due < 2026-07-14`, `"due"` if
  `due === 2026-07-14`, else `"ok"`; records with `done: true` get `"ok"`. KEEP existing fields
  (`type` stays `type` — the spec amends to it, not vice versa).
- **GOTCHA**: do not touch `due` values — the water-task arithmetic (`due = lastWatered +
  interval`) is validator-enforced.
- **VALIDATE**: `node scenarios/validate.mjs` (will still pass — new fields unchecked until the validator task)
- **SATISFIES**: AC #1 (the API serves contract-valid records)

### UPDATE `scenarios/verdant/fixtures/plants.json`

- **IMPLEMENT**: ADD `status` to every plant: the max severity of its own not-done tasks'
  statuses (`overdue` > `due` > `ok`; no tasks → `"ok"`).
- **VALIDATE**: `node -e "JSON.parse(require('node:fs').readFileSync('scenarios/verdant/fixtures/plants.json')); console.log('parses ✓')"`
- **SATISFIES**: AC #1

### CREATE `scenarios/verdant/fixtures/readings.json`

- **IMPLEMENT**: ~8 records — a `moisture` + `light` pair for each of ~4 plants (must include
  whichever plant is "most urgent" — it's the featured card): `{ "id": "read-01", "plantId":
  "plant-XX", "kind": "moisture", "value": 34, "unit": "%", "label": "Moisture" }` /
  `{ …, "kind": "light", "value": 620, "unit": "lx", "label": "Light" }`. Values plausible per
  plant health (a `struggling` plant reads low moisture).
- **PATTERN**: display-values-only per the Reading contract's own description ("deliberately not
  a sensor API").
- **VALIDATE**: JSON parses; ids unique (validator's generic checks once registered).
- **SATISFIES**: AC #1 (stat-tile has a real data source)

### UPDATE `scenarios/verdant/proto.config.json`

- **IMPLEMENT**: `plant-overview.collections` → `["plants", "care-tasks", "readings"]`.
- **VALIDATE**: `node scenarios/validate.mjs` — the fixture-exists check now covers readings.
- **SATISFIES**: AC #1

### UPDATE `scenarios/fieldwork/fixtures/jobs.json`

- **IMPLEMENT**: ADD ~4 new jobs with `techId: null`, `status: "scheduled"`, mixed
  priorities/regions, `scheduledStart` within the ±14-day window, `completedAt: null` — the
  "Needs assignment" panel's content (copy.json already carries `unassignedHeading`). New ids
  continue the `job-NNN` sequence; do NOT reassign existing jobs (schedule.json slots reference
  them).
- **GOTCHA**: the validator's `<thing>Id` walk tolerates `null` (validate.mjs:154) — no
  validator change needed for the refs; the coherence window check must still pass.
- **VALIDATE**: `node scenarios/validate.mjs`
- **SATISFIES**: AC #3 (the board has an unassigned lane to show)

### UPDATE `scenarios/validate.mjs`

- **IMPLEMENT**: extend `COHERENCE.verdant`: (a) every care-task's `plantName` equals its
  plant's `name`; (b) every not-done task's `status` matches the due/today rule above, and
  `done ⇒ status "ok"`; (c) every plant's `status` equals the max severity of its not-done
  tasks; (d) every `readings` record has `kind ∈ {moisture, light}`, numeric `value`, non-empty
  `unit`/`label` (readings arrive via the screen's collections, so `checkFixtures` already loads
  them). Extend `COHERENCE.fieldwork`: at least one job with `techId: null` (the board's
  unassigned panel must never be able to go silently empty).
- **PATTERN**: existing coherence style — throws name file + record id + field (validate.mjs:174-204).
- **VALIDATE**: `node scenarios/validate.mjs` → both ✓ lines. Negative test: flip one task's
  `status` to a wrong value → exit 1 naming it; restore.
- **SATISFIES**: AC #1 (reconciliation machine-proven, not eyeballed)

### UPDATE `worker/fixtures.mjs`

- **IMPLEMENT**: ADD `import verdantReadings from "../scenarios/verdant/fixtures/readings.json" with { type: "json" };`
  and register under `verdant.readings`. Data registration only — `worker/api.mjs` untouched.
- **VALIDATE**: `cd worker && npx wrangler dev` (background) → `curl -s http://127.0.0.1:8787/api/verdant/readings` returns the array.
- **SATISFIES**: AC #1

### UPDATE `scenarios/README.md`

- **IMPLEMENT**: §File shapes — document the new care-task fields (`plantName`, `status` and
  the derivation rule against `today`), plant `status`, the `readings` collection shape, and
  the Fieldwork unassigned-jobs requirement. One tight paragraph each; note the rationale in one
  line: "fixtures carry what the DataContracts promise — the API serves contract-valid records."
- **VALIDATE**: `grep -n "readings" scenarios/README.md`
- **SATISFIES**: AC #1 (format doc stays true)

### UPDATE `system/specs/care-task-row.contract.json` + `care-task-row.md`

- **IMPLEMENT**: contract — rename `action` → `type` with enum
  `["water", "fertilise", "repot", "inspect"]` (the fixture vocabulary is the richer truth; #7's
  plan explicitly left spec details as a two-way door for #8's design pass); `due` format →
  `"date"`; ADD `done` (boolean) to properties + required (contract has
  `additionalProperties: false`, so every served field must be listed); update `$description`
  wording "derived server-side from due vs now" → "as of the scenario's fixed fictional today
  (brief head)". Spec .md — head `props.action` → `props.type` (same enum; description stays
  "care verb — leading word of the row label"); update the `## Data binding` table + sample
  record to the real fixture shape.
- **GOTCHA**: keep the head parseable by `parseComponentSpec` (`agent-layer/lib.mjs`) — fence +
  four `##` sections unchanged in structure. `status` stays `"spec"` for now.
- **VALIDATE**: `node agent-layer/gen-handoff.mjs` runs clean (its `✓` line).
- **SATISFIES**: AC #1

### UPDATE `system/specs/plant-card.contract.json` + `plant-card.md`

- **IMPLEMENT**: contract — describe the full Plant record the API actually serves: `id`,
  `name`, `species`, `location`, `acquired` (date), `wateringIntervalDays` (integer),
  `lastWatered` (format `date`, not date-time), `lastFertilized` (date), `health` (enum
  `thriving|stable|struggling`), `notes`, `status` (enum `ok|due|overdue`, "derived from the
  plant's open care tasks as of the fictional today"), `photoUrl` (optional, uri-reference —
  never present in the demo data; the spec's monogram-placeholder path is the exercised one, say
  so honestly in the description). Required: the fields every fixture record carries. Spec .md —
  `## Data binding` table gains a "fields the card does not bind" note (health/location/etc. are
  served but unbound — the card summarises); sample record updated.
- **VALIDATE**: `node agent-layer/gen-handoff.mjs` clean.
- **SATISFIES**: AC #1

### UPDATE `system/specs/stat-tile.contract.json` + `stat-tile.md`

- **IMPLEMENT**: contract — ADD `id` (string, required — API records carry unique ids) and
  `plantId` (string, required — which plant the reading belongs to). Spec .md — Data binding
  note: the screen selects the featured plant's pair by `plantId`.
- **VALIDATE**: `node agent-layer/gen-handoff.mjs` clean.
- **SATISFIES**: AC #1

### UPDATE `system/components.css` — header + new section

- **IMPLEMENT**: (a) REWRITE line 1's stale "GENERATED MIRROR — do not edit here…" to a plain
  canon header ("system/components.css — token-only component layer; canon lives in this repo
  (architecture §Data model)…" keeping the discipline prose that follows). (b) ADD the
  SCENARIO PROTOTYPE COMPONENTS section (banner per Patterns above) at the end of the file:
  - `vd-screen-header`, `vd-plant-card`, `vd-status-chip`, `vd-stat-tile`, `vd-care-task-row`,
    `vd-primary-button` — implement EXACTLY to each spec head: the listed `tokens` only, every
    listed state (`.vd-status-chip` variants `ok|due|overdue` — state must read without colour,
    per its spec: label text carries it; `vd-plant-card` overdue state moves border to
    `--color-accent`; `vd-primary-button` disabled state; `vd-care-task-row` checked state;
    `vd-screen-header` scrolled state can be a class hook). 44px touch targets per the
    `## Accessibility` sections.
  - `fw-*` board chrome: `fw-board` (grid: toolbar / unassigned panel / lanes / slot regions),
    `fw-toolbar` (region label chips from `copy.regionLabels` — static, not interactive
    filters), `fw-job` (compact row/card: customer · site · type · priority · status chip ·
    SLA), `fw-status-chip` (variants per `statusLabels`: scheduled/en-route/on-site/done/
    overdue — text + border/weight carry state, colour never alone), `fw-lane` (one technician's
    day from schedule.json), `fw-sla` (the `slaWarningLabel` marker). Compact density —
    Fieldwork's axes say `compact`; achieve it with the existing spacing scale (xs/sm), not new
    tokens.
- **GOTCHA #1**: token lint by hand before moving on: the new section must contain NO hex, no
  `rgb(`/`rgba(`/`color-mix(` with literals, no px colours — semantic tokens only (`--color-*`,
  `--spacing-*`, `--radius-*`, `--type-*`, `--shadow-*`, `--font-*` from tokens.contract.css).
  `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" <the new section>` must return nothing.
- **GOTCHA #2**: no new contract tokens expected. If the design pass genuinely needs one, the
  path is `system/tokens.source.json` (contract group) → `node agent-layer/gen-token-css.mjs` →
  both CSS layers regenerate — never hand-edit tokens.contract.css (it's GENERATED, genuinely).
- **VALIDATE**: `node agent-layer/gen-token-css.mjs --check` (no token drift) + the grep above.
- **SATISFIES**: AC #2 (token-only components, contract discipline)

### UPDATE `system/proto.css` — shell additions

- **IMPLEMENT**: ADD a `.proto-*` shell section (semantic tokens, matching the existing shell
  layer): `.proto-frame-phone` (bezel recipe mirrored from `.ot-phone`/`.ot-screen` 154–171,
  new name — the ot- exemplar keeps its own classes), `.proto-frame-board` (desktop board
  chrome: full-width surface, toolbar strip), `.proto-source` (the capability indicator strip —
  two visual states keyed by `data-source="worker"|"static"`: e.g. "live mock API" vs "static
  fixtures (Worker unreachable or not deployed)"), `.proto-slot` (designated agentic slot
  region: dashed `--color-border-strong` boundary, `--color-bg-surface` wash, a
  `.proto-slot-label` naming the slot + its honest status — "Agentic slot — composed by the
  agentic-UI study; not yet running"), reuse `.proto-legal` for the fictional-notice strip
  (it exists for exactly this register; extend only if its styling doesn't fit both pages).
- **GOTCHA**: shell layer = semantic tokens ONLY (same lint as components.css). Do not touch the
  `ot-` app layer or its private `--t-*` block.
- **VALIDATE**: the grep lint over the added section; page renders in Phase 4.
- **SATISFIES**: AC #3 (slot regions), AC #4 (notice + source surfaces)

### CREATE `proto/verdant.html`

- **IMPLEMENT**: the phone-frame "Plant overview" per the approved sketch (handoff plan
  §NOTES). Shell: header comment (Patterns above), noindex, CSS stack + proto.css,
  `data-page="proto-verdant"`, a slim page header (title from `copy.prototype.screenTitle`,
  fictional notice via `.proto-legal`, `.proto-source` strip), then `.proto-frame-phone`
  containing the app screen built ONLY from `vd-*` components:
  1. `vd-screen-header` — `copy.prototype.screenTitle`, no back (root screen), settings
     affordance per spec.
  2. Featured `vd-plant-card` — the most urgent plant (first `overdue`, else first `due`, else
     first): name, species, `vd-status-chip` (label from `copy.prototype.overdueLabel`/
     `dueTodayLabel`/plain "OK" per status), monogram placeholder (no photoUrl in demo data —
     the spec's documented absence path).
  3. `vd-stat-tile` ×2 — the featured plant's `moisture` + `light` readings from the readings
     collection.
  4. "Needs attention today" (`copy.prototype.attentionHeading`) — `vd-care-task-row` per
     not-done task with status `due`/`overdue` (label: `"{Type} {plantName}"`, capitalised
     verb), each with its `vd-status-chip`, checkable (session-only `checked` state per spec).
     Empty → `copy.prototype.allClearMessage`.
  5. `vd-primary-button` "Log care" — disabled until ≥1 row checked; clicking marks checked
     rows visually committed (no persistence — say so in a muted caption if needed for
     honesty).
  6. "All plants" list — remaining plants as `vd-plant-card`s.
  Inline `<script type="module">`: `esc()` helper, `loadCollection("verdant", "plants"|"care-tasks"|"readings")`,
  render, set `.proto-source` from the worst source seen (any `static` → indicator says
  static), tiny check/enable interaction. All data derivations (featured plant, today filter)
  read the baked `status` fields — compare against nothing but them (the fictional today lives
  in the data, not the page).
- **PATTERN**: check.html's module shape; spec `## Accessibility` sections (list semantics,
  aria-pressed or checkbox semantics for rows, chip text readable without colour).
- **GOTCHA**: absolute paths (`/system/…`, no bare specifiers); escape every fixture string;
  page must render sensibly in BOTH sources and show a plain failure message if even static
  fetch fails (loadCollection throws — catch at the top like check.html:101).
- **VALIDATE**: `npx serve .` → `http://localhost:3000/proto/verdant.html` renders with
  `wrangler dev` up (source: worker) AND down (source: static) — real browser via agent-browser.
- **SATISFIES**: AC #1 (data-connected + graceful degradation), AC #2 (vd-only components), AC #4 (labeling)

### CREATE `proto/fieldwork.html`

- **IMPLEMENT**: the "Dispatch board" hybrid canvas. Same shell pattern (title/notice/source
  from fieldwork copy.json), then `.proto-frame-board` containing:
  1. Board toolbar — `copy.prototype.screenTitle`, region chips from `regionLabels` (static
     labels), the fictional `today` restated (the board renders the scenario's fixed day —
     honesty: don't imply live ops).
  2. "Needs assignment" panel (`unassignedHeading`) — `fw-job` rows for `techId: null` jobs,
     priority marked, `fw-sla` marker where `slaDue` is within 2 days of today or lapsed
     (`slaWarningLabel`).
  3. Technician lanes — one `fw-lane` per technician with today's `schedule.json` slots joined
     to jobs (`jobId` → job), `fw-status-chip` per job from `statusLabels`.
  4. **The two agentic slots** — `.proto-slot` regions placed IN the board layout:
     `insight-panel` (side region) and `summary-strip` (top strip under the toolbar), each with
     its slot id + the honest placeholder label. **The recorded design call:** `insight-panel` +
     `summary-strip` are agent-composed (bounded); toolbar, unassigned panel, and lanes are
     human-fixed. This is the architecture open question being settled — recorded in the page
     header comment, the arch doc (task below), and the PR.
  Inline module: `loadCollection("fieldwork", "jobs"|"technicians"|"schedule")`, join, render,
  source indicator as on Verdant.
- **GOTCHA**: compact density via existing spacing tokens; statuses must read without colour
  (labels from `statusLabels` always visible); slots must look designed-and-bounded, not broken
  (the honesty register: "planned; not yet running", never fake content).
- **VALIDATE**: same two-state browser check as Verdant.
- **SATISFIES**: AC #3 (canvas + designated slots + design call recorded), AC #1's degradation
  clause for Fieldwork's data, AC #4.

### UPDATE `system/specs/*.md` ×6 — flip `status`

- **IMPLEMENT**: after the CSS + pages render: `"status": "spec"` → `"status": "shipped"` in
  all six heads (kb-format.md:19's promise — the honesty surface now states these run).
- **VALIDATE**: `grep -l '"status": "spec"' system/specs/*.md` returns nothing.
- **SATISFIES**: AC #2 + honesty contract (capability indicators truthful)

### REGENERATE `handoff/verdant/`

- **IMPLEMENT**: `node agent-layer/gen-handoff.mjs` — the pack picks up amended contracts,
  amended prose, and `shipped` statuses. Commit the diff (deploy = commit the artifacts). Run
  it TWICE; the second run must produce zero diff (determinism — #7's guarantee).
- **VALIDATE**: `node agent-layer/gen-handoff.mjs && node agent-layer/gen-handoff.mjs && git diff --stat handoff/` (second run adds nothing).
- **SATISFIES**: AC #2 (handoff pack matches shipped reality)

### UPDATE `docs/epics/ai-first-ux-factory.architecture.md`

- **IMPLEMENT**: check off the open question (line 96) in the settled style of line 92:
  `- [x] Agentic-slot boundaries in the Fieldwork canvas — settled 2026-07-17 (#8): agent-composed = insight-panel + summary-strip (bounded regions in proto/fieldwork.html); human-fixed = toolbar, unassigned panel, technician lanes. #13 composes into the two slots only.`
- **VALIDATE**: `grep -n "Agentic-slot" docs/epics/ai-first-ux-factory.architecture.md`
- **SATISFIES**: AC #3 ("design call recorded during build")

### UPDATE `CLAUDE.md`

- **IMPLEMENT**: architecture map — one line for `proto/` ("data-connected prototype pages —
  Verdant phone screen + Fieldwork hybrid canvas; components implemented to `system/specs/`");
  extend the existing `system/specs/` or components bullet ONLY if now inaccurate (specs are no
  longer "spec-only"). Surgical.
- **VALIDATE**: `grep -n "proto/" CLAUDE.md`
- **SATISFIES**: housekeeping (map stays true)

### VERIFY `_headers`

- **IMPLEMENT**: read it; `/proto/*` HTML should ride the default page tier (like index.html).
  Add a rule ONLY if the existing file's structure demands one for new paths (expected: no
  change).
- **VALIDATE**: `cat _headers`
- **SATISFIES**: AC #1 (pages served sanely)

---

## TESTING STRATEGY

Project rule (CLAUDE.md §Testing): no suite, no linter — "done" = run the surface you touched.

### Unit-level

- `node scenarios/validate.mjs` after every fixture/validator edit (including one deliberate
  negative per new coherence rule: break, observe exit 1 naming the path, restore).
- `node agent-layer/gen-handoff.mjs` after every spec/contract edit.
- Hand token-lint: `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\("` over the new CSS sections → empty.

### Integration

- Worker battery: `wrangler dev` + curl for `verdant/readings` (new) and one existing
  collection (regression).
- Both pages × both states (Worker up / down) in a real browser (agent-browser): data renders,
  `source` indicator truthful, notices visible, slots designated.

### Edge Cases

- All care tasks checked → "Log care" enables; none → disabled (spec'd disabled state).
- Zero due/overdue tasks (simulate by temporarily filtering in DevTools, not by editing
  fixtures) → `allClearMessage` renders.
- Worker up but slow → 2500ms timeout → static (stop wrangler mid-load).
- Static-only deploy state (`api.prod: ""`) → pages go straight to static, no console errors.
- Fieldwork: unassigned panel populated (validator now guarantees ≥1); a job with lapsed
  `slaDue` shows the SLA marker.
- Keyboard: task rows checkable via keyboard; focus visible (spec `## Accessibility`).

### Regression

- `node agent-layer/gen-token-css.mjs --check` — token layers undrifted.
- `scenarios/check.html` still renders (it consumes the same fixtures — now with extra fields,
  which it ignores; confirm no breakage from the readings collection appearing in
  proto.config).
- `index.html` renders under the neutral pack (components.css additions must not disturb
  existing families).
- `node scenarios/validate.mjs` + full `node agent-layer/gen-handoff.mjs` — the two generators' `✓` lines.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check scenarios/validate.mjs && node --check worker/fixtures.mjs
for f in scenarios/verdant/fixtures/*.json scenarios/verdant/proto.config.json scenarios/fieldwork/fixtures/jobs.json system/specs/*.contract.json; do node -e "JSON.parse(require('node:fs').readFileSync('$f'))" || echo "FAIL $f"; done
```

### Level 2: Content + generators

```bash
node scenarios/validate.mjs                      # both ✓ lines, exit 0
node agent-layer/gen-handoff.mjs                 # ✓ line; then re-run + git diff --stat handoff/ → empty
node agent-layer/gen-token-css.mjs --check       # no drift
grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" system/components.css | awk -F: '$1 > 1446' # nothing in the new section
```

### Level 3: Worker

```bash
cd worker && npx wrangler dev   # background; then:
curl -s http://127.0.0.1:8787/api/verdant/readings | head -c 200
curl -s http://127.0.0.1:8787/api/verdant/care-tasks | head -c 300   # shows plantName + status
```

### Level 4: Manual (both pages, both states — real browser)

```bash
npx serve .   # background
# Worker UP:   /proto/verdant.html + /proto/fieldwork.html → source: worker, data renders
# Worker DOWN: reload both → source: static, identical rendering, no console errors
# Verify: notices visible · slots designated (fieldwork) · Log care enable/disable · SLA marker
```

### Level 5: Regression

```bash
# /scenarios/check.html renders both states · index.html renders · validate + both generators ✓
```

---

## ACCEPTANCE CRITERIA

(from issue #8, expanded with the seam duties discovered in planning)

- [ ] Verdant screen renders real fixture data fetched from the Worker; Worker unreachable →
      graceful static-fixture degradation (same rendering, truthful `source` indicator).
- [ ] All components token-only (hand token-lint clean); any needed token declared via
      `tokens.source.json` → regeneration, never hand-edited into the contract.
- [ ] The six `vd-*` components implement their specs (class names, states, accessibility);
      spec heads flipped to `shipped`; `handoff/verdant/` regenerated and deterministic.
- [ ] Contracts describe what the API actually serves; fixtures carry the promised derived
      fields; `scenarios/validate.mjs` proves the new coherence and both packages pass.
- [ ] Fieldwork canvas renders with the two clearly-designated bounded slot regions; the
      agent-composed vs human-fixed design call is recorded (page header + architecture doc).
- [ ] Fictional-scenario labeling visible on both pages (honesty surface #1); `source`
      capability indicator truthful (honesty surface #3).
- [ ] Zero regressions: check.html, index.html, both generators, token drift-check all clean.
- [ ] New entry files open with headers citing ticket #8 / PRD §6.3 / architecture sections.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE ran clean at the time
- [ ] Level 1–5 validation commands all pass
- [ ] Both pages verified in BOTH worker-up and worker-down states in a real browser
- [ ] Spec statuses flipped only AFTER the CSS + pages actually render (never before — honesty)
- [ ] Handoff pack regenerated, second run byte-identical
- [ ] Content read once end-to-end for the honesty contract (nothing implies real products,
      live agents, or persistence that doesn't exist)
- [ ] Commit stages ONLY this ticket's files (the tree carries unrelated uncommitted work —
      CLAUDE.md/README edits from other sessions, `.agents/`, `.archon/`, etc. — leave them);
      message per convention: `data-connected prototypes: Verdant screen + Fieldwork hybrid canvas (epic #1, ticket #8)`; PR carries `Closes #8`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (proceeding on these; each is flagged for the PR description):**

1. **Reconciliation direction: fixtures move toward the contracts** (baked derived fields, new
   readings collection), and **specs/contracts adopt the fixture vocabulary** where they
   conflict (`type: water|fertilise|repot|inspect` over `action: water|mist|feed`). Rationale:
   the honesty contract — the handoff pack must describe an API that actually answers that way;
   a client-side adapter would leave the contracts describing a fiction. #7's plan explicitly
   left spec details as "a two-way door if #8's design pass amends details"; this is that door.
2. **`vd-*`/`fw-*` component CSS lives in `system/components.css`** (the ticket names it twice)
   with page chrome in `proto.css` — NOT in proto.css's app layer, because the ot- exemplar's
   private-token approach is the opposite of the demonstration (contract tokens are the point).
   The stale "GENERATED MIRROR — do not edit" header is corrected per architecture §Data model.
3. **Pages live at `proto/verdant.html` + `proto/fieldwork.html`** (new top-level dir; root
   stays uncluttered; #10 links/embeds them). Page logic is inline `<script type="module">`
   per the check.html/derive.html precedent — CLAUDE.md's "ES module beside site.js" rule
   governs shared view-time behaviour, which already exists (`scenario-data.mjs`); page-local
   rendering stays in the page for view-source inspectability.
4. **Slot design call**: agent-composed = `insight-panel` + `summary-strip`; human-fixed =
   toolbar, unassigned panel, technician lanes. Recorded per the architecture doc's own
   settled-question precedent.
5. **No new contract tokens** — the specs' token lists exist (46-token contract suffices, #7
   verified). Fieldwork status/SLA semantics ride existing tokens (accent + border weights +
   always-visible labels), matching the status-chip spec's colour-never-alone rule.
6. **No ComponentSpecs for `fw-*` chrome** — deliberate scope (see Non-Goals); the Verdant six
   are the handoff set this ticket ships.
7. **Fieldwork's board renders the fictional `today` (2026-07-14) and says so** — a live-ops
   illusion would breach the honesty contract.

**Questions for the user (none blocking — defaults chosen):** none critical. If you'd rather
keep `action: water|mist|feed` in the contract (renaming fixture fields instead), say so before
implementation — it inverts task order in Phase 1/2 and touches the validator's water-task
arithmetic wording, but is the same size.

## NOTES (open canvas)

**Why baking derived fields beats a client adapter.** Three candidate resolutions were weighed:
(a) client-side adapter deriving `status`/`plantName` at view time — rejected: contracts would
describe a server that doesn't exist ("derived server-side"), the pack's realism claim breaks,
and every consumer (#10, #13) re-implements the derivation; (b) change the Worker to derive at
request time — rejected: the Worker is deliberately dumb (routes never change, fixtures bundled
verbatim; deriving there would also make the static-fallback files diverge from API responses —
the single-source trick is the point); (c) bake into fixtures against the fixed fictional today
— chosen: deterministic forever (the #4 "no relative dates" rule), identical bytes from Worker
and fallback, machine-proven by the validator, and the contract description just gains one
honest clause ("as of the scenario's fixed fictional today").

**Verdant screen composition traceability** (sketch → components → data):

| Region | Component | Data |
| --- | --- | --- |
| Top bar | vd-screen-header | copy.prototype.screenTitle |
| Featured plant | vd-plant-card + vd-status-chip | most urgent plant (baked status) |
| Readings pair | vd-stat-tile ×2 | readings where plantId = featured |
| Today list | vd-care-task-row + vd-status-chip | tasks status ∈ {due, overdue}, !done |
| Action | vd-primary-button | session-checked rows (no persistence) |
| All plants | vd-plant-card list | remaining plants |

**Fieldwork board regions** (the recorded design call): summary-strip (SLOT, top) ·
insight-panel (SLOT, side) · toolbar / needs-assignment / lanes (human-fixed). The slots sit
where an ops lead would want computed insight (breach risk, load balance) — exactly what #13's
agent composes from the same fixtures.

**Sequencing note:** Phase 3 (CSS) is independent of Phase 2 (contract/spec text) — a parallel
session could own one while the other proceeds; Phases 4–5 need both. Single-session execution
top-to-bottom is fine and simpler.

**Line-budget sanity vs the ticket's 600–1200 estimate:** fixtures/validator ~150 · contracts/
specs ~120 · components.css section ~350 · proto.css section ~120 · two pages ~450 · docs ~30 →
~1200, at the top of the estimate; the pages and CSS carry the design weight.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->

- 2026-07-17 — Executed as planned (report: `.claude/reports/data-connected-prototypes-report.md`).
  Two browser-found CSS fixes beyond the written tasks: `.vd-screen-body > * { flex: none }`
  (scroll-column flexbox compressed cards below natural height) and `.fw-job` grid → flex-wrap
  (side cluster overlapped the customer in the narrow panel). Mid-run, a parallel session
  committed the epic snapshot `4a3997b` onto this branch carrying Phases 1–3; the ticket's
  remaining delta commits separately (stage by explicit path — two foreign plan files are
  in-flight in the shared tree).
