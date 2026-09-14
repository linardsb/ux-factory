# Feature: plan-create-prd house shape — confirm #392's scope, reconcile the nine epic PRDs (#396)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you
start implementing. Pay special attention to exact line numbers — the nine PRDs are prose, and every edit here is
anchored to a line that was read this session (2026-09-14, `origin/main` at `d0e65fa`).

## Feature Description

Ticket #396 is a decision ticket raised as F4 of the PR #394 review. Commit `a667b39` (#392) changed
`.claude/skills/plan-create-prd/SKILL.md` in three ways and disclosed one. The two undisclosed changes are a required
one-line **status header** with a "replace its TBD in place" rule, and **non-goals with reasons**. The ticket asks for
three decisions and "whatever follow-up it implies". This plan records the recommended decisions, plans the follow-up
under them, and leaves each decision where the owner can strike it in review.

The follow-up has three parts:

1. **Make the status-header rule executable.** The skill says "each later step replaces its TBD in place", but neither
   `plan-architecture` nor `piv-slice-epic` mentions the header (observed: `grep -n Status` on both is empty). The rule
   has no executor, which is exactly how `st-ux-fusion.prd.md:3` came to read `architecture TBD` while its architecture
   doc has said `Decided: 2026-08-07` since the day it landed. The fix is one grammar sentence in `plan-create-prd`
   and one write-back line in each of the other two skills.
2. **Migrate all nine `docs/epics/*.prd.md` to the canonical header**, each field sourced from git or GitHub, never
   invented. Today five carry a header in three spellings and four carry none.
3. **Give the three OPEN epics a `## Later, not never` section** by re-filing bullets they already carry under
   another name — verbatim moves, no new content. The six closed epics are historical records and are not touched.

## User Story

As the owner reading `docs/epics/`
I want every PRD to open with the same one-line ladder position (grilled · architecture · sliced · closed)
So that I can see where each epic stands without reading it, and trust the line because the skills that move an
epic up the ladder are the ones that rewrite it.

## Problem Statement

`plan-create-prd` now specifies a header form and a §9 that nothing on disk conforms to. Five headers spell status
three ways; four PRDs have none; one is stale-false; zero carry §*Later, not never* while `discovery/prd-projection.mjs`
renders that section for every discovery package and cites the skill as its house shape (`:3`, `:75`, `:248`). The
PR #394 review could not tell whether the header and non-goals-with-reasons edits were intended scope.

## Solution Statement

Confirm the #392 edits stand (they are coherent, same-session, and codify five existing headers). Extend the skill's
grammar by one sentence so the later rungs have a spelling. Add the write-back step to the two skills that move the
ladder. Migrate nine headers from sourced facts. Re-file already-written parked items in the three open epics. No
gate, no generator, no shipped page.

## Out of Scope / Non-Goals

- **Not writing reasons onto existing non-goals.** A reason is the owner's decision; an agent writing one makes the
  PRD assert something the owner never said (memory `honesty-contract-mirror-direction`). Bullets with no reason stay.
- **Not inventing parked items.** §*Later, not never* is added only where a PRD already carries parked items under
  another name. The six closed epics get no §9 — "none" would be an agent's claim about the owner's intent.
- **Not adding a build-checks group.** A gate can check the header's FORM, not its TRUTH (it cannot ask GitHub whether
  the epic closed), and form was never the failure: `st-ux-fusion` was well-formed and false. Adding a group also
  moves five pinned copies of "34" (`build-checks.mjs:4`, `:10257`, `CLAUDE.md:110`, `:178`, `gates.md:11`) plus
  drift-check's `group-count` (observed in its ✓ line). Not worth it for nine prose lines. The regex in Task 5 is the
  operator's check, run by hand.
- **Not touching the sibling session's uncommitted edits** (`docs/epics/discovery-partner.prd.md` +19,
  `.architecture.md` +8/−3, `agent-layer/gen-decisions.mjs` +1 — a 2026-09-02 amendment that has sat unstaged since
  at least #392's plan on 2026-09-11). See Q4.
- **Not changing the frozen fixture** `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` (md5-pinned
  by build-checks 28.9). The PRD beside it is a fence KEY by path only — content edits are safe (observed: no gate
  reads its bytes; `run-2-ready.mjs:55,119` names the path only).
- **Not touching `discovery/prd-projection.mjs`** — its §9 stays §9; the citations in prose stay true.

## Feature Metadata

**Feature Type**: Documentation / process (skills + epic docs)
**Estimated Complexity**: Low (many small, exact edits; zero code)
**Primary Systems Affected**: `.claude/skills/{plan-create-prd,plan-architecture,piv-slice-epic}/SKILL.md`,
`docs/epics/*.prd.md` (nine files)
**Dependencies**: none

## Related Work

