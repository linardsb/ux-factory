# Implementation Report — Run 1, Faster Payment (#291)

**Plan**: `.claude/plans/discovery-faster-payment-run-291.md`
**Branch**: `feature/discovery-faster-payment-run-291`
**Base**: `7c50cba` → `9599d8a` (seal) → the run · **Status**: COMPLETE — one AC failed, reported as a failure

## Summary

Run 1 is recorded. `discovery/faster-payment/` holds the first faceted discovery package, the first
scored against a key written before the epic existed, and the first whose answers were drafted offline
and pasted warm. 22 of 22 questions settled in 15.2 minutes for $1.1638. Six of the eight acceptance
criteria are met, one is met on a different basis than the plan specified, and one failed.

**AC #5 failed.** The five look-up turns never fired: the look-up text went into the answer box instead
of the drawer's separate off-script field, so no turn was ever off-script, `WebSearch` was never
advertised, and all six `file_evidence` rows carry `url: null`. Three checkable public facts —
Confirmation of Payee, Faster Payment irrevocability, APP reimbursement — are stated in the answers and
sourced nowhere. **Not re-run**, and the reason is not cost: a second sitting would re-answer from a base
the owner has now read, which is the one contamination the sealed pre-registration cannot bound.

**AC #2 reached 4/4**, which the plan set as the target — but read it beside AC #3, not alone.

## Verdict per acceptance criterion

| AC | Verdict | Evidence |
|---|---|---|
| #1 one sitting, four files, fictional, in-repo | ✅ | `run.json` · `answers.jsonl` · `transcript.jsonl` · `prd.md`; `provenance: fictional`; 15.2 min wall clock |
| #2 independent reach 4/4 + ≥1 kill-criterion match | ✅ | 4/4 traced below; run `seq 15` matches `m-008`'s `would_measure` |
| #3 marginal reach reported | ⚠️ reported, on a changed basis | the sealed file is **agent-written and says so** — see the finding |
| #4 completion with opening-set coverage | ✅ | `coverage {asked:12, decided:12, of:12, missing:[]}` |
| #5 auditability, every checkable claim a `secondary-source` URL | ❌ **FAILED** | 6 `file_evidence` rows, all `url: null`; `seq 13` labelled `secondary-source` with no URL |
| #6 not-a-form | ✅ | `notAForm {longest: 0, max: 3, tripped: false}` |
| #7 transition note n/a with a reason, recorded | ✅ | `run.json.facets.replacesAProcess: false`; reason below; the rendered section reported separately |
| #8 turns, tokens, elapsed, latency, warm/cold | ✅ | table below |

Preconditions 1–4 executed in order, each provable from git: input `78d79f8`, seal `9599d8a`
(`2026-09-13T13:14:14+01:00`), `run.json.startedAt` `2026-09-13T12:35:46.874Z` — the seal predates the
first turn by 21 minutes 32 seconds (derived).

## What ran

| | |
|---|---|
| Settings | `blank-idea` · fictional · full-discovery · **regulated** preset · `think` on `claude-sonnet-5` · portal |
| Facets | `{hasModel:false, regulated:true, internal:false, orgBuys:false, replacesAProcess:false}` — the first non-null `facets` in the corpus |
| Composed | 22 questions (12 opening set + 6 regulated + 4 non-functional block) |
| Settled | 22 of 22, `done: true`, in **24 turns** |
| Ops | 30 — 20 `record_decision`, 6 `file_evidence`, 4 `flag_weak_answer` |
| Levels | business 2 · stakeholder 3 · solution 8 · transition 7 |
| `prd.md` | 12 sections, 30 ops |
| Wall clock | 15.2 min (`12:35:46.874Z` → `12:50:58.903Z`) |

### AC #8 — the cost read

| | Observed |
|---|---|
| Turns | 24 |
| Total | $1.1638 |
| Per turn | $0.0485 (derived: 1.1638 / 24) |
| Latency | min 3.9 s · median 10.3 s · max 24.7 s |
| Warm / cold | **24 warm, 0 cold** — every turn inside the prompt cache's 5-minute TTL |
| Failed turns | 0 |

