# Feature: A generic `ds-` list-row primitive — the one bounded vocabulary addition #88's Spike-1 verdict named

The following plan should be complete, but it is important that you validate documentation, codebase patterns, and task sanity before you start implementing.

Pay special attention to the existing `metric-tile` quartet — spec head, `components.css` block, renderer `TEMPLATES` entry, vocabulary projection. This ticket adds a **second** primitive modelled on it, in exactly the same four places, plus one prompt edit and one scenario-config edit. Anything beyond that list is scope creep.

**This ticket has two halves with very different confidence:** the mechanical half (spec → CSS → template → regen, all gate-verifiable) and a **stochastic paid agent run** whose outcome — does the agent *choose* the row, does fidelity actually move — is the measurement the ticket exists to take. Do not drive the second half to a predetermined answer.

## Feature Description

The shared component vocabulary an agent composes against (`handoff/verdant/vocabulary.json`, generated from `system/specs/`) holds exactly one cross-scenario primitive: `metric-tile` (class `ds-`). Everything else is Verdant-enum-locked (`plant-card`, `care-task-row`, `status-chip`, `stat-tile`, `screen-header`) and cannot carry another employer's data.

Consequence, measured by #88's Spike 1: any employer's composed view renders as *a competent KPI band* — the same `metric-tile` grid every dashboard scenario produces. Form fidelity is generic even when content fidelity is high.

This adds **one** bounded, spec-first, cross-scenario **list-row** primitive (`ds-list-row`): a row of one named entity with a figure, an optional qualifier, and an optional free-text status pill. It is the "≤ small bounded extension → productize" branch of #88's decision rule being cashed in — then **tested on the floor** with a real `record-composition.mjs` run against `northwind` whose slot bound permits either shape, so whether the agent *picks* the row is evidence, not a foregone conclusion.

## User Story

As a hiring manager reading a private instance built for my company
I want the composed prototype to show my actual entities — SKUs, jobs, accounts — as rows I can scan, not only aggregate KPI tiles
So that it reads as a prototype of *my* product rather than a generic dashboard skin

## Problem Statement

The vocabulary has no generic per-entity row. Northwind's 22 real SKUs (on-hand / committed / status) are inexpressible; the only available shape is an aggregate tile, so a per-entity question collapses into "Oversold SKUs: 3". `plant-card` and `care-task-row` are the natural models but their props are enum-locked to plant care (`type ∈ water|fertilise|repot|inspect`, `status ∈ ok|due|overdue`), so they cannot carry another employer's rows. The floor's form fidelity is capped by a vocabulary gap, not by the pipeline.

## Solution Statement

Add `list-row` the same way `metric-tile` was added — spec-first, in four places:

1. `system/specs/list-row.md` — head schema v1 + the four required prose sections. `class: "ds-list-row"`, `contract: null`, **`children: []`**, scalar props only, `tone` reusing metric-tile's exact enum.
2. `system/components.css` — one token-only block under the `ds-` heading, mirroring `.ds-metric-tile`'s tone mechanic (accent fill-inversion), **zero new tokens**.
3. `system/agentic-renderer.mjs` — one `TEMPLATES` entry, non-interactive (no bus), DOM order = reading order.
4. Regenerate `gen-vocabulary` → `gen-handoff` → `gen-pack-bundle` → `gen-system-graph`.

Then make the floor able to reach it and measure whether it does:

5. `portal/record-composition.mjs` — generalize `PIV_COMPOSE_SYSTEM`'s tile-only wording (a committed-source edit, the sanctioned honesty-contract fix path).
6. `scenarios/northwind/compose.json` — loosen the `insight-panel` bound to permit either node kind **with a hard row cap**, and add one new question whose answer is per-entity.
7. A **real** `record-composition.mjs` run; verify every number post-hoc against `fixtures/items.json`; eyeball in Chromium **and** WebKit on `instance.html`; record the fidelity verdict honestly whichever way it lands.

## Out of Scope / Non-Goals

- **Not a table engine.** No columns, no sort, no header row, no pagination, no array/object props. "A row of one entity with a few fields and a status" is the whole surface. If a use needs per-employer enums, it is the wrong primitive.
- **Not adding a `wc/` wrapper.** Wrappers are optional and spec-first; `gen-handoff` only requires `system/wc/` to be non-empty. No `system/wc/ds-list-row.mjs`.
- **Not adding a `work.html` library card.** The grid's claim is *"Both prototypes above are built from these"* — not vocabulary completeness — so omitting an as-yet-unused primitive is not dishonest, and adding it would force two more VR baseline regens no AC asks for. See Open Questions if you want the owner's call.
- **Not adding a DataContract.** `contract: null`, exactly like `metric-tile`: the composing agent computes the row's values; the row binds no stored record.
- **Not re-running or replacing any committed composition.** Verdant's + Fieldwork's four root proposals and northwind's two existing proposals stay byte-identical. The new question is a **new slug**.
- **Not touching `proto/fieldwork.html`'s slots**, `proto/compositions/index.json` (the root Fieldwork manifest), or the Fieldwork slot bounds in `scenarios/fieldwork/compose.json`.
- **Not building #90** (the ceiling engine / screenshots → bespoke specs). This is the floor's bounded extension.
- **Not changing `system/tokens.source.json`.** Zero new tokens is a design constraint here, not an accident — it removes the ORPHAN failure mode entirely.

## Feature Metadata

