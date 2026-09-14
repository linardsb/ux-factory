# PR #411 review — docs(discovery): epic close-out (#293)

**Head** `9e915afc4585ed9c69da6cb7ea842cf655a5f246` · **Base** `main` @ `f4c1d9b4831404bc0bd76bf1c16ad771476e2e03` · reviewed 2026-09-14 in worktree `../ux-factory-wt-293` · round 1 (no prior review file; merge-base equals the base SHA, so the guarantees pass does not trigger)

Context note: the PR body carries this session's URL, so the same session authored the PR before `/clear`. The review ran on a cleared context plus a separate `code-reviewer` agent; every figure below was re-derived, not recalled.

## Summary

Docs-and-evidence PR: the nine-row metric read, the hypothesis verdict, closing sections in both epic docs, the 2026-09-02 amendment carried onto `main`, and two label fixes from the PR #406 review. No code, no package file, no paid turn (observed: the diff touches seven files, all `.md`). Every figure in the PR body and the report re-derives from the run packages except one (F1, a figure cited to a source whose own numbers differ). Four mediums, five lows, nothing blocking. The `code-reviewer` agent's independent pass found F3, F4, F7, F8 and F9; F3 and F4 were found by both.

**Recommendation: approve.** F1, F3, F4 and F7 are one-line edits worth landing before merge because all four live in shipped docs and three are self-contradictions within one file; none changes a verdict.

## Issues

### Medium

- **F1** `docs/epics/discovery-partner.architecture.md:453`, `.claude/reports/discovery-epic-close-293-report.md:81` (and the plan :358) — "on 25 of 30 real turns there was no prose to falsify MVP 6 against", cited to run 0's F9. F9's own figures (`discovery-run-0-338-report.md:463`) are 2 turns judged aloud, 27 with a filing confirmation only, 1 with none, and its own conclusion is "on 28 turns there is no prose to have pushed back in". Re-derived from `_discovery/run0-2026-09-02/transcript.jsonl` (observed): 30 turns, 2 with a text line over 160 chars, 27 with short lines only, 1 with none. 25 is reachable only as 24 + turn 16, silently excluding turns 3, 4 and 8, and the report shows no arithmetic. Fix: "28 of 30" per F9, or state the 24 + 1 derivation and why the three evidence-naming confirmations are excluded.
- **F4** `docs/epics/discovery-partner.prd.md:416` and `:428` — §Open questions still reads "**Three branches** ship with no run behind them. B2B SaaS, internal tool and consumer…" and "**Marketplace** as a fifth product-type **branch**". §Epic close (same file, :481) says three FACETS, `internal`, `orgBuys`, `replacesAProcess`; the architecture closing note says the PRD figure is "corrected"; the README says the same. The PRD's own open-question bullet was not corrected, so the document contradicts itself on which three things are untested, and epic #279's body (which embeds the PRD text, line 411) mirrors the stale bullet. Fix: one clause on each bullet ("since the 2026-09-02 amendment: three facets, `internal` · `orgBuys` · `replacesAProcess` — see §Epic close"; "fifth preset"). The close-out amendment's "nothing in the MVP, thesis or non-goals changed" stays true.

- **F3** `.claude/references/gates.md:90` — the inserted L1 clause breaks the two-shape alternation: "…the package as cwd) — the pre-#286 shape, strictly wider than the run's own `reads: []` set, so its deny transfers or run 1's (`reads: []`…". "so its deny transfers or run 1's" does not parse. The plan specified this insertion verbatim (`.claude/plans/discovery-epic-close-293.md:434–436`), so it was applied faithfully to a malformed instruction. Fix: close run 2's parenthesis after the new clause: "…the package as cwd — the pre-#286 shape, strictly wider than the run's own `reads: []` set, so its deny transfers) or run 1's (…)".
- **F7** `docs/epics/discovery-partner.prd.md:368` — the carried "Asked what mattered" row ends "n=1 in wave 1, so the unexercised facets read 'not yet tested'", while §Epic close in the same file reports two faceted runs (`regulated`, `hasModel`). Carried verbatim by design (A7), but the reader hits the contradiction with no pointer. Fix: "(n=2 at close, see §Epic close)".

