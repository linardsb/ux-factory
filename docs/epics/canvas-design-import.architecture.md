# Architecture — Canvas + design import

Intent: [canvas-design-import.prd.md](./canvas-design-import.prd.md)
Platform decisions this builds on: [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md)
The substrate this amends: [prototype-studio.architecture.md](./prototype-studio.architecture.md) · the run
package this writes into: [discovery-partner.architecture.md](./discovery-partner.architecture.md)

Decided 2026-08-28, interactively with the PRD holder. Grounded in the briefing's technology verdicts and
spikes (`__canvas_planning_PRD.md` §24 T1–T16, §30 S1–S4, taken as named calls), spike C's observed read
path, a read of the grid's reach (12 files, four CSS families, ten build-checks groups), the portal's page
model, the renderer's composition grammar, and the tracker (#279's fourteen tickets all open, #280 with
no verdict posted). High-level decisions only; per-ticket implementation plans come later.

## Problem & goals

The owner, holding a discovery PRD and a brand pack, arranges a real product's screens, their states and
the flow between them on a free canvas, using parts that already exist or arrive by import, and leaves
with a handoff pack that traces every frame to the decision it embodies. Every decision below is judged
against that, under the standing constraints: shipped pages stay vanilla and replay only, token
discipline, the honesty contract, the vocabulary refusal, no AI slop. The PRD's bet is that arranging here
is as quick as arranging in Brilliant. The architecture's job is to make that reachable without a second
canvas, a second truth, or a runtime dependency.

## Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | **Swap the coordinate layer in place** — keep the ~7.5k studio lines; replace the four grid families with `--x/--y` + translate and a continuous `--stx-scale`; give the build layer its own document and op vocabulary; the portal hosts the live canvas; `/factory` replays onto the same substrate | Rewrites seven build-checks groups and deletes two, across 12 files, in one PR; but one substrate, one bus, one replay driver, and every non-grid assertion survives | **Chosen** |
| B | **Board-first** — frames stay places, parts stay affordances, states become place variants; the canvas remains a projection of the Shape Up board, the #202 principle extended | One truth. But compositions, overrides and part-level arrows do not fit a places/affordances model, the applier that `/build` and the codec depend on entangles with the prototype layer, and the 16 KB URL codec would have to carry compositions | Rejected |
| C | **A fresh portal canvas, the studio untouched** until `/factory` catches up | No gate rewrite now. Two canvases, two undo stacks, and the shipped replay never shows the new work | Rejected by the PRD (G1) |

## Recommended approach

**A, with the build layer given its own document.**

The substrate keeps two of `studio-canvas.mjs`'s three load-bearing calls (the stage is DOM; pan is native
scroll) and replaces the third: zoom and position stop being attributes selected from stylesheet tables and
become custom properties (`--stx-scale`; `--x`, `--y`, `--w` per node) written through two named helpers.
Frames, sticky notes, decision cards and Mode 2 exhibits are all nodes on one stage; arrows are an SVG
overlay bound to frames by id, their geometry derived from positions and never stored.

The build layer gets its own document and op vocabulary, `system/canvas-ops.mjs`, a sibling of
`board-ops.mjs` rather than an extension of it. The board (places, affordances, connections) is the shape
layer's artefact and this document's **input**: a `screen.compose` records the place it came from, and
nothing on the canvas writes back to the board. The replay driver dispatches by op prefix, so `/factory`
keeps playing every committed board run (auto-arranged by rank) and the same driver can later play a
canvas run. Undo is one snapshot stack over the whole document, owner's ops and agent's ops in one order.

The composition grammar grows once. `validateComposition` allows at most one child per node and
enum-checks every prop key (observed, `agentic-renderer.mjs:79-96`), so `stack` and `list` cannot exist
under it. Container entries declare `children: many` in the spec head, the validator honours it for those
entries only, and the single-child rule stays for everything else. This is the versioned vocabulary-schema
call the studio architecture said a structured candidate would force; `stack` is that candidate.

The live canvas is a portal page, `portal/public/canvas.html`: a module page that loads the same
`system/studio-*.mjs` and `studio.css` that `studio.html` loads, served through the `/system/*` route the
server already has. The SPA lists runs and links to it; `portal.js` stays a classic script. Agents run
server-side through the SDK. The compose loop is discovery's approach C one layer up (the server
sequences, one screen per turn, the op is the only write path); the import run reads Brilliant through
`mcpServers`, converts in Node, and lands a proposal, never a component.

