# Implementation Report — Run 1, Faster Payment (#291) · SEGMENT A

**Plan**: `.claude/plans/discovery-faster-payment-run-291.md`
**Branch**: `feature/discovery-faster-payment-run-291`
**Base**: `7c50cba` → `7c50cba` (`git merge origin/main` → `Already up to date`, observed)
**Status**: PARTIAL — Segment A (T1–T5) complete. Segments B and C are the owner's and are untouched.

## Summary

Segment A builds the harness that makes run 1 measurable and stops at the plan's hard stop. The
one-sentence input is committed, the fence probe is parameterised by run shape and has spent its paid
observation, the affordance probe has proven that look-it-up actually files a `secondary-source` URL
before a penny goes on the sitting, and `tooling/run-1-ready.mjs` now asserts all four preconditions
mechanically. That gate is red on exactly one check — the sealed pre-registration, which is the owner's
to write. Two probe defects were found and fixed along the way; both are recorded rather than tidied
away, and one of them invalidates #287's committed receipt.

**The owner's go/no-go headline: the affordance probe reported `FILED_A_SOURCE`.** WebSearch executed
under this machine's CLI login, four `file_evidence` rows landed, all four carried a URL and
`secondary-source`, and the turn did not close. AC #5's URL route works. The $1.4–1.9 sitting can buy
what the plan says it can.

## Tasks completed

- T1 the one-sentence input → `docs/epics/fixtures/faster-payment-input.md` (CREATE)
- T2 `probeFence` parameterised by shape + `--probe-fence-run-1` → `portal/lib/discovery-transport.mjs` (UPDATE)
- T3 case 23 gains the real run-1 allow-set and the committed sealed path → `tooling/build-checks.mjs` (UPDATE)
- T3b the six-check pre-run gate → `tooling/run-1-ready.mjs` (CREATE)
- T3c the affordance observation → `.claude/reports/discovery-faster-payment-run-291/probe-affordance.out.txt` (CREATE)
- T4 the regulated preset composes 22 — verified, zero tokens
- T5 portal smoke on a private port — verified, zero tokens
- The fence write-up amended with the run-1 observation and the bank-cap finding → `discovery/README.md` (UPDATE; see Deviations)

## Tests added

No test suite exists in this repo and the CLAUDE.md rule is not to hunt for one. What was added:

| Where | What it asserts |
|---|---|
| `tooling/build-checks.mjs` case 23 (7 new `ok`s) | run 1's REAL allow-set is exactly `[root, bank]`; the sealed file, the input file, the fixtures directory and the epic PRD all deny; `<root>-sealed.md` denies by the entry+sep rule; the package and the bank allow; anything UNDER the run root allows — the trap the sealed file's location exists to avoid |
| `tooling/run-1-ready.mjs` (6 checks) | input tracked · sealed tracked and non-empty · the real fence denies both files and the scoring key while allowing the package and the bank · the regulated preset composes 22 with `OPENING_SET` as its head · no `run.json` yet · the sealed file's commit timestamp |

`node tooling/build-checks.mjs` → `build ✓  all 34 groups pass` (observed).

## Proving the checks

| Check | Mutation applied | What went red | Positive control |
|---|---|---|---|
| case 23, sealed denial | `ok(deny(fp, SEALED),` → `ok(allow(fp, SEALED),` | `build discovery ✗  1 failure(s)`, exit 1, naming `case 23: run 1 must NOT read docs/epics/fixtures/faster-payment-pre-registration.sealed.md` | restored → `build ✓  all 34 groups pass`, exit 0. In-case control: `allow(fp, …/answers.jsonl)` and `allow(fp, BANK_PATH)` must pass, so a fence denying everything cannot satisfy the block |
| `run-1-ready` check 3 | `SEALED` repointed to `discovery/faster-payment/sealed.md`, a throwaway file created and staged so checks 1–2 pass | `run-1 ✗  check 3 — the read fence ALLOWS discovery/faster-payment/sealed.md … Reason: … is under …/discovery/faster-payment`, exit 1 | with a throwaway sealed file at the real docs path: `run-1 ready ✓  6 checks · regulated preset composes 22`, exit 0 — the only observation of checks 3–6 passing |
| `run-1-ready` check 4 | `QUESTIONS` 22 → 23 | `run-1 ✗  check 4 — the regulated preset composes 22 questions at full discovery, not 23`, exit 1 | same green run as above |
| `run-1-ready` check 5 | `discovery/faster-payment/run.json` created | `run-1 ✗  check 5 — … already exists — the sitting has started`, exit 1 | same green run as above |
| `probeFence` run-1 shape, denial not vacuous | `allowSetFor({root, reads: [decisions]})` instead of `reads: []`, driven over the real `allowsPath` AND `fenceDecision` | the key flips to `allowsPath=true fenceDecision=true` while the sealed key stays denied | shipped shape (`reads: []`) denies both keys at both functions. Receipt: `redden-predicate-run-1.out.txt` |

All mutations were reverted; every throwaway file was `git rm --cached`'d and deleted. `git status --short`
shows no residue (observed).

