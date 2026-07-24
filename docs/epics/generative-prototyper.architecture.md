# Architecture — Build-time generative prototyper

Intent: [generative-prototyper.prd.md](./generative-prototyper.prd.md) · GitHub epic [#86](https://github.com/linardsb/ux-factory/issues/86)
Status: architecture decided (2026-07-23) · sequenced after #73 · complementary to epic [#70](https://github.com/linardsb/ux-factory/issues/70)

## Problem & goals

Turn the portfolio's "build" step into a proactive application weapon: ingest a real employer's **design tokens + screenshots + brief** and, at **build time**, produce a working, **adjustable** prototype of *their* product — so Linards applies *with it already built*. Every decision below is judged against one lens: **does this let one bespoke prototype get built per serious application, fast and honest enough to send, without touching the hard no-view-time-LLM constraint?**

## Approaches considered

Three ways to make a prototype "theirs":

- **A — Recompose in the shared vocabulary (+ bounded, spec-first extension).** Agent composes views over the existing 8-primitive vocabulary, re-skinned to their derived pack, driven by fixtures compiled from their brief. Where a primitive is missing, add it spec-first + token-only (the #13 `metric-tile` precedent). *Honesty-maximal, no new engine.* Limitation: only expresses dashboard/data-tool-shaped products, and even those lean on a thin generic set (`stat-tile`, `metric-tile`, `status-chip`, `screen-header`, `primary-button`) — `plant-card`/`care-task-row` are Verdant-locked. A poor-fit employer reads as generic.
- **B — Screenshot → bespoke components (a new build-time vision engine).** `probe-vision` extracts layout + components; a build-time agent run generates employer-specific component specs and composes them into their screens. *Highest fidelity — looks like their product.* A genuinely new build-time engine and a larger one-way door.
- **C — Pack re-skin only.** Their pack over the existing proto, no re-composition. Cheapest, but this is essentially what #43/#44 already do — it doesn't deliver "a prototype of *their* workflow," so it fails the intent.

**Chosen: B as the target ceiling, A as the honest floor — a fidelity ladder (owner call, 2026-07-23).** C is rejected (doesn't meet intent). B amends the PRD's soft "no new engines" non-goal deliberately; it does **not** touch the hard constraint (build-time only, readers replay). The two are not exclusive — A is the conservative, honesty-maximal floor every build can fall back to; B is the higher-fidelity path the owner wants to reach.

## Recommended approach

A **fidelity ladder** feeding the existing per-company deploy pipeline. Screenshots + tokens + brief enter; a self-contained, unlisted, adjustable instance comes out — the same `build-instance.mjs` output shape as #43/#44, with a new bespoke-prototype step in the middle.

```
employer sources (manual, MVP):  tokens · 1–2 screenshots · brief
        │
        ├─ pack derivation ───────────────────────────────►  tokens.<slug>.css   (probe-vision → derive; deterministic)
        │
        └─ bespoke prototype step  ── two regimes, one openly-labeled output ──►  composed view(s)
              FLOOR   pure fixture-driven composition over the (extensible) vocabulary
                      → reuses record-composition's "no example" contract untouched
              CEILING screenshots as an openly-labeled vision reference → bespoke component specs + views
                      → a DIFFERENT, honest claim: "built at build-time from your screenshots"
        │
        ▼
   build-instance.mjs  (extended)  →  self-contained deploy dir  →  unlisted + noindex instance
        │                                     └─ instance.html prototype slot renders the composed view
        ▼                                        via agentic-renderer; reader adjusts via action-bus (no view-time LLM)
   PRINTS the wrangler deploy command  (deploy stays a human step)
```

**Where it plugs in / what it reuses (brownfield):**
- **Sources → pack:** `tooling/round-trip/probe-vision.mjs` (screenshots→description, vision proven viable) + `system/derive.mjs` (tokens/brand → accessible pack + WCAG). Reused as-is.
- **Brief → scenario package:** `agent-layer/gen-company-package.mjs` (deterministic brief→`scenarios/<slug>/`). Extended only if the brief must carry richer fixtures/screens for the bespoke step.
- **Composition (FLOOR):** `portal/record-composition.mjs`, **parameterized** from Fieldwork-hardwired to take `{scenario package, vocabulary, questions, slot bounds}` — reusing the whole record→curate→validate honesty pipeline and its Read-fence.
- **Composition (CEILING):** a distinct, distinctly-labeled vision-referenced path (screenshots allowed into the prompt) — the one genuinely-new engine. Must *not* share the pure-composition honesty label.
- **Render + adjust:** `system/agentic-renderer.mjs` (vocabulary-validated `{name,props,children}` → real components, refuses everything else) + `system/action-bus.mjs` (bidirectional `ui.*`/`agent.*` contract). Reused; "adjustable" = pre-wired actions, no LLM.
- **Assemble + deploy:** `agent-layer/build-instance.mjs` + the #43 `instance.html` shell + `system/instance.mjs` config seam. Extended with the bespoke-prototype step; unchanged privacy posture (unconditional noindex, `--out` must be outside the repo, human-triggered deploy).

## Key decisions

- **Stack & libraries.** No new runtime deps. Build-time: Node ESM + the portal's sole dependency `@anthropic-ai/claude-agent-sdk` (already used by `record-composition`/`probe-vision`). View-time: vanilla, no framework, no view-time LLM — unchanged. *Alternative considered:* a dedicated vision/codegen library for the ceiling engine — rejected, the Agent SDK already returns usable image blocks (probe-vision proved it) and adding a dep breaks the zero-dep-where-possible rule.
- **Data model (shape).** Unchanged core entities: a **company brief** (parsed by `lib.mjs`) → a **scenario package** (`scenarios/<slug>/`: axes + fixtures + copy + optional published-tokens CSS) → a **pack** (`tokens.<slug>.css`) → **composed views** (`{name,props,children}` JSON, one per screen/question) → a **PIV trace** pair → the **instance shell config** (`window.INSTANCE_CONFIG`). The ceiling engine adds **bespoke component specs** (spec-first `system/specs/`-shaped records) as a new per-employer artifact. Real-provenance artifacts never live in the repo (existing inode+device privacy guard).
- **Boundaries & contracts.**
  - *Privacy (hard):* real employer content compiles to a jobs-folder/out-of-repo target only; the `insideRepo` guard in `gen-company-package`/`build-instance` refuses any in-repo real build; instances ship unconditional `X-Robots-Tag: noindex`; deploy is a printed command, never automated.
  - *Honesty (hard):* two regimes, never blurred (see PRD §8). The floor reuses `record-composition`'s Read-fence + "no example" claim verbatim. The ceiling's prompt *does* include screenshots and MUST carry its own visible "vision-driven, built-time" label; a ceiling artifact may never be presented as a pure-composition run.
  - *Access:* MVP is link-only + noindex (accepted). True gated access = deferred open question.
  - *Secrets:* auth via `portal/.env` `CLAUDE_CODE_OAUTH_TOKEN` or the Mac CLI login (as probe-vision/record-composition already do). Never client-side, never committed.
- **Other — the vocabulary tension (the load-bearing call).** The floor path is bounded by an 8-primitive, partly Verdant-locked vocabulary; the ceiling path escapes that bound by generating bespoke components, at the cost of a new engine + a second honesty regime. The ladder exists precisely so each employer can be built at the *lowest* fidelity tier that still reads as "theirs" — floor when the vocabulary fits, ceiling when it doesn't. Per-employer tier choice stays a build-time judgment, not a fixed global setting.

## Missing pieces

1. **Parameterized composition runner** — generalize `record-composition.mjs` inputs (scenario/vocabulary/questions/bounds) without weakening its fence. *(Floor)*
2. **The ceiling engine** — screenshots → bespoke component specs → composed views, with its own honesty label and its own validation (a composed view must still pass `agentic-renderer`'s vocabulary/refusal check against the *extended* vocabulary). *(Ceiling — the genuinely-new work.)*
3. **`build-instance.mjs` bespoke step** — insert composition between pack derivation and shell assembly; wire the composed views into the `instance.html` prototype slot + `instance.mjs` config.
4. **Brief format extension (maybe)** — whether the company-brief record must carry per-screen fixtures/questions for the bespoke step, or whether those are separate inputs. **RESOLVED (#88): a separate input.** The runner reads a new optional per-scenario file `scenarios/<slug>/compose.json` — it does NOT extend `brief.md`'s parsed head or `proto.config.json`'s consumed shape (both have fixed-shape parsers that new keys would trip; the scenario validator ignores unknown top-level files). See the resolved shape under §Open questions.
5. **Reader-adjustability wiring** — which pre-wired `ui.*`→`agent.*` actions the instance exposes (pack swap exists via the dock; view-level adjust needs explicit action mappings).

## Spikes & experiments

**Spike 1 — the floor, end to end (do this first).**
```
Question:      Can a parameterized record-composition run produce a view that reads as ONE fictional
               employer's product — and how much vocabulary extension did that one employer need?
Spike:         Point the (parameterized) runner at one fictional dashboard-shaped scenario + the shared
               vocabulary, end to end into an instance slot. Timebox ~½ day.
Decision rule: Compelling with ≤ a small, bounded spec-first extension → productize the floor.
               Needs heavy per-employer vocabulary work → the addressable set is narrower than hoped
               (feeds PRD WRONG-condition #3, build cost) → lean harder on the ceiling, or narrow scope.
```

**Spike 1 — RESULT (#88, 2026-07-24): PRODUCTIZE THE FLOOR (gated to dashboard-shaped employers, + one bounded generic primitive).**
Ran the parameterized runner against `northwind` (fictional wholesale-stock dashboard, 22 SKUs) over the
shared vocabulary — two questions (`summary-strip` + `insight-panel`), both **real, honesty-clean runs**
(plan→gate→implement→validate, 0 null-phase, `validateComposition` + `validate-trace` green). Evidence:
- **Vocabulary-extension count = 0.** Both views were expressed with `metric-tile` alone (the generic `ds-`
  primitive). The floor needed no new component to answer KPI/insight questions for a second, unrelated employer.
- **Content fidelity: high.** All 9 tile figures were computed correctly from the raw fixture (hand-verified
  against a post-hoc judge): oversold 3, low 5, at-risk 8 of 22, oversold shortfall 195 units, deepest single
  shortfall 85 units (correctly named the SKU), most-exposed warehouse East (2 oversold). The agent *selected*
  those metrics itself — the `compose.json` computeRules named none of them (honesty firewall held).
- **Form fidelity: generic.** Rendered through the real components + tokens, it reads as a competent KPI band —
  the same `metric-tile` grid any dashboard scenario produces. What would make it read as *their* stock product
  is a per-SKU list/row (the 22 real SKUs with on-hand/committed/status); the vocabulary has no generic list-row
  (`plant-card`/`care-task-row` are Verdant-enum-locked).

**Verdict:** the floor is cheap (0 extension, pipeline reused unchanged, ~$1 in real runs) and content-accurate,
so **productize it for the MVP — gated to well-fit dashboard/data-tool employers.** The single bounded, generic,
spec-first addition that lifts form fidelity from "generic KPI band" to "reads as their product" is **one `ds-`
list-row primitive** (label + a few columns + an optional `status-chip`) — squarely the "≤ small bounded
extension → productize" branch, NOT "heavy per-employer vocab → lean ceiling." The list-row is **recorded as the
next spec-first addition, not built in #88** (keeps the spike a spike). The **ceiling (#90)** is reserved for
employers whose product is *not* dashboard-shaped, where even a list-row won't carry the fidelity. This
**unblocks #89** (wire the floor into the instance) for dashboard-shaped first employers.

**Spike 2 — the ceiling, honesty + fidelity (only if the floor's fidelity is too generic).**
```
Question:      Does a vision-referenced run produce a bespoke view that reads as THEIR product at a
               sustainable build cost — and can it be labeled honestly without contaminating the pure
               composition contract used elsewhere?
Spike:         One fictional employer, screenshots fed as an openly-labeled reference → bespoke component
               specs → composed view. Eyeball fidelity; confirm the label/output separation holds.
Decision rule: Convincing + cleanly separable label → ceiling is viable, use it where the floor is generic.
               Half-hand-fed feel or unsustainable per-build cost → cap fidelity at the floor for the MVP.
```

**MVP scoping note (from the spikes):** pick the *first real* employer to test the **bet**, not the machinery — a well-fitting, dashboard/data-tool-shaped product so the floor carries most of it and vocabulary/vision risk stays low. Prove "does bespoke break through" before stressing the ceiling engine.

## Open questions

- [ ] **Success target** — normal-application reply-rate baseline + the bespoke target against it (settle after first sends). *(from PRD)*
- [ ] **Access control** — link-only+noindex long-term, or gated access for real employer material? Logged in `per-company-brief.architecture.md`. *(from PRD)*
- [ ] **Ceiling vs. floor per employer** — settled per-build by the spikes' decision rules; no fixed global default.
- [x] **Brief format extension** — RESOLVED (#88): a **separate input**, not a brief/proto.config extension. A new optional `scenarios/<slug>/compose.json` co-locates the whole floor contract with the package it configures, ignored by the scenario validator, parsed only by the runner. Shape: `{ subject (names the domain in the prompt), today (fixed fictional date), fixtures: [{name, hint}] (rebuilds the Read fence + the numbered file list), copy (true|false|hint-string → include copy.json in the fence), slots: {<slot>: <bound string>}, computeRules (DEFINITIONS ONLY — the firewall: never names which tiles answer a question), questions: [{slug, slot, question}] }`. Both `fieldwork` and `northwind` carry one, so the runner has no scenario branch; `fieldwork`'s restates its prior baked-in semantics verbatim (proven by a byte-level prompt-fidelity diff on the domain block). (Missing piece #4.)
- [ ] **Ceiling validation** — how a bespoke-generated component spec is validated/refused (extend `agentic-renderer`'s vocabulary check, or a separate spec gate?).
- [ ] **Public teaser** — is the bounded deterministic teaser (derive, colour-only) in v1 scope after the MVP holds, or a later slice? *(from PRD)*