Against `later-not-never-1`'s realised $0.0843 a turn, drafting the answers offline and pasting them
back to back saved roughly **$0.86 on this sitting** (derived: 24 × (0.0843 − 0.0485)). This is the
single cost lever and it is now measured twice.

### 24 turns for 22 questions — the bank refusing an answer, not a fault

`s6-audit-trail` and `s6-permission-model` were each asked twice. A `flag_weak_answer` does not close a
turn, so the question returned. The agent named a specific gap both times:

- `s6-audit-trail` — "whether the trail is immutable/tamper-evident once written", "who is permitted to
  read or export the log". On the re-ask: *"Unchanged from the previous answer — the content list and
  six-year retention are repeated verbatim, and immutability and read-access still aren't named."*
- `s6-permission-model` — "whether any support/engineering role can view or act as the customer …
  and if so under what control". On the re-ask it noted the repeat and let the gap stand.

`a14`/`a15` are byte-identical; `a16`/`a17` differ by one byte. This is **not** `later-not-never-1`'s
scar, where an operator resubmitted under a credit error wearing a success subtype. Nothing failed
here. It is the clearest evidence in the corpus that the session is not a form.

## AC #2 — independent reach: 4/4

Scored the other way up, against `<JOBS_DIR>/_portfolio/decisions.json`, after the run.

| Published | Run parent that serves it | Strength |
|---|---|---|
| **m-005** one clear action, not a menu | **seq 3** (business) — 38,000 customers a month need to pay someone **new** and can't in the app; £280k/month; one in five abandon; a second current account loses the salary | the business requirement is scoped to payee-setup, which is exactly the one job m-005 gives the screen |
| **m-006** check the name before the amount screen | **seq 6** (stakeholder) — the close-match explanation step is a real part of the process; the customer says "it's fine, send it" | serves it, but see marginal reach: the run never states the *before-commitment* ordering as a requirement |
| **m-007** show the balance on each account | **seq 6** (stakeholder) — "the customer frequently does not know what is in it, so the agent looks, and about one first payment in twenty is retried because the chosen account was short" | strongest; near verbatim |
| **m-008** full-screen stop before Send, acknowledgement required | **seq 14** (stakeholder) — "the only defence is that the customer ignored an effective warning, and we can only use it if we can show what they were shown and when" | strongest reasoning; the requirement is evidential, which is exactly what a full-screen acknowledged stop produces |

**Kill criterion ↔ `would_measure`:** run `seq 15` (`s7-what-would-make-us-stop`) — *"scam losses per
thousand new payees above the phone baseline"* — matches `m-008`'s *"reported scams per thousand sends
after it"*. One clean match; the target was ≥1.

**Read this as an upper bound.** The owner wrote `m-005`…`m-008` and answered the bank. Nothing in the
design separates "the bank produced these requirements" from "the answerer knew the key". That is the
whole reason the epic pairs this row with the next one.

## AC #3 — marginal reach, and a finding about the seal

**The sealed pre-registration was written by an agent, and the file says so.** Its own provenance line:
*"written by a separate agent session with no ux-factory context, at Linards's instruction, from
`_portfolio/decisions.json` (m-005 to m-008) and nothing else."*

The plan's T6 is unambiguous — *"an agent must not write one word of this file … an agent-drafted sealed
file makes the Marginal reach row measure the agent against itself, which is the one number the whole
apparatus exists to protect."* So AC #3 is **reported, but it is not measuring what the epic specified**:
the baseline is a fenced agent reasoning backwards from the key, not the owner's unaided answer. The
file disclosing its own provenance is what makes this a reportable finding rather than a silent one.
**The epic's marginal-reach metric has not been taken and cannot now be taken for run 1.** Routes to #293.

What the diff does support — the run against a strong agent baseline that had read the key itself,
including each decision's `because` and `would_measure`:

**What the run reached that the sealed answer did not**

