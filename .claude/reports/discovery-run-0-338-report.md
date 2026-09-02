# Implementation Report — run 0: the owner's next real product, in the UI (#338)

**Plan**: `.claude/plans/discovery-run-0-338.md`   **Branch**: `chore/338-run-0`   **Status**: COMPLETE — Phase A, the rehearsal, Phase B (the owner's sitting, 2026-09-02) and Phase C
**Epic**: #279 · **Run package**: `<JOBS_DIR>/_discovery/<slug>/` (real provenance, never committed)

> This ticket is an operational run, not a code change. Nothing in `system/`, `portal/`,
> `discovery/` or `agent-layer/` is edited by it. Phase A proves the mechanism, Phase B is the
> owner's sitting and the agent does not touch the drawer or any package file, Phase C derives the
> numbers and writes the judgement. **Phase A and the rehearsal are recorded above as they were
> written; Phase B and C follow, written on 2026-09-02 after the sitting.**

## Summary

Phase A ran the whole discovery chain end to end — preflight, drawer, one real paid turn, the
projection over a `real` root — at 1/30 of the sitting's cost, and threw the rehearsal package away.
Every mechanism the sitting depends on is now proved on this machine, today. The pre-registered AC4
and AC5 sheets are fixed in `.claude/plans/discovery-run-0-338.md` §PRE-REGISTERED READINGS and were
not edited after Phase A ran.

One defect was found and fixed before the sitting: the portal serving the drawer was running code
from before both PR #339 review rounds. See F2.

**Run 0 ran on 2026-09-02, and the hypothesis reads RIGHT.** Asked whether the session started in
the UI or with `/think`, the owner's whole answer was *"UI"*. Thirty of thirty questions answered in
the drawer, a 901-line PRD projected in the same sitting, 41 minutes wall-clock, $1.64. On the five
deferred tickets the owner's note is *"not sure"* and the package's counters give no evidence that
running without any of them hurt; two of those counters cannot detect harm at all today (F9). Four
findings, F9–F12, of which F9 — the agent wrote a judgement on 2 of 30 turns — is the one that
changes what the epic should do next.

## Phase A — the mechanism, proved

Every row below was run on 2026-08-30 on this machine. *Observed* means read from the named command's
output or the named file field.

| # | Check | Command | Result |
|---|---|---|---|
| A1 | Tree on merged main | `git switch -c chore/338-run-0 origin/main` | observed — `5e8208a` (merge of PR #340); the local `feat/290-prd-projection` tip `bd72acb` is an ancestor of `origin/main`, so nothing was left behind |
| A2 | Op transport, zero tokens | `node lib/discovery-transport.mjs --preflight` | observed — `pre-flight ✓ all 8 rows pass, zero tokens`, `exit=0`, sdk 0.1.77 · zod 4.4.3 · node v20.20.2 |
| A3 | Portal answers | `curl -s localhost:4747/api/health` | observed — `{"ok":true,"hasToken":false,"jobsDir":"…/Linards jobs folder","cards":8}` |
| A4 | Derivation script vs a known oracle | the Phase C script against `discovery/spine-meridian-1/` | observed — all seven pinned values reproduced exactly (below) |
| A5 | One real turn through the drawer | the drawer at `localhost:4747`, slug `preflight-throwaway-338` | observed — answer stored verbatim, one `open_question` op filed, turn closed, cursor advanced to question 2 |
| A6 | `turnStats` populate under CLI-login auth | `run.json` `turnStats[0]` | observed — `costUsd: 0.0933`, `durationMs: 9721`, `ok: true`, all four token counts non-null |
| A7 | `endedAt` lands on Finish | `run.json` `endedAt` | observed — `2026-08-30T17:39:48.121Z`, non-null |
| A8 | Projection reads a `real` root | `node discovery/prd-projection.mjs --root "…" --stdout` | observed — full PRD to stdout, `exit=0`, nothing written to the package |
| A9 | Throwaway deleted | `rm -rf` then `ls` | observed — `<JOBS_DIR>/_discovery/` is empty |
| A10 | Repo unharmed | `node tooling/build-checks.mjs` · `node tooling/drift-check.mjs` | observed — `build ✓ all 31 groups pass`; `drift-check ✓` |

### A4 — the derivation script reproduced its oracle exactly

Run against `discovery/spine-meridian-1/` (fictional, three turns) before it is trusted at the end of
a 30-question sitting. The plan pinned seven values; all seven matched:

| Key | Expected | Observed |
|---|---|---|
| `answered_decision` | 2 | 2 |
| `weak_flagged` | 1 | 1 |
| `flagged_orphan` | 2 | 2 |
| `denied_lines` | 1 | 1 |
| `banked_turns_closed` | 3 | 3 |
| `sdk_num_turns_total` | 7 | 7 |
| `cost_usd_total` | 0.1011 | 0.1011 |

`banked_turns_closed: 3` against `sdk_num_turns_total: 7` on a three-question package — the two turn
numbers are visibly different, which is the conflation trap the plan wanted made legible before the
real run.

### A6 — the cost anchor, and why it is not a signal

The single rehearsal turn cost **$0.0933** (observed, `turnStats[0].costUsd`). That is above
`spine-meridian-1`'s $0.034/turn average, and the difference is explained by the cache: the rehearsal
was a cold first turn carrying 3,141 cache-creation tokens against 2,602 cache-read, where
`spine-meridian-1`'s average includes two later turns reading a warm cache.

Extrapolated (derived): 30 × $0.0933 ≈ **$2.80**, which sits inside the plan's pre-registered
$1.50–3.00 band. So the number is an expectation confirmed, not a signal. The real figure is AC5's
job and there is no budget to defend.

**A3 (the plan's assumption) is confirmed today.** `HAS_TOKEN` is false and the SDK authenticated via
the Mac CLI login anyway, populating every `turnStats` field. **The pre-registered token fallback is
therefore not needed** and AC5 will carry a real cost number.

### A5 — what the drawer actually did

The rehearsal answer was the plan's own mechanism stub, `mechanism rehearsal for #338 — not a real
answer`. The agent judged it and filed `open_question`, with the reason:

> Stored answer is flagged by the person as a mechanism rehearsal, not a real answer — no appetite
> judgement (quick fix, full cycle, or redesign) has actually been made yet.

That is the posture behaving as MVP 6 specifies — it judged the *form*, did not call the answer wrong,
and did not supply what was missing. `answers.jsonl` stored the text verbatim, `#discovery-recorded`
showed the filed op, and the cursor advanced by exactly one turn.

## Tasks completed

- Verify the tree, pin `JOBS_DIR`, branch off `origin/main` → `chore/338-run-0` (no file change)
- Zero-token transport preflight → `portal/lib/discovery-transport.mjs --preflight` (run only)
- Boot the portal from the current tree → `portal/server.mjs` (run only; see F2)
- Smoke-test the AC5 derivation script against `discovery/spine-meridian-1/` (run only)
- One real rehearsal turn through the drawer, then deleted (run only, never committed)
- Prove the projection against a `real` root with `--root --stdout` (run only)
- Pre-register the AC4/AC5 sheet → `.claude/plans/discovery-run-0-338.md` §PRE-REGISTERED READINGS
- Write this report → `.claude/reports/discovery-run-0-338-report.md` (CREATE)

## Tests added

None, and none should be. There is no suite for a run package on disk and the plan says so: the run
*is* the test, and what replaces a suite is the pre-registration plus three checks that can fail —
the preflight, the derivation-script oracle, and Phase C's verbatim-span scan. **No gate in
`tooling/` reads a run package on disk**, by design, so `build ✓ all 31 groups pass` says the repo is
unharmed and says nothing about this run.

## Validation results

| Gate | Result |
|---|---|
| `node lib/discovery-transport.mjs --preflight` | ✅ 8/8 rows, zero tokens, `exit=0` (observed) |
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 31 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks (observed) |
| `curl localhost:4747/api/health` | ✅ `ok: true` (observed) |
| Derivation script vs `spine-meridian-1` oracle | ✅ 7/7 pinned values (observed) |
| `prd-projection.mjs --root … --stdout` | ✅ `exit=0`, nothing written (observed) |
| `git status --short` | ✅ no `discovery/` or `_discovery` path (observed) |

## Deviations from the plan

**D1 — the rehearsal turn was driven through the drawer by browser automation, not by hand.**
The plan's Task 4 says "in the drawer". An agent cannot click, so the drawer was driven with
`agent-browser` against the real page at `localhost:4747` — the real form controls, the real
`/api/discovery/*` routes, the real CSRF origin guard. The alternative considered and rejected was
curling the routes directly, which would have proved the SDK and the package writer but not the
drawer's JS, and the drawer's JS is the one piece no gate in `tooling/` reaches. Since the owner is
about to spend a sitting on exactly that path, proving it was worth the extra step. **This is the
agent's own Phase A rehearsal on plan-supplied stub text, not an answer** — the honesty rule forbids
hand-*writing* `answers.jsonl`, and here the server wrote it through the sanctioned route.

**D2 — the free smoke test was run before the paid rehearsal turn.** The plan orders them
rehearsal → projection → smoke test. The smoke test costs nothing and validates the derivation
script's plumbing against a known oracle, so running it first meant a scripting error would surface
for free rather than after spending. No plan content changed; only the order.

**D3 — Phase A ends at a hard stop, so this report is PARTIAL by design.** Sections for AC3, AC4,
AC5 and AC6 are not written because the sitting has not happened. They are Phase C's, and writing
them now would be the exact fabrication the plan's opening box forbids.

## Issues encountered

**F2 — the portal was serving code from before both PR #339 review rounds. Fixed before the sitting.**
Port 4747 was already held by `node server.mjs` (PID 12566) started **Sat 29 Aug 09:26**. On
`origin/main`, `portal/server.mjs` and `portal/lib/discovery.mjs` were last changed at **10:18** that
day (`8f25acc`, PR #339 round 1 — *"the op append lands before…"*) and
`portal/lib/discovery-transport.mjs` at **10:37** (`f4449e9`, round 2). Node caches modules at import
time, so that process could not have been running either fix. A 30-question sitting against it would
have produced a package written by pre-review code.

Fixed by stopping PID 12566 and restarting from the current tree (now PID 68762, verified by
`lsof` and a fresh `/api/health`). **The killed process may have belonged to a parallel session in
this shared worktree** — it was started from this same `portal/` directory.

Nothing surfaces this. `/api/health` returns `ok`, `hasToken`, `jobsDir` and `cards`, and no commit or
version stamp; the drawer looks identical either way; no gate in `tooling/` inspects a running server.
**Candidate follow-up ticket**: add the HEAD commit to `/api/health` so a stale portal is visible
rather than inferred from `ps`.

## Findings so far

**F1 — the projection is CLI-only, and a UI-only operator cannot get their PRD.** #290 shipped the
fold CLI-only and its PR says so: *"no portal route or page reads the projection in this ticket."* So
the honest description of the chain is that the *session* is entirely in the UI, and one terminal
command afterwards produces the PRD. The plan takes the plain reading of AC1 — it governs the session,
which the drawer does carry end to end — and logs the gap rather than patching it, because patching it
before run 0 would mean run 0 measured something that did not exist when the epic's other runs were
planned. This bites the epic's secondary user hardest: an invited guest with no terminal cannot
complete the workflow at all today. *Re-scope — belongs on #279 as an amendment, plus a candidate
follow-up ticket.*

**F2** — above. *Candidate follow-up ticket.*

**F4 — the #287 pre-registered counter rests on a false premise, and is corrected here BEFORE run 0.**
§PRE-REGISTERED READINGS table 2 predicts `denied: 0` for #287, reasoning that `tools: []` plus
`allowedTools: []` *"leave nothing to deny, so the fence has no work in this run."* The full-depth
rehearsal below observed **17 denied lines, 12 of them the agent calling `Bash`** to `ls` the run
directory, each refused with `Bash is not one of this run's op tools`. Built-in tools are reachable
and the refusal is doing real work every turn.

The correction is made **now, before the measured run**, and only because the premise is factually
false rather than because the number came out inconvenient — changing a counter after run 0 to suit
its result would be the exact failure pre-registration exists to prevent. **Corrected counter for
#287: `denied` lines split by tool — refusals of built-ins (expected non-zero, the fence working) vs
refusals of op calls (the applier correcting the grammar). A zero in the first column would be the
surprise, not a non-zero.** *Re-scope — belongs on #279 as an amendment.*

**F5 — the agent never fills `parent_id`; the requirement hierarchy does not work end to end.**
Filed as **[#341](https://github.com/linardsb/ux-factory/issues/341)**. In the 30-turn rehearsal, all
29 `record_decision` ops passed `parent_id: null`. Ten are correct (business has no parent); of the
other 19, **14 had a valid stakeholder parent available in the ledger and filed null anyway**. The
agent tried five times and named the wrong rung every time — four of the five named a *sibling*
`solution` decision — and its recovery after each refusal was `null`, never a retry at the rung the
applier's error message names.

No gate can see this: group 29 drives the applier over fixtures that already carry `parent_id`, group
31 projects a populated hierarchy, and group 30 pins the prompt as strings without running a turn.
The applier, the projection and the tests are all correct and the feature is inert in practice — the
same shape as [[check-that-cannot-fail]]. *Follow-up ticket, filed.*

**F6 — no answer produced evidence, so all 29 decisions rest on nothing.** Zero `file_evidence` ops
across 30 substantive answers, and the Evidence section renders its empty state followed by a line
naming all 29 unbacked decisions. `file_evidence` takes a `url`, so an answer that *describes* its
evidence in prose files nothing — the rehearsal's answer to `s2-last-time-show-me` named a
spreadsheet and a WhatsApp thread and produced no row. This is partly an operator lesson (paste real
URLs) and partly the #289 evidence path having no route other than a URL appearing in free text.
*Re-scope — belongs on #279 as an amendment.*

**F3 — the drawer's provenance control defaults to `fictional`, which is the committing one.**
Observed on the freshly opened drawer: `#discovery-provenance` opens on `fictional`, whose note reads
*"the package is written to `discovery/<slug>/` in this repo and committed as evidence."* For a real
product that default writes an unreleased product's discovery session into a public repo, and the only
thing preventing it is the operator noticing. The safer default for a control whose wrong value is
unrecoverable-by-git would be `real`. *Re-scope — belongs on #279 as an amendment.*

---

## The full-depth rehearsal — NOT run 0

After Phase A was committed (`93dfb57`), the owner ran a complete 30-question `full-discovery`
session to see the chain work at depth before spending a sitting on their real product. **It is not
run 0 and is not reported as such:** the answers describe a fictional product (a controlled-drugs
register reconciliation tool), written by the agent at the owner's request and pasted in by the
owner. It satisfies no acceptance criterion. It is recorded here because it is where F4, F5 and F6
came from, and because it de-risks the real sitting.

Package: `<JOBS_DIR>/_discovery/my-product-name` — never committed.

| Number | Value | Kind |
|---|---|---|
| Answers stored | 30 of 30 | observed |
| Banked turns closed | 30 · unreached 0 | observed |
| Decisions filed | 29 (`record_decision`) | observed |
| Weak-flagged | 1 (`s6-audit-trail`) | observed |
| Abandoned (`open_question`) | 0 | observed |
| Evidence filed | 0 | observed |
| Flagged `no-evidence` | 29 | observed |
| Flagged `orphan` | 19 | observed |
| Denied lines | 17 (12 `Bash`, 5 parent-rung) | observed |
| Ladder spread | business 10 · stakeholder 3 · solution 15 · transition 1 | observed |
| SDK turns (model-internal) | 67 | derived |
| Per-turn latency | min 7.2s · median 10.1s · max 21.9s · Σ 5m 41s | derived |
| Total cost | **$1.488** over 30 turns | derived |
| Wall-clock | not meaningful — Finish was pressed the next morning | — |

**The cost estimate held.** Phase A extrapolated $2.80 from a single cold turn; the real figure is
**$1.49**, about half, because cache reads dominate once the session is warm. The pre-registered
$1.50–3.00 band was correct at its lower bound. For run 0, **expect roughly $1.50**, not $2.80.

**The projection works, and does more than bucket answers.** 463 lines, 11 sections, all four ladder
rungs populated. `Hypothesis` folded the `wrong_if` of every business and stakeholder decision into 13
named falsifiers, then declared its own limit rather than inventing the rest: *"The 'We believe … will
cause … resulting in' half is the human's to write: the ops carry falsifiers, not a belief
statement."* `Non-goals` cross-referenced both exclusion questions to the sections that already held
them instead of re-rendering the text twice.

**Two operator lessons for the real sitting**, both cheap to avoid:

- **Press Finish when you actually finish.** It was not pressed; `endedAt` was null until the session
  was closed the following morning, which makes the wall-clock figure 967 minutes and worthless. It
  cannot be reconstructed from file mtimes honestly, so the number is simply lost for this run.
- **Paste real URLs.** See F6 — prose about evidence files nothing.

**One shape to avoid repeating:** provenance was set to `real` while the content was fictional, so
`run.json` carries `label: "Real run — real product"` over invented answers. Nothing leaked, because
`real` keeps it outside the repo. But the package is self-describing and it describes itself wrongly,
which is why it is named here as a rehearsal in as many words.

---

## Phase B — the sitting. Owner only, 2026-09-02

The owner answered all thirty questions in the drawer in one sitting, on their own unreleased
product. The agent did not touch the drawer, the textarea or any package file. Every figure below is
read from the package by the plan's derivation script or by a counting script that prints ids and
numbers only; no answer text, no agent prose and no product detail was read into this report.

### What ran

| Field | Value | Source |
|---|---|---|
| Slug | `run0-2026-09-02` | `run.json` |
| Provenance | `real` — package at `<JOBS_DIR>/_discovery/run0-2026-09-02/`, never committed | `run.json`, `ls` |
| Entry mode · depth · branch | `blank-idea` · `full-discovery` · none | `run.json` |
| Front end · model · posture | `portal` · `claude-sonnet-5` · `think`, fingerprint `7efdde37…` | `run.json`, `turnStats[].postureFingerprint` |
| Portal build | `14f7421`, the tree's HEAD — `/api/health` reported `stale: false` | observed before the first turn |
| Started · ended | `2026-09-02T16:24:46Z` · `2026-09-02T17:05:20Z` | `run.json` |
| Last turn's stamp | `17:03:34Z` — Finish was pressed 1m46s after it | `turnStats[29].ts` |

**F2's field earned its keep on its first real outing.** The process holding port 4747 when the
sitting was set up had booted from `7084c37`; `/api/health` said `stale: true` and the drawer would
have shown the warning. It was stopped by PID and restarted from `14f7421` before Start was pressed
(observed). The one commit between the two shas was documentation, so the code would have been
identical — the point is that this time the fact was a field rather than a `ps` archaeology.

### AC3 — the hypothesis, answered

**RIGHT.** Asked *"did you start in the UI, or reach for `/think`?"*, the owner answered, in full:
**"UI"**. The session started in the drawer, ran to thirty in the drawer, and ended in a projected
PRD in one sitting; `/think` was not reached for. That is the owner's word, unparaphrased — the
answer was one word, and it is recorded as one word.

### AC4 — the judgement on the five deferred tickets

The pre-registered counters (plan §PRE-REGISTERED READINGS table 2, corrected for #287 by F4)
filled from the package, paired with the owner's note from the sitting. Verdict vocabulary: hurt /
did not hurt / no evidence either way.

**#283 — bank width.** Counter: questions asking for a quality attribute, structurally **0** (the
non-functional block is #283's and is not in `bank.mjs`); `off_script` ops as a proxy for wanting
one, **0** (observed). Owner's note: *"not sure"* — the owner's whole note on all five (Q3) — and, from
AC7's walk, *"all landed"*. Verdict: **did not hurt** on the questions-asked half — by the owner's
walk no question read wrong for this product; **no evidence either way** on the quality-attribute
half — an absence the owner did not miss is not proof it was not needed.

**#285 — session rules.** Counters (observed): `flag_weak_answer` **0**; longest run of consecutive
closed turns with no `record_decision` **0**; repeat weak flags on one `question_id` **none**. Every
one of the thirty turns closed with a `record_decision`. The "not a form" counter is therefore
saturated in the direction the epic did not expect: the ladder never stepped down, never asked twice,
never parked. Two readings fit the package and it cannot choose between them — thirty strong answers
from the person who owns the product, or a posture that files whatever it is given when the answer
is long and fluent (median 305 words; see F9). Owner's note: *"not sure"*. Verdict: **no evidence either way** — and
the counter cannot currently detect harm (F9), so this row is not decidable from a Think run until
the yield contract requires the judgement in prose.

**#286 — postures.** Counter: alternatives available **0** by construction (Think is the shipped
posture; Think on Opus is the same prompt on another model). Owner's note: *"not sure"*. Verdict: **no evidence either way**.

**#287 — the read fence.** F4's corrected counter, `denied` lines split by tool: built-ins refused
**0**, op-tool refusals **0** (observed; `reads: []`). The rehearsal's agent tried `Bash` twelve
times; this run's agent never reached for a tool it did not have, and the CLI's warmup agents left no
line either — F7's 79 did not recur. A fence with nothing to catch is not evidence the fence works,
so the counter reads *no evidence either way* on the mechanism; the owner's note is the only signal
on the need. Owner's note: *"not sure"*. Verdict: **no evidence either way**.

**#289 — look it up, park it, the escape hatch.** Counters (observed): `open_question` **0**;
`file_evidence` **10** across three turns, all filed by answer reference — **0** carry a URL, and
**0** of the thirty answers contain one; `off_script` **0**; the drawer has no park control. Owner's
note: *"not sure"*, and from AC7's walk *"all landed"*, so nothing needed parking. Verdict: **did
not hurt** on the park half — no question on this run needed a park control; **no evidence either
way** on the evidence half — F11's 23 unbacked decisions are the number the route will be judged
against.

### AC5 — the numbers

The plan's derivation script, run unchanged against the package (observed unless marked derived):

| Number | Value |
|---|---|
| Questions in the depth | 30 |
| Answers stored | 30, all `banked` |
| Banked turns closed · unreached | 30 · 0 |
| — answered (`record_decision`) | 30 |
| — weak-flagged · abandoned | 0 · 0 |
| Evidence filed | 10 (`real-interview` 9 · `assumption` 1), 0 by URL |
| Decisions flagged `no-evidence` | 23 of 30 |
| Decisions flagged `orphan` | 0 — `parent_id` filled on all 22 non-business decisions |
| Ladder | business 8 · stakeholder 5 · solution 10 · transition 7 |
| Denied lines · text lines | 0 · 31 |
| SDK turns (model-internal) | 70 (derived, Σ `numTurns`) |
| Per-turn latency | min 7.7s · median 11.5s · max 29.3s · Σ 6m 45s (derived) |
| Total cost | **$1.6355**, no missing turns (derived, Σ `costUsd`) |
| Tokens | in 124 · out 27,564 · cache read 2,012,221 · cache create 72,202 (derived) |
| Wall-clock, `endedAt − startedAt` | **41 min** (derived) |
| Started to last turn | 39 min (derived) |

**Two turn numbers, not one.** Thirty banked turns; seventy model-internal turns. Twenty-six of the
thirty ran in exactly two SDK turns (judge, file); the four that ran longer are the four
evidence-filing turns, 3, 4, 8 and 16, one tool call per evidence row (turn 16 is F10).

**Wall-clock, and what it holds.** The owner's estimate for the sitting is 45 minutes, against the
package's 41 (`startedAt` is stamped at Start, after the slug and provenance were chosen). The owner
states the answers were written in the sitting, not beforehand (Q5, in full: *"no, it took 45
mins"*). The thirty answers total 9,228 words (min 183, median 305, max 448; derived from
`answers.jsonl` word counts). The agent's share of the 41 minutes is 6m 45s, which leaves about 34
minutes of owner time for the thirty, or roughly 270 words a minute (derived). That is dictation
speed rather than typing speed; the package records what was submitted and nothing about how it was
composed, so the owner's statement stands and the arithmetic sits beside it.

**Cost.** $1.64 against the rehearsal's $1.49 and Phase A's cold-turn extrapolation of $2.80 — inside
the pre-registered $1.50–3.00 band. The per-turn cost drifts up rather than holding flat: the first
ten turns average $0.053 and the last ten $0.060 (derived), because every turn resumes the same SDK
session and re-reads its whole history — cache read grows from 3.8k tokens on turn 1 to 125k on turn
30. Cache reads are cheap, so a 30-turn run is linear enough; the 65-question `whole-bank` depth pays
for the tail twice.

**Latency.** Median 11.5s against the rehearsal's 10.1s; the two slowest turns (27.8s, 29.3s) are
the evidence-filing turns 3 and 4, where the agent made five and four tool calls.

### AC2 — the PRD

`prd.md` is in the package: **901 lines, 11 sections, 40 ops folded** (observed:
`prd ✓ run0-2026-09-02 → 11 sections, 40 ops`, `exit=0`). Thirty decision blocks, one per answer;
**30 of 30 carry a `Wrong if` line**; 30 of 30 carry an `Evidence` line, of which **7 name evidence
and 23 read `none · no-evidence`**. Sections by rung: Problem 8 business, Target user and JTBD 5
stakeholder, MVP 10 solution, Transition note 7 transition; Open questions and Weak answers render
their empty states. So AC2's "every decision carrying its evidence link and kill criterion" holds
for the kill criterion outright and for the evidence *link* as a slot that 23 decisions leave empty —
the projection says so on each of them rather than hiding it.

**The owner got the PRD without a terminal.** F1's Download PRD control was used from the drawer.
The downloaded file and `node discovery/prd-projection.mjs --root … --stdout` were byte-identical
(observed, `cmp`), and after Finish the only diff between the download and the package's `prd.md`
is the run header's `ended` field (observed, `diff`: one line).

### AC7 — the transcript as facet evidence

This run is unbranched and carries no `facets` field, so it exercises nothing in the
question-selection architecture; what it offers is the first real material. The machine reading
first, then the owner's walk.

**The machine reading is empty.** No question was abandoned and none was weak-flagged, so the
package alone names zero misses. D4's "asked what mattered" row is saturated: decision rate on the
twelve **12 of 12**, on the eighteen-question tail **18 of 18**. A counter that cannot go down cannot
rank the tail against the twelve, which is F9's point from the other side.

**Candidates from the answers, by phrasing only.** A scan for do-not-know / not-sure / never-asked
phrasing (counts and ids, no text) marks **7** answers: `s6-process-as-it-runs`,
`s1-what-would-have-to-be-true`, `s4-rabbit-holes`, `s1-choice-cascade`, `s2-more-than-one-way`,
`s3-deliberately-not-doing`, `s5-willingness-to-pay`. A not-applicable scan marks **0**. Every
answer is 183 words or longer, so no question was waved through. A do-not-know phrase inside a
300-word answer is a weak proxy — it can be an honest "not yet" inside a decision that landed — which
is why the list below is the owner's, not the scan's.

**The owner's walk.** *"all landed"* — zero misses. The seven phrasing candidates above were
honest not-yets inside decisions that landed, and the facet check has no miss to predict.

**The owner's facet vector for this product** was not declared in this sitting. With zero misses
the vector has no prediction to make, and D1's falsifier — *"a real product routinely ticks three or
more facets"* — stays untested by this run.

**Would the facets have predicted each miss?** D1's "what it fires" column maps the tail this way
(expected — the modules are not in `bank.mjs` yet, so this is the doc's table read against the
ids, not a selection run): `s5-value-metric` and `s5-willingness-to-pay` sit on `orgBuys` and are
dropped by `internal`; `s6-audit-trail` on `regulated`; `s6-coexist-with-incumbent` on
`replacesAProcess`; `s8-failure-who-pays` on `hasModel`; `s6-process-as-it-runs` (in the twelve) on
`internal` / `replacesAProcess`. The other thirteen tail questions — `s1-choice-cascade`,
`s1-premortem`, `s2-more-than-one-way`, `s2-last-time-show-me`, `s2-switch-timeline`, `s3-why-now`,
`s3-deliberately-not-doing`, `s4-press-release`, `s4-four-risks`, `s4-circuit-breaker`,
`s7-kill-state-and-date`, `s7-goes-up-doing-nothing`, `s9-strength-of-evidence` — are not
facet-gated in D1, so a miss on any of them is a bank finding or a sixth-facet candidate by the
ticket's own rule. With no miss on the owner's walk there is nothing to read against the map; it is left here for
the second, faceted run. What this run does say to #283: thirty unfaceted questions all landed for
one real product, so the unfaceted `full-discovery` list is not visibly asking the wrong questions
here — a single data point, and the bank finding the ticket asked for is "none found".

## Findings — continued from F8

**F9 — the agent judged aloud on 2 of 30 turns; on the other 28 its only prose is the filing
confirmation.** Text lines per turn (observed, lengths and masked shapes only): turns 1 and 30 carry
a judgement paragraph (471 and 538 characters) plus the confirmation; turns 3, 4 and 8 carry a single
133–156 character confirmation that also names the evidence rows filed; the remaining 25 turns carry
exactly one line, 57–62 characters, of the shape `Filed as a <rung>-level decision (seq N), parent
seq N.` A scan for the form-gap vocabulary MVP 6 licenses ("does not name", "no number", "not
stated" and kin) hits **0** lines. `YIELD_CONTRACT` opens *"Judge this one answer. Push back at most
once, in prose"*, and on 28 turns there is no prose to have pushed back in. This is not a claim the agent judged badly — it may have judged well and
silently — but `discovery/README.md` keeps the agent's text *because MVP 6 is only falsifiable from
prose*, and on 25 of 30 real turns there is nothing to falsify. Paired with #285's counters (0 weak
flags, 0 open questions, 30 decisions), the package cannot tell a strong answer set from a
rubber-stamping posture. *Re-scope — belongs on #279 as an amendment, and it is the precise thing
`discovery-postures.mjs` says gets tightened: the yield contract should require the judgement as a
text line before the op, so a turn with no judgement is dirty by the same rule as a turn with two
ops.*

**F10 — turn 16 hit `MAX_TURNS = 6` and is recorded `ok: false` although every op landed.**
`turnStats[15]`: `numTurns: 6`, `ok: false`, `$0.072` (observed). The transcript for that turn holds
four `file_evidence` ops and one `record_decision`, seq 22–26, the decision closing the turn; the
cursor advanced; there is no text line for the turn, because the cap fell before the confirmation.
`ok` is `msg.subtype === 'success'` in `discovery-transport.mjs`, and six tool calls in a six-turn
cap is not success to the SDK. The cap was sized before `EVIDENCE_RULE` (#338 F6) made
multi-evidence turns likely; this is the first real turn to show the two colliding. *Follow-up
ticket: size the cap to the evidence rule (or make it evidence-aware), and decide what `ok: false`
with a complete transcript should mean to the drawer.* The owner saw no error on question 16 (*"i did not see any
error"*), so `ok: false` is a package-only fact today: the stream ended on `done` and the status
line read as on any other turn.

**F11 — on a `blank-idea` product the evidence is people and conversations, and the URL route is the
wrong shape for it.** Ten evidence rows were filed, nine as `real-interview` and one as `assumption`,
all by answer reference with a name; none by URL, and none of the thirty answers contains a URL
(observed). The rehearsal's lesson was "paste real URLs"; this sitting shows why the owner could not
— for a product that does not exist yet there is little on the web to point at, and what there is
lives in messages and memory. `EVIDENCE_RULE` (F6) handled that honestly, filing what was named
rather than nothing, and #347's provenance rule labelled it correctly on a real run (`real-interview`
is now a true statement, where F8's fixture wore it falsely). What remains is that 23 of 30 decisions
rest on nothing the ledger can name. *Re-scope — #289's evidence path needs a non-URL form for
`blank-idea` runs, and the "23 unbacked" line is the number it should be measured against.*

**F12 — the downloaded PRD landed inside the public repo's working tree.** The browser saved
`run0-2026-09-02-prd.md` to the repo root, where `git status` showed it untracked — one `git add -A`
from committing a real product's PRD. It was moved to
`<JOBS_DIR>/_discovery/run0-2026-09-02-prd.download.md` before anything was staged (observed:
`git status --short` shows no such file). The portal cannot choose where a browser saves, but the
drawer's status line after a download can say where the package lives and that the file must not be
saved inside the repo. *Candidate follow-up ticket.*

## AC6 — attestation

| Check | Result |
|---|---|
| 1. Nothing from the package staged or present in the repo | observed — `git status --short` carries no package path and `ls discovery/` lists only the committed fictional packages and the three modules. The plan's grep matches one untracked filename, `__run0_discovery_worksheet.md`: that is the empty thirty-question sheet, 134 lines, unchanged since 2026-08-31 and holding no answer text (observed); it is not part of the package and stays untracked |
| 2. No verbatim answer span in this report | observed — the plan's 8-word span scan over all 30 answers against the final text: `no verbatim answer span in the report` |
| 3. What the report may say about the product | owner's sign-off, in full: *"report should be named after product slug"* — the report refers to the product by its run slug and names neither the product nor its domain; `run0-2026-09-02` is the only handle, throughout |

## Validation results — Phase C

| Gate | Result |
|---|---|
| `node discovery/prd-projection.mjs --root "$R"` | ✅ `prd ✓ 11 sections, 40 ops`, `exit=0`, 901 lines (observed) |
| Derivation script (plan, unchanged) | ✅ ran; every AC5 row above is its output (observed) |
| `cmp` download vs `--stdout` projection | ✅ identical (observed) |
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 33 groups pass` (observed, 2026-09-02) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks (observed, 2026-09-02) |
| Publication-safety check 1 | ✅ clean (observed) |

## Deviations from the plan — Phase C

**D4 — Finish was pressed after the PRD was downloaded, not before.** The download happened at
`18:03` local with `endedAt` null; Finish landed at `17:05:20Z`, 1m46s after the last turn. The
plan's wall-clock number survives because the lag is under two minutes and is stated; the package
`prd.md` was projected *after* Finish, so it carries the end stamp and the download does not (one-line
diff, observed). Nothing was re-run.

**D5 — the projection was written from the CLI after the UI download.** The plan's Phase C step
writes `prd.md` into the root with the CLI; F1's control made the UI download possible first. Both
were done and compared; the CLI write is the one the package keeps.
