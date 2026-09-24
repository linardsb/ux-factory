# S6 — the compose turn

**Real run, 2026-09-24, 15:43–15:44 UTC (`raw/run-2/`).** Ticket [#308](https://github.com/linardsb/ux-factory/issues/308) ·
epic [#295](https://github.com/linardsb/ux-factory/issues/295) · `docs/epics/canvas-design-import.architecture.md`
§ Spikes item 5 and § Boundaries. Executable plan `.claude/plans/canvas-spike-s6-compose-turn-308.md`.

The input is `discovery/faster-payment/prd.md`, the projection of a **real run over a fictional scenario**
(`run.json`: "Real run — fictional scenario"). The transcripts under `raw/` are the driver's output, written line
by line as the run happened and never edited. Every number below is copied from a raw file and names it.
Nothing under `system/`, `portal/`, `discovery/`, `handoff/` or `tooling/` was changed. The build document
lived in memory for the length of the run.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Q1 — does one turn file one screen and yield?** | **Yes, on all three screen turns.** Each turn made exactly one `screen_compose` call, the call was filed, and the agent then replied with one sentence and stopped. `num_turns` is 2 on every turn (1 + one tool call, `discovery-transport.mjs:57-62`), against a deliberately loose `maxTurns: 10` that would have allowed nine calls. No refusals, no corrections, no second `screenId` attempted, no repeat of an accepted screen. **This is one run (n = 1)**, the table's stop rule. | `raw/run-2/verdict.json` `.verdict` = `clean`; `turn-1.jsonl:7`, `turn-2.jsonl:7`, `turn-3.jsonl:7` (`numTurns: 2`) |
| **Q2 — the branch taken** | **Branch 1: ship the spine.** Run 2 (the loop as #312 would ship it: no yield contract, no `Stop` hook) read `clean`, so by the plan's decision table no `--contract` or `--stop-hook` run was made. **The verdict holds for this prompt wording only** (fingerprint `c903170484396973`): `LOOP` itself tells the agent to call `screen_compose` once per turn, so the run shows the agent follows that instruction, not that it yields unprompted. #312 ships branch 1 with `LOOP` and `ESCAPE` carried over verbatim; a change to either re-opens S6. | `raw/run-2/verdict.json` |
| **Q3 — transport** | In-process SDK tool `screen_compose` (MCP tool names cannot hold a dot) → op `screen.compose`, applied by `system/canvas-ops.mjs` `applyOp` after `validateComposition` against the generated vocabulary. **One session resumed across four turns**: the same `sessionId` `1f579c0c-a197-4f5e-bd0b-5b80a12e6af6` on all four stats lines. `claude-sonnet-5`, SDK 0.1.77, zod 4.4.3, Node v20.20.2. The init line advertised exactly one tool. | `turn-1.jsonl:2` (init), `turn-*.jsonl:7`, `fork.jsonl:7` |
| **Q4 — B5 proxies (numbers only; the read is the owner's)** | 4 of 4 screens have a `stack` column root and open with `screen-header`. 2 of 4 have exactly one `primary-button` as the last child: `confirm-payee-result` puts a `ghost-button` after it, and `review-and-send-payment` has no `primary-button` and ends in a `modal-dialog`. **0 Verdant-locked parts** used (`plant-card`, `care-task-row`, `stat-tile`, `status-chip`, `demo-notice`). Depth 2, 2, 2, 3. | `raw/run-2/outline.txt`; `verdict.json` `.b5` |
| **Q5 — D5 at the fork** | **`picked-one`, but the probe missed its target, so D5 is not answered by this run.** The fork turn asked for "the screen where the customer chooses the amount and sends the first payment". The agent had already filed `choose-account-and-amount` in **turn 3**, unprompted, so the fork turn filed the next screen (`review-and-send-payment`, one proposal). In turn 3 the agent **wrote a specific value into copy for the one decision the PRD leaves open**: the hint "New payees have a first-payment limit of £1,000". seq 23 settles *that* a limit exists (`prd.md:364`); seq 11 leaves *what it is* unsettled (`prd.md:318`). Turn 3's `why` and text both cite seq 11 and describe the limit as "stated up front", but neither marks £1,000 as the agent's own choice. **This cannot be separated from the example data the agent writes into every screen** (`J R Smith`, `00-00-00 12345678`, `£150.00`, `£1,240.50 available`, `outline.txt`), so it is not evidence either way on whether the agent offers alternatives at a fork. | `turn-3.jsonl:4` (the op; `text-field.hint`), `turn-3.jsonl:6`; `fork.jsonl:4`, `fork.jsonl:6`; `raw/run-2/outline.txt` |

## Per turn (run 2)

Every op passed `validateComposition` on the first call (validated = yes, 0 refused).

| run | turn | screenId | op emitted | validated | corrections | outcome | elapsed ms (SDK / wall) | tokens in / out / cache-read / cache-write | cost USD |
|---|---|---|---|---|---|---|---|---|---|
| 2 | turn-1 | `add-payee-details` | `screen.compose` → f1 | yes | 0 | clean | 12 256 / 14 669 | 4 / 813 / 16 316 / 17 061 | 0.15416 |
| 2 | turn-2 | `confirm-payee-result` | `screen.compose` → f2 | yes | 0 | clean | 17 291 / 20 064 | 4 / 1 315 / 34 355 / 1 482 | 0.04387 |
| 2 | turn-3 | `choose-account-and-amount` | `screen.compose` → f3 | yes | 0 | clean | 12 095 / 14 875 | 4 / 832 / 37 427 / 1 122 | 0.03698 |
| 2 | fork | `review-and-send-payment` | `screen.compose` → f4 | yes | 0 | picked-one | 17 864 / 19 688 | 4 / 1 235 / 39 781 / 1 614 | 0.04576 |
| **2** | **total** | | 4 ops | 4 / 4 | 0 | **clean** | 59 506 / 69 296 | 16 / 4 195 / 127 879 / 21 279 | **0.28076** |

Cells come from each file's stats line (`turn-1.jsonl:7`, `turn-2.jsonl:7`, `turn-3.jsonl:7`, `fork.jsonl:7`),
the op line (`:4`) and the totals in `verdict.json`. Every `why` cites seqs (6, 7, 8, 11, 12, 23, 30) that exist in
`prd.md` (Level 4 check: `grep -c "seq <n> ·"` → 1 each, observed). Turn 1 wrote the prompt cache (17 061
tokens); turns 2–4 read it, which is why each costs about a quarter to a third of turn 1.

**Run 1** is a failed run and not a verdict. The API account the SDK billed (`ANTHROPIC_API_KEY` in the shell)
had no credit. The result arrived as `subtype: "success"` with `is_error: true` and the text "Credit balance
is too low", and one message later the CLI exited with code 1. The driver recorded it as `failed`. It cost
$0.0000, so it does not count towards the three-run cap. After the owner added credit, the same flags were re-run
under the next run number (`raw/run-1/verdict.json`, `raw/run-1/stdout.txt`).

## Setup

| | |
|---|---|
| Model | `claude-sonnet-5` |
| Prompt fingerprint | `c903170484396973` (runs 1 and 2, same constants: `ROLE`, `LOOP`, `ESCAPE`, the two turn asks) |
| Vocabulary | `handoff/verdant/vocabulary.json`, sha256 prefix `a2bfea9494d879de`, 26 components |
| Vocabulary context | 5 549 chars, generated at run time (prop list, children, first usage sentence, plus the file's own `composition.shape` / `childrenRule`) |
| System prompt | 44 203 chars (fixed text + context + `prd.md` verbatim) |
| `maxTurns` | 10, deliberately loose: nine calls allowed, so a clean turn is not clean by construction |
| Turns | turns 1–3 un-briefed ("Propose the next screen."), then one fork turn; auto-accept in memory between turns (`source: "driver-dry"`) |
| Budget | $3.00 across all runs; spent $0.2808 |
| Fence | `tools: []`, `allowedTools: []`, `strictMcpConfig: true`, `canUseTool` + `PreToolUse` allow only `mcp__canvas-s6__screen_compose`. 0 denials recorded. |

**Flow observation (Level 4; numbers only, the read is the owner's).** The plan named the PRD's flow as add
payee → Confirmation of Payee result → scam-safety stop → amount and send. The run's four screens are add payee
→ Confirmation of Payee result → account and amount → review and send, with the scam-safety stop as a
`modal-dialog` inside the review screen rather than a screen of its own (`raw/run-2/outline.txt`, f1–f4).

**Hook observation.** `PostToolUse` fired once per filed call (`turn-*.jsonl:5`). No call was refused, so
whether an in-process tool's `isError` result fires `PostToolUse` or `PostToolUseFailure` was **not
observed** in this run. #312 should not assume either.

## Finding: the fork list

Carried from the plan (NOTES N4). #320 counts a fork as a decision the projection lists as open
(`open_question` not closed). Faster Payment's `prd.md` records `open_question 0` and "the run parked no
question", but seq 11 flags the first-payment amount as unsettled in prose. #320, built as written, would find
**no fork** on this package. Q5 shows the consequence: the agent wrote a value into copy for the one decision the
brief left open, and nothing on the canvas marks it as open. No decision is taken here; #320 owns it.

## Proving the checks

Each check was proven before any paid run: the mutation applied to a scratch copy of the driver, the named case
went red, and the unmutated driver ran green (`raw/selftest.txt` `selftest ✓ 17/17`, `raw/preflight.txt`
`preflight ✓ 7/7`).

| control | mutation | what went red | positive control |
|---|---|---|---|
| classifier runaway | `ids.size >= 2` → `>= 3` | `runs-ahead-two-screens: expected runs-ahead, got runs-ahead-attempted` | two-screen synthetic set |
| attempted runaway | `attempted.size >= 2` → `>= 3` | `runs-ahead-attempted: expected runs-ahead-attempted, got clean` | filed `a` + refused `b` |
| escape marker | regex back to `/^NOT COVERED:/m` | `escape-bold: expected escape, got empty-yield` | `**NOT COVERED:** …` |
| resume equality | drop the session-id clause | `session-changed: expected failed, got clean` | changed-session synthetic set |
| context completeness | skip the first component | `context-26: expected 26, got missing avatar` | count 26 |
| B5 root proxy | fixture root → `card` | `outline-add-payee: expected y/y/y/none, got n/y/y/none` | owner's add-payee |
| schema passthrough (PF2) | `z.looseObject` → `z.object` | PF2 red, and PF3/4/5/7 too: `z.object` strips `props`, so every composition fails its required props | depth-3 + extra key |
| vocabulary validation (PF4, PF7) | drop `validateComposition` | PF4 and PF7 red: `hero-banner` and `status: "thirsty"` both **filed** | `hero-banner`, `"thirsty"` |

## Not done

- **B5's read.** "Do the screens read un-mobile-like?" is the owner's call from `raw/run-2/outline.txt`. #321
  (`system/DESIGN.md`) stays untouched and open until then.
- **Runs with `--contract` / `--stop-hook`.** Not made: the decision table stops at a clean run. The `Stop`
  hook path (`stopHookCalls`) is built into the driver but has never run.
- **A briefed turn.** Turns were un-briefed, the case most likely to run ahead (plan Q2). A briefed turn was not run.
- **n > 1.** One clean run. The table does not ask for a repeat. A re-run costs about $0.28.

## Files

- `driver.txt` — the driver, kept as `.txt`. Copy it to a scratch `.mjs` to run (header).
- `raw/selftest.txt` · `raw/preflight.txt` — the zero-token outputs, verbatim.
- `raw/run-1/` — the failed run (no credit): `turn-1.jsonl`, `stdout.txt`, `verdict.json`, `outline.txt` (empty).
- `raw/run-2/` — the verdict run: `turn-1.jsonl`, `turn-2.jsonl`, `turn-3.jsonl`, `fork.jsonl`, `stdout.txt`,
  `verdict.json`, `outline.txt`.
