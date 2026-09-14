# Implementation Report — plan-create-prd house shape: nine epic PRDs reconciled (#396)

**Plan**: `.claude/plans/prd-house-shape-396.md`   **Branch**: `docs/prd-house-shape-396` (worktree `../ux-factory-wt-396`)
**Base**: `7c6f43b` at start → `7c6f43b` at report (origin/main unchanged; `git rev-list --count HEAD..origin/main` → 0)
**Status**: COMPLETE (implementation and report; commit and PR are the next two skills)

## Summary

The status-header rule in `plan-create-prd` now spells every ladder rung, and the two skills that move the ladder
(`plan-architecture`, `piv-slice-epic`) each carry the write-back step. All nine `docs/epics/*.prd.md` open with a
line 3 matching the canonical regex, every date sourced from git or `gh issue view`. The three open epics carry
`## Later, not never` holding only bullets they already carried, moved byte-identically (4 · 5 · 2 = 11 bullets, one
more than the plan's eight — see Deviations). No code, no generator, no gate touched.

## Tasks completed

- Task 0 worktree off `origin/main` → `../ux-factory-wt-396` on `docs/prd-house-shape-396` (CREATE)
- Task 1 ladder rung spellings → `.claude/skills/plan-create-prd/SKILL.md` (UPDATE, lines 108–114)
- Task 2 `architecture:` write-back → `.claude/skills/plan-architecture/SKILL.md` (UPDATE, both option bullets)
- Task 3 `sliced:` write-back → `.claude/skills/piv-slice-epic/SKILL.md` (UPDATE, after `$EPIC`)
- Task 4 nine headers → `docs/epics/{ai-first-ux-factory,canvas-design-import,discovery-partner,generative-prototyper,handoff-seam,portfolio-v3-experience,prototype-studio,prototyping-feel-uplift,st-ux-fusion}.prd.md` line 3 (UPDATE; two INSERTs, two carry-overs to line 4)
- Task 5 §Later, not never + amendment → `docs/epics/discovery-partner.prd.md` (UPDATE, four bullets moved)
- Task 6 §Later, not never + `## Amendments` → `docs/epics/canvas-design-import.prd.md` (UPDATE, five bullets moved)
- Task 7 `### Later, not sliced` → `## Later, not never` + `## Amendments` → `docs/epics/handoff-seam.prd.md` (UPDATE, two bullets moved)
- Task 8 gates + smoke (below)
- Task 9 this report (CREATE); the PR is `piv-create-pr`'s step

The nine headers as written (all observed on disk, `sed -n 3p`):

| File | Line 3 |
|---|---|
| ai-first-ux-factory | `**Status:** intent · architecture: decided 2026-07-17 · sliced: #1 2026-07-17 · closed 2026-07-22 · **Created:** 2026-07-17` |
| canvas-design-import | `**Status:** intent · grilled 2026-08-28 · architecture: decided 2026-08-28 · sliced: #295 2026-08-28 · **Created:** 2026-08-28` |
| discovery-partner | `**Status:** intent · grilled 2026-08-27 · architecture: decided 2026-08-27 · sliced: #279 2026-08-27 · **Created:** 2026-08-26` |
| generative-prototyper | `**Status:** intent · grilled 2026-07-23 · architecture: decided 2026-07-23 · sliced: #86 2026-07-23 · closed 2026-07-26 · **Created:** 2026-07-23` |
| handoff-seam | `**Status:** intent · architecture: folded 2026-08-28 · sliced: #329 2026-08-28 · **Created:** 2026-08-28` |
| portfolio-v3-experience | `**Status:** intent · architecture: decided 2026-07-22 · sliced: #70 2026-07-22 · closed 2026-07-26 · **Created:** 2026-07-22` |
| prototype-studio | `**Status:** intent · architecture: decided 2026-08-03 · sliced: #202 2026-08-03 · closed 2026-08-27 · **Created:** 2026-08-03` |
| prototyping-feel-uplift | `**Status:** intent · architecture: decided 2026-07-30 · sliced: #164 2026-07-30 · closed 2026-08-03 · **Created:** 2026-07-30` |
| st-ux-fusion | `**Status:** intent · architecture: decided 2026-08-07 · sliced: #243 2026-08-07 · closed 2026-08-27 · **Created:** 2026-08-07` |

Every `sliced`/`closed` date re-derived this run from `gh issue view <n> --json state,createdAt,closedAt` for
#1 #295 #279 #86 #329 #70 #202 #164 #243 (observed: all nine matched the plan's table; #295 #279 #329 OPEN, the
other six CLOSED). `architecture` dates come from four sources, not one — re-derived in review round 2 (PR #407), all observed. Five
of the nine are the architecture doc's own line: `canvas-design-import.architecture.md:8` · `discovery-partner
.architecture.md:6` · `generative-prototyper.architecture.md:4` · `prototype-studio.architecture.md:6` ·
`st-ux-fusion.architecture.md:3`. The other four carry no such line: `ai-first-ux-factory` from the doc's first
commit (`d7fcf0c` 07-17) · `handoff-seam` has no architecture doc at all (folded, PRD line 5; date from the PRD's
first commit `8375884` 08-28) · `portfolio-v3-experience` from `#70.createdAt` (07-22; its doc was first committed
07-24, `1078d43`) · `prototyping-feel-uplift` from its doc's `**Created:** 2026-07-30` line, not a Decided line.
`Created` for `ai-first`, `handoff-seam`, `prototyping-feel-uplift`, `st-ux-fusion` from `git log --follow
--diff-filter=A` (observed `d7fcf0c` 07-17 · `8375884` 08-28 · `6cca5a1` 07-30 · `f988228` 08-07).