The run package is `discovery/<slug>/build/`: `ops.jsonl` is the truth, `canvas.json` is the arrangement,
and `groups/`, `proposals/`, `imports/` and the generated handoff sit beside them.

## Key decisions

### Stack & libraries

- **Zero shipped dependencies, unchanged.** T1 keeps the DOM stage (`content-visibility: auto` +
  `contain-intrinsic-size` on off-viewport frames as the first mitigation). T2 makes zoom continuous
  through `--stx-scale`, with the scroll extent sized from stage × scale in the same write path; the
  stepped `data-zoom` table survives only as the keyboard's path. T4 positions nodes with `--x/--y` +
  `transform: translate`. T5's arrows are one hand-written SVG overlay with Excalidraw's binding shape;
  T5's auto-arrange is a hand-written rank layout (BFS from the entry frame, one column per rank). T7's
  platform features are adopted as stated: Popover + anchor positioning for menus and inspectors,
  `scrollend` for minimap sync, `getCoalescedEvents` for drag; `moveBefore()` and `scheduler.yield()` as
  enhancements only, because WebKit is a gated engine. T8: `contenteditable="plaintext-only"` with the
  plain fallback, one undo entry per gesture. T9: the snapshot stack, mark-batched. R1–R5 stand.
- **T10 (a `CompressionStream` codec v3) is deferred, with the reason.** Once the `g` field is deleted the
  URL carries answers and board only, so the size pressure T10 answers no longer exists. The codec still
  moves to `v: 3` and refuses a `v: 2` payload carrying `g` as "made with an older version" (G12); it does
  not change its encoding.
