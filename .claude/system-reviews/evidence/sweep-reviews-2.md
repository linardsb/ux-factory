# Sweep — code-review reports, slice 2 (files 37–72 of `ls .claude/code-reviews/pr-*.md | sort -V`)

Codes: R1 plan-said-so-not-done · R2 plan-defect-copied · R3 plan-gap · R4 validation-hollow · R5 figure-wrong · R6 doc-drift · R7 generated-artefact-drift · R8 owed-step · R9 pre-merge-tree · X ordinary-code-bug (counted only) · N other.
"R2 file?" = a `-review-2.md` exists for the same PR in the directory (implies round 1 requested changes). Restated findings in a round-2 file are not re-counted.

| file | PR (ticket) | recommendation | severity counts | findings coded R1–R9/N (id → code, evidence) | X | R2 file? |
|---|---|---|---|---|---|---|
| pr-83-review.md | #83 (#71) | Approve (advisory) | 0C·0H·1M·0L | carried-forward → R8: real Safari+Chrome eyeball still owed to a human before #82 | 1 | no |
| pr-85-review.md | #85 (#72) | Request changes | 0C·0H·1M·3L + non-code blocker | blocker → R4: PR body "VR 18/18 pass" contradicted by red CI visual, twice; L2 → R6: index.html comment "spine.mjs does NOT exist yet" left stale by #72 itself; L4 → R5: report cites stale commit hash 16d0f52 | 2 | yes |
| pr-85-review-2.md | #85 (#72) | Approve | 0 new | none new; Medium deferred to #73/#75/#77 | 0 | is R2 |
| pr-91-review.md | #91 (#73) | Approve | 0C·0H·0M·3L | L1 → R3: home WCAG table countUp inherits known approach rAF flake once freeze lifts; dev #11 → R7: approach baseline regen deferred (dirty shared tree); merge note → R9: stacked on feature/v3-hero, retarget after #85 | 2 | yes |
| pr-91-review-2.md | #91 (#73) | Approve | 0C·0H·0M·3L | merge note → R9: stacked base restated | 3 | is R2 |
| pr-93-review.md | #93 (#78) | Approve | 0C·0H·1M·1L | — | 2 | no |
| pr-94-review.md | #94 (#74) | Approve (advisory) | 0C·0H·1M·2L | M1 → R3: pre-wear dock choice lost; flow absent from plan's known-transients list; owner Q1 → R8: askedAxes fold-in home (#74 vs #81) to re-confirm before merge; dev #4 → N: plan state table self-contradictory; implementer resolved, owner to bless | 2 | no |
| pr-95-review.md | #95 (#80) | Approve | 0C·0H·0M·1L | pending → R8: Safari/Chrome eyeball + humanizer pass owed to human | 1 | no |
| pr-96-review.md | #96 (#88) | Approve | 0C·0H·0M·2L + 1 info | Low → R8: Fieldwork regen under cleaned computeRules owed to #89; Low(scope) → N: unrelated epic PRD bundled into PR, "maintainer call" | 1 | no |
| pr-97-review.md | #97 (#75) | Approve | 1 Med-High (fixed)·3L | Low → R6: spine.mjs:39 comment falsified by own deviation #9; merge note → R9: main advanced (#80/#88/#95/#96); generated-file conflicts resolved by regeneration | 3 | no |
| pr-98-review.md | #98 (#79) | Approve | 0C·0H·0M·2L | follow-up 1 → R9: fix commit 85b3689 stranded after PR #95 merged ahead; follow-up 2 → N: Docker can't bind-mount ~/Desktop; blocks #82 regen | 2 | no |
| pr-99-review.md | #99 (#76) | Request changes | 0C·0H·1M·3L | L2 → R5: "all eight pages" in new comments; mounts on seven; L3 → R5: report "six IA pages"/sweep list wrong; roundtrip unswept; L4 → R6: pack-derived "#76 owns forget UI" falsified by #76; good → N: plan's groundTruth design would have shipped a bug; implementer deviated | 1 | no |
| pr-100-review.md | #100 (#89) | Approve | 0C·0H·0M·4L (3 + 1 info) | F4 → N: CI visual red from pre-existing index hero flake, not this PR; F2 → N: report four-state table shows claim withdrawn; it isn't; dev #9 → N: badge/claim withdrawal not in plan; implementer caught it | 2 | no |
| pr-122-review.md | #122 (#108) | Request changes (then triaged/fixed) | 1H·1M·1L | High → R3: plan documented clearing for two paths; resync was unanticipated third caller; good → R6: memory's VR no-churn reason wrong (maxDiffPixels, not sub-perceptual); correction owed | 2 | no |
| pr-123-review.md | #123 (#101) | Request changes | 0C·0H·1M·1L | Medium → R3: plan pinned tone/label coupling but stopped short of the emit target; good → N: plan's "(or its meta)" clause would leak the answer; dropped | 1 | no |
| pr-124-review.md | #124 (#116) | Approve (fixes applied) | 2M·2L | — | 4 | no |
| pr-126-review.md | #126 (#125) | Approve (fixes applied) | 1H·1M·4L | — | 4 | no |
| pr-128-review.md | #128 (#127) | Approve (fixes applied) | 1M·2 minor | F3 → R1: plan AC8 doc updates (runbook, figma-import.md in pack) not done; F4 → N: plan's VALIDATE assertion contradicted its own amendment | 1 | no |
| pr-133-review.md | #133 (#130) | Request changes | 2H·1M·3L | High-sec → R3: engine moved behind public drop; inherited __proto__ pollution unanticipated; dev 6 → R7: tokens.verdant.css stale pre-existing; own ticket owed; good → N: planned VALUE_OK would announce phantom rejections; implementer split skipped/rejected | 5 | no |
| pr-143-review.md | #143 (#136) | Request changes | 2H·4M·7L | M3 → R6: hero copy/header/CSS comments still "eight" after amendment A1 to ten; M4 → R7: approach baselines stale vs loc-summary since #142; maxDiffPixels swallows it (R4 aspect); scope → N: #142 merged without review | 11 | no |
| pr-145-review.md | #145 (#137) | Comment | R1: 0C·0H·2M·2L; R2: 4M·2L; R3: 2M | R3-2 → R4: group 7 pinned constant not behaviour; four mutations stayed green; R2-1 → R4: tamper battery's only url() case impossible; cross-origin GET hole hidden; gate note → R4: group 7 counted setProperty in one file vs repo-wide claim; R1-M1 → R3: plan didn't ask CI registration of build-checks; f5550c2 → R3: plan caught clear-stage case, missed symmetric restore; journey skipped it; R1 caveat → N: author self-review missed four defects; R3 preamble → R9: round 2 verdict predated fix commit; fixes unreviewed | 9 | no (rounds inline) |
| pr-147-review.md | #147 (#138) | Approve (all six fixed) | 0C·0H·2M·4L | F1 → R4: re-measure loop exhausts silently; truncated capture stays green; F2 → R4: console filter forgives all WebKit/Firefox network errors; F4 → R6: CLAUDE.md:80 "76 assertions", reports 85; F5 → R4: journey asserts literal true; F6 → R6: build-import comment "FOUR files" now five; resolution → N: reviewer's suggested F5 fix itself tautological | 1 | no |
| pr-151-review.md | #151 (#139) | Approve (fixed on branch) | 0C·0H·1M·1LM·1L | F2 → R4: [4b] textContent check could not fail; F3 → R4: [6] ?b= wait silently no-op after [4c] consumed copy; also → N: settings-slots layout deviated from plan Task 10; undocumented until review | 1 | no |
| pr-156-review.md | #156 (#140) | Request changes | 1H·2M | M3 → R6: verify.yml header omits group 8; npm-ci warning in wrong file; dev 1 → N: plan's dynamic-import and loadComposeConfig instructions mutually exclusive; good → R8: two-runs-at-once and disconnect paths need paid runs; not exercised | 2 | no |
| pr-158-review.md | #158 (#144) | Approve | 0C·0H·0M·2L | — | 2 | no |
| pr-159-review.md | #159 (#157) | Approve | 0C·0H·0M·2L | L1 → R6: build-checks.mjs:1013 cites report path that doesn't exist; L2 → N: plan/docs name unreachable [::1], omit reachable DNS-rebinding | 0 | no |
| pr-161-review.md | #161 (#148) | Approve | 1M·1L | Medium → R6: CLAUDE.md:80 "both links in" now three; plan sweep grep missed phrasing; heads-up → R9: unmerged #157 branch rewrites same line; Low → R5: report block [17] "11→14", actually 8→11; good → N: ticket #148's nav/baseline figures wrong; PR corrected | 0 | no |
| pr-162-review.md | #162 (#149) | Request changes | 1H·3L | L3 → R4: [17b] IFF only ever exercises negative branch; dev 1 → N: plan decision (live-hash restore) overturned on measured gate failure | 3 | no |
| pr-163-review.md | #163 (#154) | Approve | 0C·0H·0M·1L | L1 → R2: "~30 MB" tarball figure from plan copied to workflow comment; actual 47 MB; clear → R6: CLAUDE.md "9 groups" (10), verify.yml "8 groups" — pre-existing; good → N: plan AMENDMENTS self-corrected task order + a grep that would false-pass | 0 | no |
| pr-178-review.md | #178 (#167) | Request changes | 1H·0M·2L | L2 → R8: epic metric exceeded (62 vs ≥40); owner decision owed on #164 | 2 | no |
| pr-179-review.md | #179 (#165) | Approve | 1M·3L | L4 → N: "tokenize touched literals" became felt-behaviour change; intent unconfirmed | 3 | no |
| pr-180-review.md | #180 (#166) | Request changes → Approve (re-review inline) | 2H·2M; re-review 1M·1L | H1 → R7: loc-summary stale on final tree; approach baselines bake stale number; M1 → R4: header claims "red in CI" but no gate exercises inspect; re-L1 → N: commit message overclaims loc-summary regen; good → N: two deviations prevent bugs the plan would have shipped | 3 | no (re-review inline) |
| pr-182-review.md | #182 (#170) | Approve | 2M·2L | — | 4 | yes |
| pr-182-review-2.md | #182 (#170) | Request changes | 1H·(2M restated)·1L new | H1 → R9: branch conflicts after #183/#184; param-count/loc-summary/4 baselines must regen on merged tree; green visual proves nothing; note → N: #168's .nav-palette-hint hunks leaked via shared working tree | 1 (+2 restated) | is R2 |
| pr-183-review.md | #183 (#168) | Request changes | 1H·3L | H1 → R3: multi-line consumer header trap; generator misattributes tokens to Fieldwork; drift-check can't see it (R4); report "new consumer block" false (R5) | 3 | no |
| pr-184-review.md | #184 (#169) | Request changes | 1H·2L | H1 → R3: first nested data-inspect mounts; focusin bubbling unanticipated; 36-assertion pass never tabbed a nested mount; L2 → N: hue no-wrap choice not in documented deviations | 1 | yes (pr-184-review-2.md, outside slice) |