## Tests added

None (no suite; CLAUDE.md §Testing). The checks are the plan's regex, the awk bullet counts, and a verbatim check
added this run (below).

## Proving the checks

| Check | Mutation → case red | Positive control |
|---|---|---|
| Header regex over nine line-3s | `sed -i '' '3s/ · sliced: #202 2026-08-03//' prototype-studio.prd.md` → `FAIL docs/epics/prototype-studio.prd.md`, restored → silent (observed) | Nine `FAIL` lines on the unedited `origin/main` tree (observed); synthetic conforming lines → `1 1`; synthetic line missing `sliced:` → `0` (observed) |
| awk bullet count per section | not mutated separately — the same awk reported `15 → 11` (discovery), `13 → 8` (canvas), `3 → 3` (handoff Non-goals) and `0 → 4/5/2` for the new section, before and after the edit (observed) | the before-values are the control |
| Verbatim move (added this run) | none applied; the check is `block in origin/main text` per bullet, a plain substring test that fails on any byte change | all 11 blocks reported `all verbatim` (observed) |
| `grep -L '^## Later, not never'` over the three open PRDs | printed all three before Tasks 5–7 (observed, by construction: zero files carried it) | prints nothing after (observed) |

## Validation results

| Command | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✓ `syntax · token-css · … · group-count` (observed; first run failed only because the fresh worktree had no `tooling/style-dictionary/node_modules` — `npm ci` there, then green) |
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` (observed) |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| regex loop over `docs/epics/*.prd.md` line 3 | prints nothing (observed) |
| `grep -L '^## Later, not never'` ×3 | prints nothing (observed) |
| Task 1 greps | `folded <date>` → 1, `omits the` → 1 (observed) |
| Task 2 greps | `architecture: TBD` → 1, `folded <date>` → 1 (observed) |
| Task 3 grep | `sliced: TBD` → 1 (observed) |
| Task 7 | `Later, not sliced` outside `## Amendments` → 0 (observed; 1 inside the amendment entry that records the rename) |
| portal smoke `PORT=4799 node server.mjs` → `/api/health` | 200, `{"ok":true,…,"headSha":"7c6f43b…"}`; killed by PID 85273 (observed) |
| `git status --short` non-`??` | 12 modified tracked files, no generated path dirty (observed) |

## Not run

- Level 4 manual "open each PRD and read against the issue" — done by command instead (`gh issue view` ×9 above), not
  by eye. Same evidence, recorded rather than read.
- Task 9's PR half — `piv-create-pr` is the next skill; the PR body must carry the D1 disclosure, the nine header
  lines (table above), the eleven re-filed bullets and `Closes #396`.

## Deviations from the plan

- **Task 5 moved four bullets, not three** `(plan error)`. The plan said `## Non-goals` held six bullets at lines
  369–381 with an "observed" awk count of 6; the section holds 15 (`git show origin/main:… | awk` → 15, observed).
  The plan read six of them. Applying the plan's own parked test to the nine it did not read, one qualifies — **No
  a11y gating work** ("D11's axe-in-CI is a later epic"), the same bullet Task 6 moves in canvas for the same words.
  Leaving it would make the two open epics file the same sentence under different sections. Eleven remain. The
  amendment entry and the plan's AMENDMENTS say so.
- **Task 7's `grep -c 'Later, not sliced' → 0` is measured outside `## Amendments`** `(plan error)`. The amendment
  the same task orders must name the heading it renamed. Logged in the plan's AMENDMENTS with the awk that scopes it.
- **Task 0's expected head** `d0e65fa` was `7c6f43b` `(plan error, anticipated by the plan)`: one new fixture on
  main, none of the twelve edited files; the nine line-3s were re-read and matched the table byte for byte.

## Assumptions carried

- D1 keep · D2 all nine · D3 open epics, re-file only — the plan's recommended answers; the owner strikes in review.
- Q1: neither `prototype-studio` nor `st-ux-fusion` carries a `grilled` slot (neither says "grill" on record).
  `portfolio-v3-experience` was in this list and should not have been: `:7` records "grill session, D1–D11" on
  2026-07-22. Slot filled in review round 2 (F8, PR #407) — the skill licenses omission only where no grill is on
  record. Its three rungs now share 2026-07-22, each separately sourced: `grilled` from `:7`, `architecture` from
  `#70.createdAt`, `sliced` from the same issue.
- Q2: `generative-prototyper` says `closed 2026-07-26`, the issue state; "parked" is not written.
- Q3: canvas's "(G1–G33 below, all resolved)" and "26 tickets #296–#321" dropped from the header. `G1–G33` lives in
  the body (`:68`, `:206`) and in #295; the ticket range lived **only** in #295 — the body did not carry it, so the
  header was cleared against a body that had no home for it. Restored to canvas's §Architecture in review round 2
  (PR #407): `Sliced as epic #295 on 2026-08-28: 26 tickets, #296–#321.`
- Q4: the sibling session's unstaged 2026-09-02 amendment in the shared tree is not carried; its Amendments append
  will conflict trivially at EOF with this PR's entry (keep both, date order). Two corrections to that picture: the
  review found it is **two hunks, not one** — the EOF append plus a new §Success metrics row at `:365`, seven lines
  above this PR's first §Non-goals removal, which should apply cleanly — and review round 2 **extended this PR's own
  EOF entry** by three lines (F6), so the conflict region is larger than when this was written.
- `discovery-partner` keeps `**Created:** 2026-08-26`, its own stated date, over git's 08-27 first commit.

## Additions beyond the plan

- A verbatim check: every bullet under each new `## Later, not never` asserted as a byte-identical substring of the
  `origin/main` file. AC #4 says "verbatim"; the plan had no command that proved it.
- `npm ci` in `tooling/style-dictionary` and `portal` inside the worktree — setup, not a change; nothing tracked.

## Issues encountered

- drift-check's first run went red on the missing Style Dictionary install in the fresh worktree (memory
  `local-agent-visual-gate-notes`), not on drift. Green after install; recorded above.

## Review round 2 — findings fixed (PR #407)

Eleven findings across two review posts. Eight fixed, three not — reasons below.

| # | Sev | Where | What changed |
|---|---|---|---|
| F1 | High | `plan-architecture/SKILL.md` · `piv-slice-epic/SKILL.md` | both executors named the whole slot as the search string and only the value as the replacement; now `architecture: decided <date>` and `sliced: #$EPIC <today>` |
| F2 | Med | `plan-create-prd/SKILL.md` | the `closed` rung had no executor; the owner is now named as writing it by hand |
| F3 | Med | this report `:47` | the one-line provenance claim was false for four of nine; all four sources now named |
| F6 | Med | `discovery-partner.prd.md` §Scope | said D6/D7/D1 are "named here as non-goals"; D6 and D7 moved to §Later, not never in this PR, so the sentence went false as the section changed under it |
| F7 | Med | `canvas-design-import.prd.md` §Architecture | `26 tickets #296–#321` was cleared from the header on the strength of a body that did not carry it; restored |
| F8 | Low | `portfolio-v3-experience.prd.md:3` | `grilled 2026-07-22` added — a grill is on record at `:7` |
| F5 | Low | `plan-create-prd/SKILL.md` §9 | the omission of §9 on a pre-rule PRD had no rule, so the skill's "write \"none\"" instruction still applied to it; the condition is now named |
| F9 | Low | `piv-slice-epic/SKILL.md:84` | "include that edit in the ticket-creation commit" named a commit the skill never makes; the command is now written |
| F10 | Low | `plan-architecture/SKILL.md` | the write-back had no rule for a PRD with no status header — the exact case (`st-ux-fusion`) that motivated the ticket |

**Not fixed, and why**

- **F4** (Low) — `sliced: #86` drops `generative-prototyper`'s issue link. The ladder grammar is plain text by
  design and this applies uniformly to all nine; a design consequence, not a slip. Left.
- **F11** (Low) — three sibling docs refer to the moved bullets as "non-goals" informally. Each bullet still opens
  with "No …", so nothing there is false the way F6 was. The reviewer's own verdict: "Fine to leave."
- No gate was added. The PR's §Non-goals reasoning stands — a form regex cannot see a well-formed false line, which
  is what F6 and F7 both were.

**F5, and why it stopped being discretionary.** The review graded it a readability question — a reader cannot tell
"this epic parked nothing" from "this epic predates the rule" — and on that framing it is the owner's call. Read as
an executor question it is **F2 one section down**: this PR decided that a pre-rule PRD omits §9 rather than
acquiring a `none`, and recorded that decision only in the PR body and this report. The skill still said "Empty is a
valid answer — write \"none\" rather than invent one", which executed over the six closed epics writes exactly the
assertion the PR refused to make. The clause now sits on §9's own bullet, mirroring the `grilled`-slot clause the
same file already carries. Nothing was written into the six PRDs: line 3's `**Created:**` date separates pre-rule
from post-rule, and stamping six historical records to resolve the ambiguity costs more than the ambiguity.

**F1's proof — the instructions executed, not read.** The defect was a form failure that reads correctly, so the
test is to run both write-backs literally against the grammar all nine headers satisfy. Negative control first:

```
pre-fix  **Status:** intent · grilled 2026-09-14 · decided 2026-09-20 · #401 2026-09-21 · **Created:** 2026-09-14
         → FAILS the grammar (the labels are gone — the defect, reproduced)
post-fix **Status:** intent · grilled 2026-09-14 · architecture: decided 2026-09-20 · sliced: #401 2026-09-21 ·
         closed 2026-09-25 · **Created:** 2026-09-14
         → CONFORMS
```

Both runs start from the header `plan-create-prd` tells you to write, apply `plan-architecture`'s replacement then
`piv-slice-epic`'s as literal string substitutions, then the owner's by-hand `closed` rung, and match the result
against the regex (observed). The header regex over all nine live line-3s is silent after F8's change.

**Bookkeeping.** F6 and F7 add prose to two PRDs in a PR whose claim is "no new content". Both ride under each
file's existing 2026-09-14 §Amendments entry rather than a second same-date entry: neither moved a bullet, and both
are corrections to what this PR's own move made false.
