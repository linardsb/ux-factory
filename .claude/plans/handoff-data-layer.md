# Feature: Handoff data layer — ComponentSpec + DataContract + handoff-pack generator + Style Dictionary

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The machine-and-human handoff source for the platform. Four deliverables:

1. **ComponentSpec format** — one markdown file per component following the kb record convention: a leading ```json fence (the machine head the vocabulary generator #11 reads) + `##` prose sections (the human layer the handoff pack ships), the head referencing its DataContract.
2. **DataContract format** — a standalone JSON Schema `.json` file per data-bound component, consumed directly by validators, `$ref` tooling, and the WC spike (#12).
3. **Authored specs** for the component set the Verdant prototype screen (#8) will use — six components, spec-first (the screen doesn't exist yet; these specs define what #8 implements).
4. **`agent-layer/gen-handoff.mjs`** — emits the handoff pack (`handoff/verdant/`): spec projections for the viewer (#14), verbatim DataContracts, the DTCG token file, and **Style Dictionary multi-target token outputs (css / ios / android)** built by a new `tooling/style-dictionary/` package.

**Spike 4 (SD ↔ DTCG) was RUN during planning against the real `system/tokens.source.json` — outcome: all three targets, with a documented exclusion list.** See NOTES for the full spike record; the decision must be recorded as a comment on issue #7 (AC).

## User Story

As a hiring manager's engineer (and as the factory's own vocabulary generator)
I want one committed source per component that provably drives both the human handoff docs and the machine vocabulary, plus tokens emitted for web/iOS/Android from the single DTCG source
So that I could wire real data against this design system today, and verify that the human docs and the agent-facing contract cannot drift apart.

## Problem Statement

The platform claims "engineer-ready handoff" but has no handoff source: components exist only as CSS classes, there is no typed-props layer, no data contract, and tokens emit for web only. Tickets #11 (vocabulary), #12 (WC wrappers), and #14 (pack viewer) are all blocked on these formats existing.

## Solution Statement

Reuse the proven kb record shape (JSON fence + `##` sections) for ComponentSpec, parsed by a new `parseComponentSpec()` in `agent-layer/lib.mjs` (the parser family the ticket names). Keep DataContract as standalone JSON Schema. Author six specs spec-first for the Verdant screen. Emit the pack with a zero-dep `gen-handoff.mjs` following the `gen-token-css.mjs` precedent (import.meta.url paths, standalone guard, `✓` registration in `build.mjs`); Style Dictionary lives in its own `tooling/style-dictionary/` package (the one place a dependency is allowed) and is invoked as a child process so `agent-layer/` stays zero-dep.

## Out of Scope / Non-Goals

- **Not building the Verdant screen or its components' CSS** — that's #8. Specs here are the source #8 implements to (spec-first is the deliberate order; #8's ticket says "the component set used here … coordinate with the handoff-data-layer ticket").
- **Not the vocabulary generator, renderer, or action bus** — #11 (consumes these specs).
- **Not the pack viewer or download bundling** — #14 (consumes the pack).
- **Not WC wrappers or Figma parity** — #12.
- **No `--check` drift mode on gen-handoff** — #9's CI drift gate re-runs generators and diffs git state; per-generator check flags only where a ticket asked for one (#2 did, this one doesn't).
- **No TypeScript view of DataContracts** — architecture notes it as a possible later convenience.
- **Not touching `gen-tokens.mjs`, `gen-token-css.mjs`, or any shipped page** — nothing in this ticket changes what a visitor loads.
- **No schema-validation library (no ajv)** — DataContract files ARE JSON Schema (architecture-pinned artifact format), but this repo validates them by hand at the boundary per project types rule.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (mechanics de-risked by the executed spike; main variance is spec-authoring quality)
**Primary Systems Affected**: `agent-layer/` (lib + new generator + build registration) · new `system/specs/` · new `handoff/` · new `tooling/style-dictionary/` · `.claude/references/kb-format.md` · `CLAUDE.md`
**Dependencies**: `style-dictionary@^4.4.0` — confined to `tooling/style-dictionary/` (own package.json); everything else Node built-ins

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/7 (`Closes #7`)   ·   **Epic**: https://github.com/linardsb/ux-factory/issues/1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Data model ComponentSpec/DataContract decision 2026-07-17 · §Stack "Style Dictionary in MVP" · spike 4 — inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/dtcg-inversion-token-source.md` (#2, shipped as `9395c7c`) — Why: created `tokens.source.json` (the SD input) and the generator conventions this ticket mirrors; its NOTES pinned the "pragmatic string profile" that spike 4 has now validated (kept — see NOTES).

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #8 (Verdant screen) — implements these specs; flips each spec head's `status: "spec"` → `"shipped"` as components land.
- #11 (vocabulary generator) — reads spec heads via `parseComponentSpec`.
- #14 (pack viewer + download) — renders `handoff/verdant/pack.json`.
- #9 (CI gates) — drift-checks this generator's committed outputs.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `agent-layer/gen-token-css.mjs` (all 158 lines) — Why: THE pattern to mirror for gen-handoff: import.meta.url path resolution (lines 13–14, never cwd — build.mjs runs from the jobs folder), boundary validation throwing path-naming Errors (36–57), result-object return for the `✓` line (132–146), and the `pathToFileURL` standalone guard (148–158 — the repo path contains a space; naive `file://${argv[1]}` comparison never matches).
- `agent-layer/lib.mjs` (lines 11–30 `parseLedger`, 60–73 helpers) — Why: the parser family being extended; `parseComponentSpec` follows `parseLedger`'s shape (fence regex line 14, `## ` splitting line 20, throw style line 15).
- `agent-layer/build.mjs` (lines 21–37) — Why: registration pattern (import → call → `✓` log line, aligned columns). Add gen-handoff after the tokens.json line. Note line 14: runs FROM THE JOBS FOLDER with a ledger arg.
- `portal/lib/kb.mjs` (lines 9–19 `parseFencedJson` + `section`) — Why: the OTHER parser in the family — kb-format.md's sync rule. ComponentSpec keeps the same physical shape (json fence + `## ` sections) precisely so this parser could read a spec unchanged; do not diverge from that shape.
- `system/tokens.source.json` (all 166 lines) — Why: SD's input. Note the CSS-only values that drove the spike's exclusion list: `color-mix(...)` strings (lines 28–32, 159–163), `clamp(...)` dimensions (type-ramp, lines 69–76), fontFamily arrays (36–37), string shadows (58–60). Two top-level groups `contract` / `neutral` — pack targets filter on `path[0]`.
- `system/proto.css` (header, lines 1–11; component classes ~line 370–460: `.ot-card`, `.ot-btn`, `.ot-chip`, `.ot-field`, `.ot-train`) — Why: the prototype-surface convention the Verdant screen (#8) will follow (shell + phone-frame app with `ot-`-style prefixed classes); spec `class` fields use a `vd-` prefix by the same convention, and the existing proto components are the realism reference for prose sections.
- `.claude/references/kb-format.md` (all 13 lines) — Why: the doc this ticket must extend (AC #1); its last line is the "Decided forward … Not built yet" placeholder this ticket replaces.
- `.claude/references/token-system.md` (all 3 sections) — Why: token-dependency lists in spec heads must name real contract tokens; this doc + `tokens.source.json` `contract` group are the authority.
- `docs/epics/ai-first-ux-factory.architecture.md` (lines 35–41 §Data model · line 31 SD decision · lines 51–57 §Agentic UI · lines 81–82 spike 4) — Why: the inherited decisions this plan implements; §Agentic UI line 52 defines what the vocabulary generator will need from spec heads (names, prop schemas, composition rules, usage guidance) — the head schema below must carry all four.
- `.claude/plans/dtcg-inversion-token-source.md` (NOTES + Out of Scope) — Why: prior plan's SD expectations; its "string profile revisited only if spike 4 forces it" question is now answered (it doesn't — keep the string profile).

### New Files to Create

- `system/specs/plant-card.md` + `system/specs/plant-card.contract.json` — hero component: plant identity + care status
- `system/specs/care-task-row.md` + `system/specs/care-task-row.contract.json` — today-list row: one scheduled care action
- `system/specs/status-chip.md` + `system/specs/status-chip.contract.json` — categorical state chip (ok / due / overdue)
- `system/specs/stat-tile.md` + `system/specs/stat-tile.contract.json` — one reading/metric (moisture, light)
- `system/specs/screen-header.md` — phone app bar (presentational; `"contract": null`)
- `system/specs/primary-button.md` — the log-care action (presentational; `"contract": null`)
- `agent-layer/gen-handoff.mjs` — the pack generator (exports `genHandoff()`)
- `tooling/style-dictionary/package.json` — private, `"type": "module"`, dep `style-dictionary@^4.4.0` (+ commit `package-lock.json`)
- `tooling/style-dictionary/build-tokens.mjs` — SD config + custom transforms/preprocessor; emits into `handoff/verdant/tokens/`
- `handoff/verdant/*` — GENERATED, COMMITTED pack output (pack.json · contracts/ · tokens.dtcg.json · tokens/{css,ios,android}/)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Style Dictionary v4 — DTCG support](https://styledictionary.com/info/dtcg/)
  - `$value`/`$type` auto-detected per file; transforms receive DTCG tokens
  - Why: confirms no conversion layer needed over `tokens.source.json`
- [Style Dictionary v4 — Preprocessors](https://styledictionary.com/reference/hooks/preprocessors/)
  - Platform-level `preprocessors: [...]` prune the tree BEFORE transforms
  - Why: the ONLY way to keep css-only tokens out of ios/android — file-level `filter` runs after transforms and is too late (verified failing in the spike)
- [Style Dictionary v4 — Transforms](https://styledictionary.com/reference/hooks/transforms/)
  - `registerTransform({name, type: 'name'|'value', filter, transform})`
  - Why: custom `name/leaf` (css) and px-passthrough size transforms (ios/android)
- [Style Dictionary v4 — css/variables format + outputReferences](https://styledictionary.com/reference/hooks/formats/predefined/#cssvariables)
  - Why: `outputReferences: true` preserves `var()` aliases in the semantic map
- [DTCG format spec](https://tr.designtokens.org/format/) — Why: lineage citation for pack `$description`s; no format changes needed
- [JSON Schema 2020-12](https://json-schema.org/specification) — Why: DataContract files declare `"$schema": "https://json-schema.org/draft/2020-12/schema"`

### Patterns to Follow

**Generator shape** (from `gen-token-css.mjs:13-14,150`): resolve from module, guard with `pathToFileURL`:

```js
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// ...
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { ... }
```

**Error convention** (from `gen-token-css.mjs:39-51`): plain `Error`, message names the offending path:
`throw new Error(`${specPath}: head "component" ("${head.component}") does not match filename`)`

**build.mjs registration** (from `build.mjs:24-28`):

```js
const hp = genHandoff();
console.log(`  handoff pack    ✓  ${hp.components} specs + ${hp.targets} token targets (handoff/verdant)`);
```

**File headers**: feature/entry files open citing the governing doc (see `gen-token-css.mjs:1-7`):
`// gen-handoff.mjs — ComponentSpecs + DataContracts + tokens → the handoff pack (epic #1, ticket #7). Spec: docs/epics/ai-first-ux-factory.architecture.md §Data model.`

**ComponentSpec head schema (v1 — this ticket defines it; document verbatim in kb-format.md).** Field rules: `component` must equal the filename stem · `status` ∈ `spec | shipped` (honesty surface — capability indicators state exactly what runs; #8 flips to `shipped` when the CSS lands) · `class` is the CSS class #8 will implement (`vd-` prefix per the `ot-` proto convention) · `contract` is a sibling-relative path or `null` for presentational components · `props` carries the four things #11's vocabulary needs (names, types, requiredness, guidance) · `tokens` lists only tokens present in the `contract` group of `tokens.source.json` · `children` names other spec'd components only (composition rules for #11).

**Prose sections (fixed order, all four required):** `## Usage` (when/why, placement) · `## States` (each named state and its trigger) · `## Data binding` (how contract fields map into the markup — the "wire real data today" section) · `## Accessibility` (role, labels, focus, touch target).

**GOLDEN EXEMPLAR — create `system/specs/plant-card.md` with EXACTLY this content; the other five specs MIRROR its altitude and shape (approved by the PRD holder during planning):**

````markdown
```json
{
  "component": "plant-card",
  "status": "spec",
  "class": "vd-plant-card",
  "contract": "plant-card.contract.json",
  "props": {
    "name":     { "type": "string", "required": true,  "description": "plant display name, one line, truncates with ellipsis" },
    "species":  { "type": "string", "required": false, "description": "latin name — muted secondary line, omitted entirely when absent" },
    "status":   { "type": "string", "required": true,  "enum": ["ok", "due", "overdue"], "description": "care status — rendered by the status-chip child, drives the due/overdue states" },
    "photoUrl": { "type": "string", "required": false, "description": "square thumbnail; when absent, a token-tinted monogram placeholder (first letter of name)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--radius-md", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--shadow-sm"],
  "states": ["default", "due", "overdue", "pressed"],
  "children": ["status-chip"]
}
```

## Usage

Component of the Verdant demo scenario (fictional product). The unit of the "My plants" list: one card per plant — thumbnail left, name + species stacked centre, status-chip right. Use in a vertical list under the screen-header; the whole card is one tap target navigating to the plant. Never nest a card in a card; never place more than one chip on it — the card summarises, the detail view elaborates.

## States

- **default** — `status: "ok"`: surface background, quiet border, chip in its ok variant.
- **due** — `status: "due"`: chip switches to its due variant; the card itself does not recolour (the chip carries the signal — one signal per card).
- **overdue** — `status: "overdue"`: chip in its overdue variant; card border moves to `--color-accent` — the only state where the card itself escalates.
- **pressed** — active touch: background deepens one step toward `--color-border`; no scale transforms.

## Data binding

Renders one `Plant` record (plant-card.contract.json). Mapping:

| Contract field | Element | When absent |
| --- | --- | --- |
| `name` | primary line (`--type-body`, `--color-fg`) | required — never absent |
| `species` | secondary line (`--type-caption`, `--color-fg-muted`) | line omitted, card compacts |
| `status` | status-chip child | required — never absent |
| `photoUrl` | 48px square thumbnail, `--radius-md` | monogram placeholder, `--color-bg-surface` / `--color-fg-muted` |
| `id` | `data-plant-id` attribute (navigation target) | required — never absent |
| `lastWatered` | not rendered here — care-task-row territory | — |

Sample record (valid against the contract):

```json
{ "id": "p-014", "name": "Monstera", "species": "Monstera deliciosa", "status": "due", "lastWatered": "2026-07-14T08:30:00Z", "photoUrl": "/assets/verdant/monstera.webp" }
```

## Accessibility

The card is a single link (`<a>`), accessible name = name + status ("Monstera, watering due"); the chip's text is `aria-hidden` to avoid double announcement. Thumbnail `alt=""` (decorative — the name is adjacent). Minimum touch target 44px; visible `:focus-visible` outline in `--color-accent`; state changes never rely on colour alone (the chip carries a text label).
````

**DataContract golden exemplar — create `system/specs/plant-card.contract.json` with EXACTLY this content** (standalone, per-component, describes the data the component binds — not its props):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://factory-ux.pages.dev/handoff/verdant/contracts/plant-card.contract.json",
  "title": "Plant",
  "description": "One plant as the Verdant mock API returns it (fictional demo data). The shape plant-card binds; care-task-row references plants by id.",
  "type": "object",
  "required": ["id", "name", "status", "lastWatered"],
  "properties": {
    "id":          { "type": "string", "description": "stable plant id, e.g. \"p-014\"" },
    "name":        { "type": "string", "minLength": 1 },
    "species":     { "type": "string", "description": "latin name; optional" },
    "status":      { "type": "string", "enum": ["ok", "due", "overdue"], "description": "derived server-side from lastWatered + the care schedule" },
    "lastWatered": { "type": "string", "format": "date-time" },
    "photoUrl":    { "type": "string", "format": "uri-reference", "description": "site-relative image path; optional" }
  },
  "additionalProperties": false
}
```

**Proven SD config (from the executed spike — reuse verbatim, adjusting only paths/polish):** see NOTES for the full spike record. Core pieces: `name/leaf` name transform (`t.path.at(-1)`) + per-group file `filter` for css with `options: { outputReferences: true }`; `strip-css-only` platform preprocessor for ios/android (prunes fontFamily arrays, `clamp(`, `color-mix(`, `$type === "shadow"`); custom value transforms `size/px-to-cgfloat` / `size/px-to-dp` replacing the rem-based defaults (which turned `4px` into `64.00dp`); ios transforms list `["attribute/cti", "name/camel", "color/UIColorSwift", "content/swift/literal", "asset/swift/literal", "size/px-to-cgfloat"]` (use **name/camel**, not pascal — Swift property convention), android `["attribute/cti", "name/snake", "color/hex8android", "size/px-to-dp"]`, Swift file `options: { className: "FactoryTokens" }` (omitting it emits `public class {` — invalid Swift).

---

## IMPLEMENTATION PLAN

### Phase 1: Formats + parser (foundation)

Define the ComponentSpec/DataContract formats in `.claude/references/kb-format.md` and add `parseComponentSpec` to `agent-layer/lib.mjs`.

**Tasks:**
- Document both formats (head schema, section order, location, parser-sync rule)
- Implement + boundary-validate the parser

### Phase 2: Author the six specs + four contracts

**Depends on:** Phase 1 (the format definition)

Spec-first content authoring for the Verdant screen's component set.

### Phase 3: Style Dictionary tooling

**Independent of:** Phase 2 (needs only `tokens.source.json`, which exists) — can run in parallel with spec authoring.

`tooling/style-dictionary/` package + `build-tokens.mjs` emitting the three targets into `handoff/verdant/tokens/`.

### Phase 4: gen-handoff.mjs + registration

**Depends on:** Phases 2 and 3 (assembles specs + SD outputs into the pack)

Generator emits `handoff/verdant/` and registers in `build.mjs`.

### Phase 5: Docs, validation, spike record

**Depends on:** Phase 4

CLAUDE.md architecture-map updates, full validation run, spike-4 outcome comment on issue #7.

---

## STEP-BY-STEP TASKS

### UPDATE `.claude/references/kb-format.md`

- **IMPLEMENT**: Replace the final "Decided forward … Not built yet" paragraph with a `## ComponentSpec + DataContract (this repo)` section: location `system/specs/` (NOTE the deviation and why: kb records live in the jobs folder, but ComponentSpec only reuses the *shape* — architecture §Data model says all platform files live in-repo); the head schema v1 verbatim (from Patterns above); the four required prose sections in order; DataContract = standalone JSON Schema 2020-12, `<component>.contract.json`, sibling of its spec; parser = `parseComponentSpec` in `agent-layer/lib.mjs`; sync rule = the physical shape (json fence + `## ` sections) stays readable by `portal/lib/kb.mjs`'s `parseFencedJson`/`section` — change the shape, keep both parsers in sync.
- **PATTERN**: the existing doc's terse per-shape bullet style (kb-format.md lines 5–11)
- **VALIDATE**: `grep -c "ComponentSpec" .claude/references/kb-format.md` → ≥ 2
- **SATISFIES**: AC #1

### ADD `parseComponentSpec` to `agent-layer/lib.mjs`

- **IMPLEMENT**: `export function parseComponentSpec(specPath)` → `{ head, sections, path }` where `sections` is `[{ title, body }]` in file order. Validate at the boundary, throwing `Error`s that name `specPath`: json fence present + parses; `component` matches filename stem; `status` ∈ spec|shipped; `class` non-empty string; `props` object with `{type, required}` per entry (optional `enum`, `description`); `tokens` non-empty array of `--`-prefixed names; `states` non-empty array; `children` array (may be empty); `contract` string or null — when string, the sibling file must exist, parse as JSON, and carry `$schema` + `type` (hand validation, no ajv); all four required sections present in order.
- **PATTERN**: `parseLedger` (lib.mjs:11–30) — same fence regex, same `## ` split, same throw style
- **IMPORTS**: `readFileSync`, `existsSync` from `node:fs`; `basename`, `dirname`, `join`, `resolve` from `node:path`
- **GOTCHA**: lib.mjs currently imports only `readFileSync`/`resolve` — extend the imports your change needs, touch nothing else
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m => console.log(typeof m.parseComponentSpec))"` → `function` (from repo root)
- **SATISFIES**: AC #2 (parser)

### CREATE the six specs + four contracts in `system/specs/`

- **IMPLEMENT**: create `plant-card.md` + `plant-card.contract.json` VERBATIM from the golden exemplar in Patterns (PRD-holder approved during planning — do not rewrite it). Then MIRROR its altitude for the other five: `care-task-row`, `status-chip`, `stat-tile` (each `.md` + `.contract.json`), `screen-header`, `primary-button` (`.md` only, `"contract": null`). Every head follows schema v1 with `status: "spec"`; every `tokens` entry exists in the `contract` group of `system/tokens.source.json` (add missing semantic tokens there FIRST + regenerate via `node agent-layer/gen-token-css.mjs` only if genuinely needed — prefer the existing 46); `children`: plant-card → [status-chip], care-task-row → [status-chip], others []. Prose realism bar (PRD §6.4): every `## Data binding` matches the exemplar's shape — field→element mapping table, absent-field behaviour, one fenced sample record valid against the contract. Each `## Usage` opens with "Component of the Verdant demo scenario (fictional product)" — honesty surface #1 at the source. Contracts: `Plant` (given), `CareTask` (id, plantId, plantName, action enum water|mist|feed, due date-time, status), `Reading` (kind enum moisture|light, value number, unit, label), `Status` (the ok|due|overdue enum + label text). The approved screen sketch in NOTES defines each component's role.
- **PATTERN**: the golden exemplar (Patterns above) — altitude, section shapes, table format; proto.css `ot-card`/`ot-chip`/`ot-train` (lines ~370–460) for what phone-frame components of this kind carry
- **GOTCHA**: `stat-tile`'s reading value is a number + unit + label — resist inventing a full sensor API; the contract describes only what the tile binds
- **VALIDATE**: `for f in system/specs/*.md; do node -e "import('./agent-layer/lib.mjs').then(m => { m.parseComponentSpec('$f'); console.log('$f ok'); })"; done` → six `ok` lines
- **SATISFIES**: AC #2 (specs authored)

### CREATE `tooling/style-dictionary/package.json` + install

- **IMPLEMENT**: `{ "name": "factory-style-dictionary", "private": true, "type": "module", "dependencies": { "style-dictionary": "^4.4.0" } }`; run `npm install` inside `tooling/style-dictionary/`; commit `package.json` + `package-lock.json` (node_modules is already gitignored at repo root).
- **VALIDATE**: `node -e "import('/Users/Berzins/Desktop/Linards_current/ux-factory/tooling/style-dictionary/node_modules/style-dictionary/lib/StyleDictionary.js').then(() => console.log('sd ok'))"` — or simpler: the next task's script runs
- **SATISFIES**: AC #4 (SD outputs)

### CREATE `tooling/style-dictionary/build-tokens.mjs`

- **IMPLEMENT**: the spike-proven config (Patterns above + NOTES): source `../../system/tokens.source.json` resolved from `import.meta.url`; platforms css (files `tokens.css` split contract/neutral or one file — one file `tokens.css` filtered per group into two files `contract.css` + `neutral.css`, `name/leaf` + `outputReferences: true`), ios (`FactoryTokens.swift`, filter `path[0] === "neutral"`), android (`tokens.xml`, same filter); `strip-css-only` preprocessor on ios+android only; buildPath `../../handoff/verdant/tokens/{css,ios,android}/`; standalone-runnable, prints `sd tokens       ✓  css + ios + android → handoff/verdant/tokens` on success. Header comment cites spike 4 + the exclusion list (fontFamily stacks, clamp() type ramp, color-mix() derived colors, string shadows — web-only values with no mobile equivalent; mobile targets carry the transformable subset: colors, spacing, radius, layout).
- **PATTERN**: spike record in NOTES — the exact transforms/preprocessor/options are verified against SD 4.4.0
- **GOTCHA #1**: file-level `filter` runs AFTER transforms — css-only tokens MUST be pruned by the platform `preprocessors`, or ios/android throw `Invalid Number … clamp(40px, 6vw, 76px)`
- **GOTCHA #2**: default ios/android size transforms are rem-based ×16 (`4px` → `64.00dp`) — use the custom px-passthrough transforms
- **GOTCHA #3**: `ios-swift/class.swift` without `options.className` emits `public class {` — invalid Swift
- **GOTCHA #4**: use `name/camel` for ios (spike used pascal → `NeutralLayoutGutter`; Swift wants `neutralLayoutGutter`)
- **VALIDATE**: `node tooling/style-dictionary/build-tokens.mjs && grep -q "4.00dp" handoff/verdant/tokens/android/tokens.xml && grep -q "class FactoryTokens" handoff/verdant/tokens/ios/FactoryTokens.swift && grep -q "var(--color-ink)" handoff/verdant/tokens/css/neutral.css && echo PASS`
- **SATISFIES**: AC #4 (SD outputs generated)

### CREATE `agent-layer/gen-handoff.mjs`

- **IMPLEMENT**: `export function genHandoff()`: (1) read every `system/specs/*.md` via `parseComponentSpec`, cross-validate the set (unique `component` names; every `children` entry names a spec in the set — throw naming the offending file); (2) run SD via `execFileSync(process.execPath, [<abs path to build-tokens.mjs>], { stdio: "inherit" })` — on failure (e.g. missing node_modules) throw an `Error` naming the fix: `cd tooling/style-dictionary && npm install`; (3) copy each referenced `*.contract.json` verbatim → `handoff/verdant/contracts/`; (4) copy `system/tokens.source.json` → `handoff/verdant/tokens.dtcg.json`; (5) write `handoff/verdant/pack.json`: `{ $description (what the pack is + "generated by agent-layer/gen-handoff.mjs from system/specs/ — do not edit" + honesty note "Verdant is a fictional demo scenario"), scenario: "verdant", generatedFrom: "system/specs", components: [{ ...head, sections, contract: "contracts/<name>.contract.json" | null }] }` — sections inline so #14's viewer renders head + prose side by side from one fetch; (6) return `{ components, targets: 3, dest }`. All paths from `import.meta.url` (mirror gen-token-css.mjs:13); `mkdirSync(..., { recursive: true })` for the output tree; standalone guard with `pathToFileURL` printing the same `✓` line format.
- **PATTERN**: `gen-token-css.mjs` end to end (paths, validation, result object, guard); error convention `lib.mjs:15`
- **IMPORTS**: `node:fs` (readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync), `node:path`, `node:url` (fileURLToPath, pathToFileURL), `node:child_process` (execFileSync), `./lib.mjs` (parseComponentSpec)
- **GOTCHA**: the repo path contains a space — `execFileSync` with an args ARRAY is safe (never string-interpolate into a shell); the standalone guard must use `pathToFileURL` (gen-token-css.mjs:148–149 documents why)
- **VALIDATE**: `node agent-layer/gen-handoff.mjs` → `handoff pack    ✓  6 specs + 3 token targets (handoff/verdant)`; then `node -e "JSON.parse(require('fs').readFileSync('handoff/verdant/pack.json','utf8')); console.log('pack parses')"`
- **SATISFIES**: AC #3 (generator emits the pack, standalone guard)

### UPDATE `agent-layer/build.mjs`

- **IMPLEMENT**: import `genHandoff` from `./gen-handoff.mjs`; call after the `tokens.json` block with the `✓` line from Patterns (keep column alignment with the existing log lines).
- **PATTERN**: build.mjs:24–28 (the gen-token-css registration — also ledger-independent)
- **VALIDATE**: `cd "../Linards jobs folder" && node "../ux-factory/agent-layer/build.mjs" _factory/kb/decisions/trainline.md` → every existing `✓` line still prints PLUS the new handoff line
- **SATISFIES**: AC #3 (registered in build.mjs with a `✓` line)

### UPDATE `CLAUDE.md` (architecture map + placement rules)

- **IMPLEMENT**: surgical additions only: under `system/` add `specs/` (ComponentSpec .md + DataContract .json — handoff source of truth, format in .claude/references/kb-format.md); add top-level `handoff/` (GENERATED pack — committed, never edited) and `tooling/style-dictionary/` (the one dependency-carrying tool; emits the pack's multi-target tokens) map entries; under "Where new code goes" add: **New component spec** → `system/specs/<component>.md` (+ `.contract.json` if data-bound) per kb-format.md, then `node agent-layer/gen-handoff.mjs`.
- **GOTCHA**: match the map's existing comment style/altitude; every changed line traces to this ticket
- **VALIDATE**: `git diff CLAUDE.md` — additions only, no reflowed neighbours
- **SATISFIES**: AC #1 (formats documented/discoverable), repo ground rule

### RUN full validation + commit generated outputs

- **IMPLEMENT**: run the Level 1–4 commands below; commit source + generated pack together (deploy = commit the artifacts).
- **VALIDATE**: all commands below pass; `git status` shows `handoff/` contents staged, no unexpected files
- **SATISFIES**: AC #3, #4

### RECORD spike-4 outcome on issue #7

- **IMPLEMENT**: `gh issue comment 7 --repo linardsb/ux-factory --body "…"` summarizing: SD 4.4.0 parses the DTCG string-profile source unmodified; default transforms fail on web-only values (clamp/color-mix/font stacks/shadows) and rem-assume px dimensions; with a ~50-line config (leaf-name transform, strip-css-only preprocessor, px-passthrough size transforms, className) **all three targets ship in MVP** — mobile targets carry the transformable subset (colors, spacing, radius, layout) with the exclusion list documented in `tooling/style-dictionary/build-tokens.mjs`. Decision rule satisfied on the "clean → all three" branch with the caveat named.
- **VALIDATE**: `gh issue view 7 --repo linardsb/ux-factory --comments | grep -c "Style Dictionary"` ≥ 1
- **SATISFIES**: ticket requirement "Record the outcome here"

---

## TESTING STRATEGY

No test suite, linter, or type-check exists in this repo — do not invent one (ground rule). "Done" = run the surface touched:

### Unit-level (per artifact)

Each generator/parser runs standalone and prints its `✓` line or throws a path-naming Error. Negative checks: run `parseComponentSpec` against a deliberately broken temp spec (missing fence → error names the file; bad `children` ref → error names the file) — do this ad hoc in scratchpad, don't commit fixtures.

### Integration

Full `build.mjs` run from the jobs folder against `trainline.md` — proves gen-handoff coexists with the ledger-driven generators and that repo-relative path resolution survives the foreign cwd.

### Edge Cases

- Spec file with no json fence / unparseable JSON → thrown Error names the path
- `component` ≠ filename stem → thrown Error
- `contract` referencing a missing or non-Schema file → thrown Error
- `children` naming an unspec'd component → thrown Error
- `tooling/style-dictionary/node_modules` absent → gen-handoff's Error names the `npm install` fix
- Repo path contains a space → `execFileSync` arg-array + `pathToFileURL` guard (both patterns proven in-repo)
- Re-running gen-handoff twice → byte-identical output (determinism is what #9's drift gate will rely on; SD output is deterministic, pack.json must not embed timestamps)

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check agent-layer/gen-handoff.mjs && node --check agent-layer/lib.mjs && node --check tooling/style-dictionary/build-tokens.mjs
```

### Level 2: Unit (standalone runs)

```bash
node tooling/style-dictionary/build-tokens.mjs
node agent-layer/gen-handoff.mjs
node agent-layer/gen-token-css.mjs --check   # regression: token flow untouched
```

### Level 3: Integration

```bash
cd "../Linards jobs folder" && node "../ux-factory/agent-layer/build.mjs" _factory/kb/decisions/trainline.md
```

### Level 4: Manual Validation

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('handoff/verdant/pack.json','utf8')); console.log(p.components.length, 'components;', p.components.every(c=>c.sections.length>=4) ? 'all have 4+ sections' : 'MISSING SECTIONS')"
grep "4.00dp" handoff/verdant/tokens/android/tokens.xml        # px passthrough correct (not 64.00dp)
grep "class FactoryTokens" handoff/verdant/tokens/ios/FactoryTokens.swift
grep "var(--color-ink)" handoff/verdant/tokens/css/neutral.css # references preserved
node agent-layer/gen-handoff.mjs && git diff --exit-code handoff/  # determinism (after first commit)
```

### Level 5: Realism read (the PRD §6.4 bar)

Open `handoff/verdant/pack.json` + one contract and answer as the reading engineer: "could I wire real data today?" — field→element mapping present, sample object present, states enumerated. This is a judgment check, not a command.

## ACCEPTANCE CRITERIA

- [ ] ComponentSpec + DataContract formats documented in `.claude/references/kb-format.md`, parser-sync rule stated (AC #1)
- [ ] Six specs authored for the Verdant screen's component set; `parseComponentSpec` in `agent-layer/lib.mjs` reads heads + prose with boundary validation (AC #2)
- [ ] `agent-layer/gen-handoff.mjs` emits `handoff/verdant/`; registered in `build.mjs` with a `✓` line; standalone-run guard kept (AC #3)
- [ ] SD outputs (css/ios/android) generated and committed; spike-4 outcome recorded on issue #7 (AC #4)
- [ ] Realism bar: pack passes the Level-5 read (PRD §6.4)
- [ ] Zero changes to shipped pages; `gen-token-css.mjs --check` still passes; full `build.mjs` run green
- [ ] All generated artifacts committed (deploy = commit the artifacts); every changed line traces to this ticket

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (Phase 3 may run parallel to Phase 2)
- [ ] Each task's VALIDATE command passed immediately after the task
- [ ] Level 1–4 validation commands all pass; Level 5 read done
- [ ] Determinism check: second gen-handoff run produces no git diff
- [ ] CLAUDE.md + kb-format.md updated surgically
- [ ] Issue #7 carries the spike-4 record
- [ ] One atomic commit: `handoff data layer: ComponentSpec + DataContract + gen-handoff + Style Dictionary (epic #1, #7; folds spike 4) — Closes #7`

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **[RESOLVED 2026-07-17, PRD holder]** Component set = the proposed six (`plant-card`, `care-task-row`, `status-chip`, `stat-tile`, `screen-header`, `primary-button`) on the today-list screen (sketch in NOTES). #8 implements to these specs; still a two-way door if #8's design pass amends details.
2. **`status: "spec"` honesty flag.** Specs land before the components exist; the head says so (`spec` → `shipped` flipped by #8). Assumption: this satisfies the capability-indicator honesty surface without a UI treatment (that's #14's concern).
3. **Pack is scenario-scoped (`handoff/verdant/`).** Assumption from PRD §6.4 ("for that screen"); a Fieldwork pack would be a sibling directory later. Specs themselves stay library-wide in `system/specs/`.
4. **[RESOLVED 2026-07-17, PRD holder]** All three SD targets ship in MVP; mobile carries the transformable subset (colors, spacing, radius, layout) with the exclusion list documented in the SD config and on issue #7.
5. **`system/specs/` location.** kb-format.md says kb records live in the jobs folder; architecture §Data model says all platform files live in-repo and ComponentSpec "reuses the kb record convention" — read as reusing the SHAPE, not the location. The kb-format.md update states this explicitly.

## NOTES (open canvas)

### Spike 4 record (EXECUTED during planning, 2026-07-17, scratchpad `sd-spike/`)

**Question:** does `tokens.source.json` (DTCG string profile) survive Style Dictionary to css/ios/android?

**Setup:** style-dictionary 4.4.0 (current latest), the real committed source file, default transformGroups first.

**Findings, in order:**
1. `css` transformGroup: builds immediately. Default names are full-path (`--contract-fg-surface-color-fg`) — a 3-line `name/leaf` transform (`t.path.at(-1)`) restores the shipped naming exactly; leaf names are already unique per group (gen-token-css.mjs enforces this). With `outputReferences: true`, the neutral semantic map emits `--color-fg: var(--color-ink)` — matching the shipped pack's alias structure.
2. `ios-swift` / `android` default groups: **fail** — `Invalid Number: 'contractTypeRampTypeDisplay: clamp(40px, 6vw, 76px)'`.
3. File-level `filter` does NOT fix it: transforms run over the whole dictionary before file filtering. **Platform-level `preprocessors`** (prune css-only tokens from the tree) is the correct mechanism — verified building clean.
4. New find: default mobile size transforms are rem-based ×16 — `4px` → `64.00dp` / `CGFloat(64)`. Custom px-passthrough value transforms (`parseFloat` → `CGFloat(n)` / `${n}dp`) verified correct (`4.00dp`, `CGFloat(24.00)` for gutter, `CGFloat(1200.00)` maxw).
5. `ios-swift/class.swift` needs `options.className` (else `public class {`). Use `name/camel` (spike's pascal gave `NeutralLayoutGutter`; Swift convention is lowerCamel).
6. Colors verified correct end-to-end: `UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1)` and `#ff2563eb` for `#2563eb`.

**Verdict:** the "clean → all three targets in MVP" branch, achieved with ~50 lines of documented config; exclusion list (fontFamily arrays, `clamp()`, `color-mix()`, string shadows) is principled — those values are web-only by nature, not an SD limitation. The #2 plan's "string profile revisited only if spike 4 forces it" question closes: **string profile kept**; structured DTCG values ($value objects for shadows/dimensions) would buy mobile shadows but cost the whole source file's readability and gen-token-css simplicity — not worth it for a web-first system whose mobile targets are a portability proof. **Confirmed by the PRD holder 2026-07-17** (see Open Questions #4).

### Additional executed verifications (2026-07-17, closing the plan's last mechanical unknowns)

- **`execFileSync` from a space-containing path**: invoked the SD build script via `execFileSync(process.execPath, [absPath])` where the path contains spaces — works (arg-array form never touches a shell). The gen-handoff task's wiring is now observed behavior, not assumption.
- **SD output determinism**: two consecutive builds of all targets are byte-identical (`diff -r` clean) — SD 4.4.0 file headers carry no timestamps. `git diff --exit-code handoff/` after a re-run is a valid drift check, which is exactly what #9 will rely on.

### Approved Verdant screen sketch (PRD holder, 2026-07-17) — the role of each spec'd component

```
┌─────────────────────────┐
│ ◀  My plants        ⚙  │  screen-header
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 🌿 Monstera   [DUE] │ │  plant-card (+ status-chip child)
│ │ M. deliciosa        │ │
│ └─────────────────────┘ │
│ ┌──────────┬──────────┐ │
│ │ 34% 💧   │ 620lx ☀  │ │  stat-tile ×2 (moisture, light)
│ └──────────┴──────────┘ │
│ ─ Today ─────────────── │
│ ○ Water Monstera  [DUE] │  care-task-row (+ status-chip child)
│ ○ Mist Calathea   [OK]  │
│ ┌─────────────────────┐ │
│ │    Log care  ✓      │ │  primary-button
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Alternatives weighed

- **Contracts per entity (`plant.contract.json`) vs per component** — chose per-component: the handoff story is "this component consumes this shape"; entity dedup via `$ref` is a later concern when two components genuinely share a shape (care-task-row's `plant` sub-object may `$ref` plant-card's schema — allowed, both live in the same dir, but don't force it in v1).
- **SD invoked in-process vs child process** — child process (`execFileSync`) keeps `agent-layer/` importable with zero deps and makes the SD dependency boundary physical (`tooling/style-dictionary/` owns it). In-process would require agent-layer to resolve tooling's node_modules — path hacks, rejected.
- **pack.json inlining prose vs referencing spec files** — inlined: #14's viewer gets one fetch, and the pack is self-contained for download; the specs stay the source, the pack is a projection (same relationship as cards over intake.md).
- **`--check` mode on gen-handoff** — dropped (YAGNI now); #9's drift gate re-runs generators and `git diff --exit-code`s, which the determinism edge-case test already guarantees works.

### Sequencing note for the trifecta

Phase 3 (SD tooling) touches nothing Phase 2 touches — a parallel worktree or a second loop can own it. Phases 1→2 and 4→5 are strictly ordered.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->
