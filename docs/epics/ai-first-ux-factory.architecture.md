# Architecture — ux-factory platform: the AI-first UX engineering portfolio

Intent: [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md)

## Problem & goals

Hiring managers and panels must be able to *verify* senior UX-engineering skill, not trust claims: the platform performs a design-to-handoff pipeline in front of them — bounded-live intake → generated design system → data-connected hi-fi prototype → engineer-ready handoff pack — with real agent work visibly replayed. Every decision below is judged against that lens, under the PRD's hard constraints: vanilla shipped pages, solo + agents, agents at build time only, zero per-visit infrastructure cost.

## Approaches considered

| | Approach | Trade-off | Verdict |
| --- | --- | --- | --- |
| A | **Precomputed variant theater** — all outputs pre-generated; browser swaps finished variants | Bulletproof, cheapest; but "generation" is a slideshow and reactivity caps at ~3 axes before combinatorics explode | Fallback if the derivation spike fails |
| B | **Deterministic engine on stage + replayed traces** — vanilla-JS token-derivation engine runs live (real color/type/space math); AI story carried by replayed real agent runs | Real generation, nothing can fail on stage, all constraints held; needs a palette-quality spike | **Chosen** |
| C | **Per-company bespoke builds as the product** — factory regenerates a static site per application; minimal reader interactivity | Closest to the original factory vision, but contradicts the PRD's live+reactive intake decision | Folded in as a post-MVP layer on top of B (token packs make it nearly free) |

## Recommended approach

**B.** The shipped site stays vanilla HTML/CSS + hand-written ES modules (no framework, no bundler, no build step). The "factory" is authoring-time tooling: Node ESM generators (extending the existing `agent-layer/` pattern) plus Claude Agent SDK runs whose traces are recorded and shipped as replayable artifacts. At view time, a deterministic **derivation engine** turns intake answers into a design system live in the browser — brand color → OKLCH-derived accessible palette with WCAG checks shown passing; density → type + spacing scales; Hooked reward type → component patterns; frequency → the ethics-gate verdict. Two fictional scenarios (Verdant, Fieldwork) are switchable and deliberately rule differently at the frequency filter — the method being honest, demonstrated.

**Where it plugs in (brownfield):** the token contract/pack/components trio is the generation target (one-line re-skin is the live moment); `agent-layer/` generators extend to emit the handoff pack; portal V1 stays a local authoring workbench (its Agent SDK dependency becomes the trace recorder); `_headers`/static hosting carry over to Cloudflare Pages.

**Two exhibits, one system.** The Factory stays the flagship — the *human-in-the-loop* design cycle. A second exhibit, an **agentic-UI study on data-heavy dashboards** (first item under Work, deep-linkable), reuses the same component library, tokens, and Fieldwork's data: an agent composes dashboard views from a machine-readable component vocabulary via a declarative JSON contract (`name` / `props` / `children`), and the reader runs the loop **ask → propose → adjust**. Inside the Factory, Fieldwork's prototype is a **hybrid canvas** — human-designed chrome with designated agentic slots — and hands deeper exploration to the study. The bridge *is* the argument: the design system built in Exhibit 1 is what makes agentic UI safe in Exhibit 2, and the engineer's role moves up a level — designing the vocabulary, the slot bounds, and the review controls.

## Key decisions

### Stack & libraries
- **Shipped pages:** vanilla HTML/CSS + hand-written ES modules served as-is. *(Alternatives — any framework, bundlers: rejected by standing no-go.)*
- **Color/contrast math: hand-written** (OKLCH conversion, WCAG contrast) — the math *is* part of the demonstration; zero runtime deps. *(Alternative: culori — use only if the spike shows hand-rolled OKLCH quality issues.)*
- **Factory tooling:** Node ESM, zero-dep where possible, extending `agent-layer/`. **Claude Agent SDK** (already a portal dependency) for build-time agent runs + trace recording.
- **Style Dictionary** for multi-target token output (css/ios/android) — **in MVP** per PRD-holder call. *(Alternative: hand-rolled transforms — pointless; SD is the industry tool and naming it is part of the story.)*
- **Hosting:** Cloudflare Pages (static) + **one Cloudflare Worker** as the real mock-API endpoint, with static JSON fixtures as the never-fails fallback + local-dev path. **Cloudflare Web Analytics** (cookieless) with one custom event: "factory driven."
- **Authoring skills:** composable shapes from `mattpocock/skills` run inside the factory's agent sessions — *grilling* + *wizard* (intake interviews), *writing-fragments → beats → shape* (scenario/case-study copy), *to-questionnaire* (facts only a human holds), *prototype* / design-it-twice (variant design calls); *teach* transplants as the shipped legibility discipline, never run literally. Cited as lineage (same register as A2UI/AG-UI). Scope boundary per `__UX_UI_Research.md` §9: application-creating shapes only — the library's tool-internals engineering stays out. They nest inside the PIV loop governing each build ticket: PIV is the skeleton, the shapes are its named moves.