**What the last row does NOT reach**, stated rather than implied: it reddens the *predicate* both fence
sites call, not `probeFence`'s own `held`/`leaked`/`controls` arithmetic. Proving that end to end is a
second three-turn paid run (~$0.4 at the plan's estimate, ~$0.17 at the observed rate), which the plan's
cost table omits. The owner was asked and chose the free predicate-level redden. Partly mitigated by
accident: the probe reported `FAILED` twice for real before it passed, so its failure path is not
theoretical — see Issues.

## Validation results

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · token-css · … · group-count` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` (observed, run after `git add`) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` (observed) |
| `node tooling/run-1-ready.mjs` | exit 1, `check 2 — the sealed pre-registration is missing` (observed — the intended Segment A end state) |
| T4 `discoveryConfig().facetPlans['01000']` | `{"declared":true,"fired":["regulated"],"fits":["regulated"],"overflow":[],"count":22,"budget":31}` (observed) |
| T5 portal on port 4791, `/api/health` | `bootSha` `7c50cbae…` == `git rev-parse HEAD` (observed); stopped by PID, port released |
| T5 `/api/discovery/config` over the wire | facets `hasModel,regulated,internal,orgBuys,replacesAProcess`; presets `regulated,b2b-saas,internal-tool,consumer`; regulated plan count 22 (observed) |
| T2 `--probe-fence-run-1` | `probe BOTH_SITES_HOLD`, exit 0 (observed) |
| T3c `--probe-affordance` | `probe FILED_A_SOURCE`, exit 0 (observed) |

### The paid observations

| Run | Verdict | Cost (observed) | Receipt |
|---|---|---|---|
| fence, run-1 shape, attempt 1 | `FAILED` — control mis-read | $0.2145 | `probe-fence.shape-run-1.FAILED-control-misread.{out.txt,trace.jsonl}` |
| fence, run-1 shape, attempt 2 | `FAILED` — bank oversize | $0.1673 | `probe-fence.shape-run-1.FAILED-bank-oversize.{out.txt,trace.jsonl}` |
| fence, run-1 shape, attempt 3 | `BOTH_SITES_HOLD` | $0.1407 | `probe-fence.shape-run-1.{out.txt,trace.jsonl}` |
| affordance | `FILED_A_SOURCE` | $0.1462 | `probe-affordance.out.txt` |

**Segment A paid total: $0.6687** (derived: 0.2145 + 0.1673 + 0.1407 + 0.1462). The plan expected
$0.45–0.60 for one fence probe plus one affordance probe. The overrun is two extra fence runs, both
caused by the probe defects below, and both authorised: the owner chose "fix the prompt, re-run once"
when the second failure was put to them.

Per-turn rate on the passing fence run: $0.0469 (derived: 0.1407 / 3).

### What the passing fence run observed

Both keys — `_portfolio/decisions.json` and `_portfolio/pre-registration.sealed.md` — denied in all
three turns, with a `denied` line naming the site: `PreToolUse` in A (hook only) and C (both, the
production wiring), `canUseTool` in B. Both positive controls read in every turn, the package by nonce.
Precondition 3 therefore has a run-time receipt over run 1's actual allow-set, not only the predicate CI
drives. The denials live in the probe's temp-root transcript, committed under `.claude/reports/` —
plan assumption A3 is the reason none can ever appear in `discovery/faster-payment/transcript.jsonl`.

### What the affordance run observed (AC #5's mechanism)

`WebSearch` reached both fence sites and executed. Four `file_evidence` ops filed, seq 1–4, all four
with a URL and provenance `secondary-source` (Pay.UK ×2, UK Finance, TLT). The turn did **not** close,
which is what MVP 7 requires of a look-up. Zero denied lines. The agent's second message returns the
unanswered question to the person rather than answering it, which is the posture behaving.

## Not run

| Step | Why | Tracker |
|---|---|---|
| T6 — the sealed pre-registration | The owner's own hand. An agent writing one word of it voids AC #3 (memory `honesty-contract-mirror-direction`). `run-1-ready.mjs` is red on exactly this. | owner's call |
| T7 — the 22-turn sitting | Owner-only, ~$1.4–1.9. | owner's call |
| T8–T13 — projection, both readings, the eight-site cascade, the corpus-sweep widening, the run's README section | All depend on a package that does not exist yet. | Segment B of this plan |
| `probeFence`'s own verdict arithmetic reddened end to end | A second paid three-turn run; owner chose the free predicate-level redden instead. | recorded above under Proving the checks |
| Re-recording #287's run-2 fence observation | The committed receipt is no longer reproducible (see Issues F1). Re-running `--probe-fence` costs ~$0.15 and is not this ticket's precondition. | needs a ticket |
| VR baseline regeneration | No shipped page touched. Epic §Non-goals forbids it. | n/a |

## Deviations from the plan

- **`PRESETS` is an array, not a keyed object (plan error).** T3b's spec says
  `PRESETS.regulated.facets`; `discovery/bank.mjs:1046` exports `PRESETS` as a frozen **array** of
  `{id, label, facets}`. Implemented as `PRESETS.find((p) => p.id === 'regulated')`, with a check that
  names the available ids if it ever misses. Logged under AMENDMENTS in the plan.
- **`probeFence`'s verdict now reads every Read attempt, not the first.** Not in the plan; forced by a
  real defect (Issues F1). The change is asymmetric and strictly stronger on the denial side: a key is
  held only if EVERY attempt errored, where the old code checked only the first.
- **The probe's prompt now asks for `limit: 5` on every Read.** Not in the plan; forced by Issues F2.
- **The fence write-up in `discovery/README.md` was amended in Segment A, not T13.** The plan assigns
  §The read fence to T13. Moved forward because the probe ran now, and because the finding that #287's
  committed receipt is unreproducible should not sit in a branch note until after the sitting. T13's
  other README work (§Files, the run's own section) is untouched and still Segment B's.
- **One extra constant in `run-1-ready.mjs`.** Check 4's failure message originally hardcoded `22`
  separately from its assertion; the check-4 mutation printed `composes 22 … not 22`, which is the
  message/assertion split `build-checks` 30.46 exists to end. Both now read one `QUESTIONS` constant.

## Assumptions carried

- **A1 (plan)** — `think` on `claude-sonnet-5` for the sitting. Unchanged; nothing in Segment A fixes it.
- **A3 (plan)** — precondition 3's "denials landing in `transcript.jsonl`" means the probe's temp-root
  transcript under `.claude/reports/`, as #287's was. Confirmed by the passing run: a real run advertises
  `tools: []`, so no denial can ever reach the run's own transcript.
- **A4/Q3 (plan)** — the sealed file sits at `docs/epics/fixtures/…`, not the architecture doc's
  `<JOBS_DIR>/_portfolio/…`, because the jobs folder is not a git repo. Case 23 keeps BOTH pins.
- **The `-1` slug suffix is not used** — AC #1 names `discovery/faster-payment/`, and the plan says the
  AC wins over the other packages' convention.
- **Owner decision, this session** — the free predicate-level redden over a paid probe pair, and the
  two pre-existing uncommitted `docs/epics/discovery-partner.*.md` edits left alone as another session's
  (plan assumption A5's second option). Nothing in this branch depends on them; D1 rests on
  `discovery-question-selection.architecture.md`, which is committed.

## Additions beyond the plan

- `.claude/reports/discovery-faster-payment-run-291/redden-predicate-run-1.out.txt` — the free redden's
  receipt, so the choice is auditable rather than asserted.
- The two `FAILED` fence runs committed beside the passing one, named for their cause. #287's precedent:
  a probe that mis-reads its own evidence is a finding too.
- The `README.md` paragraph recording that #287's run-2 receipt is no longer reproducible.

## Issues encountered

**F1 — `probeFence` scored a positive control off the first Read attempt only.** `discovery/bank.mjs`
is 70,696 bytes / 26,840 tokens and the Read tool's cap is 25,000, so the bank read returns a size error
and the agent retries with a range. `call(t, p)` returned the first matching call, so the retry never
counted and `controls()` failed while the fence was holding perfectly. Verdict `FAILED` with every key
denied at every site. Fixed by reading every attempt, asymmetrically.

**F2 — with F1 fixed, turn C's agent did not retry the oversized bank read at all**, so the control
honestly did not pass and the verdict was still `FAILED`. Fixed at the prompt: the probe asks for the
first line, so it now says so with `limit: 5`.

**F3 — #287's committed run-2 receipt is not reproducible on today's tree.** It was recorded on
2026-09-01 at $0.398 with `BOTH_SITES_HOLD`; the bank has grown past the Read cap since. `--probe-fence`
(run-2 shape) would hit F1/F2 the same way. The fix repairs both shapes, but re-recording run 2's
observation is a paid run and was not in this ticket's scope. Listed under Not run.

**F4 — a prompt-injection attempt surfaced inside a tool result during the first fence run.** The
agent's own turn-A text names it: a `system-reminder` about malware analysis appended to a file read,
which it identified as untrusted file content and disregarded. No action needed; recorded because it
is the first time a discovery probe has met one, and the transcript is committed.

**No mechanism failure in the discovery half itself.** Every defect found was in the probe's reading of
its own evidence, which is the layer #287 already warned about.

## Ready for the next step

Segment A is complete and committed. The hard stop is next and it is the owner's:

1. Write and commit `docs/epics/fixtures/faster-payment-pre-registration.sealed.md` — four entries,
   `m-005`…`m-008`, the parent you would name unaided, one line of reasoning each. No agent touches it.
2. `node tooling/run-1-ready.mjs` must exit 0.
3. Confirm Console spend headroom, draft all 22 answers offline, then sit the session:
   slug `faster-payment` · fictional · blank idea · full discovery · Regulated · Think · portal.
4. Use look-it-up on Confirmation of Payee, APP reimbursement and Faster Payment irrevocability
   **during** the turn that states them. The route is proven; the URLs cannot be added afterwards.
