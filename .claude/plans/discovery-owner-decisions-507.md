# Feature: owner decisions D-a to D-d for epic #504 (decision brief, #507)

This is a plan for a **decision ticket**. #507 writes no code. The work is a single owner sitting. The agent sets out
the options for each decision, labelled `(agent)`. The owner types each verdict. The agent then quotes those verdicts
on #507 and re-points the six Wave 3 tickets at them. The sections below follow the PIV template, adapted to that
shape.

**Hard rule for whoever runs this (the honesty contract in both directions):** the agent never writes a verdict, never
paraphrases one into the issue, and never infers one from a recommendation the owner nodded at. If a decision has no
typed owner line, it stays open. Every `VERDICT:` slot below stays empty until the owner types into it.

## Feature Description

Epic #504 makes the projected `prd.md` buildable. Wave 3 (#509, #510, #511, #512, #513 and #518) cannot be planned
until four cross-cutting questions are answered:

- **D-c:** the page's shape against the house PRD template, and the code route that new blocks take.
- **D-a:** which questions full discovery asks.
- **D-b:** how a new op parameter reaches committed packages that cannot be re-recorded.
- **D-d:** what owner sign-off means.

This plan gives the sitting a brief whose citations are checked against `origin/main` at `fc79d46`. It includes one
measured correction to the ticket and epic text (D-c). After the sitting, it gives the mechanical steps that record
the verdicts.

## User Story

As the owner of the discovery partner,
I want each of the four open decisions shown with checked evidence, the real cost of each option and one labelled
recommendation,
so that I can decide all four in one sitting and Wave 3 can be planned without reopening them.

## Problem Statement

Six Wave 3 tickets each name a fork they cannot settle on their own. Without a recorded verdict, each implementer
either decides the fork silently, which is drift the epic forbids, or stalls. The ticket's own framing of D-c(2) also
rests on a claim that does not hold for the kind of row the new blocks would be (see D-c below). Deciding on that
framing would price one option wrongly.

## Solution Statement

1. **The sitting brief:** the four decisions in the ticket's order (D-c first), each with checked facts, options and
   costs, and an `(agent)` recommendation. That is the "Decision brief" section below.
2. **The owner types four verdict lines** in the session.
3. **The agent posts one comment on #507.** It holds the agent's options labelled `(agent)`, then each owner line
   quoted word for word with its date, and the implementing ticket that writes the dated amendment.
4. **The agent edits #509, #510, #511, #512, #513 and #518** so each names the verdict it inherits.

## Out of Scope / Non-Goals

- **No code, no amendments to docs.** Every amendment lands with its implementing ticket, as the AC requires.
  #392 (a667b39) and #347 (d4ceb21) are the precedent.
- **No edit to #507's or #504's body before the sitting.** The R4 / D-c(2) correction is put to the owner here. The
  agent asks whether to amend the issue text, and does not do it on its own.
- **#517 is not part of this sitting:** launch plan and acceptance criteria. It is a separate ticket and gates nothing.
- **No acceptance criteria for Wave 3 tickets.** Those are written just in time by each ticket's own plan. This plan
  only records which verdict each ticket inherits.
- **No paid run.** Nothing here spends tokens.

## Feature Metadata

