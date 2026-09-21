# Feature: the swap PR — the grid retired, the free substrate, `canvas-ops.mjs`, and MVP 14's spine

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **This is a one-way door.** Half-open is red: there is no green tree between "the grid is deleted"
> and "the free substrate is gated". Every phase below ends on a named green checkpoint and one
> commit, so the ground is recoverable *inside* the PR. Do not split the PR — the ticket, the brief
> (`.claude/plans/canvas-swap-pr-brief.md` § Why one PR) and the architecture
> (`docs/epics/canvas-design-import.architecture.md` § For slicing) each argue the one-PR shape
> independently, from the same observation: the grid is four CSS families mirrored across ten
> build-checks groups and 15 files.

## Feature Description

The studio's canvas places things on a **12 × 8 grid of slots** and zooms through a **five-step
table**. Both are attributes selected against rules in a stylesheet, which is what let
`system/studio-canvas.mjs` write zero inline styles and join build-checks group 7 with no exception
argued. The cost is that nothing can sit between two slots, `fit()` snaps to a level at or below the
ideal ratio instead of fitting exactly, and a frame is a rectangle of cells rather than a rectangle.

This PR replaces that coordinate layer with **free positioning**: `--x`, `--y`, `--w` per node plus
`transform: translate`, and a **continuous** `--stx-scale` on the stage, written through exactly two
named helpers, `setPos(el, x, y, w, h?)` and `setScale(stage, s)`. Pan stays native scroll and the stage
stays DOM — two of `studio-canvas.mjs`'s three load-bearing calls survive untouched; only the third
("zoom and arrangement are attributes") is retired.

On top of the new substrate it lands the **build document**: `system/canvas-ops.mjs`, a pure,
DOM-free applier with the six ops MVP 14's first slice needs (`screen.compose` · `screen.set` ·
`state.add` · `frame.size` · `connect` · `disconnect`), `resolve(base, override)` and
`missingStates(doc, variantKey?)`. Then it proves the whole thing with **one spine**: a frame at a
free position holding a `stack` with a `text`, a `text-field` and a `primary-button`; a second frame
as that frame's error state, stored as an override; an arrow from the button to the error frame;
saved to `discovery/faster-payment/build/` and reloaded byte-identically.

## User Story

As **the owner about to build a real product's screens on this canvas**
I want **arrangement to be free position and zoom to be continuous, with one op vocabulary and one
saved package behind them**
So that **a screen can sit where it belongs rather than in the nearest cell, the window can be fitted
exactly, and the first real flow has a document to be written into instead of a display case to be
arranged in**.

## Problem Statement

Three problems, and they are one problem.

1. **The grid cannot hold a product.** A frame is a rectangle of cells against a 12 × 8 board; a
   state sibling beside its base, an arrow from a button to a screen, and a flow laid out by rank all
   want continuous space. `fitLevel` (`system/studio-canvas.mjs:153`) snaps *down* to a level at or
   below the ideal ratio, so "fit" never actually fits. The owner's verdict on `/factory`
   (2026-08-10) was that it "feels random" and reads as an exhibit rather than a tool.
2. **There is no build document.** `system/board-ops.mjs` holds the *shape* layer (places,
   affordances, connections) and `discovery/ops.mjs` holds the *decision* layer. Nothing records
   screens, their states, their overrides or the flow between them, so the discovery PRD that
   `discovery/faster-payment/` already carries has nowhere to become screens.
