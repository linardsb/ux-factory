# __TODO — ai-first-ux-factory: spikes & build phases

Consolidated from [docs/epics/ai-first-ux-factory.prd.md](docs/epics/ai-first-ux-factory.prd.md) (intent) and
[docs/epics/ai-first-ux-factory.architecture.md](docs/epics/ai-first-ux-factory.architecture.md) (decisions).
Working sequence doc — ticket slicing happens later via `piv-slice-epic`. Order is dependency-driven;
phases 1–4 can partially run in parallel once Phase 0 lands.

**Scope-hammer levers if the circuit-breaker trips (in order):** drop the *adjust* step of the HITL loop
(fall back to ask → propose) → cut precomputed proposal count → cut Style Dictionary iOS/Android targets.

---

## Parallelization map

**Spikes: all six are mutually independent — run them in parallel.** If sequencing is forced, S1 + S2 first (they gate the most downstream work).

**Wave 0 — start immediately, everything parallel:**
- All spikes S1–S6.
- 0.1 (retire mirror header) · 0.2 (author DTCG source).
- Zero-code-dependency content: 2.1 + 2.2 scenario writing · 5.2 intake question cut · 7.2 Approach page (copy + components already exist) · 7.4 Contact.
- Authoring-skills track A1–A3 — jobs-folder work, zero epic dependency; pays off on live applications immediately.
- 8.1 first Pages deploy — the site is already static; deploy early, then every wave ships continuously.

**Wave 1 — after 0.2 lands, four tracks run in parallel:**
- **Track A · System:** 0.3 → 0.4 · 0.5 *(S4)* · then 3.1 → 3.5 → 3.2 → 3.3 · 3.6 anytime · 3.7 *(S1)* and 3.4 *(S3)* parallel to the rest of the track.
- **Track B · Engine:** 1.1 → 1.2 *(S2)* · 1.3 ∥ 1.4 ∥ 1.5 (independent of each other) · then 1.6 · 1.7 waits on Track A's 0.3.
- **Track C · Data:** 2.4 → 2.5 (fixtures come from 2.1/2.2) · 2.3 alongside.
- **Track D · Agents:** 4.1 *(S5)* ∥ 4.4 (player builds against the trace format, not real traces).

**Wave 2 — integration, tracks converge (still substantial parallelism):**
- 4.2 → 4.3 — recording real runs needs Tracks A+B generators doing real work.
- 4.5 *(S6)* — needs 3.5 (vocabulary) + 2.2 (Fieldwork data).
- 6.1 → 6.2 — needs 3.5's vocabulary shape; then 6.3 (needs 4.5's proposals) · 6.4 is content, parallel.
- 5.1 ∥ 5.3 — UI shells can start on stubs during Wave 1 · 5.4 (needs 2.5 + Track A) · 5.7 (needs 1.5).
- ⚠ **Cross-exhibit dependency: 5.5 (hybrid canvas) waits on 6.1 (declarative renderer)** — the one place Exhibit 1 depends on Exhibit 2.
- 5.6 closes Phase 5 · 6.5 after 5.5 + 6.3.

