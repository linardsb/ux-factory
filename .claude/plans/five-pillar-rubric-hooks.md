# Feature: Five-pillar rubric hooks (ComponentSpec + real-AI-screen rubric) + cited legibility nuggets

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils/types and models. Import from the right files. Every string presented as an assessment is **maker-authored** (never agent output); every citation is **verified against its primary source**, in-register, no verbatim reuse of any secondary source, and never names any talk's speaker (see honesty rules below).

## Feature Description

Ticket #41 builds the **five-pillar evidence layer** for the per-company brief epic (#38): the mechanism by which an AI-feature screen demonstrably implements the *trust · clarity · control · transparency · meaningful-benefit* patterns, and the handoff/scenario record states which patterns the screen carries — plus small cited "legibility nuggets" on the shipped Factory surfaces that teach the discipline without announcing it.

**Decision taken at planning (2026-07-20, option A):** the honest demonstration is recorded on a *real* AI feature that already exists in the repo — the **Fieldwork agentic dispatch composition** (the `agentic-ui-study`), a genuine build-time Agent SDK run whose screen already implements all five pattern families. We do **not** invent an AI story for a plant-care component. The rubric is therefore fundamentally **screen-level**; a lighter **component-level** hook on the ComponentSpec head captures the one pattern a single component genuinely carries wherever used.