### Low

- **F8** `docs/epics/discovery-partner.prd.md:481` — the Gap finding row states "3 partial" flat; the report and the architecture note both say finding 6 is the one verdict the owner may move (Q2). One clause in the row keeps the hedge on the most-read surface.
- **F9** `docs/epics/discovery-partner.prd.md:578–579` — two blank lines before the last amendment; every other entry has one.
- **F2** `.claude/reports/discovery-epic-close-293-report.md:52` — "fifteen `run.json` files … `later-not-never-1` is `null`; the other twelve are pre-facet (`undefined`)". Observed: 11 committed + 4 real = 15 ✓, but `partner-audit-1` is also `facets: null`, so the split is 2 non-null · 2 null · 11 absent. The claim it supports (only two carry a vector) holds.
- **F5** `.claude/reports/discovery-epic-close-293-report.md:31` — T8 cites "PR #406 L1" and "L2". `.claude/code-reviews/pr-406-review.md` is untracked on the shared tree and on no branch (observed: `?? .claude/code-reviews/pr-406-review.md`), so a reader of the repo cannot find L1/L2. CLAUDE.md §Git says a ticket's review rides in its PR. Commit it with this PR or a follow-up; same for `pr-377-review.md`.
- **F6** (advisory, not a PR defect) — the shared tree still holds the 2026-09-02 edit unstaged on both epic docs (24 added, 3 deleted; every added line is on this branch, observed by `diff`). After merge, discard them with `git checkout -- docs/epics/discovery-partner.prd.md docs/epics/discovery-partner.architecture.md` on the shared tree, or the next pull conflicts. `agent-layer/gen-decisions.mjs` (+1) is a separate unstaged edit the plan left alone.

## The numbers pass

Every figure in the PR body and the report, with which run produced it. "observed" = I ran it at `9e915af` this review; "derived" = arithmetic shown; "cited" = spot-checked against the named report line.

