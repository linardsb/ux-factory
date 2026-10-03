# Implementation Report — owner decisions L and A for epic #504 (#517)

**Plan**: .claude/plans/discovery-owner-decisions-517.md   **Branch**: docs/517-owner-decisions (temp worktree off `origin/main`; the primary tree is on fix/importer-reads-icon-name-449)   **Base**: `origin/main` bc3aa52 → bc3aa52 (re-fetched before commit)   **Status**: COMPLETE

## Summary
Decision ticket, no code. Task 0 corrected #517's body with F1–F7 on the owner's Q1 selection. The owner answered both decisions in one AskUserQuestion call, each with its "(Recommended)" option. The record is posted on #517 (https://github.com/linardsb/ux-factory/issues/517#issuecomment-5966710682). The L2a verdict is filed as #520 (epic TBD, per the owner's Q2 selection) and its consequence is posted on #508 (https://github.com/linardsb/ux-factory/issues/508#issuecomment-5966720645). A3 files nothing; its revisit condition is in the record.

## Tasks completed
- Task 1a: `budget.mjs` run on `origin/main`'s bank (extracted with `git archive`); #505, #506, #508, #509, #511 all OPEN; no merged PR closes #508.
- Q1 asked: "Selected: Yes, correct it (Recommended)".
- Task 0: #517 body edited via an anchor/replacement script (`edit517.mjs`, scratchpad); every anchor counted 1 before the write, and the live body was re-fetched and compared with the pre-edit copy immediately before `gh issue edit`.
- Task 1: sitting run. Launch: "Selected: L2a own question (Recommended)". Criteria: "Selected: A3 decline, revisit (Recommended)". No notes or Other text typed.
- Task 2: #517 record comment posted: `(agent)` options and recommendation per decision, owner lines verbatim per question tab (Q1 edits, Launch, Criteria), `**Implies (agent):**` lines.
- Task 3: Q2 asked ("Selected: Epic TBD (Recommended)"); #520 filed; #508 comment posted; follow-up comment on #517 (https://github.com/linardsb/ux-factory/issues/517#issuecomment-5966720774) naming #520.
- Task 4: plan, brief and this report copied into the temp worktree `../wt-517` (branch `docs/517-owner-decisions`); commit and PR are the next step (`piv-commit`, `piv-create-pr`), with `Closes #517` since both ACs are met.

## Proving the checks
| Check | Mutation (should red) | Positive control |
|---|---|---|
| Task 0 anchor counts | `**Owners already volunteer it!**` → 0 (observed) | the seven real anchors → 1 each (observed) |
| Task 1a `budget.mjs` overflow throw | today's tree with `FULL_DISCOVERY_BUDGET` 31 → 28 → throws `pair … already overflows` (observed) | live tree prints the figures below without throwing |
| Task 2 owner-line count | scratch copy with the Criteria owner block removed → 2 (observed) | posted comment → 3 |
| Task 3 closing-phrase grep | `printf 'will close #517'` → 1 (observed) | `printf "last closer's position"` → 0; ticket draft → 0 (observed) |

## Validation results (all observed)
- Level 1: seven anchor counts, each `1`.
- Task 1a on `origin/main`: `budget=31 base=16 largestPair=29 modules=6,6,6,6,7 rap=6` · `L1 (rap+1): largest pair with rap = 30; fits=true; pin 6..7 ok=true` · `L2 (+1 always-asked): largest pair = 30; needs increase=false; smallest triple = 35 (three overflow at budget 31: true)`. Identical to the plan.
- Task 0 readback: live body equals `517.after.md` apart from the trailing newline `--jq` adds (`diff` output `32a33`).
- Level 2: `gh issue view 517 --json comments --jq '.comments[-1].body' | grep -c "Owner, typed in session"` → 3 (run before the follow-up comment was posted).
- Task 3 draft: `grep -c "#517"` → 6; closing-phrase grep → 0.
- Level 3: `node tooling/build-checks.mjs` on the `../wt-517` worktree (bc3aa52 + the three files): first run exit 1, one failure, group 41.7 `tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing` (a fresh worktree has no install); after `cd tooling/icons && npm ci`, exit 0, `build ✓  all 51 groups pass`.

## Not run
- The simulated post-#511 budget figures (budget 33, base 18, largest pair 33, L2 → 34) were not re-run in this session. They are cited from the plan's Task 1a pass of 2026-10-03; `origin/main` has not moved and #511 is open, so the inputs are unchanged.
- Level 4 (read the posted comment on GitHub in a browser): checked by `grep` on the posted body for blockquote and indented lines instead (none).

## Deviations from the plan
- Owner lines are recorded one per question tab (Q1 edits, Launch, Criteria), so the count is 3, not the plan's 2. Q1 was added as an owner block so the record does not paraphrase it.
- The budget negative control ran on today's tree at budget 28, not on the simulated tree at 32.
- The brief was not re-shown in full in chat: the agent pointed to its path and stated the current budget figures, and each AskUserQuestion option carried its one-line cost, including L2a's reopening of #507 D-a's ceiling line.
- #520's body says "Epic: TBD" and states it is not part of #504, rather than naming an epic (owner's Q2).

## Assumptions carried
- The verdict date is 2026-10-03, the day the owner selected.
- #520's scope adds one item beyond the brief's L2 cost line: #511 states `FULL_DISCOVERY_BUDGET` "must stay ≤ 33"; #520 notes that bound moves with it and should be re-derived from the smallest triple (37 at budget 34, derived in the plan).

## Additions beyond the plan
- One follow-up comment on #517 naming #520, rather than a PATCH of the record comment (the plan allows either).

## Issues encountered
- The F4 replacement (plan text) leaves "the PDF is not in the repo" twice in #517's body. Left as posted.
