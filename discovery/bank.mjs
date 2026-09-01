// discovery/bank.mjs — the discovery partner's question bank as an edited module: every question
// stages 1–9 of docs/research/question-bank-source.md hold, each with its attribution, its
// weak-answer note and its OBSERVED / DERIVED / THIN label, plus the pure selectors over it
// (epic #279, ticket #282; architecture §Data model → The bank).
//
// The source file is the citation and stays unedited below its preamble; THIS is the bank. It
// lives under discovery/ rather than system/ because agent-layer/gen-loc-summary.mjs counts every
// system/*.mjs into a number approach.html renders — the architecture doc says why. No page reads
// it, and it has zero imports: no SDK, no DOM, nothing a CI job without portal/node_modules cannot
// load. tooling/build-checks.mjs group 28 pins all of that.
//
// Three readers share one definition, which is the point of the module:
//   · tooling/build-checks.mjs  — group 28, the shape and the sets (CI)
//   · portal/lib/discovery.mjs  — selectDepth, walked with the session cursor (#285)
//   · discovery/ops.mjs         — questionById, resolving an op's question_id (#281)
// #283 extends QUESTIONS with the product-type branches and adds their selectors here.
//
// Editorial rules — what a reviewer checks an entry against, with the source open beside it:
//
//   D1  ONE SOURCE BULLET, ONE ENTRY. The unit is a turn: what the agent asks in one go. Stage 1's
//       choice cascade (five questions) and Stage 4's four risks are each one entry whose text
//       carries all of them. The count is entries, not sentences.
//   D2  WHAT IS EXCLUDED. Stages 1–9 hold 69 top-level bullets. Two are mottos, not questions, and
//       carry no weak-answer note — Levine's "Fall in love with the problem" and Graham's "Make
//       something people want" (the source itself says reformulating the latter as a question is
//       not a quote). A question with no weak-answer note is a bug, so they do not enter. Stage 9's
//       "Three more from earlier stages…" bullet is a cross-reference to entries that already
//       exist. 69 − 2 − 1 − 1 (D3) = 65, which is also the source's count of "Weak answer" notes.
//   D3  ONE FOLD. "What does the press release say?" appears in Stage 4 and again in Stage 9 with a
//       second weak-answer sentence. One entry, s4-press-release; the Stage 9 material is in its
//       note. A bank holding the same question twice can be asked it twice in one session.
//   D4  THE LABEL RULE. label is the source's FIRST bracketed label. Where the source qualifies it
//       ("[OBSERVED on method; … THIN on verbatim]") the qualifier goes into provenanceNote. Never
//       two labels on one entry.
//   D5  TEXT STAYS THE SOURCE'S WORDS. text is the source's quoted question where the bullet is a
//       question; where it is a framework statement (Stage 2's four forces, Stage 9's Jobs line)
//       the fewest added words make it askable and the source's phrases stay intact. weakAnswer is
//       the source's "Weak answer: …" sentence(s), de-italicised — the gate pins its first thirty
//       characters to the source file, so a paraphrase goes red. attribution is the source's
//       em-dash clause; DERIVED entries read "Derived, from …" naming what the source built on, or
//       "Derived" where the source names nothing. Explanatory prose the source attaches to a bullet
//       is carried in note, so no reader has to open the research file to judge an answer. Where
//       the source speaks in the first person ("the framing is mine") note and provenanceNote say
//       "the researcher's".
//   D6  C3 EDITS, EXACTLY TWO. No role or seniority title appears anywhere in this module. The
//       press-release structure line drops "an executive quote" for "a quote from the company";
//       the Stage 9 fold drops "executive filter" for "go/no-go filter". "Can our engineers build…"
//       (Cagan, verbatim) and "the support engineer who can impersonate" STAY: a profession named
//       inside a question's substance is not a title for who is asked. The gate's term list is
//       written so both survive.
//
// Ids are hand-chosen and stable (s<stage>-<slug>), never derived from text: answers.jsonl,
// transcript.jsonl and every run package key on them, and a C2 rewording must not move a key.
//
// The twelve (OPENING_SET) are the source's own opening set, resolved to bank ids in the source's
// order; their shorter phrasings are not stored — a session asks the bank entry's text. Two
// resolutions were judgement calls and are recorded beside the ids below (items 1 and 12).
//
// Selectors: questionById is total (null for anything the bank does not hold — the op applier
// decides what null means); questionsForStage compares the stage number strictly ([] for 10 or
// "1"); selectDepth throws a plain Error naming an unknown depth, because a depth is a
// session-start choice from a closed menu and an unknown one is a programming error.

export const STAGES = Object.freeze([
  { n: 1, id: "problem-framing", label: "Problem framing" },
  { n: 2, id: "demand-and-evidence", label: "Demand and evidence" },
  { n: 3, id: "market-wedge-strategy", label: "Market, wedge and strategy" },
  { n: 4, id: "solution-shape-scoping", label: "Solution shape and scoping" },
  { n: 5, id: "business-model", label: "Business model, especially SaaS" },
  { n: 6, id: "complex-regulated", label: "Complex, regulated and workflow-heavy products" },
  { n: 7, id: "measurement-kill-criteria", label: "Measurement and kill criteria" },
  { n: 8, id: "ai-era", label: "AI-era questions" },
  { n: 9, id: "killer-questions", label: "The famous killer questions, with provenance checked" },
].map(Object.freeze));

