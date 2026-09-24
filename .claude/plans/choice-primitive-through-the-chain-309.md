# Feature: `choice` through the chain — checkbox or radio, one part with a group name (#309, G32)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Every code block below was driven in a scratch worktree at `origin/main` `8eb35a9` before this plan was written** (NOTES § Pre-flight). The spec, the CSS block, the template, group 18's section D and catalog-journey case 14 are quoted as they ran green, with the mutations that turn each one red. Copy them; do not re-derive them.

## Feature Description

`choice` is the fifth and last of epic #295's new generic primitives: one part that renders a real checkbox or a real radio beside its label. `kind` picks the control, `group` becomes the input's native `name` (so radios sharing a group are one exclusive set, enforced by the browser), and `label` / `hint` / `checked` / `disabled` match the field components. With it the PRD's ten primitives are complete: five existing parts, five new.

## User Story

As the composing agent (and the owner reading its output)
I want to put a checkbox or a set of radios on a composed screen
So that a flow with a consent line, a delivery option or a one-of-three answer can be composed from the vocabulary without a hand-written component.

## Problem Statement

The vocabulary has no selection control. `toggle-switch` is an action (it flips a setting and emits on the bus), `select-field` depicts a closed dropdown. A Faster Payment screen with "Email me receipts" or "Standard / Express" cannot be composed today (PRD MVP 4, G32).

## Solution Statement

One spec (`system/specs/choice.md`), one token-only CSS block, one template, and `choice` added to `stack.children` so a radio group can be composed as `stack > choice × N`. The control is the engine's own `<input>`, tinted with `accent-color` (no redrawn box). Exclusivity is the platform's `name` rule, so no script is written. Build-checks group 18 gains section D (the checkbox example by name, a rendered three-radio group, the `kind` enum refusal run through `validateComposition`); `catalog-journey` gains case 14 (real clicks in three engines, computed states under three packs), because exclusivity is the one claim a DOM stub cannot observe.

## Out of Scope / Non-Goals

- Not included: a `fieldset` / `radiogroup` container with a legend. A radio set's question is the composition's (a `text` part above the stack). Named as a gap in the spec's Accessibility section; see Q2.
- Not included: a `value` prop (what a form would submit). Nothing in this vocabulary submits a form; the native default `on` stands.
- Not included: bus emission. A pick is not an intent in this vocabulary (text-field / select-field precedent); `toggle-switch` stays the action (G32).
- Not included: a wrapper (`system/wc/vd-choice.mjs`). The wrapper histogram moves 3/22 → 3/23 as an honest absence, the icon/list/stack/text precedent.
- Not changing: `toggle-switch`, `text-field`, `select-field`, any Verdant proto, any token (standing rule: no token work), `system/param-manifest.json` (no live control), any `system/*.mjs` file count (standing rule: no new `system/*.mjs`).
- Not changing: `import/recognise.mjs` or any import rule. The importer fixtures move add-only (+66/−0 each) and are regenerated, not edited.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (small code, long regen and baseline cascade)
**Primary Systems Affected**: `system/specs/`, `system/components.css`, `system/agentic-renderer.mjs`, `system/palette.mjs`, `handoff/verdant/`, `import/fixtures/`, `tooling/build-checks.mjs`, `tooling/catalog-journey.mjs`, VR baselines
**Dependencies**: none new. Playwright is already resolved out of `tooling/visual-regression/node_modules`.

## Related Work

**Implements**: #309   ·   **Epic**: #295 — `docs/epics/canvas-design-import.prd.md` (MVP 4, G24, G32) and `docs/epics/canvas-design-import.architecture.md:263-266` ("`choice` carries `kind` and a group name").

**Back-references**:

- `.claude/plans/list-primitive-through-the-chain-303.md` — Why: same chain shape; its catalog-journey case 12 is the computed-style-with-a-control precedent.
- `.claude/plans/icon-primitive-gen-icons-305.md` + `.claude/reports/icon-primitive-gen-icons-305-report.md` — Why: the most recent primitive; its deviations A1 (renderer template count), A2 (histogram copies) and A4 (a mutation that CRASHES a group instead of naming a failure) all recur here and are pre-empted below.
- `.claude/plans/stack-text-primitives-rendermarkdown-links-301.md` — Why: `stack.children` and the DOM stub.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/specs/text-field.md` — Why: the field-prop shape (`label` / `hint` / `disabled`), the implicit-label accessibility argument `choice.md` cites.
- `system/specs/toggle-switch.md` — Why: the part `choice` must NOT become (action vs selection).
- `system/specs/stack.md:16` (children) and `:33` (the prose that names the landed primitives) — Why: both change.
- `system/agentic-renderer.mjs:21` and `:264` — the "twenty-five templates/specs" counts (→ twenty-six). `:169-179` `el()` — `true` writes an empty attribute, `false`/`null` writes none, which is how `checked`/`disabled` work. `:574-617` text-field / search-input / select-field templates — Why: the template goes directly after `select-field` (ends `:617`).
- `system/components.css:2113-2153` (`ds-text-field`) — focus-outline rule mirrored. `:2550-2593` (`ds-icon`) — the new block goes directly after it, before `/* ---------- Verdant screen scaffolding` (`:2595`). `:3028-3030` (`.dock-pack-row`) — the `accent-color` and `:has()` precedent.
- `system/palette.mjs:35-41` — `CATALOG_COMPONENTS`.
- `tooling/build-checks.mjs:74-78` (header index entry 18), `:94` ("3/22"), `:350-411` (`domStub`, `stubFindAll`, `stubText`, `domStubControl`), `:4222-4590` (group 18, sections A/B/renderMarkdown/C; section C ends with `parserRefusalNames = …; }` at `:4589-4590`), `:4592` (`group("docs chain", …)`), `:5027-5054` (21.4 histogram tripwire note + pin).
- `tooling/catalog-journey.mjs:1-25` (header, "3/22" at `:14`), `:81-95` (`t`, `newPage`, `ctx`), `:318-330` (case 11 and why it avoids saulera), `:434-506` (case 13; case 14 goes directly after its last `t(…)` at `:505-506`, before `await page.close();`).
- `tooling/visual-regression/visual.spec.mjs:122-128` (the shot-budget comment "…#305 to 25 (icon)") and `:169` (the route-swap pack mechanism case 14 mirrors).
- `system/catalog.mjs:69` — "3/22" prose.
- `.claude/references/gates.md:29` (group 18), `:33` (group 21, "3/22"), `:119` (catalog-journey, "3/22").
- `agent-layer/gen-loc-summary.mjs:23,28,43` — runtime group = `system/(wc/)?*.{css,mjs,js}`, round to 100, reads the git INDEX.
- `tooling/regen-import-records.mjs:11-15` — a new spec moves the two records (CLAUDE.md's "New component spec" bullet names it).

### New Files to Create

- `system/specs/choice.md` — the spec (verbatim below).

### Relevant Documentation

- [MDN `<input type="radio">` — defining a radio group](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio#defining_a_radio_group) — Why: exclusivity is the shared `name`; arrow keys move within the set; one Tab stop.
- [MDN `accent-color`](https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color) — Why: tints native checkbox/radio; measured supported in all three engines (case 14 reads it back as `rgb()`).
- [MDN `:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — Why: the disabled cursor; progressive, same as `.dock-pack-row`.

### Patterns to Follow

- **Templates**: build with `el()`, never `innerHTML`; no ids minted; a real native element (text-field `:574`).
- **CSS block header**: `/* ---------- ds-choice (system/specs/choice.md) — cross-scenario library primitive ---------- */`, token-only; `tooling/token-lint.mjs` treats every `var()` as a contract reference, so no local custom properties.
- **Gate code**: every assertion is `ok(cond, message-naming-the-value)`; every render driven through the stub follows `domStubControl()`, sets and deletes `globalThis.document` in `try/finally`; **every render that can throw is folded into a named failure** (#305 A4).
- **catalog-journey**: failures reported as data, never thrown from `page.evaluate` (case 12's rule); each claim has a control in the same document and pack.

---

## IMPLEMENTATION PLAN

### Phase 1: The part (spec, CSS, template, stack, palette)
### Phase 2: The regen chain (pack, vocabulary, graph, importer fixtures)
**Depends on:** Phase 1.
### Phase 3: The gates (group 18 D, group 21 pin, catalog-journey case 14, prose copies)
**Depends on:** Phase 2 (group 18 reads the regenerated `pack.json` / `vocabulary.json`).
### Phase 4: loc-summary, commit, browser gate, pixel baselines, PR
**Depends on:** Phase 3.

---

## STEP-BY-STEP TASKS

### Task 0 — branch and tools

- **IMPLEMENT**: `git fetch origin && git switch -c feature/choice-primitive-309 origin/main`. Confirm `git rev-list --count HEAD..origin/main` → `0`. In a FRESH worktree also run `npm ci` in `tooling/icons`, `tooling/style-dictionary` and `tooling/visual-regression`.
- **GOTCHA**: the primary checkout is shared with parallel sessions (memory: shared worktree). Verify the branch right before every commit; stage by explicit path, never `git add -A` at the root (the primary tree carries ~20 unrelated untracked files).
- **GOTCHA**: without `tooling/icons/node_modules`, build-checks group 41 is red on a clean `main` — observed in pre-flight: `41.7: genIcons({check:true}) THREW — … Install it: cd tooling/icons && npm ci`. Without `tooling/style-dictionary/node_modules`, `drift-check` fails at `sd tokens`. Neither is this ticket's regression.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓  all 42 groups pass` (observed on `8eb35a9` after the installs).
- **SATISFIES**: precondition. **REGENERATES**: none.

