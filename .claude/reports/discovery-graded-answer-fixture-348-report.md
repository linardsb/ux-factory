# Implementation Report — the graded answer fixture (#348)

**Plan**: `.claude/plans/discovery-graded-answer-fixture-348.md`
**Branch**: `feat/348-graded-answer-fixture` (from `origin/main` at `977ab11`)
**Status**: **COMPLETE for the scope the owner chose — C2 only.** Phases A, B, C1 and C2 done, scored and
committed. C3's four runs were deliberately not run (see §The C3 decision). D1's score, D2's MVP 6 read
and D3's README are below.

Every row below is labelled *observed* (I ran it), *derived* (arithmetic, shown) or *expected*
(assumption).

## Summary

The fixture's sealed half is built, committed and gated. The realism brief, the sealed draw and the
scorer landed **before a word was authored**; the fenced author harness and the run driver landed with
them because build-checks group 33 source-pins the harness's fence, and a gate case pending against a
file the same PR adds later is a gate case nobody reads. The author's fence was then proved at run time,
not only from source, and the 195 answers were authored blind and sealed.

What has **not** happened: C3's four runs. The owner chose C2 alone — a complete two-posture reading on
one answer set — over per-question coverage.

**The most important result of this session is that the FIRST sealed fixture was void, and a subagent
audit caught it before a penny of Phase C was spent.** See §The fixture that was thrown away.

## Tasks completed

