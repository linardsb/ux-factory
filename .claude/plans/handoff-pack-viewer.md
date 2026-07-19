# Feature: Handoff-pack viewer — one source → engineer docs + agent vocabulary, plus download

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The handoff pack made legible at a glance (architecture §Data model, UI-surface decision 2026-07-17). A vanilla ES-module viewer page renders each ComponentSpec as **one document with three projections of a single source, side by side**:

1. the **machine head** (the spec's JSON — component/class/props/tokens/states/children),
2. the **human prose** (the four `## ` sections the handoff pack ships — Usage, States, Data binding, Accessibility), and
3. the **agent vocabulary entry** generated from that same head (`vocabulary.json`'s per-component entry — the composition-facing projection),

so an engineer *sees* — structurally, without any callout — that **one source drives both the engineer docs and the agent vocabulary**. Plus a **pack download** (a new `agent-layer/` generator, registered in `build.mjs`) delivering the full pack as a single artifact: specs, DataContracts, DTCG tokens, Style-Dictionary outputs (css/ios/android), and the vocabulary.

Per the legibility discipline (PRD §6): shown, not told — **zero pedagogy callouts**; success reads as unusual clarity.

## User Story

As a hiring manager's engineer evaluating the "engineer-ready handoff" claim
I want to read each component's usage docs, typed props, data contract, and the agent-facing vocabulary as one coherent document — and download the whole pack in one click
So that I can verify I could wire real data against this design system today, and see that the human docs and the agent contract come from the same source and cannot drift apart.

## Problem Statement

The handoff pack (`handoff/verdant/`, from #7) exists as committed JSON/CSS/Swift/XML artifacts, but there is no surface that makes it *legible*: a reader must open raw files and mentally join `pack.json` (docs) to `vocabulary.json` (agent layer) to see they share a source. The PRD's realism bar (§6.4 — "an engineer could wire real data today") and the architecture's explicit UI-surface decision (line 39 — "render the spec's machine head and prose sections side by side … with the vocabulary entry generated from it linked in place") are unmet. And the pack is only downloadable file-by-file, not as one deliverable.

## Solution Statement

A **pure render module** `system/handoff-viewer.mjs` (mirroring `system/trace-player.mjs`'s split: a DOM-free parse/prepare function + a DOM-building render function, and — per that module's hard convention — **it does no fetching**), driven by a bare page `handoff.html` (mirroring `trace.html`/`derive.html`/`agentic.html`) whose inline `<script type="module">` fetches `handoff/verdant/pack.json` + `handoff/verdant/vocabulary.json`, joins them by component name, and hands the pair to the renderer. The renderer builds, per component, a side-by-side layout of the three projections, rendering the prose via a **small hand-rolled markdown-subset renderer**. The subset is exactly what the specs actually use (verified against all 28 section bodies — see CONTEXT REFERENCES): **paragraphs (with `\n` soft-breaks), `**bold**`, `` `code` ``, `- ` unordered lists, pipe tables, and fenced ` ```json ` blocks** — built element-by-element via a line-walking parser (no `innerHTML` from content, no reliance on blank-line block-splitting that a multi-line fence would break). Download is a new zero-dep generator `agent-layer/gen-pack-bundle.mjs` emitting **one deterministic `pack.bundle.json`** (every pack file — all UTF-8 text — inlined as a string under a sorted `files` map; ~40 LOC, lossless, git-diffable) into `handoff/verdant/`, wired into `build.mjs` and `tooling/drift-check.mjs`; the page's download control is a plain `<a download>` to the committed bundle (no client-side archive library, no Blob, no drag-and-drop — the flow is outbound only). **(Bundle format resolved to JSON — see Open Question 1; a store-only ZIP is the noted alternative if real-file drop-in DX is later preferred.)**

## Out of Scope / Non-Goals

- **Not changing the pack format or any generator that produces `handoff/verdant/`** — `gen-handoff.mjs` / `gen-vocabulary.mjs` are #7/#11 and untouched. The viewer and the bundle generator are pure consumers; a format change would be a #7-family change (both parsers kept in sync — `.claude/references/kb-format.md`).
- **Not authoring or editing any ComponentSpec / DataContract** — the viewer renders what the pack contains, faithfully (including `demo-notice`, `status:"spec"`, and `contract:null` components — those are honest edge cases surfaced, not filtered).
- **Not the Factory page (#10)** — #10 *links here* and may later embed the render module; this ticket ships the standalone deep-linkable viewer, keeping the module embeddable (no fetch inside it) so #10 needs no rework.
- **Not the agentic-UI study, renderer, or bus** — #11/#13. The viewer only *displays* the vocabulary entry; it never renders a composition.
- **No markdown library, no framework, no bundler, no client-side zip/archive dependency** — shipped-pages vanilla hard constraint. The prose renderer handles only the bounded markdown subset the specs actually use.
- **Not a second-scenario (Fieldwork) pack** — only `handoff/verdant/` exists today; the viewer and bundle are single-scenario, hardcoded to `handoff/verdant/` like every existing generator (`gen-handoff.mjs:18-19`). Parameterization is a later concern.
- **No pedagogy callouts, badges, or "notice how…" copy** — the one-source claim is made structurally (layout adjacency), per the issue's own AC and PRD §6's subtlety bar.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (the markdown-subset prose renderer + the deterministic bundle generator are the two real primitives; the join + layout are mechanical)
**Primary Systems Affected**: new `system/handoff-viewer.mjs` (view-time module) · new `handoff.html` (page) · new `agent-layer/gen-pack-bundle.mjs` (generator) · `agent-layer/build.mjs` (registration) · `tooling/drift-check.mjs` (`checkHandoff()` coupling) · new committed `handoff/verdant/pack.bundle.json` artifact · `CLAUDE.md` (map) · possibly `_headers`
**Dependencies**: none — Node built-ins (`node:fs`/`node:path`/`node:url`) + browser platform APIs only (bundle is inlined-JSON — no `node:zlib`, no CRC)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/14 (`Closes #14`)   ·   **Epic**: https://github.com/linardsb/ux-factory/issues/1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Data model line 39 — the ComponentSpec UI-surface decision 2026-07-17; PRD §6.4 realism bar + §6 legibility layer — inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/handoff-data-layer.md` (#7) — Why: created `pack.json` (head fields spread inline + `sections[]` prose per component — the viewer's primary source), the six specs, the SD outputs, and the deterministic-regeneration guarantee the bundle relies on. Its NOTES pin the pack-inlines-prose decision ("#14's viewer gets one fetch").
- `.claude/plans/agentic-bridge.md` (#11) — Why: created `vocabulary.json` (name-keyed `components{}` with `usage` + inlined `contract` per entry — the "agent vocabulary entry generated from the spec" the viewer links in place). Its NOTES: the vocabulary is a name-keyed object precisely so renderer/lookup consumers (this viewer) can index by name.
- `.claude/plans/trace-recorder-player.md` (#5) — Why: `system/trace-player.mjs` is the exact module pattern to mirror — pure `parseTrace` + DOM `renderTracePlayer`, no fetch inside the module, driven by `trace.html`'s inline fetch. Copy that split and its `destroy()`-if-re-rendered contract for #10.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #10 (Factory page) — station 4 links here; may embed `renderHandoffViewer` directly (the module stays fetch-free so it can).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `handoff/verdant/pack.json` (whole file, 445 lines) — Why: THE primary source. Shape (from `gen-handoff.mjs:61-86`): `{ $description, scenario: "verdant", generatedFrom, components: [{ ...head (component, status, class, props, tokens, states, children), contract: "contracts/<name>.contract.json" | null, sections: [{title, body}] }], portability: { webComponents: { files[], readme, trajectory }, figma: { import, parity } } }`. Read `plant-card` (lines 126-196) as the full-shape example and a `contract:null` entry (`primary-button`/`screen-header`/`demo-notice`) for the edge case. **The prose `sections[].body` contains markdown.** VERIFIED across all 28 section bodies (7 components × 4 sections) — the complete construct census the renderer must handle, and nothing more:
  - **`- ` unordered lists — 7 occurrences** (every "States" section; items are `\n`-separated with **no blank line between them**, e.g. `care-task-row` States line 71). ⚠️ This is the construct the original spec missed: a blank-line block-splitter renders these as one run-on `<p>`. Lists are first-class.
  - **pipe tables — 7** (every "Data binding" section; includes a `| --- | --- |` separator row to drop).
  - **fenced ` ```json ` blocks — 4** (Data binding sample records; single-line JSON *in this data*, but the parser must not depend on that).
  - **`**bold**` and `` `code` ``** inline throughout (bold and code are never nested in each other — a single-regex inline split suffices).
  - **soft-break paragraphs** — a paragraph block carrying internal `\n` (e.g. `plant-card` Data binding intro, line 190: "The API serves more than the card binds…\n…\n…"); `\n` inside a paragraph is whitespace (join on space), NOT a block break.
  - **Absent (do NOT build): headings, links, blockquotes, ordered lists, images, HR** — census count 0 for each. Building them is YAGNI + a zero-dep temptation.
- `handoff/verdant/vocabulary.json` (whole file, 447 lines) — Why: the agent-vocabulary projection to link in place. Shape (from `gen-vocabulary.mjs:43-56`): `{ $description, scenario, generatedFrom, composition: { shape, childrenRule, chipRule }, components: { "<name>": { class, status, props, states, children, usage, contract } } }`. **Name-keyed object** (not an array) — index `vocabulary.components` by name; join key is the component name string (`pack.components[i].component === Object.keys(vocab.components)[k]`). Note it carries only `usage` prose (not all four sections) + the inlined DataContract.
- `system/trace-player.mjs` (whole file, 179 lines) — Why: the module pattern to mirror EXACTLY. `parseTrace(text)` is pure/DOM-free (lines 27-46 — "so it runs under Node"); `renderTracePlayer(container, trace)` builds DOM element-by-element via `el()`/`textContent` (never `innerHTML` from data); the module does **no fetch** (header lines 14-17 — "the page fetches … and hands the text to parseTrace"); returns a `destroy()` the embedder must call before re-render (header 19-21, fn ~175). Header format: `// system/<name>.mjs — hand-written canon (this repo; not generated). … (epic #1, ticket #14; architecture §Data model line 39).`
- `trace.html` (whole file, ~120 lines) — Why: the bare-page + inline-fetch pattern. `<head>` stack (lines 17-20): noindex, logo icon, `tokens.contract.css` → `tokens.neutral.css` → `components.css` → `portfolio.css`; no `site.js`/chrome; harness-only chrome in a `<style>` block; single mount `<div>`; inline `<script type="module">` (lines 90-118) does `fetch(...).then(res => { if(!res.ok) throw … ; return res.text/json() }).then(render).catch(errorCard)`.
- `agentic.html` (lines 208-212) — Why: the exact fetch-JSON idiom for a pack artifact: `const r = await fetch("/handoff/verdant/vocabulary.json"); if (!r.ok) throw new Error(...); vocab = await r.json();`. Also confirms `/handoff/verdant/vocabulary.json` is the live URL.
- `scenarios/verdant/copy.json` — Why: honesty surface #1, the fictional notice. CONFIRMED key is **`fictionalNotice`** (top-level string: "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved."). Fetch `/scenarios/verdant/copy.json` and render `copy.fictionalNotice` verbatim. This is a **THIRD, independent fetch** — it MUST render even if pack/vocab fail (AC: "fictional notice + download control still present" on error), so it does NOT belong inside the pack+vocab `Promise.all`.
- **All pack files are UTF-8 text** — VERIFIED: `handoff/verdant/` holds only `.json`, `.css`, `.md`, `.swift`, `.xml`, `.mjs` (no binary assets; `photoUrl` images never ship — the specs say the monogram placeholder is the exercised path). This is why the `pack.bundle.json` (files inlined as strings) is lossless and human-readable — the fact that decides Open Question 1 for JSON.
- `derive.html` (lines ~160-207) — Why: the one shipped page that renders richer content; its `esc()` helper + escaped template strings are the *looser* precedent for trusted-shape data. Prefer the `trace-player`/`agentic-renderer` DOM-built approach for the viewer (pack content is generated/trusted, but element-building is the house canon and avoids every escaping trap).
- `agent-layer/gen-handoff.mjs` (whole file, 96 lines) — Why: THE generator pattern the bundle generator mirrors: `ROOT`/`SPECS`/`DEST` resolved from `import.meta.url` (lines 14-19, never cwd), `readdirSync(...).filter(...).sort()` determinism (line 25), `execFileSync(process.execPath, [SD_BUILD], {stdio:"inherit"})` child-process idiom (line 38 — "so agent-layer stays zero-dep"), result-object return, `pathToFileURL` standalone guard (91-96). `genHandoff()` is **zero-arg** (scenario-fixed to verdant) — unlike ledger-parameterized generators.
- `agent-layer/build.mjs` (whole file, 52 lines) — Why: registration pattern (import → `const r = genX()` → aligned `✓` log). `genHandoff()` runs, then `genVocabulary()` (lines 32-40). Register `genPackBundle()` **after** both (it bundles their outputs). Note: `build.mjs` runs from the jobs folder, but the pack generators are also invoked repo-locally by `drift-check.mjs` — the bundle generator must work standalone too.
- `tooling/drift-check.mjs` (`checkHandoff()`, lines 45-59) — Why: CRITICAL coupling. It re-runs `genHandoff()` + `genVocabulary()` then `git status --porcelain -- handoff/` and throws on any diff. A new artifact under `handoff/` is **not** guarded unless `genPackBundle()` is added here — and it MUST be byte-deterministic or this gate fails every CI run.
- `system/agentic-renderer.mjs` (lines 16-19, and `el()` helper ~120-130) — Why: the `el(tag, attrs, ...children)` DOM-builder helper and the "never innerHTML from untrusted content" convention to reuse in the viewer's rendering (copy the `el()` shape rather than importing — the module is a different concern).
- `.claude/references/kb-format.md` (lines 13-29) — Why: the spec/head/section shape the pack projects; confirms the viewer consumes the *projected* pack, never re-parses raw `.md` at view time.
- `_headers` (whole file, ~19 lines) — Why: has `Cache-Control` rules for `/system/*`, `/scenarios/*`, `/traces/*`, `/assets/*` but **none for `/handoff/*`**; site-wide `X-Robots-Tag: noindex` (line 6) already applies. Read before deciding whether the bundle/pack needs a cache rule (default: no change).
- `CLAUDE.md` (§Architecture map · §Where new code goes · §Ground rules) — Why: "Machine-layer artifact → `agent-layer/gen-<output>.mjs` … register in build.mjs"; "View-time behaviour on shipped pages → a hand-written ES module beside `system/site.js`"; token discipline; deploy-=-commit (the bundle is committed, never gitignored); honesty contract (the `status`/`contract:null` surfaces stay truthful).
- `factory.html` (line 94) — Why: the plan-gated download promise ("component specs, typed props and data contracts, downloadable") this ticket fulfills; check the wording the Factory page will point at.

### New Files to Create

- `system/handoff-viewer.mjs` — hand-written canon: `export function prepareHandoff(pack, vocab)` (pure — joins pack ↔ vocab by name, returns a view model) + `export function renderHandoffViewer(container, model)` (DOM). No fetch. Includes the private markdown-subset renderer.
- `handoff.html` — bare page at repo root: noindex, CSS stack, `<style>` layout block, mount `<div>`, inline `<script type="module">` fetching pack.json + vocabulary.json, plus the download control.
- `agent-layer/gen-pack-bundle.mjs` — new zero-dep generator: `export function genPackBundle()` reading `handoff/verdant/` and emitting one deterministic bundle artifact.
- `handoff/verdant/pack.bundle.json` — GENERATED, COMMITTED bundle artifact (inlined-JSON; decision recorded in Open Question 1).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

Vanilla hard constraint → external docs are thin by design:

- [MDN — Blob / URL.createObjectURL + `<a download>`](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) — Why: only relevant if the download needs a client-generated Blob; the recommended approach (committed bundle + `<a href download>`) needs none.
- [ZIP file format — local header · central directory · EOCD](https://en.wikipedia.org/wiki/ZIP_(file_format)#Structure) + CRC-32 (IEEE 802.3 polynomial `0xEDB88320`) — Why: **only if the ZIP alternative is later chosen** (the JSON bundle is the resolved path — Open Question 1). Kept for the two-way door: `node:zlib` provides `deflate` but NO zip container/CRC — both hand-rolled (~90 lines total); store-only (no deflate) + zeroed mtimes + sorted file order = byte-deterministic.
- `.claude/references/frontend-component-best-practices.md` — house UI rules (project on-demand context for UI work).

### Patterns to Follow

**Module split + no-fetch** (`trace-player.mjs:14-17, 25-46`): a pure prepare/parse export + a DOM render export; the page fetches. Header cites governing doc + ticket.

**DOM builder** (`agentic-renderer.mjs` `el()`): `el(tag, attrs, ...children)` setting `textContent`/attributes; never assemble HTML strings from content.

**Bare page** (`trace.html:17-20`, `derive.html:17-20`): noindex, four-stylesheet stack, no chrome, `<style>` for page-local layout (token-only — `var(--…)`, no literals).

**Generator shape + guard** (`gen-handoff.mjs:14-19, 91-96`): `import.meta.url` paths, `readdirSync().filter().sort()`, `pathToFileURL` standalone guard, zero-arg export, aligned `✓` line.

**Drift coupling** (`drift-check.mjs:45-59`): after emitting into `handoff/`, the artifact is only CI-guarded if the generator is called inside `checkHandoff()`; determinism is mandatory.

**File headers**: `// system/handoff-viewer.mjs — hand-written canon (this repo; not generated). View-time handoff-pack viewer: one source → engineer docs + agent vocabulary (epic #1, ticket #14; architecture §Data model line 39, PRD §6.4).` and `// gen-pack-bundle.mjs — the handoff pack → one downloadable bundle (epic #1, ticket #14).`

**Errors**: view-time — an `errorCard(msg)` on fetch/parse failure (pattern `trace.html` catch); generator — plain `Error` naming the offending path.

---

## IMPLEMENTATION PLAN

### Phase 1: The prose renderer + view model (foundation)

The two primitives everything else composes: the markdown-subset renderer (the underestimated piece) and the pack↔vocab join.

**Tasks:**
- `prepareHandoff(pack, vocab)` — join by name, return an ordered view model per component.
- The markdown-subset renderer — paragraphs, bold, inline code, pipe tables, fenced ```json blocks — DOM-built.

### Phase 2: The viewer render function

**Depends on:** Phase 1

- `renderHandoffViewer(container, model)` — per component, the three-projection side-by-side layout; `destroy()` returned for #10.

### Phase 3: The page

**Depends on:** Phase 2

- `handoff.html` — fetch both artifacts, hand to the renderer, wire the download control, error card on failure.

### Phase 4: The download bundle generator

**Independent of:** Phases 1–3 (build-time only; parallelizable) — but its output URL is what the page's download control points at.

- `gen-pack-bundle.mjs` emitting the deterministic bundle; register in `build.mjs`; wire into `drift-check.mjs`; commit the artifact.

### Phase 5: Docs + validation

**Depends on:** Phases 1–4

- `CLAUDE.md` map; `_headers` check; full validation ladder.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

### VERIFY branch base (pre-flight — before any code)

- **IMPLEMENT**: Cut `feature/handoff-pack-viewer` from `main` (all deps landed: #7/#11 merged — confirm `handoff/verdant/pack.json` and `handoff/verdant/vocabulary.json` both exist and parse). Confirm the pack currently regenerates clean.
- **VALIDATE**: `test -f handoff/verdant/pack.json && test -f handoff/verdant/vocabulary.json && echo BASE-OK` · `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && git diff --quiet handoff/ && echo PACK-CLEAN` (pack is deterministic and committed).
- **SATISFIES**: sane foundation for all ACs.

### CREATE `system/handoff-viewer.mjs` — view model + markdown-subset renderer

- **IMPLEMENT**:
  - Header comment (Patterns above). A local `el(tag, attrs = {}, ...kids)` helper (copy the shape from `agentic-renderer.mjs`; `text` attr → `textContent`, others via `setAttribute`; append non-null kids).
  - `export function prepareHandoff(pack, vocab)` — **pure, DOM-free** (so #10 and Node checks can call it). Throw a plain `Error` if `pack.components` is missing/empty (defensive corruption check; the pack is generated, not user input). Returns `{ components: [...], composition: vocab.composition }` — **an object, not a bare array**, so the render fn gets the page-level composition rules too. Each component entry (in pack order):
    - `head` = **only the machine-head fields, explicitly picked** — `{ component: c.component, status: c.status, class: c.class, props: c.props, tokens: c.tokens, states: c.states, children: c.children }`. Do NOT spread `c`: the pack component object also carries `contract` (a path string) and `sections` (prose), and dumping those into the head `<pre>` is wrong — sections render as prose in projection 2, and the contract path is carried separately.
    - the rest: `{ name: c.component, status: c.status, className: c.class, contractPath: c.contract /* path string or null */, head, sections: c.sections, vocab: vocab.components[c.component] ?? null }`.
    - **Two `contract` shapes — don't conflate:** pack's `c.contract` is a *path string* (or null); the vocab entry's `.contract` is the *full inlined DataContract object* (or null). The vocab `<pre>` shows the inlined object (that's the point — the agent projection carries the contract); the docs panel links the path.
  - **Private `renderMarkdown(container, md)`** — the underestimated primitive. Use a **line-walking parser** (`const lines = md.split('\n')`, index `i`), NOT blank-line block-splitting (a multi-line fence breaks the latter). Loop over lines, detection order **fence → list → table → paragraph**:
    - **blank line** → skip.
    - **fence** (`lines[i].trim()` starts with ` ``` `) → consume lines until the closing ` ``` `; emit one `<pre class="hv-code">` containing a `<code>` whose `textContent` is `buf.join('\n')` — the raw inner text, **never parsed** (this renders the nested ` ```json ` sample records; robust to internal blank lines even though this data has none).
    - **list** (`lines[i].trimStart()` starts with `- ` or `* `) → consume consecutive item lines; emit `<ul class="hv-list">`, one `<li>` per item, each item's text (after stripping the `- `) through the inline pass. ← **the fix the original spec missed: every "States" section is exactly this.**
    - **table** (`lines[i].trimStart()` starts with `|`) → consume consecutive `|` lines; emit `<table class="hv-table">`: split each row on `|` and drop the empty leading/trailing cell from the bounding pipes; first row → `<th>`; **drop the separator row** (every cell matches `/^:?-+:?$/`); remaining rows → `<td>`; each cell through the inline pass.
    - **paragraph** (fallthrough) → consume consecutive lines that are not blank/list/table/fence; emit `<p class="hv-p">` with the lines **joined on a space** (internal `\n` soft-breaks collapse to whitespace — never a block break), through the inline pass.
    - **Inline pass** (`inlineInto(node, text)`): tokenize `**bold**` → `<strong>`, `` `code` `` → `<code>`, plain runs → text nodes. Build with `createTextNode`/`createElement` — **no innerHTML**. Keep it a small hand-written tokenizer (a single regex split on `` /(\*\*[^*]+\*\*|`[^`]+`)/ ``, then classify each piece).
  - `export function renderHandoffViewer(container, model)` — see next task (kept in the same module). `model` is now `{ components, composition }`.
- **PATTERN**: `trace-player.mjs` (pure/DOM split, no fetch); `agentic-renderer.mjs` `el(tag, attrs, ...kids)`. **Standardize on the agentic-renderer `el` signature** (`attrs.text` → `textContent`, other keys → `setAttribute`, append non-null kids) — do NOT also pull in trace-player's positional `el(tag, className, text)`; pick one shape and use it throughout the module.
- **IMPORTS**: none (browser + pure). `document` referenced only inside render/markdown functions so the top-level module import succeeds under Node (mirror `agentic-renderer.mjs`).
- **GOTCHA**: the construct census in CONTEXT REFERENCES is exhaustive — lists (7), tables (7), fences (4), inline bold/code, soft-break paragraphs; count 0 for headings/links/blockquotes/ordered-lists. Do NOT build a general markdown parser (YAGNI + zero-dep). **The list case is the one the original spec dropped** — get it right or 7 "States" sections render as run-on paragraphs. Detection order in the loop is fence → list → table → paragraph.
- **VALIDATE**: `node --check system/handoff-viewer.mjs` · join check: `node --input-type=module -e "import('./system/handoff-viewer.mjs').then(async m=>{const fs=await import('node:fs');const pack=JSON.parse(fs.readFileSync('handoff/verdant/pack.json','utf8'));const vocab=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const vm=m.prepareHandoff(pack,vocab);console.log(vm.components.length, vm.components[0].name, vm.components.find(c=>c.name==='plant-card').vocab.class, vm.components.find(c=>c.contractPath===null)?.name, !!vm.composition)})"` → prints `7 care-task-row vd-plant-card demo-notice true` (join + edge case + composition present).
- **VALIDATE (golden markdown)**: `renderMarkdown` is DOM-bound, so assert it in the browser check (Level 4) OR add a tiny DOM shim under Node. The golden input is the **real `plant-card` "Data binding" body** (it hits all four block types: intro paragraph with inline code → pipe table with a `|---|` separator → a soft-break paragraph carrying internal `\n` → a ` ```json ` fence) PLUS a **real "States" body** (the `- ` list). Assert the produced DOM contains: a `<ul>` with ≥3 `<li>` (list), a `<table>` with `<th>` and no separator-row `<td>` (table), a `<pre><code>` whose text starts with `{` (fence, unparsed), a `<strong>` and a `<code>` (inline). If the list assertion fails, the block-splitting regression is back.
- **SATISFIES**: AC #1 (the join + prose rendering foundation), AC #3 (States/Data-binding legible)

### ADD `renderHandoffViewer` to `system/handoff-viewer.mjs`

- **IMPLEMENT**: `renderHandoffViewer(container, model)` where `model = { components, composition }`:
  - Clear the container (`container.textContent = ''`, mirror `trace-player.mjs:99`); if `model.composition` is present, append one page-level panel rendering its `shape`/`childrenRule`/`chipRule` as plain prose (the composition contract the vocabulary declares) — **no callout**.
  - Iterate `model.components`; per component, an `<article class="hv-component">` with the component `name` + `class` as an `<h2>`/eyebrow, then a **three-projection grid** (`<div class="hv-grid">`): 
    1. `<section class="hv-head">` — the machine head pretty-printed (`JSON.stringify(head, null, 2)` in a `<pre>`) under an eyebrow "Source (spec head)".
    2. `<section class="hv-docs">` — the four prose sections, each an `<h3>` + `renderMarkdown(...)`; if a `contractPath` exists, an eyebrow linking the DataContract (`<a href="/handoff/verdant/<contractPath>">`), else nothing.
    3. `<section class="hv-vocab">` — the vocabulary entry pretty-printed (`JSON.stringify(vocab, null, 2)` in a `<pre>`) under an eyebrow "Agent vocabulary (generated from the same head)"; if `vocab === null`, a plain honest line ("not in the agent vocabulary").
  - Surface `status` faithfully: when `status !== "shipped"`, an eyebrow-register token (e.g. a `.hv-status` span reading the status) — an honesty surface, not a pedagogy callout.
  - Return `destroy()` (removes any listeners/nodes added; document it in the header for #10 — mirror `trace-player.mjs`). Minimal here (no doc-level listeners expected), but keep the contract for parity.
- **PATTERN**: `trace-player.mjs` render structure + `destroy()` contract; token-only classes (styled in `handoff.html`).
- **GOTCHA**: the "side by side" + "vocabulary entry linked in place" is the AC — the three projections must be visually adjacent per component (CSS grid in Phase 3), not three separate tabs/sections. The adjacency IS the argument (shown-not-told); do not add explanatory copy.
- **⚠️ AC-CRITICAL LAYOUT RISK (the #1 thing to verify early — see Phase 3):** two of the three columns are tall JSON `<pre>` dumps (`head` + the vocab entry — plant-card's vocab entry is ~100 lines with its inlined contract), flanking the prose. A naive `1fr 1fr 1fr` grid renders as three cramped scroll-boxes and **silently kills the legibility claim** (AC #1/#3 — "reads like a doc an engineer could wire from"). Mitigations, decided at render time against the real data: weight the grid toward the **prose column** (e.g. `minmax(0,0.9fr) minmax(0,1.3fr) minmax(0,0.9fr)`), give each `<pre>` `overflow:auto` + a sane `max-height` so a long rail scrolls inside its cell instead of stretching the row, and confirm the three columns top-align. This is a browser-only judgement — **render `plant-card` FIRST and eyeball the adjacency before building any other polish.**
- **VALIDATE**: covered by the browser check in the page task.
- **SATISFIES**: AC #1 (side-by-side + vocabulary in place), AC #4 (zero callouts — structural only)

### CREATE `handoff.html`

- **IMPLEMENT**: bare page at repo root. Header comment citing #14 + architecture line 39. `<head>`: noindex, logo icon, `tokens.contract.css` → `tokens.neutral.css` → `components.css` → `portfolio.css`, then a `<style>` block for the viewer layout — **token-only for color/space/radius/type, structural literals are fine**: `--color-*`, `--spacing-*`, `--radius-*`, `--type-*`, `--font-*` come from `var(--…)` (all exist in `tokens.contract.css` — see the confirmed token list; `--color-bg`/`--color-bg-surface`/`--color-fg`/`--color-fg-muted`/`--color-border`/`--color-accent`, `--radius-md`/`--radius-sm`, `--spacing-sm`/`--spacing-md`/`--spacing-lg`, `--type-body`/`--type-caption`/`--type-eyebrow`/`--type-h2`/`--type-h3`), while `display:grid`, `grid-template-columns`, `%`, and the `@media` breakpoint are inherently structural literals and must NOT be tokenized. Layout: `.hv-grid` 3-up desktop **weighted toward the prose column** (`grid-template-columns: minmax(0,0.9fr) minmax(0,1.3fr) minmax(0,0.9fr)`; `align-items:start` so columns top-align) → single-column stack under a width via a plain `@media`; the two JSON rails' `<pre>` get `overflow:auto` + a `max-height` so a long entry scrolls inside its cell (see the AC-critical layout risk); `.hv-code` monospace scroll block; `.hv-table` bordered; `.hv-list` bulleted. Body: a slim page header (title + the fictional-scenario notice), the **download control** (`<a class="hv-download" href="/handoff/verdant/pack.bundle.json" download>Download the handoff pack (specs · data contracts · tokens · vocabulary)</a>` — plain link to the committed bundle; the label states what it contains without a pedagogy callout), then the mount `<div id="viewer">`. Inline `<script type="module">`:
  ```js
  import { prepareHandoff, renderHandoffViewer } from "/system/handoff-viewer.mjs";
  const mount = document.getElementById("viewer");
  const noticeEl = document.getElementById("fictional-notice");

  // Honesty surface #1 — its own fetch, so it survives a pack/vocab failure (AC).
  fetch("/scenarios/verdant/copy.json")
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(copy => { noticeEl.textContent = copy.fictionalNotice; })
    .catch(() => { noticeEl.textContent =
      "Verdant is a fictional demo scenario."; });   // static fallback keeps the disclosure present

  // The viewer — pack + vocab joined; failure shows an error card, notice + download stay put.
  Promise.all([
    fetch("/handoff/verdant/pack.json").then(r => { if (!r.ok) throw new Error(`pack.json → ${r.status}`); return r.json(); }),
    fetch("/handoff/verdant/vocabulary.json").then(r => { if (!r.ok) throw new Error(`vocabulary.json → ${r.status}`); return r.json(); }),
  ]).then(([pack, vocab]) => renderHandoffViewer(mount, prepareHandoff(pack, vocab)))
    .catch(err => { mount.append(errorCard(`Could not load the handoff pack — ${err.message}`)); });
  ```
  (plus a small `errorCard` builder. The notice `<span id="fictional-notice">` and the download `<a>` are STATIC in the HTML body — they render regardless of any fetch outcome. Note the notice is a THIRD, independent fetch: it must NOT be folded into the `Promise.all`, or a pack 404 would blank the disclosure.)
- **PATTERN**: `trace.html` (bare page, inline fetch, error card), `agentic.html:208-212` (fetch-JSON idiom, fictional notice from copy.json).
- **GOTCHA**: absolute paths only (no bare specifiers — no bundler). No `site.js`/chrome (bare-exhibit precedent — see Open Question 2). The `<a download>` points at `pack.bundle.json` which the Phase-4 generator emits — sequence Phase 4 before the browser check, or the link 404s. The fictional notice's static fallback string is a safety net, not the source of truth: the fetched `copy.fictionalNotice` is what normally renders (verbatim — never paraphrased). **Honesty tension (flagged for confirm):** the notice is under a "hard, never paraphrased" rule, and the fallback line is a paraphrase — defensible because it only fires on a copy.json 404 (a deploy bug, not a normal state) and stays truthful, but the cleaner option is to **bake the exact verbatim `fictionalNotice` string into the static HTML** as the initial content (fetch then merely re-confirms it), so no paraphrase can ever show. Pick one before implementing; confirm the fallback wording with the user either way.
- **VALIDATE**: `npx serve .` → `http://localhost:3000/handoff.html`: every component shows head | docs | vocabulary side by side; **"States" sections render as real bullet lists** (not run-on paragraphs); prose tables + code + bold render legibly; DataContract links resolve; `contract:null` components render without a contract panel; `demo-notice` shows its `spec` status honestly; the fictional notice is visible; download link resolves; NO pedagogy callout anywhere. Automatable via the agent-browser skill (Level 5) — screenshot + assert `.hv-grid`, `ul.hv-list`, and the download link's resolvability.
- **SATISFIES**: AC #1, AC #3 (realism — reads like a doc an engineer could wire from), AC #4

### CREATE `agent-layer/gen-pack-bundle.mjs` (download bundle)

- **IMPLEMENT**: `export function genPackBundle()` — read every file under `handoff/verdant/` **recursively, sorted, deterministically** (`readdirSync(dir, {withFileTypes:true})` recursed, paths sorted lexicographically), **excluding the bundle artifact itself** (`pack.bundle.json`) to avoid self-inclusion. Emit ONE `handoff/verdant/pack.bundle.json`:
  ```json
  { "$description": "Verdant handoff pack, bundled — every file under handoff/verdant/ inlined as a UTF-8 string. Generated by agent-layer/gen-pack-bundle.mjs — do not edit. Unpack: for (const [p,c] of Object.entries(bundle.files)) writeFileSync(p, c).",
    "scenario": "verdant", "generatedFrom": "handoff/verdant",
    "files": { "<relative/path>": "<file contents as string>", ... } }
  ```
  Keys are `handoff/verdant`-relative POSIX paths, **inserted in sorted order** (Node preserves JSON string-key insertion order → deterministic). Serialize with `JSON.stringify(bundle, null, 2) + "\n"` (mirror `gen-handoff.mjs:86`). Return `{ files: <count>, bytes, dest }` for the `✓` line. Header: `// gen-pack-bundle.mjs — the handoff pack → one downloadable bundle (epic #1, ticket #14).`
- **PATTERN**: `gen-handoff.mjs` (paths from `import.meta.url` not cwd, `readdirSync().sort()`, `JSON.stringify(...,null,2)+"\n"`, result object, `pathToFileURL` standalone guard, zero-arg export).
- **IMPORTS**: `node:fs` (readdirSync, readFileSync, writeFileSync), `node:path` (join, relative, sep), `node:url` (fileURLToPath, pathToFileURL). No `node:zlib`, no CRC — every pack file is UTF-8 text (VERIFIED), so inlining is lossless.
- **GOTCHA**: **determinism is non-negotiable** — the #9 drift gate re-runs generators and `git status --porcelain`s `handoff/`; an unsorted directory read or self-inclusion makes CI fail on every run. Sort the recursed file list, exclude `pack.bundle.json`, read files as `"utf8"`, normalize path separators to `/` (so the keys are stable across OSes). JSON is trivially byte-deterministic — no timestamps, no CRC to get exactly right. The bundle is a derived convenience; the source files stay individually committed and inspectable (and now the bundle is text-diffable too, matching "inspectable proof").
- **ALT (noted, not chosen)**: a store-only deterministic ZIP (`pack.zip`) gives `unzip → real files` drop-in DX but costs ~90 LOC of hand-rolled CRC-32/local-header/EOCD encoding, a committed binary, and exact-byte determinism the drift gate punishes if off by one field. Swap is isolated to this generator + the download `href` if drop-in DX is later preferred (Open Question 1).
- **VALIDATE**: `node agent-layer/gen-pack-bundle.mjs` → `pack bundle     ✓  N files (handoff/verdant/pack.bundle.json)`; determinism (run twice): `node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-pack-bundle.mjs && git diff --quiet handoff/verdant/pack.bundle.json && echo DETERMINISTIC` (after first commit); integrity: `node -e "const b=require('./handoff/verdant/pack.bundle.json'); const ks=Object.keys(b.files); console.log(ks.length, ks.includes('vocabulary.json'), ks.includes('contracts/plant-card.contract.json'), !ks.includes('pack.bundle.json'))"` → every pack file present, self excluded.
- **SATISFIES**: AC #2 (download delivers the full pack)

### UPDATE `agent-layer/build.mjs` — register the bundle generator

- **IMPLEMENT**: `import { genPackBundle } from "./gen-pack-bundle.mjs";`; call **after** the `genVocabulary()` block (it must inline the freshly-written pack.json + vocabulary.json); aligned `✓` line: `const pb = genPackBundle(); console.log(\`  pack bundle     ✓  ${pb.files} files (handoff/verdant/pack.bundle.json)\`);`
- **PATTERN**: `build.mjs:32-40` (the genHandoff/genVocabulary registration — column-aligned).
- **VALIDATE**: `cd "../Linards jobs folder" && node "../ux-factory/agent-layer/build.mjs" _factory/kb/decisions/<any-ledger>.md` → all `✓` lines incl. `pack bundle`. (Requires SD deps installed once — pre-existing gen-handoff behavior.)
- **SATISFIES**: AC #2 (registered in build.mjs)

### UPDATE `tooling/drift-check.mjs` — guard the bundle

- **IMPLEMENT**: In `checkHandoff()` (lines 45-59), call `genPackBundle()` after `genVocabulary()` (import it at the top). The existing `git status --porcelain -- handoff/` assertion then covers the bundle — proving it's deterministic and committed.
- **PATTERN**: the existing `genHandoff(); genVocabulary();` sequence in `checkHandoff()`.
- **GOTCHA**: if the bundle is not deterministic, THIS gate fails immediately — run the generator twice locally and confirm zero diff BEFORE wiring it into `checkHandoff()`. Also note `git status --porcelain -- handoff/` flags **untracked AND staged** files, so drift-check only goes green once `pack.bundle.json` is **committed** — same as every existing handoff artifact. Sequence: prove determinism → `git add` + commit the bundle → then `drift-check` regenerates it identically → clean.
- **VALIDATE**: after committing the bundle, `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · handoff · scenarios · traces` (no `handoff/` drift after regeneration).
- **SATISFIES**: AC #2 (bundle is drift-guarded like every generated artifact)

### UPDATE `CLAUDE.md` — architecture map

- **IMPLEMENT**: surgical additions only: a `handoff.html` + `system/handoff-viewer.mjs` line in the appropriate map block (view-time handoff-pack viewer — head + prose + agent vocabulary side by side; download; epic #1 ticket #14); note `gen-pack-bundle.mjs` in the `agent-layer/` block and the `pack.bundle.json` bundle in the `handoff/` line (`regenerate: node agent-layer/gen-pack-bundle.mjs`).
- **PATTERN**: existing one-line-per-file map entries.
- **VALIDATE**: `git diff CLAUDE.md` — additions only, no reflowed neighbours.
- **SATISFIES**: house convention (map stays true)

### VERIFY `_headers`

- **IMPLEMENT**: read it; decide whether `/handoff/*` needs a `Cache-Control` rule (default: **no change** — falls through to the site default; the pack is small and versioned by commit). Add a rule ONLY if the bundle's size/caching warrants it.
- **VALIDATE**: `cat _headers`.
- **SATISFIES**: AC #2 (served sanely)

### RUN full validation + commit generated bundle

- **IMPLEMENT**: run the ladder below; `git add` must include the committed `handoff/verdant/pack.bundle.json` (deploy = commit the artifacts). Single atomic commit: `handoff-pack viewer: head + prose + agent vocabulary side by side, plus deterministic pack bundle (epic #1, ticket #14) — Closes #14`.
- **VALIDATE**: all levels green; `git status` shows the new files + the bundle staged, nothing unexpected.
- **SATISFIES**: all ACs

---

## TESTING STRATEGY

No suite/linter/type-check in this repo (ground rule — don't invent one). "Done" = run the surface you touched.

### Unit-level (Node, scriptable)

- `prepareHandoff` — the join spot-checks (count = 7, `plant-card` vocab present, a `contract:null` component surfaced) from the VALIDATE above.
- `renderMarkdown` — GOLDEN inputs from the real pack (not synthetic): the `plant-card` **Data binding** body (paragraph + inline code → table with `|---|` separator → soft-break paragraph → ` ```json ` fence) AND the `care-task-row` **States** body (a `- ` list). Assert the DOM has: `<ul>` + ≥3 `<li>` (LIST — the regression sentinel), `<table>` with `<th>` and no separator-row cell, `<pre><code>` whose text starts with `{` and is unparsed, `<strong>`, `<code>`. Run under the browser check or a tiny DOM shim.
- `genPackBundle` — standalone run prints `✓`; second run byte-identical (`git diff --quiet`); `Object.keys(bundle.files)` lists every pack file and excludes `pack.bundle.json`.

### Integration

- Full `build.mjs` run from the jobs folder — proves the bundle generator coexists and registers.
- `node tooling/drift-check.mjs` — proves the bundle is deterministic and guarded.
- `handoff.html` under `npx serve .` — the browser path end to end (fetch → join → render → download).

### Edge Cases

- `contract:null` component (`primary-button`/`screen-header`/`demo-notice`) → renders with no DataContract panel, no broken link.
- `status:"spec"` component (`demo-notice`) → status surfaced honestly, no crash.
- A prose section with a nested ```json fence (Data binding) → renders as a `<pre>` code block, not re-parsed.
- A "States" section (`- ` list, no blank lines between items) → renders as a `<ul>` of `<li>`, NOT one run-on `<p>`. ← the primary regression this hardening guards.
- A prose table with the `|---|` separator row → header row in `<th>`, separator row dropped.
- A soft-break paragraph (`plant-card` Data binding intro, internal `\n`) → one `<p>`, `\n` collapsed to spaces (not split into multiple paragraphs).
- `pack.json`/`vocabulary.json` fetch failure → error card, fictional notice + download control still present, no blank page.
- Bundle regenerated twice → zero git diff (determinism — the drift gate's requirement).

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check system/handoff-viewer.mjs && node --check agent-layer/gen-pack-bundle.mjs && echo SYNTAX-OK
```

### Level 2: Unit (Node)

```bash
node --input-type=module -e "import('./system/handoff-viewer.mjs').then(async m=>{const fs=await import('node:fs');const pack=JSON.parse(fs.readFileSync('handoff/verdant/pack.json','utf8'));const vocab=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const vm=m.prepareHandoff(pack,vocab);console.log('components',vm.components.length,'composition',!!vm.composition);})"
node agent-layer/gen-pack-bundle.mjs
node -e "const b=require('./handoff/verdant/pack.bundle.json');const k=Object.keys(b.files);console.log('files',k.length,'has-vocab',k.includes('vocabulary.json'),'self-excluded',!k.includes('pack.bundle.json'))"
node agent-layer/gen-pack-bundle.mjs && git diff --quiet handoff/verdant/pack.bundle.json && echo DETERMINISTIC   # after first commit
```

### Level 3: Integration

```bash
node tooling/drift-check.mjs
cd "../Linards jobs folder" && node "../ux-factory/agent-layer/build.mjs" _factory/kb/decisions/<any-ledger>.md
```

### Level 4: Manual (browser)

```bash
npx serve .   # → http://localhost:3000/handoff.html
```

Checklist: every component shows head | docs | vocabulary side by side · **"States" sections render as bullet lists** · prose tables + code + bold render · DataContract links resolve · `contract:null` + `spec` edge cases render honestly · fictional notice visible (and still visible if pack.json is renamed to force a fetch failure) · download link resolves to `pack.bundle.json` (open it → every pack file inlined) · NO pedagogy callout.

### Level 5: Additional (optional)

agent-browser (skill available): screenshot `/handoff.html`; assert `.hv-grid` (three-projection layout), `ul.hv-list` (the list fix), and that the download link resolves.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — Viewer (vanilla ES module + page) renders each component's spec head + prose side by side from the committed pack artifacts; the vocabulary entry generated from that spec is linked/shown in place per component.
- [ ] AC #2 — Download delivers the full pack (specs/prose via pack.json, DataContracts, DTCG tokens, SD css/ios/android outputs, vocabulary) as one bundle; generator registered in `build.mjs` + guarded in `drift-check.mjs`; artifact committed and deterministic.
- [ ] AC #3 — Realism bar: the rendered pack reads as something an engineer could wire real data from today (PRD §6.4) — typed props, data contracts, states, sample records all legible.
- [ ] AC #4 — Zero pedagogy callouts; the one-source claim is made structurally (adjacency), success reads as unusual clarity.
- [ ] Honesty surfaces truthful: fictional label present; `status`/`contract:null` shown honestly, not hidden.
- [ ] No new dependencies; shipped page + module vanilla; generated bundle committed; conventions matched (headers, error voice, `✓` alignment, token-only CSS).
- [ ] No regressions: full `build.mjs` run green; `drift-check.mjs` green; existing pack artifacts unchanged.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each VALIDATE run immediately
- [ ] Bundle determinism proven (second run, zero diff) BEFORE wiring into `drift-check.mjs`
- [ ] Bundle committed alongside the generator that emits it
- [ ] `CLAUDE.md` map updated, surgical
- [ ] Manual browser checklist all green; read once end-to-end for the honesty contract (nothing implies more than what runs)
- [ ] Open Questions resolved and recorded under AMENDMENTS

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Download mechanism — RESOLVED (pending final confirm): inlined-JSON bundle** (`handoff/verdant/pack.bundle.json` — every pack file inlined as a UTF-8 string under a sorted `files` map). Recommended to the user 2026-07-18 (they were weighing exactly ZIP-vs-JSON friction); plan is written for JSON and will proceed on JSON unless redirected to ZIP before implementation. Rationale: (a) the entire pack is text (VERIFIED — json/css/md/swift/xml/mjs, no binaries), so JSON-inlining is lossless AND the bundle is itself human-readable + git-diffable, which *matches* the repo's "inspectable proof" principle rather than fighting it; (b) ~40 LOC vs ~90 for a hand-rolled store-zip + CRC-32; (c) trivially byte-deterministic — no timestamp/CRC fields to zero exactly, so the #9 drift gate is safe by construction; (d) the download is the same plain `<a href download>` — **no drag-and-drop, no Blob, no client-side archive lib** (the flow is outbound only). **Alternative (noted, not chosen): a store-only deterministic ZIP** — gives `unzip → real files` drop-in DX at the cost of a committed binary + the byte-exact encoder. Swap is isolated to `gen-pack-bundle.mjs` + the one download `href`, so it stays a two-way door if drop-in DX is later preferred.
2. **Page chrome — assumed a bare exhibit page** (no `site.js` header/footer, like `trace.html`/`derive.html`/`agentic.html`/`proto/*`), since every non-IA exhibit surface in the repo is bare and #10's Factory page is the chrome'd context that *links* here. If the viewer should read as a first-class IA page with the site header/footer, switch to the `work.html` chrome pattern (adds `client.neutral.config.js` + `site.js` + `data-page`). Low stakes, two-way door.
3. **`demo-notice` in the viewer — assumed shown faithfully** (it's in `pack.json`; the viewer renders the pack as-is, surfacing its `spec` status honestly). If the pack should not carry `demo-notice` at all, that's a #7 concern (the pack's component set), not the viewer's — out of scope here.
4. **Module reuse by #10 — the render module stays fetch-free** so #10 can `import { prepareHandoff, renderHandoffViewer }` and feed preloaded data (mirrors `trace-player.mjs`). Assumed correct per the trace-player precedent.

## NOTES (open canvas)

**Why the pack (not raw specs) is the viewer's source.** `gen-handoff.mjs` already spreads each spec's head fields inline and attaches `sections[]` (the four prose sections) per component in `pack.json` — one fetch, no raw-`.md` re-parse, no nested-fence parsing hazard at view time. The vocabulary is a second fetch, joined by component name. This is the "one source → two projections" made literal: `pack.json` (docs) and `vocabulary.json` (agent) are both generated from `system/specs/` in the same build, so they cannot drift — and the viewer *shows* both beside the head to make that structural.

**The markdown-subset renderer is the real work.** The prose sections aren't flat text. The bounded subset — VERIFIED across all 28 section bodies — is: paragraphs (with `\n` soft-breaks), **`- ` unordered lists** (every "States" section — the construct the first draft of this plan missed), pipe tables (with a `|---|` separator to drop), ```json fences, and inline bold/code. A general markdown parser is both a zero-dep violation and gold-plating; anything outside this subset (headings, links, blockquotes, ordered lists) has census count 0 and must not be built. Build it element-by-element via a line-walker (the house canon) so content is never `innerHTML`'d and a multi-line fence can't desync the block boundaries.

**Three projections, one claim.** Per component: the raw spec head (source) · the human docs (rendered prose) · the agent vocabulary entry (the machine projection). Adjacency is the argument — the reader sees the same source drive both audiences without a single "notice that…" line. That IS the legibility discipline (PRD §6): the moment it announces itself, it has failed.

**Line-budget sanity vs the ticket estimate (~500–900):** viewer module ~280 (renderMarkdown line-walker + list/table/inline ~120 + render ~120 + prepare ~40) · page ~130 · bundle generator ~45 (json) · CLAUDE.md/_headers ~10. In range.

**Deferred: figma-parity.json.** The pack's `portability.figma.parity` is `null` today (`gen-handoff.mjs:78-83`; the parity file is written only by a real secret-gated `figma-parity.mjs` run — #12). The viewer renders whatever `portability` contains; if parity is `null`, it shows nothing for it (no fake). No action here.

## AMENDMENTS

<!-- Append-only after first approval/execution. Newest at the bottom. -->

**2026-07-18 — Hardening pass (8/10 → 9.5/10), pre-implementation.** Grounded the plan against the real pack data before writing code. Changes:
1. **Markdown renderer corrected (the correctness bug).** The original spec ("split on blank lines → non-table/fence blocks are `<p>`") would have rendered all **7 "States" sections as run-on paragraphs** — every States body is a `- ` unordered list with `\n`-separated items and no blank lines. Re-specced `renderMarkdown` as a **line-walker** (fence → list → table → paragraph) that handles unordered lists (`<ul>/<li>`), soft-break paragraphs (internal `\n` → whitespace), and multi-line-safe fences. Verified the exhaustive construct census across all 28 section bodies (lists 7, tables 7, fences 4, inline bold/code; headings/links/blockquotes/ordered-lists count 0 — not built).
2. **Bundle format → inlined-JSON** (`pack.bundle.json`), was an open ZIP-vs-JSON question. Recommended to the user (pending final confirm): the whole pack is text (no binaries) so JSON is lossless + git-inspectable + ~40 LOC + trivially deterministic, vs. ~90 LOC hand-rolled CRC/zip + a committed binary. Neither format needs drag-and-drop/upload UI — the download is a plain outbound `<a download>`. ZIP kept as a noted two-way-door alternative. Confirmed no drag-and-drop is required for either.
3. **Fictional notice made fetch-resilient.** It is a THIRD, independent fetch (`scenarios/verdant/copy.json` → confirmed key `fictionalNotice`) with a static fallback, moved OUT of the pack+vocab `Promise.all` so a pack 404 can't blank the honesty disclosure (an AC).
4. **`prepareHandoff` shape pinned:** returns `{ components, composition }`; `head` is explicitly field-picked (not `...c` spread) so `sections`/`contract`-path don't leak into the head `<pre>`; documented the two distinct `contract` shapes (pack = path string, vocab = inlined object). Updated all VALIDATE one-liners accordingly.
5. **Token grounding:** confirmed the exact `tokens.contract.css` names the `<style>` block may use, and clarified "token-only" = color/space/radius/type via `var(--…)` while structural layout (`grid`, `1fr`, `%`, `@media`) stays literal.
6. **`el()` signature standardized** on the `agentic-renderer` `el(tag, attrs, ...kids)` shape (no mixing trace-player's positional form). Drift-check commit-ordering subtlety flagged (porcelain lists staged/untracked → bundle must be committed for the gate to go green).

Net: the two real primitives (markdown renderer, deterministic bundle) are now specced against the actual data with golden-test assertions, and every format/shape ambiguity is closed.
