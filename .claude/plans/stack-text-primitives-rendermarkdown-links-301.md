# Feature: `stack` + `text` through the full chain, and `renderMarkdown` links

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The first two of epic #295's five new generic primitives land as ordinary catalog components through the
full admission chain — spec → `components.css` block → `agentic-renderer.mjs` template → gates →
regenerated pack — plus the one renderer extension `text` needs (links in the shared markdown-subset
renderer). `stack` is the layout box every composed screen sits inside; `text` is the one text part, its
size chosen by a `role` off the type scale rather than by free styling. Together they are what #302's
substrate-swap spine composes: a frame holding a `stack` with a `text`, a `text-field` and a
`primary-button`.

This is also the **first real proof of #298's projection**: no committed spec declares
`childrenCardinality` yet, so `gen-vocabulary`'s conditional spread has never run against a true input,
and the owner measured that renaming the projected key leaves all 34 build-checks groups green.

## User Story

As the owner composing a product's screens on the canvas
I want a layout box and a text part that are full members of the vocabulary
So that a screen can be composed from generic primitives instead of a hand-written component, and the
agentic renderer still refuses everything outside the vocabulary.

## Problem Statement

The vocabulary has 21 components and **no way to arrange them**. Every composition today is a flat list or
a single-child card; there is no container that takes N children, and no text part at all — a screen title
is either a `vd-screen-header` (Verdant-specific chrome) or nothing. #298 grew the grammar to allow
`childrenCardinality: "many"` but shipped it with no spec declaring it, so the grammar is present and
unexercised. Without both, #302's spine cannot be composed and the epic's "ten generic primitives compose
any screen" claim has no floor.

## Solution Statement

