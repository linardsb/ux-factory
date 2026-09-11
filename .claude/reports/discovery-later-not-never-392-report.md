# Implementation Report — "Later, not never" (#392)

**Plan**: `.claude/plans/discovery-later-not-never-392.md`   **Branch**: `feature/discovery-later-not-never-392`
**Base**: `73c49dd` → `73c49dd` (origin/main; unchanged over the run, `git merge origin/main` → *Already up to date*)
**Status**: PARTIAL — T1–T10 complete and green; T11/T12 are owner-only and paid, so **AC #7 is NOT MET**

## Summary

The bank gains one DERIVED entry, `s4-parked-for-later` (stage 4, outside the source and outside `whole-bank`,
on D7's pattern as a new rule D8), inserted into the UNFACETED `full-discovery` list at position 20 directly
after `s3-deliberately-not-doing`; `FULL_DISCOVERY_BUDGET` follows the list 30 → 31. The PRD projection gains a
twelfth `SECTIONS` row, **Later, not never**, rendered by the same by-seq rule as Non-goals through one shared
`crossRefByQuestion(ids)` helper and keyed on `LATER_QUESTIONS`, which is proven disjoint from
`NON_GOAL_QUESTIONS` by gate. Groups 28, 30 and 31 moved with them and gained five new pins; the seven
committed `prd.md` were regenerated from the projection and each moved by exactly the new section's four lines.
The faceted composition #291/#292 are pre-registered against is untouched.

## Tasks completed

- T1 the entry, the D8 rule, the depth list, the budget → `discovery/bank.mjs` (UPDATE)
- T2 group 28's literals (`ADDED_392`, `OUTSIDE_SOURCE`, cases 1 · 9 · 10 · 13, two new pins, the summary and
  header strings) → `tooling/build-checks.mjs` (UPDATE)
- T3 group 30 case 28's unfaceted total → `tooling/build-checks.mjs`; the stale count comment →
  `portal/public/portal.js` (UPDATE)
- T4 `LATER_QUESTIONS`, the `SECTIONS` row, the `crossRefByQuestion` refactor → `discovery/prd-projection.mjs` (UPDATE)
- T4b the section-brief line + the import + the re-pinned Create-PRD stamp + case 31's clause →
  `portal/lib/discovery-postures.mjs`, `tooling/build-checks.mjs` (UPDATE)
- T5 the `a12` fixture answer, the `t10` op, 31.1's count, 31.2's four new assertions, case 31.17, the summary
  and header strings → `tooling/build-checks.mjs` (UPDATE)
- T6 the seven committed pages regenerated → `discovery/{allergen-matrix-1,bracket-trace-1,bracket-trace-2,graded-opus-a,graded-think-a,instrument-loans-1,partner-audit-1}/prd.md` (UPDATE)
- T7 §Files, §The bank's width, §The PRD projection → `discovery/README.md` (UPDATE)
- T8 the D1a amendment → `docs/epics/discovery-question-selection.architecture.md` (UPDATE)
- T9 groups 28 and 31 → `.claude/references/gates.md` (UPDATE)
- T10 the house shape's §9 staged by explicit path → `.claude/skills/plan-create-prd/SKILL.md` (STAGE)

**How the code half landed.** The plan's rehearsed patch (`.claude/plans/discovery-later-not-never-392.code.patch`,
rehearsed against `078c367`) applied to the moved base `73c49dd` with a **plain `git apply`**, no 3-way
(observed: `git apply --check` silent). Every prose half the patch does not carry — the `bank.mjs` header and
D8, the DEPTHS and budget comments, the "75 → 76" and "eleven → twelve" summary and header strings, the
`portal.js` comment, T7–T10 — was done by hand from the task text, with every anchor resolved **by content**
(a scripted `count == 1` assertion per anchor) rather than by the plan's stale line numbers.

## Tests added

No suite exists (CLAUDE.md §Testing). The gate is `tooling/build-checks.mjs`. New assertions:

