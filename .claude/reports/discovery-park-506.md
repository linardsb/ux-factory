# The park view on the graded scorer, a blind borderline re-audit, and a labelled read (#506)

**Tree**: `d5c7536` (origin/main, unmoved during the work) + this ticket's diff · **Packages**: `discovery/graded-think-a`
(Think, `claude-sonnet-5`, stamp `7efdde37…`) and `discovery/graded-opus-a` (Think-on-Opus, `claude-opus-5`, stamp
`cadb3811…`), both run column `a`. **Every count below is frozen against those two recordings, before #508 re-records
them.**

**AC #3's "which of the 11" was replaced by a blind re-audit, on the owner's decision of 2026-10-03, because #348's
11 borderline K2 answers were counted but never named anywhere.** The set used here is new, committed as
`docs/epics/fixtures/graded-answers/borderline.json`, and is not a reconstruction of #348's.

## 1. Counts per model

| | Sonnet (`graded-think-a`) | Opus (`graded-opus-a`) |
|---|---|---|
| parks filed (closing `open_question`) | 38 | 37 |
| park precision (K3 parked / parks) | 26/38 (68%) | 27/37 (73%) |
| park recall (K3 parked / K3 turns) | 26/28 (93%) | 27/28 (96%) |
| class a — K3 not parked | 2 | 1 |
| class b — K2 parked | 8 | 7 |
| class b′ — K1 parked | 4 | 3 |

Observed: `node tooling/discovery-score.mjs --park <slug>`, output verbatim below.

