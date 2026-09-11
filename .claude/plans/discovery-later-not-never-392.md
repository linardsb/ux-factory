# Feature: "Later, not never" — a parked-scope question in the bank and its own projected section (#392)

The following plan should be complete, but validate documentation and codebase patterns and task sanity
before you start implementing. Pay special attention to naming of existing utils, types and models. Import
from the right files.

**Base:** `origin/main` at `078c367` (PR #386 / #289 merged 2026-09-11 09:25Z). Every line number below is at
that sha; the working tree's copies of the cited files are byte-identical to it (observed, `git diff HEAD
origin/main --stat -- discovery tooling portal docs .claude/references` empty). Branch from it:
`git switch -c feat/392-later-not-never origin/main`.

**Rehearsed.** The whole CODE half (T1–T6 and T4b, minus the prose edits) was applied on a throwaway
worktree at `078c367`, the gate ran green (`build ✓ all 34 groups pass`), the seven pages moved by exactly
four lines each, and all seven reddening mutations were driven and observed (NOTES §Spike). The observed
diff is beside this plan as `discovery-later-not-never-392.code.patch` and `git apply --check` passes
against `078c367`. The implementer may `git apply` it and then do the prose tasks (T7–T9, the header and
summary-string edits in T1/T2/T5, T10) by hand — or follow the tasks line by line; both end at the same
tree. Every "observed" below was read from that rehearsal on 2026-09-11.

## Feature Description

The bank asks two exclusion questions and the projection folds both into **Non-goals**. The first,
`s3-deliberately-not-doing`, grades *"we'll do that later"* as a weak answer. So a person who parks scope for
a later version is either graded weak, or their parked item is filed as a refusal, or it stays in the
transcript as text no op carries and `prd.md` cannot show. This ticket gives the parked item a home: one
DERIVED bank question (`s4-parked-for-later`, stage 4) asked in the unfaceted full discovery, and one PRD
section (**Later, not never**) beside Non-goals, sourced from a decision on that question and nothing else.
The house PRD shape already carries the section (`.claude/skills/plan-create-prd/SKILL.md` §9); the
platform cannot read the skill, so this is the platform's route.

## User Story

As a person running a full discovery session on a blank idea
I want to say, in my own words, what I am saving for a later version rather than refusing
So that the projected PRD lists it under its own heading beside Non-goals, and a later reader can tell a
deferral from a refusal without opening the transcript.

## Problem Statement

`prd-projection.mjs` is a pure fold over the op ledger: a claim reaches the page only through an op. The
only ops that can carry "we are not doing X" are decisions on the two exclusion questions, and both project
as Non-goals. A parked item therefore has no op that carries it and no section that names it — by
construction, not by omission.

## Solution Statement

- **Bank:** one new entry on the D7 pattern (outside the source file, outside `whole-bank`, primary source by
  URL), placed in stage 4 so the id pin holds, and inserted into the UNFACETED `full-discovery` list at
  position 20, directly after `s3-deliberately-not-doing`. `FULL_DISCOVERY_BUDGET` moves 30 → 31 with a
  one-line D1a amendment. Not in `OPENING_SET`, not in a module, not in the block — the faceted composition
  #291 and #292 are pre-registered against is unchanged.
- **Projection:** one new `SECTIONS` row after Non-goals (`id: "later"`, heading **Later, not never**,
  `axis: "cross-ref"`), rendered by the same by-seq rule as Non-goals through a shared helper, with its own
  `tbd` empty state. `NON_GOAL_QUESTIONS` is unchanged.
- **Gates:** group 28's literals move with the bank; group 30's unfaceted count moves; group 31 gains a
  fixture decision on the new question and a case proving it renders under the new heading, NOT under
  Non-goals, and vanishes with its op. The seven committed `prd.md` files are regenerated (see F1 below —
  they are byte-compared in CI, so they MUST move by exactly the new section's four lines).
- **One real run** (owner's hand, paid) that asks the question and projects the answer under the heading.

## Out of Scope / Non-Goals

- Not adding an op verb or a param (the epic's op-verb lock is not taken). The section is keyed on a
  `question_id`, exactly as Non-goals is.
- Not touching `whole-bank` (frozen 65), `OPENING_SET` (the twelve), `NON_FUNCTIONAL_BLOCK`, any `MODULES`
  entry, or any preset. Faceted placement is a follow-up decision after the #291/#292 runs.
- Not changing the drawer (`portal/public/`). The question reaches the person through the existing cursor.
  The one edit there is a stale comment (`portal.js:684`, "the unfaceted thirty").
- Not changing the proposals half (`discovery/proposals.mjs`, group 34).
- Not re-recording `discovery/instrument-loans-1/` or any other package. Think's, Think-on-Opus's and
  Grill's fingerprints do not move: `fingerprintOf` hashes fixed inputs (`FINGERPRINT_INPUTS`,
  `discovery-postures.mjs:670-680`) and the tool descriptions, never the bank. Create-PRD's moves on purpose
  (T4b) and nothing recorded carries it.
- Not amending the PRD (`discovery-partner.prd.md`): MVP 5 says "~30, selected" and 31 is still that.

## Feature Metadata

**Feature Type**: Enhancement · **Estimated Complexity**: Medium (the code is ~100 lines; the cascade into
seven regenerated pages and a derived carrier count is where the risk is) · **Primary Systems Affected**:
`discovery/bank.mjs` · `discovery/prd-projection.mjs` · `portal/lib/discovery-postures.mjs` (one brief
line) · `tooling/build-checks.mjs` groups 28, 30, 31 · `discovery/README.md` · seven committed
`discovery/*/prd.md` · one recorded run package ·
**Dependencies**: none new. The run needs the Agent SDK via the portal (Mac CLI login; no token needed).

## Related Work

**Implements**: [#392](https://github.com/linardsb/ux-factory/issues/392) · **Epic**: #279 —
`docs/epics/discovery-partner.architecture.md`, sub-decision
`docs/epics/discovery-question-selection.architecture.md` (D1a is amended by this ticket; D1b, D2, D3 stand).

**Back-references**:

- `.claude/plans/discovery-bank-width-283.md` — the D7 entry pattern (outside the source, URL in
  `attribution`, id pin in an existing stage) this entry copies; `FULL_DISCOVERY_BUDGET` was born there.
- `.claude/plans/discovery-prd-projection-290.md` — `SECTIONS`, the two rendering rules and the `empty`
  idiom; case 31.7's vanishing-claim loop this plan extends to a cross-ref row.
- `.claude/plans/discovery-affordances-289.md` — landed as #386 this morning; it added 32.6's corpus sweep
  (every committed `prd.md` byte-compared) and reserved answer ref `a11` in case 31.16.
- `.claude/reports/discovery-run-0-338-report.md` — the run protocol, the two cost baselines, and the
  precedent for a fictional run's answers being drafted on request and pasted by the owner (lines 228–229).

**Forward-references**: (none yet). A faceted placement of `s4-parked-for-later` is a decision after #291 and
#292, not a ticket.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `discovery/bank.mjs`
  - lines 1–78 — the header: the four readers, editorial rules D1–D7 (D7 at 53–66 is the pattern), ids are
    hand-chosen and stable.
  - lines 256–262 — `s3-deliberately-not-doing`: the gap in the bank's own words (`weakAnswer` at 261).
  - lines 330–339 — `s4-four-risks`, the last source-backed stage-4 entry; the new entry goes right after it.
  - lines 340–372 — the D7 non-functional block: attribution-with-URL shape to copy (e.g. 353, 361, 369).
  - lines 836–842 — the comment over `DEPTHS` stating the unfaceted list is FROZEN and why.
  - lines 870–893 — `DEPTHS["full-discovery"].ids`; `"s3-deliberately-not-doing"` is line 881.
  - lines 946–951 — the `MODULES` arithmetic comment (12 + 4 + 13 = 29 / 12 + 4 + 18 = 34) — still true at 31.
  - lines 1028–1029 — `FULL_DISCOVERY_BUDGET = 30`.
  - lines 1075–1108 — `facetPlan` and `selectDepth`: unfaceted → `d.ids`; declared → twelve + modules + block.
- `discovery/prd-projection.mjs`
  - lines 155 — `NON_GOAL_QUESTIONS` (stays). The new `LATER_QUESTIONS` goes right after it.
  - lines 181–272 — `SECTIONS`; the Non-goals row is 230–237, Open questions starts 238. Row keys are exactly
    `id · heading · axis · from · why · empty` (case 31.1 pins the set).
  - line 73 — `tbd(why)`, declared above `SECTIONS` on purpose (temporal dead zone).
  - lines 596–606 — `renderNonGoals`: the by-seq cross-ref renderer to generalise.
  - lines 696–708 — `RENDERERS` keyed by row id; 740–746 — the loop that substitutes `row.empty` on `null`.
- `tooling/build-checks.mjs`
  - lines 124–128 — the header's group 28 entry ("QUESTIONS minus it asserted to be exactly D7's ten").
  - lines 161–169 — the header's group 31 entry.
  - lines 5241–5249 — `FULL_DISCOVERY` literal (second copy of the depth list); 5276–5280 `ADDED_283`.
  - lines 5283–5289 — case 1: `BANK.length === 75`, `perStage = [6, 7, 6, 11, 8, 8, 7, 18, 4]`.
  - lines 5406–5419 — case 9: the source pin, scoped to `WHOLE_BANK`, with the D7-absent loop at 5419.
  - lines 5421–5431 — case 10: `outside === ADDED_283`, URL check, `NON_FUNCTIONAL_BLOCK === ADDED_283.slice(0,4)`.
  - line 5474 — case 13: `selectDepth("full-discovery", {}).length === 30`.
  - line 5553 — group 28's summary string ("75 entries …").
  - line 7221 — group 30 case 28: `sessionView(r).cursor.total === 30`.
  - lines 7904–7935 — case 30.46: the think-stamp carrier count `=== 5` (line 7923), derived from disk.
  - lines 8177–8227 — group 31 helpers: `present`, `headings`, `sectionBody`, `blockOf`, `HOSTILE`, `HOSTILE_URL`.
  - lines 8229–8243 — `PRD_ANSWERS` (a1…a10); 8245–8270 `PRD_OPS` (13 ops, turns t1…t9); 8271 `PRD_RUN`.
  - lines 8294–8312 — 31.1 ("eleven DISTINCT" at 8294 and 8311); 8314–8336 — 31.2 coverage rules.
  - lines 8428–8475 — 31.7 the vanishing claim (31.7.1 iterates LADDER rows only; 31.7.2 the empty run).
  - lines 8637–8706 — 31.13 the injection battery (iterates every record's params — a new op is driven for free).
  - lines 8771–8803 — 31.16 (#289): uses ref `a11` for its synthetic aside. **The new fixture answer is `a12`.**
  - line 8804 — group 31's summary string ("eleven DISTINCT").
  - lines 8888–8927 — 32.5 / 32.6: `instrument-loans-1/prd.md` and EVERY committed `prd.md` byte-compared to
    `projectPrd(readPackage(...))`; 32.6(b) `unfiled === 0`; the corpus's off-script total asserted `=== 0`.
  - lines 9327–9370 — 33.15: the two graded packages' `prd.md` byte-compared too.
- `portal/lib/discovery.mjs`
  - lines 633–659 — `deriveCursor`: the cursor is the LAST closer's position + 1, never a count. This is why
    the new id must sit BEFORE the last question of the list (see F3).
  - line 568 — `DEPTH_PROPOSAL`: blank-idea proposes `full-discovery`.
  - lines 953–963 — `discoveryConfig`: `count: d.ids.length` — the drawer's "N questions" comes from here.
  - lines 79–89 — `RUN_SLUG_RE = /^[a-z0-9-]{1,48}$/`.
- `portal/lib/discovery-postures.mjs` lines 670–680, 721–724 — `FINGERPRINT_INPUTS` and `fingerprintOf`: the
  bank is not an input. Line 173 — "Think's prompt surface is stamped on five recordings" (moves to six with
  the new package).
- `portal/public/portal.js` line 684 — the one stale comment ("the unfaceted thirty").
- `discovery/README.md` lines 71, 91, 356–362, 372–389, 562–566 — the lines this ticket edits.
- `docs/epics/discovery-question-selection.architecture.md` lines 66–82 — D1a.
- `.claude/references/gates.md` lines 45, 51 — groups 28 and 31.

### New Files to Create

- `discovery/later-not-never-1/` — `run.json` · `answers.jsonl` · `transcript.jsonl` (server-written by the
  real run; never hand-written) · `prd.md` (projected). Owner-only, see the paid table.

### Relevant Documentation

- Figma's PRD template, the primary source —
  https://coda.io/@yuhki/figmas-approach-to-product-requirement-docs/prd-name-of-project-1 (307-redirects to
  `docs.superhuman.com`, same path; fetched 2026-09-11). **There is no "Future considerations" section.** The
  wording that exists is the Key Features guidance: *"Give an overview of what we're building. Provide an
  organized list of features, with priorities if relevant. Discuss what you're not building (or saving for a
  future release) if relevant."* The entry's `attribution` quotes that, not the ticket's paraphrase (F2).
- `.claude/skills/plan-create-prd/SKILL.md` §9 *Later, not never* — the house shape. **Uncommitted in the
  working tree today** (P1).
- `discovery/README.md` §The PRD projection — the two rendering rules, verbatim: a decision renders ONCE in
  its ladder section; cross-ref sections name it by `seq` and never re-render it.

### Patterns to Follow

**A D7-pattern entry** (`discovery/bank.mjs:350-356`):

```js
  {
    id: "s4-availability-expectation",
    stage: 4,
    text: "…",
    attribution: "Derived, from the SRE practice … — https://sre.google/sre-book/service-level-objectives/",
    label: "DERIVED",
    weakAnswer: "…",
  },
```

**A cross-ref renderer** (`discovery/prd-projection.mjs:596-606`) — the shape `crossRefByQuestion` keeps:

```js
function renderNonGoals(state) {
  const rows = NON_GOAL_QUESTIONS.map((id) => state.latestByQuestion.get(id)).filter(Boolean);
  if (!rows.length) return null;
  return rows.map((d) => {
    const q = questionFor(d.params.question_id);
    return `- seq ${d.seq} — ${q ? q.text : qidLabel(d.params.question_id)} (see ${headingForLevel(d.params.level)})`;
  }).join("\n");
}
```

**A gate case that can fail** (`tooling/build-checks.mjs:8428-8440`): delete the op, assert the row's OWN
`empty` string renders and the claim is absent from the WHOLE document (`present(md, wrong_if)` false).

**Naming:** ids `s<stage>-<slug>`; `SECTIONS` row ids kebab-case; gate cases numbered `31.N —` with a
one-line reason; every `ok()` message names what moved. **Errors:** none new. **Logging:** none.

---

## IMPLEMENTATION PLAN

### Phase 1: The bank (T1–T3)
The entry, the list, the budget, and group 28 + 30 moving with them in the same commit.

### Phase 2: The projection (T4–T6)
**Depends on:** Phase 1 (the fixture decision resolves `s4-parked-for-later` through the real applier, which
refuses a `question_id` the bank does not hold).
The row, the shared renderer, group 31's fixture and case, and the seven regenerated `prd.md`.

### Phase 3: Docs (T7–T10)
**Independent of:** Phase 2 once Phase 1 is in (the README and gates.md lines are prose).

### Phase 4: The real run (T11–T12)
**Depends on:** Phases 1–3 green. Owner-only, paid, reported as **not met** if not run.

---

## STEP-BY-STEP TASKS

### T1 · UPDATE `discovery/bank.mjs` — the entry, the header, the list, the budget

- **IMPLEMENT**:
  1. Header line 17–18: after "#283 extends QUESTIONS with the ten it added (D7) …" add "#392 adds one more
     on the same pattern (D8) and one section in the projection."
  2. After D7 (line 66) add rule D8:
     `D8  THE PARKED-SCOPE QUESTION (#392), s4-parked-for-later, is the eleventh entry outside the source and outside whole-bank, on D7's pattern: DERIVED, a primary source by URL, stage 4 so the id pin holds. It is in the UNFACETED full-discovery list at position 20, directly after s3-deliberately-not-doing (whose weakAnswer grades "we'll do that later"), and in no module, not the block and not OPENING_SET — the faceted composition #291/#292 are pre-registered against is unchanged. It sits BEFORE the last question of the list on purpose: deriveCursor reads the last closer's position, so every earlier full-discovery recording still reads as finished. prd-projection.mjs projects a decision on it under "Later, not never", beside Non-goals and never inside them.`
  3. New entry after `s4-four-risks` (after line 339, before the `#283 · the non-functional block` comment at
     340), under its own comment `// ---------- #392 · the parked-scope question (D8) — outside the source, outside whole-bank ----------`:
     - `id: "s4-parked-for-later"` · `stage: 4` · `label: "DERIVED"`
     - `text: "What are you saving for a later version rather than refusing, and what does keeping it possible tell us about how to build now?"`
     - `attribution: "Derived, from the Key Features guidance in Figma's PRD template — \"Discuss what you're not building (or saving for a future release) if relevant\" — https://coda.io/@yuhki/figmas-approach-to-product-requirement-docs/prd-name-of-project-1"`
     - `note: "The bank's two exclusion questions fold into Non-goals and s3-deliberately-not-doing grades \"we'll do that later\" as weak, so a parked item had no home. A decision here projects under Later, not never, beside Non-goals and never inside them. The template page redirects to docs.superhuman.com (fetched 2026-09-11)."`
     - `weakAnswer: "a wish list. A parked item with no reason for later-rather-than-now, or one the exclusion questions would already refuse, is a non-goal wearing a different label."`
  4. `DEPTHS["full-discovery"].ids`: insert `"s4-parked-for-later",` directly after `"s3-deliberately-not-doing",`
     (line 881). Comment at 836–842: "then eighteen more" → "then nineteen more"; append one sentence: "#392
     inserted s4-parked-for-later at position 20, before the last question, so allergen-matrix-1 and run 0
     still read as finished (deriveCursor reads the last closer's position, not a count)."
  5. `FULL_DISCOVERY_BUDGET = 31`; comment (1028): "MVP 5's ~30 as a budget the person spends (D1a) — 31 since
     #392, because the budget follows the unfaceted list and that list grew by one; the faceted composition
     (twelve + block + at most two modules, 29 at most) is unchanged, so every pair still fits and every
     triple still overflows."
- **PATTERN**: `discovery/bank.mjs:350-356` (D7 entry); D5's "Derived, from …" rule (line 41–43).
- **IMPORTS**: none.
- **GOTCHA**: (a) the entry's position INSIDE `QUESTIONS` decides case 10's `outside` order — it must sit
  BEFORE the D7 four so `QUESTIONS minus WHOLE_BANK` reads `[s4-parked-for-later, …D7 ten]` (F9). (b) Do NOT
  append the id at the END of the depth list: allergen-matrix-1's last closer would then sit at position 29
  of 31 and the package reads as unfinished (F3). (c) C3: the TITLE_TERMS regex (`build-checks.mjs:5380`)
  sweeps every string of every entry — no "product manager", "head of", "senior", "executive", "leadership".
  The strings above carry none. (d) The 65 source-backed entries must keep source order inside `QUESTIONS`
  (case 5) — inserting a non-source entry between them is fine; reordering them is not.
- **VALIDATE**:
  ```bash
  node -e 'import("./discovery/bank.mjs").then(b => { const q = b.questionById("s4-parked-for-later"); const ids = b.DEPTHS["full-discovery"].ids; console.log(q.stage, q.label, /https:\/\//.test(q.attribution), b.QUESTIONS.length, ids.length, ids.indexOf("s4-parked-for-later"), ids.indexOf("s3-deliberately-not-doing"), b.FULL_DISCOVERY_BUDGET, b.selectDepth("whole-bank").length, b.selectDepth("full-discovery", { regulated: true }).length, b.facetPlan({ hasModel: true, regulated: true, internal: true }).overflow) })'
  ```
  Prints `4 DERIVED true 76 31 19 18 31 65 22 [ 'internal' ]` (observed on the rehearsal; the last three
  prove the faceted half did not move — the four presets still compose 22/22/28/16). Before T1 the same
  line prints `undefined undefined false 75 30 -1 18 30 65 22 [ 'internal' ]` (observed on `078c367`).
- **REDDENS**: n/a (no check added; T2 is the check).
- **SATISFIES**: AC #1 (entry keys), AC #2 (whole-bank 65, twelve, presets unmoved — driven above and in T2).
- **REGENERATES**: none (bank.mjs is under `discovery/`, outside every loc group — its own header says why).

### T2 · UPDATE `tooling/build-checks.mjs` group 28 — the literals move with the bank

- **IMPLEMENT**:
  1. `FULL_DISCOVERY` literal (5241–5249): insert `"s4-parked-for-later",` after `"s3-deliberately-not-doing",`.
  2. After `ADDED_283` (5280) add:
     `// The one #392 added, on D7's pattern (bank.mjs D8). It sits BEFORE the D7 block inside QUESTIONS, so`
     `// QUESTIONS minus whole-bank reads it first.`
     `const ADDED_392 = ["s4-parked-for-later"];`
     `const OUTSIDE_SOURCE = [...ADDED_392, ...ADDED_283];`
  3. Case 1: `BANK.length === 76`, message "…not 76 — 65 source-backed plus the ten of D7 plus #392's one";
     `perStage = [6, 7, 6, 12, 8, 8, 7, 18, 4]`; comment: "plus D7's four and #392's one in stage 4".
  4. Case 9 (5419): iterate `OUTSIDE_SOURCE`, message "a D7/D8 entry's weak-answer opening is IN the source region".
  5. Case 10 (5424–5427): `outside === OUTSIDE_SOURCE` (message: "not D7's ten plus #392's one"); the `.every`
     resolve/out-of-whole-bank check and the URL check over `OUTSIDE_SOURCE`. Keep
     `NON_FUNCTIONAL_BLOCK === ADDED_283.slice(0, 4)` and `AI_SIX = ADDED_283.slice(4)` untouched.
     Add two pins under a comment `// #392 (D8): in the unfaceted list only — beside its exclusion sibling, and never last.`:
     `ok(!OPENING_SET.includes("s4-parked-for-later") && !NON_FUNCTIONAL_BLOCK.includes("s4-parked-for-later") && Object.values(MODULES).every((m) => !m.ids.includes("s4-parked-for-later")), "s4-parked-for-later must be in the UNFACETED list only — the faceted composition #291/#292 are pre-registered against is unchanged");`
     `{ const fd = DEPTHS["full-discovery"].ids; const at = fd.indexOf("s4-parked-for-later"); ok(at === fd.indexOf("s3-deliberately-not-doing") + 1 && at < fd.length - 1, \`s4-parked-for-later sits at ${at} of ${fd.length} — it must follow s3-deliberately-not-doing and never be LAST (deriveCursor reads the last closer's position, so a last-placed id makes every earlier full-discovery recording read unfinished)\`); }`
  6. Case 13 (5474): `=== 31`, message "answers the unfaceted 31".
  7. Summary string (5553): "76 entries — 65 source-backed pinned per stage 6·7·6·7·8·8·7·12·4 plus D7's four
     in stage 4 and six in stage 8, plus #392's one in stage 4 (in the unfaceted full-discovery list only,
     beside s3-deliberately-not-doing and never last) — …"; further on, "exactly D7's ten" → "exactly D7's ten
     plus #392's one".
  8. Header comment (126–127): "D7's ten" → "D7's ten plus #392's one".
- **PATTERN**: the existing case 10 block (5421–5431).
- **IMPORTS**: none new (`DEPTHS`, `MODULES`, `NON_FUNCTIONAL_BLOCK`, `OPENING_SET` already imported at 250).
- **GOTCHA**: the `perStage` array is stage 1…9 in order — index 3 is stage 4. `WHOLE_BANK` (5252–5274) does
  NOT change; if it moved, 33.15's graded scoring dies (D1b's sharpest wrong-if).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^(bank|✓|✗)" | head -5` → `✓ bank …` and the
  closing `build ✓ all 34 groups pass` (observed with T1–T6 in). Before T2 with T1 in: `✗ bank the bank holds 76 entries,
  not 75` (expected — run it, it is the positive control for every literal you moved).
- **REDDENS**: revert the `FULL_DISCOVERY` literal's one line → "full-discovery drifted: …" names the list.
  Move the new id to the end of `DEPTHS["full-discovery"].ids` → `s4-parked-for-later sits at 30 of 31 — it
  must follow s3-deliberately-not-doing and never be LAST` beside `full-discovery drifted` (both observed on
  the rehearsal). Add `"s4-parked-for-later"` to a module's ids → "must be in the UNFACETED list only".
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none.

### T3 · UPDATE `tooling/build-checks.mjs` group 30 + `portal/public/portal.js` comment

- **IMPLEMENT**: line 7221 `cursor.total === 30` → `=== 31`, message "must read as the unfaceted 31".
  `portal/public/portal.js:684`: "(the unfaceted thirty)" → "(the unfaceted list — 31 since #392)".
- **PATTERN**: the same line.
- **GOTCHA**: 7221 is inside group 30 case 28's `for (const absent of [{}, { facets: null }])` — both forms.
  The `faceted` case two lines up (`cursor.total === 22`) does NOT move: regulated = 12 + 6 + 4.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓ all 34 groups pass` (observed with
  T1–T6 in). `grep -rn "thirty\|\b30 questions" portal/public/` → no hits (observed today except the 684 comment).
- **REDDENS**: n/a (a literal moved, no check added).
- **SATISFIES**: AC #2 (the count is observed by the existing gate case, not argued).
- **REGENERATES**: none.

### T4 · UPDATE `discovery/prd-projection.mjs` — `LATER_QUESTIONS`, the row, the shared renderer

- **IMPLEMENT**:
  1. After `NON_GOAL_QUESTIONS` (155):
     `// The bank's one question that asks what is PARKED rather than refused (#392). "Later, not never" is its`
     `// cross-reference and nothing else — and it is NOT in NON_GOAL_QUESTIONS, because a parked item filed`
     `// under Non-goals reads as refused, which is the gap the question exists to close.`
     `export const LATER_QUESTIONS = Object.freeze(["s4-parked-for-later"]);`
  2. New `SECTIONS` row directly after the Non-goals row (after line 237):
     ```js
       {
         id: "later",
         heading: "Later, not never",
         axis: "cross-ref",
         from: `decisions on ${LATER_QUESTIONS.join(" and ")}`,
         why: "The house shape's §Later, not never (.claude/skills/plan-create-prd/SKILL.md): what is PARKED for a later version, kept apart from what is refused. Cross-referenced by seq like Non-goals, never re-rendered, never guessed at — and sourced from one bank question, never from the exclusion pair (#392).",
         empty: tbd(`the run did not answer ${LATER_QUESTIONS.join(", ")}`),
       },
     ```
  3. REFACTOR `renderNonGoals` (596–606) into `const crossRefByQuestion = (ids) => (state) => { … }` with the
     SAME body (rows from `state.latestByQuestion` over `ids`, `null` when empty, the same line format), and in
     `RENDERERS`: `"non-goals": crossRefByQuestion(NON_GOAL_QUESTIONS)`, `later: crossRefByQuestion(LATER_QUESTIONS)`.
     Comment over it: "ONE renderer for both question-keyed cross-ref sections: Non-goals and Later, not
     never (#392) differ only in which ids they name, and a second copy would let one drift from the by-seq
     rule while the other kept it."
  4. Header (line 18–27 area, the "six sources" paragraph): no change — a decision on the new question is
     an op's own params + a bank question by `question_id`, both existing sources.
- **PATTERN**: `renderNonGoals` at 596–606; the Non-goals row at 230–237; `tbd` at 73.
- **IMPORTS**: none new.
- **GOTCHA**: (a) `empty` strings must be DISTINCT across all twelve rows (31.1) — the `tbd(...)` above is. (b)
  the row's key set is exactly six keys; a seventh fails 31.1 by name. (c) `latestByQuestion` already excludes
  off-script decisions (#289) — an off-script decision that NAMES the question never reaches this section,
  which is the same rule Non-goals follows; do not special-case it. (d) The refactor is byte-preserving for
  Non-goals; T6's `git diff --numstat` (every regenerated page `4 0`) is the observation that proves it.
- **VALIDATE**:
  ```bash
  node discovery/prd-projection.mjs instrument-loans-1 --stdout | grep -n -A2 "^## Later, not never"
  ```
  Observed on the rehearsal (`-B2 -A2`): line 133 `- seq 12 — What are we declaring out of bounds? (see MVP)`
  (Non-goals' last row), 135 `## Later, not never`, 137 `_TBD — the run did not answer s4-parked-for-later._`.
  Before T4 the grep prints nothing (observed on `078c367`).
- **REDDENS**: n/a here (T5 is the check).
- **SATISFIES**: AC #3 (twelve rows; the new heading; the `tbd` line).
- **REGENERATES**: the seven committed `prd.md` — T6, in the same PR. `prd-projection.mjs` is under
  `discovery/`, outside every loc group (its header says so), so `loc-summary.json` does not move.

### T4b · UPDATE `portal/lib/discovery-postures.mjs` `sectionBrief()` + re-pin Create-PRD's stamp (P6)

- **IMPLEMENT**: the Create-PRD posture's system prompt carries a "where a decision renders" brief DERIVED
  from the projection's own constants (`discovery-postures.mjs:442-451`: the ladder rows from `SECTIONS`,
  then `METRIC_STAGE`, then `NON_GOAL_QUESTIONS`). A decision on `s4-parked-for-later` renders under Later,
  not never, so the brief gets one line, after the Non-goals line:
  `` `- a decision on ${LATER_QUESTIONS.join(' or ')} → also Later, not never (parked for a later version — never Non-goals)`, ``
  and the import at line 81 becomes `import { LATER_QUESTIONS, METRIC_STAGE, NON_GOAL_QUESTIONS, SECTIONS } from '../../discovery/prd-projection.mjs';`.
  This MOVES `POSTURES["create-prd"].fingerprint` (the brief is inside the hashed system prompt). Nothing on
  disk runs create-prd (30.46's own comment), so no recording goes stale. Re-pin it the way #289 did:
  ```bash
  node -e 'import("./portal/lib/discovery-postures.mjs").then(m => console.log(m.POSTURES["create-prd"].fingerprint))'
  ```
  → **`ea523ac1e8eaef1ac1208e108f8b640e`** (observed on the rehearsal with exactly the brief line above; on
  `078c367` it prints `f0e7599c7bc953b74ff3750dceca5061`). If your value differs, your brief line is not
  byte-identical to the one above — fix the line, not the pin. Then `tooling/build-checks.mjs:7933`:
  replace the literal with the new hex and extend the message: "…not the value #392 moved it to (it was
  f0e7599c7bc953b74ff3750dceca5061 after #289's DOMAIN_RULE and edc7c52db9d58d59213e93e65cd8d28c before
  that; #392 added the Later, not never line to sectionBrief)".
  Group 30 case 31 (line 7363): extend the assertion with
  `&& cp.systemPrompt.includes(LATER_QUESTIONS.join(" or "))` and the message "…the non-goal questions, the
  parked-scope question and the metric stage…"; import `LATER_QUESTIONS` there too (T5's import line).
- **PATTERN**: `discovery-postures.mjs:448` (the Non-goals line); #289's re-pin at `build-checks.mjs:7933`.
- **GOTCHA**: Think, Think-on-Opus and Grill do NOT move — `sectionBrief()` is Create-PRD's alone (case 31
  asserts Think and Grill carry neither `CREATE_PRD_STANCE` nor the brief). If 30.46 reports THINK or GRILL
  moved, you edited the wrong builder — stop. `discovery-postures.mjs` is SDK-free (node:crypto + the bank +
  the projection), so the one-liner above runs from the repo root without `portal/node_modules`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^(build discovery|✗)|all 34"` → `build discovery ✓ …`,
  `build ✓ all 34 groups pass` (observed). Before the re-pin, with the brief line in: `· 30.46: Create-PRD's
  stamp is ea523ac1e8eaef1ac1208e108f8b640e, not the value #289 moved it to` (observed — the positive
  control that the stamp really covers the brief).
- **REDDENS**: remove the brief line again → `case 31: the section brief must name the non-goal questions,
  the parked-scope question and the metric stage` and `30.46: Create-PRD's stamp is
  f0e7599c7bc953b74ff3750dceca5061, not the value #392 moved it to` (both observed).
- **SATISFIES**: AC #5's "or the plan says exactly which moved and why" — this is the one that moves.
- **REGENERATES**: none.

### T5 · UPDATE `tooling/build-checks.mjs` group 31 — the fixture decision and case 31.17

- **IMPLEMENT**:
  1. `PRD_ANSWERS` (8229–8243): append
     `// a11 is reserved: case 31.16 pushes it as its synthetic unfiled aside.`
     `{ ref: "a12", text: "Saving for a later version, not refusing: a waiting list for a plot when one frees up. Later because nobody has asked for it yet and the committee wants the rota trusted first; keeping it possible means the plot record needs a holder history, not just a current holder." },`
  2. `PRD_OPS` (8245–8270): append, under a comment `// #392: a decision on the parked-scope question — its own turn (it closes), a real parent (seq 4, the stakeholder decision), a wrong_if distinct from every other so the vanishing-claim check cannot pass on another block.`
     `{ turn: "t10", op: "record_decision", params: { question_id: "s4-parked-for-later", answer_ref: "a12", level: "solution", parent_id: 4, evidence_refs: [1], wrong_if: "A holder history turns out to be the whole product, so the waiting list was never a later version but the thing itself.", off_script: false } },`
     This is seq 14.
  3. 31.1: "eleven DISTINCT" → "twelve DISTINCT" (8294 comment, 8311 message).
  4. 31.2: after the `NON_GOAL_QUESTIONS` checks (8333–8334) add:
     `ok(LATER_QUESTIONS.length === 1 && Object.isFrozen(LATER_QUESTIONS), "LATER_QUESTIONS is not one frozen id (#392)");`
     `for (const id of LATER_QUESTIONS) ok(questionById(id) !== null, \`LATER_QUESTIONS names "${id}", which the bank does not hold — a rename would silently empty Later, not never\`);`
     `ok(LATER_QUESTIONS.every((id) => !NON_GOAL_QUESTIONS.includes(id)), "a LATER question is also a NON_GOAL question — a parked item would then render as a refusal, the exact leak #392 closes");`
     `// Every question-keyed cross-ref section has exactly one home, the VALID_FOR idiom one axis over.`
     `for (const id of [...NON_GOAL_QUESTIONS, ...LATER_QUESTIONS]) { const homes = SECTIONS.filter((r) => r.axis === "cross-ref" && r.from.includes(id)); ok(homes.length === 1, \`question "${id}" is named by ${homes.length} cross-ref row(s) — it must be exactly one\`); }`
  5. New case, after 31.16 (before the `group("prd projection", …)` line at 8804). This is the rehearsed
     text — the first draft dereferenced `later.seq` past a failed vacuity guard and turned M4 into a
     `TypeError` that took the whole group down (observed); the guard now gates the rest (31.7.4's `m?.seq`
     shape):
     ```js
       // 31.17 — #392: LATER, NOT NEVER. A decision on s4-parked-for-later renders under its own heading,
       // beside Non-goals and NOT inside them, by seq and once; delete the op and the row's own `empty`
       // renders with the claim gone from the WHOLE document (31.7.1's loop is over LADDER rows, so the
       // cross-ref row gets its own).
       {
         const row = SECTIONS.find((r) => r.id === "later");
         const ng = SECTIONS.findIndex((r) => r.id === "non-goals");
         ok(row && SECTIONS.indexOf(row) === ng + 1, "31.17: the Later, not never row is not directly after Non-goals");
         const later = decisionsOf(PRD_RECORDS).find((d) => d.params.question_id === "s4-parked-for-later");
         // The vacuity guard, and the rest of the case runs only past it: a missing fixture op must fail BY
         // NAME here, never as a TypeError that takes the whole group down (31.7.4's `m?.seq` shape).
         ok(later?.seq === 14, `31.17: the fixture has no decision on s4-parked-for-later at seq 14 (got ${later?.seq ?? "none"}) — the case below is then vacuous`);
         if (later?.seq === 14) {
           const q = questionById("s4-parked-for-later");
           const body = String(sectionBody(doc, row.heading));
           ok(present(body, `- seq ${later.seq} — ${q.text} (see MVP)`), `31.17: Later, not never does not name seq ${later.seq} by the by-seq rule — ${JSON.stringify(body.slice(0, 160))}`);
           ok(body.split("\n").filter((l) => l.startsWith("- seq ")).length === 1, "31.17: Later, not never renders more than one row for one parked decision");
           const ngBody = String(sectionBody(doc, "Non-goals"));
           ok(!ngBody.includes(`seq ${later.seq} `) && !present(ngBody, q.text), `31.17: the parked decision LEAKED into Non-goals — ${JSON.stringify(ngBody)}`);
           ok(ngBody.includes("seq 6 ") && ngBody.includes("seq 13 "), "31.17: Non-goals lost its own two rows — the shared renderer changed Non-goals' output");
           ok(blockOf(doc, later.seq) !== null && String(sectionBody(doc, "MVP")).includes(`seq ${later.seq}`), "31.17: the parked decision has no block in its ladder section (MVP) — a decision renders ONCE, there");
           // The vanishing claim, cross-ref edition.
           const md = project(PRD_RECORDS.filter((r) => r.seq !== later.seq));
           ok(sectionBody(md, row.heading) === row.empty, `31.17: with the parked decision deleted, Later, not never renders ${JSON.stringify(String(sectionBody(md, row.heading)).slice(0, 120))}, not its declared empty`);
           ok(!present(md, later.params.wrong_if) && !present(md, PRD_ANSWERS.find((a) => a.ref === "a12").text.split("\n")[0]), "31.17: the parked decision's wrong_if or answer survives ANYWHERE after its op was deleted");
           ok(same(headings(md), SECTIONS.map((r) => r.heading)), "31.17: deleting the parked decision removed a heading");
         }
       }
     ```
  6. Summary string (8804): "eleven DISTINCT" → "twelve DISTINCT"; append before "What it cannot reach" (or
     at the end of the capability list): "· #392: a twelfth row, Later, not never, keyed on ONE bank question
     and proven disjoint from NON_GOAL_QUESTIONS with every question-keyed cross-ref id having exactly one
     home, the fixture's parked decision rendered under it by seq and NOT under Non-goals, and the vanishing
     claim driven on the cross-ref row (delete the op, the row's own empty renders, the claim is gone from the
     whole page)".
  7. Header comment for group 31 (161–169): append "· #392: a twelfth row keyed on one bank question, its
     leak into Non-goals refused".
- **PATTERN**: 31.7.1 (8432–8438) for the vanishing shape; 31.16 (8771–8803) for the case shape; helpers at
  8177–8200.
- **IMPORTS**: add `LATER_QUESTIONS` to the `prd-projection.mjs` import at line 277:
  `import { checkOpLines, LATER_QUESTIONS, METRIC_STAGE, NON_GOAL_QUESTIONS, projectPrd, readPackage, SECTIONS } from "../discovery/prd-projection.mjs";`
- **GOTCHA**: (a) `parent_id: 4` is the only valid solution-rung parent in the fixture (seq 4 is the sole
  stakeholder decision); any other value is refused by the applier at fixture-build time and EVERY group 31
  case goes red at once. (b) Turn `t10` is fresh — R2 refuses a second closer on a used turn. (c) The
  `headingForLevel("solution")` heading is "MVP" — that is what `(see MVP)` asserts. (d) 31.13 iterates
  `PRD_RECORDS` — seq 14's `question_id`, `answer_ref` and `wrong_if` are injected automatically; the
  `folded >= 25 && refused >= 10` floors only rise. (e) 31.15's `visibleOrphans` is derived — seq 14 has a
  parent, so it does not move the orphan count. (f) `threw` (8159) and `same` (8167) are BLOCK-LOCAL to
  group 31, like `present` and `sectionBody` — 31.17 sits inside the same block, so they are in scope; do
  not redeclare them.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^(build prd projection|✗)|all 34"` → `build prd projection ✓ …`,
  `build ✓ all 34 groups pass` (observed — 31.17 passed on its first run over the rehearsed fixture).
- **REDDENS** (each driven on the rehearsal and reverted; the messages are what was printed): (1) in
  `RENDERERS` point `later` at `crossRefByQuestion(NON_GOAL_QUESTIONS)` → `31.17: Later, not never does not
  name seq 14 by the by-seq rule — "- seq 6 — What are we deliberately not doing…` plus "renders more than
  one row". (2) add `"s4-parked-for-later"` to `NON_GOAL_QUESTIONS` → `a LATER question is also a NON_GOAL
  question…` and `question "s4-parked-for-later" is named by 2 cross-ref row(s)`. (3) make `crossRefByQuestion`
  return `""` instead of `null` on empty → `31.17: with the parked decision deleted, Later, not never renders
  "", not its declared empty`. (4) delete the new fixture op → `31.17: the fixture has no decision on
  s4-parked-for-later at seq 14 (got none) — the case below is then vacuous`, and NOTHING ELSE (the guard).
- **SATISFIES**: AC #3 in full (twelve rows · renders under the heading by seq · NOT under Non-goals · the
  vanishing-claim loop · the injection battery re-run · a home for it).
- **REGENERATES**: none.

### T6 · REGENERATE the seven committed `discovery/*/prd.md`

- **IMPLEMENT**: the projection gained a section that always renders, and 32.5 / 32.6(c) / 33.15 byte-compare
  every committed `prd.md` to the projection (F1). All seven are byte-identical to the projection today
  (build-checks is green on main), so `--force` discards no hand edit:
  ```bash
  for s in allergen-matrix-1 bracket-trace-1 bracket-trace-2 graded-opus-a graded-think-a instrument-loans-1 partner-audit-1; do node discovery/prd-projection.mjs "$s" --force; done
  git diff --numstat -- 'discovery/*/prd.md'
  ```
- **PATTERN**: `writePrd` (line 806–815) — `--force` is the documented regenerate switch; 33.15's own message
  says "regenerate it with node discovery/prd-projection.mjs <slug> --force".
- **GOTCHA**: the ONLY acceptable diff per file is `4	0` — a blank line, `## Later, not never`, a blank line,
  the `tbd` line, after the Non-goals body. Any other line moving means T4's refactor changed Non-goals'
  bytes; stop and fix T4 before committing. `prd.md`'s own header says "nothing regenerates this file" —
  that sentence is about the tooling, and stays; you are regenerating by hand, once, with the switch built
  for it.
- **VALIDATE**: the `numstat` prints seven rows, each `4	0` (observed: allergen-matrix-1, bracket-trace-1,
  bracket-trace-2, graded-opus-a, graded-think-a, instrument-loans-1, partner-audit-1 — every one `4	0`; the
  hunk is `## Later, not never`, blank, the `tbd` line, blank, after Non-goals' body). Each `prd ✓` line reads
  `→ 12 sections` (observed). Then `node tooling/build-checks.mjs 2>&1 | grep -E "^(build parenting|build graded|✗)|all 34"`
  → both groups ✓ and `build ✓ all 34 groups pass` (observed). Before T6 with T4 in, the gate prints exactly
  eleven reds: `32.5: discovery/instrument-loans-1/prd.md is not the projection's bytes`, seven `32.6:
  discovery/<slug>/prd.md is no longer the projection's bytes`, two `33.15: … --force`, and T4b's stamp
  (observed — that is the whole cascade, nothing else moved).
- **REDDENS**: skip one of the seven (`git checkout 078c367 -- discovery/bracket-trace-1/prd.md`) → `32.6:
  discovery/bracket-trace-1/prd.md is no longer the projection's bytes` (observed).
- **SATISFIES**: AC #4 as CORRECTED (P2): every committed `prd.md` changes by exactly the new section's four
  lines and by nothing else. The ticket's "no committed prd.md changed" cannot hold and is not the goal.
- **REGENERATES**: the seven `prd.md` (this task). Nothing under `system/` or `agent-layer/` moves.

### T7 · UPDATE `discovery/README.md`

- **IMPLEMENT**:
  1. Line 71 (§Files, `bank.mjs`): "(65 source-backed + #283's ten)" → "(65 source-backed + #283's ten + #392's one)".
  2. Line 91 (§Files, `allergen-matrix-1/`): "30 of 30 answered" → "30 of the 30 it was asked (the unfaceted
     list is 31 since #392)".
  3. §The bank's width (356–362): "the only new text is the ten D7 entries" → "the only new text is the ten
     D7 entries and #392's `s4-parked-for-later` (D8: the parked-scope question, in the unfaceted
     full-discovery list at position 20, beside `s3-deliberately-not-doing`; not in the twelve, the block or
     any module)". Line 360: "`FULL_DISCOVERY_BUDGET` (30)" → "(31 since #392 — the budget follows the
     unfaceted list; D1a amended 2026-09-11)"; "MVP 5's ~30 is spent" stays.
  4. §The PRD projection (372): "Eleven sections" → "Twelve sections"; table: after the Non-goals row add
     `| Later, not never | cross-ref | decisions on \`s4-parked-for-later\` |`. After the "Two rendering rules"
     paragraph add: "**Later, not never is not Non-goals.** A non-goal is refused with a reason; a parked item is
     deferred and may shape today's thin line (the house shape's §9). The two sections read disjoint question
     sets — `NON_GOAL_QUESTIONS` and `LATER_QUESTIONS` — through one by-seq renderer, and group 31 refuses an
     id that appears in both."
  5. §The full-depth run (562): "is the only committed **full-discovery** package" → "was the only committed
     **full-discovery** package until #392's `later-not-never-1/` (31 questions; §Files)". Written in T12
     once the package exists; until then leave the sentence and note it in the report.
