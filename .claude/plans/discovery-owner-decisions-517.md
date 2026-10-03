# Feature: owner decisions for epic #504 — where a launch plan lives, acceptance criteria for P0 lines (#517)

This is a plan for a **decision ticket**. #517 writes no code. The work is one owner sitting: the agent sets out the
options for each decision, labelled `(agent)`; the owner types each verdict; the agent quotes those verdicts on #517
and, if a verdict is "build it", files the build ticket. The sections follow the PIV template, adapted to that shape.
The direct precedent is #507 (`bc3aa52`, `.claude/plans/discovery-owner-decisions-507.md`).

**Hard rule for whoever runs this (the honesty contract in both directions):** the agent never writes a verdict, never
paraphrases one into the issue, and never infers one from a recommendation the owner nodded at. A decision with no
typed owner line stays open. Every `VERDICT:` slot below stays empty until the owner types into it.

## Feature Description

Two questions the epic's grading found unanswered ("absent everywhere: … launch and acceptance criteria"), split out
of #507 because neither gates Wave 3:

- **L — launch plan:** where staged rollout, a pilot and a rollback plan are asked and recorded.
- **A — acceptance criteria:** whether P0 lines carry test-shaped criteria, and where.

This plan gives the sitting a brief whose citations are checked against `origin/main` at `bc3aa52`, with seven
corrections to the ticket text (F1–F7) and the budget arithmetic each option costs. After the sitting it gives the
mechanical steps that record the verdicts.

## User Story

As the owner of the discovery partner,
I want each of the two open decisions shown with checked evidence, the real cost and reach of each option, and one
labelled recommendation,
so that I can decide both in one sitting and any build lands as its own ticket without reopening them.

## Problem Statement

The ticket's evidence for L rests on a reading that does not hold: the transition-rung filing it cites is the agent's
choice, and #508 counts that exact filing as a misfile (F2). Its evidence for A misquotes one source's format (F3) and
another's denominator (F4), and its option A1 reopens #507's settled D-c(1) (F7). Deciding on that text would price
options wrongly.

## Solution Statement

1. **Task 0:** put F1–F7 to the owner (Q1). If authorised, correct #517's body in place before the sitting, by the
   #507 task-0 method (anchors that each occur exactly once, diffed before writing).