### Task 1 — CREATE `system/specs/choice.md`

- **IMPLEMENT**: exactly this file.

````markdown
```json
{
  "component": "choice",
  "status": "shipped",
  "class": "ds-choice",
  "contract": null,
  "props": {
    "kind": { "type": "string", "required": true, "enum": ["checkbox", "radio"], "description": "which control — a checkbox is picked on its own, a radio is one of a set; never defaulted" },
    "group": { "type": "string", "required": true, "description": "the set this control belongs to, written to the input's native name — radios sharing a group are one exclusive set, checkboxes sharing one stay independent; the scope is the whole document" },
    "label": { "type": "string", "required": true, "description": "what the control picks — \"Email me receipts\" — always visible beside it and read as its accessible name" },
    "hint": { "type": "string", "required": false, "description": "one persistent line under the label; absent renders nothing" },
    "checked": { "type": "boolean", "required": false, "description": "the starting state; absent means unchecked" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-fg", "--color-fg-muted", "--spacing-sm", "--spacing-xs", "--type-body", "--type-caption"],
  "states": ["default", "checked", "focus", "disabled"],
  "children": [],
  "example": { "kind": "checkbox", "group": "receipts", "label": "Email me receipts", "hint": "One message per payment.", "checked": true }
}
```

## Usage

The one choice part: a checkbox or a radio, beside its own label. Library-generic (`ds-`, cross-scenario). Use it wherever a composed screen depicts picking — a consent line, a delivery option, one answer out of three. It is a REAL `<input>`, not a picture of one (the text-field precedent), so clicking, keyboard selection and the native checked state all behave as the engine does them.

**One part, two kinds.** Checkbox and radio share everything but one rule — whether picking this one un-picks its neighbours — so they are one component with `kind`, not two. That rule is the platform's own: `group` becomes the input's native `name`, and radios sharing a name are one exclusive set while checkboxes sharing a name never are. No script enforces it, so nothing can disagree with the engine about which radio is on. `kind` is required, on `stack.direction`'s argument: a control that defaults to a checkbox is a control whose composer never had to say which one they meant.

**`group` is required for both kinds.** The validator has no conditional rule, so it cannot demand a group from a radio and not from a checkbox — and a radio with no name is a loner the reader can switch on and never switch off. For a checkbox the group is simply the field's name, the thing a form would submit it under. A group is scoped to the **whole document**: two sets that happen to share a group string anywhere on one page are one set, so name them for what they choose ("delivery", "receipts"), never with a generic word. The site's own appearance dock already uses `pack`.

**A radio set is a composition**, not a part: a `stack` holding one `choice` per option, every one carrying the same `group`. The set's question ("How should we deliver it?") is a `text` part above the stack.

**Not a switch.** `toggle-switch` stays its own part: a toggle is an action — it flips a setting now and reports it on the bus — and a choice is a selection a form would submit later. Like the other fields, this part emits nothing onto the bus; the consuming product owns what a pick means.

## States

- **default** — the native control at the engine's own size, tinted `--color-accent` through `accent-color`, beside the label in `--color-fg` at `--type-body`; the hint under it in `--color-fg-muted` at `--type-caption`.
- **checked** — the engine's own tick or dot in `--color-accent`. The mark, not colour alone, states the pick.
- **focus** — the 2px `--color-accent` outline on the input, offset outside it: the text-field rule, which survives forced-colors mode and never shifts layout.
- **disabled** — the native `disabled` attribute; the label drops to `--color-fg-muted` and the row takes `cursor: not-allowed`. The control keeps its checked state, so a disabled pick still reads as picked.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent passes the display strings and the starting state. A reader's click changes the native checked state and the component never reports it anywhere (see Usage).

| Prop | Element | When absent |
| --- | --- | --- |
| `kind` | the input's `type` | required — a choice that does not say which control it is |
| `group` | the input's `name` | required — a radio with no name cannot be un-picked |
| `label` | the visible text inside the wrapping `<label>` | required — an unlabelled control fails the reader before it fails a checker |
| `hint` | the persistent line under the label | renders nothing |
| `checked` | the native `checked` attribute | renders unchecked |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

The input is nested inside its own `<label>`, the text-field precedent: implicit association, so the whole row — control, label and hint — is one click target at least 44px tall, and no template mints an `id` that two choices on one screen could collide on. The hint sits inside the label, so it joins the accessible name; that is text-field's stated trade and it holds here for the same reason. Radios sharing a group move with the arrow keys and take one Tab stop, and checkboxes take one Tab stop each — both native, both free. Colour is never the only signal: the tick or the dot states the pick. **One gap, named rather than papered over with a role:** the stack a radio set sits in has no group semantics, so assistive tech hears each radio's own label but not the set's question; a consuming product that needs it wraps the set in a `fieldset` with a `legend`. Contrast: `--color-fg` and `--color-fg-muted` on the page ground are declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5).
````

