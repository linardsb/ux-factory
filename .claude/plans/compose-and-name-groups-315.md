# Feature: compose-and-name — `group.define` / `group.place`, per-copy overrides, and Promote as admission's second entrance (#315)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Every line number below is against `origin/main` at `b99d9ac`** (read in a detached worktree). Branch from
`origin/main`, not from the primary tree's current branch (`fix/importer-reads-icon-name-449`, which is behind it).

## Feature Description

A saved group is the default way a new part comes to exist on the build canvas (PRD MVP 5, G3, G17). The owner ticks
some parts on a screen, names them, and gets a **definition** (`groups/<id>.json` in the run package). Placing it on
another screen makes an **instance** that follows the definition; a copy may override a text or two (the screen title
in a shared header) through the same `{set, hide}` override shape states and lanes use. "Promote" hands a group to the
same admission path an import takes: a proposal directory whose `source.json` is the group, then #313's ratify.

Two op verbs land (`group.define`, `group.place` — thirteen and fourteen, the last of the architecture's list), one
existing verb gains a param (`component.propose` takes `groupId` as the alternative to `recordId`), `frameTree`
expands instances before any layer applies, the store writes `groups/` as a projection of the ledger, a new
`portal/lib/promote.mjs` writes the proposal, ratify learns a second origin, and the handoff's `flow.md` prints the
composition-vs-admission count.

## User Story

As the owner building a product's flow on the canvas
I want to save a few parts as a named group, drop copies of it on other screens, change one copy's title, and later promote the group to a real component
So that a shared header is designed once, every screen follows an edit to it, and a new component is admitted through the one ratify path with "composed in run X" as its provenance

## Problem Statement

`emptyDoc()` already carries `groups: {}` (`system/canvas-ops.mjs:118`) and nothing reads or writes it. There is no
verb that captures a selection, none that inserts a part into an existing composition (`screen.set` only sets props,
`frameTree` flags and ignores `overrides.add`, `:674`), and `component.propose` requires an import record id
(`:473-475`), so a composed part has no road to admission. The PRD's "Composition over admission" metric
(`canvas-design-import.prd.md:178`) has nothing to count.

## Solution Statement

- **The grammar (pure, `system/canvas-ops.mjs`).** `group.define {name, frameId, partIds, groupId?}` derives the
  definition's parts FROM the frame's resolved tree — the op carries a selection, never parts, so no op can smuggle
  a part that was not on a screen. `groupId` is an **edit target** (annotate's `noteId` rule): re-capture from a new
  selection, refused while any instance overrides a part the new capture drops. `group.place {frameId, groupId?,
  parentId?, index?, instanceId?, overrides?}` inserts `{name: "group", id: <minted>, props: {groupId}, overrides?}`
  into a base frame's composition; with `instanceId` (edit target) it replaces that copy's overrides.
- **Resolution in `frameTree`, not the renderer.** Each instance is expanded before the frame's own layers: the
  definition's parts are cloned, the instance's override applied through `resolve()` keyed by definition part ids,
  every id namespaced `<instanceId>/<partId>`, and the parts spliced into the parent in place of the group node. The
  renderer only ever sees vocabulary names, so `validateComposition` refuses a bad part inside a group for free.
- **The store** writes `build/groups/<id>.json` = `{id, name, parts, provenance: {run, composedFrom}}` from the fold
  on every save (a projection, like `canvas.json`) and `verifyBuild` refuses drift and orphans. F10 is fixed here.
- **Promote** (`portal/lib/promote.mjs`, new) writes `proposals/<name>/{source.json, spec.md, block.css,
  template.txt}` deterministically ("drafted by portal/lib/promote.mjs, not by an agent" — the importer's precedent),
  then appends `component.propose {name, groupId, mode: 1}` through `saveRun`, under the one run lock.
- **Ratify** reads the proposal's origin: an import record, or the group; the spec's Usage line, the CSS header, the
  registry provenance and the pin reason say "composed in run X from group g1" for the second.
- **The count** — `flow.md` gains one section: groups composed and named vs components admitted through the chain.

## Out of Scope / Non-Goals

- **Not replacing the selection with an instance.** Defining a group leaves the source frame's parts where they
  are (the ticket's journey places the group on a *second* frame). Converting the source in place is a later call.
- **Not nesting.** A definition may not contain a placed copy; the refusal names the copy.
- **Not an agent.** No model drafts the promoted spec. The PRD's "the agent drafts the spec from the group's parts"
  (`prd.md:130`) is met the way #311 met it for imports: deterministic drafts labelled as such
  (`portal/lib/import-run.mjs:279`). Nothing agent-drafted is claimed.
- **Not a promoted group ratified as a CONTAINER (`children: "many"`).** Observed in the probe: ratifying
  `app-header` with `children: "none"` runs all ten chain steps green end to end; with `children: "many"` step 10
  reds 37 checks in groups 40, 43 and 46 — a new container with a text slot outscores the matcher's `stack` fallback
  on the committed "Text block" fixture (`import/recognise.mjs`), and group 46's committed Jev request pins move with
  it. The cause is the matcher, not the origin, and ANY such admission hits it; its own ticket (Paid table, row 2).
  A `children: "none"` group admission is in scope and proven (Task 6.6).
- **Not `overrides.add` on an instance.** An instance takes `set` and `hide`; `add` is refused by name (G19's dialogs
  are a state's, and a copy that adds parts is a different group).
- **Not an agent compose tool for groups.** `portal/lib/canvas-session.mjs`'s `screen_compose` tool is unchanged apart
  from `idProblem` reserving `/`.
- **Not changing** `agentic-renderer.mjs` (see D3), `saveBuild`, the lane grammar, `import-run.mjs`'s drafting, or
  CLAUDE.md (its "41 groups" is stale — the real count is 50 — and stays someone else's fix).
- **Not the "elapsed.ratify" stamp for a group.** That field lives on an import record; a group has none (D8 below).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/canvas-ops.mjs`, `system/templates.admitted.mjs`, `portal/lib/canvas-store.mjs`,
`portal/lib/promote.mjs` (new), `portal/lib/ratify.mjs`, `portal/lib/import-run.mjs` (one export),
`portal/lib/canvas-session.mjs` (one line), `portal/server.mjs`, `portal/public/canvas-groups.mjs` (new) +
`canvas.mjs` + `canvas.html` + `canvas-ratify.mjs` (one line), `agent-layer/gen-build-handoff.mjs`,
`tooling/build-checks.mjs` (groups 35, 36, 49, 50), `tooling/canvas-journey.mjs`
**Dependencies**: none new. Node built-ins only; the journey uses the Playwright the other journeys resolve.

## Related Work

**Implements**: #315 (`Closes #315`) · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` § Data model
"One override shape, three uses" (`:122-128`), the op vocabulary (`:139-142`), § Other eng-lead calls
"Compose-and-name is the default; promote is admission" (`:256-259`), Addendum 2026-09-30 (`:418-444`).

**Back-references**:

- `.claude/plans/ratify-write-gate-diff-313.md` — `planRatify`, the declarative registry (D1), `checkAdmitted`'s
  provenance keys, the `ratifySection` form; its Out of Scope names this ticket as Promote's home (`:71-73`).
- `.claude/plans/variant-lanes-handoff-pack-314.md` — `frameTree`'s layer order, `gen-build-handoff`, `withPack` and 49.9.
- `.claude/plans/import-run-recorded-import-311.md` — `writeImport`, `draftProposal`, `underLock`, the proposal dir.
- `.claude/plans/mode2-exhibit-beside-canvas-475.md` + the #475 comment on #315 — `refuseFrozen` on the new verbs with a
  Mode 1 positive control (Task 1.1, 35.17).

**Forward-references**: #319 (the inbox lists proposals pending ratify — reads `status`, now also for `groupId`
proposals) · #316 (run 1 is where the count is first real).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/canvas-ops.mjs` (whole file, 828 lines) — the grammar. `OPS` `:56-69`, `PARAMS` `:74-87`, `OPTIONAL` `:92-97`,
  `PROPOSAL_NAME_RE` `:107`, `emptyDoc` `:118`, `nextId` `:123-127`, `checkOp` `:132-164`, `refuseFrozen` `:189-201`,
  `applyOp` `:216-511` (`annotate`'s edit-target rule `:401-417` is the pattern for both edit targets; `variant.add`'s
  override-shape checks `:428-458` the pattern for an instance override; `component.propose` `:465-481`),
  `resolve` `:541-556`, `canDeleteBasePart` `:584-592` (the refusal shape for a redefine), `frameTree` `:640-691`.
- `portal/lib/canvas-store.mjs` — `loadBuild` `:72-91`, `foldLedger` `:118-140` (undo is LIFO: undoing a
  `group.define` needs its later `group.place` undone first, which is already true), `verifyBuild` `:232-272` (F10's
  regex at `:241`), `saveRun` `:463-495` (write groups after `arrangement` at `:490`, before nothing else is written).
- `portal/lib/import-run.mjs` — `proposalName` `:255-264`, `DRAFTED` `:279`, `draftProposal` `:282-316`,
  `sortKeys`/`jsonText` `:318-321`, `underRoot` `:324-329`, `writeImport` `:333-356` (the write-order rule),
  `runImport`'s op append `:478-491`, `ratifyPrefill` `:509-520` (private today), `importView` `:522-563`,
  `underLock` `:657-663`.
- `portal/lib/ratify.mjs` — `provenanceLine` `:121-125`, `checkInput` `:129-251` (record reads `:167-172`, the def's
  provenance `:248`), `renderSpec` `:287-325` (Usage line `:308`), `renderCssBlock` `:328-335`, `planRatify` `:432-465`
  (pin reason `:438`, `recordSha` `:451`), `readState` `:500-526` (the hard record read `:509`), `runRatify`'s
  record re-stamp `:659-668`.
- `system/templates.admitted.mjs` `:30-33` (`DEF_KEYS`, `PROVENANCE_KEYS`), `:88-95` (`from` must be `"import"`,
  `record` must be `RECORD_RE`).
- `portal/server.mjs` — `withPack` `:444-454`, `/api/canvas/import` `:533-547` (the POST route to mirror),
  `/api/canvas/import/view` `:570-577` (the GET route to mirror).
- `portal/public/canvas.mjs` — `getCanvasPage` `:117`, `describeOp` `:134-148`, `frameParts` `:182-207` (renders
  `frameTree` → `renderComposition`), `applyOwnerOp` `:508-517`, `flush` `:562-596`, `openInspector` `:797-906`
  (`walkParts` + selects at `:851-886` is the pattern for the group fieldsets), `registerConsumers` `:936-975`.
- `portal/public/canvas-ratify.mjs` `:177-190` — `ratifySection(view, {api, reload, provenance, slug, base})`; the gate
  at `:185` reads `view.record?.provenance?.mode`.
- `portal/public/canvas-import.mjs` `:100-124` (`done`/post pattern), `:360-378` (mounting `ratifySection`).
- `portal/lib/canvas-session.mjs` `:251-262` — `idProblem`.
- `agent-layer/gen-build-handoff.mjs` — `renderFlow` `:62-81`, `renderPack` `:162-172`.
- `tooling/build-checks.mjs` — group 35 `:11233-11884` (35.1 `:11258-11262`, 35.2 `VALID_FOR` `:11277-11300`, `fold`
  `:11311-11313`, the positive-control loop `:11483-11500`, 35.10 `:11590-11622`, 35.12 `:11638-11672`, 35.14
  `:11716-11746`, 35.16 `:11848-`); group 36 `:11887-12229` (per-package `verifyBuild` `:11944`, 36.12 `:12204-12219`);
  group 49 `:16587-16745` (49.9 `:16727-16743`); group 50 (the last group, "ratify").
- `tooling/canvas-journey.mjs` — header `:1-60`, `seed()` `:261-294`, `ledger`/`waitLines` `:295-303`, `openCanvas`
  `:306`, `openDetails` `:341`, `leg()` `:355` (passes called `:634-660`), `lanesPass` `:674-780` (the shape to copy),
  `seedMeasure` `:1294-1310` (in-process seeding precedent).
- `system/specs/stack.md:16` (allowed children: `screen-header`, `ghost-button`, `icon`, …), `system/specs/screen-header.md:7-15`
  (`title` required), `system/specs/icon.md:7-10` (`name` + `size` required), `system/icons.manifest.json`
  (`arrow-left`, `caret-right`, `check`, `info`, `warning`, `x`).
- `.claude/references/gates.md:59` (group 35's entry, "a thirteenth verb"), `:61` (group 36's).

### New Files to Create

- `portal/lib/promote.mjs` — Promote: group → proposal dir + one `component.propose` line, under the run lock.
- `portal/public/canvas-groups.mjs` — the inspector's three group fieldsets and the rail's Promote result.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/canvas-design-import.architecture.md:101-142` (data model: the `group` shape, "one override shape, three
  uses", the dangling-override rule, the op list) and `:418-444` (#313's addendum — the template is data).
- `docs/epics/canvas-design-import.prd.md:127-130` (MVP 5: G3, G17), `:178` (the metric).
- `discovery/README.md:638` and `:647` — "`groups/` is still LATER (#315)" (updated in Task 7.2).
- `.claude/references/gates.md` group 35/36/49/50 entries — the voice every new case is written in.

### Patterns to Follow

**An edit target, never a minted id** (`canvas-ops.mjs:405-414`):
```js
if (p.noteId !== undefined) {
  const n = next.notes.find((x) => x && x.id === p.noteId);
  if (!n) throw new Error(`annotate: noteId "${p.noteId}" does not resolve — this document holds … an op names a note to EDIT, never the id of one it creates`);
```

**A refusal names every blocker** (`canDeleteBasePart`, `:584-592`):
```js
throw new Error(`cannot delete part "${partId}" from "${baseId}": ${blockers.map((b) => `${b.stateKey} (${b.id})`).join(", ")} still override it — drop the override first`);
```

**An override's shape, refused by path** (`variant.add`, `:449-457`) — copy the `set`/`hide` checks verbatim in
meaning, with the path `group.place: overrides.set` etc.

**Minting** (`component.propose`, `:479`): `nextId("pr", new Set(next.proposals.map((x) => x.id)))`.

**Errors**: plain `Error`, message names the verb, the offending value and what would fix it. **Reads** are total over
junk (`:526-533`): skip a malformed item, never throw.

**Assertions** (build-checks): `ok(cond, message)`; `threw(fn)`; `names(fn, ...words)` → `null` when the throw names
every word; every constructive call through `fold()`; positive control FIRST.

---

## DECISIONS (settled — do not reopen)

- **D1 — Promote's source is a `groupId` on `component.propose` (owner, 2026-09-30).** `PARAMS["component.propose"]`
  becomes `["name", "recordId", "groupId", "mode"]`, both ids optional, exactly one required; `groupId` must resolve
  in `doc.groups`, must come with `mode: 1`, and one proposal per group. No synthetic import record is ever written.
- **D2 — two verbs with optional edit targets (owner, 2026-09-30).** `group.define`'s `groupId` and `group.place`'s
  `instanceId` are edit targets that must resolve (annotate's rule). The op count ends at **fourteen**; the PR body
  states it as final.
- **D3 — resolution is `frameTree`'s, not the renderer's.** `agentic-renderer.mjs` has no document and no
  `doc.groups`; expanding in `frameTree` means the renderer, `flowEdges`, the handoff and the page all read one
  expansion, and `validateComposition` sees real vocabulary names only. The ticket's file estimate listed the
  renderer; this is the stated divergence, recorded in the architecture addendum (Task 7.2).
- **D4 — expansion order and ids.** For each group node in the cloned base composition, before the frame's own
  layers: (1) clone the definition's parts; (2) flatten to `{partId: props}`, fold `resolve({parts}, instance.overrides)`
  (keyed by DEFINITION ids), write props back, drop hidden nodes, re-label each flag with `instanceId`; (3) rename every
  id to `<instanceId>/<partId>`; (4) splice the parts into the parent's `children` where the group node was. Then the
  existing flatten → layers → write-back runs unchanged. Without (3), two copies of one group share ids and an
  override on one lands on both (first-occurrence-wins flatten, `:663`). `/` is RESERVED in part ids: `group.define`
  refuses a selected id containing it, `idProblem` refuses it on the agent path, and the instance id minted by
  `group.place` never contains it.
- **D5 — the definition is DERIVED from a selection, not carried.** `group.define {name, frameId, partIds, groupId?}`:
  the applier reads `frameTree(next, frameId)` (lane A), takes each selected subtree in DOCUMENT order, refuses an id
  that does not resolve, an id selected twice, an id whose ancestor is also selected, and any subtree containing a
  placed copy (an id with `/`). Stored: `doc.groups[g<n>] = {id, name, parts, composedFrom: {frameId, partIds}}` with
  `partIds` in document order. `name` matches `PROPOSAL_NAME_RE` (a group's name is the component name Promote will
  propose) and is unique among groups; refused, never normalised.
- **D6 — the instance.** `group.place` refuses a state frame (a state inherits its base's copies), requires `parentId`
  to name a node with an `id` and a `children` array in the RAW `frame.composition` (not a group node, not inside a
  copy), `index` an integer `0..children.length` (default: append), `overrides` keys ⊆ `GROUP_OVERRIDE_KEYS =
  ["set", "hide"]` (frozen, exported), `add` refused by name. Instance id = lowest free `<groupId>-<n>` over every id in
  every frame's composition (`g1-1`, `g1-2` …), so two copies anywhere are `g1-1` and `g1-2`. An override naming a
  part the definition does not have is STORED and FLAGGED at render (`dangling-set`/`dangling-hide` with
  `instanceId`) — the architecture's rule and `state.add`'s behaviour. A redefine that drops a part some instance
  overrides is REFUSED, naming every blocking `frameId instanceId` pair.
- **D7 — `groups/` is a projection.** `groupFiles(doc, run)` → `{"g1.json": {id, name, parts, provenance: {run,
  composedFrom}}}`; `saveRun` writes it after `arrangement` (so a throwing fold writes nothing) and deletes any
  `groups/*.json` the fold no longer derives (an undone define). `loadBuild` returns `groups` (`{}` when the dir is
  absent) and `run` (`basename(dirname(root))`). `verifyBuild` compares when `groups !== undefined` (so every existing
  `{ops, canvas}` caller is unaffected): a missing file, an orphan and a differing file each named.
- **D8 — ratify's origin (proven end to end in the probe, `…-probe/ratify-promote-results.md`).** Keep every
  existing signature ACCEPTING a bare `record`: a private `originOf(x)` turns a bare record into `importOrigin(record)`,
  and `importOrigin`/`groupOrigin` are exported, because 50.6 and 50.8 call `planRatify({record})` and patch the record
  directly. `readState` refuses `{kind: "no-group"}` when `doc.groups[groupId]` is missing. For a group, `runRatify`
  returns `ok` straight after the append (no record to stamp, no `elapsed.ratify`). `readState` resolves `origin = {kind: "import", id: recordId, record}` or `{kind: "group",
  id: groupId, group: doc.groups[groupId], run}`. Five sites branch on `origin.kind`: `provenanceLine`
  (`composed in run <run> from group <id> (<name>), licence: …`), `checkInput`'s `record.source` control-char check
  (import only; a group name already matches `PROPOSAL_NAME_RE`), the def's `provenance` (`{from: "group", record:
  "g1", run, line}` — the key stays `record`, `checkAdmitted` accepts `from ∈ {import, group}` with `RECORD_RE` for
  import and `/^g[1-9][0-9]*$/` for group), `renderSpec`/`renderCssBlock`/the pin reason, and the green branch's record
  re-stamp (skipped for a group — there is no record to stamp). The hash's `recordSha` is the sha of
  `jsonText(sortKeys(origin.record ?? origin.group))`. **Observed strings (use verbatim):** Usage —
  ``Admitted by ratify (portal/lib/ratify.mjs) from group `g1` in run `fp-groups`: composed in run fp-groups from group g1 (app-header), licence: <licence>.``;
  CSS header — `/* ---------- ds-app-header (system/specs/app-header.md) — admitted by ratify from group g1 ---------- */`;
  registry — `{from: "group", record: "g1", run: "<run>", line: "composed in run <run> from group g1 (app-header), licence: …"}`.
- **D9 — the count, defined once.** `compositionCount(doc)` (in `gen-build-handoff.mjs`, Node-only, no LOC cost):
  `composed` = `Object.keys(doc.groups).length`; `admitted` = proposals with `status === "ratified"`, split
  `fromImport` (has `recordId`) and `fromGroup` (has `groupId`); `placed` = instances across all frames. A promoted
  and ratified group counts in BOTH `composed` and `admitted.fromGroup` — it was composed, and it was then admitted.
  Printed in `flow.md` under `## Composition over admission`, before the lanes.
- **D10 — F10 (from PR #485) is fixed here**, because an instance's `overrides.set` is keyed by part id and a part
  called `x` would red `verifyBuild` with no repair (append-only): the position check reads only the line's own keys
  and its `params`' own keys (`Object.hasOwn`), which is where a position could ever be written.

---

## IMPLEMENTATION PLAN

### Phase 1: The grammar — `system/canvas-ops.mjs`
Two verbs, the `component.propose` param, the expansion in `frameTree`, one read. Pure; nothing else depends on disk.

### Phase 2: The store — `portal/lib/canvas-store.mjs`
**Depends on:** Phase 1. `groups/` written and verified; F10.

### Phase 3: Promote and ratify's second origin
**Depends on:** Phases 1–2. `promote.mjs`, `ratify.mjs`, `templates.admitted.mjs`, the routes.
**Independent of:** Phase 5 (the handoff count) — can run in parallel.

### Phase 4: The page
**Depends on:** Phases 1–3.

### Phase 5: The handoff count
**Depends on:** Phase 1 only.

### Phase 6: Gates and the journey
**Depends on:** all above. Group cases are written alongside their phase where noted; the journey last.

### Phase 7: Docs and regenerations

---

## STEP-BY-STEP TASKS

### Task 1.1 — UPDATE `system/canvas-ops.mjs` — verbs thirteen and fourteen

- **IMPLEMENT**:
  - `OPS` gains `"group.define"`, `"group.place"` after `"proposal.ratify"`; rewrite the roster comment `:51-55`
    ("#315's group.define and group.place are the last two of the architecture's fourteen; the count is final") and
    `:506` ("the day a fifteenth verb …").
  - `PARAMS`: `"group.define": ["groupId", "name", "frameId", "partIds"]`, `"group.place": ["frameId", "groupId",
    "parentId", "index", "instanceId", "overrides"]`; `"component.propose": ["name", "recordId", "groupId", "mode"]`.
    Each inner array frozen.
  - `OPTIONAL`: `"group.define": ["groupId"]`, `"group.place": ["groupId", "parentId", "index", "instanceId",
    "overrides"]`, `"component.propose": ["recordId", "groupId"]`.
  - Exports: `GROUP_OVERRIDE_KEYS = Object.freeze(["set", "hide"])`, `PART_SEP = "/"`.
  - Private helpers: `walkNodes(tree, fn)` (children only, like `frameTree`'s `walk`); `allPartIds(doc)` (every `id`
    in every frame's `composition`, for minting); `instancesIn(frame)`.
  - `case "group.define"` per D5, refusals in this order (observed working in the probe): name → `partIds` shape →
    an id selected twice → an id containing `/` → the `groupId` edit target resolves → duplicate name → the frame
    resolves → the selection resolves. Detail: name check → `partIds` array of distinct non-empty strings without `PART_SEP` →
    `const t = frameTree(next, p.frameId)` (a function declaration, hoisted) → refuse `t.tree === null` naming the
    flag kind → resolve each id in `t.tree`, refuse unknown / ancestor-selected / subtree-with-`/` → `parts` in
    document order, `structuredClone` → `refuseFrozen("group.define", parts, next)` → create (`nextId("g", new
    Set(Object.keys(next.groups)))`) or edit (`groupId` must resolve; D6's redefine refusal naming every blocking
    instance; then replace `name`, `parts`, `composedFrom`). `next.groups ??= {}` beside the other `??=` at `:230-232`.
  - `case "group.place"` per D6: create when `instanceId === undefined` (requires `groupId` + `parentId`; refuses
    `instanceId`-mode keys), edit when `instanceId !== undefined` (requires `overrides`; refuses `groupId`, `parentId`,
    `index` by name). `refuseFrozen("group.place", group.parts, next)` on create.
  - `component.propose` (`:465-481`): exactly one of `recordId`/`groupId` ("give recordId or groupId, exactly one —
    this op carried neither/both"); the existing `recordId` checks run only when it is given; `groupId` must match
    `/^g[1-9][0-9]*$/` and resolve in `next.groups`; `mode !== 1` with a group refused ("a composed group is never a
    frozen original"); a second proposal for the same group refused ("one proposal per group"); the entry is `{id,
    name, groupId, mode, status}` (no `recordId` key).
- **PATTERN**: `annotate` `:401-417` (edit target), `variant.add` `:428-458` (override shape by path),
  `canDeleteBasePart` `:584-592` (blocker list), `component.propose` `:479` (minting).
- **IMPORTS**: none new (the module imports `device-presets.mjs` only; 35.9 pins it).
- **GOTCHA**: `checkOp` runs `plainData` and the exact-key check before the case — an edit-mode op carrying `groupId`
  passes `checkOp` (it is in `PARAMS`) and must be refused in the CASE by name. `frameTree` reads `doc.groups`, so
  expansion must be total over a document with no `groups` key (pre-#315 packages). Do not store `hidden` on any part.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(m=>console.log(m.OPS.length, Object.keys(m.PARAMS).length))'` → `14 14` (expected; today it prints `12 12`, observed).
- **REDDENS**: see Task 6.1 (35.1, 35.17).
- **SATISFIES**: AC #1, AC #4 (the applier is filesystem-blind).
- **REGENERATES**: `system/loc-summary.json` (runtime group; Task 7.3), approach baselines ×3 (Task 7.4).

### Task 1.2 — UPDATE `system/canvas-ops.mjs` — `frameTree` expands copies (D4), and one read

- **IMPLEMENT**:
  - In `frameTree` (`:640-691`), after `const tree = structuredClone(base.composition);` (`:656`) and before the
    `parts` flatten (`:657`), call a private `expandGroups(tree, doc?.groups, flags)` per D4. Unknown `groupId` →
    flag `{kind: "unknown-group", partId: node.id}` and drop the node. A group node as the ROOT → flag
    `group-root` and return `tree: null` (unreachable through `group.place`, which needs a parent). The existing
    `hidden` rule, the layers and the write-back then run unchanged over the expanded tree.
  - `export function groupInstances(doc)` → `[{frameId, instanceId, groupId, overrides}]`, every group node in every
    frame's raw composition, frame order then document order. A read: total over junk. Used by D6's redefine refusal
    (inside the applier), the page, and `compositionCount`.
  - Update `frameTree`'s header comment (`:627-639`): "a placed copy is expanded first (#315, D4)".
  - **Observed in the probe:** `const flags = []` (`:665`) moves ABOVE the expansion call and its original declaration
    is deleted; the private `walkNodes` must accept an ARRAY (a definition's `parts` is one).
- **PATTERN**: `frameTree`'s own `walk` `:658-662`; `resolve` `:541-556` for step 2 (do not write a second merge).
- **GOTCHA**: `flowEdges` (`:793-810`) walks `frameTree(...).tree` for `partText` — an arrow's `partId` naming a part
  inside a copy must use the namespaced id (`g1-1/help`); nothing to change, but 35.17 asserts it once.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|build ✓|✗"` → `canvas ops ✓` once Task 6.1 lands (expected).
- **REDDENS** (observed in the probe, `.claude/plans/compose-and-name-groups-315-probe/phase1-results.md`): remove
  step (3) → 8 failures, the first "35.17a f2's tree does not hold the expanded copy g1-1/header" (the override still
  lands before the rename; what breaks is every lookup by namespaced id); drop the `resolve` call in step (2) → 4
  failures across 35.17c/f, including "a dangling copy override was not flagged with its copy: []".
- **SATISFIES**: AC #1 ("both follow", "only it differs"), the ticket's "vocabulary refusal still applies to every part inside".
- **REGENERATES**: counted in Task 1.1's.

### Task 2.1 — UPDATE `portal/lib/canvas-store.mjs` — `groups/` as a projection (D7) + F10 (D10)

- **IMPLEMENT**:
  - `export const GROUPS_DIR = "groups"`; `export function groupFiles(doc, run)` → `{[`${id}.json`]: {id, name, parts,
    provenance: {run, composedFrom}}}` in id order.
  - `loadBuild(root)` (`:72-91`) also returns `groups` (parse each `groups/*.json`, a bad file throws naming it, `{}`
    when absent) and `run: basename(dirname(root))`. Returning `null` when neither ledger nor canvas exists is unchanged.
  - `saveRun` (`:463-495`): after `const canvas = arrangement(doc, positions);` (`:490`) compute `groupFiles(doc,
    basename(pkgRoot))`; after the ops append and canvas write, write each `groups/<id>.json` with `jsonText`'s
    `JSON.stringify(v, null, 2) + "\n"` shape and `rmSync` any `groups/*.json` not derived. Import `rmSync`,
    `basename`, `dirname`.
  - `verifyBuild({ops, canvas, groups, run})`: when `groups !== undefined`, compare `groupFiles(folded, run)` to it —
    `groups/<f> is missing, which the ops derive`, `groups/<f> carries a fact the ops do not`, `groups/<f> is …, the
    ops derive …` (use `canon`).
  - F10: replace `:241` with a check of `Object.keys(l ?? {})` and `Object.keys(l?.params ?? {})` for `x`/`y`
    (`Object.hasOwn`), message unchanged. Update the header of `verifyBuild` in one sentence.
  - Header (`:24-33`): a third file kind, `groups/<id>.json`, a whole-file rewrite like canvas.json.
- **PATTERN**: `writeBuildHandoff`'s render-before-rm order (`agent-layer/gen-build-handoff.mjs:209-220`).
- **GOTCHA**: 36.6 pins the store's imports to node built-ins plus `canvas-ops.mjs` — adding `rmSync`/`basename` from
  `node:fs`/`node:path` keeps it green (observed rule: built-ins allowed). Do NOT import `import-run.mjs` here.
  `canvas-journey.mjs` passes `loadBuild(...)` straight to `verifyBuild` in six places (`:598 :771 :1211 :1230 :1504
  :1622`) — they now also verify groups, which is what we want; none of those packages has groups, so `{}` vs `{}`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "build package|build ✓"` → `build package ✓` (expected, after Task 6.2).
- **REDDENS**: 36.13 (Task 6.2).
- **SATISFIES**: AC #1 ("→ a file"), AC #4.
- **REGENERATES**: none (no committed package has groups; `discovery/faster-payment/build/` bytes unchanged).

### Task 2.2 — UPDATE `portal/lib/canvas-session.mjs:251-262` — `idProblem` reserves `/`

- **IMPLEMENT**: one more refusal: an id containing `/` — "`/` is reserved: a placed copy's parts are named
  <copy>/<part> (#315)".
- **VALIDATE**: `idProblem` is private and group 47 drives it through `fileProposal`. Beside the existing
  `ledgerRefusal("an id-less child", "ids", …)` (`build-checks.mjs:16140`, group 47 starts `:15935`) add
  `ledgerRefusal("an id with a slash", "ids", screenTurn({ …, composition: STACK([{ name: "text", id: "a/b", props: {
  role: "body", content: "x" } }], "root") … }), "reserved")`. `node tooling/build-checks.mjs 2>&1 | grep "^build compose session"` → ✓ (expected).
- **REDDENS**: remove the check → the new `"a/b"` case reds (the proposal is filed instead of refused).
- **SATISFIES**: D4.
- **REGENERATES**: none.

### Task 3.1 — UPDATE `portal/lib/import-run.mjs` — export the prefill

- **IMPLEMENT**: `export function ratifyPrefill(name, decls, vocab)` — the body of `:509-520` with `rootDeclarations(record.ir.children[0])`
  moved to the one caller in `importView` (`:562`). Behaviour byte-identical for imports.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import run|ratify ✓"` → both ✓ (expected; group 43's
  view cases cover the prefill).
- **SATISFIES**: AC #2 (the promoted proposal's form).
- **REGENERATES**: none.

### Task 3.2 — CREATE `portal/lib/promote.mjs`

- **IMPLEMENT**:
  - Header: epic #295 ticket #315, G17; "one admission path, two entrances"; invariants: (1) no SDK, no model — imports
    node built-ins, `canvas-store.mjs`, `import-run.mjs` (`underLock`, `underRoot`, `jsonText`,
    `sortKeys`, `ratifyPrefill`, `isProposalName`), `env.mjs` (`REPO_DIR`); (2) nothing written outside
    `<pkg>/build/proposals/<name>/`; (3) drafts are deterministic and say so on their first line; (4) the op is
    appended last, through `saveRun`, and only after every file is written.
  - `export function draftFromGroup({name, group, run})` → `{"spec.md", "block.css", "template.txt"}`, pure. First line
    of each: `drafted by portal/lib/promote.mjs from group <id> (<group name>), composed in run <run> — not by an agent;
    props, states, behaviour and the accessibility model are the owner's at ratify (#313)`. Spec head `{component,
    status: "proposed", class: "vd-<name>", props: {}, tokens: [], states: [], children: []}`, then `## Provenance`
    (group id, run, composed from `<frameId>` parts `<ids>`, the parts as `- <id> · <name>`), then the four empty
    sections `draftProposal` writes. CSS: the header line and an empty `.vd-<name> {}` with the "carries no contract
    token" comment. Template: `{note, compositions: [group.parts]}`.
  - `export function promoteName(groupName, {taken, vocabNames})` — `groupName` if free, else `-2`, `-3` … (the
    `proposalName` suffix rule, `import-run.mjs:259-263`).
  - `export async function promoteGroup({pkgRoot, base, groupId, repoDir = REPO_DIR, now})` → `underLock(async () => {…},
    "a promote")`: `saveConflict` (throw, like `runImport` `:430-431`) → fold → group must resolve, else `{refused:
    {kind: "no-group", …}}` → already proposed (`doc.proposals.some(p => p.groupId === groupId)`) → `{refused: {kind:
    "already-promoted", …}}` → name (taken = `readdirSync(build/proposals)` if present; vocab from
    `repoDir/handoff/verdant/vocabulary.json`) → resolve every target with `underRoot` BEFORE the first write → write
    `source.json` (= `jsonText(groupFiles(doc, run)[`${groupId}.json`])`, byte-equal to `groups/<id>.json`),
    `spec.md`, `block.css`, `template.txt` → `saveRun(pkgRoot, {base: pkg.ops.length, ops: [{op: "component.propose",
    params: {name, groupId, mode: 1}, status: "applied"}], positions: positionsOf(pkg.canvas), decisions:
    loadDecisions(pkgRoot)})` → return `{name, groupId, count, view: promoteView(pkgRoot, name)}`.
  - `export function promoteView(pkgRoot, name, {repoDir})` → `{name, groupId, mode: 1, status, component, dir:
    "build/proposals/<name>/", source (the parsed source.json), ratifyPrefill: ratifyPrefill(name, [], vocab), label:
    "composed in run <run> from group <id> · drafted by portal/lib/promote.mjs, not by an agent"}`; throws naming the
    path when the dir or `source.json` is absent.
- **PATTERN**: `runImport` `:424-497` (lock, conflict, write-then-append), `writeImport` `:333-356` (resolve before
  write), `importView` `:522-563` (the view).
- **IMPORTS**: check `positionsOf` and `loadDecisions` are exported by `canvas-store.mjs` (`import-run.mjs` imports
  them — copy its import line).
- **GOTCHA**: never write `mapping.json` (there is no read to map; `importView` must not be called on a group
  proposal — `ratifySection` gets `promoteView`'s shape instead). A second Promote of the same group must refuse
  BEFORE any file is written.
- **VALIDATE**: `node -e 'import("./portal/lib/promote.mjs").then(m=>console.log(Object.keys(m).sort().join(" ")))'` →
  `draftFromGroup promoteGroup promoteName promoteView` (expected).
- **REDDENS**: 50.17–50.19 (Task 6.4).
- **SATISFIES**: AC #2 ("the proposal dir exists with the group as its source"), AC #4 ("only promote reaches the proposal path").
- **REGENERATES**: none (`portal/` is in no loc group).

### Task 3.3 — UPDATE `system/templates.admitted.mjs:88-95` + `portal/lib/ratify.mjs` — the second origin (D8)

- **IMPLEMENT**: `checkAdmitted`: `from` ∈ `["import", "group"]` (a frozen `PROVENANCE_FROM` beside `PROVENANCE_KEYS`);
  `record` checked with `RECORD_RE` for import and `/^g[1-9][0-9]*$/` for group, each message naming which. In
  `ratify.mjs`: `readState` builds `origin` (D8) — a group proposal reads `doc.groups[proposal.groupId]` and never
  touches `imports/`; thread `origin` through `provenanceLine`, `checkInput`, `renderSpec`, `renderCssBlock`,
  `planRatify` (and its hash) — each still accepting a bare `record` (D8); the green branch re-stamps the import record
  only when `origin.kind === "import"`. Strings: D8's observed ones, verbatim.
  **Reference implementation:** `.claude/plans/compose-and-name-groups-315-probe/ratify-promote.patch.txt` (Tasks 2.1,
  3.1, 3.2, 3.3; its canvas-ops part is a MINIMAL stand-in — take the grammar from `phase1.patch.txt`).
  **Byte-identity proof (run before and after):** `digest.mjs.txt` in the probe dir reproduces 50.6's scaffold with
  the anchors read from `git show HEAD:<anchor>` (Task 3.3 edits `templates.admitted.mjs`, which is also an anchor
  ratify rewrites) and prints the plan hash plus a sha per write; observed identical before and after (hash
  `66eaf7e1…`).
- **PATTERN**: the existing sites listed in D8, one branch each; keep the import strings byte-identical (group 50's
  committed expectations must not move).
- **GOTCHA**: 50.6/50.7 assert the import path's bytes and hash inputs — renaming the hash's `recordSha` key changes
  every hash; keep the key name and feed it the origin's object.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build ratify"` → `✓` (expected, after Task 6.4).
- **REDDENS**: 50.18 (Task 6.4).
- **SATISFIES**: the ticket's "the admitted spec header reads 'composed in run X'".
- **REGENERATES**: runtime loc (templates.admitted.mjs is `system/*.mjs`) — covered by Task 7.3.

### Task 3.4 — UPDATE `portal/server.mjs` — two routes

- **IMPLEMENT**: after the ratify routes, `if (p === '/api/canvas/promote' && req.method === 'POST') {` — `readBody` →
  `resolveRunRoot` + `assertProvenanceRoot` → `saveConflict(path.join(root, 'build'), b.base)` → 409 → `typeof b.groupId
  === 'string' && /^g[1-9][0-9]*$/.test(b.groupId)` else 400 → `json(res, 200, withPack(root, await promoteGroup({pkgRoot:
  root, base: b.base, groupId: b.groupId})))`. And `if (p === '/api/canvas/promote/view' && req.method === 'GET') {`
  mirroring `/api/canvas/import/view` (`:570-577`) with `promoteView`. Keep the exact `if (p === '…' && req.method ===
  '…') {` shape: 49.9's regex (`build-checks.mjs:16729`) finds routes by it.
- **VALIDATE**: portal smoke on a free port, own PID only (memory: never kill by name or port):
  `cd portal && PORT=0 node server.mjs & PID=$!; …; curl -s localhost:<port>/api/health; kill $PID` → `/api/health`
  answers (expected). `portal/node_modules` must exist (`cd portal && npm ci` in a fresh worktree).
- **REDDENS**: 49.9 (Task 6.3) — drop `withPack(` from the promote route → "write into a build package without withPack(".
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### Task 4.1 — CREATE `portal/public/canvas-groups.mjs`; UPDATE `canvas.mjs`, `canvas.html`, `canvas-ratify.mjs`

- **IMPLEMENT**:
  - `canvas-groups.mjs` exports `groupFieldsets(f, {view, doc, emitFrom, lane})` → an array of fieldsets for
    `openInspector`, empty when `lane !== null` (group ops are lane A's):
    1. **"Save parts as a group"** — a checkbox per id'd node of `frameTree(view, f.id).tree` whose id has no `/`
       (label `<id> · <name>`, `data-group-part=<id>`), a name input (`data-group-name`), a select `Save as`
       (`data-group-target`: "a new group" + each existing group), button `data-group-define` →
       `emitFrom("ui.group-define", e, {partIds, name, groupId?})`.
    2. **"Place a group"** (base frames only) — group select (`data-group-pick`), parent select over RAW
       `f.composition` nodes with an id and a `children` array (`data-group-parent`), button `data-group-place` →
       `ui.group-place {groupId, parentId}`; beside it **Promote** (`data-group-promote`), which posts (below).
    3. **"Copies on this frame"** (when `groupInstances(doc)` has any for `f.id`) — instance select
       (`data-group-instance`), part select over the definition's text props (`label content hint placeholder title`),
       value input, button `data-group-override` → `ui.group-place {instanceId, overrides}` (merged over the copy's
       current overrides).
    - `promote(groupId)` — refuse on the page with `canvas.say` while `getCanvasPage().pending.length` (a save is
      in flight; the server's 409 is the second line), else POST `/api/canvas/promote {provenance, slug, base:
      getCanvasPage().count, groupId}`; a `refused` body is shown, a 200 reloads at `?promoted=<name>` (the import's
      post-and-reload rule, `canvas-import.mjs:100-112`).
    - `mountPromoted(name)` — on boot, when `?promoted=` is present, GET `/api/canvas/promote/view` and render into the
      rail's `[data-groups-panel]`: the label, the dir, and `ratifySection(view, {api, provenance, slug, base, reload})`.
  - `canvas.mjs`: import `groupInstances` and `groupFieldsets`; `openInspector` inserts the fieldsets after `laneSet`;
    `registerConsumers` gains `ui.group-define` → `applyOwnerOp({op: "group.define", params: {name, frameId, partIds,
    ...(groupId && {groupId})}})` + `canvas.say("Group <id> <name> saved from <n> parts of <frame>.")`, and
    `ui.group-place` (create or edit) + a say naming the copy's id; `describeOp` gains `group.define` ("saved group
    <name>" / "redefined <groupId>"), `group.place` ("placed <groupId> on <frameId>" / "overrode <instanceId>"), and
    `component.propose` with a `groupId` ("proposed <name> from group <groupId>"); boot calls `mountPromoted`.
  - `canvas.html`: one rail `<section class="cv-groups" data-groups-panel hidden>` beside `data-compose-panel`.
  - `canvas-ratify.mjs:185`: `(view.mode ?? view.record?.provenance?.mode) !== 1`.
- **PATTERN**: the lane editor in `openInspector` `:851-886`; `emitFrom` `:800-803`; `applyOwnerOp` `:508-517`; the
  import's `done()` `canvas-import.mjs:104-112`.
- **GOTCHA**: every fetched string is `textContent` (canvas-ratify's call 3). A new control needs a 44×44 target
  (the journey asserts target sizes on the inspector). The page is an OPERATOR page — no `param-manifest.json` entry
  (that is for shipped pages). `hidden` on the rail section: check no author `display` rule defeats it (memory
  `hidden-defeated-by-author-display`).
- **VALIDATE**: `node --check portal/public/canvas-groups.mjs && node --check portal/public/canvas.mjs` → silent (expected); then Task 6.5.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### Task 5.1 — UPDATE `agent-layer/gen-build-handoff.mjs` — the count (D9)

- **IMPLEMENT**: `export function compositionCount(doc)` → `{composed, placed, admitted: {total, fromImport, fromGroup}}`
  (uses `groupInstances`). `renderFlow` pushes, after the title paragraph and before the first lane:
  `## Composition over admission`, blank, `- Composed and named: <composed> group(s), <placed> placed cop(y|ies).`,
  `- Admitted through the chain: <total> (<fromImport> from imports, <fromGroup> from promoted groups).`, blank,
  `A promoted group that is ratified counts in both lines (PRD § Success metrics, "Composition over admission" — reported, no target).`
  Add `groupInstances` to the canvas-ops import; mention the section in the header's list (`:3-7`).
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs --check` → drift on both committed packs until regenerated
  (expected); then `node agent-layer/gen-build-handoff.mjs` and `--check` clean.
- **REDDENS**: 49.11 (Task 6.3).
- **SATISFIES**: AC #3.
- **REGENERATES**: `discovery/faster-payment/build/handoff/flow.md`, `tooling/fixtures/builds/two-lane/build/handoff/flow.md` —
  `node agent-layer/gen-build-handoff.mjs`. 49.2 byte-compares both.

### Task 6.1 — UPDATE `tooling/build-checks.mjs` group 35

- **IMPLEMENT**:
  - 35.1: `COPS.length === 14`, message "the same fourteen verbs — #302's six, #306's four, #311's one, #313's one and
    #315's two"; the id-slot assertion also refuses `CPARAMS["group.place"].includes("id")` and
    `CPARAMS["group.define"].includes("id")`. Fix the header's stale "a seventh verb" (`:11239`) → "a fifteenth verb".
  - 35.2 `VALID_FOR`: `"group.define": { name: "app-header", frameId: "f3", partIds: ["title"] }`, `"group.place": {
    frameId: "f3", groupId: "g1", parentId: "screen" }`.
  - The positive-control setup (`:11489-11496`) gains, after `kept-row`: `{ op: "screen.compose", params: {
    ...VALID_FOR["screen.compose"], screenId: "home", composition: { name: "stack", id: "screen", children: [{ name:
    "text", id: "title", props: { role: "heading", content: "Home" } }] } } }` (→ f3) and `{ op: "group.define", params:
    { name: "kept-group", frameId: "f3", partIds: ["title"] } }` (→ g1). Every other verb's control still meets a
    document that owes it nothing (checked: `state.add` uses f1, `frame.remove` f2, `connect` f1→f2).
  - **35.17 compose-and-name (#315)** — positive control first, then:
    a. AC #1's chain on one document: compose `home` (stack `screen` with `screen-header` `header` {title "Home"},
       `ghost-button` `help` {label "Help"}, `icon` `mark` {name "info", size "md"}) → `group.define` all three → one
       `g1` with three parts in document order and `composedFrom` → compose `pay` (stack `screen`) twice (f2, f3) →
       `group.place` on f2 and f3 → instances `g1-1`, `g1-2`; `frameTree(f2)` holds `g1-1/header` etc.
    b. redefine `g1` from a relabelled `help` (`screen.set` on f1 then `group.define {groupId: "g1", …}`) → both copies
       read the new label (**"both follow"**).
    c. `group.place {instanceId: "g1-2", overrides: {set: {header: {title: "Add a payee"}}}}` → f3 reads "Add a
       payee", f2 still "Home" (**"only it differs"**).
    d. redefine `g1` without `header` → refused naming `g1-2` and `header` (**"remove a definition part under
       override → refused"**); the same redefine WITHOUT the override in place is accepted (control).
    e. (fixture rule from the probe: the helper uses a FRESH name such as `probe-group`; only the duplicate-name case
       passes `app-header`, or three cases hit the duplicate-name refusal first) refusals by name: unknown frame, unknown part id, a part selected twice, a selected ancestor, a selection
       containing a copy (`g1-1/header`), a name failing `PROPOSAL_NAME_RE`, a duplicate name, an unknown `groupId`
       edit target; place on a state frame, an unknown parent, a parent with no `children`, `index` 99 and `-1`,
       `overrides.add`, an unknown override key, `set` not an object of objects, `hide` not strings, `instanceId`
       with `groupId`, `instanceId` that does not resolve, `groupId` absent in create mode.
    f. `frameTree` flags: a dangling instance override (`set: {ghost: …}`) is flagged `dangling-set` with `instanceId
       g1-1` and the tree still renders; an unknown group node in a hand-built doc is flagged `unknown-group` and
       dropped; `hide: ["help"]` drops the part from that copy only.
    g. every expanded tree passes the REAL `validateComposition(VOCAB, …)` (group 35 already has it, `:11614-11616`);
       a group whose part is not an allowed child of the placing parent (define a `list-row` from a `list`, place it
       into a `stack`) renders a refusal naming the part — **"the vocabulary refusal still applies"**.
    h. **#475's case, 35.14-style**: fold a frame with a part named `frozen-row`, then a Mode 2 `component.propose`
       of `frozen-row` (forward-only, so accepted), then `group.define` over it → refused naming `group.define`,
       `frozen-row`, `pr<n>` and `G7`; a Mode 1 name in the same shape is accepted (positive control); `group.place`
       of a group defined BEFORE the Mode 2 proposal → refused naming `group.place` and G7.
    i. `component.propose` with `groupId`: accepted for `g1`; refused with both ids, with neither, with `groupId: "g9"`,
       with `mode: 2`, and a second time for `g1` ("one proposal per group"); the entry carries `groupId` and no
       `recordId`; `exhibitsOf` still lists none.
    j. `groupInstances` total over junk; applier purity (the input doc and the op params unmutated after a place).
  - 35.12: unchanged (observed: it stays green). The "neither recordId nor groupId" case lives in 35.17i.
- **REDDENS** (all five run in the probe, observed): `OPS` back to twelve → 77 failures, the first "not the same
  fourteen verbs"; D4 step (3) removed → 8 failures, first 35.17a; redefine blocker disabled → 1, 35.17d "NO THROW";
  `refuseFrozen` removed from `group.define` → 1, 35.17h "NO THROW"; D4 step (2) dropped → 4 across 35.17c/f.
  **Reference implementation:** `.claude/plans/compose-and-name-groups-315-probe/phase1.patch.txt` (canvas-ops +209 −6,
  build-checks +149 −4) passes `build ✓  all 50 groups pass` at `b99d9ac`. Apply it with `git apply` as the starting
  point for Tasks 1.1, 1.2 and 6.1's group 35 part, then read it against D1–D6 rather than trusting it blind.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build canvas ops|build ✓"` → `✓` (expected).
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 6.2 — UPDATE group 36 — 36.13 `groups/` on disk, F10

- **IMPLEMENT**: over a scratch copy of `discovery/faster-payment/` (the 36.10 precedent): `saveRun` a compose + a
  `group.define` → `build/groups/g1.json` exists, equals `groupFiles(doc, "<scratch slug>")["g1.json"]`, carries
  `provenance.run`; `verifyBuild(loadBuild(...))` is `[]`; hand-edit the file's `name` → named "carries …/the ops
  derive"; add `groups/g9.json` → named "carries a fact the ops do not"; delete `g1.json` → "is missing"; an undo of
  the define through `saveRun` → the file is gone and `verifyBuild` is `[]`. **AC #4**: the scratch build dir's file
  list after define + place is exactly `ops.jsonl canvas.json groups/g1.json` (+ `handoff/` untouched since `saveRun`
  does not write it) and `git status --porcelain -- system handoff` is unchanged across the case. F10: a line whose
  `state.add` override is `{set: {x: {label: "a"}}}` passes `verifyBuild` (positive control), a line with a top-level
  `"x": 3` and one with `params.y` (hand-built) are each named "carries an x or a y". The existing per-package check
  now also compares `groups` (every committed package: `{}` vs `{}`).
- **REDDENS**: remove the `rmSync` of underived files → the undo case reds with `g1.json` still present; revert F10 to
  the old regex → the `set: {x: …}` control reds.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build build package"` → `✓` (expected).
- **SATISFIES**: AC #1 ("→ a file"), AC #4.
- **REGENERATES**: none.

### Task 6.3 — UPDATE group 49 — 49.9 and 49.11

- **IMPLEMENT**: 49.9's `EXPECTED_POSTS` gains `"/api/canvas/promote"`; its message "all ten" → "all eleven". **49.11**
  (AC #3): an in-memory package (49.10's precedent) whose ops are compose f1 → `group.define` g1 → `group.define` g2 →
  place g1 twice → `component.propose {name: "app-header", groupId: "g1", mode: 1}` → `proposal.ratify pr1` →
  `component.propose {name: "person-row", recordId: "i1", mode: 1}` → `proposal.ratify pr2` → `component.propose
  {name: "other-row", recordId: "i2", mode: 1}` (left proposed). `compositionCount` = `{composed: 2, placed: 2,
  admitted: {total: 2, fromImport: 1, fromGroup: 1}}` exactly, and `renderPack(pkg)["flow.md"]` contains both lines
  verbatim. The committed faster-payment `flow.md` contains `Composed and named: 0 group(s), 0 placed cop` (a
  zero is printed, never omitted).
- **REDDENS**: count an unratified proposal as admitted → 49.11 names `total 3`; drop the section from `renderFlow` →
  49.2 (committed bytes) and 49.11 both red.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build build handoff"` → `✓` (expected).
- **SATISFIES**: AC #3.
- **REGENERATES**: the two `flow.md` files (Task 5.1).

### Task 6.4 — UPDATE group 50 — 50.17–50.19 (promote, and ratify's second origin)

- **IMPLEMENT**:
  - **50.17** `promote.mjs` imported in CI with no `portal/node_modules`; its parsed specifiers are node built-ins plus
    exactly `canvas-store`, `import-run`, `env` (observed: it needs no `canvas-ops` import); no SDK, zod or MCP SDK, no dynamic `import(`.
  - **50.18** over a scratch package with g1 defined: `promoteGroup` writes exactly `proposals/app-header/{source.json,
    spec.md, block.css, template.txt}` (no `mapping.json`), `source.json` byte-equal to `groups/g1.json`, each draft's
    first line naming promote.mjs and "not by an agent", one new `component.propose {name: "app-header", groupId: "g1",
    mode: 1}` line; a second promote → `refused.kind === "already-promoted"` with the dir listing and the ledger length
    unchanged; `groupId: "g9"` → `no-group`; a name taken by a vocabulary component (`card`) → `card-2`; a promote during
    a held lock → `busy`; `git status --porcelain -- system handoff` unchanged (**AC #4**).
  - **50.19** `planRatify` over that group proposal (the 50.6 scaffold): the spec's Usage line equals D8's observed
    string with the scaffold's run and licence, the CSS header names
    `group g1`, the registry def's provenance is `{from: "group", record: "g1", …}` and passes `checkAdmitted`; the
    import-path 50.6 bytes are unchanged (they are re-asserted by 50.6 itself). `checkAdmitted` refuses `{from:
    "group", record: "i1"}` and `{from: "import", record: "g1"}` and `{from: "made-up"}`, each by name (extend 50.2's
    mutation list).
- **REDDENS**: write `mapping.json` in promote → 50.18's exact file list reds; revert D8's `provenanceLine` branch →
  50.19 reds naming "an unknown tool"; loosen `checkAdmitted` back to import-only → 50.19's positive control reds.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 50 groups pass` (expected; the group
  count does not change — every new case lands in an existing group).
- **SATISFIES**: AC #2, AC #4, the ticket's "composed in run X".
- **REGENERATES**: none.

### Task 6.6 — UPDATE `tooling/ratify-journey.mjs` — a promoted group ratified end to end (`children: "none"`)

- **IMPLEMENT**: in the journey's scratch clone (D12 of #313: a `git clone`, never a worktree), after its import
  admission: define `g1` over a stack of `screen-header` + `ghost-button` + `icon` in its scratch package, promote it,
  commit, then `previewRatify` → `runRatify` for `app-header` with `tag: "div"`, `children: "none"`, one `text` slot
  for a `title` prop, `containers: ["stack"]`, and a licence. Assert: all ten chain steps exit 0, the ledger's last line
  is `proposal.ratify` for the group's `pr<n>`, `system/specs/app-header.md` carries D8's Usage line verbatim, the
  registry entry's provenance is `from: "group"`, and no `imports/*.json` changed. The probe's
  `e2e-ratify.mjs.txt` is the working driver to copy from (observed: 10/10 steps exit 0, build-checks 17.3 s, 21.0 s
  total).
- **GOTCHA** (observed): chain step 1 (`gen-handoff`) needs `tooling/style-dictionary/node_modules`, which ratify's
  `noIcons` guard does not check — the journey's clone must `npm ci` there as well as in `tooling/icons` (or symlink,
  as it does for the other `node_modules`).
- **REDDENS**: revert D8's `renderSpec` branch → the spec's Usage line names "import record `undefined`" and the
  assertion reds.
- **VALIDATE**: `node tooling/ratify-journey.mjs` → green (operator-run).
- **SATISFIES**: the ticket's "the admitted spec header reads 'composed in run X'", end to end.
- **REGENERATES**: none (the scratch clone is thrown away; D3 of #313).

### Task 6.5 — UPDATE `tooling/canvas-journey.mjs` — the groups pass (AC #2)

- **IMPLEMENT**: `seed()` gains `fp-groups` (the lanes pass's copy shape, `:289-293`). A `seedGroups()` appends ONE
  owner `screen.compose` in-process through `saveRun` (the `seedMeasure` precedent — an owner line the journey writes,
  in a scratch copy, never committed): screenId `home`, why "the header case: a title, a help button and a mark shared
  by every screen", composition stack `screen` → `screen-header` `header` {title "Home"}, `ghost-button` `help` {label
  "Help"}, `icon` `mark` {name "info", size "md"}; positions from the loaded canvas plus `f3: {x: 1600, y: 0}`. Then
  `groupsPass(base, page, t, step)` after `lanesPass` in `leg()` (`:634`):
  - G1 open fp-groups; f3 renders `screen-header` "Home".
  - G2 f3's Details → tick `header`, `help`, `mark` → name `app-header` → Save → ledger +1 `group.define {name:
    "app-header", frameId: "f3", partIds: ["header", "help", "mark"]}`; `build/groups/g1.json` exists with three parts.
  - G3 f1's Details → Place `g1` into `screen` → ledger +1 `group.place`; f1 renders `[data-part="g1-1/header"]` "Home".
  - G4 f1's Details → Copies → `g1-1` · `header` · `title` = "Add a payee" → ledger +1 `group.place {instanceId: "g1-1",
    overrides: {set: {header: {title: "Add a payee"}}}}`; f1 reads "Add a payee", f3 still "Home".
  - G5 Promote → reload at `?promoted=app-header`; `build/proposals/app-header/source.json` deep-equals
    `groups/g1.json`; the ledger's last line is `component.propose {name: "app-header", groupId: "g1", mode: 1}`;
    `[data-ratify="app-header"]` is mounted.
  - G6 `verifyBuild(loadBuild(buildDir("fp-groups")))` is `[]`; the pack's `flow.md` reads `1 group(s), 1 placed copy`.
  - G7 `git status --porcelain -- system handoff discovery` equal before and after the pass (**AC #4**).
  - G8 the three new fieldsets' buttons are ≥ 44×44 and there are no page errors.
  Header paragraph: "THE GROUPS PASS (#315, G1–G8) …" in the file's voice.
- **GOTCHA**: memories — `stale-serve-wrong-tree` (the driver spawns its own portal; confirm `/api/health` reports this
  worktree's HEAD, which `boot()` already does); `portal-smoke-port-scoped-kill`; `hover-probes-race-smooth-scroll`
  (wait for scroll stability before a click on a frame far right); `webkit-lazy-iframe-in-scroller` does not apply (no
  iframe). Wait for the ledger (`waitLines`) before the Promote click — the page's save is a microtask flush.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs & node tooling/canvas-journey.mjs all` → every G line ✓ on
  chromium, firefox and webkit (expected). Operator-run, not CI.
- **REDDENS**: comment out `saveRun`'s groups write → G2's "`groups/g1.json` exists" reds; make Promote skip
  `source.json` → G5 reds. (D4's namespacing is 35.17c's to prove; the journey places one copy, so it cannot.)
- **SATISFIES**: AC #2, AC #4.
- **REGENERATES**: none.

### Task 7.1 — UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: group 35's entry (`:59`) — "a thirteenth verb" → "a fifteenth verb"; one sentence for 35.17 and its
  cannot-reach ("whether a group is a GOOD reuse is a human read; whether the page's selection matches the owner's
  intent is canvas-journey's"). Group 36: 36.13. Group 49: 49.11 and 49.9's eleven. Group 50: 50.17–50.19. Grep the
  three copies of every cannot-reach clause you touch (memory `gate-prose-has-three-copies`: gates.md, the `group()`
  string, a fixture header).
  The `group()` detail strings are the second copy and move in the same commit: group 35's (`build-checks.mjs:11884`,
  "so a THIRTEENTH verb with no fixture fails BY NAME" → FIFTEENTH, plus 35.17 and the new `component.propose`
  refusals), group 36's (`:12229`, "NO x or y on any line" → "no x or y key on a line or its params", plus 36.13),
  group 49's (`:16745`, "all ten found by name" → eleven, plus 49.11), group 50's (`:17157`, plus 50.17–50.19 and the
  three new `checkAdmitted` mutations — "thirteen mutations" → sixteen), and group 47's (`:16407`) for the `/` case.
- **VALIDATE**: `grep -in "thirteenth\|all ten\|thirteen mutations" .claude/references/gates.md tooling/build-checks.mjs` → no stale hits (expected).

### Task 7.2 — UPDATE docs (the index, not the spec)

- `docs/epics/canvas-design-import.architecture.md` — `## Addendum 2026-09-30 (#315): compose-and-name as built`: D1
  (groupId on propose, owner), D2 (edit targets, owner; the count is final at fourteen), D3 (resolution in
  `frameTree`, the renderer untouched), D4 (`/` reserved, namespaced ids), D5 (the definition derived from a
  selection), D9 (the count's definition). Update the op-list sentence at `:139-142` only by pointing at the addendum.
- `discovery/README.md:638` and `:647` — `groups/<id>.json` is written (a projection of `ops.jsonl`, D7).
- `system/canvas-ops.mjs` header — the groups paragraph (what a copy is, D4's order).
- **VALIDATE**: `node tooling/drift-check.mjs` → clean (expected; it syntax-checks tracked `.mjs` — this plan's
  fragments are `.md`, never `.mjs`).

### Task 7.3 — REGENERATE `system/loc-summary.json`

- **IMPLEMENT**: `git add` the `system/` edits FIRST (memory `loc-summary-counts-tracked-only`: gen-loc reads the index),
  then `node agent-layer/gen-loc-summary.mjs`.
- **Derived**: today the runtime group is 81 files, `wc -l` 32,762 → `split("\n").length` sum 32,843 → `linesApprox`
  32,800 (observed). Observed in the probes: the Phase 1 patch alone (+203 net in canvas-ops) → ~33,000; Task 3.3's
  `templates.admitted.mjs` lines add a few more. Either way the rounded figure moves, so Task 7.4 is certain.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` after staging → no drift.
- **REGENERATES**: `system/loc-summary.json`.

### Task 7.4 — REGENERATE approach baselines ×3

- **IMPLEMENT**: memories `loc-summary-baseline-cascade` and `vr-gate-reads-working-tree`: from a CLEAN detached
  worktree under `/Users` holding the committed change (`git worktree add --detach /Users/Berzins/Desktop/Linards_current/vr-315 HEAD`),
  `rm tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png` (observed paths on `origin/main`;
  `update:docker` silently keeps a stale digit otherwise) then `cd tooling/visual-regression && npm run update:docker`
  (observed script: `docker run … mcr.microsoft.com/playwright:v1.61.1-jammy … npx playwright test --update-snapshots`,
  it runs `npm ci` inside the container). Copy exactly those three PNGs back, commit them, remove the worktree. If
  `git status` there shows any other baseline changed, stop: that is a regression, not churn.
- **VALIDATE**: `git status --porcelain -- tooling/visual-regression` lists exactly the approach baselines (expected);
  CI `visual` green on the PR.

---

## TESTING STRATEGY

### Unit Tests
build-checks is the repo's gate (no suite): group 35 drives the applier with no filesystem (35.17), group 36 the store
over a scratch copy (36.13), group 49 the handoff over an in-memory package (49.11), group 50 promote over a scratch
package and ratify's pure planner (50.17–50.19).

### Integration Tests
`tooling/canvas-journey.mjs` G1–G8 on three engines through the real portal and page (operator-run).

### Edge Cases
- Undo of a `group.define` with no later place → `groups/g1.json` removed (36.13); with a later place → LIFO forces the
  place's undo first (already `foldLedger`'s rule).
- Two copies of one group on ONE frame → `g1-1`, `g1-2`, independent overrides (35.17a/c variant).
- A copy in a base frame, and that base's error state → the state renders the copy (a state is its base plus its
  differences), and a state's `override.set` can address `g1-1/header` (namespaced) — asserted once in 35.17.
- An arrow from a part inside a copy → `flowEdges` reads `partText` through the namespaced id.
- A pre-#315 package (no `groups` key, no `groups/` dir) folds, renders and verifies unchanged (every committed package).
- A part id `x` in a group override passes `verifyBuild` (F10).

### Proving the checks
Every new case carries its REDDENS mutation (above) and a positive control that runs first. Run each mutation once and
record the observed failure message in the implementation report; a case whose mutation leaves it green is rewritten,
not kept.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check` on every touched `.mjs`; `node tooling/drift-check.mjs`; `node tooling/token-lint.mjs` (CI verify's three).

### Level 2: Unit Tests
- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass`. **Observed at `b99d9ac`: all 50 pass, 15.9 s** —
  after `cd tooling/icons && npm ci` (a fresh worktree fails 41.7 without it; environment, not code). The ratify
  chain also needs `cd tooling/style-dictionary && npm ci` (observed in the probe).

### Level 3: Integration Tests
- `node agent-layer/gen-build-handoff.mjs --check` → clean.
- `node tooling/canvas-journey.mjs all` → every leg green on three engines (operator-run).

### Level 4: Manual Validation
- `cd portal && npm start` → open a fictional run's canvas → f-details → save a group → place it → override → Promote →
  the ratify form appears for the proposal. `/api/health` answers.

### Level 5: Additional Validation
- CI: `verify` (build-checks · drift-check · token-lint), `visual` (approach ×3), CodeQL (both legs).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| none — no agent run, no model call, no credential | $0 | — | — |
| A promoted group admitted as a container (`children: "many"`) reds groups 40/43/46 through the matcher | $0 here; re-recording group 46's Jev pins is paid | no — out of scope, proven cause | **open one before the PR** (owner approves the issue text) |

Ratifying a promoted group end to end is the owner's (an admission is an owner act and writes `system/`); it is not
part of this PR's ACs (Out of Scope).

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — the two ops proven in the canvas-ops group: define from a selection → a file (35.17a + 36.13); place
      twice → two instances (35.17a); edit the definition → both follow (35.17b); override one instance's text → only
      it differs (35.17c); remove a definition part under override → refused (35.17d).
- [ ] **AC #2** — a portal journey: select nav + button + icon → name → place on a second frame → override the title →
      promote → the proposal dir exists with the group as its source (canvas-journey G1–G5).
- [ ] **AC #3** — the handoff's composition-vs-admission count asserted on a fixture (49.11).
- [ ] **AC #4** — nothing under `system/` written by define or place; only promote reaches the proposal path (36.13,
      50.18, journey G7).
- [ ] A promoted group (`children: "none"`) ratified end to end: 10/10 chain steps green, D8's Usage line in the
      spec (Task 6.6, ratify-journey).
- [ ] #475's hand-off: `refuseFrozen` on `group.define` and `group.place`, 35.14-style, with a Mode 1 control (35.17h).
- [ ] F10 from PR #485 closed (36.13).
- [ ] `node tooling/build-checks.mjs` green; drift-check and token-lint clean; `loc-summary.json` and approach baselines regenerated.
- [ ] PR body: `Closes #315`; "the op count is final at fourteen"; the plan, report and review in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE run and its output recorded in the report
- [ ] Every REDDENS mutation run once, observed message recorded
- [ ] `node tooling/build-checks.mjs`, `node tooling/drift-check.mjs`, `node tooling/token-lint.mjs` green
- [ ] Portal boots, `/api/health` answers (own PID killed)
- [ ] canvas-journey green on three engines; ratify-journey green
- [ ] The container-admission ticket (Paid table row 2) opened, with the owner's approval of its text
- [ ] Op-verb lock: `gh pr list --state open` shows no other PR touching `system/canvas-ops.mjs` at branch time

---

## RISK REGISTER — every risk named at planning, and what closed it

| Risk | Closed by (observed) |
|---|---|
| R1 the two verbs, the expansion and group 35 do not work as written | Phase 1 probe: `build ✓  all 50 groups pass` with the patch; five REDDENS mutations each red as named (`phase1-results.md`) |
| R2 the positive-control setup refuses the new verbs | Probe: f3 `home` + g1 `kept-group` worked exactly as written |
| R3 ratify's second origin moves the import path's bytes | Probe: plan hash and every write sha identical before/after, anchors at HEAD (`digest.mjs.txt`) |
| R4 a promoted group cannot be ratified end to end | Probe: `children: "none"` → 10/10 chain steps exit 0; now Task 6.6. `children: "many"` → cause located (matcher), out of scope with a tracker |
| R5 `groups/` projection, undo, orphans, F10 | Probe: each case named by `verifyBuild`; undo removes the file; `set: {x: …}` passes |
| R6 Promote writes outside the build root or touches `system/` | Probe: exactly four files in `proposals/app-header/`, `system/` and `handoff/` untouched |
| R7 the loc and baseline cascade | Figure observed to move; exact three PNG paths and the command pinned (Task 7.4) |
| R8 environment gaps | Observed: `tooling/icons` AND `tooling/style-dictionary` need `npm ci` in any fresh clone before build-checks or the chain |

## OPEN QUESTIONS / ASSUMPTIONS

- **A1** — defining a group does not convert the selected parts into a copy in the source frame. If the owner expects
  it to, that is a third `group.place` into the source plus hiding the originals — possible later with today's verbs.
- **A2** — a group definition may not be edited except by re-capture from a screen (D5). Editing a definition's props
  directly (a "definition canvas") is not in the grammar; re-capture after a `screen.set` on the source frame is the
  path, and 35.17b drives exactly that.
- **A3** — `provenance.record` holds a group id for a group admission (D8). A rename to `ref` would touch every
  admitted entry and #313's committed shape; left as is and stated.
- **A4** — the proposal name is the group's name (collision-suffixed); Promote offers no rename field.
- **A5** — a promoted group stays a group: its copies keep following the definition; the admitted component is a new,
  separate part. Swapping copies for the admitted part is a later ticket.

## NOTES (open canvas)

### Pre-flight (2026-09-30, detached worktree at `origin/main` `b99d9ac`)

1. **Drove the existing validates.** `node tooling/build-checks.mjs` first reported `1 failure` (41.7, `tooling/icons`
   missing `node_modules`); after `cd tooling/icons && npm ci`: `build ✓  all 50 groups pass`, 15.9 s (observed). The
   plan states the group count as 50 (CLAUDE.md's "41" is stale; `gates.md:11` says 50). `OPS.length` today is 12
   (35.1's pin, `:11259`).
2. **Resolved every citation** listed under CONTEXT REFERENCES against `b99d9ac`. Corrections that changed the plan:
   - `component.propose` hard-requires `recordId` (`:473-478`) and `ratify.mjs:509` hard-reads `imports/<id>.json` →
     D1 and D8 (the owner chose `groupId` over a synthetic record).
   - `ratify.mjs`'s "import" strings are at SIX sites plus `checkAdmitted`'s `from === "import"`
     (`templates.admitted.mjs:91`) — the latter is a `system/` file, so Task 3.3 moves runtime loc too.
   - The positive-control loop (`:11483-11500`) APPLIES every `VALID_FOR` op to a setup document whose composition
     has no ids → the setup gains f3 and g1 (Task 6.1); without this the new verbs' controls are refused.
   - 49.9 finds POST routes by an exact `if (p === '…' && req.method === '…') {` regex and pins "all ten" → eleven.
   - `ratifySection` gates on `view.record?.provenance?.mode` (`canvas-ratify.mjs:185`) → one-line change.
   - `verifyBuild` has ~26 call sites across build-checks and canvas-journey, most passing a hand-built `{ops,
     canvas}` → groups are compared only when passed (D7).
   - The page has NO part-selection model (`data-part` is written by the renderer only); the inspector's lane editor
     is the pattern, so selection is checkboxes, not clicks on the stage.
   - `frameTree` flattens parts first-occurrence-wins (`:663`) → D4's namespacing is required, not cosmetic.
3. **Landed claims vs `origin/main`.** `rg "group\.define|group\.place|groups/|composedFrom"` outside `.claude/`: only
   the ops comment `:50-53`, the architecture and PRD text, and `discovery/README.md:638,647` ("LATER"). `emptyDoc`'s
   `groups: {}` exists and is read nowhere. No `promote` module or route exists. #313 and #314 are merged
   (`b99d9ac`, `3b5a6c7`).
4. **Reconciled.** The op count is fourteen everywhere (Task 1.1 comment, 35.1, gates.md, the addendum). The group
   count stays 50 (no new group). `/` is reserved in three places (D4) and each has a case.
5. **Known traps carried**: loc-summary tracked-only + baseline cascade (Tasks 7.3–7.4), VR from a clean worktree,
   drift-check syntax-checks tracked `.mjs` (fragments stay `.md`/`.txt`), portal smoke kills its own PID, gate prose
   has three copies (Task 7.1), the check that cannot fail (every case's REDDENS), `hidden` defeated by author display
   (Task 4.1), stale serve (Task 6.5), shared worktree (verify the branch before each commit; stage by path).

6. **Probes (2026-09-30, two throwaway clones at `b99d9ac`, both removed).** Artifacts in
   `.claude/plans/compose-and-name-groups-315-probe/` (every script parked as `.txt` — drift-check syntax-checks tracked
   `.mjs`). Phase 1: pass, eight literal corrections folded into Tasks 1.1, 1.2, 6.1. Ratify + Promote: pass, nine
   corrections folded into D8, Tasks 3.2, 3.3, 6.4, 6.6, 7.3 and Out of Scope. The one failure found (a container
   admission through the matcher) is outside this ticket and has a tracker row.

### Why not the alternatives
- **Parts carried on the op** (the page copies subtrees into `group.define`): the op record could then claim parts
  that were never on a screen, and the applier cannot tell. Deriving from `frameTree` makes "composed from a
  selection" true by construction, at the cost that a definition changes only by re-capture (A2).
- **A `group` vocabulary entry the renderer resolves**: the renderer has no document; it would need `doc.groups`
  threaded through `renderComposition` and every caller, and `group` would become a vocabulary name the pack
  exports. Rejected (D3).
- **Instance overrides through `screen.set` on namespaced ids**: works mechanically (a frame's layers see
  `g1-1/header`), but splits "what this copy says" across the frame's sets and the copy's overrides. The copy's
  overrides are the one home; a frame-level set on a namespaced id is possible and not encouraged (edge cases).

### Sequencing risk
The op-verb lock: this PR holds it. `proposal.ratify` (#313) merged at `b99d9ac`; no other open PR may touch
`OPS`/`PARAMS`. Merging `origin/main` before the loc and baseline regen avoids a second cascade.

## AMENDMENTS

- **2026-09-30 (implementation).** Pre-flight re-run at `b99d9ac` in `../wt-315`: `build ✓  all 50 groups pass`,
  `OPS.length` 12, both probe patches `git apply --check` clean (observed). Three plan errors, corrected in the build:
  1. **Task 3.2 / 50.18 "the first line of each draft"** — `template.txt` is JSON (`{note, compositions}`, the
     importer's own shape), so its first line is `{`. 50.18 asserts the parsed `note` for that file and the first
     line for `spec.md` and `block.css`.
  2. **Task 6.5 / canvas-journey step 14** — the stand-in's "no decision checkboxes" count now meets G2's
     "Save parts as a group" checkboxes on every frame; the count excludes `[data-group-part]`. The plan did not
     name this collision.
  3. **Task 6.6 / the journey admits `app-header`** — 50.18 and 50.19 use `app-header` as their fixture name and
     guard that it is NOT a vocabulary member (50's `probe-row` rule), so admitting `app-header` in the ratify
     journey's clone would red chain step 10 on those guards. The journey admits the group as `journey-header`.
  4. **D7 / Task 2.1 — `verifyBuild` must not compare `provenance.run` to the reading directory.** Found after the
     build (probe `impl-rename-probe.mjs.txt`, observed): a package holding a group, copied under another name, fails
     `verifyBuild` on `groups/g1.json`'s run — and every scratch copy in this repo renames the package (36.10's,
     `pkgCopy`, the journeys'), so the owner's first saved group on `faster-payment` would red them all. The run is
     where the group was COMPOSED: `verifyBuild` checks it is a run slug and compares everything else to the fold.
     36.13 gained the renamed-copy and bad-slug cases.
