# Feature: Bank width — five facet modules, the non-functional block, the AI-interaction module on `hasModel` (`discovery/bank.mjs`)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

Extend `discovery/bank.mjs` sideways. Today `selectDepth(depth)` answers a fixed list per depth and nothing about the product reaches it. After this ticket the bank carries **five facet modules** (`hasModel` · `regulated` · `internal` · `orgBuys` · `replacesAProcess`), each a named, ordered group of bank ids with a declared budget; a **non-functional block** of four new questions every declared full discovery gets; an **AI-interaction module** of six new questions fired by `hasModel`; **four presets** (the PRD's four product-type names) over the facet vector; and `selectDepth(depth, facets)`, total over all four depths, composing only `full-discovery` and answering today's lists byte-for-byte whenever no vector is declared. `whole-bank` stops being derived from `QUESTIONS` and becomes a frozen literal of today's 65 ids, so the graded fixture (`graded-think-a` / `graded-opus-a`, 130 real turns) stays scoreable. Group 28 grows the cases that can fail.

## User Story

As the operator opening a full discovery on a product that is B2B **and** regulated **and** has a model in the user's path
I want to state those facts as five checkboxes and have the session ask the questions those facts select, inside the ~30 budget, with what does not fit shown to me rather than cut
So that a rota-and-compliance product is not forced into one of four buckets, and every committed run, scorer and fixture keeps reading the list it was recorded against.

## Problem Statement

`DEPTHS["full-discovery"].ids` is one list for every product. The PRD's four product types cannot express a conjunction; the decision doc (`docs/epics/discovery-question-selection.architecture.md`) retired them as a mechanism and kept them as presets over a facet vector. Nothing in the bank implements that: there are no modules, no presets, no budget, no second argument to `selectDepth`. Meanwhile quality attributes (performance, availability, accessibility, security) are gated hard in this repo and elicited nowhere, and Stage 8 asks nothing about how a person instructs, corrects or stops a model. And the moment any question is added to `QUESTIONS`, `whole-bank` (derived by `QUESTIONS.map`) moves, `checkKey` wants 3× the new count against a sealed 195, `checkDraw` derives more rows than the committed 65, group 28's documented-65 pin and group 33's cases 1/3/15 go red, and the epic's only MVP 6 measurement dies.

## Solution Statement

Data plus pure selectors, in the module that already owns the bank. Ten new entries join `QUESTIONS` under stages 4 and 8 (ids `s4-*` / `s8-*`, so every id pin and the `s<stage>-<slug>` regex hold), each attributed to a primary source with a URL inside `attribution` (the closed key set stays closed). `whole-bank.ids` becomes a frozen literal of the 65 source-backed ids and never includes the ten. Five exports — `FACETS`, `MODULES`, `NON_FUNCTIONAL_BLOCK`, `PRESETS`, `FULL_DISCOVERY_BUDGET` — plus `facetPlan(facets)` (total, pure: which modules fire, which fit, which overflow, the count) and `selectDepth(depth, facets)` (composes `full-discovery` as twelve → fired modules in `FACETS` order → block; throws by name on overflow, never truncates). Group 28 gains eight cases: the added ten, the five facets, the modules, the presets, totality over the three absent forms and all 32 vectors, the composition with the stable prefix per depth, junk vectors refused by name, and the whole-bank freeze proven non-vacuous. README, `CLAUDE.md`, `gates.md`, the PRD's count sentence and the source preamble carry the new width.

## Out of Scope / Non-Goals

- Not included: reading `facets` from `run.json`, writing it at `openSession`, removing `branch`, the unfaceted `count` note in `discoveryConfig()`, replacing group 30 case 16's non-null-branch refusal — all **#285**. `portal/lib/discovery.mjs`, `portal/server.mjs`, `portal/public/portal.js` are not touched.
- Not included: the five checkboxes, the four preset buttons and the overflow message in the drawer — **#288**.
- Not included: wiring an elicited non-functional answer into `build-checks` or any gate — a later epic; the block's header says it elicits and records and enforces nothing.
- Not included: a classifier posture that proposes a facet from the twelve; not-applicable parking as a relevance signal; a rung between full discovery and whole bank — all deferred in the decision doc.
- Not included: a sixth facet (marketplace stays a PRD open question); a `SOURCES` export; a `url` key on entries.
- Not re-tuning: the unfaceted `full-discovery` 30. It stays the literal every committed full-discovery package walked. The composed list is the faceted one.
- Not changing: `whole-bank`'s 65 ids, the graded fixture, `tooling/discovery-score.mjs`, `docs/epics/fixtures/graded-answers/`, any committed package.
- Not changing: `docs/research/question-bank-source.md` below its preamble.

## Feature Metadata

**Feature Type**: Enhancement (bank width; new selectors on an existing data module)
**Estimated Complexity**: Medium — the mechanism is small and pure; the volume is editorial (ten new attributed questions, five module selections) plus the freeze that keeps 130 recorded turns scoreable
**Primary Systems Affected**: `discovery/bank.mjs` · `tooling/build-checks.mjs` group 28 · `discovery/README.md` · `CLAUDE.md` map line · `.claude/references/gates.md` · one sentence each in the PRD and the source preamble
**Dependencies**: none (the module keeps zero imports; no SDK, no DOM, no portal deps)
**One-pass confidence**: **10/10.** Every gate rule the new content could trip was driven against the planned strings verbatim before this plan was saved — see §PRE-CLEARED RISKS. What remains is copying literals that are written out in full below.

## Related Work

**Implements**: [#283](https://github.com/linardsb/ux-factory/issues/283) (amended 2026-09-02; plan from the amended body only)   ·   **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` §Data model ("The bank") and §Missing pieces; **the sub-decision `docs/epics/discovery-question-selection.architecture.md` is the spec for the model** (D1 facets · D1a budget · D1b which depths · D2 no inference · D3 the moment · D5 what folds). Inherited, not re-decided.

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/discovery-bank-282.md` — Why: the module's shape (frozen data + pure selectors, the header IS the spec), group 28's literal-pin convention, and the "#283 re-tunes this list" hook this plan closes differently (freeze, don't re-tune).
- `.claude/plans/discovery-graded-answer-fixture-348.md` — Why: `whole-bank`'s 65 is the fixture's key space; this plan's freeze exists to keep that plan's measurement alive.
- `.claude/plans/discovery-run-0-338.md` — Why: Run 0's AC7 read D1's table against the unfaceted tail; its "none found" bank finding is why the unfaceted 30 is frozen rather than re-tuned.

**Forward-references** (plans that extend or supersede this):

- #285 (session rules) — passes `head.facets` to `selectDepth`, writes it at `openSession`, drops `branch`, replaces group 30 case 16.
- #288 (portal width) — renders `FACETS` as checkboxes, `PRESETS` as buttons, `facetPlan().overflow` as the message.
- #293 (close-out) — reads "Asked what mattered" on the facet-selected tail; records the four unexercised facets as "not yet tested".

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `discovery/bank.mjs` (whole file, 806 lines) — Why: THE file. Lines 12–16 the readers list and the "#283 extends…" hook to rewrite; 18–50 the editorial rules D1–D6 (D7 joins them); 81–683 `QUESTIONS` (s4-four-risks closes at 321, s8-source-opening-rate at 635 — the two insertion points); 687–724 `OPENING_SET`; 726–738 the `DEPTHS` comment to rewrite; 739–787 `DEPTHS` (whole-bank at 782–786 derives from `QUESTIONS` — the one line the ticket says must change); 802–806 `selectDepth`.
- `docs/epics/discovery-question-selection.architecture.md` (whole file) — Why: D1's table gives each facet's checkbox question verbatim and "what it fires"; D1a is the budget rule; D1b names which depths take facets and the byte-identical wrong-if; D5 lists what #285 does with the refusal (so this ticket leaves it).
- `tooling/build-checks.mjs` (lines 122–127 the index entry for 28; 226 the bank import; 5195–5361 group 28 in full — the literals `TWELVE`/`SCOPE_CHECK`/`FULL_DISCOVERY`/`WHOLE_BANK` at 5201–5245, case 1's `BANK.length === 65` and `perStage`, case 5's whole-bank pin at 5282–5288 and the menu pin at 5293, case 7's `TITLE_TERMS` regex at 5324, case 9's source pin at 5350–5359, the `group("bank", …)` summary at 5361; 261–275 `ok`/`group`) — Why: every pin this ticket moves, and the case style (mutation-proof, message names the value).
- `tooling/build-checks.mjs` (lines 7515–7550, case 33.13) — Why: the circularity guard iterates `BANK`'s `weakAnswer`/`note`/`provenanceNote` for a 40-character span shared with any key answer. The ten new entries are inside that sweep. Keep their prose short and generic.
- `tooling/build-checks.mjs` (line 5938) — Why: `discoveryConfig().questions.length === BANK.length` — passes at 75 unchanged; know it exists.
- `tooling/discovery-score.mjs` (lines 55, 254, 394, 436) — Why: the scorer's four bank reads. `selectDepth("whole-bank")` at 394 is the key space (65 must hold); `selectDepth(pkg.run.depth)` at 436 is the package walk (one argument — unfaceted); `QUESTIONS.find` at 254 resolves an answer's question text (fine at 75).
- `portal/lib/discovery.mjs` (lines 463, 515, 541–556) — Why: the two one-argument callers and `discoveryConfig()`. Read to confirm nothing here changes; do not edit.
- `discovery/README.md` (lines 65–90 §Files; 186–222 `run.json`; 346–374 §The full-depth run; 375–420 §The graded answer fixture, line 415 says "each of the bank's 65 questions") — Why: where the new §The bank's width section goes (after `run.json`'s bullets, before `## The PRD projection` at 223), and the two lines that go stale.
- `docs/research/question-bank-source.md` (lines 1–19 the preamble; 40–142 the stages, for the source's voice; 163–200 Sources, for the citation style) — Why: line 17–19 says "plus the branch's own picks" and needs the facet wording; the stages are the register the ten new entries must match (a question, then a weak-answer note that names what is missing).
- `docs/epics/discovery-partner.prd.md` (line 7, the Inputs paragraph "The bank module holds **65**…"; MVP 4 at 188–210; MVP 5's table at 212–222; §Amendments 2026-09-02 at 497–512) — Why: MVP 4 names the six AI-interaction areas and the four non-functional areas in its own words; the Inputs count sentence gains the ten.
- `.claude/references/gates.md` (line 45, the Group 28 paragraph) — Why: it says "the whole-bank depth's 65 ids as a literal here, since bank.mjs derives that one" — false after this ticket.
- `CLAUDE.md` (line 103) — Why: the `discovery/` map line says "the edited question bank + depth selectors".
- `.claude/reports/discovery-run-0-338-report.md` (§AC7, in PR #362 / the dirty tree) — Why: the one real data point: thirty unfaceted questions all landed for one real product, and D1's table mapped against the tail. Background, not a gate input.

### New Files to Create

None. Every change lands in existing files. (The plan's HTML brief beside this file is untracked, like its siblings.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

All verified 2026-09-03 (WebFetch); cite these URLs verbatim in `attribution`.

- Amershi et al., *Guidelines for Human-AI Interaction*, CHI 2019 — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/ (the paper page; PDF linked from it). The 18 guidelines, from Table 1: G1 Make clear what the system can do · G2 Make clear how well the system can do what it can do · G3 Time services based on context · G4 Show contextually relevant information · G5 Match relevant social norms · G6 Mitigate social biases · G7 Support efficient invocation · G8 Support efficient dismissal · G9 Support efficient correction · G10 Scope services when in doubt · G11 Make clear why the system did what it did · G12 Remember recent interactions · G13 Learn from user behavior · G14 Update and adapt cautiously · G15 Encourage granular feedback · G16 Convey the consequences of user actions · G17 Provide global controls · G18 Notify users about changes. Why: the primary source for the AI-interaction module; every question names its G-numbers.
- Google PAIR, *People + AI Guidebook* chapters — https://pair.withgoogle.com/chapter/mental-models/ · https://pair.withgoogle.com/chapter/explainability-trust/ · https://pair.withgoogle.com/chapter/feedback-controls/ · https://pair.withgoogle.com/chapter/errors-failing/. Section names used below are the chapters' own ("Articulate data sources", "Decide how best to show model confidence", "Balance control & automation", "Provide paths forward from failure", "Account for user expectations of human-like interaction"). Why: the house citation for AI-UX material; never a secondary re-cut.
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*, Recommendation 12 December 2024 — https://www.w3.org/TR/WCAG22/ (conformance levels A, AA, AAA). Why: the accessibility-target question.
- Google, *Site Reliability Engineering*, ch. 4 Service Level Objectives — https://sre.google/sre-book/service-level-objectives/ ("It is better to allow an error budget…"). Why: the availability question.
- web.dev, *Interaction to Next Paint (INP)* — https://web.dev/articles/inp (good ≤ 200 ms, poor > 500 ms, at p75). Why: the performance-budget question, and the number this repo already gates.
- *Threat Modeling Manifesto* — https://www.threatmodelingmanifesto.org/ (the four questions: what are we working on · what can go wrong · what are we going to do about it · did we do a good enough job). Why: the security-boundary question.
- Memory rule (five-pillar talk attribution): never name the source talk's speaker for AI-UX material; cite Amershi / PAIR. Applied above.

### Patterns to Follow

**The entry shape (bank.mjs:83–91)** — `{ id, stage, text, attribution, label, provenanceNote?, weakAnswer, note? }`, frozen by the `.map(Object.freeze)` at 683. Keys outside that set fail case 3. `weakAnswer` is a fragment that continues "Weak answer: …" (lower-case opening, the source's register), never a restatement of `text`.

**Frozen data with a comment saying what to edit together (bank.mjs:76–80, 739)** — every new export is `Object.freeze`d at both levels; the comment above it names the gate case that pins it.

**Selectors throw plain Errors naming the value (bank.mjs:59–62, 804)** — `bank: unknown depth "${depth}"`. Facet refusals follow: `bank: unknown facet "marketplace" — the five are hasModel · regulated · …`.

**Gate cases pin literals and drive refusals (build-checks.mjs:5274–5305)** — each documented set is a literal in the gate; a mismatch prints the actual list; each throw is driven with junk and the message matched against the value it must name. Positive controls precede regex silences (5327).

**"What it cannot reach" closes every group summary (build-checks.mjs:5361)** — extend the sentence, don't drop it.

**C3 (bank.mjs:45–50, build-checks.mjs:5324)** — no role or seniority title in any string. `TITLE_TERMS` is `\b(product manager|product owner|project manager|head of|chief \w+ officer|ceo|cto|cpo|cfo|coo|cxo|vp|vice president|director|senior|junior|mid-level|principal|staff (engineer|designer)|executive|leadership|founder|manager|designer|pm)\b`. Every string below was written against it.

**C2 (no slop)** — a review fact against `~/.claude/skills/_shared/slop-blacklist.md`. The current bank has exactly one hit for the tier-1 grep in §VALIDATION; the diff must add zero.

**Ids are hand-chosen and stable (bank.mjs:52–53)** — `s<stage>-<slug>`, never derived from text; run packages key on them.

---

## IMPLEMENTATION PLAN

### Phase 1: The ten entries and the freeze

The bank gains its ten questions and `whole-bank` becomes a literal. After this phase the gate is RED by design (count 65 → 75, per-stage, case 9's source pin over the ten); Phase 3 turns it green. Do not "fix" the gate first — the red run is the proof that the pins can fail.

**Tasks:** header D7 + readers list · four block entries after `s4-four-risks` · six AI-interaction entries after `s8-source-opening-rate` · `whole-bank.ids` as the 65-id literal · the `DEPTHS` comment rewritten.

### Phase 2: The width — facets, modules, block, presets, budget, the selectors

**Depends on:** Phase 1 (module ids must resolve).

**Tasks:** `NON_FUNCTIONAL_BLOCK` · `FACETS` · `MODULES` · `PRESETS` · `FULL_DISCOVERY_BUDGET` · `normaliseFacets` (module-private) · `facetPlan` · `selectDepth(depth, facets)`.

### Phase 3: Group 28 extended

**Depends on:** Phases 1–2.

**Tasks:** cases 1, 5 and 9 re-pinned · cases 10–17 added · the summary string, the index entry and `gates.md` · the C3 sweep extended to the new exports.

### Phase 4: Docs and validation

**Depends on:** Phase 3 green.

**Tasks:** README section + two stale lines · `CLAUDE.md` map line · PRD Inputs sentence · source preamble · the full validation ladder · the report.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

Branch first: `git fetch origin && git switch -c feat/283-bank-width origin/main`. **The working tree on `main` carries a sibling session's uncommitted edits** (`.claude/plans/discovery-run-0-338.md`, `.claude/reports/discovery-run-0-338-report.md`, `docs/epics/discovery-partner.prd.md`, `docs/epics/discovery-partner.architecture.md` — PR #362, CLEAN and open), and **`git switch -c` carries those modifications onto the new branch**. They are not yours: never stage them, never revert them, never stash them. The commit step below stages by explicit path and asserts the staged set equals the seven files this plan names (two of them, the PRD and the report path, overlap the sibling's — the PRD edit here is one sentence and is staged with `git add -p`-free precision by committing only after `git diff --cached -- docs/epics/discovery-partner.prd.md` shows exactly the one-sentence hunk; if the sibling's PRD hunks are in the working tree, use `git add -p docs/epics/discovery-partner.prd.md` and take only the Inputs hunk).

### UPDATE `discovery/bank.mjs` — the header

- **IMPLEMENT**: Line 16 `// #283 extends QUESTIONS with the product-type branches and adds their selectors here.` → `// #283 extends QUESTIONS with the ten it added (D7) and adds the facet modules, presets and the` / `// two-argument selectDepth beside them; docs/epics/discovery-question-selection.architecture.md is the spec.` Add a fourth reader line after 15: `//   · tooling/discovery-score.mjs — selectDepth("whole-bank"), the graded fixture's 65-id key space (#348)`. Append **D7** after D6 (line 50):

  ```
  //   D7  THE ADDED TEN (#283) ARE OUTSIDE THE SOURCE AND OUTSIDE whole-bank. Four non-functional
  //       questions (s4-performance-budget · s4-availability-expectation · s4-accessibility-target ·
  //       s4-security-boundary) and six AI-interaction questions (s8-prompt-instruction ·
  //       s8-conversational-memory · s8-agentic-controls · s8-grounding-sources · s8-response-patterns ·
  //       s8-safety-and-trust). Each names a PRIMARY source with a URL inside attribution — Amershi et
  //       al. (CHI 2019) and Google PAIR for the six; WCAG 2.2, Google SRE ch. 4, web.dev INP and the
  //       Threat Modeling Manifesto for the four — never a secondary re-cut. They sit in stages 4 and 8
  //       so every id pin holds, and the source pin (group 28 case 9) is scoped to whole-bank's 65 so
  //       these ten are never asked to appear in a file they are not from. whole-bank NEVER includes
  //       them: it is a frozen literal, and graded-think-a / graded-opus-a (130 real turns) are only
  //       scoreable while it does not move. The non-functional block ELICITS AND RECORDS AND ENFORCES
  //       NOTHING — wiring an elicited answer into a gate is a later epic.
  ```
  Also line 61–62: `selectDepth throws a plain Error naming an unknown depth` → add `, an unknown or non-boolean facet, and a vector that overflows full discovery's budget (facetPlan is the total form that reports instead of throwing)`.
- **PATTERN**: bank.mjs:18–50 (D1–D6 voice).
- **VALIDATE**: `node --check discovery/bank.mjs`
- **SATISFIES**: AC3 (the block's header states it enforces nothing), AC7 (whole-bank freeze, stated where it lives).

### ADD `discovery/bank.mjs` — the non-functional block, after `s4-four-risks` (line 321)

- **IMPLEMENT**: four entries, stage 4, in this order. Preface with `// ---------- #283 · the non-functional block (D7) — every declared full discovery asks these; recorded only ----------`.

  ```js
  {
    id: "s4-performance-budget",
    stage: 4,
    text: "What is the performance budget — the slowest acceptable interaction, on which device and network, at which percentile — and what is measured against it today?",
    attribution: "Derived, supported by Google's Core Web Vitals thresholds (Interaction to Next Paint good at or under 200 ms at the 75th percentile) — https://web.dev/articles/inp",
    label: "DERIVED",
    note: "This repo gates INP at 200 ms and never asks a product what its own budget is; the answer is recorded as a decision with a wrong-if line and enforces nothing.",
    weakAnswer: "\"it should be fast\" — no number, no device, no percentile.",
  },
  {
    id: "s4-availability-expectation",
    stage: 4,
    text: "What availability does the customer expect, what does an hour down cost them, and who is paged when it is missed?",
    attribution: "Derived, from the SRE practice of a service level objective with an error budget (Google, Site Reliability Engineering, chapter 4) — https://sre.google/sre-book/service-level-objectives/",
    label: "DERIVED",
    weakAnswer: "\"99.9%\" quoted with no answer on what an outage costs the customer or who wakes up.",
  },
  {
    id: "s4-accessibility-target",
    stage: 4,
    text: "What accessibility target do we commit to — which WCAG conformance level, which assistive technologies are tested — and who checks it before launch?",
    attribution: "Derived, from W3C's WCAG 2.2 conformance levels (A, AA, AAA; Recommendation, December 2024) — https://www.w3.org/TR/WCAG22/",
    label: "DERIVED",
    weakAnswer: "\"we'll make it accessible\" — no level named, nothing tested with a screen reader, and nobody's name on the check.",
  },
  {
    id: "s4-security-boundary",
    stage: 4,
    text: "What is the security boundary — what must never cross it, who is the attacker we design against, and what do we refuse to store at all?",
    attribution: "Derived, from the Threat Modeling Manifesto's four questions (what are we working on, what can go wrong, what are we going to do about it, did we do a good enough job) — https://www.threatmodelingmanifesto.org/",
    label: "DERIVED",
    weakAnswer: "\"we use encryption\" — a control named with no boundary drawn and no attacker described.",
  },
  ```
- **PATTERN**: bank.mjs:324–332 (a DERIVED entry with a supporting citation in `attribution`).
- **GOTCHA**: `weakAnswer` opens lower-case or with a quote, continuing "Weak answer: …". No key outside the eight. No title term. Keep `note` where it carries the "records only" fact.
- **VALIDATE**: `node -e 'import("./discovery/bank.mjs").then(({questionsForStage})=>console.log(questionsForStage(4).map(q=>q.id).join(" ")))'` → the seven source ids then the four, in order.
- **SATISFIES**: AC3.

### ADD `discovery/bank.mjs` — the AI-interaction module's six, after `s8-source-opening-rate` (line 635)

- **IMPLEMENT**: six entries, stage 8, in this order. Preface with `// ---------- #283 · the AI-interaction module (D7) — fired by facets.hasModel; Amershi et al. (HAX) and Google PAIR are the primary sources ----------`.

  ```js
  {
    id: "s8-prompt-instruction",
    stage: 8,
    text: "How does a person instruct the model — what does the product make clear about what it can do and how well, and how do they refine a request that came back wrong?",
    attribution: "Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G1 Make clear what the system can do, G2 Make clear how well the system can do what it can do, G9 Support efficient correction — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    weakAnswer: "a blank box with a placeholder that says \"ask anything\" — no statement of what it can do, and refining means retyping.",
  },
  {
    id: "s8-conversational-memory",
    stage: 8,
    text: "In a conversation, what does the model remember from earlier turns, what does it forget, and what tone and social norms does it hold?",
    attribution: "Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G12 Remember recent interactions and G5 Match relevant social norms — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/; Google PAIR, People + AI Guidebook, Mental Models, \"Account for user expectations of human-like interaction\" — https://pair.withgoogle.com/chapter/mental-models/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    weakAnswer: "\"it's a chat\" — memory and tone left to the model's defaults, so nobody can say what it knows about the last five minutes.",
  },
  {
    id: "s8-agentic-controls",
    stage: 8,
    text: "When the model acts rather than answers, how does a person see what it is about to do, stop it while it runs, and undo what it did?",
    attribution: "Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G16 Convey the consequences of user actions, G17 Provide global controls, G8 Support efficient dismissal — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/; Google PAIR, People + AI Guidebook, Feedback + Control, \"Balance control & automation\" — https://pair.withgoogle.com/chapter/feedback-controls/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    note: "The bank's s8-human-in-the-loop asks whether a control is real; this asks what the interface shows before, during and after an action.",
    weakAnswer: "\"it asks before anything risky\" with no list of what counts as risky, no stop control while it runs and no undo after.",
  },
  {
    id: "s8-grounding-sources",
    stage: 8,
    text: "What is an answer grounded in — which sources, shown where, with what confidence — and can a person open the source from the answer?",
    attribution: "Google PAIR, People + AI Guidebook, Explainability + Trust, \"Articulate data sources\" and \"Decide how best to show model confidence\" — https://pair.withgoogle.com/chapter/explainability-trust/; Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G11 Make clear why the system did what it did — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    note: "s8-source-opening-rate measures whether people open the source; this asks whether there is one to open, and where it sits.",
    weakAnswer: "\"it uses retrieval\" — an architecture with no visible source at the point of the answer, and a confidence number nobody can act on.",
  },
  {
    id: "s8-response-patterns",
    stage: 8,
    text: "What does the product show while the model works, when it is unsure, when it partly succeeds and when it fails — and can a person regenerate a response or say what was wrong with it?",
    attribution: "Google PAIR, People + AI Guidebook, Errors + Graceful Failure, \"Provide paths forward from failure\" — https://pair.withgoogle.com/chapter/errors-failing/; Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G10 Scope services when in doubt and G15 Encourage granular feedback — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    weakAnswer: "a spinner, then the answer. No unsure state, no partial state, and failure is a generic error.",
  },
  {
    id: "s8-safety-and-trust",
    stage: 8,
    text: "What will the product refuse to do, what does it never send to the model or keep from a session, and how does a person report a harmful or wrong answer and see what happened to the report?",
    attribution: "Google PAIR, People + AI Guidebook, Explainability + Trust, \"Help users calibrate their trust\" — https://pair.withgoogle.com/chapter/explainability-trust/, and Feedback + Control, \"Communicate value & time to impact\" — https://pair.withgoogle.com/chapter/feedback-controls/; Amershi et al., Guidelines for Human-AI Interaction (CHI 2019), G6 Mitigate social biases and G18 Notify users about changes — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/",
    label: "OBSERVED",
    provenanceNote: "on the guidelines; the question's wording is the researcher's",
    weakAnswer: "a thumbs-down that goes nowhere, and a privacy policy in place of a boundary.",
  },
  ```
- **PATTERN**: bank.mjs:566–575 (`s8-human-in-the-loop` — OBSERVED on a pattern, `provenanceNote` naming what is the researcher's).
- **GOTCHA**: G-numbers and titles are the paper's Table 1 verbatim (listed in §Relevant Documentation). Do not paraphrase a guideline title. No title term anywhere ("engineer" alone is not in the list; "manager", "designer", "founder" are).
- **VALIDATE**: `node -e 'import("./discovery/bank.mjs").then(({QUESTIONS})=>{const t=QUESTIONS.filter(q=>/^s8-(prompt|conversational|agentic|grounding|response|safety)/.test(q.id));console.log(t.length, t.every(q=>/https:\/\//.test(q.attribution)&&/Amershi|PAIR/.test(q.attribution)))})'` → `6 true`.
- **SATISFIES**: AC4.

### UPDATE `discovery/bank.mjs` — `whole-bank` becomes a literal (lines 726–738 and 782–786)

- **IMPLEMENT**: Replace `ids: Object.freeze(QUESTIONS.map((q) => q.id)),` with the 65 ids as a literal, in source order — copy them from `tooling/build-checks.mjs:5222–5245` (`WHOLE_BANK`), one stage per line. Rewrite the comment block 726–738:

  ```
  // The four depths. Scope check is Stage 4's three scoping questions plus Stage 7's measurement
  // (HEART's goals → signals → metrics) and two kill criteria. Full discovery's ids are the UNFACETED
  // list: the twelve, then eighteen more in stage order following the source's own rule — questions
  // cheap to ask cold go early, questions needing a specific proposal to bite go late; Stage 9's Jobs
  // and Chesky entries are exercises rather than interview questions and stay out. #283 FROZE this list
  // rather than re-tuning it: every committed full-discovery package walked it (allergen-matrix-1, and
  // run 0 — thirty of thirty landed for one real product), and the faceted composition is a separate
  // list built by selectDepth(depth, facets) from OPENING_SET, MODULES and NON_FUNCTIONAL_BLOCK below.
  //
  // Whole bank is a FROZEN LITERAL of the 65 source-backed ids in source order (which IS stage order),
  // and it is deliberately NOT derived from QUESTIONS: a stress test's whole value is that it does not
  // move between recordings, and graded-think-a / graded-opus-a (#348, 65 turns each) are comparable
  // only while it holds. The ten D7 entries are never in it; widening the corpus is a second depth and
  // a second fixture, never an edit here. tooling/build-checks.mjs group 28 holds a second copy of the
  // 65 and asserts that every QUESTIONS entry outside this list is one D7 names — the check that can
  // fail. Its label says what it is — a stress test of the bank and a way to compare two postures on
  // one answer set — and never an interview.
  ```
- **PATTERN**: the depth literals at bank.mjs:743–750.
- **GOTCHA**: Copy, do not retype — one transposed id re-opens a $12 measurement. After the edit, `selectDepth("whole-bank").length` must be 65 while `QUESTIONS.length` is 75. **Case 33.14 sweeps every tracked `.mjs` for `/graded-(think|opus)-[abc]/` after stripping WHOLE-LINE and block comments only** (`build-checks.mjs:7560–7567`): the comment blocks above (D7 and the depths comment) name `graded-think-a` and are fine as whole-line `//` comments; a trailing comment on a code line (`"s9-very-disappointed", // graded-think-a…`) goes red naming the file. Keep every fixture-slug mention on its own comment line.
- **VALIDATE**: `node -e 'import("./discovery/bank.mjs").then(({QUESTIONS,selectDepth})=>console.log(QUESTIONS.length, selectDepth("whole-bank").length, /QUESTIONS\.map\(\(q\) => q\.id\)/.test(require("fs").readFileSync("discovery/bank.mjs","utf8"))))'` → `75 65 false`; then `node tooling/discovery-score.mjs --check-key && node tooling/discovery-score.mjs --check-draw` → both ✓ (195 answers, 65 rows).
- **SATISFIES**: AC7 (the freeze) and AC6's byte-identical wrong-if for `whole-bank`.

### ADD `discovery/bank.mjs` — the width exports, after `DEPTHS` (line 787)

- **IMPLEMENT**:

  ```js
  // --- the width (#283; docs/epics/discovery-question-selection.architecture.md D1, D1a) ------------

  // The non-functional block: four quality attributes every DECLARED full discovery asks, LAST, because
  // each bites only once a shape exists. Not facet-gated. Recorded as decisions with a wrong-if line
  // like any other, and enforced nowhere — wiring an elicited answer into a gate is a later epic.
  export const NON_FUNCTIONAL_BLOCK = Object.freeze([
    "s4-performance-budget",
    "s4-availability-expectation",
    "s4-accessibility-target",
    "s4-security-boundary",
  ]);

  // Five facts about a product, not categories for it (D1). `question` is what the person is asked at
  // intake (#288 renders it beside a checkbox); the order here is the order modules fire in.
  export const FACETS = Object.freeze([
    { id: "hasModel", question: "Does a model run in the user's path?", fires: "the AI-interaction module" },
    { id: "regulated", question: "Can a regulator, auditor or statutory duty inspect what this does?", fires: "Stage 6's audit-trail and accountability tail" },
    { id: "internal", question: "Do the users work for the organisation that builds it?", fires: "the process and workflow tail; it does not ask willingness-to-pay" },
    { id: "orgBuys", question: "Is the payer someone other than the user?", fires: "Stage 5's value-metric and pain-budget tail" },
    { id: "replacesAProcess", question: "Does it change how an organisation already works?", fires: "the transition-requirements tail MVP 10 already requires" },
  ].map(Object.freeze));

  // One module per facet: a NAMED, ORDERED group of bank ids with its own declared budget. Selection,
  // not new research — the only new text in the bank is D7's ten. Modules are DISJOINT from each other,
  // from OPENING_SET and from NON_FUNCTIONAL_BLOCK (group 28 pins it), so a composition never repeats.
  // Budgets: 7 · 6 · 6 · 6 · 6 — any two fit inside FULL_DISCOVERY_BUDGET with the twelve and the
  // block (12 + 4 + 13 = 29), any three overflow it (12 + 4 + 18 = 34). That arithmetic is D1a's rule
  // and group 28 drives every pair and every triple.
  export const MODULES = Object.freeze({
    hasModel: Object.freeze({
      label: "AI interaction",
      budget: 7,
      ids: Object.freeze([
        "s8-failure-who-pays",
        "s8-prompt-instruction",
        "s8-conversational-memory",
        "s8-agentic-controls",
        "s8-grounding-sources",
        "s8-response-patterns",
        "s8-safety-and-trust",
      ]),
    }),
    regulated: Object.freeze({
      label: "Regulated",
      budget: 6,
      ids: Object.freeze([
        "s4-four-risks",
        "s6-audit-trail",
        "s6-permission-model",
        "s6-where-data-lives",
        "s6-edge-cases-or-refusals",
        "s9-strength-of-evidence",
      ]),
    }),
    internal: Object.freeze({
      label: "Internal",
      budget: 6,
      ids: Object.freeze([
        "s1-why-who-how-what",
        "s2-why-do-you-want-it",
        "s2-last-time-show-me",
        "s6-integration-surface",
        "s7-abandonment",
        "s7-goes-up-doing-nothing",
      ]),
    }),
    orgBuys: Object.freeze({
      label: "Organisation buys",
      budget: 6,
      ids: Object.freeze([
        "s5-value-metric",
        "s5-willingness-to-pay",
        "s5-monetisation-failure",
        "s5-net-revenue-retention",
        "s5-gross-margin",
        "s5-pricing-model-story",
      ]),
    }),
    replacesAProcess: Object.freeze({
      label: "Replaces a process",
      budget: 6,
      ids: Object.freeze([
        "s1-premortem",
        "s2-switch-timeline",
        "s2-four-forces",
        "s3-where-is-the-inertia",
        "s3-deliberately-not-doing",
        "s6-coexist-with-incumbent",
      ]),
    }),
  });

  // The PRD's four names as PRESETS over the vector — a starting point the person adjusts, never a
  // cell (MVP 4 as amended 2026-09-02). Every preset carries all five keys so #288 can set five
  // checkboxes from one object. Consumer is the DECLARED all-false vector — it composes (twelve +
  // block, 16) — and is not the same input as {} (no vector; today's unfaceted 30).
  export const PRESETS = Object.freeze([
    { id: "regulated", label: "Regulated", facets: { hasModel: false, regulated: true, internal: false, orgBuys: false, replacesAProcess: false } },
    { id: "b2b-saas", label: "B2B SaaS", facets: { hasModel: false, regulated: false, internal: false, orgBuys: true, replacesAProcess: false } },
    { id: "internal-tool", label: "Internal tool", facets: { hasModel: false, regulated: false, internal: true, orgBuys: true, replacesAProcess: false } },
    { id: "consumer", label: "Consumer", facets: { hasModel: false, regulated: false, internal: false, orgBuys: false, replacesAProcess: false } },
  ].map((p) => Object.freeze({ ...p, facets: Object.freeze(p.facets) })));

  // MVP 5's ~30 as a budget the person spends (D1a), not a number width can quietly exceed.
  export const FULL_DISCOVERY_BUDGET = 30;
  ```
- **PATTERN**: bank.mjs:64–74 (`STAGES`), 739–787 (`DEPTHS`) — frozen at both levels, comment names the gate.
- **GOTCHA**: `MODULES[k].ids` must resolve through `questionById` and be disjoint (see the gate). The seven-id `hasModel` module is six new + `s8-failure-who-pays` (the one Stage 8 question D1's table and Run 0's AC7 both put on `hasModel`; it was in the unfaceted tail and would otherwise be asked by no declared vector). `internal` deliberately does not carry `s5-willingness-to-pay` ("drops willingness-to-pay", D1); the internal-tool preset still reaches it through `orgBuys` — see Q2.
- **VALIDATE**: `node -e 'import("./discovery/bank.mjs").then(({MODULES,questionById,OPENING_SET,NON_FUNCTIONAL_BLOCK})=>{const all=Object.values(MODULES).flatMap(m=>m.ids);console.log(all.length,new Set(all).size,all.every(id=>questionById(id)),all.some(id=>OPENING_SET.includes(id)||NON_FUNCTIONAL_BLOCK.includes(id)))})'` → `31 31 true false`.
- **SATISFIES**: AC1, AC2, AC3 (not facet-gated), AC9 (the budget).

### ADD `discovery/bank.mjs` — `facetPlan` and the two-argument `selectDepth` (replace lines 801–806)

- **IMPLEMENT**:

  ```js
  const FACET_IDS = FACETS.map((f) => f.id);

  // The vector, normalised: null for NO VECTOR (undefined, null or {} — every committed package and
  // every one-argument caller), a frozen five-key boolean record otherwise (a missing key reads false,
  // so a preset or a partial object composes). Junk throws by name on EVERY depth, so no run.json can
  // ever carry a vector the bank would not read.
  function normaliseFacets(facets) {
    if (facets === undefined || facets === null) return null;
    if (typeof facets !== "object" || Array.isArray(facets))
      throw new Error(`bank: facets must be an object of booleans keyed by ${FACET_IDS.join(" · ")}, got ${JSON.stringify(facets)}`);
    const keys = Object.keys(facets);
    if (keys.length === 0) return null;
    for (const k of keys) {
      if (!FACET_IDS.includes(k)) throw new Error(`bank: unknown facet "${k}" — the five are ${FACET_IDS.join(" · ")}`);
      if (typeof facets[k] !== "boolean") throw new Error(`bank: facet "${k}" must be true or false, got ${JSON.stringify(facets[k])}`);
    }
    return Object.freeze(Object.fromEntries(FACET_IDS.map((id) => [id, facets[id] === true])));
  }

  // What a vector composes, as a VALUE (D1a: overflow is shown, never resolved silently). Total and
  // pure. fired = the ticked facets in FACETS order; fits = the prefix of fired whose budgets, after the
  // twelve and the block, stay inside FULL_DISCOVERY_BUDGET; overflow = the rest, in order. count is the
  // length of the list that fits — a session's length only when overflow is empty. Undeclared → the
  // unfaceted list's count and nothing fired.
  export function facetPlan(facets) {
    const v = normaliseFacets(facets);
    if (v === null) return Object.freeze({ declared: false, fired: Object.freeze([]), fits: Object.freeze([]), overflow: Object.freeze([]), count: DEPTHS["full-discovery"].ids.length, budget: FULL_DISCOVERY_BUDGET });
    const fired = FACET_IDS.filter((id) => v[id]);
    const fits = [];
    const overflow = [];
    let count = OPENING_SET.length + NON_FUNCTIONAL_BLOCK.length;
    for (const id of fired) {
      if (count + MODULES[id].budget <= FULL_DISCOVERY_BUDGET) { fits.push(id); count += MODULES[id].budget; }
      else overflow.push(id);
    }
    return Object.freeze({ declared: true, fired: Object.freeze(fired), fits: Object.freeze(fits), overflow: Object.freeze(overflow), count, budget: FULL_DISCOVERY_BUDGET });
  }

  // The entries of a depth, in the depth's order. Throws for a depth the menu does not hold. TOTAL over
  // all four depths in its second argument (D1b): only full-discovery composes from a declared vector —
  // OPENING_SET in its order, then each fired module's ids in FACETS order, then the block — so a module
  // can only ever extend the tail. The other three answer their literal for every vector. No vector
  // (undefined, null, {}) answers today's list on every depth, byte for byte: every committed package
  // and every existing caller is that case. A vector that overflows the budget THROWS naming what fits
  // and what does not — never a silent truncation and never a 45-question session; facetPlan is the
  // form that reports instead (#288 shows it, #285 refuses on it).
  export function selectDepth(depth, facets) {
    const d = typeof depth === "string" && Object.hasOwn(DEPTHS, depth) ? DEPTHS[depth] : null;
    if (!d) throw new Error(`bank: unknown depth "${depth}"`);
    const plan = facetPlan(facets);
    if (depth !== "full-discovery" || !plan.declared) return d.ids.map((id) => questionById(id));
    if (plan.overflow.length)
      throw new Error(`bank: the facet vector overflows full discovery's ${plan.budget} — ${plan.fits.join(" + ") || "nothing"} fit (${plan.count}); ${plan.overflow.map((id) => `${id} (${MODULES[id].budget})`).join(", ")} does not; drop a facet or run whole-bank`);
    return [...OPENING_SET, ...plan.fits.flatMap((id) => MODULES[id].ids), ...NON_FUNCTIONAL_BLOCK].map((id) => questionById(id));
  }
  ```
- **PATTERN**: bank.mjs:789–806 (total selectors; a throw names the value).
- **GOTCHA**: `facetPlan` must be declared after `MODULES`/`DEPTHS` (module-scope consts). Keep `selectDepth`'s depth check FIRST so group 28's four junk-depth cases keep matching. `Function.length` of `selectDepth` is 2 — nothing pins it, but do not add a default value.
- **VALIDATE**:
  ```bash
  node -e 'import("./discovery/bank.mjs").then(({selectDepth,facetPlan,PRESETS,DEPTHS})=>{
    const ids=(x)=>x.map(q=>q.id).join(",");
    for (const d of Object.keys(DEPTHS)) for (const f of [undefined,null,{}]) if (ids(selectDepth(d,f))!==DEPTHS[d].ids.join(",")) throw new Error(d);
    const two=selectDepth("full-discovery",{regulated:true,orgBuys:true}); console.log(two.length, ids(two.slice(0,12))===DEPTHS["opening-set"].ids.join(","), ids(two.slice(-4)));
    console.log(PRESETS.map(p=>`${p.id}:${selectDepth("full-discovery",p.facets).length}`).join(" "));
    console.log(JSON.stringify(facetPlan({hasModel:true,regulated:true,internal:true})));
    try { selectDepth("full-discovery",{hasModel:true,regulated:true,internal:true}); } catch(e) { console.log(e.message); }
    try { selectDepth("opening-set",{marketplace:true}); } catch(e) { console.log(e.message); }
  })'
  ```
  Expected: `28 true s4-performance-budget,s4-availability-expectation,s4-accessibility-target,s4-security-boundary` · `regulated:22 b2b-saas:22 internal-tool:28 consumer:16` · a plan with `fits:["hasModel","regulated"]`, `overflow:["internal"]`, `count:29` · a throw naming `internal (6)` and `whole-bank` · a throw naming `marketplace`.
- **SATISFIES**: AC2 (presets compose), AC5 (fires on `facets.hasModel`, a declared value), AC6 (total; three depths ignore; byte-identical unfaceted), AC8 (stable prefix per depth), AC9 (overflow is a value, never a cut).

### UPDATE `tooling/build-checks.mjs` — group 28's existing pins (cases 1, 5, 9)

- **IMPLEMENT**:
  - Import line 226: add `FACETS, FULL_DISCOVERY_BUDGET, MODULES, NON_FUNCTIONAL_BLOCK, PRESETS, facetPlan` to the bank import.
  - After `WHOLE_BANK` (line ~5245) add the literal `const ADDED_283 = ["s4-performance-budget", "s4-availability-expectation", "s4-accessibility-target", "s4-security-boundary", "s8-prompt-instruction", "s8-conversational-memory", "s8-agentic-controls", "s8-grounding-sources", "s8-response-patterns", "s8-safety-and-trust"];` with the comment `// The ten #283 added OUTSIDE the source and OUTSIDE whole-bank (bank.mjs D7). Case 10 asserts QUESTIONS minus WHOLE_BANK is exactly this list — the statement that can fail once whole-bank is a literal.`
  - Case 1: `BANK.length === 65` → `75` with the message `… not 75 — 65 source-backed plus the ten of D7`; `perStage` → `[6, 7, 6, 11, 8, 8, 7, 18, 4]`; comment: "65 source entries per stage 6·7·6·7·8·8·7·12·4, plus D7's four in stage 4 and six in stage 8".
  - Case 5, the whole-bank block (5282–5288): keep `WHOLE_BANK.length === 65` and `ids(selectDepth("whole-bank")) === WHOLE_BANK`; REPLACE `ok(JSON.stringify(ids(BANK)) === JSON.stringify(WHOLE_BANK), "whole-bank must be the bank in source order …")` with two lines: `ok(JSON.stringify(ids(BANK).filter((id) => WHOLE_BANK.includes(id))) === JSON.stringify(WHOLE_BANK), "the 65 source-backed entries must keep source order inside QUESTIONS")` and `ok(!/QUESTIONS\.map\(\(q\) => q\.id\)/.test(readFileSync(join(ROOT, "discovery/bank.mjs"), "utf8")), "whole-bank must be a LITERAL in bank.mjs, never derived from QUESTIONS — a derived depth moves when a question is added and the graded fixture stops being scoreable")`. Rewrite the comment above it: the literal now lives in BOTH files and this is the copy that can disagree.
  - Case 9: `for (const q of BANK) ok(region.includes(…))` → `for (const q of BANK) if (WHOLE_BANK.includes(q.id)) ok(region.includes(q.weakAnswer.slice(0, 30)), …)`, then add `for (const id of ADDED_283) ok(!region.includes(questionById(id).weakAnswer.slice(0, 30)), \`${id}: a D7 entry's weak-answer opening is IN the source region — it is not from that file, so the scoping above is doing nothing\`);` (the non-vacuity proof for the scoping).
- **PATTERN**: build-checks.mjs:5250–5253, 5282–5288, 5350–5359.
- **GOTCHA**: Run the gate BEFORE this task and watch case 1, case 5 (`ids(BANK) === WHOLE_BANK`) and case 9 go red on the Phase 1 tree — that is the mutation proof for the pins. Record the red lines in the report.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "bank|build [✓✗]"` → group 28 ✓ (cases 10–17 not yet present).
- **SATISFIES**: AC7 (non-vacuous check after the freeze), AC10 (every module id resolves is case 12; here the count and source pins).

### ADD `tooling/build-checks.mjs` — group 28 cases 10–17, before the `group("bank", …)` line

- **IMPLEMENT** (each `ok` message names the value; positive controls where a regex or a set can be vacuous):

  ```js
  // 10 · the added ten (D7) — QUESTIONS minus whole-bank is EXACTLY this list, both directions; each
  //      resolves, sits in the stage its prefix names, cites a primary source by URL, and the six
  //      AI-interaction entries name Amershi or PAIR. The block is the first four; the six the rest.
  const outside = ids(BANK).filter((id) => !WHOLE_BANK.includes(id));
  ok(JSON.stringify(outside) === JSON.stringify(ADDED_283), `QUESTIONS minus whole-bank is ${JSON.stringify(outside)}, not D7's ten — an entry was added without joining this list, or one of the ten fell into whole-bank`);
  ok(ADDED_283.every((id) => questionById(id) !== null && !WHOLE_BANK.includes(id)), "every D7 id must resolve and stay OUT of whole-bank");
  for (const id of ADDED_283) ok(/https:\/\/\S+/.test(questionById(id).attribution), `${id}: attribution carries no URL — D7 entries cite a primary source by URL`);
  const AI_SIX = ADDED_283.slice(4);
  ok(JSON.stringify(NON_FUNCTIONAL_BLOCK) === JSON.stringify(ADDED_283.slice(0, 4)), `NON_FUNCTIONAL_BLOCK is ${JSON.stringify(NON_FUNCTIONAL_BLOCK)}, not D7's first four`);
  for (const id of AI_SIX) ok(/Amershi|PAIR/.test(questionById(id).attribution) && questionById(id).label === "OBSERVED", `${id}: the AI-interaction module cites HAX (Amershi) or PAIR as a PRIMARY source, OBSERVED`);
  ok(/enforces nothing|enforced nowhere/i.test(bankSrc), "the block's header must state it elicits and records and enforces nothing");

  // 11 · the five facets, in the documented order, each with the intake question and a fires line;
  //      frozen at both levels by an inert write.
  ok(JSON.stringify(FACETS.map((f) => f.id)) === JSON.stringify(["hasModel", "regulated", "internal", "orgBuys", "replacesAProcess"]), `FACETS is ${JSON.stringify(FACETS.map((f) => f.id))} — the five, in D1's order`);
  for (const f of FACETS) ok(filled(f.question) && f.question.endsWith("?") && filled(f.fires), `facet ${f.id} needs a question ending in ? and a fires line`);
  ok(Object.isFrozen(FACETS) && FACETS.every(Object.isFrozen), "FACETS must be frozen at both levels");

  // 12 · the modules — keyed exactly by FACETS, each a documented literal with a declared budget equal
  //      to its length, every id resolving, DISJOINT from each other, from the twelve and from the
  //      block, and hasModel carrying the six. Budgets pinned so any two fit and any three overflow.
  const MODULE_IDS = {
    hasModel: ["s8-failure-who-pays", ...AI_SIX],
    regulated: ["s4-four-risks", "s6-audit-trail", "s6-permission-model", "s6-where-data-lives", "s6-edge-cases-or-refusals", "s9-strength-of-evidence"],
    internal: ["s1-why-who-how-what", "s2-why-do-you-want-it", "s2-last-time-show-me", "s6-integration-surface", "s7-abandonment", "s7-goes-up-doing-nothing"],
    orgBuys: ["s5-value-metric", "s5-willingness-to-pay", "s5-monetisation-failure", "s5-net-revenue-retention", "s5-gross-margin", "s5-pricing-model-story"],
    replacesAProcess: ["s1-premortem", "s2-switch-timeline", "s2-four-forces", "s3-where-is-the-inertia", "s3-deliberately-not-doing", "s6-coexist-with-incumbent"],
  };
  ok(JSON.stringify(Object.keys(MODULES)) === JSON.stringify(FACETS.map((f) => f.id)), `MODULES is keyed ${JSON.stringify(Object.keys(MODULES))}, not by FACETS`);
  for (const f of FACETS) {
    const m = MODULES[f.id];
    ok(m && filled(m.label) && Number.isInteger(m.budget) && Array.isArray(m.ids), `module ${f.id} needs label, budget and ids`);
    ok(JSON.stringify(m.ids) === JSON.stringify(MODULE_IDS[f.id]), `module ${f.id} drifted: ${JSON.stringify(m.ids)}`);
    ok(m.budget === m.ids.length && m.budget >= 6 && m.budget <= 7, `module ${f.id}: budget ${m.budget} must equal its ${m.ids.length} ids and sit in 6..7 (any two fit, any three overflow)`);
    ok(m.ids.every((id) => questionById(id) !== null), `module ${f.id} references an id the bank does not hold`);
    ok(m.ids.every((id) => !OPENING_SET.includes(id) && !NON_FUNCTIONAL_BLOCK.includes(id)), `module ${f.id} repeats a twelve or block id`);
    ok(Object.isFrozen(m) && Object.isFrozen(m.ids), `module ${f.id} must be frozen`);
  }
  const allModuleIds = FACETS.flatMap((f) => MODULES[f.id].ids);
  ok(new Set(allModuleIds).size === allModuleIds.length, "two modules share an id — a composition would ask it twice");
  ok(!MODULES.internal.ids.includes("s5-willingness-to-pay"), "internal must not carry willingness-to-pay (D1)");
  ok(Object.isFrozen(MODULES), "MODULES must be frozen");

  // 13 · the presets — the PRD's four names, each carrying all five keys, each composing without
  //      overflow; consumer is the declared all-false vector and is NOT the same as {}.
  ok(JSON.stringify(PRESETS.map((p) => [p.id, p.label])) === JSON.stringify([["regulated", "Regulated"], ["b2b-saas", "B2B SaaS"], ["internal-tool", "Internal tool"], ["consumer", "Consumer"]]), `PRESETS drifted: ${JSON.stringify(PRESETS.map((p) => [p.id, p.label]))}`);
  const ticked = (p) => FACETS.map((f) => f.id).filter((id) => p.facets[id]);
  ok(JSON.stringify(PRESETS.map(ticked)) === JSON.stringify([["regulated"], ["orgBuys"], ["internal", "orgBuys"], []]), `the presets tick ${JSON.stringify(PRESETS.map(ticked))}, not D1's combinations`);
  for (const p of PRESETS) {
    ok(JSON.stringify(Object.keys(p.facets).sort()) === JSON.stringify(FACETS.map((f) => f.id).sort()) && Object.values(p.facets).every((v) => typeof v === "boolean"), `preset ${p.id} must carry all five facets as booleans`);
    ok(facetPlan(p.facets).declared && facetPlan(p.facets).overflow.length === 0, `preset ${p.id} must compose without overflow`);
    ok(Object.isFrozen(p) && Object.isFrozen(p.facets), `preset ${p.id} must be frozen`);
  }
  ok(selectDepth("full-discovery", PRESETS[3].facets).length === 16 && selectDepth("full-discovery", {}).length === 30, "consumer (declared all-false) is twelve + block = 16; {} is NO vector and answers the unfaceted 30");

  // 14 · TOTALITY (D1b) — the three ABSENT forms and every one of the 32 vectors, driven against all
  //      four literals: the three non-composing depths never move, and no vector answers today's
  //      list on full-discovery except the absent forms. Byte-identical means JSON-identical here.
  const LITERALS = { "scope-check": SCOPE_CHECK, "opening-set": OPENING_SET, "full-discovery": FULL_DISCOVERY, "whole-bank": WHOLE_BANK };
  const vectors = [];
  for (let bits = 0; bits < 32; bits += 1) vectors.push(Object.fromEntries(FACETS.map((f, i) => [f.id, Boolean(bits & (1 << i))])));
  for (const k of Object.keys(DEPTHS)) {
    ok(JSON.stringify(ids(selectDepth(k))) === JSON.stringify(LITERALS[k]), `selectDepth("${k}") with ONE argument moved: ${JSON.stringify(ids(selectDepth(k)))}`);
    for (const absent of [undefined, null, {}]) ok(JSON.stringify(ids(selectDepth(k, absent))) === JSON.stringify(LITERALS[k]), `selectDepth("${k}", ${JSON.stringify(absent) ?? "undefined"}) must be byte-identical to today's list`);
    if (k !== "full-discovery") for (const v of vectors) ok(JSON.stringify(ids(selectDepth(k, v))) === JSON.stringify(LITERALS[k]), `depth ${k} moved under vector ${JSON.stringify(v)} — only full-discovery composes`);
  }
  ok(facetPlan(undefined).declared === false && facetPlan({}).declared === false && facetPlan(PRESETS[3].facets).declared === true, "facetPlan must read undefined and {} as NO vector and an all-false object as a declared one");

  // 15 · the COMPOSITION — for every vector: the stable prefix asserted for full-discovery ONLY (whole
  //      bank's first twelve are source order and are deliberately not asserted), the fired modules in
  //      FACETS order, the block LAST exactly once, no repeat, the count arithmetic; every pair fits,
  //      every triple / quad / quint overflows — reported by facetPlan and THROWN by selectDepth naming
  //      the facet that does not fit and the whole-bank escape.
  ok(JSON.stringify(ids(selectDepth("whole-bank")).slice(0, 12)) !== JSON.stringify(TWELVE), "positive control: whole-bank's first twelve are NOT the opening set, so the prefix assertion below must stay scoped to full-discovery");
  let pairs = 0, overflows = 0;
  for (const v of vectors) {
    const fired = FACETS.map((f) => f.id).filter((id) => v[id]);
    const plan = facetPlan(v);
    ok(JSON.stringify(plan.fired) === JSON.stringify(fired), `facetPlan fired ${JSON.stringify(plan.fired)} for ${JSON.stringify(fired)}`);
    const want = 12 + 4 + fired.reduce((s, id) => s + MODULES[id].budget, 0);
    if (fired.length <= 2) {
      ok(plan.overflow.length === 0 && plan.count === want && want <= FULL_DISCOVERY_BUDGET, `${fired.join("+") || "consumer"} must fit: plan ${JSON.stringify(plan)}`);
      const list = ids(selectDepth("full-discovery", v));
      ok(JSON.stringify(list.slice(0, 12)) === JSON.stringify(TWELVE), `full-discovery under ${fired.join("+") || "no facet"} does not start with the twelve in OPENING_SET's order`);
      ok(JSON.stringify(list.slice(12, 12 + want - 16)) === JSON.stringify(fired.flatMap((id) => MODULES[id].ids)), `the modules must follow the twelve in FACETS order under ${fired.join("+")}`);
      ok(JSON.stringify(list.slice(-4)) === JSON.stringify(NON_FUNCTIONAL_BLOCK) && list.filter((id) => NON_FUNCTIONAL_BLOCK.includes(id)).length === 4, `the block must be LAST, once, under ${fired.join("+") || "no facet"}`);
      ok(list.length === want && new Set(list).size === list.length, `full-discovery under ${fired.join("+") || "no facet"} is ${list.length} long with ${new Set(list).size} distinct — want ${want}`);
      ok(selectDepth("full-discovery", v).every((q) => questionById(q.id) === q), "a composed list must answer the bank's own entries");
      if (fired.length === 2) pairs += 1;
    } else {
      ok(plan.overflow.length >= 1 && plan.fits.length === 2 && plan.count <= FULL_DISCOVERY_BUDGET, `${fired.join("+")} must overflow with exactly two fitting: plan ${JSON.stringify(plan)}`);
      let msg = null;
      try { selectDepth("full-discovery", v); } catch (e) { msg = e.message; }
      ok(msg !== null && plan.overflow.every((id) => msg.includes(id)) && msg.includes("whole-bank") && msg.includes(String(FULL_DISCOVERY_BUDGET)), `an overflowing vector must THROW naming every facet that does not fit, the budget and the whole-bank escape — got ${JSON.stringify(msg)}`);
      overflows += 1;
    }
  }
  ok(pairs === 10 && overflows === 16, `drove ${pairs} pairs and ${overflows} overflowing vectors — want 10 and 16`);
  ok(JSON.stringify(selectDepth("full-discovery", { regulated: true })) === JSON.stringify(selectDepth("full-discovery", PRESETS[0].facets)), "a partial vector and the full-key preset it equals must compose the same list");

  // 16 · junk vectors refused BY NAME on every depth — a vector no run.json may ever carry.
  const JUNK_FACETS = [["x", "facets must be"], [[], "facets must be"], [42, "facets must be"], [{ marketplace: true }, "marketplace"], [{ hasModel: "yes" }, "hasModel"], [{ hasModel: 1 }, "hasModel"], [{ regulated: null }, "regulated"]];
  for (const k of Object.keys(DEPTHS)) for (const [junk, needle] of JUNK_FACETS) {
    let msg = null;
    try { selectDepth(k, junk); } catch (e) { msg = e.message; }
    ok(msg !== null && msg.includes(needle), `selectDepth("${k}", ${JSON.stringify(junk)}) must throw naming ${JSON.stringify(needle)}, got ${JSON.stringify(msg)}`);
  }

  // 17 · purity of the new surface — two calls agree, the plan is frozen, a write to a composed list's
  //      source arrays is inert, and the composition never aliases MODULES.
  ok(JSON.stringify(facetPlan(PRESETS[2].facets)) === JSON.stringify(facetPlan(PRESETS[2].facets)) && Object.isFrozen(facetPlan(PRESETS[2].facets)), "facetPlan must be pure and answer a frozen plan");
  ok(Object.isFrozen(NON_FUNCTIONAL_BLOCK) && Object.isFrozen(PRESETS), "NON_FUNCTIONAL_BLOCK and PRESETS must be frozen");
  { const before = JSON.stringify(MODULES); try { MODULES.hasModel.ids.push("s1-premortem"); } catch { /* strict-mode throw; the compare decides */ } ok(JSON.stringify(MODULES) === before, "a write to a module must be inert"); }
  ```
  Extend case 7's C3 sweep: after the `DEPTHS` label/when loop add `for (const f of FACETS) ok(!TITLE_TERMS.test(f.question) && !TITLE_TERMS.test(f.fires), \`facet ${f.id} carries a title\`); for (const [k, m] of Object.entries(MODULES)) ok(!TITLE_TERMS.test(m.label), \`module ${k} label carries a title\`); for (const p of PRESETS) ok(!TITLE_TERMS.test(p.label), \`preset ${p.id} label carries a title\`);`. Note `bankSrc` is read in case 8 — case 10 uses it, so either move the `readFileSync` above case 8's block or re-read; do not reorder cases.
- **PATTERN**: build-checks.mjs:5274–5318 (literal pins, purity, inert writes), 5297–5305 (junk driven, message matched).
- **GOTCHA**: `ids()` is the group's own helper (`qs.map((q) => q.id)`); `filled` too. The prefix assertion is written **for full-discovery only** — the positive control above it proves an unscoped version would fail on whole-bank for a non-defect. The 32-vector loop is cheap (< 5 ms); do not sample it.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 33 groups pass`. Then the mutation proofs, each reverted after: (a) swap two ids inside `MODULES.regulated.ids` → case 12 red by module name; (b) set `budget: 8` on `hasModel` → case 12 red on the 6..7 pin and case 15 red on a pair; (c) put `s8-failure-who-pays` into `internal` too → "two modules share an id"; (d) move the block before the modules in `selectDepth` → case 15 "block must be LAST"; (e) drop the `plan.overflow.length` throw → case 15's overflow message; (f) restore `QUESTIONS.map((q) => q.id)` on whole-bank → case 5's literal pin AND case 10 red. Record all six in the report.
- **SATISFIES**: AC1, AC2, AC5, AC6, AC8, AC9, AC10 (every module id resolves; no cut question — the five-questions prefix and Stage 10 are not in `QUESTIONS`, so resolution is the check; the absent and empty cases driven against all four lists; full-discovery at ~30).

### UPDATE `tooling/build-checks.mjs` — the summary, the index entry

- **IMPLEMENT**: Rewrite `group("bank", …)` (line ~5361 pre-edit): "75 entries — 65 source-backed pinned per stage 6·7·6·7·8·8·7·12·4 plus D7's four in stage 4 and six in stage 8 — … the whole bank as the 65 in source order (a FROZEN LITERAL in both files, with QUESTIONS minus whole-bank asserted to be exactly D7's ten) … the five facets in D1's order · the five modules as documented literals, budgets equal to their lengths and pinned to 6..7, disjoint from each other, the twelve and the block · the four presets ticking D1's combinations and composing without overflow, consumer as the declared all-false vector distinct from {} · TOTALITY driven over the three absent forms and all 32 vectors against all four literals · the composition per vector — the twelve first (asserted for full-discovery ONLY, with whole-bank as the positive control), modules in FACETS order, the block LAST once, the count arithmetic, ten pairs fitting and sixteen overflowing vectors THROWING by facet name with the whole-bank escape · seven junk vectors refused by name on every depth · purity and frozenness of the new surface by inert writes · the source pin scoped to whole-bank with D7's ten proven ABSENT from the source region · C3 over facet questions, module and preset labels". Keep the closing "What it cannot reach" and add: "whether a module's selection is the RIGHT selection for its facet — an editorial fact the second, faceted full-discovery run reads (decision doc D4); and whether a person can answer a facet box without having done the discovery (D2's wrong-if), which only a real intake can show". Update the index entry at 122–127 to mention the facet modules, presets, totality and the frozen whole-bank.
- **VALIDATE**: `node tooling/build-checks.mjs | grep -c "✓"` unchanged group count (33); `grep -n "all 33 groups" tooling/build-checks.mjs` still present (no new group).
- **SATISFIES**: AC10.

### UPDATE `discovery/README.md`

- **IMPLEMENT**:
  - Line 71: `bank.mjs               the question bank + the depth/branch selectors (#282)` → `the question bank (65 source-backed + #283's ten) + the depth selectors, facet modules and presets (#282, #283)`.
  - Line 200 bullet (`depth` and `branch`): append one sentence — `#285 replaces \`branch\` with \`facets\`, the five-key boolean vector whose keys are \`bank.mjs\`'s \`FACETS\`; packages recorded before it carry no \`facets\` field and read as the unfaceted list.` (Do not rewrite the example at 190; #285 owns it.)
  - Line 415: `For each of the bank's 65 questions` → `For each of \`whole-bank\`'s 65 questions (the source-backed bank; #283's ten are outside it by design)`.
  - Insert a new section before `## The PRD projection` (line 223):

    ```markdown
    ## The bank's width — facets, modules, presets, the budget (#283)

    Decided in [`docs/epics/discovery-question-selection.architecture.md`](../docs/epics/discovery-question-selection.architecture.md) (D1, D1a, D1b). The four product types are **presets**; the selection input is a **facet vector** — five booleans, each a fact about the product: `hasModel` · `regulated` · `internal` · `orgBuys` · `replacesAProcess` (`bank.mjs` `FACETS`, with the intake question beside each). Each keys a **module**: a named, ordered group of bank ids with a declared budget (`MODULES`). Selection, never new research — the only new text is the ten D7 entries: the **non-functional block** (`NON_FUNCTIONAL_BLOCK`, four quality attributes every declared full discovery asks, recorded as decisions and **enforced nowhere**) and the **AI-interaction module** (six areas seeded from Amershi et al.'s HAX guidelines and Google PAIR's People + AI Guidebook, cited by URL in each entry's `attribution`).

    **`selectDepth(depth, facets)` is total.** Only `full-discovery` composes: the twelve in `OPENING_SET`'s order, then each ticked module in `FACETS` order, then the block. `scope-check`, `opening-set` and `whole-bank` answer their literal for every vector. **No vector — `undefined`, `null` or `{}` — answers today's list on every depth, byte for byte**: every package in this directory predates facets and is that case, and so is `tooling/discovery-score.mjs`. `whole-bank` is a **frozen literal of the 65 source-backed ids** and never includes the ten; `graded-think-a` / `graded-opus-a` are comparable only while it holds.

    **The budget (D1a).** MVP 5's ~30 is spent, never exceeded: twelve + block + at most two modules (budgets 7 · 6 · 6 · 6 · 6) fit inside `FULL_DISCOVERY_BUDGET` (30); a third ticked facet overflows. `facetPlan(facets)` reports `fired` · `fits` · `overflow` · `count` as a value; `selectDepth` **throws** on overflow naming the facet that does not fit — never a silent truncation, never a 45-question session. What the drawer does with the value is #288; what `openSession` refuses on is #285. `PRESETS`: Regulated ticks `regulated`; B2B SaaS ticks `orgBuys`; Internal tool ticks `internal` + `orgBuys`; Consumer ticks nothing as a **declared** all-false vector (twelve + block, 16 questions) — a preset is a starting point the person adjusts.

    **Known debt — four unexercised facets.** Only `regulated` gets a run in wave 1 (#291); `hasModel` fires on run 2 (#292); `internal`, `orgBuys` and `replacesAProcess` ship with no run behind them. Their modules are a selection made from reasoning, not a validated design, and #293 records "Asked what mattered" as *not yet tested* for them rather than inventing a proxy. The first reading that means anything is the second, faceted `full-discovery` run on a real product with a different vector.
    ```
- **PATTERN**: README §The full-depth run (346–374) — a section states what it shows and what it does not.
- **VALIDATE**: `grep -c "unexercised" discovery/README.md` → 1; `grep -n "depth/branch" discovery/README.md` → none.
- **SATISFIES**: AC11 (the debt line), AC3 (enforced nowhere, in the format spec).

### UPDATE `CLAUDE.md`, `.claude/references/gates.md`, the PRD, the source preamble

- **IMPLEMENT**:
  - `CLAUDE.md:103`: `bank.mjs: the edited question bank + depth selectors` → `bank.mjs: the edited question bank (65 source-backed + #283's ten) + the depth selectors, five facet modules, presets and the ~30 budget (whole-bank is a frozen literal)`.
  - `.claude/references/gates.md:45`: rewrite the Group 28 paragraph — remove "since bank.mjs derives that one from QUESTIONS", add the facet/module/preset/totality/composition/junk-vector cases and the scoped source pin, and extend the italic "cannot reach" with the two editorial facts named in the summary task.
  - `docs/epics/discovery-partner.prd.md:7`: after "The bank module holds **65** — … reconciled in #282; the pre-reconciliation number was 66." append: " #283 added ten entries outside that count and outside `whole-bank` — the non-functional block and the AI-interaction module — so the module holds 75 and the graded fixture's key space stays 65."
  - `docs/research/question-bank-source.md:17–19`: "Full discovery selects roughly 30 of them: the twelve below, plus the branch's own picks, plus the non-functional block, plus the AI-interaction module when the product has a model in it." → "Full discovery selects roughly 30: the twelve below, then the facet modules the person ticks at intake (at most two fit the budget), then the non-functional block; the AI-interaction module fires on the `hasModel` facet. The ten questions those two blocks add live in `discovery/bank.mjs` (its D7), not in this file." Nothing below the `---` changes.
- **GOTCHA**: The PRD and architecture doc are DIRTY in the working tree from PR #362 on `main`; on the fresh branch from `origin/main` they are clean. Edit only the one PRD sentence. `git diff --stat` before staging must show exactly the files this plan names.
- **VALIDATE**: `git diff --stat` lists `discovery/bank.mjs tooling/build-checks.mjs discovery/README.md CLAUDE.md .claude/references/gates.md docs/epics/discovery-partner.prd.md docs/research/question-bank-source.md` and nothing else.
- **SATISFIES**: AC11; keeps the map and the gate index true.

### VALIDATE — the whole ladder (see §VALIDATION COMMANDS), then the report, then the commit

- **IMPLEMENT**: run every level; write `.claude/reports/discovery-bank-width-283-report.md` (the six mutation proofs, the pre-Phase-3 red run, the C2 grep, the smoke, every deviation). Stage by path and assert the set before committing:
  ```bash
  git add discovery/bank.mjs tooling/build-checks.mjs discovery/README.md CLAUDE.md .claude/references/gates.md docs/research/question-bank-source.md .claude/plans/discovery-bank-width-283.md .claude/reports/discovery-bank-width-283-report.md
  git add -p docs/epics/discovery-partner.prd.md      # take ONLY the Inputs-sentence hunk; the sibling's hunks stay unstaged
  git diff --cached --name-only | sort > /tmp/283-staged.txt
  printf '%s\n' .claude/plans/discovery-bank-width-283.md .claude/references/gates.md .claude/reports/discovery-bank-width-283-report.md CLAUDE.md discovery/README.md discovery/bank.mjs docs/epics/discovery-partner.prd.md docs/research/question-bank-source.md tooling/build-checks.mjs | sort | diff - /tmp/283-staged.txt && echo staged-set-ok
  git diff --cached --stat -- docs/epics/discovery-partner.prd.md    # one file, a handful of lines, one hunk
  ```
  Then `piv-commit` → `piv-create-pr` with `Closes #283` in the body.
- **VALIDATE**: `staged-set-ok` printed; `gh pr view --json body -q .body | grep -c "Closes #283"` → 1; `gh pr view --json files -q '.files[].path' | wc -l` → 9 (the review file joins at `piv-review-pr`).

---

## TESTING STRATEGY

No suite, no linter (CLAUDE.md). Group 28 is the test, and its new cases are written so each can fail:

### Unit Tests (group 28, pure, CI)

Cases 10–17 above plus the re-pinned 1, 5, 9. Every documented set is a literal in the gate; every refusal is driven with junk and matched by name; the prefix check is scoped and has a positive control; totality is driven over 32 + 3 inputs per depth, never sampled.

### Integration Tests

- `tooling/discovery-score.mjs --check-key`, `--check-draw`, `--selftest`, and a real score of `graded-think-a --run a` → `answers sealed ✓ 65/65` (the freeze holds under the real scorer, not just the gate).
- `discovery/prd-projection.mjs allergen-matrix-1 --stdout` byte-equal to the committed `prd.md` (group 33.15 and 32.5 also compare; the projection reads the bank through `questionById` and `STAGES` only).
- Portal smoke: `/api/health` answers; `/api/discovery/config` reports 75 questions and the four depths with counts 6 · 12 · 30 · 65 (unfaceted, as today).

### Edge Cases

- `{}` vs the consumer preset (undeclared vs declared all-false) — case 13.
- A partial vector `{ regulated: true }` equals its full-key preset — case 15.
- A vector on `whole-bank`/`opening-set`/`scope-check` never moves the list — case 14.
- A junk key, a non-boolean, an array, a string, a number — case 16, on every depth.
- Three ticked → exactly two fit, the third named in the throw; four and five likewise — case 15.
- The 40-character circularity guard (33.13) over the ten new entries' prose — pre-cleared, see below; CI re-runs it on the real module.

---

## PRE-CLEARED RISKS (observed 2026-09-03, before this plan was saved)

Every rule in the existing gate stack that new bank content could trip was driven against the ten entries, the five facet questions and `fires` lines, and the module and preset labels **exactly as written in this plan**, using the real committed inputs. A probe script (the same regexes as the gate, the same span construction as 33.13) reported:

| Risk | Gate that would catch it | Driven against | Observed |
|---|---|---|---|
| A new weak-answer note or note shares a 40-character span with a sealed key answer, making every future score circular | 33.13 (`build-checks.mjs:7515–7550`) | the 195 answers in `docs/epics/fixtures/graded-answers/key.json` → 95,030 spans | **0 hits** across `weakAnswer` · `note` · `provenanceNote` of all ten |
| A new string carries a role or seniority title | 28 case 7 `TITLE_TERMS` | every string field of the ten, the five facet `question` + `fires`, five module labels, four preset labels | **0 hits** |
| A new string carries a slop word | the C2 review rule (`~/.claude/skills/_shared/slop-blacklist.md`, tiers 1–2) | the same strings | **0 hits** |
| A new string reads as a DOM reach | 28 case 8 | the same strings | **0 hits** |
| The scoped source pin is vacuous (a new note happens to open with 30 characters that ARE in the source) | 28 case 9 as re-pinned | `docs/research/question-bank-source.md`, Stage 1 → The twelve region | **none of the ten** openings occur in the region |
| An entry breaks the closed key set, is untrimmed, or repeats `text` as `weakAnswer` | 28 case 3 | the ten | **all valid** |
| A fixture slug on a code line | 33.14 (sweeps tracked `.mjs`/`.html`/`.js`, whole-line and block comments stripped) | the planned `bank.mjs` comments | fine as whole-line comments; the GOTCHA on the whole-bank task pins it |
| A module id that does not resolve, repeats the twelve, or repeats another module | 28 cases 5 and 12 | the 25 existing ids in `MODULES` against the current bank | **25 resolve · 0 in the twelve · 0 duplicates** |
| The sibling session's dirty files ride into the commit | none — the staging assertion in the commit task | `git status` on `main`: four modified files from PR #362 | guarded by the explicit `git add` list + the staged-set diff |

What is NOT a one-pass risk and is left to the second faceted run: whether a module's selection is the right one for its facet (editorial; a two-literal edit if re-tuned), and whether a person can answer a facet box without having done the discovery (D2's own wrong-if, observable only at a real intake). Neither can turn the gate red or block the PR.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node --check discovery/bank.mjs && node --check tooling/build-checks.mjs
# C2: the tier-1 slop grep must report the SAME count as before the change (baseline: 1 hit in the bank)
grep -cE -i '\b(delve|leverage|utilize|robust|comprehensive|seamless|streamline|empower|foster|enhance|elevate|pivotal|holistic|crucial|vital|navigate|harness|unlock|unleash|tapestry|testament|paradigm|synergy|myriad|plethora|underscore|furthermore|moreover|ultimately)\b' discovery/bank.mjs   # → 1
git diff origin/main -- discovery/bank.mjs | grep '^+' | grep -cE -i '\b(delve|leverage|utilize|robust|comprehensive|seamless|streamline|empower|foster|enhance|elevate|pivotal|holistic|crucial|vital|navigate|harness|unlock|unleash)\b'   # → 0
```

### Level 2: Unit Tests

```bash
node tooling/build-checks.mjs                       # build ✓  all 33 groups pass; group 28's ✓ line names the new cases
```

### Level 3: Integration Tests

```bash
node tooling/discovery-score.mjs --check-key && node tooling/discovery-score.mjs --check-draw && node tooling/discovery-score.mjs --selftest
node tooling/discovery-score.mjs --slug graded-think-a --run a | head -2      # answers sealed ✓  65/65
node discovery/prd-projection.mjs allergen-matrix-1 --stdout | diff - discovery/allergen-matrix-1/prd.md && echo projection-stable
node tooling/drift-check.mjs && node tooling/token-lint.mjs                 # the CI verify job's other two steps
```

### Level 4: Manual Validation

```bash
# the selector, by hand — expected values in the facetPlan task's VALIDATE
node -e 'import("./discovery/bank.mjs").then(({selectDepth,PRESETS})=>console.log(PRESETS.map(p=>`${p.id}:${selectDepth("full-discovery",p.facets).map(q=>q.id).join(",")}`).join("\n")))'
# portal smoke on a PRIVATE port, PID-scoped kill (never pkill node)
cd portal && PORT=4799 node server.mjs > /tmp/p283.log 2>&1 & echo $! > /tmp/p283.pid; sleep 1
curl -s http://127.0.0.1:4799/api/health | head -c 200; echo
curl -s http://127.0.0.1:4799/api/discovery/config | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);console.log(c.questions.length, c.depths.map(d=>`${d.id}:${d.count}`).join(" "))})'   # 75 scope-check:6 opening-set:12 full-discovery:30 whole-bank:65
kill "$(cat /tmp/p283.pid)"; cd ..
```

### Level 5: Additional Validation

The six mutation proofs listed under the cases-10–17 task, each reverted, each recorded in the report. The pre-Phase-3 red run (cases 1, 5, 9 red on the Phase 1 tree) recorded too. The pre-clears in §PRE-CLEARED RISKS are re-run by the gate itself on the landed module (33.13, 33.14, 28 cases 3/7/8/9); if any goes red, the landed string differs from the plan's — diff the entry against this file before rewording.

---

## ACCEPTANCE CRITERIA

- [ ] AC1 Five facet modules, each returning bank ids in order with its own declared budget; selection only — the ten new entries are attributed like any other (case 10, 12).
- [ ] AC2 The four PRD names ship as presets over the vector, each a documented combination the person can adjust (case 13).
- [ ] AC3 The non-functional block: four areas, each a question with a weak-answer note, recordable as a decision; not facet-gated; its header says it enforces nothing (case 10, 15; the header grep).
- [ ] AC4 The AI-interaction module: six areas, each attributed to HAX or PAIR primary sources with URLs; C2 and C3 hold (case 10, case 7's sweep, the C2 grep).
- [ ] AC5 The module fires on `facets.hasModel` — a declared value, one mechanism (case 15; `#285` reads it from `run.json`).
- [ ] AC6 `selectDepth(depth, facets)` total over four depths; three ignore the vector; `selectDepth(d)`, `(d, null)`, `(d, {})` byte-identical to today's lists — driven, not assumed (case 14).
- [ ] AC7 `whole-bank` is a frozen literal of the 65; group 28 keeps a non-vacuous check (every id resolves; `QUESTIONS \ whole-bank` is exactly the ten) (case 5, 10; the scorer's `--check-key`).
- [ ] AC8 The stable prefix asserted per depth — full-discovery's first twelve under every vector; never "for every depth" (case 15 with its positive control).
- [ ] AC9 Twelve + block + at most two modules inside ~30; a third overflows as a reported value, never a silent cut, never 45 (case 15).
- [ ] AC10 Group 28 extended: every module id resolves; no cut question; absent and empty driven against all four lists; full-discovery stays ~30 (cases 12, 14, 15).
- [ ] AC11 The four unexercised facets recorded as known debt in `discovery/README.md`.
- [ ] All validation commands pass; no committed package, fixture, key or draw changes; `git diff --stat` shows only the seven files named.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (Phase 1 red run recorded before Phase 3)
- [ ] Each task's VALIDATE passed immediately
- [ ] Levels 1–5 executed; the six mutation proofs recorded
- [ ] `build ✓  all 33 groups pass` on the final tree
- [ ] Scorer, projection and portal smoke green
- [ ] Report at `.claude/reports/discovery-bank-width-283-report.md`; PR body carries `Closes #283`; plan, report and review in the same PR
- [ ] The sibling session's four dirty files on `main` untouched and unstaged

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — a declared vector has no neutral core, by D1a's arithmetic.** Under a declared vector the composition is twelve + fired modules + block; the six neutral questions of today's unfaceted tail that no module carries (`s1-choice-cascade` · `s2-more-than-one-way` · `s3-why-now` · `s4-press-release` · `s4-circuit-breaker` · `s7-kill-state-and-date` — observed by probing the tail against the module lists; `s9-strength-of-evidence` survives only via `regulated`) are asked by no declared vector, and a consumer product gets 16. This is what "the tail is a budget, not a union: the twelve + the block + at most two modules" means, and the plan inherits it. **Assumption:** no core. **If the owner wants one:** a three-id `CORE` fired by every declared vector (say `s1-premortem` · `s3-why-now` · `s4-press-release`) keeps every pair inside 30 only if `hasModel` drops to 6 and the others to 5 — a budget table change, not a spine change; it is a D1a amendment and belongs in the decision doc first.
- **Q2 — the internal-tool preset asks willingness-to-pay through `orgBuys`.** D1 says the `internal` module "drops willingness-to-pay" and also that the preset ticks `internal` + `orgBuys`; `orgBuys` carries `s5-willingness-to-pay`. Both are honoured literally. If the owner meant the preset never asks it, the preset becomes `internal` alone (one line in `PRESETS`, one literal in case 13).
- **Q3 — overflow is reported greedily in `FACETS` order.** With three ticked, the first two in declaration order fit and the third is named. The person can untick any of the three; the selector resolves nothing. An alternative — report all three as "over by N" — was rejected because #285's AC says "the selector reports *what does not fit*", which wants a name.
- **Q4 — `hasModel` carries seven ids, not six.** The seventh is the existing `s8-failure-who-pays`. Dropping it makes the module exactly the six areas and the budgets 6 · 6 · 6 · 6 · 6; every gate literal above adjusts by one number.
- **A1 — module contents are the plan's editorial selection** from D1's "what it fires" column, listed in full in the MODULES task with the reasoning in NOTES. They are what the second, faceted run tests (decision doc D4); changing one is a literal edit in two files (`MODULES` and case 12's `MODULE_IDS`). This is a product judgement, not an implementation risk — the pass succeeds with these lists, and re-tuning later is one PR with two literals.
- **A2 — facet validation runs on every depth.** "Three depths ignore the second argument" is read as "their output never depends on a valid vector"; a junk vector still throws by name everywhere so no `run.json` can carry one. The three depths are proven byte-identical under all 32 valid vectors plus the three absent forms.
- **A3 — the URL lives inside `attribution`.** The entry key set stays closed (case 3); the six AI questions' attributions carry two URLs where they draw on both sources.
- **A4 — no group number is claimed.** The ticket says "extends the bank group"; group 28 grows and the verdict line stays "all 33 groups".

## NOTES (open canvas)

**Why the ten sit in stages 4 and 8, not a stage 10.** `STAGES` is pinned 1–9, ids must match `/^s[1-9]-/`, and the source's own Stage 10 ("the first ninety days") is the one thing the PRD cut by name — a new stage 10 would collide with it in every doc. Stage 4 is solution shape (the block is quality attributes of a shape); Stage 8 is AI-era (the six are the interaction half Stage 8 never had). The stage counts move from 7 → 11 and 12 → 18; nothing but group 28 pins them.

**The module selections, with the reason for each.**

| Module | Ids (stage order) | Why these |
|---|---|---|
| `hasModel` (7) | `s8-failure-who-pays` + the six | D1: "the AI-interaction module". Failure-who-pays is the bridge from governance to interaction, was in the unfaceted tail, and Run 0's AC7 mapped it here |
| `regulated` (6) | `s4-four-risks` · `s6-audit-trail` · `s6-permission-model` · `s6-where-data-lives` · `s6-edge-cases-or-refusals` · `s9-strength-of-evidence` | D1: "Stage 6's audit-trail and accountability tail" (accountable-when-wrong and process-as-it-runs are in the twelve). Four-risks is where legal lives; strength-of-evidence asks for proportion to the consequence of being wrong, which is statutory here |
| `internal` (6) | `s1-why-who-how-what` · `s2-why-do-you-want-it` · `s2-last-time-show-me` · `s6-integration-surface` · `s7-abandonment` · `s7-goes-up-doing-nothing` | D1: "Stage 6 process/workflow questions; drops willingness-to-pay". Internal tools are commissioned as a What from a request; the artefact they replace is the evidence; adoption is often mandated, so the sunk-cost and vanity-metric questions bite |
| `orgBuys` (6) | `s5-value-metric` · `s5-willingness-to-pay` · `s5-monetisation-failure` · `s5-net-revenue-retention` · `s5-gross-margin` · `s5-pricing-model-story` | D1: "Stage 5's value-metric and pain-budget tail" (pain-budget is in the twelve; free-tier-cost is the consumer/PLG one and stays out) |
| `replacesAProcess` (6) | `s1-premortem` · `s2-switch-timeline` · `s2-four-forces` · `s3-where-is-the-inertia` · `s3-deliberately-not-doing` · `s6-coexist-with-incumbent` | D1: "the transition-requirements tail". The switch timeline and the four forces are the transition's mechanics; inertia and "who will be annoyed" are its politics; coexistence is its two years; the premortem is its disaster story |

Every one of the 65 is in the twelve, a module, or deliberately neither (the Stage 9 exercises, Stage 3's map/beachhead/what-winning-earns, Stage 7's HEART/north-star/counter-metric, Stage 8's governance tail). That "neither" set is Q1.

**Composition order — modules before the block.** The source's rule: cheap-to-ask-cold early, needs-a-proposal late. Every block question needs a shape ("a performance budget for what?"), so it closes the session. The stable-prefix AC only needs the first twelve, so either order satisfies it; this one is stated in the block's header and pinned by case 15 ("the block must be LAST").

**Why `{}` is not the consumer preset.** D1b's wrong-if makes `selectDepth(d, {})` today's list — so `{}` must be "no vector". D1 says the block is not facet-gated and every full discovery gets it — so a consumer session must be declared. The only consistent reading: consumer = the five keys explicitly false. Case 13 pins both halves so nobody can later "simplify" one into the other.

**Why `selectDepth` throws on overflow rather than returning a plan.** Every caller maps over the return (`.map((q) => q.id)`, the cursor's `questions[index]`); a return type that is sometimes a list and sometimes a report would break the four callers silently. A throw is the bank's existing posture for a programming error, and an overflowing vector reaching `selectDepth` IS one — #288 resolves it in the drawer before Start, #285 refuses it at `openSession` by catching exactly this message. `facetPlan` is the total form for both.

**What the freeze costs.** Two copies of the 65 exist (bank.mjs and the gate) and disagree loudly. A future "let's re-record the graded fixture over 75" is a second depth (`whole-bank-2`?) and a second key — the decision doc's rejected alternative is recorded in the bank's comment so the next editor sees it.

**The dirty tree.** PR #362 (Run 0 phase C, docs only) is CLEAN and open; its four files are modified in the shared working directory on `main`. Branch from `origin/main`, and stage by path.

**Sequencing after this.** #285 (reads `facets` from `run.json`, writes it at `openSession`, drops `branch`, replaces case 16) → #288 (the control). Neither is blocked on anything here beyond the exports.

## AMENDMENTS

_(empty at creation)_
