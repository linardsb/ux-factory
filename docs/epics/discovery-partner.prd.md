# discovery-partner.prd.md

**Status:** intent, grilled 2026-08-27, awaiting architecture · **Epic:** TBD (created by `piv-slice-epic`) · **Created:** 2026-08-26
**Inputs.** The question bank's research seed is `docs/research/question-bank-source.md` — §5 of a longer
research file, extracted and parked in-repo: **stages 1–9, 65 attributed questions** each with a weak-answer
note and an OBSERVED / DERIVED / THIN label, plus the twelve-question opening set and the sources list. It is
the research file's **Appendix D** — the unabridged bank — not the abridged §5 summary of the same material. The bank module holds **65** — the source's 69 top-level bullets less two mottos with no weak-answer note, one cross-reference line and one duplicated press-release question, reconciled in #282; the pre-reconciliation number was 66. #283 added ten entries outside that count and outside `whole-bank` — the non-functional block and the AI-interaction module — so the module holds 75 and the graded fixture's key space stays 65.
Stage 10 and the five-questions prefix are omitted on purpose and the file says why. The rest of that research
file is hiring material with no bearing on the bank and is deliberately not carried in. The requirements-hierarchy source is `docs/research/requirements-hierarchy.md`
(BABOK-derived: the requirements levels, the nine elicitation methods, transition requirements), parked in-repo
from the same vault. The thinking
doc behind this epic (D1–D20, Q1–Q9) stays in the owner's vault and is cited by date and slug —
`2026-08-26-ux-factory-discovery-build-revamp` — not committed.
**Scope:** wave 1 of the revamp — the discovery half, in the portal, for the operator. The canvas (D6),
component import (D7) and the guest instance (D1) are named here as non-goals and belong to later epics.

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
| One-definition-many-readers is precedent, not invention | `builder.mjs:42` imports its question config from `system/build-questions.mjs` and never forks it |
| Decisions are logged as *output*, never as input | `_portfolio/decisions.json` (sibling jobs folder, published to linards.pages.dev) — 33 decisions and 44 rejects across **13** prototypes |
| The Faster Payment scoring key is **four** decisions, not 33 | `_portfolio/decisions.json` — `faster-payment` holds m-005…m-008 and 4 rejects. All four are **solution-level** (one action not a menu · name check before the amount screen · balance shown per account · full-screen stop before Send). Each carries a `because`, a `would_measure` and a `why_not`. **Every one has `jd_line: null` — not one names a parent requirement** |
| The studio reads as an exhibit rather than a tool | Owner's verdict, 2026-08-10: /factory "feels random", not product-grade |
| The current workflow lives outside the repo | `~/.claude/skills/think/SKILL.md:11` writes to `$FREDIS_VAULT/…/thinking/`. `think` and `grill-me` exist only as user-global skills; `plan-create-prd` exists in both `~/.claude/skills/` and the repo's `.claude/skills/`, the repo copy carrying local edits |
| The question bank's research already exists | `docs/research/question-bank-source.md` — stages 1–9, **65** attributed questions, each with a weak-answer note and a provenance label; a twelve-question opening set; a sources list. The pre-grill draft said "ten stages, ~30 questions"; both were wrong, ~30 is a **selection** rather than the bank, and the draft was reading the abridged §5 rather than the full Appendix D |
| Skill discovery under the SDK is plausible but unproven | `@anthropic-ai/claude-agent-sdk@0.1.77` exposes `settingSources` (default `[]`) and its bundled CLI references a skills directory. Not proven end to end — and by G13 below, nothing depends on it |

**Assumption — needs validation**