```text

park  graded-think-a  ·  claude-sonnet-5  ·  run column a  ·  65 turns

  parks 38 · K3 28 · precision 26/38 (68%) · recall 26/28 (93%)

  class a   K3 → not parked  2
    a18  s3-deliberately-not-doing          stage 3  filed flag_weak_answer  — a named segment or type of prospect who's annoyed by the no, rather than general impressions from calls; a counted figure for what it costs (deals lost), rather than an unverified range
    a46  s7-kill-state-and-date             stage 7  filed flag_weak_answer  — a defined state that would trigger quitting, rather than a general direction of things going badly; a date

  class b   K2 → parked  8
    a14  s3-why-now                         stage 3  filed open_question     band clean       — The person wasn't party to Ellie's work last spring on why the market hadn't moved before now, and names Priya as the one who'd have the actual answer — no specific change or date is known to them.
    a17  s3-beachhead                       stage 3  filed open_question     band clean       — The person sees a consistent pattern of compliance headaches across agencies but hasn't been walked through whether the niche is big enough on paper or what the adjacent niche after it would be — that sizing and sequencing sits with Priya and Ellie.
    a31  s5-net-revenue-retention           stage 5  filed open_question     band borderline  — No net revenue retention figure is named, and the person defers how the post-go-live compliance breakage actually maps to retention numbers to Dan and Priya — the constraint hasn't been pinned down by anyone yet in what they've said.
    a32  s5-gross-margin                    stage 5  filed open_question     band borderline  — No actual gross margin figure is given, and whether it's high for a bad reason is deferred to a founders'-level conversation about pricing and support load that hasn't happened from this person's account.
    a42  s6-integration-surface             stage 6  filed open_question     band clean       — The person wasn't part of Dan and Ellie's discussion on this earlier in the year and can only speak broadly about incoming client/carer data — which systems must be read from, written to, and never broken sits outside what they've seen.
    a44  s7-north-star                      stage 7  filed open_question     band clean       — The value area is identified as compliance/trust rather than hours saved, but no single metric has been picked apart to represent it and its inputs haven't been defined — Ellie's work on formalising this hasn't landed yet.
    a52  s8-system-or-model                 stage 8  filed open_question     band clean       — The person's sense of how the rota suggestion is judged comes only from informal support-call impressions, not anything formal — what's actually being measured, and whether it separates system from model, sits with Dan.
    a61  s8-source-opening-rate             stage 8  filed open_question     band clean       — Whether the click-before-accept sequence is instrumented as its own event sits with Dan, not known here — there's a qualitative sense that trust has gone up, but no source-opening rate has actually been measured.

  class b′  K1 → parked  4
    a27  s5-value-metric                    stage 5  filed open_question     — Pricing sits flat regardless of size, so rota-time and audit-readiness as value metrics have never been separated or tested against what agencies would actually pay more for — the person has two untested candidates, not a settled metric.
    a28  s5-willingness-to-pay              stage 5  filed open_question     — Pricing is flat with no per-feature breakdown, and the one instance of asking a customer directly sits with Priya and can't be dated or detailed by this person — willingness to pay hasn't actually been established.
    a34  s5-free-tier-cost                  stage 5  filed open_question     — There's no metered usage to work a tipping point from — the product runs a 30-day full-access trial, not a free tier, and the person is explicit no usage threshold for unprofitability has been established.
    a58  s8-product-or-feature              stage 8  filed open_question     — Ellie's case that the compliance-records and carer-history trail is the real moat has never been set out properly or tested rigorously, only argued anecdotally against CareLineLive in sales calls — the person explicitly wouldn't bet the company on it.

  K2 turns 18: clean 11 · borderline 6 · carries 1
  K2 misses 10: clean 6 · borderline 3 · carries 1

  The borderline set is a blind re-audit's read (borderline.json), not a key. The score supplies counts, never the verdict; no threshold is set.


park  graded-opus-a  ·  claude-opus-5  ·  run column a  ·  65 turns

  parks 37 · K3 28 · precision 27/37 (73%) · recall 27/28 (96%)

  class a   K3 → not parked  1
    a18  s3-deliberately-not-doing          stage 3  filed flag_weak_answer  — an excluded segment — which kind of agency or buyer you are choosing not to serve — rather than a feature declined; a named party who is annoyed: a prospect, a partner, someone inside the company; a count of what the no costs — the range three to fifteen is offered as unmeasured; whether the no is a standing choice or a per-call judgement; the answer says it is unwritten and still argued

  class b   K2 → parked  7
    a14  s3-why-now                         stage 3  filed open_question     band clean       — Outside the respondent's remit (onboarding and compliance post-signup); he was not part of Ellie's spring look at why the market had not moved. Needs re-asking of Priya or Ellie, with the specific change and its date named.
    a17  s3-beachhead                       stage 3  filed open_question     band clean       — Only niche coherence is addressed, from observed repetition of compliance headaches across onboarded agencies. Whether the niche is big enough to matter and what adjacent niche follows sit with Priya and Ellie and have not been shared with the respondent. Needs re-asking of them, with a size figure and a named second pin.
    a31  s5-net-revenue-retention           stage 5  filed open_question     band borderline  — No net revenue retention figure given, and no gross or logo figure either. Respondent offers a qualitative read from onboarding \u2014 activation broadly fine, post-go-live compliance failures eroding the relationship \u2014 but says the mapping to retention numbers sits with Dan and Priya. Needs NRR calculated and the constraint identified among activation, retention and expansion.
    a42  s6-integration-surface             stage 6  filed open_question     band clean       — No named systems read from, written to, or designated never-to-break, and no statement of which system is the record for compliance data. Respondent works at the onboarding end and was not part of Dan and Ellie's March discussion. Needs re-asking of them, with the system of record settled.
    a44  s7-north-star                      stage 7  filed open_question     band clean       — The value customers feel is identified as compliance \u2014 catching a missing training record before an inspector does, reported by Marek as arising in almost every onboarding conversation \u2014 but no single metric has been chosen to represent it and no inputs have been broken out. Ellie's more formal definition has not landed. Needs the candidate metric named and decomposed.
    a51  s8-validate-the-validators         stage 8  filed open_question     band borderline  — Checking of model suggestions is described as informal team vigilance, with no owner, no graded sample and no agreement rate; the respondent builds rather than checks and defers to Marek and Priya. Marek's February edge-case work has not been shared back. Needs that work retrieved and the checking process, and its accuracy, made explicit.
    a52  s8-system-or-model                 stage 8  filed open_question     band clean       — The respondent cannot say whether measurement targets the model or the whole system; his read comes from support calls, where agencies judge only whether the suggested rota felt right, not whether the compliance checks beneath it were accurate. Dan holds what is measured technically. Needs re-asking of Dan, with model and surrounding system separated.

  class b′  K1 → parked  3
    a27  s5-value-metric                    stage 5  filed open_question     — Two unseparated candidates \u2014 coordinator hours on the rota and audit readiness \u2014 with no test behind either, since pricing is flat at \u00a3340 regardless of agency size. Willingness-to-pay signal exists only as remarks made to Priya. Needs the two candidates separated and tested against what agencies would actually pay more for.
    a28  s5-willingness-to-pay              stage 5  filed open_question     — Pricing is flat at \u00a3340/month with no per-feature split, so per-feature willingness to pay has never been separated; overall willingness to pay is unmeasured. One direct ask is recalled second-hand \u2014 Priya to a larger agency about the compliance module, roughly two months ago, date uncertain. Needs Priya asked directly, with the date and the answer recorded.
    a35  s6-process-as-it-runs              stage 6  filed open_question     — Only one undocumented step is surfaced \u2014 a month waived when a contract stalls, recalled as four or five times this year from kitchen conversations with no log \u2014 and the respondent is reconstructing a process he does not run. Needs Priya walked through the sequence end to end, with the concession step confirmed and counted.

  K2 turns 18: clean 11 · borderline 6 · carries 1
  K2 misses 7: clean 5 · borderline 2 · carries 0

  The borderline set is a blind re-audit's read (borderline.json), not a key. The score supplies counts, never the verdict; no threshold is set.
```