### Data model (shape level; all files in-repo, no database)
- **`tokens.source.json` (DTCG, W3C format) becomes the single source of truth** — inverting today's flow. Generators emit the CSS contract + packs from it; the "GENERATED MIRROR from saulera-client-starter" header is retired — **canon lives in this repo** (mono-repo, site + factory + content together).
- **Derivation rules** — the engine's ruleset (palette ramps, scale ratios, pattern selection), a versioned artifact readers can inspect.
- **Scenario package** (×2: Verdant, Fieldwork) — brief, intake defaults, copy, prototype config, JSON fixtures. Adding a scenario = adding content, not engine work.
- **ComponentSpec** (usage, states, token dependencies) + **DataContract** (JSON Schema; a generated TypeScript view may be added later as a convenience). **Format (decided 2026-07-17):** ComponentSpec reuses the kb record convention — one markdown file per component with a leading JSON head (the machine layer the vocabulary generator reads) and `##` prose sections (the human layer the handoff pack ships), the head referencing its DataContract. DataContract stays a standalone JSON Schema `.json` file — validators, `$ref` tooling, and the WC spike (3) consume it directly. Why one file: the two audiences can't drift apart, the parser family already exists (`agent-layer/lib.mjs` · `portal/lib/kb.mjs`), and the spec file itself is inspectable proof that the same source drives the human docs and the agent vocabulary. **UI surface (same date):** the handoff-pack viewer must make this legible at a glance — render the spec's machine head and prose sections side by side as one document, with the vocabulary entry generated from it linked in place, so an engineer sees *one source → engineer docs + agent vocabulary* structurally. Per the legibility discipline (PRD §6), shown not told: no callout announcing it.
- **Trace** — JSONL of real agent-run steps, each step paired with the artifact it produced and tagged with its PIV phase (`plan | gate | implement | validate`); player renders stepped annotated cards grouped into acts, not a log.
- **Ledger** (existing per-company markdown) — unchanged, drives the post-MVP per-company layer.

