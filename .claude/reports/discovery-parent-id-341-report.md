# Implementation Report — the agent fills `parent_id`; parenting becomes a lookup, and a recorded run proves it (#341)

**Plan**: `.claude/plans/discovery-parent-id-341.md`   **Branch**: `fix/341-parent-id`   **Status**: COMPLETE
**Epic**: #279 · **Fixture**: `discovery/instrument-loans-1/` (fictional, `opening-set`, committed)

*Observed* means read from the named command's output or file field on 2026-08-31, on this machine.
*Derived* shows the arithmetic. *Expected* is an assumption.

## Summary

The rehearsal that filed #341 passed `parent_id: null` on 18 of 18 eligible decisions because the
agent was never shown the ledger. Three layers now read one function (`parentCandidates`): the turn
prompt carries this run's decisions by rung and the parent candidates per rung (`ledgerBrief`), the
system prompt's permission became an instruction (`PARENT_RULE`), and the applier's wrong-rung refusal
names the seqs to retry with. A pure `auditParenting` read was proven to detect a miss, then applied
by a new build-checks group 32 to a real `opening-set` run recorded through the drawer: **10 eligible,
0 missed, 0 structural**, every named parent in its candidate set at the moment of filing. A
prompt-surface fingerprint stamped on every turn makes any later prompt edit fail that group by name.

## Tasks completed

- Task 0 branch → `fix/341-parent-id` from `origin/main` (see D1)
- Tasks 1–4 `parentCandidates`, `auditParenting`, the correcting refusal, header → `discovery/ops.mjs` (UPDATE)
- Task 5 group 29 case 28.5a → `tooling/build-checks.mjs` (UPDATE)
- Tasks 6–7 `PARENT_RULE`, `ledgerBrief`, `TOOL_DESCRIPTIONS`, `FINGERPRINT_INPUTS` + `fingerprintOf`, `buildThinkTurn({ …, ledger })` → `portal/lib/discovery-postures.mjs` (UPDATE)
- Task 8 the ledger argument, the descriptions import, `postureFingerprint` on `turnStats` → `portal/lib/discovery-transport.mjs` (UPDATE)
- Task 8b `probeParenting()` + `--probe-parenting` → `portal/lib/discovery-transport.mjs` (UPDATE)
- Task 9 group 30 cases 17–19, case 12's transport pins, case 11/16 extensions → `tooling/build-checks.mjs` (UPDATE)
- Task 10 group 32 + header + list + verdict at 32; `readPackage` imported → `tooling/build-checks.mjs` (UPDATE)
- Task 11 → `discovery/README.md` (UPDATE: files tree, refusal bullet, `postureFingerprint`, §The parenting fixture, commands)
- Task 12 → `.claude/references/gates.md` (UPDATE: groups 29/30/32, the probe, "32 pure groups"), `CLAUDE.md` (UPDATE: two counts)
- Task 13 commit `1f3cd95` — Phases 1–3, group 32 deliberately red
- Tasks 14–15 the probe gate, a fresh portal on `PORT=4748`, the fixture run → `discovery/instrument-loans-1/` (CREATE, server-written; `prd.md` generated)
- Task 16 the whole surface validated (below)
- Task 17 this report (CREATE)

## The red run, before the fixture existed (Task 10)

Verbatim from `node tooling/build-checks.mjs` at commit `1f3cd95`, exit 1 (observed):

```
build parenting      ✗  1 failure(s)
    · no run package at discovery/instrument-loans-1 — record it through the drawer per .claude/plans/discovery-parent-id-341.md Phase 4; this group never skips
build ✗  1 failure(s)
```

Every other group was ✓. That run is the proof group 32 can fail.

## The probe gate (Task 8b / 14)

Two consecutive runs of `cd portal && node lib/discovery-transport.mjs --probe-parenting`, both under
prompt surface `df6fbc35a5d91537dc417288b67c123e`, nothing edited between them (observed):

| # | Verdict | Filed | Corrections | Cost | Duration | Agent prose |
|---|---|---|---|---|---|---|
| 1 | PARENTED, exit 0 | `record_decision seq 4 at solution, parent_id 2` | 0 | $0.1040 | 15.9 s | "The answer names an appetite — two weeks, fixed, with a defined fallback (handover-only) if the work doesn't fit inside it. …" / "Filed." |
| 2 | PARENTED, exit 0 | `record_decision seq 4 at solution, parent_id 2` | 0 | $0.0409 | 18.4 s | "The answer fixes the appetite before scope — two weeks, one developer, with a named fallback … " / "Filed as seq 4 (solution, parent seq 2)." |

