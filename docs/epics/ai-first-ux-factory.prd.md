# PRD — ux-factory platform: the AI-first UX engineering portfolio

**One-line vision:** UX engineering for an AI-first world, demonstrated — agents visibly turn a product brief into a design system, prototype, and handoff spec: the tooling a UX team would actually want to use.

**Persona spec:** built *as if* the Senior UX Engineer described in Google's JD built it (prototypes that define product experiences · tools that accelerate UX teams · bridge design and engineering · AI fluency for an AI-first world). The JD is a character sheet, not a target application — the platform serves applications broadly.

---

## 1. Problem Statement

Hiring managers and interview panels evaluating **senior UX Engineer / Design Engineer** candidates cannot verify the skill that defines the role — engineering handoff-ready, systematized UI — from what candidates send today. Static portfolios and Figma decks show *renders of claims*: they prove a candidate can draw a component, not that they can engineer one an engineering team could stack into a codebase without additional work.

The cost of not solving it, from both sides of the desk:
- **For the evaluator:** interview time is spent re-verifying claims instead of testing judgment; strong-looking candidates fail technical deep-dives; verification is guesswork.
- **For the candidate (Linards):** the differentiating half of his skill set — shaping, behaviour design with an ethics gate, evidence discipline, and token-contract systems engineering — is exactly the half a static portfolio cannot prove. Claims read as claims.

## 2. Evidence