**Feature Type**: decision ticket (governance)
**Estimated Complexity**: Low to execute, Medium to prepare (the citations needed checking)
**Primary Systems Affected**: none edited. Read: `discovery/prd-projection.mjs`, `discovery/bank.mjs`, `discovery/ops.mjs`, `portal/lib/discovery-postures.mjs`, `.claude/skills/plan-create-prd/SKILL.md`, `docs/epics/discovery-partner.{prd,architecture}.md`
**Dependencies**: `gh` CLI (authenticated as the owner's account)

## Related Work

**Implements**: #507 · **Epic**: #504. Governing PRD: `docs/epics/discovery-partner.prd.md` §Amendments. Architecture: `docs/epics/discovery-partner.architecture.md`, `docs/epics/discovery-question-selection.architecture.md`.

**Back-references**:
- #392 (a667b39): the unfaceted budget went 30 → 31, inserted before the last position. Precedent for D-a option 1 and for amending in the implementing commit.
- #347 (d4ceb21): a param was added under the op-verb lock (`file_evidence.name`) and one 12-turn fixture was re-recorded. Precedent for D-b.
- #453: the Tensions block is rendered outside `SECTIONS`. Precedent for D-c(2) "stay outside".
- #396 (8fbd46e): the house shape was amended across `plan-create-prd`, `plan-architecture` and `piv-slice-epic`. Precedent for D-c(1) "amend SKILL.md".
- #359 / `dcd071c`: the relayed proposal verdicts. Evidence for D-d.

**Forward-references**: #509 (D-b), #510 (D-c), #511 (D-a), #512 (D-c, via #509), #513 (D-d), #518 (D-c).

---

## CONTEXT REFERENCES

### Relevant Codebase Files (read at `origin/main` = `fc79d46`)

- `discovery/prd-projection.mjs:1-3`: the header already says "the house shape is .claude/skills/plan-create-prd/SKILL.md". D-c(1) amends this sentence either way.
- `discovery/prd-projection.mjs:198`: "A decision renders ONCE, in its ladder section" (epic R5).
- `discovery/prd-projection.mjs:211-308`: `SECTIONS`. There are 12 rows. `axis` ∈ ladder · op-kind · cross-ref · derived, and group 31 pins those four at `tooling/build-checks.mjs:9681`.
- `discovery/prd-projection.mjs:752-758`: why Tensions is not a `SECTIONS` row ("SECTIONS feeds Create PRD's section brief and a row there would move that posture's stamp"). For a non-ladder row the measurement below contradicts that sentence.
- `discovery/prd-projection.mjs:842-864`: page order. Title, then the honesty header (`:848`), then the Run line, then the Ledger line (`:852`), then the `SECTIONS` loop (`:854-860`), then Tensions (`:864`).
- `discovery/prd-projection.mjs:322-345`: `checkOpLines` enforces exact keys from `PARAMS` independently of the applier.
- `portal/lib/discovery-postures.mjs:488-498`: `sectionBrief()` filters `axis === 'ladder'`. Its cross-ref lines are hard-coded strings.
- `tooling/build-checks.mjs:8968`: 30.46 pins Create PRD's stamp at `ea523ac1e8eaef1ac1208e108f8b640e`.
- `tooling/build-checks.mjs:8379-8381`: case 31 asserts that every ladder row appears in Create PRD's system prompt.
- `discovery/bank.mjs:818-847`: `OPENING_SET`. `s6-accountable-when-wrong` is at `:846`.
- `discovery/bank.mjs:857-866, 894-905`: the unfaceted full-discovery list, frozen by #283, with #392's insertion.
- `discovery/bank.mjs:955-960`: `NON_FUNCTIONAL_BLOCK`, 4 ids.
- `discovery/bank.mjs:972-1040`: `MODULES` with budgets 7 · 6 · 6 · 6 · 6.
- `discovery/bank.mjs:1057`: `FULL_DISCOVERY_BUDGET = 31`.
- `discovery/bank.mjs:1104-1131`: `facetPlan` / `selectDepth`. An undeclared vector returns the unfaceted list. A declared vector returns the twelve, then the modules that fit under the budget, then the block.
- `discovery/ops.mjs:24`: invariant 3, "ABSENT IS REFUSED". `:75`: `PARAMS`, which is exact.
- `system/canvas-ops.mjs:113`: `OPTIONAL`. The ticket cites `:108`, which has drifted since #516.
- `discovery/README.md:24-25`: "Never hand-write or hand-edit a transcript, an answer or an op — not one line."
- `discovery/README.md:975-978`: the #347 / 2026-09-01 re-record costs.
- `.claude/skills/plan-create-prd/SKILL.md:27, 37, 94, 108-133`: "hypotheses, not specs"; no engineering decisions; the optional four-risks lens; the status ladder; the ten sections.
- `docs/epics/discovery-partner.architecture.md:147-150, 355, 453`: the op table; Confirm-the-receipt (original text and its post-run status).
- `docs/epics/discovery-partner.prd.md:178-181`: C3, no job titles.
- `docs/epics/discovery-question-selection.architecture.md:309`: the parked "rung between" for runs with three or more facets.

### New Files to Create

- `.claude/plans/discovery-owner-decisions-507.md` (this file) and `.claude/plans/discovery-owner-decisions-507.html` (the build brief).
- No repository code or docs.

### Patterns to Follow

- **Decision record shape**, from #507's AC and #517: the options are labelled `(agent)`; under them is the owner's line, typed, quoted word for word, with its date; then the implementing ticket. #392 and #347 wrote their amendments in the implementing commit.
- **Issue edits** use `gh issue edit <n> --body-file <file>`. Fetch the body first (`gh issue view <n> --json body --jq .body > <file>`), edit only the "Re-scope after #507" fork block, and diff it before writing. Do not rewrite the corrected facts.

---

## DECISION BRIEF (what the sitting reads)

Order: **D-c first**, because its answer shapes the other three. Each decision has checked facts, options with their
costs, an `(agent)` recommendation, and an empty verdict slot.

### D-c: the house shape and the `SECTIONS` route

**Checked facts**
- `prd.md` already renders three headings that the house template's ten sections do not list. In `faster-payment/prd.md` they are Weak answers (`:250`), Transition note (`:298`) and Requirement hierarchy (`:385`). It also renders Tensions (`prd-projection.mjs:864`). All are confirmed on `origin/main`.
- The house template has no summary, decision log or launch section. Its four-risks lens is optional (`SKILL.md:94`). It forbids engineering decisions (`:37`).
- **Correction to D-c(2) and epic R4 (observed in this session).** Adding a **non-ladder** row to `SECTIONS` does
  **not** move Create PRD's stamp, and does **not** tell Create PRD about the block. `sectionBrief()` reads only
  `axis === 'ladder'` rows. Its cross-reference lines are fixed strings.
  - Probe: on a copy of `origin/main`, a `derived` row `decision-log` was inserted before `weak-answers`. All four stamps were unchanged (`create-prd` stayed `ea523ac1…`).
  - Positive control: renaming the ladder heading "Transition note" moved `create-prd` to `51f09481…`.
  - Limit: the probe row had no `RENDERERS` entry. It proves the stamp result only. It does not show the page or group 31 staying green.
  - Every block Wave 3 proposes is cross-ref or derived: the decision log, the risks and open-questions view, and the facet and quality views. #510's Summary is the exception (see "Placement"). So for these blocks the real trade-off under D-c(2) is **not** the stamp.
- **Placement is the real constraint.** `SECTIONS` rows render only inside the loop that sits between the Ledger line (`:852`) and Tensions (`:864`).
  - #510 places the decision log "after Tensions, before `Architecture:`". That cannot be a row.
  - #510 places the Summary right after the Ledger line. It can be a row only if it is row 0, which puts it before Problem.
  - Joining therefore fixes where blocks go. Staying outside lets each ticket choose the position.
- **What joining buys:** group 31's per-row checks cover the block for free. Those checks are frozen rows, an exact key set, a known axis and a real `why` sentence (`build-checks.mjs:9674-9682`). The axis contract also says that cross-ref and derived rows "never re-render a decision" (`prd-projection.mjs:204`). That is epic R5's "renders once" stated as a rule of the table.

**Options (agent)**
- **D-c(1)a: declare a superset.** The projection's header (`:1-3`) says `prd.md` is the house shape plus named extra blocks, and lists them: Weak answers, Transition note, Requirement hierarchy, Tensions, plus each Wave 3 block as it lands. Cost: one comment block per Wave 3 ticket. The skills are unchanged.
- **D-c(1)b: amend `SKILL.md`.** The house shape grows a summary, a decision log and a risk view. By #396's precedent, `plan-architecture` and `piv-slice-epic` move with it. Cost: every hand-written epic PRD is now expected to carry those sections, which is a change to the repo's planning method and not only to discovery.
- **D-c(2)a: new blocks join `SECTIONS`** as cross-ref or derived rows. Cost: placement is fixed to the loop (see above), and #510's two placements change. Gain: group 31's row checks, and "never re-renders" holds by axis.
- **D-c(2)b: new blocks stay outside**, as #453 did. Cost: each block needs its own render-once check (#512 already specifies one). Gain: free placement.
- **D-c(2)c: per block.** Cross-ref views (#512, #518) join. The Summary stays outside because it prints the owner's answer. That breaks the cross-ref/derived rule that a row never re-renders a decision, wherever the row sits. The decision log stays outside because of where it sits (after Tensions).

**Recommendation (agent):**
- **D-c(1)a, superset declared.** `prd.md` is a projection of a run package, and the house template is an intent document an owner writes. They share a core but are different artefacts. Growing `SKILL.md` would change how every epic in the repo is written in order to suit one generator.
- **D-c(2)c, per block.** It takes the table's checks where the position allows and #453's route where it does not.
- Also: amend R4's sentence in #504 and the `:755-756` comment in #453's block in whichever Wave 3 ticket lands first. Both say any row moves the stamp, and only a ladder row does.

**Issue text:** the owner authorised the correction on 2026-10-02 (AMENDMENTS). Task 0 writes it into #504 R4 and #507 D-c(2) **before** the sitting, so the owner decides on corrected text.

**VERDICT (owner, typed):** _(empty until typed)_
**Implementing ticket for the amendment:** _(the agent names it from the verdict: #510 if it lands first, per the epic's merge order)_

### D-a: which questions full discovery asks

**Checked facts**
- **There are two lists** (`bank.mjs:857-866`):
  - The **unfaceted** 31 is used when `facets` is `null`. Committed packages on it: `allergen-matrix-1` and `later-not-never-1`, both `facets: null` (observed in `run.json`).
  - The **faceted** composition is the twelve, then the modules that fit, then the four-question block. Its maximum is 29 today (12 + 4 + 13). Committed packages on it: `faster-payment` (regulated), `partner-audit-2` and `partner-audit-3` (hasModel). Every preset declares a vector.
- **One constant does two jobs.** `FULL_DISCOVERY_BUDGET` (`:1057`) is the unfaceted list's length **and** the cap that faceted modules must fit under (`:1110`).
  - It must stay **≤ 33**. At 34 the smallest triple of modules fits (12 + 4 + 6 + 6 + 6 = 34), which breaks D1a's "any three overflow".
  - #511's hasModel 7 → 8 plus regulated 6 → 7 makes 12 + 4 + 15 = **31**. That fits only while the budget is at least 31, with zero slack.
- **`s7-counter-metric` is in whole-bank** (`:938`) and in no full-discovery list. `s8-cost-per-successful-action` is in whole-bank (`:941`). #511 says `s7-baseline-target-date` would be a **new** entry, outside whole-bank.
- **`s6-accountable-when-wrong` is already in `OPENING_SET`** at `:846`, as the ticket's correction says.
- **A finished package stays finished** because `deriveCursor` reads the last closer's position. #392 inserted its question before the last position for that reason.

**Options (agent)**
- **D-a1: raise the unfaceted budget** (#392's way, inserting before the last position). It reaches only runs started with no facets ticked. The portal allows that: `facets` is "null when nothing was declared" (`portal/public/portal.js:695`, observed). But every preset, and every committed declared run, uses the faceted list, which D-a1 does not touch.
- **D-a2: swap questions in the frozen unfaceted list.** This breaks #283's freeze. The owner must name the question that leaves. Like D-a1, it reaches undeclared runs only.
- **D-a3: grow the faceted side.** There are three ways to do it:
  - **D-a3a, `OPENING_SET`.** It is the source's own twelve (`:80`), so adding to it breaks that provenance.
  - **D-a3b, a module.** Example: hasModel 7 → 8, which reaches only that facet.
  - **D-a3c, a new always-asked block for measurement**, e.g. baseline, target and date plus counter-metric. It goes **before** `NON_FUNCTIONAL_BLOCK`, so `s4-security-boundary` stays last. `deriveCursor` (`portal/lib/discovery.mjs:686`, read) treats a run as finished when its last closer's position plus one is at least the list length. If the block were appended after the quality block, `faster-payment`, `partner-audit-2` and `partner-audit-3` would read as unfinished, and #316 runs on `faster-payment`. It reaches every declared run. Arithmetic with #511's module growth: 12 + 2 + 15 + 4 = **33**, so the budget goes to 33 and any triple stays at 36 or more.
- **D-a4: both lists.** D-a1 for the unfaceted list, plus D-a3c and D-a3b. The two lists stay in step, the unfaceted list becomes 33, and the budget becomes 33.

**Recommendation (agent):** **D-a4.** Metric questions go in a new two-question measurement block that every
declared full discovery asks. The same two are inserted before the last position of the unfaceted list. #511's module
growth (hasModel 8, regulated 7) takes the budget to exactly 33.
- **Reason:** the portal can start either kind of run. A preset or any ticked facet gives the faceted list, and ticking nothing gives the unfaceted one. Only changing both lists makes the new questions reach the gate's real session whichever way the owner starts it. In both lists the new questions go before the last block or question, so committed packages still read as finished.
- **Cost:** the budget sits at its ceiling. Any later growth on the faceted side needs D1a's rung (`discovery-question-selection.architecture.md:309`), not another increase.
- **Amendments** are owed to `discovery-question-selection.architecture.md` D1a and the `bank.mjs:975-977` / `:1053-1056` comments, in #511.

**VERDICT (owner, typed):** _(empty until typed)_
**Implementing ticket for the amendment:** #511

### D-b: how a new param reaches packages that cannot be re-recorded

**Checked facts**
- `PARAMS` is exact (`ops.mjs:75`). Invariant 3 is "ABSENT IS REFUSED" (`:24`).
- `checkOpLines` (`prd-projection.mjs:322`) enforces the same exact keys **separately**. So `OPTIONAL` must reach both the applier and the projection.
- `canvas-ops.mjs:113` is the precedent: an `OPTIONAL` table read by the absence check at `:190`.
- **Option 2 conflicts with a written rule.** `discovery/README.md:24-25` says: "Never hand-write or hand-edit a transcript, an answer or an op — not one line."
  - A scripted back-fill edits committed op lines.
  - In `JOBS_DIR` it also edits real packages that this repo cannot see or gate.
  - Choosing option 2 means amending that rule.
- Cost of re-recording, if a stamp moves (epic R3): `instrument-loans-1` $0.42, plus about $0.139 in probes (README:975-978). The epic prices the five live-compared packages at $7.55 minimum.

**Options (agent)**
- **D-b1: an `OPTIONAL` table.** An absent key means "not filed, recorded before this param existed". It applies in both `ops.mjs` and `checkOpLines`. The agent-facing `TOOL_SCHEMA` can still **require** the key, so every new filing carries it and only old lines lack it. Cost: invariant 3 gets one named exception. The page must render "absent" differently from `null`. With the key optional in the applier, "absent means old" holds only by convention. Callers that reach the applier without the SDK schema can still file without the key: the fake agent, the proposer and the score tool. #509 should name a check for them.
- **D-b2: a deterministic, dated back-fill to `null`.** Cost: amends README:24-25; cannot reach `JOBS_DIR` packages the owner does not run it on; and `null` then means both "the agent said none" and "never asked".

**Recommendation (agent):** **D-b1**, with the key required in `TOOL_SCHEMA`. It keeps the transcript untouched, it is the
pattern the canvas grammar already uses, and it keeps "never asked" separate from "asked, answered none".
**Amendment:** the op table at `discovery-partner.architecture.md:147` and invariant 3's text, in #509.

**VERDICT (owner, typed):** _(empty until typed)_
**Implementing ticket for the amendment:** #509

### D-d: what sign-off means for a one-person run package

**Checked facts**
- The house status ladder is `intent · grilled · architecture · sliced · closed`. `closed` is appended by the owner's hand, and no skill writes it (`SKILL.md:108-114`). It is an epic PRD's ladder, not a run package's.
- **Commit `dcd071c`** (2026-09-03) relayed 8 verdict lines on `allergen-matrix-1`. Their `ts` values span 20:24:09.149 → 20:24:09.200, which is **51 ms** (derived from the committed lines).
- **Confirm-the-receipt** (`discovery-partner.architecture.md:355`; status at `:453`: "still open") is about a click per decision. Sign-off is one approval per package.
- **C3** (`discovery-partner.prd.md:178-181`) bans titles in "the bank, the UI, the run package, the generated PRD". The owner's own answer `a6` in `faster-payment` says "Head of Payments". `answers.jsonl` is verbatim by contract (`prd-projection.mjs` NO LENGTH CAP; README:24).

**Options (agent)**
- **What an approval sets:**
  - (i) an append-only `signoff.jsonl` line `{type, ts, at_seq}`, with status derived as "approved at seq N" or "approved at seq N, M ops since";
  - (ii) a field in `run.json`, which `mutateHead` rewrites, so the record is not append-only;
  - (iii) the house `closed` rung.
- **A relayed verdict:**
  - (i) does not count, and an AC met only by a relay is reported not met;
  - (ii) counts if the owner says so in the session.
- **Confirm-the-receipt:**
  - (i) not settled; it stays open;
  - (ii) settled by sign-off.
- **C3's reach:**
  - (i) what the agent files, what the UI and projection author, and the sign-off line; the owner's verbatim words are exempt;
  - (ii) everything, including the owner's words, which breaks the verbatim contract.

**Recommendation (agent):**
- Approval sets (i).
- A relayed verdict does not count (i). The route refuses a missing Origin as friction, not proof, as #513 states.
- Confirm-the-receipt is not settled (i).
- C3 reaches (i), and C3's text is amended to say the owner's verbatim answers are exempt.

**Amendments:** `discovery-partner.architecture.md:355/:453` (note that sign-off is not Confirm-the-receipt), `discovery-partner.prd.md` §Amendments (C3's scope), and the README sign-off section. All land in #513.

**VERDICT (owner, typed):** _(empty until typed; four sub-answers)_
**Implementing ticket for the amendment:** #513

---

## IMPLEMENTATION PLAN

### Phase 0: Correct the issue text (agent, authorised 2026-10-02)
F1–F5 from pre-flight go into #504 and #507 before the sitting. No owner verdict is involved: these are corrections to agent-written ticket text.

### Phase 1: The sitting (owner's hand)
**Depends on:** Phase 0.
The owner reads the brief (this section or the HTML) and types one line per decision in the session. The agent
records nothing until a line exists.

### Phase 2: Record on #507
**Depends on:** Phase 1, for each decision separately. A decision with a line can be posted, and one without stays open.

### Phase 3: Re-point Wave 3
**Depends on:** Phase 2 for the decision each ticket inherits.

---

## STEP-BY-STEP TASKS

### 0. CORRECT #504 and #507 with F1–F5, before the sitting
Pre-flight found five defects in the ticket text (NOTES). The fix for each is a correction to the issue body, placed
where the owner reads it during the sitting. None of them is a verdict.

| F | Defect | Fix | Where |
|---|---|---|---|
| F1 | "A new row moves Create PRD's stamp" is true for ladder rows only | state the measured rule and the real costs: placement and the axis rule | #504 R4, #507 D-c(2) |
| F2 | D-b option 2 hides its conflict with README:24-25 | name the rule it amends and its `JOBS_DIR` reach | #507 D-b option 2 |
| F3 | D-a gives no placement rule; new questions appended at the end would un-finish committed packages | add the `deriveCursor` placement rule, which applies to every option | #507 D-a |
| F4 | D-a option 1 reads as dead once every preset declares facets | state that the portal can start an undeclared run | #507 D-a option 1 |
| F5 | `canvas-ops.mjs:108` has drifted; `OPTIONAL` must also reach `checkOpLines` | `:113`, plus the second enforcement point and the non-SDK callers | #507 D-b option 1 |

The code comment that carries F1's false sentence (`discovery/prd-projection.mjs:755-756`, "a row there would move
that posture's stamp") is **not** edited here. #507 touches no code. Task 3 hands it to #510, the first Wave 3
ticket to edit that file under the epic's merge order.

- **IMPLEMENT**: Run a single script per issue, saved in the scratchpad.
  1. Fetch the body right before the edit: `gh issue view <n> --json body --jq .body > <scratch>/<n>.before.md`.
  2. For each (anchor, replacement) pair, assert the anchor occurs **exactly once**, then replace it. If any anchor is
     missing, abort without writing anything: a sibling session has changed the text, so re-read the issue and
     re-derive the anchor.
  3. Diff `.before.md` against `.after.md`. Only the anchored spans may differ.
  4. `gh issue edit <n> --body-file <scratch>/<n>.after.md`.

  The pairs are verbatim. Anchors were taken from the bodies read on 2026-10-02.

  **#504**
  - anchor: ``A new row moves Create PRD's stamp. A block rendered outside `SECTIONS` (the #453 route, `prd-projection.mjs:757-758`) does not.``
  - replacement: ``A new **ladder** row moves Create PRD's stamp. A cross-ref or derived row does not, because `sectionBrief` (`portal/lib/discovery-postures.mjs:488`) reads ladder rows only (measured 2026-10-02, #507). Nor does a block rendered outside `SECTIONS` (the #453 route, `prd-projection.mjs:757-758`). What joining does fix is placement: rows render only between the Ledger line and Tensions.``

  **#507**
  - **D-c(2)**
    - anchor: ``Joining moves Create PRD's stamp, which is the 30.46 literal; no package is recorded under Create PRD, so it costs nothing today. It also makes Create PRD aware of them.``
    - replacement: ``**Corrected 2026-10-02 (measured):** only a *ladder* row moves Create PRD's stamp (the 30.46 literal) or reaches its prompt, because `sectionBrief` reads `axis === 'ladder'` rows only. A cross-ref or derived row moves no stamp and tells Create PRD nothing. Joining has two real costs. The first is placement: rows render only between the Ledger line and Tensions (`prd-projection.mjs:852-864`). The second is the axis rule: a cross-ref or derived row never re-renders a decision (`:202`), so a block that quotes the owner's answer cannot be one.``
  - **D-a option 1**
    - anchor: ``1. **Raise the unfaceted budget** (#392's precedent: 30 → 31, inserted before the last position).``
    - replacement: ``1. **Raise the unfaceted budget** (#392's precedent: 30 → 31, inserted before the last position). It reaches runs started with no facets ticked, which the portal allows (`portal/public/portal.js:695`).``
  - **D-a placement**: insert before the parked-rung paragraph.
    - anchor: ``The parked rung (``
    - replacement: ``**Placement, whichever option:** `deriveCursor` (`portal/lib/discovery.mjs:686`) reads a run as finished when its last closer's position + 1 ≥ the list length. New always-asked questions therefore go before the last block (faceted list) or before the last question (unfaceted list). Otherwise `faster-payment`, `partner-audit-2`, `partner-audit-3`, `allergen-matrix-1` and `later-not-never-1` read as unfinished, and #316 runs on `faster-payment`.\n\nThe parked rung (``
  - **D-b option 1**
    - anchor: ``as `system/canvas-ops.mjs:108` has for `screen.compose`: absent means not filed.``
    - replacement: ``as `system/canvas-ops.mjs:113` has for `screen.compose`: absent means not filed. It must reach both the applier and `checkOpLines` (`prd-projection.mjs:322`), which checks exact keys on its own. `TOOL_SCHEMA` can still require the key from the live agent. Callers outside that schema (the fake agent, the proposer, the score tool) could then omit it, so the implementing ticket names a check for them.``
  - **D-b option 2**
    - anchor: ``applied by a script and recorded in README.``
    - replacement: ``applied by a script and recorded in README. This edits committed op lines, so it amends `discovery/README.md:24-25` ("Never hand-write or hand-edit a transcript, an answer or an op — not one line"). It cannot reach real packages in `JOBS_DIR` that nobody runs it on, and `null` then means both "never asked" and "answered none".``

- **GOTCHA**: `\n\n` in the D-a placement replacement is a real paragraph break. Write the replacements into the script as Python strings, not through shell `echo`, because backticks would be shell-expanded.
- **GOTCHA**: do not touch #507's acceptance criteria, the D-d section or anything outside the anchors. Do not touch #504's Decisions list.
- **VALIDATE** (expected):
  ```
  gh issue view 504 --json body --jq .body | grep -c 'A new \*\*ladder\*\* row moves'                 # 1
  gh issue view 504 --json body --jq .body | grep -c 'A new row moves'                                 # 0
  B=$(gh issue view 507 --json body --jq .body)
  for p in 'Corrected 2026-10-02 (measured)' 'portal/public/portal.js:695' 'Placement, whichever option' 'canvas-ops.mjs:113' 'README.md:24-25'; do printf '%s ' "$p"; grep -cF "$p" <<<"$B"; done   # each 1
  grep -cF 'canvas-ops.mjs:108' <<<"$B"                                                                # 0
  ```
- **REDDENS**: skip any one pair, and its grep prints `0` (for `:108`, `1`). Positive control: run the loop on the `.before.md` file first. Every new-text grep must print `0` there. If one prints `1`, the check cannot fail.
- **SATISFIES**: not an AC. It makes the text the verdicts rest on accurate (F1–F5).
- **REGENERATES**: none

### 1. PRESENT the brief to the owner
- **IMPLEMENT**: Show D-c, then D-a, D-b and D-d from the DECISION BRIEF, and say that task 0 has corrected the issue text. Wait for typed lines. Do not offer a pre-written verdict for the owner to approve. "Yes to your recommendation" is a typed owner line and is quoted as typed, not expanded into the recommendation's words.
- **VALIDATE**: each verdict slot in the session transcript holds text the owner typed.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 2. POST the decision record on #507
- **IMPLEMENT**: Write one comment body to the scratchpad. For each decision that has an owner line:
  - `**D-x — (agent) options:**`, followed by the option list from the brief, verbatim;
  - `**Owner, typed in session, 2026-10-DD:**`, followed by the line quoted word for word, as plain text on its own line with no blockquote or indent (memory: copy is never indented);
  - `**Amendment written by:** #N`.
  
  A decision without a line gets: `**Owner:** no line recorded — open.`
- **PATTERN**: #507's AC block.
- **GOTCHA**: `gh` runs as the owner's account, so authorship proves nothing. The quoted line is the record (AC #1).
- **GOTCHA**: a body-file is safer than `--body` for markdown containing backticks: `gh issue comment 507 --body-file <f>`.
- **VALIDATE** (expected): `gh issue view 507 --json comments --jq '.comments[-1].body' | grep -c "Owner, typed in session"` equals the number of decisions that have a line. Before the sitting, run `gh issue view 507 --json comments --jq '.comments|length'` once to confirm the form parses.
- **REDDENS**: post with a decision's owner line missing, and the count falls short by one.
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: none

### 3. UPDATE #509, #510, #511, #512, #513, #518
- **IMPLEMENT**: For each ticket:
  1. `gh issue view <n> --json body --jq .body > <scratch>/<n>.md`, fetched **right before** the edit. Sibling sessions revised #509–#518 today.
  2. Under its "Re-scope after #507" heading, add one line: `**Inherits:** #507 D-x — "<owner line>" (2026-10-DD), <link to the #507 comment>`.
  3. Leave the forks list in place. The ticket's own plan resolves its forks against the verdict.
  4. `gh issue edit <n> --body-file <scratch>/<n>.md`.

  Mapping: #509 ← D-b · #510 ← D-c · #511 ← D-a · #512 ← D-c (and #509's shape, via D-b) · #513 ← D-d · #518 ← D-c.

  #510 gets one extra line: `**Also owed (from #507 F1):** correct the Tensions comment at `discovery/prd-projection.mjs:755-756`. Only a ladder row moves Create PRD's stamp.` The plan for #510 does that in its own commit.
- **GOTCHA**: diff the before and after bodies. Only the inserted line may differ.
- **VALIDATE** (expected): `for n in 509 510 511 512 513 518; do gh issue view $n --json body --jq .body | grep -c "Inherits:\*\* #507"; done` prints `1` six times.
- **REDDENS**: skip one ticket, and that row prints `0`.
- **SATISFIES**: AC #3
- **REGENERATES**: none

### 4. RECORD where the plan files land (Q2)
- **IMPLEMENT**: Add one line at the end of the task 2 comment: `Plan and brief: .claude/plans/discovery-owner-decisions-507.{md,html}. They land in the first Wave 3 PR that cites #507.` Do not commit them in this session. The working tree is shared, and #507 has no branch of its own.
  - Whoever opens the first Wave 3 PR stages the two paths explicitly. Its body says `Refs #507`.
  - Never write "closes #507" or "will close #507" in that PR body. Either phrase closes the issue (memory: PRs don't auto-close tickets).
  - #507 is closed by hand once all three ACs are ticked.
- **VALIDATE** (expected): `gh issue view 507 --json comments --jq '.comments[-1].body' | grep -c "discovery-owner-decisions-507"` prints `1`.
- **REDDENS**: post the comment without the line, and it prints `0`.
- **SATISFIES**: CLAUDE.md's rule that a ticket's plan travels with its PR.
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no code to test. The checks are the `gh` reads in tasks 0 to 4, each with a mutation that makes it fail. The
D-c probe in NOTES is the one empirical claim this plan adds. It carries its own positive control.

### Edge Cases
- **The owner answers only some decisions.** Post those. Mark the rest open. Update only the tickets whose decision has a line. The others keep "re-scope after #507".
- **The owner picks an option not listed**, or a mix. Quote it as typed. The implementing ticket's plan interprets it, and the agent does not restate it as an option.
- **The owner answers D-d's four sub-questions in one line.** Quote the one line. Do not split it into four invented ones.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
None. No code changes.

### Level 2: Unit Tests
None.

### Level 3: Integration Tests
- `node tooling/build-checks.mjs`: not required, because no tracked file changes. Run it only if something touched the tree, which nothing in this plan does.

### Level 4: Manual Validation
- The `gh` reads in tasks 0, 2, 3 and 4.
- Re-run the D-c probe if the owner wants to see it (the script is in NOTES).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| D-c verdict typed by the owner | owner's hand | yes. It blocks closing #507 and starting #510, #512 and #518 | #507 stays open |
| D-a verdict typed by the owner | owner's hand | yes. It blocks #511 | #507 stays open |
| D-b verdict typed by the owner | owner's hand | yes. It blocks #509 and, through it, #512 | #507 stays open |
| D-d verdict typed by the owner (four sub-answers) | owner's hand | yes. It blocks #513 | #507 stays open |

There are no paid steps. "PR" here means closing #507. The ticket has no code PR. The plan and brief files land in the
first Wave 3 PR that cites #507 (task 4).

---

## ACCEPTANCE CRITERIA (from #507, unchanged)

- [ ] Each of the four verdicts is the owner's line, typed in the session, quoted word for word on #507 with its date. The agent's options are labelled `(agent)` above it. If there is no line, the decision stays open.
- [ ] Each verdict names the implementing ticket that writes its dated amendment.
- [ ] #509, #510, #511, #512, #513 and #518 each name the verdict they inherit.

## COMPLETION CHECKLIST

- [ ] Task 0's corrections are on #504 and #507, and its greps print the expected counts.
- [ ] The brief was presented with D-c first.
- [ ] No verdict was written, paraphrased or expanded by the agent.
- [ ] The #507 comment was posted, and its count check passes.
- [ ] Six tickets were updated, and their check prints `1` six times.
- [ ] #510 carries the owed `:755-756` comment fix.
- [ ] The task 2 comment names where the plan files land, and nothing was committed.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (resolved 2026-10-02):** amend #504 R4 and #507 in place, before the sitting. This is task 0.
- **Q2 (resolved 2026-10-02):** the plan files land with the first Wave 3 PR that cites #507. This is task 4.
- **A1:** the sitting is in this session or a later one. The verdict date is the day the owner types the line, not today's date (2026-10-02) unless typed today.
- **A2:** the R4 correction has been measured only for Create PRD's stamp. Think and Grill do not read `sectionBrief`, and the probe showed their stamps unchanged too.

## NOTES (open canvas)

### Pre-flight (run 2026-10-02 against `origin/main` = `fc79d46`)

**Citations resolved.**
- **Confirmed:** SKILL.md:27/37/94; `prd-projection.mjs:198`, `:757` region (`:752-758`), `:848`; `faster-payment/prd.md:250/298/385`; `bank.mjs:846` (s6-accountable-when-wrong in `OPENING_SET`), `:975`, `:1057`; `ops.mjs:24`, `:75`; `discovery-partner.architecture.md:147`, `:355`; `discovery-partner.prd.md:178-181`; `discovery-question-selection.architecture.md:309`; README:976-978 ($0.424 / $0.637 / $0.139); `faster-payment` `a6` "Head of Payments" (one occurrence); `dcd071c` 8 verdict lines.
- **Drifted:** `system/canvas-ops.mjs` `OPTIONAL` is at `:113`, not `:108`. The absence check is at `:190`.
- **Derived:** `dcd071c`'s 51 ms = 20:24:09.200 − 20:24:09.149, from the committed `ts`.
- **30.46's Create PRD literal** is `tooling/build-checks.mjs:8968` = `ea523ac1e8eaef1ac1208e108f8b640e`, which matches the live stamp.

**Landed-state checks.**
- Facets per committed package, read from `run.json`:
  - `allergen-matrix-1`, `later-not-never-1`: full-discovery, `null` facets;
  - `faster-payment`: regulated;
  - `partner-audit-2`, `partner-audit-3`: hasModel;
  - `partner-audit-1`, `instrument-loans-1`: opening-set;
  - `graded-*`: whole-bank.
- The portal can start a run with `facets: null` (`portal.js:695`). `deriveCursor`'s finished rule is "last closer position + 1 ≥ length" (`discovery.mjs:686-700`). Both were changed into D-a after the advisor pass.
- `s7-counter-metric` and `s8-cost-per-successful-action` are in whole-bank only (`bank.mjs:938`, `:941`).
- No `s7-baseline-target-date` exists. It is new in #511.

**Task 0 anchors (observed 2026-10-02):** all six anchors occur exactly once in the live #504 and #507 bodies.
`gh issue view 507 --json comments --jq '.comments|length'` parses and returns `0`, so #507 has no comments yet. If
any count is not 1 on the run day, re-derive that anchor before editing.

**The D-c probe** (it changed the plan: D-c(2)'s cost moved from the stamp to placement).
```
S=<scratch>/p507; git archive origin/main discovery/ops.mjs discovery/bank.mjs \
  discovery/prd-projection.mjs portal/lib/discovery-postures.mjs | tar -x -C $S
# fp.mjs: import POSTURES, print each .fingerprint
before:            create-prd ea523ac1e8eaef1ac1208e108f8b640e (think 7efdde37…, think-opus cadb3811…, grill 76b7847d…)
+derived row:      all four identical                      → a non-ladder row moves no stamp
ladder heading
"Transition note"→"Transition notes": create-prd 51f094818429cbcf94924bd114541453 → positive control fires
```
Limit: the row had no `RENDERERS` entry. Stamp result only.

**Traps carried.**
- *Honesty contract runs both ways* (memory): no owner verdict text from the agent.
- *Copy is never indented* (memory): quoted owner lines go as plain lines.
- *PRs don't auto-close tickets* (memory): "will close #507" written in a Wave 3 PR body would close #507. Write `Refs #507` only.

### Why the brief recommends at all
#507's AC requires the agent's options labelled `(agent)` above each verdict. A recommendation inside the `(agent)`
block is part of that record, and the owner's line sits below it. Without one, the owner has to rebuild the cost
arithmetic in the sitting.

## AMENDMENTS

- 2026-10-02: the owner directed fixes for all five pre-flight findings and accepted the recommendations on Q1 and Q2.
  - Added task 0, which corrects #504 R4 and #507 (D-c(2), D-a options and placement, D-b options 1 and 2) with verbatim anchor and replacement pairs.
  - Replaced the conditional R4 task with task 4 (where the plan files land).
  - Gave #510 the owed code-comment fix for `prd-projection.mjs:755-756`.
  - Dropped the R4 row from the owner-only table.
  - The F codes refer to the pre-flight findings: F1 is the stamp rule, F2 the back-fill conflict with README, F3 the `deriveCursor` placement rule, F4 the undeclared portal runs, F5 the `canvas-ops` cite and the second enforcement point.