Two specs, two token-only CSS blocks, two templates, and the four projection/gate fixes the owner's
hand-off comments name. `stack` declares `childrenCardinality: "many"` (the grammar's first real user) and
carries its layout as `data-*` attributes the CSS block binds to spacing tokens — never an inline style,
never a literal. `text` carries a `role` enum that picks one type token, and its content renders through
the **shared** `renderMarkdown` in `system/handoff-viewer.mjs`, extended once to render links behind a
scheme allowlist. Every new assertion carries the mutation that reddens it.

## Out of Scope / Non-Goals

- **Not included: `--spacing-none: 0`.** S2 named it as the contract's only gap, and this ticket's
  standing-rule row makes the call. The plan **declines** it — see D2 and its two tripwires. Deferred to
  #302 (the override format that must zero a base value) or #304 (the importer).
- **Not included: a main-axis distribution prop** (`justify-content`). `align` is the cross axis only; a
  stack packs from the start. S2's IR carries `{main, cross}`; #304 decides what to do with `main`.
- **Not included: a fixed-px `size`.** S2's leg-2 literal (`s(360,hug)`) stays refused by the enum, which
  is the answer S2 asked #301 for. Recorded in the spec, not implemented.
- **Not included: `list`, `icon`, `choice`** (#303, #305, #309) — and no ordered lists, headings or
  blockquotes in `renderMarkdown`. Links are the one census extension.
- **Not changing:** the Verdant protos, the pack's existing 21 entries, `/factory`, `instance.html`,
  `studio.html`, `templates.admitted.mjs` (that registry is #313's), any existing spec's `children` list.
- **Not adding a new `system/*.mjs` module.** `renderMarkdown` is imported from `handoff-viewer.mjs`; the
  ticket's new-file row does not apply and no file is added. (See NOTES for the extraction alternative.)

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (low algorithmic risk; the risk is entirely in the gate/regenerator cascade)
**Primary Systems Affected**: `system/specs/` · `system/components.css` · `system/agentic-renderer.mjs` · `system/handoff-viewer.mjs` · `system/catalog.mjs` · `system/palette.mjs` · `tooling/build-checks.mjs` · `handoff/verdant/*` (generated) · VR baselines ×4
**Dependencies**: none new. Zero-dep Node ESM + vanilla shipped pages, unchanged.

## Related Work

**Implements**: [#301](https://github.com/linardsb/ux-factory/issues/301) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.architecture.md`

**Back-references**:

- `.claude/plans/canvas-grammar-children-many.md` (#298) — the grammar this ticket is the first user of.
- `.claude/plans/canvas-spike-s2/README.md` (#299) — the verdict that shapes `stack`'s CSS block and
  names `--spacing-none`. **Read § "The decision, and its condition" before writing the block.**
- `.claude/plans/catalog-ten-components-full-chain-220.md` (#220) — the ten-component admission precedent:
  the same chain, the same histogram tripwire, the same baseline cascade.

**Forward-references**:

- **#302 (the swap PR) consumes the spine composition**, and #301 is one of its four stated preconditions
  ("the grammar change (#298) and `stack` + `text` (#301) are merged"). It builds the spine as real ops
  through `screen.compose`, not by importing a fixture — see Q1, which is now settled from #302's body.
- #303 / #305 / #309 add the remaining primitives. Under the narrowed D5 they are **free of this ticket**:
  `stack.children` carries no identity gate, so none of them is forced to edit `stack.md`. Widening it is
  the flow's call, when a flow needs it.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/card.md` (whole file) — Why: the container spec precedent. Head JSON shape, the four
  `## ` sections in order, and the voice. `text-field.md` is the second model (an input, `ds-` class).
- `system/agentic-renderer.mjs:60-124` — Why: `validateComposition`'s required/type/enum and children
  branches. This is the "visibly refuses a missing/unknown role" mechanism — no new code needed.
- `system/agentic-renderer.mjs:395-420` (`card`, `empty-state`) — Why: the template idiom **and the trap**:
  both pass `[]` as the child's children. `stack` must pass `child.children ?? []`. See D8.
- `system/agentic-renderer.mjs:125-136` (`el`) — Why: `if (v === false || v == null) continue;` is what
  makes an absent `gap`/`pad` emit no attribute at all. That is S2's "absence suffices", for free.
- `system/handoff-viewer.mjs:129-147` (`inlineInto`) — Why: the inline split you extend for links.
- `system/handoff-viewer.mjs:157-226` (`renderMarkdown`) — Why: the line walker. Detection order
  fence → list → table → paragraph; do not reorder.
- `system/handoff-viewer.mjs:19-24` — Why: the census comment. It says links have census 0; it must now
  say links render and why (the one extension).
- `system/handoff-viewer.mjs:75-95` (the `head` explicit PICK) — Why: owner fix #1 goes beside the
  `example` spread, with the same conditional shape.
- `system/instance.mjs:219-226` — Why: **the href allowlist precedent**, copied exactly:
  `new URL(href, document.baseURI).protocol` must be `http:` or `https:`.
- `system/catalog.mjs:428-431` — Why: owner fix #2, the `Children:` meta line.
- `system/catalog.mjs:85-96` (`headingTags`) — Why: the precedent for a tiny exported pure helper that a
  Node gate can drive. `childrenLine` mirrors it.
- `system/catalog.mjs:8-14` — Why: the header sentence naming the module's four exports. A fifth export
  means editing that sentence.
- `system/catalog.mjs:300-310, 470` — Why: the playground reads `example` props only, never children.
  `stack`'s playground is an empty box, honestly.
- `system/palette.mjs:35-41` (`CATALOG_COMPONENTS`) — Why: a deliberate static second copy, pinned by
  group 21.2 against the generated vocabulary. Edit one side alone → red.
- `system/components.css:1527, 2113, 2325, 2352` — Why: the `ds-*` block-header convention and four
  token-only blocks to mirror. `2412` is where the `ds-` run ends.
- `system/components.css:2439` (`.vd-stack`) — Why: **the landmine.** One character from `ds-stack`, and
  it carries the default `gap` S2's condition forbids. Do not edit it; do not confuse them.
- `system/tokens.contract.css:54-62, 95-102` — Why: the spacing scale (`xs`…`4xl`, **no zero step**) and
  the type scale you map `role` onto.
- `tooling/build-checks.mjs:596-681` (group 3) — Why: `hasTemplate` over the whole vocabulary, and #298's
  synthetic cardinality cases. AC #2's real case goes here (D1).
- `tooling/build-checks.mjs:3850-3870` (group 18B) — Why: the `example` both-directions assertion and its
  stripped-synthetic-pack technique, which the `childrenCardinality` one mirrors.
- `tooling/build-checks.mjs:3905-3985` (group 18C) — Why: the parser-refusal fixture idiom (real files in
  a tmpdir, behind a positive control) — read it before adding any fixture-driven case.
- `tooling/build-checks.mjs:4426-4433` (group 21.4) — Why: **`ok(withWrapper === 3 && withoutWrapper === 18)`.
  A hard pin that WILL go red.** Its comment states the tripwire is deliberate and must move on purpose.
- `tooling/build-checks.mjs:4780-4790` (group 23) — Why: `emitsClass` — the regex that forces each
  template's root class to be a literal `class: "ds-stack"` / `class: "ds-text"`.
- `tooling/build-checks.mjs:2005-2032` — Why: the only `globalThis.document` stub precedent (set, use,
  `delete`). Your DOM stub follows it.
- `agent-layer/gen-vocabulary.mjs:53-100` — Why: the conditional projection this ticket first exercises,
  and `validateExamples`, which feeds `{name, props: example}` with **no children array** (why AC #2
  cannot live in group 18).
- `agent-layer/gen-system-graph.mjs:62-95` — Why: the block-header regex (one line, `/* ----- X ----- */`),
  the `slug(label)` id, and `if (!used.size) return;` — a block with no `var()` is dropped and group 18's
  `c.consumer !== null` then goes red.
- `agent-layer/gen-loc-summary.mjs:22-50` — Why: the `runtime` group regex and `round100`. It reads the
  git **index** (`git show :<path>`), so `--check` before `git add` is a false negative.
- `tooling/token-lint.mjs:68-86` (`checkOrphans`) — Why: a contract token with no `var()` consumer is a
  hard red. This is what makes `--spacing-none` a coupled decision, not a free one.
- `tooling/visual-regression/visual.spec.mjs:114-125` — Why: `/components`'s `timeout`/`shotTimeout` and
  the "20 components / ~44k px / ~225 MB" note that this ticket makes stale.
- `.claude/plans/canvas-spike-s2/README.md` §"The decision, and its condition" and §"Adjacent
  observations" — Why: the condition `ds-stack` must satisfy, its two tripwires, and the `.vd-stack`
  landmine. **This is the governing document for `stack`'s CSS block.**
- `.claude/references/kb-format.md:23-33` — Why: the ComponentSpec head schema, including #298's
  `childrenCardinality` entry. **No format change is needed here** — confirm that and say so.
- `docs/epics/canvas-design-import.architecture.md:264-268, 357-365` — Why: the two schema facts and the
  standing-rule table this ticket's per-ticket context applies.

### New Files to Create

- `system/specs/stack.md` — the layout box's ComponentSpec (the first spec to declare `childrenCardinality`).
- `system/specs/text.md` — the text part's ComponentSpec.

**No new `system/*.mjs`, `agent-layer/*.mjs` or `tooling/*` file.** The epic's new-file row
(`gen-loc-summary` + both approach baselines *because a file was added*) therefore does **not** apply on
its own terms — but see F1: the row fires anyway, for a different reason.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN — `align-items`](https://developer.mozilla.org/en-US/docs/Web/CSS/align-items) — the four values
  `stack`'s `align` enum maps to. Why: `start`/`end` vs `flex-start`/`flex-end` differ in support; use the
  `flex-*` forms.
- [MDN — `flex` shorthand](https://developer.mozilla.org/en-US/docs/Web/CSS/flex#values) — why
  `flex: 1 1 0%` (fill) and `flex: 0 0 auto` (hug) are the two you want, and why `min-width: 0` is needed
  on a flex item that holds wide content.
- [MDN — `URL()` constructor](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) — base-relative
  resolution and the `protocol` property the href allowlist reads.
- [WCAG 2.2 SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) — why a
  link inside body text must carry an underline, not colour alone. Cite this in `text.md`'s Accessibility
  section.

### Patterns to Follow

**Spec head (`system/specs/*.md`)** — a leading ```json fence, then exactly four `## ` sections in order
(Usage · States · Data binding · Accessibility). From `system/specs/card.md:1-16`:

```json
{
  "component": "card",
  "status": "shipped",
  "class": "ds-card",
  "contract": null,
  "props": { "title": { "type": "string", "required": true, "description": "…" } },
  "tokens": ["--color-bg", "--radius-md"],
  "states": ["default"],
  "children": ["metric-tile", "list-row", "sequence-step"],
  "example": { "title": "This week" }
}
```

`component` must equal the filename stem. `tokens` must be the tokens the CSS block **actually**
references (group 18 joins them 1:1 against `system-graph.json` and a null group is a red).

**CSS block header** — one line, exactly this shape or `gen-system-graph` throws by line number
(`agent-layer/gen-system-graph.mjs:73-79`):

```css
/* ---------- ds-card (system/specs/card.md) — cross-scenario library primitive ---------- */
```

**Template** — `system/agentic-renderer.mjs:395-406`. `el(tag, attrs, ...children)`; text via the `text`
attr (→ `textContent`); a root class that is a **string literal** in the source.

**Gate assertion** — `ok(<boolean>, "<message naming the offending thing>")`, and every new check is
followed by the mutation that makes it fail. `deep(x)` is the module-level `JSON.stringify` comparison
helper used across groups 21 and 29 — confirm it is in scope where you use it.

---

## IMPLEMENTATION PLAN

### Phase 0: Branch

**Depends on:** nothing.

The working tree is on `feature/canvas-spike-s2-blueprint-stack-299`, which is 4 commits ahead of and 2
behind `origin/main` (observed) — #299 landed **squash-merged** as PR #428. Branch fresh.

### Phase 1: The renderer extension — links in `renderMarkdown`

**Independent of:** Phases 2–4. It touches only `system/handoff-viewer.mjs` and the two style homes, and
nothing about it depends on either spec existing.

### Phase 2: The two specs

**Depends on:** nothing. But the tree is RED between here and Phase 4 — group 3 asserts every vocabulary
entry has a template. Do not run gates mid-phase and conclude anything.

### Phase 3: The two CSS blocks

**Depends on:** Phase 2 (block headers cite the spec paths).

### Phase 4: The two templates

**Depends on:** Phases 1–3. The `text` template imports `renderMarkdown`; the classes must exist.

### Phase 5: The two projection fixes + the palette copy

**Depends on:** Phase 2 (the specs supply the real inputs these fixes project).

### Phase 6: Regenerate

**Depends on:** Phases 1–5, all staged.

### Phase 7: Gates, new assertions, and the stale-count sweep

**Depends on:** Phase 6.

### Phase 8: Baselines (operator machine)

**Depends on:** Phase 7 green.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

### 1 · CREATE the branch off fresh `origin/main`

- **IMPLEMENT**: `git fetch origin main && git switch -c feature/stack-text-primitives-301 origin/main`
- **GOTCHA**: The current branch's 4 local commits are #299's, already landed squashed as 6687f8e. Do not
  branch off HEAD. **Shared worktree** (memory `shared-worktree-parallel-sessions`): verify the branch
  right before every commit and stage by explicit path.
- **GOTCHA**: `gh pr list --state open` returned `[]` (observed 2026-09-18) — the `/components` collision
  rule is clear. Re-check before pushing.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD && git status --short | grep -v '^??' | wc -l` → the
  branch name and `0`
- **SATISFIES**: preconditions
- **REGENERATES**: none

### 2 · ADD the href allowlist + link branch to `system/handoff-viewer.mjs`

- **IMPLEMENT**: A private `safeHref(raw)` beside `inlineInto`, then extend `inlineInto`'s split regex and
  add the link branch.

  ```js
  // Links are the ONE extension to the census (epic #295 G21, ticket #301) and the only construct
  // here that carries an attacker-controlled ATTRIBUTE rather than text — ds-text's content is
  // agent-supplied wherever a composition renders. The scheme allowlist mirrors instance.mjs:220-222:
  // resolve against the document base and accept http/https only, so javascript:, data:, vbscript:
  // and anything unresolvable fall through to their own literal source text rather than becoming a
  // link. Site-relative hrefs resolve to the page's own scheme and pass.
  function safeHref(raw) {
    try {
      const p = new URL(raw, document.baseURI).protocol;
      return p === "http:" || p === "https:" ? raw : null;
    } catch { return null; }
  }
  ```

  In `inlineInto`, the split becomes
  `/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]\n]+\]\([^)\s]+\))/` and the new branch (placed **after** the bold and
  code branches, before the text fallback) is:

  ```js
  else if (part.startsWith("[")) {
    const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    const href = m && safeHref(m[2]);
    if (href) node.appendChild(el("a", { class: "hv-link", href, rel: "noopener noreferrer", text: m[1] }));
    else node.appendChild(document.createTextNode(part)); // refused scheme → its own source text, literal
  }
  ```
- **PATTERN**: `system/instance.mjs:219-226` (the allowlist), `system/handoff-viewer.mjs:129-147` (the split).
- **IMPORTS**: none — `el` and `document` are already in scope.
- **GOTCHA**: The regex requires `](` **and** a closing `)`, so a bare `[` never splits and stays literal.
  73 bare `[` exist across the specs and **zero** `](` pairs (observed: `grep -rcoE '\[[^]]+\]\([^)]+\)'
  system/specs/*.md` → no matches) — so enabling links changes no existing rendered prose. Verify that
  again after you write the specs; if you put a link in your own spec prose, it will render.
- **GOTCHA**: Do not touch the line-walker's detection order, and do not add headings, blockquotes or
  ordered lists. AC #3's "census bound is unchanged" means exactly that.
- **VALIDATE**: `node -e 'import("./system/handoff-viewer.mjs").then(m=>console.log(Object.keys(m)))'`
  → `[ 'prepareHandoff', 'renderHandoffViewer', 'renderMarkdown' ]` (observed on the pre-change tree;
  must still hold — it is what keeps `gen-vocabulary` Node-safe after task 12 adds the import edge)
- **REDDENS**: delete the `if (href)` guard so the branch always builds an `<a>` → the
  `javascript:` case in task 20 fails with `expected literal text for a refused scheme, got <a>`.
- **SATISFIES**: AC #3
- **REGENERATES**: none directly (`loc-summary` runtime group — see task 24)

### 3 · UPDATE `system/handoff-viewer.mjs`'s census comment

- **IMPLEMENT**: Lines 19-24 currently say `headings/links/blockquotes/ordered-lists have census 0`.
  Rewrite so links are named as the one extension, with its reason and its allowlist, and the other three
  stay out at census 0.
- **GOTCHA**: `.claude/references/gates.md` may carry a copy of this claim (memory
  `gate-prose-has-three-copies`). `grep -rn "census" .claude/references/ tooling/ system/` before you
  decide this is the only place the sentence lives.
- **VALIDATE**: `grep -n "census 0" system/handoff-viewer.mjs` → links no longer listed
- **SATISFIES**: AC #3
- **REGENERATES**: none

### 4 · ADD `.hv-link` to `system/catalog.css`

- **IMPLEMENT**: One rule beside the other `hv-*` rules (`system/catalog.css:154-173`), token-only, with an
  underline (SC 1.4.1 — colour alone is not enough).
- **GOTCHA**: `catalog.css` is linked by `components.html` but **not** by `studio.html` (observed:
  `grep -n stylesheet studio.html` lists contract → neutral → components → studio only). That is fine —
  `ds-text`'s own scoped rules live in `components.css`, which every page links.
- **VALIDATE**: `grep -n "hv-link" system/catalog.css` → one rule
- **SATISFIES**: AC #3
- **REGENERATES**: none (`catalog.css` is in the `runtime` loc group — see task 24)

### 5 · ADD `.hv-link` to `handoff.html`'s page `<style>`

- **IMPLEMENT**: The same rule, in `handoff.html`'s own copy of the `hv-*` set.
- **GOTCHA**: There are exactly **two** style homes for `hv-*` (observed: `handoff.html` and
  `system/catalog.css` — `system/handoff-viewer.mjs` is the emitter, not a home). Do not invent a third.
- **GOTCHA (F10)**: the `pages` loc group is at **5244 raw, 6 lines from flipping to 5300** (observed
  against `origin/main`). A rule of ≥6 lines flips it. That costs a `gen-loc-summary` regen only —
  `approach.html` renders the **runtime** group, not `pages` — but the regen is mandatory or CI `verify`
  goes red. Keep the rule to 2–3 lines and check the number anyway in task 24.
- **GOTCHA**: `handoff.html` has **no VR baseline** (observed: the baselines dir holds 404, approach,
  build, components, contact, factory, index, proto-fieldwork, proto-verdant, roundtrip, work).
- **VALIDATE**: `grep -n "hv-link" handoff.html` → one rule
- **SATISFIES**: AC #3
- **REGENERATES**: `system/loc-summary.json` (conditionally — task 24)

### 6 · CREATE `system/specs/stack.md`

- **IMPLEMENT**: The head, then the four prose sections.

  ```json
  {
    "component": "stack",
    "status": "shipped",
    "class": "ds-stack",
    "contract": null,
    "props": {
      "direction": { "type": "string", "required": true, "enum": ["row", "column"],
        "description": "which way the children run — the one thing a layout box must state, never defaulted" },
      "gap": { "type": "string", "required": false, "enum": ["xs","sm","md","lg","xl","2xl","3xl","4xl"],
        "description": "the space BETWEEN children, one step of the spacing scale; absent declares none" },
      "pad": { "type": "string", "required": false, "enum": ["xs","sm","md","lg","xl","2xl","3xl","4xl"],
        "description": "the space INSIDE the box on all four sides; absent declares none" },
      "align": { "type": "string", "required": false, "enum": ["start","center","end","stretch"],
        "description": "how children sit on the CROSS axis; absent leaves the flex default" },
      "size": { "type": "string", "required": false, "enum": ["fill","hug"],
        "description": "how this box sizes itself inside a parent stack — fill takes the free space, hug takes its content" }
    },
    "tokens": ["--spacing-xs","--spacing-sm","--spacing-md","--spacing-lg","--spacing-xl","--spacing-2xl","--spacing-3xl","--spacing-4xl"],
    "states": ["default"],
    "children": [ … every vocabulary component, alphabetical, including "stack" and "text" … ],
    "childrenCardinality": "many",
    "example": { "direction": "column", "gap": "sm", "pad": "md" }
  }
  ```

  The `children` list (D5) is **the epic's own G24 generic set**, `stack` included — ten names,
  alphabetical: `card, ghost-button, modal-dialog, nav-tabs, primary-button, screen-header,
  select-field, stack, text, text-field`. That is G24 read literally (button x2 . card . dialog .
  nav x2 . field x2 . the two new ones), it covers #302's spine, and it keeps the list the size every
  other committed `children` list is (1-3 names; `card.md`'s own prose argues *against* breadth).
  Widening is one line in this file whenever a flow needs it; see Q2.
  One name will look wrong and is not: `screen-header` carries a `vd-` class (Verdant-scenario), yet G24
  names it as half of the generic "nav" primitive. The class prefix records who authored it; G24 records
  what it is. Say that in the spec prose so the next reader does not "fix" it out of the list.

  The prose must carry, in its own words: the **S2 condition** (no default gap, no default padding, and
  why); that `size` deliberately has no fixed-px case, which is S2's leg-2 question answered; that `align`
  is the cross axis only; that `stack` nests (the reason it lists itself); and that the `children` list is
  G24's generic set rather than the whole vocabulary — a deliberate starting width, widened by the flow
  that needs it rather than up front.
- **PATTERN**: `system/specs/card.md` — head shape, section order, voice.
- **GOTCHA**: `component` must equal the filename stem or `parseComponentSpec` throws.
- **GOTCHA**: `childrenCardinality` on an entry whose `children` is `[]` is a parse error
  (`agent-layer/lib.mjs:111-116`). The 23-name list is also what stops that.
- **GOTCHA**: `example` carries **props only** — `validateExamples` feeds `{name, props: example}` with no
  children array (`agent-layer/gen-vocabulary.mjs:41`). `stack`'s playground on `/components` is therefore
  an honestly empty 16px-padded box. That is accepted, not a defect; AC #2's composed proof lives in
  group 3 instead.
- **VALIDATE** (expected, after task 8): `node agent-layer/gen-vocabulary.mjs` → `vocabulary ✓  23 components`
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: `handoff/verdant/*` (task 22), `system/system-graph.json` (task 22)

### 7 · CREATE `system/specs/text.md`

- **IMPLEMENT**:

  ```json
  {
    "component": "text",
    "status": "shipped",
    "class": "ds-text",
    "contract": null,
    "props": {
      "role": { "type": "string", "required": true, "enum": ["display","heading","body","caption"],
        "description": "which step of the type scale this text is — the ONLY size decision; there is no font-size prop" },
      "content": { "type": "string", "required": true,
        "description": "the text, carrying the shared inline subset: **bold**, `code`, [links](https://…), soft breaks and `- ` bullet lists" }
    },
    "tokens": ["--color-fg","--color-fg-muted","--color-bg-surface","--color-accent","--font-display","--font-mono","--type-display","--type-h2","--type-body","--type-caption","--radius-sm","--spacing-xs","--spacing-sm","--spacing-lg"],
    "states": ["default"],
    "children": [],
    "example": { "role": "heading", "content": "Send a payment" }
  }
  ```
- **GOTCHA**: `tokens` must be **exactly** what the task-9 block references. Write the block first, then
  derive this array from it with
  `awk '/ds-text \(system/,/^\/\* -----/' system/components.css | grep -o 'var(--[a-z0-9-]*' | sort -u`.
  Group 18 joins each name against `system-graph.json` and a null group is a red naming the token.
- **SETTLED**: `--color-accent` on `--color-bg` **is** a declared AA pair —
  `system/derive.rules.mjs` `wcagPairs`: `{ fg: "color-accent", bg: "color-bg", min: 4.5, usage: "accent
  text / links (.amber) on the page ground" }` (observed). `text.md`'s Accessibility section may claim it
  in `card.md`'s exact voice. The underline is still required, for SC 1.4.1 (colour alone), not for
  contrast — say both, and say which does which.
- **VALIDATE** (expected): included in task 6's `23 components`
- **SATISFIES**: AC #1
- **REGENERATES**: `handoff/verdant/*`, `system/system-graph.json`

### 8 · ADD the `ds-stack` block to `system/components.css`

- **IMPLEMENT**: Insert **after** the `ds-modal-dialog` block and **before**
  `/* ---------- Verdant screen scaffolding … ---------- */` (line 2412 on `origin/main`). Header:
  `/* ---------- ds-stack (system/specs/stack.md) — cross-scenario library primitive ---------- */`

  ```css
  .ds-stack { display: flex; min-width: 0; }
  .ds-stack[data-direction="row"]    { flex-direction: row; }
  .ds-stack[data-direction="column"] { flex-direction: column; }
  .ds-stack[data-gap="xs"] { gap: var(--spacing-xs); }   /* … through 4xl … */
  .ds-stack[data-pad="xs"] { padding: var(--spacing-xs); } /* … through 4xl … */
  .ds-stack[data-align="start"]   { align-items: flex-start; }
  .ds-stack[data-align="center"]  { align-items: center; }
  .ds-stack[data-align="end"]     { align-items: flex-end; }
  .ds-stack[data-align="stretch"] { align-items: stretch; }
  .ds-stack[data-size="fill"] { flex: 1 1 0%; align-self: stretch; }
  .ds-stack[data-size="hug"]  { flex: 0 0 auto; align-self: flex-start; }
  ```

  Above the rules, a comment carrying S2's condition verbatim in intent: the **bare** class declares no
  `gap` and no `padding`, deliberately, because S2's "absence suffices" verdict holds only while it does —
  a default here silently overrides a designer's explicit `$spacing.none`. Name the two tripwires (a
  default arriving here; #302's override format needing to zero a base value) and say the answer then is
  `--spacing-none` in the contract, not a default here. Name `.vd-stack` as the unrelated, similarly-named
  block that **does** carry a default gap.
- **PATTERN**: `system/components.css:2113` (`ds-text-field`) for block shape and token-only discipline.
- **GOTCHA (F8)**: `.vd-stack` at `system/components.css:2439` already has `gap: var(--spacing-sm)`. It is
  Verdant screen scaffolding, not a spec'd component, and is **not** in scope. Do not "fix" it.
- **GOTCHA (F9)**: `system/annotated-source.json` pins `btn-primary-tokens` at
  `system/components.css:176-181` by line number. Appending at ~2412 does not move it; inserting anything
  **above** line 176 would, and `drift-check` would go red.
- **GOTCHA**: a block referencing **no** `var()` is dropped by `gen-system-graph`
  (`if (!used.size) return;`) and group 18's `c.consumer !== null` then fails naming the spec. The
  `data-gap`/`data-pad` rules are what keep this block a real consumer — that is not incidental.
- **GOTCHA**: the header must be **one line**, opening `/* -----` and closing `----- */`, or
  `gen-system-graph` throws by line number (`agent-layer/gen-system-graph.mjs:73-79`).
- **VALIDATE**: `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
  (63 is the pre-change count, observed; it must stay 63 — no token is added)
- **REDDENS**: put `gap: var(--spacing-sm)` on the bare `.ds-stack` → the task-19 assertion fails with
  `.ds-stack declares a default gap — S2's condition is broken`.
- **SATISFIES**: AC #1, AC #4
- **REGENERATES**: `system/system-graph.json`, `system/inspect-data.json`, `handoff/verdant/*`

### 9 · ADD the `ds-text` block to `system/components.css`

- **IMPLEMENT**: Directly after the `ds-stack` block. Header:
  `/* ---------- ds-text (system/specs/text.md) — cross-scenario library primitive ---------- */`

  ```css
  .ds-text { color: var(--color-fg); min-width: 0; }
  .ds-text[data-role="display"] { font-family: var(--font-display); font-size: var(--type-display); line-height: 1.05; font-weight: 700; }
  .ds-text[data-role="heading"] { font-family: var(--font-display); font-size: var(--type-h2);      line-height: 1.2;  font-weight: 600; }
  .ds-text[data-role="body"]    { font-size: var(--type-body);    line-height: 1.6; }
  .ds-text[data-role="caption"] { font-size: var(--type-caption); line-height: 1.5; color: var(--color-fg-muted); }
  /* The shared renderMarkdown emits hv-* classes; these scoped rules (0,2,0) win over catalog.css's
     docs-surface copies (0,1,0), and they are why ds-text renders correctly on every page that links
     components.css — /build, the protos and the studio do not link catalog.css. */
  .ds-text .hv-p { font-size: inherit; line-height: inherit; margin: 0; max-width: none; }
  .ds-text .hv-p + .hv-p, .ds-text .hv-list { margin-top: var(--spacing-sm); }
  .ds-text .hv-list { padding-left: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-xs); }
  .ds-text .hv-list li { font-size: inherit; line-height: inherit; }
  .ds-text .hv-inline-code { font-family: var(--font-mono); background: var(--color-bg-surface); border-radius: var(--radius-sm); padding: 0 var(--spacing-xs); }
  .ds-text .hv-link { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
  ```
- **GOTCHA**: D4's mapping is an **unforced call**: `heading → --type-h2` (clamp 24–34px) rather than
  `--type-h3` (20px), so the four roles are visibly distinct. Every *existing* product component uses
  `--type-h3` for its internal title (observed: `screen-header`, `modal-dialog`), and a `text role="heading"`
  therefore will **not** match a card's title. State the reasoning in `text.md`'s States section; see Q3.
- **GOTCHA**: token-only. A literal colour, px font-size or font stack in this block is a bug —
  `--font-mono`, not `ui-monospace, …` (which is what `catalog.css:167` uses, because `catalog.css` is a
  docs surface and not under the token contract).
- **GOTCHA**: `renderMarkdown` also emits `.hv-table` and `.hv-code` for tables and fences. They are
  unlikely inside a `ds-text` but the renderer is shared, not forked — add a minimal scoped rule for each
  so nothing can render unstyled.
- **VALIDATE**: `node tooling/token-lint.mjs` → still `0 undeclared · 0 orphan`
- **SATISFIES**: AC #1, AC #4
- **REGENERATES**: `system/system-graph.json`, `system/inspect-data.json`, `handoff/verdant/*`

### 10 · ADD the `stack` template to `system/agentic-renderer.mjs`

- **IMPLEMENT**: In `TEMPLATES`, beside `card`:

  ```js
  // The layout box (#301, epic #295 G24). Every prop is an ATTRIBUTE, never an inline style: the CSS
  // block owns the token bindings, which is what keeps gen-system-graph able to SEE them and what
  // keeps a composition free of literals. An absent gap/pad emits no attribute at all — el() skips a
  // null/undefined value — which is S2's "absence suffices" verdict for free.
  "stack": (props, kids, bus, path) => {
    const box = el("div", {
      class: "ds-stack",
      "data-direction": props.direction,
      "data-gap": props.gap,
      "data-pad": props.pad,
      "data-align": props.align,
      "data-size": props.size,
    });
    // The child's OWN children are passed through — NOT `[]`. card and empty-state pass `[]` because
    // their grammar stops at one leaf; a stack NESTS, so copying that line would silently drop every
    // grandchild with every gate green.
    kids.forEach((child, i) =>
      box.appendChild(TEMPLATES[child.name](child.props ?? {}, child.children ?? [], bus, `${path}.children[${i}]`)));
    return box;
  },
  ```
- **PATTERN**: `system/agentic-renderer.mjs:399-406` — and read D8: this deliberately diverges from it.
- **GOTCHA (F4)**: group 23's `emitsClass` matches `class: "ds-stack"` or a template literal opening
  `` `ds-stack `` / `` `ds-stack${ ``. A computed class breaks it (`tooling/build-checks.mjs:4780-4783`).
- **GOTCHA**: no `bus` wiring. A stack emits no intent; it is not a control.
- **VALIDATE** (expected, after task 22): `node tooling/build-checks.mjs` → group 3's `hasTemplate` loop
  passes over 23 entries
- **REDDENS**: change `child.children ?? []` to `[]` → the task-18 nesting assertion fails with
  `the inner text did not render — the stack template dropped its grandchildren`.
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: `system/loc-summary.json` (runtime group — task 24)

### 11 · ADD the `text` template to `system/agentic-renderer.mjs`

- **IMPLEMENT**:

  ```js
  // One part, one decision: role picks the type step (G21). The content renders through the SHARED
  // renderMarkdown, never a fork — the same bounded subset the handoff viewer and the catalog use,
  // plus #301's links. The refusal for a missing or unknown role is validateComposition's, before any
  // DOM (required + enum on the head), so this template is only ever reached with a role the CSS has.
  "text": (props) => {
    const node = el("div", { class: "ds-text", "data-role": props.role });
    renderMarkdown(node, props.content);
    return node;
  },
  ```
- **GOTCHA**: `class: "ds-text"` must be a literal (F4). `class: "ds-text-field-input"` elsewhere in this
  file does **not** collide — the regex includes the closing quote.
- **VALIDATE** (expected): part of task 22's `23 components`
- **SATISFIES**: AC #1
- **REGENERATES**: `system/loc-summary.json`

### 12 · ADD the `renderMarkdown` import to `system/agentic-renderer.mjs`

- **IMPLEMENT**: `import { renderMarkdown } from "./handoff-viewer.mjs";` at the top, with a one-line
  comment: the shared renderer, never a fork (G21), and Node-safe because `handoff-viewer.mjs`'s top level
  touches no DOM.
- **GOTCHA (R2)**: `agent-layer/gen-vocabulary.mjs:19` imports this module **under Node**. If the import
  edge is not Node-safe, every generator and half of build-checks dies. Verified pre-change:
  `node -e 'import("./system/handoff-viewer.mjs")…'` resolves (observed). **Re-verify by running the
  generator, not by reading.**
- **GOTCHA**: no cycle — `handoff-viewer.mjs` imports nothing (observed).
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs` → `vocabulary      ✓  23 components (handoff/verdant/vocabulary.json)`
- **SATISFIES**: AC #1
- **REGENERATES**: `handoff/verdant/vocabulary.json`

### 13 · UPDATE the two "twenty-one templates" counts in `system/agentic-renderer.mjs`

- **IMPLEMENT**: `:21` ("The twenty-one templates …") and `:220` ("… the twenty-one specs …") → twenty-three.
- **GOTCHA (F12)**: this is the defect class commit d3cc161 landed a correction for. Sweep, don't spot-fix:
  `grep -rn "twenty-one\|twenty one" system/ tooling/ agent-layer/ *.html`.
- **VALIDATE**: `grep -rn "twenty-one" system/ tooling/ agent-layer/ *.html` → no output
- **SATISFIES**: hygiene
- **REGENERATES**: `system/loc-summary.json`

### 14 · ADD `childrenCardinality` to `prepareHandoff`'s head projection

- **IMPLEMENT**: In `system/handoff-viewer.mjs`'s `head` object, beside the `example` spread:

  ```js
  // childrenCardinality is optional and CONTAINER-only (#298). Same conditional-spread reason as
  // aiPatterns and example: this object is an explicit field PICK, not a spread, so a head key not
  // named here is silently dropped — and stack's "Source (spec head)" JSON would then show a
  // container documented as taking one child (#301).
  ...(c.childrenCardinality ? { childrenCardinality: c.childrenCardinality } : {}),
  ```
- **PATTERN**: the `example` spread two lines above it; the owner's #301 comment gives this line verbatim.
- **GOTCHA**: the source is `c` (the **pack** component), not the vocabulary entry. `gen-handoff` spreads
  `...s.head` into `pack.json`, so the key rides the pack — confirm that in the regenerated `pack.json`
  before trusting the assertion.
- **VALIDATE** (expected, after task 22): `node -e 'const p=require("./handoff/verdant/pack.json");
  console.log(p.components.find(c=>c.component==="stack").childrenCardinality)'` → `many`
- **REDDENS**: delete the spread → task 21's assertion fails with
  `childrenCardinality reached the component but NOT the head projection`.
- **SATISFIES**: AC #1 (the owner's hand-off, seam 1)
- **REGENERATES**: `system/loc-summary.json`

### 15 · EXTRACT and EXPORT `childrenLine(entry)` from `system/catalog.mjs`

- **IMPLEMENT**: A pure helper beside `headingTags`, and rewire the two lines at `:429-431`:

  ```js
  // childrenLine(entry) → the "Children: …" meta line, or null when the entry lists none. The
  // cardinality is part of the sentence: without " (many)" the catalog documents a container as if it
  // took one child (#298's key, #301's first container). Exported and PURE so build-checks can drive
  // it under Node — the DOM half is tooling/catalog-journey.mjs's, headingTags' precedent.
  export function childrenLine(entry) {
    if (!Array.isArray(entry.children) || !entry.children.length) return null;
    return `Children: ${entry.children.join(" · ")}${entry.childrenCardinality === "many" ? " (many)" : ""}`;
  }
  ```
  At the call site: `const kidsLine = childrenLine(entry); if (kidsLine) api.appendChild(el("p", { class: "cat-meta-line", text: kidsLine }));`
- **GOTCHA**: `system/catalog.mjs:13` states the module "adds no … exports … nothing else:
  renderComponentDocs, headingTags, resolveTokenValues and watchPackSwap". That sentence must now name
  five. Edit it in the same task.
- **GOTCHA**: `renderComponentDocs` has **two** mounts — `/components` and `system/studio-docs.mjs:311`.
  One edit serves both; `studio.html` has no VR baseline (architecture, observed).
- **SETTLED, not a risk**: `catalog.mjs` is **already imported under Node** by build-checks —
  `tooling/build-checks.mjs:241` reads `import { controlFor, reactSnippet, specPath, tabsFor, WRAPPER_ATTRS }
  from "../system/catalog.mjs";` (observed). Its top level is three imports and no DOM touch. Add
  `childrenLine` to **that existing import line**; no new import statement, no fallback path.
- **VALIDATE**: `node -e 'import("./system/catalog.mjs").then(m=>console.log(typeof m.childrenLine))'` → `function`
- **REDDENS**: drop the ` (many)` suffix → task 21's positive assertion fails naming `stack`.
- **SATISFIES**: AC #1 (the owner's hand-off, seam 2), AC #4
- **REGENERATES**: `system/loc-summary.json`; `/components` baselines (the line changes on `stack`)

### 16 · ADD `"stack"` and `"text"` to `CATALOG_COMPONENTS` in `system/palette.mjs`

- **IMPLEMENT**: Insert both in the existing alphabetical order (`… sequence-step, stack, stat-tile,
  status-chip, text, text-field, toggle-switch`).
- **GOTCHA (F3)**: group 21.2 asserts set identity against the generated vocabulary
  (`tooling/build-checks.mjs:4378`). Editing either side alone is a red. The list is deliberately static
  because the palette memoizes at first open (#188, memory `palette-memoizes-needs-static-tags`).
- **GOTCHA**: two new ⌘K commands appear on every shipped page — the palette is closed at rest, so no
  baseline moves from this.
- **VALIDATE** (expected, after task 22): `node tooling/build-checks.mjs` → group 21 green
- **SATISFIES**: AC #4
- **REGENERATES**: `system/loc-summary.json`

### 17 · ADD a DOM stub to `tooling/build-checks.mjs`

- **IMPLEMENT**: A module-level helper, plus a **positive control** that proves the stub is faithful
  before anything is asserted through it.

  ```js
  // A minimal DOM, for the two view-time functions this file drives directly: renderMarkdown (group 18)
  // and renderComposition over a stack/text tree (group 3). Neither reaches beyond createElement /
  // createTextNode / setAttribute / textContent / appendChild, so this stub is a faithful recorder
  // rather than a second DOM — and the positive control below is what says so. The group-10 precedent:
  // set globalThis.document, use it, delete it.
  function domStub(baseURI = "https://example.test/page") { … }
  const textOf = (node) => …;   // depth-first text
  const findAll = (node, tag) => …;
  ```
- **GOTCHA (F5)**: `renderMarkdown` has **zero** gate coverage today (observed: its only callers are
  `handoff-viewer.mjs` itself and `system/catalog.mjs:468`). This stub is genuinely new surface, so the
  positive control is not optional — memory `check-that-cannot-fail`.
- **GOTCHA**: always `delete globalThis.document` in a `finally`, or every later group inherits a fake DOM
  and a module that feature-detects `document` behaves differently (`tooling/build-checks.mjs:2018, 2031`).
- **VALIDATE**: `node tooling/build-checks.mjs` → still `build ✓  all 34 groups pass`
- **REDDENS**: make `createElement` return `{}` → the positive control fails with
  `the DOM stub does not record a tag name — every assertion driven through it is meaningless`.
- **SATISFIES**: AC #2, AC #3
- **REGENERATES**: none

### 18 · ADD the composition cases to build-checks group 3 (AC #2, and AC #1's refusal leg)

- **IMPLEMENT**: After #298's synthetic cardinality block, five assertions:
  1. **The projection, by name** — `VOCAB.components.stack.childrenCardinality === "many"`, with a message
     saying `gen-vocabulary` dropped or misspelled the key. *This is the assertion the owner's comment
     asks for by name: nothing in #298's gate stack can see the projected key's spelling.*
  2. **The spine validates** — `[{name:"stack", props:{direction:"column", gap:"md"}, children:[
     {name:"text", props:{role:"heading", content:"Send a payment"}},
     {name:"text-field", props:{label:"Amount"}},
     {name:"primary-button", props:{label:"Continue"}}]}]` through `validateComposition(VOCAB, …)`
     with no throw.
  3. **It cannot pass vacuously** — the same three children under a vocabulary whose `stack` entry has had
     `childrenCardinality` removed must throw `at most one child (got 3)`.
  4. **The `role` refusals, which AC #1 names and nothing else proves** — `{name:"text", props:{content:"x"}}`
     throws `required prop of text is missing`, and `{name:"text", props:{role:"huge", content:"x"}}` throws
     naming the enum. Both through `validateComposition`, no DOM needed. Assert the **message**, not just
     the throw: a gate that throws with the wrong message is a gate nobody can debug.
  5. **Nesting renders** — under the task-17 stub, `renderComposition(VOCAB, {name:"stack", props:{direction:"column"},
     children:[{name:"stack", props:{direction:"row"}, children:[{name:"text", props:{role:"body", content:"deep"}}]}]}, null)`
     and assert the string `deep` is present in the tree.
- **GOTCHA (F6)**: AC #2 says "group 18". It is **not implementable there** — `validateExamples` feeds
  `validateComposition` a node of shape `{name, props: head.example}` and never a `children` array
  (`agent-layer/gen-vocabulary.mjs:41`), and the owner's comment says so explicitly. Group 3 is the branch
  taken. Log it under AMENDMENTS and restate it in the PR body so the AC list matches what shipped.
- **GOTCHA**: `stack.children` carries **no** identity assertion (Q2). Every other `children` list in the
  repo is ungated spec data, and pinning this one would force #303/#305/#309 to edit `stack.md` — which
  contradicts the epic's "each two-way, additive" sequencing for the remaining primitives.
- **GOTCHA**: confirm `deep` is in scope at group 3 before using it; it is used freely in groups 21 and 29.
- **GOTCHA**: update group 3's `group("composition", …)` header string. Its current text ends with
  *"the projection's first real proof is #301's regenerated vocabulary, and a typo in the key name there
  would be green here"* — that sentence is now **false** and must be rewritten to say the real case landed.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep '^build composition'` → the new header
- **REDDENS**: case 1 — rename the projected key in `gen-vocabulary.mjs:83` to `childrenCardinallity` and
  re-run `node agent-layer/gen-vocabulary.mjs` → `stack's vocabulary entry does not carry
  childrenCardinality: "many"`. **Restore both afterwards.** (The owner measured that this exact mutation
  is green on `main` today.) Case 4 — drop `"required": true` from `role` in `system/specs/text.md` and
  regenerate → the missing-`role` case fails; then drop the `enum` → the unknown-`role` case fails.
  Case 5 — change `child.children ?? []` back to `[]` in the `stack` template (task 10's own REDDENS) →
  the nesting case fails. Restore all of them.
- **SATISFIES**: AC #2, and AC #1's "refuses a missing/unknown `role` visibly" leg
- **REGENERATES**: none

### 19 · ADD the S2 condition as a gate case

- **IMPLEMENT**: In group 3 (beside the other `stack` cases) or group 18, read `system/components.css` as
  text, slice the `ds-stack` block by its header and the next `/* -----`, and assert the **bare**
  `.ds-stack { … }` rule declares neither `gap:` nor `padding:`.
- **GOTCHA**: match the bare rule only. `.ds-stack[data-gap="md"] { gap: … }` must **not** trip it — that
  is the whole design. Slice on `.ds-stack {` … `}` precisely.
- **GOTCHA**: `.vd-stack` is 27 lines away and does carry a default gap (F8). Anchor on `.ds-stack`, and
  make sure your regex cannot match `.vd-stack`.
- **VALIDATE**: `node tooling/build-checks.mjs` → green
- **REDDENS**: add `gap: var(--spacing-sm);` to the bare `.ds-stack` → the case fails naming the property.
  Also run the **inverse** control: temporarily delete the `[data-gap="md"]` rule and confirm the case
  stays **green** — if it goes red, it is matching the attribute rules and tests nothing.
- **SATISFIES**: AC #4, and S2's tripwire 1 made mechanical
- **REGENERATES**: none

### 20 · ADD the `renderMarkdown` link cases to build-checks group 18

- **IMPLEMENT**: Under the task-17 stub:
  - **Positive control first** — `**b**` renders a `strong`, `` `c` `` renders a `code.hv-inline-code`,
    and a `- ` list renders a `ul.hv-list`. If these fail, nothing below means anything.
  - `[a](https://x.test/p)` → one `<a>` with `href === "https://x.test/p"`, text `a`, class `hv-link`,
    `rel === "noopener noreferrer"`.
  - `[a](/handoff/verdant/pack.json)` → a link (site-relative resolves to the base's scheme).
  - `[x](javascript:alert(1))` → **no** `<a>`; the literal source text survives in the output.
  - `[x](data:text/html,<script>)` → same.
  - A bare `[` → literal, no `<a>`. Drive at least one **real committed** spec body through the renderer
    and assert its `<a>` count is 0, so the 73 bare `[` in the specs are exercised rather than described.
  - **The census bound** — a `# heading`, a `> quote` and a `1. ordered` line each still render as a
    paragraph, never as a heading / blockquote / `<ol>`.
- **GOTCHA**: give the stub a `baseURI` of `https://example.test/page` — under a `file:` base every
  site-relative href would be refused and the third case would pass for the wrong reason.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep '^build docs chain'`
- **REDDENS**: (a) delete the link branch → the first case fails `expected an <a>, got text`;
  (b) loosen the split to `/\[[^\]]*\]/` → the bare-`[` case fails; (c) drop `safeHref`'s guard → the
  `javascript:` case fails. Run all three, restore all three.
- **SATISFIES**: AC #3
- **REGENERATES**: none

### 21 · ADD the projection + catalog cases to build-checks group 18 / 21

- **IMPLEMENT**:
  - **Group 18B**, mirroring the `example` pair: over the real pack, the component that declares the key
    has `head.childrenCardinality === "many"`; over a **stripped synthetic pack**
    (`PACK.components.map(({ childrenCardinality, ...rest }) => rest)`), **no** component's head carries the
    key, and the rest of the join is undisturbed.
  - **Group 21**, over `childrenLine`: `stack`'s line ends ` (many)`; `card`'s (a real single-child entry)
    does **not**; a leaf like `avatar` returns `null`. Plus the mutation: an entry identical to `stack`'s
    with the cardinality removed must lose the suffix.
- **GOTCHA**: group 18's header string names what it asserts; add the new clause there too.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`
- **REDDENS**: task 14's and task 15's REDDENS lines are these cases' mutations. Run both.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 22 · RUN the regenerators, in order

- **IMPLEMENT**:
  ```
  node agent-layer/gen-handoff.mjs
  node agent-layer/gen-vocabulary.mjs
  node agent-layer/gen-pack-bundle.mjs
  node agent-layer/gen-system-graph.mjs
  node agent-layer/gen-inspect-data.mjs
  node agent-layer/gen-annotated-source.mjs
  ```
- **GOTCHA**: `gen-handoff` child-process-invokes Style Dictionary and needs
  `tooling/style-dictionary/node_modules` — `npm ci` there on a fresh tree.
- **GOTCHA — the order is load-bearing, and verified.** `gen-pack-bundle` walks the **whole**
  `handoff/verdant` directory and inlines every file it finds (`agent-layer/gen-pack-bundle.mjs:24-44`,
  observed), so it must run **after** both `gen-handoff` and `gen-vocabulary` or it bundles a stale
  `vocabulary.json`. This is `agent-layer/build.mjs`'s own order (handoff → vocabulary → pack-bundle).
  `gen-handoff` does **not** read `system-graph.json` (observed: no match), so the `system/` generators are
  independent of the pack ones — but `gen-system-graph` **must** precede `gen-inspect-data`, which reads
  `system/system-graph.json`. A key in `gen-inspect-data`'s hand-authored role map that names no consumer
  **throws**; a consumer with no key is simply uninstrumented, which is what the two new blocks will be.
- **GOTCHA**: `gen-annotated-source` should be a no-op (its `components.css` anchor is at line 176, far
  above the insertion point). If it drifts, something was inserted above line 176 — find it.
- **GOTCHA (memory `token-change-regen-handoff-pack`)**: merge `origin/main` before regenerating if the
  branch is behind, or the pack goes stale and CI `verify` is red.
- **VALIDATE**: each prints its own `✓` line; then
  `node -e 'const v=require("./handoff/verdant/vocabulary.json");console.log(Object.keys(v.components).length, v.components.stack.childrenCardinality, v.composition.version)'`
  → `23 many 2`
- **SATISFIES**: AC #4
- **REGENERATES**: `handoff/verdant/{pack.json,pack.bundle.json,vocabulary.json,tokens/*,contracts/*,wc/*,figma-import.md}` · `system/system-graph.json` · `system/inspect-data.json`

### 23 · MOVE the wrapper histogram pin and the stale counts

- **IMPLEMENT**:
  - `tooling/build-checks.mjs:4431-4433` — `ok(withWrapper === 3 && withoutWrapper === 18, … pinned 3/18)`
    → `3/20`, and extend the tripwire comment above it with this ticket's move and its honesty note:
    `stack` and `text` ship wrapper-less, so their absent `vd`/`react` tabs are honest.
  - `system/handoff-viewer.mjs:110` — "3 of 10 today; the 7 missing wrappers" is already stale at 21 specs
    and this ticket moves it again. Correct it to the true figure, derived from the regenerated pack.
  - `tooling/visual-regression/visual.spec.mjs:120-123` — "the catalog doubled to 20 components and the
    viewport-sized capture is now ~44k px tall (~225 MB of raster per shot)" → the real figure at 23.
- **GOTCHA (F2)**: `withWrapper === 3 && withoutWrapper === 18` is a **hard** pin that goes red on the
  regenerated pack. Its own comment says to move it on purpose with the honesty note re-checked, never by
  reflex. Derive the new numbers from the artifact, don't type them:
  `node -e 'const p=require("./handoff/verdant/pack.json");const w=new Set(p.portability.webComponents.files);
  const n=p.components.filter(c=>w.has("wc/"+c.class)).length;console.log(n+"/"+(p.components.length-n))'`
- **GOTCHA (F11)**: if `/components` grows ~15% taller, `shotTimeout: 30_000` may no longer fit two
  consecutive stable shots in the pinned container. If the VR run times out in task 26, raise the
  **per-shot budget**, never the diff tolerance (memory `vr-tolerance-hides-text-changes`).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`
- **REDDENS**: leave the pin at `3/18` → group 21 fails with `the wrapper histogram moved — 3 with / 20 without (pinned 3/18)`.
- **SATISFIES**: AC #4, AC #5
- **REGENERATES**: none

### 24 · STAGE, then regenerate `loc-summary`

- **IMPLEMENT**: `git add -A` (by explicit path — shared worktree), then
  `node agent-layer/gen-loc-summary.mjs`, then `git add system/loc-summary.json`.
- **GOTCHA (F1, the plan's largest finding)**: the `runtime` group is at **30585 raw lines on
  `origin/main`, 65 from rounding up to 30700** (observed, arithmetic shown in NOTES). This ticket adds
  well over 65 lines under `system/` (two CSS blocks + two templates + the link branch + three small
  edits), so `linesApprox` **will** flip — and `approach.html:272-279` renders `runtime.files` and
  `runtime.linesApprox`. **The approach baselines churn, ×2.** The ticket's per-ticket context says the
  new-file row does not apply; that is true as stated (no file is added, `files` stays 76) and still
  lands you in the same cascade for a different reason. Total PNGs: **4, not 2.**
- **GOTCHA (memory `loc-summary-counts-tracked-only`)**: `gen-loc-summary` reads the git **index**
  (`git show :<path>`), so running it — or `--check` — before `git add` is a false "no drift".
- **GOTCHA (F10)**: check the `pages` group too — 5244 raw, 6 from flipping. Nothing renders it, so a flip
  costs only this regen.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`,
  then `node -e 'console.log(require("./system/loc-summary.json").groups[0])'` → record the observed
  `linesApprox`. If it is still `30600`, the approach baselines do **not** need regenerating — say so in
  the report with the number.
- **SATISFIES**: AC #4
- **REGENERATES**: `system/loc-summary.json`; conditionally `approach-{neutral,saulera}.png` (task 26)

### 25 · RUN the full CI gate set

- **IMPLEMENT**:
  ```
  node tooling/build-checks.mjs
  node tooling/token-lint.mjs
  node tooling/drift-check.mjs
  ```
- **GOTCHA**: `drift-check` includes a `group-count` step. No group is added here (only cases inside
  existing groups), so 34 stands — if it complains, you added a `group()` call by accident. This also
  means #301 **claims no group number**, so #302's *"group numbers are claimed in merge order … renumber
  on rebase"* rule does not bind this ticket. Say so in the report.
- **GOTCHA (memory `drift-check-mid-merge-false-positive`)**: run it on a clean tree. A generated-file
  conflict resolves by regeneration, never by hand-edit.
- **VALIDATE** (baselines observed on `origin/main` before any change — all three must return to this):
  - `build ✓  all 34 groups pass`
  - `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
  - `drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count`
- **SATISFIES**: AC #4
- **REGENERATES**: none

### 26 · REGENERATE the VR baselines (operator machine)

- **IMPLEMENT**: From a **clean detached worktree under `/Users`**:
  `cd tooling/visual-regression && npm ci && npm run update:docker`. Commit
  `components-{neutral,saulera}.png` and, if task 24 flipped the number,
  `approach-{neutral,saulera}.png`.
- **GOTCHA (memory `vr-gate-reads-working-tree`)**: `update:docker` screenshots the **dirty** tree. Not
  `/private/tmp` — Docker file sharing.
- **GOTCHA (memory `vr-gate-approach-countup-flake`)**: approach's "two consecutive stable screenshots"
  failure is the live `countUp` rAF racing `retries: 0`, not a regression. It fails a *different* pack each
  run. A local Docker pass is not CI green — check `gh pr checks`.
- **GOTCHA (memory `vr-update-skips-subperceptual`)**: `update:docker` will not rewrite a baseline whose
  only change is below pixelmatch's per-pixel threshold. `rm` the PNG to force it.
- **GOTCHA**: no `/factory` churn — `factory.html:396` puts the system graph inside a tab panel that is
  `hidden` at rest and the VR spec never clicks it (observed). The epic's `/factory` collision rule does
  **not** apply to this ticket. Say so in the report.
- **GOTCHA — a second collision rule, and F1 puts this ticket inside it.** #302's per-ticket context reads
  *"nothing else regenerates `/factory`'s **or `approach`'s** baselines while this PR is open"*, and #302's
  own definition of done claims `approach ×2`. F1 means **#301 claims `approach ×2` as well.** The
  sequencing already resolves it — #302 lists #301 among its four preconditions, so #301 must be **merged**
  before #302 opens — but it is only resolved while that order holds. **Do not leave this PR open once
  #302's branch exists**, and say in the report that #301 spent an `approach` regen, because #302's brief
  attributes that churn to its own two new `system/*.mjs` files and does not expect to find the number
  already moved.
- **VALIDATE**: `npm run update:docker` completes; `git status --short tooling/visual-regression/baselines/`
  lists exactly the expected PNGs
- **SATISFIES**: AC #4
- **REGENERATES**: `tooling/visual-regression/baselines/components-{neutral,saulera}.png` (+ approach ×2)

### 27 · RUN `catalog-journey` ×3 engines (operator machine)

- **IMPLEMENT**:
  `node tooling/visual-regression/serve.mjs &` then `node tooling/catalog-journey.mjs all`
- **GOTCHA (memory `stale-serve-wrong-tree`)**: a parallel session's `serve.mjs` can hold 4757 serving
  **its** tree for days. The driver refuses to run unless the served `catalog.mjs` byte-matches — if it
  refuses, use the `PORT`/`BASE` overrides rather than killing someone else's server.
- **GOTCHA (memory `portal-smoke-port-scoped-kill`)**: never `pkill -f 'node server.mjs'`. PID/port only.
- **VALIDATE**: all three engines report pass
- **SATISFIES**: AC #4
- **REGENERATES**: none

### 28 · EYEBALL both components in a real browser

- **IMPLEMENT**: Open `/components#stack` and `/components#text` in Safari and Chrome stable. Check the
  four `text` roles are visibly distinct; check a nested `stack` in the studio's docked docs; check a link
  in `ds-text` content is underlined and follows.
- **GOTCHA (memory `vr-gate-single-engine-blindspot`)**: the pixel gate's bundled Chromium missed a real
  Safari/Chrome-stable grid blowout. New flex layouts get a real-browser look. `min-width: 0` is in both
  blocks for this reason.
- **VALIDATE**: manual; record what you saw in the report
- **SATISFIES**: AC #4

---

## TESTING STRATEGY

There is no test suite, no linter, no type-check in this repo — do not hunt for one. The gates are
`tooling/build-checks.mjs` (34 pure groups, CI), `tooling/token-lint.mjs`, `tooling/drift-check.mjs`, the
Docker pixel gate, and the operator-run journey drivers. `.claude/references/gates.md` says what each one
cannot reach.

### Unit-equivalent (build-checks, CI)

Group 3 — the projected key by name · the spine composition · the vacuity mutation · `stack.children`
identity · nested rendering. Group 18 — `renderMarkdown`'s links, the refused schemes, the literal bare
`[`, the census bound, the head projection both ways. Group 21 — `childrenLine` both ways, the moved
histogram, the palette identity.

### Integration-equivalent

`drift-check` re-runs every generator in check mode — it is the integration test for the whole
spec → vocabulary → pack → graph → inspect-data chain. `catalog-journey` ×3 engines is the running-page
half build-checks structurally cannot reach.

### Edge Cases

1. A bare `[` in spec prose stays literal (73 exist today).
2. `[x](javascript:…)` and `[x](data:…)` render as their own source text, never as a link.
3. A site-relative `[a](/x)` **is** a link.
4. An absent `gap`/`pad` emits no attribute (`el` skips `null`/`undefined`).
5. A `stack` with `children: []` renders an empty box, not a throw.
6. A nested `stack > stack > text` renders the innermost text (the `[]`-vs-`child.children` trap).
7. `text` with an unknown `role` throws from `validateComposition` naming the enum, before any DOM.
8. `text` with no `role` throws `required prop of text is missing`.
9. Four children under `card` still throw `at most one child (got 4)` — #298's rule is untouched.
10. `stack` self-nesting terminates (a composition is a finite tree).

### Proving the checks

Every check above carries its REDDENS mutation in its task. Run each one, observe the named failure, and
restore. The DOM stub carries a positive control **before** any assertion is driven through it — a stub is
a second implementation and can lie. 59 of this repo's 229 process-review findings are "the check skipped
the thing it tested"; **mutate the source and run the function, never grep it** (memory
`check-that-cannot-fail`).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

`node tooling/drift-check.mjs` — its first step `node --check`s every tracked `.mjs`, including anything
parked under `.claude/plans/` (memory `drift-check-syntax-checks-parked-mjs`: park fragments as `.txt`).

### Level 2: The pure gates

```
node tooling/build-checks.mjs      # → build ✓  all 34 groups pass
node tooling/token-lint.mjs        # → token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
```

### Level 3: The generator chain

```
node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && \
node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-system-graph.mjs && \
node agent-layer/gen-inspect-data.mjs && node agent-layer/gen-annotated-source.mjs
git add -A && node agent-layer/gen-loc-summary.mjs && git add system/loc-summary.json
node tooling/drift-check.mjs
```

### Level 4: Manual / running-page

```
node tooling/visual-regression/serve.mjs &
node tooling/catalog-journey.mjs all
cd tooling/visual-regression && npm run update:docker
```
Then open `/components#stack` and `/components#text` in Safari and Chrome stable (task 28).

### Level 5: Optional

`node tooling/build-journey.mjs all` and `node tooling/proto-journey.mjs all` — neither renders `stack` or
`text` today, so both are regression-only. Run them if the `renderMarkdown` import edge worries you.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| VR baseline regen (`npm run update:docker`) | owner's machine — Docker, ~10 min, no spend | **yes** — AC #4 names `/components ×2` | n/a, must run |
| `catalog-journey.mjs all` ×3 engines | operator-run — Playwright out of `visual-regression/node_modules`, no spend | **yes** — AC #4 names it | n/a, must run |
| Real-browser eyeball (Safari + Chrome stable) | owner's hand, ~5 min | no | note it in the report's **Not run** if skipped |

No agent run, no API spend, no credential this machine may not hold.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `system/specs/stack.md` and `system/specs/text.md` exist; two token-only CSS blocks sit
      under the standard one-line header in `components.css`; two templates exist in `TEMPLATES`. `stack`
      renders its children array (including grandchildren); `text` refuses a missing or unknown `role`
      visibly, through `validateComposition`'s existing required/enum branches, before any DOM —
      **both refusals asserted by message in group 3** (task 18 case 4), with the mutation that
      makes each fail.
- [ ] **AC #2 (restated — see AMENDMENTS)** — **build-checks group 3** gains the many-children case over
      the **real regenerated vocabulary**: `stack` holding a `text`, a `text-field` and a `primary-button`
      (#302's exact composition), plus the assertion that `stack`'s entry carries the key spelled
      `childrenCardinality`, plus the mutation proving the case can fail. Group 18 cannot carry this —
      `validateExamples` never passes a `children` array.
- [ ] **AC #3** — `renderMarkdown` renders `[a](https://x)` as an `<a>` and leaves a bare `[` literal, both
      asserted in build-checks; a `javascript:`/`data:` href renders as its own source text; the census
      bound is unchanged (no headings, blockquotes or ordered lists).
- [ ] **AC #4** — the regenerators run and their outputs are committed; **`/components` baselines ×2
      regenerated** (and `approach.html` ×2 if `loc-summary`'s runtime figure flipped — record the observed
      number either way); `catalog-journey` green on three engines; `token-lint` green with no literal in
      either block and no token added.
- [ ] **AC #5** — the Verdant protos, the pack's existing 21 entries and every existing spec are untouched;
      no generic part replaces or duplicates an existing one (G24). Prove it:
      `git diff --stat origin/main -- system/specs/ proto/ | grep -v 'stack.md\|text.md'` → empty.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE observed, not assumed
- [ ] Every REDDENS mutation run, the named failure observed, the mutation restored
- [ ] `build-checks` · `token-lint` · `drift-check` all green on a clean tree
- [ ] `catalog-journey all` green; `/components` eyeballed in Safari and Chrome stable
- [ ] Baselines regenerated and committed — the PNG count stated with its reason
- [ ] The three stale hand-written counts corrected (renderer ×2, handoff-viewer, VR spec)
- [ ] PR body carries `Closes #301` **as a trailer in the body** — a title mentioning `(#301)` closes
      nothing (memory `prs-dont-auto-close-tickets`)
- [ ] Plan, report and review all in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/`)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — SETTLED from #302's ticket body, not assumed.** #302 § Scope reads: *"The spine: one frame at a
  free position holding a `stack` with a `text`, a `text-field` and a `primary-button`"*, built as real
  ops through `screen.compose` into `ops.jsonl` — it reuses the **shape**, never an imported constant. So
  the spine composition in group 3 stays a local literal in `build-checks.mjs` and this ticket exports
  nothing new. If #302 later wants to import it, that is one line added there.
- **Q2 — `stack.children` = G24's generic set, not the whole vocabulary (D5).** *Assumption:* the
  narrower list is the plain reading of a ticket whose scope line is "one testable concern", it covers
  #302's spine, and it leaves #303/#305/#309 genuinely additive — the epic's own sequencing word for them.
  The Verdant-scenario parts (`plant-card`, `stat-tile`, `care-task-row`, `status-chip`, `demo-notice`) and
  the display primitives (`metric-tile`, `list-row`, `sequence-step`, `avatar`, `empty-state`,
  `progress-indicator`, `search-input`, `toggle-switch`) are **out** for now. **Widening is one line in
  `stack.md` plus a regen, and it stays cheap only in that direction** — un-widening after #302 composes
  against a broad list is not. Flag for the owner; do not block.
- **Q3 — `heading → --type-h2` (D4).** *Assumption:* the four roles must be visibly distinct, and
  `--type-h3` (20px) sits too close to `--type-body` (16px). The consequence, stated: every existing
  product component titles itself at `--type-h3` (observed: `screen-header`, `modal-dialog`), so a
  `text role="heading"` will **not** match a card's title. If the owner wants them to match, it is a
  one-token edit in the block plus the `tokens` array.
- **Q4 — `align` is cross-axis only.** S2's IR carries `{main, cross}`; this prop set drops `main`. #304
  (the importer) decides whether that becomes a drop record or a second prop.
- **A1 — no `--spacing-none` (D2).** S2's verdict is "absence suffices, **provided** `ds-stack` declares no
  default gap or padding", and task 19 makes that condition mechanical. Adding the token would also make
  `token-lint`'s ORPHAN leg red unless a `none` enum value referenced it (verified:
  `tooling/token-lint.mjs:68-86` refuses a declared token with no `var()` consumer). S2's tripwire 2 — an
  override format that must zero a base value — is **#302's** to revisit, not this ticket's.
- **A2 — no `kb-format.md` change.** `childrenCardinality` is already documented there (`:27`, from #298)
  and this ticket adds no head key. The ticket lists that file as a seam; confirm and say so.
- **A3 — no new `system/*.mjs`.** `renderMarkdown` is imported from `handoff-viewer.mjs`. See NOTES for
  the extraction alternative and why it was declined.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Everything below was **observed in this session** against `origin/main` (11e1cef) unless marked.

**Gate baselines, driven not read:**
- `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count`
- `node -e 'import("./system/handoff-viewer.mjs")…'` → imports clean under Node, exports
  `prepareHandoff · renderHandoffViewer · renderMarkdown`. **This is what makes R2 safe** — the new import
  edge does not break `gen-vocabulary`.

**F1 — the baseline cascade is 4 PNGs, not 2.** Derived, arithmetic shown:
```
git ls-tree -r --name-only origin/main | grep -E '^system/(wc/)?[^/]+\.(css|mjs|js)$' \
  | while read f; do git show "origin/main:$f" | wc -l; done | awk '{s+=$1+1} END {print s}'
→ 30585        # split("\n").length, so +1 per file, matching gen-loc-summary's own count
round100(30585) = 30600 ✓ matches the committed artifact
next boundary = 30650 → headroom 65 lines
```
This ticket's `system/` diff (two CSS blocks ~45 lines, two templates ~30, the link branch ~15, three small
edits) clears 65 comfortably, and `approach.html:272-279` renders `runtime.files` and `runtime.linesApprox`.
So `approach-{neutral,saulera}.png` churn alongside `components-{neutral,saulera}.png`. The ticket's
per-ticket context says the new-file row does not apply — true on its own terms (`files` stays 76, no file
is added) and it lands in the same cascade anyway. **Changed the plan:** task 24 measures rather than
assumes, and task 26 lists 4 PNGs conditionally.
Also measured: `pages` 5244 raw (6 from flipping, F10) · `generators` 2688 (untouched) · total 38517
(33 from flipping — regen only, nothing renders it).

**F2 — group 21.4's `ok(withWrapper === 3 && withoutWrapper === 18)` is a hard pin that goes red.**
Observed at `tooling/build-checks.mjs:4431`. Its own comment says it was moved `3/7 → 3/17 → 3/18` on
purpose each time. **Added task 23**, with the artifact-derived command so the new figure is not typed.

**F3 — `palette.mjs`'s `CATALOG_COMPONENTS` is a static second copy pinned by identity** at
`tooling/build-checks.mjs:4378`. Editing one side alone is red. **Added task 16.**

**F4 — group 23's `emitsClass`** (`tooling/build-checks.mjs:4780-4783`) requires each pack class to appear
as a source literal `class: "ds-stack"`. **Changed the plan:** both templates use literal root classes and
carry their variation on `data-*`, which is also what D3 needs.

**F5 — `renderMarkdown` has zero gate coverage today.** Its only callers are `handoff-viewer.mjs` itself
and `system/catalog.mjs:468` (observed). AC #3 therefore needs a DOM stub in build-checks — new surface,
so **task 17 carries a positive control**.

**F6 — AC #2 is not implementable as written.** `validateExamples` feeds `validateComposition` a node of
shape `{name, props: head.example}` with no `children` array (`agent-layer/gen-vocabulary.mjs:41`). The
owner's comment says so and names the two branches; **D1 takes group 3** because a case against the real
regenerated vocabulary also closes the gap the owner measured (a typo in the projected key's name is green
on `main` today). Logged under AMENDMENTS.

**F7 — `--spacing-none` is coupled.** `tooling/token-lint.mjs:68-86`'s ORPHAN leg refuses a declared
contract token that no `var()` references. Adding it would force a `none` enum value on `gap`/`pad` that
referenced it. Combined with S2's verdict, **D2 declines it** and makes S2's condition a gate case instead
(task 19).

**F8 — the `.vd-stack` landmine.** `system/components.css:2439` carries `gap: var(--spacing-sm)`, one
character from `ds-stack`, and is Verdant screen scaffolding rather than a spec'd component. S2's review
recorded it as F8. **Written in as a GOTCHA on tasks 8 and 19**, including "make sure your regex cannot
match `.vd-stack`".

**F9 — the annotated-source anchor.** `system/annotated-source.json` pins `btn-primary-tokens` to
`system/components.css:176-181`; the insertion point is ~2412, so nothing moves. Recorded as a GOTCHA so a
future insertion above line 176 is not a surprise red.

**F11 — the VR spec's stale note.** `tooling/visual-regression/visual.spec.mjs:120` says "the catalog
doubled to 20 components … ~44k px tall (~225 MB of raster per shot)". Already stale at 21; 23 makes the
raster ~15% bigger. **Task 23** corrects it and task 26 says to raise the per-shot budget, never the diff
tolerance, if it times out.

**F12 — three more stale hand-written counts**: `system/agentic-renderer.mjs:21` and `:220`
("twenty-one templates" / "twenty-one specs"), `system/handoff-viewer.mjs:110` ("3 of 10 today"). Commit
d3cc161 landed a correction for exactly this class. **Task 13 + task 23.**

**F13 — links change no existing render.** `grep -rcoE '\[[^]]+\]\([^)]+\)' system/specs/*.md` → **no
matches**; `grep -rnoE '\[' system/specs/*.md | wc -l` → **73**. So enabling links moves nothing today and
the 73 bare `[` are exactly what AC #3's literal case guards. **Changed the plan:** task 20 drives a real
committed spec body through the renderer and asserts zero `<a>`, rather than asserting the rule abstractly.

**No `/factory` churn.** `factory.html:396` mounts the system graph inside a tab panel that is `hidden` at
rest, and `tooling/visual-regression/visual.spec.mjs` never clicks it (observed). Adding two consumers to
`system-graph.json` therefore does not move `factory-{neutral,saulera}.png`, and the epic's `/factory`
collision rule does not apply. **This was checked because it would have been 2 more PNGs and a blocked
ticket.**

**No open PRs** (`gh pr list --state open` → `[]`, observed 2026-09-18), so the `/components` collision
rule is clear. **Branch state:** the working tree sits on `feature/canvas-spike-s2-blueprint-stack-299`,
4 ahead / 2 behind `origin/main` — #299 landed squash-merged as PR #428 (6687f8e). Task 1 branches fresh.

### D8 — the `[]`-vs-`child.children` trap, stated once more

`card` and `empty-state` both render their one child as
`TEMPLATES[child.name](child.props ?? {}, [], bus, …)`. That `[]` is correct **for them** — their grammar
stops at one leaf. Copying it into `stack` would make every nested stack render empty, and **no existing
gate could see it**: group 3 only asserts a template *exists*, and nothing in build-checks renders. That
is why task 18 case 5 and the DOM stub exist, and why the mutation is named.

### Alternatives weighed and rejected

| Option | Why not |
|---|---|
| Grow `example` to carry children, so AC #2 lives in group 18 | A head-schema change: a new parser refusal, a `kb-format.md` entry, pack churn — and it closes nothing the group-3 case does not. The owner named both branches; this is the more expensive one. |
| Extract `renderMarkdown` into a new `system/markdown.mjs` | Cleaner module boundary, but it adds a `system/*.mjs` (so `runtime.files` 76 → 77, a second approach-baseline reason), refactors a shipped module, and buys only a ~12 KB fetch on `/build` and the protos. The ticket names `handoff-viewer.mjs:163` as the seam. Declined; revisit if page weight ever matters. |
| Inline styles on `stack` (`box.style.gap = …`) | Puts a literal on a token-contract surface, makes the CSS block a zero-token block (dropped by `gen-system-graph`, so group 18's `consumer !== null` reds), and breaks the "no markup-from-string / no inline style" posture the studio modules are held to. `agentic-renderer.mjs` is not in group 7's `MODULES` census (observed) — so the gate would *not* have caught it, which is a reason to be careful, not a licence. |
| `stack.children` = all 23 vocabulary entries, pinned by an identity gate | Tempting — a layout box that refuses an existing part reads like a lie — but every committed `children` list is 1-3 deliberate names, `card.md`'s prose argues against breadth, and the gate would force #303/#305/#309 to edit `stack.md`, contradicting the epic's "each two-way, additive". Widening later is one line; un-widening after #302 composes against it is not. **Reversed at plan review; see Q2.** |
| Add `--spacing-none: 0` | See F7 + D2. |

### Confidence

**9.5/10** for one-pass success. Task 15's `catalog.mjs` Node import and task 22's generator ordering were
both open when this number was first written and are now settled from the tree (build-checks:241 already
imports that module; `gen-pack-bundle` walks the pack directory, so it runs last of the three). The
residual is the exact `loc-summary` flip — which the plan **measures** rather than predicts — and the
operator-machine steps (Docker baselines, three-engine journey), neither of which this session can run.

## AMENDMENTS

- 2026-09-18 — **AC #2 restated at planning time, before execution.** The ticket says "Group 18 gains a
  many-children example". That is not implementable: `validateExamples` feeds `validateComposition` a node
  of shape `{name, props: head.example}` and never a `children` array (`agent-layer/gen-vocabulary.mjs:41`),
  as the owner's own hand-off comment on #301 states. Of the two branches the owner named, this plan takes
  **the case beside #298's grammar cases in build-checks group 3**, because a case driven against the real
  regenerated vocabulary also closes the gap the owner measured — that no gate covers the projected key's
  *name*. The alternative (growing the `example` head key to carry children) is a head-schema change with
  its own parser refusal and `kb-format.md` entry, and closes nothing extra. The PR body must carry this
  restatement so the shipped AC list matches the ticket.
- 2026-09-18 — **`stack.children` narrowed at plan review, before execution.** The first draft listed all
  23 vocabulary entries and pinned them with an identity assertion in group 3. Reversed to G24's generic
  set (ten names) with no gate: every committed `children` list is 1-3 deliberate names, `card.md`'s own
  prose argues against breadth, and the identity gate would have forced #303, #305 and #309 to edit
  `stack.md` — contradicting the epic's "the remaining primitives ... are width on top, each two-way".
  Widening is one line plus a regen; un-widening after #302 composes against a broad list is not. The
  choice is Q2, the owner's to reverse.
- 2026-09-18 — **Three open questions closed from the tree at plan review**, replacing GOTCHAs that would
  have cost run-time cycles: `catalog.mjs` is already imported under Node by `tooling/build-checks.mjs:241`
  (task 15 needs no fallback path); `gen-pack-bundle` walks the whole pack directory
  (`agent-layer/gen-pack-bundle.mjs:24-44`), so task 22's order is load-bearing and correct; and
  `color-accent` on `color-bg` **is** a declared AA pair in `system/derive.rules.mjs`'s `wcagPairs`, so
  `text.md`'s Accessibility section may claim it. AC #1's `role`-refusal leg also gained its assertion and
  its mutation (task 18 case 4) — it was named in the AC and proven nowhere.
- 2026-09-18 — **Q1 closed and a second baseline-collision rule written in, after reading #302's body.**
  #302 builds the spine as real `screen.compose` ops rather than importing a fixture, so group 3's spine
  composition stays a local literal and this ticket exports nothing new. Reading #302 also surfaced a rule
  this plan did not carry: its per-ticket context forbids anything else regenerating **`approach`'s**
  baselines while it is open, and F1 means #301 regenerates them. The sequencing resolves it (#301 is one
  of #302's stated preconditions and must be merged first), but the plan now says so explicitly and tells
  the report to record that the `approach` regen was already spent — #302's brief attributes that churn to
  its own two new `system/*.mjs` files. The stale "#303/#305/#309 must each edit `stack.md`" line, left
  over from the reversed all-23 `children` list, was corrected in the same pass.
