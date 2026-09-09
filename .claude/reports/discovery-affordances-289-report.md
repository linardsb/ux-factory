# Implementation Report — look it up, park it, and the escape hatch (#289)

**Plan**: `.claude/plans/discovery-affordances-289.md`   **Branch**: `feature/discovery-affordances-289`   **Status**: COMPLETE (Phases 1–6; Phase 7's paid probe is built and not run)

## Summary

Three drawer controls — **Park it**, **Look it up**, **Ask something else** — filing through the four
existing op verbs, with no fifth verb and no new answer kind. The person's declared `intent` is
recorded on the off-script answer line, which is what lets the applier enforce AC3 rather than only
prompt for it: four refusals keyed on the answer an op names. Two live defects fixed on the way — an
off-script decision superseded the person's own banked answer, and every closing form naming an
off-script answer recorded `closes: true`. `WebSearch` / `WebFetch` reach a `query()` on an off-script
turn only, by name through `fenceDecision`'s `extraTools` seam, so `READ_TOOLS` is untouched.

## Tasks completed

| Task | File | Action |
|---|---|---|
| 1 · supersede correction | `discovery/ops.mjs` | UPDATE — both conditions, invariant 4 rewritten |
| 1a · the four off-script refusals | `discovery/ops.mjs` | UPDATE — kind gate ×3, settle-once, closer guard |
| 2 · `ledgerView` mirrors it | `discovery/ops.mjs` | UPDATE |
| 3 · `indexOps` mirrors it | `discovery/prd-projection.mjs` | UPDATE — the comment stating the defect as intentional rewritten |
| 4 · `auditTraceability` | `discovery/ops.mjs` | ADD |
| 4a · `auditExchanges` + `sessionView.exchanges` | `discovery/ops.mjs` · `portal/lib/discovery.mjs` | ADD |
| 4b · unfiled exchange on the page | `discovery/prd-projection.mjs` | ADD — conditional; module header's five sources → six |
| 5 · format spec | `discovery/README.md` | UPDATE — §Supersede, §The op grammar, §File shapes |
| 6 · four rule constants + `pendingBrief` | `portal/lib/discovery-postures.mjs` | ADD |
| 7 · park + affordance branches ×4 builders | `portal/lib/discovery-postures.mjs` | UPDATE |
| 8 · `ledgerBrief`'s conditional evidence line | `portal/lib/discovery-postures.mjs` | UPDATE |
| 9 · `AFFORDANCE_FINGERPRINT` | `portal/lib/discovery-postures.mjs` | ADD |
| 10 · `FETCH_TOOLS` | `portal/lib/discovery.mjs` | ADD |
| 11 · `assertAffordance` / `assertParkable` | `portal/lib/discovery.mjs` | ADD |
| 12 · `appendAnswer`'s `intent`, `runTurn`'s two paths | `portal/lib/discovery.mjs` | UPDATE |
| 13 · `AFFORDANCE_MAX_TURNS`, per-turn tools, the stamp | `portal/lib/discovery-transport.mjs` | UPDATE |
| 14 · `turnEvent` projects `offScript` + `source` | `portal/lib/discovery.mjs` | UPDATE |
| 15 · the route names three more parameters | `portal/server.mjs` | UPDATE |
| 16 · three controls | `portal/public/index.html` | ADD |
| 17 · one SSE loop, four callers, the status line | `portal/public/portal.js` | UPDATE |
| 18 · the drawer's reads | `portal/public/portal.js` | UPDATE |
| 19–24 · the gates | `tooling/build-checks.mjs` | ADD — group 29 (28.6a, 28.11, 28.12), 30 (30.44–30.54), 31 (31.15, 31.16), 32 (32.6, 32.7) |
| 25 · docs | `discovery/README.md` · `CLAUDE.md` | UPDATE |
| 27 · `--probe-affordance` | `portal/lib/discovery-transport.mjs` | ADD (built; not run — see Not run) |

## Tests added

`tooling/build-checks.mjs` is the unit layer (no suite in this repo). Every new assertion went into an
existing group; the group count is unchanged at 34.

- **28.6a** the supersede correction, both conditions, plus the re-ask sequence pinned at `null`
- **28.11** the AC3 battery: kind gate ×3 behind five positive controls (banked · document · a legacy
  no-`kind` line · both compliant off-script forms); settle-once in both orders with the #286 audit
  pair accepted; the closer guard both ways (unfiled refuses by ref, the same closer accepted once the
  filing lands — the no-deadlock proof); `file_evidence` proven not to discharge; a look-up with
  nothing filed proven never to gate; `auditExchanges` before and after, total over junk
- **28.12** `auditTraceability` proven to DETECT first — a solution under an orphan stakeholder reads
  `unrooted` while neither record carries a second flag — plus `parenting` byte-equality, `byLevel`
  keyed always, a cycle terminating, totality over junk
- **30.44–30.54** byte-identity on all four builders (the case the design rests on); the four stamps
  pinned to literals; five POSTURES keys; TOOL_DESCRIPTIONS keyed as OPS; `AFFORDANCE_FINGERPRINT` as
  a map with the Grill-on-Opus recompute case and the three-input-set proof; the four rule constants
  verbatim; `ledgerBrief`'s evidence line both ways; the builders' refusals; the two session guards;
  AC5's `READ_TOOLS` / `FETCH_TOOLS` split with `allowsToolName` proven unwidened; the route pinned
  decommented
- **31.15 / 31.16** the projection over an off-script ledger, and the unfiled block with its vacuity
  control first
- **32.6 / 32.7** the corpus sweep, declaring its own counts, plus the three recorded stamps

**Red-proof, by mutation (observed):** dropping `!p.off_script` from the supersede guard reds 28.6a by
name; dropping the closer guard's `intent === "aside"` scoping reds the no-deadlock, the
open-question-form and the look-up controls; one trailing space on Think's turn prompt reds 30.45
naming both Think stamps and the recordings that would go stale.

## Validation results

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 34 groups pass` |
| `node tooling/drift-check.mjs` | ✅ all thirteen checks green |
| `node --check` ×8 touched files | ✅ |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ all 8 rows, zero tokens |
| every `prd.md` re-projected | ✅ 7 of 7 byte-identical |
| portal smoke, `PORT=4759` | ✅ boots · `/api/health` ok · `/api/discovery/config` serves 75 questions · the three controls in the markup |
| `appendAnswer` driven over a temp root | ✅ `intent` written on off-script lines only; three refusals by name; three lines share one turn id |
| VR baselines | ✅ no churn (no shipped page touched) |
| **after merging `origin/main`** (PR #385, `created` flag) | ✅ re-run at the merge commit: `build ✓ all 34 groups pass` · `drift-check ✓` · `--preflight ✓` · 7 of 7 `prd.md` byte-identical · four fingerprints unchanged |
| **the mid-session re-fold** over a store holding an off-script line | ✅ `stateFromTranscript`'s exact `applyOps(items, { answers, bank, turn: null })` accepts a package whose t1 holds an aside, its off-script decision and the banked closer; and the non-compliant order is refused on re-fold as it was at write time, so it can never be on disk |
| **park / off-script in an audit**, end to end | ✅ `assertParkable` and `assertAffordance` both refuse by name, before any append; `answers.jsonl` still holds exactly the one document line (driven on a temp root) |

Three later gate cases, each red-proofed by mutation (observed): **30.54a** pins `runTurn`'s
LOCK → GUARDS → APPEND ordering from source (moving `assertParkable` after the append reds it naming
both offsets); **30.55** pins the drawer's #289 half — one poster for all four controls, park disabled
in an audit, the status line reading `session.exchanges` scoped to the open turn (re-enabling park on
an audit reds it by name); **30.56** is the route pin, renumbered from 30.54.

**Fingerprints (observed):**

| Posture | Before | After |
|---|---|---|
| `think` | `7efdde37441fbd2591ba4a7dfeecdb6b` | **unmoved** |
| `think-opus` | `cadb38117a2660c036d87e32323a8745` | **unmoved** |
| `grill` | `76b7847d4ebbd9d8f16f9726ff0f4f0f` | **unmoved** |
| `create-prd` | `edc7c52db9d58d59213e93e65cd8d28c` | `f0e7599c7bc953b74ff3750dceca5061` — moved deliberately for `DOMAIN_RULE` |

New: `AFFORDANCE_FINGERPRINT` = think `44d0ea17…` · think-opus `6d314071…` · create-prd `be7bc73c…` ·
grill `7b858251…`.

## Deviations from the plan

**D1 — `DOMAIN_RULE` goes into Create-PRD's system prompt ALONE, not Grill's too.** The plan's
justification for moving both was "all seven committed packages run think or think-opus … it costs
nothing on disk." That premise is false at `origin/main`: there are now **eight** packages, and
`discovery/partner-audit-1` (three Grill audit turns, landed in PR #382 after the plan was written)
runs `grill` and carries stamp `76b7847d`. Moving Grill's stamp would make a committed recording stale
for text its turns never read — the exact cost the whole design exists to avoid, and the ticket's own
non-goal ("not included: re-recording any fixture"). Applying the plan's own rule to current facts:
`create-prd` moves (nothing on disk runs it — verified), `grill` does not, and `DOMAIN_RULE` reaches
Grill and Think through the affordance turn prompt only — the same gap `JUDGEMENT_RULE` and
`reaskBrief` already carry for Think, carried the same way. Case 30.45 pins all four stamps and states
the reason. **Follow-up:** a Grill re-record ticket, folded into the Think re-record ticket the plan's
Q1 already recommends.

**D2 — `AFFORDANCE_FINGERPRINT` covers THREE input sets, not two.** Task 9's snippet used park +
affordance. The shared off-script body branches on the intent (`LOOK_IT_UP_RULE` against
`ESCAPE_HATCH_RULE`), so a two-set stamp would leave one of the two rule strings covered by nothing —
the uncovered-prompt-text gap the stamp exists to close. Third set added; case 30.48 asserts the two
builds differ.

**D3 — the affordance stamp is computed off the RESOLVED posture, not looked up by id.** Task 13(c)
wrote `AFFORDANCE_FINGERPRINT[head.posture]`. `resolvePosture` RECOMPUTES a stamp on a model override
and `fingerprintOf` hashes the model, so a Grill-on-Opus run would have stamped the sonnet hash — a
stamp naming a surface the turn did not run under. The transport calls `affordanceFingerprintOf(posture)`
instead; the by-id map is kept for the gate and for a reader. Case 30.48 drives the override.

**D4 — group 31's fixture gained a banked superseding pair.** Before #289 its supersede case rode on
the defect (the off-script decision at seq 11 superseded seq 5). With the correction, `PRD_RECORDS.find(r
=> r.supersedes !== null)` was `undefined` and case 31.6 crashed. A **banked** re-decision on the same
question (seq 13, turn t9) restores the supersede case, and the off-script record now sits beside both
as its own visible row — so the fixture exercises the corrected rule in both directions rather than
losing the case with the defect. Case 31.15 reads all three.

**D5 — `auditTraceability` sanitises before calling `auditParenting`.** `auditParenting` is not total
over junk (it hands `r.params.level` to `parentCandidates`, which throws off-ladder). Softening
`auditParenting` would let a real parenting miss read as clean, so malformed decisions are dropped
before it sees them instead. Stated in the code.

**D6 — the unfiled block sits ABOVE `renderPackageView`'s empty-ledger return.** The first thing a
person does can be an aside the agent filed nothing for; "nothing filed yet" is then true about the ops
and silent about the exchange the turn cannot close without.

**D7 — `AFFORDANCES` lives in `discovery-postures.mjs`, re-exported from `discovery.mjs`.** Task 11 put
it in the session module, but the two values ARE the two rule strings, and `discovery.mjs` imports
postures (never the reverse), so one copy is the only cycle-free arrangement.

**D8 — cases renumbered TWICE.** 30.43 was already taken by #367's `declareFacets` case, so this
ticket's group-30 additions were written as 30.44–30.56; **PR #385 then landed 30.44 on `main` while
this was in flight**, so they are now **30.45–30.57**. The merge that brought #385 in also collided at
the same anchor: both blocks are kept, and the two `group("discovery", …)` ✓ descriptions were folded
into ONE call stating both tickets (a duplicate call is what `drift-check`'s `group-count` catches, and
it did).

**D10 — the recording-carrier list is DERIVED, and one figure was wrong before the PR.** The PR's
figures gate caught it: this ticket's first draft of case 30.45 said "six recordings carry Think's two
stamps" and named `allergen-matrix-1` among the carriers of `7efdde37`. Re-derived at this head, it is
**five** — `bracket-trace-1`, `bracket-trace-2`, `graded-think-a` (65 turns) and `instrument-loans-1` on
`think`, plus `graded-opus-a` (65 turns) on `think-opus` — and `allergen-matrix-1` carries an OLDER
stamp, `df6fbc35`, which it also carries on `origin/main` (verified). Its staleness is **pre-existing**,
predates this ticket, and is gated by nothing: group 32 reads `instrument-loans-1`, 33.15 the two
graded. 30.45 now reads the carrier list off disk and asserts the count, so the hand-written form that
rotted cannot come back; the mutation control (stamping `spine-meridian-1` with Think's hash) reds it
naming all six by slug. `portal/lib/discovery-postures.mjs`'s own header already said five and was
right; my new comment beside it said six and is corrected.

**D9 — Park is disabled in an audit, not only refused by the server.** A park's reason is typed into
`#discovery-answer`, which `renderDiscoverySession` hides on an audit. An enabled button whose empty-text
prose says "say why this is not answerable yet" would be pointing at a box that is not on the page —
the class of surface #289's own status-line rule forbids. Pinned by 30.55.

## Issues encountered

- **Two existing group-29 assertions pinned the defective behaviour** (`supersedes === 2` on an
  off-script decision, and a third decision superseding the second). Both rewritten to the corrected
  rule with their reddening mutations named — the plan anticipated this as Task 19.
- **A word in a code comment tripped a source pin.** Case 16 asserts `branch` never appears in
  `portal/lib/discovery.mjs` (#285's D5), and it reads the file undecommented. Comment reworded.
- **Case 12's `tools: MAIN_TOOLS` pin** had to be widened, not deleted: the query's `tools` and the
  fence's `mainTools` are still ONE value, now one variable chosen per turn kind. The pin now asserts
  that, plus `extraTools`, `AFFORDANCE_MAX_TURNS > MAX_TURNS`, `MAX_TURNS` still 6, and the resolved-posture stamp.
- **Backticks inside `group()`'s template literal** broke the parse twice. No backticks in a ✓ line.

## CI

`verify` green. `visual` **failed once and passed on a re-run of the same commit**, no change between
— `roundtrip · saulera`, 7813 pixels (ratio 0.01). This PR touches no shipped page and no `system/`
module, so it can churn no baseline by construction, and PR #385 passed `visual` on the same base.
Recorded as a suspected flake on a page the known approach-page rAF flake does not cover
([[vr-gate-approach-countup-flake]] is a different page), worth an eye rather than a shrug.

## Not run

| Step | Cost | Why not | Tracker |
|---|---|---|---|
| `cd portal && node lib/discovery-transport.mjs --probe-affordance` | ~$0.05–0.20, one paid turn | Plan Phase 7 designates it an OPERATOR step, not CI. Built and loadable; never executed. | Run it and record the numbers in the PR, or open a follow-up |
| The manual drawer walk (Level 4) | ~3 paid turns | Same — it spends real tokens through the drawer. The zero-token equivalents ran: the portal smoke, the preflight, and `appendAnswer` driven over a temp root. | As above |

**What that leaves unobserved:** whether `WebSearch` actually EXECUTES under this machine's
subscription auth with `tools: [...FETCH_TOOLS]`, and whether a live agent complies with the closer
guard rather than stalling a turn. AC1's mechanism half is therefore "the prompt and the fence are
wired; execution unobserved", stated plainly rather than implied.

**F11's number does not move here.** Run 0 left 23 of 30 decisions unbacked and named that as the
number the evidence route should be measured against. This ticket ships the route, not the
measurement: no run happens, so nothing moves it. The first run after this ticket is where it is read.

## Acceptance criteria

- ✅ **AC1** `LOOK_IT_UP_RULE` + `FETCH_TOOLS` + the per-turn wiring + the drawer control; the rule
  forbids a closing op and the applier's closer guard is scoped away from look-ups so filing nothing
  is legal. Run-time execution **unobserved** (Phase 7).
- ✅ **AC2** Park files `open_question` / `source: "banked"` with the person's reason as the answer;
  it closes, so `deriveCursor` advances and `runMetrics.notAForm` increments — asserted against #285's
  counter, never re-implemented.
- ✅ **AC3** Enforced in the applier, both ways, with the look-up control proving MVP 7's two branches
  are never gated (28.11).
- ✅ **AC4** Off-script ops never close and never advance; the supersede correction landed in all three
  readers (28.6a, 31.15) and no committed byte moved (32.6).
- ✅ **AC5** `READ_TOOLS` still exactly `Read · Grep · Glob`; the fetch tools denied on a banked turn
  and allowed on an off-script one by name; `allowsToolName` unwidened (30.53).
- ✅ **AC6** `auditTraceability` proven to detect the chain no per-record flag reaches (28.12), and the
  hierarchy's orphan count proven to agree with it over a projected package (31.15).
- ✅ `build ✓ all 34 groups pass`; `drift-check` green.
- ✅ No committed run package byte changes; every `prd.md` re-projects identically.
- ✅ Think, Think-on-Opus and **Grill** unmoved; Create-PRD moved deliberately. No fixture re-recorded.
- ✅ Vanilla, zero-dep, hand-validated boundaries, no schema library.
- ✅ `discovery/README.md` and `CLAUDE.md` carry the format change.