**Feature Type**: New Capability (bounded vocabulary addition) + a measured spike on top of it
**Estimated Complexity**: Medium (mechanical half) / High-variance (the paid run + fidelity judgment)
**Primary Systems Affected**: `system/specs/`, `system/components.css`, `system/agentic-renderer.mjs`, the four generated artifacts, `portal/record-composition.mjs` (prompt), `scenarios/northwind/compose.json`, `instance.html` + `agentic-ui-study.html` (one slot-CSS line each)
**Dependencies**: Claude Agent SDK (already the portal's sole dep) for the real run — auth via the Mac Claude CLI login, no `portal/.env` needed. `tooling/style-dictionary/node_modules` must exist (`gen-handoff` shells out to it). `tooling/visual-regression/node_modules` for the baseline check.

## Related Work

**Implements**: [#101](https://github.com/linardsb/ux-factory/issues/101) · **Epic**: [#86](https://github.com/linardsb/ux-factory/issues/86) — `docs/epics/generative-prototyper.prd.md` + `.architecture.md`

**Back-references**:

- `.claude/plans/floor-runner-parameterize-composition-spike1.md` (#88) — Why: the verdict that scoped this ticket; §"Notes" line 416 states the exact decision rule ("count 0–1 bounded → productize the floor") and line 376 names the generic `ds-` list-row as the candidate. It also defines the honesty firewall this plan must not breach.
- `.claude/plans/floor-into-instance-prototype-slot-reader-adjust.md` (#89) — Why: built the surface this ticket's run will be *seen* on (`instance.mjs` → `renderStudy` in the instance prototype slot); its Non-Goals explicitly deferred the list-row to here.
- `.claude/plans/handoff-pack-viewer.md`, `.claude/plans/v3-component-library-grid.md` — Why: the downstream surfaces a new spec automatically appears in (`/handoff.html`) or deliberately does not (`work.html`).

**Forward-references**:

- (none yet — #90 remains gated on #88's verdict; this ticket raises the floor it would be compared against.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/specs/metric-tile.md` (whole file, ~40 lines) — Why: **the** model. Same `ds-` class convention, `contract: null`, `tone` enum, and the four prose sections in the required order (`Usage` · `States` · `Data binding` · `Accessibility`). Your spec mirrors its structure and its voice.
- `system/specs/care-task-row.md` — Why: read it to know what **not** to copy. It is the closest row-shaped spec and it declares `children: ["status-chip"]` + enum-locked props. Both are exactly the traps this primitive exists to escape (see Patterns → "The chip trap").
- `system/components.css` lines 1463–1524 — Why: the `ds-`/`vd-`/`fw-` section banner + the entire `.ds-metric-tile` block including the tone fill-inversion comment. Your block goes immediately after line 1524, before `/* ---------- vd-screen-header … */`.
- `system/agentic-renderer.mjs` lines 31–109 (`validateComposition`) — Why: the exact rules your spec head must satisfy; note line 102's chip rule keyed on `"status" in props`.
- `system/agentic-renderer.mjs` lines 317–327 — Why: the `metric-tile` template, the pattern your `list-row` template mirrors (no bus, `String(props.value)`, `is-` tone class only when non-neutral, `null` for absent optionals).
- `agent-layer/lib.mjs` lines 63–130 (`parseComponentSpec`) — Why: the boundary validator every generator runs your spec through. Filename must equal `head.component`; `status ∈ spec|shipped`; every prop needs `{type, required}`; `tokens` non-empty and all `--`-prefixed; `states` non-empty; `children` an array.
- `agent-layer/gen-vocabulary.mjs` (whole, 70 lines) — Why: shows that adding a spec file is the *entire* vocabulary change; `usage` prose ships to the agent verbatim, so the Usage section is a prompt input, not decoration.
- `agent-layer/gen-system-graph.mjs` lines 63–80 — Why: the block-header regex `/^\/\* -{5,} (.+?) -{5,} \*\/$/gm` and the duplicate-id guard. Your CSS block header must match it exactly or the graph silently misses the block / throws on a duplicate slug.
- `agent-layer/gen-loc-summary.mjs` lines 20–50 — Why: group regexes (`system/[^/]+\.(css|mjs|js)` — a `.md` spec is **not** counted) and the `git show :<path>` read, which is why staging before `--check` is load-bearing.
- `portal/record-composition.mjs` lines 107–153 (`PIV_COMPOSE_SYSTEM`) and 162–191 (`buildTask`) — Why: the prompt you must generalize (lines 120–122 are tile-only) and the proof that the task text is built from config, never from an example.
- `portal/record-composition.mjs` lines 317–415 (`main`) — Why: the run's keep-gates: `assertValid` → `curateTrace` → `validateTrace` → manifest upsert. A failed gate drops the shippable artifacts and exits 1; the fix is a tighter prompt + `--force`, never a hand-edit.
- `scenarios/northwind/compose.json` (whole) — Why: the two slot bounds you are editing and the DEFINITIONS-ONLY `computeRules` you must **not** touch.
- `scenarios/northwind/fixtures/items.json` (22 records) — Why: the ground truth every number in the run must be verified against.
- `system/agentic-study.mjs` lines 22, 172–196 — Why: the study's adjust controls apply a `tone` `<select>` (enum `neutral|warn|critical`) and label each row by `node.props?.label` **for every node in the composition**. This is why your primitive must name its emphasis prop `tone` with the identical enum and its entity prop `label` — otherwise the reader-adjust surface degrades on the very view this ticket ships.
- `system/instance.mjs` lines 329–394 (`renderPrototype`) — Why: `instance.html` mounts **every** entry in `/proto/compositions/northwind/index.json`, so your new question appears automatically as a third "Ask" tab. That is your eyeball surface.
- `instance.html` lines 347–350 and `agentic-ui-study.html` lines 45–48 — Why: the byte-twin inline slot-CSS blocks that lay out `.study-preview--insight-panel` children at `flex: 1 1 220px` — which would sit two rows across at wide widths.
- `tooling/visual-regression/visual.spec.mjs` lines 15–58 — Why: the nine captured pages. `instance.html`, `agentic-ui-study.html`, and `handoff.html` are **not** among them; `factory`, `approach`, `work`, `proto-verdant`, `proto-fieldwork` are.

### New Files to Create

- `system/specs/list-row.md` — the ComponentSpec (head + four prose sections). The only new tracked source file in the mechanical half.
- `proto/compositions/northwind/<new-slug>.json` — **written by the agent run, never by hand.**
- `traces/<new-slug>.raw.jsonl` + `traces/<new-slug>.jsonl` — **written by the runner, never by hand.**
- `.claude/reports/ds-list-row-primitive-report.md` — the execution report incl. the fidelity verdict (commit it in the same PR — CLAUDE.md's git rule).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `.claude/references/kb-format.md` §"ComponentSpec + DataContract (this repo)" (lines 14–31)
  - Specific section: head schema v1 + "Prose sections, all four required, in order"
  - Why: the exact contract `parseComponentSpec` enforces, incl. "`tokens` — each present in the `contract` group of `system/tokens.source.json`".
- `.claude/references/token-system.md`
  - Specific section: the mechanic + how to add a token
  - Why: read it to confirm you do **not** need to add one. Every token this primitive needs already exists.
- `docs/epics/generative-prototyper.architecture.md` §"Missing pieces" + §"Spikes & experiments"
  - Why: the inherited hard constraints — no new engines, no view-time LLM, two regimes never blurred. This ticket adds vocabulary, not an engine.
- `CLAUDE.md` §"Where new code goes" → *New component spec* and *New composition proposal*
  - Why: the canonical command sequences, quoted verbatim in the tasks below.
- `traces/README.md` + `scenarios/README.md`
  - Why: the trace format the keep-gate enforces and the scenario-package shape you are editing.

### Patterns to Follow

**The chip trap — the single highest-value rule in this plan.**
`care-task-row` declares `children: ["status-chip"]`. Copying that would undo the entire ticket: `validateComposition` (agentic-renderer.mjs:102) keys its chip rule on `"status" in props`, and `status-chip.value` is enum-locked to `ok | due | overdue`. Allowing a chip child re-locks the cross-scenario primitive to Verdant's enums — the exact cage #101 exists to escape.

```
"children": []                    // ← REQUIRED. Not ["status-chip"].
"status": { "type": "string", "required": false, ... }   // free short text, NO enum
```

Render the status inline as its own `ds-`-classed pill. The row owns its pill; it never composes Verdant's.

**Naming convention (`ds-` = cross-scenario library):** class prefix `ds-`, spec filename = `head.component`, CSS block placed under the existing `ds-`/`vd-`/`fw-` banner. From `metric-tile.md`'s Usage prose: *"the `ds-` prefix marks a cross-scenario library component, distinct from `vd-`/`fw-`"*. No scenario vocabulary anywhere in the spec — not in prop names, not in enums, not in examples.

**Tone mechanic (copy verbatim, do not invent):** `system/components.css:1508-1524`

```css
/* Tone = emphasis via fill-inversion on the accent family (no warn/critical hue exists,
   and none is needed — same escalation mechanic as vd-status-chip due→overdue). Colour is
   never the sole signal; the label + value carry the state (spec's Accessibility note). */
.ds-metric-tile.is-warn {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface), var(--color-accent) 8%);
}
.ds-metric-tile.is-critical { border-color: var(--color-accent); background: var(--color-accent); }
```

**Renderer template shape:** `system/agentic-renderer.mjs:321-326` — arrow function, `el()` only, `String(props.value)`, `props.x != null ? … : null` for optionals, `is-` class only when tone is set and non-neutral, **no `bus` parameter** (the row is read-only like `metric-tile`/`stat-tile`).

**CSS block header (must satisfy `gen-system-graph`'s regex, and the slug must be unique):**

```css
/* ---------- ds-list-row (system/specs/list-row.md) — cross-scenario library primitive ---------- */
```

**Error voice (if you add any throw):** name the offending path, enumerate what was allowed — `agent-layer/lib.mjs` / `system/derive.mjs` style. You should not need a new throw anywhere in this ticket.

**File headers:** you are not creating a new `.mjs`, so no new governing-doc header is needed. The spec's prose *is* its documentation.

---

## IMPLEMENTATION PLAN

### Phase 1: The primitive (spec → CSS → renderer)

The three hand-written sources, authored together so the spec, the CSS classes, and the template DOM cannot drift.

**Tasks:**

- Author `system/specs/list-row.md` with head schema v1 + the four prose sections
- Add the token-only `.ds-list-row` block to `system/components.css`
- Add the `list-row` `TEMPLATES` entry to `system/agentic-renderer.mjs`

### Phase 2: Regenerate the machine layer

**Depends on:** Phase 1 (the generators read the spec).

**Tasks:**

- `gen-vocabulary` (must run **before** any composition run — the runner reads `handoff/verdant/vocabulary.json`)
- `gen-handoff` + `gen-pack-bundle` (pack + bundle carry the new spec)
- `gen-system-graph` (**mandatory** — the new CSS block is a new consumer node; skipping this reds the blocking `verify` CI job)
- `token-lint` + `drift-check` green

### Phase 3: Make the floor able to reach it

**Depends on:** Phase 2 (the vocabulary must already contain `list-row`).
**Independent of:** Phase 4's slot-CSS lines — they can be written any time before the eyeball.

**Tasks:**

- Generalize `PIV_COMPOSE_SYSTEM`'s tile-only wording in `portal/record-composition.mjs`
- Loosen `scenarios/northwind/compose.json`'s `insight-panel` bound (permit either node kind, **hard-cap the node count**) and add one new per-entity question
- `--dry` run to prove auth + fence + the new prompt, before spending on the real run

### Phase 4: The real run + the measurement (the actual deliverable)

**Depends on:** Phase 3.

**Tasks:**

- One real `record-composition.mjs` run against `northwind`
- Post-hoc verify every figure against `fixtures/items.json`
- Add the full-width slot-CSS line to `instance.html` (+ its byte-twin in `agentic-ui-study.html`)
- Eyeball in real Chromium **and** WebKit; screenshot both
- Record the fidelity verdict honestly — including "it didn't move" if that is what you see

### Phase 5: Gates, baselines, artifacts

**Depends on:** Phase 4 (new tracked files change the loc counts).

**Tasks:**

- `git add` everything, then `gen-loc-summary --check` (staging first is load-bearing)
- Run the VR gate and **report which PNGs actually changed**; regen only those
- Verify the regression AC by byte-comparison, not by eyeballing
- Write the report; open the PR with `Closes #101`

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute in order. Each task is atomic and independently validated.

### 0. SETUP — branch + preconditions

- **IMPLEMENT**: Branch from an up-to-date `main`: `git fetch origin && git checkout -b feature/ds-list-row-primitive origin/main`. Confirm `tooling/style-dictionary/node_modules` exists (`gen-handoff` child-process-invokes Style Dictionary); if missing, `cd tooling/style-dictionary && npm install`.
- **GOTCHA**: The session's current branch is `chore/v3-merge-vr-reblock` and parallel sessions share this working dir — verify the branch immediately before every commit and stage by explicit path.
- **VALIDATE**: `git status --short && git branch --show-current && ls tooling/style-dictionary/node_modules >/dev/null && echo ok`
- **SATISFIES**: preconditions for every AC.

### 1. CREATE `system/specs/list-row.md`

- **IMPLEMENT**: The ComponentSpec. Head (this is the schema — refine descriptions, keep the shape):

```json
{
  "component": "list-row",
  "status": "shipped",
  "class": "ds-list-row",
  "contract": null,
  "props": {
    "label":  { "type": "string", "required": true,  "description": "the entity this row is about, e.g. a SKU name, a technician, an account — one line, truncates with ellipsis" },
    "value":  { "type": "string", "required": true,  "description": "the row's primary computed figure as a display string, e.g. \"85\", \"−85\", \"94%\" — rendered as-is, no rounding" },
    "unit":   { "type": "string", "required": false, "description": "optional display unit beside the value, e.g. \"units\", \"jobs\"" },
    "meta":   { "type": "string", "required": false, "description": "one short secondary qualifier — a location, a second figure, a date; ≤ 6 words, never a sentence" },
    "status": { "type": "string", "required": false, "description": "optional short free text rendered as a pill, one or two words — cross-scenario, so NO enum: the employer's own vocabulary (\"OVERSOLD\", \"LOW\") is the point" },
    "tone":   { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (label + value + status must already read the state)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--radius-md", "--radius-lg", "--spacing-xs", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--type-eyebrow"],
  "states": ["neutral", "warn", "critical"],
  "children": []
}
```

  Then the four prose sections, in this order:
  - **`## Usage`** — one per-entity row; the second `ds-` primitive after `metric-tile`; the pair split of labour (`metric-tile` = one aggregate reading, `list-row` = one named entity). State the bound explicitly: *a handful of rows that carry the answer, not one row per record — this is not a table*. State that it carries no domain vocabulary and that `status` is deliberately free text. **This prose is shipped verbatim into `vocabulary.json` and read by the composing agent — write it as guidance, not decoration.**
  - **`## States`** — the three tones as emphasis levels, identical mechanic to `metric-tile` (neutral base / warn accent border + tint / critical accent fill). Colour never the sole signal.
  - **`## Data binding`** — `contract: null` — presentational, like `metric-tile`. The composing agent computes every field from the scenario's own data. `value` is a string so counts, deltas, and percentages pass through one prop uniformly.
  - **`## Accessibility`** — one paragraph per row, text order name → meta → value → unit → status, so it is read as one coherent sentence. Non-interactive: **no role, no tabindex, no list semantics** (rows are siblings in a slot with no owning `<ul>`; claiming `listitem` without a list parent would be a false claim — say so plainly). Pill contrast pairs meet AA; `tone` is redundant emphasis.
- **PATTERN**: `system/specs/metric-tile.md` (structure + voice); `.claude/references/kb-format.md:18-29` (the contract).
- **GOTCHA**: `children: []` — **never** `["status-chip"]` (see "The chip trap"). No `enum` on `status`. Verify each of the 14 tokens is declared in `system/tokens.contract.css` before listing it — a token in the head that is not in the contract group violates kb-format, and one you list but never `var()` in the CSS is silently untrue. Trim the list to exactly what your CSS block uses.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{const s=m.parseComponentSpec('system/specs/list-row.md');console.log(s.head.component, s.head.children, s.sections.map(x=>x.title).join('|'))})"` → prints `list-row [] Usage|States|Data binding|Accessibility`
- **SATISFIES**: AC #1 (spec exists), AC #2 (vocabulary source).

### 2. ADD the `.ds-list-row` block to `system/components.css`

- **IMPLEMENT**: Insert immediately after the `.ds-metric-tile` block (after line 1524, before `/* ---------- vd-screen-header … */`), opening with exactly:

```css
/* ---------- ds-list-row (system/specs/list-row.md) — cross-scenario library primitive ---------- */
```

  A horizontal row on `--color-bg-surface` with a `--color-border` hairline and `--radius-md`: name (`--type-body`, `--color-fg`) + optional meta (`--type-caption`, `--color-fg-muted`) on the leading edge, value + unit on the trailing edge (`min-width: 0` on the text side so a long name ellipsises instead of blowing the row out), status pill last (`--type-eyebrow`, `--radius-lg`, hairline — mirror `vd-status-chip`'s quiet variant). Tone: `.is-warn` / `.is-critical` copying `.ds-metric-tile`'s fill-inversion verbatim, with the critical variant re-colouring name/meta/value/unit/pill to `--color-accent-fg`.
- **PATTERN**: `system/components.css:1473-1524` (`.ds-metric-tile`, incl. the tone comment); `.vd-status-chip` for the pill's token vocabulary.
- **IMPORTS**: none (CSS).
- **GOTCHA**: **Token-only — a literal colour or px radius here is a bug** (project rule). Do not add a token to `tokens.source.json`. Wrap the row in a flex layout with `min-width: 0` on the growing child — memory: the VR gate's bundled Chromium has missed a real Safari/Chrome-stable grid blowout before; that is also why AC #5 demands WebKit. Keep the block's header label unique — `gen-system-graph` throws on a duplicate slug.
- **VALIDATE**: `node tooling/token-lint.mjs` → `✓ … 0 undeclared · 0 orphan · DTCG valid`
- **SATISFIES**: AC #1 (token-only CSS), AC #3 (token-lint green).

### 3. ADD the `list-row` template to `system/agentic-renderer.mjs`

- **IMPLEMENT**: One `TEMPLATES` entry after `"metric-tile"`, mirroring it — non-interactive, no `bus`:

```js
  // Library-generic primitive (ds-, cross-scenario) — one named entity per row, the row-shaped
  // sibling of metric-tile (#101). Non-interactive (no bus); DOM order is reading order
  // (name → meta → value → unit → status) so it is heard as one sentence; `status` is FREE text
  // rendered as the row's own pill — deliberately not a status-chip child, which would re-lock
  // this primitive to Verdant's ok|due|overdue enum (spec's Usage prose).
  "list-row": (props) => el("div", { class: `ds-list-row${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-row-text" },
        el("span", { class: "ds-row-name", text: props.label }),
        props.meta != null ? el("span", { class: "ds-row-meta", text: props.meta }) : null),
      el("span", { class: "ds-row-reading" },
        el("span", { class: "ds-row-value", text: String(props.value) }),
        props.unit != null ? el("span", { class: "ds-row-unit", text: props.unit }) : null),
      props.status != null ? el("span", { class: "ds-row-status", text: props.status }) : null)),
```

  Update the module header's "six templates" wording to match reality.
- **PATTERN**: `system/agentic-renderer.mjs:317-326`.
- **IMPORTS**: none new — `el()` is already in the module.
- **GOTCHA**: `textContent` only (via `el`'s `text` key) — never `innerHTML`; agent-supplied strings must stay inert. A vocabulary entry with no template throws "renderer and vocabulary have drifted", so this task must land before any render, though **not** before the run (the run's validate step needs only `validateComposition`).
- **VALIDATE**:
  `node -e "import('./system/agentic-renderer.mjs').then(m=>{const v={components:{'list-row':JSON.parse(require('fs').readFileSync('system/specs/list-row.md','utf8').match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/)[1])}};v.components['list-row'].children=[];m.validateComposition(v,[{name:'list-row',props:{label:'X',value:'1',status:'OVERSOLD',tone:'critical'}}]);console.log('validates')})"`
  — simpler equivalent: run task 4 first, then `node -e "import('./system/agentic-renderer.mjs').then(m=>{const v=JSON.parse(require('fs').readFileSync('handoff/verdant/vocabulary.json','utf8'));m.validateComposition(v,[{name:'list-row',props:{label:'Pallet wrap, 23 micron',value:'85',unit:'units',meta:'East · committed 145',status:'OVERSOLD',tone:'critical'}}]);console.log('validates')})"`
- **SATISFIES**: AC #2 (renderer accepts it).

### 4. REGENERATE the machine layer

- **IMPLEMENT**: In this order:
  ```
  node agent-layer/gen-vocabulary.mjs
  node agent-layer/gen-handoff.mjs
  node agent-layer/gen-pack-bundle.mjs
  node agent-layer/gen-system-graph.mjs
  ```
- **PATTERN**: CLAUDE.md §"Where new code goes" → *New component spec*; `tooling/drift-check.mjs` runs the same set.
- **GOTCHA**: `gen-system-graph` is **mandatory** — the new CSS block is a new consumer node and the blocking `verify` job diffs it. `gen-pack-bundle` must run **after** the other two (it inlines them). `gen-handoff` needs `tooling/style-dictionary/node_modules`. If you are mid-merge, complete the merge before running drift-check — a mid-merge run reports false drift.
- **VALIDATE**: `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces`; and `node -e "const v=require('./handoff/verdant/vocabulary.json');console.log(Object.keys(v.components).join(' | '))"` includes `list-row`.
- **SATISFIES**: AC #2, AC #3.

### 5. VERIFY the refusal boundary still holds

- **IMPLEMENT**: No code — an explicit adversarial check that the addition widened the vocabulary by exactly one component and nothing else.
- **VALIDATE**: each of these must **throw** with a path-naming message:
  ```
  node -e "import('./system/agentic-renderer.mjs').then(m=>{const v=require('./handoff/verdant/vocabulary.json');
    const bad=[[{name:'data-table',props:{}}],
               [{name:'list-row',props:{label:'X',value:'1',columns:'3'}}],
               [{name:'list-row',props:{label:'X',value:'1',tone:'urgent'}}],
               [{name:'list-row',props:{value:'1'}}],
               [{name:'list-row',props:{label:'X',value:'1'},children:[{name:'status-chip',props:{value:'due',label:'DUE'}}]}]];
    for(const c of bad){try{m.validateComposition(v,c);console.log('✗ ACCEPTED',JSON.stringify(c))}catch(e){console.log('✓ refused:',e.message)}}})"
  ```
  All five must print `✓ refused` — especially the last (a chip child on a `children: []` component).
- **SATISFIES**: AC #2 ("still refuses everything outside the vocabulary").

### 6. UPDATE `PIV_COMPOSE_SYSTEM` in `portal/record-composition.mjs`

- **IMPLEMENT**: Generalize the tile-only wording at lines 118–122. Keep every existing rule; change the framing from "tile" to "node", and add one shape sentence. Suggested replacement for that bullet pair:

```
• A label must read the state without its tone (e.g. "Overdue" + "4", not a bare "4"); tone is
  redundant emphasis, never the sole signal.
• Every node's value is a NUMBER (or a ≤2-word phrase) — it renders LARGE, like a headline
  figure. Put qualifiers, region names, and any explanation in the label (or, on a row, its
  meta), never in the value: e.g. label "Busiest technician — Priya Nair", value "5", unit
  "jobs" (NOT value "Priya Nair — 5 open jobs"). A sentence in the value slot breaks the node.
• Choose the node shape that fits the answer: a node that reports ONE aggregate reading over the
  whole dataset, versus a node that reports ONE NAMED ENTITY, are different components in the
  vocabulary — read each one's usage guidance and pick per answer, not per habit. When you report
  named entities, report only the few that carry the answer; never one node per record.
```

- **PATTERN**: the file's own header, lines 15–26 — the prompt is committed source, and tightening it + re-running is *the* sanctioned fix path.
- **GOTCHA**: Do **not** name `list-row` or `metric-tile` in the system prompt. The vocabulary already carries both names and their usage prose; naming one here would tell the agent the answer and weaken the evidence. Note in the report that the committed Fieldwork/northwind proposals were produced under the *previous* prompt — their own traces record the prompt they ran under, so nothing is falsified, but do not re-run them.
- **VALIDATE**: `node --check portal/record-composition.mjs` and `grep -c "list-row\|metric-tile" portal/record-composition.mjs` → `0`
- **SATISFIES**: AC #4 (the run can reach the primitive).

### 7. UPDATE `scenarios/northwind/compose.json`

- **IMPLEMENT**: Two edits, nothing else:
  1. Loosen the `insight-panel` bound so both shapes are permissible and the count is capped, e.g.:
     `"a VERTICAL column answering one analytical question, fitting the narrow side region beside a stock table — a focused read, not a whole dashboard. Use whichever node kinds the answer actually needs; consult each component's usage guidance. AT MOST 8 nodes total, and if you report named entities, only the few that carry the answer — never one node per record."`
  2. Append one question to `questions` whose honest answer is per-entity, e.g.
     `{ "slug": "sku-attention-list", "slot": "insight-panel", "question": "Which specific SKUs need a buyer's attention first, and where does each one stand?" }`
- **PATTERN**: the file's existing entries; `loadComposeConfig` (record-composition.mjs:66-105) is the validator.
- **GOTCHA**: **Do not touch `computeRules`** — it is the honesty firewall and must state definitions only (the loader also asserts it contains the fixed `today`). Do not name a component in the slot bound. The slug must be globally unique in the **flat** `traces/` namespace — current slugs: `backlog-urgency`, `demo-notice`, `operational-state`, `oversell-exposure`, `pack-seed-verdant`, `sla-risk-and-load`, `stock-risk-state`, `work-by-region`. Leave `summary-strip` and the two existing questions untouched.
- **VALIDATE**: `node -e "import('./portal/record-composition.mjs')" ` is not runnable standalone; instead run the `--dry` in task 8 — its first action is `loadComposeConfig`, which throws a path-naming error on any malformation. Also `node scenarios/validate.mjs`.
- **SATISFIES**: AC #4.

### 8. RUN `--dry` (cheap proof before spending)

- **IMPLEMENT**: `node portal/record-composition.mjs northwind "Which specific SKUs need a buyer's attention first, and where does each one stand?" insight-panel --slug sku-attention-list --dry`
- **GOTCHA**: Auth is the Mac Claude CLI login (no `portal/.env` needed — the runner prints which path it used). A `--dry` costs real tokens but is one cheap run; it writes nothing to `traces/` or `proto/`. It proves auth, all four PIV markers, the Write→artifact pairing, the rebuilt Read fence, and in-process `validateComposition` on what was written.
- **VALIDATE**: prints `composition sku-attention-list ✓ … · DRY (not shipped) · in-process validateComposition ✓`. If PIV is unclean, tighten `PIV_COMPOSE_SYSTEM` and re-dry — **never** hand-edit output.
- **SATISFIES**: AC #4 (de-risked).

### 9. RUN the real composition (paid, irreversible-ish)

- **IMPLEMENT**: `node portal/record-composition.mjs northwind "Which specific SKUs need a buyer's attention first, and where does each one stand?" insight-panel --slug sku-attention-list`
- **GOTCHA**: The keep-gate is `assertValid` **and** `validateTrace`; either failing drops the shippable artifacts, keeps the raw for inspection, and exits 1 — fix by tightening committed source and re-running with `--force`. **The outcome is evidence, not a target.** If the agent emits tiles only under the free-choice bound, that is a first-class finding: record it verbatim in the report, then (pre-authorized here) do **one** second run with the `insight-panel` bound rewritten to state that a per-entity reading is what the slot wants — and record clearly in the report that the primitive was *reachable but not chosen freely*, which is weaker evidence than a free choice.
- **VALIDATE**: `composition sku-attention-list ✓ … · valid ✓ · trace ✓ · manifest: 3 entries`; `node tooling/validate-trace.mjs traces/sku-attention-list.jsonl`; `git status --short proto/compositions/northwind traces/` shows only the new slug's files plus the scoped `index.json`.
- **SATISFIES**: AC #4.

### 10. VERIFY the numbers post-hoc against the fixture

- **IMPLEMENT**: There is no northwind equivalent of `tooling/fieldwork-kpis.mjs`, and #101 does not ask for one — compute the ground truth in a **scratch** script (`/private/tmp/claude-501/.../scratchpad/northwind-truth.mjs`, not committed): per-SKU `available = onHand − committed`, shortfall for `committed > onHand`, the oversold/low/ok counts, per-warehouse rollups. Diff every figure in the composition against it.
- **GOTCHA**: Verification is post-hoc only — **never** feed the truth script to the agent (same rule as `fieldwork-kpis.mjs`). If a figure is wrong, that is a re-run with tightened `computeRules`/prompt, never an edit.
- **VALIDATE**: paste the figure-by-figure comparison table into the report; every figure matches.
- **SATISFIES**: AC #4 ("numbers verified against the fixture post-hoc").

### 11. ADD the full-width slot rule to the two inline slot-CSS blocks

- **IMPLEMENT**: In `instance.html` (after line 350) and its byte-twin in `agentic-ui-study.html` (after line 48), add:
  ```css
  /* A list-row reports one named entity across the full width — it must never sit two-across
     next to another row the way the 220px-basis tiles do (ds-list-row, #101). */
  .study-preview--insight-panel > .ds-list-row,
  .study-preview--summary-strip > .ds-list-row { flex: 1 1 100%; }
  ```
- **PATTERN**: the existing four lines in each file; `system/proto.css:803-805` is the proto-page analogue (**leave it alone** — no proto page renders a list-row).
- **GOTCHA**: Keep the two blocks byte-identical — they are twins today and silent divergence is the trap. Neither page is in the VR `PAGES` list, so this cannot churn a baseline. Token-only (`flex` is layout, no colour literal).
- **SATISFIES**: AC #5 (a fair eyeball needs correct layout).

### 12. EYEBALL in real Chromium AND WebKit

- **IMPLEMENT**: Serve statically (`python3 -m http.server 8000` from the repo root — it serves `.mjs` as `text/javascript`), then drive Playwright from `~/node_modules` (`require.resolve` + `pw.default.chromium` / `pw.default.webkit`): load `http://127.0.0.1:8000/instance.html`, wait for `#instance-prototype[data-prototype="ready"]`, click the Ask tab **by its question text** (`page.getByRole('tab', { name: /buyer's attention/ })`), screenshot the preview frame in both engines. Also exercise one adjust (change a row's tone) and the out-of-vocabulary probe, confirming the refusal still names a path. Then load `http://127.0.0.1:8000/handoff.html` in one engine and confirm the new component's card renders (spec head · engineer docs · agent vocabulary) with no console error — `handoff-viewer.mjs` auto-ingests every spec from `pack.json` and nothing gates that page.
- **PATTERN**: memory — *cross-engine motion verify* and *headless render: data pages Worker-refused*.
- **GOTCHA**: `ERR_CONNECTION_REFUSED` to the absent Worker on `instance.html` is **expected** fixture-degradation, not a regression. Check for long-SKU-name overflow and pill wrapping specifically at a narrow width — that is the class of bug the Chromium-only VR gate misses. Never select the tab by index: `upsertIndex` sorts the manifest **by slug**, so the new entry's position depends on the slug (`oversell-exposure` · `sku-attention-list` · `stock-risk-state` → it lands **second**), and `renderStudy` opens on `entries[0]`, so the row view is one click away from the at-rest page.
- **VALIDATE**: two screenshots captured; zero console errors other than the Worker refusal; the row renders as a row in both engines; `/handoff.html` shows the new component's card.
- **SATISFIES**: AC #5.

### 13. STAGE, then check loc-summary

- **IMPLEMENT**: `git add -A` (explicit paths if other sessions are active), then `node agent-layer/gen-loc-summary.mjs --check`. If it reports drift, `node agent-layer/gen-loc-summary.mjs` and `git add system/loc-summary.json`.
- **GOTCHA**: `--check` **after** staging — the generator reads `git show :<path>`, so an unstaged edit makes "no drift" a lie. New files here are a `.md` spec (not counted), composition JSON + traces (not counted); the only movement is `components.css` + `agentic-renderer.mjs` lines in the **runtime** group, rounded to the nearest 100 — it may well not move at all. `approach.html` renders the runtime group's numbers, so **only** a runtime-group change forces the two approach baselines; a grand-total-only flip fails `verify` but does not churn them.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ 3 groups — no drift`
- **SATISFIES**: AC #3 + the ticket's repo traps.

### 14. RUN the visual-regression gate and report what actually changed

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` (Linux baselines — a local macOS run failing 16 is a platform artefact, not a regression). Then `git status --porcelain tooling/visual-regression/baselines` and **report the exact PNG list**.
- **GOTCHA**: Do **not** assert in advance that `factory` is unaffected because `#shape` is a hidden tab — plausible, but the gate is the authority. `update:docker` will not rewrite a baseline whose only change is sub-perceptual; if you believe one should have changed, `rm` the PNG to force it. Only commit baselines that genuinely changed, and say in the PR body which ones and why.
- **VALIDATE**: the gate passes; the changed-PNG list is in the report and the PR body.
- **SATISFIES**: AC #6 + the ticket's baseline trap.

### 15. VERIFY the regression AC by byte-comparison

- **IMPLEMENT**: Prove the existing compositions are untouched rather than eyeballing them:
  ```
  git diff --stat origin/main -- proto/compositions/index.json proto/compositions/*.json \
    proto/compositions/northwind/oversell-exposure.json proto/compositions/northwind/stock-risk-state.json \
    scenarios/fieldwork/compose.json traces/operational-state.jsonl traces/sla-risk-and-load.jsonl
  ```
  → must be empty. Then confirm the `proto-verdant` / `proto-fieldwork` baselines are unchanged in task 14's list, and load `/agentic-ui-study` + `/proto/fieldwork.html` once in a browser.
- **VALIDATE**: empty diff; both proto baselines absent from the changed list; both pages render.
- **SATISFIES**: AC #6.

### 16. WRITE the report and OPEN the PR

- **IMPLEMENT**: `.claude/reports/ds-list-row-primitive-report.md` — the fidelity verdict in the ticket's own terms: whether the agent chose the row freely, the vocabulary-extension count (1, by construction), the figure-verification table, both screenshots, and a plain answer to *"did it move the 'reads as their product' needle?"* including "no" or "marginally" if that is the truth. Commit plan + report + review in the same PR (CLAUDE.md's git rule — four PRs' artifacts were lost to this). PR body must carry a **`Closes #101`** trailer.
- **GOTCHA**: A PR title mentioning `(#101)` closes nothing. Post the fidelity verdict as a comment on #101 too, so it does not live only in a merged PR body — the same failure #101 itself was filed to prevent.
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #101"` → `1`; `gh pr checks` green.
- **SATISFIES**: every AC's evidence trail.

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-check** — don't hunt for one. "Done" = run the surface you touched (CLAUDE.md). The gates below are the equivalent.

### Unit-equivalent (validators as tests)

- `parseComponentSpec` on the new spec (task 1) — the head/prose boundary validator.
- `validateComposition` accept-and-refuse matrix (tasks 3 + 5) — the five refusals are the real "unit tests" of this ticket; the chip-child refusal is the one that proves the cross-scenario claim.
- `node tooling/token-lint.mjs` — undeclared + orphan + DTCG.
- `node tooling/validate-trace.mjs traces/sku-attention-list.jsonl` — the trace-format drift guard.
- `node scenarios/validate.mjs` — the scenario package after the compose.json edit.

### Integration-equivalent

- `node tooling/drift-check.mjs` — the full generator-drift gate (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces).
- The `--dry` run — end-to-end mechanism proof (auth, fence, PIV, Write pairing, in-process validation) without shipping.
- `cd tooling/visual-regression && npm run update:docker` — the nine-page × two-pack pixel gate.

### Edge Cases

- A very long `label` (Northwind's SKU names run to ~30 chars) at a narrow viewport — must ellipsise, not blow the row out. **Check in WebKit specifically.**
- All optionals absent: `{label, value}` only — must render cleanly with no empty spans.
- `tone: "neutral"` explicitly — must render identically to tone-absent (no `is-neutral` class).
- The study's tone `<select>` applied to a `list-row` node — must re-render, not collapse to "last valid composition".
- The out-of-vocabulary probe on a `list-row` node — must refuse with a path-naming message.
- A composition mixing `metric-tile` and `list-row` in one array — must validate and lay out sanely.
- The critical tone's pill on the accent fill — the pill must stay legible (contrast pair `--color-accent-fg` on `--color-accent`).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```
node --check system/agentic-renderer.mjs
node --check portal/record-composition.mjs
node tooling/token-lint.mjs
```

### Level 2: Contract validators

```
node -e "import('./agent-layer/lib.mjs').then(m=>console.log(m.parseComponentSpec('system/specs/list-row.md').head.component))"
node scenarios/validate.mjs
node tooling/validate-trace.mjs traces/sku-attention-list.jsonl
```

### Level 3: Generators + drift

```
node agent-layer/gen-vocabulary.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-system-graph.mjs
git add -A && node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
```

### Level 4: Manual / real-surface validation

```
node portal/record-composition.mjs northwind "<question>" insight-panel --slug sku-attention-list --dry
node portal/record-composition.mjs northwind "<question>" insight-panel --slug sku-attention-list
python3 -m http.server 8000        # then Chromium + WebKit on /instance.html, third Ask tab
cd tooling/visual-regression && npm run update:docker
```

### Level 5: Additional

```
gh pr checks            # the blocking `verify` job is the authority, not a local green
gh issue view 101       # post the fidelity verdict as a comment
```

---

## ACCEPTANCE CRITERIA

Mapped 1:1 to #101's checklist.

- [ ] **AC #1** — `system/specs/list-row.md` exists (head + four prose sections, `parseComponentSpec`-clean) and renders through `system/components.css` with token-only CSS: no literals, no brand values, **no new tokens**.
- [ ] **AC #2** — `gen-handoff.mjs` + `gen-vocabulary.mjs` regenerated and committed; `agentic-renderer.mjs` accepts `list-row` and still refuses all five adversarial cases in task 5 (unknown component · unknown prop · bad enum · missing required · chip child).
- [ ] **AC #3** — `node tooling/drift-check.mjs` and `node tooling/token-lint.mjs` both green; `gen-loc-summary --check` green **after staging**.
- [ ] **AC #4** — a **real** `record-composition.mjs` run against `northwind` produced the committed proposal + validating trace pair; every figure verified post-hoc against `fixtures/items.json` (table in the report); nothing hand-written or hand-edited.
- [ ] **AC #5** — the composed view eyeballed in real Chromium **and** WebKit on `instance.html`; screenshots attached; the "reads as their product" question answered explicitly and honestly — including whether the agent chose the row **freely**.
- [ ] **AC #6** — regression: `proto/compositions/index.json`, the four root Fieldwork proposals, northwind's two existing proposals, and the `proto-verdant` / `proto-fieldwork` baselines are all byte-identical to `origin/main`.
- [ ] The PR carries a `Closes #101` trailer; plan + report live in the same PR; the fidelity verdict is also a comment on #101.
- [ ] Exactly one vocabulary component was added — nothing else widened.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation passed immediately
- [ ] `drift-check` · `token-lint` · `loc-summary --check` · `validate-trace` · `scenarios/validate` all green
- [ ] The five-case refusal matrix printed five `✓ refused` lines
- [ ] The real run shipped a valid proposal + a PIV-clean trace (no hand-edits anywhere)
- [ ] Every composed figure reconciled against the fixture
- [ ] Chromium + WebKit screenshots captured; narrow-width overflow checked
- [ ] VR gate run; the exact changed-PNG list reported and only those committed
- [ ] Regression byte-comparison empty
- [ ] Report + plan committed; PR opened with `Closes #101`; verdict commented on #101

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes:**

1. **One node per row, array-of-rows in the slot** — head schema v1 props are scalar-only (`string|number|boolean`) and `validateComposition` allows at most one child, so a container-with-children list is structurally impossible. The composition array *is* the list. (Confirmed against agentic-renderer.mjs:64-105.)
2. **`tone` + `label` names are load-bearing, not cosmetic** — `agentic-study.mjs` applies a tone `<select>` (enum `neutral|warn|critical`) and labels each control by `props.label` for **every** node. Diverging on either name degrades the reader-adjust surface on the exact view this ticket ships.
3. **Zero new tokens.** Every token the row needs exists. This is what makes AC #3's ORPHAN check a non-event.
4. **The `insight-panel` bound is the right home** — it is already the vertical column, and `instance.html` renders it as a stacked flex region. `summary-strip` stays tile-shaped.
5. **`instance.html` is the eyeball surface** — it mounts every entry in `proto/compositions/northwind/index.json`, so the new question appears automatically as an Ask tab. Its **position is slug-sorted** (`upsertIndex`), not append-order, and `renderStudy` opens on `entries[0]` — so the row view is behind one click, and the page's at-rest state is unchanged. `/agentic-ui-study` reads the **root** manifest (Fieldwork only) and will not show it. `/handoff.html` *does* auto-ingest the new spec via `pack.json` — checked in task 12, gated by nothing.
6. **The agent may not pick the row.** Pre-authorized fallback in task 9; the weaker evidence is labelled as such rather than hidden.

**Questions that would change the plan if answered differently:**

- **`work.html` library card — include or defer?** Plan says defer (Non-Goals). Including it means one static `<li>` plus **two** more baseline regens for something no AC asks for, on a page whose claim is about the two prototypes, not vocabulary completeness. *Owner's call; the default is defer.*
- **Prop set — is `meta` one prop too many?** The minimum viable row is `{label, value, status}`. `meta` is what lets a SKU row carry "East · committed 145" without stuffing the value. If the owner wants the tightest possible first cut, drop `meta` and let the run tell us whether it is missed. *Default: keep it — one optional string is not a table engine, and its absence would push qualifiers into `label`, which is exactly the failure mode the prompt warns against.*
- **Should `status` be capped in length by prose alone?** There is no string-length validation in head schema v1, so "one or two words" is prose-enforced only. Accepted: the same latitude `metric-tile.value` already has.

---

## NOTES (open canvas)

**Why not the obvious alternatives.**

| Option | Why rejected |
| --- | --- |
| Generalize `care-task-row` (drop its enums) | Breaks Verdant's committed compositions, its WC wrapper, its DataContract, and the `proto-verdant` baseline. A Verdant component is *supposed* to be enum-locked — that specificity is a feature of the demo, not a bug. |
| `children: ["status-chip"]` on the new row | Re-locks it to `ok|due|overdue` via the chip's enum + the parent-status rule at agentic-renderer.mjs:102. This is the single mistake that would silently defeat the ticket. |
| A `list-group` container node with row children | `validateComposition` allows **at most one** child (line 87). Structurally impossible without changing the composition contract — far past "one bounded addition". |
| Array/object props (`rows: [...]`) | Head schema v1 is `string|number|boolean` only; the validator type-checks with `typeof`. Would require changing the schema, the validator, the vocabulary generator, and the spec format. |
| A new `entity-list` slot in `compose.json` | A slot literally named "a list of per-entity rows" *tells the agent the answer*, so the run would only prove the primitive renders — not that a free agent reaches for it. The loosened bound keeps the choice as evidence. (Advisor concurred; this is the plan's key evidentiary decision.) |

**The honesty firewall, precisely.** #88's firewall says `computeRules` must never name which tiles/metrics answer a question. This plan touches neither `computeRules` nor the question's semantics. It edits (a) the **shared system prompt**, generically, naming no component, and (b) the **slot bound**, which has always described the region's shape and always named permissible node kinds — and the edit *widens* rather than narrows the agent's freedom. Both are committed source; both are the sanctioned fix path. The one place to stay honest in the report: if the free-choice run yields tiles and the second, more directive run yields rows, say so plainly.

**Prompt-provenance note.** The committed Fieldwork + northwind proposals were produced under the pre-edit `PIV_COMPOSE_SYSTEM`. Each trace records its own run, so nothing already shipped becomes false; there is no drift gate over "prompt used vs. artifact". Do not re-run them to "align" — that would burn tokens and churn committed artifacts for zero honesty gain.

**Regen-cascade map (what triggers what).**

```
system/specs/list-row.md        → vocabulary.json · pack.json · pack.bundle.json   (drift-checked, blocking)
system/components.css block     → system-graph.json                               (drift-checked, blocking)  ← the easy one to forget
components.css + renderer lines → loc-summary.json runtime group (rounded /100)    (may not move at all)
loc-summary runtime change      → approach.html's two VR baselines                 (only if it moved)
new consumer node in the graph  → factory.html #shape — inside a JS-hidden tab panel; the VR gate is the authority, not this prediction
instance.html / study CSS       → neither page is VR-captured                      (no baseline impact)
```

**Sequencing / risk.** Tasks 1–7 are cheap and fully reversible; task 9 is the paid, stochastic step — gate it behind a green `--dry` and a green `drift-check`. If the run is weak twice, the honest outcome is to ship the primitive (ACs 1–3, 6 all hold on their own) and report the fidelity result as "the vocabulary gap is closed; the agent's shape selection needs further prompt work" — a partial but true result beats a hand-steered one. Flag that split to the owner rather than deciding it silently.

**Confidence.** Deliberately split, following #88's precedent:

- **Mechanical half (tasks 1–8, 11, 13–16 — spec, CSS, template, regen, gates, baselines): 9.5/10.** Every step has an executable gate, the pattern is a single well-understood precedent, and the failure modes (chip child, forgotten `gen-system-graph`, unstaged `loc-summary --check`) are named with their fixes.
- **The measurement (tasks 9–10, 12 — does the agent choose the row, does fidelity move): genuinely open, by design.** A stochastic paid run over a free-choice bound is the thing being measured. Quoting a single high number here would imply the eyeball result is predetermined, which is exactly what #101 exists to find out.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
