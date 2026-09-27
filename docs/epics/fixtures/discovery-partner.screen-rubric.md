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

## Diagnostic: stage 2 on the known joins

**Why.** Both screens missed every scored finding at stage 1: each anchor claim picked `none`. That result
cannot say whether stage 2 would have recognised the contradictions if stage 1 had put them forward. This
diagnostic hands stage 2 the known joins directly and measures that alone. It decides which follow-up ticket
comes next; it changes nothing that ships.

**Who wrote it, and when.** The follow-up session, on 2026-09-27, before any answered call of the diagnostic.
The commit that adds this section is the receipt; it precedes `tooling/jev-screen/diagnostic-run.json`'s
`ranAt`. It is an anchor list and a decision rule, not a verdict.

**What Jev is sent.** Exactly `stage2Questions(a, b)` and `QUESTION_TEMPLATES.stage2State` from
`portal/lib/discovery-screen.mjs`, unchanged, for the 16 pairs below, packed by `batches()` into the fewest
requests, each with `SCREEN_TIMEOUT_MS`, retried on 429/529 only. No stage 1, no wording change, no threshold
change. One run; never re-run for a better score.

**Orientation.** The relation question reads "does claim `a` … claim `b`". Every pair is sent with the lower id as
`a`, as `candidatePairs` orders a stage-1 candidate, whatever order the finding lists its sides in.

### The 16 pairs, as sent (`a` ↔ `b`)

| # | Pair | Finding | Class |
|---|---|---|---|
| 1 | c044 ↔ c054 | #2 | contradiction |
| 2 | c054 ↔ c056 | #2 | contradiction |
| 3 | c043 ↔ c077 | #6 | contradiction |
| 4 | c018 ↔ c045 | #8 | contradiction |
| 5 | c018 ↔ c048 | #8 | contradiction |
| 6 | c045 ↔ c048 | #8 | contradiction |
| 7 | c044 ↔ c056 | #4 | tension-shaped |
| 8 | c028 ↔ c042 | #5 | tension-shaped |
| 9 | c033 ↔ c042 | #5 | tension-shaped |
| 10 | c033 ↔ c049 | #7 | tension-shaped |
| 11 | c034 ↔ c049 | #7 | tension-shaped |
| 12 | c033 ↔ c048 | #7 | tension-shaped |
| 13 | c034 ↔ c048 | #7 | tension-shaped |
| 14 | c005 ↔ c061 | — | control |
| 15 | c029 ↔ c030 | — | control |
| 16 | c035 ↔ c066 | — | control |

The joins are this file's own, above. The three controls are the pairs both screens kept and `labels.json`
judges not real. They are **reported, never scored**: they show whether stage 2 repeats its earlier numbers on
the same pair, and they do not enter the verdict.

### Decision rule, fixed now

- A pair is **RECOGNISED** when `relation.probabilities.contradicts ≥ 0.5` **and** `same_subject.noul ≥ 0.5`: the
  module's own `T2` and `T_SAME`, inclusive, read from the module at run time. `K` does not apply; this is not a
  selection.
- A finding is **RECOGNISED** when at least one of its joins is.
- **Jev PASSES** when at least **2 of the 3** contradiction-class findings (#2, #6, #8) are recognised. The next
  ticket is then: **drop stage 1 and judge all 4,005 pairs in stage 2 (≈ $0.12)**.
- Otherwise **Jev FAILS**. The next ticket is then: **replace the screen with one Claude call over the whole
  document that lists contradicting pairs with quotes (≈ $0.03–0.05)**.
- The tension-shaped findings (#4, #5, #7) are itemised beside the verdict and never counted in it.
- No threshold, wording, orientation or pair moves after this commit.

### Result (recorded after the run, 2026-09-27)

One request, `ranAt` 2026-09-27T11:23:14.335Z, 42 s after the pre-registration commit (`b2cbd3d`,
11:22:32Z). The run was meant to be the no-key check: `portal/.env` was moved aside, but the shell exported
`TYPESAFE_API_KEY`, so the request was answered. It is the one run and is scored as registered. The no-key check
was then done with the key unset as well (`env -u TYPESAFE_API_KEY`): it refused naming the key and wrote nothing.

| Pair | Finding | Class | contradicts (choice) | same_subject | RECOGNISED |
|---|---|---|---|---|---|
| c044 ↔ c054 | #2 | contradiction | 0.01 (not_established) | 0.07 | no |
| c054 ↔ c056 | #2 | contradiction | 0.01 (not_established) | 0.10 | no |
| c043 ↔ c077 | #6 | contradiction | 0.08 (supports) | 0.44 | no |
| c018 ↔ c045 | #8 | contradiction | 0.20 (supports) | 0.71 | no |
| c018 ↔ c048 | #8 | contradiction | 0.70 (contradicts) | 0.35 | no |
| c045 ↔ c048 | #8 | contradiction | 0.34 (supports) | 0.83 | no |
| c044 ↔ c056 | #4 | tension-shaped | 0.02 (not_established) | 0.17 | no |
| c028 ↔ c042 | #5 | tension-shaped | 0.07 (supports) | 0.72 | no |
| c033 ↔ c042 | #5 | tension-shaped | 0.25 (not_established) | 0.34 | no |
| c033 ↔ c049 | #7 | tension-shaped | 0.06 (not_established) | 0.15 | no |
| c034 ↔ c049 | #7 | tension-shaped | 0.01 (supports) | 0.42 | no |
| c033 ↔ c048 | #7 | tension-shaped | 0.05 (not_established) | 0.16 | no |
| c034 ↔ c048 | #7 | tension-shaped | 0.03 (supports) | 0.64 | no |
| c005 ↔ c061 | — | control | 0.98 (contradicts) | 0.85 | yes |
| c029 ↔ c030 | — | control | 0.89 (contradicts) | 0.88 | yes |
| c035 ↔ c066 | — | control | 0.66 (contradicts) | 0.78 | yes |

**Contradiction-class findings recognised: 0 / 3. Jev FAILS.** Tension-shaped: 0 / 3. The three controls (not real
per labels.json's session-written labels, awaiting the owner's adoption) were recognised again, within 0.05 of
the CLI screen's numbers on each (0.98/0.85, 0.88/0.88, 0.71/0.78 there; derived). The next ticket is the one-call Claude screen. Numbers are
computed from `tooling/jev-screen/diagnostic-run.json`; build-checks 45.12 recomputes them.