- **Icons ship as a generated subset, never a library.** `tooling/icons/` is a dependency-carrying tool
  dir (the `style-dictionary/` shape) holding `@phosphor-icons/core`; `agent-layer/gen-icons.mjs` copies
  the paths named in a hand-maintained `system/icons.manifest.json` into a generated `system/icons.mjs`
  (name → path data, MIT recorded once in the header), drift-checked by CI `verify`. `node
  agent-layer/gen-icons.mjs --add <name>` is the one command G8 asks for. The `icon` template reads the
  map and refuses a missing name visibly. (Expected, not yet observed: the core package ships one SVG per
  icon per weight; the generator's first run confirms the path.)
- **Text renders through the shared `renderMarkdown`** (`system/handoff-viewer.mjs:163`, exported at
  #215 for the catalog). Links are the one extension, made there so both existing mounts get them. The
  renderer stays a line walker with a bounded census; headings, blockquotes and ordered lists stay out.
- **Portal dependencies:** the SDK, plus `zod` only if #280's verdict is the in-process tool. The Figma
  house plugin is plain JavaScript with a manifest, no bundler, loaded from disk in Figma desktop.
- **The compose agent's vocabulary context is generated at run time from `vocabulary.json`** (T13's idea
  in its minimal form), never hand-authored; the "not covered" escape is an explicit outcome in the prompt
  so a wrong-but-valid name is never forced. A committed `DESIGN.md` and the Blueprint projection (T12)
  are wave 3.

### Data model

**The build document** (`system/canvas-ops.mjs`, pure applier, DOM-free, no SDK in its import graph):

```
doc {
  frames:   [frame]        arrows: [arrow]        notes: [note]
  groups:   {id → group}   variants: [variant]    proposals: [proposalRef]
}
frame    {id, screenId, stateKey, baseId?, width, preset, device: mobile|desktop,
          fromPlace?, decisionRefs: [], composition | overrides}
part     {id, name, props, children}            the renderer's node + a stable id
override {set: {partId: {prop: value}}, hide: [partId], add: [{parentId, index, part}]}
arrow    {id, from: {frameId, partId?}, to: {frameId}, trigger: click|load|timer|condition, guard?}
note     {id, text}
group    {id, name, parts, provenance: {run, composedFrom}}       file: groups/<id>.json
variant  {key, overrides: {frameId: override}}
```

- **Ids are assigned by the applier, deterministically** (`f1`, `p1`, `a1`… per document), and an op
  never carries the id of the thing it creates: `board-ops.mjs`'s rule, kept, because replay determinism
  depends on it. The renderer's validator learns one optional node key, `id`, and emits it as
  `data-part` so the bus and an arrow can address a part (G5).
- **One override shape, three uses (G2, G3, G33).** A state sibling is a frame whose `baseId` names its
  base and whose body is an `override`; a placed group is a part `{name: "group", props: {groupId},
  overrides}`; a variant lane is an override map keyed by frame id. Resolution is one pure function,
  `resolve(base, override)`, and the handoff's "what differs" is the override printed. A dangling
  reference (an override naming a part the base no longer has) is **flagged by the applier and shown**,
  never dropped; deleting a base part is refused while a state or instance still overrides it.
- **A dialog is a state (G19)**: an override whose `add` places a `modal-dialog` over the base, so the
  flow diagram gets a node with arrows in and out, and no toggle sits in the base frame.
- **`stateKey` is an open enum** with the required minimum ideal · empty · error · partial · loading
  (T6); permission, offline and owner-named keys are opt-in per screen. Completeness is a derived check,
  `missingStates(doc, variantKey?)`, exported from the same module and run in three places: live on the
  canvas, as a build-checks group over committed packages, and by the handoff generator. A variant lane
  is checked and diagrammed by resolving its override map over the A lane first, so the check, the
  diagram and the report are per variant without a second code path (G33).
- **The op vocabulary** (each an `OPS` entry, a `PARAMS` entry, a switch case and a group case, together):
  `screen.compose` · `screen.set` · `frame.remove` · `frame.size` · `frame.link` · `state.add` ·
  `connect` · `disconnect` · `annotate` · `group.define` · `group.place` · `variant.add` ·
  `component.propose` · `proposal.ratify`. Fourteen, and the count is a starting point, not a pin:
  MVP 14's first slice needs six. The board's eight ops keep their names in `board-ops.mjs`; a prefix
  never collides because `connect` here takes `{from, to, trigger}` and the driver dispatches by module.
- **`ops.jsonl` is the truth.** One line per op: `{seq, at, source: owner|agent, op, params, status:
  applied|proposed|accepted|refused|undone, fromStep?}`. Undo appends an `undone` line rather than
  deleting one, so "proposed, accepted, then undone" stays readable (G26). Positions are never on a line.
- **`canvas.json` is the arrangement**, in JSON Canvas (T15): nodes `{id, type: frame|note|decision|
  exhibit, x, y, width, height?, ref}` and edges `{fromNode, toNode, relation: flows|embodies}`. Both
  edge kinds are derived (arrows → `flows`, `frame.link` → `embodies`) and rewritten on save. A gate
  asserts that applying `ops.jsonl` reproduces the frames `canvas.json` references, the `gen-replay`
  drift-check pattern; the file never carries a fact the ops do not.
- **The decision card (G25)** reads a `record_decision` op from the run's `transcript.jsonl` by id, never
  the projected `prd.md`; a stand-in package has no transcript, so its frames link to nothing and are
  flagged until #291's run replaces it (G23).
- **Proposals** live in `proposals/<name>/` with `spec.md`, `block.css`, `template.txt` (parked as
  `.txt`: CI `verify` syntax-checks every tracked `.mjs`), `source.json` (the read, verbatim),
  `mapping.json` (the operator-editable role map: rename, remap, drop) and the import record's id.
  A proposal is never under `system/`.
- **The import record (G30)** is `imports/<id>.json` with `source {tool, project, ids, bound, file?}`,
  `ir`, `mapping`, `drops[]` in E1's three classes (never read · read then dropped · read but never
  emitted), `fidelity {deltaEMin, wcag, verdict}`, `provenance {licence, attribution, mode: 1|2}` and
  `elapsed {recognition, ratify}`; `imports/<id>.md` is a pure projection of it, and the handoff carries
  the markdown. **An empty measurement scores as missing, never as pass** (E4's self-deceiving shape,
  named so the gate can refuse it).
- **The intermediate representation** (`import/ir.mjs`) is what both converters emit and the one thing the
  matcher reads: a node tree `{kind: frame|text|icon|instance|shape, layout {dir, gap, pad, align, size},
  style, text, icon {name}, component {name, variant, overrides}, children}` where every tokenisable value
  is `{ref?, value}`. A bound source fills `ref`; an unbound one leaves it empty and the snap step fills it
  by nearest value with the distance recorded (G18).
