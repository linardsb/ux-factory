# Feature: Studio 9 — the docs chain (`example` spec field · demo-notice's render path · the view-time join)

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

Three changes to the generation chain, sized to exactly what appica-grade component docs need and
nothing more:

1. **One new *optional* spec-head field: `example`** — a props object that is the live playground's
   starting state, authored beside the component it documents. Plus `min`/`max`/`step` on numeric
   props as the playground's control bounds. Both parse-validated; the `example` additionally
   **semantically** validated by running the shipped `validateComposition` against the generated
   vocabulary, so an example that would not render is a red build, not a broken playground discovered
   by a visitor.
2. **`demo-notice`'s missing render path.** It has a spec and a vocabulary entry, but no
   `components.css` block and no `agentic-renderer.mjs` template — *documented but not composable*.
   Fixing it here proves the full chain (spec → tokens → CSS block → renderer template → vocabulary →
   checks) works **before** #220 walks it ten more times, and lets `build-checks` group 3 stop
   carrying a written-down exception and start asserting the invariant over the whole vocabulary.
3. **The view-time join, pure and artifact-free.** `prepareHandoff`'s returned shape grows the join the
   catalog (#215) and the inspector (#218) need — pack × vocabulary × `system-graph` × wrapper presence
   × `example` — computed at view time. **No new generated artifact.** Token *values* stay out of every
   artifact; #215 resolves them live with `getComputedStyle`, the same rule `inspect.mjs` already obeys.

## User Story

As **the engineer who will build the component catalog (#215) and the studio inspector (#218)**
I want **each component's example, control bounds, token bindings, consumer block and wrapper presence
available from one pure join, and every vocabulary entry guaranteed to have a render path**
So that **the catalog can ship a live playground per component without hand-written docs, without a new
generated artifact, and without discovering at view time that a documented component cannot render.**

## Problem Statement

The docs chain generates specs, a handoff pack and an agent vocabulary — but it never presents them at
appica grade, and it cannot yet: (a) nothing in the repo records what a component's *live example* is,
so a playground would have to hand-write starting props (a `No hand-written docs` non-goal violation);
(b) the catalog needs four sources joined per component and there is no join; (c) `demo-notice` proves
the chain has a silent hole — a spec and a vocabulary entry can exist with no CSS block and no renderer
template, and `build-checks` group 3 currently *documents* that hole as intentional rather than closing
it. #220 is about to add ten components through this same chain.

## Solution Statement

- Extend the ComponentSpec head schema in `parseComponentSpec` (`agent-layer/lib.mjs`) with an optional
  `example` object and optional `min`/`max`/`step` on `type: "number"` props. Shape validation only.
- Add a **pure, exported** `validateExamples(specs, vocab)` in `agent-layer/gen-vocabulary.mjs` that runs
  the shipped `validateComposition` over each `{ name, props: example }` against the **fully built**
  vocabulary, throwing a plain `Error` naming the spec path. `genVocabulary()` calls it, so
  `tooling/drift-check.mjs` (CI `verify`) gets the gate for free.
- Author `example` on **all ten** specs (and `min`/`max`/`step` on the one numeric prop in the repo,
  `stat-tile.value`).
- Land `demo-notice`'s render path: a `components.css` block, an `agentic-renderer.mjs` template, and a
  spec `status: spec → shipped` flip **with its now-false `## States` / `## Accessibility` prose
  rewritten** (that prose ships verbatim in `pack.json`).
- Widen `build-checks` group 3 from "every name `compose()` emits has a template" to "**every
  vocabulary entry** has a template", and delete the exception paragraph the fix makes false.
- Add `build-checks` group 18 driving the two pure functions this ticket adds — `validateExamples` over
  synthetic specs **including a deliberately-broken one whose refusal must name the spec path** (AC #7's
  mutation, as a committed tripwire rather than an operator's one-time observation), and
  `prepareHandoff` over the **real committed** `pack.json` + `vocabulary.json` + `system-graph.json`
  with every count asserted against the files rather than typed.
- Extend `prepareHandoff(pack, vocab, graph = null)` — third arg optional, so `handoff.html`'s existing
  two-arg call keeps working byte-for-byte.

## Out of Scope / Non-Goals

- **Not included: the catalog page itself.** No `/components` page, no hash routing, no ⌘K commands, no
  copy-as-Markdown, no code tabs, no Figma link-out — that is **#215**, and it is the ticket that runs
  alone because it churns all 16 chrome-bearing baselines (footer index entry).
- **Not included: the inspector mount** of the catalog — **#218**.
- **Not included: the ten new components** — **#220**. This ticket only *proves the chain* on
  `demo-notice`.
- **Not included: any live-manipulable control.** The playground's prop controls are #215's. Therefore
  **`system/param-manifest.json` and `system/param-count.json` are NOT touched.** Do not add a
  speculative entry — it churns `param-count.json` for a control that does not exist.
- **Not included: rendering the join.** `renderHandoffViewer` gains no new visual block. `example`
  appears in the existing "Source (spec head)" `<pre>` automatically (that renders `c.head`) — that is
  the whole visual delta, and `handoff.html` is not in the VR page set, so it costs no baseline.
- **Not included: resolved token values anywhere.** No generator writes a computed colour/size. The
  `packs` values the join surfaces come from the **already-committed** `system/system-graph.json` (raw
  declared bindings, quoted verbatim) — this ticket adds none.
- **Not changing:** `system/agentic-renderer.mjs`'s `validateComposition` logic, the composition grammar,
  the vocabulary's top-level shape, `handoff.html`'s call site, or any wc wrapper.

## Feature Metadata

**Feature Type**: Enhancement (generation chain + one component's render path)
**Estimated Complexity**: Medium — small surface, but a five-artifact regeneration cascade and two
baseline sets, with one pre-existing red gate to clear first.
**Primary Systems Affected**: `agent-layer/lib.mjs` · `agent-layer/gen-vocabulary.mjs` ·
`system/specs/*.md` · `system/components.css` · `system/agentic-renderer.mjs` ·
`system/handoff-viewer.mjs` · `tooling/build-checks.mjs` · regenerated `handoff/verdant/**`,
`system/system-graph.json`, `system/loc-summary.json`
**Dependencies**: none (the ticket says so; verified — it touches no studio module)

## Related Work

**Implements**: [#211](https://github.com/linardsb/ux-factory/issues/211) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) →
`docs/epics/prototype-studio.architecture.md` §Data model ("Docs catalog carries no new generated
artifact") + §Other eng-lead calls (the ten components' full chain)

**Back-references**:

- `.claude/plans/handoff-pack-viewer.md` — Why: pinned `prepareHandoff`'s `{ components, composition }`
  shape and the explicit-field-pick discipline this plan extends.
- `.claude/plans/five-pillar-rubric-hooks.md` (L147, L208–210) — Why: **the exact precedent for this
  ticket**. `aiPatterns` is the last optional spec-head key added; it walked parser → `...s.head`
  passthrough → `prepareHandoff` explicit re-pick → viewer. Mirror it.
- `docs/epics/annotated-source-glossary.architecture.md` — Why: `gen-annotated-source.mjs`'s
  anchor-uniqueness contract, which a `components.css` insertion can break.

**Forward-references**:

- #215 (`/components` catalog — consumes the join and the `example`), #218 (inspector docs), #220 (ten
  components — inherits the widened group-3 invariant as a hard constraint).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `agent-layer/lib.mjs` (lines 63–132, `parseComponentSpec`) — Why: the head schema validator you extend.
  Lines 89–103 (`aiPatterns`) are the **exact pattern to mirror** for an optional key: `!== undefined`
  guard, throw naming `specPath`.
- `agent-layer/gen-vocabulary.mjs` (whole file, 70 lines) — Why: where `validateExamples` lands and is
  called. Note the build loop at lines 26–41 populates `components` one spec at a time.
- `agent-layer/gen-handoff.mjs` (lines 69–94) — Why: `...s.head` at line 75 means `example`, `min`,
  `max`, `step` reach `pack.json` **with no edit to this file**. Confirm, don't change.
- `system/agentic-renderer.mjs` (lines 31–109 `validateComposition`; 220–355 `TEMPLATES`; 362
  `hasTemplate`) — Why: the validator you drive, and the template map `demo-notice` joins. Read the
  `metric-tile`/`sequence-step` templates (321–354) as the shape for a simple non-interactive component.
- `system/handoff-viewer.mjs` (lines 38–76, `prepareHandoff`) — Why: the pure join you extend. **Line 48's
  `head` is an explicit field pick, NOT `...c`** — an added key is dropped unless you add it explicitly
  (five-pillar-rubric-hooks L210 records this exact trap).
- `tooling/build-checks.mjs` (lines 351–403, group 3) — Why: the assertion to widen. **Lines 385–388 are
  the comment paragraph that becomes a lie** and must be deleted.
- `tooling/build-checks.mjs` (lines 2778–2973, group 16) — Why: the house style for a new group —
  counts derived from the real committed files, a corrupted-input **mutation** proving the compare is
  real, totality over junk inputs, and an explicit statement of the boundary the group cannot reach.
- `tooling/build-checks.mjs` (lines 1717–2017, group 11) — Why: the corrupted-label mutation idiom in
  its clearest form; also the "5 refusals, each naming its `seq`" phrasing for refusal-message assertions.
- `tooling/drift-check.mjs` (whole file) — Why: the gate chain. `checkHandoff()` runs `genVocabulary()`,
  so `validateExamples` throwing = a red `verify` job with no wiring needed.
- `agent-layer/gen-system-graph.mjs` (lines 61–96) — Why: the `components.css` block-header contract your
  new block must satisfy **exactly**, and the `consumers[]` shape the join reads.
- `system/system-graph.json` — Why: the join's third input. Shape: `{ tokens[], consumers[], counts }`;
  `tokens[i] = { name, group, packs: { neutral, saulera, verdant } }`;
  `consumers[i] = { id, label, spec, tokens[] }`; `counts = { tokens: 64, consumers: 32, edges: 388 }`.
- `handoff/verdant/pack.json` → `portability.webComponents.files` — Why: **wrapper presence needs no new
  input**; it is already `["wc/vd-care-task-row.mjs", "wc/vd-plant-card.mjs", "wc/vd-status-chip.mjs"]`.
- `system/specs/demo-notice.md` — Why: head + the two prose sections that become false.
- `system/components.css` (lines 1527–1660, the three `ds-` blocks) — Why: the block idiom, header form,
  and token-only discipline your `vd-demo-notice` block copies.
- `.claude/references/kb-format.md` §ComponentSpec (lines 14–31) — Why: the head schema doc you update;
  **line 31 records that adding an optional head key needs no portal-parser change** — cite it.
- `handoff.html` (line 196) — Why: the **only** `prepareHandoff` call site in the repo, two-arg. Verified:
  `factory.html` does not call it.
- `agent-layer/annotated-source.spec.json` — Why: `anchorStart: ".btn-primary {"` /
  `anchorEnd: ".btn-primary:active"` in `system/components.css`. Anchors are **substring** matches
  requiring **exactly one** hit — a new block containing either string breaks the build.
- `approach.html` (lines 245–259) — Why: renders `loc-summary.json`'s **runtime group** `files` and
  `linesApprox`, which this ticket moves. This is what churns approach's baselines.

### New Files to Create

**None.** No new tracked source file, no new generated artifact — that is the ticket's central claim
(architecture §Data model). If you find yourself creating one, stop and re-read the scope.

*(Corollary: `gen-loc-summary`'s **file counts** do not move; only line counts do.)*

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Data model, lines 101–106 — the verbatim decision this
  ticket implements. Read it; it is four sentences and it settles three design questions.
- `docs/epics/prototype-studio.architecture.md` §Other eng-lead calls, lines 160–172 — the full-chain
  rule and the sentence naming `demo-notice`'s gap.
- `.claude/references/kb-format.md` §ComponentSpec + DataContract — the head schema of record.
- `CLAUDE.md` → "Where new code goes" → **Component** and **New component spec** — the canonical
  chain and its regeneration commands.

### Patterns to Follow

**Optional head key (`agent-layer/lib.mjs:93–103`) — mirror this exactly:**

```js
if (head.aiPatterns !== undefined) {
  if (!Array.isArray(head.aiPatterns) || !head.aiPatterns.length)
    throw new Error(`${specPath}: head "aiPatterns", when present, must be a non-empty array`);
  // …each entry checked, every throw naming specPath
}
```

**Error voice** — name the offending path, enumerate what was allowed
(`system/agentic-renderer.mjs:46`):

```js
throw new Error(`${path}: unknown component "${node.name}" (vocabulary: ${Object.keys(vocab.components).join(" | ")})`);
```

**`components.css` block header — the enforced one-line form** (`gen-system-graph.mjs:65–79` throws on
any `/* -----` comment that does not match `^\/\* -{5,} (.+?) -{5,} \*\/$`):

```css
/* ---------- vd-demo-notice (system/specs/demo-notice.md) ---------- */
```

**A non-interactive renderer template** (`agentic-renderer.mjs:321`) — `el()` only, `text:` not
`innerHTML`, no bus:

```js
"metric-tile": (props) => el("div", { class: `ds-metric-tile${…}` }, …),
```

**build-checks group shape** — `{ … ok(…) … group("name", "summary with DERIVED counts"); }` in its own
block scope; counts interpolated from the data, never typed.

---

## IMPLEMENTATION PLAN

### Phase 0: Clear the red gate

**`main` is currently red.** `node tooling/drift-check.mjs` fails on pre-existing `loc-summary` drift:
the two un-CI'd `fix(210)` commits (`6061550`, `b28898b`) pushed the runtime group past its rounding
boundary without regenerating. Measured at planning time: 72 files, **25,680** real lines against a
committed `linesApprox` of 25,600. **Headroom to the next boundary is 70 lines**, and this ticket's own
runtime delta is ~65 (components.css ~25 + the renderer template ~10 + `prepareHandoff`'s join ~30) —
inside it by single digits, and the comment blocks this plan specifies are long. So: **read the number
off the regenerated file; never write it into the PR body, the report, or a page.** One regen covers
both the inherited drift and this ticket's, and approach's baselines need regenerating either way.

(`agent-layer/lib.mjs` and `gen-vocabulary.mjs` are the **generators** group, not runtime — ~2,474 + ~40,
nowhere near its boundary.)

### Phase 1: Schema

Extend `parseComponentSpec` with `example` and numeric `min`/`max`/`step`. Shape only — no vocabulary
exists at parse time.

### Phase 2: The semantic gate

**Depends on:** Phase 1.

Add the pure, exported `validateExamples(specs, vocab)` and call it from `genVocabulary()`.

### Phase 3: Author the data

**Depends on:** Phase 2 (so a bad example fails immediately rather than at the end).

`example` on all ten specs; `min`/`max`/`step` on `stat-tile.value`.

### Phase 4: demo-notice's render path

**Independent of:** Phases 1–3 (different files) — but Phase 5 depends on **both**, so land it before
touching group 3.

CSS block · renderer template · `status` flip · prose rewrite.

### Phase 5: The gates

**Depends on:** Phases 2, 3 and 4.

Widen group 3; add group 18 (the `validateExamples` mutation + the `prepareHandoff` join).

### Phase 6: The join

**Independent of:** Phase 5's group-3 half; group 18's second half depends on it.

Extend `prepareHandoff`.

### Phase 7: Regeneration cascade + baselines

**Depends on:** everything.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently validated.

### 0 · UPDATE `system/loc-summary.json` — clear the inherited red

- **IMPLEMENT**: `git checkout -b feat/211-docs-chain`, then `node agent-layer/gen-loc-summary.mjs`.
  Commit it separately with a message naming the inherited drift, so the ticket's own diff stays clean.
- **GOTCHA**: the generator reads **`git show :<path>` — the INDEX, not the worktree**. A `--check` run
  before `git add` is a false "no drift" (memory: *loc-summary counts tracked only*). Stage first, then
  check.
- **GOTCHA**: this moves `runtime.linesApprox`, which **approach.html renders** (`approach.html:259`).
  Approach's two baselines churn — handled in Task 14, not here. Do not write the resulting number
  anywhere by hand; the page reads it from the artifact.
- **VALIDATE**: `git add -A && node agent-layer/gen-loc-summary.mjs --check && node tooling/drift-check.mjs`
- **SATISFIES**: prerequisite for AC #6 (CI `verify` green).

### 1 · UPDATE `agent-layer/lib.mjs` — `example` in the head schema

- **IMPLEMENT**: after the `aiPatterns` block (line 103), add a sibling `example` block:
  ```js
  // example (optional): the live playground's starting props — the component's own props object,
  // authored where the component is authored (epic #202 ticket #211; architecture §Data model).
  // SHAPE only here: whether the props actually RENDER is decided by validateExamples() in
  // gen-vocabulary.mjs, which needs the built vocabulary this parser does not have.
  if (head.example !== undefined) {
    if (!head.example || typeof head.example !== "object" || Array.isArray(head.example))
      throw new Error(`${specPath}: head "example", when present, must be an object of props`);
  }
  ```
- **IMPLEMENT**: inside the existing prop loop (lines 81–84), add bounds validation:
  ```js
  for (const k of ["min", "max", "step"]) {
    if (prop[k] === undefined) continue;
    if (prop.type !== "number")
      throw new Error(`${specPath}: prop "${name}" declares "${k}" but its type is "${prop.type}" — min/max/step are numeric-control bounds`);
    if (typeof prop[k] !== "number" || !Number.isFinite(prop[k]))
      throw new Error(`${specPath}: prop "${name}" head "${k}" must be a finite number`);
  }
  if (prop.min !== undefined && prop.max !== undefined && prop.min > prop.max)
    throw new Error(`${specPath}: prop "${name}" has min ${prop.min} > max ${prop.max}`);
  ```
- **PATTERN**: `agent-layer/lib.mjs:93–103` (`aiPatterns`) — `!== undefined` guard, `specPath` in every throw.
- **IMPORTS**: none.
- **GOTCHA**: do **not** validate `example` keys against `head.props` here — that duplicates
  `validateComposition`'s out-of-vocabulary-prop refusal and creates a second source of truth about what
  a valid props object is. One validator.
- **VALIDATE**: `node -e 'import("./agent-layer/lib.mjs").then(m=>console.log(m.parseComponentSpec("system/specs/stat-tile.md").head.component))'`
- **SATISFIES**: AC #1, AC #2.

### 2 · UPDATE `.claude/references/kb-format.md` — document the two new head keys

- **IMPLEMENT**: under the `props` bullet (line 23), note `min`/`max`/`step` as optional numeric-only
  control bounds. After the `aiPatterns` bullet (line 27), add an `example` bullet: optional, the
  playground's starting props, **CI-validated by running `validateComposition` against the generated
  vocabulary** — an example that would not render is a red build.
- **GOTCHA**: line 31's sync rule already covers this — an optional head key does not change the physical
  shape, so `portal/lib/kb.mjs` needs **no** change. Say so in the edit; do not touch the portal parser.
- **VALIDATE**: `grep -n "example" .claude/references/kb-format.md`
- **SATISFIES**: AC #1 (documented as optional).

### 3 · UPDATE `agent-layer/gen-vocabulary.mjs` — export the pure `validateExamples`

- **IMPLEMENT**: import the shipped validator and add the exported function above `genVocabulary`:
  ```js
  import { validateComposition } from "../system/agentic-renderer.mjs";

  // validateExamples(specs, vocab) — PURE. Every spec carrying an `example` must have props that
  // actually RENDER: the example is fed to the shipped validateComposition as the node it will one
  // day be, so a playground that could not mount is a red build naming the spec path, not a defect a
  // visitor finds (epic #202 ticket #211 AC #2).
  //
  // Validated against the WHOLE built vocabulary, deliberately, and only AFTER the map is complete —
  // not against the component's own single entry. validateComposition recurses into children and
  // resolves each child from vocab.components, so a one-entry vocabulary throws a spurious "unknown
  // component" for any spec that declares children, and per-spec validation inside the build loop
  // fails whenever a child sorts alphabetically after its parent. Do not "tighten" this back.
  //
  // Exported so tooling/build-checks.mjs can drive it — including over a deliberately broken example,
  // which is the only thing that proves this gate can fail at all.
  export function validateExamples(specs, vocab) {
    let checked = 0;
    for (const { head, path } of specs) {
      if (head.example === undefined) continue;
      try {
        validateComposition(vocab, { name: head.component, props: head.example }, `${head.component}.example`);
      } catch (e) {
        throw new Error(`${path}: head "example" does not render — ${e.message}`);
      }
      checked++;
    }
    return { checked };
  }
  ```
- **IMPLEMENT**: call the gate after the `vocab` object is assembled (it is the validator's input) and
  **before** `writeFileSync`:
  ```js
  const vocab = { …, components };
  validateExamples(specs, vocab);   // red build before anything is written
  ```
- **DO NOT IMPLEMENT — and record why:** `example` must **not** be projected onto the vocabulary entries.
  `vocabulary.json` is a **prompt input**, not just data: `portal/record-composition.mjs` builds its
  prompt from "vocabulary + the scenario's declared fixtures + question + slot bounds (**no example**)",
  the architecture repeats it for `record-build.mjs` ("no example anywhere"), and the standing rule is
  *never hand-feed an example*. Putting ten worked examples in the vocabulary silently dissolves the
  fence that makes every future composition run honest, and no gate would notice. It is also
  unnecessary: `validateExamples` reads `head.example` from the **specs**, and Task 9's join reads it
  from the **pack** (`...s.head` at `gen-handoff.mjs:75`). Add a comment at the entry-building loop
  saying `example` is deliberately not projected here **and why**, or someone adds it back as an obvious
  convenience.
- **PATTERN**: `agent-layer/build-instance.mjs:32` already imports `validateComposition` from
  `../system/agentic-renderer.mjs` — the `agent-layer/ → system/` direction is established, and the
  module's top level is Node-safe by design (its header says so). State this in the file header note.
- **GOTCHA**: the call must sit **before** `writeFileSync`, or a bad example still writes a
  vocabulary and the failure arrives one artifact too late.
- **GOTCHA**: `validateComposition` mutates nothing and returns its input — do not rely on a return value.
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs` (prints its `✓` line)
- **SATISFIES**: AC #2, AC #7.

### 4 · UPDATE `system/specs/*.md` — author `example` on all ten specs

- **IMPLEMENT**: add an `"example"` key to each of the ten spec heads. Coverage is deliberately total,
  not sampled: partial coverage means #215 ships playgrounds for some components and not others, and it
  is the only way every refusal branch (`enum`, `required`, `type`, `children`, the chip rule) is
  exercised by real data. Concrete, honest, in-scenario values — these are documentation, not fixtures.
  Derived from the committed prop schemas in `handoff/verdant/vocabulary.json`:

  | spec | `example` |
  |---|---|
  | `status-chip` | `{ "value": "due", "label": "DUE" }` |
  | `stat-tile` | `{ "kind": "moisture", "value": 34, "unit": "%", "label": "Moisture" }` |
  | `primary-button` | `{ "label": "Log care" }` |
  | `plant-card` | `{ "name": "Monstera", "species": "Monstera deliciosa", "status": "due" }` |
  | `care-task-row` | `{ "type": "water", "plantName": "Monstera", "status": "overdue" }` |
  | `screen-header` | `{ "title": "My plants", "showSettings": true }` |
  | `metric-tile` | `{ "label": "Overdue", "value": "4", "tone": "warn" }` |
  | `list-row` | `{ "label": "Ana Ruiz", "value": "7", "unit": "jobs", "meta": "North sector", "status": "OVERSOLD" }` |
  | `sequence-step` | `{ "position": "2", "total": "4", "label": "Confirm the address" }` |
  | `demo-notice` | `{ "text": "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved." }` — **quoted verbatim** from `scenarios/verdant/copy.json`'s `fictionalNotice`, not invented |
- **IMPLEMENT**: on `stat-tile`'s `value` prop (the **only** `type: "number"` prop in the repo), add
  `"min": 0, "max": 100, "step": 1`.
- **PATTERN**: place `example` after `children` and before `aiPatterns`, so every head reads in one order.
- **GOTCHA**: `plant-card` / `care-task-row` allow a `status-chip` child and the **chip rule**
  (`agentic-renderer.mjs:102`) refuses a child whose `value` differs from the parent's `status`. Keep
  these two examples **child-free** — the derived chip is the documented default (`resolveChip`, line 177),
  and an explicit child would document the override as if it were the norm.
- **GOTCHA**: `demo-notice`'s prop description says *"the scenario's fictionalNotice string, rendered
  verbatim — never paraphrased or summarized."* An invented notice string would document the exact thing
  that prop forbids. **Quote the real one** — `grep -h fictionalNotice scenarios/verdant/copy.json` — so
  the example is a quotation, not a paraphrase.
- **GOTCHA**: `stat-tile.value` is a **number**; every other value in the table is a string on purpose
  (`metric-tile.value`, `list-row.value`, `sequence-step.position`/`total` are all `type: "string"` —
  display strings, no rounding). A number there is a type refusal.
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs && node -e 'const v=require("./handoff/verdant/vocabulary.json");console.log(Object.entries(v.components).filter(([,e])=>e.example).length)'` → expect `10`
- **SATISFIES**: AC #1, AC #2.

### 5 · UPDATE `system/components.css` — the `vd-demo-notice` block

- **IMPLEMENT**: a token-only block, using **exactly** the five tokens the spec head declares —
  `--color-fg-muted`, `--color-bg-surface`, `--color-border`, `--type-caption`, `--spacing-sm` — and no
  others. Quiet, secondary, **never a warning** (the spec's Accessibility prose is explicit). Place it
  with the other `vd-` blocks.
  ```css
  /* ---------- vd-demo-notice (system/specs/demo-notice.md) ---------- */
  ```
- **PATTERN**: `system/components.css:1527` (`.ds-list-row`) — header form, the `(system/specs/….md)`
  suffix the graph parses, token-only declarations.
- **GOTCHA**: the header **must** be one line matching `^\/\* -{5,} (.+?) -{5,} \*\/$` — a wrapped or
  malformed one throws in `gen-system-graph.mjs:75` (PR #183 H1). Its slug (`vd-demo-notice`) must be
  unique across all 32 existing blocks.
- **GOTCHA**: **do not** introduce the substrings `.btn-primary {` or `.btn-primary:active` anywhere.
  `agent-layer/annotated-source.spec.json` anchors on both, and `gen-annotated-source.mjs:41–45` throws
  when an anchor matches **zero or many** lines.
- **GOTCHA**: no literal colour/size values — `token-lint`'s UNDECLARED check catches undeclared tokens
  but **nothing gates the spec's `tokens[]` array against the tokens the CSS block actually uses**. That
  match is hand-verified. Verify it by eye and say so in the PR body.
- **GOTCHA**: this adds a **consumer** to `system/system-graph.json` (32 → 33, `edges` +5). Expected and
  handled in Task 12. It does **not** change `system/inspect-data.json` — that artifact only emits
  consumers carrying a hand-authored `ROLES` key, and you are adding none. Confirm with `--check`, don't
  assume.
- **VALIDATE**: `node tooling/token-lint.mjs && node agent-layer/gen-system-graph.mjs --check` (expect
  drift — that is the point; Task 12 regenerates) and `node agent-layer/gen-annotated-source.mjs --check`
  (expect **no** drift)
- **SATISFIES**: AC #3.

### 6 · UPDATE `system/agentic-renderer.mjs` — the `demo-notice` template

- **IMPLEMENT**: add to `TEMPLATES`, with a comment recording why it exists and what its one rule is:
  ```js
  // Honesty surface #1, and the component that closes this map's one gap (epic #202 ticket #211): it
  // had a spec and a vocabulary entry and no template, which is "documented but not composable" — the
  // exact hole the ten new components must never repeat, and what build-checks group 3 now asserts
  // over the WHOLE vocabulary rather than over the names compose() happens to emit. Non-interactive
  // (no bus). role="note" and plain text content, never aria-hidden, never truncated: the disclosure
  // must reach assistive tech on the same terms as sighted readers (spec's Accessibility prose).
  "demo-notice": (props) => el("p", { class: "vd-demo-notice", role: "note", text: props.text }),
  ```
- **PATTERN**: `agentic-renderer.mjs:321` (`metric-tile`) — arrow, `el()`, `text:`, no bus, no `innerHTML`.
- **GOTCHA**: the class must be `vd-demo-notice` — the spec head's `class`, and the CSS block from Task 5.
- **VALIDATE**: `node -e 'import("./system/agentic-renderer.mjs").then(m=>console.log(m.hasTemplate("demo-notice")))'` → `true`
- **SATISFIES**: AC #3.

### 7 · UPDATE `system/specs/demo-notice.md` — flip `status` and rewrite the now-false prose

- **IMPLEMENT**: head `"status": "spec"` → `"shipped"`.
- **IMPLEMENT**: rewrite `## States` — it currently says *"`status: spec` — no CSS ships with this record;
  today it renders as plain semantic markup with no visual treatment. Ticket #8 lands the styling … and
  flips `status` to `shipped`."* All three clauses are now false.
- **IMPLEMENT**: rewrite the last sentence of `## Accessibility` — *"…once ticket #8 ships the CSS"* — to
  state the contrast fact in the present tense.
- **GOTCHA**: **this prose ships verbatim in `handoff/verdant/pack.json`** and renders on `handoff.html`.
  Leaving it would make the pack contradict its own head — an honesty-contract failure, not a typo.
- **GOTCHA**: this is a *hand-written spec*, not agent output — editing it is legitimate. (The
  never-hand-edit rule covers traces, boards, ops and compositions.)
- **GOTCHA**: keep the four `## ` sections in order — `parseComponentSpec:126–129` enforces it.
- **VALIDATE**: `node -e 'import("./agent-layer/lib.mjs").then(m=>console.log(m.parseComponentSpec("system/specs/demo-notice.md").head.status))'` → `shipped`
- **SATISFIES**: AC #3.

### 8 · UPDATE `tooling/build-checks.mjs` group 3 — widen to the whole vocabulary

- **IMPLEMENT**: after the existing emitted-names loop, assert the invariant over every vocabulary key:
  ```js
  // Every vocabulary entry has a render path — WIDER than the emitted set on purpose (#211). A spec
  // and a vocabulary entry with no components.css block and no template is "documented but not
  // composable", which was demo-notice's state until #211 closed it. Asserting over the emitted names
  // alone let that hole sit behind a green gate; asserting over the whole vocabulary makes a render
  // path a precondition of being documented at all — which is the constraint #220's ten components
  // are held to.
  for (const name of Object.keys(VOCAB.components)) {
    ok(hasTemplate(name), `${name} is in the generated vocabulary but agentic-renderer.mjs has no template for it — a spec without a render path is documented but not composable (#211)`);
  }
  ```
- **IMPLEMENT**: **delete** the exception paragraph at lines 385–388 ("Scoped to what compose EMITS,
  deliberately not to every vocabulary key: the vocabulary carries 10 components and the renderer 9
  templates, because demo-notice has a spec and no template on purpose. 'Every vocabulary entry has a
  template' would be red on a correct tree."). It is now false in every clause.
- **IMPLEMENT**: update the `group("composition", …)` summary to state the widened claim with a
  **derived** count: `` `… · every one of ${Object.keys(VOCAB.components).length} vocabulary entries has a template` ``.
- **GOTCHA**: keep the emitted-names loop. It asserts something different (that `compose()` emits only
  vocabulary names) and is not subsumed.
- **GOTCHA**: **prove this can fail.** Temporarily comment out the `demo-notice` template from Task 6 and
  confirm group 3 goes red naming `demo-notice`; then restore. (Memory: *the check that cannot fail* —
  every #137 defect survived a green gate the same way.)
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #3.

### 9 · UPDATE `system/handoff-viewer.mjs` — extend `prepareHandoff`'s join

- **IMPLEMENT**: signature `prepareHandoff(pack, vocab, graph = null)`, with a header-comment note
  describing the join and why it is view-time.
- **IMPLEMENT**: add `example` to the explicit `head` pick, conditionally (same idiom as `aiPatterns` at
  line 60), so a spec with no example keeps a faithful head JSON:
  ```js
  ...(c.example ? { example: c.example } : {}),
  ```
- **IMPLEMENT**: per component, add four joined fields:
  ```js
  example: c.example ?? null,
  // Wrapper presence — read off the pack's OWN portability block; no new input, no fs. Joined on the
  // component's CLASS, not its name: wrappers are wc/vd-plant-card.mjs, and library primitives like
  // metric-tile (class ds-metric-tile) correctly have none. 3 of 10 today; the 7 missing wrappers are
  // riding debt the architecture records, and the catalog's vd-* code tab stays presence-gated on this.
  wrapper: wrapperFiles.has(`wc/${c.class}.mjs`) ? `wc/${c.class}.mjs` : null,
  // Token bindings — from the ALREADY-COMMITTED system-graph, whose pack values are the packs' RAW
  // declared text (aliases unresolved). No token VALUE is computed or written here or anywhere: the
  // catalog resolves live values with getComputedStyle at view time, the rule inspect.mjs obeys
  // (architecture §Data model). null when no graph is supplied — the join is optional by design, so
  // handoff.html's two-arg call keeps working unchanged.
  tokens: graphTokens && c.tokens ? c.tokens.map((t) => graphTokens.get(t) ?? { name: t, group: null, packs: {} }) : null,
  // The components.css block that MEASURABLY consumes tokens for this spec, or null when the block
  // is structural-only (gen-system-graph.mjs drops zero-token blocks) or absent.
  consumer: graphConsumers ? graphConsumers.get(`system/specs/${c.component}.md`) ?? null : null,
  ```
  with, above the `map`:
  ```js
  const wrapperFiles = new Set(pack.portability?.webComponents?.files ?? []);
  const graphTokens = graph?.tokens ? new Map(graph.tokens.map((t) => [t.name, t])) : null;
  const graphConsumers = graph?.consumers ? new Map(graph.consumers.map((k) => [k.spec, k])) : null;
  ```
- **PATTERN**: `prepareHandoff`'s existing shallow-trust posture (lines 39–43) — these are generated,
  CI-drift-checked artifacts, not user input. Do **not** add deep validation; `graph == null` and missing
  keys degrade to `null`, matching how the module already treats an absent vocab entry (line 72).
- **GOTCHA**: **the `head` object is an explicit field pick, not `...c`** — `example` is dropped unless
  you add it (`.claude/plans/five-pillar-rubric-hooks.md:210` records this exact trap costing a review round).
- **GOTCHA**: do **not** change `renderHandoffViewer`. `example` surfaces in the existing "Source (spec
  head)" `<pre>` for free; presentation is #215's.
- **GOTCHA**: keep it **pure and DOM-free** — no `fetch`, no `document`. `build-checks` imports it under Node.
- **VALIDATE**: covered by Task 10's group 18.
- **SATISFIES**: AC #4, AC #5.

### 10 · ADD `tooling/build-checks.mjs` group 18 — the docs chain

- **IMPLEMENT**: a new block after group 17, in the house style, with two halves:

  **A · `validateExamples` — including the mutation that decides whether it is real.** Drive the
  exported function over synthetic in-memory spec objects (`{ head, path }` — no files) against the
  **real** committed `VOCAB`:
  - happy path: every real spec's real `example` passes, `checked` asserted **against the count read
    from `vocabulary.json`**, not typed;
  - the **mutation**: a synthetic spec whose `example` breaks each refusal branch —
    (1) unknown prop, (2) missing required prop, (3) wrong type (`stat-tile.value` as a string),
    (4) enum violation (`status-chip.value: "nonsense"`) — **four cases, each asserted to throw AND to
    name its spec path in the message**, because a gate that throws the right count of times with the
    wrong messages is a gate nobody can debug;
  - `example: undefined` is skipped, not failed (the field is optional — AC #1);
  - totality: junk `example` values (`null`, `[]`, `"x"`, `0`) never crash the checker uncaught.

  **B · `prepareHandoff`'s join over the REAL committed files.** Read `handoff/verdant/pack.json`,
  `handoff/verdant/vocabulary.json` and `system/system-graph.json` from disk and assert:
  - three-arg call: every component's `tokens` array has the same length as its spec's `tokens` head,
    and **every entry resolved** (`group !== null`) — a `null` group means a spec declares a token the
    contract does not have;
  - `wrapper` non-null for **exactly** the components whose `wc/<class>.mjs` is in
    `pack.portability.webComponents.files`, the expected set **derived from the pack**, not typed
    (3 today: `plant-card`, `care-task-row`, `status-chip`);
  - `example` non-null for exactly the specs that carry one, count derived from the pack;
  - `consumer` non-null for **every** `pack.components` entry, count derived from `pack.components.length`.
    **Derive from the PACK, check against the GRAPH — the one place "derive the expected set from the
    file" is wrong.** Deriving the expected set from `system-graph.json`'s `consumers[].spec` produces a
    check that cannot fail: remove `demo-notice`'s CSS block, regen the graph, and it leaves the join
    **and** the expected set together, both sides moving in lockstep, assertion green. Anchoring on the
    pack means a deleted or suffix-less block goes red, and #220's ten additions are covered with no
    edit here. **Verified true after Task 5:** 9 of 10 spec paths already appear in
    `graph.consumers[].spec`; `demo-notice` is the only gap and this ticket closes it. If a future
    component's block legitimately consumes no contract token (`gen-system-graph.mjs:91` drops those) or
    carries no `(system/specs/….md)` suffix, name it as an explicit commented exception — never widen
    back to a graph-derived set;
  - **two-arg call** (`prepareHandoff(pack, vocab)`) returns `tokens: null` / `consumer: null` on every
    component and still returns the full `{ components, composition }` shape — the compatibility claim
    `handoff.html:196` rests on;
  - totality over junk graphs (`null`, `{}`, `{tokens:[]}`, `{consumers:"x"}`) — never a throw.
- **IMPLEMENT**: state the boundary this group cannot reach, the way groups 9, 11, 13 and 16 do:
  ```js
  // What this group does NOT reach: that the catalog RENDERS any of this. There is no catalog yet
  // (#215) and this ticket deliberately adds no viewer block, so the join is gated as a pure function
  // and its presentation is #215's, and says so.
  ```
- **IMPLEMENT**: `group("docs chain", …)` with every count interpolated from the files.
- **PATTERN**: group 16 (`build-checks.mjs:2778–2973`) — real committed artifacts as input, derived
  counts, a mutation that decides whether the compare is real, totality over junk, an explicit boundary
  statement.
- **IMPORTS**: `validateExamples` from `../agent-layer/gen-vocabulary.mjs`; `prepareHandoff` from
  `../system/handoff-viewer.mjs`; `readFileSync`/`join` are already imported at the top of the file — check.
- **GOTCHA**: `system/handoff-viewer.mjs`'s top level is Node-safe (its DOM functions reference
  `document` only **inside** call bodies — header lines 111–114 say so). Importing it under Node is fine;
  calling `renderHandoffViewer` is not. Do not call it.
- **GOTCHA**: importing `gen-vocabulary.mjs` is safe in CI — it is zero-dep and its standalone-run guard
  means importing it writes nothing. Do **not** call `genVocabulary()` from a check (it writes to disk).
- **GOTCHA**: **prove B can fail too.** Temporarily delete the `vd-demo-notice` CSS block, regen
  `system-graph.json`, and confirm the `consumer` assertion goes red; then restore both.
- **VALIDATE**: `node tooling/build-checks.mjs` → prints `all 18 groups pass`
- **SATISFIES**: AC #4, AC #7.

### 11 · UPDATE the CLAUDE.md architecture map

- **IMPLEMENT**: two surgical edits. (a) In the `tooling/build-checks.mjs` entry, change "16 groups" to
  "18 groups" and append group 18's one-line description in the established voice (name what it drives
  and what boundary it states). (b) In the **New component spec** bullet under "Where new code goes",
  add that the chain now includes a `components.css` block **and a renderer template** — `build-checks`
  group 3 asserts every vocabulary entry has one, so a spec without them is a red build.
- **GOTCHA**: the entry already undercounts (it says 16; groups 17 exists). Correct it to the real
  number and do not re-litigate the rest of the entry.
- **VALIDATE**: `grep -n "18 groups" CLAUDE.md`
- **SATISFIES**: AC #6 (the map stays true).

### 12 · REGENERATE the artifact cascade

- **IMPLEMENT**, in this order:
  ```
  node agent-layer/gen-system-graph.mjs      # +1 consumer (32→33), edges +5
  node agent-layer/gen-inspect-data.mjs      # expect NO change — no ROLES key added
  node agent-layer/gen-handoff.mjs           # pack.json: example + demo-notice status/prose
  node agent-layer/gen-vocabulary.mjs        # vocabulary.json: example per entry, status shipped
  node agent-layer/gen-pack-bundle.mjs       # bundles the two above — must run LAST
  git add -A
  node agent-layer/gen-loc-summary.mjs       # AFTER git add — it reads the index
  git add -A
  ```
- **GOTCHA**: `gen-handoff.mjs` child-process-invokes Style Dictionary. If `tooling/style-dictionary/node_modules`
  is missing: `cd tooling/style-dictionary && npm install`.
- **GOTCHA**: `gen-pack-bundle` **must** run after the other two — `drift-check.mjs:checkHandoff` says so.
- **GOTCHA**: `gen-loc-summary` reads `git show :<path>`. Run it **after** `git add`, or you get a false
  clean (memory: *loc-summary counts tracked only*).
- **VALIDATE**: `node tooling/drift-check.mjs` → the full `✓` line, no drift
- **SATISFIES**: AC #6.

### 13 · VERIFY the no-token-values claim

- **IMPLEMENT**: confirm no generator wrote a resolved token value as a result of this ticket:
  ```bash
  git diff --cached -- handoff/ system/system-graph.json system/inspect-data.json | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b|^\+.*oklch\(|^\+.*rgb\('
  ```
  Expect **no output**. `system-graph.json`'s new lines carry the packs' *raw declared bindings* for the
  five tokens the new block consumes — those are the graph's existing, committed contract, and the five
  tokens already appear in it with the same values for the 32 other consumers.
- **GOTCHA**: if a hex appears in the `handoff/` diff, a spec or CSS block introduced a literal — a token
  discipline bug, not a regeneration artefact. Fix the source.
- **VALIDATE**: the grep above returns empty; `git diff --cached --stat` shows no new file under `system/` or `handoff/`
- **SATISFIES**: AC #5.

### 14 · REGENERATE the visual baselines

- **IMPLEMENT**: expected churn is **approach only** (2 PNGs) — its rendered runtime line count moves.
  **`handoff.html` is not in the VR page set** (verified: 6 IA + `/roundtrip` + `/build`
  + 2 proto), so `demo-notice`'s status-badge change costs nothing. **`factory.html` is expected NOT to
  churn**: its `#shape` graph mounts lazily inside a `role="tabpanel"` that `studio.mjs:313` hides unless
  selected (`<div id="system-graph"><p class="muted">Opens when you pick this panel.</p></div>`), so the
  new consumer is not painted at capture. **Run the gate and let it tell you** — do not assume either way.
  ```bash
  # from a CLEAN DETACHED worktree under /Users — never /private/tmp (Docker can't share it)
  cd tooling/visual-regression && npm run update:docker
  ```
- **GOTCHA**: the gate screenshots the **dirty working tree**. Commit first, then regen from a clean
  detached worktree (memory: *VR gate reads the working tree*).
- **GOTCHA**: `maxDiffPixels: 100` swallows a few changed digits — a green run is **not** proof approach
  didn't change (memory: *VR tolerance hides text changes*). If `approach-*.png` is not rewritten, `rm`
  the two PNGs and re-run to force it (memory: *VR update skips sub-perceptual*).
- **GOTCHA**: local macOS failures are a platform artefact; the baselines are Linux. Check `gh pr checks`
  for the truth (memory: *local agent + visual gate notes*).
- **GOTCHA**: approach has a known `countUp` rAF flake — a failure on a *different pack each run* is the
  flake, not a regression (memory: *VR gate approach countUp flake*).
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test` (or `gh pr checks` after pushing)
- **SATISFIES**: AC #6 (CI green).

### 15 · COMMIT, PR, artifacts

- **IMPLEMENT**: one atomic commit per phase; PR body **must** carry `Closes #211` (memory:
  *PRs don't auto-close tickets* — a title mentioning `(#211)` closes nothing). Commit
  `.claude/plans/docs-chain-example-field-demo-notice-211.md`, the report and the review in the **same PR**.
- **GOTCHA**: check `mergeStateStatus` before triaging any review findings — merge `main` first or every
  gate needs re-running against the post-merge tree (memory: *reviews validate the pre-merge tree*).
- **VALIDATE**: `gh pr checks`
- **SATISFIES**: AC #6.

---

## TESTING STRATEGY

This repo has no test suite by design (`CLAUDE.md` → Testing). "Done" = run the surface you touched, and
every new invariant lands as a **committed gate** in `tooling/build-checks.mjs` or `tooling/drift-check.mjs`.

### Committed gates (the unit-test equivalent)

- `build-checks` group 3 (widened) — every vocabulary entry has a render path.
- `build-checks` group 18A — `validateExamples` over real + synthetic specs, with four refusal branches
  each asserted to throw **and** to name the spec path.
- `build-checks` group 18B — `prepareHandoff`'s join over the real committed artifacts, all counts derived.
- `drift-check` → `checkHandoff` → `genVocabulary` → `validateExamples` — a bad `example` is a red CI job.
- `drift-check` → `checkSystemGraph`, `checkLocSummary`, `checkInspectData`, `checkAnnotatedSource` — the cascade.
- `token-lint` — the new CSS block references only contract tokens.

### Integration (the real page)

`npx serve .` → `/handoff.html` renders all ten components; `demo-notice` no longer shows the `spec`
status badge; its "Source (spec head)" JSON carries `example`; its `## States` prose reads in the
present tense.

### Edge cases that must be covered

1. A spec with **no** `example` — skipped, not failed (the field is optional; AC #1).
2. An `example` with an **unknown prop** → red, naming the spec path.
3. An `example` **missing a required prop** → red.
4. An `example` with the **wrong type** (`stat-tile.value` as a string) → red.
5. An `example` **violating an enum** (`status-chip.value: "nonsense"`) → red.
6. `min`/`max`/`step` on a **non-numeric** prop → parse error.
7. `min > max` → parse error.
8. `prepareHandoff` called with **two args** (the shipped call site) — full shape, `tokens`/`consumer` null.
9. `prepareHandoff` with a **junk/empty graph** — degrades to null, never throws.
10. A component whose **class has no wrapper** (`metric-tile`) — `wrapper: null`, not a throw.
11. A vocabulary entry with **no template** → group 3 red (proven by commenting the template out).
12. A spec with **no CSS block** → group 18B's `consumer` assertion red (proven by removing the block).

---

## VALIDATION COMMANDS

Execute every command. Zero regressions, 100% feature correctness.

### Level 1: Syntax & shape

```bash
node tooling/drift-check.mjs        # syntax (node --check over every tracked .mjs) + all 12 drift steps
node tooling/token-lint.mjs         # undeclared / orphan / DTCG-valid
```

### Level 2: The pure gates

```bash
node tooling/build-checks.mjs       # expect: all 18 groups pass
```

### Level 3: The generators, standalone

```bash
node agent-layer/gen-system-graph.mjs
node agent-layer/gen-handoff.mjs
node agent-layer/gen-vocabulary.mjs
node agent-layer/gen-pack-bundle.mjs
git add -A && node agent-layer/gen-loc-summary.mjs
git status --porcelain              # expect clean after staging
```

### Level 4: Manual validation

```bash
npx serve .                         # → /handoff.html
```

- All ten components render; `demo-notice` has no `spec` badge.
- `demo-notice`'s "Source (spec head)" JSON shows `"status": "shipped"` and an `example`.
- Its `## States` / `## Accessibility` prose no longer references ticket #8 in the future tense.

### Level 5: The visual gate

```bash
cd tooling/visual-regression && npm run update:docker   # from a CLEAN DETACHED worktree under /Users
cd tooling/visual-regression && npx playwright test
gh pr checks                                            # the authoritative result
```

### Level 6: The mutation proofs (AC #7 — run these, don't assume)

```bash
# 1. group 3 can fail: comment out the demo-notice template → red naming demo-notice → restore
# 2. group 18A is committed and self-proving: its four broken examples are permanent cases
# 3. drift-check can fail: temporarily set stat-tile's example value to "34" (a string)
#    → `node agent-layer/gen-vocabulary.mjs` must throw naming system/specs/stat-tile.md → restore
# 4. group 18B can fail: remove the vd-demo-notice CSS block, regen the graph → consumer assertion red → restore
```

---

## ACCEPTANCE CRITERIA

Traced to the ticket's own list.

- [ ] **AC #1** — `example` is optional: every existing spec still parses, and `pack.json` regenerates
      byte-identically **except** where an `example` was added (plus `demo-notice`'s status/prose, which
      the ticket separately licenses). `vocabulary.json` regenerates byte-identically **except**
      `demo-notice`'s `status` and `stat-tile`'s bounds — `example` is not projected there (see NOTES).
- [ ] **AC #2** — a spec whose `example` fails `validateComposition` fails the build loudly, **naming the
      spec path** (`validateExamples`, called by `genVocabulary`, reached by `drift-check`).
- [ ] **AC #3** — `demo-notice` renders end to end: spec → tokens → `components.css` block → renderer
      template → vocabulary — and `build-checks` group 3's "every component has a template" assertion
      covers it (widened to the whole vocabulary; the exception paragraph deleted).
- [ ] **AC #4** — `prepareHandoff` returns the joined shape with **no new file on disk**; the join is pure
      and Node-testable, and is Node-tested in group 18B.
- [ ] **AC #5** — no token *value* appears in any generated artifact as a result of this ticket (Task 13's
      grep is empty).
- [ ] **AC #6** — `gen-handoff.mjs` + `gen-vocabulary.mjs` re-run and committed; CI `verify` drift-check green.
- [ ] **AC #7** — a mutated `example` makes the check go red, **as a committed tripwire** (group 18A's four
      refusal branches), not only as a one-time operator observation.
- [ ] `param-manifest.json` / `param-count.json` are **untouched** (no live control shipped).
- [ ] `handoff/verdant/**`, `system/system-graph.json`, `system/loc-summary.json` regenerated and committed.
- [ ] approach's baselines regenerated (runtime lines 25,600 → 25,700); factory's confirmed unchanged.
- [ ] PR body carries `Closes #211`; plan + report + review committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] Inherited `loc-summary` drift cleared (Task 0) — `main` starts red
- [ ] All tasks completed in order, each validated immediately
- [ ] `node tooling/drift-check.mjs` → full `✓`, no drift
- [ ] `node tooling/token-lint.mjs` → pass
- [ ] `node tooling/build-checks.mjs` → all 18 groups pass
- [ ] The four Level-6 mutation proofs actually run, each observed red, each restored
- [ ] `/handoff.html` renders correctly under `npx serve .`
- [ ] Baselines regenerated from a clean detached worktree under `/Users`
- [ ] `gh pr checks` green
- [ ] `CLAUDE.md` map updated (18 groups; the full-chain rule)
- [ ] `.claude/references/kb-format.md` documents `example` + `min`/`max`/`step`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes — each verified in the codebase, listed so a reviewer can re-check:**

1. **`validateExamples` validates against the FULL vocabulary, not the "own entry"** the ticket's AC #2
   words it as. Verified reason: `validateComposition:98` recurses into children and resolves each child
   from `vocab.components`, so a single-entry vocabulary throws a spurious "unknown component" for
   `plant-card` and `care-task-row`. The example node's own `name` still pins its entry, so the AC's
   intent holds exactly. **Recorded in the code comment so nobody "tightens" it back.**
2. **`min`/`max`/`step` ride into `vocabulary.json` verbatim** (`props` passes through unmodified at
   `gen-vocabulary.mjs:36`), while **`example` deliberately does not**. The distinction is the recorder
   fence, not convenience: `vocabulary.json` is a prompt input, and bounds are **constraints** — they
   make an agent's output more bounded, never more copied — whereas an example is the one thing
   `record-composition.mjs` and `record-build.mjs` are both fenced against being fed. (Secondarily
   verified harmless: `validateComposition:64–77` reads only `type`/`required`/`enum`, and nothing
   asserts vocabulary prop shape.)
3. **All ten specs get an `example`.** Partial coverage means #215 ships some playgrounds and not others,
   and only the full set exercises every refusal branch. AC #1's "byte-identical except where an `example`
   was added" is satisfied either way — the licence is per-spec, not a budget.
4. **`inspect-data.json` is unchanged** because no `ROLES` key is added. Verified against
   `gen-inspect-data.mjs`'s header ("a consumer with no key here is simply not inspectable yet") — but
   **confirm with `--check`**, don't trust a comment.
5. **`factory.html`'s baselines do not churn** — the `#shape` graph mounts lazily in a hidden tabpanel.
   Verified in the markup, but the VR run is the authority.
6. **`prepareHandoff` has exactly one call site** (`handoff.html:196`, two-arg). Verified by grep across
   the repo; `factory.html` does not call it.

**Questions that would change the plan if answered differently — none is blocking:**

- **Should `renderHandoffViewer` render the join now?** This plan says no (scope: #215 owns presentation).
  If you want `handoff.html` to show token bindings and wrapper presence immediately, that is a fourth
  projection column and it is real design work — raise it before Task 9, not after.
- **Should the inherited `loc-summary` drift be its own PR?** This plan folds it in as a separate first
  commit, because #211 crosses the same rounding boundary and would need the identical approach-baseline
  regen anyway. Splitting it means regenerating those baselines twice.

---

## NOTES (open canvas)

### The one design decision, and why it dictates the rest

AC #7 says "mutate a spec's `example` and confirm the check goes red." The lazy reading is *the
implementer does that once and writes it in the report*. The `check-that-cannot-fail` memory says that is
worthless: every #137 defect survived a green gate because the check skipped the thing it tested. So the
mutation has to be a **committed tripwire**, which forces `validateExamples` to be a **pure exported
function** rather than inline code in `genVocabulary`'s loop — because inline code can only be tested by
editing files and reverting.

Everything else follows: the export makes it Node-drivable, which makes group 18A possible, which is what
makes AC #7 survive the PR. Groups 11 and 16 already do exactly this (`projectTrace` pure so build-checks
can drive it; the join's corrupted-label mutation). This ticket is the third application of a pattern the
repo already believes in.

### Why widening group 3 is the actual point of the ticket

The ticket frames `demo-notice` as "fixing a gap." It is more than that. Right now `build-checks.mjs:385–388`
**writes the gap down as intentional** — a comment explaining why the gate is deliberately narrower than
the invariant. That is the most dangerous shape a check can have: it looks rigorous and it documents its
own blind spot in prose nobody re-reads.

Once `demo-notice` has a template, the exception evaporates and the assertion can be what it always wanted
to be: *every documented component is composable*. That single line is the constraint #220's ten components
inherit — each one lands its CSS block and renderer template or CI is red. The epic says so in almost these
words ("a spec without its CSS block and renderer template is documented but not composable, which is
`demo-notice`'s exact gap today"). **#211's deliverable is that constraint; the component is the proof.**

### The cascade the ticket's "Files touched" omits

The estimate names eight paths and ~600–800 lines. It omits every generated consequence:

| Artifact | Why it moves | Cost |
|---|---|---|
| `system/system-graph.json` | new `components.css` consumer (32→33, edges +5) | drift-checked, must commit |
| `system/loc-summary.json` | +~65 runtime lines, **and main's tree already crosses the boundary un-regenerated** | drift-checked; main is already red for this |
| approach baselines ×2 | approach renders `runtime.linesApprox` | `update:docker` from a clean worktree |
| `handoff/verdant/pack.json` + `pack.bundle.json` | `example` + demo-notice status/prose | drift-checked |
| `handoff/verdant/vocabulary.json` | demo-notice `status` + stat-tile's bounds **only** — no `example` | drift-checked |
| `system/inspect-data.json` | expected **unchanged** (no `ROLES` key) | verify with `--check` |
| factory baselines | expected **unchanged** (lazy hidden tabpanel) | verify with the gate |
| `param-count.json` | **must not move** — no live control ships | verify by not touching it |

The `annotated-source.json` risk is subtle and worth naming: its anchors are **substring** matches that
must hit **exactly one** line. Two of them live in `components.css` (`.btn-primary {`,
`.btn-primary:active`). A CSS block that happened to contain either string would break the build in a way
whose error message points at the spec file, not at your new block.

### The trap this plan nearly walked into twice

Both were the *same* failure shape — a check or a fence that looks rigorous and isn't — and both are
worth carrying into implementation as live hazards, not settled trivia:

1. **`example` in `vocabulary.json`.** Obvious, convenient, and it would have quietly deleted the fence
   that makes every future composition and build run honest. `vocabulary.json` is a **prompt input**:
   `record-composition.mjs`'s prompt is "vocabulary + fixtures + question + slot bounds (**no example**)"
   and `record-build.mjs`'s fence says "no example anywhere". Ten worked examples living in the
   vocabulary means every future run is fed them, and **nothing in CI would go red** — the artifacts all
   regenerate cleanly, the gates all pass, and the honesty claim on the traces is just false. `example`
   lives on the **pack** side (`...s.head` → `pack.json`), which is what the docs read and no recorder does.
2. **Group 18B's `consumer` assertion, derived from the graph.** "Derive counts from the file, never
   type them" is right almost everywhere and wrong here: if the expected set comes from
   `system-graph.json`'s own `consumers[]`, then deleting a CSS block removes the component from the
   join **and** from the expectation, both sides move together, and the check is green on a broken tree.
   Anchor on `pack.components` instead. The rule generalises: **derive the expected set from a source
   that does not move when the thing under test breaks.**

### Alternatives weighed and rejected

- **`validateExamples` in `agent-layer/lib.mjs`** — keeps `agent-layer/ → system/` imports out of the
  parser. Rejected: the vocabulary is built in `gen-vocabulary.mjs` and nowhere else, and the import
  direction already exists (`build-instance.mjs:32`). Putting the gate away from its only input buys
  nothing and adds a hop.
- **A generated `catalog.json` artifact** — would make the join trivially inspectable. Rejected by the
  architecture, explicitly and by name ("Docs catalog carries no new generated artifact"), because a
  fourth artifact joining three existing ones is a fourth thing that can drift, and the join is cheap
  and pure.
- **Validating `example` keys against `head.props` in the parser** — a fast fail with no vocabulary
  needed. Rejected: it is a second, weaker opinion about what a valid props object is, and it would drift
  from `validateComposition`. One validator, at the point where the real one can run.
- **`example` on demo-notice + three representative specs only** — the tighter reading of AC #1's
  "byte-identically except where an `example` was added." Rejected: #215 would ship playgrounds for four
  of ten components and the honest thing to write on the page would be an apology. The licence is
  per-spec; using it ten times is not overreach.

### Sequencing risk

The epic sliced this into **Wave 1** as one of three independent starts. It is being planned after
#203–#210 all landed (`build-checks` is at 17 groups, not the 16 the epic body records). Nothing about
#211 conflicts — it touches no studio module — but two consequences are live:

1. **`main` is red on arrival.** Task 0, not a footnote.
2. **The baseline-collision rule applies.** If anything else is regenerating approach's baselines
   concurrently, this ticket runs after it and merges `main` first. Two PRs regenerating the same PNGs
   from different trees silently re-baseline each other's regressions.

### Confidence

**9.5/10.** Every seam was read, every count measured rather than assumed, and the four proof-of-failure
steps are written as commands rather than intentions. The half-point of residual risk is entirely in the
visual gate: whether approach's diff clears `maxDiffPixels: 100` on its own (a digit change is small — the
`rm`-the-PNG escape hatch is in Task 14), and whether factory truly stays put (predicted from the markup,
but only the gate can confirm).

## AMENDMENTS

*(empty at creation)*
