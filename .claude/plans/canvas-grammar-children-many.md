# Feature: the composition grammar grows once — `childrenCardinality: "many"`

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> Supersedes the pre-ticket sketch of the same name (2026-08-28, commit-history only). Its four calls
> survive here verbatim; its one wrong claim — "no new tracked file, so no `loc-summary` churn" — is
> corrected in §Cascade: `gen-loc-summary` counts LINES, and the repo has **7 lines** of total headroom.

## Feature Description

`validateComposition` (`system/agentic-renderer.mjs:79-103`) allows **at most one child** per node. That
rule is the whole reason the epic's five new primitives are blocked: `stack` is a layout box of N parts
and `list` is a container of N `list-row`s, and neither can exist under a grammar that refuses a second
child. This ticket grows the grammar **once**: a container entry declares a cardinality in its spec head,
the validator honours it for the entries that declare it, and every other entry keeps the single-child
rule unchanged.

One optional head key, `childrenCardinality: "many"`. Absent means at most one. It rides the existing
spec → parser → vocabulary → validator chain with no new file, no new module and no renderer template.
The vocabulary's grammar block gains a `version` mark so a reader of an older pack knows which grammar
their composition validated under.

No spec declares `many` in this PR. `stack` and `list` are #301 and #305; this is the grammar they land on.

## User Story

As **the compose agent (and the operator driving it)**
I want to **compose a container that holds several parts**
So that **a screen can be built from a layout box instead of one framed thing at a time** — which is what
the canvas epic's ten primitives need, and what today's grammar structurally forbids.

## Problem Statement

`validateComposition` hard-codes a single-child grammar in two places: it refuses `kids.length > 1`
outright, and it only ever inspects `kids[0]`. The vocabulary's `childrenRule` states that rule in prose
and the compose agent reads that file directly, so the prose is part of the contract, not documentation
about it. Nothing in the spec head can say "this one takes many", so a `stack` spec would parse, project,
and then be refused by the validator the first time an agent used it. The studio architecture predicted
exactly this: a structured candidate "would force a versioned vocabulary-schema call".

## Solution Statement

Add **one optional spec-head key** and honour it in one validator:

- `childrenCardinality: "many"` beside the existing `children` allowed-names list. Absent ≡ at most one,
  so all 20 committed specs are untouched and no entry gains a key.
- `parseComponentSpec` refuses a bad value and refuses `"many"` on an entry that lists no allowed
  children — the min/max/step precedent (`agent-layer/lib.mjs:87-98`), where a rule that cannot fire is a
  parse error rather than a silent no-op.
- `gen-vocabulary` projects it **conditionally** (the `aiPatterns`/`example` precedent), rewords
  `childrenRule` to state both cardinalities, and adds `composition.version: 2`.
- `validateComposition` loops the children array, checks the cardinality once, and names the offending
  index in every refusal (`composition[2].children[1]: …`).
- Two gates: the grammar cases in **group 3** (where `validateComposition` is exercised) and the parser
  refusals in **group 18C** (the tmpdir spec-fixture idiom that exists for exactly this). See D1 — the
  ticket's AC #1 names group 18, and the reason that is not implementable is recorded there, not skipped.

## Out of Scope / Non-Goals

