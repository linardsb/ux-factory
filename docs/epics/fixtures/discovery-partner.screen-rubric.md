# The contradiction screen — the pre-registered scoring rubric (#453)

**What this file is.** Measurement apparatus for #453: how a Jev contradiction screen
(`portal/lib/discovery-screen.mjs`) over the frozen fixture
(`docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`, md5
`ab6eb0ee6cdd3b7802ecfcbe90db2377`) is scored against MVP 13's eight findings, as
`discovery-partner.run-2-rubric.md` restates them. For each finding it pins the fixture lines of each side, the
claim ids those lines map to in the committed `tooling/jev-screen/fixture-claims.json` (claims version 1, 90
claims), and the finding's class.

**Who wrote it, and when.** The implementing session, on 2026-09-27, from run 2's rubric and the committed claim
ids — **before** the first answered Jev call of this ticket. The commit that adds this file is the receipt; it
precedes `screen-run.json`'s `ranAt`. One request did reach the API earlier (2026-09-27 ≈ 09:52Z): a
no-key check that `portal/.env` refilled, refused `400 max_tokens_exceeded` with **no answers**, so no score
existed to tune against. The implementation report records it. It is not the owner's half and not a
judgement: every line here is an anchor, not a verdict. The classes are the plan's defaults (Q2); the owner may
reclassify before the first answered call, never after.

**Never an input to Jev.** Jev receives the fixture's claims and the question wording in
`QUESTION_TEMPLATES`, nothing else; this file, the run-2 rubric and `docs/epics/discovery-partner.prd.md` (which
holds the answer key) are in no request. Jev has no tools.

**Mapping rule.** An anchor `:N` maps to the claim whose `line ≤ N ≤ endLine`. A side is the set of claims its
anchors map to.

**One wide claim.** c044 is MVP item 3 whole (`:155-173`): the regulated seed, the non-functional block and the
AI module in one list item. It sits on a side of both #2 and #4, so a join through c044 is scored mechanically
here, and whether Jev's pair is about the right part of it is what the owner's precision labels check.

## The thresholds, fixed before this commit

Verbatim from `portal/lib/discovery-screen.mjs`'s header (plan D3), label-free and not derived from this file:

- `T1 = 0` — every stage-1 pick other than `none` is a candidate; if the candidates need more than
  `STAGE2_MAX_REQUESTS = 3` stage-2 requests, T1 becomes the lowest grid value 0.05…0.95 (step 0.05) that fits,
  recorded as `t1` in the summary line.
- `T_SAME = 0.5` — `same_subject.noul ≥ 0.5`.
- `T2 = 0.5` — `relation.probabilities.contradicts ≥ 0.5`.
- `K = 10` — kept = passes T_SAME and T2, ranked by `contradicts` descending, ties by `a` id then `b` id, first K.

No threshold moves after a run. If a screen keeps zero pairs, that is the result.

## Contradiction class — the denominator (3)

### 2 · The transition-note rule contradicted its own worked example

- **Side A (the rule)**: `:204-208` → **c054**.
- **Side B (the example)**: `:157` → **c044**; `:212` → **c056**.
- Joins: c054 ↔ c044, c054 ↔ c056.

### 6 · "Parity" promised by construction, still open in the document's own Open questions

- **Side A**: `:152-154` → **c043**.
- **Side B**: `:274` → **c077**.
- Joins: c043 ↔ c077.

### 8 · The internal wobble only: "~30" / "thirty" / "10 stages"

- **Positions**: `:53` → **c018**; `:174` → **c045**; `:182` → **c048**.
- Joins: any two distinct of the three — c018 ↔ c045, c018 ↔ c048, c045 ↔ c048.
- The bank-count half (the count is wrong against the bank) is unreachable from the document, as run 2
  declared, and is not scored.

## Tension-shaped — reported beside the denominator, never inside it (3)

### 4 · The AI module had no run behind it

- **Side A**: `:163-173` → **c044**. **Side B**: `:212-216` → **c056**. Joins: c044 ↔ c056.

### 5 · The existing-PRD entry mode was never specified

- **Side A**: `:104` → **c028**; `:126` → **c033**. **Side B**: `:150-151` → **c042**.
- Joins: c028 ↔ c042, c033 ↔ c042.

### 7 · The prefix and "all ten stages" presupposed an organisation the solo user does not have

- **Side A**: `:184-187` → **c049**; `:182` → **c048**. **Side B**: `:123-130` → **c033**, **c034**.
- Joins: c049 ↔ c033, c049 ↔ c034, c048 ↔ c033, c048 ↔ c034.

## Out of class — not scored (2)

- **1** (the scoring key's level) needs `decisions.json`, outside the document, for its count half, and its
  level half is a mismatch of kinds, not two claims that cannot both hold.
- **3** (role-title framing) is a judgement about framing, not a contradiction between two claims.

## Scoring states

Per finding, per screen. A pair "joins" a finding when it holds one claim from each side (for #8, two distinct
positions), in either order.

- **KEPT** — a `pair` line with `kept: true` joins the finding.
- **CONFIRMED BUT DROPPED** — a `pair` line with `kept: false` joins it; the score names which threshold dropped
  it (`sameSubject < T_SAME`, `contradicts < T2`, or outside the first K).
- **PICKED ONLY** — a `pick` line joins it (its `claim` and `picked` are the two claims) but no `pair` line
  exists for that pair; only possible if T1's proviso fired.
- **MISSED** — no pick joins it.

FOUND = KEPT. A finding takes the highest state any of its joins reaches; never rounded up.

## Scoring rule

1. Two screens are scored separately and reported side by side (plan D7): the CLI screen
   (`tooling/jev-screen/screen-run.json`) and run 3's screen (`discovery/partner-audit-3/screen.jsonl`). Jev's
   scores are not bit-stable across runs, so every number names the screen it is from.
2. The contradiction-class share is `found / 3`. The tension-shaped findings are itemised beside it, each with
   its state, and never added to it.
3. For run 3, additionally: each kept pair is **RAISED** or **NOT RAISED** by the audit, by the projection's
   rule (`raisedBy`, plan D4: both ids as whole words, or a verbatim 30-character window of each claim, in a
   `flag_weak_answer` `missing[]` entry), as `prd.md`'s Tensions section prints it.
4. Precision = owner-judged real / kept, per screen, with n, from `tooling/jev-screen/labels.json`. The session
   never writes a verdict there.
5. The scorer is the implementing session; the owner confirms the itemised score at PR review. No score is
   written into any file under `discovery/partner-audit-3/`.
