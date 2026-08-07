# Systems thinking × UX — research synthesis → epic strategy

Date: 2026-08-06. Inputs: 7 local docs in `../UX_UI_docs/` + 8 Center Centre articles + the owner's own Q&A synthesis (`ST_UX_fusion.txt`). Precedent doc: `.claude/plans/ux-overhaul-v3-prd-research.md`.

Owner constraints (recorded in memory `st-ux-epic-augments-singer-eyal`):
1. The epic **augments** the Ryan Singer (Shape Up) + Nir Eyal (Hooked) method spine — /build's ten questions, the breadboard, epic #202's studio — it never replaces it.
2. **No overengineering.** The epic's own sizing test is Meadows' leverage hierarchy: prefer high-leverage reframings over new subsystems; at most ONE small interactive exhibit.

## 1. One takeaway per resource

| Resource | Main takeaway |
|---|---|
| **Meadows, Thinking in Systems** | Behaviour is produced by structure (stocks, loops, rules, goals, paradigms), not by the people inside it — intervene high on the 12 leverage points (information → rules → goals → paradigms), not on parameters. |
| **Kim, Systems Thinking Tools (TRST01E)** | Ten graduated visual "languages" — from causal-loop diagrams to management flight simulators — make hidden structure explicit enough to discuss and intervene on. |
| **Morecroft, Strategic Modelling & Business Dynamics** | Growth, collapse and cycles come from feedback structure + bounded-rational decision rules acting on *proxies, not ground truth*; a simulator lets you feel that link instead of being told it. The MFS cockpit pattern: one time chart, 2–3 sliders, tick-based "run a year," deliberately hidden ground truth, one cumulative score. |
| **Gothelf/Seiden, Lean UX** | Declare assumptions → falsifiable hypothesis → smallest possible test → measure the outcome; a shipped feature is waste until its effect is measured. |
| **Hartson/Pyla, The UX Book** | UX quality is *engineered*: an evaluation-centered lifecycle (the Wheel) where every activity exits only through an explicit transition criterion, and capability claims are pre-committed as measurable targets, then verified. |
| **luke_Wreblowski_AI_UX.txt** | AI value comes from context + affordances: suggested next actions over blank boxes, AI-does-creation/people-curate onboarding, and a *steering layer* that encodes design intent so every agent stays on-brand — precision about the 3–5 things that matter is the skill. |
| **technical_UX.txt** | UX quality is an engineering property — states, latency, focus, resilience, recovery — a 20-item checklist the shipped site already mostly practices. |
| **ST_UX_fusion.txt (own Q&A)** | Already the epic's thesis: UX moves from outputs to outcomes when you treat the product *and the organisation* as one system, and the highest-leverage interventions are vision, goals and paradigms — not fixes. |

Spool / Center Centre articles (one line each):
1. **Value-of-great-UX diagram** — UX value plots as frustration→delight vs cost→premium: Poor UX costs, Good UX meets expectations, Great UX commands premium + market leadership.
2. **Measuring experiences, not product use** — instrument frustration→delight transitions in the journey, not clicks; a low completion rate can be the *right* outcome.
3. **Strategic UX research** — asks "are we solving the right problem" at org level, vs tactical "is this feature built correctly."
4. **Yes, And** (Leslie Jensen-Inman) — validate the stakeholder's idea, then redirect toward user needs; sincerity carries it.
5. **The future must be strategic** — four shifts: outcomes over outputs, experiences over products, proactive over reactive, org-wide expertise over one-off validation.
6. **Experience strategists** — work at exec level connecting business priorities to user pain directly (the "Daniella / Pay Now" story), not producing artifacts.
7. **Receiving end of AI** — AI creates a two-party UX problem: design for the person the AI is done *to*, not just the operator.
8. **Vision before process** — without a compelling vision of the improved experience, people push back on any new process.

Attribution hazards: the five-pillar AI-trust content (Trust · Clarity · Control · Transparency · Meaningful Benefit) flows through `ST_UX_fusion.txt` but originates in the talk covered by the standing rule — **never name that speaker; cite Nielsen/Amershi/PAIR instead** (memory `five-pillar-talk-attribution`; verified the talk is by a Progress Software advocate, NOT Wroblewski, so crediting Spool + Wroblewski is safe). Note "Yes, And" is Jensen-Inman, not Spool. The Dave Crawford notes inside the Luke file are Crawford's ideas via Wroblewski's write-up — credit accordingly if used.

## 2. What the repo ALREADY embodies (overlap with done work)

The strongest strategic finding: this research largely *validates existing architecture* — the epic's job is mostly to NAME what's built, not build new things.

