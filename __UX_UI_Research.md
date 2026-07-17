# __UX_UI_Research

**The intellectual base of the portfolio — and the playbook for applying it to UX/UI engineering roles.**

This document turns four bodies of work into one coherent operating model, then maps that model onto the jobs I'll apply for. Every concept is defined in plain language, with a concrete example and a note on why it matters for hiring — so it's usable as interview prep, not just theory.

- **Shape Up** (Ryan Singer / Basecamp) — how I *decide and pace* work.
- **Hooked** (Nir Eyal) — how I *design for behaviour*, with an ethics gate built in.
- **Research & evidence** (the Marvin "prove the value of research" playbook) — how I *know it worked*.
- **Design systems + UI engineering craft** (this repo, `ux-factory`) — how I *ship it*.

The thesis in one sentence:

> I'm a **Design Engineer** — I live between design and front-end — and my differentiator isn't that I can build screens. It's that I bring a *complete, sourced product methodology*: I can shape ambiguous work into fixed-time bets, design for real behaviour without dark patterns, prove the outcome with evidence, and ship it as a systematised, token-driven design system.

---

## 1. The role I'm targeting — and what it's actually screened on

The role goes by several names: **Design Engineer**, **UX Engineer**, **Front-of-the-Front-End Engineer**, sometimes **Product Designer (prototyping)**. It's the hybrid seat: fluent enough in design to make product/interaction decisions, fluent enough in code to ship them. Companies that hire it well (Vercel, Linear, Stripe, Shopify, and any org with a serious design system) evaluate roughly seven things:

| # | What they screen for | The phrasing you'll literally see in the job description | What "great" looks like |
|---|---|---|---|
| 1 | **Front-end craft** | "Expert HTML/CSS/JS; proficient in React (or Vue/Svelte)" | Semantic markup, modern CSS, no jank, ships production code |
| 2 | **Design-system fluency** | "Build and maintain our component library / design tokens" | Tokens, clean component APIs, Figma↔code parity, docs |
| 3 | **Interaction & motion craft** | "High attention to detail; loves polish and micro-interactions" | Timing, easing, state transitions — UIs that *feel* right |
| 4 | **Accessibility** | "WCAG 2.1 AA; builds inclusive experiences" | Keyboard, focus order, correct (sparing) ARIA |
| 5 | **Performance** | "Cares about Core Web Vitals / page speed" | Knows LCP/INP/CLS and what's safe to ship |
| 6 | **Product sense** | "Partners with PM/design to shape what we build" | Can push back, scope, and explain *why* a thing is worth building |
| 7 | **Collaboration & communication** | "Bridges design and engineering" | Makes reasoning legible to both sides |

Most candidates cover 1–5 (the technical half) and hand-wave 6–7 (the judgment half), because 6–7 are hard to *prove*. **My whole framework exists to make 6–7 as demonstrable as 1–5.** That's the wedge — it's what separates a mid-level "implementer" offer from a senior "decision-maker who also implements" offer.

---

## 2. My operating model — the four-layer loop

Each layer answers a different question. Together they run as one loop on Shape Up's cadence. Every named technique below gets: **what it is → a concrete example → why it matters in an interview.**

### Layer A — Shape Up: *how I decide and pace work*