// One entry per source bullet (D1), in source order. Shape:
//   { id, stage: 1–9, text, attribution, label: "OBSERVED" | "DERIVED" | "THIN",
//     provenanceNote?, weakAnswer, note? }
// Frozen at both levels: a consumer that wants a new question edits this list AND the gate
// group's per-stage counts together, not one of them.
export const QUESTIONS = Object.freeze([
  // ---------- Stage 1 — Problem framing ----------
  {
    id: "s1-choice-cascade",
    stage: 1,
    text: "What is our winning aspiration? Where will we play? How will we win? What capabilities must be in place to win? What management systems are required?",
    attribution: "Roger Martin and A.G. Lafley, the strategy choice cascade",
    label: "OBSERVED",
    note: "Martin is explicit that the cascade is iterative, not a form filled top-down.",
    weakAnswer: "an aspiration that is a revenue number, and a how-will-we-win that is a feature list rather than a reason a customer picks you.",
  },
  {
    id: "s1-what-would-have-to-be-true",
    stage: 1,
    text: "What would have to be true for this option to work?",
    attribution: "Roger Martin, the strategic choice structuring process",
    label: "OBSERVED",
    note: "It converts advocacy into a testable condition: you stop arguing whether an option is good and name the barrier condition that decides it.",
    weakAnswer: "a list of things already true. If nothing on it could be false, nobody has named the bet.",
  },
  {
    id: "s1-premortem",
    stage: 1,
    text: "Imagine we are a year into the future. We implemented the plan as it now exists. The outcome was a disaster. Write a brief history of that disaster.",
    attribution: "Gary Klein, Performing a Project Premortem, HBR, September 2007",
    label: "OBSERVED",
    provenanceNote: "on method; the HBR PDF would not parse, so treat the phrasing as close paraphrase",
    note: "Klein's grounding is prospective hindsight, which he reports lifts correct identification of future reasons by about 30%.",
    weakAnswer: "risks phrased as \"adoption might be slow\" — a premortem producing no politically awkward sentence has not been run.",
  },
  {
    id: "s1-how-addressed-today",
    stage: 1,
    text: "How is this addressed today and what are the shortcomings to current solutions?",
    attribution: "Sequoia Capital, Writing a Business Plan, under Problem",
    label: "OBSERVED",
    weakAnswer: "\"there is no solution today\". There always is — a spreadsheet, an email thread, a person, or deliberate non-action.",
  },
  {
    id: "s1-why-who-how-what",
    stage: 1,
    text: "Why? Then who? Then how? Then what?",
    attribution: "Gojko Adzic, Impact Mapping (2012)",
    label: "OBSERVED",
    note: "The deliverable is the last question, not the first.",
    weakAnswer: "starting at What and reverse-justifying a Why — spot it because the Who is \"users\" and the How is \"better UX\".",
  },
  {
    id: "s1-if-nobody-solves-this",
    stage: 1,
    text: "If nobody solves this, what happens — to whom, how often, and at what cost?",
    attribution: "Derived, from Sequoia's Problem prompt and Martin's barrier-condition logic",
    label: "DERIVED",
    weakAnswer: "\"it's a bad experience\". No frequency, no money, no named person.",
  },

  // ---------- Stage 2 — Demand and evidence ----------
  {
    id: "s2-more-than-one-way",
    stage: 2,
    text: "Is there more than one way to address this opportunity?",
    attribution: "Teresa Torres, the test for whether a stated opportunity is a solution in disguise",
    label: "OBSERVED",
    note: "An opportunity is \"an unmet customer need, pain point, or desire\".",
    weakAnswer: "only one way — you wrote down a feature and labelled it a need.",
  },
  {
    id: "s2-why-do-you-want-it",
    stage: 2,
    text: "Why do you want [the proposed solution]?",
    attribution: "Teresa Torres, the question that walks a request back up the opportunity solution tree",
    label: "OBSERVED",
    weakAnswer: "the requester restates the feature in different words.",
  },
  {
    id: "s2-riskiest-assumption",
    stage: 2,
    text: "What has to be true for this solution to work, and which assumption is riskiest?",
    attribution: "Teresa Torres, the assumption-test layer",
    label: "OBSERVED",
    note: "She argues assumption tests run in a day or two where idea tests take weeks.",
    weakAnswer: "a plan to \"validate the idea\" with one round of interviews — that tests everything at once, slowly, and confounds every assumption inside it.",
  },
  {
    id: "s2-last-time-show-me",
    stage: 2,
    text: "What did you do the last time this happened? Show me the file, the thread, the tab.",
    attribution: "Derived",
    label: "DERIVED",
    note: "The discriminator between stated preference and revealed behaviour is tense and artefact: past-tense questions about a specific instance, with something to look at, versus hypothetical questions about what someone would do.",
    weakAnswer: "any sentence in the conditional. \"I would definitely use that\" predicts nothing; a spreadsheet they maintained for two years predicts a great deal.",
  },
  {
    id: "s2-switch-timeline",
    stage: 2,
    text: "Take me back to when you first realised you needed something different. What was happening that day?",
    attribution: "Bob Moesta and Chris Spiek, Re-Wired Group, the switch interview",
    label: "OBSERVED",
    provenanceNote: "on method; exact opening wording varies by practitioner, so THIN on verbatim",
    note: "A retrospective timeline reconstructing the moment of purchase.",
    weakAnswer: "the interviewee describes general preferences — you have left the timeline and are collecting opinion.",
  },
  {
    id: "s2-four-forces",
    stage: 2,
    text: "Which of the four forces of progress are in play — the push of the situation, the pull of the new solution, anxiety about the new, and the habit of the present?",
    attribution: "Bob Moesta and Chris Spiek, Re-Wired Group, the four forces of progress",
    label: "OBSERVED",
    note: "Provenance correction: the four forces are Moesta and Spiek's, from the Re-Wired Group, not Clayton Christensen's. Christensen's contribution is the job and the language of progress.",
    weakAnswer: "only push and pull discussed. Without anxiety and habit you cannot explain why people who agree with you still do not switch.",
  },
  {
    id: "s2-kano-pair",
    stage: 2,
    text: "How would you feel if the product had this feature? And how would you feel if the product did not have this feature?",
    attribution: "The Kano functional/dysfunctional pair",
    label: "OBSERVED",
    note: "Scored on a five-point scale to classify must-be, performance, attractive, indifferent, reverse.",
    weakAnswer: "asking only the functional half — everything scores positive and you learn nothing.",
  },

  // ---------- Stage 3 — Market, wedge and strategy ----------
  {
    id: "s3-why-now",
    stage: 3,
    text: "Why now? Nature hates a vacuum — so why hasn't your solution been built before now?",
    attribution: "Sequoia Capital, Writing a Business Plan",
    label: "OBSERVED",
    note: "The institutional attribution for the folk \"why now\".",
    weakAnswer: "\"AI\". Name the specific change — a cost curve, a regulation, a behaviour, an API — and the date it happened.",
  },
  {
    id: "s3-user-need-map",
    stage: 3,
    text: "Who is the user, what is their need, what capabilities serve it, and at what stage of evolution is each?",
    attribution: "Simon Wardley, mapping",
    label: "OBSERVED",
    note: "The anchor is the user need; the value chain hangs from it; the x-axis runs genesis to commodity.",
    weakAnswer: "a map anchored on \"increase revenue\" — Wardley's doctrine is explicit that this is your need, not the user's.",
  },
  {
    id: "s3-where-is-the-inertia",
    stage: 3,
    text: "Where is the inertia, and whose is it?",
    attribution: "Simon Wardley's doctrine: \"Success breeds inertia\"",
    label: "OBSERVED",
    note: "Manage it as existing practice, political capital and prior investment.",
    weakAnswer: "inertia located entirely in the customer. Most of it is yours.",
  },
  {
    id: "s3-beachhead",
    stage: 3,
    text: "Is this niche big enough to matter, small enough for us to lead, and adjacent to a niche we could take next?",
    attribution: "Geoffrey Moore, beachhead and bowling-pin logic, Crossing the Chasm",
    label: "OBSERVED",
    provenanceNote: "on the concepts; the three-part phrasing is a practitioner compression, DERIVED on wording",
    weakAnswer: "a beachhead chosen because it was the first customer who said yes, with no second pin behind it.",
  },
  {
    id: "s3-deliberately-not-doing",
    stage: 3,
    text: "What are we deliberately not doing, and who will be annoyed by that?",
    attribution: "Derived, from Martin's where-to-play as a choice and Drucker's abandonment question",
    label: "DERIVED",
    weakAnswer: "\"we'll do that later\". A where-to-play choice with no excluded segment is not a choice.",
  },
  {
    id: "s3-what-winning-earns",
    stage: 3,
    text: "If we win here, what does that earn us that we could not otherwise buy?",
    attribution: "Derived, from Moore's bowling alley and Wardley's evolution axis",
    label: "DERIVED",
    weakAnswer: "\"more revenue\". The right answers are structural — a data asset, a distribution position, a standard, a reference customer nobody else can get.",
  },

  // ---------- Stage 4 — Solution shape and scoping ----------
  {
    id: "s4-appetite",
    stage: 4,
    text: "Is this something worth a quick fix if we can manage? Is it a big idea worth an entire cycle? Would we redesign what we already have to accommodate it?",
    attribution: "Shape Up, Set boundaries, verbatim",
    label: "OBSERVED",
    note: "Appetite is \"a time budget for a standard team size\". Ryan Singer: \"Estimates start with a design and end with a number. Appetites start with a number and end with a design.\"",
    weakAnswer: "an estimate. \"About eight weeks\" means the question was not understood — the appetite is an input, not an output.",
  },
  {
    id: "s4-breadboard-elements",
    stage: 4,
    text: "Where in the current system does the new thing fit? How do you get to it? What are the key components or interactions? Where does it take you?",
    attribution: "Shape Up, Find the elements, the breadboarding questions, verbatim",
    label: "OBSERVED",
    note: "The three elements are places (\"things you can navigate to, like screens, dialogs, or menus\"), affordances (\"things the user can act on\", interface copy included) and connection lines. Where the two-dimensional arrangement is the actual problem, Shape Up switches to a fat marker sketch — \"a sketch made with such broad strokes that adding detail is difficult or impossible\".",
    weakAnswer: "a screen mockup. Breadboarding is deliberately words-not-pictures so the argument stays about sequence.",
  },
  {
    id: "s4-rabbit-holes",
    stage: 4,
    text: "Does this require new technical work we've never done before? Are we making assumptions about how the parts fit together? Are we assuming a design solution exists that we couldn't come up with ourselves? Is there a hard decision we should settle in advance so it doesn't trip up the team?",
    attribution: "Shape Up, Risks and rabbit holes, verbatim",
    label: "OBSERVED",
    weakAnswer: "\"we'll figure it out in the build\" — a rabbit hole accepted rather than shaped out.",
  },
  {
    id: "s4-out-of-bounds",
    stage: 4,
    text: "What are we declaring out of bounds?",
    attribution: "Shape Up's no-gos",
    label: "OBSERVED",
    note: "\"it's still a good idea to call out any cases you specifically aren't supporting to keep the project well within the appetite.\"",
    weakAnswer: "no no-gos listed. Scope gets cut anyway — later, worse, by whoever is tired.",
  },
  {
    id: "s4-circuit-breaker",
    stage: 4,
    text: "If they don't finish in the time we bet, do we extend?",
    attribution: "Shape Up's circuit breaker",
    label: "OBSERVED",
    note: "\"Teams have to ship the work within the amount of time that we bet. If they don't finish, by default the project doesn't get an extension.\"",
    weakAnswer: "\"it depends\". The value is entirely in the default.",
  },
  {
    // D3: the Stage 9 copy folds in here; D6: "an executive quote" → "a quote from the company",
    // "executive filter" → "go/no-go filter".
    id: "s4-press-release",
    stage: 4,
    text: "What does the press release say?",
    attribution: "Amazon, the working-backwards PR/FAQ",
    label: "OBSERVED",
    provenanceNote: "on structure and the worked example; Amazon's own internal template is not public, so any circulating \"official Amazon FAQ list\" is THIN",
    note: "A one-page press release plus a customer FAQ and an internal FAQ for stakeholder questions. The press release runs headline → subheading → the customer problem → the solution → a quote from the company → a customer quote → how to get started. Real internal-FAQ questions from a worked public example: \"What are your goals and success criteria?\", \"How are you going to publicise it?\", \"What would it look like?\" Real customer-FAQ questions run to pricing, differentiation from named alternatives, and what happens after launch. The source lists it a second time among the killer questions, as the single question most often used as a go/no-go filter, with a second weak answer: a document that describes the build rather than the customer — if the release is only intelligible to people who work here, the idea has not been framed yet.",
    weakAnswer: "a press release full of internal vocabulary and no named customer benefit — which is exactly what Bezos's six-page narrative rule exists to catch (\"the great memos are written and rewritten\").",
  },
  {
    id: "s4-four-risks",
    stage: 4,
    text: "Will customers buy it, or will users choose to use it? Can users figure out how to use it? Can our engineers build what we need with the time, skills and technology we have? Does this solution also work for the various aspects of our business?",
    attribution: "Marty Cagan, the four big risks, as questions",
    label: "OBSERVED",
    note: "Value, usability, feasibility and business viability — the last covering go-to-market, legal, acquisition cost, monetisation, brand.",
    weakAnswer: "three of four addressed and business viability skipped, which is where legal, sales compensation and support cost live.",
  },

  // ---------- Stage 5 — Business model, especially SaaS ----------
  {
    id: "s5-value-metric",
    stage: 5,
    text: "What is the value metric — the thing that goes up when the customer gets more value, that they would accept paying more for?",
    attribution: "Derived",
    label: "DERIVED",
    provenanceNote: "\"value metric\" is standard practitioner vocabulary rather than one person's coinage, so THIN on sole attribution",
    weakAnswer: "seats, chosen because the billing system already supports it.",
  },
  {
    id: "s5-willingness-to-pay",
    stage: 5,
    text: "What is the willingness to pay — overall, and for each feature — and when did you last ask a customer directly?",
    attribution: "Madhavan Ramanujam, Monetizing Innovation",
    label: "OBSERVED",
    note: "Have the willingness-to-pay conversation as early in development as possible.",
    weakAnswer: "pricing set by reading three competitors' pricing pages.",
  },
  {
    id: "s5-monetisation-failure",
    stage: 5,
    text: "Which failure are we heading for: feature shock, a minivation, a hidden gem or an undead?",
    attribution: "Madhavan Ramanujam, the four flavours of monetisation failure",
    label: "OBSERVED",
    note: "A minivation is the right product for the right market priced too low; an undead is something customers did not want.",
    weakAnswer: "none of the above, obviously — so ask which one a sceptic would pick.",
  },
  {
    id: "s5-pain-budget-same-person",
    stage: 5,
    text: "Who feels the pain, who has the budget, and are they the same person?",
    attribution: "Derived, supported by Elena Verna's product-led sales work",
    label: "DERIVED",
    note: "Users are not buyers, and in tightly regulated industries end users have no power to bring in a tool at all.",
    weakAnswer: "a single \"customer\" persona. In B2B there are at least three — user, economic buyer, and the person who must not be embarrassed by the purchase.",
  },
  {
    id: "s5-net-revenue-retention",
    stage: 5,
    text: "What is our net revenue retention, and which of activation, retention or expansion is actually the constraint?",
    attribution: "Derived",
    label: "DERIVED",
    weakAnswer: "logo retention or gross retention quoted in place of net; or expansion named as the plan with no expansion mechanism in the product. If NRR is under 100% no acquisition spend fixes it.",
  },
  {
    id: "s5-gross-margin",
    stage: 5,
    text: "What is our gross margin, and is it high for a bad reason?",
    attribution: "Sarah Wang, a16z, November 2025",
    label: "OBSERVED",
    note: "\"The best AI companies right now have lower gross margins to start. And I actually think it's an orange flag if your gross margins are 85%, 90%, sky-high… What that tells me is there's probably not much AI usage in your product.\"",
    weakAnswer: "a SaaS-era 80% target asserted for an AI product — Bessemer's 2026 playbook and ICONIQ's survey both put AI gross margins nearer 50–60%.",
  },
  {
    id: "s5-pricing-model-story",
    stage: 5,
    text: "Which pricing model lets us tell the story of what we do — and how many times have we changed it this year?",
    attribution: "Kyle Poyar, Growth Unhinged, 2026 state of B2B and AI monetisation",
    label: "OBSERVED",
    note: "Hybrid pricing at 37% adoption (up from 25% a year earlier), credits at 29% with a third of companies planning to add them, and more than 1,800 pricing changes across the top 500 SaaS and AI companies in 2025 alone. Poyar on outcome pricing: \"it might be a better message than buying model.\"",
    weakAnswer: "\"outcome-based\" asserted without a measurable outcome the customer already agrees is the outcome.",
  },
  {
    id: "s5-free-tier-cost",
    stage: 5,
    text: "What does a free-tier abuser cost us, and at what usage does a free user become unprofitable?",
    attribution: "Derived",
    label: "DERIVED",
    provenanceNote: "sharper now than in the 2015 PLG era because marginal cost is no longer near zero",
    weakAnswer: "\"storage is cheap\".",
  },

  // ---------- Stage 6 — Complex, regulated and workflow-heavy products ----------
  {
    id: "s6-process-as-it-runs",
    stage: 6,
    text: "Walk me through the process as it actually runs, including the steps that are not in the documented process.",
    attribution: "Derived",
    label: "DERIVED",
    note: "The shadow steps — the spreadsheet, the WhatsApp group, the one person who reconciles two systems — are where the product lives or dies.",
    weakAnswer: "someone produces the diagram from the quality manual. That is the map, not the territory.",
  },
  {
    id: "s6-accountable-when-wrong",
    stage: 6,
    text: "Who is accountable when this goes wrong, and does our design change who that is?",
    attribution: "Derived",
    label: "DERIVED",
    note: "In clinical, financial and industrial settings accountability is often a named, licensed individual, and software that quietly moves it will be rejected by the person it moves it onto.",
    weakAnswer: "\"the system flags it\". Flags are not accountable.",
  },
  {
    id: "s6-permission-model",
    stage: 6,
    text: "What is the permission model, and who can see across tenants?",
    attribution: "Derived",
    label: "DERIVED",
    weakAnswer: "role-based access control named as if it were a design. Ask for the matrix, including the support engineer who can impersonate.",
  },
  {
    id: "s6-audit-trail",
    stage: 6,
    text: "What must be in the audit trail, and for how long?",
    attribution: "HIPAA and the financial-services regimes, as a requirement class",
    label: "OBSERVED",
    provenanceNote: "as a requirement class",
    note: "HIPAA requires logging access to protected health information — who, what, when. Financial-services regimes require who accessed what, when it changed, and how it moved between systems.",
    weakAnswer: "\"we log everything\". Retention period, immutability and who can read the log are the questions.",
  },
  {
    id: "s6-where-data-lives",
    stage: 6,
    text: "Where does the data live, and who has told the customer that?",
    attribution: "Derived",
    label: "DERIVED",
    weakAnswer: "a region name with no answer on sub-processors or model providers.",
  },
  {
    id: "s6-coexist-with-incumbent",
    stage: 6,
    text: "How does this coexist with the incumbent system for the two years before anyone migrates?",
    attribution: "Derived",
    label: "DERIVED",
    weakAnswer: "a migration plan with no coexistence period — in regulated environments the old system stays on, often permanently, and dual entry kills adoption.",
  },
  {
    id: "s6-edge-cases-or-refusals",
    stage: 6,
    text: "Which edge cases are scope, and which are refusals we will state out loud?",
    attribution: "Derived, Shape Up's no-gos applied to compliance",
    label: "DERIVED",
    weakAnswer: "edge cases deferred to phase two. In regulated products the edge case is frequently the regulated case.",
  },
  {
    id: "s6-integration-surface",
    stage: 6,
    text: "What is the integration surface — which systems must we read from, write to, and never break?",
    attribution: "Derived",
    label: "DERIVED",
    weakAnswer: "an API list with no answer about the system of record.",
  },

  // ---------- Stage 7 — Measurement and kill criteria ----------
  {
    id: "s7-goals-signals-metrics",
    stage: 7,
    text: "What are the goals, what are the signals that a goal is being met, and only then, what are the metrics?",
    attribution: "Kerry Rodden, Hilary Hutchinson and Xin Fu, Measuring the User Experience on a Large Scale, CHI 2010",
    label: "OBSERVED",
    provenanceNote: "on framework and authorship; the PDF would not parse, so THIN on verbatim definitions",
    note: "HEART covers happiness, engagement, adoption, retention, task success.",
    weakAnswer: "metrics named first and goals reverse-engineered from what the analytics tool already reports.",
  },
  {
    id: "s7-north-star",
    stage: 7,
    text: "What is the one metric that captures the value customers get, and what are its inputs?",
    attribution: "The North Star Framework, John Cutler and Amplitude, The North Star Playbook",
    label: "OBSERVED",
    provenanceNote: "on framework and authorship; chapter definitions did not return to a fetch, so THIN on detail",
    weakAnswer: "a North Star that is revenue. Revenue is the result, not the leading behaviour.",
  },
  {
    id: "s7-counter-metric",
    stage: 7,
    text: "What would this metric look like if we were gaming it, and what counter-metric would catch that?",
    attribution: "Derived, standard in the North Star literature as guardrails",
    label: "DERIVED",
    weakAnswer: "no counter-metric. Every engagement metric has a degenerate maximum, usually notifications.",
  },
  {
    id: "s7-kill-state-and-date",
    stage: 7,
    text: "If I am not in this state by this date, I quit. What is the state, and what is the date?",
    attribution: "Annie Duke, Quit",
    label: "OBSERVED",
    note: "The best kill criteria contain a state and a date, a state being an objective benchmark you have hit or missed.",
    weakAnswer: "\"we'll review it next quarter\" — a review is not a criterion, and Duke's point about the date is that while there is hope there is always a story about turning it around.",
  },
  {
    id: "s7-what-would-make-us-stop",
    stage: 7,
    text: "What result would make us stop?",
    attribution: "Derived, from Duke's kill criteria and Shape Up's circuit breaker, which is the same idea implemented as a default",
    label: "DERIVED",
    weakAnswer: "any answer describing a result that cannot actually occur.",
  },
  {
    id: "s7-abandonment",
    stage: 7,
    text: "If we did not already do this, would we go into it now?",
    attribution: "Peter Drucker, the abandonment question",
    label: "OBSERVED",
    note: "Jack Welch's variant — \"if you weren't already in a business, would you enter it today?\" with the follow-up \"and if the answer is no, what are you going to do about it?\" — is downstream of Drucker, as is Jim Collins' stop-doing list.",
    weakAnswer: "\"yes, because we have already invested a lot\" — the sunk cost the question exists to expose.",
  },
  {
    id: "s7-goes-up-doing-nothing",
    stage: 7,
    text: "Does this number go up when we do nothing?",
    attribution: "Derived — the researcher's fastest vanity-metric detector",
    label: "DERIVED",
    weakAnswer: "yes, and nobody had noticed. Cumulative totals, registered users and page views all pass this test and are therefore not decisions.",
  },

  // ---------- Stage 8 — AI-era questions ----------
  {
    id: "s8-eval",
    stage: 8,
    text: "What is the eval, who owns it, what is the pass rate, and against what set?",
    attribution: "Hamel Husain, Your AI Product Needs Evals (March 2024), best attested",
    label: "OBSERVED",
    note: "Unsuccessful LLM products almost always share one root cause, a failure to build evaluation systems. He is blunt about method — \"You are doing it wrong if you aren't looking at lots of data\" and \"You must remove all friction from the process of looking at data.\" His three levels are unit tests, human and model eval, and A/B testing, with cost rising at each.",
    weakAnswer: "\"we vibe-check it\". Also weak: a public benchmark score — your eval set is domain-specific or it is decoration.",
  },
  {
    id: "s8-validate-the-validators",
    stage: 8,
    text: "Who validates the validators?",
    attribution: "Shreya Shankar et al., UIST 2024",
    label: "OBSERVED",
    note: "LLM-generated evaluators inherit the problems of the models they evaluate. The paper names criteria drift — people must define criteria to grade outputs, but grading outputs is how they discover the criteria.",
    weakAnswer: "an LLM judge deployed with no human-graded sample behind it and no measured agreement rate.",
  },
  {
    id: "s8-system-or-model",
    stage: 8,
    text: "Are we evaluating the system or the model?",
    attribution: "Chip Huyen, AI Engineering (O'Reilly, January 2025), evaluation-driven development",
    label: "OBSERVED",
    note: "A real application is a system of components — retriever, parser, model — and each component's output must be evaluated independently to isolate points of failure.",
    weakAnswer: "one end-to-end score. When it drops you will not know which component moved.",
  },
  {
    id: "s8-failure-who-pays",
    stage: 8,
    text: "What does failure look like, how visible is it, and who pays for a wrong answer?",
    attribution: "Derived, supported by Eugene Yan's LLM patterns, where guardrails and defensive UX are first-class alongside evals",
    label: "DERIVED",
    note: "Yan is also usefully sceptical of judges: G-Eval-style approaches are \"unreliable (low recall), costly… and has poor sensitivity\".",
    weakAnswer: "\"the user can just try again\" — that is the cost to you, not to them.",
  },
  {
    id: "s8-human-in-the-loop",
    stage: 8,
    text: "Where is the human in the loop, and is that a real control or theatre?",
    attribution: "Anthropic, Building effective agents",
    label: "OBSERVED",
    provenanceNote: "on the checkpoint pattern; \"theatre\" is the researcher's framing",
    note: "Agents \"can then pause for human feedback at checkpoints or when encountering blockers\", with \"extensive testing in sandboxed environments, along with the appropriate guardrails\".",
    weakAnswer: "a confirmation dialogue on a screen the reviewer sees forty times an hour. That is a click, not a control.",
  },
  {
    id: "s8-reversibility-blast-radius",
    stage: 8,
    text: "What is the reversibility and blast radius of an agent action?",
    attribution: "Derived, grounded in Anthropic's framing that agent autonomy brings \"higher costs, and the potential for compounding errors\" and suits \"trusted environments\"",
    label: "DERIVED",
    weakAnswer: "the action described as safe, with no answer on how it is undone or how far it propagates before anyone notices.",
  },
  {
    id: "s8-cost-per-successful-action",
    stage: 8,
    text: "What is the cost per successful action, and does it survive at scale?",
    attribution: "Derived, supported by Wang's orange-flag argument and the inference-cost literature",
    label: "DERIVED",
    note: "A good answer handles the tension: per-token prices fall roughly an order of magnitude a year for equivalent capability while total consumption rises faster.",
    weakAnswer: "cost per call. Divide by the success rate or you are pricing your failures at zero.",
  },
  {
    id: "s8-latency-budget",
    stage: 8,
    text: "What is the latency budget, and what does the interaction look like when it is blown?",
    attribution: "Derived; Yan's caching pattern exists precisely for latency and cost",
    label: "DERIVED",
    weakAnswer: "a p50 number. Ask for p95 and the designed behaviour at p99.",
  },
  {
    id: "s8-product-or-feature",
    stage: 8,
    text: "Is this a product, or a feature the model provider absorbs in the next release?",
    attribution: "Derived — the 2026 version of Sequoia's why-now, inverted into a why-still",
    label: "DERIVED",
    weakAnswer: "a moat described as prompt engineering.",
  },
  {
    id: "s8-data-flywheel",
    stage: 8,
    text: "What is the data flywheel, and is it real or asserted?",
    attribution: "Derived; Yan lists collecting user feedback as the pattern that builds one",
    label: "DERIVED",
    weakAnswer: "\"we get better with more usage\", with no mechanism by which a specific signal reaches a specific improvement.",
  },
  {
    id: "s8-trust-budget",
    stage: 8,
    text: "What is the trust budget — how many wrong answers before this user stops using it?",
    attribution: "Derived; the framing is the researcher's",
    label: "DERIVED",
    provenanceNote: "THIN on the numbers — the primary studies could not be reached",
    note: "Supporting evidence is real but mixed: HCI work places initial trust thresholds in the 70–85% accuracy range depending on consequence, and a 2023 study found radiologists accepted 11.3% error from humans but only 6.8% from AI.",
    weakAnswer: "accuracy quoted with no answer on what one visible failure costs. The evidence suggests users abandon rather than recalibrate.",
  },
  {
    id: "s8-source-opening-rate",
    stage: 8,
    text: "Do users open the source before they accept the answer, and do we measure it?",
    attribution: "Derived — the metric appears in a secondary H1-2026 UX/AI synthesis; adopted because it is directly instrumentable, not because that source carries weight",
    label: "DERIVED",
    note: "The AI-search journey runs: user states a need → system interprets and searches → system synthesises → user scans and acts. Source inspection is the only optional step in it, which is what makes the rate diagnostic.",
    weakAnswer: "an accuracy figure with no behavioural counterpart. A source-opening rate near zero means the citations are decoration and the trust is unearned.",
  },

  // ---------- Stage 9 — The famous killer questions, with provenance checked ----------
  // Press release: folded into s4-press-release (D3). "Three more from earlier stages": a
  // cross-reference to s3-why-now, s1-what-would-have-to-be-true and s7-abandonment (D2).
  // Levine and Graham: mottos without a weak-answer note, not entries (D2).
  {
    // A statement in the source; the last five words make it askable (D5).
    id: "s9-customer-experience-backwards",
    stage: 9,
    text: "You've got to start with the customer experience and work backwards to the technology. Where does this idea start?",
    attribution: "Steve Jobs, WWDC 1997, answering a hostile floor question about cancelling OpenDoc",
    label: "OBSERVED",
    note: "He continued: \"I've probably made this mistake more than anybody, and I've got the scar tissue to prove it.\"",
    weakAnswer: "a technology in search of a use, defended on capability.",
  },
  {
    id: "s9-eleven-star",
    stage: 9,
    text: "What would a 5-star experience be? What would a 6-star be?… What is the 11-star experience?",
    attribution: "Brian Chesky, on Masters of Scale with Reid Hoffman",
    label: "OBSERVED",
    note: "His own escalation: a 10-star check-in is the Beatles arriving in 1964 to 5,000 people cheering; the 11-star is \"you'd be there with Elon Musk and you're saying, 'You're going to space.'\" It is a generative exercise, not a target — go absurd deliberately, then walk back to the most extreme thing you could actually ship.",
    weakAnswer: "treating 11 stars as a roadmap.",
  },
  {
    // The source's own "Ask instead" question; the compressed "How do you know?" is the THIN one.
    id: "s9-strength-of-evidence",
    stage: 9,
    text: "What strength of evidence do you have, and is it proportionate to the consequence of being wrong?",
    attribution: "Marty Cagan, the evidence spectrum (Discovery — Judgement, SVPG); \"How do you know?\" is commonly attributed to him in this compressed form but could not be found in his own writing",
    label: "THIN",
    note: "What he verifiably argues is a spectrum of evidence — \"Evidence could span the full spectrum with just qualitative opinions from a small group of users at one end, all the way to statistically significant results in a discovery A/B test at the other end\" — and a judgement call: \"We need to balance time and cost against the risk and consequence.\"",
    weakAnswer: "confidence with no evidence type named.",
  },
  {
    // The source's "most common misuse" sentence IS the weak-answer note (D5). It is the one of 65
    // that opens as a capitalised standalone sentence rather than a fragment continuing "Weak
    // answer: …" — kept verbatim because group 28 case 9 pins the opening to the source; a renderer
    // that prefixes "Weak answer: " should render it as its own sentence.
    id: "s9-very-disappointed",
    stage: 9,
    text: "How would you feel if you could no longer use this product?",
    attribution: "Sean Ellis, who benchmarked it across roughly 100 startups",
    label: "OBSERVED",
    note: "\"Very disappointed\" above 40% is the threshold.",
    weakAnswer: "Its most common misuse: running it on people who are not yet the target user, which gives a false negative, and running it only on active users, which gives a false positive.",
  },
].map(Object.freeze));

