# Sweep 1 — code-review process classification (files 1–36 by `sort -V`)

Codes: R1 plan-said-so-not-done · R2 plan-defect-copied · R3 plan-gap · R4 validation-hollow · R5 figure-wrong · R6 doc-drift · R7 generated-artefact-drift · R8 owed-step · R9 pre-merge-tree · X ordinary bug (counted only) · N other.
"Round 2" = a second review file for the same PR exists in the directory listing.

| file | PR | recommendation | severity counts | findings coded R1–R9/N (id → code, evidence) | X |
|---|---|---|---|---|---|
| pr-15-review.md | 15 | request changes (all 5 fixed on branch) | H2 M1 L2 (from findings) | H1 → N: ruleset commentary "every fg/bg pairing" false; pre-existing CSS contradicts · H2 → N: "never accent text on dark" false; honesty artifact overclaims | 3 |
| pr-16-review.md | 16 | request changes; round 2 exists | H1 M2 L4 | M1 → R4: validator silently passes unreferenced fixture files; three hand-maintained lists uncross-checked | 6 |
| pr-16-review-round2.md | 16 (r2) | approve | M1 L2 | — | 3 |
| pr-19-review.md | 19 | request changes; round 2 exists | M2 L3 | 3 → R6: screen-header spec says h1, page ships h2; spec flipped to shipped stale · 5 → R1: plan said bake derived dates into fixtures; Fieldwork computes at view time · process note → N: stacked PR carries #3/#7 work with no ticket-level gate | 3 |
| pr-19-review-round2.md | 19 (r2) | approve | 0 | — | 0 |
| pr-20-review.md | 20 | approve | M1 L1 | M1 → R2: card aria-label template "exactly what the plan's Task 3 pinned"; spec/plan inconsistency · recommendation → R8: spike-1 Figma real run owed (token, run, commit artifact) | 1 |
| pr-21-review.md | 21 | request changes; round 2 exists | H1 M1 L1 | — | 3 |
| pr-21-review-round2.md | 21 (r2) | fixes verified (approve) | 0 new | — | 0 |
| pr-22-review.md | 22 | approve | C0 H0 M0 L4 | — | 4 |
| pr-23-review.md | 23 | request changes; round 2 exists (post-merge) | M1 (+2 subsumed) | — | 2 |
| pr-23-review-round2.md | 23 (r2, post-merge) | comment (would-approve) | M2 L3 + scope note | scope → R9: body says "one commit, two files"; stacked base lagged, merge landed 35 files · fence MEDIUM → N: PR #24 review offered two fixes, neither landed; fence still overstates · phase-order MEDIUM → R4: validate-trace checks first-occurrence only; mid-run regression passes | 3 |
| pr-24-review.md | 24 | approve; round 2 exists (despite approve) | M2 L5 | M2 → R4: validator never pairs curated with raw; --force re-run without re-curate passes · post-merge note → R7: handoff pack.json regen deferred after demo-notice.md spec added | 6 |
| pr-24-review-round2.md | 24 (r2) | approve | M1 new (+1 Low fixed) | fence-not-enforced → R4: committed raw trace shows `true` executed; report framed node-only fence as guarantee · README → R2: traces/README documented plan-era start-anchored regex, not shipped parse | 1 |
| pr-28-review.md | 28 | approve | C0 H0 M2 L0 | — | 2 |
| pr-29-review.md | 29 | request changes; round 2 exists | H1 M1 L1 | H1 → R3: plan's five-selector audit missed pre-existing `.btn-ghost:hover` twin; AC#4 falsified · M1 → R6: derive.rules header v1.1.0 vs version 1.2.0 | 1 |
| pr-29-review-round2.md | 29 (r2) | approve | 0 | — | 0 |
| pr-30-review.md | 30 | approve | L1 | — | 1 |
| pr-31-review.md | 31 | approve | C0 H0 M0 L4 | L3 → R4: drift-check porcelain can never see a stale committed sidecar genHandoff never deletes · L4 → R4: token-lint scans comments; commented var() masks orphan | 2 |
| pr-33-review.md | 33 | approve | L2 | 1 → R6: CLAUDE.md map "the one dependency-carrying tool" now false; visual-regression absent | 1 |
| pr-34-review.md | 34 | request changes (minor) | M2 L3 | L5 → N: page header "contracts for every component" false for 3 of 7 (honesty copy) | 4 |
| pr-36-review.md | 36 | approve | L3 | Low1 → R5: report Deviation #6 "sole residual is meta.cwd + one probe"; actual ~9 in one trace | 2 |
| pr-37-review.md | 37 | request changes | C0 H0 M3 L3 | — | 6 |
| pr-45-review.md | 45 | request changes | M3 L1 + observation | 1 → R3: replaceChildren focus trap fixed in wizard at PR #37 recurs in new toggle · 3 → N: pre-existing hero/meta copy "three in build" made totally false by badge flip · observation → N: PR #23-r2 warned to scope player keydown before embed; embedded unscoped | 2 |
| pr-46-review.md | 46 | approve (land 2 Mediums in-PR) | M2 L1 | — | 3 |
| pr-52-review.md | 52 | approve | C0 H0 M1 L1 | Medium → R7: motion tokens added to source; handoff pack token CSS not regenerated · note1 → R9: branch 4 behind/3 ahead origin/main; local main stale · note3 → N: report's Level-5 "unchanged files" true only for phase-2 diff, not whole PR · recommendation → R8: pending human live feel pass (Chrome/Firefox/Safari) | 1 |
| pr-53-review.md | 53 | approve; second pass exists (despite approve) | M1 L3 | L1 → N: trace.html copy stale after focus-first behaviour change; no gate covers it | 3 |
| pr-53-review-2.md | 53 (pass 2) | approve | M2 L1 | M1 → R6: header promises named-field boundary errors; code checks top-level only (plan specified shallow) · M2 → R2: identical aria-label "came verbatim from the plan (line 188) … plan gap" | 1 |
| pr-54-review.md | 54 | request changes | H1 L3 | H1 → R7: loc-summary.json stale, CI verify red; generated from dirty shared worktree, dirty --check passed · L3 → R3: gen-loc-summary poisonable by dirty tree; record "regen only on clean tree" standing rule · closing note → R8: Safari + Firefox tooltip spot-check owed | 2 |
| pr-55-review.md | 55 | request changes (advisory) | M1 L1 | — | 2 |
| pr-58-review.md | 58 | approve | L1 | Low → N: PR-body "worst case is today's opaque header" contradicted; plan recorded color-mix assumption · outstanding → R8: plan's judgement gate names Chrome + Safari; only Chromium driven | 0 |
| pr-59-review.md | 59 | approve | C0 H0 M0 L2 | — | 2 |
| pr-60-review.md | 60 | approve | L2 | follow-up → R8: Safari eyeball pending (report Issues) before merge | 2 |
| pr-61-review.md | 61 | approve | M1 L2 | — | 3 |
| pr-63-review.md | 63 | approve | L2 | — | 2 |
| pr-65-review.md | 65 | approve | L2 | Low1 → R3: plan specified scheme guard only for sources list; sibling renderLinks path uncovered | 1 |
| pr-66-review.md | 66 | request changes (minor) | M1 L3 | Medium → R1: AC #1 "only real copy" not met — head dev-comment survives stamping; residue check blinded by own mangling · validation → R8: live served-header curl env-blocked; documented ~30s operator check owed | 3 |

## Frequency (findings, not files)

| code | count |
|---|---|
| R1 | 2 |
| R2 | 3 |
| R3 | 4 |
| R4 | 6 |
| R5 | 1 |
| R6 | 4 |
| R7 | 3 |
| R8 | 6 |
| R9 | 2 |
| N | 10 |
| X | 81 |
| total | 122 |

## Recurring N
1. False/overclaimed completeness statement in shipped commentary, reader-facing copy or PR body (pr-15 H1/H2, pr-34 L5, pr-45 #3, pr-58 Low).
2. Reader-facing page copy left stale or made false by a behaviour change, with no gate covering copy (pr-53 L1, pr-45 #3).
3. An earlier review's deferred or forward-looking item never actioned (pr-23-r2 fence, pr-45 observation).
4. Stacked PR / report scope narrower than what actually merges or ships (pr-19 process note, pr-52 note 3).

## Round-2 note
Round 2 files exist for PRs 16, 19, 21, 23, 24, 29, 53. For 24 and 53 round 1 was APPROVE (round 2 was an extra fresh pass), and 23-r2 is a post-merge retrospective — so "round 2 implies round 1 requested changes" holds only for 16, 19, 21, 29.
