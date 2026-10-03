# Implementation Report — owner decisions D-a to D-d for epic #504 (#507)

**Plan**: .claude/plans/discovery-owner-decisions-507.md   **Branch**: fix/importer-reads-icon-name-449 (no branch cut; nothing committed, per owner)   **Base**: 34ffc82 → 34ffc82   **Status**: COMPLETE (tasks 0–4)

## Summary
Decision ticket, no code. Task 0 corrected #504 R4 and #507 (F1–F5) before the sitting. The owner answered all eight tabs across two AskUserQuestion calls. The decision record is posted on #507 (https://github.com/linardsb/ux-factory/issues/507#issuecomment-5962097478), and #509, #510, #511, #512, #513 and #518 now carry an `Inherits:` line.

## Tasks completed
- Task 0: #504 body (one span) and #507 body (five spans) edited via anchor/replacement script; every anchor counted 1 before the write.
- Task 1: sitting run. Call 1: D-c shape, D-c route, D-a list, D-b reach. Call 2: Approval, Relayed, Receipt, C3 reach. Every tab was answered with its "(Recommended)" option. No notes or Other text were typed.
- Task 2: #507 comment posted (agent options + recommendation labelled `(agent)`, owner lines verbatim, implementing ticket per decision).
- Task 3: six tickets updated; #510 also carries the owed `prd-projection.mjs:755-756` line.
- Task 4: plan-files line at the end of the #507 comment.

## Proving the checks
| Check | Positive control / mutation | Result |
|---|---|---|
| Task 0 greps | run on `.before.md` first | new-text greps 0, `:108` 1, old #504 sentence 1 (observed) |
| Task 3 Inherits grep | — (first run executed outside the repo and printed 0 six times, which shows the grep can print 0) | after write: 1 ×6 |

## Validation results (all observed)
- Task 0: #504 `A new **ladder** row moves` 1, `A new row moves` 0; #507 the five new phrases 1 each, `canvas-ops.mjs:108` 0.
- Task 2: `Owner, typed in session` = 8 (one per tab: D-c 2, D-a 1, D-b 1, D-d 4); each `D-x — (agent)` header = 1.
- Task 4: `discovery-owner-decisions-507` = 2 (expected 1; see Deviations).
- Task 3: `Inherits:** #507` = 1 for each of 509 510 511 512 513 518; #510 `Also owed (from #507 F1)` = 1; live bodies equal the edited files apart from the trailing newline `--jq` adds.

## Not run
- `node tooling/build-checks.mjs`: the plan makes it conditional on a tree change, and there was none.
- D-c probe re-run: optional, and the owner did not ask for it.

## Deviations from the plan
- Owner lines are recorded one per question tab under a plain tab-name line, not one per decision. Task 2's count is therefore 8, not 4. This follows the owner's sitting instruction (tabs, with "Selected: <label>").
- The owner-line marker is plain text "Owner, typed in session, 2026-10-02:" rather than bold, as the owner instructed.
- The plan path appears twice in the #507 comment (intro and closing line), so task 4's grep prints 2, not 1.
- #511 has no "Re-scope after #507" heading. Its Inherits line was placed under the status paragraph, the only #507 anchor in the body (plan error: the heading was assumed).
- #512's line also names D-b via #509, per task 3's mapping.

## Assumptions carried
- The verdict date is 2026-10-02, the day the owner selected.

## Additions beyond the plan
None.

## Issues encountered
- The first task 3 write was run from the scratchpad directory, where `gh` has no repo context. The `cmp` guard skipped every write, so nothing was written; the run was repeated from the repo root.