- **PATTERN**: the existing table rows at 375–389.
- **GOTCHA**: the README is prose no gate reads except group 28's `enforces nothing` pin on `bank.mjs`'s
  header (not the README). Keep §Files' column alignment.
- **VALIDATE**: `grep -n "Twelve sections\|Later, not never\|#392" discovery/README.md | wc -l` → ≥ 5 (expected).
- **REDDENS**: n/a.
- **SATISFIES**: AC #6 (README lists twelve; §The bank's width names the entry and the budget change).
- **REGENERATES**: none.

### T8 · UPDATE `docs/epics/discovery-question-selection.architecture.md` D1a

- **IMPLEMENT**: at the end of §D1a (after the "Wrong if" paragraph, line ~82) add:
  "**Amended 2026-09-11 (#392).** The unfaceted `full-discovery` list is **31**, not 30, and
  `FULL_DISCOVERY_BUDGET` follows it to 31: `s4-parked-for-later` (the parked-scope question, D8 in the bank)
  joined the unfaceted list directly after `s3-deliberately-not-doing`. The faceted composition — the
  twelve, the block and at most two modules, 29 at most — is untouched, so every pair still fits and every
  triple still overflows, and the `full-discovery` runs #291 and #292 are pre-registered against are
  unchanged. Faceted placement of the question is a decision after both runs."
