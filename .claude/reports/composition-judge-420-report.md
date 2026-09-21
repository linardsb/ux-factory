# #420 report — the composition judge

**Branch** `feat/composition-judge-420` off `main` @ `4550925`.

## Predicate → the line it restates (AC #3)

| predicate | home | phrase asserted by group 38 |
|---|---|---|
| `label-reads-state-without-tone` | `PIV_COMPOSE_SYSTEM` | "without its tone" |
| `value-is-number-or-le-2-words` | `PIV_COMPOSE_SYSTEM` | "≤2-word phrase" |
| `tone-on-at-most-two-tiles` | compose.json summary-strip bound | "one or two figures" |
| `tile-count-within-slot-bounds` | compose.json slot bound | "(3–5)" (and `AT MOST n`) |
| `no-one-node-per-record` | `PIV_COMPOSE_SYSTEM` | "never one node per record" |
| `copy-uses-scenario-labels` | compose.json `copy` | "prefer" |
| `cta-is-imperative` | `PIV_COMPOSE_SYSTEM` (new bullet) | "IMPERATIVE verb phrase" |
| `link-text-is-descriptive` | `PIV_COMPOSE_SYSTEM` (new bullet) | "never \"Learn more\"" |
| `error-carries-reason` | `PIV_COMPOSE_SYSTEM` (new bullet) | "reason + action" |
| `empty-state-has-next-step` | `PIV_COMPOSE_SYSTEM` (new bullet) | "carries a next step" |
| `sentence-case` | `PIV_COMPOSE_SYSTEM` (new bullet) | "SENTENCE CASE" |

## The judge over the committed compositions (observed)

| scenario | result |
|---|---|
| fieldwork | ✅ 44 of 44 across 4 compositions |
| northwind | ❌ 42 of 44 across 4: `sentence-case` fails on `northwind-stream-insight-panel` (`[3].meta "east warehouse"`, `[4]`, `[5]`) and on `sku-attention-list` (`[1].meta "east • updated today"`, `[2]`, `[3]`, `[5]`) |

The northwind failures are real findings, not judge defects: four `meta` lines start lowercase.
They predate the sentence-case rule, which this PR is the first to state to the agent, so the
committed compositions stay exactly as they are and the finding waits for a re-record (below).

One judge correction while writing it: `copy-uses-scenario-labels` first flagged fieldwork's
"Urgent priority" because copy maps `priority` → "Priority" — a case-only pair is an ordinary word
in sentence case, so pairs that differ only in case are left to `sentence-case`; the identifiers
(`en-route` → "En route", `on-site` → "On site") are what this predicate can see.

## Gates (observed, in the worktree)

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 38 groups pass |
| group 38 mutation — the tone predicate made to always pass | ❌ `a third toned tile on a summary-strip was not caught` → restored ✅ |
| `node tooling/drift-check.mjs` | ✅ (group-count leg agrees at 38 across the four claim sites) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ no drift |
| `node tooling/composition-judge.mjs fieldwork` | ✅ exit 0 |
| `node tooling/composition-judge.mjs northwind` | ❌ exit 1, the two findings above named with node paths |

## AC #4 — MET on the second attempt: the re-record under the new prompt

**First attempt, 2026-09-21 17:29:** all four recorder calls failed at step one with the Console
spend limit (`400 … specified API usage limits … regain access on 2026-10-01`). Nothing recorded.
The owner raised the limit the same evening.

**Second attempt, 2026-09-21 20:04–20:15, on this branch after merging `main`** (new slugs, no committed
composition edited):

| run | result | cost |
|---|---|---|
| fieldwork `--dry` | ✓ 13 steps · plan→gate→implement→validate · 0 denied · `in-process validateComposition ✓` | $0.48 |
| fieldwork real, `backlog-urgency-420` | ✓ 13 steps · 6 nodes · valid ✓ · trace ✓ · manifest 1 entry (`proto/compositions/fieldwork/`, new dir — the root manifest is the study's and untouched) | $0.40 |
| northwind `--dry` | ✓ 11 steps · 0 denied · `validateComposition ✓` | $0.31 |
| northwind real, first | ✗ the agent **ended its turn after its plan** — `result ok, numTurns 4`, no Write, no file; `INVALID (not shipped)` | $0.19 |
| northwind real, `--force` | ✓ 11 steps · 7 nodes · valid ✓ · trace ✓ · manifest 5 entries | $0.35 |

The stopped-short run is model variance, not a fence or a credit stop (the dry run five minutes earlier
walked all four phases on the same prompt); the honesty rule's answer is a re-run, and the `--force`
run replaced its raw trace. No prompt was edited between the two.

**Numbers against the fixture (northwind, computed here):** 3 oversold SKUs, 5 low; shortfalls
Pallet wrap 85, Wooden pallet 70, Stretch film 40 — the composition's values, exactly. Fieldwork's
six figures (35 · 8 · 4 · 9 · 15 · 11) equal the committed `backlog-urgency` run's.

**The judge over the new runs:** `backlog-urgency-420` 11/11; `sku-attention-list-420` 11/11 — its
`meta` lines now read `East • updated today`, i.e. the new SENTENCE CASE bullet did what the two
older compositions' failures predicted it would. Northwind stands at 53/55 across five compositions:
the two failures are the two older, unedited runs, as before.

`validate-trace` ✓ on both curated traces; build-checks 38/38 (group 38 now sees five evals per
scenario); drift-check ✓.

## What this does not claim

The judge does not render and does not know the fixtures' truth; a green composition can be wrong
and a correct one can be indefensible. It checks the rules, not the taste (header).
