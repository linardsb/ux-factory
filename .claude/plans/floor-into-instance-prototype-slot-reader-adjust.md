# Feature: Floor into the instance — build-instance bespoke step + prototype-slot render + reader-adjust (#89)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils/types and models. Import from the right files etc.

## Feature Description

Wire the **floor composed view** (from #88's parameterized `record-composition` runner — a validating `{name,props,children}` metric-tile KPI band, produced by a real, honesty-gated agent run) through the **existing per-company deploy pipeline** so a bespoke prototype lands **inside** the unlisted private instance, instead of only surfacing as a link placeholder.

Three coordinated changes:
1. **`agent-layer/build-instance.mjs`** — a new **bespoke-prototype step** between pack derivation and shell assembly: **copy** a pre-recorded composition dir (+ the design-system vocabulary) into the deploy dir, extend `INSTANCE_CONFIG` to carry a `composition` reference, and extend `validateAssembly` to **verify** the copied composition (resolves + passes `validateComposition`).
2. **`instance.html` + `system/instance.mjs`** — the prototype slot currently renders a **link card** (`renderLinks`); upgrade it to render the composed view **in-slot** by **reusing `renderStudy`** (`system/agentic-study.mjs`) over `agentic-renderer` + `action-bus`. Keep the honest placeholder / link card when no composition is configured.
3. **Reader-adjust (#5)** — the reader adjusts the pre-composed view via the study's existing bounded `ui.*` action-bus controls (tone / reorder / remove / reset + the "not in vocabulary" refusal probe). **No view-time LLM.** Framing states "adjust a pre-composed view", never "live generation".

## User Story

As a **hiring manager who opened an unlisted private-instance link**
I want to **see a working, adjustable prototype of my own product's dashboard rendered inside the instance — not just a link to one**
So that **I can verify the factory actually built something bespoke for us, and steer it live, without trusting a claim.**

## Problem Statement

#88 proved the floor: a parameterized `record-composition` run produces a content-accurate, honesty-clean composed view for a second fictional employer (`northwind`) over the shared vocabulary with **zero** vocabulary extension. But that composed view has nowhere to land in front of an employer — the private instance (#43/#44) still shows only a **link placeholder** in its Materials station. The bespoke prototype is built but not delivered where it matters.

## Solution Statement

Treat the composed view exactly like the derivation trace already is treated in `build-instance.mjs`: a **pre-recorded, honesty-gated artifact that build-instance copies and wires, never generates**. Add a `--compositions <dir>` input, copy it (+ `vocabulary.json`) into the deploy dir, and stamp a `composition` reference into `INSTANCE_CONFIG`. View-side, reuse the shipped `renderStudy` surface (ask → propose → adjust → refuse) — already the canonical in-slot compose+adjust+refusal exhibit — mounting it in a new full-width prototype sub-surface in Station 5, with the honest placeholder retained when absent.

## Out of Scope / Non-Goals

- **Not running the composition agent inside `build-instance`.** The composition is produced by a separate `record-composition` run (#88) through record→curate→validate; build-instance only *consumes* a `--compositions <dir>` (exact precedent: `--trace`). Running the SDK inside build-instance would break its determinism, zero-SDK posture, and the honesty pipeline.
- **Not building the `ds-` list-row primitive.** #88 recorded it as the next spec-first addition but deliberately did **not** build it; the floor here is the `metric-tile` KPI band. (Deferred to a follow-up.)
- **Not the ceiling/vision engine (#90).** No screenshot-reading path anywhere in this ticket.
- **Not rewriting composition-index paths.** `--compositions <dir>`'s `index.json` proposal/trace paths must already point at `/proto/compositions/<slug>/…` (i.e. the `record-composition` run used `scenario = slug`). Path rewriting is out of scope — logged as an operator note + open question.
- **Not showing per-composition PIV trace links in-slot** (user decision). Station 04 already carries the headline derivation-trace exhibit; the composition traces are NOT copied and NOT ref'd by `validateAssembly`.
- **Not changing** the privacy posture (unconditional `noindex`, out-of-repo `--out` guard, human-triggered deploy), the `--public-origin` designed-hook throw, or the six-page IA / VR baseline set.
- **Not adding `instance.html` to the VR set** (it isn't in it today; neither is `agentic-ui-study.html`).

## Feature Metadata

**Feature Type**: New Capability (extends the #43/#44 instance pipeline; wires #88's floor)
**Estimated Complexity**: High (3–4 files, a shipped-module edit, build orchestrator + assembly-validation changes, ~500–900 lines incl. ported CSS)
**Primary Systems Affected**: `agent-layer/build-instance.mjs` · `instance.html` · `system/instance.mjs` · `system/agentic-study.mjs` (small param) · `agentic-ui-study.html` (call-site update)
**Dependencies**: `@anthropic-ai/claude-agent-sdk` NOT needed at build-instance time (copy, don't run). View-time: vanilla, no deps. Reuses `system/agentic-renderer.mjs` (`validateComposition`, Node-safe) at build-instance time.

## Related Work

**Implements**: [#89](https://github.com/linardsb/ux-factory/issues/89) · **Epic**: [#86](https://github.com/linardsb/ux-factory/issues/86) — [docs/epics/generative-prototyper.architecture.md](../../docs/epics/generative-prototyper.architecture.md) (Missing pieces #3 + #5; Recommended-approach diagram lines 24–40; Key decisions lines 50–59)

**Back-references** (inherit decisions from):
- `.claude/plans/floor-runner-parameterize-composition-spike1.md` (#88) — Why: defines the composed-view artifact shape (`proto/compositions/<scenario>/<slug>.json` + `index.json`), the `scenarios/<slug>/compose.json` semantics file, and the Spike-1 "productize the floor" verdict that unblocks this.
- `.claude/plans/private-instance-shell.md` (#43) + `.claude/plans/per-company-build-unlisted-deploy.md` (#44) — Why: the `instance.html` shell, `system/instance.mjs` config seam, `build-instance.mjs` stamping (Mechanism A/B) + `validateAssembly` this extends.
- `.claude/plans/agentic-ui-study.md` (#13) — Why: `renderStudy` is the compose+adjust+refusal surface being reused; `agentic-ui-study.html` is the loader precedent.

**Forward-references**:
- (none yet — #90 ceiling engine will reuse this build-instance bespoke-step seam)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING!

- `agent-layer/build-instance.mjs` (whole file, ~322 lines) — Why: the orchestrator to extend. Key seams: `buildInstance()` inputs (line 231), `cpSync` of `system/`+`assets/` (270–271), `--trace` copy precedent (273–275), `stampShell()` (85) with the `config` object (128–139) and `rewrite()` Mechanism-A anchors (101–105), `validateAssembly()` (161–226) with the asset-prefix regex (line 211) and the `config.*` ref pattern (212–216), CLI flag parsing (296–306), `insideRepo` guard (34–46), `HEADERS` (55–76).
- `system/instance.mjs` (whole file, 243 lines) — Why: the view-time module. Key seams: `renderLinks()` (156–190 — the prototype/handoff card slot to upgrade), `init()` (193–242), the INDEPENDENT trace fetch chain (232–239 — mirror it for the prototype chain), `errorCard()` (48–57), `grabJson()` (43–44), config guard (200–206), `data-instance="ready"` (line 225 — do NOT gate it on the prototype chain).
- `instance.html` (whole file, 451 lines) — Why: the shell. Key seams: the committed demo `INSTANCE_CONFIG` block (429–441 — add the `composition` ref, pointing at in-repo northwind), Station 5 "Materials" (403–416) with `#instance-links` (414), the `<style>` block (42–244) where ported CSS goes, scroll-margin anchors (line 53).
- `system/agentic-study.mjs` (whole file, 220 lines) — Why: `renderStudy(container, { vocab, entries, bus })` is reused. Its **only** Fieldwork-hardcoded string is the provenance sentence (line 199) — parameterize it. `entries[]` must carry `composition` (array), `question`, `slot` (42, 120); `label`/`trace` are OPTIONAL (198–200) — omit `trace` → no in-slot trace link; omit `label` → honest default "Real run, curated for length".
- `agentic-ui-study.html` (whole file, 253 lines) — Why: the **loader precedent** for instance.mjs's prototype chain (fetch index + vocab → per-entry fetch composition → `createBus()` → `renderStudy`) at lines 214–238; the `study-*` workbench CSS to port (28–76), **including** the `.study-preview-frame` + `.study-preview--summary-strip`/`--insight-panel` slot modifiers (44–48). This call site must be updated to pass the new `subject` param.
- `system/agentic-renderer.mjs` (lines 31–109 `validateComposition`; 334–350 `renderComposition`) — Why: `validateComposition` is pure/Node-safe — import it into `build-instance.mjs`'s `validateAssembly` to gate each copied proposal. `renderComposition` is what `renderStudy` calls at view time.
- `system/action-bus.mjs` (lines 34–83, `createBus`) — Why: the `ui.*`/`agent.*` contract; instance.mjs calls `createBus()` and passes it to `renderStudy`.
- `proto/compositions/northwind/index.json` + `stock-risk-state.json` + `oversell-exposure.json` (**on `main` only** — this branch is behind) — Why: the exact demo artifacts the prototype slot renders. Manifest entry shape: `{ slug, question, slot, proposal, trace }`. Composition shape: `[{ name:"metric-tile", props:{ label, value, tone?, unit? } }]`.
- `scenarios/northwind/compose.json` (**`main` only**) — Why: read for the honest `subject` phrasing ("the Northwind wholesale-stock dashboard") — but the shell derives subject from `config.name`, NOT by fetching compose.json (compose.json is a build-time file, not deployed).
- `handoff/verdant/vocabulary.json` — Why: the vocabulary `renderStudy`/`renderComposition` validate against; `metric-tile` is in it. Lives OUTSIDE `system/` → build-instance must copy it explicitly.

### New Files to Create

- **None.** All changes are edits to existing files. (No new module — reuse `renderStudy`.)

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/generative-prototyper.architecture.md` — §Recommended approach diagram (lines 24–40: the bespoke-prototype step sits between pack derivation and build-instance; instance.html renders the composed view via agentic-renderer, reader adjusts via action-bus, no view-time LLM); §Key decisions (50–59). Why: the governing contract; #89 must not drift from "two regimes never blurred / no view-time LLM / copy-not-run".
- `docs/epics/per-company-brief.architecture.md` — §Stamping, §Boundaries (privacy). Why: the Mechanism-A/B stamping + privacy posture `build-instance` must preserve.
- CLAUDE.md "Ground rules" — shipped pages vanilla / token-only components / honesty contract / "Deploy = commit the artifacts". Why: instance.html changes stay vanilla + token-only; ported CSS uses tokens only.
- `.claude/references/frontend-component-best-practices.md` — Why: instance.mjs is view-time UI on a shipped page.

### Patterns to Follow

**Copy-not-run (build-instance's artifact discipline)** — mirror the `--trace` input exactly (build-instance.mjs:249–275): validate the input path exists → `copyFileSync`/`cpSync` into the deploy dir → reference it from `INSTANCE_CONFIG` → verify in `validateAssembly`. The composition is another pre-recorded artifact, never generated here.

**Independent view-time fetch chains (instance.mjs)** — the prototype chain must be INDEPENDENT of the package chain and the trace chain (instance.mjs:216–239), so one failing never blocks another. Error-card on failure (`errorCard`, line 48); do NOT gate `body.dataset.instance="ready"` on it.

**Loader shape (agentic-ui-study.html:214–238)** — `fetch(index) + fetch(vocab)` → for each entry `fetch(proposal)` and attach `.composition` → `createBus()` → `renderStudy(mount, { vocab, entries, bus, subject })`. Omit the per-entry `trace` fetch (user chose no in-slot trace links).

**Assembly validation voice (build-instance.mjs:161–226)** — collect `problems[]`, throw ONE aggregated `Error` naming every problem. New checks append to the same array.

**Naming**: kebab-case files/slugs; `pi-*` prefix for new instance-shell-only CSS classes (instance.html:234 comment); ported `study-*` classes keep their names. `camelCase` JS functions (`renderPrototype`).

**Token-only CSS** (instance.html:42–50 comment): every colour/space/radius/type via `var(--…)`; only grid/%/px structural literals. The ported `study-*` block is already token-only.

---

## IMPLEMENTATION PLAN

**Branch from `main`** (this branch `feature/v3-approach-work` is 3 commits behind and lacks #88's `proto/compositions/northwind/` + `scenarios/northwind/compose.json`). Cut `feature/v3-floor-into-instance` off `origin/main`.

### Phase 1: View-time render + adjust (the visible deliverable)

**Independent of:** Phase 2 — Phase 1 is fully testable by serving the repo against the committed in-repo `northwind` artifacts (present on `main`), no build-instance run needed. Do this first: it makes the surface concrete and eyeballable before touching the orchestrator.

**Tasks:**
- Parameterize `renderStudy`'s provenance subject.
- Update `agentic-ui-study.html` to pass `subject: "the Fieldwork fixtures"` (behaviour-identical).
- Add a `composition` reference to the demo `INSTANCE_CONFIG` in `instance.html`, pointing at in-repo northwind.
- Restructure Station 5: a full-width `#instance-prototype` sub-surface + the handoff link card; add the honest "adjust a pre-composed view / no model runs here" copy.
- Port the complete `study-*` CSS block into instance.html's `<style>`.
- Add `renderPrototype()` to `instance.mjs`: independent fetch chain → `renderStudy` when a composition is configured; placeholder/link when not.

### Phase 2: Build-instance bespoke step + assembly validation

**Depends on:** Phase 1 (needs the final `INSTANCE_CONFIG.composition` shape + the deploy-dir paths `instance.mjs` expects, so `stampShell` reproduces exactly what the view reads).

**Tasks:**
- Add `--compositions <dir>` input + validation to `buildInstance()`.
- Bespoke-prototype step: copy the compositions dir → `deployDir/proto/compositions/<slug>/`; copy `handoff/verdant/vocabulary.json` → `deployDir/handoff/verdant/vocabulary.json`.
- Extend `stampShell`'s `config` object to include `composition` when compositions are provided (omit when not).
- Extend `validateAssembly`: allow `proto|handoff` asset prefixes; ref the composition index + each proposal + vocab; run `validateComposition` on each copied proposal against the copied vocab.
- Update the CLI usage string + the `buildInstance` call to pass `--compositions`.

### Phase 3: Validation & regression

**Tasks:**
- Node-parse all touched `.mjs`.
- Serve + cross-engine eyeball `instance.html` (Chromium + Firefox + WebKit).
- Regression: `agentic-ui-study.html` renders identically.
- build-instance smoke run against a fictional fixture with `--compositions`, `--out` outside the repo; confirm `validateAssembly` passes and the stamped instance renders the composed view.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. UPDATE `system/agentic-study.mjs` — parameterize the provenance subject

- **IMPLEMENT**: Add `subject` to the destructured options of `renderStudy` (line 37): `renderStudy(container, { vocab, entries, bus, subject } = {})`. In `renderProvenance()` (198–200), replace the hardcoded text node `": a real build-time agent run over the Fieldwork fixtures, replayable. "` with `\`: a real build-time agent run over ${subject || "the scenario's fixtures"}, replayable. \``. No other change; `picked.label`/`picked.trace` handling stays.
- **PATTERN**: `system/agentic-study.mjs:198–200`. Keep the module Node-safe (no new top-level DOM/side effects).
- **IMPORTS**: none new.
- **GOTCHA**: This is a **shipped module** — the only allowed change is the subject interpolation. Do NOT restructure `renderProvenance` or touch the label/trace logic (omitting `trace` from entries is how the instance suppresses the in-slot trace link — no code change needed for that).
- **VALIDATE**: `node --check system/agentic-study.mjs`
- **SATISFIES**: AC #2, AC #3 (honest, company-specific provenance without a Fieldwork leak).

### 2. UPDATE `agentic-ui-study.html` — pass the subject at the existing call site

- **IMPLEMENT**: At the `renderStudy` call (line 238), add `subject: "the Fieldwork fixtures"` so the rendered sentence is byte-identical to today: `renderStudy($("study"), { vocab, entries, bus, subject: "the Fieldwork fixtures" });`
- **PATTERN**: `agentic-ui-study.html:238`.
- **GOTCHA**: Must reproduce the current sentence exactly ("…over the Fieldwork fixtures, replayable.") — this is a pure refactor, zero visible change. `agentic-ui-study.html` is NOT in the VR set, so no baseline regen, but eyeball it anyway (Phase 3).
- **VALIDATE**: serve the repo, open `/agentic-ui-study.html`, confirm the provenance line reads unchanged.
- **SATISFIES**: regression guard for AC #2 (no Exhibit-02 regression).

### 3. UPDATE `instance.html` — demo `INSTANCE_CONFIG` gains a `composition` ref

- **IMPLEMENT**: In the committed demo config (429–441), add a `composition` key pointing at the in-repo northwind artifacts:
  ```js
  window.INSTANCE_CONFIG = {
    package: "/scenarios/northwind",
    name: "Northwind",
    trace: { path: "/traces/pack-seed-verdant.jsonl" },
    composition: {
      index: "/proto/compositions/northwind/index.json",
      vocab: "/handoff/verdant/vocabulary.json"
    },
    links: { prototype: null, handoff: null },
  };
  ```
  Update the adjacent demo-config comment (430–432) to mention the composition ref.
- **PATTERN**: existing config shape at `instance.html:433–440`; keep `links.{prototype,handoff}` for the fallback/handoff paths.
- **GOTCHA**: `composition` is a NEW sibling key (not `links.prototype`) to avoid a name collision — precedence in Task 6 is `composition` first, then `links.prototype`, then placeholder. The northwind artifacts exist only on `main` — confirm you branched from `main`.
- **VALIDATE**: `python3 -c "import json"` won't parse JS; instead serve + confirm Task 6 renders. (Syntactic check: the block is valid JS object literal.)
- **SATISFIES**: AC #2 (demo renders the composed view).

### 4. UPDATE `instance.html` — Station 5 restructure + honest framing copy

- **IMPLEMENT**: In Station 5 "Materials" (403–416), add a full-width prototype sub-surface ABOVE `#instance-links`:
  ```html
  <p class="max-prose">A view the factory composed at build time from the company's own data —
    real components on the derived pack. Adjust it below; nothing runs live here.
    <span data-when="demo">On this demo it's the fictional Northwind dashboard.</span></p>
  <div id="instance-prototype"><p class="fw-loading muted">Loading the composed view…</p></div>
  ```
  Keep `#instance-links` for the handoff card (Task 6 trims `renderLinks` to handoff-only when a composition is present). Add `#instance-prototype` to the `scroll-margin-top` anchor rule if you give it an id-anchor (optional).
- **OPTIONAL (register polish)**: for consistency with Stations 2/3 (`<span class="capability live">Runs now</span>`) and Station 4 (`Replays a real run`), give the Station 5 prototype header a badge like `<span class="capability live">Adjusts now · composed at build time</span>` — reinforces "no live model" in the same visual grammar. Non-blocking; the body copy already satisfies AC #3.
- **PATTERN**: sibling mounts like `#instance-player` (399), `#factory-narrative` (370). Static "Loading…" seed keeps the section honest if the module is slow (instance.html:299 idiom). Capability badge grammar at instance.html:308, 325, 383.
- **GOTCHA**: framing MUST NOT imply live generation (PRD open-Q "adjustable honesty") — "composed at build time … nothing runs live here". The `data-when="demo"` span is stripped by `stampShell` Mechanism B for real instances (build-instance.mjs:145).
- **VALIDATE**: serve + open `/instance.html`; the new copy + mount appear.
- **SATISFIES**: AC #2, AC #3 (honest framing).

### 5. UPDATE `instance.html` — port the `study-*` workbench CSS

- **IMPLEMENT**: Copy the complete `study-*` CSS block from `agentic-ui-study.html:28–76` into instance.html's `<style>` (after the `pi-*` block, ~line 243). Port it **verbatim** (it's already token-only). MUST include `.study-preview-frame`, `.study-preview--summary-strip`, `.study-preview--insight-panel` and their `> *` child rules (44–48) or the slot layout breaks. Add a header comment noting it's ported verbatim from agentic-ui-study.html (mirrors the fw-*/trace-* port comments at 55/64/142).
- **PATTERN**: instance.html already ports fw-*/trace-* families verbatim from factory.html (comments at 55, 64, 142). Same discipline.
- **GOTCHA**: `.ds-metric-tile` itself is in **shared `system/components.css`** (already linked at instance.html:39) — do NOT re-add it. Only the `study-*` workbench chrome is missing. Do NOT edit `components.css` or `portfolio.css` (shared → would churn the 8 VR baselines).
- **VALIDATE**: serve + confirm the composed tiles + adjust controls are styled (not unstyled DOM).
- **SATISFIES**: AC #2 (renders as real styled components).

### 6. UPDATE `system/instance.mjs` — `renderPrototype()` + wire it into `init()`

- **IMPLEMENT**:
  1. Add `renderPrototype(config)`: an INDEPENDENT fetch chain. If `config.composition?.index` and `config.composition?.vocab` are strings, fetch both (`grabJson`), then `Promise.all` per manifest entry to fetch each `entry.proposal` and attach `.composition`; build `entries = index.map(e => ({ slug:e.slug, question:e.question, slot:e.slot, composition:<fetched> }))` — **omit `trace` and `label`** (no in-slot trace link; honest default label). Then `const bus = createBus(); renderStudy(prototypeMount, { vocab, entries, bus, subject: \`${name}'s data\` });` Set `prototypeMount.dataset.prototype = "ready"`. On any failure → `errorCard(prototypeMount, …)`. If no composition configured → leave the static "Loading…" replaced by the honest placeholder OR fall back to a prototype link if `config.links?.prototype` (see precedence).
  2. Import at top: `import { renderStudy } from "./agentic-study.mjs";` and `import { createBus } from "./action-bus.mjs";`
  3. In `init()` (after `renderLinks(config.links)` at 214): call `renderPrototype(config)`.
  4. Trim `renderLinks` (156–190) so the **prototype** card is suppressed when `config.composition?.index` is present (the in-slot render supersedes it); the **handoff** card always renders per its own link/placeholder. Simplest: pass a flag `renderLinks(links, { skipPrototype: !!config.composition?.index })` and skip the prototype slot in the loop.
- **PATTERN**: the INDEPENDENT trace chain (instance.mjs:232–239) is the exact template — fetch, render on success, `errorCard` on failure, own readiness flag, never blocks `data-instance="ready"`. Loader shape from `agentic-ui-study.html:214–238`.
- **IMPORTS**: `renderStudy` from `./agentic-study.mjs`; `createBus` from `./action-bus.mjs`. Both are `system/` modules copied wholesale into deploy dirs (build-instance.mjs:270) — no build-instance change needed to ship them.
- **GOTCHA**: (a) `renderStudy` **replaces** its container's children — give it its own `#instance-prototype` mount, never share with `#instance-links`. (b) `renderStudy` throws synchronously if `entries` is empty or malformed — wrap the call in the chain's `.catch`. (c) precedence: `composition` → in-slot study; else `links.prototype` (http(s), scheme-guarded per 176–178) → link card; else placeholder. (d) module import stays relative + Node-parse-safe; `renderStudy`/`createBus` are Node-safe at import time.
- **VALIDATE**: `node --check system/instance.mjs`; then serve + open `/instance.html`: composed view renders in `#instance-prototype`, question tabs switch, tone/reorder/remove/reset adjust live, the "not in vocabulary" option refuses with a path-named message, bus-log disclosure fills. No console errors.
- **SATISFIES**: AC #2, AC #3.

### 7. UPDATE `agent-layer/build-instance.mjs` — `--compositions` input + bespoke-prototype copy step

- **IMPLEMENT**:
  1. `buildInstance({ …, compositionsDir })`: after the `--trace` validation block (249–251), if `compositionsDir` is provided, resolve it from cwd, require it exists and contains `index.json` (`existsSync(join(compAbs, "index.json"))`), else throw a path-naming Error. Optional (an instance with no bespoke prototype still builds).
  2. In the assemble block (after the trace copy, ~275), add the **bespoke-prototype step**: if `compositionsDir`, `cpSync(compAbs, join(deployDir, "proto", "compositions", slug), { recursive:true })` and `mkdirSync(join(deployDir,"handoff","verdant"),{recursive:true})` + `copyFileSync(join(REPO_ROOT,"handoff","verdant","vocabulary.json"), join(deployDir,"handoff","verdant","vocabulary.json"))`. `vocabulary.json` is design-system (generated, not company-real) → sourced from `REPO_ROOT`, safe to ship.
  3. Pass a `composition` descriptor into `stampShell` (see Task 8): `{ index: \`/proto/compositions/${slug}/index.json\`, vocab: "/handoff/verdant/vocabulary.json" }` when `compositionsDir`, else `null`.
- **PATTERN**: the `--trace` lifecycle (validate input 249–251 → copy 273–275 → ref in config → verify in validateAssembly) is the exact precedent. `cpSync` recursive is already used for `system/`/`assets/` (270–271).
- **IMPORTS**: reuse existing `cpSync`, `copyFileSync`, `mkdirSync`, `existsSync`, `join`, `resolve` (already imported, 18–19).
- **GOTCHA**: `--compositions` dir's `index.json` proposal paths must already be `/proto/compositions/${slug}/…` (record-composition run with `scenario=slug`). Do NOT rewrite paths (out of scope) — but DO fail loudly in `validateAssembly` if a referenced proposal is missing (Task 9), which catches a scenario/slug mismatch. Keep the discard-on-failure cleanup (287–289) intact — the new copies are inside `deployDir`, so they're cleaned with it.
- **VALIDATE**: `node --check agent-layer/build-instance.mjs`
- **SATISFIES**: AC #1.

### 8. UPDATE `agent-layer/build-instance.mjs` — `stampShell` writes the `composition` block

- **IMPLEMENT**: Give `stampShell` the `composition` descriptor (thread it through the destructured arg: `stampShell(html, { name, slug, traceBase, links, composition })`). In the `config` object (128–133), add `...(composition ? { composition } : {})` so the key is present only when a composition ships. The existing `JSON.stringify(config,…)` + `<`-escape (134) handles serialization. The marker rewrite (139) is unchanged (it replaces the whole block).
- **PATTERN**: `build-instance.mjs:128–139` — the config object + `configJson` escaping.
- **GOTCHA**: Key ORDER in the object is cosmetic (JSON), but keep `composition` before `links` for readability. When `compositionsDir` is absent, the stamped `INSTANCE_CONFIG` has NO `composition` key → instance.mjs falls back to link/placeholder (Task 6 precedence). Mechanism-A anchor for the block (`INSTANCE_CONFIG:start…end`) is unchanged, so no new anchor throw.
- **VALIDATE**: covered by the Task 11 smoke run (grep the stamped index.html for `"composition"`).
- **SATISFIES**: AC #1.

### 9. UPDATE `agent-layer/build-instance.mjs` — `validateAssembly` verifies the composition

- **IMPLEMENT**: In `validateAssembly` (161–226):
  1. Extend the asset-prefix regex (line 211) to include the new prefixes: `/(?:href|src)="(\/(?:system|assets|scenarios|traces|proto|handoff)\/[^"]+)"/g`.
  2. After the `config`-derived refs (212–216), if `config.composition`: add `config.composition.index` and `config.composition.vocab` to `refs`; read + `JSON.parse` the copied index (`join(deployDir, config.composition.index.replace(/^\//,""))`), and for each manifest entry add `entry.proposal` to `refs`. Wrap in try/catch → push a problem naming the file on parse failure.
  3. **Verify each composition validates**: `import { validateComposition } from "../system/agentic-renderer.mjs";` (top of file). Load the copied vocab (`JSON.parse` of the deploy-dir vocab file), and for each proposal `JSON.parse` it and call `validateComposition(vocab, proposal, entry.slug)` inside try/catch → push a problem with the thrown message on refusal. This is the "validateAssembly verifies it" acceptance criterion, enforced by the same engine the view uses.
- **PATTERN**: the existing `config`-ref additions (212–216) + the aggregated-`problems[]` throw (225). `validateComposition` is pure/DOM-free (agentic-renderer.mjs:31 header) → Node-safe here.
- **IMPORTS**: add `import { validateComposition } from "../system/agentic-renderer.mjs";` (module resolves from `agent-layer/` → `../system/`). Confirm it does not pull DOM at import time (it doesn't — DOM refs are inside functions, header lines 111–115).
- **GOTCHA**: only run these checks `if (config.composition)` — instances without a bespoke prototype must still pass. A missing proposal, unparseable JSON, or a `validateComposition` refusal is a HARD problem (blocks deploy), matching the existing strictness.
- **VALIDATE**: Task 11 smoke run must pass validation with a valid compositions dir, and FAIL (named problem) if you point `--compositions` at a dir whose index references a missing proposal.
- **SATISFIES**: AC #1 ("validateAssembly verifies it").

### 10. UPDATE `agent-layer/build-instance.mjs` — CLI wiring

- **IMPLEMENT**: In the CLI block (296–306): parse `const compositionsDir = flag("--compositions");` and pass it into `buildInstance({ …, compositionsDir })` (306). Add `[--compositions <dir>]` to the usage string (302–304) with a one-line note: "a pre-recorded record-composition output dir (its index.json proposal paths must be /proto/compositions/<slug>/…); copied in, never generated here." Optionally echo `· prototype <n> views` in the success log (311) when present.
- **PATTERN**: existing `flag()` parsing (297–305).
- **GOTCHA**: keep `--compositions` OPTIONAL (not in the required-args throw at 301).
- **VALIDATE**: `node agent-layer/build-instance.mjs` with no args prints the updated usage including `--compositions`.
- **SATISFIES**: AC #1.

### 11. Manual + smoke validation (Phase 3)

- **IMPLEMENT**: Run the full validation suite (see VALIDATION COMMANDS). Cross-engine eyeball per repo memory (Chromium + Firefox + WebKit). Update CLAUDE.md's build-instance command example + the `instance.html`/`instance.mjs`/`build-instance.mjs` architecture-map lines if the `--compositions` flag or the composition slot warrants a one-line mention (surgical).
- **VALIDATE**: all commands green; composed view renders + adjusts + refuses; agentic-ui-study.html unchanged; smoke build passes validateAssembly and the stamped index.html renders the composed view when served from the out-of-repo dir.
- **SATISFIES**: AC #1–#4.

---

## TESTING STRATEGY

No unit-test suite exists (CLAUDE.md: "run the surface you touched"). Testing = Node-parse + live-surface exercise + a build-instance smoke run + cross-engine functional check.

### "Unit"-level (Node parse + pure-function gate)
- `node --check` on every touched `.mjs`.
- `validateComposition` is exercised for real inside the smoke run's `validateAssembly` — a passing smoke build IS the composition-gate test. Add a negative check: temporarily point `--compositions` at a dir whose `index.json` references a non-existent proposal → expect a named `validateAssembly` problem.

### Integration (the surfaces)
- **instance.html (view-time)**: serve the repo, open `/instance.html`; the northwind composed view renders in `#instance-prototype`, both question tabs work, all adjust controls mutate the working copy live, the "not in vocabulary" probe refuses with a path-named message, the bus-log fills, `#instance-links` shows the handoff card only. `body[data-instance="ready"]` still sets even if the prototype chain is forced to fail (independence check).
- **build-instance (build-time)**: smoke run against the acme fixture (fictional) with `--compositions proto/compositions/northwind`, `--out` OUTSIDE the repo; assert exit 0, `validateAssembly` passes, stamped `index.html` contains `"composition"` in `INSTANCE_CONFIG` and points at `/proto/compositions/acme/…` (NB: index.json proposal paths must match — see gotcha), the deploy dir contains `proto/compositions/acme/` + `handoff/verdant/vocabulary.json`, and serving the deploy dir renders the composed view.
- **Regression**: `/agentic-ui-study.html` provenance line reads byte-identical; its study still adjusts + refuses.

### Edge Cases
- Instance with **no** composition configured → placeholder/link retained, no console error, `renderStudy` never called.
- Composition `index.json` present but a proposal 404s at view time → prototype `errorCard`, package + trace chains unaffected, `data-instance="ready"` still set.
- `--compositions` dir missing `index.json` → `buildInstance` throws a path-naming Error before any write; discard-on-failure leaves no partial dir.
- A proposal that fails `validateComposition` (e.g. an out-of-vocab component) → `validateAssembly` throws a named problem; deploy blocked.
- `--compositions` dir whose index references a proposal that isn't copied (scenario≠slug) → `validateAssembly` "referenced asset missing" problem.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style
```bash
node --check system/agentic-study.mjs
node --check system/instance.mjs
node --check agent-layer/build-instance.mjs
node --check system/agentic-renderer.mjs   # import target for validateAssembly
```

### Level 2: "Unit" (pure gates)
```bash
# build-instance imports validateComposition without pulling DOM at import time:
node -e "import('./system/agentic-renderer.mjs').then(m=>{if(typeof m.validateComposition!=='function')throw new Error('no validateComposition');console.log('validateComposition importable ✓')})"
# CLI usage shows --compositions:
node agent-layer/build-instance.mjs 2>&1 | grep -- --compositions
```

### Level 3: Integration — build-instance smoke (from repo root; --out OUTSIDE the repo)

**PASSING invocation** (slug-matched compositions dir — this is the one to run first):
```bash
OUT="/private/tmp/claude-501/inst-smoke-89"
TMP="/private/tmp/claude-501/comp-acme"
rm -rf "$OUT" "$TMP"
# acme's slug is "acme" (from the fixture brief); the copied index.json must reference
# /proto/compositions/acme/… so validateAssembly's ref check resolves. Prep a slug-matched dir:
cp -R proto/compositions/northwind "$TMP"
sed -i '' 's#/proto/compositions/northwind/#/proto/compositions/acme/#g' "$TMP/index.json"
node agent-layer/build-instance.mjs agent-layer/fixtures/acme/brief.md \
  --out "$OUT" \
  --pack system/tokens.neutral.css \
  --trace traces/pack-seed-verdant.jsonl \
  --compositions "$TMP" \
  --name "Acme"
# expect exit 0 + the deploy command printout. Then:
grep -c '"composition"' "$OUT/index.html"                 # → 1
ls "$OUT/proto/compositions/acme/" "$OUT/handoff/verdant/vocabulary.json"
```

**NEGATIVE test** (proves validateAssembly catches a scenario/slug mismatch): run the same command with `--compositions proto/compositions/northwind` (paths reference `/proto/compositions/northwind/…` but get copied to `/proto/compositions/acme/`) → expect a non-zero exit with a `validateAssembly` "referenced asset missing in deploy dir: /proto/compositions/acme/…" problem, and discard-on-failure leaves no `$OUT`.

The passing invocation makes the operator contract concrete: **`record-composition` must be run with `scenario == slug`** so its emitted absolute paths match where `build-instance` places them. Path rewriting stays out of scope (see Open Questions).

### Level 4: Manual Validation
```bash
npx serve .    # repo root, port 3000
```
- `/instance.html`: composed view in `#instance-prototype`; tabs; adjust (tone/↑↓/✕/reset) live; "not in vocabulary" → refusal message; bus-log; handoff card only in `#instance-links`; no console errors.
- Force-fail check: in devtools, rename the composition index request → prototype error-cards, rest of page intact, `document.body.dataset.instance === "ready"`.
- `/agentic-ui-study.html`: provenance line unchanged; study still works.
- Serve the smoke deploy dir (`npx serve "$OUT"`) → `/` renders the composed view.

### Level 5: Cross-engine (repo memory: Chromium-only VR gate misses Safari/Firefox)
```bash
# functional render check under all three engines via Playwright (webkit≈Safari);
# python serves .mjs as text/javascript. Confirm 0 console errors + tiles present on /instance.html.
```
(Use the cross-engine harness noted in memory `cross-engine-motion-verify`; a perf pass isn't needed — no new animation.)

### VR note
`instance.html` and `agentic-ui-study.html` are NOT in the visual-regression set (baselines: 404/approach/contact/factory/index/proto-fieldwork/proto-verdant/roundtrip/work). Keep ALL CSS edits inside instance.html's own `<style>` (ported `study-*` + `pi-*`) — touch NO shared `components.css`/`portfolio.css` and none of the 8 gated pages → **AC #4 satisfied with no baseline regen.** If you unexpectedly edit shared CSS, STOP and regen per `cd tooling/visual-regression && npm run update:docker`.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `build-instance.mjs` copies a composed view (`--compositions <dir>` + `vocabulary.json`) into the deploy dir; `validateAssembly` verifies it (refs resolve + `validateComposition` passes); existing #43/#44 stamping + privacy gates (unconditional noindex, out-of-repo `--out`, human-triggered deploy) still pass.
- [ ] **AC #2** — `instance.html` renders the composed view in the prototype slot via `agentic-renderer` (through reused `renderStudy`); honest placeholder/link retained when absent.
- [ ] **AC #3** — Reader adjusts the pre-composed view via `action-bus` with NO view-time LLM; adjust framing carries no "live generation" implication ("composed at build time … nothing runs live here").
- [ ] **AC #4** — VR baselines for any touched shipped surface regenerated in this PR — N/A here (instance.html not in the VR set; no shared CSS touched); explicitly confirm no shared-CSS/8-page drift.
- [ ] All `node --check` pass; build-instance smoke passes; `agentic-ui-study.html` unchanged; cross-engine render clean.

---

## COMPLETION CHECKLIST

- [ ] Branched from `origin/main` (has #88's northwind artifacts + compose.json)
- [ ] All tasks completed in order; each validation passed immediately
- [ ] `renderStudy` param is the ONLY change to the shipped `agentic-study.mjs`; call site updated
- [ ] Composed view renders + adjusts + refuses in `#instance-prototype`; handoff card intact
- [ ] build-instance `--compositions` copies + stamps + validates; no-composition path still builds
- [ ] No shared CSS / 8-page VR drift; instance.html/agentic-ui-study.html not in VR set
- [ ] Cross-engine (Chromium/Firefox/WebKit) clean; no console errors
- [ ] Privacy posture unchanged (noindex, out-of-repo guard, human deploy)
- [ ] CLAUDE.md architecture-map + command example updated if warranted (surgical)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (proceeding on these):**
- **Copy-not-run** — build-instance CONSUMES a pre-recorded `--compositions <dir>` (exact `--trace` precedent); it does NOT run `record-composition`/the SDK. Confirmed against the honesty pipeline + build-instance's deterministic/zero-SDK posture + advisor review.
- **Reuse `renderStudy`** (full ask→propose→adjust→refuse surface, incl. tabs + refusal-probe + bus-log) — **explicit user decision** over the leaner custom renderer. Provenance subject parameterized; `trace` omitted from entries → no in-slot composition-trace link (**user decision**).
- **`INSTANCE_CONFIG.composition = { index, vocab }`** — new sibling key (not `links.prototype`); precedence composition → link → placeholder.
- **`vocabulary.json` is design-system, not company-real** → safe to source from `REPO_ROOT` and ship in the deploy dir.
- **Subject string** = `` `${config.name}'s data` `` (the shell does NOT fetch build-time compose.json).
- **`renderStudy` has exactly ONE caller today: `agentic-ui-study.html`** (imports at line 145, calls at line 238). `agentic.html` is the *raw* harness (uses `agentic-renderer`/`action-bus` directly, per `agentic-study.mjs`'s header "the designed successor to agentic.html's raw harness") — NOT a caller. So Task 1's added `subject` param + Task 2's call-site update fully cover the existing surface; instance.mjs (Task 6) becomes the second caller. (Re-verify with `grep -rn "renderStudy(" --include=*.html --include=*.mjs .` at implement time — a mid-planning macOS-TCC permission drop blocked a fresh repo-wide grep, but the two in-context call sites above are conclusive.)

**Open questions (log, don't solve here):**
- **Composition-index path binding** — `--compositions` index proposal paths must be `/proto/compositions/<slug>/…` (record-composition run with `scenario=slug`). Should build-instance REWRITE paths to the deploy location for robustness? Deferred; `validateAssembly` fails loudly on a mismatch for now. (Feeds the operator workflow.)
- **Real-company composition production out-of-repo** — `record-composition` writes `proto/compositions/<scenario>/` repo-relative; a real company's compositions must be produced OUT of the repo (privacy). That's a `record-composition`/operator-workflow gap (#88 territory), not #89. Log for a follow-up.
- **Multiple prototype screens vs one** — the floor delivers KPI bands (metric-tile); the `ds-` list-row that would lift form fidelity is #88-recorded but unbuilt. When it lands, entries/slot layout may want revisiting.

## NOTES (open canvas)

**Why reuse `renderStudy` even though the advisor leaned lean:** the user owns the framing/register and chose the full study surface. `renderStudy` already delivers AC #3 (bounded `ui.*` adjust + refusal) with zero new view-time code; the single shipped-module edit (one interpolated string) is low-risk and both call sites reproduce their exact sentences. The refusal-probe + bus-log read as "here's the safety envelope your bespoke UI runs inside" — a maker's flex, consistent with the instance's existing capability-badge honesty.

**The two trace kinds — kept distinct:** Station 04 replays the *derivation* trace (`--trace`, `pack-seed-verdant.jsonl` in the demo). The *composition* PIV traces (`stock-risk-state.jsonl`, `oversell-exposure.jsonl`) are per-proposal provenance and are **not** surfaced in-slot (user chose no trace links) → build-instance does NOT copy them and `validateAssembly` does NOT ref them. This keeps Phase 2 simpler and avoids conflating the headline derivation exhibit with the composition provenance.

**Data-flow (view-time, demo):**
```
INSTANCE_CONFIG.composition = { index:/proto/compositions/northwind/index.json, vocab:/handoff/verdant/vocabulary.json }
  instance.mjs renderPrototype()
    fetch index.json → [{slug,question,slot,proposal,trace}]   (trace ignored)
    fetch vocabulary.json
    per entry: fetch proposal → composition array; entry = {slug,question,slot,composition}
    createBus()
    renderStudy(#instance-prototype, { vocab, entries, bus, subject:"Northwind's data" })
      → renderComposition(vocab, working, bus) → real ds-metric-tile DOM; adjust mutates working; probe refuses
```

**Data-flow (build-time, real company):**
```
operator: record-composition run (scenario=slug) → <out-of-repo>/proto/compositions/<slug>/{index.json,*.json}
build-instance <brief> --pack --trace --compositions <out-of-repo>/proto/compositions/<slug> --out <out-of-repo>
  genCompanyPackage → deployDir/scenarios/<slug>
  cpSync system/ + assets/ (wholesale — ships instance.mjs/agentic-study.mjs/agentic-renderer.mjs/action-bus.mjs)
  copy pack, trace  (existing)
  copy compositionsDir → deployDir/proto/compositions/<slug>/           (NEW)
  copy handoff/verdant/vocabulary.json → deployDir/handoff/verdant/    (NEW)
  stampShell → INSTANCE_CONFIG.composition = {index,vocab}             (NEW)
  validateAssembly: refs resolve + validateComposition(vocab, each proposal)  (NEW)
  print wrangler deploy command (human step)
```

## AMENDMENTS

- (none — created 2026-07-24)
