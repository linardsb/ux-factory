# Feature: `import/` — the IR, the Brilliant converter and the deterministic matcher

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Ticket:** [#304](https://github.com/linardsb/ux-factory/issues/304) · **Epic:** [#295](https://github.com/linardsb/ux-factory/issues/295)
· **Architecture:** `docs/epics/canvas-design-import.architecture.md` (§ Data model, § Other eng-lead calls D3/E3, § Placement)
· PR body carries `Closes #304`.

## Feature Description

Three Node-only modules under a new top-level `import/` directory that take a Brilliant **blueprint read**
(the structured text a Brilliant `lookup` returns) and turn it into a **deterministic recognition verdict**
against this repo's own component vocabulary — with no portal, no agent, no network and no design tool in
the loop.

- `import/ir.mjs` — the intermediate representation. One node tree both converters emit and the one thing
  the matcher reads. Every tokenisable value is `{value, ref}`. Carries the E1 drop taxonomy and the
  Mode 1/2 + grain facts on its root.
- `import/brilliant.mjs` — the converter from a blueprint read to IR. Its layout branch is **lifted** from
  S2's parked `.claude/plans/canvas-spike-s2/layout-branch.txt` (#299), not rewritten.
- `import/recognise.mjs` — scores each IR node against `handoff/verdant/vocabulary.json` with independent
  named signal predicates → sort → threshold → an explicit **"not covered" floor**, and fills a slot by
  slug → builder.
- `import/fixtures/` — spike C's two committed blueprint reads, copied in, plus the expected verdict.
- `tooling/build-checks.mjs` — group 40, which drives the whole chain and asserts the same answer every run.

## User Story

As the operator of the factory
I want a designer's drawn component to be recognised against the system's own vocabulary in code, deterministically,
So that the portal's import (#311) shows a verdict I can argue with, and the import record (#307) can be
refused for lying — instead of an agent inventing a component name in prose.

## Problem Statement

Recognition today is a human reading a blueprint and deciding. Spike B did it in under a minute
(Polaris Badge → the existing `status-chip`); spike C did it in 0:16 (not covered → a new part). Both were
judgement calls in a session, unrepeatable and unauditable. Nothing in the repo can take a design read and
say, the same way every time, *"this is a `list-row`, and here is what I could not carry"*. Until it can,
every downstream artefact (#307's record, #311's side-by-side view, #313's ratify) rests on prose.

## Solution Statement

Put recognition in code before any prose (architecture D3/E3). A converter produces a typed IR; a matcher
scores each IR node with **independent, named** signal predicates and an explicit floor; a gate drives the
real committed fixture through the whole chain twice and asserts byte-identical verdicts. Everything the
chain reads and cannot carry becomes a **drop row in one of E1's three classes**, so the loss list is total
by construction rather than by remembering.

## Out of Scope / Non-Goals

- **Not included: snapping for unbound sources.** `import/snap-rules.mjs`, the per-source override table
  and the tolerance-per-family rules are **#307**. This ticket's fixtures are fully token-bound, so every
  `ref` arrives filled; an unbound value here leaves `ref` empty and is recorded, never guessed.
- **Not included: the import record.** `imports/<id>.json`, its markdown projection and the fidelity block
  are **#307**. `recognise` returns a verdict tree in memory; nothing writes a record.
- **Not included: the Figma converter.** `import/figma.mjs` and the house plugin are **#310**.
- **Not included: any portal route, SDK run, MCP call or recorded run.** That is **#311**.
- **Not included: an `icon` component.** `icon` is not in the vocabulary (observed, 24 entries). The
  fixture's `svg(icon:caret-right)` must read **`not covered`** here; **#305** changes that expected answer.
- **Not changing:** `system/` (nothing), any spec, any token, any shipped page, any generated artefact.
  `system/agentic-renderer.mjs` is **imported by the gate only**, never edited.
- **Not building:** a composition *placer* (which node consumes which). `recognise` gives a verdict per
  node; who wins where is #311's mapping editor.
- **Not adding:** an `import/README.md`. The ticket's file list does not carry one and CLAUDE.md's rule is
  that invariants live in the file that owns them. Each module opens with its own governing header.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (new directory, new grammar, a matcher whose answers must be argued for)
**Primary Systems Affected**: `import/` (new), `tooling/build-checks.mjs`, `CLAUDE.md`, `.claude/references/gates.md`
**Dependencies**: none new. Node built-ins only. Reads the committed `handoff/verdant/vocabulary.json`.

## Related Work

**Implements**: [#304](https://github.com/linardsb/ux-factory/issues/304) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295) → `docs/epics/canvas-design-import.architecture.md`

**Back-references**:

- `.claude/plans/canvas-spike-s2/README.md` + `layout-branch.txt` (#299) — Why: the layout branch is
  **lifted**, and its verdict (leg 2, `--spacing-none` named, `size.w` may be a Number) is inherited whole.
- `.claude/plans/design-import-spike-c/README.md` (spike C) — Why: the fixtures, Q1 (refs + resolved values
  on every slot), Q2 (blueprint is the converter input), and the `hug:N` → `hug` rule.
- `.claude/plans/design-import-epic-prd-handoff.md` §9.2 (spike B) — Why: recognition-over-admission, and
  the **correction** that Badge was rejected rather than ported (see Open Questions Q2).
- `.claude/plans/canvas-import-prd-briefing.md` §28 E1/E3 — Why: the three drop classes and the matcher shape
  (signal predicates → sort → threshold 0.5 → floor; slug→builder dispatch).
- `.claude/plans/canvas-swap-grid-retired-free-substrate-302.md` (#302) — Why: `system/canvas-ops.mjs` and
  build-checks group 35 are the house pattern this ticket's module headers and gate copy.

**Forward-references**:

- #307 (the record + snap rules) · #310 (`import/figma.mjs`) · #311 (the recorded import) — all read this
  ticket's IR and verdict shapes unchanged.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `.claude/plans/canvas-spike-s2/layout-branch.txt` (whole file, 348 lines) — Why: **this is lifted, not
  rewritten.** It exports `SPACING`, `args`, `split`, `parseValue`, `parseAl`, `toAlign`, `parseSize`,
  `mapSpacing`, `toStack`, `nodeName`. Its header carries four contracts you must keep: the sign convention
  (`distance = contract − source`), mapping by role never by value, a miss returns `null` and the caller
  records a drop, and **a consumer must refuse a `size` axis that is not `fill`/`hug`**.
- `.claude/plans/canvas-spike-s2/README.md` (lines 25–40 verdicts; the "Could not map" table) — Why: the
  four drop `kind`s and the explicit instruction to **fold `kind` into E1's classes, not substitute**.
- `.claude/plans/design-import-spike-c/03-blueprint.txt` (10 lines) — Why: fixture 1, the **instance** read.
- `.claude/plans/design-import-spike-c/03c-master-blueprint.txt` (15 lines) — Why: fixture 2, the **master**
  read with two variant frames.
- `.claude/plans/design-import-spike-c/README.md` (Q1/Q2 verdicts, the caveats list) — Why: `hug:N` is `hug`;
  the blueprint carries ref **and** resolved value on every tokenisable slot.
- `docs/epics/canvas-design-import.architecture.md:159-172` (the import record + the IR + snapping) and
  `:260-263` (D3/E3 recognition) and `:271-276` (§ Placement) — Why: the IR node shape and the `import/`
  placement rule are quoted verbatim from here.
- `system/canvas-ops.mjs:1-60` — Why: **the house pattern** for a pure, DOM-free, SDK-free op/grammar module:
  a frozen roster, a frozen `PARAMS`-style table exported so the gate can iterate it, a private `check*`
  that throws naming the offending path, a clone so an applier never mutates its argument.
- `discovery/ops.mjs:1-40` — Why: the same pattern's older sibling; its header states the
  "lives outside `system/` because `gen-loc-summary` counts `system/*.mjs`" argument you restate in `import/`.
- `tooling/build-checks.mjs:313-336` — Why: `ROOT`, `VOCAB` (already loaded at `:318`), `ok()` and `group()`.
  A new group **must not** re-read `vocabulary.json`; use the module-level `VOCAB`.
- `tooling/build-checks.mjs:11076-11130` — Why: group 35, the closest structural precedent: `await import()`
  inside the block, a local `deep()` canonical stringify, `threw()`/`names()` helpers, a `VALID_FOR` fixture
  table with a "a verb with no fixture fails BY NAME" assertion.
- `tooling/build-checks.mjs:11845-11852` — Why: the `all 39 groups pass` line you change to 40.
- `tooling/drift-check.mjs:164-193` (`checkGroupCount`) — Why: **four** claims across three files are pinned,
  not three. It also runs `node --check` over every tracked `*.mjs` (`:29-38`).
- `agent-layer/gen-loc-summary.mjs:22-27` (`GROUPS`) + `:32` — Why: `genLocSummary` is the **only** export;
  `GROUPS` is module-private, so AC #3 is proven by calling `genLocSummary({check:true})`, never by copying
  the regexes.
- `system/agentic-renderer.mjs:38` (`validateComposition`) — Why: pure and DOM-free; the **gate** imports it
  to prove a built composition is real. `import/` never imports it.
- `handoff/verdant/vocabulary.json` — Why: the matcher's input. **24 components** (observed), `composition.version: 2`,
  each entry `{class, status, props, states, children, childrenCardinality?, usage, contract}`.

### New Files to Create

- `import/ir.mjs` — the IR: kinds, the token-value shape, the E1 drop taxonomy and its fold from S2's `kind`,
  the root's mode + grain, a validator that throws naming the path, and the one shared `walk`.
- `import/brilliant.mjs` — the blueprint read → IR converter. Lifts S2's layout branch; adds the
  indentation tree parser and the non-layout atoms.
- `import/recognise.mjs` — `SIGNALS`, `THRESHOLD`, `TYPE_ROLE_PX`, `scoreNode`, `recognise`, `BUILDERS`, `build`.
- `import/fixtures/spike-c-instance.blueprint.txt` — copied byte-for-byte from `03-blueprint.txt`.
- `import/fixtures/spike-c-master.blueprint.txt` — copied byte-for-byte from `03c-master-blueprint.txt`.
- `import/fixtures/spike-c-instance.expected.json` — the committed expected verdict tree for fixture 1.
- `import/fixtures/s2-layout-branch.baseline.txt` — a **frozen copy** of #299's parked layout branch, so the
  lift-fidelity gate does not read `.claude/plans/` at CI time.

### Relevant Documentation

External docs are **not** needed for this ticket: no library, no API, no framework. Everything the plan
rests on is committed in this repo. The two documents that behave like specifications here are:

- `docs/epics/canvas-design-import.architecture.md` — § Data model (the IR, the record, snapping), § Other
  eng-lead calls (D3/E3, § Placement). Why: the IR node shape and the `import/` placement rule are decided
  there and inherited, not re-decided.
- `.claude/references/gates.md` — the gate stack and the "every gate states what it cannot reach" convention.
  Why: group 40 must carry that sentence, and the heading's group count is drift-checked.

### Patterns to Follow

**Module header (CLAUDE.md § Ground rules — "invariants live in the file that owns them"):**
Every new `.mjs` opens with a header naming its governing doc and its invariants, in `system/canvas-ops.mjs`'s
voice. Example of the shape that file uses:

```js
// system/canvas-ops.mjs — hand-written canon (this repo; not generated). THE BUILD DOCUMENT's op
// grammar and its pure applier (epic #295 ticket #302; docs/epics/canvas-design-import.architecture.md; …).
//
// PURE AND DOM-FREE, AND NO SDK ANYWHERE IN ITS IMPORT GRAPH. It imports system/device-presets.mjs
// and nothing else. That is what lets tooling/build-checks.mjs drive every branch of it in CI with no
// browser and no portal/node_modules …
```

**Throw plain Errors naming the offending path** (CLAUDE.md § Ground rules, `agent-layer/lib.mjs`):

```js
throw new Error(`unterminated ${head}( in: ${src.trim()}`);   // layout-branch.txt, args()
throw new Error(`pad() with ${pad.length} values — 1, 2 or 4 expected — in: ${String(line).trim()}`);
```

No error taxonomy, no wrapping, no schema library. Validate by hand at the boundary.

**Frozen roster + exported table, so the gate can iterate** (`system/canvas-ops.mjs`, group 35):
`OPS` frozen, `PARAMS` frozen **at both levels** (`Object.freeze` is shallow — group 35 asserts a `push`
on each entry fails). `import/`'s equivalents are `KINDS`, `DROP_CLASSES`, `SIGNALS`, `BUILDERS`.

**Gate block shape** (`tooling/build-checks.mjs:11091-11100`):

```js
{
  const { OPS: COPS, PARAMS: CPARAMS, applyOp } = await import("../system/canvas-ops.mjs");
  const deep = (v) => (…canonical stringify…);
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
  const names = (fn, ...must) => { const m = threw(fn); return m && must.every((w) => m.includes(w)) ? null : `${m ?? "NO THROW"}`; };
  …
  ok(condition, "the failure message names the fix");
  group("import-chain", "…what it proved… What it cannot reach: …");
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: The IR

`import/ir.mjs` first, because both the converter and the matcher are written against it. Nothing else
can be checked until the shape exists.

**Tasks:** the kinds, the token-value shape, the E1 drop classes + the fold from S2's four `kind`s, the
root's `mode`/`grain`, `checkIr`, `walk`.

### Phase 2: The Brilliant converter

**Depends on:** Phase 1.

Lift S2's layout branch verbatim, then widen the scope line: at #299 everything outside `al()` was read
past, unrecorded; at #304 the converter reads the whole line, so an atom it does not understand becomes a
**`never-read`** drop. That widening is AC #4's "the record of what was never read starts here".

### Phase 3: The matcher

**Depends on:** Phase 1 (the IR) only — **independent of** Phase 2 in code (it reads IR, not blueprints), so
it can be written in parallel against hand-built IR nodes. The *gate* needs both.

**Tasks:** the type-role table, the four signals, the threshold, the floor, the sort, `BUILDERS`, `build`.

### Phase 4: The fixtures and the gate

**Depends on:** Phases 1–3.

**Tasks:** copy the two blueprint reads in, drive the chain, commit the expected verdict, write group 40,
move the group count in four claims, add the `cannot reach` sentence to `gates.md`, add `import/` to
CLAUDE.md's map.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### CREATE `import/ir.mjs`

- **IMPLEMENT**:
  - The header, in `system/canvas-ops.mjs`'s voice: what the IR is (epic #295 ticket #304, architecture
    `:165-169`), that it is **pure, imports nothing, and has no SDK in its import graph**, and **why it
    lives in `import/` rather than `system/`** — `agent-layer/gen-loc-summary.mjs:22-27` counts
    `system/*.mjs` as the design system and `approach.html` renders the number; nothing here is loaded by
    a shipped page (architecture § Placement).
  - `export const KINDS = Object.freeze(["frame", "text", "icon", "instance", "shape"])` — verbatim from
    architecture `:165`.
  - `export const GRAINS = Object.freeze(["component", "screen"])` and `export const MODES = Object.freeze([1, 2])`.
  - `export const tok = (value, ref = null) => ({ value, ref })` — the one tokenisable-value shape. `ref`
    filled by a bound source, `null` by an unbound one (**never** guessed here; #307's snap fills it).
  - `export const DROP_CLASSES = Object.freeze(["never-read", "read-then-dropped", "read-but-never-emitted"])`
    — E1's three, spelled as the architecture spells them (`:159-160`).
  - `export const DROP_CLASS_OF = Object.freeze({ "no-token": "read-then-dropped", "qualifier-dropped":
    "read-then-dropped", "literal-size": "read-then-dropped", "unread-al-arg": "never-read", "unread-atom":
    "never-read", "unfillable-required-prop": "read-but-never-emitted", "no-vocabulary-slot":
    "read-but-never-emitted" })` — **the fold S2's README demands** ("fold `kind` into E1's classes; do not
    substitute one for the other"). Frozen, exported, iterated by the gate so a new `kind` with no class
    fails by name.
  - `export const drop = ({ kind, slot, ref = null, value = null, reason })` — builds one row and **throws
    if `kind` has no `DROP_CLASS_OF` entry**, naming the kind. The row carries `class` derived, never passed.
  - `export const node = ({ kind, name = null, layout = null, style = null, text = null, icon = null,
    component = null, children = [], drops = [] })` — the node constructor; refuses a `kind` outside `KINDS`
    naming the value.
  - `export const root = ({ mode, grain, source, children = [], drops = [] })` — refuses a `mode` outside
    `MODES` and a `grain` outside `GRAINS`, each naming the value. `source` is `{tool, ids, bound}`.
  - `export function checkIr(ir, path = "ir")` — recurses, throws a plain `Error` naming the offending path
    (`ir.children[1].children[0].kind`) on: a bad kind, a bad mode/grain, a `layout.size` axis that is not
    `"fill"`/`"hug"`/a finite Number, a token value that is not `{value, ref}`, a drop whose `class` does not
    match `DROP_CLASS_OF[kind]`.
  - `export function walk(ir, fn, path = "ir")` — pre-order, passes `(node, path)`; the one tree walk the
    converter, the matcher and the gate all share.
- **PATTERN**: `system/canvas-ops.mjs` (frozen roster + exported table + a private check that throws naming
  the path); `discovery/ops.mjs:1-40` (the "lives outside `system/`" header argument).
- **IMPORTS**: none. Zero `import` statements in this file.
- **GOTCHA**: `Object.freeze` is **shallow** — group 35 learned this the hard way (`build-checks.mjs:11105-11109`).
  Freeze `KINDS`, `GRAINS`, `MODES`, `DROP_CLASSES` **and** `DROP_CLASS_OF`, and expect the gate to try a
  `push`/assignment on each.
- **GOTCHA**: do **not** add a `zod` schema or any validation library. CLAUDE.md § Types: plain JavaScript,
  validate by hand at the boundary and throw.
- **VALIDATE**: `node --check import/ir.mjs && node -e "import('./import/ir.mjs').then(m=>{const ks=['KINDS','GRAINS','MODES','DROP_CLASSES','DROP_CLASS_OF','tok','drop','node','root','checkIr','walk'];const miss=ks.filter(k=>!(k in m));if(miss.length)throw new Error('missing exports: '+miss);console.log('ir exports ok', m.KINDS.join(','))})"` (expected)
- **REDDENS**: n/a (no check added here).
- **SATISFIES**: AC #4 (mode/grain on the root; the never-read class starts here), and the shape AC #1 drives.
- **REGENERATES**: none.

### CREATE `import/brilliant.mjs`

- **IMPLEMENT**:
  - The header: what a blueprint read is, that this file is **lifted from** `.claude/plans/canvas-spike-s2/layout-branch.txt`
    (#299) with the lift **named**, and the four inherited contracts restated **in this file** (sign
    convention; by role never by value; a miss returns `null` and the caller records a drop; a consumer must
    refuse a `size` axis that is not `fill`/`hug`).
  - **Lift verbatim** from `layout-branch.txt`: `SPACING`, `ALIGN_LETTER`, `isBoundary`, `args`, `split`,
    `parseValue`, `parseAl`, `toAlign`, `parseSize`, `mapSpacing`, `expandPad`, `PAD_SIDE`, `toStack`,
    `nodeName`. Keep their comments — they carry the reasoning (the `svg(` boundary case, the trailing-empty
    `split` case, the observed 2-value pad expansion, the mixed-`pad` three-shape contract).
  - **Re-point the drop rows** at `ir.drop()` so every row gains its E1 `class`. `toStack`'s four `kind`s
    (`no-token`, `qualifier-dropped`, `literal-size`, `unread-al-arg`) stay spelled exactly as S2 spells them.
  - **The tree parser** (new): a blueprint read is line-oriented, two spaces per depth level. Skip the first
    `lookup { … }` line and any line whose first non-space character is `#` (fixture 1 line 3 is a read-only
    comment — observed). Each remaining line is `<id> <atoms…> "<name>" [#tag]`. Indent width → depth →
    parent. Throw naming the line on an indent that is not a multiple of 2 or that jumps more than one level.
  - **The atom readers** (new, beyond `al()`/`s()`): `t("…",Family:$font.family,16:$font.size.md,<weight>,align(l),lh(…))`
    → `kind: "text"` with `text: {content, size: tok(16, "$font.size.md"), weight, align, lineHeight}`;
    `svg(icon:<name>)` → `kind: "icon"` with `icon: {name}`; `c` → `kind: "shape"` with `style.shape: "circle"`;
    `inst("<Master>") at(<axis>(<value>))` → `kind: "instance"` with `component: {name, variant, overrides: []}`;
    `fr comp axes[…]` → `kind: "instance"` with `component.axes`; `variant(state(active))` on a frame →
    `component.variant`; `override(#tag) t("…")` → an entry in the parent instance's `component.overrides`;
    `f[(id,tok(color.x,#HEX,dark(#HEX)…))]` → `style.fill = tok("#HEX", "$color.x")`; `st[…]` → `style.stroke`;
    `rd(6:$radius.md)` → `style.radius = tok(6, "$radius.md")`; `p(x,y)` → position, **read and recorded on
    the node, never mapped** (a canvas coordinate is not a token).
  - **THE SCOPE LINE MOVES, and say so in the header.** At #299 every atom outside `al()` was read past,
    unrecorded — that was correct for a layout-only branch. Here the converter reads the whole line, so any
    atom it does **not** recognise becomes a `kind: "unread-atom"` drop (E1 **never-read**) carrying the
    atom's verbatim text. This is AC #4's "the record of what was never read starts here".
  - `export function convert(blueprintText, { mode = 1, grain = "component", ids = [], bound = true } = {})`
    → an `ir.root(...)`. Runs `checkIr` on its own output before returning, so a malformed emit fails at the
    converter rather than in the matcher.
- **PATTERN**: `.claude/plans/canvas-spike-s2/layout-branch.txt` — the whole file. The gate proves the lift
  is faithful (see group 40 case 2).
- **IMPORTS**: `./ir.mjs` only.
- **GOTCHA**: `args(src, head)`'s boundary test exists because a bare `indexOf("g(")` matches the `g(` inside
  `svg(icon:caret-right)`. Keep it. **It stays synthetic-only, and say so** — observed: each fixture has
  exactly **one** `svg(` line (the Chevron) and that line carries **no** `al(`, so no committed line reaches
  the collision. S2 measured the same thing and kept the test for #304's sake. It becomes live the first time
  a source draws an icon *inside* an auto-layout node, which is why case 11 drives it on a synthetic line
  and labels it synthetic.
- **GOTCHA**: `layout.size.w` **may be a Number** — `s(360,hug)` on the master's two variant frames puts the
  literal `360` straight on the axis (observed: `{"size":{"w":360,"h":"hug"}}` on "Frame 1" and "Frame 2").
  That is deliberate in S2 and must survive the lift. The **matcher** is the consumer that refuses it.
- **GOTCHA**: `hug:100` → `hug`, with the `:100` recorded as a `qualifier-dropped` row (spike C README caveat 2).
  Both fixtures carry `s(fill,hug:100)` and `s(hug:100,hug:100)` on their text nodes.
- **GOTCHA**: `pad` has **three** shapes — a full four-side array, a **mixed array with `null` holes**, and
  `null`. A `null` side means *"read and could not be mapped"*, never *"unset"* or *"zero"*. Neither fixture
  contains a mixed one; `01-knowledge.md:752` proves it is authorable. Do not collapse the three shapes.
- **VALIDATE**: `node -e "import('./import/brilliant.mjs').then(async m=>{const {readFileSync}=await import('node:fs');const ir=m.convert(readFileSync('import/fixtures/spike-c-instance.blueprint.txt','utf8'));console.log(JSON.stringify(ir).length,'bytes of IR');})"` (expected)
- **REDDENS**: n/a (checks land in group 40).
- **SATISFIES**: AC #1 (the chain's first leg), AC #4 (the never-read class).
- **REGENERATES**: none.

### CREATE `import/recognise.mjs`

- **IMPLEMENT**:
  - The header: recognition runs in code before any prose (architecture `:260-263`, D3/E3); the matcher shape
    is E3's — independent signal predicates each appending a `(slug, score)` candidate → sort → threshold →
    **an explicit floor**. **`"not covered" is a real outcome, never a forced pick** (C5, the vocabulary
    refusal). Pure: no `fs`, no network; the vocabulary is an **argument**.
  - `export const THRESHOLD = 0.5` — E3's number, cited to `.claude/plans/canvas-import-prd-briefing.md:992`.
  - `export const STRUCTURAL_FALLBACK = "stack"` — **the R2 decision, and it is a rule, not an accident.**
    `stack` is **excluded from scoring entirely**. A node that carries `layout` and has no scored candidate
    above `THRESHOLD` becomes `stack`; a node with **no** `layout` and no candidate hits the floor
    (`not covered`). *Why:* `stack`'s only required prop is `direction`, always fillable from `layout.dir`,
    so as a scored candidate it takes `kind-fit` + `prop-fit` + `child-fit` = **0.6 on every laid-out node**
    before anything else is weighed. It would win every container unless a rival landed an exact name — the
    committed fixture's chip cleared it by **0.025**, and a chip a designer called "Pill" would have read
    `stack`. Removing it from the contest replaces that margin with a sentence: **`stack` is what a laid-out
    node falls back to when the system cannot name it more specifically.** AC #1's "the container → `stack`"
    then falls out of the rule instead of out of arithmetic, and "Pill" reads `stack` **honestly** — a
    laid-out box we could not name — with its drops beside it.
  - **`name-match` alone must never clear the threshold — a name is evidence, not proof.** This is the
    second half of the R2 decision and the reason the weight is **0.45**, not 0.5: a node called
    `"Text block"` is not a `text`, and `{text} ⊆ {text,block}` fires the signal anyway. At 0.45 a
    name-only hit sits **below** 0.5 and needs one corroborating structural signal to become a verdict.
    **Assert the invariant, not the constant** (group 40 case 13): a synthetic node matching on name alone
    scores below `THRESHOLD`. The weights may then move freely as long as that holds.
    **State the limit of that in the module header, because it is easy to over-read:** case 13 holds for
    *any* `name-match < THRESHOLD`, so it does **not** pin 0.45 and it does **not** prove `"Text block"`
    lands on the fallback. That second fact is pinned only by case 1's committed answer. Two independent
    checks on the thing that matters — adequate, and worth naming so the next reader does not assume one
    covers the other.
  - `export const TYPE_ROLE_PX = Object.freeze({ display: 40, heading: 24, body: 16, caption: 13 })` — with a
    comment pinning each to its contract token (`--type-display` `clamp(40px,6vw,76px)`, `--type-h2`
    `clamp(24px,2.5vw,34px)`, `--type-body` `16px`, `--type-caption` `13px`, `system/tokens.contract.css:95-102`)
    and **stating that `display` and `heading` are the clamp MINIMA** — a choice, written down, because those
    two roles have no single px. Distance is `contract − source`, S2's pinned sign convention.
  - **Type maps by NEAREST VALUE, and the header says why.** Spacing maps by role because
    `$spacing.md` → `--spacing-md` is a role-to-role correspondence. Type has none: the source's
    `$font.size.md|sm|xs` names a **step of a scale**; `text`'s `role` names a **purpose**
    (display/heading/body/caption). So this one slot maps by nearest value with the distance recorded. This is
    **not** #307's snapping — the `ref` here is present and simply names a different taxonomy.
  - `export const SIGNALS` — a **frozen** array of `{name, weight, test(node, entry, slug, ctx)}`, each
    independent and each named so the verdict can say which fired:
    1. `name-match` (**0.45** — deliberately below `THRESHOLD`, see above) — every word of the entry's slug appears in the slugified
       **`component.name ?? node.name`**. Word-containment, not equality (which would miss `Spike List Row`
       → `list-row`) and not substring (which would fire `text` on `"Text block"`).
       **The `component.name` fallback is load-bearing and was nearly missed — read this before writing the
       signal.** `nodeName()`'s regex is end-anchored, so fixture 1's root line
       (`… inst("Spike List Row") at(state(active)) … "Frame 1" #spikec_inst`) returns **`"Frame 1"`**
       (observed this session). The master name sits inside `inst(…)` and the converter routes it to
       `component.name`. Reading `node.name` alone gives `{frame,1} ⊉ {list,row}` → name-match **0**, total
       **~0.25**, and **the person row reads `not covered`** — AC #1's first named answer, unreachable.
       Fixture 2's root *is* named `"Spike List Row"` (observed), so the master would match and the instance
       would not, and AC #1 is asserted on the **instance**. Write the fallback into the signal's definition;
       do not leave it implied.
    2. `kind-fit` (0.25) — the IR kind is structurally compatible: a node carrying `layout` matches entries
       declaring `childrenCardinality: "many"`; a `text` kind matches entries with a text-bearing required
       prop and `children: []`; an `icon` kind matches nothing today (**#305**).
    3. `prop-fit` (0.25) — the fraction of the entry's **required** props fillable from what was read,
       scaled by the weight. An enum-typed required prop counts as fillable only if the source value is in
       the enum.
    4. `child-fit` (0.1) — every recognised child is in the entry's `children` list and the count respects
       `childrenCardinality`.
  - `export function scoreNode(node, entry, slug)` → `{slug, score, hits: [{signal, field, detail}]}`.
    **`field` is the R1 hardening:** each hit records **which field the signal read** — `component.name`
    vs `name` for `name-match`, the prop names for `prop-fit`. Without it a verdict cannot say why it
    decided, #307's record inherits a claim it cannot show, and a refactor that silently changes the source
    field stays green. With it, group 40 case 1 asserts the root's name hit came from `component.name`
    **by name**.
  - `export function recognise(irNode, vocab)` → a **verdict tree parallel to the IR**, one verdict per node:
    `{path, kind, name, score, hits, candidates: [{slug, score, hits}], covered, via, drops: []}` — where
    `via` is `"scored"` | `"structural-fallback"` | `"floor"`, so a reader (and #311's side-by-side view)
    can tell a won contest from a fallback from a refusal without re-deriving it.
    Candidates sorted **score desc, then slug asc** — the tie-break is explicit, because a stable sort over
    equal scores would otherwise inherit `Object.keys` order and silently depend on `gen-vocabulary`'s
    emission order.
    **Three outcomes, resolved in this order and no other:**
    1. a scored candidate at or above `THRESHOLD` → `{name: <slug>, via: "scored"}`;
    2. else the node carries `layout` → `{name: "stack", via: "structural-fallback"}`;
    3. else the floor → `{name: null, covered: false, via: "floor", reason: "not covered"}` plus a
       `no-vocabulary-slot` drop.
    **The floor never picks the top candidate**, and the fallback never fires for a node that has no
    layout — which is why the Chevron reads `not covered` rather than `stack`.
  - `export const BUILDERS` — frozen, slug → `(node, verdict) => ({name, props, children})`. E3's
    "a slot fills by slug → builder". Ship builders for the slugs the fixtures reach: `stack`, `text`,
    `list-row`, `status-chip`, `list` (the `list` builder emits `list` + N `list-row` children — the ticket's
    "a source list maps to `list` + N `list-row`s"). A builder that cannot fill a **required** prop returns
    `null` and pushes an `unfillable-required-prop` drop (E1 **read-but-never-emitted**).
    **The absorption rule, which decides what happens BELOW a scored node:** an entry declaring
    `children: []` **absorbs** a descendant into an unfilled prop where one fits (`list-row.label` ←
    "Amara Okafor", `.meta` ← "Last seen 2 min ago", `.status` ← the chip's text) and **drops** it otherwise
    (the avatar disc, the chevron, and the nested fallback-`stack` itself) — it **never emits it as a child**.
    Both outcomes are recorded; neither is silent. `stack` lists itself among its allowed children (observed),
    so a fallback-`stack` nested under another `stack` **is** legal and is emitted; nested under a leaf entry
    it is not, and that asymmetry is the rule above rather than a special case.
  - `export function build(irNode, verdict)` — dispatches through `BUILDERS`; an uncovered verdict or a
    missing builder returns `null` with the drop recorded, never a guess.
- **PATTERN**: `.claude/plans/canvas-import-prd-briefing.md:991-993` (E3, verbatim); `system/canvas-ops.mjs`
  (frozen exported tables so the gate iterates rather than re-lists).
- **IMPORTS**: `./ir.mjs` only. **Not** `system/agentic-renderer.mjs` — the gate imports that; keeping it out
  of `import/` keeps the graph to `import/` + node built-ins, which is what AC #2 asserts.
- **GOTCHA — the consumer contract from S2.** `layout.size.w` may be `360`. `recognise`/`build` **must refuse
  any axis that is not `"fill"` or `"hug"`** rather than pass it through as a length: emitting
  `width: 360px` would put a hardcoded literal on a token-contract surface (CLAUDE.md § Ground rules, token
  discipline). Refuse it with a drop naming the axis.
- **GOTCHA — `stack`'s props do not match the IR's `layout`, and that is by design.** Observed:
  `stack.pad` is a **single** enum value ("the space INSIDE the box on all four sides"), `stack.align` is
  **cross-axis only**, and both are single-valued. The IR carries a **four-element** `pad` array and
  `align {main, cross}`. Fixture 2's "Frame 1" has an asymmetric pad (`[sm, md, sm, md]`, observed) and
  fixture 1's "Status chip" has `align.main = "center"` (observed). Neither can be carried. **Record each as a
  `read-then-dropped` drop naming the slot** — do **not** coerce, and do **not** propose a `stack` prop change
  (that is decision **D1** in Open Questions — reopening it needs evidence from a real source, which arrives with #311).
- **GOTCHA — do not put `stack` back in the contest.** It is the declared structural fallback and is
  excluded from scoring (above). A later reader will notice `stack` has no `BUILDERS`-side competition and
  "fix" it; the module header must carry the reason, because the defect it prevents is invisible on the
  committed fixture (it shows up only when a designer names a chip something else).
- **GOTCHA — do not tune the weights to hit the expected answers.** That is this repo's largest gate failure
  class ([[check-that-cannot-fail]]: 59 of 229 process findings). The weights above are a starting point
  chosen by principle — **the designer's own name is the strongest recognition signal** (spike B recognised
  Badge→`status-chip` by name in under a minute; spike C recognised "not covered" in 0:16), so `name-match`
  alone clears the threshold and structure corroborates. If a weight has to move to make a ticket-named
  answer come out, move it **once**, record what moved and why in the module header, and put the
  before/after score table in the PR body.
- **VALIDATE**: `node -e "import('./import/recognise.mjs').then(m=>{console.log('THRESHOLD',m.THRESHOLD,'signals',m.SIGNALS.map(s=>s.name).join(','),'builders',Object.keys(m.BUILDERS).join(','))})"` (expected)
- **REDDENS**: n/a (checks land in group 40).
- **SATISFIES**: AC #1 (the three named answers + the floor), AC #2 (the pure import graph).
- **REGENERATES**: none.

### CREATE `import/fixtures/` — the two blueprint reads

- **IMPLEMENT**:
  ```bash
  mkdir -p import/fixtures
  cp .claude/plans/design-import-spike-c/03-blueprint.txt   import/fixtures/spike-c-instance.blueprint.txt
  cp .claude/plans/design-import-spike-c/03c-master-blueprint.txt import/fixtures/spike-c-master.blueprint.txt
  cp .claude/plans/canvas-spike-s2/layout-branch.txt              import/fixtures/s2-layout-branch.baseline.txt
  ```
  Then prepend **one** comment line to the baseline copy naming what it is: *"frozen copy of #299's parked
  layout branch (`.claude/plans/canvas-spike-s2/layout-branch.txt`); build-checks group 40 case 2 compares
  `import/brilliant.mjs` against THIS file, so the gate does not read `.claude/plans/` — that directory holds
  throwaway spike artifacts and a prune there must not red CI."* Nothing else changes in it.
  Byte-for-byte. Do **not** reformat, renumber or strip the `lookup { … }` provenance line — it names the
  real run (`2026-08-27`) and the element id, which is the honesty contract's evidence.
- **PATTERN**: `scenarios/<slug>/` and `discovery/<slug>/` — fixtures are committed verbatim; provenance
  headers are never edited.
- **IMPORTS**: n/a.
- **GOTCHA**: `.txt`, never `.mjs`. `tooling/drift-check.mjs:29-38` runs `node --check` over every tracked
  `*.mjs` ([[drift-check-syntax-checks-parked-mjs]]) — a parked fragment with a `.mjs` extension reds CI.
- **VALIDATE**: `diff .claude/plans/design-import-spike-c/03-blueprint.txt import/fixtures/spike-c-instance.blueprint.txt && diff .claude/plans/design-import-spike-c/03c-master-blueprint.txt import/fixtures/spike-c-master.blueprint.txt && diff <(tail -n +2 import/fixtures/s2-layout-branch.baseline.txt) .claude/plans/canvas-spike-s2/layout-branch.txt && echo "fixtures identical"` (expected)
- **REDDENS**: n/a.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### CREATE `import/fixtures/spike-c-instance.expected.json`

- **IMPLEMENT**: run the chain once, print the verdict tree through a **canonical stringify** (sorted keys,
  2-space indent, trailing newline — copy `deep()` from `build-checks.mjs:11101-11103` and add the formatting),
  and commit the output. This is the determinism anchor AC #1 turns on.
  **Read it before committing it** — an expected file you did not read is an expectation you did not set.
  It must show, at minimum: the root → `list-row` with `via: "scored"` and its name hit sourced from
  `component.name`; `"Text block"` → `stack` with **`via: "structural-fallback"`**; `"Text 1"`/`"Text 2"` →
  `text` with a `role`; `"Chevron"` (kind `icon`) → `covered: false` with **`via: "floor"`**.
  **Read the `via` values, not just the names** — `via` is the one field that tells D2's rule apart from a
  won contest, and case 3 asserts it. Committed unread, it would be a value nobody has ever looked at.
- **PATTERN**: `replay/<slug>.json` and `discovery/<slug>/prd.md` — a generated artefact committed and
  drift-checked against a re-run.
- **IMPORTS**: n/a.
- **GOTCHA**: the expected file must be produced by the **committed** code, not hand-written. If the observed
  answer differs from the ticket's, **do not edit the JSON** — fix the signals or raise it in the PR body.
  (CLAUDE.md § Ground rules, honesty contract: never hand-write anything presented as a program's output.)
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep import-chain` (expected)
- **REDDENS**: change one `"name"` value in the committed JSON → group 40 case 1 fails naming the node path
  and both answers.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### ADD group 40 to `tooling/build-checks.mjs`

- **IMPLEMENT**: a new `// --- 40 · the import chain (#304) ---` block after group 39, in group 35's voice.
  Cases:
  1. **Determinism (AC #1).** `convert` + `recognise` run **twice** over fixture 1 from two separate
     `await import()` calls with a cache-busting query (`?a`/`?b`) so module-level state cannot make the
     second run trivially equal; `deep()` of both equals `deep()` of the committed `.expected.json`.
     Assert the three ticket-named answers **by node path**, each named in the failure message. For the
     root, assert additionally that its `name-match` hit came from **`component.name`** and name the field in
     the message, so a refactor that drops the fallback fails by name instead of quietly re-reading
     `"Frame 1"`.
  2. **The lift is faithful (#299).** Read `import/fixtures/s2-layout-branch.baseline.txt` — the frozen
     copy, **not** `.claude/plans/canvas-spike-s2/layout-branch.txt`; that directory holds throwaway spike
     artifacts and a prune would red CI on a tree nobody touched. It is a `.txt`, so `await import()` of the
     path fails: read it with `readFileSync` and
     `await import("data:text/javascript," + encodeURIComponent(src))`. Drive both `toStack`s over every
     `al()` line of both fixtures and assert the **`layout` objects** are `deep()`-equal. **Scope the compare
     to `layout`, and say why in the comment:** the lift re-points drop rows through `ir.drop()`, which adds
     a `class` field, so whole-return equality is impossible by construction — without the reason written
     down, a later reader "fixes" the compare by weakening it. This is what makes "lifted, not rewritten" a
     fact rather than a claim.
  3. **The floor, and that it is not the fallback (AC #1).** The `"Chevron"` node (kind `icon`) reads
     `covered: false`, `via: "floor"`, reason `not covered`, and its top candidate scores **below**
     `THRESHOLD`. Assert `via !== "structural-fallback"` **by name** — the two outcomes are one `if` apart,
     and a fallback that stopped testing for `layout` would turn every unrecognised node into a `stack`
     while this case stayed green. Comment: **#305 changes this expected answer** when `icon` enters the
     vocabulary.
  4. **The size-axis refusal (S2's consumer contract).** Fixture 2's `"Frame 1"` carries `size.w === 360`;
     `build` refuses it with a drop naming `size.w`, and **no built composition anywhere carries a numeric
     width**.
  5. **All three E1 classes, by name.** Iterate `DROP_CLASSES`; every class is present in the fixture-2 run
     — `never-read` (an unrecognised atom), `read-then-dropped` (`$spacing.none`, the asymmetric pad, the
     literal size, `align.main`, `hug:100`) and `read-but-never-emitted` (`list-row.value` and
     `status-chip.value` have no source value). Also iterate `DROP_CLASS_OF` against `DROP_CLASSES` so a new
     `kind` with no class **fails by name**.
  6. **The built compositions are real — and the absorption rule is what makes that possible.** Every
     non-null `build()` output passes `validateComposition(VOCAB, …)` (imported at `build-checks.mjs:211`,
     already in scope). **The rule this case depends on, stated so it is not discovered as a failure:**
     *a scored leaf entry absorbs its descendants into props, or drops them — it never emits them as
     children.* Fixture 2's "Frame 1" scores `list-row`, which declares `children: []` (observed), and its
     descendant "Text block" resolves to `stack` via the fallback; emitting that nesting would be refused by
     path. It is not a nesting bug — it is `read-but-never-emitted`, the same class as the unfillable
     `value`. Assert **both halves**: the composition validates, **and** the absorbed/dropped descendants
     appear in the drop list. Without the second half, a builder that silently discarded them would pass.
  7. **The import graph (AC #2).** Read the three `import/*.mjs` sources, extract every `from "…"` specifier,
     and assert the transitive set is `node:*` built-ins plus `./`-relative paths **inside `import/`** —
     nothing from `system/`, `portal/`, `tooling/` or a bare package name. `ok()` names any offender.
  8. **`import/` matches no `loc-summary` group (AC #3).** Call `genLocSummary({ check: true })` (its only
     export, `agent-layer/gen-loc-summary.mjs:32`) and assert `drifted` is empty **after the new files are
     tracked**. This is the real verification; re-stating `GROUPS`' three regexes here would be a second
     implementation that can drift.
  9. **Frozen at both levels.** `KINDS`, `GRAINS`, `MODES`, `DROP_CLASSES`, `DROP_CLASS_OF`, `SIGNALS`,
     `BUILDERS` — a `push`/assignment on each fails and the length is unchanged (group 35's shallow-freeze
     lesson, `build-checks.mjs:11105-11109`).
  10. **Mode and grain on the root (AC #4).** Both fixtures are **component**-grain reads, so assert
      `grain === "component"` on the real converts; assert the `screen` branch and `mode: 2` on **synthetic**
      roots and **label them synthetic in the message**. Assert `root()` throws naming the value on
      `mode: 3` and `grain: "page"`.
  11. **`args`' boundary test, on a SYNTHETIC line, labelled synthetic in the message.** A line carrying both
      `al(h,g(8:$spacing.sm))` and `svg(icon:caret-right)` resolves `g` to the layout gap, not to the `g`
      inside `svg`. No committed fixture line reaches this (each has one `svg(` line and it carries no `al(`
      — observed), so the case states that rather than implying coverage it does not have.
  12. **The `list` builder, on a SYNTHETIC IR fixture, labelled synthetic in the message.** The ticket
      requires "a source list maps to `list` + N `list-row`s", and **neither committed fixture contains a
      list** — so the builder would otherwise ship untested inside an AC-bearing module. Hand-build one IR
      node: a `frame` with `layout` holding three row-shaped children. Assert `build` emits **one** `list`
      with **three** `list-row` children, and that `validateComposition(VOCAB, …)` passes on it (`list`
      declares `childrenCardinality: "many"` and `children: ["list-row"]`, observed).
  13. **A name alone never clears the threshold (the R2 invariant, asserted directly).** A synthetic node
      named exactly after a vocabulary slug, carrying nothing else — no layout, no text, no children —
      scores **below** `THRESHOLD` against that slug. This is the assertion the weights must keep satisfying;
      it is what lets `name-match` move without re-arguing `"Text block"`. Assert it against **every** entry
      in `VOCAB.components` (24 today, read at run time), not one, so a weight change that breaks it fails
      naming the first slug.
  14. **`stack` is the structural fallback, not a candidate.** `"Text block"` resolves
      `via: "structural-fallback"` with `name: "stack"`, and **`stack` appears in no node's `candidates`
      list anywhere in either fixture run** — the property that removes the 0.025 margin. A node with no
      `layout` and no candidate never reaches the fallback (case 3's other half).
  - The `group("import-chain", …)` detail line ends with the **cannot reach** sentence:
    *"What it cannot reach: whether a recognised name is the RIGHT name for a human — that is #311's
    side-by-side view and #316's real run; whether an UNBOUND source snaps correctly — #307's snap rules;
    and whether a built composition RENDERS — group 3 owns `renderComposition`."*
- **PATTERN**: `tooling/build-checks.mjs:11076-11130` (group 35) — the block shape, `deep()`, `threw()`,
  `names()`, and the "a verb with no fixture fails BY NAME" idiom.
- **IMPORTS**: inside the block, `await import("../import/ir.mjs")`, `"../import/brilliant.mjs"`,
  `"../import/recognise.mjs"`, `"../agent-layer/gen-loc-summary.mjs"`. `VOCAB` and `validateComposition` are
  already in file scope (`:318`, `:211`) — **do not re-read `vocabulary.json`**.
- **GOTCHA**: every case must be able to fail. Before declaring the group done, run the **positive control**
  for each REDDENS mutation below and confirm the named failure appears. A green group whose check never
  reached the thing it tested is this repo's largest review-finding class.
- **GOTCHA — the insertion point is not where it looks.** `build-checks.mjs` is 11,853 lines and groups
  **1–34 run at module top level**, but groups **35–39 and the final tally sit INSIDE the standalone-run
  guard** opened at `:11075` (`if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {`)
  and closed at `:11853` — verified by a brace scan this session, since the file has no wrapper function and
  the indentation does not show it. Group 40 goes **inside that guard**: after group 39's closing `}` at
  `:11846`, before `if (failures) {` at `:11848`. A block placed after `:11853` is outside the guard, runs on
  import, and never reaches the tally.
- **VALIDATE**: `node tooling/build-checks.mjs` (expected: `build ✓  all 40 groups pass`)
- **REDDENS** — sixteen mutations (one per case, plus #13 which guards case 1's first answer); run each, confirm the message, revert:
  1. edit one `"name"` in `spike-c-instance.expected.json` → *"the committed verdict and the run disagree at ir.children[1]"*.
  2. change `SPACING["spacing-md"]` from `16` to `12` in `brilliant.mjs` → the lift comparison fails naming the node.
  3. lower `THRESHOLD` to `0` → the Chevron reads covered → *"the floor did not fire"*.
  4. make `build` pass `size.w` through as a width → *"a built composition carries a numeric width on size.w"*.
  5. delete the `unread-al-arg` entry from `DROP_CLASS_OF` → *"kind `unread-al-arg` has no E1 class"*.
  6. give a builder a prop not in its entry → `validateComposition` throws, named by path.
  7. add `import { readFileSync } from "node:fs"` **plus** `import "../system/agentic-renderer.mjs"` to
     `recognise.mjs` → the graph case names `../system/agentic-renderer.mjs` (and **not** `node:fs`).
  8. add a `.mjs` under `system/` in a scratch commit → `genLocSummary({check:true})` reports drift.
  9. replace one `Object.freeze(…)` with the bare literal → *"SIGNALS is not frozen — a push landed"*.
  10. pass `mode: 3` to `root()` → it throws naming `3`.
  11. remove the boundary test from `args` → `g` resolves inside `svg(` and the layout gap is wrong.
  12. make the `list` builder emit the rows without their `list` wrapper → *"expected one `list` with three
      `list-row` children"*.
  13. drop the `component.name` fallback from `name-match` (read `node.name` alone) → the person row reads
      **`not covered`** and case 1 fails naming the root. **Run this one first** — it is the mutation that
      proves AC #1's first answer is actually being decided rather than inherited from a baseline.
  14. raise `name-match` to `0.5` → case 13 fails naming the first slug, and `"Text block"` flips to `text`.
  15. put `stack` back in the scored set → case 14 fails naming `stack` in a candidates list, and the chip's
      margin collapses to 0.025 (print it; that number is the R2 decision's whole justification).
  16. make the structural fallback unconditional (drop the `layout` test) → the Chevron reads `stack` and
      case 3 fails on `via`.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4.
- **REGENERATES**: none — but see the next task: the group **count** moves.

### UPDATE the group count — four claims, three files

- **IMPLEMENT**:
  - `tooling/build-checks.mjs` final line: `all 39 groups pass` → `all 40 groups pass`.
  - `CLAUDE.md:118`: `39 PURE groups` → `40 PURE groups`.
  - `CLAUDE.md:186`: `build-checks' 39 groups` → `build-checks' 40 groups`.
  - `.claude/references/gates.md:11`: `— 39 pure groups, in CI` → `— 40 pure groups, in CI`.
- **PATTERN**: `tooling/drift-check.mjs:171-193` (`checkGroupCount`) — read it; it lists exactly these four
  regexes and reports each stale claim separately.
- **IMPORTS**: n/a.
- **GOTCHA**: **four** claims, not three. [[gate-prose-has-three-copies]] records three; the source
  (`drift-check.mjs:177-181`) defines four, because `CLAUDE.md` states the count **twice**. Verified this
  session. A reworded claim that no longer matches its regex fails as *"states no group count"*.
- **VALIDATE**: `node tooling/drift-check.mjs` (expected: `drift-check     ✓  syntax · … · group-count`)
- **REDDENS**: leave `gates.md` at 39 → *"group-count drift: .claude/references/gates.md: says 39 groups, build-checks defines 40"*.
- **SATISFIES**: the CI `verify` job stays green.
- **REGENERATES**: none (drift-check is a verification, not a generator).

### UPDATE `.claude/references/gates.md` — group 40's entry

- **IMPLEMENT**: add a `**Group 40 — the import chain** (#304)` paragraph in the existing voice, stating what
  it proves and **what it cannot reach** (the same sentence as the `group()` detail line — one clause, three
  copies is the known trap, so write it once and copy it deliberately).
- **PATTERN**: the Group 11 / Group 13 paragraphs — they end with the italic *"…stays unprovable in CI"* clause.
- **IMPORTS**: n/a.
- **GOTCHA**: [[gate-prose-has-three-copies]] — the "cannot reach" clause now lives in `gates.md`, the
  `group()` detail string and this plan. Grep all three before changing any one of them.
- **VALIDATE**: `grep -c "Group 40" .claude/references/gates.md` (expected: `1`)
- **REDDENS**: n/a (prose).
- **SATISFIES**: the repo's gate convention.
- **REGENERATES**: none.

### UPDATE `CLAUDE.md` — the architecture map gains `import/`

- **IMPLEMENT**: a block in the map's code fence, after `discovery/` and before `handoff/`:
  ```
  import/                       the design-import core (epic #295) — Node-only, no portal, no SDK, no page
    ir.mjs                      the intermediate representation both converters emit and the matcher reads
    brilliant.mjs               blueprint read → IR; its layout branch is S2's (#299), lifted not rewritten
    recognise.mjs               IR node × vocabulary → a scored verdict with an explicit "not covered" floor
    fixtures/                   spike C's two committed blueprint reads + the expected verdict
  ```
  Plus a **Where new code goes** bullet: *"**Design-import core** → a module under `import/` (Node-only, node
  built-ins + `import/` only in its graph, matches no `loc-summary` group — asserted by build-checks group 40,
  not assumed); fixtures are committed `.txt`/`.json`, never `.mjs`."*
- **PATTERN**: CLAUDE.md's own rule — *"This map is an INDEX, not a specification"*. One line per file saying
  what it **is**; the invariants stay in each file's header.
- **IMPORTS**: n/a.
- **GOTCHA**: do **not** restate an invariant here that a module header already owns — CLAUDE.md § Ground
  rules calls that a second copy that silently drifts.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/build-checks.mjs` (expected: both green)
- **REDDENS**: n/a (prose).
- **SATISFIES**: the repo's map convention.
- **REGENERATES**: none.

### VERIFY the CI shape (AC #2) end to end

- **IMPLEMENT**: run the gate with `portal/node_modules` moved aside, exactly as `gates.md` prescribes for
  the SDK-free invariant, and run the bare import.
- **PATTERN**: `.claude/references/gates.md`, Group 8: *"Locally: `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`"*.
- **IMPORTS**: n/a.
- **GOTCHA**: `node -e "import('./import/recognise.mjs')"` **passing on this machine proves little** — this
  machine has `portal/node_modules`. The `mv` run is the control that makes it mean something, and group 40
  case 7 is the version that runs in CI.
- **VALIDATE**:
  ```bash
  node -e "import('./import/recognise.mjs').then(()=>console.log('recognise imports clean'))"
  mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
  ```
  (expected: `recognise imports clean`, then `build ✓  all 40 groups pass`)
- **REDDENS**: add `import { query } from "@anthropic-ai/claude-agent-sdk"` to `recognise.mjs` → the `mv` run
  fails to import, and group 40 case 7 names the bare specifier.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### VERIFY `gen-loc-summary --check` is unchanged (AC #3)

- **IMPLEMENT**: `git add` the new files first (the generator reads the **git index**, not the working tree),
  then run the check.
- **PATTERN**: [[loc-summary-counts-tracked-only]] — `gen-loc-summary` reads `git show :<path>`, so a
  `--check` before staging is a false "no drift".
- **IMPORTS**: n/a.
- **GOTCHA**: the memory is the trap in **both** directions: unstaged new files give a false green, and a
  staged file that *did* match a group would give a real red. Stage, then check.
- **VALIDATE**: `git add import/ && node agent-layer/gen-loc-summary.mjs --check` (expected: `loc summary ✓  3 groups — no drift` — **observed on the pre-change tree this session**)
- **REDDENS**: temporarily `git add` a file at `system/probe.mjs` → `loc summary ✗ drift from tracked source: system/loc-summary.json`.
- **SATISFIES**: AC #3.
- **REGENERATES**: none — that is the point of the AC.

---

## TESTING STRATEGY

No test suite, no linter, no type-check — CLAUDE.md § Ground rules: *"don't hunt for or invent one."* The
gate **is** the test, and it runs in CI.

### Unit-equivalent

Group 40's fourteen cases. Each drives a real function over real committed input; none greps a source for a
constant. Where a module-private value must be asserted, the function that uses it is **run** (group 11's
`KEEP_WHOLE` precedent).

### Integration-equivalent

Cases 1, 6 and 8: the whole chain end to end (blueprint text → IR → verdict → built composition →
`validateComposition`), and the generator-level assertion that `import/` moved no counted artefact.

### Edge Cases

| case | fixture | expected |
|---|---|---|
| a `$spacing.none` with no contract token | both, ×6 | `no-token` drop, slot omitted, **never coerced to `xs`** (S2's C5 control) |
| a fixed px on an auto-layout axis | fixture 2, ×2 | `size.w === 360` carried on the IR, **refused** by `build` |
| `hug:100` | both, on every text node | → `hug`, `:100` recorded as `qualifier-dropped` |
| an asymmetric pad | fixture 2 "Frame 1" | `[sm, md, sm, md]` on the IR; `stack.pad` is single-valued → `read-then-dropped` |
| `align.main` | fixture 1 "Status chip" | `"center"` on the IR; `stack.align` is cross-axis only → `read-then-dropped` |
| an icon with no vocabulary entry | both, "Chevron" | **`not covered`** (#305 changes this) |
| a required enum prop with no source value | `status-chip.value`, `list-row.value` | `read-but-never-emitted` |
| a one-value `pad()` | fixture 1 "Text block" | expands to four sides (CSS convention, recorded as unconfirmed by S2) |
| `svg(` and `g(` on one line | both | `g` resolves to the gap, never to `svg`'s `g` |
| a mixed `pad` (some sides mappable) | **neither** — synthetic | `null` holes mean *"read, unmappable"*, never zero/unset |

### Proving the checks

Every REDDENS mutation above is **run before the group is trusted**, with the unmutated tree as the positive
control. Record the observed failure message for each in `.claude/reports/` — a check whose reddening
mutation you have not run is a check you have not specified.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node tooling/drift-check.mjs          # includes node --check over every tracked *.mjs, and the group count
```

### Level 2: The gate

```bash
node tooling/build-checks.mjs         # expect: build ✓  all 40 groups pass
```

### Level 3: The CI shape

```bash
git add import/ && node agent-layer/gen-loc-summary.mjs --check
node -e "import('./import/recognise.mjs').then(()=>console.log('clean'))"
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```

### Level 4: Manual validation

Drive the chain by hand over both fixtures and **read the verdicts**:

```bash
node -e "
import('./import/brilliant.mjs').then(async (b) => {
  const { recognise } = await import('./import/recognise.mjs');
  const { readFileSync } = await import('node:fs');
  const VOCAB = JSON.parse(readFileSync('handoff/verdant/vocabulary.json','utf8'));
  for (const f of ['import/fixtures/spike-c-instance.blueprint.txt','import/fixtures/spike-c-master.blueprint.txt']) {
    const ir = b.convert(readFileSync(f,'utf8'));
    console.log('===', f);
    console.log(JSON.stringify(recognise(ir, VOCAB), null, 1));
  }
});"
```

Confirm by eye: the person row reads `list-row`, the container `stack`, the labels `text` with a role, the
chevron `not covered`, and every drop carries an E1 class.

### Level 5: Not applicable

No journey driver, no pixel gate, no morph gate — nothing on a shipped page changed. `vt-verify`,
`catalog-journey`, `studio-journey` and `visual-regression` are all out of reach by construction, and the
PR body should say so rather than leave it implied.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| *(none)* | — | — | — |

Deliberately empty. Both fixtures are committed; S2 proved the layout branch offline; there is **no agent
run, no MCP call, no Brilliant session, no token spend** anywhere in this ticket. The first paid step on this
path is #311's recorded import.

---

## ACCEPTANCE CRITERIA

Traced to the ticket's own four, each with the gate case that proves it.

- [ ] **AC #1** — group 40 feeds fixture 1 through `brilliant → ir → recognise` and asserts the **same answer
      every run** (case 1, two independent module instances, compared against the committed
      `spike-c-instance.expected.json`): the person row → `list-row` (scored, its name hit named as coming
      from `component.name`), the container → `stack` (**`via: "structural-fallback"`** — D2's rule, not a
      won contest), the label → `text` by role. A node below the floor and carrying no layout reads
      `not covered`, never a forced name and never a fallback `stack` (case 3, which asserts `via`).
- [ ] **AC #2** — `node -e "import('./import/recognise.mjs')"` works with no `portal/node_modules`; the
      transitive import graph is node built-ins + `import/` only, asserted in CI (case 7) **and** driven
      locally with `node_modules` moved aside.
- [ ] **AC #3** — `gen-loc-summary --check` unchanged, **asserted not assumed**: group 40 calls
      `genLocSummary({check:true})` and requires `drifted` to be empty (case 8).
- [ ] **AC #4** — the IR root carries `mode` (1|2) and `grain` (component|screen); a bad value throws naming
      it; the `never-read` drop class exists and is exercised (cases 5 and 10). *(The ticket conflates mode
      with grain — see Open Questions Q2; this plan carries both, as two fields.)*
- [ ] Group count moved in **four** claims across three files; `drift-check` green.
- [ ] `gates.md` carries group 40 with its "cannot reach" sentence; `CLAUDE.md`'s map carries `import/`.
- [ ] **D2 and D3 hold as invariants, not as numbers**: `stack` appears in no `candidates` list (case 14)
      and a name-only match scores below `THRESHOLD` against **every** vocabulary entry (case 13).
- [ ] Every REDDENS mutation run and its observed message recorded in the report — #13 first.
- [ ] The PR body states, out loud, that **no standing rule applies** (Node-only, no shipped page, no
      `system/` file, no token, no live control, no baseline) — the ticket asks for this explicitly.
- [ ] The PR body carries `Closes #304`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's VALIDATE run, output pasted into the report
- [ ] `node tooling/build-checks.mjs` → `all 40 groups pass`
- [ ] `node tooling/drift-check.mjs` → green
- [ ] `git add import/ && node agent-layer/gen-loc-summary.mjs --check` → no drift
- [ ] The `mv portal/node_modules` run green
- [ ] Every REDDENS mutation driven and reverted
- [ ] The expected-verdict JSON read by a human before it was committed
- [ ] Plan, report and review all in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`)

---

## OPEN QUESTIONS / ASSUMPTIONS

### Decisions taken here (not questions)

**D1 — the IR is richer than the component props, and the difference is recorded as drops. DECIDED.**
Observed: `stack.pad` is a **single** enum value, `stack.align` is **cross-axis only**; the IR carries a
four-side `pad` and `align {main, cross}`, and both real fixtures exercise the gap (an asymmetric pad
`[sm, md, sm, md]` on "Frame 1", `align.main: "center"` on "Status chip"). Each becomes a
`read-then-dropped` drop naming its slot. Nothing is coerced.

*Grounds, checked rather than assumed:* the architecture describes the IR as *"what both converters emit and
the one thing the matcher reads"* (`:165`) and **nowhere equates it to a component's props**; recognition and
emission are separate stages by design (E2's staged diagnostics), which is the same separation that lets
`status-chip` be recognised and then fail to emit. S2's README already routed the adjacent question
(*"whether a layout container's size prop needs a fixed-px case"*) to #301, and **#301 closed without taking
it**.

*The escalation trigger, so this decision can be wrong out loud rather than quietly:* widening `stack`'s
props reopens a **merged** prop set and takes the `/components` baseline lock, so it needs evidence, and the
evidence is not a fixture. **If a real (non-fixture) source's drop list is dominated by `pad`/`align` rows,
that is the signal to reopen it** — and the first real source arrives with #311, not here. Until then this
ticket records the drops and says so in the PR body.

**D2 — `stack` is the declared structural fallback, excluded from scoring. DECIDED.**
As a scored candidate it takes 0.6 on **every** laid-out node (its one required prop, `direction`, is always
fillable from `layout.dir`), so it would win every container unless a rival landed an exact name — the
committed chip cleared it by **0.025**. Removing it from the contest replaces that margin with a rule:
a laid-out node with no candidate above the threshold **is** a `stack`; a node with no layout and no
candidate hits the floor. AC #1's "the container → `stack`" now falls out of the rule, and a chip a designer
called "Pill" reads `stack` honestly instead of by a coin flip. Proven by group 40 case 14 (`stack` in no
`candidates` list) and case 3 (`via` distinguishes fallback from floor).

**D3 — a name alone never clears the threshold. DECIDED.**
`name-match` is **0.45** against a threshold of **0.5**, because `{text} ⊆ {text,block}` fires on a node that
is plainly not a `text`. A name is evidence; one corroborating structural signal turns it into a verdict.
The **invariant** is what group 40 case 13 asserts (over all 24 entries, read at run time), not the constant
— so the weights stay movable and `"Text block"` never has to be re-argued.

**D4 — every signal hit records the field it read.** `hits` are `{signal, field, detail}`, not bare names.
Without `field`, a verdict cannot show its working, #307's record inherits a claim it cannot evidence, and a
refactor that changes `name-match`'s source field from `component.name` back to `name` stays green while
breaking AC #1's first answer. Case 1 asserts the root's hit came from `component.name` by name;
reddens #13 is the mutation that proves it.

**D5 — a scored leaf entry absorbs its descendants into props or drops them; it never emits them as
children. DECIDED.** Observed: `list-row` declares `children: []` and `stack` lists itself among its allowed
children. So fixture 2's "Frame 1" → `list-row` has a fallback-`stack` descendant that `validateComposition`
would refuse as a child — correctly. The nesting is not the defect; emitting it would be. Absorbed and
dropped descendants are both recorded (`read-but-never-emitted`), and group 40 case 6 asserts both halves,
because a builder that discarded them silently would otherwise pass.

### Still open



**Q1 — the ticket's "Polaris/Badge → `status-chip` case from spike B" names an artefact that does not exist.**
Observed at `.claude/plans/design-import-epic-prd-handoff.md:376-379`: spike B **rejected** Polaris Badge in
under a minute precisely *because* `status-chip` already covered it, and ported Polaris **Avatar** instead.
There is no Badge fixture anywhere in the repo. What the ticket is asking for is the **recognition-hit** case
— a source status pill that must resolve to the existing `status-chip` rather than propose a new component —
and spike C's fixture contains exactly that node (`"Status chip"` with `t("Active")` / `t("On call")`). This
plan uses it and **states the correction in the PR body**. If the owner wants a genuine second *source*
(a hand-written Polaris-shaped blueprint), say so: it is ~30 lines of fixture and one gate case, and it is
additive.

**Q2 — the ticket conflates Mode with grain (decided here, reported for confirmation).** AC #4 reads *"Mode 1 / Mode 2 is carried on the IR root (a
screen read vs a component read …)"*. But the PRD defines Mode 1 as *"the component JOINS the system"* and
Mode 2 as *"it stays FROZEN as a brand-locked exhibit, labelled as the original"* (`canvas-design-import.prd.md:103`,
and the handoff doc `:23-26`) — an honesty fork, C3. The **grain** (component vs screen) is a separate axis,
named two paragraphs later in the same PRD line 139 (*"Two grains"*). They are different questions and this
plan carries **both fields**: `mode: 1|2` (which #307's `provenance.mode` consumes) and `grain:
"component"|"screen"` (which #311's placement consumes). G7's rule — a frozen exhibit never inside a frame —
is enforceable only against `mode: 2`, which is the argument for keeping them apart. **Flagged, not blocking.**

**Q3 — neither committed fixture is a screen read.** Both are component-grain (a master with variant axes and
an instance of it). So `grain: "screen"` has no real fixture at #304 and is asserted synthetically, labelled
as synthetic in the gate's message. The first real screen read arrives with #311/#316. Stated rather than
papered over.

**Assumptions this plan makes:**

1. The matcher returns a verdict **per node**, not a consumed subtree. AC #1 names three answers on one
   fixture (root, container, label); a consuming walk would make two of them unreachable. Who consumes whom
   is #311's mapping editor.
2. `recognise.mjs` takes the vocabulary as an **argument** rather than reading it. Keeps the module pure, and
   makes AC #2 trivially true instead of dependent on path resolution (this repo's path contains a space —
   `pathToFileURL`, not `file://${argv[1]}`; see `gen-loc-summary.mjs:70-72`).
3. Type maps by **nearest value**, spacing by **role**. Stated with its reason in the module header, because
   it looks like an inconsistency until you see that `$font.size.md` and `role: "body"` name different things.
4. `display` and `heading` compare at their clamp **minima** (40, 24). A choice; written down; nothing in the
   fixtures is near either.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

| # | Ran | Observed | Effect on the plan |
|---|---|---|---|
| 1 | `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` | AC #3's baseline is green **before** the change; the task now says "stage first", per [[loc-summary-counts-tracked-only]] |
| 2 | The three `GROUPS` regexes against five candidate `import/` paths | all **false** | AC #3 is satisfiable — but `GROUPS` is module-private (`gen-loc-summary.mjs:22`, only `genLocSummary` is exported at `:32`), so case 8 **calls the generator** instead of copying the regexes |
| 3 | S2's `layout-branch.txt` copied to scratch as `.mjs` and driven over `03-blueprint.txt` | 2 `al()` nodes; "Text block" `{dir:"column", gap:{ref:"--spacing-xs",value:4}, pad:null, align:{main:null,cross:null}, size:{w:"fill",h:"hug"}}` + 1 `no-token` drop; "Status chip" 4-side pad `[xs,sm,xs,sm]`, `align:{main:"center",cross:"center"}` + 1 `no-token` drop | Every IR literal in this plan is observed, not recalled. It also **surfaced the `align.main` gap** against `stack`'s cross-axis-only prop (Q1) |
| 4 | Same, over `03c-master-blueprint.txt` | 6 `al()` nodes; "Frame 1"/"Frame 2" `size:{w:360,h:"hug"}` + a `literal-size` drop each; **asymmetric pad** `[sm,md,sm,md]` | Confirmed S2's README exactly (6 nodes, 4 `no-token`, 2 `literal-size`). Surfaced the **asymmetric pad** gap (Q1) and pinned case 4's subject |
| 5 | `Object.keys(vocabulary.components).length` | **24** | Spike B and spike C prose say 20/21 — months stale. **No count literal goes in the gate**; case assertions read the length at run time |
| 6 | Required props + enums for all 24 entries | `status-chip` requires `value[ok\|due\|overdue]`; `list-row` requires `label` **and** `value` ("the row's primary computed figure") | The fixture's `"Active"`/`"On call"` is **not** in `status-chip`'s enum, and the person row has **no figure** → both are `read-but-never-emitted`. This is what makes E1's third class non-empty at #304 — S2's README said its own branch produced none |
| 7 | `icon` in the vocabulary | **absent** | The chevron must read `not covered`; case 3 comments **#305** as the ticket that changes the answer |
| 8 | `tooling/drift-check.mjs:171-193` read | **four** claims: `build-checks.mjs`, `CLAUDE.md` ×2, `gates.md` | [[gate-prose-has-three-copies]] says three. Corrected to four, with the line numbers |
| 9 | `grep -rn "39 groups\|39 PURE\|39 pure"` | `build-checks.mjs:11852`, `CLAUDE.md:118`, `CLAUDE.md:186`, `gates.md:11` | Exact edit sites pinned |
| 10 | Epic ticket states (`gh issue view`) | #299 #301 #303 **CLOSED**; #296 #297 #298 #300 #302 also closed | #304 is unblocked, and **#302 has already landed**, so `system/canvas-ops.mjs` and build-checks groups 35–36 exist as patterns to copy |
| 11 | `system/tokens.contract.css:95-102` | `--type-display` and `--type-h2` are `clamp()`, `--type-body` 16px, `--type-caption` 13px | `TYPE_ROLE_PX` cannot be four plain numbers without a stated rule — hence the "clamp minima, written down" assumption |
| 12 | `grep "svg(" ` over both fixtures | one line each | `args`' boundary test moves from *defensive* (S2's word) to *load-bearing*, because #304 reads the whole line. Case 11 added |
| 13 | `.claude/plans/design-import-epic-prd-handoff.md:376-379` | Badge **rejected**, Avatar ported | Q2 — the ticket's second-fixture phrasing names a non-existent artefact |
| 14 | `canvas-design-import.prd.md:103` vs `:139` | Mode is the join-vs-freeze fork; grain is component-vs-screen | Q3 — the ticket conflates them; the plan carries both fields |
| 15 | Every `file:line` in this plan resolved with `sed -n` | all 29 distinct citations land on the line claimed | No unverified pointer ships. `01-knowledge.md:606` (wrap + cross-axis gap) and `:752` (the authorable mixed pad) both confirmed — they are the only two claims that make `unread-al-arg` and the mixed-`pad` shape live rather than hypothetical |
| 16 | Brace scan for `build-checks.mjs`'s top-level blocks | **one** — the standalone-run guard at `:11075`, closing at `:11853` | Groups **35–39 and the tally live inside that guard**; groups 1–34 do not. The insertion point is `:11846`–`:11848`, which neither the indentation nor a glance at the tail reveals |
| 17 | `svg(` line count per fixture | **1** each, and that line carries no `al(` | Corrected an over-claim: `args`' boundary test stays **synthetic-only** at #304. Case 11 now says so instead of implying fixture coverage |
| 18 | `nodeName()` driven over both fixture **root** lines | instance → `"Frame 1"`; master → `"Spike List Row"` | **The correction that mattered.** `name-match` reading `node.name` alone gives the person row **`not covered`** — AC #1's first named answer, unreachable. The signal now reads `component.name ?? node.name`, and a gate assertion names the field |

### Why the matcher's weights are argued, not fitted

The one real risk in this ticket is a matcher tuned backwards from the ticket's three named answers. That is
[[check-that-cannot-fail]] in its purest form: the gate would go green because the code was shaped to the
assertion. The defence is a **principle stated before the numbers**, and it comes from the two spikes:

> Both human recognitions were made **by name, in under a minute**. Spike B saw "Badge" and said `status-chip`.
> Spike C saw a person row and said "not covered". Neither counted props.

So `name-match` is the heaviest signal (**0.45**) and the three structural ones corroborate rather than
decide. But it stops **just short** of deciding on its own (**D3**): `{text} ⊆ {text,block}` fires on a node
that is plainly not a `text`, so a name is evidence and one structural signal is what turns it into a
verdict. And `stack` is not in the contest at all (**D2**) — it is what a laid-out node falls back to.
Traced by hand against the fixture, those three rules produce the ticket's answers:

| node | source name | entry | `name-match` | `kind-fit` | `prop-fit` | `child-fit` | total | verdict |
|---|---|---|---|---|---|---|---|---|
| root | `component.name` `"Spike List Row"` → `{spike,list,row}` ⊇ `{list,row}` | `list-row` | 0.45 | 0 (leaf entry, node has children) | 0.125 (`label` yes, `value` — "the row's primary computed figure" — **no**) | 0 | **0.575** | `list-row`, scored |
| "Text block" | `{text,block}`; `{text}` ⊆ it, so `text` fires | `text` | 0.45 | 0 | 0 (`content` not on its own read) | 0 | **0.45** | **below 0.5 → structural fallback → `stack`** |
| "Text 1" | `{text,1}`; `{text}` ⊆ it | `text` | 0.45 | 0.25 | 0.25 (`role` from 16px, `content` from `t()`) | 0.10 | **1.05** | `text` (`role: "body"`, distance 0), scored |
| "Status chip" | `{status,chip}` ⊇ `{status,chip}` | `status-chip` | 0.45 | 0 | 0.125 (`label` yes, `value` enum **no**) | 0 | **0.575** | `status-chip`, scored + an unfillable-`value` drop |
| "Chevron" | `{chevron}` matches nothing | — | 0 | 0 | 0 | 0 | **0** | no candidate, **no `layout`** → **not covered** |

Scores are sums of weights and do not normalise to 1 — only the threshold matters. `stack` appears in no
row because it is not a candidate; it is the rule the second row lands on.

`"Text block"` is the row the two R2 decisions were made for. `text` fires `name-match` on it
(`{text} ⊆ {text,block}`) and nothing else, so it lands on **0.45** — below the threshold **by rule**, not by
a margin — and the node falls back to `stack`. Under the pre-decision weights it would have been a 0.5-vs-0.6
coin flip against `stack`-as-candidate. Print the full candidate list for every fixture node and put it in
the PR body anyway; the numbers are a starting point, the two rules are not.

That is a hand trace, **not** an observation — the implementer's first job after Phase 3 is to print the real
table and compare. If it disagrees, the fix is a principled weight change recorded in the header, or a ticket
comment; never an edit to the expected JSON.

### Why `import/` is top-level and not `tooling/` or `system/`

Three measurable reasons, all in the architecture's § Placement (`:271-276`) and worth restating in the module
headers so a future editor does not "tidy" it:

1. `system/*.mjs` is counted by `gen-loc-summary` and rendered on `approach.html`. A converter is not a
   view-time module and should not move that number.
2. `tooling/` is where gates and operator scripts live; `import/` is **product code the gate drives**, the
   same relationship `discovery/` has to group 29.
3. CI must import it with no `portal/node_modules` — which is why the vocabulary is an argument and the
   import graph is asserted rather than assumed.

### Sequencing note

Phases 1 and 3 can be written before Phase 2 exists (the matcher reads IR, not blueprints), so an implementer
blocked on the converter's atom grammar can still land the matcher against hand-built IR nodes. The gate needs
all three. Nothing in this ticket touches a file another open epic ticket touches — #305 and #306 (the only
other open wave-4 tickets) move `system/` and `portal/`, not `import/` — so there is **no lock** to take:
no op lock (no op), no baseline lock (no baseline), no `/components` collision (no spec).

## AMENDMENTS

<!-- append-only; newest at the bottom -->

- 2026-09-22 — **R1/R2/R3 addressed as decisions rather than flags, before any code was written.**
  R1 (`name-match` reading the wrong field, which made AC #1's first answer unreachable — observed:
  `nodeName()` returns `"Frame 1"` for fixture 1's root) → **D4**, plus the field-named assertion in case 1
  and reddens #13. R2 (`stack` scoring 0.6 on every laid-out node, leaving the chip a 0.025 margin) →
  **D2** + **D3**, two rules replacing two arithmetic accidents; cases 13 and 14 and reddens #14–#16 added,
  the hand-trace table recomputed, `name-match` 0.5 → 0.45, and **D5** added because D2's fallback
  `stack` can land under a scored leaf entry (case 6 now asserts absorption AND the drop rows).
  R3 (the `stack` prop mismatch) → **D1**, a
  decision with a named escalation trigger (a real source whose drop list is dominated by `pad`/`align`
  rows, which arrives with #311) instead of an open question. Gate: 12 cases → **14**, 13 mutations → **16**.

- 2026-09-22 — **Nine plan errors found during implementation, each fixed in the plan's spirit and
  logged here rather than silently.** Five are specification errors the gate would otherwise have
  inherited; four are gate cases that could not fail.
  **PE1 (blocking, caught before any code):** case 13 is unsatisfiable as written. `child-fit`'s
  definition ("every recognised child is in the entry's `children` list and the count respects
  `childrenCardinality`") is **vacuously true of a childless node**, so the synthetic name-only node
  scores 0.45 + 0.10 = **0.55 ≥ THRESHOLD** against `avatar` and case 13 fails on the first entry it
  touches. Fixed by definition, not by weight: `child-fit` fires only on **≥ 1 recognised child**,
  because "no disallowed children" is evidence of nothing. The case's node is kind `shape` with no
  layout so no structural signal fires. Hand-trace row "Text 1" moves 1.05 → 0.95; no verdict changes.
  **PE2:** reddens #5 does not redden. Deleting a `DROP_CLASS_OF` entry leaves case 5 green —
  iterating the table catches a class that is WRONG and never one that is MISSING, and
  `unread-al-arg` is produced by neither fixture, so nothing else calls `drop()` with it. Case 40.5
  gained a source census of every kind literal handed to `drop()`.
  **PE3:** case 12 cannot pass honestly. `list.empty` is REQUIRED and a design read carries no
  empty-state copy, so a built `list` can only exist if the importer invents the designer's words.
  The case now asserts the RECOGNITION (`list` + three `list-row`s — which is what the ticket's
  sentence actually claims), the builder's wrapper shape, and the container's **refusal by name**.
  **PE4:** D5's worked example names fixture 2's "Frame 1" as the node that scores `list-row`. It
  cannot — it is named "Frame 1" and `name-match` is word containment, so it reads `stack` via the
  fallback. Absorption is exercised by **fixture 1's root** (name via `component.name`) and fixture
  2's root instead; both are "Spike List Row".
  **PE5:** the edge-case table claims `align.main` on fixture 1's "Status chip" becomes a
  `read-then-dropped` row. It does not: that node resolves to `status-chip`, not `stack`, so
  `stack`'s cross-axis-only prop is never consulted. No node in either fixture reaches the fallback
  with a non-null `align.main`. D1's gap is exercised by the **asymmetric pad** on fixture 2's
  Frame 1/Frame 2 instead, which was the plan's other named subject.
  **PE6:** `convert`'s `ids`/`bound` options would have the CALLER assert provenance. Both are now
  derived from the read — fixture 2 is genuinely `bound: false` (a raw `#7C6BF0` stroke and `rd(16)`),
  which `bound = true` would have misreported.
  **PE7:** D1 demands a drop row for the pad/align prop-shape gap and `DROP_CLASS_OF` has no kind for
  it. Added `prop-shape` → `read-then-dropped`.
  **PE8:** case 40.7's `from "…"` regex misses the side-effect `import "x"` form — which is exactly
  the shape of reddens #7's own mutation. Widened to three forms.
  **PE9:** case 40.9's freeze probe leaves the smuggled entry in an UNFROZEN roster, so `SIGNALS`
  then carries a string where a predicate belongs and the next case dies on an unguarded TypeError
  before `group()` prints anything — group 35's recorded `fold()` lesson, live. The probe now undoes
  itself, and every constructive call in the group routes through a `fold()`.
  Gate: 14 cases → **15**, 16 mutations → **19**. Three tie-break rungs were added to `recognise` for
  two ties the plan did not anticipate; see the report's Additions section.