- **VALIDATE**: `grep -c "Amended 2026-09-11 (#392)" docs/epics/discovery-question-selection.architecture.md` → 1.
- **SATISFIES**: AC #6 (the D1a amendment line).
- **REGENERATES**: none.

### T9 · UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: line 45 (group 28): "75 entries" → "76 entries"; "`QUESTIONS` minus whole-bank is asserted to be
  exactly D7's ten" → "exactly D7's ten plus #392's one, which is also pinned to the unfaceted full-discovery
  list alone, beside `s3-deliberately-not-doing` and never last". Line 51 (group 31): before "*Cannot reach*"
  add "· #392: a twelfth row, Later, not never, keyed on one bank question, disjoint from `NON_GOAL_QUESTIONS`
  by gate, rendered by seq and not under Non-goals, with the vanishing claim driven on the cross-ref row".
- **VALIDATE**: `grep -c "76 entries\|#392" .claude/references/gates.md` → 2 (expected).
- **SATISFIES**: the repo's gate-stack rule (CLAUDE.md §On-demand context).
- **REGENERATES**: none.

### T10 · STAGE `.claude/skills/plan-create-prd/SKILL.md` (P1)

- **IMPLEMENT**: the §9 *Later, not never* edit the ticket cites is UNCOMMITTED in the working tree (observed
  `git status`: `M .claude/skills/plan-create-prd/SKILL.md`, with three unrelated modified files beside it).
  The new `SECTIONS` row's `why` cites it. Stage that ONE file by explicit path (`git add
  .claude/skills/plan-create-prd/SKILL.md`) into this PR's commit; leave `agent-layer/gen-decisions.mjs` and
  the two epic docs alone — they are someone else's in-progress edits (shared worktree).
- **GOTCHA**: never `git add -A`. Re-check `git status` before every commit (parallel sessions share this tree).
- **VALIDATE**: `git diff --cached --stat` lists SKILL.md and nothing outside this plan's file list.
- **SATISFIES**: coherence of the `why` citation. If the owner says no (P1), reword the `why` to "the house
  shape's §Later, not never (pending in SKILL.md)" and drop this task.

### T11 · THE REAL RUN — `discovery/later-not-never-1/` (owner's hand, paid)

- **IMPLEMENT** — with T1–T10 committed on the branch:
  1. Zero-cost checks first: `node tooling/build-checks.mjs` green; `cd portal && node lib/discovery-transport.mjs --preflight`
     → "pre-flight ✓ all 8 rows pass, zero tokens" (this also fails fast on the owner's spend-limit 400 —
     memory: send them to Billing › Spend limits, never wait for the month).
  2. `ls discovery/later-not-never-1` → must not exist.
  3. Portal on a FRESH port from this branch: `cd portal && PORT=4791 node server.mjs & PID=$!`; `curl -s
     localhost:4791/api/health` answers; `curl -s localhost:4791/api/discovery/config | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);console.log(c.depths.find(d=>d.id==="full-discovery").count, c.questions.some(q=>q.id==="s4-parked-for-later"))})'`
     → `31 true` (observed as `31 true false` by calling `discoveryConfig()` directly on the rehearsed tree —
     the route serialises that object; the third value is the rubric proven off the wire). Stop with
     `kill $PID` afterwards — never a name-pattern kill.
  4. The drawer at `http://localhost:4791`: slug `later-not-never-1` · provenance **fictional** · entry **blank
     idea** · depth **Full discovery** (the proposal; confirm it) · **no preset, no facet box** (a declared
     all-false vector is the consumer preset, 16 questions — the vector must stay undeclared so the list is
     the unfaceted 31) · posture Think on the default model · Start.
  5. Thirty-one banked answers, one per turn, **no Park it, no Look it up, no Ask something else** — 32.6
     asserts the committed corpus holds zero off-script lines, and a first off-script package is a gate
     widening this ticket does not carry. Question 20 is `s4-parked-for-later`; the answer must be
     decision-grade by the rubric: a named parked item, a reason it is later rather than now, and what
     keeping it possible tells the build. If the agent flags it weak it is re-asked once; if the second
     answer is still flagged or parked, the section renders its `tbd` line and AC #7 is NOT met — delete the
     package before it is ever committed and re-run under `later-not-never-2`. Never edit it.
  6. Finish (sets `endedAt`). Then `node discovery/prd-projection.mjs later-not-never-1` →
     `prd ✓  later-not-never-1 → 12 sections, N ops (discovery/later-not-never-1/prd.md)`.
