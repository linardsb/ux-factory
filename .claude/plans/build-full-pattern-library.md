# Feature: /build slice 2 — the full pattern library (onboarding · feed · settings + motion polish)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Ticket**: [#139](https://github.com/linardsb/ux-factory/issues/139) — the PR body MUST carry
`Closes #139` (memory: `prs-dont-auto-close-tickets`). **Epic**: #134, plan
`.claude/plans/hooked-shapeup-pattern-builder.md` §Slice 2.

**Owner decision, 2026-07-27 (asked at planning):** ONE new spec, not three. A sequence-step
primitive is the only one the breadboard genuinely needs; feed and settings derive to `list-row`'s
exact contract and reuse it with per-pattern arrangement CSS. This is slice 1c's `ds-queue-row` call
run three more times — *don't add what `list-row` already carries*. Rationale and the rejected
options are in §NOTES.

**Naming, decided at planning (deviates from the ticket's sketch):** the component is
**`sequence-step`** / class **`.ds-sequence-step`**, not the ticket's `ds-step`. The component name
becomes a key in the generated `vocabulary.json` — the file an agent is prompted with, beside
`plant-card`, `stat-tile` and `list-row` — and a bare `step` reads there as a verb. The ticket said
"likely `ds-step`", a sketch (two of its three sketched names were already dropped). Reasoning in
§NOTES; one line from the owner reverts it, but it should not be a live question the implementer
inherits.

## Feature Description

Slice 1 shipped /build with two of the five patterns rendering (dashboard · queue) and the other
three — onboarding · feed · settings — landing on a designed "not in the library yet" card that
shows the breadboard instead of faking a screen. Slice 2 makes all five render. The three
answer-paths that currently refuse become real assemblies, built the same way the first two are:
slots **counted** from the visitor's breadboard, composed into `{name, props, children}`, and passed
through the site's own vocabulary-validated `agentic-renderer` — never a bespoke DOM path.

One new library primitive earns its place: **`sequence-step`** (`.ds-sequence-step`), because a
step's position in a sequence ("2 of 4") is a real, countable fact about a board that no existing
primitive can express. Feed and settings derive to `{label, value, meta}`, which is `list-row`'s
contract verbatim, so they reuse it.

Then the whole flow gets a motion pass under the spring vocabulary, and every gate re-runs.

## User Story

As a hiring manager who described my product on /build and picked "a stream of what is new"
I want the builder to actually build it, the way it built the dashboard for the person who picked
"an overview"
So that the five-pattern claim on the page is a claim about what the system does, not about what
three of its five branches decline to do.

## Problem Statement

Three of the four `shape` answers currently dead-end. That refusal is honest and it was the correct
slice-1 outcome — but a visitor who answers "a stream of what is new" (a perfectly ordinary product)
gets a card explaining why nothing was built, while the person beside them gets a rendered pattern.
The refusal reads as craft exactly once; met by default it reads as an unfinished product.

## Solution Statement

Complete the library along the seam slice 1 built, changing nothing about the shape of the chain:

```
board  →  pattern-rules.slotsFor(id, board)   counted, never invented   [3 new branches]
       →  pattern-render.compose(id, slots)   {name,props,children}     [3 new branches]
       →  agentic-renderer.renderComposition against the REAL vocabulary
              ├── onboarding → "sequence-step"  NEW spec · NEW CSS block · NEW renderer template
              ├── feed       → "list-row"       shipped primitive, new arrangement CSS
              └── settings   → "list-row"       shipped primitive, new arrangement CSS
       →  build-card.cardSvg                  SVG bodies for the three
```

Plus three copy repairs the flip **forces** (see §The flip breaks three copy sites — one is already
a live bug on `main`), a motion pass that stays inside the existing reduced-motion block, and the
full gate cascade.

## Out of Scope / Non-Goals

- **No new questions, no new answer values.** The `shape` enum stays at four; `settings` keeps
  having no answer that names it and stays reachable only through rule 2's hub override. Touching
  `QUESTIONS` would move `DEFAULT_ANSWERS`, the share codec's per-field enum checks and the tamper
  battery's fixture for nothing.
- **No new draft rules.** `breadboard.mjs`'s `draftBoard` is untouched. The boards it already drafts
  for `stream` and `steps` are what the new slot derivations read.
- **No `ds-feed-item`, no `ds-settings-row`.** Owner's call, above. If implementation proves
  `list-row` genuinely cannot carry one of them, that is a plan amendment with the evidence, not a
  silent extra spec.
- **No web-component wrapper** for `sequence-step`. `system/wc/` holds `vd-*` only; neither `metric-tile`
  nor `list-row` has one, and `gen-handoff` requires *some* wrapper, never one per spec.
- **No new semantic tokens** unless `ds-sequence-step`'s CSS genuinely cannot be written from the shipped
  contract (it can — see Task 2). A `tokens.source.json` edit cascades into `gen-token-css`,
  `gen-handoff`, Style Dictionary and every pack; not worth it for one ordinal badge.
- **No entrance animations on /build.** `build.html:544-548` carries a committed prose claim that
  there are none, and the stage re-renders on every breadboard keystroke. Motion polish is
  press/hover/focus only. (If that is ever broken, the comment gets rewritten in the same commit.)
- **Not deleting the refusal machinery.** `pattern-render.renderOutOfLibrary` and `build-card`'s
  out-of-library body stay as the standing guardrail for pattern six. See §NOTES.
- **Not slice 3** (the operator path / portal drawer). Independent; can run in parallel.

## Feature Metadata

**Feature Type**: Enhancement (completes an epic slice)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/specs/` (+1), `system/components.css`,
`system/agentic-renderer.mjs` (shared canon — see blast radius), `system/pattern-rules.mjs`,
`system/pattern-render.mjs`, `system/build-card.mjs`, `system/build-keep.mjs`, `build.html`,
`tooling/build-checks.mjs`, `tooling/build-journey.mjs`, four generated artifacts, six VR baselines
**Dependencies**: none new — zero-dep vanilla, per CLAUDE.md

## Related Work

**Implements**: #139 · **Epic**: #134 (`.claude/plans/hooked-shapeup-pattern-builder.md` §Slice 2)

**Back-references**:

- `.claude/plans/build-pattern-render-keep-rail.md` (#137, PR #145) — the rules/render/card seams
  this extends; its `ds-queue-row` decision (*don't add it, `list-row` carries it*) is the precedent
  the owner's one-spec call follows
- `.claude/plans/build-questions-breadboard.md` (#136) — `draftBoard`'s committed rules, which the
  three new slot derivations read
- `.claude/plans/build-links-in-and-gates.md` (#138, PR #147) — the two gates
  (`build-checks` · `build-journey`) this ticket extends, and the VR capture fix
- `.claude/plans/ds-list-row-primitive.md` (PR #123) — the `ds-` library-primitive precedent
  `ds-sequence-step` follows spec-for-spec

**Forward-references**: slice 3 (the operator path, absorbs #86) — independent of this ticket.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/pattern-rules.mjs` (**whole file, 211 lines**) — `PATTERNS` (L23-59: the five entries,
  `inLibrary` + `needs`), `SLOT_MAX` (L64), rules 1–3 in `patternFor` (L135), and `slotsFor`
  (L168-211) whose dashboard/queue branches are the two derivations to mirror. L207-210 is the
  comment that says the three new branches belong to this ticket.
- `system/pattern-render.mjs` (L40-45 `compose`, L118-130 `renderOutOfLibrary`, L168-195 `render`).
  `compose` is PURE and exported for the gate; keep it that way.
- `system/build-card.mjs` (L137-162 `dashboardBody`, L171-189 `queueBody`, L196-224 `cardSvg`,
  L280-360 `boardSvg`). **L203's condition `pattern && pattern.inLibrary && rows.length` is the
  live bug** — see below.
- `system/build-keep.mjs` L125-141 (`## Components used` in the downloaded spec — L138 interpolates
  `pattern.needs`, which becomes `null`), L248-263 (`update()` — the `bare` gate and the card call).
- `system/agentic-renderer.mjs` L220-342 (`TEMPLATES`) — the `metric-tile` (L321) and `list-row`
  (L333) templates are the shape `sequence-step` copies. **Every vocabulary entry needs a template here or
  `build()` throws the renderer/vocabulary drift error** (L360-363).
- `system/specs/list-row.md` and `system/specs/metric-tile.md` — the ds-primitive spec format
  verbatim: fenced JSON head, then `## Usage` · `## States` · `## Data binding` · `## Accessibility`.
  `.claude/references/kb-format.md` is the format doc; `agent-layer/lib.mjs:63-110`
  (`parseComponentSpec`) is what actually validates it — filename must equal `head.component`.
- `system/components.css` L1474-1526 (`ds-metric-tile`) and L1527-1621 (`ds-list-row`) — the block
  header grammar `/* ---------- ds-name (system/specs/name.md) ---------- */` is **load-bearing**:
  `agent-layer/gen-system-graph.mjs:66-84` parses exactly that to build factory.html's exhibit.
- `system/breadboard.mjs` L37-46 (`MAX_PLACES`/`MAX_AFFORDANCES`/`LABEL_MAX`), L106-145
  (`draftBoard` — the boards `stream` and `steps` produce), L150-152 (`isBoard`).
- `build.html` L48 (page-comment), L432-499 (`.bx-pat-*` CSS — page-scoped, inline `<style>`,
  **not** components.css), L544-553 (the motion block + the no-entrances claim), L801-833 (Act 4
  markup and the "Two of the five patterns" copy).
- `tooling/build-checks.mjs` — groups 1 (L61-103), 2 (L107-142), 3 (L146-171) and 6 (L361-436) all
  carry roster-shaped assertions that must become invariant-shaped. Group 7's `MODULES` list
  (L449-452) needs no change (no new /build module ships).
- `tooling/build-journey.mjs` L129-147 — check [3] (worklist→queue) is the template for the three
  new paths; **check [4] currently asserts the feed out-of-library card and must be rewritten.**
- `agent-layer/gen-vocabulary.mjs` + `gen-handoff.mjs` — both `readdirSync(system/specs)`, so a new
  spec is picked up automatically; both are drift-checked.
- `agent-layer/gen-system-graph.mjs` L60-84 — why a new components.css block churns factory.html.
- `agent-layer/gen-loc-summary.mjs` L22-25 — the `runtime` group regex
  `^system\/(wc\/)?[^/]+\.(css|mjs|js)$`: components.css and every `system/*.mjs` count;
  `system/specs/*.md` does **not**.
- `CLAUDE.md` — ground rules + the architecture map lines for `pattern-rules.mjs` /
  `pattern-render.mjs` (both need a touch-up); `.claude/references/token-system.md`;
  `.claude/skills/portfolio-design/references/CRAFT.md` §Motion for the spring vocabulary.

### New Files to Create

- `system/specs/sequence-step.md` — the `ds-sequence-step` ComponentSpec (`component: "step"`, `class: "ds-sequence-step"`,
  `contract: null`). The **only** new file in this ticket.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- Shape Up, breadboarding (basecamp.com/shapeup/1.3-chapter-04) — places · affordances ·
  connections. The three new derivations must not re-define any of them.
- Hooked (nirandfar.com/hooked) — only as the page already cites it; no new method claims here.
- `.claude/skills/portfolio-design/references/CRAFT.md` §Motion (L28-37): spring ~2% for entrances ·
  **bounce only on things you touch** · settle for things that arrive · every animation ends at the
  true at-rest state. Read `references/CHECKLIST.md` before committing.
- WAI-ARIA APG — nothing new is interactive here; `ds-sequence-step` is read-only like its two siblings
  (no role, no tabindex — the specs say why).

### Patterns to Follow

**File headers cite the governing doc.** Every touched module already does; the new spec follows
`system/specs/list-row.md`'s shape exactly.

**The honesty rule of `pattern-rules.mjs` (L163-167), quoted because it decides three designs:**

> every value below is COUNTED from the board. Not one figure is invented, plausible-looking or
> synthetic.

**Values are STRINGS at the rules boundary** (`pattern-rules.mjs:176-183`) — the validator refuses a
number and the fix is `String()` in the rules, never a looser spec.

**Own-property lookup everywhere** a pattern id or prop name indexes an object
(`Object.hasOwn`) — `agentic-renderer.mjs:44` argues why.

**components.css block header grammar** is parsed by a generator:

```css
/* ---------- ds-sequence-step (system/specs/sequence-step.md) ---------- */
```

**Token-only CSS.** `tooling/token-lint.mjs` check 1 fails on any `var(--x)` in components.css that
`tokens.contract.css` does not declare.

---

## The flip breaks three copy sites — one is already a live bug on `main`

Flipping `inLibrary: false → true` and `needs: <sentence> → null` for the three patterns turns three
committed strings into lies. Two are new; **one is reachable today**.

**1 · `build-card.mjs:203` — LIVE BUG ON MAIN.** The condition is
`pattern && pattern.inLibrary && rows.length`, and the `else` hard-codes *"is not in the library
yet"*. So an **in-library** pattern with an empty slot array falls through and the downloaded SVG
asserts something false. Reproduced on `main` today:

```
$ node -e "…patternFor/slotsFor/cardSvg on a 2-place board with every affordance removed…"
pattern: queue | slots: []
Your breadboard · Queue is not in the library yet
```

A visitor reaches this by removing the affordances but keeping two places — the board is not `bare`,
so `build-keep.mjs:258-263` does not hide the card. Slice 2 must split **"no slots to draw"** from
**"not in the library"** into two distinct card bodies. This is in the code the ticket already
touches; fixing it here rather than filing it is the right call, and it is called out in the report.

**2 · `build-keep.mjs:138`** — `` `None. ${pattern.needs}, so nothing was rendered…` `` renders
`"None. null, so nothing was rendered…"` the moment `needs` is null with an empty composition. Same
split as above: an in-library pattern with nothing on the board gets its own sentence.

**3 · `build.html` L48, L804, L822-823** — "two of the three", "Two of the five patterns have
components in this library", "The other three say so instead of mocking one up". All three become
false. Rewrite to state what is true after this ticket, in the page's own voice.

`pattern-render.mjs:124` (`What it would take: ${pattern.needs}.`) is **not** a fourth site: it
lives inside `renderOutOfLibrary`, which after the flip is only reachable by a future
`inLibrary: false` pattern — for which the interpolation is correct.

---

## IMPLEMENTATION PLAN

### Phase 1 — the primitive

`system/specs/sequence-step.md` → `system/components.css` block → `agentic-renderer` template → regenerate
`vocabulary.json` / `pack.json` / `pack.bundle.json`. Spec FIRST, then CSS, then the template: a
template for a component with no spec is exactly the drift the vocabulary exists to prevent.

### Phase 2 — the rules and the render

**Depends on:** Phase 1 (the composition cannot validate until `sequence-step` is in the vocabulary).

`pattern-rules.mjs` (flip + three `slotsFor` branches) → `pattern-render.mjs` (three `compose`
branches) → `build-card.mjs` (the body split + the step body) → `build-keep.mjs` (the null-`needs`
sentence) → `build.html` (copy + arrangement CSS).

### Phase 3 — the gates as gates

**Depends on:** Phase 2.

Rewrite the roster-shaped assertions in `build-checks.mjs` into invariant-shaped ones, extend
`build-journey.mjs` to drive the three new paths. Do this **before** the motion pass, so the motion
pass runs against a green gate.

### Phase 4 — motion polish + hallway test

**Depends on:** Phase 3. **Independent of:** Phase 5 in content, but must land before the baselines
are captured (motion at rest == final, so a correct motion pass changes no pixel — capture after it
anyway, so a mistake shows up in the diff rather than after it).

### Phase 5 — the generated cascade and the baselines

**Depends on:** Phases 1–4 all committed to the working tree. **Precondition (blocking):** the
working tree must be clean of unrelated edits before any VR capture — see Task 14.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently validated.

### 1 · CREATE `system/specs/sequence-step.md`

- **IMPLEMENT**: the ComponentSpec for the third `ds-` library primitive. Head, verbatim shape:

  ```json
  {
    "component": "sequence-step",
    "status": "shipped",
    "class": "ds-sequence-step",
    "contract": null,
    "props": {
      "position": { "type": "string", "required": true,  "description": "this step's 1-based place in the sequence as a display string, e.g. \"2\" — counted, never assigned" },
      "total":    { "type": "string", "required": true,  "description": "how many steps the sequence has, as a display string — a step that does not know the total is not a sequence" },
      "label":    { "type": "string", "required": true,  "description": "what this step is, one line — truncates with an ellipsis" },
      "detail":   { "type": "string", "required": false, "description": "one short qualifier: what advances this step, or where it leads; ≤ 6 words, never a sentence" },
      "tone":     { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (position + label + detail must already read the state)" }
    },
    "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--radius-md", "--radius-lg", "--spacing-xs", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--type-eyebrow"],
    "states": ["neutral", "warn", "critical"],
    "children": []
  }
  ```

  Prose sections in this order, matching `list-row.md`: `## Usage` · `## States` ·
  `## Data binding` · `## Accessibility`.
  - **Usage** must say what `metric-tile`/`list-row` say about the split of labour: *metric-tile
    reports one aggregate reading, list-row reports one named entity, **step reports one position
    in a sequence** — use it when the honest answer is "where in the order".* And it must say what
    the primitive deliberately does **not** carry: **no `done`/`current`/`todo` state.** A
    breadboard records no progress, and a step that claims to be complete would be the one invented
    fact on the page. That sentence is the spec's whole honesty argument — write it explicitly.
  - **States** are the same three emphasis levels as its two siblings (neutral base ·
    warn = accent border + tint · critical = solid accent fill with `--color-accent-fg`), and colour
    is never the sole signal.
  - **Data binding**: `contract: null` — presentational, exactly like its siblings; `position` and
    `total` are strings for the same reason `value` is (head schema v1 types are
    string/number/boolean; string is the uniform display choice).
  - **Accessibility**: one paragraph per step whose text order is **position → label → detail**
    ("Step 2 of 4, Add something, Save"), so it is heard as one sentence. Non-interactive: no role,
    no `tabindex`, **no `listitem`** — steps are siblings in a composed slot with no owning `<ol>`,
    and claiming ordered-list semantics would be a claim about a list that does not exist (the exact
    argument `list-row.md:45` makes). The ordinal is real text, never a CSS counter, so it survives
    into the accessibility tree.
- **PATTERN**: `system/specs/list-row.md` head + four sections; `system/specs/metric-tile.md` for
  the "library-generic, carries no domain vocabulary" framing.
- **GOTCHA**: filename stem MUST equal `head.component` (`sequence-step.md` ↔ `"step"`) —
  `agent-layer/lib.mjs:77` throws otherwise. Every token listed in `tokens` must be one the CSS
  block in Task 2 actually references (and must exist in `tokens.contract.css`); trim the list to
  what you use.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>console.log(JSON.stringify(m.parseComponentSpec('system/specs/sequence-step.md').head.props,null,1)))"`