| Figure | Provenance | Result |
|---|---|---|
| Run 1 `completion {22,22,done,turns 24}`, coverage 12/12, notAForm longest 0, weak 4/24 = 0.167, twelve 1.0 / tail 8/12 = 0.667, `["regulated"]` | observed, `sessionView` fold | ✓ |
| Run 2 `{23,23,done,23}`, coverage 6/12, longest 0, weak 16/23 = 0.696, twelve 0.5 / tail 1/11 = 0.091, `["hasModel"]` | observed, fold | ✓ |
| `later-not-never-1` longest 1, tripped false | observed, fold | ✓ |
| Run 1 ops 20 · 6 · 4; run 2 7 · 9 · 16; run 0 30 · 10 · 0 | observed, grep | ✓ |
| Run 1 15/20 unbacked, 0 unrooted; run 2 0 unbacked, unrooted [14, 26] | observed, `auditTraceability` over the raw op lines | ✓ |
| `url: null` on every `file_evidence` row (6 and 9), one `secondary-source` each (seq 13, seq 25) | observed, grep | ✓ |
| Run 1 7/20 at `transition`; run 0 7/30; `later-not-never-1` 8/30 | observed, grep | ✓ |
| `open_question` 0 on runs 0, 1, 2; 1 · 1 · 38 · 37 elsewhere | observed, grep | ✓ |
| Run 2 two `denied` lines, both `via: PostToolUseFailure`, t9 and t17, forward `evidence_refs` | observed, grep | ✓ |
| Run 2 seq 4, 8, 19 `wrong_if` carry "reaches for /think" | observed, grep (3) | ✓ |
| Every `answer_ref` matches `a\d+` across all transcripts incl. run 0 | observed | ✓ |
| Run 1 15.2 min (`12:35:46Z` → `12:50:58Z`) | derived | ✓ 15 min 12 s |
| Rubric committed 12.0 min before run 2's `startedAt` (`4a74848` 10:12:06Z vs 10:24:03Z) | derived | ✓ 11 min 57 s |
| Run 0 `real`, `portal`, 30 turns, 40.6 min; four real packages, latest `run0-2026-09-02` | observed (jobs folder) | ✓ |
| Run 0 "UI" (#338 report :304) | cited | ✓ verbatim |
| Independent reach seq 3, 6, 6, 14; seq 15 kill match (#291 :94–100) | cited | ✓ |
| Sealed file agent-written (#291 :109–111); 5/20 refs (#291 :158) | cited | ✓ |
| Gap finding 0/8, 3 PARTIAL (1, 4, 6), reachable 0 of 5 (#292 :80–87) | cited | ✓ |
| Disclosure `{3348, 4453, 456, 606, 50, 2751, 3659, 8453, 8112}` | observed, the plan's T3 script re-run | ✓ |
| `think/SKILL.md` mtime 2026-08-27 09:59; `grill-me` 2026-07-26; not in the archive | observed | ✓ |
| Vault: one `thinking/` doc after 2026-08-27, `context: ux-factory`, tags handoff/data-contract | observed | ✓ |
| Fourteen shipped tickets; thirteen raised-and-closed; all 27 CLOSED, #279 and #293 OPEN | observed, `gh issue view` ×29 | ✓ (13 is derived, labelled so in the report) |
| Epic #279 body: one `[ ]` below `## Tickets` (#293) | observed | ✓ |
| 2026-09-02 amendment VERBATIM | observed, set-diff of added lines | ✓ 24/24 |
| `run.json` facets: 15 files, two non-null | observed | count ✓, split wrong (F2) |
| "25 of 30 turns no prose" (run 0 F9) | re-derived | ✗ F9 says 28 (F1) |

Mechanism attributions checked: "Gap finding" is stated as a reading of one prompt surface on one model, not of the design; "Disclosure" shows both the like-for-like and the measured figure and says the 73-skill baseline is not reproducible; "Marginal reach" is reported as not taken. None credits a mechanism the experiment cannot isolate.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` (worktree) | ✓ all 34 groups pass (observed) |
| `node tooling/drift-check.mjs` | ✓ 13 checks (observed) |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups — no drift (observed) |
| Portal smoke, shared tree, port 4811 | ✓ `/api/health` `ok: true`, `stale: false`; killed by PID (observed). The worktree has no `portal/node_modules`, so the smoke proves the shared tree's portal, as the report's did |
| CI on `9e915af` | ✓ verify · audit · codeql · CodeQL · visual · gates-green (observed, `gh pr checks`) |
| `.claude/last-gate.json` | head `9e915af`, exit 0 (observed) |

Documented deviations (report §Deviations): T1's grep count 2 not 1, T10's scoped count, the moved T3 figures (cause #410), the wider Auditability verdict, the applier-refusal qualifier, the scoped ABSENT line. All intentional and explained; none flagged.

## What's good

- The verdict column does not round: two rows read "not met", one "not taken as specified", one "0 of 8", and the Switch row splits its clause into observed and untested. The honesty contract's mirror direction is respected — Q1/Q2/Q3 are left for the owner, and "close epic #279" is proposed as the owner's click.
- The report labels observed / derived / cited per row and names the fold, and the re-derivation reproduced every fold figure to the digit.
- The carried amendment is byte-identical to the unstaged edit, and its placement between the 09-01 and 09-14 entries keeps the amendments chronological.
- The L1/L2 fixes from the #406 review landed rather than being left as follow-ups.

## Recommendation

**Approve.** Land F1, F3, F4 and F7 before merge if there is a round; F2, F5, F8, F9 can ride with them. F6 is a shared-tree chore after merge, then `git worktree remove ../ux-factory-wt-293`.
