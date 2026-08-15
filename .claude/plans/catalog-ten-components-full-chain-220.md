# Feature: Ten new components through the full generation chain (#220)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils, types and
models — import from the right files.

## Feature Description

Grow the component catalog from 10 to 20 vocabulary components: `text-field` · `select-field` ·
`toggle-switch` · `search-input` · `nav-tabs` · `modal-dialog` · `empty-state` ·
`progress-indicator` · `ghost-button` · `card`. Each walks the FULL generation chain #211 proved
once with `demo-notice`: **spec → (tokens if genuinely needed) → `components.css` block →
`agentic-renderer.mjs` template → handoff/vocabulary regen → checks**, plus the loc/baseline
cascades. A spec without its CSS block and renderer template is *documented but not composable* —
`build-checks` group 3 now asserts that over the whole vocabulary, so a half-chained component is a
red build, not a gap.

The catalog (`/components`), the studio inspector, the ⌘K palette and every journey driver were
built to absorb this ticket: everything except two deliberately-pinned tripwires derives from the
generated artifacts at view time.

## User Story

As a hiring manager or deep-dive UX engineer evaluating this portfolio
I want the component catalog to cover the common UI vocabulary (fields, tabs, dialogs, buttons, cards)
So that the generated-docs system reads as a real design system, not a demo with three primitives.

## Problem Statement

The vocabulary holds 10 components, most scenario-specific (`vd-`/`fw-`). An evaluator comparing the
catalog against appica-grade references sees depth of *presentation* but narrowness of *coverage* —
no text field, no button variant, no card, no dialog. Epic #202 §8: "the catalog grows by ~10 common
UI components (spec-first, through the full generation chain) — the count stated honestly either way."

## Solution Statement

Author the ten named components as `ds-` library primitives (cross-scenario, like `ds-metric-tile`),
each designed **inside the composition model as it stands** — scalar props (`string`/`number`/
`boolean` only), the at-most-one-child rule — then run the standard regen cascade and move the two
pins that exist precisely to force a conscious edit here (palette's `CATALOG_COMPONENTS`,
build-checks' 3/7 wrapper histogram). Target **zero new contract tokens** (the `demo-notice`
precedent: a whole new component, 0 new tokens); the design table below picks shapes that stay
inside the existing 47-token contract.

## Out of Scope / Non-Goals

- **No `wc/` wrappers for the ten** — the ticket names the 7 missing `vd-*` wrappers "riding debt,
  optional here". The `vd`/`react` code tabs stay presence-gated (an absent tab is honest); the ten
  ship wrapper-less, moving the histogram to 3/17.
- **No vocabulary-schema change.** No array/object prop types, no multi-child rule. If a component
  genuinely cannot be designed scalar (the designs below all can), STOP and flag on #202 +
  substitute from the pool (`segmented-control` · `identity-chip` · `table-row`) — never invent a
  schema change inside this ticket.
- **No studio/canvas integration** — the replay board, the compile beat and the flow compose only
  pre-existing components; nothing there changes. Factory's baselines must NOT churn (verify, don't
  assume).
- **No edits to** `catalog.mjs` render logic, `components.html`, `studio-docs.mjs`,
  `catalog-journey.mjs`, `handoff-viewer.mjs` — all confirmed zero-edit for additive components.
