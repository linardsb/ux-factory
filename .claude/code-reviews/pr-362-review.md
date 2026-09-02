# PR #362 review — run 0, Phase B and C: the owner's real product in the UI (#338)

**Head** `773fc5a` · **Base** `main` @ `14f7421c33792b91d9269d4fb39c9177f97e6260` · **Reviewed** 2026-09-02, fresh context · **Verdict** APPROVE

Docs-only PR: two files, nothing under `system/`, `portal/`, `discovery/` or `agent-layer/`. The base has not moved (`origin/main` is still `14f7421`), `mergeStateStatus` is CLEAN, and no prior review round exists, so the guarantees pass does not apply.

## Summary

The report's numbers hold. I re-derived every figure in AC5, AC2, F9, F10 and F11 from the package at `<JOBS_DIR>/_discovery/run0-2026-09-02/` two ways: the plan's AC5 script run unchanged, and an independent script that prints counts, ids and lengths only. Both reproduce the table line for line. A publication-safety scan stricter than the plan's (case-insensitive, over the answers, the agent's prose, every `wrong_if` line and every evidence name, against the report, the plan, the PR body and the commit message) finds zero spans. Nothing from the package is in the PR.

One Medium finding: F10's mechanism sentence miscounts turn 16, and a follow-up ticket cut from it would size the cap wrong. Seven Low findings: internal-consistency slips, one stale header, one closing decision to record. None changes a verdict in AC3 or AC4. A second, independent pass by the `code-reviewer` agent over the text alone (no package access) found F2, F3, F6 and F7 and nothing beyond them; it rated F2 High, which I do not share, since no verdict or follow-up number rests on that turn count.

## Findings

**F1 (Medium)** `.claude/reports/discovery-run-0-338-report.md:471-481` — F10 says *"six tool calls in a six-turn cap is not success to the SDK"*. The transcript records five ops for turn 16 (four `file_evidence`, one `record_decision`, seq 22–26) and zero `denied` lines, so a sixth tool call has no trace anywhere. Observed from the SDK session record (`~/.claude/projects/…/4a7ffef2….jsonl`, block types and counts only, no content): on all 30 turns `numTurns` equals tool calls + 1. Turn 3, four calls, 5. Turn 4, three calls, 4. Turn 8, two calls, 3. Turn 16, five calls, 6. The 26 single-call turns, 2. The sixth unit on turn 16 is the closing message that never ran; the session file holds a `<synthetic>` record in its place. So at `MAX_TURNS = 6` the cap admits **four** tool calls per turn (three evidence rows plus the decision) and the fifth trips it; turn 3 sat one call under it. Thinking blocks do not count. Fix: replace the sentence with the counted mechanism, and carry *"the cap admits `MAX_TURNS − 2` tool calls per turn"* into the follow-up ticket as its sizing rule. The rest of F10 (ok:false with a complete transcript, no text line, invisible in the drawer) is confirmed: the server's discovery `done` event carries only `view` (`portal/server.mjs:237`), so the drawer cannot show `ok`.

**F2 (Low)** `report:343` — AC4 #289 row: *"`file_evidence` 10 across three turns"*. Four turns: 3, 4, 8 and 16 (3 + 2 + 1 + 4 rows), as AC5 and F10 in the same report say. Fix: "four turns".

**F3 (Low)** `report:455-464` — F9's text-line accounting: *"the remaining 25 turns carry exactly one line, 57–62 characters"*. Observed: 24 turns carry one line (turn 2's is 83 characters, the other 23 are 57–62) and turn 16 carries none, which is F10's own fact. 2 + 3 + 25 leaves no turn for the zero-line one. The conclusion *"on 25 of 30 real turns there is nothing to falsify"* is right (24 + turn 16); the sentence that gets there is not. The PR body's *"on 28 its only prose is the filing confirmation"* has the same slip (27 plus one with no prose). Fix: "24 turns carry one line … turn 16 carries none".

**F4 (Low)** `report:394` — Latency: *"turns 3 and 4, where the agent made five and four tool calls"*. Five and four are the SDK turn counts; the tool calls were four and three. This is the exact conflation the plan's own GOTCHA under "DERIVE the AC5 numbers" names. Fix: "four and three tool calls (five and four SDK turns)".

**F5 (Low)** `report:338, 453, 490` — *"F7's 79"*, *"Findings — continued from F8"* and *"F8's fixture"* cannot be resolved from this report, which defines F1–F6. Both live in `.claude/reports/discovery-finding-fixes-338-report.md` (F7 the 79 warmup denials, F8 evidence provenance). Fix: name that file once at the "continued from F8" heading.

**F6 (Low)** `report:3` — header **Branch** reads `chore/338-run-0`; this PR's branch is `chore/338-run-0-phase-c`. Fix: name both, or the current one.

**F7 (Low)** `report:440-441` — *"`s5-value-metric` and `s5-willingness-to-pay` sit on `orgBuys` and are dropped by `internal`"*. D1's table has `internal` dropping willingness-to-pay only; value-metric stays on `orgBuys`. Labelled expected, but it over-reads the table. Fix: drop value-metric from the "dropped by internal" clause.

