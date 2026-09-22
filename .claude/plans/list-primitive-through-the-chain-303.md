# Feature: `list` through the chain — the container of `list-row`s

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

`list` is the third of epic #295's five new generic primitives (after `stack` and `text`, #301). It is the
container that holds the existing `list-row`s: it owns the dividers between them, an optional section
header above them, and the copy the region shows when it holds no rows at all. It declares
`childrenCardinality: "many"` with `children: ["list-row"]`, which makes it the **second** committed spec
to exercise the grammar #298 shipped and the **first** whose allowed-children list is a single name.

Nothing about `list-row` changes — not its spec, not its template, not its CSS block. The container
neutralises the row's own border and radius from inside the `list` block, and draws one hairline between
adjacent rows instead. A row rendered standalone (its own `/components` specimen, Fieldwork's slots,
`/build`'s patterns) is untouched; only the in-list form differs.

## User Story

As **the operator composing a product's screens on the canvas** (and, from #304, as the importer mapping a
source design's list)
I want **one component that holds N rows, separates them, titles them and says what absence reads as**
So that **a screen with a list is a real composition instead of a pile of sibling cards, and the empty
state is designed rather than discovered.**

## Problem Statement

`list-row` exists and renders one named entity per row. Nothing holds those rows. Today a composed screen
with three rows is three sibling cards inside a `stack` — each with its own border and radius, no shared
header, no divider, and no answer at all for the case where the data is absent. Three consequences:

1. **The empty case has nowhere to live.** With base-plus-overrides states (#302 G2), a screen's empty-list
   state is an override that removes the rows. If the empty copy is not already a prop of the container,
   there is nothing left to render — the region goes blank, which is the thing `empty-state` exists to
   argue against.
2. **#304 has no target.** Its AC says "a source list maps to `list` + N `list-row`s". There is no `list`.
3. **G31 is unbuilt.** The epic's ten-primitive claim (MVP 12 validates it against Faster Payment's four
   screens) is short by one as long as this is missing.

## Solution Statement

One spec, one CSS block, one template, through the same chain `stack` and `text` went through in #301:

- **`system/specs/list.md`** — `class: ds-list`, `contract: null`, `states: ["default"]`,
  `children: ["list-row"]`, `childrenCardinality: "many"`, two props (`header` optional, `empty` required)
  and an `example`.
- **`system/components.css`** — a `ds-list` block at the end of the file that draws the container, the
  header rule, the empty rule, and the two rules that take the row's chrome off and put a divider between
  adjacent rows.
- **`system/agentic-renderer.mjs`** — a `"list"` template that renders the header when present, each child
  through `renderChild` (the `stack` precedent, not `card`'s hardcoded `[]`), and the empty copy **only
  when `kids.length === 0`**.
- **`system/specs/stack.md`** — `children` gains `"list"`, so a composed screen can actually hold one.
- **`system/palette.mjs`** — `CATALOG_COMPONENTS` gains `"list"` (build-checks 21.2 asserts set identity).
- **`tooling/build-checks.mjs`** — the histogram literal moves 3/20 → 3/21, and group 3 gains the `list`
  cases beside #301's.
- **`tooling/catalog-journey.mjs`** — the one case that observes AC #1's divider claim instead of restating
  it: computed styles on three engines, with a loose row as the control. Beyond the ticket's file estimate,
  and the reason is in Task 10b.
- Five regenerators, `/components` baselines ×3, and `gen-loc-summary` if the digit moves.

## Out of Scope / Non-Goals

- **Not included: `icon` and `choice`** (the other two new primitives — #309 and its sibling; the
  `/components` collision rule forbids them being open at the same time as this).
- **Not included: list semantics (`role="list"` / `role="listitem"`).** `list-row`'s Accessibility prose
  refuses `listitem` because no owning list existed; an owning list now exists, but giving the rows the
  role means editing `list-row`'s template, which this ticket forbids, and a `role="list"` whose children
  carry no `listitem` reports zero items. The container therefore claims no role. See Q1.
- **Not included: sort, pagination, columns, a header row, selection, or a tappable row.** `list-row`'s own
  spec already refuses these by name ("this is not a table"); the container inherits the refusal.
- **Not included: a `tone` prop on the container.** Tone is the row's, per row.
- **Not changing: `list-row`** — spec, template and CSS block all untouched (the ticket says so). The
  in-list appearance is entirely the `list` block's doing.
- **Not changing: `param-manifest.json`.** `list` is non-interactive; `/components` already counts its
  playground controls one-class-per-page, and the bus-emitting-specimen entry lists only components that
  emit. No manifest edit and no `gen-param-count` run. (Verified: `gen-param-count.mjs --check` → `121
  controls — no drift`, observed, and nothing in this change touches an entry.)
- **Not changing: `import/`** — #304 consumes `list`; it does not land here.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: the design system (`system/specs`, `components.css`, `agentic-renderer.mjs`,
`palette.mjs`), the generated handoff pack, `tooling/build-checks.mjs`, the pixel gate's `/components`
baselines
**Dependencies**: none new. Zero-dep Node ESM + vanilla shipped pages, unchanged.

## Related Work

**Implements**: [#303](https://github.com/linardsb/ux-factory/issues/303) · **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.prd.md`
(G24, G31; MVP 4)

**Back-references**:

- `.claude/plans/canvas-grammar-children-many.md` (#298) — Why: the `childrenCardinality` key, its parser
  refusals, the `validateComposition` guard and the `composition.version` bump this spec consumes.
- `.claude/code-reviews/pr-427-review.md` — Why: records that `#298` named `list` as `#305` in five
  places, that the projected key's NAME had no gate, and the exact refusal-string shape AC #2 asserts on.
- #301 (`stack` + `text`, merged) — Why: the *precedent* this ticket copies line for line. No plan file for
  it survives in `.claude/plans/`; the precedent is read off the landed code, cited below by `file:line`.

**Forward-references**:

- #304 (`import/`) — consumes `list` + N `list-row`s as the recognition target for a source list.
- The remaining primitives (`icon`, `choice`) — same chain, one at a time, `/components` collision rule.

## KEY RISKS

Read this before Task 1. Each row is a way this ticket goes red or ships wrong; each names the task that
kills it. **R1–R4 are things the ticket's own text does not mention** — they come from reading the tree,
not the issue.

| # | Risk | How it shows up | Killed by |
|---|---|---|---|
| **R1** | `CATALOG_COMPONENTS` not updated | `build-checks` group 21 red: `palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary` | **Task 5** |
| **R2** | the wrapper histogram literal not moved | group 21 red: `the wrapper histogram moved — 3 with / 21 without (pinned 3/20)` | **Task 7** |
| **R3** | only four regenerators run | `drift-check` red on `pack.bundle.json` and/or `llms.txt`; CI `verify` blocks the PR | **Task 6** |
| **R4** | `stack.children` not widened | green build, and a `list` no screen can hold: `deepPairs` never renders it, #304 has no placement target | **Task 4** |
| **R5** | the divider rules do not WIN at runtime | green build, wrong pixels: `build-checks` case 6 proves the rules EXIST in the sheet, never that they beat `list-row`'s own | **Task 10b** (new) |
| **R6** | a baseline regenerated from a dirty tree | a committed screenshot of work in progress; no gate can see it | **Task 11** (clean detached worktree under `/Users`) |
| **R7** | `/components` collision — another primitive or admission PR open | two PRs regenerate the same three PNGs; the second merge silently reverts the first | the precondition below |
| **R8** | loc-summary digit flips unnoticed | CI `verify` red on drift, or three stale approach baselines | **Task 12** (`git add` FIRST) |
| **R9** | `empty` required turns out to be wrong (D1) | friction for every composer; not a build failure | one-line reversal, costed in Open Questions |
| **R10** | the no-ARIA-role call (D2) reads as under-built | a reviewer asks for `role="list"` | stated in the spec, named in the PR body, deferred to its own ticket |

**Precondition for R7 — check before opening the PR:**

```bash
gh pr list --state open --json number,title,files --jq '.[] | select(.files[].path | test("system/specs/|handoff/|components.css")) | "\(.number) \(.title)"'
```

Expected: nothing, or only PRs the ticket's per-ticket context allows (#302 may run alongside — it touches
`/factory`'s and `approach`'s baselines, not `/components`). Observed at planning time: `[]`, no open PRs
at all, so the window is clear right now.

**Two things that look like risks and are not** — recorded so nobody spends a pass on them:

- **Spec file order.** `gen-vocabulary.mjs`'s header warns that per-spec validation inside the build loop
  "fails whenever a child sorts alphabetically after its parent". Here the child (`list-row.md`) sorts
  BEFORE the parent (`list.md`) — observed: `['list-row.md', 'list.md', 'stack.md']` — which is the safe
  direction, and validation runs only after the whole map is built anyway (`gen-vocabulary.mjs:29-35`).
  No ordering hazard.
- **The two seams the #298 hand-off comment calls open** — `handoff-viewer.mjs`'s head pick and
  `catalog.mjs`'s `Children:` line — are **already closed** by #301 (`handoff-viewer.mjs:100-104`,
  `catalog.mjs:92-95`). Do not re-fix either.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/stack.md` (whole file) — Why: **the model for this spec.** The only other committed head
  carrying `childrenCardinality: "many"`; copy its head-key order, its Usage/States/Data binding/
  Accessibility section shape and its argue-the-decision voice.
- `system/specs/list-row.md` (whole file) — Why: the child. Its Accessibility section is the source of the
  no-list-semantics position, and its States section is why the divider inherits the row's border colour.
- `system/specs/empty-state.md` (head + Usage) — Why: the nearest prior art for "what a region says when
  there is nothing". Read it to state in `list.md` why `list` does not just take an `empty-state` child
  (`empty-state` is a standalone framed region with its own dashed border; the list's empty copy sits
  *inside* the list's own frame, and an `empty-state` child would be a second frame inside the first).
- `system/agentic-renderer.mjs:451-470` (`"stack"` template) — Why: the template to MIRROR, including the
  `renderChild(child, …)`-not-`{...child, children: []}` comment block.
- `system/agentic-renderer.mjs:435-445` (`"card"`) and `:496-504` (`"empty-state"`) — Why: the two
  templates that hardcode `[]`, which is correct for them and wrong here. Read so you copy the right one.
- `system/agentic-renderer.mjs:86-96` (`validateComposition`'s children block) — Why: the exact refusal
  strings AC #2 asserts against; do not re-derive them from memory.
- `system/components.css:1527-1631` (`ds-list-row` block) — Why: the chrome the `list` block neutralises.
  Note `border: 1px solid var(--color-border)` + `border-radius: var(--radius-md)` on `.ds-list-row`, and
  that `.is-warn`/`.is-critical` set `border-color` and `background` but never `border-width`.
- `system/components.css:2412-2465` (`ds-stack` block) — Why: the header-comment format and the
  token-only discipline; the new block goes **after** `ds-text` (`:2467-2494`), at the end of the
  spec'd-component run and before `/* ---------- Verdant screen scaffolding … */` (`:2496`).
- `tooling/build-checks.mjs:784-978` — Why: group 3's `#301` section. The new `#303` cases go at its end,
  after the `.ds-stack[data-gap="md"]` inverse control (`:976-977`) and before `group("composition", …)`
  (`:979`).
- `tooling/build-checks.mjs:4919-4942` — Why: the wrapper histogram, its tripwire paragraph and the
  `withWrapper === 3 && withoutWrapper === 20` literal.
- `system/palette.mjs:35` (`CATALOG_COMPONENTS`) — Why: the static list group 21.2 pins.
- `system/catalog.mjs:92-95` (`childrenLine`) and `:297` (the playground render) — Why: `childrenLine`
  already appends `" (many)"`; `:297` renders `{ name, props }` with **no children**, so `list`'s
  `/components` specimen is the empty case by construction.
- `agent-layer/gen-vocabulary.mjs:23-51` (`validateExamples`) and `:80-84` (the conditional projection) —
  Why: the example is fed as `{ name, props: head.example }` with no children array. That decides where
  each half of AC #2 can live.
- `agent-layer/gen-handoff.mjs:34-39` — Why: it throws if a `children` entry names no spec. Adding
  `"list"` to `stack.children` before `system/specs/list.md` exists is a hard throw; order matters.
- `.claude/references/kb-format.md:27` — Why: the `childrenCardinality` format spec, verbatim.
- `.claude/references/gates.md:13` (groups 1–7) and `:112` (`catalog-journey`) — Why: two of the prose
  copies that carry a number this change moves.

### New Files to Create

- `system/specs/list.md` — the ComponentSpec: JSON head + Usage / States / Data binding / Accessibility.

### Files to Update

- `system/components.css` — the `ds-list` block (append after `ds-text`).
- `system/agentic-renderer.mjs` — the `"list"` template, plus two prose counts (`:21`, `:256`).
- `system/specs/stack.md` — `children` gains `"list"`; the Usage paragraph's "ten generic primitives"
  sentence adjusted.
- `system/palette.mjs` — `CATALOG_COMPONENTS` gains `"list"`.
- `tooling/build-checks.mjs` — group 3's `#303` cases, the group-3 summary string, the 21.4 histogram
  literal + tripwire paragraph, and the stale `3/18` at `:94`.
- `tooling/catalog-journey.mjs` — the divider-ownership case (R5). **Beyond the ticket's estimate**; see
  Task 10b's GOTCHA for why it is not optional.
- `.claude/references/gates.md` — the stale `3/17` at `:112`.
- `handoff/verdant/` — regenerated (pack, vocabulary, bundle, index).
- `system/system-graph.json` — regenerated.
- `tooling/visual-regression/baselines/components-{neutral,saulera,verdant}.png` — regenerated.
- `system/loc-summary.json` + the three `approach-*.png` baselines — **conditionally** (see Task 12).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

No external documentation. This is a repo-internal chain with no library involved, no framework and no
runtime dependency. The governing documents are all local:

- `.claude/references/kb-format.md` § ComponentSpec — the head schema both parsers follow.
- `.claude/references/gates.md` — groups 1–7 (what group 3 covers and what it cannot reach), the
  `catalog-journey` line, and the VR gate's scope.
- `.claude/references/token-system.md` — the three-layer mechanic; read only if you think you need a new
  token. **You do not** — see Task 3's GOTCHA.
- `docs/epics/canvas-design-import.prd.md` G24 + G31 — the primitive set and what "list" was decided to be.
- CLAUDE.md § "Where new code goes" → **New component spec** — the four-step chain (spec → `components.css`
  block → `agentic-renderer.mjs` template → regenerate), and the "documented but not composable" red.

### Patterns to Follow

**Spec head key order** (`system/specs/stack.md:1-18`, verbatim order):
`component · status · class · contract · props · tokens · states · children · childrenCardinality · example`

**The `childrenCardinality` key** (`.claude/references/kb-format.md:27`, quoted):

> `childrenCardinality` (optional) — `"many"`, and only that value. Absent means **at most one child** …
> It does not widen `children`: the allowed-names list still decides WHICH components may appear, and this
> key only decides HOW MANY. Refused at parse time on any other value, and refused on a spec whose
> `children` list is empty.

**CSS block header** (`system/components.css:2412`, exact form):

```css
/* ---------- ds-list (system/specs/list.md) — cross-scenario library primitive ---------- */
```

`gen-system-graph.mjs:84` parses the `(system/specs/<name>.md)` out of that header to attribute the
block's `var()` uses to a consumer. Get the header wrong and the component has no consumer row, which
reds group 18's `a consumer block for every one of N components` assertion.

**Template signature and the nesting trap** (`system/agentic-renderer.mjs:451-470`):

```js
  "stack": (props, kids, bus, path) => {
    const box = el("div", { class: "ds-stack", "data-direction": props.direction, /* … */ });
    // The child's OWN children are passed through — NOT `[]`. card and empty-state below pass `[]`
    // because their grammar stops at one leaf; a stack NESTS, so copying that line would drop every
    // grandchild silently, with every gate green …
    kids.forEach((child, i) =>
      box.appendChild(renderChild(child, bus, `${path}.children[${i}]`)));
    return box;
  },
```

**`el()`'s absence rule**: `el()` skips a `null`/`undefined` attribute value, which is how `stack` expresses
"no gap" with no `--spacing-none` token. `list` uses the same idea for `header`: no prop, no element.

**Build-checks assertion shape** (group 3 throughout): every case is `try { … } catch (e) { threw = e }`
then `ok(…)` on **both** the throw and the message, with a stated reason — "a gate that throws with the
wrong message is a gate nobody can debug" (`:817-820`). Every "this must pass" case is paired with a
**mutation** that must make it fail (`:762-773`, `:817-824`).

**DOM-stub rendering inside build-checks** (`:840-848`):

```js
  domStubControl();
  globalThis.document = domStub();
  let node = null;
  try { node = renderComposition(VOCAB, /* … */, null); } finally { delete globalThis.document; }
  ok(node && stubText(node).includes("…"), "…");
```

---

## IMPLEMENTATION PLAN

### Phase 1: the spec

The head is the source of truth for the parser, the vocabulary, the pack and the catalog. Write it first
and prove it parses before anything reads it.

**Tasks:** Task 1.

### Phase 2: the render path

**Depends on:** Phase 1 (the CSS block's header cites the spec path; the template's classes must match the
block).

CSS block and template. After this the component exists but nothing generated knows about it.

**Tasks:** Tasks 2–3.

### Phase 3: the composability edits

**Depends on:** Phase 1 (`gen-handoff` throws if `stack.children` names a spec that does not exist).
**Independent of:** Phase 2 — but there is no reason to split them; run top to bottom.

`stack.children` gains `list`; `CATALOG_COMPONENTS` gains `list`.

**Tasks:** Tasks 4–5.

### Phase 4: regenerate

**Depends on:** Phases 1–3. Five generators, in chain order.

**Tasks:** Task 6.

### Phase 5: the gates

**Depends on:** Phase 4 (every new case reads the **regenerated** `handoff/verdant/vocabulary.json`).

Group 3's `list` cases, the histogram, the three stale prose copies, and the one check nothing else in the
repo can make — that the divider rules WIN at runtime (Task 10b, R5).

**Tasks:** Tasks 7–10, 10b.

### Phase 6: baselines and the conditional cascade

**Depends on:** Phase 5 green. Baselines LAST, from a clean tree (memory: the VR gate screenshots the
**dirty** working tree).

**Tasks:** Tasks 11–13.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `system/specs/list.md`

- **IMPLEMENT**: the ComponentSpec. The JSON head, in `stack.md`'s key order:

```json
{
  "component": "list",
  "status": "shipped",
  "class": "ds-list",
  "contract": null,
  "props": {
    "header": { "type": "string", "required": false, "description": "an optional section title above the rows — two or three words naming what the rows are, e.g. \"Oversold SKUs\"; absent renders no header at all" },
    "empty":  { "type": "string", "required": true,  "description": "what this region says when it holds no rows — one sentence, e.g. \"No readings yet\"; required because a list's empty state is part of its design, not a runtime accident" }
  },
  "tokens": ["--color-bg-surface", "--color-border", "--color-fg-muted", "--radius-md", "--spacing-lg", "--spacing-md", "--spacing-sm", "--type-body", "--type-eyebrow"],
  "states": ["default"],
  "children": ["list-row"],
  "childrenCardinality": "many",
  "example": { "header": "Short this week", "empty": "No shortfalls — every SKU is covered." }
}
```

  Then four prose sections, in `stack.md`'s voice, each ARGUING its decision:

  - **Usage** — what it is (the container of `list-row`s, `ds-` library-generic, the second spec to declare
    `childrenCardinality: "many"` and the first whose allowed list is one name). Three decisions to argue:
    (1) **`empty` is required** — a list's empty state is a design decision, and with #302's
    base-plus-overrides an empty-list state is an override that removes the children, so the copy has to be
    on the container already or the region goes blank; (2) **the empty copy is a PROP, not a child** — an
    `empty-state` child would put a second dashed frame inside this one's frame, and a hidden child is a
    thing that renders when it should not (cite `empty-state.md`); (3) **the dividers are the container's**
    — a row does not know whether it has a neighbour, so a row that drew its own separator would draw one
    after the last row or none at all. State the bound it inherits from `list-row`: a handful of rows that
    carry the answer, **not one row per record — this is not a table**, and no sort, columns, header row or
    pagination.
  - **States** — `default`, the only one. No hover/focus/pressed: the container is not a control. Two
    branches of one state, named as branches not states: **with rows** (header, then rows separated by
    hairlines) and **with none** (header, then the `empty` copy). Say that tone is the row's, per row, and
    that a `warn`/`critical` row keeps its accent inside the list — including its divider, because the
    divider is the row's own `border-top-color`.
  - **Data binding** — `contract: null`, structural. A prop table in `empty-state.md`'s shape:

    | Prop | Element | When absent |
    | --- | --- | --- |
    | `header` | `.ds-list-header` above the rows | no element at all |
    | `empty` | `.ds-list-empty`, rendered only when there are no rows | required |

    Plus: children render through their own templates in array order, exactly as they would render alone;
    the container adds arrangement and separation, never behaviour.
  - **Accessibility** — the one that needs the most care. State: **the container claims no role.** Each
    row is already one paragraph that reads as a coherent sentence (`list-row.md`'s Accessibility), and
    `role="list"` requires `role="listitem"` on each row, which is `list-row`'s decision and this ticket
    does not touch `list-row`. A `role="list"` with no `listitem` children reports an empty list, which is
    worse than no claim. Name the deferred decision explicitly so the next reader does not "fix" it. Then:
    the header is a `<p>`, not a heading — a heading would insert this container into the page outline,
    and a composed screen's outline is the composition's business (cite `nav-tabs.md`'s "depiction, not
    behaviour" reasoning); the empty copy is ordinary prose in the reading order where the rows would have
    been, not a live region, because it renders at-rest absence (`empty-state.md`'s exact argument);
    colour is never the sole signal — the dividers are structure and the tone colours are the rows' own;
    `min-width: 0` so a list inside a flex row shrinks rather than blowing it out.
- **PATTERN**: `system/specs/stack.md` (head key order, section shape, voice); `system/specs/empty-state.md`
  (the prop table, the at-rest-absence argument); `system/specs/list-row.md` (the bound, the tone argument).
- **IMPORTS**: none (a markdown file).
- **GOTCHA**: the `tokens` array must be **exactly** the distinct contract tokens the CSS block in Task 2
  references — no more, no fewer. Build-checks 18 (`:4190-4192`) asserts the join is 1:1 with
  `spec.tokens.length` and that every one resolves to a contract group. Write the block first if you
  prefer, then read the tokens back off it; the nine above are the ones the block in Task 2 uses.
- **GOTCHA**: `example` is validated **semantically** at generation time — `validateExamples` feeds it to
  the real `validateComposition` as `{ name: "list", props: example }` with **no children**. So the example
  renders the EMPTY case, which is exactly what AC #2's empty-case half needs. Do not put a `children` key
  in the example; the head schema has no such key and the parser will refuse it.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{const r=m.parseComponentSpec('system/specs/list.md');console.log(r.head.component, r.head.childrenCardinality, JSON.stringify(r.head.children), r.sections.map(s=>s.title).join(' | '))})"`
  → expected: `list many ["list-row"] Usage | States | Data binding | Accessibility`
- **REDDENS**: change `"childrenCardinality": "many"` to `"lots"` and re-run the VALIDATE → must throw
  `head "childrenCardinality" ("lots") must be "many" — absent means at most one child`. Set `children` to
  `[]` while keeping the cardinality → must throw `"children" lists no allowed names — a cardinality on a
  leaf is a rule that cannot fire`. (Both refusals observed live in `agent-layer/lib.mjs`; the exact
  wording is in `.claude/plans/canvas-grammar-children-many.md:235-238`.)
- **SATISFIES**: AC #1 (the spec), AC #2 (the empty-case example).
- **REGENERATES**: none yet — Task 6 runs the chain once, after every source edit.

### ADD the `ds-list` block to `system/components.css`

- **IMPLEMENT**: append after the `ds-text` block (ends `:2494`) and before
  `/* ---------- Verdant screen scaffolding … */` (`:2496`):

```css
/* ---------- ds-list (system/specs/list.md) — cross-scenario library primitive ---------- */

/* The container of ds-list-rows (#303, epic #295 G31), and the FIRST block in this file to style
   another component's class. That is deliberate and it is bounded: list-row's own block is
   untouched, so a row rendered anywhere else keeps its card. Inside a list it should not be a card
   — a column of bordered, rounded boxes is a pile, not a list — so the container takes the row's
   chrome off and draws ONE hairline between neighbours instead. The row cannot do this itself: it
   does not know whether it has a neighbour, so a self-drawn separator is one after the last row or
   none at all. The selectors are (0,2,0) and (0,3,0) against list-row's own (0,1,0)/(0,2,0), so
   this wins on specificity rather than on file order. */
.ds-list {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  /* The rows go square so their corners cannot poke through the container's radius. */
  overflow: hidden;
  /* A list inside a flex row shrinks rather than blowing it out (the ds-stack/ds-text precedent). */
  min-width: 0;
}

/* A <p>, not a heading: a composed screen's outline is the composition's business, not a
   container's (spec's Accessibility note). */
.ds-list-header {
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-fg-muted);
  font-size: var(--type-eyebrow);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* border-WIDTH, not `border: none`: list-row's tone variants set border-COLOR and never width, so
   zeroing the width leaves is-warn's accent available to the divider rule below. Background is
   left alone for the same reason — is-critical's accent fill is the row's own signal and must
   survive being put in a list. */
.ds-list > .ds-list-row { border-width: 0; border-radius: 0; }
.ds-list > .ds-list-row + .ds-list-row { border-top-width: 1px; }

/* Absence, stated in the reading position the rows would have occupied. Rendered ONLY when there
   are no rows (agentic-renderer's list template) — a hidden child is a thing that renders when it
   should not. No dashed frame here: that is ds-empty-state's, and a second frame inside this
   container's own would be two boxes for one absence. */
.ds-list-empty {
  margin: 0;
  padding: var(--spacing-lg) var(--spacing-md);
  color: var(--color-fg-muted);
  font-size: var(--type-body);
  text-align: center;
}
```

- **PATTERN**: `system/components.css:2412` (header form), `:1527-1631` (`ds-list-row`, the chrome being
  neutralised), `:2032-2057` (`ds-empty-state`, the muted-prose-in-a-frame idiom).
- **IMPORTS**: n/a.
- **GOTCHA**: **token-only.** No literal colour, size or radius. The three non-token values above
  (`0.08em`, `700`, `uppercase`, `1px`) are the same non-token values `.ds-row-status` already uses
  (`:1595-1603`) — `token-lint` checks `var(--…)` references against the contract, not typography
  keywords. Do not add a token for any of them.
- **GOTCHA**: do **not** put these rules in `list-row`'s block, and do not edit `list-row`'s block at all.
  `gen-system-graph` attributes a block's `var()` uses to the consumer named in its **header**, so a
  divider rule living under `list-row`'s header would tell the graph (and `/components`' token table) that
  `list-row` consumes a token `list` actually consumes.
- **GOTCHA** (recorded trap, `overflow-clip breaks sticky`): `overflow: hidden` here makes any
  `position: sticky` descendant a no-op. Nothing in a `list-row` is sticky today and nothing should be; if
  a future row wants a sticky element, this is the line it will fight.
- **VALIDATE**: `node tooling/token-lint.mjs` → expected `token lint ✓` with no UNDECLARED and no ORPHAN.
  Then `grep -c "var(--" ` on the block and reconcile with Task 1's `tokens` array:
  `node -e "const fs=require('fs');const c=fs.readFileSync('system/components.css','utf8');const s=c.indexOf('/* ---------- ds-list (');const e=c.indexOf('/* ---------- Verdant screen scaffolding',s);const b=c.slice(s,e);const t=[...new Set([...b.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map(m=>m[1]))].sort();console.log(t.length,JSON.stringify(t))"`
  → expected `9 ["--color-bg-surface","--color-border","--color-fg-muted","--radius-md","--spacing-lg","--spacing-md","--spacing-sm","--type-body","--type-eyebrow"]`, identical to the spec's `tokens`.
- **REDDENS**: n/a (this task adds no check). Its correctness is proven by Task 8's render cases and by the
  `/components` baselines in Task 11.
- **SATISFIES**: AC #1 (the CSS block; dividers are the container's).
- **REGENERATES**: `system/system-graph.json` (new consumer + edges) — Task 6.

### ADD the `"list"` template to `system/agentic-renderer.mjs`

- **IMPLEMENT**: in `TEMPLATES`, beside the other containers (put it after `"stack"` at `:451-470` and
  before `"text"`, so the two `many` containers sit together):

```js
  // The LIST CONTAINER (#303, epic #295 G31) — the second entry to declare childrenCardinality:
  // "many" and the first whose allowed list is a single name. Two branches of one state, and the
  // branch is the CHILD COUNT: rows, or the empty copy. The empty copy is a PROP rendered on the
  // zero branch, never a hidden child — `hidden` is defeated by any author rule that sets display
  // (#138), and a child that must not render is a child that will.
  //
  // Children go through renderChild with their OWN children, the `stack` line and NOT card's
  // hardcoded `[]`: list-row is a leaf today so the two behave identically, and copying the wrong
  // one would silently drop grandchildren the day it stops being one. build-checks group 3's
  // container walk renders stack > list > list-row and looks for the row's text.
  "list": (props, kids, bus, path) => {
    const box = el("div", { class: "ds-list" });
    if (props.header != null) box.appendChild(el("p", { class: "ds-list-header", text: props.header }));
    kids.forEach((child, i) => box.appendChild(renderChild(child, bus, `${path}.children[${i}]`)));
    if (kids.length === 0) box.appendChild(el("p", { class: "ds-list-empty", text: props.empty }));
    return box;
  },
```

  Then the two prose counts: `:21` `The twenty-three templates` → `The twenty-four templates`, and `:256`
  `the canonical DOM realization of the twenty-three specs` → `twenty-four`.
- **PATTERN**: `system/agentic-renderer.mjs:451-470` (`stack`), `:496-504` (`empty-state`'s optional-second-
  element shape).
- **IMPORTS**: none new — `el` and `renderChild` are module-local.
- **GOTCHA**: `props.header != null` (loose), not `props.header !== undefined`. The whole file uses `!= null`
  for optional props (`:375-383`, `:438`, `:501`); a `null` arriving from a JSON round-trip must render
  nothing, not the string "null".
- **GOTCHA**: the empty branch is `kids.length === 0`, **after** the children loop, so DOM order is
  header → rows → (nothing) or header → (no rows) → empty. Do not early-return on the empty branch: the
  header must render in both branches.
- **VALIDATE**:
  `node -e "import('./system/agentic-renderer.mjs').then(m=>console.log('list template present:', typeof m.renderComposition==='function'))"` plus, after Task 6 regenerates the vocabulary, the render
  cases in Task 8. Before Task 6 the vocabulary has no `list` entry, so a render call cannot be driven here.
- **REDDENS**: n/a (no check added). Task 8's `ok(!stubText(filledNode).includes(EMPTY_COPY))` is the check
  that reddens if the empty branch loses its `kids.length === 0` guard.
- **SATISFIES**: AC #1 (the template; the empty case renders the empty copy).
- **REGENERATES**: `system/loc-summary.json` **conditionally** — Task 12.

### UPDATE `system/specs/stack.md` — `children` gains `"list"`

- **IMPLEMENT**: insert `"list"` into the `children` array in alphabetical position (after
  `"ghost-button"`, before `"modal-dialog"`), giving eleven names. Then adjust the Usage paragraph that
  reads "The `children` list is the epic's own ten generic primitives (`docs/epics/canvas-design-import.prd.md`
  G24), alphabetical, `stack` and `text` included." — the list is now those primitives **as they exist**, and
  `list` (#303) is the third to land. Keep the paragraph's existing final sentences (the `screen-header`
  class-prefix note, the "widening it is one line here plus a regeneration" note) verbatim; that second
  sentence is the licence this edit uses.
- **PATTERN**: the array itself, `system/specs/stack.md:16`.
- **IMPORTS**: n/a.
- **GOTCHA**: this must come **after** `system/specs/list.md` exists. `agent-layer/gen-handoff.mjs:34-38`
  throws `children entry "list" names no spec in system/specs/` otherwise — which is a useful positive
  control if you want to see it, but it fails the whole chain.
- **GOTCHA**: this is the edit that creates the `stack > list > list-row` pair in group 3's `deepPairs`
  walk (`:874-905`). Without it, `list` has no container listing it, `list` as a parent yields no pair (its
  only child, `list-row`, is a leaf), and the walk **never renders `list` at all**. That is why Task 8
  writes an explicit render case rather than leaning on the walk.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{const r=m.parseComponentSpec('system/specs/stack.md');console.log(r.head.children.length, JSON.stringify(r.head.children))})"`
  → expected `11 ["card","ghost-button","list","modal-dialog","nav-tabs","primary-button","screen-header","select-field","stack","text","text-field"]`
  (observed before this change: `10 ["card","ghost-button","modal-dialog","nav-tabs","primary-button","screen-header","select-field","stack","text","text-field"]`)