1. **A business case.** Volume, cost, abandonment, and the churn mechanism ("once a customer keeps a
   second current account for paying people, we lose the salary within a year"). The sealed file has no
   demand, no cost and no consequence of inaction — it reasons only from decision back to requirement.
2. **Stakeholders, and who can stop it** (seq 9) — build budget with the Head of Payments, the saving
   booked by a different Operations director, a fraud veto neither funds. The sealed file calls two of
   its four parents "stakeholder requirements" and names **no stakeholder at all**.
3. **The control being removed** (seq 6) — an agent who hears coaching slows down and sometimes refuses;
   that stopped about 300 payments last year. The sealed m-008 parent argues for an evidenced warning
   without ever identifying the human check the app replaces.
4. **The accountability shift** (seq 14) — on the phone an agent shares liability; in the app there is
   no agent, so it is entirely the bank's. The sealed file states who carries the loss, not that the
   design *changes* it.
5. **Kill criteria and an eval** with thresholds, owners and a cohort (seq 15, 16). The sealed file has
   none and was not asked for any.

**What the sealed answer had that the run missed**

1. **m-005's parent is sharper.** Sealed: *"finishes the journey on their own, without a branch visit or
   a call"* — a completion requirement. The run holds that thought (answer `a4`, "the customer has to be
   able to complete it alone") but filed it at **solution** level as `seq 7`, so it was not available as
   a parent. The rung, not the content, is the gap.
2. **m-006's ordering requirement** — *"the customer sees the outcome before any money is committed"*.
   The run describes the close-match step as process, never as a requirement about ordering.
3. **m-007's "first attempt"** — the sealed file names first-attempt success as the requirement. The run
   has the evidence (one in twenty retried) and never states the requirement.
4. **Deliberate rung assignment.** The sealed file picks business or stakeholder per entry and justifies
   the choice. The run's rung discipline is loose — see AC #7.

The pattern in both directions: **the run is better at the world and worse at the ladder.** It produced
context the backward-reasoning baseline could not invent, and mis-filed several claims that would
otherwise have been parents.

## AC #5 — FAILED

**Structural half, observed:** 20 of 20 decisions carry a `wrong_if`. 5 of 20 carry `evidence_refs`
(seqs 3, 4, 6, 14, 26). `auditTraceability` reports `unrooted: []` and `parenting.missed: []` — no
orphan, no unrooted decision.

**URL half, failed:** six `file_evidence` rows, **every one `url: null`**:

| seq | ref | name | provenance |
|---|---|---|---|
| 1 | a1 | contact centre call volume/cost data | `fictional-scenario` |
| 2 | a1 | app store reviews | `fictional-scenario` |
| 5 | a3 | *(none)* | `fictional-scenario` |
| 13 | a10 | PSR APP scam reimbursement rules / FCA Consumer Duty | **`secondary-source`** |
| 24 | a20 | call-listening sample (200 calls) | `fictional-scenario` |
| 25 | a20 | customer interviews (12) | `fictional-scenario` |

Seq 13 is the sharpest line in the run: it claims `secondary-source` provenance for a public regulatory
fact and carries no source. Confirmation of Payee, Faster Payment irrevocability and APP reimbursement
are all checkable public facts stated in the answers with nothing behind them.

**Cause, and why no gate could reach it.** The drawer takes look-up text in `#discovery-offscript` and
the answer in the answer box (`portal/public/portal.js:1429`); the look-up control reads only the
former and neither closes the turn nor clears the latter. The look-up text was typed into the answer
box, so it became answer prose — visible in `a3`, `a5`, `a10` and `a23`, which literally begin "Look it
up:". Every answer line is `kind: "banked"`; no turn was off-script; a banked turn advertises
`MAIN_TOOLS = []`, so `WebSearch` was never on the wire. **The affordance is not in doubt** —
`--probe-affordance` filed four URLs with `secondary-source` the same morning at $0.1462. A pre-run gate
cannot see which textarea a person will type into.

## AC #7 — both things called "transition note"

**The AC passes on the facet.** `run.json.facets.replacesAProcess` is `false`, recorded at intake. The
product-specific reason: Faster Payment is a new consumer flow in an existing app that **replaces no
organisational process** — the phone journey it relieves is a channel for the same task, not a process
being retired, and the contact centre keeps running it for every case the app excludes (answer `a9`:
international, business accounts, standing orders, under-16s). So n/a, with a reason, recorded.

**The rendered section is a separate observation, and it is a finding.** `prd.md` renders **seven**
decisions under `## Transition note`: `s4-appetite`, `s4-rabbit-holes`, `s4-out-of-bounds`,
`s7-what-would-make-us-stop`, `s8-eval`, `s6-edge-cases-or-refusals`, `s9-strength-of-evidence`. None is
a transition requirement in BABOK's sense; they are appetite, scope and risk claims. `allergen-matrix-1`
and `later-not-never-1` show the same misuse from `s2-riskiest-assumption`, so this is now **observed on
three packages**. It is also the mechanical cause of AC #3's ladder gap: with 7 of 20 decisions parked
at `transition`, only 5 were available as business or stakeholder parents. Routes to #293 as a
posture-prompt question; `prd.md` is the projection's bytes and case 32.6 compares them, so it is not a
hand edit.

## Tasks completed

**Segment A** (committed `78d79f8`, `b9d1324` — before the sitting)

- T1 the one-sentence input → `docs/epics/fixtures/faster-payment-input.md` (CREATE)
- T2 `probeFence` parameterised by shape + `--probe-fence-run-1` → `portal/lib/discovery-transport.mjs` (UPDATE)
- T3 case 23 gains the real run-1 allow-set → `tooling/build-checks.mjs` (UPDATE)
- T3b the pre-run gate → `tooling/run-1-ready.mjs` (CREATE)
- T3c the affordance observation → `probe-affordance.out.txt` (CREATE)
- T4, T5 zero-token verification of the preset and the portal

**Segment B**

- T8 the PRD → `discovery/faster-payment/prd.md` (GENERATED, 12 sections, 30 ops)
- T9 metrics read off `runMetrics`, never counted by hand
- T10 both readings (above)
- T11 the carrier count 6 → 7 at all eight sites (UPDATE, 3 files)
- T12 **not needed** — see below
- T13 `discovery/README.md` §Files row + `## The Faster Payment run` + this report (UPDATE)

## Proving the checks

| Check | Mutation | What went red | Positive control |
|---|---|---|---|
| case 23, sealed denial | `deny(fp, SEALED)` → `allow(` | `build discovery ✗ 1 failure(s)` naming the case | restored → 34 groups pass; in-case `allow()` controls |
| `run-1-ready` check 3 | `SEALED` repointed under the run root | `check 3 — the read fence ALLOWS discovery/faster-payment/sealed.md` | six green with a throwaway at the real path |
| `run-1-ready` check 2, commit | a sealed file staged but not committed | `check 2 — … is staged but not COMMITTED` | the real seal at `9599d8a` → **exit 0, six green** |
| `run-1-ready` check 4 | `QUESTIONS` 22 → 23 | `check 4 — … composes 22 … not 23` | same green run |
| `run-1-ready` check 5 | a `run.json` planted | `check 5 — … already exists` | same green run; **now red by design** post-run |
| `probeFence` run-1 denial not vacuous | `reads: [decisions]` | key flips to `allowsPath=true fenceDecision=true` | shipped `reads: []` denies both keys |
| **30.46 carrier count** | the run itself, before T11 | `30.46: 7 recording(s) carry Think's two stamps, not the six discovery-postures.mjs's header states — … faster-payment (24 turns) …` | after T11: 34 groups pass |

The last row is the plan's predicted REDDENS, matched word for word, and it is the receipt that T11 was
earned rather than assumed.

**T12 inverted and did not fire.** The plan expected case 32.6 red because look-ups would land. Zero
look-ups landed, so `sweptExchanges === 0 && sweptOffScript === 0` held and the sweep stayed green and
stayed vacuous. The plan named this exact branch: *"If the gate is somehow already green, the run filed
no lookup and AC #5 is at risk."* It was, and it is. Nothing was widened, nothing edited toward an
outcome. 32.7's `affordanceFingerprint` prose also stays true — `run.json` carries none, because no turn
was off-script.

## Validation results

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · … · group-count` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan` (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` (observed) |
| `node discovery/prd-projection.mjs faster-payment` | `prd ✓ faster-payment → 12 sections, 30 ops` (observed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` (observed) |
| `--probe-fence-run-1` | `probe BOTH_SITES_HOLD`, exit 0, $0.1407 (observed) |
| `--probe-affordance` | `probe FILED_A_SOURCE`, exit 0, $0.1462, 4 URLs (observed) |

**Total spend on this ticket: $1.8325** (derived: Segment A $0.6687 + the sitting $1.1638). The plan
expected $1.85–2.45.

## Not run

| Step | Why | Tracker |
|---|---|---|
| The epic's marginal-reach metric | The sealed baseline is agent-written and self-discloses it. The number the epic specified cannot now be taken for run 1. | #293 |
| Re-running the sitting to recover AC #5 | The owner has read 22 turns of agent judgement on this subject; a second sitting re-answers from that base. The plan's re-run clause covers mechanism failures, and none occurred. | recorded |
| `probeFence`'s verdict arithmetic reddened end to end | Owner chose the free predicate-level redden over a paid pair. | recorded |
| Re-recording #287's run-2 fence receipt | Not reproducible on today's tree (bank past the Read cap). Costs a paid run. | needs a ticket |
| VR baseline regeneration | No shipped page touched. | n/a |

## Deviations from the plan

- **`PRESETS` is an array, not a keyed object (plan error).** `PRESETS.find(p => p.id === 'regulated')`.
- **`probeFence`'s verdict reads every Read attempt**, and its prompt bounds reads with `limit: 5` —
  both forced by `discovery/bank.mjs` passing the Read tool's 25k-token cap. Two paid `FAILED` runs
  before the fix, both committed.
- **`run-1-ready.mjs` requires a COMMIT, not a `git add`** — tightened past the plan's "tracked".
- **§The read fence was amended in Segment A, not T13** — the probe ran then.
- **T12 not executed** — its premise inverted (above).
- **AC #3 reported on a changed basis** — the seal's provenance, above.

## Assumptions carried

`think` on `claude-sonnet-5` (A1) · 22 questions, not "~30" (A2) · precondition 3's denials are the
probe's temp-root transcript (A3) · the seal lives in `docs/epics/fixtures/`, not the architecture doc's
jobs-folder path, with case 23 keeping both pins (A4) · no `-1` slug suffix, because AC #1 names
`discovery/faster-payment/` · the two pre-existing uncommitted `docs/epics/discovery-partner.*.md` edits
left alone as another session's (A5, owner's call).

## Additions beyond the plan

- Three fence-probe stdouts committed, not one — the two `FAILED` runs are the evidence that the probe's
  failure path works.
- `redden-predicate-run-1.out.txt`, the free redden's receipt.
- The README paragraph recording that #287's run-2 receipt is no longer reproducible.
- The look-up procedure written into the owner's answers file mid-session — which did not prevent the
  AC #5 failure, and that is itself the finding.

## Issues encountered

**F1 — `probeFence` scored a positive control off the first Read attempt only.** `discovery/bank.mjs` is
26,840 tokens against the Read tool's 25,000 cap, so the bank read errors on size and the agent retries
with a range; the first-call accessor never counted the retry. Verdict `FAILED` with every key denied at
every site. Fixed to read every attempt, asymmetrically.

**F2 — with F1 fixed, turn C's agent did not retry the oversized bank read at all**, so the control
honestly did not pass. Fixed at the prompt: `limit: 5` on every Read.

**F3 — #287's committed run-2 fence receipt is not reproducible on today's tree**, for the same reason.
Listed under Not run.

**F4 — a prompt-injection attempt surfaced inside a tool result during the first fence run.** The agent
identified it as untrusted file content and disregarded it. No action needed; the transcript is committed.

**F5 — AC #5's failure is a product gap, not a person's mistake.** The drawer accepts look-up text typed
into the answer box without complaint: the text becomes the answer, the turn closes normally, and
nothing anywhere says a look-up was intended and did not happen. Two places could catch it cheaply — the
drawer noticing an answer that opens with "look it up" and asking, or the package reporting at Finish
that a `secondary-source` row carries no URL. Neither exists. Worth a ticket; not one to guess at here.

**F6 — the seal's provenance.** See AC #3. The rule in `honesty-contract-mirror-direction` and in the
plan's T6 is about who writes the owner's half, and it was not followed. The file being honest about it
is what makes the finding available at all.

## Ready for the next step

The package is committed and every gate is green. Next: `piv-create-pr` with `Closes #291` in the body,
then `piv-review-pr`. The two readings feed #293, which should also take up: the transition-rung misuse
(three packages), the look-up product gap (F5), the marginal-reach metric run 1 could not supply (F6),
and the stale #287 receipt.
