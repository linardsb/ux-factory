# Implementation Report — S6, the compose turn (#308)

**Plan**: `.claude/plans/canvas-spike-s6-compose-turn-308.md`   **Branch**: `spike/canvas-s6-compose-turn-308` (worktree `../ux-factory-s6`)   **Base**: `4d9adf6` → `4d9adf6` (`git fetch && git merge origin/main`: already up to date)   **Status**: PARTIAL — commit done; PR and the #295 comment pending (`piv-create-pr`)

## Summary
The spike ships a driver kept as `.txt`, two zero-token checks and one paid verdict run over Faster Payment. Under resume-per-turn, the agent filed exactly one vocabulary-validated `screen.compose` per turn and yielded on all three screen turns. The same session id held across all four turns. The decision table therefore took **branch 1 (ship the spine)**, and no `--contract` or `--stop-hook` run was made. The verdict holds for the `LOOP` wording that asks for one call per turn. The fork probe read `picked-one` but missed its target: turn 3 had already filed the amount screen, with a £1,000 limit written into hint copy for the one decision the PRD leaves open. That value cannot be told apart from the example data the agent writes into every screen, so D5 is not answered by this run.

## Tasks completed
- Task 1: worktree + branch from `origin/main` `4d9adf6`; `npm ci` in `portal/`, `tooling/icons/`, `tooling/style-dictionary/` (untracked `node_modules`)
- Tasks 2–8: `.claude/plans/canvas-spike-s6/driver.txt` (CREATE): loader, `--repo`, `vocabContext`, tool + handler, `classifyTurn`/`classifyRun`, `--selftest`, `--preflight`, prompt constants, turn runner, outline + `verdict.json`
- Task 9: run 1 (failed: no API credit, $0) → run 2, same flags: `clean` → stop
- Task 10: not triggered (the table stops at `clean`)
- Task 11: `.claude/plans/canvas-spike-s6/README.md` (CREATE)
- Task 12: gates and commit done; PR and epic comment pending

## Tests added
No suite (CLAUDE.md § Testing). The driver's own checks:
- `--selftest`: 17 named cases (9 screen, 5 fork, 1 run, `context-26`, `outline-add-payee`) → `selftest ✓ 17/17` (observed, `raw/selftest.txt`)
- `--preflight`: PF1–PF7 against the real in-process server's handlers → `preflight ✓ 7/7` (observed, `raw/preflight.txt`)

## Proving the checks
Each mutation was applied to a scratch copy by exact-string replacement and run. Each exited 1 (observed). The unmutated copy is byte-identical to `driver.txt` (`cmp`, observed) and runs green.

| check | mutation | went red | positive control |
|---|---|---|---|
| runaway (filed) | `ids.size >= 3` | `runs-ahead-two-screens: expected runs-ahead, got runs-ahead-attempted` | two-screen set |
| runaway (attempted) | `attempted.size >= 3` | `runs-ahead-attempted: … got clean` | filed + refused, two ids |
| escape marker | `/^NOT COVERED:/m` | `escape-bold: … got empty-yield` | `**NOT COVERED:**` |
| resume equality | session clause → `if (false)` | `session-changed: expected failed, got clean` | changed-session set |
| context completeness | `.slice(1)` on components | `context-26: … got missing avatar` | 26 |
| B5 root proxy | fixture root → `card` | `outline-add-payee: … got n/y/y/none` | add-payee |
| schema passthrough | `z.object` | PF2 (and PF3/4/5/7: `z.object` strips `props`) | depth-3 + extra key |
| vocabulary validation | drop `validateComposition` | PF4, PF7 (both filed) | `hero-banner`, `"thirsty"` |

## Validation results
- `node --check "$SCRATCH/s6.mjs"` → ok (observed)
- `node "$SCRATCH/s6.mjs"` (no args) → exit 2 naming `--repo` (observed)
- `--selftest` → `selftest ✓ 17/17`; `--preflight` → `preflight ✓ 7/7` (observed)
- run 2: `verdict.json` `.verdict` = `clean`, fork `picked-one`, $0.28076, 4 turns on session `1f579c0c…` (observed)
- `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass` (observed, post-merge tree)
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · group-count` (observed)
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed)
- `git status --porcelain -- system portal discovery handoff tooling` → empty (observed)
- Level 4: every seq the `why` fields cite (6, 7, 8, 11, 12, 23, 30) exists in `prd.md`: `grep -c "seq <n> ·"` → 1 each (observed)

## Not run
- `--contract` / `--stop-hook` runs: not triggered by the decision table. The `Stop` hook path has never run (README § Not done).
- B5 read (open or close #321): owner's call.
- PR (`Closes #308`) and the verdict comment on #295 (AC #3): pending, next step `piv-create-pr`.
- CI: runs on the PR.

## Deviations from the plan
- **(plan error)** `classifyTurn` counted a runaway over filed screenIds only, so a refused second screen read `clean`. Added `attempted` and outcome `runs-ahead-attempted`, which `classifyRun` counts as runs-ahead. Refused op lines now carry `params`. Schema-layer refusals are written from `PostToolUseFailure` with `tool_input`. Logged in plan AMENDMENTS.
- **(plan error)** The escape regex `/^NOT COVERED:/m` missed markup such as `**NOT COVERED:**`. It is now `/^[^\w\n]*NOT COVERED:/m`. The self-test went from 15 to 17 cases. Logged in plan AMENDMENTS.
- The run numbers are **1 (failed) and 2 (verdict)**, not "run 1 = verdict". Run numbers are never reused, per the plan.

## Assumptions carried
- Every screen filed in a turn is auto-accepted in memory (`driver-dry`), so the next turn's "canvas holds" line shows what is really there. Only one per turn was ever filed, so this choice did not change anything.
- Model `claude-sonnet-5`, `emptyDoc()` start, un-briefed turns (plan Q2), `recordRun` not reused (plan Q5).
- The run-1 failure cost $0 and does not count towards the three-run cap (plan Task 9: "if it spent tokens").

## Additions beyond the plan
- The vocabulary context includes `vocabulary.json`'s own `composition.shape` and `childrenRule` lines. These are generated text from the file, so the node shape reaches the agent without driver-authored text.
- `verdict.json` is written in `finally`, and each turn has a 300 s abort (advisor: a throw or a hang still leaves a `failed` verdict on disk).
- `tool_use` and `init` lines are recorded per turn, alongside the plan's line kinds.

## Issues encountered
- Run 1: the shell's `ANTHROPIC_API_KEY` account had no credit. The result arrived as `subtype:"success"` + `is_error:true` ("Credit balance is too low"), then the CLI exited with code 1. The driver classified it `failed`. The owner added credit and run 2 used the same flags.
- The fork probe was pre-empted: turn 3 filed the amount screen on its own and wrote a £1,000 value for seq 11's open amount into hint copy. That value is indistinguishable from the example data the agent writes into every screen, so the README records D5 as not answered by this run.