- **Appetite** — *A budget, not an estimate.* You don't ask "how long will this take?"; you ask "how much time is this worth?" and design a solution to fit. **Example:** "A saved-filters feature is worth ~2 weeks, not 6, so we shape something that fits 2." **Why it matters:** shows you can trade scope against time instead of letting projects balloon — the #1 thing that makes eng managers trust you.
- **Breadboarding** — *Sketching a flow as places + affordances + connection lines* (like an electrical breadboard), with zero visual design. **Example:** `Inbox → [reply button] → Compose screen → [send] → back to Inbox`. **Why it matters:** proves you can reason about a flow's logic before pixels — the skill designers and PMs most want an engineer to have.
- **Fat-marker sketch** — *Drawing with a marker so thick you physically can't add detail*, keeping the idea at the right altitude. **Why it matters:** signals you know when *not* to over-invest early.
- **Rabbit holes** — *Unsolved unknowns that could silently blow the appetite.* You hunt for and defuse them during shaping. **Example:** "Does our auth provider even support this? If not, that's a rabbit hole — resolve it before we bet." **Why it matters:** de-risking is a senior behaviour.
- **No-gos** — *Things you explicitly declare out of scope in writing.* **Example:** "No bulk-edit in v1." **Why it matters:** shows you scope by subtraction, not just addition.
- **Betting table** — *The meeting where leadership picks which shaped pitches get a 6-week cycle.* No backlog — old ideas either get re-pitched or die. **Why it matters:** you understand prioritisation as a deliberate bet, not a to-do list.
- **Circuit breaker** — *If a project isn't done at the end of the cycle, it does NOT auto-extend* — it must be re-pitched to win more time. **Why it matters:** prevents zombie projects; shows you respect fixed timeboxes.
- **Scopes** — *Slices of the project organised by area of the product* (e.g. "the compose screen," "notifications"), not by person or by front-end/back-end. Each is independently shippable. **Why it matters:** this is exactly how you break down a build task in a real standup.
- **Hill chart** — *A progress visual: uphill = "still figuring it out / unknowns remain," downhill = "known work, just executing."* It shows **confidence, not % done.** **Example:** "The API integration is over the hill; the empty states are still uphill." **Why it matters:** it's a far more honest status update than "80% done," and interviewers notice when you talk this way.
- **Scope hammering** — *Aggressively cutting scope to hit the appetite* instead of extending the deadline. **Why it matters:** the practical muscle behind "we shipped on time."

### Layer B — Hooked: *how I design for behaviour (with ethics)*

The Hook Model — **Trigger → Action → Variable Reward → Investment** — used as a *design lens*, not a growth hack.