- **Not included:** `stack`, `text`, `list`, `icon`, `choice` — each goes through the full chain in its own
  ticket (#301, #303, #305, #309). **No spec declares `many` in this PR.**
- **Not included:** the `id` node key / `data-part` (rides with #302, where it is first needed).
- **Not included:** structured props, a general tree grammar, grid work.
- **Not changing:** the two `children[0]` templates (`agentic-renderer.mjs:389` card, `:401` empty-state).
  Every template already receives `node.children ?? []` (`:562`), so a future `many` template renders the
  array with no dispatcher change.
- **Not changing:** `system/handoff-viewer.mjs:81`'s head pick and `system/catalog.mjs:430`'s `Children:`
  line. Both are real forward traps and both are **handed to #301**, durably, by task 12 — see D2.
- **Not changing:** the number of build-checks groups. `checkGroupCount` pins 34 in four files
  (`tooling/drift-check.mjs:169-192`); this ticket adds cases to existing groups, never a 35th.

## Feature Metadata

**Feature Type**: Enhancement (a grammar extension)
**Estimated Complexity**: Low–Medium — small diff, tight cascade arithmetic, three prose copies to keep true
**Primary Systems Affected**: `system/agentic-renderer.mjs` · `agent-layer/lib.mjs` · `agent-layer/gen-vocabulary.mjs` · `tooling/build-checks.mjs` · `.claude/references/kb-format.md` · `.claude/references/gates.md` · regenerated `handoff/`
**Dependencies**: none (zero-dep Node ESM throughout)

## Related Work

**Implements**: [#298](https://github.com/linardsb/ux-factory/issues/298) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.architecture.md` § Recommended approach (line 49) and § Other eng-lead calls (line 264)

**Back-references**:

- `docs/epics/canvas-design-import.architecture.md:49-53` — the epic's own statement of this call; inherited, not re-decided.
- `.claude/plans/catalog-ten-components-full-chain-220.md` — the last time the spec→vocabulary→catalog chain grew; its regeneration cascade is the one this plan follows.
- `.claude/plans/component-catalog-appica-docs-215.md` — #211/#215 added `example` as an optional head key: the conditional-spread projection precedent this plan copies twice.

**Forward-references**:

- #301 (`stack` + `text`) — the first consumer. It declares `children: many` on `stack` and inherits the two traps in NOTES §Handed to #301.
- #305 (`list`) — the second consumer.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/agentic-renderer.mjs` (lines 1-105) — Why: the module header IS the specification (CLAUDE.md §Ground rules); the children block at **79-103** is the whole change. Lines 389 and 401 are the two `children[0]` templates you must NOT touch; line 562 is the dispatcher that already passes the array.
- `agent-layer/lib.mjs` (lines 63-160, esp. **87-105**) — Why: `parseComponentSpec`. Line 105 is the existing `children` array check; the min/max/step block at 87-98 is the refusal pattern to mirror, and its comment states the rule ("a control that cannot exist is a parse error rather than a silent no-op").
- `agent-layer/gen-vocabulary.mjs` (whole file, 116 lines) — Why: line **78** is the `children` projection, lines **88-94** the `composition` grammar block, line **91** the `childrenRule` prose. The long comment at 63-72 explains why `example` is deliberately NOT projected — read it before deciding what else to project.
- `tooling/build-checks.mjs` lines **558-619** (group 3) — Why: your grammar cases go here. It already imports `validateComposition` (:206) and holds `VOCAB`.
- `tooling/build-checks.mjs` lines **3826-3908** (group 18C) — Why: the tmpdir spec-fixture harness (`write()`, `BASE`, `SECTIONS`, the positive control, the `refusals` array). `parserRefusals`/`parserRefusalNames` are DERIVED from that array, so adding entries updates the ✓ line automatically — do not retype a count.
- `tooling/build-checks.mjs` lines 20-40 — Why: the header's one-line-per-group index; line **28-29** is group 3's entry and is one of the prose copies.
- `.claude/references/kb-format.md` (§ComponentSpec + DataContract) — Why: the head-schema-v1 key list you are extending, and the **sync rule** that makes a new optional key safe (`portal/lib/kb.mjs` needs no change).
- `.claude/references/gates.md` lines 5, 13, 29 — Why: line 13 is the groups-1–7 sentence you edit; line 5 lists which groups carry a boundary sentence; line 29 is group 18's paragraph (it does NOT enumerate 18C's parser refusals, so it needs no edit — verified this session).
- `system/handoff-viewer.mjs` lines 70-92, 120-130, 230-243 — Why: read only. Line 81's explicit head PICK silently drops any new head key; line 125 passes `vocab.composition` whole; line 239 renders a FIXED key list `["shape","childrenRule","chipRule"]`, which is why `composition.version` is inert at view time.
- `system/catalog.mjs` lines 428-432 — Why: read only. `Children: a · b · c` is per-entry `entry.children`; the catalog never renders `composition.childrenRule`. This is the evidence behind AC #3's "no visual change".
- `portal/record-composition.mjs` lines 165-226 — Why: the compose agent is pointed at the vocabulary FILE (`refs.vocab`), so the reworded `childrenRule` reaches it with no prompt edit. Confirms the ticket's claim.

### New Files to Create

**None.** No new tracked file under `system/`, `agent-layer/` or `tooling/`. (Standing rule honoured; if that
changes, the plan is wrong and the report says so.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

No external documentation. Every input is in-repo:

- `docs/epics/canvas-design-import.architecture.md` lines **49-53** (the call), **264** (which primitives declare it), **282** (where this sits in the sequence) — Why: the epic's decisions are inherited, not reopened.
- `gh issue view 298` — Why: the ACs this plan must satisfy, verbatim.
- `gh issue view 301` — Why: the first consumer. It says `stack` "declares `children: many` (from #298)" — read it so the key you name is the key #301 expects.

### Patterns to Follow

**An optional head key is added, never a reshape** (`.claude/references/kb-format.md`, sync rule):

> Adding an *optional* head key (like `aiPatterns`, or #211's `example`) does not change the shape — the
> fence still parses as one JSON object and the prose sections are untouched — so `parseFencedJson`/`section`
> stay compatible and no portal-side change is needed.

**Conditional projection** (`system/handoff-viewer.mjs:86-92`, the precedent, quoted verbatim):

```js
      // aiPatterns is optional (#41) — include it in the head projection only when the spec
      // actually carries it, so a non-AI component's "Source (spec head)" JSON stays a faithful
      // picture of its real head (no injected `null` key).
      ...(c.aiPatterns ? { aiPatterns: c.aiPatterns } : {}),
```

**A rule that cannot fire is a parse error** (`agent-layer/lib.mjs:88-90`, the precedent):

```js
      if (prop.type !== "number")
        throw new Error(`${specPath}: prop "${name}" declares "${k}" but its type is "${prop.type}" — min/max/step are numeric-control bounds`);
```

**Refusal voice** (`system/agentic-renderer.mjs` header): "name the offending path, enumerate what was
allowed." Every refusal string in this change names `${path}.children[<i>]`.

**A gate is proven by a MUTATION, never by a grep** (`tooling/build-checks.mjs:3702-3707` and the
`check-that-cannot-fail` lesson): each new case is paired with the input that must make it fire.

---

## IMPLEMENTATION PLAN

### Phase 1: The format and the parser

The head key is defined and refused at the boundary before anything reads it.

**Tasks:** kb-format.md gains the key · `parseComponentSpec` validates it.

### Phase 2: The grammar

**Depends on:** Phase 1 (the key must parse before the validator can honour it).

`validateComposition` honours the cardinality; `gen-vocabulary` projects it, rewords the rule prose and
stamps the grammar version.

### Phase 3: The gates

**Depends on:** Phase 2 (the gates run the changed functions).

Group 3 gains the grammar cases with their mutation; group 18C gains the two parser refusals; gates.md's
groups-1–7 sentence is made true again.

### Phase 4: Regeneration and the cascade

**Depends on:** Phase 2 (the artifacts are generated from the changed generator).
**Independent of:** Phase 3 — but run them in this order anyway, because `build-checks` group 3 reads the
regenerated `vocabulary.json` and a stale one makes a green run mean less than it looks like.

Four regenerators · the `handoff/` diff read · **stage, then** `loc-summary` · the VR decision made by
arithmetic, not by a green pixel run.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 0. BRANCH off a clean `main`

- **IMPLEMENT**:
  ```
  git stash push -- agent-layer/gen-decisions.mjs     # unrelated, from #292 — must not ride along
  git fetch origin
  git switch -c feature/canvas-grammar-children-many-298 origin/main
  git branch --show-current                            # confirm the switch actually happened
  ```
- **GOTCHA**: this session opened on `feature/discovery-pre-grill-audit-292` with `agent-layer/gen-decisions.mjs` MODIFIED and uncommitted (observed: 1 added line, and no commit on that branch touches the file, so `git switch` would carry it across rather than abort). That file is in the **`generators` loc group**, so leaving it in the tree poisons the line arithmetic in task 9. Stash it by explicit path, and stage by explicit path everywhere below ([[shared-worktree-parallel-sessions]]).
- **VALIDATE**: `git status --short -- agent-layer system tooling handoff` → empty before you start. (Scoped deliberately: this plan's own two files under `.claude/plans/` are expected to be dirty — they are the PR's first artifacts.)
- **SATISFIES**: hygiene
- **REGENERATES**: none

### 1. UPDATE `.claude/references/kb-format.md`

- **IMPLEMENT**: in the head-schema-v1 bullet list (§ComponentSpec + DataContract), directly under the existing `children` bullet, add:

  ```markdown
  - `childrenCardinality` (optional) — `"many"`, and only that value. Absent means **at most one child**, which is the grammar every committed spec is written under; `"many"` means any number, and is what a container primitive (`stack`, `list`) declares. It does not widen `children`: the allowed-names list still decides WHICH components may appear, and this key only decides HOW MANY. Refused at parse time on any other value, and refused on a spec whose `children` list is empty — a cardinality on a leaf is a rule that cannot fire, so it is a parse error rather than a silent no-op (the `min`/`max`/`step` precedent). Honoured by `validateComposition` (`system/agentic-renderer.mjs`), projected into `vocabulary.json` only when present, and versioned there: `composition.version` is `2` from this key onward.
  ```

- **PATTERN**: the `example` bullet immediately below it — same voice, same "two validations, deliberately split" structure.
- **GOTCHA**: this file is the format spec BOTH parsers follow. It is not in any `loc-summary` group (the regexes match `system/*.{css,mjs,js}`, root/proto `*.html`, `agent-layer/*.mjs` only), so prose here is free — **put the long explanation here rather than in `agentic-renderer.mjs`**, where lines are budgeted (task 9).
- **VALIDATE**: `grep -n "childrenCardinality" .claude/references/kb-format.md` → one hit.
- **SATISFIES**: ticket scope line 1 ("shape decided in the plan against `.claude/references/kb-format.md`, which moves in the same PR")
- **REGENERATES**: none

### 2. UPDATE `agent-layer/lib.mjs` — `parseComponentSpec` refuses a bad cardinality

- **IMPLEMENT**: immediately after line 105 (`if (!Array.isArray(head.children)) …`), insert:

  ```js
  // childrenCardinality (optional): how MANY children an entry takes, never which (epic #295 ticket
  // #298). Absent ≡ at most one, the grammar every spec before this one is written under, so "one"
  // has exactly one spelling — a second spelling is a second answer waiting to disagree with the
  // first. The empty-children case is the min/max/step rule applied one step further: a cardinality
  // on a leaf is a rule that can never fire, so it is a parse error rather than a silent no-op.
  if (head.childrenCardinality !== undefined) {
    if (head.childrenCardinality !== "many")
      throw new Error(`${specPath}: head "childrenCardinality" ("${head.childrenCardinality}") must be "many" — absent means at most one child`);
    if (!head.children.length)
      throw new Error(`${specPath}: head "childrenCardinality" is "many" but "children" lists no allowed names — a cardinality on a leaf is a rule that cannot fire`);
  }
  ```

- **PATTERN**: `agent-layer/lib.mjs:87-98` — the min/max/step block: guard on `!== undefined`, throw naming `${specPath}` and the offending value, state the reason in the message.
- **IMPORTS**: none.
- **GOTCHA**: the order matters — this must come AFTER line 105's `Array.isArray(head.children)` check, or `head.children.length` reads off a non-array.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{const r=m.parseComponentSpec('system/specs/card.md');console.log('card parses, childrenCardinality =', r.head.childrenCardinality)})"` → prints `undefined` (expected: every committed spec stays silent on the key).
- **REDDENS**: write a tmp spec whose head carries `"childrenCardinality": "lots"` and parse it → must throw `head "childrenCardinality" ("lots") must be "many"`. Delete the two `if` bodies and the same input parses clean — that is the mutation.
- **SATISFIES**: AC #1 (the parser half), ticket scope line 1
- **REGENERATES**: none directly; contributes to the `loc-summary` total (task 9)

### 3. UPDATE `system/agentic-renderer.mjs` — `validateComposition` honours the cardinality

- **IMPLEMENT**: replace the whole children block (lines **79-103**, from `// Children — at most one…` through the closing `}` of `if (kids !== undefined)`) with:

  ```js
  // Children — allowed names only, and at most one unless the entry declares `many`
  // (epic #295 ticket #298; absent ≡ one, the grammar every spec before it was written under).
  // The loop is what `many` needs: every refusal names the offending INDEX, so a container of six
  // parts points at the one that is wrong rather than at the array.
  const kids = node.children;
  if (kids !== undefined) {
    if (!Array.isArray(kids)) throw new Error(`${path}.children: must be an array when present`);
    if (kids.length > 0) {
      if (entry.children.length === 0) {
        throw new Error(`${path}.children: ${node.name} allows no children`);
      }
      if (entry.childrenCardinality !== "many" && kids.length > 1) {
        throw new Error(`${path}.children[1]: ${node.name} allows at most one child (got ${kids.length})`);
      }
      kids.forEach((child, i) => {
        const childPath = `${path}.children[${i}]`;
        if (!child || typeof child !== "object" || typeof child.name !== "string") {
          throw new Error(`${childPath}: expected a node { name, props, children? }`);
        }
        if (!entry.children.includes(child.name)) {
          throw new Error(`${childPath}: "${child.name}" is not an allowed child of ${node.name} (allowed: ${entry.children.join(" | ")})`);
        }
        validateComposition(vocab, child, childPath); // validates the child's own props/enums
        // One signal per card: an explicit status-chip may only relabel the derived state,
        // never change it. A child whose value differs from the parent's status means two
        // competing states — the composition is wrong (status-chip's Usage prose). Per child,
        // so a `many` container holding two chips is caught on both.
        if (child.name === "status-chip" && "status" in props && child.props?.value !== props.status) {
          throw new Error(`${childPath}.props.value: "${child.props?.value}" competes with the parent ${node.name}'s status "${props.status}" — one signal per card; an explicit status-chip may only relabel the derived state, not change it`);
        }
      });
    }
  }
  ```

- **IMPLEMENT (header)**: in the module header, line 12, change `disallowed/too-many children` to
  `disallowed children, too many for the entry's cardinality` — the header is the specification and must stay true.