- **Who types:** the owner. The 31 answers are drafted by the session on the day into a scratch file OUTSIDE
  the repo (never into `answers.jsonl` — only the server writes that), flush left, no blockquotes, no
  indentation (memory: copy is never indented), and the owner pastes them (run 0 precedent, report lines
  228–229; the `fictional` label is what makes that honest). **The fictional product is decided here** so the
  31 answers cohere and question 20 cannot be improvised: a rota-and-consent tracker for a volunteer-run
  community fridge (surplus food collected from shops, logged, and handed out at fixed sessions). **Question
  20's answer is fixed now, decision-grade by the rubric** (a named item, a reason for later-not-now, what
  keeping it possible tells the build):

Saving for a later version, not refusing: scheduling the shop pickups inside the tool. Today the two shops phone the coordinator and a volunteer is texted; that works at two shops and breaks at five, but we have two, and the first version has to earn the volunteers' trust on the session rota before it asks the shops to change anything. Keeping it possible tells us to record every donation with its shop, its arrival time and the volunteer who collected it from day one, as a history rather than a single current state — so a scheduling view can be built later on top of the record without a migration, and so a shop that asks "when did you last collect from us" can be answered from the log. If the coordinator is still phoning the shops after the third month it moves up; if a shop refuses scheduled slots outright it becomes a non-goal with that reason.
- **Cost (expected):** 31 turns × $0.050–0.055 per turn = **$1.55–1.70**, derived from the two 30-turn
  sonnet baselines ($1.488 for `my-product-name`, $1.6355 for run 0; `allergen-matrix-1` was $1.683). ~40
  minutes wall clock (39 and 41 observed on the two 30-turn sittings).