- **SATISFIES**: AC1

### 2 · UPDATE `system/components.css` — the `ds-sequence-step` block

- **IMPLEMENT**: a token-only block appended **after** `ds-list-row` (L1621) and **before** the
  `vd-screen-header` block at L1623, so the `ds-` primitives stay contiguous. Header exactly:
  `/* ---------- ds-sequence-step (system/specs/sequence-step.md) ---------- */`. Structure mirrors `.ds-list-row`:
  a `<div class="ds-sequence-step">` wrapping one `<p>`, spans for the ordinal badge, the label and the
  detail. The ordinal badge is an `--color-accent`-bordered pill on `--color-bg-surface` at
  `--radius-lg`; `is-warn` / `is-critical` mirror `.ds-list-row.is-warn` / `.is-critical` exactly,
  **including** the critical fill-inversion to `--color-accent-fg` (the badge inverts too, or it
  fails contrast on the accent fill — the bug `list-row.md:47` records).
- **PATTERN**: `system/components.css:1527-1621` (`.ds-list-row`), line for line.
- **GOTCHA**: a literal colour, or any `var(--x)` not declared in `tokens.contract.css`, fails
  `token-lint`. `min-width: 0` on any grid/flex child holding text (memory:
  `vr-gate-single-engine-blindspot` — the Chromium-only gate missed a real Safari grid blowout).