// The twelve-question opening set, in the source's order. Each comment is the source's own
// "why this position" line; the two judgement calls are marked.
export const OPENING_SET = Object.freeze([
  // 1 · everything downstream is meaningless unanswered, and it is the cheapest question to ask
  //     cold. JUDGEMENT CALL: the source's "Whose problem is this, and how often does it happen to
  //     them?" asks for a person and a frequency; the Stage 1 entry asking "to whom, how often, and
  //     at what cost" is that question. Adzic's Why/Who/How/What was the other candidate and asks
  //     for an ORDER of questions, not a person.
  "s1-if-nobody-solves-this",
  // 2 · the substitute is the real competitor, and it reframes question 1 immediately.
  "s1-how-addressed-today",
  // 3 · while the room is still describing rather than defending; ask it later and you get the
  //     sanitised version.
  "s6-process-as-it-runs",
  // 4 · converts enthusiasm into testable conditions before anyone falls in love with a design.
  "s1-what-would-have-to-be-true",
  // 5 · immediately after 4, or the conditions become a wish list.
  "s2-riskiest-assumption",
  // 6 · before solution shape, because in complex SaaS the answer changes what you build, not just
  //     how you sell it.
  "s5-pain-budget-same-person",
  // 7 · placed after the problem and before any solution talk, so it constrains the design rather
  //     than being negotiated against one that already exists.
  "s4-appetite",
  // 8 · the first solution-side question, and it is about risk rather than features.
  "s4-rabbit-holes",
  // 9 · straight after 8, because the rabbit holes just named are the candidates.
  "s4-out-of-bounds",
  // 10 · the question that most often kills a complex-SaaS idea; better in hour one than in
  //      security review.
  "s6-accountable-when-wrong",
  // 11 · near the end, when the idea is specific enough for a state and a date to mean something.
  "s7-what-would-make-us-stop",
  // 12 · last only because it is conditional on an AI component; if there is one, it is not
  //      optional. JUDGEMENT CALL: the source's wording ("What is the eval, who owns it, and what is
  //      the cost per successful action?") merges two Stage 8 bullets; a merged DERIVED entry would
  //      be a question the source did not write, so the id is the eval entry and
  //      s8-cost-per-successful-action stays a separate bank entry.
  "s8-eval",
]);