Probe 1 was the cold cache (the first run after the prompt changed); probe 2 read it warm. Pre-flight
before each: `pre-flight ✓  all 8 rows pass, zero tokens` (observed, twice).

## The fixture run (Task 15) — ONE attempt, kept under the pre-registered decision rule

Recorded through the real drawer at `http://localhost:4748` (a fresh `PORT=4748 node server.mjs`
started from this tree after every edit, PID 45059, stopped after; port 4747 and its PID 68762 were
not touched), driven with `agent-browser` — the real form controls, the real `/api/discovery/*`
routes, the real origin guard (the #338 D1 precedent). Slug `instrument-loans-1`, provenance
`fictional`, depth `opening-set`, posture `think`; Finish pressed at the end.

| Number | Value | Kind |
|---|---|---|
| Attempts | 1 (decision rule: `missed 0` and `eligible ≥ 1` → keep) | observed |
| Answers stored | 12 of 12, byte-identical to the sheet's twelve files (0 mismatches) | observed |
| Turns closed | 12 of 12, one closing op each, no re-submit needed | observed |
| Decisions filed | 12 `record_decision` · 0 `flag_weak_answer` · 0 `open_question` · 0 `file_evidence` | observed |
| `auditParenting` | `eligible [3,4,5,6,7,8,9,10,11,12]` · `missed []` · `structural []` | observed |
| Denied lines | 3 — `Bash` ×2, `Glob` ×1, all on t12 (the fence, F4); **0 naming `parent_id`** | observed |
| `turnStats` | 12 entries over 12 distinct turns, every `postureFingerprint` = `df6fbc35…` | observed |
| Cost | **$0.4129** over 12 turns (Σ `turnStats[].costUsd`) | derived |
| Per-turn latency | min 10.4 s · median 13.1 s · max 19.5 s · Σ 2 m 46 s | derived from `durationMs` |
| Total spend this ticket | $0.4129 + $0.1040 + $0.0409 = **$0.558** | derived |
| `endedAt` | `2026-08-31T11:22:02.351Z` | observed |

**The ladder the run produced** (`discovery/instrument-loans-1/prd.md` §Requirement hierarchy, quoted):

```
- **business** — 2
  - seq 1 `s1-if-nobody-solves-this` — no parent by definition
  - seq 2 `s1-how-addressed-today` — no parent by definition
- **stakeholder** — 3
  - seq 3 `s6-process-as-it-runs` — parent: seq 2
  - seq 6 `s5-pain-budget-same-person` — parent: seq 1
  - seq 10 `s6-accountable-when-wrong` — parent: seq 2
- **solution** — 2
  - seq 4 `s1-what-would-have-to-be-true` — parent: seq 3
  - seq 12 `s8-eval` — parent: seq 6
- **transition** — 5
  - seq 5 `s2-riskiest-assumption` — parent: seq 4
  - seq 7 `s4-appetite` — parent: seq 4
  - seq 8 `s4-rabbit-holes` — parent: seq 4
  - seq 9 `s4-out-of-bounds` — parent: seq 4
  - seq 11 `s7-what-would-make-us-stop` — parent: seq 4

business 2 · stakeholder 3 · solution 2 · transition 5 · orphans 0
```

Every non-business decision names `parent: seq N`; no `⚠ orphan` anywhere. The green ✓ line:

```
build parenting      ✓  … 12 op lines RE-FOLDED through the real applier … 12 turnStats entries over 12 distinct turns, every one stamped with the CURRENT prompt-surface fingerprint df6fbc35 … 12 decisions filed, 10 eligible for a parent, 0 missed, 0 structural orphan(s) (seq none), every named parent in its candidate set at the moment of filing, 0 in-turn parent correction(s) receipted as denied lines · the projected hierarchy carrying a real "parent: seq" line, prd.md present. What it cannot reach: the model's behaviour under an UNCHANGED prompt on a later date, or under a newer SDK …
```

## Disclosure — the answers are agent-written, fictional, pre-registered

The twelve answers were written by the planning agent on 2026-08-31 and pre-registered in
`.claude/plans/discovery-parent-id-341.md` §PRE-REGISTERED ANSWER SHEET before any run, so they could
not be tuned to the agent's behaviour after the fact. They describe a fictional product — an
instrument-loan register for a secondary-school music department; every name and number is invented.
**The package is not the owner's authored discovery** (the #284 D3 precedent). `answers.jsonl` was
written by the server on submit and is byte-identical to the sheet; nothing in the package was
hand-written or hand-edited. `run.json` carries `label: "Real run — fictional scenario"`, which is
the true label.

## The checks that were made to fail (all reverted, each file restored and re-verified)

| Mutation | Went red by name | Restored |
|---|---|---|
| `auditParenting`: `ops.slice(0, i)` → `ops` | group 29: "after a later stakeholder lands the audit reads {…missed:[2]…}, not structural [2, 3] — candidates must be read at the MOMENT OF FILING" | `cp` back, `build ✓` |
| `${PARENT_RULE}` deleted from `SYSTEM` | group 30 case 16: "PARENT_RULE does not appear VERBATIM in the built system prompt" | `cp` back, `build ✓` |
| transport `ledger: state.current.ops` → `ledger: []` | group 30 case 12: "does not pass ledger: state.current.ops to posture.build" | `cp` back, `build ✓` |
| package absent (before Phase 4) | group 32: "no run package at discovery/instrument-loans-1 … this group never skips" | recorded |
| one word in `PARENT_RULE` after the fixture | group 32 32.2a: "prompt surface changed since the fixture was recorded (fixture df6fbc35 vs current 525e5316) — run the probe, then re-record" | `cp` back, `cmp` byte-identical, `build ✓` |
| transient one-byte edit to the committed op line seq 4 (`parent_id` 3 → 2) | group 32 32.3: "the committed op lines do not re-fold through the applier — op 3 (record_decision): parent_id 2 is a business decision … This run's stakeholder decisions are seq 3" (+ 32.4's candidate check) | `cp` back, `cmp` byte-identical, `build ✓ all 32 groups pass` |

The last row touched a package file for one gate run and restored it byte-for-byte (`cmp` exit 0)
before anything was committed; the committed bytes are the server's. Stated here so the honesty rule
is seen to be kept, not assumed.

## Tests added

No suite (CLAUDE.md §Testing). Gate cases:

- **Group 29** (28.5a): `parentCandidates` both branches, the two junk throws, its set proven to BE
  the applier's acceptance set; the refusal with and without candidates; `auditParenting`'s three
  lists including the miss, the parented case, the structural orphan, the moment-of-filing rule in
  both directions, junk, purity.
- **Group 30**: case 11 requires `ledger` (two more junk builds); case 16 pins `PARENT_RULE` verbatim
  and asserts it instructs; case 17 the brief (empty / three-rung applier-built / off-script, verbatim
  in the turn prompt, absent from the system prompt, recency line last, brief ↔ refusal naming the
  same seq); case 18 `TOOL_DESCRIPTIONS`; case 19 the fingerprint (deterministic, moved by model /
  system prompt / template, over fixed inputs not in the bank); case 12 the transport pinned from
  source (ledger passed, one copy of the tool text, stamp off the posture).
- **Group 32**: the detector's mutation control, the package's self-description, the freshness
  tripwire, the re-fold, the claim, the projection, `prd.md` present.

## Validation results

| Gate | Result |
|---|---|
| `node --check` × 4 (ops, postures, transport, build-checks) | ✅ (observed) |
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 32 groups pass` (observed, after the fixture; exactly one red before it) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks (observed, twice) |
| `node agent-layer/gen-loc-summary.mjs --check` after commit `1f3cd95` | ✅ `3 groups — no drift` (observed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ 8/8, zero tokens (observed, ×2) |
| `cd portal && node lib/discovery-transport.mjs --probe-parenting` | ✅ PARENTED ×2, exit 0 (observed) |
| The oracle (rehearsal package, local, never committed) | ✅ `{"eligible":[6,7,8,9,10,11,12,15,17,20,21,22,23,24,26,28,29,30],"missed":[same 18],"structural":[5]}` — 18 · 18 · [5] exactly (observed) |
| `node discovery/prd-projection.mjs instrument-loans-1` | ✅ `prd ✓  instrument-loans-1 → 11 sections, 12 ops` (observed) |
| `grep -n "31 PURE\|31 groups\|Thirty-one\|31 pure" CLAUDE.md gates.md build-checks.mjs README.md` | ✅ no hits (observed) |
| `git status --short \| grep -c _discovery` | ✅ 0 (observed) |
| Port 4747 | ✅ untouched — still held by PID 68762 after the run (observed) |

## Deviations from the plan

- **D1 — branched from `origin/main` (`5e8208a`), not from "`4992172` or later".** The two #338
  commits (`93dfb57`, `4992172`) are docs-only (plan + report) and sit unpushed on the local
  `chore/338-run-0`; none of the code this ticket needs is in them. Branching from `origin/main` keeps
  this PR to one ticket. The #338 report was read via `git show chore/338-run-0:…` for the report
  shape and the F2/F5 numbers.
- **D2 — the drawer's start control is `#discovery-open`, not `#discovery-start`** (that id is the
  fieldset). Same flow, one selector; the plan's other ids were right.
- **D3 — group 32's turn count is over DISTINCT turns, not `turnStats.length === 12`.** R2 permits a
  re-submit on a turn the agent yielded without closing, which adds a second `turnStats` entry for the
  same turn; asserting `=== 12` would have made an honest re-submit go red. The set of turns must equal
  `t1…t12`, and every entry must carry the current fingerprint. (This run had 12 entries over 12 turns;
  the ✓ line reports both numbers.)
- **D4 — the probe writes a minimal `run.json` into its temp root.** `runDiscoveryTurn` calls
  `recordSessionId` on the SDK's init message, which is non-fatal without a `run.json` but prints a
  stderr line every probe. The stub says in its own `label` that it is a probe root, never a package,
  and the root is deleted on exit. Same licence as the pre-flight's stub answers.
- **D5 — `prd.md` is committed exactly as projected, unedited.** The README says a human edits it
  afterwards; for a gate fixture it stays as the fold produced it, so group 32's projection assertion
  and the file agree. Stated in the README's new section.
- **D6 — no structural orphan occurred.** The sheet expected position 5 (`s2-riskiest-assumption`) to
  be a `solution` decision filed before any stakeholder decision (cause B). The agent filed seq 3
  (`s6-process-as-it-runs`) at `stakeholder` and seq 4 at `solution` first, so by seq 5 a parent
  existed at every rung and it filed `transition` under seq 4. Level choice is out of scope (the
  audit is conditional on the level chosen); the fixture is non-vacuous (`eligible 10`) and cause B
  stays as the issue left it. The ✓ line reports `0 structural orphan(s) (seq none)`.
- **D7 — the PR is not opened by this skill.** Task 18 says commit, then `/piv-create-pr`. The commit
  is made; the push and the PR are the next command's, so the outward-facing step waits for it.

## Issues encountered

- **The agent's level choices are transition-heavy** — five of twelve decisions at `transition`
  (`s4-appetite`, `s4-rabbit-holes`, `s4-out-of-bounds`, `s7-what-would-make-us-stop`,
  `s2-riskiest-assumption`), where the two earlier runs filed the Stage 4 trio as `solution`. The
  brief lists every rung's candidates, so a `transition` filing now has a parent to name where the
  rehearsal's did not; whether the rung itself is right is substance (MVP 6) and belongs to #279's
  reading of the run, not to this ticket. Noted, not acted on.
- **Three fence denials on t12** (`Bash pwd`, `Bash ls`, `Glob`) before the agent judged the answer —
  the F4 shape from #338, the fence doing its job. Kept as the receipt.
- None blocking.

## What the gate cannot reach

Group 32 observes one recording made under one prompt surface. A prompt edit is caught by name (the
fingerprint); a hand-edited op line is caught by name (the re-fold). What it cannot see is the model
changing its behaviour under an *unchanged* prompt — a model update, an SDK change in how tool results
are presented. The probe (`--probe-parenting`, one paid turn) is the operator-run re-observation for
that and is listed in `gates.md` beside the journey drivers. A token-spending gate in CI is not
available (no SDK, no token) and would not be deterministic if it were.

## Ready for the next step

`piv-create-pr` (body must carry `Closes #341`), then `piv-review-pr` →
`.claude/code-reviews/pr-<N>-review.md` in the same PR.