- **VALIDATE**: `node tooling/token-lint.mjs` → 3 ✓ lines, exit 0.
- **SATISFIES**: AC1

### 3 · UPDATE `system/agentic-renderer.mjs` — the `sequence-step` template

- **IMPLEMENT**: one entry in `TEMPLATES`, beside `list-row` (L333-341), same shape:

  ```js
  "sequence-step": (props) => el("div", { class: `ds-sequence-step${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-sequence-step-position", text: `Step ${props.position} of ${props.total}` }),
      el("span", { class: "ds-sequence-step-label", text: props.label }),
      props.detail != null ? el("span", { class: "ds-sequence-step-detail", text: props.detail }) : null)),
  ```

  Carry a comment in the voice of its two neighbours: library-generic `ds-` primitive,
  non-interactive (no bus), DOM order **is** reading order, the ordinal is real text rather than a
  CSS counter so it reaches the accessibility tree, and `tone` rides an `is-*` class.
- **PATTERN**: the `list-row` template immediately above it (L328-341).
- **GOTCHA**: **blast radius.** `agentic-renderer.mjs` is shared canon — `/agentic.html`,
  `agentic-study.mjs` and the two Fieldwork slots all render through it. The change is purely
  additive (a new key on `TEMPLATES`), so nothing existing can break, but say so in the commit and
  re-run `/agentic-ui-study` once by hand.
- **VALIDATE**: `node --check system/agentic-renderer.mjs`; the template is exercised end-to-end by
  Task 12.
- **SATISFIES**: AC1

### 4 · REGENERATE the pack — vocabulary, handoff, bundle

- **IMPLEMENT**: run all three, in this order:
  `node agent-layer/gen-handoff.mjs` · `node agent-layer/gen-vocabulary.mjs` ·
  `node agent-layer/gen-pack-bundle.mjs`. Commit the generated output (CLAUDE.md: *deploy = commit
  the artifacts*; never `.gitignore` a generated file).
- **GOTCHA**: `gen-handoff` shells out to Style Dictionary — needs
  `tooling/style-dictionary/node_modules` (`cd tooling/style-dictionary && npm install` on a fresh
  clone). If the branch is behind `main`, merge first, then regenerate (memory:
  `token-change-regen-handoff-pack` and `drift-check-mid-merge-false-positive`).
- **VALIDATE**: `node -e "const v=require('./handoff/verdant/vocabulary.json'); console.log(Object.keys(v.components))"`
  lists `sequence-step`; `git diff --stat handoff/` shows `vocabulary.json`, `pack.json`,
  `pack.bundle.json` and nothing surprising.
- **SATISFIES**: AC1

### 5 · UPDATE `system/pattern-rules.mjs` — the flip

- **IMPLEMENT**: for `feed`, `onboarding` and `settings`: `inLibrary: true`, `needs: null`. Update
  the `PATTERNS` header comment (L19-22): it currently explains why the page *"can render two of
  them and must honestly refuse to fake the other three"*. Rewrite to say all five render, and that
  `inLibrary`/`needs` remain in the shape because they are the honest refusal a **sixth** pattern
  would get — the field is the guardrail, not a slice marker.
- **GOTCHA**: `PATTERNS` is `Object.freeze`d per entry; keep it that way.
- **VALIDATE**: `node -e "import('./system/pattern-rules.mjs').then(m=>console.log(Object.values(m.PATTERNS).map(p=>[p.id,p.inLibrary,p.needs])))"`
- **SATISFIES**: AC2

### 6 · UPDATE `system/pattern-rules.mjs` — three `slotsFor` branches

- **IMPLEMENT**: replace the L206-210 "nothing to derive until slice 2" comment with three
  branches. Every value **counted**; every value a `String`; every branch capped at `SLOT_MAX`.

  **`onboarding`** — one step per place, in board order, because board order *is* the sequence:

  ```
  const shown = places.slice(0, SLOT_MAX);
  shown.map((place, i) => ({
    position: String(i + 1),
    total:    String(shown.length),        // what is DRAWN, not what exists
    label:    String(place.label ?? ""),
    detail:   <first affordance's label>   // omit the key entirely when the place has none
    tone:     affordancesOf(place).length === 0 ? "warn" : "neutral",
  }))
  ```

  `total` is the shown count, not `places.length`: a card that says "3 of 7" while drawing three is
  a number the page did not count. (`MAX_PLACES === SLOT_MAX === 6`, so they can never differ today
  — write it correctly anyway, and say why in the comment.)

  **`feed`** — every affordance on the board, **in board order**, each carrying where it leads and
  which place it came from. Reuse the existing `targetOf`/`labelOf` helpers from the queue branch
  (hoist them out of that branch; they are already written):

  ```
  places.flatMap(p => affordancesOf(p).map(aff => ({
    label: String(aff.label ?? ""),
    value: labelOf(targetOf(aff.id)) ?? "acts here",
    meta:  `in ${String(p.label ?? "")}`,
  }))).slice(0, SLOT_MAX)
  ```

  **Two comments on this branch are load-bearing and must both be written explicitly:**

  *(i) Order.* A breadboard records no time, so this stream is in the order the board draws it —
  **the page does not invent recency.** "Newest first" is the pattern's definition, not a claim this
  board can support, and reversing the array to gesture at it would be exactly the invented fact the
  file's honesty rule forbids.

  *(ii) Truncation — and this one changes what `SLOT_MAX` means.* `SLOT_MAX`'s own comment
  (`pattern-rules.mjs:61-64`) says the cap "is here as the stated bound, not as a working
  truncation", which is true for dashboard (≤ 6 places) and queue (≤ 6 affordances on one place).
  **Feed breaks that**: it reads every affordance on the board, so a full board offers 36 candidates
  and 6 are shown. A silent drop on the page that promises it counts everything is the same failure
  class as the copy bug this ticket fixes. Two things follow, both required:
  - Amend the `SLOT_MAX` comment so it stops claiming to be non-truncating for all patterns.
  - The feed branch states, in the comment AND on the page (Task 10), that the stream shows the
    **first six affordances in board order** and how many the board holds. Prefer surfacing the real
    count rather than hiding it — a slot's honest job here is to say "6 of 14 shown", and the
    cleanest place for that is the stage note beside `COUNTED`, since `list-row` has no prop for it.

  **`settings`** — the ENTRY place's affordances and their destinations, because rule 2's hub
  override (L111-120) is the only way this pattern is ever named and it reads exactly that shape:

  ```
  affordancesOf(places[0]).slice(0, SLOT_MAX).map(aff => ({
    label: String(aff.label ?? ""),
    value: labelOf(targetOf(aff.id)) ?? "acts here",
  }))
  ```

  No `meta`: every row is in the same place, so `"in <entry>"` on all of them is noise, not a fact.

  Keep the trailing `return null` for `null` / unknown ids.
- **PATTERN**: the dashboard branch (L173-185) and queue branch (L187-205) directly above.
- **GOTCHA**: `feed`'s `flatMap` can exceed `SLOT_MAX` (6 places × 6 affordances = 36) — slice
  **after** the flatMap, never inside it. An empty array must stay an empty array (not `null`) so
  Task 8's "no slots to draw" card body is the one that fires.
- **VALIDATE**:
  ```
  node -e "Promise.all([import('./system/pattern-rules.mjs'),import('./system/breadboard.mjs'),import('./system/build-questions.mjs')]).then(([r,b,q])=>{for(const s of ['stream','steps']){const a={...q.DEFAULT_ANSWERS,shape:s};const board=b.draftBoard(a);const {id}=r.patternFor({answers:a,board});console.log(s,'→',id,JSON.stringify(r.slotsFor(id,board)));}})"
  ```
  Every emitted value is a string; `onboarding`'s positions run 1..n with a matching `total`.
- **SATISFIES**: AC2, AC3

### 7 · UPDATE `system/pattern-render.mjs` — three `compose` branches

- **IMPLEMENT**: in `compose` (L40-45), after the queue branch:

  ```js
  if (patternId === "onboarding") return slots.map((props) => ({ name: "sequence-step", props: { ...props } }));
  if (patternId === "feed" || patternId === "settings") return slots.map((props) => ({ name: "list-row", props: { ...props } }));
  ```

  Add one comment saying **why feed and settings share a primitive**: their derived shape is
  `list-row`'s contract verbatim (a named thing, one computed reading about it, an optional
  qualifier), and adding a second component that renders the same three fields would be a component
  named after a pattern rather than after what it does — the call `list-row.md:23-25` already
  argues. Their difference is arrangement, and arrangement is CSS.

  Update the module header (L13-21): the four states are unchanged, but state 2 ("not in the
  library") is now the standing guardrail for a **future** pattern rather than the live path for
  three of five. Keep the state and say what it is for.
- **PATTERN**: the two existing branches directly above.
- **GOTCHA**: `compose` stays PURE and Node-importable — no `document`, no vocabulary fetch.
  Keep the `return null` fallthrough for unknown ids: Task 11 asserts it.
- **VALIDATE**: `node tooling/build-checks.mjs` group 3 (after Task 11 updates it) — the real
  gate. Before that, a direct call:
  `node -e "import('./system/pattern-render.mjs').then(m=>console.log(JSON.stringify(m.compose('onboarding',[{position:'1',total:'2',label:'A'}]))))"`
- **SATISFIES**: AC3

### 8 · UPDATE `system/build-card.mjs` — split the two refusals, add the step body

- **IMPLEMENT**: three changes.

  **(a) The body split — the live bug.** `cardSvg` (L196-224) currently has two outcomes. It needs
  three, in this order:
  1. `pattern && pattern.inLibrary && rows.length` → the pattern body (unchanged).
  2. `pattern && pattern.inLibrary && !rows.length` → **NEW**: "nothing on the board to arrange
     yet". Same designed frame, the breadboard nested in the content area (same as the
     out-of-library body — the board is still the real artifact), but the header/title/desc say
     *there is nothing on the board for this pattern to show*, never *not in the library*.
  3. `pattern && !pattern.inLibrary` → the existing out-of-library body, **retained**.
     `pattern === null` keeps its existing "A breadboard" / "No pattern yet" body.

  Extract the shared board-in-frame construction rather than writing the frame three times.

  **(b) `stepsBody(slots, t)`** — the onboarding card body. Numbered rows: reuse the `ROW_H` / `ROW_GAP`
  / `ROW_MAX` geometry (L167-169) and the centring maths from `queueBody`, adding a circular
  ordinal badge at `x = LEFT + 16` (accent stroke, `t.fg` numeral) and shifting the label right of
  it. The `detail` prints right-aligned like `queueBody`'s value. **`clip()` every string** — a
  budget that can cut an astral character is the surrogate bug PR #145 fixed; pick budgets and add
  them to Task 11's astral sweep.

  **(c) Route feed and settings to the rows body.** Rename `queueBody` → `rowsBody` (three patterns
  now use it; a name that says "queue" is a name that lies) and switch on `patternId`:
  `onboarding → stepsBody` · `dashboard → dashboardBody` · everything else → `rowsBody`. Update the
  comment at L164-166 accordingly.
- **PATTERN**: `queueBody` (L171-189) and `dashboardBody` (L137-162).
- **GOTCHA**: `esc()` every string reaching text OR an attribute; `clip()` the RAW string **before**
  escaping (L76-87 says why). `resolveTokens`' colour-shape gate is untouched.
- **VALIDATE**:
  ```
  node -e "Promise.all([import('./system/build-card.mjs'),import('./system/pattern-rules.mjs'),import('./system/breadboard.mjs'),import('./system/build-questions.mjs')]).then(([c,r,b,q])=>{const board={places:[{id:'p1',label:'Worklist',affordances:[]},{id:'p2',label:'Progress',affordances:[]}],connections:[]};const a={...q.DEFAULT_ANSWERS,shape:'worklist'};const n=r.patternFor({answers:a,board});console.log(c.cardSvg({patternId:n.id,slots:r.slotsFor(n.id,board),board,tokens:{}}).match(/<desc>.*?<\/desc>/)[0]);})"
  ```
  must NOT contain "not in the library". (Today it does — that is the bug.)
- **SATISFIES**: AC4, AC7

### 9 · UPDATE `system/build-keep.mjs` — the null-`needs` sentence

- **IMPLEMENT**: at L137-140, the empty-composition branch must distinguish the same two cases the
  card now does: an **in-library** pattern with nothing to build from gets its own sentence ("None.
  There is nothing on this board for the pattern to build from yet."); an `inLibrary: false` pattern
  keeps the `pattern.needs` sentence. Guard on `pattern.needs` being a string, not on the pattern
  id, so a future pattern six is covered without another edit.
- **PATTERN**: the same three-way split Task 8 introduces — keep the two files' logic parallel and
  say so in a comment; they render the same fact in two media.
- **GOTCHA**: `## Components used` is inside the DOWNLOADED spec, so a wrong sentence ships as a
  file a reader keeps. There is no VR baseline over it — Task 12's journey run is what catches it.