| Plan task | Artifact | |
|---|---|---|
| A0 branch from clean main | `feat/348-graded-answer-fixture` off `origin/main` | ✅ |
| A1 the realism brief | `docs/epics/fixtures/graded-answers/brief.md` | CREATE |
| A2 the draw's pure half | `tooling/discovery-score.mjs` | CREATE |
| A3 the sealed draw | `docs/epics/fixtures/graded-answers/draw.json` | CREATE |
| A4 the scorer | `tooling/discovery-score.mjs` | UPDATE |
| A5 the byte-equality check | `tooling/discovery-score.mjs` `assertAnswersSealed` | UPDATE |
| A6 build-checks group 33 | `tooling/build-checks.mjs` | UPDATE |
| A7 the cascade sites | `CLAUDE.md` · `.claude/references/gates.md` · 3 sites inside `build-checks.mjs` | UPDATE |
| A8 commit Phase A | `20f7150` | ✅ |
| B1 the fenced author harness | `portal/record-graded-answers.mjs` | CREATE |
| B1 the fence receipt | `author/transcript.jsonl` — 10 denied reads | CREATE ✅ |
| B2 the author run | 65 questions, blind, **twice** (the first was void) | ✅ |
| B3 the sealed key | `key.json`, 195 entries, `6401754` | CREATE ✅ |
| C0 the run driver | `portal/record-graded-run.mjs` | CREATE |
| D3 the README section | `discovery/README.md` §The graded answer fixture (#348) | UPDATE |
| B4 commit Phase B | `476dd51` — the fence receipt and the harness hardening only | PARTIAL: **the seal is outstanding** |
| C1–C3, D1–D2 | **not run** — blocked, and behind the plan's paid gate | ⛔ |

## Validation results

**Level 1 — the gate** (observed):

```
node tooling/build-checks.mjs                  → build ✓  all 33 groups pass
node tooling/drift-check.mjs                   → ✓ (12 checks)
node agent-layer/gen-loc-summary.mjs --check   → loc summary ✓  3 groups — no drift
```

**Level 2 — the new surfaces** (observed):

```
node tooling/discovery-score.mjs --check-draw  → draw ✓  65 questions × 3 runs, every question meets all three kinds
node tooling/discovery-score.mjs --selftest    → all five columns exercised, matrix sums to 5
node tooling/discovery-score.mjs --check-key   → key ✓  195 answers, 65 questions × 3 kinds, every expected op derived
```

**Level 5 — the mutation sweep.** Eight mutations driven, each red naming the right thing, each
restored with the file's md5 re-checked equal to the pre-mutation hash (observed):

| # | Mutation | Went red on |
|---|---|---|
| M1 | one row's `b` flipped in `draw.json` | 33.1, naming `s2-why-do-you-want-it` and printing committed vs derived |
| M2 | `drawFor` gains a posture parameter | 33.1's arity pin |
| M3 | `CLOSES_WHEN` drops the `off_script` term | 33.4 and 33.5 — the off-script decision counts as a close |
| M4 | `file_evidence` folded into the matrix | 33.4 and 33.7 — the matrix sums to 7 over 5 turns |
| M5 | the author's `cwd` points at the repo root | 33.9, naming the cwd trap |
| M6 | a clock lands in the scorer | 33.11 |
| M7 | `prd-projection.mjs` names a fixture slug | 33.14, naming the file |
| M8 | the harness calls `allowSetFor` | 33.9, both halves |

## THE CONTROL — proved twice, from source and at run time

The whole ticket rests on the answer author never having seen a weak-answer note.

**From source** (33.9, 33.10, observed in CI): no `allowSetFor`; a hand-built allow-set whose `paths` is
length 1; `cwd` equal to the author root inside the same `query({ options })` block; tools advertised so
a denial is *recorded*; both fence sites wired; the question view pinned to `forTheBrowser`'s five fields.
Six leak paths driven through the real `allowsPath` as **absolute** paths — a relative path resolves
against `allowSet.root` and would be ALLOWED, so the case would have passed while proving the opposite.
A repo-rooted allow-set allowing all six is the positive control.

**At run time** (`node record-graded-answers.mjs --probe`, PAID, $0.052 observed):

```
probe ALL_FOUR_REFUSED · 4/4 attempted, 4 refused by the SDK's own is_error, 0 leaked · 4 denied lines
  denied via PreToolUse  Read  discovery/bank.mjs
  denied via PreToolUse  Read  docs/research/question-bank-source.md
  denied via PreToolUse  Read  docs/epics/discovery-partner.prd.md
  denied via PreToolUse  Read  discovery/instrument-loans-1/transcript.jsonl
```

"Denied" is read off the SDK's own `is_error`, never off the fence that claims the refusal. The four
lines are committed at `docs/epics/fixtures/graded-answers/author/transcript.jsonl`.

**A fifth leak the plan did not name.** `.mcp.json` registers a `codebase-search` MCP server, and the
author's `cwd` is inside this repo. A repo-search tool would reach every weak-answer note while carrying
no path the path-fence inspects. It is denied by name at both fence sites (`fenceDecision` allows only
this run's op tools and `Read`/`Grep`/`Glob`), and `strictMcpConfig: true` keeps it off the advertised
surface entirely. Both are asserted in 33.9 and 33.10.

**And the mirror** (33.12, #291's rule: *omission is not a fence*). A recorded run's own
`allowSetFor({ root, reads: [] })` is driven against `key.json`, `draw.json`, `brief.md` and the author's
transcript — all four denied — with the run's package and the bank allowed as the positive control and a
widened-`reads` set shown to reach the key, so the case can fail.

## The fixture that was thrown away, and why that is the session's real result

The first 195 answers were authored, validated, and **void**. A subagent audit found it before Phase C
spent anything.

**A three-rule classifier the auditor wrote before reading a single answer scored 85.6% on it, with zero
K2→K1 confusions.** The separators were not form:

| | first run | after the fix |
|---|---|---|
| surface classifier (chance = 33%) | **85.6%** | **41%** |
| K2 names a person | **0/65** | 61/65 |
| K2 names a month | **0/65** | 29/65 |
| K2 shorter than its own K1 | 64/65 | 29/65 |
| `"I'd want to check"` in K1 | 31/65 | **0** |
| K1 / K2 / K3 median words | 91 / 61 / 77 | 96 / 95 / 93 |

Categorical absence across 65 attempts is a mechanical rule, not thin writing. Scoring C2 against that
would have produced a flattering number measuring whether a grader can spot a name and a word count.

**The root cause was the brief, not the author.** It said *"you do not remember the previous ones"* and
*"never write in the same register twice in a row"* — a stateless author cannot obey that, so the
instruction was decorative. And 48% of K1 answers reused a phrase lifted from the brief's **own worked
example**, under a rule that said never to copy it.

**Varying register needed a mechanism, not an instruction:**

- `VOICES` rotates the speaker and their distance from the topic **by question index** — a pure function,
  no state, no resume, no contamination, recomputable by the gate. The four founders are pinned on the
  fact sheet by name and role, which also fixed the first run's Priya-is-both-a-founder-and-a-customer
  collision.
- `checkAnswers` refuses the seven phrasings the first run turned into tics and refuses a K2 under 80
  words. **Mechanical, because a prompt instruction is exactly what failed.** A failure re-runs that one
  question; nothing is hand-repaired.
- The brief now says K2 **may** name people and dates and often should — *"Marek looked at this in
  February and reckoned it was mostly fine"* names both and carries no fact about the question. That is
  the hardest and most realistic kind of thin, and the first run produced none of it.

K1 and K2 are now inseparable on surface (median 96w vs 95w, names a person 91% vs 94%), which is the
discrimination MVP 6 actually claims. K3 stays recognisable, and that is faithful: an answer saying "I
have not found this out" *should* be.

## The second audit — substance

A second subagent read all 65 questions **slot-first**, writing down which slot each question reaches for
before reading either answer. Verdict **PASS**:

- **K1 wins its slot 65/65. No inversions.** Stripping the fact sheet's own figures, K1 carries a new
  checkable quantity in ~60/65 and K2 in ~4/65.
- **51/65 K2s are cleanly thin**, 11 borderline, and **3 carried K1's substance minus a number** —
  `s8-data-flywheel`, `s3-what-winning-earns`, `s3-deliberately-not-doing`. Re-authored through `--only`
  (a machine re-run merged by the harness and re-validated by `checkKey`, never a hand edit), one roll
  each, accepted as it came, $0.233. All three changed and read thinner.
- **No K3 sneaks an answer.** Cast holds at four founders, none reused for a customer. Zero banned
  phrasings, zero over the word cap, no invented company.
- Its estimate — **a careful human judge separates ~85% of K1/K2 pairs** — is labelled a read, not a
  measurement, and the auditor said so: it read each K1 immediately before its K2 with labels visible.

**The circularity worry, closed from the other direction.** Several K2s converge on the bank's
weak-answer notes almost exactly, which would be fatal had the author seen them. It did not:
`author/transcript.jsonl` records **ten denied reads** — `bank.mjs`, `question-bank-source.md`, the PRD, a
prior run's transcript, and five mid-run attempts on `brief.md` itself — every one refused at
`PreToolUse`. The alignment is convergence, and that is the strongest evidence this fixture could have
produced.

## C1 — the smoke turns (PAID, $0.109 observed)

| slug | posture | model | filed | expected | cost | duration | fingerprint |
|---|---|---|---|---|---|---|---|
| `smoke-think-348-a` | think | claude-sonnet-5 | `flag_weak_answer` | `flag_weak_answer` | $0.0597 | 20.5s | `7efdde37…` ✓ |
| `smoke-opus-348-a` | think-opus | claude-opus-5 | `flag_weak_answer` | `flag_weak_answer` | $0.0491 | 13.9s | `cadb3811…` ✓ |

Both packages deleted; `discovery/` holds no smoke package (observed).

- **Both fingerprints match the module's current values exactly**, so the six packages would record on the
  prompt surface in the tree rather than one about to move.
- **Byte-equality holds end to end.** The text the server wrote to `answers.jsonl` is EXACTLY the sealed
  K2 for `s1-choice-cascade` under draw column `a` — the property `assertAnswersSealed` exists to check,
  observed through the real route rather than argued.
- The sonnet turn's `missing` list is **form-only**: *"a where-will-we-play choice stated separately from
  the how-we-win reason"*, *"a specific management system, process, or cadence"*. It names what the answer
  does not carry and never that it is wrong. **That is MVP 6, on one turn — a wiring proof, not a reading.**
- **Opus was cheaper AND faster than sonnet on turn 1**, against the plan's expected ~2.5×. One cold turn
  is not the curve, so the ≈$12/opus-run estimate stands — but the first evidence points down.

## Cost, observed

| | |
|---|---|
| dry runs (2) | $0.214 |
| fence probes (2) | $0.100 |
| author run 1 — halted out of credit at 28/65, lost | $0.919 |
| author run 2 — void, thrown away on the audit | $2.476 |
| author run 3 — **the sealed key** | $4.550 |
| three K2 re-authors (`--only`) | $0.233 |
| C1 smoke turns | $0.109 |
| **total** | **$8.60** |

Against the plan's ≈$2 for Phase B. The overrun bought the knowledge that the fixture design was
measuring the wrong thing — cheap against C2's $17 or C2+C3's $51.

Steady-state authoring cost is **≈$0.070/question** (derived: $4.550 over 65), up from the first run's
$0.035 because the brief is longer and two questions retried on the mechanical checks.

## Deviations from the plan

V1–V9 are unchanged from the earlier version of this report (the `author/transcript.jsonl` path; Phase A
and B's code in one commit; the fifth leak path; the five matrix columns; case 13's rubric-field scope;
absolute paths in cases 10 and 12; `--probe` as its own mode; the A1 validator as `.mjs`; `prd.md`
generated). Four more since:

**V10 — the brief was tightened and the bank re-authored, which the plan anticipates but does not
budget.** The plan's B2 says *"If the register is uniform, tighten the brief and re-run — never edit an
answer."* That is exactly what happened, and it cost a second $2.476 run. The plan assumed one run.

**V11 — the register fix is a HARNESS change, not only a brief change.** `VOICES` and `checkAnswers` are
new code in `record-graded-answers.mjs`. The plan scoped B1 as a single-shot harness; making a stateless
author vary its register is not achievable in prose.

**V12 — group 33 case 13's span threshold is 40, not 30.** Forty is the plan's own mutation spec
(*"paste 40 chars of a K2 answer into a weakAnswer"*). Thirty was my arbitrary tightening and produced
exactly one false positive in ~38,000 pairs: `s5-willingness-to-pay`'s note and a K3 answer share
`" willingness-to-pay conversation"` (32 chars) — the question's own subject, reached innocently from
both sides. Forty clears it by eight characters and still goes red on the plan's mutation, driven and
restored (observed).

**V13 — `--turns` was added to the driver for C1.** The plan's C1 asks for one turn per posture and the
driver walked to completion. Unbounded by default; a full recording never passes it.

## D1 — THE SCORE

Both runs, 65 turns each, `whole-bank`, draw column `a`, the SAME 65 sealed answers. `buildThinkTurn` is
identical across the two; the model string is the whole difference, which is what makes this a comparison.
**No target was set.**

### The confusion matrix — expected × what closed the turn

**`graded-think-a` · `think` · claude-sonnet-5 · $3.24 · 12 min · `7efdde37…`**

| expected | record_decision | flag_weak_answer | open_question | no close (filed) | no close (silent) |
|---|---|---|---|---|---|
| K1 → record_decision | **14** | 1 | 4 | 0 | 0 |
| K2 → flag_weak_answer | 2 | **8** | 8 | 0 | 0 |
| K3 → open_question | 0 | 2 | **26** | 0 | 0 |

**`graded-opus-a` · `think-opus` · claude-opus-5 · $3.89 · 16 min · `cadb3811…`**

| expected | record_decision | flag_weak_answer | open_question | no close (filed) | no close (silent) |
|---|---|---|---|---|---|
| K1 → record_decision | **14** | 2 | 3 | 0 | 0 |
| K2 → flag_weak_answer | 0 | **11** | 7 | 0 | 0 |
| K3 → open_question | 0 | 1 | **27** | 0 | 0 |

Both matrices sum to 65 of 65 turns (observed). `file_evidence` is counted beside them and never in them:
**14 ops over 14 turns on sonnet, 35 over 32 on opus.**

| | think | think-opus |
|---|---|---|
| overall | 48/65 — **74%** | 52/65 — **80%** |
| K1 (has the form) | 14/19 — 74% | 14/19 — 74% |
| K2 (thin) | 8/18 — **44%** | 11/18 — **61%** |
| K3 (does not know) | 26/28 — 93% | 27/28 — 96% |
| turns that closed | 65/65 | 65/65 |

Chance over three verbs is 33%.

**Per-kind totals only, not per-stage × per-kind** (the plan's F3): with one run per posture every question
meets exactly one kind, so a cross-tab would publish cells of n=0–3 — stage 9 holds four questions in
total. The per-stage breakdown the scorer prints is per-stage **overall**, not per-stage per-kind, and it
is in the tool's output rather than repeated here. The per-question cross-tab needs C3.

### What the number says

**F1 — the judge's dominant failure is PARKING, on both postures.** 12 of sonnet's 17 misses and 10 of
opus's 13 are a turn filed as `open_question` when the key expected something else — 8 of 18 thin answers
and 4 of 19 well-formed ones on sonnet. Faced with an answer it is unsure of, this prompt surface reaches
for *"you do not know yet"* rather than *"your answer names no number."* **This is the thing to tighten,
and doing so is a new PR and a re-run, never an edit** — the fingerprints must stay byte-stable or the
packages stop being comparable.

**F2 — opus's entire gain is in K2.** K1 is identical at 14/19 and K3 differs by one. The 6-point overall
gap is 8/18 → 11/18 on thin answers alone.

**F3 — opus never recorded a decision on a thin answer** (0 vs sonnet's 2). Of the two error kinds,
accepting a thin answer as a decision is the one that puts an unsupported claim into the PRD projection;
opus made none.

**F4 — opus files 2.5× the evidence** (35 ops / 32 turns vs 14 / 14). `EVIDENCE_RULE` (#338 F6) lands much
harder on opus. Counted, never scored.

**F5 — zero non-closing turns in 130.** Every turn filed exactly one closing op. That is a pipeline-health
reading, not a quality one.

### What the number does NOT say

- **The K2/K3 boundary is the fixture's softest seam.** The substance audit flagged **11 of 65 K2 answers
  as borderline** — taking the easy half of a question and refusing the hard half — and 7–8 of the K2
  mismatches sit inside that band. **This score cannot separate "the judge mis-graded" from "the answer
  genuinely sat on the boundary", and no run of this fixture can.** A judge that parks a genuinely
  ambiguous answer is not obviously wrong.
- **It is a form-judgement reading taken under the realism gap** (§THE REALISM GAP): the answers are
  authored, not real. Real answers wander, contradict themselves and arrive out of order.
- **And under a second gap the plan did not name: the STREAM is artificial.** A real session is a coherent
  interview whose ledger accumulates. This walks 65 questions about one company answered alternately
  well/thin/unknown in a hash-scrambled order. No real interview produces that stream, and the judge sees
  it in every turn prompt via `ledgerBrief`.
- **`allergen-matrix-1`'s 30/30 and `my-product-name`'s op counts are NOT quality readings** and are not
  cited as one anywhere in this report. They prove the transport, the applier, the projection and the
  fingerprint tripwire; they say nothing about judge quality, because their answers were written to have
  the form the questions ask for.
- **A run of turns with no decision in a projected `prd.md` may be a DRAW ARTIFACT.** The hash offset
  produces stretches of three or four same-kind draws, and a stretch of K2/K3 is exactly what #285's
  not-a-form counter is built to notice. Check the draw column before quoting it as a finding.

## D2 — the MVP 6 read (AC5)

**Mechanical shortlist, human verdict, and the report says which is which.**

`--mvp6` over both packages' `text` lines with the committed pattern set: **0 candidates from sonnet's 109
lines, 3 from opus's 130.** All three read as false positives:

| turn | matched | why it is not a violation |
|---|---|---|
| `t36` | `\bwrong\b` | matched the QUESTION ID `s6-accountable-when-wrong` |
| `t6` | `\bwrong\b` | describes the answer's subject — *"the feeling before anything goes wrong"* |
| `t47` | `\bwrong\b` | quotes the person's own hedge back — *"you say you may have the number wrong"* |

**Verdict (human, over 3 shortlisted of 239 text lines across 130 turns): the judge never told a person
their answer was wrong and never supplied what was missing.** The shortlist does not prove MVP 6 and this
report does not claim it does; it made the read tractable.

## The C3 decision

C2 cost **$7.13**, not the plan's ≈$17. At that rate C3's four runs are ≈$14 and all six ≈$21 rather than
≈$51. The owner chose C2 anyway, on the reasoning that C3 buys per-question coverage — a refinement of a
validation — while the unmeasured product question is **which questions a session should ask**, which is
branch inference and a different ticket.

What C3 would add if run later: every question meeting all three kinds, which makes a per-stage × per-kind
cross-tab meaningful and removes the draw's per-column kind imbalance (column `a` is K3-heavy: 28 K3 / 19
K2 / 18 K1). The key, the draw and the driver are all committed, so C3 is `record-graded-run.mjs` four
more times.

## Cost, observed — final

| | |
|---|---|
| Phase B — dry runs, probes, three author runs, three `--only` re-authors | $8.49 |
| C1 smoke turns | $0.109 |
| C2 — `graded-think-a` $3.24 + `graded-opus-a` $3.89 | $7.13 |
| **total** | **$15.73** |

The plan expected ≈$2 for Phase B and ≈$17 for C2. Phase B overran 4× because the first fixture was void
and had to be re-authored; C2 came in at 42% of estimate.

## What is outstanding

1. **C3's four runs**, if the owner ever wants per-question coverage (≈$14).
2. **The PR**, with `Closes #348`, the plan, this report and the review.
3. A prompt tightening on the back of F1 (the parking bias) is **a new ticket, a new PR and a re-run** —
   never an edit to this one.

## Open questions for the owner

Q1 (the driver) — **proceeding on the driver**, per the plan's own recommendation; C1 proved byte-equality
through the real route. Q2 (`frontEnd: "portal"` and #317's Switch read) — unchanged, carried by the
`graded-` prefix and the README section. Q3 (zero author denials) — **answered**: ten denied reads, and
`--probe` is a stronger receipt than an incidental denial. Q4 (the author and the `think` judge share a
model family) — unchanged, and weaker for `graded-think-*` than for `graded-opus-*`.

## Repo state

Ten commits on `feat/348-graded-answer-fixture`, nothing pushed, no PR.

```
76287a4 --turns bounds the driver's walk, and C1's smoke turns pass on both postures
2b4a7ce three K2 answers re-authored on the substance audit's finding
6401754 195 answers authored blind and SEALED, after the first run was found to be sortable by regex
1463346 the brief pins ONE fictional company, so the judge's ledger is coherent
0ec6596 review fixes — the README stops asserting a key that does not exist
20f7150 the sealed design and its two harnesses, before a word is authored
```

`build ✓ all 33 groups pass` · `drift-check ✓` · `gen-loc-summary --check` clean.
`portal/lib/discovery-postures.mjs` untouched; both fingerprints unmoved and confirmed against a live
turn. `discovery/instrument-loans-1/` untouched. `discovery/` holds no graded or smoke package.
