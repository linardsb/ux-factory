# Question bank source

The full ideation question bank, extracted for `docs/epics/discovery-partner.prd.md`. This is Appendix D
of a longer research file — the unabridged version, with every attribution, every OBSERVED / DERIVED / THIN
label, every weak-answer note, and the sources list. (The same file carries an abridged §5 summary of this
material; the PRD's bank is seeded from what follows, not from that summary.) The rest of that research file
is hiring research with no bearing on the bank and is deliberately not carried here.

**Two omissions, both decided in the 2026-08-27 grill and both deliberate:**

- **Stage 10 ("the first ninety days")** is cut. It diagnoses an organisation you have just joined —
  Watkins' STARS model plus Pavilion's fifteen — and the discovery partner's user is one person starting
  their own product. There is nobody above them to agree with, and no reporting stack to distrust.
- **"The five questions before the twelve"** are cut for the same reason; four of the five come out of
  Stage 10.

Stages 1–9 hold **66** attributed questions. Full discovery selects roughly 30 of them: the twelve below,
plus the branch's own picks, plus the non-functional block, plus the AI-interaction module when the product
has a model in it.

Per C3 of the PRD, no role or seniority title appears in the bank, the UI, the run package or the generated
PRD. The attributions below name people and publications, which is what they were always for.

---

# Appendix D — The ideation question bank

*Raw lane brief as returned by the research agent, unedited.*

# Lane D — the question bank

A usable set of questions to ask when ideating a digital product, organised by stage rather than by framework. Every question carries an attribution and a note on what a weak answer sounds like.

Labels: **[OBSERVED]** the named source says it, with a link. **[DERIVED]** my synthesis, built on sourced material. **[THIN]** unverified, disputed or commonly misattributed.

Method: 34 searches, 24 page fetches, 20 of which returned usable text (four PDFs and two paywalled pages failed and are flagged where they affect a claim).

---

## Stage 1 — Problem framing

- **"What is our winning aspiration?" / "Where will we play?" / "How will we win?" / "What capabilities must be in place to win?" / "What management systems are required?"** — Roger Martin and A.G. Lafley, the strategy choice cascade. [OBSERVED] Martin is explicit that the cascade is iterative, not a form filled top-down. *Weak answer: an aspiration that is a revenue number, and a how-will-we-win that is a feature list rather than a reason a customer picks you.*
- **"What would have to be true for this option to work?"** — Roger Martin, the strategic choice structuring process. [OBSERVED] It converts advocacy into a testable condition: you stop arguing whether an option is good and name the barrier condition that decides it. *Weak answer: a list of things already true. If nothing on it could be false, nobody has named the bet.*
- **"Imagine we are a year into the future. We implemented the plan as it now exists. The outcome was a disaster. Write a brief history of that disaster."** — Gary Klein, *Performing a Project Premortem*, HBR, September 2007. [OBSERVED on method; the HBR PDF would not parse, so treat the phrasing as close paraphrase] Klein's grounding is prospective hindsight, which he reports lifts correct identification of future reasons by about 30%. *Weak answer: risks phrased as "adoption might be slow" — a premortem producing no politically awkward sentence has not been run.*
- **"How is this addressed today and what are the shortcomings to current solutions?"** — Sequoia Capital, *Writing a Business Plan*, under Problem. [OBSERVED] *Weak answer: "there is no solution today". There always is — a spreadsheet, an email thread, a person, or deliberate non-action.*
- **"Why?" then "Who?" then "How?" then "What?"** — Gojko Adzic, *Impact Mapping* (2012). The deliverable is the last question, not the first. [OBSERVED] *Weak answer: starting at What and reverse-justifying a Why — spot it because the Who is "users" and the How is "better UX".*
- **"If nobody solves this, what happens — to whom, how often, and at what cost?"** [DERIVED, from Sequoia's Problem prompt and Martin's barrier-condition logic] *Weak answer: "it's a bad experience". No frequency, no money, no named person.*

## Stage 2 — Demand and evidence

- **"Is there more than one way to address this opportunity?"** — Teresa Torres' test for whether a stated opportunity is a solution in disguise. An opportunity is "an unmet customer need, pain point, or desire". [OBSERVED] *Weak answer: only one way — you wrote down a feature and labelled it a need.*
- **"Why do you want [the proposed solution]?"** — Torres, the question that walks a request back up the opportunity solution tree. [OBSERVED] *Weak answer: the requester restates the feature in different words.*
- **"What has to be true for this solution to work, and which assumption is riskiest?"** — Torres' assumption-test layer; she argues assumption tests run in a day or two where idea tests take weeks. [OBSERVED] *Weak answer: a plan to "validate the idea" with one round of interviews — that tests everything at once, slowly, and confounds every assumption inside it.*
- **"What did you do the last time this happened? Show me the file, the thread, the tab."** [DERIVED] The discriminator between stated preference and revealed behaviour is tense and artefact: past-tense questions about a specific instance, with something to look at, versus hypothetical questions about what someone would do. *Weak answer: any sentence in the conditional. "I would definitely use that" predicts nothing; a spreadsheet they maintained for two years predicts a great deal.*
- **"Take me back to when you first realised you needed something different. What was happening that day?"** — the switch interview, Bob Moesta and Chris Spiek, Re-Wired Group: a retrospective timeline reconstructing the moment of purchase. [OBSERVED on method; exact opening wording varies by practitioner, so [THIN] on verbatim] *Weak answer: the interviewee describes general preferences — you have left the timeline and are collecting opinion.*
- **The four forces of progress — push of the situation, pull of the new solution, anxiety about the new, habit of the present.** [OBSERVED] Provenance correction: the four forces are Moesta and Spiek's, from the Re-Wired Group, not Clayton Christensen's. Christensen's contribution is the job and the language of progress. *Weak answer: only push and pull discussed. Without anxiety and habit you cannot explain why people who agree with you still do not switch.*
- **"How would you feel if the product had this feature?" and "How would you feel if the product did not have this feature?"** — the Kano functional/dysfunctional pair, scored on a five-point scale to classify must-be, performance, attractive, indifferent, reverse. [OBSERVED] *Weak answer: asking only the functional half — everything scores positive and you learn nothing.*

**Ulwick versus Christensen/Moesta — they genuinely differ.** Tony Ulwick's outcome-driven innovation decomposes a job into desired-outcome statements written to a fixed statement syntax, then surveys for importance and satisfaction to find underserved outcomes. It is quantitative and produces a prioritised list. The Christensen/Moesta line is qualitative: a retrospective interview reconstructing a switch, producing forces and context rather than scores. Ulwick has publicly argued the progress framing is not measurable enough to direct investment, and the two camps have been in open disagreement for years. [OBSERVED on the difference; the sharpest primary statements sit in Ulwick's and Alan Klement's own posts.]

## Stage 3 — Market, wedge and strategy

- **"Why now? Nature hates a vacuum — so why hasn't your solution been built before now?"** — Sequoia Capital, *Writing a Business Plan*. [OBSERVED] The institutional attribution for the folk "why now". *Weak answer: "AI". Name the specific change — a cost curve, a regulation, a behaviour, an API — and the date it happened.*
- **"Who is the user, what is their need, what capabilities serve it, and at what stage of evolution is each?"** — Simon Wardley, mapping. The anchor is the user need; the value chain hangs from it; the x-axis runs genesis to commodity. [OBSERVED] *Weak answer: a map anchored on "increase revenue" — Wardley's doctrine is explicit that this is your need, not the user's.*
- **"Where is the inertia, and whose is it?"** — Wardley's doctrine: "Success breeds inertia"; manage it as existing practice, political capital and prior investment. [OBSERVED] *Weak answer: inertia located entirely in the customer. Most of it is yours.*
- **"Is this niche big enough to matter, small enough for us to lead, and adjacent to a niche we could take next?"** — Geoffrey Moore's beachhead and bowling-pin logic, *Crossing the Chasm*. [OBSERVED on the concepts; the three-part phrasing is a practitioner compression, [DERIVED] on wording] *Weak answer: a beachhead chosen because it was the first customer who said yes, with no second pin behind it.*
- **"What are we deliberately not doing, and who will be annoyed by that?"** [DERIVED, from Martin's where-to-play as a choice and Drucker's abandonment question] *Weak answer: "we'll do that later". A where-to-play choice with no excluded segment is not a choice.*
- **"If we win here, what does that earn us that we could not otherwise buy?"** [DERIVED, from Moore's bowling alley and Wardley's evolution axis] *Weak answer: "more revenue". The right answers are structural — a data asset, a distribution position, a standard, a reference customer nobody else can get.*

## Stage 4 — Solution shape and scoping

Shape Up's vocabulary is precise and worth using exactly. Appetite is "a time budget for a standard team size". Ryan Singer: "Estimates start with a design and end with a number. Appetites start with a number and end with a design."

- **"Is this something worth a quick fix if we can manage? Is it a big idea worth an entire cycle? Would we redesign what we already have to accommodate it?"** — Shape Up, *Set boundaries*, verbatim. [OBSERVED] *Weak answer: an estimate. "About eight weeks" means the question was not understood — the appetite is an input, not an output.*
- **"Where in the current system does the new thing fit? How do you get to it? What are the key components or interactions? Where does it take you?"** — Shape Up, *Find the elements*, the breadboarding questions, verbatim. The three elements are places ("things you can navigate to, like screens, dialogs, or menus"), affordances ("things the user can act on", interface copy included) and connection lines. Where the two-dimensional arrangement is the actual problem, Shape Up switches to a fat marker sketch — "a sketch made with such broad strokes that adding detail is difficult or impossible". [OBSERVED] *Weak answer: a screen mockup. Breadboarding is deliberately words-not-pictures so the argument stays about sequence.*
- **"Does this require new technical work we've never done before? Are we making assumptions about how the parts fit together? Are we assuming a design solution exists that we couldn't come up with ourselves? Is there a hard decision we should settle in advance so it doesn't trip up the team?"** — Shape Up, *Risks and rabbit holes*, verbatim. [OBSERVED] *Weak answer: "we'll figure it out in the build" — a rabbit hole accepted rather than shaped out.*
- **"What are we declaring out of bounds?"** — Shape Up's no-gos: "it's still a good idea to call out any cases you specifically aren't supporting to keep the project well within the appetite." [OBSERVED] *Weak answer: no no-gos listed. Scope gets cut anyway — later, worse, by whoever is tired.*
- **"If they don't finish in the time we bet, do we extend?"** — Shape Up's circuit breaker: "Teams have to ship the work within the amount of time that we bet. If they don't finish, by default the project doesn't get an extension." [OBSERVED] *Weak answer: "it depends". The value is entirely in the default.*
- **"What does the press release say?"** — Amazon's working-backwards PR/FAQ: a one-page press release plus a customer FAQ and an internal FAQ for stakeholder questions. The press release runs headline → subheading → the customer problem → the solution → an executive quote → a customer quote → how to get started. Real internal-FAQ questions from a worked public example: "What are your goals and success criteria?", "How are you going to publicise it?", "What would it look like?" Real customer-FAQ questions run to pricing, differentiation from named alternatives, and what happens after launch. [OBSERVED on structure and the worked example; Amazon's own internal template is not public, so any circulating "official Amazon FAQ list" is [THIN]] *Weak answer: a press release full of internal vocabulary and no named customer benefit — which is exactly what Bezos's six-page narrative rule exists to catch ("the great memos are written and rewritten").*
- **Cagan's four risks as questions: "Will customers buy it, or will users choose to use it?" (value) · "Can users figure out how to use it?" (usability) · "Can our engineers build what we need with the time, skills and technology we have?" (feasibility) · "Does this solution also work for the various aspects of our business?" (business viability — go-to-market, legal, acquisition cost, monetisation, brand).** [OBSERVED] *Weak answer: three of four addressed and business viability skipped, which is where legal, sales compensation and support cost live.*

