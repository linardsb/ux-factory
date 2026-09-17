# Feature: S2 — Blueprint auto-layout → `stack`

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files etc.

**This is a spike.** Its product is a verdict with evidence behind it, not a feature. The converter code is
throwaway *except* the layout branch, which #304 lifts. Nothing under `system/`, `agent-layer/`,
`tooling/` or `handoff/` is added, edited or deleted — the S1 precedent sentence, and it is literal.

## Feature Description

Write the Brilliant→IR converter's **layout branch alone** and run it over spike C's committed fixture, to
answer one question: does the fixture's auto-layout syntax land as one token-spaced flex container with
**no literal**? The answer decides the shape of `stack`, the first new primitive (#301), and whether the
epic's "token work" row fires.

## User Story

As the operator who will import a Brilliant design into the factory
I want the converter's layout mapping proven against a real read before `stack` is specified
So that `stack`'s prop set is confirmed by evidence rather than guessed, and any token the contract lacks
is named now — while it is still a `tokens.source.json` edit in #301 and not a retrofit after the
primitive ships.

## Problem Statement

`stack` is about to go through the full component chain in #301 with a prop set — `direction · gap · pad ·
align · size` — that nobody has tested against a real design read. If the source's layout vocabulary
carries anything that prop set cannot express as a token, #301 ships a primitive that forces a literal
into `components.css`, which is a token-discipline bug by CLAUDE.md's own rule, and the import path built
on it in #304 inherits the defect. The contract's spacing scale starts at `--spacing-xs: 4px`
(`system/tokens.contract.css:55`, observed) and the fixture references `$spacing.none` — so there is a
concrete reason to think the answer is not "lossless".

## Solution Statement

Write the layout branch as a small pure ESM module (parked as `.txt`), run it over the two committed
blueprint reads, and print a per-node mapping table with the distance for every value and an explicit
could-not-map list. Cross-check every mapping row against `04-htmlflex.html` — Brilliant's own resolution
of the same nodes into CSS — so each row is observed rather than recalled. Prove the converter with a
positive-control battery before trusting a green, then write the verdict, take a branch, and post it to
epic #295.

## Out of Scope / Non-Goals

- **Not included: anything but layout.** `rd(9999:$radius.full)`, `f[(…tok(color.*))]`, `t(…)` typography,
  `st[…]` strokes, `svg(icon:…)` are read past. The contract also has no radius token at 9999
  (`--radius-lg: 16px` is the top, observed) — **noted as an adjacent observation, explicitly not a
  verdict input.** Letting radius decide S2 answers a question the ticket did not ask.
- **Not included: writing `stack`.** No spec, no `components.css` block, no renderer template, no
  `tokens.source.json` edit. S2 *names* a missing token; #301 adds it.
- **Not included: `import/ir.mjs`, `import/brilliant.mjs`, `import/snap-rules.mjs`.** The `import/`
  directory does not exist and this ticket does not create it (`ls import/` → No such file or directory,
  observed). The branch is parked in the spike directory for #304 to lift.
- **Not included: a live Brilliant MCP call.** The fixture is committed. No spend, no session binding.
- **Not included: the unbound / by-value snap path (G18).** The fixture is token-bound on every layout
  slot; the snap table is #304's.
- **Not changing:** every gate, every generated artifact, every shipped page.

## Feature Metadata

**Feature Type**: Spike (throwaway, except one parked file)
**Estimated Complexity**: Low–Medium — the parsing is small; the judgement about zero is the work
**Primary Systems Affected**: none at runtime. `.claude/plans/canvas-spike-s2/` only
**Dependencies**: none. Node ESM, zero-dep, no `npm install`

## Related Work

**Implements**: [#299](https://github.com/linardsb/ux-factory/issues/299)   ·   **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295) ·
`docs/epics/canvas-design-import.architecture.md` § Spikes (S2) and § The intermediate representation

**Back-references**:

- `.claude/plans/canvas-spike-s1-substrate-load-297.md` + `.claude/plans/canvas-spike-s1/README.md` —
  Why: the sibling spike in the same epic; its README's shape (Verdicts table → Setup → controls →
  Not done → Files) and its "nothing under `system/` moved" sentence are the precedent this one follows.
- `.claude/plans/design-import-spike-c/README.md` — Why: produced the fixture, ruled `hug:N` → hug
  (README:92), and made the "blueprint is the better converter input" call this spike partially
  contradicts on one axis.

**Forward-references**:

- #301 (`stack` + `text` through the chain) — consumes this verdict; blocked on it by the epic's rule.
- #304 (the Brilliant converter) — lifts `layout-branch.txt` rather than rewriting it (AC #2).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/plans/design-import-spike-c/03-blueprint.txt` (10 lines) — **the ticket's named fixture**, the
  expanded instance `1db1b29957b949ca`. Read every line; it is the primary input.
- `.claude/plans/design-import-spike-c/03c-master-blueprint.txt` (14 lines) — **the master.** The ticket
  cites the syntax `al(h,y(c),g,pad)`; that form is **here, not in `03-blueprint.txt`** (pre-flight,
  see NOTES P1). The secondary input.
- `.claude/plans/design-import-spike-c/04-htmlflex.html` (12 lines) — Brilliant's own resolution of the
  **same instance** into CSS. The cross-check for every mapping row: `align-items: center`,
  `flex: 1 0 0`, `align-self: stretch`, `justify-content: center`, `padding: 8px 12px 8px 12px`.
- `.claude/plans/design-import-spike-c/02-fixture.dsl.txt` (24 lines) — the authoring DSL the fixture was
  created from. Shows the 1- and 2-value `pad()` forms that the *read* never emits.
- `.claude/plans/design-import-spike-c/README.md` (lines 12–13, 57, 91–92) — Q1/Q2, the facet table's
  layout row, and the `hug:N` → hug ruling. **Cite line 92 rather than re-deriving it.**
- `system/tokens.contract.css` (lines 55–67) — the spacing scale (`xs 4 · sm 8 · md 16 · lg 24 · xl 32 ·
  2xl 48 · 3xl 64 · 4xl 96`) and the radius scale (`sm 4 · md 8 · lg 16`). **There is no zero step and no
  full/pill radius** (grep for `spacing-none|spacing-0|radius-full|radius-pill` → no matches, observed).
- `docs/epics/canvas-design-import.architecture.md` lines 165–169 — **the IR shape the branch must emit**:
  `{kind, layout {dir, gap, pad, align, size}, style, text, icon {name}, component {…}, children}` where
  every tokenisable value is `{ref?, value}`.
- `docs/epics/canvas-design-import.architecture.md` lines 302–308 — S2's question, spike and decision rule
  verbatim.
- `.claude/plans/canvas-spike-s1/README.md` — the README shape to mirror, including the controls table
  (`| control | mutation | what went red | positive control |`) and the **Not done** section.
- `agent-layer/gen-loc-summary.mjs` lines 22–26 — the three `GROUPS` regexes. `.claude/plans/` matches
  **none**, which is why REGENERATES is `none` on every task below.

### New Files to Create

- `.claude/plans/canvas-spike-s2/layout-branch.txt` — the converter's layout branch, ESM, parked as
  `.txt`. **The one file #304 lifts.**
- `.claude/plans/canvas-spike-s2/driver.txt` — the runner: reads the fixtures, prints the tables, runs the
  control battery. Parked as `.txt`; run from the scratchpad as `.mjs` (S1's pattern).
- `.claude/plans/canvas-spike-s2/raw/instance.txt` — verbatim stdout over `03-blueprint.txt`.
- `.claude/plans/canvas-spike-s2/raw/master.txt` — verbatim stdout over `03c-master-blueprint.txt`.
- `.claude/plans/canvas-spike-s2/raw/controls.txt` — verbatim stdout of the control battery.
- `.claude/plans/canvas-spike-s2/README.md` — the verdict, the mapping table, the drops, Not done, Files.
- `.claude/reports/canvas-spike-s2-blueprint-stack-299-report.md` — the implementation report
  (`system-execution-report` skill), in the same PR per CLAUDE.md §Git.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

No external documentation is needed — the fixture is committed and the contract is local. Two in-repo
references stand in for it:

- `.claude/references/gates.md` — which gate proves what. Read the drift-check row before claiming the
  repo is clean.
- `.claude/plans/design-import-spike-c/01-knowledge.md` — the Brilliant knowledge spike C loaded. **It
  does not contain a Blueprint auto-layout syntax reference** (its headings are Design Systems,
  Components, Export & Import, Blueprint Directives, Blueprint Vectors, Design System Authoring — observed
  via the heading outline). So `al()`/`s()` semantics come from the fixture plus `04-htmlflex.html`, never
  from recall. Say so in the README.

### Patterns to Follow

**Spike README shape** — mirror `.claude/plans/canvas-spike-s1/README.md` exactly:

```
# S2 — Blueprint auto-layout → stack
**Real run, <date>, <start>–<end>.** Ticket #299 · epic #295 · architecture § Spikes (S2).
Executable plan .claude/plans/canvas-spike-s2-blueprint-stack-299.md.
Every number below is observed — verbatim stdout in raw/, one file per leg, each table cell names its file.
Nothing under system/, tooling/, agent-layer/ or handoff/ was added, edited or deleted.
## Verdicts   (| Q | Verdict | Evidence |)
## Setup
## The mapping table
## Could not map
## Proving the checks   (| control | mutation | what went red | positive control |)
## Not done
## Files   (| file | what |)
```

**Parked-module pattern** (S1): the file is a complete ESM module, saved with a `.txt` extension. To run
it, copy to the scratchpad with a `.mjs` name and execute there. Never `node` a `.txt` directly.

**Zero-dep Node ESM** (CLAUDE.md §Ground rules): `node:fs` only, no dependencies, no `npm install`.

**Errors** (CLAUDE.md §Ground rules): throw a plain `Error` whose message names the offending input. No
taxonomy, no wrapping.

**The depth-aware splitter** — proven working in pre-flight (NOTES P5); the naive `split(",")` is wrong
because `pad(4:$a,8:$b,4:$c,8:$d)` sits inside `al(...)`:

```js
const args = (src, head) => {           // extract head(...)'s argument string at depth 0
  const i = src.indexOf(head + "(");
  if (i < 0) return null;
  let d = 0, out = "";
  for (let j = i + head.length; j < src.length; j++) {
    const c = src[j];
    if (c === "(") { d++; if (d === 1) continue; }
    if (c === ")") { d--; if (d === 0) return out; }
    out += c;
  }
  throw new Error(`unterminated ${head}( in: ${src.trim()}`);
};
const split = (s) => {                  // split on top-level commas only
  const out = []; let d = 0, cur = "";
  for (const c of s) {
    if (c === "(") d++;
    if (c === ")") d--;
    if (c === "," && d === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
};
```

**The value form** — every tokenisable slot in a blueprint read is `<resolved>:<$ref>`, e.g.
`12:$spacing.md`. Parse both halves; the `ref` is what maps, the resolved value is what the distance is
measured from.

---

## IMPLEMENTATION PLAN

### Phase 1: The layout branch

Write the pure mapping module. No I/O, no fixture paths inside it — `#304` lifts it into
`import/brilliant.mjs` and must not have to strip a spike's file handling out of it.

**Tasks:**

- `parseAl(line)` → `{dir, gap, pad, align}` from the `al(...)` atom
- `parseSize(line)` → `{w, h}` from the `s(...)` atom
- `mapSpacing({ref, value})` → `{token, contractValue, distance}` or `null` with a reason
- `toStack(node)` → the IR `layout` object plus a `drops[]` array

### Phase 2: The driver and the run

**Depends on:** Phase 1.

**Tasks:**

- Read both fixtures, run the branch over every `al()` node, print one row per value
- Print the aggregate could-not-map list
- Capture stdout verbatim to `raw/`

### Phase 3: The control battery

**Independent of:** Phase 2 — it runs against synthetic inputs, not the fixtures, so it can be written
and run in either order. Run it **before** trusting Phase 2's green (`check-that-cannot-fail`).

**Tasks:**

- Five controls, each with its mutation named and its red observed

### Phase 4: The verdict

**Depends on:** Phases 2 and 3.

**Tasks:**

- Write the README with the branch taken and its condition
- Run `node tooling/drift-check.mjs`
- Write the report, commit, PR, post the epic comment

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

### CREATE `.claude/plans/canvas-spike-s2/` and read the inputs

- **IMPLEMENT**: `mkdir -p .claude/plans/canvas-spike-s2/raw`. Then read, in full:
  `03-blueprint.txt`, `03c-master-blueprint.txt`, `04-htmlflex.html`, `02-fixture.dsl.txt`,
  `system/tokens.contract.css:50–70`, and architecture lines 165–169 and 302–308.
- **PATTERN**: `.claude/plans/canvas-spike-s1/` — flat directory + `raw/`.
- **GOTCHA**: the fixture files are ~10–14 lines each. Read them, do not grep them — the whole point is
  that the layout atoms are read in context, and one of this plan's pre-flight findings
  (`$spacing.md` absent from the instance read) is invisible to a grep for `al(`.
- **VALIDATE**: `ls -R .claude/plans/canvas-spike-s2/` prints `raw` and nothing else
- **SATISFIES**: groundwork for AC #1
- **REGENERATES**: none

### CREATE `.claude/plans/canvas-spike-s2/layout-branch.txt`

- **IMPLEMENT**: a pure ESM module, no I/O, exporting:
  - `args(src, head)` and `split(s)` — the depth-aware splitter from Patterns above, verbatim
  - `parseValue(s)` → `{value: Number, ref: String|null}` from `"12:$spacing.md"` / `"12"` / `"$spacing.md"`
  - `parseAl(line)` → `{dir: "h"|"v", gap, pad: [t,r,b,l], alignX, alignY}`; `gap`/`pad` entries are
    `parseValue` results; `alignX`/`alignY` are the letter inside `x()`/`y()` or `null`. **This is the
    source's shape — absolute axes, untranslated.**
  - `toAlign({dir, alignX, alignY})` → **the IR's shape: `{main, cross}`**, each one of
    `"start" | "center" | "end" | "space-between" | null`. The architecture names the `align` slot
    (line 165) but not its contents, so this is the spike's call and it must be written down: `dir === "h"`
    → `main = alignX, cross = alignY`; `dir === "v"` → `main = alignY, cross = alignX`. Brilliant's
    letters map `c → "center"`; any other letter is unexercised (see the Not-done task) — implement the
    obvious `s`/`e` → `start`/`end` and mark them untested rather than guessing a fifth.
  - `parseSize(line)` → `{w, h}`, each `"fill" | "hug" | Number`; **`hug:N` → `"hug"`, and the dropped
    `:N` is recorded** (spike C README:92)
  - `SPACING` — the contract scale as a literal `{"spacing-xs":4,"spacing-sm":8,"spacing-md":16,
    "spacing-lg":24,"spacing-xl":32,"spacing-2xl":48,"spacing-3xl":64,"spacing-4xl":96}`, with a comment
    citing `system/tokens.contract.css:55-62` as its source
  - `mapSpacing({value, ref})` → `{token, contractValue, distance}` **by ROLE**: strip `$spacing.` off
    `ref`, look up `spacing-<name>` in `SPACING`; hit → `{token: "--spacing-<name>", contractValue,
    distance: contractValue - value}`; miss → `null`.
    **Pin the sign convention in the file's header comment: `distance = contract − source`**, so
    `$spacing.md` (12 → 16) is `+4px` and a contract step smaller than the source is negative. A later
    reader computing source-minus-contract would flip every number in the README silently.
  - `toStack(node)` → `{layout: {dir, gap, pad, align, size}, emitted: [...], drops: [...]}` in the
    architecture's IR shape (lines 165–169), where every emitted value is `{ref, value}` carrying the
    **contract** token in `ref` and the contract px in `value`.
    **`drops` is one list with a `kind`, not two**, because AC #1 asks for *every* literal that could not
    map and a size qualifier has no `ref` to carry:
    `{kind: "no-token" | "qualifier-dropped", slot, ref: String|null, value, reason}`.
    `$spacing.none` → `{kind:"no-token", slot:"pad", ref:"$spacing.none", value:0, …}`;
    `hug:100` → `{kind:"qualifier-dropped", slot:"size.h", ref:null, value:100,
    reason:"hug:N → hug (spike C README:92)"}`. **Both instance text nodes carry `s(fill,hug:100)`**, so
    this is on the primary fixture — forcing it into the spacing shape, or discarding it, leaves AC #1
    one class short.
- **PATTERN**: zero-dep Node ESM, CLAUDE.md §Ground rules; errors are plain `Error`s naming the input.
- **IMPORTS**: none. This file imports nothing — that is what makes it liftable.
- **GOTCHA 1**: **map by ROLE, never by value.** The architecture is explicit (line 168): "A bound source
  fills `ref`; an unbound one leaves it empty and the snap step fills it by nearest value." This fixture
  is bound on every layout slot, so by-value snapping is the *wrong* path here and control C5 exists to
  catch it. By-value would also be ambiguous: Brilliant's `$spacing.md` = 12, and 12 is exactly equidistant
  from the contract's `sm` (8) and `md` (16).
- **GOTCHA 2**: `mapSpacing` must return `null` for a miss and the caller must push a `drops` row.
  Returning `0`, `undefined` or the input unchanged is the `check-that-cannot-fail` shape — a value that
  vanishes silently. C1 and C2 both test this path.
- **GOTCHA 3**: **`x`/`y` are absolute axes, not main/cross.** In `al(h,…)`, `x(c)` → `justify-content:
  center` and `y(c)` → `align-items: center` (observed in `04-htmlflex.html`, the Status chip:
  `al(h,x(c),y(c),…)` → `justify-content: center; align-items: center`). In `al(v,…)` the roles swap. The
  fixture **never exercises `al(v,…)` with an `x()` or `y()`**, so implement the swap but record it as
  unexercised (see the Not-done task).
- **GOTCHA 4**: park as `.txt`, not `.mjs` — AC #2. Be accurate about the reason in the README: a
  *syntactically valid* module would pass `node --check` (`.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs`
  is tracked and drift-check is green, observed), so `.txt` is the ticket's call about what #304 lifts, not
  a syntax necessity. Memory `drift-check-syntax-checks-parked-mjs` is about *fragments*.
- **VALIDATE**: `cp .claude/plans/canvas-spike-s2/layout-branch.txt "$SCRATCH/layout-branch.mjs" && node --check "$SCRATCH/layout-branch.mjs"` → exits 0, no output
- **SATISFIES**: AC #2
- **REGENERATES**: none — `.claude/plans/` matches no `gen-loc-summary` `GROUPS` regex
  (`agent-layer/gen-loc-summary.mjs:22-26`, observed)

### CREATE `.claude/plans/canvas-spike-s2/driver.txt`

- **IMPLEMENT**: an ESM runner taking fixture paths on `process.argv`. For each `al()` line it prints:
  the node's quoted name, `dir`, then one row per value —
  `slot | source (value:ref) | contract token | contract px | distance | verdict`. Then, per file: the
  could-not-map list, and a count line `N nodes · M values · K mapped · L unmapped`.
  A `--controls` flag runs the battery instead (next task).
- **PATTERN**: `.claude/plans/canvas-spike-s1/driver.txt` — a parked `.txt` runner, plain `console.log`
  tables, copied to the scratchpad to run.
- **IMPORTS**: `readFileSync` from `node:fs`; the branch by relative path
  (`./layout-branch.mjs` after both are copied to the scratchpad).
- **GOTCHA**: print `distance` with an explicit sign and unit (`+4px`, `0px`), never a bare number — a
  distance of `0` and a distance that was never computed look identical otherwise. C3 tests this.
- **VALIDATE**: `node --check "$SCRATCH/driver.mjs"` → exits 0
- **SATISFIES**: AC #1
- **REGENERATES**: none

### ADD the control battery to `driver.txt` (`--controls`)

- **IMPLEMENT**: five controls over synthetic input lines, each printing `PASS`/`FAIL` and the observed
  values. Non-zero exit if any fails.
  - **C1 — an unmapped role lands in the drop list.** Input `al(h,g(13:$spacing.snug))`. Assert
    `drops` has exactly one row, `slot === "gap"`, `reason` names `spacing.snug`.
  - **C2 — the zero case is recorded, never swallowed.** Input `al(v,g(4:$spacing.xs),pad(0:$spacing.none))`.
    Assert the `$spacing.none` values produce a `drops` row (or an explicit `omitted` record) — assert the
    node does **not** come back with `pad` silently absent and no trace. **This is the discriminating
    check; its output is the verdict's evidence.**
  - **C3 — the distance arithmetic is real.** Input `al(h,g(12:$spacing.md))`. Assert
    `token === "--spacing-md"`, `contractValue === 16`, `distance === 4`. A converter reporting `0` here
    is not measuring.
  - **C4 — the splitter reads nested parens.** Input
    `al(h,y(c),g(1:$spacing.xs),pad(1:$spacing.xs,2:$spacing.sm,3:$spacing.md,4:$spacing.lg))`. Assert
    `parseAl` returns **4** pad entries and **4** `al` arguments.
  - **C5 — mapping is by role, not by value.** Input `al(h,g(24:$spacing.md))` — **synthetic, and the
    control's output says so**: the ref says `md` while the resolved value equals the contract's `lg`
    exactly. By-role gives `--spacing-md` (16px, distance **−8px**); by-value gives `--spacing-lg` (24px,
    distance 0). Assert `token === "--spacing-md"`. The two strategies cannot agree on this input and
    there is no tie to hide behind — **do not use `12:$spacing.lg`**, which is not a value any read can
    produce and whose by-value search lands on the 8/16 tie rather than a clean wrong answer.
- **REDDENS**:
  - C1 — delete the `if (!mapped) drops.push(…)` branch so a miss falls through. Expected:
    `C1 FAIL — expected 1 drop, got 0`.
  - C2 — same mutation as C1, scoped to `$spacing.none`. Expected: `C2 FAIL — $spacing.none produced no
    drop and no omitted record`.
  - C3 — hardcode `distance: 0` in `mapSpacing`. Expected: `C3 FAIL — expected distance 4, got 0`.
  - C4 — replace `split(s)` with `s.split(",")`. Expected: `C4 FAIL — expected 4 al args, got 7` (the
    naive split shatters `pad(…)` into its four commas plus `g(…)`).
  - C5 — replace the role lookup with a nearest-value search over `SPACING`. Expected:
    `C5 FAIL — expected --spacing-md, got --spacing-lg`.
- **VALIDATE**: `node "$SCRATCH/driver.mjs" --controls` → all five `PASS`, exit 0. **Then apply each
  mutation in turn and observe the named FAIL**, reverting between. Paste both halves into
  `raw/controls.txt`.
- **SATISFIES**: AC #1 (the README's controls table)
- **REGENERATES**: none

### RUN the branch over both fixtures → `raw/instance.txt`, `raw/master.txt`

- **IMPLEMENT**:
  ```
  node "$SCRATCH/driver.mjs" .claude/plans/design-import-spike-c/03-blueprint.txt \
    | tee .claude/plans/canvas-spike-s2/raw/instance.txt
  node "$SCRATCH/driver.mjs" .claude/plans/design-import-spike-c/03c-master-blueprint.txt \
    | tee .claude/plans/canvas-spike-s2/raw/master.txt
  ```
- **GOTCHA 1**: **run the master too, and say why.** The ticket cites `al(h,y(c),g,pad)`; that form is in
  `03c-master-blueprint.txt` and **not** in `03-blueprint.txt` (pre-flight P1). Running the ticket's named
  fixture alone would never touch the syntax the ticket names.
- **GOTCHA 2**: expected node counts, **observed in pre-flight** — `03-blueprint.txt`: **2** `al()` nodes;
  `03c-master-blueprint.txt`: **6** (2 variants × 3). If the driver reports different numbers, the parser
  is wrong, not the fixture.
- **GOTCHA 3**: expected spacing refs, **observed in pre-flight** — instance: `$spacing.none` ×2,
  `$spacing.sm` ×2, `$spacing.xs` ×3, `$spacing.md` **×0**; master: `$spacing.md` ×6, `$spacing.none` ×4,
  `$spacing.sm` ×8, `$spacing.xs` ×6. The instance's zero `md` count **is the read-path finding** — do not
  "fix" it.
- **VALIDATE**: both files non-empty; `grep -c 'al:' raw/instance.txt` → 2; `raw/master.txt` → 6
- **SATISFIES**: AC #1
- **REGENERATES**: none

### CROSS-CHECK every mapping row against `04-htmlflex.html`

- **IMPLEMENT**: for each of the three distinct `al()` shapes, confirm the branch's `align` output against
  Brilliant's own CSS for the same node, and write the confirmation into the README's mapping table as a
  column. The three anchors, **read in pre-flight**:
  - row `al(h,y(c),g(12:$spacing.md),pad(8,12,8,12))` → `flex-direction: row; gap: 12px; padding: 8px 12px
    8px 12px; align-items: center` — and **no `justify-content`**
  - text block `al(v,g(4:$spacing.xs),pad(0:$spacing.none))` → `flex: 1 0 0; display: flex;
    flex-direction: column; gap: 4px` — **no `padding`, no `align-items`, no `justify-content`**; the
    children carry `align-self: stretch`
  - chip `al(h,x(c),y(c),g(0:$spacing.none),pad(4,8,4,8))` → `display: flex; flex-direction: row; padding:
    4px 8px 4px 8px; justify-content: center; align-items: center` — **no `gap`**
- **GOTCHA**: the text block's and chip's `$spacing.none` values appear in the htmlFlex output as
  **nothing at all** — Brilliant itself emits no `padding` and no `gap` property. That is a fact about
  Brilliant's exporter, and it is the strongest available evidence for the "absence suffices" reading.
  It is evidence, not the verdict — state it as an observation and let the README's decision section
  weigh it against the "every set value is a token" reading.
- **VALIDATE**: manual — each of the three README rows names `04-htmlflex.html` and quotes the CSS
- **SATISFIES**: AC #1
- **REGENERATES**: none

### DECIDE the branch and CREATE `.claude/plans/canvas-spike-s2/README.md`

- **IMPLEMENT**: the README in the S1 shape. It must contain:
  1. **Verdicts table** — the ticket's question answered, with the branch taken named in bold.
  2. **The mapping table** — one row per distinct source value: `source → contract token → contract px →
     distance → htmlFlex cross-check → verdict`.
  3. **Could not map** — every value with no contract token, the token the contract lacks named exactly
     (`--spacing-none: 0`, if that is what the run shows), and how it is dropped visibly.
  4. **The decision, with its condition.** The two readings of `$spacing.none`, which one the verdict
     takes, and what #301 owes under it. The discriminating question, stated plainly: **does `stack` need
     "explicitly zero" distinct from "unset"?** If the verdict is "absence suffices", the condition on
     #301 is that `ds-stack`'s `components.css` block declares **no default `gap` and no default
     `padding`** — otherwise a source's explicit zero silently inherits a non-zero default and the
     omission stops being lossless. Say which, in one sentence a reader can act on.
  5. **Adjacent observations, explicitly not verdict inputs** — `rd(9999:$radius.full)` has no contract
     token (`--radius-lg: 16px` is the top); `s(8.73,16)` is a fractional literal on the chevron;
     `s(360,hug)` on the master's row is a fixed-px size on an auto-layout container that a
     `size ∈ {fill, hug}` prop cannot carry — **in this fixture that node is a component root, not a
     `stack`**, so it is a note for #301's prop set rather than an S2 failure.
  6. **The read-path finding for #304** — the expanded-instance blueprint read (`03-blueprint.txt`)
     **omits the instance root's own `al()`**: `$spacing.md` appears 0× there and 6× in the master, while
     `04-htmlflex.html` of the *same* instance carries `gap: 12px; padding: 8px 12px 8px 12px;
     align-items: center`. So a converter reading an instance must also read the master (or cross-read
     htmlFlex) or it loses the root's layout intent. This narrows spike C's "blueprint is the better
     converter input" call on one axis (README:13) — state it as a narrowing, not a reversal.
  7. **Proving the checks** — the S1 controls table, five rows, each naming its mutation and the observed
     red.
  8. **Not done** — at minimum: `al(v,…)` with `x()`/`y()` (the axis swap is implemented but
     **unexercised**); `start`/`end`/`space-between` alignment; the 1- and 2-value `pad()` forms (present
     in `02-fixture.dsl.txt`'s authoring DSL, never in a *read*); the unbound by-value snap path; every
     non-layout branch; a second, differently-drawn source.
  9. **Files** table.
- **PATTERN**: `.claude/plans/canvas-spike-s1/README.md` — same section order, same evidence discipline
  (every cell names its `raw/` file).
- **GOTCHA 1**: **do not pre-write the verdict from this plan.** The pre-flight facts below are inputs;
  the branch is decided by the run. If the run contradicts a pre-flight expectation, the run wins and the
  contradiction goes in the README.
- **GOTCHA 2**: honesty contract — a specified-but-unexercised mapping row is **Not done**, never a pass.
  The fixture exercises `v`/`h`, `x(c)`/`y(c)`, `fill`/`hug`/`hug:N` and the 4-value `pad()`. That is all.
- **GOTCHA 3** (memory `copy-never-indented`): the epic comment body is text the owner may paste — no
  blockquotes, no leading spaces.
- **VALIDATE**: `grep -c '^## ' .claude/plans/canvas-spike-s2/README.md` → ≥ 6. Then **provenance**, which
  a once-each check cannot test (the Files table names every `raw/` file by construction, so it passes
  whether or not a single data row cites one):
  `for f in instance master controls; do n=$(grep -c "$f.txt" .claude/plans/canvas-spike-s2/README.md);
  [ "$n" -ge 2 ] || echo "UNCITED IN A DATA ROW: $f.txt ($n)"; done` → no output. Two occurrences = once
  in Files, at least once in a mapping or controls row.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### VALIDATE the repo is untouched

- **IMPLEMENT**: `node tooling/drift-check.mjs` and `git status --short`.
- **GOTCHA**: `git status --short` will also show the five pre-existing untracked files from this
  session's start (`__*.txt`, `__mock_discoveries.md`, `__run0_discovery_worksheet.md`,
  `.claude/plans/proposals-from-a-discovery-package-ticket.md`). They are **not** this ticket's — stage by
  explicit path (memory `shared-worktree-parallel-sessions`), never `git add -A`.
- **VALIDATE**: `node tooling/drift-check.mjs` → the `drift-check ✓` line, exit 0. **Observed baseline
  before any change: green in 23.0 s** (pre-flight P6). `git diff --stat -- system/ agent-layer/ tooling/
  handoff/` → empty.
- **SATISFIES**: the "nothing moved" sentence in AC #1's README
- **REGENERATES**: none

### COMMIT, PR, and POST the verdict to epic #295

- **IMPLEMENT**: branch `feature/canvas-spike-s2-blueprint-stack-299` off `main`; one commit,
  `spike(canvas): S2 — Blueprint auto-layout → stack, verdict on the committed fixture (#299)`; PR body
  carries **`Closes #299`** (memory `prs-dont-auto-close-tickets`). Then post the verdict as a comment on
  #295, in the S1 comment's shape: **branch taken** in bold, the numbers, what #301 should carry, and the
  README path.
- **PATTERN**: the S1 verdict comment on #295 (2026-09-16, `gh issue view 295 --comments`) — bold branch
  line, bulleted findings with observed figures, a "two things #301 should carry" block, and the README
  path last.
- **GOTCHA 1**: **you are on `feature/canvas-grammar-children-many-298` right now.** Branch off `main`,
  and check `origin/main` first — #298's work may have merged (memory
  `owner-merges-fast-verify-landed`).
- **GOTCHA 2**: the epic comment is outward-facing. **Confirm with the owner before posting** (see the
  paid/owner-only table).
- **GOTCHA 3**: the plan, the report and the review belong in the same PR (CLAUDE.md §Git).
- **VALIDATE**: `gh pr view --json body -q .body | grep -c 'Closes #299'` → 1;
  `gh issue view 295 --comments | grep -c 'S2 verdict'` → 1 after posting
- **SATISFIES**: AC #3
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no suite and no linter (CLAUDE.md §Ground rules) — don't hunt for one. This spike's tests are its
control battery, and they are the deliverable's credibility.

### Unit Tests

None as a framework. The five controls in `driver.txt --controls` are the unit tests, each asserting one
named property of the branch and each carrying the mutation that reddens it.

### Integration Tests

The two fixture runs are the integration test: real committed input, verbatim stdout on disk.

### Edge Cases

| Case | Where it comes from | Handled how |
|---|---|---|
| `$spacing.none` (no contract token) | `03-blueprint.txt` ×2, `03c` ×4 | C2 — **the verdict's own case** |
| `hug:N` | `s(fill,hug:100)` ×2 on the **primary** fixture | → `hug`; the `:N` is a `kind: "qualifier-dropped"` row, which has no `ref` |
| nested `pad()` inside `al()` | every node | the depth-aware splitter; C4 |
| identical resolved value, different ref | `$spacing.md`=12 sits between contract `sm`=8 and `md`=16 | role mapping; C5 |
| `al()` absent on an instance root | `03-blueprint.txt` line 2 | the read-path finding; not an error |
| a role the contract does not carry | synthetic `$spacing.snug` | C1 |
| unterminated `al(` | synthetic | `args()` throws naming the line |

### Proving the checks

Every check carries its REDDENS mutation above and one positive control. **Run the mutations.** A control
that has never been observed failing is not a control — it is a comment
(memory `check-that-cannot-fail`: every #137 defect survived a green gate the same way). Both halves —
the five `PASS` lines and the five mutated `FAIL` lines — go into `raw/controls.txt` verbatim.

---

## VALIDATION COMMANDS

`export SCRATCH=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/d8e0d4de-833d-4762-b974-77e975c52f52/scratchpad/s2`

### Level 1: Syntax & Style

```bash
mkdir -p "$SCRATCH"
cp .claude/plans/canvas-spike-s2/layout-branch.txt "$SCRATCH/layout-branch.mjs"
cp .claude/plans/canvas-spike-s2/driver.txt        "$SCRATCH/driver.mjs"
node --check "$SCRATCH/layout-branch.mjs" && node --check "$SCRATCH/driver.mjs"
```

### Level 2: Unit Tests

```bash
node "$SCRATCH/driver.mjs" --controls | tee .claude/plans/canvas-spike-s2/raw/controls.txt
# then, per control, apply its REDDENS mutation, re-run, append the FAIL line, revert
```

### Level 3: Integration Tests

```bash
node "$SCRATCH/driver.mjs" .claude/plans/design-import-spike-c/03-blueprint.txt \
  | tee .claude/plans/canvas-spike-s2/raw/instance.txt
node "$SCRATCH/driver.mjs" .claude/plans/design-import-spike-c/03c-master-blueprint.txt \
  | tee .claude/plans/canvas-spike-s2/raw/master.txt
grep -c 'al:' .claude/plans/canvas-spike-s2/raw/instance.txt   # expect 2
grep -c 'al:' .claude/plans/canvas-spike-s2/raw/master.txt     # expect 6
```

### Level 4: Manual Validation

Read `raw/instance.txt` and `raw/master.txt` against `04-htmlflex.html` by eye. Every `align` the branch
emits must match the CSS Brilliant emits for the same node. A row the htmlFlex file cannot confirm is a
row the README marks unconfirmed.

### Level 5: Repo gates

```bash
node tooling/drift-check.mjs                              # observed green in 23.0 s before any change
git diff --stat -- system/ agent-layer/ tooling/ handoff/  # must be empty
```

`build-checks`, the journey drivers and the pixel gate are **not** run: this ticket touches no `system/`
file, no shipped page and no generated artifact, so none of them can reach it
(`.claude/references/gates.md`). Say that in the report rather than running them for show.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Posting the S2 verdict comment on epic #295 | owner's confirmation (outward-facing; no spend) | **no** — the PR merges on the README; the comment is AC #3 and follows | open one before the PR if the owner defers |

No agent run, no MCP call, no token spend: the fixture is committed. This table is otherwise empty, and
that is a fact about this ticket, not an omission.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `.claude/plans/canvas-spike-s2/README.md` carries: the fixture's layout nodes, the
      mapping table (source value → spacing token, with distance), every literal that could not map, the
      verdict line, and the branch taken.
- [ ] **AC #2** — the layout branch is parked as `.txt` and is liftable: it imports nothing, contains no
      fixture path, and emits the architecture's IR `layout` shape (lines 165–169).
- [ ] **AC #3** — the verdict is posted as a comment on epic #295.
- [ ] Every control in the battery has been observed both green and red under its named mutation, and both
      halves are in `raw/controls.txt`.
- [ ] Every README table cell names the `raw/` file it came from.
- [ ] Specified-but-unexercised mappings are in **Not done**, not in the mapping table as passes.
- [ ] `node tooling/drift-check.mjs` green; `git diff -- system/ agent-layer/ tooling/ handoff/` empty.
- [ ] If a missing contract token is named, it is named exactly (`--spacing-none: 0`) with the two
      regenerators #301 will owe spelled out — and **no `tokens.source.json` edit is made here**.
- [ ] PR body carries `Closes #299`; plan + report in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Control battery green, and each control observed red under its mutation
- [ ] Manual cross-check against `04-htmlflex.html` done for all three `al()` shapes
- [ ] Acceptance criteria all met
- [ ] Report written to `.claude/reports/canvas-spike-s2-blueprint-stack-299-report.md`

---

## OPEN QUESTIONS / ASSUMPTIONS

**A1 — both fixtures are in scope.** The ticket names `03-blueprint.txt` and the syntax `al(h,y(c),g,pad)`.
Pre-flight found that form only in `03c-master-blueprint.txt`. The plan runs both, treats
`03-blueprint.txt` as primary, and reports the discrepancy as a read-path finding. If the owner reads S2
as strictly the one file, the master run becomes an appendix — the verdict does not change, because
`$spacing.none` is present in both.

**A2 — the branch is not pre-decided.** The pre-flight establishes that the contract has no zero spacing
step. It does **not** establish the verdict: that turns on whether omitting a prop is lossless for
`stack`, which the run and the htmlFlex cross-check answer. Both branches are specified above.

**Q1 — does `stack` need "explicitly zero" distinct from "unset"?** The plan's discriminating question.
For this fixture the answer is almost certainly no (padding does not inherit, and the nodes with
`$spacing.none` are children with nothing to override). It becomes yes the moment `ds-stack`'s CSS block
carries a default gap or padding, or the override format (G2) must zero a base value. **The verdict
carries its condition rather than resolving Q1 for all time** — that is more useful to #301 than a bare
branch. If the owner wants Q1 closed outright, say so and S2 widens by about an hour.

**Q2 — is `--spacing-none: 0` worth a contract token on its own merits?** Out of S2's reach. S2 names it
if the run shows it is needed; #301 decides. Flagged because a zero step in a spacing scale is a real
design-system question, not just an import artefact.

**Assumption**: the README's date/times are the real run's, recorded as they happen (S1's precedent:
"Real run, 2026-09-16, 14:45–15:00"). Do not backfill them.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

**P1 — the ticket's cited syntax is not in the ticket's cited file.** `03-blueprint.txt` line 2 is
`1db1b29957b949ca inst("Spike List Row") at(state(active)) p(16,288) s(360,hug) "Frame 1" #spikec_inst` —
**no `al()`**. The form `al(h,y(c),g(12:$spacing.md),pad(8:$spacing.sm,12:$spacing.md,8:$spacing.sm,12:$spacing.md))`
is `03c-master-blueprint.txt` line 2. *Changed the plan:* both fixtures are run, and the discrepancy is
promoted from an inconvenience to a finding for #304.

**P2 — the counts.** `grep -o '\$spacing\.[a-z]*' | sort | uniq -c`:

| file | `$spacing.md` | `$spacing.none` | `$spacing.sm` | `$spacing.xs` | `al()` nodes | `x(c)` | `y(c)` |
|---|---|---|---|---|---|---|---|
| `03-blueprint.txt` | **0** | 2 | 2 | 3 | 2 | 1 | 1 |
| `03c-master-blueprint.txt` | 6 | 4 | 8 | 6 | 6 | 2 | 4 |

The instance read's **zero** `$spacing.md` against the master's six is the read-path finding, quantified.
*Changed the plan:* these became the expected counts in the run task's GOTCHA 2/3, so a parser bug shows
up as a count mismatch rather than a plausible-looking table.

**P3 — the contract has no zero spacing step and no full radius.** `grep -n "spacing\|radius"
system/tokens.contract.css` → `--spacing-xs: 4px` … `--spacing-4xl: 96px`, `--radius-sm: 4px` …
`--radius-lg: 16px`. `grep -rn "spacing-none\|spacing-0\b\|radius-full\|radius-pill" system/ agent-layer/
handoff/` → **no matches.** *Changed the plan:* the verdict's decision section and Q1 exist because of
this; the radius half is fenced as an adjacent observation because S2 is the layout branch alone.

**P4 — `$spacing.md` is 12 in Brilliant and 16 in the contract.** Read off `g(12:$spacing.md)` in the
master, against `--spacing-md: 16px`. That is a **+4px distance on a lossless role mapping**, and by-value
snapping would be ambiguous (12 is equidistant from 8 and 16). *Changed the plan:* control C3 asserts the
distance arithmetic is real, C5 asserts the strategy is by-role, and the mapping table gained a distance
column with a signed unit.

**P5 — the splitter works.** A throwaway depth-aware `args()`/`split()` was written and run over both
fixtures; it returned the three distinct `al()` shapes cleanly
(`["h","y(c)","g(12:$spacing.md)","pad(8:$spacing.sm,12:$spacing.md,8:$spacing.sm,12:$spacing.md)"]` and
the other two). *Changed the plan:* the working splitter is pasted into Patterns rather than described,
and C4's REDDENS names the exact naive-split failure (4 → 7 args).

**P11 — the plan was reconciled against itself, and four tasks changed.** (a) C5's original fixture
`12:$spacing.lg` is a value no read can produce, and its by-value mutation would land on the contract's
8/16 tie rather than a clean wrong token — replaced with `24:$spacing.md`, where by-role and by-value
provably disagree. (b) The sign convention for `distance` was implied by two sections and stated in
neither — pinned as `contract − source` in the branch's header. (c) The architecture names the IR's
`align` slot but not its contents, and `parseAl` returned absolute axes while `toStack` emitted `align`
with no translation step between them — `toAlign()` and the `{main, cross}` shape are now specified.
(d) `drops[]` had only the spacing shape `{slot, ref, value, reason}`, and a dropped `hug:N` qualifier has
no `ref` — it gained a `kind`, because both text nodes on the primary fixture carry one and AC #1 asks
for every literal that could not map. (e) The README's uncited-`raw/`-file loop could not fail (the Files
table names every file by construction) — replaced with a ≥2-occurrence check, which is the property
actually wanted.

**P6 — `node tooling/drift-check.mjs` is green, 23.0 s**, on the tree as found. *Changed the plan:* it
became the Level 5 baseline with an observed figure rather than an assumed pass.

**P7 — a tracked `.mjs` under `.claude/plans/` is fine if it parses.**
`.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs` is tracked and P6 is green;
`tooling/drift-check.mjs:31-38` runs `node --check` over `git ls-files "*.mjs"`. *Changed the plan:* the
`.txt` GOTCHA now states the honest reason (the ticket's call about what #304 lifts) instead of repeating
a half-true "CI would reject it". Memory `drift-check-syntax-checks-parked-mjs` is about fragments.

**P8 — `.claude/plans/` is in no `loc-summary` group.** `agent-layer/gen-loc-summary.mjs:22-26` — the
three regexes are `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$`,
`^agent-layer/[^/]+\.mjs$`. S1's commit (`git show --stat 77dbb1b`) touched no generated file.
*Changed the plan:* REGENERATES is `none` on every task, stated rather than omitted — memory
`loc-summary-baseline-cascade` would otherwise be a live trap here, and it is not.

**P9 — `import/` does not exist.** `ls import/` → No such file or directory. *Changed the plan:* the
Out-of-scope section says so explicitly, so the implementer does not create it "to be helpful".

**P10 — the htmlFlex cross-check is real and load-bearing.** `04-htmlflex.html` carries, for the same
instance: `gap: 12px; padding: 8px 12px 8px 12px; align-items: center` on the root (**which the blueprint
read of that instance does not**), `flex: 1 0 0; flex-direction: column; gap: 4px` with **no padding** on
the text block, and `justify-content: center; align-items: center` with **no gap** on the chip. *Changed
the plan:* the cross-check became its own task, and the "Brilliant itself emits nothing for
`$spacing.none`" observation became the strongest evidence in the decision section.

### The verdict's real shape

The ticket offers two branches. The run will almost certainly land between them, and the README should say
so rather than rounding:

- Everything except zero maps **losslessly by role**: `v`/`h` → column/row, `$spacing.xs`/`sm`/`md` → the
  contract's same-named steps, `x(c)`/`y(c)` → `justify-content`/`align-items: center`, `fill`/`hug`/
  `hug:N` → the size enum. The only *value* cost is the scale difference (P4), which is a fidelity number,
  not a literal.
- `$spacing.none` is the whole question, and it is a **prop-set** question, not a converter one: does
  `stack` distinguish unset from explicitly-zero? Brilliant's own exporter emits nothing for it (P10),
  which supports "absence suffices" — but "absence suffices" is only true while `ds-stack` declares no
  default gap or padding, and that is #301's to guarantee.

So the most useful verdict is the branch **plus its condition**: the one-sentence thing #301 must do for
the answer to stay true. A bare "lossless" that #301 can invalidate by adding a default padding is worse
than useless — it is a green check that cannot fail.

### What a reader of this spike should not conclude

That import is proven. One node tree, drawn by the spike itself, under Brilliant's default design system,
with every layout slot bound. Spike C already flagged the live assumption (PRD: "that a designer-drawn
Brilliant source is token-bound … the session default is unbound"). S2 says nothing about an unbound
source, and the README's Not-done section must say so in those words.

## AMENDMENTS

- (none — created 2026-09-17)

**2026-09-17, at implementation.** Four plan errors, all found in the pre-flight re-run and all confirmed
against the fixtures before a line was written.

- **A1 — the 1-value `pad()` form IS in a read.** The README task's Not-done bullet (item 8) says the 1-
  and 2-value `pad()` forms are "present in `02-fixture.dsl.txt`'s authoring DSL, never in a *read*". That
  is true of the 2-value form and **false of the 1-value one**: `grep -o 'pad([^)]*)'` over the two
  fixtures returns `pad(0:$spacing.none)` **1× on `03-blueprint.txt` and 2× on `03c-master-blueprint.txt`**
  (observed). Brilliant expands a 2-value pad before the read — `02-fixture.dsl.txt:5`'s
  `pad($spacing.sm,$spacing.md)` comes back as four values on `03c-master-blueprint.txt:3` — but leaves a
  1-value pad alone. *Consequences carried:* `expandPad()` handles arities 1/2/4; the **drop is recorded
  once per source ATOM, not per expanded side**, so the unmapped count stays comparable to the plan's own
  P2 grep; and the README's Not-done bullet was rewritten to say the 1-value expansion rule is **asserted
  from CSS convention and unconfirmed by this fixture** (its only 1-value pad is zero, and zero on one
  side is zero on four).
- **A2 — no `al()` node in either fixture carries `hug:N`.** The task's justification for adding `kind` to
  `drops[]` — "**Both instance text nodes carry `s(fill,hug:100)`**, so this is on the primary fixture" —
  is true of the *file* and false of the *layout branch's input*: the qualifier is on **text children**,
  which the branch never reads. `grep 'al(' <both fixtures> | grep -c 'hug:'` → **0** (observed). The
  Edge-cases table's `hug:N` row is therefore a specified-but-**unexercised** mapping, which the plan's own
  GOTCHA 2 says must go to Not done. *Consequences carried:* the `kind` field is kept (it is still needed —
  see A3); `qualifier-dropped` is proven by a new synthetic control **C6** rather than by fixture data; and
  the README's Not-done section names the absence.
- **A3 — `drops[]` needs a third kind.** The task specifies `kind: "no-token" | "qualifier-dropped"`.
  `s(360,hug)` on `03c-master-blueprint.txt:3` and `:11` fits neither: it has no `ref` to name and no
  token to look for — it is a raw px literal on a layout slot. Forcing it into either shape, or leaving it
  to README prose only, would leave AC #1 ("every literal that could not map") one class short in the run
  output itself. *Consequence carried:* a third kind, `literal-size`, which the run prints. The README
  keeps the plan's fence — in this fixture those nodes are component roots, not `stack`s.
- **A4 — C4's REDDENS cannot produce its predicted line through `parseAl` alone.** The mutation
  (`split(s)` → `s.split(",")`) shatters `pad(…)` into four fragments, and `parseAl` then **throws**
  `unterminated pad(` before any count can be reported — so a control asserting only on `parseAl`'s return
  would crash rather than print `C4 FAIL — expected 4 al args, got 7`. *Consequence carried:* C4 asserts
  `split(args(line,"al")).length` **first and separately**, then reads the pad count inside a try/catch, so
  the predicted `expected 4 al args, got 7` is exactly what the mutation prints (observed,
  `raw/controls.txt`). Every control is additionally wrapped so a throw is reported as a FAIL rather than
  killing the other ten.
- **A5 (not an error — a gap the Patterns block left open).** The plan's verbatim `args(src, head)` uses a
  bare `src.indexOf(head + "(")`, which matches the `g(` **inside `svg(icon:caret-right)`** — present on
  three master lines and one instance line. *Consequence carried:* `args()` gained a boundary test
  (start-of-string, space, tab, comma or `(` before the head), and positive control **PC5** asserts it.
