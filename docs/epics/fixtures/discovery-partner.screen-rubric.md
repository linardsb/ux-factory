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

## One Claude call over the whole document (#466)

**Why.** The diagnostic above read FAIL: Jev's stage 2 recognised 0 of 3 contradiction-class findings even when
handed the known joins, so scaling Jev is not the fix. Its pre-registered FAIL branch is this one: replace the
screen with one Claude call over the whole document that lists contradicting pairs with quotes. Issue:
https://github.com/linardsb/ux-factory/issues/466.

**Who wrote it, and when.** The implementing session, on 2026-09-27, before any paid call of #466. The commit
that adds this section is the receipt; it precedes the `ranAt` of all three run files below. Its sha is recorded
in the implementation report and the PR body, and the branch `feature/claude-contradiction-screen-466` is kept
after merge, because a squash merge erases the commit from `main`. It is a request, a parse, a mapping and a
scoring rule, not a verdict.

**What is sent.** Exactly `claudeRequest(document)` from `portal/lib/discovery-screen.mjs`: the model, the system
text below, and the document between the delimiters `<<<DOCUMENT` and `DOCUMENT>>>`, each on its own line.

- Model: **`claude-opus-5`**. The owner chose it on 2026-09-27 (Q2), over the plan's default `claude-sonnet-5`,
  so that a 0/3 is not left open to "a stronger model would have found them". This exceeds the issue's
  ≈ $0.03–0.05 per screen **on purpose**. The expected cost is ≈ $0.10–0.30 per fixture run (derived:
  ≈ 8k input tokens × $5/M, plus 2–10k output tokens including thinking × $25/M).
- `K = 10`.
- **promptSha = 004edd0bb4bfcf17094b9376bf613f18bb24789086504a0cbec28a09f35b7a2a**. This is `claudePromptSha()`, the sha-256 of `JSON.stringify(CLAUDE_SCREEN)` (model, K,
  system and both delimiters). The CLI refuses a paid call unless this line carries the code's sha, and
  build-checks 45.13 fails if the two differ.
- The system text, verbatim:

```text
You check one product requirements document for internal contradictions. A contradiction is two statements in this document that cannot both be true of the same product at the same time. Only the document against itself counts: not the document against the world, and not a gap, a risk, a vague passage or a missing detail.

Return at most 10 pairs, strongest first. Fewer is a good answer, and an empty list is the right answer when there are none.

Each side is a quote copied character for character from the document: one contiguous span inside a single paragraph, list item or table cell, long enough to occur only once in the document. No ellipsis, no paraphrase, no added words.

Answer with one JSON object and nothing else, in exactly this shape:
{"pairs":[{"quote_a":"…","quote_b":"…","why":"one sentence on why both cannot hold"}]}
```

- Harness options (`portal/lib/discovery-screen-call.mjs`): `tools: []`, `allowedTools: []`, `mcpServers: {}`,
  `strictMcpConfig: true`, `maxTurns: 1`, no `settingSources` (so no CLAUDE.md and no settings file), an empty
  temp `cwd`, and an abort after `CLAUDE_TIMEOUT_MS` (600 s, kept outside the hashed table). The init message must
  advertise no tool and no MCP server, or the call is refused before the model answers.
- Nothing else leaves the machine: not this file, not `labels.json`, not a run-2 file.

**Why plain JSON and not `outputFormat`.** The SDK's `outputFormat: {type: 'json_schema'}` runs as an extra
structured-output turn with its own failure subtype. Whether that works under `maxTurns: 1` with no tools cannot be
shown without a paid call before this commit. Plain JSON text with the parse rule below is deterministic.

**Output shape and parse** (`parseClaudeAnswer`). The model is asked for `{"pairs":[{"quote_a","quote_b","why"}]}`.

1. Trim. If the text starts with a code fence, drop its first line, and if it then ends with a fence, drop that
   line (`parsedBy: "fence"`).
2. `JSON.parse`. On failure, one fallback: parse the substring from the first `{` to the last `}`
   (`parsedBy: "braces"`). A second failure is `not JSON`.
3. The top level must be an object with an array `pairs`. Anything else is a named parse failure.
4. Each item needs a non-empty string `quote_a`, a non-empty string `quote_b` and a string `why`. A malformed
   item is counted, never kept, and does not fail the rest. Extra keys are ignored.

An unparseable answer is still the run. It writes no pair line and a summary naming why, and it scores 0.