- **VALIDATE**:
  ```bash
  grep -n -A3 "^## Later, not never" discovery/later-not-never-1/prd.md
  ```
  → `- seq N — What are you saving for a later version rather than refusing, … (see MVP)` (or the ladder
  heading of the level the agent chose) — NOT the `tbd` line; `grep -c "seq N " <(sed -n '/^## Non-goals/,/^## Later/p' discovery/later-not-never-1/prd.md)` → 0.
- **SATISFIES**: AC #7.
- **REGENERATES**: `discovery/later-not-never-1/prd.md` (the projection, above). See T12 for the cascade.

### T12 · UPDATE the carrier count and the README for the new package (with T11 only)

- **IMPLEMENT**: the new package is a sixth recording stamped with Think's current fingerprint
  (`7efdde37…`; observed carriers today: bracket-trace-1, bracket-trace-2, graded-think-a, instrument-loans-1
  on think + graded-opus-a on think-opus = 5). Case 30.46 asserts the derived count `=== 5` (line 7923) and
  its message says "the five discovery-postures.mjs's header states"; `discovery-postures.mjs:173` says "stamped
  on five recordings". Move all three to **six**. README: add `later-not-never-1/` to §Files ("the second
  FULL-DEPTH package — 31 of 31 answered, the first to walk `s4-parked-for-later` (#392)") and apply T7 step 5.
- **GOTCHA**: only with T11 done. If AC #7 is reported not met, leave the count at five.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓ all 34 groups pass`; 32.6's ✓ line
  reports eight packages swept (expected). Before this edit with the package in, the gate's ONLY red is
  `30.46: 6 recording(s) carry Think's two stamps, not the five discovery-postures.mjs's header states —
  think: bracket-trace-1 (12 turns), bracket-trace-2 (12 turns), graded-think-a (65 turns), …` (observed on
  the rehearsed tree by copying `bracket-trace-1` to a temporary eighth package with the current stamp and
  its own `prd.md`; 32.6 swept it clean — the cascade is exactly this one case).
- **REDDENS**: n/a (a literal moved).
- **SATISFIES**: AC #5 (fingerprints unmoved: group 32 green; the count moved for a stated reason), AC #6.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No suite, no linter (CLAUDE.md §Testing). The gate is `tooling/build-checks.mjs`; "done" = the groups you
touched print ✓ and the closing line reads `build ✓ all 34 groups pass`.

### Unit-level (in CI, SDK-free)

- Group 28: the count, the per-stage counts, the depth literal, case 10's outside-the-source list, the new
  position pin, case 13's unfaceted 31.
- Group 30 case 28: the unfaceted cursor total.
- Group 31: twelve distinct empties, the LATER/NON_GOAL disjointness and one-home rule, 31.17's render /
  no-leak / vanish, 31.13's battery over the new op, 31.7.2's empty run over twelve headings.
- Groups 32 and 33: the seven regenerated pages byte-equal to the projection.

### Integration

- `node discovery/prd-projection.mjs instrument-loans-1 --stdout` shows the new section in place (T4).
- The portal's config route reports `count: 31` for full discovery and holds the question (T11 step 3).

### Edge Cases

- A decision on the new question filed OFF-SCRIPT (naming it) must NOT render under Later, not never
  (`latestByQuestion` excludes `off_script: true` since #289). Covered by construction; if you add a fixture
  case for it, put it in 31.17 and reuse `s4-parked-for-later` with `off_script: true` on a shared turn.
- A run that never reaches question 20 renders the `tbd` line — 31.7.2 covers it; T11 step 5 says what to do.
- Two decisions on the question: the latest renders and names the earlier (`*Replaces:* seq N`) in its ladder
  block; the cross-ref names one seq. Not fixtured — Non-goals' identical rule is fixtured at 31.15.

### Proving the checks

Every REDDENS above was named against the exact `ok()` message it trips. Run T5's four mutations and T2's
three before trusting a green; T6's positive control is the `✗ parenting 32.5` you see before regenerating.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check discovery/bank.mjs && node --check discovery/prd-projection.mjs && node --check tooling/build-checks.mjs`

### Level 2: The gate
`node tooling/build-checks.mjs` → `build ✓ all 34 groups pass` (34 groups on `078c367`, observed).

### Level 3: The CI `verify` job's other halves
`node tooling/drift-check.mjs` (syntax-checks every tracked `.mjs`, `.claude/plans` included — park fragments
as `.txt`) and `node tooling/token-lint.mjs`. Neither reads `discovery/`; both observed green on the rehearsal
(`drift-check ✓ syntax · token-css · … · group-count`, `token-lint ✓ 63 contract tokens · 0 undeclared · 0
orphan`). **GOTCHA:** in a FRESH worktree drift-check fails first with `Style Dictionary build failed — if
node_modules is missing` (observed) — that is the missing `tooling/style-dictionary/node_modules`, not your
change; the main tree has it, a worktree needs `npm ci` there (memory: local-agent-visual-gate-notes).

### Level 4: Manual
T4's `--stdout` grep; T6's `numstat`; the portal smoke on a fresh port (T11 step 3), then `kill $PID`.

### Level 5: Owner-only
T11 and T12.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| T11 the real run (31 turns, sonnet, fictional, unfaceted full discovery) | $1.55–1.70 + ~40 min of the owner's hand; drafting answers is free | **No** — the code half ships; AC #7 is reported **not met** | open one before the PR (the ticket's own rule: not met, never waived) |
| T12 (30.46 count → 6, README package line) | none | no — only with T11 | same issue |
| T10 staging SKILL.md §9 | none | no | P1 |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — `s4-parked-for-later` carries `id · stage · text · attribution · label · weakAnswer` (and `note`); group 28's literals moved in the same PR; group 28 ✓.
- [ ] AC #2 — `selectDepth("whole-bank")` is the 65 byte for byte, `OPENING_SET` the twelve, the presets' counts unmoved (regulated 22 · b2b-saas 22 · internal-tool 28 · consumer 16, observed today) — observed by cases 4, 5 and 13, not argued.
- [ ] AC #3 — `SECTIONS.length === 12`; 31.17 renders the fixture decision under **Later, not never** by seq and NOT under Non-goals; deleting the op renders the row's `tbd`; 31.13 re-runs over the new op; every question-keyed cross-ref id has exactly one home.
- [ ] AC #4 (corrected, P2) — `git diff --numstat -- 'discovery/*/prd.md'` shows seven rows of `4	0` and nothing else; 32.5, 32.6 and 33.15 ✓.
- [ ] AC #5 — `POSTURES.think.fingerprint`, `POSTURES['think-opus'].fingerprint` and `POSTURES.grill.fingerprint` unmoved (their 30.46 literals untouched, group 32 ✓); `instrument-loans-1` not re-recorded. Two figures move, each stated: `POSTURES['create-prd'].fingerprint` (T4b — the section brief gained the new section; no recording carries it) and 30.46's think-carrier COUNT, 5 → 6, only with T11.
- [ ] AC #6 — `node tooling/build-checks.mjs` green; README §The PRD projection says twelve and carries the row; §The bank's width names the entry and 31; D1a amendment line present.
- [ ] AC #7 — `discovery/later-not-never-1/prd.md` carries the decision under the heading. If not run: **not met**, with the tracker.

---

## COMPLETION CHECKLIST

- [ ] T1–T10 in order, each VALIDATE observed
- [ ] The seven REDDENS mutations run and reverted
- [ ] `build ✓ all 34 groups pass` · drift-check ✓ · token-lint ✓
- [ ] Portal smoke on a fresh port, then killed by PID
- [ ] T11/T12 done, or AC #7 reported not met with an issue number
- [ ] Commit message: `feat(discovery): later, not never — a parked-scope question in the bank and its own projected section (#392)`; PR body `Closes #392`; plan, report and review in the PR

---

## DECISIONS (formerly open questions) — none block execution

Every question the first draft left open is decided below (P-codes, so they never collide with the bank's D1–D8 or the architecture doc's D1a); the owner overrides any of them by editing the
named task before `piv-implement` runs, not during.

- **P1 — SKILL.md §9 lands in this PR (T10).** The ticket cites the skill's §Later, not never as the house
  shape, that edit is uncommitted in the working tree, and the new `SECTIONS` row's `why` cites it. It is
  staged by explicit path; the three unrelated modified files beside it are not touched.
- **P2 — AC #4 is rewritten, not waived.** Committed `prd.md` files ARE byte-compared in CI (32.5, 32.6c, 33.15;
  observed red, eleven failures, on the rehearsal before regeneration) and a `SECTIONS` row always renders
  its heading (31.3, 31.7.2 require it). All seven are regenerated with `--force`, all seven are byte-identical
  to the projection today so no hand edit exists to lose, and the diff is exactly `4 0` per file (observed).