- **VALIDATE**: Task 12's journey check on the pattern-spec.md download; plus read the emitted
  markdown once by hand from the browser.
- **SATISFIES**: AC4

### 10 · UPDATE `build.html` — copy, arrangement CSS, and the feed's order note

- **IMPLEMENT**:
  - **Copy.** L48 (page comment), L804 and L822-823. "Two of the five patterns have components in
    this library. The other three say so instead of mocking one up." becomes a true statement about
    five. Keep the *reason the refusal exists* in the copy — the renderer can only use components
    that really exist, which is why the vocabulary is generated and why a pattern with no components
    would refuse. That sentence is the argument; only the arithmetic changed.
  - **The feed's two honesty lines**, both stated at rest beside the committed `COUNTED` line in
    `pattern-render.mjs:48` (same register), never behind a disclosure: **(i)** a breadboard records
    no time, so the stream is in the board's own order rather than by recency; **(ii)** the stream
    shows the first six affordances of however many the board holds, with the real total named
    ("6 of 14"). The second is what stops `SLOT_MAX` becoming a silent truncation on the one pattern
    that reads the whole board — see Task 6(ii).
  - **Arrangement CSS**, in the page's inline `<style>` beside `.bx-pat-slots.is-dashboard`
    (L489-490): `.is-onboarding` (single column, tight gap — a sequence reads down),
    `.is-feed` (single column, full width, wider gap — a stream has air between items),
    `.is-settings` (single column, hairline-separated — a menu of destinations). Tokens only.