- **PATTERN**: the block it replaces. Every refusal string is preserved character-for-character except the
  too-many one, which gains its index.
- **GOTCHA 1 — the two `children[0]` templates stay**: `card` (:389) and `empty-state` (:401) each render
  `kids[0]` and pass `[]` down. That is correct today and must not be "generalised": all five names either
  entry allows (`metric-tile`, `list-row`, `sequence-step`, `status-chip`, `ghost-button`) declare
  `children: []`, so no grandchild is reachable (observed against the committed vocabulary).
- **GOTCHA 2 — line budget**: `system/` has **18 lines** of `loc-summary` headroom (task 9). The block above
  is net **-2 lines** against the one it replaces (observed in the scratch patch). Keep it that way — the long
  explanation belongs in `kb-format.md` (task 1), which is uncounted.
- **GOTCHA 3 — no gate pins the old refusal strings.** Observed: the only in-repo occurrences of "allows at
  most one child" outside this file are `.claude/plans/*`, `.claude/reports/*` and the epic doc. Changing
  `${path}.children:` to `${path}.children[1]:` is free.
- **GOTCHA 4 — no version check here.** `validateComposition` takes the vocabulary as an argument and stays
  pure; a `composition.version` assertion would be a refusal with no caller. Deliberate; see NOTES.
- **VALIDATE**: run the seven-case probe (the exact script is in NOTES §Pre-flight, and it ran green this session against a patched copy):
  ```
  node -e "import('./system/agentic-renderer.mjs').then(async m=>{const fs=await import('node:fs');const V=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const SYN={components:{...V.components,'syn-stack':{class:'x',status:'spec',props:{},states:['default'],children:['metric-tile'],childrenCardinality:'many',usage:'',contract:null}}};m.validateComposition(SYN,[{name:'syn-stack',props:{},children:[1,2,3].map(n=>({name:'metric-tile',props:{label:'l'+n,value:String(n)}}))}]);console.log('many: 3 children accepted');try{m.validateComposition(V,[{name:'card',props:{title:'T'},children:[{name:'metric-tile',props:{label:'a',value:'1'}},{name:'metric-tile',props:{label:'b',value:'2'}}]}]);console.log('FAIL — single-child entry took two')}catch(e){console.log('one:',e.message)}})"
  ```
  Expected output (observed against the patched copy this session):
  ```
  many: 3 children accepted
  one: composition[0].children[1]: card allows at most one child (got 2)
  ```
- **REDDENS**: delete `entry.childrenCardinality !== "many" &&` from the guard → the `card` case above stops
  refusing and prints `FAIL — single-child entry took two`. Change `many` to `Many` in the guard → the
  `syn-stack` case throws instead of accepting.
- **VALIDATE (the budget, checked HERE and not left to task 9)**: `git add -- system/agentic-renderer.mjs`
  then re-run task 9's runtime one-liner. It must still print `rounded 30600`. Checking it now is fail-fast:
  if the block came out long, you fix it while it is the only thing you changed, instead of discovering a
  two-baseline cascade eight tasks later.
- **SATISFIES**: AC #1 (both behaviours), ticket scope line 3
- **REGENERATES**: contributes to `loc-summary` (task 9); **expected net ≈ 0, so `runtime.linesApprox` should NOT move** — proven here and again in task 9.

### 4. UPDATE `agent-layer/gen-vocabulary.mjs` — project, reword, version

- **IMPLEMENT (a) projection**: at line 78, replace `children: head.children,` with:

  ```js
      children: head.children,
      // Conditional, the aiPatterns/example precedent (handoff-viewer.mjs:86-92): a key only the
      // containers declare is projected only where it is declared, so the other entries do not each
      // gain a line saying "one" — and pack.bundle.json does not churn to say nothing.
      ...(head.childrenCardinality ? { childrenCardinality: head.childrenCardinality } : {}),
  ```

- **IMPLEMENT (b) the rule prose**: replace the `childrenRule` string (line 91-92) with:

  ```js
      childrenRule:
        "a node may carry children only when its vocabulary entry lists allowed names, and every child's name must be in that list; at most one child unless the entry declares childrenCardinality: \"many\", in which case any number",
  ```

- **IMPLEMENT (c) the version mark**: add as the FIRST key of the `composition` object, above `shape`:

  ```js
      // The grammar's own version. v1 was single-child-only; v2 is the cardinality (#298). It rides
      // the grammar block rather than the file root because that is the thing it versions, and
      // pack.json carries no version to bump (observed: its top-level keys are $description,
      // scenario, generatedFrom, components, portability). A reader of an older committed pack can
      // tell which grammar their composition validated under.
      version: 2,
  ```

- **PATTERN**: (a) is `handoff-viewer.mjs:86-92`; (b) and (c) are plain data in the same object literal.
- **GOTCHA**: `handoff-viewer.mjs:239` renders a FIXED key list `["shape","childrenRule","chipRule"]`, so
  `version` is invisible at view time — which is what you want (a bare "2" as a prose paragraph would be
  wrong), and it is why `handoff.html` does not move. Do not "fix" the viewer to include it.
