# Notes on the Verdant handoff pack

## What it is

A generated design-system handoff for **Verdant**, a fictional plant-care phone app (`pack/pack.json` `$description`, `scenario: "verdant"`). It carries:

- 20 ComponentSpecs: machine head (props, tokens, states, children, example) plus prose sections (Usage, States, Data binding, Accessibility). `pack/pack.json`, mirrored as `pack/vocabulary.json` with the contracts inlined and three composition rules.
- 4 DataContracts, JSON Schema 2020-12, all closed with `additionalProperties: false`: `pack/contracts/*.contract.json`.
- Tokens: DTCG source `pack/tokens.dtcg.json`, builds in `pack/tokens/css/{contract,neutral}.css`, `ios/FactoryTokens.swift`, `android/tokens.xml`.
- 3 web-component wrappers `pack/wc/vd-*.mjs` with `pack/wc/README.md`.
- `pack/figma-import.md` (design-tool round-trip; irrelevant to the API).
- `pack/pack.bundle.json` is the other 15 files inlined; verified byte-identical, ignored.

Two screens are implied but never specified as such: **My plants** (screen-header + plant-card list; `pack.json` plant-card Usage, screen-header example) and **Today** (featured plant-card, two stat-tiles, care-task-rows, "Log care" primary-button; `pack.json` stat-tile Usage, care-task-row Usage, primary-button Usage). A detail view is mentioned once and never described (`pack.json` plant-card Data binding).

## Components

| Component | Prefix | Contract | Data-bound | Wrapper |
|---|---|---|---|---|
| plant-card | vd | `contracts/plant-card.contract.json` (Plant) | yes | `wc/vd-plant-card.mjs` |
| care-task-row | vd | `contracts/care-task-row.contract.json` (CareTask) | yes | `wc/vd-care-task-row.mjs` |
| stat-tile | vd | `contracts/stat-tile.contract.json` (Reading) | yes | none (HTML/CSS-canonical, CSS not shipped) |
| status-chip | vd | `contracts/status-chip.contract.json` (Status) | derived, not fetched: parents build it from their own `status` (`pack.json` status-chip Data binding, `vocabulary.json` chipRule) | `wc/vd-status-chip.mjs` |
| primary-button, screen-header, demo-notice | vd | null | no | none |
| card, empty-state, ghost-button, list-row, metric-tile, modal-dialog, nav-tabs, progress-indicator, search-input, select-field, sequence-step, text-field, toggle-switch | ds | null | no | none |

All 20 are `status: "shipped"`. The 16 presentational ones take display strings the composing page computes; they need no API. demo-notice needs one string, the scenario's `fictionalNotice`, which I serve so the page does not hard-code it.

## Contracts, condensed

**Plant** (`plant-card.contract.json`): `id, name, species, location, acquired (date), wateringIntervalDays (int ≥1), lastWatered (date), lastFertilized (date), health ∈ thriving|stable|struggling, status ∈ ok|due|overdue, notes` all required; `photoUrl` optional and "never present in the demo data". `status` = worst status among the plant's not-done tasks. The card binds `id, name, species, status, photoUrl`; the rest "stay unbound: the card summarises, the detail view elaborates".

**CareTask** (`care-task-row.contract.json`): `id, plantId, plantName (denormalised), type ∈ water|fertilise|repot|inspect, due (date), done (bool), status ∈ ok|due|overdue` all required. Done tasks carry `ok` and stay out of Today.

**Reading** (`stat-tile.contract.json`): `id, plantId, kind ∈ moisture|light, value (number, pre-scaled), unit, label` all required. "Deliberately not a sensor API." The screen shows the featured plant's moisture + light pair.

**Status** (`status-chip.contract.json`): `value ∈ ok|due|overdue, label`. Never served; derived by parents.

## Write path the pack implies

care-task-row: "tapping anywhere on the row toggles `checked` (the primary-button commits the batch)"; `id` is "what the log-care commit sends"; the wrapper fires `vd-toggle` "so any stack can batch the log-care commit"; primary-button "Log care" "commits the checked care-task-rows". That is one write: log a batch of task ids as done. Nothing else in the pack mutates (text-field, search-input, select-field, toggle-switch all "emit nothing" or leave persistence to the product).