- **Trigger (external vs internal)** — *External* = a cue in the environment (a notification, a button). *Internal* = an emotion or situation stored in memory that cues the behaviour on its own. **Example:** the external trigger is a Slack badge; the internal trigger is *feeling out of the loop*. **Why it matters:** great products graduate from external to internal triggers — knowing this shapes onboarding design.
- **5 Whys → internal trigger** — *Keep asking "why" until you hit an emotion.* **Example:** "Users want a dashboard" → why? → "to check status" → why? → "so they don't get blamed for a miss" → the real internal trigger is *anxiety about being caught off guard*. **Why it matters:** it's how you turn a vague feature request into a real problem statement.
- **The narrative** — *"Every time the user [internal trigger], they [intended behaviour]."* **Example:** "Every time a PM feels anxious before a review, they open the dashboard." This one line can headline a Shape Up pitch.
- **Fogg Behaviour Model (B = MAP)** — *A behaviour happens only when **M**otivation, **A**bility, and a **P**rompt (trigger) coincide.* The key lever is **Ability — make the action easier — not motivation.** **Why it matters:** "reduce friction before you add persuasion" is the single most practical idea in behavioural design, and it directly drives UI decisions.
- **Ability / friction factors** — the six things that make an action hard: **time, money, physical effort, brain cycles (confusion), social deviance, non-routineness.** A *friction audit* walks a flow and removes these. **Example:** cutting a 5-step signup to 2 by dropping fields that cause "brain cycles." **Why it matters:** this is literally UX work, framed rigorously.
- **Variable reward (three types)** — **Tribe** = social rewards (likes, replies); **Hunt** = resources/information (a feed, search results); **Self** = mastery/completion (streaks, progress bars, "inbox zero"). **Why it matters:** naming the reward type tells you *why* a feature is engaging and whether it's the right kind of engaging.
- **Investment** — *A small "bit of work" the user puts in that makes the product better for them and "loads the next trigger."* **Example:** following people (loads the next feed), adding data, building a reputation. **Why it matters:** it's the difference between a product users try once and one they can't leave.
- **Manipulation Matrix (the ethics gate)** — a 2×2 on two questions: *"Does it materially improve the user's life?"* and *"Would I use it myself?"*
  - **Facilitator** (improves life ✓ / I'd use it ✓) — the goal.
  - **Peddler** (improves life ✓ / I wouldn't use it ✗) — warning: you may be overselling.
  - **Entertainer** (improves life ✗ / I'd use it ✓) — fine in moderation.
  - **Dealer** (improves life ✗ / I wouldn't use it ✗) — exploitation. Don't.
  - **Why it matters:** being able to place your work on this grid *out loud* is a strong senior/ethical signal (see §5).

Two non-negotiables: run the Manipulation Matrix as a real gate, and remember **not every product is a habit product** — for utility/B2B tools people should get in, do the job, and leave, optimising for "return frequency" is the *wrong* goal and makes the product worse.

### Layer C — Research & evidence: *how I know it worked*

Shape Up is deliberately light on user research; this layer fills the gap.

- **Leading vs lagging indicators** — *Leading* = an early signal that predicts success (e.g. activation rate, first-week usage); *lagging* = the outcome itself (retention, revenue). You define both *before* you bet. **Example:** leading = "% who create a project in day 1"; lagging = "30-day retention." **Why it matters:** shows you tie work to measurable outcomes — catnip for data-literate teams.
- **Insight repository** — *A searchable home for what you've learned about users.* Shape Up rejects a *feature* backlog, but you still need an *insight* backlog so evidence isn't thrown away. **Why it matters:** demonstrates you think about organisational memory, not just the next ticket.
- **Closing the loop** — *In cool-down, measure whether the bet moved the indicator, then write it down.* **Why it matters:** most teams never check if a feature worked; saying you do is a differentiator.

### Layer D — Design systems + UI craft: *how I ship it*

This is `ux-factory` itself — a real, working artifact (see §4). Token-contract architecture, token-only components, accessibility and performance as defaults, and a machine-readable "agent-layer." This is the concrete, demoable half of the portfolio. The pages themselves are built by **Wright** — the agent that assembles token-only UI from the contract, so every page stays on-brand and drift-free by construction.

### The combined loop

| Shape Up stage | Hooked lens (which exercise) | Research artifact | Craft output |
|---|---|---|---|
| Raw idea | Ex 1 — problem, intended behaviour, *frequency filter* | Existing insights / interviews | — |
| Shaping | Ex 2 — 5 Whys → internal trigger → the narrative | Discovery interviews | Breadboard + fat-marker sketch |
| Shaping (solution) | Ex 3 — Fogg friction audit; Ex 4 — the reward/payoff | Usability signal | Roughed elements, scoped to appetite |
| Betting table | Ex 6 — **Manipulation Matrix gate** | Leading/lagging indicators for the bet | Go / no-go |
| Building (6 wks) | Ex 5 — investment / "load the next trigger" | Self-serve repository during cycle | Shipped, token-built component |
| Cool-down | Ex 7 — habit testing, % returning / 60d | Measured outcome → back into repository | Post-mortem, docs |

---

## 3. How each layer maps to what employers screen for

The crux — the translation from "things I read" to "things I get hired for." The last column is a sentence you could actually say in an interview.

| Hiring criterion (§1) | Layer | Concrete way I demonstrate it |
|---|---|---|
| Front-end craft | **D** | "Here's `ux-factory`'s source — a no-framework token system with clean, literal-free components." |
| Design-system fluency | **D** | "The whole site re-skins from one `<head>` line because components only reference semantic tokens, never raw values." |
| Interaction & motion craft | **D** (+ §6) | "I QA interactions against Rauno Freiberg's Web Interface Guidelines — focus states, hover intent, reduced-motion." |
| Accessibility | **D** | "A11y lives in the token contract, so every component inherits correct contrast and focus by default." |
| Performance | **D** | "I check features against Baseline before standardising them, and watch INP on interactions." |
| **Product sense** | **A + B + C** | "Given a vague ask, I 5-Whys it to the real trigger, run a Fogg friction audit on the flow, and name the metric that would prove it worked." |
| **Collaboration & communication** | **A + C** | "I report progress on a hill chart — confidence, not percentages — so design and eng see the same reality." (And the shipped site performs this criterion on the reader: it teaches its own reasoning as you read it — §10.) |

---

## 4. The portfolio is the proof (not a claim about the proof)

The strongest move: **the portfolio site is itself the artifact it describes.** `ux-factory` demonstrates the craft layer live —

- **Token-contract architecture** — `tokens.contract.css` (the semantic contract, every token with a neutral fallback) → a client pack (`tokens.<company>.css`) → `components.css` (token-only, zero literals). Most candidates *talk* about this; here it runs.
- **Re-skin an entire site in one line** — swap one `<head>` link and the whole brand changes. A concrete, demoable systems result.
- **Config-driven chrome** — header/footer/nav injected from a `CLIENT_CONFIG` object, not hard-coded per page.
- **A machine-readable "agent-layer"** — generators emit `llms.txt`, JSON-LD structured data, and derived token/decision files. Signals I design for the *next* consumer of interfaces (agents/LLMs), a genuinely current differentiator.

### A fully worked case study (use this shape for every project)

Here's the template *filled in* with `ux-factory` so you can see the altitude — then reuse the five headings for each real project.

> **1. Problem & appetite** — Re-theming a portfolio site per prospective employer meant hand-editing CSS across every page: hours of work, easy to get inconsistent. Appetite: this is worth a systems fix, ~1 cycle, not an endless refactor.
>
> **2. Shaping** — The real job (5 Whys): not "change colours" but "prove I can build a *system*, and make each application feel bespoke without bespoke effort." Breadboard: `page → contract layer → client pack → components`. Rabbit hole resolved early: can components reference *only* semantic tokens with no literals leaking in? No-go: no build step / framework — it stays vanilla.
>
> **3. Behaviour & ethics** — Fogg friction audit on *my own* re-skin workflow: the friction was "brain cycles + time" (remembering which files to touch). Fix: collapse re-theming to a single edit. Manipulation Matrix: Facilitator — it genuinely saves work and I use it myself.
>
> **4. Build** — Three ordered stylesheets; a `CLIENT_CONFIG`-driven chrome; a11y and contrast baked into the contract so components inherit them. Scope hammered: shipped the token system and neutral pack first, deferred per-client packs.
>
> **5. Outcome** — New-client theming went from hours of scattered edits to **one line in each page's `<head>`.** Bonus: an agent-layer that makes the whole system machine-readable. *(State the metric honestly; if something was cut or failed, say so — that reads as senior.)*

### Résumé-bullet formula — one per layer
`[Shaped/designed/built] [what] under [appetite/constraint] → [measured outcome], using [craft].`
- **Craft (D):** *"Built a token-contract design system enabling one-line multi-brand re-skinning; cut per-client theming from hours to a single edit."*
- **Process (A):** *"Shaped an ambiguous 'make it configurable' ask into a 2-week bet by cutting scope to a neutral base pack, shipping on time instead of slipping."*
- **Behaviour (B):** *"Ran a friction audit that removed 3 of 5 signup steps, lifting first-session completion."* *(fill with a real number)*
- **Evidence (C):** *"Defined leading/lagging indicators up front and closed the loop in cool-down, killing one feature that didn't move activation."*

---

## 5. Interview toolkit

**STAR stories — one per layer** (these are *illustrative shapes*; swap in your real projects):
- **A — Shaping/scoping:** *"We were about to slip a deadline. I re-shaped the work, declared two features no-gos, and hammered scope to hit the date — we shipped the core on time and added the rest next cycle."*
- **B — Behaviour/ethics:** *"A stakeholder wanted a confirmshaming pattern to boost opt-ins. I placed it on the Manipulation Matrix — it was Dealer territory — and proposed a clearer opt-in that converted nearly as well without the guilt."*
- **C — Evidence:** *"I'd assumed users wanted more settings. Five interviews showed the opposite — the default was the problem. We changed the default instead of adding options."*
- **D — Craft:** *"Components were drifting because everyone hard-coded colours. I introduced a semantic token contract so a re-skin is one line — and drift became structurally impossible."* *(this one is real — it's `ux-factory`.)*

**Questions I ask them** (each signals I understand the craft):
- *"How do you decide **what** gets built — is there a shaping or discovery step before eng picks it up?"* → tells me if they think about the front of the process.
- *"Who owns the design system, and how do tokens flow from Figma to code?"* → tests design-system maturity.
- *"How do you measure whether a shipped feature actually worked?"* → surfaces whether they close the loop.
- *"Where does the design-engineering seat sit — closer to design or to eng?"* → tells me how I'd actually spend my days.

**Ethics as a differentiator, not a liability:** I bring up the Manipulation Matrix and dark-pattern awareness *on purpose*. In 2026, teams increasingly screen against growth-at-all-costs designers, so "I design engagement, and I know exactly where the ethical line is" reads as senior.

---

## 6. How I stay current (the sourced layer)

Part of the pitch is *where my ideas come from*. Condensed library (full annotated list lives in the research thread):

- **Process**: Shape Up (`basecamp.com/shapeup`), Ryan Singer (`ryansinger.co`), Bob Moesta / JTBD — the bridge from process to behaviour.
- **Behaviour + ethics**: Nir Eyal, BJ Fogg (`behaviormodel.org`), Growth.Design, Deceptive Patterns (`deceptive.design`), NN/g.
- **UI craft & front-end**: Josh Comeau, Ahmad Shadeed, Rauno Freiberg (Web Interface Guidelines), Emil Kowalski (motion), `web.dev`.
- **Design systems & tokens**: Design Tokens Community Group (W3C — first stable spec, Oct 2025), Style Dictionary, EightShapes (Nathan Curtis), Component Gallery.
- **Case-study libraries**: Built for Mars, Growth.Design, Mobbin, Baymard.

**Top ten to name-drop credibly:** Shape Up · Ryan Singer · Nir Eyal · BJ Fogg · Growth.Design · Built for Mars · deceptive.design · Design Tokens CG · Style Dictionary · Rauno's Web Interface Guidelines.

---

## 7. Primary-source map — the Shape Up chapters behind Layer A

Every Layer A term above traces to a specific chapter of Shape Up (free at `basecamp.com/shapeup`). This is both the sourcing for the doc and a study index: to go deeper on any concept, read its chapter.

**Part 1 — Introduction**

| Chapter | Grounds | Link |
|---|---|---|
| 1. Introduction | The core premise: fixed time, variable scope; why this exists | `basecamp.com/shapeup/0.3-chapter-01` |

**Part 2 — Shaping** (the front of the loop / where Hooked Ex 1–4 plug in)

| Chapter | Grounds | Link |
|---|---|---|
| 2. Principles of Shaping | Working at the right altitude — concrete but not detailed | `basecamp.com/shapeup/1.1-chapter-02` |
| 3. Set Boundaries | **Appetite** (budget, not estimate) | `basecamp.com/shapeup/1.2-chapter-03` |
| 4. Find the Elements | **Breadboarding** + **fat-marker sketches** | `basecamp.com/shapeup/1.3-chapter-04` |
| 5. Risks and Rabbit Holes | **Rabbit holes** + **no-gos** | `basecamp.com/shapeup/1.4-chapter-05` |
| 6. Write the Pitch | The pitch = problem · appetite · solution · rabbit holes · no-gos | `basecamp.com/shapeup/1.5-chapter-06` |

**Part 3 — Betting** (where the Manipulation Matrix gate, Ex 6, sits)

| Chapter | Grounds | Link |
|---|---|---|
| 7. Bets, Not Backlogs | **No backlog** — old ideas die or get re-pitched | `basecamp.com/shapeup/2.1-chapter-07` |
| 8. The Betting Table | **Betting table** + **circuit breaker** | `basecamp.com/shapeup/2.2-chapter-08` |
| 9. Place Your Bets | Committing a team to one bet for the cycle | `basecamp.com/shapeup/2.3-chapter-09` |

**Part 4 — Building** (the 6-week cycle; where Ex 5 "investment" and craft live)

| Chapter | Grounds | Link |
|---|---|---|
| 10. Hand Over Responsibility | **Full team responsibility** (no task-master) | `basecamp.com/shapeup/3.1-chapter-10` |
| 11. Get One Piece Done | Integrate early — one slice working end-to-end first | `basecamp.com/shapeup/3.2-chapter-11` |
| 12. Map the Scopes | **Scopes** (slice by area, not by person/layer) | `basecamp.com/shapeup/3.3-chapter-12` |
| 13. Show Progress | **Hill charts** (confidence, not %) | `basecamp.com/shapeup/3.4-chapter-13` |
| 14. Decide When to Stop | **Scope hammering** + the circuit breaker in practice | `basecamp.com/shapeup/3.5-chapter-14` |

**Appendices** (adoption — useful for "how I'd bring this to your team")

| Appendix | Grounds | Link |
|---|---|---|
| 2. Adjust to Your Size | Scaling Shape Up up/down for team size — how I'd adapt it in practice | `basecamp.com/shapeup/4.1-appendix-02` |
| 3. How to Begin to Shape Up | Adopting it incrementally without a big-bang change | `basecamp.com/shapeup/4.2-appendix-03` |
| 6. Glossary | The canonical definitions backing §2's Layer A terms | `basecamp.com/shapeup/4.5-appendix-06` |

> **Interview use:** don't recite chapters. Do be able to say *"appetite comes from Set Boundaries, and it's a budget not an estimate"* — citing the source lightly signals you learned the method from the primary text, not a blog summary.

---

## 8. Honest positioning (what to lead with, what to grow)

- **Lead with the synthesis.** Plenty of people know one of these. Almost nobody threads *shaping + behaviour + evidence + a real design system* into one operating model. That combination is the brand.
- **Pick a process lane.** Shape Up (fixed-time, bet-based, anti-backlog) and the continuous-discovery school (Cagan/Torres, dual-track, opportunity trees) are *different philosophies*. Borrow deliberately; don't blend them into mush in an interview.
- **Don't oversell habit design.** Frame Hooked as a *lens I apply where a habit genuinely serves the user*, always paired with the ethics gate. Overselling it reads as junior.
- **Be honest about the growth edges** — name whichever of {framework depth (React internals), production motion at scale, large a11y audits, backend-for-frontend} is currently weakest, and show the resource I'm using to close it. Stating a growth edge *with a plan* reads as senior, not weak.

---

## 9. The creation process is the method performing itself

§4 says the *design system* is the proof. This goes one level further: the **factory that builds each application** — the per-company process of shaping an application, researching the company, and shipping it a bespoke site — should visibly *run* the four-layer loop, not just talk about it. The portfolio doesn't merely *describe* the method; the act of producing each application *is* the method performing itself. That's the strongest version of "show, don't tell" — and it's a genuinely current idea, because the process is assembled from composable **agent skills** (borrowed from Matt Pocock's open skills library, `github.com/mattpocock/skills`), each a named, reusable shape for one move.

Four of those shapes carry the loop:

| The move at creation-time | Which layer it performs | Borrowed shape |
|---|---|---|
| Intake interviews me one decision at a time and proposes an answer for each, reading the job post and the company's design system instead of asking — turning a vague opening into a scoped bet, out loud. | **A — Shape it** | *grilling* + *wizard* |
| Each case study is shaped from the raw pile — intake and research — one piece at a time, never leaning on an idea it hasn't earned yet. The case studies *are* the product, so this is where the craft shows. | **B/C — behaviour + evidence, told as a story** | *writing-fragments → beats → shape* |
| When a case study needs a real number or a fact only a former colleague holds, the process hands me the questions to send them rather than letting me invent a figure. | **C — Prove it, honestly** | *to-questionnaire* |
| Rather than one version per company, the process shows a few genuinely different takes side by side and I pick — cheap, because a re-skin is one line (§4). | **D — Ship it** | *prototype* / "design it twice" |

**The scope discipline is part of the point.** The rest of that skills library is about engineering the tool's own internals, not creating applications — and it's deliberately left out. Naming that boundary is the method being disciplined about scope (Layer A's *no-gos*), turned on the tooling itself. (One later addition survives that boundary on its merits: *teach*, §10 — reader-facing output, not tool internals.)

**One piece of the substrate is worth naming.** The moves above are the method; executing them still needs eyes. The factory reads the codebase by *structure* — where a token or component is defined, how a module is shaped — rather than by text search, through a small structured-search tool (`tooling/mcp/codebase_search.py`, from the same agentic-coding lineage as the rest of the setup). It's not a fifth move and never faces the reader; it's the plumbing that lets Wright find the right piece of the token contract, and lets the research step read a target company's design system by structure instead of grep. Named here so the ground the factory stands on is on the record.

One line to hold onto: **every stage of building an application is the method performing itself** — shaping at intake, behaviour and ethics in the write-up, evidence in the honest numbers, system in the one-line re-skin. The tool doesn't just produce the portfolio; it *is* the argument the portfolio makes.

---

## 10. The fifth shape — *teach*: educating the reader along the way

§9's four shapes carry the loop at creation time. One hiring criterion from §1 still has no shape carrying it: **#7, collaboration & communication — "makes reasoning legible to both sides."** It's claimed (hill charts, §3) but never *performed* on the reader. A fifth borrowed shape fills that seat: **teach** (same library, `productivity/teach`). It's different in kind from the other four — it doesn't perform a layer of the loop; it makes all four layers **legible** to the stakeholder reading the shipped application. The distinction it's built on: **rationale displayed is not rationale understood.** The decision-card and built-because organisms *record* the why; teach is the discipline for making a reader actually *hold* the why.

The pain it answers is real and organisational: decision records (ADRs) that nobody reads and nobody understands. The answer gets baked into the portfolio as **small educational nuggets along the build story** — the reader absorbs what good UX/UI product engineering looks like *while watching this product get made*, never in a separate lesson. That doubles as a work sample for stakeholder communication: the reader doesn't read a claim about criterion #7, they experience it. **Why it matters:** #6–7 are the hard-to-prove half of §1 — this is proof-by-experience, the same reflexive move as §4 and §9.

**The whole layer must be subtle.** It succeeds only if nobody would call it an education layer — no "💡 did you know" callouts, no learning badges, no progress trackers, nothing that announces pedagogy. The reader should experience it as *unusual clarity* ("I understood every decision on this site") and only in retrospect, if ever, notice they were taught. The moment the teaching is visible as a feature, it has failed — visibility is what turns education into condescension.

**Transplant the pedagogy, not the classroom.** The literal skill is a stateful tutor — missions, lesson files, learning-records, spaced retrieval across sessions. A shipped application is a visit-once utility, and Layer B's own frequency filter kills that temporal machinery (a hiring manager gives it 90 seconds; "come back for lesson 2" is the wrong target). What transfers is the discipline underneath:

| teach concept | in the factory / on the page |
|---|---|
| **Mission-grounding** (without it, "lessons feel too abstract") | Intake already reads the job posting — the factory *knows each reader's mission*. The same decision is framed per company: a11y-in-the-contract foregrounded for a company screening on accessibility, leading/lagging indicators for a metrics org. |
| **One tightly-scoped concept per lesson** | One decision per decision-card. As much restraint as addition — the antidote to rationale sprawl (§8: overselling reads as junior). |
| **Cite one high-trust primary source** | §7's chapter map, surfaced in miniature: *"appetite — a budget, not an estimate (Shape Up, Set Boundaries)."* Performs the sourced layer (§6) instead of claiming it. |
| **Zone of proximal development + cross-referencing** | Sequencing, not re-explaining. A reader arriving from the Approach page has already "learned" the four layers — cards build on that via anchors. The case study's five blocks become a deliberate chain, not five parallel paragraphs. |
| **Storage strength via effortful retrieval** | At most **one** guess-then-reveal moment: *"where would you put this pattern on the 2×2?"* → pick a quadrant → my verdict + what shipped instead. Effort is why they remember me in the debrief two days later. |
| **Teacher availability** | Built-because is already this: explanation at the moment of curiosity, triggered by an internal cue. Answering a question the reader actually asked is never condescending. |

**Where it lands — three insertion points.** (1) **Decision-cards become micro-lessons**: mission-hooked kicker, one concept, one concrete example, one source, an anchor to what it builds on. (2) **An opt-in "commentary mode" on case studies**: the same content re-rendered as a stepped sequence, holding the single guess-then-reveal beat (the ethics gate is the strongest candidate). (3) **A factory-time pass**: the intake's read of the company decides *which* decisions get the nugget treatment per application — cheap, because re-rendering is the factory's whole point. The deepest version of the idea: *the factory teaches each company, in its own language, why the thing is built the way it is.*

**The register — educate without patronising.** Condescension isn't fixed by softening copy; it's fixed by changing the **stance**: the subject of every sentence is the build, never the reader's ignorance. The model register is a director's commentary track — a practitioner thinking aloud about *this* work, education as a side effect of overhearing. The audience is mixed (a recruiter, a design lead who doesn't read code, an EM who's never read Eyal, a founder), and **inclusive** means the same nugget works for all four without any of them sensing it was written for someone dumber than them. The rules — the **voice contract**:

- **Phenomenon first, framework name last** — open with *"we were losing people at the third step,"* not *"per Fogg's B=MAP model."* The framework arrives at the end, as a caption with a source.
- **Gloss as appositive, never as paragraph** — *"an appetite — a budget, not an estimate —"* and keep moving. An expert reads it as care with terms; a newcomer reads it as a definition. The moment a definition gets its own paragraph, the reader has been enrolled in a course.
- **First-person testimony, never second-person prescription** — "the rule I design by," never "you should." The citation does quiet double duty: this is shared knowledge we both stand on, not wisdom being bestowed.
- **Pull, never push** — nuggets have no address of their own: no "Method 101" section, ever (that architecture patronises regardless of copy). They live at the point of decision, open on curiosity, and are always skippable with zero loss to the main narrative.
- **Comparing notes, never grading** — the guess-then-reveal has no "correct!" state, no score, no red X. Two professionals' judgments side by side: *"here's where I landed, and what I proposed instead."*
- **Close every loop** — a nugget that opens a concept without landing an outcome is homework. End on what the decision produced: *"so re-theming became one line."* (Layer B applied to the reader: a Hunt reward plus a little Self, resolved in seconds.)
- **Write to the most senior plausible reader; let everyone else overhear** — the master rule. Writing *down* to the least expert reader produces condescension; writing *up* while glossing carefully produces inclusion.

**The voice is a contract, like the tokens.** Register drift and colour drift are the same disease: a rule living in someone's head instead of in the system. These rules are written down so the writing shapes (§9) and Wright are held to them at generation time — the inclusive register must not depend on proofreading every build; it should be structurally impossible to lose.

**Guardrails, and the gate run on itself.** One interactive moment per application, not five — one is a differentiator, five is a theme park. And the mechanic itself goes on the Manipulation Matrix, out loud: does it materially improve the reader's day (they evaluate judgment faster and leave with something usable on Monday, whatever they decide about me — yes, if opt-in), and would I want a candidate's site to do this to me (yes — that's the honest test). **Facilitator by construction** — and *showing that the gate was run* is itself the senior signal. The generosity is the win condition: if a hiring manager closes the tab thinking *"I could steal that decision-record format for my own team,"* they learned without being taught at, and the ADR-that-teaches pattern just proved itself. Name it once, lightly — *"this is roughly how decision records read on teams I work with"* — and never pitch it again.

---

*Base document for the portfolio site. Layers A–C are the philosophy/approach content; layer D (`ux-factory`) is the working proof. Keep this file as the source of truth and let the site render from it.*