- **PATTERN**: L489-499's existing `.bx-pat-slots` rules.
- **GOTCHA**: **every one of these edits churns /build's VR baselines** (both packs) — expected and
  planned in Task 14, not a surprise. Do not add anything to the footer index or the nav (one chrome
  item churns all 20 baselines — the reason /build is off-nav).
- **VALIDATE**: `npx serve .` → /build under neutral; walk `overview → worklist → stream → steps`
  and edit a board into a hub; zero console errors; each pattern's arrangement reads as its own
  thing at 1440 and at 390.
- **SATISFIES**: AC5, AC6

### 11 · UPDATE `tooling/build-checks.mjs` — roster assertions become invariants

- **IMPLEMENT**: the memory `check-that-cannot-fail` is the brief here — *mutate the source; run the
  function, don't grep it.* Four edits:

  **Group 1 (L67-72).** Delete the `inLibrary === true` / `=== false` roster loop. Replace with the
  invariant, derived from `PATTERNS` itself:
  ```
  for (const p of Object.values(PATTERNS)) {
    if (p.inLibrary) ok(p.needs === null, `${p.id} is in the library but still states what it needs`);
    else ok(typeof p.needs === "string" && p.needs.length > 20, `${p.id} should say what it would need`);
  }
  ```
  The `else` is **vacuous today** (no `inLibrary: false` entry exists) — write a one-line comment
  saying so, and saying it is retained deliberately as pattern six's contract, so a later reader
  does not mistake a vacuous clause for an oversight.

  **Also in group 1: the page-copy guard, so AC6 is a criterion rather than a hope.** Group 1 (like
  group 7) may read source files. Read `build.html` and fail on the strings the flip falsifies —
  `"Two of the five"`, `"other three"`, `"not in the library yet"` — and on `pattern.needs` still
  being interpolated anywhere outside `renderOutOfLibrary`. Crude string matching, deliberately: it
  is the only thing standing between a stale sentence and a shipped page, since `build.html`'s prose
  has no other gate but the VR baseline, whose 100-pixel tolerance swallows changed words (memory:
  `vr-tolerance-hides-text-changes`). Watch it go red before the copy is fixed — that is its proof.

  **Group 2 (L137-139).** The `["feed","onboarding","settings",null,"nonsense"]` derives-nothing
  loop **inverts**. Keep `null` and `"nonsense"` as the negatives; for each of the five real ids
  assert `slotsFor` returns a non-empty array in which **every value of every slot is a string**
  (this is the counted-not-invented invariant, checked structurally rather than per-pattern). Then
  three targeted per-pattern assertions, each proving the derivation reads what it claims:
  - onboarding: `positions === ["1".."n"]`, every `total === String(n)`, `n === Math.min(places.length, SLOT_MAX)`
  - feed: slot count `=== Math.min(SLOT_MAX, total affordances across ALL places)`, and each
    `meta === "in <its own place's label>"` (this is what proves it reads the whole board, not one place)
  - settings: slot count `=== Math.min(SLOT_MAX, entry place's affordance count)`, no `meta` key,
    and each `value` is its affordance's connected destination label
  Assert the cap on a `MAX_PLACES × MAX_AFFORDANCES` board for all three.

  **Group 3 (L147-168).** Drive it off `PATTERNS` rather than the hand-list `[["overview",
  "metric-tile"],["worklist","list-row"]]`: for every entry with `inLibrary`, build a board that
  names it, `compose` it, and `validateComposition(VOCAB, …)`. Derive the component-name assertion
  from what `compose` emits (`new Set(composition.map(n => n.name))` ⊆ `Object.keys(VOCAB.components)`)
  instead of retyping names. Keep the `compose(null|"nonsense") === null` negatives and
  `compose("dashboard", null) === null`.
  `settings` needs the hub board (L76-82) since no `shape` answer names it — reuse that fixture.
  **Add the renderer/vocabulary drift guard, scoped correctly:** collect
  `new Set(compositions.flat().map((n) => n.name))` across all five patterns and assert each name is
  BOTH a `VOCAB.components` key AND a `TEMPLATES` key in `agentic-renderer.mjs`'s source. That is the
  drift error at `agentic-renderer.mjs:360-363` — a vocabulary entry with no template — caught before
  a visitor meets it on stage.
  **Do NOT assert "every `VOCAB.components` key has a template"** — that is false on a correct
  codebase and the check would go red on day one. Verified at planning: the vocabulary has **9**
  components (`care-task-row`, `demo-notice`, `list-row`, `metric-tile`, `plant-card`,
  `primary-button`, `screen-header`, `stat-tile`, `status-chip`) and `TEMPLATES` has **8** —
  `demo-notice` has a spec and deliberately no renderer template. Scope the assertion to what
  `compose` actually emits.

  **Group 6 (L361-436).** Add card cases for the three new patterns, on real drafted boards, with
  `HOSTILE_TOKENS` and the hostile label. **Add the regression for the bug this ticket fixes**:
  for every `inLibrary` pattern id × {full board, 2-place-no-affordance board}, assert the emitted
  SVG does **not** contain `"not in the library"` — a direct, failing-when-broken guard on the copy
  split. Add the new step-body budgets to the astral sweep at L408.