**F8 (Low, a decision to record)** PR body `Closes #338` · `report:401-404` — AC2 asks for "every decision carrying its evidence link and kill criterion"; the report says, correctly, that the evidence link holds as a slot 23 decisions leave empty. Closing #338 therefore accepts the evidence-link half as unmet by design, with F11 carrying it to #289. That is a fair call, but it is a call: one sentence in the PR body or the report should say so, so the closed ticket does not read as AC2 met in substance.

## The numbers pass

Every figure below was re-derived by me on 2026-09-02 from the package, with the plan's script unchanged and with an independent masked count. "Matches" means the report's figure and both scripts agree.

| Figure | Report | Re-derived |
|---|---|---|
| Answers · banked · closed · decisions | 30 · 30 · 30 · 30 | matches |
| Weak · open_question · off_script · denied | 0 · 0 · 0 · 0 | matches |
| Evidence rows · provenance · by URL | 10 · 9 real-interview + 1 assumption · 0 | matches; turns 3, 4, 8, 16 |
| `no-evidence` · `orphan` · parent_id on non-business | 23 · 0 · 22 of 22 | matches (PRD's 24th `no-evidence` string is the ledger summary line) |
| Ladder | 8 · 5 · 10 · 7 | matches |
| Text lines · Σ numTurns | 31 · 70 | matches |
| Latency min · median · max · Σ | 7.7s · 11.5s · 29.3s · 6m45s | 7,698 · 11,480 · 29,293 · 404,935 ms |
| Cost · missing turns | $1.6355 · 0 | 1.6355 · 0 |
| First-ten · last-ten cost average | $0.053 · $0.060 | 0.0531 · 0.0603 |
| Cache read turn 1 · turn 30 | 3.8k · 125k | 3,768 · 124,774 |
| Tokens in · out · cache read · create | 124 · 27,564 · 2,012,221 · 72,202 | matches |
| Wall-clock · start→last turn · last turn→Finish | 41 · 39 min · 1m46s | 40.56 · 38.79 min · 106.1s |
| Words total · min · median · max | 9,228 · 183 · 305 · 448 | matches (305 is the lower middle of 305/308) |
| Turn 16 numTurns · ok · cost · seq | 6 · false · $0.072 · 22–26 | matches |
| Judgement paragraphs · confirmations 133–156 | turns 1, 30 (471, 538) · turns 3, 4, 8 | matches (156, 148, 133) |
| PRD lines · sections · ops · Wrong if · Evidence 7/23 | 901 · 11 · 40 · 30 · 7/23 | matches |
| Download vs `prd.md` | one-line diff (`ended`) | 2 diff lines, the run header; download mtime 18:03:39, five seconds after the last turn's stamp |
| AC7 phrasing scan | 7 ids | a broader regex marks 9, a superset of the 7; not-applicable 0 |
| Worksheet (AC6 check 1) | 134 lines, unchanged since 2026-08-31, no answer text | 134 lines, mtime 2026-08-31 16:02, longest line 297 chars |
| `MAX_TURNS = 6` · `ok = subtype === 'success'` · EVIDENCE_RULE after the cap | as stated | `discovery-transport.mjs:50, :209`; cap 2026-08-29, rule 2026-09-01 |
| `bank.mjs` has no quality-attribute question | structurally 0 | 0 matches |
| Rehearsal $1.49 · 10.1s · 12 Bash · F7's 79 · $2.80 · $1.50–3.00 band | as cited | present in Phase A / rehearsal / the fixes report |

Not re-observable, taken as the owner's word: AC3's "UI", the Q3/Q5 notes, the naming sign-off, the `stale: true → false` restart before turn 1, and the `cmp` of the download against the `--stdout` projection at the time.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` (worktree at `773fc5a`) | ✅ `build ✓ all 33 groups pass` (observed) |
| `node tooling/drift-check.mjs` (same worktree, after `npm ci` in `tooling/style-dictionary`) | ✅ 12 checks green (observed) |
| Plan's AC5 derivation script, unchanged | ✅ output equals the report's table (observed) |
| Independent masked count over the package | ✅ agrees on every row (observed) |
| Publication-safety span scan, stricter than the plan's | ✅ 0 hits in report, plan, PR body, commit message (observed) |
| Package content in the PR | ✅ none; `gh pr view --json files` lists the two docs only |
| Suite / lint / typecheck | none exists (CLAUDE.md); not invented |

## What's good

- The provenance discipline is real. Derived figures are marked derived, the two turn numbers are kept apart in the table, and the 270 words-a-minute arithmetic is shown beside the owner's statement rather than used against it.
- F9's premise survives a check the report could not make itself: the transport appends every assistant text block (`discovery-transport.mjs`, the `assistant` branch), and the session record's text-block counts equal the transcript's text lines on all 30 turns. The missing prose is missing from the run, not from the capture.
- The AC4 rows use "no evidence either way" where the counter cannot detect harm, and say why. That is the honest reading and it is what makes F9 the epic-level finding.
- AC6 is proven, not asserted: check 1's one grep hit is named and explained, and my stricter scan agrees with check 2.

## Recommendation

**Approve.** Fix F1 in this PR if it is still open when you read this; it is one sentence, and the follow-up ticket should be cut from the counted rule, not from "six tool calls". F2–F7 can ride along or land with the next docs pass.