## 2. The borderline overlap

### The correction

`discovery/README.md` and `.claude/reports/discovery-graded-answer-fixture-348-report.md:322` both said "7–8 of the K2
mismatches sit inside that band" of 11 borderline K2s. **That figure has no source.** The #348 auditor's final message
named only the 3 "carries" ids and said "11 more are borderline" without listing them (the #348 session transcript
`50ec50be-cb0d-4097-b431-f384168b2f7d`, 12:45:30Z, and every text, thinking, tool_use and tool_result block in its auditor
transcript `agent-a9eaae280f921babb`; verified at planning time). The figure was the count of parked K2 turns (8 on
Sonnet, 7 on Opus), not an overlap with any named set. The README sentence is corrected in this PR; the #348 report is
history and stays as committed.

### The re-audit (committed set: fable)

Verdicts over all 65 K2 answers (observed, `borderline.json`): **clean 30 · borderline 31 · carries 4.**

Run column `a` holds 18 K2 turns (the same 18 on both packages; the draw is shared).

| | Sonnet | Opus |
|---|---|---|
| K2 turns by band | clean 11 · borderline 6 · carries 1 | clean 11 · borderline 6 · carries 1 |
| K2 misses (any K2 not flagged) by band | 10: clean 6 · borderline 3 · carries 1 | 7: clean 5 · borderline 2 · carries 0 |
| **K2 parks (class b) by band** | **8: clean 6 · borderline 2** | **7: clean 5 · borderline 2** |

Sonnet's two non-park K2 misses are `record_decision` on `s1-premortem` (carries) and `s9-customer-experience-backwards`
(borderline).

### The cross-check (haiku, never committed)

The same five prompts on `haiku`. Verdicts: clean 33 · borderline 24 · carries 8. **Agreement with fable: 43/65**
(derived: `clean→clean` 23 + `borderline→borderline` 17 + `carries→carries` 3). The 22 disagreements: fable borderline →
haiku clean 9, fable clean → haiku borderline 7, fable borderline → haiku carries 5, fable carries → haiku clean 1.

Disagreements on a run-`a` K2 id (5): `s1-choice-cascade` (fable borderline, haiku clean), `s4-rabbit-holes` (clean,
borderline), `s5-net-revenue-retention` (borderline, clean), `s6-permission-model` (clean, borderline),
`s8-system-or-model` (clean, borderline).

