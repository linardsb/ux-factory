# Implementation Report — Epic close-out for Discovery Partner (#293)

**Plan**: `.claude/plans/discovery-epic-close-293.md`   **Branch**: `feature/discovery-epic-close-293` (worktree
`../ux-factory-wt-293`)   **Base**: shared tree `0e27afb` (branch `feature/discovery-pre-grill-audit-292`), worktree cut
from `origin/main` `f4c1d9b` → report at `f4c1d9b` + this branch   **Status**: COMPLETE (T0–T10; T11's PR is the next
skill's step)

## Summary

Epic #279 is read against evidence. The nine §Success metrics rows are each given an observed figure and a verdict
that does not round a miss into a pass: two rows are not met (Auditability, on the URL clause, in both runs; Marginal
reach, not taken as specified), one is reported at 0 of 8, two are reported without a target, and Switch's second half
is not yet tested. The hypothesis reads RIGHT on both clauses, the WRONG condition was not tripped, and the C1 control
holds with one question for the owner. Both epic docs carry a dated closing section, the 2026-09-02 amendment that had
sat unstaged for twelve days is on the branch verbatim, and the epic issue's task list is current. No code, no run
package, no paid turn.

## Tasks completed

- T0 worktree `ux-factory-wt-293` off `origin/main` `f4c1d9b` (the plan allowed `a174bbd` or later)
- T1 the 2026-09-02 amendment carried → `docs/epics/discovery-partner.prd.md`, `docs/epics/discovery-partner.architecture.md` (UPDATE, verbatim — see Validation)
- T2 the metric read → this report (scratch only, nothing committed)
- T3 the disclosure re-measure → this report
- T4 the C1 and WRONG-condition check → this report
- T5 this report → `.claude/reports/discovery-epic-close-293-report.md` (CREATE)
- T6 the `closed` rung + `## Epic close — 2026-09-14` + one `[x]` + one amendment → `docs/epics/discovery-partner.prd.md` (UPDATE)
- T7 `## Closing note — 2026-09-14` → `docs/epics/discovery-partner.architecture.md` (UPDATE)
- T8 the facet count → `discovery/README.md:365` (UPDATE); PR #406 L1 → `.claude/references/gates.md:90`; L2 → `.claude/reports/discovery-pre-grill-audit-run-292-report.md:140`
- T9 the four verify commands + the portal smoke (below)
- T10 epic #279's body below `## Tickets` (old body kept at `$SCRATCH/epic279.orig.md`)
- the plan itself copied into the worktree → `.claude/plans/discovery-epic-close-293.md` (CREATE on this branch; it was untracked on the shared tree)

## The metric read, row by row

Every figure below was re-derived this session from `run.json` and `transcript.jsonl` through `sessionView(root)`'s
`runMetrics` fold (`portal/lib/discovery.mjs`), or by a grep over the transcript named in the row. Labels: observed
(the command ran), derived (arithmetic shown). Where a reading rests on a run report's human read, the report is named.

| Metric | Target (PRD) | Observed | Verdict | Where |
|---|---|---|---|---|
| **Switch** | The next real discovery session starts in the UI; the second unprompted session must too | `run0-2026-09-02/run.json`: `provenance: real`, `frontEnd: portal`, 30 turns, 40.6 min in one sitting (observed; derived from `startedAt`/`endedAt`). The owner's whole answer to "did you start in the UI, or reach for /think?" was "UI" (#338 report :304). No real session in `_discovery/` after 2026-09-02 (observed: four real packages, the latest `run0-2026-09-02`) | **first half observed · second half not yet tested** | `_discovery/run0-2026-09-02/run.json` (never committed); `.claude/reports/discovery-run-0-338-report.md:304` |
| **Completion** | Run 1 reaches a generated PRD in one sitting; twelve-set coverage reported with it | `faster-payment`: `completion {settled:22,total:22,done:true,turns:24}`; 15.2 min (derived, `12:35:46Z`→`12:50:58Z`); `prd.md` has 12 `## ` sections (observed); `coverage {asked:12,decided:12,of:12}` | **met** | `discovery/faster-payment/` |
| **Independent reach (run 1)** | 4/4 of m-005…m-008 trace to a business or stakeholder requirement; ≥1 kill criterion matches a `would_measure` | 4/4: m-005 ← seq 3 (business), m-006 ← seq 6, m-007 ← seq 6, m-008 ← seq 14 (stakeholder); seq 15 matches m-008's `would_measure` (#291 report :94–100). The answerer wrote the key | **met at the target, as an upper bound** | `.claude/reports/discovery-faster-payment-run-291-report.md:94–103` |
| **Marginal reach (run 1)** | No target; the diff of the run's parents against the sealed file | The sealed pre-registration was written by an agent and says so (#291 report :109–111), so the diff measures the bank against an agent baseline that had read the key. What that diff supports: five things the run reached the seal did not (a business case · stakeholders and a veto · the control being removed · the accountability shift · kill criteria with thresholds) and four the seal had that the run missed (m-005's parent filed at `solution` · m-006's ordering requirement · m-007's "first attempt" · deliberate rung assignment); "better at the world, worse at the ladder" | **not taken as specified** (F6: plan T6's rule not followed; not re-takeable for run 1) | #291 report :118–155 |
| **Gap finding (run 2)** | Share of the eight findings reached from the frozen fixture | 0 of 8 FOUND, 3 PARTIAL (findings 1, 4, 6), 5 MISSED; against the rubric's reachable five: 0 found, 2 partial. Rubric committed 12.0 min before `startedAt` (derived: `11:12:06+01:00` vs `10:24:03Z`). A reading of the pairing Grill `ba124c3c…` on `claude-opus-5`, never of the design alone. Mechanism (observed): 16 `flag_weak_answer` over 23 turns; the audit files per-question absences, the human grill found cross-document contradictions and presuppositions. Finding 6 is the one verdict the owner may move (Q2) | **reported: 0/8** | `.claude/reports/discovery-pre-grill-audit-run-292-report.md:80–87`; `discovery/partner-audit-2/transcript.jsonl` |
| **Auditability** | Every decision has an evidence link and a wrong-if; every evidence row a provenance label; every checkable domain claim a `secondary-source` URL | Run 1: 20 decisions, 20/20 `wrong_if`, **15/20 with no `evidence_refs`**, 0 unrooted; 6 `file_evidence` rows all `url: null`, seq 13 `secondary-source` (PSR APP rules / FCA Consumer Duty) with no URL. Run 2: 7 decisions, 7/7 `wrong_if`, 0/7 unbacked, 2 unrooted (seq 14, 26 — solution with no stakeholder above); 9 rows all `url: null`, seq 25 `secondary-source` (HAX, PAIR) with no URL. Provenance labels: structural (the applier refuses a label outside its four). Wrong-if: run 2's 7/7 paraphrased, 0 authored (the audit probe's fold, receipted). Cause in run 1: look-up text typed into the answer box became the answer (F5); in run 2 no off-script turn existed to fire the affordance from (all 24 and 23 answer lines are `kind: banked`, observed) | **not met, in both runs, on the URL clause; run 1 also fails the evidence-link clause** | both transcripts (observed by grep this session); #291 report :158–160 |
| **Not a form** | Never more than 3 consecutive questions with no decision and no weak-answer note | `notAForm.longest`: run 1 **0**, run 2 **0**, `later-not-never-1` **1** (the only committed package above 0); `tripped: false` on all three. Weak-flag rate beside it: run 1 4/24 = 0.167, run 2 16/23 = 0.696 | **met** | the fold, three packages |
| **Disclosure held** | Always-loaded context ≤ 11k tokens | CLAUDE.md 3,348 words → 4,453 tokens at 1.33/word (the baseline's own ratio: 9,500 − 73×80 = 3,660 over 2,761 words). The discovery lines: 456 words → **606 tokens**, inside the PRD's 400–650 estimate. On disk: 50 skills with a `SKILL.md`, 2,751 description words → 3,659 tokens. Like-for-like (50 × 80): **8,453**; measured: **8,112**; upper bound adding ~17 built-in skills at 80 each to the measured figure: **9,472** (8,112 + 1,360). All under 11k. The baseline's 73 is not reproducible: 20 PIV skills were archived on 2026-08-28 and the built-ins have no file (A6) | **met** | scratch script (plan T3), run from the worktree root |
| **Asked what mattered** | No target; decision rate on the facet tail against the twelve, `full-discovery` runs only | Run 1: twelve 12/12 = **1.0**, tail 8/12 = **0.667** (two questions re-asked after a flag), modules `["regulated"]`. Run 2: twelve 6/12 = **0.5**, tail 1/11 = **0.091**, modules `["hasModel"]` — an audit, so "decided" means the document answered. `internal`, `orgBuys`, `replacesAProcess`: **not yet tested** — three, not the ticket's "four" (A4). Read beside: twelve-set coverage 12/12 on both, not-a-form 0 on both, no facet dropped at intake (`run.json.facets` carries the full vector on both) | **reported; three facets not yet tested** | the fold, `discovery/faster-payment/run.json`, `discovery/partner-audit-2/run.json` |

Facets across every package (observed, fifteen `run.json` files): only `faster-payment` (`regulated`) and `partner-audit-2`
(`hasModel`) carry a non-null vector; `later-not-never-1` is `null`; the other twelve are pre-facet (`undefined`).

## The hypothesis, answered in its own terms

**RIGHT — both clauses observed.** "The owner's next real discovery session starts in the UI": `run0-2026-09-02`,
`frontEnd: portal`, and the owner's one-word answer. "Run 1 reaches a generated PRD in one sitting": `faster-payment`,
22 of 22, `done: true`, 15.2 minutes, `prd.md` projected.

**WRONG condition — not tripped.** "The owner reaches for `/think` in the terminal for that next real product anyway."
The vault (`~/.claude/skills/think/SKILL.md:11` names it; `FREDIS_VAULT` unset) holds exactly one `thinking/` doc dated
after the 2026-08-27 grill: `2026-08-28-component-system-backend-seam.md`, whose frontmatter question is the
frontend/backend seam for ux-factory (`context: ux-factory`, tags `handoff, data-contract`) — a repo design decision,
not a product discovery (observed).

**C1 holds — `/think` stayed installed and unmodified.** `think/SKILL.md` mtime `2026-08-27 09:59` (observed);
`grill-me/SKILL.md` `2026-07-26`; `think` is not in `~/.claude/_skills-archive-2026-08-28/` (count 0). The 09:59 stamp is
the grill's own day — Q1 asks the owner whether that edit predates the grill. Either way there has been no edit since
any run.

**What the reading cannot say:** whether a second, unprompted session happens. Run 0 was itself #338's ticketed sitting,
so whether it counts as "unprompted" is the owner's call (Q2). No proxy is offered.

## What survived — the open questions, stated once

Each line carries its evidence; each can become a ticket by copying it (Q3, owner's call).

- **Three facets not yet tested** — `internal`, `orgBuys`, `replacesAProcess`; only `regulated` (run 1) and `hasModel` (run 2) have fired (observed, `run.json.facets` across fifteen packages).
- **Marketplace as a fifth preset** — deferred until a run needs it; no run has.
- **Deterministic pre-checks before the agent turn** — still deferred; run 1's four flags and run 2's sixteen are the first data on which weak answers are common.
- **Confirm-the-receipt** — bears on run 0's F9: on 25 of 30 real turns there was no prose to falsify MVP 6 against. `JUDGEMENT_RULE` (`portal/lib/discovery-postures.mjs:34`) now reaches Grill and Create PRD, **not Think** — a Think edit re-records seven fixtures. Half-addressed.
- **The `unstable_v2_*` session API** — unchanged; the resume-per-turn model stands.
- **Does the scripted bank beat open conversation?** — unanswered. Runs 0 and 1 finished 30/30 and 22/22 with 0 off-script turns (observed: every answer line `kind: banked`), so the bank was never abandoned; but no conversation control was run, so "beats" is not shown.
- **The unguarded deadline** — 2026-09-30 check-in stands.
- **The transition-rung misuse** — 7 of run 1's 20 decisions filed at `transition` (observed by grep); run 0 7 of 30; `later-not-never-1` 8 of 30. The #291 report names it as the mechanical cause of the ladder gap (only 5 decisions available as parents).
- **The look-up drawer gap** — run 1 F5: look-up text typed into the answer box becomes the answer, nothing reports it. Cost run 1 its auditability row.
- **The marginal-reach metric not taken** — F6, above. Not re-takeable for run 1; the owner has read the run.
- **#287's run-2 fence receipt not reproducible as recorded** — the bank has passed the Read tool's 25k-token cap; run 2's shape was re-observed under #292 (`BOTH_SITES_HOLD`), so both shapes hold on a current tree, as point-in-time observations.
- **ABSENT never fired on runs 0, 1 and 2** — 0 `open_question` in all three transcripts (observed). It has fired elsewhere: `later-not-never-1` 1, `partner-audit-1` 1, the two whole-bank recordings 38 and 37 — so the verb works; the postures on the three measured runs did not reach for it.
- **One falsifier re-filed as three `wrong_if`s** — run 2 seq 4, 8, 19 all carry the document's "reaches for /think" sentence (observed).
- **`MAX_TURNS` admitting four tool calls** — run 0 F10 (turn 16 `ok: false` with every op landed).
- **The non-URL evidence route on a blank idea** — run 0 F11; both runs since carry `url: null` on every row.
- **A downloaded PRD landing in the repo tree** — run 0 F12.
- **Run 2's two applier refusals** — `record_decision: evidence_refs entry 16 does not name an earlier op` (t9) and the same shape at t17, both `via: PostToolUseFailure`, both re-filed on the next call (observed). Not fence denials: 0 built-in tool denials under `MAIN_TOOLS = []`. Recorded because the plan's "0 denials" line needs the qualifier.
- **The "raised during the epic" finding, confirmed** — #341, #343, #347 and #349 were each a defect no CI group could see; all four were found by rehearsal runs (PRs #342, #344, #350, #351).

## What wave 2 inherits, stated once

- **The canvas (D6) and component import (D7)** → epic #295, `canvas-design-import.prd.md`, with Q2b and Q6.
- **The guest path (D1)** — a different build, not a deployment: per-guest spend caps cannot be metered against a subscription token, so it needs an API key, a budget ledger and a server-side runtime.
- **D11's a11y gating** — #271 closed for shipped pages; the portal stays gated by review, by decision.
- **D19's replace-then-remove** of the baked-in prototypes.
- **Wiring elicited quality attributes into build-checks.**
- **A rung between full discovery and the whole bank** for a product ticking three or more facets (question-selection §Deferred).

## The epic issue's task list

Ticked (all CLOSED, observed via `gh issue list`): #283 (PR #363) · #285 (#365) · #286 (#369) · #288 (#372, #377) ·
#289 (#386) · #291 (#405) · #292 (#406) · #338 (#362) · #348 (#361) · #352 (#358) · #353 (#358) · #359 (#364) · #360
(folded by the question-selection decision, no PR). Left: #293, "this PR; ticks on merge". The #338 line now says the
sitting ran. The mid-epic tickets not in the body — #366 (#381), #370 (#371), #383 (#385), #384 (#398) — are named in
the PRD's close section, not added to the body's list.

## Tests added

None — a docs-and-evidence ticket. No gate, no suite.

## Proving the checks

| Check | Mutation applied | Case that went red | Positive control |
|---|---|---|---|
| Status regex (T6) | `closed 2026-09-14` → `closed 14-09-2026` in the worktree PRD | the full regex's count went 1 → 0 (a first attempt with a partial regex still matched and proved nothing; re-run with the full one) | matched `prototype-studio.prd.md:3` (count 1) before editing, and the edited discovery PRD after (count 1) |
| Slop grep (T5) | the plan's REDDENS word appended as a last line of this report | the grep printed that line | restored; empty over the report and both closing sections |
| `## ` outline (T6/T7) | none needed — a position assertion | — | `Epic close` between `Architecture` and `Amendments`; `Closing note` last `##` in the architecture doc |
| README/gates/report greps (T8) | none — string-presence greps with the expected count | — | each returned its count |

## Validation results

- T1 verbatim carry: the four hunks' added lines from the shared tree's diff, sorted, equal the worktree's staged added lines against `origin/main`, sorted (`diff` → `VERBATIM`, observed). The PRD hunk conflicted at EOF as the plan's GOTCHA predicted; the 2026-09-02 paragraph was placed between the 09-01 and 09-14 entries by hand, byte-for-byte. Amendment order after: 08-28, 09-01, 09-02, 09-14 (observed).
- T2: the three `sessionView` metric objects match the plan's VALIDATE numbers field for field (observed). Op counts: run 1 `20 record_decision · 6 file_evidence · 4 flag_weak_answer`, run 2 `7 · 9 · 16`, run 0 `30 · 10 · 0` (observed).
- T3: `{claudeWords: 3348, claudeTokens: 4453, discoveryWords: 456, discoveryTokens: 606, skills: 50, descWords: 2751, descTokens: 3659, likeForLike: 8453, measured: 8112}` (observed). Two figures moved from the plan's VALIDATE (`claudeWords 3302`, `measured 8051`): #410 added the CodeQL clause to CLAUDE.md's testing bullet after the plan was written; the discovery lines did not move.
- T4: as stated under C1 (observed).
- T6 regex: one matching line containing `closed` (observed). T7: `## Closing note — 2026-09-14` is the last `##` (observed).
- T8: `three unexercised facets` 1 · `pre-#286 shape` 1 · `canUseTool.deny` ≥1 (observed). Deny-site figures re-derived from the trace: 13 lines, `PreToolUse.deny` 2, `canUseTool.deny` 1 (observed by grep on `"event"`).
- T9 (worktree): `node tooling/build-checks.mjs` · `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` · `node agent-layer/gen-loc-summary.mjs --check` — see the block below (observed). Portal smoke from the main tree on a private port, `/api/health` `ok: true`, killed by PID.
- T10: `gh issue view 279 --json body --jq .body | sed -n '/^## Tickets/,$p' | grep -c '^- \[ \]'` → 1 (observed). Unscoped, the plan's command returns 8: the body embeds the PRD's §Open questions above `## Tickets`, seven `[ ]` items the ticket does not touch (plan error, logged).

```
build ✓  all 34 groups pass
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
loc summary ✓  3 groups — no drift
/api/health → {"ok":true,"hasToken":false,"jobsDir":".../Linards jobs folder","cards":9,"bootSha":"0e27afb…"}  (main tree, port 4799, PID 40563 killed)
```

drift-check's first run in the worktree failed on `tooling/style-dictionary/build-tokens.mjs` ("Style Dictionary
build failed — if node_modules is missing"): a fresh worktree has no `node_modules` there (memory
`local-agent-visual-gate-notes`). `npm ci` in that directory, then the green line above. Not a regression.

## Not run

| Step | Why | Tracker |
|---|---|---|
| Q1 — whether `think/SKILL.md`'s 2026-08-27 09:59 edit predates the grill | owner's memory, not derivable from disk | this report; the closing note says "owner to confirm" |
| Q2 — whether run 0 counts as the "next real discovery session", and run 2's finding-6 verdict | owner's judgement (memory `honesty-contract-mirror-direction`) | this report; Switch reads "second half not yet tested" either way; finding 6 stays PARTIAL |
| Closing epic #279 on GitHub | owner's click (#223 precedent) | proposed in the PR body |
| Re-taking marginal reach; run 2 on another model | not this ticket; paid | recorded as not taken, with the reason |
| T11 — the PR, `piv-review-pr` | the next skill's step | `piv-commit` → `piv-create-pr` |

## Deviations from the plan

- **T1 VALIDATE `grep -c 'Asked what mattered'` → 1** `(plan error)`: the count is 2 on both the shared tree and the worktree — the metric row and the amendment paragraph each carry the phrase, and `grep -c` counts lines. The intent (the row exists) holds; the plan's expected number was wrong. Logged under the plan's AMENDMENTS.
- **T10 VALIDATE `grep -c '^- \[ \]'` → 1** `(plan error)`: the body carries the PRD text above `## Tickets`, including seven open-question checkboxes; the count is 8 unscoped and 1 scoped below the header, which is what the task changes. Logged under AMENDMENTS.
- **T3's `claudeWords 3302` / `measured 8051`**: now 3,348 / 8,112 for the reason above. The plan's Level 3 text anticipates this ("if a number moved, the report states the new one and why").
- **Auditability's verdict is wider than the plan's wording.** The plan reads "not met on the URL clause in both runs"; run 1 also fails the evidence-link clause (15/20 decisions unbacked), which the #291 report already recorded and the plan's own T5 §2 lists. The table says both.
- **"0 built-in denials" gained a qualifier**: run 2's transcript holds two `denied` lines that are applier refusals of a forward `evidence_refs` reference, not fence denials. Stated as such rather than reported as zero.
- **ABSENT "never fired" is scoped** to runs 0, 1 and 2, because the verb has fired on four other packages (observed). The plan's phrasing was already scoped that way; the report adds the counter-evidence so the line cannot be read as "the verb is dead".

## Assumptions carried

A4 (three facets, not four) · A5 (run 2's `frontEnd: terminal` does not bear on Switch) · A6 (the disclosure baseline
is not reproducible; both figures shown) · A7 (the 2026-09-02 patch is the owner's write-back, carried verbatim, not
authored). The mid-epic ticket count "thirteen" is derived: the nine in the epic body's "Raised during the epic" block
plus #366, #370, #383, #384, which reference the epic in their titles or bodies; #393 belongs to #392 and is not counted.

## Additions beyond the plan

- The plan file itself is committed on this branch (it was untracked on the shared tree; the skill's preamble asks for the plan to ride in the PR).
- The applier-refusal qualifier and the ABSENT counter-evidence, above — both are one line each and both stop a true statement being read as a wider one.

## Issues encountered

- The shared tree's `agent-layer/gen-decisions.mjs` edit and every untracked file there were left alone, per the plan's non-goals.
- `sessionView` needs an absolute root (P4) — honoured.
- The `rung` field the plan names is `level` in the transcript; the counts above are by `level`.