- **GOTCHA**: `record-composition.mjs` points the compose agent at this FILE (`refs.vocab`), so (b) is
  **correctness, not cosmetics** — a stale `childrenRule` would tell the agent the opposite of what the
  validator does. No prompt edit is needed or wanted.
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs` → prints `vocabulary      ✓  20 components (handoff/verdant/vocabulary.json)`; then
  `node -e "const v=require('./handoff/verdant/vocabulary.json');console.log(v.composition.version, JSON.stringify(v.composition.childrenRule).slice(0,60)); console.log('entries carrying the key:', Object.values(v.components).filter(c=>c.childrenCardinality).length)"`
  → `2 "a node may carry children only when its vocabulary entry…"` and `entries carrying the key: 0`.
- **REDDENS**: n/a (no check added here) — but the projection is exercised by task 6's parser fixtures and by task 5's synthetic vocabulary.
- **SATISFIES**: AC #2 (the version mark), ticket scope line 2
- **REGENERATES**: `handoff/verdant/vocabulary.json` + `handoff/verdant/pack.bundle.json` (the bundle inlines every pack file) — both in task 8.

### 5. UPDATE `tooling/build-checks.mjs` group 3 — the cardinality grammar

- **IMPLEMENT**: inside group 3's block (lines 558-619), after the whole-vocabulary template loop and before
  the `compose(id, …)` refusals, insert a labelled sub-section:

  ```js
    // --- the cardinality grammar (#298), over a SYNTHETIC entry -------------------------------
    //
    // Driven directly through validateComposition, not through compose(): no committed spec declares
    // `childrenCardinality: "many"` yet (stack is #301, list is #305), so the REAL vocabulary cannot
    // show the many side at all. The synthetic entry is a copy of the real map plus ONE container —
    // real children underneath it, so a pass cannot come from an empty subtree.
    const MANY = {
      components: {
        ...VOCAB.components,
        "syn-container": { class: "x-syn", status: "spec", props: {}, states: ["default"],
                           children: ["metric-tile"], childrenCardinality: "many", usage: "", contract: null },
      },
    };
    const kid = (n) => ({ name: "metric-tile", props: { label: `l${n}`, value: String(n) } });

    // The many side: three children accepted.
    let manyThrew = null;
    try { validateComposition(MANY, [{ name: "syn-container", props: {}, children: [kid(1), kid(2), kid(3)] }]); }
    catch (err) { manyThrew = err; }
    ok(manyThrew === null, `a "many" entry refused three children: ${manyThrew && manyThrew.message}`);

    // The one side, over a REAL entry: two children refused, and the refusal NAMES THE INDEX.
    // Both halves asserted — a gate that throws with the wrong message is a gate nobody can debug.
    let oneThrew = null;
    try { validateComposition(VOCAB, [{ name: "card", props: { title: "T" }, children: [kid(1), kid(2)] }]); }
    catch (err) { oneThrew = err; }
    ok(oneThrew !== null, "a single-child entry accepted two children — the cardinality is not honoured");
    ok(oneThrew && /children\[1\]/.test(oneThrew.message),
      `the too-many refusal does not name the offending index — got: ${oneThrew && oneThrew.message}`);
    ok(oneThrew && /at most one child \(got 2\)/.test(oneThrew.message),
      `the too-many refusal does not say why — got: ${oneThrew && oneThrew.message}`);

    // THE MUTATION that decides whether the many side can fail at all: the SAME three children under
    // an entry identical in every way EXCEPT the cardinality must be refused. Without this, an
    // implementation that simply stopped counting children would pass the case above.
    const NO_CARD = { components: { ...MANY.components,
      "syn-container": { ...MANY.components["syn-container"], childrenCardinality: undefined } } };
    let mutThrew = null;
    try { validateComposition(NO_CARD, [{ name: "syn-container", props: {}, children: [kid(1), kid(2), kid(3)] }]); }
    catch (err) { mutThrew = err; }
    ok(mutThrew !== null, "dropping the cardinality still accepted three children — the many case proves nothing");

    // And the index survives INSIDE a many container: a bad child at position 2 is named at 2.
    let deepThrew = null;
    try { validateComposition(MANY, [{ name: "syn-container", props: {}, children: [kid(1), kid(2), { name: "card", props: { title: "x" } }] }]); }
    catch (err) { deepThrew = err; }
    ok(deepThrew && /children\[2\]/.test(deepThrew.message),
      `a bad child at index 2 was not named at 2 — got: ${deepThrew && deepThrew.message}`);
  ```

- **IMPLEMENT (the ✓ line)**: extend the `group("composition", …)` call (line 617) by appending, before the closing backtick:

  ```
   · the children cardinality driven straight through validateComposition: three children accepted under a SYNTHETIC `many` entry, two refused under the real card with the refusal naming children[1], a bad child at index 2 named at 2, and the MUTATION that decides whether the many case can fail — the same three children under an entry differing only in the cardinality. Synthetic deliberately: no committed spec declares `many` yet (#301, #305), so the real vocabulary cannot reach this side of the grammar. What this cannot reach: that gen-vocabulary PROJECTS the key — genVocabulary reads system/specs off a module const with no seam for a synthetic spec, so the projection's first real proof is #301's regenerated vocabulary, and a typo in the key name there would be green here
  ```

- **IMPLEMENT (the header index)**: line 28-29's group 3 entry gains a third line:
  ```
  //                     check that catches a vocabulary regeneration breaking the builder; plus the
  //                     children CARDINALITY over a synthetic entry, which the real vocabulary
  //                     cannot show until a spec declares `many` (#298)
  ```
- **PATTERN**: group 18A's four-branch mutation (`tooling/build-checks.mjs:3702-3723`) — throw AND message
  asserted separately, with the comment naming what the mutation buys.
- **GOTCHA**: `ok()` accumulates; `group()` prints and clears (`:306-319`). Put the block INSIDE group 3's
  brace scope, before its `group("composition", …)` call, or the failures land on group 4.
- **GOTCHA**: do NOT add a 35th group. `checkGroupCount` (`tooling/drift-check.mjs:169-192`) pins 34 in four
  places and a new group reddens CI until all four move.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build composition"` → one `✓` line carrying the new clause.
- **REDDENS**: delete `entry.childrenCardinality !== "many" &&` from task 3's guard → group 3 fails with
  `a "many" entry refused three children: …`. Restore it and delete the `kids.length > 1` guard entirely →
  group 3 fails with `a single-child entry accepted two children`. Run both; record both in the report.
- **SATISFIES**: AC #1 (the grammar half), AC #4
- **REGENERATES**: none (`tooling/` is in no `loc-summary` group — verified against the three regexes)

### 6. UPDATE `tooling/build-checks.mjs` group 18C — the two parser refusals

- **IMPLEMENT (a)**: add two entries to the `refusals` array (after the existing six, ~line 3898):

  ```js
      // #298's head key. Two refusals, the min/max/step shape one step further: a value that is not
      // "many" (absent is how you say one), and a cardinality on an entry that lists no allowed
      // children — a rule that can never fire.
      { why: "a childrenCardinality that is not \"many\"", stem: "cardinality-bad-value",
        head: { ...BASE, children: ["x-thing"], childrenCardinality: "lots" },
        expect: /must be "many" — absent means at most one child/ },
      { why: "a childrenCardinality on an entry with no allowed children", stem: "cardinality-on-leaf",
        head: { ...BASE, childrenCardinality: "many" },
        expect: /lists no allowed names/ },
  ```

- **IMPLEMENT (b)**: extend the existing bare-fixture assertion (~line 3871) so the key is proven OPTIONAL
  and proven to SURVIVE parsing, beside `example`:

  ```js
    ok(bare && bare.head.childrenCardinality === undefined, "a spec with no childrenCardinality did not parse as undefined");
    // And the happy many case: declared beside a non-empty children list, it survives the parser.
    let manySpec = null;
    try { manySpec = parseComponentSpec(write("many-thing", { ...BASE, children: ["x-thing"], childrenCardinality: "many" })); }
    catch (err) { ok(false, `a valid childrenCardinality was refused: ${err.message}`); }
    ok(manySpec && manySpec.head.childrenCardinality === "many", "childrenCardinality did not survive parsing");
  ```

- **PATTERN**: the `refusals` array and the positive control immediately above it (`:3846-3908`).
- **GOTCHA — do not retype a count.** `parserRefusals`/`parserRefusalNames` are DERIVED from the array
  (`:3906-3907`), so the ✓ line updates itself from six to eight. A hand-typed "8" anywhere is the Low-4 shape
  this group's own comment warns about.
- **GOTCHA — `gates.md` needs no edit for this half.** Verified this session: gates.md's group-18 paragraph
  (line 29) describes 18A and 18B only and never enumerates 18C's parser refusals.
- **GOTCHA — the fixture must satisfy the WHOLE parser.** `BASE` has `children: []`; the bad-value case needs
  a non-empty `children` or it would refuse for the leaf reason instead. `"x-thing"` is a name, never resolved
  by `parseComponentSpec` (`gen-handoff.mjs:36` is what resolves child names, and it is not called here).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build docs chain"` → `parseComponentSpec's 8 NEW refusals` and both new `why` strings in the names list.
- **REDDENS**: delete the `childrenCardinality` block from `agent-layer/lib.mjs` (task 2) → group 18 fails
  twice with `parseComponentSpec accepted a childrenCardinality that is not "many" — the refusal cannot fire`.
- **SATISFIES**: AC #1 (the ticket's "Group 18 gains the check" — see D1), AC #4
- **REGENERATES**: none

### 7. UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: line 13, in the groups-1–7 sentence, change
  `compositions against the real generated vocabulary,` to
  `compositions against the real generated vocabulary (plus the children-cardinality grammar over a synthetic entry, the one side the real vocabulary cannot show until a spec declares \`many\` — #298),`
- **PATTERN**: the house convention at gates.md line 5 — every gate states the boundary it cannot reach.
- **GOTCHA**: [[gate-prose-has-three-copies]] — for group 3 the copies are gates.md:13, the `group("composition", …)`
  detail string (task 5) and the header index at :28 (task 5). All three move together or one of them lies.
  **Do not touch the "34 pure groups" heading** at gates.md:12 — `checkGroupCount` reads it.
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -2` → `drift-check ✓ … group-count` (the heading is untouched, so the count leg stays green).
- **SATISFIES**: AC #4
- **REGENERATES**: none

### 8. REGENERATE the four artifacts and read the `handoff/` diff

- **IMPLEMENT**:
  ```
  node agent-layer/gen-handoff.mjs
  node agent-layer/gen-vocabulary.mjs
  node agent-layer/gen-pack-bundle.mjs
  node agent-layer/gen-system-graph.mjs
  git diff --stat handoff/ system/system-graph.json
  ```
- **GOTCHA — order is load-bearing**: `gen-pack-bundle` inlines every file under `handoff/verdant/`, so it
  MUST run after `gen-vocabulary` (`drift-check.mjs:126` says so in its own comment).
- **GOTCHA — `gen-handoff` shells out to Style Dictionary**: it needs `tooling/style-dictionary/node_modules`.
  If it throws, `cd tooling/style-dictionary && npm install` ([[local-agent-visual-gate-notes]]).
- **EXPECTED (derived, confirm by running)**: exactly two files move — `handoff/verdant/vocabulary.json`
  (the `composition` block only: a new `version` key and the reworded `childrenRule`; **no `components` entry
  changes**, because no spec declares the key) and `handoff/verdant/pack.bundle.json` (it inlines the file
  above). `pack.json` and `system/system-graph.json` are expected **unchanged** — nothing in a spec head moved.
- **VALIDATE**: `git diff --stat handoff/` lists exactly `vocabulary.json` and `pack.bundle.json`; then
  `git diff handoff/verdant/vocabulary.json | grep "^[-+]" | grep -v "^[-+][-+]"` shows only the `version`
  line and the `childrenRule` pair. Any third file, or any diff inside `"components"`, means the projection
  went unconditional — go back to task 4(a).
- **SATISFIES**: AC #2
- **REGENERATES**: `handoff/verdant/vocabulary.json`, `handoff/verdant/pack.bundle.json` (this task IS the regeneration)

### 9. STAGE, then regenerate `loc-summary`, then decide the VR question by arithmetic

- **IMPLEMENT**:
  ```
  git add -- system/agentic-renderer.mjs agent-layer/lib.mjs agent-layer/gen-vocabulary.mjs \
             tooling/build-checks.mjs .claude/references/kb-format.md .claude/references/gates.md \
             handoff/ .claude/plans/canvas-grammar-children-many.md \
             .claude/plans/canvas-grammar-children-many.html
  node agent-layer/gen-loc-summary.mjs
  git diff --stat system/loc-summary.json
  ```
- **GOTCHA — stage FIRST, always.** `genLocSummary` reads the **git index** (`git show :<path>`,
  `gen-loc-summary.mjs:45`), not the working tree. Running it before `git add` is a false "no drift"
  ([[loc-summary-counts-tracked-only]]).
- **GOTCHA — the headroom is tight, and this is the finding the ticket does not carry.** Observed on
  `origin/main` this session: runtime **30,632** actual → 30,600 rounded (**18 lines up**); generators
  **2,667** → 2,700 (83 down... 83 up); total **38,543** → 38,500 (**7 lines up**). So:
  - The **total** almost certainly flips to 38,600 → `system/loc-summary.json` changes → it MUST be
    committed here or CI `verify`'s drift leg goes red.
  - The **runtime group** should NOT flip: task 3's block is net **-2 lines** (observed in the scratch
    patch) and `system/agentic-renderer.mjs` is the only `system/` file this PR touches.
- **VALIDATE (the discriminating check — run it, do not eyeball a diff)**:
  ```
  node -e "const {execFileSync:x}=require('node:child_process');const t=x('git',['ls-files'],{encoding:'utf8'}).split('\n').filter(Boolean);const f=t.filter(p=>/^system\/(wc\/)?[^/]+\.(css|mjs|js)\$/.test(p));const l=f.reduce((s,p)=>s+x('git',['show',':'+p],{encoding:'utf8',maxBuffer:67108864}).split('\n').length,0);console.log('runtime files',f.length,'lines',l,'rounded',Math.round(l/100)*100)"
  ```
  On unmodified `main` this prints `runtime files 77 lines 30632 rounded 30600` (observed this session — that
  is the one-liner's own positive control). **Expected after this PR: `77` / ≈`30630` / `30600`** — the
  ROUNDED figure and the file count are what `approach.html` renders, and both must be unchanged.
- **DECIDE**:
  - Rounded runtime is still **30600** and files still **77** → `approach.html:272-279` renders the same two
    numbers → **no VR baseline regeneration**, and the report says so with this command's output as the evidence.
  - Rounded runtime moved → `approach-neutral.png` and `approach-saulera.png` MUST be regenerated in this PR:
    `cd tooling/visual-regression && npm run update:docker`, from a **clean** tree
    ([[vr-gate-reads-working-tree]]), and if the PNGs do not rewrite, `rm` the two files first
    ([[vr-update-skips-subperceptual]]). Do NOT let a green VR run stand in for this arithmetic — one changed
    digit is well under `maxDiffPixels:100` ([[vr-tolerance-hides-text-changes]]).
- **REDDENS**: n/a (this is a cascade check, not a gate) — but its own positive control is that the command
  above reproduces `30600`/`77` on an unmodified `origin/main`.
- **SATISFIES**: AC #3 (the at-rest half), the standing cascade rules
- **REGENERATES**: `system/loc-summary.json` (expected: `total.linesApprox` 38500 → 38600, `runtime` unchanged) · possibly the two `approach-*.png` baselines

### 10. RUN the gates

- **IMPLEMENT**:
  ```
  node tooling/build-checks.mjs            # expect: build ✓  all 34 groups pass
  node tooling/drift-check.mjs             # expect: drift-check ✓  syntax · … · group-count
  node tooling/token-lint.mjs              # expect: green (no token work in this PR)
  ```
  then the operator-run leg, in two terminals:
  ```
  node tooling/visual-regression/serve.mjs &
  node tooling/catalog-journey.mjs all
  ```
- **GOTCHA — a stale `serve.mjs` from a sibling session serves THEIR tree** ([[stale-serve-wrong-tree]]).
  `curl -s localhost:4757/handoff/verdant/vocabulary.json | head -8` and confirm you see `"version": 2`
  before trusting the journey result. Never `pkill -f 'node server.mjs'` — PID/port only
  ([[portal-smoke-port-scoped-kill]]).
- **VALIDATE**: all four green; `catalog-journey` green across its three engines.
- **SATISFIES**: AC #3, AC #4
- **REGENERATES**: none

### 11. The build run from the jobs folder

- **IMPLEMENT**: `cd "../Linards jobs folder" && node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/ba.md`
- **GOTCHA**: `build.mjs` runs FROM the jobs folder against a decisions ledger; the repo-side generators
  (`gen-token-css`, `gen-handoff`, `gen-vocabulary`, `gen-pack-bundle`, `gen-replay`) resolve paths from their
  own module, while the per-company ones (`gen-decisions`, `gen-tokens`, `gen-llms`, `gen-headers`) write to
  the ledger's `site_root`, which is **relative to the jobs folder** (observed: `ba.md` → `BA/portfolio`).
  So this run rewrites four files in the owner's jobs folder, deterministically from the same ledger —
  expected to be a no-op, but say so if it is not. The available ledgers are `ba` · `citywire` · `hub` ·
  `lloyds` · `trainline` (observed); any of them proves the ✓ lines.
- **VALIDATE**: the run prints its ✓ lines, including `vocabulary      ✓  20 components`. Then back in the
  repo: `git status --short` → clean (the build re-emitted what task 8 committed, byte-identically, and
  `gen-token-css` / `gen-replay` re-emitted their unchanged artifacts).
- **SATISFIES**: AC #4
- **REGENERATES**: nothing new — this is the proof that task 8's artifacts are what the real build emits.

### 12. POST the hand-off on #301

- **IMPLEMENT**: the `gh issue comment 301 --body-file …` block in **D2**, verbatim. The key string in it —
  `childrenCardinality` — must match what task 2 actually shipped; #301's own body writes the shorthand
  `children: many`, and this comment is the only thing that tells it the real name.
- **GOTCHA**: this is the ONLY outward-facing step in the plan and it writes to the owner's tracker. It is
  additive and deletable, but if the owner would rather post it themselves, hand them the block and say so in
  the report's **Not run** — do not silently skip it, because a hand-off that lives only in this plan is a
  hand-off #301's planner will not see.
- **VALIDATE**: `gh issue view 301 --comments | tail -30` shows the comment, with `childrenCardinality`
  spelled as the code spells it.
- **SATISFIES**: D2 (the durable hand-off), R4 and R5
- **REGENERATES**: none

### 13. RESTORE #292's stash

**Independent of:** everything above. Nothing after task 0 depends on #292's tree, so run this whenever —
right after task 0's branch exists, or last. It is listed here only so it is not forgotten.

- **IMPLEMENT**:
  ```
  git switch feature/discovery-pre-grill-audit-292    # the stash belongs to THIS branch
  git stash list                                      # read it; find the entry task 0 pushed
  git stash pop stash@{N}                             # explicit ref, never a blind pop
  git switch -                                        # back to where you were
  ```
- **GOTCHA**: a blind `git stash pop` on the #298 branch applies #292's line to the wrong branch. And a stash
  from a SIBLING session must never be popped by this one ([[shared-worktree-parallel-sessions]]) — read the
  list, match the entry to task 0's message, pop by ref.
- **VALIDATE**: on `feature/discovery-pre-grill-audit-292`,
  `git status --short -- agent-layer/gen-decisions.mjs` shows the file modified again, and `git stash list`
  no longer carries this session's entry.
- **SATISFIES**: the plan's own cleanliness (R7's second half)
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no test suite in this repo and none is to be invented (CLAUDE.md §Ground rules). "Tested" means the
gate that owns the surface ran and is green, and that each new check was watched failing.

### Unit-equivalent (build-checks, pure, in CI)

- **Group 3** — `validateComposition`'s cardinality, driven by calling the function: the many side accepted
  over a synthetic entry, the one side refused over the real `card`, both refusal halves (index and reason)
  asserted separately, the index preserved at depth, and the cardinality-dropped mutation.
- **Group 18C** — `parseComponentSpec`'s two new refusals over real tmpdir fixture files, each asserted to
  throw AND to name its own spec path, behind the existing positive control plus a new `many` happy case.

### Integration-equivalent

- `drift-check.mjs` re-runs `genHandoff` → `genVocabulary` → `genPackBundle` and git-porcelains `handoff/`:
  that is the end-to-end proof that the projection is deterministic and the committed artifacts match.
- `catalog-journey.mjs all` — /components across three engines, against the regenerated vocabulary.
- `build.mjs` from the jobs folder — the real orchestrated run (task 11).

### Edge Cases

1. A spec with no `childrenCardinality` parses and projects with the key ABSENT (not `null`) — 18C's bare fixture.
2. `childrenCardinality: "many"` on an entry with an empty `children` list — refused at parse time.
3. `childrenCardinality: "one"` — refused; one has a single spelling (absence).
4. A `many` entry with **zero** children — `kids.length > 0` short-circuits; still valid. (Unasserted by
   design: it is the same branch the single-child grammar already takes, and group 3's `metric-tile` leaf case covers the `length === 0` entry side.)
5. A bad child deep inside a `many` array — the refusal names its index, not `children[0]`.
6. A `status-chip` competing with its parent inside a `many` container — the chip rule now runs per child.
7. `children` present but not an array — unchanged refusal, first branch.

### Proving the checks

Every new check carries its REDDENS mutation above, and each has a positive control that is ALREADY in the
file: group 3's real-vocabulary pattern loop (if the synthetic map broke the validator, those go red first)
and group 18C's `ok-thing`/`bare-thing` fixtures (if the fixture shape were wrong, every refusal would pass
for the wrong reason). Run each mutation, watch the named group go red, restore, and record both in the report
— a green gate you never saw fail is [[check-that-cannot-fail]].

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```
node --check system/agentic-renderer.mjs
node --check agent-layer/lib.mjs
node --check agent-layer/gen-vocabulary.mjs
node --check tooling/build-checks.mjs
node tooling/token-lint.mjs
```

There is no linter and no type-check; do not hunt for one. (`drift-check`'s syntax leg `node --check`s every
tracked `.mjs`, including anything under `.claude/plans/` — park code fragments as fenced markdown, never as a
`.mjs` file: [[drift-check-syntax-checks-parked-mjs]].)

### Level 2: Unit Tests

```
node tooling/build-checks.mjs        # build ✓  all 34 groups pass
```

### Level 3: Integration Tests

```
node tooling/drift-check.mjs         # drift-check ✓  … handoff … group-count
git diff --stat handoff/             # exactly vocabulary.json + pack.bundle.json
git status --short system/loc-summary.json
```

### Level 4: Manual Validation

```
node tooling/visual-regression/serve.mjs &
node tooling/catalog-journey.mjs all
```
Plus one browser read of `http://localhost:4757/components.html` under neutral and saulera (the dock's pack
switcher): the `Children:` lines must read exactly as they do on `main` — the catalog prints `entry.children`
only and never `composition.childrenRule` (verified by reading `system/catalog.mjs:428-432`).