## API surface

Base `http://127.0.0.1:4800`, JSON only, CORS `*`. Fixed scenario date 2026-07-15 (questions.md Q1). Every served record is validated against the shipped contract at response time (Q28).

| Method | Path | Returns |
|---|---|---|
| GET | `/api/scenario` | `{ scenario, today, fictionalNotice }` — demo-notice text, the frozen date |
| GET | `/api/plants` | `Plant[]` (My plants list) |
| GET | `/api/plants/:id` | `Plant` (detail view) |
| GET | `/api/plants/:id/tasks` | `CareTask[]` for that plant, `?done=` filter |
| GET | `/api/plants/:id/readings` | `Reading[]` — the moisture + light pair |
| GET | `/api/tasks` | `CareTask[]`, `?done=true|false`, `?plantId=` |
| GET | `/api/tasks/:id` | `CareTask` |
| GET | `/api/readings` | `Reading[]`, `?plantId=`, `?kind=` |
| GET | `/api/today` | `{ today, featuredPlantId, featuredPlant: Plant, readings: Reading[], tasks: CareTask[] }` — everything the Today screen needs in one call |
| POST | `/api/care-log` | body `{ taskIds: string[] }` → `200 { loggedAt, logged: CareTask[], created: CareTask[], plants: Plant[] }`; `422` on unknown/done ids (atomic); `400` bad JSON / shape |
| GET | `/` | static demo page mounting the pack's wrappers |
| GET | `/pack/*` | the pack's own files (tokens, wrappers) for the page |

Derivation rules baked into the server (all logged in questions.md): task status from `due` vs today (Q2); plant status = worst open task (Q27); Today list = open tasks due within 7 days (Q3); featured plant = worst status then earliest due (Q4); logging water bumps `lastWatered` and schedules the next water task at `+wateringIntervalDays`, fertilise bumps `lastFertilized` (Q6).

## Static page: did it render?

**Yes.** `index.html` (served at `/`) loads `pack/tokens/css/contract.css` + `neutral.css`, imports `pack/wc/vd-plant-card.mjs` and `pack/wc/vd-care-task-row.mjs` unmodified, and binds them to `/api/plants` and `/api/today` via the `data` property. Verified headless in Chromium (agent-browser, observed):

- `customElements.get()` true for all three tags; 6 cards in My plants + 1 featured, 2 stat-tiles, 7 rows at boot.
- Shadow DOM reads correctly: card `aria-label` "Fiddle-leaf fig, overdue", chip text OVERDUE with `background rgb(37,99,235)` = `--color-accent`, monogram "F" (no `photoUrl`, as the contract promises).
- Write path through the wrappers: clicking a row fires `vd-toggle`, Log care enables, clicking it POSTs `/api/care-log`; the page re-renders with task-03 gone, task-13 (water, 2026-07-22) added, plant-03 now `due`, featured plant now Peace lily. Server confirms `task-03.done: true`.
- Screenshots: `render-before.png` (boot), `render-after.png` (full page after logging task-03).

What the pack did not give me for this page, and what I did instead (Q20): no HTML/CSS for stat-tile, screen-header, primary-button or demo-notice, so those four are hand-written from their spec heads' token lists. And the care-task-row wrapper needs `action` set after `data` because it reads a field the contract does not have (Q7).

## Defects in the pack worth handing back

- `wc/vd-care-task-row.mjs` `data` setter reads `record.action`; the contract field is `type`. Contract-valid records render "Undefined <plant>" through the wrapper (Q7).
- `wc/README.md` consumption example uses `p-014` and an ISO datetime for `lastWatered`; both contradict the contract (Q13).
- stat-tile `value` prop is bounded 0–100 while the contract's example unit is lux (Q8).
- stat-tile, screen-header, primary-button, demo-notice have no shipped HTML/CSS; the specs cite `system/components.css`, which is not in the pack (Q20).
- No file states the fictional today the whole dataset is "baked against" (Q1).