## Frequency (findings, not files)

| code | count |
|---|---|
| R1 plan-said-so-not-done | 1 |
| R2 plan-defect-copied | 1 |
| R3 plan-gap | 9 |
| R4 validation-hollow | 11 |
| R5 figure-wrong | 4 |
| R6 doc-drift | 11 |
| R7 generated-artefact-drift | 4 |
| R8 owed-step | 6 |
| R9 pre-merge-tree | 7 |
| N other | 24 |
| X ordinary-code-bug | 85 |

## Recurring "N other"

1. Plan defect caught and corrected by the implementer as a documented deviation — "the plan would have shipped a bug" (94, 99, 100, 123, 133, 156, 180).
2. Non-figure over-claims in the paper trail — report table, commit message, ticket text (100, 161, 180); plan amended itself pre-review (128, 163).
3. Deviation from the plan not documented until the review asked (151, 184); plan instruction interpreted as behaviour change (179).
4. Shared working tree contaminated by a parallel session's uncommitted edits — leaked hunks in 182-2; validation had to use clean worktrees in 85, 85-2, 91, 91-2, 93, 133, 143, 147, 151.
5. Review-process gaps — #142 merged unreviewed (143), author self-review missed four defects (145), reviewer's own suggested fix tautological (147), plan decision overturned on measured evidence (162).