### Level 5: Additional Validation (Optional)

`node tooling/build-journey.mjs all` — /build composes through the same validator. Not required by any AC;
run it if the group-3 diff makes you want the running-page confirmation.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Task 12 — `gh issue comment 301` with the hand-off (D2) | free; **outward-facing** — a write to the owner's tracker | **yes**, before the merge | If the owner would rather post it themselves, hand them the block verbatim and record it under the report's **Not run** with "owner to post on #301". Never silently skip it — R5's whole mitigation is this comment. |
| Task 9's VR branch — `npm run update:docker` on the two approach baselines | free; ~10 min of local Docker | yes, **only if** the runtime figure flipped | Not applicable unless the arithmetic says so; the decision and its evidence go in the report either way. |

**No paid step, no agent run, no SDK call, no credential, no owner verdict.** The `build.mjs` run (task 11)
is a local generator run against a committed ledger and spends nothing. The two rows above are the only steps
that are not "run a command in this repo and read the output".

---

## RISK REGISTER

Every risk this plan found, where it is handled, and what is left over after the handling. A residual of
"none" means the failure is caught mechanically at the point it would occur, not that it cannot happen.

**Four rows change what the implementer does — R1, R2, R3, R5.** The rest are notes, kept here because this
is where someone will look for them, not because the plan needs to underwrite them.