- **No error/danger token or validation-error states** on the form components — no
  `--color-danger` exists and inventing one is a system-level call this ticket doesn't need
  (`ds-metric-tile`'s warn/critical already showed emphasis without a new hue). States stay
  default/focus/disabled.
- **Not changing** the three existing primitives' non-interactive contract (`studio-flow.mjs:14-19`),
  `pattern-rules.mjs`, or any `/build` pattern.

## Feature Metadata

**Feature Type**: New Capability (additive)
**Estimated Complexity**: Medium-High (volume + design quality, not mechanism — the chain is proven)
**Primary Systems Affected**: `system/specs/`, `system/components.css`, `system/agentic-renderer.mjs`,
`system/palette.mjs`, `handoff/verdant/**` (regen), `system/system-graph.json` +
`system/inspect-data.json` + `system/loc-summary.json` (regen), `tooling/build-checks.mjs` (one pin),
VR baselines ×4
**Dependencies**: none new. #211 (the `example` field + widened group 3) is MERGED — the constraint
this ticket inherits, not a wait.

## Related Work

**Implements**: [#220](https://github.com/linardsb/ux-factory/issues/220) — PR body must carry
`Closes #220`.   ·   **Epic**: #202 (`docs/epics/prototype-studio.prd` in the issue body +
`docs/epics/prototype-studio.architecture.md` §Other eng-lead calls → *The ~10 new components,
candidate list*). Wave 9, **pre-agreed scope cut**: if it overruns, land two batches of five and
close honestly at the batch boundary — a catalog of fifteen is not a failure.

**Back-references**:

- `.claude/plans/docs-chain-example-field-demo-notice-211.md` + `.claude/reports/docs-chain-example-field-demo-notice-211-report.md`
  — Why: the chain walked once, end to end, for one component; this ticket walks it ten more times.
  The report's "Issues encountered" section is this plan's gotcha list (restore-and-regen-downstream,
  drift-check reads staged, sub-threshold baseline skips).
- `.claude/plans/component-catalog-appica-docs-215.md` + `.claude/reports/component-catalog-215-report.md`
  — Why: built the surface these ten land on; documents the param-manifest counting rules and the
  clean-worktree baseline procedure.

**Forward-references**:

- (none yet — the 7+10 missing wrappers remain riding debt for a future ticket)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/metric-tile.md` (whole file) — Why: THE model spec for a `ds-` library primitive —
  head shape, enum prop, prose register, the "string is the uniform display choice" argument.
- `system/specs/demo-notice.md` (whole file) — Why: newest chain-complete spec (#211); the smallest
  legal spec; `example` + `aiPatterns` shapes.
- `.claude/references/kb-format.md` (ComponentSpec section) — Why: head schema v1 — required keys
  (`component`=filename stem, `status`, `class`, `contract`, `props`, `tokens` NON-EMPTY, `states`
  non-empty, `children`), optional `example` / `aiPatterns` / `min`/`max`/`step` (number props only).
- `agent-layer/lib.mjs:63-172` (`parseComponentSpec`) — Why: the actual parser + its throw
  conditions (bounds on non-number props throw; `min > max` throws; all four prose sections required
  IN ORDER: Usage · States · Data binding · Accessibility).
- `system/agentic-renderer.mjs:120-130` (`el` helper), `:221-364` (`TEMPLATES`), `:240-249`
  (`primary-button` — the bus-emitting button MIRROR), `:272-296` (`care-task-row` — the
  flip-state-then-report MIRROR), `:322-327` (`metric-tile` — tone-class MIRROR), `:357-363`
  (`demo-notice` — minimal MIRROR), `:79-106` (`validateComposition` — single-child + typeof rules)
  — Why: every new template mirrors one of these.
- `system/components.css:1474-1934` — Why: the ten existing spec'd blocks; header convention;
  comment register; `ds-metric-tile:1509-1525` (accent-mix emphasis, "no warn/critical hue exists,
  and none is needed"); `.vd-status-chip` block (pill radius approach — reuse for the switch track).
- `system/tokens.contract.css:22-103` — Why: the full 47-token inventory the ten designs must live
  inside. Read it before writing any CSS.
- `system/palette.mjs:30-38` — Why: `CATALOG_COMPONENTS` + its own comment: "#220 adds components by
  editing this list, and the pin is what forces that edit."
- `tooling/build-checks.mjs:4143-4144` (palette pin) and `:4192-4206` (the 3/7 histogram TRIPWIRE —
  its comment names this ticket) — Why: the ONLY two pinned edits in the whole gate layer.
- `agent-layer/gen-system-graph.mjs:67-99` — Why: block-header regex `/^\/\* -{5,} (.+?) -{5,} \*\/$/gm`
  — a wrapped header line or duplicate slug THROWS at generation time.
- `agent-layer/gen-vocabulary.mjs:38-50` (`validateExamples`), `:63-72` (`example` deliberately NOT
  projected into vocabulary.json) — Why: every `example` is semantically validated by running
  `validateComposition` against the built vocabulary; a bad example is a red CI `verify` naming the
  spec path.
- `agent-layer/gen-handoff.mjs:30-97` — Why: validates every `children` entry names a real spec
  (order your authoring so referenced children exist); `portability.webComponents.files` comes from
  `system/wc/` contents, never from specs.
- `system/param-manifest.json:63-66` — Why: the `/components` entries + their counting rules; decide
  there whether new interactive specimens join an existing entry (see Task 14).
- `tooling/drift-check.mjs:162-181` — Why: the canonical regen ORDER CI runs; your local loop.
- `.claude/skills/…/portfolio-design/references/CRAFT.md` (via the `portfolio-design` skill) — Why:
  MANDATORY before writing any CSS; run `references/CHECKLIST.md` before committing. Calm palette —
  excitement via motion and craft, not colour.

### New Files to Create

- `system/specs/text-field.md` · `select-field.md` · `toggle-switch.md` · `search-input.md` ·
  `nav-tabs.md` · `modal-dialog.md` · `empty-state.md` · `progress-indicator.md` ·
  `ghost-button.md` · `card.md` — ten ComponentSpecs (head schema v1 + four prose sections each).
- No other new source files. (Regenerated artifacts change in place; specs are invisible to
  loc-summary — its `runtime` regex matches only `system/*.{css,mjs,js}`.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Issue #220 body (`gh issue view 220`) — the ACs, the pre-agreed scope cut, the substitution pool.
- `docs/epics/prototype-studio.architecture.md:160-172` — §Other eng-lead calls, the candidate-list
  paragraph (full-chain requirement + structured-props escape hatch, verbatim).
- `docs/epics/prototype-studio.architecture.md:101-106` — §Data model ("Docs catalog carries no new
  generated artifact"; `example` CI-validated; token values live-resolved only).

### Patterns to Follow

**Spec head** (mirror `metric-tile.md`; `component` == filename stem; `tokens` non-empty and exactly
what the CSS block consumes; every spec carries `example`):

```json
{
  "component": "text-field", "status": "shipped", "class": "ds-text-field", "contract": null,
  "props": { "label": { "type": "string", "required": true, "description": "…" } },
  "tokens": ["--color-border", "…"], "states": ["default", "focus", "disabled"], "children": [],
  "example": { "label": "Email", "placeholder": "you@example.com" }
}
```

**Template root class — one of exactly three source-text forms** (group 23's `emitsClass` regex,
`build-checks.mjs:4545`: `` class: (?:"X"|`X(?:\$| )) ``). A `.join()`/concatenated class passes at
runtime but fails the source-text gate:

```js
"stat-tile":   el("div", { class: "vd-stat-tile" }, …)                       // form 1: static string
"metric-tile": el("div", { class: `ds-metric-tile${tone ? " is-" + t : ""}` }, …) // form 2: literal then ${
"care-task-row": el("button", { class: `vd-care-task-row is-${props.status}…` }, …) // form 3: literal then space
```

**CSS block header — ONE line, exact dashes** (a wrapped header throws in `gen-system-graph.mjs:70-79`):

```css
/* ---------- ds-text-field (system/specs/text-field.md) ---------- */
```

**Bus emission** (interactive templates only — `busEmit(bus, name, e, params)`, mirror
`primary-button:240-249`; `e.detail === 0` distinguishes keyboard from pointer). Non-interactive
templates take `(props)` only and touch no bus.

**Escaping**: the `el` helper sets `textContent`/`setAttribute` only — never build HTML strings.

**Token procedure IF (and only if) a genuine gap is proven** (target is zero): literal `$value` entry
in `tokens.source.json` `contract` group (aliases throw there) + same-name alias in the matching
`neutral.semantic-*` section → `node agent-layer/gen-token-css.mjs` → the token MUST be consumed by a
block or `token-lint`'s ORPHAN check fails. No pack file (saulera/verdant/plusui) needs edits — the
contract line carries the neutral-value literal fallback.

---

## THE DESIGN TABLE (the actual product decisions — read with CRAFT.md open)

All ten: `ds-` prefix (cross-scenario library primitives — `kb-format.md`'s prefix-by-scope rule),
`contract: null`, `status: "shipped"`, an `example` that renders. Interactivity column names the
MIRROR template. Implicit-label wrapping (control nested inside its `<label>`) avoids `id`
generation entirely — no template today mints ids and none should start.

| # | Component | Props (all scalar) | Children | Interactivity | Root element | Notes / the design call |
|---|---|---|---|---|---|---|
| 1 | `ghost-button` | `label` s req · `disabled` b opt | `[]` | **Emits** `ui.intent` — MIRROR `primary-button` | `<button type="button" class="ds-ghost-button">` | Transparent fill, accent text, `--color-accent-wash` hover. The quiet sibling of primary-button. |
| 2 | `card` | `title` s req · `body` s opt · `footnote` s opt | `["metric-tile","list-row","sequence-step"]` — ONE optional child | none | `<section class="ds-card">` | The container primitive; demonstrates the single-child rule on a new component. Surface + hairline + `--radius-md` + `--shadow-sm`. |
| 3 | `empty-state` | `title` s req · `body` s opt | `["ghost-button"]` — ONE optional action | none | `<div class="ds-empty-state" role="status"?→ no: plain div` | Dashed `--color-border`, muted centre-set prose. Author ghost-button FIRST — `gen-handoff` validates children name real specs. |
| 4 | `progress-indicator` | `label` s req · `value` n req **min 0 max 100** · `detail` s opt | `[]` | none | `<div class="ds-progress-indicator" role="progressbar" aria-valuemin/max/now>` | The one bounded number → the playground's real range control (`controlFor` needs BOTH min and max for a range). Track `--color-accent-wash`/`--color-border`, fill `--color-accent`. `is-complete` at 100 (form-2/3 root class). |
| 5 | `text-field` | `label` s req · `value` s opt · `placeholder` s opt · `hint` s opt · `disabled` b opt | `[]` | native focus only, NO bus | `<label class="ds-text-field">` wrapping span + `<input type="text">` | First `<input>` in the renderer — precedented by `primary-button`'s real `<button>`; the playground has no sandbox and needs none. Focus ring from `--color-accent` (box-shadow/outline), never a new token. |
| 6 | `search-input` | `label` s req · `value` s opt · `placeholder` s opt | `[]` | native focus only, NO bus | `<label class="ds-search-input">` wrapping span + `<input type="search">` | Compact, glyph-led (CSS mask/inline-SVG `currentColor` — no image asset, no literal colour). Visible caption label — consistency with text-field beats convention. |
| 7 | `select-field` | `label` s req · `value` s req · `hint` s opt · `disabled` b opt | `[]` | native focus only, NO bus | `<label class="ds-select-field">` wrapping span + `<select>` with ONE `<option>` = `value` | **The scalar dodge**: the specimen depicts the CLOSED state; the option list is the consuming product's data, which the composition model deliberately does not carry. The spec's Data-binding prose states this. Chevron = CSS, `currentColor`. |
| 8 | `toggle-switch` | `label` s req · `on` b opt · `disabled` b opt | `[]` | **Flips then reports** — MIRROR `care-task-row` | `<button type="button" role="switch" aria-checked class="ds-toggle-switch">` containing label span + track/thumb spans | Track-on = `--color-accent`, thumb = `--color-bg-surface`, slide via a `--motion-*` token. Pill radius: reuse `.vd-status-chip`'s approach — do NOT invent a `999px` literal without checking that precedent. |
| 9 | `nav-tabs` | `items` s req (pipe-delimited labels, e.g. `"Overview \| Activity \| Settings"`) · `active` n req **min 1** (1-based, template clamps) | `[]` | **none — presentational** | `<div class="ds-nav-tabs">` of spans; active gets `is-active` + `aria-current="true"` | **Navigation is chrome, never a composed component** (`studio-flow.mjs:14-19`, recorded) — so no `tab`/`tablist` roles (roles without behaviour are an a11y lie) and no click handlers. The delimited string IS a scalar string prop — no schema call; the spec's Data-binding section states the encoding rule (split `\|`, trim, drop empties). |
| 10 | `modal-dialog` | `title` s req · `body` s req · `confirmLabel` s req · `dismissLabel` s opt | `[]` | action buttons **emit** `ui.intent` with `params.action: "confirm"\|"dismiss"` — MIRROR `primary-button` ×2 | `<section class="ds-modal-dialog" role="group" aria-label={title}>` | **An inline, non-modal dialog SURFACE** — no overlay, no scrim, no focus trap, no open/close, NOT `role="dialog"`. `--shadow-lg` carries the depth; modality (trap · Escape · focus restore) is the consuming surface's job and the Accessibility prose says so. This is what keeps the token count at zero (no scrim colour) and the honesty contract intact. |

Every spec's `tokens` head array = exactly the `var(--…)` names its block consumes (the graph join
builds the catalog's token table from it; `token-lint` catches undeclared names; nothing catches an
over-claimed head list — keep it honest by hand).

---

## IMPLEMENTATION PLAN

Phases run top to bottom. The batch split is the ticket's pre-agreed overrun boundary: **each batch
ends fully green and committable** — if the appetite dies after Batch A, close honestly at fifteen.

### Phase 1: Foundation

**Tasks:** branch off `origin/main` (NOT the current `feature/studio-protos-frames-219` working
tree — shared-worktree memory: verify branch immediately before every commit, stage by explicit
path); load the `portfolio-design` skill and read `references/CRAFT.md`; read the files listed
above; confirm the token inventory covers the design table (any gap → the token procedure, and note
it in the report).

### Phase 2: Batch A — ghost-button · card · empty-state · progress-indicator · text-field

Per component: CREATE spec → ADD CSS block → ADD template → quick-regen check. Order matters once:
**ghost-button before empty-state** (children validation). Batch ends with pins at 15
(`CATALOG_COMPONENTS` +5, histogram `3 && 12`), the full regen cascade, and every gate green.

### Phase 3: Batch B — search-input · select-field · toggle-switch · nav-tabs · modal-dialog

**Depends on:** Phase 2 (the pins move again from its values).
Same per-component loop; pins to final (20 names, `3 && 17`), full cascade, gates green.

### Phase 4: Integration true-ups

Renderer header count ("ten templates" → twenty — #211's deviation 4 caught exactly this staleness);
CLAUDE.md's two `3/7` mentions → `3/17`; the param-manifest decision (Task 14); regen
`inspect-data.json` (drift-only — NO new `ROLES` entries: absent-from-inspect is the designed
default).

### Phase 5: Testing & Validation

**Depends on:** Phases 2–4.
Mutation drill (the check must be able to fail), journey drivers ×3 engines, VR baselines from a
clean detached worktree, churn verified EXACTLY 4 PNGs.

---

## STEP-BY-STEP TASKS

### Task 0 — CREATE branch
- **IMPLEMENT**: `git fetch origin && git checkout -b feature/catalog-ten-components-220 origin/main`
- **GOTCHA**: parallel sessions share the working dir — `git branch --show-current` before EVERY commit; stage by explicit path only.
- **VALIDATE**: `git branch --show-current` → `feature/catalog-ten-components-220`

### Task 1 — READ the mandatory set
- **IMPLEMENT**: the CONTEXT REFERENCES list above, plus `Skill: portfolio-design` → `references/CRAFT.md`. Dump the 47 contract tokens (`system/tokens.contract.css:22-103`) into your working notes.
- **VALIDATE**: you can name, from memory, the three template class forms and the four required prose sections.
- **SATISFIES**: plan preconditions.

### Tasks 2–6 — CREATE Batch A, one component each (ghost-button → card → empty-state → progress-indicator → text-field)
For EACH component, one atomic task:
- **CREATE** `system/specs/<name>.md` — head per the design table (props/tokens/states/children/example), four prose sections in order, register mirrored from `metric-tile.md` (Usage names the ds- scope; States name tokens; Data binding carries the prop table + the scalar argument; Accessibility states the roles/contrast facts you can actually defend).
- **ADD** the `components.css` block — single-line header `/* ---------- ds-<name> (system/specs/<name>.md) ---------- */`, token-only body, comment carrying the design constraint (why these tokens, what was deliberately NOT done), appended after the existing spec'd blocks (~`:1934`).
- **ADD** the `agentic-renderer.mjs` template in `TEMPLATES` — MIRROR per the design table; root class in one of the three source forms; `el()` only; alphabetical-ish placement near its mirror is fine (the map is an object literal, order is presentation only).
- **PATTERN**: `agentic-renderer.mjs:240-249` (button), `:322-327` (tone class), `:357-363` (minimal); `components.css:1918-1933` (block shape).
- **GOTCHA**: `tokens` head array must be non-empty AND match the block's actual `var()` usage; bounds only on `number` props; no `id` attributes — implicit label wrapping.
- **VALIDATE** (per component): `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs` → both print `✓`; a parse error or a non-rendering `example` throws NAMING YOUR SPEC PATH. (Full build-checks stays red on the two pins until Task 7 — expected.)
- **SATISFIES**: AC #1, #2, #3 for each component.

### Task 7 — UPDATE the two pins + Batch A cascade
- **UPDATE** `system/palette.mjs:35-38` — add the five Batch-A names to `CATALOG_COMPONENTS` (keep it readable; the pin compares as a sorted set).
- **UPDATE** `tooling/build-checks.mjs:4205-4206` — `withWrapper === 3 && withoutWrapper === 7` → `… === 12`, and update the assertion's message text/comment to match.
- **RUN** the cascade in drift-check's order: `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-system-graph.mjs && node agent-layer/gen-inspect-data.mjs && node agent-layer/gen-loc-summary.mjs`
- **GOTCHA**: `gen-pack-bundle` must run AFTER handoff+vocabulary (it inlines the tree); `inspect-data` regenerates from the changed graph with NO new `ROLES` entries.
- **VALIDATE**: `node tooling/build-checks.mjs` → all 24 groups pass · `node tooling/token-lint.mjs` → 0 undeclared, 0 orphan · `node tooling/drift-check.mjs` → green (needs the handoff tree COMMITTED, not staged — commit Batch A first: one atomic commit, spec+CSS+template+pins+artifacts).
- **SATISFIES**: AC #2, #5; the honest batch boundary.

### Tasks 8–12 — CREATE Batch B, one component each (search-input → select-field → toggle-switch → nav-tabs → modal-dialog)
Same loop as Tasks 2–6, design table rows 6–10.
- **GOTCHA** (`toggle-switch`): mirror `care-task-row:272-296`'s flip-then-report exactly — flip `aria-checked` + class BEFORE `busEmit`; check `.vd-status-chip`'s pill radius before writing any radius.
- **GOTCHA** (`nav-tabs`): the template clamps `active` into range and drops empty items — the spec prose states the encoding; no `tab` roles.
- **GOTCHA** (`modal-dialog`): two real buttons, both `busEmit(bus, "modal-dialog", e, { action })`; no `role="dialog"`.
- **VALIDATE**: per component, same regen pair as Tasks 2–6.
- **SATISFIES**: AC #1, #2, #3.

### Task 13 — UPDATE pins to final + Batch B cascade
- **UPDATE** `palette.mjs` → all ten names (20 total); `build-checks.mjs:4205-4206` → `3 && 17`.
- **RUN** the full cascade again (same order as Task 7).
- **VALIDATE**: `build-checks` 24/24 · `token-lint` clean · commit Batch B atomically, then `drift-check` green.
- **SATISFIES**: AC #2, #5.

### Task 14 — UPDATE `system/param-manifest.json:66` — the interactive-specimen entry (RESOLVED at planning, verified against the file)
- **IMPLEMENT**: the entry's label is "interactive playground specimens (emit onto the playground bus, **one group**)" and its selector enumerates classes: `.cat-playground .vd-primary-button, .cat-playground .vd-plant-card, .cat-playground .vd-care-task-row`. The three new bus-emitting specimens meet that rule exactly — APPEND `.cat-playground .ds-ghost-button, .cat-playground .ds-toggle-switch, .cat-playground .ds-modal-dialog` to the selector. Because the entry counts as ONE group, `param-count.json`'s totals do NOT move.
- **RUN**: `node agent-layer/gen-param-count.mjs` — expected no-op on the counts (the manifest changed; the artifact should not).
- **GOTCHA**: the three field components and nav-tabs/empty-state/progress-indicator/card do NOT join the selector — they emit nothing onto the bus, and inflating the group would overstate a capacity claim.
- **VALIDATE**: `git diff -- system/param-count.json` → empty; `node tooling/drift-check.mjs` → param section green.
- **SATISFIES**: AC #7 (no stated count hand-edited; the manifest entry stays true).

### Task 15 — UPDATE the count prose that would otherwise go stale
- **UPDATE** `system/agentic-renderer.mjs` header comment: "ten templates" → twenty (and any `:21-22`/`:359-360` phrasing that counts).
- **UPDATE** `system/catalog.mjs:67-70` — `tabsFor`'s own comment says "3 of 10 today; the 7 absences… pins the 3/7 histogram as the tripwire #220… is meant to trip" → 3 of 20 / 17 absences / 3/17, and reword the "meant to trip" clause past-tense (this ticket tripped it).
- **UPDATE** `CLAUDE.md`: both `3/7` mentions → `3/17` (catalog.mjs entry + build-checks group-21 description); nothing else — surgical.
- **VALIDATE**: `grep -rn "3/7" CLAUDE.md system/catalog.mjs` → empty; `grep -n "ten templates" system/agentic-renderer.mjs` → empty.
- **SATISFIES**: repo-truth maintenance (the #211 deviation-4 lesson).

### Task 16 — VERIFY the zero-literal discipline (no gate exists for this — do it by hand)
- **IMPLEMENT**: `git diff main -- system/components.css | grep -inE '#[0-9a-f]{3,8}\b|rgb\(|oklch\(|hsl\('` → must return ONLY lines that are comments, ideally nothing. Also re-check each new block consumes exactly its spec's `tokens` list.
- **GOTCHA**: `token-lint` only catches UNDECLARED `var()` names — a raw `#333` sails through every gate. This grep is the check.
- **VALIDATE**: the grep above, empty.
- **SATISFIES**: AC #3.

### Task 17 — MUTATION DRILL (perform, observe red, restore, re-run downstream)
- **IMPLEMENT**, one at a time, restoring fully between each:
  1. Comment out ONE new template → `build-checks` group 3 red naming the component.
  2. Delete ONE new CSS block + `node agent-layer/gen-system-graph.mjs` → group 18 red ("no components.css block consuming contract tokens"), proving the pack-anchoring; restore block, regen graph.
  3. Break ONE new spec's `example` (string where the design says number, or an unknown prop) → `gen-vocabulary` throws naming the spec path; restore, RE-RUN THE WHOLE CASCADE (the #211 half-restored-artifact trap: pack.json keeps the mutation until handoff+vocabulary+bundle re-run).
  4. Typo one name in `CATALOG_COMPONENTS` → group 21 red naming both sides; restore.
- **VALIDATE**: each red observed and quoted in the report; final `build-checks` 24/24 + `drift-check` green + clean tree.
- **SATISFIES**: the epic's "the check must be able to fail" standing rule.

### Task 18 — RUN the journey drivers (zero edits expected in both)
- **IMPLEMENT**: `node tooling/visual-regression/serve.mjs &` (use `PORT`/`BASE` overrides if 4757 is held — stale-serve memory; catalog-journey refuses a stale tree by byte-match) → `node tooling/catalog-journey.mjs all` → `node tooling/build-journey.mjs all` (regression guard).
- **GOTCHA**: catalog-journey derives COUNT and WRAPPER_COUNT from the served artifacts — 20 and 3/17 flow through with no edits. If any assertion needs an edit, that's a finding, not a fix-in-place.
- **VALIDATE**: catalog-journey green ×3 engines; build-journey green ×3 engines.
- **SATISFIES**: AC #4 (working playground controls, driven cross-engine).

### Task 19 — REGENERATE the VR baselines (components ×2 + approach ×2, nothing else)
- **IMPLEMENT**: commit everything first; create a clean detached worktree under `/Users` (NOT `/private/tmp` — Docker sharing); `cd tooling/visual-regression && npm run update:docker`; copy the changed PNGs back; remove the worktree.
- **GOTCHA** 1: approach's changed digits can sit below pixelmatch's threshold — if `approach-*.png` don't rewrite, `rm` them first to force capture. GOTCHA 2: the gate captures the DIRTY tree — hence the clean worktree. GOTCHA 3: an `update:docker` run cannot fail — follow with a verify run (no `--update-snapshots`) for the real gate result.
- **VALIDATE**: churn is EXACTLY `components-{neutral,saulera}.png` + `approach-{neutral,saulera}.png`. **`factory-*.png` unchanged** (the `#shape` graph is not mounted at capture; if factory churns, something leaked into the at-rest studio — stop and investigate). Verify run 22/22 against the committed baselines.
- **SATISFIES**: AC #6; the epic's baseline rules.

### Task 20 — CREATE report + PR
- **IMPLEMENT**: `.claude/reports/catalog-ten-components-220-report.md` (mirror #211's report shape: tasks table, mutation-proof table, cascade numbers 10→20, deviations); `piv-create-pr` — body carries **`Closes #220`**; plan + report in the same PR.
- **VALIDATE**: `gh pr view --json body | grep "Closes #220"`.
- **SATISFIES**: the epic's every-ticket-carries list.

---

## TESTING STRATEGY

No test suite by design (CLAUDE.md → Testing). Every invariant is a committed gate or a driven page:

### Unit-equivalent (CI, `build-checks` — all auto-covering, verified by the mutation drill)
- Group 3: template per vocabulary entry (widened by #211 precisely so this ticket can't ship a demo-notice-shaped gap).
- Group 18: CSS block per pack component (pack-anchored, can't go vacuously green), `validateExamples` over all 20.
- Group 21: pack↔vocab set identity · palette pin · `controlFor` over all real props · the 3/17 histogram · spec file per name.
- Group 23: every pack class emitted by the renderer in one of the three source forms — this is what polices the new templates' root classes.

### Integration (operator-run)
- `catalog-journey all` — count line, sections, deep links, playground round-trips, tab gating, all derived live from the served artifacts.
- `build-journey all` — proves `/build`'s compose paths didn't notice ten additive vocabulary entries.

### Edge cases that must be exercised (mostly by authoring them correctly, then the drill)
1. `example` omitted vs present (all ten present — group 18's synthetic stripped-pack case covers absence).
2. `progress-indicator.value` at 0, 100, and the clamp (range control renders because BOTH bounds exist).
3. `nav-tabs.active` out of range / `items` with empty segments — template clamps/drops; playground shows the honest result, never a throw.
4. `card` with and without its single child; a disallowed child name → the validator's own refusal wording in the playground `role="status"` line.
5. `select-field`'s closed-state honesty — the one `<option>` equals `value`.
6. Interactive specimens (`ghost-button`, `toggle-switch`, `modal-dialog` actions) — pointer AND keyboard both reach the bus readout (catalog-journey's existing pointer-vs-keyboard case pattern).

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check system/agentic-renderer.mjs && node --check system/palette.mjs`
- Task 16's literal grep over the `components.css` diff.

### Level 2: Pure gates (CI-equivalent)
- `node tooling/build-checks.mjs` → `all 24 groups pass`
- `node tooling/token-lint.mjs` → 0 undeclared · 0 orphan
- `node tooling/drift-check.mjs` → all steps green (handoff must be COMMITTED)

### Level 3: Cross-engine drivers
- `node tooling/visual-regression/serve.mjs &` then `node tooling/catalog-journey.mjs all` and `node tooling/build-journey.mjs all`

### Level 4: Manual
- `/components` under neutral AND saulera (dock swap): all 20 sections, count line reads "20
  components…", each new playground manipulable, ⌘K lists ten new "Components: <name>" commands,
  copy-spec byte-matches a committed spec, the ten new sections show NO vd/react tabs.
- A real browser eyeball of the ten (VR is Chromium-only; the PR #54 Safari blowout memory) —
  `min-width: 0` on any grid/flex item holding wide content.

### Level 5: Visual gate
- Task 19's containerized verify run: 22/22 against committed baselines, churn exactly 4 PNGs.

## ACCEPTANCE CRITERIA

- [ ] Each of the ten has: spec, tokens (head list = block consumption; zero NEW contract tokens
      unless a gap is proven and recorded), `components.css` block, renderer template, vocabulary
      entry, and an `example` that validates. (AC #1)
- [ ] All 20 render through the real `agentic-renderer.mjs`; group 3 holds vocabulary-wide. (AC #2)
- [ ] No literal, no brand value in `components.css` — Task 16's grep empty. (AC #3)
- [ ] Each appears in `/components` at full depth with working playground controls — catalog-journey
      green ×3 engines. (AC #4)
- [ ] `gen-handoff` + `gen-vocabulary` (+ `gen-pack-bundle`, `gen-system-graph`, `gen-inspect-data`)
      re-run and committed; CI `verify` drift-check green. (AC #5)
- [ ] `loc-summary` regenerated + both approach baselines. (AC #6)
- [ ] Every stated count regenerated, never hand-edited (the /components count line is view-time;
      param-count only if Task 14's rules say so). (AC #7)
- [ ] The two pins moved on purpose (`CATALOG_COMPONENTS` = 20 names, histogram `3 && 17`) with
      their comments updated.
- [ ] Mutation drill performed and recorded; no regressions (`build-journey` green).

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; per-task validation passed immediately
- [ ] `build-checks` 24/24 · `token-lint` clean · `drift-check` green on the committed tree
- [ ] catalog-journey + build-journey green ×3 engines
- [ ] VR churn exactly 4 PNGs; verify run (not update) green in-container
- [ ] `portfolio-design/references/CHECKLIST.md` run over the ten blocks before committing
- [ ] Report written; PR body carries `Closes #220`; plan+report+review in the same PR
- [ ] Branch verified before every commit (shared worktree)

## RESOLVED DECISIONS (owner-confirmed 2026-08-15) & REMAINING ASSUMPTIONS

Owner-confirmed at planning (AskUserQuestion, all three recommendations accepted):

1. **`nav-tabs` carries `items` as a pipe-delimited scalar string** + `active: number` (min 1).
   No vocabulary-schema call; the spec's Data-binding prose states the encoding rule. DECIDED.
2. **`modal-dialog` renders as an inline non-modal surface** — no scrim, no trap, no `role="dialog"`;
   `--shadow-lg` carries the depth; real confirm/dismiss buttons emit `ui.intent`. DECIDED.
3. **`search-input` keeps a visible caption label** — consistency with `text-field`. DECIDED.

Remaining assumptions (conventional defaults, not blockers):

4. **Zero new contract tokens is a target, not a promise** — the design table was chosen to hit it;
   if implementation proves a genuine gap, the token procedure is included and the report records it.
5. **Two batches, one PR** (two atomic commits, each green) — the ticket's two-PR close applies only
   if the appetite dies at the boundary.

## VERIFICATION LEDGER (spot-checked in the planning session, 2026-08-15)

Every load-bearing citation was read directly, not relayed: `palette.mjs:30-38` (pin + its "#220
adds components by editing this list" comment) · `build-checks.mjs:4132-4206` (21.1 identity, 21.2
palette pin, 21.3 controlFor loop incl. the stat-tile named-subject case, 21.4 histogram literal at
`:4205`) · `catalog.mjs:55-73` (`controlFor` + `tabsFor` + the "3 of 10" comment) ·
`param-manifest.json:63-66` (the four /components entries + counting rules — Task 14 resolved from
the file) · `agentic-renderer.mjs:79-106` (single-child + allowed-names + the status-chip
competing-value rule — `card`'s child list deliberately excludes `status-chip` so that rule never
engages) · `:240-296` (both mirror templates; note `el()` drops `false`/null attrs — pass
`String(bool)` for `aria-checked`, as `care-task-row:278` does) · `lib.mjs` parser throws
(bounds numeric-only, `step > 0`, `min ≤ max`, tokens non-empty `--`-prefixed, four sections in
order) · `visual.spec.mjs:90` (factory waits on studio/replay/frames handles only — graph panel
mounts on activation, so factory baselines are structurally out of reach) · `studio-flow.mjs:12-19`
(navigation-is-chrome verbatim) · `gen-loc-summary.mjs:23` (specs invisible to the runtime regex) ·
`gen-system-graph.mjs:67` (the one-line header regex).

## NOTES (open canvas)

**Why this ticket is smaller than it looks.** #215/#218 were built so that components are DATA:
`catalog.mjs`, `components.html`, `studio-docs.mjs`, `catalog-journey.mjs`, `prepareHandoff`,
groups 3/18/21.x-loops/23 all iterate the artifacts. The complete list of hand edits outside
specs/CSS/templates: `palette.mjs` (one array), `build-checks.mjs` (one literal), renderer header
prose, two CLAUDE.md sentences, maybe one param-manifest entry. Everything else is regeneration.

**Why `ds-`**: all ten are scenario-agnostic library primitives — `metric-tile`'s own Usage prose
defines the prefix rule ("the `ds-` prefix marks a cross-scenario library component, distinct from
`vd-`/`fw-`").

**Interactivity gradient, argued once**: the "deliberately non-interactive" rule is scoped to the
three flow primitives (`studio-flow.mjs:14-19`) — a contract-stability argument about ALREADY-SHIPPED
components, not a system rule. Precedent for real interactive elements in templates: `primary-button`
(button + bus), `care-task-row` (flip-then-report), `plant-card` (anchor). The ten split three ways:
bus-emitting (ghost-button, toggle-switch, modal-dialog's actions — each mirrors an existing
template), natively-focusable-but-bus-silent (the three fields — a value change is not an intent in
this vocabulary today, and inventing an `agent.*`/`ui.value` verb is exactly the schema-adjacent call
this ticket must not make), and presentational (nav-tabs, empty-state, progress-indicator, card).
Playground safety: per-component `createBus()` isolation, no sandbox needed, confirmed against
`catalog.mjs:257` + `action-bus.mjs`.

**The select-field insight** (worth keeping): a closed `<select>` needs no options list — the
specimen depicts the collapsed state, so the component stays scalar WITHOUT a delimited hack. Only
nav-tabs genuinely needs the delimited string.

**Rejected along the way**: `role="dialog"` + focus trap in the renderer (behavioral state has no
home in pure `(props) => Node` templates); a `--color-danger` token (metric-tile's accent-mix
precedent says emphasis needs no new hue; error states deferred whole); ARIA `tablist` on nav-tabs
(roles promise keyboard behavior the composition model forbids); ids for label association (implicit
wrapping is structural and collision-free); shipping any `wc/` wrapper (riding debt, explicitly
optional, would touch `WRAPPER_ATTRS` + the manifest's interactive-specimen line + the histogram's
OTHER number — a different ticket).

**Sequencing note**: no open PRs at planning time (PR #267/#219 merged 2026-08-14), so no
baseline-collision partner. If anything merges to main touching `components-*`/`approach-*` PNGs
before Task 19, merge main first and re-run `update:docker` (the epic's second-regenerator rule).

**Size estimate vs ticket**: ~10 specs (~40–60 lines each) + ~10 CSS blocks (~16–50 lines) + ~10
templates (~5–15 lines) + pins/prose ≈ 900–1300 hand-written lines + regenerated artifacts — inside
the ticket's 1200–1500 estimate.

## AMENDMENTS

<!-- append-only after first approval/execution -->