- **PATTERN**: the existing groups; keep the `ok()` / `group()` grammar and the one ✓ line per group.
- **GOTCHA**: don't let the file grow a second source of truth. Everything derives from `PATTERNS`,
  `VOCAB`, `MAX_PLACES`/`MAX_AFFORDANCES`/`SLOT_MAX` and `draftBoard`. **Prove each new assertion
  can fail**: temporarily break the thing it checks (delete a `slotsFor` branch, flip a `total`,
  revert the card split), watch it go red, restore. A green run of an untested check is worth
  nothing — that is the whole content of the `check-that-cannot-fail` memory.
- **VALIDATE**: `node tooling/build-checks.mjs` → 7 ✓ groups, exit 0. Then the mutation sweep above.
- **SATISFIES**: AC8

### 12 · UPDATE `tooling/build-journey.mjs` — drive the three new paths

- **IMPLEMENT**:
  - **Rewrite check [4]** (L138-147). It currently asserts the feed out-of-library card
    ("names the pattern" / "says what it would need" / "renders no fake components"). It becomes:
    `shape → stream` renders `.ds-list-row`s in the stage, count > 0, no `.ds-metric-tile` left, and
    the stage text carries the counted-not-invented line.
  - **New check**: `shape → steps` renders `.ds-sequence-step`s; the first reads "Step 1 of N" where N is the
    rendered count (assert against the DOM, not a literal).
  - **New check**: build a hub through the REAL editor — rename/add affordances on the entry place
    until rule 2 fires — and assert `.ds-list-row`s render and the stage's reason quotes "Rule 2".
    (Use the wizard/editor, not `setAnswers`, for at least one of the three: the point of this
    driver is that the real page does it.)
  - **New check**: one share round-trip over a new pattern (encode from a `steps` build, open in a
    fresh context, assert the same `.ds-sequence-step` count) — the codec is already covered by
    `build-checks`, so this is the page-level proof that the restore reaches the new render path.
  - **Extend** the pattern-spec.md download check to assert the `## Components used` section names
    the right component and does **not** contain the string `"null"` (Task 9's regression).
- **PATTERN**: check [3] (L129-137) verbatim, and the `t()` / `skip()` grammar. Where an engine
  genuinely cannot do something, assert the documented fallback — never skip silently (the file's
  header states this rule).
- **GOTCHA**: Playwright resolves out of `tooling/visual-regression/node_modules`, never a repo dep.
  Needs the static server first: `node tooling/visual-regression/serve.mjs &`.
- **VALIDATE**: `node tooling/build-journey.mjs all` → chromium + firefox + webkit, zero fails, zero
  page errors. Record the summary in the report.
- **SATISFIES**: AC8

### 13 · Motion polish + the hallway test

- **IMPLEMENT**: work inside the existing `@media (prefers-reduced-motion: no-preference)` block at
  `build.html:549-553`. Per CRAFT.md §Motion — **bounce only on things you touch**, settle for things
  that arrive, and **every animation ends at the true at-rest state**:
  - press/release feedback on the remaining touchable controls that lack it (the wizard's Next/Back,
    the keep rail's download and copy-link buttons, the import act's swatch buttons) using
    `--motion-bounce` + `--motion-ease-bounce`, transform/opacity only;
  - hover/focus-visible transitions on the same set using `--motion-fast` + `--motion-ease`;
  - hover must **add** contrast or motion, never remove information (CRAFT.md L47).
  Then walk the whole flow once end to end at 1440 and at 390 — import, ten questions, board edits,
  each of the five patterns, the keep rail — and note what feels wrong. Fix what is cheap; log what
  is not.
- **GOTCHA**: **no entrances.** `build.html:544-548` states in committed prose that there are none,
  and the board and the stage rebuild on every keystroke (memory:
  `entrance-anim-continuous-rebuild` — an entrance on a rebuilt node restarts and blanks). Rest ==
  final is also what keeps the VR baselines stable (memory: `vr-gate-captures-no-preference` — the
  gate captures under **no-preference**, so a JS-gated `matchMedia('reduce')` control WILL churn).
  If an entrance is added anywhere despite this, that comment must be rewritten in the same commit
  to say what is now true.
- **VALIDATE**: at rest under `animations: 'disabled'` the page is pixel-identical to at rest without
  it (i.e. Task 14's diff shows only the Task 10 copy/layout changes, never a motion artefact);
  reduced-motion pass shows final states instantly; keyboard-only pass through all six acts.
- **SATISFIES**: AC9

### 14 · The generated cascade and the VR baselines

- **PRECONDITION (blocking).** `git status` must be clean of unrelated edits before any capture.
  As of planning, the shared worktree carries another session's uncommitted copy edits to
  `index.html`, `roundtrip.html`, `derive.html`, `instance.html`, `trace.html` — **two of those are
  VR'd pages**, and `update:docker` screenshots the WORKING TREE (memory:
  `vr-gate-reads-working-tree`). Capturing over that tree bakes another ticket's copy into this
  ticket's baselines. Capture from a clean detached worktree under `/Users` (not `/private/tmp` —
  Docker file sharing).
