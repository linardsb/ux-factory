# #420 report — the composition judge

**Branch** `feat/composition-judge-420` off `main` @ `4550925`.

## Predicate → the line it restates (AC #3)

| predicate | home | phrase asserted by group 37 |
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
| `node tooling/build-checks.mjs` | ✅ all 37 groups pass |
| group 37 mutation — the tone predicate made to always pass | ❌ `a third toned tile on a summary-strip was not caught` → restored ✅ |
| `node tooling/drift-check.mjs` | ✅ (group-count leg agrees at 37 across the four claim sites) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ no drift |
| `node tooling/composition-judge.mjs fieldwork` | ✅ exit 0 |
| `node tooling/composition-judge.mjs northwind` | ❌ exit 1, the two findings above named with node paths |

## AC #4 — NOT MET: the re-record under the new prompt

Run 2026-09-21 17:29, four attempts in order (`--dry` fieldwork, real fieldwork, `--dry` northwind,
real northwind), new slugs `backlog-urgency-420` and `sku-attention-list-420`. Every one failed in
under five seconds with the same first step:

```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached
your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}
```

That is the owner's own Console spend limit (Billing → Spend limits), not a tier cap — a tier cap
answers 429. Nothing was recorded; the two raw residue files (one error line each) were removed and
no composition, trace or manifest changed. The commands to run once the limit is raised, from the
repo root, in this order:

```
node portal/record-composition.mjs fieldwork "How urgent is the open backlog, and what is its priority mix?" insight-panel --slug backlog-urgency-420 --dry
node portal/record-composition.mjs fieldwork "How urgent is the open backlog, and what is its priority mix?" insight-panel --slug backlog-urgency-420
node portal/record-composition.mjs northwind "Which specific SKUs need a buyer's attention first, and where does each one stand?" insight-panel --slug sku-attention-list-420 --dry
node portal/record-composition.mjs northwind "Which specific SKUs need a buyer's attention first, and where does each one stand?" insight-panel --slug sku-attention-list-420
```

Then add each new slug to its scenario's `evals.json` and run the judge over it — the northwind run
is the one that tests whether the new bullet fixes the lowercase `meta` lines.

## What this does not claim

The judge does not render and does not know the fixtures' truth; a green composition can be wrong
and a correct one can be indefensible. It checks the rules, not the taste (header).
