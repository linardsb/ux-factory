# Implementation Report — Run 2: the pre-grill fixture audited in existing-PRD mode (#292)

**Plan**: `.claude/plans/discovery-pre-grill-audit-run-292.md`   **Branch**: `feature/discovery-pre-grill-audit-292`
**Base**: `d0e65fa` (origin/main, #405 merged) → `d0e65fa` at report time (origin/main did not move; observed)   **Status**: COMPLETE

## Verdict per acceptance criterion

| | Verdict | Evidence |
|---|---|---|
| Precondition 1 | **met** | `md5 -q <fixture>` → `ab6eb0ee6cdd3b7802ecfcbe90db2377` (24,560 bytes); `sessionView('discovery/partner-audit-2').document` → `{ref:'a1', chars:24355, md5:'ab6eb0ee6cdd3b7802ecfcbe90db2377'}` (both observed) |
| Precondition 2 | **met** | case 23's run-2 rows in CI (`build ✓  all 34 groups pass`); `--probe-fence` on run 2's shape `probe BOTH_SITES_HOLD` (plan time, nonce `177cad46`, $0.1926, receipts committed); the real transcript: 2 `denied` lines, both `mcp__discovery__record_decision` (an `evidence_refs` naming its own future seq), **zero on a built-in tool**, under `MAIN_TOOLS = []` (observed) |
| Precondition 3 | **met** | rubric committed `4a74848` at `2026-09-14T11:12:06+01:00` (= `10:12:06Z`); `run.json.startedAt` `2026-09-14T10:24:03.353Z` — twelve minutes later; `node tooling/run-2-ready.mjs --model claude-opus-5` → `run-2 ready ✓  6 checks …` at `e8667b6`, the commit the portal booted from (observed) |
| AC #1 | **met** | `discovery/partner-audit-2/` committed: `entryMode existing-prd`, `completion {settled:23,total:23,done:true,turns:23}`, `endedAt 2026-09-14T10:34:59.622Z`; `prd ✓  partner-audit-2 → 12 sections, 32 ops`; gap list = 16 weak answers, 0 open questions, "resting on no evidence" 0 (observed) |
| AC #2 | **met as a measurement; the number is low** | 0 of 8 FOUND · 3 PARTIAL · 5 MISSED; against the rubric's reachable five: 0 found, 2 partial. Itemised below with one quoted line each; the rubric was not revised |
| AC #3 | **met** | `askedWhatMattered.modules` `["hasModel"]`; all seven module questions closed — six UNEVIDENCED, one ANSWERED (itemised below) |
| AC #4 | **met** | `run.json.model` `claude-opus-5`; one distinct `postureFingerprint` `ba124c3c1edb19905101aceca7c12e22` = `resolvePosture({posture:'grill', model:'claude-opus-5'}).fingerprint`; pinned by 30.46 and 32.7, both reddened |
| AC #5 | **met** | `auditTraceability`: `unbacked []` (0 of 7), `unrooted [14, 26]`, parenting `eligible []`, `missed []`; wrong-if read 7 PARAPHRASED · 0 QUOTED · 0 AUTHORED; `notAForm.tripped false`, longest 0 (observed) |
| AC #6 | **met** | 23 turns · $1.6152 · tokens in 110 / out 29,450 / cache-read 1,911,281 / cache-create 65,153 · elapsed 656 s (10.9 min) · latency 7,243 / 16,479 / 31,591 ms · warm 23, cold 0 (observed / derived, below) |
| Validation | **met** | every Level 1, 2, 3 (free) and 5 command green on the final tree; the two T11 pins red on their mutations |
| Docs + PR | **met** | README (four edits), gates.md (three), this report; PR body carries `Closes #292` |

**The score is a reading of this pairing — Grill's prompt surface `ba124c3c…` on `claude-opus-5` — never of the design alone.**

## Summary

Segment A landed the pre-registered rubric (committed first, `4a74848`), the pre-run gate `tooling/run-2-ready.mjs`
(six checks, each reddened), and the two probe receipts. The sitting (T7) was delegated by the owner ("run it all")
and driven through the plan's API loop with `frontEnd: terminal`: the first turn was read at the checkpoint, the
next 19 ran back to back, turn 21 hit `Credit balance is too low`, the owner topped up, and the same session
resumed from disk for the last three, 2 m 40 s later. Segment C read the package (nothing under it typed or
edited), scored it against the rubric, landed the two gate pins, the README section and gates.md.

**What the run says.** The audit mode works as a mechanism: 23 of 23, every decision evidenced, every wrong-if
the document's own words, the module firing whole for the first time. As a gap-finder against a human grill it
scored 0 of 8: the model reads each banked question against the document and names what the document does not
state (16 flags, five to six missing items each); the human grill found what the document contradicts (MVP 7 vs
MVP 3), presupposes (the solo user vs the prefix) and never specifies (the existing-PRD entry). None of those five
appear in any of the 81 transcript lines. The two #370 readings recurred: ABSENT never fired (0 `open_question`),
and one falsifier sentence was re-filed under three questions. All routed to #293.

## What ran

| Step | When (UTC) | Cost | Result |
|---|---|---|---|
| T5 `--probe-fence` (run 2's shape) | 2026-09-14 10:03 (plan time) | $0.1926 | `BOTH_SITES_HOLD` |
| T6 `--probe-audit --model claude-opus-5` | 2026-09-14 ~10:20 | $0.1136 | `ANSWERED · wrong_if PARAPHRASED` |
| T7 turn 1 (checkpoint) | 10:24:03 → 10:24:19 | $0.151 | `flag_weak_answer` seq 1, `answer_ref a1`, text before op |
| T7 turns 2–20 | 10:24 → 10:31:27 | — | back to back, 14–34 s each |
| T7 turn 21, first attempt | 10:31:35 | $0 | `Credit balance is too low` (text line under `t21`, no `turnStats`) |
| T7 turns 21–23 (resumed) + Finish | 10:34:16 → 10:34:59 | — | `done true`, closed |
| T7 total | 10.9 min wall clock | **$1.6152** | 23 `turnStats`, all `ok` |

Session spend, this ticket: $1.9214 (derived: 0.1926 + 0.1136 + 1.6152). Plan estimate was $1.3–3.6 remaining.

## AC #6 — the cost read

All from `run.json.turnStats` (observed) unless marked derived.

| | |
|---|---|
| Turns | 23 (SDK turns summed: 57) |
| Σ `costUsd` | $1.6152; mean $0.0702 (derived) |
| Tokens | input 110 · output 29,450 · cache-read 1,911,281 · cache-creation 65,153 |
| Elapsed `endedAt − startedAt` | 656,269 ms = 10.9 min (derived) |
| `durationMs` min / median / max | 7,243 / 16,479 / 31,591 (median of 23 = the 12th value) |
| Warm / cold | 23 / 0 — interval before each turn ≤ 171 s, all under the five-minute TTL (derived from `ts − durationMs` against the previous `ts`) |
| Per-turn cost | 0.151 0.058 0.055 0.066 0.076 0.043 0.065 0.075 0.082 0.055 0.074 0.058 0.056 0.062 0.060 0.061 0.116 0.060 0.070 0.064 0.072 0.069 0.069 |

Turn 1 carries the cache creation of the 24k-character document ($0.151); the rest ride the cache. The credit
gap (171 s) stayed inside the window, so no cold turn was paid.

## AC #2 — Gap finding, itemised

Scored by the implementing session against `docs/epics/fixtures/discovery-partner.run-2-rubric.md` (commit
`4a74848`, before the run, not revised). Candidates: every `text`, `missing[]`, `reason` and `wrong_if` line in
`discovery/partner-audit-2/transcript.jsonl`. The owner confirms at PR review.

| # | Finding | Reachable | Verdict | The line |
|---|---|---|---|---|
| 1 | scoring key 4 not 33, a layer below | in part | **PARTIAL** | seq 20 (t12, `s8-eval`) `missing`: "no scoring method — 'How a run's decision is judged equivalent to a published one without a human grading it generously' is still an open question" — the key named as under-specified; the level mismatch not stated |
| 2 | transition-note rule contradicts its example | yes | **MISSED** | no line mentions the transition note, MVP 7 or the n/a clause |
| 3 | role-title framing in a product tool | in part | **MISSED** | no line mentions the CXO doc, STARS or the prefix |
| 4 | the AI module had no run behind it | yes | **PARTIAL** | seq 22 (t14, `s8-prompt-instruction`) `missing`: "no wrong-if condition attached to the dogfood claim 'This module applies to THIS epic's own product'"; the text reads the claim as "standing in for an answer" — the module flagged as unevidenced; that the sole run cannot fire it not stated |
| 5 | the existing-PRD entry mode never specified | yes | **MISSED** | no line mentions the existing-PRD entry; t3 names a different mismatch (two commands vs three postures) |
| 6 | parity across two front ends | yes | **PARTIAL** | seq 31 (t22, `s4-accessibility-target`) `missing`: "two conformance stories left unreconciled by the document's own admission: 'Does the 44px bar apply to the CLI path? Presumed not... but the toggle means one workflow has two conformance stories'" — the two-front-ends defect on the accessibility axis, not the artefact one. **The one verdict the owner may move**: it does not name MVP 2 or parity, so by rule 3 it is not rounded up |
| 7 | prefix and Stage 10 presuppose an organisation | yes | **MISSED** | no line mentions the prefix, Stage 10 or an organisation the solo user lacks |
| 8 | "~30, all ten stages" wrong twice | no | **MISSED** (unreachable) | no line mentions the count or the stages; the PARTIAL clause (the ~30 / thirty wobble) is not met either |

**Share: 0 / 8 FOUND (3 PARTIAL). Reachable share: 0 / 5 FOUND (2 PARTIAL: 4, 6).** In-part rows: 1 PARTIAL, 3 MISSED.
Unreachable row 8 MISSED.

## AC #3 — the module's seven verdicts

Read off each question's closer exactly as `probeAudit` does (`record_decision` → ANSWERED, `flag_weak_answer` →
UNEVIDENCED, `open_question` → DODGED, none → ABSENT):

| Question | Area | Closer | Verdict |
|---|---|---|---|
| `s8-failure-who-pays` | (the module's seventh) | `flag_weak_answer` seq 21 | UNEVIDENCED |
| `s8-prompt-instruction` | prompt | `flag_weak_answer` seq 22 | UNEVIDENCED |
| `s8-conversational-memory` | conversational | `flag_weak_answer` seq 23 | UNEVIDENCED |
| `s8-agentic-controls` | agentic | `flag_weak_answer` seq 24 | UNEVIDENCED |
| `s8-grounding-sources` | grounding | `record_decision` seq 26, solution, orphan | ANSWERED |
| `s8-response-patterns` | response patterns | `flag_weak_answer` seq 27 | UNEVIDENCED |
| `s8-safety-and-trust` | safety and trust | `flag_weak_answer` seq 28 | UNEVIDENCED |

Every flag names the same defect in the document: the six areas are "a list of areas the bank will ask *other*
products about", not statements about this product. The tail's decision rate is 1 of 11.

## AC #5 — auditability

- `auditTraceability` (observed): `unbacked []` — 0 of 7 decisions without an evidence link (business 0/5, solution
  0/2), against faster-payment's 15 of 20; `unrooted [14, 26]` — two solution decisions with no stakeholder rung above
  them (structural: the package holds no stakeholder decision); parenting `eligible []`, `missed []`.
- Evidence rows: 9, all `url: null` — seven `fictional-scenario`, one `assumption`, and seq 25 `secondary-source`
  (HAX and PAIR) with no URL, the same class of row as faster-payment's seq 13.
- Wrong-if read (`.claude/reports/discovery-pre-grill-audit-run-292/wrong-if-read.out.txt`, the audit probe's fold copied
  verbatim): seq 4, 8, 10, 14, 16, 19, 26 → **7 PARAPHRASED** (11/11, 24/24, 18/19, 20/22, 22/24, 26/26, 21/24 tokens),
  0 QUOTED, 0 AUTHORED. D2's model-only claim holds; no re-record.
- `notAForm`: streak 0, longest 0, tripped false.
- The two `denied` lines: t9 and t17, `record_decision: evidence_refs entry N does not name an earlier op — this run holds
  seq 1…N−1` — the agent cited the seq it was about to be given; the applier refused, the agent re-filed with the
  evidence row's seq in the same turn. Both are in-turn corrections receipted, not built-in denials.

## The two #370 readings

- **ABSENT never fired.** 0 `open_question` over 23 turns on a document with real gaps; every non-answer became
  UNEVIDENCED. Routed to #293.
- **Re-filing.** "We'll know we're WRONG if the owner reaches for /think in the terminal for that next real product
  anyway" is the `wrong_if` of seq 4 (`s1-how-addressed-today`), seq 8 (`s1-what-would-have-to-be-true`) and seq 19
  (`s7-what-would-make-us-stop`). `prd.md` states the condition three times. Routed to #293; judged by neither.

## Tasks completed

- T0 branch from `d0e65fa`; baseline `build ✓  all 34 groups pass`
- T1 md5 on disk `ab6eb0ee…`, 24,560 bytes
- T2 `docs/epics/fixtures/discovery-partner.run-2-rubric.md` (CREATE) — `4a74848`
- T3 `tooling/run-2-ready.mjs` (CREATE) — `e8667b6`
- T4 composition (23, head = `OPENING_SET`, seven ids present; `facetPlan` `{fired:['hasModel'], fits:['hasModel'], overflow:[], count:23}`), portal smoke on 4793 (`bootSha` = HEAD, `models` both, `entryPostures['existing-prd'] ['grill']`, `depthProposals['existing-prd'] 'full-discovery'`), throwaway route open (`created true`, chars 24355, md5 `ab6eb0ee…`, total 23, `reads []`, cursor `s1-if-nobody-solves-this`; removed; PID killed)
- T5 receipts committed (`probe-fence.shape-run-2.out.txt`, `.trace.jsonl` — 13 lines, 3 deny events: 2 `PreToolUse.deny`, 1 `canUseTool.deny`)
- T6 `probe-audit.claude-opus-5.out.txt` — `ANSWERED · wrong_if PARAPHRASED (14/14)`, $0.11359915, 16,915 ms
- T7 the sitting — `discovery/partner-audit-2/{run.json,answers.jsonl,transcript.jsonl}` server-written; portal on 4794 (PID 41607) booted from `e8667b6`, killed by PID after
- T8 `discovery/partner-audit-2/prd.md` — `prd ✓  partner-audit-2 → 12 sections, 32 ops`; pointer grep 23
- T9, T10 the reads above
- T11 `tooling/build-checks.mjs` (UPDATE): 30.46 Grill's message derives its carriers, a Grill-on-Opus literal pin with derived carriers; 32.7 rows `[slug, posture, model]` with a `partner-audit-2` row resolved through `resolvePosture`; group 32 prose "three" → "four"
- T12 `discovery/README.md` (UPDATE): Files row, line 94 "only" → "first", the `reads` bullet, `## The pre-grill audit (partner-audit-2)`, the fence paragraph; `.claude/references/gates.md` (UPDATE): the run-2 gate, the fence probe's run-2 re-observation, group 32's fourth stamp
- T13 this report

## Tests added

No test files. `tooling/run-2-ready.mjs` (six checks) and two build-checks pins.

## Proving the checks

| Check | Mutation | What went red (observed) | Restored | Positive control |
|---|---|---|---|---|
| run-2-ready 1 | `FIXTURE_MD5` last hex `…377` → `…378` | `check 1 — … hashes to ab6eb0ee…377, not the frozen ab6eb0ee…378 MVP 13 prints` | md5 equal | green line under Precondition 3 |
| run-2-ready 1 | `printf '\n' >> <fixture>` | `check 1 — … hashes to 36b7855d45e618b4949a5e8e1bd2e923, not the frozen ab6eb0ee…` | `git checkout`, md5 equal | same |
| run-2-ready 2 | the natural pre-commit state | `check 2 — …run-2-rubric.md exists but is NOT tracked — commit it, or git history cannot show it predates the run` | committed | same |
| run-2-ready 3 | `reads: []` → `reads: [FIXTURE]` | `check 3 — the read fence ALLOWS docs/epics/fixtures/…pre-grill….md — the fixture ITSELF …` | md5 equal | same |
| run-2-ready 3 | the gate's regex changed to expect `Object.freeze(['Read'])` | `check 3 — portal/lib/discovery-transport.mjs no longer pins MAIN_TOOLS = Object.freeze([]) …` | md5 equal | same |
| run-2-ready 4 | `QUESTIONS = 23` → `22` | `check 4 — full discovery with hasModel composes 23 questions, not 22 …` | md5 equal | same |
| run-2-ready 5 | `discovery/partner-audit-2/run.json` created as `{}` | `check 5 — … already exists — the sitting has started …` | removed | same; and post-run the gate is red on check 5 by design |
| run-2-ready 6 | `--model claude-haiku-4-5` | `check 6 — --model claude-haiku-4-5 is not one of claude-sonnet-5 · claude-opus-5 …`, exit 1 | — | `--model claude-opus-5` and `--model claude-sonnet-5` green |
| build-checks 32.7 | `"claude-opus-5"` → `"claude-sonnet-5"` in the `partner-audit-2` row | `32.7: discovery/partner-audit-2 carries ["ba124c3c"] but the current grill (claude-sonnet-5) surface is 76b7847d — the prompt moved under a committed recording …` | md5 equal | `build ✓  all 34 groups pass` |
| build-checks 30.46 | the opus literal's last hex flipped | `30.46: Grill-on-Opus's prompt surface MOVED — ba124c3c1edb19905101aceca7c12e22. partner-audit-2 (20 turns) carry the old one and would go stale` (run while the package held 20 turns) | md5 equal | same |

Not reddened by a single mutation: check 4's "head equals `OPENING_SET`" and "every module id present" clauses (a bank
mutation is out of scope; kept because `run-1-ready` carries the same shape). Driver: the `--probe-audit` fold's failure
path is #370's (`discovery-transport.mjs:573`), read from source, not re-driven.

## Validation results

| Command | Result |
|---|---|
| `node --check tooling/run-2-ready.mjs && node --check tooling/build-checks.mjs` | ok (observed) |
| `node tooling/build-checks.mjs` (final tree) | `build ✓  all 34 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · group-count` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` (package staged) | `loc summary ✓  3 groups — no drift` (observed) |
| `node tooling/run-2-ready.mjs --model claude-opus-5` | pre-run: `run-2 ready ✓  6 checks · hasModel composes 23 · model claude-opus-5 → ba124c3c1edb19905101aceca7c12e22 · rubric committed 2026-09-14T11:12:06+01:00 · authored 2026-09-14T11:12:06+01:00`; post-run: red on check 5 by design (observed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` (observed) |
| `node discovery/prd-projection.mjs partner-audit-2` | `prd ✓  partner-audit-2 → 12 sections, 32 ops` (observed) |
| `… --stdout \| grep -c 'answer a1, 24355 characters'` | `23` (observed) |
| T7 VALIDATE `node -e` over `run.json` | `existing-prd full-discovery {"hasModel":true,"regulated":false,"internal":false,"orgBuys":false,"replacesAProcess":false} grill claude-opus-5 23 turns 1 stamp(s) 2026-09-14T10:34:59.622Z`; `answers.jsonl` 1 line (observed) |
| `sessionView('discovery/partner-audit-2')` | `metrics` as quoted under the ACs (observed) |
| `grep -c 'partner-audit-2' discovery/README.md` | `3` (observed) |
| `grep -n 'run-2-ready' .claude/references/gates.md` | one line, `:96` (observed) |
| the prose-copy grep (`the only committed existing-prd`, `three recorded posture`, `Run 2 names its frozen`) over README, gates.md, build-checks, discovery-postures | no hits (observed) |

## Not run

| Step | Why | Tracker |
|---|---|---|
| T7 through the drawer's clicks | the owner delegated ("run it all"); the plan's API loop ran instead, `frontEnd: terminal` recorded as the honest value | none — sanctioned by the plan's NOTES |
| the pointer line read in the package VIEW | replaced by the same value off the route's response (`document.md5 ab6eb0ee…`) before the first turn | none |
| a re-run of `--probe-fence` | the plan says not to; the plan-time receipt is on this tree | none |

## Deviations from the plan

- **Two commits before the sitting instead of one** (`4a74848` the rubric, `e8667b6` the gate and receipts), so checks 3–6 could be reddened on the real tree and the pre-registration timestamp is the earliest available.
- `(plan error)` **Rubric anchors**: MVP 9 starts at `:212` not `:209`; "regulated fintech" is `:157` not `:156`. Logged in the plan's AMENDMENTS.
- **The sitting was scripted, not clicked.** The plan's T7 is 23 drawer clicks; the owner delegated and the plan's own fallback (NOTES §The API loop) ran, through the same routes, same server, same package. `frontEnd` is `terminal` accordingly.
- **A credit stop at turn 21.** Not a deviation from the plan's rule (mechanism failure → resume, never edit) but a fact of the recording: one `text` line `Credit balance is too low` under `t21`, and the same question ran again under `t21` after the top-up. Stays.

## Assumptions carried

- A1 `fictional`; A3 `reads: []`; D1 `claude-opus-5`; Q1 both denominators (rubric rule 4).
- A4: the implementing session scored; the owner confirms at review — finding 6 is the one verdict flagged as movable.
- A5: the working-tree edits to `docs/epics/discovery-partner.{prd,architecture}.md`, `agent-layer/gen-decisions.mjs` and every untracked file not named by the plan are another session's and are not staged. MVP 13's text was read at `HEAD`.
- The `--probe-audit` exit code was not captured (zsh); `ANSWERED · PARAPHRASED` is the exit-0 path at `discovery-transport.mjs:573` (derived from source).

## Additions beyond the plan

- Rubric rule 4 fixes the reachable denominator (five whole, two in part, one not), which the plan left as "n/reachable".
- gates.md's group 32 entry gained a stamp-count clause (the plan said it "does not state the count"; it now states four, beside the case that asserts it).
- The README section records the credit stop and the re-filing count, which the plan asked for in the report only.

## Issues encountered

- `Credit balance is too low` at turn 21 (10:31:35Z); topped up by the owner; resumed 10:34:16Z. Cache stayed warm.
- The first `denied`-line grep on the fence trace used the wrong field name and read 0 before the format was read (3 is right).
- My closer census first showed one "none": it was the nine `file_evidence` rows, which carry no `question_id`. All 23 questions have a closer.
