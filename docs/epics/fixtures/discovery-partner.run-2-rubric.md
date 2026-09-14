# Run 2 — the pre-registered scoring rubric (#292)

**What this file is.** Measurement apparatus for #292, epic #279 (`docs/epics/discovery-partner.prd.md`
MVP 13 and §Success metrics, row "Gap finding (run 2)"). It restates the eight findings the 2026-08-27
grill produced, as MVP 13 prints them, and pins for each one the passage in the frozen fixture
(`docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`, md5
`ab6eb0ee6cdd3b7802ecfcbe90db2377`) the defect hangs on, the claim a transcript line must make to count,
and whether the finding is reachable at all from inside the read fence.

**Who wrote it, and when.** The implementing session, from the PRD's published list, on 2026-09-14 —
**before** the first turn of `discovery/partner-audit-2/`. Its commit predates `run.json.startedAt`, and
`tooling/run-2-ready.mjs` check 2 refuses to open the sitting until that commit exists. It is not the
owner's half (the owner's confirmation of the score is the PR review) and it is not a judgement: every
line here is an anchor, not a verdict.

**Never an input to the agent.** The audit run advertises no built-in tool (`MAIN_TOOLS = []`) and its
read fence denies this whole directory; this file reaches the model in no form. Line numbers are the
fixture's own, re-derived with `grep -n` on 2026-09-14.

