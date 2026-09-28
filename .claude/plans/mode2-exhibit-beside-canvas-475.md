# Feature: the Mode 2 exhibit beside the canvas (G7)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

#311 lets the owner import a Brilliant part as **Mode 2**, a frozen original that is kept for comparison and never joins the
system. Today the choice is recorded (`component.propose {name, recordId, mode: 2}` on the ledger, `provenance.mode: 2` on the
import record) and then nothing shows it: `arrangement()` derives frames, notes and decision cards, and ignores proposals. This
ticket makes a Mode 2 proposal appear on the build canvas as an **exhibit**: a labelled reference node holding the original's
exported PNG, placed **beside** the flow, which can never be placed inside a frame. The rule is enforced in three places that
share one pure predicate: the `canvas.json` derivation (Node), the canvas page (browser), and the applier, which refuses any op
that would compose a frozen original into a frame.

## User Story

As the owner arranging a product flow on the build canvas
I want a frozen original I imported to sit beside my screens, labelled as the original
So that I can compare my system-built screens against the source drawing without it ever being mistaken for, or placed inside, a screen

## Problem Statement

PRD G7 ("Mode 2 stays beside the canvas") has no surface. A Mode 2 import writes a record, a proposal and a ledger line, and
the canvas shows nothing. There is also no rule anywhere that stops a frozen original from ending up in a frame, so G7 exists
only as a sentence in the PRD.

## Solution Statement

- **No new verb.** An exhibit is DERIVED from the `component.propose` records whose `mode` is 2. The epic's op-verb lock is
  held by #315, and `doc.proposals` already carries `{id, name, recordId, mode}` (`system/canvas-ops.mjs:423`). The node's id is the
  proposal's id (`pr1`), its type `exhibit`, its ref `proposal:<name>`.
- **One geometry rule, one size, in `system/canvas-ops.mjs`:** `EXHIBIT_SIZE = {w: 320, h: 280}` (fixed; an exhibit is a
  `.stx-slot`, which `studio-canvas.mjs` never gives an authored height and `studio-verbs.mjs` refuses to resize) and
  `exhibitClashes(doc, positions)` → every exhibit that meets a frame. **A frame with no authored height counts as reaching down
  without end**, because its height is its content's and Node cannot measure content. Page and Node call this ONE function with
  the SAME two arguments (the document and the authored half of `canvas.json`), so they agree by construction — the
  `placeDecision` precedent (`canvas-ops.mjs:570-591`), tightened. An owner who wants an original below a screen resizes that
  screen first, which authors its height; the refusal sentence says so.
- **The derivation refuses a clash.** `arrangement()` emits exhibit nodes and throws naming the exhibit, the frame and G7 when one
  meets a frame. `saveRun` therefore refuses before writing, and `verifyBuild` reports it. One site.
- **The import places it.** `runImport` computes the new exhibit's position with a new `placeExhibit(doc, positions)` (right of
  every authored box, at the frames' top row) and passes it to `saveRun`, because `arrangement()` refuses a node with no position
  and the import's files are already on disk by then (`import-run.mjs` invariant 3).
- **The page renders and guards.** `canvas.mjs` places each exhibit with its PNG and the Mode 2 label, and after any gesture that
  can move geometry (`ui.move`, `ui.move-group`, `ui.resize`, `ui.frame-size`, `ui.redo`) it runs the same predicate; a clash is
  undone at once, any `applied`+`undone` pair the refused gesture left in `pending` is removed, and the refusal is announced. The
  save never sees a clash, so the page never enters its `broken` state.