**Quote → claim mapping** (`mapQuote`). Quotes map through the document's SOURCE LINES and the committed claims
(`fixture-claims.json` for the fixture; `splitClaims` otherwise), by this file's own mapping rule: a line `N` maps
to the claim whose `line ≤ N ≤ endLine`. The splitter reformats claim text, so claim text is never matched.

1. **Normalise** each source line and the quote the same way: straighten curly quotes; map em and en dashes to
   `-`; map a non-breaking space to a space; replace a markdown link `[x](y)` with `x`; delete every `*`, `_` and
   backtick; replace `\|` with `|`; collapse whitespace; trim; lower-case. For the quote only: a quote containing
   `…` or `...` is **unmapped (ellipsis)**; then trailing `.`, `,`, `;` and `:` are stripped, and an empty result
   is **unmapped (empty)**. No fuzzy matching of any kind.
2. **Index**: the normalised non-empty lines, joined with one space, each with its source line number.
3. **Find** every occurrence of the quote (overlaps allowed). An occurrence's claim set is every claim holding a
   line the occurrence touches.
4. **Decide**:
   - no occurrence → **unmapped** (no claim);
   - occurrences with different claim sets → **ambiguous** (repeated in two claims);
   - an empty claim set (a heading, a table header or a separator row only) → **unmapped**;
   - a claim set of two or more (the quote crosses a claim boundary) → **ambiguous**;
   - exactly one claim → **mapped**.

**Kept** (`mapPairs`). In returned order, a pair is kept when both sides are mapped, the two sides are on different
claims, it does not repeat an earlier kept pair, and it is among the first `K = 10` such pairs. A dropped pair is
`unmapped`, `ambiguous`, `same-claim`, `duplicate` or `outside-K`. The lower claim id is `a`.

**Who answered.** `result.modelUsage` must carry `claude-opus-5` as a key. Another key (a helper call the harness
bills) is reported with its cost and never changes the score. If the registered model is absent, the run is
reported as answered by whatever `modelUsage` names, is scored as registered, and is never re-run.

**Answered vs no answer.** A **no-answer** is a transport error, an abort or timeout, no result message, a
non-success subtype, or `is_error: true`. It writes nothing and may be repeated, and every attempt and its cost
are reported. The first **answered** call is the run: it is written whatever it says, scored as registered, and
never repeated.

**The mechanism smoke, and what "nothing moves" covers.** This commit fixes the prompt wording, the model, the
output shape (with the parse) and the scoring (with the mapping and the kept rule). **None of them moves after
this commit, for any reason.** Before the fixture run, one paid call screens `SMOKE_DOC` (below, verbatim from
`tooling/jev-screen.mjs`), an invented product with one planted contradiction. It is never scored and shares no
subject with the fixture or this file. It proves the harness only: no tool advertised, the registered model
answering, and a result that parses. If it exposes a **harness** defect, only the harness options may change
(`cwd`, `maxTurns`, `CLAUDE_TIMEOUT_MS`, the tools/MCP/settings isolation and the SDK plumbing in
`discovery-screen-call.mjs`). Such a change is an amendment to this section, committed and pushed before the
fixture run. A smoke answer that merely misses the planted contradiction changes nothing.

```text
# Kettle Club — product brief

Kettle Club is a monthly tea subscription for people who brew loose-leaf tea at home.

## What a member gets

- One box a month with three loose-leaf teas and a tasting card.
- Every box ships on the first Monday of the month.
- Members can pause deliveries from their account page.

## Operations

Boxes ship on the 15th of each month from our Leeds warehouse.
Tracking links are emailed the day a box leaves the warehouse.
```

**Scoring** (`tooling/jev-screen/claude-score.mjs`, `scoreClaudeRun`). The joins are the ones in §Contradiction
class and §Tension-shaped above, read from `DIAGNOSTIC_JOINS` minus the three controls. A pair joins a finding when
its two mapped ids equal one of the finding's joins as a set (for #8, two distinct positions).

- **FOUND**: a kept pair joins it. **OUTSIDE K**: only a mapped pair dropped as `outside-K` joins it. **MISSED**:
  otherwise. Never rounded up; an unmapped or ambiguous side joins nothing.
- Report contradiction-class `found / 3`, with the tension-shaped findings itemised beside it and never added, and
  every returned pair with its mapping status.
- Precision = owner-judged real / kept, from `tooling/jev-screen/claude-labels.json`. It is reported **pending the
  owner** until that file's `by` is `"owner"`. The session never writes a verdict.