| Research concept | Already shipped as |
|---|---|
| Declarative generative UI / A2UI ({name, props, children} against a validated vocabulary) | `system/agentic-renderer.mjs` + `handoff/verdant/vocabulary.json` — the exact industry pattern, unnamed |
| Steering layer (encoded design intent every agent obeys) | CLAUDE.md + `.claude/skills/portfolio-design` + the token contract itself |
| Management flight simulator (decide → tick → consequences, replayable) | /build's six acts; `system/replay-driver.mjs` playing a real run; the studio (Morecroft's fidelity ladder: these are honest *illustrative* models) |
| Outcomes-over-outputs / UX targets pre-committed then measured | The honesty contract; `loc-summary.json`, `param-count.json` — "a claim is never hand-written" |
| The Wheel + activity transition criteria (UX Book) | The PIV loop + check-terminated stations (memory `piv-loop-two-roles`) — same structure, independently derived |
| Flow model (role graph: actors + labeled artifact flows) | `system/system-graph.mjs` is that renderer pointed at the token contract |
| Suggested-questions / AI-drafts-people-curate | portal `builder.mjs` drafting the composition question from /build answers; the study surface's ask→propose→adjust |
| Two-party AI ethics | /build's Manipulation Matrix verdict panel (Eyal) — Spool's "receiving end" deepens the same point |
| Hooked as a reinforcing loop; breadboard as structure | /build IS a systems exhibit that never says so |

## 3. Overlap with PLANNED work (#202 seam)

- Epic **#202 is open** (Studio tickets #212–#223). **#216** re-points the IA (home→gate; approach/work/contact→evidence layers) and **#215** adds the component catalog — both will move approach.html/factory.html's section structure. **This epic must sequence after (or explicitly coordinate with) #216's IA surgery**; do not claim page sections independently.
- Zero existing coverage of systems thinking / Spool / Wroblewski anywhere in docs/epics or issues — the epic is genuinely additive, no duplicate work.
- An inspirations surface **already exists**: `approach.html#sources` ("I learn from the primary sources," four clusters). The Spool/Wroblewski ask is a fifth cluster, not a new page.
- Highest issue number in use: **#237**.

## 4. The gap → epic thesis

The site proves **craft** (tokens, gates, measured claims) and **method** (Hooked + Shape Up performed live). What it does not yet articulate is **strategy**: *why* these habits buy business outcomes, and *where* the builder chooses to intervene. That is exactly the £70–80k differentiator (memory `v3-overhaul-direction`) and exactly what this research supplies.

Epic thesis: **"Better UX through systems thinking — name the structure, state the outcomes."** The portfolio already behaves like a system-literate artifact; this epic makes that legible in the site's own register ("a method performed, not described") with near-zero new machinery.

## 5. Proposed slices (leverage-ordered, lean)

Applying the research to its own implementation — intervene high, build little:

- **T1 — Sources cluster (information flow; ~zero risk).** Add a fifth cluster "Strategy & systems" to `approach.html#sources`: Jared Spool, Leslie Jensen-Inman, Luke Wroblewski, Donella Meadows, Daniel Kim, John Morecroft, Gothelf/Seiden, Hartson/Pyla. Respect the five-pillar attribution rule. Cost: copy + VR baseline regen for approach.
- **T2 — Outcome reframing pass (goals level; copy only).** One pass over approach's method section (+ home/factory close cards): each habit states the outcome it buys, in Spool's outcomes-over-outputs register; where a claim is quantifiable it stays generated, never hand-written. Optionally fold in one-sentence industry-term namings where the site already does the thing: "declarative generative UI" beside the renderer/handoff exhibit, "steering layer" beside the factory story, "management flight simulator (illustrative)" beside /build & the replay. Zero new modules.
- **T3 — The one exhibit: the leverage ladder (structure level).** "Where I intervene": Meadows' 12 leverage points as a compact interactive ladder, each rung mapped to a *real, linkable decision in this repo* (e.g. #12 Numbers = token values; #6 Information flows = measured claims + the live regions; #5 Rules = the fences and gates; #3 Goals = the honesty contract; #2 Paradigm = the token contract itself). Systems literacy demonstrated BY the site's own receipts — not pedagogy. Authorial opinion, so hand-written content is honest; built on existing card/disclosure patterns; placement decided against #216's final IA.
- **T4 (stretch, explicitly cuttable) — mini flight simulator.** ONE stock-and-flow sim in the Morecroft cockpit pattern (one chart, two sliders, tick-run, one score, hidden ground truth), subject: e.g. walk-up usability vs support burden (the "fixes that fail" loop). Honest label: illustrative model. Only if T1–T3 land light; cutting it costs the epic nothing.

Explicit non-goals: a systems-thinking essay page; a CLD editor; recreating book diagrams wholesale; touching the Hooked/Shape Up surfaces' mechanics; any new generator unless a claim becomes quantitative.

## 6. Hazards

- **VR baselines**: T1–T3 all churn approach (and possibly home/factory) baselines — regen via `update:docker` in the same PR (memories: `visual-regression-baseline-trap`, `vr-tolerance-hides-text-changes`).
- **loc-summary cascade** if T3 adds a tracked module: regen `loc-summary.json` + approach baselines same PR.
- **#216/#215 coordination**: placement decisions deferred until the IA surgery's shape is known; don't merge conflicting section claims.
- **Attribution**: five-pillar content never names its speaker; "Yes, And" credits Jensen-Inman; Crawford-via-Wroblewski credited correctly.
- **Overengineering tripwire**: if any slice starts growing a subsystem, it has become its own "fix that fails" — cut to the reframing.

## 7. Next steps

1. `/plan-create-prd` — interview → epic PRD in `docs/epics/` (thesis above is the seed).
2. `/plan-architecture` — mostly placement + T3's shape; small doc.
3. `/piv-slice-epic` — create the epic + T1–T4 as GitHub issues wired to it (after #237, numbers land ~#238+).