**Wave 3 — assembly & ship, mostly sequential:**
- 7.1 (home's proof shortcuts need both exhibits live) → 7.3 → 7.5 (voice-contract pass over all copy — always last).
- 8.2 / 8.3 as their inputs land · 8.4 → then 8.5 + 8.6 at launch.

**Solo + agents note:** waves map directly to agent fan-out — one worktree per track in Wave 1 (`worktree-create`), merge via integration branch (`worktree-merge`) before Wave 2.

---

## Spikes (run before or alongside Phase 0 — each has a decision rule in the architecture doc)

- [ ] **S1 · Figma REST access gate** (~1h, critical path) — can this account read Variables via REST, or only Styles? → decides the parity demo's shape + the capability-indicator wording.
- [ ] **S2 · Palette derivation quality** (~1 day, critical path) — full accessible palette from ~5 diverse brand colors, auto-checked WCAG AA. ≥95% pairs pass → full live derivation; else color-only live, presets for the rest.
- [ ] **S3 · Web Component handoff DX** (~1 day) — wrap card + one list component as custom elements consuming DataContract-shaped JSON; try in plain page + React sandbox. Owns the "how does this land for platform engineers" question.
- [ ] **S4 · Style Dictionary ↔ DTCG compatibility** (~0.5 day) — `tokens.source.json` → css/ios/android transforms.
- [ ] **S5 · Trace recording quality** (~0.5 day) — one real Agent SDK run through hooks; curated trace must read as engineering (never hand-write).
- [ ] **S6 · Agent composition quality** (~0.5 day) — 3–5 composition runs from vocabulary + Fieldwork data; weak output → tighten vocabulary, never hand-write a composition.

---

## Authoring skills (parallel track — jobs folder, zero epic dependency)

The composable shapes from `mattpocock/skills` that carry the creation-time loop (`__UX_UI_Research.md` §9–10).
Today only grill-me + teach are installed (user-level); nothing in the pipeline invokes them.

- [ ] A1 Install *wizard* · *writing-fragments/beats/shape* · *to-questionnaire* · *prototype* into the jobs folder's `.claude/skills/`.
- [ ] A2 Rewrite pipeline Step 1 (Intake) to run *grilling* + *wizard* — one decision at a time, answers proposed from the JD + cached DS pages.
- [ ] A3 Wire *to-questionnaire* beside the facts-checker: a missing human-held fact becomes questions to send, never an invention.

---

## Phase 0 — Foundation: token canon moves to this repo

- [ ] 0.1 Retire the "GENERATED MIRROR" header — this repo becomes canon (mono-repo decision).
- [ ] 0.2 Author `tokens.source.json` (W3C DTCG) from the existing contract — the inversion.
- [ ] 0.3 DTCG→CSS generator: emit `tokens.contract.css` + packs from source.
- [ ] 0.4 Parity check: generated CSS ≡ current CSS (visual check on `index.html`, neutral + saulera packs).
- [ ] 0.5 Style Dictionary config + multi-target outputs (css / ios / android). *(gated by S4)*

## Phase 1 — Derivation engine (the live-generation core, vanilla ES modules)

- [ ] 1.1 OKLCH color math + WCAG contrast checker module. *(gated by S2)*
- [ ] 1.2 Palette derivation rules: brand color → full accessible palette, checks shown passing.
- [ ] 1.3 Type + spacing scale derivation (density axis).
- [ ] 1.4 Reward-type (tribe/hunt/self) → component-pattern selection rules.
- [ ] 1.5 Frequency answer → ethics/frequency-gate verdict logic.
- [ ] 1.6 Derivation-rules artifact — versioned, reader-inspectable.
- [ ] 1.7 Live re-skin moment: engine output wired to the one-line pack swap.

## Phase 2 — Scenarios & data

- [ ] 2.1 **Verdant** scenario package: brief, intake defaults, copy, fixtures, prototype config. *(copy written via fragments → beats → shape — A1)*
- [ ] 2.2 **Fieldwork** scenario package: same + heavy-ops dataset (feeds the agentic study). *(copy written via fragments → beats → shape — A1)*
- [ ] 2.3 Fictional labeling on both (honesty surface 1 of 3).
- [ ] 2.4 JSON Schema data contracts for both scenarios.
- [ ] 2.5 Cloudflare Worker mock-API endpoint + static-fixture fallback (site must degrade gracefully).

## Phase 3 — Component & handoff layer (the lego bricks)

- [ ] 3.1 ComponentSpec format + specs for every component the prototypes use.
- [ ] 3.2 Handoff-pack generator: spec + data contract + DTCG tokens + multi-target outputs.
- [ ] 3.3 Handoff-pack viewer + download surface.
- [ ] 3.4 2–3 Web Component wrappers — the tech-agnostic proof. *(gated by S3)*
- [ ] 3.5 **Component vocabulary generator** — the agent-ready layer (extends `agent-layer/`; names, prop schemas, composition rules, usage guidance).
- [ ] 3.6 Figma export path: DTCG file + documented import route (Tokens Studio / native).
- [ ] 3.7 Figma REST parity-read script + capability-indicator UI ("built, switch-on") — wording per honesty constraint (surface 3 of 3). *(gated by S1)*

## Phase 4 — AI agents & traces

- [ ] 4.1 Trace recorder via Agent SDK hooks (extends portal V1) — steps phase-tagged `plan | gate | implement | validate`. *(gated by S5)*
- [ ] 4.2 Real generation runs recorded at build time (the factory's actual work).
- [ ] 4.3 Trace curation workflow + "real run, curated for length" labeling (honesty surface 2 of 3).
- [ ] 4.4 Trace player: stepped annotated cards grouped into PIV acts (plan → gate → implement → validate), each reasoning step paired with the artifact it produced; annotation register per the *teach* discipline (§10 — invisible pedagogy).
- [ ] 4.5 Agent composition runs for the study — Fieldwork proposal sets per analytical question. *(gated by S6)*

## Phase 5 — The Factory page (Exhibit 1: human-in-the-loop cycle)

- [ ] 5.1 Public intake UI — bounded live axes: brand color, density, reward type, frequency. Wizard interaction model: each asked question carries a recommended default + its reasoning; overrides within bounds; defaulted questions are silently-accepted proposals.
- [ ] 5.2 Intake question set final cut (3–5 asked, rest defaulted) — closes the PRD's last open question; draft v1 lives in the PRD.
- [ ] 5.3 Pipeline-stations UI (intake → system → prototype → handoff) + scenario toggle — every station check-terminated (ends in a visible validation moment); station copy follows the *teach* discipline.
- [ ] 5.4 Verdant data-connected prototype screen (components render from the mock API).
- [ ] 5.5 Fieldwork **hybrid canvas**: human-designed chrome + bounded agentic slots (slot boundaries = design call, open question in architecture doc).
- [ ] 5.6 Staged worked example integrated with the live moments (engine + re-skin).
- [ ] 5.7 The one guess-then-reveal moment: Manipulation Matrix run out loud (ethics verdict; compare-notes register, no grading).

## Phase 6 — Agentic-UI study (Exhibit 2: data-heavy dashboards)

- [ ] 6.1 Declarative renderer — vanilla module interpreting `{name, props, children}` against the known library only.
- [ ] 6.2 **Action bus** — bidirectional event contract (agent→UI, UI→agent); voice-ready by design.
- [ ] 6.3 Ask → propose → adjust loop UI (proposals precomputed, adjustment + rendering live).
- [ ] 6.4 Study narrative + protocol-lineage nuggets (A2UI / AG-UI cited nugget-style, voice-contract register).
- [ ] 6.5 Cross-links both ways: Fieldwork's agentic slots ↔ the study page.

## Phase 7 — Site assembly & pages

- [ ] 7.1 Home = the 90-second recruiter gate: outcome headline + three proof shortcuts (watch a trace · inspect the pack · drive the factory).
- [ ] 7.2 Approach page build — copy is final in `__Approach_page.md`, components mapped there.
- [ ] 7.3 Work section — agentic-UI study as flagship item.
- [ ] 7.4 Contact + closing CTA band.
- [ ] 7.5 Voice-contract pass over all copy (phenomenon first · gloss as appositive · first-person testimony · pull never push · compare notes · close every loop · write up, let others overhear).

## Phase 8 — Ship & measure

- [ ] 8.1 Cloudflare Pages deploy — committed artifacts, no CI build step (repo stays inspectable proof).
- [ ] 8.2 CF Web Analytics (cookieless) + one custom event: "factory driven."
- [ ] 8.3 Agent-layer regeneration: llms.txt, JSON-LD, decisions.json, component vocabulary.
- [ ] 8.4 Accessibility + performance pass (a11y defaults in the contract; check LCP/INP; reduced-motion on the trace player).
- [ ] 8.5 Application log set up — the hypothesis instrument: RIGHT = ≥1 artifact-driven interview in first ~10 apps (~8 wks); WRONG = silence after 10, or invites with the artifact never mentioned. Review at the 10-app/8-week mark.
- [ ] 8.6 `noindex` decision at launch (currently on; portfolio-by-link vs. indexable).

---

## Post-MVP layers (decided, not scheduled)

- [ ] **Voice input layer** — drops into the action bus; ships **only with a strong user-grounded case** (candidate: Fieldwork's hands-busy technician context + accessibility). Needs: command set + case write-up first. Web Speech API, feature-detected, graceful absence.
- [ ] Figma plugin push (write tokens into Figma variables on any plan).
- [ ] Interactive Storybook-style component library.
- [ ] Demonstrated handoff consumer — an "engineer"/agent visibly connecting data on stage.
- [ ] Per-company bespoke builds (ledger-driven re-skins per application; ledger ↔ scenario-package unification question).
- [ ] Additional demo scenarios.
- [ ] Recruiter gate as a designed surface beyond the home page.
- [ ] CI drift-verify: re-run generators in CI, fail on divergence from committed artifacts.

## Carried open questions (named, not hidden)

- [ ] Agentic-slot boundaries in the Fieldwork canvas (design call, Phase 5.5).
- [ ] Intake question final cut (Phase 5.2).
- [ ] Scenario content depth — how many prototype screens prove the claim without bloat.
- [ ] `noindex` at launch (Phase 8.6).
- [ ] Voice command set + strong-case write-up (post-MVP gate).
