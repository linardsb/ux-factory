# Feature: S5 + the Figma house plugin + `import/figma.mjs` (#310)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Pay special attention to naming of existing utils, types and models. Import from the
right files.

**This plan has a hard stop in the middle.** Phase A (the plugin, the runbook, the owner's run in Figma, the
verdict) must finish, and the verdict must be posted on epic #295, **before one line of `import/figma.mjs` is
written**. The decision table in Phase A picks the branch. Phases B–D are written for branches 1 and 2. On
branch 3, skip B and C and finish with Phase D's docs rows marked for branch 3.

**Two things keep the stop short (amended 2026-09-26, R1).**
- **The owner's part is about 5 minutes.** A second plugin command, **Build S5 fixture** (Task A2b), creates the
  variables, the component set and every binding from the recipe. The owner imports the plugin, clicks Build and
  then Export, and saves the file. The hand-drawn recipe stays as the fallback if Build fails.
- **Verdict-independent work lands before the run** (§ Execution order). Only work that depends on the branch waits.

## Feature Description

Today a design reaches the importer only from Brilliant, through `import/brilliant.mjs`. Figma's REST read is
unusable for this. The read budget is about 6 file reads per month, per file. The variables endpoint needs an
Enterprise plan (`docs/figma-runbook.md:49-51,173`). So Figma currently supplies packs only.

This ticket adds a second entrance through a file, in four parts:

- **The plugin.** A small house plugin (plain JavaScript and a manifest, loaded from disk in Figma desktop) dumps
  the current selection as JSON.
- **The spike (S5).** The spike asks whether that dump carries auto-layout and variable bindings with their
  names. Its answer picks which converter ships.
- **The converter.** `import/figma.mjs` turns the dump into the same IR `import/brilliant.mjs` emits (IR: the
  intermediate tree every design source is converted into), so `import/recognise.mjs` runs on it unchanged.
- **The gate.** Build-checks group 40 pins one real export through `figma → ir → recognise`, and refuses any file
  that is not a house-plugin export.

## User Story

As the owner, working as the operator
I want to select a component in Figma, export it with my own plugin, and have the importer recognise it
So that Figma designs reach the canvas through the same matcher as Brilliant's, with no API token, no read
budget and no Enterprise gate

## Problem Statement

Epic #295's MVP 7 / G9 names Figma as an import source "through a plugin export file dropped on the portal".
None of the three pieces exists: no plugin, no export format, no converter. The architecture's S5 left one
question open: whether a plugin can see auto-layout and `boundVariables` with resolved variable names. It gates
which converter branch ships (architecture § Spikes item 4).

## Solution Statement

1. **The plugin reads and never maps.** It dumps a fixed allow-list of node properties, with `figma.mixed`
   written as `"mixed"`. It also dumps every variable the selection references, as `id → {name, collection,
   resolvedType}`. Every rule lives in the converter, where CI can drive it. The plugin has no rules, so
   nothing inside Figma needs testing beyond "it dumped".
2. **The owner runs it once** against a Figma rebuild of spike C's list row, with variables bound (the recipe is in
   Phase A). The export is committed **verbatim**. A census command reads the export. The decision table,
   declared here before the run, turns the census into a branch.