- **Snapping rules and the per-source override table (G18):** tolerance per token family in
  `import/snap-rules.mjs`; the owner's fixes for a given source file in `import/overrides/<source>.json`,
  keyed by a hash of the file so the second import from the same designer reuses them. Cross-run by
  definition, so they live beside the rules, not in a run package.
- **Device presets (G20)** are one exported table in `system/device-presets.mjs` (several phone, tablet
  and desktop widths); width is recorded per frame, and a state sibling inherits its base's unless it
  overrides it.
- **The handoff pack, extended:** `gen-handoff` reads the build package and emits `flow.md` (the state
  diagram as Mermaid `stateDiagram-v2` text, per variant), `drops.md`, `refusals.md` and `lineage.json`
  (frame → decision → answer → evidence, by id) beside what it emits today.

### Boundaries & contracts

- **The bus stays the only drive contract.** Pointer, keyboard and the agent all reach the applier through
  it; the replay driver still emits `agent.*`, the owner's verbs `ui.*`, with honest `source` values.
- **The op is the agent's only write path**, discovery's posture carried over. `Write` and `Edit` are
  denied; `Read` is the run package, `vocabulary.json` and the brief; the Brilliant MCP is allowed on
  import runs only, through `mcpServers` passed explicitly (spike C: the SDK does not read
  `~/.claude.json`); `WebSearch`/`WebFetch` are closed here, since nothing in a build turn needs the
  internet. One fence predicate, called from `canUseTool` and a fail-closed `PreToolUse` hook.
- **The compose loop is server-sequenced, resume-per-turn.** One turn proposes one screen (G13): the
  agent emits a `screen.compose` validated against the vocabulary, recorded with `status: proposed`, and
  yields; the owner's accept applies it (`status: accepted`), refuse records the refusal, edit is an
  owner op on top. A missing state (G27) is the same turn started from the check's flag. A proposal that
  fails validation is a visible refusal on the canvas and a `refused` line, never a retry.
- **Transport inherits #280.** Spike C proved the recorded run reaches the MCP in process; whether the
  op itself reaches the applier through an in-process tool or the `board-op.mjs` CLI shape is #280's
  verdict, posted 2026-08-28: the in-process tool. The spine assumes the in-process tool and the applier does not change either
  way.
- **Ratify writes, gates, and stops at the diff (G6).** The click writes `system/specs/<name>.md`,
  appends the CSS block to `components.css` under the standard header, writes the template into
  `system/templates.admitted.mjs` (a registry the renderer spreads into `TEMPLATES`, so no machine write
  ever lands inside the hand-written renderer), appends the palette entry, moves the wrapper histogram
  pin with the reason string recorded, then runs the **four** regenerators spike C found necessary
  (`gen-handoff` · `gen-vocabulary` · `gen-pack-bundle` · `gen-system-graph`) plus `gen-loc-summary`, then
  `build-checks`, and returns the diff. It refuses to start while `git status` shows uncommitted changes
  under `system/` or `handoff/`, so the diff it shows is exactly its own writes. Nothing is committed on
  the owner's behalf. `withRunLock` applies: one ratify, one compose turn or one import at a time.
- **The import is a recorded run, server-side.** "Import selection" asks Brilliant for `get_selection`
  through the SDK run and reads the ids; "Browse the page" loads the canvas's elements on demand and
  caches them for the session; both hand the same ids to `import/brilliant.mjs`. Not reachable → the
  visible refusal naming what failed and the one fixing action, with the drop zone beneath it that accepts
  a hand-exported blueprint file (G29). The Figma entrance is a file from the house plugin, dropped on the
  same zone, read by `import/figma.mjs`. Every run writes its record and its transcript before anything
  is shown.
- **Auth is the subscription, unchanged**, and the same window now carries three demands: discovery
  sessions, compose turns and the owner's own Claude Code. Recorded, not solved; it is why turns are
  small and the compose loop is one screen at a time.
- **The provenance branch is inherited (R1).** Fictional flows build in-repo under
  `discovery/<slug>/build/`; a real product builds under `<JOBS_DIR>/_discovery/<slug>/build/`, same
  shape. Faster Payment is fictional and in-repo.
- **The origin guard applies unchanged.** Ratify and the write routes are local writes into the repo; the
  guard is what stops a hostile page on the same machine reaching them, and the ratify route is two-step
  (preview returns the plan, confirm carries its hash) so a single request can never write.