**Implements**: [#396](https://github.com/linardsb/ux-factory/issues/396) · **Epic**: none (a process ticket raised
from PR #394's review; touches epic #279's PRD among the nine)

**Back-references**:

- `.claude/plans/discovery-later-not-never-392.md` — P1 and T10: the skill file was staged into #392 by explicit path
  because the `SECTIONS` row's `why` cites it. This plan closes the loop P1 left open.
- `.claude/code-reviews/pr-394-review.md` §F4 — the finding this ticket is.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/skills/plan-create-prd/SKILL.md` (lines 105–112) — the status-header sentence to extend; (lines 122–127)
  §8/§9 as landed. Why: Task 1 edits line 108–110 and nothing else.
- `.claude/skills/plan-architecture/SKILL.md` (lines 108–114) — the three "where the architecture lives" options; the
  first edits the PRD's `## Architecture` placeholder. Why: Task 2 adds the header write-back beside that edit.
- `.claude/skills/piv-slice-epic/SKILL.md` (lines 78–82) — `gh issue create … --body-file <path-to-prd>` then "Capture
  the epic issue number … Call it `$EPIC`." Why: Task 3 adds the `sliced:` write-back right after `$EPIC` exists.
- `docs/epics/*.prd.md` line 1–5 of each — the nine header regions; exact current text in the NOTES table. Why: Task 4.
- `docs/epics/discovery-partner.prd.md` lines 369–381 (§Non-goals, six bullets), 407 (`## Open questions`), 459
  (`## Amendments`). Why: Task 6.
- `docs/epics/canvas-design-import.prd.md` lines 183–197 (§Non-goals, thirteen bullets), 199 (`## Open questions`),
  252–258 (`## Architecture`, the file's last section). Why: Task 7.
- `docs/epics/handoff-seam.prd.md` lines 72–74 (`### Later, not sliced`, two bullets, inside §MVP), 89–93
  (`## Non-goals`, three bullets), 95 (`## Open questions`), 100–102 (`## Constraints carried`, last section). Why: Task 8.
- `discovery/README.md` lines 397–398 — "the house shape's §9". Why: confirms §9 must stay §9 (it does).
- `.claude/plans/discovery-later-not-never-392.md` lines 581–592, 756–758 — T10 and P1. Why: the PR body cites them.

### New Files to Create

- `.claude/reports/prd-house-shape-396-report.md` — the implementation report (rides in the PR per CLAUDE.md §Git).
- (no code files)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `CLAUDE.md` §Ground rules → **Git** ("A ticket's plan, report and review belong in the same PR"; "Closes #N in the
  body") and **Honesty contract** (never write anything presented as the owner's or the agent's).
- `.claude/references/gates.md` lines 5–11 — which gates run in CI. None reads `docs/epics/*.prd.md` bytes except the
  md5-pinned fixture (28.9), which this plan does not touch.
- Memory `shared-worktree-parallel-sessions` — the working tree is shared and dirty; this ticket runs in its own
  worktree (Task 0).
- Memory `piv-skills-python-tuned` — run `piv-validate` even on docs-only PRs (owner, 2026-09-03).
- Memory `copy-never-indented` — the header lines and the amendment entries are flush-left, no blockquotes.

### Patterns to Follow

**The canonical header** (the skill's line 109, extended by Task 1):

```
**Status:** intent · grilled <date> · architecture: TBD · sliced: TBD · **Created:** <date>
```

Ladder rungs after Task 1: `architecture: TBD | decided <date> | folded <date>` · `sliced: TBD | #<epic> <date>` ·
optional trailing `· closed <date>` before `**Created:**` · `grilled <date>` omitted, never invented, on a PRD with no
grill on record. The separator is ` · ` (U+00B7, spaces both sides) — copy it from an existing header, do not type a
hyphen.

**The regex that states the grammar once** (POSIX ERE; proven both ways in NOTES):

```
^\*\*Status:\*\* intent( · grilled [0-9]{4}-[0-9]{2}-[0-9]{2})? · architecture: (TBD|decided [0-9]{4}-[0-9]{2}-[0-9]{2}|folded [0-9]{4}-[0-9]{2}-[0-9]{2}) · sliced: (TBD|#[0-9]+ [0-9]{4}-[0-9]{2}-[0-9]{2})( · closed [0-9]{4}-[0-9]{2}-[0-9]{2})? · \*\*Created:\*\* [0-9]{4}-[0-9]{2}-[0-9]{2}$
```

**An amendment entry** (mirror `docs/epics/discovery-partner.prd.md:461`): a bold lead sentence carrying the date and
what changed, then plain prose saying what did NOT change. Flush-left, one paragraph.

**Header position**: line 3, directly under the H1 and one blank line; the next line after it is blank. Every PRD
that has a header today has it at line 3 (observed).

**Staging**: by explicit path, never `git add -A` (`.claude/plans/discovery-later-not-never-392.md:587`).

---

## IMPLEMENTATION PLAN

### Phase 0: The decisions (owner)

The ticket's three checkboxes. This plan proceeds under the recommended answers; the owner confirms by merging or
strikes one in review. See OPEN QUESTIONS D1–D3.

### Phase 1: The rule gets an executor (skills)

Tasks 1–3. Three skill files, one sentence or one step each.

### Phase 2: The nine headers

**Depends on:** Task 1 (the grammar the headers conform to).
Tasks 4–5. Nine one-line edits from the sourced table, then the regex over all nine.

### Phase 3: Later, not never on the open epics

**Independent of:** Phase 2 (different lines of the same files; do them in the same commit to avoid two touches).
Tasks 6–8. Droppable as a unit if the owner answers D3 "new PRDs only".

### Phase 4: Validation, report, PR

Tasks 9–10.

---

## STEP-BY-STEP TASKS

### Task 0 · CREATE a worktree off `origin/main`

- **IMPLEMENT**: `git fetch origin && git worktree add ../ux-factory-wt-396 -b docs/prd-house-shape-396 origin/main`
  and do all work there. The shared tree carries a sibling session's unstaged edits to two of the nine files
  (`git diff --stat` observed: `discovery-partner.prd.md | 19 +`, `.architecture.md | 8 ±`, `gen-decisions.mjs | 1 +`);
  editing those files in place would drag those hunks into this PR.
- **GOTCHA**: memory `shared-worktree-parallel-sessions`. Put the worktree under `/Users`, not `/private/tmp`.
- **VALIDATE**: `cd ../ux-factory-wt-396 && git status --porcelain | wc -l` → `0`, `git log -1 --format=%h` → `d0e65fa` (expected — main's head today; a newer head is fine, re-read the nine line-3s if so).
- **SATISFIES**: hygiene for every AC.
- **REGENERATES**: none.

### Task 1 · UPDATE `.claude/skills/plan-create-prd/SKILL.md` — the ladder's later rungs

- **IMPLEMENT**: replace the sentence at lines 108–110 (verbatim today):

  ```
  Open with a one-line **status header** so a reader knows where the
  doc is on the ladder without reading it: `**Status:** intent · grilled <date> · architecture: TBD · sliced: TBD ·
  **Created:** <date>` — each later step (`plan-architecture`, `piv-slice-epic`, shipped) replaces its TBD in place.
  ```

  with the same sentence plus the rung spellings, so the migration and every future write-back share one grammar:

  ```
  Open with a one-line **status header** so a reader knows where the
  doc is on the ladder without reading it: `**Status:** intent · grilled <date> · architecture: TBD · sliced: TBD ·
  **Created:** <date>` — each later step replaces its TBD in place: `plan-architecture` writes `architecture: decided
  <date>` (`folded <date>` when it chose the folded option), `piv-slice-epic` writes `sliced: #<epic> <date>`, and
  closing the epic issue appends `· closed <date>` before **Created**. Nothing else goes in the header — inputs,
  owners and ticket ranges live in the body. A PRD written before this rule with no grill on record omits the
  `grilled` slot rather than inventing a date.
  ```

  Keep the paragraph's next sentence ("Then the product sections only, scannable:") and everything else untouched.
- **PATTERN**: the skill's own anti-fluff rule at line 26 ("Unknown → write TBD — needs validation") — the "omit, never
  invent" clause is that rule applied to the header.
- **GOTCHA**: the frontmatter `description:` (line 3) already says "non-goals with reasons · later-not-never" — do not
  touch it. No gate reads this file (observed: `grep -rn plan-create-prd tooling/ portal/lib/ discovery/*.mjs` hits
  only two prose comments in `prd-projection.mjs`).
- **VALIDATE**: `grep -c 'folded <date>' .claude/skills/plan-create-prd/SKILL.md` → `1`; `grep -c 'omits the' .claude/skills/plan-create-prd/SKILL.md` → `1` (expected — text this task creates).
- **SATISFIES**: AC #2 (the canonical form has a spelling for every rung the nine PRDs need).
- **REGENERATES**: none (`gen-loc-summary.mjs:22-26` counts `system/`, root/proto html and `agent-layer/` only — observed).

### Task 2 · UPDATE `.claude/skills/plan-architecture/SKILL.md` — the `architecture:` write-back

- **IMPLEMENT**: in the first option bullet (lines 108–111, "A separate linked doc in the repo"), after
  "`Architecture: [<slug>.architecture.md](./<slug>.architecture.md)`)" and before "Two clean, linked sources.", add:
  "and replace `architecture: TBD` in the PRD's status header with `decided <date>`". In the second bullet
  ("Folded into the PRD/epic", line 112–113) append: " Set the header's slot to `architecture: folded <date>`."
- **PATTERN**: the bullet already tells the skill to edit the PRD's `## Architecture` placeholder — the header edit is
  the same touch, one line higher.
- **VALIDATE**: `grep -c 'architecture: TBD' .claude/skills/plan-architecture/SKILL.md` → `1`; `grep -c 'folded <date>' .claude/skills/plan-architecture/SKILL.md` → `1` (expected).
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

### Task 3 · UPDATE `.claude/skills/piv-slice-epic/SKILL.md` — the `sliced:` write-back

- **IMPLEMENT**: after line 82 ("Capture the epic issue number from the URL it prints. Call it `$EPIC`."), add one
  paragraph: "Then replace `sliced: TBD` in the PRD's status header (line 3) with `#$EPIC <today>` and include that
  edit in the ticket-creation commit — the header is the doc's ladder position, and this is the step that moves it."
- **GOTCHA**: the issue body was created from the PRD one line earlier and will carry `sliced: TBD` forever; the file
  is the source of truth (line 106–107 already says so), so do not add a `gh issue edit` for it.
- **VALIDATE**: `grep -c 'sliced: TBD' .claude/skills/piv-slice-epic/SKILL.md` → `1` (expected).
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

### Task 4 · UPDATE the nine `docs/epics/*.prd.md` headers

- **IMPLEMENT**: apply the NOTES §"The nine headers" table exactly — it gives, per file, the current line-3 text, the
  replacement, and the source of every date. Two files (`ai-first-ux-factory`, `portfolio-v3-experience`) have no
  header: INSERT the header as a new line 3 followed by a blank line, pushing the vision line to line 5. Two files
  carry extra facts on the status line that move rather than vanish: `generative-prototyper` (prefix line 4 with
  `**Sequenced:** after #73 · `) and `st-ux-fusion` (line 3 becomes two lines — the header, then
  `**Research:** \`.claude/plans/st-ux-fusion-epic-research.md\` (7 books/docs + 8 Center Centre articles + owner Q&A synthesis).`).
  `canvas-design-import` drops "(G1–G33 below, all resolved)" and "26 tickets #296–#321" (both live in its §Open
  questions and in epic #295); `handoff-seam`, `prototype-studio` and `prototyping-feel-uplift` drop
  `**Owner:** Linards Berzins` (a solo repo; the git author carries it). Lines 4+ (`**Inputs.**`, `**Architecture:**`,
  `**Supersedes:**`, `**This file carries…**`) stay.
- **GOTCHA**: `discovery-partner.prd.md` keeps `**Created:** 2026-08-26` (its own record; git's first commit is
  08-27). `portfolio-v3-experience` and `generative-prototyper` were committed AFTER their epic issues were created
  from them — `Created` uses the issue's `createdAt` (the PRD body demonstrably existed that day), not the batch
  commit date. Every date in the table is one of: a `git log --follow --diff-filter=A` date, a date the file itself
  states, or `gh issue view <n> --json createdAt,closedAt`. Do not add any other.
- **VALIDATE**: `for f in docs/epics/*.prd.md; do sed -n 3p "$f" | grep -qE "$RE" || echo "FAIL $f"; done` with `RE`
  from Patterns → prints nothing (expected). Observed on `origin/main` today: prints nine `FAIL` lines — the positive
  control.
- **REDDENS**: delete ` · sliced: #202 2026-08-03` from `prototype-studio.prd.md:3` → `FAIL docs/epics/prototype-studio.prd.md` (the regex was driven with that mutation this session: `0` matches).
- **SATISFIES**: AC #2.
- **REGENERATES**: none. Docs are outside loc-summary's three groups; no shipped page renders `docs/epics/`; VR
  baselines untouched.

### Task 5 · UPDATE `docs/epics/discovery-partner.prd.md` — §Later, not never (Phase 3, D3)

- **IMPLEMENT**: move three bullets verbatim out of `## Non-goals` (lines 369–381) into a new section inserted
  directly before `## Open questions` (line 407):

  ```
  ## Later, not never

  - **No quality-attribute enforcement.** The non-functional block elicits and records; nothing in this epic
    wires an elicited answer into build-checks. That connection is a later epic.
  - **No canvas work.** D6's free-flow canvas is a later epic. The 12×8 grid, spans-not-px and
    `prototype-studio.prd.md` §Non-goals stand unamended.
  - **No component import.** D7's spec-first draft-then-ratify path and its ≤10-minute target are a later
    epic. The vocabulary is unchanged.
  ```

  §Non-goals keeps its other three bullets (CLI parity · global `think` · guest deployment). Append to `## Amendments`
  (after the last entry; see Q4 for the sibling's pending entry at the same spot):

  ```
  **2026-09-14 — §Later, not never added per the house shape (#396); three parked items re-filed from §Non-goals
  verbatim.** Each of the three names a later epic as its home — the skill's own test for parked rather than refused.
  Nothing was refused or unrefused; the three non-goals that remain stand as written, and D6/D7's later epic is now
  [canvas-design-import.prd.md](./canvas-design-import.prd.md) (#295).
  ```

- **PATTERN**: the parked-vs-refused test is the skill's §9 text (line 124–126): "a non-goal is refused with a reason;
  a parked item is deferred". The mechanical rule used here: a bullet that NAMES a later increment as its home
  ("a later epic", "the guest epic", "its own epic", "wave 3", "arrive with D20", "wired later") is parked.
- **GOTCHA**: the frozen pre-grill fixture beside this file is md5-pinned (28.9) — never open it. This file is run 2's
  fence KEY by path only; its bytes are read by no gate (observed). The sibling session's unstaged +19 lines touch
  lines 364–367 and append to §Amendments — this task's Amendments entry will conflict at EOF when the sibling
  commits; resolve by keeping both in date order.
- **VALIDATE**: `grep -c '^## Later, not never' docs/epics/discovery-partner.prd.md` → `1`; `awk '/^## Non-goals/{p=1;next} p&&/^## /{exit} p&&/^- /' docs/epics/discovery-partner.prd.md | wc -l` → `3` (expected; observed today `6`).
- **SATISFIES**: AC #4.
- **REGENERATES**: none.

### Task 6 · UPDATE `docs/epics/canvas-design-import.prd.md` — §Later, not never (Phase 3, D3)

- **IMPLEMENT**: move five bullets verbatim from `## Non-goals` (lines 183–197) into a new `## Later, not never`
  inserted before `## Open questions` (line 199): **No write direction** ("wave 3 with its own decision") · **No guest
  deployment** ("The guest epic") · **No native platform conventions module** ("arrive with D20") · **No a11y gating
  work** ("its own epic") · **No quality-attribute enforcement** ("wired later"). Eight bullets stay, including
  "No new shipped-page surface" ("later, or never" names no home) and "No hallway round" ("dropped on purpose").
  Add `## Amendments` as the file's last section (after `## Architecture`, mirroring discovery-partner's placement)
  with one entry on the Task 5 pattern: date, what moved, the naming test, "nothing refused or unrefused".
- **VALIDATE**: `grep -c '^## Later, not never' docs/epics/canvas-design-import.prd.md` → `1`; the Non-goals bullet
  count via the Task 5 awk → `8` (expected; observed today `13`).
- **SATISFIES**: AC #4.
- **REGENERATES**: none.

### Task 7 · UPDATE `docs/epics/handoff-seam.prd.md` — rename and move `### Later, not sliced` (Phase 3, D3)

- **IMPLEMENT**: cut lines 72–74 (`### Later, not sliced` + two bullets) out of §MVP; insert `## Later, not never`
  with the same two bullets verbatim directly before `## Open questions` (line 95, after §Non-goals). Add
  `## Amendments` as the last section with one entry: the heading renamed to the house shape's §9 wording and moved
  beside Non-goals; both bullets verbatim.
- **GOTCHA**: this file's `**Status:**` line also changes in Task 4 — one commit, one touch.
- **VALIDATE**: `grep -c 'Later, not sliced' docs/epics/handoff-seam.prd.md` → `0`; `grep -c '^## Later, not never' docs/epics/handoff-seam.prd.md` → `1` (expected).
- **SATISFIES**: AC #4.
- **REGENERATES**: none.

### Task 8 · RUN the gates and the smoke

- **IMPLEMENT**: `node tooling/drift-check.mjs && node tooling/build-checks.mjs && node tooling/token-lint.mjs`, then
  the portal smoke on a private port (`cd portal && PORT=4799 node server.mjs &` → `curl -s 127.0.0.1:4799/api/health`,
  then kill BY PID — memory `portal-smoke-port-scoped-kill`).
- **VALIDATE**: `drift-check ✓`, `build ✓  all 34 groups pass`, token-lint clean, `/api/health` 200 (expected — all
  three gates observed green on `origin/main` this session; nothing this plan touches is in their graphs).
- **SATISFIES**: AC #5.
- **REGENERATES**: none.

### Task 9 · CREATE `.claude/reports/prd-house-shape-396-report.md` and open the PR

- **IMPLEMENT**: the report per `system-execution-report`. The PR body MUST (a) disclose all three #392 skill changes
  by name and state that the owner's merge confirms them (D1), (b) list the nine header lines, (c) name the eight
  re-filed bullets, (d) carry `Closes #396`. Stage by explicit path: the three skills, the nine PRDs, this plan, its
  `.html` brief, the report.
- **GOTCHA**: memory `prs-dont-auto-close-tickets` — `Closes #396` in the BODY. Commit message ends with the
  attribution block from this session's system reminder.
- **VALIDATE**: `gh pr view --json body --jq .body | grep -c 'Closes #396'` → `1` (expected).
- **SATISFIES**: AC #1, #6.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no suite (CLAUDE.md §Testing). The checks are: the header regex over nine files with a positive control
and a reddening mutation (both driven this session), the two CI gates that pin generated outputs (unchanged, green
on baseline), and the bullet-count awk per re-filed section (observed before-counts recorded in each task).

### Edge Cases

- The ` · ` separator is U+00B7. A typed hyphen or an ASCII `.` fails the regex — that is the regex doing its job.
- `st-ux-fusion` line 3 becomes two lines; the regex reads line 3 only, so the Research line must be line 4.
- `discovery-partner` and `canvas` both have `## Open questions` (lowercase q); `ai-first` uses `## 9. Open Questions`
  — irrelevant here since only the three open epics get §9, and all three use the lowercase form.

### Proving the checks

- Regex positive control: nine `FAIL` lines on `origin/main` (observed). Acceptance: zero lines after Task 4.
- Regex reddening: removing the `sliced:` slot from a conforming line → `0` matches (observed).
- Bullet counts: `6 → 3`, `13 → 8`, `0 → 1` (`## Later, not never`) — the before-values are observed today.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```
node tooling/drift-check.mjs
```

### Level 2: Unit Tests

```
node tooling/build-checks.mjs
node tooling/token-lint.mjs
```

### Level 3: Integration Tests

```
RE='^\*\*Status:\*\* intent( · grilled [0-9]{4}-[0-9]{2}-[0-9]{2})? · architecture: (TBD|decided [0-9]{4}-[0-9]{2}-[0-9]{2}|folded [0-9]{4}-[0-9]{2}-[0-9]{2}) · sliced: (TBD|#[0-9]+ [0-9]{4}-[0-9]{2}-[0-9]{2})( · closed [0-9]{4}-[0-9]{2}-[0-9]{2})? · \*\*Created:\*\* [0-9]{4}-[0-9]{2}-[0-9]{2}$'
for f in docs/epics/*.prd.md; do sed -n 3p "$f" | grep -qE "$RE" || echo "FAIL $f"; done
grep -L '^## Later, not never' docs/epics/discovery-partner.prd.md docs/epics/canvas-design-import.prd.md docs/epics/handoff-seam.prd.md
```

Both print nothing.

### Level 4: Manual Validation

Open each of the nine PRDs at line 3 and read the header against the epic issue (`gh issue view <n>`): the `sliced:`
number and the `closed` date match the issue. Nine lookups, one minute.

### Level 5: Additional Validation (Optional)

`cd portal && PORT=4799 node server.mjs &` → `curl -s 127.0.0.1:4799/api/health` → kill by PID.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| D1–D3 — the three decisions in the ticket | owner's hand | merge, not build: the PR proceeds under the recommended answers; the owner strikes a phase in review | #396 itself |
| Q4 — commit or drop the sibling's unstaged 2026-09-02 amendment | owner's hand | no | open one before the PR if the owner wants it kept |

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** The PR body discloses all three #392 skill changes and states the owner's merge confirms them (ticket checkbox 1).
- [ ] **AC #2** All nine `docs/epics/*.prd.md` open with a line 3 matching the canonical regex; every date traces to git or GitHub (ticket checkbox 2).
- [ ] **AC #3** `plan-architecture` and `piv-slice-epic` each carry the write-back step for their rung.
- [ ] **AC #4** The three open epics carry `## Later, not never` holding only bullets they already carried, verbatim; the six closed epics are unchanged (ticket checkbox 3, under D3).
- [ ] **AC #5** `drift-check`, `build-checks` (34 groups) and `token-lint` green; portal smoke answers.
- [ ] **AC #6** Plan, brief and report ride in the PR; `Closes #396` in the body.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual validation confirms nine headers against nine issues
- [ ] Acceptance criteria all met
- [ ] PR reviewed (`piv-review-pr`, verdict posted as a comment — memory `piv-review-pr-self-approve`)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **D1 (recommended: keep)** — the status-header and non-goals-with-reasons edits stay in `a667b39`. They are the
  same session's work (`Claude-Session` id matches), internally consistent, and codify what five PRDs already did.
  Reverting them would remove the only header form that tracks the ladder. The PR body is the disclosure #394 lacked.
- **D2 (recommended: all nine)** — migrate the five existing headers AND add one to the four without. A ladder line
  only helps if every file in the folder speaks it, and `st-ux-fusion`'s header is false today. The cost is nine
  one-line edits from a sourced table. Alternative: new PRDs only — then Task 4 and its regex drop out and
  `st-ux-fusion` stays wrong.
- **D3 (recommended: open epics, re-file only)** — §*Later, not never* on the three OPEN epics, moving bullets that
  already name a later home; never on the six closed ones, never new content. Alternative "new PRDs only": drop
  Tasks 5–7 (Phase 3 is a unit). Alternative "all nine with `none` where empty": rejected — `none` is a claim about
  the owner's intent an agent cannot make.
- **Q1** — `prototype-studio.prd.md:86` says "from the 2026-08-03 interview, 10 rounds" and `st-ux-fusion.prd.md:3`
  says "owner Q&A synthesis". Neither uses the word *grill*, so both headers omit the `grilled` slot. If the owner
  counts either as grilled, add `· grilled 2026-08-03` / `· grilled 2026-08-07` — one word each.
- **Q2** — `generative-prototyper` (epic #86) closed 2026-07-26 three days after creation; memory calls it "parked".
  The header says `closed 2026-07-26` because that is the issue's state. "parked" is not a rung and is not written.
- **Q3** — `canvas-design-import`'s header loses "(G1–G33 below, all resolved)". If the owner wants it kept, it goes
  as the first line of §Open questions, not in the header.
- **Q4** — the shared tree holds an unstaged 2026-09-02 amendment to `discovery-partner.prd.md` (+19), its
  architecture doc (+8/−3) and `gen-decisions.mjs` (+1), untouched since at least 2026-09-11. This plan works in a
  clean worktree and does not carry it. It should be committed or dropped by whoever owns it; if committed after this
  PR, the Amendments append conflicts trivially (keep both, date order).

## NOTES (open canvas)

### The nine headers — sourced

`Created` = the file's own stated date, else the epic issue's `createdAt` where the PRD body was the issue body on
that day, else the file's first-commit date. `architecture` dates from the architecture doc's own "Decided" line or
its first commit. `sliced`/`closed` from `gh issue view <n> --json createdAt,closedAt` (all observed 2026-09-14).

| File | Current line 3 (abridged) | New line 3 | Sources |
|---|---|---|---|
| ai-first-ux-factory | *(none; line 3 is `**One-line vision:**`)* — INSERT | `**Status:** intent · architecture: decided 2026-07-17 · sliced: #1 2026-07-17 · closed 2026-07-22 · **Created:** 2026-07-17` | PRD+arch first commit `d7fcf0c` 07-17 ("PRD + architecture (piv-slice-epic input)"); #1 created 07-17, closed 07-22 |
| canvas-design-import | `**Status:** intent, interviewed and grilled 2026-08-28 (G1–G33 below, all resolved), awaiting architecture · **Epic:** #295 (sliced 2026-08-28, 26 tickets #296–#321) · **Created:** 2026-08-28` | `**Status:** intent · grilled 2026-08-28 · architecture: decided 2026-08-28 · sliced: #295 2026-08-28 · **Created:** 2026-08-28` | file's own header; arch doc line 8 "Decided 2026-08-28"; #295 created 08-28, open |
| discovery-partner | `**Status:** intent, grilled 2026-08-27, awaiting architecture · **Epic:** TBD (created by \`piv-slice-epic\`) · **Created:** 2026-08-26` | `**Status:** intent · grilled 2026-08-27 · architecture: decided 2026-08-27 · sliced: #279 2026-08-27 · **Created:** 2026-08-26` | file's own header; arch doc line 7 "Decided 2026-08-27"; #279 created 08-27, open. Today's line is stale twice over (architecture and epic both exist) |
| generative-prototyper | `**GitHub epic:** [#86](…) · **Status:** scoped (PRD) · sequenced **after #73**` | `**Status:** intent · grilled 2026-07-23 · architecture: decided 2026-07-23 · sliced: #86 2026-07-23 · closed 2026-07-26 · **Created:** 2026-07-23` — and line 4 gains the prefix `**Sequenced:** after #73 · ` | PRD line 18 "grill session, 2026-07-23"; arch doc line 4 "decided (2026-07-23)"; #86 created 07-23 (body = PRD), closed 07-26 |
| handoff-seam | `**Status:** proposed · **Owner:** Linards Berzins · **Date:** 2026-08-28` | `**Status:** intent · architecture: folded 2026-08-28 · sliced: #329 2026-08-28 · **Created:** 2026-08-28` | line 5 "no separate `.architecture.md`" → folded; first commit `8375884` 08-28; #329 created 08-28, open |
| portfolio-v3-experience | *(none)* — INSERT | `**Status:** intent · architecture: decided 2026-07-22 · sliced: #70 2026-07-22 · closed 2026-07-26 · **Created:** 2026-07-22` | #70 created 07-22 with the PRD as body carrying the `Architecture:` link (observed in the issue body, lines 110/150) — so both existed on 07-22; batch-committed `1078d43` 07-24; closed 07-26 |
| prototype-studio | `**Status:** planned · **Owner:** Linards Berzins · **Created:** 2026-08-03` | `**Status:** intent · architecture: decided 2026-08-03 · sliced: #202 2026-08-03 · closed 2026-08-27 · **Created:** 2026-08-03` | arch doc line 6 "Decided 2026-08-03"; #202 created 08-03, closed 08-27. Line 4 `**Architecture:**` link and line 5 `**Supersedes:**` stay |
| prototyping-feel-uplift | `**Status:** planned · **Owner:** Linards Berzins · **Created:** 2026-07-30` | `**Status:** intent · architecture: decided 2026-07-30 · sliced: #164 2026-07-30 · closed 2026-08-03 · **Created:** 2026-07-30` | arch doc line 3 "Created 2026-07-30", same commit `6cca5a1`; #164 created 07-30, closed 08-03. Line 4 link stays |
| st-ux-fusion | `Date: 2026-08-07. Research: \`.claude/plans/st-ux-fusion-epic-research.md\` (…). Status: intent — architecture TBD.` | `**Status:** intent · architecture: decided 2026-08-07 · sliced: #243 2026-08-07 · closed 2026-08-27 · **Created:** 2026-08-07` then a new line 4 `**Research:** …` (text in Task 4) | arch doc line 3 "Decided: 2026-08-07"; #243 created 08-07, closed 08-27. Today's line is FALSE (architecture TBD) |

### Why no gate

Three reasons, in order of weight. A form regex cannot see the failure that actually happened (a well-formed, false
line). The count "34" is pinned in five prose places plus drift-check's `group-count` check, so a 35th group is a
six-file edit for a nine-line regex. And the fix that matters is the executor: the two skills that move the ladder
now rewrite the line, which is what "replace its TBD in place" needed all along.

### Why "closed", not "shipped"

The issue state is the verifiable fact. #86 closed as parked; "shipped" would be false there and unverifiable
elsewhere. One word, always true.

### Pre-flight record

- **Driven**: the header regex against all nine current line-3s → nine `FAIL` (positive control); against three
  conforming synthetic lines → `1 1 1`; against a line missing `sliced:` → `0` (reddening). `node tooling/drift-check.mjs`
  → ✓ (and it lists a `group-count` check, which killed the gate idea). `node tooling/build-checks.mjs` → `all 34 groups pass`.
- **Resolved**: every line number above was read this session. `plan-architecture` and `piv-slice-epic` contain no
  `Status` mention (grep empty) — the "no executor" claim is observed, not inferred. No `~/.claude/skills/` copy of any
  of the three skills exists (observed), so there is no second copy to keep in sync.
- **Landed claims vs `origin/main`**: `a667b39` is on main (reachable from `d0e65fa`); PR #406 for the current
  branch is MERGED, so the plan branches from main, not from `feature/discovery-pre-grill-audit-292`.
  `discovery-partner.prd.md` bytes are read by no gate (grep of `readFileSync` over tooling/portal: only
  `discovery/<slug>/prd.md` projections and the md5 fixture).
- **Reconciled**: `discovery/README.md:397` cites "the house shape's §9" — §9 keeps its number, so no README edit.
  `gen-loc-summary.mjs` groups exclude docs and `.claude/` — no regen. Memory `ci-verify-runs-token-lint` — no token
  touched.
- **Changed because of pre-flight**: the gate phase was dropped (group-count pin); v3's `Created` moved from the
  07-24 batch commit to 07-22 after the issue body was checked; `generative-prototyper`'s `sequenced after #73` was
  kept by moving it to line 4 rather than dropped.

## AMENDMENTS

- **2026-09-14 (implementation)** — Task 5 said `## Non-goals` in `discovery-partner.prd.md` held six bullets at
  lines 369–381 and that the awk count was "observed today `6`". The section runs to line 405 and holds **15**
  bullets (`git show origin/main:… | awk` → 15). The plan read the first six only. Under the plan's own parked test
  ("a bullet that NAMES a later increment as its home"), a fourth bullet qualifies — **No a11y gating work** ("D11's
  axe-in-CI is a later epic"), the same bullet Task 6 moves in canvas for the same wording — so four move, eleven
  remain, and the Amendments entry says so. Expected awk count after: `11`, not `3`.
- **2026-09-14 (implementation)** — Task 7's VALIDATE `grep -c 'Later, not sliced' … → 0` cannot hold together with
  Task 7's own IMPLEMENT ("one entry: the heading renamed"), because an amendment that records a rename names the old
  heading. The check is `0` outside `## Amendments`: `awk '/^## Amendments/{exit} /Later, not sliced/' … | wc -l → 0`.
- **2026-09-14 (implementation)** — Task 0's expected head `d0e65fa` was `7c6f43b` at implementation (PR #406 merged);
  the delta is one new fixture, none of the twelve files this plan edits. The nine line-3s were re-read and matched.