### Boundaries & contracts
- **Secrets:** Figma personal access token lives only in local authoring `.env` (portal's existing pattern); nothing secret ever ships client-side or gets committed.
- **Worker API:** public, read-only GET, fixture-backed, no user data — the site must degrade to static fixtures if it's down.
- **Figma boundary:** handoff pack ships the DTCG file + documented import path (Tokens Studio / native import); a build-time **REST read script** demonstrates Figma↔code parity and is **emphasized in the UI as a built, switch-on capability** — with the honesty constraint governing exactly how its status is labeled (see spike 1: the Variables REST API is Enterprise-gated; styles API is not).
- **Honesty is a hard constraint** with three named surfaces: fictional scenarios visibly labeled; traces labeled "real run, curated for length"; capability indicators state exactly what runs vs. what's plan-gated.
- **Components handoff:** canonical form = copy-paste HTML/CSS patterns reading only tokens; **2–3 Web Component wrappers included as the tech-agnostic proof**; declared trajectory = every component as a standalone element (spike 3 owns the "how does this land for platform engineers" story).
- Shipped pages currently carry `noindex` — kept for now; revisit at launch (open question).

### Agentic UI (the second exhibit)
- **Component vocabulary** — a new `agent-layer/` output generated from ComponentSpec + DataContract: component names, prop schemas, composition rules, usage guidance. One file makes the design system consumable by a third party — agents — and doubles as the handoff pack's "agent-ready" layer.
- **Declarative renderer** — a small vanilla ES module interpreting `{name, props, children}` against the known library only. The agent never emits raw HTML/CSS (open-ended generative UI is a named non-goal) — brand consistency and safety hold **by construction**, the same managed-freedom argument as the token contract.
- **Action bus** — renderer interactions ride one standardized bidirectional event contract (agent→UI, UI→agent), so click, keyboard, agent — and voice later — are interchangeable input modalities, not separate integrations.
- **Fieldwork hybrid canvas** — the Factory's Fieldwork prototype mixes human-designed regions with bounded agentic slots on one screen; the study page runs the full **ask → propose → adjust** loop (proposals are precomputed compositions per the replayed-agents constraint; adjustment and rendering are live).
- **Protocol naming: cite as lineage** — "the shape A2UI standardizes," "what AG-UI calls human-in-the-loop interaction models." Pattern-compatible in vanilla JS, never claiming protocol dependence (honesty constraint governs wording; CopilotKit et al. are React runtimes we deliberately don't run).
- **Voice: pre-wired, post-MVP, strong-case bar** — the action bus is voice-ready by design; the voice layer itself (browser-native Web Speech API, bounded commands, feature-detected, graceful absence) ships only attached to a user-grounded case — Fieldwork's hands-busy technician context is the candidate — never as a novelty layer.

### Other eng-lead calls
- **Deploy = commit the artifacts.** Generators run at authoring time; generated CSS/JSON/traces are committed and Pages serves the repo as-is. The repo itself remains inspectable proof for technical readers.
- **Verification gates (added 2026-07-17) — the "drift-proof" claim, demonstrated rather than stated.** Three small CI checks; no Storybook/Chromatic (the vanilla constraint holds): **(1) generator drift-check** — re-run the generators in CI, fail on divergence from the committed artifacts; **(2) token lint** — every token `components.css` references is declared in `tokens.contract.css`, no orphan contract tokens, DTCG source schema-valid; **(3) visual regression** — Playwright screenshots of the shipped pages under the neutral pack + one client pack, pixel-diffed against committed baselines. Each gate is itself portfolio evidence for technical readers. Wire them once the DTCG inversion lands (they check its outputs).
- **IA:** Home (engineered as the 90-second recruiter gate: outcome headline + three proof shortcuts) · Approach (copy exists) · **Factory** (flagship demo page, deep-linkable) · Work · Contact.
- **Per-company bespoke builds:** post-MVP layer; architecture keeps it cheap by construction (packs + ledger).

## Missing pieces
Derivation engine (color/type/space + WCAG checker) · DTCG→CSS generator (inverts `gen-tokens`) · CI verification gates (generator drift-check · token lint · visual-regression snapshots) · Style Dictionary config + multi-target outputs in the pack · trace recorder (Agent SDK hooks) + trace player · Factory page (five-station pipeline UI + scenario toggle) · public intake UI (bounded axes) · handoff-pack viewer + download (renders ComponentSpec head + prose as one document, vocabulary entry linked in place) · Worker endpoint + fixtures · two scenario packages · Home/gate page · 2–3 WC wrappers · Figma export docs + REST read script · analytics event wiring · component vocabulary generator · declarative renderer + action bus · agentic-UI study page (ask → propose → adjust) · build-time composition runs + proposal sets · Fieldwork hybrid-canvas slots.

## Spikes & experiments

1. **Figma REST access gate** *(critical path — the emphasized claim depends on it)*
   Question: can this account read Variables via REST, or only Styles?
   Spike: hit `GET /v1/files/:key/variables/local` and `/styles` with a personal token on a test file — ~1h.
   Decision rule: variables readable → variables parity demo; else styles-based parity + label variables path "Enterprise-gated" (honesty constraint decides the wording, not marketing).
2. **Palette derivation quality**
   Question: can rules alone derive a full accessible palette from arbitrary brand colors?
   Spike: run the engine over ~5 diverse brand colors; auto-check WCAG AA across all token pairs — ~1 day.
   Decision rule: ≥95% pairs pass unaided → full live derivation; else scope live derivation to color only, presets for the rest (Screen-1 fallback).
3. **Web Component handoff DX** *(owns the open "translate to platform engineers" question)*
   Spike: wrap card + one list component as custom elements consuming DataContract-shaped JSON; exercise them in a plain page and a React sandbox — ~1 day.
   Decision rule: clean props/slots/theming story → declare the WC trajectory in the pack; else keep HTML/CSS canonical and present WC as roadmap.
4. **Style Dictionary ↔ DTCG compatibility**
   Spike: feed `tokens.source.json` through SD to css/ios/android — ~0.5 day. Decision rule: clean transforms → in MVP as decided; painful → emit web now, note others as generated-on-request.
5. **Trace recording quality**
   Spike: record one real generation run via SDK hooks; assess signal-to-noise and curation effort — ~0.5 day. Decision rule: curated trace reads as engineering → ship pattern; else re-run with tighter agent prompts (never hand-write the trace).
6. **Agent composition quality** *(gates the agentic study's credibility)*
   Question: prompted only with the vocabulary + Fieldwork data, does an agent produce dashboard compositions a senior designer would defend?
   Spike: 3–5 build-time composition runs over distinct analytical questions, reviewed against the slot bounds — ~0.5 day.
   Decision rule: defensible → ship as proposals; weak → tighten vocabulary/composition rules and re-run (never hand-write a "composition" — same rule as traces).

## Open questions
- [ ] `noindex` at launch — portfolio-by-link only, or indexable? (Decide when first application ships.)
- [x] CI drift-verify for committed artifacts — settled 2026-07-17: expanded to three verification gates (generator drift-check · token lint · visual regression) under "Other eng-lead calls"; wired after the DTCG inversion lands.
- [ ] Scenario content depth — how many prototype screens per scenario prove the claim without bloating scope? (Product call during build.)
- [ ] Intake question final cut (PRD open item) — resolves during Factory-page design.
- [ ] When the per-company layer lands: ledger → scenario-package unification?
- [ ] Agentic-slot boundaries in the Fieldwork canvas — which regions are agent-composed vs. human-fixed. (Design call during build.)
- [ ] Voice command set + the strong-case write-up (hands-busy technician context) — drafted when the post-MVP voice layer is scheduled.

---
*Decisions made interactively with the PRD holder, 2026-07-16 — five decision screens plus an agentic-UI/voice round grounded in `UX_UI_docs/` research (A2UI / AG-UI declarative generative UI, voice interaction patterns, UXE role definitions). Next: slice into tickets (`piv-slice-epic`) or run spikes 1–2 first.*
