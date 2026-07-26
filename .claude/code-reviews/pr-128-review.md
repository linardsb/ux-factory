# Code Review — PR #128 · Weights are not sizes; over-offered scale families fill by even spread (#127)

**Branch**: `fix/figma-scale-rank-127` · **Reviewer**: agentic gate (fresh-context code-reviewer agent with empirical reproduction: pre-fix code re-run in isolation against the real 380-variable export to verify the amendment's claims byte-for-byte).

## Findings

1. **Spread-index math — verified sound, no duplicate-index bug.** Proof: spread fires only when offered > slots, so consecutive ideal indices differ by more than 1 and always round apart; confirmed empirically for offered 9/8, 4/3 and the real 35/8 case (indices 0,5,10,15,19,24,29,34 — matching the tool's actual output). Informational only: a hypothetical 1-slot family would divide by zero — unreachable (smallest family has 3 slots).
2. **MEDIUM — FIXED in `00336dd`.** The separator-anchored `NOT_A_SIZE` regex missed camelCase/dot-joined boundaries: `fontWeight/bold` would re-enter the type pool as a 700px "size" — the exact #127 defect in another naming convention. The exclusion now splits names into segments across every convention (with `letter-spacing` collapsed to one segment first, or its "spacing" half would misroute the name into the spacing family). Ten-case probe passes, including `fontWeight/bold`, `font.weight/700`, `letterSpacing`, `typeTracking-tight`, and the legitimate `text/heading-weighted` still classifying as type.
3. **Minor — FIXED in `00336dd`.** Two prose docs still described the pre-spread rule: `docs/figma-runbook.md` §scale and `system/figma-import.md` (which ships in the handoff pack — pack + bundle regenerated in the same commit, drift-check green). Both now state the even-spread rule and the weight exclusion, satisfying the scales plan's AC8.
4. **Minor — FIXED in `00336dd`.** The scales plan's pre-amendment VALIDATE assertion ("type-eyebrow the 8th-largest") contradicted the amendment; corrected in place with a pointer to the AMENDMENTS entry (under the spread rule, scales-partial gives eyebrow the smallest imported size, 10px).
5. **Verified clean**: dedupe-before-spread indexing (taken+dropped reconcile exactly, 8+27=35 on the real fixture); no programmatic consumer string-matches the rule text (the portal renders it verbatim via `esc()`); the amendment's motivating numbers (12px spacing cap, 96px body from `font-size/8xl`) reproduced exactly against the pre-fix code; `offered == slots` keeps the byte-exact fill, preserving the additive contract.

## Validation

Real export: type ramp `128 → 72 → 60 → 36 → 24 → 18 (body) → 16 → 12px`, all verbatim design font sizes; spacing `0→384px`. plusui `--offline` **byte-identical** after every commit. `node --check` ✓ · drift-check ✓ (handoff regen included) · classifier 10-case probe ✓.

## Recommendation

**Approve with the fixes applied** — the review's request-changes items are all fixed on the branch; the core math was verified correct from the start. Ready for the human merge; #129 (Plus UI refresh) unblocks on it.

*Solo-repo note: verdict posted as a comment — the human makes the final merge call.*