**The live check.** One paid call on `docs/epics/discovery-partner.prd.md` at its md5 when run (today
`e820f96bf32f0dc3930779abb6fba61a`, 51,471 bytes), with the screened text embedded in its run file. It is reported
beside the fixture score and never pooled with it. It is not scored against this rubric, because the live PRD is
the document the findings were fixed in. Its kept pairs are listed for the owner's labels.

**Decision tied to the result.** If at least 1 contradiction-class finding is FOUND, a later ticket *may* turn the
screen on (issue requirement 5). This ticket turns nothing on: `SCREEN_AUDIT` stays `false`, and the route still
screens only on `screen: true`.

No wording, model, K, parse, mapping or scoring rule moves after this commit.

### Result (recorded after the runs, 2026-09-27)

Three answered calls, each the first and only attempt of its kind; there was no no-answer. All three `ranAt`
follow the pre-registration commit `7947aa4` (12:18:10Z, pushed before the first call). Costs are `costUsd`
(observed), which includes two helper calls the harness bills on every query (see "Who answered").

| Run | `ranAt` | Answered in | Cost | Returned | Kept | Parse |
|---|---|---|---|---|---|---|
| smoke (`SMOKE_DOC`, never scored) | 12:19:22Z | 2.2 s | $0.0323 | 1 | 1 | ok (direct) |
| fixture | 12:19:45Z | 94.4 s | $0.1895 | 4 | 4 | ok (direct) |
| live (`e820f96b…`) | 12:21:28Z | 151.9 s | $0.3111 | 6 | 3 | ok (direct) |

**The smoke.** Init advertised no tool, no MCP server and no skill. `claude-opus-5` answered: its `modelUsage`
entry (480 in, 155 out) is the call's `usage`. The one returned pair was the planted contradiction, mapped to
c003 ↔ c005. No harness amendment was needed.

**Who answered.** On every run `modelUsage` carries `claude-opus-5` plus two keys the harness adds:
`claude-sonnet-4-5-20250929` (≈ $0.014 per run) and `claude-haiku-4-5-20251001` ($0.003–0.014). Their token
counts do not match the call's `usage`, which is Opus's alone. Per the rule above they are reported and do not
enter the score.

**Fixture, scored** (`scoreClaudeRun` over `tooling/jev-screen/claude-fixture-run.json`; build-checks 45.14
recomputes it):

| Finding | Class | State | By pair |
|---|---|---|---|
| #2 | contradiction | **FOUND** | #0 (c044 ↔ c054) |
| #6 | contradiction | MISSED | — |
| #8 | contradiction | MISSED | — |
| #4 | tension-shaped | MISSED | — |
| #5 | tension-shaped | MISSED | — |
| #7 | tension-shaped | MISSED | — |

**Contradiction-class findings FOUND: 1 / 3 (#2).** Tension-shaped: 0 / 3, itemised and not added. Every returned
pair, with its mapping:

| # | Mapping | Kept | Joins |
|---|---|---|---|
| 0 | c054 ↔ c044, both mapped | yes | #2 |
| 1 | c051 ↔ c078, both mapped | yes | — |
| 2 | c001 ↔ c063, both mapped | yes | — |
| 3 | c029 ↔ c058, both mapped | yes | — |

No quote was unmapped or ambiguous, so no miss belongs to the mapper. The FOUND pair runs through the wide claim
c044: its c044 quote ("regulated because the first run is regulated fintech") sits on `:157`, #2's side-B anchor
(the worked example), not on #4's AI-module lines `:163-173`; its c054 quote sits on `:206`, inside side A
(`:204-208`). Whether the pair is about the right part of c044 is what the owner's precision labels check. Precision is **pending the owner**
(`tooling/jev-screen/claude-labels.json`, `by: null`, 4 pairs).

**Live, not scored** (`tooling/jev-screen/claude-live-run.json`, 138 claims): kept c038 ↔ c047, c044 ↔ c047 and
c038 ↔ c131. Three more returned pairs were dropped as `same-claim`, two of them with both quotes inside c001,
which the splitter makes from the live PRD's lines 3–16 as one claim. The kept pairs are in `claude-labels.json`
for the owner. Reported beside the fixture, never pooled with it.

**Against the decision rule.** One contradiction-class finding is FOUND, so a later ticket *may* turn the screen
on. This ticket turned nothing on.