- **IMPLEMENT**, in order:
  1. `git add` this ticket's files **first** — `gen-loc-summary` reads committed index blobs
     (`git show :<path>`), so a regen before staging reports a false "no drift" (memory:
     `loc-summary-counts-tracked-only`).
  2. `node agent-layer/gen-system-graph.mjs` — the new `ds-sequence-step` components.css block is a new
     **consumer node** in factory.html's `#shape` exhibit (`gen-system-graph.mjs:66-84` parses the
     block headers). Diff `system/system-graph.json` and confirm exactly one consumer was added.
  3. `node agent-layer/gen-loc-summary.mjs` — components.css and the touched `system/*.mjs` all sit
     in the `runtime` group. File count moves only if a new `system/*.{css,mjs,js}` lands (this
     ticket adds none — `system/specs/*.md` is not counted); `linesApprox` will move by a rounding
     step or two.
  4. `node tooling/drift-check.mjs` — must be green before any capture.
  5. **Baselines to re-capture, knowingly (expect 6 PNGs across 2 packs):**
     - `build` ×2 — Task 10's copy + the new arrangement CSS
     - `approach` ×2 — renders `loc-summary.json`'s numbers (memory: `loc-summary-baseline-cascade`)
     - `factory` ×2 — renders `system-graph.json` (the new consumer node)
     Nothing else should move. If anything else does, stop and find out why.
     `cd tooling/visual-regression && npm run update:docker`
  6. **Verify the digits actually moved.** A green update run is not proof a page changed —
     `maxDiffPixels: 100` swallows a few changed characters (memory: `vr-tolerance-hides-text-changes`),
     and `update:docker` will not rewrite a baseline whose only change is sub-perceptual (memory:
     `vr-update-skips-subperceptual`). If `approach`/`factory` PNGs do not rewrite, `rm` them and
     re-run. Eyeball the new `build` PNGs.
  7. **CLAUDE.md**: the architecture-map lines for `pattern-rules.mjs` and `pattern-render.mjs`
     ("out-of-library patterns render the honest refusal card, not a fake") need a touch-up to say
     all five render and the refusal is the guardrail for the next one. The "New /build pattern"
     entry under *Where new code goes* stays accurate — re-read it and confirm.
- **VALIDATE**: `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` ·
  `node agent-layer/gen-loc-summary.mjs --check` · `node tooling/build-checks.mjs` ·
  `node tooling/build-journey.mjs all` · `cd tooling/visual-regression && npx playwright test` — all ✓.
- **SATISFIES**: AC10

### 15 · Ticket hygiene

- **IMPLEMENT**: commit the plan (`.claude/plans/build-full-pattern-library.md`), the implementation
  report (`.claude/reports/`) and the PR review (`.claude/code-reviews/pr-<N>-review.md`) **in this
  PR** — CLAUDE.md records four artifacts lost to worktree removal on PRs #97–#100. PR body carries
  `Closes #139`. Note the `build-card.mjs` live bug and its fix explicitly in the report.
- **VALIDATE**: `gh pr view <N> --json body` shows the trailer; the issue closes on merge.
- **SATISFIES**: AC11

---

## TESTING STRATEGY

No suite exists (CLAUDE.md): the gates are the tests, and both /build gates are committed.

### Unit (pure, in CI)

`node tooling/build-checks.mjs` — the seven groups. Slice 2's work lands in groups 1, 2, 3 and 6.
Every new assertion must be **proved able to fail** by mutating the source it checks (memory:
`check-that-cannot-fail`).

### Integration (cross-engine, operator-run)

`node tooling/build-journey.mjs all` — chromium + firefox + webkit against the real page. Slice 2
adds the three pattern paths, one hub-through-the-editor path, one share round-trip over a new
pattern, and the pattern-spec.md assertion.

### Visual

`cd tooling/visual-regression && npm run update:docker` then `npx playwright test`. Expected churn:
`build` ×2, `approach` ×2, `factory` ×2. Anything else is a finding.

### Edge cases that must be exercised

- A board with **zero affordances but two or more places** → the "nothing to arrange yet" card, and
  the string "not in the library" appears nowhere. *(This is the live bug; it is the single most
  important new assertion in the ticket.)*
- A board at `MAX_PLACES × MAX_AFFORDANCES` → every pattern caps at `SLOT_MAX`; feed's 36 candidates
  become 6, **and the page says so with the real total** (the only pattern where the cap truncates).
- An `onboarding` board whose middle place has no affordances → `warn` tone, `detail` key absent
  entirely (not an empty string).
- A `settings` board reached by editing (rule 2), not by answering — the only route that exists.
- An astral character (emoji) landing exactly on each new `clip()` budget in `stepsBody`.
- The share round-trip: encode a `steps` build, decode in a fresh context, same render.
- Reduced-motion: final states instantly, no entrance anywhere.
- Keyboard-only pass through all six acts.

---

## VALIDATION COMMANDS

- **L1 syntax/style**: `node --check` on every changed `.mjs` · `node tooling/token-lint.mjs`
- **L2 unit**: `node tooling/build-checks.mjs` (+ the mutation sweep on the new assertions)
- **L3 generated-artifact integrity**: `node agent-layer/gen-handoff.mjs` ·
  `node agent-layer/gen-vocabulary.mjs` · `node agent-layer/gen-pack-bundle.mjs` ·
  `node agent-layer/gen-system-graph.mjs` · `node agent-layer/gen-loc-summary.mjs` ·
  `node tooling/drift-check.mjs` · `node agent-layer/gen-loc-summary.mjs --check`
- **L4 functional**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/build-journey.mjs all`; manual pass at 1440 and 390 under neutral + saulera + an
  imported pack
- **L5 visual**: `cd tooling/visual-regression && npm run update:docker && npx playwright test`

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** `system/specs/sequence-step.md` exists and parses; `ds-sequence-step` has a token-only
      `system/components.css` block and an `agentic-renderer.mjs` `TEMPLATES` entry; `vocabulary.json`,
      `pack.json` and `pack.bundle.json` are regenerated and committed; `token-lint` and `drift-check`
      are green.
- [ ] **AC2** All five `PATTERNS` entries carry `inLibrary: true` / `needs: null`; the field pair is
      retained and documented as pattern six's contract.
- [ ] **AC3** `slotsFor` derives onboarding · feed · settings **counted from the board** — positions
      and totals from board order, feed from every place's affordances in the board's own order (no
      invented recency), settings from the entry place's affordances — every value a string, every
      branch capped at `SLOT_MAX` (and `SLOT_MAX`'s "stated bound, not a working truncation" comment
      amended, since feed is the one pattern where it does truncate); `compose` maps them to
      `sequence-step` / `list-row` / `list-row` and each composition validates against the real
      generated vocabulary.
- [ ] **AC4** The out-of-library copy no longer fires for an in-library pattern: the "no slots to
      draw" case has its own card body and its own `pattern-spec.md` sentence, and the string
      "not in the library" cannot appear for any of the five. (Fixes a bug reachable on `main`.)
- [ ] **AC5** The three patterns render on /build through the existing vocabulary-validated renderer,
      each with its own arrangement, under an imported pack as well as neutral.
- [ ] **AC6** No committed copy on the page or in a download states anything false about library
      coverage — **guarded by a `build-checks` group 1 string check over `build.html`, not by
      reading**; the feed's ordering AND its truncation are stated honestly on the page (the board
      records no time, and the stream shows the first six of however many the board holds).
- [ ] **AC7** `build-card.mjs` emits a well-formed, escaped SVG for all five patterns, hostile tokens
      falling back and hostile labels escaped once, including the new step body's clip budgets.
- [ ] **AC8** `build-checks` assertions are invariant-shaped, not roster-shaped, and each new one has
      been proved able to fail; `build-journey all` passes on three engines covering all five paths.
- [ ] **AC9** Motion polish is press/hover/focus only, inside the reduced-motion block, rest == final;
      the "no entrance animations" claim in `build.html` is still true (or rewritten if not).
- [ ] **AC10** All gates green: `drift-check`, `token-lint`, `loc-summary --check`, `build-checks`,
      `build-journey all`, VR with the six knowingly re-captured baselines and no others.
- [ ] **AC11** Plan, report and review committed in this PR; PR body carries `Closes #139`.

---

## COMPLETION CHECKLIST