3. **The converter is the same code on branches 1 and 2.** It reads a binding when one is there (filled `ref`)
   and carries `{value, ref: null}` when one is not. The snap step (#307, `import/snap-rules.mjs`) then handles
   the unbound values, as it already does for Brilliant. The branches differ only in the README verdict and in
   the fixture assertions (`source.bound` true or false). **Do not write two converters.**
4. **Group 40 grows eight cases** (40.19–40.26): determinism and a refusal battery, plus the plugin/converter
   format tie, the component-set name, the defaults rule and layout inference. The last two cover the fixture
   file-type gate (review deferral #457 F4) and the loc-summary membership of the new paths.

## Out of Scope / Non-Goals

- **Not included:** the portal drop-zone wiring, the import record for a live Figma import, the mapping editor
  (all #311). The converter is callable; nothing in `portal/` calls it yet.
- **Not included:** snapping the Figma fixture's unbound values. `snap-rules.mjs` runs after any converter and
  group 42 owns it. On branch 2, group 40 asserts only that unbound values ARRIVE as `{value, ref: null}`.
- **Not changing:** the Figma REST path (`tooling/figma/figma-read.mjs`, `figma-pull.mjs`,
  `figma-parity.mjs`) and its runbook text. They stay packs-only (ticket scope; AC #4).
- **Not changing:** `portal/lib/figma.mjs`. That is the **pack** drop's server module, a different thing with a
  similar name (see GOTCHAs).
- **Not changing:** any recognition weight or signal in `import/recognise.mjs`. If the Figma fixture reads
  differently from Brilliant's, that is a README finding. It is never a reason to tune (recognise.mjs header, R1–R4).
- **Not included:** Figma's write direction, `.penpot` as a source (the owner's O6 note), and a COMPONENT_SET or
  a whole-page selection as the read (the recipe selects one instance).
- **Not included:** publishing the plugin to the Figma community. It is a development plugin loaded from disk.

## Feature Metadata

**Feature Type**: New Capability (spike + converter)
**Estimated Complexity**: Medium–High (owner-gated spike, then ~350 lines of converter and ~250 lines of gate)
**Primary Systems Affected**: `tooling/figma/plugin/` (new), `import/` (new `figma.mjs`, two one-line edits),
`tooling/build-checks.mjs` group 40, `agent-layer/gen-loc-summary.mjs` (one keyword), docs
**Dependencies**: Figma desktop app (owner's machine); no npm dependency anywhere

## Related Work

**Implements**: [#310](https://github.com/linardsb/ux-factory/issues/310) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295),
`docs/epics/canvas-design-import.architecture.md` (§ Spikes item 4 `:315-320`, § Stack `:94-95`, § Boundaries
`:208-214`), `docs/epics/canvas-design-import.prd.md` MVP 7 (G9)

**Back-references**:

- `.claude/plans/import-ir-brilliant-recognise-304.md` — the IR, the Brilliant converter, group 40's voice
- `.claude/plans/import-record-snap-rules-307.md` — the snap step that fills unbound refs (branch 2's other half)
- `.claude/plans/canvas-spike-s6-compose-turn-308.md` + `.claude/plans/canvas-spike-s6/README.md` — the spike README shape
- `.claude/plans/borrowable-tech-audit-research.md` O4 / O6 — the owner's two notes on the ticket

**Forward-references**:

- #311 (import-run) accepts this file type on the same drop zone and calls `convert()`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

All line numbers are `origin/main` at `dbe582b` (observed 2026-09-24).

- `import/ir.mjs` (whole, 182 lines). The node shape (`node()`, `root()`), `tok()`, `drop()` and
  `DROP_CLASS_OF` (`:67-85`), `checkIr` (`:152-180`) and `walk`. Every emit goes through these.
- `import/brilliant.mjs:63` (imports), `:70-79` (`SPACING`), `:214-220` (`mapSpacing`), `:247-266` (`sizeDrops`,
  **not exported today**), `:287-365` (`toStack`; the `spacing()` closure `:292-305` is the rule figma.mjs
  mirrors), `:451-568` (`readLine`: which slot each value lands in), `:602-620` (`convert`: the
  derived `ids` and `bound`, then `checkIr` on its own output). **The converter to mirror, field for field.**
- `import/recognise.mjs:1-130` (the four rules R1–R4; what the matcher reads), `:152-165` (`PROP_SOURCES`),
  `:180` (`GLYPH_BOX_PX`), `:278-344` (`SIGNALS`), `:474-518` (`stackShape`: what happens to `align.main`,
  an unsnapped gap/pad and a mixed pad).
- `import/snap-rules.mjs:1-57`. Bound slots are never touched, and unbound ones are snapped by value. It
  imports `SPACING` from `./brilliant.mjs` (`:54`), which is the precedent for `figma.mjs` importing from it.
- `import/regen-expected.mjs` (whole, 57 lines). The expected-verdict generator this plan extends to two
  fixtures.
- `tooling/build-checks.mjs:12185-12716`, group 40. Cases 40.1 (`:12236`, determinism), 40.5 (`:12352`, the
  drop-kind census; its regex reads **literal** `drop({ kind: "…"` calls), 40.7 (`:12434`, the import graph),
  40.8 (`:12452`, loc-summary), 40.9 (`:12460`, frozen tables), 40.17 (`:12633`, synthetic parse boundary), the
  `group("import-chain", …)` string (`:12715`) and the group header's "cannot reach" (`:12185-12195`).
  Helpers in scope: `ok` (`:323`), `deep`, `threw`, `names`, `fx`, `fold`, `flat`, `at`, `IMPORT_MJS`, `VOCAB` (`:318`).
- `agent-layer/gen-loc-summary.mjs:22-26`. `GROUPS` is module-private today. This plan exports it.
- `tooling/figma/fixtures/scales-dtcg.json`, `scales-tokens-studio.json`: committed non-plugin token files
  (both SYNTHETIC by their own `$description`), reused as refusal inputs. Measured 2026-09-24: DTCG carries `$value`,
  Tokens Studio carries bare `value` (no `$`), both first at depth 2.
- `docs/figma-runbook.md` (264 lines; headings `:1,10,21,23,60,112,132,166,188,201`). The new section is
  appended, and nothing existing changes.
- `.claude/references/gates.md:70`, the group 40 entry and its "What it cannot reach". **Gate prose has three
  copies** (memory): gates.md, the `group()` string and the group header comment. Update all three together.
- `.claude/plans/canvas-spike-s6/README.md`. The spike README shape: header, verdict table with evidence,
  setup table and raw files.
- `CLAUDE.md:117-129` (the `import/` map), `:163` ("New component spec" bullet, which names
  `spike-c-instance.expected.json`), `:178-181` ("Design-import core" bullet, which carries the fixture-type
  rule that #457 F4 says has no gate).

### New Files to Create

- `tooling/figma/plugin/manifest.json` — the development plugin's manifest
- `tooling/figma/plugin/code.js` — the selection dump (~110 lines, plain script, no `import`)
- `tooling/figma/plugin/ui.html` — a textarea with the JSON, plus **Copy** and **Download** buttons
- `.claude/plans/canvas-spike-s5/README.md` — the verdict, the branch and the census (AC #1)
- `.claude/plans/canvas-spike-s5/raw/spike-list-row.export.json` — the verbatim export (owner's run)
- `.claude/plans/canvas-spike-s5/raw/census.txt` — the census command's output, verbatim
- *(branches 1–2)* `import/figma.mjs` — the converter
- *(branches 1–2)* `import/fixtures/figma/spike-list-row.export.json` — byte-identical copy of the raw export
- *(branches 1–2)* `import/fixtures/figma/spike-list-row.expected.json` — generated by `regen-expected.mjs`

### Relevant Documentation — READ BEFORE PHASE A

Verified 2026-09-24 by a research pass. `figma.com/plugin-docs/*` redirects to `developers.figma.com/docs/plugins/*`.

- [Manifest](https://developers.figma.com/docs/plugins/manifest/). `name`, `id`, `api`, `main` and `editorType`
  are required. `documentAccess: "dynamic-page"` is **required for new plugins**. `networkAccess.allowedDomains`
  needs at least one entry (`["none"]`).
- [Migrating to dynamic loading](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/). Under
  `dynamic-page`, use `getMainComponentAsync()`, `figma.variables.getVariableByIdAsync()` and
  `getVariableCollectionByIdAsync()`. The sync forms throw.
- [boundVariables](https://developers.figma.com/docs/plugins/api/properties/nodes-boundvariables/).
  `field → {type:"VARIABLE_ALIAS", id}`. Bindable fields include `itemSpacing`, `padding*`,
  `topLeftRadius`…`bottomRightRadius`, `width` and `height`. `fills` and `strokes` bind as **arrays** at node
  level. A per-paint `paint.boundVariables.color` is **UNCONFIRMED**. The plugin dumps both, and the census says
  which one carried the binding.
- [layoutMode / primaryAxisAlignItems](https://developers.figma.com/docs/plugins/api/properties/nodes-primaryaxisalignitems/).
  `layoutMode: NONE|HORIZONTAL|VERTICAL|GRID`. `primaryAxisAlignItems: MIN|MAX|CENTER|SPACE_BETWEEN|SPACE_EVENLY|SPACE_AROUND`.
  `counterAxisAlignItems: MIN|MAX|CENTER|BASELINE`. `layoutSizingHorizontal/Vertical: FIXED|HUG|FILL`.
  The `layoutWrap` casing is UNCONFIRMED; the dump carries whatever Figma says.
- [Variable](https://developers.figma.com/docs/plugins/api/Variable/). `name`, `resolvedType`
  (`BOOLEAN|COLOR|EASING|FLOAT|STRING|TIMING`) and `variableCollectionId`. Slash-separated names are a UI
  convention, not a documented rule. The recipe fixes the names.
- [TextNode](https://developers.figma.com/docs/plugins/api/TextNode/). `fontSize: number | figma.mixed`. Text
  bindings sit in `boundVariables`, as an alias or an array. The converter accepts **an alias or a uniform
  array**; the census records which.
- [InstanceNode](https://developers.figma.com/docs/plugins/api/InstanceNode/). `componentProperties` holds
  `{type: VARIANT|BOOLEAN|TEXT|INSTANCE_SWAP, value}`. `variantProperties` is **deprecated on instances**, so
  do not read it.
- [Creating UI](https://developers.figma.com/docs/plugins/creating-ui/). `postMessage` cannot carry a Blob. Send
  the JSON **as a string**. Whether a `<a download>` fires inside the UI iframe is **UNCONFIRMED**, so the UI
  ships both Download and a Copy fallback, and the README records which one worked.
- [Libraries and bundling](https://developers.figma.com/docs/plugins/libraries-and-bundling/). `main` is one
  script and there is no native `import`. That matches "no bundler" (architecture `:94-95`).
- `penpot/penpot-exporter-figma-plugin` `transformers/partials/transformLayout.ts` (owner's O6). Read this table
  of enum edge cases before writing `readLayout`. Nothing is borrowed as code.

### Patterns to Follow

**File header (house style, `import/ir.mjs:1-4`, `import/brilliant.mjs:1-3`).** Name, "hand-written canon (this
repo; not generated)", what it does, governing docs, then PURE / scope, then numbered invariants in capitals:

```js
// import/figma.mjs — hand-written canon (this repo; not generated). A HOUSE-PLUGIN EXPORT → the IR
// (epic #295 ticket #310; docs/epics/canvas-design-import.architecture.md:315-320 (S5) and :208-214;
// .claude/plans/figma-plugin-s5-converter-310.md; S5's verdict .claude/plans/canvas-spike-s5/README.md).
```

**Errors name the offending input (`CLAUDE.md` § Errors; `brilliant.mjs:111,584`).**
```js
throw new Error(`unterminated ${head}( in: ${src.trim()}`);
```

**The spacing rule figma.mjs mirrors (`brilliant.mjs:292-305`).** An unbound value is carried as-is. A bound
value maps by role, or becomes a `no-token` drop:
```js
const spacing = (slot, v) => {
  if (v.ref === null) return tok(v.value, null);
  const m = mapSpacing(v);
  if (!m) { drops.push(drop({ kind: "no-token", slot, ref: v.ref, value: v.value, reason: `no contract token for role ${v.ref} (source value ${v.value}px)` })); return null; }
  emitted.push({ slot, srcValue: v.value, srcRef: v.ref, ...m });
  return tok(m.contractValue, m.token);
};
```
`figma.mjs` has no `emitted` table (it exists for S2's driver, not the IR), so drop that line.

**Derived provenance (`brilliant.mjs:602-620`).** `ids` and `bound` are computed from the tree and are never
parameters. Finish by running `checkIr(out)`.

**Gate style (group 40).** Every constructive call goes through `fold()`. Every refusal is asserted with
`names(fn, ...words)`, and every SYNTHETIC case says it is synthetic in its message. The positive control is
stated before the mutation.

---

## IMPLEMENTATION PLAN

### Execution order (amended 2026-09-26)

| When | Tasks | Why it can go here |
|---|---|---|
| **Before the owner's run** (commit 1) | 0, A1, A2, A2b, A3, A4, B3, 40.25 and 40.26 from C1, D1's fixture-rule and `tooling/figma/plugin/` lines | none of them depends on which branch the spike picks; all ship on branch 3 too |
| **The owner's run** (~5 min) | A5 | the one step only the owner can do |
| **After it** (commit 2: spike) | A6, A7 | the census reads the real export |
| **After the verdict** (commit 3: converter) | B1, B2, B4, B5, B6, the rest of C1, C2, the rest of D1, D2, D3 | these either depend on the branch or are dead code on branch 3 |

B1 (`sizeDrops` export) and B2 (`hidden-layer`) wait, because on branch 3 they would have no user. The converter
waits because the ticket says the verdict comes first ("Verdict posted to the epic before the converter is written").

### Phase A — the plugin, the runbook, and S5 (the owner's run) · HARD STOP at its end

Write the plugin and the runbook section. The owner then builds the fixture component, runs the plugin and
saves the export. Run the census, apply the decision table, write the README and post the verdict. **Nothing
under `import/` is touched in Phase A.**

### Phase B — the converter

**Depends on:** Phase A's verdict = branch 1 or 2. **Skipped on branch 3.**

Two one-line exports (`brilliant.mjs` `sizeDrops`, `gen-loc-summary.mjs` `GROUPS`) and one new drop kind
(`ir.mjs` `hidden-layer`). Then `import/figma.mjs`, then O4 layout inference as a separable task. Then the
fixture copy and `regen-expected.mjs` over both fixtures.

### Phase C — group 40 grows 40.19–40.26

**Depends on:** Phase B. The loc-summary membership case (40.26) and the fixture file-type gate (40.25)
**do not** depend on the converter. On branch 3 they still land, in Phase D.

### Phase D — docs and prose, in all their copies

**Depends on:** B and C, or only on A for branch 3. Covers CLAUDE.md, gates.md, the group string and header,
and the ticket's deferral checkbox.

---

## STEP-BY-STEP TASKS

### Task 0 — branch from `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c feat/figma-plugin-s5-310 origin/main`. The primary tree is on
  `fix/importer-reads-icon-name-449` (merged) and has an uncommitted `.claude/skills/piv-fix-review-findings/SKILL.md`
  plus many untracked plan files. **Stage by explicit path only**, and never use `git add -A` or `.` (memory: shared worktree).
- **GOTCHA**: on a **fresh worktree**, group 41 reds with `tooling/icons/node_modules/@phosphor-icons/core/assets/regular
  is missing` (observed on a clean `origin/main` worktree, 2026-09-24). Run `cd tooling/icons && npm ci` first. This
  is the environment, not a regression.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD` → `feat/figma-plugin-s5-310`. Then `node tooling/build-checks.mjs 2>&1 | tail -3` → `build ✓`.
- **SATISFIES**: none (setup) · **REGENERATES**: none

### Task A1 — CREATE `tooling/figma/plugin/manifest.json`

- **IMPLEMENT**:
  ```json
  {
    "name": "ux-factory export",
    "id": "ux-factory-house-export",
    "api": "1.0.0",
    "main": "code.js",
    "ui": "ui.html",
    "editorType": ["figma"],
    "documentAccess": "dynamic-page",
    "networkAccess": { "allowedDomains": ["none"] },
    "menu": [
      { "name": "Export selection", "command": "export" },
      { "name": "Build S5 fixture", "command": "build-fixture" }
    ]
  }
  ```
- **GOTCHA**: whether Figma desktop accepts a hand-picked `id` for a development plugin is UNCONFIRMED. If
  "Import plugin from manifest" refuses it: Plugins → Development → New plugin… → Figma design → any template,
  copy the `id` from the generated manifest into ours, discard the rest, and re-import. Record which id was used in
  the README's Setup table. This is the only change allowed to a plugin file during the run, and it goes in the
  spike commit. `networkAccess: ["none"]` is deliberate: the plugin must not be able to send a
  design anywhere.
- **VALIDATE**: `node -e 'const m=require("./tooling/figma/plugin/manifest.json");for(const k of ["name","id","api","main","editorType","documentAccess"])if(!m[k])throw k;console.log("manifest ✓",m.documentAccess)'` (expected: `manifest ✓ dynamic-page`)
- **SATISFIES**: AC #1 (the plugin exists) · **REGENERATES**: none. `tooling/` matches no loc group, which 40.26 asserts.

### Task A2 — CREATE `tooling/figma/plugin/code.js`

- **IMPLEMENT**: a plain script. No `import`, no `export`, no `require`. `async`/`await` is fine. Header
  in house style: what it is, the epic/ticket, and **"IT READS AND NEVER MAPS"**, stated with the reason (every
  rule lives in `import/figma.mjs` where CI reaches it). Shape:
  ```js
  const FORMAT = "ux-factory/figma-export";   // import/figma.mjs checks this string; case 40.21 ties the two
  const VERSION = 1;
  // THE ALLOW-LIST — what is read. Anything not listed is NOT read, and the header names the notable
  // absences (rotation, constraints, blend mode, min/max size, layout grids) as S5's scope line.
  const PROPS = ["id","name","type","visible","x","y","width","height","opacity",
    "layoutMode","layoutWrap","itemSpacing","counterAxisSpacing",
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "primaryAxisAlignItems","counterAxisAlignItems","layoutSizingHorizontal","layoutSizingVertical",
    "fills","strokes","strokeWeight","dashPattern","cornerRadius","effects",
    "characters","fontSize","fontName","fontWeight","lineHeight","textAlignHorizontal",
    "boundVariables","componentProperties"];
  const plain = (v) => (v === figma.mixed ? "mixed" : v);
  async function dump(node, aliases) {
    const out = {};
    for (const p of PROPS) if (p in node) out[p] = plain(node[p]);
    collect(out.boundVariables, aliases);
    for (const paint of [...(Array.isArray(out.fills) ? out.fills : []), ...(Array.isArray(out.strokes) ? out.strokes : [])]) collect(paint.boundVariables, aliases);
    if (node.type === "INSTANCE") {
      const main = await node.getMainComponentAsync();
      out.main = main ? { name: main.name, setName: main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : null } : null;
    }
    if ("children" in node) { out.children = []; for (const c of node.children) out.children.push(await dump(c, aliases)); }
    return out;
  }
  // collect(): walk any object for {type:"VARIABLE_ALIAS", id} and add the id to the Set.
  // resolve(): for each id → getVariableByIdAsync; null (a library variable the file cannot reach)
  //   → { unresolved: true }. Otherwise { name, collection: (await getVariableCollectionByIdAsync(v.variableCollectionId))?.name ?? null, resolvedType }.
  // main(): selection empty → figma.notify("Select a component first") + closePlugin; else showUI(__html__, {width:480,height:360})
  //   and postMessage({ type: "export", json: JSON.stringify({ format: FORMAT, version: VERSION,
  //   source: { plugin: "tooling/figma/plugin", file: figma.root.name, page: figma.currentPage.name },
  //   variables, selection }, null, 2) }).
  ```
- **GOTCHA**: `figma.mixed` is written `"mixed"` at the **top level of a prop only**. JSON.stringify would
  silently **omit** a symbol-valued key, so a mixed `fontSize` would vanish, which is the invariant-4 defect
  (ir.mjs "A MISS IS RECORDED"). No nested prop in the allow-list carries `mixed` in the documented API. If
  the run shows one, fix `plain()` and re-run. Never edit the export.
- **GOTCHA**: the selection is dumped **in document order**, recursing into `children`. For an instance that
  includes its derived children, which is Brilliant's `expandInstances: true` equivalent.
- **GOTCHA**: no `exportedAt` timestamp. The fixture is committed, and a clock field would make two honest runs differ
  for no reason. `figma.root.name` is the owner's Figma file name. The recipe names the file
  `ux-factory S5 spike`, so nothing personal is committed.
- **VALIDATE**: `node --check tooling/figma/plugin/code.js && ! grep -nE '^\s*(import|export)\b|require\(' tooling/figma/plugin/code.js && echo "code.js ✓ plain script"`
- **SATISFIES**: AC #1 · **REGENERATES**: none

### Task A3 — CREATE `tooling/figma/plugin/ui.html`

- **IMPLEMENT**: one `<textarea readonly>` sized to fill the window, then two buttons: **Download** (a `Blob` plus
  `<a download="<selection-name>.export.json">`) and **Copy** (`textarea.select(); document.execCommand("copy")`,
  with a `navigator.clipboard.writeText` try first). `onmessage = (e) => { const m = e.data.pluginMessage; if (m?.type === "export") ta.value = m.json; }`.
  Set text only through `.value`/`.textContent`, **never `innerHTML`**, because CodeQL's gate (#387) blocks a
  high alert on the PR's own diff. Inline `<style>` with system fonts. This is a tool window inside Figma, not a
  shipped page, so the token contract does not apply. Say so in an HTML comment.
- **VALIDATE**: `grep -c innerHTML tooling/figma/plugin/ui.html` → `0`
- **SATISFIES**: AC #1 · **REGENERATES**: none

### Task A2b — ADD the **Build S5 fixture** command to `code.js` (R1: the owner's time)

- **IMPLEMENT**: dispatch on `figma.command` at the bottom of `code.js`: `"export"` → the existing `main()`,
  `"build-fixture"` → `buildFixture()`, anything else → `figma.closePlugin("unknown command")`. `buildFixture()`
  turns Task A5's recipe into API calls, **reading the recipe as its specification: the same names, values and
  bindings**, so the README can say exactly what was built.
  1. **Refuse a second build.** If `(await figma.variables.getLocalVariableCollectionsAsync()).some(c => c.name === "ux-factory")`,
     then `figma.closePlugin("A ux-factory collection already exists — build into a new file")`.
  2. **Variables.** `const col = figma.variables.createVariableCollection("ux-factory"); const mode = col.modes[0].modeId;`,
     then `const v = figma.variables.createVariable(name, col, "FLOAT" | "COLOR"); v.setValueForMode(mode, value)`
     for the 13 variables in A5 step 2. Colours are `{r,g,b}` in 0..1 from the hex.
  3. **Fonts.** `await figma.loadFontAsync({family: "Inter", style})` for Regular, Medium and Semi Bold **before** any text is made.
  4. **Bindings.** Scalars: `node.setBoundVariable("itemSpacing" | "paddingTop" | … | "topLeftRadius" | … | "fontSize", v)`.
     Paints: `node.fills = [figma.variables.setBoundVariableForPaint({type: "SOLID", color: {r:0,g:0,b:0}}, "color", v)]`.
     Radius is bound on all four corners.
  5. **Nodes.** Build the tree in A5 step 3 with `figma.createComponent()`, `createFrame()`, `createEllipse()`,
     `createText()` and `createVector()`. The chevron is a closed filled path,
     `vectorPaths = [{windingRule: "NONZERO", data: "M 0 0 L 8.73 8 L 0 16 Z"}]`, named `caret-right`.
     Auto-layout props are set as A5 describes (`layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`,
     `layoutSizingHorizontal/Vertical`), each **after** the node is appended to its auto-layout parent, because
     `FILL`/`HUG` throw on a node that is not in one.
  6. **Variants.** Clone the finished component, name the two `state=active` and `state=away`, then
     `const set = figma.combineAsVariants([a, b], figma.currentPage); set.name = "Spike List Row"`.
  7. **Instance.** `const inst = a.createInstance()`, placed beside the set, then
     `figma.currentPage.selection = [inst]; figma.viewport.scrollAndZoomIntoView([inst])` and
     `figma.closePlugin("S5 fixture built — run Export selection")`.
  8. **Any throw** gives `figma.closePlugin("Build failed at <step>: <message>")`. The owner then follows A5's manual
     recipe, and the README records the step and message.
- **GOTCHA**: this command **writes** to the Figma file. It is test scaffolding, and the export path must never
  reach it. Case 40.21 enforces that: its fake `figma` has no `create*`, `setBoundVariable` or `combineAsVariants`,
  so an export that touched one would throw. Say so in the header, beside "IT READS AND NEVER MAPS".
- **GOTCHA**: bindings made by code are real Figma bindings. The exporter reads them through the same API a
  hand-bound file uses, so S5's question (does a plugin **read** auto-layout and variable names?) is answered
  either way. What it does not show is how a real designer binds. The README says so, and it is the PRD's
  existing assumption, left for #316.
- **GOTCHA**: `figma.variables.setBoundVariableForPaint`, `combineAsVariants` and `getLocalVariableCollectionsAsync`
  are documented API but unobserved in this repo. Step 8 is their fallback. The plan does not depend on them succeeding.
- **VALIDATE**: `node --check tooling/figma/plugin/code.js && grep -c 'figma.command' tooling/figma/plugin/code.js` (expected ≥ 1). There is no CI reach into the builder. D2(c) says so.
- **SATISFIES**: AC #1, R1 · **REGENERATES**: none

### Task A4 — UPDATE `docs/figma-runbook.md`: install and export (additions only)

- **IMPLEMENT**:
  - Add one row to the table at `:12-17`: `| **C. Export a design for the importer** (the house plugin) | **once per component** — 4 steps |`.
  - Append a new `## C · Export a design for the importer (the house plugin)` after the last section, with:
    - **C1 Install, once.** In Figma desktop: Plugins → Development → Import plugin from manifest… → pick
      `tooling/figma/plugin/manifest.json`.
    - **C2 Select one component instance** on the canvas.
    - **C3 Run it.** Plugins → Development → ux-factory export.
    - **C4 Save it.** **Download** (or **Copy** and paste into a new file) and save it as
      `<name>.export.json`.
    - One paragraph on why this is a file and not the API: no token, no per-file read budget, no Enterprise
      gate, with a cross-reference to "The one rule about the API" by heading.
    - One sentence on what happens next: the converter is `import/figma.mjs`, and the portal drop is #311.
    - One sentence saying it is **not** a pack path: token exports still go through A.
- **GOTCHA**: AC #4 says the API read path's text is **unchanged**. That is checkable only as additions-only.
- **VALIDATE**: `git diff origin/main -- docs/figma-runbook.md | grep -E '^-[^-]' | wc -l` → `0` (no line removed or edited)
- **REDDENS**: editing any existing word in `:60-111` or `:188-199` makes the count ≥ 1.
- **SATISFIES**: AC #4 · **REGENERATES**: none

### Task A5 — the owner's run (OWNER'S HAND — blocking, ~5 minutes)

- **IMPLEMENT (the fast path)**: the owner does five things.
  1. Open a new Figma file named `ux-factory S5 spike` in Figma desktop.
  2. Plugins → Development → Import plugin from manifest… → `tooling/figma/plugin/manifest.json`.
  3. Plugins → Development → ux-factory export → **Build S5 fixture**. The instance ends up selected.
  4. Plugins → Development → ux-factory export → **Export selection** → Download (or Copy and paste) →
     `.claude/plans/canvas-spike-s5/raw/spike-list-row.export.json`.
  5. Tell the implementer which of Download or Copy worked, whether the `id` was accepted, and Build's closing message.
- **IMPLEMENT (the fallback, only if Build fails)**: the owner follows the recipe below by hand (~30–45 min). It is
  also the builder's specification.

  The recipe: It rebuilds spike C's list row
  (`import/fixtures/spike-c-instance.blueprint.txt`) in Figma, bound to variables named after **the contract's own
  roles**, so a bound ref maps by role through `mapSpacing` exactly as Brilliant's does:
  1. New Figma file named `ux-factory S5 spike`.
  2. A local variable collection `ux-factory` holding:
     - FLOAT variables: `spacing/xs`=4, `spacing/sm`=8, `spacing/md`=16, `radius/full`=9999,
       `font/size/md`=16, `font/size/sm`=14, `font/size/xs`=12.
     - COLOR variables: `color/primary/container` #F2F5FA, `color/text/primary` #454545,
       `color/text/secondary` #575757, `color/success/container` #F1F7F2, `color/success` #00C950,
       `color/text/disabled` #C6C6C6.
  3. A component set `Spike List Row` with one variant property `state` (`active`, `away`). Build the variant
     `state=active` as follows:
     - **Root.** Horizontal auto-layout. Gap bound to `spacing/md`, and all four padding sides bound to `spacing/md`.
       Width fixed at 360, height hug.
     - **`Avatar`.** A 32×32 ellipse, fill bound to `color/primary/container`.
     - **`Text block`.** Vertical auto-layout, gap bound to `spacing/xs`, padding 0, width fill, height hug. It holds
       two text layers:
       - `Text 1`: "Amara Okafor", Inter Semi Bold, size bound to `font/size/md`, fill bound to `color/text/primary`.
       - `Text 2`: "Last seen 2 min ago", Inter Regular, size bound to `font/size/sm`, line height 150 %, fill
         bound to `color/text/secondary`.
     - **`Status chip`.** Horizontal auto-layout, centred on both axes, gap 0. Padding top/bottom bound to
       `spacing/xs`, left/right bound to `spacing/sm`. Corner radius bound to `radius/full`, fill bound to
       `color/success/container`. It holds `Text 3`: "On call", Inter Medium, size bound to `font/size/xs`, fill
       bound to `color/success`.
     - **The chevron.** A caret-right glyph (the Phosphor Figma plugin, or two pen strokes), 16 px tall. **Rename
       the layer to exactly `caret-right`.** **Fill** (not stroke) bound to `color/text/disabled`.
  4. Place **one instance** of `Spike List Row` (`state=active`) on the canvas, select it, then run the plugin
     (C3) and save (C4) as `.claude/plans/canvas-spike-s5/raw/spike-list-row.export.json`.
  5. Tell the implementer which of Download or Copy worked, and whether the manifest's `id` was accepted.
- **GOTCHA**: **the export is committed verbatim and never edited** (honesty contract; CLAUDE.md § Ground
  rules). A bad export is fixed by changing `code.js` and re-running. Not by hand, and not by a `jq` pass.
- **GOTCHA**: the fixture was built **for the test**, by the builder command or by hand, and the README says which. The epic's assumption "a
  designer-drawn source is token-bound" is **not** validated by it (PRD § Assumptions).
- **VALIDATE**: `node -e 'const e=JSON.parse(require("fs").readFileSync(".claude/plans/canvas-spike-s5/raw/spike-list-row.export.json","utf8"));console.log(e.format,e.version,e.selection.length,Object.keys(e.variables).length)'` (expected: `ux-factory/figma-export 1 1 <13 or fewer>`)
- **SATISFIES**: AC #1 · **REGENERATES**: none

### Task A6 — the census and the decision table

- **IMPLEMENT**: run this read-only census and save its stdout verbatim to `.claude/plans/canvas-spike-s5/raw/census.txt`:
  ```bash
  node -e '
  const e=JSON.parse(require("fs").readFileSync(".claude/plans/canvas-spike-s5/raw/spike-list-row.export.json","utf8"));
  const nodes=[];const go=(n)=>{nodes.push(n);(n.children||[]).forEach(go)};e.selection.forEach(go);
  const al=nodes.filter(n=>n.layoutMode==="HORIZONTAL"||n.layoutMode==="VERTICAL");
  const aliases=[];const find=(o,where)=>{if(!o||typeof o!=="object")return;if(o.type==="VARIABLE_ALIAS"){aliases.push([where,o.id]);return}for(const[k,v]of Object.entries(o))find(v,where+"."+k)};
  nodes.forEach(n=>{find(n.boundVariables,n.name+".boundVariables");(n.fills||[]).forEach((p,i)=>find(p.boundVariables,n.name+".fills["+i+"]"));(n.strokes||[]).forEach((p,i)=>find(p.boundVariables,n.name+".strokes["+i+"]"))});
  const resolved=aliases.filter(([,id])=>e.variables[id]&&!e.variables[id].unresolved);
  console.log("nodes",nodes.length,"| auto-layout nodes",al.length,al.map(n=>n.name+":"+n.layoutMode).join(", "));
  console.log("al props on",al.map(n=>n.name+"{gap="+n.itemSpacing+",pad="+[n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft]+",main="+n.primaryAxisAlignItems+",cross="+n.counterAxisAlignItems+",w="+n.layoutSizingHorizontal+",h="+n.layoutSizingVertical+"}").join(" "));
  console.log("aliases",aliases.length,"| resolved to a name",resolved.length);
  aliases.forEach(([w,id])=>console.log("  ",w,"→",e.variables[id]?.name??"UNRESOLVED"));
  console.log("instance main",JSON.stringify(nodes.filter(n=>n.main).map(n=>n.main)));
  '
  ```
- **The decision table.** It is declared **here, before the run**, so the verdict is read off the table and not
  argued afterwards:

  | auto-layout props carried (≥1 node with `HORIZONTAL`/`VERTICAL` + `itemSpacing` + `padding*`) | aliases carried, and **every** one resolves to a name | branch |
  |---|---|---|
  | yes | yes (≥1 alias per family the recipe binds: spacing, colour, radius, type) | **1 — deterministic**: refs filled, same as Brilliant's |
  | yes | none, or some UNRESOLVED | **2 — by value**: refs `null` where unresolved; #307's snap fills them |
  | no | any | **2** — layout by O4 inference (Task B5), refs where they resolve |
  | no | none | **3 — Figma components wait**: the ticket closes with the plugin and this verdict only |

  An UNRESOLVED alias is carried as `ref: null` and **counted** in the README, never dropped. A family the recipe
  binds that carries no alias at all (for example, text `fontSize` not bound anywhere) moves branch 1 to 2 and is
  named in the README.
- **VALIDATE**: `test -s .claude/plans/canvas-spike-s5/raw/census.txt && head -3 .claude/plans/canvas-spike-s5/raw/census.txt`
- **SATISFIES**: AC #1 · **REGENERATES**: none

### Task A7 — CREATE `.claude/plans/canvas-spike-s5/README.md` and post the verdict on #295

- **IMPLEMENT**: mirror `.claude/plans/canvas-spike-s6/README.md`'s shape:
  - **Header.** "Real run, <date>", ticket and epic links, architecture § Spikes item 4, this plan's path. Then
    one sentence: the fixture was drawn by the owner for the test (see the Task A5 GOTCHA).
  - **Verdicts table** (Q | Verdict | Evidence):
    - Q1: does the dump carry auto-layout props?
    - Q2: does it carry `boundVariables` with resolved names, and where do paint bindings sit (node-level
      array or `paint.boundVariables`)?
    - Q3: the branch. Name the decision-table row.
    - Q4: text bindings, alias or array?
    - Q5: the transport. Which of Download or Copy worked, and whether the manifest `id` was accepted.

    Every cell cites a `census.txt` line or a JSON path in the raw export.
  - **Setup table.** Figma desktop version (Help → About), the plugin files' sha256 prefixes (`shasum -a 256
    tooling/figma/plugin/*`), and the export's sha256.
  - **Not done.** SPACE_* alignment, GRID, `layoutWrap`, effects, and mixed text are not exercised by the fixture.
    Name each one.
  - Post the verdict: `gh issue comment 295 --body-file <a 6–10 line summary>` in the S6 comment's shape
    (`gh issue view 295 --comments`, the "S6 (#308), the compose turn" comment). This is the ticket's own
    AC, so it is authorised by the ticket.
- **GOTCHA**: the README reports the census. It adds no judgement the table did not make. If a cell needs the
  owner's read (for example, "is this how a real designer binds?"), write "the read is the owner's" and leave it.
- **VALIDATE**: `grep -cE '^\| \*\*Q[1-5]' .claude/plans/canvas-spike-s5/README.md` → `5` · `gh issue view 295 --comments | grep -c "S5"` → ≥ 1
- **SATISFIES**: AC #1 · **REGENERATES**: none

**━━ HARD STOP. Branch 3 → go to Phase D (Tasks D1–D3 marked "branch 3"). Branches 1–2 → continue. ━━**

### Task B1 — UPDATE `import/brilliant.mjs`: export `sizeDrops`

- **IMPLEMENT**: `const sizeDrops = (size, where) => {` → `export const sizeDrops = (size, where) => {` (`:247`). Change nothing
  else. It takes `{w:{axis, qualifier}, h:{axis, qualifier}}`. `figma.mjs` passes `qualifier: null` on both axes.
- **GOTCHA**: 40.2 compares `toStack(line).layout` output against the S2 baseline, not source text, so the edit
  cannot red it (observed: `tooling/build-checks.mjs:12278`).
- **VALIDATE**: `node -e 'import("./import/brilliant.mjs").then(m=>console.log(typeof m.sizeDrops, m.sizeDrops({w:{axis:360,qualifier:null},h:{axis:"hug",qualifier:null}},"style.size").map(d=>d.kind+"@"+d.slot)))'` (expected: `function [ 'literal-size@style.size.w' ]`)
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task B2 — UPDATE `import/ir.mjs`: one new drop kind

- **IMPLEMENT**: in `DROP_CLASS_OF` (`:67-85`) add `"hidden-layer": "read-then-dropped",   // a layer the source hides (Figma visible:false) — read, understood, not a part`
  under the "Read and understood" block, with a one-line comment that #310 is its producer.
- **GOTCHA**: 40.9 freezes `DROP_CLASS_OF`, and 40.5 reads the roster from sources, so both cover the new kind with no
  edit. `report.mjs:153` validates rows against the same table.
- **VALIDATE**: `node -e 'import("./import/ir.mjs").then(m=>console.log(m.drop({kind:"hidden-layer",slot:"x",reason:"y"}).class))'` (expected: `read-then-dropped`)
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task B3 — UPDATE `agent-layer/gen-loc-summary.mjs`: export `GROUPS`

- **IMPLEMENT**: `const GROUPS = [` → `export const GROUPS = [` (`:22`), on the same line.
- **GOTCHA**: `agent-layer/*.mjs` is in the `generators` group. A same-line edit keeps the line count, so
  `loc-summary.json` does not move. `--check` reads the **git index** (memory: loc-summary counts tracked only),
  so run it after `git add`.
- **VALIDATE**: `git add agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed on main before the edit: same line)
- **SATISFIES**: AC #3 · **REGENERATES**: none (asserted by the command)

### Task B4 — CREATE `import/figma.mjs`

- **IMPLEMENT**: `import { mapSpacing, sizeDrops } from "./brilliant.mjs";` and
  `import { checkIr, drop, node as irNode, root as irRoot, tok, walk } from "./ir.mjs";`. Nothing else. No
  `node:fs`, because the caller owns reading.

  Exports: `FORMAT = "ux-factory/figma-export"`, `VERSION = 1`, and frozen `ALIGN_OF`, `ICON_TYPES`, `SHAPE_TYPES`,
  `CONTAINER_TYPES`, plus `refOf`, `readExport`, `inferLayout` (Task B5) and `convert`.

  **The header states these decisions, each with its reason:**

  - **F1 · Refusal first.** `readExport(text)` throws, naming why, on each of these:
    - not a string: `figma export: expected the file's text, got <typeof>`
    - not JSON: `figma export: not JSON (<parse message>) — a house-plugin export is the JSON tooling/figma/plugin/ writes (docs/figma-runbook.md § C)`
    - a Figma REST read (a top-level `document` key): `… is a Figma REST file read, not a house-plugin export`
    - a token export (no `format`, and anywhere in an **unbounded** walk either a `$value` key or a `value` key
      beside a `type` key — DTCG and Tokens Studio respectively, measured on the two committed files):
      `… looks like a token export — that is a pack input (docs/figma-runbook.md § A), not a design read`
    - `format` ≠ `FORMAT`: `… "format" is <x>, expected "ux-factory/figma-export"`
    - `version` ≠ 1: `… version <v> is not supported — this converter reads 1`
    - an empty `selection`: `… the export carries no selection — select a component in Figma before exporting`
    - a node without `id` or `type`: `… selection[<i>]<path> has no <key>`
  - **F2 · Refs.** `refOf(alias, variables)` turns `{type:"VARIABLE_ALIAS", id}` into `"$" + name.split("/").join(".")`.
    `spacing/md` becomes `$spacing.md`, the convention `brilliant.mjs:56-58` decided ("one convention in the IR
    beats two"). An unresolved id or an unknown id gives `null`, and the root counts it in `source.unresolved`.
    The node-level binding and the paint-level binding are both read, node-level first. The census (A6) records
    which one Figma used. An **array** binding is read only when every entry is the same id. A mixed array is
    `null` plus a `prop-shape` drop.
  - **F3 · Figma defaults that equal the stack's unset behaviour are carried as ABSENT, not as a drop.** This
    departs from `ir.mjs` invariant 4 in wording, not in substance. Figma writes a number where Brilliant
    writes nothing, so an absence has to be told apart from a read. Four cases:
    - an **unbound** all-zero pad gives `pad: null`
    - an **unbound** `itemSpacing: 0` gives `gap: null`
    - an **unbound** `cornerRadius: 0` gives no radius
    - `primaryAxisAlignItems: "MIN"` gives `align.main: null`, because a stack packs from the start (`system/specs/stack.md:30`)

    A **bound** zero (a `spacing/none` variable) is a read and takes the `no-token` path exactly as Brilliant's
    `pad(0:$spacing.none)` does. A pad with **one** non-zero side keeps all four sides, each as a
    `tok(value, ref|null)`. **This rule is Open Question Q1. Implement it as written, and case 40.23 drives
    both directions.**
  - **F4 · Kinds.** Each Figma node type maps to one IR kind:
    - `TEXT` → `text`
    - `ELLIPSE` → `shape` with `style.shape: "circle"` (Brilliant's `c`)
    - `RECTANGLE` → `shape`
    - `VECTOR|BOOLEAN_OPERATION|STAR|POLYGON|LINE` → `icon`, or a `FRAME|GROUP|INSTANCE|COMPONENT` whose every
      descendant is one of those (and has at least one) → `icon`, with `icon.name` = **the layer name**
      (not the main component's, so the owner's rename in the recipe is what is read) and no children emitted
      (a glyph's paths are artwork, not parts)
    - `INSTANCE` → `instance`
    - `COMPONENT` → `instance` with `component.master: true` (Brilliant's `comp`)
    - `FRAME|GROUP|COMPONENT_SET|SECTION` → `frame`
    - any other type → not emitted, and an `unread-atom` drop on the parent (or the root) with
      `value: "node type <T>"`
  - **F5 · The component name is the SET's.** For an instance whose main component sits in a set, `main.name` is
    `state=active`. `component.name = main.setName ?? main.name`. Reading `main.name` alone repeats the
    "Frame 1" defect: name-match misses and the row reads NOT COVERED (`recognise.mjs` `nameOf`, `:196-197`).
    `componentProperties` entries of type `VARIANT` go into `component.variant` (`{state: "active"}`,
    Brilliant's `at(state(active))`). BOOLEAN, TEXT and INSTANCE_SWAP are **not** losses. Their effect is already in
    the tree (a hidden layer, a child's characters, a child instance), so they are not carried and not dropped.
    Say so in the header.
  - **F6 · Layout** (`readLayout`), for `layoutMode` `HORIZONTAL`/`VERTICAL` only:
    - `dir` is `row`/`column`.
    - `gap` and `pad[4]` go through the mirrored `spacing()` rule (Patterns). `ALIGN_OF` maps
      `{MIN:"start", CENTER:"center", MAX:"end"}` for both axes.
    - `SPACE_*` main, or `BASELINE` cross, gives `null` plus a `prop-shape` drop naming the value.
    - `layoutWrap === "WRAP"` gives a `prop-shape` drop carrying `counterAxisSpacing`.
    - `layoutMode: "GRID"` gives no layout, and a `prop-shape` drop.
  - **F7 · Size.** An axis reads `HUG → "hug"`, `FILL → "fill"`, and otherwise `width`/`height` as a number.
    It lands on `layout.size` when the node has a layout, else on `style.size`. That is Brilliant's rule
    (`brilliant.mjs:460-491`), keyed on whether a layout exists, never on property order. Drops come from
    `sizeDrops(size, where)` with `qualifier: null`.
  - **F8 · Style.**
    - **Fill.** The topmost visible `SOLID` paint gives `tok(hex, ref)`. Hex is `#RRGGBB` uppercase from
      `Math.round(c*255)`, matching the fixture's `#F2F5FA`. Each other visible paint, or a non-SOLID paint,
      gives a `prop-shape` drop. A paint `opacity`, or a node `opacity` below 1, gives a `prop-shape` drop,
      and the colour is carried without alpha.
    - **Stroke.** `{color: tok, width: tok(strokeWeight, ref)}`. A non-empty `dashPattern` gives an `unread-atom`
      drop, mirroring Brilliant's `dash(10,5)`.
    - **Radius.** A number gives `tok(r, ref)`. The ref counts only when all four corner bindings share one id.
      A `"mixed"` value gives a `prop-shape` drop.
    - **Effects.** A non-empty `effects` gives an `unread-atom` drop, because a shadow has no IR slot.
  - **F9 · Text.**
    - `content = characters`. `size = tok(fontSize, ref)`, and `"mixed"` gives a `prop-shape` drop.
    - `family = tok(fontName.family, ref)`.
    - `weight` is Figma's number, and `align` is `textAlignHorizontal` lowercased. Nothing downstream reads either
      of these, and the header says the spelling differs from Brilliant's letter codes.
    - `lineHeight`: `AUTO` → null (the F3 rule). `PERCENT` → `tok(value/100, ref)` as a ratio, Brilliant's
      `lh(1.5)` convention. `PIXELS` → `tok(r4(px/fontSize), ref)` as a ratio too.
  - **F10 · Hidden.** `visible === false` means the node is not emitted, and the parent gets a `hidden-layer`
    drop naming its name.
  - **F11 · Position.** `{x, y}` is read and recorded, never mapped (`ir.mjs:97-100`).

  `convert(text, { mode = 1, grain = "component" } = {})` runs `readExport` and maps the selection through the
  readers into `irRoot({mode, grain, source: {tool: "figma", ids, bound, unresolved}, children})`. `ids` and `bound`
  are derived by **exactly** the scan at `brilliant.mjs:606-616` (the same seven slots plus pad; `text.family` is NOT
  added, so `bound` means the same thing for both converters). It returns `checkIr(out)`.
- **GOTCHA**: every drop is a **literal** `drop({ kind: "<kind>", …` call. The 40.5 census regex is
  `drop\(\{[\s\S]{0,80}?kind:\s*"([a-z-]+)"`, and a helper passing a variable kind is invisible to it.
- **GOTCHA**: `import/figma.mjs` is not `portal/lib/figma.mjs`. That one is the **pack** drop's server module
  (`assertSlug`, `runFigmaPull`). Do not import across them, and name the difference in the header's first
  paragraph.
- **GOTCHA**: `checkIr` validates `layout.size` axes as `"fill" | "hug" | finite number`
  (`ir.mjs:159-167`). A `FIXED` axis with a missing `width` would throw there, so F7 must read `width`/`height`,
  never `undefined`.
- **VALIDATE**: `node --check import/figma.mjs && node -e 'import("./import/figma.mjs").then(m=>{const ir=m.convert(require("fs").readFileSync(".claude/plans/canvas-spike-s5/raw/spike-list-row.export.json","utf8"));console.log(ir.source.tool,ir.source.ids.length,ir.source.bound,ir.children[0].component)})'`
  (expected on branch 1: `figma <n> false { name: 'Spike List Row', variant: { state: 'active' } }`)
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task B5 — ADD O4 layout inference to `import/figma.mjs` (cuttable; the owner's comment)

- **IMPLEMENT**: `inferLayout(node, kids)` for a `FRAME|GROUP|COMPONENT|INSTANCE` with `layoutMode` `NONE` or
  absent and ≥2 emitted children, run **post-order** (children read first). If every child's `y` is within 5 px
  of the first child's, the direction is `row`. If every child's `x` is, it is `column`. Otherwise there is no
  layout (a free drawing, nothing to record). The gap is the **median** inter-child distance on that axis:
  `next.x − (prev.x + prev.width)`, sorted by position, carried as `tok(median, null)` so the snap step reaches
  it. The result is `layout: {dir, gap, pad: null, align: {main: null, cross: null}, size, inferred: true}`.
  A node that carries `layoutMode` **never** goes through this. Source:
  email-hub `tree_normalizer.py:192-242` (owner's O4 on #310), ported as a pure function. Nothing is borrowed
  as code.
- **GOTCHA**: `inferred: true` is an extra key on `layout`. Verified that nothing enforces layout's key set:
  `checkIr` checks `size`/`gap`/`pad` only (`ir.mjs:157-178`), and `report.mjs` reads `layout.gap`/`layout.pad`
  only (`:198,211`). `stackShape` ignores unknown keys (`recognise.mjs:474-518`). The flag is how #311 can refuse
  or override a guessed layout. The header says so.
- **GOTCHA**: an inferred layout makes a free-drawn frame a laid-out node, so it reaches the `stack` fallback
  instead of the floor (R2). That is the owner's intent. Case 40.24 asserts it once, by path.
- **If cut**: delete the function and 40.24, and record "O4 deferred" in the report. The ticket body's ACs do
  not name O4.
- **VALIDATE**: covered by 40.24.
- **SATISFIES**: the owner's O4 note on #310 · **REGENERATES**: none

### Task B6 — COPY the fixture; UPDATE `import/regen-expected.mjs` to two fixtures

- **IMPLEMENT**:
  - `mkdir -p import/fixtures/figma && cp .claude/plans/canvas-spike-s5/raw/spike-list-row.export.json import/fixtures/figma/`
    (byte-identical; the README records both sha256 values).
  - In `regen-expected.mjs`, replace `SOURCE`/`DEST` with a frozen `FIXTURES` list:
    `[{ source: "import/fixtures/spike-c-instance.blueprint.txt", dest: "import/fixtures/spike-c-instance.expected.json", convert: brilliant.convert }, { source: "import/fixtures/figma/spike-list-row.export.json", dest: "import/fixtures/figma/spike-list-row.expected.json", convert: figma.convert }]`.
  - `genExpectedVerdict({check})` iterates the list and returns `{ rows: [{dest, bytes}], drifted: [dest…] }`.
    The CLI prints one `expected verdict ✓  <dest> — <bytes> bytes from <source>` line per fixture.
  - Update the header's first line and its "#310's converter" sentence, since this is that ticket.
- **GOTCHA**: build-checks does **not** import `genExpectedVerdict` (observed: `git grep` finds only CLAUDE.md,
  the script itself and a message string at `build-checks.mjs:12241`), so the return shape can change freely.
- **GOTCHA**: the 57579-byte figure for the Brilliant verdict must not move. The same bytes mean the refactor
  did not change the first fixture.
- **VALIDATE**: `node import/regen-expected.mjs && node import/regen-expected.mjs --check` →
  two ✓ lines, the first `import/fixtures/spike-c-instance.expected.json — 57579 bytes` (observed before the edit:
  57579) · `cmp .claude/plans/canvas-spike-s5/raw/spike-list-row.export.json import/fixtures/figma/spike-list-row.export.json && echo identical`
- **SATISFIES**: AC #2 · **REGENERATES**: `import/fixtures/figma/spike-list-row.expected.json` (new; `node import/regen-expected.mjs`)

### Task C1 — ADD cases 40.19–40.26 to group 40 in `tooling/build-checks.mjs`

Insert them after 40.18 (the block ending before `group("import-chain", …)` at `:12715`). Load the modules at the top
of the group beside `B1`/`B2`:
`const F1 = await import("../import/figma.mjs?a"); const F2 = await import("../import/figma.mjs?b");`.

- **40.19 FIGMA DETERMINISM.**
  - Run `R1.recognise(F1.convert(FIG), VOCAB)` and `R2.recognise(F2.convert(FIG), VOCAB)`. Assert that the two runs
    are deep-equal, and that the result is deep-equal to `import/fixtures/figma/spike-list-row.expected.json`.
    The drift message names `node import/regen-expected.mjs`.
  - Assert `F1.convert(FIG).source.tool === "figma"`. The BRANCH is "every alias resolved", so on
    branch 1 assert `source.unresolved === 0`; on branch 2 assert the unresolved count the README records. `bound`
    is a SEPARATE fact (every tokenisable slot bound): assert it as whatever the committed fixture says, and the
    README lists which slots are unbound. The recipe leaves Text 2's 150 % line height unbound, so expect
    `bound: false` on branch 1 too. Never tune the converter to make `bound` true.
  - **By-path answers are written AFTER observing the committed verdict**, and each one names its path. The
    expected answers mirror 40.1, but none is guaranteed: the person row → `list-row` scored, reading
    `component.name`; `Text block` → `stack` via the structural fallback; `Text 1` → `text` by role; `Status chip` →
    `status-chip`; `caret-right` → `icon`; `Avatar` → the floor.
  - Where the Figma verdict differs from Brilliant's, **do not assert the Brilliant answer and do not move a
    weight**. Assert what the committed verdict says, and add a row to the README's cross-source table.
  - **REDDENS**: swap `ALIGN_OF.CENTER` to `"start"`. The committed verdict and the run then disagree:
    `the committed Figma verdict and the run disagree — …regen-expected…`.
- **40.20 NOT A HOUSE-PLUGIN EXPORT IS REFUSED, NAMING WHY.** Each of these must throw with the listed words.
  - The committed `tooling/figma/fixtures/scales-dtcg.json` → `token export`
  - The committed `tooling/figma/fixtures/scales-tokens-studio.json` → `token export`
  - The real `import/fixtures/spike-c-instance.blueprint.txt` → `not JSON`
  - SYNTHETIC `{"document":{},"name":"x"}` → `REST`
  - SYNTHETIC `{"format":"x","version":1,"selection":[]}` → `format`
  - The fixture with `version` set to 2 via parse and re-stringify, in memory → `version 2`
  - The fixture with `selection: []` → `no selection`
  - A non-string input → `expected the file's text`

  Positive control first: the committed fixture converts without throwing.
  **REDDENS**: delete the token-export branch of `readExport`. The DTCG file then fails on `format` instead and
  the `names()` check reports it.
- **40.21 THE PLUGIN AND THE CONVERTER AGREE ON THE FORMAT.**
  - Run `tooling/figma/plugin/code.js` in `node:vm` (`vm.runInNewContext(src, ctx)`, with `import vm from "node:vm"`
    added to the file's imports) against a fake `figma`:
    - `mixed: Symbol("mixed")`, `root.name` and `currentPage: {name, selection: [a synthetic INSTANCE with one TEXT child]}`; the INSTANCE carries
      `getMainComponentAsync: async () => ({ name: "state=active", parent: { type: "COMPONENT_SET", name: "Spike List Row" } })`,
      so the case also covers F5 from the plugin side
    - `__html__: ""` in the context, because `code.js` calls `showUI(__html__, …)` and a missing global is a ReferenceError
    - `variables.getVariableByIdAsync`, `getVariableCollectionByIdAsync`
    - `showUI`, `notify`, `closePlugin`
    - `ui.postMessage(m)`, which resolves a promise
  - The fake sets `command: "export"` and carries **no** `create*`, `setBoundVariable`, `setBoundVariableForPaint` or
    `combineAsVariants`, so the export path is proven not to write (A2b's GOTCHA). Positive control: a second run with
    `command: "build-fixture"` must throw or close with `Build failed at`, which proves the fake really lacks them.
  - Await the message (bounded: fail after 2 s rather than hang), then assert that `F1.convert(m.json)` succeeds
    and that `JSON.parse(m.json).format === F1.FORMAT`.
  - Also assert a SYNTHETIC `fontSize: figma.mixed` arrives as `"mixed"` and not as a missing key.
  - The case also syntax-checks the plugin, since `drift-check` checks `.mjs` only.
  - **REDDENS**: change `FORMAT` in `code.js` to `"ux-factory/figma-export-v0"`. `convert` then refuses with `"format" is …`.
- **40.22 THE SET'S NAME, NOT THE VARIANT'S (F5).** SYNTHETIC export: an INSTANCE with
  `main: {name: "state=active", setName: "Spike List Row"}`. Assert `component.name === "Spike List Row"` and that
  `recognise` gives a `name-match` hit with `field === "component.name"`.
  **REDDENS**: read `main.name` only. Then `component.name` is `"state=active"` and there is no name-match hit.
- **40.23 FIGMA DEFAULTS ARE ABSENCE, BOTH WAYS (F3).** SYNTHETIC:
  - Unbound all-zero pad → `pad === null` and no drop.
  - Pad `[0,8,0,8]` unbound → four toks, `[tok(0,null), tok(8,null), …]`.
  - A bound zero pad (`spacing/none`) → a `no-token` drop with `ref: "$spacing.none"`.
  - `primaryAxisAlignItems: "MIN"` → `align.main === null`. `"CENTER"` → `"center"`. `"SPACE_BETWEEN"` → null plus one
    `prop-shape` drop.

  **REDDENS**: remove the all-zero check. Four `tok(0,null)` values then land, and the first assertion names the pad.
- **40.24 O4 LAYOUT INFERENCE** (skip if B5 was cut). SYNTHETIC `NONE` frames:
  - Three children on one row (y within 5) → `row`, with `inferred: true` and the median gap as `tok(m, null)`.
  - Three on one column → `column`.
  - A scatter → no layout.
  - A single child → no layout.
  - A `HORIZONTAL` frame whose children are scattered → `inferred` absent, since the declared layout is kept.
  - One by-path recognise: the inferred row reads `stack` via the structural fallback.

  **REDDENS**: tolerance 5 → 0. A row whose y values differ by 3 px then reads no layout.
- **40.25 FIXTURES ARE DATA (#457 F4).** Walk `import/fixtures/` **recursively** (`readdirSync(…, {recursive:true})`
  is Node ≥ 20.1; CI `verify` runs Node 24 (`verify.yml:73`), local is v20.20.2 — both fine). Assert that every file's extension is in
  `{.txt, .json, .png, .md, .css}`. `.css` is listed because `import/fixtures/s3/tokens.polaris.spike.css` exists
  (observed), and the CLAUDE.md bullet gains it in D1.
  Positive control: the walk found `import/fixtures/figma/spike-list-row.export.json` and
  `import/fixtures/s3/ref.png`, so it is recursive.
  **REDDENS**: `touch import/fixtures/figma/x.mjs` → `import/fixtures/figma/x.mjs is not a data fixture (.mjs) — fixtures are .txt/.json/.png/.md/.css`. Remove the file after the check.
- **40.26 THE NEW PATHS MATCH NO loc-summary GROUP.** Import `{ GROUPS }` beside `genLocSummary`.
  - Positive control: `system/site.js` matches the `runtime` group.
  - For every `git ls-files import tooling/figma/plugin` path, assert that no `GROUPS[].test` matches.
  - Assert the path list contains `tooling/figma/plugin/code.js`, because an empty list would pass vacuously.
  - **REDDENS**: point one path at `system/figma-plugin.js`, in memory. The check names the path and the `runtime`
    group.
  - This case lands on **all** branches.
- **UPDATE 40.7**: add `"figma.mjs"` to the named-module list at `:12436` (branches 1–2).
- **UPDATE 40.9**: add `["figma.ALIGN_OF", F1.ALIGN_OF]`, `ICON_TYPES`, `SHAPE_TYPES` and `CONTAINER_TYPES` to the roster.
- **GOTCHA**: everything goes through `fold()`. An unguarded throw in the vm case kills the run before any named
  failure prints (group 40, `:12220-12224`).
- **GOTCHA**: 40.26 reads the git index, the same as 40.8. Run it after `git add`.
- **VALIDATE**: `git add -N import/ tooling/figma/plugin/ && node tooling/build-checks.mjs 2>&1 | grep -E "import-chain|^build "` → `build import-chain ✓ …` and `build ✓`
- **SATISFIES**: AC #2, AC #3, and the #457 F4 deferral · **REGENERATES**: none

### Task C2 — prove each new check reddens

- **IMPLEMENT**: apply each REDDENS mutation above, one at a time. Run
  `node tooling/build-checks.mjs 2>&1 | grep -A3 import-chain`, paste the failure line into the report, then
  revert. `git diff --stat` must be clean of the mutation before the next one. There are eight mutations. One
  positive control per case is already in its IMPLEMENT.
- **VALIDATE**: the report carries eight observed failure lines.
- **SATISFIES**: every Phase C check · **REGENERATES**: none

### Task D1 — UPDATE `CLAUDE.md`

- **IMPLEMENT**:
  - Under the `import/` map (`:117-129`), add
    `figma.mjs  a house-plugin export → IR; refusal first, the same readers' shape as brilliant.mjs`
    and `fixtures/figma/  S5's verbatim export + its expected verdict`.
    Edit the `regen-expected.mjs` line to say "the committed verdicts (both converters' fixtures)".
  - Under `tooling/`, after `figma/figma-pull.mjs`, add
    `figma/plugin/  the HOUSE PLUGIN — plain JS + manifest, loaded from disk in Figma desktop; reads, never maps`.
  - `:163`: after `spike-c-instance.expected.json`, add "and `import/fixtures/figma/spike-list-row.expected.json`".
    The command stays the same, since `regen-expected.mjs` now writes both files.
  - `:178-181`: change the fixture list to `.txt`/`.json`, or `.png`/`.md`/`.css`, never `.mjs`, and add
    "asserted by build-checks group 40 (40.25)".
  - **Branch 3:** only the `tooling/figma/plugin/` line and the fixture rule (40.25 lands anyway).
- **VALIDATE**: `grep -n "figma/plugin\|fixtures/figma\|40.25" CLAUDE.md`, which should find 3 or more lines.
- **SATISFIES**: AC #3 (the map), #457 F4 · **REGENERATES**: none

### Task D2 — UPDATE the gate prose, all three copies

- **IMPLEMENT**: make the same change in each of the three copies:
  - the `.claude/references/gates.md:70` group 40 entry
  - the `group("import-chain", …)` string at `:12715`
  - the group header comment `:12185-12195`

  The change has four parts:
  - (a) Add the Figma chain, cases 40.19–40.26 in one sentence each.
  - (b) Rewrite "both fixtures here are bound on every layout slot". **On branch 2 it becomes false.** Say which
    fixture is unbound and that group 42 snaps it.
  - (c) Add a "cannot reach" clause: whether the plugin runs in a **Figma** newer than S5's (the vm case drives
    `code.js` against a fake `figma`, which is only as current as the API docs of 2026-09-24).
  - (d) Add a second clause: whether a designer's real file binds like the recipe.
- **GOTCHA**: memory "gate prose has three copies". `git grep -n "bound on every layout slot"` before and after.
  The after count must be 0 (on branch 2), or every hit must still be true.
- **VALIDATE**: `git grep -n "40.19\|house plugin" -- .claude/references/gates.md tooling/build-checks.mjs | wc -l` → 3 or more
- **SATISFIES**: AC #2 (documented gate) · **REGENERATES**: none

### Task D3 — tick the deferral and close out

- **IMPLEMENT**: the PR body carries `Closes #310`, the **branch taken** (AC #1, ticket: "the branch chosen is stated
  in the PR body"), and a line for the #457 F4 deferral (gated in 40.25). Once the PR is open, tick the deferral
  checkbox on #310. Put the plan, report and review in the same PR (CLAUDE.md § Git).
- **Branch 3**: the PR carries A1–A7, 40.25, 40.26 (with the loc-summary `GROUPS` export), D1's two lines and
  D2's cannot-reach clause. AC #2 is **not met by design** (the ticket: "this ticket closes with the plugin and the
  recorded verdict only"), and the PR body says so.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓` · `node tooling/drift-check.mjs` → ✓ · `node tooling/token-lint.mjs` → ✓
- **SATISFIES**: all · **REGENERATES**: none

---

## TESTING STRATEGY

There is no suite (CLAUDE.md § Testing). The gate is build-checks group 40, plus drift-check and token-lint in the CI
`verify` job, plus CodeQL.

### Unit (group 40, pure, no browser, no network, no Figma)

- 40.19 determinism over the real export
- 40.20 refusals over three committed files and five synthetic inputs
- 40.21 the plugin run in `vm` against a fake `figma`
- 40.22–40.24 synthetic converter rules
- 40.25 and 40.26 repository shape

### Integration

The real integration is Phase A: the plugin inside Figma desktop, run by the owner. Nothing in CI can reach it,
and D2(c) says so in all three copies.

### Edge cases

- `figma.mixed` on `fontSize`, `cornerRadius` and `strokeWeight`
- a component-set instance
- an unresolved library variable
- bound versus unbound zero
- `SPACE_*`, `BASELINE`, `WRAP` and `GRID`
- hidden layers, and an icon drawn as a frame of vectors
- a node type with no reader
- an empty selection, a REST file and a token file

### Proving the checks

Each of 40.19–40.26 carries its REDDENS mutation and a positive control. Task C2 runs all eight and records the
failure lines. A green run without C2 has not proven any of them (memory: "the check that cannot fail").

---

## VALIDATION COMMANDS

### Level 1: syntax

- `node --check import/figma.mjs && node --check tooling/figma/plugin/code.js && node --check import/regen-expected.mjs`
- `node tooling/drift-check.mjs`. This `node --check`s every tracked `.mjs`, so run it after `git add`.

### Level 2: the gate

- `node import/regen-expected.mjs --check`: two ✓ lines.
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (run **after** `git add`).
- `node tooling/build-checks.mjs` → `build ✓`. On a fresh worktree, run `cd tooling/icons && npm ci` first.
- `node tooling/token-lint.mjs`.

### Level 3: integration

- The owner's run (A5), recorded in the README. There is no automated equivalent.

### Level 4: manual

- `node -e 'import("./import/figma.mjs").then(async m=>{const {recognise}=await import("./import/recognise.mjs");const v=JSON.parse(require("fs").readFileSync("handoff/verdant/vocabulary.json","utf8"));const r=recognise(m.convert(require("fs").readFileSync("import/fixtures/figma/spike-list-row.export.json","utf8")),v);const go=(n,d=0)=>{if(n.path)console.log(" ".repeat(d*2)+n.path,n.name,n.via);(n.children||[]).forEach(c=>go(c,d+1))};go(r)})'`
  Read the tree, and fill the README's cross-source table from it.
- `git diff origin/main -- docs/figma-runbook.md | grep -E '^-[^-]' | wc -l` → `0`.

### Level 5: CI

- `gh pr checks <n>`. Before trusting the result, compare `headRefOid` with local HEAD (memory: PR head lags a push).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| A5: import the plugin, click Build then Export, save the file | owner's hand, **~5 min** (fallback recipe ~30–45 min), $0 | **yes**. Commit 3 cannot start; commit 1 does not wait | none. Nothing ships without it |
| A5: tell the implementer which of Download or Copy worked, and whether the `id` was accepted | owner's hand, 1 min | yes (README Q5) | the README says "not reported" |
| A7: post the verdict on #295 | $0 (`gh issue comment`) | yes (AC #1) | none |
| The "is this how a real designer binds?" read | owner's verdict | no | PRD assumption, validated by #316's real run |

No step spends tokens. No step touches a shipped page, so there is no VR baseline regeneration.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: `.claude/plans/canvas-spike-s5/README.md` exists with the verdict, the branch (read off the decision
  table) and the census, and the verdict is posted on #295. Proven by Task A7's VALIDATE.
- [ ] AC #2 (branches 1–2): a committed export fixture through `figma → ir → recognise` gives the same answer every
  run (40.19, two cache-busted instances plus the committed expected verdict). A file that is not a house-plugin
  export is refused naming why (40.20, eight inputs).
- [ ] AC #3: `import/` is still CI-importable (40.7 now names `figma.mjs`), `gen-loc-summary --check` is unchanged,
  and `tooling/figma/plugin/` matches no group (40.26, asserted directly against the exported `GROUPS`).
- [ ] AC #4: `docs/figma-runbook.md` gains § C (install and export), with additions only.
- [ ] Deferral #457 F4: the fixture-type rule is gated (40.25), and the CLAUDE.md bullet matches the gate.
- [ ] Every new check was reddened once (C2), with its failure lines in the report.
- [ ] `build ✓`, drift-check ✓, token-lint ✓. CodeQL has no new high alert.

---

## COMPLETION CHECKLIST

- [ ] Phase A finished and the verdict posted **before** any `import/` edit (`git log --reverse --format=%s` shows the
  spike commit first)
- [ ] The export is committed verbatim (the `cmp` check in B6), never edited
- [ ] Each task's VALIDATE passed when it was run
- [ ] All eight REDDENS mutations were observed
- [ ] The three copies of the gate prose agree
- [ ] The PR body states the branch and carries `Closes #310`

---

## RISKS AND HOW EACH IS CLOSED (amended 2026-09-26)

| Risk | What closes it | What is left |
|---|---|---|
| **R1** the owner's time blocks the ticket | A2b's builder cuts the run to ~5 min, and § Execution order lands everything branch-independent first | the 5 minutes themselves |
| **R2a** Download may not fire in the plugin window | `ui.html` ships Copy beside it (A3). Either one produces the same verbatim text | none; the README records which worked |
| **R2b** Figma may refuse the manifest `id` | A1's GOTCHA gives the exact fallback (generate one, copy it in) | none |
| **R2c** a builder API call may fail | A2b step 8 names the failing step, and A5's manual recipe takes over | the fallback costs 30–45 min instead of 5 |
| **R3** Figma's verdict may differ from Brilliant's | by-path asserts are written after observing (40.19); differences go to the README table; weights never move | none; a difference is a finding, not a failure |
| **R4** branch 3 (no auto-layout, no variables) | the table declares it before the run; commit 1 already holds the plugin, the runbook and 40.25/40.26; D3 names the unmet AC | none; the ticket allows it |
| **R5** `bound` reads false on branch 1 | the branch is `unresolved === 0`, not `bound` (40.19); the README lists the unbound slots | none |
| **R6** a Figma field is missing from the dump (`mixed` symbols, a paint-level binding) | `plain()` writes `"mixed"`, both binding sites are read, and the census shows which one Figma used | a new field means a `code.js` fix and a re-run, never an edit to the export |

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1: the defaults rule (F3).** Figma writes `0` padding, `0` gap, `0` radius and `MIN` main alignment on every
  frame whether or not a designer chose them. The plan carries these **unbound** defaults as absent. Without this,
  every auto-layout frame files four `no-snap-target` rows and a main-axis `prop-shape` row for values nobody set,
  and the import record's loss list fills with noise. A **bound** zero is still a read (the `no-token` path, as
  Brilliant's).
  *Recommended:* ship F3 as written. *Alternative:* carry every zero as `tok(0, null)`, which snaps to "no target".
  That is louder and technically truer to invariant 4. **Decide before B4. The implementer ships F3 unless told otherwise.**
- **Q2: the icon's name is the layer name (F4).** The recipe renames the layer to `caret-right`. A real designer's
  Phosphor instance may be named `CaretRight` or `Icon/caret-right`. The converter reads it verbatim and does not
  normalise, so a miss reaches R4 as a name the subset does not hold, which is a visible refusal. The first real
  file decides whether a normaliser is owed (#311/#316).
- **Assumption.** Variables are available on the owner's Figma plan. The plugin API reads local variables on every
  plan. Only the REST variables endpoint is Enterprise-gated (runbook `:49-51`). Expected, not observed. The run
  confirms it.
- **Assumption.** The recipe's variable names follow the contract's roles, so a bound spacing ref maps by role.
  A designer who names spacing `space/200` gets `no-token` drops, which is correct behaviour. The README states
  that the recipe favours the happy path and that this is the reason.

## NOTES (open canvas)

**Why the plugin is dumb.** A plugin that mapped (auto-layout → `stack`, variable → contract token) would put
rules inside Figma's sandbox, where no CI case reaches them, and every rule change would need a new owner run. A
dump with an allow-list moves every rule into `import/figma.mjs`, which group 40 drives in milliseconds. The cost is
a larger export file, which is irrelevant.

**Why one converter serves branches 1 and 2.** A binding is either in the dump or it is not. `refOf` returns a name
or `null`. `tok(value, null)` is the IR's existing "unbound" shape, which `snap-rules.mjs` consumes. So the
branch changes the **fixture** (bound or unbound) and the **assertions** (`bound` true or false), not the code. That
is why the table's middle rows need no second implementation.

**Why rebuild spike C's list row rather than draw something new.** The same component through both converters is
the only direct test of "reaches the same IR and the same matcher". The README's cross-source table (Brilliant verdict
against Figma verdict, node by node) is that comparison. Differences are expected, since the Figma root is
auto-layout and Brilliant's is not, and they are recorded rather than tuned away.

**Alternatives rejected.**
- (a) Plugin posts to the portal over `localhost`. This needs `networkAccess` and a route, it is #311's territory,
  and it defeats "a file".
- (b) The REST API with the variables endpoint. Enterprise-gated, the reason for G9.
- (c) Copying Penpot's transformer code. The owner's O6 says to read the table and borrow nothing.
- (d) A second `regen-figma-expected.mjs`. That would be two commands to remember when a spec lands.
  CLAUDE.md's bullet names one.

**Confidence (re-scored 2026-09-26): 9.5/10 for one-pass execution.** Every risk in § Risks now has a declared
fallback, so no Figma-side outcome leaves the implementer without a next step. The half point that stays is one
thing no plan edit can remove: the builder (A2b) and the exporter run against Figma for the first time during A5,
and a Figma behaviour the docs do not state (a builder call that throws, an unexpected dump shape) costs one
`code.js` fix and one re-run. That is an extra loop, not a failed ticket. Scoring it 10 would claim a run nobody has made.

**Pre-flight (run 2026-09-24 on a detached worktree at `origin/main` `dbe582b`).**

- **Commands driven:**
  - `node import/regen-expected.mjs --check` → `expected verdict ✓  import/fixtures/spike-c-instance.expected.json — 57579 bytes …` (observed).
  - `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed).
  - `node tooling/build-checks.mjs` → `import-chain ✓`, `import-record ✓`, `icons ✗` (41.7: `tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`) (observed).
  - The group 41 failure is the fresh worktree, not a regression. It became Task 0's GOTCHA.
  - Node `v20.20.2`.
- **Landed claims checked:**
  - `import/figma.mjs` does not exist on main (`git ls-tree`).
  - `tooling/figma/plugin/` does not exist.
  - `sizeDrops` is not exported (`brilliant.mjs:247`).
  - `GROUPS` is not exported (`gen-loc-summary.mjs:22`).
  - `hidden-layer` is not in `DROP_CLASS_OF`.
  - `snap-rules.mjs` already imports from `./brilliant.mjs` (`:54`), which is the precedent for B4.
  - #307 and #304 are CLOSED. #311 is OPEN.
- **What changed because of the pre-flight:**
  - The 40.25 allow-list gained `.css` (`import/fixtures/s3/tokens.polaris.spike.css` exists, so a four-type list
    would red on main).
  - `regen-expected.mjs` can change its return shape (no importer found).
  - F4/F5 were added after reading `recognise.mjs` `nameOf`: a set's variant name would repeat the "Frame 1" defect.
  - The stack spec (`stack.md:30`, cross axis only) and `stackShape`'s main-axis drop produced F3's `MIN` rule.
  - The Figma docs pass turned `variantProperties` into `componentProperties` (deprecated on instances), added the
    `dynamic-page` async getters, and put the Copy fallback in (download unconfirmed).
- **Traps carried in as GOTCHAs:**
  - the fresh-worktree `npm ci`
  - loc-summary reads the index
  - gate prose has three copies
  - the 40.5 census needs literal kinds
  - `portal/lib/figma.mjs` is a different module
  - PR head lags a push
  - never `innerHTML` (CodeQL)

## AMENDMENTS

- 2026-09-26 — implementation pre-flight, commit 1 (plan errors):
  - **40.25's positive control named a file commit 1 cannot have** (`import/fixtures/figma/spike-list-row.export.json`
    arrives in commit 3). Commit 1 proves recursion with `s3/ref.png` plus a `records/` file; commit 3 adds the figma file.
  - **40.25's `readdirSync(…, {recursive:true})` returns directories too** (`s3`, `records`, `overrides` have no
    extension), so it would red on main, and a local `.DS_Store` would too. It walks `git ls-files import/fixtures`
    instead, the index 40.8 and 40.26 read; its REDDENS is `touch … && git add -N`.
  - **B3 falsified 40.8's comment** ("GROUPS is module-private") and the gates.md / group-string phrase "module-private
    regexes". Both edited in commit 1.
  - **The gate prose had to land with 40.25/40.26**, not wait for D2: live checks with no prose leave the three copies
    stale. One sentence for the two cases and one cannot-reach clause (the plugin inside Figma) landed in all three.
  - **Task 0**: branched in a worktree (`../wt-310`), not `git switch` in the shared primary tree.
- 2026-09-26 — R1 addressed at the owner's request: Task A2b adds a **Build S5 fixture** command (the owner's run
  drops from ~30–45 min to ~5, and the hand recipe becomes the fallback), § Execution order lands the
  branch-independent tasks before the run, the manifest gains its `menu`, 40.21 proves the export path writes
  nothing, and § Risks lists each risk with what closes it. Confidence re-scored in NOTES.
- 2026-09-24 — pre-report review: branch-1 assertion split from `bound` (recipe leaves line height unbound); token-export detection made unbounded after measuring both files; vm fake gains `__html__` and `getMainComponentAsync`; chevron pinned to fill; scan kept identical to brilliant's.
