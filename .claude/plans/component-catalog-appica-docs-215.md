# Feature: The component catalog at /components — appica-grade generated docs (#215)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before implementing. Pay special attention to naming of existing utils and models — import
from the right files.

## Feature Description

A standalone, hash-routed, per-component catalog page at `/components` that presents the docs this
repo already **generates** — specs, the handoff pack, the agent vocabulary, the system graph — at
the presentation grade of the appica.dev/ui reference. Per component: a live playground with
prop controls (bounds from the spec's own `min`/`max`/`step`), API + token tables, a11y notes,
⌘K searchability, copy-as-Markdown-for-AI, a Figma link-out, and code tabs (HTML + token classes ·
`vd-*` elements · React via wrapper · vocabulary JSON). **Nothing is hand-written**: prose comes
from the generated pack, markup is serialized from live renders, the copied Markdown is the
committed spec source, token values resolve live via `getComputedStyle`.

This is **mount 1 of "Docs, two mounts of one source"** (architecture §Other eng-lead calls). The
studio inspector (#218) is mount 2 and will import this ticket's per-component renderer — design
the seam for it, do not build it.

## User Story

As a **deep-dive UX-engineer evaluator** (and the hiring manager beside them)
I want to **browse every component of the system with a live playground, real API/token tables and
copy-ready code in one linkable catalog**
So that **I can verify the design system is real, generated and agent-ready instead of trusting
the claim**.

## Problem Statement

The repo generates specs, a handoff pack and an agent vocabulary, but presents them only as
`handoff.html`'s three-column JSON/prose viewer. The gap the appica reference exposes is
*presentation, not substance* — there is no per-component playground, no bounded prop controls, no
code tabs, no per-component deep links, no ⌘K reachability. The strongest generated evidence in
the repo is the hardest to browse.

## Solution Statement

One new page (`components.html`) + one new hand-written canon module (`system/catalog.mjs`) that
**consume the existing generated artifacts through the existing view-time join** —
`prepareHandoff(pack, vocab, graph)` already returns `example`, `wrapper`, `tokens` (with pack
bindings) and `consumer` per component (#211 built exactly this for #215). The page renders every
vocabulary component as an anchor-addressed section (hash deep links survive reload natively),
each with a playground driven through the shipped `renderComposition`, tables projected from the
artifacts, and code tabs that serialize live DOM. Chrome joins in the same PR: the footer site
index, static ⌘K commands, pack-boot + dock, the VR page set, param-manifest, loc-summary.

## Out of Scope / Non-Goals

- **Not building #218** (the studio inspector mount) — only exporting a per-component render
  function it can import. No edits to `system/studio.mjs`.
- **Not adding the ten new components** (#220) — the catalog renders the 10 that exist; the count
  is read from the artifact so #220 changes data, not this code.
- **No new generated artifact** (architecture §Data model — hard decision). The join is view-time,
  pure, already shipped in `prepareHandoff`.
- **No wc wrappers authored** — the `vd-*`/React tabs stay presence-gated on the 3 that exist
  (`vd-care-task-row`, `vd-plant-card`, `vd-status-chip`); the 7 absences are honest, not gaps to fill.
- **No view-transition names** — the page names nothing for VT (the #171 lesson; #190 unlanded).
  No vt-verify entry needed: the page opens zero transitions and no morph wrapper is used.
- **No new analytics virtual routes** — the ticket asks for none.
- **No nav item** — footer site index only (the D6 three-item nav is a recorded decision).
- **No inspect-mode mount** on this page (avoids the gen-inspect-data ROLES cascade; not in the
  ticket's AC). No glossary mount.
- **Not changing** `handoff.html`'s rendering, `prepareHandoff`'s shape, `gen-handoff.mjs`,
  `gen-vocabulary.mjs`, or `action-bus.mjs`.

## Feature Metadata

**Feature Type**: New Capability (new page + module over existing data)
**Estimated Complexity**: High (not algorithmically — the cascade surface is wide: chrome churn,
16+2 baselines, 4 generated-artifact regens, a new build-checks group, a new journey driver)
**Primary Systems Affected**: `system/catalog.mjs` (new) · `components.html` (new) ·
`system/palette.mjs` · `system/client.neutral.config.js` · `system/handoff-viewer.mjs` (one export) ·
`tooling/build-checks.mjs` · `tooling/visual-regression/visual.spec.mjs` · `system/param-manifest.json` ·
CLAUDE.md architecture map
**Dependencies**: none new. #211 (merged) supplies the `example` field + the view-time join.

## Related Work

**Implements**: [#215](https://github.com/linardsb/ux-factory/issues/215) · **Epic**: #202 —
`docs/epics/prototype-studio.prd.md` §8 + `docs/epics/prototype-studio.architecture.md`
(§Data model "Docs catalog carries no new generated artifact", §Other eng-lead calls "Docs, two
mounts of one source"). Inherited, not re-decided: no generated catalog artifact · token values
never in artifacts · ⌘K static commands only · copy-as-Markdown from committed spec source ·
HTML tab serialized from live render · `/components` route · footer-index-in-same-PR.

**Back-references**:
- #211 (closed) — `prepareHandoff`'s graph join, `example` on the pack side (deliberately NOT in
  vocabulary.json — it is a recorder prompt input; never "fix" that), `validateExamples`,
  build-checks group 18.
- Memory: *Palette memoizes — chrome needs static tags* (#188 measurement) — the reason every ⌘K
  command in this ticket is static.
- Memory: *`hidden` defeated by author display* · *VR baseline traps* (several) · *Stale serve =
  wrong tree* — all load-bearing below.

**Forward-references**: #218 (inspector = mount 2, imports `renderComponentDocs`) · #220 (ten new
components — will trip the pinned 3/7 wrapper histogram and the palette list drift check, loudly,
by design) · #216 (the other chrome ticket — **never run concurrently**, see Baseline-collision).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/handoff-viewer.mjs` (all 329 lines) — Why: `prepareHandoff(pack, vocab, graph)` is the
  catalog's entire data layer. Lines 54–126: the join returns per component `name, status,
  className, head, sections, vocab, example, wrapper, tokens (name·group·packs), consumer`.
  Lines 128–223: the private markdown-subset renderer (`renderMarkdown`) — this ticket **exports
  it** and reuses it for the prose sections; do not write a second one. Lines 26–36: the `el()`
  DOM-builder idiom every canon module copies.
- `system/palette.mjs` (all 273 lines) — Why: lines 75–157 `buildCommands()` is where the static
  commands go (pages list line 79, exhibits idiom lines 97–114 — same-page sets hash, cross-page
  navigates). Line 221 `commands ??= buildCommands()` is the memoization the AC tests against.
  Line 273: Node-import-safe self-boot — build-checks can import this module.
- `handoff.html` (all 200 lines) — Why: the closest page precedent — fetches pack + vocab, error
  card on failure, baked verbatim fictional notice (lines 150–153, 185–189), token-only page
  styles in its own `<style>`.
- `build.html` lines 1–40 + 1005–1022 — Why: the canonical shipped-page skeleton: head order
  (`tokens.contract.css → tokens.neutral.css → components.css → portfolio.css → pack-boot.js`
  with **pack-boot's tag after the stylesheets**), noindex, the page-wide
  `[hidden]{display:none!important}` rule (memory: `hidden` is defeated by any author `display`),
  script order (client config → site.js → analytics/dock/palette modules).
- `system/agentic-renderer.mjs` — Why: `renderComposition(vocab, node, bus, path)` (line 379) is
  the playground's only render path; `validateComposition` throws path-naming refusals the
  playground shows verbatim; templates lines 221–364 show what serialized HTML will contain.
- `system/action-bus.mjs` lines 41–90 — Why: `createBus()` for the playground; interactive
  templates emit `ui.intent` on it.
- `handoff/verdant/pack.json` — Why: the shapes. `components[]` carry `component, status, class,
  contract, props (with min/max/step on stat-tile.value), tokens, states, children, example,
  sections`; `portability.webComponents.files` (the 3 wrappers) and `portability.figma.import`
  (`"figma-import.md"` → link target `/handoff/verdant/figma-import.md`).
- `handoff/verdant/vocabulary.json` — Why: `components` keys are the catalog's component set
  (AC #1's count source); entries carry `props/states/children/usage` but **no `example`**.
- `system/system-graph.json` — Why: `tokens[]` = `{name, group, packs:{neutral,saulera,verdant}}`
  (RAW declared bindings — print verbatim); `consumers[]` rows with `spec` join per component.
- `system/wc/vd-care-task-row.mjs` line 58, `vd-plant-card.mjs` line 74, `vd-status-chip.mjs`
  line 32 — Why: `observedAttributes`. **Gotcha: care-task-row's attribute is `action` but the
  spec prop is `type`** — a mechanical camelCase→kebab projection fabricates an API. A hand
  `WRAPPER_ATTRS` map is required, pinned by build-checks (see group 21). Wrappers call
  `customElements.define` at module top — **not Node-importable**; the pin parses the source text
  (the group-12 CSS-mirror precedent).
- `system/wc/README.md` — Why: consumption snippets the vd-*/React tabs mirror (import line +
  element usage); the trajectory sentence for the 7-absent honesty note.
- `tooling/visual-regression/visual.spec.mjs` (all 231 lines) — Why: the PAGES entry shape; the
  asrc idiom (line 35): ready handle **set only on success** so a broken artifact hangs the gate
  loud; no `waitVisible` needed (catalog fetches at load, no IntersectionObserver beat).
- `tooling/build-checks.mjs` lines 1–60 (header roster), 136–143 (`group()` helper), 1145
  (group 7 vetting MODULES — catalog.mjs joins), 442 (group 3's shape — validate against the REAL
  vocabulary), line 3855 (`all 20 groups pass` → 21).
- `system/param-manifest.json` — Why: `$description` counting rules (scope says "the 10 VR-gated
  shipped pages" → becomes 11) + entry granularity precedents (`/work`'s counted specimens,
  per-item = one control).
- `system/pack-boot.js` lines 28–80 — Why: it restores committed, derived AND imported packs
  pre-paint, so a single post-load `getComputedStyle` resolve is correct for all three; the dock
  re-points the one pack `<link>` mid-visit — the token-value cells re-resolve on that link's
  `href` mutation.
- `tooling/proto-journey.mjs` + `tooling/studio-journey.mjs` (skim structure only) — Why: the
  journey-driver shape: serve on :4757, per-engine loop, assertions phrased as resulting DOM,
  refusals asserted as DOM + readout + clean console.
- `system/client.neutral.config.js` lines 35–61 — Why: the footer site index lives HERE (site.js
  only renders it). Note the existing "Components" label in "The system" column → collision, see
  Task 5.
- `agent-layer/gen-loc-summary.mjs` lines 20–27 — Why: GROUPS are regexes; `system/catalog.mjs`
  and `components.html` are picked up automatically — regen only, no generator edit.

### New Files to Create

- `components.html` — the page: skeleton, page styles (`cat-*` classes), fictional notice, mount.
- `system/catalog.mjs` (~600) — hand-written canon: pure helpers + per-component renderer +
  page mount. Node-import-safe (DOM only inside function bodies, self-boot behind
  `typeof document`).
- `tooling/catalog-journey.mjs` (~250) — operator-run cross-engine driver for the running-page ACs.
- `.claude/plans/component-catalog-appica-docs-215.md` (this file), plus report + review in the PR.

### Relevant Documentation

- `docs/epics/prototype-studio.architecture.md` §Data model (lines 101–106) + §Other eng-lead
  calls (lines 142–147) — the verbatim decisions this ticket implements.
- `.claude/references/kb-format.md` — spec head format (only if a spec question arises; no spec
  edits are planned).
- appica.dev/ui — the presentation reference (layout register: per-component depth, playground
  first, tables quiet). Do not copy its chrome; this site's calm token grammar wins.

### Patterns to Follow

**DOM building** — the `el(tag, attrs, ...children)` builder (handoff-viewer.mjs:26), textContent
only, never innerHTML from data. Serialization (`outerHTML`) is a READ and legal (group 7's
recorded reasoning at build-checks:1145).

**Refusals are content, never throws** — the playground catches `renderComposition`'s validation
Error and prints `e.message` verbatim in the component's `role="status"` line (bus-toggles.mjs
discipline); the page must log nothing to the console on that path.

**Ready handles** — `[data-catalog="ready"]` set **only on successful render** (approach's asrc
idiom, visual.spec.mjs:32–35): a broken artifact must hang the VR gate loudly, never baseline an
empty catalog.

**Static ⌘K + drift pin** — a second copy of generated data in a shipped module is allowed only
with a build-checks identity assertion against the artifact (the proto-journey `TONES` pattern;
dock.mjs `PACKS` precedent).

**Header comments** — new files open citing epic #202 ticket #215 + the architecture §; catalog.mjs
records the no-second-truth rule ("mount 1 of two; #218 imports renderComponentDocs") and the
no-bus-verb/no-VT reasoning the way studio-flow.mjs records its decisions.

**The check must be able to fail** — every group-21 assertion gets a mutation case or a pinned
histogram; never grep where a function can run (text-parse allowed only for the two
non-executable sources: wrapper `observedAttributes`, following group 12's CSS-mirror precedent).

---

## IMPLEMENTATION PLAN

### Phase 1: Module + page (the feature)

**Tasks:** export `renderMarkdown`; build `system/catalog.mjs` (pure layer → per-component
renderer → page mount); build `components.html`.

### Phase 2: Chrome joins

**Depends on:** Phase 1 (the route must exist before chrome points at it)

**Tasks:** footer site index; ⌘K static commands + exported component list.

### Phase 3: Gates

**Depends on:** Phases 1–2

**Tasks:** build-checks group 21 (+ group 7 MODULES + header/footer lines); VR spec entry;
`tooling/catalog-journey.mjs`.

### Phase 4: Cascades + baselines

**Depends on:** Phases 1–3 all landed in the working tree

**Tasks:** param-manifest + `gen-param-count`; `gen-loc-summary`; CLAUDE.md map + count updates;
baseline regen (16 chrome-bearing churn + 2 new) from a clean detached worktree; drift-check green.

---

## STEP-BY-STEP TASKS

### Task 0 — Branch

- **IMPLEMENT**: `git fetch origin && git checkout -b feature/component-catalog-215 origin/main`
  (main is at 45b9ab5+; PR #255 merged 2026-08-10 — do NOT branch from the current
  `feature/studio-compiled-screens-overflow-251` checkout).
- **GOTCHA**: Memory *shared worktree, parallel sessions* — verify the branch immediately before
  every commit; stage by explicit path. **Chrome cascade: this ticket runs ALONE** — confirm no
  concurrent PR regenerates any baseline (`gh pr list`) before starting Phase 4.
- **VALIDATE**: `git branch --show-current`

### Task 1 — UPDATE `system/handoff-viewer.mjs`: export the markdown renderer

- **IMPLEMENT**: change `function renderMarkdown(` to `export function renderMarkdown(` and
  extend its comment: consumed by system/catalog.mjs (#215) — same bounded construct census; a
  catalog prose need beyond the census is a spec-format conversation, not a renderer extension.
- **GOTCHA**: change nothing else in the file; `handoff.html` must render byte-identically (its
  two baselines are not in this PR's churn set — handoff.html is outside the VR 10).
- **VALIDATE**: `node -e "import('./system/handoff-viewer.mjs').then(m => console.log(typeof m.renderMarkdown))"` → `function`
- **SATISFIES**: enables AC #4/#5 rendering without a forked renderer.

### Task 2 — CREATE `system/catalog.mjs` (the pure layer first)

- **IMPLEMENT** (exports, all DOM-free, above any DOM code):
  - `export const CATALOG_READY = "data-catalog"` (optional constant; the handle name in one place).
  - `export function controlFor(propName, propSpec)` → descriptor:
    `{ kind: "enum", options: spec.enum }` when `enum` present; `{ kind: "boolean" }` for
    boolean; for numbers `{ kind: "number", ...(has bounds ? { min, max, step } : {}) }` —
    **bounds appear ONLY when the spec declares them; nothing invented** (AC #3; a declared
    subset carries exactly that subset); `{ kind: "text" }` for strings.
  - `export function tabsFor(component)` → `["html", ...(component.wrapper ? ["vd", "react"] : []), "json"]`
    (component = a `prepareHandoff` row; presence-gate is the pack's own portability block).
  - `export const WRAPPER_ATTRS = { "care-task-row": { type: "action", plantName: "plant-name", status: "status", checked: "checked" }, "plant-card": { name: "name", species: "species", status: "status", photoUrl: "photo-url" }, "status-chip": { value: "value", label: "label" } }`
    — prop→attribute maps for the 3 wrappers. **`type→action` is the reason this map exists**;
    build-checks pins every value against the wrapper source's `observedAttributes` and every key
    against the vocabulary entry's props.
  - `export function specPath(name)` → `system/specs/${name}.md` (the copy-as-Markdown fetch
    target and the group-21 fs existence check).
  - `export function vdMarkup(component, props)` — browser-only body but exported: builds the
    custom element via `document.createElement(component.className)` + `setAttribute` through
    `WRAPPER_ATTRS` (booleans: present-when-true), returns `el.outerHTML`. Serialized, never
    string-authored — escaping is the parser's.
  - `export function reactSnippet(component, props)` — pure string projection of the SAME
    attribute map into one JSX self-closing element plus the wrapper import line (mechanical
    projection of generated data; values JSON-escaped). Header comment: React 19 sets string
    attributes on custom elements natively (wc/README's recorded verification).
- **PATTERN**: pure/DOM split of handoff-viewer.mjs and trace-player.mjs; header cites #215 +
  architecture §Other eng-lead calls.
- **VALIDATE**: `node -e "import('./system/catalog.mjs').then(m => { console.log(m.controlFor('value', {type:'number'})); console.log(m.tabsFor({wrapper:null})); })"`
  → no bounds keys; `["html","json"]`.
- **SATISFIES**: AC #3, #7 (the pure halves).

### Task 3 — ADD to `system/catalog.mjs`: `renderComponentDocs` (the #218 seam) + page mount

- **IMPLEMENT** `export function renderComponentDocs(container, component, model, opts = {})` —
  renders ONE component's docs (this exact function is mount 2's import; keep it free of page
  chrome). Per component, in order:
  1. **Head**: `<h2 id?>` name (the section wrapper owns the hash id, not the h2), `className`
     mono, non-shipped status pill (hv idiom), **Figma link-out** →
     `/handoff/verdant/${pack.portability.figma.import}` (label it what it is: "Figma import
     path"), **copy-as-Markdown button**.
  2. **Playground**: a stage `<div>` + one control per prop from `controlFor` (enum → radiogroup
     or `<select>`, number-with-bounds → `<input type="range" min max step>` with a live value
     readout, number-without-bounds → `<input type="number">` with **no min/max/step
     attributes**, boolean → checkbox, text → text input), initial values = `component.example`
     (all 10 components carry one; if absent render controls at empty defaults — do not invent
     an example). Each input re-renders the stage through
     `renderComposition(vocabWhole, { name, props }, bus)` — validation errors land in the
     component's `role="status"` line verbatim, stage keeps its last good render, nothing
     throws to console. The bus is one `createBus()` per playground; wire one `"*"` consumer
     writing the last `ui.intent` (`type · intent`) into the same status line — the specimen's
     clicks visibly reach the bus contract (no dead controls).
  3. **Code tabs**: a `role="tablist"` row (`aria-selected`, arrow keys optional — buttons with
     `aria-pressed` acceptable; follow the `.stu-tab` precedent) over panels: **HTML** = the
     CURRENT stage node's `outerHTML` re-serialized on every prop change (never a stored
     string); **vd-*** and **React** only when `component.wrapper` (via `tabsFor`) — content
     from `vdMarkup`/`reactSnippet` over the CURRENT props, plus the honest absence note on the
     other 7 taken verbatim from the pack's portability `trajectory` string (generated, not
     authored); **JSON** = `JSON.stringify(component.vocab, null, 2)`. Panels toggle via
     `hidden` (the page carries the `[hidden]{display:none!important}` rule).
  4. **API table**: rows from `component.vocab.props` (name · type · required · enum ·
     min/max/step when declared · description) + states + children lines.
  5. **Token table**: rows from `component.tokens` (the graph-joined array): name · group ·
     the three RAW pack bindings verbatim · a **live value cell** filled by
     `getComputedStyle(document.documentElement).getPropertyValue(name)` at render — plus a
     swatch when the value parses as a colour. Null-group rows still render (the join
     deliberately keeps them visible). `component.consumer` cites the components.css block label
     when present.
  6. **Prose**: the spec sections from `component.sections` through the imported
     `renderMarkdown` — Accessibility is the AC's named section; render all sections (Usage,
     States, Data binding, Accessibility) under h3s, hv-style.
  - **Copy-as-Markdown**: on click, fetch `/${specPath(component.name)}` (lazy, cached per
    component), `navigator.clipboard.writeText(text)` **verbatim** — the committed spec source
    byte-for-byte, no wrapper prose, no reassembly. Button flips "Copied ✓" (hv-copy idiom).
  - **Page mount** `mountCatalog()` (behind `typeof document`, only when
    `document.querySelector("[data-catalog-root]")` exists): `Promise.all` fetch
    `/handoff/verdant/pack.json` + `/handoff/verdant/vocabulary.json` + `/system/system-graph.json`
    → `prepareHandoff(pack, vocab, graph)` → render: a count line whose number is
    `Object.keys(vocab.components).length` (**the artifact, never a literal** — AC #1), a
    compact component index strip (plain `<a href="#name">` chips — sticky is a site-wide no-op,
    so the index is structural, top of page), then one `<section id="<name>">` per component via
    `renderComponentDocs`. On success ONLY: set `data-catalog="ready"` on the root. Then the
    deep-link fix: if `location.hash` names a rendered section, `scrollIntoView` + focus its
    heading (`tabindex="-1"`, `preventScroll`) — the browser's native hash scroll fired before
    the async render, so this re-run is what makes AC #2 true; also listen for `hashchange` to
    move focus on ⌘K same-page commands. On fetch/render failure: error card (handoff.html
    idiom), ready never set.
- **GOTCHA**: token value cells go stale when the dock swaps the pack mid-visit — one
  `MutationObserver` on `link[href^="/system/tokens."]`'s `href` (the element pack-boot re-points)
  re-resolves all value cells after the new sheet loads. At-rest it never fires (VR-safe:
  pack-boot is a guaranteed no-op by default).
- **GOTCHA**: zero inline-style writes (catalog.mjs joins group 7's MODULES); classes only.
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/components.html` — page renders 10
  sections, playground edits re-render, refusal line works (clear a number input), tabs gate 3/7.
- **SATISFIES**: AC #1, #2, #3, #4, #5, #7.

### Task 4 — CREATE `components.html`

- **IMPLEMENT**: mirror build.html's skeleton: `<title>ux factory · components</title>`,
  description meta, `noindex`, favicon, head order **contract → neutral → components.css →
  portfolio.css → pack-boot.js (last element in head)**; page `<style>` with the `cat-*` classes
  (tokens only; grid/% structural literals fine) **including `[hidden]{display:none!important}`**;
  `<body data-page="components">` (no nav key matches — correct: the page is off-nav); section
  head: h1, one-line intro naming what is generated, the **baked verbatim fictional notice**
  (handoff.html lines 150–153 idiom, with its own copy.json re-confirm fetch), the count line
  slot, the index strip slot, `<div data-catalog-root>`; scripts in build.html's order:
  `client.neutral.config.js` → `site.js` → `analytics.mjs` (module) → `dock.mjs` (module) →
  `palette.mjs` (module) → `catalog.mjs` (module).
- **GOTCHA**: min-width:0 on any grid/flex item holding wide code (memory: *VR gate
  single-engine blindspot* — eyeball in a real browser too). Code panels scroll inside
  `overflow-x:auto` containers.
- **VALIDATE**: page renders under neutral AND saulera (swap via the dock), header/footer inject,
  ⌘K opens.
- **SATISFIES**: AC #1, #2, #8 (page half).

### Task 5 — UPDATE `system/client.neutral.config.js` (footer site index)

- **IMPLEMENT**: Site column gains `{ label: "Components", href: "/components" }` (after Build);
  rename "The system" column's existing `{ label: "Components", href: "/system/components.css" }`
  to `label: "Component styles"` — two links named "Components" to different targets is a real
  ambiguity, and the sibling labels ("Token contract", "Neutral pack") are friendly names, not
  filenames.
- **GOTCHA**: this one item churns **all 16 chrome-bearing baselines** (#148 — the footer claims
  to be the full index, so joining is mandatory). That is Phase 4's regen, priced in.
- **VALIDATE**: any IA page's footer shows both entries; every footer route resolves under
  `npx serve .`.
- **SATISFIES**: AC #8 (footer half).

### Task 6 — UPDATE `system/palette.mjs` (static, presence-gated ⌘K)

- **IMPLEMENT**:
  - `pages` list gains `["Go to Components", "/components"]` (line 79's array).
  - `export const CATALOG_COMPONENTS = ["care-task-row", "demo-notice", "list-row", "metric-tile", "plant-card", "primary-button", "screen-header", "sequence-step", "stat-tile", "status-chip"]`
    — a STATIC second copy of the vocabulary's keys, deliberately, with a comment naming the
    contract: the palette memoizes at first open (#188: a dynamic registration races it 17–134 ms),
    so the list is code, and build-checks group 21 pins it against the generated vocabulary —
    the dock `PACKS` / bus-toggles `TONES` pattern. **#220 adds components by editing this list,
    and the pin is what forces that edit.**
  - In `buildCommands()`: for each `CATALOG_COMPONENTS` entry, an exhibits-idiom command
    `["Components: <name>", "/components", <name>]` — same-page sets `location.hash`,
    cross-page navigates to `/components#<name>` (reuse the existing exhibits loop by appending
    to its array, not a new mechanism).
- **GOTCHA**: no `import()` in any command's construction path; labels must stay plain strings so
  `fuzzyScore` sees them. Do not touch the memoization.
- **VALIDATE**: on `/` open ⌘K → type "stat" → "Components: stat-tile" appears; Enter navigates
  to `/components#stat-tile`.
- **SATISFIES**: AC #6.

### Task 7 — UPDATE `tooling/build-checks.mjs`: group 21 "catalog" (+ group 7 join)

- **IMPLEMENT**: add catalog.mjs to group 7's MODULES list (zero inline-style writes). New
  group 21 after group 20, importing `system/catalog.mjs` + `system/palette.mjs` + the REAL
  artifacts (pack, vocab, graph) + `prepareHandoff`:
  1. **Set identity**: `Object.keys(VOCAB.components).sort()` deep-equals
     `pack.components.map(c => c.component).sort()` — "renders every vocabulary component" made
     structural.
  2. **Palette pin**: `CATALOG_COMPONENTS` (sorted) deep-equals the vocabulary keys (sorted) —
     the TONES pattern; the mutation is implicit (edit either side → red).
  3. **controlFor over every real prop of every entry**: enum props → options array IDENTICAL to
     the enum; boolean → boolean kind; stat-tile's `value` → `{min:0,max:100,step:1}` read from
     the artifact, asserted equal to the descriptor (not typed twice: compare descriptor fields
     to the spec's own fields); **every numeric prop WITHOUT declared bounds yields a descriptor
     with NO min/max/step keys** (`Object.hasOwn` false — the AC-#3 mutation surface); plus one
     synthetic `{type:"number", min:5}` → exactly `{kind:"number", min:5}` (partial bounds carry
     only what was declared).
  4. **tabsFor over the real prepared model**: every component's tabs contain vd/react IFF
     `wrapper` non-null; **pin the histogram 3 with / 7 without as a tripwire** with a comment:
     the day #220 or a wrapper lands, this number moves and the pin is the reminder that the tab
     just lit up — move it deliberately.
  5. **WRAPPER_ATTRS**: for each of the 3 wrappers, read `system/wc/<class>.mjs` source text,
     extract the `static observedAttributes = [...]` literal (JSON-parse the bracket slice —
     the group-12 "CSS cannot import" precedent, stated in a comment: the wrapper defines a
     custom element at import and cannot run under Node); assert every map VALUE is in that
     list and every map KEY is a prop of the component's vocabulary entry. Mutation case: a
     copy of the care-task-row map with `type: "type"` must FAIL the observed-list check —
     the fabricated-API refusal is real.
  6. **reactSnippet**: over care-task-row's example props → contains `action="water"` and NOT
     `type="water"`; a props value containing `"` arrives escaped.
  7. **specPath + fs**: for every vocabulary component, `existsSync(specPath(name))` — the
     copy-as-Markdown target exists for all 10.
  - Update the header comment (roster line `21 catalog …`, "Twenty groups" → "Twenty-one") and
    the final summary line to `all 21 groups pass`.
- **PATTERN**: `group("catalog", \`…detail…\`)` one-✓-line shape; counts printed FROM the
  artifacts, not typed.
- **VALIDATE**: `node tooling/build-checks.mjs` → 21 ✓ lines. Then the mutation drill: locally
  flip one `WRAPPER_ATTRS` value and one `CATALOG_COMPONENTS` entry → both red → revert.
- **SATISFIES**: AC #1, #3, #6, #7 (the CI-reachable halves) + the epic's check-must-fail rule.

### Task 8 — UPDATE `tooling/visual-regression/visual.spec.mjs`

- **IMPLEMENT**: PAGES gains, after the `build` entry:
  `{ name: 'components', url: '/components.html', kind: 'ia', waitReady: '[data-catalog="ready"]' }`
  with a comment: set on success only (the asrc idiom) — a broken pack/vocab/graph hangs this
  gate loudly rather than baselining an empty catalog; no waitVisible — the catalog fetches at
  load with no visibility-gated beat. Update the header "ten shipped pages" → eleven.
- **GOTCHA**: token-value cells make the two pack baselines differ — that is the point; each pack
  has its own PNG. The MutationObserver never fires at rest.
- **VALIDATE**: (Phase 4 runs the real capture; here) `cd tooling/visual-regression && node serve.mjs &` →
  `npx playwright test --list` shows `components · neutral` + `components · saulera`.
- **SATISFIES**: AC #8 (VR half).

### Task 9 — CREATE `tooling/catalog-journey.mjs` (operator-run, cross-engine)

- **IMPLEMENT**: the running-page halves the pixel gate and group 21 structurally cannot reach
  (state each boundary in the header, the group-9/11/13/16 discipline). Serve on :4757
  (`node tooling/visual-regression/serve.mjs`), engines chromium+firefox+webkit resolved from
  `tooling/visual-regression/node_modules` (build-journey's resolution), per-engine:
  1. **Count from artifact**: fetch `/handoff/verdant/vocabulary.json` in the driver; the page's
     count line renders that number; section count equals it.
  2. **Deep link survives reload** (AC #2): goto `/components#plant-card` COLD → the plant-card
     section is scrolled into view (viewport intersection) and its heading has focus; then
     reload at the same URL → same result.
  3. **Bounded controls from the artifact** (AC #3): stat-tile's value control carries
     min/max/step equal to the vocabulary entry's fields (read live, not typed); find via the
     artifact a numeric prop with NO bounds and assert its input carries NO min/max/step
     attributes.
  4. **Live serialization** (AC #5): read the HTML tab's text, compare `===` against
     `stage.firstElementChild.outerHTML` evaluated in-page; change a prop (select a different
     enum value), assert BOTH changed and are again identical — the tab is a re-serialization,
     not a stored string.
  5. **Copy-as-Markdown byte-traceable** (AC #4): `addInitScript` stubs
     `navigator.clipboard.writeText` to capture; click copy on stat-tile; captured text
     byte-equals `fs.readFileSync("system/specs/stat-tile.md", "utf8")` — byte-IDENTICAL to the
     committed spec source.
  6. **⌘K static-before-render** (AC #6): a fresh page with `/handoff/verdant/pack.json`'s
     response HELD via route interception (the catalog cannot have rendered), press ⌘K, assert
     "Components: stat-tile" and "Go to Home" are listed — the commands exist before the catalog
     module registered anything; release the route, page still reaches ready.
  7. **vd tab gating both ways** (AC #7): tab present on the 3 wrapper components, absent on the
     other 7 — the split COUNTED from the fetched pack's portability files, not typed; then the
     not-fabricated proof: in-page `import("/system/wc/vd-plant-card.mjs")`, insert the vd tab's
     exact serialized markup, assert the shadow root renders the plant name — the tab's markup
     drives the real element.
  8. **Refusal without a throw**: clear stat-tile's number input → the status line names the
     offending path, the stage keeps its last good render, ZERO console errors on the whole run
     (proto-journey's no-page-errors contract).
  9. **Playground bus readout**: click the primary-button specimen → the status line shows the
     `ui.intent`; keyboard (Enter on the focused button) produces the same resulting DOM.
- **GOTCHA**: memory *stale serve = wrong tree* — curl-verify an edited file (or PORT/BASE
  override) before trusting a run. Memory *hover probes race smooth scroll* — wait for scrollY
  stability before the intersection assertions.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs & node tooling/catalog-journey.mjs all`
  → all passes on all three engines.
- **SATISFIES**: AC #2, #3, #4, #5, #6, #7 (running-page halves).

### Task 10 — UPDATE `system/param-manifest.json` + regen param-count

- **IMPLEMENT**: `$description` scope sentence "the 10 VR-gated shipped pages" → 11 (and its
  handoff.html clause stays true — handoff remains outside). New entries under `"/components"`
  following the granularity rules:
  - `[data-cat-control]` — "playground prop controls (per prop, per component = one control class)"
  - `.cat-tab` — "code-tab switcher (per component = one control)"
  - `.cat-copy-md` — "copy component spec as Markdown (per component = one control)"
  - `.cat-playground .vd-primary-button, .cat-playground .vd-plant-card, .cat-playground .vd-care-task-row`
    — "interactive playground specimens (emit onto the playground bus, one group)" (the /work
    specimen precedent).
  Then `node agent-layer/gen-param-count.mjs`.
- **GOTCHA**: approach.html renders the site-wide total → its baselines move (already inside the
  16-churn set). Selector strings here are contract: use the exact classes catalog.mjs emits.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && node tooling/drift-check.mjs` (param
  section green).
- **SATISFIES**: AC #8 (manifest half).

### Task 11 — Regen loc-summary + UPDATE CLAUDE.md

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (catalog.mjs + components.html are
  auto-matched by the runtime/pages regexes). CLAUDE.md surgical edits: architecture-map entries
  for `catalog.mjs` (one block in the system/ section: mount 1 of two, #218 imports
  renderComponentDocs, the WRAPPER_ATTRS honesty note, group 21 + catalog-journey as its gates)
  and `components.html` (one line beside build.html/studio.html); update the counts that become
  false: VR "10 shipped pages" → 11, pack-boot/dock "all ten shipped pages" → eleven,
  param-manifest scope wording. Nothing else.
- **VALIDATE**: `node tooling/drift-check.mjs` → loc-summary green; read the CLAUDE.md diff —
  every changed line traces to this ticket.
- **SATISFIES**: AC #8 (loc half) + repo convention.

### Task 12 — Baselines (the churn, priced and serialized)

- **IMPLEMENT**: commit everything first. Then from a **clean detached worktree under `/Users`**
  (never /private/tmp — Docker sharing):
  `git worktree add /Users/Berzins/vr-215 <commit> && cd /Users/Berzins/vr-215/tooling/visual-regression && npm ci && npm run update:docker`.
  Expected churn: **16 chrome-bearing PNGs regenerate** (footer item) + **2 new**
  (`components-neutral.png`, `components-saulera.png`) = 18; the 4 proto PNGs must NOT change
  (protos load no chrome) — verify with `git status` before copying back. Copy the snapshots
  back, commit in the same PR, remove the worktree.
- **GOTCHA**: memories — *VR update skips sub-perceptual* (rm a PNG to force if needed), *VR
  tolerance hides text changes* (a green run is not proof), *approach countUp flake* (a
  stability retry on approach is the rAF counter, not a regression), *hero re-skin trap* (index
  capture waits on the spine handle — already handled by the spec).
- **VALIDATE**: `npx playwright test` inside the worktree → all 22 green; `git status` shows
  exactly 18 changed/new PNGs.
- **SATISFIES**: AC #8 (baseline half).

### Task 13 — Full gate pass + PR

- **IMPLEMENT**: run the whole battery (Validation Commands below). Write
  `.claude/reports/component-catalog-215-report.md`. PR via the piv-create-pr flow; **body
  carries `Closes #215`**; plan + report (+ review file when review runs) committed in the PR.
- **VALIDATE**: `gh pr checks` green (verify + visual); `gh pr view --json body | grep "Closes #215"`.
- **SATISFIES**: AC #8 + the epic's every-ticket-carries list.

---

## TESTING STRATEGY

### Unit (CI — build-checks group 21)

Pure functions over the REAL artifacts: controlFor bounds fidelity (+ the no-bounds and
partial-bounds mutations), tabsFor with the pinned 3/7 histogram, WRAPPER_ATTRS pinned against
wrapper source + vocabulary (with the `type:"type"` mutation), palette list pinned against the
vocabulary, pack↔vocab set identity, spec files exist. Every assertion can go red; the two pins
are tripwires #220 is meant to trip.

### Integration (operator-run — catalog-journey, 3 engines)

The nine cases in Task 9 — each phrased as resulting DOM, counted from fetched artifacts, with
the route-hold making the ⌘K race deterministic and the clipboard stub making byte-equality
assertable cross-engine.

### Edge Cases

- Numeric input cleared / NaN → refusal in the status line, last good render kept, clean console.
- Hash naming no component (`#nope`) → page renders normally, no scroll, no throw.
- Artifact fetch failure → error card, `data-catalog` never set (VR would hang loud — by design).
- Pack switch mid-visit → token value cells re-resolve (manual check under the dock).
- A component with `children` (plant-card/care-task-row) → derived chip renders in the
  playground; no children editor (props-only playground — scope).
- `enum` select cannot produce an invalid value — refusals only reachable via number/text paths.

## VALIDATION COMMANDS

### Level 1: Syntax & module safety
- `node -e "import('./system/catalog.mjs')"` (Node-import-safe)
- `node -e "import('./system/palette.mjs')"` (still Node-safe after edits)

### Level 2: Unit / CI gates
- `node tooling/build-checks.mjs` → 21 ✓ lines
- `node tooling/drift-check.mjs` → all sections green (loc, param, handoff untouched)
- SDK-free invariant untouched: `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`

### Level 3: Integration
- `node tooling/visual-regression/serve.mjs &` then `node tooling/catalog-journey.mjs all`
- `node tooling/build-journey.mjs all` (unchanged surface — regression guard only)

### Level 4: Manual
- `npx serve .` → /components under neutral; dock → saulera → token values update; ⌘K from /work
  → "Components: list-row" → lands focused; copy-as-Markdown → paste → compare to the spec file;
  reload at `#sequence-step`.

### Level 5: VR
- Task 12's worktree flow; `npx playwright test` 22/22.

## ACCEPTANCE CRITERIA (ticket #215, mapped)

- [ ] `/components` renders every vocabulary component, count from the artifact — Tasks 3, 7(21.1), 9(J1)
- [ ] Deep-linkable by hash, survives reload — Tasks 3, 9(J2)
- [ ] Controls bounded by the spec's own min/max/step; no invented bounds — Tasks 2, 7(21.3), 9(J3)
- [ ] Copy-as-Markdown byte-traceable (byte-identical) to the committed spec source — Tasks 3, 9(J5)
- [ ] HTML tab serialized from a live render — Tasks 3, 9(J4)
- [ ] ⌘K static + presence-gated, present before the catalog registers anything — Tasks 6, 7(21.2), 9(J6)
- [ ] `vd-*` tab absent ×7 / present ×3 — Tasks 2, 7(21.4), 9(J7)
- [ ] Footer index + VR set (+ new baselines) + param-manifest + loc-summary, all in this PR — Tasks 5, 8, 10, 11, 12

## COMPLETION CHECKLIST

- [ ] All tasks in order, each validation run at the task
- [ ] Mutation drill on group 21 performed and reverted (record it in the report)
- [ ] 18-PNG churn verified exact (protos untouched)
- [ ] catalog-journey green ×3 engines; build-journey regression pass green
- [ ] CLAUDE.md diff surgical; plan + report in the PR; `Closes #215` in the body

## OPEN QUESTIONS / ASSUMPTIONS

1. **ASSUMED: stacked anchor sections, not an SPA router.** AC #1 ("renders every component")
   plus native hash behavior and VR determinism all favour it; appica's grade is depth-per-
   component, not routing tech. If the owner wanted a one-component-at-a-time view, the mount
   loop changes but the renderer/seam does not.
2. **ASSUMED: copy-as-Markdown = fetch the committed spec file verbatim** (byte-identical beats
   byte-traceable; zero authored bytes). The ticket's word "reassembles" would also permit
   rebuilding from pack.json — strictly weaker; noted here in case review prefers it.
3. **ASSUMED: the static ⌘K component list is acceptable as a pinned second copy** (dock PACKS /
   TONES precedent). The alternative — no per-component commands, only "Go to Components" —
   would satisfy the palette constraint but not "⌘K searchable" per component.
4. **Footer label rename** ("Components" → "Component styles" in The system column) is a
   judgment call bundled into the already-churning chrome; flag in the PR description.
5. **ASSUMED: no inspect mount on /components** (not in AC; avoids the inspect-data ROLES
   cascade). Cheap to add later.
6. **React tab shows the attribute form** (parity with the vd tab, one JSX line + import), not
   the `.data` property form; the wrappers' README records both as one model.

## NOTES (open canvas)

**Why no new artifact, restated:** everything the page needs is in
`prepareHandoff(pack, vocab, graph)` — #211's PR built the join naming #215 as its consumer
(handoff-viewer.mjs:43–48). The catalog is a RENDERER. If an implementation urge appears to write
a catalog.json, it is wrong by recorded decision.

**Why the vd tab needs WRAPPER_ATTRS:** `vd-care-task-row` observes `action`, the spec prop is
`type` (wc file line 58 vs pack props). A mechanical kebab-case projection would emit
`type="water"` — markup that silently does nothing = a fabricated capability, the exact thing the
ticket forbids. The map is hand-written but triple-pinned (wrapper source, vocabulary, journey's
paste-and-render proof).

**Why the ⌘K race is tested with a held route, not a sleep:** the AC says "open the palette
before the catalog module would have registered anything". Holding pack.json's response pins the
page in the pre-render state deterministically on all engines; a sleep would encode a guess.

**Rejected: registering wrappers on the catalog page** to live-render the vd tab. Serializing a
DOM-built unknown element gives identical markup without page-wide side effects; the journey does
the live-render proof where it belongs.

**Rejected: `range` inputs for unbounded numbers** — a range needs min/max, and defaulting them
(0–100) IS inventing bounds; unbounded numerics get `type="number"` with no constraint attributes.
That split is what makes AC #3 assertable as attribute absence.

**Sequencing risk:** this is a chrome ticket — the baseline-collision rule says it runs alone.
Before Task 12, `gh pr list` must be empty of anything regenerating baselines; if #216 or a
factory ticket is in flight, THIS ticket waits or re-runs update:docker after merging main.

**Perf note:** 10 playgrounds render at load (~10 small compositions) — trivial next to /factory's
replay. INP budget untouched; no studio-journey rows added (the catalog is not a studio surface).
If a future INP row is wanted it belongs to #213's driver, not here.

**vt-stack-audit:** not run — the page names nothing for view transitions and positions nothing
absolutely over named elements. Recorded so the omission reads as a decision, not a miss.

## AMENDMENTS

<!-- append-only after first approval; newest at the bottom -->