| # | Risk | Handled where | Residual |
|---|---|---|---|
| **R1** | The runtime line group flips 30,600 → 30,700, `approach.html` renders the new figure, and both approach baselines churn. Headroom is **18 lines**. | Task 1 puts the long prose in the uncounted `kb-format.md`; task 3's block is net **−2 lines** (observed); the budget is checked **twice** — fail-fast at the end of task 3, and again at task 9. | Low. If it flips anyway, task 9's second branch regenerates both PNGs from a clean tree in the same PR. Cost: one local Docker run. |
| **R2** | The **total** line group flips (headroom 7) and `loc-summary.json` goes stale → CI `verify` red. | Expected, not avoided: task 9 regenerates it **after** `git add`, because `genLocSummary` reads the git index. | None, provided the staging order is kept. The failure mode if it is not is a red gate, never a wrong artifact. |
| **R3** | AC #1 names a gate home (`validateExamples`) that cannot carry a `children` array, so following it literally is impossible. | **D1**: group 3 for the grammar, 18C for the parser, with the deviation required in the PR body and the report. | Owner may still prefer one home. That is a review-time copy-paste plus three prose rewords; no shipped code moves. |
| **R4** | `gen-vocabulary`'s conditional projection ships unexercised — a typo in the key name is green in this PR. | Stated as a boundary in group 3's ✓ line and in **A3**, the house convention. Task 12's comment tells #301 to check `stack`'s entry actually carries the key. | Accepted and named. Building a synthetic-spec seam into `genVocabulary` would be a second generator. First real proof is #301's regenerated vocabulary. |
| **R5** | `handoff-viewer.mjs:81` and `catalog.mjs:430` silently under-report the key once a spec declares it — and a note buried in this plan is not a hand-off. | **D2** + **task 12**: a `gh issue comment` on #301 carrying both seams, their exact fixes, and #301's own unimplementable AC. | None once posted. Task 12's VALIDATE is the receipt. |
| **R6** | The projection goes unconditional and 20 entries each gain a line, blowing up the `handoff/` diff. | Task 8's VALIDATE names the exact expected diff — two files, and no change inside `"components"` — and says which task to go back to. | None. Caught at the point of change, one task after it is made. |
| **R7** | A sibling session's uncommitted `gen-decisions.mjs` (a `generators`-group file) rides into the branch and poisons the line arithmetic. | Task 0 stashes it by explicit path and confirms the switch; every `git add` in the plan is by explicit path; task 12 restores the stash by explicit ref. | Low. `git status --short -- agent-layer system tooling handoff` at task 0 is the check. |
| **R8** | A stale `serve.mjs` from another session serves ITS tree, so `catalog-journey` green proves nothing. | Task 10's `curl` check for `"version": 2` before trusting the journey, and a PID/port-only kill rule. | None. The curl is a positive control on the server itself. |
| **R9** | The group-3 block lands outside group 3's brace scope, so its failures print under group 4. | Gotcha in task 5; its VALIDATE greps for the `^build composition` line carrying the new clause. | None. |
| **R10** | Changing the too-many refusal string (`children:` → `children[1]:`) breaks a consumer. | Grepped this session (**P4**): the only occurrences outside `agentic-renderer.mjs` are plans, reports and the epic doc. No gate pins it. | None. |
| **R11** | `gen-handoff` shells out to Style Dictionary and throws on a fresh clone. | Task 8's gotcha carries the `npm install` path. | None. |
| **R12** | `build.mjs` (task 11) rewrites four files in the owner's jobs folder. | **P10** + task 11's gotcha: the per-company generators resolve `site_root` from cwd. Deterministic from the same ledger, so a no-op is expected and a non-no-op is reported. | Accepted — this is the run CLAUDE.md prescribes for the AC. |
| **R13** | A green VR run is taken as proof the approach page did not change; `maxDiffPixels: 100` swallows one changed digit. | Task 9 decides by **arithmetic**, explicitly not by a pixel run, and carries the `rm` step for a sub-perceptual update that skips. | None. The one-liner has its own positive control (it reproduces 30,632 on `main`). |

## ACCEPTANCE CRITERIA

Traced to the ticket's four, one line each.

- [ ] **AC #1 — the check that cannot fail, by running the function.** Two children to a single-child entry
      → refused, naming `children[1]`; three to a `many` entry → accepted. The validator mutated, the named
      group watched going red, and that recorded in the report. (Tasks 3, 5, 6; **D1** records where the cases
      live and why, and requires the deviation in the PR body.)
- [ ] **AC #2 — the four regenerators run** (`gen-handoff` · `gen-vocabulary` · `gen-pack-bundle` ·
      `gen-system-graph`); `git diff --stat handoff/` shows only regenerated files; `verify`'s drift check
      green. Plus the version mark: `vocabulary.json`'s `composition.version` is `2`. (Tasks 4c, 8.)
- [ ] **AC #3 — `/components` checked under neutral and saulera**: either no visual change, or its baselines
      regenerated with the reason stated. (Tasks 9, 10; the plan's expectation is NO change, with the evidence
      in NOTES §Pre-flight.)
- [ ] **AC #4 — `node tooling/build-checks.mjs` all green; `node agent-layer/build.mjs` from the jobs folder
      prints its ✓ lines; `catalog-journey` green.** (Tasks 10, 11.)

Standing rules, each answered rather than assumed:

- [ ] No new tracked file (`system/`, `agent-layer/`, `tooling/`) — holds.
- [ ] At-rest row applies to `/components` only if the copy changes — it does not; stated with evidence.
- [ ] No token work — holds (`token-lint` green, `tokens.source.json` untouched).
- [ ] No live control — holds (`param-manifest.json` untouched, `gen-param-count` not re-run).
- [ ] `loc-summary.json` regenerated **after staging**, and the runtime figure checked against
      `approach.html`'s two rendered numbers. (This is the standing rule the ticket does NOT carry — see NOTES.)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Every REDDENS mutation run, observed red, and restored