- **REDDENS**: n/a.
- **SATISFIES**: AC #1 (composability — a `list` that no container can hold is not through the chain).
- **REGENERATES**: `handoff/verdant/*` — Task 6.

### UPDATE `system/palette.mjs` — `CATALOG_COMPONENTS` gains `"list"`

- **IMPLEMENT**: add `"list"` to the array at `:35`, in whatever order the array already uses (read it:
  build-checks 21.2 sorts both sides before comparing, so position does not matter to the gate — match the
  file's existing convention anyway).
- **PATTERN**: the array at `system/palette.mjs:35`; the reason it is static is `:122-125` (the palette
  memoizes, memory: *Palette memoizes — chrome needs static tags*).
- **IMPORTS**: n/a.
- **GOTCHA**: **this is a hard red if you skip it.** `tooling/build-checks.mjs:4871` asserts
  `deep([...CATALOG_COMPONENTS].sort()) === deep(vocabNames)`. A spec that reaches the vocabulary without
  this edit fails group 21 with `palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary`.
- **VALIDATE**: after Task 6,
  `node -e "Promise.all([import('./system/palette.mjs'),import('node:fs')]).then(([p,fs])=>{const v=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const a=[...p.CATALOG_COMPONENTS].sort(),b=Object.keys(v.components).sort();console.log(a.length,b.length,JSON.stringify(a)===JSON.stringify(b))})"`
  → expected `24 24 true`
- **REDDENS**: remove `"list"` again and re-run → `false`, and `node tooling/build-checks.mjs` fails group
  21 naming both arrays.
- **SATISFIES**: AC #3 (`catalog-journey` green — the page renders every vocabulary component and the
  palette must offer each one).
