# Feature: The question bank as an edited module (`discovery/bank.mjs`)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

Turn `docs/research/question-bank-source.md` (stages 1–9 of the ideation question bank, plus the twelve-question opening set) into one frozen, Node-import-safe data module with pure selectors over it: `discovery/bank.mjs`. Every entry keeps its attribution, its weak-answer note and its OBSERVED / DERIVED / THIN label. Three depth selectors (scope check · opening set · full discovery) pick from the bank rather than authoring anything. A new `build-checks` group proves the bank's shape, the twelve-set's resolution, the selectors' documented sets, C3 (no job titles) and purity. The count the module actually holds replaces the PRD's "66".

## User Story

As the operator starting a product in the portal
I want the discovery agent to ask questions from one edited, attributed bank with a weak-answer note per question
So that each answer is judged against a rubric the research already wrote, and every later reader (the session module, the PRD projection, the gate) reads the same definition rather than a fork of it.

## Problem Statement

The bank exists only as prose in a parked research file. Nothing can import it, select from it by depth, or assert that every question carries the weak-answer note the agent judges against. The PRD's count (66) was never reconciled against the file, which holds 68 top-level bullets, some carrying several questions and some not questions at all.

## Solution Statement

One data module shaped like `system/build-questions.mjs` (frozen data + pure selectors), placed under a new top-level `discovery/` so `gen-loc-summary.mjs` never counts it and no shipped page can reach it. One source bullet becomes one bank entry (the editorial unit is a turn, not a sentence). The twelve-set and the three depths are arrays of ids resolved against the bank. A `build-checks` group asserts the count against what the module holds and pins each selector's exact documented set. The PRD, the architecture doc and the source preamble get the reconciled number in the same PR.

## Out of Scope / Non-Goals