## Stage 5 — Business model, especially SaaS

- **"What is the value metric — the thing that goes up when the customer gets more value, that they would accept paying more for?"** [DERIVED; "value metric" is standard practitioner vocabulary rather than one person's coinage, so [THIN] on sole attribution] *Weak answer: seats, chosen because the billing system already supports it.*
- **"What is the willingness to pay — overall, and for each feature — and when did you last ask a customer directly?"** — Madhavan Ramanujam, *Monetizing Innovation*: have the willingness-to-pay conversation as early in development as possible. [OBSERVED] *Weak answer: pricing set by reading three competitors' pricing pages.*
- **"Which failure are we heading for: feature shock, a minivation, a hidden gem or an undead?"** — Ramanujam's four flavours of monetisation failure. A minivation is the right product for the right market priced too low; an undead is something customers did not want. [OBSERVED] *Weak answer: none of the above, obviously — so ask which one a sceptic would pick.*
- **"Who feels the pain, who has the budget, and are they the same person?"** [DERIVED, supported by Elena Verna's product-led sales work: users are not buyers, and in tightly regulated industries end users have no power to bring in a tool at all] *Weak answer: a single "customer" persona. In B2B there are at least three — user, economic buyer, and the person who must not be embarrassed by the purchase.*
- **"What is our net revenue retention, and which of activation, retention or expansion is actually the constraint?"** [DERIVED] *Weak answer: logo retention or gross retention quoted in place of net; or expansion named as the plan with no expansion mechanism in the product. If NRR is under 100% no acquisition spend fixes it.*
- **"What is our gross margin, and is it high for a bad reason?"** — Sarah Wang, a16z, November 2025: "The best AI companies right now have lower gross margins to start. And I actually think it's an orange flag if your gross margins are 85%, 90%, sky-high… What that tells me is there's probably not much AI usage in your product." [OBSERVED] *Weak answer: a SaaS-era 80% target asserted for an AI product — Bessemer's 2026 playbook and ICONIQ's survey both put AI gross margins nearer 50–60%.*
- **"Which pricing model lets us tell the story of what we do — and how many times have we changed it this year?"** — Kyle Poyar, *Growth Unhinged*, 2026 state of B2B and AI monetisation: hybrid pricing at 37% adoption (up from 25% a year earlier), credits at 29% with a third of companies planning to add them, and more than 1,800 pricing changes across the top 500 SaaS and AI companies in 2025 alone. Poyar on outcome pricing: "it might be a better message than buying model." [OBSERVED] *Weak answer: "outcome-based" asserted without a measurable outcome the customer already agrees is the outcome.*
- **"What does a free-tier abuser cost us, and at what usage does a free user become unprofitable?"** [DERIVED; sharper now than in the 2015 PLG era because marginal cost is no longer near zero] *Weak answer: "storage is cheap".*

Source note: OpenView's PLG research is widely cited, but Kyle Poyar left the firm in 2024 to run *Growth Unhinged* independently, and the last benchmarks report I could confirm is 2023. Cite it as archival and date-stamped, not as 2026 practice.

## Stage 6 — Complex, regulated and workflow-heavy products

This stage has the thinnest named-source base of the ten — the enterprise and regulated-software literature is mostly vendor content. I have marked most of it [DERIVED] rather than attach plausible-looking attributions.

- **"Walk me through the process as it actually runs, including the steps that are not in the documented process."** [DERIVED] The shadow steps — the spreadsheet, the WhatsApp group, the one person who reconciles two systems — are where the product lives or dies. *Weak answer: someone produces the diagram from the quality manual. That is the map, not the territory.*
- **"Who is accountable when this goes wrong, and does our design change who that is?"** [DERIVED] In clinical, financial and industrial settings accountability is often a named, licensed individual, and software that quietly moves it will be rejected by the person it moves it onto. *Weak answer: "the system flags it". Flags are not accountable.*
- **"What is the permission model, and who can see across tenants?"** [DERIVED] *Weak answer: role-based access control named as if it were a design. Ask for the matrix, including the support engineer who can impersonate.*
- **"What must be in the audit trail, and for how long?"** [OBSERVED as a requirement class] HIPAA requires logging access to protected health information — who, what, when. Financial-services regimes require who accessed what, when it changed, and how it moved between systems. *Weak answer: "we log everything". Retention period, immutability and who can read the log are the questions.*
- **"Where does the data live, and who has told the customer that?"** [DERIVED] *Weak answer: a region name with no answer on sub-processors or model providers.*
- **"How does this coexist with the incumbent system for the two years before anyone migrates?"** [DERIVED] *Weak answer: a migration plan with no coexistence period — in regulated environments the old system stays on, often permanently, and dual entry kills adoption.*
- **"Which edge cases are scope, and which are refusals we will state out loud?"** [DERIVED, Shape Up's no-gos applied to compliance] *Weak answer: edge cases deferred to phase two. In regulated products the edge case is frequently the regulated case.*
- **"What is the integration surface — which systems must we read from, write to, and never break?"** [DERIVED] *Weak answer: an API list with no answer about the system of record.*

## Stage 7 — Measurement and kill criteria

- **"What are the goals, what are the signals that a goal is being met, and only then, what are the metrics?"** — Kerry Rodden, Hilary Hutchinson and Xin Fu, *Measuring the User Experience on a Large Scale*, CHI 2010. HEART covers happiness, engagement, adoption, retention, task success. [OBSERVED on framework and authorship; the PDF would not parse, so [THIN] on verbatim definitions] *Weak answer: metrics named first and goals reverse-engineered from what the analytics tool already reports.*
- **"What is the one metric that captures the value customers get, and what are its inputs?"** — the North Star Framework, John Cutler and Amplitude, *The North Star Playbook*. [OBSERVED on framework and authorship; chapter definitions did not return to a fetch, so [THIN] on detail] *Weak answer: a North Star that is revenue. Revenue is the result, not the leading behaviour.*
- **"What would this metric look like if we were gaming it, and what counter-metric would catch that?"** [DERIVED, standard in the North Star literature as guardrails] *Weak answer: no counter-metric. Every engagement metric has a degenerate maximum, usually notifications.*
- **"If I am not in this state by this date, I quit. What is the state, and what is the date?"** — Annie Duke, *Quit*: the best kill criteria contain a state and a date, a state being an objective benchmark you have hit or missed. [OBSERVED] *Weak answer: "we'll review it next quarter" — a review is not a criterion, and Duke's point about the date is that while there is hope there is always a story about turning it around.*
- **"What result would make us stop?"** [DERIVED, from Duke's kill criteria and Shape Up's circuit breaker, which is the same idea implemented as a default] *Weak answer: any answer describing a result that cannot actually occur.*
- **"If we did not already do this, would we go into it now?"** — Peter Drucker's abandonment question. [OBSERVED] Jack Welch's variant — "if you weren't already in a business, would you enter it today?" with the follow-up "and if the answer is no, what are you going to do about it?" — is downstream of Drucker, as is Jim Collins' stop-doing list. *Weak answer: "yes, because we have already invested a lot" — the sunk cost the question exists to expose.*
- **"Does this number go up when we do nothing?"** [DERIVED — the fastest vanity-metric detector I know] *Weak answer: yes, and nobody had noticed. Cumulative totals, registered users and page views all pass this test and are therefore not decisions.*

## Stage 8 — AI-era questions

- **"What is the eval, who owns it, what is the pass rate, and against what set?"** — best attested to Hamel Husain, *Your AI Product Needs Evals* (March 2024): unsuccessful LLM products almost always share one root cause, a failure to build evaluation systems. He is blunt about method — "You are doing it wrong if you aren't looking at lots of data" and "You must remove all friction from the process of looking at data." His three levels are unit tests, human and model eval, and A/B testing, with cost rising at each. [OBSERVED] *Weak answer: "we vibe-check it". Also weak: a public benchmark score — your eval set is domain-specific or it is decoration.*
- **"Who validates the validators?"** — Shreya Shankar et al., UIST 2024: LLM-generated evaluators inherit the problems of the models they evaluate. The paper names *criteria drift* — people must define criteria to grade outputs, but grading outputs is how they discover the criteria. [OBSERVED] *Weak answer: an LLM judge deployed with no human-graded sample behind it and no measured agreement rate.*
- **"Are we evaluating the system or the model?"** — Chip Huyen, *AI Engineering* (O'Reilly, January 2025), evaluation-driven development: a real application is a system of components — retriever, parser, model — and each component's output must be evaluated independently to isolate points of failure. [OBSERVED] *Weak answer: one end-to-end score. When it drops you will not know which component moved.*
- **"What does failure look like, how visible is it, and who pays for a wrong answer?"** [DERIVED, supported by Eugene Yan's LLM patterns, where guardrails and defensive UX are first-class alongside evals] Yan is also usefully sceptical of judges: G-Eval-style approaches are "unreliable (low recall), costly… and has poor sensitivity". *Weak answer: "the user can just try again" — that is the cost to you, not to them.*
- **"Where is the human in the loop, and is that a real control or theatre?"** — Anthropic, *Building effective agents*: agents "can then pause for human feedback at checkpoints or when encountering blockers", with "extensive testing in sandboxed environments, along with the appropriate guardrails". [OBSERVED on the checkpoint pattern; "theatre" is my framing] *Weak answer: a confirmation dialogue on a screen the reviewer sees forty times an hour. That is a click, not a control.*
- **"What is the reversibility and blast radius of an agent action?"** [DERIVED, grounded in Anthropic's framing that agent autonomy brings "higher costs, and the potential for compounding errors" and suits "trusted environments"] *Weak answer: the action described as safe, with no answer on how it is undone or how far it propagates before anyone notices.*
- **"What is the cost per successful action, and does it survive at scale?"** [DERIVED, supported by Wang's orange-flag argument and the inference-cost literature] A good answer handles the tension: per-token prices fall roughly an order of magnitude a year for equivalent capability while total consumption rises faster. *Weak answer: cost per call. Divide by the success rate or you are pricing your failures at zero.*
- **"What is the latency budget, and what does the interaction look like when it is blown?"** [DERIVED; Yan's caching pattern exists precisely for latency and cost] *Weak answer: a p50 number. Ask for p95 and the designed behaviour at p99.*
- **"Is this a product, or a feature the model provider absorbs in the next release?"** [DERIVED — the 2026 version of Sequoia's why-now, inverted into a why-still] *Weak answer: a moat described as prompt engineering.*
- **"What is the data flywheel, and is it real or asserted?"** [DERIVED; Yan lists collecting user feedback as the pattern that builds one] *Weak answer: "we get better with more usage", with no mechanism by which a specific signal reaches a specific improvement.*
- **"What is the trust budget — how many wrong answers before this user stops using it?"** [DERIVED; the framing is mine] Supporting evidence is real but mixed: HCI work places initial trust thresholds in the 70–85% accuracy range depending on consequence, and a 2023 study found radiologists accepted 11.3% error from humans but only 6.8% from AI. [THIN on the numbers — I could not reach the primary studies.] *Weak answer: accuracy quoted with no answer on what one visible failure costs. The evidence suggests users abandon rather than recalibrate.*
- **"Do users open the source before they accept the answer, and do we measure it?"** [DERIVED — the metric appears in a secondary H1-2026 UX/AI synthesis (see Appendix F's note on unsourced input); adopted here because it is directly instrumentable, not because that source carries weight] The AI-search journey runs: user states a need → system interprets and searches → system synthesises → user scans and acts. Source inspection is the only optional step in it, which is what makes the rate diagnostic. *Weak answer: an accuracy figure with no behavioural counterpart. A source-opening rate near zero means the citations are decoration and the trust is unearned.*

## Stage 9 — The famous killer questions, with provenance checked

- **"You've got to start with the customer experience and work backwards to the technology."** — Steve Jobs, WWDC 1997, answering a hostile floor question about cancelling OpenDoc. He continued: "I've probably made this mistake more than anybody, and I've got the scar tissue to prove it." [OBSERVED] *Weak answer: a technology in search of a use, defended on capability.*
- **"What does the press release say?"** — Amazon, working backwards. [OBSERVED] It belongs here as well as in stage 4 because it is the single question most often used as an executive filter. *Weak answer: a document that describes the build rather than the customer — if the release is only intelligible to people who work here, the idea has not been framed yet.*
- Three more from earlier stages belong on any killer-question list and carry their weak answers above: Sequoia's **"why now?"**, Martin's **"what would have to be true?"** and Drucker's **"if we did not already do this, would we go into it now?"**
- **"What would a 5-star experience be? What would a 6-star be?… What is the 11-star experience?"** — Brian Chesky, on *Masters of Scale* with Reid Hoffman. His own escalation: a 10-star check-in is the Beatles arriving in 1964 to 5,000 people cheering; the 11-star is "you'd be there with Elon Musk and you're saying, 'You're going to space.'" [OBSERVED] It is a generative exercise, not a target — go absurd deliberately, then walk back to the most extreme thing you could actually ship. *Weak answer: treating 11 stars as a roadmap.*
- **"How do you know?"** — commonly attributed to Marty Cagan. [THIN] I could not find Cagan asking it in this compressed form in his own writing. What he verifiably argues is a spectrum of evidence — "Evidence could span the full spectrum with just qualitative opinions from a small group of users at one end, all the way to statistically significant results in a discovery A/B test at the other end" — and a judgement call: "We need to balance time and cost against the risk and consequence." Ask instead: **"What strength of evidence do you have, and is it proportionate to the consequence of being wrong?"** *Weak answer: confidence with no evidence type named.*
- **"Fall in love with the problem, not the solution."** — [THIN, and routinely misattributed to Marty Cagan.] It is the title of Uri Levine's 2023 book (Levine co-founded Waze), and BYU's Ballard Center credits him with coining it. Quote-aggregator sites give it to Cagan; I found no primary Cagan source. Attribute to Levine or leave it unattributed.
- **"Make something people want."** — Paul Graham / Y Combinator. [OBSERVED, with a correction] This is an imperative and a motto, not a question. Graham coined it about a month after starting YC and it appears in his essay *Be Good*. Presenting it as "what are you making that people want?" is a reformulation, not a quote.
- **"How would you feel if you could no longer use this product?"**, with "very disappointed" above 40% as the threshold — **Sean Ellis**, who benchmarked it across roughly 100 startups. [OBSERVED] Its most common misuse: running it on people who are not yet the target user, which gives a false negative, and running it only on active users, which gives a false positive.

## The twelve-question opening set

If I could ask only twelve in a first ideation session on an unfamiliar complex SaaS product, in this order:

1. **Whose problem is this, and how often does it happen to them?** (Stage 1) — everything downstream is meaningless unanswered, and it is the cheapest question to ask cold.
2. **How is it handled today, and what are the shortcomings of that?** (Stage 1, Sequoia) — the substitute is the real competitor, and it reframes question 1 immediately.
3. **Walk me through the process as it actually runs, including the steps not in the documented process.** (Stage 6) — while the room is still describing rather than defending; ask it later and you get the sanitised version.
4. **What would have to be true for this to be worth doing?** (Stage 1, Martin) — converts enthusiasm into testable conditions before anyone falls in love with a design.
5. **Which of those is riskiest, and how would we test it in a week?** (Stage 2, Torres) — immediately after 4, or the conditions become a wish list.
6. **Who feels the pain, who has the budget, and are they the same person?** (Stage 5) — before solution shape, because in complex SaaS the answer changes what you build, not just how you sell it.
7. **What is the appetite — a quick fix, a full cycle, or a redesign?** (Stage 4, Shape Up) — placed after the problem and before any solution talk, so it constrains the design rather than being negotiated against one that already exists.
8. **Where are the rabbit holes — new technical work, assumed integrations, unsolved design problems?** (Stage 4) — the first solution-side question, and it is about risk rather than features.
9. **What are we declaring out of bounds?** (Stage 4) — straight after 8, because the rabbit holes just named are the candidates.
10. **Who is accountable when it goes wrong, and does our design change who that is?** (Stage 6) — the question that most often kills a complex-SaaS idea; better in hour one than in security review.
11. **What result would make us stop?** (Stage 7, Duke) — near the end, when the idea is specific enough for a state and a date to mean something.
12. **What is the eval, who owns it, and what is the cost per successful action?** (Stage 8) — last only because it is conditional on an AI component; if there is one, it is not optional.

One rule sits behind the order: questions cheap to ask cold go early, questions needing a specific proposal to bite go late, and the scoping constraint (7) sits between so it shapes the design rather than being argued with afterwards.

## Sources

- [Roger Martin, *Decoding the Strategy Choice Cascade*](https://rogermartin.medium.com/decoding-the-strategy-choice-cascade-475d40555eb1) — Medium, undated. The five questions and the iterative reading; fetch 403, confirmed via search and the Lenny's interview.
- [Roger Martin interview](https://www.lennysnewsletter.com/p/the-ultimate-guide-to-strategy-roger-martin) — Lenny's Newsletter, 2023. Confirmed the five questions verbatim.
- [Gary Klein, *Performing a Project Premortem*](https://hbr.org/2007/09/performing-a-project-premortem) — HBR, September 2007. Premortem and prospective hindsight.
- [Sequoia Capital, *Writing a Business Plan*](https://www.sequoiacap.com/article/writing-a-business-plan/) — Sequoia, undated. The institutional source for "why now" and the Problem prompt.
- [Teresa Torres, *Opportunity Solution Trees*](https://www.producttalk.org/opportunity-solution-trees/) — Product Talk, updated through 2024. The opportunity/solution test and assumption tests in her words.
- [Re-Wired Group, milkshake case study](https://therewiredgroup.com/case-studies/milkshakes/) — undated. Establishes Moesta's role; the four forces are Moesta and Spiek's.
- [GoPractice, JTBD: Christensen, Moesta and Ulwick](https://gopractice.io/product/jobs-to-be-done-the-theory-and-the-frameworks/) — undated. Clearest side-by-side of the two JTBD schools.
- [Shape Up, *Set boundaries*](https://basecamp.com/shapeup/1.2-chapter-03) — Basecamp, 2019. Appetite versus estimate, verbatim.
- [Shape Up, *Find the elements*](https://basecamp.com/shapeup/1.3-chapter-04) — Basecamp, 2019. Breadboarding's three elements, its four questions and fat marker sketches, verbatim.
- [Shape Up, *Risks and rabbit holes*](https://basecamp.com/shapeup/1.4-chapter-05) — Basecamp, 2019. The four shaper questions and "declare out of bounds", verbatim.
- [Shape Up, *The betting table*](https://basecamp.com/shapeup/2.2-chapter-08) — Basecamp, 2019. The circuit breaker rule, verbatim.
- [Commoncog, *Putting Amazon's PR/FAQ to Practice*](https://commoncog.com/putting-amazons-pr-faq-to-practice/) — 2021. A fully worked PR/FAQ with real external and internal FAQ lists; the closest public thing to an actual question list.
- [Amazon 2017 letter to shareholders](https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders) — April 2018. Bezos on six-page narratives and rewriting memos.
- [Marty Cagan, *The Four Big Risks*](https://www.svpg.com/four-big-risks/) — SVPG, 2019. The four risks in his own words.
- [Marty Cagan, *Discovery — Judgement*](https://www.svpg.com/discovery-judgement/) — SVPG, 2021. The evidence spectrum, which is what "how do you know" should have been.
- [Sarah Wang on AI gross margins](https://www.mostlymetrics.com/p/can-bad-gross-margins-ever-be-a-good-sign) — Mostly Metrics, 9 November 2025. The "orange flag" quote.
- [Kyle Poyar, *The 2026 State of B2B and AI Monetization*](https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026) — Growth Unhinged, 2026. Hybrid at 37%, credits at 29%, 1,800 pricing changes in 2025.
- [Elena Verna, B2B product-led sales guide](https://www.elenaverna.com/p/b2b-product-led-sales-guide) — 2023, updated 2024. The user-is-not-the-buyer argument, including regulated industries.
- [Hamel Husain, *Your AI Product Needs Evals*](https://hamel.dev/blog/posts/evals/) — 29 March 2024. The canonical eval piece and the three levels.
- [Shreya Shankar et al., *Who Validates the Validators?*](https://arxiv.org/abs/2404.12272) — UIST, October 2024. Criteria drift and the limits of LLM judges.
- [Eugene Yan, *Task-Specific LLM Evals that Do & Don't Work*](https://eugeneyan.com/writing/evals/) — July 2024. What works, what does not, and the case against naive LLM-as-judge.
- [Eugene Yan, *Patterns for Building LLM-based Systems & Products*](https://eugeneyan.com/writing/llm-patterns/) — July 2023. Evals, guardrails, defensive UX, feedback as flywheel.
- [Chip Huyen, *AI Engineering*](https://huyenchip.com/books/) — O'Reilly, January 2025. Evaluation-driven development and per-component system evaluation.
- [Anthropic, *Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents) — December 2024. Human checkpoints, sandboxing, compounding errors.
- [Rodden, Hutchinson and Fu, *Measuring the User Experience on a Large Scale*](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/) — CHI 2010. HEART and Goals-Signals-Metrics.
- [Amplitude, *The North Star Playbook*](https://amplitude.com/north-star) — John Cutler, 2019, still maintained. Framework and authorship.
- [Annie Duke on kill criteria](https://behavioralscientist.org/annie-duke-quit-mental-models-to-help-you-cut-your-losses/) — Behavioral Scientist, 2022. States and dates in her own framing.
- [Drucker's abandonment question](https://www.artofmanliness.com/character/behavior/peter-druckers-question-for-eliminating-practices-that-no-longer-serve-you/) — 2021. Traces the question, the Welch variant and Collins' stop-doing list to Drucker.
- [Steve Jobs, WWDC 1997](https://www.youtube.com/watch?v=QGIUa2sSYFI) — May 1997. The customer-experience answer in full, with the scar-tissue line.
- [Brian Chesky, *Masters of Scale*](https://mastersofscale.com/brian-chesky/) — 2017. The 11-star exercise in his own telling.
- [Uri Levine's book site](https://urilevine.com/book/) — 2023. The actual owner of "fall in love with the problem, not the solution".
- [Sean Ellis test](https://learningloop.io/glossary/sean-ellis-score) — undated. The "very disappointed" question and the 40% threshold, correctly attributed.
- [Geoffrey Moore on beachheads](https://www.lennysnewsletter.com/p/geoffrey-moore-on-finding-your-beachhead) — Lenny's Newsletter, 2023. Beachhead criteria and the bowling-pin sequence.
- [Learn Wardley Mapping](https://archive.learnwardleymapping.com/) — Ben Mosior's archive of Wardley's CC-licensed book, 2020. Anchor, value chain, evolution, inertia doctrine.
- [Impact Mapping](https://www.impactmapping.org/book.html) — Gojko Adzic, 2012. Why / Who / How / What, in that order.
- [Michael D. Watkins, *The First 90 Days*, updated and expanded](https://store.hbr.org/product/the-first-90-days-updated-and-expanded-proven-strategies-for-getting-up-to-speed-faster-and-smarter/11323) — HBR Press, 2013. Breakeven point and STARS.


---