- **P3 — the attribution quotes what the primary source says.** No "Future considerations" section exists;
  the deferral wording is the Key Features guidance, quoted verbatim in `attribution`. The ticket's phrasing
  came from the uncitable re-share and is not used.
- **P4 — position 20, budget 31, no swap, the faceted path untouched.** A swap would drop a question every
  earlier full-discovery recording answered; appending last would make those recordings read unfinished
  (F3). Both are pinned by gate (T2) and both pins were observed to redden (M5).
- **P5 — the session drafts the 31 answers on the day; the owner pastes; question 20 is written now.** See
  T11 "Who types". The plan never writes a package file.
- **P6 — the Create-PRD section brief gains the line (T4b).** The brief is the projection's map by design and
  would otherwise omit a section the projection renders, which case 31 cannot see. The stamp moves to
  `ea523ac1e8eaef1ac1208e108f8b640e` (observed) and nothing recorded carries it.
- **P7 — if the owner does not run T11, AC #7 is reported NOT MET** with an issue opened before the PR,
  naming this plan's T11 as the one-session path. Never waived, never simulated.

## NOTES (open canvas)

### Pre-flight — what ran, what it said, what changed

- `gh issue view 392 / 279`; `gh pr view 386` → **merged 2026-09-11 09:25Z**, `origin/main = 078c367`. The plan
  was started against `4f2e859` and re-based on the merge: group 31 is now at 8262–8806 (was 7833–8272),
  group 28 at 5222–5553, and 32.6's corpus sweep exists. Every line number above is at `078c367`;
  `git diff HEAD origin/main --stat` over the cited dirs is empty.