The work has three coherent parts, all "the five-pillar evidence layer":
1. **Component-level format** — an optional `aiPatterns` field on the ComponentSpec head (the ticket's literal "extend the ComponentSpec head"), demonstrated on `demo-notice` (content-provenance disclosure → transparency), surfaced in the handoff viewer.
2. **Screen-level rubric (the real demo, option A)** — a maker-authored `scenarios/fieldwork/rubric.json` mapping the five pillars to the *real affordances the Fieldwork agentic screen already ships*, surfaced legibly on the study page.
3. **Cited legibility nuggets** — three muted, in-register captions on `factory.html` (wizard · trace player · honesty/capability copy) citing Nielsen / Amershi et al. / Google PAIR.

## User Story

As a **hiring manager (technical) opening a private per-company instance**
I want **the AI-feature screen to visibly implement the trust/clarity/control/transparency/meaningful-benefit patterns, with the pack/record stating exactly which patterns it carries and the shipped surfaces quietly citing the canonical literature**
So that **"this person understands AI-UX craft" becomes an observation I can verify, not a claim I have to trust.**

## Problem Statement

The epic's headline artifact is the factory running on a company's *AI* vision. An AI screen has a craft bar (the five pillars) that a generic design system doesn't capture, and the platform's honesty contract forbids *asserting* craft — it must be *shown and recorded*. Today nothing in the ComponentSpec/handoff format records which AI-UX patterns a screen carries, and the shipped surfaces teach nothing about why they're built the way they are. There is also a trap: the five *patterns* (plan-before-act, visible reasoning, stop/undo, AI-content labeling, guided input) are **screen/flow-level**; recording them on a single read-only component would be overclaiming — the exact dishonesty the contract forbids.

## Solution Statement

Record the rubric at the level where each pattern genuinely lives:

- **Screen-level** (the five-pillar story) on the *real* AI feature — the Fieldwork agentic composition — as a maker-authored `rubric.json` in the scenario package, each entry tying a pillar to an affordance that **already exists** (`agentic-study.mjs`), surfaced on the study page. This is the durable, forward-compatible shape the per-company packages (#43/#44) will reuse.
- **Component-level** (a single pattern a component carries wherever used) via an optional `aiPatterns` head field on the ComponentSpec, demonstrated on `demo-notice`, flowing through `gen-handoff` into the pack and rendered in the handoff viewer.
- **Legibility** via muted captions on `factory.html`, in the existing `.study-lineage` register, citing the primary literature — shown, not badged.

**Reconciliation model (state this in code/doc comments):** *a screen's rubric = its screen/flow-level patterns (in `rubric.json`) ∪ the patterns its components carry (from their ComponentSpec `aiPatterns`).* One model, two levels.

## Out of Scope / Non-Goals

- **Not** building a new AI-feature screen — we point the rubric at the existing Fieldwork agentic composition (`agentic-ui-study`). No new proto screen.
- **Not** hand-editing any agent output — `proto/compositions/*.json`, `proto/compositions/index.json`, and `traces/*.jsonl` are real-run artifacts and stay untouched. The rubric is maker-authored *about* that screen, kept in a separate maker-authored file.
- **Not** teaching the rubric to agents — `gen-vocabulary.mjs` deliberately does **not** pick up `aiPatterns` (the rubric is an engineer/human handoff concern, not an agent-composition concern). Leave it unchanged.
- **Not** extending `gen-company-package.mjs` / `parseCompanyBrief` to author the rubric from a brief — that is #43/#44 territory. #41 sets the format by authoring Fieldwork's rubric directly.
- **Not** adding rubric hooks to the plant-care CRUD specs (`care-task-row`, `plant-card`, `stat-tile`, `status-chip`, `screen-header`, `primary-button`) or to `metric-tile` — none is a real AI feature; `metric-tile` is read-only and carries none of the five enumerated patterns (recording a pillar there is overclaiming — rejected at planning).
- **Not** touching `proto/verdant.html` or `proto/fieldwork.html` — keeps two of the eight visual baselines untouched; the screen rubric surfaces on the *study* page (baseline-free), not the proto page.
- **Not** a new agent/generator/schema library — validate by hand at the boundary and throw (project convention).

## Feature Metadata

**Feature Type**: New Capability (format) + Enhancement (view-time surfaces)
**Estimated Complexity**: Medium-High (multi-surface; machine layer + two view-time surfaces + generated-artifact regen + one Docker visual-baseline regen; honesty-loaded prose)
**Primary Systems Affected**: `agent-layer/lib.mjs` (parser) · `.claude/references/kb-format.md` (schema doc) · `system/specs/demo-notice.md` · `system/handoff-viewer.mjs` + `handoff.html` (viewer) · regenerated `handoff/verdant/*` · `scenarios/fieldwork/rubric.json` (new) · `agentic-ui-study.html` (+ maybe `system/agentic-study.mjs`) · `factory.html` (nuggets) · `tooling/visual-regression/baselines/factory*` (regen)
**Dependencies**: none new (Node built-ins; the study/factory pages stay vanilla). Epic-inherited stack: Agent SDK is build-time-only; view time is vanilla + no LLM.

## Related Work

**Implements**: [GitHub issue #41](https://github.com/linardsb/ux-factory/issues/41) — "Five-pillar rubric hooks in ComponentSpec/handoff + cited legibility nuggets" (`Closes #41`) · **Epic**: #38 — per-company brief layer (`docs/epics/per-company-brief.architecture.md`, §Boundaries "Five-pillar rubric" + Missing-pieces line).

**Back-references** (plans/tickets this builds on or inherits decisions from):
- `docs/epics/per-company-brief.architecture.md` — §Boundaries (five-pillar rubric bullet: patterns + citation register) and §Missing pieces. The screen-level home aligns with the `scenarios/<slug>/` package shape the epic's compiler produces.
- `.claude/plans/agentic-ui-study.md` (#13) — the ask→propose→adjust→refuse study that IS the real AI screen; `system/agentic-study.mjs` is its surface. A2UI/AG-UI lineage nugget register lives on `agentic-ui-study.html`.
- ComponentSpec/handoff format — #7 (data layer) + #14 (viewer, `system/handoff-viewer.mjs`); the pack is Verdant-scoped (`handoff/verdant/`).
- `system/trace-player.mjs` (#5) — the PIV-act replay the screen's "visible reasoning" pattern points at.
- Memory: `[[five-pillar-talk-attribution]]` (never name the talk's speaker; cite Nielsen/Amershi/PAIR; no verbatim transcript reuse) · `[[visual-regression-baseline-trap]]` (any at-rest change to a shipped baseline page needs a Docker baseline regen in the same PR) · `[[calm-colour-constraint]]` (nuggets are muted captions, no loud treatment).

**Forward-references** (plans that extend or supersede this):
- (none yet — #43 private-instance shell / #44 per-company build will *author* per-company rubrics into their packages via this format.)

**Scope divergences from #41's literal wording (flagged, not silent — user approved option A 2026-07-20):**
1. The rubric is recorded **screen-level** (`scenarios/fieldwork/rubric.json` + study page), not only on the ComponentSpec head — because the five patterns are screen/flow-level. The component-head hook is still shipped (demonstrated on `demo-notice`) to satisfy the ticket's literal "extend the ComponentSpec head" + AC#1.
2. The legibility nuggets are **page captions in `factory.html`**, not edits inside the generic reusable modules (`trace-player.mjs`, `factory-intake.mjs`) — a hardcoded citation inside a module meant to render *any* trace/wizard is a coupling smell. The ticket named those files as *seams*; the honest placement is adjacent on the designed surface. `trace.html` / `agentic-ui-study.html` are bare/other harnesses and don't need the nuggets.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `.claude/references/kb-format.md` (lines 14–30, §ComponentSpec + DataContract) — Why: the head schema v1 doc to extend with the optional `aiPatterns` field; states the sync rule (shape must stay readable by `portal/lib/kb.mjs`'s `parseFencedJson`/`section`).
- `agent-layer/lib.mjs` (lines 63–117, `parseComponentSpec`) — Why: the **authoritative** ComponentSpec parser. Validates a *fixed* key set (component/status/class/contract/props/tokens/states/children) + four required prose sections; does NOT reject unknown keys. Add optional `aiPatterns` validation here, mirroring the existing throw-naming-the-path style (e.g. lines 85–88).
- `agent-layer/gen-handoff.mjs` (lines 61–86) — Why: `components: specs.map((s) => ({ ...s.head, … }))` spreads the whole head, so `aiPatterns` flows into `pack.json` **automatically**. Verify, don't re-add. Expected regen diff: only `pack.json` (+ bundle) change; tokens/wc/contracts untouched.
- `agent-layer/gen-vocabulary.mjs` (lines 21–41) — Why: picks head fields **explicitly** (class/status/props/states/children/usage/contract) — `aiPatterns` will NOT leak to the agent vocabulary and this file needs **no change**. Confirm it still runs.
- `system/handoff-viewer.mjs` (lines 38–70 `prepareHandoff`; 172–234 `renderHandoffViewer`) — Why: `prepareHandoff` builds `head` by **explicit pick** (lines 48–56) — add `aiPatterns` there or it won't reach the viewer. Add a small per-component rubric block in `renderHandoffViewer` (mirror the existing `hv-eyebrow`+section pattern; DOM via `el(...)`/`textContent`, never innerHTML). The module injects no `<style>` — `handoff.html` owns the CSS.
- `system/specs/demo-notice.md` (whole, 34 lines) — Why: the demonstration spec for the component-head hook. Presentational (`contract: null`), its job is verbatim provenance disclosure — genuinely a content-provenance-labeling (transparency) pattern.
- `system/specs/care-task-row.md` (lines 1–17) — Why: reference for a *shipped* spec head with props/enums (shape to mirror when editing a head); NOT edited (out of scope — general reversibility, not an AI feature).
- `system/agentic-study.mjs` (header 1–15; 52, 57–65, 84–88, 156, 166, 171, 173) — Why: the **real AI screen's affordances** the screen rubric cites. Verify each `how` against these lines before writing prose: `52` guided-input tablist · `57–65` propose (preview + raw JSON) · `84–88` named refusal (verbatim) · `156` non-destructive probe revert · `166` "Reset to the agent's proposal" · `171` verbatim "Real run, curated" provenance label · `173` "View the committed trace" link.
- `agentic-ui-study.html` (lines 92–108 study surface + `.study-lineage` block 100–106; script 116–174 fetch/render) — Why: (a) the **register** to match for nuggets and the screen-rubric block (`.study-lineage`: `type-caption`, `color-fg-muted`, prose, no badge); (b) the fetch pattern to mirror for `rubric.json` (line 147 `copy.json` fetch with `.catch(() => ({}))` graceful fallback); (c) where to mount the rubric block (after `#study`, near `#lineage`).
- `system/factory-intake.mjs` (header 1–26; wizard 349–385; `renderScenarioChrome` 292–305; **guardArrows** 170–182) — Why: understand the wizard (Station 1) and the honesty surfaces. **GOTCHA**: anything rendered *inside* `#factory-wizard` is wiped by `replaceChildren` on every step — nuggets must live **outside** that mount (page captions sidestep this entirely).
- `factory.html` (Station 1 `#intake` ~240–262; Station 2 `#generation` 265+; Station 5 `#agents` 376–386; capability spans `class="capability live"`; existing `.study-lineage`/`.muted` usage) — Why: the three nugget insertion points and the CSS home (the page owns `.trace-*` + section styles; add nugget class here). This page **is** in the 8-page visual baseline set → baseline regen required.
- `scenarios/fieldwork/copy.json` + `scenarios/README.md` (§files 37–40) — Why: `scenarios/fieldwork/` is the maker-authored scenario-package home (copy.json/intake.defaults.json are maker-authored); `rubric.json` joins it as an **optional** file. README documents the allowed files — add a `rubric.json` line.
- `scenarios/validate.mjs` (structure; validates known files, iterates only `fixtures/`, no top-level file allowlist) — Why: confirm `rubric.json` does **not** trip `validateScenarios` (run it). If it somehow does, prefer the study-page shape-check over expanding the validator (keep #39's refactor untouched).
- `tooling/drift-check.mjs` (whole, esp. `checkHandoff` 49–61, `checkScenarios` 63–66) — Why: the CI gate. `checkHandoff` runs `genHandoff` + `genVocabulary` + `genPackBundle` then fails on ANY `handoff/` git drift → you MUST regenerate and commit the pack. `checkScenarios` runs `validateScenarios`. Run `node tooling/drift-check.mjs` before committing.
- `tooling/visual-regression/visual.spec.mjs` (lines 15–33 page list; 28 factory `waitReady`) — Why: the 8 baseline pages are index/approach/factory/work/contact/404/proto-verdant/proto-fieldwork. **Only `factory.html` gains at-rest copy here** → only `factory` baseline regenerates. `handoff.html` and `agentic-ui-study.html` are NOT screenshotted (free surfaces).

### New Files to Create

- `scenarios/fieldwork/rubric.json` — maker-authored screen rubric for the Fieldwork agentic dispatch composition: `{ screen, aiFeature: true, patterns: [{ pillar, pattern, how, cite }] }`. Five entries, each `how` tied to a real `agentic-study.mjs` affordance, each `cite` verified against Nielsen/Amershi/PAIR.

### Relevant Documentation — READ BEFORE IMPLEMENTING (verify citations against these; do NOT paraphrase a single secondary source)

- Nielsen Norman Group — [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). Sections: "Visibility of system status" (visible reasoning), "User control and freedom / undo" (stop-undo). Why: canonical, primary; the codebase already cites NN/g (`approach.html:287`).
- Amershi et al., [Guidelines for Human-AI Interaction (CHI 2019)](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/) — the 18 guidelines. Map: guided invocation, "make clear why the system did what it did" (visible reasoning), "support efficient correction / global controls" (stop-undo). Why: the primary source for the AI-specific patterns. **Cite guideline themes accurately; do not fabricate exact G-numbers you haven't verified.**
- Google PAIR — [People + AI Guidebook](https://pair.withgoogle.com/guidebook/). Chapters: "User Needs + Defining Success" (guided input), "Explainability + Trust", "Feedback + Control". Why: primary; complements Amershi for guided input and content provenance.

### Patterns to Follow (from this codebase)

**Parser validation (throw naming the path)** — mirror `agent-layer/lib.mjs:85–88`:
```js
if (head.aiPatterns !== undefined) {
  if (!Array.isArray(head.aiPatterns) || !head.aiPatterns.length)
    throw new Error(`${specPath}: head "aiPatterns", when present, must be a non-empty array`);
  const PILLARS = ["trust", "clarity", "control", "transparency", "meaningful-benefit"];
  for (const p of head.aiPatterns) {
    if (!p || typeof p.pillar !== "string" || !PILLARS.includes(p.pillar))
      throw new Error(`${specPath}: aiPatterns[].pillar must be one of ${PILLARS.join(" | ")}`);
    if (typeof p.pattern !== "string" || !p.pattern.trim() || typeof p.how !== "string" || !p.how.trim())
      throw new Error(`${specPath}: aiPatterns[] needs non-empty "pattern" and "how" strings`);
  }
}
```

**Viewer DOM (element-by-element, textContent)** — mirror `system/handoff-viewer.mjs:24–34` `el(...)` + the `hv-eyebrow`/`section` idiom (lines 197–222). No innerHTML from data.

**View-time fetch with graceful fallback** — mirror `agentic-ui-study.html:147`:
```js
fetch("/scenarios/fieldwork/rubric.json").then((r) => (r.ok ? r.json() : null)).catch(() => null)
```
Absent/failed → simply don't render the rubric block (never a broken surface).

**Nugget register** — mirror `.study-lineage` (`agentic-ui-study.html:68`, 100–106): `font-size: var(--type-caption); color: var(--color-fg-muted)`, prose sentence, cites named sources inline, **no badge/callout** (subtlety bar). Contrast with the wizard reasoning register (`factory-intake.mjs:55` — distilled ≤~30 words, teach-discipline) which is the same voice.

**Honesty (hard):** rubric/nugget copy is maker-authored assessment, never presented as agent output. Provenance labels stay verbatim. Citations: verified primary sources, in-register, no verbatim reuse of any single secondary source, **never name any talk's speaker** (`[[five-pillar-talk-attribution]]`).

---

## IMPLEMENTATION PLAN

Phases 1, 2, 3 touch **disjoint files** and are largely **independent** (parallelizable in separate loops/worktrees) — the only shared artifact is the `{ pillar, pattern, how }` *shape*, so do **Phase 1's schema decision first** (or agree the shape up front) then the rest can proceed in parallel. Phase 4 (regen + validation) is the barrier that must run last, after all three land.

### Phase 1: Component-level format — `aiPatterns` on the ComponentSpec head
**Independent of:** Phases 2–3 (different files), except it fixes the shared `{pillar,pattern,how}` shape.

**Tasks:**
- Extend the head schema doc (`kb-format.md` §ComponentSpec) with the optional `aiPatterns` field + the reconciliation note.
- Add optional validation to `parseComponentSpec` (`agent-layer/lib.mjs`).
- Add the one demonstration hook to `system/specs/demo-notice.md`.
- Add `aiPatterns` to `prepareHandoff`'s explicit head pick + render a rubric block in `renderHandoffViewer`; add its CSS to `handoff.html`.

### Phase 2: Screen-level rubric — the real AI-feature demo (option A)
**Independent of:** Phases 1 & 3 (new file + study page), shares the pillar vocabulary with Phase 1.

**Tasks:**
- Author `scenarios/fieldwork/rubric.json` (maker-authored; five pillars → real `agentic-study.mjs` affordances; verified citations).
- Surface it on `agentic-ui-study.html`: fetch (graceful fallback) + a render block in the study script (or a small helper), in the `.study-lineage` register; shape-check + throw/skip on malformed.
- Add a `rubric.json` line to `scenarios/README.md`'s file list.

### Phase 3: Cited legibility nuggets on `factory.html`
**Independent of:** Phases 1–2 (only `factory.html` + its CSS). **Must precede Phase 4's baseline regen.**

**Tasks:**
- Add three muted, in-register captions: Station 1 (guided input), Station 5 (visible reasoning / plan-before-act), and near the honesty/capability copy (AI-content labeling). Each outside any `replaceChildren` mount.
- Add a minimal nugget CSS class in `factory.html` (or reuse `.muted`/`.study-lineage`-equivalent).

### Phase 4: Regenerate, validate, refresh baseline (barrier — after 1–3)
**Depends on:** Phases 1–3.

**Tasks:**
- Regenerate the handoff pack; confirm the drift-check is green.
- Confirm scenarios/traces validate.
- Regenerate the `factory.html` visual baseline (Docker) — see `[[visual-regression-baseline-trap]]`.
- Manual render pass of every touched surface under the neutral pack.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently testable.

### UPDATE `.claude/references/kb-format.md` (§ComponentSpec)
- **IMPLEMENT**: Add an optional head-field bullet after the `children` bullet (line ~26): `` `aiPatterns` (optional) — when the component participates in an AI feature, an array of `{ pillar, pattern, how }` recording an AI-UX pattern it carries; `pillar` ∈ `trust | clarity | control | transparency | meaningful-benefit`. Absent on non-AI specs. Screen/flow-level patterns live in the scenario package's `rubric.json`, not here — a screen's rubric is the union of its components' `aiPatterns` and its screen-level patterns.``
- **PATTERN**: match the existing terse bullet style (lines 18–27).
- **GOTCHA**: keep the "Sync rule" paragraph (line 30) intact — adding an optional JSON key preserves the shape, so `parseFencedJson`/`section` stay compatible; say so.
- **VALIDATE**: `grep -n aiPatterns .claude/references/kb-format.md`
- **SATISFIES**: AC "extend the ComponentSpec head (kb-format §ComponentSpec)"; sync-rule AC.

### UPDATE `agent-layer/lib.mjs` (`parseComponentSpec`)
- **IMPLEMENT**: after the `children` check (line 88), add the optional `aiPatterns` validation block from *Patterns to Follow*.
- **PATTERN**: `agent-layer/lib.mjs:85–88` (throw naming the path).
- **IMPORTS**: none new.
- **GOTCHA**: keep it **optional** (`!== undefined` guard) — every existing spec has no `aiPatterns` and must still parse. Do not add it to any required list.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{for(const f of require('fs').readdirSync('system/specs').filter(x=>x.endsWith('.md')))m.parseComponentSpec('system/specs/'+f);console.log('all specs parse ✓')})"` (or simply run `node agent-layer/gen-handoff.mjs`).
- **SATISFIES**: AC "both parsers still parse every existing spec (sync rule upheld)".

### UPDATE `system/specs/demo-notice.md` (add the demonstration hook)
- **IMPLEMENT**: add to the JSON head (after `"children": []`):
  ```json
  "aiPatterns": [
    { "pillar": "transparency", "pattern": "content-provenance labeling",
      "how": "renders the scenario's provenance notice (fictionalNotice / speculativeNotice) verbatim and always in the accessibility tree, never dismissed or collapsed — on an AI screen this is where AI/speculative provenance is disclosed to the viewer" }
  ]
  ```
- **PATTERN**: head shape `system/specs/care-task-row.md:1–16`.
- **GOTCHA**: JSON — comma after `"children": []`. `demo-notice` is `status: spec` (fine). Do **not** touch its prose sections. Honesty: the `how` describes exactly what the component does (no overclaim — it labels provenance; AI-content labeling is that pattern instantiated when the content is AI-generated).
- **VALIDATE**: `node agent-layer/gen-handoff.mjs && node -e "const p=require('./handoff/verdant/pack.json');const d=p.components.find(c=>c.component==='demo-notice');if(!d.aiPatterns)process.exit(1);console.log('pack records demo-notice.aiPatterns ✓')"`
- **SATISFIES**: AC#1 "a spec carrying rubric hooks regenerates a pack that records the patterns; specs without AI-feature scope are unaffected".

### UPDATE `system/handoff-viewer.mjs` (surface `aiPatterns`)
- **IMPLEMENT**: (a) in `prepareHandoff`, add `aiPatterns: c.aiPatterns ?? null` to the explicit `head` object (lines 48–56) **and** carry it on the returned component (e.g. `aiPatterns: c.aiPatterns ?? null`). (b) In `renderHandoffViewer`, when `c.aiPatterns?.length`, append a small block under the component header (before/inside the grid): an `hv-eyebrow` "AI-UX patterns carried" + one row per entry rendering `pillar · pattern` (strong) and `how` (muted), built via `el(...)`.
- **PATTERN**: `handoff-viewer.mjs:24–34` (`el`), 188–222 (eyebrow/section idiom).
- **GOTCHA**: `prepareHandoff` intentionally does NOT `...c` — you must add the field explicitly or it's dropped (the very reason it's a pick). It stays in the raw "Source (spec head)" JSON automatically (that renders `c.head`), so avoid duplicating it confusingly — the dedicated block is the *legible* projection.
- **VALIDATE**: `npx serve .` → open `/handoff.html`; the `demo-notice` card shows the AI-UX patterns block, no console errors, renders under neutral pack.
- **SATISFIES**: AC "surface in the handoff viewer where it fits"; "viewer renders sanely".

### UPDATE `handoff.html` (viewer CSS for the rubric block)
- **IMPLEMENT**: add token-only CSS for the new `hv-*` classes (e.g. `.hv-aipatterns`, `.hv-aipattern-row`) — muted, quiet, consistent with the existing `hv-eyebrow`/`hv-*` styles the page owns.
- **PATTERN**: existing `hv-*` rules in `handoff.html` (the page owns the viewer styles; the module injects none).
- **GOTCHA**: token-only — no literals (token-discipline). `handoff.html` is NOT a visual-baseline page, so no VR regen from this.
- **VALIDATE**: visual check at `/handoff.html`.
- **SATISFIES**: viewer renders sanely.

### CREATE `scenarios/fieldwork/rubric.json` (the real screen rubric)
- **IMPLEMENT**: maker-authored, five entries. Draft mapping (verify every `how` against `agentic-study.mjs` lines and every `cite` against the primary source before finalizing):
  ```json
  {
    "screen": "Fieldwork dispatch — agentic composition",
    "aiFeature": true,
    "patterns": [
      { "pillar": "clarity", "pattern": "guided input over blank boxes",
        "how": "the reader picks from a bounded question set — never a blank prompt (the study 'Pick a question' tablist)",
        "cite": "Microsoft Guidelines for Human-AI Interaction — G1 'Make clear what the system can do', G7 'Support efficient invocation'; Google PAIR — User Needs + Defining Success" },
      { "pillar": "trust", "pattern": "plan-before-act",
        "how": "the agent's proposed composition is shown (slot preview + raw {name,props,children}) before the reader acts; the reader adjusts a deep-cloned working copy, never the committed proposal",
        "cite": "Nielsen — Visibility of system status (#1); Microsoft Guidelines for Human-AI Interaction — G9 'Support efficient correction'" },
      { "pillar": "control", "pattern": "stop/undo affordances",
        "how": "'Reset to the agent's proposal' plus reversible tone/remove/reorder; the out-of-vocabulary probe refuses non-destructively (the control reverts)",
        "cite": "Nielsen — User control and freedom (#3; undo/redo & 'emergency exit'); Microsoft Guidelines for Human-AI Interaction — G17 'Provide global controls'" },
      { "pillar": "transparency", "pattern": "visible reasoning",
        "how": "links the committed real-run PIV trace, dumps the raw composition, and names the exact refused out-of-vocabulary path verbatim",
        "cite": "Microsoft Guidelines for Human-AI Interaction — G11 'Make clear why the system did what it did'; Google PAIR — Explainability + Trust" },
      { "pillar": "transparency", "pattern": "AI-content labeling",
        "how": "the composition is labeled real, curated agent output ('Real run, curated for length'), precomputed at build time — no live model call at view time",
        "cite": "Microsoft Guidelines for Human-AI Interaction — G1 'Make clear what the system can do', G2 'Make clear how well the system can do what it can do'; Google PAIR — Explainability + Trust (transparency about what ran — NOT a 'label AI content' claim; PAIR does not phrase it that way)" }
    ]
  }
  ```
- **PATTERN**: maker-authored scenario JSON like `scenarios/fieldwork/copy.json`.
- **GOTCHA**: **honesty** — every `how` must correspond to an affordance that exists *today* (see the `agentic-study.mjs` line map in Context). No aspirational patterns. Citations verified; no fabricated guideline numbers; no talk-speaker names; no verbatim secondary-source reuse. `meaningful-benefit` has no single enumerated pattern — omit it rather than invent one (the honest set is the four above; add a fifth `meaningful-benefit` entry only if a real affordance genuinely earns it).
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('scenarios/fieldwork/rubric.json'))" && node scenarios/validate.mjs` (confirm the package still validates green with the new file).
- **SATISFIES**: the real five-pillar screen demo (option A); "handoff pack / record states which patterns the screen carries".

### UPDATE `agentic-ui-study.html` (surface the screen rubric)
- **IMPLEMENT**: (a) add `fetch("/scenarios/fieldwork/rubric.json").then(r=>r.ok?r.json():null).catch(()=>null)` to the `Promise.all` (near line 147). (b) after `renderStudy(...)`, if the rubric loaded, render a block into a new `<div id="rubric">` placed after `#study` (before/near `#lineage`): an eyebrow "How this AI screen earns the five pillars" + one row per pattern (`pillar · pattern` strong, `how` muted, `cite` muted/small). Build with `createElement`+`textContent` (no innerHTML from data). (c) add `.study-rubric*` CSS in the page `<style>` in the `.study-lineage` register.
- **PATTERN**: the page's existing render helpers (`$`, `renderCapability` 131–141) and `.study-lineage` styling (68).
- **GOTCHA**: this page is NOT a visual-baseline page — no VR regen. Keep the block muted/quiet (subtlety bar; `[[calm-colour-constraint]]`). Graceful when `rubric` is null (render nothing).
- **VALIDATE**: `npx serve .` → `/agentic-ui-study` shows the rubric block tied to the real affordances; no console error; renders under neutral pack.
- **SATISFIES**: option A — the real AI screen carries + states its five-pillar patterns, on its own surface.

### UPDATE `scenarios/README.md` (document the optional file)
- **IMPLEMENT**: add a `rubric.json   (optional) the screen's five-pillar AI-UX rubric — maker-authored assessment, cited` line to the package file list (~line 40) + a short `### rubric.json` subsection describing the shape and the maker-authored/honesty constraint.
- **VALIDATE**: `grep -n rubric.json scenarios/README.md`
- **SATISFIES**: format documented for #43/#44 reuse.

### ADD three nuggets to `factory.html`
- **IMPLEMENT**: three muted captions in the existing register (copy below is **citation-verified** — see the "Citation verification" gate; use as-is or lightly reword, keeping the verified attributions):
  - **Station 1 (`#intake`, outside `#factory-wizard`)**: "One decision at a time, with the reasoning shown — guided input in place of a blank box: efficient invocation (Microsoft's Human-AI guidelines) built on defining what the user needs (Google PAIR)."
  - **Station 5 (`#agents`, near `#agents-note`/player)**: "Shown as stepped acts, not a log — the agent's reasoning made visible: Nielsen's visibility of system status, and the guideline to make clear why the system did what it did (Amershi et al.)."
  - **Honesty/capability (near a `capability` indicator or the fictional notice)**: "Every generated artifact states what it is and what actually ran — making clear what the system did, the transparency baseline in Google PAIR's explainability guidance."
- **PATTERN**: `.study-lineage` register (`agentic-ui-study.html:100–106`); place as `<p class="fw-nugget muted">…</p>` (add a light class or reuse `.muted`/`.max-prose`).
- **GOTCHA**: **no badge/callout** (subtlety bar — "success reads as unusual clarity"). Must sit OUTSIDE `#factory-wizard`/any `replaceChildren` mount (`factory-intake.mjs:379` wipes children each step). No talk-speaker names; no single-source verbatim.
- **VALIDATE**: `npx serve .` → `/factory.html`; three nuggets present at the three surfaces, quiet, render under neutral pack; wizard stepping doesn't remove them.
- **SATISFIES**: AC "nuggets present on the trace-player, wizard, and honesty-label surfaces, cited, in-register; pages render under the neutral pack".

### Citation verification — DONE at planning (2026-07-20); implementer uses the verified copy
- **STATUS**: **completed during planning.** All attributions in the `rubric.json` draft and the three nugget drafts were verified against the primary sources below. The copy above is safe to ship as-is; only re-verify if you materially reword an attribution.
- **VERIFIED SOURCES**:
  - Nielsen (NN/g) — [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): **#1 Visibility of System Status**, **#3 User Control and Freedom** (recommends **Undo/Redo** + "emergency exit"). Confirmed verbatim.
  - Amershi et al. — [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/group/customer-insights-research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/) (CHI 2019): **G1** "Make clear what the system can do", **G2** "Make clear how well the system can do what it can do", **G7** "Support efficient invocation", **G9** "Support efficient correction", **G11** "Make clear why the system did what it did", **G17** "Provide global controls". All confirmed verbatim.
  - Google PAIR — [People + AI Guidebook](https://pair.withgoogle.com/guidebook/): six chapters incl. **User Needs + Defining Success**, **Explainability + Trust**, **Feedback + Control**. Confirmed.
- **ONE DOWNGRADE APPLIED** (the reason this gate mattered): PAIR's "Explainability + Trust" is about explaining the AI and calibrating trust — it does **not** say "label AI-generated content" (that is a newer C2PA / EU-AI-Act concern). The original draft attributing "label AI content / provenance" to PAIR was an overreach and has been rewritten to cite the transparency principle PAIR *does* state (make clear what the system did → PAIR Explainability + Trust + Amershi G1/G2). No fabricated attribution ships.
- **CONSTRAINTS UPHELD**: attributions quote only short primary-source guideline *names* (not secondary-source prose — no verbatim secondary reuse); "Amershi et al." is the paper's authorship (the approved citation), **not** any talk's speaker (`[[five-pillar-talk-attribution]]`).
- **SATISFIES**: honesty contract; AC#3 "cited … in-register" (truthfully cited).

### REGENERATE handoff pack, commit, then run the drift gate (barrier)
- **IMPLEMENT**: (1) regenerate: `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && node agent-layer/gen-pack-bundle.mjs`. (2) inspect: `git status --porcelain -- handoff/` should list only `pack.json` + `pack.bundle.json`. (3) **commit** the regenerated `handoff/verdant/*`. (4) **then** `node tooling/drift-check.mjs`.
- **GOTCHA**: **order matters** — `checkHandoff` regenerates and fails on ANY *uncommitted* `handoff/` change (`git status --porcelain` non-empty), so `drift-check ✓` is only reachable **after** the regenerated pack is committed. Regenerate → commit → drift-check, not regenerate → drift-check → commit. If drift appears beyond `pack.json`/`pack.bundle.json`, something regressed (tokens/wc/contracts must not change). Requires `tooling/style-dictionary/node_modules` (`cd tooling/style-dictionary && npm install` on a fresh clone).
- **VALIDATE**: `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · handoff · scenarios · traces`
- **SATISFIES**: AC "committed generated handoff outputs regenerated in the same change so the CI drift-check (#9 gates) stays green".

### REGENERATE the `factory.html` visual baseline (barrier, after Phase 3)
- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` (Linux baselines — local macOS render differs; `[[local-agent-visual-gate-notes]]`, `[[visual-regression-baseline-trap]]`). Commit only the changed `factory*` baseline(s).
- **GOTCHA**: only `factory.html` changed at-rest → only its baseline should move. If other baselines move, investigate. **Coordination**: `feature/portfolio-motion-phase01` (current branch) and #42 also touch Factory copy — rebase/regen last to avoid a stale-baseline collision (see Open Questions).
- **VALIDATE**: `cd tooling/visual-regression && npm test` (or the Docker equivalent) → factory passes against the refreshed baseline.
- **SATISFIES**: `[[visual-regression-baseline-trap]]`; CI gate stays green.

### FINAL manual render pass
- **IMPLEMENT**: `npx serve .`; open `/factory.html`, `/handoff.html`, `/agentic-ui-study` under the neutral pack; confirm all surfaces render, no console errors, nuggets/rubric quiet and cited.
- **VALIDATE**: visual + console-clean.
- **SATISFIES**: CLAUDE.md "done = run the surface you touched".

---

## TESTING STRATEGY

No suite/linter/type-check exists (CLAUDE.md) — "done = run the surface you touched." Verification is generator `✓` lines, the drift gate, and rendered pages.

### Unit-ish / boundary
- `parseComponentSpec` parses every existing spec unchanged (run `gen-handoff`) **and** accepts the new `demo-notice.aiPatterns` **and** rejects a malformed hook (temporarily set a bad `pillar` → confirm it throws naming the path, then revert).
- `rubric.json` is valid JSON and `scenarios/validate.mjs` stays green with it present.

### Integration
- `node tooling/drift-check.mjs` green (syntax · token-css · handoff · scenarios · traces).
- Pack + bundle contain `demo-notice.aiPatterns`; vocabulary.json does **not** (rubric doesn't leak to agents).
- Study page fetches + renders the rubric; handoff viewer renders the component block; factory nuggets present.

### Edge cases
- Spec with **no** `aiPatterns` → unaffected (all other specs).
- `rubric.json` **absent/404** → study page renders normally, no rubric block, no error (graceful fallback).
- Malformed `aiPatterns` (bad pillar / empty how) → `parseComponentSpec` throws (fail-loud at build).
- Wizard stepping on `/factory.html` → Station-1 nugget survives (outside the `replaceChildren` mount).

---

## VALIDATION COMMANDS

### Level 1: Syntax & shape
- `node --check agent-layer/lib.mjs system/handoff-viewer.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('scenarios/fieldwork/rubric.json'))"`

### Level 2: Generators / parser
- `node agent-layer/gen-handoff.mjs` → `handoff pack ✓ …`
- `node agent-layer/gen-vocabulary.mjs` → `vocabulary ✓ …` (confirm no `aiPatterns` in `handoff/verdant/vocabulary.json`)
- `node scenarios/validate.mjs` → passes with `rubric.json` present

### Level 3: Full drift gate
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · handoff · scenarios · traces`

### Level 4: Manual
- `npx serve .` → `/handoff.html` (demo-notice rubric block) · `/agentic-ui-study` (screen rubric) · `/factory.html` (three nuggets, wizard-step-safe)

### Level 5: Visual regression
- `cd tooling/visual-regression && npm run update:docker` then `npm test` (Docker) → only `factory` baseline moved; suite green.

---

## ACCEPTANCE CRITERIA (from #41, mapped)

- [ ] **AC#1** A spec carrying rubric hooks regenerates a pack that records the patterns (`gen-handoff` prints `✓`; viewer renders sanely); specs without AI-feature scope unaffected. → `demo-notice.aiPatterns` in `pack.json`; all other specs untouched.
- [ ] **AC#2** Both parsers still parse every existing spec (sync rule upheld). → `parseComponentSpec` optional-field guard; shape unchanged so `parseFencedJson`/`section` stay compatible.
- [ ] **AC#3** Nuggets present on the trace-player, wizard, and honesty-label surfaces, cited, in-register; pages render under the neutral pack. → three `factory.html` captions.
- [ ] **AC#4** Committed generated handoff outputs regenerated in the same change so the CI drift-check stays green. → `handoff/verdant/*` regenerated + committed; `drift-check ✓`.
- [ ] **(Option A, added)** The real AI feature (Fieldwork agentic composition) carries + states its five-pillar rubric on its own surface, each pattern tied to a real affordance, cited. → `scenarios/fieldwork/rubric.json` + study-page block.
- [ ] Code follows conventions (throw-naming-the-path, token-only CSS, DOM via textContent, maker-authored honesty, verified citations).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (or Phases 1–3 in parallel, Phase 4 last).
- [ ] Each task's VALIDATE passed.
- [ ] `node tooling/drift-check.mjs` green.
- [ ] `handoff/verdant/*` regenerated + committed; diff limited to `pack.json` + `pack.bundle.json`.
- [ ] `factory` visual baseline refreshed (Docker) + committed; no other baseline moved.
- [ ] Manual render pass clean (handoff · study · factory) under neutral pack.
- [ ] Every citation verified against its primary source; no verbatim secondary-source reuse; no talk-speaker named.
- [ ] Every `how` corresponds to an affordance that exists today.
- [ ] Committed atomically with a message referencing #41 + the epic (`Closes #41`).

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions:**
- `aiPatterns` head-field shape is `{ pillar, pattern, how }` (component) / `{ pillar, pattern, how, cite }` (screen rubric). Screen rubric adds `cite` (the legibility/evidence layer); the component head omits it (engineer handoff record — citations live in the rubric + nuggets).
- The honest pillar set for the Fieldwork screen is **four** (clarity, trust, control, transparency) — a **deliberate** omission of `meaningful-benefit`, which the ticket lists as a pillar with **no enumerated pattern**. If you'd rather show all five, Fieldwork's own utility/ethics framing genuinely earns it (the derivation rules habit-mechanics *out* — "utility; habit mechanics rejected" — so the screen's benefit is real, not engagement-farmed; `factory-intake.mjs:113–116`). Add it only with that honest `how`, not as a checkbox.
- `scenarios/validate.mjs` tolerates an extra optional top-level `rubric.json` — **confirmed by reading it (2026-07-20)**: `validatePackage` (lines 268–290) reads only the known files (brief/intake/copy/proto.config) and its sole `readdirSync` is on `fixtures/` (line 162) — there is no top-level file allowlist, so `rubric.json` is never inspected and `checkScenarios` stays green. (Contingency if this ever changes: shape-check in the study page rather than expanding the validator — leave #39's refactor alone.)
- The three nuggets belong on `factory.html` (the designed home of all three surfaces); `trace.html`/`agentic-ui-study.html` are bare/other harnesses.

**Questions (surface before/at execution):**
- [ ] **Baseline collision** — this ticket refreshes `factory.html`'s baseline while `feature/portfolio-motion-phase01` (current branch) and #42 also touch Factory copy. Sequence: branch #41 off `main`, land it, then rebase the others; or coordinate whichever lands last to regen. Confirm the intended merge order so baselines don't fight.
- [x] **Citation exactness** — RESOLVED at planning: all attributions verified against the primary sources, with exact G-numbers/heuristic-numbers (see the Citation-verification gate). Residual *preference* only: the `rubric.json` `cite` fields carry the G-numbers (precise, for the inspectable record); the shipped **nuggets** use lighter phrasing without G-numbers (subtlety bar). Flag if you'd prefer numbers off the rubric too, or on the nuggets.
- [ ] **Should the component-head `aiPatterns` also carry `cite`?** Current plan: no (pack is an engineer record; citations live in the rubric/nuggets). Flag if you'd prefer the pack to cite too.

---

## NOTES (open canvas)

**Why not `metric-tile` (the rejected lean).** `metric-tile` is the AI-feature-adjacent primitive (the composing agent emits it) but it is **read-only/presentational** and carries **none** of the five *enumerated patterns* (plan-before-act, visible reasoning, stop/undo, AI-content labeling, guided input). Recording a *pillar* there substitutes a pillar name for an absent pattern — overclaiming, which the honesty contract forbids. The advisor pass caught this; the fix is: patterns are screen-level → record them on the real screen (Fieldwork agentic composition), and only put a component hook where a component genuinely carries a pattern wherever used (`demo-notice` → content-provenance labeling).

**Why the Fieldwork agentic study is a *real* AI feature (the map the rubric cites):**
| Pillar / pattern | Real affordance shipped today | `agentic-study.mjs` |
| --- | --- | --- |
| clarity — guided input | bounded "Pick a question" tablist | :52 |
| trust — plan-before-act | proposal shown (preview + raw JSON) before acting; reader edits a clone, never the commit | :57–65, header 4–5, 11–12 |
| control — stop/undo | "Reset to the agent's proposal" + reversible tone/remove/reorder; probe reverts non-destructively | :166, :156 |
| transparency — visible reasoning | links the committed PIV trace + dumps raw composition + names the refused path verbatim | :65, :173, :87–88 |
| transparency — AI-content labeling | verbatim "Real run, curated" provenance label + build-time-only capability copy | :171, `agentic-ui-study.html:136` |

**Drift surface is narrow (a correctness signal for the implementer):** `aiPatterns` touches neither tokens nor wrappers, so regeneration changes **only** `pack.json` + `pack.bundle.json`. A wider `handoff/` diff means something regressed.

**Parallelization:** Phases 1/2/3 are file-disjoint. A worktree-per-phase or three loops converge, then one barrier (Phase 4: regen + drift + baseline). Given the honesty-loaded prose (rubric + nuggets), a single careful pass is also fine — the copy is the risk, not the mechanics.

**Confidence (one-pass success): 9.5/10.** Raised from an initial 7.5 by *closing the two gaps that caused it*, not by re-scoring:
- **Citations verified + baked in (was the biggest risk).** All attributions were checked against the primary sources during planning (NN/g #1/#3; Amershi G1/G2/G7/G9/G11/G17 verbatim; PAIR's six chapters) and the one overreach (PAIR ≠ "label AI content") was corrected. The implementer types verified copy — no research step, no fabrication risk. See the "Citation verification" gate.
- **Validator tolerance confirmed by reading `scenarios/validate.mjs`** — `rubric.json` provably won't trip `checkScenarios` (no top-level allowlist). Assumption → fact.
- Machine-layer seams (parser/gen/viewer) were read and confirmed; the `...s.head` passthrough + explicit `prepareHandoff` re-pick are pinned; drift surface is narrow (only `pack.json` + bundle).

**The residual 0.5** is the one thing a plan can't fully eliminate: the **Docker visual-baseline regen** is environment-dependent (`[[local-agent-visual-gate-notes]]`) and its **merge-order coordination** with `feature/portfolio-motion-phase01` + #42 is an external dependency (see Open Questions). Command and expected diff are pinned; the coordination is a human call at execution time.

## AMENDMENTS

<!-- Append-only after first approval/execution. Newest at the bottom. -->
- (none — plan created 2026-07-20)
