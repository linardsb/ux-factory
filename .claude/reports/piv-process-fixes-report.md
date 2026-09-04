# Implementation Report — seven PIV process fixes from the 2026-09-04 corpus sweep

**Plan**: `.claude/plans/piv-process-fixes.md`   **Branch**: `chore/piv-process-fixes`   **Base**: `7267b75` → `7267b75`   **Status**: COMPLETE

## Summary

The seven fixes (F-A to F-H) are applied to `.claude/skills/piv-plan-implementation/SKILL.md`,
`.claude/skills/piv-implement/SKILL.md` and `tooling/drift-check.mjs`, at the anchors the plan names,
resolved by section title rather than line number. The plan skill gains a pre-flight, a REDDENS and a
REGENERATES task field, a "proving the checks" subsection, a paid-and-owner-only steps table and four
quality-criteria boxes; the implement skill gains tree-hygiene steps, a pre-flight re-run, a red-proof
step, a re-base step and a nine-section report template — the one this report uses. `drift-check` gains a
group-count leg that pins the `34` stated in four places against the source, proven red on seven mutations.
The uncommitted build-brief improvement that had sat in the tree since #283 is committed with this work.

## Tasks completed

- F-A/A1 pre-flight section → `.claude/skills/piv-plan-implementation/SKILL.md` (UPDATE, before `## Output Format`)
- F-A/A2 pre-flight re-run bullet → `.claude/skills/piv-implement/SKILL.md` (UPDATE, `### 1. Read and Understand`)
- F-B/B1 `REDDENS` field → plan skill task format (UPDATE)
- F-B/B2 `### Proving the checks` → plan skill `## TESTING STRATEGY` (UPDATE)
- F-B/B3 red-proof + driver-lies bullets → implement skill `### 3. Implement Testing Strategy` (UPDATE)
- F-C/C1 nine-section report template → implement skill `## Output` (UPDATE, replacement)
- F-C/C2 figures-name-their-command bullet → implement skill `## Notes` (UPDATE)
- F-D/D1 tree-hygiene block → implement skill `## Before you start` (UPDATE)
- F-D/D2 re-base paragraph → implement skill `### 5. Final Verification` (UPDATE)
- F-E/E1 `checkGroupCount` leg + runner registration + summary line → `tooling/drift-check.mjs` (UPDATE)
- F-F/F1 paid-and-owner-only steps table → plan skill `## VALIDATION COMMANDS` (UPDATE)
- F-G/G1 `REGENERATES` field → plan skill task format (UPDATE)
- F-H/H1 four quality-criteria boxes → plan skill `### Context Completeness` (UPDATE)
- Build-brief improvement (pre-existing, uncommitted since #283) → plan skill `## Hand off` (carried, unmodified)

## Tests added

No test suite exists (`CLAUDE.md` §Ground rules: no suite, no linter, no type-check). The one piece of real
code added — the `checkGroupCount` leg — is exercised by CI's `drift-check`, and its red proof is below.
No `.md` skill is reachable by any gate; those six fixes are verified by reading and by the diff.

## Proving the checks

One new check: `checkGroupCount` in `tooling/drift-check.mjs`. Seven mutations, each applied to the working
tree, `node tooling/drift-check.mjs` run in full, then restored verbatim. All observed.

| # | Mutation | Result | Message |
|---|---|---|---|
| — | baseline, unmutated | GREEN, exit 0 | `drift-check ✓ … · group-count` |
| M1 | `build-checks.mjs` ✓ line `34`→`35` | RED, exit 1 | `tooling/build-checks.mjs: says 35 groups, build-checks defines 34` |
| M2 | `CLAUDE.md:110` `34 PURE groups`→`35` | RED, exit 1 | `CLAUDE.md (architecture map): says 35 …` |
| M3 | `CLAUDE.md:178` `build-checks' 34 groups`→`35` | RED, exit 1 | `CLAUDE.md (on-demand context): says 35 …` |
| M4 | `gates.md:11` `34 pure groups`→`35` | RED, exit 1 | `.claude/references/gates.md: says 35 …` |
| M5 | `CLAUDE.md:178` claim reworded away, `:110` left intact | RED, exit 1 | `CLAUDE.md (on-demand context): states no group count (the claim was reworded — re-pin this leg)` |
| M6 | a genuinely new 35th group added to the source | RED, exit 1 | all four claims named, `says 34 … defines 35` |
| M7 | a new group REUSING an existing name (`layers`) | RED, exit 1 | `36 group() calls, 34 distinct names, 1 known duplicate (parenting) — a new group reused an existing name` |

M5, M6 and M7 are the leg's real subject: M6 is the drift that has happened nine times in the corpus, and
M7 is the one the plan's own version of the leg would have passed (see Deviations). Restored tree re-run
green, exit 0.

Positive controls, both fired (observed):

| Sweep | Control | Result |
|---|---|---|
| C3 titles | `TITLE_TERMS` (copied verbatim from `tooling/build-checks.mjs:5366`) over `"a senior product manager signs off"` | FIRED — sweep is not vacuous |
| C3 titles | its negative control, `"…the support engineer who can impersonate"` | silent, as `build-checks.mjs:5368` requires |
| C2 slop | kill-on-sight list over `"a comprehensive and robust solution"` | FIRED |

Both sweeps then run over all 170 added lines of the skill/code diff: **0 title hits, 0 slop hits**
(observed). Re-run over the full staged diff with this report's own 355 added lines included: exactly **one
title hit and one slop hit**, both of them the quoted control strings in the table above — a quotation of a
control, not a title or a slop word in substance, which is the distinction `build-checks.mjs:5368` draws.
The six `.claude/system-reviews/evidence/*.md` files are out of scope for both sweeps: they are the sweep's
quoted corpus and hit both regexes by design.

## Validation results

All observed, on the merged tree (`origin/main` had not moved: `git fetch` left `origin/main` == `HEAD` ==
`7267b75`, so the merge was a no-op and both SHAs are identical).

| Command | Exit | Output |
|---|---|---|
| `node --check tooling/drift-check.mjs` | 0 | silent |
| `node tooling/build-checks.mjs` | 0 | `build ✓ all 34 groups pass` |
| `node tooling/drift-check.mjs` | 0 | `drift-check ✓ syntax · … · replay · group-count` |
| `node tooling/token-lint.mjs` | 0 | `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| portal smoke, `PORT=4791 node server.mjs` + `curl /api/health` | 0 | `{"ok":true,…,"bootSha":"7267b75…","stale":false}` |

Derived figures: 35 `group()` calls, 34 distinct names, one duplicate (`parenting`, called from both arms of
one if/else) — `node -e` over `tooling/build-checks.mjs` with the leg's own regexes. The `34` claimed in
`build-checks.mjs`, `CLAUDE.md:110`, `CLAUDE.md:178` and `gates.md:11` each re-derived and each agreeing.

The portal smoke ran on a private port and was killed by PID; `bootSha` in the health answer is this
worktree's HEAD, which is the curl-verify that no sibling session's server answered. Nothing under `portal/`
changed; the smoke is the owner's standing rule that it runs even on a docs-only PR.

Verification method beyond the gates: a ten-agent workflow — three writers (one per file, disjoint) and
seven read-only lanes (anchors ×2, figure re-derivation, C2, C3, adversarial review of the leg,
completeness). 25 findings; the four that were real defects in shippable output are in Deviations and
Additions below.

## Not run

| Step | Why | Tracker |
|---|---|---|
| Visual-regression gate | No shipped page changes; the plan forbids it. It is also Linux-baseline and fails locally on macOS. | none needed |
| Journey drivers, `vt-verify`, `vt-stack-audit` | No shipped page, studio, /build or proto surface changes. The plan forbids them. | none needed |
| A gate over the six `.md` skill fixes | No gate in this repo reads a `.md` skill. They are verified by reading and by the diff — the plan says so, and the real proof is the next ticket's plan going through them. | the sweep's own re-run in a month |

## Deviations from the plan

Four, all `(plan error)`. Each is a figure or a check the plan specified that does not survive re-derivation
against its own evidence doc.

1. **A1 step 3** `(plan error)` — plan text: "between them they are half of this repo's plan defects".
   P1 (66) + P8 (59) = 125 of 422 coded instances = 30%, not half. The two greps in step 3 are in any case
   both halves of a single code, P8. Written as "between them they cover P8, the pattern 52% of this repo's
   reports record" (P8 = 59/113).
2. **A1 step 5** `(plan error)` — plan text: "A third of this repo's reports". P13 = 33/113 = 29%. Written
   as "29%". "A third" reads as the count 33 mistaken for a share.
3. **B2** `(plan error)` — plan text: "this repo's largest class of review finding, by a factor of two".
   R4 = 59 vs R6 = 40 is 1.48×, and unqualified "review finding" is false because X (ordinary code bugs) is
   246. Written as "this repo's largest class of process review finding, by a wide margin (59 of 229)",
   which is the sweep's own wording and its own arithmetic (229 = the process-traced findings).
4. **C2** `(plan error)` — plan text: "the most common thing this repo's review pass sends back". R5 is 9
   findings, seventh by frequency. Written as a plain count citing R5 by name.

A fifth deviation, in code rather than prose:

5. **E1, the leg** `(plan error)` — the plan's leg counts DISTINCT `group("…")` names only. That passes
   green when a new group reuses an existing name (M7 above), which is the cheapest possible drift and needs
   no deviation from house style; it also folds `CLAUDE.md`'s two independent claims into one alternation,
   so losing either one is invisible (the `if (!found.length)` branch is per file, not per claim). Both were
   demonstrated by mutation. The landed leg adds a call-count assertion against a named `DUPES` list and
   splits `CLAUDE.md` into two rows, which also removes the plan's `?? m[2]` fallback. M5 and M7 exist as
   red-proof cases only because of this change; the plan's four-literal proof is M1–M4.

## Assumptions carried

- **The build-brief improvement is kept and committed**, per the plan's §State of the tree. It is a
  sanctioned carry, not a deviation, and it is the one exception to D1's new "anything already dirty is not
  yours" rule — the plan adopts that specific dirty file by name.
- **Anchors resolved by section title, never by line number**, per the plan's own Notes. Every anchor was
  asserted to occur exactly once before replacement.
- **The sweep doc's classification is taken as given.** The plan says do not re-derive it, so its
  frequencies were used as the source for every figure in the added text rather than recounted.

## Additions beyond the plan

Six, all small, each named because F-C's own rule is that an addition is visible or it is noise.

1. **`tooling/drift-check.mjs` leg hardening** — the call-count assertion and the per-claim `CLAUDE.md`
   rows. Reported as deviation 5; listed here too because it is more code than the plan specified.
2. **`.github/workflows/verify.yml:3`** — its description of `drift-check` said only "regenerates the
   committed generators/artifacts". The new leg regenerates nothing, so that line became false the moment
   the leg landed. One clause added. Not adding it would have shipped the R6 doc drift this PR targets.
3. **`.claude/references/gates.md:13`** — one sentence saying the `34 pure groups` figure in its own heading
   is now drift-checked, so a docs pass that rewords the heading knows why CI reddens.
4. **`piv-implement` §5 checklist** — one line requiring the plan's REGENERATES commands to have been run
   and their output committed. Without it F-G is a plan-time field aimed at a post-commit failure class with
   nothing at implement time to make anyone act on it.
5. **`piv-implement` D2** — one clause carrying the recorded `drift-check mid-merge false positive` trap, so
   the new re-base step does not walk onto it. This is A1 item 5 applied to this PR's own text.
6. **`piv-implement` report-template intro and two `Or "none".` cues** — the intro said "especially the
   deviations" while F-C had just split that signal across four sections; and the new Deviations and
   Assumptions bodies were the only two of nine with no empty-state cue.

Plus one correction inside the evidence: `.claude/system-reviews/process-sweep-2026-09-04.md:145` cited
`build-checks.mjs:9393`, a line that does not exist in a 9029-line file. The literal is at `:9028`.
Corrected — pre-flight step 2 is the rule this PR introduces, so its own evidence should satisfy it.

`CLAUDE.md` is untouched. The group count is still 34, so its map is still true.

## Issues encountered

- **The sweep's two corpus rows are not reproducible from the globs it names.** It states
  `.claude/reports/*.md` = 113, `.claude/code-reviews/pr-*.md` = 107 and
  `.agents/code-reviews/agent-reviews/*.md` = 8. Counted with
  `git ls-tree -r --name-only HEAD | grep -c '<glob>'` at `7267b75` in this worktree: **123**, **121** and
  **3** (observed). The third row differs because five of those eight agent-review files are untracked in
  the primary checkout at `227686d`, where the same listing gives 124 / 122 / 8; the sweep read the working
  directory, not the tree. The internal
  arithmetic is sound (the process codes sum to 229, 229 + 246 = 475, 229/475 = 48%), so this looks like an
  unstated exclusion rule rather than a miscount, but every percentage now in the two skills rests on the
  113 denominator. Not re-derived, per the plan's instruction. Worth one line in the Method section before
  the next sweep, or a re-count.
- **F-A's output has no fixed home.** The pre-flight is recorded in `## NOTES (open canvas)`, a section
  whose stated design is to have no shape — which is the enforcement mode F-C's own rationale says does not
  work ("a missing section is visible; a missing paragraph is not"). H1's checkbox is the second enforcement
  point. Left as the plan specifies; a `### Pre-flight` sub-heading inside NOTES is the obvious next step if
  the first few plans skip it.
- **The report's new sections have no route into the PR body.** `piv-create-pr` tells the author to pull
  "the summary, validation results, and documented deviations" and names nothing else, so **Not run** and
  **Additions beyond the plan** land in a file the reviewer may not open. The plan's non-goal forbids
  touching other skills, so this is left as a deliberate carry-over. Nothing breaks: no downstream skill
  parses a section name.