- **Honesty surfaces:** every `ops.jsonl` line names its source; a proposal is never a component until
  ratified; every import record carries its drop list, its fidelity block and its mode; the canvas page
  labels the flow "fictional flow, neutral skin"; `/factory`'s replay label is unchanged. Nothing
  hand-written is presented as an agent's; nothing agent-drafted is presented as the owner's.

### Other eng-lead calls

- **The grid retirement, named (the one-way door).**

  | Where | What happens |
  |---|---|
  | `system/studio-canvas.mjs` | `MAX_COLS`/`MAX_ROWS`, `ZOOM_LEVELS` as the zoom source, `clampSlot`, `clampSpan`, `footprint`, `fits`, `fitLevel`, `MIN_SPAN` go; `setPos(el, x, y, w)` and `setScale(stage, s)` are the two write sites; `fit()` fits exactly |
  | `system/studio.css` | the four families' `data-col`/`data-row`/span tables and the five-entry zoom table go; one positioning rule per node class reading the custom properties |
  | `system/studio-verbs.mjs` | `stepSlot`, `hitSlot`, `groupOccupancy`/`groupDelta`/`groupStep`, `guidesFor` over cells go; nudge by a spacing token, snap-to-neighbour guides, align/distribute, multi-select move, each with a keyboard path |
  | `system/studio-select.mjs` · `studio-frames.mjs` · `studio-layers.mjs` · `studio-minimap.mjs` · `studio.mjs` · `replay-driver.mjs` · `studio.html` | every cap import and every cell computation goes; layers speak T16's reading-order sentences; the minimap reads positions; `arrangeBoard` and the driver lay out by rank |
  | `system/build-share.mjs` | the `g` field and its `length === b.p.length` rule are deleted; `v: 3`; a `v: 2` payload with `g` is refused as older |
  | `tooling/build-checks.mjs` | groups 4 and 5 lose their arrangement and coordinate cases; groups 12, 13, 14, 22, 24, 26, 27 are **rewritten** against the new helpers (never deleted: their non-grid assertions stay); the `GRID_FAMILIES` tripwire becomes a "positioned only through `setPos`" tripwire; group 7's `writes === 1` is re-pinned to the named write sites (`applyToStage`, `setPos`, `setScale`) and asserts nothing else writes an inline style |
  | `tooling/studio-journey.mjs` · `vt-verify.mjs` | coordinate assertions by selector become position assertions by custom property |

- **The baseline cascade, named.** `/factory` regenerates once, and enters the pixel gate under three
  packs at the same time (neutral · saulera · verdant, G14: one churn instead of two); `approach.html` ×2
  regenerates because new `system/*.mjs` files move the runtime group in `loc-summary.json`;
  `/components` regenerates for the five new primitives. `instance.html` and `studio.html` have no
  baselines (observed), so the PRD's "instance baselines regenerate" is corrected to: `instance-journey`
  must pass. The param manifest gains the canvas's new live controls under `/factory`.
- **Two PRs ride ahead of the first slice:** the Plus UI pack removal (G11, its own PR) and nothing else;
  verdant's baselines land inside the substrate-swap PR, not before it.
- **`/factory`'s layout is derived at load**, by rank from the projection's `place.add` and `connect` ops,
  deterministic; the driver's `MAX_COLS` import goes. No projection is migrated (observed: none carries
  coordinates).
- **Announcements (T16):** "moved to 3 of 7" in row-major frame order, plus the nudge offset in px; every
  align/distribute verb announces its result; the zoom table's keyboard steps stay announceable. The
  breadboard's discipline extended to free space (SC 2.5.7).
- **Compose-and-name is the default; promote is admission (G17).** A group is a file in the run package;
  "Promote" sends it down the same path an import takes: the agent drafts the spec from the group's parts,
  the owner ratifies. One admission path, two entrances, one ratify route.
- **Recognition runs in code before any prose (D3, E3).** `import/recognise.mjs` scores each IR node
  against `vocabulary.json` with independent signal predicates, sorts, thresholds, and has an explicit
  "not covered" floor; a slot fills by slug → builder. Deterministic, so build-checks feeds it spike C's
  fixture and asserts the same answer every run.
- **The five primitives go through the full chain like any component,** with two schema facts: `stack`
  and `list` declare `children: many`; `text` and `icon` declare none. `choice` carries `kind` and a group
  name; `list` owns dividers, the optional header and the empty case, and import maps a source list to
  `list` + N `list-row`s.