2. **The sitting:** L first (it has a timing dependency on #508), then A. AskUserQuestion, recommended option first.
3. **One comment on #517:** the `(agent)` options, each owner line quoted word for word with its date, and what each
   verdict implies (the build ticket, a #508 re-point, or nothing).
4. **Follow-through, verdict-dependent:** file any "build it" ticket (`Refs #517`); if L = option 2, re-point #508.
5. **Commit** plan, brief and report together on their own branch, as #507 did.

## Out of Scope / Non-Goals

- **No code, no doc amendments.** Any amendment (the transition definition, `plan-architecture`, the bank, the house
  template) lands with the build ticket a verdict files, in a later epic.
- **No build in epic #504.** The ticket says so; a "build it" verdict is filed in a later epic.
- **Not reopening #507.** D-a (both lists, budget to 33 via #511), D-b (OPTIONAL table), D-c (superset declared, per
  block) and D-d are settled (#507 issuecomment-5962097478). Where an option here would reopen one, the brief says so.
- **No paid run.** Nothing here spends tokens.
- **No edit to #504's body.** Its line "Launch plan and acceptance criteria are decided in #517" stays true.

## Feature Metadata

**Feature Type**: decision ticket (governance)
**Estimated Complexity**: Low to execute, Medium to prepare
**Primary Systems Affected**: none edited. Read: `discovery/bank.mjs`, `discovery/ops.mjs`, `discovery/faster-payment/{prd.md,run.json,transcript.jsonl}`, `docs/research/requirements-hierarchy.md`, `.claude/skills/plan-create-prd/SKILL.md`, `.claude/skills/plan-architecture/SKILL.md`, `system/canvas-ops.mjs`
**Dependencies**: `gh` CLI as the owner's account

## Related Work

**Implements**: #517 · **Epic**: #504 (governing PRD `docs/epics/discovery-partner.prd.md` §Amendments)

**Back-references**:
- `.claude/plans/discovery-owner-decisions-507.md` (#507, `bc3aa52`): the decision-record shape, the task-0 correction method, and the D-a/D-c verdicts this brief prices against.
- #508 (open): Think's transition examples and its before/after misfile count. L option 2 touches both.
- #509 (open): the `priority` enum, undecided. A option 1 needs it.
- #511 (open): implements D-a4 (hasModel 7→8, regulated 6→7, a two-question measurement block, budget 33). L's arithmetic is computed against that post-#511 state.
- #316 / epic #295: canvas `screen.compose` `states`, the surface A option 2 names.

**Forward-references**: the build ticket(s) a "build it" verdict files; #508 if L = option 2.

---

## CONTEXT REFERENCES

### Relevant files (read at `origin/main` = `bc3aa52`)

- `discovery/bank.mjs:320-327`: `s4-circuit-breaker`, "If they don't finish in the time we bet, do we extend?" Shape Up, not a kill switch (ticket confirmed).
- `discovery/bank.mjs:650-656`: `s8-reversibility-blast-radius`, "reversibility and blast radius of an agent action". In whole-bank only (`:941`). Ticket confirmed.
- `discovery/bank.mjs:969`: the `replacesAProcess` facet, "Does it change how an organisation already works?", firing "the transition-requirements tail MVP 10 already requires".
- `discovery/bank.mjs:1028-1039`: the `replacesAProcess` module, `budget: 6`, exactly 6 ids. No slack today.
- `discovery/bank.mjs:981, 994, 1006, 1018, 1030`: module budgets hasModel 7 · regulated 6 · internal 6 · orgBuys 6 · replacesAProcess 6.
- `discovery/bank.mjs:1104-1113`: `facetPlan`. A module fits while `count + budget <= FULL_DISCOVERY_BUDGET`; an overflowing vector throws (`:1121`).
- `discovery/ops.mjs:75`: `record_decision` takes `level` and `wrong_if`, both required. The rung is filed by the agent, and every decision carries a `wrong_if`.
- `discovery/faster-payment/run.json`: `posture: "think"`, `facets.regulated: true`, `replacesAProcess: false`.
- `discovery/faster-payment/transcript.jsonl`, the seq 15 op: `"question_id":"s7-what-would-make-us-stop","answer_ref":"a11","level":"transition"`.
- `discovery/faster-payment/prd.md:227, :232`: the Success-metrics table rows for seq 15 and seq 26 (ticket confirmed). The full decisions are at `:337` (seq 15, `s7-what-would-make-us-stop`) and `:373` (seq 26, `s9-strength-of-evidence`). Seq 16 `s8-eval` (`:349`) also names the 20,000 pilot cohort.
- `discovery/faster-payment/prd.md:361-369`: seq 23 `s6-edge-cases-or-refusals`, filed at **transition**, parent seq 7. Its `wrong_if` is `:369`.
- `discovery/faster-payment/prd.md:181, :191`: seq 29 `s4-accessibility-target`, a **solution**-rung decision, and its `wrong_if` ("Launch proceeds without a completed audit …").
- `docs/research/requirements-hierarchy.md:12-17`: transition = "implementation needs … to smoothly transition an organisation from its current state to its future state". `:16` names support "during the immediate rollout phase"; `:17` names failover "while switching between systems".
- `.claude/skills/plan-create-prd/SKILL.md:27` ("hypotheses, not specs"), `:37` ("A PRD must NEVER decide engineering"). No launch, acceptance or priority text anywhere in the file (grep, observed).
- `.claude/skills/plan-architecture/SKILL.md`: no rollout, rollback, flag or launch text (grep, observed).
- `system/canvas-ops.mjs:56, :94, :114`: `screen.compose` may carry `states`, optional.
- #508 body, "Why this exists": the misfile set counted per package includes `s7-what-would-make-us-stop` (`instrument-loans-1` 4/12; each graded package 3). AC: "transition decisions whose question id is in the appetite and risk set above", counted before and after. "Not in scope: rollout. #517 decides where launch lives."
- #509 body, fork 3: "`priority`: the enum values, and whether it is solution-rung only." Undecided.

### New Files to Create

- `.claude/plans/discovery-owner-decisions-517.md` (this file) and `.claude/plans/discovery-owner-decisions-517.html` (the build brief).
- `.claude/reports/discovery-owner-decisions-517-report.md` after the sitting (mirror `bc3aa52`'s report).

### Patterns to Follow

- **Decision record**, from #507's comment: a `### <decision>` heading, `**<id> — (agent) options:**` bullets with costs, `**Recommendation (agent):**`, then the AskUserQuestion header on its own line, `Owner, typed in session, <date>:`, a blank line, `Selected: <label>` verbatim (plus any notes the owner typed, verbatim), then `**Implies:**`.
- **Issue body edits**: fetch → anchored replace (each anchor exactly once, else abort) → diff → `gh issue edit <n> --body-file`.
- **Copy is never indented** (memory): owner lines go as plain lines, never blockquotes.

---

## DECISION BRIEF (what the sitting reads)

Order: **L first**, because option 2 has a deadline (before #508 lands). Each decision has checked facts, options with
costs and reach, an `(agent)` recommendation, and an empty verdict slot.

### L: where a launch plan lives

**Checked facts**
- No full-discovery question asks about a pilot, staged rollout or rollback. The nearest are `s8-reversibility-blast-radius` (agent actions, whole-bank only) and `s4-circuit-breaker` (Shape Up's extension rule). Ticket confirmed.
- **The owner volunteered the content; the agent chose the rung (F2).** `faster-payment` is a Think run. Its seq 15 answer (a11) says "Any one of those and we go back to the phone for the affected segment"; seq 26 says "which is why the pilot is 20,000 customers and not everyone". Think filed both at `level: "transition"`. The rung is a `record_decision` param the agent sets, so this is evidence that owners volunteer rollout content, not that owners place it at transition.
- **#508 counts that same filing as a defect.** `s7-what-would-make-us-stop` at transition is in #508's appetite-and-risk misfile set, which its AC counts before and after the re-record.
- **The transition definition already reaches rollout's edges (F5).** `requirements-hierarchy.md:16` covers support "during the immediate rollout phase" and `:17` failover "while switching between systems". What it lacks is staged gating: a pilot cohort, expansion criteria, a rollback trigger.
- `faster-payment` declared `replacesAProcess: false`.

**Budget arithmetic.** Observed with `budget.mjs` (Task 1a), which reads the bank's own `facetPlan`, on two trees:
- **`origin/main` today** (budget 31, base 16, modules 7 · 6 · 6 · 6 · 6): L1 → largest pair 30, fits; L2 → largest pair 30, fits with **no** increase.
- **Simulated post-#511** (budget 33, base 18, modules 8 · 7 · 6 · 6 · 6, the D-a4 shape): L1 → 33, fits; L2 → 34, **needs** an increase; smallest triple 37, so three facets still overflow.
- So L2's budget cost comes from L2 **plus** #511, in whichever order they land: the combined total is 34. Positive control: the simulated tree at budget 32 throws `pair … already overflows`.
- Group 28 case 12 (`tooling/build-checks.mjs:6427`) pins every module budget to 6..7. L1's replacesAProcess 7 is inside it. #511's hasModel 8 is not, so #511 must widen that pin; that is #511's scope, recorded here so an L1 build ticket does not assume the pin is already 6..8.

The derivation behind the simulated figures:
- Faceted base today after #511: 12 opening + 2 measurement + 4 quality = 18. Largest module pair 8 + 7 = 15, so 33 = the budget, zero slack.
- **Option 1** (replacesAProcess 6 → 7): largest pair 8 + 7 = 15 either way, so 33 still fits; smallest triple 6 + 6 + 7 = 19 → 37 > 33, so "any three overflow" holds. No budget change.
- **Option 2** (one always-asked question): base 19, largest pair 34 > 33, so a hasModel + regulated vector would throw. The budget goes 33 → 34, and the unfaceted list grows to 34 with it (D-a4 keeps both lists in step). Smallest triple 19 + 18 = 37 > 34, so "any three overflow" still holds arithmetically.
- **But the cap is policy, not only arithmetic.** D1a calls MVP 5's "~30" load-bearing (`discovery-question-selection.architecture.md:68`, `:74`), and the D-a cost line the owner selected on 2026-10-02 reads: "the budget sits at its ceiling; any later growth on the faceted side needs D1a's rung (`discovery-question-selection.architecture.md:309`), not another increase." **Option 2 reopens that line.** Option 1 does not (it fits at 33).
- **Option 3:** no question, no budget change.

**Options (agent)**
- **L1: a question in the `replacesAProcess` module,** organisational launch only. Cost: the module budget 6 → 7 (fits, above). Reach: only runs that tick that facet. **No committed package has ticked it** (the epic lists it among three untested facets), and `faster-payment`, the package the ticket cites, would never have been asked.
- **L2: a question at full discovery,** with the transition definition amended to include staged gating. Cost: **with #511, reopens #507 D-a's "not another increase" line** (observed: 34 against 33 on the simulated tree; alone on today's tree it fits at 31); budget 33 → 34 in both lists, four past D1a's "~30"; placement before the last block (faceted) and the last question (unfaceted), or `deriveCursor` un-finishes `faster-payment`, `partner-audit-2/-3`, `allergen-matrix-1` and `later-not-never-1`; a new bank entry needs a source line like every other; and **#508 must not count a rollout answer as a misfile.** Two shapes:
  - **L2a: a dedicated question** (e.g. pilot cohort, expansion criterion, rollback trigger, who decides). Rollout answers file under it, and `s7-what-would-make-us-stop` stays in #508's misfile set, since a kill criterion is still risk. #508 needs only its existing scope note (examples must not exclude rollout).
  - **L2b: no new question, the definition only.** Rollout answers keep arriving under `s7` / `s9` ids, so #508 must drop `s7-what-would-make-us-stop` from its counted set, or its metric scores correct filings as errors.
  - Deadline either way: recorded before #508 lands (#508 is open; it depends on #505 and #506, both open).
- **L3: not discovery's job.** Cost: `plan-architecture/SKILL.md` has no rollout text today, so it needs an amendment to own it. "`prd.md` says so" is a projection change, so epic R1 applies: re-project all 11 committed `prd.md` with `--force` and re-baseline `tooling/run-316-ready.mjs` check 1. And the owner's pilot size and rollback trigger are intent (what the owner commits to), not mechanics (flags), so L3 leaves that content with no question.

**Recommendation (agent): L2a, knowingly reopening D-a's ceiling line.** If the owner holds that line, **L1** is the
choice that fits: no budget change, at the price of reaching no committed package. L2a reaches every full discovery, including the kind of run the evidence came from. It
gives the content the owner already volunteers its own question, so the answer stops depending on which other question
the agent files it under. And it leaves #508's misfile metric untouched. It asks for the owner's decision (cohort,
trigger, who calls it), not mechanics, which stay with `plan-architecture` as engineering. Cost: the budget moves to 34,
one more question in every full discovery.

**VERDICT L (owner, typed):** _(empty until typed)_
**Implies:** L1/L2 → a build ticket in a later epic (the bank entry, the budget, the definition amendment; L2 also the README and `discovery-question-selection.architecture.md` D1a). L2 → a #508 comment before #508 lands (task 3). L3 → a build ticket for the `plan-architecture` amendment and the R1 re-projection, or nothing if the owner wants neither.

### A: acceptance criteria for P0 lines

**Checked facts**
- **Against:** the house template says "hypotheses, not specs" (`SKILL.md:27`) and "A PRD must NEVER decide engineering" (`:37`); Shape Up argues against specs.
- **#507 D-c(1) is settled as "superset declared"** (owner, 2026-10-02): the house template is **not** amended; `prd.md` declares its extra blocks (F7). A1 as written reopens that.
- **"P0" does not exist yet.** It needs #509's `priority` values, which are undecided (#509 fork 3).
- **Every decision already carries a `wrong_if`**, because `record_decision` requires it (`ops.mjs:75`). Solution-rung example: seq 29, `faster-payment/prd.md:191`, "Launch proceeds without a completed audit from the external accessibility partner …" (F1: the ticket's `:369` is seq 23, a transition-rung line).
- **External evidence, as checked:**
  - PMI (F4): a web-search summary of PMI's Pulse page "Requirements Management: A Core Competency for Project and Program Success" gives the figure as 47 percent of **unsuccessful** projects, not of all projects. The page itself returned 403, so its exact wording and year are unverified, and so is the 2017 *Drivers of Agility* p.12 wording the ticket quotes (not in the repo). Self-reported either way.
  - Kiro (F3): acceptance criteria use EARS, "WHEN [condition/event] THE SYSTEM SHALL [expected behavior]", not Given/When/Then; its docs claim traceability "through implementation", not a link to tests (kiro.dev/docs/specs/feature-specs/, fetched 2026-10-03).
  - Tessl (F3): its docs' own ask endpoint answers that `[@test]` spec-to-test links existed only "in the **legacy Tessl Framework**" and were "removed in the v0.50.3 rewrite, so `[@test]` links aren't a current Tessl feature" (docs.tessl.io, queried 2026-10-03; a generated answer from Tessl's docs, not a page quote).

**Options (agent)**
- **A1 (reframed under D-c(1)a): a superset block in `prd.md`** where P0 lines carry the owner's acceptance criteria, as intent, without amending the house template. Cost: needs #509's `priority` values first; a new op param (D-b's OPTIONAL route) and a new question to collect the owner's words; R1 re-projection. A1 as the ticket wrote it (amend the template) reopens D-c(1).
- **A2: criteria go in the build package,** beside canvas `screen.compose` `states` (epic #295). Cost: they are composed by the build agent at screen time, so they would be agent-authored, not the owner's words; that sits with #295's honesty rules, not discovery's.
- **A3: decline.** `wrong_if` stays the only test-shaped line. Cost: no positive criterion ("given … then …"), only the negative one; the PMI number stays unanswered.

**Recommendation (agent): A3, with a named revisit.** Every decision already carries a falsifiable `wrong_if` that
reads as a negative acceptance test. The house template's stance is settled (D-c(1)a). And "P0" cannot be defined
until #509 decides `priority`. The evidence for criteria is a self-reported contributing factor about requirements
management in general. Revisit after #509 lands, if `priority` gives P0 a meaning and a real owner session shows
P0 lines that a `wrong_if` does not cover.

**VERDICT A (owner, typed):** _(empty until typed)_
**Implies:** A1/A2 → a build ticket in a later epic (A1 depends on #509). A3 → nothing filed; the revisit condition is recorded in the comment.

---

## IMPLEMENTATION PLAN

### Phase 0: Correct the ticket text (owner-authorised only)
### Phase 1: The sitting (owner)
**Depends on:** Phase 0 done or declined.
### Phase 2: Record on #517
**Depends on:** Phase 1, per decision. A decision with a line is posted; one without stays open.
### Phase 3: Follow-through
**Depends on:** Phase 2, and only for verdicts that imply it.
### Phase 4: Commit and PR
**Depends on:** Phase 2 (Phase 3 if any verdict implies it).

---

## STEP-BY-STEP TASKS

### 0. CORRECT #517 with F1–F7, before the sitting (only if the owner says yes to Q1)

| F | Defect | Fix |
|---|---|---|
| F1 | `:369` is seq 23, a transition-rung line, cited as solution-level | cite seq 29, `:191` |
| F2 | "Owners already volunteer it … at the transition rung" treats the agent's rung choice as the owner's; #508 counts that filing as a misfile | state who sets the rung and the #508 conflict |
| F3 | "Kiro and Tessl link requirements to tests" | Kiro: EARS, traceability claim; Tessl: `[@test]` links were legacy, removed in v0.50.3 |
| F4 | "47 percent of projects" | a search summary of PMI's "Core Competency" Pulse page says "of unsuccessful projects"; page 403, wording, year and the 2017 text unverified |
| F5 | definition cited without its rollout lines | add `:16-17` |
| F6 | L3 says `plan-architecture` owns rollout; its SKILL.md has no rollout text, and "`prd.md` says so" triggers R1 | name both costs |
| F7 | A1 "amend the house template" reopens #507 D-c(1)a | say so |

- **IMPLEMENT**: one script in the scratchpad.
  1. `gh issue view 517 --json body --jq .body > <scratch>/517.before.md`.
  2. For each pair, assert the anchor occurs exactly once, then replace. Any count ≠ 1 → abort, write nothing, re-read and re-derive.
  3. `diff <scratch>/517.before.md <scratch>/517.after.md`: only the anchored spans differ.
  4. `gh issue edit 517 --body-file <scratch>/517.after.md`.

  Pairs, verbatim (anchors from the body read 2026-10-03):
  - F1 anchor: ``Solution-level `wrong_if` lines already read as negative acceptance tests (`faster-payment/prd.md:369`).``
    replacement: ``Solution-level `wrong_if` lines already read as negative acceptance tests (`faster-payment/prd.md:191`, seq 29; corrected 2026-10-03: `:369` is seq 23, a transition-rung line).``
  - F2 anchor: ``**Owners already volunteer it.**``
    replacement: ``**Owners already volunteer it** (corrected 2026-10-03: the owner volunteers the content; the rung is the agent's `level` param, and #508 counts `s7-what-would-make-us-stop` at transition as a misfile).``
  - F3 anchor: ``Kiro and Tessl link requirements to tests.``
    replacement: ``Kiro writes acceptance criteria in EARS ("WHEN … THE SYSTEM SHALL …") and claims traceability through implementation (kiro.dev/docs/specs/feature-specs/, checked 2026-10-03). Tessl's `[@test]` spec-to-test links belonged to its legacy Framework, removed in v0.50.3 (docs.tessl.io, queried 2026-10-03).``
  - F4 anchor (includes the closing quote and full stop, observed in the body 2026-10-03): ``A full 47 percent of projects fail to meet goals due to poor requirements management".``
    replacement: ``A full 47 percent of projects fail to meet goals due to poor requirements management". Corrected 2026-10-03: a search summary of PMI's Pulse page "Requirements Management: A Core Competency for Project and Program Success" gives it as 47 percent of *unsuccessful* projects. That page returned 403 and the 2017 PDF is not in the repo, so neither wording nor year is verified.``
  - F5 anchor: ``The transition rung is defined as organisational change: migration, training, support, continuity (`docs/research/requirements-hierarchy.md:12-17`).``
    replacement: same sentence + `` It already covers support "during the immediate rollout phase" (`:16`) and failover "while switching between systems" (`:17`); what it lacks is staged gating.``
  - F6 anchor: ``**Not discovery's job.** `plan-architecture` owns rollout mechanics, and `prd.md` says so.``
    replacement: ``**Not discovery's job.** `plan-architecture` owns rollout mechanics, and `prd.md` says so. Cost: `plan-architecture/SKILL.md` has no rollout text today, and a `prd.md` line is a projection change (epic R1: re-project all 11, re-baseline `run-316-ready.mjs` check 1).``
  - F7 anchor: ``**Amend the house template** so P0 lines carry the owner's Given/When/Then, as intent.``
    replacement: ``**Amend the house template** so P0 lines carry the owner's Given/When/Then, as intent. This reopens #507 D-c(1), settled 2026-10-02 as "superset declared"; the non-reopening form is a superset block in `prd.md`.``
- **VALIDATE**: anchor counts (observed 2026-10-03, all seven print `1`):
  `for a in <each anchor>; do grep -cF -- "$a" <scratch>/517.before.md; done`
- **REDDENS**: change one anchor by a character → its count prints `0` and the script aborts before `gh issue edit`.
- **SATISFIES**: precondition for AC #1 (the owner decides on corrected text)
- **REGENERATES**: none

### 1a. RE-CHECK the two moving facts on the sitting day
- **IMPLEMENT**: (i) save the script below as `<scratch>/budget.mjs` (never under `.claude/plans/` as `.mjs`: drift-check syntax-checks every tracked `.mjs`); `git fetch origin`; extract `origin/main`'s `discovery/bank.mjs` with `git archive` into the scratchpad; run it. If the printed numbers differ from the brief's (for example, #511 has landed), update L's arithmetic and the L2 cost line in the brief **before** the owner reads it. (ii) `gh issue view 508 --json state --jq .state` and `gh pr list --state merged --search "Closes #508" --json number`. If #508 has merged, add to L2: "#508 has landed, so L2 needs a #508 follow-up (re-count or new examples)".
- **VALIDATE** (observed 2026-10-03 on `origin/main`):
  ```
  budget=31 base=16 largestPair=29 modules=6,6,6,6,7 rap=6
  L1 (rap+1): largest pair with rap = 30; fits=true; pin 6..7 ok=true
  L2 (+1 always-asked): largest pair = 30; needs increase=false; smallest triple = 35 (three overflow at budget 31: true)
  ```
  On the simulated post-#511 tree: `budget=33 base=18 largestPair=33 …`, `L1 … = 33; fits=true`, `L2 … = 34; needs increase=true; smallest triple = 37`. `gh issue view 508` → `OPEN`.
- **REDDENS**: set `FULL_DISCOVERY_BUDGET` one below the largest pair on a scratch copy (observed: 32 on the simulated tree) → the script throws `pair <x>+<y> already overflows at budget 32`.
- **SATISFIES**: precondition for AC #1 (the owner decides on current numbers)
- **REGENERATES**: none

```js
// #517 L-option budget check, read from the LIVE bank via its own facetPlan (no block names assumed).
// Usage: node budget.mjs <path/to/discovery/bank.mjs>
const b = await import(new URL(process.argv[2], `file://${process.cwd()}/`).href);
const ids = b.FACETS.map((f) => f.id), B = b.FULL_DISCOVERY_BUDGET;
const vec = (on) => Object.fromEntries(ids.map((id) => [id, on.includes(id)]));
let maxPair = 0, maxPairRap = 0, minTriple = Infinity;
for (const x of ids) for (const y of ids) if (x < y) {
  const p = b.facetPlan(vec([x, y]));
  if (p.overflow.length) throw new Error(`pair ${x}+${y} already overflows at budget ${B}`);
  maxPair = Math.max(maxPair, p.count);
  if (x === 'replacesAProcess' || y === 'replacesAProcess') maxPairRap = Math.max(maxPairRap, p.count);
}
const base = b.facetPlan(vec([])).count; // declared, no facets: twelve + any always-asked blocks
const mods = Object.values(b.MODULES).map((m) => m.budget).sort((p, q) => p - q);
minTriple = base + mods[0] + mods[1] + mods[2];
console.log(`budget=${B} base=${base} largestPair=${maxPair} modules=${mods.join(',')} rap=${b.MODULES.replacesAProcess.budget}`);
console.log(`L1 (rap+1): largest pair with rap = ${maxPairRap + 1}; fits=${maxPairRap + 1 <= B}; pin 6..7 ok=${b.MODULES.replacesAProcess.budget + 1 <= 7}`);
console.log(`L2 (+1 always-asked): largest pair = ${maxPair + 1}; needs increase=${maxPair + 1 > B}; smallest triple = ${minTriple + 1} (three overflow at budget ${Math.max(B, maxPair + 1)}: ${minTriple + 1 > Math.max(B, maxPair + 1)})`);
```

### 1. RUN the sitting
- **IMPLEMENT**: show the brief (this section or the HTML). One AskUserQuestion call, two questions: header `Launch` (L2a first, marked Recommended; then L2b, L1, L3) and header `Criteria` (A3 first, marked Recommended; then A1 reframed, A2). Each option: plain label, one-sentence cost. Record the tool's returned answer and any notes **verbatim**. "Other" text is the owner's line as typed.
- **GOTCHA**: an answer the owner gives in chat outside the tool also counts, quoted verbatim. Agreeing to the plan is not a verdict. No answer → that decision stays open, and AC #1 is reported not met for it.
- **VALIDATE**: the tool result holds one answer string per question (observed in the transcript).
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 2. POST the record on #517
- **IMPLEMENT**: write `<scratch>/517-comment.md` in the Patterns shape: `### L`, `(agent)` options with costs, `**Recommendation (agent):**`, `Launch`, `Owner, typed in session, <date the owner typed>:`, blank line, the verbatim line, `**Implies:**`; the same for `### A`. Then `gh issue comment 517 --body-file <scratch>/517-comment.md`.
- **VALIDATE**: `gh issue view 517 --json comments --jq '.comments[-1].body' | grep -c "Owner, typed in session"` prints the number of decisions that got a line (2 if both).
- **REDDENS**: delete one owner block from the file before posting to a scratch copy and run the same grep on it → prints `1`.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 3. FOLLOW THROUGH, per verdict
- **IMPLEMENT**:
  - **Any "build it" verdict (L1, L2a, L2b, L3 with an amendment, A1, A2):** draft the ticket body (scope from the brief's cost line, `Refs #517`, "later epic", Depends on #511 for L2/L1 and #509 for A1). Show the draft; ask the owner which epic it joins (Q2), then `gh issue create`. Never "close #517" or "will close" in its body (memory: PRs don't auto-close tickets).
  - **L2a or L2b:** comment on #508 quoting the verdict link and stating the consequence: L2a, examples must not exclude rollout (already in scope); L2b, drop `s7-what-would-make-us-stop` from the counted set. Before #508 lands.
  - **A3 / L3 with nothing filed:** no action; the comment already records the revisit.
  - Then add the filed ticket number to the #517 comment (`gh api -X PATCH repos/linardsb/ux-factory/issues/comments/<id> -f body=@<file>`) or a short follow-up comment.
- **VALIDATE**: on the draft file before `gh issue create`: `grep -c "#517" <draft>` ≥ 1, and `grep -ciE '(close[sd]?|fix(e[sd])?|resolve[sd]?) +#517' <draft>` prints 0. A plain `grep -ci close` would red on a legitimate "last closer" (the `deriveCursor` placement rule an L ticket must cite).
- **REDDENS**: `printf 'will close #517\n' | grep -ciE '(close[sd]?|fix(e[sd])?|resolve[sd]?) +#517'` prints 1; `printf "last closer's position\n" | grep -ciE '…same…'` prints 0. Run both before trusting the check.
- **SATISFIES**: AC #2
- **REGENERATES**: none

### 4. COMMIT plan, brief and report; open the PR
- **IMPLEMENT**: write `.claude/reports/discovery-owner-decisions-517-report.md` (mirror `bc3aa52`'s 45-line report: verdicts linked by comment id, F1–F7 outcome, follow-through, Not run). The primary tree is on `fix/importer-reads-icon-name-449` and shared with parallel sessions: create a temp worktree from `origin/main` on `docs/517-owner-decisions`, copy the three files in, stage by explicit path, commit (`docs(discovery): #517 plan, brief and report — owner decisions on launch plan and acceptance criteria (epic #504)`), push, `gh pr create`. Body: `Closes #517` only if both ACs are met; otherwise `Refs #517`.
- **VALIDATE**: `node tooling/build-checks.mjs` green on the worktree (piv-validate memory: run it even on docs-only PRs); `git -C <wt> show --stat HEAD` lists exactly the three files.
- **GOTCHA**: `.claude/plans/*.md` is fine for drift-check; never park a `.mjs` fragment there (memory). No `loc-summary` group matches `.claude/` (observed: #507's commit moved no generated file).
- **SATISFIES**: CLAUDE.md git rule (plan, report and review in the PR)
- **REGENERATES**: none

---

## TESTING STRATEGY

No suite applies; the checks are the count greps above and `build-checks.mjs` on the docs-only commit.

### Edge Cases
- The owner answers one decision and defers the other: post the answered one; the other stays open; PR uses `Refs #517`.
- The owner picks "Other" with free text: that text is the verdict, quoted whole; the agent maps it to an option only in the `**Implies:**` line, labelled `(agent)`.
- A sibling session edits #517 between the read and task 0: an anchor count goes to 0 and the script aborts.
- #508 lands before the sitting: L2's deadline has passed; L2 then needs a #508 follow-up, and the brief must say so before the owner answers.

### Proving the checks
Every grep above has its reddening mutation; run the mutation on a scratch copy before trusting the green.

---

## VALIDATION COMMANDS

### Level 1
`for a in …; do grep -cF -- "$a" <scratch>/517.before.md; done` → seven `1`s (observed 2026-10-03).
### Level 2
`gh issue view 517 --json comments --jq '.comments[-1].body' | grep -c "Owner, typed in session"` → number of verdicts.
### Level 3
`node tooling/build-checks.mjs` (worktree) → green.
### Level 4
Read the posted comment on GitHub: owner lines unindented, not blockquoted, dates as typed.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q1: authorise F1–F7 edits to #517 | owner's hand | no (sitting can run on uncorrected text, with F-codes read aloud) | this plan's Q1 |
| The sitting: verdicts L and A | owner's hand | yes for `Closes #517`; `Refs #517` otherwise | #517 stays open |
| Q2: which epic a build ticket joins | owner's hand | no | the filed ticket says "epic TBD" |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: both verdicts are the owner's lines, typed in the session, quoted word for word on #517 with the date; the agent's options labelled `(agent)`. A decision with no line stays open.
- [ ] AC #2: each "build it" verdict is filed as its own ticket, in a later epic, citing #517 (and never closing it).
- [ ] No verdict written, paraphrased or expanded by the agent.
- [ ] If L = L2a/L2b, #508 carries the consequence before it lands.
- [ ] Plan, brief and report committed together; `build-checks.mjs` green.

## COMPLETION CHECKLIST

- [ ] Q1 asked; task 0 run or declined
- [ ] Task 1a run on the sitting day; brief numbers match its output; #508 state checked
- [ ] Brief presented with L first
- [ ] #517 comment posted; its count check passes
- [ ] Follow-through done per verdict
- [ ] Three files committed on their own branch; PR open with the right trailer

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1:** correct #517's body with F1–F7 before the sitting (task 0)? Recommended yes, as #507 did.
- **Q2:** if a verdict is "build it", which epic does the ticket join? None exists for this; a new one or "TBD".
- **A1 (closed by Task 1a):** L's figures are measured on today's tree and on a simulated D-a4 tree, and re-measured on the sitting day from the live bank. If #511 lands in a different shape, Task 1a catches it before the owner reads the brief.
- **A2:** the verdict date is the day the owner types the line, not necessarily today (2026-10-03).
- **A3:** "P0" means #509's top `priority` value once it exists; until then A1 has no target set.

## NOTES (open canvas)

### Pre-flight (run 2026-10-03 against `origin/main` = `bc3aa52`)

**Citations resolved.**
- Confirmed: `bank.mjs:650` (s8-reversibility-blast-radius, whole-bank `:941`); `s4-circuit-breaker` `:320`; `faster-payment/prd.md:227` = seq 15 row, `:232` = seq 26 row; `requirements-hierarchy.md:12-17`; `SKILL.md:27`, `:37` (the ticket's "36-37": `:36` is the reframe test, `:37` the engineering guard); #509 fork 3 `priority` undecided; #508's "Not in scope: rollout".
- Corrected: `:369` is seq 23 at transition (F1); solution-rung replacement `:191` (seq 29). Kiro is EARS (F3, fetched).
- Not verified: PMI's denominator (search summary only, pmi.org 403); the 2017 PMI PDF wording (not in repo). Both are labelled unverified in F4 and A's facts, so the brief claims nothing it has not seen.

**Landed-state checks.**
- `faster-payment/run.json`: `posture: "think"`, `regulated: true`, `replacesAProcess: false`.
- seq 15 op line: `"level":"transition"` filed by the agent. #508's misfile set includes this id. This is F2, and it changed the plan: L2 split into L2a (own question, #508 untouched) and L2b (definition only, #508 must drop the id).
- `replacesAProcess` module: budget 6, 6 ids. No committed package ticks the facet.
- `plan-architecture/SKILL.md`, `plan-create-prd/SKILL.md`: no rollout, launch, acceptance or priority text (grep). This is F6.
- #507's D-c(1) verdict "Superset declared" (read from its comment). This is F7, and it changed the plan: A1 reframed as a superset block.
- #517 has 0 comments; all seven task-0 anchors occur exactly once in its body.
- #505, #506, #508, #509, #511 all OPEN, so L2's "before #508" deadline is still open. #508 depends on #505 and #506, so it cannot land before both merge; Task 1a re-checks on the sitting day, and Task 3 comments on #508 straight after an L2 verdict.
- Risk pass (2026-10-03, owner asked for every risk to be addressed): R1 (the arithmetic depended on #511) → `budget.mjs` measures it from the live bank, observed on `origin/main` and on a simulated D-a4 tree, with a positive control; this also showed L2 fits today and needs 34 only together with #511, so the L2 cost line now says so. R2 (#508 could land first) → Task 1a's state check plus Task 3's immediate comment. R3 (Tessl unchecked) → checked; the claim is stale (legacy feature, removed in v0.50.3), now in F3. New: group 28 case 12 pins module budgets to 6..7, so #511's hasModel 8 needs a pin edit; recorded in the arithmetic.
- Budget policy (advisor pass): D1a's "~30" is load-bearing (`discovery-question-selection.architecture.md:68`, `:74`) and #507's accepted D-a cost line forbids "another increase". This changed the plan: L2 now states it reopens that line, and the recommendation names L1 as the choice if the owner holds it.
- PMI (advisor pass): the 403 means the "unsuccessful projects" wording is a search summary, not an observed quote; F4 and A's facts now say so instead of asserting a year.

**Traps carried.**
- Honesty contract runs both ways (memory): no owner verdict text from the agent.
- Copy is never indented (memory).
- PRs don't auto-close tickets (memory), both directions: "will close" in a Refs body closes too.
- Shared worktree (memory): commit from a temp worktree off `origin/main`, stage by explicit path.
- piv-validate on docs-only PRs (memory): run `build-checks.mjs` anyway.

### Why L2a over L2b
L2b keeps rollout answers under questions about kill criteria and evidence strength, so whether they reach the
transition section depends on the agent's rung choice per turn, and #508's metric loses one of its counted ids. L2a
gives the owner's rollout commitment one home and leaves both #508's metric and the kill-criterion question as they are.

## AMENDMENTS

- 2026-10-03 — owner asked for all risks addressed. Added Task 1a (`budget.mjs` live re-check + #508 state check), measured L's arithmetic on today's tree and a simulated D-a4 tree, corrected L2's cost (the budget increase comes only with #511), checked Tessl (F3), recorded group 28 case 12's 6..7 pin.
- 2026-10-03 (implementation) — pre-flight re-run: `origin/main` still `bc3aa52`, seven anchors at 1, `budget.mjs` matches Task 1a's figures on the live tree. Run deviations: the budget negative control was run on today's tree at budget 28 (not the simulated tree at 32); the simulated post-#511 figures were not re-run and are cited from the plan's Task 1a pass. The brief was not re-shown in full in chat; each option carried its one-line cost in the AskUserQuestion call, and the full brief was pointed to by path. Q1 was recorded on #517 in the owner-block shape, not paraphrased. The F4 replacement leaves "the PDF is not in the repo" twice in #517's body (the plan's own text).