- **GOTCHA**: `example.group` is `receipts`, deliberately not `pack` — the site dock's own radios use `name="pack"` (`system/dock.mjs:163`) and the dock is on `/components`. Radio names are document-scoped.
- **GOTCHA**: the `tokens` list must match the CSS block's `var()`s exactly (7 tokens → `gen-system-graph` gives `ds-choice` 7 edges; observed 550 → 557).
- **VALIDATE**: after Task 6, `node agent-layer/gen-vocabulary.mjs` → `vocabulary      ✓  26 components` (observed). It validates `example` SEMANTICALLY (it must render).
- **REDDENS**: `"example": {"kind": "toggle", …}` → `gen-vocabulary` exit 1 naming `system/specs/choice.md: head "example" does not render — choice.example.props.kind: "toggle" is not in enum [checkbox | radio]` (expected; the mechanism was observed by #305 as its M-G).
- **SATISFIES**: AC #1. **REGENERATES**: the handoff pack (Task 6).

### Task 2 — UPDATE `system/specs/stack.md`

- **IMPLEMENT**: `:16` children → `["card", "choice", "ghost-button", "icon", "list", "modal-dialog", "nav-tabs", "primary-button", "screen-header", "select-field", "stack", "text", "text-field"]` (alphabetical). `:33` replace "`stack` and `text` (#301), `list` (#303) and now `icon` (#305), the fourth to land, with one remaining and arriving the same way." with "`stack` and `text` (#301), `list` (#303), `icon` (#305) and now `choice` (#309), the fifth and last, which completes the ten."
- **GOTCHA**: group 3's deep walk (`build-checks.mjs:878-903`) picks the FIRST non-container leaf in each container's children; `choice` is a leaf and "card" stays first, so the walk's pairs do not change (observed: group 3 green).
- **VALIDATE**: covered by group 18 D's `radioErr === null` assertion (Task 7).
- **REDDENS**: drop `"choice"` from the list + regen → group 18 ✗ 5, first `a radio group of three choices in a stack is refused by the REAL vocabulary — stack.children must list "choice": composition.children[0]: "choice" is not an allowed child of stack …` (observed, M2).
- **SATISFIES**: AC #2. **REGENERATES**: the handoff pack.

### Task 3 — UPDATE `system/components.css`

- **IMPLEMENT**: insert this block directly after the `ds-icon` block's last rule (`.ds-icon[data-refused] { … }`), before `/* ---------- Verdant screen scaffolding`, with one blank line on each side (match the surrounding blocks).

```css
/* ---------- ds-choice (system/specs/choice.md) — cross-scenario library primitive ---------- */

/* The fifth of epic #295's generic primitives (#309, PRD G32): a checkbox or a radio, one part.
   The control is the engine's own input, tinted through accent-color (the .dock-pack-row
   precedent) rather than redrawn — a redrawn box is a second implementation of checked, focus and
   forced-colors that three engines each get slightly wrong. Exclusivity is the input's native
   name, written by the template from `group`; no rule here takes part in it. The input is nested
   in its <label>, so the whole row is the target: 44px min-height, the text-field floor. */
.ds-choice {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  min-height: 44px;
  padding: var(--spacing-xs) 0;
  color: var(--color-fg);
  font-size: var(--type-body);
  cursor: pointer;
}
.ds-choice-input {
  flex: 0 0 auto;
  /* One line-box down from the row's top edge so the control sits on the label's first line. */
  margin: var(--spacing-xs) 0 0;
  accent-color: var(--color-accent);
  cursor: inherit;
}
.ds-choice-input:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.ds-choice-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  /* A long label wraps inside a flex row rather than blowing it out (the ds-stack precedent). */
  min-width: 0;
}
.ds-choice-hint {
  color: var(--color-fg-muted);
  font-size: var(--type-caption);
}
/* Disabled reads off the INPUT, through the sibling combinator: the template sets `disabled` on
   the input alone, so there is one source of the state and no class that could disagree with it.
   The label inherits the muted colour; the hint is muted already. The checked mark stays — a
   disabled pick still reads as picked. The cursor needs :has() (the .dock-pack-row precedent) and
   is progressive: without it the row keeps the pointer and the native disabled still refuses. */
.ds-choice:has(.ds-choice-input:disabled) { cursor: not-allowed; }
.ds-choice-input:disabled + .ds-choice-text { color: var(--color-fg-muted); }
```

- **GOTCHA**: the disabled rule depends on DOM order `input` then `span.ds-choice-text` (Task 4). Reordering the template silently kills it; case 14's disabled assertion is what sees that.
- **GOTCHA**: memory (overflow-clip breaks sticky / hidden defeated by author display) — neither applies: no `hidden`, no sticky.
- **VALIDATE**: `node tooling/token-lint.mjs` → `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed with this block).
- **REDDENS**: delete `accent-color: var(--color-accent);` → case 14 ✗ ×3 `tint auto vs accent rgb(37, 99, 235)` (observed, C3). Delete the disabled colour rule → case 14 ✗ ×3 `label rgb(26, 26, 26) … muted rgb(107, 114, 128)` (observed, C4). Mute every label → case 14's control ✗ ×3 `enabled rgb(107, 114, 128) fg rgb(26, 26, 26)` (observed, C5).
- **SATISFIES**: AC #1. **REGENERATES**: `system/system-graph.json` (Task 6), `system/loc-summary.json` (Task 11), VR baselines (Task 13).

### Task 4 — UPDATE `system/agentic-renderer.mjs`

- **IMPLEMENT**: insert directly after the `select-field` template (it ends `props.hint != null ? el("span", { class: "ds-select-field-hint", text: props.hint }) : null),` at `:617`), before the `// MIRROR of care-task-row` comment:

```js

  // A checkbox or a radio (#309, G32) — the text-field shape: a real <input> nested in its own
  // <label>, no ids minted. `group` IS the native name, which is the whole of radio exclusivity:
  // the engine enforces it, so no script here can disagree with it about which radio is on, and
  // checkboxes sharing a name stay independent because that is what the platform does. No bus: a
  // pick is not an intent in this vocabulary (spec's Usage prose); toggle-switch is the action.
  "choice": (props) =>
    el("label", { class: "ds-choice", "data-kind": props.kind },
      el("input", {
        type: props.kind,
        class: "ds-choice-input",
        name: props.group,
        checked: props.checked === true,
        disabled: props.disabled === true,
      }),
      el("span", { class: "ds-choice-text" },
        el("span", { class: "ds-choice-label", text: props.label }),
        props.hint != null ? el("span", { class: "ds-choice-hint", text: props.hint }) : null)),
```

  And `:21` "The twenty-five templates" → "The twenty-six templates"; `:264` "the twenty-five specs" → "the twenty-six specs" (#305's A1: no gate reads these, so they drift silently).
- **GOTCHA**: `class: "ds-choice"` must stay a plain string literal — group 23's `emitsClass` matches `class: "<cls>"` or a template-literal form in the SOURCE text (`build-checks.mjs:5493-5496`).
- **GOTCHA**: `type: props.kind` is safe only because `validateComposition` runs first and the enum limits it to `checkbox|radio`; do not loosen the enum.
- **VALIDATE**: `node --check system/agentic-renderer.mjs` → clean; group 3 "every vocabulary entry has a template" stays green after Task 6.
- **REDDENS**: `name: props.group` → `name: "one-name"` → case 14 ✗ `two radios in DIFFERENT groups both stay checked … {"atRest":[false,true]…` (observed, C1; group 18 D stays green on it — the reason the control lives in case 14). Delete the `name` line → group 18 ✗ 2 (`… name=null`, `… got [, , ]`) and case 14 ✗ 2 (`picking Express un-picks Standard …`, `ArrowUp …`) (observed, M3/C2). `checked: true` constant → group 18 ✗ `checked and disabled did not land on exactly the radios that declared them` (observed, M5).
- **SATISFIES**: AC #1. **REGENERATES**: `system/loc-summary.json`.

### Task 5 — UPDATE `system/palette.mjs`

- **IMPLEMENT**: add `"choice"` to `CATALOG_COMPONENTS` in alphabetical position (after `"care-task-row"`), reflowing the four lines to similar widths.
- **VALIDATE**: group 21.2 green after Task 6.
- **REDDENS**: omit it → group 21 ✗ `palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary …` (observed on #305 as M-F; same code path).
- **SATISFIES**: AC #3 (`/components`). **REGENERATES**: `system/loc-summary.json` (0 net lines if reflowed within four lines).

### Task 6 — REGENERATE the pack, the graph and the importer fixtures (order is the contract)

- **IMPLEMENT**, in this order (the bundle inlines the pack; the index measures the bundle):
  ```
  node agent-layer/gen-handoff.mjs          # → handoff pack    ✓  26 specs + 3 token targets + 3 wc wrappers
  node agent-layer/gen-vocabulary.mjs       # → vocabulary      ✓  26 components
  node agent-layer/gen-pack-bundle.mjs      # → pack bundle     ✓  16 files
  node agent-layer/gen-pack-index.mjs       # → pack index      ✓  17 files
  node agent-layer/gen-system-graph.mjs     # → system graph ✓  63 tokens · 49 consumers · 557 edges
  node import/regen-expected.mjs            # → expected verdict ✓ … 57579 bytes
  node tooling/regen-import-records.mjs     # → import records ✓  import/fixtures/records/ — 4 files, 187933 bytes
  ```
  (all seven lines observed in pre-flight.)
- **GOTCHA — the importer diff is the tripwire.** Observed: `git diff --numstat` → `66 0` on each of `import/fixtures/spike-c-instance.expected.json`, `import/fixtures/records/spike-c-faithful.json`, `import/fixtures/records/spike-c-wrong-but-green.json`; the two `.md` records unchanged. The 66 lines are six identical `"slug": "choice"` candidate blocks at `score 0.083` (`1/3 required props fillable from the read (label)`), inserted below the existing 0.125 candidates. **Any removal (`N  M` with M > 0) means a verdict or a top candidate moved — stop and raise it; do not commit it as noise.**
- **GOTCHA**: rerun the whole chain after ANY later edit to `choice.md` or `stack.md` prose (Usage text is a `pack.json` field; #305's third commit exists because of this).
- **VALIDATE**: `node tooling/build-checks.mjs | tail -3` → the ONLY red is group 21's `the wrapper histogram moved — 3 with / 23 without (pinned 3/22; …)` (observed). Task 8 moves it.
- **SATISFIES**: AC #3. **REGENERATES**: `handoff/verdant/{pack.json,vocabulary.json,pack.bundle.json,llms.txt}`, `system/system-graph.json`, the three importer JSONs.

### Task 7 — ADD group 18 section D to `tooling/build-checks.mjs`

- **IMPLEMENT**: insert directly after section C's closing brace (the block ending `parserRefusalNames = refusals.map((r) => r.why).join(" · ");\n  }`, `:4589-4590`) and before `group("docs chain", …)`:

```js

  // --- D · choice, the fifth primitive (#309, epic #295 G32) ------------------------------------
  //
  // The ticket names THIS group for two examples and the enum refusal, and the reason is the
  // chain: a spec's example is what 18A proves renders, so the checkbox example is asserted here BY
  // NAME — 18A's loop reads its count off the pack, which passes whether or not choice.md carries an
  // example at all. A radio GROUP cannot be one spec example (an example is one node's props), so it
  // is a composition: a stack of three radios, validated against the REAL vocabulary and rendered.
  //
  // What this cannot reach: that radios sharing a name are EXCLUSIVE. That is the engine's rule,
  // not the template's, and a DOM stub has no engine — so this pins the part the template owns (the
  // group reaching the native name, verbatim, on every input) and tooling/catalog-journey.mjs case
  // 14 clicks real radios in three engines, beside the two controls that tell exclusivity apart from
  // a constant name.
  {
    const choiceHead = PACK.components.find((c) => c.component === "choice");
    ok(choiceHead && choiceHead.example && choiceHead.example.kind === "checkbox",
      `choice's committed example is not a checkbox — 18A's count loop cannot see this (it passes with no example at all): ${JSON.stringify(choiceHead && choiceHead.example)}`);
    let choiceChecked = null;
    try { choiceChecked = validateExamples([{ head: choiceHead, path: "system/specs/choice.md" }], VOCAB); }
    catch (err) { ok(false, `choice's checkbox example does not render: ${err.message}`); }
    ok(choiceChecked && choiceChecked.checked === 1, `validateExamples checked ${choiceChecked && choiceChecked.checked} choice examples, expected exactly 1`);

    const radioGroup = {
      name: "stack", props: { direction: "column", gap: "xs" },
      children: [
        { name: "choice", props: { kind: "radio", group: "g18-delivery", label: "Standard", checked: true } },
        { name: "choice", props: { kind: "radio", group: "g18-delivery", label: "Express", hint: "Next working day." } },
        { name: "choice", props: { kind: "radio", group: "g18-delivery", label: "Collect", disabled: true } },
      ],
    };
    let radioErr = null;
    try { validateComposition(VOCAB, radioGroup); } catch (err) { radioErr = err.message; }
    ok(radioErr === null, `a radio group of three choices in a stack is refused by the REAL vocabulary — stack.children must list "choice": ${radioErr}`);

    domStubControl();
    globalThis.document = domStub();
    try {
      const inputsOf = (n) => stubFindAll(n, "input");
      // Every render folds a throw into a NAMED failure (group 39's rule, and #305's A4: a mutation
      // that made the render throw CRASHED that group and it reported nothing). Measured here too:
      // with the example deleted, a bare renderComposition took the whole run down by stack trace.
      const draw = (composition, what) => {
        try { return renderComposition(VOCAB, composition, null); }
        catch (err) { ok(false, `${what} did not render: ${err.message}`); return null; }
      };
      // The checkbox example, rendered: one input, type and name straight from the props.
      const box = choiceHead && choiceHead.example ? draw({ name: "choice", props: choiceHead.example }, "choice's checkbox example") : null;
      if (box) {
        const [bi] = inputsOf(box);
        ok(box.tagName === "LABEL" && box.getAttribute("class") === "ds-choice",
          `choice's root is not the wrapping <label class="ds-choice"> — got <${box.tagName} class=${box.getAttribute("class")}>`);
        ok(inputsOf(box).length === 1 && bi.getAttribute("type") === "checkbox" && bi.getAttribute("name") === choiceHead.example.group,
          `the checkbox example did not render one type=checkbox input named by its group — got ${inputsOf(box).length} input(s), type=${bi && bi.getAttribute("type")} name=${bi && bi.getAttribute("name")}`);
        ok(bi.getAttribute("checked") === "" && bi.getAttribute("disabled") === null,
          `checked:true must reach the native attribute and an absent disabled must write none — checked=${bi.getAttribute("checked")} disabled=${bi.getAttribute("disabled")}`);
      }

      // The radio group, rendered: three radios, ONE name, and the states on exactly the inputs
      // that asked for them. Asserting the name is identical across the three is the template's
      // whole share of exclusivity; the name being the GROUP (not a constant) is 14's control.
      const set = draw(radioGroup, "the radio group");
      const radios = set ? inputsOf(set) : [];
      ok(radios.length === 3 && radios.every((r) => r.getAttribute("type") === "radio"),
        `the radio group rendered ${radios.length} inputs, types [${radios.map((r) => r.getAttribute("type")).join(", ")}]`);
      ok(radios.every((r) => r.getAttribute("name") === "g18-delivery"),
        `every radio in the set must carry the group as its native name — got [${radios.map((r) => r.getAttribute("name")).join(", ")}]`);
      ok(radios.map((r) => r.getAttribute("checked") !== null).join() === "true,false,false"
        && radios.map((r) => r.getAttribute("disabled") !== null).join() === "false,false,true",
        "checked and disabled did not land on exactly the radios that declared them");
      const hints = (set ? stubFindAll(set, "span") : []).filter((s) => s.getAttribute("class") === "ds-choice-hint");
      ok(hints.length === 1 && stubText(hints[0]) === "Next working day.",
        `a hint renders only where declared — got ${hints.length} hint element(s)`);
    } finally { delete globalThis.document; }

    // kind outside the enum, REFUSED by running validateComposition — and "switch" first, because a
    // toggle is the one kind a composer would plausibly reach for here, and it is a separate part.
    for (const kind of ["switch", "toggle", "Radio", ""]) {
      let threw = null;
      try { validateComposition(VOCAB, { name: "choice", props: { kind, group: "g", label: "x" } }); } catch (err) { threw = err; }
      ok(threw !== null, `validateComposition accepted choice.kind "${kind}" — the enum cannot fire`);
      ok(threw && /composition\.props\.kind: ".*" is not in enum \[checkbox \| radio\]/.test(threw.message),
        `the kind "${kind}" refusal does not name the path and the enum — got: ${threw && threw.message}`);
    }
    // …and group is REQUIRED for both kinds (the spec's Usage: the validator has no conditional
    // rule, and a radio with no name can never be un-picked).
    for (const kind of ["checkbox", "radio"]) {
      let threw = null;
      try { validateComposition(VOCAB, { name: "choice", props: { kind, label: "x" } }); } catch (err) { threw = err; }
      ok(threw && /composition\.props\.group: required prop of choice is missing/.test(threw.message),
        `a ${kind} with no group was not refused by name — got: ${threw && threw.message}`);
    }
    // toggle-switch stays its own part (G32): still in the vocabulary, and still no `kind`.
    ok(Object.hasOwn(VOCAB.components, "toggle-switch") && !Object.hasOwn(VOCAB.components["toggle-switch"].props, "kind"),
      "toggle-switch was folded into choice or grew a kind — G32 keeps the action and the selection apart");
  }
```

  Then extend the `group("docs chain", …)` detail string: insert, immediately before `. That the CATALOG renders any of this is #215's`, the text:
  ` · #309's choice: the committed checkbox example asserted BY NAME (18A's derived count passes with none), a three-radio group in a stack validated against the real vocabulary and RENDERED — one native name on every input, checked and disabled on exactly the radios that declared them, a hint only where declared, every render folding a throw into a named failure — the kind enum refused by RUNNING validateComposition over four values, group required for both kinds, and toggle-switch kept apart. What this cannot reach is EXCLUSIVITY, which is the engine's: tooling/catalog-journey.mjs case 14 clicks real radios beside two controls`
  And the header index (`:74-78`): after "…moves in lockstep with the thing under test (#211)" add a line `//                     · choice's checkbox example, a rendered radio group and the kind enum's refusal (#309)`.
- **IMPORTS**: none new — `validateExamples` (`:240`), `validateComposition`, `renderComposition` (`:211`), `domStub`, `domStubControl`, `stubFindAll`, `stubText`, `PACK` (group-local, `:4228`), `VOCAB` (`:317`) are all in scope at that point (observed: the block ran green in place).
- **GOTCHA**: `PACK` here is group 18's block-local const, not a module one; the insertion point must be inside the group's `{ … }` block (it is, before `group(`).
- **VALIDATE**: `node tooling/build-checks.mjs | grep "docs chain" | cut -c1-40` → `build docs chain     ✓` (observed). Then the crash guard on the branch: apply M1 (delete `example` from `choice.md`, `node agent-layer/gen-handoff.mjs`) and require BOTH `build docs chain     ✗` naming `choice's committed example is not a checkbox` AND `node tooling/build-checks.mjs 2>&1 | grep -c "^Error:"` → `0`. A crash prints a stack and no group line. Restore and regenerate after.
- **REDDENS** (all observed in pre-flight):
  - M1 delete `example` from `choice.md` + `gen-handoff` → ✗ `choice's committed example is not a checkbox … undefined` and `validateExamples checked 0 choice examples, expected exactly 1`. **Before the `draw` fold this mutation CRASHED the whole run** with `Error: composition.props.kind: required prop of choice is missing` and no group line (#305 A4, reproduced) — keep the fold.
  - M2 drop `"choice"` from `stack.children` + regen → ✗ 5, named.
  - M3 delete the template's `name` line → ✗ 2 (`name=null`, `got [, , ]`).
  - M4 delete the `enum` from `kind` + regen → ✗ 8 (`validateComposition accepted choice.kind "switch" — the enum cannot fire`, ×4 values, each twice).
  - M5 `checked: true` constant → ✗ `checked and disabled did not land on exactly the radios that declared them`.
- **SATISFIES**: AC #2 (and the build-checks half of AC #1). **REGENERATES**: none.

### Task 8 — UPDATE group 21's pin and every "3/22" copy (six sites, all current-state)

- **IMPLEMENT**:
  - `tooling/build-checks.mjs` 21.4 pin: `withoutWrapper === 22` → `23`, and the message's `(pinned 3/22;` → `(pinned 3/23;`.
  - the tripwire note above it (ends "…a join on the component's ds- class answers zero."): after "#305 moved it 3/21 → 3/22: icon (the fourth) draws a glyph out of a generated subset and has no custom element either." add " #309 moved it 3/22 → 3/23: choice (the fifth, completing the ten) renders the engine's own input and has no custom element either."
  - `tooling/build-checks.mjs:94` "tabsFor's 3/22" → "3/23".
  - `system/catalog.mjs:69` "3/22" → "3/23".
  - `tooling/catalog-journey.mjs:14` "3/22" → "3/23".
  - `.claude/references/gates.md:33` and `:119` "3/22" → "3/23".
- **GOTCHA**: the historical arrows in the tripwire note ("3/21 → 3/22" etc.) stay as written; only current-state copies move. Grep proves completeness: `git grep -n "3/22" -- ':!.claude/plans' ':!.claude/reports' ':!.claude/code-reviews' ':!.agents'` must return only the note's history arrows (observed site list above: gates.md ×2, renderer 0, catalog.mjs 1, build-checks 3, catalog-journey 1).
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓  all 42 groups pass` (observed with the pin at 23).
- **REDDENS**: leave the pin at 22 → group 21 ✗ `the wrapper histogram moved — 3 with / 23 without (pinned 3/22; …)` (observed).
- **SATISFIES**: AC #3. **REGENERATES**: none.

### Task 9 — ADD catalog-journey case 14 to `tooling/catalog-journey.mjs`

- **IMPLEMENT**: insert directly after case 13's last `t(…)` (`"and the refusal is WIDER than that box…"`, ending `` `refused ${glyphs.refusedW}px vs glyph ${glyphs.controlW}px`); ``) and before `await page.close();`:

```js

  // ------------------------------------ [14] choice: exclusivity by name, and its states per pack (#309)
  //
  // The claim build-checks group 18 states it CANNOT reach: radios sharing a group are exclusive.
  // That is the ENGINE's rule — the template only writes `group` to the native name — so a DOM stub
  // can pin the attribute and never the behaviour. Real clicks, then, in three engines, beside TWO
  // controls, because each name mutation is caught by a different one (measured while planning):
  //   · two checkboxes sharing a group both stay checked — exclusivity comes from the radio type,
  //     not from anything this repo adds;
  //   · two radios in DIFFERENT groups both stay checked — a template writing a CONSTANT name makes
  //     every radio on the page one set and passes the same-group assertion, and only this sees it.
  // And AC #1's "under all three packs": the checked tint and the disabled colours read back per
  // pack, each against a probe span wearing the same token in the same document — so the compare
  // is rgb against rgb whatever format a pack writes. Saulera goes in by route, the pixel gate's own
  // mechanism (tooling/visual-regression/visual.spec.mjs:169), with its ../fonts/fonts.css answered
  // empty: case 11 swaps to verdant only because that @import 404s on this host and trips the
  // no-console-errors gate, and an answered route keeps that gate armed for everything else.
  console.log("\n[14] choice: radios exclusive by group, checkboxes never, states under three packs (#309 AC #1)");
  const CHOICE_PACKS = { neutral: null, saulera: "system/tokens.saulera.css", verdant: "system/tokens.verdant.css" };
  const accents = [];
  for (const [pack, file] of Object.entries(CHOICE_PACKS)) {
    const cp = await newPage(ctx);
    if (file) {
      await cp.route("**/system/tokens.neutral.css", (r) => r.fulfill({ path: path.join(ROOT, file) }));
      await cp.route("**/fonts/fonts.css", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    }
    await cp.goto(`${BASE}/components.html`, { waitUntil: "load" });
    await cp.waitForSelector(READY, { timeout: 20000 });
    const st = await cp.evaluate(async () => {
      const stage = document.querySelector("#choice .cat-stage");
      // Reported as data, never thrown (case 12's rule).
      if (!stage) return { error: "#choice .cat-stage is not on the page" };
      const { renderComposition } = await import("/system/agentic-renderer.mjs");
      const vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
      const c = (props) => renderComposition(vocab, { name: "choice", props }, null);
      const n = {
        standard: c({ kind: "radio", group: "cj-delivery", label: "Standard", checked: true }),
        express: c({ kind: "radio", group: "cj-delivery", label: "Express" }),
        loneA: c({ kind: "radio", group: "cj-a", label: "Lone A", checked: true }),
        loneB: c({ kind: "radio", group: "cj-b", label: "Lone B", checked: true }),
        gift: c({ kind: "checkbox", group: "cj-extras", label: "Gift wrap" }),
        receipt: c({ kind: "checkbox", group: "cj-extras", label: "Receipt" }),
        locked: c({ kind: "checkbox", group: "cj-locked", label: "Locked", hint: "Set by your plan.", checked: true, disabled: true }),
      };
      const probe = (token) => { const s = document.createElement("span"); s.style.color = `var(${token})`; return s; };
      const pAccent = probe("--color-accent"); const pMuted = probe("--color-fg-muted"); const pFg = probe("--color-fg");
      stage.replaceChildren(...Object.values(n), pAccent, pMuted, pFg);
      const cs = (x) => getComputedStyle(x);
      const input = (k) => n[k].querySelector("input");
      return {
        accent: cs(pAccent).color, muted: cs(pMuted).color, fg: cs(pFg).color,
        tint: cs(input("gift")).accentColor,
        enabledLabel: cs(n.gift.querySelector(".ds-choice-label")).color,
        lockedLabel: cs(n.locked.querySelector(".ds-choice-label")).color,
        lockedHint: cs(n.locked.querySelector(".ds-choice-hint")).color,
        lockedChecked: input("locked").checked, lockedDisabled: input("locked").disabled,
        lockedCursor: cs(n.locked).cursor,
        rowHeight: Math.round(n.gift.getBoundingClientRect().height),
        lonesAtRest: [input("loneA").checked, input("loneB").checked],
      };
    });
    t(`${pack}: the choice stage was reachable`, !st.error, st.error);
    if (!st.error) {
      accents.push(st.accent);
      t(`${pack}: the control's tint IS the pack's --color-accent (accent-color, no redrawn box)`,
        st.tint === st.accent, `tint ${st.tint} vs accent ${st.accent}`);
      t(`${pack}: disabled keeps its checked mark and is natively disabled`,
        st.lockedChecked === true && st.lockedDisabled === true, JSON.stringify(st));
      t(`${pack}: a disabled label and hint drop to --color-fg-muted, not-allowed cursor`,
        st.lockedLabel === st.muted && st.lockedHint === st.muted && st.lockedCursor === "not-allowed",
        `label ${st.lockedLabel} hint ${st.lockedHint} muted ${st.muted} cursor ${st.lockedCursor}`);
      // THE CONTROL for the colour pair: an ENABLED label in the same document reads --color-fg. Without
      // it, a sheet that muted every .ds-choice label passes the disabled assertion above.
      t(`${pack}: an enabled label beside it stays --color-fg (the control)`,
        st.enabledLabel === st.fg && st.fg !== st.muted, `enabled ${st.enabledLabel} fg ${st.fg}`);
      t(`${pack}: the row is the 44px target`, st.rowHeight >= 44, `${st.rowHeight}px`);
    }
    if (pack === "neutral" && !st.error) {
      // Behaviour once, on the neutral pack: exclusivity is the engine's and no pack can move it.
      await cp.click("#choice .cat-stage label:has-text('Express')");
      await cp.click("#choice .cat-stage label:has-text('Gift wrap')");
      await cp.click("#choice .cat-stage label:has-text('Receipt')");
      const read = () => cp.evaluate(() => Object.fromEntries([...document.querySelectorAll("#choice .cat-stage label.ds-choice")]
        .map((l) => [l.querySelector(".ds-choice-label").textContent, l.querySelector("input").checked])));
      const clicked = await read();
      t("picking Express un-picks Standard — radios sharing a group are ONE set",
        clicked.Express === true && clicked.Standard === false, JSON.stringify(clicked));
      t("two checkboxes sharing a group both stay checked — never exclusive (the control)",
        clicked["Gift wrap"] === true && clicked.Receipt === true, JSON.stringify(clicked));
      t("two radios in DIFFERENT groups both stay checked — the name is the group, not a constant (the control)",
        st.lonesAtRest[0] === true && st.lonesAtRest[1] === true && clicked["Lone A"] === true && clicked["Lone B"] === true,
        JSON.stringify({ atRest: st.lonesAtRest, clicked }));
      await cp.focus("#choice .cat-stage label:has-text('Express') input");
      await cp.keyboard.press("ArrowUp");
      const keyed = await read();
      t("ArrowUp moves the pick within the set, natively (no script in the template)",
        keyed.Standard === true && keyed.Express === false, JSON.stringify(keyed));
    }
    await cp.close();
  }
  // The loop proves nothing if the route never took: three packs, at least two distinct accents.
  t("the pack loop really re-skinned — at least two distinct accents across three packs",
    new Set(accents).size >= 2, JSON.stringify(accents));
```

  And the file header (`:9-17`): after "…the pack swap's cell re-resolve + listener hygiene (chromium-CDP half stated as such)" add ", and (#309) choice's radio exclusivity by group beside its two controls plus its checked and disabled states in computed style under all three packs".
- **IMPORTS**: none new — `path`, `ROOT`, `BASE`, `READY`, `newPage`, `ctx`, `t` are all in scope inside `journey()` (observed).
- **GOTCHA — keep both controls.** Each name mutation is caught by exactly one assertion (C1 constant name → only the different-groups control; C2 no name → only the same-group assertion; observed on the prototype and again on the re-drive of this plan's text). Neither may be removed or merged into another assertion; anyone who thinks one is redundant runs C1 and C2 first and records both results.
- **GOTCHA**: the `#choice` section id comes from the catalog rendering one section per vocabulary entry (`#list`, `#icon` precedent) — it exists only after Task 6's regen.
- **GOTCHA**: the saulera fonts route is required; without it the `@import url("../fonts/fonts.css")` at `system/tokens.saulera.css:19` 404s and the run-level no-console-errors assertion reds (case 11's stated reason). Observed with the route: zero page or console errors on all three packs × three engines.
- **GOTCHA (memory: stale serve = wrong tree)**: start your own server on a free port — `PORT=<free> node tooling/visual-regression/serve.mjs` — and pass `BASE`. The driver refuses a server whose `system/catalog.mjs` differs from this tree, which does not cover `agentic-renderer.mjs`; curl `/system/specs/choice.md` to confirm the served tree is this one.
- **VALIDATE**: `BASE=http://127.0.0.1:<port> node tooling/catalog-journey.mjs all` → `chromium: 72 passed, 0 failed` · `firefox: 71` · `webkit: 71` · `catalog-journey ✓  all assertions passed on chromium, firefox, webkit` (observed; +23 per engine over #305's 49/48/48: 6 per pack × 3 + 4 behaviour + 1 loop).
- **REDDENS** (all observed on chromium): C1 constant name → ✗ the DIFFERENT-groups control only · C2 no name → ✗ `picking Express un-picks Standard …` and `ArrowUp …` · C3 no `accent-color` → ✗ ×3 `tint auto vs accent …` · C4 no disabled colour rule → ✗ ×3 `a disabled label and hint drop to --color-fg-muted …` · C5 every label muted → ✗ ×3 the enabled-label control.
- **SATISFIES**: AC #1 (exclusivity, checkboxes never, disabled + checked under three packs), AC #3 (`catalog-journey` green). **REGENERATES**: none.

### Task 10 — UPDATE the prose copies of counts and gate coverage

- **IMPLEMENT**:
  - `tooling/visual-regression/visual.spec.mjs:125-126` (observed text at `:125-126`): "#301 took the catalog to 23 (stack, text), #303 to 24 (list) and #305 to 25 (icon)" → "…#303 to 24 (list), #305 to 25 (icon) and #309 to 26 (choice)".
  - `.claude/references/gates.md:29` (group 18): append " And (#309) `choice`: the committed checkbox example asserted BY NAME, a three-radio group in a stack validated and RENDERED with one native name on every input, and the `kind` enum refused by running `validateComposition`. *Cannot reach: exclusivity, which is the engine's — `catalog-journey` case 14.*"
  - `.claude/references/gates.md:119` (catalog-journey): append " And (#309) `choice`'s radio EXCLUSIVITY by real clicks, beside two controls — two checkboxes sharing a group both stay checked, and two radios in different groups both stay checked, which is the only assertion that sees a template writing a constant name — plus ArrowUp moving the pick natively, and the checked tint and disabled colours read back per pack against probe spans under all three packs (saulera by the pixel gate's route swap, its fonts import answered empty)."
- **GOTCHA (memory: gate prose has three copies)**: a coverage claim lives in `gates.md`, the `group()` string and a file header. Tasks 7, 9 and 10 together touch all three for both gates; grep `gates.md` for "group 18" and "catalog-journey" before declaring done.
- **VALIDATE**: `node tooling/drift-check.mjs | tail -1` → the `group-count` leg stays clean (no "all N groups pass" prose added; the group count stays 42).
- **SATISFIES**: AC #3. **REGENERATES**: none (`visual.spec.mjs` is a comment; not a baseline change).

### Task 11 — REGENERATE `system/loc-summary.json`

- **IMPLEMENT**: `git add` every changed `system/` file FIRST, then `node agent-layer/gen-loc-summary.mjs`, then `git add system/loc-summary.json`.
- **GOTCHA (memory: loc-summary counts tracked only)**: the generator reads the git INDEX; running it or `--check` before staging is a false "no drift".
- **Expected (derived)**: runtime exact on `8eb35a9` is **32,348** (observed: 80 files); the prototype of Tasks 1–5 measured **32,414** (observed) → `linesApprox` **32,300 → 32,400**, files stay **80**, total 40,700 → 40,800. Any runtime delta in +2…+101 lands on 32,400; the prototype sits at +66.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` after staging.
- **SATISFIES**: AC #3. **REGENERATES**: `system/loc-summary.json` ⇒ the three `/approach` baselines (Task 13).

### Task 12 — COMMIT, then the full local gate stack

- **IMPLEMENT**: one commit: `feat(system): choice through the chain — checkbox or radio, one part with a group name (#309)` with a body listing the files and "Plan: .claude/plans/choice-primitive-through-the-chain-309.md · Epic #295 · docs/epics/canvas-design-import.prd.md G24, G32". Include this plan (and its `.html` brief) in the commit.
- **GOTCHA**: `drift-check`'s handoff leg reads `git status --porcelain -- handoff/`, so it is only green on a COMMITTED tree (#305 report). Run it after the commit.
- **VALIDATE** (all observed green on the prototype commit):
  ```
  node tooling/build-checks.mjs | tail -1        → build ✓  all 42 groups pass
  node tooling/token-lint.mjs                    → token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
  node agent-layer/gen-param-count.mjs --check   → param count ✓  121 controls — no drift
  node tooling/drift-check.mjs | tail -1         → drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · icons · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
  ```
  then Task 9's `catalog-journey all`.
- **SATISFIES**: AC #2, #3.

### Task 13 — REGENERATE the six VR baselines (components ×3, approach ×3)

- **IMPLEMENT**: from a CLEAN detached worktree under `/Users` (not `/private/tmp` — Docker file sharing), at the commit from Task 12:
  ```
  git worktree add --detach /Users/Berzins/wt-choice-309-baselines <commit>
  cd /Users/Berzins/wt-choice-309-baselines/tooling/visual-regression && npm ci
  rm baselines/components-{neutral,saulera,verdant}.png baselines/approach-{neutral,saulera,verdant}.png
  npm run update:docker            # expect six "A snapshot doesn't exist … writing actual"
  # verify in the same container (there is no test:docker script; this is update:docker minus the flag):
  docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
  # expect 33 passed (#305's figure; 11 pages × 3 packs)
  ```
  Copy the six PNGs back to the feature branch and commit them: `chore(vr): regenerate components ×3 and approach ×3 for choice (#309)`.
- **GOTCHA (memories: VR gate reads the working tree · VR update skips sub-perceptual · loc-summary baseline cascade)**: `update:docker` screenshots the DIRTY tree, so the worktree must be clean; it will NOT rewrite a baseline whose change is below the per-pixel threshold, so REMOVE the PNGs first — the approach change is one digit (32,300 → 32,400) and would otherwise be silently kept stale.
- **GOTCHA (memory: VR tolerance hides text changes)**: a green run is not proof the digit moved. Read `/approach`'s rendered figure off the page (poll two stable reads; `countUp` runs on rAF) and confirm `80 files · 32,400 lines`.
- **MEASURED (2026-09-24, Docker, same container, `--repeat-each=5`)**: `/components` on `main` (25 components) 15/15 passed, 9.6–13.1 s; with `choice` (26) 15/15 passed, 9.9–15.1 s. No meaningful difference, so **`shotTimeout` stays at 30 000**. One earlier run failed `components · verdant` at 1.1 min, and the next nine ran 9.9–14.3 s: load on the machine, not this ticket. **Rule**: re-run a single timeout once; only a timeout that repeats raises `shotTimeout` (never the diff tolerance), with the measured times in the commit body.
- **MEASURED**: with the six PNGs removed first, `update:docker -g "components|approach"` printed six `A snapshot doesn't exist … writing actual` and `6 passed`; `/approach` then renders **"80 files, about 32,400 lines"**.
- **GOTCHA (memory: VR gate approach countUp flake)**: an approach "two consecutive stable screenshots" failure that moves between packs across runs is the known rAF flake, not a regression.
- **VALIDATE**: `git diff --stat HEAD~1 -- tooling/visual-regression/baselines` → exactly the six PNGs; the other shots pass unchanged.
- **SATISFIES**: AC #1 ("render under all three packs" at rest), AC #3 (`/components` ×3). **REGENERATES**: the six baselines.

### Task 14 — PR

- **IMPLEMENT**: re-run `gh pr list --state open` (the ticket's collision rule: no open PR may also regenerate `/components`; observed none open on 2026-09-24). Push, open the PR with body containing:
  - `Closes #309`
  - **The PRD count (AC #4), verbatim:** "With `choice`, the PRD's ten generic primitives are complete: five existing (button = `primary-button` + `ghost-button` · card = `card` · dialog = `modal-dialog` · nav = `nav-tabs` + `screen-header` · text field / dropdown = `text-field` + `select-field`) and five new (`stack`, `text`, `list`, `icon`, `choice`). None replaces or duplicates an existing part (G24): `toggle-switch` stays separate, because a toggle is an action and a choice is a selection (G32)."
  - the importer diff stated as measured (+66/−0 ×3, six candidates at 0.083, no verdict moved) and the loc move (32,300 → 32,400).
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #309"` → `1`; `gh pr checks` once `headRefOid` equals local HEAD (memory: PR head lags a push).
- **SATISFIES**: AC #4.

---

## TESTING STRATEGY

No unit-test suite exists (CLAUDE.md § Testing). The gates are the tests.

### Unit (build-checks, pure, CI)
Group 18 D: example by name, rendered radio group, enum and required refusals, toggle-switch kept apart. Group 21: palette pin, 3/23 histogram. Group 3: every vocabulary entry has a template (automatic). Group 23: `ds-choice` emitted as a literal class (automatic). Groups 40 and 42: the regenerated importer fixtures byte-compared (automatic).

### Integration (catalog-journey, three engines, operator-run)
Case 14: exclusivity by real clicks + two controls + keyboard; computed states per pack against probe spans.

### Edge cases
- A radio with no group → refused by name (group required, D1).
- `kind` of `switch` / `toggle` / `Radio` / `""` → refused naming the path and the enum.
- Two sets sharing a group string on one page → one set (documented in Usage; the dock's `pack` name avoided by every example and fixture).
- A disabled + checked control → keeps its mark, muted text, native disabled (case 14).
- A choice with no hint → no hint element (group 18 D counts exactly one hint in a three-radio set with one declared).

### Proving the checks
Every REDDENS above was observed in pre-flight on a scratch worktree (M1–M5 for group 18 D, C1–C5 for case 14). Re-run at least M1, M3, C1 and C2 on the real branch before trusting a green, and restore after each.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style
```
node --check system/agentic-renderer.mjs tooling/build-checks.mjs tooling/catalog-journey.mjs
node tooling/token-lint.mjs
```
### Level 2: The pure gate
```
node tooling/build-checks.mjs          # build ✓  all 42 groups pass
```
### Level 3: Drift and regen chain (after commit)
```
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-param-count.mjs --check
node import/regen-expected.mjs --check
node tooling/drift-check.mjs
```
### Level 4: Browser
```
PORT=<free> node tooling/visual-regression/serve.mjs &
BASE=http://127.0.0.1:<free> node tooling/catalog-journey.mjs all
```
Then the pixel gate (Task 13). Kill your own server by PID only (memory: port-scoped kill).
### Level 5: Manual read
Open `/components#choice` under each pack from the dock: the checked checkbox wears the pack's accent; flip `disabled` and `kind` in the playground controls.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q1 — owner confirms `group` required for checkboxes too | owner's hand | no (the plan proceeds on D1) | the PR body states D1; owner answers in review |
| Q2 — owner confirms the missing radio-set legend is accepted as a named gap | owner's hand | no | open a follow-up ticket if they want a `fieldset` part (an eleventh primitive, PRD MVP 12's rule) |
| The CI `verify` + `visual` runs | CI minutes | yes | the PR's own checks |

No step spends tokens or needs an agent run.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — spec, CSS block and template exist; radios sharing a `group` are exclusive through the template's `name` attribute and checkboxes never are (case 14, three engines); the disabled and checked states render under all three packs (case 14 computed, per pack; pixel gate ×3 at rest).
- [ ] AC #2 — group 18 gains the checkbox example and the radio-group example; `kind` outside the enum is refused by running `validateComposition`.
- [ ] AC #3 — the regenerators run (pack ×4 + system graph + the two importer regens + loc-summary); `/components` ×3 baselines regenerated (plus approach ×3); `catalog-journey` green on three engines; `token-lint` green.
- [ ] AC #4 — the PR body states the count: ten primitives, five new, none replacing an existing part (G24).
- [ ] `build ✓  all 42 groups pass`; `drift-check ✓`; `param count ✓ 121` unmoved; no new `system/*.mjs`; no token added.

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–14 in order, each VALIDATE observed
- [ ] M1, M3, C1, C2 re-driven on the branch and restored
- [ ] importer diffs are add-only
- [ ] six baselines regenerated from a clean worktree, `/approach` digit read off the page
- [ ] plan, report and review in the same PR (CLAUDE.md § Git)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **D1 (decided, flag to owner as Q1) — `group` is required for both kinds.** The validator has no conditional-required, so the choice is "required for both" or "optional for both". Optional lets a composer ship a radio with no `name`: a loner the reader can switch on and never off, with every gate green. Cost of required: a lone checkbox must be given a group, which is also its form field name. Reverse it only if the owner prefers a lone checkbox without a group; then group 18 D's "group required" loop flips and the spec's Usage paragraph changes.
- **D2 — native input + `accent-color`, not a redrawn control.** Measured: `accent-color` reads back as the pack's accent in all three engines under all three packs. A redrawn box would re-implement checked, focus and forced-colors.
- **D3 — no bus emission.** text-field / select-field precedent; `toggle-switch` is the action.
- **D4 — a radio set is `stack > choice × N`.** No new container (the ten are complete, and the ticket bars new `system/*.mjs`). The legend gap is named in the spec (Q2).
- **Q2 — the radio-set legend.** AT hears each radio's label, not the set's question. Accept as a named gap, or file a `fieldset`-style part as an eleventh primitive? Does not block this ticket.
- **Assumption** — no open PR touches `/components` when this one opens (observed 2026-09-24: `gh pr list --state open` empty). Re-check at Task 14.

## NOTES (open canvas)

### Pre-flight — what ran, what it said, what changed

Scratch worktree at `origin/main` `8eb35a9` (`scratchpad/wt309`, detached, never pushed; a local-only probe commit made so `drift-check`'s handoff leg could run).

1. **Baseline on main.** `build-checks` → `✗ 41.7 … tooling/icons/node_modules … missing` until `npm ci` in `tooling/icons`; then `build ✓  all 42 groups pass`. `drift-check` needed `tooling/style-dictionary` installed; then green. → Task 0 gotcha added. **The group count is 42, not 41** (#307 added `import-record`).
2. **Prototype of Tasks 1–5**, then the seven regenerators: all ✓ with the figures quoted in Task 6. `build-checks`: the only red was the 3/22 pin, as predicted → Task 8.
3. **Importer diffs**: `66 0` on all three JSONs, `.md` records unchanged, six `choice` candidates at 0.083, zero removals → treated as noise, with the removal tripwire kept in Task 6.
4. **loc**: exact runtime 32,348 → 32,414, rounding 32,300 → 32,400 → approach ×3 cascade is certain → Tasks 11, 13.
5. **catalog-journey unmodified on the prototype**: 49/48/48, green → adding `choice` breaks no existing case.
6. **Three-engine × three-pack probe** (a standalone script first, then case 14 in place): 72/71/71 green, zero console errors with the saulera fonts route.
7. **Group 18 D mutations M1–M5**: M1 and M2 initially CRASHED the run instead of naming a failure (#305 A4 reproduced) → the `draw` fold was added and both now red by name. That change is in the quoted code.
8. **Case 14 mutations C1–C5**: each red, and C1 (constant name) is caught ONLY by the different-groups control, C2 (no name) only by the same-group assertion → both controls kept.
9. **CSS simplification found by C4**: the hint's own rule already mutes it, so the disabled rule's second selector was redundant and was dropped; re-run green 72/71/71.
10. **Sites of "3/22"** grepped (six current-state copies); "twenty-five" in the renderer ×2; `visual.spec.mjs`'s "#305 to 25" comment; `stack.md:33`'s "one remaining" prose.
11. **Landed-state checks**: `choice` appears nowhere in `system/`, `import/`, `build-checks.mjs` or `.claude/references` (grep: only unrelated English uses of the word); no group-40 prediction about #309 exists to correct (unlike #305). `gh pr list --state open` → empty.
12. **Re-drive of the plan's own final text** (after the spec prose and section D's indentation were edited in the plan): the worktree was reset to `origin/main`, every fenced block was extracted from THIS file mechanically and applied at the anchors the tasks name (each anchor matched exactly once), and the seven regenerators, `token-lint`, `build-checks` (42/42), M1 (red by name, no crash), `loc-summary` (32,300 → 32,400), case 14 on chromium (72 passed) and C1 (red on the different-groups control only) were re-run. Every figure matched. The scratch worktree was then removed (`git worktree list` has no `wt309`).
13. **Traps carried from memory/references**: shared worktree staging, tracked-only loc count, VR from a clean `/Users` worktree with `rm` first, VR tolerance hides digits, approach countUp flake, stale serve, port-scoped kill, gate prose three copies, PR head lag, drift-check handoff leg needs a commit.

### Alternatives weighed

- **`group` optional** — rejected (D1).
- **Two parts (`checkbox`, `radio`)** — rejected by the PRD (G32) and by the spec's argument: they differ in one platform rule.
- **Asserting exclusivity in build-checks** — impossible without an engine; the stub records attributes only. The split (name in group 18, behaviour in case 14) is the same split #303 and #305 made for computed style.
- **Checked + disabled as the spec example** so the pixel gate shows both — rejected: a specimen should show the default use; case 14 reads the disabled state per pack instead.

## AMENDMENTS

- 2026-09-24 — **risk pass: each risk from the planning report closed by measurement or by a pinned rule.**
  - **R1 — a mutation crashing a group instead of naming a failure.** Closed in the quoted code (the `draw` fold in Task 7). Added to Task 7 VALIDATE: on the branch, apply M1 (delete `example` from `choice.md`, run `gen-handoff`) and require BOTH `build docs chain     ✗` naming `choice's committed example is not a checkbox` AND no `Error:` stack line in the output (`node tooling/build-checks.mjs 2>&1 | grep -c "^Error:"` → `0`). A crash prints a stack and no group line; that is the failure this guards against. Restore and regenerate after.
  - **R2 — the two controls in case 14.** Each name mutation is caught by exactly one assertion (C1 constant name → only the different-groups control; C2 no name → only the same-group assertion; observed twice, on the prototype and on the re-drive of the plan's text). Added to Task 9 GOTCHA: neither control may be removed or merged into another assertion. Anyone who thinks one is redundant runs C1 and C2 first and records both results.
  - **R3 — baselines kept stale by the sub-perceptual rule.** Measured end to end in Docker from a GitHub clone at `8eb35a9` plus the planned files (`~/Documents`, because Docker cannot share `/private/tmp` and `~/Desktop` was blocked mid-session): with the six PNGs removed first, `update:docker -g "components|approach"` printed six `A snapshot doesn't exist … writing actual` and `6 passed`. `/approach` served from that tree renders **"80 files, about 32,400 lines"** (read off the page after the count-up settled). Task 13 stands as written: rm first, then update, then read the digit off the page.
  - **R4 — `/components` near its 30 s screenshot budget at 26 components.** Measured with `--repeat-each=5`, same container, back to back: `main` (25 components) **15/15 passed, 9.6–13.1 s**; the prototype (26) **15/15 passed, 9.9–15.1 s**. No meaningful difference, so **`shotTimeout` stays at 30 000**. One earlier run had `components · verdant` fail at 1.1 min, and another took 36.2 s. The next nine repeats ran 9.9–14.3 s, which points to load on the machine, not this ticket. Rule added to Task 13: a single timeout is re-run once; only a timeout that repeats on a re-run raises `shotTimeout` (never the diff tolerance), with the measured times in the commit body.
  - **Q1 reversal recipe (in case the owner makes `group` optional).** `choice.md`: `"group"` → `"required": false`, and the Usage paragraph "**`group` is required for both kinds.**" is replaced by one that states a radio without a group cannot be un-picked and is the composer's responsibility. Data-binding row → "renders no name — a radio is then a loner". Template unchanged (`el()` skips `name: undefined`). Group 18 D: delete the "group is REQUIRED for both kinds" loop and add an assertion that a radio with no group renders an input whose `name` attribute is `null`. Re-run the whole Task 6 chain after.
  - **Q2 follow-up draft (not filed — the owner decides).** Title: "radio-set legend: a fieldset-shaped container for choice (G32 follow-up)". Body: a `stack` holding radios has no group semantics, so assistive tech hears each option but not the set's question; options are a `choice-set` part (`fieldset` + `legend`, `childrenCardinality: "many"`, children `["choice"]`) or a `legend` prop on `stack`; this would be an eleventh primitive, which PRD MVP 12's rule says a screen must name first.
- 2026-09-24 (implementation) — **plan error, citation only**: the `select-field` template ends at `system/agentic-renderer.mjs:614`, not `:617` (Task 4 and the context list). The anchor text matched exactly once, so the insertion is unchanged. Also, `visual.spec.mjs`'s "~25% taller" is now "~30%" (26/20 components); see the report.