- Not included: the four product-type branches, the non-functional block, the conditional AI-interaction module (#283 extends this module and its gate group).
- Not included: the op vocabulary, `discovery/README.md`, the CLAUDE.md run-package section (#281).
- Not included: any portal route, session cursor or UI (#284, #285, #288).
- Not included: a `SOURCES` export with URLs — the source file stays the citation; run packages cite URLs through `file_evidence` rows (#281/#289).
- Not changing: `docs/research/question-bank-source.md` beyond its preamble's count line. The raw brief stays "unedited"; the module is the edited bank.
- Not changing: `system/build-questions.mjs`, `portal/lib/builder.mjs`, `agent-layer/gen-loc-summary.mjs`.
- Not re-adding: the "five questions before the twelve" and Stage 10. Cut, and it stays cut.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (large in volume, low in mechanism; the risk is editorial fidelity)
**Primary Systems Affected**: new `discovery/` tree · `tooling/build-checks.mjs` · three docs (PRD, architecture, source preamble) · `CLAUDE.md` map + group count · `.claude/references/gates.md`
**Dependencies**: none (zero-import module; no SDK, no DOM, no portal deps)

## Related Work

**Implements**: [#282](https://github.com/linardsb/ux-factory/issues/282) · **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` §Data model → "The bank — `discovery/bank.mjs`" (placement and shape are decided there, not here)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/build-questions-breadboard.md` — Why: the seam this mirrors (`system/build-questions.mjs`: data + pure selectors, one definition many readers)
- `.claude/plans/studio-replay-recorder-203.md` — Why: `system/board-ops.mjs`'s frozen-vocabulary shape and its "iterate the list, never a roster" gate pattern

**Forward-references** (plans that extend or supersede this):

- #283 (bank width) extends `QUESTIONS`, adds branch selectors, extends the bank gate group
- #281 (ops) resolves `question_id` through `questionById` and claims the next gate group number
- #285 (session rules) walks `selectDepth(...)`'s ids with the cursor

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `docs/research/question-bank-source.md` (whole file, 204 lines) — Why: THE source. Stages 1–9 at lines 40–142, the twelve at 144–161, Sources at 163–200. Read it twice before writing an entry.
- `docs/epics/discovery-partner.architecture.md` (lines 116–135) — Why: the placement decision and the loc-summary tripwire; lines 183 and 316 carry the "66" to correct.
- `docs/epics/discovery-partner.prd.md` (lines 5, 58, 237, 251, 341, 431) — Why: MVP 4/5 and the six "66" mentions to correct.
- `system/build-questions.mjs` (lines 1–27 header; 145–295 `ACTS`/`QUESTIONS` shape) — Why: the seam to mirror — frozen data, a header that IS the spec, `reasoning` per entry.
- `system/board-ops.mjs` (lines 1–45) — Why: the "Node-import-safe and side-effect-free, a CI gate imports it before any page does" header, and `OPS` frozen with a comment saying what to edit together.
- `tooling/build-checks.mjs` (lines 1–120 index; 121–170 imports; 175–190 `ok`/`group`; 4994–5095 group 27 in full; 5098–5105 the verdict) — Why: the group shape, the mutation-proof convention, the "what this group cannot reach" closing sentence, and the `all 27 groups` literal to bump.
- `agent-layer/gen-loc-summary.mjs` (lines 20–30) — Why: proves `discovery/` matches no group (the tripwire stays quiet).
- `.claude/references/gates.md` (lines 1–15, 40–46) — Why: the group-doc format; line 5's list and line 11's count to update.
- `CLAUDE.md` (line 83 area for the map; line 108 for the group count) — Why: the index line for `discovery/` and the count.
- `~/.claude/skills/_shared/slop-blacklist.md` — Why: the C2 pass. Note the literal-use and quoted-text exemptions.

### New Files to Create

- `discovery/bank.mjs` — the bank: `STAGES`, `QUESTIONS`, `OPENING_SET`, `DEPTHS`, `questionById`, `questionsForStage`, `selectDepth`

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Epic #279 §Constraints C2, C3 and §MVP 4, 5 (the epic issue body is the PRD).
- `docs/epics/discovery-partner.architecture.md` §Data model → the bank; §Other eng-lead calls → "`build-checks` grows one group".
- No external library docs: the module has zero imports.

### Patterns to Follow

**Header is the spec** (`system/board-ops.mjs:1–33`): a `// discovery/bank.mjs — …` header citing `epic #279, ticket #282; architecture §Data model → The bank`, then the editorial rules (D1–D6 below) written as prose. Nothing in CLAUDE.md restates them.

**Frozen data, comment says what to edit together** (`system/board-ops.mjs:36–38`):
```js
// The op vocabulary, in one place. Frozen: a consumer that wants a new verb edits this list and
// the switch below together, not one of them.
export const OPS = Object.freeze([
```

**Selectors are pure and total where a consumer needs totality** (`system/build-questions.mjs:79–90`): `quadrantFor(answers)` returns from the data, never mutates. Here: `questionById` returns the entry or `null`; `selectDepth` throws a plain `Error` naming the unknown depth (`agent-layer/lib.mjs` error style — the message names the offending value).

**Gate group shape** (`tooling/build-checks.mjs:4994–5095`): `// --- N · <name> (#ticket) ---` header, a block of `ok(cond, "message that names what drifted")` cases, positive controls that prove the check can fail, then `group("<name>", "<detail sentence ending with what this group cannot reach>")`.

**Mutation proves the check** (memory: "the check that cannot fail"): for the C3 term list, assert the regex matches a planted title string before asserting it matches nothing in the bank.

**Doc corrections ride in the same PR** (#281's AC does the same for the architecture doc's `system/` sentence — leave that one to #281).

---

## IMPLEMENTATION PLAN

### Phase 1: Author the bank (`discovery/bank.mjs`)

**Tasks:**
- Write the header with the editorial rules (D1–D6).
- `STAGES` (9), `QUESTIONS` (65 entries per the id table below), `OPENING_SET` (12 ids), `DEPTHS` metadata, the three selectors.
- Import-check in plain Node.

### Phase 2: The gate group

**Depends on:** Phase 1

**Tasks:**
- Add the bank import and the group to `tooling/build-checks.mjs`; update the header index and the `all N groups` literal.
- Run the mutation sweep (delete a weakAnswer, plant a title, reorder the twelve) and record each red in the report.

### Phase 3: Docs and the count

**Independent of:** Phase 2 (can run alongside it)

**Tasks:**
- Replace "66" with the module's count in the PRD, the architecture doc and the source preamble; one reconciliation sentence in the PRD's Inputs line.
- `CLAUDE.md`: `discovery/` index line + group count. `.claude/references/gates.md`: count, boundary list, group paragraph.

### Phase 4: The C2 pass and validation

**Depends on:** Phase 1

**Tasks:**
- Run the `humanizer` skill over `discovery/bank.mjs`'s `text`/`weakAnswer`/`note` strings against the blacklist; apply Tier A fixes only where the word is not inside a quotation.
- Full validation ladder.

---

## EDITORIAL DECISIONS (the header of `bank.mjs` restates these; they are what a reviewer checks the module against)

**D1 — one source bullet, one entry.** The unit is a turn: what the agent asks in one go. Stage 1's choice cascade (five questions) and Stage 4's four risks are each ONE entry whose `text` carries all of them. The count is entries, not sentences.

**D2 — what is excluded, and why.** Two of the 68 top-level bullets are not questions and carry no weak-answer note: Levine's "Fall in love with the problem" and Graham's "Make something people want" (the source itself says reformulating the latter as a question is not a quote). A question with no weak-answer note is a bug, so they do not enter. Stage 9's unbulleted "Three more from earlier stages…" line is a cross-reference to entries that already exist.

**D3 — one fold.** "What does the press release say?" appears in Stage 4 and again in Stage 9 with a second weak-answer sentence. One entry, `s4-press-release`; the Stage 9 sentence goes into its `note` ("also the single question most often used as a go/no-go filter" — reworded from "executive filter" per C3). A bank that holds the same question twice can be asked it twice in one session.

**Derived count: 68 − 2 (D2) − 1 (D3) = 65.** Per stage: 6 · 7 · 6 · 7 · 8 · 8 · 7 · 12 · 4. The gate pins both. If the implementer's honest count differs, the gate and the docs follow the module, and the header says why.

**D4 — the label rule.** `label` is the source's FIRST bracketed label (`OBSERVED` | `DERIVED` | `THIN`). Where the source qualifies it ("[OBSERVED on method; … [THIN] on verbatim]"), the qualifier goes verbatim-ish into `provenanceNote`. Never two labels on one entry.

**D5 — text stays the source's words.** `text` is the source's quoted question where the bullet is a question. Where the bullet is a framework statement (Stage 2's four forces, Stage 4's four risks), the fewest added words make it askable and the source's phrases stay intact. `weakAnswer` is the source's "*Weak answer: …*" sentence(s), de-italicised. For `s9-very-disappointed` the source's "most common misuse" sentence IS the weak-answer note. For `s9-strength-of-evidence` the text is the source's own "Ask instead" question and the attribution records the Cagan misattribution. `attribution` is the em-dash clause ("Roger Martin and A.G. Lafley, the strategy choice cascade"); DERIVED entries read "Derived, from …" naming what the source built on.

**D6 — C3 edits, exactly two.** The press-release structure line drops "an executive quote" → "a quote from the company"; the Stage 9 fold note drops "executive filter" → "go/no-go filter". "Can our engineers build…" (Cagan, verbatim) and "the support engineer who can impersonate" STAY: a profession named inside a question's substance is not a title for who is asked. The gate's term list is written so both survive, and the gate comment says so.

### The id table (65) — stable ids, `s<stage>-<slug>`, in source order

| Stage | ids |
|---|---|
| 1 Problem framing (6) | `s1-choice-cascade` · `s1-what-would-have-to-be-true` · `s1-premortem` · `s1-how-addressed-today` · `s1-why-who-how-what` · `s1-if-nobody-solves-this` |
| 2 Demand and evidence (7) | `s2-more-than-one-way` · `s2-why-do-you-want-it` · `s2-riskiest-assumption` · `s2-last-time-show-me` · `s2-switch-timeline` · `s2-four-forces` · `s2-kano-pair` |
| 3 Market, wedge and strategy (6) | `s3-why-now` · `s3-user-need-map` · `s3-where-is-the-inertia` · `s3-beachhead` · `s3-deliberately-not-doing` · `s3-what-winning-earns` |
| 4 Solution shape and scoping (7) | `s4-appetite` · `s4-breadboard-elements` · `s4-rabbit-holes` · `s4-out-of-bounds` · `s4-circuit-breaker` · `s4-press-release` · `s4-four-risks` |
| 5 Business model (8) | `s5-value-metric` · `s5-willingness-to-pay` · `s5-monetisation-failure` · `s5-pain-budget-same-person` · `s5-net-revenue-retention` · `s5-gross-margin` · `s5-pricing-model-story` · `s5-free-tier-cost` |
| 6 Complex, regulated, workflow-heavy (8) | `s6-process-as-it-runs` · `s6-accountable-when-wrong` · `s6-permission-model` · `s6-audit-trail` · `s6-where-data-lives` · `s6-coexist-with-incumbent` · `s6-edge-cases-or-refusals` · `s6-integration-surface` |
| 7 Measurement and kill criteria (7) | `s7-goals-signals-metrics` · `s7-north-star` · `s7-counter-metric` · `s7-kill-state-and-date` · `s7-what-would-make-us-stop` · `s7-abandonment` · `s7-goes-up-doing-nothing` |
| 8 AI-era (12) | `s8-eval` · `s8-validate-the-validators` · `s8-system-or-model` · `s8-failure-who-pays` · `s8-human-in-the-loop` · `s8-reversibility-blast-radius` · `s8-cost-per-successful-action` · `s8-latency-budget` · `s8-product-or-feature` · `s8-data-flywheel` · `s8-trust-budget` · `s8-source-opening-rate` |
| 9 Killer questions, provenance checked (4) | `s9-customer-experience-backwards` · `s9-eleven-star` · `s9-strength-of-evidence` · `s9-very-disappointed` |

### The twelve, resolved (source order, `question-bank-source.md:148–159`)

| # | Source line | id | Note |
|---|---|---|---|
| 1 | Whose problem is this, and how often does it happen to them? | `s1-if-nobody-solves-this` | the only Stage 1 entry asking "to whom, how often" — Q1 below |
| 2 | How is it handled today…? | `s1-how-addressed-today` | |
| 3 | Walk me through the process as it actually runs… | `s6-process-as-it-runs` | |
| 4 | What would have to be true…? | `s1-what-would-have-to-be-true` | |
| 5 | Which of those is riskiest, and how would we test it in a week? | `s2-riskiest-assumption` | |
| 6 | Who feels the pain, who has the budget…? | `s5-pain-budget-same-person` | |
| 7 | What is the appetite…? | `s4-appetite` | |
| 8 | Where are the rabbit holes…? | `s4-rabbit-holes` | |
| 9 | What are we declaring out of bounds? | `s4-out-of-bounds` | |
| 10 | Who is accountable when it goes wrong…? | `s6-accountable-when-wrong` | |
| 11 | What result would make us stop? | `s7-what-would-make-us-stop` | |
| 12 | What is the eval, who owns it, and what is the cost per successful action? | `s8-eval` | the source's wording merges two Stage 8 bullets; the id is the eval entry, and `s8-cost-per-successful-action` stays a separate bank entry |

The twelve's own shorter phrasings are NOT stored — the session asks the bank entry's `text`. The per-item "why this position" lines from the source become comments beside each id in `OPENING_SET`, for the reader.

### The depths

| `DEPTHS` key | ids | count |
|---|---|---|
| `scope-check` | `s4-appetite` · `s4-rabbit-holes` · `s4-out-of-bounds` · `s7-goals-signals-metrics` · `s7-kill-state-and-date` · `s7-what-would-make-us-stop` | 6 |
| `opening-set` | `OPENING_SET`, same order | 12 |
| `full-discovery` | the twelve, then in stage order: `s1-choice-cascade` · `s1-premortem` · `s2-more-than-one-way` · `s2-last-time-show-me` · `s2-switch-timeline` · `s3-why-now` · `s3-deliberately-not-doing` · `s4-press-release` · `s4-four-risks` · `s4-circuit-breaker` · `s5-value-metric` · `s5-willingness-to-pay` · `s6-audit-trail` · `s6-coexist-with-incumbent` · `s7-kill-state-and-date` · `s7-goes-up-doing-nothing` · `s8-failure-who-pays` · `s9-strength-of-evidence` | 30 |

Scope check is Stage 4's three scoping questions + Stage 7's measurement (HEART's goals→signals→metrics) and two kill criteria, as the ticket names them. Full discovery's 18 extras follow the source's own rule ("cheap to ask cold go early, questions needing a specific proposal bite late") and touch every stage; Stage 9's Jobs and Chesky entries are exercises, not interview questions, so they stay out. #283 re-tunes this list when branches land and owns keeping it at ~30.

### Module shape

```js
export const STAGES = Object.freeze([{ n: 1, id: "problem-framing", label: "Problem framing" }, …9]);
// { id, stage: 1–9, text, attribution, label: "OBSERVED"|"DERIVED"|"THIN", provenanceNote?, weakAnswer, note? }
export const QUESTIONS = Object.freeze([ … ].map(Object.freeze));
export const OPENING_SET = Object.freeze([ …12 ids ]);
export const DEPTHS = Object.freeze({
  "scope-check":    Object.freeze({ label: "Scope check",    when: "a feature or change to something that exists", ids: Object.freeze([…6]) }),
  "opening-set":    Object.freeze({ label: "Opening set",    when: "a new surface or a substantial bet",          ids: OPENING_SET }),
  "full-discovery": Object.freeze({ label: "Full discovery", when: "a new product",                                ids: Object.freeze([…30]) }),
});
export function questionById(id)       // entry | null — total; #281's applier decides what null means
export function questionsForStage(n)   // entries of stage n, source order; [] for an unknown stage
export function selectDepth(depth)     // entries in the depth's order; throws Error(`bank: unknown depth "${depth}"`)
```
Zero `import` lines. No `document`/`window`. `ids` arrays are frozen; the `map(Object.freeze)` makes every entry frozen too, which is what the gate's mutation case checks.

---

## STEP-BY-STEP TASKS

### CREATE `discovery/bank.mjs`

- **IMPLEMENT**: header (spec + D1–D6 + the twelve's two mapping notes) · `STAGES` · `QUESTIONS` (65, in the id table's order, each with `id, stage, text, attribution, label, weakAnswer` and `provenanceNote`/`note` only where the source gives one) · `OPENING_SET` · `DEPTHS` · three selectors.
- **PATTERN**: `system/board-ops.mjs:1–45` for the header and frozen list; `system/build-questions.mjs:168–295` for per-entry shape and comment density.
- **IMPORTS**: none. That absence is an invariant the gate pins.
- **GOTCHA**: the source's italics `*Weak answer: …*` wrap in markdown — strip the asterisks and the "Weak answer:" prefix. Keep typographic quotes and em dashes inside quotations as-is (quoted text is exempt from the slop pass). Do not add a `src` line number per entry — the source is parked, but line refs are drift bait. Apostrophes inside `text` mean double-quoted JS strings throughout.
- **VALIDATE**: `node --check discovery/bank.mjs && node -e "import('./discovery/bank.mjs').then(m => console.log(m.QUESTIONS.length, m.OPENING_SET.length, Object.keys(m.DEPTHS)))"` → `65 12 [ 'scope-check', 'opening-set', 'full-discovery' ]`
- **SATISFIES**: AC 1 (every question has id/stage/text/attribution/weak-answer/label), AC 3 (the twelve as ids), AC 4 (depth selectors), AC 6 (no SDK, no DOM, imports with no portal deps)

### UPDATE `tooling/build-checks.mjs` — the bank group

- **IMPLEMENT**: add `import { DEPTHS, OPENING_SET, questionById, questionsForStage, QUESTIONS, selectDepth, STAGES } from "../discovery/bank.mjs";` beside the other module imports (after `curateTrace`, with a two-line comment: zero-import data module, no SDK anywhere in its graph). Add the group after group 27, before `// --- the verdict`. Cases:
  1. **count** — `QUESTIONS.length === 65`; per-stage counts equal `[6,7,6,7,8,8,7,12,4]` via `questionsForStage(n).length`; `STAGES.length === 9` and every `q.stage` names one.
  2. **ids** — unique; each matches `/^s[1-9]-[a-z0-9-]+$/`; the prefix digit equals `q.stage`; `questionById(id)` returns that same object (identity), `questionById("nope") === null`.
  3. **fields** — for every entry: `text`, `attribution`, `weakAnswer` are non-empty trimmed strings; `label` ∈ `{OBSERVED, DERIVED, THIN}`; key set ⊆ `{id, stage, text, attribution, label, provenanceNote, weakAnswer, note}`; `weakAnswer !== text`. Message names the id.
  4. **the twelve** — `OPENING_SET.length === 12`, unique, every id resolves, and `JSON.stringify(OPENING_SET)` equals the documented twelve verbatim (the order is the assertion).
  5. **depths** — `selectDepth("scope-check").map(q => q.id)` equals the documented six; `selectDepth("opening-set")` ids equal `OPENING_SET`; `selectDepth("full-discovery")` ids equal the documented 30 and start with the twelve; every id in every `DEPTHS[k].ids` resolves (no orphan); `selectDepth("junk")` throws and the message names `junk`.
  6. **purity + frozen** — two calls of each selector deep-equal; every returned entry `===` its `QUESTIONS` entry; `Object.isFrozen(QUESTIONS)`, every entry frozen, every `DEPTHS[k].ids` frozen; a `try { QUESTIONS[0].text = "x" } catch {}` leaves `JSON.stringify(QUESTIONS)` unchanged.
  7. **C3** — `TITLE_TERMS = /\b(product manager|product owner|project manager|head of|chief \w+ officer|ceo|cto|cpo|cfo|coo|cxo|vp|vice president|director|senior|junior|mid-level|principal|staff (engineer|designer)|executive|leadership|founder|manager|designer|pm)\b/i` over every string field of every entry, every `STAGES` label and every `DEPTHS` label/when. **Positive control first:** `ok(TITLE_TERMS.test("a senior product manager signs off"), …)`. Comment: plain profession nouns inside a question's substance (`engineers`, `support engineer`, `radiologists`) are not titles and are deliberately not listed.
  8. **no page, no SDK, no DOM** — `readFileSync("discovery/bank.mjs")` contains no `^import ` line and no `document`/`window` token; over `git ls-files` (`execFileSync("git", ["ls-files"])` — `child_process` is already how `gen-loc-summary.mjs:33` reads the tree; add the import), no tracked `.html` and no `system/**` file contains the string `discovery/bank`.
  9. **source pin (D13)** — `const region = source.slice(source.indexOf("## Stage 1"), source.indexOf("## The twelve"))` over `readFileSync("docs/research/question-bank-source.md")`; for every entry, `region.includes(q.weakAnswer.slice(0, 30))`, message naming the id. **Positive control:** `ok(!region.includes("a note nobody wrote"), …)`. Copy the source's typographic quotes and em dashes verbatim into `weakAnswer` or this case fires — that is the point.
  `group("bank", "…and what it cannot reach: whether an entry's TEXT is the right bullet for its id, and whether the C2 pass was run — review facts against docs/research/question-bank-source.md; the weak-answer notes themselves are pinned to that file by case 9")`.
- **PATTERN**: `tooling/build-checks.mjs:4994–5095` (group 27) — `ok()` messages that print the drifted value; the no-timer source pin at 5086–5091 is the shape for cases 8 and 9.
- **IMPORTS**: `execFileSync` from `node:child_process` (new to this file — check it is not already imported first).
- **GOTCHA**: this group is **28** (D11 — #281 takes 29; the comment task below tells it so). Update the header index (`//  28 bank …`), the `all 27 groups` literal at the tail → `all 28 groups`; the `Twenty-three groups` line is pre-existing drift — leave it. The group name pads to 14 chars: `"bank"` is fine.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -3` → `build bank ✓ …` and `build ✓  all 28 groups pass`. Then the **mutation sweep**, each restored after: (a) blank one `weakAnswer` → case 3 red naming the id; (b) append `" — ask the product manager"` to one `text` → case 7 red; (c) swap `OPENING_SET[0]` and `[1]` → case 4 red; (d) push an id into `DEPTHS["scope-check"].ids` — must THROW (frozen) under ESM strict mode, which is case 6's evidence; (e) reword one `weakAnswer`'s opening ("A weak answer is…") → case 9 red naming the id. Record all five in the report.
- **SATISFIES**: AC 2 (count asserted against the module), AC 5 (the gate group in full)

### UPDATE `docs/epics/discovery-partner.prd.md` — the count

- **IMPLEMENT**: lines 5, 58, 237, 251, 341, 431: `66` → `65`. At line 5 append one sentence: "The bank module holds **65** — the source's 68 top-level bullets less two mottos with no weak-answer note and one duplicated press-release question, reconciled in #282; the pre-reconciliation number was 66."
- **PATTERN**: the PRD already narrates its own corrections ("The pre-grill draft said…") — match that voice.
- **VALIDATE**: `grep -n "66" docs/epics/discovery-partner.prd.md` → only the historical mention inside the appended sentence (and any unrelated 66s — check each by eye).
- **SATISFIES**: AC 2

### UPDATE `docs/epics/discovery-partner.architecture.md` + `docs/research/question-bank-source.md`

- **IMPLEMENT**: architecture lines 183 and 316: `66` → `65`. Source preamble line 17: "Stages 1–9 hold **66** attributed questions" → "Stages 1–9 hold **65** bank entries (68 top-level bullets; two mottos with no weak-answer note and one duplicate are not entries — see `discovery/bank.mjs`'s header)". Touch nothing below the `---` at line 24.
- **GOTCHA**: leave the architecture doc's stale "go to `system/`" sentence (line ~280) alone — #281 owns that correction.
- **VALIDATE**: `grep -n "\b66\b" docs/epics/discovery-partner.architecture.md docs/research/question-bank-source.md` → no hits.
- **SATISFIES**: AC 2

### UPDATE `CLAUDE.md` — the map and the count

- **IMPLEMENT**: after the `replay/` line (map, ~line 92) add:
  `discovery/                    the discovery half (epic #279) — bank.mjs: the edited question bank + depth selectors; Node-only, no page reads it`
  Line 108: `27 PURE groups` → `28 PURE groups` (or whatever number landed).
- **PATTERN**: one line per file, what it IS, no invariant restated (the header owns the invariants).
- **VALIDATE**: `grep -n "discovery/\|PURE groups" CLAUDE.md`
- **SATISFIES**: AC 6 (the map says no page reads it)

### UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: line 5's boundary list gains the new group number; line 11 `27 pure groups` → `28`; after the Group 27 paragraph add `**Group 28 — the question bank** (#282, `discovery/bank.mjs`): the count and per-stage counts pinned, ids unique and stage-prefixed, every entry's text + attribution + weak-answer note + label, the twelve as an ORDER assertion, each depth's exact documented set and the junk-depth throw, purity and frozenness by mutation, the C3 title-term list with its positive control, the zero-import / no-page source pin, and every weak-answer note pinned to `docs/research/question-bank-source.md` by its first 30 characters. *Whether an entry's TEXT is the right bullet for its id, and the C2 slop pass, are review facts against that file; this group cannot reach them.*`
- **VALIDATE**: `grep -c "Group 28" .claude/references/gates.md` → 1
- **SATISFIES**: AC 5 (the gate is documented where gates are documented)

### UPDATE issue #281 — the group-number handshake (D11)

- **IMPLEMENT**: `gh issue comment 281 --body "Group numbering: #282 (the bank) takes build-checks group 28 — its plan is .claude/plans/discovery-bank-282.md. This ticket's group is 29; its AC says 28, read it as 29. The four count sites (build-checks header index + tail literal, CLAUDE.md:108, gates.md:11) move with each ticket."` — before this PR opens.
- **GOTCHA**: a comment, not a body edit — #281's AC text belongs to whoever plans #281.
- **VALIDATE**: `gh issue view 281 --comments | grep -c "group 28"` → 1
- **SATISFIES**: D11 (no race for the number)

### UPDATE issue #279 — re-sync the epic body (D12)

- **IMPLEMENT**: after the PRD file is corrected: `gh issue view 279 --json body -q .body | sed -E 's/\*\*66\*\*/**65**/g; s/ 66 / 65 /g; s/from the 66 /from the 65 /g' > /tmp/279.md` → `diff <(gh issue view 279 --json body -q .body) /tmp/279.md` and read every hunk (expect the same six lines the PRD edit touched, nothing else) → `gh issue edit 279 --body-file /tmp/279.md`.
- **GOTCHA**: the body is the PRD plus an appended "Every ticket carries" table (observed by diff at planning) — the sed must not touch that table, and the diff read is what proves it did not. Do this LAST, after the PRD edit is final, so the two never disagree.
- **VALIDATE**: `gh issue view 279 --json body -q .body | grep -c "\b66\b"` → 0 (or only the historical mention inside the reconciliation sentence if you also append it)
- **SATISFIES**: D12

### RUN the C2 pass over `discovery/bank.mjs`

- **IMPLEMENT**: invoke the `humanizer` skill on the module's `text`/`weakAnswer`/`note`/`attribution` strings. Expected: the only Tier A hit in the source is `navigate` inside Shape Up's verbatim "things you can navigate to" — literal use inside a quotation, exempt. Fix Tier B/C only where the word is the editor's, not the source's.
- **VALIDATE**: `grep -o -i -w -E "delve|leverage|utilize|robust|comprehensive|seamless|streamline|empower|foster|enhance|elevate|pivotal|holistic|crucial|vital|furthermore|moreover|ultimately|compelling|meticulous|unlock|unveil|harness|resonate" discovery/bank.mjs | sort | uniq -c` → empty
- **SATISFIES**: C2

### VERIFY the loc-summary tripwire stayed quiet

- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ … no drift` (after `git add discovery/bank.mjs` — the generator reads `git ls-files`, and an untracked file is invisible to it; stage first or the check is vacuous, per memory "loc-summary counts tracked only").
- **SATISFIES**: the architecture doc's placement claim, proven rather than assumed

---

## TESTING STRATEGY

No test framework in this repo (CLAUDE.md: "no suite, no linter"). The gate group IS the test.

### Unit Tests

The eight cases of the bank group, driven over the real module — never over a fixture copy.

### Integration Tests

`node tooling/build-checks.mjs` end to end (28 groups green), plus `node tooling/drift-check.mjs` (node --check over every tracked .mjs, now including `discovery/bank.mjs`).

### Edge Cases

- `questionById(undefined)`, `questionById(42)` → `null`, no throw.
- `questionsForStage(10)`, `questionsForStage("1")` → `[]` (strict number compare; the header says so).
- `selectDepth("")`, `selectDepth(undefined)` → throw naming the value.
- A frozen entry: assignment throws in strict mode (ESM), which is what the gate's `try/catch` + JSON compare tolerates in both directions.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
node --check discovery/bank.mjs
node tooling/drift-check.mjs
```

### Level 2: Unit Tests
```bash
node tooling/build-checks.mjs 2>&1 | grep -E "bank|all .* groups"
```

### Level 3: Integration Tests
```bash
node tooling/build-checks.mjs            # exit 0, all groups
git add discovery/bank.mjs && node agent-layer/gen-loc-summary.mjs --check
```

### Level 4: Manual Validation
```bash
node -e "import('./discovery/bank.mjs').then(m => { for (const d of Object.keys(m.DEPTHS)) console.log(d, m.selectDepth(d).map(q => q.id).join(' ')) })"
```
Read the three lists against the tables above. Then open five random entries beside their source bullets and check D5 fidelity by eye — the gate cannot.

### Level 5: Additional Validation
```bash
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```
The group-8 SDK-free proof, now covering the bank import too.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — every entry carries id, stage, text, attribution, weakAnswer, label; no entry without a weak-answer note (case 3)
- [ ] AC 2 — count reconciled: the gate asserts 65 against the module; PRD, architecture doc and source preamble corrected in this PR
- [ ] AC 3 — `OPENING_SET` is twelve real ids in the source's order (case 4)
- [ ] AC 4 — each depth selector returns its documented set; scope check = Stage 4 ×3 + Stage 7 ×3 (case 5)
- [ ] AC 5 — the `build-checks` group: unique ids, no orphan reference, every field present, no job title (term list + positive control), selectors pure (cases 1–8)
- [ ] AC 6 — zero imports, no DOM, no page reads it; `node -e "import('./discovery/bank.mjs')"` works with no portal deps (case 8 + Level 5)
- [ ] C2 — humanizer pass run; C3 — the two edits made and the profession-noun rule documented in the gate
- [ ] `CLAUDE.md` map line + count, `gates.md` paragraph + count
- [ ] D11 — comment on #281 posted before the PR opens; D12 — #279 body re-synced after the PRD edit; D13 — case 9 pins every weak-answer note to the source
- [ ] Mutation sweep (five mutations) recorded in `.claude/reports/discovery-bank-282-report.md`

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's VALIDATE passed immediately
- [ ] `node tooling/build-checks.mjs` green with the new group count
- [ ] `node tooling/drift-check.mjs` green; `gen-loc-summary.mjs --check` no drift with the file staged
- [ ] Level 4 eyeball of five entries against the source
- [ ] PR body carries `Closes #282`; plan, report and review in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

None open. Every risk raised at planning is closed as a decision below (D7–D12), and each one has a task or a gate case that enforces it. If the owner overturns one, it is a one-line change to a pinned array plus the matching gate literal — the AMENDMENTS log records it.

**D7 — the twelve's item 1 is `s1-if-nobody-solves-this`.** Closed. "Whose problem is this, and how often does it happen to them?" asks for a person and a frequency; the Stage 1 entry that asks "to whom, how often, and at what cost" is that question. Adzic's Why/Who/How/What was the other candidate and asks for an ORDER of questions, not a person. The `OPENING_SET` comment beside item 1 names the alternative so nobody re-derives it.

**D8 — item 12 is `s8-eval`; `s8-cost-per-successful-action` stays its own entry.** Closed. The twelve's wording merges two Stage 8 bullets; a merged DERIVED entry would be a new question the source did not write. The `OPENING_SET` comment beside item 12 says so.

**D9 — the press-release duplicate folds; the count is 65.** Closed. A session must never be asked the same question twice, and the number follows the rule. Independent support (observed): `grep -c "Weak answer" docs/research/question-bank-source.md` = 65 — the bullets carrying a note, both press-release copies in, Sean Ellis (whose note is phrased as "misuse") out — lands on the same number by a different route.

**D10 — profession nouns are not titles under C3.** Closed. `engineers` (Cagan, verbatim) and `support engineer` (Stage 6) name people a question is ABOUT; C3 bans titles for who is ASKED and seniority framing. The gate's term list omits bare `engineer` on purpose and its comment states the rule; the two edits D6 names are the only C3 edits.

**D11 — this ticket takes group 28; #281 takes 29.** Closed. #282 has no dependencies and is planned first. A task below leaves a comment on #281 saying so before this PR opens, so the two never race for the number. The four count sites move together: `build-checks` header index, its tail literal, `CLAUDE.md:108`, `gates.md:11`.

**D12 — the epic issue body is re-synced.** Closed. #279's body is the PRD file plus an appended "Every ticket carries" table (observed by diff), so a sed over its own body is safe. A task below does it after the repo docs are corrected.

**D13 — fidelity to the source is partly a gate fact now.** Closed. A ninth gate case pins the first 30 characters of every `weakAnswer` to the source file's stages 1–9 region, so a paraphrased or invented note goes red. What stays a review fact: whether `text` is the right bullet for the id, and the C2 pass.

## NOTES (open canvas)

**Why the unit is the bullet.** The alternative — one entry per question sentence, so the choice cascade is five entries — inflates the count to ~80, breaks the source's own framing (Martin says the cascade is iterative, not a form), and makes "one question per turn" mean five turns on one idea. The bullet is how the researcher grouped what is asked together; keep it.

**Why ids are hand-chosen, not derived from text.** A slug derived from `text` changes when a C2 pass rewords a question; ids are what `answers.jsonl`, `transcript.jsonl` and every later run package key on. Hand-chosen ids are stable across edits, and the gate's prefix rule keeps them honest about stage.

**Why no `SOURCES` export.** ~40 URL rows that nothing in this ticket reads. The run package's `file_evidence` rows carry URLs per claim (#281); the source file's Sources list is the citation for the bank as a whole. Adding it later is additive.

**Why `selectDepth` throws and `questionById` does not.** #281's applier needs "non-null `question_id` the bank does not hold → throw", and it is the applier's throw, with its own message; `questionById` returning `null` lets it decide. A depth, by contrast, is a session-start choice from a closed menu — an unknown one is a programming error, and the throw names it.

**Sequencing.** #281 and #282 both add a group and both bump the four count sites. D11 fixes the order (28 here, 29 there) and the comment task tells #281 before this PR opens. The reviewer still checks `all N groups` matches the header index after either merge — that literal is the one site no gate reads.

**Why case 9 pins 30 characters, not the whole note.** The whole note would forbid any C2 edit inside a weak-answer note; 30 characters pins the opening, which is where a paraphrase or an invented note shows first, and leaves the tail editable. If a note genuinely needs its opening reworded, the header records why and the case is widened for that id — never silenced.

**Data-flow sketch.**
```
question-bank-source.md ──(edited by hand, D1–D6)──▶ discovery/bank.mjs
                                                        │ QUESTIONS · OPENING_SET · DEPTHS
                                                        ├──▶ tooling/build-checks.mjs  group "bank"   (CI)
                                                        ├──▶ portal/lib/discovery.mjs   selectDepth    (#285)
                                                        ├──▶ discovery/ops.mjs           questionById   (#281)
                                                        └──▶ #283 extends QUESTIONS + adds branch selectors
```

## AMENDMENTS

(none)