// The four depths. Scope check is Stage 4's three scoping questions plus Stage 7's measurement
// (HEART's goals → signals → metrics) and two kill criteria. Full discovery is the twelve, then
// eighteen more in stage order following the source's own rule — questions cheap to ask cold go
// early, questions needing a specific proposal to bite go late; Stage 9's Jobs and Chesky entries
// are exercises rather than interview questions and stay out. #283 re-tunes this list when the
// branches land and owns keeping it at about thirty.
//
// Whole bank is every entry in source order (which IS stage order), DERIVED from QUESTIONS rather
// than retyped: the depth is the bank, so a literal here would be a second copy that drifts. The
// literal 65-id list is pinned in tooling/build-checks.mjs group 28 (WHOLE_BANK) instead, beside the
// other three depths, and the depth menu itself is pinned there by name. It re-admits the Stage 9
// exercises full discovery leaves out, so its label says what it is — a stress test of the bank and
// a way to compare two postures on one answer set — and never an interview.
export const DEPTHS = Object.freeze({
  "scope-check": Object.freeze({
    label: "Scope check",
    when: "a feature or change to something that exists",
    ids: Object.freeze([
      "s4-appetite",
      "s4-rabbit-holes",
      "s4-out-of-bounds",
      "s7-goals-signals-metrics",
      "s7-kill-state-and-date",
      "s7-what-would-make-us-stop",
    ]),
  }),
  "opening-set": Object.freeze({
    label: "Opening set",
    when: "a new surface or a substantial bet",
    ids: OPENING_SET,
  }),
  "full-discovery": Object.freeze({
    label: "Full discovery",
    when: "a new product",
    ids: Object.freeze([
      ...OPENING_SET,
      "s1-choice-cascade",
      "s1-premortem",
      "s2-more-than-one-way",
      "s2-last-time-show-me",
      "s2-switch-timeline",
      "s3-why-now",
      "s3-deliberately-not-doing",
      "s4-press-release",
      "s4-four-risks",
      "s4-circuit-breaker",
      "s5-value-metric",
      "s5-willingness-to-pay",
      "s6-audit-trail",
      "s6-coexist-with-incumbent",
      "s7-kill-state-and-date",
      "s7-goes-up-doing-nothing",
      "s8-failure-who-pays",
      "s9-strength-of-evidence",
    ]),
  }),
  "whole-bank": Object.freeze({
    label: "Whole bank (stress test)",
    when: "comparing two postures on one answer set; a stress test of the bank, not an interview",
    ids: Object.freeze(QUESTIONS.map((q) => q.id)),
  }),
});

// The entry for an id, or null. Total: anything the bank does not hold — an unknown id, a
// non-string — answers null, and the caller decides what null means.
export function questionById(id) {
  return QUESTIONS.find((q) => q.id === id) ?? null;
}

// The entries of stage n in source order; [] for a stage the bank does not hold. The compare is
// strict, so questionsForStage("1") is [] — a stage is a number everywhere in this module.
export function questionsForStage(n) {
  return QUESTIONS.filter((q) => q.stage === n);
}

// The entries of a depth, in the depth's order. Throws for a depth the menu does not hold.
export function selectDepth(depth) {
  const d = typeof depth === "string" && Object.hasOwn(DEPTHS, depth) ? DEPTHS[depth] : null;
  if (!d) throw new Error(`bank: unknown depth "${depth}"`);
  return d.ids.map((id) => questionById(id));
}
