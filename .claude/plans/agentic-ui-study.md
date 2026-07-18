# Feature: Agentic-UI study (#13) — `metric-tile` library primitive · composition runner · spike 6 gate · ask → propose → adjust · Fieldwork slots

> Validate documentation, codebase patterns, and task sanity before implementing. Pay special attention to naming of existing utils/types/models — import from the right files. This revision (2026-07-18) folds verified codebase facts (see **Ground truth** below) and promotes the seven open questions to committed decisions.

## Feature Description

The second exhibit — first under **Work**, deep-linkable (architecture line 23; PRD §6.6). On Fieldwork's heavy-ops dispatch data, a build-time agent composes dashboard views from the shared component library via the declarative `{name, props, children}` contract; the reader runs **ask → propose → adjust** — proposals **precomputed** (replayed-agents constraint), adjustment + rendering **live** via the renderer + action bus. Human-in-the-loop by construction: the engineer designed the vocabulary, the slot bounds, and the review controls. The study also fills the two designated agentic slots in the Factory's Fieldwork prototype (`summary-strip` + `insight-panel`, bounds settled 2026-07-17).

**This ticket folds spike 6** (agent composition quality — gates the study's credibility) and carries a **hard prerequisite discovered in planning:** the shared vocabulary is Verdant-locked — every data-bearing component's props are enums the renderer strictly enforces (`stat-tile.kind ∈ {moisture, light}`, `status-chip.value ∈ {ok, due, overdue}`), so an agent **cannot** express dispatch data with it (a static finding, proven from the specs). Per the user's decisions (2026-07-18), this ticket **folds a minimal shared-library extension** (`metric-tile`) so the same spec→vocabulary→renderer→token pipeline can express Fieldwork data, then runs spike 6 against the **extended** vocabulary as the genuine gate.

## User Story

As a hiring manager evaluating "can this person build agentic UI safely, not just talk about it?"
I want to watch a real agent compose dispatch-board views from a bounded component vocabulary — pick a question, see the proposed composition, adjust it live within the guardrails — and see it **refuse** anything out of vocabulary
So that I can verify the claim structurally: the design system from Exhibit 1 is what makes agentic UI safe in Exhibit 2, and the engineer's role has moved up to designing the vocabulary, the slot bounds, and the review controls.

---

## DECISIONS (the seven open questions, resolved)

These were "Open Questions / Assumptions" in the prior draft. Each is now a committed decision with one-line rationale. Override any before Phase 1 if you disagree; none blocks.

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **One new primitive: `metric-tile`.** `state-chip` is the pre-authorized *first tighten move* if spike 6's insight-panel is weak without categorical chips — same Phase-1 pipeline, not a new ticket. No third primitive. | Simplicity First; the two slots (KPI strip · toned metric column) are expressible with label/value/unit + tone. |
| D2 | **Class prefix `ds-` (`ds-metric-tile`).** It is a **library-generic** primitive, distinct from `vd-` (Verdant) / `fw-` (Fieldwork). Add a one-line note to the components.css scenario banner that `ds-` = cross-scenario library. | Best matches the "two exhibits, one system" claim. `ds-` exists nowhere today (verified) — it is a deliberate new, honest signal. **Override:** if you'd rather not introduce a prefix, `vd-metric-tile` also works (the vocabulary is currently verdant-scoped). |
| D3 | **`metric-tile.tone` renders via fill-inversion on `--color-accent`** (neutral = surface base · warn = accent border/tint · critical = accent fill + `--color-accent-fg` text) — **no new tokens**, mirroring `status-chip`'s due→overdue escalation. | **Verified: there is NO warn/critical/danger token in the contract.** Reusing the system's existing escalation mechanic is the stronger "one system" statement and honest under any pack. **Override:** if you want hue-based severity, add `--color-warn`/`--color-critical` to `tokens.source.json` (contract group) → regenerate FIRST; larger, deferred by default. |
| D4 | **Primitive joins the existing single `handoff/verdant/` vocabulary** (which already carries library-wide `demo-notice`); generators stay single-scenario. A scenario-scoped pack/vocabulary split is deferred (tracked, not taken here). | Additive, zero generator change; matches how `demo-notice` already lives there. |
| D5 | **Proposals live at `proto/compositions/<slug>.json`**; a committed manifest `proto/compositions/index.json` lists them. The bare file content is a **composition** (`[{name,props,children}, …]`) — directly `validateComposition`/`renderComposition`-able; question/slot/slug metadata lives only in the manifest. | Served, deep-linkable, near proto + study consumers; keeps the agent's artifact pure composition and the validator's input clean. |
| D6 | **Study page = `agentic-ui-study.html` at repo root**, route `/agentic-ui-study`, linked from Work Exhibit 02. `agentic.html` stays the raw harness. | Deep-linkable like `agentic.html`/`derive.html`; the study is the *designed* successor. |
| D7 | **Each composition run is a genuine PIV trace** (plan → gate-against-slot-bounds → implement-by-writing-the-file → validate-via-`validateComposition`), reusing the whole #5/#25 trace pipeline. | On-narrative with PIV-two-roles; satisfies `validate-trace.mjs`'s phase + artifact checks for free; the replayable run is the strongest answer to "did you hand-write this?". |

Also decided: the **`agent.*` bus-replay adjust path is CUT** (Simplicity First — trace-player provenance + reader `ui.*` adjust + the boundary-probe refusal already tell the complete story). `photoUrl` scheme-safety needs no change (dispatch compositions carry no URLs; `plant-card` is Verdant/off-scenario).

---

## HONESTY CONTRACT (canonical — load-bearing throughout; referenced, not restated per task)

This is the credibility-risk ticket. Every surface below must hold; tasks reference **[HC]** rather than repeating it.

1. **Fictional scenario labeled.** The study page and Fieldwork carry the scenario's `fictionalNotice`.
2. **Traces labeled "real run, curated."** Every committed proposal is produced by a real build-time Agent SDK run; the raw+curated trace pair is committed; the curated label reads `Real run, curated for length`.
3. **Capability indicator states exactly what runs.** Proposals are **precomputed** from real runs; **adjustment + rendering run live in the browser**; **no live model call at view time** (PRD §8, hard).
4. **Never hand-write a composition** (same rule as traces — architecture line 88). A weak run is fixed by a tighter prompt / tightened vocabulary rules + **re-run**, never an edit.
5. **Never hand-feed a worked example** (the third, subtler surface). The agent's prompt contains ONLY (a) the vocabulary, (b) the Fieldwork fixtures, (c) the question + slot bounds. **No seed/example `{name,props,children}`, no external dashboard reference.** A hand-fed example would make the output half-hand-written and silently break the study's whole claim.
6. **"Tighten and re-run" means tightening COMMITTED SOURCE** — `record-composition.mjs`'s prompt construction, or `vocabulary.json`'s `composition` rules — never an ephemeral inline. The trace meta records only `slug/task/model/sessionId/cwd/redaction`, **not the full system prompt**, so the runner's committed source IS the inspectable proof that only vocabulary + data + question went in. Keep prompt construction literal and transparent in that source.
7. **A2UI / AG-UI are cited as lineage, never dependence** — pattern-compatible wording only.

---

## Problem Statement

The agentic bridge (#11) shipped a raw harness (`agentic.html`) but no designed surface; the Fieldwork canvas (#8) shipped two honestly-empty agentic slots; and the epic's slicing left an unstated dependency: nothing provides a vocabulary that can express dispatch data. Without the study, the "two exhibits, one system" argument is asserted, not shown; without the vocabulary extension, no honest composition run is even possible (the current vocabulary refuses dispatch data by construction).

## Solution Statement

1. **Extend the shared library minimally** — one generic primitive `metric-tile` (KPI/reading tile: `label` + `value` + optional `unit` + optional `tone`) via the full spec→vocabulary→renderer→token pipeline.
2. **Build a composition runner** — `portal/record-composition.mjs`, reusing the hardened recorder (`recordRun` + `redact.mjs`) and `validateComposition`. Each run is a real PIV trace.
3. **Add a committed KPI-truth check** — `tooling/fieldwork-kpis.mjs` computes the ground-truth dispatch KPIs from the fixtures, used to verify each proposal's numbers (the one check no existing validator does). **Never fed to the agent** — a post-hoc judge tool only.
4. **Run spike 6 as the real gate** — 3–5 runs over distinct questions against the extended vocabulary; judge against the rubric; defensible → commit; weak → tighten + re-run. Record the verdict on #13.
5. **Build the study page** (only after the gate) — ask → propose → adjust, with the refusal **shown** as a primary designed affordance.
6. **Fill the two Fieldwork slots** with the canonical `summary-strip` + `insight-panel` proposals.
7. **Wire Work** — the Exhibit 02 deep link + the bridge argument made legible.

## Out of Scope / Non-Goals

- **No live LLM at view time** (PRD §8) — every proposal precomputed; only adjustment + rendering live.
- **No hand-written/hand-edited composition; no hand-fed example** ([HC] 4, 5).
- **Not a general library expansion** — `metric-tile` only; `state-chip` only if spike 6 forces it; no `insight-row`, no component zoo.
- **Not parameterizing the generators for a second scenario pack** — deferred (D4).
- **Not changing the Verdant components, their enums, or `proto/verdant.html`.**
- **Not the voice layer** (bus is already voice-ready; nothing added).
- **Not the Factory page (#10)** — the study is a standalone exhibit #10 will link/embed.
- **No third-party agent-UI runtime, no framework, no schema library** (PRD §8).
- **Not re-recording or editing the committed `demo-notice` traces.**

## Feature Metadata

**Type**: New Capability (the flagship Work exhibit). **Complexity**: High — the largest ticket in the epic: library extension + build-time agent runner + gated spike + designed reader surface + slot wiring. **Primary systems**: `system/specs/` (new `metric-tile.md`) · `system/agentic-renderer.mjs` (new template) · `system/components.css` (new token-only CSS) · `handoff/verdant/` (regenerated) · new `portal/record-composition.mjs` · `portal/lib/trace-recorder.mjs` (redaction hardening) · new `tooling/fieldwork-kpis.mjs` · committed proposals + traces · new study page + module · `proto/fieldwork.html` (slot fills) · `work.html` (deep link) · `CLAUDE.md`. **Dependencies**: `@anthropic-ai/claude-agent-sdk` (already a portal dep, build-time only — never shipped). Everything shipped is vanilla/zero-dep.

## Related Work

**Implements** #13 (`Closes #13`). **Epic** #1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Two exhibits line 23 · §Agentic UI 51-57 · §Data model 39 · spike 6 85-88 · Open questions 96) · PRD §6.6.

**Back-references** (inherited decisions):
- `.claude/plans/agentic-bridge.md` (#11) — created `validateComposition`/`renderComposition`/`createBus`/`vocabulary.json`/the six templates; the renderer stays passive on `agent.*` (the composing page interprets) — the seam the adjust loop builds on; `agentic.html` is the raw harness whose *designed* surface is this study.
- `.claude/plans/data-connected-prototypes.md` (#8) — built the Fieldwork canvas + the two `.proto-slot` regions; settled slot bounds; punted "spec'd components later" to #11/#13.
- `.claude/plans/recorder-hardening.md` (#25) — `redact.mjs` + hardened `recordRun` (cwd param, denial recording); flagged the `taskSummary`/`slug` meta-redaction gap #13 closes.
- `.claude/plans/trace-recorder-player.md` (#5) — the record→curate→validate→replay pipeline the runner reuses; `trace-player.mjs` for provenance.
- `.claude/plans/handoff-pack-viewer.md` (#14) — Wave-2 sibling; `metric-tile` regenerates the pack #14's viewer then displays (additive, no conflict).

**Forward-references**: #10 (Factory page) links/embeds the study (keep the module fetch-lean); the voice layer (post-MVP) reuses the study's bus.

---

## GROUND TRUTH (verified from the code — corrections the prior draft got wrong or left vague)

Read alongside the Context References; these are the facts that change tasks.

- **`validateComposition(vocab, composition, path="composition")`** (agentic-renderer.mjs:31-109) — pure/DOM-free; arrays recurse with indexed paths; own-property vocab + prop lookup; out-of-vocab prop rejection; required/type/enum loop where **schema v1 types are ONLY `string|number|boolean`** (63-77); children ≤1, only allowed names, plus the status-chip competing-state check (79-104). Refusal messages name the path verbatim (`composition[2].children[0].props.value: …`).
- **`el(tag, attrs, ...children)`** (120-130) — `attrs.text` → `textContent`; `v == null || v === false` is skipped. So `text: props.unit` when `unit` is absent renders nothing (safe). The proposed `metric-tile` template is sound.
- **`TEMPLATES`** has exactly **six** entries (220-316: status-chip, stat-tile, primary-button, plant-card, care-task-row, screen-header). `build()` (328-339) looks up `TEMPLATES[name]`; a vocab entry with no template throws a drift error. **Add `metric-tile` here**; do NOT hardcode it in the validator (data-driven).
- **Spec head is a ` ```json ` fenced block** (not YAML), fields in order: `component, status, class, contract, props, tokens, states, children`. Four `## ` sections in exact order: **Usage · States · Data binding · Accessibility**.
- **`parseComponentSpec(specPath)`** (lib.mjs:63-117) takes a **path string**, returns `{head, sections, path}`. Validates: `component`===filename stem; `status ∈ {spec, shipped}`; `class` non-empty; each prop has `type:string` + `required:boolean`; `tokens` non-empty array of `--`-prefixed strings (**syntax only — does NOT check they exist in the contract**); `states` non-empty; `children` array; `contract` null or an existing sibling JSON-Schema file; four sections present in order.
- **`gen-vocabulary.mjs`** (SPECS/DEST hardcoded relative to the module, 17-19) copies `head.props` **verbatim** into `components[name].props` — no transform. A regenerated `metric-tile` entry = `{class, status, props, states, children, usage, contract}`.
- **`gen-token-css.mjs --check`** exists (150-158): regenerate in memory, compare to disk, `exit 1` on drift, write nothing.
- **NO warn/critical/danger token exists.** Accent family = `--color-accent` (`#2563eb`), `-hover`, `-active`, `-fg` (`#ffffff`), `-secondary`, `-on-inverse`. `status-chip` escalates via fill-inversion on `--color-accent` (components.css:1518-1526). → **D3.**
- **`ds-` prefix exists nowhere** in the repo (verified two ways). The components.css banner (1452-1459) says "SCENARIO PROTOTYPE COMPONENTS — vd-/fw-". `.vd-stat-tile` family at 1577-1612 is the altitude to mirror.
- **Recorder** (trace-recorder.mjs) — `recordRun({slug, task, taskSummary, systemPrompt, model, maxTurns, allowedTools, tools, canUseTool, outFile, cwd=REPO_DIR})` → `{outFile, steps, phases, nullPhaseSteps, artifacts, denials, ok, totalCostUsd}`. **Meta line (151-158) writes `slug` and `task`(taskSummary) UN-redacted** — the #13 hardening gap. Artifact path = `path.relative(cwd, resolve(cwd, file_path))` (81), so a real run (cwd=REPO_DIR) yields a repo-relative path `validate-trace.mjs` can find; a `--dry` run (cwd=scratch) does not (correct — dry is never validate-trace'd).
- **`validate-trace.mjs`** — meta `version:1` + non-empty `slug/task/model/sessionId`; `label` matches `/real run/i`; curated needs `curation.rules` + a raw sibling with matching `sessionId`; all four PIV phases in order (87-88); a successful Write pairs an `artifact.path` that is repo-relative and **exists on disk** (74-81).
- **`record-trace.mjs`** — the runner to parallel: `makeFence(root)` (97-127, per-tool deny branches, `SECRET_PATHS` const 40, Bash `node ` allow, Read/Grep/Glob secret-deny); `PIV_SYSTEM` (42-72); model `claude-sonnet-5`, real maxTurns 50 / dry 12; the fence is wired as BOTH `canUseTool` and the PreToolUse hook (recordRun does this when `canUseTool` is passed).
- **Auth has a fallback** (env.mjs:19-27; record-trace.mjs:129-133) — `CLAUDE_CODE_OAUTH_TOKEN` from `portal/.env` if present, ELSE the machine's Claude CLI login. **`portal/.env` is NOT a hard blocker.** The `--dry` smoke run is the real auth proof. (`portal/.env` is currently absent on this machine — the fallback path applies unless a token is added.)
- **Fixture ground truth** (jobs.json = 64 records): **overdue = 4** (job-002, 023, 036, 046), **unassigned = 5** (techId null: job-052, 061-064); one `en-route` (job-006), one `on-site` (job-032); `open = completedAt===null`, `atRisk = open && slaDue <= "2026-07-16"` (SLA_SOON; TODAY = "2026-07-14"). technicians = 10 (north 3 / south 3 / east 2 / west 2). schedule = 30 (10 techs × 3 days). **The prior draft's "12 overdue" example is wrong for this data** — precisely why the KPI-truth check exists.
- **`fieldwork.html`** — single `<script type="module">` (52-164), sole import `loadCollection` from `/system/scenario-data.mjs`; `copy.json` via `fetch`; constants `TODAY`/`SLA_SOON` (63-64); `slot(id,note)` helper (129-133) → `<section class="proto-slot" data-slot="…">`; call sites **line 141** (summary-strip) + **line 158** (insight-panel). Human-fixed (DO NOT touch): toolbar 136-140, Attention 144-147, lanes 148-151 (`lane(t)` 109-125), Needs-assignment 154-157, `jobRow` 92-101, `statusChip`/`slaMark` 88-90.
- **`agentic.html`** is the exact import/fetch precedent: `import { createBus } from "/system/action-bus.mjs"`; `import { validateComposition, renderComposition } from "/system/agentic-renderer.mjs"`; `fetch("/handoff/verdant/vocabulary.json")`; `renderComposition(...)` returns a DOM node to append; capability rendered from rendering reality (`.cap-live`/`.cap-css`/`.cap-bad`).
- **`work.html`** — Exhibit 02 (53-64) badge `Planned`, **no `.card-foot`**; cards 1 & 3 show `<div class="card-foot"><a href="…">… →</a></div>`; the substrate card uses `<span class="capability live">Runs now</span>`.

---

## STOP-GATES (two decisions genuinely owned by the user — resolve in the plan flow, do not skip)

**SG-A — branch strategy in this shared tree (resolve at Phase 0).** The working directory is a **shared tree with another ticket's untracked work present** (`tooling/visual-regression/`, `feature/visual-regression-gate`). Cutting `feature/agentic-ui-study` here would tangle the two. **Recommended: a dedicated worktree** (`/worktree-create feature/agentic-ui-study`, which syncs portal deps + health-checks) so the ticket is isolated and becomes one clean PR. **The worktree setup must also install the gitignored Style Dictionary deps** (`cd tooling/style-dictionary && npm install`) — Phase 1d/Level-3 need them and a fresh worktree won't inherit them. Acceptable alternative: branch in-tree but stage every commit by **explicit path** and never `git add -A` (per the shared-worktree memory note). Confirm before touching branches.

**SG-B — live-run budget + auth sign-off (resolve before Phase 3, after the Phase 2 `--dry` proof).** Phase 3 spends real tokens: **model `claude-sonnet-5`, 3–5 runs × ~maxTurns 30-50, plus any re-runs; estimate low-single-dollars total, ceiling ~$10.** Auth = `portal/.env` `CLAUDE_CODE_OAUTH_TOKEN` OR the machine's Claude CLI login (the Phase 2 `--dry` run proves which works — it is pennies). Get explicit budget OK before spending on Phase 3. **The `--dry` smoke run is the go/no-go for spending** — it proves auth works, all four PIV markers emit, Write→artifact pairs, the fence denies, and the runner's **in-process `validateComposition`** accepts the written file. (It does NOT prove `validate-trace.mjs` acceptance: in `--dry`, cwd = scratch, so the artifact path is scratch-relative and `validate-trace` resolves against the repo root — `validate-trace` acceptance is first provable at the first *real* run into `traces/` in Phase 3. Do not run `validate-trace` on the scratch file.)

---

## COMMIT BOUNDARIES (so a failed gate never leaves a half-shipped mess)

Per-phase atomic commits on the feature branch (the PR is the ticket unit; CLAUDE.md "one commit per phase/ticket"). This gives the gate clean boundaries:

- **C1 (Phase 1)** — `metric-tile` spec + template + CSS + regenerated pack/vocabulary. Independently valuable; safe to land even if the spike later needs tightening.
- **C2 (Phase 2)** — recorder hardening + `record-composition.mjs` + `fieldwork-kpis.mjs` + the passing `--dry` proof. Infra.
- **⛔ GATE (Phase 3)** — if the gate fails after reasonable tightening, STOP with C1+C2 landed and **no thin proposals shipped**; surface to the user.
- **C3 (Phase 3)** — committed proposals + traces + #13 verdict (only after the gate passes).
- **C4 (Phases 4-6)** — study page + module + Fieldwork slots + Work deep link.
- **C5 (Phase 7)** — docs.

---

## CONTEXT REFERENCES

### Files you MUST read before implementing
- `system/agentic-renderer.mjs` (whole) — see **Ground truth**. Add the `metric-tile` template to `TEMPLATES`; never touch the validator for it.
- `system/action-bus.mjs` (whole, 84) — `createBus()` → `{emit, on}`; `type` matches `/^(ui|agent)\.[a-z][a-z-]*$/`; `source ∈ {pointer,keyboard,agent,voice}`. The adjust loop rides `ui.*` reader intents.
- `handoff/verdant/vocabulary.json` (whole) — top-level `composition` rules + `components{}`; gains `metric-tile` after Phase 1. This (or a filtered view) is what the runner prompts the agent with.
- `agent-layer/gen-vocabulary.mjs` + `gen-handoff.mjs` — single-scenario generators; adding `metric-tile.md` folds it in on regen.
- `system/specs/stat-tile.md` + `status-chip.md` (whole) — the enum-locked components (the static finding) + the spec altitude `metric-tile.md` mirrors (```json head, four sections, honesty opener — but phrase `metric-tile` library-generic).
- `.claude/references/kb-format.md` (ComponentSpec §, 13-29) — the head schema + four-section rule.
- `proto/fieldwork.html` (whole, 167) — the slot fills land here (lines 141, 158); see **Ground truth** for the human-fixed regions.
- `system/proto.css` (773-795) — `.proto-slot` (dashed bounded region) + label/note; composed content renders *within* the dashed frame (the bound IS the design).
- `system/components.css` (banner 1452-1459; `.vd-stat-tile` 1577-1612; `.vd-status-chip` fill-inversion 1518-1526) — token-only; add `.ds-metric-tile` mirroring the altitude.
- `scenarios/fieldwork/fixtures/{jobs,technicians,schedule}.json` + `copy.json` (`prototype` block) — the dispatch data + human-authored strings (`screenTitle:"Dispatch board"`, statusLabels, priorityLabels, regionLabels, `slaWarningLabel:"SLA at risk"`, `unassignedHeading:"Needs assignment"`).
- `portal/record-trace.mjs` (whole) — the runner pattern to parallel.
- `portal/lib/trace-recorder.mjs` (whole) — `recordRun`; the meta-redaction gap.
- `portal/lib/redact.mjs` — `redactString`/`redactDeep`/`RULE_NAMES`.
- `portal/lib/env.mjs` — `REPO_DIR`, `HAS_TOKEN`, the `CLAUDE_CODE_OAUTH_TOKEN` + CLI-login fallback.
- `tooling/curate-trace.mjs` (whole) — `curateTrace(rawPath, outPath)`; `CURATED_LABEL`.
- `tooling/validate-trace.mjs` (whole) — the drift guard the composition traces must pass.
- `system/trace-player.mjs` (whole) — `parseTrace` + `renderTracePlayer` (returns `destroy()`) for optional provenance replay.
- `work.html` (whole) · `factory.html` (whole) · `derive.html` (12-21) · `agentic.html` (whole) — page conventions + the deep-link/badge idioms.
- `system/derive.mjs` (1-40) — shipped-module discipline the study module mirrors.
- `docs/epics/ai-first-ux-factory.architecture.md` (23, 51-57, 85-88, 96) + `CLAUDE.md` (§Where new code goes, §Ground rules).

### New files to create
- `system/specs/metric-tile.md` — the generic primitive spec (`contract: null`).
- `portal/record-composition.mjs` — the build-time composition runner (CLI, not deployed).
- `tooling/fieldwork-kpis.mjs` — the committed KPI-truth check (judge tool; never fed to the agent).
- `handoff/verdant/vocabulary.json` — REGENERATED (gains `metric-tile`).
- `proto/compositions/<slug>.json` (one per question, GENERATED by real runs) + `proto/compositions/index.json` (manifest, appended by the runner) + `traces/<slug>.raw.jsonl` + `traces/<slug>.jsonl` pairs — all COMMITTED.
- `agentic-ui-study.html` (deep-linkable exhibit) + `system/agentic-study.mjs` (hand-written canon).

### Documentation to read
- [A2UI (Google)](https://google.github.io/A2A/) + [AG-UI](https://docs.ag-ui.com/) — lineage nuggets only ([HC] 7). The framing already used lives in the intake research `UX_UI_docs/Agentic_ui.txt` (jobs folder).
- `traces/README.md` (whole) — the Trace format contract the runs conform to.
- `.claude/references/frontend-component-best-practices.md` — house UI rules for the study page.

### File-header templates
- `// portal/record-composition.mjs — build-time agentic composition runner (epic #1, ticket #13; folds spike 6). Reuses the hardened recorder (portal/lib/{trace-recorder,redact}.mjs); never hand-write a composition, never hand-feed an example.`
- `// system/agentic-study.mjs — hand-written canon (this repo; not generated). The designed ask → propose → adjust surface over the agentic bridge (#11) (epic #1, ticket #13; architecture §Agentic UI).`
- `// tooling/fieldwork-kpis.mjs — ground-truth dispatch KPIs from the Fieldwork fixtures (epic #1, ticket #13). A JUDGE tool for verifying composition-run numbers; NEVER part of an agent prompt.`

---

## IMPLEMENTATION PLAN

Phases ordered; **Phase 3 is a hard GATE** — Phases 4-6 do not begin until spike 6 passes on the extended vocabulary.

- **Phase 0** — Pre-flight (SG-A), confirm deps, record the static finding.
- **Phase 1** — `metric-tile`: spec → renderer template → token-only CSS → regenerate pack/vocabulary. → **C1**.
- **Phase 2** — recorder hardening + `record-composition.mjs` + `fieldwork-kpis.mjs` + `--dry` proof. → **C2**.
- **Phase 3 ⛔** — spike 6: 3–5 real runs, judged against the rubric + KPI-truth; verdict on #13. → **C3** on pass.
- **Phase 4** — the study page (ask → propose → adjust, refusal shown). 
- **Phase 5** — fill the two Fieldwork slots.
- **Phase 6** — Work deep link + lineage wording. → **C4** (Phases 4-6).
- **Phase 7** — docs + full validation. → **C5**.

---

## STEP-BY-STEP TASKS

### Phase 0 — Pre-flight + static finding
- **IMPLEMENT**: Resolve **SG-A** (recommended: dedicated worktree for `feature/agentic-ui-study`). Confirm deps present (all verified this session: `handoff/verdant/vocabulary.json`, `system/agentic-renderer.mjs`, `system/action-bus.mjs`, `proto/fieldwork.html` two `.proto-slot` regions, `portal/lib/{redact,trace-recorder,env}.mjs`, `portal/node_modules/@anthropic-ai/claude-agent-sdk`) **AND `tooling/style-dictionary/node_modules`** — `gen-handoff.mjs` (Phase 1d) and `build.mjs` (Level-3) shell out to Style Dictionary in a child process (guarded at `record-trace.mjs:185-187`); it is gitignored, so a fresh worktree won't have it. Remedy: `cd tooling/style-dictionary && npm install`. **This is the one item that can hard-block C1.** Draft the spike-6 **static finding** (see NOTES) — the opening of the #13 record.
- **VALIDATE**: `grep -c '"moisture", "light"' system/specs/stat-tile.md` ≥1 · `grep -c '"ok", "due", "overdue"' handoff/verdant/vocabulary.json` ≥1 (the finding is real) · `test -d tooling/style-dictionary/node_modules` (else `npm install` there) · all deps exist · branch/worktree confirmed.
- **SATISFIES**: the honest gate's foundation.

### Phase 1a — CREATE `system/specs/metric-tile.md`
- **IMPLEMENT**: ` ```json ` head: `component:"metric-tile"`, `status:"spec"` (→ `shipped` when CSS lands), `class:"ds-metric-tile"` (D2), `contract:null` (presentational — the agent binds computed values). `props`: `label`{string,required}; `value`{**string**,required} (so the agent passes "12", "5 unassigned", "94%" uniformly — schema v1 requires one of string|number|boolean; string is the uniform choice); `unit`{string,optional}; `tone`{string,optional,`enum:["neutral","warn","critical"]`}. `tokens`: reuse stat-tile's (minus glyph) + accent for tone: `["--color-bg-surface","--color-fg","--color-fg-muted","--color-border","--radius-md","--spacing-sm","--spacing-md","--type-h3","--type-caption","--color-accent","--color-accent-fg"]` (all verified to exist). `states:["neutral","warn","critical"]`. `children:[]`. Four sections, **library-generic** phrasing: *Usage* (a single computed metric: label + value + optional unit + optional emphasis tone; used anywhere a dashboard needs a KPI, e.g. Fieldwork's agentic slots); *States* (the three tones + the colour-not-alone rule); *Data binding* (`contract:null` → binds computed values passed as props, not a stored record — the composing agent computes them from the scenario's data); *Accessibility* (text order label → value → unit; **`tone` is redundant emphasis, not the signal** — the label + value must be self-describing, "12 Overdue" not a bare "12"; tone adds weight/border/fill via `--color-accent`, never hue-as-sole-signal, per D3).
- **PATTERN**: `stat-tile.md` head shape + section altitude; phrase generic, not Verdant.
- **GOTCHA**: `value` type must be string|number|boolean — pick **string**. Every `tokens` entry must exist in `tokens.contract.css` (all listed do). `metric-tile` must NOT reuse `vd-`.
- **VALIDATE**: `node -e "import('./agent-layer/lib.mjs').then(m=>{m.parseComponentSpec('system/specs/metric-tile.md');console.log('spec ok')})"`.

### Phase 1b — ADD the `metric-tile` template to `system/agentic-renderer.mjs`
- **IMPLEMENT**: In `TEMPLATES`, after the six existing (~316): a non-interactive template (no glyph, no bus, like `stat-tile`), text order label → value → unit:
  ```js
  "metric-tile": (props) => el("div", { class: `ds-metric-tile${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-metric-label", text: props.label }),
      el("span", { class: "ds-metric-reading" },
        el("span", { class: "ds-metric-value", text: String(props.value) }),
        props.unit != null ? el("span", { class: "ds-metric-unit", text: props.unit }) : null))),
  ```
  (neutral = base, no modifier class — mirrors `stat-tile` having no state class; warn/critical get `is-warn`/`is-critical`.)
- **GOTCHA**: `el()` only, no `innerHTML`. Do NOT hardcode `metric-tile` in `validateComposition` (data-driven once in the vocabulary).
- **VALIDATE** (after 1d regenerates the vocabulary): `node --input-type=module -e "import('node:fs/promises').then(async({readFile})=>{const{validateComposition}=await import('./system/agentic-renderer.mjs');const v=JSON.parse(await readFile('handoff/verdant/vocabulary.json','utf8'));validateComposition(v,{name:'metric-tile',props:{label:'Overdue',value:'4',tone:'critical'}});console.log('accepts metric-tile');try{validateComposition(v,{name:'metric-tile',props:{label:'x',value:'1',tone:'wat'}});console.log('FAIL - bad tone accepted')}catch(e){console.log('refuses bad tone:',e.message)}})"`.

### Phase 1c — ADD `metric-tile` CSS to `system/components.css`
- **IMPLEMENT**: In the SCENARIO PROTOTYPE COMPONENTS area, a `/* ---------- ds-metric-tile (system/specs/metric-tile.md) ---------- */` block: `.ds-metric-tile` + `.ds-metric-label/-reading/-value/-unit` (mirror `.vd-stat-tile` family, minus glyph) + `.ds-metric-tile.is-warn` (accent border/tint) + `.ds-metric-tile.is-critical` (`--color-accent` fill + `--color-accent-fg` text) — **fill-inversion escalation per D3, colour never the sole signal** (label/value carry the meaning). Add one line to the banner (1452-1459) noting `ds-` = cross-scenario library primitive. Semantic tokens only.
- **PATTERN**: `.vd-status-chip` fill-inversion (1518-1526) for the tone escalation; `.vd-stat-tile` (1577-1612) for the base anatomy.
- **GOTCHA**: token-lint the new block — `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(|[0-9]+px" <block>` finds no colour/size literals (spacing/radius/type via tokens).
- **VALIDATE**: `node agent-layer/gen-token-css.mjs --check` (no drift) + the grep is empty. Flip `metric-tile.md` `status` → `"shipped"`.

### Phase 1d — REGENERATE the pack + vocabulary → **C1**
- **IMPLEMENT**: `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs`; commit the regenerated `handoff/verdant/` + spec + template + CSS as **C1** ([deploy = commit]).
- **VALIDATE**: `node -e "const v=JSON.parse(require('fs').readFileSync('handoff/verdant/vocabulary.json','utf8'));console.log('metric-tile in vocab:', !!v.components['metric-tile'])"` → true; re-run both generators → `git diff --quiet handoff/` clean (determinism).

### Phase 2a — UPDATE `portal/lib/trace-recorder.mjs` (meta redaction, PR #28 gap)
- **IMPLEMENT**: In the meta write (151-158), pass `slug` and `task`(taskSummary) through `redactString` before writing (the one currently un-redacted surface; #13 passes question-derived labels). Minimal change: wrap the two fields; optionally union any hit rule names into `meta.redaction`.
- **GOTCHA**: existing call sites (`record-trace.mjs`) pass const strings that match no rule → existing traces byte-identical. Do NOT re-record `demo-notice`.
- **VALIDATE**: `node --check portal/lib/trace-recorder.mjs` · `node tooling/validate-trace.mjs` (committed traces still ✓).

### Phase 2b — CREATE `tooling/fieldwork-kpis.mjs` (the KPI-truth check)
- **IMPLEMENT**: A standalone zero-dep Node script that reads `scenarios/fieldwork/fixtures/{jobs,technicians,schedule}.json` and prints the ground-truth KPIs a proposal is checked against: overdue count (`status==="overdue"`), unassigned (`techId===null`), open (`completedAt===null`), SLA-at-risk (`open && slaDue <= "2026-07-16"`), on-site / en-route counts, and load per region + per technician. Constants `TODAY="2026-07-14"`, `SLA_SOON="2026-07-16"` (match fieldwork.html). Print a compact table + a machine-readable JSON block.
- **GOTCHA**: **This is a JUDGE tool — its output is NEVER placed in an agent prompt** ([HC] 5). It verifies the agent computed correctly *after* a run; feeding it in would make the numbers hand-fed.
- **VALIDATE**: `node tooling/fieldwork-kpis.mjs` prints `overdue: 4`, `unassigned: 5` (the verified anchors) — if not, the script is wrong, not the fixtures.

### Phase 2c — CREATE `portal/record-composition.mjs` → (part of C2)
- **IMPLEMENT**: A CLI runner parallel to `record-trace.mjs` (NOT deployed). Signature: `node portal/record-composition.mjs "<question>" <slot> [--slug <slug>] [--dry] [--force]`. `slot ∈ {summary-strip, insight-panel}`; slug from `--slug` or slugified question.
  - **PIV system prompt** (mirror `PIV_SYSTEM`): the agent is a UI-composition agent; it may use ONLY the components in the provided vocabulary and the provided Fieldwork fixtures; it answers the question by composing a `{name,props,children}` array that fits the named slot's stated bounds; PIV markers map to plan → gate-against-the-slot-bounds → **implement (Write the composition JSON to `proto/compositions/<slug>.json`)** → validate (`node -e` calling `validateComposition` on the file it wrote). It must NEVER emit raw HTML/CSS.
  - **Prompt construction — literal + transparent** ([HC] 5, 6): build the prompt ONLY from the fetched `handoff/verdant/vocabulary.json` + the fixtures (read via the fence) + the question + the slot bounds. **No inline example composition, no external reference.** Keep this construction fully readable in the committed source — it is the inspectable proof.
  - **Slot bounds** stated in the prompt: `summary-strip` = a horizontal KPI row (a small array of `metric-tile`s, no children, fits one band above the board); `insight-panel` = a vertical column of toned `metric-tile`s answering one analytical question, fits the side region.
  - **Fence** (`makeFence`-style, reuse `SECRET_PATHS`): Read → `handoff/verdant/vocabulary.json` + `scenarios/fieldwork/fixtures/*.json` (+ deny secrets); Write → ONLY `proto/compositions/<slug>.json`; Bash → `node …` only (self-validate); deny everything else. Wire as `canUseTool` (recordRun also installs it as the PreToolUse hook).
  - `recordRun({slug, task, taskSummary, systemPrompt, model:"claude-sonnet-5", maxTurns:40, allowedTools:READONLY, tools:TOOLS, canUseTool:fence, outFile})` → the raw trace + the agent-written composition file (the trace's Write artifact).
  - **After the run**: load the written composition; `validateComposition(vocab, composition)` in-process (belt-and-suspenders — refuse to keep an invalid proposal; invalid → tighten prompt + re-run, never edit). `curateTrace(raw, traces/<slug>.jsonl)`. **Upsert** the run into `proto/compositions/index.json` (`[{slug, question, slot, proposal:"compositions/<slug>.json", trace:"<slug>"}]`, replace-by-slug so re-runs don't duplicate). Print a `✓` summary (question, slot, proposal path, trace path, valid/invalid, denials, cost).
  - `--dry` → scratch dir (cwd=scratch), never `traces/`/`proto/compositions/`; the cheap auth + mechanism proof.
- **IMPORTS**: `recordRun` from `./lib/trace-recorder.mjs`; `validateComposition` from `../system/agentic-renderer.mjs`; `curateTrace` from `../tooling/curate-trace.mjs`; `REPO_DIR` from `./lib/env.mjs`; `node:fs`/`node:path`.
- **GOTCHA**: the composition file IS the trace's `artifact.path`, so `validate-trace.mjs`'s artifact-exists check passes only if the agent actually Wrote it in the implement phase (verify in `--dry`). Do NOT hand-write or repair a composition. `validateComposition` under Node does not scheme-check `photoUrl` — irrelevant (dispatch compositions carry no URLs).
- **VALIDATE**: `node --check portal/record-composition.mjs` · `node portal/record-composition.mjs "What's the operational state of the board?" summary-strip --dry` → a PIV-complete trace (all four phases) + a written composition the runner's **in-process `validateComposition` accepts**, scratch-only, ✓ summary, no writes outside scratch. This proves auth + markers + Write→artifact pairing + fence deny + in-process validation. (Do NOT run `validate-trace.mjs` on the scratch file — its artifact path is scratch-relative; `validate-trace` acceptance is first provable at the first real run in Phase 3.) **This passing + `fieldwork-kpis.mjs` printing the right anchors is the go/no-go for SG-B.** Commit **C2**.

### Phase 3 — RUN SPIKE 6 (the gate) ⛔ verdict on #13
- **PRECONDITION**: SG-B resolved (budget + auth OK; the `--dry` proof passed).
- **IMPLEMENT**: Author **3–5 distinct analytical questions** grounded in the dispatch data, **≥1 per slot**, e.g.:
  - `summary-strip` (canonical, fills the Fieldwork slot): *"What's the operational state of the board right now?"* → a KPI strip (overdue / SLA-at-risk / unassigned / on-site tiles).
  - `insight-panel` (canonical, fills the Fieldwork slot): *"Where is SLA-breach risk concentrated, and is load balanced across technicians?"* → a column of toned `metric-tile`s.
  - plus 1–3 study-only questions for the ask picker (e.g. *"How is today's work distributed across regions?"*).
  For each: `node portal/record-composition.mjs "<question>" <slot>`. **The two canonical proposals fill BOTH the Fieldwork slots AND the study page** — one generation, two consumers.
  - **JUDGE each proposal against this rubric** (record the scores in the verdict):
    1. **Answers the question** — the KPIs chosen are the right ones for that analytical question.
    2. **Numbers are correct** — diff the proposal's values against `node tooling/fieldwork-kpis.mjs`. A wrong number (e.g. "17 overdue" when truth is 4) is a **re-run, never a patch** — no validator catches it; this check is why it exists. Judge the number **under the definition the agent states** (the agent computes from raw fixtures; the KPI script mirrors `fieldwork.html`'s formulas, and some KPIs overlap — e.g. `atRisk` can include `overdue`). Reject only a number that is wrong under its own stated definition, not one defensibly defined differently.
    3. **Fits the slot bounds** — summary-strip = horizontal KPI row; insight-panel = vertical toned column; no overflow.
    4. **Reads honestly** — labels self-describing; tone is redundant emphasis, not the sole signal.
    5. **Passes `validateComposition`** and is a validating PIV trace.
  - **Decision rule** (architecture line 88): all/most defensible → commit proposals + traces (**C3**), proceed to Phase 4. Weak → **tighten committed source** (sharpen the runner's prompt construction, or add composition guidance to `vocabulary.json`'s `composition` block, or add `state-chip` via the Phase-1 pipeline if insight-panel needs categorical chips) and **re-run** — never hand-write, never hand-feed an example ([HC] 4-6). Bound re-runs to ~3 attempts per question before escalating.
  - **Record the verdict on #13** (`gh issue comment 13`): the static finding, the extension made, the questions, the rubric scores (incl. the KPI diff), and what (if anything) was tightened.
- **GOTCHA**: this is the credibility core. If after reasonable tightening the compositions still aren't defensible, **STOP** (C1+C2 landed, no proposals shipped) and surface it — the "one system" claim would be weaker than assumed. Commit only proposals that passed judgment.
- **VALIDATE**: `node tooling/validate-trace.mjs` → every committed composition trace ✓ (four phases, real-run label, on-disk artifact) and `demo-notice` still ✓. Each committed proposal passes `validateComposition`. Verdict exists: `gh issue view 13 --comments | grep -ci spike` ≥1.

### Phase 4 — CREATE `system/agentic-study.mjs` + `agentic-ui-study.html`
- **IMPLEMENT `system/agentic-study.mjs`** (hand-written canon, DOM-free top level, boundary throws naming the input, header citing #13):
  - `export function renderStudy(container, { vocab, entries, bus })` where `entries` = the manifest with each `proposal` already fetched/attached. Returns `destroy()`.
  - **ask**: a question picker over `entries`.
  - **propose**: on pick, `renderComposition(vocab, currentComposition, bus)` into a slot-shaped preview; show the raw `{name,props,children}` JSON beside it (declarative-in → components-out); optional "replay the real run" control → `renderTracePlayer` the committed trace (provenance).
  - **adjust — the reader mutates a WORKING COPY** (deep clone of the picked proposal; never the committed file). Bounded controls (toggle a tile's `tone` among valid enum, remove/reorder tiles, switch between proposals) → each routes the mutated composition through `validateComposition` → re-render. **Refusal is a PRIMARY designed affordance, not an edge case** (it IS the exhibit's thesis — see below): include a deliberate **boundary-probe** control — e.g. a tone selector that offers one out-of-vocabulary option (`"urgent — not in vocabulary"`) — that lets the reader reach past the bounds; `validateComposition` throws and the study shows the **exact path-naming message** (`composition[i].props.tone: "urgent" is not in enum [neutral | warn | critical]`) in a refusal display. Managed freedom, shown: normal controls always render; the probe always refuses.
  - Adjustments ride the bus (`ui.*` reader intents); the renderer stays passive (the #11 seam). No `agent.*` replay (D-cut). No fetch inside the module (the page fetches).
  - **Re-render hygiene**: clear the preview mount (drop prior DOM/listeners) before every re-render so bus/DOM listeners don't stack (mirror `trace-player.mjs`'s `destroy()` discipline).
- **IMPLEMENT `agentic-ui-study.html`** (deep-linkable exhibit, route `/agentic-ui-study`): header comment (cites #13; "the designed surface `agentic.html` deferred to"); `noindex`; CSS stack contract→neutral→components→**portfolio.css** + a scoped inline `<style>` for the study chrome; the scenario **fictional notice** ([HC] 1); a **capability indicator** stating exactly: proposals precomputed from real build-time runs (curated), adjustment + rendering live in-browser, no live model call ([HC] 3) — render it from rendering reality like `agentic.html`'s `.cap-live`/`.cap-css`. Inline `<script type="module">`: `fetch("/proto/compositions/index.json")` → fetch each entry's `proposal` (+ optionally `trace`) → `fetch("/handoff/verdant/vocabulary.json")` → `createBus()` → `renderStudy(container, {vocab, entries, bus})`. Footer chrome scripts (client.neutral.config.js, site.js, portfolio.js, analytics.mjs) as a designed page. **Protocol lineage nuggets** (A2UI/AG-UI) as small inline citations, lineage wording only ([HC] 7). **The bridge argument is shown, not told** — no pedagogy callout; the refusal behaviour is the argument.
- **GOTCHA**: no live LLM (hard); every proposal is a committed file; DOM-built, never `innerHTML` from data; absolute paths; render the static parts (error card) if a proposal fetch fails.
- **VALIDATE**: `node --check system/agentic-study.mjs` · `npx serve .` → `/agentic-ui-study`: pick each question → its proposal renders; bounded adjusts mutate + re-render; the **boundary-probe** surfaces a path-naming refusal; capability + fictional notice truthful; (optional) the run replays in the trace player.

### Phase 5 — UPDATE `proto/fieldwork.html` (fill the two slots)
- **IMPLEMENT**: In the module `<script>`, add imports `createBus` (`/system/action-bus.mjs`) + `renderComposition` (`/system/agentic-renderer.mjs`); `fetch("/handoff/verdant/vocabulary.json")` + the two canonical proposals (`/proto/compositions/<summary-strip-slug>.json`, `/proto/compositions/<insight-panel-slug>.json`). After `board.innerHTML` is set, for each slot `querySelector('[data-slot="summary-strip"|"insight-panel"]')`, replace the placeholder note with the rendered composition (keep the `.proto-slot` dashed frame + label — the bound IS the design), and update the label/note from "planned; not running yet" to the honest live register (e.g. *"Agentic slot — a precomputed proposal from the agentic-UI study renders here; adjustable on the study page"*). **The two proposals are the same canonical files the study page uses.**
- **GOTCHA**: the human-fixed regions (toolbar, Attention, lanes, Needs-assignment) stay UNTOUCHED. Composed content must fit within the bounded region (no board overflow). On any fetch failure, **leave the existing honest placeholder** (`slot()` output) — never a broken region. The label must not imply a live model runs ([HC] 3).
- **VALIDATE**: `npx serve .` → `/proto/fieldwork.html`: both slots render their composed content within bounds; human-fixed regions unchanged; labels honest; degrades to the placeholder if a fetch fails (test by temporarily renaming a proposal).

### Phase 6 — UPDATE `work.html` + finalize lineage → **C4**
- **IMPLEMENT**: Add the missing `.card-foot` to Exhibit 02 (53-64): `<div class="card-foot"><a href="/agentic-ui-study">The study →</a></div>` (mirror cards 1 & 3). Change the badge from `<span class="capability">Planned</span>` to `<span class="capability live">Runs now</span>` (consistent with the substrate card — the surface runs live even though the model does not). Final-check every A2UI/AG-UI citation on the study page for lineage wording ([HC] 7). Commit Phases 4-6 as **C4**.
- **VALIDATE**: `npx serve .` → `/work.html` Exhibit 02 links to `/agentic-ui-study`, badge accurate · `grep -i "A2UI\|AG-UI" agentic-ui-study.html` → citations present, lineage-framed.

### Phase 7 — Docs, validation → **C5**
- **IMPLEMENT**: `CLAUDE.md` architecture-map lines (the study page + `agentic-study.mjs`; `record-composition.mjs`; `fieldwork-kpis.mjs`; `metric-tile` in the library; the committed proposals/traces). If the extension warrants it, a one-line settled-record in the architecture doc (mirror the slot-bounds/CI-gates entries). Run the full ladder. Commit docs as **C5**. Open a PR `Closes #13` (the report fills the body).
- **VALIDATE**: all levels below green; `git status` shows only the expected files (stage by explicit path — shared tree).

---

## TESTING STRATEGY

No suite/linter/type-check (ground rule). "Done" = run the surface + the honesty read.

### Unit (Node)
- `metric-tile` spec parses (`parseComponentSpec`); vocabulary regenerates deterministically; `validateComposition` accepts a valid `metric-tile` and refuses a bad `tone`.
- `node tooling/fieldwork-kpis.mjs` prints overdue=4, unassigned=5 (the verified anchors).
- `node portal/record-composition.mjs "…" summary-strip --dry` — one real cheap smoke run: PIV-complete trace + a written, validated composition, scratch-only.
- Every committed proposal passes `validateComposition`; every committed trace passes `validate-trace.mjs`.

### Integration
- Full `agent-layer/build.mjs` run — `metric-tile` coexists in the pack/vocabulary.
- `agentic-ui-study.html` end to end (fetch → render → adjust → refuse) under `npx serve .`.
- `proto/fieldwork.html` slots render within bounds; both fetch states (success + forced failure).

### Edge cases
- Boundary-probe adjust → refused with a path-naming message (the thesis, shown).
- Proposal fetch failure → error card / honest placeholder, never a blank/broken surface.
- `metric-tile` with `tone` omitted → renders neutral (base); bad `tone` → refused.
- A run that produces an invalid composition → the runner refuses to keep it (re-run, never edit).
- A composition trace missing a PIV phase → `validate-trace.mjs` fails (tighten prompt, re-run).

### Honesty read (mandatory — credibility-risk ticket)
- Read every committed proposal + trace + the study copy end-to-end: nothing implies a live view-time model; proposals labeled precomputed/curated; fictional scenario labeled; no composition hand-written; A2UI/AG-UI are lineage.
- **Prompt-discipline audit** ([HC] 5-6): read `record-composition.mjs`'s source — the prompt is built ONLY from vocabulary + fixtures + question/slot-bounds; NO inline example, no external reference. (The trace meta doesn't capture the full prompt, so the runner source is the inspectable proof.)
- **Numbers audit**: each proposal's values match `tooling/fieldwork-kpis.mjs`.

---

## VALIDATION COMMANDS

### Level 1: Syntax
```bash
node --check system/agentic-study.mjs && node --check portal/record-composition.mjs && node --check portal/lib/trace-recorder.mjs && node --check system/agentic-renderer.mjs && node --check tooling/fieldwork-kpis.mjs && echo SYNTAX-OK
```
### Level 2: Unit
```bash
node -e "import('./agent-layer/lib.mjs').then(m=>{m.parseComponentSpec('system/specs/metric-tile.md');console.log('spec ok')})"
node agent-layer/gen-vocabulary.mjs
node --input-type=module -e "import('node:fs/promises').then(async({readFile})=>{const{validateComposition}=await import('./system/agentic-renderer.mjs');const v=JSON.parse(await readFile('handoff/verdant/vocabulary.json','utf8'));validateComposition(v,{name:'metric-tile',props:{label:'Overdue',value:'4',tone:'critical'}});console.log('metric-tile OK')})"
node tooling/fieldwork-kpis.mjs        # overdue: 4 · unassigned: 5
node portal/record-composition.mjs "What's the operational state of the board?" summary-strip --dry
```
### Level 3: Integration
```bash
node tooling/validate-trace.mjs         # every committed composition trace ✓, demo-notice still ✓
node agent-layer/gen-token-css.mjs --check
cd "../Linards jobs folder" && node "../ux-factory/agent-layer/build.mjs" _factory/kb/decisions/<any-ledger>.md
```
### Level 4: Manual (browser)
```bash
npx serve .   # /agentic-ui-study + /proto/fieldwork.html + /work.html
```
Checklist: pick each question → proposal renders · bounded adjust mutates + re-renders · boundary-probe refused with a path message · capability + fictional notice truthful · fieldwork slots render within bounds, human-fixed regions unchanged, degrade on fetch fail · work.html Exhibit 02 deep-links to `/agentic-ui-study`.
### Level 5: Optional
- agent-browser: screenshot the study + fieldwork slots; assert the boundary-probe surfaces a refusal message.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — Committed proposal sets from **real build-time agent runs**, prompted only with the vocabulary + Fieldwork data (never hand-written, never hand-fed an example); each passes `validateComposition`; each run is a validating PIV trace; each proposal's numbers match `fieldwork-kpis.mjs`.
- [ ] AC #2 — Study page: reader picks a question → sees proposed compositions → adjusts live via renderer + action bus; **an out-of-vocabulary adjust is visibly refused** with a path-naming message (a primary designed affordance).
- [ ] AC #3 — Fieldwork slots (`summary-strip` + `insight-panel`) render agentic compositions within their bounds; human-fixed regions untouched; degrade honestly on fetch failure.
- [ ] AC #4 — Protocol lineage cited nugget-style (A2UI / AG-UI) — pattern-compatible wording, never dependence.
- [ ] AC #5 — The bridge argument is legible (shown, not told): the design system from Exhibit 1 is what makes agentic UI safe in Exhibit 2 — demonstrated by the refusal behaviour, no pedagogy callout.
- [ ] Spike 6 folded, gated, verdict recorded on #13 (static finding → extension → real runs → rubric judgment incl. the KPI diff).
- [ ] Honesty contract held (all seven surfaces).
- [ ] No new shipped dependencies; shipped surfaces vanilla; regenerated pack + proposals + traces committed; conventions matched (headers, error voice, token discipline).
- [ ] No regressions: full `build.mjs` + `validate-trace.mjs` + token drift-check green; `agentic.html`, `proto/fieldwork.html`, `demo-notice` traces still work.

## COMPLETION CHECKLIST

- [ ] SG-A (branch/worktree) + SG-B (budget/auth) resolved at their gates.
- [ ] Phase 3 gate passed on the extended vocabulary BEFORE any Phase 4+ work; verdict on #13.
- [ ] Commit boundaries C1–C5 held; a failed gate would leave C1+C2 landed, no thin proposals.
- [ ] Every task's VALIDATE run immediately; each committed proposal + trace validates; numbers match the KPI truth.
- [ ] Nothing hand-written/hand-fed that is presented as agent output (end-to-end honesty read).
- [ ] `CLAUDE.md` (+ architecture doc if warranted) updated, surgical.
- [ ] Branch `feature/agentic-ui-study`; PR `Closes #13`; staged by explicit path.

---

## NOTES (open canvas)

### The static finding (spike-6 opening — proven from the specs, no agent run)
The shared vocabulary's data-bearing components are enum-locked to Verdant and `validateComposition` strictly enforces enums (agentic-renderer.mjs:63-77): `stat-tile.kind ∈ {moisture, light}`, `status-chip.value ∈ {ok, due, overdue}`; `plant-card`/`care-task-row` are plant/care-specific; `screen-header`/`primary-button` carry no dashboard data. So an agent prompted with this vocabulary over Fieldwork dispatch data **cannot** compose a defensible dashboard — every attempt is refused (enum violation) or a category error (a "moisture" tile on a dispatch board). Running real runs against *this* vocabulary is a null experiment; the honest structure is: record this finding → make the minimal extension → run spike 6 against the **extended** vocabulary as the genuine gate.

### Why extend the shared library rather than tweak the Verdant components
Overloading `stat-tile.kind` with Fieldwork values would break the Verdant spec's honesty and muddy a shipped component. A new **generic** primitive both scenarios could use is the stronger design-system statement — the library composes across domains, which IS the "two exhibits, one system" claim. Same spec→vocabulary→renderer→token pipeline, so the safety-by-construction argument holds unchanged.

### The composition run is itself a PIV trace (the two-roles thesis, reinforced)
plan → gate-against-slot-bounds → implement-by-writing-the-composition → validate-via-`validateComposition` makes each run a real, replayable, phase-tagged governed run — the same shape the platform presents as its method. The study can replay it in the trace player as provenance — the strongest answer to "did you hand-write this?". Reuses the entire #5/#25 pipeline for free.

### The KPI-truth check is the one verification nothing else does
`validateComposition` checks structure, not truth — a tile reading "17 overdue" when the fixtures say 4 passes every existing gate. `tooling/fieldwork-kpis.mjs` recomputes the ground truth; the judge diffs each proposal against it; its output goes into the #13 verdict so the truth-check is itself inspectable. A wrong number is a re-run, never a patch. It is a judge tool only — never in an agent prompt.

### Cross-ticket interaction with #14 (Wave 2 sibling)
#13 adds `metric-tile` to `system/specs/` and regenerates `handoff/verdant/`. If #14 (handoff-pack viewer) has landed, its viewer displays the new library component too (additive). If #13 lands first, #14 picks it up on regen. No conflict either way; note it in whichever PR lands second.

### Line-budget sanity
`metric-tile` spec+template+CSS ~120 · runner ~200 · KPI script ~50 · study module ~300 · study page ~250 · fieldwork slot fills ~80 · work/docs ~40 · proposals + traces = generated. ~1040 hand-written + generated — above the original 800-1400 estimate's midpoint because the fold absorbed the library extension (the user's deliberate choice; the alternative was a split precursor ticket).

## AMENDMENTS
<!-- Append-only after first approval/execution. Newest at the bottom. -->

- **2026-07-18 (plan revision, pre-execution):** Lifted 6→9.5 after verifying the codebase. Changes: (1) promoted the 7 open questions to committed **Decisions** (D1-D7); (2) folded a **Ground truth** section correcting the prior draft — no warn/critical tokens (→ tone via fill-inversion on `--color-accent`, D3), fixtures' real KPIs (overdue=4, unassigned=5, not the draft's "12"), `parseComponentSpec` takes a path, spec head is ```json, `ds-` is a new prefix, auth has a CLI-login fallback; (3) resolved the **refusal-demo design gap** — the boundary-probe is now a *primary* designed affordance (the exhibit's thesis), not an edge case; (4) added `tooling/fieldwork-kpis.mjs`, the committed **numbers-truth check** (the one verification no validator does), fed to the judge, never to the agent; (5) added two explicit **STOP-gates** (branch/worktree; live-run budget+auth) and **commit boundaries C1-C5** so a failed gate leaves clean infra and no thin proposals; (6) collapsed the repeated honesty restatements into one canonical **[HC]** box (adding the "never hand-feed an example" and "tighten = committed source" surfaces explicitly); (7) cut the `agent.*` bus-replay path (Simplicity First). Nothing implemented yet.