| Where | What it asserts |
|---|---|
| 28 case 9 | the D7/D8 entries' weak-answer openings are ABSENT from the source region (loop widened to `OUTSIDE_SOURCE`) |
| 28 case 10 | `QUESTIONS` minus `whole-bank` === `[s4-parked-for-later, …D7's ten]`, each resolving, each citing a URL |
| 28 case 10 (new) | the id is in the UNFACETED list ONLY — not `OPENING_SET`, not `NON_FUNCTIONAL_BLOCK`, not any `MODULES` entry |
| 28 case 10 (new) | the id sits directly after `s3-deliberately-not-doing` and is **never last** (`deriveCursor` reads the last closer's position) |
| 31.2 (new ×4) | `LATER_QUESTIONS` is one frozen id · it resolves in the bank · it is disjoint from `NON_GOAL_QUESTIONS` · every question-keyed cross-ref id has **exactly one** home |
| 31.17 (new case) | the fixture's parked decision renders under **Later, not never** by seq and once · NOT in Non-goals · Non-goals keeps its own two rows · the decision still has its one block in MVP · deleting the op renders the row's own `empty` with the claim gone from the whole document and no heading lost |

Fixture additions: answer `a12` (ref `a11` left reserved for 31.16's synthetic aside, F6) and one
`record_decision` on turn `t10`, seq 14, `parent_id: 4`.

## Proving the checks

Nine mutations driven on **this** base, each applied by a scripted exact-anchor edit and reverted from a
byte snapshot; the tree was verified restored after each.

**The driver was proven first**: given a bogus anchor it exits 2 and writes nothing (observed — the file's
diffstat was unchanged after the negative control). Without that, a silent no-op edit would have read as
"the check cannot fail".

| # | Mutation applied | The case that went red (verbatim, truncated) |
|---|---|---|
| M-A | the `FULL_DISCOVERY` literal's one line reverted in build-checks | `full-discovery drifted: [...]` + the four `selectDepth` totality rows — bank ✗ 5 |
| M-B | `s4-parked-for-later` moved LAST in `DEPTHS["full-discovery"].ids` | `s4-parked-for-later sits at 30 of 31 — it must follow s3-deliberately-not-doing and never be LAST` + `full-discovery drifted` — bank ✗ 6 |
| M-C | the id added to the `hasModel` facet module | `s4-parked-for-later must be in the UNFACETED list only — the faceted composition #291/#292 are pre-registered against is unchanged` + 12 composition rows — bank ✗ 13 |
| M-D | the Later line removed from `sectionBrief()` | `case 31: the section brief must name the non-goal questions, the parked-scope question and the metric stage…` and `30.46: Create-PRD's stamp is f0e7599c7bc953b74ff3750dceca5061, not the value #392 moved it to` — discovery ✗ 2 |
| M-1 | `later` renderer aimed at `NON_GOAL_QUESTIONS` | `31.17: Later, not never does not name seq 14 by the by-seq rule — "- seq 6 — What are we deliberately not doing…`, `31.17: Later, not never renders more than one row for one parked decision`, and the vanishing check — prd projection ✗ 3 (+9 byte-compare reds in 32/33) |
| M-2 | the id added to `NON_GOAL_QUESTIONS` | `a LATER question is also a NON_GOAL question — a parked item would then render as a refusal, the exact leak #392 closes`, `question "s4-parked-for-later" is named by 2 cross-ref row(s)` (×2), `31.17: the parked decision LEAKED into Non-goals` — prd projection ✗ 5 |
| M-3 | `crossRefByQuestion` returns `""` instead of `null` on empty | `31.17: with the parked decision deleted, Later, not never renders "", not its declared empty` — prd projection ✗ 1 (+10 byte-compare reds) |
| M-4 | the `t10` fixture op deleted | **exactly one** failure: `31.17: the fixture has no decision on s4-parked-for-later at seq 14 (got none) — the case below is then vacuous` — and nothing else. The plan's F13 guard (`later?.seq === 14` gating the block) holds on this base; no `TypeError` |
| M-7 | one of the seven regenerations skipped (`git checkout 73c49dd -- discovery/bracket-trace-1/prd.md`) | `32.6: discovery/bracket-trace-1/prd.md is no longer the projection's bytes` — parenting ✗ 1 |

**Positive controls.**
1. The unmutated tree: `build ✓  all 34 groups pass`, zero `✗` lines (observed).
2. 31.17's inner block is proven to **execute** rather than be skipped: M-1, M-2 and M-3 each fire an
   assertion from *inside* `if (later?.seq === 14)`, so the vacuity guard is passed on the green tree.
3. The by-seq render is proven on the happy page directly:
   `node discovery/prd-projection.mjs instrument-loans-1 --stdout` prints `## Later, not never` at line 135,
   immediately after Non-goals' last row at 133 (observed).

## Validation results

| Command | Result |
|---|---|
| `node --check` on `bank.mjs`, `prd-projection.mjs`, `build-checks.mjs`, `discovery-postures.mjs`, `portal.js` | all clean (observed) |
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass`, exit 0 (observed) — and on the base *before* any edit, also green |
| `node tooling/drift-check.mjs` (run with everything staged) | `drift-check ✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| T1 one-liner, after | `4 DERIVED true 76 31 19 18 31 65 22 [ 'internal' ]` (observed — byte-identical to the plan's prediction) |
| T1 one-liner, before | `undefined undefined false 75 30 -1 18 30 65 22 [ 'internal' ]` (observed on `73c49dd` — also the plan's prediction, which is how the moved base was cleared) |
| presets (AC #2) | regulated 22 · b2b-saas 22 · internal-tool 28 · consumer 16 (observed) — unmoved |
| `SECTIONS.length` (AC #3) | `12`, `LATER_QUESTIONS = ["s4-parked-for-later"]` (observed) |
| T6 `git diff --numstat -- 'discovery/*/prd.md'` | seven rows, every one `4	0` (observed). Method: the seven were **restored to `origin/main` first**, then regenerated with `--force`, so the bytes are the projection's, not the patch's. Each CLI line read `→ 12 sections` |
| `POSTURES` fingerprints | create-prd `ea523ac1e8eaef1ac1208e108f8b640e` (moved, deliberately, T4b) · think `7efdde37441fbd2591ba4a7dfeecdb6b` · think-opus `cadb38117a2660c036d87e32323a8745` · grill `76b7847d4ebbd9d8f16f9726ff0f4f0f` — the last three unmoved (observed) |
| T7 `grep -c "Twelve sections\|Later, not never\|#392" discovery/README.md` | `7` (plan expected ≥ 5) |
| T8 `grep -c "Amended 2026-09-11 (#392)" …question-selection.architecture.md` | `1` (as expected) |
| T9 `grep -c "76 entries\|#392" .claude/references/gates.md` | `2` (as expected) |
| Portal smoke, private port 4791, killed by PID | `/api/health` → `{"ok":true,…,"bootSha":"73c49dd…","stale":false}`; `/api/discovery/config` → `31 true` (the full-discovery count and the new question, both off the wire). **Stale-server guard**: the served `/portal.js` carries *this* tree's edited comment (`grep -c` = 1), so the answer is not another session's server |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` (observed) — T11 step 1 is clear, no spend-limit 400 |
| `git status --short -- system/ handoff/ agent-layer/` | only `agent-layer/gen-decisions.mjs`, which was **already dirty at session start** and is another session's file. No generated path of this ticket's is dirty |

Every figure above is observed from the named command. The one derived figure is T6's `4 0`: four lines =
a blank line, `## Later, not never`, a blank line, the `tbd` line.

## Not run

- **T11 — the real run `discovery/later-not-never-1/`.** Owner-only and paid (31 turns, expected
  $1.55–1.70 and ~40 min, derived from the two 30-turn sonnet baselines). The honesty contract forbids the
  session writing a package file, so **AC #7 is NOT MET** and is reported as such, never waived. Everything
  it needs is cleared: the gate is green, the preflight passes at zero tokens, the config route answers
  `31 true`, and the plan's T11 carries the decided fictional product and the pre-written, decision-grade
  answer for question 20. **Tracker: per plan decision P7 an issue must be opened before the PR — not yet
  opened (owner's call; see "Ready for the next step").**
- **T12 — the 30.46 think-carrier count 5 → 6 and the README package line.** Depends on T11; the plan says to
  leave the count at five if AC #7 is not met, which is what the tree holds.
- **T7 step 5** — §The full-depth run's "is the only committed full-discovery package" sentence. The plan
  assigns it to T12, "once the package exists". Left as-is, and true as-is.
- **The visual-regression pixel gate.** Not run, and not applicable: no shipped page, no `system/` module and
  no root/`proto/` HTML is in this diff (`portal/public/portal.js` is the local-only portal, never deployed),
  so no committed baseline can move.

## Deviations from the plan

- **D1 (plan error) — the base moved, `078c367` → `73c49dd`.** PRs #381 (#366) and #391 (#387) merged after
  the plan was written. Consequence: every `tooling/build-checks.mjs` line number in the plan is stale by up
  to +19 (the file grew 10134 → 10153), `portal/lib/discovery-postures.mjs` moved ~94 lines, and
  `.claude/references/gates.md` gained the security-gate section. Handled by resolving every citation by
  content instead of by number. The two facts that could have broken T4b both held and were checked, not
  assumed: `POSTURES["create-prd"].fingerprint` is still `f0e7599c…` on the new base, and the re-derived
  after-value is `ea523ac1e8eaef1ac1208e108f8b640e` exactly as the plan predicted. Logged in the plan's
  AMENDMENTS with the observations.
- **D2 — branch named `feature/discovery-later-not-never-392`**, not the plan's `feat/392-later-not-never`:
  every other branch in this repo uses `feature/`, and the only CI-special pattern is `feature/v3-*`
  (`.github/workflows/verify.yml:108`). No behavioural effect.
- **D3 — the rehearsed patch's 30.46 message was tidied to the plan's own T4b wording.** The patch carried a
  duplicated tail ("… — earlier: the value #289 moved it to (it was edc7c52d… )"), a rehearsal artifact. The
  message now reads exactly as T4b specifies: the new hex, then `f0e7599c…` after #289's DOMAIN_RULE and
  `edc7c52d…` before that.

## Assumptions carried

- **P1 honoured** — `.claude/skills/plan-create-prd/SKILL.md` (the house shape's §9, which the new `SECTIONS`
  row's `why` cites) was uncommitted in the shared tree and is staged **by explicit path** into this PR. The
  three unrelated modified files beside it (`agent-layer/gen-decisions.mjs`, `docs/epics/discovery-partner.prd.md`,
  `docs/epics/discovery-partner.architecture.md`) are another session's and were left untouched.
- **P2 honoured** — AC #4 read as corrected: all seven committed `prd.md` change, by exactly four lines each.
- **P4, P6, P7 honoured** as written (position 20 with both pins driven; the Create-PRD brief gains the line
  and its stamp is re-pinned; AC #7 reported not met).
- The plan sanctions either `git apply` of the rehearsed patch or line-by-line tasks. The patch route was
  taken for the code half, then every task was read back against the applied diff and the prose halves done
  by hand.
- `.claude/plans/` already tracks four `.html` and one `.diff` (including `discovery-affordances-289.html`),
  so the plan's rendered `.html` and its `.code.patch` are staged alongside the `.md`, matching that precedent.

## Additions beyond the plan

- **A1** — `build-checks.mjs` case 10's own inline comment now reads "the added ten (D7) plus #392's one (D8)".
  The plan moves that case's assertions but not its comment, which would have described ten while the check
  asserted eleven.
- **A2** — the comment above 30.46's Create-PRD pin now names **both** deliberate moves (#289's DOMAIN_RULE and
  #392's brief line) rather than only #289's. Same reason.
- **A3** — three stale untracked files blocked the branch switch and were removed:
  `.claude/code-reviews/pr-381-review.md` and `pr-391-review.md` (both byte-identical to `origin/main`,
  observed by `git hash-object`, so the checkout restored them unchanged) and `.claude/plans/security-gate-387.md`
  (an **older pre-amendment copy**, 19 diff lines — the committed one carries six amendments it does not).
  The differing one was copied to the session scratchpad first, at
  `…/scratchpad/preexisting-untracked/security-gate-387.local.md`, so nothing was lost.

## Left deliberately out of scope

- **The group-31 summary string's stale tail.** It still ends "…a projection of a FULL-WIDTH run package,
  which does not exist until #289 lands"; #289 landed as `078c367` this morning. This diff edits that same
  string, so the clause could be misread as this ticket's. It is not — correcting it is #289's follow-up, not
  a #392 edit, and widening this diff to sweep it would be the scope creep the repo's surgical-changes rule
  forbids.
- **§The full-depth run's "is the only committed full-discovery package"** (`discovery/README.md:562`). True
  today and it stays; the plan assigns it to T12, with the package. §Files' allergen-matrix-1 line was changed
  only in the way T7 step 2 specifies (the count phrase), so the two sentences still agree.

## Issues encountered

- The mutation runner's first attempt at M-B missed its second anchor (`"s9-strength-of-evidence",\n    ]),`
  occurs twice in `bank.mjs`), so the first run *removed* the id rather than moving it to last. The driver
  reported `ANCHOR MISS: 2 occurrences` and wrote nothing for that half, which is why it was caught rather
  than mis-recorded; M-B was re-applied by index and produced the plan's predicted message
  (`sits at 30 of 31 … never be LAST`). This is the reason the driver asserts an exact anchor count.
- Nothing else. Every VALIDATE the plan names for T1–T10 was run, and every one matched its predicted output.
