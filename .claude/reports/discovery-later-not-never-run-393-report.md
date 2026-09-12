# Implementation Report — the "later, not never" run (#393)

**Verdict: AC #7 MET.** `discovery/later-not-never-1/prd.md` renders `seq 21` under **Later, not
never** while Non-goals holds `seq 20` and `seq 10`. The disjointness group 31 asserts on fixtures is
now observed on a real package.

`#392` shipped the code half and reported AC #7 not met. This ticket bought the one thing only a paid
session could produce.

## What ran

| Figure | Value | Kind |
|---|---|---|
| Package | `discovery/later-not-never-1/` | — |
| Recorded | 2026-09-12, 08:44:59Z → 10:45:04Z | observed (`run.json`) |
| Settings | `blank-idea` · `full-discovery` · unfaceted · `think` · `claude-sonnet-5` · fictional | observed |
| Questions | 31 of 31 answered and closed | observed |
| Turns | 31, zero failed | observed |
| Cost | **$2.6126** | derived, Σ `costUsd` |
| Wall clock | 120 min | derived, `endedAt − startedAt` |
| Latency | min 7.2 s · median 9.8 s · max 24.4 s | derived |
| Ops | 30 `record_decision` · 2 `file_evidence` · 1 `open_question` · 0 `flag_weak_answer` | observed |
| Denied | 1 (`file_evidence`, `via: PostToolUseFailure`) | observed |
| Off-script | 0 — group 32.6's claim holds | observed |
| Question 20 | answered once, never flagged weak | observed |

Subject: a fictional margin-and-stock-leakage product for a builders' merchant. The operator invented
it; no real company.

## The one deviation from the plan, and why

**T11 said the session drafts the 31 answers and the owner pastes them. It did not happen that way —
the owner wrote all 31.**

T11 justified agent-drafting by citing the `my-product-name` rehearsal. That package was never
committed (`<JOBS_DIR>/_discovery/`), and `.claude/reports/discovery-run-0-338-report.md:232` says it
"satisfies no acceptance criterion", so it is not precedent for a committed package. Run 0 itself was
the owner's real product, answered by the owner. No committed package's record says its answers were
agent-drafted. Against that, `discovery/README.md:23` is unqualified: *"Nothing agent-written is ever
presented as a human answer."*

The choice was put to the owner before any money was spent, with the carve-out that agent-drafting
would have required (a README:23 amendment plus a disclosure line on the package). They chose to write
all 31 themselves. The honesty rule stands unamended and the package needs no caveat about authorship.

The plan's fixed question-20 answer and its community-fridge scenario were both dropped with it. The
fridge was a poor subject besides: the bank's 31 lean commercial, regulated and model-shaped, and a
volunteer charity has no material for q6, q12, q24, q25, q26 or q27.

## The failure the run hit, and the scar it left

At question 7 the account's API credit ran out. The SDK returns that as `is_error: true` under
`subtype: "success"` (memory: `sdk-error-result-wears-success`), so the drawer rendered
`Credit balance is too low` as the agent's turn rather than as a failure. No closing op was filed, the
cursor stayed on question 7, and the operator resubmitted the same answer twice before reading the
text.

Permanent consequences, both append-only and **neither edited**:

- `answers.jsonl` carries 34 lines for 31 questions — `a7`, `a8` and `a9` are byte-identical.
- `transcript.jsonl` carries three `text` lines reading `Credit balance is too low`.

Neither changes any output: the projection reads the latest answer per question, `prd-projection.mjs`
renders all twelve sections, and `build-checks` sweeps the package with no complaint beyond the
expected carrier count. They are the honest record of the failure mode and they stay.

## The cost finding — the estimate was low, and the cause is measurable

#393 expected **$1.55–1.70**, derived from 30-turn baselines at $0.050–0.055/turn. The run cost
**$2.6126** (54% over). The gap is the operator's thinking time against the prompt cache's five-minute
TTL, and it splits cleanly by the interval between turns:

| Interval before the turn | Turns | Mean cost | Mean cache-creation tokens |
|---|---|---|---|
| under 5 min | 25 | **$0.0632** | 2,466 |
| 5 min or more | 5 | **$0.1844** | 21,889 |

A turn after a long pause re-pays for the whole system prompt and ledger instead of reading them from
cache. Those five turns account for **$0.61** of the total (derived: 5 × ($0.1844 − $0.0632)).
`allergen-matrix-1` ran 78 s/turn at $0.056/turn, which is what a warm cache looks like.

**Operator rule for the next full-depth sitting:** draft the answers before opening the drawer and
paste them back to back. Advice already in the repo ("press Finish when you actually finish", "paste
real URLs") now has a third line beside it.

## The cascade — eight sites, not the three the plan named

The plan's T12 named three copies of Think's carrier count. `.claude/references/gates.md` was a fourth
(advisor's catch) and `tooling/build-checks.mjs` held three more the grep for the plan's exact phrasing
missed. All eight moved 5 → 6 in this commit:

1. `tooling/build-checks.mjs` — case 30.46's `=== 5` assertion
2. `tooling/build-checks.mjs` — case 30.46's failure message, "the five discovery-postures.mjs's header states"
3. `tooling/build-checks.mjs` — case 30.46's preceding comment, `the header's own "five recordings"`
4. `tooling/build-checks.mjs:7333` — case 30's comment, "pinned to the five recordings' literal"
5. `tooling/build-checks.mjs:7355` — case 30's failure message, "the five recordings carry 7efdde37"
6. `tooling/build-checks.mjs:8196` — group 30's summary string
7. `portal/lib/discovery-postures.mjs` — the header, "stamped on five recordings"
8. `.claude/references/gates.md` — group 30's write-up

This is `gate-prose-has-three-copies` again, one worse: grep the phrase, then grep the *number* beside
the noun.

`discovery/README.md` gained the §Files row, a §The later, not never run section carrying the scar and
the cost finding, and T7 step 5's rewrite of §The full-depth run's "only committed" sentence.

## Validation

All observed on this branch after the edits:

- `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count`
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓ 3 groups — no drift`
- `node discovery/prd-projection.mjs later-not-never-1` → `prd ✓ later-not-never-1 → 12 sections, 33 ops`
- Portal smoke on a fresh port 4791 before the sitting: `/api/health` ok, `bootSha == headSha`,
  `/api/discovery/config` → full-discovery count 31, `s4-parked-for-later` present. Stopped by PID.
- `discovery-transport.mjs --preflight` → `pre-flight ✓ all 8 rows pass, zero tokens`

**Positive control for the cascade:** before the eight edits, the gate's only failure was
`30.46: 6 recording(s) carry Think's two stamps, not the five discovery-postures.mjs's header states`,
naming `later-not-never-1 (6 turns)` mid-session. The case can fail, and it failed for exactly the
predicted reason.

## Findings

**F1 — the drawer renders an SDK error as an agent turn, and a person cannot tell.** The credit
failure reached the operator as prose in the agent's own voice. Three paid submissions and a stalled
cursor followed. The transport already knows: `is_error` is on the result. Surfacing it as a failure
state in the drawer, rather than as turn text, is a small change with a real return. *Re-scope —
belongs on #279.*

**F2 — the cost model in every discovery plan assumes a warm cache and no plan says so.** The
$0.050–0.055/turn baseline holds only when a person answers inside five minutes. A full-depth sitting
answered thoughtfully costs roughly double. Any future paid-run estimate should state the assumed pace
and quote both numbers.

**F3 — `answers.jsonl` accepts a duplicate submission for a question the cursor has not left.** Not a
bug by the append-only contract, and the projection is unaffected, but it means a stalled turn writes a
line per retry. Worth naming in `discovery/README.md`'s honesty block if it happens again; documented
in the package's own section for now.