- That a scripted bank finishes more often than an open conversation. Reasoning only (the thinking
  doc's pre-mortem #4); no run either way. Validate via run 1.
- That an invited hiring manager wants a live session at all. **Zero evidence** — nobody has asked.
  This is why the guest path is out of scope: the entire build cost (auth, per-guest budget, abuse
  handling, a server-side runtime) sits on the unevidenced half.
- That the bank branches usefully by product type. **All four branches are built** (see MVP 3) and
  only **regulated** gets a run in wave 1. B2B SaaS, internal tool and consumer therefore ship with no
  run behind them, and this PRD says so rather than implying they were validated.

## Thesis

**Why this.** The build half is done — epic #202 closed with the studio surveying, navigating and
docking its own generated docs. The gap is no longer mechanism; it is that nothing tells the
mechanism *what to build, or why*. Discovery is the missing input, and it is also the more valuable
skill to be able to show working.

**Why now.** Three things are already true that were not before. The portal runs the Agent SDK behind
SSE and has done twice (`chat.mjs`, `builder.mjs`), so a live agent in a browser is wiring rather than
research. The question bank exists as curated research with attributions and weak-answer notes, so it
needs editing rather than inventing. And a published Faster Payment pack exists as a scoring key that
was written before this epic and cannot be tuned to flatter it.

**Why it beats the cope.** The cope is this terminal. It is fast and it works, and the honest case for
replacing it is narrow: the terminal produces prose, and prose cannot enforce that a decision names its
evidence, cannot be handed to someone without a terminal, and cannot be read by the factory that should
consume it. What the UI adds is not intelligence — it is the same agent — it is a **structure the output
must fit**.

**Why the terminal is not rebuilt to match.** An earlier draft promised parity: one bank, two front ends,
a toggle. That is now a non-goal, for two reasons. The first is that parity does not exist and buying it
is real work — `think` and `grill-me` are user-global skills writing prose to a vault outside this repo,
so matching them to the run package means moving and rewiring three skills on the path expected to lose.
The second is worse: the independent variable here is *structure versus prose*. Give the terminal the
same enforced structure and the only difference left is clicking versus typing, and the hypothesis has
nothing to test. So the terminal stays **exactly as it is** — untouched, installed, and serving as the
control the wrong condition is measured against. Deleting it would be the other way to break the test:
the UI would win by having no alternative.

**The premise that binds the two halves.** The requirements-hierarchy source supplies a frame the question
research does not: requirements form a HIERARCHY — business (what and why) ← stakeholder (what a user can
do) ← solution (functional and non-functional) ← transition (how the organisation gets from today to it) —
and a solution is not defined until each level names its parent. Two consequences this PRD acts on. First,
**a prototype is an elicitation method, not a phase after discovery**: BABOK lists prototyping among its
nine, alongside interviews, observation and workshops. So the factory's build half is not downstream of the
discovery half — it is one of the ways discovery gets done, which is why the two belong in one workflow
rather than two products. Second, the repo already enforces this hierarchy BELOW the component line (spec →
`components.css` block → renderer template → vocabulary, gated by build-checks group 3); the same discipline
simply has no expression above it yet. The published Faster Payment pack is the case in point: four
solution-level decisions, each with a reason and a kill criterion, and **no recorded parent above any of them**.

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
> the terminal, and run 1 reaches a generated PRD in one sitting.
>
> **We'll know we're WRONG if** the owner reaches for `/think` in the terminal for that next real
> product anyway.

The wrong condition is deliberately the switch, not the build. The terminal is the actual alternative and
it stays installed and unmodified, so the UI has to win on merit every time it is used. If it does not win
for the person who built it, it will not win for a guest, and the guest epic should not be started.

**Signal timing:** run-triggered, not calendar-bound (owner's call). The accepted risk is that "no real
product ever went through" — the thinking doc's pre-mortem #1 — is then unguarded by a deadline. The
thinking doc's own review date, 2026-09-30, stands as a check-in rather than a gate.

## Target user and JTBD

**Primary: the owner as operator.** Solo, at a laptop, at the start of a product, holding either a
blank idea or an existing PRD. Has the repo, the terminal and the skills — and is therefore the hardest
user to win, because the alternative is already installed.

> **When** I'm starting a product and only have a hunch, **I want** to be asked the questions a product
> decision has to survive, and have my thin answers pushed back on and recorded as I go, **so I can**
> leave with decisions someone else could audit rather than notes only I understand.

**Secondary, named but out of scope: an invited guest** (a hiring manager) running the same workflow on
their own product at an unlisted instance. The UI is built so the same screens serve them — no separate
path, no operator-only affordances that would need unpicking. What is deferred is the *deployment*:
auth, per-guest spend caps, abuse handling and a server-side runtime.

**Non-users**

- The public reader of the shipped site. The public IA stays replay-only and unchanged by this epic.
- Recruiters doing a 90-second scan. They get the existing gate.
- Teams. No multiplayer, no comments, no shared sessions, no accounts.
- Anyone wanting a general design tool. The token contract and the vocabulary refusal are unchanged.

## Constraints

Two constraints bind everything below, and both were set during the grill rather than derived from the
design.

- **C1 — the global `think` skill is never modified.** `~/.claude/skills/think/` is in daily use across
  other projects. Nothing in this epic touches it. If a discovery-specific think posture is ever needed on
  the CLI side, it goes in `ux-factory/.claude/skills/think/`, which shadows the global one inside this repo
  only. The precedent already exists: `plan-create-prd` lives in both places and the repo's copy carries the
  local edits. This constraint outlives wave 1, where G6 means no CLI work is done at all.
- **C2 — no AI slop, anywhere a human reads it.** Bank question text, weak-answer notes, UI copy, generated
  PRD prose and this document all get a `no-ai-slop` / `humanizer` pass against
  `~/.claude/skills/_shared/slop-blacklist.md`. Technical terms stay technical where precision needs them;
  the blacklist is for the padding, not the vocabulary.
- **C3 — no job titles.** No role or seniority title appears in the bank, the UI, the
  run package, the generated PRD or this document. The questions stand on their own per-question
  attributions, which name people and publications rather than seniority. The bank's source file is named
  and cited accordingly.

## MVP

The thinnest line that can trip the wrong condition: **a discovery session the owner would choose over
the terminal, ending in a PRD.**

1. **Three buttons in the portal** — Think · Create PRD · Grill. The same three postures, in a UI,
   pressable in order. Nothing is composed, rendered or imported in this epic.

2. **Two ways in, and both are specified.**
   - **Blank idea** → starts at Think. The bank runs as an interview, then Create PRD, then Grill.
   - **Existing PRD** → starts at Grill. The bank runs as an **audit** instead of an interview: which
     banked questions does this document already answer, which does it dodge, which of its decisions carry
     no evidence link and no wrong-if line. Out comes a gap list and a revised PRD.

   The second mode was unnamed in the pre-grill draft and is what run 2 exercises.

3. **The bank as one data file.** One definition, read directly by the portal, following `builder.mjs:42`'s
   pattern. It is a plain data file rather than a skill body, so whether SDK skill discovery works is an
   optimisation and never a blocker. **No CLI parity is built** (see Thesis) and there is no toggle.

4. **The bank itself.** Seeded from `docs/research/question-bank-source.md`'s nine stages and
   twelve-question opening set, each question keeping its attribution and its weak-answer note.
   Four product-type branches, **all four built in wave 1**: **B2B SaaS · internal tool · consumer ·
   regulated** (marketplace deferred). Branch content is question selection and ordering rather than new
   research, and building all four means sessions two and three are not blocked on writing a branch first;
   the cost, recorded above, is that three of the four ship with no run behind them.

   Plus a **non-functional block**, which closes a gap the repo has carried from the start: quality
   attributes are GATED hard here (WCAG pairs, INP ≤ 200 ms, contrast in build-checks, the 44px target-size
   call) and ELICITED nowhere, so a run currently produces functional decisions with no quality attributes
   attached to them. The block asks for performance budget, availability expectation, accessibility target
   and security boundary, each recorded as a decision with a wrong-if line like any other. **Recorded only —
   wiring an elicited answer into build-checks is a later epic, and this PRD says so rather than letting the
   block imply enforcement.**

   And a conditional **AI-interaction module**, fired only when the product has a model. The source's
   Stage 8 is entirely GOVERNANCE — who owns the eval, what is the inference bill, which feature would
   you defend — and asks nothing about how a person instructs, corrects or stops a model, or what the
   interface does when it is wrong. Six areas, seeded from Amershi's HAX guidelines and Google PAIR's
   People + AI Guidebook (the house citation for AI-UX material, never a secondary re-cut): **prompt**
   (how the user instructs, refines, controls) · **conversational** (turn-taking, memory, follow-ups) ·
   **agentic** (delegation, approvals, autonomy levels, task visibility) · **grounding** (citations,
   source confidence, retrieval) · **response patterns** (streaming, loading, regenerate, feedback) ·
   **safety and trust** (privacy, guardrails, explainability). Run 1 has no model in it, so **run 2 exists
   to fire this module** rather than shipping it untested.

5. **The depth ladder — a separate choice from the entry mode.** Where a session starts and how long it
   runs are two axes, not one. Not every session is a full discovery, and a bank that asks thirty questions
   about a feature addition is the pre-mortem's "form nobody finished". Three depths, taken from the
   source's own tiers rather than invented:

   | Depth | Questions | When |
   |---|---|---|
   | **Scope check** | ~6 — Stage 4 (appetite, rabbit holes, out of bounds) + Stage 7 (kill criteria, measurement) | A feature or change to something that exists; problem, user and market already known |
   | **Opening set** | **12** — the source's twelve, in its stated order | A new surface or a substantial bet inside a known product |
   | **Full discovery** | **~30, selected** from the 65 in stages 1–9 — the twelve, plus the branch's own picks, plus the non-functional block, plus the conditional modules (AI-interaction, voice, platform) when they fire | A new product |

   Either entry mode can run at any depth: an existing PRD can be audited against six questions or against
   all thirty. The depth is chosen once at session start — the agent proposes, the human confirms — and D5's
   escalation rule owns the upgrade path: a repeated weak answer at Scope check means proposing a step up,
   never grinding on.

   **Cut during the grill — the organisation-diagnosis material.** Two pieces go, for one reason. The source's
   **"five questions before the twelve"** are written for someone newly arrived in an organisation, and
   **Stage 10 ("the first ninety days")** is that material at length — Watkins' STARS model plus Pavilion's
   fifteen. Four of the five come straight out of Stage 10, so cutting the summary set and keeping its source
   would have been incoherent. All of it presupposes an organisation the wave-1 user does not have: nobody
   above them to agree with, no reporting stack to distrust, no sacred cow to name. It returns only if a path
   is ever built for someone running this on an organisation they have joined, which is unevidenced (see the
   guest assumption). What remains is **stages 1–9: 65 attributed questions**, from which each depth selects.

6. **The posture.** One question at a time. The person answers; the agent scores the answer against
   that question's weak-answer note, pushes back once if it is thin, records the decision or a
   weak-answer flag, and moves on. **The agent judges form, never substance.** It may say an answer names
   no number, no user or no alternative — that is what the weak-answer note is for — and it may refuse to
   record a decision with no evidence link. It may not say an answer is wrong, and it may not supply the
   content that is missing. The line is checkable after the fact in a transcript, which matters because it
   is the honesty claim the whole pack rests on.

7. **Look it up.** An answer is needed eventually, so being stuck has a way out that does not break MVP 6's
   line. On any question the person can ask the agent to search, or paste a source. The agent fetches
   (`WebSearch` / `WebFetch`, already fenced in `chat.mjs`), shows what it found with URLs, and may quote or
   summarise it **attributed to that source**. Every source actually used files itself into the evidence
   ledger as a `secondary-source` row. The person still writes the answer. Quoting a source is not a
   finding, so the honesty line holds, and this is the affordance that makes MVP 10's domain rows reachable.

8. **Park it.** If the answer still is not there after looking it up, the question records as an **open
   question with the reason for parking it** and the session continues. It carries into the generated PRD's
   open-questions section, so it stays visible rather than being lost. It also trips the right guard: the
   "not a form" metric counts consecutive questions with no decision and no weak-answer note, so parking
   four in a row shows up as a problem rather than passing quietly. Blocking on an unanswerable question is
   precisely the pre-mortem's form nobody finished, so blocking is not available.

9. **The escape hatch.** An "ask something else" input at every step. The agent answers, then **files
   the exchange** against whichever banked question it touched. When it touches none: **if the exchange ends
   in the human making a choice, it files as a decision carrying the same evidence link and wrong-if line as
   a banked one; otherwise it files as a new open question.** Dropping it is never available — every
   off-script exchange files something. The door exists so the session can go where it needs to; the filing
   is what stops the door becoming an unrecorded side channel.

10. **The run package** — answers, decisions, and an evidence ledger where every row carries a
    provenance label (real-interview · secondary-source · assumption · fictional-scenario). A decision
    without an evidence link is flagged, not silently accepted. Three rules:
    - **Traceability upward.** Every solution-level decision names the stakeholder requirement it serves,
      and every stakeholder requirement names the business requirement it serves. The same rule the repo
      already runs below the component line, one layer up. An orphan at any level is flagged, exactly as a
      decision with no evidence link is.
    - **Assumption is honest for the product, not for the domain.** The brand under discovery may be
      invented; the domain is not. A claim that is checkable and public — Confirmation of Payee is a real
      scheme, APP scam reimbursement is real regulation, a Faster Payment cannot be recalled — must carry a
      `secondary-source` row with a URL, and MVP 7 is how it gets one. Product-shape decisions carry labelled
      assumptions with wrong-if lines and that is the expected result. **Filing a checkable fact as an
      assumption is a failure**, and it is what separates a diligent run from a lazy one.
    - **A transition note is the pack's seventh artefact, triggered by organisational change rather than by
      branch label.** D9 currently lists six, and none of them covers getting an organisation from today's
      state to the built one: data migration, training materials, support setup, business continuity. It is
      **required when the product changes how an organisation works**, and markable n/a with a reason
      otherwise. The pre-grill draft tied it to the internal-tool and regulated branches and then claimed
      Faster Payment — the regulated run — needed none of it; both could not hold. Tying it to org change
      resolves that: Faster Payment is a new consumer flow replacing no process, so n/a is honest and carries
      a reason, while an internal tool replacing a spreadsheet cannot claim it.

11. **The generated PRD.** Projected from the run package into the house PRD shape (problem · evidence ·
    hypothesis · users · MVP · metrics · non-goals · open questions). The human edits the result. This is
    the artefact handed to `plan-architecture` next, and it is what makes the session worth having.

12. **Run 1 — Faster Payment, blank-idea mode, full depth, regulated branch.** The input is one sentence —
    *"Meridian needs to let a customer pay someone they've never paid"* — committed before the run, with no
    screens, no CoP and no scam stop in it.

    **The scoring key is four decisions, not thirty-three.** `_portfolio/decisions.json` holds m-005…m-008
    for `faster-payment`, all solution-level, none naming a parent. Scoring a discovery run against
    solution-level screen decisions grades it on a layer this epic explicitly does not produce, so the key is
    used the other way up: **does the run produce the business and stakeholder requirements that m-005…m-008
    turn out to serve?** Judged after the fact by whether each of the four traces to one.

    **Sealed pre-registration — validation scaffolding for this run only, not part of the product.** The
    owner wrote m-005…m-008 and their reasons, and the owner is the one answering the bank, so keeping the
    key out of the agent's context guards nothing: the key is in the answerer. Before the run, the owner
    writes the parents they would give unaided and commits that file. The run then yields two readings: the
    trace-up score against the key (the target), and **what the run reached that the sealed answer did not** —
    the bank's marginal contribution, which memorising the key cannot inflate. A genuine discovery session on
    a new product has no sealed file and no key, because there is nothing to score against. This is
    measurement apparatus for validating the epic, and it is not a step in the workflow.

13. **Run 2 — this PRD's pre-grill snapshot, existing-PRD mode.** The fixture is
    `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` (md5 `ab6eb0ee6cdd3b7802ecfcbe90db2377`),
    frozen before this rewrite. Run 2 feeds it into the existing-PRD entry mode and scores what it finds
    against this grilling session's findings. It earns its place three times over: it exercises the entry
    mode run 1 does not touch, the product under discovery has a model so the **AI-interaction module fires**
    across all six areas, and the key is one the owner **did not author** — the owner wrote the document, not
    the gaps in it. Contamination is therefore far lower than run 1's.

    The key — the eight findings this grill produced, held out of the run: the scoring key was four decisions
    and not thirty-three, and they sit a layer below what the run produces · the transition-note rule
    contradicted its own worked example · role-title framing sat inside a product tool · the AI module had no
    run behind it · the existing-PRD entry mode was never specified · "parity" was promised across two front
    ends that produce different artefacts in different places · the five-questions prefix and Stage 10
    presupposed an organisation the user does not have · "full discovery, ~30, all ten stages" was wrong twice,
    over a bank holding 65 questions in nine usable stages, in an appendix the draft had not read.

14. **First slice — one question, one decision, one file.** Everything above is width. The spine is: the
    portal asks a single banked question, the person answers, the agent pushes back once if the answer is
    thin, and it writes one decision with an evidence link into a run package on disk. That proves the
    posture, the file format and the stream in one pass. Branches, depths, the AI module, look-it-up, PRD
    generation and the second entry mode are added on top of a spine that already works, and each can be
    judged on its own.

**Door check.** Two-way throughout. The bank is data, the run package is files, the portal is local and
undeployed, no recorded decision is amended, and the terminal is not touched. The one-way doors in the
thinking doc — retiring the baked-in prototypes (D19), the §8 amendments (D1) — are all outside this epic,
and D19 carries its own "replace, then remove" guard for when it arrives.

## Success metrics

| Metric | Target | How measured | Cobra check → guardrail |
|---|---|---|---|
| **Switch** | The next real discovery session starts in the UI | Which front end was used, recorded in the run package | Could be forced once out of loyalty → the **second** unprompted session must too, or the switch didn't happen. `/think` stays installed and unmodified so the alternative is genuinely available |
| **Completion** | Run 1 reaches a generated PRD in one sitting | The run package exists and the PRD is generated | Gamed by shrinking the bank → **coverage of the twelve-question opening set** reported with it |
| **Independent reach (run 1)** | **4/4** of m-005…m-008 trace to a business or stakeholder requirement the run produced, and **≥1** run kill criterion matches a published `would_measure` | Post-hoc trace against `_portfolio/decisions.json` | Gamed by leaking the answer into the input → the one-sentence input is **committed before the run**, and the key must be **fenced, not merely unmentioned**: `decisions.json` sits under `JOBS_DIR`, which is `chat.mjs`'s own `cwd` with `Read`/`Grep`/`Glob` allowed, so it takes a `canUseTool` deny on that path (and on the sealed file) to hold |
| **Marginal reach (run 1)** | _No pre-set target — reported, not passed._ What the run reached that the sealed pre-registration did not | Diff of the run's parents against the sealed file | The answerer wrote the key, so the trace-up number alone is an upper bound. This row is the part memory cannot inflate, and it is the honest read of what the bank added |
| **Gap finding (run 2)** | Share of this session's eight findings independently reached from the frozen fixture | Found/missed against the list in MVP 13 | Gamed by re-reading the grilled PRD → the fixture is byte-frozen at md5 `ab6eb0ee`, but the findings list is **printed in this file**, one directory up from the fixture. The run needs a `canUseTool` deny on `docs/epics/discovery-partner.prd.md` as well. Same class of problem as run 1: the key is inside the working directory, so omission is not a fence |
| **Auditability** | Every decision in the pack has an evidence link and a wrong-if line; every evidence row has a provenance label; every checkable domain claim carries a `secondary-source` URL | Checked over the run package | Gamed by labelling everything "assumption" → a decision resting only on assumptions is **flagged in the pack**, and a checkable fact filed as an assumption is a **failure**, not a flag |
| **Not a form** | Never more than 3 consecutive questions recorded with no decision and no weak-answer note | Counted within a run; a parked open question counts as neither | An agent that flags everything → weak-answer flags are a reported rate, not just a floor |
| **Disclosure held** | Always-loaded context ≤ **11k tokens** | Measured: CLAUDE.md words + every skill description | Split Tier 0 into references a hook re-injects anyway → the budget is on what a session **loads**, not on file count. Baseline after the 2026-08-27 trim: **9.5k** (2,761-word CLAUDE.md + 73 skill descriptions at ~80 tokens each). This epic adds no skills (C1, MVP 3) and the bank is read at run time, so the only always-on cost is a CLAUDE.md section on the run package: est. 400–650 tokens against ~1.5k headroom |

## Non-goals

- **No CLI parity, and no toggle.** `think`, `grill-me` and `plan-create-prd` are not moved, rewired or
  matched to the run package. The bank is a data file only the portal reads. Building the terminal side
  would neutralise the independent variable (see Thesis) as well as costing work on the losing path.
- **No changes to the global `think` skill.** C1. It is daily-use across other projects and this epic does
  not touch it. Deleting or amending it would also destroy the control the wrong condition needs.
- **No quality-attribute enforcement.** The non-functional block elicits and records; nothing in this epic
  wires an elicited answer into build-checks. That connection is a later epic.
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
  screeners, the ledger — and never research findings. Quoting a fetched source under MVP 7 is attribution,
  not a finding. Synthetic material exists only as labelled fixtures.
- **No hand-written content presented as a run's output.** The honesty contract, unchanged.

## Open questions

- [ ] **Does the scripted bank actually beat open conversation for completion?** Chosen on pre-mortem
      reasoning; only run 1 can answer it. If the bank is abandoned mid-run in favour of the escape hatch,
      the posture was wrong.
- [ ] **Three branches ship with no run behind them.** B2B SaaS, internal tool and consumer are built in
      wave 1 and unexercised. Recorded as a known debt rather than a validated design; the first run that
      uses one is what tests it.
- [ ] **How the postures are expressed in code.** The workflow is three POSTURES with three outputs —
      think (diverge and decide), create-PRD (interview into an artefact), grill (attack it). Three is the
      working assumption, not one per phase. G13 settles the *bank's* home (a data file both the portal and
      any future reader can load); what is open is whether the posture bodies sit beside it or in the portal.
      Decided in `plan-architecture`.
- [ ] **Q2b** (deferred to the canvas epic) — is drag-to-reorder within a frame's layout grammar enough,
      or must a component sit at an arbitrary pixel inside a frame?
- [ ] **Q6** (deferred to the canvas epic) — an operator canvas in the portal mounting the studio
      modules, or `studio.html` promoted?
- [ ] **Marketplace** as a fifth product-type branch — deferred until a run needs it.
- [ ] **Unguarded deadline risk.** The signal is run-triggered by choice; the thinking doc's pre-mortem
      #1 ("no real product ever went through") has no calendar behind it. Accepted, recorded.

**Closed during the 2026-08-27 grill:** the "independent reach" target (MVP 12 · Success metrics) ·
the escape hatch's filing rule (MVP 9) · the scoring method for independently reached (MVP 12) ·
whether the 44px bar applies to the CLI path (no CLI path exists — non-goals) · parking the inputs
(Inputs, both parked under `docs/research/`) · skills under the Agent SDK (MVP 3 — nothing depends
on the answer) · the transition-note contradiction (MVP 10) · the existing-PRD entry mode (MVP 2) · what "full discovery" means (MVP 5 — nine stages, ~30 selected from 65).

## Architecture

Architecture: [discovery-partner.architecture.md](./discovery-partner.architecture.md) — decided 2026-08-27.

The following thinking-doc decisions were deliberately **left open here as engineering** and are
settled in that doc: **D3** (agent topology, the PreToolUse fence — now also covering MVP 7's
fetch path) · **D4** (skill tiers, `disable-model-invocation`, the disclosure mechanism) · **D14** (hooks,
the CLAUDE.md split, `.mcp.json`, per-surface priming) · **D16** (run-package layout, including where a
parked open question and a filed off-script exchange sit in it) · the bank's storage format · the SSE/session
model for a staged run · **the run fence** — both scoring keys sit inside the agent's own
working directory (`_portfolio/decisions.json` under `JOBS_DIR`; run 2's findings list printed in this PRD,
one directory above its fixture), so run 1 and run 2 each need an explicit `canUseTool` deny-list rather than
an omission. Naming the paths is architecture's job; the requirement is recorded here.

Deferred to later epics with their own PRDs: **D6/D7** (canvas and import, plus Q2b/Q6) · **D1's guest
path** (auth, budget Worker, the two §8 amendments) · **D11** (a11y gating) · **D19** (retiring the
baked-in prototypes) · wiring elicited quality attributes into build-checks.

**Related:** [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) (§8 unamended by this epic) ·
[prototype-studio.prd.md](./prototype-studio.prd.md) (§Non-goals unamended by this epic) ·
[st-ux-fusion.prd.md](./st-ux-fusion.prd.md) (the method spine this layers onto) ·
`docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` (run 2's frozen input)

---

## Amendments

**2026-08-28 — execution order re-sequenced; nothing in this document changed.** The problem, the
evidence, the thesis, the hypothesis, the MVP list, the metrics and the non-goals all stand as written.
What was amended is epic #279's §Suggested execution order, and only that: the original waves reached a
real session at wave 6 of 7, while this PRD's own success signal **is** a real session — *"the owner's
next real discovery session starts in the UI rather than the terminal."* Five tickets (#283 branches,
#285 session rules, #286 the other postures, #287 the read fence, #289 the three affordances) were
specified from reasoning and scheduled before the one run that could say whether they are needed; they
are deferred until after it, unchanged and unclosed, each carrying the specific question that run
answers for it.

The re-sequence also surfaced a gap in the ticket graph rather than in this document: **no ticket
produced the session the hypothesis measures.** #291 is Faster Payment, a published pack used as a
scoring key; #292 is the pre-grill fixture in audit mode. Both are pre-registered measurements against
material that already exists, and neither is the owner's next real product. #338 (Run 0) was created for
it, depending on #284 and #290 only, with `real` provenance — so it lands in the jobs folder and is
never committed here (R1).

The one finding that would justify amending this document rather than the order is Run 0 showing the
bank asks the wrong questions or the op grammar cannot express something the product needed. That would
be recorded here, dated, as a further amendment.

**2026-09-01 — the op grammar could not express two things `file_evidence` needed; amended under the
op-verb lock (#347). Intent unchanged.** The trigger the entry above reserved fired on #338's
full-depth rehearsal and its F6 re-record. (1) An artefact with an identity of its own — "the Q3
dispensing spreadsheet" — had no row of its own: `file_evidence` took `url` or `ref`, and `ref` names a
stored answer, so a named artefact was only a pointer at the sentence that mentioned it. It now takes
`name`, a label the agent gives, accepted only beside a `ref`; MVP 6's invariant holds — no parameter
carries answer text. (2) The run's provenance is a session-start choice in `run.json` and reached
neither prompt, so the re-recorded parenting fixture filed four `real-interview` rows on a fictional
run — the strongest honest label an agent that cannot see which run it is in can give. The system prompt
now carries the run's provenance (`PROVENANCE_RULE`), and the fixture re-recorded under it files
`fictional-scenario`. Decided against for now: an applier refusal of `real-interview` on a fictional
run — it changes the ctx contract for every applier caller, and the prompt was observed sufficient on
the re-record; it is the fallback if a later run shows otherwise. The MVP list, the metrics and the
non-goals stand as written.