**Reachability.** The agent holds the document and nothing else. A finding that needs a file the fence
denies (`decisions.json`, the bank's appendix) is declared unreachable or reachable in part here, before
the run, so that an unreachable miss is not read as the model's failure. Declared once; never revised.

## 1 · The scoring key was four decisions and not thirty-three, a layer below what the run produces

- **Passage**: `:50` (Evidence row: "33 decisions and 44 rejects across 11 prototypes"); `:212-216`
  (MVP 9: "the 33 decisions and 44 rejects already published … are the **scoring key**"); `:86` (the
  hierarchy a run produces at: business ← stakeholder ← solution ← transition).
- **Counts as FOUND**: a line says the scoring key sits at a different level (or granularity) from what
  the run produces — that a published design decision and a discovery-run decision are not the same
  kind of record, so the key cannot be scored against the run's output as written.
- **Counts as PARTIAL**: names MVP 9's scoring key as unevidenced or under-specified ("how is a match
  counted", "what is the unit") without the level mismatch.
- **Reachable**: in part. "33 versus 4" needs `decisions.json`, which the fence denies; "a layer below" is
  derivable from `:86` held against `:212-216`.

## 2 · The transition-note rule contradicted its own worked example

- **Passage**: `:204-208` (MVP 7: "**Required for the internal-tool and regulated branches** … Faster
  Payment needs none of it") against `:157` (MVP 3: "regulated because the first run is regulated
  fintech") and `:212` (MVP 9: the one real run is Faster Payment).
- **Counts as FOUND**: a line holds the two passages together — the rule makes the note required for the
  regulated branch, the worked example is the regulated run, and the example says none is needed.
- **Counts as PARTIAL**: flags the transition-note rule or its "markable n/a" clause as weak, unevidenced
  or an escape hatch, without naming the contradiction with the Faster Payment example.
- **Reachable**: yes — an internal contradiction; DODGED's "two places that contradict each other" is the
  verdict shape that would carry it.

## 3 · Role-title framing sat inside a product tool

- **Passage**: `:53` (Evidence: the bank's research is `__CXO_CPO_VP_Product.md`); `:155` (MVP 3: "Seeded
  from the CXO doc's ten stages"); `:184-187` (the prefix: "which STARS situation am I in", "what do we
  say we do that we don't really do").
- **Counts as FOUND**: a line says the bank's questions are framed by an executive role (CXO / CPO / VP
  Product, or a person's arrival in a job) rather than by the product or its user, and that this frame
  does not belong in a product-discovery tool.
- **Counts as PARTIAL**: flags the CXO doc as an unexamined or unevidenced source, or the STARS / "what
  do we say we do" prefix as out of place, without naming the role frame as the defect.
- **Reachable**: in part. The framing is visible in the three passages; that the source document is a
  hiring document is not stated in the fixture.

## 4 · The AI module had no run behind it

- **Passage**: `:163-173` (MVP 3: the AI-interaction module, "the first run of it is a dogfood rather than
  a hypothetical") against `:212-216` (MVP 9: the one real run is Faster Payment, blank-idea mode — a
  product with no model).
- **Counts as FOUND**: a line says the module is not exercised by the epic's one real run (Faster Payment
  has no model, so `hasModel` never fires) — that "dogfood" names no run.
- **Counts as PARTIAL**: flags the module as untested, unevidenced or over-specified without naming that
  the sole planned run cannot fire it.
- **Reachable**: yes.

## 5 · The existing-PRD entry mode was never specified

- **Passage**: `:104` (the hypothesis: "with a blank idea or an existing PRD"); `:126` (Target user:
  "holding either a blank idea or an existing PRD") against `:150-151` (MVP 1: "Think · Create PRD ·
  Grill … pressable in order" — one path, from a blank idea).
- **Counts as FOUND**: a line says the existing-PRD entry the hypothesis and the target user both name
  has no MVP item, no path or no specified behaviour — the three buttons "in order" describe the
  blank-idea path only.
- **Counts as PARTIAL**: notes that Grill (or the third button) is under-specified, or that "in order" is
  one path, without connecting it to the existing-PRD entry the document promises.
- **Reachable**: yes.

## 6 · "Parity" was promised across two front ends that produce different artefacts in different places

- **Passage**: `:152-154` (MVP 2: "A **toggle** picks the front end; parity is by construction, so neither
  can drift"); `:274` (Open questions: "Parity points at the latter …").
- **Counts as FOUND**: a line says "parity by construction" is unevidenced or unmet because the two front
  ends (portal UI, CLI skill) produce or store different artefacts, or that the claim is still open in
  the document's own Open questions.
- **Counts as PARTIAL**: flags MVP 2 as weak or asks what parity means, without naming the artefact or
  placement difference or the open question.
- **Reachable**: yes.

## 7 · The five-questions prefix and Stage 10 presupposed an organisation the user does not have

- **Passage**: `:184-187` (the prefix: fires "when the person does not know the organisation" — "newly
  arrived"); `:182` (Full discovery: "all ten stages") against `:123-130` (Target user: "Solo, at a
  laptop … Has the repo, the terminal and the skills").
- **Counts as FOUND**: a line says the prefix questions (or Stage 10, or "all ten stages") assume an
  organisation, a team or an arrival that the stated primary user — one person with a repo — does not
  have.
- **Counts as PARTIAL**: flags the prefix or "all ten stages" as weak, unexamined or unevidenced without
  naming the mismatch with the solo target user.
- **Reachable**: yes.

## 8 · "Full discovery, ~30, all ten stages" was wrong twice, over a bank holding its questions in nine usable stages, in an appendix the draft had not read

- **Passage**: `:53` (Evidence: "10 stages, ~30 attributed questions"); `:174` (MVP 4: "a bank that asks
  thirty questions"); `:182` (Full discovery: "~30 — all ten stages").
- **Counts as FOUND**: a line says the question count or the stage count is asserted and not established
  from the bank itself (the document never shows the bank), or names the count as wrong.
- **Counts as PARTIAL**: names the wobble between "~30", "thirty" and "10 stages" as an unevidenced figure
  without saying the bank was not read.
- **Reachable**: no for the count and the stage total — both need the appendix, which the fence denies.
  In part for the internal wobble between "~30" and "thirty".

## Scoring rule

1. Any of the 23 turns may score a finding. The candidates are the transcript's `text` lines, each
   `flag_weak_answer.missing[]` entry, each `open_question.reason` and each `record_decision.wrong_if`.
2. One quoted line per verdict, with its `turn` and `seq`. The quote is the agent's own words, never a
   paraphrase; the report never rewrites a transcript line.
3. FOUND ≥ PARTIAL ≥ MISSED, never rounded up. A line that meets the PARTIAL clause and gestures at
   the FOUND clause is PARTIAL.
4. The share is reported twice: `found / 8` over every finding, and `found / 5` over the five declared
   **yes** above (2, 4, 5, 6, 7). Findings 1 and 3 (**in part**) are scored on their derivable half and
   itemised beside the reachable share, not inside it; finding 8 (**no**) is scored and itemised as
   unreachable, and its PARTIAL clause is the only one it can meet.
5. Reachability is declared here, before the run, and is not revised after it. A finding scored MISSED
   on an unreachable clause is reported as unreachable, not as the model's failure.
6. The scorer is the implementing session; the owner confirms the itemised score at PR review. No score
   is written into any file under `discovery/partner-audit-2/`.