Sensitivity run (`--park` with haiku's entries written over the file inside the same wrapper, then byte-restored from a
backup and `cmp`-checked; the file is untracked, so `git checkout` could not restore it): **K2 parks by band — Sonnet
clean 6 · borderline 2 (a32, a52); Opus clean 5 · borderline 2 (a51, a52).** The band totals per class match fable's;
the ids inside them differ (fable: a31, a32 on Sonnet; a31, a51 on Opus).

### Blindness receipt

Each auditor got the preamble below plus 13 questions (`### <id> (stage n)`, the question text, K1 and K2) and nothing
else. The prompt text in each transcript's first user message was compared byte-for-byte with its batch file (match on
all ten). Each reply was extracted from the transcript's last assistant text block by script, never retyped.

| Batch | Auditor | Transcript (`~/.claude/projects/…/subagents/`) | Model in transcript | tool_use blocks | Attempts | Fence stripped |
|---|---|---|---|---|---|---|
| 1 | primary | `agent-a6b064fd5b7ab0116.jsonl` | claude-fable-5-1 | 0 | 1 | no |
| 2 | primary | `agent-a88edaa7cd6f19c72.jsonl` | claude-fable-5-1 | 0 | 1 | no |
| 3 | primary | `agent-a66f131f3839fe572.jsonl` | claude-fable-5-1 | 0 | 1 | no |
| 4 | primary | `agent-a1fed999b96abbb99.jsonl` | claude-fable-5-1 | 0 | 1 | no |
| 5 | primary | `agent-a27492552cbd579cd.jsonl` | claude-fable-5-1 | 0 | 1 | no |
| 1 | cross-check | `agent-ac1600c6ee162a40f.jsonl` | claude-haiku-4-5-20251001 | 0 | 1 | yes |
| 2 | cross-check | `agent-a4ca592ce2d3958a3.jsonl` | claude-haiku-4-5-20251001 | 0 | 1 | yes |
| 3 | cross-check | `agent-a008c87cb5639f641.jsonl` | claude-haiku-4-5-20251001 | 0 | 1 | yes |
| 4 | cross-check | `agent-af85e633cebb90ee8.jsonl` | claude-haiku-4-5-20251001 | 0 | 1 | yes |
| 5 | cross-check | `agent-aee3af7a0964c0f6a.jsonl` | claude-haiku-4-5-20251001 | 0 | 1 | yes |
| hand-off (18 run-`a` K2s, for the read) | read-only classifier | `agent-a461c7bafa8488e7a.jsonl` | claude-fable-5-1 | 0 | 1 | no |

**One context leak, recorded rather than hidden.** Every subagent is started with the project's auto-loaded
instructions, which include the user's `MEMORY.md` index. One index line reads "#348 counted 11 borderline K2s but named
none; "7–8 inside the band" was a count, not an overlap; #506 re-audits blind." So all eleven subagents (ten auditors and the hand-off classifier) could see the count
11, though not any id, the draw, a transcript or a score. No graded slug appears anywhere in any transcript (grep: 0).
Fable returned 31 borderline and haiku 24, neither near 11, which is consistent with the count not steering the
verdicts but does not prove it. The cross-check shares the same leak, so it cannot rule it out.

The audit preamble, verbatim (`<N>` was 13 in every batch):

```text
You are auditing a fixture of interview answers. Use NO tools: everything you need is below, and you must not
read, search or run anything. Answer from this text alone.

Each of the <N> questions below has two answers written for a fictional company. K1 is meant to CARRY what the
question asks for, often imperfectly. K2 is meant to be THIN: on-topic, but without the thing the question
reaches for.

For EACH question, first decide which ONE slot the question reaches for (a number, a person, a date, a named
alternative, a cost, a criterion), then read K2 against that slot only. Restating the company's general facts
does not fill a slot. Give K2 exactly one verdict:
- "clean": K2 does not fill the slot. It is thin.
- "borderline": K2 takes the easy half of the question and refuses the hard half, or fills the slot so vaguely
  that a careful reader could fairly call it either thin or not-known-yet.
- "carries": K2 fills the slot with a checkable, responsive fact, so it is as good as K1 minus a detail.
Use K1 only as the comparison for "carries". There is no target count. Judge each question on its own.

Return ONLY a JSON array, with no prose and no code fence before or after it, of exactly <N> objects, one per
question, in the order given:
{"question_id": "<id>", "verdict": "clean" | "borderline" | "carries", "why": "<one sentence naming the slot and what K2 does with it>"}
```