- Read in full: `bank.mjs` header + stage 3/4 entries + `DEPTHS`/`MODULES`/`facetPlan`/`selectDepth`;
  `prd-projection.mjs` helpers, `SECTIONS`, `renderNonGoals`, `RENDERERS`, `projectPrd`, the CLI;
  build-checks 28 (cases 1–10, 12–13), 30 (7221, 30.46), 31 (fixture, 31.1–31.3, 31.7, 31.13, 31.15, 31.16),
  32 (32.2a–32.7), 33.15; `discovery.mjs` `deriveCursor`/`sessionView`/`discoveryConfig`/`assertRunSlug`;
  `discovery-postures.mjs` `FINGERPRINT_INPUTS`/`fingerprintOf`; `discovery-score.mjs` CLI; README §Files,
  §The bank's width, §The PRD projection, §The full-depth run, §Workflow; the D1a doc; gates.md 45/51.
- **F1 (ticket premise wrong):** "nothing drift-checks committed prd.md" is false — 32.5 (instrument-loans-1),
  33.15 (the two graded) and, since this morning's #386, 32.6(c) (every committed package) byte-compare
  `prd.md` to `projectPrd(readPackage())`. → T6, P2. #289 avoided this by making its block CONDITIONAL; a
  section cannot be.
- **F2 (source):** fetched the Coda page and the template subpage (both 307 → docs.superhuman.com). No
  "Future considerations" heading; the deferral wording lives in Key Features. → attribution rewritten, P3.
- **F3 (placement):** `deriveCursor` = last closer's position + 1 (`discovery.mjs:647-658`). allergen-matrix-1's
  last closer is `s9-strength-of-evidence`; if the new id were appended last, that package reads `done:
  false`. Inserting before it keeps `done: true`. → T1 step 4, the position pin in T2.
- **F4 (cascade):** 30.46 derives Think's carrier count from disk and pins it `=== 5` (7923). A sixth think
  recording reds it. Observed carriers via a node one-liner over `discovery/*/run.json`. → T12.
- **F5 (corpus):** 32.6 asserts `sweptExchanges === 0 && sweptOffScript === 0` over every committed package.
  → T11 step 5: no affordance control in the run.