- [ ] `build-checks` · `drift-check` · `token-lint` green
- [ ] `catalog-journey all` green; `/components` eyeballed under both packs
- [ ] `build.mjs` from the jobs folder prints its ✓ lines and leaves `handoff/` clean
- [ ] `handoff/` diff is exactly two files; `loc-summary.json` regenerated post-`git add`
- [ ] VR decision made by the line arithmetic, and the decision recorded either way
- [ ] Every row of the RISK REGISTER closed or its residual restated in the report
- [ ] The stash from task 0 restored on #292's branch (task 13), and `git stash list` clean of this session's entry
- [ ] Acceptance criteria all met; **D1's deviation sentence is in the PR body and the report**
- [ ] **D2's hand-off comment posted on #301** (task 12) before the merge
- [ ] PR body carries `Closes #298` ([[prs-dont-auto-close-tickets]]) and the plan + report + review live in the same PR

---

## DECISIONS / ASSUMPTIONS

Nothing here is left open. The two that started as questions are decided below, with the evidence that
decided them and what the implementer must do so the deviation is visible rather than silent.

**D1 (decided) — the gate cases live in group 3 (grammar) and group 18C (parser), not in group 18's
`validateExamples`.** The ticket's AC #1 names "Group 18 (`validateExamples`)". That is not implementable:
`validateExamples` feeds `validateComposition` a node of the shape `{ name, props: head.example }` and
**never a `children` array** (`agent-layer/gen-vocabulary.mjs:41`, read this session), so neither of the two
behaviours AC #1 names can run through it. Group 3 is the only group that exercises `validateComposition`;
group 18C is the only one that exercises `parseComponentSpec` over real spec fixtures, which is exactly what
a new head key needs. Both of AC #1's operative requirements — "by running the function", and the mutation —
are met in full.

*What the implementer must do so this is a flag, not a drift* (CLAUDE.md §Working principles):
- The PR body says it in one sentence, above the `Closes #298` trailer: *"AC #1's cases live in group 3
  (grammar) and 18C (parser) rather than in `validateExamples`, which cannot carry a `children` array —
  see the plan's D1."*
- The report's deviations section carries the same sentence with `gen-vocabulary.mjs:41` as its evidence.
- If the owner wants a single home after all, moving the group-3 block into 18 is a copy-paste plus a reword
  of 18's charter in three places (header :69-73, the `group("docs chain", …)` string, gates.md:29). It does
  not change a line of shipped code, so it is a review-time move, never a reason to hold implementation.

**D2 (decided) — `handoff-viewer.mjs:81` and `catalog.mjs:430` are NOT touched here; the hand-off is made
durable on #301's issue before this PR merges.** Both will under-report the new key the day a spec declares
it, and neither is observable in this PR because no spec declares `many`. Adding either now means shipping a
line no gate in this PR can exercise — the same objection A3 records against the projection — and the catalog
half additionally moves the `/components` baselines, which is work #301 already does and this ticket's
standing rules say it does not. So: leave them, and make the hand-off something #301's planner cannot miss.
A plan note is not durable; an issue comment is. Run this once, before the PR merges (task 12):

Write the body to a scratch file first — a `--body` string with backticks and apostrophes in it is a quoting
trap, and `gh` takes a file:

````
cat > /tmp/298-handoff.md <<'BODY'
From #298 (the grammar change this ticket builds on) — three things #301 inherits, none of them observable
in #298 because no spec declares `childrenCardinality` there.

**Two seams that will silently under-report the key the day `stack` declares it:**

1. `system/handoff-viewer.mjs:81` — the head projection is an explicit field PICK, and its own comment says
   an unnamed key is dropped. `stack`'s "Source (spec head)" JSON in the handoff pack will omit the
   cardinality. Fix: `...(c.childrenCardinality ? { childrenCardinality: c.childrenCardinality } : {}),`
   plus a group-18B both-directions assertion over a synthetic pack, mirroring the `example` one.
2. `system/catalog.mjs:430-431` — `Children: a · b · c` prints the allowed names without the cardinality,
   so /components documents a container as if it took one. Fix: append ` (many)` when the entry declares it.
   This one moves the /components baselines — which this ticket regenerates anyway.

**And AC #2 here is not implementable as written.** "Group 18 gains a many-children example" cannot work
against today's `validateExamples`: it feeds `validateComposition` a node of the shape
`{ name, props: head.example }` and never a `children` array (`agent-layer/gen-vocabulary.mjs:41`). Either
`example` grows to carry children — a head-schema change with its own parser refusal and `kb-format.md`
entry — or the many-children case lives beside #298's grammar cases in build-checks group 3.

Also inherited from #298: the conditional projection in `gen-vocabulary.mjs` ships there unexercised
(`genVocabulary()` reads `system/specs` off a module const, with no seam for a synthetic spec), so **this
ticket's regenerated `vocabulary.json` is its first real proof**. Check that `stack`'s entry actually
carries the key.
BODY
gh issue comment 301 --body-file /tmp/298-handoff.md && rm /tmp/298-handoff.md
````

**A1 (assumption) — the key is named `childrenCardinality` and takes only `"many"`.** The epic and #301 both
write the shorthand `children: many`, which cannot be the literal key (`children` is the allowed-names array).
`childrenCardinality` is unambiguous about what it is the cardinality OF and is greppable. Absent ≡ one, so one
has a single spelling. If a later primitive needs a third cardinality, the value domain widens without a rename.

**A2 (assumption) — `composition.version: 2` is the version mark.** `pack.json` carries no version to bump
(observed: `$description`, `scenario`, `generatedFrom`, `components`, `portability`), so the ticket's
parenthetical resolves to the vocabulary. It sits inside `composition` because that is the block it versions,
and it is inert in `handoff-viewer`'s fixed key list, so no page moves.

**A3 (assumption) — no spec declares `many` in this PR**, so the `many` branch ships unexercised by any real
artifact and is proven only by a synthetic entry. That is the ticket's own scoping (`stack`/`list` are #301/#305),
and group 3's ✓ line says so out loud rather than leaving it implied. One consequence to state rather than
hide: **task 4(a)'s conditional projection ships unexercised too.** Group 18C proves the PARSER keeps `"many"`;
nothing here proves `gen-vocabulary` writes it out, because `genVocabulary()` reads `SPECS` from a module
const and has no seam for a synthetic spec. Building one would be a second generator. The projection's first
real proof is #301's regenerated `vocabulary.json`, and group 3's ✓ line now says so — the house convention
of stating the boundary rather than letting a green run imply coverage it does not have.

---

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Everything below was **observed this session** on `feature/discovery-pre-grill-audit-292` at `0e27afb`
(identical to `origin/main` for every file this plan touches).

**Baselines, before any edit:**

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass`, zero `✗` |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` |

**The mechanism, proven against a patched copy of the validator in the scratchpad** (not in the tree). The
patch is task 3's block verbatim; the probe fed it seven cases:

```
REFUSE card + 2 children (single-child entry) -> composition[0].children[1]: card allows at most one child (got 2)
PASS   syn-stack + 3 children (many entry)
REFUSE syn-stack + bad child at index 2 -> composition[0].children[2]: "card" is not an allowed child of syn-stack (allowed: metric-tile)
REFUSE syn-stack + child[1] bad prop -> composition[0].children[1].props.nonsense: "nonsense" is not a prop of metric-tile
PASS   card + 1 metric-tile (unchanged single-child path)
REFUSE plant-card + competing status-chip -> composition[0].children[0].props.value: "due" competes with the parent plant-card's status
REFUSE metric-tile + a child (leaf) -> composition[0].children: metric-tile allows no children
```

Regression under the same patch: **4 committed compositions** (`proto/compositions/*.json`) and **20 pack
examples** all still validate. The block is **net −2 lines** against the one it replaces.

**Findings that changed the plan:**

- **P1 — the `loc-summary` cascade the ticket and the pre-ticket sketch both miss.** The sketch reasoned "no
  new tracked file ⇒ no churn". `gen-loc-summary.mjs:45` counts **lines**, not files. Measured headroom on
  `main`: runtime 30,632/30,600 (**18 up**), generators 2,667/2,700, total 38,543/38,500 (**7 up**). So
  `loc-summary.json` moves on its total almost whatever this PR does, and the runtime group is 18 lines from
  flipping `approach.html`'s rendered figure and both approach baselines. Task 9 exists because of this, and
  task 3's "keep the prose in `kb-format.md`" gotcha is the lever that keeps the flip from happening.
- **P2 — `/components` is safe, with a reason rather than a hope.** `system/catalog.mjs:430` prints
  `entry.children` per component and never touches `composition.childrenRule`; the reworded rule prose is
  therefore invisible there. And `handoff.html`, the one page that DOES render `childrenRule`
  (`handoff-viewer.mjs:239`), is **not in the VR `PAGES` array** (`visual.spec.mjs:31-141`, read in full).
  AC #3 resolves to "no visual change", said with evidence.