- **The catalog VR churn per admission is accepted as the cost, and named.** Every admitted component
  renders at rest on `/components`, so every ratify PR regenerates that page's baselines; the rule goes
  into the ratify UI's own checklist rather than a gate.
- **Placement, by the measurable rule discovery set:** `import/` (converters, IR, matcher, report schema,
  snap rules, overrides) is top-level, Node-only, importable from CI without `portal/node_modules`, and
  matches no `loc-summary` group. `system/` gains only what a shipped page loads: `canvas-ops.mjs`,
  `templates.admitted.mjs`, `device-presets.mjs`, `icons.mjs`, the primitives. `portal/lib/` gains one
  concern per module: `canvas-store.mjs` (package IO), `canvas-session.mjs` (the compose loop),
  `import-run.mjs` (the recorded import), `ratify.mjs` (write-then-gate). CLAUDE.md's "portal UI = a hash
  route in `portal.js`" rule is amended for `canvas.html`, the one module page, in the same PR.

## Missing pieces

The free-position substrate (two write helpers, continuous zoom, the SVG arrow overlay, rank layout,
snap guides, align/distribute, reading-order announcements) · `system/canvas-ops.mjs` with its applier,
`resolve`, `missingStates` and its build-checks group · the `children: many` grammar change through
`gen-vocabulary`, the validator and group 3 · the `id` node key and `data-part` · the five primitives
through the full chain · `templates.admitted.mjs` and the renderer spread · `gen-icons.mjs`, the manifest
and `tooling/icons/` · `device-presets.mjs` · `renderMarkdown` links · `portal/public/canvas.html` and the
SPA's run list · `canvas-store` / `canvas-session` / `import-run` / `ratify` and their routes ·
`import/` (ir, brilliant, figma, recognise, report, snap-rules) with fixtures · the Figma house plugin ·
the import record's markdown projection and the portal's side-by-side view · the handoff extensions in
`gen-handoff` · the `ops.jsonl` ↔ `canvas.json` gate · the grid deletion and the rewrite of seven groups ·
the baseline regenerations · the `discovery/README.md` section for `build/` · the CLAUDE.md amendments.

## Spikes & experiments

1. **S1 — the substrate under load** *(run first, before the swap PR is written)*
   Question: does `--stx-scale` + `--x/--y` hold ≤ 200 ms INP with ~30 frames, three engines, with
   `content-visibility` culling?
   Spike: a throwaway stage over the existing `studio.html` with representative frames, the INP gate's
   driver, ~half a day.
   Decision rule: holds → T2/T4 as written · drops → culling first, then defer arrow redraws during drag,
   before anything heavier is considered.