| Signal | Status |
| --- | --- |
| Senior UXE portfolios are expected to demonstrate hi-fi components that hand over to engineering "without additional code — lego bricks that stack into the main codebase" (professional convention among practitioners). | **Assumption — validate** via feedback from the first ~3 applications and, where possible, 2–3 hiring-manager conversations. |
| The Google Senior UXE JD screens explicitly for: prototypes that define product experiences, "build tools to accelerate UX teams," bridging design/engineering, and AI fluency ("architecting the tools and frameworks… for an AI-first world"). | **Evidence** — primary text, quoted from the JD. |
| The seven screening criteria for design-engineer roles (front-end craft, design-system fluency, interaction craft, a11y, performance, product sense, collaboration) — and the observation that candidates prove 1–5 and hand-wave 6–7. | **Internal analysis** — `__UX_UI_Research.md` §1. |
| The substrate exists and works: token-contract architecture with one-line re-skin, Wright (token-only page assembly), agent-layer generators, portal V1 (intake, card library, embedded previews). | **Evidence** — committed working code in this repo (git history; commits `1066716`…`019ec55`). |
| Amazon's "UX Design Technologist" role sits between **design systems, front-end architecture, and AI-assisted tooling**, screening for "generative workflows and agentic systems" over programming languages; Google's UXE roles split the same hybrid way. | **Evidence** — role-market research, `UX_UI_docs/UXE & UX Technologist.txt`. |
| Declarative generative UI is standardizing (Google's A2UI spec; the AG-UI interaction protocol): agents compose interfaces from a developer-owned component library via a JSON contract — precisely what a token-bound design system enables. | **Evidence** — emerging-tech research, `UX_UI_docs/Agentic_ui.txt`; grounds the agentic-UI exhibit. |

## 3. Thesis — why build it

**Why this:** the only portfolio that can *prove* senior UX-engineering judgment is one where the proof is inspectable and running. The platform doesn't describe a design-to-handoff workflow — it performs one in front of the reader: intake → generated design system → data-connected hi-fi prototype → engineer-ready handoff pack, with the AI agents' work visible. The method performing itself is the argument (`__UX_UI_Research.md` §9), now led by the AI-first framing the market screens for.

**Why now:** roles are being redefined around AI fluency (the JD's own language); the substrate (token contract, Wright, portal V1) already exists, so the marginal cycle buys a demonstration few candidates can match; and there is a hiring window to use it in — broadly, not for one req.

**Why they switch:** hiring managers don't lack portfolios to look at — they lack ones they can *verify*. Against the coping baseline (Figma decks, case-study sites, GitHub links that require archaeology), this artifact answers the evaluation question directly: *watch the pipeline run, inspect the handoff pack, judge for yourself.* Verification beats persuasion.

## 4. Hypothesis

> **We believe** a visitable, working factory — a bounded-live stakeholder intake that steers a generated design system, a data-connected high-fidelity prototype, and an engineer-ready handoff pack, with the agents' work visibly replayed —
> **will cause** hiring managers and interview panels for senior UXE/Design-Engineer roles
> **to advance Linards to interview and bring the artifact into the conversation,**
> **resulting in** interviews where the method is already credible before he enters the room.
>
> **We'll know we're RIGHT if:** ≥1 interview invite where the platform is explicitly referenced or is clearly the differentiator, within the first ~10 applications (~8 weeks of applying).
>
> **We'll know we're WRONG if:** 0 invites after ~10 quality applications (~8 weeks) — the artifact isn't moving the screen stage — **or** invites arrive but the artifact is never mentioned: the interviews would have happened anyway and the build effort was misallocated.

## 5. Target User & JTBD

**Primary user:** the hiring manager for a senior UXE/Design-Engineer role, and the interview panel behind them. Context: evaluating an application, or preparing for a panel. Trigger: "can this person actually do the hybrid job, or just talk about it?"

**JTBD:** *When I'm evaluating a senior UXE candidate, I want to verify they can engineer handoff-ready systems — not take case studies on faith — so I can advance someone I'm confident will bridge design and engineering.*

**Secondary audiences (served, not designed for):** recruiters get a skimmable gate layer; the story must survive a forward to someone who wasn't in the conversation ("safe to champion").

**Non-users:** reviewers who evaluate visuals only and won't engage with engineering substance — the proof layer is not aimed at them. The portfolio is a **visit-once utility** (Layer B's frequency filter): no habit mechanics, no return-visit optimization.

## 6. MVP — one thin pipeline run, end to end

The thinnest line that proves the hypothesis: **a fictional product brief travels the entire pipeline in front of the reader** — Verdant end to end; Fieldwork reruns it with a different ethics verdict and a hybrid prototype that feeds the agentic-UI study (6). Thin at every stage; no stage skipped.

1. **Intake (live + reactive, bounded).** The reader answers a short stakeholder questionnaire about the fictional product — drawn from the Hooked workbook and classic discovery questions (draft set below). Their answers visibly steer the output within designed bounds. **Interaction model: guided wizard** — one decision at a time, each asked question carrying a recommended default *and its reasoning*, the reader overriding within bounds (defaulted questions are proposals accepted silently). The reader experiences the same guided-decision shape the factory's own authoring skills run at intake (`__UX_UI_Research.md` §9) — the method performing itself, reader-side.
2. **Design-system generation (hybrid liveness).** A staged worked example shows the full generation process; **one genuinely live moment** — the one-line re-skin / token swap the architecture already makes cheap — runs for real in the reader's browser.
3. **High-fidelity prototypes (data-connected).** Verdant: a hand-crafted prototype screen whose components render from a real (mock-API) data source — the lego-brick claim demonstrated, not asserted. Fieldwork: a **hybrid canvas** — human-designed chrome with designated agentic slots (see 6).
4. **Handoff pack.** Component usage spec + typed props + data contract for that screen — realistic enough that an engineer reading it could wire real data today.
5. **Agents visible.** The AI agents' generation work is **performed at build time and replayed** as visible reasoning traces — zero per-visit cost, nothing can fail on stage while a hiring manager watches. Traces are structured as PIV acts — *plan → gate → implement → validate* — so a replayed run reads as governed engineering with visible review gates and passing checks, not a stream of tool calls.

6. **Agentic-UI study (flagship Work item).** The second exhibit: on Fieldwork's heavy-ops data, an agent composes dashboard views from the *same* component library via a declarative contract; the reader runs **ask → propose → adjust** — proposals precomputed, adjustment live. Human-in-the-loop by construction: the engineer designs the vocabulary, the slot bounds, and the review controls. Protocol lineage (A2UI, AG-UI) cited nugget-style.

**Legibility layer (cross-cutting, in MVP).** Every stage teaches as it demonstrates: small educational nuggets woven into the build story, so the reader absorbs what good UX/product engineering looks like *while watching this product get made* — never in a separate lesson. Hard subtlety bar: no callouts, badges, or anything that announces pedagogy — the moment teaching is visible as a feature it has failed; success reads as unusual clarity ("I understood every decision on this site"). Discipline specified in `__UX_UI_Research.md` §10 (the *teach* transplant); this is the surface that *performs* hiring criterion #7 (communication) instead of claiming it.

**Layers explicitly deferred past MVP** (they extend the proof, they don't establish it): Figma plugin push (the REST parity read + DTCG export land in MVP) · interactive Storybook-style library · a demonstrated handoff consumer (an "engineer"/agent connecting data on stage) · additional demo scenarios · the recruiter gate as a designed surface beyond the home page · the **voice input layer** (pre-wired via the action bus; ships only with a strong user-grounded case — Fieldwork's hands-busy technician context is the candidate).

**Doors noted for the spec:** the replayed-agents choice and the vanilla-page constraint are one-way-ish doors (retrofitting live LLM calls or a framework later is expensive) — the spec should treat both as load-bearing. The fictional-brief content, intake question set, and handoff-pack format are two-way doors — just build them.

### Intake question set — draft v1 (product content, to refine)

| Stage | Question (asked of the stakeholder about *their* product) | Source |
| --- | --- | --- |
| Discovery | What problem are users solving with your product? | Hooked Ex 1.3 / classic |
| Discovery | How do they solve it today, and why does that need replacing? | Hooked Ex 1.4 / classic |
| Discovery | Who exactly is the user — can you name a real person who needs this? | Hooked Ex 2.1 |
| Behaviour | What's the one behavior you want to become routine? How often would it realistically occur? | Hooked Ex 1.5–1.6 (frequency filter) |
| Behaviour | 5 Whys: what emotion or moment actually cues that behavior? | Hooked Ex 2.3 |
| Friction | From trigger to payoff, how many steps? Which of time / money / effort / confusion / social deviance / novelty limits users most? | Hooked Ex 3.1–3.2 |
| Success | What early signal would prove it's working, and what slower outcome sits behind it? | Layer C (leading/lagging) |
| Ethics gate | Does it materially improve users' lives — and would you use it yourself? (Placed on the Manipulation Matrix, out loud.) | Hooked Ex 6 |

The reader's answers parameterize the generated output (bounded); the ethics gate doubles as the platform's one guess-then-reveal interactive moment, run on itself per the voice contract.

## 7. Success Metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Artifact-driven interview (primary) | ≥1 within first ~10 applications (~8 wks) | Application log + interview notes: invite where platform is referenced or clearly the differentiator |
| Panel references it unprompted | Observed in interviews reached | Post-interview notes |
| Forwarded internally | ≥1 observed instance (recruiter/manager shares it beyond first reader) | Referral trail / correspondence |
| Guardrail (WRONG trigger) | 0 invites after ~10 apps, or invites with artifact never mentioned | Same application log — reviewed at the 10-app / 8-week mark |

## 8. Non-goals

- **Not a SaaS product** — no accounts, no multi-tenancy, no paying users; it's a portfolio artifact with product-grade craft.
- **No live LLM calls at view time** — agents work at build time; readers replay and steer within bounds.
- **No Figma-like canvas** — an in-browser design surface is a different product.
- **No real-company demo subject** — the featured brief is fictional (clearly labeled); no reimagining of an employer's product.
- **No habit mechanics on the portfolio itself** — visit-once utility by its own frequency filter.
- **Not optimized for the 90-second recruiter scan** — recruiters get a gate, not the product.
- **No framework/build step for shipped pages** — visitor-facing pages stay vanilla HTML/CSS (hard constraint); factory tooling behind them is unrestricted.
- **Not multi-design-tool in v1** — Figma is the named integration target; tool-agnostic ambitions are recorded as an open question for the spec.
- **No open-ended generative UI** — the agent never emits raw HTML/CSS; composition is declarative, from the known component vocabulary only. Safety and brand consistency by construction.
- **No third-party agent-UI runtime** — the declarative pattern is implemented in vanilla JS and cited as lineage (A2UI/AG-UI); no CopilotKit/React runtime on shipped pages.

**Hard constraints:** vanilla shipped pages · solo build + AI agents (no other human contributors) · the **honesty contract** — promoted to hard during architecture: fictional scenarios labeled, traces labeled "real run, curated," capability indicators state exactly what runs vs. what's gated.

## 9. Open Questions

- [x] **Figma API token sync scope** — settled: DTCG export/import path + build-time REST parity read, emphasized in UI as a built capability; Variables-vs-Styles access gated by architecture spike 1.
- [x] **Tool-agnostic prototyping** — settled: DTCG JSON as token source of truth + Style Dictionary multi-target (in MVP) + Web Component proof with declared trajectory (architecture spike 3).
- [x] **"Rapid-prototyping functionality"** — settled: live deterministic derivation engine (brand color → palette, density → type/space, reward type → patterns, frequency → ethics verdict) across two switchable scenarios.
- [x] **The fictional product** — settled: **Verdant** (plant care, primary) + **Fieldwork** (B2B service scheduling) as a scenario toggle — deliberately ruling differently at the frequency filter.
- [ ] **Intake question set final cut** — draft v1 above; needs a pass for length (readers won't answer 8 questions — likely 3–5 with the rest defaulted). Resolves during Factory-page design.
- [x] **Measurement mechanics** — settled: application-log discipline primary + Cloudflare Web Analytics (cookieless) with one "factory driven" event to diagnose the WRONG condition.
- [x] **Honesty contract status** — settled: promoted to **hard constraint** with three named surfaces (fictional labels, "real run, curated" traces, capability indicators).
- [x] **Information architecture** — settled: Home (90-second gate) · Approach · **Factory** (flagship, deep-linkable) · Work · Contact.
- [x] **Restore plan** — executed 2026-07-16: working tree restored; canon (token source of truth) moves to this repo.

---

Architecture: [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md)