- **The applier refuses a frozen original in a frame** (owner's call, 2026-09-28: "guard today, hand off"): `screen.compose`'s
  composition, `state.add`'s `override.add` and `variant.add`'s `overrides.<frame>.add` may not name a Mode 2 proposal. The
  bullet about `group.place` goes to #315 and #313 as comments.

## Out of Scope / Non-Goals

- Not included: `group.place` refusing Mode 2. `group.place` does not exist (#315, open, holds the op lock) and takes a `groupId`,
  not a proposal. Handed off by comment on #315 and #313 (Task 5.4).
- Not included: `proposal.ratify` refusing a Mode 2 proposal. #313's; named in the same comment.
- Not included: removing or re-importing an exhibit. Undoing the import is already impossible from the page (the page reloads
  after an import, `canvas-import.mjs` header call 1); removal needs a verb and the op lock.
- Not included: a ΔE fidelity measurement on the exhibit (#474).
- Not included: exhibits in the handoff pack (`gen-handoff.mjs` does not read the build package yet).
- Not changing: Mode 1 proposals. They get no canvas node, exactly as today.
- Not changing: `studio-verbs.mjs`. Its header's "NOTHING BLOCKS A FREE MOVE" stands; the refusal lives in the canvas page's
  own consumer, which is where the build document's rules already live.
- Not changing: `system/studio-canvas.mjs` placement; an exhibit is an ordinary `.stx-slot`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/canvas-ops.mjs`, `portal/lib/canvas-store.mjs`, `portal/lib/import-run.mjs`, `portal/server.mjs`, `portal/public/canvas.mjs`, `portal/public/portal.css`, `tooling/build-checks.mjs` (groups 35, 36, 43), `tooling/canvas-journey.mjs`, `discovery/faster-payment/build/canvas.json`
**Dependencies**: none new

## Related Work

**Implements**: #475 · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (§ Recommended approach "Mode 2 exhibits are all nodes on one stage"; § Data model `canvas.json` node types `frame|note|decision|exhibit`; PRD `docs/epics/canvas-design-import.prd.md:139` and G7 at `:216`)

**Back-references**:

- `.claude/plans/import-run-recorded-import-311.md` (on `origin/main`) — Out of Scope lines 67-69 deferred exactly this: "The `exhibit` node, its `canvas.json` derivation, `CANVAS_DESCRIPTION`, `verifyBuild` and its position rule go to a follow-up."
- `.claude/plans/import-run-live-read-311-pr-b.md` — line 94 names #475; the live read is what writes `reference.png`.
- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md` — `placeDecision`'s authored-boxes rule, the page's four calls, `saveRun`.

**Forward-references**:

- #313 (`proposal.ratify` must refuse Mode 2) and #315 (`group.place`) — Task 5.4 comments on both.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

All line numbers are `origin/main` at `1b43cee`. **This checkout is on `fix/importer-reads-icon-name-449`, behind main — branch from `origin/main`.**

- `system/canvas-ops.mjs:1-47` (header conventions), `:103` (`plainObject`), `:112` (`emptyDoc`), `:117-121` (`nextId`), `:189-431` (`applyOp`; `screen.compose` `:218-238`, `state.add` `:244-279`, `variant.add` `:389-409`, `component.propose` `:410-425`), `:446-453` ("A READ IS NOT A VERB" — reads are total over junk and take no op lock), `:570-591` (`placeDecision`, the precedent for a shared placement rule over authored boxes).
- `portal/lib/canvas-store.mjs:1-31` (header: why the fold and derivation live here), `:35` (the ONE non-built-in import — group 36.6 pins it), `:96` (`CANVAS_DESCRIPTION`), `:113-133` (`foldLedger`), `:142-172` (`arrangement` — node key order `id, type, x, y, width, height?, ref`; a node with no position is refused by `at()`), `:176-183` (`positionsOf`), `:189-215` (`verifyBuild` — catches an `arrangement` throw as "the ledger does not fold into the arrangement: …"), `:224` (`readJson`, returns null on failure), `:309-336` (`saveRun`).
- `portal/lib/import-run.mjs:9-27` (invariants; 3 = record + transcript written BEFORE the op), `:74` (its `canvas-store` import line), `:321-341` (`writeImport`; `reference.png` written only when a live read supplied one), `:404-470` (`runImport`; the `saveRun` call is `:458-463`), `:474-508` (`importView` — the label and the `reference` data URL precedent).
- `portal/server.mjs:430-446` (the `/api/canvas/run` route — add `exhibits` here).
- `portal/public/canvas.mjs:1-24` (header — FOUR CALLS; call 3: a refused op is announced and NOT sent), `:33` (the canvas-ops import), `:114-134` (`readBox`, `gatherPositions`), `:279-295` (`placeCard` — mirror for `placeExhibitNode`), `:297-332` (`reconcile` — the `want` set), `:334-345` (`applyOwnerOp`), `:348-379` (`adapter` — `restore` turns a document difference into `undone`/`applied` pending lines; `resized` pushes `frame.size` before the history entry), `:387-416` (`flush` — any save error sets `broken`), `:533-573` (`registerConsumers`, incl. `ui.frame-size` `:560-567`), `:595-635` (`boot`; box seeding `:611-614`; `mountCanvasVerbs` `:622`; the `"*"` save consumer registered LAST `:630`).
- `system/action-bus.mjs:86-97` — exact handlers run in registration order, then `"*"`; `emit` is synchronous and a handler may emit.
- `system/studio-verbs.mjs:713-744` (`ui.move` consumer), `:763-797` (`ui.resize`; non-frames refused "is not resizable"), `:919-926` (`ui.undo` / `ui.redo` restore directly — **redo never emits `ui.move`**).
- `system/studio-canvas.mjs:611-668` (`place`) — a non-frame wrapper never gets `--h` (`height = isFrame ? … : undefined`).
- `portal/public/canvas-import.mjs:1-20` (header call 1: after an import the page reloads), `:59` (`modeValue`), `:207-210` (the mode radios, `name=cv-import-mode`).
- `portal/public/portal.css:289` (`.cv-flag`), `:313-325` (`.cv-note, .cv-card` block — mirror for `.cv-exhibit`).
- `tooling/build-checks.mjs:11234-11236` (group 35's import line), `:11263-11275` (`VALID_FOR`), `:11606-11618` (35.11 `placeDecision` — mirror for 35.13), `:11620-11654` (35.12), `:11656` (group 35's string), `:11681-11690` (group 36's imports and helpers), `:11733-11748` (36.2 — the IN-MEMORY-from-the-prefix pattern to mirror), `:11750-11776` (36.3 mutations), `:11778-11795` (36.4 regexes over `CANVAS_DESCRIPTION`), `:11797-11810` (36.5 byte round trip), `:11826-11842` (36.7 `stamp` helper), `:11932` (group 36's string), `:13791-13804` (group 43 helpers `afold`, `scratch`, `pkgCopy`, `ledger`), `:14026-14036` (43.8 — mirror for 43.15), `:14264` (group 43's string).
- `tooling/canvas-journey.mjs:1-63` (header), `:473-493` (step 10, pointer resize — mouse sequence to mirror), `:606-615` (`dropFile`), `:782-801` (`importVia`), `:818-846` (`fakeBridgePass` + I9, the paired fake bridge that writes `reference.png`), `:1025` (the summary line).
- `.claude/references/gates.md:59` (group 35), `:61` (group 36), `:78` (group 43), `:131` (`canvas-journey.mjs`).
- `discovery/README.md:670-700` (`canvas.json` — the dialect and the node list).

### New Files to Create

None. Every change lands in an existing file.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/canvas-design-import.prd.md:139` and `:216` — G7, verbatim: "Beside the canvas only, never inside a frame".
- `docs/epics/canvas-design-import.architecture.md:36-40` and `:101-160` — exhibits are stage nodes; `canvas.json` is derived and "never carries a fact the ops do not".
- [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/) — already cited by `CANVAS_DESCRIPTION`; `exhibit` is already divergence (1). No new divergence.

### Patterns to Follow

**A shared placement rule over authored boxes** (`system/canvas-ops.mjs:583-591`):

```js
export function placeDecision(anchor, taken, size = { w: 280, h: 160 }, gap = 32) {
  const fin = Number.isFinite;
  const box = (b) => (b && fin(b.x) && fin(b.y) && fin(b.w) ? { x: b.x, y: b.y, w: b.w, h: fin(b.h) ? b.h : size.h } : null);
  ...
```

Total over junk, no throw, the header states why both sides compute the same answer.

**A refusal names the verb, the thing and the rule** (`canvas-ops.mjs:253`): `` throw new Error(`state.add: "${p.baseId}" is itself the … — a state is a sibling of a SCREEN, …`) ``.

**A read is not a verb** (`canvas-ops.mjs:446-453`): `exhibitsOf` and `exhibitClash` go below that banner, never into `OPS`/`PARAMS`/the switch.

**Derivation refusal by `at()`** (`canvas-store.mjs:150-156`): a missing position throws `arrangement: node "<id>" has no position — …`.

**Every string from a package is `textContent`** (`canvas.mjs` header call 4) — the `el()` helper at `canvas.mjs:36-45`.

**Group case shape** (`build-checks.mjs:11606-11618`): literal numbers with the arithmetic in the message, junk inputs proven not to throw.

---

## IMPLEMENTATION PLAN

### Phase 1: The rule and the guard (`system/canvas-ops.mjs`)

`EXHIBIT_SIZE`, `exhibitsOf`, `exhibitClash`, and the frozen-original refusal in three verbs. Pure, SDK-free, driven by group 35.

### Phase 2: The derivation (`portal/lib/canvas-store.mjs`)

**Depends on:** Phase 1.
`arrangement` emits exhibits and refuses a clash; `placeExhibit` and `loadExhibits`; `CANVAS_DESCRIPTION` names exhibits; the committed spine's `canvas.json` is rewritten for its `$description`. Group 36.

### Phase 3: The import places it (`portal/lib/import-run.mjs`)

**Depends on:** Phase 2.
A Mode 2 `runImport` passes the exhibit's position to `saveRun`. Group 43.

### Phase 4: The route and the page

**Depends on:** Phases 1–3. **Independent of:** Phase 5's docs (write them last so they describe what landed).
`/api/canvas/run` carries `exhibits`; `canvas.mjs` renders and guards; `portal.css` styles.

### Phase 5: Journey, docs, regeneration, hand-off

**Depends on:** Phase 4.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 · BRANCH from `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c feat/mode2-exhibit-475 origin/main`. This session's checkout (`fix/importer-reads-icon-name-449`) is behind main and carries unrelated untracked files; stage by explicit path only (memory: shared worktree, parallel sessions).
- **GOTCHA**: a fresh tree needs `cd tooling/icons && npm ci` or build-checks group 41 fails on a missing `@phosphor-icons/core` — observed at planning on a fresh `origin/main` worktree (40 groups ✓, group 41 ✗ "tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing"). Environment, not code. The journey needs `(cd portal && npm ci)`.
- **VALIDATE**: `git log --oneline -1` → `1b43cee` or later; `node tooling/build-checks.mjs` → `build ✓` after `tooling/icons` is installed.
- **SATISFIES**: —  · **REGENERATES**: none

### Task 0.5 · RECORD the journey's pre-existing red (I4), so #475 is judged against it

- **FACT (observed 2026-09-28, planning):** `node tooling/canvas-journey.mjs all` on a clean `origin/main` (`1b43cee`) → 280 ✓, **3 ✗, the same line on chromium, firefox and webkit**: `I4 · the view's drop list grew by exactly one  11 → 11` (`canvas-journey.mjs:679`). Bisected without a browser (`editMapping` dropping `ir.children[0].children[3]` of the Figma fixture): at `c68a4ff` (before #478) the drop list goes **9 → 10**; at `1b43cee` (after #478) **11 → 11**. At BOTH commits that node already carried its two `read-then-dropped` size entries before the edit, so those entries are not the difference. Whether the journey's `+1` or #478's drop accounting is wrong is the ticket's question, not this plan's. Nothing in #475 touches either.
- **IMPLEMENT (needs the owner's OK — an outward action not yet approved):** `gh issue list --state open --search "canvas-journey I4"`; if none and the owner agrees, open one: title `canvas-journey I4: an owner drop no longer grows the drop list after #478 (9→10 before, 11→11 after)`, body = the FACT above. Do NOT fix it in #475's PR. Cite the ticket (or "owner declined; baseline recorded here") in the report and the PR.
- **VALIDATE**: `gh issue list --state open --search "canvas-journey I4" --json number` → one number.
- **SATISFIES**: AC 8 (defines its baseline) · **REGENERATES**: none

### Task 1.1 · ADD `EXHIBIT_SIZE`, `exhibitsOf`, `exhibitClash` to `system/canvas-ops.mjs`

- **IMPLEMENT**: below `placeDecision` (after `:591`), in the pure-reads section:
  - `export const EXHIBIT_SIZE = Object.freeze({ w: 320, h: 280 });` — header comment: fixed because an exhibit is a `.stx-slot` (no authored height in `studio-canvas.mjs`, "not resizable" in `studio-verbs.mjs`), so the page's CSS box and Node's box are this one number.
  - `export function exhibitsOf(doc)` → `[{ id, name, recordId }]` for every `doc.proposals` entry with `mode === 2`, in proposal order. Total over junk (non-array `proposals`, `null` entries, entries missing `id` → skipped).
  - `export function exhibitClashes(doc, positions)` → `[{ exhibitId, frameId }]`, ONE entry per exhibit that meets a frame (its first), `[]` when clean. It builds the frame boxes itself — `{ id, x: positions[id].x, y: positions[id].y, w: f.width, h: positions[id].h when finite }` — and the exhibit boxes from `positions[e.id]`, skipping any node with no finite position (the derivation's `at()` refuses those separately). **This is the only function either side calls**, with the same two arguments: `arrangement` passes the authored positions it is deriving under; the page passes `gatherPositions()`, which already writes a frame's `h` only when `authoredH` holds it (`canvas.mjs:124-134`) — exactly `canvas.json`'s semantics. Page and Node therefore agree BY CONSTRUCTION, not by two callers each assembling boxes the same way (R1).
  - `export function exhibitClash(exhibit, frames)` → the primitive `exhibitClashes` loops over: the `id` of the first frame whose box meets `[x, x+EXHIBIT_SIZE.w) × [y, y+EXHIBIT_SIZE.h)`, else `null`. A frame box is `[f.x, f.x+f.w) × [f.y, f.h finite ? f.y+f.h : Infinity)`. Strict overlap (`a < b2 && b < a2`), so touching edges pass. Junk exhibit (non-finite x/y) → `null`; junk frames skipped. Header states: the unbounded height is the conservative reading of "a frame's height is its content's until someone authors one" (the `CANVAS_DESCRIPTION` divergence 2), and it is why "beside" means beside.
- **PATTERN**: `placeDecision` `canvas-ops.mjs:570-591`.
- **GOTCHA**: do NOT add anything to `OPS`, `PARAMS` or the switch (op-verb lock, #315). The import pin (35.9) must stay `["./device-presets.mjs"]`.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(m=>{const f1={id:"f1",x:0,y:0,w:390},f2={id:"f2",x:472,y:0,w:390};console.log(m.exhibitClash({x:1518,y:0},[f1,f2]),m.exhibitClash({x:100,y:900},[f1,f2]),m.exhibitClash({x:100,y:700},[{...f1,h:600}]),m.exhibitClash({x:100,y:500},[{...f1,h:600}]),m.exhibitClash({x:390,y:0},[f1]),m.exhibitsOf({proposals:[{id:"pr1",name:"a-row",recordId:"i1",mode:1},{id:"pr2",name:"b-row",recordId:"i2",mode:2},null]}))})'` → expected `null f1 null f1 null [ { id: 'pr2', name: 'b-row', recordId: 'i2' } ]` (observed on a scratch prototype of the same rule: `proto475.mjs`, planning session).
- **SATISFIES**: AC 1, AC 3 · **REGENERATES**: counts toward the `loc-summary` flip (Task 5.3)

### Task 1.2 · ADD the frozen-original refusal to `applyOp`

- **IMPLEMENT**: a private `refuseFrozen(verb, tree, doc)` beside `plainData`: builds the Mode 2 name set from `doc.proposals` (`mode === 2`), walks a composition tree (`{name, children?}`, recursing into `children` only — never into `props`, where a component may legitimately carry a prop called `name`), and throws `` `${verb}: "${name}" is a frozen original (Mode 2, ${pr.id}) — it stays beside the flow as an exhibit and never enters a frame (G7)` ``. Accept a single node or an array of nodes. Call it:
  - `screen.compose` on `p.composition`, after the `why` check;
  - `state.add` on `p.override?.add` when present;
  - `variant.add` on each `ov.add` inside the existing `for (const [fid, ov] …)` loop, when present.
- **GOTCHA**: it reads `next.proposals` (already defaulted at `:205`). A name proposed AFTER a frame already uses it is not caught (the applier refuses forward, never retroactively); state this in the header comment and in NOTES. `frameTree` flags `overrides.add` as unsupported (`:551`) — the guard still applies to it, because the data is what G7 protects.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(({applyOps})=>{try{applyOps([{op:"component.propose",params:{name:"frozen-row",recordId:"i1",mode:2}},{op:"screen.compose",params:{screenId:"s",why:"a reason that names a decision",composition:{name:"stack",children:[{name:"frozen-row"}]}}}]);console.log("NO THROW")}catch(e){console.log(e.message)}})'` → expected `op 1 (screen.compose): screen.compose: "frozen-row" is a frozen original (Mode 2, pr1) — …(G7)`.
- **REDDENS**: delete the `refuseFrozen` call in `screen.compose` → 35.14's `screen.compose` case fails with "a composition naming a frozen original was ACCEPTED".
- **SATISFIES**: AC 4 · **REGENERATES**: `loc-summary` (Task 5.3)

### Task 1.3 · ADD group 35 cases 35.13 and 35.14; widen the import and the group string

- **IMPLEMENT**: add `EXHIBIT_SIZE, exhibitClash, exhibitClashes, exhibitsOf` to the import at `build-checks.mjs:11234`. After 35.12:
  - **35.13 exhibitsOf and exhibitClash**: `EXHIBIT_SIZE` is `{w: 320, h: 280}` and frozen by mutation (assign `w = 1` in a try, re-read); `exhibitsOf` returns Mode 2 only, in order, total over 5 junk docs; `exhibitClash` over the six literal cases from Task 1.1 (1518/0 → null; 100/900 → f1 "a frame with no authored height reaches down without end"; 100/700 below an authored 600 → null; 100/500 → f1; touching at 390 → null; f2 widened to w 1100 against 1518/0 → f2) and junk (null exhibit, `[null, 7, {x:"a"}]` frames) → null, no throw. `exhibitClashes` over a folded doc (f1, f2 composed; one Mode 2 proposal `pr1`): positions `{f1:{x:0,y:0}, f2:{x:472,y:0}, pr1:{x:1518,y:0}}` → `[]`; `pr1:{x:100,y:900}` → `[{exhibitId:"pr1",frameId:"f1"}]`; the same with `f1:{x:0,y:0,h:600}` → `[]` (the authored height from `positions` is honoured — this is the R3 escape hatch, proven in Node); `pr1` with no position → `[]` (not this function's refusal); a frame's `w` taken from the DOC even when `positions.f2.w` says 9999 → `[]` for `pr1` at 1518 (the arrangement never owns a frame's width).
  - **35.14 the frozen-original refusal**: fold `component.propose` mode 2 `frozen-row`; then each of `screen.compose` (nested two levels in `children`), `state.add` with `override: {add: {name: "frozen-row"}}` on a composed f1, `variant.add` with `overrides: {f1: {add: [{name: "frozen-row"}]}}` → `names(fn, verb, "frozen-row", "pr1", "G7") === null`. POSITIVE CONTROLS: the same three ops naming a **Mode 1** proposal's name are accepted; a `props: {name: "frozen-row"}` (a prop, not a node) is accepted.
  - Append to group 35's string (`:11656`): exhibits derived from Mode 2 proposals, the clash rule with the unbounded-height reading, and the three-verb refusal with its two positive controls; extend "What it cannot reach" with "whether the page puts a refused move back (canvas-journey's)".
- **PATTERN**: 35.11 `:11606-11618`; 35.12's `pbroke`/`names` table `:11632-11645`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "canvas ops"` → `build canvas ops     ✓`.
- **REDDENS**: (a) change `exhibitClash`'s `Infinity` to `f.y` → 35.13 fails "100/900 below f1 answered null; a frame with no authored height reaches down without end". (b) Task 1.2's mutation. (c) walk `props` in `refuseFrozen` → the prop positive control fails "a prop called name was refused".
- **SATISFIES**: AC 1, AC 3, AC 4, AC 7 · **REGENERATES**: none

### Task 2.1 · UPDATE `portal/lib/canvas-store.mjs`: exhibits in `arrangement`, `placeExhibit`, `loadExhibits`, `CANVAS_DESCRIPTION`

- **IMPLEMENT**:
  - Import line `:35` becomes `import { applyOps, EXHIBIT_SIZE, exhibitClashes, exhibitsOf } from "../../system/canvas-ops.mjs";` (still exactly one non-built-in module — 36.6 holds).
  - `arrangement(doc, positions)`: after the decision nodes, append `...exhibitsOf(doc).map((e) => { const p = at(e.id); return { id: e.id, type: "exhibit", x: p.x, y: p.y, width: EXHIBIT_SIZE.w, height: EXHIBIT_SIZE.h, ref: `proposal:${e.name}` }; })`. Then `const clash = exhibitClashes(doc, positions)[0]`; if present throw `` `arrangement: exhibit "${clash.exhibitId}" (${name}) meets frame "${clash.frameId}" — a frozen original stays beside the flow, never inside a frame (G7)` ``. Never assemble frame boxes here: the shared function is the one place that does (R1). Width and height come from `EXHIBIT_SIZE`, never from `positions` (a hand-edited width must fail `verifyBuild`).
  - `export function placeExhibit(doc, positions, gap = 32)` → `{x, y}`: `x` = the largest right edge over every AUTHORED box (frames: `positions[id].x + f.width`; notes and decision cards: `x + w`; exhibits already placed: `x + EXHIBIT_SIZE.w`) plus `gap` (0 with no boxes); `y` = the smallest frame `y` (0 with no frames). Guaranteed clear of every frame because its x is past every frame's right edge. Node-only (the page never places an exhibit — the import reloads it), so it lives here, not in `system/`.
  - `export function loadExhibits(pkgRoot, doc)` → `[{ id, name, recordId, tool, file, attribution, licence, reference }]` for `exhibitsOf(doc)`; reads `build/imports/<recordId>.json` with the local `readJson` (null-safe) and `build/imports/<recordId>.reference.png` → `data:image/png;base64,…` or `null`. `recordId` is already `^i[1-9][0-9]*$` (the applier refuses anything else), so the join cannot escape.
  - `CANVAS_DESCRIPTION`: inside "Every node and edge here — …", after "every decision card and every `embodies` edge from a frame to a decision in its decisionRefs (#306)", add "and one `exhibit` per Mode 2 `component.propose` (#475) — the frozen original, `EXHIBIT_SIZE` 320×280, its id the proposal's and its ref `proposal:<name>`, whose box never meets a frame's (a frame with no authored height counts as reaching down without end)". Keep "decision card" … "`embodies`" in that order (36.4's regex `/decision card.*`embodies`/`).
  - Header (`:11-16`): one sentence that the exhibit derivation and `placeExhibit` live here for the same reason.
- **GOTCHA**: node order is frames, notes, decisions, exhibits; `verifyBuild` also checks ORDER (`:212`). `positionsOf` already reads an exhibit's `{x, y, w, h}`; no change there.
- **VALIDATE**: `node --input-type=module -e 'import {arrangement,foldLedger,loadBuild,positionsOf,placeExhibit} from "./portal/lib/canvas-store.mjs"; const p=loadBuild("discovery/faster-payment/build"); const ops=[...p.ops,{seq:7,at:"2026-09-28T00:00:00.000Z",source:"owner",op:"component.propose",params:{name:"frozen-row",recordId:"i1",mode:2},status:"applied"}]; const doc=foldLedger(ops).doc; const pos=positionsOf(p.canvas); pos.pr1=placeExhibit(doc,pos); console.log(JSON.stringify(arrangement(doc,pos).nodes.at(-1)))'` → expected `{"id":"pr1","type":"exhibit","x":1518,"y":0,"width":320,"height":280,"ref":"proposal:frozen-row"}` (derived: d8 at 1206 + 280 + 32 = 1518; observed 1518 on the prototype).
- **SATISFIES**: AC 1, AC 2 · **REGENERATES**: `discovery/faster-payment/build/canvas.json` (Task 2.2)

### Task 2.2 · REGENERATE the committed spine's `canvas.json`

- **IMPLEMENT**: `node --input-type=module -e 'import {arrangement,foldLedger,loadBuild,positionsOf,saveBuild} from "./portal/lib/canvas-store.mjs"; const r="discovery/faster-payment/build"; const p=loadBuild(r); saveBuild(r, arrangement(foldLedger(p.ops).doc, positionsOf(p.canvas)), p.ops);'`
- **GOTCHA**: `saveBuild` also rewrites `ops.jsonl` (truncate + append). It must come back byte-identical (36.5 proves the round trip). `git diff --stat discovery/` must show ONE changed line: `canvas.json`'s `$description`. Any other diff is a bug in Task 2.1, not something to commit.
- **VALIDATE**: `git diff --stat -- discovery/` → `discovery/faster-payment/build/canvas.json | 2 +-`, `1 file changed`.
- **SATISFIES**: AC 2 · **REGENERATES**: this file

### Task 2.3 · ADD group 36.11; widen 36.4 and the group string

- **IMPLEMENT**: import `placeExhibit` into group 36's destructure (`:11683`) and `exhibitsOf` via `canvas-ops`. **36.11**, in memory from the frozen prefix (36.2's pattern) plus one `component.propose` line (36.7's `stamp`), on a scratch dir written with `saveBuild` (never the committed package):
  - Mode 2 → `arrangement` derives `pr1` `{type: "exhibit", x: 1518, y: 0, width: 320, height: 280, ref: "proposal:frozen-row"}`, and `verifyBuild` on the scratch package is `[]` (the positive control).
  - Mode 1 → no exhibit node, `verifyBuild` `[]`.
  - The exhibit MOVED to `{x: 100, y: 900}` in `canvas.json` → `verifyBuild` names `"pr1"`, `"f1"` and `"G7"`.
  - The exhibit moved to `{x: 2000, y: 600}` (clear of both frames) → `verifyBuild` `[]` (a moved exhibit is authored, like a moved frame).
  - `width` edited to 999 → names `pr1` and "the ops derive".
  - An extra exhibit node `pr9` the ops never made → "carries a fact the ops do not".
  - No position for `pr1` → `arrangement` throws "pr1" "no position".
  - 36.4: add `["the #475 exhibits", /`exhibit` per Mode 2/]` to its regex table.
  - Append to group 36's string; its "cannot reach" gains "whether the page renders the exhibit's PNG (canvas-journey's)".
- **PATTERN**: 36.2 `:11733-11748`, 36.3 `:11750-11776`, 36.7 `stamp` `:11829`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build package"` → `build build package  ✓`.
- **REDDENS**: (a) remove the clash `throw` from `arrangement` → 36.11 "the exhibit moved inside f1 passed verifyBuild". (b) read `width` from `positions` → "width edited to 999 passed". (c) drop exhibits from `arrangement` → the positive control fails "Mode 2 derives no pr1".
- **SATISFIES**: AC 1, AC 2, AC 7 · **REGENERATES**: none

### Task 3.1 · UPDATE `runImport` to place a Mode 2 exhibit

- **IMPLEMENT**: `import-run.mjs:74` gains `foldLedger, placeExhibit`; the `canvas-ops` import (`:71`, today `{ PROPOSAL_NAME_RE }`) gains `exhibitsOf`. Replace the `positions: positionsOf(pkg?.canvas)` argument at `:461` with a `positions` built before the call:
  ```js
  const op = { op: "component.propose", params: { name, recordId: id, mode }, status: "applied" };
  const positions = positionsOf(pkg?.canvas);
  if (mode === 2) {
    const { doc } = foldLedger([...(pkg?.ops ?? []), op]);
    const ex = exhibitsOf(doc).find((e) => e.recordId === id);
    positions[ex.id] = placeExhibit(doc, positions);
  }
  ```
  and pass `ops: [op]`. Add one header line under THE LIVE READ or at the op-line note: a Mode 2 import places its exhibit by `placeExhibit`, because `arrangement` refuses a node with no position and the record is already on disk (invariant 3).
- **GOTCHA**: no new module in the import graph (43.1 reads specifiers). The fold throws exactly where `saveRun`'s would, so a bad op is still refused before the append.
- **VALIDATE**: Task 3.2's group.
- **SATISFIES**: AC 2, AC 5 · **REGENERATES**: none

### Task 3.2 · ADD group 43.15

- **IMPLEMENT**: after 43.8, on `pkgCopy("m2")`: `runImport({ …, entrance: "selection", mode: 2, reader: async () => ({ text: BLUEPRINT.toString("utf8"), transcript: [], reference: BM.parseExport(live("export-png.json")).bytes }) })` (`BM` and `live` are group 43's, `:13826` and `:13836`; that capture is the committed 790×402, 2155-byte PNG 43.11 already reads) → exactly one appended line with `params.mode === 2`; `canvas.json` carries `pr1` at `{x: 1518, y: 0}` type `exhibit`; `verifyBuild(loadBuild(…))` is `[]`; `loadExhibits(pkg, doc)[0].reference` starts `data:image/png;base64,iVBOR`. A second Mode 2 import on the same copy → `pr2` at `x: 1870` (derived: 1518 + 320 + 32). A Mode 2 DROP (no reader, so no PNG) → `loadExhibits(...).reference === null` and `tool === "brilliant"`, `file === "m.txt"`. Append to group 43's string.
- **PATTERN**: 43.8 `:14026-14036`; the fixture reader 43.12 `:14150-14165`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "import run"` → `build import run     ✓`.
- **REDDENS**: revert Task 3.1 → `runImport` throws `arrangement: node "pr1" has no position`, 43.15 reports "a Mode 2 import appended 0 lines" and `imports/i1.json` IS on disk (the orphan the fix prevents — assert its presence to name it).
- **SATISFIES**: AC 2, AC 5, AC 7 · **REGENERATES**: none

### Task 4.1 · UPDATE `/api/canvas/run` to carry `exhibits`

- **IMPLEMENT**: `portal/server.mjs:430-446` — import `loadExhibits` from `./lib/canvas-store.mjs` alongside the existing names; add `exhibits: loadExhibits(root, doc)` to the JSON body. Named key, no spread.
- **VALIDATE**: portal smoke on a free port (Level 4) — `curl -s "http://127.0.0.1:$PORT/api/canvas/run?provenance=fictional&slug=faster-payment" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).exhibits)))'` → `[]`.
- **SATISFIES**: AC 6 · **REGENERATES**: none

### Task 4.2 · UPDATE `portal/public/canvas.mjs`: render the exhibit and guard it

- **IMPLEMENT**:
  - Import `EXHIBIT_SIZE, exhibitClashes, exhibitsOf` at `:33`. `let exhibitMeta = new Map();` filled in `boot` from `run.exhibits` by id.
  - `exhibitParts(e)`: a title "Frozen original · Mode 2"; the `<img>` (`src` = the data URL, `alt` = `The original ${name}, as exported from ${tool}`) or, when `reference` is null, a `.cv-flag` "No reference image — only a live Brilliant read captures one; this import was a dropped file."; a meta line `${name} · import ${recordId} · ${file ? `dropped file ${file}` : `read from ${tool}`}`; a line "Beside the flow for comparison. It never joins the system and never goes inside a frame."; and "Attribution: … · licence: …" with "not recorded" for null. All `textContent`.
  - `placeExhibitNode(id)`: `node = el("div", { class: "cv-exhibit" }, ...exhibitParts(meta))`, `node.style.width/height` from `EXHIBIT_SIZE`, `dataset.stxName = `Original ${name}``, `canvas.place(node, { x: b.x, y: b.y, w: EXHIBIT_SIZE.w, name: `Original ${name}`, component: "exhibit", id })` where `b = boxes.get(id)` (a missing box is impossible — the server placed it — so fall back to `{x: 0, y: 0}` and let the guard refuse it rather than invent a rule here); `onStage.set(id, { node, wrap, kind: "exhibit", sig: id })`.
  - `reconcile()`: add `...exhibitsOf(doc).map((e) => e.id)` to `want`; place any missing one after the decision cards.
  - The guard, registered in `boot` AFTER `verbs = mountCanvasVerbs(...)` and BEFORE `bus.on("*", scheduleSave)`: `for (const t of ["ui.move", "ui.move-group", "ui.resize", "ui.frame-size", "ui.redo"]) bus.on(t, keepExhibitsBeside);`. `keepExhibitsBeside(action)`: `const clash = exhibitClashes(doc, gatherPositions())[0]` — the SAME call `arrangement` makes, over the same authored half the save would send (R1). On a clash: `bus.emit({ type: "ui.undo", source: action?.source ?? "keyboard" })` (the bus loop is synchronous and re-entrant, `action-bus.mjs:86-97`; `history.undo()` + `restore` write the boxes back synchronously through `applyBox`, `studio-verbs.mjs:303-306` and `:586-611`, so a re-check straight after sees the put-back stage), then drop a trailing `applied X` + `undone X` pair (same `canon({op, params})`) from `pending`, then `canvas.say(refusal(clash))` — said AFTER the undo, because the undo's own "Undone: …" would otherwise be the live region's last word. `refusal(clash)` = `` `Refused: the original ${name} would sit inside ${frameName(f)} — a frozen original stays beside the flow (G7). Put back. To place it below ${frameName(f)}, give that screen a height first (resize it).` `` The last sentence is R3's answer: a resize authors the frame's height (`adapter.resized` → `authoredH.add`, `canvas.mjs:367-371`), and an authored height ends the "reaches down without end" reading, so the owner has an existing gesture to place an original below a screen.
  - **The save backstop (R1).** In `flush` (`canvas.mjs:387`), right after `const positions = gatherPositions();`: `const clash = exhibitClashes(doc, positions)[0]; if (clash) { setSave(`Not saved yet — ${refusal(clash)}`); return; }` — BEFORE `saving = true` and the fetch, and WITHOUT setting `broken`. `pending` is kept, so the next clean gesture saves everything. The guard list is the primary path; the backstop means any path the list missed (a future verb, an align via `ui.move-group` from a verb not yet written) costs one unsent save with a sentence, never a dead session. Header call 5 names both.
  - Header: add call 5 — "A FROZEN ORIGINAL NEVER ENTERS A FRAME (G7, #475)" — naming the five verbs, why redo and `ui.frame-size` are on the list, and that the refused gesture leaves no ledger line.
- **GOTCHA** (each from the code, not assumed):
  - `ui.redo` restores positions WITHOUT emitting `ui.move` (`studio-verbs.mjs:923-926`), so without it a redo reinstates a refused clash and the next save throws.
  - `ui.frame-size` (the inspector, `canvas.mjs:560-567`) and `ui.resize` (`adapter.resized`, `:367-378`) both push a `frame.size` `applied` line into `pending` before the guard runs; the undo pushes its `undone` twin; header call 3 says a refused gesture records NOTHING, so the pair is removed. `flush` is a microtask (`scheduleSave`, `:381-385`), so the pair is always still local.
  - A failed save sets `broken` and kills the session (`:410-412`). The guard is what keeps a clash from ever reaching the server.
  - Frame boxes use `f.width` from `doc`, never the measured wrapper width, and `h` only when authored — exactly Node's inputs, or the page accepts what `arrangement` refuses.
  - `gatherPositions` (`:124-134`) already writes `{x, y, w}` for non-frames; `arrangement` ignores the `w` for exhibits. No change there.
- **VALIDATE**: `node --check portal/public/canvas.mjs` → no output; the page leg in Task 5.1.
- **SATISFIES**: AC 3, AC 6 · **REGENERATES**: none (`portal/` is outside every `loc-summary` group)

### Task 4.3 · ADD the `.cv-exhibit` block to `portal/public/portal.css`

- **IMPLEMENT**: after the `.cv-note, .cv-card` block (`:313-325`): `box-sizing: border-box`, a flex column, the same surface/border/radius tokens as `.cv-card`, a dashed border (the one visual difference that says "not a screen"), `overflow: hidden`; `.cv-exhibit img { flex: 1; min-height: 0; width: 100%; object-fit: contain; }` (`min-height: 0` — memory: grid/flex items holding wide content blow out without it); `.cv-exhibit-title { font-weight: 600; }`. Tokens only; no literal colour.
- **VALIDATE**: `grep -n "cv-exhibit" portal/public/portal.css` → the block; no `#` hex inside it.
- **SATISFIES**: AC 6 · **REGENERATES**: none (the portal is not in the VR set)

### Task 5.1 · ADD the exhibit step to `tooling/canvas-journey.mjs`

- **IMPLEMENT**: a new step inside `fakeBridgePass` after I9 (`:846`), same paired child, same `fp-import` copy: `"X1–X5 · a Mode 2 import is an exhibit beside the flow (#475)"`.
  - X1: `await openPanel(page)`, check `input[name=cv-import-mode][value="2"]`, `importVia(page, "[data-import-selection]")` → a record; the ledger's last line has `params.mode === 2`; after the reload exactly one `[data-stx-component="exhibit"]` whose `data-stx-id` is the new proposal id, whose `img` is `complete` with `naturalWidth > 0`, and whose text includes "Frozen original · Mode 2"; its `canvas.json` box equals `placeExhibit(doc, positionsOf(canvasBefore))` recomputed in Node (not a literal — earlier steps may have moved nodes).
  - X2 (measured, independent of the predicate): the exhibit wrapper's `getBoundingClientRect()` meets no `.stx-frame` wrapper's.
  - X3: pointer-drag the exhibit's `.stx-grab` onto f1's centre (mirror step 10's mouse loop) → the live region contains "Refused" and "beside the flow"; the exhibit's box is back within 1 px of where it was; ledger length unchanged; `[data-canvas-save]` does not start "Not saved".
  - X4: first read the exhibit's `x` (`ex`) and f1's and f2's `x` from `canvas.json` on disk, and PRECONDITION `f1.x + 1440 <= ex < f2.x + 1440` — fail naming the three numbers if it does not hold (an earlier step moved something, so the accept/refuse below would mean nothing). On the committed layout it holds: 1440 ≤ 1518 < 1912. Then f2's Details → preset `desktop` → refused; f2 is still its old width (`wOf`); ledger length unchanged (no `applied`+`undone` pair). Then f1 → `desktop` → ACCEPTED (one `frame.size` line) and undone (one `undone` line). The positive control: the guard does not refuse everything.
  - X6 (R3's escape hatch, the positive control for the unbounded reading): pointer-resize f1 by its grip (step 10's loop) so its height is AUTHORED, undo nothing; then drag the exhibit to just below f1's authored bottom edge in f1's column → ACCEPTED: no "Refused", `canvas.json` shows the exhibit at the new y, and `verifyBuild` on disk is `[]`. Then drag it back beside the flow.
  - X5: `dropFile` with mode 2 checked first → an exhibit whose `.cv-flag` includes "No reference image" and which has no `img`. Then Node-side `verifyBuild(loadBuild(fp-import build))` is `[]`.
  - Update the header's WHAT IT PROVES (fake-bridge paragraph) and the summary line at `:1025`.
- **GOTCHA**: `dropFile` clicks the Import verb itself; check the mode radio after the panel opens, before `setInputFiles`. The radio resets to 1 on every reload. The paired child already runs with `UXF_IMPORT_SUGGEST=off` (`:163`), so X1 spends nothing.
- **VALIDATE**: `node tooling/canvas-journey.mjs all` → every X line ✓ on chromium, firefox and webkit, and the run's ✗ lines are EXACTLY the three `I4 · the view's drop list grew by exactly one  11 → 11` of Task 0.5 (compare with `grep "✗"` against the baseline; any other ✗ is #475's); `git status --porcelain -- discovery/ system/ handoff/ import/overrides/` unchanged across it.
- **REDDENS**: (0) remove `"ui.move"` from the guard list → X3 now relies on the backstop: the save line reads "Not saved yet — Refused: …" (not "Not saved — … Reload"), the exhibit stays inside f1 on screen, and nothing reached the ledger — proving the backstop keeps the session alive; restore the entry. (a) remove `"ui.redo"` from the guard list and add an X3b "Redo after the refusal" → the save line reads "Not saved — … meets frame". (b) remove the pending-pair removal → X4 "ledger length unchanged" fails with two new lines (`frame.size` applied, then undone).
- **SATISFIES**: AC 3, AC 6, AC 8 · **REGENERATES**: none

### Task 5.2 · UPDATE the prose copies of the gates and the format

- **IMPLEMENT**: `.claude/references/gates.md` group 35 (`:59`), 36 (`:61`), 43 (`:78`) and `canvas-journey.mjs` (`:131`) — each gains its #475 sentence and its "cannot reach" edit, in the same words as the group strings (memory: gate prose has three copies — `gates.md`, the `group()` string, the header). `discovery/README.md` `:691-694` ("Since #306 the nodes are …") gains the exhibit node and its ref; divergence 2's sentence gains "an exhibit's height is always written (`EXHIBIT_SIZE`)".
- **VALIDATE**: `grep -c "#475" .claude/references/gates.md` → `4`; `grep -n "exhibit" discovery/README.md` → the new lines.
- **SATISFIES**: AC 7 · **REGENERATES**: none

### Task 5.3 · REGENERATE `loc-summary.json` and the three approach baselines

- **IMPLEMENT**: `git add system/canvas-ops.mjs` FIRST (gen-loc counts the index), then `node agent-layer/gen-loc-summary.mjs`. Runtime raw count at planning: **32,435** (observed, 80 files) → rounds to 32,400; Tasks 1.1–1.2 add ~60–90 lines (expected), so the runtime group lands on 32,500. If `runtime.linesApprox` moved, from a CLEAN detached worktree under `/Users` (never `/private/tmp` — Docker file sharing):
  `cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && rm -f baselines/approach-neutral.png baselines/approach-saulera.png baselines/approach-verdant.png && npx playwright test --update-snapshots --workers=1'`
  — the `rm` inside the `sh -c`, after `npm ci` (a failed install must not leave the tree short).
- **GOTCHA** (memories): `--check` before staging is a false "no drift"; `update:docker` silently keeps a baseline whose only change is a digit (so `rm`); it screenshots the working tree, so a dirty tree bakes in someone else's edits; the `approach` two-stable-shots flake is CI noise, not a regression.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`; `git status --porcelain tooling/visual-regression/baselines/` → exactly the three `approach-*.png`; then the same image WITHOUT `--update-snapshots`: `docker run … sh -c 'npm ci && npx playwright test -g approach --workers=1'` → `3 passed`. **Toolchain proven at planning (observed):** Docker 29.2.1 running, `mcr.microsoft.com/playwright:v1.61.1-jammy` pulled, and that exact test command on a clean `origin/main` worktree at `/Users/Berzins/Desktop/Linards_current/wt-475-baseline` → `approach · neutral/saulera/verdant ✓, 3 passed (5.1s)`. Run the regen from a fresh detached worktree of the COMMITTED #475 branch in the same parent folder (Docker file sharing covers `/Users`).
- **SATISFIES**: AC 9 · **REGENERATES**: `system/loc-summary.json`; `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`

### Task 5.4 · COMMENT on #313 and #315 (owner's call, 2026-09-28)

- **IMPLEMENT**: `gh issue comment 313` — `proposal.ratify` must refuse a Mode 2 proposal (G7; a frozen original never joins the vocabulary), naming `exhibitsOf` and the group 35.14 refusal as the pattern. `gh issue comment 315` — #475 moved "group.place refuses a Mode 2 proposal" here; `group.place` takes a `groupId`, so the check is that a group DEFINED from parts may not contain a Mode 2 name, reusing `canvas-ops.mjs`'s `refuseFrozen`. Both end with "from #475".
- **VALIDATE**: `gh issue view 313 --comments | grep -c "#475"` ≥ 1, same for 315.
- **SATISFIES**: AC 4 (hand-off half) · **REGENERATES**: none

---

## TESTING STRATEGY

No suite (CLAUDE.md). The gates are build-checks groups 35/36/43 (CI) and `canvas-journey.mjs` (operator-run, three engines).

### Unit Tests

Group 35.13/35.14 drive the pure rules and the refusal through `applyOp`; group 36.11 drives the derivation through the store's own `verifyBuild` on scratch packages; group 43.15 drives the whole Mode 2 import on a copy of the spine.

### Integration Tests

`canvas-journey.mjs` X1–X5 on a portal child over the paired fake bridge: a real Mode 2 import, the reload, the rendered PNG, a refused drag, a refused and an accepted resize, a PNG-less drop, and `verifyBuild` on disk.

### Edge Cases

- A frame with no authored height directly above an exhibit's column (refused), and one with an authored height ending above it (accepted).
- Touching edges (accepted).
- Redo after a refusal (refused again, never saved).
- Inspector preset change growing a frame into an exhibit (refused, no ledger line).
- A Mode 2 drop with no PNG (flagged, not an empty box).
- A second Mode 2 import (placed right of the first: 1870).
- A Mode 1 proposal (no node).
- A prop called `name` inside a composition (not a node — accepted).

### Proving the checks

Each check-adding task carries its REDDENS. Positive controls: 35.14's Mode 1 and prop-`name` cases; 36.11's clean Mode 2 package and its clear move; X4's accepted f1 resize. Run each REDDENS once, see it red, revert.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

`for f in system/canvas-ops.mjs portal/lib/canvas-store.mjs portal/lib/import-run.mjs portal/server.mjs portal/public/canvas.mjs tooling/build-checks.mjs tooling/canvas-journey.mjs; do node --check "$f" || echo "FAIL $f"; done` → no output.

### Level 2: Unit Tests

`node tooling/build-checks.mjs` → `build ✓` (observed baseline at planning: 40 ✓ + group 41 ✗ for a missing `tooling/icons/node_modules` only).

### Level 3: Integration Tests

`(cd portal && npm ci) && node tooling/canvas-journey.mjs all` → `canvas-journey ✓ …` on three engines.

### Level 4: Manual Validation

Portal smoke on an OS-assigned port, killing only its own PID (memory: never kill by name or port):
`PORT=0`-style free port → `node portal/server.mjs &` → `curl /api/health` → `curl /api/canvas/run?provenance=fictional&slug=faster-payment` shows `"exhibits":[]` → `kill $!`. Then open `canvas.html` on a scratch copy, import in Mode 2 by drop, and eyeball the exhibit in a real browser (memory: the pixel gate's single engine has missed layout blowouts).

### Level 5: Additional Validation

`node agent-layer/gen-loc-summary.mjs --check` (after staging) · CI `verify` (drift-check, token-lint) · CI CodeQL (both legs) · the visual gate with the regenerated approach baselines.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Approach baselines regen (Docker, clean worktree under `/Users`) | $0, operator's machine; toolchain proven at planning (3 passed, 5.1 s) | yes — CI visual gate reds without it | — |
| The I4 ticket (Task 0.5) | $0, outward-facing, NOT yet approved | no | owner's yes, then Task 0.5 |
| `canvas-journey.mjs all` (three engines, `portal/node_modules`) | $0 | yes — AC 3/6/8 are proven only there | — |
| `canvas-journey.mjs chromium --live-brilliant` with Mode 2 against a real paired tab | $0, owner's hand (a paired brilliant.design tab) | no | note in the report's Not run; no ticket |
| Comments on #313 and #315 | $0, outward-facing, approved by the owner's 2026-09-28 choice | no | Task 5.4 |

No step spends tokens: the import path has no model and the journey runs with `UXF_IMPORT_SUGGEST=off`.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — A Mode 2 `component.propose` derives exactly one `exhibit` node in `canvas.json` (id = proposal id, `ref: proposal:<name>`, 320×280); a Mode 1 proposal derives none.
- [ ] AC 2 — `CANVAS_DESCRIPTION` names the exhibit; the committed spine's `canvas.json` carries the new text and still passes `verifyBuild`; a Mode 2 import leaves a package that passes `verifyBuild`.
- [ ] AC 3 — An exhibit can never sit inside a frame: `arrangement`/`saveRun`/`verifyBuild` refuse a clash naming the exhibit, the frame and G7, and the page puts a refused move, resize, preset change or redo back with a visible "Refused" announcement and no ledger line.
- [ ] AC 4 — The applier refuses `screen.compose`, `state.add` (`override.add`) and `variant.add` (`overrides.*.add`) naming a Mode 2 proposal; #313 and #315 carry the hand-off comment.
- [ ] AC 5 — A Mode 2 import places its exhibit by rule (right of every authored box, the frames' top row) and appends exactly one line.
- [ ] AC 6 — The canvas page renders the exhibit with the original's reference PNG and the Mode 2 label; a PNG-less Mode 2 import says so instead of showing an empty box.
- [ ] AC 7 — Groups 35, 36 and 43 cover the above with REDDENS proven; `gates.md`, the group strings and `discovery/README.md` agree.
- [ ] AC 8 — `canvas-journey.mjs all` on three engines: every new X line ✓ and no ✗ beyond the three pre-existing I4 lines (Task 0.5, ticketed), `discovery/`, `system/`, `handoff/`, `import/overrides/` unchanged across it.
- [ ] AC 9 — `loc-summary.json` and the three approach baselines regenerated; CI green.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Every REDDENS run once and seen red
- [ ] `node tooling/build-checks.mjs` ✓
- [ ] `canvas-journey.mjs all` ✓
- [ ] Portal smoke ✓
- [ ] Acceptance criteria all met
- [ ] Plan, report and review in the same PR; PR body `Closes #475`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (resolved, was R3) — "beside" is decided without content heights, and the owner has a way past it.** A frame with no authored height counts as reaching down without end. The existing resize gesture authors a frame's height (`adapter.resized` → `authoredH`), after which an original may sit below that screen; the refusal sentence tells the owner so, and group 35.13 (Node) and journey X6 (page) prove the escape hatch. No new decision needed.
- **Q2 (assumption) — `EXHIBIT_SIZE` is 320×280, fixed.** Not resizable because `studio-verbs.mjs` refuses resize on non-frames. A resizable exhibit would need that module changed and `h` persisted; out of scope.
- **Q3 (assumption) — the refusal is forward-only.** A name that is proposed as Mode 2 AFTER a frame already names it is not caught. In practice this cannot happen: `proposalName` never picks a vocabulary name, and a frame naming a non-vocabulary component is already refused at render.
- **Q4 — `loadExhibits` embeds PNGs as data URLs in the run response.** This matches `importView`'s precedent. At one or two exhibits per run the size is small. If runs grow to many exhibits, a byte route would be better.

## NOTES (open canvas)

**Alternatives weighed.**

| Option | Why not |
|---|---|
| A new `exhibit.place` verb | #315 holds the op-verb lock; the proposal already records the fact; a second record of one fact is what `canvas.json`'s "no fact the ops do not" forbids |
| An exhibit rail outside the stage (a side panel) | The issue asks for a node "derived into `canvas.json`" with a position rule; the architecture puts exhibits "on one stage" |
| Collision refusal inside `studio-verbs.mjs` | Its header's D-d: "NOTHING BLOCKS A FREE MOVE", and adding it would make an injected agent move behave differently from a pointer one (its AC #1 parity). The build document's rules belong to the page that owns the document |
| Clamp/snap the exhibit out of the frame instead of refusing | A position nobody chose; the owner's 2026-08-10 verdict named invisible snap-back as reading broken — hence "Refused … Put back." said aloud |
| `placeExhibit` in `canvas-ops.mjs` beside `placeDecision` | Only Node uses it; `canvas-store.mjs` is where Node-only derivation lives, and it keeps runtime LOC down |
| Deriving a missing exhibit position inside `arrangement` | The header refuses "a derivation that invented one"; the import supplies it instead, by a named rule, exactly as the page does for decision cards |

**Data flow.** Import (mode 2) → `writeImport` (record, md, transcript, `reference.png` if live) → `foldLedger(+op)` → `exhibitsOf` → `placeExhibit` → `saveRun` → `arrangement` (+exhibit, clash check) → `canvas.json`. Page reload → `/api/canvas/run` (`doc`, `canvas`, `exhibits`) → `reconcile` → `placeExhibitNode`. Gesture → verbs land it → `keepExhibitsBeside` → undo + drop the pending pair + announce, or nothing → `"*"` → save.

**Why the guard runs after the move, not before.** The bus has no cancel. Registering after `mountCanvasVerbs` means the page judges the box the verbs actually produced (after `setPos`'s clamp), which is also what the save would send.

**Pre-flight (run 2026-09-28, planning session, against a detached `origin/main` worktree at `1b43cee`).**

1. `node tooling/build-checks.mjs` → 40 groups ✓, group 41 (icons) ✗ "tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing" — environment on a fresh worktree; recorded as Task 0's GOTCHA.
2. `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`. Raw runtime count computed the generator's way (`git show :<f>` split on `\n`): 80 files, 32,435 → the cascade in Task 5.3 is certain for any change of 15+ lines.
3. The exhibit rule prototyped in scratch (`proto475.mjs`): spine placement `{x: 1518, y: 0}`, clash null; below f1 unbounded → f1; below an authored 600 → null; overlapping it → f1; touching at 390 → null; f2 widened to 1100 → f2; second exhibit 1870. These are the plan's literals.
4. Citations resolved against `origin/main` files this session: every `file:line` above was read or grepped (`canvas-ops.mjs`, `canvas-store.mjs`, `import-run.mjs`, `server.mjs`, `canvas.mjs`, `canvas-import.mjs`, `studio-verbs.mjs`, `studio-canvas.mjs`, `action-bus.mjs`, `portal.css`, `build-checks.mjs` 35/36/43, `canvas-journey.mjs`, `gates.md`, `discovery/README.md`).
5. Landed claims checked on `origin/main`: `exhibit` appears only in `CANVAS_DESCRIPTION`'s type list, the architecture, the PRD and `import/ir.mjs`'s comment — no derivation, no page code. `group.place` and `proposal.ratify` are absent from `OPS` (35.12 asserts the latter). #315 is OPEN and depends on #313, #314.

6. **Second pass (owner asked to close every risk, 2026-09-28).** `canvas-journey.mjs all` on clean `origin/main` → 280 ✓, 3 ✗ (I4 on all three engines; bisected to #478 by a browserless repro at `c68a4ff` vs `1b43cee`: 9→10 vs 11→11, the node's two size drops present before the edit at both) → Task 0.5. Docker 29.2.1 + the pinned Playwright image pulled; `npx playwright test -g approach` in it → 3 passed (5.1 s) → Task 5.3's procedure is proven. `studio-verbs.mjs` `createHistory` (`:287-310`) and `restore` (`:586-611`) read: undo writes boxes synchronously through `applyBox`, so the guard's undo leaves the stage put back before the `"*"` save's microtask. `action-bus.mjs:86-97`: nested `emit` is synchronous and safe.

**Risks closed in the second pass.**

- **R1 (page and server disagree → dead session)**: two fixes. (a) One function, one input: `exhibitClashes(doc, positions)` is the only clash call on both sides, fed the document and the authored half of `canvas.json` (`gatherPositions()` on the page), so agreement is by construction. (b) A save backstop in `flush` that refuses to send a clashing arrangement WITHOUT setting `broken`; proven by Task 5.1 REDDENS (0).
- **R2 (the screenshot cascade)**: unavoidable (any 15+ lines in `system/` flips 32,400 → 32,500), so made mechanical: toolchain present and proven green on main, exact command, `rm` inside the container, and a non-update re-run as the VALIDATE.
- **R3 ("beside" is strict)**: the existing resize gesture authors a frame's height and lifts the rule for that frame; the refusal sentence says so; 35.13 and journey X6 prove it. No owner decision left open.
- **R4 (new, found here)**: the journey was already red on main (I4, #478) → Task 0.5 records it (ticket on the owner's OK) so #475's AC 8 is judged against a true baseline.

**What changed in the plan because of the pre-flight.**

- `placeExhibit` must run inside `runImport` BEFORE `saveRun` (found reading invariant 3 + `at()`): otherwise a Mode 2 import leaves a record with no op. Task 3.1 and its REDDENS.
- `studio-canvas.mjs` gives a non-frame no `--h` and `studio-verbs.mjs` refuses to resize one → the exhibit's size became a fixed constant rather than an authored height.
- `ui.redo` and `ui.frame-size` added to the guard's list (redo restores without `ui.move`; the inspector changes width without `ui.resize`).
- The pending-pair removal added (both resize paths push `frame.size` before the guard can see the box).
- `CANVAS_DESCRIPTION` changing forces the committed spine's `canvas.json` rewrite (Task 2.2) — `verifyBuild` and 36.4 both compare it.
- The third bullet's scope was put to the owner (answer: guard today, hand off).

**Known traps carried as GOTCHAs:** loc-summary cascade + `rm` + clean worktree (memories `loc-summary-baseline-cascade`, `vr-gate-reads-working-tree`, `vr-update-skips-subperceptual`, `loc-summary-counts-tracked-only`); gate prose's three copies (`gate-prose-has-three-copies`); shared worktree staging (`shared-worktree-parallel-sessions`); portal smoke kill-own-PID (`portal-smoke-port-scoped-kill`); flex `min-height: 0` (`vr-gate-single-engine-blindspot`); `hidden` defeated by author display — not used here, the flag is a separate element.

## AMENDMENTS

- 2026-09-28 — risks closed at the owner's request: R1 by one shared `exhibitClashes(doc, positions)` call on both sides plus a non-fatal save backstop; R2 by proving the Docker/Playwright regen toolchain on main (approach 3 passed, 5.1 s); R3 by the resize escape hatch named in the refusal and proven in 35.13 and X6; R4 (new) the journey's pre-existing I4 red, bisected to #478 by a browserless repro, recorded in Task 0.5 (ticket pending the owner's OK). X4 now reads the exhibit's position before asserting.