- **F6 (fixture ref):** 31.16 pushes `a11` as its synthetic aside; a fixture `a11` would double the ref. → `a12`.
- **F7 (case-10 order):** `outside` follows `QUESTIONS` order; the entry sits before the D7 block, so
  `[...ADDED_392, ...ADDED_283]`. Placing it after the block would need a spliced literal.
- **F8 (fingerprint):** the bank is not a fingerprint input (fixed `fp-question`), so AC #5 holds by reading,
  and group 32 observes it.
- **F9 (drawer literal):** `grep -rn "thirty|30 questions|~30|eleven" portal/public/` → one comment at
  `portal.js:684`, no rendered literal; the count comes from `discoveryConfig().depths[].count`.
- **F10 (source-absence):** `grep -c "a wish list. A parked item wit" docs/research/question-bank-source.md`
  → 0 (the source has "a wish list" elsewhere; the 30-char pin does not match). Case 9's D7 loop extends.
- **F11 (arithmetic at 31):** pairs max 12 + 4 + 7 + 6 = 29 ≤ 31; triples min 12 + 4 + 6 + 6 + 6 = 34 > 31. Ten
  fitting pairs and sixteen overflowing vectors unchanged; case 15's `want` reads the constant.
- **F12 (a second stamp moves):** `discovery-postures.mjs:81` imports `SECTIONS`, `NON_GOAL_QUESTIONS` and
  `METRIC_STAGE` from the projection and `sectionBrief()` (442–451) puts a section map into Create-PRD's
  SYSTEM prompt. The ladder-only filter means the new cross-ref row does not move it by itself — but the
  brief's whole job is to be the projection's map, so T4b adds the line and re-pins
  `POSTURES["create-prd"].fingerprint` (today `f0e7599c…`, observed by importing the module SDK-free). Group 30
  case 31 (7363) gains the clause. Think/Think-on-Opus/Grill are untouched: case 31 asserts they carry no
  brief. → P6.
- **Presets today** (observed): regulated 22 · b2b-saas 22 · internal-tool 28 · consumer 16. The first draft
  of AC #2 typed 22 for internal-tool; the figure is now the observed one.
- **Build-checks today** (observed): `build ✓  all 34 groups pass` on `078c367`.
- **F13 (found by the rehearsal):** the first 31.17 dereferenced `later.seq` after its vacuity `ok()` failed,
  so M4 produced `TypeError: Cannot read properties of undefined (reading 'seq')` and the group died
  instead of failing by name. Fixed in the plan's text (the `later?.seq === 14` guard gating the block); M4
  re-driven → the named message and nothing else.

### Spike — the code half, rehearsed on a throwaway worktree (2026-09-11)

`git worktree add --detach <scratch>/wt392 078c367` · gate green there before any edit · the plan's edits
applied by an exact-anchor script (every anchor matched exactly once — 3 in `bank.mjs`, 4 in
`prd-projection.mjs`, 2 in `discovery-postures.mjs`, 17 in `build-checks.mjs`) · then:

| Step | Observed |
|---|---|
| Gate after stage 1 (no re-pin, no regen) | `build bank ✓`, `build prd projection ✓`, `build discovery ✗ 1` (30.46 create-prd), `build parenting ✗ 8` (32.5 + 32.6 ×7), `build graded fixture ✗ 2` (33.15 ×2) — eleven reds, all predicted, nothing else |
| Create-PRD stamp with the brief line | `ea523ac1e8eaef1ac1208e108f8b640e` |
| Regeneration | seven `prd ✓ … → 12 sections`; `git diff --numstat` seven rows of `4	0` |
| Gate after stage 2 | `build ✓  all 34 groups pass` |
| drift-check · token-lint | ✓ · ✓ (drift-check needed `tooling/style-dictionary/node_modules` linked in the fresh worktree) |
| M1 renderer aimed at NON_GOAL_QUESTIONS | `31.17: Later, not never does not name seq 14 …` + "renders more than one row" + the vanishing check |
| M2 id added to NON_GOAL_QUESTIONS | `a LATER question is also a NON_GOAL question …` + `named by 2 cross-ref row(s)` |
| M3 helper returns `""` | `… renders "", not its declared empty` |
| M4 fixture op deleted | first draft: `TypeError` (F13); after the guard: `… at seq 14 (got none) — the case below is then vacuous` only |
| M5 id moved last in the depth list | `full-discovery drifted …` + `sits at 30 of 31 — … never be LAST` |
| M6 brief line removed | `case 31: … the parked-scope question …` + `30.46: Create-PRD's stamp is f0e7599c…` |
| M7 one regeneration skipped | `32.6: discovery/bracket-trace-1/prd.md is no longer the projection's bytes` |
| Tree after every mutation | `git status --porcelain` empty |

The worktree was removed and pruned; the two throwaway commits are unreachable. The diff between `078c367`
and the rehearsal's final tree is `.claude/plans/discovery-later-not-never-392.code.patch`
(`git apply --check` passes against the main tree, observed). It carries the code and the seven regenerated
pages; it does NOT carry T7–T9, T10, the `bank.mjs` header (D8), or the "eleven → twelve" / "75 → 76" summary
and header strings — those are prose and are done by hand from the tasks.

### Confidence — 10/10 on the code half, and why

Every task that edits code was applied and observed green; every REDDENS was driven and its message read
back; the one defect the rehearsal found (F13) is fixed in the plan's own text; every count and hex the
implementer must type is an observed value, not a derivation. The only half the plan cannot observe in
advance is the owner's paid session (T11), and it is gated by a zero-cost preflight, a decided product, a
pre-written decision-grade answer for the one question that matters, and a stated fallback (D7) that keeps
the PR honest without it.
- Traps carried from memory: port-scoped kill (T11); copy never indented (T11); SDK error result wears
  success (the transport already refuses it — no recorder is written here); spend-limit 400 → Billing;
  shared worktree → stage by explicit path (T10); drift-check syntax-checks parked `.mjs` (Level 3).

### Alternatives weighed

- **A separate `renderLater` copy** instead of `crossRefByQuestion`: rejected — eight duplicated lines and two
  places for the by-seq rule to drift. The refactor's cost is one observation (T6's `4 0`).
- **A conditional section** (render the heading only when a decision exists): rejected — 31.3 and 31.7.2 pin
  the heading list to `SECTIONS`, and a section that appears and disappears is the invented-structure failure
  the injection battery exists to catch.
- **Budget held at 30 with a swap:** rejected (P4).
- **Faceted placement now** (e.g. in `replacesAProcess`): rejected — #291/#292 are pre-registered "unchanged".

### Data flow, one line

drawer → `answers.jsonl` (a20, verbatim) → agent files `record_decision{question_id: s4-parked-for-later}`
→ `transcript.jsonl` op line → `projectPrd`: `latestByQuestion.get("s4-parked-for-later")` →
`crossRefByQuestion(LATER_QUESTIONS)` → `## Later, not never` · `- seq N — <question> (see MVP)`.

## AMENDMENTS

- **2026-09-11 (implementation) — THE BASE MOVED: `078c367` → `73c49dd`.** Two PRs merged after the plan was
  written: #381 (#366, the re-ask brief reaching Think) and #391 (#387, the security gate). What that costs
  the plan, all observed on `73c49dd`:
  - **Every `tooling/build-checks.mjs` line number in the plan is stale** (the file grew 10134 → 10153 lines,
    net +19). Example: the create-prd stamp pin the plan cites at 7933 is at **7952**; group 30 case 28's
    `cursor.total === 30` at 7221 is at **7240**. Every citation below was re-resolved BY CONTENT (a
    `grep -c` of exactly 1 per anchor) before editing, not by number.
  - **`portal/lib/discovery-postures.mjs` moved ~94 lines** (#366/#381 header rewrite + `reaskBrief` joining
    `buildThinkTurn`'s slot). T4b's anchors were re-resolved by content the same way.
  - **`.claude/references/gates.md` gained the security-gate section** (+32 lines); T9's lines 45/51 are stale
    and were re-resolved by content.
  - **The rehearsed patch still applies with a plain `git apply`** (observed, `git apply --check` silent, no
    3-way needed) — #366/#381/#387 touched no region #392 touches.
  - **`POSTURES["create-prd"].fingerprint` is UNMOVED at `f0e7599c7bc953b74ff3750dceca5061`** on the new base
    (observed by importing the module; the pin at `build-checks.mjs:7952` still carries that literal). So
    T4b's "before" value stands and its re-pin instruction is still correct as written.
  - **T1's pre-flight one-liner printed the plan's exact expected "before" string** on the new base:
    `undefined undefined false 75 30 -1 18 30 65 22 [ 'internal' ]` (observed). The bank half is untouched by
    the merges.
  - **The gate is green on the new base before any edit**: `build ✓  all 34 groups pass` (observed).
- **2026-09-11 (implementation) — branch name.** `feature/discovery-later-not-never-392`, not the plan's
  `feat/392-later-not-never`: every other branch in this repo uses the `feature/` prefix and the only
  CI-special pattern is `feature/v3-*` (`.github/workflows/verify.yml:108`).
- **2026-09-11 (implementation) — three stale untracked files removed to switch branches.** The shared tree
  held untracked copies of `.claude/code-reviews/pr-381-review.md`, `.claude/code-reviews/pr-391-review.md`
  (both byte-identical to `origin/main`, observed by `git hash-object`) and `.claude/plans/security-gate-387.md`
  (an OLDER pre-amendment copy — 19 diff lines, the committed one carries six amendments the local one does
  not). All three are tracked on `origin/main`, so the checkout restored them; the differing one was backed up
  to the session scratchpad first (`preexisting-untracked/security-gate-387.local.md`).