- **P3 — group 18's ✓ line is self-deriving.** `parserRefusals`/`parserRefusalNames` come from the `refusals`
  array (`:3906-3907`), so task 6 adds no hand-typed count. Group 3's detail string is NOT self-deriving and
  does need the clause.
- **P4 — no gate pins the refusal strings.** Grepped: "allows at most one child" appears only in
  `agentic-renderer.mjs`, `gen-vocabulary.mjs`'s prose, `.claude/plans/*`, `.claude/reports/*` and the epic
  doc. Naming the offending index is free.
- **P5 — no gate pins the `composition` block's key set.** The only reader is
  `handoff-viewer.mjs:125` (`vocab.composition ?? null`, passed whole) and `:239` (a fixed three-key render
  list). Adding `version` breaks nothing.
- **P6 — the compose agent reads the vocabulary FILE.** `record-composition.mjs:173-175` hands it
  `refs.vocab` as a path and tells it to Read it, so the reworded `childrenRule` reaches the agent with no
  prompt edit — which makes task 4(b) correctness rather than housekeeping, and confirms the ticket's claim.
- **P7 — `pack.json` has no version to bump.** Resolves the ticket's open parenthetical (A2).
- **P9 — the branch this plan was written on is dirty in a way that would poison task 9.**
  `agent-layer/gen-decisions.mjs` carries one uncommitted line from #292, and no commit on
  `feature/discovery-pre-grill-audit-292` touches that file — so `git switch` would carry it into the new
  branch silently rather than aborting. That file is in the `generators` loc group. Task 0 now stashes it by
  explicit path and confirms the switch, and task 0's VALIDATE is scoped so this plan's own two files do not
  fail their own gate.
- **P10 — `build.mjs` writes outside the repo.** The four per-company generators resolve the ledger's
  `site_root` from cwd (observed: `ba.md` → `BA/portfolio`), so task 11 rewrites four files in the owner's
  jobs folder. Deterministic from the same ledger, so expected to be a no-op — but the plan says it out loud
  rather than letting the implementer discover it.
- **P8 — the `example` head key is deliberately not in `vocabulary.json`.** `gen-vocabulary.mjs:63-72` explains
  why at length (it is a prompt input, and the recorders are fenced against examples). `childrenCardinality`
  is the opposite case — it is a *constraint*, like `min`/`max`/`step`, which makes an agent's output more
  bounded, never more copied — so projecting it is right and the plan says so where a future reader will look.

### Alternatives weighed and rejected

| Option | Why not |
|---|---|
| Reshape `children` into `{ allowed: [...], cardinality }` | Five call sites (`agentic-renderer.mjs:84/:95/:96`, `catalog.mjs:430`, `gen-handoff.mjs:36`, `handoff-viewer.mjs:81`) plus all 20 spec files plus a `portal/lib/kb.mjs` compatibility question, and a `handoff/` diff of hundreds of lines. kb-format's own sync rule blesses the optional sibling instead. |
| `childrenCardinality: "one" \| "many"`, explicit on every entry | Two spellings for one, 20 added lines in `vocabulary.json` and a `pack.bundle.json` churn to say nothing new. A second copy is a second answer waiting to disagree. |
| `childrenMany: true` | Boolean; no room for a third cardinality without a rename, and reads as a flag rather than a grammar property. |
| A new build-checks group 35 | `checkGroupCount` pins 34 in four files; a new group is three more prose edits and scope the ticket did not ask for. |
| A version assertion inside `validateComposition` | A refusal with no caller — the vocabulary is an argument, and every caller in this repo passes the freshly generated file. The version is for a human reading an older committed pack. |
| Declaring `many` on `card` to exercise the branch for real | `card`'s Usage prose argues at length that it frames ONE thing and that the single-child rule is the grammar made visible. Changing it would contradict a shipped spec to make a gate prettier. |

### Handed to #301

Two forward traps, both verified this session, neither observable until a spec declares `many`:

1. **`system/handoff-viewer.mjs:81`** — the head projection is an explicit field PICK (`component`, `status`,
   `class`, `props`, `tokens`, `states`, `children`, then conditional `aiPatterns`/`example`). Its own comment
   warns that "an added head key is silently dropped unless it is named here". When `stack` declares
   `childrenCardinality`, the handoff pack's "Source (spec head)" JSON will omit it. Fix:
   `...(c.childrenCardinality ? { childrenCardinality: c.childrenCardinality } : {}),` plus a group-18B
   both-directions assertion over a synthetic pack, mirroring the `example` one.
2. **`system/catalog.mjs:430-431`** — `Children: a · b · c` prints names without the cardinality, so
   `/components` will document a container as if it took one. Fix: append ` (many)` when the entry declares it.
   **This one moves the `/components` baselines**, which is why it belongs in #301, whose AC already
   regenerates them.
3. **#301's own AC #2 is not satisfiable as written.** It says "Group 18 gains a many-children example
   (`stack` holding a `text`, a `text-field`, a `primary-button`)", but `validateExamples` feeds
   `validateComposition` a node of the shape `{ name, props: head.example }` and never a `children` array
   (`agent-layer/gen-vocabulary.mjs:41`). Either `example` grows to carry children — a head-schema change,
   with its own parser refusal and its own `kb-format.md` entry — or the many-children case lives beside the
   grammar cases in group 3 instead. #301's plan decides; this ticket deliberately does not pre-empt it.

### Sequencing note

This is the small two-way PR that must land **before** #301 and before the swap PR (architecture line 282).
Nothing depends on it inside this PR, so it can be reviewed and merged on its own; #301's `stack` spec is what
first makes the `many` branch reachable from a real artifact.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->

- 2026-09-17 — first write, after a pre-flight against `origin/main` (P1–P10 in NOTES). Supersedes the
  2026-08-28 pre-ticket sketch of the same name and corrects its one wrong claim: a change with no new
  tracked file still moves `loc-summary.json`, because the generator counts lines.
- 2026-09-17 — risks closed rather than carried. `OPEN QUESTIONS` became `DECISIONS`: **D1** (gate homes —
  group 3 + 18C, with the deviation required in the PR body) and **D2** (the two forward seams stay, and the
  hand-off is made durable on #301's issue). Added **task 12** (post the hand-off, restore the stash), a
  fail-fast line-budget check at the end of task 3, and a 13-row **RISK REGISTER** with a residual per row.
  Tasks 0, 9 and 11 hardened: the stash-before-switch that the dirty `gen-decisions.mjs` needs, the brief
  `.html` added to the staging list, and `ba.md` pinned as the ledger with its out-of-repo writes named.
- 2026-09-17 — task 12 split: the #301 hand-off comment stays at 12, and the stash restore becomes an
  independent **task 13** with the branch switch made explicit (a blind `git stash pop` on the #298 branch
  would have applied #292's line to the wrong branch). Register annotated with which four rows change the
  implementer's behaviour; the brief's phase table given its "after" row.
- 2026-09-17 — **plan error (pre-flight re-run at implementation): P1's line figures are stale and R2's
  expectation INVERTS.** P1 and task 9 were measured on `0e27afb`; `origin/main` has since moved to
  `d3cc161` (three commits: the six stranded agent reviews + group 21's header figure, the Polaris avatar
  port, #376's plan). Re-measured on `d3cc161` with the generator's own three regexes:
  | group | plan said | observed on `d3cc161` | headroom up |
  |---|---|---|---|
  | runtime | 77 files / 30,632 / 30,600, **18 up** | **76 files / 30,580 / 30,600** | **69** |
  | pages | not mentioned | 17 files / 5,244 / 5,200 | **5** |
  | generators | 2,667 / 2,700 | 20 files / 2,667 / 2,700 | 82 |
  | total | 38,543 / 38,500, **7 up** | **113 files / 38,491 / 38,500** | **58** |
  Consequences: (a) **R2 flips** — `system/loc-summary.json` is now expected **UNCHANGED**, not expected to
  move to 38,600, so at task 9 a dirty `loc-summary.json` means something unexpected entered the index and
  is investigated rather than committed as expected churn; (b) R1's runtime headroom is 69 lines, not 18, so
  task 3's fail-fast budget check is near-vacuous and is **not** a substitute for running the REDDENS
  mutations; (c) the `pages` group — which the plan never mentions — has **5** lines of headroom and this PR
  stages a new tracked `.html`, so task 9's `gen-loc-summary` output is read for `pages` too, empirically,
  rather than reasoned about from the regex; (d) every figure in the report and the PR body is 76/30,580,
  because the plan's 77/30,632 does not survive re-derivation.
  Task 9's positive-control one-liner therefore prints `runtime files 76 lines 30580 rounded 30600` on an
  unmodified `d3cc161`, not `77`/`30632`.
- 2026-09-17 — **task 11 addendum**: task 0's stash parks #292's `flagship: meta.flagship ?? null` in
  `agent-layer/gen-decisions.mjs`. If a sibling session already ran `build.mjs` with that line present, the
  jobs folder's `decisions.json` carries a `flagship` key and this task's run strips it — a real diff that is
  not this PR's change. Capture the jobs-folder git state BEFORE the run so a non-no-op is explainable.