3. **Half the change is unshippable.** The grid reaches **435 lines across 15 files** (observed, the
   ticket's own DoD grep, run below). Deleting half of it is a red build with no green path back, and
   a canvas that is partly slots and partly free positions has no announceable unit, no codec rule
   and no gate.

## Solution Statement

Retire the grid and prove the free substrate with MVP 14's spine, in one pass, in the brief's order:

**delete → watch seven groups go red → rewrite them against the new helpers → substrate →
`canvas-ops.mjs` + its group → verbs and announcements → the spine → generators → journeys ×3 →
baselines last → `discovery/README.md`'s `build/` section.**

The delete-first ordering is not tidiness: it is the "check that cannot fail" discipline applied to a
gate rewrite. Every rewritten assertion is **seen failing on the deleted symbol** before it is made to
pass on the new one. This repo's single largest class of process-review finding (59 of 229) is a
check that passed because it never reached the thing it tested, and a seven-group rewrite is exactly
where that happens.

## Out of Scope / Non-Goals

- **Not included: `content-visibility: auto` + `contain-intrinsic-size`.** The ticket makes it
  conditional on S1's branch. **S1's branch says no** — it took branch 1, configuration (a), the bare
  substrate with no mitigation, and measured that `content-visibility` does *not* cull this substrate
  on Chromium 149.0.7827.55 at all: translate positioning (T4) and a scaled ancestor (T2) each defeat
  it independently. Adding it would buy nothing on the primary engine and would add a rule three gates
  would then have to carry. See GOTCHA on Task 3.2 for what S1 recommends instead.
- **Not included: T10, the compressed codec.** The codec moves to `v: 3` and deletes `g`; the
  *encoding* does not change. With `g` gone the URL carries answers and the board only — what v1
  carried — so the size pressure `CompressionStream('deflate-raw')` answers does not exist
  (brief § T10).
- **Not included: `portal/public/canvas.html`, the SPA run list, the compose loop, `ratify`, the
  import path, the icons chain, the remaining primitives.** Those are #306, #312 and the width tickets
  on top of this door. Until #306 the spine is driven through `studio.html`.
- **Not included: `frame.link`'s pinned `{id, seq}` decision shape.** That is #318's (D2). Here
  `frame.decisionRefs` stays a flat list of ids.
- **Not included: the eight remaining ops** (`frame.remove`, `frame.link`, `annotate`,
  `group.define`, `group.place`, `variant.add`, `component.propose`, `proposal.ratify`). Six here;
  the vocabulary's count of fourteen is the architecture's projection, not this ticket's scope.
  **Two tickets must not add ops to `canvas-ops.mjs` concurrently** — the epic's concurrency lock.
- **Not included: a token change.** S2 named `--spacing-none` and **#301 decided against it**
  (`system/specs/stack.md:29`; build-checks group 3 asserts its absence). No `tokens.source.json`
  edit, no `gen-token-css`.
- **Not changing: CLAUDE.md's "portal UI = a hash route in `portal.js`" rule.** That amendment
  belongs to `canvas.html`'s PR (#306).
- **Not changing: pan (native scroll) or the stage being DOM.** Calls 1 and 2 of
  `studio-canvas.mjs`'s header survive verbatim. Only call 3 is retired.
- **Not changing: `/components`' baselines.** Verified: `system/catalog.mjs` renders the component
  count and per-component API tables out of `vocabulary.json`; nothing on that page renders
  `composition.shape`, so the `id`-key change does not move a pixel there.

## Feature Metadata

**Feature Type**: Refactor (a substrate swap) + New Capability (the build document and the spine)
**Estimated Complexity**: **High** — the largest ticket in epic #295, sized above the norm on purpose.
~2,000–3,000 lines including the gate rewrites.
**Primary Systems Affected**: `system/studio-*.mjs` (9 modules) · `system/studio.css` ·
`system/build-share.mjs` · `system/agentic-renderer.mjs` · two new `system/*.mjs` ·
`portal/lib/canvas-store.mjs` · `tooling/build-checks.mjs` (7 rewrites + 2 new groups) ·
`tooling/studio-journey.mjs` · `tooling/vt-verify.mjs` · `tooling/visual-regression/visual.spec.mjs` ·
`studio.html` · `discovery/faster-payment/build/` · `discovery/README.md` · CLAUDE.md · gates.md
**Dependencies**: none new. Shipped pages stay vanilla; Playwright stays resolved out of
`tooling/visual-regression/node_modules`, never a repo dep.

## Related Work

**Implements**: [#302](https://github.com/linardsb/ux-factory/issues/302) — the PR body MUST carry
`Closes #302` as a trailer (a title mentioning `(#302)` closes nothing).
**Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295) ·
`docs/epics/canvas-design-import.architecture.md` (§ Other eng-lead calls — the deletion table and the
baseline cascade; § For slicing) · `docs/epics/canvas-design-import.prd.md`
**The ticket's own brief** (the input to this plan, not the plan): `.claude/plans/canvas-swap-pr-brief.md`

**Back-references** (decisions inherited, not reopened):

- `.claude/plans/canvas-spike-s1-substrate-load-297.md` + `.claude/plans/canvas-spike-s1/README.md` —
  Why: S1's verdict licenses T4 and T5 on configuration (a), bounds T2, and kills `content-visibility`
  on Chromium. Its numbers are this plan's performance floor.
- `.claude/plans/canvas-spike-s2/README.md` — Why: S2 named `--spacing-none`; #301 answered no. That is
  why there is no token work here.
- `.claude/plans/canvas-baseline-cascade.md` — Why: the standing baseline checklist for every PR in
  this epic; its § "How to regenerate without being fooled" is the ten traps this PR's last phase
  walks through.
- `.claude/plans/stack-text-primitives-rendermarkdown-links-301.md` — Why: the spine's `stack` and
  `text` came from it, and `childrenCardinality: "many"` is what lets the spine's stack hold three
  children.
- `.claude/plans/studio-canvas-stage-204.md` · `studio-canvas-manipulation-205.md` ·
  `studio-canvas-affordances-217.md` · `studio-protos-as-frames-219.md` ·
  `studio-layers-minimap-221.md` — Why: the five plans that built the grid this one retires; each
  states an invariant whose non-grid half must survive the rewrite.
- `.claude/plans/studio-share-codec-v2-208.md` — Why: it added the `g` field this PR deletes.

**Forward-references**:

- #306 — `canvas.html`, the run list, `canvas-store`'s live page, and the four arrangement ops.
- #318 — D2, the pinned `{id, seq}` decision shape on `frame.decisionRefs`.
- #423 — S1's driver assertion gaps. **Not a blocker** (its subject is a parked throwaway), but its
  three shapes are the exact shapes this PR's own INP assertions must avoid; carried as GOTCHAs.
---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

**The substrate being replaced**

- `system/studio-canvas.mjs` (516 lines; header **lines 1–32**, the three load-bearing calls) — Why:
  call 3 at **:19–25** is the invariant this PR retires, and it says in its own words why zero inline
  writes was the price of the grid. Calls 1 and 2 survive verbatim. **:27–30** is the #171
  containing-block warning that Task 3.4 re-triggers through a different door.
  Exports to delete: `MAX_COLS` **:38**, `MAX_ROWS` **:39**, `ZOOM_LEVELS` **:43**, `clampSlot`
  **:50**, `MIN_SPAN` **:69**, `clampSpan` **:93**, `footprint` **:110**, `fits` **:130**, `fitLevel`
  **:153**. Exports to keep: `ZOOM_REST` (becomes the keyboard table's rest index), `FRAME_CLASS`
  **:76**, `MOVABLE` **:85**, `getCanvas` **:182**, `initStudioCanvas` **:188**.
  Mount internals that change: `setZoom(index, anchorX, anchorY)`, `fit()`, `reset()`, the
  `WHEEL_STEP = 40` accumulator (**:186**), and `place(node, {col,row,name,component,kind,spanCol,spanRow})`.
- `system/studio.css` (1,281 lines) — Why: the four grid families and the zoom table, by observed line
  range. **:20–30** the `--stx-*` mirror block (`--stx-cols: 12` :21, `--stx-rows: 8` :22,
  `--stx-slot-w` :23, `--stx-slot-h` :24, `--stx-frame-unit` :28, `--stx-gap` :29, `--stx-scale: 1`
  :30) · **:38–42** the five-entry `[data-zoom]` table · **:69–73** `.stx-sizer`'s
  `calc(… * var(--stx-scale))` width/height — **S1 measured this as the relayout source behind T2's
  open edge** · **:75–89** `.stx-stage`'s `grid-template-*` + `transform: scale(var(--stx-scale))` ·
  **:96–116** family 1 `.stx-slot[data-col|data-row]` · **:216–236** family 2 `.stx-guide` ·
  **:283–303** family 3 `.stx-menu` · **:323–368** family 4 `.stx-frame` start longhands + the two
  span tables.
- `system/build-share.mjs` (499 lines) — Why: the `g` field. Header **:41–58** argues the
  positional/all-or-nothing rule and the clamp-vs-reject split that group 12 and group 5 each own one
  half of. `import { MAX_COLS, MAX_ROWS } from "./studio-canvas.mjs"` **:62** · `V_BASE = 1` **:74** ·
  `SHARE_VERSION = 2` **:75** · `SHARE_VERSIONS = Object.freeze([1, 2])` **:76** · the field table
  **:156–169** · `const payload = { v: slots ? SHARE_VERSION : V_BASE, … }` **:281** ·
  `if (slots) payload.g = slots;` **:295** · `KNOWN` key set **:353** · the whole `g` decode branch
  **:427–440** · `arrangement` null rule **:485**.

**The gate being rewritten**

- `tooling/build-checks.mjs` (10,669 lines) — Why: 136 of the 435 grid matches live here, and seven
  groups are rewritten rather than deleted. Read the section headers first
  (`grep -n "^// ---" tooling/build-checks.mjs`): 34 numbered sections, highest **34**, group 31 under
  a different header form (`// --- group 31: the PRD projection (#290)`).
- `tooling/build-checks.mjs:1405–1528` — **group 7, the vetting invariant. Read this whole block
  before writing Task 2.3.** `MODULES` :1449–1468 · `STYLE_WRITE` / `ALLOWED_DIRECT` regexes ·
  `if (calls) ok(file === "build-import.mjs", …)` :1493 · `ok(writes === 1, …)` :1525. The check is
  **file-scoped plus a whole-list count**, and `applyToStage` is in `system/build-import.mjs:150`,
  **not the studio at all**.
- `.claude/references/gates.md` — Why: `:11` states "34 pure groups" and is one of four prose copies
  the drift-check reads; `:108–124` is the pixel gate's own statement of what it cannot see;
  `:154–165` is `vt-verify`'s and `vt-stack-audit`'s.
- `tooling/drift-check.mjs:160–192` — Why: `checkGroupCount()` verbatim. It reads **four** claims and
  also asserts `calls.length - DUPES.length === distinctNames` with `DUPES = ["parenting"]`.

**The patterns the new modules mirror**

- `system/board-ops.mjs` (333 lines) — Why: the closest sibling to `canvas-ops.mjs`. Its `OPS` list,
  `PARAMS` map, pure applier, throw-on-malformed convention and the deterministic-id rule ("an op
  never carries the id of the thing it creates") are the shape to copy, not to re-argue.
- `discovery/ops.mjs` (533 lines) — Why: the second applier in the repo and the more recent one; the
  four-verb grammar plus the five pure reads beside it is the shape `resolve` and `missingStates` sit
  in.
- `tooling/board-op.mjs:1–45` — Why: the precedent for applying **one** op through the real applier
  from a CLI and printing the result. Read it before deciding how the spine's `ops.jsonl` is produced
  (**D-a**, decided by the owner 2026-09-18).
- `agent-layer/gen-replay.mjs` — Why: the drift-check pattern the new `ops.jsonl` ↔ `canvas.json`
  gate copies — apply the committed ops, compare against the committed artifact.

**The consumers that lose their cap imports**

- `system/studio-verbs.mjs` (1,421 lines; 37 grid matches) · `system/studio-select.mjs` (728; 17) ·
  `system/studio.mjs` (853; 11) · `system/studio-minimap.mjs` (533; 7) · `system/studio-layers.mjs`
  (368; 6) · `system/replay-driver.mjs` (1,027; 4) · `system/studio-frames.mjs` (303; 1) ·
  `system/studio-compile.mjs` (4, **comment-and-selector only** — :30, :43, :384 are prose; :413 and
  :514 are `.stx-slot` querySelectorAll) · `studio.html` (164; 5, all prose: the meta description :7
  and the two explanatory blocks :47–51 and :77–79).

**The drivers**

- `tooling/studio-journey.mjs` (6,476 lines; **74** lines on the DoD's seven symbols, **101** on the
  full grid vocabulary) — the largest single rewrite after build-checks, the owner of the INP gate,
  and the home of **Gate B**. Read its header (:1-33) and §A of Phase 8 before touching it.
- `tooling/vt-verify.mjs` (664 lines; 10 on the DoD's seven, **13** on the full vocabulary) — Why:
  `movePlace()` at **:326-330** does `querySelector(".stx-slot") → place(node) → read data-col` and
  asserts the movement happened BEFORE asserting zero `::view-transition-*` pseudos. (The brief
  cites :303-307 for this; that is a comment tail plus `canvasState()`'s head — see Task 8.5.)
- `tooling/visual-regression/visual.spec.mjs` — `PAGES` :17–144 (11 entries) · `PACKS` :145 · the pack
  swap `page.route('**/system/tokens.neutral.css', route => route.fulfill({ path: packPath }))` :167.

**The package and its home**

- `discovery/README.md` (1,069 lines) — Why: it has **no `build/` section** (verified: `grep -i
  "build/"` returns nothing and the header list has no build row). Precondition 4's second branch
  fires and this PR writes it. Model the new section on § "File shapes" (:263) and § "Files" (:65).
- `discovery/faster-payment/` — Why: the spine's home. It holds `run.json` (`provenance: "fictional"`,
  `label: "Real run — fictional scenario"`), `answers.jsonl`, `transcript.jsonl`, `prd.md`, and **no
  `build/`**.
- `handoff/verdant/vocabulary.json` — Why: the spine's four components and the composition grammar.
  23 components; `composition.version: 2`; `stack` → `ds-stack`, `childrenCardinality: "many"`,
  allowed children include `text`, `text-field`, `primary-button`.

### New Files to Create

- `system/canvas-ops.mjs` — the build document's pure, DOM-free applier: `OPS`, `PARAMS`, `applyOp`,
  `applyOps`, `emptyDoc`, `resolve(base, override)`, `missingStates(doc, variantKey?)`, `STATE_KEYS`.
  **No SDK anywhere in its import graph.**
- `system/device-presets.mjs` — G20's exported width table that `frame.size` reads.
- `portal/lib/canvas-store.mjs` — package IO only: `saveBuild(root, doc, opLines)` ·
  `loadBuild(root)`. One concern per module, the `portal/lib/` rule.
- `discovery/faster-payment/build/ops.jsonl` — the spine's truth, one line per op.
- `discovery/faster-payment/build/canvas.json` — the spine's arrangement, JSON Canvas.
- *(No new tooling file. **D-a** settled this: the spine is written by a one-off script whose text
  goes in the report, not by a committed CLI.)*

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- [JSON Canvas 1.0 spec](https://jsoncanvas.org/spec/1.0/) — **read it, and read the divergence note
  below with it.**
  - Sections: *Nodes* (generic keys) and *Edges*.
  - **Observed, fetched 2026-09-18:** the top level is `{nodes?, edges?}`. A node REQUIRES
    `id`·`type`·`x`·`y`·`width`·`height`, and `type` is one of **`text` · `file` · `link` · `group`**.
    An edge REQUIRES `id`·`fromNode`·`toNode`, with optional `fromSide`/`toSide`/`fromEnd`/`toEnd`/
    `color`/`label`. **There is no `relation` key and no `ref` key anywhere in the spec.**
  - **So the architecture's shape is a DIALECT, not conformance** — it pins `type:
    frame|note|decision|exhibit`, makes `height` optional, adds `ref`, and replaces `label` with
    `relation: flows|embodies`. Four divergences. The architecture is this plan's authority and the
    dialect ships as specified (Task 6.3), but the file's `$description` must say
    "**JSON Canvas–shaped**" and name all four, never "JSON Canvas" flat — an Obsidian-class reader
    refuses `type: "frame"`. **Settled as D-b** (owner, 2026-09-18): ship the dialect, and the file's
    own `$description` names all four divergences.
- [CSS Transforms 1 §3 — "any value other than `none` … establishes a containing block for all
  descendants with `position: fixed` or `position: absolute`"](https://www.w3.org/TR/css-transforms-1/#transform-rendering)
  - Why: Task 3.4's SVG arrow overlay is absolutely positioned and every node now carries a
    `transform`. This is #171's regression mechanism arriving through a different property, and
    `gates.md:160` states plainly that the pixel gate cannot catch that class.
- [MDN — `PointerEvent.getCoalescedEvents()`](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)
  - Why: T7's adopted platform feature for drag; S1 observed that Playwright cannot deliver
    pointermoves faster than the frame rate on Chromium and Firefox, so a *driver* can never prove
    coalescing works — only the synthetic probe can. Do not write an assertion that cannot fire.
- [MDN — `scrollend`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event)
  - Why: T7's minimap sync. S1 observed 40/40 on chromium and firefox, **31/40 on webkit** — so a
    driver assertion on `scrollend` must not demand every pan fire one.
- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
  - Why: every new verb (nudge, align, distribute, multi-select move) owes a single-pointer/keyboard
    alternative. `system/studio-verbs.mjs`'s header records which criterion is which; mirror it.
- [WCAG 2.2 SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
  - Why: T16's reading-order announcements go through the canvas's one existing live region
    (`<p class="stx-live" role="status" aria-live="polite">`, created in
    `system/studio-canvas.mjs`'s mount) — never a second one.
### Patterns to Follow

**An op applier — mirror `discovery/ops.mjs`, NOT `board-ops.mjs`, on one point.**

Both are pure appliers with the same skeleton, and the skeleton is the pattern: a frozen `OPS` list,
a `PARAMS` map whose entry per verb is **exact, not minimal** (an unknown key throws), a private
`checkOp(op)` that validates the envelope and returns the params, a `switch` with one case per verb,
a `clone()` so the applier never mutates its argument, and `applyOps` folding with per-index error
context. Copy it.

The one point where they differ decides whether the new group can exist at all:

```js
// discovery/ops.mjs:71-80 — PARAMS is EXPORTED, and the comment says why
// Exported (board-ops keeps its private) so group 29 can assert OPS ↔ PARAMS in both directions.
// Each inner array is frozen too — Object.freeze is shallow, and a pushable PARAMS entry would let
// the "frozen by mutation" case pass for the wrong reason.
export const PARAMS = Object.freeze({
  record_decision: Object.freeze([...]),
  ...
});
```

`system/board-ops.mjs:49` keeps `PARAMS` **private**, and the consequence is measured: build-checks
group 11 has **no per-verb loop at all** — it checks `ops.every((o) => OPS.includes(o.op))` once
(`tooling/build-checks.mjs:2260`) against a fixed four-op fixture. A new board verb is covered only
if someone remembers to widen that fixture by hand. **`system/canvas-ops.mjs` MUST export `PARAMS`,
frozen at both levels**, or its group cannot iterate `OPS` and the ticket's "its build-checks group
iterates `OPS`" is unimplementable.

**The envelope is exact, not minimal.** `discovery/ops.mjs:296-300` closes the *outer* object too:

```js
for (const k of Object.keys(op))
  if (k !== "op" && k !== "params") throw new Error(`unknown key "${k}" on the op envelope — an op is exactly { op, params }`);
```

**An op never carries the id of what it creates.** `board-ops.mjs:67-71`:

```js
// breadboard.mjs:172's rule, verbatim in behaviour: the lowest free <prefix><n>.
function nextId(prefix, taken) {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}
```

`place.add`'s `PARAMS` entry is `["label"]` — there is no id slot to smuggle one through, and the
error message says so: `"… (an op never carries an id for what it creates)"`. Frames get `f1`,
parts `p1`, arrows `a1`, minted from the document's current state.

**A pure read is not a verb.** `discovery/ops.mjs` states this at each of its five reads (`:62-63`,
`:138`, `:195`, `:227`): a read does not take the epic's op-verb lock and may not touch `OPS`,
`PARAMS` or the switch. `resolve(base, override)` and `missingStates(doc, variantKey?)` are reads.
Reads are **total over junk** — they skip a malformed item rather than throwing — which is the
opposite of the applier's posture, and deliberate.

**Hand-validate at the boundary and throw a plain `Error` naming the offending value.** No schema
library. `discovery/ops.mjs:345-349` is the shape for a reference that must resolve:

```js
const resolveAnswer = (ref, field = "answer_ref") => {
  if (!refs.has(ref)) throw new Error(`${name}: ${field} "${ref}" does not resolve — answers.jsonl holds ${[...refs].map(String).join(", ") || "nothing"}`);
  return ref;
};
```

Note what the message does: it names the field, the bad value, **and what the context actually
holds**. `resolve(base, override)`'s dangling-reference case is the same shape with one difference
the architecture pins — a dangling override is **flagged and shown, never dropped** (G2/G3/G33), and
deleting a base part is **refused** while a state still overrides it.

**A build-checks group — mirror group 29 (`tooling/build-checks.mjs:5987-6613`), not group 11.**
Three moves, each with its own reason:

```js
// 1. the roster, both directions, frozen BY MUTATION (:6016-6026)
ok(OPS.length === 6 && Object.keys(PARAMS).length === OPS.length
  && OPS.every((v) => Array.isArray(PARAMS[v]))
  && Object.keys(PARAMS).every((v) => OPS.includes(v)), `OPS (…) and PARAMS (…) are not the same six verbs`);
for (const [label, arr] of [["OPS", OPS], ...OPS.map((v) => [`PARAMS.${v}`, PARAMS[v]])]) {
  const n = arr.length;
  ok(Object.isFrozen(arr) && threw(() => arr.push("smuggled")) !== null && arr.length === n, `${label} is not frozen — a push landed`);
}

// 2. VALID_FOR — one minimal valid op per verb; a verb with no fixture fails BY NAME (:6029-6038)
for (const verb of OPS) ok(VALID_FOR[verb], `no VALID_FOR fixture for "${verb}" — every verb needs one minimal valid op here, or the group iterates OPS in name only`);

// 3. the throws, each DRIVEN by a broken op and matched against what the message must NAME (:6075-6089)
ok(names(() => applyOp(s1, compose({ why: undefined }), ctx), "screen.compose", "why") === null, …);
```

`threw()` and `names()` are existing helpers in the file — read their definitions before using them.

**The drift-check pattern (`ops.jsonl` ↔ `canvas.json`) — mirror group 16
(`tooling/build-checks.mjs:3504-3700`) plus group 11's case 2.** The load-bearing half is the
mutation, not the compare:

```js
// tooling/build-checks.mjs:3561
ok(deep(reproduced) === deep(committedBoard),
  "playing every op beat does NOT rebuild replay/<slug>.board.json — …");

// :3564-3574 — the mutation that decides whether the line above is real
const corrupted = JSON.parse(artifactText);
const firstAdd = corrupted.ops.find((o) => o.op === "place.add");
firstAdd.params.label = `${firstAdd.params.label} (corrupted)`;
ok(deep(playAll(mutatedBuilt.beats)) !== deep(committedBoard),
  "a corrupted op label still reproduced the committed board — the comparison in case 2 is vacuous");
```

**A generator's `--check` mode.** Every generator exports `genX({ check = false } = {})`, computes
the artifact in memory either way, and on `check` reads the existing file (**empty string on ENOENT,
so a missing artifact counts as drift**), string-compares, and pushes the path onto a `drifted`
array without writing. The standalone guard is
`if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)` — **never**
`file://${argv[1]}`, because this repo's path contains a space, which `import.meta.url`
percent-encodes.

**Module placement is a measured rule, not taste.** `discovery/ops.mjs:10-12` states it from one
side — it lives outside `system/` *because* `agent-layer/gen-loc-summary.mjs:23` counts
`system/*.mjs` as the design system and `approach.html` renders the number, and an agent's op grammar
is not a view-time module. `board-ops.mjs:10-14` states it from the other — it lives *in* `system/`
because the replay driver consumes it at **view time**. `canvas-ops.mjs` takes board-ops' side (the
architecture pins it under `system/`, and a shipped page loads it), and it therefore **does** pay the
loc + approach ×2 cost. That is expected, not a mistake to design around.

**The portal's route shape** (`portal/server.mjs`, every branch): `if (p === '/api/<path>' &&
req.method === 'POST') { return json(res, 200, delegate(await readBody(req))); }` — the server holds
zero logic. `portal/lib/canvas-store.mjs` gets no route in this PR (that is #306); it is imported by
build-checks and by whatever produces the spine package.

**File IO idioms.** `portal/lib/trace-recorder.mjs:65-82` is the append-only ledger:
`mkdirSync(dirname, {recursive:true})` → a truncating `writeFileSync(path, '')` → then every record
is `appendFileSync(path, JSON.stringify(obj) + '\n')`. `ops.jsonl` is that shape. `canvas.json` is a
whole-file `JSON.stringify(x, null, 2) + "\n"` rewrite, the generator idiom.

**Announcements go to the canvas's one live region.** `system/studio-canvas.mjs`'s mount creates
`<p class="stx-live" role="status" aria-live="polite">` and exposes `say(message)` on the handle
"so #205's mover announces through the canvas's ONE live region rather than declaring a second one
beside it". Every new verb announces through `say`.

**Errors:** plain `Error`, message names the offending path or value; one catch-all at the server
boundary. No taxonomy, no wrapping. (CLAUDE.md § Ground rules.)

**Types:** plain JavaScript. No TypeScript, no `zod` outside the SDK's tool-schema adapter. The
applier is a hand-written boundary validator and must not import `zod`.
---

## IMPLEMENTATION PLAN

The brief's § "Order of operations" is the phase list, verbatim, because it is already the dependency
order and the owner signed it. Phases run **top to bottom**; every one of them depends on the one
above, and there is **no parallelism inside this PR** — that is what "one-way door" means. Each phase
ends on a named green checkpoint and **one commit**, so the ground inside the door is recoverable.

### Phase 0: branch, and record the "before"

You are probably on `feature/stack-text-primitives-301` (9 ahead / 1 behind `origin/main`, and its
code tree is byte-identical to main — verified). Branch fresh:
`git fetch origin && git checkout -b feature/canvas-swap-grid-retired-302 origin/main`.

Record the before-state so the DoD grep has something to be measured against, and so a later "was
this always failing?" question has an answer.

### Phase 1: delete, and watch it go red

**Tasks:** delete the nine `studio-canvas.mjs` exports, the four `studio.css` grid families and the
zoom table, the six `studio-verbs.mjs` grid symbols, every cap import in the eight consumers, and
`build-share.mjs`'s `g` field. Then run `node tooling/build-checks.mjs` and **write the failure list
into the report**. This is the phase's deliverable: the seven groups, seen red, by name.

Do **not** fix anything in this phase. A red tree is the expected state at its end.

### Phase 2: the two helpers, then rewrite the groups against them

**Depends on:** Phase 1 (each assertion must have been seen failing on the deleted symbol).

**Read this before starting — the brief's compressed order has a gap, and this plan closes it one
way.** The brief says step 2 rewrites the groups "against the new helpers" and step 3 builds "the
substrate (helpers, zoom, positioning, arrows, rank layout)". Taken literally that is circular:
Task 2.1's new tripwire is *"positioned only through `setPos`"* and Task 2.3 slices `setPos`'s and
`setScale`'s **function bodies** out of the source — neither exists until Phase 3. **Resolution:
Phase 2 opens with Task 2.0, which writes the two helpers themselves — final signatures, real
bodies, nothing else.** They are ~30 lines between them. Phase 3 then builds zoom, free positioning,
the arrow overlay and the rank layout *on* them. Every group rewrite below therefore has something
real to reference, and the brief's "the substrate" step keeps everything that is actually
substantial.

**Gate B is knowingly red from here until Task 8.2, and that is authorized.** The moment Task 2.0
lands, `tooling/studio-journey.mjs`'s nine running-page `hasAttribute("style")` assertions go red.
Its new predicate is *designed* here, beside Task 2.3 — the two are one decision — but it can only
be *run* in Phase 8. Task 2.3 carries the design; do not discover the nine red rows six phases
later.

Groups 4, 5, 12, 13, 14, 22, 24, 26, 27 — nine touched, of which the ticket calls seven "rewritten"
and two (4 and 5) "lose cases". The survey found they are **not all coupled the same way**, and the
distinction decides how much of each survives:

| Group | Coupling | What survives untouched |
|---|---|---|
| 4 `codec` | `:932-958` cap-coupled; `:870-931` independent | the whole v1 round-trip + the five frozen v1 fixtures |
| 5 `tamper` | `:1038-1094` cap-coupled; rest independent | the 32-case battery, proto-pollution, transport, the bomb cap |
| 7 `vetting` | **independent today** — a source-text scan | everything except the write-site predicate (Task 2.3) |
| 12 `canvas` | cap-coupled in full | nothing; it is replaced |
| 13 `verbs` | `:2865-3127` cap-coupled; `:2727-2863` (history, `adopt`) representation-coupled | the whole history stack if snapshots keep storing per-id positions |
| 14 `studio` | `:3164-3258` cap-coupled; `:3260-3313` independent | all of `buildSummary` |
| 22 `select` | 22.1–22.3, 22.5 cap-coupled; 22.4 independent | `menuItems` / `MENU_ITEMS` entirely |
| 24 `frames` | 24.3 only; 24.1/24.2/24.4 independent | the frozen-`FRAMES` proof, the real-file/anchor/caption checks, `packHref` |
| 26 `layers` | **representation**-coupled, never cap-coupled | everything except the four exact position sentences |
| 27 `minimap` | **representation**-coupled, never cap-coupled | the three-condition `mapView` discipline, re-expressed |

**Keep every non-grid assertion.** The architecture says "never deleted: their non-grid assertions
stay", and the table above is how you tell which those are.

### Phase 3: the substrate

**Depends on:** Phase 2 (a green gate to move against).

`setPos` / `setScale`, continuous zoom, free positioning of all four node classes, the SVG arrow
overlay, and the rank layout. The existing, shipped, working model for cursor-anchored continuous
zoom is `system/system-graph.mjs:247-260` — read it before writing `setScale`.

### Phase 4: `canvas-ops.mjs`, `device-presets.mjs`, and their group

**Depends on:** Phase 3 only for sequencing — the applier is pure and DOM-free and could be written
first. It is here because the brief puts it here and the spine needs both.

### Phase 5: the verbs and their announcements

**Depends on:** Phase 3 (the helpers) and Phase 4 (the ops the verbs file).

Nudge by a spacing token, snap-to-neighbour guides, multi-select move, align/distribute, each with a
keyboard path and a reading-order announcement.

### Phase 6: the spine, and its package

**Depends on:** Phases 3–5.

One frame, one `stack` with three children, one state override, one arrow, one save, one reload.

### Phase 7: the generators

**Depends on:** Phase 6 (nothing else moves a generated output).

`gen-loc-summary` · `gen-param-count` · `gen-vocabulary` + `gen-handoff` (the `id` node key moves the
composition shape string — a cascade the ticket does not name). **Not** `gen-token-css` (no token
change) and **not** `gen-system-graph` (`studio.css` is not one of its inputs — verified).

### Phase 8: the journeys, on three engines

**Depends on:** Phase 7.

`studio-journey all` rewritten (including **Gate B**, the running-page `inlineStyled` assertions the
ticket does not name) · `vt-verify` · `instance-journey` on a built dir · `catalog-journey` · the INP
gate.

### Phase 9: baselines, last, from a clean detached worktree

**Depends on:** Phase 8 (nothing at rest may still move).

15 PNGs written: 11 new verdant, 4 regenerated (factory ×2, approach ×2). 33 baseline files after.

### Phase 10: the prose — `discovery/README.md`, CLAUDE.md, gates.md

**Depends on:** nothing but the final shape. Last because the numbers it states are settled by
Phases 7–9.
**Independent of:** Phase 9 — the README/CLAUDE.md/gates.md edits do not touch a pixel and can be
written while the baseline run is going, as long as the group count they state is the final one.
---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently
testable. **Commit at the end of each phase**, message = what + doc reference, with the
`Co-Authored-By` trailer.

`REDDENS` on a check-adding task is not optional here: the brief's own discipline is "every
rewritten assertion is seen failing on the deleted symbol before it passes on the new one", and this
repo's largest class of process finding (59 of 229) is a check that passed because it never reached
the thing it tested.

---

### Phase 0 — branch and record the before

#### 0.1 BRANCH from a clean `origin/main`

- **IMPLEMENT**: `git fetch origin && git checkout -b feature/canvas-swap-grid-retired-302 origin/main`
- **GOTCHA**: the current branch `feature/stack-text-primitives-301` is 9 ahead / 1 behind. Its code
  tree is byte-identical to `origin/main` (`git diff --stat origin/main..HEAD -- . ':!.claude'` is
  empty, observed) — only `.claude/` docs differ, so nothing is lost by branching fresh. #430's
  squash-merge commit `287445e` is what you want as the base.
- **GOTCHA**: parallel sessions share this working directory. Verify the branch immediately before
  every commit and stage by explicit path.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD && git log -1 --oneline && git status --short`
  (expected: the new branch, `287445e`, and only the pre-existing untracked `__*.txt` / `__*.md`
  files).
- **SATISFIES**: the PR's own hygiene; no AC.
- **REGENERATES**: none.

#### 0.2 RECORD the before-state, all five gates green

- **IMPLEMENT**: run and paste each output into the report's "before" section.
- **VALIDATE** (all five observed green on this tree, 2026-09-18):
  ```
  node tooling/build-checks.mjs                       # → build ✓  all 34 groups pass   (5.3 s)
  node tooling/drift-check.mjs                        # → drift-check ✓ … group-count
  node agent-layer/gen-loc-summary.mjs --check        # → loc summary ✓  3 groups — no drift
  node agent-layer/gen-param-count.mjs --check        # → param count ✓  120 controls — no drift
  git grep -n "data-col\|data-row\|MAX_COLS\|MAX_ROWS\|clampSlot\|stepSlot\|ZOOM_LEVELS" -- system/ tooling/ '*.html' | wc -l
                                                      # → 435   (across 15 files)
  ```
- **GOTCHA**: 435 across **15** files, not the ticket's 12. The three the ticket's list omits are
  `system/studio-compile.mjs` (4 matches, all comments and `.stx-slot` selectors — :30, :43, :384 are
  prose; :413 and :514 are `querySelectorAll(".stx-slot")`), `system/studio-frames.mjs` (1) and
  `system/studio-select.mjs` (17, which the ticket does list under "every cap import"). The DoD grep
  matches **comments**, so a stale comment keeps the DoD red.
- **GOTCHA — this PR adds nine tracked files under `.claude/plans/canvas-swap-302-reference/`, and
  they cascade to nothing.** Asserted, not assumed: `agent-layer/gen-loc-summary.mjs:22-26`'s three
  group regexes are `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$` and
  `^agent-layer/[^/]+\.mjs$`. A `.txt` under `.claude/plans/` matches none, so `loc-summary` does
  not move and the approach baselines do not churn for them — the same reasoning that clears
  `portal/lib/canvas-store.mjs` in Task 6.1. They are all `.txt` and not `.mjs` because
  `drift-check`'s syntax leg runs `node --check` over **every tracked `.mjs`, `.claude/plans/`
  included**.
- **SATISFIES**: DoD row 1's baseline.
- **REGENERATES**: none — and see the GOTCHA above for why the nine reference files do not change that.

---

### Phase 1 — delete, and watch it go red

#### 1.1 REMOVE the nine grid exports from `system/studio-canvas.mjs`

- **IMPLEMENT**: delete `MAX_COLS` (:38), `MAX_ROWS` (:39), `ZOOM_LEVELS` (:43), `clampSlot`
  (:50-57), `MIN_SPAN` (:69), `clampSpan` (:93-101), `footprint` (:110-118), `fits` (:130-144),
  `fitLevel` (:153-160). **Keep** `ZOOM_REST`, `FRAME_CLASS` (:76), `MOVABLE` (:85), `getCanvas`
  (:182), `initStudioCanvas` (:188).
- **PATTERN**: the file's header is its specification. Rewrite **call 3** (:19-25) — it currently
  reads "ZOOM AND ARRANGEMENT ARE ATTRIBUTES … This module therefore writes ZERO inline styles,
  which is what lets it join build-checks group 7 with no exception argued". Replace it with the new
  call: *position and scale are custom properties, written through two named helpers, and group 7 is
  re-pinned to those two functions plus `applyToStage`*. **Calls 1 and 2 (the DOM stage, native
  scroll) survive verbatim — say so in the new header, so a later reader knows they were kept on
  purpose rather than overlooked.**
- **GOTCHA**: `ZOOM_REST` is the index `2` into the old five-entry table. Under continuous scale it
  becomes the rest **scale** `1`, not an index. Decide which and say so in one comment; leaving a
  name that means an index while it holds a scale is how the next reader gets it wrong.
- **VALIDATE**: `node -e 'import("./system/studio-canvas.mjs").then(m => console.log(Object.keys(m).sort().join(" ")))'`
  → expect exactly `FRAME_CLASS MOVABLE ZOOM_REST getCanvas initStudioCanvas` plus whatever Phase 3
  adds.
- **SATISFIES**: DoD #1.
- **REGENERATES**: none yet (loc-summary moves in Phase 7, once the file count is final).

#### 1.2 REMOVE the four grid families and the zoom table from `system/studio.css`

- **IMPLEMENT**: delete `:38-42` (the five `[data-zoom]` rules), `:96-116` (`.stx-slot`),
  `:216-236` (`.stx-guide`), `:283-303` (`.stx-menu`), `:323-368` (`.stx-frame` start longhands +
  both span tables). From the `:20-30` mirror block delete `--stx-cols` (:21) and `--stx-rows` (:22);
  **keep** `--stx-scale` (:30), which stops being a table output and becomes the thing `setScale`
  writes.
- **GOTCHA**: `.stx-sizer` (:69-73) and `.stx-stage` (:75-89) are **not** deleted — they are
  rewritten in Task 3.2. `.stx-stage`'s `grid-template-columns`/`grid-template-rows` go; its
  `transform: scale(var(--stx-scale))` stays.
- **GOTCHA — the frame's HEIGHT needs a rule, and it is not width's twin.** `:361-368` binds
  `data-span-row` to `--stx-frame-rows`, which the frame's height calc reads — height is authored
  today, not derived from width (**D-c**). Its replacement is one rule reading `var(--h)`, on the
  frame class only: a board wrapper has no authored height and must not get one
  (`framesPass:5207`). Deleting the span tables without adding this leaves every frame at its
  content height.
- **GOTCHA**: `.stx-scroll.is-panning .stx-slot { pointer-events: none; }` (:121) is a **behavioural**
  rule that happens to name `.stx-slot`. Keep it — widen it to the node classes rather than deleting
  it with the family.
- **VALIDATE**: `grep -c "data-col\|data-row\|data-span\|data-zoom" system/studio.css` → `0`.
- **SATISFIES**: DoD #1.
- **REGENERATES**: none. (`gen-system-graph` reads the DTCG contract, `components.css` blocks and the
  three packs — `studio.css` is not an input. Verified.)

#### 1.3 REMOVE the six grid symbols from `system/studio-verbs.mjs` and its cap import

- **IMPLEMENT**: delete `stepSlot` (:127-143), `hitSlot` (:157-178), `groupOccupancy` (:196-204),
  `groupDelta` (:219-254), `groupStep` (:258-261), and cell-based `guidesFor` (:270-285). Strip the
  cap import at **:66**:
  ```js
  import { FRAME_CLASS, MAX_COLS, MAX_ROWS, MIN_SPAN, MOVABLE, ZOOM_LEVELS, clampSlot, clampSpan, fits, footprint } from "./studio-canvas.mjs";
  ```
  down to `import { FRAME_CLASS, MOVABLE, setPos } from "./studio-canvas.mjs";` (plus whatever
  Phase 3/5 needs).
- **GOTCHA**: **`groupOccupancy` has zero production callers.** The mount uses a separately written
  DOM-reading twin, `occupancyExcept` (:453-461), and `groupOccupancy` exists only so build-checks
  group 13 can drive the same rule purely (:447's own comment says so). Deleting it deletes a test
  surface, not behaviour — but group 13's cases for it must go in the same edit or the group cannot
  import.
- **GOTCHA**: `snapshot()` (:418-426), `restore()` (:530-557), `applySlot()` (:431-434) and
  `applySpan()` (:439-442) are the ~160 lines that encode "the arrangement unit is a grid coordinate
  pair". They are **not** in the deletion list and must be **rewritten** (Task 3.3), not removed —
  `createHistory` (:295-347) is generic and needs no change at all.
- **GOTCHA**: `guidesFor` is deleted as a *cell* computation and re-added in Task 5.2 as
  snap-to-neighbour over free positions. Both halves of its rule survive: a guide must be over a
  value held by **both** a carried member and a non-carried peer, or it is a false claim of
  alignment (the mount's :472-477 records why).
- **VALIDATE**: `node --check system/studio-verbs.mjs && grep -c "MAX_COLS\|clampSlot\|stepSlot" system/studio-verbs.mjs` → `0`.
- **SATISFIES**: DoD #1.
- **REGENERATES**: none yet.

#### 1.4 STRIP every remaining cap import and coordinate computation

- **IMPLEMENT**, file by file, with the observed import lines:
  | File | Line | Today | After |
  |---|---|---|---|
  | `system/studio-select.mjs` | :74 | `{ MAX_COLS, MAX_ROWS, ZOOM_LEVELS, clampSlot }` | `{}` — drop the import |
  | `system/studio-select.mjs` | :79 | `{ DIRS, SPOKEN_MAX, hitSlot }` | `{ DIRS, SPOKEN_MAX }` |
  | `system/studio-minimap.mjs` | :71 | `{ FRAME_CLASS, MOVABLE, ZOOM_LEVELS }` | `{ FRAME_CLASS, MOVABLE }` |
  | `system/studio.mjs` | :66 | `{ initStudioCanvas, MAX_COLS, clampSlot }` | `{ initStudioCanvas }` |
  | `system/replay-driver.mjs` | :65 | `{ MAX_COLS }` | drop the import |
  | `system/studio-layers.mjs` | :43 | `{ FRAME_CLASS, MOVABLE }` | unchanged — **it imports no cap** |
  | `system/studio-frames.mjs` | :82 | `{ FRAME_CLASS }` | unchanged — **it imports no cap** |
  | `system/studio-compile.mjs` | — | **imports no cap at all** | unchanged code; comments only |
- **GOTCHA**: `studio-layers.mjs` and `studio-frames.mjs` are on the ticket's list but import **no
  cap symbol**. Their coupling is different: layers renders the position **sentence**
  (`layerEntries` at :80-83 builds `"column ${col}, row ${row}"` and
  `"column ${col}, row ${row}, ${cols} by ${rows}"`), and frames hard-codes grid literals in `FRAMES`
  (:113-136: verdant `col:1, row:3, spanCol:2, spanRow:2`; fieldwork `col:3, row:3, spanCol:3,
  spanRow:2`). Both are rewrites, not import strips.
- **GOTCHA**: `system/studio-minimap.mjs`'s entire pure layer (`mapView`, `jumpFrom`, `trackOffsets`,
  `cellRect`, `visibleRange`, :88-186) **parses CSS Grid track lists** from
  `gridTemplateColumns`/`gridTemplateRows`. With no grid there are no tracks. This is a wholesale
  replacement of ~100 lines, the largest single rewrite outside the two drivers, and the ticket
  compresses it to "the minimap reads positions".
- **GOTCHA**: `system/replay-driver.mjs:516-518` **independently reimplements `arrangeBoard`'s rule**
  (`const col = board.places.indexOf(place) + 1; if (col > MAX_COLS) continue;`), and its :494-498
  comment acknowledges the duplication. **Changing `arrangeBoard` alone does not touch this.** Two
  copies, one rank rule (Task 3.5).
- **VALIDATE**: `git grep -n "MAX_COLS\|MAX_ROWS\|clampSlot\|clampSpan\|footprint\|fitLevel\|MIN_SPAN\|ZOOM_LEVELS" -- system/` → nothing.
- **SATISFIES**: DoD #1.
- **REGENERATES**: none yet.

#### 1.5 DELETE the `g` field from `system/build-share.mjs` and move to `v: 3`

- **IMPLEMENT**: drop the `MAX_COLS, MAX_ROWS` import (:62); `V_BASE = 1` stays (:74);
  `SHARE_VERSION = 3` (:75); `SHARE_VERSIONS = Object.freeze([1, 3])` (:76); remove `"g"` from
  `KNOWN` (:353); delete the encode branch (`v: slots ? …` at :281 and `if (slots) payload.g = slots;`
  at :295) and the whole decode branch (:427-440); delete the `g` row from the field table
  (:156-169). Add the refusal: **a payload carrying `g` is refused as "made with an older version"**
  (G12).
- **GOTCHA**: `SHARE_VERSIONS` is what the builder **reads**. Dropping `2` from it means a real v2
  link stops decoding — which is the point, but it also means the codec now has to refuse `g`
  *explicitly and by name*, not merely by "v2 is unknown". Write the `g`-carrying case as its own
  refusal with its own message, or a v3 payload that smuggles `g` is refused by the `KNOWN` set with
  a generic "unknown key" rather than the honest sentence.
- **GOTCHA**: **the encoding does not change.** T10 (`CompressionStream('deflate-raw')`) is deferred
  on purpose (brief § T10): with `g` gone the URL carries what v1 carried, so the size pressure T10
  answers does not exist. Do not touch `encodeBuild`/`decodeBuild`'s transport.
- **GOTCHA**: the header's :41-58 block argues the positional/all-or-nothing rule and the
  clamp-vs-reject split ("group 12 keeps asserting the coercion, group 5 keeps asserting the
  rejection. Neither is the other one's bug"). That whole argument is now history — **delete it**
  rather than leaving a header describing a field the file no longer has.
- **GOTCHA**: `tooling/share-v1-links.json` holds five frozen **v1** payload fixtures, one captured
  from a real browser (group 4, :895-930). **v1 must keep round-tripping byte-identically.** That is
  the half of group 4 that survives untouched.
- **VALIDATE**: `node -e 'import("./system/build-share.mjs").then(m=>console.log(m.SHARE_VERSION, JSON.stringify(m.SHARE_VERSIONS)))'` → `3 [1,3]`.
- **REDDENS**: hand a decoder a `{v:3, …, g:[[1,1]]}` payload — it must fail naming "an older
  version"; and hand it `{v:2, …}` — it must fail naming v2 as unread. If either passes, the refusal
  is decorative.
- **SATISFIES**: the codec half of Scope; AC #6.
- **REGENERATES**: none.

#### 1.5b RETIRE the arrangement-in-the-link **capability**, in all three places it is claimed

- **IMPLEMENT**: deleting `g` does not just remove a field — it removes a shipped feature that three
  other places still advertise. All three observed:
  | Where | What it does today | After |
  |---|---|---|
  | `system/studio.mjs:451-454` | `const sent = restored?.arrangement …; if (sent && sent.length === arranged.length) arranged = arranged.map((e,i) => ({...e, ...clampSlot({col: sent[i].col, row: sent[i].row})}))` | **delete the branch.** `arrangeBoard`'s answer — now the rank layout's — is the only layout. |
  | `tooling/studio-journey.mjs:2749-2754` (`keepPass`) | asserts the `?b=` link decodes back to the board **with its arrangement**, comparing `decoded.arrangement` against the moved slots | **delete the assertion, do not translate it.** There is nothing left to compare. |
  | `system/param-manifest.json:95` | label reads `"keep rail: copy the link that rebuilds this, **arrangement included**"` | **correct the label.** The control stays (one entry, no count change); its claim does not. |
- **GOTCHA — the second row is the one that will be mistranslated.** `keepPass`'s own comment
  (:2713-2721) explains that PR #241 added a deliberate **off-row-1 move before the copy**, because
  "the replay places every block at `{col: index+1, row: 1}` … which is byte-for-byte what
  `arrangeBoard` produces with no `g` in the link at all — so the receiver reached the identical
  layout whether or not `studio.mjs` ever applied the sender's field." That move exists **only** to
  make the `g` assertion non-vacuous. With `g` gone, both the move and the assertion go. Keeping the
  move and rewriting the assertion to compare positions would be asserting that the rank layout
  equals itself.
- **GOTCHA — the manifest label is an honesty item, not a gate item.** No gate reads that string. A
  button that still promises "arrangement included" while the codec no longer carries it is a false
  claim on a shipped page, which the honesty contract forbids on its own. Check the on-page copy
  beside the button too (`system/studio-keep.mjs`), not just the manifest.
- **VALIDATE**: `git grep -n "arrangement" -- system/ tooling/ | grep -iv "arrangeBoard"` → no
  surviving claim that a link carries one.
- **REDDENS**: n/a (deletions). The positive control is `keepPass`'s remaining rows staying green —
  the link must still decode back to the board and the answers.
- **SATISFIES**: AC #6; the honesty contract.
- **REGENERATES**: `param-count` is **unchanged** (the entry is edited, not removed) — but the
  manifest file moves, so re-run `node agent-layer/gen-param-count.mjs --check` in Phase 7 to
  confirm the total did not shift.

#### 1.6 REWRITE the prose in `studio.html` and `factory.html`

- **IMPLEMENT**: `studio.html`'s meta description (:7), the lede (:47-51: "zoom is a `data-zoom`
  attribute against a scale table declared in CSS; arrangement is `data-col` / `data-row`, and moving
  something rewrites exactly those two attributes. Nothing here writes an inline style."), the
  "Moving things" block (:60-66, "An occupied cell is skipped rather than landed on"), and the tail
  (:77-79, "`place(node, {col, row})`"). Every one of those sentences becomes false in this PR.
- **GOTCHA**: `studio.html` is **not in the VR page set** — its own comment (:20) says so — so no
  baseline. `factory.html` **is**, and its prose also describes the arrangement; changing it churns
  the factory baselines, which Phase 9 regenerates anyway.
- **GOTCHA**: "Nothing here writes an inline style" becomes false the moment `setPos` lands. Leaving
  it is a false claim on a shipped page, which the honesty contract forbids independently of any
  gate.
- **VALIDATE**: `grep -c "data-col\|data-row\|data-zoom" studio.html factory.html` → `0` for both.
- **SATISFIES**: DoD #1.
- **REGENERATES**: factory VR ×3 (Phase 9).

#### 1.7 RUN the gate and record the red

- **IMPLEMENT**: `node tooling/build-checks.mjs 2>&1 | tee /tmp/red.txt`. **Write every failing group
  and its message into the report.** Do not fix anything yet.
- **GOTCHA**: some groups will fail at **import** rather than at an assertion, because
  `tooling/build-checks.mjs` imports the deleted symbols at **module scope**, observed:
  **:218** `import { clampSlot, fitLevel, MAX_COLS, MAX_ROWS, ZOOM_LEVELS, ZOOM_REST } from "../system/studio-canvas.mjs";`
  and **:219** `import { createHistory, DIRS, groupDelta, groupOccupancy, groupStep, guidesFor, hitSlot, HISTORY_MAX, occupancyKey, SPOKEN_MAX, stepSlot } from "../system/studio-verbs.mjs";`
  (group 24 additionally does a *dynamic* import at **:5272-5273**, aliasing `MAX_COLS`/`MAX_ROWS`/
  `clampSpan`/`footprint` to `FMAX_COLS`/`FMAX_ROWS`/`fClampSpan`/`fFootprint`). A static import
  error kills the whole file, so you will see **one** crash rather than seven red groups. If so, comment the dead imports out one group at a time, re-run, and
  record each group's own red — the brief's discipline is per-assertion, and a single import crash
  proves nothing about any individual assertion.
- **VALIDATE**: exit code `1`, and the report names ≥7 groups.
- **SATISFIES**: the brief's order-of-operations discipline; the evidence AC #2 rests on.
- **REGENERATES**: none.
---

### Phase 2 — rewrite the seven groups

Every task here is a check-adding task, so every one carries a REDDENS mutation. **Run the mutation,
see the red, revert it, see the green.** A rewritten assertion you only ever saw pass is not a
rewritten assertion.

#### 2.0 WRITE the two helpers — nothing else

- **IMPLEMENT**: `setPos(el, x, y, w, h?)` and `setScale(stage, s)` in `system/studio-canvas.mjs`, final
  signatures, real bodies, ~30 lines between them. **Not** zoom, positioning of every node class, the
  arrow overlay or the rank layout — those are Phase 3. This task exists so Tasks 2.1 and 2.3 have
  something real to slice and reference.
- **DECIDED, by measurement, not preference: the signature is `setPos(el, x, y, w, h)`.** The
  ticket says `setPos(el, x, y, w)`. That is one term short, and the code says so in three places:
  - `system/studio-verbs.mjs`'s `ui.resize` consumer (:684-694) calls
    `applySpan(node, clampSpan(slotOf(node), action?.params))`, which writes **both**
    `data-span-col` **and** `data-span-row` (:439-442). A frame resizes on two axes today.
  - `system/studio.css:361-368` binds `data-span-row` to `--stx-frame-rows`, which the frame's
    **height** calc reads. Height is not derived from width.
  - `tooling/studio-journey.mjs:5110` computes `rows: String(TARGET_FRAME.spanRow + 1)` and
    :5172-5174 asserts the announcement says `` `${WANT.cols} columns by ${WANT.rows} rows.` ``
  **Four custom properties, one writer:** `--x`, `--y`, `--w`, `--h`. Not a separate `setSize` —
  that would make the group-7 slice list four named writers for no gain, and split a single gesture
  across two write sites. `h` is optional in the signature (a board wrapper has no authored height
  and must not be given one — `framesPass` at :5207 asserts a `.stx-slot` carries **no** span
  attributes at all, and the free-position twin of that assertion is "no `--h`").
  **Consequences, already carried:** Task 2.3's pinned count becomes `{setPos: 4, setScale: 3}`
  (re-derive it), and the resize announcement's "N columns by M rows" becomes the px-or-preset
  sentence Task 5.3 owns.
- **GOTCHA**: from this point `tooling/studio-journey.mjs`'s nine Gate B rows are **knowingly red**
  until Task 8.2. See the Phase 2 header.
- **VALIDATE**: `node --check system/studio-canvas.mjs` and
  `node -e 'import("./system/studio-canvas.mjs").then(m=>console.log(typeof m.setPos, typeof m.setScale))'`
  → `function function`.
- **SATISFIES**: unblocks AC #2 and AC #3.
- **REGENERATES**: none.

#### 2.1 REWRITE group 12 (`canvas`, `tooling/build-checks.mjs:2512-2708`)

- **IMPLEMENT**: this group dies in full and is replaced. What goes: the `--stx-cols`/`--stx-rows`
  mirror (:2530-2533), all four families' exhaustive bidirectional `data-col`/`data-row` mirror
  (:2542-2562), both span tables (:2568-2587), the grid-shorthand trap (:2588-2599),
  `--stx-frame-unit` (:2600-2612), the fifth-family reverse sweep (:2613-2622), the zoom-table mirror
  (:2624-2638), `clampSlot`'s eight hostile slots (:2642-2656), `fitLevel`'s four answers
  (:2658-2673). What replaces it: `setPos`'s and `setScale`'s pure halves, `fit()` proven to fit
  **exactly** (the old `fitLevel` snapped *down* — the new one must not), and the **new tripwire**.
- **PATTERN**: the old tripwire is one line, `tooling/build-checks.mjs:2558`:
  ```js
  const GRID_FAMILIES = [".stx-slot", ".stx-guide", ".stx-menu", ".stx-frame"];
  ```
  with a self-checking reverse sweep at :2620-2621 whose message reads "studio.css places
  `${family}` by data-col/data-row but group 12 does not mirror-check it — add it to GRID_FAMILIES
  or the mirror drifts silently". **Keep that self-checking shape and re-point it**: the new
  tripwire is "positioned and sized only through `setPos`" — a sweep over `system/studio.css`
  proving no rule positions or sizes a node any other way, and a sweep over the studio modules
  proving no module sets `--x`, `--y`, `--w` **or `--h`** outside `setPos`. **All four properties,
  not three** (D-c): a height written elsewhere passes a three-property sweep.
- **GOTCHA**: the #208 tripwire at :2684-2700 asserts `build-share.mjs` **imports** `MAX_COLS`/
  `MAX_ROWS` rather than re-typing them, and :2701-2705 asserts the divergence between `clampSlot`'s
  coercion and the codec's rejection. Both reference symbols that no longer exist. **Delete them —
  do not try to preserve them**; the coupling they guarded is gone with the field.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build canvas"` → a `✓` line.
- **REDDENS**: in `system/studio.css`, add a rule that positions a node without `--x`/`--y`
  (e.g. `.stx-slot { position: absolute; left: 10px; }`). Group 12 must fail naming that rule and
  the "positioned only through `setPos`" sentence. Second mutation: in `system/studio-verbs.mjs`,
  add `node.style.setProperty("--x", "5px")` outside `setPos` — group 12 must fail naming the
  module. **Third: `node.style.setProperty("--h", "40px")` outside `setPos`** — it must fail too, or
  the sweep is pinned to three properties while four are live. If only the first reddens, the module
  half of the tripwire is decorative.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

#### 2.2 REWRITE group 13 (`verbs`, `:2710-3130`) — and keep the history stack whole

- **IMPLEMENT**: delete the `stepSlot` (:2866-2922), `hitSlot` (:2924-2982), `groupOccupancy`/
  `groupStep`/`groupDelta` (:3002-3090) and `guidesFor` (:3102-3127) cases. **Keep** `createHistory`
  (:2744-2818) and `adopt` (:2825-2863) — they are representation-coupled, not cap-coupled: the
  stack stores whatever `snapshot()` hands it and calls no clamp. Re-express their fixtures over the
  new position shape and leave the assertions alone. Add: the nudge step, the snap rule, the
  align/distribute answers, the multi-select delta — the free-position twins of what was deleted.
- **GOTCHA**: this group's deep-compare is a **hand-written recursive canonical stringify, NOT
  `JSON.stringify(v, keys)`** — an array in stringify's second position is a *replacer* and filters
  property names at every level, "which made every comparison in the group vacuous until a mutation
  sweep caught it" (gates.md:15). There are eight `const deep = …` definitions in this file, at
  :2738, :3158, :3339, :3525, :4303, :4652, :4873, :5079. **Use the one already in your group's
  scope; do not import or re-derive one.**
- **GOTCHA**: the all-or-nothing rule `groupDelta` enforced must survive the rewrite in some form —
  a blocked group move returned the **identical input array** (deep-equality-with-the-input was the
  only assertion a partially-moved set fails). Free positions have no cells to collide in, so decide
  explicitly what "blocked" now means (the stage edge? nothing?) and **write the answer in the
  module header**. If the answer is "nothing blocks a free move", say that — an invariant that
  quietly evaporates is worse than one deliberately dropped.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build verbs"` → `✓`.
- **REDDENS**: make `createHistory`'s `undo()` return the live object instead of a clone — the
  clone-by-mutation case must fail. And make the nudge step return its input unchanged — the nudge
  case must fail naming the offset.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

#### 2.3 RE-PIN group 7's write-site check (`:1405-1578`) — **function-scoped, not file-scoped**

- **IMPLEMENT**: this is the subtlest task in the PR. Today:
  ```js
  const STYLE_WRITE   = /\.setProperty\(|\.style\.[A-Za-z]\w*\s*=[^=]/g;   // :1486
  const ALLOWED_DIRECT = /\.style\.viewTransitionName\s*=[^=]/g;           // :1487
  const calls = (src.match(STYLE_WRITE) || []).length - allowed;
  if (calls) ok(file === "build-import.mjs", `system/${file} writes an inline style; applyToStage is meant to be the only one`);   // :1493
  …
  ok(writes === 1, `the /build modules make ${writes} inline-style writes in total; the invariant is exactly 1`);   // :1525
  ```
  The check is **file-scoped plus a whole-list count**. `applyToStage` is
  `system/build-import.mjs:150` — **not a studio symbol at all**; the ticket's phrasing makes it
  sound like one.
- **GOTCHA — the trap this task exists to avoid.** The obvious fix is to widen :1493 to
  `ok(file === "build-import.mjs" || file === "studio-canvas.mjs", …)` and raise :1525's `1` to the
  new total. **That kills the invariant.** A file-scoped allowlist lets *any number* of writes
  *anywhere* in a 500-line module pass, which is precisely the "check that skipped the thing it
  tested" shape the file's own :1454-1460 comment warns about for `studio-frames.mjs`.
  **Make it function-scoped**: slice `setPos`'s and `setScale`'s function bodies out of
  `studio-canvas.mjs`'s source, count `STYLE_WRITE` matches inside each slice, pin each count to an
  exact number, and assert the **file's** total equals the sum of the slices — so a write anywhere
  else in that file reddens. `build-import.mjs` keeps its file-scoped exception (one function, whole
  file, unchanged).
- **OBSERVED — this predicate was written and driven before the plan asserted it works.** Over the
  real `MODULES` sources plus a synthetic post-swap `studio-canvas.mjs`, it was green on the control
  and **red on all four mutations**, each naming the right thing:
  | Case | Result |
  |---|---|
  | control · the good tree | **green** |
  | M1 · one write outside the named writers | RED — `1 inline-style write(s) OUTSIDE setPos / setScale` |
  | M2 · a write in a module with no named writer | RED — `studio-verbs.mjs writes an inline style; only applyToStage, setPos and setScale may` |
  | M3 · a **fourth** write inside `setPos` | RED — `setPos() makes 4 inline-style writes, the invariant is 3` |
  | M4 · **the file-scoped shortcut** (two writes in another function of the same file) | RED — `2 inline-style write(s) OUTSIDE setPos / setScale` |
  M4 is the one that matters: a file-scoped allowlist passes it. The working shape, to copy:
  ```js
  // Brace-match a named function's body out of the source. No parser, no dependency.
  function sliceFn(src, name) {
    const decl = new RegExp(`(?:function\\s+${name}\\s*\\(|(?:const|let)\\s+${name}\\s*=\\s*(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>\\s*\\{)`);
    const m = decl.exec(src); if (!m) return null;
    let i = src.indexOf("{", m.index + m[0].length - 1); if (i < 0) return null;
    let depth = 0;
    for (let j = i; j < src.length; j += 1) {
      if (src[j] === "{") depth += 1;
      else if (src[j] === "}") { depth -= 1; if (!depth) return src.slice(i, j + 1); }
    }
    return null;
  }
  const NAMED = { "studio-canvas.mjs": { setPos: 3, setScale: 3 } };   // pin the exact counts
  // per file: build-import.mjs keeps its whole-file exception; a file with named writers must have
  // total === sum(slices); every other file must be at zero.
  ```
- **GOTCHA — a missing slice is itself a red, and that is the property to keep.** Observed: when
  `sliceFn` cannot find `setPos`, the predicate fails with `named writer setPos() not found — the
  slice cannot be taken` rather than passing vacuously. **Renaming `setPos` must redden this gate**,
  not silently skip it. A predicate that answers "no slice, nothing to count, green" is the
  check-that-cannot-fail shape wearing a function scope.
- **GOTCHA**: the counts `{setPos: 3, setScale: 3}` above are the reference implementation's
  (`--x/--y/--w`; `--stx-scale` plus the two extent properties). **Re-derive them from your actual
  bodies** — Task 2.0's height decision may make it 4 and 3. Pin whatever is true; the number being
  exact is the point, not the number.
- **GOTCHA — Gate B, which the ticket does not name.** Group 7 has a **running-page twin** in
  `tooling/studio-journey.mjs`, and `setPos` breaks it independently. Nine sites, observed:
  `:196` (`inlineStyled: [...slots, stage, scroll].filter((n) => n.hasAttribute("style")).length`),
  `:209` (`styled: node.hasAttribute("style")`), `:384` (asserted `=== 0` at rest), `:1256`
  (asserted `=== 0` after a drag, an undo and a redo), `:1499`, `:1694`, `:2280`, `:2910`, `:3827`.
  Both `studio-verbs.mjs:504-507` and `studio.mjs:50-51` name this second gate in their own headers
  ("Both halves matter"). Re-pinning group 7 does **nothing** for it. Task 8.2 owns the rewrite; the
  two must be designed together, because the honest running-page predicate is no longer "zero style
  attributes" but "**every style attribute carries only `--x`, `--y`, `--w` or `--stx-scale`**".
- **GOTCHA — the `MODULES` list keeps every entry.** It names 22 files (:1449-1468), and five of
  them — `studio-flow.mjs`, `studio-export.mjs`, `studio-keep.mjs`, `studio-docs.mjs`,
  `catalog.mjs` — are not grid-coupled at all and sit at **zero** writes today. A re-scope that
  narrows the list to "the files that now write" quietly drops coverage of seventeen modules. **Only
  `studio-canvas.mjs` gains named writers; every other entry stays, at zero.**
- **GOTCHA**: `setPos` and `setScale` are not new names in this repo. `system/compare-slider.mjs:53`
  has `function setPos(pct)` and `system/system-graph.mjs:247` has
  `const setScale = (next, anchorX, anchorY)`. Neither module is in group 7's `MODULES` list and
  neither is imported by the studio, so there is **no collision** — but a `git grep "setPos"` now
  returns two unrelated things, so the group-7 slice must be scoped to `studio-canvas.mjs`'s source,
  never to a repo-wide grep.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build vetting"` → `✓`.
- **REDDENS**: **three** mutations, because this check has three legs.
  1. Add `stage.style.opacity = "1"` to `system/studio-canvas.mjs` **outside** `setPos`/`setScale` →
     must fail naming `studio-canvas.mjs` and the out-of-slice write.
  2. Add `node.style.setProperty("--x", "0px")` to `system/studio-verbs.mjs` → must fail naming
     `studio-verbs.mjs` (it has no named writer at all; its true count today is **zero**, verified).
  3. Add a fourth `setProperty` **inside** `setPos` → must fail on that slice's exact count.
  If (3) does not redden, the check is file-scoped again and the task is not done.
- **SATISFIES**: AC #2, AC #8.
- **REGENERATES**: none.

#### 2.4 REWRITE group 14's `arrangeBoard` half (`:3164-3258`), keep `buildSummary` (`:3260-3313`)

- **IMPLEMENT**: replace the row-1/column-order/`clampSlot` cases with the rank layout's answers over
  the same two real committed boards. `buildSummary`'s half is **independent** — it counts and reads
  a pattern id and has no `col`/`row` concept — so it does not change at all.
- **GOTCHA**: :3242-3258 is a "deliberately vacuous but tripwired" over-wide-board truncation case
  at `MAX_COLS`. The rank layout has no such cap (the architecture covers 2–12 by rank and parks
  dagre as a never-shipped fallback). **Delete the case and say in the group's own `detail` string
  that the cap is gone** — silently dropping a tripwire is how the next reader concludes it was
  never needed.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build studio"` → `✓`.
- **REDDENS**: swap two places in the fixture board's `connections` so the BFS rank changes — the
  rank assertions must fail naming the frame whose column moved. If they pass, the layout is being
  asserted against its own output.
- **SATISFIES**: AC #2, AC #4.
- **REGENERATES**: none.

#### 2.5 REWRITE group 22's marquee half (`:4877-4960`, `:5001-5022`), keep `menuItems` (`:4962-4999`)

- **IMPLEMENT**: `marqueeRange`, `idsInRange`, `extendSelection` and `menuAnchor` all clamp to
  `MAX_COLS`×`MAX_ROWS` and work in cells. Re-express over free positions: a marquee is a
  **rectangle in stage coordinates**, and hit-testing is rectangle intersection, not cell membership.
  22.4 (`menuItems`/`MENU_ITEMS`) is independent — pure menu-content logic — and does not change.
- **GOTCHA**: `system/studio-select.mjs`'s call 3 (:31-36) is explicit that the marquee "SNAPS TO
  CELLS AND DRAWS NO RUBBER BAND … Everything here renders through attributes on the existing grid,
  so this module writes ZERO inline styles and joins build-checks group 7 with no exception argued."
  With no cells there is nothing to snap to, and a rectangle the reader can see needs geometry.
  **Either the marquee draws as SVG presentation attributes** (the minimap's own solution —
  `studio-minimap.mjs:9-15` says it chose `setAttribute("x"|"y"|"width"|"height")` on an SVG rect
  "for exactly this gate's reason") **or `studio-select.mjs` becomes a fourth named write site and
  Task 2.3's slice list grows to four.** The SVG route keeps the invariant at three; take it unless
  something forces otherwise, and record the choice in the module header.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build select"` → `✓`.
- **REDDENS**: drag the marquee from the opposite corner — all four directions must still normalise
  to the same rectangle (the existing four-direction case, re-expressed). Break the normalisation for
  one direction and watch exactly that direction fail.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

#### 2.6 REWRITE group 24's footprint case (`:5328-5347`), keep 24.1 / 24.2 / 24.4

- **IMPLEMENT**: 24.3 asserts both `FRAMES` footprints are on-grid by `clampSpan`, disjoint cell by
  cell through `footprint()`, and clear of row 1 with `arrangeBoard` named as the reason. Replace
  with: both frames' rectangles are disjoint **by rectangle intersection**, and clear of the rank
  layout's own first band. The dynamic import at :5272-5273 (`FMAX_COLS`, `FMAX_ROWS`, `fClampSpan`,
  `fFootprint`) goes with it.
- **GOTCHA**: `system/studio-frames.mjs:113-136` hard-codes the two prototypes' grid geometry —
  verdant `col: 1, row: 3, spanCol: 2, spanRow: 2`, fieldwork `col: 3, row: 3, spanCol: 3,
  spanRow: 2`. These are real positions of live iframes on `/factory` and must be re-expressed as
  free positions + widths in the same edit, or the frames land on top of each other.
- **GOTCHA**: 24.2's `/proto/nope.html` mutation is what makes the file-existence check able to fail
  at all, **and it matters precisely because the pixel gate masks iframe content** (`visual.spec.mjs`
  masks `[data-studio-canvas] .stx-frame iframe`), so a 404 inside a frame compares clean against its
  own baseline forever. Keep that mutation exactly as it is.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build frames"` → `✓`.
- **REDDENS**: move fieldwork's x so the two rectangles overlap by one pixel — the disjointness case
  must fail naming both frames.
- **SATISFIES**: AC #2.
- **REGENERATES**: factory VR ×3 (the frames move — Phase 9).

#### 2.7 REWRITE groups 26 and 27 — **representation-coupled, and that is the whole finding**

- **IMPLEMENT**: neither group imports a single cap symbol (verified: group 26 has no grid import at
  all; group 27's imports at :248 carry none). What breaks is narrower and easier to miss:
  - **Group 26 (`layers`, :5468-5540)** pins four **exact position sentences**:
    `"column 3, row 1"` (:5487), `"column 1, row 3, 2 by 2"` (:5488), `"column 4, row 2"` (:5490),
    and the junk-coercion answer `"column 1, row 1"` (:5516). `layerEntries` builds them at
    `system/studio-layers.mjs:80-83`. T16 replaces this vocabulary with reading-order sentences, so
    all four strings and the builder change together.
  - **Group 27 (`minimap`, :5542-5643)** drives `mapView`, `jumpFrom`, `trackOffsets`, `cellRect`,
    `visibleRange` over a caller-supplied pixel-track geometry. The module's pure layer
    (`system/studio-minimap.mjs:88-186`) **parses CSS Grid track lists**, so it is replaced wholesale.
    `footprint()` appears at :5601 only in a **comment analogy** and in the group's `detail` string —
    never called. Do not chase it as an import.
- **GOTCHA**: keep group 27's **three-condition discipline** — `mapView` asserted at rest, panned,
  and zoomed-at-0,0, each the sole detector of one coordinate term. That structure is what makes the
  group able to fail; the terms it detects change, the structure does not.
- **GOTCHA**: `tooling/build-checks.mjs:5634-5640` is a **no-timer source pin over BOTH** #221
  modules. It is independent of the grid. Keep it.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (layers|minimap)"` → two `✓`.
- **REDDENS**: group 26 — change `layerEntries` to emit the same sentence for every row; the
  three distinct-sentence cases must fail. Group 27 — drop the scroll term from `mapView`; the
  panned condition must fail and the at-rest one must still pass (that asymmetry is the proof the
  three conditions are really three).
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

#### 2.8 CUT the coordinate cases from groups 4 and 5

- **IMPLEMENT**: group 4 — delete the arrangement round-trip subsection (:932-958) including the
  `MAX_COLS + 1` off-grid drop case (:956). **Keep :870-931 entirely**, the five frozen v1 fixtures
  included. Group 5 — delete `coordinateCases` and the far-corner accept/reject pair (:1038-1094).
  **Keep** the 32-entry `cases` battery (:989-1036), proto-pollution (:1105-1110), the label-length
  boundary (:1112-1116), malformed transport (:1118-1123) and the decompression-bomb cap
  (:1125-1147). **Add** the v3 refusal cases from Task 1.5's REDDENS.
- **GOTCHA**: the architecture says groups 4 and 5 "lose their arrangement and coordinate cases" —
  **lose cases, not be rewritten**. Resist adding a free-position tamper family: positions are not in
  the payload any more, so there is nothing to tamper with. The one new case is the `g`-carrying
  refusal.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (codec|tamper)"` → two `✓`.
- **REDDENS**: corrupt one byte of a committed v1 fixture in `tooling/share-v1-links.json` — group 4
  must fail naming that fixture. (This proves the surviving half is still live after the cut.)
- **SATISFIES**: AC #2, AC #6.
- **REGENERATES**: none.

#### 2.9 CHECKPOINT — the gate is green again

- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`, exit 0. (Still 34 —
  the two new groups arrive in Phase 4.)
- **COMMIT**: `refactor(studio): the grid is deleted and seven build-checks groups are rewritten against the new helpers (#302)`

---

### Phase 3 — the substrate

#### 3.1 ADD `setPos(el, x, y, w, h?)` to `system/studio-canvas.mjs`

- **IMPLEMENT**: the **only** writer of a node's position and size. Writes `--x`, `--y`, `--w` and
  (for a frame) `--h` as `setProperty` calls on the element; the stylesheet turns them into
  `transform: translate(var(--x), var(--y))`, `width: var(--w)` and `height: var(--h)`. **`h` is
  omitted for a board wrapper** — see **D-c**, and `framesPass:5207`'s assertion that a `.stx-slot`
  carries no size attributes at all.
- **PATTERN**: `system/studio-canvas.mjs`'s existing `place()` is the idempotency contract two
  drivers depend on — `querySelector(…) → place(node) → read the position off that same node`. Keep
  that contract; only the read changes from `getAttribute("data-col")` to
  `style.getPropertyValue("--x")`.
- **GOTCHA**: coerce and clamp **here**, once, the way `clampSlot` was "the ONE place a slot is
  validated". A non-finite `x` must become a number, not reach a custom property as `NaN` — a
  `--x: NaN` silently drops the whole `transform` declaration and the node renders at 0,0 looking
  like a layout bug rather than a value bug.
- **VALIDATE**: with the DOM stub (`tooling/build-checks.mjs:325-337` — it already covers
  `createElement`/`setAttribute`/`textContent`/`appendChild`), drive `setPos` over hostile inputs in
  group 12 and assert the written values.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

#### 3.2 ADD `setScale(stage, s)` + continuous zoom, **coalesced to one write per frame**

- **IMPLEMENT**: continuous `--stx-scale`; `fit()` fits **exactly**; ⌘/Ctrl-wheel zooms to the
  cursor; the scroll extent is sized from stage × scale **in the same write path**. The stepped
  table survives only as the keyboard path (the four buttons at `studio-canvas.mjs`'s mount).
- **PATTERN**: **`system/system-graph.mjs:247-260` is a working, shipped implementation of exactly
  this, on the same page.** Read it before writing a line:
  ```js
  const setScale = (next, anchorX, anchorY) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    if (clamped === scale) return;
    const ax = anchorX ?? scroll.clientWidth / 2;
    const ay = anchorY ?? scroll.clientHeight / 2;
    // The content point under the anchor, in unscaled units, read with the OLD scale.
    const cx = (scroll.scrollLeft + ax) / scale;
    const cy = (scroll.scrollTop + ay) / scale;
    scale = clamped;
    root.style.width = `${WIDTH * scale}px`;
    root.style.height = `${height * scale}px`;
    scroll.scrollLeft = cx * scale - ax;   // the browser clamps both to the new scroll range
    scroll.scrollTop  = cy * scale - ay;
    syncControls();
  };
  ```
  The anchor maths, the measure-at-call-time rule and the extent-in-the-same-write are all already
  argued there and in `studio-canvas.mjs`'s own `setZoom`.
- **GOTCHA — S1's actual recommendation, and it is not in the ticket.** The ticket says to add
  `content-visibility: auto` + `contain-intrinsic-size` "if S1's branch says so". **S1's branch says
  no**, twice over: it took branch 1, configuration (a), *no mitigation*, and it measured that
  `content-visibility` does not cull this substrate on Chromium 149.0.7827.55 at all — translate
  positioning (T4) and a scaled ancestor (T2) each defeat it **independently**
  (`.claude/plans/canvas-spike-s1/README.md`, `raw/cfg-b-containment-probe.txt`; Firefox 151.0 and
  WebKit 26.5 do cull). **Do not add it.** What S1 *does* recommend is the one line the ticket
  omits: **coalesce the scale write to one per animation frame.** Under a 4× CPU-throttle proxy the
  wheel sweep spends **83 of 241 frames over 33 ms (34.4%)**, and the cost is re-rasterising ~30
  scaled compositions plus `.stx-sizer`'s own scale-dependent relayout — `studio.css:69-73`'s
  width/height are `calc(… * var(--stx-scale))`. Measured, not reasoned: **zero arrow redraws occur
  during a zoom** (72 wheel events, 0 redraws), so deferring arrow geometry cannot help here.
- **GOTCHA**: T2 is S1's **open edge**, not a pass. Say so in the module header rather than letting
  a reader infer "holds" from a green row about drags. The 56.0 ms worst drag INP is also a
  **floor** — S1's harness carried no selection, verbs, layers, minimap or undo.
- **GOTCHA — the "stepped table survives as the keyboard's path" must not keep the name
  `ZOOM_LEVELS`.** Task 1.1 deletes that export and AC #1's grep includes it, so a keyboard scale
  list still called `ZOOM_LEVELS` leaves the DoD grep non-empty and **fails AC #1**. Name the new
  constant something else (`ZOOM_STEPS`) and say in the header that the old name is retired.
- **GOTCHA — `data-zoom` is not in the DoD grep, and it must still go.** The DoD's seven symbols do
  not include it, so a dead `data-zoom` attribute passes AC #1 silently. Today
  `studio-canvas.mjs`'s mount **writes** it (`viewport.setAttribute("data-zoom", …)`) and
  `system/studio-minimap.mjs`'s MutationObserver **watches** it as its "sole detector" of a zoom
  change with no scroll event (`tooling/studio-journey.mjs:5793-5802` is the assertion that depends
  on it). Decide whether the attribute goes or stays as an announceable read-out, and **check it
  with its own grep** (`git grep -n "data-zoom" -- system/ tooling/ '*.html'`), separately from the
  DoD's.
- **GOTCHA**: the existing `WHEEL_STEP = 40` accumulator (`studio-canvas.mjs:186`) exists because a
  trackpad pinch arrives as many small ctrl+wheel deltas and stepping a level per raw event made
  zoom unusable. Continuous scale does not need the accumulator, but it **does** need the rAF
  coalescing above for the same underlying reason. Replace one with the other; do not drop both.
- **GOTCHA**: a **bare** wheel must stay untouched — it scrolls the box and chains to the page. The
  existing handler's comment calls trapping it "the dark pattern this whole handler exists to not
  be". Keep the `if (!(e.ctrlKey || e.metaKey)) return;` guard first.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build canvas"` → `✓`, plus Task 8.4's
  INP gate.
- **REDDENS**: remove the rAF coalescing and re-run the INP gate's zoom leg under CDP 4× throttle —
  the frames-over-33ms count must rise measurably. If it does not, the coalescing is not on the
  path you think it is.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

#### 3.3 REWRITE `snapshot` / `restore` / `applySlot` / `applySpan` in `system/studio-verbs.mjs`

- **IMPLEMENT**: `system/studio-verbs.mjs:400-557`. `slotOf` (:400-403) reads `data-col`/`data-row`;
  `spanOf` (:406-409) reads `data-span-*`; `snapshot` (:418-426) builds `{id: {col,row}}` or
  `{id: {col,row,cols,rows}}`; `applySlot` (:431-434) and `applySpan` (:439-442) are "the ONE place
  data-col / data-row are written after placement"; `restore` (:530-557) compares `now.col ===
  want.col` etc. All five become position/width reads and writes through `setPos`.
- **GOTCHA**: `createHistory` (:295-347) is **generic and needs no change** — it clones with
  `structuredClone`, truncates the redo tail, caps at `HISTORY_MAX = 50`. Do not touch it. Group 13
  keeps its cases (Task 2.2).
- **GOTCHA**: the snapshot's shape rule is deliberate and stated at :414-417 — "cols/rows are
  recorded only for a node that HAS a span … writing `cols: 1` for it would be claiming a property
  it has never carried, in a structure two drivers deep-compare." Under free positioning **every**
  node has a width, so the asymmetry may legitimately go — but if it does, say so, because two
  drivers deep-compare these entries.
- **GOTCHA**: undo/redo travel is `element.animate()`, which "never touches `.style`"
  (`studio-verbs.mjs:504-507`). That is what kept **both** gates green. It still works — animate()
  is unaffected — but the running-page assertion it protected is the one Task 8.2 rewrites.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build verbs"` → `✓`.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

#### 3.4 ADD the SVG arrow overlay — **and run `vt-stack-audit` before naming anything**

- **IMPLEMENT**: one hand-written SVG overlay inside the scaled stage, arrows bound to frames by id,
  geometry **derived from positions on every move and never stored** (Excalidraw's binding shape).
  Arrows from a part when there is one: `from: {frameId, partId?}`, `to: {frameId}`, plus `trigger`.
- **GOTCHA — the #171 trap, through a different door.** `system/studio-canvas.mjs:27-30` records:
  "The stage names NOTHING for a view transition. #171 shipped a real at-rest regression by naming
  elements that then became containing blocks for an absolutely positioned overlay, and the pixel
  gate re-baselined it." **`transform` creates a containing block for `position: absolute` and
  `position: fixed` descendants exactly as `view-transition-name` does** (CSS Transforms 1 §3). This
  PR puts a `transform` on every node *and* adds an absolutely positioned SVG overlay. `gates.md:160`
  states plainly that **the pixel gate cannot catch this class of bug**. Run
  `node tooling/vt-stack-audit.mjs` before naming anything for a transition, and put the overlay
  **outside** every transformed node's subtree — a sibling of the nodes inside the stage, not a
  child of one.
- **GOTCHA**: the overlay lives **inside** the scaled stage, so it rescales for free and a zoom
  triggers zero redraws (S1 measured 0 across 72 wheel events). Putting it outside the stage would
  make every zoom a full arrow re-layout — the opposite of what S1 measured.
- **GOTCHA**: S1 observed the rAF deferral of arrow redraw engaging **only on WebKit** under a real
  scripted gesture (42 → 5); on Chromium and Firefox Playwright cannot deliver pointermoves faster
  than the frame rate, so there is nothing to coalesce and configuration (c) is identical to (a) by
  construction. **Do not write a driver assertion that the deferral engaged** — it cannot fire on two
  of three engines. That is #423's G1 shape (a check whose predicate is true regardless), and this
  is the place it would recur.
- **VALIDATE**: `node tooling/vt-verify.mjs` → the factory block's expected transition counts
  unchanged; `node tooling/vt-stack-audit.mjs` → clean.
- **REDDENS**: name one node for a view transition and re-run `vt-stack-audit` — it must flag the
  stacking change. (Then revert: nothing here is named.)
- **SATISFIES**: AC #3.
- **REGENERATES**: factory VR ×3 (Phase 9).

#### 3.5 REPLACE `arrangeBoard` with the rank layout — **in BOTH copies**

- **IMPLEMENT**: BFS from the entry frame, one column per rank. `system/studio.mjs:106-120` is
  `arrangeBoard`; its three callers are `:450` (initial mount), `:568` (`publishBoard`) and `:666`
  (`adoptBoard`).
- **GOTCHA — there are two copies of the rule.** `system/replay-driver.mjs:516-518` independently
  reimplements it (`const col = board.places.indexOf(place) + 1; if (col > MAX_COLS) continue;`) and
  its :494-498 comment acknowledges the duplication. **Changing `arrangeBoard` alone leaves
  `/factory`'s replay laying out by the old rule.** Either both change, or the driver imports the new
  one — the second is better and the architecture's "the driver dispatches by op prefix" posture
  supports it.
- **GOTCHA**: the input is the board's `places` + `connections`. Observed shapes:
  `connections` is `[[affordanceId, placeId], …]` (e.g. `[["p1a1","p2"], …]`), and
  `replay/build-northwind-restock.board.json` carries a **cycle** (`p2a2 → p1`). **BFS needs a
  visited set** or it does not terminate. The two committed boards are 4 places / 7 connections and
  5 places / 10 connections — both inside the rank layout's stated 2–12 range.
- **OBSERVED — the layout was run against both committed boards before this plan was written.**
  A reference implementation of exactly the rule above (BFS from `places[0]`, one column per rank,
  a `seen` set, unreachable places in a trailing rank in board order) produced, deterministically
  (two runs byte-identical, <1 ms each):
  | Board | Places | Connections | Result |
  |---|---|---|---|
  | `build-fieldwork-dispatch` | 4 | 7 | `p1`→col 0 · `p2`→1 · `p3`→2 · `p4`→3. One per column: `{0:1, 1:1, 2:1, 3:1}` |
  | `build-northwind-restock` | 5 | 10 | `p1`→0 · `p2`→1 · `p3`→2 · **`p4`→3 order 0, `p5`→3 order 1**. `{0:1, 1:1, 2:1, 3:2}` |
  **These are the literals Task 2.4's group-14 fixture asserts.** Northwind's rank 3 holding *two*
  places is the case that makes the fixture non-trivial — a layout that silently reverted to
  one-per-column would still pass on fieldwork alone. The cycle (`p2a2 → p1`) terminated correctly
  with the `seen` set; without it the walk does not end.
- **GOTCHA — `arrangeBoard` is total by contract and the obvious BFS is NOT.** Junk returns `[]` and
  it never throws (`system/studio.mjs:96-98`); group 14 drives **nine** junk boards through it.
  **Observed on the reference implementation: `{places: [{}]}` threw
  `"p.affordances is not iterable"`** — a place with no `affordances` array is one of the nine junk
  shapes, and the ownership map walks `p.affordances` before any guard runs. Guard the ownership
  build (`for (const a of p?.affordances ?? [])`) **and** the place-id read, not just the top-level
  `board`. This is the one defect the reference run found; do not re-introduce it.
- **GOTCHA**: the old rule **broke** at `MAX_COLS` rather than clamping, deliberately: clamping
  would stack places 13+ onto column 12, "a stacking claim the canvas explicitly refuses" (:96-105).
  The rank layout has no cap. Say in the new header what happens past twelve frames — the
  architecture parks dagre as a portal-side fallback that never ships, so the honest answer is "rank
  covers 2–12 and nothing here refuses more; a real flow that outgrows it is a new ticket".
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (studio|replay driver)"` → `✓`,
  and Task 8.3's `/factory` pass proves both committed projections play.
- **SATISFIES**: AC #4.
- **REGENERATES**: factory VR ×3 (Phase 9) — `/factory`'s at-rest state **is** the completed replay.

#### 3.6 CHECKPOINT and commit

- **VALIDATE**: `node tooling/build-checks.mjs` green; `npx serve .` and open `/studio.html` — the
  stage renders, nodes are positioned, zoom is continuous.
- **COMMIT**: `feat(studio): the free-position substrate — setPos, setScale, continuous zoom, the arrow overlay and the rank layout (#302)`
---

### Phase 4 — `canvas-ops.mjs`, `device-presets.mjs`, and their group

#### 4.1 CREATE `system/device-presets.mjs`

- **IMPLEMENT**: one exported, doubly-frozen width table (G20) — several phone, tablet and desktop
  widths — that `frame.size` reads. Width is recorded **per frame**; a state sibling inherits its
  base's unless it overrides it.
- **PATTERN**: `discovery/ops.mjs:75-80`'s double freeze (`Object.freeze` is shallow; a pushable
  inner array lets "frozen by mutation" pass for the wrong reason).
- **GOTCHA**: preset widths are a **reversible** call (architecture § Spikes: "Reversible calls
  (preset widths, snap tolerances, the op count, the SPA's run list) are decided at implementation
  and moved when a flow says so"). Pick sensible values, say in the header that they are reversible,
  and do not spend a round deciding them.
- **VALIDATE**: `node -e 'import("./system/device-presets.mjs").then(m=>console.log(JSON.stringify(m.DEVICE_PRESETS)))'`
- **SATISFIES**: AC #3.
- **REGENERATES**: `loc-summary` (runtime `files` 76 → 77) — Phase 7.

#### 4.2 CREATE `system/canvas-ops.mjs` — the pure applier, six ops

- **IMPLEMENT**: `OPS` (frozen), **`PARAMS` (exported, frozen at both levels)**, `emptyDoc()`,
  `checkOp(op)`, `applyOp(doc, op)`, `applyOps(ops, doc = emptyDoc())`, `resolve(base, override)`,
  `missingStates(doc, variantKey?)`, `STATE_KEYS`. Six verbs: `screen.compose` · `screen.set` ·
  `state.add` · `frame.size` · `connect` · `disconnect`.
- **PATTERN**: `system/board-ops.mjs` for the skeleton; `discovery/ops.mjs` for the three things
  board-ops does *not* do. Copy all four:
  1. **Export `PARAMS`, frozen at both levels** (`discovery/ops.mjs:71-80`). This is a
     **prerequisite, not a nicety**: build-checks group 11 has no per-verb loop *because*
     `board-ops.mjs:49` keeps `PARAMS` private, so a new board verb is covered only if someone
     widens a fixed four-op fixture by hand. The ticket requires "its build-checks group iterates
     `OPS`", which is impossible without the export.
  2. **Close the envelope** (`discovery/ops.mjs:296-300`): any key on the op object other than `op`
     and `params` throws.
  3. **Exact params, not minimal** (`board-ops.mjs:86-98`): an unknown key throws, an absent key
     throws, and the message names what the verb actually takes.
  4. **An op never carries the id of what it creates** (`board-ops.mjs:67-71`'s `nextId(prefix,
     taken)` — the lowest free `<prefix><n>`). Frames `f1`, parts `p1`, arrows `a1`.
- **IMPLEMENT — D4, the owner's call of 2026-08-28:** **`screen.compose` carries a required `why`** —
  one sentence naming the decision(s) and the reason for the composition. **The applier refuses a
  compose without it, the owner's or the agent's**, so a proposal can be judged rather than
  inspected. Put `why` in `PARAMS["screen.compose"]` so the exact-params rule enforces presence, and
  add an explicit non-empty-string check so `why: ""` is refused too — `PARAMS` presence alone
  accepts an empty string.
- **IMPLEMENT — the override rules** (G2/G3/G33): one `override` shape
  (`{set: {partId: {prop: value}}, hide: [partId], add: [{parentId, index, part}]}`), three uses.
  `resolve(base, override)` is the one pure resolution function. **A dangling reference — an override
  naming a part the base no longer has — is FLAGGED and shown, never dropped.** **Deleting a base
  part is REFUSED while a state or instance still overrides it.** Those two sentences are opposite
  postures on purpose: a read flags, a write refuses.
- **GOTCHA**: `resolve` and `missingStates` are **pure reads, not verbs**. They do not take the
  epic's op-verb lock and may not touch `OPS`, `PARAMS` or the switch — `discovery/ops.mjs` states
  this at each of its five reads (:62-63, :138, :195, :227). Reads are **total over junk**; the
  applier throws. Opposite postures, deliberately.
- **GOTCHA**: `stateKey` is an **open enum** with a required minimum of `ideal · empty · error ·
  partial · loading` (T6). Permission, offline and owner-named keys are opt-in per screen. So
  `missingStates` checks the minimum and does not refuse an unknown key.
- **GOTCHA**: **no SDK anywhere in the import graph, and no `zod`.** CLAUDE.md's one `zod` exception
  is the SDK's tool-schema adapter; "an applier and a boundary validator never import it". CI has no
  `portal/node_modules`, so an accidental SDK import reddens `verify` in a way that looks unrelated.
- **GOTCHA — module placement.** `discovery/ops.mjs:10-12` argues an op grammar belongs *outside*
  `system/` because `gen-loc-summary` counts `system/*.mjs` and `approach.html` renders the number.
  `board-ops.mjs:10-14` argues the opposite for itself because the replay driver consumes it at
  **view time**. The architecture pins `canvas-ops.mjs` under `system/` and a shipped page loads it,
  so board-ops' side wins — **and the loc + approach ×2 cost is expected, not a mistake.**
- **OBSERVED — a reference implementation of this exact shape was written and driven during
  planning, and all 25 assertions passed.** It is parked beside this plan:
  `.claude/plans/canvas-swap-302-reference/canvas-ops.reference.txt` (the module),
  `canvas-ops.run.txt` (the drive), `canvas-ops.observed.txt` (the output).
  **Copy it and adapt — do not start from a blank file.** Parked as `.txt` because CI's
  `drift-check` runs `node --check` over every tracked `.mjs`, including `.claude/plans/`.
  What it proved, each a case the real group 35 should carry:
  | Proved | Observed |
  |---|---|
  | `OPS` ↔ `PARAMS` are the same six verbs | ✓ |
  | `OPS` and all six `PARAMS` entries frozen **by mutation** | ✓ (7 rows) |
  | the spine's five ops apply | ✓ frames `f1,f2`, arrow `a1` |
  | **ids are deterministic across two runs** | ✓ byte-identical |
  | no op's `PARAMS` carries an id for what it creates | ✓ |
  | **D4 · `why` absent / empty / blank all refused** | ✓ 3 rows, each naming `why` |
  | unknown param · unknown envelope key · unknown verb · dangling frame ref | ✓ each refused by name |
  | a `stateKey` off the required minimum refused | ✓ |
  | `resolve` **flags** a dangling `set` and a dangling `hide`, drops neither | ✓ `[{dangling-set,p9},{dangling-hide,p7}]` |
  | `resolve` is pure (the base is untouched) | ✓ |
  | **deleting an overridden base part refused**, naming the state that blocks it | ✓ `cannot delete part "p2": error (f2) still override it` |
  | deleting an un-overridden part allowed (the positive control) | ✓ |
- **GOTCHA — `why` needs TWO checks, not one.** `PARAMS` presence catches `undefined`; it accepts
  `""` and `"   "`. The reference adds
  `if (typeof p.why !== "string" || !p.why.trim()) throw …` and all three cases were driven. A
  plan that only lists `why` in `PARAMS` satisfies the ticket's words and not D4.
- **GOTCHA**: the reference's `OPTIONAL` map exists because `screen.compose`'s `decisionRefs` is
  genuinely optional while `board-ops.mjs`'s params are all required. Keep the exactness rule and
  declare the exceptions explicitly — do not soften `checkOp` to "some params may be absent".
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(m=>{console.log(m.OPS.join(" ")); console.log(Object.keys(m.PARAMS).join(" "))})'`
  → six verbs, both lists identical.
- **SATISFIES**: AC #5.
- **REGENERATES**: `loc-summary` (runtime `files` 77 → 78) — Phase 7.

#### 4.3 ADD build-checks **group 35 — `canvas ops`**

- **IMPLEMENT**: mirror **group 29** (`discovery ops`, `tooling/build-checks.mjs:5987-6613`),
  **not** group 11. Three moves:
  1. **The roster, both directions, frozen by mutation** (:6016-6026's shape): `OPS.length === 6`,
     `Object.keys(PARAMS).length === OPS.length`, every `PARAMS[v]` an array, every `PARAMS` key in
     `OPS` — then, for `OPS` and each `PARAMS[v]`, `Object.isFrozen(arr) && threw(() =>
     arr.push("smuggled")) !== null && arr.length === n`.
  2. **`VALID_FOR` — one minimal valid op per verb**, with the missing-fixture tripwire
     (:6029-6038): `for (const verb of OPS) ok(VALID_FOR[verb], \`no VALID_FOR fixture for "${verb}"
     — every verb needs one minimal valid op here, or the group iterates OPS in name only\`);`
  3. **Every throw driven by a broken op**, matched against what its message must **name**
     (:6075-6089's `names(...)` idiom).
- **IMPLEMENT** the four assertions the ticket names explicitly: every op has a `PARAMS` entry and a
  switch case; **malformed throws**; **a dangling override is flagged, never dropped**; **deleting a
  base part is refused while a state overrides it**. Plus **ids are deterministic** — apply the same
  op list twice and assert the ids are identical, and assert no op's `PARAMS` entry contains an id
  for the thing it creates.
- **GOTCHA**: `threw()`, `names()` and `deep()` are existing helpers. There are **eight** separate
  `const deep = …` definitions (:2738, :3158, :3339, :3525, :4303, :4652, :4873, :5079) — define
  your own inside your group's block, as every other group does, and make it a **hand-written
  recursive canonical stringify**, never `JSON.stringify(v, keys)` (an array in the second position
  is a *replacer* and made a whole group vacuous once — gates.md:15).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build canvas ops"` → `✓`.
- **REDDENS**: **four** mutations, one per named assertion.
  1. Feed `applyOp` a `screen.compose` with `why` absent → must throw naming `why`. Then feed one
     with `why: ""` → **must also throw**. (If only the first reddens, the check enforces presence,
     not the owner's D4 requirement.)
  2. Add a seventh entry to `OPS` with no `PARAMS` entry → the roster case fails naming it.
  3. Make `resolve` drop a dangling override instead of flagging it → the dangling case fails.
  4. Make the base-part delete succeed while a state overrides it → the refusal case fails.
- **SATISFIES**: AC #5, AC #2.
- **REGENERATES**: the group-count prose — Phase 7 / Task 10.2.

#### 4.4 ADD the optional `id` node key → `data-part`

- **IMPLEMENT**: `system/agentic-renderer.mjs`. Emit `data-part` from a node's `id`.
- **GOTCHA — the validator does not close the node envelope, so there is nothing to "allow".**
  `validateComposition` (`system/agentic-renderer.mjs:38-121`) checks `node.name` is a string, that
  `props` keys are a subset of `entry.props`, and `children`'s shape/count/names. It **never
  enumerates `Object.keys(node)`** — unlike `board-ops.mjs:86-98` and `discovery/ops.mjs:296-300`,
  which both close their envelopes. So `{name, props, children, id: "foo"}` **already passes today**.
  The work is therefore: (a) decide whether to *close* the envelope and admit `id` explicitly (the
  house pattern, and it makes a typo like `idd` fail loudly), and (b) **consume** it.
- **GOTCHA**: `build()` (`system/agentic-renderer.mjs:609-620`) is the **single choke point** every
  template's return value passes through — it destructures only `node.props`, `node.children`,
  `node.name`. One edit there covers all 23 templates; editing the templates individually is 23
  edits and 23 chances to miss one.
- **GOTCHA**: `data-part` is **unused repo-wide** (grep across `.mjs`/`.css`/`.html`: zero hits). No
  collision.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build composition"` → `✓`, with a new
  group-3 fixture rendering a node carrying `id` and asserting `data-part` on the element.
- **REDDENS**: render a node with `id: "x"` and assert `data-part="x"`; then delete the emit in
  `build()` — the fixture must fail. And (if the envelope is closed) send `{name, props, idd: "x"}`
  — it must throw naming `idd`.
- **SATISFIES**: AC #5 (an arrow addresses a part).
- **REGENERATES**: **`gen-vocabulary` + `gen-handoff`** — see Task 7.3. This is the cascade the
  ticket does not name.

#### 4.5 CHECKPOINT and commit

- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 35 groups pass` (the pass line moves
  in Task 10.2; expect the drift-check to be red until then — that is fine mid-phase, not at the PR).
- **COMMIT**: `feat(system): canvas-ops.mjs — the build document's pure applier, six ops, a required why on screen.compose (#302)`

---

### Phase 5 — the verbs and their announcements

#### 5.1 ADD nudge by a spacing token

- **IMPLEMENT**: arrow keys move the carried node(s) by one spacing step. **There is no
  `--spacing-none`** — #301 decided against it, and `system/specs/stack.md:29` records the verdict
  plus build-checks group 3's assertion of its absence. The scale is
  `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64 · 4xl 96` (`system/tokens.contract.css:55-62`),
  so **the nudge floors at `--spacing-xs` = 4 px.**
- **GOTCHA**: this is the SC 2.5.7 single-pointer alternative for the drag. Every new verb owes one;
  `system/studio-verbs.mjs`'s header (:41-46) records which criterion is which.
- **VALIDATE**: group 13's nudge case (Task 2.2).
- **SATISFIES**: AC #3, AC #7.
- **REGENERATES**: `param-manifest` — see Task 7.2. (Probably **no new entry**: the existing
  `/factory` entry "per-block move handle (drag, click-move-click, or Enter + arrows = one per-item
  verb)" already covers the keyboard path. Check the counting rules rather than assuming.)

#### 5.2 ADD snap-to-neighbour guides, multi-select move, align/distribute

- **IMPLEMENT**: eight align/distribute verbs (left · centre · right · top · middle · bottom ·
  distribute h · distribute v), each with a keyboard path.
- **PATTERN**: the deleted `guidesFor`'s rule survives — a guide must be over a value held by **both**
  a carried member and a non-carried peer, or it is a false claim of alignment
  (`system/studio-verbs.mjs:472-477`). Re-express it over free positions with a tolerance.
- **GOTCHA**: snap tolerance is a **reversible** call (architecture § Spikes). Pick one, name it as
  a constant, say it is reversible.
- **GOTCHA**: `system/action-bus.mjs:39` constrains every verb name —
  `TYPE_RE = /^(ui|agent)\.[a-z][a-z-]*$/`. Lowercase, hyphens, exactly one dot. So `ui.align-left`,
  not `ui.alignLeft`. And `SOURCES = new Set(["pointer","keyboard","agent","voice"])` (:38).
- **GOTCHA**: `ui.move`'s `params` is `{col, row}` today
  (`system/studio-verbs.mjs:847-852`), `ui.resize`'s is `{cols, rows}` (:826-831), and
  `ui.move-group`'s is a per-member `{id, col, row}` list (:839-843). **These payload shapes are
  bus-contract-visible**, not module internals — the replay driver, `studio-journey` and any future
  agent all read them. Changing them to `{x, y, w}` is a contract change; state it in
  `action-bus.mjs`'s own doc block, not only in the verbs file.
- **VALIDATE**: group 13's align/distribute cases; Task 8.3's running-page pass.
- **SATISFIES**: AC #3, AC #7.
- **REGENERATES**: `param-manifest` — **one new entry** for the align/distribute row (the counting
  rules make a button row one control: `/factory` 46 → 47, total 120 → 121). Derive, don't assume.

#### 5.3 ADD the reading-order announcements (T16)

- **IMPLEMENT**: "moved to 3 of 7" in row-major frame order, **plus the nudge offset in px**. Every
  align/distribute verb announces its result. The zoom's keyboard steps stay announceable.
- **PATTERN**: everything goes through the canvas's **one** live region —
  `system/studio-canvas.mjs:219` creates `<p class="stx-live" role="status" aria-live="polite">`,
  :224 defines `say`, and the mount exposes it on the handle. `system/studio-compile.mjs:258-259`
  states the rule: "NOT a second live region — the canvas has exactly one … and every sentence below
  goes through `canvas.say`."
- **PATTERN**: `SPOKEN_MAX = 3` (`system/studio-verbs.mjs:93-100`) is the existing "name a few, then
  count" precedent, and it is module-scope exactly so `studio-select.mjs` imports the same bound
  rather than re-typing it. Its use at :739-743:
  ```js
  const named = resolved.slice(0, SPOKEN_MAX).map((r) => `${nameOf(r.node)} in column ${r.slot.col}, row ${r.slot.row}`).join("; ");
  const rest = resolved.length - SPOKEN_MAX;
  canvas.say(rest > 0 ? `Moved: ${named}, and ${rest} more.` : `Moved: ${named}.`);
  ```
- **GOTCHA — the live-region coalescing trap, and it has bitten this codebase twice.** A
  `role="status" aria-live="polite"` region announces only its **final** `textContent` per task, not
  every write. `system/studio-compile.mjs:194-206` keeps a **non-zero** reduced-motion pause
  (`STEP_MS_REDUCED = 100`) because "a zero pause here therefore did not merely speed the beat up, it
  DELETED three of its four steps for a screen-reader user". `system/replay-driver.mjs:577-611`'s
  `actsPending`/`drainActs()` exists because synchronous loops wrote N sentences in one task and all
  but the last were overwritten: "ACTS TRAVERSED WITHIN ONE TASK ARE NAMED IN ONE SENTENCE, never
  announced one by one." **Align/distribute moves N nodes synchronously.** Announce **once**, with a
  drained sentence, or space the moves across tasks. Do not write N `say()` calls in one task.
- **GOTCHA**: **no existing announcement anywhere uses an ordinal ("N of M") or a pixel value.** Every
  one says "column C, row R" (`studio-verbs.mjs:650`, `:695`, `:1354-1356`;
  `studio-minimap.mjs:461`; `replay-driver.mjs:668-669`). T16's phrasing is **new vocabulary** with
  no precedent to extend — the mechanism (`canvas.say`) and the batching precedents carry over, the
  wording does not.
- **GOTCHA**: `system/studio-verbs.mjs:1341-1344` announces on **every** keypress **including a
  blocked one** ("Blocked, still in column X, row Y"), because a verb that moves nothing and says
  nothing is worse than no verb. Keep that property under whatever "blocked" now means (Task 2.2).
- **VALIDATE**: Task 8.3's announcement assertions on a running page, three engines.
- **SATISFIES**: AC #7.
- **REGENERATES**: none.

#### 5.4 CHECKPOINT and commit

- **COMMIT**: `feat(studio): nudge, snap guides, multi-select move and align/distribute, each with a keyboard path and a reading-order announcement (#302)`

---

### Phase 6 — the spine and its package

#### 6.1 CREATE `portal/lib/canvas-store.mjs`

- **IMPLEMENT**: `saveBuild(root, doc, opLines)` and `loadBuild(root)`. One concern: package IO.
- **PATTERN**: `portal/lib/trace-recorder.mjs:65-82`'s append-only ledger idiom —
  `mkdirSync(dirname, {recursive:true})` → truncating `writeFileSync(path, '')` → then
  `appendFileSync(path, JSON.stringify(obj) + '\n')` per record. `canvas.json` is the generator
  idiom instead: one `JSON.stringify(x, null, 2) + "\n"` whole-file write.
- **GOTCHA**: **no route in this PR.** `portal/server.mjs` gains nothing; that is #306. The module
  is imported by build-checks and by the one-off script that writes the spine (**D-a**).
- **GOTCHA**: `portal/lib/` matches **none** of `gen-loc-summary`'s three group regexes
  (`agent-layer/gen-loc-summary.mjs:22-26`), so this file **does not** cascade to loc-summary or the
  approach baselines. Only the two `system/*.mjs` do.
- **VALIDATE**: round-trip in a scratch dir: `saveBuild` then `loadBuild`, assert deep equality and
  **byte** equality of the re-serialized files.
- **SATISFIES**: AC #6.
- **REGENERATES**: none.

#### 6.2 WRITE `discovery/faster-payment/build/ops.jsonl` — the spine's six ops

- **IMPLEMENT**: the frame, the `stack` with three children, the error state as an override on the
  first frame, the arrow, the widths. Line shape:
  `{seq, at, source: "owner", op, params, status: "applied"}`. **Positions are never on a line**
  (architecture § Data model).
- **IMPLEMENT — the composition**, all four components verified present in
  `handoff/verdant/vocabulary.json` (23 components, `composition.version: 2`):
  `stack` (`ds-stack`, `childrenCardinality: "many"`, required `direction: row|column`, optional
  `gap`/`pad` from the spacing enum) holding `text` (`ds-text`, required `role:
  display|heading|body|caption` + `content`), `text-field` (`ds-text-field`, required `label`) and
  `primary-button` (`vd-primary-button`, required `label`). All three are in `stack`'s allowed-children
  list — verified.
- **OBSERVED — the spine's composition was validated against the REAL `validateComposition` and the
  REAL committed `handoff/verdant/vocabulary.json` during planning.** Output parked at
  `.claude/plans/canvas-swap-302-reference/spine-validation.observed.txt`:
  - ✓ the base frame validates —
    `stack{direction:"column", gap:"md", pad:"lg"}` › `text{role:"heading", content}` ·
    `text-field{label, placeholder}` · `primary-button{label}`
  - ✓ the **error state resolves and validates** — the same tree with a `hint` added to the field
    and the button relabelled, which is what `resolve(base, override)` hands the renderer
  - ✓ three negative controls refused: a child outside `stack`'s allowed list, a bad enum value, a
    missing required prop
  - **✗ a node carrying `id: "p1"` is ACCEPTED today** — the envelope is open, confirming Task 4.4
- **GOTCHA**: `stack` also has an **`align`** prop, enum `start | center | end | stretch`
  (observed from the validator's own refusal message). Not in the ticket's description of the
  spine; use it or don't, but know it exists before treating an align failure as a bug.
- **DECIDED — D-a (owner, 2026-09-18).** `ops.jsonl` is the **truth** and must not be
  hand-written as a *recording*. But these are the **owner's** ops (`source: "owner"`), and an owner
  op typed by the owner is exactly what `tooling/board-op.mjs` exists to accept ("one invocation
  applies exactly ONE op … and prints the whole resulting board back, ids included"). So: **type the
  six ops, apply them through the real `applyOps`, and let `canvas-store.saveBuild` write the file.**
  Never author the JSONL by hand in an editor — the `seq`, the ids and the applied document must
  come from the applier, or the gate's fixture is fiction. Record the producing script verbatim in
  the report so the fixture is reproducible.
- **GOTCHA**: `discovery/faster-payment/` is a **real discovery run** (`run.json`:
  `provenance: "fictional"`, `label: "Real run — fictional scenario"`), so its `build/` half inherits
  that label. Do not create a new slug.
- **GOTCHA**: `screen.compose` **requires `why`**. Write a real sentence naming the decision — the
  package's own `prd.md` and `transcript.jsonl` are right there.
- **VALIDATE**: `node -e '…applyOps(lines)…'` reproduces the document; then Task 6.4's gate.
- **SATISFIES**: AC #6.
- **REGENERATES**: none.

#### 6.3 WRITE `discovery/faster-payment/build/canvas.json` — the arrangement

- **IMPLEMENT**: nodes `{id, type, x, y, width, height?, ref}`, edges `{fromNode, toNode, relation}`.
  Both edge kinds are **derived** (arrows → `flows`, `frame.link` → `embodies`) and rewritten on
  save. The file never carries a fact the ops do not.
- **GOTCHA — it is a DIALECT of JSON Canvas, not conformant, and the header must say so.** Observed
  against the spec (fetched 2026-09-18): JSON Canvas 1.0 requires `id`·`type`·`x`·`y`·`width`·`height`
  on every node with `type` ∈ `text|file|link|group`, and an edge is `id`·`fromNode`·`toNode` with
  optional `fromSide`/`toSide`/`fromEnd`/`toEnd`/`color`/`label`. **There is no `relation` key and no
  `ref` key in the spec.** The architecture's shape diverges four ways: invented node types
  (`frame|note|decision|exhibit`), `height` made optional, `ref` added, and `label` replaced by
  `relation`. Ship the architecture's shape — it is the authority — but write the `$description` as
  "**JSON Canvas–shaped**", naming all four divergences. An Obsidian-class reader refuses
  `type: "frame"`, and claiming conformance we do not have is exactly what the honesty contract
  forbids. **This is D-b, decided by the owner 2026-09-18.**
- **GOTCHA**: positions are the owner's, not the ops'. For the spine, derive them from the rank
  layout so the whole package is reproducible from `ops.jsonl` + the layout — otherwise the two
  frames' x/y are unexplained literals in a committed fixture.
- **VALIDATE**: Task 6.4's gate.
- **SATISFIES**: AC #6.
- **REGENERATES**: none.

#### 6.4 ADD build-checks **group 36 — the package round trip**

- **IMPLEMENT**: apply the committed `ops.jsonl` through the real applier and assert it reproduces
  **the frames `canvas.json` references**. The `gen-replay` drift pattern.
- **PATTERN**: group 16 (`tooling/build-checks.mjs:3504-3700`), and specifically its **mutation**
  (:3564-3574), which is the load-bearing half:
  ```js
  const corrupted = JSON.parse(artifactText);
  const firstAdd = corrupted.ops.find((o) => o.op === "place.add");
  firstAdd.params.label = `${firstAdd.params.label} (corrupted)`;
  ok(deep(playAll(mutatedBuilt.beats)) !== deep(committedBoard),
    "a corrupted op label still reproduced the committed board — the comparison in case 2 is vacuous");
  ```
- **IMPLEMENT** the byte-identical reload too: `loadBuild` then `saveBuild` into a scratch dir, and
  compare **bytes**, not parsed objects.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build build package"` → `✓`.
- **REDDENS**: corrupt the `why` on the committed `screen.compose` line — the reproduce compare must
  fail. Then corrupt only a **position** in `canvas.json` — the frame-set compare must **still pass**
  (positions are not derivable from ops), which is what proves the gate is asserting the right thing
  rather than file equality.
- **SATISFIES**: AC #6, AC #2.
- **REGENERATES**: the group-count prose — Task 10.2.

#### 6.5 DRIVE the spine on `studio.html` and commit

- **IMPLEMENT**: the spine renders on the canvas with the dock's one-click pack switch working on
  both frames, and the arrow from the button to the error frame.
- **GOTCHA**: `studio.html` is the harness until #306 ships `canvas.html`. Its prose (rewritten in
  Task 1.6) should say so.
- **VALIDATE**: `npx serve .`, open `/studio.html`, switch packs, confirm both frames re-skin.
- **COMMIT**: `feat(canvas): MVP 14's spine — one frame, one stack, one state, one arrow, saved and reloaded (#302)`

---

### Phase 7 — the generators

#### 7.1 REGENERATE `loc-summary` and record the new figures

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs`
- **GOTCHA**: it counts **git-tracked** content and drift-checks against **git's index blob**
  (`git show :<path>`), not the working tree (`agent-layer/gen-loc-summary.mjs:44` — "so a parallel
  ticket's uncommitted edits in the shared worktree silently poison the artifact"). So
  `--check` **before staging is a false "no drift"**. Stage first, then check.
- **GOTCHA**: the runtime group goes **76 → 78 files** (two new `system/*.mjs`), and
  `approach.html:277` renders `runtime.files` as an **exact integer** while :279 renders
  `linesApprox` rounded to 100. The files count changes visibly regardless of how the line delta
  rounds → **approach ×2 baselines churn** (Phase 9). `portal/lib/canvas-store.mjs` matches no group
  and changes nothing.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` (after staging) → `no drift`.
- **SATISFIES**: AC #9.
- **REGENERATES**: `system/loc-summary.json`; cascades to approach ×2.

#### 7.2 UPDATE `param-manifest.json` and regenerate `param-count`

- **IMPLEMENT**: add an entry per genuinely new live control on `/factory`. Entry shape is
  `{page, selector, label, note?}`, `(page, selector)` unique
  (`agent-layer/gen-param-count.mjs:34-41` throws on a missing/blank field or a duplicate pair).
- **GOTCHA**: the counting rules ($description) make a **button row one control**, and `/factory`'s
  46 entries already include "canvas zoom controls (out / in / fit / reset = one row)", "canvas pan
  surface", "per-block move handle (drag, click-move-click, or Enter + arrows = one per-item verb)",
  "frame resize handle" and "marquee multi-select". **Continuous zoom and nudge modify existing
  entries rather than adding any.** The expected delta is **+1** — the align/distribute row —
  giving `/factory` 47 and a total of 121. Derive it from the manifest; do not write 121 in and hope.
- **GOTCHA**: `approach.html` renders the **total**, so this churns approach ×2 as well (already
  churning from 7.1).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check`
- **SATISFIES**: AC #9.
- **REGENERATES**: `system/param-count.json`; cascades to approach ×2.

#### 7.3 REGENERATE the vocabulary and the handoff pack — **the cascade the ticket does not name**

- **IMPLEMENT**: `node agent-layer/gen-vocabulary.mjs && node agent-layer/gen-handoff.mjs`
- **GOTCHA**: `agent-layer/gen-vocabulary.mjs:100` carries the composition shape string:
  ```js
  shape: "a composition is one node or an array of nodes; a node is {name, props, children?}",
  ```
  Task 4.4's optional `id` key makes that sentence false, so it changes → `handoff/verdant/vocabulary.json`
  changes → `tooling/drift-check.mjs:120-133` runs `genHandoff` + `genVocabulary` and asserts
  `git status --porcelain -- handoff/` is **clean**. Skip this and CI `verify` reds on a leg that
  looks unrelated to the canvas.
- **GOTCHA**: bump `composition.version` 2 → 3 in the same edit. Nothing reads it programmatically
  (verified by grep) — it is descriptive, which is exactly why it must be accurate.
- **GOTCHA**: **`/components` does NOT churn.** `system/catalog.mjs` renders the component count and
  per-component API tables out of `vocabulary.json`; nothing on that page renders
  `composition.shape`. Verified. Do not regenerate its baselines.
- **GOTCHA**: **no token work.** No `tokens.source.json` edit, so no `gen-token-css`. S2 named
  `--spacing-none`; #301 decided against it.
- **VALIDATE**: `node tooling/drift-check.mjs` → green, handoff leg included.
- **SATISFIES**: AC #9.
- **REGENERATES**: `handoff/verdant/**`.

#### 7.4 CONFIRM what does NOT regenerate

- **IMPLEMENT**: nothing. Assert it, so the implementer does not chase two false cascades.
  - **`gen-system-graph`** — its inputs are the DTCG contract group, the `components.css` blocks and
    the three pack files (`agent-layer/gen-system-graph.mjs:1-24`). `studio.css` is **not** one.
  - **`agent-layer/build-instance.mjs`** — it copies `system/` **wholesale**
    (`cpSync(join(REPO_ROOT,"system"), …, {recursive:true})` at :458-460), so the two new
    `system/*.mjs` ride along with no edit. `instance-journey` still has to be **run** (AC #10).
- **VALIDATE**: `node tooling/drift-check.mjs` → the `system-graph` leg green with no regeneration.
- **REGENERATES**: none, by construction.

#### 7.5 CHECKPOINT and commit

- **VALIDATE**: `node tooling/drift-check.mjs` green except the `group-count` leg (Task 10.2 fixes it).
- **COMMIT**: `chore(generators): loc-summary, param-count, vocabulary and the handoff pack move with the swap (#302)`
---

### Phase 8 — the journeys, on three engines

`tooling/studio-journey.mjs` is 6,476 lines and carries **74 lines** matching the DoD's seven
symbols — but **101 lines** on the full grid vocabulary (adding `data-span-col`, `data-span-row`,
`data-zoom`, `clampSpan`, `footprint`, `MIN_SPAN`, `hitSlot`, `fitLevel`). **The DoD grep undercounts
this file by 27 lines.** `vt-verify.mjs` is 10 vs **13** the same way. Both observed. The ticket
compresses all of it to one clause ("coordinate assertions by selector become position assertions by
custom property"), which is not a spec. It is also the home of **Gate B**, which the ticket does not
mention at all.

**Two symbols never appear here at all**: `stepSlot` and `MAX_ROWS` — zero occurrences (observed).
Do not go looking for them.

**Three of the thirteen passes are untouched** (zero grid occurrences, verified by full read):
`teardownPass` (:3065-3234), `methodPass` (:3244-3664) and `docsPass` (:4543-4927). `methodPass`
computes its expectations through `draftBoard`/`quadrantFor` and compares **labels and order**,
never coordinates.

**Thirteen named passes**, observed: `factoryPass` (:1373) · `replayPass` (:1624) · `compilePass`
(:2227) · `flowPass` (:2441) · `keepPass` (:2623) · `teardownPass` (:3065) · `methodPass` (:3244) ·
`selectPass` (:3691) · `docsPass` (:4543) · `framesPass` (:4937) · `layersPass` (:5383) ·
`minimapPass` (:5697) · `perfPass` (:5975). CLI: `process.argv[2] || "all"` (:85), engines
`["chromium","firefox","webkit"]` (:84).

#### 8.1 FIX the driver's module-scope import first — it crashes before any pass runs

- **IMPLEMENT**: `tooling/studio-journey.mjs:94`:
  ```js
  const { MAX_COLS, ZOOM_LEVELS, ZOOM_REST } = await import(new URL("../system/studio-canvas.mjs", import.meta.url));
  ```
  This is a **top-level await at module scope**, exactly the trap `build-checks.mjs:218-219` sets.
  With the exports gone, the driver dies before printing a single row.
- **PATTERN**: the line's own comment states the discipline that must survive —
  *"Imported from the shipped module, never retyped — moving a cap or a level fails this driver
  instead of drifting past it."* The driver imports **eight** shipped modules this way (:94-110:
  `studio-canvas`, `breadboard`, `build-questions`, `build-share`, `studio-select`, `studio-docs`,
  `studio-frames`, and #221's two). **Keep the discipline, change the symbols** — import whatever
  `studio-canvas.mjs` now exports for the driver to compute expectations from, never a literal.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium 2>&1 | head -5` → it starts and prints rows.
- **SATISFIES**: AC #10.
- **REGENERATES**: none.

#### 8.2 REWRITE **Gate B** — the running-page `inlineStyled` assertions

- **IMPLEMENT**: nine sites, observed:
  | Line | What it does |
  |---|---|
  | `:196` | `inlineStyled: [...slots, stage, scroll].filter((n) => n.hasAttribute("style")).length` — inside `snapshot()` |
  | `:209` | `styled: node.hasAttribute("style")` — inside `viaSeam()` |
  | `:384` | asserted `rest.inlineStyled === 0` **at rest** |
  | `:1256` | asserted `afterMoves.inlineStyled === 0` **after a drag, an undo and a redo** (R11) |
  | `:1499` | after a move (#206) |
  | `:1694` | after the replay driver settles (#209) |
  | `:2280` | the compile-beat swap's `styled:` field |
  | `:2910` | #210's keep rail |
  | `:3827` | a five-selector sweep: `.stx-stage, .stx-scroll, .stx-slot, .stx-guide, .stx-menu` |
  | `:4987` | per-node `styled:` field in #219's resize fixture |
- **GOTCHA — this is the omission that most likely breaks the PR late.** Both
  `system/studio-verbs.mjs:504-507` and `system/studio.mjs:50-51` name this gate in their own
  headers and say **"Both halves matter"** — build-checks group 7 is the *source* half, this is the
  *running-page* half. `setPos` writes a style attribute, so **every one of these goes red**, and
  they go red in Phase 8, after eight phases of work. Re-pin them together with Task 2.3, not after
  it.
- **IMPLEMENT the new predicate**: the honest running-page claim is no longer "zero style
  attributes" but **"every style attribute carries only `--x`, `--y`, `--w` or `--stx-scale`, and
  nothing else"**. Parse the attribute, not its presence. That keeps the property the gate was built
  for — catching someone reaching for `node.style.transform = …` — which "allow a style attribute on
  a slot" would throw away.
- **GOTCHA**: `:1256`'s R11 row exists because undo/redo travel is `element.animate()`, which
  **never touches `.style`**. That is still true and still worth asserting: after an undo and a redo,
  the style attribute must carry the same four properties and **no** `transform` written directly.
- **VALIDATE**: `node tooling/studio-journey.mjs all 2>&1 | grep -i "style"` → every row green.
- **REDDENS**: add `node.style.transform = "translate(1px,1px)"` to `system/studio-verbs.mjs`'s
  restore path and re-run — the R11 row at :1256 must fail naming `transform`. If it passes, the new
  predicate is checking presence again rather than content.
- **SATISFIES**: AC #8, AC #10.
- **REGENERATES**: none.

#### 8.3 REWRITE the coordinate assertions, pass by pass

- **IMPLEMENT — rewrite the HELPERS, not the call sites.** The 101 lines split three ways, and only
  the third is line-by-line work:
  - **Helper definitions** — a dozen small readers that every downstream assertion is built from.
    **Most of their consumers contain no grid-symbol string at all and are invisible to grep**, so
    rewriting the helper is the actual task. Observed, with their scope:
    | Helper | Line | Reads | Consumers |
    |---|---|---|---|
    | `snapshot()`'s `zoom:` | :181 | `data-zoom` | 17+ in `journey()` alone (`rest`, `zin`, `fitted`, `kfit`, `bare`, `panned`, `afterMoves`, …) |
    | `viaSeam()` | :209 | `data-col`, `data-row`, `style` | :570-596, :1294 |
    | `cellPoint()` | :256-266 | three reference cells by `[data-col][data-row]` | the geometry engine behind every pointer-drag target in `journey()` |
    | `idAt()` | :271 | `[data-col][data-row]` → `data-stx-id` | `hitCase()`, `keepPass:2722` |
    | `slotsNow()` | :3723-3724 | `data-col`, `data-row` | dozens across `selectPass` §1-12 |
    | `cell()` | :3738 | `[data-col="cc"][data-row="1"]` | every marquee/drag point in `selectPass` |
    | `guidesHonest()` | :3978-3986 | guides, peers and carried, all by col/row | the AC #3 guide-honesty drill |
    | `openAt()` | :4180 | menu `data-col` | ×3 (`flipped`, `unflipped`, `interior`) |
    | `frameState()` / `spanOf()` | :4973-4974, :4992-4993 | `data-col/row`, `data-span-col/row` | the whole resize-parity section |
    | `movables()` | :5408-5411 | same four | `wraps1`…`wraps5` in `layersPass` |
    | `metricsOf()` / `wrapGeo` | :5730, :5765-5766 | `data-zoom` + the four | every `sameRect()` in `minimapPass` |
  - **Coordinate-shaped assertions** — a `t()` whose condition compares a col/row/span/zoom value.
    These become custom-property comparisons.
  - **Behavioural** — movement happened, focus landed, an announcement fired, a keyboard path
    completed. These survive with a different read and **their assertions must not change**.
- **GOTCHA — two cases are coordinate-dependent but grep-invisible. Neither is in any inventory.**
  1. **`journey()`'s R3 FLIP-travel case (:993-1052).** Its `t()`s compare pixel rects, so no grid
     symbol appears in them — but its entire reason for existing is the `÷ ZOOM_LEVELS[level]`
     divide (its own comments at :993 and :1011 say so: *"the sole detector of a missing
     `÷ ZOOM_LEVELS[level]`"*). Continuous `--stx-scale` removes that divide. **Review this case
     explicitly or it will silently stop detecting anything.**
  2. **`perfPass`'s drag row (:6042-6046)** computes its drop point from
     `getComputedStyle(stage).gridTemplateRows`. With no grid template there are no tracks.
- **GOTCHA**: `settleWait(p, timeout = 30000)` (:151-172, **22 callers**) reads `data-studio`,
  `data-replay`, `.stu-replay-seek` and `.stu-replay-card` — **no grid attribute at all, so it needs
  no change.** #416 / PR #418 gave it the property that a timeout names the state it died in; leave
  it alone. Do not confuse it with `compilePass`'s own local `const settled = (page, want) => …` at
  :2283, which checks `data-compile-state` and is a different thing.
- **GOTCHA**: `tooling/inp-observer.mjs` is coordinate-agnostic (pure Event Timing instrumentation)
  and **needs no changes**.
- **GOTCHA — three `system/` pure functions gate what three passes can assert.**
  `studio-minimap.mjs`'s `mapView`/`jumpFrom`/`cellRect`/`visibleRange`, `studio-layers.mjs`'s
  `layerEntries`, and `studio-select.mjs`'s `idsInRange`/`marqueeRange` are imported by the driver
  (:103, :112-113) and called with values read straight off `data-col`/`data-row`/`data-span-*`.
  **Their new signatures decide what `minimapPass`, `layersPass` and `selectPass` can say.** Settle
  the signatures in Tasks 1.4 / 2.5 / 2.7 before rewriting these three passes.
- **GOTCHA — a documentation oddity you will trip over.** `perfPass`'s header comment is **split in
  two**, at :3666-3673 and :4513-4520, wrapping around `selectPass`'s entire 800-line body.
  `perfPass` itself (:5975) has no header above it. Do not conclude it is undocumented.
- **GOTCHA**: the driver's whole design is **compute the expectation in Node from the page's own
  pure functions**, never a literal — :94's comment, :96-97's (`draftBoard`), :102-103's
  (`idsInRange`, `marqueeRange`), :107-110's (`DOCS_SOURCES`, `FRAMES`). `selectPass` computes every
  expected id set through `marqueeRange` + `idsInRange`; `framesPass` reads `FRAMES`. **Keep that.**
  The moment a rewritten assertion hard-codes an x value, the driver stops being able to catch a
  layout that silently stopped being the rank layout's.
- **GOTCHA**: `factoryPass`'s and `replayPass`'s "byte-identical settled stage on a second load"
  assertions are **determinism** proofs for the rank layout. They are behavioural, they survive, and
  they are the cheapest proof that BFS ordering is stable.
- **VALIDATE**: `node tooling/studio-journey.mjs all` → every pass green on three engines.
- **REDDENS**: swap two `connect` entries in the committed board fixture so the rank changes — the
  position assertions must fail naming the frame that moved. (Same mutation as Task 2.4's, one layer
  up; if the driver stays green while build-checks goes red, the driver is asserting against its own
  output.)
- **SATISFIES**: AC #4, AC #10.
- **REGENERATES**: none.

#### 8.4 RE-RUN the INP gate on the new substrate

- **IMPLEMENT**: `perfPass` (:5975), `BUDGET_MS = 200` (:5976). It injects
  `tooling/inp-observer.mjs`'s `OBSERVER_INIT` via `ctx.addInitScript` (:5992), reads
  `window.__studioINP` (:5988-5989), asserts **26 enumerated interactions** ≤ 200 ms per engine,
  prints the observer's 16 ms floor honestly as "< 16 ms", re-measures one over-budget row **once**
  on a fresh page with both numbers printed, and proves the comparator itself can flag with a
  synthetic 250 ms interaction (:6337). The 4×-CDP-throttled drag sample and the
  long-animation-frame histogram are **chromium-only by definition** and the driver says so.
- **GOTCHA — the calibration click is the thing that makes the whole pass non-vacuous.** :6015:
  *"INP · the observer pipeline is ALIVE on `${engineName}` — a forced-slow click yields a grouped
  entry."* Without it, "no entry ⇒ latency < 16 ms ≤ 200" is indistinguishable from "the observer
  never attached". **Keep it, on every engine.** This is #423's G3 shape, already solved here —
  do not lose it in the rewrite.
- **GOTCHA**: the 26-row list is **enumerated, not exhaustive** (the driver's own bounds line says
  so, and #212's flow navigation is already missing from it). New verbs — nudge, align, distribute,
  multi-select move — should join the list. Say in the bounds line which ones you added and which
  you did not.
- **GOTCHA**: S1's 56.0 ms worst drag INP is a **floor**, measured on a harness with no selection,
  verbs, layers, minimap or undo attached. Against a 200 ms budget that is ~144 ms of headroom for
  everything this PR adds. Generous, but headroom is not a result — **if a row misses, the first
  thing to try is S1's own named mitigation (coalescing the scale write to one rAF), not a new
  spike.**
- **GOTCHA**: **T2's zoom sweep carries no INP row at all** — its gesture is a wheel, which the
  Event Timing API does not report as an interaction. That is exactly why S1 called T2 the open
  edge. If you want the zoom's cost gated, it has to be the rAF-gap/frames-over-33ms sample
  (chromium-only), not an INP row. Do not add an INP row for zoom and call T2 covered.
- **VALIDATE**: `node tooling/studio-journey.mjs all 2>&1 | grep "^  INP"` → every row inside budget,
  on three engines.
- **REDDENS**: the pass already carries its own — :6337's synthetic 250 ms interaction must be
  flagged as a violation. Confirm that row is still present and still passing after the rewrite.
- **SATISFIES**: AC #10.
- **REGENERATES**: none.

#### 8.5 REWRITE `tooling/vt-verify.mjs`'s coordinate assertions

- **IMPLEMENT**: **13** lines (10 on the DoD's seven symbols). **The brief's citation is wrong** —
  `vt-verify.mjs:303-307` is the tail of a comment plus the head of `canvasState()`. The
  `querySelector(".stx-slot") → place(node) → read data-col` pattern is **`movePlace()` at
  :326-330**, observed:
  ```js
  const movePlace = () => cp.evaluate(() => import("/system/studio-canvas.mjs").then((m) => {
    const c = m.getCanvas();
    const node = c.stage.querySelector(".stx-slot");
    c.place(node, { col: Number(node.getAttribute("data-col")) === 6 ? 2 : 6, row: 4, name: "vt probe" });
  }));
  ```
  The read becomes a custom-property read; the **assertion** — zero `::view-transition-*` pseudos
  **after proving the movement happened** — does not change.
- **GOTCHA — every hit in this file is a movement PRECONDITION, never the claim.** `vt-verify.mjs`
  imports **no** `studio-canvas.mjs` constant at all (no `MAX_COLS`, no `ZOOM_LEVELS`, no
  `clampSlot`, no `fitLevel`); all 13 lines are `data-col`, `data-row` or `data-zoom` reads whose
  only job is to prove something moved before "zero transitions opened" is asserted. So there is no
  behavioural/coordinate split here: **all 13 are fixture code, and all 13 must be rewritten.** The
  13 lines: :309, :320, :322, :324, :326-330 (`movePlace`), :367, :403, :410, :412, :416, :419,
  :437, :609.
- **GOTCHA**: the order is the assertion. `vt-verify` "asserts zero `::view-transition-*` pseudos
  AFTER proving the movement happened" (`studio-canvas.mjs:27-30`). A rewrite that asserts zero
  pseudos without first proving movement is a check that cannot fail.
- **GOTCHA**: its factory block samples **after** the #209/#240 take-over handover and #210's
  keep-rail clicks, "because zero at rest says nothing about a chain that runs afterwards"
  (gates.md:156). Keep the sampling point.
- **GOTCHA**: home opens **two** transitions at load and they are not a morph wrapper's —
  `spine.mjs:147,149`'s hero re-skin and revert run through their own `crossfade()` (#72). Load is an
  **expected count**, not an assumed zero.
- **VALIDATE**: `node tooling/vt-verify.mjs` → green; `node tooling/vt-stack-audit.mjs` → clean.
- **SATISFIES**: AC #10.
- **REGENERATES**: none.

#### 8.6 RUN `catalog-journey` and `instance-journey`

- **IMPLEMENT**: `node tooling/catalog-journey.mjs all` (the renderer changed — Task 4.4) and
  `node tooling/instance-journey.mjs chromium --dir <built dir>` (the built instance carries the new
  substrate).
- **GOTCHA**: `instance-journey` asserts "the stage's place count equals the SERVED board file's",
  fetched through the page's own `INSTANCE_CONFIG → artifact → source.board` chain, **never a
  literal** — so the rank layout has to work in a built instance too. It also asserts **zero non-2xx
  responses across the whole visit, main-frame-scoped**; two new `system/*.mjs` files ride the
  wholesale `system/` copy (verified) so nothing 404s, but run it rather than assuming.
- **GOTCHA**: `--dir` skips the build and reuses an existing deploy dir; the wrangler-stdout row is
  skipped in that mode and says so. The fixture is `tooling/fixtures/harborlight/brief.md` —
  deliberately **not** the committed demo company, because the residue greps discriminate on the
  demo name.
- **GOTCHA**: `--out` for a real build **must be outside the repo** (CLAUDE.md § Commands).
- **VALIDATE**: both drivers green; `instance-journey`'s zero-404 row green.
- **SATISFIES**: AC #10.
- **REGENERATES**: none.

#### 8.7 CHECKPOINT and commit

- **VALIDATE**: all three drivers green on three engines; `vt-verify` green; `vt-stack-audit` clean.
- **COMMIT**: `test(tooling): the journey drivers read positions instead of coordinates, and the running-page write gate names its four properties (#302)`
---

### Phase 9 — baselines, last, from a clean detached worktree

#### 9.1 ADD `verdant` to the pixel gate's `PACKS`

- **IMPLEMENT**: `tooling/visual-regression/visual.spec.mjs:145`, one line:
  ```js
  const PACKS = { neutral: null, saulera: path.join(REPO, 'system/tokens.saulera.css') };
  // becomes
  const PACKS = { neutral: null, saulera: path.join(REPO, 'system/tokens.saulera.css'), verdant: path.join(REPO, 'system/tokens.verdant.css') };
  ```
- **GOTCHA**: `system/tokens.verdant.css` **already exists** (generated by
  `agent-layer/gen-pack-css.mjs --verdant`). No pack authoring, no token work.
- **GOTCHA**: the swap mechanism is a route intercept —
  `page.route('**/system/tokens.neutral.css', route => route.fulfill({ path: packPath }))` (:167) —
  registered *after* `beforeEach` so it runs first (last-registered-first). Nothing else changes.
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test --list | wc -l` → 33 tests
  (11 pages × 3 packs), up from 22.
- **SATISFIES**: AC #11.
- **REGENERATES**: 11 new PNGs.

#### 9.2 REGENERATE the baselines — **15 PNGs written, 33 files after**

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`, **from a clean detached
  worktree under `/Users`**.
- **The arithmetic, derived** (today: `ls tooling/visual-regression/baselines | wc -l` = **22** =
  11 pages × 2 packs, observed):
  | | Count | Why |
  |---|---|---|
  | New, verdant | **11** | every VR page gains a third pack (G14) |
  | Regenerated, factory | **2** | neutral + saulera; the substrate and the rank layout change `/factory` at rest |
  | Regenerated, approach | **2** | neutral + saulera; `runtime.files` 76 → 78 and the param total 120 → 121 are rendered text |
  | **Written this PR** | **15** | |
  | **Baseline files after** | **33** | 11 × 3 |
  The ticket says "~10 PNGs" for verdant (DoD) and "~15 PNGs" (size estimate). **11 and 15** are the
  observed figures; both ticket numbers are approximations of these.
- **GOTCHA**: `update:docker` screenshots the **dirty working tree**, so run it from a clean detached
  worktree — **under `/Users`, not `/private/tmp`** (Docker file sharing).
- **GOTCHA**: `update:docker` **skips** a baseline whose only change is below pixelmatch's per-pixel
  threshold. `rm` the PNG to force it when a sub-perceptual change is the point.
- **GOTCHA**: `maxDiffPixels: 100` swallows a few changed digits, so a green update run is **not**
  proof a page did not change. **Read the diff images for `approach`**, which renders numbers.
- **GOTCHA**: the gate captures under **no-preference** — its `reducedMotion: 'reduce'` is a no-op.
  A new at-rest control gated only by a JS `matchMedia('reduce')` check **will** churn.
- **GOTCHA**: `approach` can fail "two consecutive stable screenshots" from its live `countUp` under
  `retries: 0`. A **different pack failing each run** is the flake signature, not a regression.
- **GOTCHA**: a local macOS run with ~16 failures is the platform, not a regression — the baselines
  are Linux. Trust `gh pr checks`, not the local run.
- **GOTCHA**: `/factory`'s **verdant** baseline will show the proto iframes in **their own** pack —
  custom properties do not cross document boundaries (#268, closed as a recorded limitation).
  **Expected, not a defect.** Say so in the PR body so a reviewer does not file it.
- **GOTCHA**: `/factory` waits on `[data-studio="ready"]`, `[data-replay="settled"]` and
  `[data-studio-frames="ready"]` and masks `[data-studio-canvas] .stx-frame iframe`
  (`visual.spec.mjs:` the factory entry). **Keep those handles or rename them in the spec in the same
  commit** — a renamed handle deadlocks the gate to timeout rather than failing.
- **GOTCHA**: a sibling session's `serve.mjs` may hold port 4757 serving **its** tree for days.
  `curl` an edited file before trusting any run.
- **GOTCHA — concurrency.** Nothing else may regenerate `/factory`'s or `approach`'s baselines while
  this PR is open. #303 (`list` through the chain) may run alongside — it touches `/components` only.
- **VALIDATE**: `ls tooling/visual-regression/baselines | wc -l` → **33**; `git status --short
  tooling/visual-regression/baselines` → 15 changed/added.
- **SATISFIES**: AC #11.
- **REGENERATES**: this **is** the regeneration.

#### 9.3 COMMIT the baselines

- **COMMIT**: `chore(visual): verdant enters the pixel gate and /factory + approach re-baseline on the new substrate (#302)`

---

### Phase 10 — the prose

#### 10.1 WRITE the `build/` section of `discovery/README.md`

- **IMPLEMENT**: precondition 4's second branch. **Verified: `discovery/README.md` has no `build/`
  section and no literal `build/` string anywhere**, and `discovery/faster-payment/` has no `build/`
  folder. #281 is closed but wrote neither — its two mentions in the README (:3, :70) are about
  `ops.mjs`, not a package folder.
- **PATTERN**: model it on the existing § "File shapes" (:263) and § "Files" (:65). The README's 20
  section headers are the shape to slot into.
- **IMPLEMENT** the section's content: the `build/` folder's files (`ops.jsonl` the truth,
  `canvas.json` the arrangement, and the `groups/`, `proposals/`, `imports/` siblings the
  architecture names as later), the `ops.jsonl` line shape
  (`{seq, at, source: owner|agent, op, params, status: applied|proposed|accepted|refused|undone, fromStep?}`),
  the rule that **positions are never on a line**, the rule that **undo appends an `undone` line
  rather than deleting one** (G26), the `canvas.json` dialect note (**D-b**), and **how the committed
  spine package was produced**, so a reader can reproduce the gate's fixture.
- **GOTCHA**: the two must not both create the section — #281 is merged and did not, so there is no
  collision left to avoid.
- **VALIDATE**: `grep -n "^## " discovery/README.md | grep -i build` → one new row.
- **SATISFIES**: AC #12.
- **REGENERATES**: none.

#### 10.2 MOVE the group count — **five prose copies, only four are gated**

- **IMPLEMENT**: two new groups → **37 `group()` calls, 36 distinct names** (`DUPES = ["parenting"]`
  stays 1). Update:
  | # | Where | Today | Gated by drift-check? |
  |---|---|---|---|
  | 1 | `tooling/build-checks.mjs:10668` `"all 34 groups pass"` | 34 | **yes** — `/all (\d+) groups pass/` |
  | 2 | `CLAUDE.md:110` `34 PURE groups` | 34 | **yes** — `/(\d+) PURE groups/` |
  | 3 | `CLAUDE.md:178` `build-checks' 34 groups` | 34 | **yes** — `/build-checks' (\d+) groups/` |
  | 4 | `.claude/references/gates.md:11` `34 pure groups` | 34 | **yes** — `/(\d+) pure groups/` |
  | 5 | `tooling/build-checks.mjs:4` **"Thirty-four groups"** | 34 | **NO** — spelled out; the regex cannot see it |
- **GOTCHA**: copy 5 is the one that goes stale silently. Verified: `/all (\d+) groups pass/` matches
  only `34` at :10668, and `/Thirty-four groups/` is true at :4. Fix it in the same edit.
- **GOTCHA**: `checkGroupCount()` (`tooling/drift-check.mjs:169-192`) also asserts
  `calls.length - DUPES.length === distinctNames`. Two new groups with two new distinct names keeps
  that identity; **reusing an existing name would break it**, which is deliberate — that is the leg
  that catches a group hiding behind an existing name.
- **GOTCHA**: `.claude/references/gates.md` needs more than its count — add a paragraph per new group
  saying what it owns **and what it states it cannot reach**, the file's own convention. Remember
  a "cannot reach" clause lives in up to three places (gates.md, the `group()` detail string, a
  fixture header) — write it in all of them or none.
- **VALIDATE**: `node tooling/drift-check.mjs` → the `group-count` leg green;
  `node tooling/build-checks.mjs` → `build ✓  all 36 groups pass`.
- **REDDENS**: set `CLAUDE.md:110` back to 34 → `drift-check` must fail naming that file and both
  numbers.
- **SATISFIES**: AC #9, AC #12.
- **REGENERATES**: none.

#### 10.3 UPDATE CLAUDE.md's three index rows

- **IMPLEMENT**: the ticket names them. Observed today:
  | Line | Today |
  |---|---|
  | `CLAUDE.md:38` | `studio-canvas.mjs   the canvas SUBSTRATE — native-scroll stage, zoom table, data-col/data-row` |
  | `CLAUDE.md:40` | `studio-verbs.mjs    the MANIPULATION verbs — move, resize, undo/redo, all through the bus` |
  | `CLAUDE.md:58` | `build-share.mjs     the whole build in the URL — codec + tamper battery` |
  Add index rows for `canvas-ops.mjs`, `device-presets.mjs` and `portal/lib/canvas-store.mjs`.
- **GOTCHA**: the map is an **INDEX, not a specification** (CLAUDE.md § Ground rules). Each row says
  what a file *is*; the invariant lives in the file's own header. Do not restate the substrate's
  rules here — that creates a second copy that drifts.
- **GOTCHA**: **do not touch** the "portal UI = a hash route in `portal.js`" rule. That amendment is
  #306's (`canvas.html` is the one module page), and the ticket says so explicitly.
- **VALIDATE**: read the three rows back; they describe the files as they now are.
- **SATISFIES**: AC #12.
- **REGENERATES**: none.

#### 10.4 FINAL CHECKPOINT — the definition of done, row by row

- **VALIDATE**, in this order:
  ```
  git grep -n "data-col\|data-row\|MAX_COLS\|MAX_ROWS\|clampSlot\|stepSlot\|ZOOM_LEVELS" -- system/ tooling/ '*.html'
                                            # → NOTHING. (435 before.)
  node tooling/build-checks.mjs             # → build ✓  all 36 groups pass
  node tooling/drift-check.mjs              # → all legs green
  node tooling/token-lint.mjs               # → green (CI verify's third step)
  git status --short                        # → nothing unexpected staged
  ```
- **COMMIT**: `docs: the build/ package format, the group count, and three index rows follow the swap (#302)`
- **PR body**: must carry a `Closes #302` **trailer** — a title mentioning `(#302)` closes nothing.
  Include the plan, the report and the review in the same PR
  (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).
---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-check** — do not hunt for one. "Tested" means
the gate stack ran. `.claude/references/gates.md` is the map; the one CI addition is CodeQL, which
is settled and out of scope here.

### The pure layer — `tooling/build-checks.mjs`

Nine groups rewritten or cut, two added (35 `canvas ops`, 36 `build package`). The file is **entirely
pure Node** — it imports the shipped modules directly and opens no browser (verified: zero
Playwright/Puppeteer references). Since #301 it carries a **minimal DOM stub** at `:325-337`
(`createElement`, `createElementNS`, `createTextNode`, `createDocumentFragment`, `setAttribute`,
`textContent`, `appendChild`, `baseURI`) for the two view-time functions it drives —
`renderMarkdown` and `renderComposition` over a `stack`/`text` tree. **`setPos` is reachable through
that stub**; anything needing layout is not, and belongs to a journey driver.

### The running page — the journey drivers

`studio-journey all` (rewritten), `catalog-journey`, `instance-journey` on a built dir, plus
`vt-verify` and `vt-stack-audit`. All drive chromium + firefox + webkit, Playwright resolved out of
`tooling/visual-regression/node_modules`, never a repo dependency. **They exist because the pixel
gate never interacts**, so it cannot tell a live control from a dead one.

### The pixel layer

11 pages × 3 packs after this PR. It masks iframe content, captures under no-preference, and
`update:docker` re-baselines from the same tree — so it cannot catch a regression you introduce and
re-baseline in one go. That is why `vt-stack-audit` exists and why Task 3.4 runs it.

### Edge cases that must be covered

- **A cycle in the board's connections.** `replay/build-northwind-restock.board.json` has one
  (`p2a2 → p1`). BFS without a visited set does not terminate.
- **An empty board / junk board.** `arrangeBoard` is total by contract — `[]`, never a throw. Group
  14 drives nine junk boards.
- **A non-finite position.** `setPos(el, NaN, 0, 200)` must not write `--x: NaN` — the whole
  `transform` declaration drops silently and the node renders at 0,0, which reads as a layout bug.
- **A zero content dimension at `fit()` time.** The old `fitLevel` answered `ZOOM_REST` because "the
  honest reading of 'I cannot measure this' is 'leave it at 1', never Infinity". Keep that answer.
- **A `screen.compose` with `why: ""`** — refused, not just `why: undefined`.
- **A dangling override** — flagged and shown, never dropped.
- **A base-part delete while a state overrides it** — refused.
- **A `v: 2` payload, and a `v: 3` payload carrying `g`** — both refused, each with its own message.
- **A v1 payload** — still round-trips byte-identically (five frozen fixtures, one captured from a
  real browser).
- **An align/distribute over N nodes** — **one** announcement, not N (the live-region coalescing
  trap; `replay-driver.mjs:577-611`'s `drainActs` is the precedent).
- **`scrollend` on WebKit** — S1 observed **31/40**, not 40/40. Any assertion must not demand every
  pan fire one.
- **Pointer coalescing** — S1 observed that Playwright cannot deliver pointermoves faster than the
  frame rate on Chromium and Firefox. **An assertion that coalescing engaged cannot fire on two of
  three engines.** Do not write one.

### Proving the checks

Every check this plan adds carries its REDDENS mutation and one positive control. **Run the
mutation, see the red, revert, see the green — and record both in the report.** A check that passes
because it never reached the thing it tested is this repo's largest class of process-review finding
(59 of 229), and a nine-group rewrite is exactly where it recurs.

Three shapes to avoid by name, from **#423** (S1's own driver, filed as the follow-up this PR
inherits):

- **G1 — a predicate that is true before the action.** `movedAll` tested `--x > 0` on five frames
  whose x values were 40, 407, 714, 1081, 1388 **before** the drag. It held whether the handler moved
  five frames, one, or none. **Capture before and after, per node, and compare.**
- **G2 — a printed cell no assertion stands behind.** The @0.5 drag printed INP and LoAF and gated
  neither. **Every number this PR reports in a gate must have an `ok()` behind it.**
- **G3 — a floor that guards one block in five.** `max: gaps[gaps.length - 1] ?? 0` reports `0` for
  an empty window, indistinguishable from a clean one. **Guard every measurement block with a
  minimum frame count, not just the first.**

---

## VALIDATION COMMANDS

Execute every command. Levels 1–3 are CI's own; 4–5 are operator-run and this PR needs all of them.

### Level 1: syntax and drift (CI `verify`, steps 1–2)

```bash
node tooling/drift-check.mjs      # syntax · token-css · annotated-source · loc-summary · param-count ·
                                  # system-graph · inspect-data · inspect-mounts · handoff · scenarios ·
                                  # traces · replay · group-count
node tooling/token-lint.mjs
```
`drift-check`'s syntax leg runs `node --check` over **every tracked `.mjs`, including
`.claude/plans/`** — park any code fragment as `.txt`, never `.mjs`.

### Level 2: the pure gate (CI `verify`, step 3)

```bash
node tooling/build-checks.mjs     # expected after this PR: build ✓  all 36 groups pass
```
Observed before this PR on this tree: `build ✓  all 34 groups pass`, exit 0, 5.3 s.

**The SDK-free invariant is proven by CI's ABSENCE of `portal/node_modules`.** To reproduce that
locally — worth doing once, since this PR adds `portal/lib/canvas-store.mjs`:
```bash
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```

### Level 3: the pixel gate (CI `visual`)

```bash
cd tooling/visual-regression && npm run update:docker   # from a CLEAN DETACHED WORKTREE under /Users
ls tooling/visual-regression/baselines | wc -l          # → 33  (22 before)
```

### Level 4: the journey drivers (operator-run, three engines)

```bash
node tooling/visual-regression/serve.mjs &              # curl-verify the port first — a sibling
curl -s localhost:4757/system/studio.css | head -3      #   session may hold 4757 with ITS tree

node tooling/studio-journey.mjs all
node tooling/catalog-journey.mjs all
node tooling/vt-verify.mjs
node tooling/vt-stack-audit.mjs                         # BEFORE naming anything for a transition
node tooling/instance-journey.mjs chromium --dir <built-dir>
```
The built dir comes from the jobs folder:
`node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir outside the repo> …`, or
reuse an existing one with `--dir`. `instance-journey`'s own fixture is
`tooling/fixtures/harborlight/brief.md`.

### Level 5: by hand, on a real browser

```bash
npx serve .                       # then open /studio.html and /factory.html
```
The pixel gate's bundled Chromium has missed a real Safari/Chrome-stable grid blowout before
(PR #54). Eyeball the new substrate in a real browser, at two window sizes, in both themes.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| The whole PR | **£0 / $0 in tokens.** Nothing here runs an agent: the applier is pure, the spine's ops are the owner's, and there is no compose turn (that is #312). | — | — |
| `instance-journey` on a built dir | operator's hand (a build + three engines, ~10 min) | **yes** — DoD row 3 | — |
| The baseline regeneration | operator's hand (Docker, a clean detached worktree) | **yes** — DoD row 6 | — |
| The owner's verdict on whether `/factory` still "feels random" | **the owner's own hand** | no | the epic's close-out ticket; this PR must not write it |
| *(none outstanding — the two owner decisions, D-a and D-b, were taken 2026-09-18)* | — | — | — |

**Nothing in this PR spends a token or needs a credential.** That is unusual for this epic and worth
stating: the honesty contract's "never hand-write agent output" is not engaged here, because there
is no agent output — every op is the owner's, and `ops.jsonl` records it as `source: "owner"`.

---

## ACCEPTANCE CRITERIA

Each maps to a DoD row on #302. "Proven by" is the command, not a claim.

- [ ] **AC #1 — the grid is gone.**
  `git grep -n "data-col\|data-row\|MAX_COLS\|MAX_ROWS\|clampSlot\|stepSlot\|ZOOM_LEVELS" -- system/ tooling/ '*.html'`
  returns **nothing**. (435 lines across 15 files before.) Comments count.
- [ ] **AC #2 — the gate is green and every rewritten group was seen red.**
  `node tooling/build-checks.mjs` → `build ✓  all 36 groups pass`. The report names each of the nine
  touched groups with the mutation that reddened it and the observed failure message.
- [ ] **AC #3 — the substrate.** `setPos` and `setScale` are the only inline-style writers in the
  studio; `fit()` fits exactly; ⌘-wheel zooms to the cursor; the scroll extent is sized in the same
  write path; the scale write is coalesced to one per frame.
- [ ] **AC #4 — the rank layout.** Every committed `replay/*.json` plays on `/factory` under the rank
  layout with **no projection edited** (`git diff --stat replay/` is empty). Both copies of the old
  rule are gone.
- [ ] **AC #5 — `canvas-ops.mjs`.** Six ops; `PARAMS` exported and frozen at both levels; group 35
  iterates `OPS`; **a `screen.compose` without `why` is refused, proven by feeding it one** — and a
  `why: ""` too.
- [ ] **AC #6 — the package round trip.** The spine's package reloads **byte-identically**; group 36
  applies `ops.jsonl` and reproduces the frames `canvas.json` references, with the corrupted-op
  mutation proving the compare is not vacuous. The codec is `v: 3`; a `v: 2` payload carrying `g` is
  refused as "made with an older version".
- [ ] **AC #7 — the verbs and their announcements.** Nudge (floor `--spacing-xs` = 4 px), snap
  guides, multi-select move, align/distribute — each with a keyboard path and a reading-order
  announcement ("moved to 3 of 7" plus the nudge offset in px), **one announcement per gesture, not
  one per node**.
- [ ] **AC #8 — both write-site gates.** build-checks group 7 re-pinned **function-scoped** to
  `applyToStage` · `setPos` · `setScale`, **and** `tooling/studio-journey.mjs`'s nine running-page
  `inlineStyled` assertions rewritten to "every style attribute carries only `--x`/`--y`/`--w`/
  `--stx-scale`". Both proven able to fail.
- [ ] **AC #9 — the generated outputs move.** `node tooling/drift-check.mjs` green, all thirteen
  legs — which means `loc-summary`, `param-count`, `vocabulary`, the handoff pack and `group-count`
  all landed in this PR.
- [ ] **AC #10 — three engines.** `studio-journey all` · `catalog-journey all` · `instance-journey`
  on a built dir, green on chromium + firefox + webkit. The INP gate green on the new substrate.
- [ ] **AC #11 — baselines.** 33 files in `tooling/visual-regression/baselines`; 15 written this PR
  (11 new verdant, 4 regenerated). `/factory`'s verdant baseline showing the proto iframes in their
  own pack is **expected** (#268) and said so in the PR body.
- [ ] **AC #12 — the prose.** `discovery/README.md` has a `build/` section; CLAUDE.md's three index
  rows describe the files as they now are; the group count moved in **all five** places;
  `gates.md` gained a paragraph per new group including what it cannot reach. The
  "portal UI = a hash route" rule is **untouched**.
- [ ] **AC #13 — CI.** `gh pr checks` green on `verify` and `visual`. The PR body carries a
  `Closes #302` **trailer**, and the plan, report and review are in the same PR.
---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; one commit per phase, each with the `Closes`-free per-phase
      message and the `Co-Authored-By` trailer.
- [ ] Each task's VALIDATE ran and its output is in the report.
- [ ] **Every REDDENS mutation ran, reddened, was reverted, and greened** — recorded in the report
      as a table: task · mutation · observed failure message.
- [ ] `node tooling/build-checks.mjs` → `all 36 groups pass`.
- [ ] `node tooling/drift-check.mjs` → thirteen legs green.
- [ ] `node tooling/token-lint.mjs` → green.
- [ ] Three journey drivers green on three engines; the INP gate green.
- [ ] `vt-verify` green; `vt-stack-audit` clean.
- [ ] 33 baselines; 15 written; `gh pr checks` green on `verify` and `visual`.
- [ ] The DoD grep returns nothing.
- [ ] The report's **Not run** section names anything from the paid/owner-only table that did not run,
      with its tracker.
- [ ] `Closes #302` in the PR **body**.

---

## DECISIONS TAKEN / ASSUMPTIONS

**Nothing in this plan is left open.** The four questions the first pass raised were settled before
the plan was finished — two by the owner (2026-09-18), two by measuring the code. They are recorded
here as decisions, with their reasons, so a later reader can see what was chosen and why rather than
re-deriving it.

**D-a · The spine's `ops.jsonl` is produced by a one-off script, and the script goes in the report.**
*(Owner, 2026-09-18.)* Type the six owner ops, apply them through the real `applyOps`, and let
`canvas-store.saveBuild` write both files. Nothing new is tracked. This is honest under the honesty
contract because the ops **are** the owner's — `source: "owner"` — which is exactly the posture
`tooling/board-op.mjs` exists to serve; the contract forbids hand-writing *agent* output, and there
is no agent in this PR. **The script's text goes in the report verbatim**, so the gate's fixture is
reproducible by someone who was not here. Rejected: a committed `tooling/canvas-op.mjs` CLI (an
unnamed tracked file in a one-way-door PR, which #306's live page may then retire) and teaching
`studio-journey.mjs` to write (it only reads today, at :122, and remaking the fixture would mean a
three-engine run). → Task 6.2.

**D-b · `canvas.json` keeps the architecture's shape and says plainly that it is not JSON Canvas.**
*(Owner, 2026-09-18.)* Observed against the spec (fetched 2026-09-18): a JSON Canvas 1.0 node
requires `id`·`type`·`x`·`y`·`width`·`height` with `type` ∈ `text|file|link|group`, and an edge is
`id`·`fromNode`·`toNode` with optional `fromSide`/`toSide`/`fromEnd`/`toEnd`/`color`/`label`. Ours
invents four node types, makes `height` optional, adds `ref`, and replaces `label` with `relation`.
**A conformant reader refuses it, and the file must say so in its own `$description`, naming all
four divergences** — the claim is what the honesty contract governs, not the shape. The shape was
agreed in the architecture and every later ticket in the epic inherits it; changing it mid-PR
ripples outward. Rejected: conforming (reopens a settled decision and adds a mapping layer) and
dropping the name entirely (loses the option of interop later for no gain today). → Task 6.3.

**D-c · `setPos(el, x, y, w, h)` — five arguments, four custom properties.**
*(Measured, not preferred.)* The ticket's `setPos(el, x, y, w)` is one term short. Three places say
so: `system/studio-verbs.mjs`'s `ui.resize` consumer (:684-694) writes **both** `data-span-col` and
`data-span-row`; `system/studio.css:361-368` binds `data-span-row` to `--stx-frame-rows`, which the
frame's **height** calc reads; and `tooling/studio-journey.mjs:5110` + :5172-5174 assert a
two-axis resize and announce it. One writer, not two — a separate `setSize` would put the group-7
slice list at four named writers and split one gesture across two write sites. `h` is optional: a
board wrapper has no authored height, and `framesPass:5207` asserts a `.stx-slot` carries no span
attributes at all. → Task 2.0, and Task 2.3's pinned count becomes `{setPos: 4, setScale: 3}`.

**D-d · "Blocked" stops existing, and the sentence that said it does too.**
*(Decided here; the alternative is named.)* The deleted `groupDelta` was strictly all-or-nothing and
returned the **identical input array** when blocked — deep-equality-with-the-input was the only
assertion a partially-moved set could fail. Free positions have no cells to collide in, so **nothing
blocks a free move**, and pretending otherwise would mean inventing a collision rule the ticket
never asked for. Two consequences, both of which must be written down rather than discovered:
`system/studio-verbs.mjs:1341-1344` announces blocked moves out loud (`"Blocked, still in column X,
row Y."`) and that sentence is **deleted, not translated**; and the only remaining bound is the
stage edge, so `setPos` clamps to it and the announcement says the position reached. Write both in
`studio-verbs.mjs`'s header — an invariant that quietly evaporates during a rewrite is worse than
one deliberately dropped. → Tasks 2.2 and 5.3.

**D-e · `ZOOM_REST` is retired with the rest of the table; the rest scale is a literal `1`.**
*(Decided here.)* It is the *index* `2` into the deleted five-entry table. Under continuous scale
the rest value is the *scale* `1`, and a name that means an index while holding a scale is how the
next reader gets it wrong. The keyboard's step list is a **new** constant with a **new** name
(`ZOOM_STEPS`), because `ZOOM_LEVELS` is in AC #1's grep — see Task 3.2. → Task 1.1.

### Assumptions this plan makes

1. **S1's verdict is inherited, not re-run** — configuration (a), no `content-visibility`, with T2
   named as the open edge. Its 56.0 ms worst drag INP is a **floor**, not a prediction: the harness
   carried no selection, verbs, layers, minimap or undo. If the INP gate misses at Task 8.4, the
   first thing to try is S1's own named mitigation (coalescing the scale write), not a new spike.
2. **#280's transport verdict is inherited and nothing here depends on it** — the applier is pure.
3. **#423 is not a blocker.** Its subject is a parked throwaway driver; its three assertion shapes
   are carried into this plan as GOTCHAs instead. If the implementer reuses S1's harness rather than
   writing fresh assertions, #423 becomes a blocker and must be closed first.
4. **The op count stays six.** The architecture's fourteen is a projection; the concurrency lock
   means no other ticket adds one while this is open.
5. **`discovery/faster-payment/` is the spine's home.** It is the only committed package whose
   subject is the first real flow, and its `run.json` already carries the fictional label the
   `build/` half inherits.
6. **No agent runs and no token is spent.** If that turns out false for any task, stop and re-plan —
   an unbudgeted agent run in a one-way-door PR is the wrong place to discover a cost.

---

## NOTES (open canvas)

### The pre-flight, recorded

Everything below was **run or read this session**, against `origin/main` at `287445e`.

**Commands driven (observed output):**

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass`, exit 0, 5.3 s |
| `node tooling/drift-check.mjs` | all thirteen legs `✓`, exit 0 |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` |
| `node agent-layer/gen-param-count.mjs --check` | `param count ✓  120 controls — no drift` |
| the DoD grep | **435 lines across 15 files** |
| `ls tooling/visual-regression/baselines \| wc -l` | **22** |
| `git diff --stat origin/main..HEAD -- . ':!.claude'` | **empty** — the working branch's code equals main |
| `WebFetch` jsoncanvas.org/spec/1.0 | node `type` ∈ `text\|file\|link\|group`; `height` required; no `relation`, no `ref` |

**What the pre-flight changed in this plan:**

1. **The ticket's named mitigation is dead, and S1's live one was missing.** The ticket makes
   `content-visibility: auto` conditional on S1's branch; S1 took branch 1 / configuration (a) and
   measured that it does not cull on Chromium 149 at all. S1's actual recommendation — coalesce the
   scale write to one per frame — appears in neither the ticket nor the brief. An implementer
   reading the ticket alone would do both backwards. → Task 3.2's two GOTCHAs.
2. **Gate B was missing entirely.** `tooling/studio-journey.mjs` carries **nine** running-page
   `hasAttribute("style")` assertions (:196, :209, :384, :1256, :1499, :1694, :2280, :2910, :3827)
   that `setPos` breaks independently of build-checks group 7. Both `studio-verbs.mjs:504-507` and
   `studio.mjs:50-51` name it in their own headers ("Both halves matter"); the ticket names only
   group 7. → AC #8 and Task 8.2.
3. **Group 7's rewrite changes kind, not membership.** `applyToStage` is
   `system/build-import.mjs:150`, not a studio symbol. The check is file-scoped
   (`ok(file === "build-import.mjs", …)` at :1493) plus a whole-list count (`writes === 1` at
   :1525). Widening the filename list would satisfy the ticket's words and kill the invariant. →
   Task 2.3 specifies a function-scoped predicate and three reddening mutations.
4. **`canvas-ops.mjs` must export `PARAMS`, or its group cannot exist.** Group 11 has no per-verb
   loop *because* `board-ops.mjs:49` keeps `PARAMS` private; group 29 has one *because*
   `discovery/ops.mjs:71-80` exports it and says so. The ticket requires "its build-checks group
   iterates `OPS`". → Task 4.2's prerequisite and Task 4.3's pattern.
5. **The `id` node key forces a handoff regeneration the ticket does not name.**
   `agent-layer/gen-vocabulary.mjs:100`'s composition-shape string changes → `vocabulary.json`
   changes → `drift-check.mjs:120-133` asserts `git status --porcelain -- handoff/` is clean. →
   Task 7.3.
6. **The validator does not close the node envelope.** `validateComposition` never enumerates
   `Object.keys(node)`, so `{name, props, children, id}` **already passes**. The work is consuming
   `id` at `build()`'s single choke point (:609-620), not "allowing" it. `data-part` is unused
   repo-wide. → Task 4.4.
7. **The grid reaches 15 files, not 12.** `studio-compile.mjs` (comment-only), `studio-frames.mjs`
   and `studio-select.mjs` are the three the ticket's file list omits. The DoD grep matches
   **comments**, so a stale comment keeps it red. → Task 0.2's GOTCHA.
8. **Groups 26 and 27 are representation-coupled, not cap-coupled.** Neither imports a single cap
   symbol. What breaks is group 26's four **exact position sentences** and group 27's CSS-Grid-track
   parsing. The ticket lists them among "rewritten" without saying why they differ. → Task 2.7.
9. **There are two copies of `arrangeBoard`'s rule.** `replay-driver.mjs:516-518` reimplements it and
   its own comment admits the duplication. Changing `arrangeBoard` alone leaves `/factory`'s replay
   on the old rule. → Task 3.5's GOTCHA.
10. **Five prose copies of the group count; only four are gated.**
    `tooling/build-checks.mjs:4` spells it "Thirty-four", which `/all (\d+) groups pass/` cannot see.
    → Task 10.2's table.
11. **`canvas.json` is a JSON Canvas dialect, four divergences deep.** → D-b and Task 6.3.
12. **Two false cascades ruled out**, so the implementer does not chase them: `gen-system-graph`
    (its inputs do not include `studio.css`) and `agent-layer/build-instance.mjs` (it copies
    `system/` wholesale at :458-460, so new modules ride along).
13. **`portal/lib/` matches no `loc-summary` group**, so `canvas-store.mjs` does not cascade — only
    the two `system/*.mjs` do (runtime 76 → 78).
14. **No token work.** S2 named `--spacing-none`; #301 decided against it
    (`system/specs/stack.md:29`). The ticket's conditional row resolves to no, and the nudge floors
    at `--spacing-xs` = 4 px.
15. **`system/system-graph.mjs:247-260` is a shipped, working cursor-anchored continuous zoom** on
    the same page. It was not cited anywhere in the ticket or the brief. → Task 3.2's PATTERN.
16. **The baseline figures reconcile.** The ticket says "~10 PNGs" (DoD) and "~15 PNGs" (size);
    observed, it is **11 new + 4 regenerated = 15 written, 33 files after**.
17. **`discovery/README.md` has no `build/` section and `#281` did not write one** — so precondition
    4's second branch is a definite task, not a conditional.
18. **#423 is not in #302's `Depends on`** but S1's epic comment says its gaps close "before #302
    reuses the harness". → assumption 3 and the three named anti-shapes in Testing Strategy.

19. **The DoD grep undercounts the two drivers.** Its seven symbols match **74** lines in
    `studio-journey.mjs` and **10** in `vt-verify.mjs`; the full grid vocabulary (adding
    `data-span-col/row`, `data-zoom`, `clampSpan`, `footprint`, `MIN_SPAN`, `hitSlot`, `fitLevel`)
    matches **101** and **13**. So AC #1 can go green with 27 + 3 grid-shaped lines still live. →
    Task 3.2's `data-zoom` GOTCHA and Phase 8's own counts.
20. **The brief's `vt-verify.mjs:303-307` citation is wrong** — that is a comment tail plus
    `canvasState()`'s head. The pattern it describes is `movePlace()` at **:326-330**. Also:
    `vt-verify.mjs` imports **no** `studio-canvas.mjs` constant, so all 13 of its hits are movement
    *preconditions*, not claims. → Task 8.5.
21. **The helper signature has no height term, and `framesPass` asserts height.**
    `tooling/studio-journey.mjs:5110` computes `rows: String(TARGET_FRAME.spanRow + 1)` and
    :5172-5174 asserts the announcement says `"${WANT.cols} columns by ${WANT.rows} rows."` — a
    device frame resizes on **both** axes today, and `setPos(el, x, y, w)` carries one. → Task 2.0
    makes this a decision to take before anything pins it.
22. **Deleting `g` retires a shipped capability that three other places still advertise** —
    `studio.mjs:451-454`'s restore branch, `keepPass:2749-2754`'s assertion (whose deliberate
    off-row-1 move, added by PR #241, exists *only* to make it non-vacuous), and
    `param-manifest.json:95`'s label "arrangement included". The ticket strips a clamp and stops. →
    Task 1.5b, including the honesty item no gate can catch.
23. **Three of thirteen journey passes are untouched** (`teardownPass`, `methodPass`, `docsPass` —
    zero grid occurrences, verified), and `settleWait` and `inp-observer.mjs` need no change. Worth
    knowing before budgeting Phase 8.
24. **The plan's own phase order was circular and is now fixed.** The brief's step 2 rewrites the
    groups "against the new helpers" and step 3 builds "the substrate (helpers, …)" — so Task 2.1's
    tripwire and Task 2.3's function slice referenced code that did not exist yet. Task 2.0 now
    writes the two helpers at the head of Phase 2, and the Phase 2 header states that Gate B is
    knowingly red from that moment until Task 8.2.

**Line numbers corrected during the pre-flight** (recall vs. the file): `MAX_COLS` is
`studio-canvas.mjs:38` not :37; `V_BASE` is `build-share.mjs:74` not :71; `.stx-sizer` is
`studio.css:69-73` not :69-72; `build-checks.mjs`'s studio-canvas import is :218 and the
studio-verbs one :219. Every `file:line` in this plan was opened this session.

### Why the PR is not split, restated for the implementer

You will be tempted around Phase 2. Do not. Half the grid removed is a red build with no green path
back; a canvas that is partly slots and partly free positions has no announceable unit, no codec
rule and no gate. The ticket, the brief and the architecture each reach that conclusion
independently. What makes it survivable is the **per-phase commit** — the door is one-way, but the
ground inside it is recoverable.

### The one thing most likely to go wrong

Not the deletion — that is grep-verifiable. It is **Phase 2 crashing at import rather than failing
per-assertion**. `tooling/build-checks.mjs:218-219` are static, top-level imports of the deleted
symbols, so the first run after Phase 1 gives you one crash, not seven red groups. If you take that
crash as "the groups are red, proceed", you skip the entire discipline Phase 1 exists for. Comment
the dead imports out one group at a time and record each group's own red.

### What S1 licenses, and what it does not

S1's sentence licenses **T4 and T5** on configuration (a) and **bounds T2**. It covers nothing else.
It is not a claim that the canvas will be fast: the harness had ~30 frames, an arrow overlay, and
**none** of selection, verbs, layers, minimap or undo. 56.0 ms against a 200 ms budget is a floor
with ~144 ms of headroom for everything this PR adds on top. That headroom is generous, but it is
headroom, not a result.

### Confidence, per phase — after the de-risking pass

The first pass scored ≈ 8.3 with three phases below 9. Those three were then worked rather than
re-worded: four mechanisms were **built and driven** in the scratchpad, the two owner decisions were
**taken**, and the two measurable questions were **measured**. Re-scored against what is now
observed rather than expected:

| Phase | Was | Now | What changed |
|---|---|---|---|
| 0 · branch, record | 10 | **10** | — |
| 1 · delete | 9.5 | **9.5** | Grep-verifiable both ways; the module-scope crash is Tasks 1.7 / 8.1. |
| 2 · nine group rewrites | 7.5 | **9.5** | **The group-7 predicate was written and driven** — green on the control, **red on all four mutations including the file-scoped shortcut**, with the working `sliceFn` in the task. The other eight groups have a coupling classification and a named mutation each. |
| 3 · the substrate | 9 | **9.5** | `system-graph.mjs:247-260` is the shipped model for zoom; **the rank layout was run over both committed boards** — deterministic, cycle-safe, and its exact output is now the fixture's literals. |
| 4 · `canvas-ops.mjs` | 9.5 | **10** | **A reference applier was written and driven: 25/25 assertions pass**, parked at `.claude/plans/canvas-swap-302-reference/`. Copy-and-adapt, not blank-page. |
| 5 · verbs + announcements | 8.5 | **9** | Unchanged in substance; D-d settles what "blocked" now means, which was the one undefined term. |
| 6 · the spine | 8 | **9.5** | **D-a and D-b taken by the owner.** The composition was **validated against the real validator and the real vocabulary** — base and error state both pass. |
| 7 · generators | 9.5 | **9.5** | — |
| 8 · journeys | 7.5 | **8.5** | **Appendix A** turns 101 lines into a per-pass checklist (three passes need no work at all), and Gate B's predicate is specified beside Task 2.3 rather than discovered in Phase 8. The INP budget is still defended by S1's floor, not by a measurement of the real substrate. |
| 9 · baselines | 8.5 | **8.5** | Ten recorded traps, all written in. The failure mode is a wasted Docker run. |
| 10 · prose | 9.5 | **9.5** | — |

**Aggregate, weighted by size: ≈ 9.4/10** (was 8.3). Eleven phases, nine at 9.5 or above.

### Why this is not 10, and what 10 would actually take

You asked for 10. I have taken every point that planning can take; here is the honest account of the
0.6 that is left, so you can decide whether to spend what it costs.

**Two phases carry residual risk that no amount of further planning removes:**

- **Phase 8 · the INP gate (the larger half).** S1 measured **56.0 ms worst drag INP against a
  200 ms budget** — but on a throwaway harness with **no selection, verbs, layers, minimap or undo
  attached**. That is a floor, not a prediction, and the real substrate adds all five. ~144 ms of
  headroom is generous and I expect it to hold; "expect" is the honest word. **What would close it:**
  a half-day spike that stands the real substrate up under the existing INP driver before the swap
  PR is written — S1's shape, run again with the modules attached. That is a new ticket, not a
  paragraph.
- **Phase 9 · the pixel baselines.** 15 PNGs regenerated through Docker on a Linux baseline from a
  macOS machine. Every recorded trap is written in, but the gate's own documented failure modes
  (sub-perceptual skips, the `approach` countUp flake, `maxDiffPixels: 100` swallowing changed
  digits) are properties of the gate, not of this plan. **What would close it:** nothing at plan
  time. It closes when the run is green in CI.

**A 10 would mean one-pass success is essentially certain on a 2,500-line one-way-door PR that
rewrites nine gates and two cross-engine drivers.** I do not think that is a number anyone can
honestly write before the INP spike has run, and writing it would make this plan's other figures
less trustworthy, not more. 9.4 with the two gaps named is worth more to you than a 10 with them
buried — and this repo's own largest class of process finding is exactly a green number that had
not reached the thing it claimed to measure.

**If you want the 10:** land #423 (S1's three assertion gaps) and run the substrate-under-load spike
with the real modules attached. Half a day each, and they convert Phase 8's "expect" into
"observed". Say the word and I will plan them.

---

## APPENDIX A — the journey driver, pass by pass

Phase 8's work list, so the 101 lines are a checklist rather than a rule applied by judgement.
**H** = a helper definition (rewrite this and most of its consumers follow; the consumers carry no
grid symbol and are invisible to grep). **C** = a `t()` whose condition compares a coordinate.
**B** = behavioural, survives with a different read. **P** = prose only.

| Pass | Lines | Grid lines | What to do |
|---|---|---|---|
| shared helpers | 1-349 | 9 | **H ×6.** `:94` the module-scope import (Task 8.1) · `:135` `pct()` · `:181` `snapshot().zoom` · `:209` `viaSeam()` · `:256-266` `cellPoint()` · `:271` `idAt()`. Rewriting these six moves the majority of the file. |
| `journey()` | 350-1372 | 26 | 15 **C** (zoom levels, fit arithmetic, the clamp cases at :594-596 and :1247-1248, the far-column reach at :563 whose *condition* is behavioural), 6 **P**. **Plus the grep-invisible R3 FLIP case at :993-1052.** |
| `factoryPass` | 1373-1608 | 5 | All **C** — before/after coordinate reads at :1465, :1478, :1480, :1592, :1600. |
| `replayPass` | 1624-2216 | 2 | **C** at :1649-1650, feeding the `arrangeBoard` assertion at :1657-1659 — **the one place the old layout rule is asserted by identity.** Becomes the rank layout's answer (Task 3.5). |
| `compilePass` | 2227-2434 | 3 | **H** `stageState()` :2274-2275 (5 consumers) + **C** :2334 ("every id, col and row unchanged"). |
| `flowPass` | 2441-2610 | 3 | **C** — the carry-cancel origin at :2582, :2593, :2601. |
| `keepPass` | 2623-3053 | 4 | **C** at :2709, :2724, :2726, :2844 — **and :2749-2754 is the `g` assertion that is DELETED, not translated** (Task 1.5b). |
| `teardownPass` | 3065-3234 | **0** | Nothing. |
| `methodPass` | 3244-3664 | **0** | Nothing. It compares labels and order through `draftBoard`, never coordinates. |
| `selectPass` | 3691-4511 | 17 | **H ×5** (`slotsNow()` :3723, `cell()` :3738, `guidesHonest()` :3978-3986, `openAt()` :4180) + **C** for the marquee/menu-flip cases. The empty-column mutation at :4003-4008 is the guide-honesty drill — keep it, re-expressed. |
| `docsPass` | 4543-4927 | **0** | Nothing. |
| `framesPass` | 4937-5376 | 7 | **H ×2** (`frameState()` :4973-4974, `spanOf()` :4992-4993) + **C** :5207 (a board wrapper carries no span — the free-position twin is "no `--h`", D-c) and :5212 (the hostile-input clamp). |
| `layersPass` | 5383-5683 | 4 | **H** `movables()` :5408-5411 + **C** :5524, :5528. The position **sentences** change with group 26 (Task 2.7). |
| `minimapPass` | 5697-5973 | 12 | The heaviest per-line pass. **H ×3** (`metricsOf()` :5730, `wrapGeo` :5765-5766, :5912-5913) + **C** throughout. Its `expectView()` at :5739 feeds every `sameRect()`. |
| `perfPass` | 5975-6449 | 2 | **C** :6435-6437 (the throttled-drag movement proof). **Plus the grep-invisible drop point at :6042-6046**, computed from `gridTemplateRows`. |
| summary | 6475 | 1 | **P** — the closing line names `data-zoom`; it also states the driver's own bounds and must be updated for the new verbs. |

**Order to work in:** the six shared helpers first (they unblock everything), then `perfPass` (it is
the gate with a budget), then the four heaviest passes (`selectPass`, `minimapPass`, `framesPass`,
`journey()`), then the rest. Three passes need no work at all.

---

## AMENDMENTS

*(Append-only; newest at the bottom. Empty at creation.)*

### 2026-09-18 — Phase 1, four plan errors

**A1 · Task 1.1's VALIDATE contradicts D-e.** The task says "Keep `ZOOM_REST`" and its VALIDATE
expects `FRAME_CLASS MOVABLE ZOOM_REST getCanvas initStudioCanvas`. D-e decides the opposite, with
reasons, and D-e is right: every one of `ZOOM_REST`'s 30 consumers treats it as an INDEX into the
deleted table (`ZOOM_LEVELS[ZOOM_REST]`, `String(ZOOM_REST + 2)`, `for (let i = 0; i < ZOOM_REST;)`),
so keeping the name while it holds a scale is the exact confusion D-e forbids. **Implemented per
D-e**: `ZOOM_REST` is deleted, and the observed export list is
`FRAME_CLASS MOVABLE getCanvas initStudioCanvas`.

**A2 · Task 1.7's recipe cannot produce the per-group reds it asks for.** "Comment the dead imports
out one group at a time and record each group's own red" reaches ONE group per run: `group()`
(`tooling/build-checks.mjs:315`) has no try/catch and the group bodies are bare top-level `{ … }`
blocks, so the first group to touch a deleted symbol throws and every group below it never runs.
**Replaced** by a scratch copy with sentinel stubs plus a per-section try/catch — the full recipe and
its output are in the report's Phase 1 section. The scratch file is untracked and was deleted.

**A3 · Task 1.5b's "all three places" is five, and two of them are mechanism rather than copy.**
The three the task names (`studio.mjs`'s restore branch, `keepPass`'s assertion,
`param-manifest.json`'s label) are real. It misses:

- **`system/build-keep.mjs`** — `restoredArrangement`, captured on restore and threaded back into
  `encodeBuild` by `currentUrl()`, so /build re-emitted an arrival's `g` untouched.
- **`system/studio-keep.mjs`** — the whole producing mechanism: `arrangement()` reading the wrappers
  positionally, the `sent` flag threaded through `currentUrl` → `publishLink` → the click handler,
  the `NO_ARRANGEMENT` caveat constant and **three** reader-facing strings claiming "arrangement
  included". Its producer, `studio.mjs`'s `arrangementNow()` and the `getArrangement:` option that
  carries it, also had to go. The task's GOTCHA says "check the on-page copy beside the button too
  (`system/studio-keep.mjs`)" — it is ~45 lines of live mechanism, not a copy string.

**A4 · `keepPass` has a SECOND `g`-dependent assertion the task does not name.** Besides :2749-2754,
section 6's receiver check (":2836-2840", `…at the SENDER'S coordinates — reachable only through the
link's g`) compares against the same deleted `movedSlots`. Deleting only the first leaves an
undefined reference. Both went; the second was replaced by the claim that survives — the sender's
BOARD arrived — rather than translated into a comparison of the rank layout with itself.