- [ ] Spec → CSS → renderer template → regen, in that order (never a template before a spec)
- [ ] Every new `build-checks` assertion mutation-tested
- [ ] The `build-card` live bug has a named regression assertion, and it fails when reverted
- [ ] Working tree clean before the VR capture; six baselines re-captured, no others churned
- [ ] `approach` / `factory` PNGs actually rewritten (or `rm`'d and forced)
- [ ] CLAUDE.md architecture-map lines updated
- [ ] `/agentic-ui-study` re-checked by hand after the shared-renderer edit
- [ ] Plan + report + review committed in this PR; `Closes #139` in the body

---

## OPEN QUESTIONS / ASSUMPTIONS

- **A1 (decided by the owner at planning)** One new spec — `sequence-step`. Feed and settings render
  through `list-row`. If implementation finds a field `list-row` genuinely cannot carry, that is an
  AMENDMENT with the evidence, not a quiet second spec.
- **A2 (decided at planning, not left open)** The component is `sequence-step`, class
  `.ds-sequence-step` — a deviation from the ticket's sketched `ds-step`, made because the component
  name becomes a `vocabulary.json` key an agent is prompted with beside `plant-card` and `stat-tile`,
  where a bare `step` reads as a verb rather than a thing. The class follows the component name, as
  `list-row → .ds-list-row` and `metric-tile → .ds-metric-tile` do. Reverting to `step` is one line
  in Task 1 **before Task 4 runs** — after the regen it means a second regen and a vocabulary-key
  change in `compose`.
- **A3** The feed reads the board's own order and says so. The rejected alternative (reverse order,
  to gesture at "newest first") invents recency the board does not record — the exact class of
  invention `pattern-rules.mjs:163-167` forbids. If the owner wants the reverse reading, it needs a
  sentence on the page that says the order is the board's, reversed, and why.
- **A4** `renderOutOfLibrary` (pattern-render) and the out-of-library card body (build-card) are
  retained but become **unexercised** after the flip: no `PATTERNS` entry has `inLibrary: false`, and
  neither function can be reached with a synthetic id (both look the pattern up in the frozen
  `PATTERNS`). Accepted deliberately — deleting them means pattern six ships a fake before anyone
  notices — and marked as such in both files and in `build-checks` group 1's vacuous clause. The
  reachable guardrail that IS tested is the renderer's own refusal on an unknown component name.
- **A5** No new semantic tokens. If `ds-sequence-step`'s badge genuinely needs one, it goes into
  `tokens.source.json`'s **contract** group first, then `gen-token-css.mjs`, then `gen-handoff` —
  and the churn list in Task 14 grows (every pack, the DTCG source, Style Dictionary output).
- **A6** The uncommitted copy edits in the shared worktree belong to another session. This ticket
  does not touch or commit them; Task 14 only requires they be out of the tree at capture time.

---

## NOTES (open canvas)

### Why one spec and not three

The ticket sketched `ds-step`, `ds-feed-item`, `ds-settings-row`, and explicitly deferred the call:
*"decided against the real props of existing components at build time, same discipline as slice 1c's
ds-queue-row call."* That call concluded **don't add it — `list-row` carries it**. Running it three
more times, against what the board can actually supply:

| pattern | derived slot | existing primitive? |
| --- | --- | --- |
| settings | affordance label + destination place label | **`list-row` exactly** — `{label, value}` |
| feed | affordance label + destination + source place | **`list-row` exactly** — `{label, value, meta}` |
| onboarding | position in the sequence + label + what advances it | **nothing carries an ordinal** |

The tell is what the committed `needs` strings promise versus what a breadboard holds. `feed.needs`
says *"a post component with an author, a timestamp and a body"* — a breadboard has no author, no
timestamp and no body. `settings.needs` says *"a row component that pairs a label with a control and
its current value"* — a breadboard has no control and no value. Building components with those names
and none of those props would be naming a component after a pattern instead of after what it does,
which is the mistake `metric-tile` vs `stat-tile` was drawn to avoid (`metric-tile.md:21`: *carries
no domain vocabulary*). `onboarding.needs` says *"a step component that carries its position in a
sequence and whether it is done"* — half of that IS countable (position), and the other half (done)
is exactly the invented fact the spec must refuse. So one spec, with the refusal written into it.

**The cost, stated:** feed and settings render through the same primitive, so their visible
difference is arrangement and content, not component. If a hallway test says they read as the same
screen twice, the fix is the arrangement CSS first — and a second spec only if arrangement genuinely
cannot carry it. That would be an amendment with evidence.

### The dead-branch question, resolved

Flipping all five to `inLibrary: true` makes `renderOutOfLibrary` and the out-of-library card body
unreachable. Three options were weighed:

1. **Delete them.** Cheapest, and wrong: the next pattern added to `PATTERNS` would have no refusal
   path, and the first person to add one would ship a fake before noticing. CLAUDE.md's *New /build
   pattern* entry states the refusal card is *"the correct outcome, not a gap to fill with markup"* —
   deleting the machinery contradicts a committed rule.
2. **Derive `inLibrary` from `compose`.** Elegant (the claim becomes measured rather than declared)
   but circular: `pattern-rules.mjs` is deliberately import-free and `pattern-render.mjs` imports
   *it*. Would need a third module for a one-field win. Rejected as scope creep — worth revisiting
   if a sixth pattern ever lands.
3. **Retain, document, and make the *reachable* guardrails tested.** Chosen. The branches stay with
   a comment naming them as pattern six's contract; `build-checks` group 1 keeps an
   `inLibrary: false ⇒ needs` clause that is vacuous today and says so in a comment; and the guardrail
   that IS reachable — the renderer refusing a composition naming a component outside the generated
   vocabulary — gets a direct assertion.

The important consequence: **because the out-of-library body stops being the empty-slot fallback, the
empty-slot case needs a body of its own** — which is what surfaced the live bug below.

### The live bug, and why it belongs in this ticket

`build-card.mjs:203` gates on `pattern && pattern.inLibrary && rows.length`. The `else` hard-codes
*"is not in the library yet"*. An in-library pattern whose slots come out empty therefore downloads
an SVG asserting something false. Reproduced on `main`:

```
board: two places, every affordance removed, shape = worklist
pattern: queue | slots: []
header:  "Your breadboard · Queue is not in the library yet"
```

`build-keep.mjs:258-263` only hides the card when the board has **zero** places, so this is a state a
visitor reaches with two clicks. The same shape appears at `build-keep.mjs:138`, where
`pattern.needs` will interpolate as `null` after the flip. Both live in the code this ticket rewrites,
both are one conditional each, and both are on the page whose entire argument is that it does not say
false things. Fixing them here is right; calling it out in the report is what keeps the fix honest.

### Blast radius beyond /build

`system/agentic-renderer.mjs` is shared canon: `/agentic.html`, `system/agentic-study.mjs` (the study
page and the private instance's bespoke prototype slot) and the two Fieldwork slots all render
through it. Adding a `TEMPLATES` key is strictly additive and cannot change an existing render — but
the file is not /build's, and the commit should say so. Re-check `/agentic-ui-study` once by hand.

`system/components.css` is loaded by every shipped page. A new block adds bytes everywhere and a node
to factory.html's measured graph; it changes no existing page's pixels, which is what the `factory`
baseline diff should confirm (one more node, nothing else moved).

### Sequencing risk

The single ordering trap: **the composition cannot validate until `sequence-step` is in the generated
vocabulary.** Write the spec, the CSS and the template, regenerate, and only then touch
`pattern-render.mjs` — otherwise `build-checks` group 3 fails for a reason that looks like a rules bug
and is actually a missing regen.

### Appetite

Small batch by this epic's own standard — one primitive, three derivations, three copy repairs, two
gate extensions, six baselines. If a circuit breaker is needed: cut the **motion polish** (Task 13)
to a follow-up. Never cut the copy repairs (Tasks 8–10) — shipping the flip without them puts a false
statement in a downloaded file — and never cut the mutation sweep in Task 11.

## AMENDMENTS

*(none yet — append newest at the bottom)*