- **REGENERATES**: none.

### RUN the regenerator chain (FIVE, not four)

- **IMPLEMENT**: in this order — the order is source-pinned in `tooling/drift-check.mjs` and
  `agent-layer/build.mjs` and it matters:

```bash
node agent-layer/gen-handoff.mjs      # pack.json + contracts/ + wc/ + tokens/  (needs tooling/style-dictionary/node_modules — present, observed)
node agent-layer/gen-vocabulary.mjs   # vocabulary.json
node agent-layer/gen-pack-bundle.mjs  # pack.bundle.json — INLINES pack.json, so it must follow it
node agent-layer/gen-pack-index.mjs   # llms.txt — MEASURES the bundle's bytes, so it must follow the bundle
node agent-layer/gen-system-graph.mjs # system/system-graph.json — new consumer + 9 edges
```

- **PATTERN**: `agent-layer/build.mjs:35-48` (the call order), `tooling/drift-check.mjs:19-22` (the same
  order, pinned).
- **IMPORTS**: n/a.
- **GOTCHA**: **AC #3's "the four regenerators" is stale.** `gen-pack-index.mjs` landed three commits ago
  (#419, `ceea07a`/`8b318a0`) and writes `handoff/verdant/llms.txt`, one line per pack file as
  `path · bytes · what it is · read when`. A new component grows `pack.json`, which moves its byte count,
  which moves `pack.bundle.json`, which moves its own byte count — so both the bundle and the index
  regenerate even though this change adds no pack FILE. Say "five" in the PR body and say why.
- **GOTCHA**: no new **routing rule** is needed. The pack ships no per-spec files (observed:
  `handoff/verdant/` = `contracts/ figma-import.md llms.txt pack.bundle.json pack.json tokens/
  tokens.dtcg.json vocabulary.json wc/`), so `list` adds no path for group 39's totality check to refuse.
- **GOTCHA** (recorded trap, *drift-check mid-merge false positive*): if you merged `origin/main` into this
  branch, complete the merge before running drift-check — staged merge changes read as "drift after
  regeneration". A generated-file conflict resolves by regeneration, never by hand-edit.
- **VALIDATE**: `git diff --stat handoff/ system/system-graph.json` → expected: only
  `handoff/verdant/pack.json`, `handoff/verdant/vocabulary.json`, `handoff/verdant/pack.bundle.json`,
  `handoff/verdant/llms.txt`, `system/system-graph.json`. Then
  `node tooling/drift-check.mjs` → expected all legs green, no drift.
  Then `node -e "const v=require('./handoff/verdant/vocabulary.json');console.log('components:',Object.keys(v.components).length);console.log('list.childrenCardinality:',JSON.stringify(v.components.list.childrenCardinality));console.log('list.children:',JSON.stringify(v.components.list.children));console.log('list-row has the key:',Object.hasOwn(v.components['list-row'],'childrenCardinality'))"`
  → expected `components: 24` / `list.childrenCardinality: "many"` / `list.children: ["list-row"]` /
  `list-row has the key: false`
  (observed before this change: `components: 23`, `composition.version: 2`)
- **REDDENS**: n/a.
- **SATISFIES**: AC #3 (the regenerators).
- **REGENERATES**: this task IS the regeneration. `handoff/verdant/{pack.json,vocabulary.json,pack.bundle.json,llms.txt}`
  + `system/system-graph.json`. `system/loc-summary.json` is Task 12's; `system/param-count.json` does not
  move (observed: `121 controls — no drift`, and nothing here adds a control).

### UPDATE the wrapper histogram, `tooling/build-checks.mjs:4919-4942`

- **IMPLEMENT**: two edits in the same place.
  1. The literal at `:4941`: `ok(withWrapper === 3 && withoutWrapper === 20, …(pinned 3/20…))` →
     `withoutWrapper === 21` and `(pinned 3/21…)`.
  2. Extend the tripwire paragraph above it (`:4919-4928`) with one sentence in its established form:
     `#303 moved it 3/20 → 3/21: list (the third of epic #295's five generic primitives) likewise ships
     wrapper-less — there is no vd-list custom element and the pack does not claim one — so its absent
     vd/react tabs are honest in exactly the same way.`
- **PATTERN**: the three sentences already in that paragraph (`#220`'s, the design-import spike's, `#301`'s)
  — each names the moving number, the components, and why the absent tabs are honest. Copy the form.
- **IMPORTS**: n/a.
- **GOTCHA** (recorded trap, *Gate prose has three copies*): this number has **four** copies and two are
  already stale. Fix all of them in this PR:
  - `tooling/build-checks.mjs:4941` — the live literal, `3/20` → `3/21`.
  - `tooling/build-checks.mjs:4919` — the comment `tabsFor's 3/18 wrapper histogram` **and** `:94` (the
    group index) — both say `3/18`, stale since #301. Update both to `3/21`.
  - `.claude/references/gates.md:112` — `the 3/17 wrapper gating` in the `catalog-journey.mjs` line, stale
    since the design-import spike. Update to `3/21`.
  - `tooling/build-checks.mjs:5056` (the group-21 summary string) is **derived** (`${withWrapper}/${withoutWrapper}`)
    — leave it alone.
  - `tooling/catalog-journey.mjs` derives `WRAPPER_COUNT` from the fetched pack (`:240`) — no literal, no edit.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build catalog|^build ✓"` → expected
  `build catalog ✓ …` and `build ✓  all 39 groups pass`.
- **REDDENS**: set the literal back to `20` → group 21 fails with
  `the wrapper histogram moved — 3 with / 21 without (pinned 3/20; …)`. That IS the check, and it is the
  one that told you the number moved.
- **SATISFIES**: AC #3 (build-checks green).
- **REGENERATES**: none.

### ADD group 3's `#303` cases to `tooling/build-checks.mjs`

- **IMPLEMENT**: insert after the `.ds-stack[data-gap="md"]` inverse control (`:976-977`) and **before**
  `group("composition", …)` (`:979`). Seven cases:

```js
  // --- #303: `list`, the SECOND real user of the cardinality ------------------------------
  //
  // Why these are here and not in group 18: validateExamples feeds an example as
  // { name, props: head.example } with NO children array (gen-vocabulary.mjs:41), so a
  // many-children EXAMPLE is unreachable there — #298 and #301 both landed their many cases
  // beside the grammar cases for the same reason. What group 18 DOES prove for this component is
  // the empty case, because a childless render is exactly what it drives.

  // 1 · THE PROJECTED KEY, BY NAME — the #301 assertion, for the second declaring spec. list is the
  // first whose allowed list is a SINGLE name, which is the shape #304's importer targets.
  ok(VOCAB.components.list?.childrenCardinality === "many",
    `list's vocabulary entry does not carry childrenCardinality: "many" (got ${JSON.stringify(VOCAB.components.list?.childrenCardinality)})`);
  // JSON.stringify, NOT deep(): `deep` is declared inside each group block that uses it and the
  // earliest declaration is :2945 — it is not in scope here (observed).
  ok(JSON.stringify(VOCAB.components.list?.children) === JSON.stringify(["list-row"]),
    `list's allowed children are not exactly ["list-row"] — got ${JSON.stringify(VOCAB.components.list?.children)}`);
  // …and list-row, the child, must NOT have gained the key: this ticket changes nothing about it.
  ok(!Object.hasOwn(VOCAB.components["list-row"] ?? {}, "childrenCardinality"),
    "list-row's vocabulary entry carries a childrenCardinality key — this ticket must not change list-row");

  // 2 · THREE ROWS VALIDATE against the real vocabulary.
  const ROWS_303 = [1, 2, 3].map((n) => ({ name: "list-row", props: { label: `Row ${n}`, value: String(n) } }));
  const LIST_303 = { name: "list", props: { header: "Short this week", empty: "Nothing short." }, children: ROWS_303 };
  let listThrew = null;
  try { validateComposition(VOCAB, [LIST_303]); } catch (err) { listThrew = err; }
  ok(listThrew === null, `a list holding three list-rows was refused — ${listThrew && listThrew.message}`);

  // 3 · AND IT CANNOT PASS VACUOUSLY — the #301 mutation, applied to list.
  const { childrenCardinality: _listCard, ...listNoCard } = VOCAB.components.list;
  let listMutThrew = null;
  try { validateComposition({ ...VOCAB, components: { ...VOCAB.components, list: listNoCard } }, [LIST_303]); }
  catch (err) { listMutThrew = err; }
  ok(listMutThrew && /at most one child \(got 3\)/.test(listMutThrew.message),
    `dropping list's cardinality still accepted three rows — case 2 proves nothing (got: ${listMutThrew && listMutThrew.message})`);

  // 4 · A NON-list-row CHILD IS REFUSED, by index and by name (AC #2). Asserted on the MESSAGE:
  // this is the refusal #304's recogniser will read when a source list holds something that is not
  // a row, and a refusal that does not name the offender is a refusal nobody can act on.
  let badKidThrew = null;
  try {
    validateComposition(VOCAB, [{ name: "list", props: { empty: "x" },
      children: [ROWS_303[0], { name: "card", props: { title: "T" } }] }]);
  } catch (err) { badKidThrew = err; }
  ok(badKidThrew && /children\[1\]: "card" is not an allowed child of list \(allowed: list-row\)/.test(badKidThrew.message),
    `a non-list-row child was not refused by index AND name — got: ${badKidThrew && badKidThrew.message}`);

  // 5 · THE TWO BRANCHES RENDER, and the empty copy is a BRANCH rather than a hidden child. The
  // hidden-child failure mode is real in this repo (#138: `hidden` is defeated by any author rule
  // that sets display), so the assertion is that the element does not EXIST, not that it is hidden.
  domStubControl();
  globalThis.document = domStub();
  let emptyNode = null;
  let filledNode = null;
  let headerlessNode = null;
  try {
    emptyNode = renderComposition(VOCAB, { name: "list", props: { header: "Short this week", empty: "Nothing short." } }, null);
    filledNode = renderComposition(VOCAB, LIST_303, null);
    headerlessNode = renderComposition(VOCAB, { name: "list", props: { empty: "Nothing short." } }, null);
  } finally { delete globalThis.document; }
  const elems = (n) => (n?.children ?? []).filter((c) => c.tagName !== "#text");
  ok(emptyNode && stubText(emptyNode).includes("Nothing short.") && stubText(emptyNode).includes("Short this week"),
    `the empty branch did not render its header and empty copy — got ${JSON.stringify(stubText(emptyNode))}`);
  ok(filledNode && stubText(filledNode).includes("Row 3"),
    `the rows branch dropped a row — got ${JSON.stringify(stubText(filledNode))}`);
  ok(filledNode && !stubText(filledNode).includes("Nothing short."),
    "a list holding rows rendered its empty copy anyway — the empty case must be a BRANCH, not a hidden child");
  ok(filledNode && !elems(filledNode).some((c) => c.getAttribute("class") === "ds-list-empty"),
    "a list holding rows still emitted a .ds-list-empty element — `hidden` is defeated by any author display rule (#138), so absence must be absence");
  ok(headerlessNode && !elems(headerlessNode).some((c) => c.getAttribute("class") === "ds-list-header"),
    "an absent header emitted a .ds-list-header element anyway — absence must express itself as no element");
  // …and the COUNT, because every assertion above is satisfied by a template that appends its header
  // twice. Header + three rows = four elements; header + the empty copy = two.
  ok(filledNode && elems(filledNode).length === 4,
    `the rows branch emitted ${filledNode && elems(filledNode).length} elements, not 4 (header + 3 rows) — an element is duplicated or missing`);
  ok(emptyNode && elems(emptyNode).length === 2,
    `the empty branch emitted ${emptyNode && elems(emptyNode).length} elements, not 2 (header + empty copy)`);
  ok(emptyNode && emptyNode.getAttribute("class") === "ds-list",
    `the list did not render as a .ds-list (got ${JSON.stringify(emptyNode && emptyNode.getAttribute("class"))})`);

  // 6 · THE DIVIDERS ARE THE CONTAINER'S (AC #1), asserted on the SHEET the way case 6 above
  // asserts S2's condition — the renderer cannot see CSS, and the pixel gate cannot say WHOSE
  // rule drew a line. Both halves: list's block takes the row's chrome off and puts the divider
  // back between neighbours, and list-row's OWN block still declares its standalone border.
  const CSS_303 = CSS_301; // the same file already read for case 6
  ok(/\.ds-list\s*>\s*\.ds-list-row\s*\{[^}]*border-width:\s*0/.test(CSS_303),
    "the ds-list block does not zero the row's border-width — rows inside a list are still cards");
  ok(/\.ds-list\s*>\s*\.ds-list-row\s*\+\s*\.ds-list-row\s*\{[^}]*border-top-width:\s*1px/.test(CSS_303),
    "the ds-list block draws no divider between adjacent rows — AC #1 says the dividers are the container's");
  // The INVERSE control: list-row standalone is UNCHANGED, which is the ticket's own constraint.
  const rowStart = CSS_303.indexOf(".ds-list-row {");
  ok(rowStart !== -1, "components.css has no bare `.ds-list-row {` rule — this pair has lost its subject");
  const rowRule = rowStart === -1 ? "" : CSS_303.slice(rowStart, CSS_303.indexOf("}", rowStart) + 1);
  ok(/border:\s*1px solid var\(--color-border\)/.test(rowRule) && /border-radius:\s*var\(--radius-md\)/.test(rowRule),
    `list-row's own block lost its border or radius — a row outside a list must still be a card: ${rowRule}`);
```

  Then extend the `group("composition", …)` summary string (`:979`) with a `·`-separated clause naming what
  `#303` added and what it cannot reach, in the file's established voice — e.g. `· #303's list, the second
  committed spec to declare the cardinality and the first whose allowed list is a single name: the projected
  key by name with list-row proven NOT to have gained it, three rows accepted with the cardinality-removed
  mutation refusing them by count, a non-list-row child refused by INDEX and by NAME (the refusal #304's
  recogniser reads), both branches RENDERED under the stub with the empty copy proven to be a branch rather
  than a hidden child (#138's failure mode: hidden is defeated by any author display rule), both absence
  halves asserted as absent ELEMENTS and the element COUNT pinned in BOTH branches (every other case here
  is satisfied by a template that appends its header twice), and the dividers proven to be the CONTAINER's on the sheet — list's
  block zeroing the row's border-width and putting one back between neighbours, with list-row's own bare
  rule asserted UNCHANGED as the inverse control, because the renderer cannot see CSS and the pixel gate
  cannot say whose rule drew a line`.
- **PATTERN**: `tooling/build-checks.mjs:784-978` — every assertion form above is lifted from #301's cases
  in that range (`:791` the projected key, `:817-824` the mutation, `:840-848` the DOM stub, `:965-977` the
  CSS slice + inverse control).
- **IMPORTS**: none new. `validateComposition`, `renderComposition`, `domStub`, `domStubControl`, `stubText`,
  `ok` and `CSS_301` are all already in scope at that point in the file. **`deep` is NOT** — it is declared
  inside each group block that uses it and the earliest is `:2945` (observed), which is why case 1 compares
  with `JSON.stringify` on both sides.
- **GOTCHA**: case 6 reuses `CSS_301`, the `readFileSync` at `:965`. Do not read the file a second time.
- **GOTCHA**: the refusal string in case 4 is **observed**, not recalled. Run before this change:
  `node -e "import('./system/agentic-renderer.mjs').then(async m=>{const fs=await import('node:fs');const V=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const S={...V,components:{...V.components,list:{class:'ds-list',status:'spec',props:{empty:{type:'string',required:true}},states:['default'],children:['list-row'],childrenCardinality:'many',usage:'',contract:null}}};try{m.validateComposition(S,[{name:'list',props:{empty:'x'},children:[{name:'list-row',props:{label:'L',value:'1'}},{name:'card',props:{title:'T'}}]}])}catch(e){console.log(e.message)}})"`
  → observed: `composition[0].children[1]: "card" is not an allowed child of list (allowed: list-row)`
- **GOTCHA**: do **not** put the three-row case in group 18. `validateExamples` cannot carry children; a
  three-row example is unreachable there and #298/#301 both made the same call. State this relocation as a
  deviation in the report (see Open Questions, D4).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → expected `build ✓  all 39 groups pass`
  (observed on the current tree before any change: `build ✓  all 39 groups pass`, 39 groups).
- **REDDENS**, one per case:
  - case 1 → misspell the projected key in `agent-layer/gen-vocabulary.mjs:82` (`childrenCardinallity`),
    regenerate → `list's vocabulary entry does not carry childrenCardinality: "many" (got undefined)`.
  - case 2/3 → delete `childrenCardinality` from `system/specs/list.md`, regenerate → case 2 fails with
    `a list holding three list-rows was refused — … allows at most one child (got 3)`.
  - case 4 → add `"card"` to `list.children`, regenerate → `a non-list-row child was not refused by index
    AND name — got: undefined`.
  - case 5 → remove the `kids.length === 0` guard from the template so the empty copy always renders →
    `a list holding rows rendered its empty copy anyway`. Separately, delete the `props.header != null`
    guard → `an absent header emitted a .ds-list-header element anyway`.
  - case 6 → delete the `border-top-width: 1px` rule from the `ds-list` block →
    `the ds-list block draws no divider between adjacent rows`. Delete `border: 1px solid …` from
    `.ds-list-row {` → `list-row's own block lost its border or radius`.
  **Run each of these, watch it go red, revert it, and record the observed message in the report.** A check
  whose reddening you did not observe is a check you have not proven (memory: *The check that cannot fail* —
  every #137 defect survived a green gate the same way).
- **SATISFIES**: AC #1 (empty case a prop; dividers the container's), AC #2 (three rows + the refusal,
  asserted by running `validateComposition`), AC #3 (build-checks green).
- **REGENERATES**: none.

### VERIFY group 18 picks up the empty-case example

- **IMPLEMENT**: nothing. This task is a **read**, and it exists because AC #2 names group 18 and the plan
  is relocating half of it. Confirm that `list`'s `example` is counted and validated.
- **PATTERN**: `tooling/build-checks.mjs:4126-4140` (`validateExamples` over the real specs, count read off
  `pack.json` rather than typed).
- **VALIDATE**:
  `node -e "Promise.all([import('./agent-layer/gen-vocabulary.mjs'),import('./agent-layer/lib.mjs'),import('node:fs')]).then(([gv,lib,fs])=>{const V=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const P=JSON.parse(fs.readFileSync('handoff/verdant/pack.json','utf8'));const specs=fs.readdirSync('system/specs').filter(f=>f.endsWith('.md')).map(f=>lib.parseComponentSpec('system/specs/'+f));console.log('validateExamples:',JSON.stringify(gv.validateExamples(specs,V)));console.log('pack examples:',P.components.filter(c=>c.example!==undefined).length);console.log('list example:',JSON.stringify(P.components.find(c=>c.component==='list')?.example))})"`
  → expected: the two counts equal and each one higher than before, and
  `list example: {"header":"Short this week","empty":"No shortfalls — every SKU is covered."}`
- **REDDENS**: put `{"header": 7, "empty": "x"}` in the example → `node agent-layer/gen-vocabulary.mjs`
  must fail naming the spec path: `system/specs/list.md: head "example" does not render — list.example.props.header: expected string, got number`.
  Observe it, then revert.
- **SATISFIES**: AC #2 (the empty-case example half).
- **REGENERATES**: none.

### RUN the full pure gate

- **IMPLEMENT**: nothing new — this is the checkpoint before anything slow.
- **VALIDATE**:
  ```bash
  node tooling/build-checks.mjs          # expected: build ✓  all 39 groups pass
  node tooling/token-lint.mjs            # expected: token lint ✓
  node tooling/drift-check.mjs           # expected: every leg green, no drift
  ```
- **REDDENS**: n/a.
- **SATISFIES**: AC #3 (token lint green; the regenerators' drift check).
- **REGENERATES**: none.

### RUN `catalog-journey` on three engines

- **IMPLEMENT**: nothing new.
- **PATTERN**: CLAUDE.md § Commands — `node tooling/visual-regression/serve.mjs &` then the driver.
- **GOTCHA** (recorded trap, *Stale serve = wrong tree*): a parallel session's `serve.mjs` can hold port
  4757 for days serving **their** tree. Before trusting a run, `curl -s localhost:4757/system/components.css
  | grep -c ds-list` → must be non-zero. If it is zero, the server is not yours: use `PORT=`/`BASE=`
  overrides or kill by PID/port only (memory: *Portal smoke: port-scoped kill* — never `pkill -f`).
- **VALIDATE**:
  ```bash
  node tooling/visual-regression/serve.mjs &   # note the PID
  node tooling/catalog-journey.mjs all
  ```
  → expected: green on chromium, firefox and webkit; `[1]` reports the count from the artifact as **24**
  (sections, chips and the count line all 24); `[7]` reports `vd tab on exactly 3 (counted from the
  fetched pack)`.
- **REDDENS**: n/a (an existing driver).
- **SATISFIES**: AC #3 (`catalog-journey` green).
- **REGENERATES**: none.

### ADD the divider-ownership check to `tooling/catalog-journey.mjs` — R5

- **IMPLEMENT**: the one thing nothing else in the chain can prove. `build-checks` case 6 reads the
  **stylesheet** and asserts the two rules are written; it cannot tell you they **win** — specificity, file
  order, a later rule or a pack override could all beat them, and the pixel gate never sees the rows branch
  because the playground renders `{name, props}` with no children (`system/catalog.mjs:297`). So drive a
  real three-row list into the real page in three engines and read the **computed** styles back:

```js
  // ---------------------------------------------- [N] the dividers are the CONTAINER's (#303, AC #1)
  console.log("\n[N] a list's dividers are the container's, in computed style (AC #1)");
  const dividers = await page.evaluate(async () => {
    const { renderComposition } = await import("/system/agentic-renderer.mjs");
    const vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
    const stage = document.querySelector("#list .cat-stage");
    const rowsNode = renderComposition(vocab, {
      name: "list", props: { header: "Short this week", empty: "SHOULD NOT RENDER" },
      children: [1, 2, 3].map((n) => ({ name: "list-row", props: { label: `Row ${n}`, value: String(n) } })),
    }, null);
    stage.replaceChildren(rowsNode);
    const inList = [...stage.querySelectorAll(".ds-list-row")];
    // THE CONTROL, in the same document and the same pack: a row OUTSIDE a list must keep its card.
    const loose = renderComposition(vocab, { name: "list-row", props: { label: "Loose", value: "1" } }, null);
    stage.appendChild(loose);
    const cs = (el) => getComputedStyle(el);
    return {
      rows: inList.length,
      firstTop: cs(inList[0]).borderTopWidth,
      secondTop: cs(inList[1]).borderTopWidth,
      thirdTop: cs(inList[2]).borderTopWidth,
      firstRadius: cs(inList[0]).borderTopLeftRadius,
      looseTop: cs(loose).borderTopWidth,
      looseRadius: cs(loose).borderTopLeftRadius,
      emptyRendered: Boolean(rowsNode.querySelector(".ds-list-empty")),
      headerText: rowsNode.querySelector(".ds-list-header")?.textContent ?? null,
    };
  });
  t("three rows rendered inside the list", dividers.rows === 3, JSON.stringify(dividers));
  t("the FIRST row has no top border — the container's edge is the container's",
    dividers.firstTop === "0px", `got ${dividers.firstTop}`);
  t("rows 2 and 3 carry the 1px divider — drawn BETWEEN neighbours, never after the last",
    dividers.secondTop === "1px" && dividers.thirdTop === "1px",
    `got ${dividers.secondTop} / ${dividers.thirdTop}`);
  t("a row inside a list is square — the card corners are the container's",
    dividers.firstRadius === "0px", `got ${dividers.firstRadius}`);
  // THE CONTROL: without it every assertion above is satisfied by deleting list-row's border globally.
  t("a row OUTSIDE a list still has its own border (the control)",
    dividers.looseTop === "1px" && dividers.looseRadius !== "0px",
    `got ${dividers.looseTop} / ${dividers.looseRadius}`);
  t("a list holding rows renders NO empty copy", dividers.emptyRendered === false, JSON.stringify(dividers));
  t("the header renders above the rows", dividers.headerText === "Short this week", `got ${dividers.headerText}`);
```

- **PATTERN**: `tooling/catalog-journey.mjs:252-256` (a dynamic `import()` of a `system/` module inside
  `page.evaluate`, already done for the wc wrapper) and `:268-274` (reading state back off `.cat-stage`).
  The `t(label, cond, detail)` helper is the file's own.
- **IMPORTS**: none new — `renderComposition` is imported inside the browser, not the driver.
- **GOTCHA**: **this file is not in the ticket's "files touched" estimate.** Say so in the PR body, with the
  reason: AC #1 claims "dividers are the container's, never the row's", and before this task nothing in the
  repo can observe that claim — `build-checks` reads the sheet, and the pixel gate only ever screenshots the
  empty branch. A claim with no observation is the shape this repo calls a check that cannot fail.
- **GOTCHA**: the loose-row control must render **in the same document and the same pack** as the in-list
  rows. Rendered in a second page it would prove nothing about specificity.
- **GOTCHA**: run it **after** the deep-link case, not before — `replaceChildren` on `#list .cat-stage`
  destroys the playground's own specimen for that section, and a later case reading it would see your rows.
  Put it last in the driver, or re-render by re-navigating.
- **VALIDATE**: `node tooling/catalog-journey.mjs all` → the seven new lines green on chromium, firefox and
  webkit. Record the three engines separately in the report; a per-engine pass after a throw is "stopped
  here", not coverage (memory: *WebKit lazy iframe in a scroller*).
- **REDDENS**: delete `.ds-list > .ds-list-row { border-width: 0; … }` from `components.css` → `the FIRST
  row has no top border` and `a row inside a list is square` both fail. Then delete
  `border: 1px solid var(--color-border)` from `.ds-list-row {` instead → the **control** fails (`a row
  OUTSIDE a list still has its own border`), which is the mutation that proves the first three assertions
  are not green because the border was removed everywhere. Run both, revert both, record both.
- **SATISFIES**: AC #1 (dividers are the container's — now observed, not only written), AC #3.
- **REGENERATES**: none. `catalog-journey.mjs` is under `tooling/`, which matches no `loc-summary` group
  (the regex is `^system/…` and `^agent-layer/…`) — asserted by Task 12's `--check`, not assumed.

### REGENERATE the `/components` baselines — ×3

- **IMPLEMENT**: `/components` gains a 24th component section at rest, so all three of its baselines move.
  **×3 is the answer to AC #3's "say which"**: `tooling/visual-regression/visual.spec.mjs:147` carries
  `verdant` in `PACKS` (observed), and `tooling/visual-regression/baselines/` holds 33 PNGs = 11 pages ×
  3 packs (observed), including `components-neutral.png`, `components-saulera.png` and
  `components-verdant.png`. #302 merged verdant into `PACKS`.
- **PATTERN**: memory *Visual-regression baseline trap* + *VR gate reads the working tree*.
- **GOTCHA**: `update:docker` screenshots the **dirty** working tree. Run it from a clean detached worktree
  under `/Users` — **not** `/private/tmp`, which Docker does not share.
- **GOTCHA**: `update:docker` will not rewrite a baseline whose only change is sub-perceptual (memory:
  *VR update skips sub-perceptual*). A whole new component section is not sub-perceptual, so this should
  not bite — but if a PNG comes back unwritten, `rm` it and re-run.
- **GOTCHA**: only these three PNGs may move. The new `ds-list` block adds no rule that can reach another
  page: every selector is scoped under `.ds-list`, and `list` appears on no shipped page but `/components`.
  If another baseline moves, stop — something leaked.
- **VALIDATE**:
  ```bash
  cd tooling/visual-regression && npm run update:docker
  git status --short tooling/visual-regression/baselines/
  ```
  → expected: exactly `components-neutral.png`, `components-saulera.png`, `components-verdant.png` modified,
  nothing else.
- **REDDENS**: n/a.
- **SATISFIES**: AC #3 (`/components` baselines ×3).
- **REGENERATES**: this task IS the regeneration.

### CHECK the loc-summary cascade — conditional

- **IMPLEMENT**: `system/components.css` and `system/agentic-renderer.mjs` both match the `runtime` group's
  regex (`/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/`); `system/specs/list.md` matches **none** (subdirectory,
  `.md`). This change adds roughly 85–95 lines to the runtime group, and `linesApprox` is rounded to the
  nearest 100 — so the digit may or may not flip. Check; act only if it does.
- **PATTERN**: memory *loc-summary baseline cascade* + *loc-summary counts tracked only*.
- **GOTCHA**: `gen-loc-summary` reads the **git index** (`git show :<path>`), not the working tree.
  **`git add` your changes first** or the check is a false "no drift" — and that includes edits, not just
  new files.
- **GOTCHA**: if it drifts, three approach baselines cascade with it, and `update:docker` silently keeps a
  stale digit on an EDIT — so `rm tooling/visual-regression/baselines/approach-*.png` before re-running.
  `approach.html` renders the runtime group only, so a grand-total flip alone does not churn them; a
  **runtime** flip does.
- **VALIDATE**:
  ```bash
  git add -A
  node agent-layer/gen-loc-summary.mjs --check
  ```
  → observed on the current tree: `loc summary ✓  3 groups — no drift`, with runtime at
  `79 files / 31900 linesApprox`. If it now reports drift:
  ```bash
  node agent-layer/gen-loc-summary.mjs
  rm tooling/visual-regression/baselines/approach-*.png
  cd tooling/visual-regression && npm run update:docker
  ```
  and note in the report which digit moved and by how much.
- **REDDENS**: n/a.
- **SATISFIES**: AC #3 (the regenerators — the drift check is CI-blocking).
- **REGENERATES**: `system/loc-summary.json` + `approach-{neutral,saulera,verdant}.png`, **conditionally**.

### UPDATE CLAUDE.md's index row — verify, do not assume

- **IMPLEMENT**: check whether the architecture map's `specs/` line needs anything. It currently reads
  `specs/    ComponentSpec .md + DataContract .json — the handoff source of truth` — a directory row with
  no count, so **no edit is expected**. Confirm by reading it; if it carries a number, update it. Do not
  add a row for `list.md`: the map indexes files, and per-spec files are not listed individually.
- **PATTERN**: CLAUDE.md § Ground rules — "Invariants live in the file that owns them … the map above is
  only an index".
- **VALIDATE**: `grep -n "specs/" CLAUDE.md` → read the line, confirm it carries no count.
- **REDDENS**: n/a.
- **SATISFIES**: AC #3 (housekeeping; nothing gates it).
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo — do not hunt for one (CLAUDE.md § Ground
rules, Testing). The gate stack is the test strategy.

### Unit-equivalent: `tooling/build-checks.mjs` (39 pure groups)

- **Group 3 (`composition`)** — everything this ticket adds that can be proven without a browser: the
  projected key by name, the cardinality honoured for `list`, the non-`list-row` refusal by index and name,
  both render branches under the DOM stub, and the divider ownership asserted on the sheet.
- **Group 18 (`docs chain`)** — the empty-case example, via `validateExamples` over the real specs.
- **Group 21 (`catalog`)** — set identity with `CATALOG_COMPONENTS`, `childrenLine`'s `" (many)"` suffix
  over the real entries (already driven; `list` joins the population), the wrapper histogram.
- **Group 39 (`handoff-seam`)** — the regenerated `llms.txt` against a second directory walk.

### Integration-equivalent: `tooling/catalog-journey.mjs all`

Three engines against the real page: the count from the artifact (24), deep links, live re-serialization,
the copy button, the ⌘K race, the wrapper gating, refusal-as-content, the bus readout.

### Pixel: `tooling/visual-regression`

`/components` × 3 packs, and it sees the **empty** branch — the playground renders `{name, props}` with no
children (`system/catalog.mjs:297`). So it proves the frame, the header and that the empty copy is legible
in all three packs. **It cannot reach the rows branch at all**: no committed composition holds a list, so
nothing in CI ever screenshots rows inside one, dividers included. **Task 10b is what covers that branch**
— computed-style assertions in three engines, with a loose row beside them as the control — so the rows
branch is gated functionally even though it is never gated in pixels. Eyeball it once at Level 4 anyway;
a computed `1px` is not the same claim as "this reads as a list".

### Edge Cases

Each of these is a named case in Task 8 or a stated non-case:

| Edge case | Where it is covered |
| --- | --- |
| a list with zero rows | Task 8 case 5 (`emptyNode`) + the `example` in group 18 |
| a list with rows AND an `empty` prop | Task 8 case 5 (`filledNode` must not render it) |
| a list with no `header` | Task 8 case 5 (`headerlessNode`, no element) |
| `header: null` from a JSON round-trip | the `!= null` guard, Task 3's GOTCHA |
| a non-`list-row` child | Task 8 case 4, by index and by name |
| more than one child under a non-`many` entry | already covered, group 3's existing `card` case |
| a `warn`/`critical` row inside a list | the CSS keeps `border-color` and `background`, so the divider above a tone row is that row's accent and a `critical` row fills edge to edge, clipped by the container's radius. **No PIXEL gate reaches this** — the playground renders `{name, props}` with no children (`catalog.mjs:297`), so the screenshots only ever show the EMPTY branch. Task 10b gates the divider geometry functionally in three engines; the tone COLOURS remain a hand check. State the behaviour in the spec's States section and eyeball it at Level 4 |
| a very long row label inside a list | `list-row`'s own ellipsis, unchanged; `min-width: 0` on `.ds-list` keeps the list itself from blowing out a flex row |
| a list nested inside a list | impossible — `list.children` is `["list-row"]` only |
| a list inside a `stack` | Task 4; group 3's `deepPairs` walk renders `stack > list > list-row` automatically once `stack.children` gains `"list"` |

### Proving the checks

Every check Task 8 adds carries a REDDENS mutation and each must be **run**, seen red, reverted, and the
observed message recorded in the report. The positive control for the whole group-3 addition is that
`build-checks` was green on 39 groups before the change (observed) — so a red after it is this change's.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: syntax and contract

```bash
node --check system/agentic-renderer.mjs
node --check system/palette.mjs
node --check tooling/build-checks.mjs
node tooling/token-lint.mjs                    # expected: token lint ✓
```

### Level 2: the pure gate

```bash
node tooling/build-checks.mjs                  # expected: build ✓  all 39 groups pass
```

### Level 3: generators and drift

```bash
node agent-layer/gen-handoff.mjs
node agent-layer/gen-vocabulary.mjs
node agent-layer/gen-pack-bundle.mjs
node agent-layer/gen-pack-index.mjs
node agent-layer/gen-system-graph.mjs
git add -A && node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-param-count.mjs --check   # expected: 121 controls — no drift (unchanged)
node tooling/drift-check.mjs                   # expected: all legs green
```

### Level 4: the running page

```bash
node tooling/visual-regression/serve.mjs &
curl -s localhost:4757/system/components.css | grep -c "ds-list"   # must be > 0 — proves the serve is YOUR tree
node tooling/catalog-journey.mjs all           # expected: green ×3 engines, count 24
```

Then open `http://localhost:4757/components#list` in a real browser and read it: the specimen shows the
empty case (the playground renders `{name, props}` with no children, `system/catalog.mjs:297`), the API
table lists `header` and `empty`, and the `Children: list-row (many)` line is present.

Then **eyeball the rows branch, which no gate reaches.** Drive a three-row list into the playground stage
from the console, one row at `tone: "critical"` and one at `"warn"`, and check four things by eye: the rows
read as one list rather than a pile of cards; the hairlines sit *between* rows and not after the last one;
the critical row's fill runs edge to edge and is clipped by the container's radius; the header sits above
all of it. Record what you saw in the report. Task 10b asserts the first three of those four in computed
style across three engines; this pass is the one that judges whether it *reads* as a list, which no gate can.

### Level 5: the pixel gate

```bash
cd tooling/visual-regression && npm run update:docker
git status --short tooling/visual-regression/baselines/
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| — | — | — | — |

**Empty, deliberately.** No agent run, no token spend, no credential, no owner verdict. Every gate in this
plan is a local command. The only thing needing hardware you might not have is Docker (Level 5) — if it is
unavailable, say so in the report's **Not run** section and the PR cannot close AC #3 until the baselines
land; CI's `visual` job will be red, which is the correct signal.

---

## ACCEPTANCE CRITERIA

Mapped to the ticket's three, split where the ticket's phrasing bundles two claims.

- [ ] **AC1a** — `system/specs/list.md` exists and parses; head carries `class: "ds-list"`,
      `children: ["list-row"]`, `childrenCardinality: "many"`, `states: ["default"]`, `contract: null`.
- [ ] **AC1b** — a `ds-list` block exists in `system/components.css` under the standard header, token-only,
      `token-lint` green.
- [ ] **AC1c** — a `"list"` template exists in `agentic-renderer.mjs` and renders through `renderChild`.
- [ ] **AC1d** — the empty case renders the empty **copy from a prop**; with rows present no
      `.ds-list-empty` element exists at all (Task 8 case 5).
- [ ] **AC1e** — dividers are the container's: `.ds-list > .ds-list-row` zeroes the row's border-width and
      `+ .ds-list-row` puts one back; `list-row`'s own bare rule is unchanged (Task 8 case 6).
- [ ] **AC2a** — a `list` + three `list-row`s validates against the real vocabulary, with the
      cardinality-removed mutation refusing it by count (Task 8 cases 2–3).
- [ ] **AC2b** — a `list` holding a non-`list-row` child is refused by `validateComposition`, **asserted by
      running it**, and the refusal names the index and the name (Task 8 case 4).
- [ ] **AC2c** — the empty case rides the `example` head key and is validated by group 18's
      `validateExamples` (Task 9). *Deviation from the ticket's wording: the three-row half lives in group 3,
      not 18 — see Open Questions D4.*
- [ ] **AC3a** — five regenerators run (`gen-handoff` · `gen-vocabulary` · `gen-pack-bundle` ·
      `gen-pack-index` · `gen-system-graph`); `git diff --stat handoff/` shows only regenerated files;
      `drift-check` green. *The ticket says four; `gen-pack-index` (#419) landed after the ticket was
      written.*
- [ ] **AC3b** — `/components` baselines **×3** (neutral · saulera · verdant). #302 merged verdant into
      `PACKS`; `visual.spec.mjs:147` and the 33 committed PNGs are the evidence.
- [ ] **AC3c** — `catalog-journey all` green on three engines, count 24.
- [ ] **AC3d** — `node tooling/token-lint.mjs` green.
- [ ] **AC3e** — `node tooling/build-checks.mjs` green, all 39 groups.
- [ ] **AC3f** (R5) — the divider ownership is **observed**, not only written: `catalog-journey` asserts in
      computed style, on three engines, that the first in-list row has `border-top-width: 0px`, rows 2–3
      have `1px`, an in-list row's radius is `0px`, and a loose row in the same document still has its own
      border and radius. Both reddening mutations run and recorded.
- [ ] **AC4** (not in the ticket, required by the tree) — `CATALOG_COMPONENTS` gains `list`; the wrapper
      histogram moves 3/20 → 3/21 with its tripwire paragraph extended; the three stale prose copies
      (`build-checks.mjs:94`, `:4919`, `gates.md:112`) corrected.
- [ ] **AC5** (the ticket's own constraint) — `list-row`'s spec, template and CSS block are unchanged.
      Anchor it on REMOVALS: the new `.ds-list > .ds-list-row` rules legitimately ADD lines naming
      `ds-list-row` (inside the `ds-list` block), so a plain grep over the whole diff is non-zero by design.
      ```bash
      git diff --stat system/specs/list-row.md                                           # expected: empty
      git diff -U0 system/components.css | grep '^-' | grep -c 'ds-list-row\|ds-row-'     # expected: 0
      git diff -U0 system/agentic-renderer.mjs | grep '^-' | grep -c 'list-row'           # expected: 0
      ```
- [ ] **AC6** — every REDDENS mutation in Task 8 was run, seen red, reverted, and its observed message
      recorded in the report.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] `build-checks` 39/39, `token-lint`, `drift-check`, `catalog-journey all` — each named with its result
- [ ] Every row of KEY RISKS closed, or explicitly carried with its reason (R9/R10 are owner calls)
- [ ] R7's precondition run: no other PR touching `system/specs/`, `components.css` or `handoff/` was open
- [ ] Every REDDENS mutation run and reverted, messages recorded
- [ ] `/components` baselines ×3 regenerated from a clean detached worktree
- [ ] `gen-loc-summary --check` run **after `git add`**; cascade handled or explicitly not needed
- [ ] `git diff --stat` reviewed: no file outside the plan's list moved
- [ ] PR body carries `Closes #303`, states the five-regenerator correction, the ×3 baseline answer, the
      group-18 → group-3 relocation, the `stack.children` widening, the `catalog-journey.mjs` addition and
      why, the deferred ARIA decision (D2), and that no standing rule but the at-rest `/components` row
      applies
- [ ] `.claude/plans/`, `.claude/reports/` and `.claude/code-reviews/pr-<N>-review.md` all in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**D1 — `empty` is required, not optional.** *Assumption, with reasoning.* A list's empty state is a design
decision; with #302's base-plus-overrides an empty-list state is an override that removes the children, so
if the copy is not already on the container the region renders blank. Required also means the
`/components` playground always shows the empty case, which is what makes AC #1's "the empty case renders
the empty copy" visible to a reader rather than only to a gate. **If wrong:** make it optional and render
nothing when both the rows and the copy are absent — one enum-free edit to the head and one `!= null`
guard in the template, plus a regeneration.

**D2 — the container claims no ARIA role.** *Assumption, flagged for the owner.* `role="list"` needs
`role="listitem"` on each row; that is `list-row`'s template, which this ticket explicitly may not change,
and a `role="list"` with no `listitem` children reports an empty list. So the container adds visual
grouping and leaves the semantics the rows already own — which is `list-row.md`'s own stated position, now
partly obsolete. **This is the one thing in the plan a reasonable reviewer might call under-built.** If the
owner wants list semantics, it is a `list-row` spec + template change and belongs in its own ticket
(`list-row` gains a `role="listitem"` under an owning list), not smuggled in here.

**D3 — `stack.children` gains `"list"`.** *Assumption.* The ticket's "files touched" says "1 spec", which
reads as the new one. But a `list` no container can hold is a component #304 cannot place and #302's spine
cannot compose, and `stack.md`'s own prose grants the licence ("Widening it is one line here plus a
regeneration, whenever a flow actually needs a part it cannot hold"). It is also what creates the
`stack > list > list-row` pair in group 3's container walk. **State it in the PR body.** If the owner says
no, drop Task 4 and add one explicit render case for `list` alone — Task 8 case 5 already is that case, so
nothing else in the plan depends on it.

**D4 — AC #2's group-18 half is relocated to group 3.** *Stated deviation, not a question.*
`validateExamples` feeds an example as `{ name, props: head.example }` with no `children` array
(`agent-layer/gen-vocabulary.mjs:41`), so a three-row example cannot exist there without growing the head
schema — a parser refusal and a `kb-format.md` entry of its own. #298 and #301 both made the same call, and
the ticket's own hand-off comment names it as available. Group 18 still proves the **empty**-case example,
because a childless render is precisely what it drives.

**D5 — the divider above a tone row is that row's accent.** *Assumption.* `border-top-width: 1px` takes its
colour from `.ds-list-row.is-warn { border-color: var(--color-accent) }`. This reads as correct — the
divider belongs to the row below it and picks up its emphasis — and it is stated in the spec's States
section so a reader does not mistake it for a bug. If it looks wrong in the `/components` baselines, pin
the colour explicitly: `.ds-list > .ds-list-row + .ds-list-row { border-top-color: var(--color-border) }`.

**Q1 — is `header` the right name?** `list-row` uses `label`, `empty-state` uses `title`, `card` uses
`title`. `header` is chosen because the spec's own name for the thing is "an optional section header"
(the ticket's words, G31's words). `title` would collide conceptually with `card`/`empty-state`, which
title a whole region rather than a section within one. Low stakes; rename before the regeneration if the
owner prefers `title`.

## NOTES (open canvas)

### Pre-flight — what was run and what it changed

Run against `feat/pack-routing-index-419` at `ceea07a` (`origin/main` at `8b318a0`, same content).

| # | Ran | Observed | Effect on the plan |
|---|---|---|---|
| 1 | `node tooling/build-checks.mjs` | `build ✓  all 39 groups pass` | the positive control for every REDDENS in Task 8 |
| 2 | `node -e "…vocabulary.json…"` | `components: 23`, `composition.version: 2`, `stack.children` = 10 names, `list-row.children` = `[]` | every count in the plan (24, 11 names) is derived from this, not recalled |
| 3 | `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` | Task 12's baseline; runtime = 79 files / 31900 |
| 4 | `node agent-layer/gen-param-count.mjs --check` | `param count ✓  121 controls — no drift` | let the plan state "no manifest edit" as observed, not assumed |
| 5 | the synthetic `list` grammar drive (Task 8's GOTCHA command) | `OK three rows accepted` / `composition[0].children[1]: "card" is not an allowed child of list (allowed: list-row)` | AC #2's assertion regex is the **observed** string, character for character |
| 6 | `node -e "…parseComponentSpec('system/specs/stack.md')…"` | `stack cardinality = many` | confirms the parser path `list.md` will take |
| 7 | `ls tooling/visual-regression/baselines/` | 33 PNGs, 11 page stems × 3 packs, `components-verdant.png` present | **AC #3's "×2 or ×3" is answered: ×3.** #302 merged verdant |
| 8 | `grep -n PACKS tooling/visual-regression/visual.spec.mjs` | `:147` — `{ neutral, saulera, verdant }` | the second half of the same answer |
| 9 | `ls handoff/verdant/` | no per-spec files | no `gen-pack-index` routing rule needed; group 39 stays total |
| 10 | `ls -d tooling/{style-dictionary,visual-regression}/node_modules` | both present | `gen-handoff` will not fail on a missing SD install |
| 11 | `node -e "console.log(['list.md','list-row.md','stack.md'].sort())"` | `[ 'list-row.md', 'list.md', 'stack.md' ]` | the child sorts BEFORE the parent — the safe direction, and `gen-vocabulary.mjs:29-35` validates after the map is built anyway. Recorded in KEY RISKS as a non-risk so nobody spends a pass on it |
| 12 | `grep -n "const deep" tooling/build-checks.mjs` | five declarations, all group-local, earliest `:2945` | `deep` is **not** in scope at `:976`; Task 8 case 1 compares with `JSON.stringify` on both sides |
| 13 | `grep -n "cat-stage" system/catalog.mjs tooling/catalog-journey.mjs` | the journey already drives `#<name> .cat-stage` and already `import()`s a `system/` module inside `page.evaluate` (`:252-253`) | Task 10b uses the seam that exists rather than inventing one |

**Landed-claim checks against the tree (P8 — the 52% pattern):**

- The ticket's hand-off comment names **two open seams**. Both are **already closed**, by #301:
  `system/handoff-viewer.mjs:100-104` spreads `childrenCardinality` conditionally, and
  `system/catalog.mjs:92-95` (`childrenLine`) appends `" (many)"`. **Do not re-fix either.** The plan
  therefore has no task for them, and `childrenLine` is already driven over the real entries by group 21.
- The comment says "no gate covers the projected key's NAME". **Now false** — `tooling/build-checks.mjs:791`
  asserts it on the committed artifact for `stack`, and `:795` asserts the negative half on `text`. Task 8
  case 1 is the same assertion for `list`, not a new mechanism.
- The comment's refusal-string warning (`.children:` for the count, `children[N]` for a bad child) is
  **confirmed live** at `system/agentic-renderer.mjs:91,97-99`, and pre-flight #5 observed the exact text.
- The ticket says "the four regenerators". **Stale** — `gen-pack-index.mjs` (#419) landed at `ceea07a`,
  three commits before this branch's HEAD, and both `build.mjs:45` and `drift-check.mjs:22` call it. Five.
- The `#298` comment (and `pr-427-review.md:63`) call this ticket **#305**. It is **#303**; PR #427
  corrected the references. No action, but do not be surprised by `#305` in a comment.

**Traps carried in from `.claude/references/` and memory** (the 29% pattern), each written into the task
that touches the file:

| Trap | Task |
|---|---|
| *Visual-regression baseline trap* — an at-rest change invalidates the baseline; local gates cannot see it | 11 |
| *VR gate reads the working tree* — screenshot from a clean detached worktree under `/Users`, not `/private/tmp` | 11 |
| *VR update skips sub-perceptual* — `rm` the PNG to force a rewrite | 11 |
| *loc-summary baseline cascade* + *counts tracked only* — `git add` before `--check`; `rm` approach PNGs even for an edit | 12 |
| *Gate prose has three copies* — the histogram has four, two already stale | 7 |
| *The check that cannot fail* — mutate the source and run the function; don't grep it | 8 (every REDDENS) |
| *`hidden` defeated by author display* (#138) — absence must be an absent element | 3, 8 case 5 |
| *overflow-clip breaks sticky* — `overflow: hidden` on `.ds-list` | 2 |
| *Stale serve = wrong tree* + *Portal smoke: port-scoped kill* | 10 |
| *drift-check mid-merge false positive* | 6 |
| *Palette memoizes — chrome needs static tags* — why `CATALOG_COMPONENTS` is a hand-kept second copy | 5 |
| *PRs don't auto-close tickets* — `Closes #303` in the **body** | completion checklist |

**Internal reconciliation (the pre-flight's step 4):** the component count is derived once (23 observed →
24) and reused in Tasks 5, 6, 10 and AC3c. The histogram is derived once (3/20 observed → 3/21) and reused
in Task 7 and AC4. The token list is derived once (nine, from the block in Task 2) and reused in Task 1's
head and Task 2's VALIDATE. Task 3 says MIRROR `stack` and also says "not `card`'s `[]`" — `stack`
(`:451-470`) obeys that rule and its own comment says so, checked.

### What the risk pass changed

The first draft of this plan had four tasks that existed only because the tree said so and the ticket did
not (R1–R4), and one gap it named honestly and left open: **nothing anywhere could observe AC #1's central
claim.** `build-checks` case 6 reads the stylesheet and proves the two rules are written; it cannot prove
they beat `list-row`'s own, because specificity, file order and a pack override are all invisible to a
regex over source text. The pixel gate never sees the rows branch at all — the `/components` playground
renders `{name, props}` with no children (`system/catalog.mjs:297`), so every committed screenshot of
`list` shows the empty case forever.

That is the shape this repo calls a check that cannot fail, arrived at from the other direction: not a
check that silently skips its subject, but a claim with no check at all. Task 10b closes it in the one
place that can — the journey driver, which runs the real page in three engines — by reading
`getComputedStyle` off three in-list rows and one loose row rendered in the same document. The loose row is
the whole point of the case: without it, deleting `list-row`'s border globally makes every other assertion
green.

Cost: one case in `tooling/catalog-journey.mjs`, a file the ticket did not list. Stated in the PR body.

### Why the empty copy is a prop and not an `empty-state` child

Worth writing into the spec, because the alternative is the first thing a reviewer will ask. `empty-state`
is a **standalone framed region**: its own dashed hairline, its own `--spacing-xl` vertical padding, its own
optional `ghost-button` child. Putting one inside a `list` puts a dashed box inside a solid box — two frames
for one absence. It would also mean `list.children` allows `empty-state`, which means a composition can put
an `empty-state` in a list **that has rows**, which is a hidden child by another name. A prop cannot be
composed wrongly.

### The sequencing risk, and why it is small

The `/components` collision rule (one primitive or admission PR open at a time) is this ticket's only
scheduling constraint. #302 has merged, so nothing else is regenerating `/components` right now. The
constraint that matters more is the one the ticket states: **this may run alongside #302** (different
baselines) but not alongside another primitive. Before opening the PR, check `gh pr list` for anything
touching `system/specs/` or `handoff/`.

The one-way-door risk is nil: a spec, a CSS block, a template and a widened `children` list are all
additive and reversible. The only irreversible-ish artefact is the baselines, and those regenerate.

### What this plan deliberately does not do

It does not grow the head schema to let an `example` carry children, even though that would let AC #2 sit
entirely in group 18 as written. That is a grammar change with its own parser refusal, its own
`kb-format.md` entry and its own effect on every spec — a ticket, not a line. Group 3 is where #298 and
#301 both put their many-children cases and it is where these go.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

**2026-09-22 — A1 (plan error).** Task 12's VALIDATE and Level 3 both say `git add -A`. The shared
worktree carries eight untracked paths and one modified file belonging to other sessions
(`__mock_discoveries.md`, two `.txt` transcripts, three other tickets' plan files,
`.claude/skills/piv-next/`, `piv-fix-review-findings/SKILL.md`). `gen-loc-summary` reads
`git show :<path>`, so only THIS change's paths need staging. Corrected to an explicit-path
`git add` list.

**2026-09-22 — A3 (plan error).** Task 7 says `build-checks.mjs:4919` carries a stale current-state
`3/18`. It does not: `:4920`, `:4923` and `:4925` are a HISTORICAL chain (`3/7 → 3/17 → 3/18 →
3/20`) that must be EXTENDED, not rewritten. The stale current-state copies are four, not three, and
the plan names only three: `build-checks.mjs:94` (`3/18`), `:4941` (the live literal, `3/20`),
`gates.md:112` (`3/17`) — plus **`gates.md:33`**, `the 3/17 wrapper histogram` in the group-21 line,
which the plan missed. All four corrected to `3/21`; the history at `:4920-4925` extended with one
sentence in its established form.

**2026-09-22 — A4 (hardening, not a plan error).** Task 10b's `page.evaluate` dereferences
`#list .cat-stage` without a null guard; a null stage throws inside the browser and aborts that
engine's whole leg, which reads as "stopped here" rather than as coverage (memory: *WebKit lazy
iframe in a scroller*). The implemented case returns `{ error }` on a null stage and asserts on it
through `t()`.
