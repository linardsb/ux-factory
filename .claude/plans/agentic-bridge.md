# Feature: Agentic bridge — component vocabulary generator, declarative renderer, action bus

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The design system made consumable by agents — the bridge between the two exhibits (architecture line 23: "the design system built in Exhibit 1 is what makes agentic UI safe in Exhibit 2"). Three deliverables:

1. **Component vocabulary** — `agent-layer/gen-vocabulary.mjs`, a new zero-dep generator reading the committed ComponentSpec heads + DataContracts (`system/specs/`, from #7) and emitting ONE file: component names, prop schemas, composition rules, usage guidance. Makes the library consumable by a third party (agents) and doubles as the handoff pack's "agent-ready" layer — it lives in the pack at `handoff/verdant/vocabulary.json`.
2. **Declarative renderer** — `system/agentic-renderer.mjs`, a small vanilla ES module interpreting `{name, props, children}` compositions against the known library only. Unknown component names, out-of-vocabulary props, missing required props, enum violations, and disallowed children are all **refused with a thrown Error naming the offending path** — the managed-freedom argument, same as the token contract. The agent never emits raw HTML/CSS (PRD §8 non-goal), and the renderer makes that true by construction: all DOM is built with `createElement`/`textContent`, so agent-supplied props cannot inject markup.
3. **Action bus** — `system/action-bus.mjs`, one standardized bidirectional event contract (agent→UI, UI→agent) so click, keyboard, agent — and voice later — are interchangeable input modalities, not separate integrations. Voice-ready by design; voice itself is post-MVP behind the strong-case bar (architecture line 57).

Plus a bare harness page (`agentic.html`, mirroring `derive.html`) that renders a hand-authored composition with real components + tokens, demonstrates the refusals, and shows bus traffic in both directions.

## User Story

As an agent composing UI (and as the hiring manager's engineer verifying the claim)
I want a machine-readable vocabulary of the component library, a renderer that only accepts compositions valid against it, and one event contract for all input modalities
So that agentic UI is safe and brand-consistent by construction — and the reader can watch an out-of-vocabulary composition get refused, not take it on faith.

## Problem Statement

The specs from #7 make the design system *documented* but not *consumable*: there is no single machine artifact an agent could be prompted with, no runtime that turns a declarative composition into real components (and refuses anything else), and no event contract connecting agent actions to the UI. Tickets #13 (agentic-UI study) and #14 (pack viewer's vocabulary links) are blocked on these existing.

## Solution Statement

Mirror the generator family exactly: `gen-vocabulary.mjs` follows `gen-handoff.mjs` (module-resolved paths, `parseComponentSpec` from `lib.mjs`, result-object return, `pathToFileURL` standalone guard, `✓` registration in `build.mjs`) but is simpler — it only projects spec heads + Usage prose + inlined DataContracts into one name-keyed JSON. The renderer follows `derive.mjs`'s shipped-module discipline: DOM-free at top level (so #13's build-time composition runs can validate in Node), boundary validation throwing path-naming plain Errors, hand-written header citing the governing doc. Six hand-written templates (one per spec) are the canonical DOM realization of the specs' Data binding + Accessibility prose. The bus is a tiny `createBus()` over a handler map with a namespaced action contract (`ui.*` / `agent.*`) documented in its header. The harness page follows `derive.html` (three CSS layers, raw driver, noindex) and `scenarios/check.html` (esc helper, fictionalNotice card).

## Out of Scope / Non-Goals

- **Not building the `vd-*` component CSS or flipping spec `status`** — that's #8 (`.claude/plans/handoff-data-layer.md` Out of Scope pins the same boundary from the other side). See Open Questions: #8 has not landed at planning time; the harness states this honestly via a capability indicator instead of pretending.
- **Not the agentic-UI study page, ask → propose → adjust, proposal sets, or build-time composition runs** — #13 (consumes vocabulary + renderer + bus).
- **Not the handoff-pack viewer or vocabulary-entry linking** — #14. Do NOT touch `agent-layer/gen-handoff.mjs` or `pack.json`'s shape; the vocabulary is a sibling file in the pack directory.
- **No voice layer** — post-MVP, strong-case bar (architecture line 57). The bus contract reserves the `"voice"` source; nothing more.
- **No A2UI / AG-UI protocol citations in these modules** — per-ticket context is explicit: protocol-lineage citations belong on the study page (#13), not in this module.
- **No third-party agent-UI runtime, no framework, no schema library (no ajv)** — PRD §8 non-goals + project types rule: validate by hand at the boundary and throw.
- **No new ComponentSpecs and no spec-format changes** — the six specs from #7 are the library; a format change would be a #7-family change with both parsers kept in sync (`.claude/references/kb-format.md`).
- **Not touching `system/components.css`, tokens, or any existing shipped page** — the harness page is new and noindexed.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (generator is mechanical; variance is in template fidelity to spec prose and in pinning clean composition semantics)
**Primary Systems Affected**: `agent-layer/` (new generator + build registration) · `system/` (two new hand-written ES modules) · `handoff/verdant/` (one new generated, committed artifact) · new root harness page · `CLAUDE.md` (architecture map)
**Dependencies**: none — Node built-ins and browser platform APIs only (hard constraint: shipped pages vanilla, zero runtime deps)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/11 (`Closes #11`)   ·   **Epic**: https://github.com/linardsb/ux-factory/issues/1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Agentic UI lines 51–57 — vocabulary/renderer/bus definitions · line 23 two-exhibits framing · §Data model line 39 — spec head is what the vocabulary generator reads · PRD §8 non-goals — inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/handoff-data-layer.md` (#7, on `feature/handoff-data-layer`) — Why: created `parseComponentSpec`, the six specs, and the pack this vocabulary joins; its head schema was explicitly designed to carry "exactly what the vocabulary generator needs" (its CONTEXT notes architecture line 79).
- `.claude/plans/live-derivation-engine.md` (#3) — Why: the shipped-ES-module precedent (`system/derive.mjs`: DOM-free top level, Node + browser dual-run, boundary throws) and the root harness-page precedent (`derive.html`).

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #13 (agentic-UI study) — prompts an agent with `vocabulary.json`, validates compositions in Node via `validateComposition`, renders proposals through this renderer, runs ask → propose → adjust over this bus.
- #14 (pack viewer) — links vocabulary entries in place beside each spec (architecture line 39 UI-surface decision).
- #8 (Verdant screen) — ships the `vd-*` CSS these templates emit classes for, and flips spec `status` → `"shipped"`; regenerate the vocabulary when it does. #8's hand-crafted screen DOM should match these templates (they are the canonical realization of the specs' Data binding prose) — coordinate.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `agent-layer/gen-handoff.mjs` (all 65 lines) — Why: THE generator pattern to mirror: module-resolved paths lines 14–17 (never cwd — `build.mjs` runs from the jobs folder), spec loop + children cross-check 19–28, `$description`-led artifact object 44–55, result-object return 57, `pathToFileURL` standalone guard 60–65 (repo path contains a space; naive `file://${argv[1]}` never matches). gen-vocabulary is this file minus Style Dictionary and minus the copy steps.
- `agent-layer/lib.mjs` (lines 60–117 `parseComponentSpec`) — Why: the parser you call — returns `{ head, sections, path }`; head is already validated (props shape 81–84, tokens 85–86, children 88, contract existence + JSON-Schema-ness 89–100), sections are `{ title, body }` with the four required titles enforced 111–114. Do not re-validate what it already throws on.
- `agent-layer/build.mjs` (lines 15–18 jobs-folder cwd + lines 31–32) — Why: registration pattern — import, call, aligned `✓` log line. Register gen-vocabulary directly after `genHandoff` (the vocabulary joins the pack directory the handoff step just populated).
- `system/specs/*.md` + `*.contract.json` (all six specs, full prose) — Why: the library; the **Template DOM contracts below were derived from this prose** — re-verify against it before implementing. Load-bearing details: status-chip's Data binding — "when composed inside plant-card or care-task-row, the parent **derives** the record from its own `status` field (value → canonical label, e.g. `"due"` → `"DUE"`)" — plus its custom-label sample `{ "value": "overdue", "label": "3 DAYS OVERDUE" }` (the reason explicit chip children exist at all); care-task-row is a `<button role="checkbox">` with accessible name = action + plant + status; stat-tile's screen-reader text order is label → value → unit; screen-header's empty-slot rule (title never shifts when affordances toggle); primary-button uses the native `disabled` attribute. Note: contract-only fields (`id`, `plantId`, `lastWatered`, `due`) are NOT props — a composition cannot carry them, so `data-plant-id`/`data-task-id` only appear when #8 binds records; templates render from props alone.
- `system/proto.css` (lines 23–66 `.ot-topbar`, 303–333 `.ot-appbar`) — Why: the sub-element class convention #8's CSS will expect: prefixed class on the ROOT only (`vd-plant-card`), short unprefixed child classes styled via descendant selectors (`.ot-topbar .back`, `.ot-topbar .title`, `.ot-appbar .t`). The Template DOM contracts follow it; don't invent BEM.
- `.claude/references/kb-format.md` (§ComponentSpec + DataContract, lines 13–29) — Why: head schema v1 field-by-field; line 15 already names this ticket: "the vocabulary generator (#11) reads heads". `status: "spec"` until #8 flips it — an honesty surface the vocabulary must carry through.
- `system/derive.mjs` (lines 1–40) — Why: the shipped-module discipline to mirror: header citing governing doc + ticket, DOM-free so "the same module runs under Node … and in the browser", boundary `validate()` throwing plain Errors that name the offending input and enumerate the allowed values — copy that error voice for composition refusals.
- `system/scenario-data.mjs` (lines 1–13) — Why: the other hand-written `system/` module from this epic; its header shows the honesty-contract annotation style (`source` is "load-bearing for the capability indicators") — the bus header documents its contract in the same register.
- `derive.html` (lines 1–50) — Why: the root harness-page pattern: noindex, three CSS layers (contract → neutral pack → components), a comment stating what's being driven raw and where the designed surface lives (here: the study page, #13), harness-only chrome in a `<style>` block, everything else drawn by the system from tokens.
- `scenarios/check.html` (lines 41–104) — Why: the module-script page pattern: `esc()` helper lines 44–46 (reuse verbatim for the action log — bus params are agent-supplied strings), fictionalNotice card 67–75 (the honesty label the harness reproduces), results-table rendering.
- `handoff/verdant/pack.json` (top: `$description`/`scenario`/`generatedFrom` keys) — Why: the artifact-envelope convention `vocabulary.json` follows; note pack `components` is an **array** — the vocabulary deliberately differs (name-keyed object) because renderer lookup is its primary consumer.
- `scenarios/verdant/copy.json` (`fictionalNotice`) — Why: the harness page's honesty label text — fetch it, don't restate it.
- `docs/epics/ai-first-ux-factory.architecture.md` (lines 23, 39, 51–57, 66, 86–88) — Why: the inherited decisions this plan implements; lines 86–88 describe #13's composition-run experiment — the reason `validateComposition` must be callable from Node.
- `CLAUDE.md` (§Architecture map, §Where new code goes, §Ground rules) — Why: "View-time behaviour on shipped pages → a hand-written ES module beside `system/site.js`" is exactly what the renderer and bus are; error convention; honesty contract; deploy-=-commit rule (the generated vocabulary is committed, never gitignored).

### New Files to Create

- `agent-layer/gen-vocabulary.mjs` — the vocabulary generator (exports `genVocabulary()`)
- `handoff/verdant/vocabulary.json` — GENERATED, COMMITTED artifact (the pack's agent-ready layer)
- `system/action-bus.mjs` — the action bus (exports `createBus()`); header comment IS the documented bus contract (AC #4)
- `system/agentic-renderer.mjs` — the declarative renderer (exports `validateComposition()`, `renderComposition()`)
- `agentic.html` — bare harness page at repo root (composition render + refusal gallery + action log)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

No external libraries are involved (vanilla hard constraint), so external docs are thin by design:

- [MDN — `Element.setAttribute` / `Node.textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innerhtml)
  - Specific section: differences from innerHTML
  - Why: the injection-safety argument the renderer makes by construction — never assemble HTML strings from props
- [MDN — `UIEvent.detail`](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
  - Why: `click` with `detail === 0` is a keyboard-activated click on native controls (Enter on links/buttons, Space on checkboxes) — the whole keyboard-modality detection, no extra listeners
- A2UI / AG-UI — deliberately NOT read into this module (per-ticket context: lineage citations belong on the study page, #13)

### Patterns to Follow

**Generator shape** (`gen-handoff.mjs:14–17, 60–65`):

```js
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// ...
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = genVocabulary();
  console.log(`vocabulary      ✓  ${r.components} components (handoff/verdant/vocabulary.json)`);
}
```

**Error handling** (`derive.mjs:22–40`, project convention): plain `Error`, message names the offending path and enumerates what was allowed:

```js
throw new Error(`${path}: unknown component "${node.name}" (vocabulary: ${Object.keys(vocab.components).join(" | ")})`);
throw new Error(`${path}.props.status: "wet" is not in enum [ok | due | overdue]`);
```

**Composition path notation**: `composition`, `composition[2]`, `composition[2].children[0]` — built up as validation recurses, so every refusal is locatable.

**File headers** (`scenario-data.mjs:1–13`, `derive.mjs:1–13`): what/why + governing doc + ticket, e.g. `// system/action-bus.mjs — hand-written canon (this repo; not generated). … (epic #1, ticket #11; architecture §Agentic UI).`

**Harness page framing** (`derive.html:12–21`): three CSS layers, a comment naming the designed surface this harness is NOT (`the designed surface for this bridge is the agentic-UI study page (ticket #13)`), `meta robots noindex`.

### Template DOM contracts (pinned — derived from the six specs' Data binding + Accessibility prose)

Conventions for all six: root element carries exactly the spec head's `class`; sub-elements use short unprefixed classes styled by descendant selector (proto.css precedent); glyphs are minimal inline SVGs, always `aria-hidden="true"`, placeholder-grade (#8 may refine paths, not structure); data-driven state rides `data-*` / native attributes (`aria-checked`, `disabled`) — never state classes; all text set via `textContent`.

**Chip rule (plant-card + care-task-row):** the template ALWAYS renders exactly one status-chip in its trailing slot — **derived** from its own `status` prop (canonical label = `value.toUpperCase()`, per status-chip's Data binding prose) when no child is given; an **explicit `status-chip` child replaces the derived one** (the custom-label case, e.g. "3 DAYS OVERDUE"). An explicit chip whose `value` ≠ the parent's `status` is **refused** at validation ("one signal per card" — competing states mean the composition is wrong). More than one child: refused.

```html
<!-- status-chip · variant as additional class (spec: "variant class on the pill") -->
<span class="vd-status-chip due">DUE</span>

<!-- plant-card · single <a>; aria-label = name + chip label lowercased ("Monstera, due");
     href="#" + preventDefault in composition mode (#8 wires real navigation) -->
<a class="vd-plant-card" href="#" data-status="due" aria-label="Monstera, due">
  <span class="thumb"><img src="…" alt=""></span>      <!-- or, no photoUrl: -->
  <span class="thumb monogram">M</span>                 <!-- first letter of name -->
  <span class="id">
    <span class="name">Monstera</span>
    <span class="species">Monstera deliciosa</span>     <!-- element omitted entirely when absent -->
  </span>
  <span class="chip" aria-hidden="true"><!-- status-chip --></span>
</a>

<!-- care-task-row · label = capitalised action + plantName; aria-label adds the status -->
<button type="button" role="checkbox" aria-checked="false" class="vd-care-task-row"
        data-status="due" aria-label="Water Monstera, due">
  <span class="check" aria-hidden="true"></span>
  <span class="label">Water Monstera</span>
  <span class="chip" aria-hidden="true"><!-- status-chip --></span>
</button>

<!-- stat-tile · DOM order label → value → unit (screen-reader order per spec; CSS reorders visually) -->
<div class="vd-stat-tile">
  <span class="glyph" aria-hidden="true"><svg>…droplet | sun…</svg></span>
  <p class="reading"><span class="label">Moisture</span> <span class="value">34</span><span class="unit">%</span></p>
</div>

<!-- primary-button -->
<button type="button" class="vd-primary-button" disabled?>Log care</button>

<!-- screen-header · lead/trail spans ALWAYS present (empty-slot rule: title never shifts);
     `scrolled` state = a data-scrolled attribute contract for the composing surface — the
     renderer attaches NO scroll listener (spec: the header "owns no state beyond scroll elevation") -->
<header class="vd-screen-header">
  <span class="lead"><button type="button" class="back" aria-label="Back"><svg aria-hidden="true">…</svg></button></span>
  <h1 class="title">Today</h1>
  <span class="trail"><button type="button" class="settings" aria-label="Settings"><svg aria-hidden="true">…</svg></button></span>
</header>
```

### Bus emissions (pinned — every interactive template, AC #4)

All emitted with `type: "ui.intent"`, `source: e.detail === 0 ? "keyboard" : "pointer"`, `target: { component: "<name>" }`:

| Component | Trigger | `params` |
| --- | --- | --- |
| plant-card | click/Enter on the `<a>` (preventDefault) | `{ intent: "open", name }` |
| care-task-row | click/Space on the row — template flips its own `aria-checked` first | `{ intent: "toggle", checked: <new value>, action, plantName }` |
| primary-button | click/Enter (native `disabled` suppresses for free) | `{ intent: "commit", label }` |
| screen-header | `.back` click | `{ intent: "back" }` |
| screen-header | `.settings` click | `{ intent: "settings" }` |

status-chip and stat-tile emit nothing (specs: never interactive).

---

## IMPLEMENTATION PLAN

### Phase 1: Vocabulary generator

The machine artifact everything else consumes. Emits `handoff/verdant/vocabulary.json` from the six committed specs; registered in `build.mjs`.

**Tasks:**

- `gen-vocabulary.mjs` reading specs via `parseComponentSpec`, projecting heads + Usage prose + inlined DataContracts
- Register in `build.mjs`; run standalone; commit the artifact

### Phase 2: Action bus

**Independent of:** Phase 1 (pure event plumbing; no vocabulary needed) — parallel candidate.

**Tasks:**

- `createBus()` with emit-time action validation; the header comment documenting the full contract (AC #4's "documented" clause)

### Phase 3: Declarative renderer

**Depends on:** Phase 1 (validates against the vocabulary shape) and Phase 2 (templates emit onto the bus).

**Tasks:**

- `validateComposition()` — pure, DOM-free, recursive, path-naming refusals
- Six templates realizing the specs' Data binding + Accessibility prose
- `renderComposition()` — validate, then build DOM, wiring interactions to the bus

### Phase 4: Harness page + validation

**Depends on:** Phases 1–3.

**Tasks:**

- `agentic.html`: honest capability strip, rendered composition, refusal gallery, bidirectional action log
- Full validation ladder (below)

### Phase 5: Docs

- `CLAUDE.md` architecture-map lines for the three new modules + artifact

---

## STEP-BY-STEP TASKS

### VERIFY branch base (pre-flight — do this before any code)

- **IMPLEMENT**: #7 is committed as `d656f05` on `feature/handoff-data-layer` ("Closes #7") but NOT on `main` at planning time; the then-current branch (`feature/scenario-packages-worker-mock-api`) held only untracked working-tree copies of `system/specs/`, `handoff/`, `gen-handoff.mjs`. #11's branch MUST be cut from a base that contains `d656f05` — after #7's PR merges to main (preferred), or from `feature/handoff-data-layer` directly (note the PR dependency in #11's PR body if so). Also check whether #8 has landed by now: `grep -c "vd-" system/components.css` — nonzero means the harness's pending-CSS capability line will (correctly) not appear.
- **VALIDATE**: `git merge-base --is-ancestor d656f05 HEAD && echo BASE-OK` · `node agent-layer/gen-handoff.mjs` prints its `✓` (proves specs + parser are really present on this base)
- **SATISFIES**: sane foundation for all ACs

### CREATE agent-layer/gen-vocabulary.mjs

- **IMPLEMENT**: `export function genVocabulary()`. Read `system/specs/*.md` (sorted, same as `gen-handoff.mjs:20`), parse via `parseComponentSpec`. Emit `handoff/verdant/vocabulary.json`:
  ```
  {
    "$description": "Verdant component vocabulary — the design system made consumable by agents: component names, prop schemas, composition rules, usage guidance, and each component's DataContract inlined. Verdant is a fictional demo scenario. Generated by agent-layer/gen-vocabulary.mjs from system/specs/ — do not edit.",
    "scenario": "verdant",
    "generatedFrom": "system/specs",
    "composition": {
      "shape": "a composition is one node or an array of nodes; a node is {name, props, children?}",
      "childrenRule": "a node may carry at most one child, only when its vocabulary entry lists allowed children, and the child's name must be in that list",
      "chipRule": "plant-card and care-task-row always render one status-chip derived from their own status prop; supply an explicit status-chip child only to override its label, and its value must equal the parent's status"
    },
    "components": { "<name>": { "class", "status", "props", "states", "children", "usage", "contract" } }
  }
  ```
  Per component: `class`/`status`/`props`/`states`/`children` verbatim from the head; `usage` = the `## Usage` section body (`sections.find(s => s.title === "Usage").body`); `contract` = the sibling `.contract.json` **parsed and inlined** (agents need the data shape in the one file), or `null`. Return `{ components: <count>, dest }` for the `✓` line. Expected entry, exactly (diff your output against this):
  ```json
  "status-chip": {
    "class": "vd-status-chip",
    "status": "spec",
    "props": {
      "value": { "type": "string", "required": true, "enum": ["ok", "due", "overdue"], "description": "categorical care state — selects the visual variant" },
      "label": { "type": "string", "required": true, "description": "visible chip text, uppercase, one or two words — the state must read without colour" }
    },
    "states": ["ok", "due", "overdue"],
    "children": [],
    "usage": "Component of the Verdant demo scenario (fictional product). The one categorical state signal of the system: a small pill naming a plant's care state. Always a child — of a plant-card or a care-task-row, trailing edge — never free-standing, never a tap target. One chip per parent (the parent summarises one state); if two states compete, the parent's data is wrong, not the chip.",
    "contract": { …status-chip.contract.json inlined verbatim… }
  }
  ```
- **PATTERN**: `agent-layer/gen-handoff.mjs` — module-resolved `ROOT`/`SPECS`/`DEST` (lines 14–16), `$description` envelope (44–48), `writeFileSync(... JSON.stringify(pack, null, 2) + "\n")` (55), standalone guard (60–65). Header comment cites epic #1 ticket #11 + architecture §Agentic UI.
- **IMPORTS**: `node:fs` (readdirSync, readFileSync, writeFileSync, mkdirSync), `node:path`, `node:url`, `parseComponentSpec` from `./lib.mjs`.
- **GOTCHA**: No Style Dictionary call, no contract copying — `gen-handoff` owns those. `mkdirSync(DEST, { recursive: true })` so the standalone run works on a fresh clone even before gen-handoff has run. Do not re-validate heads — `parseComponentSpec` already throws with good messages.
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs` → prints `vocabulary      ✓  6 components (handoff/verdant/vocabulary.json)`; then `node --input-type=module -e "import('node:fs').then(({readFileSync})=>{const v=JSON.parse(readFileSync('handoff/verdant/vocabulary.json','utf8'));console.log(Object.keys(v.components).length===6&&v.components['plant-card'].contract.title==='Plant'&&v.components['plant-card'].children[0]==='status-chip'?'OK':'FAIL')})"`
- **SATISFIES**: AC #1

### UPDATE agent-layer/build.mjs

- **IMPLEMENT**: Import `genVocabulary`; call directly after the `genHandoff` block (after line 32) with an aligned log line: `console.log(\`  vocabulary      ✓  ${v.components} components (handoff/verdant/vocabulary.json)\`);`
- **PATTERN**: `build.mjs:31–32` — two lines, matching column alignment of the other `✓` lines.
- **VALIDATE**: `cd "/Users/Berzins/Desktop/Linards_current/Linards jobs folder" && node "/Users/Berzins/Desktop/Linards_current/ux-factory/agent-layer/build.mjs" _factory/kb/decisions/trainline.md` → all `✓` lines including `vocabulary`. (Requires `cd tooling/style-dictionary && npm install` once — gen-handoff runs SD; that's pre-existing behavior, not this ticket's.)
- **SATISFIES**: AC #1

### CREATE system/action-bus.mjs

- **IMPLEMENT**: `export function createBus()` → `{ emit(action), on(type, handler) }` where `on` returns an unsubscribe function and accepts an exact type or `"*"` (the log panel's subscription). Handler storage: a `Map<string, Set<fn>>`. `emit` validates at the boundary and throws naming the field:
  - `type`: string matching `/^(ui|agent)\.[a-z][a-z-]*$/` — the namespace IS the direction: `ui.*` = UI→agent (user did something), `agent.*` = agent→UI (agent commands the surface).
  - `source`: one of `"pointer" | "keyboard" | "agent" | "voice"` — provenance/modality, orthogonal to direction. `"voice"` is reserved-but-unused (post-MVP, strong-case bar).
  - `target` (optional): `{ component, id? }` — which rendered thing.
  - `params` (optional): plain object, agent/user payload.
  Dispatch to exact-type handlers then `"*"` handlers; a throwing handler must not break the others (try/catch per handler, rethrow-free, `console.error`).
  **The header comment is the documented bus contract (AC #4)**: action shape, namespace semantics, source values with the voice reservation + architecture line 57 citation, and the interchangeability claim — a voice layer would emit existing `ui.*` types with `source: "voice"`; no new integration surface.
- **PATTERN**: `system/scenario-data.mjs:1–13` header register (what/why + honesty note + ticket citation); `derive.mjs` boundary-throw voice.
- **IMPORTS**: none — pure vanilla.
- **GOTCHA**: DOM-free entirely (no `CustomEvent`/`EventTarget` — a plain Map works in Node too, and #13's build-time runs may drive it). Keep it small: no once(), no priority, no async — YAGNI.
- **VALIDATE**: `node --input-type=module -e "import('./system/action-bus.mjs').then(({createBus})=>{const b=createBus();let n=0;b.on('ui.intent',()=>n++);b.on('*',()=>n++);b.emit({type:'ui.intent',source:'pointer'});try{b.emit({type:'bad',source:'pointer'});console.log('FAIL')}catch(e){console.log(n===2?'OK: '+e.message:'FAIL')}})"`
- **SATISFIES**: AC #4

### CREATE system/agentic-renderer.mjs

- **IMPLEMENT**: Two exports + a private template registry.
  - `export function validateComposition(vocab, composition, path = "composition")` — **pure, DOM-free** (this is what #13 calls under Node for build-time composition runs, architecture lines 86–88). Accepts one node or an array. Per node, refuse with a thrown Error when: `name` is not in `vocab.components`; a prop key is not in the entry's `props`; a required prop is missing; a prop value's `typeof` doesn't match the declared `type` (`string`/`number`/`boolean` — all that head schema v1 uses); a value is outside a declared `enum`; `children` is present but the entry's `children` list is empty; a child's `name` is not in the allowed list; more than one child; an explicit `status-chip` child whose `value` ≠ the parent's `status` prop (competing states — cite the one-signal rule in the message). Recurse with extended paths (`composition[1].children[0]`).
  - `const TEMPLATES = { "plant-card": (props, kids, bus) => Element, ... }` — six functions implementing the **Template DOM contracts pinned above** (re-verify each against its spec's prose while writing it). Chip rule as pinned: derived from `status` (`value.toUpperCase()` as label) unless an explicit child overrides.
  - `export function renderComposition(vocab, composition, bus)` — calls `validateComposition` first (refusal before any DOM), also refuses a vocabulary entry with no template (`${path}: "x" is in the vocabulary but this renderer has no template for it — renderer and vocabulary have drifted`), returns a `DocumentFragment` (array) or `Element` (single node). Wires interactions exactly per the **Bus emissions table** above, with `source: e.detail === 0 ? "keyboard" : "pointer"`.
- **PATTERN**: `derive.mjs:1–13` (header: hand-written canon, DOM-free-at-top-level note, Node+browser dual-run, ticket citation), `derive.mjs:22–40` (validation voice — enumerate allowed values in the message).
- **IMPORTS**: none. `document` is referenced **only inside** template/render function bodies — top-level import must succeed in Node.
- **GOTCHA**: (1) All text via `textContent`/`createElement` — never innerHTML from props; that's the no-raw-HTML non-goal enforced by construction, say so in the header. (2) `photoUrl`: set via `setAttribute("src", …)` and refuse values whose protocol isn't relative/https (one-line check; the contract says site-relative) — an `<img src>` is still an injection surface for `javascript:`. (3) Chip children follow the pinned chip rule (derived by default, explicit child overrides the label, mismatch refused) — see NOTES for why this reading of the specs. (4) Native elements only (`a`, `button role=checkbox`) so keyboard works for free and `detail===0` detection holds. (5) Match `derive.mjs` refusal voice exactly — these messages are reader-facing on the harness page.
- **VALIDATE**: refusal battery under Node (no DOM needed):
  `node --input-type=module -e "import('node:fs/promises').then(async({readFile})=>{const{validateComposition}=await import('./system/agentic-renderer.mjs');const v=JSON.parse(await readFile('handoff/verdant/vocabulary.json','utf8'));const t=(c)=>{try{validateComposition(v,c);return 'ACCEPTED'}catch(e){return 'refused: '+e.message}};console.log(t({name:'hero-banner',props:{}}));console.log(t({name:'status-chip',props:{value:'wet',label:'Wet'}}));console.log(t({name:'primary-button',props:{label:'Log care',variant:'ghost'}}));console.log(t({name:'plant-card',props:{name:'Monstera',status:'due'},children:[{name:'primary-button',props:{label:'x'}}]}));console.log(t({name:'plant-card',props:{name:'Monstera',status:'ok'},children:[{name:'status-chip',props:{value:'overdue',label:'OVERDUE'}}]}));console.log(t({name:'plant-card',props:{name:'Monstera',status:'due'},children:[{name:'status-chip',props:{value:'due',label:'DUE TODAY'}}]}))})"` → five `refused:` lines each naming path + violation (unknown component · enum · out-of-vocabulary prop · disallowed child · competing states), one `ACCEPTED`.
- **SATISFIES**: AC #2, AC #3 (render half), AC #4 (interactions ride the bus)

### CREATE agentic.html

- **IMPLEMENT**: Bare harness at repo root, `noindex`, loading `/system/tokens.contract.css` + `/system/tokens.neutral.css` + `/system/components.css`, harness-only chrome in a `<style>` block. One module script:
  1. Fetch `/handoff/verdant/vocabulary.json` + `/scenarios/verdant/copy.json`; `createBus()`.
  2. **Honesty strip**: the `fictionalNotice` card (pattern `check.html:67–75`) + a capability indicator built FROM the vocabulary: what runs live (in-browser validation, rendering, bus) and — if any component `status === "spec"` — the line "component CSS ships with ticket #8; until then compositions render as real DOM bound to real tokens, unstyled" (derived from data, disappears on its own when #8 regenerates the vocabulary).
  3. **Composition panel**: THE hand-authored composition (verbatim — it exercises both chip modes, an optional prop, and every interactive component):
     ```json
     [
       { "name": "screen-header", "props": { "title": "Today", "showSettings": true } },
       { "name": "stat-tile", "props": { "kind": "moisture", "value": 34, "unit": "%", "label": "Moisture" } },
       { "name": "stat-tile", "props": { "kind": "light", "value": 820, "unit": "lx", "label": "Light" } },
       { "name": "plant-card", "props": { "name": "Monstera", "species": "Monstera deliciosa", "status": "overdue" },
         "children": [ { "name": "status-chip", "props": { "value": "overdue", "label": "3 DAYS OVERDUE" } } ] },
       { "name": "care-task-row", "props": { "action": "water", "plantName": "Monstera", "status": "overdue" } },
       { "name": "care-task-row", "props": { "action": "mist", "plantName": "Calathea", "status": "due", "checked": false } },
       { "name": "primary-button", "props": { "label": "Log care" } }
     ]
     ```
     Rendered via `renderComposition` into a mount; the literal JSON shown beside it in a `<pre class="dump">` (pattern: derive.html) so the reader sees declarative-in → components-out. Keep the composition as a page-level `let composition = […]` — the agent commands below mutate it and re-render (declarative round trip, no DOM poking).
  4. **Refusal gallery**: the same invalid compositions as the Node battery, auto-run on load, each row showing the composition + the thrown message (the managed-freedom demonstration; `esc()` helper from `check.html:44–46`).
  5. **Action log + agent controls**: `bus.on("*", …)` appends type/source/target/params rows. Two agent buttons: "agent: check all rows" → emits `{type:"agent.set-checked", source:"agent", params:{checked:true}}`; "agent: swap composition" → emits `{type:"agent.render", source:"agent", params:{composition:<an alternate valid composition>}}`. The page subscribes to `agent.*` and handles both **declaratively**: `set-checked` maps over `composition` flipping `checked` on every care-task-row then re-renders; `render` replaces `composition` (through `validateComposition` — an invalid agent proposal lands in the refusal gallery, not on the page). The renderer stays passive; the composing page owns what commands mean (same philosophy as primary-button's spec: "the composing screen owns what commit means"). Interacting by mouse vs Tab+Enter shows `pointer` vs `keyboard` sources on otherwise identical actions — the interchangeability claim, demonstrated.
- **PATTERN**: `derive.html:12–21` (framing comment naming #13 as the designed surface), `scenarios/check.html:41–104` (script shape).
- **GOTCHA**: Page must render the static parts even if `fetch` of the vocabulary fails (serve error message, pattern `check.html:101–103`). No chrome injection (`site.js`) — bare harness like derive.html.
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/agentic.html`: composition renders; refusal gallery shows every case refused with a path-naming message; clicking a row logs `ui.* / pointer`; Tab+Enter logs `ui.* / keyboard`; agent buttons mutate the rendered UI and log `agent.* / agent`.
- **SATISFIES**: AC #2 (demonstrated), AC #3, AC #4

### UPDATE CLAUDE.md

- **IMPLEMENT**: Architecture-map additions only: extend the `system/` block with one line for `agentic-renderer.mjs` + `action-bus.mjs` (declarative agentic bridge: vocabulary-validated `{name,props,children}` rendering + one bidirectional action contract; harness `/agentic.html`; epic #1 ticket #11), and note `vocabulary.json` in the `handoff/` line (`regenerate: node agent-layer/gen-vocabulary.mjs`).
- **PATTERN**: existing one-line-per-file map entries (e.g. the `derive.mjs` line).
- **GOTCHA**: Surgical — no new sections; `.claude/references/kb-format.md` line 15 already describes #11 correctly and needs no edit.
- **VALIDATE**: `git diff CLAUDE.md` — only the two map touches.
- **SATISFIES**: house convention (rules stay true to the codebase)

### RUN full validation ladder + commit artifact

- **IMPLEMENT**: Execute VALIDATION COMMANDS below; `git add` must include `handoff/verdant/vocabulary.json` (deploy = commit the artifacts — never gitignore generated outputs).
- **VALIDATE**: all levels green.
- **SATISFIES**: all ACs

---

## TESTING STRATEGY

No test suite, no linter in this repo (ground rule — don't invent one). "Done" = run the surface you touched:

### Unit-level (Node, scriptable)

- Generator: standalone run prints `✓ 6 components`; artifact spot-checks (count, inlined contract, children).
- Bus: emit/on round-trip + malformed-action throw (command in tasks).
- Renderer: the six-case battery (five refusals + one accepted) — this is AC #2's evidence and must be run verbatim.

### Integration

- Full `build.mjs` run from the jobs folder — proves registration and that gen-vocabulary coexists with the other generators.
- `agentic.html` under `npx serve .` — proves the browser path end to end (fetch → validate → render → bus both directions).

### Edge Cases

- Composition as a single node AND as an array (both valid roots).
- `children` on a component whose vocabulary entry lists none (e.g. under primary-button) → refused.
- Two children under one plant-card → refused (at-most-one rule).
- Explicit chip child whose `value` ≠ parent `status` → refused (competing states).
- Allowed child but malformed child props (chip with `value: "wet"`) → refused at the child's path.
- care-task-row with no explicit chip → derived chip renders ("due" → "DUE").
- Optional props omitted entirely (plant-card without `species`/`photoUrl` → compacted card, monogram).
- `photoUrl: "javascript:alert(1)"` → refused at template level.
- Unknown `source` / non-namespaced `type` on `bus.emit` → thrown.
- Vocabulary fetch failure on the harness page → visible error, no blank page.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check agent-layer/gen-vocabulary.mjs && node --check system/agentic-renderer.mjs && node --check system/action-bus.mjs && echo SYNTAX-OK
```

### Level 2: Unit (Node)

```bash
node agent-layer/gen-vocabulary.mjs
# then the bus round-trip command and the renderer refusal battery from the tasks above, verbatim
```

### Level 3: Integration

```bash
cd "/Users/Berzins/Desktop/Linards_current/Linards jobs folder" && node "/Users/Berzins/Desktop/Linards_current/ux-factory/agent-layer/build.mjs" _factory/kb/decisions/trainline.md
```

### Level 4: Manual (browser)

```bash
npx serve .   # → http://localhost:3000/agentic.html
```

Checklist: honesty strip (fictional + capability lines) · composition rendered with `vd-*` classes in the DOM (inspect) · refusal gallery all refused with path-naming messages · pointer vs keyboard sources distinguishable in the log · both agent buttons visibly mutate the UI and log `agent.*`.

### Level 5: Additional (optional)

agent-browser (skill available): screenshot `/agentic.html`, assert the refusal gallery contains "unknown component" and the log records both `ui.` and `agent.` rows after scripted clicks.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — `agent-layer/gen-vocabulary.mjs` emits the vocabulary from committed specs; registered in `build.mjs` with a `✓` line; `handoff/verdant/vocabulary.json` committed.
- [ ] AC #2 — Renderer refuses unknown component names / out-of-vocabulary props (+ missing-required, type, enum, disallowed child, more-than-one child, competing states); refusals demonstrated both in the Node battery and visibly in the harness refusal gallery.
- [ ] AC #3 — A hand-authored `{name, props, children}` composition renders correctly on the bare harness page using real components + tokens (see Open Question 1 on visual completeness pre-#8; DOM, classes, tokens, a11y structure are fully verifiable now).
- [ ] AC #4 — Every renderer interaction rides the action bus; the bus contract is documented (module header) and voice-ready by design (`"voice"` source reserved, no voice code).
- [ ] Honesty contract: fictional label on the harness; capability indicator states exactly what runs vs. what's pending #8.
- [ ] No new dependencies; shipped modules vanilla; generated artifact committed; conventions matched (headers, error voice, `✓` alignment).
- [ ] No regressions: full `build.mjs` run green; `derive.html` and `scenarios/check.html` still load.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each task's VALIDATE run immediately
- [ ] Refusal battery output pasted into the PR/report (it IS the managed-freedom evidence)
- [ ] `vocabulary.json` committed alongside the code that generates it
- [ ] `CLAUDE.md` map updated, surgical
- [ ] Manual browser checklist all green
- [ ] Plan's Open Questions revisited — resolutions recorded under AMENDMENTS

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **#8 has not landed — the `vd-*` classes have no CSS yet** (grep of `system/components.css` finds none; specs carry `status: "spec"`; the epic's suggested order put #8/Wave 2 before #11/Wave 3, but #11's declared dependency is only #7). AC #3's "renders correctly using real components + tokens" is therefore satisfiable now at the DOM/class/token/a11y level, and at the visual level only once #8 ships its CSS. **Recommendation (assumed): proceed** — nothing in this ticket's own scope depends on the CSS; the harness's capability indicator states the gap honestly (and self-clears when #8 lands and the vocabulary regenerates); the harness needs zero changes at that point. If the user prefers full visual fidelity at demo time, sequence #8 first — the plan itself is unchanged either way. The pre-flight task re-checks this at execution time. Because the Template DOM contracts are pinned in this plan, #8's CSS has a stable DOM to target either way.
2. **Vocabulary location** — assumed `handoff/verdant/vocabulary.json`: the ticket says the one file "doubles as the handoff pack's agent-ready layer", and in-pack placement makes #14's linking and shipped-page fetching trivial. Rejected: `system/vocabulary.json` (generated files in `system/` are token CSS only) and folding it into `pack.json` (separate consumers, separate file; gen-handoff untouched).
3. ~~Children semantics~~ **RESOLVED during planning** — the chip rule (derived by default, explicit child overrides the label, mismatch refused) was read directly out of status-chip's Data binding prose + its custom-label sample record; no longer open. Reasoning in NOTES; #13 should still be planned against it (its agent supplies explicit chips only for custom labels).
4. **Bus contract documentation lives in the module header** — matches the project's file-header convention (no separate doc file, no spec record; specs are components). If a reader-facing surface for the contract is wanted later, that's #13's study page.

## NOTES (open canvas)

**The chip rule (resolved Open Question 3).** Three readings of `head.children` were weighed: (a) *intrinsic only* — the template always derives its chip from `status`, `children` merely documents containment (kills the third axis of `{name, props, children}`: AC #3 hand-authors children, and the disallowed-child refusal would have nothing real to refuse); (b) *explicit only* — the author must supply the chip (contradicts status-chip's own Data binding prose: "the parent derives the record from its own `status` field"); (c) **derived-with-override — chosen**, because the specs literally describe it: the parent derives the canonical chip (`"due"` → `"DUE"`) AND the chip's sample record `{ "value": "overdue", "label": "3 DAYS OVERDUE" }` shows a label richer than any derivation — the exact thing an explicit child is *for*. Under (c) every rule has teeth: membership (only status-chip may nest), cardinality (at most one — "one chip per parent" is head prose, enforced), and consistency (child `value` must equal parent `status` — "if two states compete, the parent's data is wrong" becomes a composition-time refusal instead of a rendered lie). Plant-card's `status` prop still drives card-level state (`data-status`, border escalation at overdue) regardless of which path produced the chip.

**Renderer stays passive on `agent.*`.** The renderer emits `ui.*` and renders; it does not subscribe to `agent.*`. The composing page interprets agent commands (re-render, set-checked). This mirrors the specs' own philosophy ("the composing screen owns what commit means") and keeps the renderer a pure vocabulary→DOM function — #13 can build ask→propose→adjust on top without fighting built-in behavior.

**Vocabulary inlines contracts.** The pack already ships contracts as separate files for `$ref` tooling; the vocabulary's job is different — ONE file an agent can be prompted with. Duplication between `pack.json` and `vocabulary.json` is fine: both are generated from the same source in the same build, so they cannot drift (that's the whole one-source argument of #7).

**Template ↔ #8 drift risk.** The templates become the canonical DOM realization of the specs. When #8 hand-crafts the Verdant screen, its markup should match (or better: #8 could consider *using* the renderer for the static screen — a decision for #8's plan, noted in Forward-references). If #8 diverges structurally, the CSS it writes may not fit the renderer's DOM — the coordination point is the specs' Data binding prose, which both implement.

**Rejected: runtime `fetch` inside the renderer.** `renderComposition(vocab, …)` takes the vocabulary as an argument rather than fetching it — keeps the module pure, Node-runnable (#13 build-time), and lets the caller own loading/caching (harness fetches once). Same signature philosophy as `derive(input)`.

**Line-count sanity vs ticket estimate (~700–1200):** generator ~90 · bus ~80 · renderer ~300 · harness ~300 · vocabulary artifact ~250 generated. In range.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->

### Execution (branch `feature/agentic-bridge`) — #8 had already landed (uncommitted)

At execution time #8 had largely landed: at HEAD (`4a3997b`) its `vd-*` CSS is **committed** in
`system/components.css` and the six spec heads are committed as `status: "spec"`; the working tree also
carried #8's uncommitted in-flight work (`proto/verdant.html`, specs mid-flip to `"shipped"`). Consequences
(full detail in `.claude/reports/agentic-bridge-report.md`):

- **Open Question 1 — RESOLVED.** CSS-present and spec `status` are decoupled at HEAD (CSS committed, specs
  `"spec"`). So: `vocabulary.json` emits `status: "spec"` — regenerated from the *committed* specs via a
  detached temp worktree, so it reproduces from committed source (the repo's hard rule). And the harness
  capability strip is keyed to **actual CSS presence** (`vdCssLoaded()` probes the loaded stylesheets for a
  `.vd-` rule), not the misleading spec status → honestly reports "fully styled" because #8's CSS is
  committed at HEAD, and self-corrects if the CSS is ever absent.
- **Prop names.** `care-task-row`'s prop is `type` (enum `water|fertilise|repot|inspect`), not `action`;
  fixed across templates, bus params, and the hand-authored composition. The composition's `"mist"`
  (not in the enum) → `"fertilise"`.
- **Templates realize #8's shipped DOM**, not the plan's pinned Template DOM contracts: prefixed child
  classes (`.vd-task-check`, `.vd-plant-name`, `.vd-stat-*`, …), `is-*` state/variant classes, stat-tile
  `label → reading` nesting, `aria-label = "${name}, ${status}"`, props-only (`href="#"` + preventDefault,
  no `id`/`data-*`). This is the coordination the Forward-references anticipated.
- **Ancestry.** `d656f05` is not an ancestor of HEAD, but the specs are present via `4a3997b` (green
  gen-handoff run); the pre-flight ancestry check was adapted.
- **Commit hygiene.** Stage only the seven #11 files by explicit path; the shared tree carries concurrent
  #8 / other-ticket changes that are not part of this ticket.