2. **S2 — Blueprint → `stack`** *(gates the first primitive's shape)*
   Question: does `al(h,y(c),g,pad)` + `s(fill,hug)` from spike C's fixture (`1db1b29957b949ca`) land as
   one token-spaced flex container with no literal?
   Spike: the converter's layout branch alone, over `03-blueprint.txt`, ~half a day.
   Decision rule: lossless → T3 as written and Q2b stays closed · a literal appears → name the token the
   contract lacks and drop it visibly; a new contract token is a `tokens.source.json` change with both
   regenerators.
3. **S3 — the wrong-but-green detector** *(gates the import record's fidelity block)*
   Question: does ΔE-MIN (E4) against Brilliant's `export(png)` of the same element score spike A run 3's
   green-body-text mapping red while 12/12 WCAG stays green?
   Spike: one deliberately wrong role map, one render, one comparison, ~half a day.
   Decision rule: red → the detector exists and the gate asserts it on that fixture forever · green → the
   aggregation is wrong, not the idea; try per-section MIN before dropping it.
4. **S5 — the Figma house plugin** *(gates the second converter; the first is unaffected)*
   Question: does a ~100-line plugin dumping the selection carry auto-layout props and `boundVariables`
   with resolved variable names?
   Spike: the plugin against one token-bound component in a Figma file, ~half a day.
   Decision rule: carries both → `import/figma.mjs` is the deterministic path, same as Brilliant's ·
   literals only → the by-value path with the snap table · neither → Figma components wait; packs only.
5. **S6 — the compose turn** *(the loop's one real risk; MVP 14's agent half)*
   Question: under resume-per-turn, does the agent emit one validated `screen.compose` for one screen and
   yield, rather than drafting the flow?
   Spike: three screens of the Faster Payment brief, dry, recording turns and elapsed time.
   Decision rule: clean → ship the spine · runs ahead → an explicit yield contract in the prompt and
   re-run · still → the `Stop` hook refusing a yield with nothing filed, and the fact recorded.

S4 (the `gen-blueprint` round trip) is not this epic's: the write direction is a non-goal, and S4 runs
when wave 3 is planned. Reversible calls (preset widths, snap tolerances, the op count, the SPA's run
list) are decided at implementation and moved when a flow says so.

## Open questions

- [ ] **#280's verdict.** In-process tool or CLI shape; inherited, not re-run. Every session module here
      is written to the applier, so the answer changes one transport file and CLAUDE.md's dependency
      line, nothing else.
- [ ] **The `Stop` hook** for the compose loop: only after S6, and only if the prompt cannot hold the
      one-screen contract.
- [ ] **`#281` ordering.** The build package lands inside a folder #281 defines. If #281 has not merged
      when the first slice needs `discovery/<slug>/build/`, the first slice writes the `build/` section of
      `discovery/README.md` itself and #281 rebases onto it; the two must not both create the README.
- [ ] **Q9, the eleventh primitive** (from the PRD): answered by the flow after Faster Payment.
- [ ] **Auto-arrange past twelve frames.** Rank layout covers 2–12; dagre stays a portal-side fallback
      that never ships, taken only if a real flow outgrows the rank.
- [ ] **The per-source override table for real designers' files.** A real product's imports build under
      `JOBS_DIR`; whether their snap overrides belong there too, or stay in-repo as rules without the
      source hash, is settled by the first real import.
- [ ] **T13's `DESIGN.md` and T12's Blueprint projection**: wave 3, with S4.

## For slicing

The discovery architecture's three conventions carry forward unchanged: every ticket states which of
#202's standing rules apply and why; a spike's verdict is posted to the epic before a dependent ticket is
planned; the close-out ticket (run 1, the metric read row by row, closing notes in both docs) is created
at slicing. This epic's version of the "every ticket carries" table differs from discovery's in four rows:

| Rule | Here |
|---|---|
| New tracked file under `system/` or `agent-layer/` ⇒ `gen-loc-summary` + both approach baselines | **Applies** to every ticket that adds a `system/*.mjs`; say so in the ticket |
| New live control ⇒ `param-manifest.json` + `gen-param-count` | **Applies** to `/factory`: continuous zoom, align/distribute, nudge are live controls on a shipped page |
| At-rest change to a shipped page ⇒ regenerate its baselines | **Applies** to `/factory` (×3 packs), `/components` (per primitive, per admission), `approach.html` (loc) |
| `tokens.source.json` change ⇒ `gen-handoff` too | **Applies if S2 names a missing token**; otherwise no token work |

**Two concurrency rules.** Two tickets must not add ops to `canvas-ops.mjs` at the same time (four places
move together; a merge that resolves three leaves a verb the gate cannot see). Two tickets must not both
regenerate `/factory`'s baselines at the same time (#202's collision rule, back in force).

**Sequence the substrate before the width.** The swap PR (grid deletion + the seven-group rewrite + the
first six ops + one frame, one `stack`, one state, one arrow, one save, one replay: MVP 14) is one PR,
because the door is one-way and half-open is red. S1 runs before it is written; the grammar change and
the `stack` + `text` primitives land ahead of it as ordinary catalog PRs, and the swap PR consumes them.
The remaining primitives, groups, import, the compose loop and ratify are width on top, each two-way.

**Pre-slice plans** (`.claude/plans/`): `canvas-pre-slice-sequence.md` (the order, and where each
pre-slice item lives) · `canvas-spike-s1-substrate-load.md` · `canvas-plusui-removal.md` ·
`canvas-grammar-children-many.md` · `canvas-swap-pr-brief.md` (incl. the T10 deferral) ·
`canvas-baseline-cascade.md`.

---
*Decided interactively with the PRD holder, 2026-08-28 — one round on the shape (in-place swap vs
board-first vs a second canvas), one on the four calls that change the slicing (the ops' home, the portal
mount, the override shape, the Figma source), with T1–T16 taken as named calls and T10 deferred on
evidence. Next: slice with `piv-slice-epic` (feed this doc + the PRD), running S1 before the swap PR and
S6 before the compose loop is planned.*
