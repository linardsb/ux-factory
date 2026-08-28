# discovery-partner.prd.md

**Status:** intent, awaiting architecture · **Epic:** TBD (created by `piv-slice-epic`) · **Created:** 2026-08-26
**Inputs — both external to the repo and uncommitted at time of writing:**
`2026-08-26-ux-factory-discovery-build-revamp.md` (the thinking doc; D1–D20, Q1–Q9) lives in the owner's vault at
`Desktop/claude-code-second-brain/Fredis/Memory/thinking/`. `__CXO_CPO_VP_Product.md` (the question bank's research seed)
sits untracked in the repo root. `docs/BRD/BRD.txt` (business-analysis methodology — the requirements
hierarchy, BABOK's nine elicitation methods, transition requirements) is in the same vault as the thinking doc.
The thinking doc's handoff step 1 — park all three where the PRD can cite them — is still open; until it is done,
this PRD's evidence trail is not reachable by anyone but the owner.
**Scope:** wave 1 of the revamp — the discovery half, in the portal, for the operator. The canvas (D6), component import (D7) and the guest instance (D1) are named here as non-goals and belong to later epics.

---

## Problem

ux-factory has a build half and no discovery half.

Everything the factory does starts *after* someone has already decided what to build. The only
discovery input it holds is `/build`'s ten method questions — seven Hooked, three Shape Up
(`system/build-questions.mjs`) — which shape a solution someone has already chosen. There is no
question that asks whether the thing is worth building, no place to put evidence, no link from a
decision to what justified it, and no way to produce a PRD from any of it.

So the real discovery happens elsewhere: in a terminal, as a conversation, ending as prose in a
personal vault outside the repo. That output has three costs.

1. **Nobody else can audit it.** A decision and the evidence behind it sit in the same paragraph or
   in neither. A stakeholder is asked to trust the author.
2. **Nobody else can run it.** The workflow is a set of terminal commands. Only the person with the
   terminal, the repo and the skills installed can start one.
3. **It never reaches the factory.** The decisions that should drive the board, the screens and the
   handoff pack are in a file the factory cannot read.

The cost of leaving it: the platform can demonstrate how a product gets *built* and nothing about how
it gets *decided* — which is the half that separates a design engineer from a product one, and the
half the owner's next real product needs first.

## Evidence

**Observed**

| What | Where |
|---|---|
| The factory's only discovery input is ten solution-shaping questions | `system/build-questions.mjs` — Hooked ×7, Shape Up ×3 |
| No discovery run has ever been recorded | `replay/briefs/` holds two build-run briefs, no discovery brief |
| The portal already runs a live agent in a browser | `portal/lib/chat.mjs:38-47` — Agent SDK, `allowedTools: [WebSearch, WebFetch, Read, Grep, Glob]`, `canUseTool` fence, streamed over SSE |
| The portal already streams a staged agent run to a UI | `portal/lib/builder.mjs` — `/api/build/{config,draft,run}`, live PIV phases |
| One-definition-two-front-ends is precedent, not invention | `builder.mjs` imports its question config from `system/build-questions.mjs` and never forks it |
| Decisions are logged as *output*, never as input | linards.pages.dev — 33 decisions and 44 rejects across 11 prototypes; `/faster-payment/` carries a "Built because" line and per-screen design notes, and no brief |
| The studio reads as an exhibit rather than a tool | Owner's verdict, 2026-08-10: /factory "feels random", not product-grade |
| The current workflow lives outside the repo | This session: `/think` → a vault file; `/plan-create-prd` → a terminal interview |
| The question bank's research already exists | `__CXO_CPO_VP_Product.md` — 10 stages, ~30 attributed questions, each with a weak-answer note; a twelve-question opening set |

**Assumption — needs validation**

- That a scripted bank finishes more often than an open conversation. Reasoning only (the thinking
  doc's pre-mortem #4); no run either way. Validate via the first real run.
- That an invited hiring manager wants a live session at all. **Zero evidence** — nobody has asked.
  This is why the guest path is out of scope: the entire build cost (auth, per-guest budget, abuse
  handling, a server-side runtime) sits on the unevidenced half.
- That the bank branches usefully by product type. Four branches are seeded; only one gets a run.

## Thesis

**Why this.** The build half is done — epic #202 closed with the studio surveying, navigating and
docking its own generated docs. The gap is no longer mechanism; it is that nothing tells the
mechanism *what to build, or why*. Discovery is the missing input, and it is also the more valuable
skill to be able to show working.

**Why now.** Three things are already true that were not before. The portal runs the Agent SDK behind
SSE and has done twice (`chat.mjs`, `builder.mjs`), so a live agent in a browser is wiring rather than
research. The question bank exists as curated research with attributions and weak-answer notes, so it
needs editing rather than inventing. And the shipped page holds 33 decisions with 44 rejects — a
scoring key for the first run that was written before this epic existed and cannot be tuned to flatter it.

**Why it beats the cope.** The cope is this terminal. It is fast and it works, and the honest case for
replacing it is narrow: the terminal produces prose, and prose cannot enforce that a decision names its
evidence, cannot be handed to someone without a terminal, and cannot be read by the factory that should
consume it. What the UI adds is not intelligence — it is the same agent — it is a **structure the output
must fit**. And because both front ends read one bank definition, choosing the UI costs nothing: the
terminal stays, by toggle, and nothing that works today stops working.

**The premise that binds the two halves.** The BRD source supplies a frame the CXO doc does not: requirements
form a HIERARCHY — business (what and why) ← stakeholder (what a user can do) ← solution (functional and
non-functional) ← transition (how the organisation gets from today to it) — and a solution is not defined until
each level names its parent. Two consequences this PRD acts on. First, **a prototype is an elicitation method,
not a phase after discovery**: BABOK lists prototyping among its nine, alongside interviews, observation and
workshops. So the factory's build half is not downstream of the discovery half — it is one of the ways discovery
gets done, which is why the two belong in one workflow rather than two products. Second, the repo already
enforces this hierarchy BELOW the component line (spec → `components.css` block → renderer template →
vocabulary, gated by build-checks group 3); the same discipline simply has no expression above it yet.

**What this epic notably does not cost.** No recorded decision needs amending. The portal at 127.0.0.1
is already the sanctioned home for a live agent; §8's "no live LLM calls at view time" governs shipped
pages and is untouched, as is "not a SaaS product", as is the canvas non-goal in
[prototype-studio.prd.md](./prototype-studio.prd.md). Those three amendments belong to the canvas and
guest epics. Scoping to wave 1 is what keeps them unwritten.

## Hypothesis

> **We believe** putting the discovery workflow behind buttons in the portal — a scripted, attributed
> question bank whose agent judges each answer against its own weak-answer note, over one run package —
> **will cause** a person starting a product, with a blank idea or an existing PRD, **to** finish a full
> discovery session, **resulting in** a generated PRD whose every decision carries an evidence link and a
> kill criterion, instead of notes only its author can read.
>
> **We'll know we're RIGHT if** the owner's *next real discovery session* starts in the UI rather than
> the terminal, and the Faster Payment run reaches a generated PRD in one sitting.
>
> **We'll know we're WRONG if** the owner reaches for `/think` in the terminal for that next real
> product anyway.

The wrong condition is deliberately the switch, not the build. The terminal is the actual alternative,
and it is available by design through the toggle — so the UI has to win on merit every time it is used.
If it does not win for the person who built it, it will not win for a guest, and the guest epic should
not be started.

**Signal timing:** run-triggered, not calendar-bound (owner's call). The accepted risk is that "no real
product ever went through" — the thinking doc's pre-mortem #1 — is then unguarded by a deadline. The
thinking doc's own review date, 2026-09-30, stands as a check-in rather than a gate.

## Target user and JTBD

**Primary: the owner as operator.** Solo, at a laptop, at the start of a product, holding either a
blank idea or an existing PRD. Has the repo, the terminal and the skills — and is therefore the hardest
user to win, because the alternative is already installed.

> **When** I'm starting a product and only have a hunch, **I want** to be asked what a CPO would ask and
> have my thin answers pushed back on and recorded as I go, **so I can** leave with decisions someone
> else could audit rather than notes only I understand.

**Secondary, named but out of scope: an invited guest** (a hiring manager) running the same workflow on
their own product at an unlisted instance. The UI is built so the same screens serve them — no separate
path, no operator-only affordances that would need unpicking. What is deferred is the *deployment*:
auth, per-guest spend caps, abuse handling and a server-side runtime.

**Non-users**

- The public reader of the shipped site. The public IA stays replay-only and unchanged by this epic.
- Recruiters doing a 90-second scan. They get the existing gate.
- Teams. No multiplayer, no comments, no shared sessions, no accounts.
- Anyone wanting a general design tool. The token contract and the vocabulary refusal are unchanged.

## MVP

The thinnest line that can trip the wrong condition: **a discovery session the owner would choose over
the terminal, ending in a PRD.**

1. **Three buttons in the portal** — Think · Create PRD · Grill. The same three commands, in a UI,
   pressable in order. Nothing is composed, rendered or imported in this epic.
2. **The bank as shared data.** One definition, read by both the UI and the CLI skill —
   `builder.mjs`'s existing pattern. A **toggle** picks the front end; parity is by construction, so
   neither can drift.
3. **The bank itself.** Seeded from the CXO doc's ten stages and twelve-question opening set, each
   question keeping its attribution and its weak-answer note. Four product-type branches: **B2B SaaS ·
   internal tool · consumer · regulated** (regulated because the first run is regulated fintech;
   marketplace deferred). Plus a **non-functional block**, which closes a gap the repo has carried from the
   start: quality attributes are GATED hard here (WCAG pairs, INP ≤ 200 ms, contrast in build-checks, the 44px
   target-size call) and ELICITED nowhere, so a run currently produces functional decisions with no quality
   attributes attached to them. The block asks for performance budget, availability expectation, accessibility
   target and security boundary, each recorded as a decision with a wrong-if line like any other.
   And a conditional **AI-interaction module**, fired only when the product has a model. The CXO doc's
   Stage 8 is entirely GOVERNANCE — who owns the eval, what is the inference bill, which feature would
   you defend — and asks nothing about how a person instructs, corrects or stops a model, or what the
   interface does when it is wrong. Six areas, seeded from Amershi's HAX guidelines and Google PAIR's
   People + AI Guidebook (the house citation for AI-UX material, never a secondary re-cut): **prompt**
   (how the user instructs, refines, controls) · **conversational** (turn-taking, memory, follow-ups) ·
   **agentic** (delegation, approvals, autonomy levels, task visibility) · **grounding** (citations,
   source confidence, retrieval) · **response patterns** (streaming, loading, regenerate, feedback) ·
   **safety and trust** (privacy, guardrails, explainability). This module applies to THIS epic's own
   product — the partner delegates, asks approval, refuses, and streams — so the first run of it is a
   dogfood rather than a hypothetical.
4. **The depth ladder.** Not every session is a full discovery, and a bank that asks thirty questions
   about a feature addition is the pre-mortem's "form nobody finished". Three depths, taken from the
   CXO doc's own tiers rather than invented:

   | Depth | Questions | When |
   |---|---|---|
   | **Scope check** | ~6 — Stage 4 (appetite, rabbit holes, out of bounds) + Stage 7 (kill criteria, measurement) | A feature or change to something that exists; problem, user and market already known |
   | **Opening set** | **12** — the doc's twelve, in its stated order | A new surface or a substantial bet inside a known product |
   | **Full discovery** | ~30 — all ten stages + the conditional modules (AI-native, voice, platform) | A new product |

   Plus an orthogonal prefix, not a fourth depth: the doc's **five questions before the twelve** fire
   when the person does not know the organisation ("which STARS situation am I in", "what do we say we
   do that we don't really do", "which metric do you trust the least"). The depth is chosen once at
   session start — the agent proposes, the human confirms — and D5's escalation rule owns the upgrade
   path: a repeated weak answer at Scope check means proposing a step up, never grinding on.
5. **The posture.** One question at a time. The person answers; the agent scores the answer against
   that question's weak-answer note, pushes back once if it is thin, records the decision or a
   weak-answer flag, and moves on. The agent challenges and records; it never decides.
6. **The escape hatch.** An "ask something else" input at every step. The agent answers, then **files
   the exchange** against whichever banked question it touched, or as a new open question if it touches
   none. The door exists so the session can go where it needs to; the filing is what stops the door
   becoming an unrecorded side channel.
7. **The run package** — answers, decisions, and an evidence ledger where every row carries a
   provenance label (real-interview · secondary-source · assumption · fictional-scenario). A decision
   without an evidence link is flagged, not silently accepted. Two rules come from the requirements
   hierarchy above:
   - **Traceability upward.** Every solution-level decision names the stakeholder requirement it serves,
     and every stakeholder requirement names the business requirement it serves. The same rule the repo
     already runs below the component line, one layer up. An orphan at any level is flagged, exactly as a
     decision with no evidence link is.
   - **A transition note is the pack's seventh artefact.** D9 currently lists six, and none of them covers
     getting an organisation from today's state to the built one: data migration, training materials,
     support setup, business continuity. **Required for the internal-tool and regulated branches**, and
     explicitly markable n/a elsewhere — Faster Payment needs none of it, which is what makes n/a an honest
     answer rather than an escape hatch.
8. **The generated PRD.** Projected from the run package into the house PRD shape (problem · evidence ·
   hypothesis · users · MVP · metrics · non-goals · open questions). The human edits the result. This is
   the artefact handed to `plan-architecture` next, and it is what makes the session worth having.
9. **One real run: Faster Payment, blank-idea mode.** The input is one sentence — *"Meridian needs to
   let a customer pay someone they've never paid"* — committed before the run, with no screens, no CoP
   and no scam stop in it. Afterwards, the 33 decisions and 44 rejects already published on
   linards.pages.dev are the **scoring key**: what the run independently reached, what it missed. Never
   an input, never in the agent's context. A score, not an impression.

**Door check.** Two-way throughout. The bank is data, the run package is files, the portal is local and
undeployed, and no recorded decision is amended. The one-way doors in the thinking doc — retiring the
baked-in prototypes (D19), the §8 amendments (D1) — are all outside this epic, and D19 carries its own
"replace, then remove" guard for when it arrives.

## Success metrics

| Metric | Target | How measured | Cobra check → guardrail |
|---|---|---|---|
| **Switch** | The next real discovery session starts in the UI | Which front end was used, recorded in the run package | Could be forced once out of loyalty → the **second** unprompted session must too, or the switch didn't happen |
| **Completion** | Faster Payment reaches a generated PRD in one sitting | The run package exists and the PRD is generated | Gamed by shrinking the bank → **coverage of the twelve-question opening set** reported with it |
| **Independent reach** | _TBD — the share is set before the run, never after_ | Post-hoc comparison against the scoring key | Gamed by leaking the answer into the input → the one-sentence input is **committed before the run** and the key is out of context; the share is reported as found/missed, never as a pass |
| **Auditability** | Every decision in the pack has an evidence link and a wrong-if line; every evidence row has a provenance label | Checked over the run package | Gamed by labelling everything "assumption" → a decision resting only on assumptions is **flagged in the pack**, not counted as evidenced |
| **Not a form** | Never more than 3 consecutive questions recorded with no decision and no weak-answer note | Counted within a run | An agent that flags everything → weak-answer flags are a reported rate, not just a floor |
| **Disclosure held** | Always-loaded context ≤ **11k tokens** | Measured: CLAUDE.md words + every skill description | Split Tier 0 into references a hook re-injects anyway → the budget is on what a session **loads**, not on file count. Baseline after the 2026-08-27 trim: **9.5k** (2,761-word CLAUDE.md + 73 skill descriptions at ~80 tokens each), leaving ~1.5k for the partner's own always-on body |

## Non-goals

- **No canvas work.** D6's free-flow canvas is a later epic. The 12×8 grid, spans-not-px and
  `prototype-studio.prd.md` §Non-goals stand unamended.
- **No component import.** D7's spec-first draft-then-ratify path and its ≤10-minute target are a later
  epic. The vocabulary is unchanged.
- **No guest deployment.** No auth, no per-guest budget, no rate limiting, no unlisted instance, no
  server-side runtime. §8's "no live LLM calls at view time" and "not a SaaS product" stand unamended.
- **No shipped-page surface.** Nothing on the public IA changes. No VR baselines churn, and the shipped
  replay of a discovery run is a later epic (or never — it depends on whether the guest path is ever
  evidenced).
- **No prototype composition or screen rendering** in this epic. The three buttons run before any
  component is chosen.
- **No retiring the baked-in prototypes.** D19 is explicitly replace-then-remove, and the replacement
  does not exist yet.
- **No a11y gating work.** D11's axe-in-CI is a later epic. New portal UI is nonetheless built to
  **44×44** targets (Q4); shipped pages keep their argued 24×24 (SC 2.5.8 AA, `studio.css`).
- **No topic-organised project taxonomy.** The circulating "AI UX/UI design structure" folder tree is a
  coverage checklist, not a layout: it splits by topic with no generated-vs-hand-written split, which is the
  load-bearing distinction in a repo where generators emit committed artifacts that drift-checks gate — and
  four of its folders (`design-system/`, `prototypes/`, `handoff/`, `docs/`) already exist here in better
  form. Its interaction categories are taken into the bank module above; the tree is not adopted, and D16's
  run package stays organised by pipeline stage.
- **No evidence database.** Files plus the repo as knowledge base. A store is forced only when
  cross-company queries reach a few hundred records.
- **No peer agents.** One writer; read-only helpers and an independent reviewer at most.
- **No findings from the agent.** It produces instruments — guides, scripts, assumption maps,
  screeners, the ledger — and never research findings. Synthetic material exists only as labelled
  fixtures.
- **No hand-written content presented as a run's output.** The honesty contract, unchanged.

## Open questions

- [ ] **Skills under the Agent SDK.** Claude Code skills are a Claude Code feature; how the same bank
      and posture reach an SDK-driven portal run is unproven. The owner named this uncertainty directly.
      An architecture spike, not a product question.
- [ ] **How many skills, and can the phases be skills at all?** The workflow is three POSTURES with
      three outputs — `think` (diverge and decide), `plan-create-prd` (interview into an artefact),
      `grill-me` (attack it) — so three is the working assumption, not one per phase. What is open is
      whether the phase bodies and the bank live inside those skills or in files both front ends read.
      Parity points at the latter: `portal/lib/builder.mjs:42` imports its question config from
      `system/build-questions.mjs` rather than forking it, and that precedent is the one to follow if
      G2 resolves against SDK skill discovery. Decided in `plan-architecture`, with G2 as its input.
- [ ] **The escape hatch's filing rule.** What happens when an off-script exchange maps to no banked
      question — a new open question, a new decision, or dropped with a note?
- [ ] **Does the scripted bank actually beat open conversation for completion?** Chosen on pre-mortem
      reasoning; only the first run can answer it. If the bank is abandoned mid-run in favour of the
      escape hatch, the posture was wrong.
- [ ] **Scoring method for "independently reached".** How a run's decision is judged equivalent to a
      published one without a human grading it generously.
- [ ] **Q2b** (deferred to the canvas epic) — is drag-to-reorder within a frame's layout grammar enough,
      or must a component sit at an arbitrary pixel inside a frame?
- [ ] **Q6** (deferred to the canvas epic) — an operator canvas in the portal mounting the studio
      modules, or `studio.html` promoted?
- [ ] **Marketplace** as a fifth product-type branch — deferred until a run needs it.
- [ ] **Does the 44px bar apply to the CLI path?** Presumed not (no targets), but the toggle means one
      workflow has two conformance stories.
- [ ] **Park the inputs.** The thinking doc and the CXO doc are both outside version control (handoff step 1).
      Until they are committed or copied in, the evidence table above cites sources a reader cannot open.
- [ ] **Unguarded deadline risk.** The signal is run-triggered by choice; the thinking doc's pre-mortem
      #1 ("no real product ever went through") has no calendar behind it. Accepted, recorded.

## Architecture

_TBD — see `plan-architecture`._

The following thinking-doc decisions are deliberately **left open here as engineering** and must be
made in the architecture doc: **D3** (agent topology, the PreToolUse fence) · **D4** (skill tiers,
`disable-model-invocation`, the disclosure mechanism — and the skill-count question above) · **D14** (hooks, the CLAUDE.md split,
`.mcp.json`, per-surface priming) · **D16** (run-package layout) · the bank's storage format and the
UI↔CLI shared-definition mechanism · the SSE/session model for a staged run · how the scoring key is
kept out of the agent's context.

Deferred to later epics with their own PRDs: **D6/D7** (canvas and import, plus Q2b/Q6) · **D1's guest
path** (auth, budget Worker, the two §8 amendments) · **D11** (a11y gating) · **D19** (retiring the
baked-in prototypes).

**Related:** [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) (§8 unamended by this epic) ·
[prototype-studio.prd.md](./prototype-studio.prd.md) (§Non-goals unamended by this epic) ·
[st-ux-fusion.prd.md](./st-ux-fusion.prd.md) (the method spine this layers onto)