The hand-off classifier's preamble, verbatim. It was followed by 18 items of the form `### <id>`, `QUESTION:` and
`ANSWER:` (the K2 text), in bank order:

```text
You are classifying interview answers. Use NO tools: everything you need is below, and you must not read, search or
run anything. Answer from this text alone.

Each of the 18 items below is one question and one answer from an interview with someone at a fictional company.

For EACH item, decide one thing: does the answer HAND the question to someone else? That is, does the speaker say
that a named colleague (or a named group such as "the founders") is the one who holds, owns or would give the answer
to THIS question, instead of the speaker giving it? Mentioning a colleague in passing, or saying the speaker heard
something from a colleague, does not count on its own: the answer must point the question itself at that person.

Return ONLY a JSON array, with no prose and no code fence before or after it, of exactly 18 objects, one per item,
in the order given:
{"question_id": "<id>", "hands_off": true | false, "to": "<the named person or group, or null>", "why": "<one sentence quoting the words that decide it>"}
```

## 3. Fingerprint cost

Which template carries which rule (source, `portal/lib/discovery-postures.mjs`): `systemFor` (:349) feeds Think's builds
(called at :447, :479); `sharedVocabulary()` is interpolated at :592 (Create PRD), :662 (Grill interview) and :701
(Grill audit); `AUDIT_VERDICT_RULE` appears only in the Grill audit (:697); `TOOL_DESCRIPTIONS` (:327) is hashed into
every stamp by `fingerprintOf`.

| Change surface | Stamps moved | Live-compared packages to re-record | Recorded cost | Hardcoded literals to rewrite in `tooling/build-checks.mjs` (this tree) |
|---|---|---|---|---|
| `TOOL_DESCRIPTIONS.open_question` (:327) | all four (think, think-opus, create-prd, grill) and Grill-on-Opus | instrument-loans-1 $0.42, graded-think-a $3.24, graded-opus-a $3.89, partner-audit-1/2/3 $0.16 + $1.62 + $2.07 | **$11.40** | :8335, :8950–8954 (30.46, incl. the carriers count `=== 7`), :8961, :8965, :8969, :16366 |
| `systemFor` (:349) | think, think-opus | instrument-loans-1, graded-think-a, graded-opus-a | **$7.55** | :8335, :8950, :8951, :8953–8954 |
| `sharedVocabulary` (:514) | create-prd, grill, Grill-on-Opus | partner-audit-1/2/3 (no create-prd package is live-compared) | **$3.85**; it does not touch the graded fixture, so it cannot be measured on it | :8961, :8965, :8969, :16366 |
| `AUDIT_VERDICT_RULE` (:230) | grill, Grill-on-Opus | partner-audit-1/2/3 | **$3.85** | :8961, :8965, :16366, plus 30.32 (:8410), which pins the rule word for word |

The table's literal line numbers are the plan's plus 1 (the import list grew one line) and, for :16366, plus 97 (case
33.16 sits above it). Re-derived on this tree:

```text
$ for s in instrument-loans-1 graded-think-a graded-opus-a partner-audit-1 partner-audit-2 partner-audit-3; do node -e '…costUsd summed over distinct turns…' $s; done
instrument-loans-1 think $0.42
graded-think-a think $3.24
graded-opus-a think-opus $3.89
partner-audit-1 grill $0.16
partner-audit-2 grill $1.62
partner-audit-3 grill $2.07
$ grep -n "7efdde37\|cadb3811\|76b7847d\|ba124c3c\|ea523ac1" tooling/build-checks.mjs | cut -c1-60
8315:  // graded-think-a, bracket-trace-1 and -2 (and cadb3811 o
8335:    ok(POSTURES.think.fingerprint === "7efdde37441fbd2591ba4
8950:    ok(POSTURES.think.fingerprint === "7efdde37441fbd2591ba4
8951:    ok(POSTURES["think-opus"].fingerprint === "cadb38117a266
8953:    ok(carriers("7efdde37441fbd2591ba4a7dfeecdb6b").length +
8954:      `30.46: ${carriers("7efdde37441fbd2591ba4a7dfeecdb6b").
8961:    ok(POSTURES.grill.fingerprint === "76b7847d4ebbd9d8f16f9
8965:    ok(resolvePosture({ posture: "grill", model: "claude-opu
8969:    ok(POSTURES["create-prd"].fingerprint === "ea523ac1e8eae
16366:    ok(POSTURES.grill.fingerprint === "76b7847d4ebbd9d8f16f9
```

Dollars match the plan's table exactly. Non-live packages carrying `7efdde37` go stale on any Think change, and that
is accepted: `faster-payment`, `later-not-never-1`, `bracket-trace-1`, `bracket-trace-2` (observed: the stamp set of
every `discovery/*/run.json`).

## Session read — written by the implementing session, not the owner's verdict

The owner accepts or overrules this at review (A2, 2026-10-03). It rests only on the class rows and their `why` text in
§1, the K2 and K3 answer text in `key.json`, and one blind classification of which K2 answers hand the question to a
colleague (below).

**Pattern 1: a K2 answer that hands the question to a named colleague is parked; one that does not, almost never
is.** I first sorted the 18 run-`a` K2 answers by hand after seeing the filings, which can bias the split. So the sort
was re-done blind. One more no-tool `fable` subagent got the 18 questions and K2 answers, with no filings, ops, draw or
scores. It answered one question per item: "does the answer hand THIS question to a named colleague or group?" My
prediction was written down before it ran: the 8 ids below marked `true`. Its answer matched that prediction on all 18.
Its verdicts, extracted by script from its transcript:

```text
s1-choice-cascade                 false  -
s1-premortem                      false  -
s1-if-nobody-solves-this          false  -
s2-last-time-show-me              false  -
s3-why-now                        true   Priya
s3-beachhead                      true   Priya and Ellie
s4-rabbit-holes                   false  -
s4-press-release                  false  -
s5-net-revenue-retention          true   Dan and Priya
s5-gross-margin                   true   the founders
s6-permission-model               false  -
s6-audit-trail                    false  -
s6-integration-surface            true   Dan and Ellie
s7-north-star                     false  -
s8-validate-the-validators        true   Marek and Priya
s8-system-or-model                true   Dan
s8-source-opening-rate            true   Dan
s9-customer-experience-backwards  false  -
```

Crossed with the filings (observed, script over `scorePackage` rows):

| | hand-off, parked | hand-off, not parked | no hand-off, parked | no hand-off, not parked |
|---|---|---|---|---|
| Sonnet | 7 | 1 (a51 `s8-validate-the-validators`, flagged) | 1 (a44 `s7-north-star`) | 9 |
| Opus | 6 | 2 (a32 `s5-gross-margin`, a61 `s8-source-opening-rate`, flagged) | 1 (a44 `s7-north-star`) | 9 |

The one non-hand-off park on both models is `s7-north-star`, whose answer ends "Ellie's been circling around defining
something more formal… nothing's landed yet". That is the organisation not having settled it, which is close to the
K3 sense. The closest non-hand-off case the other way is `s6-audit-trail` ("I mostly hear about it secondhand from
her"): the blind classifier read it as no hand-off, and both models flagged it. The agent's own reasons say the
hand-off is why it parked: "names Priya as the one who'd have the actual answer — no specific change or date is known
to them" (Sonnet a14); "Outside the respondent's remit… Needs re-asking of Priya or Ellie" (Opus a14); "sits with Dan,
not known here" (Sonnet a61).

**Pattern 2: flag language filed as a park.** Three reasons open by naming the missing item, which is what
`flag_weak_answer`'s `missing` exists for: "No actual gross margin figure is given…" (Sonnet a32), "No net revenue
retention figure is named…" (Sonnet a31), "No net revenue retention figure given…" (Opus a31).

**Against the rule's wording.** Think's line (:349, and the same line in `sharedVocabulary` at :514) reads "The answer
says the person does not know yet → open_question with source banked." The fixture's K3 answers say nobody has worked
it out ("we've never sat as a group…", "nobody has set that up yet", "Neither of us has actually written it down yet").
Most parked K2 answers (7 of Sonnet's 8, 6 of Opus's 7) say this person does not know but a named colleague does.
"The person does not know yet" admits both readings. Both models take the second reading on most hand-offs (Sonnet 7
of 8, Opus 6 of 8), so this reads as the rule's wording rather than noise.

**What the borderline audit can and cannot say about this.** The audit put 6 of Sonnet's 8 parked K2s and 5 of
Opus's 7 in "clean", and haiku's set gives the same counts. That number does **not** show the parks were off the
not-known boundary. The preamble defines "clean" as "K2 does not fill the slot". It offers "not-known-yet" only inside
"borderline", for a slot filled vaguely. So an answer that fills nothing and hands the question to a colleague is
"clean" by construction, whether or not a reader would call it not-known-yet. The auditor's own `why` for
`s3-why-now` shows this: it quotes "isn't something I've got a handle on" and "points at Priya", and still says clean.
The audit measures that the parked K2s leave the slot empty. It cannot separate "thin" from "not known yet" for an
empty hand-off, and haiku used the same instrument, so it is not independent support. The outcome below therefore
rests on Pattern 1, Pattern 2 and the rule's wording, not on the band counts.

**Outcome: one named change, to `systemFor` (:349).** Sharpen "does not know yet" to mean nobody has worked it out
yet, and say that an answer which hands the question to a named colleague without giving that colleague's answer is a
weak answer, with the colleague's answer as the missing item. **Fingerprint cost: the think and think-opus stamps move;
re-record instrument-loans-1, graded-think-a and graded-opus-a, $7.55; rewrite the literals at :8335, :8950, :8951 and
:8953–8954, where 30.46's carriers count changes with any re-record; and faster-payment, later-not-never-1 and
bracket-trace-1/2 go stale, which is accepted.** Not `sharedVocabulary`: Create PRD and Grill would keep the old line at
:514, so the two wordings would differ. Making them agree costs $11.40 in total, and the $3.85 half cannot be measured on
the graded fixture.

**What this read cannot separate, and what it costs to be wrong.**
- It cannot separate a mis-grade from a boundary answer. The borderline set is two blind models' read, not a key, and
  the auditors agree on only 43 of 65. The hand-off split is one model's blind read, with no second reader.
- **The realism gap (README §The graded answer fixture).** The K2 author used colleague deferral as a way to make an
  answer thin. A real person who says "that's Priya's, ask her" may be giving the most useful answer they have, and the
  agent's current reasons ("Needs re-asking of Priya or Ellie") route the question to Priya. The change keeps that
  routing only if the flag's `missing` names the colleague. If #508 measures the change and the routing is lost, that is
  a cost this fixture cannot see.
- All three readers (the judges, fable and haiku) are Claude models, and every auditor's context carried the count
  "11" (see the blindness receipt).
- Classes a and b′ are not addressed. The b′ rows are K1 answers that hedge their own figure ("it is a guess", "never
  tested"), and the agent parked them as not settled. That is a separate boundary on the K1 side, and this read names
  only one change.
- No threshold is set. The read is the reason for a change, not a target for it.

## 4. Not run

| Step | Cost | Blocks the PR? | Tracker |
|---|---|---|---|
| Owner accepts or overrules the session read | owner's hand, at review | no | #508 picks it up |
| Any re-record, any prompt edit | none in this ticket | no | #508 |
